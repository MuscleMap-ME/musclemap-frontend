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
  getExerciseTip(exerciseId: string, userId: string): Tip | null {
    // First try exercise-specific tips user hasn't seen
    let tip = db.prepare(`
      SELECT t.* FROM tips t
      LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
      WHERE t.trigger_type = 'exercise'
        AND t.trigger_value = ?
        AND uts.tip_id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `).get(userId, exerciseId) as Tip | undefined;

    if (!tip) {
      // Fall back to muscle-specific tips
      const exercise = db.prepare('SELECT primary_muscles FROM exercises WHERE id = ?').get(exerciseId) as { primary_muscles: string | null } | undefined;
      if (exercise?.primary_muscles) {
        const muscles = exercise.primary_muscles.split(',').map(m => m.trim());
        if (muscles.length > 0) {
          const placeholders = muscles.map(() => '?').join(',');
          tip = db.prepare(`
            SELECT t.* FROM tips t
            LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
            WHERE t.trigger_type = 'muscle'
              AND t.trigger_value IN (${placeholders})
              AND uts.tip_id IS NULL
            ORDER BY RANDOM()
            LIMIT 1
          `).get(userId, ...muscles) as Tip | undefined;
        }
      }
    }

    if (!tip) {
      // Fall back to random tips for during_exercise or between_sets contexts
      tip = db.prepare(`
        SELECT t.* FROM tips t
        LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
        WHERE t.trigger_type = 'random'
          AND t.display_context IN ('during_exercise', 'between_sets')
          AND uts.tip_id IS NULL
        ORDER BY RANDOM()
        LIMIT 1
      `).get(userId) as Tip | undefined;
    }

    if (!tip) {
      // If all tips have been seen, get a random one from exercise/muscle/random types
      tip = db.prepare(`
        SELECT t.* FROM tips t
        WHERE t.trigger_type IN ('exercise', 'muscle', 'random')
          AND t.display_context IN ('during_exercise', 'between_sets')
        ORDER BY RANDOM()
        LIMIT 1
      `).get() as Tip | undefined;
    }

    if (tip) {
      this.markSeen(tip.id, userId);
    }

    return tip || null;
  },

  /**
   * Get a tip for workout completion
   */
  getCompletionTip(userId: string, goals: string[]): { tip: Tip | null; milestone: Milestone | null } {
    // Check for milestone tips first
    const milestoneResult = this.checkMilestones(userId);
    if (milestoneResult) {
      return milestoneResult;
    }

    // Goal-specific tip
    if (goals.length > 0) {
      for (const goal of goals) {
        const tip = db.prepare(`
          SELECT t.* FROM tips t
          LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
          WHERE t.trigger_type = 'goal'
            AND t.trigger_value = ?
            AND t.display_context = 'post_workout'
            AND uts.tip_id IS NULL
          ORDER BY RANDOM()
          LIMIT 1
        `).get(userId, goal) as Tip | undefined;

        if (tip) {
          this.markSeen(tip.id, userId);
          return { tip, milestone: null };
        }
      }
    }

    // Random post-workout tip (unseen first)
    let tip = db.prepare(`
      SELECT t.* FROM tips t
      LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
      WHERE t.display_context = 'post_workout'
        AND t.trigger_type != 'milestone'
        AND uts.tip_id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `).get(userId) as Tip | undefined;

    if (!tip) {
      // Fall back to any post_workout tip
      tip = db.prepare(`
        SELECT * FROM tips
        WHERE display_context = 'post_workout'
          AND trigger_type != 'milestone'
        ORDER BY RANDOM()
        LIMIT 1
      `).get() as Tip | undefined;
    }

    if (tip) {
      this.markSeen(tip.id, userId);
    }

    return { tip: tip || null, milestone: null };
  },

  /**
   * Get a daily tip for the dashboard
   */
  getDailyTip(userId: string): Tip | null {
    // Try dashboard-specific tips first
    let tip = db.prepare(`
      SELECT t.* FROM tips t
      LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
      WHERE t.display_context = 'dashboard'
        AND uts.tip_id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `).get(userId) as Tip | undefined;

    if (!tip) {
      // Fall back to motivation tips
      tip = db.prepare(`
        SELECT t.* FROM tips t
        LEFT JOIN user_tips_seen uts ON uts.tip_id = t.id AND uts.user_id = ?
        WHERE t.category = 'motivation'
          AND t.trigger_type = 'random'
          AND uts.tip_id IS NULL
        ORDER BY RANDOM()
        LIMIT 1
      `).get(userId) as Tip | undefined;
    }

    if (!tip) {
      // Fall back to any motivation tip
      tip = db.prepare(`
        SELECT * FROM tips
        WHERE category = 'motivation'
          OR display_context = 'dashboard'
        ORDER BY RANDOM()
        LIMIT 1
      `).get() as Tip | undefined;
    }

    if (tip) {
      this.markSeen(tip.id, userId);
    }

    return tip || null;
  },

  /**
   * Check and return any newly achieved milestones
   */
  checkMilestones(userId: string): { tip: Tip | null; milestone: Milestone } | null {
    // Get user stats
    const stats = this.getUserStats(userId);
    const streak = this.calculateStreak(userId);

    // Get all milestones
    const milestones = db.prepare('SELECT * FROM milestones ORDER BY threshold ASC').all() as Milestone[];

    for (const m of milestones) {
      const userMilestone = db.prepare(`
        SELECT * FROM user_milestones WHERE user_id = ? AND milestone_id = ?
      `).get(userId, m.id) as UserMilestone | undefined;

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
        db.prepare(`
          INSERT INTO user_milestones (user_id, milestone_id, current_value, completed_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, milestone_id) DO UPDATE SET
            current_value = excluded.current_value,
            completed_at = excluded.completed_at
        `).run(userId, m.id, currentValue);

        log.info('Milestone achieved', { userId, milestoneId: m.id, currentValue });

        // Get milestone tip
        const tip = db.prepare(`
          SELECT * FROM tips WHERE trigger_type = 'milestone' AND trigger_value = ?
        `).get(m.id) as Tip | undefined;

        if (tip) {
          this.markSeen(tip.id, userId);
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
  getUserStats(userId: string): UserStats {
    const workoutStats = db.prepare(`
      SELECT
        COUNT(*) as workouts_completed,
        COALESCE(SUM(total_tu), 0) as total_tu
      FROM workouts
      WHERE user_id = ?
    `).get(userId) as { workouts_completed: number; total_tu: number };

    // Calculate exercises done and total reps from exercise_data
    const workouts = db.prepare(`
      SELECT exercise_data FROM workouts WHERE user_id = ?
    `).all(userId) as { exercise_data: string | null }[];

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
      workouts_completed: workoutStats.workouts_completed,
      exercises_done: exercisesDone,
      total_reps: totalReps,
      total_minutes: estimatedMinutes,
    };
  },

  /**
   * Calculate current streak (consecutive days with workouts)
   */
  calculateStreak(userId: string): number {
    const workouts = db.prepare(`
      SELECT DISTINCT date FROM workouts
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(userId) as { date: string }[];

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
  markSeen(tipId: string, userId: string): void {
    db.prepare(`
      INSERT OR IGNORE INTO user_tips_seen (user_id, tip_id) VALUES (?, ?)
    `).run(userId, tipId);

    db.prepare(`
      UPDATE tips SET times_shown = times_shown + 1 WHERE id = ?
    `).run(tipId);
  },

  /**
   * Like a tip
   */
  likeTip(tipId: string, userId: string): void {
    db.prepare(`
      UPDATE user_tips_seen SET liked = 1 WHERE user_id = ? AND tip_id = ?
    `).run(userId, tipId);

    db.prepare(`
      UPDATE tips SET times_liked = times_liked + 1 WHERE id = ?
    `).run(tipId);
  },

  /**
   * Get user's milestones with progress
   */
  getMilestones(userId: string): (Milestone & { current_value: number; completed_at: string | null; progress: number })[] {
    const stats = this.getUserStats(userId);
    const streak = this.calculateStreak(userId);

    const milestones = db.prepare(`
      SELECT m.*, um.current_value, um.completed_at
      FROM milestones m
      LEFT JOIN user_milestones um ON um.milestone_id = m.id AND um.user_id = ?
      ORDER BY m.threshold
    `).all(userId) as (Milestone & { current_value: number | null; completed_at: string | null })[];

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
  getLikedTips(userId: string, limit: number = 20, offset: number = 0): Tip[] {
    return db.prepare(`
      SELECT t.* FROM tips t
      JOIN user_tips_seen uts ON uts.tip_id = t.id
      WHERE uts.user_id = ? AND uts.liked = 1
      ORDER BY uts.seen_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as Tip[];
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
    const tip = tipsService.getExerciseTip(req.params.exerciseId, req.user!.userId);
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
    const result = tipsService.getCompletionTip(req.user!.userId, goals || []);
    res.json({ data: result });
  })
);

// Get daily dashboard tip
tipsRouter.get(
  '/daily',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const tip = tipsService.getDailyTip(req.user!.userId);
    res.json({ data: tip });
  })
);

// Like a tip
tipsRouter.post(
  '/:tipId/like',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    tipsService.likeTip(req.params.tipId, req.user!.userId);
    res.json({ success: true });
  })
);

// Get user milestones
tipsRouter.get(
  '/milestones',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const milestones = tipsService.getMilestones(req.user!.userId);
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
    const tips = tipsService.getLikedTips(req.user!.userId, limit, offset);
    res.json({ data: tips, meta: { limit, offset } });
  })
);

// Get user stats (for debugging/testing)
tipsRouter.get(
  '/stats',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const stats = tipsService.getUserStats(req.user!.userId);
    const streak = tipsService.calculateStreak(req.user!.userId);
    res.json({ data: { ...stats, streak } });
  })
);
