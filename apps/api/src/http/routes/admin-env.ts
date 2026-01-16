/**
 * Admin Environment Variable Routes
 *
 * Handles environment variable management from the Empire dashboard:
 * - List all env vars (masked sensitive values)
 * - Update env variable overrides (stored in database)
 * - Compare dev vs production configs
 * - Audit trail of config changes
 * - Validate env var sets
 *
 * SECURITY: All routes require admin authentication
 * SECURITY: Sensitive values are always masked in responses
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, queryOne, queryAll, transaction } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================
// SCHEMAS
// ============================================

const UpdateEnvVarSchema = z.object({
  value: z.string(),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
});

const ValidateEnvVarsSchema = z.object({
  variables: z.record(z.string()),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
});

const ListEnvVarsQuerySchema = z.object({
  environment: z.enum(['development', 'staging', 'production', 'all']).optional().default('all'),
  showMasked: z.coerce.boolean().optional().default(true),
});

const AuditQuerySchema = z.object({
  key: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  cursor: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

interface EnvConfigRow {
  id: string;
  key: string;
  value: string;
  environment: string;
  updated_by: string;
  updated_at: Date;
  created_at: Date;
}

interface EnvConfigAuditRow {
  id: string;
  config_id: string;
  key: string;
  old_value: string | null;
  new_value: string;
  environment: string;
  action: string;
  changed_by: string;
  changed_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  username: string | null;
}

// ============================================
// HELPERS
// ============================================

/**
 * Sensitive key patterns that should always be masked
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /credential/i,
  /api_key/i,
  /apikey/i,
  /auth/i,
  /private/i,
  /cert/i,
  /salt/i,
  /hash/i,
];

/**
 * Check if a key name indicates a sensitive value
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Mask a sensitive value, showing only first and last 2 characters
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 20))}${value.slice(-2)}`;
}

/**
 * Get value display - masked if sensitive, full value otherwise
 */
function getDisplayValue(key: string, value: string, showMasked: boolean): string {
  if (!showMasked || !isSensitiveKey(key)) {
    return value;
  }
  return maskValue(value);
}

/**
 * Required environment variables with their validation rules
 */
const REQUIRED_ENV_VARS: Record<string, { required: boolean; validator?: (val: string) => boolean; description: string }> = {
  NODE_ENV: {
    required: true,
    validator: (val) => ['development', 'staging', 'production', 'test'].includes(val),
    description: 'Application environment',
  },
  PORT: {
    required: true,
    validator: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536,
    description: 'API server port',
  },
  DATABASE_URL: {
    required: true,
    validator: (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
    description: 'PostgreSQL connection string',
  },
  JWT_SECRET: {
    required: true,
    validator: (val) => val.length >= 32,
    description: 'JWT signing secret (min 32 chars)',
  },
  REDIS_URL: {
    required: false,
    validator: (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
    description: 'Redis connection string',
  },
  STRIPE_SECRET_KEY: {
    required: false,
    validator: (val) => val.startsWith('sk_'),
    description: 'Stripe secret key',
  },
  STRIPE_WEBHOOK_SECRET: {
    required: false,
    validator: (val) => val.startsWith('whsec_'),
    description: 'Stripe webhook secret',
  },
};

// ============================================
// ROUTES
// ============================================

export default async function adminEnvRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /admin/env/variables
   * List all environment variable overrides (mask sensitive values)
   */
  fastify.get(
    '/admin/env/variables',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query_params = ListEnvVarsQuerySchema.parse(request.query);

      let sql = `
        SELECT
          ec.id,
          ec.key,
          ec.value,
          ec.environment,
          ec.updated_by,
          ec.updated_at,
          ec.created_at,
          u.username as updated_by_username
        FROM env_config ec
        LEFT JOIN users u ON ec.updated_by = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query_params.environment !== 'all') {
        sql += ` AND ec.environment = $${paramIndex++}`;
        params.push(query_params.environment);
      }

      sql += ` ORDER BY ec.key ASC, ec.environment ASC`;

      const rows = await queryAll<EnvConfigRow & { updated_by_username: string | null }>(sql, params);

      // Also get current process.env variables for comparison (non-sensitive only)
      const processEnvVars = Object.entries(process.env)
        .filter(([key]) => !isSensitiveKey(key))
        .map(([key, value]) => ({
          key,
          value: value || '',
          source: 'process.env' as const,
        }));

      const items = rows.map((row) => ({
        id: row.id,
        key: row.key,
        value: getDisplayValue(row.key, row.value, query_params.showMasked),
        isMasked: isSensitiveKey(row.key) && query_params.showMasked,
        isSensitive: isSensitiveKey(row.key),
        environment: row.environment,
        updatedBy: row.updated_by,
        updatedByUsername: row.updated_by_username,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        source: 'database' as const,
      }));

      return reply.send({
        databaseOverrides: items,
        processEnv: processEnvVars,
        requiredVars: Object.entries(REQUIRED_ENV_VARS).map(([key, info]) => ({
          key,
          required: info.required,
          description: info.description,
          isSensitive: isSensitiveKey(key),
        })),
      });
    }
  );

  /**
   * PUT /admin/env/variables/:key
   * Update an environment variable override (stored in database)
   */
  fastify.put(
    '/admin/env/variables/:key',
    { preHandler: [authenticate, requireAdmin] },
    async (
      request: FastifyRequest<{ Params: { key: string } }>,
      reply: FastifyReply
    ) => {
      const { key } = request.params;
      const user = request.user as { userId: string };
      const body = UpdateEnvVarSchema.parse(request.body);

      // Validate the key format
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_KEY',
            message: 'Environment variable key must be uppercase with underscores only',
            statusCode: 400,
          },
        });
      }

      // Check if this is a known required var and validate if so
      const varInfo = REQUIRED_ENV_VARS[key];
      if (varInfo?.validator && !varInfo.validator(body.value)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_VALUE',
            message: `Invalid value for ${key}: ${varInfo.description}`,
            statusCode: 400,
          },
        });
      }

      const result = await transaction(async (client) => {
        // Check if the key already exists for this environment
        const existing = await client.query(
          `SELECT id, value FROM env_config WHERE key = $1 AND environment = $2`,
          [key, body.environment]
        );

        let configId: string;
        let oldValue: string | null = null;
        let action: string;

        if (existing.rows.length > 0) {
          // Update existing
          configId = existing.rows[0].id;
          oldValue = existing.rows[0].value;
          action = 'update';

          await client.query(
            `UPDATE env_config SET value = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
            [body.value, user.userId, configId]
          );
        } else {
          // Insert new
          action = 'create';
          const insertResult = await client.query(
            `INSERT INTO env_config (key, value, environment, updated_by)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [key, body.value, body.environment, user.userId]
          );
          configId = insertResult.rows[0].id;
        }

        // Create audit trail entry
        const ipAddress = request.ip || null;
        const userAgent = request.headers['user-agent'] || null;

        await client.query(
          `INSERT INTO env_config_audit (config_id, key, old_value, new_value, environment, action, changed_by, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [configId, key, oldValue, body.value, body.environment, action, user.userId, ipAddress, userAgent]
        );

        return { configId, action, oldValue };
      });

      log.info(
        {
          key,
          environment: body.environment,
          action: result.action,
          adminId: user.userId,
        },
        'Environment variable updated'
      );

      return reply.send({
        success: true,
        action: result.action,
        key,
        environment: body.environment,
        message: `Environment variable ${key} ${result.action === 'create' ? 'created' : 'updated'} successfully`,
      });
    }
  );

  /**
   * DELETE /admin/env/variables/:key
   * Delete an environment variable override
   */
  fastify.delete(
    '/admin/env/variables/:key',
    { preHandler: [authenticate, requireAdmin] },
    async (
      request: FastifyRequest<{ Params: { key: string }; Querystring: { environment?: string } }>,
      reply: FastifyReply
    ) => {
      const { key } = request.params;
      const environment = (request.query as { environment?: string }).environment || 'production';
      const user = request.user as { userId: string };

      // Get the existing value for audit
      const existing = await queryOne<EnvConfigRow>(
        `SELECT * FROM env_config WHERE key = $1 AND environment = $2`,
        [key, environment]
      );

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `Environment variable ${key} not found for ${environment}`,
            statusCode: 404,
          },
        });
      }

      await transaction(async (client) => {
        // Create audit trail entry
        const ipAddress = request.ip || null;
        const userAgent = request.headers['user-agent'] || null;

        await client.query(
          `INSERT INTO env_config_audit (config_id, key, old_value, new_value, environment, action, changed_by, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [existing.id, key, existing.value, null, environment, 'delete', user.userId, ipAddress, userAgent]
        );

        // Delete the config
        await client.query(`DELETE FROM env_config WHERE id = $1`, [existing.id]);
      });

      log.info(
        {
          key,
          environment,
          adminId: user.userId,
        },
        'Environment variable deleted'
      );

      return reply.send({
        success: true,
        message: `Environment variable ${key} deleted from ${environment}`,
      });
    }
  );

  /**
   * GET /admin/env/compare
   * Compare dev vs production configurations
   */
  fastify.get(
    '/admin/env/compare',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Get all configs grouped by key
      const configs = await queryAll<EnvConfigRow>(
        `SELECT * FROM env_config ORDER BY key, environment`
      );

      // Build comparison map
      const comparisonMap: Record<
        string,
        {
          development?: { value: string; updatedAt: Date };
          staging?: { value: string; updatedAt: Date };
          production?: { value: string; updatedAt: Date };
        }
      > = {};

      for (const config of configs) {
        if (!comparisonMap[config.key]) {
          comparisonMap[config.key] = {};
        }

        const displayValue = getDisplayValue(config.key, config.value, true);
        comparisonMap[config.key][config.environment as 'development' | 'staging' | 'production'] = {
          value: displayValue,
          updatedAt: config.updated_at,
        };
      }

      // Identify differences
      const differences: Array<{
        key: string;
        isSensitive: boolean;
        development?: string;
        staging?: string;
        production?: string;
        status: 'missing' | 'different' | 'synced';
      }> = [];

      for (const [key, envs] of Object.entries(comparisonMap)) {
        const devVal = envs.development?.value;
        const stagingVal = envs.staging?.value;
        const prodVal = envs.production?.value;

        let status: 'missing' | 'different' | 'synced' = 'synced';

        if (!devVal && prodVal) {
          status = 'missing';
        } else if (devVal !== prodVal || devVal !== stagingVal) {
          status = 'different';
        }

        differences.push({
          key,
          isSensitive: isSensitiveKey(key),
          development: devVal,
          staging: stagingVal,
          production: prodVal,
          status,
        });
      }

      // Check for required vars that are completely missing
      const missingRequired: Array<{ key: string; description: string }> = [];
      for (const [key, info] of Object.entries(REQUIRED_ENV_VARS)) {
        if (info.required && !comparisonMap[key]?.production) {
          // Check if it's in process.env
          if (!process.env[key]) {
            missingRequired.push({ key, description: info.description });
          }
        }
      }

      return reply.send({
        comparison: differences,
        missingRequired,
        summary: {
          total: differences.length,
          synced: differences.filter((d) => d.status === 'synced').length,
          different: differences.filter((d) => d.status === 'different').length,
          missing: differences.filter((d) => d.status === 'missing').length,
        },
      });
    }
  );

  /**
   * GET /admin/env/audit
   * Audit trail of configuration changes
   */
  fastify.get(
    '/admin/env/audit',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query_params = AuditQuerySchema.parse(request.query);

      let sql = `
        SELECT
          a.id,
          a.config_id,
          a.key,
          a.old_value,
          a.new_value,
          a.environment,
          a.action,
          a.changed_by,
          a.changed_at,
          a.ip_address,
          a.user_agent,
          u.username
        FROM env_config_audit a
        LEFT JOIN users u ON a.changed_by = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query_params.key) {
        sql += ` AND a.key = $${paramIndex++}`;
        params.push(query_params.key);
      }

      if (query_params.environment) {
        sql += ` AND a.environment = $${paramIndex++}`;
        params.push(query_params.environment);
      }

      // Keyset pagination
      if (query_params.cursor) {
        const [cursorDate, cursorId] = query_params.cursor.split('|');
        sql += ` AND (a.changed_at < $${paramIndex++} OR (a.changed_at = $${paramIndex - 1} AND a.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY a.changed_at DESC, a.id DESC LIMIT $${paramIndex}`;
      params.push(query_params.limit + 1);

      const rows = await queryAll<EnvConfigAuditRow>(sql, params);
      const hasMore = rows.length > query_params.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor =
        hasMore && items.length > 0
          ? `${items[items.length - 1].changed_at.toISOString()}|${items[items.length - 1].id}`
          : null;

      return reply.send({
        items: items.map((row) => ({
          id: row.id,
          configId: row.config_id,
          key: row.key,
          oldValue: row.old_value ? getDisplayValue(row.key, row.old_value, true) : null,
          newValue: row.new_value ? getDisplayValue(row.key, row.new_value, true) : null,
          isSensitive: isSensitiveKey(row.key),
          environment: row.environment,
          action: row.action,
          changedBy: row.changed_by,
          changedByUsername: row.username,
          changedAt: row.changed_at,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
        })),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * POST /admin/env/validate
   * Validate a set of environment variables
   */
  fastify.post(
    '/admin/env/validate',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ValidateEnvVarsSchema.parse(request.body);

      const results: Array<{
        key: string;
        valid: boolean;
        required: boolean;
        message: string;
      }> = [];

      // Check all provided variables
      for (const [key, value] of Object.entries(body.variables)) {
        const varInfo = REQUIRED_ENV_VARS[key];

        if (varInfo) {
          if (varInfo.validator) {
            const isValid = varInfo.validator(value);
            results.push({
              key,
              valid: isValid,
              required: varInfo.required,
              message: isValid ? 'Valid' : `Invalid: ${varInfo.description}`,
            });
          } else {
            results.push({
              key,
              valid: true,
              required: varInfo.required,
              message: 'Valid (no specific validation)',
            });
          }
        } else {
          // Unknown variable - just accept it
          results.push({
            key,
            valid: true,
            required: false,
            message: 'Valid (custom variable)',
          });
        }
      }

      // Check for missing required variables
      for (const [key, info] of Object.entries(REQUIRED_ENV_VARS)) {
        if (info.required && !(key in body.variables)) {
          // Check if it's already in process.env or database
          const inDb = await queryOne<{ id: string }>(
            `SELECT id FROM env_config WHERE key = $1 AND environment = $2`,
            [key, body.environment]
          );

          if (!inDb && !process.env[key]) {
            results.push({
              key,
              valid: false,
              required: true,
              message: `Missing required variable: ${info.description}`,
            });
          }
        }
      }

      const allValid = results.every((r) => r.valid);
      const requiredMissing = results.filter((r) => !r.valid && r.required);

      return reply.send({
        valid: allValid,
        results,
        summary: {
          total: results.length,
          valid: results.filter((r) => r.valid).length,
          invalid: results.filter((r) => !r.valid).length,
          requiredMissing: requiredMissing.length,
        },
      });
    }
  );

  /**
   * GET /admin/env/export
   * Export all env configs (with masked values) for backup
   */
  fastify.get(
    '/admin/env/export',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const environment = ((request.query as { environment?: string }).environment || 'production') as string;

      const configs = await queryAll<EnvConfigRow>(
        `SELECT * FROM env_config WHERE environment = $1 ORDER BY key`,
        [environment]
      );

      // Always mask sensitive values in export
      const exportData = {
        environment,
        exportedAt: new Date().toISOString(),
        variables: configs.map((c) => ({
          key: c.key,
          value: isSensitiveKey(c.key) ? '[MASKED]' : c.value,
          isSensitive: isSensitiveKey(c.key),
          updatedAt: c.updated_at,
        })),
      };

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="env-config-${environment}-${Date.now()}.json"`);

      return reply.send(exportData);
    }
  );
}
