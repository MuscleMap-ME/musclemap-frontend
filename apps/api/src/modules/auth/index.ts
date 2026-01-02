/**
 * Auth Module
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/client';
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
  // Check explicit role field first
  if (payload.role && ROLE_HIERARCHY[payload.role] !== undefined) {
    return payload.role;
  }
  // Fall back to roles array
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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
}

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

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(authHeader.substring(7));
    } catch {}
  }

  next();
}

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
  async register(data: z.infer<typeof registerSchema>) {
    const validated = registerSchema.parse(data);

    const existing = await db.queryOne<{ id: string }>(
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

    await db.query(
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

    await db.query(
      'INSERT INTO credit_balances (user_id, balance) VALUES ($1, 100)',
      [userId]
    );

    const token = generateToken({ userId, email: validated.email, roles: ['user'] });

    log.info('User registered', { userId, email: validated.email });

    return {
      token,
      user: { id: userId, email: validated.email, username: validated.username, displayName: validated.displayName },
    };
  },

  async login(data: z.infer<typeof loginSchema>) {
    const validated = loginSchema.parse(data);

    const user = await db.queryOne<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      password_hash: string;
      roles: string[];
      role: string | null;
    }>(
      'SELECT id, email, username, display_name, password_hash, roles, role FROM users WHERE email = $1',
      [validated.email]
    );

    if (!user || !verifyPassword(validated.password, user.password_hash)) {
      throw new AuthenticationError('Invalid email or password');
    }

    const roles = user.roles || ['user'];
    const role = (user.role as 'user' | 'moderator' | 'admin') || 'user';
    const token = generateToken({ userId: user.id, email: user.email, roles, role });

    log.info('User logged in', { userId: user.id, role });

    return {
      token,
      user: { id: user.id, email: user.email, username: user.username, displayName: user.display_name, roles, role },
    };
  },
};

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({ data: result });
}));

authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.json({ data: result });
}));

authRouter.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = await db.queryOne<{
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    roles: string[];
    created_at: string;
  }>(
    'SELECT id, email, username, display_name, roles, created_at FROM users WHERE id = $1',
    [req.user!.userId]
  );

  if (!user) throw new AuthenticationError('User not found');

  const balance = await db.queryOne<{ balance: number }>(
    'SELECT balance FROM credit_balances WHERE user_id = $1',
    [user.id]
  );

  res.json({
    data: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      roles: user.roles || ['user'],
      creditBalance: balance?.balance || 0,
      createdAt: user.created_at,
    },
  });
}));

authRouter.get('/me/capabilities', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = await db.queryOne<{ roles: string[] }>(
    'SELECT roles FROM users WHERE id = $1',
    [req.user!.userId]
  );
  const roles = user?.roles || ['user'];

  const capabilities = ['users.read', 'economy.read', 'workouts.create', 'workouts.read'];
  if (roles.includes('admin')) capabilities.push('admin.*');

  res.json({ data: { capabilities } });
}));
