/**
 * MuscleMap Background Jobs
 *
 * Run these on a schedule (cron):
 * - Every hour: checkStreaks, updateRivalScores
 * - Daily midnight: expireChallenges, assignDailyChallenges, createWeeklySnapshots
 * - Weekly Sunday: snapshotLeaderboards
 *
 * Setup with cron:
 * 0 * * * * cd /var/www/musclemap.me && node cron-jobs.js hourly
 * 0 0 * * * cd /var/www/musclemap.me && node cron-jobs.js daily
 * 0 0 * * 0 cd /var/www/musclemap.me && node cron-jobs.js weekly
 */

import pg from 'pg';
import { createLogger, exitFailure, exitSuccess, parseScriptArgs } from './scripts/utils/script-utils.js';

const { Pool } = pg;

const options = parseScriptArgs(process.argv);
const logger = createLogger('cron');

// PostgreSQL connection configuration
const poolConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'musclemap',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Use DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
}

let pool;

async function initPool() {
  pool = new Pool(poolConfig);

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.success('Connected to PostgreSQL database');
  } catch (error) {
    throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
  }
}

// Helper function to run a query
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// Helper function to run a query and get first row
async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

// Helper function to run an update/insert and get affected rows
async function execute(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rowCount;
}

// =============================================================================
// HOURLY JOBS
// =============================================================================

async function checkAtRiskStreaks() {
  console.log('🔥 Checking at-risk streaks...');

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Find users with streaks who haven't worked out today
  const atRisk = await query(`
    SELECT id, username, streak_current, streak_shields, last_workout_date
    FROM users
    WHERE streak_current > 0
    AND last_workout_date < $1
    AND last_workout_date >= $2
  `, [today, yesterday]);

  for (const user of atRisk) {
    // Check if we already notified today
    const alreadyNotified = await queryOne(`
      SELECT id FROM notifications
      WHERE user_id = $1 AND type = 'streak_at_risk' AND date(created_at) = $2
    `, [user.id, today]);

    if (!alreadyNotified) {
      await execute(`
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES ($1, 'streak_at_risk', '🔥 Streak at risk!', $2, $3)
      `, [
        user.id,
        `Your ${user.streak_current}-day streak will reset at midnight!`,
        JSON.stringify({ streak: user.streak_current, hasShield: user.streak_shields > 0 })
      ]);

      console.log(`   Notified user ${user.id} (${user.streak_current} day streak)`);
    }
  }

  console.log(`   ✓ Checked ${atRisk.length} at-risk users`);
}

async function expireStreaks() {
  console.log('💔 Expiring broken streaks...');

  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

  // Find users whose streak has actually broken (2+ days since last workout)
  const broken = await query(`
    SELECT id, streak_current, last_workout_date
    FROM users
    WHERE streak_current > 0 AND last_workout_date < $1
  `, [twoDaysAgo]);

  for (const user of broken) {
    // Log the streak history
    await execute(`
      INSERT INTO streak_history (user_id, streak_type, streak_length, started_at, ended_at, broken_reason)
      VALUES ($1, 'workout', $2, $3::date - ($4 - 1) * INTERVAL '1 day', $3, 'missed_day')
    `, [user.id, user.streak_current, user.last_workout_date, user.streak_current]);

    // Reset streak
    await execute('UPDATE users SET streak_current = 0 WHERE id = $1', [user.id]);

    // Notify
    await execute(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, 'streak_broken', '💔 Streak ended', $2, $3)
    `, [
      user.id,
      `Your ${user.streak_current}-day streak has ended. Start a new one today!`,
      JSON.stringify({ previousStreak: user.streak_current })
    ]);

    console.log(`   Broke streak for user ${user.id} (was ${user.streak_current} days)`);
  }

  console.log(`   ✓ Processed ${broken.length} broken streaks`);
}

async function updateRivalScores() {
  console.log('⚔️ Updating rival scores...');

  const active = await query(`SELECT * FROM rivals WHERE status = 'active'`);
  const today = new Date().toISOString().split('T')[0];
  let completed = 0;

  for (const challenge of active) {
    const challengerTU = await queryOne(`
      SELECT COALESCE(SUM(sw.actual_tu), 0) as tu FROM scheduled_workouts sw
      JOIN training_plans tp ON sw.plan_id = tp.id
      WHERE tp.user_id = $1 AND sw.status = 'completed' AND date(sw.completed_at) >= $2
    `, [challenge.challenger_id, challenge.start_date]);

    const rivalTU = await queryOne(`
      SELECT COALESCE(SUM(sw.actual_tu), 0) as tu FROM scheduled_workouts sw
      JOIN training_plans tp ON sw.plan_id = tp.id
      WHERE tp.user_id = $1 AND sw.status = 'completed' AND date(sw.completed_at) >= $2
    `, [challenge.rival_id, challenge.start_date]);

    await execute(`UPDATE rivals SET challenger_score = $1, rival_score = $2 WHERE id = $3`,
      [challengerTU.tu, rivalTU.tu, challenge.id]);

    // Check if ended
    if (today > challenge.end_date) {
      await completeRivalChallenge(challenge.id, challengerTU.tu, rivalTU.tu);
      completed++;
    }
  }

  console.log(`   ✓ Updated ${active.length} challenges, completed ${completed}`);
}

async function completeRivalChallenge(challengeId, challengerScore, rivalScore) {
  // Add idempotency check - only process active challenges
  const challenge = await queryOne('SELECT * FROM rivals WHERE id = $1 AND status = $2', [challengeId, 'active']);
  if (!challenge) return; // Already completed or doesn't exist

  // Null safety
  challengerScore = challengerScore || 0;
  rivalScore = rivalScore || 0;

  let winnerId = null;
  if (challengerScore > rivalScore) winnerId = challenge.challenger_id;
  else if (rivalScore > challengerScore) winnerId = challenge.rival_id;

  await execute(`UPDATE rivals SET status = 'completed', winner_id = $1 WHERE id = $2`,
    [winnerId, challengeId]);

  // Handle wagers
  if (challenge.wager_credits > 0) {
    if (winnerId) {
      await execute('UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2',
        [challenge.wager_credits * 2, winnerId]);
    } else {
      await execute('UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2',
        [challenge.wager_credits, challenge.challenger_id]);
      await execute('UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2',
        [challenge.wager_credits, challenge.rival_id]);
    }
  }

  // Record history for challenger
  await execute(`
    INSERT INTO rival_history (user_id, opponent_id, won, user_score, opponent_score, challenge_type)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    challenge.challenger_id, challenge.rival_id,
    winnerId === challenge.challenger_id ? 1 : 0,
    challengerScore, rivalScore, 'weekly_tu'
  ]);

  // Record history for rival
  await execute(`
    INSERT INTO rival_history (user_id, opponent_id, won, user_score, opponent_score, challenge_type)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    challenge.rival_id, challenge.challenger_id,
    winnerId === challenge.rival_id ? 1 : 0,
    rivalScore, challengerScore, 'weekly_tu'
  ]);

  // Award XP
  if (winnerId) {
    await execute('UPDATE users SET xp = xp + 200 WHERE id = $1', [winnerId]);
  }

  // Notify
  const wagerText = challenge.wager_credits > 0 ? ` (${challenge.wager_credits * 2} credits!)` : '';

  await execute(`
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES ($1, 'rival', $2, $3, $4)
  `, [
    challenge.challenger_id,
    winnerId === challenge.challenger_id ? '🏆 You Won!' : winnerId ? '😢 You Lost' : '🤝 Tie',
    `${Number(challengerScore).toFixed(1)} vs ${Number(rivalScore).toFixed(1)} TU${winnerId === challenge.challenger_id ? wagerText : ''}`,
    JSON.stringify({ challengeId })
  ]);

  await execute(`
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES ($1, 'rival', $2, $3, $4)
  `, [
    challenge.rival_id,
    winnerId === challenge.rival_id ? '🏆 You Won!' : winnerId ? '😢 You Lost' : '🤝 Tie',
    `${Number(rivalScore).toFixed(1)} vs ${Number(challengerScore).toFixed(1)} TU${winnerId === challenge.rival_id ? wagerText : ''}`,
    JSON.stringify({ challengeId })
  ]);
}

// =============================================================================
// DAILY JOBS
// =============================================================================

async function expirePendingChallenges() {
  console.log('⏰ Expiring unanswered rival challenges...');

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  const expired = await query(`
    SELECT * FROM rivals WHERE status = 'pending' AND date(created_at) < $1
  `, [threeDaysAgo]);

  for (const challenge of expired) {
    // Refund challenger's wager
    if (challenge.wager_credits > 0) {
      await execute('UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2',
        [challenge.wager_credits, challenge.challenger_id]);
    }

    await execute(`UPDATE rivals SET status = 'expired' WHERE id = $1`, [challenge.id]);

    // Notify challenger
    await execute(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES ($1, 'rival', '⏰ Challenge Expired', 'Your challenge was not answered and has expired. Credits refunded.', $2)
    `, [challenge.challenger_id, JSON.stringify({ challengeId: challenge.id, refunded: challenge.wager_credits })]);

    console.log(`   Expired challenge ${challenge.id}, refunded ${challenge.wager_credits} credits`);
  }

  console.log(`   ✓ Expired ${expired.length} pending challenges`);
}

async function expireDailyChallenges() {
  console.log('🎯 Expiring yesterday\'s challenges...');

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const changes = await execute(`
    UPDATE daily_challenges
    SET status = 'expired'
    WHERE challenge_date < $1 AND status = 'active'
  `, [yesterday]);

  console.log(`   ✓ Expired ${changes} challenges`);
}

async function createWeeklySnapshots() {
  console.log('📸 Creating muscle history snapshots...');

  const today = new Date();
  const dayOfWeek = today.getDay();

  // Only run on Sunday (0) or Monday (1) to capture week's data
  if (dayOfWeek !== 0 && dayOfWeek !== 1) {
    console.log('   ⏭️ Skipping (not Sunday/Monday)');
    return;
  }

  const weekStart = getWeekStart();

  // Get all users with workout activity
  const users = await query(`
    SELECT DISTINCT tp.user_id
    FROM training_plans tp
    JOIN scheduled_workouts sw ON tp.id = sw.plan_id
    WHERE sw.status = 'completed'
  `);

  let created = 0;

  for (const { user_id } of users) {
    // Check if snapshot already exists
    const existing = await queryOne('SELECT id FROM muscle_history WHERE user_id = $1 AND snapshot_date = $2',
      [user_id, weekStart]);

    if (existing) continue;

    // Calculate muscle data
    const muscleData = await query(`
      SELECT ea.muscle_id, SUM(ea.activation_percent * sw.actual_tu / 100) as activation
      FROM exercise_activations ea
      JOIN scheduled_workout_exercises swe ON ea.exercise_id = swe.exercise_id
      JOIN scheduled_workouts sw ON swe.workout_id = sw.id
      JOIN training_plans tp ON sw.plan_id = tp.id
      WHERE tp.user_id = $1 AND sw.status = 'completed'
      GROUP BY ea.muscle_id
    `, [user_id]);

    const muscleMap = {};
    let total = 0;
    for (const m of muscleData) {
      muscleMap[m.muscle_id] = parseFloat(Number(m.activation).toFixed(2));
      total += Number(m.activation);
    }

    // Calculate balance score
    const groups = {};
    const muscles = await query('SELECT id, muscle_group FROM muscles');
    for (const m of muscles) {
      if (!groups[m.muscle_group]) groups[m.muscle_group] = [];
      groups[m.muscle_group].push(m.id);
    }

    const groupActivations = Object.entries(groups).map(([g, ids]) =>
      ids.reduce((sum, id) => sum + (muscleMap[id] || 0), 0)
    );
    const mean = groupActivations.reduce((a, b) => a + b, 0) / groupActivations.length || 1;
    const variance = groupActivations.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / groupActivations.length;
    const balanceScore = Math.max(0, 100 - Math.sqrt(variance) / mean * 100);

    await execute(`
      INSERT INTO muscle_history (user_id, snapshot_date, muscle_data, total_activation, balance_score)
      VALUES ($1, $2, $3, $4, $5)
    `, [user_id, weekStart, JSON.stringify(muscleMap), total, balanceScore]);

    created++;
  }

  console.log(`   ✓ Created ${created} snapshots`);
}

async function sendDailyChallengeNotifications() {
  console.log('🎯 Sending daily challenge notifications...');

  const today = new Date().toISOString().split('T')[0];

  // Get active users (worked out in last 7 days)
  const activeUsers = await query(`
    SELECT id FROM users WHERE last_workout_date >= CURRENT_DATE - INTERVAL '7 days'
  `);

  for (const { id } of activeUsers) {
    // Check if already notified today
    const notified = await queryOne(`
      SELECT id FROM notifications
      WHERE user_id = $1 AND type = 'daily_challenge_new' AND date(created_at) = $2
    `, [id, today]);

    if (!notified) {
      await execute(`
        INSERT INTO notifications (user_id, type, title, body)
        VALUES ($1, 'daily_challenge_new', '🎯 New Challenges!', 'Your daily challenges are ready!')
      `, [id]);
    }
  }

  console.log(`   ✓ Notified ${activeUsers.length} users`);
}

// =============================================================================
// WEEKLY JOBS
// =============================================================================

async function snapshotWeeklyLeaderboard() {
  // Check if weekly leaderboard table exists
  try {
    await queryOne("SELECT 1 FROM leaderboard_weekly LIMIT 1");
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('relation "leaderboard_weekly" does not exist') || msg.includes('does not exist')) {
      console.warn("leaderboard_weekly missing; skip weekly snapshot");
      return;
    }
    throw e;
  }

  console.log('🏅 Snapshotting weekly leaderboard...');

  const weekStart = getWeekStart();

  // Calculate and store rankings using UPSERT
  const changes = await execute(`
    INSERT INTO leaderboard_weekly (user_id, week_start, total_tu, total_workouts)
    SELECT
      u.id,
      $1 as week_start,
      COALESCE(SUM(sw.actual_tu), 0) as total_tu,
      COUNT(sw.id) as total_workouts
    FROM users u
    LEFT JOIN training_plans tp ON u.id = tp.user_id
    LEFT JOIN scheduled_workouts sw ON tp.id = sw.plan_id
      AND sw.status = 'completed'
      AND date(sw.completed_at) >= $1
    GROUP BY u.id
    HAVING COALESCE(SUM(sw.actual_tu), 0) > 0
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET total_tu = EXCLUDED.total_tu, total_workouts = EXCLUDED.total_workouts
  `, [weekStart]);

  console.log(`   ✓ Updated ${changes} leaderboard entries`);
}

async function updateAllTimeLeaderboard() {
  console.log('📊 Updating all-time leaderboard...');

  // Check if table exists first
  try {
    await queryOne("SELECT 1 FROM leaderboard_alltime LIMIT 1");
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('does not exist')) {
      console.warn("leaderboard_alltime missing; skip all-time update");
      return;
    }
    throw e;
  }

  const changes = await execute(`
    INSERT INTO leaderboard_alltime (user_id, total_tu, total_workouts, longest_streak, archetypes_completed)
    SELECT
      u.id,
      COALESCE(SUM(sw.actual_tu), 0),
      COUNT(DISTINCT sw.id),
      u.streak_longest,
      (SELECT COUNT(*) FROM training_plans WHERE user_id = u.id AND status = 'completed')
    FROM users u
    LEFT JOIN training_plans tp ON u.id = tp.user_id
    LEFT JOIN scheduled_workouts sw ON tp.id = sw.plan_id AND sw.status = 'completed'
    GROUP BY u.id, u.streak_longest
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_tu = EXCLUDED.total_tu,
      total_workouts = EXCLUDED.total_workouts,
      longest_streak = EXCLUDED.longest_streak,
      archetypes_completed = EXCLUDED.archetypes_completed
  `);

  console.log(`   ✓ Updated ${changes} all-time entries`);
}

// =============================================================================
// HELPERS
// =============================================================================

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

// =============================================================================
// RUN JOBS
// =============================================================================

const jobGroups = {
  hourly: [checkAtRiskStreaks, updateRivalScores],
  daily: [expireStreaks, expirePendingChallenges, expireDailyChallenges, createWeeklySnapshots, sendDailyChallengeNotifications],
  weekly: [snapshotWeeklyLeaderboard, updateAllTimeLeaderboard],
};

async function main() {
  if (options.smokeTest) {
    logger.info('Smoke test mode: testing database connectivity.');
    try {
      await initPool();
      logger.success('Validated PostgreSQL database connectivity');
      await closePool();
      exitSuccess(logger, 'cron-jobs.js smoke test completed');
    } catch (error) {
      exitFailure(logger, error);
    }
    return;
  }

  try {
    await initPool();
  } catch (error) {
    exitFailure(logger, error);
    return;
  }

  logger.info(`Running ${options.jobType} jobs${options.dryRun ? ' (dry-run)' : ''}`);

  const jobsToRun = options.jobType === 'all'
    ? [...jobGroups.hourly, ...jobGroups.daily, ...jobGroups.weekly]
    : jobGroups[options.jobType];

  if (!jobsToRun) {
    await closePool();
    exitFailure(logger, new Error(`Unknown job type: ${options.jobType}`));
    return;
  }

  if (options.dryRun) {
    logger.info('Dry-run enabled; jobs will not mutate data. Planned execution order:');
    for (const job of jobsToRun) {
      logger.info(` - ${job.name}`);
    }
    await closePool();
    exitSuccess(logger, 'Dry-run complete');
    return;
  }

  try {
    for (const job of jobsToRun) {
      logger.info(`Running ${job.name}...`);
      await job();
    }
    await closePool();
    exitSuccess(logger, 'Jobs complete!');
  } catch (error) {
    await closePool();
    exitFailure(logger, error);
  }
}

main();
