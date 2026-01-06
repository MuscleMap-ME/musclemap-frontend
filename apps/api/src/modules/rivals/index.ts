/**
 * Rivals Module
 *
 * REST API routes for the rivalry system.
 */
import type { Router, Request, Response } from 'express';
import { Router as createRouter } from 'express';
import { authMiddleware, type AuthRequest } from '../../auth';
import { rivalsService } from './service';
import {
  broadcastRivalryStatusChange,
  broadcastRivalWorkout,
} from './websocket';

export function createRivalsRouter(): Router {
  const router = createRouter();

  // All routes require authentication
  router.use(authMiddleware);

  /**
   * GET /api/rivals
   * Get all rivalries for the current user
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const status = req.query.status as string | undefined;

      const [rivals, stats] = await Promise.all([
        rivalsService.getUserRivalries(
          userId,
          status as 'pending' | 'active' | 'ended' | undefined
        ),
        rivalsService.getUserStats(userId),
      ]);

      res.json({ data: { rivals, stats } });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to get rivalries',
      });
    }
  });

  /**
   * GET /api/rivals/pending
   * Get pending rivalry requests
   */
  router.get('/pending', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const pending = await rivalsService.getPendingRequests(userId);
      res.json({ data: pending });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to get requests',
      });
    }
  });

  /**
   * GET /api/rivals/search
   * Search for potential rivals
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const query = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 20;

      if (query.length < 2) {
        return res.json({ data: [] });
      }

      const users = await rivalsService.searchPotentialRivals(
        userId,
        query,
        limit
      );
      res.json({ data: users });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Search failed',
      });
    }
  });

  /**
   * GET /api/rivals/stats
   * Get rivalry stats for current user
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const stats = await rivalsService.getUserStats(userId);
      res.json({ data: stats });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to get stats',
      });
    }
  });

  /**
   * GET /api/rivals/:id
   * Get a specific rivalry
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const rival = await rivalsService.getRivalryWithUser(req.params.id, userId);

      if (!rival) {
        return res.status(404).json({ error: 'Rivalry not found' });
      }

      res.json({ data: rival });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to get rivalry',
      });
    }
  });

  /**
   * POST /api/rivals
   * Create a new rivalry request
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const { userId: challengedId } = req.body;

      if (!challengedId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (challengedId === userId) {
        return res.status(400).json({ error: 'Cannot challenge yourself' });
      }

      const rival = await rivalsService.createRivalry(userId, challengedId);

      // Broadcast to challenged user
      broadcastRivalryStatusChange(
        rival.id,
        'rival.request',
        userId,
        challengedId,
        { challengerUsername: (req as AuthRequest).user?.username }
      );

      res.status(201).json({ data: rival });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to create rivalry',
      });
    }
  });

  /**
   * POST /api/rivals/:id/accept
   * Accept a rivalry request
   */
  router.post('/:id/accept', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const rival = await rivalsService.acceptRivalry(req.params.id, userId);

      // Broadcast to challenger
      broadcastRivalryStatusChange(
        rival.id,
        'rival.accepted',
        rival.opponent.id,
        userId,
        { acceptedByUsername: (req as AuthRequest).user?.username }
      );

      res.json({ data: rival });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to accept',
      });
    }
  });

  /**
   * POST /api/rivals/:id/decline
   * Decline a rivalry request
   */
  router.post('/:id/decline', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const rival = await rivalsService.getRivalry(req.params.id);

      if (!rival) {
        return res.status(404).json({ error: 'Rivalry not found' });
      }

      await rivalsService.declineRivalry(req.params.id, userId);

      // Broadcast to challenger
      broadcastRivalryStatusChange(
        rival.id,
        'rival.declined',
        rival.challengerId,
        rival.challengedId
      );

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to decline',
      });
    }
  });

  /**
   * POST /api/rivals/:id/end
   * End an active rivalry
   */
  router.post('/:id/end', async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const rival = await rivalsService.getRivalry(req.params.id);

      if (!rival) {
        return res.status(404).json({ error: 'Rivalry not found' });
      }

      await rivalsService.endRivalry(req.params.id, userId);

      // Broadcast to both users
      broadcastRivalryStatusChange(
        rival.id,
        'rival.ended',
        rival.challengerId,
        rival.challengedId,
        {
          challengerTU: rival.challengerTU,
          challengedTU: rival.challengedTU,
        }
      );

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to end rivalry',
      });
    }
  });

  return router;
}

// Export service and websocket functions for use by other modules
export { rivalsService } from './service';
export {
  registerRivalsWebSocket,
  broadcastRivalWorkout,
  broadcastRivalryStatusChange,
  getConnectionStats,
} from './websocket';
export * from './types';
