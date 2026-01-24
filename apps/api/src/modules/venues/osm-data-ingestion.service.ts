/**
 * OpenStreetMap Data Ingestion Service
 *
 * Handles ingestion of outdoor fitness equipment data from OpenStreetMap via Overpass API.
 * OSM uses the "leisure=fitness_station" tag for outdoor fitness equipment.
 *
 * Reference: https://wiki.openstreetmap.org/wiki/Tag:leisure%3Dfitness_station
 */

import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import { EquipmentType, VenueType } from './types';

const log = loggers.core;

// Overpass API endpoints (use multiple for fallback)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Rate limiting for Overpass API
const API_DELAY_MS = 1000; // 1 second between requests

// NYC bounding box (SW corner, NE corner)
const NYC_BOUNDS = {
  south: 40.4774,
  west: -74.2591,
  north: 40.9176,
  east: -73.7004,
};

interface OSMNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OSMWay {
  type: 'way';
  id: number;
  center?: {
    lat: number;
    lon: number;
  };
  nodes?: number[];
  tags?: Record<string, string>;
}

type OSMElement = OSMNode | OSMWay;

interface OSMResponse {
  version: number;
  generator: string;
  elements: OSMElement[];
}

// Mapping OSM fitness_station values to our equipment types
const OSM_EQUIPMENT_MAPPING: Record<string, EquipmentType> = {
  // Common OSM tags
  horizontal_bar: 'pull_up_bar',
  high_bar: 'pull_up_bar',
  pullup_bar: 'pull_up_bar',
  'pull-up_bar': 'pull_up_bar',
  'pull_up': 'pull_up_bar',

  parallel_bars: 'parallel_bars',
  p_bars: 'parallel_bars',
  dip_bars: 'dip_station',
  dip_station: 'dip_station',
  dips: 'dip_station',

  horizontal_ladder: 'monkey_bars',
  monkey_bars: 'monkey_bars',
  ladder: 'monkey_bars',

  rings: 'rings',
  gymnastics_rings: 'rings',

  wall_bars: 'swedish_wall',
  stall_bars: 'swedish_wall',
  swedish_wall: 'swedish_wall',
  sprossenwand: 'swedish_wall',

  balance_beam: 'balance_beam',
  beam: 'balance_beam',

  'sit-up': 'ab_bench',
  situp: 'ab_bench',
  sit_up_bench: 'ab_bench',
  abdominal_bench: 'ab_bench',

  hyperextension: 'back_extension',
  back_extension: 'back_extension',
  roman_chair: 'back_extension',

  bench_press: 'bench_press',
  leg_press: 'leg_press',
  chest_press: 'chest_press',
  lat_pulldown: 'lat_pull',
  shoulder_press: 'shoulder_press',

  elliptical: 'elliptical_outdoor',
  cross_trainer: 'elliptical_outdoor',
  bicycle: 'stationary_bike_outdoor',
  bike: 'stationary_bike_outdoor',
  rowing: 'rowing_machine_outdoor',
  stepper: 'stepper_outdoor',

  climbing: 'climbing_rope',
  rope_climb: 'climbing_rope',
  pegboard: 'pegboard',

  box: 'box_jump_platform',
  plyo_box: 'box_jump_platform',
  push_up: 'box_jump_platform',
  pushup: 'box_jump_platform',

  multi: 'multi_station',
  multi_station: 'multi_station',
  combination: 'multi_station',
};

// Helper function to parse OSM fitness_station tag values
function parseOsmEquipment(tags: Record<string, string>): EquipmentType[] {
  const equipment: EquipmentType[] = [];

  // Check fitness_station tag (can be semicolon-separated list)
  const fitnessStation = tags.fitness_station;
  if (fitnessStation) {
    const items = fitnessStation.split(';').map((s) => s.trim().toLowerCase());
    for (const item of items) {
      const mapped = OSM_EQUIPMENT_MAPPING[item] || OSM_EQUIPMENT_MAPPING[item.replace(/[_-]/g, '_')];
      if (mapped && !equipment.includes(mapped)) {
        equipment.push(mapped);
      }
    }
  }

  // Also check specific tags like sport=*
  if (tags.sport) {
    const sports = tags.sport.split(';').map((s) => s.trim().toLowerCase());
    if (sports.includes('gymnastics') || sports.includes('calisthenics')) {
      if (!equipment.includes('pull_up_bar')) equipment.push('pull_up_bar');
      if (!equipment.includes('parallel_bars')) equipment.push('parallel_bars');
    }
    if (sports.includes('fitness')) {
      if (!equipment.includes('multi_station')) equipment.push('multi_station');
    }
  }

  // If leisure=fitness_station but no specific equipment parsed, add generic
  if (tags.leisure === 'fitness_station' && equipment.length === 0) {
    equipment.push('multi_station');
  }

  return equipment;
}

// Helper function to determine venue type from OSM tags
function determineVenueType(tags: Record<string, string>): VenueType {
  if (tags.leisure === 'fitness_station' || tags.leisure === 'outdoor_gym') {
    return 'outdoor_gym';
  }
  if (tags.amenity === 'gym' || tags.leisure === 'fitness_centre') {
    return 'public_gym';
  }
  if (tags.leisure === 'playground') {
    return 'playground';
  }
  if (tags.leisure === 'park' || tags.landuse === 'recreation_ground') {
    return 'park';
  }
  return 'outdoor_gym';
}

// Helper function to generate venue name from OSM tags
function generateVenueName(tags: Record<string, string>, lat: number, lon: number): string {
  if (tags.name) return tags.name;
  if (tags.description) return tags.description.substring(0, 100);

  // Try to build a descriptive name
  const parts: string[] = [];

  if (tags.leisure === 'fitness_station') {
    parts.push('Outdoor Fitness Station');
  } else if (tags.leisure === 'outdoor_gym') {
    parts.push('Outdoor Gym');
  } else {
    parts.push('Fitness Equipment');
  }

  // Add location hint if available
  if (tags['addr:street']) {
    parts.push(`at ${tags['addr:street']}`);
  } else if (tags.operator) {
    parts.push(`by ${tags.operator}`);
  }

  // If still generic, add coordinate hint
  if (parts.length === 1) {
    parts.push(`(${lat.toFixed(4)}, ${lon.toFixed(4)})`);
  }

  return parts.join(' ');
}

// Helper function to generate unique slug
function generateOsmSlug(osmId: number, name: string): string {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);

  return `osm-${osmId}-${nameSlug}`;
}

// Helper function to determine borough from coordinates
function getBoroughFromCoords(lat: number, lon: number): string | null {
  // Simplified borough boundaries (approximate)
  // Manhattan: roughly below 110th St and between rivers
  if (lat >= 40.7 && lat <= 40.88 && lon >= -74.02 && lon <= -73.91) {
    // Check if in Manhattan (narrow strip)
    if (lon >= -74.01 && lon <= -73.96 && lat >= 40.7 && lat <= 40.82) {
      return 'Manhattan';
    }
  }

  // Staten Island: southwest corner
  if (lat < 40.65 && lon < -74.05) {
    return 'Staten Island';
  }

  // Bronx: north of Manhattan
  if (lat > 40.82 && lon > -73.95) {
    return 'Bronx';
  }

  // Brooklyn: south of Manhattan, east of Staten Island
  if (lat < 40.72 && lon > -74.05 && lon < -73.83) {
    return 'Brooklyn';
  }

  // Queens: east side
  if (lon > -73.87 && lat > 40.5 && lat < 40.85) {
    return 'Queens';
  }

  // Default to closest guess
  if (lat < 40.7) {
    return lon < -73.95 ? 'Brooklyn' : 'Queens';
  }
  if (lat > 40.8) {
    return 'Bronx';
  }
  return 'Manhattan';
}

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const osmDataIngestionService = {
  // ============================================
  // OVERPASS API QUERIES
  // ============================================

  /**
   * Query Overpass API for fitness stations in NYC
   */
  async queryOverpassForFitnessStations(): Promise<OSMElement[]> {
    const query = `
      [out:json][timeout:120];
      (
        // Fitness stations
        node["leisure"="fitness_station"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});
        way["leisure"="fitness_station"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});

        // Outdoor gyms
        node["leisure"="outdoor_gym"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});
        way["leisure"="outdoor_gym"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});

        // Fitness equipment with specific tags
        node["fitness_station"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});

        // Sport=fitness areas
        node["sport"="fitness"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});
        way["sport"="fitness"](${NYC_BOUNDS.south},${NYC_BOUNDS.west},${NYC_BOUNDS.north},${NYC_BOUNDS.east});
      );
      out center body;
      >;
      out skel qt;
    `;

    let lastError: Error | null = null;

    // Try each endpoint until one works
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        log.info({ endpoint }, 'Querying Overpass API...');

        const response = await fetch(endpoint, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as OSMResponse;

        // Filter to only nodes and ways with coordinates
        const elements = data.elements.filter((el) => {
          if (el.type === 'node') {
            return el.lat !== undefined && el.lon !== undefined;
          }
          if (el.type === 'way') {
            return el.center?.lat !== undefined && el.center?.lon !== undefined;
          }
          return false;
        });

        log.info({ count: elements.length }, 'Overpass query successful');
        return elements;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        log.warn({ error: lastError.message, endpoint }, 'Overpass endpoint failed, trying next...');
        await delay(API_DELAY_MS);
      }
    }

    throw lastError || new Error('All Overpass endpoints failed');
  },

  /**
   * Ingest OpenStreetMap fitness stations into the database
   */
  async ingestOsmFitnessStations(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }> {
    const logId = await queryOne<{ id: string }>(
      `INSERT INTO venue_data_sync_log (data_source, source_dataset, sync_type, status)
       VALUES ('openstreetmap', 'fitness_stations', 'full', 'running')
       RETURNING id`
    );

    try {
      const elements = await this.queryOverpassForFitnessStations();

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const element of elements) {
        try {
          await delay(50); // Light rate limiting for database writes

          // Get coordinates
          let lat: number;
          let lon: number;

          if (element.type === 'node') {
            lat = element.lat;
            lon = element.lon;
          } else if (element.type === 'way' && element.center) {
            lat = element.center.lat;
            lon = element.center.lon;
          } else {
            skipped++;
            continue;
          }

          const tags = element.tags || {};
          const equipment = parseOsmEquipment(tags);

          // Skip if no meaningful equipment detected
          if (equipment.length === 0 && !tags.leisure && !tags.sport) {
            skipped++;
            continue;
          }

          const osmId = element.id;
          const name = generateVenueName(tags, lat, lon);
          const slug = generateOsmSlug(osmId, name);
          const venueType = determineVenueType(tags);
          const borough = getBoroughFromCoords(lat, lon);

          // Check if venue already exists
          const existing = await queryOne<{ id: string }>(
            `SELECT id FROM fitness_venues
             WHERE osm_id = $1 OR slug = $2`,
            [osmId, slug]
          );

          const venueData = {
            name,
            slug,
            venueType,
            latitude: lat,
            longitude: lon,
            address: tags['addr:street']
              ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim()
              : undefined,
            city: borough || 'New York',
            borough,
            postalCode: tags['addr:postcode'],
            equipment: JSON.stringify(equipment),
            hasCalisthenicsEquipment: equipment.some((e) =>
              ['pull_up_bar', 'parallel_bars', 'dip_station', 'rings', 'monkey_bars'].includes(e)
            ),
            hasFreeWeights: false,
            hasCardioEquipment: equipment.some((e) =>
              ['elliptical_outdoor', 'stationary_bike_outdoor', 'rowing_machine_outdoor', 'stepper_outdoor'].includes(e)
            ),
            isIndoor: false,
            isFree: tags.fee !== 'yes',
            is24Hour: tags.opening_hours === '24/7',
            isVerified: false, // OSM data needs user verification
            dataSource: 'openstreetmap',
            osmId,
            osmTags: JSON.stringify(tags),
            description: tags.description,
          };

          if (existing) {
            // Update existing
            await query(
              `UPDATE fitness_venues SET
                name = $2, latitude = $3, longitude = $4, address = $5,
                city = $6, borough = $7, equipment = $8::jsonb,
                has_calisthenics_equipment = $9, has_cardio_equipment = $10,
                osm_tags = $11::jsonb, description = $12,
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
                venueData.equipment,
                venueData.hasCalisthenicsEquipment,
                venueData.hasCardioEquipment,
                venueData.osmTags,
                venueData.description,
              ]
            );
            updated++;
          } else {
            // Create new
            await query(
              `INSERT INTO fitness_venues (
                name, slug, venue_type, latitude, longitude, address, city, borough,
                postal_code, equipment, has_calisthenics_equipment, has_free_weights,
                has_cardio_equipment, is_indoor, is_free, is_24_hour, is_verified,
                data_source, osm_id, osm_tags, description, last_synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21, NOW())
              ON CONFLICT (slug) DO UPDATE SET
                osm_id = EXCLUDED.osm_id,
                osm_tags = EXCLUDED.osm_tags,
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
                venueData.hasCalisthenicsEquipment,
                venueData.hasFreeWeights,
                venueData.hasCardioEquipment,
                venueData.isIndoor,
                venueData.isFree,
                venueData.is24Hour,
                venueData.isVerified,
                venueData.dataSource,
                venueData.osmId,
                venueData.osmTags,
                venueData.description,
              ]
            );
            created++;
          }
        } catch (error) {
          log.error({ error, elementId: element.id }, 'Failed to process OSM element');
          failed++;
        }
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
        [logId!.id, failed > 0 ? 'partial' : 'completed', elements.length, created, updated, skipped, failed]
      );

      log.info({ created, updated, skipped, failed }, 'OSM ingestion complete');
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
   * Get all OSM-sourced venues
   */
  async getOsmVenues(
    options: { limit?: number; hasEquipment?: EquipmentType[]; borough?: string } = {}
  ): Promise<
    Array<{
      id: string;
      name: string;
      osmId: number;
      latitude: number;
      longitude: number;
      equipment: EquipmentType[];
      borough: string | null;
      osmTags: Record<string, string>;
    }>
  > {
    const { limit = 100, hasEquipment, borough } = options;

    const conditions = ["data_source = 'openstreetmap'", 'is_active = TRUE'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (hasEquipment && hasEquipment.length > 0) {
      conditions.push(`equipment ?| $${paramIndex}`);
      values.push(hasEquipment);
      paramIndex++;
    }

    if (borough) {
      conditions.push(`borough = $${paramIndex}`);
      values.push(borough);
      paramIndex++;
    }

    values.push(limit);

    const rows = await queryAll<Record<string, unknown>>(
      `SELECT id, name, osm_id, latitude, longitude, equipment, borough, osm_tags
       FROM fitness_venues
       WHERE ${conditions.join(' AND ')}
       ORDER BY osm_id DESC
       LIMIT $${paramIndex}`,
      values
    );

    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      osmId: row.osm_id as number,
      latitude: parseFloat(row.latitude as string),
      longitude: parseFloat(row.longitude as string),
      equipment: (row.equipment as EquipmentType[]) || [],
      borough: row.borough as string | null,
      osmTags: (row.osm_tags as Record<string, string>) || {},
    }));
  },

  /**
   * Update OSM venue with user-provided equipment data
   */
  async updateOsmVenueEquipment(
    venueId: string,
    equipment: EquipmentType[],
    userId: string
  ): Promise<void> {
    await query(
      `UPDATE fitness_venues SET
        equipment = $2::jsonb,
        has_calisthenics_equipment = $3,
        has_cardio_equipment = $4,
        updated_at = NOW()
       WHERE id = $1 AND data_source = 'openstreetmap'`,
      [
        venueId,
        JSON.stringify(equipment),
        equipment.some((e) =>
          ['pull_up_bar', 'parallel_bars', 'dip_station', 'rings', 'monkey_bars'].includes(e)
        ),
        equipment.some((e) =>
          ['elliptical_outdoor', 'stationary_bike_outdoor', 'rowing_machine_outdoor', 'stepper_outdoor'].includes(e)
        ),
      ]
    );

    // Log the contribution
    await query(
      `INSERT INTO venue_contributions (venue_id, user_id, contribution_type, details)
       VALUES ($1, $2, 'update_condition', $3::jsonb)`,
      [venueId, userId, JSON.stringify({ equipment, source: 'osm_correction' })]
    );
  },
};

export default osmDataIngestionService;
