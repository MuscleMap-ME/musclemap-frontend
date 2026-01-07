/**
 * Check-ins Routes
 *
 * REST API for hangout check-ins:
 * - Check in/out of physical hangouts
 * - View active check-ins
 * - Link workouts to check-ins
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';
import { geoService } from '../../services/geo.service';
import { achievementService } from '../../modules/achievements';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';

const log = loggers.core;

// Schemas
const checkInSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const linkWorkoutSchema = z.object({
  workoutId: z.string().min(1),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Types
interface CheckIn {
  id: string;
  hangoutId: number;
  hangoutName: string;
  userId: string;
  username: string;
  checkedInAt: Date;
  checkedOutAt?: Date;
  workoutId?: string;
  isActive: boolean;
}

// Helper to coarsen coordinates for privacy (~100m precision)
function coarsenLocation(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 1000) / 1000, // ~100m precision
    lng: Math.round(lng * 1000) / 1000,
  };
}

export async function registerCheckInRoutes(app: FastifyInstance) {
  // ============================================
  // CHECK-IN / CHECK-OUT
  // ============================================

  /**
   * Check into a hangout
   * POST /hangouts/:id/check-in
   */
  app.post('/hangouts/:id/check-in', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof checkInSchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);
    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const userId = request.user!.userId;
    const body = checkInSchema.parse(request.body);

    // Check hangout exists and is active
    const hangout = await queryOne<{
      id: number;
      name: string;
      is_active: boolean;
      type_id: number;
      latitude: number | null;
      longitude: number | null;
      radius_meters: number;
    }>(
      `SELECT h.id, h.name, h.is_active, h.type_id,
              COALESCE(ST_Y(h.location::geometry), h.latitude) as latitude,
              COALESCE(ST_X(h.location::geometry), h.longitude) as longitude,
              h.radius_meters
       FROM hangouts h WHERE h.id = $1`,
      [hangoutId]
    );

    if (!hangout) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Hangout not found', statusCode: 404 },
      });
    }

    if (!hangout.is_active) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Hangout is not active', statusCode: 400 },
      });
    }

    // Check if user is a member
    const membership = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Must be a member to check in', statusCode: 403 },
      });
    }

    // Check if already checked in
    const existingCheckIn = await queryOne<{ id: string }>(
      'SELECT id FROM hangout_checkins WHERE hangout_id = $1 AND user_id = $2 AND checked_out_at IS NULL',
      [hangoutId, userId]
    );

    if (existingCheckIn) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Already checked in to this hangout', statusCode: 400 },
      });
    }

    // Optional: Verify location (advisory only, not blocking)
    let locationVerified = false;
    let approxLat: number | null = null;
    let approxLng: number | null = null;

    if (body.lat && body.lng && hangout.latitude && hangout.longitude) {
      const distance = geoService.calculateDistance(body.lat, body.lng, hangout.latitude, hangout.longitude);
      locationVerified = distance <= (hangout.radius_meters || 500);

      // Store coarsened location
      const coarsened = coarsenLocation(body.lat, body.lng);
      approxLat = coarsened.lat;
      approxLng = coarsened.lng;
    }

    // Create check-in
    const checkInId = `hc_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO hangout_checkins (id, hangout_id, user_id, approx_lat, approx_lng)
       VALUES ($1, $2, $3, $4, $5)`,
      [checkInId, hangoutId, userId, approxLat, approxLng]
    );

    log.info({ checkInId, hangoutId, userId, locationVerified }, 'User checked in to hangout');

    // Check for first check-in achievement
    await achievementService.grant({
      userId,
      achievementKey: 'first_checkin',
      hangoutId,
    });

    return reply.status(201).send({
      data: {
        id: checkInId,
        hangoutId,
        hangoutName: hangout.name,
        checkedInAt: new Date(),
        locationVerified,
      },
    });
  });

  /**
   * Check out from a hangout
   * POST /hangouts/:id/check-out
   */
  app.post('/hangouts/:id/check-out', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);
    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const userId = request.user!.userId;

    // Find active check-in
    const checkIn = await queryOne<{ id: string; checked_in_at: Date }>(
      'SELECT id, checked_in_at FROM hangout_checkins WHERE hangout_id = $1 AND user_id = $2 AND checked_out_at IS NULL',
      [hangoutId, userId]
    );

    if (!checkIn) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No active check-in found', statusCode: 404 },
      });
    }

    // Update check-out time
    await query(
      'UPDATE hangout_checkins SET checked_out_at = NOW() WHERE id = $1',
      [checkIn.id]
    );

    const duration = Math.round((Date.now() - new Date(checkIn.checked_in_at).getTime()) / 1000 / 60); // minutes

    log.info({ checkInId: checkIn.id, hangoutId, userId, durationMinutes: duration }, 'User checked out from hangout');

    return reply.send({
      data: {
        id: checkIn.id,
        checkedOutAt: new Date(),
        durationMinutes: duration,
      },
    });
  });

  /**
   * Link a workout to current check-in
   * POST /hangouts/:id/check-in/link-workout
   */
  app.post('/hangouts/:id/check-in/link-workout', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof linkWorkoutSchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);
    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const userId = request.user!.userId;
    const body = linkWorkoutSchema.parse(request.body);

    // Find active check-in
    const checkIn = await queryOne<{ id: string }>(
      'SELECT id FROM hangout_checkins WHERE hangout_id = $1 AND user_id = $2 AND checked_out_at IS NULL',
      [hangoutId, userId]
    );

    if (!checkIn) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No active check-in found', statusCode: 404 },
      });
    }

    // Verify workout belongs to user
    const workout = await queryOne<{ id: string }>(
      'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
      [body.workoutId, userId]
    );

    if (!workout) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workout not found', statusCode: 404 },
      });
    }

    // Link workout to check-in
    await query(
      'UPDATE hangout_checkins SET workout_id = $1 WHERE id = $2',
      [body.workoutId, checkIn.id]
    );

    log.info({ checkInId: checkIn.id, workoutId: body.workoutId }, 'Workout linked to check-in');

    return reply.send({
      data: { success: true, message: 'Workout linked to check-in' },
    });
  });

  // ============================================
  // VIEW CHECK-INS
  // ============================================

  /**
   * Get active check-ins at a hangout
   * GET /hangouts/:id/check-ins/active
   */
  app.get('/hangouts/:id/check-ins/active', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);
    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const query_params = paginationSchema.parse(request.query);

    const rows = await queryAll<{
      id: string;
      hangout_id: number;
      hangout_name: string;
      user_id: string;
      username: string;
      checked_in_at: Date;
    }>(
      `SELECT hc.id, hc.hangout_id, h.name as hangout_name, hc.user_id, u.username, hc.checked_in_at
       FROM hangout_checkins hc
       JOIN hangouts h ON h.id = hc.hangout_id
       JOIN users u ON u.id = hc.user_id
       WHERE hc.hangout_id = $1 AND hc.checked_out_at IS NULL
       ORDER BY hc.checked_in_at DESC
       LIMIT $2 OFFSET $3`,
      [hangoutId, query_params.limit, query_params.offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM hangout_checkins WHERE hangout_id = $1 AND checked_out_at IS NULL',
      [hangoutId]
    );

    const checkIns: CheckIn[] = rows.map((r) => ({
      id: r.id,
      hangoutId: r.hangout_id,
      hangoutName: r.hangout_name,
      userId: r.user_id,
      username: r.username,
      checkedInAt: r.checked_in_at,
      isActive: true,
    }));

    return reply.send({
      data: checkIns,
      pagination: {
        total: parseInt(countResult?.count || '0'),
        limit: query_params.limit,
        offset: query_params.offset,
        hasMore: query_params.offset + checkIns.length < parseInt(countResult?.count || '0'),
      },
    });
  });

  /**
   * Get current user's active check-in
   * GET /me/check-in
   */
  app.get('/me/check-in', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;

    const checkIn = await queryOne<{
      id: string;
      hangout_id: number;
      hangout_name: string;
      checked_in_at: Date;
      workout_id: string | null;
    }>(
      `SELECT hc.id, hc.hangout_id, h.name as hangout_name, hc.checked_in_at, hc.workout_id
       FROM hangout_checkins hc
       JOIN hangouts h ON h.id = hc.hangout_id
       WHERE hc.user_id = $1 AND hc.checked_out_at IS NULL
       ORDER BY hc.checked_in_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!checkIn) {
      return reply.send({ data: null });
    }

    return reply.send({
      data: {
        id: checkIn.id,
        hangoutId: checkIn.hangout_id,
        hangoutName: checkIn.hangout_name,
        checkedInAt: checkIn.checked_in_at,
        workoutId: checkIn.workout_id,
        isActive: true,
      },
    });
  });

  /**
   * Get current user's check-in history
   * GET /me/check-ins
   */
  app.get('/me/check-ins', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Querystring: z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const query_params = paginationSchema.parse(request.query);

    const rows = await queryAll<{
      id: string;
      hangout_id: number;
      hangout_name: string;
      checked_in_at: Date;
      checked_out_at: Date | null;
      workout_id: string | null;
    }>(
      `SELECT hc.id, hc.hangout_id, h.name as hangout_name, hc.checked_in_at, hc.checked_out_at, hc.workout_id
       FROM hangout_checkins hc
       JOIN hangouts h ON h.id = hc.hangout_id
       WHERE hc.user_id = $1
       ORDER BY hc.checked_in_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, query_params.limit, query_params.offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM hangout_checkins WHERE user_id = $1',
      [userId]
    );

    const checkIns: CheckIn[] = rows.map((r) => ({
      id: r.id,
      hangoutId: r.hangout_id,
      hangoutName: r.hangout_name,
      userId,
      username: '', // Not needed for own history
      checkedInAt: r.checked_in_at,
      checkedOutAt: r.checked_out_at ?? undefined,
      workoutId: r.workout_id ?? undefined,
      isActive: !r.checked_out_at,
    }));

    return reply.send({
      data: checkIns,
      pagination: {
        total: parseInt(countResult?.count || '0'),
        limit: query_params.limit,
        offset: query_params.offset,
        hasMore: query_params.offset + checkIns.length < parseInt(countResult?.count || '0'),
      },
    });
  });
}
