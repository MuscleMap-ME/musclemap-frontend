// DESTRUCTIVE: Schema modification for skill progressions - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Skill Progressions System
 *
 * Creates tables for calisthenics skill progression trees
 * including planche, front lever, muscle-up, handstand, etc.
 * Based on gymnastics and calisthenics training methodology.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 082_skill_progressions');

  // ============================================
  // SKILL PROGRESSIONS TABLE
  // ============================================
  if (!(await tableExists('skill_progressions'))) {
    log.info('Creating skill_progressions table...');
    await db.query(`
      CREATE TABLE skill_progressions (
        id TEXT PRIMARY KEY DEFAULT 'sp_' || replace(gen_random_uuid()::text, '-', ''),
        skill_name TEXT NOT NULL,
        level INT NOT NULL,
        level_name TEXT NOT NULL,
        exercise_id TEXT,
        target_metric TEXT NOT NULL,
        target_value FLOAT NOT NULL,
        prerequisites JSONB DEFAULT '[]',
        estimated_weeks INT,
        tips TEXT[],
        common_mistakes TEXT[],
        video_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(skill_name, level)
      )
    `);

    await db.query('CREATE INDEX idx_skill_progressions_skill ON skill_progressions(skill_name, level)');
    await db.query('CREATE INDEX idx_skill_progressions_name ON skill_progressions(skill_name)');

    log.info('skill_progressions table created');
  }

  // ============================================
  // USER SKILL PROGRESS TABLE
  // ============================================
  if (!(await tableExists('user_skill_progress'))) {
    log.info('Creating user_skill_progress table...');
    await db.query(`
      CREATE TABLE user_skill_progress (
        id TEXT PRIMARY KEY DEFAULT 'usp_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_progression_id TEXT NOT NULL REFERENCES skill_progressions(id),
        current_value FLOAT,
        best_value FLOAT,
        attempts INT DEFAULT 0,
        first_achieved_at TIMESTAMPTZ,
        last_tested_at TIMESTAMPTZ,
        status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'achieved')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, skill_progression_id)
      )
    `);

    await db.query('CREATE INDEX idx_user_skill_progress_user ON user_skill_progress(user_id)');
    await db.query('CREATE INDEX idx_user_skill_progress_status ON user_skill_progress(user_id, status)');

    log.info('user_skill_progress table created');
  }

  // ============================================
  // SEED SKILL PROGRESSIONS
  // ============================================
  log.info('Seeding skill progressions...');

  const skillProgressions = [
    // ==========================================
    // FRONT LEVER PROGRESSION (5 levels)
    // ==========================================
    {
      skill_name: 'front_lever',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'bw-pullup',
      target_metric: 'reps',
      target_value: 10,
      estimated_weeks: 0,
      tips: ['Build pulling strength foundation', 'Master dead hang for 60 seconds', 'Work on active hang (scapular depression)'],
      common_mistakes: ['Skipping prerequisite strength', 'Using momentum', 'Not engaging lats'],
    },
    {
      skill_name: 'front_lever',
      level: 1,
      level_name: 'Tuck Front Lever',
      exercise_id: 'tuck_front_lever',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 4,
      tips: ['Keep hips at bar height', 'Depress and retract scapula', 'Squeeze glutes', 'Keep core tight'],
      common_mistakes: ['Hips too low', 'Bent arms', 'Rounded upper back', 'Forgetting to breathe'],
    },
    {
      skill_name: 'front_lever',
      level: 2,
      level_name: 'Advanced Tuck Front Lever',
      exercise_id: 'advanced_tuck_front_lever',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 8,
      tips: ['Extend hips further from bar', 'Keep knees pulled to chest less', 'Focus on straight line from shoulders to hips'],
      common_mistakes: ['Piking at hips', 'Not fully extending from tuck', 'Losing scapular depression'],
    },
    {
      skill_name: 'front_lever',
      level: 3,
      level_name: 'Half Lay / One Leg Front Lever',
      exercise_id: 'one_leg_front_lever',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 8,
      tips: ['Extend one leg fully', 'Alternate legs for balance', 'Work both sides equally'],
      common_mistakes: ['Extended leg dropping', 'Twisting to one side', 'Losing body tension'],
    },
    {
      skill_name: 'front_lever',
      level: 4,
      level_name: 'Straddle Front Lever',
      exercise_id: 'straddle_front_lever',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 12,
      tips: ['Wide straddle reduces lever', 'Keep legs straight', 'Point toes', 'Maintain horizontal body'],
      common_mistakes: ['Hips dropping', 'Legs bending', 'Straddle too narrow'],
    },
    {
      skill_name: 'front_lever',
      level: 5,
      level_name: 'Full Front Lever',
      exercise_id: 'full_front_lever',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 16,
      tips: ['Ultimate goal - full body horizontal', 'Legs together and straight', 'Total body tension', 'Consistent practice'],
      common_mistakes: ['Rushing progression', 'Hips sagging', 'Arching back'],
    },

    // ==========================================
    // PLANCHE PROGRESSION (6 levels)
    // ==========================================
    {
      skill_name: 'planche',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'bw-pushup',
      target_metric: 'reps',
      target_value: 30,
      estimated_weeks: 0,
      tips: ['Build pushing strength', 'Master pseudo planche push-ups', 'Work on planche lean holds'],
      common_mistakes: ['Weak wrists', 'Poor scapular protraction', 'Insufficient shoulder strength'],
    },
    {
      skill_name: 'planche',
      level: 1,
      level_name: 'Planche Lean',
      exercise_id: 'planche_lean',
      target_metric: 'duration_seconds',
      target_value: 30,
      estimated_weeks: 4,
      tips: ['Start with 15-20 degree lean', 'Keep arms locked', 'Protract scapula hard', 'Hands turned out slightly'],
      common_mistakes: ['Elbows bending', 'Not leaning far enough', 'Losing hollow body'],
    },
    {
      skill_name: 'planche',
      level: 2,
      level_name: 'Tuck Planche',
      exercise_id: 'tuck_planche',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 8,
      tips: ['Knees to chest', 'Shoulders over or past wrists', 'Round upper back (protraction)', 'Look at floor'],
      common_mistakes: ['Shoulders behind wrists', 'Arms bending', 'Hips too high', 'Not tucking tight enough'],
    },
    {
      skill_name: 'planche',
      level: 3,
      level_name: 'Advanced Tuck Planche',
      exercise_id: 'advanced_tuck_planche',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 12,
      tips: ['Flatten back (less rounded)', 'Hips at shoulder height', 'Knees still bent but back straight'],
      common_mistakes: ['Not opening hip angle enough', 'Losing protraction', 'Shoulders moving back'],
    },
    {
      skill_name: 'planche',
      level: 4,
      level_name: 'Straddle Planche',
      exercise_id: 'straddle_planche',
      target_metric: 'duration_seconds',
      target_value: 5,
      estimated_weeks: 20,
      tips: ['Wide straddle helps', 'Straight legs', 'Massive shoulder lean required', 'Point toes'],
      common_mistakes: ['Straddle too narrow', 'Hips dropping', 'Piking', 'Bent arms'],
    },
    {
      skill_name: 'planche',
      level: 5,
      level_name: 'Full Planche',
      exercise_id: 'full_planche',
      target_metric: 'duration_seconds',
      target_value: 3,
      estimated_weeks: 52,
      tips: ['Lifetime achievement', 'Legs together', 'Perfect body line', 'Extreme shoulder strength required'],
      common_mistakes: ['Rushing to this level', 'Poor form from fatigue', 'Inadequate base strength'],
    },

    // ==========================================
    // MUSCLE-UP PROGRESSION (4 levels)
    // ==========================================
    {
      skill_name: 'muscle_up',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'bw-pullup',
      target_metric: 'reps',
      target_value: 15,
      estimated_weeks: 0,
      tips: ['Master pull-ups first', 'Work on explosive pull-ups', 'Practice straight bar dips'],
      common_mistakes: ['Weak pulling strength', 'Poor dip strength', 'Not learning the transition'],
    },
    {
      skill_name: 'muscle_up',
      level: 1,
      level_name: 'High Pull-Up / Chest to Bar',
      exercise_id: 'chest_to_bar_pullup',
      target_metric: 'reps',
      target_value: 10,
      estimated_weeks: 4,
      tips: ['Pull explosively', 'Touch chest or higher to bar', 'Lead with chest, not chin'],
      common_mistakes: ['Pulling to chin only', 'No explosive power', 'Kipping instead of building strength'],
    },
    {
      skill_name: 'muscle_up',
      level: 2,
      level_name: 'Transition Training',
      exercise_id: 'muscle_up_transition',
      target_metric: 'reps',
      target_value: 5,
      estimated_weeks: 4,
      tips: ['Use band assistance', 'Practice on low bar with jump', 'Focus on the lean-over moment'],
      common_mistakes: ['Chicken winging', 'Not leaning over bar', 'Elbows flaring wide'],
    },
    {
      skill_name: 'muscle_up',
      level: 3,
      level_name: 'Kipping Muscle-Up',
      exercise_id: 'kipping_muscle_up',
      target_metric: 'reps',
      target_value: 5,
      estimated_weeks: 4,
      tips: ['Use swing momentum', 'Pull and lean simultaneously', 'Press out to full lockout'],
      common_mistakes: ['Too much kip, not enough pull', 'Stopping at the transition', 'Not locking out top'],
    },
    {
      skill_name: 'muscle_up',
      level: 4,
      level_name: 'Strict Muscle-Up',
      exercise_id: 'strict_muscle_up',
      target_metric: 'reps',
      target_value: 3,
      estimated_weeks: 8,
      tips: ['No swing or kip', 'Pure strength', 'Slow and controlled'],
      common_mistakes: ['Using momentum', 'Poor bar path', 'Weak transition'],
    },

    // ==========================================
    // HANDSTAND PROGRESSION (5 levels)
    // ==========================================
    {
      skill_name: 'handstand',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'bw-pike-pushup',
      target_metric: 'reps',
      target_value: 15,
      estimated_weeks: 0,
      tips: ['Build overhead pressing strength', 'Work on shoulder flexibility', 'Practice crow pose for balance'],
      common_mistakes: ['Poor shoulder flexibility', 'Weak wrists', 'Fear of being inverted'],
    },
    {
      skill_name: 'handstand',
      level: 1,
      level_name: 'Wall Handstand (Chest to Wall)',
      exercise_id: 'chest_to_wall_handstand',
      target_metric: 'duration_seconds',
      target_value: 60,
      estimated_weeks: 4,
      tips: ['Walk feet up wall', 'Chest faces wall', 'Stack shoulders over wrists', 'Squeeze glutes'],
      common_mistakes: ['Too far from wall', 'Banana back', 'Not looking at hands', 'Bent arms'],
    },
    {
      skill_name: 'handstand',
      level: 2,
      level_name: 'Wall Handstand (Back to Wall)',
      exercise_id: 'back_to_wall_handstand',
      target_metric: 'duration_seconds',
      target_value: 60,
      estimated_weeks: 4,
      tips: ['Kick up to wall', 'Only heels touch wall', 'Practice pulling away from wall'],
      common_mistakes: ['Leaning on wall too much', 'Arched back', 'Not practicing balance'],
    },
    {
      skill_name: 'handstand',
      level: 3,
      level_name: 'Freestanding Handstand',
      exercise_id: 'freestanding_handstand',
      target_metric: 'duration_seconds',
      target_value: 30,
      estimated_weeks: 12,
      tips: ['Use finger pressure to balance', 'Keep hollow body', 'Look at hands', 'Kick up consistently'],
      common_mistakes: ['Over-balancing', 'Under-balancing', 'Forgetting to breathe', 'Looking forward'],
    },
    {
      skill_name: 'handstand',
      level: 4,
      level_name: 'Handstand Walking',
      exercise_id: 'handstand_walk',
      target_metric: 'distance_meters',
      target_value: 10,
      estimated_weeks: 8,
      tips: ['Shift weight side to side', 'Take small steps', 'Keep core tight', 'Look at hands'],
      common_mistakes: ['Steps too big', 'Losing hollow body', 'Panicking when moving'],
    },
    {
      skill_name: 'handstand',
      level: 5,
      level_name: 'Press to Handstand',
      exercise_id: 'press_to_handstand',
      target_metric: 'reps',
      target_value: 1,
      estimated_weeks: 24,
      tips: ['Requires extreme flexibility and strength', 'Start with straddle press', 'Pike press is harder'],
      common_mistakes: ['Insufficient hamstring flexibility', 'Jumping instead of pressing', 'Weak shoulders'],
    },

    // ==========================================
    // BACK LEVER PROGRESSION (4 levels)
    // ==========================================
    {
      skill_name: 'back_lever',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'skin_the_cat',
      target_metric: 'reps',
      target_value: 5,
      estimated_weeks: 0,
      tips: ['Master skin the cat', 'Build shoulder flexibility', 'German hang holds'],
      common_mistakes: ['Poor shoulder flexibility', 'Rushing progression', 'Not building base strength'],
    },
    {
      skill_name: 'back_lever',
      level: 1,
      level_name: 'Tuck Back Lever',
      exercise_id: 'tuck_back_lever',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 4,
      tips: ['Inverted hang with knees tucked', 'Depress shoulders', 'Keep arms straight'],
      common_mistakes: ['Bending arms', 'Hips too high', 'Poor shoulder position'],
    },
    {
      skill_name: 'back_lever',
      level: 2,
      level_name: 'Advanced Tuck Back Lever',
      exercise_id: 'advanced_tuck_back_lever',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 6,
      tips: ['Open hip angle more', 'Back approaches horizontal'],
      common_mistakes: ['Losing body tension', 'Rushing to next level'],
    },
    {
      skill_name: 'back_lever',
      level: 3,
      level_name: 'Straddle Back Lever',
      exercise_id: 'straddle_back_lever',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 8,
      tips: ['Wide straddle', 'Straight legs', 'Body horizontal'],
      common_mistakes: ['Legs bending', 'Straddle too narrow', 'Poor shoulder position'],
    },
    {
      skill_name: 'back_lever',
      level: 4,
      level_name: 'Full Back Lever',
      exercise_id: 'full_back_lever',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 12,
      tips: ['Legs together', 'Perfect horizontal line', 'Total body tension'],
      common_mistakes: ['Arching back', 'Hips dropping', 'Bent knees'],
    },

    // ==========================================
    // ONE-ARM PULL-UP PROGRESSION (4 levels)
    // ==========================================
    {
      skill_name: 'one_arm_pullup',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'bw-pullup',
      target_metric: 'reps',
      target_value: 20,
      estimated_weeks: 0,
      tips: ['Massive pulling strength base needed', 'Weighted pull-ups help', 'Work grip strength'],
      common_mistakes: ['Insufficient base strength', 'Poor grip', 'Not training unilaterally'],
    },
    {
      skill_name: 'one_arm_pullup',
      level: 1,
      level_name: 'Archer Pull-Ups',
      exercise_id: 'archer_pullup',
      target_metric: 'reps',
      target_value: 10,
      estimated_weeks: 8,
      tips: ['Shift weight to working arm', 'Assist arm stays straight', 'Alternate sides'],
      common_mistakes: ['Too much assistance', 'Not shifting weight enough', 'Imbalanced training'],
    },
    {
      skill_name: 'one_arm_pullup',
      level: 2,
      level_name: 'One-Arm Negatives',
      exercise_id: 'one_arm_negative',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 8,
      tips: ['Jump or use other arm to get to top', 'Lower as slowly as possible', 'Control entire descent'],
      common_mistakes: ['Dropping too fast', 'Not going full ROM', 'Twisting body'],
    },
    {
      skill_name: 'one_arm_pullup',
      level: 3,
      level_name: 'Assisted One-Arm Pull-Up',
      exercise_id: 'assisted_one_arm_pullup',
      target_metric: 'reps',
      target_value: 5,
      estimated_weeks: 12,
      tips: ['Use towel or band for light assistance', 'Minimal assistance', 'Focus on pulling arm'],
      common_mistakes: ['Too much assistance', 'Not progressively reducing help'],
    },
    {
      skill_name: 'one_arm_pullup',
      level: 4,
      level_name: 'Full One-Arm Pull-Up',
      exercise_id: 'one_arm_pullup',
      target_metric: 'reps',
      target_value: 1,
      estimated_weeks: 24,
      tips: ['Elite level skill', 'Full ROM from dead hang', 'No kipping or assistance'],
      common_mistakes: ['Partial ROM', 'Body rotation', 'Kipping'],
    },

    // ==========================================
    // HUMAN FLAG PROGRESSION (4 levels)
    // ==========================================
    {
      skill_name: 'human_flag',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'side_plank',
      target_metric: 'duration_seconds',
      target_value: 60,
      estimated_weeks: 0,
      tips: ['Build oblique strength', 'Work on shoulder stability', 'Practice clutch flag first'],
      common_mistakes: ['Weak obliques', 'Poor shoulder stability', 'Skipping progressions'],
    },
    {
      skill_name: 'human_flag',
      level: 1,
      level_name: 'Vertical Flag',
      exercise_id: 'vertical_flag',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 4,
      tips: ['Body vertical, feet up', 'Push with bottom arm, pull with top', 'Build grip strength'],
      common_mistakes: ['Bent arms', 'Poor grip placement', 'Body not vertical'],
    },
    {
      skill_name: 'human_flag',
      level: 2,
      level_name: 'Tuck Flag',
      exercise_id: 'tuck_flag',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 6,
      tips: ['Knees tucked to chest', 'Body tilted from vertical', 'Maintain push-pull tension'],
      common_mistakes: ['Losing tension', 'Dropping hips', 'Arms bending'],
    },
    {
      skill_name: 'human_flag',
      level: 3,
      level_name: 'Straddle Flag',
      exercise_id: 'straddle_flag',
      target_metric: 'duration_seconds',
      target_value: 5,
      estimated_weeks: 10,
      tips: ['Wide straddle, straight legs', 'Body approaching horizontal', 'Intense oblique engagement'],
      common_mistakes: ['Straddle too narrow', 'Hips dropping', 'Arms bending'],
    },
    {
      skill_name: 'human_flag',
      level: 4,
      level_name: 'Full Human Flag',
      exercise_id: 'full_human_flag',
      target_metric: 'duration_seconds',
      target_value: 5,
      estimated_weeks: 16,
      tips: ['Legs together, body horizontal', 'Perfect push-pull balance', 'Total body tension'],
      common_mistakes: ['Body not horizontal', 'Legs separating', 'Losing tension'],
    },

    // ==========================================
    // L-SIT PROGRESSION (4 levels)
    // ==========================================
    {
      skill_name: 'l_sit',
      level: 0,
      level_name: 'Prerequisites',
      exercise_id: 'bw-plank',
      target_metric: 'duration_seconds',
      target_value: 60,
      estimated_weeks: 0,
      tips: ['Build core strength', 'Work on hip flexor strength', 'Practice shoulder depression'],
      common_mistakes: ['Weak hip flexors', 'Poor shoulder depression', 'Insufficient core strength'],
    },
    {
      skill_name: 'l_sit',
      level: 1,
      level_name: 'Tuck L-Sit',
      exercise_id: 'tuck_l_sit',
      target_metric: 'duration_seconds',
      target_value: 30,
      estimated_weeks: 4,
      tips: ['Knees bent, feet off ground', 'Push through hands', 'Depress shoulders hard'],
      common_mistakes: ['Rounded shoulders', 'Feet touching ground', 'Bent arms'],
    },
    {
      skill_name: 'l_sit',
      level: 2,
      level_name: 'One Leg Extended L-Sit',
      exercise_id: 'one_leg_l_sit',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 4,
      tips: ['One leg straight, one tucked', 'Alternate legs', 'Point extended toe'],
      common_mistakes: ['Extended leg dropping', 'Losing shoulder depression', 'Bent knee on extended leg'],
    },
    {
      skill_name: 'l_sit',
      level: 3,
      level_name: 'Full L-Sit',
      exercise_id: 'bw-lsit',
      target_metric: 'duration_seconds',
      target_value: 15,
      estimated_weeks: 8,
      tips: ['Both legs straight and together', 'Legs parallel to ground', 'Point toes'],
      common_mistakes: ['Legs below parallel', 'Bent knees', 'Losing shoulder depression'],
    },
    {
      skill_name: 'l_sit',
      level: 4,
      level_name: 'V-Sit',
      exercise_id: 'v_sit',
      target_metric: 'duration_seconds',
      target_value: 10,
      estimated_weeks: 16,
      tips: ['Legs raised above horizontal', 'Extreme hip flexor strength', 'Progression toward manna'],
      common_mistakes: ['Bent legs', 'Rounding back', 'Insufficient hip flexor strength'],
    },
  ];

  for (const prog of skillProgressions) {
    const id = `${prog.skill_name}_level_${prog.level}`;
    await db.query(
      `INSERT INTO skill_progressions (id, skill_name, level, level_name, exercise_id, target_metric, target_value, estimated_weeks, tips, common_mistakes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (skill_name, level) DO UPDATE SET
         level_name = $4, exercise_id = $5, target_metric = $6, target_value = $7,
         estimated_weeks = $8, tips = $9, common_mistakes = $10`,
      [
        id, prog.skill_name, prog.level, prog.level_name,
        prog.exercise_id, prog.target_metric, prog.target_value,
        prog.estimated_weeks, prog.tips, prog.common_mistakes,
      ]
    );
  }

  log.info('Migration 082_skill_progressions completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 082_skill_progressions');

  await db.query('DROP TABLE IF EXISTS user_skill_progress CASCADE');
  await db.query('DROP TABLE IF EXISTS skill_progressions CASCADE');

  log.info('Migration 082_skill_progressions rolled back');
}
