/**
 * Venue Service
 *
 * Handles CRUD operations for fitness venues and related queries.
 */

import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import cache from '../../lib/cache.service';
import {
  FitnessVenue,
  VenueRecordType,
  VenueMembership,
  CreateVenueParams,
  UpdateVenueParams,
  SearchVenuesParams,
  NearbyVenuesParams,
  VenueLeaderboard,
  VenueLeaderboardEntry,
  EquipmentType,
  VenueType,
  VENUE_CONSTANTS,
} from './types';

const log = loggers.core;

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// Helper to convert DB row to FitnessVenue
function rowToVenue(row: Record<string, unknown>): FitnessVenue {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string | undefined,
    venueType: row.venue_type as VenueType,
    latitude: parseFloat(row.latitude as string),
    longitude: parseFloat(row.longitude as string),
    address: row.address as string | undefined,
    city: row.city as string,
    stateProvince: row.state_province as string | undefined,
    country: row.country as string,
    postalCode: row.postal_code as string | undefined,
    radiusMeters: row.radius_meters as number,
    boundaryPolygon: row.boundary_polygon,
    equipment: (row.equipment as EquipmentType[]) || [],
    hasFreeWeights: row.has_free_weights as boolean,
    hasCalisthenicsEquipment: row.has_calisthenics_equipment as boolean,
    hasCardioEquipment: row.has_cardio_equipment as boolean,
    hasParkourFeatures: row.has_parkour_features as boolean,
    isIndoor: row.is_indoor as boolean,
    is24Hour: row.is_24_hour as boolean,
    isFree: row.is_free as boolean,
    photos: (row.photos as string[]) || [],
    coverPhotoUrl: row.cover_photo_url as string | undefined,
    memberCount: row.member_count as number,
    activeRecordCount: row.active_record_count as number,
    totalRecordClaims: row.total_record_claims as number,
    checkinCountToday: row.checkin_count_today as number,
    checkinCountTotal: row.checkin_count_total as number,
    isVerified: row.is_verified as boolean,
    verifiedBy: row.verified_by as string | undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at as string) : undefined,
    isActive: row.is_active as boolean,
    isFlagged: row.is_flagged as boolean,
    flagReason: row.flag_reason as string | undefined,
    hoursOfOperation: row.hours_of_operation as Record<string, string> | undefined,
    amenities: (row.amenities as string[]) || [],
    externalLinks: (row.external_links as Record<string, string>) || {},
    createdBy: row.created_by as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Helper to convert DB row to VenueRecordType
function rowToRecordType(row: Record<string, unknown>): VenueRecordType {
  return {
    id: row.id as string,
    name: row.name as string,
    key: row.key as string,
    description: row.description as string | undefined,
    icon: row.icon as string | undefined,
    category: row.category as VenueRecordType['category'],
    metricType: row.metric_type as VenueRecordType['metricType'],
    unit: row.unit as string,
    direction: row.direction as VenueRecordType['direction'],
    requiresVideo: row.requires_video as boolean,
    requiresWitness: row.requires_witness as boolean,
    requiresLocationVerification: row.requires_location_verification as boolean,
    minVideoDurationSeconds: row.min_video_duration_seconds as number,
    maxVideoDurationSeconds: row.max_video_duration_seconds as number,
    exerciseId: row.exercise_id as string | undefined,
    requiredEquipment: (row.required_equipment as EquipmentType[]) || [],
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
    isFeatured: row.is_featured as boolean,
    createdAt: new Date(row.created_at as string),
  };
}

export const venueService = {
  // ============================================
  // VENUE CRUD
  // ============================================

  /**
   * Create a new venue
   */
  async createVenue(params: CreateVenueParams, createdBy: string): Promise<FitnessVenue> {
    const {
      name,
      description,
      venueType,
      latitude,
      longitude,
      address,
      city,
      stateProvince,
      country = 'USA',
      postalCode,
      radiusMeters = VENUE_CONSTANTS.DEFAULT_VENUE_RADIUS_METERS,
      equipment = [],
      hasFreeWeights = false,
      hasCalisthenicsEquipment = false,
      hasCardioEquipment = false,
      hasParkourFeatures = false,
      isIndoor = false,
      is24Hour = false,
      isFree = true,
      coverPhotoUrl,
      hoursOfOperation,
      amenities = [],
    } = params;

    // Validate
    if (!name || name.trim().length < 3) {
      throw new ValidationError('Venue name must be at least 3 characters');
    }
    if (latitude < -90 || latitude > 90) {
      throw new ValidationError('Invalid latitude');
    }
    if (longitude < -180 || longitude > 180) {
      throw new ValidationError('Invalid longitude');
    }
    if (radiusMeters > VENUE_CONSTANTS.MAX_VENUE_RADIUS_METERS) {
      throw new ValidationError(`Radius cannot exceed ${VENUE_CONSTANTS.MAX_VENUE_RADIUS_METERS} meters`);
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existingSlug = await queryOne('SELECT id FROM fitness_venues WHERE slug = $1', [slug]);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO fitness_venues (
        name, slug, description, venue_type, latitude, longitude, address, city,
        state_province, country, postal_code, radius_meters, equipment,
        has_free_weights, has_calisthenics_equipment, has_cardio_equipment,
        has_parkour_features, is_indoor, is_24_hour, is_free, cover_photo_url,
        hours_of_operation, amenities, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        name.trim(),
        slug,
        description,
        venueType,
        latitude,
        longitude,
        address,
        city,
        stateProvince,
        country,
        postalCode,
        radiusMeters,
        JSON.stringify(equipment),
        hasFreeWeights,
        hasCalisthenicsEquipment,
        hasCardioEquipment,
        hasParkourFeatures,
        isIndoor,
        is24Hour,
        isFree,
        coverPhotoUrl,
        hoursOfOperation ? JSON.stringify(hoursOfOperation) : null,
        JSON.stringify(amenities),
        createdBy,
      ]
    );

    if (!result) {
      throw new Error('Failed to create venue');
    }

    log.info({ venueId: result.id, name }, 'Venue created');
    return rowToVenue(result);
  },

  /**
   * Get venue by ID
   */
  async getVenueById(id: string): Promise<FitnessVenue | null> {
    const cacheKey = `cache:venue:${id}`;
    const cached = await cache.get<FitnessVenue>(cacheKey);
    if (cached) return cached;

    const result = await queryOne<Record<string, unknown>>('SELECT * FROM fitness_venues WHERE id = $1', [id]);

    if (!result) return null;

    const venue = rowToVenue(result);
    await cache.set(cacheKey, venue, 300); // 5 minutes
    return venue;
  },

  /**
   * Get venue by slug
   */
  async getVenueBySlug(slug: string): Promise<FitnessVenue | null> {
    const result = await queryOne<Record<string, unknown>>('SELECT * FROM fitness_venues WHERE slug = $1 AND is_active = TRUE', [slug]);

    if (!result) return null;
    return rowToVenue(result);
  },

  /**
   * Update venue
   */
  async updateVenue(id: string, params: UpdateVenueParams, updatedBy: string): Promise<FitnessVenue> {
    const existing = await this.getVenueById(id);
    if (!existing) {
      throw new NotFoundError('Venue not found');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      venueType: 'venue_type',
      latitude: 'latitude',
      longitude: 'longitude',
      address: 'address',
      city: 'city',
      stateProvince: 'state_province',
      country: 'country',
      postalCode: 'postal_code',
      radiusMeters: 'radius_meters',
      hasFreeWeights: 'has_free_weights',
      hasCalisthenicsEquipment: 'has_calisthenics_equipment',
      hasCardioEquipment: 'has_cardio_equipment',
      hasParkourFeatures: 'has_parkour_features',
      isIndoor: 'is_indoor',
      is24Hour: 'is_24_hour',
      isFree: 'is_free',
      coverPhotoUrl: 'cover_photo_url',
      isActive: 'is_active',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in params && params[key as keyof UpdateVenueParams] !== undefined) {
        updates.push(`${dbField} = $${paramIndex}`);
        values.push(params[key as keyof UpdateVenueParams]);
        paramIndex++;
      }
    }

    // Handle JSON fields
    if (params.equipment) {
      updates.push(`equipment = $${paramIndex}`);
      values.push(JSON.stringify(params.equipment));
      paramIndex++;
    }
    if (params.hoursOfOperation) {
      updates.push(`hours_of_operation = $${paramIndex}`);
      values.push(JSON.stringify(params.hoursOfOperation));
      paramIndex++;
    }
    if (params.amenities) {
      updates.push(`amenities = $${paramIndex}`);
      values.push(JSON.stringify(params.amenities));
      paramIndex++;
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);

    const result = await queryOne<Record<string, unknown>>(
      `UPDATE fitness_venues SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Failed to update venue');
    }

    // Invalidate cache
    await cache.del(`cache:venue:${id}`);

    log.info({ venueId: id, updatedBy }, 'Venue updated');
    return rowToVenue(result);
  },

  /**
   * Search venues with filters
   */
  async searchVenues(params: SearchVenuesParams): Promise<{ venues: FitnessVenue[]; hasMore: boolean }> {
    const { query: searchQuery, city, venueType, hasEquipment, isFree, isIndoor, limit = 20, cursor } = params;

    const conditions: string[] = ['is_active = TRUE'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (searchQuery) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
      values.push(`%${searchQuery}%`);
      paramIndex++;
    }

    if (city) {
      conditions.push(`city ILIKE $${paramIndex}`);
      values.push(`%${city}%`);
      paramIndex++;
    }

    if (venueType) {
      conditions.push(`venue_type = $${paramIndex}`);
      values.push(venueType);
      paramIndex++;
    }

    if (hasEquipment && hasEquipment.length > 0) {
      conditions.push(`equipment ?& $${paramIndex}`);
      values.push(hasEquipment);
      paramIndex++;
    }

    if (isFree !== undefined) {
      conditions.push(`is_free = $${paramIndex}`);
      values.push(isFree);
      paramIndex++;
    }

    if (isIndoor !== undefined) {
      conditions.push(`is_indoor = $${paramIndex}`);
      values.push(isIndoor);
      paramIndex++;
    }

    // Keyset pagination
    if (cursor) {
      conditions.push(`(created_at, id) < ($${paramIndex}, $${paramIndex + 1})`);
      values.push(cursor.createdAt, cursor.id);
      paramIndex += 2;
    }

    values.push(limit + 1);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM fitness_venues
       WHERE ${conditions.join(' AND ')}
       ORDER BY member_count DESC, created_at DESC, id DESC
       LIMIT $${paramIndex}`,
      values
    );

    const hasMore = rows.length > limit;
    const venues = rows.slice(0, limit).map(rowToVenue);

    return { venues, hasMore };
  },

  /**
   * Find nearby venues using Haversine formula
   */
  async getNearbyVenues(params: NearbyVenuesParams): Promise<FitnessVenue[]> {
    const { latitude, longitude, radiusMiles = 5, venueType, limit = 20 } = params;

    const radiusKm = radiusMiles * 1.60934;

    const conditions: string[] = ['is_active = TRUE'];
    const values: unknown[] = [latitude, longitude, radiusKm];
    let paramIndex = 4;

    if (venueType) {
      conditions.push(`venue_type = $${paramIndex}`);
      values.push(venueType);
      paramIndex++;
    }

    values.push(limit);

    // Haversine formula for distance calculation
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT *,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
       FROM fitness_venues
       WHERE ${conditions.join(' AND ')}
         AND (6371 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )) < $3
       ORDER BY distance_km ASC
       LIMIT $${paramIndex}`,
      values
    );

    return rows.map((row) => ({
      ...rowToVenue(row),
      distanceKm: parseFloat(row.distance_km as string),
    }));
  },

  // ============================================
  // RECORD TYPES
  // ============================================

  /**
   * Get all active record types
   */
  async getRecordTypes(): Promise<VenueRecordType[]> {
    const cacheKey = `cache:venue_record_types`;
    const cached = await cache.get<VenueRecordType[]>(cacheKey);
    if (cached) return cached;

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM venue_record_types WHERE is_active = TRUE ORDER BY display_order, name`
    );

    const types = rows.map(rowToRecordType);
    await cache.set(cacheKey, types, 3600); // 1 hour
    return types;
  },

  /**
   * Get record type by ID
   */
  async getRecordTypeById(id: string): Promise<VenueRecordType | null> {
    const result = await queryOne<Record<string, unknown>>('SELECT * FROM venue_record_types WHERE id = $1', [id]);

    if (!result) return null;
    return rowToRecordType(result);
  },

  /**
   * Get record type by key
   */
  async getRecordTypeByKey(key: string): Promise<VenueRecordType | null> {
    const result = await queryOne<Record<string, unknown>>('SELECT * FROM venue_record_types WHERE key = $1', [key]);

    if (!result) return null;
    return rowToRecordType(result);
  },

  /**
   * Get record types available at a venue (based on equipment)
   */
  async getRecordTypesForVenue(venueId: string): Promise<VenueRecordType[]> {
    const venue = await this.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    const allTypes = await this.getRecordTypes();

    // Filter to types where venue has required equipment
    return allTypes.filter((type) => {
      if (type.requiredEquipment.length === 0) return true;
      return type.requiredEquipment.every((eq) => venue.equipment.includes(eq));
    });
  },

  // ============================================
  // LEADERBOARDS
  // ============================================

  /**
   * Get leaderboard for a specific record type at a venue
   */
  async getVenueLeaderboard(
    venueId: string,
    recordTypeId: string,
    options: { limit?: number; userId?: string } = {}
  ): Promise<VenueLeaderboard> {
    const { limit = 50, userId } = options;

    const [venue, recordType] = await Promise.all([this.getVenueById(venueId), this.getRecordTypeById(recordTypeId)]);

    if (!venue) throw new NotFoundError('Venue not found');
    if (!recordType) throw new NotFoundError('Record type not found');

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vr.id as record_id, vr.value, vr.verified_at, vr.user_id,
              u.username, u.display_name, u.avatar_url,
              ROW_NUMBER() OVER (ORDER BY vr.value DESC, vr.verified_at ASC) as rank
       FROM venue_records vr
       JOIN users u ON u.id = vr.user_id
       WHERE vr.venue_id = $1 AND vr.record_type_id = $2 AND vr.status = 'verified'
       ORDER BY vr.value DESC, vr.verified_at ASC
       LIMIT $3`,
      [venueId, recordTypeId, limit]
    );

    const entries: VenueLeaderboardEntry[] = rows.map((row) => ({
      rank: parseInt(row.rank as string),
      userId: row.user_id as string,
      username: row.username as string,
      displayName: row.display_name as string | undefined,
      avatarUrl: row.avatar_url as string | undefined,
      value: parseFloat(row.value as string),
      recordId: row.record_id as string,
      verifiedAt: new Date(row.verified_at as string),
      isCurrentUser: userId ? row.user_id === userId : false,
    }));

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM venue_records
       WHERE venue_id = $1 AND record_type_id = $2 AND status = 'verified'`,
      [venueId, recordTypeId]
    );

    return {
      venueId,
      recordTypeId,
      recordTypeName: recordType.name,
      unit: recordType.unit,
      entries,
      totalEntries: parseInt(countResult?.count || '0'),
      currentRecord: entries[0] || undefined,
    };
  },

  /**
   * Get all leaderboards for a venue
   */
  async getVenueAllLeaderboards(venueId: string, userId?: string): Promise<VenueLeaderboard[]> {
    const recordTypes = await this.getRecordTypesForVenue(venueId);

    const leaderboards = await Promise.all(
      recordTypes.map((type) => this.getVenueLeaderboard(venueId, type.id, { limit: 5, userId }))
    );

    // Filter out empty leaderboards
    return leaderboards.filter((lb) => lb.entries.length > 0);
  },

  // ============================================
  // MEMBERSHIPS
  // ============================================

  /**
   * Join a venue (become a member)
   */
  async joinVenue(venueId: string, userId: string): Promise<VenueMembership> {
    const venue = await this.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Check if already a member
    const existing = await queryOne<Record<string, unknown>>(
      'SELECT * FROM venue_memberships WHERE venue_id = $1 AND user_id = $2',
      [venueId, userId]
    );

    if (existing) {
      return {
        venueId: existing.venue_id as string,
        userId: existing.user_id as string,
        role: existing.role as VenueMembership['role'],
        recordCount: existing.record_count as number,
        currentRecordsHeld: existing.current_records_held as number,
        checkinCount: existing.checkin_count as number,
        lastCheckinAt: existing.last_checkin_at ? new Date(existing.last_checkin_at as string) : undefined,
        lastRecordClaimAt: existing.last_record_claim_at ? new Date(existing.last_record_claim_at as string) : undefined,
        notificationsEnabled: existing.notifications_enabled as boolean,
        showInMembersList: existing.show_in_members_list as boolean,
        joinedAt: new Date(existing.joined_at as string),
      };
    }

    // Insert membership
    const result = await queryOne<Record<string, unknown>>(
      `INSERT INTO venue_memberships (venue_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (venue_id, user_id) DO UPDATE SET joined_at = NOW()
       RETURNING *`,
      [venueId, userId]
    );

    // Update member count
    await query('UPDATE fitness_venues SET member_count = member_count + 1 WHERE id = $1', [venueId]);

    // Invalidate cache
    await cache.del(`cache:venue:${venueId}`);

    return {
      venueId: result!.venue_id as string,
      userId: result!.user_id as string,
      role: result!.role as VenueMembership['role'],
      recordCount: result!.record_count as number,
      currentRecordsHeld: result!.current_records_held as number,
      checkinCount: result!.checkin_count as number,
      lastCheckinAt: undefined,
      lastRecordClaimAt: undefined,
      notificationsEnabled: result!.notifications_enabled as boolean,
      showInMembersList: result!.show_in_members_list as boolean,
      joinedAt: new Date(result!.joined_at as string),
    };
  },

  /**
   * Leave a venue
   */
  async leaveVenue(venueId: string, userId: string): Promise<void> {
    const result = await query('DELETE FROM venue_memberships WHERE venue_id = $1 AND user_id = $2', [venueId, userId]);

    if (result.rowCount && result.rowCount > 0) {
      await query('UPDATE fitness_venues SET member_count = GREATEST(0, member_count - 1) WHERE id = $1', [venueId]);
      await cache.del(`cache:venue:${venueId}`);
    }
  },

  /**
   * Get venue members
   */
  async getVenueMembers(
    venueId: string,
    options: { limit?: number; cursor?: { joinedAt: Date; oduserId: string } } = {}
  ): Promise<{ members: (VenueMembership & { username: string; displayName?: string; avatarUrl?: string })[]; hasMore: boolean }> {
    const { limit = 50, cursor } = options;

    const conditions = ['vm.venue_id = $1', 'vm.show_in_members_list = TRUE'];
    const values: unknown[] = [venueId];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`(vm.joined_at, vm.user_id) < ($${paramIndex}, $${paramIndex + 1})`);
      values.push(cursor.joinedAt, cursor.oduserId);
      paramIndex += 2;
    }

    values.push(limit + 1);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT vm.*, u.username, u.display_name, u.avatar_url
       FROM venue_memberships vm
       JOIN users u ON u.id = vm.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vm.current_records_held DESC, vm.checkin_count DESC, vm.joined_at DESC
       LIMIT $${paramIndex}`,
      values
    );

    const hasMore = rows.length > limit;
    const members = rows.slice(0, limit).map((row) => ({
      venueId: row.venue_id as string,
      userId: row.user_id as string,
      role: row.role as VenueMembership['role'],
      recordCount: row.record_count as number,
      currentRecordsHeld: row.current_records_held as number,
      checkinCount: row.checkin_count as number,
      lastCheckinAt: row.last_checkin_at ? new Date(row.last_checkin_at as string) : undefined,
      lastRecordClaimAt: row.last_record_claim_at ? new Date(row.last_record_claim_at as string) : undefined,
      notificationsEnabled: row.notifications_enabled as boolean,
      showInMembersList: row.show_in_members_list as boolean,
      joinedAt: new Date(row.joined_at as string),
      username: row.username as string,
      displayName: row.display_name as string | undefined,
      avatarUrl: row.avatar_url as string | undefined,
    }));

    return { members, hasMore };
  },

  /**
   * Check if user is a member of venue
   */
  async isMember(venueId: string, userId: string): Promise<boolean> {
    const result = await queryOne('SELECT 1 FROM venue_memberships WHERE venue_id = $1 AND user_id = $2', [venueId, userId]);
    return !!result;
  },

  /**
   * Get user's venue membership
   */
  async getMembership(venueId: string, userId: string): Promise<VenueMembership | null> {
    const result = await queryOne<Record<string, unknown>>(
      'SELECT * FROM venue_memberships WHERE venue_id = $1 AND user_id = $2',
      [venueId, userId]
    );

    if (!result) return null;

    return {
      venueId: result.venue_id as string,
      userId: result.user_id as string,
      role: result.role as VenueMembership['role'],
      recordCount: result.record_count as number,
      currentRecordsHeld: result.current_records_held as number,
      checkinCount: result.checkin_count as number,
      lastCheckinAt: result.last_checkin_at ? new Date(result.last_checkin_at as string) : undefined,
      lastRecordClaimAt: result.last_record_claim_at ? new Date(result.last_record_claim_at as string) : undefined,
      notificationsEnabled: result.notifications_enabled as boolean,
      showInMembersList: result.show_in_members_list as boolean,
      joinedAt: new Date(result.joined_at as string),
    };
  },

  // ============================================
  // STATS
  // ============================================

  /**
   * Update venue stats (call periodically or after significant events)
   */
  async updateVenueStats(venueId: string): Promise<void> {
    await query(
      `UPDATE fitness_venues SET
        active_record_count = (
          SELECT COUNT(DISTINCT record_type_id) FROM venue_records
          WHERE venue_id = $1 AND status = 'verified'
        ),
        total_record_claims = (
          SELECT COUNT(*) FROM venue_records WHERE venue_id = $1
        ),
        checkin_count_today = (
          SELECT COUNT(*) FROM venue_checkins
          WHERE venue_id = $1 AND DATE(checked_in_at) = CURRENT_DATE
        ),
        checkin_count_total = (
          SELECT COUNT(*) FROM venue_checkins WHERE venue_id = $1
        )
       WHERE id = $1`,
      [venueId]
    );

    await cache.del(`cache:venue:${venueId}`);
  },

  /**
   * Get venue statistics summary
   */
  async getVenueStats(
    venueId: string
  ): Promise<{
    memberCount: number;
    activeRecordCount: number;
    totalRecordClaims: number;
    checkinCountToday: number;
    checkinCountTotal: number;
    topRecordHolders: { userId: string; username: string; recordCount: number }[];
  }> {
    const venue = await this.getVenueById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    const topHolders = await queryAll<{ user_id: string; username: string; record_count: string }>(
      `SELECT vr.user_id, u.username, COUNT(*) as record_count
       FROM venue_records vr
       JOIN users u ON u.id = vr.user_id
       WHERE vr.venue_id = $1 AND vr.status = 'verified'
       GROUP BY vr.user_id, u.username
       ORDER BY record_count DESC
       LIMIT 5`,
      [venueId]
    );

    return {
      memberCount: venue.memberCount,
      activeRecordCount: venue.activeRecordCount,
      totalRecordClaims: venue.totalRecordClaims,
      checkinCountToday: venue.checkinCountToday,
      checkinCountTotal: venue.checkinCountTotal,
      topRecordHolders: topHolders.map((row) => ({
        userId: row.user_id,
        username: row.username,
        recordCount: parseInt(row.record_count),
      })),
    };
  },

  // ============================================
  // DEDUPLICATION
  // ============================================

  /**
   * Find potential duplicate venues within a radius
   * Uses Haversine formula to calculate distance
   */
  async findNearbyDuplicates(
    latitude: number,
    longitude: number,
    radiusMeters: number = 50,
    excludeId?: string
  ): Promise<Array<{ id: string; name: string; distance: number; dataSource: string }>> {
    const radiusKm = radiusMeters / 1000;

    const rows = await queryAll<{ id: string; name: string; distance_km: string; data_source: string }>(
      `SELECT id, name, data_source,
        (6371 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          ))
        )) AS distance_km
       FROM fitness_venues
       WHERE is_active = TRUE
         ${excludeId ? 'AND id != $4' : ''}
         AND (6371 * acos(
           LEAST(1, GREATEST(-1,
             cos(radians($1)) * cos(radians(latitude)) *
             cos(radians(longitude) - radians($2)) +
             sin(radians($1)) * sin(radians(latitude))
           ))
         )) < $3
       ORDER BY distance_km ASC
       LIMIT 10`,
      excludeId ? [latitude, longitude, radiusKm, excludeId] : [latitude, longitude, radiusKm]
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      distance: parseFloat(row.distance_km) * 1000, // Convert back to meters
      dataSource: row.data_source,
    }));
  },

  /**
   * Merge duplicate venues into a single venue
   * Keeps the venue with the richest data (most equipment, photos, verifications)
   * Preserves all external IDs and data sources
   */
  async mergeVenues(
    primaryVenueId: string,
    duplicateVenueIds: string[]
  ): Promise<{ merged: number; failed: number }> {
    let merged = 0;
    let failed = 0;

    for (const duplicateId of duplicateVenueIds) {
      try {
        // Get both venues
        const primary = await this.getVenueById(primaryVenueId);
        const duplicate = await this.getVenueById(duplicateId);

        if (!primary || !duplicate) {
          failed++;
          continue;
        }

        // Merge equipment (combine unique items)
        const mergedEquipment = [...new Set([...primary.equipment, ...duplicate.equipment])];

        // Merge photos (combine unique items)
        const mergedPhotos = [...new Set([...primary.photos, ...duplicate.photos])];

        // Update primary venue with merged data
        await query(
          `UPDATE fitness_venues SET
            equipment = $2::jsonb,
            photos = $3::jsonb,
            has_calisthenics_equipment = $4,
            has_cardio_equipment = $5,
            verification_count = GREATEST(verification_count, $6),
            updated_at = NOW()
           WHERE id = $1`,
          [
            primaryVenueId,
            JSON.stringify(mergedEquipment),
            JSON.stringify(mergedPhotos),
            mergedEquipment.some((e) =>
              ['pull_up_bar', 'parallel_bars', 'dip_station', 'rings', 'monkey_bars'].includes(e)
            ),
            mergedEquipment.some((e) =>
              ['elliptical_outdoor', 'stationary_bike_outdoor', 'rowing_machine_outdoor'].includes(e)
            ),
            duplicate.isVerified ? 1 : 0,
          ]
        );

        // Move all check-ins, records, and memberships to primary venue
        await query('UPDATE venue_checkins SET venue_id = $1 WHERE venue_id = $2', [primaryVenueId, duplicateId]);
        await query('UPDATE venue_records SET venue_id = $1 WHERE venue_id = $2', [primaryVenueId, duplicateId]);
        await query('UPDATE venue_memberships SET venue_id = $1 WHERE venue_id = $2', [primaryVenueId, duplicateId]);
        await query('UPDATE venue_contributions SET venue_id = $1 WHERE venue_id = $2', [primaryVenueId, duplicateId]);

        // Deactivate the duplicate venue (keep for historical reference)
        await query(
          `UPDATE fitness_venues SET
            is_active = FALSE,
            flag_reason = $2,
            updated_at = NOW()
           WHERE id = $1`,
          [duplicateId, `Merged into venue ${primaryVenueId}`]
        );

        merged++;
        log.info({ primaryVenueId, duplicateId }, 'Merged duplicate venue');
      } catch (error) {
        log.error({ error, primaryVenueId, duplicateId }, 'Failed to merge venue');
        failed++;
      }
    }

    return { merged, failed };
  },

  /**
   * Run deduplication across all venues from a specific data source
   * Groups nearby venues and suggests merges
   */
  async findAllDuplicates(options: {
    dataSource?: string;
    radiusMeters?: number;
    limit?: number;
  } = {}): Promise<Array<{
    primaryVenue: { id: string; name: string; dataSource: string };
    duplicates: Array<{ id: string; name: string; distance: number; dataSource: string }>;
  }>> {
    const { dataSource, radiusMeters = 50, limit = 100 } = options;

    // Get all venues, ordered by verification/richness
    const conditions = ['is_active = TRUE'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dataSource) {
      conditions.push(`data_source = $${paramIndex}`);
      values.push(dataSource);
      paramIndex++;
    }

    values.push(limit);

    const venues = await queryAll<{ id: string; name: string; latitude: string; longitude: string; data_source: string }>(
      `SELECT id, name, latitude, longitude, data_source
       FROM fitness_venues
       WHERE ${conditions.join(' AND ')}
       ORDER BY is_verified DESC, verification_count DESC, created_at ASC
       LIMIT $${paramIndex}`,
      values
    );

    const duplicateGroups: Array<{
      primaryVenue: { id: string; name: string; dataSource: string };
      duplicates: Array<{ id: string; name: string; distance: number; dataSource: string }>;
    }> = [];

    const processedIds = new Set<string>();

    for (const venue of venues) {
      if (processedIds.has(venue.id)) continue;

      const duplicates = await this.findNearbyDuplicates(
        parseFloat(venue.latitude),
        parseFloat(venue.longitude),
        radiusMeters,
        venue.id
      );

      // Filter out already processed venues
      const unprocessedDuplicates = duplicates.filter((d) => !processedIds.has(d.id));

      if (unprocessedDuplicates.length > 0) {
        duplicateGroups.push({
          primaryVenue: { id: venue.id, name: venue.name, dataSource: venue.data_source },
          duplicates: unprocessedDuplicates,
        });

        // Mark all as processed
        processedIds.add(venue.id);
        for (const dup of unprocessedDuplicates) {
          processedIds.add(dup.id);
        }
      }
    }

    return duplicateGroups;
  },
};

export default venueService;
