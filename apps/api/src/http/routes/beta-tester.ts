/**
 * Beta Tester Routes
 *
 * User-facing endpoints for beta testers:
 * - Journal entries for logging experiences
 * - View own progress snapshots
 * - Quick bug report with enhanced context
 */

import { FastifyInstance, FastifyReply } from 'fastify';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { authenticate } from './auth';

const log = loggers.api;

interface JournalEntryBody {
  entryType?: 'note' | 'frustration' | 'suggestion' | 'bug_encountered' | 'praise' | 'question';
  title?: string;
  content: string;
  mood?: 'happy' | 'frustrated' | 'confused' | 'excited' | 'neutral';
  tags?: string[];
  pageUrl?: string;
  attachmentUrls?: string[];
}

interface QuickBugBody {
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  pageUrl?: string;
  screenshotUrls?: string[];
}

export default async function betaTesterRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', async (request, reply: FastifyReply) => {
    await authenticate(request, reply);
  });

  /**
   * GET /beta-tester/status
   * Get current user's beta tester status and benefits
   */
  fastify.get('/status', async (request, reply) => {
    const userId = (request as any).user?.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const user = await db.queryOne<{
        is_beta_tester: boolean;
        beta_tester_since: Date;
        beta_tester_tier: string;
      }>(
        `SELECT is_beta_tester, beta_tester_since, beta_tester_tier FROM users WHERE id = $1`,
        [userId]
      );

      if (!user?.is_beta_tester) {
        return reply.send({
          isBetaTester: false,
          message: 'You are not currently a beta tester',
        });
      }

      // Get stats
      const stats = await db.queryOne<{
        snapshot_count: number;
        journal_count: number;
        feedback_count: number;
        last_snapshot: Date;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM beta_tester_progress_snapshots WHERE user_id = $1) as snapshot_count,
          (SELECT COUNT(*) FROM beta_tester_journal WHERE user_id = $1) as journal_count,
          (SELECT COUNT(*) FROM user_feedback WHERE user_id = $1) as feedback_count,
          (SELECT MAX(created_at) FROM beta_tester_progress_snapshots WHERE user_id = $1) as last_snapshot`,
        [userId]
      );

      return reply.send({
        isBetaTester: true,
        since: user.beta_tester_since,
        tier: user.beta_tester_tier,
        benefits: [
          'Priority bug report processing',
          'Daily automatic progress backups',
          'Progress restoration if issues occur',
          'Direct communication with dev team',
          'Beta tester badge on profile',
        ],
        stats: {
          snapshotCount: parseInt(String(stats?.snapshot_count || 0)),
          journalEntries: parseInt(String(stats?.journal_count || 0)),
          feedbackSubmitted: parseInt(String(stats?.feedback_count || 0)),
          lastBackup: stats?.last_snapshot,
        },
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get beta tester status');
      return reply.status(500).send({ error: 'Failed to get status' });
    }
  });

  /**
   * POST /beta-tester/journal
   * Create a new journal entry
   */
  fastify.post<{ Body: JournalEntryBody }>('/journal', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const {
      entryType = 'note',
      title,
      content,
      mood,
      tags,
      pageUrl,
      attachmentUrls,
    } = request.body;

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ error: 'Content is required' });
    }

    try {
      // Verify user is a beta tester
      const user = await db.queryOne<{ is_beta_tester: boolean }>(
        `SELECT is_beta_tester FROM users WHERE id = $1`,
        [userId]
      );

      if (!user?.is_beta_tester) {
        return reply.status(403).send({
          error: 'Beta tester status required to use journal',
        });
      }

      // Get session info from request
      const deviceInfo = {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      };

      const entry = await db.queryOne<{ id: string; created_at: Date }>(
        `INSERT INTO beta_tester_journal (
          user_id, entry_type, title, content, mood, tags,
          page_url, device_info, attachment_urls
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at`,
        [
          userId,
          entryType,
          title,
          content,
          mood,
          tags || [],
          pageUrl,
          JSON.stringify(deviceInfo),
          attachmentUrls || [],
        ]
      );

      log.info({ userId, entryId: entry?.id, entryType }, 'Beta tester journal entry created');

      return reply.status(201).send({
        success: true,
        entry: {
          id: entry?.id,
          createdAt: entry?.created_at,
        },
        message: 'Journal entry recorded. Thank you for sharing your experience!',
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to create journal entry');
      return reply.status(500).send({ error: 'Failed to create journal entry' });
    }
  });

  /**
   * GET /beta-tester/journal
   * Get user's own journal entries
   */
  fastify.get('/journal', async (request, reply) => {
    const userId = (request as any).user?.userId;

    try {
      const entries = await db.queryAll<{
        id: string;
        entry_type: string;
        title: string;
        content: string;
        mood: string;
        tags: string[];
        page_url: string;
        admin_response: string;
        admin_responded_at: Date;
        created_at: Date;
        is_starred: boolean;
      }>(
        `SELECT
          id, entry_type, title, content, mood, tags, page_url,
          admin_response, admin_responded_at, created_at, is_starred
        FROM beta_tester_journal
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
        [userId]
      );

      return reply.send({
        success: true,
        entries: entries.map((e) => ({
          id: e.id,
          entryType: e.entry_type,
          title: e.title,
          content: e.content,
          mood: e.mood,
          tags: e.tags,
          pageUrl: e.page_url,
          adminResponse: e.admin_response,
          adminRespondedAt: e.admin_responded_at,
          createdAt: e.created_at,
          isStarred: e.is_starred,
        })),
        count: entries.length,
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get journal entries');
      return reply.status(500).send({ error: 'Failed to get journal entries' });
    }
  });

  /**
   * GET /beta-tester/snapshots
   * Get user's own progress snapshots
   */
  fastify.get('/snapshots', async (request, reply) => {
    const userId = (request as any).user?.userId;

    try {
      const user = await db.queryOne<{ is_beta_tester: boolean }>(
        `SELECT is_beta_tester FROM users WHERE id = $1`,
        [userId]
      );

      if (!user?.is_beta_tester) {
        return reply.status(403).send({
          error: 'Beta tester status required to view snapshots',
        });
      }

      const snapshots = await db.queryAll<{
        id: string;
        snapshot_type: string;
        snapshot_reason: string;
        level: number;
        xp: number;
        credit_balance: number;
        strength: number;
        constitution: number;
        dexterity: number;
        power: number;
        endurance: number;
        vitality: number;
        total_workouts: number;
        achievement_count: number;
        created_at: Date;
        restored_at: Date;
      }>(
        `SELECT
          id, snapshot_type, snapshot_reason,
          level, xp, credit_balance,
          strength, constitution, dexterity, power, endurance, vitality,
          total_workouts, achievement_count,
          created_at, restored_at
        FROM beta_tester_progress_snapshots
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 30`,
        [userId]
      );

      return reply.send({
        success: true,
        snapshots: snapshots.map((s) => ({
          id: s.id,
          type: s.snapshot_type,
          reason: s.snapshot_reason,
          data: {
            level: s.level,
            xp: s.xp,
            credits: s.credit_balance,
            stats: {
              strength: s.strength,
              constitution: s.constitution,
              dexterity: s.dexterity,
              power: s.power,
              endurance: s.endurance,
              vitality: s.vitality,
            },
            totalWorkouts: s.total_workouts,
            achievementCount: s.achievement_count,
          },
          createdAt: s.created_at,
          wasRestored: !!s.restored_at,
          restoredAt: s.restored_at,
        })),
        count: snapshots.length,
        message: 'Daily automatic backups are created to protect your progress.',
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get snapshots');
      return reply.status(500).send({ error: 'Failed to get snapshots' });
    }
  });

  /**
   * POST /beta-tester/quick-bug
   * Submit a quick bug report with enhanced context capture
   */
  fastify.post<{ Body: QuickBugBody }>('/quick-bug', async (request, reply) => {
    const userId = (request as any).user?.userId;
    const {
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      pageUrl,
      screenshotUrls,
    } = request.body;

    if (!title || !description) {
      return reply.status(400).send({ error: 'Title and description are required' });
    }

    try {
      // Capture device/browser info
      const deviceInfo = {
        userAgent: request.headers['user-agent'],
        platform: request.headers['sec-ch-ua-platform'],
        mobile: request.headers['sec-ch-ua-mobile'],
      };

      // Create the feedback entry (the trigger will auto-flag it as beta tester if applicable)
      const feedback = await db.queryOne<{ id: string }>(
        `INSERT INTO user_feedback (
          user_id, type, title, description,
          steps_to_reproduce, expected_behavior, actual_behavior,
          page_url, screenshot_urls, user_agent, status
        ) VALUES ($1, 'bug_report', $2, $3, $4, $5, $6, $7, $8, $9, 'open')
        RETURNING id`,
        [
          userId,
          title,
          description,
          stepsToReproduce,
          expectedBehavior,
          actualBehavior,
          pageUrl,
          screenshotUrls || [],
          JSON.stringify(deviceInfo),
        ]
      );

      log.info({ userId, feedbackId: feedback?.id }, 'Beta tester quick bug report submitted');

      return reply.status(201).send({
        success: true,
        feedbackId: feedback?.id,
        message: 'Bug report submitted with priority! We\'ll look into this ASAP.',
        tips: [
          'Screenshots help us understand the issue faster',
          'Include steps to reproduce if possible',
          'Your report is automatically prioritized as a beta tester',
        ],
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to submit quick bug');
      return reply.status(500).send({ error: 'Failed to submit bug report' });
    }
  });

  /**
   * POST /beta-tester/request-restore
   * Request a progress restore (creates a support ticket)
   */
  fastify.post<{ Body: { reason: string; snapshotId?: string } }>(
    '/request-restore',
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      const { reason, snapshotId } = request.body;

      if (!reason || reason.trim().length === 0) {
        return reply.status(400).send({ error: 'Reason for restore request is required' });
      }

      try {
        const user = await db.queryOne<{ is_beta_tester: boolean; username: string }>(
          `SELECT is_beta_tester, username FROM users WHERE id = $1`,
          [userId]
        );

        if (!user?.is_beta_tester) {
          return reply.status(403).send({
            error: 'Beta tester status required to request restore',
          });
        }

        // Create a high-priority feedback entry for restore request
        const feedback = await db.queryOne<{ id: string }>(
          `INSERT INTO user_feedback (
            user_id, type, title, description, priority, status,
            is_beta_tester_report, beta_tester_priority
          ) VALUES (
            $1, 'bug_report',
            'Progress Restore Request',
            $2,
            'critical',
            'open',
            TRUE,
            10
          )
          RETURNING id`,
          [
            userId,
            `RESTORE REQUEST from @${user.username}\n\nReason: ${reason}\n\n${snapshotId ? `Preferred snapshot: ${snapshotId}` : 'No specific snapshot requested'}`,
          ]
        );

        log.info({ userId, feedbackId: feedback?.id }, 'Beta tester restore request submitted');

        return reply.status(201).send({
          success: true,
          feedbackId: feedback?.id,
          message: 'Restore request submitted with highest priority! An admin will process this shortly.',
        });
      } catch (error) {
        log.error({ error, userId }, 'Failed to submit restore request');
        return reply.status(500).send({ error: 'Failed to submit restore request' });
      }
    }
  );
}
