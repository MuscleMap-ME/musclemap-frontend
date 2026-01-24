/**
 * Migration: Seed Additional NYC Calisthenics Parks
 *
 * Adds more well-known NYC outdoor fitness locations across all 5 boroughs.
 */

// SQL-SAFE: All queries use parameterized placeholders ($1, $2, etc.). No string interpolation in SQL.

import { db, ensurePoolReady } from '../client';
import { loggers } from '../../lib/logger';

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

// Additional NYC calisthenics locations
const ADDITIONAL_NYC_PARKS: CalisthenicsLocation[] = [
  // Manhattan - Additional Locations
  {
    name: 'East River Park Track Fitness',
    latitude: 40.7146,
    longitude: -73.9756,
    address: 'East River Greenway at Delancey St',
    borough: 'Manhattan',
    neighborhood: 'Lower East Side',
    description: 'Renovated waterfront park with modern fitness equipment along the running track.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'running_track', 'bike_path'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Highbridge Park Fitness Area',
    latitude: 40.8412,
    longitude: -73.9306,
    address: 'Amsterdam Ave & W 174th St, Washington Heights',
    borough: 'Manhattan',
    neighborhood: 'Washington Heights',
    description: 'Historic park featuring the High Bridge with workout area overlooking the Harlem River.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'pool', 'recreation_center'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Fort Tryon Park Workout Area',
    latitude: 40.8622,
    longitude: -73.9315,
    address: 'Margaret Corbin Dr, Fort Tryon Park',
    borough: 'Manhattan',
    neighborhood: 'Fort Tryon',
    description: 'Scenic park with fitness equipment and stunning Hudson River views near The Cloisters.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'gardens'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'DeWitt Clinton Park Fitness',
    latitude: 40.7667,
    longitude: -73.9932,
    address: 'W 54th St & 11th Ave, Hell\'s Kitchen',
    borough: 'Manhattan',
    neighborhood: 'Hell\'s Kitchen',
    description: 'Neighborhood park with calisthenics equipment popular with Hell\'s Kitchen residents.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'climbing_boulder'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'dog_run', 'basketball_court'],
    isFree: true,
    lightingAvailable: true,
  },

  // Brooklyn - Additional Locations
  {
    name: 'Betsy Head Park Calisthenics',
    latitude: 40.6668,
    longitude: -73.9103,
    address: 'Dumont Ave & Strauss St, Brownsville',
    borough: 'Brooklyn',
    neighborhood: 'Brownsville',
    description: 'Large community park with extensive outdoor fitness equipment and active workout groups.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'monkey_bars', 'rings'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'pool', 'track'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Maria Hernandez Park Fitness',
    latitude: 40.7048,
    longitude: -73.9227,
    address: 'Knickerbocker Ave & Suydam St, Bushwick',
    borough: 'Brooklyn',
    neighborhood: 'Bushwick',
    description: 'Popular Bushwick park with dedicated fitness area frequented by local athletes.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'dog_run'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Commodore Barry Park Workout',
    latitude: 40.6981,
    longitude: -73.9800,
    address: 'Navy St & Flushing Ave, Fort Greene',
    borough: 'Brooklyn',
    neighborhood: 'Fort Greene',
    description: 'Fort Greene park with fitness equipment and views of the Navy Yard.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'tennis_courts', 'basketball_court'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Owl\'s Head Park Fitness',
    latitude: 40.6366,
    longitude: -74.0304,
    address: 'Colonial Rd & 67th St, Bay Ridge',
    borough: 'Brooklyn',
    neighborhood: 'Bay Ridge',
    description: 'Bay Ridge park with outdoor gym equipment and beautiful harbor views.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'skate_park'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Coffey Park Calisthenics',
    latitude: 40.6788,
    longitude: -74.0117,
    address: 'Richards St & Verona St, Red Hook',
    borough: 'Brooklyn',
    neighborhood: 'Red Hook',
    description: 'Red Hook community park with calisthenics equipment and local workout community.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'baseball_field'],
    isFree: true,
    lightingAvailable: true,
  },

  // Queens - Additional Locations
  {
    name: 'USTA Billie Jean King Tennis Center Fitness',
    latitude: 40.7493,
    longitude: -73.8451,
    address: 'Corona Park, Flushing Meadows',
    borough: 'Queens',
    neighborhood: 'Flushing',
    description: 'Fitness area near the tennis center in Flushing Meadows Corona Park.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'tennis_courts_nearby'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Cunningham Park Fitness Area',
    latitude: 40.7378,
    longitude: -73.7683,
    address: 'Union Turnpike & 196th St, Fresh Meadows',
    borough: 'Queens',
    neighborhood: 'Fresh Meadows',
    description: 'Large Queens park with fitness equipment near the running trails.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'trails', 'golf_course'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Forest Park Fitness Zone',
    latitude: 40.7008,
    longitude: -73.8498,
    address: 'Woodhaven Blvd & Forest Park Dr',
    borough: 'Queens',
    neighborhood: 'Woodhaven',
    description: 'Forest Park fitness area with equipment surrounded by beautiful trees.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'trails', 'bandshell'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Socrates Sculpture Park Fitness',
    latitude: 40.7706,
    longitude: -73.9369,
    address: 'Broadway & Vernon Blvd, Long Island City',
    borough: 'Queens',
    neighborhood: 'Long Island City',
    description: 'Waterfront sculpture park with fitness equipment and stunning Manhattan views.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'art_installations', 'views'],
    isFree: true,
    lightingAvailable: false,
  },
  {
    name: 'Travers Park Calisthenics',
    latitude: 40.7545,
    longitude: -73.8861,
    address: '78th St & 34th Ave, Jackson Heights',
    borough: 'Queens',
    neighborhood: 'Jackson Heights',
    description: 'Diverse Jackson Heights park with active outdoor fitness community.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'monkey_bars'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'playground'],
    isFree: true,
    lightingAvailable: true,
  },

  // Bronx - Additional Locations
  {
    name: 'Pelham Bay Park Fitness Area',
    latitude: 40.8689,
    longitude: -73.8053,
    address: 'Bruckner Blvd & Middletown Rd',
    borough: 'Bronx',
    neighborhood: 'Pelham Bay',
    description: 'NYC\'s largest park with outdoor fitness equipment near Orchard Beach.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'multi_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'beach', 'nature_trails'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Joyce Kilmer Park Workout',
    latitude: 40.8331,
    longitude: -73.9067,
    address: 'Grand Concourse & E 164th St',
    borough: 'Bronx',
    neighborhood: 'Concourse',
    description: 'Historic Bronx park across from Yankee Stadium with outdoor fitness equipment.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'benches'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Bronx Park Fitness Zone',
    latitude: 40.8575,
    longitude: -73.8772,
    address: 'Bronx Park East & E Gun Hill Rd',
    borough: 'Bronx',
    neighborhood: 'Allerton',
    description: 'Fitness area in Bronx Park near the botanical garden entrance.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'botanical_garden_nearby'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Soundview Park Calisthenics',
    latitude: 40.8139,
    longitude: -73.8676,
    address: 'Soundview Ave & Seward Ave',
    borough: 'Bronx',
    neighborhood: 'Soundview',
    description: 'Waterfront Bronx park with outdoor fitness equipment and kayak access.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'rings'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'waterfront', 'kayak_launch'],
    isFree: true,
    lightingAvailable: true,
  },

  // Staten Island - Additional Locations
  {
    name: 'Willowbrook Park Fitness',
    latitude: 40.6032,
    longitude: -74.1386,
    address: 'Eton Pl & Richmond Ave',
    borough: 'Staten Island',
    neighborhood: 'Willowbrook',
    description: 'Large Staten Island park with fitness equipment near the lake and carousel.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'ab_bench'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'restrooms', 'carousel', 'lake'],
    isFree: true,
    lightingAvailable: true,
  },
  {
    name: 'Wolfe\'s Pond Park Workout Area',
    latitude: 40.5182,
    longitude: -74.1826,
    address: 'Holton Ave & Cornelia Ave',
    borough: 'Staten Island',
    neighborhood: 'Prince\'s Bay',
    description: 'Southern Staten Island park with fitness equipment near the beach.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'beach', 'fishing'],
    isFree: true,
    lightingAvailable: false,
  },
  {
    name: 'Greenbelt Nature Center Fitness',
    latitude: 40.5879,
    longitude: -74.1490,
    address: '700 Rockland Ave, Staten Island Greenbelt',
    borough: 'Staten Island',
    neighborhood: 'New Springville',
    description: 'Fitness area in the Staten Island Greenbelt nature preserve.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station'],
    venueType: 'outdoor_gym',
    amenities: ['water_fountain', 'nature_trails', 'nature_center'],
    isFree: true,
    lightingAvailable: false,
  },
  {
    name: 'Midland Beach Fitness Area',
    latitude: 40.5718,
    longitude: -74.0885,
    address: 'Father Capodanno Blvd & Midland Ave',
    borough: 'Staten Island',
    neighborhood: 'Midland Beach',
    description: 'Beachfront fitness area along the Staten Island boardwalk.',
    equipment: ['pull_up_bar', 'parallel_bars', 'dip_station', 'monkey_bars'],
    venueType: 'calisthenics_park',
    amenities: ['water_fountain', 'restrooms', 'beach', 'boardwalk'],
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
  log.info('Running migration: 145_seed_additional_nyc_parks');

  let venuesCreated = 0;
  let equipmentCreated = 0;

  for (const location of ADDITIONAL_NYC_PARKS) {
    const slug = generateSlug(location.name);

    // Check if venue already exists (by name or coordinates)
    const existingVenue = await db.queryOne<{ id: string }>(
      `SELECT id FROM fitness_venues
       WHERE slug = $1
       OR (ABS(latitude - $2) < 0.0001 AND ABS(longitude - $3) < 0.0001)`,
      [slug, location.latitude, location.longitude]
    );

    if (existingVenue) {
      log.info(`Venue already exists: ${location.name}`);
      continue;
    }

    // Generate a consistent venue ID
    const venueId = `venue_${slug.replace(/-/g, '_')}`;

    // Insert the venue
    await db.query(
      `INSERT INTO fitness_venues (
        id, name, slug, description, venue_type,
        latitude, longitude, address, city, state_province, country,
        radius_meters, equipment, has_free_weights, has_calisthenics_equipment,
        has_cardio_equipment, has_parkour_features, is_indoor, is_24_hour, is_free,
        member_count, active_record_count, total_record_claims,
        checkin_count_today, checkin_count_total,
        is_verified, is_active, is_flagged,
        hours_of_operation, amenities, external_links, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25,
        $26, $27, $28,
        $29, $30, $31, NOW(), NOW()
      )`,
      [
        venueId,
        location.name,
        slug,
        location.description,
        location.venueType,
        location.latitude,
        location.longitude,
        location.address,
        'New York',
        'NY',
        'USA',
        100, // radius_meters
        JSON.stringify(location.equipment),
        false, // has_free_weights
        true, // has_calisthenics_equipment
        false, // has_cardio_equipment
        false, // has_parkour_features
        false, // is_indoor
        false, // is_24_hour
        location.isFree,
        0, // member_count
        0, // active_record_count
        0, // total_record_claims
        0, // checkin_count_today
        0, // checkin_count_total
        true, // is_verified (these are known locations)
        true, // is_active
        false, // is_flagged
        JSON.stringify({
          note: 'NYC Parks hours vary by season. Generally dawn to dusk.',
          lighting: location.lightingAvailable ? 'Available' : 'Limited',
        }),
        JSON.stringify(location.amenities || []),
        JSON.stringify({
          borough: location.borough,
          neighborhood: location.neighborhood,
        }),
      ]
    );

    venuesCreated++;
    log.info(`Created venue: ${location.name}`);

    // Insert equipment items
    for (const equipType of location.equipment) {
      await db.query(
        `INSERT INTO venue_equipment_items (
          id, venue_id, equipment_type, quantity, condition, condition_notes,
          is_verified, data_source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, NOW(), NOW()
        )`,
        [
          `equip_${venueId}_${equipType}`,
          venueId,
          equipType,
          1, // quantity
          'good', // condition
          null, // condition_notes
          true, // is_verified
          'seed_migration', // data_source
        ]
      );
      equipmentCreated++;
    }
  }

  log.info(`Migration complete: Created ${venuesCreated} venues with ${equipmentCreated} equipment items`);
}

export async function rollback(): Promise<void> {
  await ensurePoolReady();
  log.info('Rolling back migration: 145_seed_additional_nyc_parks');

  // Get all venue IDs created by this migration
  for (const location of ADDITIONAL_NYC_PARKS) {
    const slug = generateSlug(location.name);
    const venueId = `venue_${slug.replace(/-/g, '_')}`;

    // Delete equipment first (foreign key constraint)
    await db.query('DELETE FROM venue_equipment_items WHERE venue_id = $1', [venueId]);

    // Delete venue
    await db.query('DELETE FROM fitness_venues WHERE id = $1', [venueId]);
  }

  log.info('Rollback complete');
}
