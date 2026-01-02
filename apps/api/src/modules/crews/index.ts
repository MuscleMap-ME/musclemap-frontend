/**
 * Crews Router
 *
 * REST API endpoints for crews and Crew Wars.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as crewsService from './service';

export function createCrewsRouter(): Router {
  const router = Router();

  // Get user's crew
  router.get('/my', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const result = crewsService.getUserCrew(userId);

      if (!result) {
        return res.json({ data: null });
      }

      const members = crewsService.getCrewMembers(result.crew.id);
      const wars = crewsService.getCrewWars(result.crew.id);
      const stats = crewsService.getCrewStats(result.crew.id);

      res.json({
        data: {
          crew: result.crew,
          membership: result.membership,
          members,
          wars,
          stats,
        },
      });
    } catch (error) {
      console.error('Failed to get user crew:', error);
      res.status(500).json({ error: 'Failed to get crew' });
    }
  });

  // Create a new crew
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { name, tag, description, color } = req.body;

      if (!name || !tag) {
        return res.status(400).json({ error: 'Name and tag are required' });
      }

      const crew = crewsService.createCrew(userId, name, tag, description, color);
      res.status(201).json({ data: crew });
    } catch (error: any) {
      console.error('Failed to create crew:', error);
      res.status(400).json({ error: error.message || 'Failed to create crew' });
    }
  });

  // Get crew by ID
  router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const crew = crewsService.getCrew(req.params.id);
      if (!crew) {
        return res.status(404).json({ error: 'Crew not found' });
      }

      const members = crewsService.getCrewMembers(crew.id);
      const stats = crewsService.getCrewStats(crew.id);

      res.json({ data: { crew, members, stats } });
    } catch (error) {
      console.error('Failed to get crew:', error);
      res.status(500).json({ error: 'Failed to get crew' });
    }
  });

  // Search crews
  router.get('/search', requireAuth, async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 20;
      const crews = crewsService.searchCrews(query, limit);
      res.json({ data: crews });
    } catch (error) {
      console.error('Failed to search crews:', error);
      res.status(500).json({ error: 'Failed to search crews' });
    }
  });

  // Get leaderboard
  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = crewsService.getCrewLeaderboard(limit);
      res.json({ data: leaderboard });
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  });

  // Invite user to crew
  router.post('/:id/invite', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { inviteeId } = req.body;

      if (!inviteeId) {
        return res.status(400).json({ error: 'inviteeId is required' });
      }

      const invite = crewsService.inviteToCrew(req.params.id, userId, inviteeId);
      res.status(201).json({ data: invite });
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      res.status(400).json({ error: error.message || 'Failed to invite user' });
    }
  });

  // Accept invite
  router.post('/invites/:id/accept', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const member = crewsService.acceptInvite(req.params.id, userId);
      res.json({ data: member });
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      res.status(400).json({ error: error.message || 'Failed to accept invite' });
    }
  });

  // Leave crew
  router.post('/leave', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      crewsService.leaveCrew(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to leave crew:', error);
      res.status(400).json({ error: error.message || 'Failed to leave crew' });
    }
  });

  // Start crew war
  router.post('/:id/war', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { defendingCrewId, durationDays } = req.body;

      // Verify user is owner/captain of the crew
      const userCrew = crewsService.getUserCrew(userId);
      if (!userCrew || userCrew.crew.id !== req.params.id) {
        return res.status(403).json({ error: 'You are not in this crew' });
      }

      if (userCrew.membership.role === 'member') {
        return res.status(403).json({ error: 'Only owners and captains can start wars' });
      }

      if (!defendingCrewId) {
        return res.status(400).json({ error: 'defendingCrewId is required' });
      }

      const war = crewsService.startCrewWar(req.params.id, defendingCrewId, durationDays || 7);
      res.status(201).json({ data: war });
    } catch (error: any) {
      console.error('Failed to start war:', error);
      res.status(400).json({ error: error.message || 'Failed to start war' });
    }
  });

  // Get crew wars
  router.get('/:id/wars', requireAuth, async (req: Request, res: Response) => {
    try {
      const wars = crewsService.getCrewWars(req.params.id);
      res.json({ data: wars });
    } catch (error) {
      console.error('Failed to get wars:', error);
      res.status(500).json({ error: 'Failed to get wars' });
    }
  });

  return router;
}

export * from './types';
export * from './service';
