/**
 * Calisthenics-Parks.com Data Ingestion Service
 *
 * Handles ingestion of outdoor fitness equipment data from Calisthenics-Parks.com.
 * This site has 26,000+ spots globally but requires authentication to access their API.
 *
 * NOTE: This service is currently a placeholder. To use it:
 * 1. Contact Calisthenics-Parks.com for data sharing partnership, OR
 * 2. Implement authenticated scraping with proper rate limiting
 *
 * Reference: https://calisthenics-parks.com/spots
 */

import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import { EquipmentType, VenueType } from './types';

const log = loggers.core;

// API configuration (requires authentication)
const CP_BASE_URL = 'https://calisthenics-parks.com';

// Rate limiting for API/scraping
const API_DELAY_MS = 500; // Be conservative

interface CPSpot {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region?: string;
  city?: string;
  address?: string;
  description?: string;
  tags?: string[];
  equipment?: string[];
  illuminated?: boolean;
  roofed?: boolean;
  accessible?: boolean;
  imageUrl?: string;
}

// Mapping Calisthenics-Parks equipment tags to our equipment types
const CP_EQUIPMENT_MAPPING: Record<string, EquipmentType> = {
  // Common equipment names
  high_bar: 'pull_up_bar',
  pullup_bar: 'pull_up_bar',
  pull_up_bar: 'pull_up_bar',
  chin_up_bar: 'pull_up_bar',

  parallel_bars: 'parallel_bars',
  p_bars: 'parallel_bars',

  dip_bars: 'dip_station',
  dip_station: 'dip_station',
  dips: 'dip_station',

  monkey_bars: 'monkey_bars',
  horizontal_ladder: 'monkey_bars',

  rings: 'rings',
  gymnastics_rings: 'rings',

  low_bar: 'pull_up_bar', // Map to pull_up_bar (low bars are still pull-up bars)
  low_pull_up_bar: 'pull_up_bar',

  incline_bench: 'ab_bench',
  sit_up_bench: 'ab_bench',
  ab_bench: 'ab_bench',

  wall_bars: 'swedish_wall',
  swedish_wall: 'swedish_wall',
  stall_bars: 'swedish_wall',

  balance_beam: 'balance_beam',

  rope: 'climbing_rope',
  rope_climb: 'climbing_rope',

  box: 'box_jump_platform',
  plyo_box: 'box_jump_platform',

  multi_station: 'multi_station',
  workout_station: 'multi_station',
};

// Helper function to parse equipment from CP tags
function parseCPEquipment(tags: string[]): EquipmentType[] {
  const equipment: EquipmentType[] = [];

  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase().replace(/[\s-]/g, '_');
    const mapped = CP_EQUIPMENT_MAPPING[normalizedTag];
    if (mapped && !equipment.includes(mapped)) {
      equipment.push(mapped);
    }
  }

  // If no specific equipment mapped, add generic multi_station
  if (equipment.length === 0 && tags.length > 0) {
    equipment.push('multi_station');
  }

  return equipment;
}

// Helper function to generate unique slug
function generateCPSlug(spotId: number, name: string): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);

  return `cp-${spotId}-${nameSlug}`;
}

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const calisthenicsParksIngestionService = {
  /**
   * Check if the service is available (has authentication)
   */
  isAvailable(): boolean {
    // Check for authentication credentials
    const hasAuth = !!process.env.CALISTHENICS_PARKS_API_KEY;
    return hasAuth;
  },

  /**
   * Fetch spots from Calisthenics-Parks.com
   * NOTE: This requires authentication which is not yet implemented
   */
  async fetchSpots(options: {
    limit?: number;
    offset?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
  } = {}): Promise<CPSpot[]> {
    const { limit = 100, offset = 0 } = options;

    // Check if service is available
    if (!this.isAvailable()) {
      log.warn('Calisthenics-Parks ingestion not available - missing API credentials');
      throw new Error(
        'Calisthenics-Parks API credentials not configured. ' +
          'Set CALISTHENICS_PARKS_API_KEY environment variable or contact them for data partnership.'
      );
    }

    // Placeholder for actual API call
    // When implemented, this would:
    // 1. Authenticate with their API
    // 2. Fetch spots with pagination
    // 3. Handle rate limiting

    log.info({ limit, offset }, 'Would fetch from Calisthenics-Parks API');

    // For now, return empty array
    return [];
  },

  /**
   * Ingest spots from Calisthenics-Parks.com into the database
   * NOTE: This is a placeholder implementation
   */
  async ingestCalisthenicsParksSpots(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    // Check availability first
    if (!this.isAvailable()) {
      log.warn('Calisthenics-Parks ingestion skipped - service not available');
      return {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };
    }

    const logId = await queryOne<{ id: string }>(
      `INSERT INTO venue_data_sync_log (data_source, source_dataset, sync_type, status)
       VALUES ('calisthenics_parks', 'global_spots', 'full', 'running')
       RETURNING id`
    );

    try {
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      let offset = 0;
      const batchSize = 100;

      // Paginate through all spots
      while (true) {
        const spots = await this.fetchSpots({ limit: batchSize, offset });

        if (spots.length === 0) {
          break;
        }

        for (const spot of spots) {
          try {
            await delay(50); // Light rate limiting for database writes

            const slug = generateCPSlug(spot.id, spot.name);
            const equipment = parseCPEquipment(spot.equipment || spot.tags || []);

            // Check if venue already exists
            const existing = await queryOne<{ id: string }>(
              `SELECT id FROM fitness_venues
               WHERE external_id = $1 AND data_source = 'calisthenics_parks'
               OR slug = $2`,
              [String(spot.id), slug]
            );

            const venueData = {
              name: spot.name,
              slug,
              venueType: 'calisthenics_park' as VenueType,
              latitude: spot.latitude,
              longitude: spot.longitude,
              address: spot.address,
              city: spot.city,
              country: spot.country,
              equipment: JSON.stringify(equipment),
              hasCalisthenicsEquipment: equipment.some((e) =>
                ['pull_up_bar', 'parallel_bars', 'dip_station', 'rings', 'monkey_bars'].includes(e)
              ),
              hasFreeWeights: false,
              hasCardioEquipment: false,
              isIndoor: spot.roofed || false,
              isFree: true, // Assume free unless stated otherwise
              is24Hour: spot.illuminated || false, // Illuminated suggests night access
              isVerified: false,
              isAccessible: spot.accessible || false,
              dataSource: 'calisthenics_parks',
              externalId: String(spot.id),
              description: spot.description,
              photos: spot.imageUrl ? JSON.stringify([{ url: spot.imageUrl, source: 'calisthenics_parks' }]) : null,
            };

            if (existing) {
              // Update existing
              await query(
                `UPDATE fitness_venues SET
                  name = $2, latitude = $3, longitude = $4, address = $5,
                  city = $6, equipment = $7::jsonb,
                  has_calisthenics_equipment = $8, is_indoor = $9, is_24_hour = $10,
                  is_accessible = $11, description = $12,
                  last_synced_at = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [
                  existing.id,
                  venueData.name,
                  venueData.latitude,
                  venueData.longitude,
                  venueData.address,
                  venueData.city,
                  venueData.equipment,
                  venueData.hasCalisthenicsEquipment,
                  venueData.isIndoor,
                  venueData.is24Hour,
                  venueData.isAccessible,
                  venueData.description,
                ]
              );
              updated++;
            } else {
              // Create new
              await query(
                `INSERT INTO fitness_venues (
                  name, slug, venue_type, latitude, longitude, address, city,
                  equipment, has_calisthenics_equipment, has_free_weights,
                  has_cardio_equipment, is_indoor, is_free, is_24_hour,
                  is_verified, is_accessible, data_source, external_id,
                  description, photos, last_synced_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, NOW())
                ON CONFLICT (slug) DO UPDATE SET
                  external_id = EXCLUDED.external_id,
                  data_source = EXCLUDED.data_source,
                  last_synced_at = NOW()`,
                [
                  venueData.name,
                  venueData.slug,
                  venueData.venueType,
                  venueData.latitude,
                  venueData.longitude,
                  venueData.address,
                  venueData.city,
                  venueData.equipment,
                  venueData.hasCalisthenicsEquipment,
                  venueData.hasFreeWeights,
                  venueData.hasCardioEquipment,
                  venueData.isIndoor,
                  venueData.isFree,
                  venueData.is24Hour,
                  venueData.isVerified,
                  venueData.isAccessible,
                  venueData.dataSource,
                  venueData.externalId,
                  venueData.description,
                  venueData.photos,
                ]
              );
              created++;
            }
          } catch (error) {
            log.error({ error, spotId: spot.id }, 'Failed to process CP spot');
            failed++;
          }
        }

        offset += batchSize;
        await delay(API_DELAY_MS); // Rate limit between batches
      }

      // Update sync log
      await query(
        `UPDATE venue_data_sync_log SET
          status = $2,
          records_fetched = $3,
          records_created = $4,
          records_updated = $5,
          records_skipped = $6,
          records_failed = $7,
          completed_at = NOW()
         WHERE id = $1`,
        [logId!.id, failed > 0 ? 'partial' : 'completed', created + updated + skipped + failed, created, updated, skipped, failed]
      );

      log.info({ created, updated, skipped, failed }, 'Calisthenics-Parks ingestion complete');
      return { created, updated, skipped, failed };
    } catch (error) {
      await query(
        `UPDATE venue_data_sync_log SET
          status = 'failed',
          error_message = $2,
          completed_at = NOW()
         WHERE id = $1`,
        [logId!.id, error instanceof Error ? error.message : 'Unknown error']
      );
      throw error;
    }
  },

  /**
   * Get statistics about Calisthenics-Parks data in our database
   */
  async getIngestionStats(): Promise<{
    totalVenues: number;
    byCountry: Record<string, number>;
    lastSyncAt: Date | null;
  }> {
    const stats = await queryOne<{ count: string; last_sync: Date | null }>(
      `SELECT COUNT(*) as count, MAX(last_synced_at) as last_sync
       FROM fitness_venues
       WHERE data_source = 'calisthenics_parks'`
    );

    const byCountry = await queryAll<{ country: string; count: string }>(
      `SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as count
       FROM fitness_venues
       WHERE data_source = 'calisthenics_parks'
       GROUP BY country
       ORDER BY count DESC
       LIMIT 20`
    );

    return {
      totalVenues: parseInt(stats?.count || '0'),
      byCountry: Object.fromEntries(byCountry.map((row) => [row.country, parseInt(row.count)])),
      lastSyncAt: stats?.last_sync || null,
    };
  },
};

export default calisthenicsParksIngestionService;
