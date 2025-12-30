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

import Database from 'better-sqlite3';
import { createLogger, exitFailure, exitSuccess, parseScriptArgs, resolveDbPath } from './scripts/utils/script-utils.js';

const options = parseScriptArgs(process.argv);
const logger = createLogger('cron');
const { dbPath, exists: dbExists } = resolveDbPath({ cliPath: options.dbPath, fromUrl: import.meta.url });

let db;

if (options.smokeTest) {
  logger.info('Smoke test mode: skipping job execution.');
  if (dbExists) {
    const probe = new Database(dbPath, { readonly: true });
    probe.prepare('PRAGMA user_version').get();
    probe.close();
    logger.success(`Validated database connectivity at ${dbPath}`);
  } else {
    logger.warn(`Database not found at ${dbPath}; create it before enabling the cron timer.`);
  }
  exitSuccess(logger, 'cron-jobs.js smoke test completed');
}

if (!dbExists) {
  exitFailure(logger, new Error(`Database not found at ${dbPath}`));
}

db = new Database(dbPath);
logger.info(`Running ${options.jobType} jobs using ${dbPath}${options.dryRun ? ' (dry-run)' : ''}`);

// =============================================================================
// HOURLY JOBS
// =============================================================================

function checkAtRiskStreaks() {
  console.log('🔥 Checking at-risk streaks...');
  
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  // Find users with streaks who haven't worked out today
  const atRisk = db.prepare(`
    SELECT id, username, streak_current, streak_shields, last_workout_date
    FROM users
    WHERE streak_current > 0 
    AND last_workout_date < ?
    AND last_workout_date >= ?
  `).all(today, yesterday);
  
  for (const user of atRisk) {
    // Check if we already notified today
    const alreadyNotified = db.prepare(`
      SELECT id FROM notifications 
      WHERE user_id = ? AND type = 'streak_at_risk' AND date(created_at) = ?
    `).get(user.id, today);
    
    if (!alreadyNotified) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (?, 'streak_at_risk', '🔥 Streak at risk!', ?, ?)
      `).run(user.id, 
        `Your ${user.streak_current}-day streak will reset at midnight!`,
        JSON.stringify({ streak: user.streak_current, hasShield: user.streak_shields > 0 }));
      
      console.log(`   Notified user ${user.id} (${user.streak_current} day streak)`);
    }
  }
  
  console.log(`   ✓ Checked ${atRisk.length} at-risk users`);
}

function expireStreaks() {
  console.log('💔 Expiring broken streaks...');
  
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
  
  // Find users whose streak has actually broken (2+ days since last workout)
  const broken = db.prepare(`
    SELECT id, streak_current, last_workout_date
    FROM users
    WHERE streak_current > 0 AND last_workout_date < ?
  `).all(twoDaysAgo);
  
  for (const user of broken) {
    // Log the streak history
    db.prepare(`
      INSERT INTO streak_history (user_id, streak_type, streak_length, started_at, ended_at, broken_reason)
      VALUES (?, 'workout', ?, date(?, '-' || ? || ' days'), ?, 'missed_day')
    `).run(user.id, user.streak_current, user.last_workout_date, user.streak_current - 1, user.last_workout_date);
    
    // Reset streak
    db.prepare('UPDATE users SET streak_current = 0 WHERE id = ?').run(user.id);
    
    // Notify
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (?, 'streak_broken', '💔 Streak ended', ?, ?)
    `).run(user.id, 
      `Your ${user.streak_current}-day streak has ended. Start a new one today!`,
      JSON.stringify({ previousStreak: user.streak_current }));
    
    console.log(`   Broke streak for user ${user.id} (was ${user.streak_current} days)`);
  }
  
  console.log(`   ✓ Processed ${broken.length} broken streaks`);
}

function updateRivalScores() {
  console.log('⚔️ Updating rival scores...');
  
  const active = db.prepare(`SELECT * FROM rivals WHERE status = 'active'`).all();
  const today = new Date().toISOString().split('T')[0];
  let completed = 0;
  
  for (const challenge of active) {
    const challengerTU = db.prepare(`
      SELECT COALESCE(SUM(sw.actual_tu), 0) as tu FROM scheduled_workouts sw
      JOIN training_plans tp ON sw.plan_id = tp.id
      WHERE tp.user_id = ? AND sw.status = 'completed' AND date(sw.completed_at) >= ?
    `).get(challenge.challenger_id, challenge.start_date);
    
    const rivalTU = db.prepare(`
      SELECT COALESCE(SUM(sw.actual_tu), 0) as tu FROM scheduled_workouts sw
      JOIN training_plans tp ON sw.plan_id = tp.id
      WHERE tp.user_id = ? AND sw.status = 'completed' AND date(sw.completed_at) >= ?
    `).get(challenge.rival_id, challenge.start_date);
    
    db.prepare(`UPDATE rivals SET challenger_score = ?, rival_score = ? WHERE id = ?`)
      .run(challengerTU.tu, rivalTU.tu, challenge.id);
    
    // Check if ended
    if (today > challenge.end_date) {
      completeRivalChallenge(challenge.id, challengerTU.tu, rivalTU.tu);
      completed++;
    }
  }
  
  console.log(`   ✓ Updated ${active.length} challenges, completed ${completed}`);
}

function completeRivalChallenge(challengeId, challengerScore, rivalScore) {
  // FIXED: Add idempotency check - only process active challenges
  const challenge = db.prepare('SELECT * FROM rivals WHERE id = ? AND status = ?').get(challengeId, 'active');
  if (!challenge) return; // Already completed or doesn't exist
  
  // FIXED: Null safety
  challengerScore = challengerScore || 0;
  rivalScore = rivalScore || 0;
  
  let winnerId = null;
  if (challengerScore > rivalScore) winnerId = challenge.challenger_id;
  else if (rivalScore > challengerScore) winnerId = challenge.rival_id;
  
  db.prepare(`UPDATE rivals SET status = 'completed', winner_id = ? WHERE id = ?`)
    .run(winnerId, challengeId);
  
  // Handle wagers
  if (challenge.wager_credits > 0) {
    if (winnerId) {
      db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?')
        .run(challenge.wager_credits * 2, winnerId);
    } else {
      db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?')
        .run(challenge.wager_credits, challenge.challenger_id);
      db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?')
        .run(challenge.wager_credits, challenge.rival_id);
    }
  }
  
  // Record history
  db.prepare(`
    INSERT INTO rival_history (user_id, opponent_id, won, user_score, opponent_score, challenge_type)
    VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)
  `).run(
    challenge.challenger_id, challenge.rival_id, winnerId === challenge.challenger_id ? 1 : 0, challengerScore, rivalScore, 'weekly_tu',
    challenge.rival_id, challenge.challenger_id, winnerId === challenge.rival_id ? 1 : 0, rivalScore, challengerScore, 'weekly_tu'
  );
  
  // Award XP
  if (winnerId) {
    db.prepare('UPDATE users SET xp = xp + 200 WHERE id = ?').run(winnerId);
  }
  
  // Notify - FIXED: null safety on toFixed
  const wagerText = challenge.wager_credits > 0 ? ` (${challenge.wager_credits * 2} credits!)` : '';
  
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (?, 'rival', ?, ?, ?), (?, 'rival', ?, ?, ?)
  `).run(
    challenge.challenger_id, 
    winnerId === challenge.challenger_id ? '🏆 You Won!' : winnerId ? '😢 You Lost' : '🤝 Tie',
    `${challengerScore.toFixed(1)} vs ${rivalScore.toFixed(1)} TU${winnerId === challenge.challenger_id ? wagerText : ''}`,
    JSON.stringify({ challengeId }),
    challenge.rival_id,
    winnerId === challenge.rival_id ? '🏆 You Won!' : winnerId ? '😢 You Lost' : '🤝 Tie',
    `${rivalScore.toFixed(1)} vs ${challengerScore.toFixed(1)} TU${winnerId === challenge.rival_id ? wagerText : ''}`,
    JSON.stringify({ challengeId })
  );
}

// =============================================================================
// DAILY JOBS
// =============================================================================

function expirePendingChallenges() {
  console.log('⏰ Expiring unanswered rival challenges...');
  
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
  
  const expired = db.prepare(`
    SELECT * FROM rivals WHERE status = 'pending' AND date(created_at) < ?
  `).all(threeDaysAgo);
  
  for (const challenge of expired) {
    // Refund challenger's wager
    if (challenge.wager_credits > 0) {
      db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?')
        .run(challenge.wager_credits, challenge.challenger_id);
    }
    
    db.prepare(`UPDATE rivals SET status = 'expired' WHERE id = ?`).run(challenge.id);
    
    // Notify challenger
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (?, 'rival', '⏰ Challenge Expired', 'Your challenge was not answered and has expired. Credits refunded.', ?)
    `).run(challenge.challenger_id, JSON.stringify({ challengeId: challenge.id, refunded: challenge.wager_credits }));
    
    console.log(`   Expired challenge ${challenge.id}, refunded ${challenge.wager_credits} credits`);
  }
  
  console.log(`   ✓ Expired ${expired.length} pending challenges`);
}

function expireDailyChallenges() {
  console.log('🎯 Expiring yesterday\'s challenges...');
  
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const result = db.prepare(`
    UPDATE daily_challenges 
    SET status = 'expired' 
    WHERE challenge_date < ? AND status = 'active'
  `).run(yesterday);
  
  console.log(`   ✓ Expired ${result.changes} challenges`);
}

function createWeeklySnapshots() {
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
  const users = db.prepare(`
    SELECT DISTINCT tp.user_id 
    FROM training_plans tp
    JOIN scheduled_workouts sw ON tp.id = sw.plan_id
    WHERE sw.status = 'completed'
  `).all();
  
  let created = 0;
  
  for (const { user_id } of users) {
    // Check if snapshot already exists
    const existing = db.prepare('SELECT id FROM muscle_history WHERE user_id = ? AND snapshot_date = ?')
      .get(user_id, weekStart);
    
    if (existing) continue;
    
    // Calculate muscle data
    const muscleData = db.prepare(`
      SELECT ea.muscle_id, SUM(ea.activation_percent * sw.actual_tu / 100) as activation
      FROM exercise_activations ea
      JOIN scheduled_workout_exercises swe ON ea.exercise_id = swe.exercise_id
      JOIN scheduled_workouts sw ON swe.workout_id = sw.id
      JOIN training_plans tp ON sw.plan_id = tp.id
      WHERE tp.user_id = ? AND sw.status = 'completed'
      GROUP BY ea.muscle_id
    `).all(user_id);
    
    const muscleMap = {};
    let total = 0;
    for (const m of muscleData) {
      muscleMap[m.muscle_id] = parseFloat(m.activation.toFixed(2));
      total += m.activation;
    }
    
    // Calculate balance score
    const groups = {};
    const muscles = db.prepare('SELECT id, muscle_group FROM muscles').all();
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
    
    db.prepare(`
      INSERT INTO muscle_history (user_id, snapshot_date, muscle_data, total_activation, balance_score)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, weekStart, JSON.stringify(muscleMap), total, balanceScore);
    
    created++;
  }
  
  console.log(`   ✓ Created ${created} snapshots`);
}

function sendDailyChallengeNotifications() {
  console.log('🎯 Sending daily challenge notifications...');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Get active users (worked out in last 7 days)
  const activeUsers = db.prepare(`
    SELECT id FROM users WHERE last_workout_date >= date('now', '-7 days')
  `).all();
  
  for (const { id } of activeUsers) {
    // Check if already notified today
    const notified = db.prepare(`
      SELECT id FROM notifications 
      WHERE user_id = ? AND type = 'daily_challenge_new' AND date(created_at) = ?
    `).get(id, today);
    
    if (!notified) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, body)
        VALUES (?, 'daily_challenge_new', '🎯 New Challenges!', 'Your daily challenges are ready!')
      `).run(id);
    }
  }
  
  console.log(`   ✓ Notified ${activeUsers.length} users`);
}

// =============================================================================
// WEEKLY JOBS
// =============================================================================

function snapshotWeeklyLeaderboard() {
  // If weekly leaderboard table doesn't exist yet, skip instead of failing the whole timer.
  try {
    db.prepare("SELECT 1 FROM leaderboard_weekly LIMIT 1").get();
  } catch (e) {
    const msg = (e && e.message) ? String(e.message) : "";
    if (msg.includes("no such table: leaderboard_weekly")) {
      console.warn("leaderboard_weekly missing; skip weekly snapshot");
      return;
    }
    throw e;
  }

  console.log('🏅 Snapshotting weekly leaderboard...');
  
  const weekStart = getWeekStart();
  

  const exists = db.prepare(
  	"SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
	).get("leaderboard_weekly");

	if (!exists) {
  		console.log("⚠️ leaderboard_weekly table missing; skipping weekly snapshot.");
  	return;
	};

  // Calculate and store rankings
  const result = db.prepare(`
    INSERT OR REPLACE INTO leaderboard_weekly (user_id, week_start, total_tu, total_workouts)
    SELECT 
      u.id,
      ? as week_start,
      COALESCE(SUM(sw.actual_tu), 0) as total_tu,
      COUNT(sw.id) as total_workouts
    FROM users u
    LEFT JOIN training_plans tp ON u.id = tp.user_id
    LEFT JOIN scheduled_workouts sw ON tp.id = sw.plan_id 
      AND sw.status = 'completed' 
      AND date(sw.completed_at) >= ?
    GROUP BY u.id
    HAVING total_tu > 0
  `).run(weekStart, weekStart);
  
  console.log(`   ✓ Updated ${result.changes} leaderboard entries`);
}

function updateAllTimeLeaderboard() {
  console.log('📊 Updating all-time leaderboard...');
  
  const result = db.prepare(`
    INSERT OR REPLACE INTO leaderboard_alltime (user_id, total_tu, total_workouts, longest_streak, archetypes_completed)
    SELECT 
      u.id,
      COALESCE(SUM(sw.actual_tu), 0),
      COUNT(DISTINCT sw.id),
      u.streak_longest,
      (SELECT COUNT(*) FROM training_plans WHERE user_id = u.id AND status = 'completed')
    FROM users u
    LEFT JOIN training_plans tp ON u.id = tp.user_id
    LEFT JOIN scheduled_workouts sw ON tp.id = sw.plan_id AND sw.status = 'completed'
    GROUP BY u.id
  `).run();
  
  console.log(`   ✓ Updated ${result.changes} all-time entries`);
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

const jobsToRun = options.jobType === 'all'
  ? [...jobGroups.hourly, ...jobGroups.daily, ...jobGroups.weekly]
  : jobGroups[options.jobType];

if (!jobsToRun) {
  exitFailure(logger, new Error(`Unknown job type: ${options.jobType}`));
}

if (options.dryRun) {
  logger.info('Dry-run enabled; jobs will not mutate data. Planned execution order:');
  for (const job of jobsToRun) {
    logger.info(` - ${job.name}`);
  }
  db.close();
  exitSuccess(logger, 'Dry-run complete');
}

try {
  for (const job of jobsToRun) {
    logger.info(`Running ${job.name}...`);
    job();
  }
  db.close();
  exitSuccess(logger, 'Jobs complete!');
} catch (error) {
  db.close();
  exitFailure(logger, error);
}
