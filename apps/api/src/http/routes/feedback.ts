/**
 * Feedback Routes (Fastify)
 *
 * Routes for user feedback system:
 * - Bug reports
 * - Feature requests
 * - Questions/support
 * - General feedback
 * - FAQ browsing
 * - Screenshot uploads for bug reports
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { SlackNotifications } from '../../modules/notifications/slack.service';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

// Upload configuration
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/var/www/musclemap.me/uploads';
const FEEDBACK_UPLOADS_DIR = 'feedback';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const log = loggers.http;

// Types
type FeedbackType = 'bug_report' | 'feature_request' | 'question' | 'general';
type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

interface UserFeedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  user_agent: string | null;
  screen_size: string | null;
  app_version: string | null;
  platform: string | null;
  category: string | null;
  attachments: string[];
  metadata: Record<string, unknown>;
  upvotes: number;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
}

interface FeedbackResponse {
  id: string;
  feedback_id: string;
  responder_id: string | null;
  responder_type: 'system' | 'admin' | 'user';
  message: string;
  is_internal: boolean;
  created_at: Date;
}

interface FAQEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  display_order: number;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

// Validation schemas
const createFeedbackSchema = z.object({
  type: z.enum(['bug_report', 'feature_request', 'question', 'general']),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  stepsToReproduce: z.string().max(2000).optional(),
  expectedBehavior: z.string().max(1000).optional(),
  actualBehavior: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  attachments: z.array(z.string().url()).max(5).optional(),
  metadata: z.record(z.unknown()).optional(),
  // Auto-captured device info
  userAgent: z.string().max(500).optional(),
  screenSize: z.string().max(50).optional(),
  appVersion: z.string().max(20).optional(),
  platform: z.string().max(50).optional(),
});

const addResponseSchema = z.object({
  message: z.string().min(1).max(2000),
});

const faqHelpfulSchema = z.object({
  helpful: z.boolean(),
});

export async function registerFeedbackRoutes(app: FastifyInstance) {
  // ============================================
  // SCREENSHOT UPLOADS
  // ============================================

  // Ensure upload directory exists
  const uploadDir = path.join(UPLOAD_BASE_DIR, FEEDBACK_UPLOADS_DIR);
  await fs.mkdir(uploadDir, { recursive: true }).catch(() => {
    log.warn('Could not create upload directory, uploads may fail');
  });

  // Upload screenshot for bug report
  app.post('/feedback/upload', { preHandler: authenticate }, async (request, reply) => {
    try {
      // Get the file from multipart
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate mime type
      if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
        });
      }

      // Generate unique filename
      const fileExt = data.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : data.mimetype.split('/')[1];
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const filename = `${Date.now()}-${uniqueId}.${fileExt}`;
      const filepath = path.join(uploadDir, filename);

      // Stream file to disk with size limit
      let bytesWritten = 0;
      const writeStream = createWriteStream(filepath);

      const fileStream = data.file;

      // Check size as we stream
      fileStream.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_FILE_SIZE) {
          fileStream.destroy(new Error('File too large'));
          writeStream.destroy();
          // Clean up partial file
          fs.unlink(filepath).catch(() => {});
        }
      });

      try {
        await pipeline(fileStream, writeStream);
      } catch (err: unknown) {
        // Clean up on error
        await fs.unlink(filepath).catch(() => {});
        if ((err as Error).message === 'File too large') {
          return reply.status(400).send({ error: 'File too large. Maximum 5MB.' });
        }
        throw err;
      }

      // Generate public URL
      const publicUrl = `/uploads/${FEEDBACK_UPLOADS_DIR}/${filename}`;

      log.info({ userId: request.user!.userId, filename, size: bytesWritten }, 'Feedback screenshot uploaded');

      return reply.send({
        url: publicUrl,
        filename,
        size: bytesWritten,
      });
    } catch (error) {
      log.error({ error }, 'Failed to upload feedback screenshot');
      return reply.status(500).send({ error: 'Failed to upload file' });
    }
  });

  // ============================================
  // SUBMIT FEEDBACK
  // ============================================

  // Create new feedback
  app.post('/feedback', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createFeedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const {
      type,
      title,
      description,
      priority,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      category,
      attachments,
      metadata,
      userAgent,
      screenSize,
      appVersion,
      platform,
    } = parsed.data;

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_feedback (
        user_id, type, title, description, priority,
        steps_to_reproduce, expected_behavior, actual_behavior,
        category, attachments, metadata,
        user_agent, screen_size, app_version, platform
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        request.user!.userId,
        type,
        title,
        description,
        priority,
        stepsToReproduce || null,
        expectedBehavior || null,
        actualBehavior || null,
        category || null,
        JSON.stringify(attachments || []),
        JSON.stringify(metadata || {}),
        userAgent || null,
        screenSize || null,
        appVersion || null,
        platform || null,
      ]
    );

    // Add automatic acknowledgment response
    await db.query(
      `INSERT INTO feedback_responses (feedback_id, responder_type, message)
       VALUES ($1, 'system', $2)`,
      [
        result!.id,
        getAcknowledgmentMessage(type),
      ]
    );

    log.info({ feedbackId: result!.id, type, userId: request.user!.userId }, 'Feedback submitted');

    // Send Slack notification for feedback (async, don't wait)
    if (type === 'bug_report') {
      SlackNotifications.bugReport({
        id: result!.id,
        title,
        description: description || '',
        severity: priority as 'low' | 'medium' | 'high' | 'critical',
        reporter: (request as any).user?.username,
      }).catch(() => {});
    } else {
      SlackNotifications.feedback({
        id: result!.id,
        type: type === 'feature_request' ? 'feature_request' : type === 'question' ? 'question' : 'feedback',
        title,
        message: description || '',
        user: (request as any).user?.username,
      }).catch(() => {});
    }

    return reply.status(201).send({
      data: {
        id: result!.id,
        message: 'Thank you for your feedback! We\'ll review it shortly.',
      },
    });
  });

  // ============================================
  // GET USER'S FEEDBACK
  // ============================================

  // List user's own feedback
  app.get('/feedback', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as {
      type?: string;
      status?: string;
      limit?: string;
      cursor?: string;
    };

    const limit = Math.min(parseInt(query.limit || '20'), 50);

    let sql = `
      SELECT * FROM user_feedback
      WHERE user_id = $1
    `;
    const params: unknown[] = [request.user!.userId];
    let paramIndex = 2;

    if (query.type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(query.type);
    }

    if (query.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(query.status);
    }

    // Keyset pagination
    if (query.cursor) {
      const [cursorDate, cursorId] = query.cursor.split('_');
      sql += ` AND (created_at, id) < ($${paramIndex++}, $${paramIndex++})`;
      params.push(new Date(cursorDate), cursorId);
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
    params.push(limit + 1);

    const result = await db.query<UserFeedback>(sql, params);
    const feedbacks = result.rows;
    const hasMore = feedbacks.length > limit;
    const items = hasMore ? feedbacks.slice(0, -1) : feedbacks;

    return reply.send({
      data: items.map(formatFeedback),
      meta: {
        hasMore,
        nextCursor: hasMore && items.length > 0
          ? `${items[items.length - 1].created_at.toISOString()}_${items[items.length - 1].id}`
          : null,
      },
    });
  });

  // Get single feedback with responses
  app.get('/feedback/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const feedback = await db.queryOne<UserFeedback>(
      `SELECT * FROM user_feedback WHERE id = $1 AND user_id = $2`,
      [id, request.user!.userId]
    );

    if (!feedback) {
      return reply.status(404).send({ error: 'Feedback not found' });
    }

    // Get responses (exclude internal notes)
    const responsesResult = await db.query<FeedbackResponse>(
      `SELECT * FROM feedback_responses
       WHERE feedback_id = $1 AND is_internal = FALSE
       ORDER BY created_at ASC`,
      [id]
    );

    return reply.send({
      data: {
        ...formatFeedback(feedback),
        responses: responsesResult.rows.map(formatResponse),
      },
    });
  });

  // ============================================
  // USER RESPONSES
  // ============================================

  // Add response to own feedback (follow-up)
  app.post('/feedback/:id/respond', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = addResponseSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    // Verify ownership
    const feedback = await db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM user_feedback WHERE id = $1 AND user_id = $2`,
      [id, request.user!.userId]
    );

    if (!feedback) {
      return reply.status(404).send({ error: 'Feedback not found' });
    }

    if (['closed', 'wont_fix'].includes(feedback.status)) {
      return reply.status(400).send({ error: 'Cannot respond to closed feedback' });
    }

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO feedback_responses (feedback_id, responder_id, responder_type, message)
       VALUES ($1, $2, 'user', $3)
       RETURNING id`,
      [id, request.user!.userId, parsed.data.message]
    );

    // Reopen if it was resolved
    if (feedback.status === 'resolved') {
      await db.query(
        `UPDATE user_feedback SET status = 'open', updated_at = NOW() WHERE id = $1`,
        [id]
      );
    }

    return reply.status(201).send({
      data: { id: result!.id, message: 'Response added' },
    });
  });

  // ============================================
  // FEATURE REQUEST VOTING
  // ============================================

  // Get popular feature requests
  app.get('/feedback/features/popular', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '10'), 50);

    const featuresResult = await db.query<UserFeedback & { user_voted: boolean }>(
      `SELECT f.*,
        EXISTS(SELECT 1 FROM feedback_upvotes u WHERE u.feedback_id = f.id AND u.user_id = $1) as user_voted
       FROM user_feedback f
       WHERE f.type = 'feature_request' AND f.status NOT IN ('closed', 'wont_fix')
       ORDER BY f.upvotes DESC, f.created_at DESC
       LIMIT $2`,
      [request.user?.userId || '', limit]
    );

    return reply.send({
      data: featuresResult.rows.map(f => ({
        ...formatFeedback(f),
        userVoted: f.user_voted,
      })),
    });
  });

  // Upvote a feature request
  app.post('/feedback/:id/upvote', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify it's a feature request
    const feedback = await db.queryOne<{ type: string }>(
      `SELECT type FROM user_feedback WHERE id = $1`,
      [id]
    );

    if (!feedback) {
      return reply.status(404).send({ error: 'Feedback not found' });
    }

    if (feedback.type !== 'feature_request') {
      return reply.status(400).send({ error: 'Can only upvote feature requests' });
    }

    try {
      await db.query(
        `INSERT INTO feedback_upvotes (feedback_id, user_id) VALUES ($1, $2)`,
        [id, request.user!.userId]
      );

      return reply.send({ data: { upvoted: true } });
    } catch (err: unknown) {
      // Check for unique constraint violation (already upvoted)
      if ((err as { code?: string }).code === '23505') {
        return reply.status(400).send({ error: 'Already upvoted' });
      }
      throw err;
    }
  });

  // Remove upvote
  app.delete('/feedback/:id/upvote', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db.query(
      `DELETE FROM feedback_upvotes WHERE feedback_id = $1 AND user_id = $2`,
      [id, request.user!.userId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'Upvote not found' });
    }

    return reply.send({ data: { upvoted: false } });
  });

  // ============================================
  // FAQ
  // ============================================

  // Get all FAQ entries (grouped by category)
  app.get('/faq', async (request, reply) => {
    const query = request.query as { category?: string; search?: string };

    let sql = `
      SELECT * FROM faq_entries
      WHERE is_published = TRUE
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(query.category);
    }

    if (query.search) {
      sql += ` AND (
        question ILIKE $${paramIndex} OR
        answer ILIKE $${paramIndex} OR
        $${paramIndex + 1} = ANY(keywords)
      )`;
      params.push(`%${query.search}%`, query.search.toLowerCase());
      paramIndex += 2;
    }

    sql += ` ORDER BY category, display_order ASC`;

    const entriesResult = await db.query<FAQEntry>(sql, params);

    // Group by category
    const grouped = entriesResult.rows.reduce((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = [];
      }
      acc[entry.category].push(formatFAQ(entry));
      return acc;
    }, {} as Record<string, ReturnType<typeof formatFAQ>[]>);

    return reply.send({
      data: grouped,
      categories: Object.keys(grouped),
    });
  });

  // Get FAQ categories
  app.get('/faq/categories', async (request, reply) => {
    const categoriesResult = await db.query<{ category: string; count: string }>(
      `SELECT category, COUNT(*) as count
       FROM faq_entries
       WHERE is_published = TRUE
       GROUP BY category
       ORDER BY category`,
      []
    );

    return reply.send({
      data: categoriesResult.rows.map(c => ({
        name: c.category,
        label: formatCategoryLabel(c.category),
        count: parseInt(c.count),
      })),
    });
  });

  // Get single FAQ entry
  app.get('/faq/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const entry = await db.queryOne<FAQEntry>(
      `UPDATE faq_entries
       SET view_count = view_count + 1
       WHERE id = $1 AND is_published = TRUE
       RETURNING *`,
      [id]
    );

    if (!entry) {
      return reply.status(404).send({ error: 'FAQ entry not found' });
    }

    return reply.send({ data: formatFAQ(entry) });
  });

  // Mark FAQ as helpful/not helpful
  app.post('/faq/:id/helpful', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = faqHelpfulSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const column = parsed.data.helpful ? 'helpful_count' : 'not_helpful_count';

    await db.query(
      `UPDATE faq_entries SET ${column} = ${column} + 1 WHERE id = $1`,
      [id]
    );

    return reply.send({ data: { recorded: true } });
  });

  // ============================================
  // SEARCH (combined FAQ + feature requests)
  // ============================================

  app.get('/feedback/search', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { q?: string };

    if (!query.q || query.q.length < 2) {
      return reply.status(400).send({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${query.q}%`;

    // Search FAQ
    const faqResults = await db.query<FAQEntry>(
      `SELECT * FROM faq_entries
       WHERE is_published = TRUE AND (
         question ILIKE $1 OR
         answer ILIKE $1
       )
       ORDER BY view_count DESC
       LIMIT 5`,
      [searchTerm]
    );

    // Search popular feature requests
    const featureResults = await db.query<UserFeedback>(
      `SELECT * FROM user_feedback
       WHERE type = 'feature_request'
         AND status NOT IN ('closed', 'wont_fix')
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY upvotes DESC
       LIMIT 5`,
      [searchTerm]
    );

    return reply.send({
      data: {
        faq: faqResults.rows.map(formatFAQ),
        features: featureResults.rows.map(formatFeedback),
      },
    });
  });

  log.info('Feedback routes registered');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAcknowledgmentMessage(type: FeedbackType): string {
  switch (type) {
    case 'bug_report':
      return 'Thank you for reporting this bug! Our team will investigate and get back to you if we need more information.';
    case 'feature_request':
      return 'Thanks for your feature suggestion! Other users can upvote it if they\'d like to see it too.';
    case 'question':
      return 'We\'ve received your question. Check our FAQ for quick answers, or we\'ll respond soon!';
    default:
      return 'Thank you for your feedback! We appreciate you taking the time to share your thoughts.';
  }
}

function formatFeedback(f: UserFeedback) {
  return {
    id: f.id,
    type: f.type,
    status: f.status,
    priority: f.priority,
    title: f.title,
    description: f.description,
    stepsToReproduce: f.steps_to_reproduce,
    expectedBehavior: f.expected_behavior,
    actualBehavior: f.actual_behavior,
    category: f.category,
    attachments: f.attachments,
    upvotes: f.upvotes,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    resolvedAt: f.resolved_at,
    deviceInfo: {
      userAgent: f.user_agent,
      screenSize: f.screen_size,
      appVersion: f.app_version,
      platform: f.platform,
    },
  };
}

function formatResponse(r: FeedbackResponse) {
  return {
    id: r.id,
    responderType: r.responder_type,
    message: r.message,
    createdAt: r.created_at,
  };
}

function formatFAQ(f: FAQEntry) {
  return {
    id: f.id,
    category: f.category,
    categoryLabel: formatCategoryLabel(f.category),
    question: f.question,
    answer: f.answer,
    viewCount: f.view_count,
    helpfulCount: f.helpful_count,
    notHelpfulCount: f.not_helpful_count,
  };
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    getting_started: 'Getting Started',
    features: 'Features',
    account: 'Account & Profile',
    troubleshooting: 'Troubleshooting',
    billing: 'Billing & Subscriptions',
    privacy: 'Privacy & Security',
    general: 'General',
  };
  return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
