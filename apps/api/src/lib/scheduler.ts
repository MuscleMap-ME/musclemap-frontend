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
import { EmailService } from '../services/email.service';
import { notificationTriggersService } from '../modules/engagement/notification-triggers.service';

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
 * Process hourly feedback digest email
 * Collects non-bug feedback items and sends digest to admin
 * Runs every hour
 */
async function processFeedbackDigest(): Promise<void> {
  try {
    await withLock('scheduler:feedback-digest', async () => {
      log.info('Processing feedback digest...');

      // Get new non-bug feedback items that haven't been included in a digest yet
      const items = await queryAll<{
        id: string;
        type: string;
        title: string;
        description: string;
        username: string;
        created_at: Date;
      }>(
        `SELECT
          f.id,
          f.type,
          f.title,
          f.description,
          u.username,
          f.created_at
        FROM user_feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.digest_included_at IS NULL
        AND f.type != 'bug_report'
        AND f.created_at > NOW() - INTERVAL '2 hours'
        ORDER BY f.created_at DESC
        LIMIT 50`
      );

      if (items.length === 0) {
        log.debug('No new feedback items for digest');
        return;
      }

      // Send the digest email
      const result = await EmailService.sendFeedbackDigest(
        items.map((item) => ({
          id: item.id,
          type: item.type as 'feature_request' | 'question' | 'general',
          title: item.title,
          description: item.description,
          username: item.username,
          createdAt: item.created_at,
        }))
      );

      if (result.success) {
        // Mark items as included in digest
        const feedbackIds = items.map((i) => i.id);
        await query(
          `UPDATE user_feedback SET digest_included_at = NOW() WHERE id = ANY($1)`,
          [feedbackIds]
        );

        // Record the digest
        const bugCount = items.filter((i) => i.type === 'bug_report').length;
        const featureCount = items.filter((i) => i.type === 'feature_request').length;
        const questionCount = items.filter((i) => i.type === 'question').length;
        const generalCount = items.filter((i) => i.type === 'general').length;

        await query(
          `INSERT INTO feedback_email_digests
           (recipient_email, feedback_ids, feedback_count, email_id, bug_count, feature_count, question_count, general_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            process.env.ADMIN_EMAIL || 'admin@musclemap.me',
            feedbackIds,
            items.length,
            result.id || null,
            bugCount,
            featureCount,
            questionCount,
            generalCount,
          ]
        );

        log.info({ itemCount: items.length, emailId: result.id }, 'Feedback digest sent');
      } else {
        log.error({ error: result.error }, 'Failed to send feedback digest');
      }
    }, { ttl: 120000 }); // 2 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      log.debug('Another instance is processing feedback digest');
    } else {
      log.error({ err }, 'Error processing feedback digest');
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

  // ============================================
  // DATABASE MAINTENANCE JOBS
  // ============================================

  // Materialized view refresh - every 5 minutes
  const matviewInterval = setInterval(refreshMaterializedViews, 5 * 60 * 1000);
  activeIntervals.push(matviewInterval);
  refreshMaterializedViews(); // Run immediately

  // Performance snapshot - every 15 minutes
  const snapshotInterval = setInterval(capturePerformanceSnapshot, 15 * 60 * 1000);
  activeIntervals.push(snapshotInterval);
  capturePerformanceSnapshot(); // Run immediately

  // Data retention policies - daily at 3 AM UTC
  const msUntil3AM = (() => {
    const next3AM = new Date(now);
    next3AM.setUTCHours(3, 0, 0, 0);
    if (next3AM <= now) {
      next3AM.setUTCDate(next3AM.getUTCDate() + 1);
    }
    return next3AM.getTime() - now.getTime();
  })();

  setTimeout(() => {
    runDataRetentionPolicies();
    const retentionInterval = setInterval(runDataRetentionPolicies, 24 * 60 * 60 * 1000);
    activeIntervals.push(retentionInterval);
  }, msUntil3AM);

  // Credit archival - weekly on Sunday at 2 AM UTC
  const msUntilSunday2AM = (() => {
    const nextSunday = new Date(now);
    nextSunday.setUTCHours(2, 0, 0, 0);
    // Find next Sunday
    const daysUntilSunday = (7 - nextSunday.getUTCDay()) % 7;
    nextSunday.setUTCDate(nextSunday.getUTCDate() + (daysUntilSunday === 0 && now.getTime() >= nextSunday.getTime() ? 7 : daysUntilSunday));
    return nextSunday.getTime() - now.getTime();
  })();

  setTimeout(() => {
    archiveCreditTransactions();
    const archiveInterval = setInterval(archiveCreditTransactions, 7 * 24 * 60 * 60 * 1000);
    activeIntervals.push(archiveInterval);
  }, msUntilSunday2AM);

  // ============================================
  // FEEDBACK DIGEST JOB - Hourly
  // ============================================
  const feedbackDigestInterval = setInterval(processFeedbackDigest, 60 * 60 * 1000);
  activeIntervals.push(feedbackDigestInterval);
  // Don't run immediately - wait for the first hour

  // ============================================
  // BUG REPORT DIGEST JOB - Hourly
  // ============================================
  const bugDigestInterval = setInterval(processBugReportDigest, 60 * 60 * 1000);
  activeIntervals.push(bugDigestInterval);
  processBugReportDigest(); // Run immediately on startup to catch any pending bugs

  // ============================================
  // BETA TESTER SNAPSHOTS - Daily at 4 AM UTC
  // ============================================
  const msUntil4AM = (() => {
    const next4AM = new Date(now);
    next4AM.setUTCHours(4, 0, 0, 0);
    if (next4AM <= now) {
      next4AM.setUTCDate(next4AM.getUTCDate() + 1);
    }
    return next4AM.getTime() - now.getTime();
  })();

  setTimeout(() => {
    runBetaTesterSnapshots();
    const snapshotInterval = setInterval(runBetaTesterSnapshots, 24 * 60 * 60 * 1000);
    activeIntervals.push(snapshotInterval);
  }, msUntil4AM);

  // ============================================
  // ENGAGEMENT NOTIFICATION TRIGGERS
  // Process notifications, streak reminders, challenge expiration
  // ============================================

  // Process pending notifications - every minute
  const notificationProcessInterval = setInterval(async () => {
    try {
      await withLock('scheduler:process-notifications', async () => {
        await notificationTriggersService.processPendingNotifications();
      }, { ttl: 30000 });
    } catch (err) {
      if (!(err as Error).message?.includes('Failed to acquire lock')) {
        log.error({ err }, 'Error processing pending notifications');
      }
    }
  }, 60 * 1000); // Every minute
  activeIntervals.push(notificationProcessInterval);

  // Engagement trigger check - runs all time-appropriate triggers hourly
  const engagementTriggerInterval = setInterval(async () => {
    try {
      await withLock('scheduler:engagement-triggers', async () => {
        const results = await notificationTriggersService.runAllTriggers();
        const total = results.streakAtRisk + results.challengeExpiring + results.dailyReward + results.reEngagement;
        if (total > 0) {
          log.info(results, 'Engagement triggers processed');
        }
      }, { ttl: 120000 }); // 2 minute lock
    } catch (err) {
      if (!(err as Error).message?.includes('Failed to acquire lock')) {
        log.error({ err }, 'Error running engagement triggers');
      }
    }
  }, 60 * 60 * 1000); // Every hour
  activeIntervals.push(engagementTriggerInterval);

  // Run engagement triggers immediately on startup
  setTimeout(async () => {
    try {
      await withLock('scheduler:engagement-triggers-startup', async () => {
        const results = await notificationTriggersService.runAllTriggers();
        log.info(results, 'Initial engagement triggers processed');
      }, { ttl: 120000 });
    } catch {
      // Silent on startup
    }
  }, 5000); // Wait 5 seconds after startup

  log.info('Scheduler started with leaderboard rewards, mute expiry, fraud cleanup, matview refresh, retention policies, credit archival, feedback digest, bug digest, beta tester snapshots, and engagement triggers');
}

/**
 * Process hourly bug report digest email
 * Collects new bug reports and sends priority digest to admin
 * Runs every hour
 */
async function processBugReportDigest(): Promise<void> {
  try {
    await withLock('scheduler:bug-digest', async () => {
      log.info('Processing bug report digest...');

      // Get new bug reports that haven't been included in a digest yet
      // Prioritize beta tester reports
      const bugs = await queryAll<{
        id: string;
        title: string;
        description: string;
        username: string;
        email: string;
        is_beta_tester_report: boolean;
        beta_tester_priority: number;
        beta_tester_tier: string | null;
        steps_to_reproduce: string | null;
        created_at: Date;
      }>(
        `SELECT
          f.id,
          f.title,
          f.description,
          f.steps_to_reproduce,
          f.is_beta_tester_report,
          f.beta_tester_priority,
          u.username,
          u.email,
          u.beta_tester_tier,
          f.created_at
        FROM user_feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.digest_included_at IS NULL
        AND f.type = 'bug_report'
        AND f.created_at > NOW() - INTERVAL '2 hours'
        ORDER BY f.is_beta_tester_report DESC, f.beta_tester_priority DESC, f.created_at ASC
        LIMIT 50`
      );

      if (bugs.length === 0) {
        log.debug('No new bug reports for digest');
        return;
      }

      // Send the bug digest email
      const result = await EmailService.sendBugReportDigest(
        bugs.map((bug) => ({
          id: bug.id,
          title: bug.title,
          description: bug.description,
          stepsToReproduce: bug.steps_to_reproduce,
          username: bug.username,
          email: bug.email,
          isBetaTester: bug.is_beta_tester_report,
          betaTesterTier: bug.beta_tester_tier,
          betaTesterPriority: bug.beta_tester_priority,
          createdAt: bug.created_at,
        }))
      );

      if (result.success) {
        // Mark bugs as included in digest
        const bugIds = bugs.map((b) => b.id);
        await query(
          `UPDATE user_feedback SET digest_included_at = NOW() WHERE id = ANY($1)`,
          [bugIds]
        );

        log.info({ bugCount: bugs.length, emailId: result.id }, 'Bug report digest sent');
      } else {
        log.error({ error: result.error }, 'Failed to send bug report digest');
      }
    }, { ttl: 120000 }); // 2 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      log.debug('Another instance is processing bug report digest');
    } else {
      log.error({ err }, 'Error processing bug report digest');
    }
  }
}

/**
 * Run daily beta tester progress snapshots
 * Creates automatic backups of beta tester progress
 * Runs daily at 4 AM UTC
 */
async function runBetaTesterSnapshots(): Promise<void> {
  try {
    await withLock('scheduler:beta-snapshots', async () => {
      log.info('Running beta tester snapshots...');

      try {
        const result = await queryAll<{ user_id: string; snapshot_id: string; success: boolean }>(
          'SELECT * FROM run_daily_beta_snapshots()'
        );

        let successCount = 0;
        let failCount = 0;
        for (const row of result) {
          if (row.success) {
            successCount++;
          } else {
            failCount++;
            log.warn({ userId: row.user_id }, 'Failed to create beta tester snapshot');
          }
        }

        if (successCount > 0 || failCount > 0) {
          log.info({ successCount, failCount }, 'Beta tester snapshots completed');
        }
      } catch {
        log.warn('Beta tester snapshots not available - migration may not have run yet');
      }
    }, { ttl: 300000 }); // 5 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      log.debug('Another instance is running beta tester snapshots');
    } else {
      log.error({ err }, 'Error running beta tester snapshots');
    }
  }
}

/**
 * Refresh materialized views (XP rankings leaderboard)
 * Runs every 5 minutes
 */
async function refreshMaterializedViews(): Promise<void> {
  try {
    await withLock('scheduler:refresh-matviews', async () => {
      log.debug('Refreshing materialized views...');

      // Try the v2 view first (optimized), fall back to v1
      try {
        await query('SELECT refresh_xp_rankings_v2_with_log()');
        log.debug('Refreshed mv_xp_rankings_v2');
      } catch {
        // Fall back to v1 if v2 doesn't exist
        try {
          await query('SELECT refresh_xp_rankings_with_log()');
          log.debug('Refreshed mv_xp_rankings');
        } catch {
          // Last resort: direct refresh
          await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings');
          log.debug('Refreshed mv_xp_rankings (direct)');
        }
      }
    }, { ttl: 60000 }); // 1 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      // Silent - another instance is handling it
    } else {
      log.error({ err }, 'Error refreshing materialized views');
    }
  }
}

/**
 * Run data retention policies (cleanup old data)
 * Runs daily at 3 AM UTC
 */
async function runDataRetentionPolicies(): Promise<void> {
  try {
    await withLock('scheduler:data-retention', async () => {
      log.info('Running data retention policies...');

      try {
        const result = await queryAll<{ policy_name: string; deleted_count: number; success: boolean }>(
          'SELECT * FROM run_all_retention_policies()'
        );

        let totalDeleted = 0;
        for (const row of result) {
          if (row.success && row.deleted_count > 0) {
            totalDeleted += row.deleted_count;
            log.info({ policy: row.policy_name, deleted: row.deleted_count }, 'Retention policy executed');
          }
        }

        if (totalDeleted > 0) {
          log.info({ totalDeleted }, 'Data retention completed');
        }
      } catch {
        log.warn('Data retention policies not available - migration may not have run yet');
      }
    }, { ttl: 600000 }); // 10 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      // Silent - another instance is handling it
    } else {
      log.error({ err }, 'Error running data retention policies');
    }
  }
}

/**
 * Archive old credit transactions
 * Runs weekly on Sunday at 2 AM UTC
 */
async function archiveCreditTransactions(): Promise<void> {
  try {
    await withLock('scheduler:archive-credits', async () => {
      log.info('Archiving old credit transactions...');

      try {
        const result = await queryOne<{
          archived_count: number;
          duration_ms: number;
          oldest_archived: string;
          newest_archived: string;
        }>(
          'SELECT * FROM archive_old_credit_transactions(6, 10000)'
        );

        if (result && result.archived_count > 0) {
          log.info({
            archived: result.archived_count,
            durationMs: result.duration_ms,
            oldest: result.oldest_archived,
            newest: result.newest_archived,
          }, 'Credit transactions archived');
        }
      } catch {
        log.warn('Credit archival not available - migration may not have run yet');
      }
    }, { ttl: 900000 }); // 15 minute lock
  } catch (err) {
    if ((err as Error).message?.includes('Failed to acquire lock')) {
      // Silent - another instance is handling it
    } else {
      log.error({ err }, 'Error archiving credit transactions');
    }
  }
}

/**
 * Capture performance snapshot for monitoring
 * Runs every 15 minutes
 */
async function capturePerformanceSnapshot(): Promise<void> {
  try {
    await withLock('scheduler:performance-snapshot', async () => {
      try {
        await query('SELECT capture_performance_snapshot()');
        log.debug('Performance snapshot captured');
      } catch {
        // Function may not exist yet - silently skip
      }
    }, { ttl: 30000 }); // 30 second lock
  } catch {
    // Silent failures for performance monitoring
  }
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

/**
 * Manually trigger feedback digest (for admin/testing)
 */
export async function triggerFeedbackDigest(): Promise<void> {
  await processFeedbackDigest();
}

/**
 * Manually trigger engagement notification triggers (for admin/testing)
 */
export async function triggerEngagementNotifications(): Promise<{
  streakAtRisk: number;
  challengeExpiring: number;
  dailyReward: number;
  reEngagement: number;
  processed: number;
}> {
  return notificationTriggersService.runAllTriggers();
}
