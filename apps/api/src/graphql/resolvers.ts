/**
 * GraphQL Resolvers
 *
 * All resolver implementations for MuscleMap GraphQL API
 */

import { GraphQLError } from 'graphql';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { queryOne, queryAll, query } from '../db/client';
import { config } from '../config';
import {
  economyService,
  earnEventsService,
  bonusEventsService,
  socialSpendingService,
  walletService,
  paymentsService as _paymentsService,
  buddyService,
  storeService,
} from '../modules/economy';
import { statsService } from '../modules/stats';
import { skillService } from '../modules/skills';
import { martialArtsService } from '../modules/martial-arts';
import { achievementService } from '../modules/achievements';
import { longTermAnalyticsService } from '../modules/analytics';
import { careerService } from '../modules/career';
import {
  sleepService,
  recoveryService,
  type CreateSleepLogInput,
  type UpdateSleepLogInput,
  type CreateSleepGoalInput,
  type UpdateSleepGoalInput,
} from '../modules/recovery';
import rpeService from '../modules/rpe';
import { ProgressionService } from '../services/progression.service';
import { ProgramsService, EnrollmentService } from '../modules/programs';
import {
  nutritionService,
  foodSearchService,
  mealLogService,
  macroCalculatorService,
  recipeService,
  mealPlanService,
  nutritionGoalsService,
} from '../modules/nutrition';
import {
  companionEventsService,
  mascotPowersService,
  spiritWardrobeService,
  appearanceGeneratorService,
  mascotTimelineService,
  STAGE_THRESHOLDS as _STAGE_THRESHOLDS,
} from '../modules/mascot';
import { prescriptionEngine } from '../modules/prescription';
import { workoutSessionService } from '../modules/workout-sessions';
import { privacyService } from '../modules/community';
import { virtualHangoutsService } from '../modules/community/virtual-hangouts.service';
import { tipsService } from '../modules/tips';
import { journeyHealthService } from '../modules/journey';
import { issuesService } from '../services/issues.service';
import { mysteryBoxService } from '../modules/marketplace/mystery-box.service';
import * as equipmentService from '../services/equipment.service';
import { loggers } from '../lib/logger';
import {
  subscribe,
  subscribeForConversation,
  PUBSUB_CHANNELS,
  CommunityStatsEvent,
  ActivityEvent,
  MessageEvent,
  ConversationEvent,
} from '../lib/pubsub';
import {
  WEALTH_TIERS_BY_LEVEL,
  calculateWealthTier,
  creditsToNextTier,
  wealthTierProgress,
  type WealthTierLevel,
} from '@musclemap/core';
import {
  outdoorEquipmentQueries,
  outdoorEquipmentMutations,
  outdoorEquipmentTypeResolvers,
} from './outdoor-equipment.resolvers';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

interface Context {
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

// ============================================
// AUTH HELPERS
// ============================================

function requireAuth(context: Context): { userId: string; email: string; roles: string[]; isAdmin: boolean } {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return {
    ...context.user,
    isAdmin: context.user.roles?.includes('admin') || false,
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

function generateToken(payload: { userId: string; email: string; roles: string[] }): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// ============================================
// WEALTH TIER HELPERS
// ============================================

interface WealthTierResponse {
  tier: number;
  name: string;
  minCredits: number;
  color: string;
  icon: string;
  description: string;
  creditsToNext: number | null;
  progressPercent: number;
}

function buildWealthTierResponse(credits: number): WealthTierResponse {
  const tierLevel = calculateWealthTier(credits) as WealthTierLevel;
  const tierDef = WEALTH_TIERS_BY_LEVEL[tierLevel];
  return {
    tier: tierDef.tier,
    name: tierDef.name,
    minCredits: tierDef.minCredits,
    color: tierDef.color,
    icon: tierDef.icon,
    description: tierDef.description,
    creditsToNext: creditsToNextTier(credits),
    progressPercent: wealthTierProgress(credits),
  };
}

// Transaction description helper
function getTransactionDescription(action: string, _amount: number, _metadata?: any): string {
  const actionDescriptions: Record<string, string> = {
    'workout_complete': 'Workout completed',
    'rep_complete': 'Reps completed',
    'set_complete': 'Set completed',
    'pr_set': 'Personal record',
    'streak_bonus': 'Streak bonus',
    'goal_complete': 'Goal completed',
    'leaderboard_reward': 'Leaderboard placement',
    'high_five_receive': 'High five received',
    'daily_login': 'Daily login bonus',
    'tip_sent': 'Tip sent',
    'tip_received': 'Tip received',
    'gift_sent': 'Gift sent',
    'gift_received': 'Gift received',
    'super_high_five': 'Super high five',
    'post_boost': 'Post boost',
    'transfer_sent': 'Credits transferred',
    'transfer_received': 'Credits received',
    'purchase': 'Credits purchased',
    'refund': 'Refund',
    'store_purchase': 'Store purchase',
    'lucky_rep': 'Lucky rep bonus',
    'golden_set': 'Golden set bonus',
    'jackpot_workout': 'Jackpot workout',
    'mystery_box': 'Mystery box reward',
    'comeback_bonus': 'Comeback bonus',
  };

  // Check for specific action patterns
  if (action.startsWith('bonus.')) {
    const bonusType = action.replace('bonus.', '');
    return actionDescriptions[bonusType] || `Bonus: ${bonusType}`;
  }

  if (action.startsWith('refund.')) {
    return `Refund: ${action.replace('refund.', '')}`;
  }

  const description = actionDescriptions[action];
  if (description) return description;

  // Humanize action name if not found
  return action
    .replace(/_/g, ' ')
    .replace(/\./g, ' - ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// TU CALCULATION
// ============================================

interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
}

/**
 * Calculate cosine similarity between two muscle activation vectors
 */
function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const allMuscles = new Set([...Object.keys(a), ...Object.keys(b)]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const muscle of allMuscles) {
    const valA = a[muscle] || 0;
    const valB = b[muscle] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function calculateTU(exercises: WorkoutExercise[]): Promise<{
  totalTU: number;
  muscleActivations: Record<string, number>;
}> {
  const muscleActivations: Record<string, number> = {};
  const exerciseIds = exercises.map((e) => e.exerciseId);

  if (exerciseIds.length === 0) {
    return { totalTU: 0, muscleActivations: {} };
  }

  const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');
  const activations = await queryAll<{ exercise_id: string; muscle_id: string; activation: number }>(
    `SELECT exercise_id, muscle_id, activation FROM exercise_activations WHERE exercise_id IN (${placeholders})`,
    exerciseIds
  );

  const activationMap: Record<string, Record<string, number>> = {};
  for (const row of activations) {
    if (!activationMap[row.exercise_id]) {
      activationMap[row.exercise_id] = {};
    }
    activationMap[row.exercise_id][row.muscle_id] = row.activation;
  }

  for (const exercise of exercises) {
    const exerciseActivations = activationMap[exercise.exerciseId] || {};
    for (const [muscleId, activation] of Object.entries(exerciseActivations)) {
      const contribution = exercise.sets * (activation / 100);
      muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + contribution;
    }
  }

  const muscleIds = Object.keys(muscleActivations);
  if (muscleIds.length === 0) {
    return { totalTU: 0, muscleActivations: {} };
  }

  const musclePlaceholders = muscleIds.map((_, i) => `$${i + 1}`).join(',');
  const muscles = await queryAll<{ id: string; bias_weight: number }>(
    `SELECT id, bias_weight FROM muscles WHERE id IN (${musclePlaceholders})`,
    muscleIds
  );

  const biasMap = new Map(muscles.map((m) => [m.id, m.bias_weight]));

  let totalTU = 0;
  for (const [muscleId, rawActivation] of Object.entries(muscleActivations)) {
    const biasWeight = biasMap.get(muscleId) || 1;
    totalTU += rawActivation * biasWeight;
  }

  return { totalTU: Math.round(totalTU * 100) / 100, muscleActivations };
}

// ============================================
// RESOLVERS
// ============================================

export const resolvers = {
  // Scalars
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  // ============================================
  // QUERIES
  // ============================================
  Query: {
    // Auth
    me: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const user = await queryOne<{
        id: string;
        email: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        social_links: Record<string, string> | null;
        current_identity_id: string | null;
        level: number;
        xp: number;
        roles: string[];
        created_at: Date;
      }>(
        `SELECT id, email, username, display_name, avatar_url, bio, social_links, current_identity_id,
                COALESCE(current_level, 1) as level, COALESCE(total_xp, 0) as xp, roles, created_at
         FROM users WHERE id = $1`,
        [userId]
      );
      if (!user) return null;

      // Get credit balance for wealth tier calculation
      const credits = await economyService.getBalance(userId);

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        bio: user.bio,
        socialLinks: user.social_links,
        identityId: user.current_identity_id,
        level: user.level,
        xp: user.xp,
        wealthTier: buildWealthTierResponse(credits),
        roles: user.roles || ['user'],
        createdAt: user.created_at,
      };
    },

    myCapabilities: async (_: unknown, __: unknown, context: Context) => {
      const { userId: _userId, roles } = requireAuth(context);
      return {
        canCreateWorkout: true,
        canJoinHangouts: true,
        canMessage: true,
        canVote: true,
        isAdmin: roles.includes('admin'),
        isPremium: false,
        dailyWorkoutLimit: 10,
        remainingWorkouts: 10,
      };
    },

    // Exercises & Muscles
    exercises: async (_: unknown, args: { search?: string; muscleGroup?: string; equipment?: string; limit?: number }) => {
      const limit = Math.min(args.limit || 100, 500);
      let sql = `SELECT id, name, description, type, primary_muscles, difficulty, cues,
                        equipment_required, equipment_optional, locations, is_compound,
                        movement_pattern, image_url, video_url
                 FROM exercises WHERE 1=1`;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (args.search) {
        sql += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${args.search}%`);
        paramIndex++;
      }
      if (args.muscleGroup) {
        sql += ` AND $${paramIndex} = ANY(primary_muscles)`;
        params.push(args.muscleGroup);
        paramIndex++;
      }
      if (args.equipment) {
        sql += ` AND ($${paramIndex} = ANY(equipment_required) OR $${paramIndex} = ANY(equipment_optional))`;
        params.push(args.equipment);
        paramIndex++;
      }

      sql += ` LIMIT $${paramIndex}`;
      params.push(limit);

      const exercises = await queryAll(sql, params);
      return exercises.map((e: any) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        type: e.type || e.movement_pattern,
        primaryMuscles: Array.isArray(e.primary_muscles) ? e.primary_muscles : (e.primary_muscles ? String(e.primary_muscles).split(',') : []),
        secondaryMuscles: [],
        equipment: [...(e.equipment_required || []), ...(e.equipment_optional || [])],
        difficulty: e.difficulty,
        instructions: e.cues ? (Array.isArray(e.cues) ? e.cues : [e.cues]) : [],
        tips: [],
        imageUrl: e.image_url || null,
        videoUrl: e.video_url || null,
      }));
    },

    exercise: async (_: unknown, args: { id: string }) => {
      const e = await queryOne<any>(
        `SELECT id, name, description, type, primary_muscles, difficulty, cues,
                equipment_required, equipment_optional, locations, is_compound,
                movement_pattern, image_url, video_url
         FROM exercises WHERE id = $1`,
        [args.id]
      );
      if (!e) return null;
      return {
        id: e.id,
        name: e.name,
        description: e.description,
        type: e.type || e.movement_pattern,
        primaryMuscles: Array.isArray(e.primary_muscles) ? e.primary_muscles : (e.primary_muscles ? String(e.primary_muscles).split(',') : []),
        secondaryMuscles: [],
        equipment: [...(e.equipment_required || []), ...(e.equipment_optional || [])],
        difficulty: e.difficulty,
        instructions: e.cues ? (Array.isArray(e.cues) ? e.cues : [e.cues]) : [],
        tips: [],
        imageUrl: e.image_url || null,
        videoUrl: e.video_url || null,
      };
    },

    muscles: async () => {
      const muscles = await queryAll('SELECT id, name, anatomical_name, muscle_group, bias_weight FROM muscles');
      return muscles.map((m: any) => ({
        id: m.id,
        name: m.name,
        group: m.muscle_group,
        subGroup: m.anatomical_name,
        description: null,
      }));
    },

    // User's muscle activation data aggregated from recent workouts
    myMuscleActivations: async (_: unknown, _args: unknown, context: Context) => {
      const userId = context.user?.userId;

      // If not authenticated, return empty array
      if (!userId) {
        return [];
      }

      // Get muscle activations from user's workouts in the last 30 days
      const workouts = await queryAll<{ muscle_activations: Record<string, number> | null }>(
        `SELECT muscle_activations FROM workouts
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
         AND muscle_activations IS NOT NULL`,
        [userId]
      );

      // Aggregate muscle activations
      const muscleActivations: Record<string, number> = {};
      for (const row of workouts) {
        const activations = row.muscle_activations || {};
        for (const [muscleId, value] of Object.entries(activations)) {
          muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + (value as number);
        }
      }

      // Convert to array format and sort by activation level
      return Object.entries(muscleActivations)
        .map(([muscleId, activation]) => ({
          muscleId,
          activation: Math.min(100, Math.round(activation)), // Cap at 100
        }))
        .sort((a, b) => b.activation - a.activation);
    },

    // Workouts - uses keyset pagination for O(1) performance
    myWorkouts: async (_: unknown, args: { limit?: number; offset?: number; cursor?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);

      // Support both cursor-based (preferred) and offset-based (legacy) pagination
      let workouts;
      if (args.cursor) {
        // Keyset pagination - O(1) performance
        const [cursorDate, cursorId] = args.cursor.split('_');
        workouts = await queryAll(
          `SELECT id, user_id, date, total_tu, notes, exercise_data, muscle_activations, created_at
           FROM workouts WHERE user_id = $1
           AND (date, created_at, id) < ($2::date, $3::timestamptz, $4::uuid)
           ORDER BY date DESC, created_at DESC, id DESC
           LIMIT $5`,
          [userId, cursorDate, cursorDate, cursorId, limit]
        );
      } else if (args.offset) {
        // Legacy offset pagination - O(n) performance, kept for backwards compatibility
        workouts = await queryAll(
          `SELECT id, user_id, date, total_tu, notes, exercise_data, muscle_activations, created_at
           FROM workouts WHERE user_id = $1
           ORDER BY date DESC, created_at DESC
           LIMIT $2 OFFSET $3`,
          [userId, limit, args.offset]
        );
      } else {
        // First page - no cursor needed
        workouts = await queryAll(
          `SELECT id, user_id, date, total_tu, notes, exercise_data, muscle_activations, created_at
           FROM workouts WHERE user_id = $1
           ORDER BY date DESC, created_at DESC, id DESC
           LIMIT $2`,
          [userId, limit]
        );
      }

      return workouts.map((w: any) => ({
        id: w.id,
        userId: w.user_id,
        // FIXED: exercise_data is JSONB - PostgreSQL returns it as already-parsed object
        exercises: w.exercise_data || [],
        duration: null,
        notes: w.notes,
        totalTU: w.total_tu,
        createdAt: w.created_at,
        // Add cursor for next page
        cursor: `${w.date}_${w.id}`,
      }));
    },

    myWorkoutStats: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const [allTime, thisWeek, thisMonth] = await Promise.all([
        queryOne<{ count: number; total_tu: number }>(
          `SELECT COUNT(*)::int as count, COALESCE(SUM(total_tu), 0)::float as total_tu
           FROM workouts WHERE user_id = $1`,
          [userId]
        ),
        queryOne<{ count: number }>(
          `SELECT COUNT(*)::int as count FROM workouts
           WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
          [userId]
        ),
        queryOne<{ count: number }>(
          `SELECT COUNT(*)::int as count FROM workouts
           WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
          [userId]
        ),
      ]);

      return {
        totalWorkouts: allTime?.count || 0,
        totalExercises: 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        averageWorkoutDuration: 0,
        currentStreak: 0,
        longestStreak: 0,
        thisWeek: thisWeek?.count || 0,
        thisMonth: thisMonth?.count || 0,
      };
    },

    workout: async (_: unknown, args: { id: string }, context: Context) => {
      const workout = await queryOne<any>(
        `SELECT id, user_id, date, total_tu, notes, is_public, exercise_data, muscle_activations, created_at
         FROM workouts WHERE id = $1`,
        [args.id]
      );

      if (!workout) return null;
      if (!workout.is_public && workout.user_id !== context.user?.userId) return null;

      return {
        id: workout.id,
        userId: workout.user_id,
        // FIXED: exercise_data is JSONB - PostgreSQL returns it as already-parsed object
        exercises: workout.exercise_data || [],
        duration: null,
        notes: workout.notes,
        totalTU: workout.total_tu,
        createdAt: workout.created_at,
      };
    },

    // Workout Sessions (real-time logging)
    activeWorkoutSession: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.getActiveSession(userId);
    },

    workoutSession: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.getSession(userId, args.id);
    },

    recoverableSessions: async (_: unknown, args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.getRecoverableSessions(userId, args.limit || 5);
    },

    workoutMuscleBreakdown: async (_: unknown, args: { sessionId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.getMuscleBreakdown(userId, args.sessionId);
    },

    // Exercise History (PRs and best lifts for workout mode)
    exerciseHistory: async (_: unknown, args: { exerciseIds: string[] }, context: Context) => {
      const { userId } = requireAuth(context);
      const { exerciseIds } = args;

      if (!exerciseIds || exerciseIds.length === 0) {
        return [];
      }

      // Limit to 50 exercises per request to prevent abuse
      const limitedIds = exerciseIds.slice(0, 50);

      // Fetch exercise history for all requested exercises in parallel
      const historyPromises = limitedIds.map(async (exerciseId) => {
        try {
          const stats = await ProgressionService.getExerciseStats(userId, exerciseId);
          if (!stats) {
            return {
              exerciseId,
              exerciseName: null,
              bestWeight: 0,
              best1RM: 0,
              bestVolume: 0,
              lastPerformedAt: null,
              totalSessions: 0,
            };
          }
          return {
            exerciseId,
            exerciseName: stats.exerciseName,
            bestWeight: stats.maxWeight || 0,
            best1RM: stats.estimated1RM || 0,
            bestVolume: stats.weeklyVolume || 0,
            lastPerformedAt: stats.lastWorkoutDate || null,
            totalSessions: stats.totalSessions,
          };
        } catch (err) {
          log.warn({ err, exerciseId, userId }, 'Failed to get exercise history');
          return {
            exerciseId,
            exerciseName: null,
            bestWeight: 0,
            best1RM: 0,
            bestVolume: 0,
            lastPerformedAt: null,
            totalSessions: 0,
          };
        }
      });

      return Promise.all(historyPromises);
    },

    // Goals
    goals: async (_: unknown, args: { status?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      let query = `SELECT id, user_id, goal_type, target_value, target_unit, starting_value,
                          current_value, target_date, status, is_primary, notes, created_at, updated_at
                   FROM user_goals WHERE user_id = $1`;
      const params: any[] = [userId];

      if (args.status) {
        query += ' AND status = $2';
        params.push(args.status);
      }

      query += ' ORDER BY is_primary DESC, created_at DESC';

      const goals = await queryAll(query, params);
      return goals.map((g: any) => ({
        id: g.id,
        userId: g.user_id,
        type: g.goal_type,
        title: g.goal_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Goal',
        description: g.notes || '',
        target: g.target_value ? parseFloat(g.target_value) : null,
        current: g.current_value ? parseFloat(g.current_value) : null,
        unit: g.target_unit,
        deadline: g.target_date,
        status: g.status,
        isPrimary: g.is_primary,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      }));
    },

    // Archetypes
    archetypes: async () => {
      const archetypes = await queryAll(
        `SELECT id, name, description, philosophy, icon_url, image_url, category_id, focus_areas
         FROM archetypes ORDER BY name`
      );
      return archetypes.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        philosophy: a.philosophy,
        icon: a.icon_url,
        imageUrl: a.image_url,
        categoryId: a.category_id,
        color: null, // Column doesn't exist in schema
        primaryStats: [],
        bonuses: null,
        focusAreas: a.focus_areas || [],
      }));
    },

    archetypeCategories: async () => {
      const categories = await queryAll(
        `SELECT id, name, description, icon, display_order
         FROM archetype_categories ORDER BY display_order, name`
      );
      return categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        displayOrder: c.display_order,
      }));
    },

    archetypesByCategory: async (_: unknown, args: { categoryId: string }) => {
      const archetypes = await queryAll(
        `SELECT id, name, description, philosophy, icon_url, image_url, category_id, focus_areas
         FROM archetypes WHERE category_id = $1 ORDER BY name`,
        [args.categoryId]
      );
      return archetypes.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        philosophy: a.philosophy,
        icon: a.icon_url,
        imageUrl: a.image_url,
        categoryId: a.category_id,
        color: null,
        primaryStats: [],
        bonuses: null,
        focusAreas: a.focus_areas || [],
      }));
    },

    archetype: async (_: unknown, args: { id: string }) => {
      const a = await queryOne<any>(
        `SELECT id, name, description, philosophy, icon_url, image_url, category_id, focus_areas
         FROM archetypes WHERE id = $1`,
        [args.id]
      );
      if (!a) return null;
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        philosophy: a.philosophy,
        icon: a.icon_url,
        imageUrl: a.image_url,
        categoryId: a.category_id,
        color: null,
        primaryStats: [],
        bonuses: null,
        focusAreas: a.focus_areas || [],
      };
    },

    // Journey
    journey: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const user = await queryOne<any>(
        `SELECT u.id, u.current_identity_id as archetype_id, u.current_level as level,
                COALESCE(cs.total_xp, 0) as xp, a.name as archetype_name
         FROM users u
         LEFT JOIN archetypes a ON u.current_identity_id = a.id
         LEFT JOIN character_stats cs ON u.id = cs.user_id
         WHERE u.id = $1`,
        [userId]
      );
      if (!user) return null;

      const level = user.level || 1;
      const xp = user.xp || 0;
      const xpToNextLevel = level * 1000;

      return {
        userId: user.id,
        archetype: user.archetype_id ? { id: user.archetype_id, name: user.archetype_name } : null,
        currentLevel: level,
        currentXP: xp,
        xpToNextLevel,
        totalXP: xp,
        completedMilestones: [],
        unlockedAbilities: [],
      };
    },

    // Comprehensive journey overview - matches REST /api/journey
    journeyOverview: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      // Get user's archetype, level, and join date
      const user = await queryOne<{
        current_identity_id: string;
        current_level: number;
        created_at: Date;
      }>(
        'SELECT current_identity_id, current_level, created_at FROM users WHERE id = $1',
        [userId]
      );

      // Calculate days since joined
      const daysSinceJoined = user?.created_at
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Get total workout stats
      const totalStats = await queryOne<{
        total_workouts: string;
        total_tu: string;
      }>(
        `SELECT
           COUNT(*)::text as total_workouts,
           COALESCE(SUM(total_tu), 0)::text as total_tu
         FROM workouts WHERE user_id = $1`,
        [userId]
      );

      const totalWorkouts = parseInt(totalStats?.total_workouts || '0');
      const totalTU = parseFloat(totalStats?.total_tu || '0');

      // Calculate streak
      const streakResult = await queryOne<{ streak: string }>(
        `WITH workout_dates AS (
          SELECT DISTINCT date::date as workout_date
          FROM workouts
          WHERE user_id = $1
          ORDER BY workout_date DESC
        ),
        date_series AS (
          SELECT workout_date,
                 workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int AS grp
          FROM workout_dates
        )
        SELECT COUNT(*)::text as streak
        FROM date_series
        WHERE grp = (SELECT grp FROM date_series WHERE workout_date = CURRENT_DATE OR workout_date = CURRENT_DATE - 1 LIMIT 1)`,
        [userId]
      );
      const streak = parseInt(streakResult?.streak || '0');

      // Get weekly stats
      const weeklyStats = await queryOne<{ workouts: string; tu: string }>(
        `SELECT COUNT(*)::text as workouts, COALESCE(SUM(total_tu), 0)::text as tu
         FROM workouts WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
        [userId]
      );
      const weeklyWorkouts = parseInt(weeklyStats?.workouts || '0');
      const weeklyTU = parseFloat(weeklyStats?.tu || '0');

      // Get monthly stats
      const monthlyStats = await queryOne<{ workouts: string; tu: string }>(
        `SELECT COUNT(*)::text as workouts, COALESCE(SUM(total_tu), 0)::text as tu
         FROM workouts WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
        [userId]
      );
      const monthlyWorkouts = parseInt(monthlyStats?.workouts || '0');
      const monthlyTU = parseFloat(monthlyStats?.tu || '0');

      // Get archetype info
      let currentArchetype = user?.current_identity_id || 'default';
      let currentLevelName = 'Beginner';
      let nextLevelTU = 1000;

      if (user?.current_identity_id) {
        const level = await queryOne<{ name: string; total_tu: number }>(
          'SELECT name, total_tu FROM archetype_levels WHERE archetype_id = $1 AND level = $2',
          [user.current_identity_id, user.current_level || 1]
        );
        if (level) currentLevelName = level.name;

        const nextLevel = await queryOne<{ total_tu: number }>(
          'SELECT total_tu FROM archetype_levels WHERE archetype_id = $1 AND level = $2',
          [user.current_identity_id, (user.current_level || 1) + 1]
        );
        if (nextLevel) nextLevelTU = nextLevel.total_tu - totalTU;
      }

      // Get 30-day workout history
      const workoutHistory = await queryAll<{ date: string; tu: string; count: string }>(
        `WITH date_series AS (
          SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS date
        )
        SELECT ds.date::text as date, COALESCE(SUM(w.total_tu), 0)::text as tu, COUNT(w.id)::text as count
        FROM date_series ds
        LEFT JOIN workouts w ON w.date = ds.date AND w.user_id = $1
        GROUP BY ds.date ORDER BY ds.date ASC`,
        [userId]
      );

      // Get top exercises
      const topExercises = await queryAll<{ id: string; name: string; count: string }>(
        `SELECT e.id, e.name, COUNT(*)::text as count
         FROM workouts w
         CROSS JOIN LATERAL jsonb_array_elements(w.exercise_data) AS ex
         JOIN exercises e ON e.id = (ex->>'exerciseId')
         WHERE w.user_id = $1
         GROUP BY e.id, e.name ORDER BY COUNT(*) DESC LIMIT 10`,
        [userId]
      );

      // Get archetype levels
      const levels = user?.current_identity_id
        ? await queryAll<{ level: number; name: string; total_tu: number }>(
            'SELECT level, name, total_tu FROM archetype_levels WHERE archetype_id = $1 ORDER BY level',
            [user.current_identity_id]
          )
        : [];

      // Get muscle data
      const muscleData = await queryAll<{ muscle_activations: Record<string, number> | null }>(
        `SELECT muscle_activations FROM workouts WHERE user_id = $1 AND muscle_activations IS NOT NULL`,
        [userId]
      );

      const muscleGroups: Record<string, number> = {};
      const muscleBreakdown: Record<string, { name: string; group: string; total: number }> = {};

      for (const row of muscleData) {
        const activations = row.muscle_activations || {};
        for (const [muscleId, value] of Object.entries(activations)) {
          const numValue = typeof value === 'number' ? value : 0;
          let group = 'Other';
          const muscleLower = muscleId.toLowerCase();
          if (muscleLower.includes('pec') || muscleLower.includes('chest')) group = 'Chest';
          else if (muscleLower.includes('lat') || muscleLower.includes('back') || muscleLower.includes('rhomb') || muscleLower.includes('trap')) group = 'Back';
          else if (muscleLower.includes('delt') || muscleLower.includes('shoulder')) group = 'Shoulders';
          else if (muscleLower.includes('bicep') || muscleLower.includes('tricep') || muscleLower.includes('forearm')) group = 'Arms';
          else if (muscleLower.includes('quad') || muscleLower.includes('hamstr') || muscleLower.includes('calf') || muscleLower.includes('glute')) group = 'Legs';
          else if (muscleLower.includes('abs') || muscleLower.includes('oblique') || muscleLower.includes('core')) group = 'Core';

          muscleGroups[group] = (muscleGroups[group] || 0) + numValue;
          if (!muscleBreakdown[muscleId]) muscleBreakdown[muscleId] = { name: muscleId, group, total: 0 };
          muscleBreakdown[muscleId].total += numValue;
        }
      }

      // Get recent workouts
      const recentWorkouts = await queryAll<{ id: string; date: string; total_tu: number; created_at: Date }>(
        `SELECT id, date::text, total_tu, created_at FROM workouts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      );

      // Get all archetypes for path switching
      const archetypes = await queryAll<{ id: string; name: string; philosophy: string; focus_areas: string[] | null }>(
        'SELECT id, name, philosophy, focus_areas FROM archetypes'
      );

      const paths = archetypes.map((a) => ({
        archetype: a.id,
        name: a.name,
        philosophy: a.philosophy,
        focusAreas: Array.isArray(a.focus_areas) ? a.focus_areas : [],
        isCurrent: a.id === currentArchetype,
        percentComplete: a.id === currentArchetype ? Math.min(100, (totalTU / 100000) * 100) : 0,
      }));

      return {
        currentArchetype,
        totalTU,
        currentLevel: user?.current_level || 1,
        currentLevelName,
        daysSinceJoined,
        totalWorkouts,
        streak,
        nextLevelTU: Math.max(0, nextLevelTU),
        stats: {
          weekly: { workouts: weeklyWorkouts, tu: weeklyTU, avgTuPerWorkout: weeklyWorkouts > 0 ? weeklyTU / weeklyWorkouts : 0 },
          monthly: { workouts: monthlyWorkouts, tu: monthlyTU, avgTuPerWorkout: monthlyWorkouts > 0 ? monthlyTU / monthlyWorkouts : 0 },
          allTime: { workouts: totalWorkouts, tu: totalTU, avgTuPerWorkout: totalWorkouts > 0 ? totalTU / totalWorkouts : 0 },
        },
        workoutHistory: workoutHistory.map((h) => ({ date: h.date, tu: parseFloat(h.tu), count: parseInt(h.count) })),
        topExercises: topExercises.map((e) => ({ id: e.id, name: e.name, count: parseInt(e.count) })),
        levels: levels.map((l) => ({ level: l.level, name: l.name, totalTu: l.total_tu, achieved: totalTU >= l.total_tu })),
        muscleGroups: Object.entries(muscleGroups).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
        muscleBreakdown: Object.entries(muscleBreakdown).map(([id, data]) => ({ id, name: data.name, group: data.group, totalActivation: data.total })).sort((a, b) => b.totalActivation - a.totalActivation),
        recentWorkouts: recentWorkouts.map((w) => ({ id: w.id, date: w.date, tu: w.total_tu, createdAt: w.created_at })),
        paths,
      };
    },

    // Skills
    skillTrees: async () => {
      const trees = await skillService.getSkillTrees();
      return trees.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        color: t.color,
        nodeCount: t.nodeCount || 0,
      }));
    },

    skillTree: async (_: unknown, args: { treeId: string }) => {
      const tree = await skillService.getSkillTree(args.treeId);
      if (!tree) return null;
      return {
        id: tree.id,
        name: tree.name,
        description: tree.description,
        icon: tree.icon,
        color: tree.color,
        nodeCount: tree.nodes?.length || 0,
        nodes: tree.nodes?.map((n: any) => ({
          id: n.id,
          treeId: n.treeId || args.treeId,
          name: n.name,
          description: n.description,
          tier: n.tier,
          position: n.position,
          difficulty: n.difficulty,
          criteriaType: n.criteriaType,
          criteriaValue: n.criteriaValue,
          criteriaDescription: n.criteriaDescription,
          xpReward: n.xpReward || 0,
          creditReward: n.creditReward || 0,
          tips: n.tips || [],
        })),
      };
    },

    skillTreeProgress: async (_: unknown, args: { treeId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const progress = await skillService.getUserTreeProgress(userId, args.treeId);
      return progress.map((n: any) => ({
        id: n.id,
        treeId: n.treeId || args.treeId,
        name: n.name,
        description: n.description,
        tier: n.tier,
        position: n.position,
        difficulty: n.difficulty,
        criteriaType: n.criteriaType,
        criteriaValue: n.criteriaValue,
        criteriaDescription: n.criteriaDescription,
        xpReward: n.xpReward || 0,
        creditReward: n.creditReward || 0,
        tips: n.tips || [],
        progress: n.progress ? {
          status: n.progress.status,
          practiceMinutes: n.progress.practiceMinutes || 0,
          practiceCount: n.progress.practiceCount || 0,
          bestValue: n.progress.bestValue,
          achievedAt: n.progress.achievedAt,
        } : null,
      }));
    },

    skillSummary: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const summary = await skillService.getUserSkillSummary(userId);
      const total = summary.totalSkills || 0;
      const achieved = summary.achievedSkills || 0;
      const inProgress = summary.inProgressSkills || 0;
      const available = summary.availableSkills || 0;
      // Calculate locked as: total - (achieved + inProgress + available)
      const locked = Math.max(0, total - achieved - inProgress - available);
      return {
        totalSkills: total,
        achievedSkills: achieved,
        inProgressSkills: inProgress,
        availableSkills: available,
        lockedSkills: locked,
        totalPracticeMinutes: summary.totalPracticeMinutes || 0,
      };
    },

    // Martial Arts
    martialArtsDisciplines: async (_: unknown, args: { militaryOnly?: boolean }) => {
      const disciplines = await martialArtsService.getDisciplines({ militaryOnly: args.militaryOnly });
      return disciplines.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        originCountry: d.originCountry,
        focusAreas: d.focusAreas,
        icon: d.icon,
        color: d.color,
        orderIndex: d.orderIndex,
        isMilitary: d.isMilitary,
        categories: null, // Loaded separately if needed
      }));
    },

    martialArtsDiscipline: async (_: unknown, args: { id: string }) => {
      const discipline = await martialArtsService.getDiscipline(args.id);
      if (!discipline) return null;
      return {
        id: discipline.id,
        name: discipline.name,
        description: discipline.description,
        originCountry: discipline.originCountry,
        focusAreas: discipline.focusAreas,
        icon: discipline.icon,
        color: discipline.color,
        orderIndex: discipline.orderIndex,
        isMilitary: discipline.isMilitary,
        categories: discipline.categories?.map((c) => ({
          id: c.id,
          disciplineId: c.disciplineId,
          name: c.name,
          description: c.description,
          orderIndex: c.orderIndex,
        })),
      };
    },

    martialArtsTechniques: async (_: unknown, args: { disciplineId: string }) => {
      const techniques = await martialArtsService.getTechniques(args.disciplineId);
      return techniques.map((t) => ({
        id: t.id,
        disciplineId: t.disciplineId,
        categoryId: t.categoryId,
        name: t.name,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        prerequisites: t.prerequisites,
        keyPoints: t.keyPoints,
        commonMistakes: t.commonMistakes,
        drillSuggestions: t.drillSuggestions,
        videoUrl: t.videoUrl,
        thumbnailUrl: t.thumbnailUrl,
        muscleGroups: t.muscleGroups,
        xpReward: t.xpReward,
        creditReward: t.creditReward,
        tier: t.tier,
        position: t.position,
        progress: null,
      }));
    },

    martialArtsTechnique: async (_: unknown, args: { id: string }) => {
      const technique = await martialArtsService.getTechnique(args.id);
      if (!technique) return null;
      return {
        id: technique.id,
        disciplineId: technique.disciplineId,
        categoryId: technique.categoryId,
        name: technique.name,
        description: technique.description,
        category: technique.category,
        difficulty: technique.difficulty,
        prerequisites: technique.prerequisites,
        keyPoints: technique.keyPoints,
        commonMistakes: technique.commonMistakes,
        drillSuggestions: technique.drillSuggestions,
        videoUrl: technique.videoUrl,
        thumbnailUrl: technique.thumbnailUrl,
        muscleGroups: technique.muscleGroups,
        xpReward: technique.xpReward,
        creditReward: technique.creditReward,
        tier: technique.tier,
        position: technique.position,
        progress: null,
      };
    },

    martialArtsProgress: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const summary = await martialArtsService.getUserSummary(userId);
      return {
        totalTechniques: summary.totalTechniques,
        masteredTechniques: summary.masteredTechniques,
        learningTechniques: summary.learningTechniques,
        availableTechniques: summary.availableTechniques,
        totalPracticeMinutes: summary.totalPracticeMinutes,
        disciplineProgress: summary.disciplineProgress.map((d) => ({
          disciplineId: d.disciplineId,
          disciplineName: d.disciplineName,
          mastered: d.mastered,
          total: d.total,
        })),
      };
    },

    martialArtsDisciplineProgress: async (_: unknown, args: { disciplineId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const techniquesWithProgress = await martialArtsService.getUserDisciplineProgress(userId, args.disciplineId);
      return techniquesWithProgress.map((t) => ({
        id: t.id,
        disciplineId: t.disciplineId,
        categoryId: t.categoryId,
        name: t.name,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        prerequisites: t.prerequisites,
        keyPoints: t.keyPoints,
        commonMistakes: t.commonMistakes,
        drillSuggestions: t.drillSuggestions,
        videoUrl: t.videoUrl,
        thumbnailUrl: t.thumbnailUrl,
        muscleGroups: t.muscleGroups,
        xpReward: t.xpReward,
        creditReward: t.creditReward,
        tier: t.tier,
        position: t.position,
        progress: t.progress ? {
          id: t.progress.id,
          userId: t.progress.userId,
          techniqueId: t.progress.techniqueId,
          status: t.progress.status,
          proficiency: t.progress.proficiency,
          practiceCount: t.progress.practiceCount,
          totalPracticeMinutes: t.progress.totalPracticeMinutes,
          lastPracticed: t.progress.lastPracticed,
          masteredAt: t.progress.masteredAt,
          notes: t.progress.notes,
          createdAt: t.progress.createdAt,
          updatedAt: t.progress.updatedAt,
        } : null,
      }));
    },

    martialArtsDisciplineLeaderboard: async (_: unknown, args: { disciplineId: string; limit?: number }) => {
      const leaderboard = await martialArtsService.getDisciplineLeaderboard(args.disciplineId, { limit: args.limit });
      return leaderboard.map((entry) => ({
        userId: entry.userId,
        username: entry.username,
        masteredCount: entry.masteredCount,
        totalPracticeMinutes: entry.totalPracticeMinutes,
      }));
    },

    martialArtsPracticeHistory: async (_: unknown, args: { limit?: number; offset?: number; disciplineId?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const history = await martialArtsService.getPracticeHistory(userId, {
        limit: args.limit,
        offset: args.offset,
        disciplineId: args.disciplineId,
      });
      return {
        logs: history.logs.map((log) => ({
          id: log.id,
          userId: log.userId,
          techniqueId: log.techniqueId,
          techniqueName: log.techniqueName,
          disciplineName: log.disciplineName,
          practiceDate: log.practiceDate,
          durationMinutes: log.durationMinutes,
          repsPerformed: log.repsPerformed,
          roundsPerformed: log.roundsPerformed,
          partnerDrill: log.partnerDrill,
          notes: log.notes,
          createdAt: log.createdAt,
        })),
        total: history.total,
      };
    },

    // Stats
    myStats: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const stats = await statsService.getUserStats(userId);
      if (!stats) return null;

      // Get workout stats for total/streak info
      const workoutStats = await queryOne<{
        total_workouts: number;
        current_streak: number;
        longest_streak: number;
        last_workout_at: Date | null;
      }>(
        `SELECT
          COUNT(*)::int as total_workouts,
          0 as current_streak,
          0 as longest_streak,
          MAX(created_at) as last_workout_at
         FROM workouts WHERE user_id = $1`,
        [userId]
      );

      // Get user level/xp
      const user = await queryOne<{ level: number; xp: number }>(
        'SELECT COALESCE(current_level, 1) as level, COALESCE(total_xp, 0) as xp FROM users WHERE id = $1',
        [userId]
      );

      const level = user?.level || 1;
      const xp = user?.xp || 0;

      return {
        userId,
        level,
        xp,
        xpToNextLevel: level * 1000 - xp,
        strength: Number(stats.strength),
        endurance: Number(stats.endurance),
        agility: Number(stats.dexterity),
        flexibility: Number(stats.constitution),
        balance: Number(stats.power),
        mentalFocus: Number(stats.vitality),
        totalWorkouts: workoutStats?.total_workouts || 0,
        totalExercises: 0,
        currentStreak: workoutStats?.current_streak || 0,
        longestStreak: workoutStats?.longest_streak || 0,
        lastWorkoutAt: workoutStats?.last_workout_at,
      };
    },

    leaderboards: async (_: unknown, _args: { type?: string }) => {
      const leaderboard = await queryAll(
        `SELECT u.id, u.username, u.avatar_url, u.current_level as level,
                COALESCE(u.total_xp, 0) as xp, COALESCE(cs.strength, 0) as strength
         FROM users u
         LEFT JOIN character_stats cs ON cs.user_id = u.id
         WHERE u.total_xp IS NOT NULL OR cs.strength IS NOT NULL
         ORDER BY COALESCE(u.total_xp, 0) DESC
         LIMIT 100`
      );
      return leaderboard.map((entry: any, index: number) => ({
        rank: index + 1,
        userId: entry.id,
        username: entry.username,
        avatar: entry.avatar_url,
        level: entry.level || 1,
        xp: entry.xp || 0,
        stat: 'xp',
        value: entry.xp || 0,
      }));
    },

    // Long-Term Analytics
    yearlyStats: async (_: unknown, args: { year: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return longTermAnalyticsService.getYearlyStats(userId, args.year);
    },

    yearsList: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return longTermAnalyticsService.getYearsList(userId);
    },

    monthlyTrends: async (_: unknown, args: { months?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return longTermAnalyticsService.getMonthlyTrends(userId, args.months || 12);
    },

    progressVelocity: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return longTermAnalyticsService.getProgressVelocity(userId);
    },

    projectedMilestones: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return longTermAnalyticsService.getProjectedMilestones(userId);
    },

    yearInReview: async (_: unknown, args: { year: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return longTermAnalyticsService.getYearInReview(userId, args.year);
    },

    allTimeTuLeaderboard: async (_: unknown, args: { limit?: number; offset?: number }) => {
      return longTermAnalyticsService.getAllTimeTuLeaderboard(
        args.limit || 100,
        args.offset || 0
      );
    },

    // Community
    publicCommunityStats: async () => {
      const [userCount, workoutCount, activeCount] = await Promise.all([
        queryOne<{ count: number }>('SELECT COUNT(*)::int as count FROM users'),
        queryOne<{ count: number }>('SELECT COUNT(*)::int as count FROM workouts'),
        queryOne<{ count: number }>(
          `SELECT COUNT(DISTINCT user_id)::int as count FROM workouts
           WHERE created_at > NOW() - INTERVAL '15 minutes'`
        ),
      ]);

      const formatStat = (value: number, threshold: number = 5) => ({
        value,
        display: value < threshold ? `${threshold}+` : value.toString(),
      });

      return {
        activeNow: formatStat(activeCount?.count || 0),
        activeWorkouts: formatStat(activeCount?.count || 0),
        totalUsers: formatStat(userCount?.count || 0),
        totalWorkouts: formatStat(workoutCount?.count || 0),
        recentActivity: [],
        milestone: null,
      };
    },

    communityStats: async () => {
      const stats = await queryOne<{ user_count: number; workout_count: number }>(
        `SELECT
          (SELECT COUNT(*) FROM users)::int as user_count,
          (SELECT COUNT(*) FROM workouts WHERE date = CURRENT_DATE)::int as workout_count`
      );
      return {
        activeUsers: 0,
        activeWorkouts: 0,
        totalWorkoutsToday: stats?.workout_count || 0,
        totalWorkoutsWeek: 0,
        topArchetype: null,
      };
    },

    // Economy
    creditsBalance: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const balance = await economyService.getBalance(userId);
      return {
        credits: balance,
        pending: 0,
        lifetime: balance,
      };
    },

    economyBalance: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const balance = await economyService.getBalance(userId);
      return {
        credits: balance,
        pending: 0,
        lifetime: balance,
      };
    },

    // Enhanced Economy
    creditEarningSummary: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      // Get balance info
      const balanceRow = await queryOne<{
        balance: number;
        lifetime_earned: number;
        lifetime_spent: number;
      }>(
        'SELECT balance, lifetime_earned, lifetime_spent FROM credit_balances WHERE user_id = $1',
        [userId]
      );

      const balance = balanceRow?.balance ?? 0;
      const lifetimeEarned = balanceRow?.lifetime_earned ?? 0;
      const lifetimeSpent = balanceRow?.lifetime_spent ?? 0;

      // Get today/week/month earnings
      const earningsRow = await queryOne<{
        today: string;
        this_week: string;
        this_month: string;
        days_active: string;
      }>(
        `SELECT
          COALESCE(SUM(CASE WHEN amount > 0 AND created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today,
          COALESCE(SUM(CASE WHEN amount > 0 AND created_at >= DATE_TRUNC('week', CURRENT_DATE) THEN amount ELSE 0 END), 0) as this_week,
          COALESCE(SUM(CASE WHEN amount > 0 AND created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as this_month,
          COUNT(DISTINCT DATE(created_at)) FILTER (WHERE amount > 0 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as days_active
        FROM credit_ledger WHERE user_id = $1`,
        [userId]
      );

      // Get recent earn events
      const recentEarnings = await earnEventsService.getRecentEvents(userId, 10);

      // Calculate daily average over last 30 days
      const daysActive = parseInt(earningsRow?.days_active || '1') || 1;
      const last30DaysEarned = await queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM credit_ledger
         WHERE user_id = $1 AND amount > 0 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
        [userId]
      );
      const dailyAverage = parseFloat(last30DaysEarned?.total || '0') / Math.max(daysActive, 1);

      // Get streak bonus if applicable
      const streakRow = await queryOne<{ current_streak: number }>(
        `SELECT current_streak FROM user_stats WHERE user_id = $1`,
        [userId]
      );

      let streakBonus: number | null = null;
      const streak = streakRow?.current_streak ?? 0;
      if (streak >= 3) {
        // Calculate streak bonus based on current streak
        if (streak >= 365) streakBonus = 10000;
        else if (streak >= 100) streakBonus = 2500;
        else if (streak >= 60) streakBonus = 1000;
        else if (streak >= 30) streakBonus = 500;
        else if (streak >= 14) streakBonus = 200;
        else if (streak >= 7) streakBonus = 75;
        else if (streak >= 3) streakBonus = 25;
      }

      return {
        balance,
        pending: 0, // Future: implement pending credits for held transactions
        lifetimeEarned,
        lifetimeSpent,
        wealthTier: buildWealthTierResponse(balance),
        earnedToday: parseInt(earningsRow?.today || '0'),
        earnedThisWeek: parseInt(earningsRow?.this_week || '0'),
        earnedThisMonth: parseInt(earningsRow?.this_month || '0'),
        recentEarnings: recentEarnings.map(e => ({
          id: e.id,
          amount: e.amount,
          source: e.source,
          sourceId: e.sourceId,
          description: e.description,
          animationType: e.animationType,
          icon: e.icon,
          color: e.color,
          shown: e.shown,
          createdAt: e.createdAt,
        })),
        dailyAverage,
        streakBonus,
      };
    },

    creditEarnEvents: async (
      _: unknown,
      args: { unreadOnly?: boolean; limit?: number },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);

      const events = args.unreadOnly !== false
        ? await earnEventsService.getUnseenEvents(userId, limit)
        : await earnEventsService.getRecentEvents(userId, limit);

      // Get total unread count
      const unreadResult = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM credit_earn_events WHERE user_id = $1 AND shown = false',
        [userId]
      );

      return {
        events: events.map(e => ({
          id: e.id,
          amount: e.amount,
          source: e.source,
          sourceId: e.sourceId,
          description: e.description,
          animationType: e.animationType,
          icon: e.icon,
          color: e.color,
          shown: e.shown,
          createdAt: e.createdAt,
        })),
        totalUnread: parseInt(unreadResult?.count || '0'),
      };
    },

    bonusEventTypes: async (_: unknown, args: { enabledOnly?: boolean }) => {
      const eventTypes = await bonusEventsService.getEventTypes(args.enabledOnly !== false);
      return eventTypes.map(et => ({
        id: et.id,
        code: et.code,
        name: et.name,
        description: et.description,
        probability: et.probability,
        minCredits: et.minCredits,
        maxCredits: et.maxCredits,
        triggerOn: et.triggerOn,
        maxPerDay: et.maxPerDay,
        maxPerWeek: et.maxPerWeek,
        icon: et.icon,
        color: et.color,
        animation: et.animation,
        enabled: et.enabled,
      }));
    },

    bonusEventHistory: async (_: unknown, args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);
      const events = await bonusEventsService.getUserBonusHistory(userId, limit);
      return events.map(e => ({
        id: e.id,
        eventType: e.eventType,
        creditsAwarded: e.creditsAwarded,
        createdAt: e.createdAt,
      }));
    },

    creditPackages: async () => {
      const packages = await queryAll<{
        id: string;
        name: string;
        price_cents: number;
        credits: number;
        bonus_credits: number;
        bonus_percent: string;
        popular: boolean;
        best_value: boolean;
        display_order: number;
      }>(
        `SELECT id, name, price_cents, credits, bonus_credits, bonus_percent, popular, best_value, display_order
         FROM credit_packages WHERE enabled = true ORDER BY display_order`
      );

      return packages.map(p => ({
        id: p.id,
        name: p.name,
        priceCents: p.price_cents,
        credits: p.credits,
        bonusCredits: p.bonus_credits,
        bonusPercent: parseFloat(p.bonus_percent),
        totalCredits: p.credits + p.bonus_credits,
        popular: p.popular,
        bestValue: p.best_value,
        displayOrder: p.display_order,
      }));
    },

    transactionHistory: async (
      _: unknown,
      args: {
        input?: {
          action?: string;
          fromDate?: Date;
          toDate?: Date;
          limit?: number;
          cursor?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const input = args.input || {};
      const limit = Math.min(input.limit || 50, 100);

      // Build query with filters
      let sql = `SELECT id, action as type, amount, balance_after, metadata, created_at
                 FROM credit_ledger WHERE user_id = $1`;
      const params: any[] = [userId];
      let paramIndex = 2;

      if (input.action) {
        sql += ` AND action = $${paramIndex}`;
        params.push(input.action);
        paramIndex++;
      }

      if (input.fromDate) {
        sql += ` AND created_at >= $${paramIndex}`;
        params.push(input.fromDate);
        paramIndex++;
      }

      if (input.toDate) {
        sql += ` AND created_at <= $${paramIndex}`;
        params.push(input.toDate);
        paramIndex++;
      }

      // Cursor-based pagination
      if (input.cursor) {
        try {
          const decoded = Buffer.from(input.cursor, 'base64').toString('utf8');
          const [cursorDate, cursorId] = decoded.split('|');
          sql += ` AND (created_at < $${paramIndex} OR (created_at = $${paramIndex} AND id < $${paramIndex + 1}))`;
          params.push(cursorDate, cursorId);
          paramIndex += 2;
        } catch (_e) {
          // Invalid cursor, ignore
        }
      }

      sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
      params.push(limit + 1); // Fetch one extra to detect hasMore

      const rows = await queryAll<{
        id: string;
        type: string;
        amount: number;
        balance_after: number;
        metadata: any;
        created_at: Date;
      }>(sql, params);

      const hasMore = rows.length > limit;
      const transactions = rows.slice(0, limit);

      // Get total count for this query
      let countSql = `SELECT COUNT(*) as count FROM credit_ledger WHERE user_id = $1`;
      const countParams: any[] = [userId];
      let countParamIndex = 2;

      if (input.action) {
        countSql += ` AND action = $${countParamIndex}`;
        countParams.push(input.action);
        countParamIndex++;
      }

      if (input.fromDate) {
        countSql += ` AND created_at >= $${countParamIndex}`;
        countParams.push(input.fromDate);
        countParamIndex++;
      }

      if (input.toDate) {
        countSql += ` AND created_at <= $${countParamIndex}`;
        countParams.push(input.toDate);
      }

      const countResult = await queryOne<{ count: string }>(countSql, countParams);

      // Generate next cursor
      let nextCursor: string | null = null;
      if (hasMore && transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        nextCursor = Buffer.from(`${lastTx.created_at.toISOString()}|${lastTx.id}`).toString('base64');
      }

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: getTransactionDescription(t.type, t.amount, t.metadata),
          createdAt: t.created_at,
          metadata: t.metadata,
        })),
        totalCount: parseInt(countResult?.count || '0'),
        hasMore,
        nextCursor,
      };
    },

    // Tips
    tips: async (_: unknown, args: { context?: string; exerciseId?: string }, _context: Context) => {
      let sql = `SELECT id, type, title, content, category, exercise_id, priority
                 FROM tips WHERE 1=1`;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (args.exerciseId) {
        sql += ` AND (exercise_id = $${paramIndex} OR exercise_id IS NULL)`;
        params.push(args.exerciseId);
        paramIndex++;
      }

      sql += ` ORDER BY priority DESC LIMIT 10`;

      const tips = await queryAll(sql, params);
      return tips.map((t: any) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        content: t.content,
        category: t.category,
        exerciseId: t.exercise_id,
        priority: t.priority,
        seen: false,
      }));
    },

    // Health
    health: async () => ({
      status: 'healthy',
      timestamp: new Date(),
    }),

    healthDetailed: async () => ({
      status: 'healthy',
      version: '2.0.0',
      uptime: process.uptime(),
      database: { connected: true, latency: 1 },
      redis: { connected: true, latency: 1 },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
    }),

    // Training Programs Queries
    trainingPrograms: async (
      _: unknown,
      args: { input?: import('../modules/programs/types').ProgramSearchOptions },
      context: Context
    ) => {
      const result = await ProgramsService.search(args.input || {}, context.user?.userId);
      return result.programs;
    },

    trainingProgram: async (_: unknown, args: { id: string }, context: Context) => {
      return ProgramsService.getById(args.id, context.user?.userId);
    },

    officialPrograms: async (_: unknown, __: unknown, context: Context) => {
      return ProgramsService.getOfficialPrograms(context.user?.userId);
    },

    featuredPrograms: async (_: unknown, args: { limit?: number }, context: Context) => {
      return ProgramsService.getFeaturedPrograms(args.limit || 10, context.user?.userId);
    },

    myPrograms: async (_: unknown, args: { limit?: number; offset?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await ProgramsService.getUserPrograms(userId, {
        limit: args.limit || 20,
        offset: args.offset || 0,
      });
      return result.programs;
    },

    myEnrollments: async (
      _: unknown,
      args: { status?: string; limit?: number; offset?: number },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const result = await EnrollmentService.getUserEnrollments(userId, {
        status: args.status as 'active' | 'paused' | 'completed' | 'dropped' | undefined,
        limit: args.limit || 20,
        offset: args.offset || 0,
      });
      return result.enrollments;
    },

    activeEnrollment: async (_: unknown, args: { programId?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.getActiveEnrollment(userId, args.programId);
    },

    enrollment: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.getEnrollmentWithProgram(args.id, userId);
    },

    todaysWorkout: async (_: unknown, args: { programId?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.getTodaysWorkout(userId, args.programId);
    },

    // Sleep & Recovery Queries
    sleepLog: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.getSleepLog(userId, args.id);
    },

    lastSleep: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.getLastSleep(userId);
    },

    sleepHistory: async (
      _: unknown,
      args: { limit?: number; cursor?: string; startDate?: string; endDate?: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      let cursor: { bedTime: string; id: string } | undefined;

      if (args.cursor) {
        try {
          cursor = JSON.parse(Buffer.from(args.cursor, 'base64').toString());
        } catch {
          // Invalid cursor, start from beginning
        }
      }

      const result = await sleepService.getSleepHistory(userId, {
        limit: args.limit || 30,
        cursor,
        startDate: args.startDate,
        endDate: args.endDate,
      });

      const nextCursor = result.nextCursor
        ? Buffer.from(JSON.stringify(result.nextCursor)).toString('base64')
        : null;

      return {
        logs: result.logs,
        nextCursor,
        hasMore: result.nextCursor !== null,
      };
    },

    sleepStats: async (_: unknown, args: { period?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.getSleepStats(userId, (args.period || 'week') as 'week' | 'month' | 'all');
    },

    weeklySleepStats: async (_: unknown, args: { weeks?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.getWeeklySleepStats(userId, args.weeks || 8);
    },

    sleepGoal: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.getActiveSleepGoal(userId);
    },

    recoveryScore: async (_: unknown, args: { forceRecalculate?: boolean }, context: Context) => {
      const { userId } = requireAuth(context);
      return recoveryService.getRecoveryScore(userId, { forceRecalculate: args.forceRecalculate });
    },

    recoveryStatus: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return recoveryService.getRecoveryStatus(userId);
    },

    recoveryHistory: async (_: unknown, args: { days?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return recoveryService.getRecoveryHistory(userId, args.days || 30);
    },

    recoveryRecommendations: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return recoveryService.getActiveRecommendations(userId);
    },

    // RPE/RIR Queries
    rpeScale: async () => {
      const scaleInfo = rpeService.getRPEScaleInfo();
      return {
        scale: Object.entries(scaleInfo).map(([rpe, info]) => ({
          rpe: parseFloat(rpe),
          rir: rpeService.RPE_TO_RIR[parseFloat(rpe)] ?? null,
          description: info.description,
          intensity: info.intensity,
        })),
        guide: [
          { rpe: 10, rir: 0, label: 'Max effort', description: 'Could not do more reps' },
          { rpe: 9, rir: 1, label: 'Very hard', description: 'Could do 1 more rep' },
          { rpe: 8, rir: 2, label: 'Hard', description: 'Could do 2 more reps' },
          { rpe: 7, rir: 3, label: 'Moderate-hard', description: 'Could do 3 more reps' },
          { rpe: 6, rir: 4, label: 'Moderate', description: 'Could do 4+ more reps' },
          { rpe: 5, rir: 5, label: 'Light', description: 'Warm-up / light work' },
        ],
      };
    },

    rpeTrends: async (_: unknown, args: { exerciseId: string; days?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const days = args.days ? Math.min(Math.max(args.days, 7), 365) : 30;
      const trends = await rpeService.getRPETrends(userId, args.exerciseId, days);

      let avgRpe = 0;
      let totalSets = 0;
      let trend = 'stable';

      if (trends.length > 0) {
        avgRpe = trends.reduce((sum, t) => sum + t.avgRpe, 0) / trends.length;
        totalSets = trends.reduce((sum, t) => sum + t.setCount, 0);

        if (trends.length >= 3) {
          const recent = trends.slice(0, 3);
          const oldest = recent[recent.length - 1].avgRpe;
          const newest = recent[0].avgRpe;
          const diff = newest - oldest;
          if (diff > 0.5) trend = 'increasing';
          else if (diff < -0.5) trend = 'decreasing';
        }
      }

      return {
        exerciseId: args.exerciseId,
        exerciseName: trends[0]?.exerciseName,
        trends: trends.map((t) => ({
          date: t.date,
          avgRpe: t.avgRpe,
          avgRir: t.avgRir,
          setCount: t.setCount,
          avgWeight: t.avgWeight,
          maxWeight: t.maxWeight,
          avgReps: t.avgReps,
        })),
        summary: {
          avgRpe: Math.round(avgRpe * 10) / 10,
          totalSets,
          daysWithData: trends.length,
          trend,
        },
      };
    },

    rpeWeeklyTrends: async (_: unknown, args: { exerciseId: string; weeks?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const weeks = args.weeks ? Math.min(Math.max(args.weeks, 4), 52) : 12;
      const trends = await rpeService.getWeeklyRPETrends(userId, args.exerciseId, weeks);

      return {
        exerciseId: args.exerciseId,
        trends: trends.map((t) => ({
          weekStart: t.weekStart,
          avgRpe: t.avgRpe,
          avgRir: t.avgRir,
          totalSets: t.totalSets,
          rpeVariance: t.rpeVariance,
          minRpe: t.minRpe,
          maxRpe: t.maxRpe,
          avgWeight: t.avgWeight,
          totalVolume: t.totalVolume,
        })),
      };
    },

    rpeFatigue: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const analysis = await rpeService.analyzeFatigue(userId);
      return {
        fatigueScore: analysis.fatigueScore,
        classification: analysis.classification,
        indicators: analysis.indicators,
        recommendation: analysis.recommendation,
        suggestedIntensity: analysis.suggestedIntensity,
        recentRpeTrend: analysis.recentRpeTrend,
      };
    },

    rpeSnapshots: async (_: unknown, args: { days?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const days = args.days ? Math.min(Math.max(args.days, 7), 90) : 30;
      const snapshots = await rpeService.getRPESnapshots(userId, days);

      return snapshots.map((s) => ({
        date: s.snapshotDate,
        avgRpe: s.avgRpe,
        avgRir: s.avgRir,
        totalSets: s.totalSets,
        fatigueScore: s.fatigueScore,
        recoveryRecommendation: s.recoveryRecommendation,
      }));
    },

    rpeTarget: async (_: unknown, args: { exerciseId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const target = await rpeService.getExerciseRPETarget(userId, args.exerciseId);
      return {
        exerciseId: args.exerciseId,
        rpe: target.rpe,
        rir: target.rir,
      };
    },

    // Nutrition Queries
    nutritionDashboard: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return nutritionService.getDashboard(userId);
    },

    nutritionGoals: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return nutritionGoalsService.getGoals(userId);
    },

    nutritionPreferences: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return nutritionService.getPreferences(userId);
    },

    nutritionHistory: async (_: unknown, args: { days?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (args.days || 30));
      return mealLogService.getDailySummaries(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    },

    foodSearch: async (_: unknown, args: { query: string; source?: string; limit?: number }, context: Context) => {
      const result = await foodSearchService.search(
        { query: args.query, source: args.source as 'all' | 'usda' | 'openfoodfacts' | undefined, limit: args.limit || 25 },
        context.user?.userId
      );
      return {
        foods: result.foods.map((f) => ({
          id: f.id,
          name: f.name,
          brand: f.brand || null,
          servingSize: f.servingSizeG || 100,
          servingUnit: f.servingUnit || 'g',
          servingDescription: f.servingDescription || '1 serving',
          calories: f.calories,
          proteinG: f.proteinG,
          carbsG: f.carbsG,
          fatG: f.fatG,
          fiberG: f.fiberG || null,
          sugarG: f.sugarG || null,
          sodiumMg: f.sodiumMg || null,
          source: f.source,
          sourceId: f.externalId || null,
          barcode: f.barcode || null,
          imageUrl: f.imageUrl || null,
          isVerified: f.verified,
          createdAt: f.createdAt,
        })),
        total: result.totalCount,
        source: result.source,
        hasMore: result.totalCount > (args.limit || 25),
      };
    },

    foodByBarcode: async (_: unknown, args: { barcode: string }) => {
      const result = await foodSearchService.search({ barcode: args.barcode });
      if (result.foods.length === 0) return null;
      const f = result.foods[0];
      return {
        id: f.id,
        name: f.name,
        brand: f.brand || null,
        servingSize: f.servingSizeG || 100,
        servingUnit: f.servingUnit || 'g',
        servingDescription: f.servingDescription || '1 serving',
        calories: f.calories,
        proteinG: f.proteinG,
        carbsG: f.carbsG,
        fatG: f.fatG,
        fiberG: f.fiberG || null,
        sugarG: f.sugarG || null,
        sodiumMg: f.sodiumMg || null,
        source: f.source,
        sourceId: f.externalId || null,
        barcode: f.barcode || null,
        imageUrl: f.imageUrl || null,
        isVerified: f.verified,
        createdAt: f.createdAt,
      };
    },

    mealsByDate: async (_: unknown, args: { date: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealLogService.getMealsByDate(userId, args.date);
    },

    recipes: async (_: unknown, args: { search?: string; tags?: string[]; limit?: number }, context: Context) => {
      return recipeService.searchRecipes(
        { query: args.search, dietaryTags: args.tags },
        { field: 'created_at', direction: 'desc' },
        args.limit || 20,
        undefined,
        context.user?.userId
      );
    },

    recipe: async (_: unknown, args: { id: string }, context: Context) => {
      return recipeService.getRecipe(args.id, context.user?.userId);
    },

    popularRecipes: async (_: unknown, args: { limit?: number }, context: Context) => {
      return recipeService.searchRecipes(
        {},
        { field: 'save_count', direction: 'desc' },
        args.limit || 10,
        undefined,
        context.user?.userId
      );
    },

    mealPlans: async (_: unknown, args: { status?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealPlanService.getUserMealPlans(userId, args.status);
    },

    mealPlan: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealPlanService.getMealPlan(userId, args.id);
    },

    activeMealPlan: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return mealPlanService.getActiveMealPlan(userId);
    },

    hydrationByDate: async (_: unknown, args: { date: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealLogService.getHydrationByDate(userId, args.date);
    },

    archetypeNutritionProfiles: async () => {
      const profiles = await nutritionService.getAllArchetypeProfiles();
      return profiles.map((p) => ({
        archetypeId: p.archetype,
        archetypeName: p.name,
        proteinRatio: p.proteinPct,
        carbsRatio: p.carbsPct,
        fatRatio: p.fatPct,
        recommendedCalories: p.calorieAdjustment,
        mealTiming: p.mealTiming ? [p.mealTiming] : [],
        preworkoutRecommendations: p.suggestedFoods?.slice(0, 3) || [],
        postworkoutRecommendations: p.suggestedFoods?.slice(3, 6) || [],
        supplements: p.priorityNutrients || [],
      }));
    },

    archetypeNutritionProfile: async (_: unknown, args: { archetypeId: string }) => {
      const p = await nutritionService.getArchetypeProfile(args.archetypeId);
      if (!p) return null;
      return {
        archetypeId: p.archetype,
        archetypeName: p.name,
        proteinRatio: p.proteinPct,
        carbsRatio: p.carbsPct,
        fatRatio: p.fatPct,
        recommendedCalories: p.calorieAdjustment,
        mealTiming: p.mealTiming ? [p.mealTiming] : [],
        preworkoutRecommendations: p.suggestedFoods?.slice(0, 3) || [],
        postworkoutRecommendations: p.suggestedFoods?.slice(3, 6) || [],
        supplements: p.priorityNutrients || [],
      };
    },

    // Career Readiness Queries
    careerStandards: async (_: unknown, args: { category?: string }) => {
      const standards = await careerService.getCareerStandards({
        category: args.category,
        activeOnly: true,
      });
      return standards.map((s) => ({
        id: s.id,
        name: s.name,
        fullName: s.name,
        agency: s.institution,
        category: s.category,
        description: s.description,
        officialUrl: null,
        scoringType: s.scoringMethod,
        recertificationPeriodMonths: s.recertificationMonths,
        events: (s.components as Array<{ id: string; name: string; description?: string }>).map((c, idx) => ({
          id: c.id,
          name: c.name,
          description: c.description || null,
          metricType: null,
          metricUnit: null,
          direction: 'higher',
          passingThreshold: null,
          exerciseMappings: s.exerciseMappings[c.id] || [],
          tips: s.tips.filter((t) => t.event === c.id).map((t) => t.tip),
          orderIndex: idx,
        })),
        eventCount: (s.components as Array<unknown>).length,
        icon: s.icon,
        maxScore: s.maxScore,
        passingScore: s.passingScore,
      }));
    },

    careerStandard: async (_: unknown, args: { id: string }) => {
      const s = await careerService.getCareerStandard(args.id);
      if (!s) return null;
      return {
        id: s.id,
        name: s.name,
        fullName: s.name,
        agency: s.institution,
        category: s.category,
        description: s.description,
        officialUrl: null,
        scoringType: s.scoringMethod,
        recertificationPeriodMonths: s.recertificationMonths,
        events: (s.components as Array<{ id: string; name: string; description?: string }>).map((c, idx) => ({
          id: c.id,
          name: c.name,
          description: c.description || null,
          metricType: null,
          metricUnit: null,
          direction: 'higher',
          passingThreshold: null,
          exerciseMappings: s.exerciseMappings[c.id] || [],
          tips: s.tips.filter((t) => t.event === c.id).map((t) => t.tip),
          orderIndex: idx,
        })),
        eventCount: (s.components as Array<unknown>).length,
        icon: s.icon,
        maxScore: s.maxScore,
        passingScore: s.passingScore,
      };
    },

    careerStandardCategories: async () => {
      const categories = await careerService.getCareerCategories();
      return categories.map((c) => ({
        category: c.category,
        count: c.count,
        icon: c.icon,
      }));
    },

    myCareerGoals: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const goals = await careerService.getUserCareerGoals(userId);

      return Promise.all(
        goals.map(async (g) => {
          const readiness = await careerService.getReadiness(userId, g.id);
          const standard = await careerService.getCareerStandard(g.ptTestId);

          // Calculate days remaining if target date exists
          let daysRemaining = null;
          if (g.targetDate) {
            const targetDate = new Date(g.targetDate);
            const now = new Date();
            daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          return {
            id: g.id,
            standardId: g.ptTestId,
            standard: standard
              ? {
                  id: standard.id,
                  name: standard.name,
                  fullName: standard.name,
                  agency: standard.institution,
                  category: standard.category,
                  description: standard.description,
                  officialUrl: null,
                  scoringType: standard.scoringMethod,
                  recertificationPeriodMonths: standard.recertificationMonths,
                  events: (standard.components as Array<{ id: string; name: string; description?: string }>).map(
                    (c, idx) => ({
                      id: c.id,
                      name: c.name,
                      description: c.description || null,
                      metricType: null,
                      metricUnit: null,
                      direction: 'higher',
                      passingThreshold: null,
                      exerciseMappings: standard.exerciseMappings[c.id] || [],
                      tips: standard.tips.filter((t) => t.event === c.id).map((t) => t.tip),
                      orderIndex: idx,
                    })
                  ),
                  eventCount: (standard.components as Array<unknown>).length,
                  icon: standard.icon,
                  maxScore: standard.maxScore,
                  passingScore: standard.passingScore,
                }
              : null,
            targetDate: g.targetDate,
            priority: g.priority,
            status: g.status,
            agencyName: g.agencyName,
            notes: g.notes,
            daysRemaining,
            readiness: {
              score: readiness.readinessScore,
              status: readiness.status,
              trend: null,
              trendDelta: null,
              eventBreakdown: [],
              weakEvents: readiness.weakEvents,
              lastAssessmentAt: readiness.lastAssessmentAt,
              eventsPassed: readiness.eventsPassed,
              eventsTotal: readiness.eventsTotal,
            },
            createdAt: new Date(g.createdAt),
            updatedAt: new Date(g.updatedAt),
          };
        })
      );
    },

    myCareerReadiness: async (_: unknown, args: { goalId?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      if (args.goalId) {
        const readiness = await careerService.getReadiness(userId, args.goalId);
        return {
          score: readiness.readinessScore,
          status: readiness.status,
          trend: null,
          trendDelta: null,
          eventBreakdown: [],
          weakEvents: readiness.weakEvents,
          lastAssessmentAt: readiness.lastAssessmentAt,
          eventsPassed: readiness.eventsPassed,
          eventsTotal: readiness.eventsTotal,
        };
      }

      // If no goalId specified, get readiness for primary goal
      const goals = await careerService.getUserCareerGoals(userId);
      const primaryGoal = goals.find((g) => g.priority === 'primary') || goals[0];

      if (!primaryGoal) {
        return {
          score: null,
          status: 'no_data',
          trend: null,
          trendDelta: null,
          eventBreakdown: [],
          weakEvents: [],
          lastAssessmentAt: null,
          eventsPassed: 0,
          eventsTotal: 0,
        };
      }

      const readiness = await careerService.getReadiness(userId, primaryGoal.id);
      return {
        score: readiness.readinessScore,
        status: readiness.status,
        trend: null,
        trendDelta: null,
        eventBreakdown: [],
        weakEvents: readiness.weakEvents,
        lastAssessmentAt: readiness.lastAssessmentAt,
        eventsPassed: readiness.eventsPassed,
        eventsTotal: readiness.eventsTotal,
      };
    },

    careerExerciseRecommendations: async (_: unknown, args: { goalId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const recommendations = await careerService.getExercisesForWeakEvents(args.goalId, userId);
      return recommendations.map((r) => ({
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        targetEvents: r.targetEvents,
      }));
    },

    // ============================================
    // MASCOT / SPIRIT ANIMAL QUERIES
    // ============================================

    mascot: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const state = await companionEventsService.getOrCreateState(userId);
      const progression = companionEventsService.calculateProgression(state.xp, state.stage);

      return {
        id: state.id,
        userId: state.user_id,
        nickname: state.nickname,
        stage: state.stage,
        xp: state.xp,
        progression: {
          currentXp: progression.currentXp,
          prevStageXp: progression.prevStageXp,
          nextStageXp: progression.nextStageXp,
          progressPercent: progression.progressPercent,
          isMaxStage: progression.isMaxStage,
        },
        isVisible: state.is_visible,
        isMinimized: state.is_minimized,
        soundsEnabled: state.sounds_enabled,
        tipsEnabled: state.tips_enabled,
        createdAt: state.created_at,
      };
    },

    mascotAppearance: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const appearance = await appearanceGeneratorService.getFullAppearance(userId);
      const animConfig = appearanceGeneratorService.getAnimationConfig(appearance.base);

      return {
        base: appearance.base,
        stageFeatures: appearance.stageFeatures,
        equipped: {
          skin: appearance.equipped.skin ? { id: appearance.equipped.skin } : null,
          eyes: appearance.equipped.eyes ? { id: appearance.equipped.eyes } : null,
          outfit: appearance.equipped.outfit ? { id: appearance.equipped.outfit } : null,
          headwear: appearance.equipped.headwear ? { id: appearance.equipped.headwear } : null,
          footwear: appearance.equipped.footwear ? { id: appearance.equipped.footwear } : null,
          accessory1: appearance.equipped.accessory1 ? { id: appearance.equipped.accessory1 } : null,
          accessory2: appearance.equipped.accessory2 ? { id: appearance.equipped.accessory2 } : null,
          accessory3: appearance.equipped.accessory3 ? { id: appearance.equipped.accessory3 } : null,
          aura: appearance.equipped.aura ? { id: appearance.equipped.aura } : null,
          background: appearance.equipped.background ? { id: appearance.equipped.background } : null,
          emoteVictory: appearance.equipped.emoteVictory ? { id: appearance.equipped.emoteVictory } : null,
          emoteIdle: appearance.equipped.emoteIdle ? { id: appearance.equipped.emoteIdle } : null,
        },
        final: appearance.final,
        animationConfig: animConfig,
      };
    },

    mascotPowers: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const summary = await mascotPowersService.getPowersSummary(userId);

      return {
        companionStage: summary.companionStage,
        energy: summary.energy,
        bonusMultiplier: summary.phase2.bonusMultiplier,
        streakSaver: summary.phase2.streakSaver,
        creditGuardianFeatures: summary.phase2.creditGuardianFeatures,
        schedulerLevel: summary.phase3.schedulerLevel,
        canSuggestRecovery: summary.phase3.canSuggestRecovery,
        canPredictMilestones: summary.phase3.canPredictMilestones,
        canAutoHighfive: summary.phase4.canAutoHighfive,
        canTrashTalk: summary.phase4.canTrashTalk,
        canCoordinateCrews: summary.phase4.canCoordinateCrews,
        canDetectAnomalies: summary.phase5.canDetectAnomalies,
        canSuggestSettings: summary.phase5.canSuggestSettings,
        canGeneratePrograms: summary.phase6.canGeneratePrograms,
        hasInjuryPrevention: summary.phase6.hasInjuryPrevention,
        hasNutritionHints: summary.phase6.hasNutritionHints,
        masterAbilities: summary.masterAbilities,
      };
    },

    mascotTimeline: async (
      _: unknown,
      args: { limit?: number; offset?: number; importance?: string[] },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const timeline = await mascotTimelineService.getTimelineWithReactions(userId, {
        limit: args.limit || 20,
        offset: args.offset || 0,
        importance: args.importance,
      });

      return timeline.map((item) => ({
        event: {
          id: item.event.id,
          eventType: item.event.eventType,
          eventData: item.event.eventData,
          importance: item.event.importance,
          timestamp: item.event.timestamp,
        },
        reaction: item.reaction
          ? {
              id: item.reaction.id,
              eventId: item.reaction.eventId,
              reactionType: item.reaction.reactionType,
              message: item.reaction.message,
              emote: item.reaction.emote,
              animation: item.reaction.animation,
              duration: item.reaction.duration,
              intensity: item.reaction.intensity,
              soundEffect: item.reaction.soundEffect,
              shown: item.reaction.shown,
              createdAt: item.reaction.createdAt,
            }
          : null,
      }));
    },

    mascotPendingReactions: async (_: unknown, args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const reactions = await mascotTimelineService.getPendingReactions(userId, args.limit || 5);

      return reactions.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        reactionType: r.reactionType,
        message: r.message,
        emote: r.emote,
        animation: r.animation,
        duration: r.duration,
        intensity: r.intensity,
        soundEffect: r.soundEffect,
        shown: r.shown,
        createdAt: r.createdAt,
      }));
    },

    mascotWardrobe: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const inventory = await spiritWardrobeService.getUserCollection(userId);
      const presets = await spiritWardrobeService.getPresets(userId);
      const loadout = await spiritWardrobeService.getLoadout(userId);

      return {
        inventory: inventory.map((item) => ({
          id: item.id,
          cosmetic: item.cosmetic,
          acquiredAt: item.acquiredAt,
          acquisitionMethod: item.acquisitionMethod,
          creditsSpent: item.creditsSpent,
          giftedBy: item.giftedBy,
          isFavorite: item.isFavorite,
          isNew: item.isNew,
        })),
        presets: presets.map((p) => ({
          id: p.id,
          name: p.name,
          icon: p.icon,
          loadout: p.loadout,
          createdAt: p.createdAt,
        })),
        currentLoadout: {
          skin: loadout.skinId ? { id: loadout.skinId } : null,
          eyes: loadout.eyesId ? { id: loadout.eyesId } : null,
          outfit: loadout.outfitId ? { id: loadout.outfitId } : null,
          headwear: loadout.headwearId ? { id: loadout.headwearId } : null,
          footwear: loadout.footwearId ? { id: loadout.footwearId } : null,
          accessory1: loadout.accessory1Id ? { id: loadout.accessory1Id } : null,
          accessory2: loadout.accessory2Id ? { id: loadout.accessory2Id } : null,
          accessory3: loadout.accessory3Id ? { id: loadout.accessory3Id } : null,
          aura: loadout.auraId ? { id: loadout.auraId } : null,
          background: loadout.backgroundId ? { id: loadout.backgroundId } : null,
          emoteVictory: loadout.emoteVictoryId ? { id: loadout.emoteVictoryId } : null,
          emoteIdle: loadout.emoteIdleId ? { id: loadout.emoteIdleId } : null,
        },
      };
    },

    mascotShop: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const shop = await spiritWardrobeService.getTodaysShop(userId);

      return shop.map((item) => ({
        slotNumber: item.slotNumber,
        cosmetic: {
          id: item.cosmeticId,
          itemKey: item.itemKey,
          name: item.name,
          description: item.description,
          category: item.category,
          rarity: item.rarity,
          basePrice: item.basePrice,
        },
        discountPercent: item.discountPercent,
        finalPrice: item.finalPrice,
        isFeatured: item.isFeatured,
        owned: item.owned,
      }));
    },

    // ============================================
    // MASCOT ADVANCED POWERS QUERIES
    // ============================================

    mascotAssistState: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const state = await mascotPowersService.getAssistState(userId);
      return state;
    },

    mascotExerciseAlternatives: async (
      _: unknown,
      args: { exerciseId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const alternatives = await mascotPowersService.getExerciseAlternatives(
        userId,
        args.exerciseId
      );
      return alternatives;
    },

    mascotCrewSuggestions: async (_: unknown, _args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const suggestions = await mascotPowersService.getCrewSuggestions(userId);
      return suggestions;
    },

    mascotRivalryAlerts: async (_: unknown, _args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const alerts = await mascotPowersService.getRivalryAlerts(userId);
      return alerts;
    },

    mascotCreditAlerts: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const alerts = await mascotPowersService.getCreditAlerts(userId);
      return alerts;
    },

    mascotCreditLoanOffer: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const offer = await mascotPowersService.getCreditLoanOffer(userId);
      return offer;
    },

    mascotVolumeStats: async (_: unknown, args: { weeks?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const stats = await mascotPowersService.getVolumeStats(userId, args.weeks || 4);
      return stats;
    },

    mascotOvertrainingAlerts: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const alerts = await mascotPowersService.getOvertrainingAlerts(userId);
      return alerts;
    },

    mascotWorkoutSuggestions: async (_: unknown, args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const suggestions = await mascotPowersService.getWorkoutSuggestions(userId, args.limit || 7);
      return suggestions;
    },

    mascotMilestoneProgress: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const progress = await mascotPowersService.getMilestoneProgress(userId);
      return progress;
    },

    mascotMasterAbilities: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const abilities = await mascotPowersService.getMasterAbilities(userId);
      return abilities;
    },

    mascotGeneratedPrograms: async (_: unknown, args: { status?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const programs = await mascotPowersService.getGeneratedPrograms(userId, args.status);
      return programs;
    },

    mascotNegotiatedRate: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const rate = await mascotPowersService.getNegotiatedRate(userId);
      return rate;
    },

    mascotHighfivePrefs: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const prefs = await mascotPowersService.getHighfivePrefs(userId);
      return prefs;
    },

    mascotPendingSocialActions: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const actions = await mascotPowersService.getPendingSocialActions(userId);
      return actions;
    },

    // ============================================
    // JOURNEY HEALTH QUERIES
    // ============================================

    journeyHealth: async (_: unknown, args: { journeyId: string }, context: Context) => {
      requireAuth(context);
      const health = await journeyHealthService.getJourneyHealth(args.journeyId);
      if (!health) return null;
      return {
        ...health,
        riskFactors: health.riskFactors.map((f) => ({
          factor: f.factor,
          weight: f.weight,
          days: f.days ?? null,
          ratio: f.ratio ?? null,
          progressGap: f.progressGap ?? null,
          completed: f.completed ?? null,
          total: f.total ?? null,
        })),
      };
    },

    journeyHealthAlerts: async (
      _: unknown,
      args: { journeyId?: string; status?: string; limit?: number },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const alerts = await journeyHealthService.getHealthAlerts(userId, {
        journeyId: args.journeyId,
        status: args.status as 'active' | 'acknowledged' | 'dismissed' | 'resolved' | undefined,
        limit: args.limit,
      });
      return alerts;
    },

    journeyRecommendations: async (_: unknown, args: { journeyId: string }, context: Context) => {
      requireAuth(context);
      const recommendations = await journeyHealthService.getRecommendations(args.journeyId);
      return recommendations;
    },

    stalledJourneys: async (_: unknown, args: { thresholdDays?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const stalled = await journeyHealthService.detectStalledJourneys(userId, args.thresholdDays);
      return stalled;
    },

    journeyHealthHistory: async (
      _: unknown,
      args: { journeyId: string; days?: number },
      context: Context
    ) => {
      requireAuth(context);
      const history = await journeyHealthService.getHealthHistory(args.journeyId, args.days);
      return history;
    },

    // ============================================
    // CRITICAL MISSING RESOLVERS
    // ============================================

    // 1. User profile (current user's profile)
    profile: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const user = await queryOne<{
        id: string;
        username: string;
        display_name: string | null;
        bio: string | null;
        bio_rich_json: Record<string, unknown> | null;
        avatar: string | null;
        location: string | null;
        website: string | null;
        social_links: Record<string, string> | null;
        fitness_goals: string[] | null;
        preferred_workout_time: string | null;
        experience_level: string | null;
        profile_visibility: string;
        created_at: Date;
      }>(
        `SELECT
          u.id, u.username, u.display_name, u.bio, u.bio_rich_json,
          u.avatar, u.location, u.website, u.social_links,
          up.fitness_goals, up.preferred_workout_time, up.experience_level,
          COALESCE(ps.profile_visibility, 'public') as profile_visibility,
          u.created_at
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN user_privacy_settings ps ON ps.user_id = u.id
        WHERE u.id = $1`,
        [userId]
      );

      if (!user) {
        return null;
      }

      // Get credit balance for wealth tier
      const credits = await economyService.getBalance(user.id);

      return {
        id: user.id,
        userId: user.id,
        displayName: user.display_name,
        bio: user.bio,
        bioRichJson: user.bio_rich_json,
        avatar: user.avatar,
        location: user.location,
        website: user.website,
        socialLinks: user.social_links,
        fitnessGoals: user.fitness_goals,
        preferredWorkoutTime: user.preferred_workout_time,
        experienceLevel: user.experience_level,
        visibility: user.profile_visibility,
        wealthTier: buildWealthTierResponse(credits),
        createdAt: user.created_at,
      };
    },

    // 2. Get goal by ID
    goal: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const goal = await queryOne<{
        id: string;
        user_id: string;
        goal_type: string;
        target_value: string | null;
        target_unit: string | null;
        starting_value: string | null;
        current_value: string | null;
        target_date: Date | null;
        status: string;
        is_primary: boolean;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, user_id, goal_type, target_value, target_unit, starting_value,
                current_value, target_date, status, is_primary, notes, created_at, updated_at
         FROM user_goals WHERE id = $1 AND user_id = $2`,
        [args.id, userId]
      );

      if (!goal) {
        return null;
      }

      // Get milestones for this goal
      const milestones = await queryAll<{
        id: string;
        goal_id: string;
        title: string;
        target_value: string;
        is_achieved: boolean;
        achieved_at: Date | null;
      }>(
        `SELECT id, goal_id, title, target_value, is_achieved, achieved_at
         FROM goal_milestones WHERE goal_id = $1
         ORDER BY target_value`,
        [args.id]
      );

      return {
        id: goal.id,
        userId: goal.user_id,
        type: goal.goal_type,
        title: goal.goal_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Goal',
        description: goal.notes || '',
        target: goal.target_value ? parseFloat(goal.target_value) : null,
        current: goal.current_value ? parseFloat(goal.current_value) : null,
        unit: goal.target_unit,
        deadline: goal.target_date,
        status: goal.status,
        isPrimary: goal.is_primary,
        milestones: milestones.map(m => ({
          id: m.id,
          goalId: m.goal_id,
          title: m.title,
          target: m.target_value ? parseFloat(m.target_value) : 0,
          achieved: m.is_achieved,
          achievedAt: m.achieved_at,
        })),
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
      };
    },

    // 3. Goal suggestions (AI-powered)
    goalSuggestions: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      // Get user's workout history and stats to generate smart suggestions
      const stats = await queryOne<{
        workouts_count: string;
        total_tu: string;
        avg_exercises_per_workout: string;
      }>(
        `SELECT
          COUNT(*) as workouts_count,
          COALESCE(SUM(total_tu), 0) as total_tu,
          COALESCE(AVG(
            (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id)
          ), 0) as avg_exercises_per_workout
        FROM workouts w
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
        [userId]
      );

      const workoutsCount = parseInt(stats?.workouts_count || '0', 10);
      const totalTu = parseInt(stats?.total_tu || '0', 10);

      // Get existing goals to avoid duplicates
      const existingGoals = await queryAll<{ goal_type: string }>(
        `SELECT goal_type FROM user_goals WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );
      const existingTypes = new Set(existingGoals.map(g => g.goal_type));

      const suggestions: Array<{
        type: string;
        title: string;
        description: string;
        target: number;
        unit: string;
        reasoning: string;
      }> = [];

      // Suggest based on current activity
      if (!existingTypes.has('weekly_workouts')) {
        const targetWorkouts = workoutsCount < 3 ? 3 : workoutsCount < 5 ? 4 : 5;
        suggestions.push({
          type: 'weekly_workouts',
          title: `Complete ${targetWorkouts} workouts per week`,
          description: 'Build consistency with regular workout sessions',
          target: targetWorkouts,
          unit: 'workouts',
          reasoning: workoutsCount < 3
            ? 'Starting with 3 workouts/week is ideal for building a habit'
            : `Based on your recent activity, ${targetWorkouts} workouts/week is achievable`,
        });
      }

      if (!existingTypes.has('monthly_tu')) {
        const targetTu = Math.max(1000, Math.round(totalTu * 1.2));
        suggestions.push({
          type: 'monthly_tu',
          title: `Earn ${targetTu.toLocaleString()} Training Units this month`,
          description: 'Increase your overall training volume',
          target: targetTu,
          unit: 'TU',
          reasoning: totalTu > 0
            ? 'A 20% increase over your current pace is challenging but achievable'
            : 'A great starting goal to build training volume',
        });
      }

      if (!existingTypes.has('strength')) {
        suggestions.push({
          type: 'strength',
          title: 'Improve core strength',
          description: 'Focus on compound movements to build overall strength',
          target: 30,
          unit: 'days',
          reasoning: 'Core strength is foundational for all fitness goals',
        });
      }

      if (!existingTypes.has('consistency')) {
        suggestions.push({
          type: 'consistency',
          title: 'Build a 14-day workout streak',
          description: 'Develop the habit of regular training',
          target: 14,
          unit: 'days',
          reasoning: 'Consistency beats intensity for long-term progress',
        });
      }

      return suggestions;
    },

    // 4. Privacy settings
    privacy: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const settings = await privacyService.getSettings(userId);

      return {
        profileVisibility: settings.profileVisibility,
        showInLeaderboards: settings.showInLeaderboards,
        showWorkoutHistory: settings.showWorkoutHistory,
        allowMessages: settings.allowDirectMessages ? 'everyone' : 'connections',
        shareProgress: settings.activityVisibility === 'public',
        minimalistMode: settings.ghostModeEnabled,
      };
    },

    // 5. Muscle stats (training volume by muscle group)
    myMuscleStats: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      // Get muscle activation data from recent workouts
      const muscleData = await queryAll<{
        muscle_id: string;
        total_sets: string;
        total_reps: string;
        last_trained: Date | null;
      }>(
        `SELECT
          ea.muscle_id,
          SUM(we.sets)::text as total_sets,
          SUM(we.reps * we.sets)::text as total_reps,
          MAX(w.created_at) as last_trained
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        JOIN exercise_activations ea ON ea.exercise_id = we.exercise_id
        WHERE w.user_id = $1
          AND w.created_at > NOW() - INTERVAL '30 days'
        GROUP BY ea.muscle_id`,
        [userId]
      );

      const muscleGroups = muscleData.map(m => ({
        muscle: m.muscle_id,
        totalSets: parseInt(m.total_sets, 10),
        totalReps: parseInt(m.total_reps, 10),
        lastTrained: m.last_trained,
      }));

      // Get last trained dates by muscle
      const lastTrained: Record<string, Date | null> = {};
      for (const m of muscleData) {
        lastTrained[m.muscle_id] = m.last_trained;
      }

      // Get weekly volume breakdown
      const weeklyData = await queryAll<{
        week_start: string;
        muscle_id: string;
        volume: string;
      }>(
        `SELECT
          DATE_TRUNC('week', w.created_at)::text as week_start,
          ea.muscle_id,
          SUM(we.sets * we.reps * COALESCE(we.weight, 1))::text as volume
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        JOIN exercise_activations ea ON ea.exercise_id = we.exercise_id
        WHERE w.user_id = $1
          AND w.created_at > NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', w.created_at), ea.muscle_id
        ORDER BY week_start`,
        [userId]
      );

      const weeklyVolume: Record<string, number> = {};
      for (const w of weeklyData) {
        const key = `${w.week_start}_${w.muscle_id}`;
        weeklyVolume[key] = parseInt(w.volume, 10);
      }

      return {
        muscleGroups,
        lastTrained,
        weeklyVolume,
      };
    },

    // 6. Economy pricing (credit packages)
    economyPricing: async () => {
      const packages = await queryAll<{
        id: string;
        name: string;
        credits: number;
        price_cents: number;
        bonus_credits: number | null;
        enabled: boolean;
      }>(
        `SELECT id, name, credits, price_cents, bonus_credits, enabled
         FROM credit_packages
         WHERE enabled = TRUE
         ORDER BY credits`
      );

      // If no packages in DB, return default pricing
      if (packages.length === 0) {
        return [
          { id: 'pkg_starter', name: 'Starter', credits: 100, price: 4.99, currency: 'USD', bonus: 0 },
          { id: 'pkg_basic', name: 'Basic', credits: 500, price: 19.99, currency: 'USD', bonus: 50 },
          { id: 'pkg_pro', name: 'Pro', credits: 1200, price: 39.99, currency: 'USD', bonus: 200 },
          { id: 'pkg_elite', name: 'Elite', credits: 3000, price: 79.99, currency: 'USD', bonus: 750 },
        ];
      }

      return packages.map(p => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        price: p.price_cents / 100,
        currency: 'USD', // Default currency
        bonus: p.bonus_credits || 0,
      }));
    },

    // 7. Message conversations
    conversations: async (_: unknown, args: { tab?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const tab = args.tab || 'inbox';

      // Build query based on tab
      let filterCondition = '';
      if (tab === 'starred') {
        filterCondition = 'AND cp.starred = TRUE';
      } else if (tab === 'archived') {
        filterCondition = 'AND c.archived_at IS NOT NULL';
      } else {
        // inbox - exclude archived
        filterCondition = 'AND c.archived_at IS NULL';
      }

      const convos = await queryAll<any>(
        `SELECT c.id, c.type, c.name, c.last_message_at, c.created_at, c.updated_at,
                c.disappearing_ttl, c.archived_at, cp.starred
         FROM conversations c
         JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
         WHERE 1=1 ${filterCondition}
         ORDER BY c.last_message_at DESC NULLS LAST
         LIMIT 50`,
        [userId]
      );

      // Get participants, last messages, and typing users for each conversation
      const result = await Promise.all(
        convos.map(async (c: any) => {
          // Get participant details
          const participants = await queryAll<any>(
            `SELECT u.id, u.username, u.display_name, u.avatar_url, u.last_active_at, cp.role
             FROM conversation_participants cp
             JOIN users u ON cp.user_id = u.id
             WHERE cp.conversation_id = $1`,
            [c.id]
          );

          // Get last message
          const lastMessage = await queryOne<any>(
            `SELECT id, sender_id, content, created_at
             FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL
             ORDER BY created_at DESC LIMIT 1`,
            [c.id]
          );

          // Get unread count
          const unreadResult = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM messages m
             LEFT JOIN message_receipts mr ON m.id = mr.message_id AND mr.user_id = $2
             WHERE m.conversation_id = $1 AND m.sender_id != $2 AND mr.read_at IS NULL AND m.deleted_at IS NULL`,
            [c.id, userId]
          );

          // Get typing users
          const { getTypingUsers } = await import('../modules/messaging/messaging.service');
          const typingUsers = await getTypingUsers(c.id);

          return {
            id: c.id,
            type: c.type || 'direct',
            name: c.name || null,
            participants: participants.map((p: any) => ({
              userId: p.id,
              username: p.username,
              displayName: p.display_name || null,
              avatarUrl: p.avatar_url || null,
              lastActiveAt: p.last_active_at?.toISOString() || null,
              role: p.role || 'member',
            })),
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              senderId: lastMessage.sender_id,
              content: lastMessage.content,
              createdAt: lastMessage.created_at?.toISOString(),
            } : null,
            lastMessageAt: c.last_message_at?.toISOString() || null,
            unreadCount: parseInt(unreadResult?.count || '0', 10),
            starred: c.starred || false,
            archivedAt: c.archived_at?.toISOString() || null,
            disappearingTtl: c.disappearing_ttl || null,
            typingUsers: typingUsers.map(t => ({
              userId: t.userId,
              username: t.username,
              avatarUrl: t.avatarUrl || null,
            })),
            createdAt: c.created_at?.toISOString(),
            updatedAt: c.updated_at?.toISOString(),
          };
        })
      );

      return result;
    },

    // 8. User milestones
    milestones: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const milestones = await tipsService.getMilestones(userId);

      // Get claimed status from user_milestones
      const claimedStatus = await queryAll<{ milestone_id: string; reward_claimed: number }>(
        `SELECT milestone_id, reward_claimed FROM user_milestones WHERE user_id = $1`,
        [userId]
      );
      const claimedMap = new Map(claimedStatus.map(c => [c.milestone_id, c.reward_claimed > 0]));

      return milestones.map(m => ({
        id: m.id,
        type: m.metric,
        title: m.name,
        description: m.description || '',
        target: m.threshold,
        current: m.current_value,
        reward: m.reward_value ? parseInt(m.reward_value, 10) : 0,
        claimed: claimedMap.get(m.id) || false,
        unlockedAt: m.completed_at ? new Date(m.completed_at) : null,
      }));
    },

    // 9. Get specific hangout by ID
    hangout: async (_: unknown, args: { id: string }, context: Context) => {
      const hangoutId = parseInt(args.id, 10);
      if (isNaN(hangoutId)) {
        return null;
      }

      const hangout = await virtualHangoutsService.getHangoutById(hangoutId, context.user?.userId);

      if (!hangout) {
        return null;
      }

      // Get the theme
      const theme = await queryOne<{
        id: string;
        name: string;
        description: string | null;
        icon_url: string | null;
        min_members: number;
        max_members: number;
      }>(
        `SELECT id, name, description, icon_url,
                COALESCE(min_participants, 1) as min_members,
                COALESCE(max_participants, 100) as max_members
         FROM virtual_hangout_themes WHERE id = $1`,
        [hangout.themeId]
      );

      // Get members (limited)
      const { members } = await virtualHangoutsService.getMembers(hangoutId, { limit: 10 });

      return {
        id: String(hangout.id),
        typeId: hangout.themeId,
        type: theme ? {
          id: theme.id,
          name: theme.name,
          description: theme.description || '',
          icon: theme.icon_url,
          minParticipants: theme.min_members,
          maxParticipants: theme.max_members,
        } : null,
        title: hangout.customName || hangout.themeName,
        description: hangout.customDescription,
        hostId: '', // Virtual hangouts don't have a single host
        host: null,
        location: {
          lat: 0,
          lng: 0,
          address: 'Virtual',
          placeName: hangout.themeName,
        },
        startsAt: hangout.createdAt,
        endsAt: null,
        status: hangout.isActive ? 'active' : 'inactive',
        members: members.map(m => ({
          userId: m.userId,
          user: {
            id: m.userId,
            username: m.username,
            displayName: m.displayName,
            avatar: m.avatarUrl,
          },
          role: m.role === 2 ? 'admin' : m.role === 1 ? 'moderator' : 'member',
          joinedAt: m.joinedAt,
        })),
        memberCount: hangout.memberCount,
        maxMembers: null, // Virtual hangouts typically don't have a max
        posts: null,
      };
    },

    // 10. Workout prescription
    prescription: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Try to get a stored prescription first
      const stored = await queryOne<{
        id: string;
        user_id: string;
        exercises: unknown;
        warmup: unknown;
        cooldown: unknown;
        total_duration: number;
        muscle_coverage: Record<string, number> | null;
        difficulty: string;
        created_at: Date;
      }>(
        `SELECT id, user_id, exercises, warmup, cooldown, total_duration, muscle_coverage, difficulty, created_at
         FROM prescription_history WHERE id = $1 AND user_id = $2`,
        [args.id, userId]
      );

      if (stored) {
        // JSONB columns are already parsed by pg driver
        const exercises = stored.exercises as Array<{
          exerciseId: string;
          name: string;
          type: string;
          sets: number;
          reps: number;
          restSeconds: number;
          primaryMuscles: string[];
          score: number;
          scoreBreakdown: Record<string, number>;
        }>;
        const warmup = stored.warmup as typeof exercises;
        const cooldown = stored.cooldown as typeof exercises;

        return {
          id: stored.id,
          userId: stored.user_id,
          exercises: exercises.map(e => ({
            exerciseId: e.exerciseId,
            name: e.name,
            type: e.type,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            primaryMuscles: e.primaryMuscles,
          })),
          warmup: warmup?.map(e => ({
            exerciseId: e.exerciseId,
            name: e.name,
            type: e.type,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            primaryMuscles: e.primaryMuscles,
          })),
          cooldown: cooldown?.map(e => ({
            exerciseId: e.exerciseId,
            name: e.name,
            type: e.type,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            primaryMuscles: e.primaryMuscles,
          })),
          targetDuration: stored.total_duration,
          actualDuration: stored.total_duration,
          muscleCoverage: stored.muscle_coverage,
          difficulty: stored.difficulty,
          createdAt: stored.created_at,
        };
      }

      return null;
    },

    // ============================================
    // MISSING QUERY RESOLVERS - Added 2026-01-19
    // ============================================

    // Conversations/Messaging
    conversationMessages: async (_: unknown, args: { conversationId: string; limit?: number; cursor?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);

      // Verify user is participant in conversation
      const participant = await queryOne<{ id: string }>(
        `SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [args.conversationId, userId]
      );
      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      let messages;
      if (args.cursor) {
        messages = await queryAll<any>(
          `SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = $1
           AND m.created_at < $2
           ORDER BY m.created_at DESC
           LIMIT $3`,
          [args.conversationId, args.cursor, limit]
        );
      } else {
        messages = await queryAll<any>(
          `SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = $1
           ORDER BY m.created_at DESC
           LIMIT $2`,
          [args.conversationId, limit]
        );
      }

      // Get reactions for each message
      const messageIds = messages.map((m: any) => m.id);
      let reactionsMap = new Map<string, any[]>();
      if (messageIds.length > 0) {
        const reactions = await queryAll<any>(
          `SELECT message_id, emoji, array_agg(user_id) as user_ids
           FROM message_reactions
           WHERE message_id = ANY($1)
           GROUP BY message_id, emoji`,
          [messageIds]
        );
        reactions.forEach((r: any) => {
          const arr = reactionsMap.get(r.message_id) || [];
          arr.push({
            emoji: r.emoji,
            count: r.user_ids?.length || 0,
            users: r.user_ids || [],
            userReacted: r.user_ids?.includes(userId) || false,
          });
          reactionsMap.set(r.message_id, arr);
        });
      }

      return messages.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderUsername: m.sender_username,
        senderDisplayName: m.display_name || m.sender_username,
        sender: {
          id: m.sender_id,
          username: m.sender_username,
          avatar: m.sender_avatar,
        },
        content: m.content,
        contentType: m.content_type || 'text',
        replyTo: m.reply_to_id ? {
          id: m.reply_to_id,
          content: m.reply_content || '',
          senderName: m.reply_sender_name || '',
        } : null,
        reactions: reactionsMap.get(m.id) || [],
        pinnedAt: m.pinned_at,
        editedAt: m.edited_at,
        editCount: m.edit_count || 0,
        deliveredAt: m.delivered_at,
        readAt: m.read_at,
        createdAt: m.created_at,
      }));
    },

    // Pinned messages in a conversation
    pinnedMessages: async (_: unknown, args: { conversationId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { getPinnedMessages } = await import('../modules/messaging/messaging.service');
      const pinned = await getPinnedMessages(args.conversationId);

      // Get sender names
      const senderIds = [...new Set(pinned.map(m => m.senderId))];
      const senders = senderIds.length > 0 ? await queryAll<any>(
        `SELECT id, username, display_name FROM users WHERE id = ANY($1)`,
        [senderIds]
      ) : [];
      const senderMap = new Map(senders.map(s => [s.id, s.display_name || s.username]));

      return pinned.map(m => ({
        id: m.id,
        content: m.content,
        senderName: senderMap.get(m.senderId) || 'Unknown',
        createdAt: m.createdAt.toISOString(),
      }));
    },

    // Typing users in a conversation
    typingUsers: async (_: unknown, args: { conversationId: string }, context: Context) => {
      requireAuth(context);
      const { getTypingUsers } = await import('../modules/messaging/messaging.service');
      const users = await getTypingUsers(args.conversationId);
      return users.map(u => ({
        userId: u.userId,
        username: u.username,
        avatarUrl: u.avatarUrl || null,
      }));
    },

    // User presence (online/offline status)
    userPresence: async (_: unknown, args: { userIds: string[] }, context: Context) => {
      requireAuth(context);
      const { getBulkPresence } = await import('../modules/messaging/messaging.service');
      const presenceMap = await getBulkPresence(args.userIds);
      return args.userIds.map(id => {
        const presence = presenceMap.get(id);
        return {
          userId: id,
          status: presence?.status || 'offline',
          lastSeen: presence?.lastSeen?.toISOString() || null,
        };
      });
    },

    // Block status check
    blockStatus: async (_: unknown, args: { userId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Check if current user has blocked the target
      const blocked = await queryOne<{ id: string }>(
        `SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [userId, args.userId]
      );

      // Check if target has blocked current user
      const blockedBy = await queryOne<{ id: string }>(
        `SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [args.userId, userId]
      );

      return {
        isBlocked: !!blocked,
        blockedBy: !!blockedBy,
      };
    },

    // Message templates
    messageTemplates: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { getTemplates } = await import('../modules/messaging/messaging.service');
      const templates = await getTemplates(userId);
      return templates.map(t => ({
        id: t.id,
        name: t.name,
        content: t.content,
        shortcut: t.shortcut || null,
        category: t.category || null,
        useCount: t.useCount,
      }));
    },

    // Scheduled messages
    scheduledMessages: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { getScheduledMessages } = await import('../modules/messaging/messaging.service');
      const scheduled = await getScheduledMessages(userId);
      return scheduled.map(s => ({
        id: s.id,
        conversationId: s.conversationId,
        content: s.content,
        scheduledFor: s.scheduledFor.toISOString(),
        status: s.status,
      }));
    },

    // Search messages
    searchMessages: async (_: unknown, args: { query: string; conversationId?: string; limit?: number; offset?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const { searchMessages } = await import('../modules/messaging/messaging.service');
      const result = await searchMessages(userId, args.query, {
        conversationId: args.conversationId,
        limit: args.limit || 20,
        offset: args.offset || 0,
      });

      // Get sender names
      const senderIds = [...new Set(result.messages.map(m => m.senderId))];
      const senders = senderIds.length > 0 ? await queryAll<any>(
        `SELECT id, username, display_name FROM users WHERE id = ANY($1)`,
        [senderIds]
      ) : [];
      const senderMap = new Map(senders.map(s => [s.id, s.display_name || s.username]));

      return {
        messages: result.messages.map(m => ({
          id: m.id,
          content: m.content,
          senderName: senderMap.get(m.senderId) || 'Unknown',
          conversationId: m.conversationId,
          createdAt: m.createdAt.toISOString(),
          highlight: (m.metadata as any)?.highlight || null,
        })),
        total: result.total,
      };
    },

    // Search users for starting conversations
    searchUsers: async (_: unknown, args: { query: string; limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 20, 50);

      const users = await queryAll<any>(
        `SELECT id, username, display_name, avatar_url
         FROM users
         WHERE id != $1
         AND (username ILIKE $2 OR display_name ILIKE $2)
         ORDER BY username ASC
         LIMIT $3`,
        [userId, `%${args.query}%`, limit]
      );

      // Check if user can message each result (not blocked)
      const blockedIds = await queryAll<{ blocked_id: string }>(
        `SELECT blocked_id FROM user_blocks WHERE blocker_id = $1`,
        [userId]
      );
      const blockedSet = new Set(blockedIds.map(b => b.blocked_id));

      return users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name || null,
        avatarUrl: u.avatar_url || null,
        canMessage: !blockedSet.has(u.id),
      }));
    },

    // User stats for public profiles
    userStats: async (_: unknown, args: { userId: string }) => {
      const stats = await queryOne<any>(
        `SELECT
          (SELECT COUNT(*) FROM workouts WHERE user_id = $1) as total_workouts,
          (SELECT COALESCE(SUM(total_tu), 0) FROM workouts WHERE user_id = $1) as total_tu,
          (SELECT COUNT(*) FROM user_follows WHERE following_id = $1) as followers,
          (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following,
          (SELECT level FROM users WHERE id = $1) as level,
          (SELECT xp FROM users WHERE id = $1) as xp`,
        [args.userId]
      );

      if (!stats) return null;

      return {
        totalWorkouts: Number(stats.total_workouts) || 0,
        totalTU: Number(stats.total_tu) || 0,
        followers: Number(stats.followers) || 0,
        following: Number(stats.following) || 0,
        level: stats.level || 1,
        xp: stats.xp || 0,
      };
    },

    // Economy wallet info
    economyWallet: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const wallet = await walletService.getWalletDetails(userId);
      return wallet;
    },

    // Economy transaction history
    economyHistory: async (_: unknown, args: { limit?: number; cursor?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);

      let transactions;
      if (args.cursor) {
        transactions = await queryAll<any>(
          `SELECT * FROM credit_ledger
           WHERE user_id = $1 AND created_at < $2
           ORDER BY created_at DESC
           LIMIT $3`,
          [userId, args.cursor, limit]
        );
      } else {
        transactions = await queryAll<any>(
          `SELECT * FROM credit_ledger
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [userId, limit]
        );
      }

      return transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balance: t.balance_after,
        description: t.description,
        referenceType: t.reference_type,
        referenceId: t.reference_id,
        createdAt: t.created_at,
      }));
    },

    // Economy transactions (alias)
    economyTransactions: async (_: unknown, args: { limit?: number; cursor?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);

      const transactions = await queryAll<any>(
        `SELECT * FROM credit_ledger
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balance: t.balance_after,
        description: t.description,
        createdAt: t.created_at,
      }));
    },

    // Nearby hangouts
    nearbyHangouts: async (_: unknown, args: { latitude: number; longitude: number; radiusKm?: number; limit?: number }) => {
      const radiusKm = args.radiusKm || 10;
      const limit = Math.min(args.limit || 20, 50);

      const hangouts = await queryAll<any>(
        `SELECT h.*, u.username as host_username, u.avatar_url as host_avatar,
         (SELECT COUNT(*) FROM hangout_members WHERE hangout_id = h.id) as member_count,
         ST_Distance(
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography
         ) / 1000 as distance_km
         FROM hangouts h
         JOIN users u ON h.host_id = u.id
         WHERE h.status = 'active'
         AND h.end_time > NOW()
         AND ST_DWithin(
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           ST_SetSRID(ST_MakePoint(h.longitude, h.latitude), 4326)::geography,
           $3 * 1000
         )
         ORDER BY distance_km ASC
         LIMIT $4`,
        [args.longitude, args.latitude, radiusKm, limit]
      );

      return hangouts.map((h: any) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        type: h.type,
        latitude: h.latitude,
        longitude: h.longitude,
        address: h.address,
        startTime: h.start_time,
        endTime: h.end_time,
        maxParticipants: h.max_participants,
        memberCount: Number(h.member_count),
        distanceKm: Number(h.distance_km),
        host: {
          id: h.host_id,
          username: h.host_username,
          avatar: h.host_avatar,
        },
      }));
    },

    // Updates/changelog
    updates: async (_: unknown, args: { limit?: number }) => {
      const limit = Math.min(args.limit || 20, 50);
      const updates = await queryAll<any>(
        `SELECT * FROM app_updates ORDER BY published_at DESC LIMIT $1`,
        [limit]
      );

      return updates.map((u: any) => ({
        id: u.id,
        version: u.version,
        title: u.title,
        content: u.content,
        type: u.type,
        publishedAt: u.published_at,
      }));
    },

    // Roadmap items
    roadmap: async (_: unknown, args: { status?: string }) => {
      let query = `SELECT r.*,
        (SELECT COUNT(*) FROM roadmap_votes WHERE roadmap_item_id = r.id) as vote_count
        FROM roadmap_items r`;
      const params: any[] = [];

      if (args.status) {
        query += ` WHERE r.status = $1`;
        params.push(args.status);
      }

      query += ` ORDER BY vote_count DESC, r.created_at DESC`;

      const items = await queryAll<any>(query, params);

      return items.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: r.status,
        category: r.category,
        priority: r.priority,
        voteCount: Number(r.vote_count),
        createdAt: r.created_at,
        targetDate: r.target_date,
      }));
    },

    // Issues for admin
    adminIssues: async (_: unknown, args: { status?: string; limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      // Check admin role
      const user = await queryOne<{ roles: string[] }>('SELECT roles FROM users WHERE id = $1', [userId]);
      if (!user?.roles?.includes('admin')) {
        throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
      }

      const limit = Math.min(args.limit || 50, 100);
      let query = `SELECT i.*, u.username as author_username
        FROM issues i
        LEFT JOIN users u ON i.author_id = u.id`;
      const params: any[] = [];

      if (args.status) {
        query += ` WHERE i.status = $1`;
        params.push(args.status);
      }

      query += ` ORDER BY i.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const issues = await queryAll<any>(query, params);

      return issues.map((i: any) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        status: i.status,
        priority: i.priority,
        type: i.type,
        author: i.author_id ? { id: i.author_id, username: i.author_username } : null,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      }));
    },

    // Issues list
    issues: async (
      _: unknown,
      args: { status?: number; type?: number; labelSlug?: string; search?: string; sortBy?: string; limit?: number; offset?: number },
      context: Context
    ) => {
      const result = await issuesService.listIssues({
        status: args.status,
        type: args.type,
        labelSlug: args.labelSlug,
        search: args.search,
        sortBy: args.sortBy as any,
        limit: args.limit || 20,
        offset: args.offset || 0,
        userId: context.user?.userId,
      });

      return {
        issues: result.issues.map((i: any) => ({
          id: i.id,
          issueNumber: i.issueNumber,
          title: i.title,
          description: i.description,
          type: i.type,
          status: i.status,
          priority: i.priority,
          authorId: i.authorId,
          authorUsername: i.authorUsername,
          authorDisplayName: i.authorDisplayName,
          authorAvatarUrl: i.authorAvatarUrl,
          labels: (i.labels || []).map((l: any) => ({
            id: l.id,
            name: l.name,
            slug: l.slug,
            color: l.color,
            icon: l.icon,
            description: l.description,
          })),
          voteCount: i.voteCount,
          hasVoted: i.hasVoted,
          commentCount: i.commentCount,
          subscriberCount: i.subscriberCount,
          viewCount: i.viewCount,
          isPinned: i.isPinned,
          isLocked: i.isLocked,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })),
        total: result.total,
        hasMore: (args.offset || 0) + result.issues.length < result.total,
      };
    },

    // Issue labels
    issueLabels: async () => {
      const labels = await issuesService.getLabels();
      return labels.map((l: any) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        color: l.color,
        icon: l.icon,
        description: l.description,
      }));
    },

    // Issue stats (public)
    issueStats: async () => {
      const stats = await issuesService.getStats();
      return {
        totalIssues: stats.totalIssues,
        openIssues: stats.openIssues,
        resolvedIssues: stats.resolvedIssues,
        totalVotes: stats.totalVotes,
        issuesByType: stats.issuesByType,
        issuesByStatus: stats.issuesByStatus,
      };
    },

    // Personalization context
    personalizationContext: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const user = await queryOne<any>(`
        SELECT u.*, a.name as archetype_name, a.focus_areas
        FROM users u
        LEFT JOIN archetypes a ON u.archetype_id = a.id
        WHERE u.id = $1
      `, [userId]);

      const recentWorkouts = await queryOne<{ count: number }>(`
        SELECT COUNT(*) as count FROM workouts
        WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      `, [userId]);

      const goals = await queryAll<any>(`
        SELECT * FROM user_goals WHERE user_id = $1 AND status = 'active'
      `, [userId]);

      return {
        userId,
        level: user?.level || 1,
        archetype: user?.archetype_id ? { id: user.archetype_id, name: user.archetype_name } : null,
        focusAreas: user?.focus_areas || [],
        recentWorkoutCount: recentWorkouts?.count || 0,
        activeGoals: goals.map((g: any) => ({
          id: g.id,
          type: g.goal_type,
          title: g.goal_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Goal',
        })),
        preferences: user?.preferences || {},
      };
    },

    // Personalization recommendations
    personalizationRecommendations: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      // Simple recommendations based on user data
      const recommendations: any[] = [];

      // Check workout frequency
      const weeklyWorkouts = await queryOne<{ count: number }>(`
        SELECT COUNT(*) as count FROM workouts
        WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      `, [userId]);

      if ((weeklyWorkouts?.count || 0) < 3) {
        recommendations.push({
          type: 'workout_frequency',
          title: 'Increase Workout Frequency',
          description: 'Try to hit at least 3 workouts per week for optimal progress',
          priority: 'high',
        });
      }

      // Check for muscle imbalances (simplified)
      const muscleWork = await queryAll<any>(`
        SELECT muscle_id, SUM(activation) as total_activation
        FROM workout_muscle_activations wma
        JOIN workouts w ON wma.workout_id = w.id
        WHERE w.user_id = $1 AND w.date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY muscle_id
      `, [userId]);

      if (muscleWork.length > 0) {
        const avg = muscleWork.reduce((sum: number, m: any) => sum + Number(m.total_activation), 0) / muscleWork.length;
        const neglected = muscleWork.filter((m: any) => Number(m.total_activation) < avg * 0.5);

        if (neglected.length > 0) {
          recommendations.push({
            type: 'muscle_balance',
            title: 'Address Muscle Imbalances',
            description: 'Some muscle groups need more attention',
            priority: 'medium',
            data: { neglectedMuscles: neglected.map((m: any) => m.muscle_id) },
          });
        }
      }

      return recommendations;
    },

    // Onboarding profile
    onboardingProfile: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const profile = await queryOne<any>(`
        SELECT * FROM onboarding_profiles WHERE user_id = $1
      `, [userId]);

      if (!profile) {
        return {
          userId,
          completed: false,
          currentStep: 'welcome',
          steps: ['welcome', 'goals', 'experience', 'equipment', 'schedule', 'archetype'],
        };
      }

      return {
        userId,
        completed: profile.completed,
        currentStep: profile.current_step,
        completedSteps: profile.completed_steps || [],
        fitnessGoals: profile.fitness_goals || [],
        experienceLevel: profile.experience_level,
        availableEquipment: profile.available_equipment || [],
        weeklySchedule: profile.weekly_schedule || {},
        preferredWorkoutDuration: profile.preferred_duration,
      };
    },

    // Privacy summary
    privacySummary: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const settings = await queryOne<any>(`
        SELECT * FROM user_privacy_settings WHERE user_id = $1
      `, [userId]);

      const defaultSettings = {
        profileVisibility: 'public',
        workoutVisibility: 'followers',
        statsVisibility: 'public',
        allowMessages: true,
        showOnLeaderboards: true,
        showOnlineStatus: true,
      };

      return settings || { userId, ...defaultSettings };
    },

    // Personalization plan
    personalizationPlan: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const plan = await queryOne<any>(`
        SELECT * FROM user_personalization_plans WHERE user_id = $1
      `, [userId]);

      if (!plan) {
        return null;
      }

      return {
        id: plan.id,
        userId,
        weeklyPlan: plan.weekly_plan || [],
        recommendations: plan.recommendations || [],
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
      };
    },

    // Personalization summary
    personalizationSummary: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const user = await queryOne<any>(`
        SELECT u.*, a.name as archetype_name
        FROM users u
        LEFT JOIN archetypes a ON u.archetype_id = a.id
        WHERE u.id = $1
      `, [userId]);

      const workoutStats = await queryOne<any>(`
        SELECT
          COUNT(*) as total_workouts,
          AVG(total_tu) as avg_tu,
          MAX(date) as last_workout
        FROM workouts WHERE user_id = $1
      `, [userId]);

      return {
        userId,
        archetype: user?.archetype_id ? { id: user.archetype_id, name: user.archetype_name } : null,
        level: user?.level || 1,
        totalWorkouts: Number(workoutStats?.total_workouts) || 0,
        averageTU: Number(workoutStats?.avg_tu) || 0,
        lastWorkout: workoutStats?.last_workout,
        strengthScore: 0, // TODO: Calculate from stats
        consistencyScore: 0, // TODO: Calculate from workout frequency
      };
    },

    // ============================================
    // Equipment Queries
    // ============================================
    equipmentTypes: async () => {
      const types = await equipmentService.getEquipmentTypes();
      return types.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        icon: t.iconUrl,
      }));
    },

    equipmentCategories: async () => {
      const categories = await equipmentService.getEquipmentCategories();
      return categories.map(c => ({
        id: c,
        name: c,
        description: null,
      }));
    },

    equipmentByCategory: async (_: unknown, args: { category: string }) => {
      const types = await equipmentService.getEquipmentTypesByCategory(args.category);
      return types.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        icon: t.iconUrl,
      }));
    },

    homeEquipment: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const equipment = await equipmentService.getUserHomeEquipment(userId);
      return equipment.map(e => ({
        id: e.id,
        userId: e.userId,
        equipmentId: e.equipmentTypeId,
        equipment: {
          id: e.equipmentTypeId,
          name: e.equipmentName,
          category: e.category,
          description: null,
          icon: null,
        },
        addedAt: new Date(),
      }));
    },

    homeEquipmentIds: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return equipmentService.getUserHomeEquipmentIds(userId);
    },

    locationEquipment: async (_: unknown, args: { locationId: string }) => {
      const equipment = await equipmentService.getLocationEquipment(args.locationId);
      return equipment.map(e => ({
        id: `${args.locationId}_${e.equipmentTypeId}`,
        locationId: args.locationId,
        equipmentId: e.equipmentTypeId,
        equipment: {
          id: e.equipmentTypeId,
          name: e.equipmentName,
          category: e.category,
          description: null,
          icon: null,
        },
        status: e.isVerified ? 'verified' : 'reported',
        lastVerified: e.lastReportedAt ? new Date(e.lastReportedAt) : null,
        verifiedBy: null,
      }));
    },

    // ============================================
    // PT Test Queries
    // ============================================
    ptTests: async () => {
      const tests = await queryAll<{
        id: string;
        name: string;
        description: string;
        category: string;
        scoring_type: string;
        time_limit_seconds: number;
        equipment_required: string[];
      }>(`
        SELECT id, name, description, category, scoring_type, time_limit_seconds, equipment_required
        FROM pt_tests ORDER BY category, name
      `);
      return tests.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        scoringType: t.scoring_type,
        timeLimitSeconds: t.time_limit_seconds,
        equipmentRequired: t.equipment_required || [],
      }));
    },

    ptTest: async (_: unknown, args: { id: string }) => {
      const test = await queryOne<{
        id: string;
        name: string;
        description: string;
        category: string;
        scoring_type: string;
        time_limit_seconds: number;
        equipment_required: string[];
        instructions: string;
      }>(`
        SELECT id, name, description, category, scoring_type, time_limit_seconds, equipment_required, instructions
        FROM pt_tests WHERE id = $1
      `, [args.id]);
      if (!test) return null;
      return {
        id: test.id,
        name: test.name,
        description: test.description,
        category: test.category,
        scoringType: test.scoring_type,
        timeLimitSeconds: test.time_limit_seconds,
        equipmentRequired: test.equipment_required || [],
        instructions: test.instructions,
      };
    },

    myArchetypePTTests: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const user = await queryOne<{ archetype_id: string }>(`
        SELECT current_identity_id as archetype_id FROM users WHERE id = $1
      `, [userId]);

      if (!user?.archetype_id) return [];

      const tests = await queryAll<{
        id: string;
        name: string;
        description: string;
        category: string;
        scoring_type: string;
        time_limit_seconds: number;
        equipment_required: string[];
      }>(`
        SELECT pt.id, pt.name, pt.description, pt.category, pt.scoring_type, pt.time_limit_seconds, pt.equipment_required
        FROM pt_tests pt
        JOIN archetype_pt_tests apt ON pt.id = apt.pt_test_id
        WHERE apt.archetype_id = $1
        ORDER BY pt.category, pt.name
      `, [user.archetype_id]);

      return tests.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        scoringType: t.scoring_type,
        timeLimitSeconds: t.time_limit_seconds,
        equipmentRequired: t.equipment_required || [],
      }));
    },

    ptTestResults: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const results = await queryAll<{
        id: string;
        pt_test_id: string;
        test_name: string;
        score: number;
        raw_value: number;
        unit: string;
        notes: string;
        created_at: Date;
      }>(`
        SELECT r.id, r.pt_test_id, pt.name as test_name, r.score, r.raw_value, r.unit, r.notes, r.created_at
        FROM pt_test_results r
        JOIN pt_tests pt ON r.pt_test_id = pt.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC LIMIT 100
      `, [userId]);

      return results.map(r => ({
        id: r.id,
        testId: r.pt_test_id,
        testName: r.test_name,
        score: r.score,
        rawValue: r.raw_value,
        unit: r.unit,
        notes: r.notes,
        createdAt: r.created_at,
      }));
    },

    ptTestResult: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await queryOne<{
        id: string;
        pt_test_id: string;
        test_name: string;
        score: number;
        raw_value: number;
        unit: string;
        notes: string;
        created_at: Date;
      }>(`
        SELECT r.id, r.pt_test_id, pt.name as test_name, r.score, r.raw_value, r.unit, r.notes, r.created_at
        FROM pt_test_results r
        JOIN pt_tests pt ON r.pt_test_id = pt.id
        WHERE r.id = $1 AND r.user_id = $2
      `, [args.id, userId]);

      if (!result) return null;
      return {
        id: result.id,
        testId: result.pt_test_id,
        testName: result.test_name,
        score: result.score,
        rawValue: result.raw_value,
        unit: result.unit,
        notes: result.notes,
        createdAt: result.created_at,
      };
    },

    ptTestLeaderboard: async (_: unknown, args: { testId: string }) => {
      const entries = await queryAll<{
        user_id: string;
        username: string;
        avatar_url: string;
        score: number;
        raw_value: number;
        created_at: Date;
      }>(`
        SELECT DISTINCT ON (r.user_id)
          r.user_id, u.username, u.avatar_url, r.score, r.raw_value, r.created_at
        FROM pt_test_results r
        JOIN users u ON r.user_id = u.id
        WHERE r.pt_test_id = $1
        ORDER BY r.user_id, r.score DESC, r.created_at DESC
      `, [args.testId]);

      const sorted = entries.sort((a, b) => b.score - a.score);
      return sorted.map((e, index) => ({
        rank: index + 1,
        userId: e.user_id,
        username: e.username,
        avatar: e.avatar_url,
        score: e.score,
        rawValue: e.raw_value,
        achievedAt: e.created_at,
      }));
    },

    // ============================================
    // Limitation Queries
    // ============================================
    limitations: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const limitations = await queryAll<{
        id: string;
        body_region: string;
        description: string;
        severity: string;
        start_date: Date;
        end_date: Date;
        is_active: boolean;
        excluded_exercises: string[];
        created_at: Date;
      }>(`
        SELECT id, body_region, description, severity, start_date, end_date, is_active, excluded_exercises, created_at
        FROM user_limitations WHERE user_id = $1
        ORDER BY is_active DESC, created_at DESC
      `, [userId]);

      return limitations.map(l => ({
        id: l.id,
        userId,
        bodyRegion: l.body_region,
        description: l.description,
        severity: l.severity,
        startDate: l.start_date,
        endDate: l.end_date,
        active: l.is_active,
        excludedExercises: l.excluded_exercises || [],
        createdAt: l.created_at,
      }));
    },

    // Exercise Substitutions
    exerciseSubstitutions: async (_: unknown, args: { exerciseId: string }, context: Context) => {
      const { exerciseId } = args;

      // Get the original exercise and its muscle activations
      const original = await queryOne<{
        id: string;
        name: string;
        type: string;
        equipment_required: string[];
        locations: string[];
      }>('SELECT id, name, type, equipment_required, locations FROM exercises WHERE id = $1', [exerciseId]);

      if (!original) {
        return [];
      }

      // Get muscle activations for original exercise
      const originalActivations = await queryAll<{ muscle_id: string; activation: number }>(
        'SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1',
        [exerciseId]
      );

      if (originalActivations.length === 0) {
        return [];
      }

      // Build muscle activation vector
      const muscleVector: Record<string, number> = {};
      for (const act of originalActivations) {
        muscleVector[act.muscle_id] = act.activation;
      }

      // Get user's equipment if authenticated
      let userEquipment: string[] = [];
      if (context.user?.userId) {
        const equipment = await queryAll<{ equipment_id: string }>(
          'SELECT equipment_id FROM user_home_equipment WHERE user_id = $1',
          [context.user.userId]
        );
        userEquipment = equipment.map(e => e.equipment_id);
      }

      // Find similar exercises with cosine similarity on muscle activations
      const candidates = await queryAll<{
        exercise_id: string;
        name: string;
        type: string;
        equipment_required: string[];
        locations: string[];
      }>(`
        SELECT DISTINCT e.id as exercise_id, e.name, e.type, e.equipment_required, e.locations
        FROM exercises e
        JOIN exercise_activations ea ON ea.exercise_id = e.id
        WHERE e.id != $1
        AND ea.muscle_id = ANY($2::text[])
      `, [exerciseId, Object.keys(muscleVector)]);

      // Calculate similarity scores
      const substitutions = [];
      for (const candidate of candidates) {
        // Get candidate's muscle activations
        const candidateActivations = await queryAll<{ muscle_id: string; activation: number }>(
          'SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1',
          [candidate.exercise_id]
        );

        const candidateVector: Record<string, number> = {};
        for (const act of candidateActivations) {
          candidateVector[act.muscle_id] = act.activation;
        }

        // Calculate cosine similarity
        const similarity = cosineSimilarity(muscleVector, candidateVector);

        // Skip low similarity exercises
        if (similarity < 0.5) continue;

        // Determine reason based on equipment/type
        let reason = 'Similar muscle activation pattern';
        if (candidate.type === original.type) {
          reason = 'Same movement type with similar muscle activation';
        } else if (userEquipment.length > 0) {
          const hasEquipment = !candidate.equipment_required?.length ||
            candidate.equipment_required.every(eq => userEquipment.includes(eq));
          if (hasEquipment) {
            reason = 'Available with your equipment';
          }
        }

        substitutions.push({
          originalExerciseId: exerciseId,
          substituteExerciseId: candidate.exercise_id,
          substitute: {
            id: candidate.exercise_id,
            name: candidate.name,
            type: candidate.type,
            difficulty: 2, // Default
            description: null,
            primaryMuscles: Object.keys(candidateVector).join(','),
            equipmentRequired: candidate.equipment_required || [],
            locations: candidate.locations || [],
          },
          reason,
          effectiveness: Math.round(similarity * 100) / 100,
        });
      }

      // Sort by effectiveness and limit to top 5
      return substitutions
        .sort((a, b) => b.effectiveness - a.effectiveness)
        .slice(0, 5);
    },

    // ============================================
    // Onboarding Status Query
    // ============================================
    onboardingStatus: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const profile = await queryOne<{
        completed: boolean;
        current_step: string;
        completed_steps: string[];
      }>(`
        SELECT completed, current_step, completed_steps
        FROM onboarding_profiles WHERE user_id = $1
      `, [userId]);

      const steps = ['welcome', 'goals', 'experience', 'equipment', 'schedule', 'archetype'];
      return {
        userId,
        completed: profile?.completed || false,
        currentStep: profile?.current_step || 'welcome',
        completedSteps: profile?.completed_steps || [],
        totalSteps: steps.length,
        remainingSteps: steps.filter(s => !profile?.completed_steps?.includes(s)),
      };
    },

    // Competitions
    competitions: async (_: unknown, args: { status?: string }, context: Context) => {
      let query = `
        SELECT c.*,
          (SELECT COUNT(*) FROM competition_participants WHERE competition_id = c.id) as participant_count
        FROM competitions c
        WHERE c.is_public = TRUE AND c.status != 'canceled'
      `;
      const params: unknown[] = [];

      if (args.status) {
        params.push(args.status);
        query += ` AND c.status = $${params.length}`;
      }

      query += ` ORDER BY c.start_date DESC LIMIT 50`;

      const competitions = await queryAll<{
        id: string;
        name: string;
        description: string | null;
        creator_id: string;
        type: string;
        status: string;
        start_date: Date;
        end_date: Date;
        max_participants: number | null;
        entry_fee: number | null;
        prize_pool: number | null;
        rules: string | null;
        is_public: boolean;
        participant_count: string;
        created_at: Date;
      }>(query, params);

      // Get leaderboards for each competition
      const competitionIds = competitions.map(c => c.id);
      let leaderboardMap: Record<string, Array<{
        user_id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        score: number;
        rank: number | null;
      }>> = {};

      if (competitionIds.length > 0) {
        const leaderboardEntries = await queryAll<{
          competition_id: string;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          score: number;
          rank: number | null;
        }>(`
          SELECT cp.competition_id, cp.user_id, u.username, u.display_name, u.avatar_url, cp.score, cp.rank
          FROM competition_participants cp
          JOIN users u ON cp.user_id = u.id
          WHERE cp.competition_id = ANY($1)
          ORDER BY cp.score DESC
        `, [competitionIds]);

        for (const entry of leaderboardEntries) {
          if (!leaderboardMap[entry.competition_id]) {
            leaderboardMap[entry.competition_id] = [];
          }
          if (leaderboardMap[entry.competition_id].length < 10) {
            leaderboardMap[entry.competition_id].push(entry);
          }
        }
      }

      // Check if user has joined each competition
      const userId = context.user?.userId;
      let joinedMap: Record<string, boolean> = {};
      if (userId && competitionIds.length > 0) {
        const joined = await queryAll<{ competition_id: string }>(`
          SELECT competition_id FROM competition_participants
          WHERE user_id = $1 AND competition_id = ANY($2)
        `, [userId, competitionIds]);
        for (const j of joined) {
          joinedMap[j.competition_id] = true;
        }
      }

      return competitions.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        creatorId: c.creator_id,
        type: c.type,
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
        maxParticipants: c.max_participants,
        entryFee: c.entry_fee,
        prizePool: c.prize_pool,
        rules: c.rules,
        isPublic: c.is_public,
        participantCount: Number(c.participant_count),
        goalTu: 100, // Default goal TU
        hasJoined: joinedMap[c.id] || false,
        leaderboard: (leaderboardMap[c.id] || []).map((e, idx) => ({
          userId: e.user_id,
          username: e.username,
          displayName: e.display_name,
          avatar: e.avatar_url,
          score: e.score,
          rank: e.rank || idx + 1,
          tuEarned: e.score,
        })),
        createdAt: c.created_at,
      }));
    },

    competition: async (_: unknown, args: { id: string }) => {
      const competition = await queryOne<{
        id: string;
        name: string;
        description: string | null;
        creator_id: string;
        type: string;
        status: string;
        start_date: Date;
        end_date: Date;
        max_participants: number | null;
        entry_fee: number | null;
        prize_pool: number | null;
        rules: string | null;
        is_public: boolean;
        created_at: Date;
      }>('SELECT * FROM competitions WHERE id = $1', [args.id]);

      if (!competition) {
        return null;
      }

      const participants = await queryAll<{
        user_id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        score: number;
        rank: number | null;
      }>(`
        SELECT cp.*, u.username, u.display_name, u.avatar_url
        FROM competition_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.competition_id = $1
        ORDER BY cp.score DESC
        LIMIT 10
      `, [args.id]);

      return {
        id: competition.id,
        name: competition.name,
        description: competition.description,
        creatorId: competition.creator_id,
        type: competition.type,
        status: competition.status,
        startDate: competition.start_date,
        endDate: competition.end_date,
        maxParticipants: competition.max_participants,
        entryFee: competition.entry_fee,
        prizePool: competition.prize_pool,
        rules: competition.rules,
        isPublic: competition.is_public,
        participantCount: participants.length,
        goalTu: 100,
        leaderboard: participants.map((p, idx) => ({
          userId: p.user_id,
          username: p.username,
          displayName: p.display_name,
          avatar: p.avatar_url,
          score: p.score,
          rank: p.rank || idx + 1,
          tuEarned: p.score,
        })),
        createdAt: competition.created_at,
      };
    },

    myCompetitionEntries: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const entries = await queryAll<{
        competition_id: string;
        user_id: string;
        score: number;
        rank: number | null;
        joined_at: Date;
        comp_name: string;
        comp_type: string;
      }>(`
        SELECT cp.*, c.name as comp_name, c.type as comp_type
        FROM competition_participants cp
        JOIN competitions c ON cp.competition_id = c.id
        WHERE cp.user_id = $1
        ORDER BY cp.joined_at DESC
      `, [userId]);

      return entries.map(e => ({
        id: `${e.competition_id}_${e.user_id}`,
        competitionId: e.competition_id,
        competition: {
          id: e.competition_id,
          name: e.comp_name,
          type: e.comp_type,
        },
        userId: e.user_id,
        score: e.score,
        rank: e.rank,
        joinedAt: e.joined_at,
      }));
    },

    // ============================================
    // BUDDY (TRAINING COMPANION) QUERIES
    // ============================================
    buddy: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return buddyService.getBuddy(userId);
    },

    buddyInventory: async (_: unknown, args: { category?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Get owned SKUs from store
      const ownedSkus = await storeService.getOwnedSkus(userId);

      // Get all buddy-related items from the store
      const categoryFilter = args.category ? `buddy_${args.category}` : 'buddy';
      const { items: allBuddyItems } = await storeService.getItems({ category: categoryFilter, limit: 500 });

      // Filter to only owned items
      const ownedBuddyItems = allBuddyItems.filter((item: { sku: string; category: string }) => {
        if (!ownedSkus.has(item.sku)) return false;
        if (!item.category.startsWith('buddy_')) return false;
        return true;
      });

      // Check which items are equipped
      const buddy = await buddyService.getBuddy(userId);
      const equippedSkus = buddy ? [
        buddy.equippedAura,
        buddy.equippedArmor,
        buddy.equippedWings,
        buddy.equippedTool,
        buddy.equippedSkin,
        buddy.equippedEmotePack,
        buddy.equippedVoicePack,
      ].filter(Boolean) : [];

      return ownedBuddyItems.map((item: { sku: string; name: string; category: string; rarity?: string; icon?: string; description?: string }) => ({
        id: item.sku, // Use sku as the unique identifier
        sku: item.sku,
        name: item.name,
        category: item.category,
        slot: item.category.replace('buddy_', ''),
        rarity: item.rarity || null,
        equipped: equippedSkus.includes(item.sku),
        icon: item.icon || null,
        description: item.description || null,
      }));
    },

    buddyEvolutionPath: async (_: unknown, args: { species: string }) => {
      return buddyService.getEvolutionPath(args.species as any);
    },

    buddyLeaderboard: async (_: unknown, args: { species?: string; limit?: number; offset?: number }) => {
      return buddyService.getLeaderboard({
        species: args.species as any,
        limit: args.limit ?? 50,
        offset: args.offset ?? 0,
      });
    },

    // ============================================
    // MYSTERY BOX QUERIES
    // ============================================
    mysteryBoxes: async () => {
      const boxes = await mysteryBoxService.getAvailableBoxes();
      return boxes.map((box: any) => ({
        id: box.id,
        name: box.name,
        description: box.description,
        boxType: box.box_type,
        price: box.price,
        dropRates: box.drop_rates,
        availableFrom: box.available_from,
        availableUntil: box.available_until,
        maxPurchasesPerDay: box.max_purchases_per_day,
        createdAt: box.created_at,
      }));
    },

    mysteryBox: async (_: unknown, args: { id: string }) => {
      const details = await mysteryBoxService.getBoxDetails(args.id);
      if (!details) return null;
      return {
        box: {
          id: details.box.id,
          name: details.box.name,
          description: details.box.description,
          boxType: details.box.box_type,
          price: details.box.price,
          dropRates: details.box.drop_rates,
          availableFrom: details.box.available_from,
          availableUntil: details.box.available_until,
          maxPurchasesPerDay: details.box.max_purchases_per_day,
          createdAt: details.box.created_at,
        },
        recentDrops: details.recentDrops.map((drop: any) => ({
          rarity: drop.rarity_received,
          openedAt: drop.opened_at,
          name: drop.name,
          previewUrl: drop.preview_url,
          username: drop.username,
        })),
        dropStats: details.dropStats.map((stat: any) => ({
          rarity: stat.rarity_received,
          count: parseInt(stat.count, 10),
        })),
      };
    },

    mysteryBoxHistory: async (_: unknown, args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const history = await mysteryBoxService.getUserOpeningHistory(userId, args.limit ?? 50);
      return history.map((h: any) => ({
        id: h.id,
        boxId: h.box_id,
        boxName: h.box_name,
        cosmeticId: h.cosmetic_received_id,
        cosmeticName: h.cosmetic_name,
        rarity: h.rarity,
        previewUrl: h.preview_url,
        creditsSpent: h.credits_spent,
        wasPityReward: h.was_pity_reward,
        openedAt: h.opened_at,
      }));
    },

    mysteryBoxPity: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const counters = await mysteryBoxService.getUserPityCounters(userId);
      return counters;
    },

    // SKINS (COSMETIC STORE) QUERIES
    skins: async () => {
      const SKIN_CATEGORIES = [
        'buddy_skin', 'dashboard_theme', 'avatar_frame', 'badge',
        'effect', 'aura', 'armor', 'wings', 'tool', 'emote_pack', 'voice_pack',
      ];
      const items = await queryAll<{
        sku: string;
        name: string;
        description: string | null;
        category: string;
        price_credits: number;
        rarity: string;
        requires_level: number;
      }>(
        `SELECT sku, name, description, category, price_credits, rarity, requires_level
         FROM store_items
         WHERE enabled = TRUE AND category = ANY($1)
         ORDER BY sort_order ASC, sku ASC`,
        [SKIN_CATEGORIES]
      );
      return items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? null,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
        unlockRequirement: r.requires_level > 1 ? `Level ${r.requires_level}` : null,
        creditsRequired: r.requires_level > 1 ? r.requires_level * 100 : null,
        imageUrl: null,
      }));
    },

    ownedSkins: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const SKIN_CATEGORIES = [
        'buddy_skin', 'dashboard_theme', 'avatar_frame', 'badge',
        'effect', 'aura', 'armor', 'wings', 'tool', 'emote_pack', 'voice_pack',
      ];
      const items = await queryAll<{
        sku: string;
        name: string;
        description: string | null;
        category: string;
        price_credits: number;
        rarity: string;
      }>(
        `SELECT si.sku, si.name, si.description, si.category, si.price_credits, si.rarity
         FROM user_inventory ui
         JOIN store_items si ON ui.sku = si.sku
         WHERE ui.user_id = $1 AND si.category = ANY($2) AND si.enabled = TRUE
         ORDER BY ui.acquired_at DESC`,
        [userId, SKIN_CATEGORIES]
      );
      return items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? null,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
        unlockRequirement: null,
        creditsRequired: null,
        imageUrl: null,
      }));
    },

    equippedSkins: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const buddy = await queryOne<{
        equipped_aura: string | null;
        equipped_armor: string | null;
        equipped_wings: string | null;
        equipped_tool: string | null;
        equipped_skin: string | null;
        equipped_emote_pack: string | null;
        equipped_voice_pack: string | null;
      }>(
        `SELECT equipped_aura, equipped_armor, equipped_wings, equipped_tool,
                equipped_skin, equipped_emote_pack, equipped_voice_pack
         FROM user_buddies WHERE user_id = $1`,
        [userId]
      );
      if (!buddy) return [];
      const equippedSkus = [
        buddy.equipped_aura, buddy.equipped_armor, buddy.equipped_wings,
        buddy.equipped_tool, buddy.equipped_skin, buddy.equipped_emote_pack,
        buddy.equipped_voice_pack,
      ].filter(Boolean) as string[];
      if (equippedSkus.length === 0) return [];
      const items = await queryAll<{
        sku: string;
        name: string;
        description: string | null;
        category: string;
        price_credits: number;
        rarity: string;
      }>(
        `SELECT sku, name, description, category, price_credits, rarity
         FROM store_items WHERE sku = ANY($1) AND enabled = TRUE`,
        [equippedSkus]
      );
      return items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? null,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
        unlockRequirement: null,
        creditsRequired: null,
        imageUrl: null,
      }));
    },

    unlockableSkins: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const SKIN_CATEGORIES = [
        'buddy_skin', 'dashboard_theme', 'avatar_frame', 'badge',
        'effect', 'aura', 'armor', 'wings', 'tool', 'emote_pack', 'voice_pack',
      ];
      const items = await queryAll<{
        sku: string;
        name: string;
        description: string | null;
        category: string;
        price_credits: number;
        rarity: string;
        requires_level: number;
      }>(
        `SELECT si.sku, si.name, si.description, si.category, si.price_credits, si.rarity, si.requires_level
         FROM store_items si
         WHERE si.enabled = TRUE
           AND si.category = ANY($1)
           AND si.sku NOT IN (SELECT sku FROM user_inventory WHERE user_id = $2)
         ORDER BY si.requires_level ASC, si.sort_order ASC`,
        [SKIN_CATEGORIES, userId]
      );
      return items.map((r) => ({
        id: r.sku,
        name: r.name,
        description: r.description ?? null,
        category: r.category,
        price: r.price_credits,
        rarity: r.rarity,
        unlockRequirement: r.requires_level > 1 ? `Level ${r.requires_level}` : null,
        creditsRequired: r.requires_level > 1 ? r.requires_level * 100 : null,
        imageUrl: null,
      }));
    },

    // MARKETPLACE QUERIES
    marketplaceListings: async (
      _: unknown,
      args: {
        search?: string;
        listingType?: string;
        category?: string;
        rarity?: string;
        sortBy?: string;
        minPrice?: number;
        maxPrice?: number;
        cursor?: string;
        limit?: number;
      },
      context: Context
    ) => {
      // Optional auth - can browse without login
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      const result = await marketplaceService.browseListings({
        search: args.search,
        listingType: args.listingType as any,
        category: args.category,
        rarity: args.rarity,
        sortBy: args.sortBy as any,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        cursor: args.cursor,
        limit: args.limit || 24,
      });

      return {
        listings: result.listings.map((l: any) => ({
          id: l.id,
          sellerId: l.seller_id,
          listingType: l.listing_type,
          price: l.price,
          currentBid: l.current_bid,
          bidCount: l.bid_count,
          expiresAt: l.expires_at,
          createdAt: l.created_at,
          cosmeticName: l.cosmetic_name,
          cosmeticIcon: l.cosmetic_icon,
          rarity: l.rarity,
          category: l.category,
          sellerUsername: l.seller_username,
          allowOffers: l.allow_offers,
          minOffer: l.min_offer,
        })),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },

    marketplaceWatchlist: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      const watchlist = await marketplaceService.getUserWatchlist(userId);
      return watchlist.map((w: any) => ({
        id: w.id,
        listingId: w.listing_id,
        price: w.price,
        listingType: w.listing_type,
        expiresAt: w.expires_at,
        status: w.status,
        cosmeticName: w.cosmetic_name,
        cosmeticIcon: w.cosmetic_icon,
        rarity: w.rarity,
        createdAt: w.created_at,
      }));
    },

    marketplaceStats: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      const stats = await marketplaceService.getUserStats(userId);
      return {
        totalSales: stats.totalSales,
        totalPurchases: stats.totalPurchases,
        totalRevenue: stats.totalRevenue,
        avgRating: stats.avgRating,
        sellerLevel: stats.sellerLevel,
        feeDiscount: stats.feeDiscount,
      };
    },

    // COLLECTION QUERIES
    collectionStats: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      const stats = await collectionService.getUserCollectionStats(userId);

      // Count completed sets
      const setsProgress = await collectionService.getUserSetsProgress(userId);
      const completedSets = setsProgress.filter((s: any) => s.progress?.completionPercent >= 100).length;

      // Transform rarity breakdown to object for frontend
      const rarityObj: Record<string, number> = {};
      stats.rarityBreakdown.forEach((r) => {
        rarityObj[r.rarity] = r.count;
      });

      return {
        totalOwned: stats.totalOwned,
        totalValue: stats.totalValue,
        rarityBreakdown: stats.rarityBreakdown,
        categoryBreakdown: stats.categoryBreakdown,
        completedSets,
      };
    },

    collectionItems: async (
      _: unknown,
      args: {
        category?: string;
        rarity?: string;
        sortBy?: string;
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      const result = await collectionService.getUserCollection(userId, {
        category: args.category,
        rarity: args.rarity,
        sortBy: args.sortBy as any,
        limit: args.limit || 50,
        offset: args.offset || 0,
      });

      return {
        items: result.items.map((item: any) => ({
          id: item.id,
          cosmeticId: item.cosmetic_id,
          name: item.name,
          description: item.description,
          category: item.category,
          rarity: item.rarity,
          icon: item.preview_url || null,
          previewUrl: item.preview_url,
          acquiredAt: item.acquired_at,
          isFavorite: item.is_favorite || false,
          isNew: item.is_new || false,
          estimatedValue: item.base_price,
          isTradeable: item.is_tradeable,
          isGiftable: item.is_giftable,
        })),
        total: result.total,
        hasMore: result.hasMore,
      };
    },

    collectionFavorites: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      const favorites = await collectionService.getUserFavorites(userId);
      return favorites.map((item: any) => ({
        id: item.id,
        cosmeticId: item.cosmetic_id,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        icon: item.preview_url || null,
        previewUrl: item.preview_url,
        acquiredAt: item.acquired_at,
        isFavorite: true,
        isNew: item.is_new || false,
        estimatedValue: item.base_price,
      }));
    },

    collectionSets: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      const setsProgress = await collectionService.getUserSetsProgress(userId);

      // Get full set details for each
      const sets = await Promise.all(
        setsProgress.map(async (sp: any) => {
          const detail = await collectionService.getSetWithProgress(sp.id, userId);
          if (!detail) return null;

          return {
            id: sp.id,
            name: sp.name,
            description: detail.set.description,
            icon: detail.set.theme ? `📦` : '🎁',
            theme: detail.set.theme,
            isLimited: sp.isLimited,
            expirationDate: sp.expirationDate,
            ownedCount: detail.progress.ownedCount,
            totalCount: detail.progress.totalCount,
            rewards: (detail.set.rewards || []).map((r: any) => ({
              threshold: r.threshold,
              icon: '🎁',
              description: r.reward?.type ? `${r.reward.type}: ${r.reward.value}` : 'Reward',
              claimed: (detail.progress.rewardsClaimed || []).includes(r.threshold),
            })),
          };
        })
      );

      return sets.filter(Boolean);
    },

    collectionSetDetail: async (_: unknown, args: { setId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      const detail = await collectionService.getSetWithProgress(args.setId, userId);

      if (!detail) return null;

      return {
        set: {
          id: detail.set.id,
          name: detail.set.name,
          description: detail.set.description,
          icon: detail.set.theme ? `📦` : '🎁',
          theme: detail.set.theme,
          isLimited: detail.set.is_limited,
          expirationDate: detail.set.expiration_date,
          ownedCount: detail.progress.ownedCount,
          totalCount: detail.progress.totalCount,
          rewards: (detail.set.rewards || []).map((r: any) => ({
            threshold: r.threshold,
            icon: '🎁',
            description: r.reward?.type ? `${r.reward.type}: ${r.reward.value}` : 'Reward',
            claimed: (detail.progress.rewardsClaimed || []).includes(r.threshold),
          })),
        },
        progress: {
          ownedCount: detail.progress.ownedCount,
          totalCount: detail.progress.totalCount,
          completionPercent: detail.progress.completionPercent,
          rewardsClaimed: detail.progress.rewardsClaimed || [],
        },
        items: detail.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          icon: item.preview_url || '🎨',
          rarity: item.rarity,
          owned: item.owned,
        })),
        claimableRewards: detail.claimableRewards.map((r: any) => ({
          threshold: r.threshold,
          icon: '🎁',
          description: r.reward?.type ? `${r.reward.type}: ${r.reward.value}` : 'Reward',
        })),
      };
    },

    collectionShowcase: async (_: unknown, args: { userId?: string }, context: Context) => {
      // Use provided userId or current user
      let targetUserId = args.userId;
      if (!targetUserId) {
        const auth = requireAuth(context);
        targetUserId = auth.userId;
      }

      const { collectionService } = await import('../modules/marketplace/collection.service');
      const showcase = await collectionService.getUserShowcase(targetUserId);

      return (showcase.featuredItems || []).map((item: any) => ({
        id: item.id,
        cosmeticId: item.cosmetic_id,
        name: item.name,
        rarity: item.rarity,
        icon: item.preview_url || null,
        previewUrl: item.preview_url,
      }));
    },

    collectionNewCount: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      return await collectionService.getNewItemsCount(userId);
    },

    // TRADES QUERIES
    tradesIncoming: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      const trades = await tradingService.getIncomingTrades(userId);
      return trades.map((t: any) => ({
        id: t.id,
        initiatorId: t.initiator_id,
        initiatorUsername: t.initiator?.username || null,
        receiverId: t.receiver_id,
        receiverUsername: t.receiver?.username || null,
        initiatorItems: (t.initiatorItemDetails || []).map((item: any) => ({
          id: item.user_cosmetic_id || item.id,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon || null,
          previewUrl: item.preview_url || null,
        })),
        initiatorCredits: t.initiator_credits || 0,
        receiverItems: (t.receiverItemDetails || []).map((item: any) => ({
          id: item.user_cosmetic_id || item.id,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon || null,
          previewUrl: item.preview_url || null,
        })),
        receiverCredits: t.receiver_credits || 0,
        status: t.status,
        message: t.message,
        valueWarning: t.initiator_estimated_value && t.receiver_estimated_value
          ? Math.abs(t.initiator_estimated_value - t.receiver_estimated_value) / Math.max(t.initiator_estimated_value, t.receiver_estimated_value) > 0.5
          : false,
        expiresAt: t.expires_at,
        createdAt: t.created_at,
      }));
    },

    tradesOutgoing: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      const trades = await tradingService.getOutgoingTrades(userId);
      return trades.map((t: any) => ({
        id: t.id,
        initiatorId: t.initiator_id,
        initiatorUsername: t.initiator?.username || null,
        receiverId: t.receiver_id,
        receiverUsername: t.receiver?.username || null,
        initiatorItems: (t.initiatorItemDetails || []).map((item: any) => ({
          id: item.user_cosmetic_id || item.id,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon || null,
          previewUrl: item.preview_url || null,
        })),
        initiatorCredits: t.initiator_credits || 0,
        receiverItems: (t.receiverItemDetails || []).map((item: any) => ({
          id: item.user_cosmetic_id || item.id,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon || null,
          previewUrl: item.preview_url || null,
        })),
        receiverCredits: t.receiver_credits || 0,
        status: t.status,
        message: t.message,
        valueWarning: t.initiator_estimated_value && t.receiver_estimated_value
          ? Math.abs(t.initiator_estimated_value - t.receiver_estimated_value) / Math.max(t.initiator_estimated_value, t.receiver_estimated_value) > 0.5
          : false,
        expiresAt: t.expires_at,
        createdAt: t.created_at,
      }));
    },

    tradesHistory: async (_: unknown, args: { limit?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      const trades = await tradingService.getTradeHistory(userId, args.limit ?? 50);
      return trades.map((t: any) => ({
        id: t.id,
        user1Id: t.user1_id,
        user1Username: t.user1_username,
        user2Id: t.user2_id,
        user2Username: t.user2_username,
        status: t.status,
        completedAt: t.completed_at,
      }));
    },

    trade: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      const t = await tradingService.getTradeRequest(args.id, userId);
      if (!t) return null;
      return {
        id: t.id,
        initiatorId: t.initiator_id,
        initiatorUsername: (t as any).initiator?.username || null,
        receiverId: t.receiver_id,
        receiverUsername: (t as any).receiver?.username || null,
        initiatorItems: ((t as any).initiatorItemDetails || []).map((item: any) => ({
          id: item.user_cosmetic_id || item.id,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon || null,
          previewUrl: item.preview_url || null,
        })),
        initiatorCredits: t.initiator_credits || 0,
        receiverItems: ((t as any).receiverItemDetails || []).map((item: any) => ({
          id: item.user_cosmetic_id || item.id,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon || null,
          previewUrl: item.preview_url || null,
        })),
        receiverCredits: t.receiver_credits || 0,
        status: t.status,
        message: t.message,
        valueWarning: t.initiator_estimated_value && t.receiver_estimated_value
          ? Math.abs(t.initiator_estimated_value - t.receiver_estimated_value) / Math.max(t.initiator_estimated_value, t.receiver_estimated_value) > 0.5
          : false,
        expiresAt: t.expires_at,
        createdAt: t.created_at,
      };
    },

    // Achievements
    achievementDefinitions: async (_: unknown, args: { category?: string }) => {
      const definitions = await achievementService.getDefinitions({
        category: args.category as any,
        enabledOnly: true,
      });
      return definitions.map(d => ({
        id: d.id,
        key: d.key,
        name: d.name,
        description: d.description,
        icon: d.icon,
        category: d.category,
        points: d.points,
        rarity: d.rarity,
        tier: 1, // Default tier
        creditsReward: d.points * 10, // Credits based on points
        xpReward: d.points * 5, // XP based on points
        requiresVerification: false,
        unlockHint: d.description,
      }));
    },

    myAchievements: async (_: unknown, args: { category?: string; limit?: number; offset?: number }, context: Context) => {
      const userId = context.user?.userId;
      if (!userId) {
        return { achievements: [], total: 0 };
      }
      const result = await achievementService.getUserAchievements(userId, {
        category: args.category as any,
        limit: args.limit ?? 50,
        offset: args.offset ?? 0,
      });
      return {
        achievements: result.achievements.map(a => ({
          id: a.id,
          achievementKey: a.achievementKey,
          achievementName: a.achievementName,
          achievementDescription: a.achievementDescription,
          achievementIcon: a.achievementIcon,
          category: a.category,
          points: a.points,
          rarity: a.rarity,
          creditsEarned: a.points * 10,
          xpEarned: a.points * 5,
          isVerified: false,
          witnessUsername: null,
          earnedAt: a.earnedAt,
        })),
        total: result.total,
      };
    },

    myAchievementSummary: async (_: unknown, __: unknown, context: Context) => {
      const userId = context.user?.userId;
      if (!userId) {
        return {
          totalPoints: 0,
          totalAchievements: 0,
          totalCredits: 0,
          totalXp: 0,
          byCategory: {},
          byRarity: {},
          recentAchievements: [],
        };
      }
      const summary = await achievementService.getUserSummary(userId);
      return {
        totalPoints: summary.totalPoints,
        totalAchievements: summary.totalAchievements,
        totalCredits: summary.totalPoints * 10,
        totalXp: summary.totalPoints * 5,
        byCategory: summary.byCategory,
        byRarity: summary.byRarity,
        recentAchievements: summary.recentAchievements.map(a => ({
          id: a.id,
          achievementKey: a.achievementKey,
          achievementName: a.achievementName,
          achievementDescription: a.achievementDescription,
          achievementIcon: a.achievementIcon,
          category: a.category,
          points: a.points,
          rarity: a.rarity,
          creditsEarned: a.points * 10,
          xpEarned: a.points * 5,
          isVerified: false,
          witnessUsername: null,
          earnedAt: a.earnedAt,
        })),
      };
    },
  },

  // ============================================
  // MUTATIONS
  // ============================================
  Mutation: {
    // Auth
    register: async (_: unknown, args: { input: { email: string; password: string; username: string } }) => {
      const { email, password, username } = args.input;

      // Check for existing user
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existing) {
        throw new GraphQLError('Email or username already in use', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const userId = `user_${crypto.randomBytes(12).toString('hex')}`;
      const passwordHash = hashPassword(password);
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      await query(
        `INSERT INTO users (id, email, username, password_hash, trial_started_at, trial_ends_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, email, username, passwordHash, now.toISOString(), trialEnds.toISOString()]
      );

      await economyService.initializeBalance(userId, 100);

      const token = generateToken({ userId, email, roles: ['user'] });

      // New users start with 100 credits from initializeBalance
      return {
        token,
        user: {
          id: userId,
          email,
          username,
          level: 1,
          xp: 0,
          wealthTier: buildWealthTierResponse(100),
          roles: ['user'],
          createdAt: now,
        },
      };
    },

    login: async (_: unknown, args: { input: { email: string; password: string } }) => {
      const { email, password } = args.input;

      const user = await queryOne<{
        id: string;
        email: string;
        username: string;
        display_name: string | null;
        bio: string | null;
        social_links: Record<string, string> | null;
        password_hash: string;
        roles: string[];
        level: number;
        xp: number;
        created_at: Date;
      }>(
        `SELECT id, email, username, display_name, bio, social_links, password_hash, roles,
                COALESCE(current_level, 1) as level, COALESCE(total_xp, 0) as xp, created_at
         FROM users WHERE email = $1`,
        [email]
      );

      if (!user || !verifyPassword(password, user.password_hash)) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const roles = user.roles || ['user'];
      const token = generateToken({ userId: user.id, email: user.email, roles });

      // Get credit balance for wealth tier calculation
      const credits = await economyService.getBalance(user.id);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          bio: user.bio,
          socialLinks: user.social_links,
          level: user.level,
          xp: user.xp,
          wealthTier: buildWealthTierResponse(credits),
          roles,
          createdAt: user.created_at,
        },
      };
    },

    // Profile
    updateProfile: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { displayName, bio, avatar, location, socialLinks } = args.input;

      await query(
        `UPDATE users SET display_name = COALESCE($1, display_name),
                         avatar = COALESCE($2, avatar),
                         bio = COALESCE($3, bio),
                         social_links = COALESCE($4, social_links)
         WHERE id = $5`,
        [displayName, avatar, bio, socialLinks ? JSON.stringify(socialLinks) : null, userId]
      );

      // Get credit balance for wealth tier calculation
      const credits = await economyService.getBalance(userId);

      return {
        id: userId,
        userId,
        displayName,
        bio,
        avatar,
        location,
        socialLinks,
        visibility: 'public',
        wealthTier: buildWealthTierResponse(credits),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    // Workouts
    createWorkout: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { exercises, notes, idempotencyKey } = args.input;

      // Check idempotency
      if (idempotencyKey) {
        const existing = await queryOne<{ id: string }>('SELECT id FROM workouts WHERE id = $1', [idempotencyKey]);
        if (existing) {
          const workout = await queryOne<any>('SELECT * FROM workouts WHERE id = $1', [existing.id]);
          return {
            workout: {
              id: workout.id,
              userId: workout.user_id,
              // FIXED: exercise_data is JSONB - PostgreSQL returns it as already-parsed object
              exercises: workout.exercise_data || [],
              totalTU: workout.total_tu,
              createdAt: workout.created_at,
            },
            tuEarned: workout.total_tu,
            levelUp: false,
          };
        }
      }

      // Validate exercises
      const exerciseIds = exercises.map((e: any) => e.exerciseId);
      const placeholders = exerciseIds.map((_: any, i: number) => `$${i + 1}`).join(',');
      const foundExercises = await queryAll<{ id: string }>(
        `SELECT id FROM exercises WHERE id IN (${placeholders})`,
        exerciseIds
      );

      if (foundExercises.length !== exerciseIds.length) {
        throw new GraphQLError('One or more exercises not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const { totalTU, muscleActivations } = await calculateTU(exercises);

      // Charge credits
      const chargeResult = await economyService.charge({
        userId,
        action: 'workout.complete',
        idempotencyKey: `workout-${idempotencyKey || crypto.randomBytes(8).toString('hex')}`,
        metadata: { totalTU, exerciseCount: exercises.length },
      });

      if (!chargeResult.success) {
        throw new GraphQLError(chargeResult.error || 'Insufficient credits', {
          extensions: { code: 'PAYMENT_REQUIRED' },
        });
      }

      const workoutId = idempotencyKey || `workout_${crypto.randomBytes(12).toString('hex')}`;
      const workoutDate = new Date().toISOString().split('T')[0];

      await query(
        `INSERT INTO workouts (id, user_id, date, total_tu, credits_used, notes, is_public, exercise_data, muscle_activations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [workoutId, userId, workoutDate, totalTU, 25, notes || null, true, JSON.stringify(exercises), JSON.stringify(muscleActivations)]
      );

      // Update stats
      let updatedStats = null;
      try {
        updatedStats = await statsService.updateStatsFromWorkout(userId, exercises);
      } catch (err) {
        log.error({ err, userId }, 'Failed to update stats');
      }

      return {
        workout: {
          id: workoutId,
          userId,
          exercises,
          notes,
          totalTU,
          createdAt: new Date(),
        },
        tuEarned: totalTU,
        characterStats: updatedStats,
        levelUp: false,
        achievements: [],
      };
    },

    // Workout Sessions (real-time logging)
    startWorkoutSession: async (_: unknown, args: { input?: { workoutPlan?: any; clientId?: string } }, context: Context) => {
      const { userId } = requireAuth(context);
      const session = await workoutSessionService.startSession(
        userId,
        args.input?.workoutPlan,
        args.input?.clientId
      );
      return { session, setLogged: null, prsAchieved: [], muscleUpdate: session.musclesWorked };
    },

    logSet: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await workoutSessionService.logSet(userId, args.input);
      return {
        session: result.session,
        setLogged: result.setLogged,
        prsAchieved: result.prsAchieved,
        muscleUpdate: result.session.musclesWorked,
      };
    },

    updateSet: async (_: unknown, args: { input: { setId: string; reps?: number; weightKg?: number; rpe?: number; rir?: number; durationSeconds?: number; notes?: string; tag?: string } }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.updateSet(userId, args.input.setId, args.input);
    },

    deleteSet: async (_: unknown, args: { setId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.deleteSet(userId, args.setId);
    },

    pauseWorkoutSession: async (_: unknown, args: { sessionId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.pauseSession(userId, args.sessionId);
    },

    resumeWorkoutSession: async (_: unknown, args: { sessionId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.resumeSession(userId, args.sessionId);
    },

    updateRestTimer: async (_: unknown, args: { sessionId: string; remaining: number; total: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.updateRestTimer(userId, args.sessionId, args.remaining, args.total);
    },

    completeWorkoutSession: async (_: unknown, args: { input: { sessionId: string; notes?: string; isPublic?: boolean } }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.completeSession(userId, args.input);
    },

    abandonWorkoutSession: async (_: unknown, args: { sessionId: string; reason?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.abandonSession(userId, args.sessionId, args.reason);
    },

    recoverWorkoutSession: async (_: unknown, args: { archivedSessionId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return workoutSessionService.recoverSession(userId, args.archivedSessionId);
    },

    // Goals
    createGoal: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { type, title, description, target, current, unit, deadline, isPrimary } = args.input;

      const goalId = `goal_${crypto.randomBytes(12).toString('hex')}`;

      // If setting as primary, unset any existing primary goal
      if (isPrimary) {
        await query(
          `UPDATE user_goals SET is_primary = FALSE WHERE user_id = $1 AND is_primary = TRUE`,
          [userId]
        );
      }

      await query(
        `INSERT INTO user_goals (id, user_id, goal_type, target_value, target_unit, current_value, target_date, status, is_primary, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)`,
        [goalId, userId, type, target, unit, current || 0, deadline, isPrimary || false, description || null]
      );

      return {
        id: goalId,
        userId,
        type,
        title: title || type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Goal',
        description: description || '',
        target,
        current: current || 0,
        unit,
        deadline,
        status: 'active',
        isPrimary: isPrimary || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    deleteGoal: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await query('DELETE FROM user_goals WHERE id = $1 AND user_id = $2', [args.id, userId]);
      return true;
    },

    // Archetypes
    selectArchetype: async (_: unknown, args: { archetypeId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const archetype = await queryOne<any>('SELECT * FROM archetypes WHERE id = $1', [args.archetypeId]);
      if (!archetype) {
        throw new GraphQLError('Archetype not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await query('UPDATE users SET current_identity_id = $1 WHERE id = $2', [args.archetypeId, userId]);

      return {
        success: true,
        archetype: {
          id: archetype.id,
          name: archetype.name,
          description: archetype.description,
        },
        journey: {
          userId,
          currentLevel: 1,
          currentXP: 0,
          xpToNextLevel: 1000,
          totalXP: 0,
          completedMilestones: [],
          unlockedAbilities: [],
        },
      };
    },

    // Skills
    logSkillPractice: async (_: unknown, args: { input: { skillNodeId: string; durationMinutes: number; valueAchieved?: number; notes?: string } }, context: Context) => {
      const { userId } = requireAuth(context);
      const { skillNodeId, durationMinutes, valueAchieved, notes } = args.input;

      const practiceLog = await skillService.logPractice({
        userId,
        skillNodeId,
        durationMinutes,
        valueAchieved,
        notes,
      });

      return {
        id: practiceLog.id,
        skillNodeId: practiceLog.skillNodeId,
        durationMinutes: practiceLog.durationMinutes,
        valueAchieved: practiceLog.valueAchieved,
        notes: practiceLog.notes,
        createdAt: practiceLog.createdAt,
      };
    },

    achieveSkill: async (_: unknown, args: { skillNodeId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await skillService.achieveSkill({
        userId,
        skillNodeId: args.skillNodeId,
      });

      return {
        success: result.success,
        error: result.error,
        xpAwarded: result.xpAwarded,
        creditsAwarded: result.creditsAwarded,
      };
    },

    // Martial Arts Mutations
    practiceMartialArt: async (_: unknown, args: { input: { techniqueId: string; durationMinutes: number; repsPerformed?: number; roundsPerformed?: number; partnerDrill?: boolean; notes?: string } }, context: Context) => {
      const { userId } = requireAuth(context);
      const practiceLog = await martialArtsService.logPractice({
        userId,
        techniqueId: args.input.techniqueId,
        durationMinutes: args.input.durationMinutes,
        repsPerformed: args.input.repsPerformed,
        roundsPerformed: args.input.roundsPerformed,
        partnerDrill: args.input.partnerDrill,
        notes: args.input.notes,
      });

      return {
        id: practiceLog.id,
        userId: practiceLog.userId,
        techniqueId: practiceLog.techniqueId,
        techniqueName: null,
        disciplineName: null,
        practiceDate: practiceLog.practiceDate,
        durationMinutes: practiceLog.durationMinutes,
        repsPerformed: practiceLog.repsPerformed,
        roundsPerformed: practiceLog.roundsPerformed,
        partnerDrill: practiceLog.partnerDrill,
        notes: practiceLog.notes,
        createdAt: practiceLog.createdAt,
      };
    },

    masterMartialArt: async (_: unknown, args: { techniqueId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await martialArtsService.masterTechnique({
        userId,
        techniqueId: args.techniqueId,
      });

      return {
        success: result.success,
        creditsAwarded: result.creditsAwarded,
        xpAwarded: result.xpAwarded,
        error: result.error,
      };
    },

    updateMartialArtNotes: async (_: unknown, args: { techniqueId: string; notes: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await martialArtsService.updateNotes(userId, args.techniqueId, args.notes);
      return true;
    },

    // Economy
    chargeCredits: async (_: unknown, args: { input: { amount: number; action: string; metadata?: any } }, context: Context) => {
      const { userId } = requireAuth(context);
      const { amount, action, metadata } = args.input;

      const result = await economyService.charge({
        userId,
        action,
        amount,
        idempotencyKey: `charge-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        metadata,
      });

      const newBalance = await economyService.getBalance(userId);

      return {
        success: result.success,
        newBalance,
        error: result.error,
      };
    },

    // Social Spending
    sendTip: async (
      _: unknown,
      args: {
        input: {
          recipientId: string;
          amount: number;
          message?: string;
          isAnonymous?: boolean;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { recipientId, amount, message } = args.input;

      try {
        const tip = await socialSpendingService.sendTip(userId, recipientId, amount, {
          message,
        });

        // Get recipient username
        const recipient = await queryOne<{ username: string }>(
          'SELECT username FROM users WHERE id = $1',
          [recipientId]
        );

        return {
          success: true,
          error: null,
          transactionId: tip.id,
          amount: tip.amount,
          newBalance: await economyService.getBalance(userId),
          recipientUsername: recipient?.username,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to send tip',
          transactionId: null,
          amount: 0,
          newBalance: await economyService.getBalance(userId),
          recipientUsername: null,
        };
      }
    },

    sendGift: async (
      _: unknown,
      args: {
        input: {
          recipientId: string;
          itemSku: string;
          message?: string;
          isAnonymous?: boolean;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { recipientId, itemSku, message } = args.input;

      try {
        const gift = await socialSpendingService.sendGift(userId, recipientId, itemSku, {
          message,
        });

        const recipient = await queryOne<{ username: string }>(
          'SELECT username FROM users WHERE id = $1',
          [recipientId]
        );

        return {
          success: true,
          error: null,
          transactionId: gift.id,
          itemSku: gift.itemSku,
          cost: gift.totalCost,
          fee: Math.ceil(gift.totalCost * 0.1), // 10% fee
          newBalance: await economyService.getBalance(userId),
          recipientUsername: recipient?.username,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to send gift',
          transactionId: null,
          itemSku,
          cost: 0,
          fee: 0,
          newBalance: await economyService.getBalance(userId),
          recipientUsername: null,
        };
      }
    },

    sendSuperHighFive: async (
      _: unknown,
      args: {
        input: {
          recipientId: string;
          type: string;
          targetType?: string;
          targetId?: string;
          message?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { recipientId, type, targetType, targetId, message } = args.input;

      try {
        const highFive = await socialSpendingService.sendSuperHighFive(
          userId,
          recipientId,
          type as 'super' | 'mega' | 'standing_ovation',
          {
            sourceType: targetType,
            sourceId: targetId,
            message,
          }
        );

        const recipient = await queryOne<{ username: string }>(
          'SELECT username FROM users WHERE id = $1',
          [recipientId]
        );

        // Animation URLs based on type
        const animationUrls: Record<string, string> = {
          super: '/animations/high-five-super.json',
          mega: '/animations/high-five-mega.json',
          standing_ovation: '/animations/standing-ovation.json',
        };

        return {
          success: true,
          error: null,
          transactionId: highFive.id,
          type: highFive.type,
          cost: highFive.cost,
          newBalance: await economyService.getBalance(userId),
          recipientUsername: recipient?.username,
          animationUrl: animationUrls[highFive.type] || null,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to send super high five',
          transactionId: null,
          type,
          cost: 0,
          newBalance: await economyService.getBalance(userId),
          recipientUsername: null,
          animationUrl: null,
        };
      }
    },

    boostPost: async (
      _: unknown,
      args: {
        input: {
          targetType: string;
          targetId: string;
          durationHours: number;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { targetType, targetId, durationHours } = args.input;

      try {
        // Determine boost option based on duration
        const boostOption = durationHours <= 24 ? '24h' : '7d';
        const boost = await socialSpendingService.boostPost(userId, targetType, targetId, boostOption);

        return {
          success: true,
          error: null,
          transactionId: boost.id,
          cost: boost.cost,
          newBalance: await economyService.getBalance(userId),
          boostEndsAt: boost.endsAt.toISOString(),
          targetType: boost.targetType,
          targetId: boost.targetId,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to boost post',
          transactionId: null,
          cost: 0,
          newBalance: await economyService.getBalance(userId),
          boostEndsAt: null,
          targetType,
          targetId,
        };
      }
    },

    transferCredits: async (
      _: unknown,
      args: {
        input: {
          recipientId: string;
          amount: number;
          message?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { recipientId, amount, message } = args.input;

      try {
        const transfer = await walletService.transfer({
          senderId: userId,
          recipientId,
          amount,
          note: message,
          tipType: 'user',
        });

        const recipient = await queryOne<{ username: string }>(
          'SELECT username FROM users WHERE id = $1',
          [recipientId]
        );

        return {
          success: true,
          error: null,
          transactionId: transfer.transferId,
          amount,
          fee: 0, // No fee for P2P transfers
          newBalance: transfer.senderNewBalance,
          recipientUsername: recipient?.username,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to transfer credits',
          transactionId: null,
          amount: 0,
          fee: 0,
          newBalance: await economyService.getBalance(userId),
          recipientUsername: null,
        };
      }
    },

    markEarnEventsShown: async (
      _: unknown,
      args: { eventIds: string[] },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      await earnEventsService.markEventsSeen(userId, args.eventIds);
      return true;
    },

    // Tips
    markTipSeen: async (_: unknown, args: { tipId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await query(
        `INSERT INTO user_tip_views (user_id, tip_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, args.tipId]
      );
      return true;
    },

    // Logging
    logFrontendError: async (_: unknown, args: { input: any }) => {
      log.error({ frontendError: args.input }, 'Frontend error reported');
      return true;
    },

    // Training Programs Mutations
    createProgram: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return ProgramsService.create(userId, args.input);
    },

    updateProgram: async (_: unknown, args: { id: string; input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return ProgramsService.update(args.id, userId, args.input);
    },

    deleteProgram: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await ProgramsService.delete(args.id, userId);
      return true;
    },

    duplicateProgram: async (_: unknown, args: { id: string; newName?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return ProgramsService.duplicate(args.id, userId, args.newName);
    },

    rateProgram: async (
      _: unknown,
      args: { id: string; rating: number; review?: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      await ProgramsService.rate(args.id, userId, args.rating, args.review);
      return true;
    },

    enrollInProgram: async (_: unknown, args: { programId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.enroll(userId, args.programId);
    },

    recordProgramWorkout: async (_: unknown, args: { programId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.recordWorkout(userId, args.programId);
    },

    pauseEnrollment: async (_: unknown, args: { enrollmentId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.pause(args.enrollmentId, userId);
    },

    resumeEnrollment: async (_: unknown, args: { enrollmentId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.resume(args.enrollmentId, userId);
    },

    dropEnrollment: async (_: unknown, args: { enrollmentId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return EnrollmentService.drop(args.enrollmentId, userId);
    },

    // Sleep & Recovery Mutations
    logSleep: async (
      _: unknown,
      args: {
        input: {
          bedTime: string;
          wakeTime: string;
          quality: number;
          sleepEnvironment?: {
            dark?: boolean;
            quiet?: boolean;
            temperature?: string;
            screenBeforeBed?: boolean;
            caffeineAfter6pm?: boolean;
            alcoholConsumed?: boolean;
          };
          timeToFallAsleepMinutes?: number;
          wakeCount?: number;
          notes?: string;
          source?: string;
          externalId?: string;
          loggedAt?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      return sleepService.logSleep(userId, args.input as CreateSleepLogInput);
    },

    updateSleepLog: async (
      _: unknown,
      args: {
        id: string;
        input: {
          quality?: number;
          sleepEnvironment?: {
            dark?: boolean;
            quiet?: boolean;
            temperature?: string;
            screenBeforeBed?: boolean;
            caffeineAfter6pm?: boolean;
            alcoholConsumed?: boolean;
          };
          timeToFallAsleepMinutes?: number;
          wakeCount?: number;
          notes?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const result = await sleepService.updateSleepLog(userId, args.id, args.input as UpdateSleepLogInput);
      if (!result) {
        throw new GraphQLError('Sleep log not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return result;
    },

    deleteSleepLog: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.deleteSleepLog(userId, args.id);
    },

    createSleepGoal: async (
      _: unknown,
      args: {
        input: {
          targetHours: number;
          targetBedTime?: string;
          targetWakeTime?: string;
          targetQuality?: number;
          consistencyTarget?: number;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      return sleepService.upsertSleepGoal(userId, args.input as CreateSleepGoalInput);
    },

    updateSleepGoal: async (
      _: unknown,
      args: {
        id: string;
        input: {
          targetHours?: number;
          targetBedTime?: string;
          targetWakeTime?: string;
          targetQuality?: number;
          consistencyTarget?: number;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const result = await sleepService.updateSleepGoal(userId, args.id, args.input as UpdateSleepGoalInput);
      if (!result) {
        throw new GraphQLError('Sleep goal not found', { extensions: { code: 'NOT_FOUND' } });
      }
      return result;
    },

    deleteSleepGoal: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return sleepService.deleteSleepGoal(userId, args.id);
    },

    acknowledgeRecommendation: async (
      _: unknown,
      args: { id: string; input?: { followed?: boolean; feedback?: string } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      await recoveryService.acknowledgeRecommendation(
        userId,
        args.id,
        args.input?.followed,
        args.input?.feedback
      );
      return true;
    },

    generateRecoveryRecommendations: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      return recoveryService.generateRecommendations(userId);
    },

    // RPE/RIR Mutations
    rpeAutoregulate: async (
      _: unknown,
      args: { input: { exerciseIds: string[]; targetRpe?: number } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { exerciseIds, targetRpe = 8 } = args.input;

      if (!exerciseIds || exerciseIds.length === 0) {
        throw new GraphQLError('At least one exerciseId is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const suggestions = await rpeService.getAutoRegulationSuggestions(
        userId,
        exerciseIds,
        targetRpe
      );
      const fatigue = await rpeService.analyzeFatigue(userId);

      return {
        suggestions: suggestions.map((s) => ({
          exerciseId: s.exerciseId,
          exerciseName: s.exerciseName,
          currentWeight: s.currentWeight,
          suggestedWeight: s.suggestedWeight,
          suggestedReps: s.suggestedReps,
          targetRpe: s.targetRpe,
          reasoning: s.reasoning,
          adjustmentPercent: s.adjustmentPercent,
          confidence: s.confidence,
        })),
        context: {
          fatigueLevel: fatigue.classification,
          fatigueScore: fatigue.fatigueScore,
          overallRecommendation: fatigue.recommendation,
        },
      };
    },

    setRpeTarget: async (
      _: unknown,
      args: { exerciseId: string; input: { rpe?: number | null; rir?: number | null } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { rpe = null, rir = null } = args.input;

      await rpeService.setExerciseRPETarget(userId, args.exerciseId, rpe, rir);

      return {
        exerciseId: args.exerciseId,
        rpe,
        rir,
      };
    },

    createRpeSnapshot: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const snapshot = await rpeService.createRPESnapshot(userId);

      if (!snapshot) {
        return null;
      }

      return {
        date: snapshot.snapshotDate,
        avgRpe: snapshot.avgRpe,
        avgRir: snapshot.avgRir,
        totalSets: snapshot.totalSets,
        fatigueScore: snapshot.fatigueScore,
        recoveryRecommendation: snapshot.recoveryRecommendation,
      };
    },

    // Nutrition Mutations
    enableNutrition: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      // Enable nutrition tracking for user
      return { userId, enabled: true };
    },

    disableNutrition: async (_: unknown, args: { deleteData?: boolean }, context: Context) => {
      requireAuth(context);
      // Disable nutrition tracking - deleteData flag indicates whether to remove historical data
      void args.deleteData;
      return true;
    },

    updateNutritionPreferences: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return nutritionService.updatePreferences(userId, args.input);
    },

    updateNutritionGoals: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return nutritionGoalsService.calculateGoals(userId, args.input);
    },

    calculateMacros: async (_: unknown, args: { input: any }, context: Context) => {
      requireAuth(context);
      const { weightKg, heightCm, age, gender, activityLevel, goal } = args.input;

      // Calculate BMR and TDEE
      const bmr = macroCalculatorService.calculateBMR(
        weightKg,
        heightCm,
        age,
        gender as 'male' | 'female' | 'other'
      );
      const tdee = macroCalculatorService.calculateTDEE(
        bmr,
        activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
      );
      const calories = macroCalculatorService.calculateTargetCalories(
        tdee,
        goal as 'lose' | 'maintain' | 'gain',
        'moderate'
      );
      const macros = macroCalculatorService.calculateMacros(
        calories,
        weightKg,
        activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
      );

      return {
        calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        tdee,
        bmr,
        proteinRatio: (macros.proteinG * 4) / calories,
        carbsRatio: (macros.carbsG * 4) / calories,
        fatRatio: (macros.fatG * 9) / calories,
        breakdown: {
          proteinCalories: macros.proteinG * 4,
          carbsCalories: macros.carbsG * 4,
          fatCalories: macros.fatG * 9,
        },
      };
    },

    logMeal: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealLogService.createMealLog(userId, args.input);
    },

    updateMeal: async (_: unknown, args: { id: string; input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealLogService.updateMealLog(args.id, userId, args.input);
    },

    deleteMeal: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mealLogService.deleteMealLog(args.id, userId);
      return true;
    },

    logHydration: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealLogService.logHydration(userId, args.input);
    },

    createRecipe: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return recipeService.createRecipe(userId, args.input);
    },

    updateRecipe: async (_: unknown, args: { id: string; input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return recipeService.updateRecipe(args.id, userId, args.input);
    },

    deleteRecipe: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await recipeService.deleteRecipe(args.id, userId);
      return true;
    },

    saveRecipe: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await recipeService.saveRecipe(args.id, userId);
      return true;
    },

    unsaveRecipe: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await recipeService.unsaveRecipe(args.id, userId);
      return true;
    },

    rateRecipe: async (_: unknown, args: { id: string; rating: number; review?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await recipeService.rateRecipe(args.id, userId, args.rating, args.review);
      return true;
    },

    createMealPlan: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealPlanService.createMealPlan(userId, args.input);
    },

    generateMealPlan: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealPlanService.generateMealPlan(userId, args.input);
    },

    activateMealPlan: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return mealPlanService.activateMealPlan(userId, args.id);
    },

    deactivateMealPlan: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      // Deactivate meal plan by updating its status
      await mealPlanService.updateMealPlan(args.id, userId, { status: 'inactive' });
      return true;
    },

    deleteMealPlan: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mealPlanService.deleteMealPlan(userId, args.id);
      return true;
    },

    // ============================================
    // MASCOT / SPIRIT ANIMAL MUTATIONS
    // ============================================

    updateMascotNickname: async (_: unknown, args: { nickname: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const nickname = args.nickname.trim().slice(0, 30);

      await query(
        `UPDATE user_companion_state SET nickname = $1, updated_at = NOW() WHERE user_id = $2`,
        [nickname, userId]
      );

      const state = await companionEventsService.getOrCreateState(userId);
      const progression = companionEventsService.calculateProgression(state.xp, state.stage);

      return {
        id: state.id,
        userId: state.user_id,
        nickname: state.nickname,
        stage: state.stage,
        xp: state.xp,
        progression: {
          currentXp: progression.currentXp,
          prevStageXp: progression.prevStageXp,
          nextStageXp: progression.nextStageXp,
          progressPercent: progression.progressPercent,
          isMaxStage: progression.isMaxStage,
        },
        isVisible: state.is_visible,
        isMinimized: state.is_minimized,
        soundsEnabled: state.sounds_enabled,
        tipsEnabled: state.tips_enabled,
        createdAt: state.created_at,
      };
    },

    updateMascotSettings: async (
      _: unknown,
      args: {
        input: {
          isVisible?: boolean;
          isMinimized?: boolean;
          soundsEnabled?: boolean;
          tipsEnabled?: boolean;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { isVisible, isMinimized, soundsEnabled, tipsEnabled } = args.input;

      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (isVisible !== undefined) {
        updates.push(`is_visible = $${paramIndex++}`);
        params.push(isVisible);
      }
      if (isMinimized !== undefined) {
        updates.push(`is_minimized = $${paramIndex++}`);
        params.push(isMinimized);
      }
      if (soundsEnabled !== undefined) {
        updates.push(`sounds_enabled = $${paramIndex++}`);
        params.push(soundsEnabled);
      }
      if (tipsEnabled !== undefined) {
        updates.push(`tips_enabled = $${paramIndex++}`);
        params.push(tipsEnabled);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        params.push(userId);
        await query(
          `UPDATE user_companion_state SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
          params
        );
      }

      const state = await companionEventsService.getOrCreateState(userId);
      const progression = companionEventsService.calculateProgression(state.xp, state.stage);

      return {
        id: state.id,
        userId: state.user_id,
        nickname: state.nickname,
        stage: state.stage,
        xp: state.xp,
        progression: {
          currentXp: progression.currentXp,
          prevStageXp: progression.prevStageXp,
          nextStageXp: progression.nextStageXp,
          progressPercent: progression.progressPercent,
          isMaxStage: progression.isMaxStage,
        },
        isVisible: state.is_visible,
        isMinimized: state.is_minimized,
        soundsEnabled: state.sounds_enabled,
        tipsEnabled: state.tips_enabled,
        createdAt: state.created_at,
      };
    },

    purchaseMascotCosmetic: async (_: unknown, args: { cosmeticId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await spiritWardrobeService.purchaseCosmetic(userId, args.cosmeticId);

      return {
        success: result.success,
        error: result.error,
        cosmetic: result.cosmetic,
        creditsSpent: result.creditsSpent,
        newBalance: result.newBalance,
      };
    },

    equipMascotCosmetic: async (_: unknown, args: { cosmeticId: string; slot: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const slotMap: Record<string, string> = {
        skin: 'skinId',
        eyes: 'eyesId',
        outfit: 'outfitId',
        headwear: 'headwearId',
        footwear: 'footwearId',
        accessory1: 'accessory1Id',
        accessory2: 'accessory2Id',
        accessory3: 'accessory3Id',
        aura: 'auraId',
        background: 'backgroundId',
        emoteVictory: 'emoteVictoryId',
        emoteIdle: 'emoteIdleId',
      };

      const slotKey = slotMap[args.slot];
      if (!slotKey) {
        throw new GraphQLError('Invalid slot', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await spiritWardrobeService.updateLoadout(userId, { [slotKey]: args.cosmeticId });
      const loadout = await spiritWardrobeService.getLoadout(userId);

      return {
        skin: loadout.skinId ? { id: loadout.skinId } : null,
        eyes: loadout.eyesId ? { id: loadout.eyesId } : null,
        outfit: loadout.outfitId ? { id: loadout.outfitId } : null,
        headwear: loadout.headwearId ? { id: loadout.headwearId } : null,
        footwear: loadout.footwearId ? { id: loadout.footwearId } : null,
        accessory1: loadout.accessory1Id ? { id: loadout.accessory1Id } : null,
        accessory2: loadout.accessory2Id ? { id: loadout.accessory2Id } : null,
        accessory3: loadout.accessory3Id ? { id: loadout.accessory3Id } : null,
        aura: loadout.auraId ? { id: loadout.auraId } : null,
        background: loadout.backgroundId ? { id: loadout.backgroundId } : null,
        emoteVictory: loadout.emoteVictoryId ? { id: loadout.emoteVictoryId } : null,
        emoteIdle: loadout.emoteIdleId ? { id: loadout.emoteIdleId } : null,
      };
    },

    unequipMascotCosmetic: async (_: unknown, args: { slot: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const slotMap: Record<string, string> = {
        skin: 'skinId',
        eyes: 'eyesId',
        outfit: 'outfitId',
        headwear: 'headwearId',
        footwear: 'footwearId',
        accessory1: 'accessory1Id',
        accessory2: 'accessory2Id',
        accessory3: 'accessory3Id',
        aura: 'auraId',
        background: 'backgroundId',
        emoteVictory: 'emoteVictoryId',
        emoteIdle: 'emoteIdleId',
      };

      const slotKey = slotMap[args.slot];
      if (!slotKey) {
        throw new GraphQLError('Invalid slot', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await spiritWardrobeService.updateLoadout(userId, { [slotKey]: null });
      const loadout = await spiritWardrobeService.getLoadout(userId);

      return {
        skin: loadout.skinId ? { id: loadout.skinId } : null,
        eyes: loadout.eyesId ? { id: loadout.eyesId } : null,
        outfit: loadout.outfitId ? { id: loadout.outfitId } : null,
        headwear: loadout.headwearId ? { id: loadout.headwearId } : null,
        footwear: loadout.footwearId ? { id: loadout.footwearId } : null,
        accessory1: loadout.accessory1Id ? { id: loadout.accessory1Id } : null,
        accessory2: loadout.accessory2Id ? { id: loadout.accessory2Id } : null,
        accessory3: loadout.accessory3Id ? { id: loadout.accessory3Id } : null,
        aura: loadout.auraId ? { id: loadout.auraId } : null,
        background: loadout.backgroundId ? { id: loadout.backgroundId } : null,
        emoteVictory: loadout.emoteVictoryId ? { id: loadout.emoteVictoryId } : null,
        emoteIdle: loadout.emoteIdleId ? { id: loadout.emoteIdleId } : null,
      };
    },

    saveMascotPreset: async (_: unknown, args: { name: string; icon?: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await spiritWardrobeService.savePreset(userId, args.name, args.icon || 'outfit');

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to save preset', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const presets = await spiritWardrobeService.getPresets(userId);
      const preset = presets.find((p) => p.id === result.presetId);

      if (!preset) {
        throw new GraphQLError('Preset not found', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }

      return {
        id: preset.id,
        name: preset.name,
        icon: preset.icon,
        loadout: preset.loadout,
        createdAt: preset.createdAt,
      };
    },

    loadMascotPreset: async (_: unknown, args: { presetId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await spiritWardrobeService.loadPreset(userId, args.presetId);

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to load preset', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const loadout = await spiritWardrobeService.getLoadout(userId);

      return {
        skin: loadout.skinId ? { id: loadout.skinId } : null,
        eyes: loadout.eyesId ? { id: loadout.eyesId } : null,
        outfit: loadout.outfitId ? { id: loadout.outfitId } : null,
        headwear: loadout.headwearId ? { id: loadout.headwearId } : null,
        footwear: loadout.footwearId ? { id: loadout.footwearId } : null,
        accessory1: loadout.accessory1Id ? { id: loadout.accessory1Id } : null,
        accessory2: loadout.accessory2Id ? { id: loadout.accessory2Id } : null,
        accessory3: loadout.accessory3Id ? { id: loadout.accessory3Id } : null,
        aura: loadout.auraId ? { id: loadout.auraId } : null,
        background: loadout.backgroundId ? { id: loadout.backgroundId } : null,
        emoteVictory: loadout.emoteVictoryId ? { id: loadout.emoteVictoryId } : null,
        emoteIdle: loadout.emoteIdleId ? { id: loadout.emoteIdleId } : null,
      };
    },

    deleteMascotPreset: async (_: unknown, args: { presetId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await spiritWardrobeService.deletePreset(userId, args.presetId);

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to delete preset', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return true;
    },

    markMascotReactionsShown: async (_: unknown, args: { reactionIds: string[] }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotTimelineService.markReactionsShown(userId, args.reactionIds);
      return true;
    },

    // ============================================
    // MASCOT ADVANCED POWERS MUTATIONS
    // ============================================

    useMascotAssist: async (
      _: unknown,
      args: { workoutId: string; exerciseId: string; reason?: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const result = await mascotPowersService.useMascotAssist(
        userId,
        args.workoutId,
        args.exerciseId,
        args.reason
      );
      return result;
    },

    saveStreak: async (
      _: unknown,
      args: { streakType: string; streakValue: number },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const validStreakTypes = ['workout_streak', 'login_streak', 'goal_streak', 'challenge_streak'] as const;
      const streakType = validStreakTypes.includes(args.streakType as typeof validStreakTypes[number])
        ? args.streakType as typeof validStreakTypes[number]
        : 'workout_streak';
      const result = await mascotPowersService.saveStreak(userId, streakType, args.streakValue);
      return result;
    },

    requestCreditLoan: async (_: unknown, args: { amount: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await mascotPowersService.requestCreditLoan(userId, args.amount);
      return result;
    },

    repayCreditLoan: async (_: unknown, args: { amount: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const result = await mascotPowersService.repayCreditLoan(userId, args.amount);
      return result;
    },

    dismissCreditAlert: async (_: unknown, args: { alertId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.dismissCreditAlert(userId, args.alertId);
      return true;
    },

    acknowledgeOvertrainingAlert: async (_: unknown, args: { alertId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.acknowledgeOvertrainingAlert(userId, args.alertId);
      return true;
    },

    acceptWorkoutSuggestion: async (_: unknown, args: { suggestionId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.acceptWorkoutSuggestion(userId, args.suggestionId);
      return true;
    },

    generateMascotProgram: async (
      _: unknown,
      args: {
        input: {
          programType: string;
          goal: string;
          durationWeeks: number;
          daysPerWeek: number;
          equipment?: string[];
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const validProgramTypes = ['strength', 'hypertrophy', 'powerbuilding', 'athletic', 'custom'] as const;
      const validGoals = ['build_muscle', 'increase_strength', 'lose_fat', 'improve_endurance', 'general_fitness'] as const;

      const programType = validProgramTypes.includes(args.input.programType as typeof validProgramTypes[number])
        ? args.input.programType as typeof validProgramTypes[number]
        : 'strength';
      const goal = validGoals.includes(args.input.goal as typeof validGoals[number])
        ? args.input.goal as typeof validGoals[number]
        : 'general_fitness';

      const result = await mascotPowersService.generateProgram(userId, {
        programType,
        goal,
        durationWeeks: args.input.durationWeeks,
        daysPerWeek: args.input.daysPerWeek,
        equipment: args.input.equipment,
      });
      return result;
    },

    activateGeneratedProgram: async (_: unknown, args: { programId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.activateGeneratedProgram(userId, args.programId);
      return true;
    },

    unlockMasterAbility: async (_: unknown, args: { abilityKey: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.unlockMasterAbility(userId, args.abilityKey);
      return true;
    },

    updateMascotHighfivePrefs: async (
      _: unknown,
      args: {
        input: {
          enabled?: boolean;
          closeFriends?: boolean;
          crew?: boolean;
          allFollowing?: boolean;
          dailyLimit?: number;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const prefs = await mascotPowersService.updateHighfivePrefs(userId, args.input);
      return prefs;
    },

    executeMascotSocialAction: async (_: unknown, args: { actionId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.executeSocialAction(userId, args.actionId);
      return true;
    },

    setExerciseAvoidance: async (
      _: unknown,
      args: {
        input: {
          exerciseId: string;
          avoidanceType: string;
          reason?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const validTypes = ['favorite', 'avoid', 'injured', 'no_equipment', 'too_difficult', 'too_easy'] as const;
      const avoidanceType = validTypes.includes(args.input.avoidanceType as typeof validTypes[number])
        ? args.input.avoidanceType as typeof validTypes[number]
        : 'avoid';
      await mascotPowersService.setExerciseAvoidance(userId, args.input.exerciseId, avoidanceType, args.input.reason);
      return true;
    },

    removeExerciseAvoidance: async (_: unknown, args: { exerciseId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await mascotPowersService.removeExerciseAvoidance(userId, args.exerciseId);
      return true;
    },

    // ============================================
    // BUDDY (TRAINING COMPANION) MUTATIONS
    // ============================================

    createBuddy: async (
      _: unknown,
      args: { input: { species: string; nickname?: string } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      return buddyService.createBuddy(userId, args.input.species as any, args.input.nickname);
    },

    updateBuddySpecies: async (_: unknown, args: { species: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return buddyService.changeSpecies(userId, args.species as any);
    },

    updateBuddyNickname: async (_: unknown, args: { nickname: string | null }, context: Context) => {
      const { userId } = requireAuth(context);
      await buddyService.setNickname(userId, args.nickname);
      return true;
    },

    updateBuddySettings: async (
      _: unknown,
      args: { input: { visible?: boolean; showOnProfile?: boolean; showInWorkouts?: boolean } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      await buddyService.updateDisplaySettings(userId, args.input);
      return true;
    },

    equipBuddyCosmetic: async (
      _: unknown,
      args: { sku: string; slot: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      await buddyService.equipCosmetic(userId, args.sku, args.slot);
      return true;
    },

    unequipBuddyCosmetic: async (_: unknown, args: { slot: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await buddyService.unequipCosmetic(userId, args.slot);
      return true;
    },

    feedBuddy: async (_: unknown, args: { xpAmount: number }, context: Context) => {
      const { userId } = requireAuth(context);
      return buddyService.addXp(userId, args.xpAmount);
    },

    // ============================================
    // MYSTERY BOX MUTATIONS
    // ============================================
    openMysteryBox: async (_: unknown, args: { boxId: string; quantity?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      try {
        const results = await mysteryBoxService.openBox(userId, args.boxId, args.quantity ?? 1);

        // Get new balance
        const balance = await queryOne<{ balance: number }>(
          'SELECT balance FROM credit_balances WHERE user_id = $1',
          [userId]
        );

        return {
          success: true,
          results: results.map((r: any) => ({
            cosmeticId: r.cosmetic.id,
            cosmeticName: r.cosmetic.name,
            rarity: r.rarity,
            previewUrl: r.cosmetic.preview_url || null,
            wasPityReward: r.wasPityReward,
            isDuplicate: false,
            refundAmount: null,
          })),
          newBalance: balance?.balance ?? null,
        };
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    // ============================================
    // SKINS (COSMETIC STORE) MUTATIONS
    // ============================================

    purchaseSkin: async (_: unknown, args: { skinId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { storeService } = await import('../modules/economy/store.service');
      try {
        const result = await storeService.purchase(userId, args.skinId);
        const balance = await queryOne<{ balance: number }>(
          'SELECT balance FROM credit_balances WHERE user_id = $1',
          [userId]
        );
        const item = await queryOne<{ sku: string; name: string }>(
          'SELECT sku, name FROM store_items WHERE sku = $1',
          [args.skinId]
        );
        return {
          success: true,
          skin: item ? { id: item.sku, name: item.name } : null,
          newBalance: balance?.balance ?? null,
          message: null,
        };
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    equipSkin: async (_: unknown, args: { skinId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const item = await queryOne<{ category: string }>(
        'SELECT category FROM store_items WHERE sku = $1 AND enabled = TRUE',
        [args.skinId]
      );
      if (!item) {
        throw new GraphQLError('Skin not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const owned = await queryOne<{ sku: string }>(
        'SELECT sku FROM user_inventory WHERE user_id = $1 AND sku = $2',
        [userId, args.skinId]
      );
      if (!owned) {
        throw new GraphQLError('You do not own this skin', { extensions: { code: 'FORBIDDEN' } });
      }
      const categoryToColumn: Record<string, string> = {
        'buddy_skin': 'equipped_skin',
        'aura': 'equipped_aura',
        'armor': 'equipped_armor',
        'wings': 'equipped_wings',
        'tool': 'equipped_tool',
        'emote_pack': 'equipped_emote_pack',
        'voice_pack': 'equipped_voice_pack',
      };
      const column = categoryToColumn[item.category];
      if (column) {
        await queryOne(
          `UPDATE user_buddies SET ${column} = $1, updated_at = NOW() WHERE user_id = $2`,
          [args.skinId, userId]
        );
      }
      return { success: true, message: column ? null : 'Skin activated' };
    },

    unequipSkin: async (_: unknown, args: { skinId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const item = await queryOne<{ category: string }>(
        'SELECT category FROM store_items WHERE sku = $1',
        [args.skinId]
      );
      if (!item) {
        throw new GraphQLError('Skin not found', { extensions: { code: 'NOT_FOUND' } });
      }
      const categoryToColumn: Record<string, string> = {
        'buddy_skin': 'equipped_skin',
        'aura': 'equipped_aura',
        'armor': 'equipped_armor',
        'wings': 'equipped_wings',
        'tool': 'equipped_tool',
        'emote_pack': 'equipped_emote_pack',
        'voice_pack': 'equipped_voice_pack',
      };
      const column = categoryToColumn[item.category];
      if (column) {
        await queryOne(
          `UPDATE user_buddies SET ${column} = NULL, updated_at = NOW() WHERE user_id = $1 AND ${column} = $2`,
          [userId, args.skinId]
        );
      }
      return { success: true, message: column ? null : 'Skin deactivated' };
    },

    // ============================================
    // MARKETPLACE MUTATIONS
    // ============================================

    purchaseListing: async (
      _: unknown,
      args: { listingId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      try {
        const result = await marketplaceService.buyNow(args.listingId, userId);
        // Get updated balance
        const user = await import('../db/client').then(m =>
          m.queryOne<{ credit_balance: number }>(
            'SELECT credit_balance FROM users WHERE id = $1',
            [userId]
          )
        );
        return {
          success: result.success,
          newBalance: user?.credit_balance || 0,
          message: null,
        };
      } catch (error: any) {
        return {
          success: false,
          newBalance: null,
          message: error.message,
        };
      }
    },

    makeOffer: async (
      _: unknown,
      args: { listingId: string; amount: number; message?: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      try {
        const offer = await marketplaceService.makeOffer({
          listingId: args.listingId,
          offererId: userId,
          amount: args.amount,
          message: args.message,
        });
        return {
          success: true,
          offerId: (offer as any)?.id || null,
          message: null,
        };
      } catch (error: any) {
        return {
          success: false,
          offerId: null,
          message: error.message,
        };
      }
    },

    addToWatchlist: async (
      _: unknown,
      args: { listingId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      try {
        await marketplaceService.addToWatchlist(userId, args.listingId);
        return { success: true };
      } catch (error: any) {
        return { success: false };
      }
    },

    removeFromWatchlist: async (
      _: unknown,
      args: { listingId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { marketplaceService } = await import('../modules/marketplace/marketplace.service');
      try {
        await marketplaceService.removeFromWatchlist(userId, args.listingId);
        return { success: true };
      } catch (error: any) {
        return { success: false };
      }
    },

    // ============================================
    // COLLECTION MUTATIONS
    // ============================================

    toggleFavorite: async (
      _: unknown,
      args: { itemId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      const result = await collectionService.toggleFavorite(userId, args.itemId);
      return {
        id: args.itemId,
        isFavorite: result.isFavorite,
      };
    },

    markItemSeen: async (
      _: unknown,
      args: { itemId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      await collectionService.markItemAsSeen(userId, args.itemId);
      return { success: true };
    },

    markAllSeen: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      await collectionService.markAllAsSeen(userId);
      return { success: true };
    },

    claimSetReward: async (
      _: unknown,
      args: { setId: string; threshold: number },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { collectionService } = await import('../modules/marketplace/collection.service');
      try {
        const result = await collectionService.claimSetReward(userId, args.setId, args.threshold);
        return {
          success: true,
          reward: result.reward ? {
            type: result.reward.reward.type,
            value: String(result.reward.reward.value),
            description: `${result.reward.reward.type}: ${result.reward.reward.value}`,
          } : null,
        };
      } catch (error: any) {
        return {
          success: false,
          reward: null,
        };
      }
    },

    // ============================================
    // TRADES MUTATIONS
    // ============================================

    createTrade: async (
      _: unknown,
      args: {
        input: {
          receiverId: string;
          initiatorItems?: string[];
          initiatorCredits?: number;
          receiverItems?: string[];
          receiverCredits?: number;
          message?: string;
        };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      try {
        const result = await tradingService.createTradeRequest({
          initiatorId: userId,
          receiverId: args.input.receiverId,
          initiatorItems: args.input.initiatorItems,
          initiatorCredits: args.input.initiatorCredits,
          receiverItems: args.input.receiverItems,
          receiverCredits: args.input.receiverCredits,
          message: args.input.message,
        });
        const t = result.trade as any;
        return {
          success: true,
          trade: {
            id: t.id,
            initiatorId: t.initiator_id,
            initiatorUsername: t.initiator?.username || null,
            receiverId: t.receiver_id,
            receiverUsername: t.receiver?.username || null,
            initiatorItems: (t.initiatorItemDetails || []).map((item: any) => ({
              id: item.user_cosmetic_id || item.id,
              name: item.name,
              rarity: item.rarity,
              icon: item.icon || null,
              previewUrl: item.preview_url || null,
            })),
            initiatorCredits: t.initiator_credits || 0,
            receiverItems: (t.receiverItemDetails || []).map((item: any) => ({
              id: item.user_cosmetic_id || item.id,
              name: item.name,
              rarity: item.rarity,
              icon: item.icon || null,
              previewUrl: item.preview_url || null,
            })),
            receiverCredits: t.receiver_credits || 0,
            status: t.status,
            message: t.message,
            valueWarning: t.initiator_estimated_value && t.receiver_estimated_value
              ? Math.abs(t.initiator_estimated_value - t.receiver_estimated_value) / Math.max(t.initiator_estimated_value, t.receiver_estimated_value) > 0.5
              : false,
            expiresAt: t.expires_at,
            createdAt: t.created_at,
          },
          valueWarning: result.valueWarning,
          message: null,
        };
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    acceptTrade: async (_: unknown, args: { tradeId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      try {
        const result = await tradingService.acceptTrade(args.tradeId, userId);
        return {
          success: true,
          trade: result.trade ? {
            id: result.trade.id,
            status: result.trade.status,
          } : null,
          message: null,
        };
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    rejectTrade: async (_: unknown, args: { tradeId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      try {
        await tradingService.declineTrade(args.tradeId, userId);
        return { success: true, trade: null, message: null };
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    cancelTrade: async (_: unknown, args: { tradeId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const { tradingService } = await import('../modules/marketplace/trading.service');
      try {
        await tradingService.cancelTrade(args.tradeId, userId);
        return { success: true, trade: null, message: null };
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    // ============================================
    // JOURNEY HEALTH MUTATIONS
    // ============================================

    calculateJourneyHealth: async (_: unknown, args: { journeyId: string }, context: Context) => {
      requireAuth(context);
      const health = await journeyHealthService.calculateHealthScore(args.journeyId);
      if (!health) {
        throw new GraphQLError('Failed to calculate health score', {
          extensions: { code: 'INTERNAL_ERROR' },
        });
      }
      return {
        ...health,
        riskFactors: health.riskFactors.map((f) => ({
          factor: f.factor,
          weight: f.weight,
          days: f.days ?? null,
          ratio: f.ratio ?? null,
          progressGap: f.progressGap ?? null,
          completed: f.completed ?? null,
          total: f.total ?? null,
        })),
      };
    },

    acknowledgeJourneyAlert: async (_: unknown, args: { alertId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      const alert = await journeyHealthService.acknowledgeAlert(args.alertId, userId);
      if (!alert) {
        throw new GraphQLError('Alert not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return alert;
    },

    dismissJourneyAlert: async (_: unknown, args: { alertId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await journeyHealthService.dismissAlert(args.alertId, userId);
      return true;
    },

    generateJourneyRecommendations: async (_: unknown, args: { journeyId: string }, context: Context) => {
      requireAuth(context);
      const recommendations = await journeyHealthService.generateRecommendations(args.journeyId);
      return recommendations;
    },

    markRecommendationViewed: async (_: unknown, args: { recommendationId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await journeyHealthService.markRecommendationViewed(args.recommendationId, userId);
      return true;
    },

    markRecommendationActioned: async (_: unknown, args: { recommendationId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await journeyHealthService.markRecommendationActioned(args.recommendationId, userId);
      return true;
    },

    provideRecommendationFeedback: async (
      _: unknown,
      args: { recommendationId: string; wasHelpful: boolean; feedbackText?: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      await journeyHealthService.provideFeedback(
        args.recommendationId,
        userId,
        args.wasHelpful,
        args.feedbackText
      );
      return true;
    },

    recalculateAllJourneyHealth: async (_: unknown, __: unknown, context: Context) => {
      const { isAdmin } = requireAuth(context);
      if (!isAdmin) {
        throw new GraphQLError('Admin access required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      const result = await journeyHealthService.recalculateAllHealthScores();
      return result;
    },

    // Career Readiness Mutations
    createCareerGoal: async (
      _: unknown,
      args: { input: { standardId: string; targetDate?: string; priority?: string; agencyName?: string; notes?: string } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { standardId, targetDate, priority, agencyName, notes } = args.input;

      try {
        const goal = await careerService.createCareerGoal(userId, {
          ptTestId: standardId,
          targetDate,
          priority: (priority as 'primary' | 'secondary') || 'primary',
          agencyName,
          notes,
        });

        const readiness = await careerService.getReadiness(userId, goal.id);
        const standard = await careerService.getCareerStandard(goal.ptTestId);

        // Calculate days remaining if target date exists
        let daysRemaining = null;
        if (goal.targetDate) {
          const targetDateObj = new Date(goal.targetDate);
          const now = new Date();
          daysRemaining = Math.ceil((targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: goal.id,
          standardId: goal.ptTestId,
          standard: standard
            ? {
                id: standard.id,
                name: standard.name,
                fullName: standard.name,
                agency: standard.institution,
                category: standard.category,
                description: standard.description,
                officialUrl: null,
                scoringType: standard.scoringMethod,
                recertificationPeriodMonths: standard.recertificationMonths,
                events: (standard.components as Array<{ id: string; name: string; description?: string }>).map(
                  (c, idx) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description || null,
                    metricType: null,
                    metricUnit: null,
                    direction: 'higher',
                    passingThreshold: null,
                    exerciseMappings: standard.exerciseMappings[c.id] || [],
                    tips: standard.tips.filter((t) => t.event === c.id).map((t) => t.tip),
                    orderIndex: idx,
                  })
                ),
                eventCount: (standard.components as Array<unknown>).length,
                icon: standard.icon,
                maxScore: standard.maxScore,
                passingScore: standard.passingScore,
              }
            : null,
          targetDate: goal.targetDate,
          priority: goal.priority,
          status: goal.status,
          agencyName: goal.agencyName,
          notes: goal.notes,
          daysRemaining,
          readiness: {
            score: readiness.readinessScore,
            status: readiness.status,
            trend: null,
            trendDelta: null,
            eventBreakdown: [],
            weakEvents: readiness.weakEvents,
            lastAssessmentAt: readiness.lastAssessmentAt,
            eventsPassed: readiness.eventsPassed,
            eventsTotal: readiness.eventsTotal,
          },
          createdAt: new Date(goal.createdAt),
          updatedAt: new Date(goal.updatedAt),
        };
      } catch (err) {
        const error = err as Error;
        throw new GraphQLError(error.message || 'Failed to create career goal', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    },

    updateCareerGoal: async (
      _: unknown,
      args: {
        goalId: string;
        input: { targetDate?: string; priority?: string; status?: string; agencyName?: string; notes?: string };
      },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { goalId, input } = args;

      const goal = await careerService.updateCareerGoal(userId, goalId, {
        targetDate: input.targetDate,
        priority: input.priority as 'primary' | 'secondary' | undefined,
        status: input.status as 'active' | 'achieved' | 'abandoned' | undefined,
        agencyName: input.agencyName,
        notes: input.notes,
      });

      if (!goal) {
        return null;
      }

      const readiness = await careerService.getReadiness(userId, goal.id);
      const standard = await careerService.getCareerStandard(goal.ptTestId);

      // Calculate days remaining if target date exists
      let daysRemaining = null;
      if (goal.targetDate) {
        const targetDateObj = new Date(goal.targetDate);
        const now = new Date();
        daysRemaining = Math.ceil((targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: goal.id,
        standardId: goal.ptTestId,
        standard: standard
          ? {
              id: standard.id,
              name: standard.name,
              fullName: standard.name,
              agency: standard.institution,
              category: standard.category,
              description: standard.description,
              officialUrl: null,
              scoringType: standard.scoringMethod,
              recertificationPeriodMonths: standard.recertificationMonths,
              events: (standard.components as Array<{ id: string; name: string; description?: string }>).map(
                (c, idx) => ({
                  id: c.id,
                  name: c.name,
                  description: c.description || null,
                  metricType: null,
                  metricUnit: null,
                  direction: 'higher',
                  passingThreshold: null,
                  exerciseMappings: standard.exerciseMappings[c.id] || [],
                  tips: standard.tips.filter((t) => t.event === c.id).map((t) => t.tip),
                  orderIndex: idx,
                })
              ),
              eventCount: (standard.components as Array<unknown>).length,
              icon: standard.icon,
              maxScore: standard.maxScore,
              passingScore: standard.passingScore,
            }
          : null,
        targetDate: goal.targetDate,
        priority: goal.priority,
        status: goal.status,
        agencyName: goal.agencyName,
        notes: goal.notes,
        daysRemaining,
        readiness: {
          score: readiness.readinessScore,
          status: readiness.status,
          trend: null,
          trendDelta: null,
          eventBreakdown: [],
          weakEvents: readiness.weakEvents,
          lastAssessmentAt: readiness.lastAssessmentAt,
          eventsPassed: readiness.eventsPassed,
          eventsTotal: readiness.eventsTotal,
        },
        createdAt: new Date(goal.createdAt),
        updatedAt: new Date(goal.updatedAt),
      };
    },

    deleteCareerGoal: async (_: unknown, args: { goalId: string }, context: Context) => {
      const { userId } = requireAuth(context);
      return careerService.deleteCareerGoal(userId, args.goalId);
    },

    logCareerAssessment: async (
      _: unknown,
      args: { input: { standardId: string; assessmentType: string; results: Record<string, unknown>; assessedAt?: string } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { standardId, assessmentType, results, assessedAt } = args.input;

      // Log the assessment to the user_pt_results table
      const assessmentId = `assessment_${crypto.randomBytes(12).toString('hex')}`;
      const testDate = assessedAt ? new Date(assessedAt) : new Date();

      // Calculate total score and passed status from results
      let totalScore = 0;
      let passed = true;
      const componentResults: Record<string, { value: number; passed?: boolean }> = {};

      for (const [key, value] of Object.entries(results)) {
        if (typeof value === 'object' && value !== null) {
          const resultObj = value as { value?: number; passed?: boolean };
          componentResults[key] = {
            value: resultObj.value || 0,
            passed: resultObj.passed,
          };
          if (typeof resultObj.value === 'number') {
            totalScore += resultObj.value;
          }
          if (resultObj.passed === false) {
            passed = false;
          }
        } else if (typeof value === 'number') {
          componentResults[key] = { value };
          totalScore += value;
        }
      }

      await query(
        `INSERT INTO user_pt_results (id, user_id, pt_test_id, test_date, component_results, total_score, passed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [assessmentId, userId, standardId, testDate.toISOString().split('T')[0], JSON.stringify(componentResults), totalScore, passed]
      );

      // Recalculate readiness for any goals associated with this standard
      const goals = await careerService.getUserCareerGoals(userId);
      for (const goal of goals) {
        if (goal.ptTestId === standardId) {
          await careerService.calculateReadiness(userId, goal.id);
        }
      }

      return {
        id: assessmentId,
        userId,
        standardId,
        assessmentType,
        results,
        totalScore,
        passed,
        assessedAt: testDate,
        createdAt: new Date(),
      };
    },

    // ============================================
    // MISSING MUTATION RESOLVERS - Added 2026-01-19
    // ============================================

    // Messaging System
    createConversation: async (_: unknown, args: { participantIds: string[]; type?: string; name?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Create unique conversation ID
      const conversationId = `conv_${crypto.randomBytes(12).toString('hex')}`;
      const convType = args.type || (args.participantIds.length === 1 ? 'direct' : 'group');

      // Check for existing 1:1 conversation
      if (convType === 'direct' && args.participantIds.length === 1) {
        const existing = await queryOne<{ id: string }>(`
          SELECT c.id FROM conversations c
          JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
          JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
          WHERE c.type = 'direct'
        `, [userId, args.participantIds[0]]);

        if (existing) {
          const conv = await queryOne<any>('SELECT * FROM conversations WHERE id = $1', [existing.id]);
          return { id: conv.id, type: conv.type, name: conv.name, createdAt: conv.created_at };
        }
      }

      // Create new conversation
      await query(
        `INSERT INTO conversations (id, type, name, created_by) VALUES ($1, $2, $3, $4)`,
        [conversationId, convType, args.name || null, userId]
      );

      // Add participants
      const allParticipants = [userId, ...args.participantIds];
      for (const participantId of allParticipants) {
        await query(
          `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
          [conversationId, participantId]
        );
      }

      return { id: conversationId, type: convType, name: args.name || null, createdAt: new Date() };
    },

    sendMessage: async (_: unknown, args: { conversationId: string; content: string; replyToId?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Verify user is participant
      const participant = await queryOne<{ id: string }>(
        `SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [args.conversationId, userId]
      );
      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const messageId = `msg_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO messages (id, conversation_id, sender_id, content, reply_to_id) VALUES ($1, $2, $3, $4, $5)`,
        [messageId, args.conversationId, userId, args.content, args.replyToId || null]
      );

      // Update conversation last_message_at
      await query(
        `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
        [args.conversationId]
      );

      const sender = await queryOne<{ username: string; avatar_url: string }>(
        'SELECT username, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      // Get reply info if replying
      let replyTo = null;
      if (args.replyToId) {
        const replyMsg = await queryOne<{ id: string; content: string; sender_id: string }>(
          'SELECT id, content, sender_id FROM messages WHERE id = $1',
          [args.replyToId]
        );
        if (replyMsg) {
          const replySender = await queryOne<{ username: string }>(
            'SELECT username FROM users WHERE id = $1',
            [replyMsg.sender_id]
          );
          replyTo = {
            id: replyMsg.id,
            content: replyMsg.content,
            senderName: replySender?.username || 'Unknown',
          };
        }
      }

      return {
        id: messageId,
        conversationId: args.conversationId,
        senderId: userId,
        sender: { id: userId, username: sender?.username, avatar: sender?.avatar_url },
        content: args.content,
        replyTo,
        createdAt: new Date(),
      };
    },

    markConversationRead: async (_: unknown, args: { conversationId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `UPDATE messages SET read_at = NOW()
         WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
        [args.conversationId, userId]
      );

      await query(
        `UPDATE conversation_participants SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [args.conversationId, userId]
      );

      return { success: true };
    },

    deleteMessage: async (_: unknown, args: { messageId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ sender_id: string }>(
        'SELECT sender_id FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (message.sender_id !== userId) {
        throw new GraphQLError('Can only delete your own messages', { extensions: { code: 'FORBIDDEN' } });
      }

      await query('DELETE FROM messages WHERE id = $1', [args.messageId]);

      return { success: true };
    },

    editMessage: async (_: unknown, args: { messageId: string; content: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ sender_id: string; conversation_id: string }>(
        'SELECT sender_id, conversation_id FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (message.sender_id !== userId) {
        throw new GraphQLError('Can only edit your own messages', { extensions: { code: 'FORBIDDEN' } });
      }

      await query(
        'UPDATE messages SET content = $1, edited_at = NOW() WHERE id = $2',
        [args.content, args.messageId]
      );

      return {
        id: args.messageId,
        conversationId: message.conversation_id,
        content: args.content,
        editedAt: new Date(),
      };
    },

    pinMessage: async (_: unknown, args: { messageId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ id: string; conversation_id: string; content: string }>(
        'SELECT id, conversation_id, content FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Verify user is participant
      const participant = await queryOne<{ id: string }>(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [message.conversation_id, userId]
      );

      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', { extensions: { code: 'FORBIDDEN' } });
      }

      await query(
        'UPDATE messages SET pinned = true, pinned_at = NOW(), pinned_by = $1 WHERE id = $2',
        [userId, args.messageId]
      );

      return {
        id: args.messageId,
        conversationId: message.conversation_id,
        content: message.content,
        pinnedAt: new Date(),
        pinnedBy: userId,
      };
    },

    unpinMessage: async (_: unknown, args: { messageId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ conversation_id: string }>(
        'SELECT conversation_id FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Verify user is participant
      const participant = await queryOne<{ id: string }>(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [message.conversation_id, userId]
      );

      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', { extensions: { code: 'FORBIDDEN' } });
      }

      await query(
        'UPDATE messages SET pinned = false, pinned_at = NULL, pinned_by = NULL WHERE id = $1',
        [args.messageId]
      );

      return true;
    },

    addReaction: async (_: unknown, args: { messageId: string; emoji: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ id: string; conversation_id: string; reactions: any }>(
        'SELECT id, conversation_id, reactions FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Verify user is participant
      const participant = await queryOne<{ id: string }>(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [message.conversation_id, userId]
      );

      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', { extensions: { code: 'FORBIDDEN' } });
      }

      // Update reactions JSONB
      const reactions = message.reactions || {};
      if (!reactions[args.emoji]) {
        reactions[args.emoji] = [];
      }
      if (!reactions[args.emoji].includes(userId)) {
        reactions[args.emoji].push(userId);
      }

      await query(
        'UPDATE messages SET reactions = $1 WHERE id = $2',
        [JSON.stringify(reactions), args.messageId]
      );

      return {
        messageId: args.messageId,
        emoji: args.emoji,
        count: reactions[args.emoji].length,
        users: reactions[args.emoji],
      };
    },

    removeReaction: async (_: unknown, args: { messageId: string; emoji: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ id: string; conversation_id: string; reactions: any }>(
        'SELECT id, conversation_id, reactions FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      // Update reactions JSONB
      const reactions = message.reactions || {};
      if (reactions[args.emoji]) {
        reactions[args.emoji] = reactions[args.emoji].filter((id: string) => id !== userId);
        if (reactions[args.emoji].length === 0) {
          delete reactions[args.emoji];
        }
      }

      await query(
        'UPDATE messages SET reactions = $1 WHERE id = $2',
        [JSON.stringify(reactions), args.messageId]
      );

      return true;
    },

    setTypingStatus: async (_: unknown, args: { conversationId: string; isTyping: boolean }, context: Context) => {
      const { userId } = requireAuth(context);
      const { setTypingStatus } = await import('../modules/messaging/messaging.service');
      await setTypingStatus(args.conversationId, userId, args.isTyping);
      return true;
    },

    starConversation: async (_: unknown, args: { conversationId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        'UPDATE conversation_participants SET starred = true WHERE conversation_id = $1 AND user_id = $2',
        [args.conversationId, userId]
      );

      return true;
    },

    unstarConversation: async (_: unknown, args: { conversationId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        'UPDATE conversation_participants SET starred = false WHERE conversation_id = $1 AND user_id = $2',
        [args.conversationId, userId]
      );

      return true;
    },

    archiveConversation: async (_: unknown, args: { conversationId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        'UPDATE conversation_participants SET archived_at = NOW() WHERE conversation_id = $1 AND user_id = $2',
        [args.conversationId, userId]
      );

      return true;
    },

    unarchiveConversation: async (_: unknown, args: { conversationId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        'UPDATE conversation_participants SET archived_at = NULL WHERE conversation_id = $1 AND user_id = $2',
        [args.conversationId, userId]
      );

      return true;
    },

    forwardMessage: async (_: unknown, args: { messageId: string; toConversationIds: string[]; addComment?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const message = await queryOne<{ content: string }>(
        'SELECT content FROM messages WHERE id = $1',
        [args.messageId]
      );

      if (!message) {
        throw new GraphQLError('Message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const results = [];
      for (const convId of args.toConversationIds) {
        // Verify user is participant in target conversation
        const participant = await queryOne<{ id: string }>(
          'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [convId, userId]
        );

        if (!participant) {
          continue; // Skip conversations user is not part of
        }

        const newMessageId = `msg_${crypto.randomBytes(12).toString('hex')}`;
        const forwardedContent = args.addComment
          ? `${args.addComment}\n\n[Forwarded]: ${message.content}`
          : `[Forwarded]: ${message.content}`;

        await query(
          `INSERT INTO messages (id, conversation_id, sender_id, content, forwarded_from) VALUES ($1, $2, $3, $4, $5)`,
          [newMessageId, convId, userId, forwardedContent, args.messageId]
        );

        await query(
          'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
          [convId]
        );

        results.push({
          id: newMessageId,
          conversationId: convId,
          content: forwardedContent,
          createdAt: new Date(),
        });
      }

      return results;
    },

    setDisappearingMessages: async (_: unknown, args: { conversationId: string; ttl?: number }, context: Context) => {
      const { userId } = requireAuth(context);

      // Verify user is participant
      const participant = await queryOne<{ id: string }>(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [args.conversationId, userId]
      );

      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', { extensions: { code: 'FORBIDDEN' } });
      }

      await query(
        'UPDATE conversations SET disappearing_ttl = $1 WHERE id = $2',
        [args.ttl || null, args.conversationId]
      );

      return true;
    },

    scheduleMessage: async (_: unknown, args: { conversationId: string; content: string; scheduledFor: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Verify user is participant
      const participant = await queryOne<{ id: string }>(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [args.conversationId, userId]
      );

      if (!participant) {
        throw new GraphQLError('Not a participant in this conversation', { extensions: { code: 'FORBIDDEN' } });
      }

      const scheduledId = `sched_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO scheduled_messages (id, conversation_id, sender_id, content, scheduled_for, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [scheduledId, args.conversationId, userId, args.content, args.scheduledFor]
      );

      return {
        id: scheduledId,
        conversationId: args.conversationId,
        content: args.content,
        scheduledFor: args.scheduledFor,
        status: 'pending',
        createdAt: new Date(),
      };
    },

    cancelScheduledMessage: async (_: unknown, args: { scheduledId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const scheduled = await queryOne<{ sender_id: string }>(
        'SELECT sender_id FROM scheduled_messages WHERE id = $1',
        [args.scheduledId]
      );

      if (!scheduled) {
        throw new GraphQLError('Scheduled message not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (scheduled.sender_id !== userId) {
        throw new GraphQLError('Can only cancel your own scheduled messages', { extensions: { code: 'FORBIDDEN' } });
      }

      await query(
        'UPDATE scheduled_messages SET status = $1 WHERE id = $2',
        ['cancelled', args.scheduledId]
      );

      return true;
    },

    createMessageTemplate: async (_: unknown, args: { name: string; content: string; shortcut?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const templateId = `tmpl_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO message_templates (id, user_id, name, content, shortcut)
         VALUES ($1, $2, $3, $4, $5)`,
        [templateId, userId, args.name, args.content, args.shortcut || null]
      );

      return {
        id: templateId,
        name: args.name,
        content: args.content,
        shortcut: args.shortcut || null,
        createdAt: new Date(),
      };
    },

    blockUser: async (_: unknown, args: { userId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      if (args.userId === userId) {
        throw new GraphQLError('Cannot block yourself', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await query(
        `INSERT INTO blocked_users (blocker_id, blocked_id)
         VALUES ($1, $2)
         ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
        [userId, args.userId]
      );

      return true;
    },

    unblockUser: async (_: unknown, args: { userId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        'DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [userId, args.userId]
      );

      return true;
    },

    // Hangout System
    createHangout: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { title, description, type, latitude, longitude, address, startTime, endTime, maxParticipants } = args.input;

      const hangoutId = `hangout_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO hangouts (id, host_id, title, description, type, latitude, longitude, address, start_time, end_time, max_participants, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')`,
        [hangoutId, userId, title, description, type, latitude, longitude, address, startTime, endTime, maxParticipants || 10]
      );

      // Host automatically joins
      await query(
        `INSERT INTO hangout_members (hangout_id, user_id, role) VALUES ($1, $2, 'host')`,
        [hangoutId, userId]
      );

      return {
        id: hangoutId,
        hostId: userId,
        title,
        description,
        type,
        latitude,
        longitude,
        address,
        startTime,
        endTime,
        maxParticipants: maxParticipants || 10,
        status: 'active',
        createdAt: new Date(),
      };
    },

    joinHangout: async (_: unknown, args: { hangoutId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const hangout = await queryOne<{ max_participants: number; status: string }>(
        'SELECT max_participants, status FROM hangouts WHERE id = $1',
        [args.hangoutId]
      );

      if (!hangout) {
        throw new GraphQLError('Hangout not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (hangout.status !== 'active') {
        throw new GraphQLError('Hangout is no longer active', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const memberCount = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM hangout_members WHERE hangout_id = $1',
        [args.hangoutId]
      );

      if ((memberCount?.count || 0) >= hangout.max_participants) {
        throw new GraphQLError('Hangout is full', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Check if already a member
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM hangout_members WHERE hangout_id = $1 AND user_id = $2',
        [args.hangoutId, userId]
      );

      if (existing) {
        throw new GraphQLError('Already a member of this hangout', { extensions: { code: 'CONFLICT' } });
      }

      await query(
        `INSERT INTO hangout_members (hangout_id, user_id, role) VALUES ($1, $2, 'member')`,
        [args.hangoutId, userId]
      );

      return { success: true, hangoutId: args.hangoutId };
    },

    leaveHangout: async (_: unknown, args: { hangoutId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const member = await queryOne<{ role: string }>(
        'SELECT role FROM hangout_members WHERE hangout_id = $1 AND user_id = $2',
        [args.hangoutId, userId]
      );

      if (!member) {
        throw new GraphQLError('Not a member of this hangout', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      if (member.role === 'host') {
        // If host leaves, cancel the hangout
        await query('UPDATE hangouts SET status = $1 WHERE id = $2', ['cancelled', args.hangoutId]);
      }

      await query(
        'DELETE FROM hangout_members WHERE hangout_id = $1 AND user_id = $2',
        [args.hangoutId, userId]
      );

      return { success: true };
    },

    createHangoutPost: async (_: unknown, args: { hangoutId: string; content: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Verify membership
      const member = await queryOne<{ id: string }>(
        'SELECT id FROM hangout_members WHERE hangout_id = $1 AND user_id = $2',
        [args.hangoutId, userId]
      );

      if (!member) {
        throw new GraphQLError('Must be a member to post', { extensions: { code: 'FORBIDDEN' } });
      }

      const postId = `hpost_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO hangout_posts (id, hangout_id, user_id, content) VALUES ($1, $2, $3, $4)`,
        [postId, args.hangoutId, userId, args.content]
      );

      return {
        id: postId,
        hangoutId: args.hangoutId,
        userId,
        content: args.content,
        createdAt: new Date(),
      };
    },

    // Competitions
    createCompetition: async (_: unknown, args: { input: {
      name: string;
      description?: string;
      type: string;
      goalTu?: number;
      startDate?: Date;
      endDate?: Date;
      maxParticipants?: number;
      entryFee?: number;
      isPublic?: boolean;
    } }, context: Context) => {
      const { userId } = requireAuth(context);
      const { name, description, type, startDate, endDate, maxParticipants, entryFee, isPublic } = args.input;

      // Default dates if not provided
      const start = startDate || new Date();
      const end = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week

      const compId = `comp_${crypto.randomBytes(12).toString('hex')}`;

      await query(`
        INSERT INTO competitions (id, name, description, creator_id, type, status, start_date, end_date, max_participants, entry_fee, is_public)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10)
      `, [compId, name, description || null, userId, type || 'total_tu', start, end, maxParticipants || null, entryFee || null, isPublic !== false]);

      // Auto-join the creator
      await query(`
        INSERT INTO competition_participants (competition_id, user_id)
        VALUES ($1, $2)
      `, [compId, userId]);

      return {
        id: compId,
        name,
        description,
        creatorId: userId,
        type: type || 'total_tu',
        status: 'active',
        startDate: start,
        endDate: end,
        maxParticipants,
        entryFee,
        prizePool: null,
        rules: null,
        isPublic: isPublic !== false,
        participantCount: 1,
        goalTu: args.input.goalTu || 100,
        leaderboard: [],
        hasJoined: true,
        createdAt: new Date(),
      };
    },

    joinCompetition: async (_: unknown, args: { competitionId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const competition = await queryOne<{ id: string; max_participants: number | null; status: string }>(`
        SELECT id, max_participants, status FROM competitions WHERE id = $1
      `, [args.competitionId]);

      if (!competition) {
        throw new GraphQLError('Competition not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (competition.status !== 'active') {
        throw new GraphQLError('Competition is not active', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Check if already joined
      const existing = await queryOne<{ competition_id: string }>(`
        SELECT competition_id FROM competition_participants
        WHERE competition_id = $1 AND user_id = $2
      `, [args.competitionId, userId]);

      if (existing) {
        throw new GraphQLError('Already joined this competition', { extensions: { code: 'CONFLICT' } });
      }

      // Check max participants
      if (competition.max_participants) {
        const count = await queryOne<{ count: string }>(`
          SELECT COUNT(*) as count FROM competition_participants WHERE competition_id = $1
        `, [args.competitionId]);

        if (Number(count?.count || 0) >= competition.max_participants) {
          throw new GraphQLError('Competition is full', { extensions: { code: 'BAD_USER_INPUT' } });
        }
      }

      await query(`
        INSERT INTO competition_participants (competition_id, user_id)
        VALUES ($1, $2)
      `, [args.competitionId, userId]);

      return {
        success: true,
        entry: {
          id: `${args.competitionId}_${userId}`,
          competitionId: args.competitionId,
          userId,
          score: 0,
          rank: null,
          joinedAt: new Date(),
        },
        message: 'Joined competition successfully',
      };
    },

    // Goal System
    updateGoal: async (_: unknown, args: { id: string; input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { target, current, deadline, status, isPrimary, description } = args.input;

      const goal = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM user_goals WHERE id = $1',
        [args.id]
      );

      if (!goal) {
        throw new GraphQLError('Goal not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (goal.user_id !== userId) {
        throw new GraphQLError('Cannot update another user\'s goal', { extensions: { code: 'FORBIDDEN' } });
      }

      // If setting as primary, unset any existing primary goal
      if (isPrimary) {
        await query(
          `UPDATE user_goals SET is_primary = FALSE WHERE user_id = $1 AND is_primary = TRUE AND id != $2`,
          [userId, args.id]
        );
      }

      await query(
        `UPDATE user_goals SET
          target_value = COALESCE($2, target_value),
          current_value = COALESCE($3, current_value),
          target_date = COALESCE($4, target_date),
          status = COALESCE($5, status),
          is_primary = COALESCE($6, is_primary),
          notes = COALESCE($7, notes),
          updated_at = NOW()
         WHERE id = $1`,
        [args.id, target, current, deadline, status, isPrimary, description]
      );

      const updated = await queryOne<any>('SELECT * FROM user_goals WHERE id = $1', [args.id]);

      return {
        id: updated.id,
        userId: updated.user_id,
        type: updated.goal_type,
        title: updated.goal_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Goal',
        description: updated.notes || '',
        target: updated.target_value ? parseFloat(updated.target_value) : null,
        current: updated.current_value ? parseFloat(updated.current_value) : null,
        unit: updated.target_unit,
        deadline: updated.target_date,
        status: updated.status,
        isPrimary: updated.is_primary,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };
    },

    recordGoalProgress: async (_: unknown, args: { goalId: string; value: number; note?: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const goal = await queryOne<{ user_id: string; current_value: string | null; target_value: string | null }>(
        'SELECT user_id, current_value, target_value FROM user_goals WHERE id = $1',
        [args.goalId]
      );

      if (!goal) {
        throw new GraphQLError('Goal not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (goal.user_id !== userId) {
        throw new GraphQLError('Cannot update another user\'s goal', { extensions: { code: 'FORBIDDEN' } });
      }

      const currentValue = goal.current_value ? parseFloat(goal.current_value) : 0;
      const targetValue = goal.target_value ? parseFloat(goal.target_value) : 0;
      const newValue = currentValue + args.value;

      await query(
        `UPDATE user_goals SET current_value = $2, updated_at = NOW() WHERE id = $1`,
        [args.goalId, newValue]
      );

      // Log progress entry
      await query(
        `INSERT INTO goal_progress (goal_id, user_id, date, value, notes) VALUES ($1, $2, CURRENT_DATE, $3, $4)
         ON CONFLICT (goal_id, date) DO UPDATE SET value = goal_progress.value + EXCLUDED.value, notes = COALESCE(EXCLUDED.notes, goal_progress.notes)`,
        [args.goalId, userId, args.value, args.note]
      );

      // Check if goal is completed
      const completed = targetValue > 0 && newValue >= targetValue;
      if (completed) {
        await query(`UPDATE user_goals SET status = 'completed', completed_at = NOW() WHERE id = $1`, [args.goalId]);
      }

      return {
        goalId: args.goalId,
        newValue,
        completed,
        progress: targetValue > 0 ? Math.min(100, Math.round((newValue / targetValue) * 100)) : 0,
      };
    },

    // Issue/Feedback System
    createIssue: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { title, description, type, priority } = args.input;

      const issueId = `issue_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO issues (id, author_id, title, description, type, priority, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
        [issueId, userId, title, description, type || 'bug', priority || 'medium']
      );

      return {
        id: issueId,
        authorId: userId,
        title,
        description,
        type: type || 'bug',
        priority: priority || 'medium',
        status: 'open',
        createdAt: new Date(),
      };
    },

    voteOnIssue: async (_: unknown, args: { issueId: string; vote: string }, context: Context) => {
      const { userId } = requireAuth(context);

      // Check if already voted
      const existing = await queryOne<{ vote: string }>(
        'SELECT vote FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
        [args.issueId, userId]
      );

      if (existing) {
        if (existing.vote === args.vote) {
          // Remove vote
          await query('DELETE FROM issue_votes WHERE issue_id = $1 AND user_id = $2', [args.issueId, userId]);
        } else {
          // Change vote
          await query('UPDATE issue_votes SET vote = $3 WHERE issue_id = $1 AND user_id = $2', [args.issueId, userId, args.vote]);
        }
      } else {
        // New vote
        await query(
          'INSERT INTO issue_votes (issue_id, user_id, vote) VALUES ($1, $2, $3)',
          [args.issueId, userId, args.vote]
        );
      }

      const counts = await queryOne<{ up: number; down: number }>(`
        SELECT
          COUNT(*) FILTER (WHERE vote = 'up') as up,
          COUNT(*) FILTER (WHERE vote = 'down') as down
        FROM issue_votes WHERE issue_id = $1
      `, [args.issueId]);

      return {
        issueId: args.issueId,
        upvotes: Number(counts?.up) || 0,
        downvotes: Number(counts?.down) || 0,
      };
    },

    // Equipment Management
    addHomeEquipment: async (_: unknown, args: { equipmentId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `INSERT INTO user_equipment (user_id, equipment_id) VALUES ($1, $2)
         ON CONFLICT (user_id, equipment_id) DO NOTHING`,
        [userId, args.equipmentId]
      );

      return { success: true, equipmentId: args.equipmentId };
    },

    removeHomeEquipment: async (_: unknown, args: { equipmentId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        'DELETE FROM user_equipment WHERE user_id = $1 AND equipment_id = $2',
        [userId, args.equipmentId]
      );

      return { success: true, equipmentId: args.equipmentId };
    },

    // Limitations/Injuries
    createLimitation: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { bodyPart, description, severity, startDate, endDate } = args.input;

      const limitationId = `lim_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO user_limitations (id, user_id, body_part, description, severity, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
        [limitationId, userId, bodyPart, description, severity || 'moderate', startDate || new Date(), endDate]
      );

      return {
        id: limitationId,
        userId,
        bodyPart,
        description,
        severity: severity || 'moderate',
        startDate: startDate || new Date(),
        endDate,
        status: 'active',
        createdAt: new Date(),
      };
    },

    updateLimitation: async (_: unknown, args: { limitationId: string; input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { description, severity, endDate, status } = args.input;

      const limitation = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM user_limitations WHERE id = $1',
        [args.limitationId]
      );

      if (!limitation || limitation.user_id !== userId) {
        throw new GraphQLError('Limitation not found or access denied', { extensions: { code: 'NOT_FOUND' } });
      }

      await query(
        `UPDATE user_limitations SET
          description = COALESCE($2, description),
          severity = COALESCE($3, severity),
          end_date = COALESCE($4, end_date),
          status = COALESCE($5, status),
          updated_at = NOW()
         WHERE id = $1`,
        [args.limitationId, description, severity, endDate, status]
      );

      const updated = await queryOne<any>('SELECT * FROM user_limitations WHERE id = $1', [args.limitationId]);

      return {
        id: updated.id,
        userId: updated.user_id,
        bodyPart: updated.body_part,
        description: updated.description,
        severity: updated.severity,
        startDate: updated.start_date,
        endDate: updated.end_date,
        status: updated.status,
        updatedAt: updated.updated_at,
      };
    },

    deleteLimitation: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const limitation = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM user_limitations WHERE id = $1',
        [args.id]
      );

      if (!limitation || limitation.user_id !== userId) {
        throw new GraphQLError('Limitation not found or access denied', { extensions: { code: 'NOT_FOUND' } });
      }

      await query('DELETE FROM user_limitations WHERE id = $1', [args.id]);

      return true;
    },

    // Prescription Engine
    generatePrescription: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);

      const prescription = await prescriptionEngine.prescribe({
        userContext: {
          userId,
          ...args.input,
        },
        ...args.input,
      });

      return prescription;
    },

    // Preview Workout (TU/XP calculation before save)
    previewWorkout: async (_: unknown, args: { exercises: any[] }, context: Context) => {
      requireAuth(context);

      const { totalTU, muscleActivations } = await calculateTU(args.exercises);

      // Estimate XP (simplified - 10 XP per TU)
      const estimatedXP = Math.round(totalTU * 10);

      return {
        totalTU,
        estimatedXP,
        muscleActivations: Object.entries(muscleActivations).map(([muscleId, activation]) => ({
          muscleId,
          activation: activation as number,
        })),
      };
    },

    // Update Privacy Settings
    updatePrivacy: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `INSERT INTO user_privacy_settings (user_id, profile_visibility, workout_visibility, stats_visibility, allow_messages, show_on_leaderboards, show_online_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           profile_visibility = COALESCE(EXCLUDED.profile_visibility, user_privacy_settings.profile_visibility),
           workout_visibility = COALESCE(EXCLUDED.workout_visibility, user_privacy_settings.workout_visibility),
           stats_visibility = COALESCE(EXCLUDED.stats_visibility, user_privacy_settings.stats_visibility),
           allow_messages = COALESCE(EXCLUDED.allow_messages, user_privacy_settings.allow_messages),
           show_on_leaderboards = COALESCE(EXCLUDED.show_on_leaderboards, user_privacy_settings.show_on_leaderboards),
           show_online_status = COALESCE(EXCLUDED.show_online_status, user_privacy_settings.show_online_status),
           updated_at = NOW()`,
        [
          userId,
          args.input.profileVisibility,
          args.input.workoutVisibility,
          args.input.statsVisibility,
          args.input.allowMessages,
          args.input.showOnLeaderboards,
          args.input.showOnlineStatus,
        ]
      );

      const settings = await queryOne<any>('SELECT * FROM user_privacy_settings WHERE user_id = $1', [userId]);

      return {
        profileVisibility: settings?.profile_visibility || 'public',
        workoutVisibility: settings?.workout_visibility || 'followers',
        statsVisibility: settings?.stats_visibility || 'public',
        allowMessages: settings?.allow_messages ?? true,
        showOnLeaderboards: settings?.show_on_leaderboards ?? true,
        showOnlineStatus: settings?.show_online_status ?? true,
      };
    },

    // ============================================
    // ADDITIONAL MISSING MUTATIONS - Added 2026-01-19 (batch 2)
    // ============================================

    // Goal Milestones
    createGoalMilestone: async (
      _: unknown,
      args: { goalId: string; input: { title: string; target: number } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { goalId, input } = args;

      // Verify goal ownership
      const goal = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM user_goals WHERE id = $1',
        [goalId]
      );

      if (!goal || goal.user_id !== userId) {
        throw new GraphQLError('Goal not found or access denied', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const milestoneId = `milestone_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO goal_milestones (id, goal_id, user_id, title, target_value, is_achieved)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [milestoneId, goalId, userId, input.title, input.target]
      );

      return {
        id: milestoneId,
        goalId,
        title: input.title,
        target: input.target,
        achieved: false,
        achievedAt: null,
      };
    },

    // Update Home Equipment (bulk update)
    updateHomeEquipment: async (_: unknown, args: { equipmentIds: string[] }, context: Context) => {
      const { userId } = requireAuth(context);

      // Remove all existing equipment
      await query('DELETE FROM user_equipment WHERE user_id = $1', [userId]);

      // Add new equipment
      const results = [];
      for (const equipmentId of args.equipmentIds) {
        await query(
          `INSERT INTO user_equipment (user_id, equipment_id) VALUES ($1, $2)
           ON CONFLICT (user_id, equipment_id) DO NOTHING`,
          [userId, equipmentId]
        );

        const equipment = await queryOne<{ id: string; name: string; category: string }>(
          'SELECT id, name, category FROM equipment WHERE id = $1',
          [equipmentId]
        );

        if (equipment) {
          results.push({
            id: `ue_${crypto.randomBytes(12).toString('hex')}`,
            userId,
            equipmentId,
            equipment: {
              id: equipment.id,
              name: equipment.name,
              category: equipment.category,
            },
            addedAt: new Date(),
          });
        }
      }

      return results;
    },

    // Issues System - Subscribe to Issue
    subscribeToIssue: async (_: unknown, args: { issueId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const result = await issuesService.subscribe(args.issueId, userId);
      return result.subscribed;
    },

    // Issues System - Create Comment
    createIssueComment: async (
      _: unknown,
      args: { issueId: string; content: string },
      context: Context
    ) => {
      const { userId, isAdmin } = requireAuth(context);

      const comment = await issuesService.createComment(
        args.issueId,
        userId,
        args.content,
        undefined,
        isAdmin
      );

      return {
        id: comment.id,
        issueId: comment.issueId,
        authorId: comment.authorId,
        author: {
          id: comment.authorId,
          username: comment.authorUsername,
          displayName: comment.authorDisplayName,
          avatar: comment.authorAvatarUrl,
        },
        content: comment.content,
        isStaffReply: comment.isStaffReply,
        isSolution: comment.isSolution,
        createdAt: comment.createdAt,
      };
    },

    // Issues System - Mark Comment as Solution
    markCommentAsSolution: async (
      _: unknown,
      args: { issueId: string; commentId: string },
      context: Context
    ) => {
      const { userId, isAdmin } = requireAuth(context);

      // Check if user is author or admin
      const issue = await issuesService.getIssueById(args.issueId);
      if (!issue) {
        throw new GraphQLError('Issue not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (issue.authorId !== userId && !isAdmin) {
        throw new GraphQLError('Only issue author or admins can mark solutions', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      await issuesService.markCommentAsSolution(args.commentId, args.issueId, userId);

      return issuesService.getIssueById(args.issueId, userId);
    },

    // Issues System - Update Issue
    updateIssue: async (
      _: unknown,
      args: { id: string; input: { title?: string; description?: string; status?: string; priority?: string; labels?: string[] } },
      context: Context
    ) => {
      const { userId, isAdmin } = requireAuth(context);

      const updated = await issuesService.updateIssue(args.id, userId, {
        title: args.input.title,
        description: args.input.description,
        status: args.input.status !== undefined ? parseInt(args.input.status) : undefined,
        priority: args.input.priority !== undefined ? parseInt(args.input.priority) : undefined,
        labelIds: args.input.labels,
      }, isAdmin);

      return {
        id: updated.id,
        issueNumber: updated.issueNumber,
        title: updated.title,
        description: updated.description,
        type: updated.type,
        status: updated.status,
        priority: updated.priority,
        author: {
          id: updated.authorId,
          username: updated.authorUsername,
          displayName: updated.authorDisplayName,
          avatar: updated.authorAvatarUrl,
        },
        voteCount: updated.voteCount,
        commentCount: updated.commentCount,
        hasVoted: updated.hasVoted,
        isSubscribed: updated.isSubscribed,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    },

    // Issues System - Create Dev Update
    createUpdate: async (
      _: unknown,
      args: { input: { title: string; content: string; type: string } },
      context: Context
    ) => {
      const { userId, isAdmin } = requireAuth(context);

      if (!isAdmin) {
        throw new GraphQLError('Only admins can create updates', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const typeMap: Record<string, number> = {
        'UPDATE': 0, 'RELEASE': 1, 'ANNOUNCEMENT': 2, 'BUGFIX': 3, 'MAINTENANCE': 4
      };

      const update = await issuesService.createDevUpdate(userId, {
        title: args.input.title,
        content: args.input.content,
        type: typeMap[args.input.type] ?? 0,
        isPublished: true,
      });

      return {
        id: update.id,
        title: update.title,
        content: update.content,
        type: args.input.type,
        author: {
          id: update.authorId,
          username: update.authorUsername,
          displayName: update.authorDisplayName,
        },
        publishedAt: update.publishedAt,
        createdAt: update.createdAt,
      };
    },

    // Issues System - Create Roadmap Item
    createRoadmapItem: async (
      _: unknown,
      args: { input: { title: string; description: string; quarter?: string } },
      context: Context
    ) => {
      const { userId: _userId, isAdmin } = requireAuth(context);

      if (!isAdmin) {
        throw new GraphQLError('Only admins can create roadmap items', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const itemId = `roadmap_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO roadmap_items (id, title, description, quarter, status, progress, is_public)
         VALUES ($1, $2, $3, $4, 0, 0, true)`,
        [itemId, args.input.title, args.input.description, args.input.quarter]
      );

      return {
        id: itemId,
        title: args.input.title,
        description: args.input.description,
        quarter: args.input.quarter,
        status: 'PLANNED',
        progress: 0,
        voteCount: 0,
        hasVoted: false,
        createdAt: new Date(),
      };
    },

    // Issues System - Vote on Roadmap Item
    voteOnRoadmapItem: async (_: unknown, args: { itemId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const result = await issuesService.voteRoadmapItem(args.itemId, userId);

      const item = await queryOne<any>(
        'SELECT * FROM roadmap_items WHERE id = $1',
        [args.itemId]
      );

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        quarter: item.quarter,
        status: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED'][item.status],
        progress: item.progress,
        voteCount: result.voteCount,
        hasVoted: result.voted,
        createdAt: item.created_at,
      };
    },

    // Issues System - Admin Bulk Update
    adminBulkUpdateIssues: async (
      _: unknown,
      args: { issueIds: string[]; status: string },
      context: Context
    ) => {
      const { isAdmin } = requireAuth(context);

      if (!isAdmin) {
        throw new GraphQLError('Only admins can bulk update issues', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const statusNum = parseInt(args.status);
      await query(
        `UPDATE issues SET status = $1, updated_at = NOW() WHERE id = ANY($2)`,
        [statusNum, args.issueIds]
      );

      const issues = await queryAll<any>(
        `SELECT i.*, u.username as author_username, u.display_name as author_display_name
         FROM issues i
         LEFT JOIN users u ON i.author_id = u.id
         WHERE i.id = ANY($1)`,
        [args.issueIds]
      );

      return issues.map((i: any) => ({
        id: i.id,
        issueNumber: i.issue_number,
        title: i.title,
        description: i.description,
        type: i.type,
        status: i.status,
        priority: i.priority,
        author: {
          id: i.author_id,
          username: i.author_username,
          displayName: i.author_display_name,
        },
        voteCount: i.vote_count,
        commentCount: i.comment_count,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      }));
    },

    // Onboarding - Update Profile
    updateOnboardingProfile: async (
      _: unknown,
      args: { input: { displayName?: string; fitnessGoals?: string[]; experienceLevel?: string; preferredWorkoutTime?: string } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { input } = args;

      // Update user profile
      if (input.displayName) {
        await query('UPDATE users SET display_name = $1 WHERE id = $2', [input.displayName, userId]);
      }

      // Update onboarding data
      await query(
        `INSERT INTO user_onboarding (user_id, fitness_goals, experience_level, preferred_workout_time)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           fitness_goals = COALESCE(EXCLUDED.fitness_goals, user_onboarding.fitness_goals),
           experience_level = COALESCE(EXCLUDED.experience_level, user_onboarding.experience_level),
           preferred_workout_time = COALESCE(EXCLUDED.preferred_workout_time, user_onboarding.preferred_workout_time),
           updated_at = NOW()`,
        [userId, input.fitnessGoals, input.experienceLevel, input.preferredWorkoutTime]
      );

      const onboarding = await queryOne<any>(
        `SELECT u.display_name, o.*
         FROM users u
         LEFT JOIN user_onboarding o ON u.id = o.user_id
         WHERE u.id = $1`,
        [userId]
      );

      return {
        displayName: onboarding?.display_name,
        fitnessGoals: onboarding?.fitness_goals || [],
        experienceLevel: onboarding?.experience_level,
        preferredWorkoutTime: onboarding?.preferred_workout_time,
      };
    },

    // Onboarding - Set Home Equipment
    setHomeEquipmentOnboarding: async (
      _: unknown,
      args: { input: { type: string; kettlebellCount?: number; extras?: string[] } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { input } = args;

      // Store onboarding equipment preferences
      await query(
        `INSERT INTO user_onboarding (user_id, equipment_type, kettlebell_count, equipment_extras)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           equipment_type = EXCLUDED.equipment_type,
           kettlebell_count = EXCLUDED.kettlebell_count,
           equipment_extras = EXCLUDED.equipment_extras,
           updated_at = NOW()`,
        [userId, input.type, input.kettlebellCount || 0, input.extras || []]
      );

      return true;
    },

    // Onboarding - Complete
    completeOnboarding: async (_: unknown, _args: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `UPDATE user_onboarding SET completed = true, completed_at = NOW() WHERE user_id = $1`,
        [userId]
      );

      await query(
        `UPDATE users SET onboarding_completed = true WHERE id = $1`,
        [userId]
      );

      return {
        success: true,
        message: 'Onboarding completed successfully',
      };
    },

    // Onboarding - Skip
    skipOnboarding: async (_: unknown, _args: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `UPDATE users SET onboarding_completed = true, onboarding_skipped = true WHERE id = $1`,
        [userId]
      );

      return true;
    },

    // Stats - Recalculate
    recalculateStats: async (_: unknown, _args: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      const stats = await statsService.recalculateAllStats(userId);

      return {
        userId: stats.userId,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        strength: stats.strength,
        constitution: stats.constitution,
        dexterity: stats.dexterity,
        power: stats.power,
        endurance: stats.endurance,
        vitality: stats.vitality,
      };
    },

    // Stats - Update Extended Profile
    updateExtendedProfile: async (
      _: unknown,
      args: { input: { height?: number; weight?: number; age?: number; gender?: string; fitnessLevel?: string; goals?: string[]; preferredUnits?: string } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { input } = args;

      await statsService.updateExtendedProfile(userId, {
        gender: input.gender,
      });

      // Update user profile for other fields
      if (input.height || input.weight || input.age || input.fitnessLevel || input.goals) {
        await query(
          `UPDATE user_profiles SET
            height = COALESCE($2, height),
            weight = COALESCE($3, weight),
            age = COALESCE($4, age),
            fitness_level = COALESCE($5, fitness_level),
            goals = COALESCE($6, goals),
            preferred_units = COALESCE($7, preferred_units),
            updated_at = NOW()
           WHERE user_id = $1`,
          [userId, input.height, input.weight, input.age, input.fitnessLevel, input.goals, input.preferredUnits]
        );
      }

      const profile = await statsService.getExtendedProfile(userId);
      const userProfile = await queryOne<any>(
        'SELECT height, weight, age, fitness_level, goals, preferred_units FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      return {
        height: userProfile?.height,
        weight: userProfile?.weight,
        age: userProfile?.age,
        gender: profile.gender,
        fitnessLevel: userProfile?.fitness_level,
        goals: userProfile?.goals || [],
        preferredUnits: userProfile?.preferred_units || 'metric',
      };
    },

    // Community - Update Presence
    updatePresence: async (_: unknown, args: { status: string }, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `INSERT INTO user_presence (user_id, status, last_seen_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           status = EXCLUDED.status,
           last_seen_at = NOW()`,
        [userId, args.status]
      );

      return {
        userId,
        status: args.status,
        lastSeenAt: new Date(),
      };
    },

    // Milestones - Claim
    claimMilestone: async (_: unknown, args: { milestoneId: string }, context: Context) => {
      const { userId } = requireAuth(context);

      const milestone = await queryOne<{ id: string; reward_credits: number; claimed: boolean }>(
        'SELECT id, reward_credits, claimed FROM milestones WHERE id = $1 AND user_id = $2',
        [args.milestoneId, userId]
      );

      if (!milestone) {
        throw new GraphQLError('Milestone not found', { extensions: { code: 'NOT_FOUND' } });
      }

      if (milestone.claimed) {
        throw new GraphQLError('Milestone already claimed', { extensions: { code: 'CONFLICT' } });
      }

      await query(
        `UPDATE milestones SET claimed = true, claimed_at = NOW() WHERE id = $1`,
        [args.milestoneId]
      );

      // Award credits if any
      if (milestone.reward_credits) {
        await query(
          `UPDATE users SET credit_balance = credit_balance + $1 WHERE id = $2`,
          [milestone.reward_credits, userId]
        );
      }

      return {
        success: true,
        creditsEarned: milestone.reward_credits || 0,
      };
    },

    // Milestones - Update Progress
    updateMilestoneProgress: async (
      _: unknown,
      args: { milestoneId: string; progress: number },
      context: Context
    ) => {
      const { userId } = requireAuth(context);

      const milestone = await queryOne<{ id: string; target_value: number }>(
        'SELECT id, target_value FROM milestones WHERE id = $1 AND user_id = $2',
        [args.milestoneId, userId]
      );

      if (!milestone) {
        throw new GraphQLError('Milestone not found', { extensions: { code: 'NOT_FOUND' } });
      }

      const completed = args.progress >= milestone.target_value;

      await query(
        `UPDATE milestones SET current_value = $1, completed = $2, completed_at = $3 WHERE id = $4`,
        [args.progress, completed, completed ? new Date() : null, args.milestoneId]
      );

      const updated = await queryOne<any>(
        'SELECT * FROM milestones WHERE id = $1',
        [args.milestoneId]
      );

      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        type: updated.type,
        targetValue: updated.target_value,
        currentValue: updated.current_value,
        completed: updated.completed,
        completedAt: updated.completed_at,
        claimed: updated.claimed,
        claimedAt: updated.claimed_at,
        rewardCredits: updated.reward_credits,
      };
    },

    // Privacy - Enable Minimalist Mode
    enableMinimalistMode: async (_: unknown, _args: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `INSERT INTO user_privacy_mode (user_id, minimalist_mode, opt_out_leaderboards, exclude_from_stats_comparison)
         VALUES ($1, true, true, true)
         ON CONFLICT (user_id) DO UPDATE SET
           minimalist_mode = true,
           opt_out_leaderboards = true,
           exclude_from_stats_comparison = true,
           updated_at = NOW()`,
        [userId]
      );

      const settings = await queryOne<any>(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1',
        [userId]
      );

      return {
        profileVisibility: settings?.profile_visibility || 'private',
        showInLeaderboards: false,
        showWorkoutHistory: false,
        allowMessages: settings?.allow_messages || 'none',
        shareProgress: false,
      };
    },

    // Privacy - Disable Minimalist Mode
    disableMinimalistMode: async (_: unknown, _args: unknown, context: Context) => {
      const { userId } = requireAuth(context);

      await query(
        `UPDATE user_privacy_mode SET
           minimalist_mode = false,
           opt_out_leaderboards = false,
           exclude_from_stats_comparison = false,
           updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      const settings = await queryOne<any>(
        'SELECT * FROM user_privacy_settings WHERE user_id = $1',
        [userId]
      );

      return {
        profileVisibility: settings?.profile_visibility || 'public',
        showInLeaderboards: settings?.show_on_leaderboards ?? true,
        showWorkoutHistory: true,
        allowMessages: settings?.allow_messages || 'all',
        shareProgress: true,
      };
    },

    // PT Tests - Submit Results
    submitPTTestResults: async (
      _: unknown,
      args: { input: { testId: string; scores: Record<string, unknown> } },
      context: Context
    ) => {
      const { userId } = requireAuth(context);
      const { testId, scores } = args.input;

      const resultId = `ptr_${crypto.randomBytes(12).toString('hex')}`;

      // Calculate total score based on test scoring rules
      let totalScore = 0;
      let passed = true;

      for (const [_key, value] of Object.entries(scores)) {
        if (typeof value === 'number') {
          totalScore += value;
        } else if (typeof value === 'object' && value !== null) {
          const scoreObj = value as { value?: number; passed?: boolean };
          if (scoreObj.value) totalScore += scoreObj.value;
          if (scoreObj.passed === false) passed = false;
        }
      }

      await query(
        `INSERT INTO user_pt_results (id, user_id, pt_test_id, test_date, component_results, total_score, passed)
         VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6)`,
        [resultId, userId, testId, JSON.stringify(scores), totalScore, passed]
      );

      const test = await queryOne<{ name: string }>(
        'SELECT name FROM pt_tests WHERE id = $1',
        [testId]
      );

      return {
        id: resultId,
        userId,
        testId,
        testName: test?.name || 'Unknown Test',
        scores,
        totalScore,
        passed,
        completedAt: new Date(),
      };
    },

    // Personalization - Check Exercise
    checkExercisePersonalization: async (
      _: unknown,
      args: { exerciseId: string },
      context: Context
    ) => {
      const { userId } = requireAuth(context);

      // Get user limitations
      const limitations = await queryAll<{ body_part: string }>(
        `SELECT body_part FROM user_limitations WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      // Get exercise info
      const exercise = await queryOne<{ primary_muscles: string[]; secondary_muscles: string[] }>(
        'SELECT primary_muscles, secondary_muscles FROM exercises WHERE id = $1',
        [args.exerciseId]
      );

      if (!exercise) {
        return { suitable: false, warnings: ['Exercise not found'], alternatives: [] };
      }

      const allMuscles = [...(exercise.primary_muscles || []), ...(exercise.secondary_muscles || [])];
      const limitedBodyParts = limitations.map(l => l.body_part.toLowerCase());

      const warnings: string[] = [];
      let suitable = true;

      for (const muscle of allMuscles) {
        const muscleLower = muscle.toLowerCase();
        for (const limited of limitedBodyParts) {
          if (muscleLower.includes(limited) || limited.includes(muscleLower)) {
            warnings.push(`This exercise targets ${muscle}, which you have marked as limited`);
            suitable = false;
          }
        }
      }

      // Get alternatives if not suitable
      let alternatives: any[] = [];
      if (!suitable && exercise.primary_muscles?.length > 0) {
        const altExercises = await queryAll<any>(
          `SELECT id, name, description, type, primary_muscles, secondary_muscles, equipment, difficulty
           FROM exercises
           WHERE id != $1
           AND primary_muscles && $2
           AND NOT (primary_muscles && $3::text[])
           LIMIT 5`,
          [args.exerciseId, exercise.primary_muscles, limitedBodyParts]
        );

        alternatives = altExercises.map(e => ({
          id: e.id,
          name: e.name,
          description: e.description,
          type: e.type,
          primaryMuscles: e.primary_muscles,
          secondaryMuscles: e.secondary_muscles,
          equipment: e.equipment,
          difficulty: e.difficulty,
        }));
      }

      return {
        suitable,
        warnings,
        alternatives,
      };
    },

    // Limitations - Check Workout
    checkWorkoutLimitations: async (
      _: unknown,
      args: { exerciseIds: string[] },
      context: Context
    ) => {
      const { userId } = requireAuth(context);

      const limitations = await queryAll<{ body_part: string; severity: string }>(
        `SELECT body_part, severity FROM user_limitations WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (limitations.length === 0) {
        return { safe: true, warnings: [], blockedExercises: [], suggestions: [] };
      }

      const exercises = await queryAll<{ id: string; name: string; primary_muscles: string[]; secondary_muscles: string[] }>(
        `SELECT id, name, primary_muscles, secondary_muscles FROM exercises WHERE id = ANY($1)`,
        [args.exerciseIds]
      );

      const warnings: string[] = [];
      const blockedExercises: string[] = [];
      const limitedBodyParts = limitations.map(l => l.body_part.toLowerCase());

      for (const exercise of exercises) {
        const allMuscles = [...(exercise.primary_muscles || []), ...(exercise.secondary_muscles || [])];
        for (const muscle of allMuscles) {
          const muscleLower = muscle.toLowerCase();
          for (const limited of limitedBodyParts) {
            if (muscleLower.includes(limited) || limited.includes(muscleLower)) {
              warnings.push(`${exercise.name} may affect your ${limited} limitation`);
              blockedExercises.push(exercise.id);
            }
          }
        }
      }

      return {
        safe: blockedExercises.length === 0,
        warnings: Array.from(new Set(warnings)),
        blockedExercises: Array.from(new Set(blockedExercises)),
        suggestions: ['Consider warming up affected areas', 'Reduce weight/intensity if needed'],
      };
    },
  },

  // ============================================
  // SUBSCRIPTIONS
  // ============================================
  Subscription: {
    communityStatsUpdated: {
      subscribe: () => {
        return subscribe<CommunityStatsEvent>(PUBSUB_CHANNELS.COMMUNITY_STATS);
      },
      resolve: (payload: CommunityStatsEvent) => payload,
    },
    communityActivity: {
      subscribe: () => {
        return subscribe<ActivityEvent>(PUBSUB_CHANNELS.COMMUNITY_ACTIVITY);
      },
      resolve: (payload: ActivityEvent) => payload,
    },
    messageReceived: {
      subscribe: (_: unknown, args: { conversationId?: string }, context: Context) => {
        // Optional: require auth for message subscriptions
        if (!context.user) {
          throw new GraphQLError('Authentication required for message subscriptions', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }
        return subscribeForConversation<MessageEvent>(
          PUBSUB_CHANNELS.MESSAGE_RECEIVED,
          args.conversationId
        );
      },
      resolve: (payload: MessageEvent) => payload,
    },
    conversationUpdated: {
      subscribe: (_: unknown, __: unknown, context: Context) => {
        // Require auth for conversation subscriptions
        if (!context.user) {
          throw new GraphQLError('Authentication required for conversation subscriptions', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }
        return subscribe<ConversationEvent>(PUBSUB_CHANNELS.CONVERSATION_UPDATED);
      },
      resolve: (payload: ConversationEvent) => payload,
    },
  },

  // ============================================
  // TYPE RESOLVERS
  // ============================================
  ArchetypeCategory: {
    archetypes: async (parent: { id: string }) => {
      const archetypes = await queryAll(
        `SELECT id, name, description, philosophy, icon_url, image_url, category_id, focus_areas
         FROM archetypes WHERE category_id = $1 ORDER BY name`,
        [parent.id]
      );
      return archetypes.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        philosophy: a.philosophy,
        icon: a.icon_url,
        imageUrl: a.image_url,
        categoryId: a.category_id,
        color: null,
        primaryStats: [],
        bonuses: null,
        focusAreas: a.focus_areas || [],
      }));
    },
  },

  // Outdoor Equipment / Fitness Venues type resolvers
  ...outdoorEquipmentTypeResolvers,
};

// Merge outdoor equipment resolvers into Query and Mutation
Object.assign(resolvers.Query, outdoorEquipmentQueries);
Object.assign(resolvers.Mutation, outdoorEquipmentMutations);
