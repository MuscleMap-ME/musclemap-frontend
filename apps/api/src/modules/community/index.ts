/**
 * Community Module
 *
 * Provides community dashboard features:
 * - Real-time activity feed
 * - Presence/map data
 * - Community statistics
 * - Privacy settings
 * - Monitoring endpoints (role-gated)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../db/client';
import {
  authenticateToken,
  optionalAuth,
  requireRole,
} from '../auth';
import { asyncHandler } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { getPrivacySettings, updatePrivacySettings } from './privacy.service';
import { emitEvent, emitHeartbeat } from './events';
import {
  getActiveNowStats,
  getTopExercisesNow,
  getPresenceByGeoBucket,
} from './presence.service';
import {
  getOverviewStats,
  getArchetypeDistribution,
  getExerciseRanking,
  getFunnelStats,
  getCreditDistribution,
  getGeographicDistribution,
  getCommunitySummary,
} from './stats.service';
import { getConnectionStats } from './websocket';
import type { PublicEvent } from './types';

const log = loggers.core;

export const communityRouter = Router();

// ---------------------
// Public Endpoints
// ---------------------

/**
 * GET /community/feed
 * Get paginated activity feed (public events only)
 */
communityRouter.get(
  '/feed',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    let query = `
      SELECT id, event_type, payload, geo_bucket, created_at
      FROM activity_events
      WHERE visibility_scope IN ('public_anon', 'public_profile')
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (before) {
      query += ` AND created_at < $${paramIndex++}`;
      params.push(before);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const events = await db.queryAll<{
      id: string;
      event_type: string;
      payload: string;
      geo_bucket: string | null;
      created_at: string;
    }>(query, params);

    const publicEvents: PublicEvent[] = events.map((row) => ({
      id: row.id,
      ts: row.created_at,
      type: row.event_type as PublicEvent['type'],
      geoBucket: row.geo_bucket || undefined,
      payload: JSON.parse(row.payload || '{}'),
    }));

    res.json({
      data: {
        events: publicEvents,
        nextCursor: events.length === limit ? events[events.length - 1]?.created_at : null,
      },
    });
  })
);

/**
 * GET /community/presence
 * Get aggregated presence data for map view
 */
communityRouter.get(
  '/presence',
  asyncHandler(async (_req: Request, res: Response) => {
    const activeNow = await getActiveNowStats();
    const byGeoBucket = await getPresenceByGeoBucket();

    res.json({
      data: {
        total: activeNow.total,
        byGeoBucket,
        byStage: Object.entries(activeNow.byStage).map(([stageId, count]) => ({
          stageId,
          count,
        })),
      },
    });
  })
);

/**
 * GET /community/stats/summary
 * Get community statistics summary
 */
communityRouter.get(
  '/stats/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const window = (req.query.window as '1h' | '24h' | '7d') || '24h';
    const summary = await getCommunitySummary();
    const overview = await getOverviewStats(window);

    res.json({
      data: {
        ...summary,
        overview,
      },
    });
  })
);

/**
 * GET /community/stats/archetypes
 * Get archetype distribution
 */
communityRouter.get(
  '/stats/archetypes',
  asyncHandler(async (_req: Request, res: Response) => {
    const distribution = await getArchetypeDistribution();
    res.json({ data: distribution });
  })
);

/**
 * GET /community/stats/exercises
 * Get popular exercises ranking
 */
communityRouter.get(
  '/stats/exercises',
  asyncHandler(async (req: Request, res: Response) => {
    const window = (req.query.window as '7d' | '30d') || '7d';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const ranking = await getExerciseRanking(limit, window);
    res.json({ data: ranking });
  })
);

/**
 * GET /community/stats/funnel
 * Get user journey funnel
 */
communityRouter.get(
  '/stats/funnel',
  asyncHandler(async (_req: Request, res: Response) => {
    const funnel = await getFunnelStats();
    res.json({ data: funnel });
  })
);

/**
 * GET /community/stats/credits
 * Get credit distribution
 */
communityRouter.get(
  '/stats/credits',
  asyncHandler(async (_req: Request, res: Response) => {
    const distribution = await getCreditDistribution();
    res.json({ data: distribution });
  })
);

/**
 * GET /community/stats/geographic
 * Get geographic distribution
 */
communityRouter.get(
  '/stats/geographic',
  asyncHandler(async (_req: Request, res: Response) => {
    const geo = await getGeographicDistribution();
    res.json({ data: geo });
  })
);

/**
 * GET /community/now
 * Get "now" stats (top exercises, active users in last 15 min)
 */
communityRouter.get(
  '/now',
  asyncHandler(async (_req: Request, res: Response) => {
    const [activeNow, topExercises] = await Promise.all([
      getActiveNowStats(),
      getTopExercisesNow(15, 10),
    ]);

    res.json({
      data: {
        activeUsers: activeNow.total,
        topExercises,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

// ---------------------
// Authenticated Endpoints
// ---------------------

const privacyUpdateSchema = z.object({
  shareLocation: z.boolean().optional(),
  showInFeed: z.boolean().optional(),
  showOnMap: z.boolean().optional(),
  showWorkoutDetails: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  publicDisplayName: z.string().max(50).optional(),
});

/**
 * GET /community/privacy
 * Get current user's privacy settings
 */
communityRouter.get(
  '/privacy',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await getPrivacySettings(req.user!.userId);
    res.json({ data: settings });
  })
);

/**
 * PATCH /community/privacy
 * Update current user's privacy settings
 */
communityRouter.patch(
  '/privacy',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const updates = privacyUpdateSchema.parse(req.body);
    const settings = await updatePrivacySettings(req.user!.userId, updates);

    // Emit privacy change event if location sharing toggled
    if (updates.shareLocation !== undefined) {
      await emitEvent(req.user!.userId, 'privacy.location_toggled', {
        enabled: updates.shareLocation,
      });
    }

    res.json({ data: settings });
  })
);

const locationUpdateSchema = z.object({
  geoBucket: z.string().min(1).max(100),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  timezone: z.string().optional(),
});

/**
 * POST /community/location
 * Update user's location (coarse only)
 */
communityRouter.post(
  '/location',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const data = locationUpdateSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if user has location sharing enabled
    const privacy = await getPrivacySettings(userId);
    if (!privacy.shareLocation) {
      res.status(400).json({
        error: 'Location sharing disabled',
        message: 'Enable location sharing in privacy settings first',
      });
      return;
    }

    await db.query(`
      INSERT INTO user_locations (user_id, geo_bucket, city, region, country, country_code, timezone, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT(user_id) DO UPDATE SET
        geo_bucket = EXCLUDED.geo_bucket,
        city = EXCLUDED.city,
        region = EXCLUDED.region,
        country = EXCLUDED.country,
        country_code = EXCLUDED.country_code,
        timezone = EXCLUDED.timezone,
        updated_at = EXCLUDED.updated_at
    `, [
      userId,
      data.geoBucket,
      data.city || null,
      data.region || null,
      data.country || null,
      data.countryCode || null,
      data.timezone || null
    ]);

    res.json({ data: { updated: true } });
  })
);

/**
 * POST /community/heartbeat
 * Send a heartbeat to update presence
 */
communityRouter.post(
  '/heartbeat',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get user's location for presence
    const location = await db.queryOne<{ geo_bucket: string }>(
      'SELECT geo_bucket FROM user_locations WHERE user_id = $1',
      [userId]
    );

    await emitHeartbeat(userId, {
      geoBucket: location?.geo_bucket,
    });

    res.json({ data: { ok: true } });
  })
);

// ---------------------
// Monitoring Endpoints (Role-Gated)
// ---------------------

/**
 * GET /community/monitor/feed
 * Get full activity feed (including non-public events) - moderator+
 */
communityRouter.get(
  '/monitor/feed',
  authenticateToken,
  requireRole('moderator'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const before = req.query.before as string | undefined;

    let query = `
      SELECT id, user_id, event_type, payload, geo_bucket, visibility_scope, created_at
      FROM activity_events
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (before) {
      query += ` WHERE created_at < $${paramIndex++}`;
      params.push(before);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const events = await db.queryAll<any>(query, params);

    res.json({
      data: {
        events,
        nextCursor: events.length === limit ? events[events.length - 1]?.created_at : null,
      },
    });
  })
);

/**
 * GET /community/monitor/metrics
 * Get detailed monitoring metrics - moderator+
 */
communityRouter.get(
  '/monitor/metrics',
  authenticateToken,
  requireRole('moderator'),
  asyncHandler(async (req: Request, res: Response) => {
    const window = (req.query.window as '1h' | '24h' | '7d') || '24h';

    const [overview, connections, activeNow] = await Promise.all([
      getOverviewStats(window),
      getConnectionStats(),
      getActiveNowStats(),
    ]);

    // Event counts by type
    const windowMap: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
    };
    const interval = windowMap[window];

    const eventCounts = await db.queryAll<{ event_type: string; count: number }>(`
      SELECT event_type, COUNT(*) as count
      FROM activity_events
      WHERE created_at > NOW() - INTERVAL '${interval}'
      GROUP BY event_type
      ORDER BY count DESC
    `);

    res.json({
      data: {
        window,
        overview,
        connections,
        activeNow,
        eventCounts,
        generatedAt: new Date().toISOString(),
      },
    });
  })
);

/**
 * GET /community/monitor/user/:userId
 * Get activity for a specific user - moderator+
 */
communityRouter.get(
  '/monitor/user/:userId',
  authenticateToken,
  requireRole('moderator'),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const events = await db.queryAll<any>(`
      SELECT id, event_type, payload, geo_bucket, visibility_scope, created_at
      FROM activity_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    const user = await db.queryOne<any>(
      'SELECT id, username, display_name, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    const privacy = await getPrivacySettings(userId);

    res.json({
      data: {
        user,
        privacy,
        events,
      },
    });
  })
);

// Export services for use in other modules
export { emitEvent, emitHeartbeat } from './events';
export { getPrivacySettings, updatePrivacySettings } from './privacy.service';
export type * from './types';
