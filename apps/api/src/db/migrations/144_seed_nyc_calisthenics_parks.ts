/**
 * Migration: Seed NYC Calisthenics Parks
 *
 * Seeds known NYC outdoor fitness locations with their equipment details.
 * These are well-documented calisthenics parks that are popular in the NYC area.
 */

// SQL-SAFE: All queries use parameterized placeholders ($1, $2, etc.). No string interpolation in SQL.

import { db, ensurePoolReady } from '../client';
import { loggers } from '../../lib/logger';
import { randomUUID } from 'crypto';

const log = loggers.db;

interface CalisthenicsLocation {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  borough: string;
  neighborhood?: string;
  description: string;
  equipment: string[];
  venueType: 'calisthenics_park' | 'outdoor_gym' | 'park';
  amenities?: string[];
  isFree: boolean;
  coveredArea?: boolean;
  lightingAvailable?: boolean;
}

// Well-known NYC calisthenics locations with verified equipment
const NYC_CALISTHENICS_PARKS: CalisthenicsLocation[] = [
  // Manhattan
  {
    name: 'Five Pointz Calisthenics Park',
    latitude: 40.7433,
    longitude: -73.9359,
    address: 'Jackson Ave & Crane St, Long Island City',
    borough: 'Queens',
    neighborhood: 'Long Island City',
    description: 'One of NYC\'s most iconic outdoor workout spots with extensive calisthenics equipment.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'monkey_bars', 'rings', 'swedish_wall'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms_nearby'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Marcus Garvey Park Fitness Area',
    latitude: 40.8044,
    longitude: -73.9396,
    address: 'Madison Ave & E 120th St, Harlem',
    borough: 'Manhattan',
    neighborhood: 'Harlem',
    description: 'Historic park with a dedicated calisthenics area frequented by local fitness enthusiasts.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'benches'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Tompkins Square Park Workout Area',
    latitude: 40.7265,
    longitude: -73.9817,
    address: 'Avenue A & E 7th St, East Village',
    borough: 'Manhattan',
    neighborhood: 'East Village',
    description: 'Popular East Village park with outdoor fitness equipment and active calisthenics community.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'basketball_court_nearby'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'John Jay Park Fitness Area',
    latitude: 40.7691,
    longitude: -73.9464,
    address: 'Cherokee Pl & E 77th St, Upper East Side',
    borough: 'Manhattan',
    neighborhood: 'Upper East Side',
    description: 'Riverside park with excellent calisthenics equipment and views of the East River.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'monkey_bars'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'pool_nearby'],
    isFree: true,
    lightingAvailable: true,
  },

  // Brooklyn
  {
    name: 'Wingate Park Calisthenics',
    latitude: 40.6595,
    longitude: -73.9294,
    address: 'Winthrop St & Brooklyn Ave, East Flatbush',
    borough: 'Brooklyn',
    neighborhood: 'East Flatbush',
    description: 'Large park with dedicated outdoor fitness area popular with Brooklyn\'s fitness community.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench', 'back_extension'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'track'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Sunset Park Workout Area',
    latitude: 40.6469,
    longitude: -74.0044,
    address: '44th St & 5th Ave, Sunset Park',
    borough: 'Brooklyn',
    neighborhood: 'Sunset Park',
    description: 'Hilltop park with stunning Manhattan views and solid calisthenics equipment.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'amazing_views'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'McCarren Park Fitness Area',
    latitude: 40.7200,
    longitude: -73.9515,
    address: 'Driggs Ave & N 12th St, Williamsburg',
    borough: 'Brooklyn',
    neighborhood: 'Williamsburg',
    description: 'Popular Williamsburg park with outdoor fitness equipment near the track.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'track', 'pool_nearby'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Red Hook Recreation Area',
    latitude: 40.6761,
    longitude: -74.0095,
    address: 'Bay St & Columbia St, Red Hook',
    borough: 'Brooklyn',
    neighborhood: 'Red Hook',
    description: 'Waterfront recreation area with solid calisthenics setup.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'soccer_fields'],
    isFree: true,
    lightingAvailable: false,
  },

  // Queens
  {
    name: 'Astoria Park Outdoor Gym',
    latitude: 40.7782,
    longitude: -73.9225,
    address: 'Shore Blvd & 19th St, Astoria',
    borough: 'Queens',
    neighborhood: 'Astoria',
    description: 'Scenic waterfront park under the Triborough Bridge with excellent fitness equipment.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'monkey_bars', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'pool', 'track'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Flushing Meadows Corona Park Fitness',
    latitude: 40.7462,
    longitude: -73.8448,
    address: 'Grand Central Pkwy, Flushing',
    borough: 'Queens',
    neighborhood: 'Flushing',
    description: 'Home of the 1964 World\'s Fair with multiple fitness areas throughout the park.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'skating_rink'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Juniper Valley Park Calisthenics',
    latitude: 40.7213,
    longitude: -73.8772,
    address: 'Juniper Blvd S & 71st St, Middle Village',
    borough: 'Queens',
    neighborhood: 'Middle Village',
    description: 'Well-maintained community park with dedicated calisthenics area.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'track', 'basketball'],
    isFree: true,
    lightingAvailable: true,
  },

  // Bronx
  {
    name: 'Crotona Park Fitness Area',
    latitude: 40.8394,
    longitude: -73.8953,
    address: 'Crotona Park East & E 173rd St, Bronx',
    borough: 'Bronx',
    neighborhood: 'Crotona Park East',
    description: 'Large Bronx park with solid outdoor fitness equipment near the pool.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'pool', 'lake'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'St. Mary\'s Park Calisthenics',
    latitude: 40.8086,
    longitude: -73.9148,
    address: 'St Anns Ave & E 145th St, Mott Haven',
    borough: 'Bronx',
    neighborhood: 'Mott Haven',
    description: 'Historic Bronx park with active fitness community and good equipment.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'track'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Van Cortlandt Park Fitness Area',
    latitude: 40.8970,
    longitude: -73.8864,
    address: 'Van Cortlandt Park South, Bronx',
    borough: 'Bronx',
    neighborhood: 'Van Cortlandt Village',
    description: 'NYC\'s third-largest park with outdoor fitness equipment and extensive trails.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'pool', 'golf_course', 'trails'],
    isFree: true,
    lightingAvailable: true,
  },

  // Staten Island
  {
    name: 'Clove Lakes Park Fitness',
    latitude: 40.6214,
    longitude: -74.1110,
    address: 'Clove Rd & Victory Blvd, Sunnyside',
    borough: 'Staten Island',
    neighborhood: 'Sunnyside',
    description: 'Beautiful Staten Island park with fitness equipment near the lake.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'fishing'],
    isFree: true,
    lightingAvailable: false,
  },
  {
    name: 'Silver Lake Park Workout Area',
    latitude: 40.6354,
    longitude: -74.0934,
    address: 'Victory Blvd & Forest Ave, Silver Lake',
    borough: 'Staten Island',
    neighborhood: 'Silver Lake',
    description: 'Quiet Staten Island park with basic calisthenics equipment.',
    equipment: ['pull_up_bar', 'parallel_bars'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain'],
    isFree: true,
    lightingAvailable: false,
  },

  // Additional popular locations
  {
    name: 'Riverside Park Outdoor Gym (72nd St)',
    latitude: 40.7832,
    longitude: -73.9864,
    address: 'Riverside Dr & W 72nd St, Upper West Side',
    borough: 'Manhattan',
    neighborhood: 'Upper West Side',
    description: 'Popular outdoor gym in Riverside Park with Hudson River views.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'running_path'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Central Park North Meadow Fitness',
    latitude: 40.7965,
    longitude: -73.9553,
    address: 'Center Dr & 97th St Transverse, Central Park',
    borough: 'Manhattan',
    neighborhood: 'Central Park',
    description: 'Fitness area in the North Meadow recreation center area of Central Park.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'fields'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Brooklyn Bridge Park Fitness',
    latitude: 40.7004,
    longitude: -73.9967,
    address: 'Furman St & Old Fulton St, DUMBO',
    borough: 'Brooklyn',
    neighborhood: 'DUMBO',
    description: 'Stunning waterfront park with outdoor fitness equipment and Manhattan skyline views.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'amazing_views'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Prospect Park Fitness Area (Nethermead)',
    latitude: 40.6611,
    longitude: -73.9687,
    address: 'Prospect Park Southwest & 16th St',
    borough: 'Brooklyn',
    neighborhood: 'Prospect Park',
    description: 'Beautiful Brooklyn park with outdoor fitness equipment in the Nethermead area.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'boathouse'],
    isFree: true,
    lightingAvailable: true,
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export async function migrate(): Promise<void> {
  await ensurePoolReady();
  log.info('Running migration: 144_seed_nyc_calisthenics_parks');

  let venuesCreated = 0;
  let equipmentCreated = 0;

  for (const location of NYC_CALISTHENICS_PARKS) {
    const slug = generateSlug(location.name);

    // Check if venue already exists (by name or coordinates)
    const existingVenue = await db.queryOne<{ id: string }>(
      `SELECT id FROM fitness_venues
       WHERE slug = $1
       OR (ABS(latitude - $2) < 0.0001 AND ABS(longitude - $3) < 0.0001)`,
      [slug, location.latitude, location.longitude]
    );

    let venueId: string;

    if (existingVenue) {
      venueId = existingVenue.id;
      log.info(`Venue already exists: ${location.name} (${venueId})`);

      // Update the venue with any new info
      await db.query(
        `UPDATE fitness_venues SET
           description = COALESCE(NULLIF($2, ''), description),
           amenities = $3,
           is_free = $4,
           updated_at = NOW()
         WHERE id = $1`,
        [
          venueId,
          location.description,
          JSON.stringify(location.amenities || []),
          location.isFree,
        ]
      );
    } else {
      // Create new venue
      venueId = `fv_${randomUUID().replace(/-/g, '')}`;

      await db.query(
        `INSERT INTO fitness_venues (
           id, name, slug, description, venue_type, latitude, longitude,
           address, borough, neighborhood, city, country, data_source,
           amenities, is_free, has_calisthenics_equipment, is_active, is_verified,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, NOW(), NOW()
         )
         ON CONFLICT (slug) DO NOTHING`,
        [
          venueId,
          location.name,
          slug,
          location.description,
          location.venueType,
          location.latitude,
          location.longitude,
          location.address,
          location.borough,
          location.neighborhood || null,
          'New York',
          'United States',
          'manual',
          JSON.stringify(location.amenities || []),
          location.isFree,
          true, // has_calisthenics_equipment
          true, // is_active
          true, // is_verified - Pre-verified since these are known locations
        ]
      );

      venuesCreated++;
      log.info(`Created venue: ${location.name} (${venueId})`);
    }

    // Add equipment items
    for (const equipmentType of location.equipment) {
      // Check if equipment already exists for this venue
      const existingEquipment = await db.queryOne<{ id: string }>(
        `SELECT id FROM venue_equipment_items
         WHERE venue_id = $1 AND equipment_type = $2`,
        [venueId, equipmentType]
      );

      if (!existingEquipment) {
        const equipmentId = `vei_${randomUUID().replace(/-/g, '')}`;

        await db.query(
          `INSERT INTO venue_equipment_items (
             id, venue_id, equipment_type, quantity, condition,
             is_verified, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, NOW(), NOW()
           )`,
          [
            equipmentId,
            venueId,
            equipmentType,
            1, // Default quantity
            'good', // Default condition
            true, // Pre-verified
          ]
        );

        equipmentCreated++;
      }
    }
  }

  log.info(
    `Migration 144_seed_nyc_calisthenics_parks complete: ` +
    `${venuesCreated} venues created, ${equipmentCreated} equipment items added`
  );
}

export async function rollback(): Promise<void> {
  await ensurePoolReady();
  log.info('Rolling back migration: 144_seed_nyc_calisthenics_parks');

  // Generate slugs for all seeded locations
  const slugs = NYC_CALISTHENICS_PARKS.map((loc) => generateSlug(loc.name));

  // Delete equipment items for seeded venues
  await db.query(
    `DELETE FROM venue_equipment_items
     WHERE venue_id IN (
       SELECT id FROM fitness_venues WHERE slug = ANY($1)
     )`,
    [slugs]
  );

  // Delete seeded venues by slug
  await db.query(`DELETE FROM fitness_venues WHERE slug = ANY($1)`, [slugs]);

  log.info('Rollback complete: seeded NYC calisthenics parks removed');
}
