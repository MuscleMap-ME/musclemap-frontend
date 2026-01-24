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
const RECREATION_CENTERS_ENDPOINT = `${NYC_OPEN_DATA_BASE}/ydj7-rk56.json`;
const PARKS_PROPERTIES_ENDPOINT = `${NYC_OPEN_DATA_BASE}/enfh-gkve.json`;
const ATHLETIC_FACILITIES_ENDPOINT = `${NYC_OPEN_DATA_BASE}/qpgi-ckmp.json`;

// NYC Parks Fitness Equipment page (for scraping)
const NYC_PARKS_FITNESS_URL = 'https://www.nycgovparks.org/facilities/fitnessequipment';

// Rate limiting for API calls
const API_DELAY_MS = 250; // 4 requests per second max

interface NYCRecreationCenter {
  name?: string;
  address?: string;
  borough?: string;
  zipcode?: string;
  phone?: string;
  latitude?: string;
  longitude?: string;
  location?: {
    latitude?: string;
    longitude?: string;
  };
  gym?: string; // 'Yes' or 'No'
  pool?: string;
  fitness_center?: string;
  weight_room?: string;
  track?: string;
  basketball_ct?: string;
  tennis_ct?: string;
  handball_ct?: string;
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
  prop_id?: string;
  park_name?: string;
  facility_type?: string;
  the_geom?: {
    type: string;
    coordinates: number[];
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

// Helper function to map recreation center facilities to equipment types
function mapRecCenterToEquipment(rec: NYCRecreationCenter): EquipmentType[] {
  const equipment: EquipmentType[] = [];

  if (rec.gym === 'Yes' || rec.fitness_center === 'Yes') {
    equipment.push('weight_room', 'cardio_room');
  }
  if (rec.weight_room === 'Yes') {
    equipment.push('bench_press', 'squat_rack', 'dumbbells', 'barbell');
  }
  if (rec.pool === 'Yes') {
    equipment.push('pool');
  }
  if (rec.track === 'Yes') {
    equipment.push('track');
  }
  if (rec.basketball_ct === 'Yes') {
    equipment.push('basketball_court');
  }
  if (rec.tennis_ct === 'Yes') {
    equipment.push('tennis_court');
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
  // NYC RECREATION CENTERS
  // ============================================

  /**
   * Fetch recreation centers from NYC Open Data
   */
  async fetchRecreationCenters(): Promise<NYCRecreationCenter[]> {
    try {
      log.info('Fetching NYC recreation centers from Open Data...');

      const response = await fetch(`${RECREATION_CENTERS_ENDPOINT}?$limit=1000`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as NYCRecreationCenter[];
      log.info({ count: data.length }, 'Fetched recreation centers');
      return data;
    } catch (error) {
      log.error({ error }, 'Failed to fetch recreation centers');
      throw error;
    }
  },

  /**
   * Ingest recreation centers into the database
   */
  async ingestRecreationCenters(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    const logId = await this.createSyncLog('nyc_open_data', 'recreation_centers', 'full');

    try {
      const centers = await this.fetchRecreationCenters();

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const center of centers) {
        try {
          await delay(API_DELAY_MS);

          // Skip if missing required fields
          if (!center.name) {
            skipped++;
            continue;
          }

          // Get coordinates
          let latitude: number | undefined;
          let longitude: number | undefined;

          if (center.latitude && center.longitude) {
            latitude = parseFloat(center.latitude);
            longitude = parseFloat(center.longitude);
          } else if (center.location?.latitude && center.location?.longitude) {
            latitude = parseFloat(center.location.latitude);
            longitude = parseFloat(center.location.longitude);
          }

          if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
            log.warn({ name: center.name }, 'Recreation center missing coordinates, skipping');
            skipped++;
            continue;
          }

          const borough = normalizeBoroughName(center.borough);
          const slug = generateSlug(center.name, borough || undefined);
          const equipment = mapRecCenterToEquipment(center);

          // Check if venue already exists (by external_id or slug)
          const existing = await queryOne<{ id: string }>(
            `SELECT id FROM fitness_venues
             WHERE (data_source = 'nyc_open_data' AND external_id = $1)
                OR slug = $2`,
            [`rec_${slug}`, slug]
          );

          const venueData = {
            name: center.name.trim(),
            slug,
            venueType: 'recreation_center' as VenueType,
            latitude,
            longitude,
            address: center.address,
            city: borough || 'New York',
            borough,
            postalCode: center.zipcode,
            equipment: JSON.stringify(equipment),
            hasFreeWeights: equipment.includes('weight_room'),
            hasCalisthenicsEquipment: false,
            hasCardioEquipment: equipment.includes('cardio_room'),
            isIndoor: true,
            isFree: true,
            isVerified: true,
            dataSource: 'nyc_open_data',
            externalId: `rec_${slug}`,
          };

          if (existing) {
            // Update existing
            await query(
              `UPDATE fitness_venues SET
                name = $2, latitude = $3, longitude = $4, address = $5,
                city = $6, borough = $7, postal_code = $8, equipment = $9::jsonb,
                has_free_weights = $10, has_cardio_equipment = $11,
                last_synced_at = NOW(), updated_at = NOW()
               WHERE id = $1`,
              [
                existing.id,
                venueData.name,
                venueData.latitude,
                venueData.longitude,
                venueData.address,
                venueData.city,
                venueData.borough,
                venueData.postalCode,
                venueData.equipment,
                venueData.hasFreeWeights,
                venueData.hasCardioEquipment,
              ]
            );
            updated++;
          } else {
            // Create new
            await query(
              `INSERT INTO fitness_venues (
                name, slug, venue_type, latitude, longitude, address, city, borough,
                postal_code, equipment, has_free_weights, has_calisthenics_equipment,
                has_cardio_equipment, is_indoor, is_free, is_verified, data_source, external_id, last_synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
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
                venueData.address,
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
          log.error({ error, center: center.name }, 'Failed to process recreation center');
          failed++;
        }
      }

      await this.updateSyncLog(logId, {
        status: failed > 0 ? 'partial' : 'completed',
        recordsFetched: centers.length,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsSkipped: skipped,
        recordsFailed: failed,
      });

      log.info({ created, updated, skipped, failed }, 'Recreation center ingestion complete');
      return { created, updated, skipped, failed };
    } catch (error) {
      await this.updateSyncLog(logId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
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
