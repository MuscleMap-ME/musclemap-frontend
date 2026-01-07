/**
 * Content Reports Routes
 *
 * Endpoints for reporting and moderation
 */

import { FastifyPluginAsync } from 'fastify';
import {
  contentReportsService,
  ContentType,
  ReportReason,
  ReportStatus,
  ModerationAction,
} from '../../modules/moderation/content-reports';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'content-reports-routes' });

const contentReportsRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ===========================================
  // REPORTING
  // ===========================================

  fastify.post<{
    Body: {
      contentType: ContentType;
      contentId: string;
      reportedUserId: string;
      communityId?: number;
      reason: ReportReason;
      description?: string;
    };
  }>('/reports', async (request, reply) => {
    const reporterId = request.user!.userId;

    const report = await contentReportsService.submitReport(reporterId, request.body);
    return { success: true, data: report };
  });

  fastify.get('/reports/my', async (request, reply) => {
    const userId = request.user!.userId;
    const reports = await contentReportsService.getUserReports(userId, 'reporter');
    return { success: true, data: reports };
  });

  // ===========================================
  // MODERATION (Admin/Mod only)
  // ===========================================

  fastify.get('/reports', async (request, reply) => {
    // TODO: Add admin/mod check
    const { communityId, status, reason, limit = '20', offset = '0' } = request.query as any;

    const result = await contentReportsService.getPendingReports({
      communityId: communityId ? parseInt(communityId) : undefined,
      status: status ? status.split(',') : undefined,
      reason,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return { success: true, data: result };
  });

  fastify.get<{ Params: { reportId: string } }>('/reports/:reportId', async (request, reply) => {
    const { reportId } = request.params;

    const report = await contentReportsService.getReport(reportId);

    if (!report) {
      return reply.status(404).send({ success: false, error: 'Report not found' });
    }

    return { success: true, data: report };
  });

  fastify.post<{ Params: { reportId: string } }>('/reports/:reportId/assign', async (request, reply) => {
    const { reportId } = request.params;
    const moderatorId = request.user!.userId;

    await contentReportsService.assignReport(reportId, moderatorId);
    return { success: true };
  });

  fastify.post<{
    Params: { reportId: string };
    Body: {
      status: 'resolved' | 'dismissed';
      resolution: string;
      actionTaken: ModerationAction;
    };
  }>('/reports/:reportId/resolve', async (request, reply) => {
    const { reportId } = request.params;
    const moderatorId = request.user!.userId;

    await contentReportsService.resolveReport(reportId, moderatorId, request.body);
    return { success: true };
  });

  // ===========================================
  // USER MODERATION
  // ===========================================

  fastify.get<{ Params: { userId: string } }>('/users/:userId/moderation-history', async (request, reply) => {
    const { userId } = request.params;

    const history = await contentReportsService.getUserModerationHistory(userId);
    return { success: true, data: history };
  });

  fastify.get<{ Params: { userId: string } }>('/users/:userId/moderation-status', async (request, reply) => {
    const { userId } = request.params;

    const activeModeration = await contentReportsService.getActiveModeration(userId);
    return { success: true, data: activeModeration };
  });

  fastify.post<{
    Params: { userId: string };
    Body: {
      action: ModerationAction;
      reason: string;
      durationHours?: number;
      notes?: string;
    };
  }>('/users/:userId/moderate', async (request, reply) => {
    const { userId } = request.params;
    const moderatorId = request.user!.userId;

    const history = await contentReportsService.applyModerationAction(userId, moderatorId, request.body);
    return { success: true, data: history };
  });

  // ===========================================
  // STATS
  // ===========================================

  fastify.get('/reports/stats', async (request, reply) => {
    const { communityId } = request.query as any;

    const stats = await contentReportsService.getStats(communityId ? parseInt(communityId) : undefined);
    return { success: true, data: stats };
  });

  log.info('Content reports routes registered');
};

export default contentReportsRoutes;
