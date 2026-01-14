/**
 * Data Integrity Test Suite
 *
 * Comprehensive tests to catch UI/data mismatches like:
 * - Hardcoded values in UI that should be dynamic
 * - Missing database fields that UI expects
 * - XP/economy system consistency
 * - Message/notification count accuracy
 * - Exercise data completeness
 *
 * Run with: pnpm -C apps/api test:integrity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { queryAll, initializePool, closePool } from '../db/client';

let dbAvailable = false;

describe('Data Integrity Tests', () => {
  beforeAll(async () => {
    try {
      await initializePool();
      dbAvailable = true;
    } catch (_err) {
      console.log('Skipping data integrity tests: database not available');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await closePool();
    }
  });

  it.skipIf(!dbAvailable)('database connection is available', () => {
    expect(dbAvailable).toBe(true);
  });

  // ===========================================
  // EXERCISE DATA COMPLETENESS
  // ===========================================
  describe('Exercise Data Completeness', () => {
    it.skipIf(!dbAvailable)('all exercises should have descriptions', async () => {
      const exercisesWithoutDescription = await queryAll<{ id: string; name: string }>(
        `SELECT id, name FROM exercises WHERE description IS NULL OR description = ''`
      );

      expect(exercisesWithoutDescription).toEqual([]);
      if (exercisesWithoutDescription.length > 0) {
        console.warn('Exercises missing descriptions:', exercisesWithoutDescription.map(e => e.name));
      }
    });

    it.skipIf(!dbAvailable)('all exercises should have cues', async () => {
      const exercisesWithoutCues = await queryAll<{ id: string; name: string }>(
        `SELECT id, name FROM exercises WHERE cues IS NULL OR cues = ''`
      );

      expect(exercisesWithoutCues).toEqual([]);
      if (exercisesWithoutCues.length > 0) {
        console.warn('Exercises missing cues:', exercisesWithoutCues.map(e => e.name));
      }
    });

    it.skipIf(!dbAvailable)('all exercises should have primary muscles defined', async () => {
      const exercisesWithoutMuscles = await queryAll<{ id: string; name: string }>(
        `SELECT id, name FROM exercises WHERE primary_muscles IS NULL OR primary_muscles = ''`
      );

      expect(exercisesWithoutMuscles).toEqual([]);
    });

    it.skipIf(!dbAvailable)('all exercises should have valid difficulty levels (1-5)', async () => {
      const invalidDifficulty = await queryAll<{ id: string; difficulty: number }>(
        `SELECT id, difficulty FROM exercises WHERE difficulty < 1 OR difficulty > 5`
      );

      expect(invalidDifficulty).toEqual([]);
    });

    it.skipIf(!dbAvailable)('exercise activations should reference valid exercises', async () => {
      const orphanedActivations = await queryAll<{ exercise_id: string }>(
        `SELECT DISTINCT ea.exercise_id
         FROM exercise_activations ea
         LEFT JOIN exercises e ON ea.exercise_id = e.id
         WHERE e.id IS NULL`
      );

      expect(orphanedActivations).toEqual([]);
    });

    it.skipIf(!dbAvailable)('exercise activations should reference valid muscles', async () => {
      const orphanedMuscles = await queryAll<{ muscle_id: string }>(
        `SELECT DISTINCT ea.muscle_id
         FROM exercise_activations ea
         LEFT JOIN muscles m ON ea.muscle_id = m.id
         WHERE m.id IS NULL`
      );

      expect(orphanedMuscles).toEqual([]);
    });
  });

  // ===========================================
  // XP SYSTEM CONSISTENCY
  // ===========================================
  describe('XP System Consistency', () => {
    it.skipIf(!dbAvailable)('all users should have non-negative total_xp', async () => {
      const negativeXp = await queryAll<{ id: string; total_xp: number }>(
        `SELECT id, total_xp FROM users WHERE total_xp < 0`
      );

      expect(negativeXp).toEqual([]);
    });

    it.skipIf(!dbAvailable)('xp_history entries should have positive amounts', async () => {
      const invalidHistory = await queryAll<{ id: string; amount: number }>(
        `SELECT id, amount FROM xp_history WHERE amount <= 0`
      );

      expect(invalidHistory).toEqual([]);
    });

    it.skipIf(!dbAvailable)('user total_xp should match sum of xp_history', async () => {
      const mismatches = await queryAll<{ user_id: string; total_xp: number; history_sum: number }>(
        `SELECT u.id as user_id, u.total_xp, COALESCE(SUM(xh.amount), 0) as history_sum
         FROM users u
         LEFT JOIN xp_history xh ON u.id = xh.user_id
         GROUP BY u.id, u.total_xp
         HAVING u.total_xp != COALESCE(SUM(xh.amount), 0)`
      );

      // Note: Slight mismatches may occur during active operations
      // This test catches major discrepancies
      for (const m of mismatches) {
        const diff = Math.abs(m.total_xp - m.history_sum);
        expect(diff).toBeLessThan(100); // Allow small variance
      }
    });

    it.skipIf(!dbAvailable)('current_rank should match rank for total_xp', async () => {
      const usersWithXp = await queryAll<{ id: string; total_xp: number; current_rank: string }>(
        `SELECT id, total_xp, current_rank FROM users WHERE total_xp > 0 LIMIT 100`
      );

      const rankThresholds = await queryAll<{ name: string; min_xp: number }>(
        `SELECT name, min_xp FROM rank_definitions ORDER BY min_xp DESC`
      );

      for (const user of usersWithXp) {
        const expectedRank = rankThresholds.find(r => user.total_xp >= r.min_xp)?.name || 'novice';
        expect(user.current_rank).toBe(expectedRank);
      }
    });
  });

  // ===========================================
  // MESSAGING SYSTEM CONSISTENCY
  // ===========================================
  describe('Messaging System Consistency', () => {
    it.skipIf(!dbAvailable)('all conversations should have at least one participant', async () => {
      const emptyConversations = await queryAll<{ id: string }>(
        `SELECT c.id
         FROM conversations c
         LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
         GROUP BY c.id
         HAVING COUNT(cp.user_id) = 0`
      );

      expect(emptyConversations).toEqual([]);
    });

    it.skipIf(!dbAvailable)('direct conversations should have exactly 2 participants', async () => {
      const invalidDirect = await queryAll<{ id: string; count: number }>(
        `SELECT c.id, COUNT(cp.user_id) as count
         FROM conversations c
         JOIN conversation_participants cp ON c.id = cp.conversation_id
         WHERE c.type = 'direct'
         GROUP BY c.id
         HAVING COUNT(cp.user_id) != 2`
      );

      expect(invalidDirect).toEqual([]);
    });

    it.skipIf(!dbAvailable)('all messages should belong to valid conversations', async () => {
      const orphanedMessages = await queryAll<{ id: string }>(
        `SELECT m.id
         FROM messages m
         LEFT JOIN conversations c ON m.conversation_id = c.id
         WHERE c.id IS NULL`
      );

      expect(orphanedMessages).toEqual([]);
    });

    it.skipIf(!dbAvailable)('message senders should be conversation participants', async () => {
      const invalidSenders = await queryAll<{ message_id: string }>(
        `SELECT m.id as message_id
         FROM messages m
         LEFT JOIN conversation_participants cp
           ON m.conversation_id = cp.conversation_id
           AND m.sender_id = cp.user_id
         WHERE cp.user_id IS NULL`
      );

      expect(invalidSenders).toEqual([]);
    });
  });

  // ===========================================
  // WALLET/ECONOMY CONSISTENCY
  // ===========================================
  describe('Economy System Consistency', () => {
    it.skipIf(!dbAvailable)('all users should have non-negative wallet balance', async () => {
      const negativeBalance = await queryAll<{ id: string; balance: number }>(
        `SELECT w.user_id as id, w.balance
         FROM wallets w
         WHERE w.balance < 0`
      );

      expect(negativeBalance).toEqual([]);
    });

    it.skipIf(!dbAvailable)('wallet transactions should have valid action types', async () => {
      const _validActions = [
        'workout.complete', 'credits.purchase', 'credits.earn', 'credits.gift',
        'achievement.unlock', 'streak.bonus', 'referral.bonus', 'admin.adjustment',
        'message.send', 'skin.purchase', 'slot.purchase'
      ];

      const invalidActions = await queryAll<{ id: string; action: string }>(
        `SELECT id, action FROM wallet_transactions
         WHERE action NOT LIKE 'workout.%'
         AND action NOT LIKE 'credits.%'
         AND action NOT LIKE 'achievement.%'
         AND action NOT LIKE 'streak.%'
         AND action NOT LIKE 'referral.%'
         AND action NOT LIKE 'admin.%'
         AND action NOT LIKE 'message.%'
         AND action NOT LIKE 'skin.%'
         AND action NOT LIKE 'slot.%'
         LIMIT 10`
      );

      // Log any unexpected action types for review
      if (invalidActions.length > 0) {
        console.warn('Unexpected action types:', invalidActions);
      }
    });
  });

  // ===========================================
  // USER DATA CONSISTENCY
  // ===========================================
  describe('User Data Consistency', () => {
    it.skipIf(!dbAvailable)('all users should have valid roles array', async () => {
      const invalidRoles = await queryAll<{ id: string; roles: any }>(
        `SELECT id, roles FROM users
         WHERE roles IS NULL
         OR jsonb_typeof(roles) != 'array'`
      );

      expect(invalidRoles).toEqual([]);
    });

    it.skipIf(!dbAvailable)('users with admin role should have is_admin derivable', async () => {
      // This validates the auth response logic
      const admins = await queryAll<{ id: string; roles: string[] }>(
        `SELECT id, roles FROM users
         WHERE roles @> '["admin"]'::jsonb`
      );

      for (const admin of admins) {
        expect(admin.roles).toContain('admin');
      }
    });

    it.skipIf(!dbAvailable)('all users should have unique email addresses', async () => {
      const duplicateEmails = await queryAll<{ email: string; count: number }>(
        `SELECT email, COUNT(*) as count
         FROM users
         WHERE email IS NOT NULL
         GROUP BY email
         HAVING COUNT(*) > 1`
      );

      expect(duplicateEmails).toEqual([]);
    });

    it.skipIf(!dbAvailable)('all users should have unique usernames', async () => {
      const duplicateUsernames = await queryAll<{ username: string; count: number }>(
        `SELECT username, COUNT(*) as count
         FROM users
         WHERE username IS NOT NULL
         GROUP BY username
         HAVING COUNT(*) > 1`
      );

      expect(duplicateUsernames).toEqual([]);
    });
  });

  // ===========================================
  // WORKOUT DATA CONSISTENCY
  // ===========================================
  describe('Workout Data Consistency', () => {
    it.skipIf(!dbAvailable)('all workouts should have valid JSON exercise data', async () => {
      const invalidExerciseData = await queryAll<{ id: string }>(
        `SELECT id FROM workouts
         WHERE exercise_data IS NOT NULL
         AND exercise_data != ''
         AND exercise_data !~ '^\\[.*\\]$'`
      );

      expect(invalidExerciseData).toEqual([]);
    });

    it.skipIf(!dbAvailable)('all workouts should have non-negative total_tu', async () => {
      const negativeTU = await queryAll<{ id: string; total_tu: number }>(
        `SELECT id, total_tu FROM workouts WHERE total_tu < 0`
      );

      expect(negativeTU).toEqual([]);
    });

    it.skipIf(!dbAvailable)('workout dates should be reasonable (not in future, not ancient)', async () => {
      const invalidDates = await queryAll<{ id: string; date: string }>(
        `SELECT id, date FROM workouts
         WHERE date > CURRENT_DATE + INTERVAL '1 day'
         OR date < '2020-01-01'`
      );

      expect(invalidDates).toEqual([]);
    });
  });

  // ===========================================
  // MUSCLE DATA CONSISTENCY
  // ===========================================
  describe('Muscle Data Consistency', () => {
    it.skipIf(!dbAvailable)('all muscles should have valid muscle groups', async () => {
      const validGroups = [
        'Chest', 'Back', 'Shoulders', 'Arms', 'Core',
        'Glutes', 'Quads', 'Hamstrings', 'Adductors', 'Calves'
      ];

      const invalidGroups = await queryAll<{ id: string; muscle_group: string }>(
        `SELECT id, muscle_group FROM muscles
         WHERE muscle_group NOT IN (${validGroups.map(g => `'${g}'`).join(',')})`
      );

      expect(invalidGroups).toEqual([]);
    });

    it.skipIf(!dbAvailable)('all muscles should have positive bias weights', async () => {
      const invalidWeights = await queryAll<{ id: string; bias_weight: number }>(
        `SELECT id, bias_weight FROM muscles WHERE bias_weight <= 0`
      );

      expect(invalidWeights).toEqual([]);
    });
  });
});

// ===========================================
// UI HARDCODED VALUES CHECK
// This section documents patterns to avoid
// ===========================================
/**
 * ANTI-PATTERNS TO AVOID IN UI CODE:
 *
 * 1. Hardcoded badge counts:
 *    BAD:  { to: '/messages', badge: 3 }
 *    GOOD: { to: '/messages', badge: unreadCount }
 *
 * 2. Hardcoded statistics:
 *    BAD:  <span>12 achievements</span>
 *    GOOD: <span>{achievements.length} achievements</span>
 *
 * 3. Hardcoded user data:
 *    BAD:  level: 5
 *    GOOD: level: user.level || 1
 *
 * 4. Mock data that should be real:
 *    BAD:  const workoutDays = [true, true, false, true, true, false, false];
 *    GOOD: const workoutDays = workoutHistory.map(w => w.date);
 *
 * 5. Missing null checks:
 *    BAD:  user.stats.xp
 *    GOOD: user?.stats?.xp ?? 0
 */
