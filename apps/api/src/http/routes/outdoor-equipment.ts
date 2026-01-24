/**
 * Outdoor Equipment Discovery Routes
 *
 * API endpoints for discovering outdoor exercise equipment locations,
 * including parks, recreation centers, and crowdsourced spots.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { venueService, crowdsourcingService, nycDataIngestionService, osmDataIngestionService } from '../../modules/venues';
import { authenticate, optionalAuth } from './auth';
import type { EquipmentType, VenueType } from '../../modules/venues/types';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const searchQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(100).max(10000).default(1000),
  equipment: z.string().optional(), // Comma-separated equipment types
  type: z.string().optional(), // Venue type filter
  borough: z.enum(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']).optional(),
  isFree: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

const nearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  equipment: z.string(), // Required equipment type
  limit: z.coerce.number().min(1).max(10).default(5),
});

const submitVenueSchema = z.object({
  name: z.string().min(3).max(200),
  venueType: z.enum(['park', 'recreation_center', 'outdoor_gym', 'calisthenics_park', 'public_gym', 'track', 'beach', 'playground', 'custom']),
  latitude: z.number().min(40.4).max(41.0),
  longitude: z.number().min(-74.3).max(-73.6),
  address: z.string().optional(),
  borough: z.enum(['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island']).optional(),
  postalCode: z.string().optional(),
  equipment: z.array(z.string()).min(1),
  hours: z.record(z.string()).optional(),
  isFree: z.boolean().optional(),
  is24Hour: z.boolean().optional(),
  photos: z.array(z.string().url()).optional(),
  notes: z.string().max(1000).optional(),
  howDiscovered: z.string().optional(),
  locationAccuracyMeters: z.number().optional(),
});

const verifyVenueSchema = z.object({
  latitude: z.number().min(40.4).max(41.0),
  longitude: z.number().min(-74.3).max(-73.6),
  notes: z.string().max(500).optional(),
});

const verifyEquipmentSchema = z.object({
  equipment: z.array(z.string()).min(1),
  accurate: z.boolean(),
  notes: z.string().max(500).optional(),
  latitude: z.number().min(40.4).max(41.0).optional(),
  longitude: z.number().min(-74.3).max(-73.6).optional(),
});

const addPhotoSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(500).optional(),
  photoType: z.enum(['general', 'equipment', 'entrance', 'surroundings', 'hours_sign', 'accessibility', 'condition_report']).optional(),
  equipmentShown: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const reportIssueSchema = z.object({
  reportType: z.enum([
    'incorrect_location',
    'equipment_missing',
    'equipment_broken',
    'venue_closed',
    'temporarily_closed',
    'unsafe',
    'incorrect_hours',
    'incorrect_info',
    'duplicate',
    'spam',
    'other',
  ]),
  description: z.string().min(10).max(1000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  photoUrls: z.array(z.string().url()).optional(),
  duplicateVenueId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const mapBoundsSchema = z.object({
  swLat: z.coerce.number().min(-90).max(90),
  swLng: z.coerce.number().min(-180).max(180),
  neLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().min(1).max(22).default(12),
  equipment: z.string().optional(),
});

// ============================================
// ROUTE DEFINITIONS
// ============================================

export default async function outdoorEquipmentRoutes(app: FastifyInstance): Promise<void> {
  // ============================================
  // LOCATION DISCOVERY
  // ============================================

  /**
   * Search for outdoor equipment locations
   * GET /api/v1/outdoor-equipment/locations
   */
  app.get('/locations', { preHandler: optionalAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = searchQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.errors });
    }

    const { lat, lng, radius, equipment, type, borough, isFree, limit, cursor } = query.data;

    // Parse equipment filter
    const equipmentFilter = equipment ? equipment.split(',').map((e) => e.trim()) as EquipmentType[] : undefined;

    // Parse cursor
    let cursorParsed: { createdAt: Date; id: string } | undefined;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        cursorParsed = { createdAt: new Date(decoded.createdAt), id: decoded.id };
      } catch {
        return reply.status(400).send({ error: 'Invalid cursor format' });
      }
    }

    // If lat/lng provided, use nearby search
    if (lat !== undefined && lng !== undefined) {
      const venues = await venueService.getNearbyVenues({
        latitude: lat,
        longitude: lng,
        radiusMiles: radius / 1609.34, // Convert meters to miles
        venueType: type as VenueType,
        limit,
      });

      // Filter by equipment if specified
      const filtered = equipmentFilter
        ? venues.filter((v) => equipmentFilter.some((eq) => v.equipment.includes(eq)))
        : venues;

      return reply.send({
        locations: filtered,
        total: filtered.length,
        searchCenter: { lat, lng },
        searchRadius: radius,
      });
    }

    // Otherwise use search with filters
    const result = await venueService.searchVenues({
      city: borough,
      venueType: type as VenueType,
      hasEquipment: equipmentFilter,
      isFree,
      limit,
      cursor: cursorParsed,
    });

    // Generate next cursor
    let nextCursor: string | undefined;
    if (result.hasMore && result.venues.length > 0) {
      const lastVenue = result.venues[result.venues.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: lastVenue.createdAt.toISOString(), id: lastVenue.id })
      ).toString('base64');
    }

    return reply.send({
      locations: result.venues,
      hasMore: result.hasMore,
      nextCursor,
    });
  });

  /**
   * Get nearest location with specific equipment
   * GET /api/v1/outdoor-equipment/locations/nearest
   */
  app.get('/locations/nearest', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = nearestQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: query.error.errors });
    }

    const { lat, lng, equipment, limit } = query.data;

    // Search for nearby venues with the specified equipment
    const venues = await venueService.getNearbyVenues({
      latitude: lat,
      longitude: lng,
      radiusMiles: 10, // Search within 10 miles
      limit: limit * 3, // Get more to filter
    });

    // Filter to those with the required equipment
    const filtered = venues.filter((v) => v.equipment.includes(equipment as EquipmentType));

    return reply.send({
      locations: filtered.slice(0, limit),
      searchCenter: { lat, lng },
      equipment,
    });
  });

  /**
   * Get location details
   * GET /api/v1/outdoor-equipment/locations/:id
   */
  app.get('/locations/:id', { preHandler: optionalAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user?.id;

    const venue = await venueService.getVenueById(id);
    if (!venue) {
      return reply.status(404).send({ error: 'Location not found' });
    }

    // Get additional data
    const [photos, membership, recordTypes] = await Promise.all([
      crowdsourcingService.getVenuePhotos(id),
      userId ? venueService.getMembership(id, userId) : null,
      venueService.getRecordTypesForVenue(id),
    ]);

    return reply.send({
      location: venue,
      photos,
      membership,
      recordTypes,
    });
  });

  /**
   * Get location by slug
   * GET /api/v1/outdoor-equipment/locations/slug/:slug
   */
  app.get('/locations/slug/:slug', async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug: string };

    const venue = await venueService.getVenueBySlug(slug);
    if (!venue) {
      return reply.status(404).send({ error: 'Location not found' });
    }

    return reply.send({ location: venue });
  });

  /**
   * Get locations by borough
   * GET /api/v1/outdoor-equipment/boroughs/:borough
   */
  app.get('/boroughs/:borough', async (request: FastifyRequest, reply: FastifyReply) => {
    const { borough } = request.params as { borough: string };
    const { equipment, limit } = request.query as { equipment?: string; limit?: string };

    const validBoroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    if (!validBoroughs.includes(borough)) {
      return reply.status(400).send({ error: 'Invalid borough' });
    }

    const equipmentFilter = equipment ? equipment.split(',').map((e) => e.trim()) as EquipmentType[] : undefined;

    const venues = await nycDataIngestionService.getVenuesByBorough(
      borough as 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island',
      { limit: parseInt(limit || '100'), hasEquipment: equipmentFilter }
    );

    return reply.send({ locations: venues, borough });
  });

  // ============================================
  // MAP DATA ENDPOINTS
  // ============================================

  /**
   * Get clustered map data
   * GET /api/v1/outdoor-equipment/map/clusters
   */
  app.get('/map/clusters', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = mapBoundsSchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid bounds', details: query.error.errors });
    }

    const { swLat, swLng, neLat, neLng, zoom, equipment } = query.data;
    const equipmentFilter = equipment ? equipment.split(',').map((e) => e.trim()) as EquipmentType[] : undefined;

    // Get all venues in bounds
    // Note: This is a simplified implementation. For production, you'd want:
    // 1. PostGIS for efficient spatial queries
    // 2. Supercluster or similar for client-side clustering
    // 3. Pre-computed clusters at different zoom levels
    const venues = await venueService.searchVenues({
      hasEquipment: equipmentFilter,
      limit: 500,
    });

    // Filter to bounds
    const inBounds = venues.venues.filter(
      (v) => v.latitude >= swLat && v.latitude <= neLat && v.longitude >= swLng && v.longitude <= neLng
    );

    // Convert to GeoJSON
    const features = inBounds.map((v) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [v.longitude, v.latitude],
      },
      properties: {
        id: v.id,
        name: v.name,
        venueType: v.venueType,
        equipment: v.equipment,
        isVerified: v.isVerified,
        memberCount: v.memberCount,
      },
    }));

    // For low zoom levels, we'd cluster. For now, return all points.
    // In production, use Supercluster library
    const shouldCluster = zoom < 14 && features.length > 50;

    if (shouldCluster) {
      // Simple grid-based clustering
      const gridSize = 0.01 * Math.pow(2, 14 - zoom);
      const clusters = new Map<string, { lat: number; lng: number; count: number; ids: string[] }>();

      for (const f of features) {
        const gridLat = Math.floor(f.geometry.coordinates[1] / gridSize);
        const gridLng = Math.floor(f.geometry.coordinates[0] / gridSize);
        const key = `${gridLat},${gridLng}`;

        if (!clusters.has(key)) {
          clusters.set(key, {
            lat: (gridLat + 0.5) * gridSize,
            lng: (gridLng + 0.5) * gridSize,
            count: 0,
            ids: [],
          });
        }
        const cluster = clusters.get(key)!;
        cluster.count++;
        cluster.ids.push(f.properties.id);
      }

      const clusterFeatures = Array.from(clusters.values()).map((c) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [c.lng, c.lat],
        },
        properties: {
          cluster: true,
          point_count: c.count,
          cluster_id: `cluster-${c.lat}-${c.lng}`,
          venue_ids: c.ids,
        },
      }));

      return reply.send({
        type: 'FeatureCollection',
        features: clusterFeatures,
        clustered: true,
        totalPoints: features.length,
      });
    }

    return reply.send({
      type: 'FeatureCollection',
      features,
      clustered: false,
    });
  });

  /**
   * Get full GeoJSON export
   * GET /api/v1/outdoor-equipment/map/geojson
   */
  app.get('/map/geojson', async (request: FastifyRequest, reply: FastifyReply) => {
    const { borough, equipment } = request.query as { borough?: string; equipment?: string };

    const equipmentFilter = equipment ? equipment.split(',').map((e) => e.trim()) as EquipmentType[] : undefined;

    let venues;
    if (borough) {
      const validBoroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
      if (!validBoroughs.includes(borough)) {
        return reply.status(400).send({ error: 'Invalid borough' });
      }
      venues = await nycDataIngestionService.getVenuesByBorough(
        borough as 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island',
        { limit: 1000, hasEquipment: equipmentFilter }
      );
    } else {
      const result = await venueService.searchVenues({
        hasEquipment: equipmentFilter,
        limit: 1000,
      });
      venues = result.venues;
    }

    const features = venues.map((v) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [v.longitude, v.latitude],
      },
      properties: {
        id: v.id,
        name: v.name,
        slug: v.slug,
        venueType: v.venueType,
        address: v.address,
        equipment: v.equipment,
        isVerified: v.isVerified,
        isFree: v.isFree,
        hasCalisthenicsEquipment: v.hasCalisthenicsEquipment,
        hasFreeWeights: v.hasFreeWeights,
        hasCardioEquipment: v.hasCardioEquipment,
      },
    }));

    // Set cache headers for offline use
    reply.header('Cache-Control', 'public, max-age=3600'); // 1 hour

    return reply.send({
      type: 'FeatureCollection',
      features,
      generated: new Date().toISOString(),
    });
  });

  // ============================================
  // CROWDSOURCING ENDPOINTS
  // ============================================

  /**
   * Submit a new venue
   * POST /api/v1/outdoor-equipment/locations/submit
   */
  app.post('/locations/submit', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = submitVenueSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid submission data', details: body.error.errors });
    }

    const userId = (request as any).user.id;

    try {
      const submission = await crowdsourcingService.submitVenue(userId, body.data as any);
      return reply.status(201).send({
        submission,
        message: 'Venue submitted for review. You will be notified when it is approved.',
      });
    } catch (error: any) {
      if (error.message.includes('daily limit')) {
        return reply.status(429).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * Get user's submissions
   * GET /api/v1/outdoor-equipment/submissions
   */
  app.get('/submissions', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;
    const { status, limit } = request.query as { status?: string; limit?: string };

    const submissions = await crowdsourcingService.getUserSubmissions(userId, {
      status,
      limit: parseInt(limit || '50'),
    });

    return reply.send({ submissions });
  });

  /**
   * Verify venue exists ("I was here")
   * POST /api/v1/outdoor-equipment/locations/:id/verify
   */
  app.post('/locations/:id/verify', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = verifyVenueSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid verification data', details: body.error.errors });
    }

    const userId = (request as any).user.id;

    try {
      const contribution = await crowdsourcingService.verifyVenueExists(id, userId, body.data);
      return reply.send({
        contribution,
        message: 'Thank you for verifying this location!',
        creditsAwarded: contribution.creditsAwarded,
      });
    } catch (error: any) {
      if (error.message.includes('already verified')) {
        return reply.status(429).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * Verify equipment at venue
   * POST /api/v1/outdoor-equipment/locations/:id/verify-equipment
   */
  app.post('/locations/:id/verify-equipment', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = verifyEquipmentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid equipment data', details: body.error.errors });
    }

    const userId = (request as any).user.id;

    try {
      const contribution = await crowdsourcingService.verifyEquipment(id, userId, body.data as any);
      return reply.send({
        contribution,
        message: 'Equipment verification recorded!',
        creditsAwarded: contribution.creditsAwarded,
      });
    } catch (error: any) {
      if (error.message.includes('daily limit')) {
        return reply.status(429).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * Add photo to venue
   * POST /api/v1/outdoor-equipment/locations/:id/photos
   */
  app.post('/locations/:id/photos', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = addPhotoSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid photo data', details: body.error.errors });
    }

    const userId = (request as any).user.id;

    try {
      const photo = await crowdsourcingService.addPhoto(id, userId, body.data as any);
      return reply.status(201).send({
        photo,
        message: 'Photo added successfully!',
      });
    } catch (error: any) {
      if (error.message.includes('daily limit')) {
        return reply.status(429).send({ error: error.message });
      }
      throw error;
    }
  });

  /**
   * Report issue with venue
   * POST /api/v1/outdoor-equipment/locations/:id/report
   */
  app.post('/locations/:id/report', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = reportIssueSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid report data', details: body.error.errors });
    }

    const userId = (request as any).user.id;

    try {
      const report = await crowdsourcingService.reportIssue(id, userId, body.data as any);
      return reply.status(201).send({
        report,
        message: 'Issue report submitted. Thank you for helping improve our data!',
      });
    } catch (error: any) {
      if (error.message.includes('already reported')) {
        return reply.status(429).send({ error: error.message });
      }
      throw error;
    }
  });

  // ============================================
  // CONTRIBUTOR STATS
  // ============================================

  /**
   * Get contributor stats for current user
   * GET /api/v1/outdoor-equipment/contributor/stats
   */
  app.get('/contributor/stats', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.id;

    const stats = await crowdsourcingService.getContributorStats(userId);
    return reply.send({ stats });
  });

  /**
   * Get contributor leaderboard
   * GET /api/v1/outdoor-equipment/contributor/leaderboard
   */
  app.get('/contributor/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit } = request.query as { limit?: string };

    // Get top contributors by level and verifications
    const leaderboard = await venueService.getVenueStats; // Would implement separate leaderboard query

    return reply.send({ leaderboard: [] }); // Placeholder
  });

  // ============================================
  // EQUIPMENT TYPES
  // ============================================

  /**
   * Get all equipment types
   * GET /api/v1/outdoor-equipment/equipment-types
   */
  app.get('/equipment-types', async (request: FastifyRequest, reply: FastifyReply) => {
    // Static list of equipment types with metadata
    const equipmentTypes = [
      // Calisthenics
      { key: 'pull_up_bar', name: 'Pull-Up Bar', category: 'calisthenics', icon: '💪' },
      { key: 'parallel_bars', name: 'Parallel Bars', category: 'calisthenics', icon: '🤸' },
      { key: 'dip_station', name: 'Dip Station', category: 'calisthenics', icon: '💎' },
      { key: 'monkey_bars', name: 'Monkey Bars', category: 'calisthenics', icon: '🐒' },
      { key: 'rings', name: 'Gymnastics Rings', category: 'calisthenics', icon: '⭕' },
      { key: 'swedish_wall', name: 'Swedish Wall Bars', category: 'calisthenics', icon: '🪜' },
      { key: 'horizontal_bar', name: 'Horizontal Bar', category: 'calisthenics', icon: '➖' },

      // Strength Stations
      { key: 'ab_bench', name: 'Ab Bench', category: 'strength', icon: '🏋️' },
      { key: 'back_extension', name: 'Back Extension', category: 'strength', icon: '🔙' },
      { key: 'chest_press', name: 'Chest Press', category: 'strength', icon: '💪' },
      { key: 'lat_pull', name: 'Lat Pulldown', category: 'strength', icon: '⬇️' },
      { key: 'leg_press', name: 'Leg Press', category: 'strength', icon: '🦵' },
      { key: 'shoulder_press', name: 'Shoulder Press', category: 'strength', icon: '⬆️' },

      // Cardio
      { key: 'elliptical_outdoor', name: 'Outdoor Elliptical', category: 'cardio', icon: '🏃' },
      { key: 'stationary_bike_outdoor', name: 'Outdoor Bike', category: 'cardio', icon: '🚴' },
      { key: 'rowing_machine_outdoor', name: 'Outdoor Rower', category: 'cardio', icon: '🚣' },
      { key: 'stepper_outdoor', name: 'Outdoor Stepper', category: 'cardio', icon: '🪜' },

      // Multi-purpose
      { key: 'multi_station', name: 'Multi-Station', category: 'multi', icon: '🏋️' },
      { key: 'balance_beam', name: 'Balance Beam', category: 'multi', icon: '⚖️' },
      { key: 'box_jump_platform', name: 'Jump Platform', category: 'multi', icon: '📦' },

      // Recreation Center
      { key: 'weight_room', name: 'Weight Room', category: 'indoor', icon: '🏋️' },
      { key: 'cardio_room', name: 'Cardio Room', category: 'indoor', icon: '🏃' },
      { key: 'pool', name: 'Swimming Pool', category: 'indoor', icon: '🏊' },
      { key: 'basketball_court', name: 'Basketball Court', category: 'court', icon: '🏀' },
      { key: 'tennis_court', name: 'Tennis Court', category: 'court', icon: '🎾' },
      { key: 'track', name: 'Running Track', category: 'track', icon: '🏃' },
    ];

    // Cache response
    reply.header('Cache-Control', 'public, max-age=86400'); // 24 hours

    return reply.send({ equipmentTypes });
  });

  // ============================================
  // ADMIN: DATA INGESTION
  // ============================================

  /**
   * Trigger NYC Open Data sync (admin only)
   * POST /api/v1/outdoor-equipment/admin/sync/nyc
   */
  app.post('/admin/sync/nyc', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    // Start async ingestion
    nycDataIngestionService.ingestRecreationCenters()
      .then((result) => {
        console.log('NYC ingestion complete:', result);
      })
      .catch((error) => {
        console.error('NYC ingestion failed:', error);
      });

    return reply.send({
      message: 'NYC data sync started. Check sync logs for progress.',
    });
  });

  /**
   * Trigger OSM sync (admin only)
   * POST /api/v1/outdoor-equipment/admin/sync/osm
   */
  app.post('/admin/sync/osm', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    // Start async ingestion
    osmDataIngestionService.ingestOsmFitnessStations()
      .then((result) => {
        console.log('OSM ingestion complete:', result);
      })
      .catch((error) => {
        console.error('OSM ingestion failed:', error);
      });

    return reply.send({
      message: 'OSM data sync started. Check sync logs for progress.',
    });
  });

  /**
   * Get ingestion stats (admin)
   * GET /api/v1/outdoor-equipment/admin/stats
   */
  app.get('/admin/stats', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const [ingestionStats, syncLogs] = await Promise.all([
      nycDataIngestionService.getIngestionStats(),
      nycDataIngestionService.getRecentSyncLogs(undefined, 10),
    ]);

    return reply.send({
      ingestionStats,
      recentSyncs: syncLogs,
    });
  });

  /**
   * Get pending submissions (admin)
   * GET /api/v1/outdoor-equipment/admin/submissions/pending
   */
  app.get('/admin/submissions/pending', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { limit } = request.query as { limit?: string };
    const submissions = await crowdsourcingService.getPendingSubmissions(parseInt(limit || '50'));

    return reply.send({ submissions });
  });

  /**
   * Approve submission (admin)
   * POST /api/v1/outdoor-equipment/admin/submissions/:id/approve
   */
  app.post('/admin/submissions/:id/approve', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };
    const { notes } = (request.body as { notes?: string }) || {};

    const result = await crowdsourcingService.approveSubmission(id, user.id, { notes });

    return reply.send({
      submission: result.submission,
      venue: result.venue,
      message: 'Submission approved and venue created!',
    });
  });

  /**
   * Reject submission (admin)
   * POST /api/v1/outdoor-equipment/admin/submissions/:id/reject
   */
  app.post('/admin/submissions/:id/reject', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    if (user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };
    const { reason } = (request.body as { reason: string }) || {};

    if (!reason) {
      return reply.status(400).send({ error: 'Rejection reason required' });
    }

    const submission = await crowdsourcingService.rejectSubmission(id, user.id, reason);

    return reply.send({
      submission,
      message: 'Submission rejected.',
    });
  });
}
