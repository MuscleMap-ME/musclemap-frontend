/**
 * Auth Routes (Fastify)
 *
 * Handles user authentication, registration, and profile management.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { queryOne, query } from '../../db/client';
import { config } from '../../config';
import { loggers } from '../../lib/logger';
import { economyService } from '../../modules/economy';

const log = loggers.auth;

// Schemas
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

// Types
interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  role?: 'user' | 'moderator' | 'admin';
}

// Password utilities
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

/**
 * Authentication hook for protected routes
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header', statusCode: 401 },
    });
  }

  const token = authHeader.substring(7);

  try {
    request.user = verifyToken(token);
  } catch {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', statusCode: 401 },
    });
  }
}

/**
 * Require admin role - must be used after authenticate
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as JwtPayload | undefined;

  if (!user) {
    return reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
    });
  }

  const isAdmin = user.roles?.includes('admin') || user.role === 'admin';

  if (!isAdmin) {
    return reply.status(403).send({
      error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
    });
  }
}

/**
 * Require specific role - must be used after authenticate
 */
export function requireRole(role: 'admin' | 'moderator') {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 },
      });
    }

    const hasRole = user.roles?.includes(role) || user.role === role;
    // Admins can do anything moderators can
    const isAdmin = user.roles?.includes('admin') || user.role === 'admin';

    if (!hasRole && !(role === 'moderator' && isAdmin)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: `${role} access required`, statusCode: 403 },
      });
    }
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      request.user = verifyToken(authHeader.substring(7));
    } catch {
      // Ignore - optional auth
    }
  }
}

/**
 * Register auth routes
 */
export async function registerAuthRoutes(app: FastifyInstance) {
  // Register
  app.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 30 },
          password: { type: 'string', minLength: 8 },
          displayName: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check for existing email or username
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [body.email, body.username]
    );

    if (existing) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Email or username already in use', statusCode: 400 },
      });
    }

    const userId = `user_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = hashPassword(body.password);
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO users (id, email, username, display_name, password_hash, trial_started_at, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, body.email, body.username, body.displayName || null, passwordHash, now.toISOString(), trialEnds.toISOString()]
    );

    await economyService.initializeBalance(userId, 100);

    const token = generateToken({ userId, email: body.email, roles: ['user'] });

    log.info({ userId, email: body.email }, 'User registered');

    return reply.status(201).send({
      data: {
        token,
        user: { id: userId, email: body.email, username: body.username, displayName: body.displayName },
      },
    });
  });

  // Login
  app.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await queryOne<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      password_hash: string;
      roles: string[];
      current_identity_id: string | null;
      avatar_url: string | null;
    }>(
      'SELECT id, email, username, display_name, password_hash, roles, current_identity_id, avatar_url FROM users WHERE email = $1',
      [body.email]
    );

    if (!user || !verifyPassword(body.password, user.password_hash)) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password', statusCode: 401 },
      });
    }

    // Get onboarding status
    const profile = await queryOne<{
      onboarding_completed_at: string | null;
    }>(
      'SELECT onboarding_completed_at FROM user_profile_extended WHERE user_id = $1',
      [user.id]
    );

    const roles = user.roles || ['user'];
    const role = roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'moderator' : 'user';
    const token = generateToken({ userId: user.id, email: user.email, roles, role });

    log.info({ userId: user.id, role }, 'User logged in');

    return reply.send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          avatar_url: user.avatar_url,
          roles,
          role,
          is_admin: roles.includes('admin'),
          is_owner: roles.includes('owner'),
          archetype: user.current_identity_id,
          onboardingCompletedAt: profile?.onboarding_completed_at || null,
        },
      },
    });
  });

  // Get current user
  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await queryOne<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      roles: string[];
      created_at: Date;
    }>(
      'SELECT id, email, username, display_name, roles, created_at FROM users WHERE id = $1',
      [request.user!.userId]
    );

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 },
      });
    }

    const balance = await economyService.getBalance(request.user!.userId);
    const roles = user.roles || ['user'];

    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        roles,
        is_admin: roles.includes('admin'),
        is_owner: roles.includes('owner'),
        creditBalance: balance,
        createdAt: user.created_at,
      },
    });
  });

  // Get capabilities
  app.get('/auth/me/capabilities', { preHandler: authenticate }, async (request, reply) => {
    const user = await queryOne<{ roles: string[] }>(
      'SELECT roles FROM users WHERE id = $1',
      [request.user!.userId]
    );

    const roles = user?.roles || ['user'];
    const capabilities = ['users.read', 'economy.read', 'workouts.create', 'workouts.read'];

    if (roles.includes('admin')) capabilities.push('admin.*');
    if (roles.includes('moderator')) capabilities.push('moderation.*');

    return reply.send({ data: { capabilities } });
  });

  // Profile endpoints
  app.get('/profile', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: { userId: request.user!.userId } });
  });

  app.put('/profile', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: request.body || {} });
  });
}

export { JwtPayload };
