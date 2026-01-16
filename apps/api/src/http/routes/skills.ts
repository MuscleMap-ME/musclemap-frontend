/**
 * Skills Routes
 *
 * Endpoints for gymnastics/calisthenics skill progression:
 * - GET /skills/trees - List all skill trees
 * - GET /skills/trees/:treeId - Get a skill tree with nodes
 * - GET /skills/trees/:treeId/progress - Get user progress for a tree
 * - GET /skills/nodes/:nodeId - Get a specific skill node
 * - GET /skills/nodes/:nodeId/leaderboard - Get skill leaderboard
 * - GET /skills/progress - Get user's overall skill summary
 * - POST /skills/practice - Log a practice session
 * - POST /skills/achieve - Mark a skill as achieved
 * - GET /skills/history - Get practice history
 * - PUT /skills/nodes/:nodeId/notes - Update notes for a skill
 */

import { FastifyInstance } from 'fastify';
import { skillService } from '../../modules/skills';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function registerSkillsRoutes(app: FastifyInstance): Promise<void> {
  // Get all skill trees
  app.get('/skills/trees', async (_request, reply) => {
    try {
      const trees = await skillService.getSkillTrees();
      return { trees };
    } catch (err) {
      log.error({ err }, 'Error fetching skill trees');
      return reply.status(500).send({ error: 'Failed to fetch skill trees' });
    }
  });

  // Get a specific skill tree with nodes
  app.get<{ Params: { treeId: string } }>(
    '/skills/trees/:treeId',
    async (request, reply) => {
      try {
        const { treeId } = request.params;
        const tree = await skillService.getSkillTree(treeId);

        if (!tree) {
          return reply.status(404).send({ error: 'Skill tree not found' });
        }

        return { tree };
      } catch (err) {
        log.error({ err }, 'Error fetching skill tree');
        return reply.status(500).send({ error: 'Failed to fetch skill tree' });
      }
    }
  );

  // Get user progress for a skill tree (requires auth)
  app.get<{ Params: { treeId: string } }>(
    '/skills/trees/:treeId/progress',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { treeId } = request.params;
        const userId = request.user!.userId;

        const progress = await skillService.getUserTreeProgress(userId, treeId);

        if (progress.length === 0) {
          // Check if tree exists
          const tree = await skillService.getSkillTree(treeId);
          if (!tree) {
            return reply.status(404).send({ error: 'Skill tree not found' });
          }
        }

        return { nodes: progress };
      } catch (err) {
        log.error({ err }, 'Error fetching skill tree progress');
        return reply.status(500).send({ error: 'Failed to fetch skill tree progress' });
      }
    }
  );

  // Get a specific skill node
  app.get<{ Params: { nodeId: string } }>(
    '/skills/nodes/:nodeId',
    async (request, reply) => {
      try {
        const { nodeId } = request.params;
        const node = await skillService.getSkillNode(nodeId);

        if (!node) {
          return reply.status(404).send({ error: 'Skill node not found' });
        }

        return { node };
      } catch (err) {
        log.error({ err }, 'Error fetching skill node');
        return reply.status(500).send({ error: 'Failed to fetch skill node' });
      }
    }
  );

  // Get leaderboard for a skill
  app.get<{ Params: { nodeId: string }; Querystring: { limit?: string } }>(
    '/skills/nodes/:nodeId/leaderboard',
    async (request, reply) => {
      try {
        const { nodeId } = request.params;
        const limit = parseInt(request.query.limit || '10');

        const leaderboard = await skillService.getSkillLeaderboard(nodeId, { limit });
        return { leaderboard };
      } catch (err) {
        log.error({ err }, 'Error fetching skill leaderboard');
        return reply.status(500).send({ error: 'Failed to fetch skill leaderboard' });
      }
    }
  );

  // Get user's overall skill summary (requires auth)
  app.get(
    '/skills/progress',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const summary = await skillService.getUserSkillSummary(userId);
        return summary;
      } catch (err) {
        log.error({ err }, 'Error fetching skill summary');
        return reply.status(500).send({ error: 'Failed to fetch skill summary' });
      }
    }
  );

  // Log a practice session (requires auth)
  app.post<{ Body: { skillNodeId: string; durationMinutes: number; valueAchieved?: number; notes?: string } }>(
    '/skills/practice',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const { skillNodeId, durationMinutes, valueAchieved, notes } = request.body;

        if (!skillNodeId || !durationMinutes) {
          return reply.status(400).send({ error: 'skillNodeId and durationMinutes are required' });
        }

        const practiceLog = await skillService.logPractice({
          userId,
          skillNodeId,
          durationMinutes,
          valueAchieved,
          notes,
        });

        return { practiceLog };
      } catch (err) {
        log.error({ err }, 'Error logging practice');
        return reply.status(500).send({ error: 'Failed to log practice' });
      }
    }
  );

  // Mark a skill as achieved (requires auth)
  app.post<{ Body: { skillNodeId: string; verificationVideoUrl?: string } }>(
    '/skills/achieve',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const { skillNodeId, verificationVideoUrl } = request.body;

        if (!skillNodeId) {
          return reply.status(400).send({ error: 'skillNodeId is required' });
        }

        const result = await skillService.achieveSkill({
          userId,
          skillNodeId,
          verificationVideoUrl,
        });

        if (!result.success) {
          return reply.status(400).send({ error: result.error });
        }

        return result;
      } catch (err) {
        log.error({ err }, 'Error achieving skill');
        return reply.status(500).send({ error: 'Failed to achieve skill' });
      }
    }
  );

  // Get practice history (requires auth)
  app.get<{ Querystring: { limit?: string; offset?: string; skillNodeId?: string } }>(
    '/skills/history',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const limit = parseInt(request.query.limit || '20');
        const offset = parseInt(request.query.offset || '0');
        const skillNodeId = request.query.skillNodeId;

        const history = await skillService.getPracticeHistory(userId, {
          limit,
          offset,
          skillNodeId,
        });

        return history;
      } catch (err) {
        log.error({ err }, 'Error fetching practice history');
        return reply.status(500).send({ error: 'Failed to fetch practice history' });
      }
    }
  );

  // Update notes for a skill (requires auth)
  app.put<{ Params: { nodeId: string }; Body: { notes: string } }>(
    '/skills/nodes/:nodeId/notes',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const { nodeId } = request.params;
        const { notes } = request.body;

        await skillService.updateNotes(userId, nodeId, notes);
        return { success: true };
      } catch (err) {
        log.error({ err }, 'Error updating notes');
        return reply.status(500).send({ error: 'Failed to update notes' });
      }
    }
  );
}
