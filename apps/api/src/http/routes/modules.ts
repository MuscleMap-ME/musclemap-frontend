/**
 * Navigation Modules Routes
 *
 * Provides endpoints for:
 * - Listing available modules (active and coming soon)
 * - Module details and status
 * - Waitlist management for upcoming features
 */

import { FastifyInstance } from 'fastify';
import { db } from '../../db/client';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'modules-routes' });

interface NavigationModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  status: string;
  release_phase: number;
  display_order: number;
  show_in_nav: boolean;
  show_badge: boolean;
  badge_text: string | null;
  coming_soon_message: string | null;
  expected_release: string | null;
  preview_image_url: string | null;
  is_premium: boolean;
  minimum_level: number;
}

interface ModuleWaitlistEntry {
  id: string;
  user_id: string;
  module_id: string;
  interest_level: number;
  use_case: string | null;
  notify_on_release: boolean;
  notify_on_beta: boolean;
  created_at: string;
}

export async function registerModulesRoutes(app: FastifyInstance) {
  // ============================================
  // GET /modules - List all navigation modules
  // ============================================
  app.get('/modules', async (request, reply) => {
    try {
      const { status, show_hidden } = request.query as {
        status?: string;
        show_hidden?: string;
      };

      let query = `
        SELECT
          id, name, description, icon, route, status, release_phase,
          display_order, show_in_nav, show_badge, badge_text,
          coming_soon_message, expected_release, preview_image_url,
          is_premium, minimum_level
        FROM navigation_modules
        WHERE 1=1
      `;

      const params: (string | boolean)[] = [];

      // Filter by status if provided
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }

      // By default, hide modules not meant for nav
      if (show_hidden !== 'true') {
        query += ` AND show_in_nav = TRUE`;
      }

      query += ` ORDER BY display_order ASC`;

      const modules = await db.queryAll<NavigationModule>(query, params);

      // Group by status for convenience
      const grouped = {
        active: modules.filter((m: NavigationModule) => m.status === 'active'),
        beta: modules.filter((m: NavigationModule) => m.status === 'beta'),
        coming_soon: modules.filter((m: NavigationModule) => m.status === 'coming_soon'),
      };

      return reply.send({
        modules,
        grouped,
        total: modules.length,
      });
    } catch (error) {
      log.error('Error fetching modules:', error);
      return reply.status(500).send({ error: 'Failed to fetch modules' });
    }
  });

  // ============================================
  // GET /modules/coming-soon - Get upcoming modules summary
  // ============================================
  app.get('/modules/coming-soon', async (request, reply) => {
    try {
      const modules = await db.queryAll<NavigationModule & { waitlist_count: string }>(
        `SELECT
          m.id, m.name, m.description, m.icon,
          m.coming_soon_message, m.expected_release, m.preview_image_url,
          m.is_premium, m.release_phase,
          COUNT(w.id) as waitlist_count
        FROM navigation_modules m
        LEFT JOIN module_waitlist w ON m.id = w.module_id
        WHERE m.status = 'coming_soon'
        GROUP BY m.id
        ORDER BY m.release_phase ASC, m.display_order ASC`
      );

      // Group by release phase
      const byPhase: Record<number, Array<NavigationModule & { waitlist_count: string }>> = {};
      for (const mod of modules) {
        const phase = mod.release_phase;
        if (!byPhase[phase]) {
          byPhase[phase] = [];
        }
        byPhase[phase].push(mod);
      }

      return reply.send({
        modules,
        by_phase: byPhase,
        total: modules.length,
      });
    } catch (error) {
      log.error('Error fetching coming soon modules:', error);
      return reply.status(500).send({ error: 'Failed to fetch modules' });
    }
  });

  // ============================================
  // GET /modules/waitlist/me - Get user's waitlist
  // ============================================
  app.get(
    '/modules/waitlist/me',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = (request as any).userId;

        const waitlist = await db.queryAll<
          ModuleWaitlistEntry & {
            module_name: string;
            module_status: string;
            expected_release: string | null;
          }
        >(
          `SELECT
            w.id, w.module_id, w.interest_level, w.use_case,
            w.notify_on_release, w.notify_on_beta, w.created_at,
            m.name as module_name, m.status as module_status,
            m.expected_release
          FROM module_waitlist w
          JOIN navigation_modules m ON w.module_id = m.id
          WHERE w.user_id = $1
          ORDER BY w.created_at DESC`,
          [userId]
        );

        return reply.send({
          waitlist,
          total: waitlist.length,
        });
      } catch (error) {
        log.error('Error fetching user waitlist:', error);
        return reply.status(500).send({ error: 'Failed to fetch waitlist' });
      }
    }
  );

  // ============================================
  // GET /modules/:id - Get module details
  // ============================================
  app.get('/modules/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const module = await db.queryOne<NavigationModule>(
        `SELECT
          id, name, description, icon, route, status, release_phase,
          display_order, show_in_nav, show_badge, badge_text,
          coming_soon_message, expected_release, preview_image_url,
          is_premium, minimum_level
        FROM navigation_modules
        WHERE id = $1`,
        [id]
      );

      if (!module) {
        return reply.status(404).send({ error: 'Module not found' });
      }

      // Get waitlist count for coming_soon modules
      let waitlist_count = 0;
      if (module.status === 'coming_soon') {
        const countResult = await db.queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM module_waitlist WHERE module_id = $1`,
          [id]
        );
        waitlist_count = parseInt(countResult?.count || '0');
      }

      return reply.send({
        ...module,
        waitlist_count,
      });
    } catch (error) {
      log.error('Error fetching module:', error);
      return reply.status(500).send({ error: 'Failed to fetch module' });
    }
  });

  // ============================================
  // POST /modules/:id/waitlist - Join module waitlist
  // ============================================
  app.post(
    '/modules/:id/waitlist',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = (request as any).userId;
        const { interest_level, use_case, notify_on_release, notify_on_beta } =
          request.body as {
            interest_level?: number;
            use_case?: string;
            notify_on_release?: boolean;
            notify_on_beta?: boolean;
          };

        // Verify module exists and is coming_soon
        const module = await db.queryOne<{ id: string; status: string; name: string }>(
          `SELECT id, status, name FROM navigation_modules WHERE id = $1`,
          [id]
        );

        if (!module) {
          return reply.status(404).send({ error: 'Module not found' });
        }

        if (module.status !== 'coming_soon') {
          return reply.status(400).send({
            error: 'Module is already available',
            message: `${module.name} is already active. No waitlist needed!`,
          });
        }

        // Check if already on waitlist
        const existing = await db.queryOne<{ id: string }>(
          `SELECT id FROM module_waitlist WHERE user_id = $1 AND module_id = $2`,
          [userId, id]
        );

        if (existing) {
          // Update existing entry
          await db.query(
            `UPDATE module_waitlist
             SET interest_level = COALESCE($3, interest_level),
                 use_case = COALESCE($4, use_case),
                 notify_on_release = COALESCE($5, notify_on_release),
                 notify_on_beta = COALESCE($6, notify_on_beta)
             WHERE user_id = $1 AND module_id = $2`,
            [
              userId,
              id,
              interest_level,
              use_case,
              notify_on_release,
              notify_on_beta,
            ]
          );

          return reply.send({
            message: 'Waitlist preferences updated',
            module_id: id,
            module_name: module.name,
          });
        }

        // Add to waitlist
        await db.query(
          `INSERT INTO module_waitlist (user_id, module_id, interest_level, use_case, notify_on_release, notify_on_beta)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            id,
            interest_level || 5,
            use_case || null,
            notify_on_release !== false,
            notify_on_beta !== false,
          ]
        );

        // Get updated count
        const countResult = await db.queryOne<{ count: string }>(
          `SELECT COUNT(*) as count FROM module_waitlist WHERE module_id = $1`,
          [id]
        );

        return reply.status(201).send({
          message: `You've joined the ${module.name} waitlist!`,
          module_id: id,
          module_name: module.name,
          waitlist_position: parseInt(countResult?.count || '1'),
        });
      } catch (error) {
        log.error('Error joining waitlist:', error);
        return reply.status(500).send({ error: 'Failed to join waitlist' });
      }
    }
  );

  // ============================================
  // DELETE /modules/:id/waitlist - Leave module waitlist
  // ============================================
  app.delete(
    '/modules/:id/waitlist',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = (request as any).userId;

        // Check if on waitlist first
        const existing = await db.queryOne<{ id: string }>(
          `SELECT id FROM module_waitlist WHERE user_id = $1 AND module_id = $2`,
          [userId, id]
        );

        if (!existing) {
          return reply.status(404).send({ error: 'Not on waitlist' });
        }

        await db.query(
          `DELETE FROM module_waitlist WHERE user_id = $1 AND module_id = $2`,
          [userId, id]
        );

        return reply.send({ message: 'Removed from waitlist' });
      } catch (error) {
        log.error('Error leaving waitlist:', error);
        return reply.status(500).send({ error: 'Failed to leave waitlist' });
      }
    }
  );

  log.info('Registered modules routes');
}
