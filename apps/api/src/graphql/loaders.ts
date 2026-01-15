/**
 * GraphQL DataLoaders
 *
 * Batches and caches database queries to solve the N+1 problem.
 * Each loader is created per-request to avoid cache leakage between users.
 * L2 cache provides cross-request caching for static/semi-static data.
 */

import DataLoader from 'dataloader';
import { queryAll } from '../db/client';
import cache, { CACHE_TTL, CACHE_PREFIX } from '../lib/cache.service';

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  roles: string;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

export interface Muscle {
  id: string;
  name: string;
  group_name: string;
  bias_weight: number;
}

export interface MuscleActivation {
  exercise_id: string;
  muscle_id: string;
  activation: number;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  total_tu: number;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets_data: string; // JSON string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate PostgreSQL placeholders for IN clause: $1, $2, $3, ...
 */
function generatePlaceholders(count: number, startIndex: number = 1): string {
  return Array.from({ length: count }, (_, i) => `$${startIndex + i}`).join(',');
}

// ============================================
// LOADER FACTORY
// ============================================

/**
 * L2 cache helper - check cache before database query
 */
async function getFromL2Cache<T>(
  prefix: string,
  ids: readonly string[],
  ttl: number,
  fetchMissing: (missingIds: string[]) => Promise<Map<string, T>>
): Promise<(T | null)[]> {
  // Try L2 cache first
  const cacheKeys = ids.map((id) => `${prefix}${id}`);
  const cached = await cache.getMany<T>(cacheKeys);

  const results: (T | null)[] = [];
  const missingIds: string[] = [];
  const missingIndices: number[] = [];

  for (let i = 0; i < ids.length; i++) {
    if (cached[i] !== null) {
      results[i] = cached[i];
    } else {
      missingIds.push(ids[i] as string);
      missingIndices.push(i);
      results[i] = null;
    }
  }

  // Fetch missing from database
  if (missingIds.length > 0) {
    const fetchedMap = await fetchMissing(missingIds);

    // Update results and cache
    const toCache: Array<{ key: string; value: T | null; ttl: number }> = [];

    for (let i = 0; i < missingIds.length; i++) {
      const id = missingIds[i];
      const idx = missingIndices[i];
      const value = fetchedMap.get(id) ?? null;
      results[idx] = value;

      if (value !== null) {
        toCache.push({ key: `${prefix}${id}`, value, ttl });
      }
    }

    // Cache fetched values (non-blocking)
    if (toCache.length > 0) {
      cache.setMany(toCache).catch(() => {});
    }
  }

  return results;
}

/**
 * Create all DataLoaders for a request.
 * Each request should get fresh loaders to ensure cache isolation.
 * L2 cache provides cross-request caching for frequently accessed static data.
 */
export function createLoaders() {
  return {
    /**
     * Load users by ID (with L2 cache).
     */
    user: new DataLoader<string, User | null>(async (ids) => {
      return getFromL2Cache<User>(
        CACHE_PREFIX.DATALOADER_USER,
        ids,
        CACHE_TTL.DATALOADER_L2,
        async (missingIds) => {
          const placeholders = generatePlaceholders(missingIds.length);
          const rows = await queryAll<User>(
            `SELECT * FROM users WHERE id IN (${placeholders})`,
            [...missingIds]
          );
          return new Map(rows.map((u) => [u.id, u]));
        }
      );
    }),

    /**
     * Load users by username.
     */
    userByUsername: new DataLoader<string, User | null>(async (usernames) => {
      const placeholders = generatePlaceholders(usernames.length);
      const rows = await queryAll<User>(
        `SELECT * FROM users WHERE LOWER(username) IN (${placeholders})`,
        usernames.map((u) => u.toLowerCase())
      );

      const userMap = new Map(rows.map((u) => [u.username.toLowerCase(), u]));
      return usernames.map((username) => userMap.get(username.toLowerCase()) ?? null);
    }),

    /**
     * Load exercises by ID (with L2 cache - longer TTL for static data).
     */
    exercise: new DataLoader<string, Exercise | null>(async (ids) => {
      return getFromL2Cache<Exercise>(
        CACHE_PREFIX.DATALOADER_EXERCISE,
        ids,
        CACHE_TTL.EXERCISES, // Static data - cache longer
        async (missingIds) => {
          const placeholders = generatePlaceholders(missingIds.length);
          const rows = await queryAll<Exercise>(
            `SELECT * FROM exercises WHERE id IN (${placeholders})`,
            [...missingIds]
          );
          return new Map(rows.map((e) => [e.id, e]));
        }
      );
    }),

    /**
     * Load muscles by ID (with L2 cache - longer TTL for static data).
     */
    muscle: new DataLoader<string, Muscle | null>(async (ids) => {
      return getFromL2Cache<Muscle>(
        CACHE_PREFIX.DATALOADER_MUSCLE,
        ids,
        CACHE_TTL.MUSCLES, // Static data - cache longer
        async (missingIds) => {
          const placeholders = generatePlaceholders(missingIds.length);
          const rows = await queryAll<Muscle>(
            `SELECT * FROM muscles WHERE id IN (${placeholders})`,
            [...missingIds]
          );
          return new Map(rows.map((m) => [m.id, m]));
        }
      );
    }),

    /**
     * Load muscle activations by exercise ID.
     */
    muscleActivationsByExercise: new DataLoader<string, MuscleActivation[]>(async (exerciseIds) => {
      const placeholders = generatePlaceholders(exerciseIds.length);
      const rows = await queryAll<MuscleActivation>(
        `SELECT * FROM exercise_muscles WHERE exercise_id IN (${placeholders})`,
        [...exerciseIds]
      );

      // Group by exercise ID
      const activationMap = new Map<string, MuscleActivation[]>();
      for (const row of rows) {
        const existing = activationMap.get(row.exercise_id) || [];
        existing.push(row);
        activationMap.set(row.exercise_id, existing);
      }

      return exerciseIds.map((id) => activationMap.get(id) || []);
    }),

    /**
     * Load workouts by user ID.
     */
    workoutsByUser: new DataLoader<string, Workout[]>(async (userIds) => {
      const placeholders = generatePlaceholders(userIds.length);
      const rows = await queryAll<Workout>(
        `SELECT * FROM workouts WHERE user_id IN (${placeholders}) ORDER BY created_at DESC`,
        [...userIds]
      );

      // Group by user ID
      const workoutMap = new Map<string, Workout[]>();
      for (const row of rows) {
        const existing = workoutMap.get(row.user_id) || [];
        existing.push(row);
        workoutMap.set(row.user_id, existing);
      }

      return userIds.map((id) => workoutMap.get(id) || []);
    }),

    /**
     * Load workout exercises by workout ID.
     */
    workoutExercisesByWorkout: new DataLoader<string, WorkoutExercise[]>(async (workoutIds) => {
      const placeholders = generatePlaceholders(workoutIds.length);
      const rows = await queryAll<WorkoutExercise>(
        `SELECT * FROM workout_exercises WHERE workout_id IN (${placeholders})`,
        [...workoutIds]
      );

      // Group by workout ID
      const exerciseMap = new Map<string, WorkoutExercise[]>();
      for (const row of rows) {
        const existing = exerciseMap.get(row.workout_id) || [];
        existing.push(row);
        exerciseMap.set(row.workout_id, existing);
      }

      return workoutIds.map((id) => exerciseMap.get(id) || []);
    }),

    /**
     * Load credit balance by user ID.
     */
    creditBalance: new DataLoader<string, number>(async (userIds) => {
      const placeholders = generatePlaceholders(userIds.length);
      const rows = await queryAll<{ user_id: string; balance: number }>(
        `SELECT user_id, balance FROM credit_balances WHERE user_id IN (${placeholders})`,
        [...userIds]
      );

      const balanceMap = new Map(rows.map((r) => [r.user_id, r.balance]));
      return userIds.map((id) => balanceMap.get(id) ?? 0);
    }),

    /**
     * Load workout count by user ID.
     */
    workoutCount: new DataLoader<string, number>(async (userIds) => {
      const placeholders = generatePlaceholders(userIds.length);
      const rows = await queryAll<{ user_id: string; count: string }>(
        `SELECT user_id, COUNT(*) as count FROM workouts WHERE user_id IN (${placeholders}) GROUP BY user_id`,
        [...userIds]
      );

      const countMap = new Map(rows.map((r) => [r.user_id, parseInt(r.count, 10)]));
      return userIds.map((id) => countMap.get(id) ?? 0);
    }),

    /**
     * Load total TU by user ID.
     */
    totalTU: new DataLoader<string, number>(async (userIds) => {
      const placeholders = generatePlaceholders(userIds.length);
      const rows = await queryAll<{ user_id: string; total: string }>(
        `SELECT user_id, COALESCE(SUM(total_tu), 0) as total FROM workouts WHERE user_id IN (${placeholders}) GROUP BY user_id`,
        [...userIds]
      );

      const tuMap = new Map(rows.map((r) => [r.user_id, parseFloat(r.total)]));
      return userIds.map((id) => tuMap.get(id) ?? 0);
    }),

    /**
     * Load activity feed users by ID (optimized for feed N+1 problem).
     * PERF-002: Batch loads users for activity feed to avoid N+1 queries.
     */
    activityFeedUser: new DataLoader<string, { id: string; username: string; display_name: string | null; avatar_url: string | null } | null>(async (userIds) => {
      return getFromL2Cache<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
        CACHE_PREFIX.DATALOADER_USER,
        userIds,
        CACHE_TTL.DATALOADER_L2,
        async (missingIds) => {
          const placeholders = generatePlaceholders(missingIds.length);
          const rows = await queryAll<{ id: string; username: string; display_name: string | null; avatar_url: string | null }>(
            `SELECT id, username, display_name, avatar_url FROM users WHERE id IN (${placeholders})`,
            [...missingIds]
          );
          return new Map(rows.map((u) => [u.id, u]));
        }
      );
    }),

    /**
     * Load privacy settings by user ID (for feed filtering).
     * PERF-002: Batch loads privacy settings to optimize feed filtering.
     */
    userPrivacyMode: new DataLoader<string, { minimalist_mode: boolean; opt_out_community_feed: boolean; exclude_from_activity_feed: boolean } | null>(async (userIds) => {
      const placeholders = generatePlaceholders(userIds.length);
      const rows = await queryAll<{ user_id: string; minimalist_mode: boolean; opt_out_community_feed: boolean; exclude_from_activity_feed: boolean }>(
        `SELECT user_id, minimalist_mode, opt_out_community_feed, exclude_from_activity_feed
         FROM user_privacy_mode
         WHERE user_id IN (${placeholders})`,
        [...userIds]
      );

      const privacyMap = new Map(rows.map((r) => [r.user_id, {
        minimalist_mode: r.minimalist_mode,
        opt_out_community_feed: r.opt_out_community_feed,
        exclude_from_activity_feed: r.exclude_from_activity_feed,
      }]));
      return userIds.map((id) => privacyMap.get(id) ?? null);
    }),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;

// ============================================
// LOADER REGISTRY
// ============================================

/**
 * Registry for custom loaders from plugins.
 */
class LoaderRegistry {
  private factories: Map<string, () => DataLoader<unknown, unknown>> = new Map();

  /**
   * Register a custom loader factory.
   */
  register<K, V>(
    name: string,
    factory: () => DataLoader<K, V>
  ): void {
    this.factories.set(name, factory as () => DataLoader<unknown, unknown>);
  }

  /**
   * Create all registered loaders.
   */
  createAll(): Record<string, DataLoader<unknown, unknown>> {
    const loaders: Record<string, DataLoader<unknown, unknown>> = {};

    for (const [name, factory] of this.factories) {
      loaders[name] = factory();
    }

    return loaders;
  }
}

export const loaderRegistry = new LoaderRegistry();
