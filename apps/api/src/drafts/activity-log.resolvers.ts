/**
 * Activity Log GraphQL Resolvers
 *
 * Resolvers for the Activity Log panel - multi-input workout logging
 * supporting voice, screenshot, clipboard, CSV import, and health platform sync.
 */

import { db } from '../db';
import type { GraphQLContext } from './server';
import { loggers } from '../lib/logger';
import { requireAuth } from '../http/routes/auth';
// Import services as they're created
// import { voiceParserService } from '../services/voice-parser.service';
// import { screenshotParserService } from '../services/screenshot-parser.service';
// import { workoutTextParserService } from '../services/workout-text-parser.service';

const log = loggers.core;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get recent exercises for a user with usage stats
 */
async function getRecentExercises(userId: string, limit: number = 10) {
  const result = await db.raw(`
    WITH recent_sets AS (
      SELECT
        ws.exercise_id,
        ws.weight,
        ws.reps,
        ws.created_at,
        ROW_NUMBER() OVER (PARTITION BY ws.exercise_id ORDER BY ws.created_at DESC) as rn
      FROM workout_sets ws
      WHERE ws.user_id = ?
      ORDER BY ws.created_at DESC
    ),
    exercise_stats AS (
      SELECT
        exercise_id,
        MAX(created_at) as last_used_at,
        COUNT(*) as use_count
      FROM workout_sets
      WHERE user_id = ?
      GROUP BY exercise_id
    )
    SELECT DISTINCT ON (es.exercise_id)
      es.exercise_id,
      es.last_used_at,
      es.use_count,
      rs.weight as last_weight,
      rs.reps as last_reps,
      (SELECT COUNT(*) FROM workout_sets ws2
       WHERE ws2.user_id = ? AND ws2.exercise_id = es.exercise_id
       AND ws2.created_at::date = (SELECT MAX(created_at)::date FROM workout_sets ws3
                                    WHERE ws3.user_id = ? AND ws3.exercise_id = es.exercise_id)
      ) as last_sets
    FROM exercise_stats es
    LEFT JOIN recent_sets rs ON rs.exercise_id = es.exercise_id AND rs.rn = 1
    ORDER BY es.exercise_id, es.last_used_at DESC
    LIMIT ?
  `, [userId, userId, userId, userId, limit]);

  return result.rows;
}

/**
 * Detect workout patterns from user history
 */
async function detectWorkoutPatterns(userId: string) {
  const result = await db.raw(`
    SELECT
      EXTRACT(DOW FROM completed_at) as day_of_week,
      EXTRACT(HOUR FROM completed_at) as hour_of_day,
      name as workout_name,
      COUNT(*) as occurrence_count,
      MAX(completed_at) as last_occurred
    FROM workouts
    WHERE user_id = ? AND completed_at > NOW() - INTERVAL '90 days'
    GROUP BY
      EXTRACT(DOW FROM completed_at),
      EXTRACT(HOUR FROM completed_at),
      name
    HAVING COUNT(*) >= 2
    ORDER BY occurrence_count DESC
    LIMIT 10
  `, [userId]);

  return result.rows;
}

/**
 * Parse voice command text into exercise/weight/reps
 * Simple regex-based parser - will be enhanced with ML later
 */
function parseVoiceCommand(rawText: string): {
  success: boolean;
  parsedExercise?: string;
  parsedWeight?: number;
  parsedReps?: number;
  parsedSets?: number;
  parsedRPE?: number;
  confidence: number;
} {
  const text = rawText.toLowerCase().trim();

  // Pattern: "bench press 225 for 8" or "225 for 8 on bench"
  const weightRepsPattern = /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilos?)?\s*(?:for|x|×)\s*(\d+)/i;
  const setsPattern = /(\d+)\s*sets?/i;
  const rpePattern = /rpe\s*(\d+(?:\.\d+)?)/i;

  // Common exercise name patterns
  const exercisePatterns = [
    /(?:bench|chest)\s*press/i,
    /squat/i,
    /deadlift/i,
    /(?:overhead|shoulder)\s*press/i,
    /(?:pull[\s-]?up|pullup)/i,
    /(?:push[\s-]?up|pushup)/i,
    /(?:barbell|dumbbell)?\s*(?:curl|row|fly|extension|raise)/i,
    /(?:lat\s*)?pulldown/i,
    /leg\s*press/i,
    /lunge/i,
  ];

  let parsedExercise: string | undefined;
  let parsedWeight: number | undefined;
  let parsedReps: number | undefined;
  let parsedSets: number | undefined;
  let parsedRPE: number | undefined;
  let confidence = 0;

  // Extract weight and reps
  const weightRepsMatch = text.match(weightRepsPattern);
  if (weightRepsMatch) {
    parsedWeight = parseFloat(weightRepsMatch[1]);
    parsedReps = parseInt(weightRepsMatch[2], 10);
    confidence += 0.4;
  }

  // Extract sets
  const setsMatch = text.match(setsPattern);
  if (setsMatch) {
    parsedSets = parseInt(setsMatch[1], 10);
    confidence += 0.1;
  }

  // Extract RPE
  const rpeMatch = text.match(rpePattern);
  if (rpeMatch) {
    parsedRPE = parseFloat(rpeMatch[1]);
    confidence += 0.1;
  }

  // Try to find exercise name
  for (const pattern of exercisePatterns) {
    const match = text.match(pattern);
    if (match) {
      parsedExercise = match[0];
      confidence += 0.3;
      break;
    }
  }

  // If we found at least weight and reps, consider it a success
  const success = parsedWeight !== undefined && parsedReps !== undefined;

  return {
    success,
    parsedExercise,
    parsedWeight,
    parsedReps,
    parsedSets,
    parsedRPE,
    confidence: Math.min(confidence, 1.0),
  };
}

/**
 * Parse workout text (from clipboard paste)
 */
function parseWorkoutText(text: string): {
  success: boolean;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    confidence: number;
    lineNumber: number;
  }>;
  detectedFormat?: string;
  confidence: number;
} {
  const lines = text.split('\n').filter(line => line.trim());
  const exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    confidence: number;
    lineNumber: number;
  }> = [];

  // Pattern: "Bench Press 3x8 @ 185" or "Bench Press: 185lbs, 8 reps, 3 sets"
  const patterns = [
    // "Bench 3x8 @ 185"
    /^(.+?)\s*(\d+)\s*[xX×]\s*(\d+)\s*[@at]*\s*(\d+(?:\.\d+)?)/,
    // "Bench Press: 185lbs x 8 x 3"
    /^(.+?):\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[xX×]\s*(\d+)\s*[xX×]\s*(\d+)/,
    // "Bench Press - 185 lbs - 3 sets - 8 reps"
    /^(.+?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[-–]\s*(\d+)\s*sets?\s*[-–]\s*(\d+)\s*reps?/i,
    // Simple: "Bench Press 185x8"
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+)$/,
  ];

  let detectedFormat: string | undefined;

  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      const match = line.trim().match(pattern);
      if (match) {
        const [, name, val1, val2, val3] = match;

        // Determine which values are weight/sets/reps based on pattern
        let weight: number | undefined;
        let sets: number | undefined;
        let reps: number | undefined;

        if (pattern.source.includes('@')) {
          // "Bench 3x8 @ 185"
          sets = parseInt(val1, 10);
          reps = parseInt(val2, 10);
          weight = val3 ? parseFloat(val3) : undefined;
          detectedFormat = 'setsxreps@weight';
        } else if (val3) {
          // Has three numbers - likely weight x reps x sets or similar
          weight = parseFloat(val1);
          reps = parseInt(val2, 10);
          sets = parseInt(val3, 10);
          detectedFormat = 'weightxrepsxsets';
        } else {
          // Two numbers - weightxreps
          weight = parseFloat(val1);
          reps = parseInt(val2, 10);
          detectedFormat = 'weightxreps';
        }

        exercises.push({
          name: name.trim(),
          sets,
          reps,
          weight,
          confidence: 0.7,
          lineNumber: index + 1,
        });
        break;
      }
    }
  });

  return {
    success: exercises.length > 0,
    exercises,
    detectedFormat,
    confidence: exercises.length > 0 ? 0.7 : 0,
  };
}

// ============================================
// RESOLVERS
// ============================================

export const activityLogResolvers = {
  Query: {
    // Quick pick suggestions based on patterns
    suggestedWorkouts: async (_: unknown, args: { limit?: number }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const limit = args.limit || 5;

      const now = new Date();
      const dayOfWeek = now.getDay();
      const hourOfDay = now.getHours();

      // Find patterns for current day/time
      const patterns = await db('workout_patterns')
        .where({ user_id: userId })
        .where('day_of_week', dayOfWeek)
        .orderBy('occurrence_count', 'desc')
        .limit(limit);

      if (patterns.length === 0) {
        // Fall back to recent workouts
        const recentWorkouts = await db('workouts')
          .where({ user_id: userId })
          .orderBy('completed_at', 'desc')
          .limit(limit);

        return recentWorkouts.map((w: any) => ({
          type: w.name || 'Workout',
          name: w.name || `Workout from ${new Date(w.completed_at).toLocaleDateString()}`,
          reason: 'Recent workout',
          confidence: 0.5,
          sourceWorkoutId: w.id,
          sourceDate: w.completed_at,
          exercises: [], // Would need to join with exercises
        }));
      }

      return patterns.map((p: any) => ({
        type: p.workout_type || 'Custom',
        name: p.workout_name || `${p.workout_type} Day`,
        reason: `You usually do this on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][p.day_of_week]}s`,
        confidence: Math.min(p.occurrence_count / 10, 1.0),
        sourceWorkoutId: null,
        sourceDate: p.last_occurred,
        exercises: p.typical_exercises || [],
      }));
    },

    // User's workout patterns
    workoutPatterns: async (_: unknown, _args: unknown, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const patterns = await db('workout_patterns')
        .where({ user_id: userId })
        .orderBy('occurrence_count', 'desc');

      return patterns.map((p: any) => ({
        id: p.id,
        dayOfWeek: p.day_of_week,
        hourOfDay: p.hour_of_day,
        workoutType: p.workout_type,
        workoutName: p.workout_name,
        typicalExercises: p.typical_exercises || [],
        occurrenceCount: p.occurrence_count,
        lastOccurred: p.last_occurred,
      }));
    },

    // Recent exercises with stats
    recentExercises: async (_: unknown, args: { limit?: number }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const limit = args.limit || 20;

      const recentStats = await getRecentExercises(userId, limit);

      // Get full exercise data
      const exerciseIds = recentStats.map((s: any) => s.exercise_id);
      const exercises = await db('exercises').whereIn('id', exerciseIds);
      const exerciseMap = new Map(exercises.map((e: any) => [e.id, e]));

      return recentStats.map((stat: any) => ({
        exercise: exerciseMap.get(stat.exercise_id),
        lastUsedAt: stat.last_used_at,
        lastWeight: stat.last_weight,
        lastReps: stat.last_reps,
        lastSets: stat.last_sets,
        useCount: stat.use_count,
      })).filter((r: any) => r.exercise);
    },

    // Import job queries
    importJob: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const job = await db('import_jobs')
        .where({ id: args.id, user_id: userId })
        .first();

      return job;
    },

    importJobs: async (_: unknown, args: { limit?: number; status?: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      let query = db('import_jobs')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(args.limit || 10);

      if (args.status) {
        query = query.where({ status: args.status.toLowerCase() });
      }

      return query;
    },

    // Export job queries
    exportJob: async (_: unknown, args: { id: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      return db('export_jobs')
        .where({ id: args.id, user_id: userId })
        .first();
    },

    exportJobs: async (_: unknown, args: { limit?: number }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      return db('export_jobs')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(args.limit || 10);
    },

    // Health platform status
    healthPlatformStatus: async (_: unknown, _args: unknown, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const connections = await db('wearable_connections')
        .where({ user_id: userId });

      const platforms = ['APPLE_HEALTH', 'GOOGLE_FIT', 'FITBIT', 'GARMIN', 'STRAVA', 'WHOOP', 'OURA'];

      return platforms.map(platform => {
        const connection = connections.find((c: any) =>
          c.provider.toUpperCase() === platform ||
          c.provider.toUpperCase().replace('_', '') === platform.replace('_', '')
        );

        return {
          platform,
          connected: !!connection,
          lastSyncAt: connection?.last_sync_at,
          syncEnabled: connection?.sync_enabled ?? false,
          autoSyncEnabled: connection?.auto_sync_enabled ?? false,
          syncDirection: connection?.sync_direction || 'import',
          recordCount: connection?.record_count || 0,
        };
      });
    },

    healthPlatformConnections: async (_: unknown, _args: unknown, context: GraphQLContext) => {
      // Alias for healthPlatformStatus
      return activityLogResolvers.Query.healthPlatformStatus(_, _args, context);
    },

    // Voice command history
    voiceCommandHistory: async (_: unknown, args: { limit?: number }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      return db('voice_commands')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(args.limit || 20);
    },

    // Screenshot imports
    screenshotImports: async (_: unknown, args: { limit?: number }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      return db('screenshot_imports')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(args.limit || 10);
    },
  },

  Mutation: {
    // Quick log a single set
    quickLogSet: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { exerciseId, weight, reps, rpe, rir, notes, tag, source } = args.input;

      try {
        // Get or create active session
        let session = await db('active_workout_sessions')
          .where({ user_id: userId })
          .whereNull('completed_at')
          .first();

        if (!session) {
          // Create new session
          const [newSession] = await db('active_workout_sessions')
            .insert({
              user_id: userId,
              started_at: new Date(),
              workout_plan: JSON.stringify({ exercises: [{ exerciseId }] }),
              sets: JSON.stringify([]),
            })
            .returning('*');
          session = newSession;
        }

        // Log the set
        const [loggedSet] = await db('workout_sets')
          .insert({
            user_id: userId,
            session_id: session.id,
            exercise_id: exerciseId,
            weight,
            reps,
            rpe,
            rir,
            notes,
            tag: tag || 'working',
            activity_source: source || 'manual',
          })
          .returning('*');

        // Update session sets
        const currentSets = JSON.parse(session.sets || '[]');
        currentSets.push(loggedSet);
        await db('active_workout_sessions')
          .where({ id: session.id })
          .update({ sets: JSON.stringify(currentSets) });

        return {
          success: true,
          set: loggedSet,
          session,
          error: null,
        };
      } catch (error: any) {
        log.error({ error, userId, exerciseId }, 'Failed to quick log set');
        return {
          success: false,
          set: null,
          session: null,
          error: error.message,
        };
      }
    },

    // Quick log multiple sets for one exercise
    quickLogExercise: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { exerciseId, sets, source } = args.input;

      try {
        // Get or create active session
        let session = await db('active_workout_sessions')
          .where({ user_id: userId })
          .whereNull('completed_at')
          .first();

        if (!session) {
          const [newSession] = await db('active_workout_sessions')
            .insert({
              user_id: userId,
              started_at: new Date(),
              workout_plan: JSON.stringify({ exercises: [{ exerciseId }] }),
              sets: JSON.stringify([]),
            })
            .returning('*');
          session = newSession;
        }

        // Log all sets
        const loggedSets = [];
        for (let i = 0; i < sets.length; i++) {
          const setData = sets[i];
          const [loggedSet] = await db('workout_sets')
            .insert({
              user_id: userId,
              session_id: session.id,
              exercise_id: exerciseId,
              set_number: i + 1,
              weight: setData.weight,
              reps: setData.reps,
              rpe: setData.rpe,
              rir: setData.rir,
              notes: setData.notes,
              tag: setData.tag || 'working',
              activity_source: source || 'manual',
            })
            .returning('*');
          loggedSets.push(loggedSet);
        }

        return {
          success: true,
          set: loggedSets[loggedSets.length - 1],
          session,
          error: null,
        };
      } catch (error: any) {
        log.error({ error, userId, exerciseId }, 'Failed to quick log exercise');
        return {
          success: false,
          set: null,
          session: null,
          error: error.message,
        };
      }
    },

    // Quick log a complete workout
    quickLogWorkout: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { name, source, activityType, startedAt, endedAt, exercises, notes } = args.input;

      try {
        const workoutStartedAt = startedAt ? new Date(startedAt) : new Date();
        const workoutEndedAt = endedAt ? new Date(endedAt) : new Date();
        const durationSeconds = Math.floor((workoutEndedAt.getTime() - workoutStartedAt.getTime()) / 1000);

        // Create workout record
        const [workout] = await db('workouts')
          .insert({
            user_id: userId,
            name: name || `${activityType || 'Workout'} - ${workoutStartedAt.toLocaleDateString()}`,
            started_at: workoutStartedAt,
            completed_at: workoutEndedAt,
            duration_seconds: durationSeconds,
            notes,
            source: source || 'manual',
            exercise_data: JSON.stringify(exercises),
          })
          .returning('*');

        // Log all sets for each exercise
        let totalTU = 0;
        const prsAchieved: any[] = [];

        for (const exercise of exercises) {
          for (let i = 0; i < exercise.sets.length; i++) {
            const setData = exercise.sets[i];
            await db('workout_sets').insert({
              user_id: userId,
              workout_id: workout.id,
              exercise_id: exercise.exerciseId,
              set_number: i + 1,
              weight: setData.weight,
              reps: setData.reps,
              rpe: setData.rpe,
              rir: setData.rir,
              notes: setData.notes,
              tag: setData.tag || 'working',
              activity_source: source || 'manual',
            });

            // Simple TU calculation (will use full service later)
            if (setData.weight && setData.reps) {
              totalTU += (setData.weight * setData.reps) / 100;
            }
          }
        }

        // Update workout totals
        await db('workouts')
          .where({ id: workout.id })
          .update({ total_tu: totalTU });

        // Update workout pattern
        const dayOfWeek = workoutStartedAt.getDay();
        const hourOfDay = workoutStartedAt.getHours();

        await db.raw(`
          INSERT INTO workout_patterns (user_id, day_of_week, hour_of_day, workout_name, occurrence_count, last_occurred)
          VALUES (?, ?, ?, ?, 1, ?)
          ON CONFLICT (user_id, day_of_week, hour_of_day)
          DO UPDATE SET
            occurrence_count = workout_patterns.occurrence_count + 1,
            last_occurred = EXCLUDED.last_occurred,
            workout_name = COALESCE(EXCLUDED.workout_name, workout_patterns.workout_name)
        `, [userId, dayOfWeek, hourOfDay, name, workoutEndedAt]);

        return {
          success: true,
          workout,
          session: null,
          tuEarned: Math.floor(totalTU),
          xpEarned: Math.floor(totalTU * 2),
          creditsAwarded: Math.floor(totalTU / 10),
          prsAchieved,
          error: null,
        };
      } catch (error: any) {
        log.error({ error, userId }, 'Failed to quick log workout');
        return {
          success: false,
          workout: null,
          session: null,
          tuEarned: 0,
          xpEarned: 0,
          creditsAwarded: 0,
          prsAchieved: [],
          error: error.message,
        };
      }
    },

    // Clone a workout to a new date
    cloneWorkout: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { workoutId, date, adjustWeights, weightAdjustPercent } = args.input;

      try {
        // Get original workout
        const originalWorkout = await db('workouts')
          .where({ id: workoutId, user_id: userId })
          .first();

        if (!originalWorkout) {
          return {
            success: false,
            workout: null,
            error: 'Workout not found',
          };
        }

        // Get original sets
        const originalSets = await db('workout_sets')
          .where({ workout_id: workoutId });

        const targetDate = new Date(date);
        const adjustMultiplier = adjustWeights ? (1 + (weightAdjustPercent || 0) / 100) : 1;

        // Create new workout
        const [newWorkout] = await db('workouts')
          .insert({
            user_id: userId,
            name: originalWorkout.name,
            started_at: targetDate,
            completed_at: targetDate,
            duration_seconds: originalWorkout.duration_seconds,
            notes: `Cloned from workout on ${new Date(originalWorkout.completed_at).toLocaleDateString()}`,
            source: 'clone',
            exercise_data: originalWorkout.exercise_data,
          })
          .returning('*');

        // Clone sets with optional weight adjustment
        for (const set of originalSets) {
          await db('workout_sets').insert({
            user_id: userId,
            workout_id: newWorkout.id,
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            weight: set.weight ? Math.round(set.weight * adjustMultiplier * 2) / 2 : null, // Round to nearest 0.5
            reps: set.reps,
            rpe: set.rpe,
            rir: set.rir,
            tag: set.tag,
            activity_source: 'clone',
          });
        }

        return {
          success: true,
          workout: newWorkout,
          error: null,
        };
      } catch (error: any) {
        log.error({ error, userId, workoutId }, 'Failed to clone workout');
        return {
          success: false,
          workout: null,
          error: error.message,
        };
      }
    },

    // Parse voice command
    parseVoiceCommand: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { rawText, audioUrl } = args.input;

      const result = parseVoiceCommand(rawText);

      // Store voice command for learning
      await db('voice_commands').insert({
        user_id: userId,
        raw_text: rawText,
        parsed_intent: JSON.stringify(result),
        confidence: result.confidence,
        provider: 'web_speech_api',
      });

      // Try to match exercise name to database
      let matchedExerciseId: string | null = null;
      if (result.parsedExercise) {
        const exercise = await db('exercises')
          .whereRaw('LOWER(name) LIKE ?', [`%${result.parsedExercise.toLowerCase()}%`])
          .first();
        if (exercise) {
          matchedExerciseId = exercise.id;
        }
      }

      return {
        success: result.success,
        parsedExercise: result.parsedExercise,
        matchedExerciseId,
        parsedWeight: result.parsedWeight,
        parsedReps: result.parsedReps,
        parsedSets: result.parsedSets,
        parsedRPE: result.parsedRPE,
        confidence: result.confidence,
        needsConfirmation: result.confidence < 0.8,
        alternatives: [],
        rawText,
      };
    },

    // Confirm and log voice command
    confirmVoiceLog: async (_: unknown, args: any, context: GraphQLContext) => {
      const { exerciseId, weight, reps, rpe, rir, notes } = args;

      return activityLogResolvers.Mutation.quickLogSet(
        _,
        {
          input: {
            exerciseId,
            weight,
            reps,
            rpe,
            rir,
            notes,
            source: 'VOICE',
          },
        },
        context
      );
    },

    // Parse screenshot (placeholder - will be implemented with OCR service)
    parseScreenshot: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { imageUrl, imageBase64 } = args.input;

      // Store screenshot import record
      const [screenshotImport] = await db('screenshot_imports')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          status: 'pending',
          ocr_provider: 'tesseract',
        })
        .returning('*');

      // TODO: Implement actual OCR processing
      // For now, return placeholder
      return {
        success: false,
        exercises: [],
        overallConfidence: 0,
        rawOcrText: null,
        errors: ['OCR processing not yet implemented. Please use text paste for now.'],
      };
    },

    // Confirm screenshot import
    confirmScreenshotImport: async (_: unknown, args: { screenshotId: string; exercises: any[] }, context: GraphQLContext) => {
      return activityLogResolvers.Mutation.quickLogWorkout(
        _,
        {
          input: {
            name: 'Imported from Screenshot',
            source: 'SCREENSHOT',
            exercises: args.exercises,
          },
        },
        context
      );
    },

    // Parse text (clipboard paste)
    parseText: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      requireAuth(context);
      const { text } = args.input;

      const result = parseWorkoutText(text);

      // Try to match exercise names to database
      const exercisesWithMatches = await Promise.all(
        result.exercises.map(async (ex) => {
          const exercise = await db('exercises')
            .whereRaw('LOWER(name) LIKE ?', [`%${ex.name.toLowerCase()}%`])
            .first();

          return {
            ...ex,
            matchedExerciseId: exercise?.id || null,
            matchedExerciseName: exercise?.name || null,
          };
        })
      );

      return {
        success: result.success,
        exercises: exercisesWithMatches,
        detectedFormat: result.detectedFormat,
        confidence: result.confidence,
        errors: result.success ? [] : ['Could not parse workout text. Try a different format.'],
      };
    },

    // Confirm text import
    confirmTextImport: async (_: unknown, args: { exercises: any[] }, context: GraphQLContext) => {
      return activityLogResolvers.Mutation.quickLogWorkout(
        _,
        {
          input: {
            name: 'Imported from Text',
            source: 'CLIPBOARD',
            exercises: args.exercises,
          },
        },
        context
      );
    },

    // Start file import (placeholder)
    startFileImport: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { fileUrl, fileName, format, dateRange, fieldMapping } = args.input;

      const [job] = await db('import_jobs')
        .insert({
          user_id: userId,
          source: format || 'generic_csv',
          file_name: fileName,
          status: 'pending',
          date_range: dateRange,
          field_mapping: JSON.stringify(fieldMapping || {}),
        })
        .returning('*');

      // TODO: Trigger background job for actual import processing

      return job;
    },

    // Cancel import
    cancelImport: async (_: unknown, args: { jobId: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const result = await db('import_jobs')
        .where({ id: args.jobId, user_id: userId })
        .whereIn('status', ['pending', 'processing'])
        .update({ status: 'cancelled' });

      return result > 0;
    },

    // Retry import
    retryImport: async (_: unknown, args: { jobId: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const job = await db('import_jobs')
        .where({ id: args.jobId, user_id: userId, status: 'failed' })
        .first();

      if (!job) {
        throw new Error('Import job not found or cannot be retried');
      }

      const [updatedJob] = await db('import_jobs')
        .where({ id: args.jobId })
        .update({
          status: 'pending',
          started_at: null,
          completed_at: null,
          imported_count: 0,
          skipped_count: 0,
          error_count: 0,
          errors: JSON.stringify([]),
        })
        .returning('*');

      // TODO: Trigger background job

      return updatedJob;
    },

    // Start export
    startExport: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { format, dateRange } = args.input;

      const [job] = await db('export_jobs')
        .insert({
          user_id: userId,
          format,
          date_range: dateRange,
          status: 'pending',
        })
        .returning('*');

      // TODO: Trigger background job for actual export processing

      return job;
    },

    // Cancel export
    cancelExport: async (_: unknown, args: { jobId: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const result = await db('export_jobs')
        .where({ id: args.jobId, user_id: userId })
        .whereIn('status', ['pending', 'processing'])
        .update({ status: 'cancelled' });

      return result > 0;
    },

    // Connect health platform (placeholder)
    connectHealthPlatform: async (_: unknown, args: { platform: string; authCode?: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { platform, authCode } = args;

      // TODO: Implement OAuth flow for each platform
      // For now, create a placeholder connection

      await db('wearable_connections')
        .insert({
          user_id: userId,
          provider: platform.toLowerCase(),
          access_token: authCode || 'placeholder',
          sync_enabled: true,
        })
        .onConflict(['user_id', 'provider'])
        .merge();

      return {
        platform,
        connected: true,
        lastSyncAt: null,
        syncEnabled: true,
        autoSyncEnabled: false,
        syncDirection: 'import',
        recordCount: 0,
      };
    },

    // Disconnect health platform
    disconnectHealthPlatform: async (_: unknown, args: { platform: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const result = await db('wearable_connections')
        .where({ user_id: userId, provider: args.platform.toLowerCase() })
        .delete();

      return result > 0;
    },

    // Sync health platform (placeholder)
    syncHealthPlatform: async (_: unknown, args: { platform: string; dateRange?: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { platform, dateRange } = args;

      // TODO: Implement actual sync with each platform's API

      await db('wearable_connections')
        .where({ user_id: userId, provider: platform.toLowerCase() })
        .update({ last_sync_at: new Date() });

      return {
        success: true,
        platform,
        importedCount: 0,
        skippedCount: 0,
        errors: [],
        lastSyncAt: new Date(),
      };
    },

    // Update health sync settings
    updateHealthSyncSettings: async (_: unknown, args: { input: any }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);
      const { platform, syncEnabled, autoSyncEnabled, syncDirection, dateRange } = args.input;

      await db('wearable_connections')
        .where({ user_id: userId, provider: platform.toLowerCase() })
        .update({
          sync_enabled: syncEnabled,
          auto_sync_enabled: autoSyncEnabled,
          sync_direction: syncDirection,
        });

      return {
        platform,
        connected: true,
        lastSyncAt: null,
        syncEnabled,
        autoSyncEnabled,
        syncDirection,
        recordCount: 0,
      };
    },

    // Delete workout pattern
    deleteWorkoutPattern: async (_: unknown, args: { patternId: string }, context: GraphQLContext) => {
      const { userId } = requireAuth(context);

      const result = await db('workout_patterns')
        .where({ id: args.patternId, user_id: userId })
        .delete();

      return result > 0;
    },
  },
};
