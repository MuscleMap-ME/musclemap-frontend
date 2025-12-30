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
}

declare global {
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

    const existing = db.prepare(
      'SELECT id FROM users WHERE email = ? OR username = ?'
    ).get(validated.email, validated.username) as any;

    if (existing) {
      throw new ValidationError('Email or username already in use');
    }

    const userId = `user_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = hashPassword(validated.password);

    db.prepare(`
      INSERT INTO users (id, email, username, display_name, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, validated.email, validated.username, validated.displayName || null, passwordHash);

    db.prepare('INSERT INTO credit_balances (user_id, balance) VALUES (?, 100)').run(userId);

    const token = generateToken({ userId, email: validated.email, roles: ['user'] });

    log.info('User registered', { userId, email: validated.email });

    return {
      token,
      user: { id: userId, email: validated.email, username: validated.username, displayName: validated.displayName },
    };
  },

  async login(data: z.infer<typeof loginSchema>) {
    const validated = loginSchema.parse(data);

    const user = db.prepare('SELECT id, email, username, display_name, password_hash, roles FROM users WHERE email = ?').get(validated.email) as any;

    if (!user || !verifyPassword(validated.password, user.password_hash)) {
      throw new AuthenticationError('Invalid email or password');
    }

    const roles = JSON.parse(user.roles || '["user"]');
    const token = generateToken({ userId: user.id, email: user.email, roles });

    log.info('User logged in', { userId: user.id });

    return {
      token,
      user: { id: user.id, email: user.email, username: user.username, displayName: user.display_name, roles },
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
  const user = db.prepare('SELECT id, email, username, display_name, roles, created_at FROM users WHERE id = ?').get(req.user!.userId) as any;

  if (!user) throw new AuthenticationError('User not found');

  const balance = db.prepare('SELECT balance FROM credit_balances WHERE user_id = ?').get(user.id) as any;

  res.json({
    data: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      roles: JSON.parse(user.roles || '["user"]'),
      creditBalance: balance?.balance || 0,
      createdAt: user.created_at,
    },
  });
}));

authRouter.get('/me/capabilities', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = db.prepare('SELECT roles FROM users WHERE id = ?').get(req.user!.userId) as any;
  const roles = JSON.parse(user?.roles || '["user"]');
  
  const capabilities = ['users.read', 'economy.read', 'workouts.create', 'workouts.read'];
  if (roles.includes('admin')) capabilities.push('admin.*');

  res.json({ data: { capabilities } });
}));
