/**
 * Plugin Settings Routes
 *
 * Provides API endpoints for managing plugin configurations.
 * Settings are stored in the installed_plugins.config JSONB column.
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/client';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.plugins;

// Schema for plugin settings update
const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()),
});

// Schema for bulk settings update
const bulkUpdateSettingsSchema = z.object({
  plugins: z.array(z.object({
    pluginId: z.string(),
    settings: z.record(z.unknown()),
  })),
});

/**
 * Register plugin settings routes
 */
export async function registerPluginRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /plugins - List all installed plugins
   */
  fastify.get('/plugins', {
    preHandler: [authenticate],
    schema: {
      description: 'List all installed plugins',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            plugins: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  version: { type: 'string' },
                  displayName: { type: 'string' },
                  description: { type: 'string' },
                  enabled: { type: 'boolean' },
                  config: { type: 'object' },
                  installedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const result = await db.query(`
      SELECT
        id,
        name,
        version,
        display_name as "displayName",
        description,
        enabled,
        config,
        installed_at as "installedAt"
      FROM installed_plugins
      ORDER BY installed_at DESC
    `);

    return reply.send({
      plugins: result.rows.map(row => ({
        ...row,
        config: row.config || {},
      })),
    });
  });

  /**
   * GET /plugins/:pluginId - Get a specific plugin and its settings
   */
  fastify.get('/plugins/:pluginId', {
    preHandler: [authenticate],
    schema: {
      description: 'Get plugin details and settings',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['pluginId'],
        properties: {
          pluginId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { pluginId: string } }>, reply) => {
    const { pluginId } = request.params;

    const result = await db.query(`
      SELECT
        id,
        name,
        version,
        display_name as "displayName",
        description,
        enabled,
        config,
        installed_at as "installedAt",
        updated_at as "updatedAt"
      FROM installed_plugins
      WHERE id = $1
    `, [pluginId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin "${pluginId}" not found`,
        },
      });
    }

    const plugin = result.rows[0];

    return reply.send({
      plugin: {
        ...plugin,
        config: plugin.config || {},
      },
    });
  });

  /**
   * GET /plugins/:pluginId/settings - Get plugin settings
   */
  fastify.get('/plugins/:pluginId/settings', {
    preHandler: [authenticate],
    schema: {
      description: 'Get plugin settings',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['pluginId'],
        properties: {
          pluginId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { pluginId: string } }>, reply) => {
    const { pluginId } = request.params;

    const result = await db.query(`
      SELECT config FROM installed_plugins WHERE id = $1
    `, [pluginId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin "${pluginId}" not found`,
        },
      });
    }

    return reply.send({
      settings: result.rows[0].config || {},
    });
  });

  /**
   * PUT /plugins/:pluginId/settings - Update plugin settings
   */
  fastify.put('/plugins/:pluginId/settings', {
    preHandler: [authenticate],
    schema: {
      description: 'Update plugin settings',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['pluginId'],
        properties: {
          pluginId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['settings'],
        properties: {
          settings: { type: 'object' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { pluginId: string }; Body: unknown }>, reply) => {
    const { pluginId } = request.params;
    const { settings } = updateSettingsSchema.parse(request.body);

    // Check if plugin exists
    const existingResult = await db.query(`
      SELECT id, config FROM installed_plugins WHERE id = $1
    `, [pluginId]);

    if (existingResult.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin "${pluginId}" not found`,
        },
      });
    }

    // Merge existing config with new settings
    const existingConfig = (existingResult.rows[0].config || {}) as Record<string, unknown>;
    const newConfig = { ...existingConfig, ...settings };

    // Update settings
    await db.query(`
      UPDATE installed_plugins
      SET config = $2, updated_at = NOW()
      WHERE id = $1
    `, [pluginId, JSON.stringify(newConfig)]);

    log.info({ pluginId, settingsKeys: Object.keys(settings) }, 'Plugin settings updated');

    return reply.send({
      success: true,
      settings: newConfig,
    });
  });

  /**
   * POST /plugins/:pluginId/enable - Enable a plugin
   */
  fastify.post('/plugins/:pluginId/enable', {
    preHandler: [authenticate],
    schema: {
      description: 'Enable a plugin',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['pluginId'],
        properties: {
          pluginId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { pluginId: string } }>, reply) => {
    const { pluginId } = request.params;

    const result = await db.query(`
      UPDATE installed_plugins
      SET enabled = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [pluginId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin "${pluginId}" not found`,
        },
      });
    }

    log.info({ pluginId }, 'Plugin enabled');

    return reply.send({ success: true, enabled: true });
  });

  /**
   * POST /plugins/:pluginId/disable - Disable a plugin
   */
  fastify.post('/plugins/:pluginId/disable', {
    preHandler: [authenticate],
    schema: {
      description: 'Disable a plugin',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['pluginId'],
        properties: {
          pluginId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { pluginId: string } }>, reply) => {
    const { pluginId } = request.params;

    const result = await db.query(`
      UPDATE installed_plugins
      SET enabled = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [pluginId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin "${pluginId}" not found`,
        },
      });
    }

    log.info({ pluginId }, 'Plugin disabled');

    return reply.send({ success: true, enabled: false });
  });

  /**
   * PUT /plugins/settings/bulk - Bulk update plugin settings
   */
  fastify.put('/plugins/settings/bulk', {
    preHandler: [authenticate],
    schema: {
      description: 'Bulk update settings for multiple plugins',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['plugins'],
        properties: {
          plugins: {
            type: 'array',
            items: {
              type: 'object',
              required: ['pluginId', 'settings'],
              properties: {
                pluginId: { type: 'string' },
                settings: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: unknown }>, reply) => {
    const { plugins } = bulkUpdateSettingsSchema.parse(request.body);

    const results = await Promise.all(
      plugins.map(async ({ pluginId, settings }) => {
        try {
          // Get existing config
          const existingResult = await db.query(`
            SELECT config FROM installed_plugins WHERE id = $1
          `, [pluginId]);

          if (existingResult.rows.length === 0) {
            return { pluginId, success: false, error: 'Plugin not found' };
          }

          const existingConfig = (existingResult.rows[0].config || {}) as Record<string, unknown>;
          const newConfig = { ...existingConfig, ...settings };

          await db.query(`
            UPDATE installed_plugins
            SET config = $2, updated_at = NOW()
            WHERE id = $1
          `, [pluginId, JSON.stringify(newConfig)]);

          return { pluginId, success: true };
        } catch (error) {
          return { pluginId, success: false, error: (error as Error).message };
        }
      })
    );

    log.info({ count: plugins.length }, 'Bulk plugin settings updated');

    return reply.send({ results });
  });

  /**
   * DELETE /plugins/:pluginId/settings - Reset plugin settings to defaults
   */
  fastify.delete('/plugins/:pluginId/settings', {
    preHandler: [authenticate],
    schema: {
      description: 'Reset plugin settings to defaults',
      tags: ['plugins'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['pluginId'],
        properties: {
          pluginId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { pluginId: string } }>, reply) => {
    const { pluginId } = request.params;

    const result = await db.query(`
      UPDATE installed_plugins
      SET config = '{}', updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [pluginId]);

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: {
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin "${pluginId}" not found`,
        },
      });
    }

    log.info({ pluginId }, 'Plugin settings reset');

    return reply.send({ success: true, settings: {} });
  });
}

export default registerPluginRoutes;
