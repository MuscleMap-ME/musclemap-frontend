/**
 * Migration: Complete Archetypes
 *
 * This migration fills in missing archetypes across all categories to provide
 * comprehensive coverage for different fitness disciplines.
 *
 * New archetypes added:
 * - Combat: boxing, wrestling, mma, judo, karate, taekwondo, krav-maga, fencing
 * - Team Sports: baseball, tennis, volleyball, lacrosse, golf, cricket, swimming-competitive
 * - General: kettlebell-specialist, arm-wrestler, physique-competitor
 * - Movement: dancer, pole-fitness, flexibility-specialist, acrobat
 * - Endurance: cyclist, ultra-runner, marathon-runner, speed-skater
 * - Adventure: skier, snowboarder, kayaker, scuba-diver, trail-runner
 * - Occupational: construction-worker, warehouse-worker, healthcare-worker, lineman
 *
 * Also consolidates duplicate categories (first_responder vs first_responders)
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

interface ArchetypeSeed {
  id: string;
  name: string;
  philosophy: string;
  description: string;
  category_id: string;
  focus_areas: string[];
}

const newArchetypes: ArchetypeSeed[] = [
  // ============================================
  // COMBAT & MARTIAL ARTS
  // ============================================
  {
    id: 'boxing',
    name: 'Boxer',
    philosophy: 'The sweet science of hitting without being hit',
    description: 'Master footwork, head movement, and devastating hand combinations. Train like a champion.',
    category_id: 'combat',
    focus_areas: ['shoulders', 'core', 'legs', 'cardio', 'hand-speed', 'footwork'],
  },
  {
    id: 'wrestling',
    name: 'Wrestler',
    philosophy: 'Control the body, control the fight',
    description: 'Takedowns, scrambles, and grinding top control. Build the relentless engine of a wrestler.',
    category_id: 'combat',
    focus_areas: ['neck', 'core', 'hips', 'legs', 'grip', 'explosiveness'],
  },
  {
    id: 'mma',
    name: 'MMA Fighter',
    philosophy: 'Evolve or be defeated',
    description: 'Combine striking, wrestling, and submissions. The complete martial artist.',
    category_id: 'combat',
    focus_areas: ['full-body', 'cardio', 'power', 'flexibility', 'mental-toughness'],
  },
  {
    id: 'judo',
    name: 'Judoka',
    philosophy: 'Maximum efficiency, minimum effort',
    description: 'Master throws, trips, and ground control. Use your opponent\'s force against them.',
    category_id: 'combat',
    focus_areas: ['grip', 'core', 'legs', 'explosiveness', 'balance', 'timing'],
  },
  {
    id: 'karate',
    name: 'Karateka',
    philosophy: 'The way of the empty hand',
    description: 'Precision striking, powerful kata, and disciplined conditioning. Traditional strength.',
    category_id: 'combat',
    focus_areas: ['legs', 'core', 'hips', 'speed', 'flexibility', 'mental-focus'],
  },
  {
    id: 'taekwondo',
    name: 'Taekwondo Athlete',
    philosophy: 'Legs are the longest weapon',
    description: 'Dynamic kicks, spinning techniques, and explosive athleticism.',
    category_id: 'combat',
    focus_areas: ['legs', 'hips', 'flexibility', 'balance', 'speed', 'core'],
  },
  {
    id: 'krav-maga',
    name: 'Krav Maga Practitioner',
    philosophy: 'Neutralize the threat',
    description: 'Real-world self-defense. Practical, aggressive, and effective.',
    category_id: 'combat',
    focus_areas: ['full-body', 'cardio', 'power', 'mental-toughness', 'reaction-time'],
  },
  {
    id: 'fencing',
    name: 'Fencer',
    philosophy: 'Touch without being touched',
    description: 'Lightning reflexes, precise footwork, and tactical brilliance.',
    category_id: 'combat',
    focus_areas: ['legs', 'core', 'shoulders', 'agility', 'reaction-time', 'endurance'],
  },

  // ============================================
  // TEAM SPORTS (additional)
  // ============================================
  {
    id: 'baseball',
    name: 'Baseball Player',
    philosophy: 'Hit the ball, catch the ball, throw the ball',
    description: 'Rotational power, explosive speed, and arm health for America\'s pastime.',
    category_id: 'team_sports',
    focus_areas: ['rotational-power', 'shoulders', 'legs', 'core', 'reaction-time', 'arm-care'],
  },
  {
    id: 'tennis',
    name: 'Tennis Player',
    philosophy: 'Every point is a new opportunity',
    description: 'Lateral quickness, rotational power, and endurance for singles or doubles dominance.',
    category_id: 'team_sports',
    focus_areas: ['legs', 'core', 'shoulders', 'lateral-speed', 'cardio', 'arm-care'],
  },
  {
    id: 'volleyball',
    name: 'Volleyball Player',
    philosophy: 'Rise above the net',
    description: 'Vertical leap, shoulder health, and court awareness. Train for power at the net.',
    category_id: 'team_sports',
    focus_areas: ['legs', 'shoulders', 'core', 'vertical-jump', 'lateral-speed', 'arm-care'],
  },
  {
    id: 'lacrosse',
    name: 'Lacrosse Player',
    philosophy: 'The Creator\'s Game',
    description: 'Sprint speed, stick skills, and contact preparation for the fastest game on two feet.',
    category_id: 'team_sports',
    focus_areas: ['legs', 'core', 'shoulders', 'cardio', 'agility', 'contact-strength'],
  },
  {
    id: 'golf',
    name: 'Golfer',
    philosophy: 'Drive for show, putt for dough',
    description: 'Rotational power, flexibility, and endurance for 18 holes of excellence.',
    category_id: 'team_sports',
    focus_areas: ['core', 'hips', 'shoulders', 'flexibility', 'rotational-power', 'stability'],
  },
  {
    id: 'cricket',
    name: 'Cricketer',
    philosophy: 'Patience and precision under pressure',
    description: 'Bowling power, batting technique, and field endurance for the gentleman\'s game.',
    category_id: 'team_sports',
    focus_areas: ['shoulders', 'core', 'legs', 'rotational-power', 'cardio', 'flexibility'],
  },
  {
    id: 'competitive-swimmer',
    name: 'Competitive Swimmer',
    philosophy: 'Dominate the lane',
    description: 'Race-focused swim training for sprints, middle distance, or long-distance events.',
    category_id: 'team_sports',
    focus_areas: ['lats', 'shoulders', 'core', 'cardio', 'power-endurance', 'technique'],
  },

  // ============================================
  // STRENGTH & MUSCLE (additional)
  // ============================================
  {
    id: 'kettlebell-specialist',
    name: 'Kettlebell Specialist',
    philosophy: 'One tool, infinite possibilities',
    description: 'Master swings, snatches, cleans, and Turkish get-ups. Functional strength perfected.',
    category_id: 'general',
    focus_areas: ['posterior-chain', 'grip', 'core', 'shoulders', 'power-endurance', 'mobility'],
  },
  {
    id: 'arm-wrestler',
    name: 'Arm Wrestler',
    philosophy: 'Grip it and rip it',
    description: 'Specialized training for the table. Hand, wrist, and arm strength like no other.',
    category_id: 'general',
    focus_areas: ['forearms', 'biceps', 'shoulders', 'grip', 'wrist-strength', 'back'],
  },
  {
    id: 'physique-competitor',
    name: 'Physique Competitor',
    philosophy: 'Aesthetics meet athleticism',
    description: 'Men\'s physique or bikini competition prep. Stage-ready conditioning.',
    category_id: 'general',
    focus_areas: ['shoulders', 'back', 'glutes', 'abs', 'symmetry', 'conditioning'],
  },

  // ============================================
  // MOVEMENT & AGILITY (additional)
  // ============================================
  {
    id: 'dancer',
    name: 'Dancer',
    philosophy: 'Move with purpose and grace',
    description: 'Flexibility, strength, and artistry. Train for ballet, contemporary, or hip-hop.',
    category_id: 'movement',
    focus_areas: ['flexibility', 'core', 'legs', 'balance', 'coordination', 'cardio'],
  },
  {
    id: 'pole-fitness',
    name: 'Pole Athlete',
    philosophy: 'Strength meets artistry',
    description: 'Upper body power, grip strength, and flexibility for impressive pole work.',
    category_id: 'movement',
    focus_areas: ['grip', 'shoulders', 'core', 'flexibility', 'upper-body', 'coordination'],
  },
  {
    id: 'flexibility-specialist',
    name: 'Flexibility Specialist',
    philosophy: 'Unlock your full range',
    description: 'Dedicated flexibility training for splits, backbends, and contortion.',
    category_id: 'movement',
    focus_areas: ['flexibility', 'mobility', 'hip-flexors', 'spine', 'shoulders', 'hamstrings'],
  },
  {
    id: 'acrobat',
    name: 'Acrobat',
    philosophy: 'Defy gravity',
    description: 'Circus arts, tumbling, and aerial skills. Strength and flexibility combined.',
    category_id: 'movement',
    focus_areas: ['core', 'shoulders', 'flexibility', 'balance', 'coordination', 'power'],
  },

  // ============================================
  // ENDURANCE & CARDIO (additional)
  // ============================================
  {
    id: 'cyclist',
    name: 'Cyclist',
    philosophy: 'Suffer now, podium later',
    description: 'Road, gravel, or mountain. Build leg power and cardiovascular excellence.',
    category_id: 'endurance',
    focus_areas: ['legs', 'core', 'cardio', 'power-endurance', 'flexibility', 'posture'],
  },
  {
    id: 'ultra-runner',
    name: 'Ultra Runner',
    philosophy: 'When the marathon is just the warmup',
    description: '50K, 100-milers, and beyond. Mental and physical endurance at the extreme.',
    category_id: 'endurance',
    focus_areas: ['legs', 'core', 'cardio', 'mental-toughness', 'recovery', 'nutrition'],
  },
  {
    id: 'marathon-runner',
    name: 'Marathon Runner',
    philosophy: 'The wall is just a suggestion',
    description: 'Train for the 26.2. Race-specific preparation and pacing strategies.',
    category_id: 'endurance',
    focus_areas: ['legs', 'core', 'cardio', 'pacing', 'endurance', 'recovery'],
  },
  {
    id: 'speed-skater',
    name: 'Speed Skater',
    philosophy: 'Power through the corners',
    description: 'Explosive leg power and endurance for inline or ice speed skating.',
    category_id: 'endurance',
    focus_areas: ['legs', 'glutes', 'core', 'power', 'lateral-stability', 'cardio'],
  },

  // ============================================
  // ADVENTURE & OUTDOOR (additional)
  // ============================================
  {
    id: 'skier',
    name: 'Skier',
    philosophy: 'Conquer the mountain',
    description: 'Downhill, freestyle, or backcountry. Build leg strength and mountain endurance.',
    category_id: 'adventure',
    focus_areas: ['legs', 'core', 'balance', 'power', 'cardio', 'agility'],
  },
  {
    id: 'snowboarder',
    name: 'Snowboarder',
    philosophy: 'Ride with style',
    description: 'Park, powder, or pipe. Core stability, leg power, and flexibility for the slopes.',
    category_id: 'adventure',
    focus_areas: ['legs', 'core', 'balance', 'flexibility', 'power', 'agility'],
  },
  {
    id: 'kayaker',
    name: 'Kayaker / Paddler',
    philosophy: 'Paddle with purpose',
    description: 'Whitewater, sea kayaking, or SUP. Rotational power and endurance on the water.',
    category_id: 'adventure',
    focus_areas: ['core', 'shoulders', 'back', 'rotational-power', 'grip', 'cardio'],
  },
  {
    id: 'scuba-diver',
    name: 'Scuba Diver',
    philosophy: 'Explore the deep',
    description: 'Cardiovascular fitness, breath work, and functional strength for underwater adventures.',
    category_id: 'adventure',
    focus_areas: ['cardio', 'legs', 'core', 'breathing', 'flexibility', 'endurance'],
  },
  {
    id: 'trail-runner',
    name: 'Trail Runner',
    philosophy: 'Run where the pavement ends',
    description: 'Technical terrain, elevation gains, and outdoor endurance. Leave the roads behind.',
    category_id: 'adventure',
    focus_areas: ['legs', 'core', 'cardio', 'balance', 'agility', 'mental-toughness'],
  },
  {
    id: 'mountaineer',
    name: 'Mountaineer / Alpinist',
    philosophy: 'Because it\'s there',
    description: 'Technical climbing, high altitude conditioning, and expedition preparation.',
    category_id: 'adventure',
    focus_areas: ['legs', 'core', 'cardio', 'grip', 'mental-toughness', 'load-carrying'],
  },

  // ============================================
  // OCCUPATIONAL FITNESS
  // ============================================
  {
    id: 'construction-worker',
    name: 'Construction Worker',
    philosophy: 'Build strength to build the world',
    description: 'Functional strength, injury prevention, and endurance for demanding physical labor.',
    category_id: 'occupational',
    focus_areas: ['back', 'core', 'grip', 'legs', 'shoulders', 'endurance'],
  },
  {
    id: 'warehouse-worker',
    name: 'Warehouse Athlete',
    philosophy: 'Move it all day',
    description: 'Lifting, carrying, and sustained physical activity. Stay strong, stay safe.',
    category_id: 'occupational',
    focus_areas: ['back', 'core', 'legs', 'grip', 'cardio', 'injury-prevention'],
  },
  {
    id: 'healthcare-worker',
    name: 'Healthcare Worker',
    philosophy: 'Heal yourself to heal others',
    description: 'Patient handling, long shifts, and stress management. Sustainable fitness for caregivers.',
    category_id: 'occupational',
    focus_areas: ['back', 'core', 'legs', 'posture', 'stress-relief', 'endurance'],
  },
  {
    id: 'lineman',
    name: 'Lineman / Utility Worker',
    philosophy: 'Power through the heights',
    description: 'Climbing, carrying tools, and working at elevation. Functional strength and endurance.',
    category_id: 'occupational',
    focus_areas: ['grip', 'core', 'shoulders', 'legs', 'cardio', 'balance'],
  },
  {
    id: 'tradesperson',
    name: 'Tradesperson',
    philosophy: 'Skilled hands, strong body',
    description: 'Plumbers, electricians, HVAC technicians. Fitness for physical trades.',
    category_id: 'occupational',
    focus_areas: ['back', 'core', 'grip', 'flexibility', 'posture', 'endurance'],
  },

  // ============================================
  // ADDITIONAL MILITARY & TACTICAL
  // ============================================
  {
    id: 'national-guard',
    name: 'National Guard',
    philosophy: 'Always ready, always there',
    description: 'Balance civilian life with military readiness. Train for ACFT success.',
    category_id: 'military',
    focus_areas: ['full-body', 'cardio', 'functional-strength', 'mental-toughness'],
  },
  {
    id: 'space-force',
    name: 'Space Force Guardian',
    philosophy: 'Semper Supra - Always Above',
    description: 'Physical fitness for the newest branch. Air Force PT standards with a space mission.',
    category_id: 'military',
    focus_areas: ['cardio', 'core', 'muscular-endurance', 'flexibility'],
  },

  // ============================================
  // ADDITIONAL FIRST RESPONDERS
  // ============================================
  {
    id: 'corrections-officer',
    name: 'Corrections Officer',
    philosophy: 'Strength in control',
    description: 'Defensive tactics readiness, functional strength, and stress management.',
    category_id: 'first_responders',
    focus_areas: ['full-body', 'cardio', 'functional-strength', 'stress-relief'],
  },
  {
    id: 'border-patrol',
    name: 'Border Patrol Agent',
    philosophy: 'Honor First',
    description: 'Rucking, running, and tactical fitness for border security operations.',
    category_id: 'first_responders',
    focus_areas: ['cardio', 'legs', 'core', 'rucking', 'mental-toughness'],
  },
  {
    id: 'secret-service',
    name: 'Secret Service Agent',
    philosophy: 'Worthy of Trust and Confidence',
    description: 'Elite physical and mental conditioning for protective operations.',
    category_id: 'first_responders',
    focus_areas: ['cardio', 'full-body', 'reaction-time', 'mental-focus', 'endurance'],
  },
  {
    id: 'park-ranger',
    name: 'Park Ranger / Wildlife Officer',
    philosophy: 'Protect and serve the wild',
    description: 'Hiking, rescue readiness, and outdoor fitness for conservation officers.',
    category_id: 'first_responders',
    focus_areas: ['cardio', 'legs', 'core', 'load-carrying', 'endurance', 'flexibility'],
  },

  // ============================================
  // REHABILITATION & RECOVERY (additional)
  // ============================================
  {
    id: 'back-pain-recovery',
    name: 'Back Pain Recovery',
    philosophy: 'Build a bulletproof back',
    description: 'Targeted exercises for lower back pain relief and core stabilization.',
    category_id: 'rehabilitation',
    focus_areas: ['core', 'lower-back', 'hip-mobility', 'glutes', 'flexibility'],
  },
  {
    id: 'shoulder-rehab',
    name: 'Shoulder Rehabilitation',
    philosophy: 'Restore, rebuild, return',
    description: 'Progressive rotator cuff and shoulder stability training.',
    category_id: 'rehabilitation',
    focus_areas: ['shoulders', 'rotator-cuff', 'upper-back', 'posture', 'mobility'],
  },
  {
    id: 'knee-recovery',
    name: 'Knee Recovery',
    philosophy: 'Step by step to strength',
    description: 'Quad and glute strengthening for ACL, meniscus, or general knee issues.',
    category_id: 'rehabilitation',
    focus_areas: ['quadriceps', 'glutes', 'hamstrings', 'balance', 'mobility'],
  },
  {
    id: 'cardiac-rehab',
    name: 'Cardiac Rehabilitation',
    philosophy: 'Heart strong',
    description: 'Safe, progressive exercise after cardiac events. Build cardiovascular health.',
    category_id: 'rehabilitation',
    focus_areas: ['cardio', 'low-impact', 'walking', 'stress-reduction', 'lifestyle'],
  },

  // ============================================
  // FUNCTIONAL & LIFESTYLE (additional)
  // ============================================
  {
    id: 'pregnant-fitness',
    name: 'Prenatal Fitness',
    philosophy: 'Strong moms, healthy babies',
    description: 'Safe, effective exercise during pregnancy. Prepare your body for birth.',
    category_id: 'functional',
    focus_areas: ['core', 'pelvic-floor', 'back', 'cardio', 'flexibility', 'balance'],
  },
  {
    id: 'postpartum-recovery',
    name: 'Postpartum Recovery',
    philosophy: 'Reclaim your strength',
    description: 'Safe return to fitness after childbirth. Core restoration and gradual progression.',
    category_id: 'functional',
    focus_areas: ['core', 'pelvic-floor', 'back', 'posture', 'gradual-loading'],
  },
  {
    id: 'desk-warrior',
    name: 'Desk Warrior',
    philosophy: 'Fight the chair',
    description: 'Combat sitting with targeted mobility, posture work, and efficient workouts.',
    category_id: 'functional',
    focus_areas: ['posture', 'hip-mobility', 'core', 'upper-back', 'flexibility'],
  },
  {
    id: 'student-athlete',
    name: 'Student Athlete',
    philosophy: 'Balance the books and the barbell',
    description: 'Efficient training for busy students. Build a foundation for lifelong fitness.',
    category_id: 'functional',
    focus_areas: ['full-body', 'efficiency', 'recovery', 'stress-relief', 'energy'],
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    philosophy: 'Make the most of limited time',
    description: 'Maximize results with minimal sessions. Stay active despite a busy life.',
    category_id: 'functional',
    focus_areas: ['full-body', 'efficiency', 'compound-movements', 'recovery'],
  },
];

// Default levels for new archetypes
const defaultLevels = [
  { level: 1, name: 'Novice', totalTU: 0, description: 'Beginning the journey' },
  { level: 2, name: 'Apprentice', totalTU: 500, description: 'Building foundations' },
  { level: 3, name: 'Intermediate', totalTU: 2000, description: 'Developing skills' },
  { level: 4, name: 'Advanced', totalTU: 5000, description: 'Refining technique' },
  { level: 5, name: 'Expert', totalTU: 10000, description: 'Mastery in progress' },
  { level: 6, name: 'Elite', totalTU: 25000, description: 'Top tier performer' },
  { level: 7, name: 'Legend', totalTU: 50000, description: 'Legendary status achieved' },
];

// Custom level names for specific archetypes
const customLevelNames: Record<string, Array<{ level: number; name: string }>> = {
  boxing: [
    { level: 1, name: 'Prospect' },
    { level: 2, name: 'Contender' },
    { level: 3, name: 'Title Challenger' },
    { level: 4, name: 'Champion' },
    { level: 5, name: 'Unified Champion' },
    { level: 6, name: 'Hall of Famer' },
    { level: 7, name: 'The Greatest' },
  ],
  wrestler: [
    { level: 1, name: 'Freshman' },
    { level: 2, name: 'Varsity' },
    { level: 3, name: 'Conference Placer' },
    { level: 4, name: 'State Qualifier' },
    { level: 5, name: 'All-American' },
    { level: 6, name: 'National Champion' },
    { level: 7, name: 'Olympic Medalist' },
  ],
  mma: [
    { level: 1, name: 'Amateur' },
    { level: 2, name: 'Regional Pro' },
    { level: 3, name: 'Ranked Fighter' },
    { level: 4, name: 'Top 10' },
    { level: 5, name: 'Title Contender' },
    { level: 6, name: 'Champion' },
    { level: 7, name: 'GOAT' },
  ],
  cyclist: [
    { level: 1, name: 'Cat 5' },
    { level: 2, name: 'Cat 4' },
    { level: 3, name: 'Cat 3' },
    { level: 4, name: 'Cat 2' },
    { level: 5, name: 'Cat 1' },
    { level: 6, name: 'Domestic Pro' },
    { level: 7, name: 'WorldTour' },
  ],
  dancer: [
    { level: 1, name: 'Student' },
    { level: 2, name: 'Intermediate' },
    { level: 3, name: 'Advanced' },
    { level: 4, name: 'Pre-Professional' },
    { level: 5, name: 'Company Member' },
    { level: 6, name: 'Soloist' },
    { level: 7, name: 'Principal' },
  ],
  golfer: [
    { level: 1, name: 'Beginner' },
    { level: 2, name: 'High Handicapper' },
    { level: 3, name: 'Mid Handicapper' },
    { level: 4, name: 'Low Handicapper' },
    { level: 5, name: 'Scratch Golfer' },
    { level: 6, name: 'Tour Pro' },
    { level: 7, name: 'Major Champion' },
  ],
  tennis: [
    { level: 1, name: 'NTRP 2.5' },
    { level: 2, name: 'NTRP 3.5' },
    { level: 3, name: 'NTRP 4.5' },
    { level: 4, name: 'NTRP 5.0' },
    { level: 5, name: 'Futures Pro' },
    { level: 6, name: 'ATP/WTA Tour' },
    { level: 7, name: 'Grand Slam Champion' },
  ],
};

export async function migrate(): Promise<void> {
  log.info('Running migration: 118_complete_archetypes');

  // ============================================
  // CONSOLIDATE DUPLICATE CATEGORIES
  // ============================================
  log.info('Consolidating first_responder categories...');

  // Update any archetypes using 'first_responder' to use 'first_responders'
  await db.query(`
    UPDATE identities
    SET category_id = 'first_responders'
    WHERE category_id = 'first_responder'
  `);

  // Update virtual_hangout_themes to use first_responders
  await db.query(`
    UPDATE virtual_hangout_themes
    SET archetype_category_id = 'first_responders'
    WHERE archetype_category_id = 'first_responder'
  `);

  // Update any other tables that might reference first_responder
  // Check for archetype_communities
  await db.query(`
    UPDATE archetype_communities
    SET category_id = 'first_responders'
    WHERE category_id = 'first_responder'
  `).catch(() => { /* table may not exist */ });

  // Update the 'first_responders' category to have the correct display_order
  await db.query(`
    UPDATE identity_categories
    SET display_order = 7, icon = 'shield-check'
    WHERE id = 'first_responders'
  `);

  // Delete the duplicate 'first_responder' category if it exists
  await db.query(`
    DELETE FROM identity_categories WHERE id = 'first_responder'
  `).catch(() => { /* may already be deleted or have other refs */ });

  // ============================================
  // ADD NEW ARCHETYPES
  // ============================================
  log.info('Adding new archetypes...');

  let insertedCount = 0;
  for (const archetype of newArchetypes) {
    try {
      await db.query(
        `
        INSERT INTO identities (id, name, philosophy, description, category_id, focus_areas)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          philosophy = EXCLUDED.philosophy,
          description = EXCLUDED.description,
          category_id = EXCLUDED.category_id,
          focus_areas = EXCLUDED.focus_areas
      `,
        [
          archetype.id,
          archetype.name,
          archetype.philosophy,
          archetype.description,
          archetype.category_id,
          JSON.stringify(archetype.focus_areas),
        ]
      );
      insertedCount++;
    } catch (error) {
      log.warn(`Failed to insert archetype ${archetype.id}: ${error}`);
    }
  }

  log.info(`Upserted ${insertedCount} new archetypes`);

  // ============================================
  // ADD LEVELS FOR NEW ARCHETYPES
  // ============================================
  log.info('Adding levels for new archetypes...');

  let levelsInserted = 0;
  for (const archetype of newArchetypes) {
    const customLevels = customLevelNames[archetype.id];

    for (const level of defaultLevels) {
      const customName = customLevels?.find((l) => l.level === level.level)?.name || level.name;

      try {
        await db.query(
          `
          INSERT INTO identity_levels (identity_id, level, name, total_tu, description, muscle_targets)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (identity_id, level) DO UPDATE SET
            name = EXCLUDED.name,
            total_tu = EXCLUDED.total_tu,
            description = EXCLUDED.description
        `,
          [archetype.id, level.level, customName, level.totalTU, level.description, '{}']
        );
        levelsInserted++;
      } catch (error) {
        log.warn(`Failed to insert level for ${archetype.id}: ${error}`);
      }
    }
  }

  log.info(`Inserted ${levelsInserted} archetype levels`);

  // ============================================
  // ADD MISSING LEVELS FOR EXISTING ARCHETYPES
  // ============================================
  log.info('Adding missing levels 6-7 for existing archetypes...');

  const existingArchetypesResult = await db.query<{ id: string }>(
    `SELECT id FROM identities WHERE id NOT IN (${newArchetypes.map((a) => `'${a.id}'`).join(', ')})`
  );

  for (const arch of existingArchetypesResult.rows) {
    for (const level of [
      { level: 6, name: 'Elite', totalTU: 25000, description: 'Top tier performer' },
      { level: 7, name: 'Legend', totalTU: 50000, description: 'Legendary status achieved' },
    ]) {
      await db.query(
        `
        INSERT INTO identity_levels (identity_id, level, name, total_tu, description, muscle_targets)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (identity_id, level) DO NOTHING
      `,
        [arch.id, level.level, level.name, level.totalTU, level.description, '{}']
      );
    }
  }

  log.info('Migration 118_complete_archetypes complete');
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 118_complete_archetypes');

  const newArchetypeIds = newArchetypes.map((a) => a.id);

  // Remove levels for new archetypes
  await db.query(`DELETE FROM identity_levels WHERE identity_id = ANY($1)`, [newArchetypeIds]);

  // Remove new archetypes
  await db.query(`DELETE FROM identities WHERE id = ANY($1)`, [newArchetypeIds]);

  // Remove levels 6-7 that were added to existing archetypes
  await db.query(`DELETE FROM identity_levels WHERE level > 5`);

  log.info('Rollback 118_complete_archetypes complete');
}

export const up = migrate;
export const down = rollback;
