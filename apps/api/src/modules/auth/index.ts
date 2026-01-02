/**
 * Auth Module
 *
 * Handles user authentication, registration, and authorization.
 * Uses PostgreSQL with proper async queries and security best practices.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { queryOne, query } from '../../db/client';
import { config } from '../../config';
import { AuthenticationError, ValidationError, asyncHandler } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { z } from 'zod';

const log = loggers.auth;

export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  role?: 'user' | 'moderator' | 'admin';
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

/**
 * Get the effective role for a user from their JWT payload
 */
export function getEffectiveRole(payload: JwtPayload): 'user' | 'moderator' | 'admin' {
  if (payload.role && ROLE_HIERARCHY[payload.role] !== undefined) {
    return payload.role;
  }
  if (payload.roles.includes('admin')) return 'admin';
  if (payload.roles.includes('moderator')) return 'moderator';
  return 'user';
}

/**
 * Check if user has at least the required role
 */
export function hasMinRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Middleware to require a minimum role level
 */
export function requireRole(minRole: 'user' | 'moderator' | 'admin') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('Authentication required'));
      return;
    }

    const userRole = getEffectiveRole(req.user);
    if (!hasMinRole(userRole, minRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires ${minRole} role or higher`,
      });
      return;
    }

    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Hash password using PBKDF2 with random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password using timing-safe comparison
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Generate JWT access token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Express middleware to authenticate JWT token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AuthenticationError('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.substring(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(authHeader.substring(7));
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authService = {
  /**
   * Register a new user
   */
  async register(data: z.infer<typeof registerSchema>) {
    const validated = registerSchema.parse(data);

    // Check for existing email or username
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [validated.email, validated.username]
    );

    if (existing) {
      throw new ValidationError('Email or username already in use');
    }

    const userId = `user_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = hashPassword(validated.password);

    // Set trial period: 90 days from registration
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO users (id, email, username, display_name, password_hash, trial_started_at, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        validated.email,
        validated.username,
        validated.displayName || null,
        passwordHash,
        now.toISOString(),
        trialEnds.toISOString(),
      ]
    );

    // Initialize credit balance
    await query(
      `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
       VALUES ($1, 100, 100)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const token = generateToken({ userId, email: validated.email, roles: ['user'] });

    log.info('User registered', { userId, email: validated.email });

    return {
      token,
      user: {
        id: userId,
        email: validated.email,
        username: validated.username,
        displayName: validated.displayName,
      },
    };
  },

  /**
   * Login user
   */
  async login(data: z.infer<typeof loginSchema>) {
    const validated = loginSchema.parse(data);

    const user = await queryOne<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      password_hash: string;
      roles: string[];
    }>(
      'SELECT id, email, username, display_name, password_hash, roles FROM users WHERE email = $1',
      [validated.email]
    );

    // Use generic error message to prevent user enumeration
    if (!user || !verifyPassword(validated.password, user.password_hash)) {
      throw new AuthenticationError('Invalid email or password');
    }

    const roles = user.roles || ['user'];
    const role = roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'moderator' : 'user';
    const token = generateToken({ userId: user.id, email: user.email, roles, role });

    log.info('User logged in', { userId: user.id, role });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        roles,
        role,
      },
    };
  },

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await queryOne<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      roles: string[];
      created_at: Date;
    }>(
      'SELECT id, email, username, display_name, roles, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const balance = await queryOne<{ balance: number }>(
      'SELECT balance FROM credit_balances WHERE user_id = $1',
      [userId]
    );

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      roles: user.roles || ['user'],
      creditBalance: balance?.balance || 0,
      createdAt: user.created_at,
    };
  },

  /**
   * Get user capabilities based on roles
   */
  async getCapabilities(userId: string): Promise<string[]> {
    const user = await queryOne<{ roles: string[] }>(
      'SELECT roles FROM users WHERE id = $1',
      [userId]
    );

    const roles = user?.roles || ['user'];
    const capabilities = ['users.read', 'economy.read', 'workouts.create', 'workouts.read'];

    if (roles.includes('admin')) {
      capabilities.push('admin.*');
    }
    if (roles.includes('moderator')) {
      capabilities.push('moderation.*');
    }

    return capabilities;
  },
};

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json({ data: result });
  })
);

authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.json({ data: result });
  })
);

authRouter.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await authService.getProfile(req.user!.userId);
    res.json({ data: profile });
  })
);

authRouter.get(
  '/me/capabilities',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const capabilities = await authService.getCapabilities(req.user!.userId);
    res.json({ data: { capabilities } });
  })
);
