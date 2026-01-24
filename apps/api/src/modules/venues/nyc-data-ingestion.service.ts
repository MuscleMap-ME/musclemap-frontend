/**
 * NYC Open Data Ingestion Service
 *
 * Handles ingestion of outdoor exercise equipment data from NYC Open Data APIs:
 * - Recreation Centers directory
 * - Parks properties and boundaries
 * - Athletic facilities
 *
 * Also handles scraping the NYC Parks fitness equipment page for additional data.
 */

import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import cache from '../../lib/cache.service';
import { FitnessVenue, EquipmentType, VenueType } from './types';

const log = loggers.core;

// NYC Open Data API endpoints
const NYC_OPEN_DATA_BASE = 'https://data.cityofnewyork.us/resource';
// NOTE: Old recreation centers endpoint (ydj7-rk56) is now a non-tabular dataset (href type)
// Using the exercise equipment dataset instead which has actual fitness locations
const EXERCISE_EQUIPMENT_ENDPOINT = `${NYC_OPEN_DATA_BASE}/tkzt-zfpz.json`; // Adult Exercise Equipment (227 locations)
const PARKS_PROPERTIES_ENDPOINT = `${NYC_OPEN_DATA_BASE}/enfh-gkve.json`;
const ATHLETIC_FACILITIES_ENDPOINT = `${NYC_OPEN_DATA_BASE}/qnem-b8re.json`; // Updated to tabular dataset

// NYC Parks Fitness Equipment page (for scraping)
const NYC_PARKS_FITNESS_URL = 'https://www.nycgovparks.org/facilities/fitnessequipment';

// Rate limiting for API calls
const API_DELAY_MS = 250; // 4 requests per second max

interface NYCExerciseEquipment {
  borough?: string;
  propid?: string;
  propname?: string;
  propnum?: string;
  sitename?: string;
  featuretype?: string;
  status?: string; // 'Reopened', etc.
  closuretype?: string;
  zipcode?: string;
  point?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface NYCParkProperty {
  park_name?: string;
  park_id?: string;
  borough?: string;
  acreage?: string;
  prop_type?: string;
  the_geom?: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

interface NYCAthleticFacility {
  borough?: string;
  gispropnum?: string;
  primary_sport?: string;
  surface_type?: string;
  system?: string;
  zipcode?: string;
  // Sport-specific boolean fields
  basketball?: boolean;
  handball?: boolean;
  tennis?: boolean;
  volleyball?: boolean;
  track_and_field?: boolean;
  bocce?: boolean;
  pickleball?: boolean;
  multipolygon?: {
    type: string;
    coordinates: number[][][][];
  };
}

interface SyncLogEntry {
  id: string;
  dataSource: string;
  sourceDataset: string;
  syncType: string;
  status: string;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Helper function to normalize borough names
function normalizeBoroughName(borough?: string): string | null {
  if (!borough) return null;

  const normalized = borough.toUpperCase().trim();
  const boroughMap: Record<string, string> = {
    M: 'Manhattan',
    MANHATTAN: 'Manhattan',
    MN: 'Manhattan',
    B: 'Brooklyn',
    BROOKLYN: 'Brooklyn',
    BK: 'Brooklyn',
    Q: 'Queens',
    QUEENS: 'Queens',
    QN: 'Queens',
    X: 'Bronx',
    BRONX: 'Bronx',
    BX: 'Bronx',
    THE_BRONX: 'Bronx',
    R: 'Staten Island',
    STATEN_ISLAND: 'Staten Island',
    SI: 'Staten Island',
    RICHMOND: 'Staten Island',
  };

  return boroughMap[normalized.replace(/\s+/g, '_')] || null;
}

// Helper function to generate a unique slug
function generateSlug(name: string, borough?: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);

  if (borough) {
    return `${base}-${borough.toLowerCase().replace(/\s+/g, '-')}`;
  }
  return base;
}

// Helper function to map athletic facility sports to equipment types
// Note: Only using equipment types that exist in the EquipmentType union
function mapAthleticFacilityToEquipment(facility: NYCAthleticFacility): EquipmentType[] {
  const equipment: EquipmentType[] = [];

  if (facility.basketball) equipment.push('basketball_court');
  if (facility.handball) equipment.push('other'); // handball_court not in EquipmentType
  if (facility.tennis) equipment.push('tennis_court');
  if (facility.volleyball) equipment.push('other'); // volleyball_court not in EquipmentType
  if (facility.track_and_field) equipment.push('track');
  if (facility.bocce) equipment.push('other'); // bocce_court not in EquipmentType
  if (facility.pickleball) equipment.push('other'); // pickleball_court not in EquipmentType

  // If no specific equipment found, use primary sport
  if (equipment.length === 0 && facility.primary_sport) {
    const sportMap: Record<string, EquipmentType> = {
      BKB: 'basketball_court',
      HDB: 'other', // handball
      TEN: 'tennis_court',
      VLB: 'other', // volleyball
      TRK: 'track',
      BOC: 'other', // bocce
      PKB: 'other', // pickleball
    };
    const mapped = sportMap[facility.primary_sport];
    if (mapped) equipment.push(mapped);
  }

  return [...new Set(equipment)]; // Remove duplicates
}

// Helper for API delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const nycDataIngestionService = {
  // ============================================
  // SYNC LOGGING
  // ============================================

  /**
   * Create a sync log entry
   */
  async createSyncLog(
    dataSource: string,
    sourceDataset: string,
    syncType: 'full' | 'incremental' | 'manual'
  ): Promise<string> {
    const result = await queryOne<{ id: string }>(
      `INSERT INTO venue_data_sync_log (data_source, source_dataset, sync_type, status)
       VALUES ($1, $2, $3, 'running')
       RETURNING id`,
      [dataSource, sourceDataset, syncType]
    );
    return result!.id;
  },

  /**
   * Update sync log with results
   */
  async updateSyncLog(
    logId: string,
    stats: {
      status: 'completed' | 'failed' | 'partial';
      recordsFetched?: number;
      recordsCreated?: number;
      recordsUpdated?: number;
      recordsSkipped?: number;
      recordsFailed?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    await query(
      `UPDATE venue_data_sync_log SET
        status = $2,
        records_fetched = COALESCE($3, records_fetched),
        records_created = COALESCE($4, records_created),
        records_updated = COALESCE($5, records_updated),
        records_skipped = COALESCE($6, records_skipped),
        records_failed = COALESCE($7, records_failed),
        error_message = $8,
        completed_at = NOW()
       WHERE id = $1`,
      [
        logId,
        stats.status,
        stats.recordsFetched,
        stats.recordsCreated,
        stats.recordsUpdated,
        stats.recordsSkipped,
        stats.recordsFailed,
        stats.errorMessage,
      ]
    );
  },

  /**
   * Get recent sync logs
   */
  async getRecentSyncLogs(dataSource?: string, limit = 20): Promise<SyncLogEntry[]> {
    const conditions = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dataSource) {
      conditions.push(`data_source = $${paramIndex}`);
      values.push(dataSource);
      paramIndex++;
    }

    values.push(limit);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM venue_data_sync_log
       ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
       ORDER BY started_at DESC
       LIMIT $${paramIndex}`,
      values
    );

    return rows.map((row) => ({
      id: row.id as string,
      dataSource: row.data_source as string,
      sourceDataset: row.source_dataset as string,
      syncType: row.sync_type as string,
      status: row.status as string,
      recordsFetched: row.records_fetched as number,
      recordsCreated: row.records_created as number,
      recordsUpdated: row.records_updated as number,
      recordsSkipped: row.records_skipped as number,
      recordsFailed: row.records_failed as number,
      errorMessage: row.error_message as string | undefined,
      startedAt: new Date(row.started_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
    }));
  },

  // ============================================
  // NYC EXERCISE EQUIPMENT (Outdoor Fitness Stations)
  // ============================================

  /**
   * Fetch exercise equipment locations from NYC Open Data
   * This replaces the old recreation centers endpoint which is no longer tabular
   */
  async fetchExerciseEquipment(): Promise<NYCExerciseEquipment[]> {
    try {
      log.info('Fetching NYC exercise equipment from Open Data...');

      const response = await fetch(`${EXERCISE_EQUIPMENT_ENDPOINT}?$limit=1000`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as NYCExerciseEquipment[];
      log.info({ count: data.length }, 'Fetched exercise equipment locations');
      return data;
    } catch (error) {
      log.error({ error }, 'Failed to fetch exercise equipment');
      throw error;
    }
  },

  /**
   * Ingest exercise equipment locations into the database
   */
  async ingestExerciseEquipment(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    const logId = await this.createSyncLog('nyc_open_data', 'exercise_equipment', 'full');

    try {
      const equipment = await this.fetchExerciseEquipment();

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const item of equipment) {
        try {
          await delay(API_DELAY_MS);

          // Skip if missing required fields
          if (!item.propname && !item.sitename) {
            skipped++;
            continue;
          }

          // Get coordinates from point geometry
          if (!item.point?.coordinates) {
            log.warn({ name: item.propname }, 'Exercise equipment missing coordinates, skipping');
            skipped++;
            continue;
          }

          const [longitude, latitude] = item.point.coordinates;
          if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            skipped++;
            continue;
          }

          const name = item.sitename || item.propname || 'Exercise Equipment';
          const borough = normalizeBoroughName(item.borough);
          const slug = generateSlug(name, borough || undefined);

          // Check if venue already exists (by external_id or slug)
          const externalId = `nyc_eq_${item.propid || item.propnum || slug}`;
          const existing = await queryOne<{ id: string }>(
            `SELECT id FROM fitness_venues
             WHERE (data_source = 'nyc_open_data' AND external_id = $1)
                OR slug = $2`,
            [externalId, slug]
          );

          const venueData = {
            name: name.trim(),
            slug,
            venueType: 'outdoor_gym' as VenueType,
            latitude,
            longitude,
            city: borough || 'New York',
            borough,
            postalCode: item.zipcode,
            equipment: JSON.stringify(['pull_up_bar', 'parallel_bars', 'ab_bench', 'multi_station']),
            hasFreeWeights: false,
            hasCalisthenicsEquipment: true,
            hasCardioEquipment: false,
            isIndoor: false,
            isFree: true,
            isVerified: true,
            dataSource: 'nyc_open_data',
            externalId,
          };

          if (existing) {
            // Update existing
            await query(
              `UPDATE fitness_venues SET
                name = $2, latitude = $3, longitude = $4,
                city = $5, borough = $6, postal_code = $7, equipment = $8::jsonb,
                has_calisthenics_equipment = $9,
                last_synced_at = NOW(), updated_at = NOW()
               WHERE id = $1`,
              [
                existing.id,
                venueData.name,
                venueData.latitude,
                venueData.longitude,
                venueData.city,
                venueData.borough,
                venueData.postalCode,
                venueData.equipment,
                venueData.hasCalisthenicsEquipment,
              ]
            );
            updated++;
          } else {
            // Create new
            await query(
              `INSERT INTO fitness_venues (
                name, slug, venue_type, latitude, longitude, city, borough,
                postal_code, equipment, has_free_weights, has_calisthenics_equipment,
                has_cardio_equipment, is_indoor, is_free, is_verified, data_source, external_id, last_synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
              ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                last_synced_at = NOW()`,
              [
                venueData.name,
                venueData.slug,
                venueData.venueType,
                venueData.latitude,
                venueData.longitude,
                venueData.city,
                venueData.borough,
                venueData.postalCode,
                venueData.equipment,
                venueData.hasFreeWeights,
                venueData.hasCalisthenicsEquipment,
                venueData.hasCardioEquipment,
                venueData.isIndoor,
                venueData.isFree,
                venueData.isVerified,
                venueData.dataSource,
                venueData.externalId,
              ]
            );
            created++;
          }
        } catch (error) {
          log.error({ error, item: item.propname }, 'Failed to process exercise equipment');
          failed++;
        }
      }

      await this.updateSyncLog(logId, {
        status: failed > 0 ? 'partial' : 'completed',
        recordsFetched: equipment.length,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsSkipped: skipped,
        recordsFailed: failed,
      });

      log.info({ created, updated, skipped, failed }, 'Exercise equipment ingestion complete');
      return { created, updated, skipped, failed };
    } catch (error) {
      await this.updateSyncLog(logId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  // Legacy method name for backwards compatibility
  async ingestRecreationCenters(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    log.info('ingestRecreationCenters() is deprecated - using ingestExerciseEquipment() instead');
    return this.ingestExerciseEquipment();
  },

  // ============================================
  // NYC PARKS PROPERTIES
  // ============================================

  /**
   * Fetch parks properties from NYC Open Data
   */
  async fetchParksProperties(): Promise<NYCParkProperty[]> {
    try {
      log.info('Fetching NYC parks properties from Open Data...');

      const response = await fetch(`${PARKS_PROPERTIES_ENDPOINT}?$limit=5000`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as NYCParkProperty[];
      log.info({ count: data.length }, 'Fetched parks properties');
      return data;
    } catch (error) {
      log.error({ error }, 'Failed to fetch parks properties');
      throw error;
    }
  },

  /**
   * Update venues with park property IDs for linking
   */
  async linkVenuesToParks(): Promise<{ linked: number; notFound: number }> {
    const logId = await this.createSyncLog('nyc_open_data', 'parks_properties', 'incremental');

    try {
      const parks = await this.fetchParksProperties();
      let linked = 0;
      let notFound = 0;

      // Get all venues that don't have a park ID
      const venues = await queryAll<{ id: string; name: string; latitude: string; longitude: string }>(
        `SELECT id, name, latitude::text, longitude::text FROM fitness_venues
         WHERE nyc_park_id IS NULL AND city IN ('New York', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')
         AND is_active = TRUE`
      );

      for (const venue of venues) {
        await delay(50); // Light rate limiting

        // Find nearest park within 500 meters
        const lat = parseFloat(venue.latitude);
        const lng = parseFloat(venue.longitude);

        let nearestPark: NYCParkProperty | null = null;
        let nearestDistance = Infinity;

        for (const park of parks) {
          if (!park.the_geom?.coordinates) continue;

          // Get center of park geometry
          let parkLat: number;
          let parkLng: number;

          if (park.the_geom.type === 'Point') {
            [parkLng, parkLat] = park.the_geom.coordinates as number[];
          } else if (park.the_geom.type === 'Polygon' || park.the_geom.type === 'MultiPolygon') {
            // Use centroid approximation (first coordinate)
            const coords = park.the_geom.coordinates;
            if (park.the_geom.type === 'Polygon') {
              const ring = (coords as number[][][])[0];
              parkLng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
              parkLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
            } else {
              const firstPoly = (coords as unknown as number[][][][])[0][0];
              parkLng = firstPoly.reduce((sum, c) => sum + c[0], 0) / firstPoly.length;
              parkLat = firstPoly.reduce((sum, c) => sum + c[1], 0) / firstPoly.length;
            }
          } else {
            continue;
          }

          // Haversine distance
          const R = 6371000; // Earth radius in meters
          const dLat = ((parkLat - lat) * Math.PI) / 180;
          const dLng = ((parkLng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) * Math.cos((parkLat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          if (distance < nearestDistance && distance < 500) {
            nearestDistance = distance;
            nearestPark = park;
          }
        }

        if (nearestPark?.park_id) {
          await query('UPDATE fitness_venues SET nyc_park_id = $2, updated_at = NOW() WHERE id = $1', [
            venue.id,
            nearestPark.park_id,
          ]);
          linked++;
        } else {
          notFound++;
        }
      }

      await this.updateSyncLog(logId, {
        status: 'completed',
        recordsFetched: parks.length,
        recordsUpdated: linked,
        recordsSkipped: notFound,
      });

      log.info({ linked, notFound }, 'Park linking complete');
      return { linked, notFound };
    } catch (error) {
      await this.updateSyncLog(logId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  // ============================================
  // VENUE QUERIES
  // ============================================

  /**
   * Get venues by data source
   */
  async getVenuesBySource(
    dataSource: 'manual' | 'nyc_open_data' | 'openstreetmap' | 'crowdsourced' | 'scraped',
    limit = 100
  ): Promise<FitnessVenue[]> {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM fitness_venues
       WHERE data_source = $1 AND is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT $2`,
      [dataSource, limit]
    );

    return rows.map((row) => ({
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
    }));
  },

  /**
   * Get venues by borough
   */
  async getVenuesByBorough(
    borough: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island',
    options: { limit?: number; hasEquipment?: EquipmentType[] } = {}
  ): Promise<FitnessVenue[]> {
    const { limit = 100, hasEquipment } = options;

    const conditions = ['borough = $1', 'is_active = TRUE'];
    const values: unknown[] = [borough];
    let paramIndex = 2;

    if (hasEquipment && hasEquipment.length > 0) {
      conditions.push(`equipment ?| $${paramIndex}`);
      values.push(hasEquipment);
      paramIndex++;
    }

    values.push(limit);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT * FROM fitness_venues
       WHERE ${conditions.join(' AND ')}
       ORDER BY verification_count DESC, member_count DESC
       LIMIT $${paramIndex}`,
      values
    );

    return rows.map((row) => ({
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
    }));
  },

  /**
   * Get ingestion statistics
   */
  async getIngestionStats(): Promise<{
    totalVenues: number;
    bySource: Record<string, number>;
    byBorough: Record<string, number>;
    byType: Record<string, number>;
    lastSync: Record<string, Date | null>;
  }> {
    const [total, sourceStats, boroughStats, typeStats, lastSyncs] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM fitness_venues WHERE is_active = TRUE'),
      queryAll<{ data_source: string; count: string }>(
        `SELECT COALESCE(data_source, 'manual') as data_source, COUNT(*) as count
         FROM fitness_venues WHERE is_active = TRUE
         GROUP BY data_source`
      ),
      queryAll<{ borough: string; count: string }>(
        `SELECT COALESCE(borough, 'Unknown') as borough, COUNT(*) as count
         FROM fitness_venues WHERE is_active = TRUE
         GROUP BY borough`
      ),
      queryAll<{ venue_type: string; count: string }>(
        `SELECT venue_type, COUNT(*) as count
         FROM fitness_venues WHERE is_active = TRUE
         GROUP BY venue_type`
      ),
      queryAll<{ data_source: string; last_sync: string }>(
        `SELECT data_source, MAX(completed_at) as last_sync
         FROM venue_data_sync_log
         WHERE status = 'completed'
         GROUP BY data_source`
      ),
    ]);

    return {
      totalVenues: parseInt(total?.count || '0'),
      bySource: Object.fromEntries(sourceStats.map((r) => [r.data_source, parseInt(r.count)])),
      byBorough: Object.fromEntries(boroughStats.map((r) => [r.borough, parseInt(r.count)])),
      byType: Object.fromEntries(typeStats.map((r) => [r.venue_type, parseInt(r.count)])),
      lastSync: Object.fromEntries(
        lastSyncs.map((r) => [r.data_source, r.last_sync ? new Date(r.last_sync) : null])
      ),
    };
  },
};

export default nycDataIngestionService;
