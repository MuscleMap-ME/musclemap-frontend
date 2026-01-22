/**
 * Workout Sessions Module
 *
 * Provides real-time workout logging with:
 * - Session lifecycle management (start, pause, resume, complete, abandon)
 * - Individual set logging with TU calculation
 * - PR detection per set
 * - Muscle activation tracking
 * - Session recovery from crashes/refreshes
 *
 * Uses existing tables from migrations:
 * - active_workout_sessions (119)
 * - workout_sets (070)
 * - archived_workout_sessions (119)
 */

import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';

const log = loggers.api;

// ============================================
// TYPES
// ============================================

export interface LoggedSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  rir: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  tag: string;
  notes: string | null;
  tu: number;
  muscleActivations: MuscleActivation[];
  isPRWeight: boolean;
  isPRReps: boolean;
  isPR1RM: boolean;
  performedAt: Date;
}

export interface MuscleActivation {
  muscleId: string;
  muscleName: string;
  activation: number;
  tu: number;
}

export interface MuscleActivationSummary {
  muscleId: string;
  muscleName: string;
  totalTU: number;
  setCount: number;
  percentageOfMax: number | null;
}

export interface SessionPR {
  exerciseId: string;
  exerciseName: string;
  prType: string;
  previousValue: number | null;
  newValue: number;
  improvementPercent: number | null;
  achievedAt: Date;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  startedAt: Date;
  pausedAt: Date | null;
  totalPausedTime: number;
  lastActivityAt: Date;
  workoutPlan: any | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  sets: LoggedSet[];
  totalVolume: number;
  totalReps: number;
  estimatedCalories: number;
  musclesWorked: MuscleActivationSummary[];
  sessionPRs: SessionPR[];
  restTimerRemaining: number | null;
  restTimerTotalDuration: number | null;
  restTimerStartedAt: Date | null;
  clientVersion: number;
  serverVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogSetInput {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  rir?: number;
  durationSeconds?: number;
  restSeconds?: number;
  tag?: string;
  notes?: string;
  clientSetId?: string;
}

export interface CompleteWorkoutInput {
  sessionId: string;
  notes?: string;
  isPublic?: boolean;
}

// ============================================
// SERVICE
// ============================================

class WorkoutSessionService {
  /**
   * Start a new workout session
   */
  async startSession(userId: string, workoutPlan?: any, clientId?: string): Promise<WorkoutSession> {
    // Check for existing active session
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM active_workout_sessions WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      // Return existing session instead of creating new
      log.info({ userId, existingSessionId: existing.id }, 'Returning existing active session');
      return this.getSession(userId, existing.id);
    }

    const sessionId = clientId || `ws_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date();

    await query(`
      INSERT INTO active_workout_sessions (
        id, user_id, started_at, last_activity_at, workout_plan,
        current_exercise_index, current_set_index, sets,
        total_volume, total_reps, estimated_calories, muscles_worked,
        session_prs, client_version, server_version
      ) VALUES ($1, $2, $3, $3, $4, 0, 0, '[]', 0, 0, 0, '[]', '[]', 1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        id = $1,
        started_at = $3,
        last_activity_at = $3,
        workout_plan = $4,
        current_exercise_index = 0,
        current_set_index = 0,
        sets = '[]',
        total_volume = 0,
        total_reps = 0,
        estimated_calories = 0,
        muscles_worked = '[]',
        session_prs = '[]',
        paused_at = NULL,
        total_paused_time = 0,
        rest_timer_remaining = NULL,
        rest_timer_total_duration = NULL,
        rest_timer_started_at = NULL,
        client_version = 1,
        server_version = 1
    `, [sessionId, userId, now, workoutPlan ? JSON.stringify(workoutPlan) : null]);

    log.info({ userId, sessionId }, 'Started new workout session');

    return this.getSession(userId, sessionId);
  }

  /**
   * Get current active session for user
   */
  async getActiveSession(userId: string): Promise<WorkoutSession | null> {
    const row = await queryOne<any>(
      'SELECT * FROM active_workout_sessions WHERE user_id = $1',
      [userId]
    );

    if (!row) return null;

    return this.mapRowToSession(row);
  }

  /**
   * Get session by ID
   */
  async getSession(userId: string, sessionId: string): Promise<WorkoutSession> {
    const row = await queryOne<any>(
      'SELECT * FROM active_workout_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (!row) {
      throw new Error('Workout session not found');
    }

    return this.mapRowToSession(row);
  }

  /**
   * Log a single set
   */
  async logSet(userId: string, input: LogSetInput): Promise<{ session: WorkoutSession; setLogged: LoggedSet; prsAchieved: SessionPR[] }> {
    const session = await this.getSession(userId, input.sessionId);

    // Get exercise info
    const exercise = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM exercises WHERE id = $1',
      [input.exerciseId]
    );

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Calculate TU for this set
    const { tu, muscleActivations } = await this.calculateSetTU(
      input.exerciseId,
      input.reps || 0,
      input.weightKg || 0
    );

    // Check for PRs
    const prsAchieved = await this.checkForPRs(
      userId,
      input.exerciseId,
      exercise.name,
      input.weightKg,
      input.reps
    );

    const setId = input.clientSetId || `set_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();

    const newSet: LoggedSet = {
      id: setId,
      exerciseId: input.exerciseId,
      exerciseName: exercise.name,
      setNumber: input.setNumber,
      reps: input.reps ?? null,
      weightKg: input.weightKg ?? null,
      rpe: input.rpe ?? null,
      rir: input.rir ?? null,
      durationSeconds: input.durationSeconds ?? null,
      restSeconds: input.restSeconds ?? null,
      tag: input.tag || 'working',
      notes: input.notes ?? null,
      tu,
      muscleActivations,
      isPRWeight: prsAchieved.some(pr => pr.prType === 'weight'),
      isPRReps: prsAchieved.some(pr => pr.prType === 'reps'),
      isPR1RM: prsAchieved.some(pr => pr.prType === '1rm'),
      performedAt: now,
    };

    // Update session with new set
    const updatedSets = [...session.sets, newSet];
    const volume = (input.weightKg || 0) * (input.reps || 0);
    const newTotalVolume = session.totalVolume + volume;
    const newTotalReps = session.totalReps + (input.reps || 0);
    const newCalories = this.estimateCalories(newTotalVolume, updatedSets.length);

    // Update muscle activation summary
    const musclesWorked = this.updateMuscleSummary(session.musclesWorked, muscleActivations);

    // Combine PRs
    const allPRs = [...session.sessionPRs, ...prsAchieved];

    await query(`
      UPDATE active_workout_sessions SET
        sets = $1,
        total_volume = $2,
        total_reps = $3,
        estimated_calories = $4,
        muscles_worked = $5,
        session_prs = $6,
        current_set_index = current_set_index + 1,
        client_version = client_version + 1
      WHERE id = $7 AND user_id = $8
    `, [
      JSON.stringify(updatedSets),
      newTotalVolume,
      newTotalReps,
      newCalories,
      JSON.stringify(musclesWorked),
      JSON.stringify(allPRs),
      input.sessionId,
      userId,
    ]);

    // Also insert into workout_sets for normalized storage
    await this.insertNormalizedSet(userId, input.sessionId, newSet);

    log.info({
      userId,
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      setNumber: input.setNumber,
      tu,
      prsCount: prsAchieved.length,
    }, 'Set logged');

    const updatedSession = await this.getSession(userId, input.sessionId);

    return {
      session: updatedSession,
      setLogged: newSet,
      prsAchieved,
    };
  }

  /**
   * Update an existing set
   */
  async updateSet(userId: string, setId: string, updates: Partial<LogSetInput>): Promise<LoggedSet> {
    // Find the session containing this set
    const session = await this.getActiveSession(userId);
    if (!session) {
      throw new Error('No active workout session');
    }

    const setIndex = session.sets.findIndex(s => s.id === setId);
    if (setIndex === -1) {
      throw new Error('Set not found in current session');
    }

    const existingSet = session.sets[setIndex];

    // Recalculate TU if weight/reps changed
    let tu = existingSet.tu;
    let muscleActivations = existingSet.muscleActivations;
    if (updates.weightKg !== undefined || updates.reps !== undefined) {
      const result = await this.calculateSetTU(
        existingSet.exerciseId,
        updates.reps ?? existingSet.reps ?? 0,
        updates.weightKg ?? existingSet.weightKg ?? 0
      );
      tu = result.tu;
      muscleActivations = result.muscleActivations;
    }

    const updatedSet: LoggedSet = {
      ...existingSet,
      reps: updates.reps ?? existingSet.reps,
      weightKg: updates.weightKg ?? existingSet.weightKg,
      rpe: updates.rpe ?? existingSet.rpe,
      rir: updates.rir ?? existingSet.rir,
      durationSeconds: updates.durationSeconds ?? existingSet.durationSeconds,
      notes: updates.notes ?? existingSet.notes,
      tag: updates.tag ?? existingSet.tag,
      tu,
      muscleActivations,
    };

    // Update session
    const updatedSets = [...session.sets];
    updatedSets[setIndex] = updatedSet;

    // Recalculate totals
    const newTotalVolume = updatedSets.reduce((sum, s) => sum + ((s.weightKg || 0) * (s.reps || 0)), 0);
    const newTotalReps = updatedSets.reduce((sum, s) => sum + (s.reps || 0), 0);
    const musclesWorked = this.recalculateMuscleSummary(updatedSets);

    await query(`
      UPDATE active_workout_sessions SET
        sets = $1,
        total_volume = $2,
        total_reps = $3,
        muscles_worked = $4,
        client_version = client_version + 1
      WHERE id = $5 AND user_id = $6
    `, [
      JSON.stringify(updatedSets),
      newTotalVolume,
      newTotalReps,
      JSON.stringify(musclesWorked),
      session.id,
      userId,
    ]);

    return updatedSet;
  }

  /**
   * Delete a set from the session
   */
  async deleteSet(userId: string, setId: string): Promise<boolean> {
    const session = await this.getActiveSession(userId);
    if (!session) {
      throw new Error('No active workout session');
    }

    const updatedSets = session.sets.filter(s => s.id !== setId);
    if (updatedSets.length === session.sets.length) {
      return false; // Set not found
    }

    // Recalculate totals
    const newTotalVolume = updatedSets.reduce((sum, s) => sum + ((s.weightKg || 0) * (s.reps || 0)), 0);
    const newTotalReps = updatedSets.reduce((sum, s) => sum + (s.reps || 0), 0);
    const musclesWorked = this.recalculateMuscleSummary(updatedSets);

    await query(`
      UPDATE active_workout_sessions SET
        sets = $1,
        total_volume = $2,
        total_reps = $3,
        muscles_worked = $4,
        client_version = client_version + 1
      WHERE id = $5 AND user_id = $6
    `, [
      JSON.stringify(updatedSets),
      newTotalVolume,
      newTotalReps,
      JSON.stringify(musclesWorked),
      session.id,
      userId,
    ]);

    return true;
  }

  /**
   * Pause the workout session
   */
  async pauseSession(userId: string, sessionId: string): Promise<WorkoutSession> {
    const now = new Date();

    await query(`
      UPDATE active_workout_sessions SET
        paused_at = $1
      WHERE id = $2 AND user_id = $3 AND paused_at IS NULL
    `, [now, sessionId, userId]);

    return this.getSession(userId, sessionId);
  }

  /**
   * Resume a paused session
   */
  async resumeSession(userId: string, sessionId: string): Promise<WorkoutSession> {
    const session = await this.getSession(userId, sessionId);

    if (!session.pausedAt) {
      return session; // Not paused
    }

    const pausedDuration = Math.floor((Date.now() - session.pausedAt.getTime()) / 1000);

    await query(`
      UPDATE active_workout_sessions SET
        paused_at = NULL,
        total_paused_time = total_paused_time + $1
      WHERE id = $2 AND user_id = $3
    `, [pausedDuration, sessionId, userId]);

    return this.getSession(userId, sessionId);
  }

  /**
   * Update rest timer state
   */
  async updateRestTimer(
    userId: string,
    sessionId: string,
    remaining: number,
    total: number
  ): Promise<WorkoutSession> {
    const now = remaining > 0 ? new Date() : null;

    await query(`
      UPDATE active_workout_sessions SET
        rest_timer_remaining = $1,
        rest_timer_total_duration = $2,
        rest_timer_started_at = $3
      WHERE id = $4 AND user_id = $5
    `, [remaining > 0 ? remaining : null, total > 0 ? total : null, now, sessionId, userId]);

    return this.getSession(userId, sessionId);
  }

  /**
   * Complete the workout session and convert to permanent workout
   */
  async completeSession(userId: string, input: CompleteWorkoutInput): Promise<any> {
    const session = await this.getSession(userId, input.sessionId);

    if (session.sets.length === 0) {
      throw new Error('Cannot complete workout with no sets logged');
    }

    const endTime = new Date();
    const durationSeconds = Math.floor(
      (endTime.getTime() - session.startedAt.getTime() - (session.totalPausedTime * 1000)) / 1000
    );

    // Calculate final TU
    const totalTU = session.sets.reduce((sum, s) => sum + s.tu, 0);

    // Create permanent workout record
    const workoutId = `workout_${crypto.randomBytes(12).toString('hex')}`;
    const workoutDate = session.startedAt.toISOString().split('T')[0];

    // Convert sets to exercise summary format for backward compatibility
    const exerciseData = this.convertSetsToExerciseData(session.sets);
    const muscleActivations = this.convertMuscleWorkedToActivations(session.musclesWorked);

    await query(`
      INSERT INTO workouts (
        id, user_id, date, total_tu, credits_used, notes, is_public,
        exercise_data, muscle_activations, total_sets, total_reps,
        total_volume, duration_seconds, pr_count, muscle_volume
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      workoutId,
      userId,
      workoutDate,
      Math.round(totalTU * 100) / 100,
      25, // Default credit cost
      input.notes || null,
      input.isPublic !== false,
      JSON.stringify(exerciseData),
      JSON.stringify(muscleActivations),
      session.sets.length,
      session.totalReps,
      session.totalVolume,
      durationSeconds,
      session.sessionPRs.length,
      JSON.stringify(session.musclesWorked),
    ]);

    // Insert all sets into workout_sets with workout_id reference
    for (const set of session.sets) {
      await query(`
        INSERT INTO workout_sets (
          id, workout_id, user_id, exercise_id, set_number,
          weight, reps, duration_seconds, tag, rpe, rir,
          notes, is_pr_weight, is_pr_reps, is_pr_1rm, performed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT DO NOTHING
      `, [
        set.id,
        workoutId,
        userId,
        set.exerciseId,
        set.setNumber,
        set.weightKg,
        set.reps,
        set.durationSeconds,
        set.tag,
        set.rpe ? Math.round(set.rpe) : null,
        set.rir,
        set.notes,
        set.isPRWeight,
        set.isPRReps,
        set.isPR1RM,
        set.performedAt,
      ]);
    }

    // Archive the active session
    await query(`
      INSERT INTO archived_workout_sessions (
        id, user_id, original_session_id, session_data,
        archive_reason, started_at, recovered, recovered_workout_id
      ) VALUES ($1, $2, $3, $4, 'completed', $5, true, $6)
    `, [
      `aws_${crypto.randomBytes(12).toString('hex')}`,
      userId,
      session.id,
      JSON.stringify(session),
      session.startedAt,
      workoutId,
    ]);

    // Delete active session
    await query('DELETE FROM active_workout_sessions WHERE id = $1 AND user_id = $2', [input.sessionId, userId]);

    log.info({
      userId,
      sessionId: input.sessionId,
      workoutId,
      totalTU,
      setsCount: session.sets.length,
      durationSeconds,
    }, 'Workout session completed');

    return {
      workout: {
        id: workoutId,
        userId,
        exercises: exerciseData,
        notes: input.notes,
        totalTU: Math.round(totalTU * 100) / 100,
        createdAt: session.startedAt,
      },
      session,
      totalTU: Math.round(totalTU * 100) / 100,
      totalVolume: session.totalVolume,
      totalSets: session.sets.length,
      totalReps: session.totalReps,
      duration: Math.round(durationSeconds / 60),
      muscleBreakdown: session.musclesWorked,
      prsAchieved: session.sessionPRs,
      creditsCharged: 25,
      xpEarned: Math.round(totalTU * 10),
      levelUp: false, // TODO: Check for level up
      achievements: [],
    };
  }

  /**
   * Abandon workout session (discard without saving)
   */
  async abandonSession(userId: string, sessionId: string, reason?: string): Promise<boolean> {
    const session = await this.getSession(userId, sessionId);

    // Archive for potential recovery
    await query(`
      INSERT INTO archived_workout_sessions (
        id, user_id, original_session_id, session_data,
        archive_reason, started_at, recovered
      ) VALUES ($1, $2, $3, $4, $5, $6, false)
    `, [
      `aws_${crypto.randomBytes(12).toString('hex')}`,
      userId,
      session.id,
      JSON.stringify(session),
      reason || 'abandoned',
      session.startedAt,
    ]);

    // Delete active session
    await query('DELETE FROM active_workout_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);

    log.info({ userId, sessionId, reason }, 'Workout session abandoned');

    return true;
  }

  /**
   * Get recoverable sessions (archived but not recovered)
   */
  async getRecoverableSessions(userId: string, limit = 5): Promise<any[]> {
    const rows = await queryAll<any>(`
      SELECT id, original_session_id, session_data, archive_reason,
             started_at, archived_at
      FROM archived_workout_sessions
      WHERE user_id = $1 AND recovered = false
      AND archived_at > NOW() - INTERVAL '7 days'
      ORDER BY archived_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(row => {
      const data = row.session_data;
      return {
        id: row.id,
        startedAt: row.started_at,
        archivedAt: row.archived_at,
        archiveReason: row.archive_reason,
        setsLogged: data.sets?.length || 0,
        totalVolume: data.totalVolume || 0,
        musclesWorked: (data.musclesWorked || []).map((m: any) => m.muscleName),
        canRecover: true,
      };
    });
  }

  /**
   * Recover an archived session
   */
  async recoverSession(userId: string, archivedSessionId: string): Promise<WorkoutSession> {
    // Get archived session
    const archived = await queryOne<any>(
      'SELECT * FROM archived_workout_sessions WHERE id = $1 AND user_id = $2 AND recovered = false',
      [archivedSessionId, userId]
    );

    if (!archived) {
      throw new Error('Archived session not found or already recovered');
    }

    const sessionData = archived.session_data;

    // Create new active session with recovered data
    const newSessionId = `ws_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date();

    await query(`
      INSERT INTO active_workout_sessions (
        id, user_id, started_at, last_activity_at, workout_plan,
        current_exercise_index, current_set_index, sets,
        total_volume, total_reps, estimated_calories, muscles_worked,
        session_prs, client_version, server_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        id = $1,
        started_at = $3,
        last_activity_at = $4,
        workout_plan = $5,
        current_exercise_index = $6,
        current_set_index = $7,
        sets = $8,
        total_volume = $9,
        total_reps = $10,
        estimated_calories = $11,
        muscles_worked = $12,
        session_prs = $13,
        paused_at = NULL,
        total_paused_time = 0,
        client_version = 1,
        server_version = 1
    `, [
      newSessionId,
      userId,
      sessionData.startedAt || now,
      now,
      sessionData.workoutPlan ? JSON.stringify(sessionData.workoutPlan) : null,
      sessionData.currentExerciseIndex || 0,
      sessionData.sets?.length || 0,
      JSON.stringify(sessionData.sets || []),
      sessionData.totalVolume || 0,
      sessionData.totalReps || 0,
      sessionData.estimatedCalories || 0,
      JSON.stringify(sessionData.musclesWorked || []),
      JSON.stringify(sessionData.sessionPRs || []),
    ]);

    // Mark archived session as recovered
    await query(
      'UPDATE archived_workout_sessions SET recovered = true WHERE id = $1',
      [archivedSessionId]
    );

    log.info({ userId, archivedSessionId, newSessionId }, 'Workout session recovered');

    return this.getSession(userId, newSessionId);
  }

  /**
   * Get muscle breakdown for a session
   */
  async getMuscleBreakdown(userId: string, sessionId: string): Promise<MuscleActivationSummary[]> {
    const session = await this.getSession(userId, sessionId);
    return session.musclesWorked;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async calculateSetTU(
    exerciseId: string,
    reps: number,
    weightKg: number
  ): Promise<{ tu: number; muscleActivations: MuscleActivation[] }> {
    // Get muscle activations for this exercise
    const activations = await queryAll<{ muscle_id: string; activation: number }>(
      'SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1',
      [exerciseId]
    );

    if (activations.length === 0) {
      return { tu: 0, muscleActivations: [] };
    }

    // Get muscle names and bias weights
    const muscleIds = activations.map(a => a.muscle_id);
    const placeholders = muscleIds.map((_, i) => `$${i + 1}`).join(',');
    const muscles = await queryAll<{ id: string; name: string; bias_weight: number }>(
      `SELECT id, name, bias_weight FROM muscles WHERE id IN (${placeholders})`,
      muscleIds
    );

    const muscleMap = new Map(muscles.map(m => [m.id, m]));

    // Calculate TU: (reps / 10) * (activation / 100) * bias_weight
    // Volume factor: normalized by 10 reps being "1 unit"
    const volumeFactor = reps / 10;

    // Intensity factor from weight (simplified - assume 50kg = 1.0 baseline)
    const intensityFactor = weightKg > 0 ? Math.min(1.5, Math.max(0.5, weightKg / 50)) : 0.7;

    let totalTU = 0;
    const muscleActivations: MuscleActivation[] = [];

    for (const activation of activations) {
      const muscle = muscleMap.get(activation.muscle_id);
      if (!muscle) continue;

      const activationPercent = activation.activation / 100;
      const setTU = volumeFactor * intensityFactor * activationPercent * (muscle.bias_weight || 1);

      totalTU += setTU;

      muscleActivations.push({
        muscleId: activation.muscle_id,
        muscleName: muscle.name,
        activation: activation.activation,
        tu: Math.round(setTU * 100) / 100,
      });
    }

    return {
      tu: Math.round(totalTU * 100) / 100,
      muscleActivations,
    };
  }

  private async checkForPRs(
    userId: string,
    exerciseId: string,
    exerciseName: string,
    weightKg?: number,
    reps?: number
  ): Promise<SessionPR[]> {
    const prs: SessionPR[] = [];

    if (!weightKg && !reps) return prs;

    // Get previous best for this exercise
    const previousBest = await queryOne<{
      max_weight: number;
      max_reps: number;
      best_1rm: number;
    }>(`
      SELECT
        MAX(weight) as max_weight,
        MAX(reps) as max_reps,
        MAX(estimated_1rm) as best_1rm
      FROM workout_sets
      WHERE user_id = $1 AND exercise_id = $2
      AND tag != 'warmup'
    `, [userId, exerciseId]);

    const now = new Date();

    // Check weight PR
    if (weightKg && (!previousBest?.max_weight || weightKg > previousBest.max_weight)) {
      prs.push({
        exerciseId,
        exerciseName,
        prType: 'weight',
        previousValue: previousBest?.max_weight || null,
        newValue: weightKg,
        improvementPercent: previousBest?.max_weight
          ? Math.round(((weightKg - previousBest.max_weight) / previousBest.max_weight) * 100)
          : null,
        achievedAt: now,
      });
    }

    // Check reps PR (at same or higher weight)
    if (reps && weightKg && (!previousBest?.max_reps || reps > previousBest.max_reps)) {
      prs.push({
        exerciseId,
        exerciseName,
        prType: 'reps',
        previousValue: previousBest?.max_reps || null,
        newValue: reps,
        improvementPercent: previousBest?.max_reps
          ? Math.round(((reps - previousBest.max_reps) / previousBest.max_reps) * 100)
          : null,
        achievedAt: now,
      });
    }

    // Check estimated 1RM PR (Epley formula)
    if (weightKg && reps && reps > 1) {
      const estimated1RM = Math.round(weightKg * (1 + reps / 30));
      if (!previousBest?.best_1rm || estimated1RM > previousBest.best_1rm) {
        prs.push({
          exerciseId,
          exerciseName,
          prType: '1rm',
          previousValue: previousBest?.best_1rm || null,
          newValue: estimated1RM,
          improvementPercent: previousBest?.best_1rm
            ? Math.round(((estimated1RM - previousBest.best_1rm) / previousBest.best_1rm) * 100)
            : null,
          achievedAt: now,
        });
      }
    }

    return prs;
  }

  private updateMuscleSummary(
    existing: MuscleActivationSummary[],
    newActivations: MuscleActivation[]
  ): MuscleActivationSummary[] {
    const muscleMap = new Map(existing.map(m => [m.muscleId, { ...m }]));

    for (const activation of newActivations) {
      const current = muscleMap.get(activation.muscleId);
      if (current) {
        current.totalTU += activation.tu;
        current.setCount += 1;
      } else {
        muscleMap.set(activation.muscleId, {
          muscleId: activation.muscleId,
          muscleName: activation.muscleName,
          totalTU: activation.tu,
          setCount: 1,
          percentageOfMax: null,
        });
      }
    }

    // Calculate percentage of max
    const summaries = Array.from(muscleMap.values());
    const maxTU = Math.max(...summaries.map(s => s.totalTU), 1);
    for (const summary of summaries) {
      summary.percentageOfMax = Math.round((summary.totalTU / maxTU) * 100);
    }

    return summaries.sort((a, b) => b.totalTU - a.totalTU);
  }

  private recalculateMuscleSummary(sets: LoggedSet[]): MuscleActivationSummary[] {
    const muscleMap = new Map<string, MuscleActivationSummary>();

    for (const set of sets) {
      for (const activation of set.muscleActivations) {
        const current = muscleMap.get(activation.muscleId);
        if (current) {
          current.totalTU += activation.tu;
          current.setCount += 1;
        } else {
          muscleMap.set(activation.muscleId, {
            muscleId: activation.muscleId,
            muscleName: activation.muscleName,
            totalTU: activation.tu,
            setCount: 1,
            percentageOfMax: null,
          });
        }
      }
    }

    const summaries = Array.from(muscleMap.values());
    const maxTU = Math.max(...summaries.map(s => s.totalTU), 1);
    for (const summary of summaries) {
      summary.percentageOfMax = Math.round((summary.totalTU / maxTU) * 100);
    }

    return summaries.sort((a, b) => b.totalTU - a.totalTU);
  }

  private estimateCalories(totalVolume: number, setCount: number): number {
    // Rough estimate: ~0.1 calories per kg lifted + base metabolic cost per set
    return Math.round((totalVolume * 0.1) + (setCount * 5));
  }

  private async insertNormalizedSet(userId: string, sessionId: string, set: LoggedSet): Promise<void> {
    // Calculate estimated 1RM
    const estimated1RM = set.weightKg && set.reps && set.reps > 1
      ? Math.round(set.weightKg * (1 + (set.reps / 30)))
      : null;

    await query(`
      INSERT INTO workout_sets (
        id, workout_id, user_id, exercise_id, set_number,
        weight, reps, duration_seconds, tag, rpe, rir,
        estimated_1rm, notes, is_pr_weight, is_pr_reps, is_pr_1rm, performed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT DO NOTHING
    `, [
      set.id,
      sessionId, // Use session ID as temporary workout_id
      userId,
      set.exerciseId,
      set.setNumber,
      set.weightKg,
      set.reps,
      set.durationSeconds,
      set.tag,
      set.rpe ? Math.round(set.rpe) : null,
      set.rir,
      estimated1RM,
      set.notes,
      set.isPRWeight,
      set.isPRReps,
      set.isPR1RM,
      set.performedAt,
    ]);
  }

  private convertSetsToExerciseData(sets: LoggedSet[]): any[] {
    // Group sets by exercise
    const exerciseMap = new Map<string, { exerciseId: string; name: string; sets: number; reps: number; weight: number | null }>();

    for (const set of sets) {
      const existing = exerciseMap.get(set.exerciseId);
      if (existing) {
        existing.sets += 1;
        existing.reps = Math.max(existing.reps, set.reps || 0);
        if (set.weightKg) {
          existing.weight = Math.max(existing.weight || 0, set.weightKg);
        }
      } else {
        exerciseMap.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          name: set.exerciseName,
          sets: 1,
          reps: set.reps || 0,
          weight: set.weightKg,
        });
      }
    }

    return Array.from(exerciseMap.values());
  }

  private convertMuscleWorkedToActivations(musclesWorked: MuscleActivationSummary[]): Record<string, number> {
    const activations: Record<string, number> = {};
    for (const muscle of musclesWorked) {
      activations[muscle.muscleId] = muscle.totalTU;
    }
    return activations;
  }

  private mapRowToSession(row: any): WorkoutSession {
    return {
      id: row.id,
      userId: row.user_id,
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      totalPausedTime: row.total_paused_time || 0,
      lastActivityAt: row.last_activity_at,
      workoutPlan: row.workout_plan,
      currentExerciseIndex: row.current_exercise_index || 0,
      currentSetIndex: row.current_set_index || 0,
      sets: row.sets || [],
      totalVolume: parseFloat(row.total_volume) || 0,
      totalReps: row.total_reps || 0,
      estimatedCalories: row.estimated_calories || 0,
      musclesWorked: row.muscles_worked || [],
      sessionPRs: row.session_prs || [],
      restTimerRemaining: row.rest_timer_remaining,
      restTimerTotalDuration: row.rest_timer_total_duration,
      restTimerStartedAt: row.rest_timer_started_at,
      clientVersion: row.client_version || 1,
      serverVersion: row.server_version || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const workoutSessionService = new WorkoutSessionService();
