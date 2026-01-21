// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Economy V2 - Additional Earning Rules
 *
 * Adds missing earning rules for:
 * - Skill tier unlocks
 * - Martial arts mastery
 * - Content contribution
 * - Issue bounties
 * - Journey milestones
 * - Trainer-specific rewards
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 045_economy_v2_earning_rules');

  // Add additional earning rules
  const newRules = [
    // Skill Tree earnings
    { code: 'skill_tier_beginner', name: 'Skill Tier: Beginner', category: 'workout', credits_base: 50, xp_base: 100, description: 'Unlock beginner tier in a skill' },
    { code: 'skill_tier_intermediate', name: 'Skill Tier: Intermediate', category: 'workout', credits_base: 100, xp_base: 200, description: 'Unlock intermediate tier in a skill' },
    { code: 'skill_tier_advanced', name: 'Skill Tier: Advanced', category: 'workout', credits_base: 200, xp_base: 400, description: 'Unlock advanced tier in a skill' },
    { code: 'skill_tier_expert', name: 'Skill Tier: Expert', category: 'workout', credits_base: 350, xp_base: 700, description: 'Unlock expert tier in a skill' },
    { code: 'skill_tier_elite', name: 'Skill Tier: Elite', category: 'workout', credits_base: 500, xp_base: 1000, description: 'Unlock elite tier in a skill' },

    // Martial Arts mastery
    { code: 'martial_technique_basic', name: 'Basic Technique Mastery', category: 'workout', credits_base: 25, xp_base: 50, max_per_day: 10, description: 'Master a basic martial arts technique' },
    { code: 'martial_technique_intermediate', name: 'Intermediate Technique Mastery', category: 'workout', credits_base: 50, xp_base: 100, max_per_day: 5, description: 'Master an intermediate technique' },
    { code: 'martial_technique_advanced', name: 'Advanced Technique Mastery', category: 'workout', credits_base: 100, xp_base: 200, max_per_day: 3, description: 'Master an advanced technique' },
    { code: 'martial_belt_promotion', name: 'Belt Promotion', category: 'workout', credits_base: 250, xp_base: 500, description: 'Achieve a belt promotion' },
    { code: 'martial_discipline_complete', name: 'Discipline Mastery', category: 'workout', credits_base: 500, xp_base: 1000, description: 'Complete all techniques in a discipline' },

    // Journey milestones
    { code: 'journey_milestone_reached', name: 'Journey Milestone', category: 'goal', credits_base: 100, xp_base: 200, description: 'Reach a journey milestone' },
    { code: 'journey_chapter_complete', name: 'Journey Chapter Complete', category: 'goal', credits_base: 250, xp_base: 500, description: 'Complete a journey chapter' },
    { code: 'journey_complete', name: 'Journey Complete', category: 'goal', credits_base: 1000, xp_base: 2000, description: 'Complete an entire journey' },
    { code: 'weekly_goal_complete', name: 'Weekly Goal Complete', category: 'goal', credits_base: 75, xp_base: 150, max_per_week: 1, description: 'Complete your weekly fitness goal' },

    // Content contribution
    { code: 'content_exercise_approved', name: 'Exercise Contribution', category: 'social', credits_base: 100, xp_base: 200, description: 'Submit an approved custom exercise' },
    { code: 'content_workout_shared', name: 'Workout Template Shared', category: 'social', credits_base: 50, xp_base: 100, max_per_day: 3, description: 'Share a workout template used by others' },
    { code: 'content_journey_created', name: 'Journey Created', category: 'social', credits_base: 200, xp_base: 400, description: 'Create an approved community journey' },
    { code: 'content_guide_approved', name: 'Guide Contribution', category: 'social', credits_base: 150, xp_base: 300, description: 'Write an approved exercise guide' },
    { code: 'content_video_approved', name: 'Video Contribution', category: 'social', credits_base: 200, xp_base: 400, description: 'Submit an approved form video' },

    // Issue bounties
    { code: 'bounty_bug_minor', name: 'Bug Report (Minor)', category: 'special', credits_base: 100, xp_base: 100, description: 'Report a confirmed minor bug' },
    { code: 'bounty_bug_major', name: 'Bug Report (Major)', category: 'special', credits_base: 250, xp_base: 250, description: 'Report a confirmed major bug' },
    { code: 'bounty_bug_critical', name: 'Bug Report (Critical)', category: 'special', credits_base: 500, xp_base: 500, description: 'Report a confirmed critical bug' },
    { code: 'bounty_feature_suggestion', name: 'Feature Suggestion', category: 'special', credits_base: 150, xp_base: 150, description: 'Suggest a feature that gets implemented' },
    { code: 'bounty_translation', name: 'Translation Contribution', category: 'special', credits_base: 100, xp_base: 100, description: 'Contribute approved translations' },

    // Additional trainer rewards
    { code: 'trainer_first_class', name: 'First Class Taught', category: 'trainer', credits_base: 100, xp_base: 200, description: 'Teach your first class' },
    { code: 'trainer_10_classes', name: '10 Classes Milestone', category: 'trainer', credits_base: 250, xp_base: 500, description: 'Teach 10 classes' },
    { code: 'trainer_50_classes', name: '50 Classes Milestone', category: 'trainer', credits_base: 500, xp_base: 1000, description: 'Teach 50 classes' },
    { code: 'trainer_100_classes', name: '100 Classes Milestone', category: 'trainer', credits_base: 1000, xp_base: 2000, description: 'Teach 100 classes' },
    { code: 'trainer_5_star_rating', name: '5-Star Class', category: 'trainer', credits_base: 25, xp_base: 50, description: 'Receive a 5-star class rating' },
    { code: 'trainer_verified', name: 'Trainer Verification', category: 'trainer', credits_base: 500, xp_base: 1000, description: 'Become a verified trainer' },

    // Social/community rewards
    { code: 'community_hangout_host', name: 'Hangout Host', category: 'social', credits_base: 50, xp_base: 100, max_per_week: 7, description: 'Host a workout hangout' },
    { code: 'community_challenge_win', name: 'Challenge Winner', category: 'social', credits_base: 100, xp_base: 200, description: 'Win a community challenge' },
    { code: 'community_mentor_session', name: 'Mentorship Session', category: 'social', credits_base: 75, xp_base: 150, max_per_day: 3, description: 'Complete a mentorship session' },
    { code: 'community_highfive_milestone', name: 'HighFive Milestone', category: 'social', credits_base: 50, xp_base: 100, description: 'Reach HighFive milestones (100, 500, 1000)' },
  ];

  for (const rule of newRules) {
    await db.query(
      `INSERT INTO earning_rules (code, name, category, credits_base, xp_base, max_per_day, max_per_week, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         credits_base = EXCLUDED.credits_base,
         xp_base = EXCLUDED.xp_base,
         max_per_day = EXCLUDED.max_per_day,
         max_per_week = EXCLUDED.max_per_week,
         description = EXCLUDED.description,
         updated_at = NOW()`,
      [rule.code, rule.name, rule.category, rule.credits_base, rule.xp_base, rule.max_per_day || null, rule.max_per_week || null, rule.description || null]
    );
  }

  log.info(`Added/updated ${newRules.length} earning rules`);
  log.info('Migration 045_economy_v2_earning_rules complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 045_economy_v2_earning_rules');

  const ruleCodes = [
    'skill_tier_beginner', 'skill_tier_intermediate', 'skill_tier_advanced', 'skill_tier_expert', 'skill_tier_elite',
    'martial_technique_basic', 'martial_technique_intermediate', 'martial_technique_advanced', 'martial_belt_promotion', 'martial_discipline_complete',
    'journey_milestone_reached', 'journey_chapter_complete', 'journey_complete', 'weekly_goal_complete',
    'content_exercise_approved', 'content_workout_shared', 'content_journey_created', 'content_guide_approved', 'content_video_approved',
    'bounty_bug_minor', 'bounty_bug_major', 'bounty_bug_critical', 'bounty_feature_suggestion', 'bounty_translation',
    'trainer_first_class', 'trainer_10_classes', 'trainer_50_classes', 'trainer_100_classes', 'trainer_5_star_rating', 'trainer_verified',
    'community_hangout_host', 'community_challenge_win', 'community_mentor_session', 'community_highfive_milestone',
  ];

  const placeholders = ruleCodes.map((_, i) => `$${i + 1}`).join(',');
  await db.query(`DELETE FROM earning_rules WHERE code IN (${placeholders})`, ruleCodes);

  log.info('Rollback 045_economy_v2_earning_rules complete');
}

export const migrate = up;
