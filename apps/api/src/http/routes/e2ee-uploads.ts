/**
 * E2EE File Upload REST Endpoints
 *
 * REST endpoints for encrypted file uploads to Cloudflare R2.
 * These are REST because:
 * 1. Presigned URLs work better with REST (direct browser uploads)
 * 2. GraphQL has payload size limits for file metadata
 * 3. Simpler client integration for file upload flows
 *
 * Security:
 * - All endpoints require authentication
 * - Files are encrypted client-side before upload
 * - Server never sees plaintext content
 * - Rate limited (50 files/day, 500MB/day)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { fileStorageService } from '../../modules/e2ee';
import { loggers } from '../../lib/logger';

const log = loggers.api.child({ module: 'e2ee-uploads' });

// Request schemas
const requestUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024), // 100MB max
  mimeType: z.string().min(1).max(127),
  encryptedMetadata: z.string().min(1), // Base64 encoded encrypted metadata
  nsfwClassification: z.enum(['safe', 'suggestive', 'nsfw', 'explicit']).optional(),
});

const confirmUploadSchema = z.object({
  uploadToken: z.string().min(1),
  encryptedKey: z.string().min(1), // Base64 encoded encrypted symmetric key
  contentHash: z.string().min(64).max(128), // SHA-256 or SHA-512 hash
});

// Route registration
export default async function e2eeUploadsRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Use the authenticate method from the app
    const user = (request as any).user;
    if (!user?.userId) {
      return reply.code(401).send({
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
    }
  });

  /**
   * POST /api/e2ee/upload/request
   *
   * Request a presigned upload URL for encrypted file storage.
   * The client should then upload the encrypted file directly to R2.
   */
  fastify.post(
    '/upload/request',
    {
      schema: {
        description: 'Request a presigned URL for encrypted file upload',
        tags: ['E2EE'],
        body: {
          type: 'object',
          required: ['fileName', 'fileSize', 'mimeType', 'encryptedMetadata'],
          properties: {
            fileName: { type: 'string' },
            fileSize: { type: 'number' },
            mimeType: { type: 'string' },
            encryptedMetadata: { type: 'string' },
            nsfwClassification: { type: 'string', enum: ['safe', 'suggestive', 'nsfw', 'explicit'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              uploadUrl: { type: 'string' },
              expiresAt: { type: 'string' },
              maxSize: { type: 'number' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
          429: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              retryAfter: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const userId = user?.userId;

      // Validate request body
      const parseResult = requestUploadSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Invalid request body',
          code: 'BAD_USER_INPUT',
          details: parseResult.error.errors,
        });
      }

      const input = parseResult.data;

      try {
        const result = await fileStorageService.requestUploadUrl(userId, {
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          encryptedMetadata: input.encryptedMetadata,
          nsfwClassification: input.nsfwClassification,
        });

        return reply.send(result);
      } catch (error: any) {
        if (error.message?.includes('Rate limit')) {
          return reply.code(429).send({
            error: error.message,
            code: 'RATE_LIMITED',
            retryAfter: 86400, // 24 hours
          });
        }

        log.error('Failed to request upload URL', { error, userId });
        return reply.code(500).send({
          error: 'Failed to generate upload URL',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/e2ee/upload/confirm
   *
   * Confirm file upload after client has uploaded to R2.
   * Creates the file metadata record.
   */
  fastify.post(
    '/upload/confirm',
    {
      schema: {
        description: 'Confirm file upload and create metadata record',
        tags: ['E2EE'],
        body: {
          type: 'object',
          required: ['uploadToken', 'encryptedKey', 'contentHash'],
          properties: {
            uploadToken: { type: 'string' },
            encryptedKey: { type: 'string' },
            contentHash: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              uploaderId: { type: 'string' },
              mimeType: { type: 'string' },
              fileSize: { type: 'number' },
              contentHash: { type: 'string' },
              nsfwClassification: { type: 'string' },
              expiresAt: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const userId = user?.userId;

      // Validate request body
      const parseResult = confirmUploadSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Invalid request body',
          code: 'BAD_USER_INPUT',
          details: parseResult.error.errors,
        });
      }

      const input = parseResult.data;

      try {
        const file = await fileStorageService.confirmUpload(
          userId,
          input.uploadToken,
          input.encryptedKey,
          input.contentHash
        );

        return reply.send({
          id: file.id,
          uploaderId: file.uploaderId,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          contentHash: file.contentHash,
          nsfwClassification: file.nsfwClassification,
          expiresAt: file.expiresAt?.toISOString(),
          createdAt: file.createdAt?.toISOString(),
        });
      } catch (error: any) {
        if (error.message?.includes('not found') || error.message?.includes('expired')) {
          return reply.code(400).send({
            error: error.message,
            code: 'INVALID_TOKEN',
          });
        }

        log.error('Failed to confirm upload', { error, userId });
        return reply.code(500).send({
          error: 'Failed to confirm upload',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  /**
   * GET /api/e2ee/download/:fileId
   *
   * Get a presigned download URL for an encrypted file.
   */
  fastify.get(
    '/download/:fileId',
    {
      schema: {
        description: 'Get presigned download URL for encrypted file',
        tags: ['E2EE'],
        params: {
          type: 'object',
          required: ['fileId'],
          properties: {
            fileId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              expiresAt: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              requiresNsfwConsent: { type: 'boolean' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply) => {
      const user = (request as any).user;
      const userId = user?.userId;
      const { fileId } = request.params;

      try {
        const url = await fileStorageService.getDownloadUrl(fileId, userId);

        return reply.send({
          url,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        });
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          return reply.code(404).send({
            error: 'File not found',
            code: 'NOT_FOUND',
          });
        }

        if (error.message?.includes('NSFW') || error.message?.includes('adult content')) {
          return reply.code(403).send({
            error: error.message,
            code: 'NSFW_CONSENT_REQUIRED',
            requiresNsfwConsent: true,
          });
        }

        if (error.message?.includes('Access denied') || error.message?.includes('minor')) {
          return reply.code(403).send({
            error: error.message,
            code: 'FORBIDDEN',
          });
        }

        log.error('Failed to get download URL', { error, userId, fileId });
        return reply.code(500).send({
          error: 'Failed to get download URL',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  /**
   * DELETE /api/e2ee/file/:fileId
   *
   * Delete an encrypted file (only uploader can delete).
   */
  fastify.delete(
    '/file/:fileId',
    {
      schema: {
        description: 'Delete an encrypted file',
        tags: ['E2EE'],
        params: {
          type: 'object',
          required: ['fileId'],
          properties: {
            fileId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply) => {
      const user = (request as any).user;
      const userId = user?.userId;
      const { fileId } = request.params;

      try {
        await fileStorageService.deleteFile(fileId, userId);
        return reply.send({ success: true });
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          return reply.code(404).send({
            error: 'File not found',
            code: 'NOT_FOUND',
          });
        }

        if (error.message?.includes('not authorized') || error.message?.includes('Only uploader')) {
          return reply.code(403).send({
            error: 'Only the uploader can delete this file',
            code: 'FORBIDDEN',
          });
        }

        log.error('Failed to delete file', { error, userId, fileId });
        return reply.code(500).send({
          error: 'Failed to delete file',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );
}
