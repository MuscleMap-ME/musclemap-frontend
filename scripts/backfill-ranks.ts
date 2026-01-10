#!/usr/bin/env npx tsx
/**
 * Backfill Ranks Script
 *
 * This script backfills rank data for existing users:
 * 1. Calculates total_xp from existing XP sources (workouts, achievements, etc.)
 * 2. Assigns appropriate rank based on XP thresholds
 * 3. Calculates veteran_tier from account creation date
 * 4. Creates default field visibility settings
 *
 * Usage:
 *   npx tsx scripts/backfill-ranks.ts
 *   npx tsx scripts/backfill-ranks.ts --dry-run
 *   npx tsx scripts/backfill-ranks.ts --verbose
 */

import { db } from '../apps/api/src/db/client';
import { loggers } from '../apps/api/src/lib/logger';

const log = loggers.db;

interface BackfillOptions {
  dryRun: boolean;
  verbose: boolean;
}

interface RankDefinition {
  id: string;
  name: string;
  xp_threshold: number;
}

interface UserStats {
  user_id: string;
  username: string;
  created_at: Date;
  current_xp: number;
  workout_count: number;
  achievement_count: number;
  goal_count: number;
  streak_best: number;
}

// XP values for backfill calculation
const XP_VALUES = {
  workout: 25,          // Base XP per workout
  achievement: 50,      // Per achievement earned
  goal_complete: 50,    // Per goal completed
  streak_bonus: 10,     // Per day of best streak
  archetype_level: 100, // Per archetype level (approximation)
};

function calculateVeteranTier(createdAt: Date): 0 | 1 | 2 | 3 {
  const now = new Date();
  const monthsActive = (now.getFullYear() - createdAt.getFullYear()) * 12 +
    (now.getMonth() - createdAt.getMonth());

  if (monthsActive >= 24) return 3; // 2+ years = Gold
  if (monthsActive >= 12) return 2; // 1+ year = Silver
  if (monthsActive >= 6) return 1;  // 6+ months = Bronze
  return 0;
}

async function getRankForXp(xp: number, ranks: RankDefinition[]): Promise<RankDefinition> {
  // Ranks should be sorted by xp_threshold descending
  const sortedRanks = [...ranks].sort((a, b) => b.xp_threshold - a.xp_threshold);
  for (const rank of sortedRanks) {
    if (xp >= rank.xp_threshold) {
      return rank;
    }
  }
  return ranks.find(r => r.name === 'novice') || ranks[0];
}

async function backfillRanks(options: BackfillOptions): Promise<void> {
  const { dryRun, verbose } = options;

  console.log('🎖️  MuscleMap Rank Backfill Script');
  console.log('===================================');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Get rank definitions
  const ranks = await db.query<RankDefinition>(
    'SELECT id, name, xp_threshold FROM rank_definitions ORDER BY xp_threshold ASC'
  );

  if (!ranks || ranks.length === 0) {
    console.error('❌ No rank definitions found. Run migrations first.');
    process.exit(1);
  }

  console.log(`📊 Found ${ranks.length} rank definitions`);

  // Get all users with their stats
  const users = await db.query<UserStats>(`
    SELECT
      u.id as user_id,
      u.username,
      u.created_at,
      COALESCE(u.total_xp, 0) as current_xp,
      COALESCE(ws.workout_count, 0) as workout_count,
      COALESCE(ua.achievement_count, 0) as achievement_count,
      COALESCE(ug.goal_count, 0) as goal_count,
      COALESCE(us.best_streak, 0) as streak_best
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) as workout_count
      FROM workouts
      GROUP BY user_id
    ) ws ON ws.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as achievement_count
      FROM user_achievements
      GROUP BY user_id
    ) ua ON ua.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) as goal_count
      FROM user_goals
      WHERE completed_at IS NOT NULL
      GROUP BY user_id
    ) ug ON ug.user_id = u.id
    LEFT JOIN (
      SELECT user_id, MAX(current_streak) as best_streak
      FROM user_streaks
      GROUP BY user_id
    ) us ON us.user_id = u.id
    ORDER BY u.created_at ASC
  `);

  if (!users || users.length === 0) {
    console.log('ℹ️  No users found to backfill.');
    return;
  }

  console.log(`👥 Found ${users.length} users to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Calculate estimated XP from activity
      const calculatedXp =
        (user.workout_count * XP_VALUES.workout) +
        (user.achievement_count * XP_VALUES.achievement) +
        (user.goal_count * XP_VALUES.goal_complete) +
        (user.streak_best * XP_VALUES.streak_bonus);

      // Use the higher of current XP or calculated XP
      const finalXp = Math.max(user.current_xp, calculatedXp);

      // Get appropriate rank
      const rank = await getRankForXp(finalXp, ranks);

      // Calculate veteran tier
      const veteranTier = calculateVeteranTier(new Date(user.created_at));

      if (verbose) {
        console.log(`\n📋 ${user.username || user.user_id}`);
        console.log(`   Workouts: ${user.workout_count}, Achievements: ${user.achievement_count}`);
        console.log(`   Current XP: ${user.current_xp}, Calculated: ${calculatedXp}, Final: ${finalXp}`);
        console.log(`   Rank: ${rank.name}, Veteran Tier: ${veteranTier}`);
      }

      if (!dryRun) {
        // Update user's XP and rank
        await db.query(
          `UPDATE users
           SET total_xp = $1, current_rank = $2, veteran_tier = $3, updated_at = NOW()
           WHERE id = $4`,
          [finalXp, rank.name, veteranTier, user.user_id]
        );

        // Create default field visibility if not exists
        await db.query(
          `INSERT INTO user_field_visibility (user_id)
           VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [user.user_id]
        );

        // Add XP history entry for backfill
        if (finalXp > 0) {
          await db.query(
            `INSERT INTO xp_history (user_id, amount, source_type, reason, created_at)
             VALUES ($1, $2, 'backfill', 'Initial XP backfill from existing activity', NOW())
             ON CONFLICT DO NOTHING`,
            [user.user_id, finalXp]
          );
        }
      }

      updated++;
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${user.username || user.user_id}:`, error);
    }
  }

  console.log('\n===================================');
  console.log('📊 Backfill Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);

  if (!dryRun) {
    // Refresh materialized view
    console.log('\n🔄 Refreshing leaderboard rankings...');
    try {
      await db.query('REFRESH MATERIALIZED VIEW mv_xp_rankings');
      console.log('   ✅ Rankings refreshed');
    } catch (error) {
      console.log('   ⚠️  Could not refresh rankings (view may not exist yet)');
    }

    // Update veteran badges in bulk
    console.log('\n🎖️  Updating veteran badges...');
    await db.query(`
      UPDATE users
      SET veteran_tier = CASE
        WHEN created_at <= NOW() - INTERVAL '24 months' THEN 3
        WHEN created_at <= NOW() - INTERVAL '12 months' THEN 2
        WHEN created_at <= NOW() - INTERVAL '6 months' THEN 1
        ELSE 0
      END,
      updated_at = NOW()
      WHERE veteran_tier IS NULL OR veteran_tier != CASE
        WHEN created_at <= NOW() - INTERVAL '24 months' THEN 3
        WHEN created_at <= NOW() - INTERVAL '12 months' THEN 2
        WHEN created_at <= NOW() - INTERVAL '6 months' THEN 1
        ELSE 0
      END
    `);
    console.log('   ✅ Veteran badges updated');
  }

  console.log('\n✨ Backfill complete!');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: BackfillOptions = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run the backfill
backfillRanks(options)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
