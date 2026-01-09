/**
 * Migration: Skill Progression Trees
 *
 * Adds support for gymnastics/calisthenics skill progression tracking.
 * Users can track their progress toward advanced bodyweight skills like:
 * - Handstands, HSPU, One-arm handstand
 * - Planche, Front/Back Lever
 * - Muscle-ups, One-arm pull-ups
 * - Iron Cross, Human Flag
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Running migration: 043_skill_progression_trees');

  // Check if tables already exist
  const tableCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_name = 'skill_trees'
  `);

  if (tableCheck && parseInt(tableCheck.count) > 0) {
    log.info('Skill progression tables already exist, skipping creation...');
  } else {
    log.info('Creating skill progression tables...');

    // Skill tree categories
    await db.query(`
      CREATE TABLE skill_trees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL, -- handstands, straight_arm, pulling, pushing, dynamic, rings, core
        icon TEXT,
        color TEXT, -- gradient color for UI
        order_index INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Individual skills within trees
    await db.query(`
      CREATE TABLE skill_nodes (
        id TEXT PRIMARY KEY,
        tree_id TEXT NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),

        -- Prerequisites (other skill_node ids that must be achieved first)
        prerequisites TEXT[] DEFAULT '{}',

        -- Achievement criteria
        criteria_type TEXT NOT NULL, -- hold, reps, time, form_check
        criteria_value INT, -- e.g., 30 seconds, 5 reps
        criteria_description TEXT, -- human-readable criteria

        -- Rewards
        xp_reward INT DEFAULT 100,
        credit_reward INT DEFAULT 50,
        achievement_id TEXT, -- links to achievement system

        -- Visual/educational content
        video_url TEXT,
        thumbnail_url TEXT,
        tips TEXT[] DEFAULT '{}',
        common_mistakes TEXT[] DEFAULT '{}',

        -- Positioning in tree visualization
        tier INT DEFAULT 1, -- vertical level in tree (1 = foundation)
        position INT DEFAULT 0, -- horizontal position within tier

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // User progress on skills
    await db.query(`
      CREATE TABLE user_skill_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_node_id TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,

        status TEXT NOT NULL DEFAULT 'locked', -- locked, available, in_progress, achieved

        -- Progress tracking
        best_value INT, -- best attempt value (seconds held, reps done)
        attempt_count INT DEFAULT 0,
        practice_minutes INT DEFAULT 0, -- total practice time

        -- Achievement data
        achieved_at TIMESTAMPTZ,
        verified BOOLEAN DEFAULT FALSE,
        verification_video_url TEXT,

        -- Notes
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(user_id, skill_node_id)
      )
    `);

    // Skill practice logs
    await db.query(`
      CREATE TABLE skill_practice_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_node_id TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,

        practice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        duration_minutes INT NOT NULL,
        value_achieved INT, -- reps or seconds achieved in session
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.query(`
      CREATE INDEX idx_skill_nodes_tree ON skill_nodes(tree_id);
      CREATE INDEX idx_user_skill_progress_user ON user_skill_progress(user_id);
      CREATE INDEX idx_user_skill_progress_skill ON user_skill_progress(skill_node_id);
      CREATE INDEX idx_user_skill_progress_status ON user_skill_progress(status);
      CREATE INDEX idx_skill_practice_logs_user ON skill_practice_logs(user_id);
      CREATE INDEX idx_skill_practice_logs_date ON skill_practice_logs(practice_date);
    `);

    log.info('Skill progression tables created');
  }

  // Seed skill trees data
  await seedSkillTrees();

  // Add earning rule for skill achievements
  await seedSkillEarningRule();

  log.info('Migration 043_skill_progression_trees complete');
}

async function seedSkillEarningRule(): Promise<void> {
  // Check if earning_rules table exists (from credits economy migration)
  const tableCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_name = 'earning_rules'
  `);

  if (!tableCheck || parseInt(tableCheck.count) === 0) {
    log.info('earning_rules table not found, skipping skill earning rule seed');
    return;
  }

  // Check if rule already exists
  const ruleCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM earning_rules WHERE code = 'skill_unlock'
  `);

  if (ruleCheck && parseInt(ruleCheck.count) > 0) {
    log.info('skill_unlock earning rule already exists');
    return;
  }

  log.info('Adding skill_unlock earning rule...');
  await db.query(`
    INSERT INTO earning_rules (code, name, category, credits_base, xp_base, description)
    VALUES ('skill_unlock', 'Skill Unlocked', 'special', 50, 100, 'Unlock a gymnastics/calisthenics skill')
    ON CONFLICT (code) DO NOTHING
  `);
}

async function seedSkillTrees(): Promise<void> {
  // Check if already seeded
  const treeCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM skill_trees
  `);

  if (treeCheck && parseInt(treeCheck.count) > 0) {
    log.info('Skill trees already seeded, skipping...');
    return;
  }

  log.info('Seeding skill trees...');

  // Insert skill tree categories
  const trees = [
    { id: 'handstands', name: 'Handstands & Inversions', description: 'Master balance upside down', category: 'handstands', icon: '🤸', color: 'from-purple-500 to-pink-500', order_index: 1 },
    { id: 'straight-arm', name: 'Straight-Arm Strength', description: 'Planche, levers, and gymnast strength', category: 'straight_arm', icon: '💪', color: 'from-red-500 to-orange-500', order_index: 2 },
    { id: 'pulling', name: 'Pulling Power', description: 'Pull-ups to one-arm mastery', category: 'pulling', icon: '🧗', color: 'from-blue-500 to-cyan-500', order_index: 3 },
    { id: 'pushing', name: 'Pushing Power', description: 'Dips, ring work, and pressing', category: 'pushing', icon: '🏋️', color: 'from-green-500 to-teal-500', order_index: 4 },
    { id: 'core', name: 'Core & Compression', description: 'L-sits, V-sits, and manna', category: 'core', icon: '🎯', color: 'from-yellow-500 to-amber-500', order_index: 5 },
    { id: 'rings', name: 'Rings Mastery', description: 'Iron cross and ring skills', category: 'rings', icon: '⭕', color: 'from-violet-500 to-indigo-500', order_index: 6 },
    { id: 'dynamic', name: 'Dynamic Skills', description: 'Flips, kip-ups, and tumbling', category: 'dynamic', icon: '🔄', color: 'from-pink-500 to-rose-500', order_index: 7 },
  ];

  for (const tree of trees) {
    await db.query(`
      INSERT INTO skill_trees (id, name, description, category, icon, color, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [tree.id, tree.name, tree.description, tree.category, tree.icon, tree.color, tree.order_index]);
  }

  // Seed skill nodes for each tree
  const skills = [
    // HANDSTANDS TREE
    { id: 'wall-hs', tree_id: 'handstands', name: 'Wall Handstand', description: 'Face-to-wall or back-to-wall handstand hold', difficulty: 1, criteria_type: 'hold', criteria_value: 60, criteria_description: 'Hold for 60 seconds', xp_reward: 50, credit_reward: 25, tips: ['Keep arms locked', 'Push through shoulders', 'Squeeze core tight'], tier: 1, position: 0 },
    { id: 'freestanding-hs', tree_id: 'handstands', name: 'Freestanding Handstand', description: 'Balance without wall support', difficulty: 2, criteria_type: 'hold', criteria_value: 30, criteria_description: 'Hold for 30 seconds', prerequisites: ['wall-hs'], xp_reward: 100, credit_reward: 50, tips: ['Start with kick-ups', 'Practice bail techniques', 'Focus on hand corrections'], tier: 2, position: 0 },
    { id: 'hspu-wall', tree_id: 'handstands', name: 'Wall HSPU', description: 'Handstand push-up against wall', difficulty: 2, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 strict reps', prerequisites: ['wall-hs'], xp_reward: 100, credit_reward: 50, tips: ['Control the descent', 'Keep elbows at 45 degrees'], tier: 2, position: 1 },
    { id: 'hspu-freestanding', tree_id: 'handstands', name: 'Freestanding HSPU', description: 'Handstand push-up without wall', difficulty: 4, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 strict reps', prerequisites: ['freestanding-hs', 'hspu-wall'], xp_reward: 250, credit_reward: 100, tips: ['Master balance first', 'Use parallettes for stability'], tier: 3, position: 0 },
    { id: 'hs-walk', tree_id: 'handstands', name: 'Handstand Walk', description: 'Walk on hands for distance', difficulty: 3, criteria_type: 'time', criteria_value: 20, criteria_description: 'Walk 20 feet continuously', prerequisites: ['freestanding-hs'], xp_reward: 150, credit_reward: 75, tips: ['Lean forward slightly', 'Small hand steps'], tier: 3, position: 1 },
    { id: 'press-to-hs', tree_id: 'handstands', name: 'Press to Handstand', description: 'Press from standing to handstand without jump', difficulty: 4, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 clean presses', prerequisites: ['freestanding-hs'], xp_reward: 250, credit_reward: 100, tips: ['Start with straddle press', 'Build shoulder strength'], tier: 4, position: 0 },
    { id: 'one-arm-hs', tree_id: 'handstands', name: 'One-Arm Handstand', description: 'Balance on single hand', difficulty: 5, criteria_type: 'hold', criteria_value: 10, criteria_description: 'Hold for 10 seconds', prerequisites: ['freestanding-hs', 'press-to-hs'], xp_reward: 500, credit_reward: 200, tips: ['Years of practice needed', 'Work hip shift technique'], tier: 5, position: 0 },

    // STRAIGHT-ARM STRENGTH TREE
    { id: 'frog-stand', tree_id: 'straight-arm', name: 'Frog Stand', description: 'Knees on elbows balance', difficulty: 1, criteria_type: 'hold', criteria_value: 30, criteria_description: 'Hold for 30 seconds', xp_reward: 50, credit_reward: 25, tips: ['Lean forward', 'Look at floor ahead'], tier: 1, position: 0 },
    { id: 'crow-pose', tree_id: 'straight-arm', name: 'Crow Pose', description: 'Knees on triceps balance', difficulty: 1, criteria_type: 'hold', criteria_value: 30, criteria_description: 'Hold for 30 seconds', xp_reward: 50, credit_reward: 25, tips: ['Start low to ground', 'Engage core'], tier: 1, position: 1 },
    { id: 'tuck-planche', tree_id: 'straight-arm', name: 'Tuck Planche', description: 'Tucked planche hold', difficulty: 3, criteria_type: 'hold', criteria_value: 15, criteria_description: 'Hold for 15 seconds', prerequisites: ['frog-stand', 'crow-pose'], xp_reward: 150, credit_reward: 75, tips: ['Protract shoulders hard', 'Lean forward significantly'], tier: 2, position: 0 },
    { id: 'adv-tuck-planche', tree_id: 'straight-arm', name: 'Advanced Tuck Planche', description: 'Back parallel, knees tucked', difficulty: 3, criteria_type: 'hold', criteria_value: 10, criteria_description: 'Hold for 10 seconds', prerequisites: ['tuck-planche'], xp_reward: 175, credit_reward: 80, tips: ['Open hip angle slightly', 'Keep protraction'], tier: 3, position: 0 },
    { id: 'straddle-planche', tree_id: 'straight-arm', name: 'Straddle Planche', description: 'Legs extended and straddled', difficulty: 4, criteria_type: 'hold', criteria_value: 5, criteria_description: 'Hold for 5 seconds', prerequisites: ['adv-tuck-planche'], xp_reward: 300, credit_reward: 125, tips: ['Flexibility helps', 'Point toes'], tier: 4, position: 0 },
    { id: 'full-planche', tree_id: 'straight-arm', name: 'Full Planche', description: 'Legs together, body parallel', difficulty: 5, criteria_type: 'hold', criteria_value: 3, criteria_description: 'Hold for 3 seconds', prerequisites: ['straddle-planche'], xp_reward: 500, credit_reward: 200, tips: ['Elite level skill', 'May take years'], tier: 5, position: 0 },
    { id: 'tuck-fl', tree_id: 'straight-arm', name: 'Tuck Front Lever', description: 'Horizontal hang with tucked legs', difficulty: 2, criteria_type: 'hold', criteria_value: 15, criteria_description: 'Hold for 15 seconds', xp_reward: 100, credit_reward: 50, tips: ['Squeeze lats hard', 'Posterior pelvic tilt'], tier: 2, position: 1 },
    { id: 'adv-tuck-fl', tree_id: 'straight-arm', name: 'Advanced Tuck FL', description: 'Straightened back front lever', difficulty: 3, criteria_type: 'hold', criteria_value: 10, criteria_description: 'Hold for 10 seconds', prerequisites: ['tuck-fl'], xp_reward: 150, credit_reward: 75, tips: ['Keep hips up', 'Depress shoulders'], tier: 3, position: 1 },
    { id: 'straddle-fl', tree_id: 'straight-arm', name: 'Straddle Front Lever', description: 'Legs out in straddle', difficulty: 4, criteria_type: 'hold', criteria_value: 5, criteria_description: 'Hold for 5 seconds', prerequisites: ['adv-tuck-fl'], xp_reward: 250, credit_reward: 100, tips: ['Stay horizontal', 'Active shoulders'], tier: 4, position: 1 },
    { id: 'full-fl', tree_id: 'straight-arm', name: 'Full Front Lever', description: 'Legs together, body horizontal', difficulty: 5, criteria_type: 'hold', criteria_value: 5, criteria_description: 'Hold for 5 seconds', prerequisites: ['straddle-fl'], xp_reward: 400, credit_reward: 175, tips: ['Point toes', 'Full body tension'], tier: 5, position: 1 },
    { id: 'back-lever', tree_id: 'straight-arm', name: 'Back Lever', description: 'Inverted horizontal hold', difficulty: 3, criteria_type: 'hold', criteria_value: 10, criteria_description: 'Hold for 10 seconds', prerequisites: ['tuck-fl'], xp_reward: 175, credit_reward: 80, tips: ['Go through skin-the-cat', 'Protect shoulders'], tier: 3, position: 2 },

    // PULLING TREE
    { id: 'pullup-strict', tree_id: 'pulling', name: 'Strict Pull-Up', description: 'Dead hang to chin over bar', difficulty: 1, criteria_type: 'reps', criteria_value: 10, criteria_description: 'Complete 10 strict reps', xp_reward: 50, credit_reward: 25, tips: ['Full range of motion', 'No kipping'], tier: 1, position: 0 },
    { id: 'chinup-strict', tree_id: 'pulling', name: 'Strict Chin-Up', description: 'Supinated grip pull-up', difficulty: 1, criteria_type: 'reps', criteria_value: 10, criteria_description: 'Complete 10 strict reps', xp_reward: 50, credit_reward: 25, tips: ['Bicep emphasis', 'Full extension at bottom'], tier: 1, position: 1 },
    { id: 'chest-to-bar', tree_id: 'pulling', name: 'Chest-to-Bar Pull-Up', description: 'Pull until chest touches bar', difficulty: 2, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 strict reps', prerequisites: ['pullup-strict'], xp_reward: 100, credit_reward: 50, tips: ['Think about pulling bar to hips', 'Full scapular retraction'], tier: 2, position: 0 },
    { id: 'typewriter-pu', tree_id: 'pulling', name: 'Typewriter Pull-Up', description: 'Side-to-side at top of pull-up', difficulty: 3, criteria_type: 'reps', criteria_value: 6, criteria_description: 'Complete 3 per side', prerequisites: ['chest-to-bar'], xp_reward: 150, credit_reward: 75, tips: ['Stay at top position', 'Controlled movement'], tier: 3, position: 0 },
    { id: 'archer-pu', tree_id: 'pulling', name: 'Archer Pull-Up', description: 'One arm assists minimally', difficulty: 3, criteria_type: 'reps', criteria_value: 6, criteria_description: 'Complete 3 per side', prerequisites: ['chest-to-bar'], xp_reward: 150, credit_reward: 75, tips: ['Keep assist arm straight', 'Progress to less assistance'], tier: 3, position: 1 },
    { id: 'muscle-up-bar', tree_id: 'pulling', name: 'Bar Muscle-Up', description: 'Pull-up transitioning to dip', difficulty: 3, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 strict reps', prerequisites: ['chest-to-bar'], xp_reward: 200, credit_reward: 100, tips: ['Explosive pull', 'Learn the transition'], tier: 3, position: 2 },
    { id: 'weighted-pu', tree_id: 'pulling', name: 'Weighted Pull-Up (+50%BW)', description: 'Pull-up with 50% bodyweight added', difficulty: 3, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 reps at +50% BW', prerequisites: ['pullup-strict'], xp_reward: 175, credit_reward: 80, tips: ['Progress gradually', 'Perfect form always'], tier: 2, position: 1 },
    { id: 'one-arm-pu', tree_id: 'pulling', name: 'One-Arm Pull-Up', description: 'Single arm from dead hang', difficulty: 5, criteria_type: 'reps', criteria_value: 1, criteria_description: 'Complete 1 clean rep each arm', prerequisites: ['archer-pu', 'weighted-pu'], xp_reward: 500, credit_reward: 200, tips: ['Years of training', 'Elbow tendon health critical'], tier: 5, position: 0 },

    // PUSHING TREE
    { id: 'dip-strict', tree_id: 'pushing', name: 'Strict Dip', description: 'Parallel bar dip', difficulty: 1, criteria_type: 'reps', criteria_value: 15, criteria_description: 'Complete 15 strict reps', xp_reward: 50, credit_reward: 25, tips: ['Control the descent', 'Full lockout at top'], tier: 1, position: 0 },
    { id: 'ring-support', tree_id: 'pushing', name: 'Ring Support Hold', description: 'Hold support on rings', difficulty: 2, criteria_type: 'hold', criteria_value: 30, criteria_description: 'Hold for 30 seconds with turnout', prerequisites: ['dip-strict'], xp_reward: 100, credit_reward: 50, tips: ['Turn rings out (RTO)', 'Depress shoulders'], tier: 2, position: 0 },
    { id: 'ring-dip', tree_id: 'pushing', name: 'Ring Dip', description: 'Dip on gymnastic rings', difficulty: 2, criteria_type: 'reps', criteria_value: 10, criteria_description: 'Complete 10 strict reps', prerequisites: ['ring-support'], xp_reward: 125, credit_reward: 60, tips: ['Stable rings', 'Deep range of motion'], tier: 3, position: 0 },
    { id: 'ring-mu', tree_id: 'pushing', name: 'Ring Muscle-Up', description: 'False grip muscle-up on rings', difficulty: 4, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 strict reps', prerequisites: ['ring-dip', 'muscle-up-bar'], xp_reward: 300, credit_reward: 125, tips: ['False grip essential', 'Transition through'], tier: 4, position: 0 },
    { id: 'korean-dip', tree_id: 'pushing', name: 'Korean Dip', description: 'Dip with bar behind you', difficulty: 3, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 reps', prerequisites: ['dip-strict'], xp_reward: 150, credit_reward: 75, tips: ['Shoulder flexibility needed', 'Start shallow'], tier: 2, position: 1 },

    // CORE TREE
    { id: 'l-sit-floor', tree_id: 'core', name: 'Floor L-Sit', description: 'L-sit on floor or parallettes', difficulty: 2, criteria_type: 'hold', criteria_value: 20, criteria_description: 'Hold for 20 seconds', xp_reward: 100, credit_reward: 50, tips: ['Push floor away', 'Point toes'], tier: 1, position: 0 },
    { id: 'l-sit-hang', tree_id: 'core', name: 'Hanging L-Sit', description: 'L-sit while hanging from bar', difficulty: 2, criteria_type: 'hold', criteria_value: 15, criteria_description: 'Hold for 15 seconds', xp_reward: 100, credit_reward: 50, tips: ['Active shoulders', 'Legs parallel to floor'], tier: 1, position: 1 },
    { id: 'v-sit', tree_id: 'core', name: 'V-Sit', description: 'Legs above horizontal', difficulty: 3, criteria_type: 'hold', criteria_value: 10, criteria_description: 'Hold for 10 seconds', prerequisites: ['l-sit-floor'], xp_reward: 175, credit_reward: 80, tips: ['Compression strength', 'Hip flexor development'], tier: 2, position: 0 },
    { id: 'manna', tree_id: 'core', name: 'Manna', description: 'Legs behind you at shoulder height', difficulty: 5, criteria_type: 'hold', criteria_value: 3, criteria_description: 'Hold for 3 seconds', prerequisites: ['v-sit'], xp_reward: 500, credit_reward: 200, tips: ['Elite skill', 'Extreme shoulder extension'], tier: 3, position: 0 },
    { id: 'dragon-flag', tree_id: 'core', name: 'Dragon Flag', description: 'Horizontal body lever', difficulty: 3, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 strict reps', xp_reward: 150, credit_reward: 75, tips: ['Keep body straight', 'Control the negative'], tier: 2, position: 1 },
    { id: 'ab-wheel', tree_id: 'core', name: 'Standing Ab Wheel', description: 'Full rollout from standing', difficulty: 3, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 reps', xp_reward: 150, credit_reward: 75, tips: ['Start from knees', 'Hollow body position'], tier: 2, position: 2 },

    // RINGS MASTERY TREE
    { id: 'skin-cat', tree_id: 'rings', name: 'Skin the Cat', description: 'Rotate through hang positions', difficulty: 2, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 controlled reps', xp_reward: 100, credit_reward: 50, tips: ['Go slow', 'Shoulder mobility needed'], tier: 1, position: 0 },
    { id: 'ring-hs', tree_id: 'rings', name: 'Ring Handstand', description: 'Handstand on rings', difficulty: 4, criteria_type: 'hold', criteria_value: 10, criteria_description: 'Hold for 10 seconds', prerequisites: ['ring-support', 'freestanding-hs'], xp_reward: 300, credit_reward: 125, tips: ['Extremely difficult', 'Master rings and HS first'], tier: 3, position: 0 },
    { id: 'iron-cross', tree_id: 'rings', name: 'Iron Cross', description: 'Arms out horizontal on rings', difficulty: 5, criteria_type: 'hold', criteria_value: 3, criteria_description: 'Hold for 3 seconds', prerequisites: ['ring-mu'], xp_reward: 500, credit_reward: 200, tips: ['Elite gymnast skill', 'Years of ring training'], tier: 4, position: 0 },

    // DYNAMIC SKILLS TREE
    { id: 'kip-up', tree_id: 'dynamic', name: 'Kip-Up', description: 'Explosive floor-to-feet', difficulty: 2, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 clean reps', xp_reward: 100, credit_reward: 50, tips: ['Hip pop timing', 'Practice on soft surface'], tier: 1, position: 0 },
    { id: 'macaco', tree_id: 'dynamic', name: 'Macaco', description: 'One-handed back walkover', difficulty: 3, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 each side', prerequisites: ['kip-up'], xp_reward: 150, credit_reward: 75, tips: ['Capoeira move', 'Look where you land'], tier: 2, position: 0 },
    { id: 'cartwheel', tree_id: 'dynamic', name: 'Cartwheel', description: 'Side rotation through handstand', difficulty: 1, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 each direction', xp_reward: 50, credit_reward: 25, tips: ['Hands in line', 'Keep arms straight'], tier: 1, position: 1 },
    { id: 'roundoff', tree_id: 'dynamic', name: 'Roundoff', description: 'Cartwheel with 1/4 turn', difficulty: 2, criteria_type: 'reps', criteria_value: 5, criteria_description: 'Complete 5 clean reps', prerequisites: ['cartwheel'], xp_reward: 100, credit_reward: 50, tips: ['Snap legs together', 'Land facing start'], tier: 2, position: 1 },
    { id: 'back-handspring', tree_id: 'dynamic', name: 'Back Handspring', description: 'Backward flip through handstand', difficulty: 3, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 without spot', prerequisites: ['roundoff'], xp_reward: 200, credit_reward: 100, tips: ['Learn with spot first', 'Sit back, not up'], tier: 3, position: 0 },
    { id: 'standing-back-tuck', tree_id: 'dynamic', name: 'Standing Back Tuck', description: 'Standing backflip', difficulty: 4, criteria_type: 'reps', criteria_value: 3, criteria_description: 'Complete 3 without spot', prerequisites: ['back-handspring'], xp_reward: 300, credit_reward: 125, tips: ['Jump UP not back', 'Tuck tight'], tier: 4, position: 0 },
  ];

  for (const skill of skills) {
    await db.query(`
      INSERT INTO skill_nodes (
        id, tree_id, name, description, difficulty,
        prerequisites, criteria_type, criteria_value, criteria_description,
        xp_reward, credit_reward, tips, tier, position
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING
    `, [
      skill.id, skill.tree_id, skill.name, skill.description, skill.difficulty,
      skill.prerequisites || [], skill.criteria_type, skill.criteria_value, skill.criteria_description,
      skill.xp_reward, skill.credit_reward, skill.tips || [], skill.tier, skill.position
    ]);
  }

  log.info(`Seeded ${skills.length} skill nodes across ${trees.length} skill trees`);
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 043_skill_progression_trees');

  await db.query('DROP TABLE IF EXISTS skill_practice_logs CASCADE');
  await db.query('DROP TABLE IF EXISTS user_skill_progress CASCADE');
  await db.query('DROP TABLE IF EXISTS skill_nodes CASCADE');
  await db.query('DROP TABLE IF EXISTS skill_trees CASCADE');

  log.info('Rollback 043_skill_progression_trees complete');
}
