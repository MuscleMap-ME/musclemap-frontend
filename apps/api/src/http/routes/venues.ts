/**
 * Venues Routes (Fastify)
 *
 * Location-based fitness venue endpoints:
 * - Browse and search venues
 * - Check-in/check-out
 * - Record claims and verification
 * - Leaderboards
 * - Witness attestation
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import {
  venueService,
  checkinService,
  recordClaimService,
  VenueType,
  EquipmentType,
} from '../../modules/venues';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// SCHEMAS
// ============================================

const createVenueSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  venueType: z.enum([
    'park',
    'recreation_center',
    'outdoor_gym',
    'calisthenics_park',
    'public_gym',
    'track',
    'beach',
    'playground',
    'custom',
  ]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  stateProvince: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  radiusMeters: z.number().int().min(25).max(500).optional(),
  equipment: z
    .array(
      z.enum([
        'pull_up_bar',
        'dip_bars',
        'parallel_bars',
        'monkey_bars',
        'vertical_pole',
        'bench_press',
        'squat_rack',
        'barbell',
        'dumbbells',
        'cable_machine',
        'weight_belt',
        'climbing_boulder',
      ])
    )
    .optional(),
  hasFreeWeights: z.boolean().optional(),
  hasCalisthenicsEquipment: z.boolean().optional(),
  hasCardioEquipment: z.boolean().optional(),
  hasParkourFeatures: z.boolean().optional(),
  isIndoor: z.boolean().optional(),
  is24Hour: z.boolean().optional(),
  isFree: z.boolean().optional(),
  coverPhotoUrl: z.string().url().optional(),
  hoursOfOperation: z.record(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
});

const searchVenuesSchema = z.object({
  query: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  venueType: z
    .enum([
      'park',
      'recreation_center',
      'outdoor_gym',
      'calisthenics_park',
      'public_gym',
      'track',
      'beach',
      'playground',
      'custom',
    ])
    .optional(),
  isFree: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  isIndoor: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const nearbyVenuesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMiles: z.coerce.number().min(0.1).max(50).optional(),
  venueType: z
    .enum([
      'park',
      'recreation_center',
      'outdoor_gym',
      'calisthenics_park',
      'public_gym',
      'track',
      'beach',
      'playground',
      'custom',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const checkinSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationAccuracyMeters: z.number().min(0).max(1000).optional(),
  workoutId: z.string().optional(),
});

const initiateClaimSchema = z.object({
  recordTypeId: z.string(),
  value: z.number().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().max(500).optional(),
});

const assignWitnessSchema = z.object({
  witnessUserId: z.string(),
});

const witnessAttestationSchema = z.object({
  confirm: z.boolean(),
  attestationText: z.string().min(10).max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// fileDisputeSchema for future dispute endpoint implementation
// const fileDisputeSchema = z.object({
//   reason: z.enum(['video_manipulation', 'form_violation', 'equipment_assistance', 'false_count', 'location_mismatch', 'witness_collusion', 'other']),
//   description: z.string().min(20).max(2000),
//   evidenceUrls: z.array(z.string().url()).max(5).optional(),
// });

// ============================================
// ROUTES
// ============================================

export async function registerVenuesRoutes(app: FastifyInstance) {
  // ============================================
  // VENUE CRUD
  // ============================================

  /**
   * GET /venues
   * Search/list venues
   */
  app.get('/venues', { preHandler: optionalAuth }, async (request, reply) => {
    const query = searchVenuesSchema.parse(request.query);

    const result = await venueService.searchVenues({
      query: query.query,
      city: query.city,
      venueType: query.venueType as VenueType | undefined,
      isFree: query.isFree,
      isIndoor: query.isIndoor,
      limit: query.limit || 20,
    });

    return reply.send(result);
  });

  /**
   * GET /venues/nearby
   * Find venues near coordinates
   */
  app.get('/venues/nearby', { preHandler: optionalAuth }, async (request, reply) => {
    const query = nearbyVenuesSchema.parse(request.query);

    const venues = await venueService.getNearbyVenues({
      latitude: query.latitude,
      longitude: query.longitude,
      radiusMiles: query.radiusMiles,
      venueType: query.venueType as VenueType | undefined,
      limit: query.limit,
    });

    return reply.send({ venues });
  });

  /**
   * GET /venues/:id
   * Get venue details
   */
  app.get('/venues/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;

    const venue = await venueService.getVenueById(id);
    if (!venue) {
      return reply.status(404).send({ error: 'Venue not found' });
    }

    // Get additional data
    const [recordTypes, stats, membership] = await Promise.all([
      venueService.getRecordTypesForVenue(id),
      venueService.getVenueStats(id),
      userId ? venueService.getMembership(id, userId) : null,
    ]);

    return reply.send({
      venue,
      recordTypes,
      stats,
      membership,
    });
  });

  /**
   * GET /venues/slug/:slug
   * Get venue by slug
   */
  app.get('/venues/slug/:slug', { preHandler: optionalAuth }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const venue = await venueService.getVenueBySlug(slug);
    if (!venue) {
      return reply.status(404).send({ error: 'Venue not found' });
    }

    return reply.send({ venue });
  });

  /**
   * POST /venues
   * Create a new venue
   */
  app.post('/venues', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const body = createVenueSchema.parse(request.body);

    const venue = await venueService.createVenue(
      {
        ...body,
        equipment: body.equipment as EquipmentType[] | undefined,
        venueType: body.venueType as VenueType,
      },
      userId
    );

    return reply.status(201).send({ venue });
  });

  /**
   * GET /venues/:id/record-types
   * Get available record types for a venue
   */
  app.get('/venues/:id/record-types', async (request, reply) => {
    const { id } = request.params as { id: string };

    const recordTypes = await venueService.getRecordTypesForVenue(id);
    return reply.send({ recordTypes });
  });

  /**
   * GET /venues/:id/leaderboard
   * Get venue leaderboards
   */
  app.get('/venues/:id/leaderboard', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { recordTypeId, limit } = request.query as { recordTypeId?: string; limit?: string };
    const userId = request.user?.userId;

    if (recordTypeId) {
      const leaderboard = await venueService.getVenueLeaderboard(id, recordTypeId, {
        limit: limit ? parseInt(limit) : 50,
        userId,
      });
      return reply.send({ leaderboard });
    } else {
      const leaderboards = await venueService.getVenueAllLeaderboards(id, userId);
      return reply.send({ leaderboards });
    }
  });

  /**
   * GET /venues/:id/members
   * Get venue members
   */
  app.get('/venues/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit } = request.query as { limit?: string };

    const result = await venueService.getVenueMembers(id, {
      limit: limit ? parseInt(limit) : 50,
    });

    return reply.send(result);
  });

  /**
   * POST /venues/:id/join
   * Join a venue
   */
  app.post('/venues/:id/join', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const membership = await venueService.joinVenue(id, userId);
    return reply.send({ membership });
  });

  /**
   * POST /venues/:id/leave
   * Leave a venue
   */
  app.post('/venues/:id/leave', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await venueService.leaveVenue(id, userId);
    return reply.send({ success: true });
  });

  // ============================================
  // CHECK-INS
  // ============================================

  /**
   * POST /venues/:id/checkin
   * Check in to a venue
   */
  app.post('/venues/:id/checkin', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = checkinSchema.parse(request.body);

    const checkin = await checkinService.checkin({
      venueId: id,
      userId,
      latitude: body.latitude,
      longitude: body.longitude,
      locationAccuracyMeters: body.locationAccuracyMeters,
      workoutId: body.workoutId,
    });

    return reply.send({ checkin });
  });

  /**
   * POST /venues/:id/checkout
   * Check out from a venue
   */
  app.post('/venues/:id/checkout', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await checkinService.checkout(id, userId);
    return reply.send({ success: true });
  });

  /**
   * GET /venues/:id/present
   * Get users currently at a venue
   */
  app.get('/venues/:id/present', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;

    const users = await checkinService.getUsersAtVenue(id, userId);
    return reply.send({ users, count: users.length });
  });

  /**
   * GET /me/checkin
   * Get user's current active checkin
   */
  app.get('/me/checkin', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const checkin = await checkinService.getActiveCheckin(userId);
    return reply.send({ checkin });
  });

  /**
   * GET /me/checkins
   * Get user's checkin history
   */
  app.get('/me/checkins', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { venueId, limit } = request.query as { venueId?: string; limit?: string };

    const result = await checkinService.getUserCheckinHistory(userId, {
      venueId,
      limit: limit ? parseInt(limit) : 50,
    });

    return reply.send(result);
  });

  // ============================================
  // RECORD CLAIMS
  // ============================================

  /**
   * POST /venues/:id/records/claim
   * Initiate a record claim
   */
  app.post('/venues/:id/records/claim', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = initiateClaimSchema.parse(request.body);

    const record = await recordClaimService.initiateClaim({
      venueId: id,
      recordTypeId: body.recordTypeId,
      userId,
      value: body.value,
      latitude: body.latitude,
      longitude: body.longitude,
      notes: body.notes,
      ipAddress: request.ip,
    });

    return reply.status(201).send({ record });
  });

  /**
   * POST /venue-records/:id/video
   * Upload video proof for a claim
   */
  app.post(
    '/venue-records/:id/video',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.userId;

      // Handle multipart upload
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No video file provided' });
      }

      // Validate file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
        });
      }

      const record = await recordClaimService.uploadVideo({
        recordId: id,
        userId,
        videoStream: data.file,
        originalFilename: data.filename,
        fileSizeBytes: data.file.readableLength,
      });

      return reply.send({ record });
    }
  );

  /**
   * POST /venue-records/:id/witness
   * Assign a witness to a claim
   */
  app.post('/venue-records/:id/witness', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = assignWitnessSchema.parse(request.body);

    const record = await recordClaimService.assignWitness({
      recordId: id,
      userId,
      witnessUserId: body.witnessUserId,
    });

    return reply.send({ record });
  });

  /**
   * GET /venue-records/:id
   * Get record details
   */
  app.get('/venue-records/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const record = await recordClaimService.getRecordWithDetails(id);
    if (!record) {
      return reply.status(404).send({ error: 'Record not found' });
    }

    return reply.send({ record });
  });

  /**
   * DELETE /venue-records/:id
   * Cancel a pending claim
   */
  app.delete('/venue-records/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await recordClaimService.cancelClaim(id, userId);
    return reply.send({ success: true });
  });

  /**
   * GET /me/venue-records
   * Get user's record claims
   */
  app.get('/me/venue-records', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { status, limit } = request.query as { status?: string; limit?: string };

    const result = await recordClaimService.getUserRecords(userId, {
      status: status as 'pending_witness' | 'verified' | 'rejected' | undefined,
      limit: limit ? parseInt(limit) : 50,
    });

    return reply.send(result);
  });

  /**
   * GET /me/current-records
   * Get user's current (verified) records
   */
  app.get('/me/current-records', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const records = await recordClaimService.getUserCurrentRecords(userId);
    return reply.send({ records });
  });

  // ============================================
  // WITNESS ATTESTATION
  // ============================================

  // NOTE: GET /me/witness-requests is defined in verifications.ts with more complete implementation

  /**
   * POST /venue-records/:id/attest
   * Submit witness attestation
   */
  app.post('/venue-records/:id/attest', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = witnessAttestationSchema.parse(request.body);

    const record = await recordClaimService.processWitnessAttestation({
      recordId: id,
      witnessUserId: userId,
      confirm: body.confirm,
      attestationText: body.attestationText,
      latitude: body.latitude,
      longitude: body.longitude,
    });

    return reply.send({ record });
  });

  // ============================================
  // RECORD TYPES
  // ============================================

  /**
   * GET /record-types
   * Get all record types
   */
  app.get('/record-types', async (_request, reply) => {
    const recordTypes = await venueService.getRecordTypes();
    return reply.send({ recordTypes });
  });

  log.info('Venue routes registered');
}

export default registerVenuesRoutes;
