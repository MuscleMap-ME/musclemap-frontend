/**
 * Migration: Expanded Archetypes
 *
 * This migration adds:
 * 1. image_url column to archetypes table
 * 2. New archetype categories for broader coverage
 * 3. 25+ new archetypes across multiple categories
 *
 * Categories covered:
 * - general (Strength & Muscle)
 * - movement (Movement & Agility)
 * - combat (Combat & Martial Arts)
 * - endurance (Endurance & Cardio)
 * - adventure (Adventure & Outdoor)
 * - military (Military & Tactical)
 * - first_responders (First Responders)
 * - team_sports (Team Sports)
 * - functional (Functional & Lifestyle)
 * - rehabilitation (Rehabilitation & Recovery)
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 045_expanded_archetypes');

  // ============================================
  // ADD IMAGE_URL COLUMN TO ARCHETYPES
  // ============================================

  if (await tableExists('archetypes')) {
    if (!(await columnExists('archetypes', 'image_url'))) {
      log.info('Adding image_url column to archetypes table...');
      await db.query(`ALTER TABLE archetypes ADD COLUMN image_url TEXT`);
    }
  }

  // ============================================
  // ADD NEW ARCHETYPE CATEGORIES
  // ============================================

  if (await tableExists('archetype_categories')) {
    log.info('Adding new archetype categories...');

    const categories = [
      { id: 'general', name: 'Strength & Muscle', description: 'Traditional strength and muscle-building archetypes', icon: 'dumbbell', display_order: 1 },
      { id: 'movement', name: 'Movement & Agility', description: 'Movement-focused disciplines emphasizing agility and body control', icon: 'activity', display_order: 2 },
      { id: 'combat', name: 'Combat & Martial Arts', description: 'Fighting disciplines and combat sports', icon: 'shield', display_order: 3 },
      { id: 'endurance', name: 'Endurance & Cardio', description: 'Cardio-focused and endurance athletes', icon: 'heart-pulse', display_order: 4 },
      { id: 'adventure', name: 'Adventure & Outdoor', description: 'Outdoor and adventure sports', icon: 'mountain', display_order: 5 },
      { id: 'military', name: 'Military & Tactical', description: 'Armed forces and tactical training', icon: 'star', display_order: 6 },
      { id: 'first_responders', name: 'First Responders', description: 'Emergency services and public safety', icon: 'shield-check', display_order: 7 },
      { id: 'team_sports', name: 'Team Sports', description: 'Team-based athletic disciplines', icon: 'users', display_order: 8 },
      { id: 'functional', name: 'Functional & Lifestyle', description: 'Practical fitness for everyday life', icon: 'briefcase', display_order: 9 },
      { id: 'rehabilitation', name: 'Rehabilitation & Recovery', description: 'Recovery-focused and therapeutic approaches', icon: 'heart', display_order: 10 },
    ];

    for (const cat of categories) {
      await db.query(`
        INSERT INTO archetype_categories (id, name, description, icon, display_order)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          display_order = EXCLUDED.display_order
      `, [cat.id, cat.name, cat.description, cat.icon, cat.display_order]);
    }

    log.info(`Upserted ${categories.length} archetype categories`);
  }

  // ============================================
  // ADD NEW ARCHETYPES
  // ============================================

  log.info('Adding expanded archetypes...');

  interface ArchetypeSeed {
    id: string;
    name: string;
    philosophy: string;
    description: string;
    category_id: string;
    focus_areas: string[];
  }

  const newArchetypes: ArchetypeSeed[] = [
    // Strength & Muscle (general)
    {
      id: 'olympic-weightlifter',
      name: 'Olympic Weightlifter',
      philosophy: 'Explosive power through perfect technique',
      description: 'Master the snatch and clean & jerk through technical precision, explosive power, and dedicated mobility work.',
      category_id: 'general',
      focus_areas: ['quadriceps', 'glutes', 'shoulders', 'core', 'back', 'hip-mobility'],
    },

    // Movement & Agility
    {
      id: 'calisthenics',
      name: 'Calisthenics Athlete',
      philosophy: 'Master your bodyweight',
      description: 'Achieve impressive feats of strength using only your body: muscle-ups, levers, planches, and handstands.',
      category_id: 'movement',
      focus_areas: ['core', 'shoulders', 'lats', 'triceps', 'grip', 'mobility'],
    },
    {
      id: 'parkour',
      name: 'Traceur (Parkour)',
      philosophy: 'Movement is freedom',
      description: 'Navigate obstacles with efficiency and fluidity. Train for real-world movement challenges.',
      category_id: 'movement',
      focus_areas: ['legs', 'core', 'shoulders', 'grip', 'cardio', 'agility'],
    },
    {
      id: 'yoga',
      name: 'Yoga Practitioner',
      philosophy: 'Strength through stillness',
      description: 'Build flexibility, balance, and mental clarity through the ancient practice of yoga.',
      category_id: 'movement',
      focus_areas: ['flexibility', 'core', 'balance', 'mobility', 'mind-body'],
    },

    // Combat & Martial Arts
    {
      id: 'bjj',
      name: 'BJJ Practitioner',
      philosophy: 'The gentle art of human chess',
      description: 'Master ground fighting through leverage and technique. Submissions, sweeps, and positional control.',
      category_id: 'combat',
      focus_areas: ['core', 'grip', 'hips', 'shoulders', 'neck', 'flexibility'],
    },
    {
      id: 'muay-thai',
      name: 'Nak Muay (Muay Thai)',
      philosophy: 'The art of eight limbs',
      description: 'Strike with fists, elbows, knees, and shins. Train clinch work and devastating leg kicks.',
      category_id: 'combat',
      focus_areas: ['legs', 'core', 'shoulders', 'hips', 'cardio', 'conditioning'],
    },

    // Endurance & Cardio
    {
      id: 'triathlete',
      name: 'Triathlete',
      philosophy: 'Three disciplines, one athlete',
      description: 'Swim, bike, and run. Build exceptional endurance across multiple athletic domains.',
      category_id: 'endurance',
      focus_areas: ['cardio', 'legs', 'core', 'shoulders', 'endurance', 'recovery'],
    },
    {
      id: 'rower',
      name: 'Rower',
      philosophy: 'Power through the water',
      description: 'Full-body power and cardiovascular excellence. Master the catch, drive, and recovery.',
      category_id: 'endurance',
      focus_areas: ['back', 'legs', 'core', 'grip', 'cardio', 'power-endurance'],
    },

    // Adventure & Outdoor
    {
      id: 'hiker',
      name: 'Hiker / Mountaineer',
      philosophy: 'Every peak is within reach',
      description: 'Train for elevation, endurance, and carrying loads. Conquer trails and summits.',
      category_id: 'adventure',
      focus_areas: ['legs', 'core', 'cardio', 'endurance', 'balance', 'load-carrying'],
    },
    {
      id: 'obstacle-racer',
      name: 'Obstacle Course Racer',
      philosophy: 'Embrace the challenge',
      description: 'Combine running endurance with functional strength for Spartan, Tough Mudder, and beyond.',
      category_id: 'adventure',
      focus_areas: ['grip', 'core', 'legs', 'cardio', 'upper-body', 'mental-toughness'],
    },
    {
      id: 'surfer',
      name: 'Surfer',
      philosophy: 'Ride the energy of the ocean',
      description: 'Paddle power, pop-up explosiveness, and balance training for wave riding.',
      category_id: 'adventure',
      focus_areas: ['shoulders', 'core', 'legs', 'balance', 'cardio', 'flexibility'],
    },

    // Military & Tactical
    {
      id: 'special-forces',
      name: 'Special Operations',
      philosophy: 'Elite readiness',
      description: 'Train like SOF operators. Rucking, functional strength, and combat conditioning.',
      category_id: 'military',
      focus_areas: ['full-body', 'cardio', 'mental-toughness', 'rucking', 'combat-fitness'],
    },
    {
      id: 'coast-guard',
      name: 'Coast Guard',
      philosophy: 'Always ready',
      description: 'Swimming, rescue operations, and maritime fitness. Semper Paratus.',
      category_id: 'military',
      focus_areas: ['swimming', 'cardio', 'upper-body', 'core', 'water-rescue'],
    },

    // First Responders
    {
      id: 'search-rescue',
      name: 'Search & Rescue',
      philosophy: 'When seconds count',
      description: 'Train for wilderness rescue, technical rope work, and sustained physical effort.',
      category_id: 'first_responders',
      focus_areas: ['endurance', 'grip', 'core', 'legs', 'load-carrying', 'technical-skills'],
    },

    // Team Sports
    {
      id: 'basketball',
      name: 'Basketball Player',
      philosophy: 'Elevate your game',
      description: 'Vertical jump, lateral quickness, and court endurance. Train for explosive athleticism.',
      category_id: 'team_sports',
      focus_areas: ['legs', 'core', 'cardio', 'agility', 'vertical-jump', 'lateral-speed'],
    },
    {
      id: 'soccer',
      name: 'Soccer Player',
      philosophy: 'The beautiful game',
      description: 'Endless running, quick cuts, and lower body power. Build a complete footballer physique.',
      category_id: 'team_sports',
      focus_areas: ['legs', 'cardio', 'core', 'agility', 'endurance', 'speed'],
    },
    {
      id: 'american-football',
      name: 'Football Player',
      philosophy: 'Gridiron warrior',
      description: 'Explosive power, contact preparation, and position-specific conditioning.',
      category_id: 'team_sports',
      focus_areas: ['legs', 'core', 'shoulders', 'power', 'speed', 'contact-strength'],
    },
    {
      id: 'hockey',
      name: 'Hockey Player',
      philosophy: 'Speed and power on ice',
      description: 'Leg drive, rotational power, and anaerobic capacity for the fastest game on ice.',
      category_id: 'team_sports',
      focus_areas: ['legs', 'core', 'hips', 'shoulders', 'cardio', 'power'],
    },
    {
      id: 'rugby',
      name: 'Rugby Player',
      philosophy: 'Strength in unity',
      description: 'Tackling, scrumming, and 80 minutes of continuous play. Build rugby-specific power.',
      category_id: 'team_sports',
      focus_areas: ['full-body', 'neck', 'legs', 'core', 'cardio', 'contact-strength'],
    },

    // Functional & Lifestyle
    {
      id: 'busy-professional',
      name: 'Busy Professional',
      philosophy: 'Maximize your limited time',
      description: 'Efficient workouts for desk workers. Combat sitting, build energy, and stay sharp.',
      category_id: 'functional',
      focus_areas: ['core', 'posture', 'mobility', 'stress-relief', 'efficiency'],
    },
    {
      id: 'new-parent',
      name: 'New Parent',
      philosophy: 'Fitness for the sleep-deprived',
      description: 'Quick, effective workouts that work around baby schedules. Build functional strength.',
      category_id: 'functional',
      focus_areas: ['core', 'back', 'arms', 'recovery', 'energy', 'flexibility'],
    },
    {
      id: 'senior-fitness',
      name: 'Active Aging',
      philosophy: 'Age is just a number',
      description: 'Maintain independence, prevent falls, and enjoy an active lifestyle at any age.',
      category_id: 'functional',
      focus_areas: ['balance', 'mobility', 'functional-strength', 'bone-health', 'cardio'],
    },

    // Rehabilitation & Recovery
    {
      id: 'post-injury',
      name: 'Post-Injury Recovery',
      philosophy: 'Rebuild stronger',
      description: 'Structured return to fitness after injury. Progressive loading and careful progression.',
      category_id: 'rehabilitation',
      focus_areas: ['mobility', 'stability', 'gradual-loading', 'movement-quality', 'patience'],
    },
    {
      id: 'chronic-pain',
      name: 'Chronic Pain Management',
      philosophy: 'Movement as medicine',
      description: 'Evidence-based exercise approaches for managing chronic pain conditions.',
      category_id: 'rehabilitation',
      focus_areas: ['mobility', 'low-impact', 'core-stability', 'mind-body', 'gradual-progression'],
    },
    {
      id: 'mobility-specialist',
      name: 'Mobility Specialist',
      philosophy: 'Unlock your body\'s potential',
      description: 'Focus on range of motion, tissue quality, and movement freedom. Move better to train better.',
      category_id: 'rehabilitation',
      focus_areas: ['flexibility', 'mobility', 'fascia', 'joint-health', 'movement-quality'],
    },
  ];

  for (const archetype of newArchetypes) {
    await db.query(`
      INSERT INTO archetypes (id, name, philosophy, description, category_id, focus_areas)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        philosophy = EXCLUDED.philosophy,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        focus_areas = EXCLUDED.focus_areas
    `, [
      archetype.id,
      archetype.name,
      archetype.philosophy,
      archetype.description,
      archetype.category_id,
      JSON.stringify(archetype.focus_areas),
    ]);
  }

  log.info(`Upserted ${newArchetypes.length} new archetypes`);

  // ============================================
  // UPDATE EXISTING ARCHETYPES WITH CATEGORIES
  // ============================================

  log.info('Updating existing archetypes with category assignments...');

  const existingArchetypeCategories = [
    // General fitness archetypes
    { id: 'bodybuilder', category_id: 'general' },
    { id: 'powerlifter', category_id: 'general' },
    { id: 'strongman', category_id: 'general' },
    { id: 'crossfit', category_id: 'general' },
    { id: 'functional', category_id: 'functional' },

    // Movement
    { id: 'gymnast', category_id: 'movement' },

    // Combat
    { id: 'martial-artist', category_id: 'combat' },

    // Endurance
    { id: 'runner', category_id: 'endurance' },
    { id: 'swimmer', category_id: 'endurance' },

    // Adventure
    { id: 'climber', category_id: 'adventure' },
  ];

  for (const update of existingArchetypeCategories) {
    await db.query(`
      UPDATE archetypes SET category_id = $1 WHERE id = $2
    `, [update.category_id, update.id]);
  }

  log.info(`Updated ${existingArchetypeCategories.length} existing archetype categories`);

  log.info('Migration 045_expanded_archetypes complete');
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 045_expanded_archetypes');

  // Remove new archetypes
  const newArchetypeIds = [
    'olympic-weightlifter', 'calisthenics', 'parkour', 'yoga',
    'bjj', 'muay-thai', 'triathlete', 'rower',
    'hiker', 'obstacle-racer', 'surfer',
    'special-forces', 'coast-guard', 'search-rescue',
    'basketball', 'soccer', 'american-football', 'hockey', 'rugby',
    'busy-professional', 'new-parent', 'senior-fitness',
    'post-injury', 'chronic-pain', 'mobility-specialist',
  ];

  await db.query(`DELETE FROM archetypes WHERE id = ANY($1)`, [newArchetypeIds]);

  // Remove image_url column
  if (await columnExists('archetypes', 'image_url')) {
    await db.query(`ALTER TABLE archetypes DROP COLUMN image_url`);
  }

  // Note: We don't remove the categories as they may be used by other data

  log.info('Rollback 045_expanded_archetypes complete');
}

// Export for compatibility with different migration runners
export const up = migrate;
export const down = rollback;
