/**
 * Wearables Router
 *
 * REST API endpoints for wearable device integrations.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as wearablesService from './service';
import type { WearableProvider, HealthSyncPayload } from './types';

export function createWearablesRouter(): Router {
  const router = Router();

  // Get wearable connections and health summary
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const summary = wearablesService.getHealthSummary(userId);
      res.json({ data: summary });
    } catch (error) {
      console.error('Failed to get health summary:', error);
      res.status(500).json({ error: 'Failed to get health summary' });
    }
  });

  // Connect a wearable provider (for OAuth-based providers)
  router.post('/connect', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { provider, providerUserId, accessToken, refreshToken, tokenExpiresAt } = req.body;

      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }

      const validProviders: WearableProvider[] = ['apple_health', 'fitbit', 'garmin', 'google_fit'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }

      const connection = wearablesService.upsertConnection(userId, provider, {
        providerUserId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      });

      res.json({ data: connection });
    } catch (error) {
      console.error('Failed to connect wearable:', error);
      res.status(500).json({ error: 'Failed to connect wearable' });
    }
  });

  // Disconnect a wearable provider
  router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({ error: 'Provider is required' });
      }

      wearablesService.disconnectProvider(userId, provider);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to disconnect wearable:', error);
      res.status(500).json({ error: 'Failed to disconnect wearable' });
    }
  });

  // Sync health data from a wearable
  router.post('/sync', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { provider, data } = req.body as { provider: WearableProvider; data: HealthSyncPayload };

      if (!provider || !data) {
        return res.status(400).json({ error: 'Provider and data are required' });
      }

      const result = wearablesService.syncHealthData(userId, provider, data);
      res.json({ data: result });
    } catch (error) {
      console.error('Failed to sync health data:', error);
      res.status(500).json({ error: 'Failed to sync health data' });
    }
  });

  // Get recent workouts from wearables
  router.get('/workouts', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const workouts = wearablesService.getRecentWearableWorkouts(userId, limit);
      res.json({ data: { workouts } });
    } catch (error) {
      console.error('Failed to get wearable workouts:', error);
      res.status(500).json({ error: 'Failed to get wearable workouts' });
    }
  });

  return router;
}

export * from './types';
export * from './service';
