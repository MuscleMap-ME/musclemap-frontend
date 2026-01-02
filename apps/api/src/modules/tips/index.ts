/**
 * Tips Module
 *
 * Provides contextual tips, insights, and milestone tracking for users.
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import { authenticateToken } from '../auth';
import { asyncHandler } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { z } from 'zod';

const log = loggers.db;

interface Tip {
  id: string;
  title: string | null;
  content: string;
  source: string | null;
  category: string;
  subcategory: string | null;
  trigger_type: string;
  trigger_value: string | null;
  display_context: string | null;
  times_shown: number;
  times_liked: number;
}

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  threshold: number;
  reward_type: string | null;
  reward_value: string | null;
}

interface UserMilestone {
  milestone_id: string;
  current_value: number;
  completed_at: string | null;
  reward_claimed: number;
}

interface UserStats {
  workouts_completed: number;
  exercises_done: number;
  total_reps: number;
  total_minutes: number;
}

interface WorkoutRow {
  date: string;
  exercise_data: string | null;
}

export const tipsService = {
  /**
   * Get a contextual tip for the current exercise
   */
  async getExerciseTip(exerciseId: string, userId: string): Promise<Tip | null> {
    // First try exercise-specific tips user hasn't seen
    let tip = await db.queryOne<Tip>(`
      SELECT t.* FROM tips t
      LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
      WHERE t.trigger_type = 'exercise'
        AND t.trigger_value = $2
        AND uts.tip_id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `, [userId, exerciseId]);

    if (!tip) {
      // Fall back to muscle-specific tips
      const exercise = await db.queryOne<{ primary_muscles: string | null }>(
        'SELECT primary_muscles FROM exercises WHERE id = $1',
        [exerciseId]
      );
      if (exercise?.primary_muscles) {
        const muscles = exercise.primary_muscles.split(',').map(m => m.trim());
        if (muscles.length > 0) {
          const placeholders = muscles.map((_, i) => `$${i + 2}`).join(',');
          tip = await db.queryOne<Tip>(`
            SELECT t.* FROM tips t
            LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
            WHERE t.trigger_type = 'muscle'
              AND t.trigger_value IN (${placeholders})
              AND uts.tip_id IS NULL
            ORDER BY RANDOM()
            LIMIT 1
          `, [userId, ...muscles]);
        }
      }
    }

    if (!tip) {
      // Fall back to random tips for during_exercise or between_sets contexts
      tip = await db.queryOne<Tip>(`
        SELECT t.* FROM tips t
        LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
        WHERE t.trigger_type = 'random'
          AND t.display_context IN ('during_exercise', 'between_sets')
          AND uts.tip_id IS NULL
        ORDER BY RANDOM()
        LIMIT 1
      `, [userId]);
    }

    if (!tip) {
      // If all tips have been seen, get a random one from exercise/muscle/random types
      tip = await db.queryOne<Tip>(`
        SELECT t.* FROM tips t
        WHERE t.trigger_type IN ('exercise', 'muscle', 'random')
          AND t.display_context IN ('during_exercise', 'between_sets')
        ORDER BY RANDOM()
        LIMIT 1
      `);
    }

    if (tip) {
      await this.markSeen(tip.id, userId);
    }

    return tip || null;
  },

  /**
   * Get a tip for workout completion
   */
  async getCompletionTip(userId: string, goals: string[]): Promise<{ tip: Tip | null; milestone: Milestone | null }> {
    // Check for milestone tips first
    const milestoneResult = await this.checkMilestones(userId);
    if (milestoneResult) {
      return milestoneResult;
    }

    // Goal-specific tip
    if (goals.length > 0) {
      for (const goal of goals) {
        const tip = await db.queryOne<Tip>(`
          SELECT t.* FROM tips t
          LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
          WHERE t.trigger_type = 'goal'
            AND t.trigger_value = $2
            AND t.display_context = 'post_workout'
            AND uts.tip_id IS NULL
          ORDER BY RANDOM()
          LIMIT 1
        `, [userId, goal]);

        if (tip) {
          await this.markSeen(tip.id, userId);
          return { tip, milestone: null };
        }
      }
    }

    // Random post-workout tip (unseen first)
    let tip = await db.queryOne<Tip>(`
      SELECT t.* FROM tips t
      LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
      WHERE t.display_context = 'post_workout'
        AND t.trigger_type != 'milestone'
        AND uts.tip_id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `, [userId]);

    if (!tip) {
      // Fall back to any post_workout tip
      tip = await db.queryOne<Tip>(`
        SELECT * FROM tips
        WHERE display_context = 'post_workout'
          AND trigger_type != 'milestone'
        ORDER BY RANDOM()
        LIMIT 1
      `);
    }

    if (tip) {
      await this.markSeen(tip.id, userId);
    }

    return { tip: tip || null, milestone: null };
  },

  /**
   * Get a daily tip for the dashboard
   */
  async getDailyTip(userId: string): Promise<Tip | null> {
    // Try dashboard-specific tips first
    let tip = await db.queryOne<Tip>(`
      SELECT t.* FROM tips t
      LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
      WHERE t.display_context = 'dashboard'
        AND uts.tip_id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `, [userId]);

    if (!tip) {
      // Fall back to motivation tips
      tip = await db.queryOne<Tip>(`
        SELECT t.* FROM tips t
        LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = $1
        WHERE t.category = 'motivation'
          AND t.trigger_type = 'random'
          AND uts.tip_id IS NULL
        ORDER BY RANDOM()
        LIMIT 1
      `, [userId]);
    }

    if (!tip) {
      // Fall back to any motivation tip
      tip = await db.queryOne<Tip>(`
        SELECT * FROM tips
        WHERE category = 'motivation'
          OR display_context = 'dashboard'
        ORDER BY RANDOM()
        LIMIT 1
      `);
    }

    if (tip) {
      await this.markSeen(tip.id, userId);
    }

    return tip || null;
  },

  /**
   * Check and return any newly achieved milestones
   */
  async checkMilestones(userId: string): Promise<{ tip: Tip | null; milestone: Milestone } | null> {
    // Get user stats
    const stats = await this.getUserStats(userId);
    const streak = await this.calculateStreak(userId);

    // Get all milestones
    const milestones = await db.queryAll<Milestone>('SELECT * FROM milestones ORDER BY threshold ASC');

    for (const m of milestones) {
      const userMilestone = await db.queryOne<UserMilestone>(`
        SELECT * FROM user_milestones WHERE user_id = $1 AND milestone_id = $2
      `, [userId, m.id]);

      // Already completed
      if (userMilestone?.completed_at) continue;

      // Check if threshold met
      let currentValue = 0;
      switch (m.metric) {
        case 'workouts_completed':
          currentValue = stats.workouts_completed;
          break;
        case 'exercises_done':
          currentValue = stats.exercises_done;
          break;
        case 'total_reps':
          currentValue = stats.total_reps;
          break;
        case 'total_minutes':
          currentValue = stats.total_minutes;
          break;
        case 'streak_days':
          currentValue = streak;
          break;
      }

      if (currentValue >= m.threshold) {
        // Mark complete
        await db.query(`
          INSERT INTO user_milestones (user_id, milestone_id, current_value, completed_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT(user_id, milestone_id) DO UPDATE SET
            current_value = EXCLUDED.current_value,
            completed_at = EXCLUDED.completed_at
        `, [userId, m.id, currentValue]);

        log.info('Milestone achieved', { userId, milestoneId: m.id, currentValue });

        // Get milestone tip
        const tip = await db.queryOne<Tip>(`
          SELECT * FROM tips WHERE trigger_type = 'milestone' AND trigger_value = $1
        `, [m.id]);

        if (tip) {
          await this.markSeen(tip.id, userId);
          return { milestone: m, tip };
        }

        // Return milestone without tip if no tip exists
        return { milestone: m, tip: null };
      }
    }

    return null;
  },

  /**
   * Get user workout stats for milestone calculation
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const workoutStats = await db.queryOne<{ workouts_completed: number; total_tu: number }>(`
      SELECT
        COUNT(*) as workouts_completed,
        COALESCE(SUM(total_tu), 0) as total_tu
      FROM workouts
      WHERE user_id = $1
    `, [userId]);

    // Calculate exercises done and total reps from exercise_data
    const workouts = await db.queryAll<{ exercise_data: string | null }>(`
      SELECT exercise_data FROM workouts WHERE user_id = $1
    `, [userId]);

    let exercisesDone = 0;
    let totalReps = 0;

    for (const workout of workouts) {
      if (workout.exercise_data) {
        try {
          const exercises = JSON.parse(workout.exercise_data);
          exercisesDone += exercises.length;
          for (const ex of exercises) {
            const reps = (ex.reps || 0) * (ex.sets || 1);
            totalReps += reps;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Estimate total minutes (assuming average 45 seconds per set + 60 seconds rest)
    const estimatedMinutes = Math.round((totalReps / 10) * 1.75); // rough estimate

    return {
      workouts_completed: workoutStats?.workouts_completed ?? 0,
      exercises_done: exercisesDone,
      total_reps: totalReps,
      total_minutes: estimatedMinutes,
    };
  },

  /**
   * Calculate current streak (consecutive days with workouts)
   */
  async calculateStreak(userId: string): Promise<number> {
    const workouts = await db.queryAll<{ date: string }>(`
      SELECT DISTINCT date FROM workouts
      WHERE user_id = $1
      ORDER BY date DESC
    `, [userId]);

    if (workouts.length === 0) return 0;

    const workoutDates = new Set(workouts.map(w => w.date));

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    // Check if worked out today
    if (workoutDates.has(today)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive previous days
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (workoutDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },

  /**
   * Mark a tip as seen by the user
   */
  async markSeen(tipId: string, userId: string): Promise<void> {
    await db.query(`
      INSERT INTO user_tips_seen (user_id, tip_id) VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, tipId]);

    await db.query(`
      UPDATE tips SET times_shown = times_shown + 1 WHERE id = $1
    `, [tipId]);
  },

  /**
   * Like a tip
   */
  async likeTip(tipId: string, userId: string): Promise<void> {
    await db.query(`
      UPDATE user_tips_seen SET liked = true WHERE user_id = $1 AND tip_id = $2
    `, [userId, tipId]);

    await db.query(`
      UPDATE tips SET times_liked = times_liked + 1 WHERE id = $1
    `, [tipId]);
  },

  /**
   * Get user's milestones with progress
   */
  async getMilestones(userId: string): Promise<(Milestone & { current_value: number; completed_at: string | null; progress: number })[]> {
    const stats = await this.getUserStats(userId);
    const streak = await this.calculateStreak(userId);

    const milestones = await db.queryAll<Milestone & { current_value: number | null; completed_at: string | null }>(`
      SELECT m.*, um.current_value, um.completed_at
      FROM milestones m
      LEFT JOIN user_milestones um ON um.milestone_id = m.id AND um.user_id = $1
      ORDER BY m.threshold
    `, [userId]);

    return milestones.map(m => {
      let currentValue = m.current_value || 0;

      // Calculate current value based on metric if not completed
      if (!m.completed_at) {
        switch (m.metric) {
          case 'workouts_completed':
            currentValue = stats.workouts_completed;
            break;
          case 'exercises_done':
            currentValue = stats.exercises_done;
            break;
          case 'total_reps':
            currentValue = stats.total_reps;
            break;
          case 'total_minutes':
            currentValue = stats.total_minutes;
            break;
          case 'streak_days':
            currentValue = streak;
            break;
        }
      }

      const progress = Math.min(100, (currentValue / m.threshold) * 100);

      return {
        ...m,
        current_value: currentValue,
        progress,
      };
    });
  },

  /**
   * Get tips the user has liked
   */
  async getLikedTips(userId: string, limit: number = 20, offset: number = 0): Promise<Tip[]> {
    return db.queryAll<Tip>(`
      SELECT t.* FROM tips t
      JOIN user_tips_seen uts ON uts.tip_id = t.id
      WHERE uts.user_id = $1 AND uts.liked = true
      ORDER BY uts.seen_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
  },
};

/**
 * Router
 */
export const tipsRouter = Router();

// Get tip for current exercise
tipsRouter.get(
  '/exercise/:exerciseId',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const tip = await tipsService.getExerciseTip(req.params.exerciseId, req.user!.userId);
    res.json({ data: tip });
  })
);

// Get workout completion tip
const completionSchema = z.object({
  goals: z.array(z.string()).optional(),
});

tipsRouter.post(
  '/completion',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { goals } = completionSchema.parse(req.body);
    const result = await tipsService.getCompletionTip(req.user!.userId, goals || []);
    res.json({ data: result });
  })
);

// Get daily dashboard tip
tipsRouter.get(
  '/daily',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const tip = await tipsService.getDailyTip(req.user!.userId);
    res.json({ data: tip });
  })
);

// Like a tip
tipsRouter.post(
  '/:tipId/like',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    await tipsService.likeTip(req.params.tipId, req.user!.userId);
    res.json({ success: true });
  })
);

// Get user milestones
tipsRouter.get(
  '/milestones',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const milestones = await tipsService.getMilestones(req.user!.userId);
    res.json({ data: milestones });
  })
);

// Get user's liked tips
tipsRouter.get(
  '/liked',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const tips = await tipsService.getLikedTips(req.user!.userId, limit, offset);
    res.json({ data: tips, meta: { limit, offset } });
  })
);

// Get user stats (for debugging/testing)
tipsRouter.get(
  '/stats',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await tipsService.getUserStats(req.user!.userId);
    const streak = await tipsService.calculateStreak(req.user!.userId);
    res.json({ data: { ...stats, streak } });
  })
);
