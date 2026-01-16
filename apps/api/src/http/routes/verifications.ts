/**
 * Achievement Verification Routes
 *
 * REST API for achievement verification system:
 * - Submit video proof for achievements
 * - Request witness attestations
 * - Manage verifications
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { verificationService } from '../../modules/verification';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const submitVerificationSchema = z.object({
  achievement_id: z.string().min(1),
  witness_user_id: z.string().min(1),
  notes: z.string().max(500).optional(),
});

const witnessAttestationSchema = z.object({
  confirm: z.boolean(),
  attestation_text: z.string().min(10).max(500).optional(),
  relationship: z.string().max(100).optional(),
  location_description: z.string().max(200).optional(),
  is_public: z.boolean().optional().default(true),
});

const listQuerySchema = z.object({
  status: z.enum(['pending_witness', 'verified', 'rejected', 'expired']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const witnessListQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'declined']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function registerVerificationRoutes(app: FastifyInstance) {
  // ============================================
  // VERIFICATION SUBMISSION
  // ============================================

  /**
   * Submit verification for an achievement (with video upload)
   * POST /achievements/:id/verify
   */
  app.post<{ Params: { id: string } }>(
    '/achievements/:id/verify',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const achievementId = request.params.id;

      // Handle multipart form data
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Video file is required',
            statusCode: 400,
          },
        });
      }

      // Parse fields from multipart
      let witnessUserId: string | undefined;
      let notes: string | undefined;

      // Get fields from the multipart request
      const fields = data.fields as Record<string, { value: string } | undefined>;
      if (fields.witness_user_id) {
        witnessUserId = fields.witness_user_id.value;
      }
      if (fields.notes) {
        notes = fields.notes.value;
      }

      if (!witnessUserId) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'witness_user_id is required',
            statusCode: 400,
          },
        });
      }

      // Validate file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid video format. Allowed: mp4, mov, webm, avi',
            statusCode: 400,
          },
        });
      }

      try {
        // Convert file to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const videoBuffer = Buffer.concat(chunks);

        const verification = await verificationService.submitVerification({
          userId,
          achievementId,
          witnessUserId,
          notes,
          videoBuffer,
          originalFilename: data.filename,
          fileSizeBytes: videoBuffer.length,
        });

        log.info(`Verification submitted: ${verification.id} for achievement ${achievementId}`);

        return reply.status(201).send({ data: verification });
      } catch (error: any) {
        log.error('Failed to submit verification:', error);

        if (error.name === 'ValidationError') {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: error.message, statusCode: 400 },
          });
        }
        if (error.name === 'NotFoundError') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
          });
        }

        throw error;
      }
    }
  );

  /**
   * Submit verification without video (for optional verification achievements)
   * POST /verifications
   */
  app.post<{ Body: z.infer<typeof submitVerificationSchema> }>(
    '/verifications',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const parsed = submitVerificationSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
            statusCode: 400,
          },
        });
      }

      const { achievement_id, witness_user_id, notes } = parsed.data;

      try {
        const verification = await verificationService.submitVerification({
          userId,
          achievementId: achievement_id,
          witnessUserId: witness_user_id,
          notes,
        });

        return reply.status(201).send({ data: verification });
      } catch (error: any) {
        if (error.name === 'ValidationError') {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: error.message, statusCode: 400 },
          });
        }
        if (error.name === 'NotFoundError') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
          });
        }
        throw error;
      }
    }
  );

  // ============================================
  // VERIFICATION MANAGEMENT
  // ============================================

  /**
   * Get a specific verification
   * GET /verifications/:id
   */
  app.get<{ Params: { id: string } }>(
    '/verifications/:id',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      try {
        const verification = await verificationService.getVerification(request.params.id);

        // Only allow owner or witness to view
        const userId = (request.user as { userId: string }).userId;
        if (verification.userId !== userId && verification.witness?.witnessUserId !== userId) {
          return reply.status(403).send({
            error: { code: 'FORBIDDEN', message: 'Access denied', statusCode: 403 },
          });
        }

        return reply.send({ data: verification });
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
          });
        }
        throw error;
      }
    }
  );

  /**
   * Get current user's verifications
   * GET /me/verifications
   */
  app.get<{ Querystring: z.infer<typeof listQuerySchema> }>(
    '/me/verifications',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const parsed = listQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
            statusCode: 400,
          },
        });
      }

      const { status, limit, offset } = parsed.data;

      const result = await verificationService.getUserVerifications(userId, {
        status: status as any,
        limit,
        offset,
      });

      return reply.send({
        data: result.verifications,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    }
  );

  /**
   * Cancel a pending verification
   * DELETE /verifications/:id
   */
  app.delete<{ Params: { id: string } }>(
    '/verifications/:id',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;

      try {
        await verificationService.cancelVerification(request.params.id, userId);
        return reply.status(204).send();
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
          });
        }
        if (error.name === 'ForbiddenError') {
          return reply.status(403).send({
            error: { code: 'FORBIDDEN', message: error.message, statusCode: 403 },
          });
        }
        if (error.name === 'ValidationError') {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: error.message, statusCode: 400 },
          });
        }
        throw error;
      }
    }
  );

  /**
   * Check if user can submit verification for an achievement
   * GET /achievements/:id/can-verify
   */
  app.get<{ Params: { id: string } }>(
    '/achievements/:id/can-verify',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const result = await verificationService.canSubmitVerification(userId, request.params.id);
      return reply.send({ data: result });
    }
  );

  // ============================================
  // WITNESS REQUESTS
  // ============================================

  /**
   * Get pending witness requests for current user
   * GET /me/witness-requests
   */
  app.get<{ Querystring: z.infer<typeof witnessListQuerySchema> }>(
    '/me/witness-requests',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const parsed = witnessListQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
            statusCode: 400,
          },
        });
      }

      const { status, limit, offset } = parsed.data;

      const result = await verificationService.getWitnessRequests(userId, {
        status: status as any,
        limit,
        offset,
      });

      return reply.send({
        data: result.requests,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    }
  );

  /**
   * Submit witness attestation
   * POST /verifications/:id/witness
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof witnessAttestationSchema> }>(
    '/verifications/:id/witness',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as { userId: string }).userId;
      const parsed = witnessAttestationSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0].message,
            statusCode: 400,
          },
        });
      }

      const { confirm, attestation_text, relationship, location_description, is_public } = parsed.data;

      // Require attestation text if confirming
      if (confirm && !attestation_text) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Attestation text is required when confirming',
            statusCode: 400,
          },
        });
      }

      try {
        const verification = await verificationService.submitWitnessAttestation({
          verificationId: request.params.id,
          witnessUserId: userId,
          confirm,
          attestationText: attestation_text,
          relationship,
          locationDescription: location_description,
          isPublic: is_public,
        });

        return reply.send({
          data: verification,
          message: confirm
            ? 'Achievement verified! The user has been granted the achievement.'
            : 'Verification declined.',
        });
      } catch (error: any) {
        if (error.name === 'NotFoundError') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
          });
        }
        if (error.name === 'ForbiddenError') {
          return reply.status(403).send({
            error: { code: 'FORBIDDEN', message: error.message, statusCode: 403 },
          });
        }
        if (error.name === 'ValidationError') {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: error.message, statusCode: 400 },
          });
        }
        throw error;
      }
    }
  );

  // ============================================
  // VERIFICATION-REQUIRED ACHIEVEMENTS
  // ============================================

  /**
   * Get achievements that require verification
   * GET /achievements/verification-required
   */
  app.get('/achievements/verification-required', async (_request: FastifyRequest, reply: FastifyReply) => {
    const achievements = await verificationService.getVerificationRequiredAchievements();
    return reply.send({ data: achievements });
  });

  log.info('Verification routes registered');
}
