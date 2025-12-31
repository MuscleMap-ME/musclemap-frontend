/**
 * Equipment and Location Mappings for Exercises
 *
 * This file contains equipment requirements and location appropriateness
 * for each exercise in the database, used by the prescription constraint solver.
 */

import Database from 'better-sqlite3';

// Equipment Taxonomy
export const EQUIPMENT = {
  // Bars
  barbell: 'Barbell',
  ez_bar: 'EZ Curl Bar',
  pullup_bar: 'Pull-up Bar',
  dip_bars: 'Dip Bars/Station',

  // Free weights
  dumbbells: 'Dumbbells',
  kettlebell: 'Kettlebell',
  plates: 'Weight Plates',

  // Machines
  cable_machine: 'Cable Machine',
  lat_pulldown: 'Lat Pulldown Machine',
  leg_press: 'Leg Press',
  smith_machine: 'Smith Machine',
  leg_curl_machine: 'Leg Curl Machine',
  leg_extension_machine: 'Leg Extension Machine',
  preacher_bench: 'Preacher Bench',

  // Benches & Racks
  flat_bench: 'Flat Bench',
  adjustable_bench: 'Adjustable Bench',
  squat_rack: 'Squat Rack/Power Cage',

  // Portable/Home
  bands: 'Resistance Bands',
  trx: 'TRX/Suspension Trainer',
  ab_wheel: 'Ab Wheel',
  jump_rope: 'Jump Rope',
  yoga_mat: 'Yoga Mat',

  // Cardio
  treadmill: 'Treadmill',
  bike: 'Stationary Bike',
  rower: 'Rowing Machine',
} as const;

export type EquipmentId = keyof typeof EQUIPMENT;

// Location types
export type LocationId = 'gym' | 'home' | 'park' | 'hotel' | 'office' | 'travel';

// Movement patterns for muscle balancing
export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core' | 'isolation';

// Equipment commonly available at each location
export const LOCATION_EQUIPMENT: Record<LocationId, EquipmentId[]> = {
  gym: [], // Gym has everything - handled specially
  home: ['dumbbells', 'kettlebell', 'bands', 'pullup_bar', 'yoga_mat'],
  park: ['pullup_bar', 'dip_bars'],
  hotel: ['bands', 'yoga_mat'],
  office: ['bands'],
  travel: ['bands'],
};

interface ExerciseEquipmentMapping {
  equipment_required: EquipmentId[];
  equipment_optional: EquipmentId[];
  locations: LocationId[];
  is_compound: boolean;
  estimated_seconds: number; // Time per SET in seconds
  rest_seconds: number;
  movement_pattern: MovementPattern;
}

/**
 * Exercise mappings - keyed by exercise ID
 *
 * Format:
 * - equipment_required: Must have ALL of these
 * - equipment_optional: Nice to have, not required
 * - locations: Where this exercise is appropriate
 * - is_compound: Whether this is a compound movement
 * - estimated_seconds: Time per set (not including rest)
 * - rest_seconds: Rest between sets
 * - movement_pattern: For push/pull balancing
 */
export const EXERCISE_MAPPINGS: Record<string, ExerciseEquipmentMapping> = {
  // ======================================
  // BODYWEIGHT - PUSH
  // ======================================
  'bw-pushup': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },
  'bw-diamond-pushup': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },
  'bw-pike-pushup': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },
  'bw-decline-pushup': {
    equipment_required: [],
    equipment_optional: ['flat_bench'],
    locations: ['gym', 'home', 'park', 'hotel'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },
  'bw-archer-pushup': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'push',
  },
  'bw-dip': {
    equipment_required: ['dip_bars'],
    equipment_optional: [],
    locations: ['gym', 'park'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 90,
    movement_pattern: 'push',
  },
  'bw-hspu': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 40,
    rest_seconds: 120,
    movement_pattern: 'push',
  },

  // ======================================
  // BODYWEIGHT - PULL
  // ======================================
  'bw-pullup': {
    equipment_required: ['pullup_bar'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'pull',
  },
  'bw-chinup': {
    equipment_required: ['pullup_bar'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'pull',
  },
  'bw-row': {
    equipment_required: [],
    equipment_optional: ['pullup_bar'],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'bw-typewriter-pullup': {
    equipment_required: ['pullup_bar'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 45,
    rest_seconds: 120,
    movement_pattern: 'pull',
  },
  'bw-muscle-up': {
    equipment_required: ['pullup_bar'],
    equipment_optional: [],
    locations: ['gym', 'park'],
    is_compound: true,
    estimated_seconds: 45,
    rest_seconds: 180,
    movement_pattern: 'pull',
  },

  // ======================================
  // BODYWEIGHT - LEGS
  // ======================================
  'bw-squat': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: true,
    estimated_seconds: 25,
    rest_seconds: 60,
    movement_pattern: 'squat',
  },
  'bw-lunge': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'squat',
  },
  'bw-bulgarian-split': {
    equipment_required: [],
    equipment_optional: ['flat_bench'],
    locations: ['gym', 'home', 'park', 'hotel'],
    is_compound: true,
    estimated_seconds: 40,
    rest_seconds: 90,
    movement_pattern: 'squat',
  },
  'bw-pistol-squat': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel'],
    is_compound: true,
    estimated_seconds: 40,
    rest_seconds: 120,
    movement_pattern: 'squat',
  },
  'bw-nordic-curl': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: false,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'hinge',
  },
  'bw-calf-raise': {
    equipment_required: [],
    equipment_optional: [],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'isolation',
  },
  'bw-glute-bridge': {
    equipment_required: [],
    equipment_optional: ['yoga_mat'],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'hinge',
  },

  // ======================================
  // BODYWEIGHT - CORE
  // ======================================
  'bw-plank': {
    equipment_required: [],
    equipment_optional: ['yoga_mat'],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: false,
    estimated_seconds: 45, // Isometric hold
    rest_seconds: 60,
    movement_pattern: 'core',
  },
  'bw-hollow-hold': {
    equipment_required: [],
    equipment_optional: ['yoga_mat'],
    locations: ['gym', 'home', 'park', 'hotel', 'office', 'travel'],
    is_compound: false,
    estimated_seconds: 45,
    rest_seconds: 60,
    movement_pattern: 'core',
  },
  'bw-lsit': {
    equipment_required: [],
    equipment_optional: ['dip_bars'],
    locations: ['gym', 'home', 'park'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 90,
    movement_pattern: 'core',
  },
  'bw-dragon-flag': {
    equipment_required: [],
    equipment_optional: ['flat_bench'],
    locations: ['gym', 'home', 'park'],
    is_compound: false,
    estimated_seconds: 40,
    rest_seconds: 120,
    movement_pattern: 'core',
  },
  'bw-hanging-leg-raise': {
    equipment_required: ['pullup_bar'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'core',
  },

  // ======================================
  // KETTLEBELL
  // ======================================
  'kb-swing': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'hinge',
  },
  'kb-goblet-squat': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 60,
    movement_pattern: 'squat',
  },
  'kb-clean': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'kb-press': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },
  'kb-snatch': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'pull',
  },
  'kb-turkish-getup': {
    equipment_required: ['kettlebell'],
    equipment_optional: ['yoga_mat'],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 90,
    rest_seconds: 90,
    movement_pattern: 'carry',
  },
  'kb-row': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'kb-deadlift': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'hinge',
  },
  'kb-windmill': {
    equipment_required: ['kettlebell'],
    equipment_optional: [],
    locations: ['gym', 'home', 'park'],
    is_compound: true,
    estimated_seconds: 40,
    rest_seconds: 60,
    movement_pattern: 'core',
  },

  // ======================================
  // FREEWEIGHT - CHEST
  // ======================================
  'fw-bench-press': {
    equipment_required: ['barbell', 'flat_bench', 'squat_rack'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 120,
    movement_pattern: 'push',
  },
  'fw-incline-bench': {
    equipment_required: ['barbell', 'adjustable_bench', 'squat_rack'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 120,
    movement_pattern: 'push',
  },
  'fw-db-bench': {
    equipment_required: ['dumbbells', 'flat_bench'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'push',
  },
  'fw-db-fly': {
    equipment_required: ['dumbbells', 'flat_bench'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },

  // ======================================
  // FREEWEIGHT - BACK
  // ======================================
  'fw-deadlift': {
    equipment_required: ['barbell'],
    equipment_optional: ['plates'],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 45,
    rest_seconds: 180,
    movement_pattern: 'hinge',
  },
  'fw-barbell-row': {
    equipment_required: ['barbell'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'pull',
  },
  'fw-db-row': {
    equipment_required: ['dumbbells'],
    equipment_optional: ['flat_bench'],
    locations: ['gym', 'home'],
    is_compound: true,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'fw-pullover': {
    equipment_required: ['dumbbells', 'flat_bench'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },

  // ======================================
  // FREEWEIGHT - SHOULDERS
  // ======================================
  'fw-ohp': {
    equipment_required: ['barbell'],
    equipment_optional: ['squat_rack'],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 120,
    movement_pattern: 'push',
  },
  'fw-db-shoulder-press': {
    equipment_required: ['dumbbells'],
    equipment_optional: ['adjustable_bench'],
    locations: ['gym', 'home'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'push',
  },
  'fw-lateral-raise': {
    equipment_required: ['dumbbells'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'isolation',
  },
  'fw-front-raise': {
    equipment_required: ['dumbbells'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'push',
  },
  'fw-rear-delt-fly': {
    equipment_required: ['dumbbells'],
    equipment_optional: ['adjustable_bench'],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'pull',
  },
  'fw-face-pull': {
    equipment_required: ['cable_machine'],
    equipment_optional: ['bands'],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'pull',
  },
  'fw-shrug': {
    equipment_required: ['barbell'],
    equipment_optional: ['dumbbells'],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },

  // ======================================
  // FREEWEIGHT - ARMS
  // ======================================
  'fw-barbell-curl': {
    equipment_required: ['barbell'],
    equipment_optional: ['ez_bar'],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'fw-db-curl': {
    equipment_required: ['dumbbells'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'fw-hammer-curl': {
    equipment_required: ['dumbbells'],
    equipment_optional: [],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'fw-preacher-curl': {
    equipment_required: ['dumbbells', 'preacher_bench'],
    equipment_optional: ['ez_bar'],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 60,
    movement_pattern: 'pull',
  },
  'fw-skull-crusher': {
    equipment_required: ['barbell', 'flat_bench'],
    equipment_optional: ['ez_bar', 'dumbbells'],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'push',
  },
  'fw-close-grip-bench': {
    equipment_required: ['barbell', 'flat_bench', 'squat_rack'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'push',
  },
  'fw-tricep-kickback': {
    equipment_required: ['dumbbells'],
    equipment_optional: ['flat_bench'],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'push',
  },
  'fw-wrist-curl': {
    equipment_required: ['dumbbells'],
    equipment_optional: ['barbell'],
    locations: ['gym', 'home'],
    is_compound: false,
    estimated_seconds: 25,
    rest_seconds: 45,
    movement_pattern: 'isolation',
  },

  // ======================================
  // FREEWEIGHT - LEGS
  // ======================================
  'fw-squat': {
    equipment_required: ['barbell', 'squat_rack'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 45,
    rest_seconds: 180,
    movement_pattern: 'squat',
  },
  'fw-front-squat': {
    equipment_required: ['barbell', 'squat_rack'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 45,
    rest_seconds: 180,
    movement_pattern: 'squat',
  },
  'fw-leg-press': {
    equipment_required: ['leg_press'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 40,
    rest_seconds: 120,
    movement_pattern: 'squat',
  },
  'fw-romanian-dl': {
    equipment_required: ['barbell'],
    equipment_optional: ['dumbbells'],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 40,
    rest_seconds: 120,
    movement_pattern: 'hinge',
  },
  'fw-leg-curl': {
    equipment_required: ['leg_curl_machine'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'hinge',
  },
  'fw-leg-extension': {
    equipment_required: ['leg_extension_machine'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'isolation',
  },
  'fw-hip-thrust': {
    equipment_required: ['barbell', 'flat_bench'],
    equipment_optional: ['plates'],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'hinge',
  },
  'fw-calf-raise': {
    equipment_required: ['barbell'],
    equipment_optional: ['dumbbells', 'plates'],
    locations: ['gym'],
    is_compound: false,
    estimated_seconds: 30,
    rest_seconds: 60,
    movement_pattern: 'isolation',
  },
  'fw-good-morning': {
    equipment_required: ['barbell'],
    equipment_optional: [],
    locations: ['gym'],
    is_compound: true,
    estimated_seconds: 35,
    rest_seconds: 90,
    movement_pattern: 'hinge',
  },
};

/**
 * Apply exercise equipment/location mappings to the database
 */
export function seedEquipmentLocations(db: Database.Database): void {
  console.log('Seeding exercise equipment and location mappings...');

  const stmt = db.prepare(`
    UPDATE exercises SET
      equipment_required = ?,
      equipment_optional = ?,
      locations = ?,
      is_compound = ?,
      estimated_seconds = ?,
      rest_seconds = ?,
      movement_pattern = ?
    WHERE id = ?
  `);

  let updated = 0;
  let skipped = 0;

  for (const [id, data] of Object.entries(EXERCISE_MAPPINGS)) {
    const result = stmt.run(
      JSON.stringify(data.equipment_required),
      JSON.stringify(data.equipment_optional),
      JSON.stringify(data.locations),
      data.is_compound ? 1 : 0,
      data.estimated_seconds,
      data.rest_seconds,
      data.movement_pattern,
      id
    );

    if (result.changes > 0) {
      updated++;
    } else {
      skipped++;
      console.warn(`  Exercise not found: ${id}`);
    }
  }

  console.log(`Updated ${updated} exercises, skipped ${skipped}`);
}

// Run seeder if executed directly
if (require.main === module) {
  const path = require('path');
  const db = new Database(path.join(__dirname, '../../../data/musclemap.db'));

  try {
    seedEquipmentLocations(db);
    console.log('Equipment/location seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}
