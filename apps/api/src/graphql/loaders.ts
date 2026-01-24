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

// ============================================
// ADDITIONAL LOADER TYPES FOR N+1 FIX
// ============================================

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  last_active_at: string | null;
  role: string;
}

export interface ConversationLastMessage {
  conversation_id: string;
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ConversationUnreadCount {
  conversation_id: string;
  count: number;
}

export interface CareerStandard {
  id: string;
  name: string;
  institution: string;
  category: string;
  description: string | null;
  scoringMethod: string;
  recertificationMonths: number | null;
  components: unknown[];
  exerciseMappings: Record<string, string[]>;
  tips: Array<{ event: string; tip: string }>;
  icon: string | null;
  maxScore: number | null;
  passingScore: number | null;
}

export interface ExerciseStats {
  exerciseId: string;
  exerciseName: string | null;
  maxWeight: number | null;
  estimated1RM: number | null;
  weeklyVolume: number | null;
  lastWorkoutDate: string | null;
  totalSessions: number;
}

export interface ReadinessScore {
  goalId: string;
  readinessScore: number | null;
  status: 'ready' | 'at_risk' | 'not_ready' | 'no_data';
  eventsPassed: number;
  eventsTotal: number;
  weakEvents: string[];
  lastAssessmentAt: string | null;
}

export interface CollectionSetDetail {
  id: string;
  name: string;
  description: string | null;
  theme: string | null;
  isLimited: boolean;
  expiresAt: string | null;
  rewards: unknown[];
  totalCount: number;
  ownedCount: number;
  rewardsClaimed: number[];
}

// ============================================
// EXTENDED LOADERS FOR N+1 FIXES
// ============================================

/**
 * Create extended loaders that fix N+1 patterns in resolvers.
 * These are additional loaders beyond the core createLoaders().
 */
export function createExtendedLoaders() {
  return {
    /**
     * PERF-FIX: Load conversation participants by conversation IDs.
     * Fixes N+1 in conversations query where participants were loaded per-conversation.
     */
    conversationParticipants: new DataLoader<string, ConversationParticipant[]>(async (conversationIds) => {
      const placeholders = generatePlaceholders(conversationIds.length);
      const rows = await queryAll<ConversationParticipant>(
        `SELECT cp.conversation_id, u.id as user_id, u.username, u.display_name, u.avatar_url,
                u.last_active_at, cp.role
         FROM conversation_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id IN (${placeholders})`,
        [...conversationIds]
      );

      // Group by conversation ID
      const participantMap = new Map<string, ConversationParticipant[]>();
      for (const row of rows) {
        const existing = participantMap.get(row.conversation_id) || [];
        existing.push(row);
        participantMap.set(row.conversation_id, existing);
      }

      return conversationIds.map((id) => participantMap.get(id) || []);
    }),

    /**
     * PERF-FIX: Load last message by conversation IDs.
     * Fixes N+1 in conversations query where last message was loaded per-conversation.
     */
    conversationLastMessage: new DataLoader<string, ConversationLastMessage | null>(async (conversationIds) => {
      const placeholders = generatePlaceholders(conversationIds.length);
      // Use DISTINCT ON to get only the latest message per conversation
      const rows = await queryAll<ConversationLastMessage>(
        `SELECT DISTINCT ON (conversation_id)
                conversation_id, id, sender_id, content, created_at
         FROM messages
         WHERE conversation_id IN (${placeholders}) AND deleted_at IS NULL
         ORDER BY conversation_id, created_at DESC`,
        [...conversationIds]
      );

      const messageMap = new Map(rows.map((m) => [m.conversation_id, m]));
      return conversationIds.map((id) => messageMap.get(id) ?? null);
    }),

    /**
     * PERF-FIX: Load unread counts by conversation IDs for a specific user.
     * Fixes N+1 in conversations query where unread count was loaded per-conversation.
     * Note: This loader requires userId to be passed via context or pre-bound.
     */
    conversationUnreadCount: (userId: string) =>
      new DataLoader<string, number>(async (conversationIds) => {
        const placeholders = generatePlaceholders(conversationIds.length);
        const rows = await queryAll<{ conversation_id: string; count: string }>(
          `SELECT m.conversation_id, COUNT(*) as count
           FROM messages m
           LEFT JOIN message_receipts mr ON m.id = mr.message_id AND mr.user_id = $1
           WHERE m.conversation_id IN (${placeholders.split(',').map((_, i) => `$${i + 2}`).join(',')})
             AND m.sender_id != $1
             AND mr.read_at IS NULL
             AND m.deleted_at IS NULL
           GROUP BY m.conversation_id`,
          [userId, ...conversationIds]
        );

        const countMap = new Map(rows.map((r) => [r.conversation_id, parseInt(r.count, 10)]));
        return conversationIds.map((id) => countMap.get(id) ?? 0);
      }),

    /**
     * PERF-FIX: Batch load exercise stats by exercise IDs for a user.
     * Fixes N+1 in exerciseHistory where stats were loaded per-exercise.
     */
    exerciseStats: (userId: string) =>
      new DataLoader<string, ExerciseStats | null>(async (exerciseIds) => {
        // For exercise stats, we need to query workout_exercises grouped by exercise
        // This is a complex aggregation so we query the relevant data and aggregate
        const placeholders = generatePlaceholders(exerciseIds.length);
        const exercisePlaceholderStart = 2; // $1 is userId

        // Get exercise names
        const exercises = await queryAll<{ id: string; name: string }>(
          `SELECT id, name FROM exercises WHERE id IN (${generatePlaceholders(exerciseIds.length, exercisePlaceholderStart)})`,
          [...exerciseIds]
        );
        const exerciseNameMap = new Map(exercises.map((e) => [e.id, e.name]));

        // Get aggregated stats from workout_exercises
        const stats = await queryAll<{
          exercise_id: string;
          max_weight: number | null;
          estimated_1rm: number | null;
          total_volume: number | null;
          last_workout_date: string | null;
          session_count: string;
        }>(
          `SELECT
             we.exercise_id,
             MAX((sets_data::jsonb->0->>'weight')::numeric) as max_weight,
             MAX((sets_data::jsonb->0->>'weight')::numeric * (1 + (sets_data::jsonb->0->>'reps')::numeric / 30)) as estimated_1rm,
             SUM(
               (SELECT COALESCE(SUM((elem->>'weight')::numeric * (elem->>'reps')::numeric), 0)
                FROM jsonb_array_elements(sets_data::jsonb) AS elem)
             ) as total_volume,
             MAX(w.date) as last_workout_date,
             COUNT(DISTINCT w.id) as session_count
           FROM workout_exercises we
           JOIN workouts w ON we.workout_id = w.id
           WHERE w.user_id = $1
             AND we.exercise_id IN (${generatePlaceholders(exerciseIds.length, exercisePlaceholderStart)})
           GROUP BY we.exercise_id`,
          [userId, ...exerciseIds]
        );

        const statsMap = new Map(
          stats.map((s) => [
            s.exercise_id,
            {
              exerciseId: s.exercise_id,
              exerciseName: exerciseNameMap.get(s.exercise_id) || null,
              maxWeight: s.max_weight,
              estimated1RM: s.estimated_1rm,
              weeklyVolume: s.total_volume,
              lastWorkoutDate: s.last_workout_date,
              totalSessions: parseInt(s.session_count, 10),
            } as ExerciseStats,
          ])
        );

        return exerciseIds.map((id) => statsMap.get(id) ?? null);
      }),

    /**
     * PERF-FIX: Batch load career standards (PT tests) by IDs.
     * Fixes N+1 in myCareerGoals where standards were loaded per-goal.
     */
    careerStandards: new DataLoader<string, CareerStandard | null>(async (ptTestIds) => {
      const placeholders = generatePlaceholders(ptTestIds.length);
      const rows = await queryAll<{
        id: string;
        name: string;
        description: string | null;
        institution: string | null;
        category: string | null;
        components: unknown[];
        scoring_method: string;
        max_score: number | null;
        passing_score: number | null;
        recertification_months: number | null;
        exercise_mappings: Record<string, string[]> | null;
        tips: Array<{ event: string; tip: string }> | null;
        icon: string | null;
      }>(
        `SELECT id, name, description, institution, category, components,
                scoring_method, max_score, passing_score, recertification_months,
                exercise_mappings, tips, icon
         FROM pt_tests
         WHERE id IN (${placeholders})`,
        [...ptTestIds]
      );

      const standardMap = new Map(
        rows.map((t) => [
          t.id,
          {
            id: t.id,
            name: t.name,
            institution: t.institution || '',
            category: t.category || '',
            description: t.description,
            scoringMethod: t.scoring_method,
            recertificationMonths: t.recertification_months,
            components: t.components || [],
            exerciseMappings: t.exercise_mappings || {},
            tips: t.tips || [],
            icon: t.icon,
            maxScore: t.max_score,
            passingScore: t.passing_score,
          } as CareerStandard,
        ])
      );

      return ptTestIds.map((id) => standardMap.get(id) ?? null);
    }),

    /**
     * PERF-FIX: Batch load readiness scores by goal IDs for a user.
     * Fixes N+1 in myCareerGoals where readiness was loaded per-goal.
     */
    careerReadiness: (userId: string) =>
      new DataLoader<string, ReadinessScore | null>(async (goalIds) => {
        const placeholders = generatePlaceholders(goalIds.length, 2); // $1 is userId
        const rows = await queryAll<{
          goal_id: string;
          readiness_score: number | null;
          status: string;
          events_passed: number;
          events_total: number;
          weak_events: string[];
          last_assessment_at: string | null;
        }>(
          `SELECT goal_id, readiness_score, status, events_passed, events_total, weak_events, last_assessment_at
           FROM career_readiness_cache
           WHERE user_id = $1 AND goal_id IN (${placeholders})`,
          [userId, ...goalIds]
        );

        const readinessMap = new Map(
          rows.map((r) => [
            r.goal_id,
            {
              goalId: r.goal_id,
              readinessScore: r.readiness_score,
              status: r.status as 'ready' | 'at_risk' | 'not_ready' | 'no_data',
              eventsPassed: r.events_passed,
              eventsTotal: r.events_total,
              weakEvents: r.weak_events || [],
              lastAssessmentAt: r.last_assessment_at,
            } as ReadinessScore,
          ])
        );

        // Return cached readiness or default "no_data" state
        return goalIds.map(
          (id) =>
            readinessMap.get(id) ?? {
              goalId: id,
              readinessScore: null,
              status: 'no_data' as const,
              eventsPassed: 0,
              eventsTotal: 0,
              weakEvents: [],
              lastAssessmentAt: null,
            }
        );
      }),

    /**
     * PERF-FIX: Batch load collection set details by set IDs for a user.
     * Fixes N+1 in collectionSets where set details were loaded per-set.
     */
    collectionSetDetails: (userId: string) =>
      new DataLoader<string, CollectionSetDetail | null>(async (setIds) => {
        // Batch load collection sets
        const setsPlaceholders = generatePlaceholders(setIds.length);
        const sets = await queryAll<{
          id: string;
          name: string;
          description: string | null;
          theme: string | null;
          is_limited: boolean;
          expires_at: string | null;
          rewards: unknown[];
        }>(
          `SELECT id, name, description, theme, is_limited, expires_at, rewards
           FROM collection_sets
           WHERE id IN (${setsPlaceholders})`,
          [...setIds]
        );

        // Batch load item counts per set
        const itemCounts = await queryAll<{ set_id: string; count: string }>(
          `SELECT set_id, COUNT(*) as count
           FROM collection_items
           WHERE set_id IN (${setsPlaceholders})
           GROUP BY set_id`,
          [...setIds]
        );

        // Batch load user's owned items per set
        const ownedCounts = await queryAll<{ set_id: string; count: string }>(
          `SELECT ci.set_id, COUNT(*) as count
           FROM collection_items ci
           JOIN user_collection_items uci ON ci.id = uci.item_id AND uci.user_id = $1
           WHERE ci.set_id IN (${generatePlaceholders(setIds.length, 2)})
           GROUP BY ci.set_id`,
          [userId, ...setIds]
        );

        // Batch load claimed rewards per set for user
        const claimedRewards = await queryAll<{ set_id: string; thresholds: number[] }>(
          `SELECT set_id, array_agg(threshold) as thresholds
           FROM collection_reward_claims
           WHERE user_id = $1 AND set_id IN (${generatePlaceholders(setIds.length, 2)})
           GROUP BY set_id`,
          [userId, ...setIds]
        );

        const setMap = new Map(sets.map((s) => [s.id, s]));
        const itemCountMap = new Map(itemCounts.map((c) => [c.set_id, parseInt(c.count, 10)]));
        const ownedCountMap = new Map(ownedCounts.map((c) => [c.set_id, parseInt(c.count, 10)]));
        const claimedMap = new Map(claimedRewards.map((c) => [c.set_id, c.thresholds || []]));

        return setIds.map((id) => {
          const set = setMap.get(id);
          if (!set) return null;

          return {
            id: set.id,
            name: set.name,
            description: set.description,
            theme: set.theme,
            isLimited: set.is_limited,
            expiresAt: set.expires_at,
            rewards: set.rewards || [],
            totalCount: itemCountMap.get(id) ?? 0,
            ownedCount: ownedCountMap.get(id) ?? 0,
            rewardsClaimed: claimedMap.get(id) ?? [],
          } as CollectionSetDetail;
        });
      }),
  };
}

// Raw type from createExtendedLoaders (includes factory functions)
export type ExtendedLoadersRaw = ReturnType<typeof createExtendedLoaders>;

// Resolved type for context (after factory functions are called with userId)
export interface ExtendedLoaders {
  conversationParticipants: DataLoader<string, ConversationParticipant[]>;
  conversationLastMessage: DataLoader<string, ConversationLastMessage | null>;
  conversationUnreadCount: DataLoader<string, number>;
  exerciseStats: DataLoader<string, ExerciseStats | null>;
  careerStandards: DataLoader<string, CareerStandard | null>;
  careerReadiness: DataLoader<string, ReadinessScore | null>;
  collectionSetDetails: DataLoader<string, CollectionSetDetail | null>;
}
