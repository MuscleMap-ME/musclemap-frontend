/**
 * Challenges Service
 *
 * Manages daily and weekly challenges:
 * - Daily challenges: 3 per day (easy, medium, hard)
 * - Weekly challenges: 1 per week
 * - Auto-progress tracking
 * - Reward claiming
 */

import crypto from 'crypto';
import { db, queryOne, queryAll, query } from '../../db/client';
import { creditService } from '../economy/credit.service';
import { xpService } from '../ranks/xp.service';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Challenge type definitions
export const CHALLENGE_TYPES = {
  LOG_SETS: {
    id: 'log_sets',
    title: 'Rep Master',
    description: 'Log {target} sets today',
    icon: '💪',
    category: 'workout',
    targets: { easy: 3, medium: 5, hard: 10 },
    rewards: {
      xp: { easy: 50, medium: 100, hard: 200 },
      credits: { easy: 5, medium: 10, hard: 25 },
    },
    trackingKey: 'setsLogged',
  },
  WORKOUT_STREAK: {
    id: 'workout_streak',
    title: 'Streak Builder',
    description: 'Complete {target} workout(s) today',
    icon: '🔥',
    category: 'consistency',
    targets: { easy: 1, medium: 2, hard: 3 },
    rewards: {
      xp: { easy: 75, medium: 150, hard: 300 },
      credits: { easy: 10, medium: 20, hard: 50 },
    },
    trackingKey: 'workoutsCompleted',
  },
  HIT_MUSCLE_GROUPS: {
    id: 'hit_muscle_groups',
    title: 'Full Body Focus',
    description: 'Train {target} different muscle group(s)',
    icon: '🎯',
    category: 'variety',
    targets: { easy: 2, medium: 3, hard: 5 },
    rewards: {
      xp: { easy: 60, medium: 120, hard: 250 },
      credits: { easy: 8, medium: 15, hard: 35 },
    },
    trackingKey: 'muscleGroupsHit',
  },
  HIGH_FIVE_FRIENDS: {
    id: 'high_five_friends',
    title: 'Social Butterfly',
    description: 'Send {target} high five(s) to friends',
    icon: '🖐️',
    category: 'social',
    targets: { easy: 1, medium: 3, hard: 5 },
    rewards: {
      xp: { easy: 30, medium: 60, hard: 100 },
      credits: { easy: 3, medium: 8, hard: 15 },
    },
    trackingKey: 'highFivesSent',
  },
  BEAT_PR: {
    id: 'beat_pr',
    title: 'PR Crusher',
    description: 'Set {target} new personal record(s)',
    icon: '🏆',
    category: 'achievement',
    targets: { easy: 1, medium: 2, hard: 3 },
    rewards: {
      xp: { easy: 100, medium: 200, hard: 400 },
      credits: { easy: 15, medium: 30, hard: 75 },
    },
    trackingKey: 'prsSet',
  },
  COMPLETE_WORKOUT: {
    id: 'complete_workout',
    title: 'Session Complete',
    description: 'Finish {target} complete workout session(s)',
    icon: '✅',
    category: 'workout',
    targets: { easy: 1, medium: 2, hard: 3 },
    rewards: {
      xp: { easy: 80, medium: 160, hard: 320 },
      credits: { easy: 12, medium: 25, hard: 60 },
    },
    trackingKey: 'workoutsCompleted',
  },
  EXPLORE_EXERCISE: {
    id: 'explore_exercise',
    title: 'Exercise Explorer',
    description: "Try {target} new exercise(s) you haven't done before",
    icon: '💡',
    category: 'variety',
    targets: { easy: 1, medium: 2, hard: 4 },
    rewards: {
      xp: { easy: 40, medium: 80, hard: 180 },
      credits: { easy: 5, medium: 12, hard: 30 },
    },
    trackingKey: 'newExercisesTried',
  },
  EARN_XP: {
    id: 'earn_xp',
    title: 'XP Hunter',
    description: 'Earn {target} XP today',
    icon: '⭐',
    category: 'achievement',
    targets: { easy: 100, medium: 250, hard: 500 },
    rewards: {
      xp: { easy: 25, medium: 50, hard: 100 },
      credits: { easy: 5, medium: 10, hard: 20 },
    },
    trackingKey: 'xpEarned',
  },
  TOTAL_VOLUME: {
    id: 'total_volume',
    title: 'Volume King',
    description: 'Lift {target} total lbs/kg today',
    icon: '💪',
    category: 'workout',
    targets: { easy: 1000, medium: 5000, hard: 10000 },
    rewards: {
      xp: { easy: 60, medium: 150, hard: 300 },
      credits: { easy: 8, medium: 20, hard: 45 },
    },
    trackingKey: 'totalVolume',
  },
};

const CHALLENGE_TYPE_IDS = Object.keys(CHALLENGE_TYPES);
type Difficulty = 'easy' | 'medium' | 'hard';

interface Challenge {
  id: string;
  userId: string;
  challengeDate: string;
  challengeType: string;
  difficulty: Difficulty;
  targetValue: number;
  currentProgress: number;
  isComplete: boolean;
  isClaimed: boolean;
  xpReward: number;
  creditReward: number;
  expiresAt: Date;
  title: string;
  description: string;
  icon: string;
  percentage: number;
}

interface WeeklyChallenge {
  id: string;
  userId: string;
  weekStart: string;
  challengeType: string;
  targetValue: number;
  currentProgress: number;
  isComplete: boolean;
  isClaimed: boolean;
  xpReward: number;
  creditReward: number;
  expiresAt: Date;
  title: string;
  description: string;
  icon: string;
  percentage: number;
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function getMidnight(date: Date = new Date(), daysOffset: number = 1): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return getDateString(d);
}

function getEndOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Seeded random for deterministic challenge selection
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function formatDescription(template: string, target: number): string {
  return template.replace('{target}', target.toLocaleString());
}

export const challengesService = {
  /**
   * Get today's daily challenges (generates if needed)
   */
  async getDailyChallenges(userId: string): Promise<Challenge[]> {
    const today = getDateString();

    // Check for existing challenges
    let challenges = await queryAll<{
      id: string;
      user_id: string;
      challenge_date: string;
      challenge_type: string;
      difficulty: string;
      target_value: number;
      current_progress: number;
      is_complete: boolean;
      is_claimed: boolean;
      xp_reward: number;
      credit_reward: number;
      expires_at: Date;
    }>(
      `SELECT * FROM daily_challenges
       WHERE user_id = $1 AND challenge_date = $2
       ORDER BY difficulty`,
      [userId, today]
    );

    if (challenges.length === 0) {
      // Generate new challenges
      await this.generateDailyChallenges(userId, new Date());
      challenges = await queryAll(
        `SELECT * FROM daily_challenges
         WHERE user_id = $1 AND challenge_date = $2
         ORDER BY difficulty`,
        [userId, today]
      );
    }

    return challenges.map((c) => this.formatChallenge(c));
  },

  /**
   * Generate daily challenges for a user
   */
  async generateDailyChallenges(userId: string, date: Date = new Date()): Promise<void> {
    const dateStr = getDateString(date);
    const seed = hashCode(`${userId}-${dateStr}`);
    const random = seededRandom(seed);

    // Shuffle challenge types
    const typeIds = [...CHALLENGE_TYPE_IDS];
    for (let i = typeIds.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [typeIds[i], typeIds[j]] = [typeIds[j], typeIds[i]];
    }

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const expiresAt = getMidnight(date, 1);

    for (let i = 0; i < 3; i++) {
      const typeKey = typeIds[i] as keyof typeof CHALLENGE_TYPES;
      const challengeType = CHALLENGE_TYPES[typeKey];
      const difficulty = difficulties[i];
      const target = challengeType.targets[difficulty];
      const xpReward = challengeType.rewards.xp[difficulty];
      const creditReward = challengeType.rewards.credits[difficulty];

      await query(
        `INSERT INTO daily_challenges
         (user_id, challenge_date, challenge_type, difficulty, target_value, xp_reward, credit_reward, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, challenge_date, difficulty) DO NOTHING`,
        [userId, dateStr, challengeType.id, difficulty, target, xpReward, creditReward, expiresAt]
      );
    }

    log.info({ userId, date: dateStr }, 'Daily challenges generated');
  },

  /**
   * Update challenge progress
   */
  async updateProgress(
    userId: string,
    trackingKey: string,
    increment: number = 1
  ): Promise<{ updatedChallenges: Array<{ id: string; newProgress: number; isComplete: boolean }> }> {
    const today = getDateString();

    // Find challenges that track this key
    const matchingTypes = Object.entries(CHALLENGE_TYPES)
      .filter(([_, def]) => def.trackingKey === trackingKey)
      .map(([_, def]) => def.id);

    if (matchingTypes.length === 0) {
      return { updatedChallenges: [] };
    }

    // Update progress
    const results = await queryAll<{
      id: string;
      current_progress: number;
      target_value: number;
      is_complete: boolean;
    }>(
      `UPDATE daily_challenges
       SET current_progress = LEAST(current_progress + $1, target_value),
           is_complete = (current_progress + $1 >= target_value)
       WHERE user_id = $2
         AND challenge_date = $3
         AND challenge_type = ANY($4)
         AND NOT is_claimed
       RETURNING id, current_progress, target_value, is_complete`,
      [increment, userId, today, matchingTypes]
    );

    // Also update weekly challenge if applicable
    const weekStart = getWeekStart();
    await query(
      `UPDATE weekly_challenges
       SET current_progress = LEAST(current_progress + $1, target_value),
           is_complete = (current_progress + $1 >= target_value)
       WHERE user_id = $2
         AND week_start = $3
         AND challenge_type = ANY($4)
         AND NOT is_claimed`,
      [increment, userId, weekStart, matchingTypes]
    );

    return {
      updatedChallenges: results.map((r) => ({
        id: r.id,
        newProgress: r.current_progress,
        isComplete: r.is_complete,
      })),
    };
  },

  /**
   * Claim a completed challenge reward
   */
  async claimChallenge(userId: string, challengeId: string): Promise<{ credits: number; xp: number }> {
    const challenge = await queryOne<{
      id: string;
      user_id: string;
      challenge_type: string;
      is_complete: boolean;
      is_claimed: boolean;
      xp_reward: number;
      credit_reward: number;
    }>('SELECT * FROM daily_challenges WHERE id = $1 AND user_id = $2', [challengeId, userId]);

    if (!challenge) {
      throw new NotFoundError('Challenge not found');
    }

    if (!challenge.is_complete) {
      throw new ValidationError('Challenge not complete');
    }

    if (challenge.is_claimed) {
      throw new ValidationError('Challenge already claimed');
    }

    // Award credits
    const idempotencyKey = `challenge-claim:${challengeId}`;
    await creditService.addCredits(
      userId,
      challenge.credit_reward,
      'challenge_complete',
      { challengeId, challengeType: challenge.challenge_type },
      idempotencyKey
    );

    // Award XP
    await xpService.awardXp({
      userId,
      amount: challenge.xp_reward,
      sourceType: 'achievement',
      sourceId: `challenge:${challengeId}`,
      reason: `Daily challenge completed: ${challenge.challenge_type}`,
      metadata: { challengeId, challengeType: challenge.challenge_type },
    });

    // Mark as claimed
    await query(
      `UPDATE daily_challenges SET is_claimed = TRUE, claimed_at = NOW()
       WHERE id = $1`,
      [challengeId]
    );

    log.info({ userId, challengeId, credits: challenge.credit_reward, xp: challenge.xp_reward }, 'Challenge claimed');

    return {
      credits: challenge.credit_reward,
      xp: challenge.xp_reward,
    };
  },

  /**
   * Get weekly challenge (generates if needed)
   */
  async getWeeklyChallenge(userId: string): Promise<WeeklyChallenge | null> {
    const weekStart = getWeekStart();

    let challenge = await queryOne<{
      id: string;
      user_id: string;
      week_start: string;
      challenge_type: string;
      target_value: number;
      current_progress: number;
      is_complete: boolean;
      is_claimed: boolean;
      xp_reward: number;
      credit_reward: number;
      expires_at: Date;
    }>(
      `SELECT * FROM weekly_challenges
       WHERE user_id = $1 AND week_start = $2`,
      [userId, weekStart]
    );

    if (!challenge) {
      // Generate weekly challenge
      await this.generateWeeklyChallenge(userId);
      challenge = await queryOne(
        `SELECT * FROM weekly_challenges
         WHERE user_id = $1 AND week_start = $2`,
        [userId, weekStart]
      );
    }

    if (!challenge) return null;

    const typeDef = Object.values(CHALLENGE_TYPES).find((t) => t.id === challenge!.challenge_type);

    return {
      id: challenge.id,
      userId: challenge.user_id,
      weekStart: challenge.week_start,
      challengeType: challenge.challenge_type,
      targetValue: challenge.target_value,
      currentProgress: challenge.current_progress,
      isComplete: challenge.is_complete,
      isClaimed: challenge.is_claimed,
      xpReward: challenge.xp_reward,
      creditReward: challenge.credit_reward,
      expiresAt: challenge.expires_at,
      title: typeDef?.title || 'Weekly Challenge',
      description: formatDescription(typeDef?.description || '', challenge.target_value),
      icon: typeDef?.icon || '🎯',
      percentage: Math.min(100, Math.round((challenge.current_progress / challenge.target_value) * 100)),
    };
  },

  /**
   * Generate weekly challenge
   */
  async generateWeeklyChallenge(userId: string, date: Date = new Date()): Promise<void> {
    const weekStart = getWeekStart(date);
    const seed = hashCode(`${userId}-${weekStart}-weekly`);
    const random = seededRandom(seed);

    // Pick a random challenge type
    const typeIndex = Math.floor(random() * CHALLENGE_TYPE_IDS.length);
    const typeKey = CHALLENGE_TYPE_IDS[typeIndex] as keyof typeof CHALLENGE_TYPES;
    const challengeType = CHALLENGE_TYPES[typeKey];

    // Weekly target is 3x hard difficulty
    const target = challengeType.targets.hard * 3;
    const xpReward = challengeType.rewards.xp.hard * 5;
    const creditReward = challengeType.rewards.credits.hard * 5;
    const expiresAt = getEndOfWeek(date);

    await query(
      `INSERT INTO weekly_challenges
       (user_id, week_start, challenge_type, target_value, xp_reward, credit_reward, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, week_start) DO NOTHING`,
      [userId, weekStart, challengeType.id, target, xpReward, creditReward, expiresAt]
    );

    log.info({ userId, weekStart }, 'Weekly challenge generated');
  },

  /**
   * Claim weekly challenge reward
   */
  async claimWeeklyChallenge(userId: string): Promise<{ credits: number; xp: number }> {
    const weekStart = getWeekStart();

    const challenge = await queryOne<{
      id: string;
      is_complete: boolean;
      is_claimed: boolean;
      xp_reward: number;
      credit_reward: number;
      challenge_type: string;
    }>(
      `SELECT * FROM weekly_challenges
       WHERE user_id = $1 AND week_start = $2`,
      [userId, weekStart]
    );

    if (!challenge) {
      throw new NotFoundError('Weekly challenge not found');
    }

    if (!challenge.is_complete) {
      throw new ValidationError('Challenge not complete');
    }

    if (challenge.is_claimed) {
      throw new ValidationError('Challenge already claimed');
    }

    // Award credits
    const idempotencyKey = `weekly-challenge-claim:${userId}:${weekStart}`;
    await creditService.addCredits(
      userId,
      challenge.credit_reward,
      'challenge_complete',
      { type: 'weekly', challengeType: challenge.challenge_type },
      idempotencyKey
    );

    // Award XP
    await xpService.awardXp({
      userId,
      amount: challenge.xp_reward,
      sourceType: 'achievement',
      sourceId: `weekly-challenge:${weekStart}`,
      reason: `Weekly challenge completed: ${challenge.challenge_type}`,
      metadata: { type: 'weekly', challengeType: challenge.challenge_type },
    });

    // Mark as claimed
    await query(
      `UPDATE weekly_challenges SET is_claimed = TRUE, claimed_at = NOW()
       WHERE id = $1`,
      [challenge.id]
    );

    log.info({ userId, credits: challenge.credit_reward, xp: challenge.xp_reward }, 'Weekly challenge claimed');

    return {
      credits: challenge.credit_reward,
      xp: challenge.xp_reward,
    };
  },

  /**
   * Get challenge history
   */
  async getHistory(
    userId: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    challengeType: string;
    difficulty: string;
    date: string;
    wasCompleted: boolean;
    wasClaimed: boolean;
    credits: number;
    xp: number;
  }>> {
    const rows = await queryAll<{
      id: string;
      challenge_type: string;
      difficulty: string;
      challenge_date: string;
      is_complete: boolean;
      is_claimed: boolean;
      credit_reward: number;
      xp_reward: number;
    }>(
      `SELECT id, challenge_type, difficulty, challenge_date, is_complete, is_claimed, credit_reward, xp_reward
       FROM daily_challenges
       WHERE user_id = $1
       ORDER BY challenge_date DESC, difficulty
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      challengeType: r.challenge_type,
      difficulty: r.difficulty,
      date: r.challenge_date,
      wasCompleted: r.is_complete,
      wasClaimed: r.is_claimed,
      credits: r.credit_reward,
      xp: r.xp_reward,
    }));
  },

  /**
   * Format challenge from DB row
   */
  formatChallenge(row: {
    id: string;
    user_id: string;
    challenge_date: string;
    challenge_type: string;
    difficulty: string;
    target_value: number;
    current_progress: number;
    is_complete: boolean;
    is_claimed: boolean;
    xp_reward: number;
    credit_reward: number;
    expires_at: Date;
  }): Challenge {
    const typeDef = Object.values(CHALLENGE_TYPES).find((t) => t.id === row.challenge_type);

    return {
      id: row.id,
      userId: row.user_id,
      challengeDate: row.challenge_date,
      challengeType: row.challenge_type,
      difficulty: row.difficulty as Difficulty,
      targetValue: row.target_value,
      currentProgress: row.current_progress,
      isComplete: row.is_complete,
      isClaimed: row.is_claimed,
      xpReward: row.xp_reward,
      creditReward: row.credit_reward,
      expiresAt: row.expires_at,
      title: typeDef?.title || 'Challenge',
      description: formatDescription(typeDef?.description || '', row.target_value),
      icon: typeDef?.icon || '🎯',
      percentage: Math.min(100, Math.round((row.current_progress / row.target_value) * 100)),
    };
  },

  /**
   * Get challenge type definitions
   */
  getChallengeTypes(): typeof CHALLENGE_TYPES {
    return CHALLENGE_TYPES;
  },
};
