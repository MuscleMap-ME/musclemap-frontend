/**
 * GraphQL DataLoaders
 *
 * Batches and caches database queries to solve the N+1 problem.
 * Each loader is created per-request to avoid cache leakage between users.
 */

import DataLoader from 'dataloader';
import type { Database } from 'better-sqlite3';

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
// LOADER FACTORY
// ============================================

/**
 * Create all DataLoaders for a request.
 * Each request should get fresh loaders to ensure cache isolation.
 */
export function createLoaders(db: Database) {
  return {
    /**
     * Load users by ID.
     */
    user: new DataLoader<string, User | null>(async (ids) => {
      const placeholders = ids.map(() => '?').join(',');
      const rows = db
        .prepare(`SELECT * FROM users WHERE id IN (${placeholders})`)
        .all(...ids) as User[];

      // Map results back to input order
      const userMap = new Map(rows.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) ?? null);
    }),

    /**
     * Load users by username.
     */
    userByUsername: new DataLoader<string, User | null>(async (usernames) => {
      const placeholders = usernames.map(() => '?').join(',');
      const rows = db
        .prepare(`SELECT * FROM users WHERE username IN (${placeholders})`)
        .all(...usernames) as User[];

      const userMap = new Map(rows.map((u) => [u.username.toLowerCase(), u]));
      return usernames.map((username) => userMap.get(username.toLowerCase()) ?? null);
    }),

    /**
     * Load exercises by ID.
     */
    exercise: new DataLoader<string, Exercise | null>(async (ids) => {
      const placeholders = ids.map(() => '?').join(',');
      const rows = db
        .prepare(`SELECT * FROM exercises WHERE id IN (${placeholders})`)
        .all(...ids) as Exercise[];

      const exerciseMap = new Map(rows.map((e) => [e.id, e]));
      return ids.map((id) => exerciseMap.get(id) ?? null);
    }),

    /**
     * Load muscles by ID.
     */
    muscle: new DataLoader<string, Muscle | null>(async (ids) => {
      const placeholders = ids.map(() => '?').join(',');
      const rows = db
        .prepare(`SELECT * FROM muscles WHERE id IN (${placeholders})`)
        .all(...ids) as Muscle[];

      const muscleMap = new Map(rows.map((m) => [m.id, m]));
      return ids.map((id) => muscleMap.get(id) ?? null);
    }),

    /**
     * Load muscle activations by exercise ID.
     */
    muscleActivationsByExercise: new DataLoader<string, MuscleActivation[]>(async (exerciseIds) => {
      const placeholders = exerciseIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT * FROM exercise_muscles WHERE exercise_id IN (${placeholders})`
        )
        .all(...exerciseIds) as MuscleActivation[];

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
      const placeholders = userIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT * FROM workouts WHERE user_id IN (${placeholders}) ORDER BY created_at DESC`
        )
        .all(...userIds) as Workout[];

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
      const placeholders = workoutIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT * FROM workout_exercises WHERE workout_id IN (${placeholders})`
        )
        .all(...workoutIds) as WorkoutExercise[];

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
      const placeholders = userIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT user_id, balance FROM credit_balances WHERE user_id IN (${placeholders})`
        )
        .all(...userIds) as { user_id: string; balance: number }[];

      const balanceMap = new Map(rows.map((r) => [r.user_id, r.balance]));
      return userIds.map((id) => balanceMap.get(id) ?? 0);
    }),

    /**
     * Load workout count by user ID.
     */
    workoutCount: new DataLoader<string, number>(async (userIds) => {
      const placeholders = userIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT user_id, COUNT(*) as count FROM workouts WHERE user_id IN (${placeholders}) GROUP BY user_id`
        )
        .all(...userIds) as { user_id: string; count: number }[];

      const countMap = new Map(rows.map((r) => [r.user_id, r.count]));
      return userIds.map((id) => countMap.get(id) ?? 0);
    }),

    /**
     * Load total TU by user ID.
     */
    totalTU: new DataLoader<string, number>(async (userIds) => {
      const placeholders = userIds.map(() => '?').join(',');
      const rows = db
        .prepare(
          `SELECT user_id, COALESCE(SUM(total_tu), 0) as total FROM workouts WHERE user_id IN (${placeholders}) GROUP BY user_id`
        )
        .all(...userIds) as { user_id: string; total: number }[];

      const tuMap = new Map(rows.map((r) => [r.user_id, r.total]));
      return userIds.map((id) => tuMap.get(id) ?? 0);
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
  private factories: Map<string, (db: Database) => DataLoader<unknown, unknown>> = new Map();

  /**
   * Register a custom loader factory.
   */
  register<K, V>(
    name: string,
    factory: (db: Database) => DataLoader<K, V>
  ): void {
    this.factories.set(name, factory as (db: Database) => DataLoader<unknown, unknown>);
  }

  /**
   * Create all registered loaders.
   */
  createAll(db: Database): Record<string, DataLoader<unknown, unknown>> {
    const loaders: Record<string, DataLoader<unknown, unknown>> = {};

    for (const [name, factory] of this.factories) {
      loaders[name] = factory(db);
    }

    return loaders;
  }
}

export const loaderRegistry = new LoaderRegistry();
