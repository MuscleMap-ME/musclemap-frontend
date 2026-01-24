/**
 * GraphQL Resolvers for Outdoor Equipment / Fitness Venues
 *
 * Handles NYC outdoor exercise equipment discovery and crowdsourcing
 */

import { GraphQLError } from 'graphql';
import { queryOne, queryAll } from '../db/client';
import {
  crowdsourcingService,
  nycDataIngestionService,
  osmDataIngestionService,
  VenueSubmission,
  VenueContribution,
  VenuePhoto,
  VenueReport,
} from '../modules/venues';
import { VenueType, EquipmentType } from '../modules/venues/types';

// ============================================
// TYPES
// ============================================

interface Context {
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

interface VenueSearchInput {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  borough?: string;
  equipmentTypes?: string[];
  amenities?: string[];
  verifiedOnly?: boolean;
  hasPhotos?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
}

interface NearestVenuesInput {
  latitude: number;
  longitude: number;
  limit?: number;
  maxDistanceKm?: number;
  equipmentTypes?: string[];
}

interface ClusterInput {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
}

interface GeoJSONInput {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  equipmentTypes?: string[];
  verifiedOnly?: boolean;
  includePhotos?: boolean;
}

interface VenueSubmissionInput {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  borough?: string;
  description?: string;
  equipment: Array<{
    equipmentType: string;
    quantity?: number;
    condition?: string;
    notes?: string;
  }>;
  photoUrls?: string[];
}

interface VenueVerifyInput {
  exists: boolean;
  notes?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

interface EquipmentVerifyInput {
  equipmentItemId: string;
  exists: boolean;
  condition?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

interface VenuePhotoInput {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  equipmentItemId?: string;
}

interface VenueReportInput {
  reportType: string;
  description: string;
  severity?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function requireAuth(context: Context): { userId: string; email: string; roles: string[]; isAdmin: boolean } {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return {
    ...context.user,
    isAdmin: context.user.roles?.includes('admin') || false,
  };
}

function requireAdmin(context: Context): { userId: string; email: string; roles: string[]; isAdmin: boolean } {
  const user = requireAuth(context);
  if (!user.isAdmin) {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
}

// Transform database row to GraphQL OutdoorVenue type
interface VenueRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  latitude: string | number;
  longitude: string | number;
  address?: string;
  borough?: string;
  neighborhood?: string;
  venue_type: string;
  data_source?: string;
  external_id?: string;
  osm_id?: string;
  nyc_park_id?: string;
  amenities?: string[];
  surface_type?: string;
  lighting_available?: boolean;
  covered_area?: boolean;
  accessible_features?: string[];
  operating_hours?: Record<string, unknown>;
  seasonal_availability?: string;
  verification_count?: number;
  last_verified_at?: Date;
  average_rating?: string | number;
  total_ratings?: number;
  distance?: string | number;
  is_verified?: boolean;
  created_at: Date;
  updated_at: Date;
}

function transformVenue(row: VenueRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    latitude: parseFloat(String(row.latitude)),
    longitude: parseFloat(String(row.longitude)),
    address: row.address,
    borough: row.borough,
    neighborhood: row.neighborhood,
    venueType: row.venue_type,
    dataSource: row.data_source,
    externalId: row.external_id,
    osmId: row.osm_id,
    nycParkId: row.nyc_park_id,
    amenities: row.amenities || [],
    surfaceType: row.surface_type,
    lightingAvailable: row.lighting_available,
    coveredArea: row.covered_area,
    accessibleFeatures: row.accessible_features || [],
    operatingHours: row.operating_hours,
    seasonalAvailability: row.seasonal_availability,
    equipment: [], // Loaded by type resolver
    photos: [], // Loaded by type resolver
    verificationCount: row.verification_count || 0,
    lastVerifiedAt: row.last_verified_at,
    averageRating: row.average_rating ? parseFloat(String(row.average_rating)) : null,
    totalRatings: row.total_ratings || 0,
    distance: row.distance ? parseFloat(String(row.distance)) : null,
    isVerified: row.is_verified || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// OUTDOOR EQUIPMENT QUERY RESOLVERS
// ============================================

export const outdoorEquipmentQueries = {
  // Search/list venues with filters
  outdoorVenues: async (_: unknown, { input }: { input?: VenueSearchInput }) => {
    const limit = Math.min(input?.limit || 50, 100);
    const params: (string | number | string[])[] = [];
    let paramIndex = 1;

    // Calculate distance only if coordinates provided
    const hasCoords = input?.latitude != null && input?.longitude != null;

    let sql = `
      SELECT fv.*${hasCoords ? `,
        (
          6371 * acos(
            cos(radians($${paramIndex}::numeric)) * cos(radians(fv.latitude)) *
            cos(radians(fv.longitude) - radians($${paramIndex + 1}::numeric)) +
            sin(radians($${paramIndex}::numeric)) * sin(radians(fv.latitude))
          )
        ) as distance` : ', NULL as distance'}
      FROM fitness_venues fv
      WHERE fv.is_active = true
    `;

    if (hasCoords) {
      params.push(input!.latitude!, input!.longitude!);
      paramIndex += 2;
    }

    // Filter by radius if lat/lng provided
    if (hasCoords && input?.radiusKm) {
      sql += ` AND (
        6371 * acos(
          cos(radians($1::numeric)) * cos(radians(fv.latitude)) *
          cos(radians(fv.longitude) - radians($2::numeric)) +
          sin(radians($1::numeric)) * sin(radians(fv.latitude))
        )
      ) <= $${paramIndex}::numeric`;
      params.push(input.radiusKm);
      paramIndex++;
    }

    // Filter by borough
    if (input?.borough) {
      sql += ` AND fv.borough = $${paramIndex}`;
      params.push(input.borough);
      paramIndex++;
    }

    // Filter by search term
    if (input?.search) {
      sql += ` AND (fv.name ILIKE $${paramIndex} OR fv.address ILIKE $${paramIndex})`;
      params.push(`%${input.search}%`);
      paramIndex++;
    }

    // Filter by equipment types
    if (input?.equipmentTypes && input.equipmentTypes.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM venue_equipment_items vei
        WHERE vei.venue_id = fv.id AND vei.equipment_type = ANY($${paramIndex}::text[])
      )`;
      params.push(input.equipmentTypes);
      paramIndex++;
    }

    // Filter verified only
    if (input?.verifiedOnly) {
      sql += ` AND fv.is_verified = true`;
    }

    // Filter has photos
    if (input?.hasPhotos) {
      sql += ` AND EXISTS (SELECT 1 FROM venue_photos vp WHERE vp.venue_id = fv.id)`;
    }

    // Keyset pagination
    if (input?.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(input.cursor, 'base64').toString()) as { distance?: number; createdAt?: string; id: string };
        if (hasCoords && cursor.distance !== undefined) {
          // Distance-based pagination using $1 and $2 which are lat/lng
          sql += ` AND (
            (6371 * acos(
              cos(radians($1::numeric)) * cos(radians(fv.latitude)) *
              cos(radians(fv.longitude) - radians($2::numeric)) +
              sin(radians($1::numeric)) * sin(radians(fv.latitude))
            )) > $${paramIndex}::numeric
            OR ((6371 * acos(
              cos(radians($1::numeric)) * cos(radians(fv.latitude)) *
              cos(radians(fv.longitude) - radians($2::numeric)) +
              sin(radians($1::numeric)) * sin(radians(fv.latitude))
            )) = $${paramIndex}::numeric AND fv.id > $${paramIndex + 1})
          )`;
          params.push(cursor.distance, cursor.id);
          paramIndex += 2;
        } else if (cursor.createdAt) {
          sql += ` AND (fv.created_at, fv.id) < ($${paramIndex}::timestamptz, $${paramIndex + 1})`;
          params.push(cursor.createdAt, cursor.id);
          paramIndex += 2;
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Order by distance if coordinates provided, otherwise by created_at
    if (input?.latitude && input?.longitude) {
      sql += ` ORDER BY distance ASC NULLS LAST, fv.id ASC`;
    } else {
      sql += ` ORDER BY fv.created_at DESC, fv.id DESC`;
    }

    sql += ` LIMIT $${paramIndex}`;
    params.push(limit + 1); // +1 to check for next page

    const rows = await queryAll<VenueRow>(sql, params);
    const hasNextPage = rows.length > limit;
    const venues = rows.slice(0, limit).map(transformVenue);

    // Build cursors
    const edges = venues.map((venue) => {
      const cursorData = input?.latitude && input?.longitude
        ? { distance: venue.distance, id: venue.id }
        : { createdAt: venue.createdAt, id: venue.id };
      return {
        cursor: Buffer.from(JSON.stringify(cursorData)).toString('base64'),
        node: venue,
      };
    });

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM fitness_venues WHERE is_active = true`
    );

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!input?.cursor,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      totalCount: parseInt(countResult?.count || '0'),
    };
  },

  // Get single venue by ID
  outdoorVenue: async (_: unknown, { id }: { id: string }) => {
    const row = await queryOne<VenueRow>(
      `SELECT * FROM fitness_venues WHERE id = $1 AND is_active = true`,
      [id]
    );
    return row ? transformVenue(row) : null;
  },

  // Get venue by slug
  outdoorVenueBySlug: async (_: unknown, { slug }: { slug: string }) => {
    const row = await queryOne<VenueRow>(
      `SELECT * FROM fitness_venues WHERE slug = $1 AND is_active = true`,
      [slug]
    );
    return row ? transformVenue(row) : null;
  },

  // Get nearest venues
  nearestOutdoorVenues: async (_: unknown, { input }: { input: NearestVenuesInput }) => {
    const limit = Math.min(input.limit || 10, 50);
    const maxDistance = input.maxDistanceKm || 10;

    let sql = `
      SELECT fv.*,
        (6371 * acos(
          cos(radians($1::numeric)) * cos(radians(fv.latitude)) *
          cos(radians(fv.longitude) - radians($2::numeric)) +
          sin(radians($1::numeric)) * sin(radians(fv.latitude))
        )) as distance
      FROM fitness_venues fv
      WHERE fv.is_active = true
        AND (6371 * acos(
          cos(radians($1::numeric)) * cos(radians(fv.latitude)) *
          cos(radians(fv.longitude) - radians($2::numeric)) +
          sin(radians($1::numeric)) * sin(radians(fv.latitude))
        )) <= $3::numeric
    `;

    const params: (number | string[])[] = [input.latitude, input.longitude, maxDistance];
    let paramIndex = 4;

    if (input.equipmentTypes && input.equipmentTypes.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM venue_equipment_items vei
        WHERE vei.venue_id = fv.id AND vei.equipment_type = ANY($${paramIndex}::text[])
      )`;
      params.push(input.equipmentTypes);
      paramIndex++;
    }

    sql += ` ORDER BY distance ASC LIMIT $${paramIndex}`;
    params.push(limit as unknown as string[]);

    const rows = await queryAll<VenueRow>(sql, params);
    return rows.map(transformVenue);
  },

  // Get venues by borough
  venuesByBorough: async (_: unknown, { borough, limit, cursor }: { borough: string; limit?: number; cursor?: string }) => {
    const pageLimit = Math.min(limit || 50, 100);
    const params: (string | number)[] = [borough];
    let paramIndex = 2;

    let sql = `
      SELECT * FROM fitness_venues
      WHERE borough = $1 AND is_active = true
    `;

    if (cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString()) as { createdAt: string; id: string };
        sql += ` AND (created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1})`;
        params.push(cursorData.createdAt, cursorData.id);
        paramIndex += 2;
      } catch {
        // Invalid cursor
      }
    }

    sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
    params.push(pageLimit + 1);

    const rows = await queryAll<VenueRow>(sql, params);
    const hasNextPage = rows.length > pageLimit;
    const venues = rows.slice(0, pageLimit).map(transformVenue);

    const edges = venues.map((venue) => ({
      cursor: Buffer.from(JSON.stringify({ createdAt: venue.createdAt, id: venue.id })).toString('base64'),
      node: venue,
    }));

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM fitness_venues WHERE borough = $1 AND is_active = true`,
      [borough]
    );

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!cursor,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      totalCount: parseInt(countResult?.count || '0'),
    };
  },

  // Get all outdoor equipment types
  outdoorEquipmentTypes: async () => {
    // Return static equipment types from migration
    const types = [
      { id: 'pull_up_bar', name: 'Pull-Up Bar', slug: 'pull-up-bar', category: 'upper_body', description: 'Horizontal bar for pull-ups and chin-ups', iconName: 'grip-horizontal' },
      { id: 'parallel_bars', name: 'Parallel Bars', slug: 'parallel-bars', category: 'upper_body', description: 'Parallel bars for dips and leg raises', iconName: 'rows' },
      { id: 'monkey_bars', name: 'Monkey Bars', slug: 'monkey-bars', category: 'upper_body', description: 'Horizontal ladder for traversing', iconName: 'git-branch-plus' },
      { id: 'rings', name: 'Rings', slug: 'rings', category: 'upper_body', description: 'Gymnastic rings', iconName: 'circle-dot' },
      { id: 'dip_station', name: 'Dip Station', slug: 'dip-station', category: 'upper_body', description: 'Station for dips', iconName: 'arrow-down-to-line' },
      { id: 'ab_bench', name: 'Ab Bench', slug: 'ab-bench', category: 'core', description: 'Inclined bench for ab exercises', iconName: 'sliders-horizontal' },
      { id: 'sit_up_bench', name: 'Sit-Up Bench', slug: 'sit-up-bench', category: 'core', description: 'Bench with foot anchors for sit-ups', iconName: 'bed-single' },
      { id: 'balance_beam', name: 'Balance Beam', slug: 'balance-beam', category: 'balance', description: 'Beam for balance exercises', iconName: 'minus' },
      { id: 'stepping_stones', name: 'Stepping Stones', slug: 'stepping-stones', category: 'balance', description: 'Raised platforms for stepping/jumping', iconName: 'footprints' },
      { id: 'incline_bench', name: 'Incline Bench', slug: 'incline-bench', category: 'upper_body', description: 'Inclined bench for various exercises', iconName: 'trending-up' },
      { id: 'push_up_bars', name: 'Push-Up Bars', slug: 'push-up-bars', category: 'upper_body', description: 'Low bars for elevated push-ups', iconName: 'rectangle-horizontal' },
      { id: 'leg_press', name: 'Leg Press', slug: 'leg-press', category: 'lower_body', description: 'Outdoor leg press machine', iconName: 'arrow-big-down' },
      { id: 'leg_curl', name: 'Leg Curl', slug: 'leg-curl', category: 'lower_body', description: 'Leg curl machine', iconName: 'fold-horizontal' },
      { id: 'hip_twister', name: 'Hip Twister', slug: 'hip-twister', category: 'core', description: 'Rotating platform for core', iconName: 'refresh-cw' },
      { id: 'elliptical', name: 'Elliptical', slug: 'elliptical', category: 'cardio', description: 'Outdoor elliptical trainer', iconName: 'infinity' },
      { id: 'stationary_bike', name: 'Stationary Bike', slug: 'stationary-bike', category: 'cardio', description: 'Outdoor exercise bike', iconName: 'bike' },
      { id: 'rowing_machine', name: 'Rowing Machine', slug: 'rowing-machine', category: 'cardio', description: 'Outdoor rowing machine', iconName: 'sailboat' },
      { id: 'chest_press', name: 'Chest Press', slug: 'chest-press', category: 'upper_body', description: 'Outdoor chest press machine', iconName: 'expand' },
      { id: 'lat_pull', name: 'Lat Pull', slug: 'lat-pull', category: 'upper_body', description: 'Outdoor lat pulldown machine', iconName: 'arrow-down-from-line' },
      { id: 'vertical_climber', name: 'Vertical Climber', slug: 'vertical-climber', category: 'cardio', description: 'Vertical climbing machine', iconName: 'arrow-up' },
      { id: 'stretch_station', name: 'Stretch Station', slug: 'stretch-station', category: 'flexibility', description: 'Station for stretching', iconName: 'move' },
      { id: 'agility_ladder', name: 'Agility Ladder', slug: 'agility-ladder', category: 'agility', description: 'Floor ladder for footwork drills', iconName: 'ladder' },
      { id: 'vault_box', name: 'Vault Box', slug: 'vault-box', category: 'plyometric', description: 'Box for jumping and vaulting', iconName: 'box' },
      { id: 'rope_climb', name: 'Rope Climb', slug: 'rope-climb', category: 'upper_body', description: 'Climbing rope', iconName: 'cable' },
      { id: 'cargo_net', name: 'Cargo Net', slug: 'cargo-net', category: 'full_body', description: 'Net for climbing', iconName: 'grid-3x3' },
      { id: 'wall_bars', name: 'Wall Bars', slug: 'wall-bars', category: 'full_body', description: 'Swedish wall bars', iconName: 'columns' },
      { id: 'outdoor_gym_station', name: 'Outdoor Gym Station', slug: 'outdoor-gym-station', category: 'multi', description: 'Multi-function gym station', iconName: 'layout-grid' },
      { id: 'calisthenics_park', name: 'Calisthenics Park', slug: 'calisthenics-park', category: 'multi', description: 'Full calisthenics setup', iconName: 'layout-template' },
      { id: 'basketball_court', name: 'Basketball Court', slug: 'basketball-court', category: 'sports', description: 'Basketball court', iconName: 'circle' },
      { id: 'tennis_court', name: 'Tennis Court', slug: 'tennis-court', category: 'sports', description: 'Tennis court', iconName: 'square' },
      { id: 'running_track', name: 'Running Track', slug: 'running-track', category: 'cardio', description: 'Outdoor running track', iconName: 'waypoints' },
      { id: 'swimming_pool', name: 'Swimming Pool', slug: 'swimming-pool', category: 'cardio', description: 'Outdoor pool', iconName: 'waves' },
    ];

    return types.map(t => ({
      ...t,
      exercises: [], // Would be loaded by type resolver
      muscleGroups: getMuscleGroupsForEquipment(t.id),
    }));
  },

  // Get map clusters for venue visualization
  venueMapClusters: async (_: unknown, { input }: { input: ClusterInput }) => {
    const { bounds, zoom } = input;

    // Calculate grid size based on zoom level
    // Higher zoom = smaller grid = more granular clusters
    const gridSize = Math.max(0.001, 0.1 / Math.pow(2, zoom - 10));

    const sql = `
      WITH grid AS (
        SELECT
          floor(latitude / $5) * $5 as grid_lat,
          floor(longitude / $5) * $5 as grid_lng,
          array_agg(id) as venue_ids,
          count(*) as count
        FROM fitness_venues
        WHERE is_active = true
          AND latitude BETWEEN $1 AND $2
          AND longitude BETWEEN $3 AND $4
        GROUP BY grid_lat, grid_lng
      )
      SELECT
        md5(grid_lat::text || grid_lng::text) as id,
        grid_lat + ($5 / 2) as latitude,
        grid_lng + ($5 / 2) as longitude,
        count,
        CASE WHEN count = 1 THEN venue_ids[1] ELSE NULL END as single_venue_id,
        CASE WHEN count > 1 THEN $6 + 1 ELSE NULL END as expansion_zoom
      FROM grid
    `;

    interface ClusterRow {
      id: string;
      latitude: string;
      longitude: string;
      count: string;
      single_venue_id: string | null;
      expansion_zoom: number | null;
    }

    const rows = await queryAll<ClusterRow>(sql, [
      bounds.south, bounds.north,
      bounds.west, bounds.east,
      gridSize,
      zoom,
    ]);

    // For single-venue clusters, load the venue
    const singleVenueIds = rows.filter(r => r.single_venue_id).map(r => r.single_venue_id as string);
    let venueMap: Record<string, Record<string, unknown>> = {};

    if (singleVenueIds.length > 0) {
      const venues = await queryAll<VenueRow>(
        `SELECT * FROM fitness_venues WHERE id = ANY($1)`,
        [singleVenueIds]
      );
      venueMap = Object.fromEntries(venues.map(v => [v.id, transformVenue(v)]));
    }

    return rows.map(row => ({
      id: row.id,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      count: parseInt(row.count),
      expansion_zoom: row.expansion_zoom,
      venues: row.single_venue_id ? [venueMap[row.single_venue_id]] : null,
    }));
  },

  // Get GeoJSON for map rendering
  venueMapGeoJSON: async (_: unknown, { input }: { input?: GeoJSONInput }) => {
    const params: (number | string[])[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT
        fv.id, fv.name, fv.slug, fv.venue_type, fv.latitude, fv.longitude,
        fv.is_verified,
        (SELECT COUNT(*) FROM venue_equipment_items WHERE venue_id = fv.id) as equipment_count,
        EXISTS(SELECT 1 FROM venue_photos WHERE venue_id = fv.id) as has_photos
      FROM fitness_venues fv
      WHERE fv.is_active = true
    `;

    if (input?.bounds) {
      sql += ` AND fv.latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}
               AND fv.longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`;
      params.push(input.bounds.south, input.bounds.north, input.bounds.west, input.bounds.east);
      paramIndex += 4;
    }

    if (input?.equipmentTypes && input.equipmentTypes.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM venue_equipment_items vei
        WHERE vei.venue_id = fv.id AND vei.equipment_type = ANY($${paramIndex}::text[])
      )`;
      params.push(input.equipmentTypes);
      paramIndex++;
    }

    if (input?.verifiedOnly) {
      sql += ` AND fv.is_verified = true`;
    }

    interface GeoJSONRow {
      id: string;
      name: string;
      slug: string;
      venue_type: string;
      latitude: string;
      longitude: string;
      is_verified: boolean;
      equipment_count: string;
      has_photos: boolean;
    }

    const rows = await queryAll<GeoJSONRow>(sql, params);

    const features = rows.map(row => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)],
      },
      properties: {
        id: row.id,
        name: row.name,
        slug: row.slug,
        venueType: row.venue_type,
        equipmentCount: parseInt(row.equipment_count),
        hasPhotos: row.has_photos,
        isVerified: row.is_verified,
        clusterExpansion: false,
        pointCount: 1,
      },
    }));

    // Calculate bounds
    let bounds = null;
    if (rows.length > 0) {
      const lats = rows.map(r => parseFloat(r.latitude));
      const lngs = rows.map(r => parseFloat(r.longitude));
      bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      };
    }

    return {
      type: 'FeatureCollection',
      features,
      totalCount: rows.length,
      bounds,
    };
  },

  // Get user's venue submissions
  myVenueSubmissions: async (_: unknown, { status }: { status?: string }, context: Context) => {
    const { userId } = requireAuth(context);

    let sql = `SELECT * FROM venue_submissions WHERE user_id = $1`;
    const params: string[] = [userId];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY submitted_at DESC`;

    const rows = await queryAll(sql, params);
    return rows.map(transformSubmission);
  },

  // Get contributor stats for current user
  myContributorStats: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);
    return crowdsourcingService.getContributorStats(userId);
  },

  // Get contributor leaderboard
  contributorLeaderboard: async (_: unknown, { limit }: { limit?: number }) => {
    const pageLimit = Math.min(limit || 20, 100);

    interface LeaderboardRow {
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      total_contributions: number;
      venues_submitted: number;
      venues_approved: number;
      verifications_count: number;
      photos_uploaded: number;
      reports_submitted: number;
      total_credits_earned: number;
      contributor_level: number;
    }

    const rows = await queryAll<LeaderboardRow>(`
      SELECT
        uvcs.*,
        u.username, u.display_name, u.avatar_url
      FROM user_venue_contribution_stats uvcs
      JOIN users u ON u.id = uvcs.user_id
      ORDER BY uvcs.total_contributions DESC
      LIMIT $1
    `, [pageLimit]);

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      user: {
        id: row.user_id,
        username: row.username,
        displayName: row.display_name,
        avatar: row.avatar_url,
      },
      stats: buildContributorStats(row),
      score: row.total_contributions,
    }));
  },

  // Get photos for a venue
  venuePhotos: async (_: unknown, { venueId }: { venueId: string }) => {
    const rows = await queryAll(`
      SELECT vp.*, u.username, u.display_name, u.avatar_url
      FROM venue_photos vp
      JOIN users u ON u.id = vp.user_id
      WHERE vp.venue_id = $1
      ORDER BY vp.is_primary DESC, vp.uploaded_at DESC
    `, [venueId]);

    return rows.map(transformPhoto);
  },

  // Get sync stats (admin)
  venueSyncStats: async (_: unknown, __: unknown, context: Context) => {
    requireAdmin(context);

    interface StatsRow {
      last_nyc_sync: Date | null;
      last_osm_sync: Date | null;
      total_venues: string;
      nyc_venues: string;
      osm_venues: string;
      crowdsourced_venues: string;
      pending_submissions: string;
      total_equipment: string;
      total_photos: string;
      total_contributors: string;
    }

    const stats = await queryOne<StatsRow>(`
      SELECT
        (SELECT MAX(completed_at) FROM venue_data_sync_log WHERE data_source = 'nyc_open_data') as last_nyc_sync,
        (SELECT MAX(completed_at) FROM venue_data_sync_log WHERE data_source = 'osm') as last_osm_sync,
        (SELECT COUNT(*) FROM fitness_venues WHERE is_active = true) as total_venues,
        (SELECT COUNT(*) FROM fitness_venues WHERE data_source = 'nyc_open_data') as nyc_venues,
        (SELECT COUNT(*) FROM fitness_venues WHERE data_source = 'osm') as osm_venues,
        (SELECT COUNT(*) FROM fitness_venues WHERE data_source = 'crowdsourced') as crowdsourced_venues,
        (SELECT COUNT(*) FROM venue_submissions WHERE status = 'pending') as pending_submissions,
        (SELECT COUNT(*) FROM venue_equipment_items) as total_equipment,
        (SELECT COUNT(*) FROM venue_photos) as total_photos,
        (SELECT COUNT(DISTINCT user_id) FROM venue_contributions) as total_contributors
    `);

    return {
      lastNycSync: stats?.last_nyc_sync,
      lastOsmSync: stats?.last_osm_sync,
      totalVenues: parseInt(stats?.total_venues || '0'),
      nycVenues: parseInt(stats?.nyc_venues || '0'),
      osmVenues: parseInt(stats?.osm_venues || '0'),
      crowdsourcedVenues: parseInt(stats?.crowdsourced_venues || '0'),
      pendingSubmissions: parseInt(stats?.pending_submissions || '0'),
      totalEquipment: parseInt(stats?.total_equipment || '0'),
      totalPhotos: parseInt(stats?.total_photos || '0'),
      totalContributors: parseInt(stats?.total_contributors || '0'),
    };
  },

  // Get pending submissions (admin)
  pendingVenueSubmissions: async (_: unknown, { limit }: { limit?: number }, context: Context) => {
    requireAdmin(context);
    const pageLimit = Math.min(limit || 50, 100);

    const rows = await queryAll(`
      SELECT vs.*, u.username, u.display_name, u.avatar_url
      FROM venue_submissions vs
      JOIN users u ON u.id = vs.user_id
      WHERE vs.status = 'pending'
      ORDER BY vs.submitted_at ASC
      LIMIT $1
    `, [pageLimit]);

    return rows.map(transformSubmission);
  },

  // Find venues that have equipment for a specific exercise
  venuesForExercise: async (
    _: unknown,
    { exerciseId, latitude, longitude, maxDistanceKm, limit }: {
      exerciseId: string;
      latitude?: number;
      longitude?: number;
      maxDistanceKm?: number;
      limit?: number;
    }
  ) => {
    const pageLimit = Math.min(limit || 20, 50);
    const maxDist = maxDistanceKm || 10; // Default 10km radius

    // Get exercise equipment requirements
    interface ExerciseRow {
      id: string;
      name: string;
      equipment_required: string[];
      locations: string[];
    }

    const exercise = await queryOne<ExerciseRow>(
      `SELECT id, name, equipment_required, locations FROM exercises WHERE id = $1`,
      [exerciseId]
    );

    if (!exercise) {
      throw new GraphQLError('Exercise not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Map exercise equipment to venue equipment types
    // The keys mostly align but some need mapping
    const equipmentMap: Record<string, string[]> = {
      // Exercise equipment → venue equipment types
      pullup_bar: ['pull_up_bar', 'monkey_bars', 'rings', 'swedish_wall'],
      pull_up_bar: ['pull_up_bar', 'monkey_bars', 'rings'],
      dip_bars: ['dip_bars', 'dip_station', 'parallel_bars'],
      dip_station: ['dip_station', 'dip_bars', 'parallel_bars'],
      parallel_bars: ['parallel_bars', 'dip_bars', 'dip_station'],
      barbell: ['barbell', 'bench_press', 'squat_rack', 'weight_room'],
      dumbbells: ['dumbbells', 'weight_room'],
      kettlebell: ['dumbbells', 'weight_room'], // Kettlebells often at same locations
      trx: ['rings', 'pull_up_bar'], // TRX alternatives
      bands: ['pull_up_bar', 'swedish_wall'], // Can use at these locations
      rings: ['rings', 'pull_up_bar'],
      squat_rack: ['squat_rack', 'weight_room'],
      flat_bench: ['bench_press', 'weight_room'],
      adjustable_bench: ['bench_press', 'weight_room'],
      cable_machine: ['cable_machine', 'multi_station'],
      lat_pulldown: ['lat_pull', 'cable_machine', 'multi_station'],
      leg_press: ['leg_press', 'weight_room'],
    };

    // Get all relevant venue equipment types for this exercise
    const exerciseEquipment = exercise.equipment_required || [];
    const venueEquipmentTypes: string[] = [];

    for (const eq of exerciseEquipment) {
      const mappedTypes = equipmentMap[eq] || [eq];
      venueEquipmentTypes.push(...mappedTypes);
    }

    // Also check if exercise can be done at parks (bodyweight)
    const canDoAtPark = (exercise.locations || []).includes('park') ||
                        exerciseEquipment.length === 0; // Bodyweight

    // Use NYC center as default if no coordinates provided
    const searchLat = latitude ?? 40.7128;
    const searchLng = longitude ?? -74.006;

    // Build the query
    const params: (string | number | string[] | null)[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT DISTINCT fv.*,
        (
          6371 * acos(
            cos(radians($${paramIndex}::numeric)) * cos(radians(fv.latitude)) *
            cos(radians(fv.longitude) - radians($${paramIndex + 1}::numeric)) +
            sin(radians($${paramIndex}::numeric)) * sin(radians(fv.latitude))
          )
        ) as distance
      FROM fitness_venues fv
      WHERE fv.is_active = true
    `;

    params.push(searchLat, searchLng);
    paramIndex += 2;

    // Filter by distance
    sql += ` AND (
      6371 * acos(
        cos(radians($${paramIndex}::numeric)) * cos(radians(fv.latitude)) *
        cos(radians(fv.longitude) - radians($${paramIndex + 1}::numeric)) +
        sin(radians($${paramIndex}::numeric)) * sin(radians(fv.latitude))
      )
    ) <= $${paramIndex + 2}::numeric`;
    params.push(searchLat, searchLng, maxDist);
    paramIndex += 3;

    // Filter by equipment if exercise requires any
    if (venueEquipmentTypes.length > 0) {
      sql += ` AND EXISTS (
        SELECT 1 FROM venue_equipment_items vei
        WHERE vei.venue_id = fv.id AND vei.equipment_type = ANY($${paramIndex}::text[])
      )`;
      params.push([...new Set(venueEquipmentTypes)]); // Dedupe
      paramIndex++;
    } else if (canDoAtPark) {
      // Bodyweight exercise - include calisthenics parks and outdoor gyms
      sql += ` AND fv.venue_type IN ('calisthenics_park', 'outdoor_gym', 'park', 'recreation_center')`;
    }

    // Order by distance
    sql += ` ORDER BY distance ASC NULLS LAST LIMIT $${paramIndex}`;
    params.push(pageLimit);

    const rows = await queryAll<VenueRow>(sql, params);

    return {
      exercise: {
        id: exercise.id,
        name: exercise.name,
        equipmentRequired: exercise.equipment_required || [],
        locations: exercise.locations || [],
      },
      venues: rows.map(transformVenue),
      totalFound: rows.length,
      searchRadius: maxDist,
    };
  },

  // Find exercises that can be done at a specific venue
  exercisesAtVenue: async (
    _: unknown,
    { venueId, muscleGroup, limit }: { venueId: string; muscleGroup?: string; limit?: number }
  ) => {
    const pageLimit = Math.min(limit || 50, 100);

    // Get venue equipment
    interface EquipmentRow {
      equipment_type: string;
    }

    const venueEquipment = await queryAll<EquipmentRow>(
      `SELECT DISTINCT equipment_type FROM venue_equipment_items WHERE venue_id = $1`,
      [venueId]
    );

    if (venueEquipment.length === 0) {
      // Return bodyweight exercises if venue has no equipment listed
      const params: (string | number)[] = [];
      let paramIndex = 1;

      let sql = `
        SELECT id, name, primary_muscles, equipment_required, description, difficulty
        FROM exercises
        WHERE (equipment_required IS NULL OR equipment_required = '[]'::jsonb)
        AND is_active = true
      `;

      if (muscleGroup) {
        // primary_muscles is a comma-separated text field
        sql += ` AND primary_muscles ILIKE '%' || $${paramIndex} || '%'`;
        params.push(muscleGroup);
        paramIndex++;
      }

      sql += ` ORDER BY name LIMIT $${paramIndex}`;
      params.push(pageLimit);

      const exercises = await queryAll(sql, params);
      return exercises;
    }

    // Map venue equipment back to exercise equipment
    const exerciseEquipmentMap: Record<string, string[]> = {
      pull_up_bar: ['pullup_bar', 'pull_up_bar'],
      dip_bars: ['dip_bars', 'dip_station'],
      dip_station: ['dip_bars', 'dip_station'],
      parallel_bars: ['dip_bars', 'parallel_bars'],
      monkey_bars: ['pullup_bar'],
      rings: ['rings', 'trx'],
      swedish_wall: ['pullup_bar'],
      bench_press: ['flat_bench', 'barbell'],
      squat_rack: ['squat_rack', 'barbell'],
      barbell: ['barbell'],
      dumbbells: ['dumbbells', 'kettlebell'],
      weight_room: ['barbell', 'dumbbells', 'cable_machine'],
      cable_machine: ['cable_machine', 'lat_pulldown'],
      multi_station: ['cable_machine'],
      lat_pull: ['lat_pulldown'],
    };

    const exerciseEquipmentTypes: string[] = [];
    for (const ve of venueEquipment) {
      const mapped = exerciseEquipmentMap[ve.equipment_type] || [ve.equipment_type];
      exerciseEquipmentTypes.push(...mapped);
    }

    const uniqueEquipment = [...new Set(exerciseEquipmentTypes)];

    // Find exercises that require only equipment available at this venue (or bodyweight)
    const params: (string | string[] | number)[] = [];
    let paramIndex = 1;

    let sql = `
      SELECT id, name, primary_muscles, equipment_required, description, difficulty
      FROM exercises
      WHERE is_active = true
      AND (
        equipment_required IS NULL
        OR equipment_required = '[]'::jsonb
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(equipment_required) eq
          WHERE eq = ANY($${paramIndex}::text[])
        )
      )
    `;
    params.push(uniqueEquipment);
    paramIndex++;

    if (muscleGroup) {
      // primary_muscles is a comma-separated text field
      sql += ` AND primary_muscles ILIKE '%' || $${paramIndex} || '%'`;
      params.push(muscleGroup);
      paramIndex++;
    }

    sql += ` ORDER BY name LIMIT $${paramIndex}`;
    params.push(pageLimit);

    const exercises = await queryAll(sql, params);
    return exercises;
  },
};

// ============================================
// OUTDOOR EQUIPMENT MUTATION RESOLVERS
// ============================================

export const outdoorEquipmentMutations = {
  // Submit a new venue
  submitVenue: async (_: unknown, { input }: { input: VenueSubmissionInput }, context: Context) => {
    const { userId } = requireAuth(context);

    // Map equipment input to EquipmentType array
    const equipmentTypes = input.equipment.map(e => e.equipmentType as EquipmentType);

    const submission = await crowdsourcingService.submitVenue(userId, {
      name: input.name,
      venueType: 'outdoor_gym' as VenueType,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      borough: input.borough,
      equipment: equipmentTypes,
      photos: input.photoUrls,
      notes: input.description,
    });

    return {
      success: true,
      submission: transformSubmission(submission),
      creditsEarned: submission.creditsAwarded,
      message: 'Venue submitted for review',
    };
  },

  // Verify a venue exists
  verifyVenue: async (_: unknown, { venueId, input }: { venueId: string; input: VenueVerifyInput }, context: Context) => {
    const { userId } = requireAuth(context);

    if (!input.latitude || !input.longitude) {
      throw new GraphQLError('Location coordinates are required for verification', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const contribution = await crowdsourcingService.verifyVenueExists(venueId, userId, {
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
    });

    return {
      success: true,
      contribution: transformContribution(contribution),
      creditsEarned: contribution.creditsAwarded,
      message: input.exists ? 'Venue verified as existing' : 'Thank you for reporting',
    };
  },

  // Verify equipment at a venue
  verifyEquipment: async (_: unknown, { venueId, input }: { venueId: string; input: EquipmentVerifyInput }, context: Context) => {
    const { userId } = requireAuth(context);

    if (!input.latitude || !input.longitude) {
      throw new GraphQLError('Location coordinates are required for verification', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Get the equipment type for this item
    const equipmentItem = await queryOne<{ equipment_type: string }>(
      `SELECT equipment_type FROM venue_equipment_items WHERE id = $1`,
      [input.equipmentItemId]
    );

    const contribution = await crowdsourcingService.verifyEquipment(venueId, userId, {
      equipment: equipmentItem ? [equipmentItem.equipment_type as EquipmentType] : [],
      accurate: input.exists,
      notes: input.notes,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    return {
      success: true,
      contribution: transformContribution(contribution),
      creditsEarned: contribution.creditsAwarded,
      message: 'Equipment verification recorded',
    };
  },

  // Upload a photo
  uploadVenuePhoto: async (_: unknown, { venueId, input }: { venueId: string; input: VenuePhotoInput }, context: Context) => {
    const { userId } = requireAuth(context);

    const photo = await crowdsourcingService.addPhoto(venueId, userId, {
      url: input.url,
      thumbnailUrl: input.thumbnailUrl,
      caption: input.caption,
    });

    return {
      success: true,
      photo: transformPhoto(photo),
      creditsEarned: 25, // CONTRIBUTION_CREDITS.ADD_PHOTO
      message: 'Photo uploaded successfully',
    };
  },

  // Report an issue
  reportVenueIssue: async (_: unknown, { venueId, input }: { venueId: string; input: VenueReportInput }, context: Context) => {
    const { userId } = requireAuth(context);

    const report = await crowdsourcingService.reportIssue(venueId, userId, {
      reportType: input.reportType,
      description: input.description,
      severity: (input.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
    });

    return {
      success: true,
      report: transformReport(report),
      creditsEarned: report.creditsAwarded,
      message: 'Issue reported successfully',
    };
  },

  // Admin: Sync NYC data
  syncNycData: async (_: unknown, __: unknown, context: Context) => {
    requireAdmin(context); // Just verify admin, userId not needed for sync

    try {
      const result = await nycDataIngestionService.ingestRecreationCenters();
      return {
        success: true,
        message: 'NYC data sync completed',
        venuesCreated: result.created,
        venuesUpdated: result.updated,
        errors: [],
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: err.message,
        venuesCreated: 0,
        venuesUpdated: 0,
        errors: [err.message],
      };
    }
  },

  // Admin: Sync OSM data
  syncOsmData: async (_: unknown, __: unknown, context: Context) => {
    requireAdmin(context); // Just verify admin, userId not needed for sync

    try {
      const result = await osmDataIngestionService.ingestOsmFitnessStations();
      return {
        success: true,
        message: 'OSM data sync completed',
        venuesCreated: result.created,
        venuesUpdated: result.updated,
        errors: [],
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: err.message,
        venuesCreated: 0,
        venuesUpdated: 0,
        errors: [err.message],
      };
    }
  },

  // Admin: Approve submission
  approveVenueSubmission: async (_: unknown, { submissionId, notes }: { submissionId: string; notes?: string }, context: Context) => {
    const { userId } = requireAdmin(context);

    const result = await crowdsourcingService.approveSubmission(submissionId, userId, { notes });

    return {
      success: true,
      submission: transformSubmission(result.submission),
      venue: result.venue ? transformVenue(result.venue as unknown as VenueRow) : null,
      message: 'Submission approved and venue created',
    };
  },

  // Admin: Reject submission
  rejectVenueSubmission: async (_: unknown, { submissionId, reason }: { submissionId: string; reason: string }, context: Context) => {
    const { userId } = requireAdmin(context);

    const submission = await crowdsourcingService.rejectSubmission(submissionId, userId, reason);

    return {
      success: true,
      submission: transformSubmission(submission),
      venue: null,
      message: 'Submission rejected',
    };
  },
};

// ============================================
// TYPE RESOLVERS
// ============================================

export const outdoorEquipmentTypeResolvers = {
  OutdoorVenue: {
    equipment: async (parent: { id: string }) => {
      const rows = await queryAll(`
        SELECT * FROM venue_equipment_items
        WHERE venue_id = $1
        ORDER BY equipment_type
      `, [parent.id]);

      return rows.map(transformEquipmentItem);
    },

    photos: async (parent: { id: string }) => {
      const rows = await queryAll(`
        SELECT vp.*, u.username, u.display_name, u.avatar_url
        FROM venue_photos vp
        JOIN users u ON u.id = vp.user_id
        WHERE vp.venue_id = $1
        ORDER BY vp.is_primary DESC, vp.uploaded_at DESC
        LIMIT 10
      `, [parent.id]);

      return rows.map(transformPhoto);
    },
  },

  VenueEquipmentItem: {
    equipmentType: (parent: Record<string, unknown>) => {
      // Return the equipment type object - equipment_type is stored in the transform output
      const equipmentTypeId = parent.equipment_type as string;
      return getEquipmentTypeById(equipmentTypeId);
    },

    photos: async (parent: Record<string, unknown>) => {
      const venueId = parent.venue_id as string;
      const equipmentTypeId = parent.equipment_type as string;
      const rows = await queryAll(`
        SELECT vp.*, u.username, u.display_name, u.avatar_url
        FROM venue_photos vp
        JOIN users u ON u.id = vp.user_id
        WHERE vp.venue_id = $1 AND vp.equipment_shown @> $2::jsonb
        ORDER BY vp.uploaded_at DESC
      `, [venueId, JSON.stringify([equipmentTypeId])]);

      return rows.map(transformPhoto);
    },
  },

  VenuePhoto: {
    uploadedBy: async (parent: { user_id: string }) => {
      const user = await queryOne<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.user_id]
      );
      return user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
      } : null;
    },
  },

  VenueSubmission: {
    submittedBy: async (parent: { user_id: string }) => {
      const user = await queryOne<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.user_id]
      );
      return user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
      } : null;
    },

    photos: async (_parent: { id: string }) => {
      // Venue submissions store photo URLs in the photo_urls array field
      // For now return empty array - could expand to store in separate table
      return [];
    },
  },

  VenueContribution: {
    user: async (parent: { user_id: string }) => {
      const user = await queryOne<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.user_id]
      );
      return user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
      } : null;
    },
  },

  VenueReport: {
    reportedBy: async (parent: { user_id: string }) => {
      const user = await queryOne<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.user_id]
      );
      return user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
      } : null;
    },
  },

  ContributorLeaderboardEntry: {
    user: async (parent: { userId: string }) => {
      const user = await queryOne<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.userId]
      );
      return user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
      } : null;
    },
  },
};

// ============================================
// TRANSFORM HELPERS
// ============================================

function transformSubmission(row: Record<string, unknown> | VenueSubmission): Record<string, unknown> {
  // Handle typed VenueSubmission from service
  if ('proposedName' in row) {
    const submission = row as VenueSubmission;
    return {
      id: submission.id,
      name: submission.proposedName,
      latitude: submission.latitude,
      longitude: submission.longitude,
      address: submission.proposedAddress,
      borough: submission.proposedBorough,
      description: submission.notes,
      equipment: submission.proposedEquipment || [],
      photos: [],
      status: submission.status,
      submittedBy: null,
      user_id: submission.userId,
      reviewNotes: submission.reviewerNotes,
      createdAt: submission.submittedAt,
      updatedAt: submission.reviewedAt,
    };
  }
  // Handle raw database row
  return {
    id: row.id,
    name: row.proposed_name || row.name,
    latitude: parseFloat(String(row.latitude)),
    longitude: parseFloat(String(row.longitude)),
    address: row.proposed_address || row.address,
    borough: row.proposed_borough || row.borough,
    description: row.notes || row.description,
    equipment: row.proposed_equipment || row.equipment || [],
    photos: [], // Loaded by type resolver
    status: row.status,
    submittedBy: null, // Loaded by type resolver
    user_id: row.user_id, // For type resolver
    reviewNotes: row.reviewer_notes || row.review_notes,
    createdAt: row.submitted_at || row.created_at,
    updatedAt: row.reviewed_at || row.updated_at,
  };
}

function transformEquipmentItem(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    venueId: row.venue_id,
    equipmentType: null, // Loaded by type resolver
    equipment_type: row.equipment_type, // For type resolver
    brand: row.brand,
    model: row.model,
    condition: row.condition,
    installDate: row.install_date,
    quantity: row.quantity || 1,
    notes: row.notes,
    isVerified: row.is_verified,
    lastVerifiedAt: row.last_verified_at,
    verificationCount: row.verification_count || 0,
    photos: [], // Loaded by type resolver
    venue_id: row.venue_id, // For type resolver
  };
}

function transformPhoto(row: Record<string, unknown> | VenuePhoto): Record<string, unknown> {
  // Handle typed VenuePhoto from service
  if ('venueId' in row && typeof row.venueId === 'string') {
    const photo = row as VenuePhoto;
    return {
      id: photo.id,
      venueId: photo.venueId,
      equipmentItemId: null,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      caption: photo.caption,
      uploadedBy: null,
      user_id: photo.userId,
      verificationCount: 0,
      isFeatured: photo.isPrimary,
      createdAt: photo.uploadedAt,
    };
  }
  // Handle raw database row - type assertion for untyped database rows
  const dbRow = row as Record<string, unknown>;
  return {
    id: dbRow.id,
    venueId: dbRow.venue_id,
    equipmentItemId: dbRow.equipment_item_id,
    url: dbRow.url,
    thumbnailUrl: dbRow.thumbnail_url,
    caption: dbRow.caption,
    uploadedBy: null, // Loaded by type resolver
    user_id: dbRow.user_id, // For type resolver
    verificationCount: 0,
    isFeatured: dbRow.is_primary,
    createdAt: dbRow.uploaded_at,
  };
}

function transformContribution(row: Record<string, unknown> | VenueContribution): Record<string, unknown> {
  // Handle typed VenueContribution from service
  if ('venueId' in row && typeof row.venueId === 'string') {
    const contribution = row as VenueContribution;
    return {
      id: contribution.id,
      venueId: contribution.venueId,
      submissionId: null,
      userId: contribution.userId,
      user: null,
      user_id: contribution.userId,
      contributionType: contribution.contributionType,
      data: contribution.details,
      creditsEarned: contribution.creditsAwarded,
      createdAt: contribution.contributedAt,
    };
  }
  // Handle raw database row - type assertion for untyped database rows
  const dbRow = row as Record<string, unknown>;
  return {
    id: dbRow.id,
    venueId: dbRow.venue_id,
    submissionId: dbRow.submission_id,
    userId: dbRow.user_id,
    user: null, // Loaded by type resolver
    user_id: dbRow.user_id, // For type resolver
    contributionType: dbRow.contribution_type,
    data: dbRow.details,
    creditsEarned: dbRow.credits_awarded,
    createdAt: dbRow.contributed_at,
  };
}

function transformReport(row: Record<string, unknown> | VenueReport): Record<string, unknown> {
  // Handle typed VenueReport from service
  if ('venueId' in row && typeof row.venueId === 'string') {
    const report = row as VenueReport;
    return {
      id: report.id,
      venueId: report.venueId,
      reportedBy: null,
      user_id: report.userId,
      reportType: report.reportType,
      description: report.description,
      severity: report.severity,
      status: report.status,
      adminNotes: report.resolutionNotes,
      resolvedAt: report.resolvedAt,
      createdAt: report.reportedAt,
    };
  }
  // Handle raw database row - type assertion for untyped database rows
  const dbRow = row as Record<string, unknown>;
  return {
    id: dbRow.id,
    venueId: dbRow.venue_id,
    reportedBy: null, // Loaded by type resolver
    user_id: dbRow.user_id, // For type resolver
    reportType: dbRow.report_type,
    description: dbRow.description,
    severity: dbRow.severity,
    status: dbRow.status,
    adminNotes: dbRow.resolution_notes,
    resolvedAt: dbRow.resolved_at,
    createdAt: dbRow.reported_at,
  };
}

interface ContributorStatsRow {
  user_id: string;
  total_contributions?: number;
  venues_submitted?: number;
  venues_approved?: number;
  verifications_count?: number;
  photos_uploaded?: number;
  reports_submitted?: number;
  total_credits_earned?: number;
  contributor_level?: number;
  rank?: number;
}

function buildContributorStats(row: ContributorStatsRow): Record<string, unknown> {
  const level = row.contributor_level || 1;
  const levelNames = ['Newcomer', 'Explorer', 'Scout', 'Pathfinder', 'Trailblazer', 'Pioneer', 'Legend'];
  const levelThresholds = [0, 10, 50, 150, 400, 1000, 2500];

  const nextThreshold = levelThresholds[level] || 9999;

  return {
    userId: row.user_id,
    totalContributions: row.total_contributions || 0,
    venuesSubmitted: row.venues_submitted || 0,
    venuesVerified: row.verifications_count || 0,
    photosUploaded: row.photos_uploaded || 0,
    reportsSubmitted: row.reports_submitted || 0,
    totalCreditsEarned: row.total_credits_earned || 0,
    level,
    levelName: levelNames[Math.min(level - 1, levelNames.length - 1)],
    pointsToNextLevel: Math.max(0, nextThreshold - (row.total_contributions || 0)),
    rank: row.rank || null,
    badges: [], // Would load from user_achievements
  };
}

function getEquipmentTypeById(id: string): Record<string, unknown> {
  const types: Record<string, Record<string, unknown>> = {
    pull_up_bar: { id: 'pull_up_bar', name: 'Pull-Up Bar', slug: 'pull-up-bar', category: 'upper_body', description: 'Horizontal bar for pull-ups and chin-ups', iconName: 'grip-horizontal' },
    parallel_bars: { id: 'parallel_bars', name: 'Parallel Bars', slug: 'parallel-bars', category: 'upper_body', description: 'Parallel bars for dips and leg raises', iconName: 'rows' },
    monkey_bars: { id: 'monkey_bars', name: 'Monkey Bars', slug: 'monkey-bars', category: 'upper_body', description: 'Horizontal ladder for traversing', iconName: 'git-branch-plus' },
    rings: { id: 'rings', name: 'Rings', slug: 'rings', category: 'upper_body', description: 'Gymnastic rings', iconName: 'circle-dot' },
    dip_station: { id: 'dip_station', name: 'Dip Station', slug: 'dip-station', category: 'upper_body', description: 'Station for dips', iconName: 'arrow-down-to-line' },
    ab_bench: { id: 'ab_bench', name: 'Ab Bench', slug: 'ab-bench', category: 'core', description: 'Inclined bench for ab exercises', iconName: 'sliders-horizontal' },
    sit_up_bench: { id: 'sit_up_bench', name: 'Sit-Up Bench', slug: 'sit-up-bench', category: 'core', description: 'Bench with foot anchors for sit-ups', iconName: 'bed-single' },
    balance_beam: { id: 'balance_beam', name: 'Balance Beam', slug: 'balance-beam', category: 'balance', description: 'Beam for balance exercises', iconName: 'minus' },
    outdoor_gym_station: { id: 'outdoor_gym_station', name: 'Outdoor Gym Station', slug: 'outdoor-gym-station', category: 'multi', description: 'Multi-function gym station', iconName: 'layout-grid' },
    calisthenics_park: { id: 'calisthenics_park', name: 'Calisthenics Park', slug: 'calisthenics-park', category: 'multi', description: 'Full calisthenics setup', iconName: 'layout-template' },
  };

  return types[id] || { id, name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug: id.replace(/_/g, '-'), category: 'other', description: null, iconName: 'dumbbell' };
}

function getMuscleGroupsForEquipment(equipmentType: string): string[] {
  const muscleMap: Record<string, string[]> = {
    pull_up_bar: ['lats', 'biceps', 'forearms', 'rear_delts'],
    parallel_bars: ['chest', 'triceps', 'front_delts', 'core'],
    monkey_bars: ['lats', 'biceps', 'forearms', 'grip'],
    rings: ['chest', 'triceps', 'shoulders', 'core', 'lats'],
    dip_station: ['chest', 'triceps', 'front_delts'],
    ab_bench: ['abs', 'hip_flexors', 'obliques'],
    sit_up_bench: ['abs', 'hip_flexors'],
    balance_beam: ['core', 'legs', 'ankles'],
    leg_press: ['quads', 'glutes', 'hamstrings'],
    chest_press: ['chest', 'triceps', 'front_delts'],
    lat_pull: ['lats', 'biceps', 'rear_delts'],
    rowing_machine: ['lats', 'biceps', 'legs', 'core'],
    elliptical: ['legs', 'glutes', 'cardio'],
    stationary_bike: ['quads', 'hamstrings', 'calves', 'cardio'],
  };

  return muscleMap[equipmentType] || ['full_body'];
}
