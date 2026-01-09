/**
 * Migration: Martial Arts Training Module
 *
 * Adds support for martial arts technique tracking:
 * - Multiple disciplines (Boxing, BJJ, Wrestling, Kickboxing, etc.)
 * - Military combatives (MCMAP, Army Combatives)
 * - Technique library with progressions
 * - Practice logging and proficiency tracking
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Running migration: 044_martial_arts');

  // Check if tables already exist
  const tableCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_name = 'martial_arts_disciplines'
  `);

  if (tableCheck && parseInt(tableCheck.count) > 0) {
    log.info('Martial arts tables already exist, skipping creation...');
  } else {
    log.info('Creating martial arts tables...');

    // Martial arts disciplines
    await db.query(`
      CREATE TABLE martial_arts_disciplines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        origin_country TEXT,
        focus_areas TEXT[] DEFAULT '{}', -- striking, grappling, throws, weapons, etc.
        icon TEXT,
        color TEXT,
        order_index INT DEFAULT 0,
        is_military BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Technique categories within disciplines
    await db.query(`
      CREATE TABLE martial_arts_categories (
        id TEXT PRIMARY KEY,
        discipline_id TEXT NOT NULL REFERENCES martial_arts_disciplines(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Individual techniques
    await db.query(`
      CREATE TABLE martial_arts_techniques (
        id TEXT PRIMARY KEY,
        discipline_id TEXT NOT NULL REFERENCES martial_arts_disciplines(id) ON DELETE CASCADE,
        category_id TEXT REFERENCES martial_arts_categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL, -- stance, strike, block, kick, submission, takedown, escape, sweep, throw
        difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),

        -- Prerequisites (other technique ids)
        prerequisites TEXT[] DEFAULT '{}',

        -- Learning content
        key_points TEXT[] DEFAULT '{}',
        common_mistakes TEXT[] DEFAULT '{}',
        drill_suggestions TEXT[] DEFAULT '{}',

        -- Visual content
        video_url TEXT,
        thumbnail_url TEXT,

        -- Muscles involved
        muscle_groups TEXT[] DEFAULT '{}',

        -- Rewards
        xp_reward INT DEFAULT 50,
        credit_reward INT DEFAULT 25,

        -- Positioning
        tier INT DEFAULT 1,
        position INT DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // User progress on techniques
    await db.query(`
      CREATE TABLE user_technique_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        technique_id TEXT NOT NULL REFERENCES martial_arts_techniques(id) ON DELETE CASCADE,

        status TEXT NOT NULL DEFAULT 'locked', -- locked, available, learning, proficient, mastered
        proficiency INT DEFAULT 0 CHECK (proficiency BETWEEN 0 AND 100),

        -- Practice tracking
        practice_count INT DEFAULT 0,
        total_practice_minutes INT DEFAULT 0,
        last_practiced TIMESTAMPTZ,

        -- Mastery data
        mastered_at TIMESTAMPTZ,

        -- Notes
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(user_id, technique_id)
      )
    `);

    // Technique practice logs
    await db.query(`
      CREATE TABLE technique_practice_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        technique_id TEXT NOT NULL REFERENCES martial_arts_techniques(id) ON DELETE CASCADE,

        practice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        duration_minutes INT NOT NULL,
        reps_performed INT,
        rounds_performed INT,
        partner_drill BOOLEAN DEFAULT FALSE,
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.query(`
      CREATE INDEX idx_ma_techniques_discipline ON martial_arts_techniques(discipline_id);
      CREATE INDEX idx_ma_techniques_category ON martial_arts_techniques(category_id);
      CREATE INDEX idx_ma_categories_discipline ON martial_arts_categories(discipline_id);
      CREATE INDEX idx_user_technique_progress_user ON user_technique_progress(user_id);
      CREATE INDEX idx_user_technique_progress_technique ON user_technique_progress(technique_id);
      CREATE INDEX idx_user_technique_progress_status ON user_technique_progress(status);
      CREATE INDEX idx_technique_practice_logs_user ON technique_practice_logs(user_id);
      CREATE INDEX idx_technique_practice_logs_date ON technique_practice_logs(practice_date);
    `);

    log.info('Martial arts tables created');
  }

  // Seed disciplines and techniques
  await seedDisciplines();
  await seedTechniques();

  // Add earning rule for technique mastery
  await seedTechniqueEarningRule();

  log.info('Migration 044_martial_arts complete');
}

async function seedTechniqueEarningRule(): Promise<void> {
  // Check if earning_rules table exists
  const tableCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_name = 'earning_rules'
  `);

  if (!tableCheck || parseInt(tableCheck.count) === 0) {
    log.info('earning_rules table not found, skipping technique earning rule seed');
    return;
  }

  // Check if rule already exists
  const ruleCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM earning_rules WHERE code = 'technique_master'
  `);

  if (ruleCheck && parseInt(ruleCheck.count) > 0) {
    log.info('technique_master earning rule already exists');
    return;
  }

  log.info('Adding technique_master earning rule...');
  await db.query(`
    INSERT INTO earning_rules (code, name, category, credits_base, xp_base, description)
    VALUES ('technique_master', 'Technique Mastered', 'special', 50, 100, 'Master a martial arts technique')
    ON CONFLICT (code) DO NOTHING
  `);
}

async function seedDisciplines(): Promise<void> {
  // Check if already seeded
  const check = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM martial_arts_disciplines
  `);

  if (check && parseInt(check.count) > 0) {
    log.info('Martial arts disciplines already seeded, skipping...');
    return;
  }

  log.info('Seeding martial arts disciplines...');

  const disciplines = [
    // Civilian disciplines
    { id: 'boxing', name: 'Boxing', description: 'The sweet science - footwork, head movement, and punching combinations', origin_country: 'Various', focus_areas: ['striking'], icon: '🥊', color: 'from-red-500 to-orange-500', order_index: 1, is_military: false },
    { id: 'kickboxing', name: 'Kickboxing', description: 'Combining punches and kicks for stand-up fighting', origin_country: 'Japan/USA', focus_areas: ['striking', 'kicking'], icon: '🦵', color: 'from-orange-500 to-yellow-500', order_index: 2, is_military: false },
    { id: 'muay-thai', name: 'Muay Thai', description: 'The art of 8 limbs - punches, kicks, elbows, and knees', origin_country: 'Thailand', focus_areas: ['striking', 'kicking', 'clinch'], icon: '🇹🇭', color: 'from-blue-500 to-cyan-500', order_index: 3, is_military: false },
    { id: 'bjj', name: 'Brazilian Jiu-Jitsu', description: 'Ground fighting and submission grappling', origin_country: 'Brazil', focus_areas: ['grappling', 'submissions'], icon: '🥋', color: 'from-purple-500 to-pink-500', order_index: 4, is_military: false },
    { id: 'wrestling', name: 'Wrestling', description: 'Takedowns, pins, and ground control', origin_country: 'Various', focus_areas: ['grappling', 'takedowns'], icon: '🤼', color: 'from-green-500 to-teal-500', order_index: 5, is_military: false },
    { id: 'judo', name: 'Judo', description: 'The gentle way - throws and submissions', origin_country: 'Japan', focus_areas: ['throws', 'grappling'], icon: '🥋', color: 'from-white to-gray-300', order_index: 6, is_military: false },
    { id: 'self-defense', name: 'Self-Defense', description: 'Practical techniques for real-world situations', origin_country: 'Various', focus_areas: ['striking', 'grappling', 'awareness'], icon: '🛡️', color: 'from-gray-500 to-gray-700', order_index: 7, is_military: false },

    // Military combatives
    { id: 'mcmap', name: 'MCMAP', description: 'Marine Corps Martial Arts Program - combat techniques for Marines', origin_country: 'USA', focus_areas: ['striking', 'grappling', 'weapons', 'combat'], icon: '⚔️', color: 'from-green-700 to-green-900', order_index: 8, is_military: true },
    { id: 'army-combatives', name: 'Army Combatives', description: 'Modern Army Combatives Program (MACP)', origin_country: 'USA', focus_areas: ['grappling', 'striking', 'combat'], icon: '🪖', color: 'from-yellow-600 to-yellow-800', order_index: 9, is_military: true },
    { id: 'krav-maga', name: 'Krav Maga', description: 'Israeli military self-defense and fighting system', origin_country: 'Israel', focus_areas: ['striking', 'grappling', 'weapons', 'combat'], icon: '🇮🇱', color: 'from-blue-600 to-blue-800', order_index: 10, is_military: true },
  ];

  for (const d of disciplines) {
    await db.query(`
      INSERT INTO martial_arts_disciplines (id, name, description, origin_country, focus_areas, icon, color, order_index, is_military)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [d.id, d.name, d.description, d.origin_country, d.focus_areas, d.icon, d.color, d.order_index, d.is_military]);
  }

  // Seed categories for each discipline
  const categories = [
    // Boxing
    { id: 'boxing-stances', discipline_id: 'boxing', name: 'Stances & Footwork', order_index: 1 },
    { id: 'boxing-punches', discipline_id: 'boxing', name: 'Punches', order_index: 2 },
    { id: 'boxing-defense', discipline_id: 'boxing', name: 'Defense', order_index: 3 },
    { id: 'boxing-combos', discipline_id: 'boxing', name: 'Combinations', order_index: 4 },

    // Kickboxing
    { id: 'kb-stances', discipline_id: 'kickboxing', name: 'Stances & Movement', order_index: 1 },
    { id: 'kb-punches', discipline_id: 'kickboxing', name: 'Punches', order_index: 2 },
    { id: 'kb-kicks', discipline_id: 'kickboxing', name: 'Kicks', order_index: 3 },
    { id: 'kb-defense', discipline_id: 'kickboxing', name: 'Defense', order_index: 4 },

    // Muay Thai
    { id: 'mt-stances', discipline_id: 'muay-thai', name: 'Stances & Footwork', order_index: 1 },
    { id: 'mt-punches', discipline_id: 'muay-thai', name: 'Punches', order_index: 2 },
    { id: 'mt-kicks', discipline_id: 'muay-thai', name: 'Kicks', order_index: 3 },
    { id: 'mt-elbows', discipline_id: 'muay-thai', name: 'Elbows', order_index: 4 },
    { id: 'mt-knees', discipline_id: 'muay-thai', name: 'Knees', order_index: 5 },
    { id: 'mt-clinch', discipline_id: 'muay-thai', name: 'Clinch', order_index: 6 },

    // BJJ
    { id: 'bjj-positions', discipline_id: 'bjj', name: 'Positions', order_index: 1 },
    { id: 'bjj-guards', discipline_id: 'bjj', name: 'Guards', order_index: 2 },
    { id: 'bjj-sweeps', discipline_id: 'bjj', name: 'Sweeps', order_index: 3 },
    { id: 'bjj-passes', discipline_id: 'bjj', name: 'Guard Passes', order_index: 4 },
    { id: 'bjj-submissions', discipline_id: 'bjj', name: 'Submissions', order_index: 5 },
    { id: 'bjj-escapes', discipline_id: 'bjj', name: 'Escapes', order_index: 6 },

    // Wrestling
    { id: 'wrestling-stances', discipline_id: 'wrestling', name: 'Stances & Movement', order_index: 1 },
    { id: 'wrestling-takedowns', discipline_id: 'wrestling', name: 'Takedowns', order_index: 2 },
    { id: 'wrestling-defense', discipline_id: 'wrestling', name: 'Takedown Defense', order_index: 3 },
    { id: 'wrestling-pins', discipline_id: 'wrestling', name: 'Pins & Control', order_index: 4 },

    // Judo
    { id: 'judo-throws', discipline_id: 'judo', name: 'Throws (Nage-waza)', order_index: 1 },
    { id: 'judo-pins', discipline_id: 'judo', name: 'Pins (Osaekomi-waza)', order_index: 2 },
    { id: 'judo-submissions', discipline_id: 'judo', name: 'Submissions', order_index: 3 },

    // Self-Defense
    { id: 'sd-awareness', discipline_id: 'self-defense', name: 'Situational Awareness', order_index: 1 },
    { id: 'sd-strikes', discipline_id: 'self-defense', name: 'Strikes', order_index: 2 },
    { id: 'sd-escapes', discipline_id: 'self-defense', name: 'Escapes', order_index: 3 },
    { id: 'sd-defense', discipline_id: 'self-defense', name: 'Defense', order_index: 4 },

    // MCMAP
    { id: 'mcmap-tan', discipline_id: 'mcmap', name: 'Tan Belt', order_index: 1 },
    { id: 'mcmap-gray', discipline_id: 'mcmap', name: 'Gray Belt', order_index: 2 },
    { id: 'mcmap-green', discipline_id: 'mcmap', name: 'Green Belt', order_index: 3 },
    { id: 'mcmap-brown', discipline_id: 'mcmap', name: 'Brown Belt', order_index: 4 },
    { id: 'mcmap-black', discipline_id: 'mcmap', name: 'Black Belt', order_index: 5 },

    // Army Combatives
    { id: 'macp-basic', discipline_id: 'army-combatives', name: 'Basic (Level 1)', order_index: 1 },
    { id: 'macp-tactical', discipline_id: 'army-combatives', name: 'Tactical (Level 2)', order_index: 2 },
    { id: 'macp-advanced', discipline_id: 'army-combatives', name: 'Advanced (Level 3)', order_index: 3 },

    // Krav Maga
    { id: 'km-strikes', discipline_id: 'krav-maga', name: 'Strikes', order_index: 1 },
    { id: 'km-defenses', discipline_id: 'krav-maga', name: 'Defenses', order_index: 2 },
    { id: 'km-weapons', discipline_id: 'krav-maga', name: 'Weapon Defenses', order_index: 3 },
    { id: 'km-ground', discipline_id: 'krav-maga', name: 'Ground Fighting', order_index: 4 },
  ];

  for (const c of categories) {
    await db.query(`
      INSERT INTO martial_arts_categories (id, discipline_id, name, order_index)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `, [c.id, c.discipline_id, c.name, c.order_index]);
  }

  log.info(`Seeded ${disciplines.length} disciplines and ${categories.length} categories`);
}

async function seedTechniques(): Promise<void> {
  // Check if already seeded
  const check = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM martial_arts_techniques
  `);

  if (check && parseInt(check.count) > 0) {
    log.info('Martial arts techniques already seeded, skipping...');
    return;
  }

  log.info('Seeding martial arts techniques...');

  interface TechniqueSeed {
    id: string;
    discipline_id: string;
    category_id: string;
    name: string;
    description: string;
    category: string;
    difficulty: number;
    tier: number;
    position: number;
    key_points: string[];
    muscle_groups: string[];
    xp_reward: number;
    credit_reward: number;
    prerequisites?: string[];
    common_mistakes?: string[];
    drill_suggestions?: string[];
  }

  const techniques: TechniqueSeed[] = [
    // ============ BOXING ============
    // Stances & Footwork
    { id: 'box-orthodox', discipline_id: 'boxing', category_id: 'boxing-stances', name: 'Orthodox Stance', description: 'Right-handed fighting stance with left foot forward', category: 'stance', difficulty: 1, tier: 1, position: 0, key_points: ['Left foot forward', 'Hands up protecting chin', 'Elbows tucked', 'Chin down'], muscle_groups: ['legs', 'core'], xp_reward: 25, credit_reward: 10 },
    { id: 'box-southpaw', discipline_id: 'boxing', category_id: 'boxing-stances', name: 'Southpaw Stance', description: 'Left-handed fighting stance with right foot forward', category: 'stance', difficulty: 1, tier: 1, position: 1, key_points: ['Right foot forward', 'Mirror of orthodox', 'Confuses orthodox fighters'], muscle_groups: ['legs', 'core'], xp_reward: 25, credit_reward: 10 },
    { id: 'box-footwork-basic', discipline_id: 'boxing', category_id: 'boxing-stances', name: 'Basic Footwork', description: 'Step-drag movement pattern for maintaining balance', category: 'stance', difficulty: 1, tier: 1, position: 2, prerequisites: ['box-orthodox'], key_points: ['Never cross feet', 'Push off rear foot', 'Small controlled steps', 'Stay on balls of feet'], muscle_groups: ['calves', 'quadriceps'], xp_reward: 50, credit_reward: 25 },
    { id: 'box-pivot', discipline_id: 'boxing', category_id: 'boxing-stances', name: 'Pivot Step', description: 'Rotating on the lead foot to change angles', category: 'stance', difficulty: 2, tier: 2, position: 0, prerequisites: ['box-footwork-basic'], key_points: ['Pivot on ball of lead foot', 'Rotate hips and shoulders', 'Use to create angles'], muscle_groups: ['calves', 'hips'], xp_reward: 75, credit_reward: 35 },

    // Punches
    { id: 'box-jab', discipline_id: 'boxing', category_id: 'boxing-punches', name: 'Jab', description: 'Quick straight punch with the lead hand', category: 'strike', difficulty: 1, tier: 1, position: 0, prerequisites: ['box-orthodox'], key_points: ['Extend lead arm straight', 'Rotate fist on contact', 'Snap back quickly', 'Keep rear hand up'], muscle_groups: ['shoulders', 'triceps', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'box-cross', discipline_id: 'boxing', category_id: 'boxing-punches', name: 'Cross (Straight Right)', description: 'Power punch with the rear hand', category: 'strike', difficulty: 1, tier: 1, position: 1, prerequisites: ['box-jab'], key_points: ['Rotate hips fully', 'Push off rear foot', 'Turn shoulder over', 'Return to guard'], muscle_groups: ['shoulders', 'chest', 'core', 'legs'], xp_reward: 50, credit_reward: 25 },
    { id: 'box-hook', discipline_id: 'boxing', category_id: 'boxing-punches', name: 'Lead Hook', description: 'Circular punch with the lead hand', category: 'strike', difficulty: 2, tier: 2, position: 0, prerequisites: ['box-jab', 'box-cross'], key_points: ['Arm at 90 degrees', 'Rotate on ball of foot', 'Keep elbow at shoulder height', 'Power from hips'], muscle_groups: ['shoulders', 'biceps', 'core'], xp_reward: 75, credit_reward: 35 },
    { id: 'box-uppercut', discipline_id: 'boxing', category_id: 'boxing-punches', name: 'Uppercut', description: 'Rising punch thrown upward at close range', category: 'strike', difficulty: 2, tier: 2, position: 1, prerequisites: ['box-cross'], key_points: ['Drop hand slightly before punch', 'Drive up with legs', 'Palm faces you', 'Short range punch'], muscle_groups: ['shoulders', 'legs', 'core'], xp_reward: 75, credit_reward: 35 },
    { id: 'box-body-shot', discipline_id: 'boxing', category_id: 'boxing-punches', name: 'Body Shot', description: 'Punches targeting the body rather than head', category: 'strike', difficulty: 2, tier: 2, position: 2, prerequisites: ['box-hook'], key_points: ['Bend knees to lower level', 'Target liver or ribs', 'Keep head off centerline', 'Return to guard quickly'], muscle_groups: ['core', 'legs', 'shoulders'], xp_reward: 75, credit_reward: 35 },

    // Defense
    { id: 'box-block', discipline_id: 'boxing', category_id: 'boxing-defense', name: 'High Block', description: 'Blocking punches with gloves and forearms', category: 'block', difficulty: 1, tier: 1, position: 0, prerequisites: ['box-orthodox'], key_points: ['Gloves tight to head', 'Elbows protecting body', 'Chin tucked', 'Eyes on opponent'], muscle_groups: ['shoulders', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'box-slip', discipline_id: 'boxing', category_id: 'boxing-defense', name: 'Slip', description: 'Moving head off centerline to avoid punches', category: 'block', difficulty: 2, tier: 2, position: 0, prerequisites: ['box-block'], key_points: ['Small head movement', 'Bend at waist slightly', 'Keep eyes on opponent', 'Counter opportunity'], muscle_groups: ['core', 'neck'], xp_reward: 100, credit_reward: 50 },
    { id: 'box-bob-weave', discipline_id: 'boxing', category_id: 'boxing-defense', name: 'Bob and Weave', description: 'Ducking under hooks with U-shaped head movement', category: 'block', difficulty: 3, tier: 3, position: 0, prerequisites: ['box-slip'], key_points: ['Bend at knees not waist', 'U-shaped movement', 'Keep hands up', 'Rise with counter'], muscle_groups: ['legs', 'core'], xp_reward: 125, credit_reward: 60 },
    { id: 'box-parry', discipline_id: 'boxing', category_id: 'boxing-defense', name: 'Parry', description: 'Deflecting punches with small hand movements', category: 'block', difficulty: 2, tier: 2, position: 1, prerequisites: ['box-block'], key_points: ['Small deflection', 'Redirect not stop', 'Open counter line', 'Stay balanced'], muscle_groups: ['shoulders', 'arms'], xp_reward: 100, credit_reward: 50 },

    // Combinations
    { id: 'box-1-2', discipline_id: 'boxing', category_id: 'boxing-combos', name: '1-2 (Jab-Cross)', description: 'The fundamental two-punch combination', category: 'strike', difficulty: 1, tier: 1, position: 0, prerequisites: ['box-jab', 'box-cross'], key_points: ['Jab sets up cross', 'Flow between punches', 'Return to guard after'], muscle_groups: ['shoulders', 'core', 'legs'], xp_reward: 75, credit_reward: 35 },
    { id: 'box-1-2-3', discipline_id: 'boxing', category_id: 'boxing-combos', name: '1-2-3 (Jab-Cross-Hook)', description: 'Three punch combination ending with lead hook', category: 'strike', difficulty: 2, tier: 2, position: 0, prerequisites: ['box-1-2', 'box-hook'], key_points: ['Keep rhythm', 'Hook follows naturally', 'Stay balanced', 'Full hip rotation'], muscle_groups: ['shoulders', 'core', 'legs'], xp_reward: 100, credit_reward: 50 },
    { id: 'box-1-2-3-2', discipline_id: 'boxing', category_id: 'boxing-combos', name: '1-2-3-2', description: 'Four punch combination with double cross', category: 'strike', difficulty: 3, tier: 3, position: 0, prerequisites: ['box-1-2-3'], key_points: ['Reset hips for final cross', 'Vary speed and power', 'Stay in range'], muscle_groups: ['shoulders', 'core', 'legs'], xp_reward: 150, credit_reward: 75 },

    // ============ BJJ ============
    // Positions
    { id: 'bjj-mount', discipline_id: 'bjj', category_id: 'bjj-positions', name: 'Mount Position', description: 'Sitting on opponent\'s torso with knees on ground', category: 'position', difficulty: 1, tier: 1, position: 0, key_points: ['Grapevine legs for control', 'Hips heavy and low', 'Posture up or chest down', 'Control wrists'], muscle_groups: ['hips', 'core', 'legs'], xp_reward: 50, credit_reward: 25 },
    { id: 'bjj-side-control', discipline_id: 'bjj', category_id: 'bjj-positions', name: 'Side Control', description: 'Controlling opponent from the side chest-to-chest', category: 'position', difficulty: 1, tier: 1, position: 1, key_points: ['Chest pressure on face/chest', 'Control near hip and head', 'Sprawl legs back', 'Stay heavy'], muscle_groups: ['core', 'shoulders', 'hips'], xp_reward: 50, credit_reward: 25 },
    { id: 'bjj-back-control', discipline_id: 'bjj', category_id: 'bjj-positions', name: 'Back Control', description: 'Controlling opponent from behind with hooks', category: 'position', difficulty: 2, tier: 2, position: 0, key_points: ['Hooks in (feet inside thighs)', 'Seat belt grip', 'Head on choking side', 'Hips tight to opponent'], muscle_groups: ['legs', 'core', 'arms'], xp_reward: 100, credit_reward: 50 },
    { id: 'bjj-knee-on-belly', discipline_id: 'bjj', category_id: 'bjj-positions', name: 'Knee on Belly', description: 'Pinning with knee across opponent\'s stomach', category: 'position', difficulty: 2, tier: 2, position: 1, key_points: ['Knee across solar plexus', 'Other foot posted far', 'Grip collar and pants', 'Stay mobile'], muscle_groups: ['legs', 'core'], xp_reward: 100, credit_reward: 50 },

    // Guards
    { id: 'bjj-closed-guard', discipline_id: 'bjj', category_id: 'bjj-guards', name: 'Closed Guard', description: 'Legs wrapped around opponent\'s torso, ankles crossed', category: 'position', difficulty: 1, tier: 1, position: 0, key_points: ['Break posture immediately', 'Control head or sleeves', 'Hips mobile', 'Attack or sweep'], muscle_groups: ['hips', 'legs', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'bjj-open-guard', discipline_id: 'bjj', category_id: 'bjj-guards', name: 'Open Guard', description: 'Guard with legs not closed, using feet for control', category: 'position', difficulty: 2, tier: 2, position: 0, prerequisites: ['bjj-closed-guard'], key_points: ['Feet on hips or biceps', 'Grips on sleeves/collar', 'Active feet', 'Hip escape ready'], muscle_groups: ['hips', 'legs', 'core'], xp_reward: 75, credit_reward: 35 },
    { id: 'bjj-half-guard', discipline_id: 'bjj', category_id: 'bjj-guards', name: 'Half Guard', description: 'Controlling one of opponent\'s legs with your legs', category: 'position', difficulty: 2, tier: 2, position: 1, prerequisites: ['bjj-closed-guard'], key_points: ['Get underhook', 'Block crossface', 'Knee shield or dog fight', 'Never flat on back'], muscle_groups: ['legs', 'core', 'shoulders'], xp_reward: 75, credit_reward: 35 },
    { id: 'bjj-butterfly-guard', discipline_id: 'bjj', category_id: 'bjj-guards', name: 'Butterfly Guard', description: 'Seated guard with feet hooked inside opponent\'s thighs', category: 'position', difficulty: 2, tier: 2, position: 2, prerequisites: ['bjj-open-guard'], key_points: ['Hooks inside thighs', 'Good posture', 'Double underhooks or collar/sleeve', 'Ready to elevate'], muscle_groups: ['hips', 'legs', 'core'], xp_reward: 100, credit_reward: 50 },

    // Sweeps
    { id: 'bjj-scissor-sweep', discipline_id: 'bjj', category_id: 'bjj-sweeps', name: 'Scissor Sweep', description: 'Sweep from closed guard using scissoring leg motion', category: 'sweep', difficulty: 2, tier: 2, position: 0, prerequisites: ['bjj-closed-guard'], key_points: ['Break posture first', 'Grip collar and sleeve', 'Shin across belly', 'Kick leg out, pull down'], muscle_groups: ['hips', 'legs', 'core'], xp_reward: 100, credit_reward: 50 },
    { id: 'bjj-hip-bump', discipline_id: 'bjj', category_id: 'bjj-sweeps', name: 'Hip Bump Sweep', description: 'Sweep using explosive hip drive when opponent postures', category: 'sweep', difficulty: 2, tier: 2, position: 1, prerequisites: ['bjj-closed-guard'], key_points: ['Wait for posture up', 'Post on hand, hip forward', 'Drive into opponent', 'End in mount'], muscle_groups: ['hips', 'core', 'shoulders'], xp_reward: 100, credit_reward: 50 },
    { id: 'bjj-butterfly-sweep', discipline_id: 'bjj', category_id: 'bjj-sweeps', name: 'Butterfly Sweep', description: 'Elevating sweep using butterfly hooks', category: 'sweep', difficulty: 3, tier: 3, position: 0, prerequisites: ['bjj-butterfly-guard'], key_points: ['Clamp with overhook', 'Fall to side', 'Elevate with hook', 'Follow to mount'], muscle_groups: ['hips', 'legs', 'core'], xp_reward: 125, credit_reward: 60 },

    // Submissions
    { id: 'bjj-rear-naked-choke', discipline_id: 'bjj', category_id: 'bjj-submissions', name: 'Rear Naked Choke', description: 'Blood choke from back control', category: 'submission', difficulty: 2, tier: 2, position: 0, prerequisites: ['bjj-back-control'], key_points: ['Choking arm under chin', 'Hand on bicep', 'Squeeze elbows together', 'Expand chest'], muscle_groups: ['biceps', 'forearms', 'chest'], xp_reward: 125, credit_reward: 60 },
    { id: 'bjj-armbar', discipline_id: 'bjj', category_id: 'bjj-submissions', name: 'Armbar', description: 'Hyperextending elbow joint from various positions', category: 'submission', difficulty: 2, tier: 2, position: 1, prerequisites: ['bjj-mount'], key_points: ['Control wrist', 'Hips tight to shoulder', 'Knees pinched', 'Hips up for pressure'], muscle_groups: ['hips', 'legs', 'grip'], xp_reward: 125, credit_reward: 60 },
    { id: 'bjj-triangle', discipline_id: 'bjj', category_id: 'bjj-submissions', name: 'Triangle Choke', description: 'Blood choke using legs from guard', category: 'submission', difficulty: 3, tier: 3, position: 0, prerequisites: ['bjj-closed-guard', 'bjj-armbar'], key_points: ['One arm in, one arm out', 'Lock at knee crook', 'Cut angle', 'Squeeze knees, pull head'], muscle_groups: ['legs', 'hips', 'core'], xp_reward: 150, credit_reward: 75 },
    { id: 'bjj-kimura', discipline_id: 'bjj', category_id: 'bjj-submissions', name: 'Kimura', description: 'Double wristlock shoulder lock', category: 'submission', difficulty: 2, tier: 2, position: 2, prerequisites: ['bjj-side-control'], key_points: ['Figure-four grip on wrist', 'Elbow tight to body', 'Paint the mat', 'Control posture'], muscle_groups: ['shoulders', 'grip', 'core'], xp_reward: 125, credit_reward: 60 },
    { id: 'bjj-guillotine', discipline_id: 'bjj', category_id: 'bjj-submissions', name: 'Guillotine Choke', description: 'Front headlock choke', category: 'submission', difficulty: 2, tier: 2, position: 3, prerequisites: ['bjj-closed-guard'], key_points: ['Arm around neck', 'Blade of wrist on throat', 'Hips forward', 'Squeeze and arch'], muscle_groups: ['forearms', 'biceps', 'core'], xp_reward: 125, credit_reward: 60 },

    // ============ WRESTLING ============
    // Stances
    { id: 'wres-stance', discipline_id: 'wrestling', category_id: 'wrestling-stances', name: 'Wrestling Stance', description: 'Athletic base position ready to attack or defend', category: 'stance', difficulty: 1, tier: 1, position: 0, key_points: ['Feet shoulder width', 'Staggered stance', 'Knees bent, hips low', 'Hands in front'], muscle_groups: ['legs', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'wres-motion', discipline_id: 'wrestling', category_id: 'wrestling-stances', name: 'Motion & Level Change', description: 'Moving while maintaining proper stance', category: 'stance', difficulty: 1, tier: 1, position: 1, prerequisites: ['wres-stance'], key_points: ['Circle dont square up', 'Change levels to set up shots', 'Stay in stance while moving'], muscle_groups: ['legs', 'core'], xp_reward: 75, credit_reward: 35 },

    // Takedowns
    { id: 'wres-double-leg', discipline_id: 'wrestling', category_id: 'wrestling-takedowns', name: 'Double Leg Takedown', description: 'Shooting to grab both legs', category: 'takedown', difficulty: 2, tier: 2, position: 0, prerequisites: ['wres-motion'], key_points: ['Level change first', 'Penetration step deep', 'Head outside, hands behind knees', 'Drive through'], muscle_groups: ['legs', 'core', 'shoulders'], xp_reward: 125, credit_reward: 60 },
    { id: 'wres-single-leg', discipline_id: 'wrestling', category_id: 'wrestling-takedowns', name: 'Single Leg Takedown', description: 'Attacking one leg for takedown', category: 'takedown', difficulty: 2, tier: 2, position: 1, prerequisites: ['wres-motion'], key_points: ['Head inside position', 'Grab behind knee', 'Multiple finishes available', 'Cut corner or run pipe'], muscle_groups: ['legs', 'core', 'grip'], xp_reward: 125, credit_reward: 60 },
    { id: 'wres-high-crotch', discipline_id: 'wrestling', category_id: 'wrestling-takedowns', name: 'High Crotch', description: 'Takedown attacking inner thigh/hip', category: 'takedown', difficulty: 3, tier: 3, position: 0, prerequisites: ['wres-single-leg'], key_points: ['Head inside', 'Shoulder in hip', 'Pop hips through', 'Turn to double or single'], muscle_groups: ['legs', 'hips', 'core'], xp_reward: 150, credit_reward: 75 },
    { id: 'wres-fireman', discipline_id: 'wrestling', category_id: 'wrestling-takedowns', name: 'Fireman\'s Carry', description: 'Throw using arm and leg control', category: 'throw', difficulty: 3, tier: 3, position: 1, prerequisites: ['wres-double-leg'], key_points: ['Drop to knees', 'Arm between legs, arm on tricep', 'Roll opponent over shoulder'], muscle_groups: ['core', 'shoulders', 'back'], xp_reward: 150, credit_reward: 75 },

    // ============ SELF-DEFENSE ============
    { id: 'sd-awareness-basics', discipline_id: 'self-defense', category_id: 'sd-awareness', name: 'Situational Awareness', description: 'Recognizing and avoiding dangerous situations', category: 'awareness', difficulty: 1, tier: 1, position: 0, key_points: ['Head up, phone down', 'Trust gut feelings', 'Know exits', 'Avoid isolated areas'], muscle_groups: [], xp_reward: 50, credit_reward: 25 },
    { id: 'sd-verbal', discipline_id: 'self-defense', category_id: 'sd-awareness', name: 'Verbal De-escalation', description: 'Using words to avoid physical confrontation', category: 'awareness', difficulty: 2, tier: 2, position: 0, prerequisites: ['sd-awareness-basics'], key_points: ['Stay calm', 'Non-threatening posture', 'Create distance', 'Look for exit'], muscle_groups: [], xp_reward: 75, credit_reward: 35 },
    { id: 'sd-palm-strike', discipline_id: 'self-defense', category_id: 'sd-strikes', name: 'Palm Strike', description: 'Open-hand strike safer than closed fist', category: 'strike', difficulty: 1, tier: 1, position: 0, key_points: ['Heel of palm forward', 'Safer for your hand', 'Target nose, chin, throat', 'Drive through target'], muscle_groups: ['shoulders', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'sd-knee', discipline_id: 'self-defense', category_id: 'sd-strikes', name: 'Knee Strike', description: 'Close-range powerful strike with knee', category: 'strike', difficulty: 1, tier: 1, position: 1, key_points: ['Grab head/shoulders', 'Drive knee up hard', 'Target groin or stomach', 'Multiple strikes'], muscle_groups: ['legs', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'sd-wrist-escape', discipline_id: 'self-defense', category_id: 'sd-escapes', name: 'Wrist Grab Escape', description: 'Escaping when someone grabs your wrist', category: 'escape', difficulty: 1, tier: 1, position: 0, key_points: ['Pull toward thumb side', 'Circle and strip', 'Immediate counter if needed'], muscle_groups: ['forearms', 'shoulders'], xp_reward: 50, credit_reward: 25 },
    { id: 'sd-bear-hug-escape', discipline_id: 'self-defense', category_id: 'sd-escapes', name: 'Bear Hug Escape', description: 'Escaping arms-pinned bear hug from behind', category: 'escape', difficulty: 2, tier: 2, position: 0, prerequisites: ['sd-wrist-escape'], key_points: ['Drop weight immediately', 'Tuck chin', 'Elbow strikes', 'Peel fingers, turn out'], muscle_groups: ['core', 'legs'], xp_reward: 100, credit_reward: 50 },

    // ============ MCMAP (Marine Corps) ============
    { id: 'mcmap-basic-warrior', discipline_id: 'mcmap', category_id: 'mcmap-tan', name: 'Basic Warrior Stance', description: 'Fundamental fighting stance for MCMAP', category: 'stance', difficulty: 1, tier: 1, position: 0, key_points: ['Balanced athletic stance', 'Hands up, chin down', 'Ready position'], muscle_groups: ['legs', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'mcmap-straight-punch', discipline_id: 'mcmap', category_id: 'mcmap-tan', name: 'Straight Punch', description: 'Basic straight punch from fighting stance', category: 'strike', difficulty: 1, tier: 1, position: 1, prerequisites: ['mcmap-basic-warrior'], key_points: ['Rotate hips', 'Extend fully', 'Return to guard'], muscle_groups: ['shoulders', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'mcmap-front-kick', discipline_id: 'mcmap', category_id: 'mcmap-tan', name: 'Front Kick', description: 'Push kick targeting torso', category: 'kick', difficulty: 1, tier: 1, position: 2, prerequisites: ['mcmap-basic-warrior'], key_points: ['Chamber knee', 'Kick with ball of foot', 'Push through target'], muscle_groups: ['legs', 'hips'], xp_reward: 50, credit_reward: 25 },
    { id: 'mcmap-knife-defense', discipline_id: 'mcmap', category_id: 'mcmap-gray', name: 'Knife Defense', description: 'Defense against knife attacks', category: 'defense', difficulty: 3, tier: 3, position: 0, prerequisites: ['mcmap-straight-punch'], key_points: ['Control weapon hand', 'Create distance', 'Strip or control weapon', 'Last resort only'], muscle_groups: ['grip', 'core', 'legs'], xp_reward: 150, credit_reward: 75 },
    { id: 'mcmap-ground-fighting', discipline_id: 'mcmap', category_id: 'mcmap-gray', name: 'Ground Fighting Basics', description: 'Basic ground fighting principles', category: 'grappling', difficulty: 2, tier: 2, position: 0, prerequisites: ['mcmap-basic-warrior'], key_points: ['Get to feet if possible', 'Control position', 'Escape or submit'], muscle_groups: ['core', 'legs', 'arms'], xp_reward: 100, credit_reward: 50 },

    // ============ KRAV MAGA ============
    { id: 'km-fighting-stance', discipline_id: 'krav-maga', category_id: 'km-strikes', name: 'Krav Maga Stance', description: 'Neutral fighting stance ready for all directions', category: 'stance', difficulty: 1, tier: 1, position: 0, key_points: ['Square-ish stance', 'Hands up, palms out', 'Ready to attack or defend', 'Mobile footwork'], muscle_groups: ['legs', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'km-palm-strike', discipline_id: 'krav-maga', category_id: 'km-strikes', name: 'Palm Heel Strike', description: 'Powerful open-hand strike', category: 'strike', difficulty: 1, tier: 1, position: 1, prerequisites: ['km-fighting-stance'], key_points: ['Drive through target', 'Recoil for follow-up', 'Multiple targets'], muscle_groups: ['shoulders', 'core'], xp_reward: 50, credit_reward: 25 },
    { id: 'km-groin-kick', discipline_id: 'krav-maga', category_id: 'km-strikes', name: 'Groin Kick', description: 'Low kick targeting groin', category: 'kick', difficulty: 1, tier: 1, position: 2, prerequisites: ['km-fighting-stance'], key_points: ['Kick through target', 'Shin or instep', 'Follow with combatives'], muscle_groups: ['legs', 'hips'], xp_reward: 50, credit_reward: 25 },
    { id: 'km-360-defense', discipline_id: 'krav-maga', category_id: 'km-defenses', name: '360 Defense', description: 'Universal outside defense against hooks/haymakers', category: 'block', difficulty: 2, tier: 2, position: 0, prerequisites: ['km-fighting-stance'], key_points: ['Forearm blocks outside', 'Simultaneous counter', 'Follow up aggressively'], muscle_groups: ['arms', 'shoulders', 'core'], xp_reward: 100, credit_reward: 50 },
    { id: 'km-gun-front', discipline_id: 'krav-maga', category_id: 'km-weapons', name: 'Gun Defense (Front)', description: 'Defense against gun pointed at front', category: 'defense', difficulty: 4, tier: 4, position: 0, prerequisites: ['km-360-defense'], key_points: ['Redirect muzzle', 'Control weapon', 'Counterattack', 'Strip weapon'], muscle_groups: ['grip', 'arms', 'core'], xp_reward: 200, credit_reward: 100 },
  ];

  for (const t of techniques) {
    await db.query(`
      INSERT INTO martial_arts_techniques (
        id, discipline_id, category_id, name, description, category, difficulty,
        prerequisites, key_points, common_mistakes, drill_suggestions,
        muscle_groups, xp_reward, credit_reward, tier, position
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO NOTHING
    `, [
      t.id, t.discipline_id, t.category_id, t.name, t.description, t.category, t.difficulty,
      t.prerequisites || [], t.key_points || [], t.common_mistakes || [], t.drill_suggestions || [],
      t.muscle_groups || [], t.xp_reward, t.credit_reward, t.tier, t.position
    ]);
  }

  log.info(`Seeded ${techniques.length} martial arts techniques`);
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 044_martial_arts');

  await db.query('DROP TABLE IF EXISTS technique_practice_logs CASCADE');
  await db.query('DROP TABLE IF EXISTS user_technique_progress CASCADE');
  await db.query('DROP TABLE IF EXISTS martial_arts_techniques CASCADE');
  await db.query('DROP TABLE IF EXISTS martial_arts_categories CASCADE');
  await db.query('DROP TABLE IF EXISTS martial_arts_disciplines CASCADE');

  log.info('Rollback 044_martial_arts complete');
}
