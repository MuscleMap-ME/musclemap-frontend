/**
 * Scheduler Service
 *
 * Handles periodic tasks like leaderboard reward distribution.
 * Uses simple setInterval-based scheduling with distributed locking
 * to ensure only one instance processes each job.
 */

import { loggers } from './logger';
import { withLock } from './distributed-lock';
import { queryAll, queryOne, query } from '../db/client';
import earningService from '../modules/economy/earning.service';

const log = loggers.core.child({ module: 'scheduler' });

// Track active intervals for cleanup
const activeIntervals: NodeJS.Timeout[] = [];

/**
 * Process daily leaderboard rewards
 * Runs at midnight UTC
 */
async function processDailyLeaderboardRewards(): Promise<void> {
  try {
    await withLock('scheduler:daily-leaderboard-rewards', async () => {
      log.info('Processing daily leaderboard rewards...');

      // Get yesterday's date for the period we're rewarding
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const periodDate = yesterday.toISOString().split('T')[0];

      // Check if we already processed this period
      const alreadyProcessed = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM earning_awards
         WHERE source_type = 'leaderboard_period'
         AND source_id LIKE $1`,
        [`daily-${periodDate}%`]
      );

      if (alreadyProcessed && parseInt(alreadyProcessed.count) > 0) {
        log.info({ periodDate }, 'Daily leaderboard rewards already processed');
        return;
      }

      // Get top 10 from each daily leaderboard
      const leaderboards = await queryAll<{
        exercise_id: string;
        metric_key: string;
        hangout_id: number | null;
        virtual_hangout_id: number | null;
      }>(
        `SELECT DISTINCT exercise_id, metric_key, hangout_id, virtual_hangout_id
         FROM leaderboard_entries
         WHERE period_type = 'daily'
         AND updated_at >= CURRENT_DATE - INTERVAL '1 day'`
      );

      let totalAwarded = 0;

      for (const lb of leaderboards) {
        const topEntries = await queryAll<{ user_id: string; value: number }>(
          `SELECT user_id, value FROM leaderboard_entries
           WHERE exercise_id = $1 AND metric_key = $2 AND period_type = 'daily'
           AND COALESCE(hangout_id::text, 'null') = COALESCE($3::text, 'null')
           AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($4::text, 'null')
           ORDER BY value DESC
           LIMIT 10`,
          [lb.exercise_id, lb.metric_key, lb.hangout_id, lb.virtual_hangout_id]
        );

        for (let i = 0; i < topEntries.length; i++) {
          const entry = topEntries[i];
          const rank = i + 1;
          const leaderboardId = `${lb.exercise_id}-${lb.metric_key}-${lb.hangout_id || lb.virtual_hangout_id || 'global'}`;

          try {
            const result = await earningService.onLeaderboardPlacement({
              userId: entry.user_id,
              leaderboardId: `daily-${periodDate}-${leaderboardId}`,
              rank,
              periodType: 'daily',
            });

            if (result.success && !result.alreadyAwarded) {
              totalAwarded++;
            }
          } catch (err) {
            log.error({ err, userId: entry.user_id, rank }, 'Failed to award daily leaderboard placement');
          }
        }
      }

      log.info({ totalAwarded, periodDate }, 'Daily leaderboard rewards processed');
    }, { ttl: 300000 }); // 5 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      log.debug('Another instance is processing daily leaderboard rewards');
    } else {
      log.error({ err }, 'Error processing daily leaderboard rewards');
    }
  }
}

/**
 * Process weekly leaderboard rewards
 * Runs every Monday at midnight UTC
 */
async function processWeeklyLeaderboardRewards(): Promise<void> {
  try {
    await withLock('scheduler:weekly-leaderboard-rewards', async () => {
      log.info('Processing weekly leaderboard rewards...');

      // Get last week's date range
      const now = new Date();
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
      const periodWeek = `${lastWeekStart.getFullYear()}-W${Math.ceil((lastWeekStart.getDate() + lastWeekStart.getDay()) / 7)}`;

      // Check if already processed
      const alreadyProcessed = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM earning_awards
         WHERE source_type = 'leaderboard_period'
         AND source_id LIKE $1`,
        [`weekly-${periodWeek}%`]
      );

      if (alreadyProcessed && parseInt(alreadyProcessed.count) > 0) {
        log.info({ periodWeek }, 'Weekly leaderboard rewards already processed');
        return;
      }

      // Get top 10 from each weekly leaderboard
      const leaderboards = await queryAll<{
        exercise_id: string;
        metric_key: string;
        hangout_id: number | null;
        virtual_hangout_id: number | null;
      }>(
        `SELECT DISTINCT exercise_id, metric_key, hangout_id, virtual_hangout_id
         FROM leaderboard_entries
         WHERE period_type = 'weekly'`
      );

      let totalAwarded = 0;

      for (const lb of leaderboards) {
        const topEntries = await queryAll<{ user_id: string; value: number }>(
          `SELECT user_id, value FROM leaderboard_entries
           WHERE exercise_id = $1 AND metric_key = $2 AND period_type = 'weekly'
           AND COALESCE(hangout_id::text, 'null') = COALESCE($3::text, 'null')
           AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($4::text, 'null')
           ORDER BY value DESC
           LIMIT 10`,
          [lb.exercise_id, lb.metric_key, lb.hangout_id, lb.virtual_hangout_id]
        );

        for (let i = 0; i < topEntries.length; i++) {
          const entry = topEntries[i];
          const rank = i + 1;
          const leaderboardId = `${lb.exercise_id}-${lb.metric_key}-${lb.hangout_id || lb.virtual_hangout_id || 'global'}`;

          try {
            const result = await earningService.onLeaderboardPlacement({
              userId: entry.user_id,
              leaderboardId: `weekly-${periodWeek}-${leaderboardId}`,
              rank,
              periodType: 'weekly',
            });

            if (result.success && !result.alreadyAwarded) {
              totalAwarded++;
            }
          } catch (err) {
            log.error({ err, userId: entry.user_id, rank }, 'Failed to award weekly leaderboard placement');
          }
        }
      }

      log.info({ totalAwarded, periodWeek }, 'Weekly leaderboard rewards processed');
    }, { ttl: 600000 }); // 10 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      log.debug('Another instance is processing weekly leaderboard rewards');
    } else {
      log.error({ err }, 'Error processing weekly leaderboard rewards');
    }
  }
}

/**
 * Process monthly leaderboard rewards
 * Runs on the 1st of each month at midnight UTC
 */
async function processMonthlyLeaderboardRewards(): Promise<void> {
  try {
    await withLock('scheduler:monthly-leaderboard-rewards', async () => {
      log.info('Processing monthly leaderboard rewards...');

      // Get last month
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const periodMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      // Check if already processed
      const alreadyProcessed = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM earning_awards
         WHERE source_type = 'leaderboard_period'
         AND source_id LIKE $1`,
        [`monthly-${periodMonth}%`]
      );

      if (alreadyProcessed && parseInt(alreadyProcessed.count) > 0) {
        log.info({ periodMonth }, 'Monthly leaderboard rewards already processed');
        return;
      }

      // Get top 10 from each monthly leaderboard
      const leaderboards = await queryAll<{
        exercise_id: string;
        metric_key: string;
        hangout_id: number | null;
        virtual_hangout_id: number | null;
      }>(
        `SELECT DISTINCT exercise_id, metric_key, hangout_id, virtual_hangout_id
         FROM leaderboard_entries
         WHERE period_type = 'monthly'`
      );

      let totalAwarded = 0;

      for (const lb of leaderboards) {
        const topEntries = await queryAll<{ user_id: string; value: number }>(
          `SELECT user_id, value FROM leaderboard_entries
           WHERE exercise_id = $1 AND metric_key = $2 AND period_type = 'monthly'
           AND COALESCE(hangout_id::text, 'null') = COALESCE($3::text, 'null')
           AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($4::text, 'null')
           ORDER BY value DESC
           LIMIT 10`,
          [lb.exercise_id, lb.metric_key, lb.hangout_id, lb.virtual_hangout_id]
        );

        for (let i = 0; i < topEntries.length; i++) {
          const entry = topEntries[i];
          const rank = i + 1;
          const leaderboardId = `${lb.exercise_id}-${lb.metric_key}-${lb.hangout_id || lb.virtual_hangout_id || 'global'}`;

          try {
            const result = await earningService.onLeaderboardPlacement({
              userId: entry.user_id,
              leaderboardId: `monthly-${periodMonth}-${leaderboardId}`,
              rank,
              periodType: 'monthly',
            });

            if (result.success && !result.alreadyAwarded) {
              totalAwarded++;
            }
          } catch (err) {
            log.error({ err, userId: entry.user_id, rank }, 'Failed to award monthly leaderboard placement');
          }
        }
      }

      log.info({ totalAwarded, periodMonth }, 'Monthly leaderboard rewards processed');
    }, { ttl: 900000 }); // 15 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      log.debug('Another instance is processing monthly leaderboard rewards');
    } else {
      log.error({ err }, 'Error processing monthly leaderboard rewards');
    }
  }
}

/**
 * Check and process expired mutes
 * Runs every hour
 */
async function processExpiredMutes(): Promise<void> {
  try {
    await withLock('scheduler:expired-mutes', async () => {
      // Auto-unmute expired mutes in user_mutes table
      const result = await query(
        `DELETE FROM user_mutes WHERE mute_until IS NOT NULL AND mute_until < NOW()`
      );

      const rowCount = (result as any)?.rowCount || 0;
      if (rowCount > 0) {
        log.info({ count: rowCount }, 'Expired mutes cleaned up');
      }
    }, { ttl: 60000 }); // 1 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      // Silent - another instance is handling it
    } else {
      log.error({ err }, 'Error processing expired mutes');
    }
  }
}

/**
 * Clean up old fraud flags that have been resolved
 * Runs daily
 */
async function cleanupOldFraudFlags(): Promise<void> {
  try {
    await withLock('scheduler:cleanup-fraud-flags', async () => {
      // Delete resolved fraud flags older than 90 days
      const result = await query(
        `DELETE FROM economy_fraud_flags
         WHERE status IN ('resolved_valid', 'resolved_invalid')
         AND resolved_at < NOW() - INTERVAL '90 days'`
      );

      const rowCount = (result as any)?.rowCount || 0;
      if (rowCount > 0) {
        log.info({ count: rowCount }, 'Old fraud flags cleaned up');
      }
    }, { ttl: 120000 }); // 2 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      // Silent - another instance is handling it
    } else {
      log.error({ err }, 'Error cleaning up fraud flags');
    }
  }
}

/**
 * Start all scheduled jobs
 */
export function startScheduler(): void {
  log.info('Starting scheduler...');

  // Calculate time until next midnight UTC
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();

  // Daily leaderboard rewards - run at midnight UTC
  setTimeout(() => {
    processDailyLeaderboardRewards();
    const dailyInterval = setInterval(processDailyLeaderboardRewards, 24 * 60 * 60 * 1000);
    activeIntervals.push(dailyInterval);
  }, msUntilMidnight);

  // Weekly leaderboard rewards - check daily, but only process on Monday
  setTimeout(() => {
    const checkWeekly = () => {
      if (new Date().getUTCDay() === 1) { // Monday
        processWeeklyLeaderboardRewards();
      }
    };
    checkWeekly();
    const weeklyInterval = setInterval(checkWeekly, 24 * 60 * 60 * 1000);
    activeIntervals.push(weeklyInterval);
  }, msUntilMidnight);

  // Monthly leaderboard rewards - check daily, but only process on 1st
  setTimeout(() => {
    const checkMonthly = () => {
      if (new Date().getUTCDate() === 1) {
        processMonthlyLeaderboardRewards();
      }
    };
    checkMonthly();
    const monthlyInterval = setInterval(checkMonthly, 24 * 60 * 60 * 1000);
    activeIntervals.push(monthlyInterval);
  }, msUntilMidnight);

  // Expired mutes - every hour
  const mutesInterval = setInterval(processExpiredMutes, 60 * 60 * 1000);
  activeIntervals.push(mutesInterval);
  processExpiredMutes(); // Run immediately

  // Fraud flag cleanup - daily at midnight
  setTimeout(() => {
    cleanupOldFraudFlags();
    const fraudInterval = setInterval(cleanupOldFraudFlags, 24 * 60 * 60 * 1000);
    activeIntervals.push(fraudInterval);
  }, msUntilMidnight);

  log.info('Scheduler started with leaderboard rewards, mute expiry, and fraud cleanup jobs');
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
  log.info('Stopping scheduler...');
  for (const interval of activeIntervals) {
    clearInterval(interval);
  }
  activeIntervals.length = 0;
  log.info('Scheduler stopped');
}

/**
 * Manually trigger leaderboard reward processing (for admin/testing)
 */
export async function triggerLeaderboardRewards(periodType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
  switch (periodType) {
    case 'daily':
      await processDailyLeaderboardRewards();
      break;
    case 'weekly':
      await processWeeklyLeaderboardRewards();
      break;
    case 'monthly':
      await processMonthlyLeaderboardRewards();
      break;
  }
}
