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
import { economyService } from '../modules/economy';
import { statsService } from '../modules/stats';
import { careerService } from '../modules/career';
import { sleepService, recoveryService } from '../modules/recovery';
import { ProgressionService } from '../services/progression.service';
import { ProgramsService, EnrollmentService } from '../modules/programs';
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

function requireAuth(context: Context): { userId: string; email: string; roles: string[] } {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
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

// ============================================
// TU CALCULATION
// ============================================

interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
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
        archetype_id: string | null;
        level: number;
        xp: number;
        roles: string[];
        created_at: Date;
      }>(
        `SELECT id, email, username, display_name, avatar_url, bio, social_links, archetype_id,
                COALESCE(level, 1) as level, COALESCE(xp, 0) as xp, roles, created_at
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
                        movement_pattern
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
        imageUrl: null,
        videoUrl: null,
      }));
    },

    exercise: async (_: unknown, args: { id: string }) => {
      const e = await queryOne<any>(
        `SELECT id, name, description, type, primary_muscles, difficulty, cues,
                equipment_required, equipment_optional, locations, is_compound,
                movement_pattern
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
        imageUrl: null,
        videoUrl: null,
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

    // Workouts
    myWorkouts: async (_: unknown, args: { limit?: number; offset?: number }, context: Context) => {
      const { userId } = requireAuth(context);
      const limit = Math.min(args.limit || 50, 100);
      const offset = args.offset || 0;

      const workouts = await queryAll(
        `SELECT id, user_id, date, total_tu, notes, exercise_data, muscle_activations, created_at
         FROM workouts WHERE user_id = $1
         ORDER BY date DESC, created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return workouts.map((w: any) => ({
        id: w.id,
        userId: w.user_id,
        exercises: JSON.parse(w.exercise_data || '[]'),
        duration: null,
        notes: w.notes,
        totalTU: w.total_tu,
        createdAt: w.created_at,
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
        exercises: JSON.parse(workout.exercise_data || '[]'),
        duration: null,
        notes: workout.notes,
        totalTU: workout.total_tu,
        createdAt: workout.created_at,
      };
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
    goals: async (_: unknown, __: unknown, context: Context) => {
      const { userId } = requireAuth(context);
      const goals = await queryAll(
        `SELECT id, user_id, type, title, description, target, current_value, unit,
                deadline, status, created_at, updated_at
         FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return goals.map((g: any) => ({
        id: g.id,
        userId: g.user_id,
        type: g.type,
        title: g.title,
        description: g.description,
        target: g.target,
        current: g.current_value,
        unit: g.unit,
        deadline: g.deadline,
        status: g.status,
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
        'SELECT COALESCE(level, 1) as level, COALESCE(xp, 0) as xp FROM users WHERE id = $1',
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
                COALESCE(level, 1) as level, COALESCE(xp, 0) as xp, created_at
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
              exercises: JSON.parse(workout.exercise_data || '[]'),
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

    // Goals
    createGoal: async (_: unknown, args: { input: any }, context: Context) => {
      const { userId } = requireAuth(context);
      const { type, title, description, target, unit, deadline } = args.input;

      const goalId = `goal_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO goals (id, user_id, type, title, description, target, current_value, unit, deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 'active')`,
        [goalId, userId, type, title, description, target, unit, deadline]
      );

      return {
        id: goalId,
        userId,
        type,
        title,
        description,
        target,
        current: 0,
        unit,
        deadline,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    deleteGoal: async (_: unknown, args: { id: string }, context: Context) => {
      const { userId } = requireAuth(context);
      await query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [args.id, userId]);
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

      await query('UPDATE users SET archetype_id = $1 WHERE id = $2', [args.archetypeId, userId]);

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
      return sleepService.logSleep(userId, args.input as any);
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
      const result = await sleepService.updateSleepLog(userId, args.id, args.input as any);
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
      return sleepService.upsertSleepGoal(userId, args.input as any);
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
      const result = await sleepService.updateSleepGoal(userId, args.id, args.input as any);
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
};
