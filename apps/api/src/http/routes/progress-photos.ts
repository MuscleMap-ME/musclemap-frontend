/**
 * Progress Photos Routes
 *
 * API endpoints for managing progress photos:
 * - Upload and store progress photos
 * - Organize by type (front, back, side)
 * - Timeline and comparison views
 * - Privacy controls
 */

import { FastifyPluginAsync } from 'fastify';
import { authenticate } from './auth';
import { db } from '../../db/client';

// Photo types
const VALID_PHOTO_TYPES = ['front', 'back', 'side_left', 'side_right', 'custom'];
const VALID_POSES = ['relaxed', 'flexed', 'vacuum', 'custom'];

interface PhotoInput {
  storage_path: string;
  thumbnail_path?: string;
  photo_type: string;
  pose?: string;
  is_private?: boolean;
  weight_kg?: number;
  body_fat_percentage?: number;
  notes?: string;
  photo_date: string;
}

interface Photo {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path?: string;
  photo_type: string;
  pose: string;
  is_private: boolean;
  weight_kg?: number;
  body_fat_percentage?: number;
  notes?: string;
  photo_date: string;
  created_at: string;
  deleted_at?: string;
}

const progressPhotosRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all photos for user
  fastify.get(
    '/progress-photos',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { limit = 50, offset = 0, photo_type } = request.query as {
        limit?: number;
        offset?: number;
        photo_type?: string;
      };

      let query = `
        SELECT * FROM progress_photos
        WHERE user_id = $1 AND deleted_at IS NULL
      `;
      const params: unknown[] = [userId];

      if (photo_type && VALID_PHOTO_TYPES.includes(photo_type)) {
        query += ` AND photo_type = $${params.length + 1}`;
        params.push(photo_type);
      }

      query += ` ORDER BY photo_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const photos = await db.queryAll<Photo>(query, params);

      return reply.send({ photos });
    }
  );

  // Get photo timeline (grouped by date)
  fastify.get(
    '/progress-photos/timeline',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { days = 365 } = request.query as { days?: number };

      const photos = await db.queryAll<Photo>(
        `SELECT id, photo_type, pose, photo_date, thumbnail_path, weight_kg
         FROM progress_photos
         WHERE user_id = $1 AND deleted_at IS NULL
           AND photo_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY photo_date DESC`,
        [userId]
      );

      // Group by date
      const timeline: Record<string, Photo[]> = {};
      for (const photo of photos) {
        const dateKey = photo.photo_date;
        if (!timeline[dateKey]) {
          timeline[dateKey] = [];
        }
        timeline[dateKey].push(photo);
      }

      return reply.send({ timeline });
    }
  );

  // Get photo by ID
  fastify.get(
    '/progress-photos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const photo = await db.queryOne<Photo>(
        `SELECT * FROM progress_photos
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [id, userId]
      );

      if (!photo) {
        return reply.status(404).send({ error: 'Photo not found' });
      }

      return reply.send({ photo });
    }
  );

  // Add new photo
  fastify.post(
    '/progress-photos',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const body = request.body as PhotoInput;

      // Validate required fields
      if (!body.storage_path) {
        return reply.status(400).send({ error: 'storage_path is required' });
      }
      if (!body.photo_date) {
        return reply.status(400).send({ error: 'photo_date is required' });
      }
      if (!body.photo_type || !VALID_PHOTO_TYPES.includes(body.photo_type)) {
        return reply.status(400).send({
          error: `photo_type must be one of: ${VALID_PHOTO_TYPES.join(', ')}`
        });
      }
      if (body.pose && !VALID_POSES.includes(body.pose)) {
        return reply.status(400).send({
          error: `pose must be one of: ${VALID_POSES.join(', ')}`
        });
      }

      const photo = await db.queryOne<Photo>(
        `INSERT INTO progress_photos (
          user_id, storage_path, thumbnail_path, photo_type, pose,
          is_private, weight_kg, body_fat_percentage, notes, photo_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          userId, body.storage_path, body.thumbnail_path, body.photo_type,
          body.pose || 'relaxed', body.is_private !== false, // Default to private
          body.weight_kg, body.body_fat_percentage, body.notes, body.photo_date
        ]
      );

      return reply.status(201).send({ photo });
    }
  );

  // Update photo metadata
  fastify.put(
    '/progress-photos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const body = request.body as Partial<PhotoInput>;

      const existing = await db.queryOne(
        `SELECT id FROM progress_photos WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [id, userId]
      );

      if (!existing) {
        return reply.status(404).send({ error: 'Photo not found' });
      }

      // Validate photo_type if provided
      if (body.photo_type && !VALID_PHOTO_TYPES.includes(body.photo_type)) {
        return reply.status(400).send({
          error: `photo_type must be one of: ${VALID_PHOTO_TYPES.join(', ')}`
        });
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const fieldsToUpdate = ['photo_type', 'pose', 'is_private', 'weight_kg', 'body_fat_percentage', 'notes', 'photo_date'];
      for (const field of fieldsToUpdate) {
        if (body[field as keyof PhotoInput] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(body[field as keyof PhotoInput]);
        }
      }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      values.push(id, userId);
      const photo = await db.queryOne<Photo>(
        `UPDATE progress_photos
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
         RETURNING *`,
        values
      );

      return reply.send({ photo });
    }
  );

  // Soft delete photo
  fastify.delete(
    '/progress-photos/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const existing = await db.queryOne(
        `SELECT id FROM progress_photos WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [id, userId]
      );

      if (!existing) {
        return reply.status(404).send({ error: 'Photo not found' });
      }

      // Soft delete
      await db.execute(
        `UPDATE progress_photos SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      return reply.send({ success: true });
    }
  );

  // Get comparison photos (same type across time periods)
  fastify.get(
    '/progress-photos/compare',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { photo_type, pose } = request.query as {
        photo_type?: string;
        pose?: string;
      };

      let query = `
        SELECT * FROM progress_photos
        WHERE user_id = $1 AND deleted_at IS NULL
      `;
      const params: unknown[] = [userId];

      if (photo_type && VALID_PHOTO_TYPES.includes(photo_type)) {
        query += ` AND photo_type = $${params.length + 1}`;
        params.push(photo_type);
      }

      if (pose && VALID_POSES.includes(pose)) {
        query += ` AND pose = $${params.length + 1}`;
        params.push(pose);
      }

      query += ` ORDER BY photo_date ASC`;

      const photos = await db.queryAll<Photo>(query, params);

      if (photos.length < 2) {
        return reply.send({
          photos,
          message: 'Need at least 2 photos of the same type for comparison'
        });
      }

      // Return first, middle, and last photos for comparison
      const first = photos[0];
      const last = photos[photos.length - 1];
      const middle = photos.length > 2 ? photos[Math.floor(photos.length / 2)] : null;

      const firstDate = new Date(first.photo_date);
      const lastDate = new Date(last.photo_date);
      const daysBetween = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

      return reply.send({
        comparison: {
          first,
          middle,
          last,
          totalPhotos: photos.length,
          daysBetween,
        },
        allPhotos: photos,
      });
    }
  );

  // Get photos count by type
  fastify.get(
    '/progress-photos/stats',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;

      const stats = await db.queryAll<{ photo_type: string; count: string }>(
        `SELECT photo_type, COUNT(*) as count
         FROM progress_photos
         WHERE user_id = $1 AND deleted_at IS NULL
         GROUP BY photo_type`,
        [userId]
      );

      const dateRange = await db.queryOne<{ first_photo: string; last_photo: string; total_photos: string }>(
        `SELECT
          MIN(photo_date) as first_photo,
          MAX(photo_date) as last_photo,
          COUNT(*) as total_photos
         FROM progress_photos
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      return reply.send({
        byType: stats.reduce((acc: Record<string, number>, s) => {
          acc[s.photo_type] = parseInt(s.count, 10);
          return acc;
        }, {}),
        firstPhoto: dateRange?.first_photo || null,
        lastPhoto: dateRange?.last_photo || null,
        totalPhotos: parseInt(dateRange?.total_photos || '0', 10),
      });
    }
  );
};

export default progressPhotosRoutes;
