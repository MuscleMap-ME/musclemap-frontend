/**
 * Challenge Progress Middleware
 *
 * Automatically updates challenge progress when relevant actions occur:
 * - Workout completion -> LOG_SETS, COMPLETE_WORKOUT, HIT_MUSCLE_GROUPS, TOTAL_VOLUME
 * - Set logged -> LOG_SETS, TOTAL_VOLUME
 * - PR set -> BEAT_PR
 * - High five sent -> HIGH_FIVE_FRIENDS
 * - XP earned -> EARN_XP
 * - New exercise tried -> EXPLORE_EXERCISE
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { challengesService } from './challenges.service';
import { streaksService } from './streaks.service';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Track which routes to intercept for progress updates
interface ProgressHook {
  route: string;
  method: 'POST' | 'PUT' | 'PATCH';
  trackingKeys: string[];
  getIncrement?: (request: FastifyRequest, reply: FastifyReply) => Promise<number> | number;
  streakType?: 'workout' | 'nutrition' | 'sleep' | 'social';
}

const PROGRESS_HOOKS: ProgressHook[] = [
  // Workout set logging
  {
    route: '/api/workout-sets',
    method: 'POST',
    trackingKeys: ['setsLogged'],
    getIncrement: () => 1,
  },
  // Workout completion
  {
    route: '/api/workouts',
    method: 'POST',
    trackingKeys: ['workoutsCompleted'],
    getIncrement: () => 1,
    streakType: 'workout',
  },
  // High fives
  {
    route: '/api/high-fives',
    method: 'POST',
    trackingKeys: ['highFivesSent'],
    getIncrement: () => 1,
    streakType: 'social',
  },
  // Social interactions (comments, reactions)
  {
    route: '/api/social/react',
    method: 'POST',
    trackingKeys: ['socialInteractions'],
    getIncrement: () => 1,
    streakType: 'social',
  },
];

// Track XP events by hooking into xpService (done via event emitter or direct call)
// For now, we'll expose a manual update function

export const challengeProgressMiddleware = {
  /**
   * Register hooks on the Fastify instance
   */
  register(app: FastifyInstance): void {
    // Add onResponse hook to track challenge progress after successful requests
    app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Only process successful responses (2xx)
        if (reply.statusCode < 200 || reply.statusCode >= 300) {
          return;
        }

        // Get user ID from request
        const userId = (request as any).user?.userId;
        if (!userId) {
          return;
        }

        // Find matching progress hook
        const hook = PROGRESS_HOOKS.find(
          (h) => request.url.startsWith(h.route) && request.method === h.method
        );

        if (!hook) {
          return;
        }

        // Calculate increment
        const increment = hook.getIncrement
          ? await hook.getIncrement(request, reply)
          : 1;

        // Update challenge progress for each tracking key
        for (const trackingKey of hook.trackingKeys) {
          try {
            const result = await challengesService.updateProgress(userId, trackingKey, increment);

            if (result.updatedChallenges.length > 0) {
              log.debug(
                { userId, trackingKey, increment, updated: result.updatedChallenges.length },
                'Challenge progress updated'
              );
            }
          } catch (error) {
            log.warn({ error, userId, trackingKey }, 'Failed to update challenge progress');
          }
        }

        // Record streak activity if applicable
        if (hook.streakType) {
          try {
            await streaksService.recordActivity(userId, hook.streakType);
          } catch (error) {
            log.warn({ error, userId, streakType: hook.streakType }, 'Failed to record streak activity');
          }
        }
      } catch (error) {
        // Don't fail the request if progress tracking fails
        log.error({ error }, 'Error in challenge progress middleware');
      }
    });

    log.info('Challenge progress middleware registered');
  },

  /**
   * Manually update challenge progress (for use by other services)
   */
  async updateProgress(
    userId: string,
    trackingKey: string,
    increment: number = 1
  ): Promise<{ updatedChallenges: Array<{ id: string; newProgress: number; isComplete: boolean }> }> {
    return challengesService.updateProgress(userId, trackingKey, increment);
  },

  /**
   * Update XP tracking (called from xpService)
   */
  async trackXpEarned(userId: string, xpAmount: number): Promise<void> {
    try {
      await challengesService.updateProgress(userId, 'xpEarned', xpAmount);
    } catch (error) {
      log.warn({ error, userId, xpAmount }, 'Failed to track XP for challenges');
    }
  },

  /**
   * Update PR tracking (called from workout/1RM services)
   */
  async trackPrSet(userId: string): Promise<void> {
    try {
      await challengesService.updateProgress(userId, 'prsSet', 1);
    } catch (error) {
      log.warn({ error, userId }, 'Failed to track PR for challenges');
    }
  },

  /**
   * Update new exercise tracking
   */
  async trackNewExercise(userId: string): Promise<void> {
    try {
      await challengesService.updateProgress(userId, 'newExercisesTried', 1);
    } catch (error) {
      log.warn({ error, userId }, 'Failed to track new exercise for challenges');
    }
  },

  /**
   * Update total volume tracking (called after set logging)
   */
  async trackVolume(userId: string, volume: number): Promise<void> {
    try {
      await challengesService.updateProgress(userId, 'totalVolume', volume);
    } catch (error) {
      log.warn({ error, userId, volume }, 'Failed to track volume for challenges');
    }
  },

  /**
   * Update muscle groups hit (called after workout with muscle data)
   */
  async trackMuscleGroups(userId: string, muscleCount: number): Promise<void> {
    try {
      await challengesService.updateProgress(userId, 'muscleGroupsHit', muscleCount);
    } catch (error) {
      log.warn({ error, userId, muscleCount }, 'Failed to track muscle groups for challenges');
    }
  },
};

export default challengeProgressMiddleware;
