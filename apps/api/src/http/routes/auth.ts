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
import { SlackNotifications } from '../../modules/notifications/slack.service';

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

    // Send Slack notification for new user (async, don't wait)
    SlackNotifications.newUser({
      id: userId,
      username: body.username,
      email: body.email,
    }).catch(() => {}); // Ignore errors

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
    const userId = request.user!.userId;

    // Fetch user data from users table
    const user = await queryOne<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      total_xp: number;
      current_rank: string;
      wealth_tier: number;
      current_level: number;
    }>(
      `SELECT id, username, display_name, avatar_url, total_xp, current_rank, wealth_tier, current_level
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Fetch extended profile data
    const extended = await queryOne<{
      gender: string | null;
      date_of_birth: string | null;
      height_cm: number | null;
      weight_kg: number | null;
      preferred_units: string;
      ghost_mode: boolean;
      leaderboard_opt_in: boolean;
      about_me: string | null;
    }>(
      `SELECT gender, date_of_birth, height_cm, weight_kg, preferred_units, ghost_mode, leaderboard_opt_in, about_me
       FROM user_profile_extended WHERE user_id = $1`,
      [userId]
    );

    // Fetch user limitations
    const limitationsResult = await query<{ name: string }>(
      `SELECT name FROM user_limitations WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    const limitations = limitationsResult?.rows || [];

    // Fetch user equipment
    const equipmentResult = await query<{ equipment_type_id: string }>(
      `SELECT equipment_type_id FROM user_home_equipment WHERE user_id = $1`,
      [userId]
    );
    const equipment = equipmentResult?.rows || [];

    // Calculate age from date_of_birth
    let age: number | null = null;
    if (extended?.date_of_birth) {
      const dob = new Date(extended.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }

    // Calculate level from XP (simplified - 1000 XP per level)
    const level = Math.floor((user.total_xp || 0) / 1000) + 1;

    return reply.send({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      avatar_id: null, // Legacy field
      xp: user.total_xp || 0,
      level: Math.max(level, user.current_level || 1),
      rank: user.current_rank,
      wealth_tier: user.wealth_tier || 0,
      age,
      gender: extended?.gender || null,
      height_cm: extended?.height_cm || null,
      weight_kg: extended?.weight_kg || null,
      preferred_units: extended?.preferred_units || 'metric',
      ghost_mode: extended?.ghost_mode || false,
      leaderboard_opt_in: extended?.leaderboard_opt_in !== false,
      about_me: extended?.about_me || null,
      limitations: JSON.stringify(limitations?.map(l => l.name) || []),
      equipment_inventory: JSON.stringify(equipment?.map(e => e.equipment_type_id) || []),
      weeklyActivity: [0, 0, 0, 0, 0, 0, 0], // TODO: Fetch from activity logs
    });
  });

  app.put('/profile', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const body = request.body as Record<string, unknown>;

    // Validate and sanitize inputs
    const age = typeof body.age === 'number' ? body.age : null;
    const gender = typeof body.gender === 'string' ? body.gender : null;

    // Calculate date_of_birth from age
    let dateOfBirth: string | null = null;
    if (age !== null && age > 0 && age < 150) {
      const today = new Date();
      const birthYear = today.getFullYear() - age;
      dateOfBirth = `${birthYear}-01-01`;
    }

    // Upsert user_profile_extended
    await query(
      `INSERT INTO user_profile_extended (user_id, gender, date_of_birth, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         gender = COALESCE($2, user_profile_extended.gender),
         date_of_birth = COALESCE($3, user_profile_extended.date_of_birth),
         updated_at = NOW()`,
      [userId, gender, dateOfBirth]
    );

    // Handle limitations if provided
    if (typeof body.limitations === 'string') {
      try {
        const limitationNames = JSON.parse(body.limitations) as string[];
        if (Array.isArray(limitationNames)) {
          // Clear existing simple limitations and re-add
          await query(
            `DELETE FROM user_limitations WHERE user_id = $1 AND limitation_type = 'other'`,
            [userId]
          );

          for (const name of limitationNames) {
            if (typeof name === 'string' && name.length > 0) {
              await query(
                `INSERT INTO user_limitations (user_id, name, limitation_type, status)
                 VALUES ($1, $2, 'other', 'active')
                 ON CONFLICT DO NOTHING`,
                [userId, name]
              );
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    // Handle equipment if provided
    if (typeof body.equipment_inventory === 'string') {
      try {
        const equipmentIds = JSON.parse(body.equipment_inventory) as string[];
        if (Array.isArray(equipmentIds)) {
          // Clear existing equipment and re-add
          await query(`DELETE FROM user_home_equipment WHERE user_id = $1`, [userId]);

          for (const equipmentId of equipmentIds) {
            if (typeof equipmentId === 'string' && equipmentId.length > 0) {
              // First check if equipment type exists, if not create it
              const exists = await queryOne<{ id: string }>(
                `SELECT id FROM equipment_types WHERE id = $1`,
                [equipmentId]
              );

              if (!exists) {
                await query(
                  `INSERT INTO equipment_types (id, name, category, created_at)
                   VALUES ($1, $2, 'home', NOW())
                   ON CONFLICT DO NOTHING`,
                  [equipmentId, equipmentId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())]
                );
              }

              await query(
                `INSERT INTO user_home_equipment (user_id, equipment_type_id, location_type)
                 VALUES ($1, $2, 'home')
                 ON CONFLICT DO NOTHING`,
                [userId, equipmentId]
              );
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    log.info({ userId }, 'Profile updated');

    return reply.send({ success: true, message: 'Profile updated' });
  });

  // Avatar and theme endpoints (return empty arrays for now - cosmetics not yet implemented)
  app.get('/profile/avatars', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ avatars: [] });
  });

  app.get('/profile/themes', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ themes: [] });
  });
}

export { JwtPayload };
