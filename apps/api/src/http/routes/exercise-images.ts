/**
 * Exercise Images Routes (Fastify)
 *
 * Routes for community exercise image contributions:
 * - Upload exercise images
 * - Get my submissions
 * - Admin: review, approve, reject submissions
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import {
  processExerciseImage,
  validateImage,
  generateFilename,
  saveImages,
  deleteImages,
  getUploadDir,
  ensureUploadDirs,
} from '../../services/image-processing.service';
import { validateExerciseImage } from '../../services/exercise-image-validator.service';
import { earningService } from '../../modules/economy/earning.service';

const log = loggers.http;

// Constants
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DAILY_UPLOAD_LIMIT = 5;

// Validation schemas
const reviewSubmissionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
  setAsActive: z.boolean().optional().default(true), // Whether to use this image for the exercise
});

// Types
interface ImageSubmission {
  id: string;
  exercise_id: string;
  user_id: string;
  original_url: string;
  processed_url: string | null;
  thumbnail_url: string | null;
  nsfw_score: number | null;
  exercise_match_score: number | null;
  ai_validation_passed: boolean;
  ai_validation_notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  credits_awarded: number;
  credits_awarded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export default async function exerciseImagesRoutes(app: FastifyInstance) {
  // Ensure upload directories exist
  await ensureUploadDirs().catch((err) => {
    log.warn({ error: err }, 'Could not create upload directories');
  });

  // ============================================
  // USER ROUTES
  // ============================================

  /**
   * Upload an exercise image
   * POST /exercise-images/upload
   */
  app.post('/exercise-images/upload', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      // Check daily upload limit
      const todayCount = await db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM exercise_image_submissions
         WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
        [userId]
      );

      if (parseInt(todayCount?.count || '0') >= DAILY_UPLOAD_LIMIT) {
        return reply.status(429).send({
          error: 'Daily upload limit reached',
          message: `You can upload up to ${DAILY_UPLOAD_LIMIT} images per day. Try again tomorrow!`,
        });
      }

      // Get the file and exercise ID from multipart
      const parts = request.parts();
      let exerciseId: string | null = null;
      let fileBuffer: Buffer | null = null;
      let mimeType: string | null = null;

      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'exerciseId') {
          exerciseId = part.value as string;
        } else if (part.type === 'file' && part.fieldname === 'image') {
          // Validate mime type
          mimeType = part.mimetype;
          if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            return reply.status(400).send({
              error: 'Invalid file type',
              message: 'Allowed formats: JPEG, PNG, WebP, HEIC',
            });
          }

          // Read file into buffer with size limit
          const chunks: Buffer[] = [];
          let totalSize = 0;

          for await (const chunk of part.file) {
            totalSize += chunk.length;
            if (totalSize > MAX_FILE_SIZE) {
              return reply.status(400).send({
                error: 'File too large',
                message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
              });
            }
            chunks.push(chunk);
          }

          fileBuffer = Buffer.concat(chunks);
        }
      }

      if (!exerciseId) {
        return reply.status(400).send({ error: 'Missing exerciseId field' });
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: 'No image file provided' });
      }

      // Verify exercise exists
      const exercise = await db.queryOne<{ id: string; name: string }>(
        `SELECT id, name FROM exercises WHERE id = $1`,
        [exerciseId]
      );

      if (!exercise) {
        return reply.status(404).send({ error: 'Exercise not found' });
      }

      // Validate basic image properties
      const basicValidation = await validateImage(fileBuffer);
      if (!basicValidation.valid) {
        return reply.status(400).send({
          error: 'Invalid image',
          message: basicValidation.error,
        });
      }

      // AI Validation
      const validation = await validateExerciseImage(fileBuffer, exercise.name);

      if (!validation.passed && validation.rejectionReason) {
        return reply.status(400).send({
          error: 'Image rejected',
          message: validation.rejectionReason,
          details: validation.notes,
        });
      }

      // Process the image (resize, convert to webp)
      const processed = await processExerciseImage(fileBuffer);

      // Generate filename and save
      const filename = generateFilename(exerciseId, userId);
      const saved = await saveImages(fileBuffer, processed, filename);

      // Create database record
      const submission = await db.queryOne<ImageSubmission>(
        `INSERT INTO exercise_image_submissions (
          exercise_id, user_id, original_url, processed_url, thumbnail_url,
          nsfw_score, exercise_match_score, ai_validation_passed, ai_validation_notes,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          exerciseId,
          userId,
          saved.originalUrl,
          saved.processedUrl,
          saved.thumbnailUrl,
          validation.nsfwScore,
          validation.exerciseMatchScore,
          validation.passed && !validation.requiresManualReview,
          validation.notes.join('\n'),
          validation.requiresManualReview ? 'pending' : (validation.passed ? 'pending' : 'rejected'),
        ]
      );

      log.info(
        { userId, exerciseId, submissionId: submission?.id, validationPassed: validation.passed },
        'Exercise image uploaded'
      );

      // If AI validation passed with high confidence, auto-approve
      if (validation.passed && !validation.requiresManualReview && validation.exerciseMatchScore >= 0.7) {
        // Auto-approve high confidence submissions
        await autoApproveSubmission(submission!.id, exerciseId, userId);
      }

      return reply.send({
        success: true,
        submission: {
          id: submission?.id,
          exerciseId,
          status: submission?.status,
          thumbnailUrl: saved.thumbnailUrl,
          validationNotes: validation.notes,
          requiresReview: validation.requiresManualReview,
        },
        message: validation.requiresManualReview
          ? 'Image uploaded! It will be reviewed by our team before approval.'
          : validation.passed
            ? 'Image uploaded and approved! Thank you for contributing.'
            : 'Image uploaded for review.',
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to upload exercise image');
      return reply.status(500).send({ error: 'Failed to upload image' });
    }
  });

  /**
   * Get my submissions
   * GET /exercise-images/my-submissions
   */
  app.get('/exercise-images/my-submissions', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const submissions = await db.queryAll<ImageSubmission & { exercise_name: string }>(
      `SELECT s.*, e.name as exercise_name
       FROM exercise_image_submissions s
       JOIN exercises e ON e.id = s.exercise_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Get contribution stats
    const stats = await db.queryOne<{
      pending_count: string;
      approved_count: string;
      rejected_count: string;
      total_credits_earned: string;
    }>(
      `SELECT * FROM user_image_contribution_stats WHERE user_id = $1`,
      [userId]
    );

    return reply.send({
      submissions: submissions.map((s) => ({
        id: s.id,
        exerciseId: s.exercise_id,
        exerciseName: s.exercise_name,
        thumbnailUrl: s.thumbnail_url,
        status: s.status,
        rejectionReason: s.rejection_reason,
        creditsAwarded: s.credits_awarded,
        createdAt: s.created_at,
      })),
      stats: {
        pending: parseInt(stats?.pending_count || '0'),
        approved: parseInt(stats?.approved_count || '0'),
        rejected: parseInt(stats?.rejected_count || '0'),
        totalCreditsEarned: parseInt(stats?.total_credits_earned || '0'),
      },
    });
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================

  /**
   * Get pending submissions for review
   * GET /exercise-images/admin/pending
   */
  app.get('/exercise-images/admin/pending', { preHandler: authenticate }, async (request, reply) => {
    if (!request.user?.roles?.includes('admin')) {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const submissions = await db.queryAll<ImageSubmission & {
      exercise_name: string;
      submitter_username: string;
      current_image_url: string | null;
    }>(
      `SELECT s.*, e.name as exercise_name, e.image_url as current_image_url,
              u.username as submitter_username
       FROM exercise_image_submissions s
       JOIN exercises e ON e.id = s.exercise_id
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'pending'
       ORDER BY s.created_at ASC
       LIMIT 100`,
      []
    );

    return reply.send({
      submissions: submissions.map((s) => ({
        id: s.id,
        exerciseId: s.exercise_id,
        exerciseName: s.exercise_name,
        currentImageUrl: s.current_image_url,
        thumbnailUrl: s.thumbnail_url,
        processedUrl: s.processed_url,
        submitterId: s.user_id,
        submitterUsername: s.submitter_username,
        nsfwScore: s.nsfw_score,
        exerciseMatchScore: s.exercise_match_score,
        aiValidationPassed: s.ai_validation_passed,
        aiValidationNotes: s.ai_validation_notes,
        createdAt: s.created_at,
      })),
      totalPending: submissions.length,
    });
  });

  /**
   * Review a submission (approve/reject)
   * POST /exercise-images/admin/review/:submissionId
   */
  app.post('/exercise-images/admin/review/:submissionId', { preHandler: authenticate }, async (request, reply) => {
    if (!request.user?.roles?.includes('admin')) {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { submissionId } = request.params as { submissionId: string };
    const parsed = reviewSubmissionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.errors });
    }

    const { action, rejectionReason, setAsActive } = parsed.data;
    const reviewerId = request.user!.userId;

    // Get the submission
    const submission = await db.queryOne<ImageSubmission>(
      `SELECT * FROM exercise_image_submissions WHERE id = $1`,
      [submissionId]
    );

    if (!submission) {
      return reply.status(404).send({ error: 'Submission not found' });
    }

    if (submission.status !== 'pending') {
      return reply.status(400).send({ error: 'Submission already reviewed' });
    }

    if (action === 'approve') {
      // Award credits
      const creditsAwarded = await awardCreditsForSubmission(submission);

      // Update submission
      await db.query(
        `UPDATE exercise_image_submissions
         SET status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             credits_awarded = $2,
             credits_awarded_at = NOW()
         WHERE id = $3`,
        [reviewerId, creditsAwarded, submissionId]
      );

      // Update exercise to use this image if setAsActive
      if (setAsActive) {
        await db.query(
          `UPDATE exercises
           SET image_url = $1,
               community_image_id = $2,
               image_source = 'community'
           WHERE id = $3`,
          [submission.processed_url, submissionId, submission.exercise_id]
        );
      }

      log.info(
        { submissionId, reviewerId, creditsAwarded, setAsActive },
        'Exercise image submission approved'
      );

      return reply.send({
        success: true,
        message: `Submission approved! ${creditsAwarded} credits awarded to contributor.`,
        creditsAwarded,
      });
    } else {
      // Reject
      await db.query(
        `UPDATE exercise_image_submissions
         SET status = 'rejected',
             reviewed_by = $1,
             reviewed_at = NOW(),
             rejection_reason = $2
         WHERE id = $3`,
        [reviewerId, rejectionReason || 'Does not meet quality standards', submissionId]
      );

      // Optionally delete the files to save space
      // await deleteImages(submission.original_url.split('/').pop()?.replace('.original', '') || '');

      log.info({ submissionId, reviewerId, rejectionReason }, 'Exercise image submission rejected');

      return reply.send({
        success: true,
        message: 'Submission rejected.',
      });
    }
  });

  /**
   * Get submission stats for admin dashboard
   * GET /exercise-images/admin/stats
   */
  app.get('/exercise-images/admin/stats', { preHandler: authenticate }, async (request, reply) => {
    if (!request.user?.roles?.includes('admin')) {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const stats = await db.queryOne<{
      total: string;
      pending: string;
      approved: string;
      rejected: string;
      total_credits: string;
      unique_contributors: string;
      exercises_with_community_images: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COALESCE(SUM(credits_awarded), 0) as total_credits,
        COUNT(DISTINCT user_id) as unique_contributors,
        (SELECT COUNT(*) FROM exercises WHERE image_source = 'community') as exercises_with_community_images
       FROM exercise_image_submissions`,
      []
    );

    return reply.send({
      total: parseInt(stats?.total || '0'),
      pending: parseInt(stats?.pending || '0'),
      approved: parseInt(stats?.approved || '0'),
      rejected: parseInt(stats?.rejected || '0'),
      totalCreditsAwarded: parseInt(stats?.total_credits || '0'),
      uniqueContributors: parseInt(stats?.unique_contributors || '0'),
      exercisesWithCommunityImages: parseInt(stats?.exercises_with_community_images || '0'),
    });
  });
}

/**
 * Auto-approve a high-confidence submission
 */
async function autoApproveSubmission(submissionId: string, exerciseId: string, userId: string): Promise<void> {
  try {
    const submission = await db.queryOne<ImageSubmission>(
      `SELECT * FROM exercise_image_submissions WHERE id = $1`,
      [submissionId]
    );

    if (!submission || submission.status !== 'pending') return;

    // Award credits
    const creditsAwarded = await awardCreditsForSubmission(submission);

    // Update submission as auto-approved
    await db.query(
      `UPDATE exercise_image_submissions
       SET status = 'approved',
           reviewed_by = NULL,
           reviewed_at = NOW(),
           credits_awarded = $1,
           credits_awarded_at = NOW(),
           ai_validation_notes = ai_validation_notes || E'\n[Auto-approved due to high confidence]'
       WHERE id = $2`,
      [creditsAwarded, submissionId]
    );

    // Check if exercise has no image - if so, set this as active
    const exercise = await db.queryOne<{ image_url: string | null }>(
      `SELECT image_url FROM exercises WHERE id = $1`,
      [exerciseId]
    );

    if (!exercise?.image_url) {
      await db.query(
        `UPDATE exercises
         SET image_url = $1,
             community_image_id = $2,
             image_source = 'community'
         WHERE id = $3`,
        [submission.processed_url, submissionId, exerciseId]
      );
    }

    log.info({ submissionId, exerciseId, userId, creditsAwarded }, 'Exercise image auto-approved');
  } catch (error) {
    log.error({ error, submissionId }, 'Failed to auto-approve submission');
  }
}

/**
 * Award credits for an approved submission
 */
async function awardCreditsForSubmission(submission: ImageSubmission): Promise<number> {
  let baseCredits = 25;

  // Bonus for first image on an exercise
  const existingApproved = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM exercise_image_submissions
     WHERE exercise_id = $1 AND status = 'approved' AND id != $2`,
    [submission.exercise_id, submission.id]
  );

  const isFirst = parseInt(existingApproved?.count || '0') === 0;
  if (isFirst) {
    baseCredits += 10; // First image bonus
  }

  // Award credits via the economy system
  try {
    await earningService.processEarning({
      userId: submission.user_id,
      ruleCode: 'exercise_image_approved',
      sourceType: 'exercise_image_submission',
      sourceId: submission.id,
      metadata: {
        exerciseId: submission.exercise_id,
        isFirst,
      },
    });

    // Award first image bonus if applicable
    if (isFirst) {
      await earningService.processEarning({
        userId: submission.user_id,
        ruleCode: 'exercise_image_first',
        sourceType: 'exercise_image_submission',
        sourceId: `${submission.id}-first-bonus`,
        metadata: {
          exerciseId: submission.exercise_id,
        },
      });
    }
  } catch (error) {
    log.error({ error, userId: submission.user_id }, 'Failed to award credits for image');
    // Still return the amount for display even if awarding fails
  }

  return baseCredits;
}
