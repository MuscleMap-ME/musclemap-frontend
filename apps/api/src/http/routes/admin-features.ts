/**
 * Admin Feature Flags Routes
 *
 * Endpoints for managing feature flags, including:
 * - CRUD operations for feature flags
 * - Quick toggle on/off
 * - Usage statistics
 * - Gradual rollout percentage
 * - User segment targeting rules
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, queryOne, queryAll } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================================================
// Zod Schemas
// ============================================================================

const targetingRulesSchema = z.object({
  user_ids: z.array(z.string().uuid()).optional(),
  roles: z.array(z.string()).optional(),
  cohorts: z.array(z.string()).optional(),
  beta_testers_only: z.boolean().optional(),
  min_level: z.number().int().min(1).optional(),
  max_level: z.number().int().min(1).optional(),
  archetypes: z.array(z.string()).optional(),
  exclude_user_ids: z.array(z.string().uuid()).optional(),
  platforms: z.array(z.enum(['web', 'ios', 'android'])).optional(),
  regions: z.array(z.string()).optional(),
}).strict().optional();

const createFeatureFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Key must start with a letter and contain only lowercase letters, numbers, and underscores',
  }),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  enabled: z.boolean().default(false),
  rollout_percentage: z.number().min(0).max(100).default(0),
  targeting_rules: targetingRulesSchema,
});

const updateFeatureFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  enabled: z.boolean().optional(),
  rollout_percentage: z.number().min(0).max(100).optional(),
  targeting_rules: targetingRulesSchema,
});

const rolloutSchema = z.object({
  percentage: z.number().min(0).max(100),
});

const listFlagsQuerySchema = z.object({
  enabled: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================================================
// Types
// ============================================================================

interface FeatureFlagRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  targeting_rules: TargetingRules | null;
  created_at: Date;
  updated_at: Date;
}

interface TargetingRules {
  user_ids?: string[];
  roles?: string[];
  cohorts?: string[];
  beta_testers_only?: boolean;
  min_level?: number;
  max_level?: number;
  archetypes?: string[];
  exclude_user_ids?: string[];
  platforms?: ('web' | 'ios' | 'android')[];
  regions?: string[];
}

interface FlagUsageStats {
  flag_id: string;
  total_checks: number;
  enabled_checks: number;
  disabled_checks: number;
  unique_users: number;
  checks_last_24h: number;
  checks_last_7d: number;
  last_checked_at: Date | null;
}

interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
}

// ============================================================================
// Routes
// ============================================================================

export default async function adminFeaturesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/features/flags
   * List all feature flags with optional filters
   */
  app.get(
    '/admin/features/flags',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = listFlagsQuerySchema.parse(request.query);

      let sql = `
        SELECT
          id, key, name, description, enabled, rollout_percentage,
          targeting_rules, created_at, updated_at
        FROM feature_flags
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      // Filter by enabled status
      if (queryParams.enabled !== undefined) {
        sql += ` AND enabled = $${paramIndex++}`;
        params.push(queryParams.enabled === 'true');
      }

      // Search by key or name
      if (queryParams.search) {
        sql += ` AND (key ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
        params.push(`%${queryParams.search}%`);
        paramIndex++;
      }

      // Keyset pagination
      if (queryParams.cursor) {
        const [cursorDate, cursorId] = queryParams.cursor.split('|');
        sql += ` AND (created_at < $${paramIndex++} OR (created_at = $${paramIndex - 1} AND id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
      params.push(queryParams.limit + 1);

      const rows = await queryAll<FeatureFlagRow>(sql, params);
      const hasMore = rows.length > queryParams.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      return reply.send({
        items: items.map(formatFeatureFlag),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * POST /admin/features/flags
   * Create a new feature flag
   */
  app.post(
    '/admin/features/flags',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as JwtPayload;
      const body = createFeatureFlagSchema.parse(request.body);

      // Check for duplicate key
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM feature_flags WHERE key = $1`,
        [body.key]
      );

      if (existing) {
        return reply.status(409).send({
          error: {
            code: 'DUPLICATE_KEY',
            message: `Feature flag with key "${body.key}" already exists`,
            statusCode: 409,
          },
        });
      }

      const result = await queryOne<FeatureFlagRow>(`
        INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, targeting_rules)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, key, name, description, enabled, rollout_percentage, targeting_rules, created_at, updated_at
      `, [
        body.key,
        body.name,
        body.description || null,
        body.enabled,
        body.rollout_percentage,
        body.targeting_rules ? JSON.stringify(body.targeting_rules) : null,
      ]);

      log.info({ flagId: result?.id, key: body.key, adminId: user.userId }, 'Feature flag created');

      return reply.status(201).send(formatFeatureFlag(result!));
    }
  );

  /**
   * GET /admin/features/flags/:id
   * Get a single feature flag by ID
   */
  app.get<{ Params: { id: string } }>(
    '/admin/features/flags/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      const flag = await queryOne<FeatureFlagRow>(`
        SELECT id, key, name, description, enabled, rollout_percentage,
               targeting_rules, created_at, updated_at
        FROM feature_flags
        WHERE id = $1
      `, [id]);

      if (!flag) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      return reply.send(formatFeatureFlag(flag));
    }
  );

  /**
   * PUT /admin/features/flags/:id
   * Update a feature flag
   */
  app.put<{ Params: { id: string } }>(
    '/admin/features/flags/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as JwtPayload;
      const updates = updateFeatureFlagSchema.parse(request.body);

      // Check if flag exists
      const existing = await queryOne<{ id: string; key: string }>(
        `SELECT id, key FROM feature_flags WHERE id = $1`,
        [id]
      );

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      // If updating key, check for duplicates
      if (updates.key && updates.key !== existing.key) {
        const duplicate = await queryOne<{ id: string }>(
          `SELECT id FROM feature_flags WHERE key = $1 AND id != $2`,
          [updates.key, id]
        );

        if (duplicate) {
          return reply.status(409).send({
            error: {
              code: 'DUPLICATE_KEY',
              message: `Feature flag with key "${updates.key}" already exists`,
              statusCode: 409,
            },
          });
        }
      }

      // Build dynamic update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (updates.key !== undefined) {
        setClauses.push(`key = $${paramIndex++}`);
        params.push(updates.key);
      }
      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(updates.description);
      }
      if (updates.enabled !== undefined) {
        setClauses.push(`enabled = $${paramIndex++}`);
        params.push(updates.enabled);
      }
      if (updates.rollout_percentage !== undefined) {
        setClauses.push(`rollout_percentage = $${paramIndex++}`);
        params.push(updates.rollout_percentage);
      }
      if (updates.targeting_rules !== undefined) {
        setClauses.push(`targeting_rules = $${paramIndex++}`);
        params.push(updates.targeting_rules ? JSON.stringify(updates.targeting_rules) : null);
      }

      params.push(id);

      const result = await queryOne<FeatureFlagRow>(`
        UPDATE feature_flags
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, key, name, description, enabled, rollout_percentage, targeting_rules, created_at, updated_at
      `, params);

      log.info({ flagId: id, updates: Object.keys(updates), adminId: user.userId }, 'Feature flag updated');

      return reply.send(formatFeatureFlag(result!));
    }
  );

  /**
   * DELETE /admin/features/flags/:id
   * Delete a feature flag
   */
  app.delete<{ Params: { id: string } }>(
    '/admin/features/flags/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as JwtPayload;

      const existing = await queryOne<{ id: string; key: string }>(
        `SELECT id, key FROM feature_flags WHERE id = $1`,
        [id]
      );

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      // Delete usage stats first (if table exists)
      await query(`DELETE FROM feature_flag_usage WHERE flag_id = $1`, [id]).catch(() => {
        // Table may not exist yet, ignore error
      });

      // Delete the flag
      await query(`DELETE FROM feature_flags WHERE id = $1`, [id]);

      log.info({ flagId: id, key: existing.key, adminId: user.userId }, 'Feature flag deleted');

      return reply.status(204).send();
    }
  );

  /**
   * POST /admin/features/flags/:id/toggle
   * Quick toggle a feature flag on/off
   */
  app.post<{ Params: { id: string } }>(
    '/admin/features/flags/:id/toggle',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as JwtPayload;

      const result = await queryOne<FeatureFlagRow>(`
        UPDATE feature_flags
        SET enabled = NOT enabled, updated_at = NOW()
        WHERE id = $1
        RETURNING id, key, name, description, enabled, rollout_percentage, targeting_rules, created_at, updated_at
      `, [id]);

      if (!result) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      log.info({
        flagId: id,
        key: result.key,
        enabled: result.enabled,
        adminId: user.userId,
      }, 'Feature flag toggled');

      return reply.send({
        success: true,
        flag: formatFeatureFlag(result),
      });
    }
  );

  /**
   * GET /admin/features/flags/:id/usage
   * Get usage statistics for a feature flag
   */
  app.get<{ Params: { id: string } }>(
    '/admin/features/flags/:id/usage',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      // Check flag exists
      const flag = await queryOne<{ id: string; key: string }>(
        `SELECT id, key FROM feature_flags WHERE id = $1`,
        [id]
      );

      if (!flag) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      // Try to get usage stats - table may not exist yet
      let usage: FlagUsageStats | undefined;
      try {
        usage = await queryOne<FlagUsageStats>(`
          SELECT
            flag_id,
            total_checks,
            enabled_checks,
            disabled_checks,
            unique_users,
            checks_last_24h,
            checks_last_7d,
            last_checked_at
          FROM feature_flag_usage
          WHERE flag_id = $1
        `, [id]);
      } catch {
        // Table doesn't exist, return default stats
      }

      return reply.send({
        flagId: id,
        flagKey: flag.key,
        stats: usage ? {
          totalChecks: usage.total_checks,
          enabledChecks: usage.enabled_checks,
          disabledChecks: usage.disabled_checks,
          uniqueUsers: usage.unique_users,
          checksLast24h: usage.checks_last_24h,
          checksLast7d: usage.checks_last_7d,
          lastCheckedAt: usage.last_checked_at,
        } : {
          totalChecks: 0,
          enabledChecks: 0,
          disabledChecks: 0,
          uniqueUsers: 0,
          checksLast24h: 0,
          checksLast7d: 0,
          lastCheckedAt: null,
        },
      });
    }
  );

  /**
   * PUT /admin/features/flags/:id/rollout
   * Set gradual rollout percentage for a feature flag
   */
  app.put<{ Params: { id: string } }>(
    '/admin/features/flags/:id/rollout',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as JwtPayload;
      const body = rolloutSchema.parse(request.body);

      const result = await queryOne<FeatureFlagRow>(`
        UPDATE feature_flags
        SET rollout_percentage = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, key, name, description, enabled, rollout_percentage, targeting_rules, created_at, updated_at
      `, [body.percentage, id]);

      if (!result) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      log.info({
        flagId: id,
        key: result.key,
        rolloutPercentage: body.percentage,
        adminId: user.userId,
      }, 'Feature flag rollout percentage updated');

      return reply.send({
        success: true,
        flag: formatFeatureFlag(result),
      });
    }
  );

  /**
   * PUT /admin/features/flags/:id/targeting
   * Set user segment targeting rules for a feature flag
   */
  app.put<{ Params: { id: string } }>(
    '/admin/features/flags/:id/targeting',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as JwtPayload;
      const targeting = targetingRulesSchema.parse(request.body);

      const result = await queryOne<FeatureFlagRow>(`
        UPDATE feature_flags
        SET targeting_rules = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, key, name, description, enabled, rollout_percentage, targeting_rules, created_at, updated_at
      `, [targeting ? JSON.stringify(targeting) : null, id]);

      if (!result) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feature flag not found', statusCode: 404 },
        });
      }

      log.info({
        flagId: id,
        key: result.key,
        targetingRules: targeting,
        adminId: user.userId,
      }, 'Feature flag targeting rules updated');

      return reply.send({
        success: true,
        flag: formatFeatureFlag(result),
      });
    }
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a feature flag row for API response
 */
function formatFeatureFlag(row: FeatureFlagRow) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    rolloutPercentage: row.rollout_percentage,
    targetingRules: row.targeting_rules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
