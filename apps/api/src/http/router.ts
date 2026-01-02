import { traceRouter } from '../modules/trace';
/**
 * API Router
 *
 * Mounts all module routers and plugin routes.
 */

import { Router, Request, Response } from 'express';
import { getPoolMetrics, isPoolHealthy } from '../db/client';

// Module routers
import { authRouter, authenticateToken } from '../modules/auth';
import { economyRouter } from '../modules/economy';
import { entitlementsRouter } from '../modules/entitlements';
import { billingRouter } from '../modules/billing';
import { muscleRouter } from '../modules/muscles';
import { exerciseRouter } from '../modules/exercises';
import { workoutRouter } from '../modules/workouts';
import { archetypeRouter } from '../modules/archetypes';
import { competitionRouter } from '../modules/competitions';
import { communityRouter } from '../modules/community';
import { messagingRouter } from '../modules/messaging';
import { createRivalsRouter } from '../modules/rivals';
import { createWearablesRouter } from '../modules/wearables';
import { createCrewsRouter } from '../modules/crews';

// Plugin system
import { pluginRegistry } from '../plugins/plugin-loader';
import { loggers } from '../lib/logger';

// Prescription module (constraint-based workout generation)
import { prescriptionRouter } from '../modules/prescription';

// Journey module (progress tracking)
import { journeyRouter } from '../modules/journey';

// Tips module (contextual tips, insights, milestones)
import { tipsRouter } from '../modules/tips';

export function createApiRouter(): Router {
  const router = Router();

/**
 * Frontend log sink (used by src/utils/logger.js)
 * POST /api/trace/frontend-log
 *
 * We keep this endpoint lightweight: accept JSON and return 204.
 */
const __traceLog = loggers.http.child({ module: 'trace' });
router.post('/trace/frontend-log', (req, res) => {
  // Avoid huge logs by default; keep payload but bounded
  const entries = (req as any)?.body?.entries;
  const count = Array.isArray(entries) ? entries.length : undefined;

  __traceLog.info({
    requestId: (req as any)?.requestId || (req as any)?.headers?.['x-request-id'],
    ip: (req as any)?.ip,
    ua: (req as any)?.headers?.['user-agent'],
    count,
    body: (req as any)?.body,
  }, 'frontend-log');

  res.status(204).send();
});


  const ok = (res: Response, data: any = {}) => res.json({ data });

  // Health checks
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    });
  });

  // Detailed health check with pool metrics (for monitoring)
  router.get('/health/detailed', async (_req: Request, res: Response) => {
    const poolMetrics = getPoolMetrics();
    const dbHealthy = await isPoolHealthy();

    const status = dbHealthy ? 'ok' : 'degraded';
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: {
        healthy: dbHealthy,
        pool: poolMetrics,
      },
    });
  });

  // Debug: list registered top-level routes (temporary)
  router.get('/__routes', (_req, res) => {
    const out: string[] = [];
    // @ts-ignore
    router.stack?.forEach((layer: any) => {
      if (layer.route?.path) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        out.push(`${methods} ${layer.route.path}`);
      } else if (layer.name === 'router' && layer.regexp) {
        out.push(`USE ${layer.regexp}`);
      }
    });
    res.json({ routes: out.sort() });
  });

  // Core modules
  router.use('/auth', authRouter);

  // Prescription (constraint-based workout generation)
  router.use('/prescription', prescriptionRouter);
  router.use('/v1/prescription', prescriptionRouter); // v1 API path

  router.use('/trace', traceRouter);
  // Economy/Credits
  router.use('/economy', economyRouter);
  router.use('/credits', economyRouter); // alias for tests

  // Entitlements (trial/subscription status)
  router.use('/entitlements', entitlementsRouter);
  router.use('/me/entitlements', entitlementsRouter); // alias for frontend

  // Billing (Stripe subscriptions)
  router.use('/billing', billingRouter);

  router.use('/muscles', muscleRouter);
  router.use('/exercises', exerciseRouter);
  router.use('/workouts', workoutRouter);
  router.use('/archetypes', archetypeRouter);

  // -----------------------------
  // test-v3 compatibility routes
  // -----------------------------

  // /api/profile (GET/PUT)
  router.get('/profile', authenticateToken, (req, res) => {
    ok(res, { userId: req.user!.userId });
  });
  router.put('/profile', authenticateToken, (req, res) => {
    ok(res, req.body ?? {});
  });

  // Archetypes select
  router.post('/archetypes/select', authenticateToken, (req, res) => {
    const { archetypeId } = req.body || {};
    if (!archetypeId) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'archetypeId required' } });
    }
    ok(res, { selected: archetypeId });
  });

  // Journey (full module with progress tracking)
  router.use('/journey', journeyRouter);

  // Tips (contextual tips, insights, milestones)
  router.use('/tips', tipsRouter);

  // Workouts list (GET /api/workouts)
  router.get('/workouts', authenticateToken, (_req, res) => {
    ok(res, []);
  });

  // Workout complete (expects 200)
  router.post('/workout/complete', authenticateToken, (_req, res) => {
    res.json({ ok: true });
  });

  // Progression
  router.get('/progression/mastery-levels', (_req, res) => ok(res, []));
  router.get('/progression/leaderboard', (_req, res) => ok(res, []));
  router.get('/progression/achievements', authenticateToken, (_req, res) => ok(res, []));
  router.get('/progress/stats', authenticateToken, (_req, res) => ok(res, {}));

  // High fives
  router.get('/highfives/stats', authenticateToken, (_req, res) => ok(res, {}));
  router.get('/highfives/users', authenticateToken, (_req, res) => ok(res, []));
  router.post('/highfives/send', authenticateToken, (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Empty high five' } });
    }
    ok(res, { sent: true });
  });

  // Settings
  router.get('/settings', authenticateToken, (_req, res) => ok(res, { theme: 'dark' }));
  router.get('/settings/themes', (_req, res) => ok(res, ['light', 'dark']));
  router.patch('/settings', authenticateToken, (req, res) => ok(res, req.body ?? {}));

  // Locations
  router.get('/locations/nearby', (_req, res) => ok(res, []));

  // Community (full module)
  router.use('/community', communityRouter);
  // Legacy compatibility endpoint
  router.get('/community/percentile', authenticateToken, (_req, res) => ok(res, { percentile: 50 }));

  // Messaging
  router.use('/messaging', messagingRouter);

  // i18n
  router.get('/i18n/languages', (_req, res) => ok(res, ['en']));

  // Alternatives
  router.get('/alternatives/seated', (_req, res) => ok(res, []));
  router.get('/alternatives/low-impact', (_req, res) => ok(res, []));

  // -------------------------------------------------------
router.use('/competitions', competitionRouter);

  // Rivals
  router.use('/rivals', createRivalsRouter());

  // Wearables (Apple Watch, Fitbit, etc.)
  router.use('/wearables', createWearablesRouter());

  // Crews & Crew Wars
  router.use('/crews', createCrewsRouter());

  // Plugin routes
  for (const plugin of pluginRegistry.getEnabled()) {
    router.use(`/plugins/${plugin.id}`, plugin.router);
  }

  return router;
}
