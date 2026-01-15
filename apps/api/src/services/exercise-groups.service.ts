/**
 * Exercise Groups Service
 *
 * Manages supersets, giant sets, circuits, drop sets, and cluster sets.
 * Handles CRUD operations, rest time calculations, and preset management.
 */

import { query, queryOne, queryAll } from '../db/client';
import { loggers } from '../lib/logger';
import { z } from 'zod';

const log = loggers.db;

// ============================================
// TYPES & SCHEMAS
// ============================================

export const GROUP_TYPES = {
  SUPERSET: 'superset',
  GIANT_SET: 'giant_set',
  CIRCUIT: 'circuit',
  DROP_SET: 'drop_set',
  CLUSTER: 'cluster',
} as const;

export type GroupType = typeof GROUP_TYPES[keyof typeof GROUP_TYPES];

const exerciseInGroupSchema = z.object({
  exerciseId: z.string(),
  order: z.number().int().min(0),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.union([z.number().int(), z.string()]).optional(), // Can be "8-12" or 10
  weight: z.number().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export type ExerciseInGroup = z.infer<typeof exerciseInGroupSchema>;

const createGroupSchema = z.object({
  workoutId: z.string().optional(),
  templateId: z.string().optional(),
  programDayId: z.string().optional(),
  groupType: z.enum(['superset', 'giant_set', 'circuit', 'drop_set', 'cluster']),
  exercises: z.array(exerciseInGroupSchema).min(2).max(10),
  restBetweenExercises: z.number().int().min(0).max(600).optional(),
  restAfterGroup: z.number().int().min(0).max(600).optional(),
  circuitRounds: z.number().int().min(1).max(20).optional(),
  circuitTimed: z.boolean().optional(),
  circuitTimePerExercise: z.number().int().min(5).max(300).optional(),
  circuitTransitionTime: z.number().int().min(0).max(60).optional(),
  name: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

const updateGroupSchema = createGroupSchema.partial().omit({ workoutId: true, templateId: true, programDayId: true });

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

const logGroupSetSchema = z.object({
  groupId: z.string(),
  workoutId: z.string(),
  roundNumber: z.number().int().min(1),
  exerciseIndex: z.number().int().min(0),
  exerciseId: z.string(),
  weight: z.number().min(0).optional(),
  reps: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  rir: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
  skipped: z.boolean().optional(),
});

export type LogGroupSetInput = z.infer<typeof logGroupSetSchema>;

export interface ExerciseGroup {
  id: string;
  workoutId: string | null;
  templateId: string | null;
  programDayId: string | null;
  userId: string;
  groupType: GroupType;
  exercises: ExerciseInGroup[];
  restBetweenExercises: number;
  restAfterGroup: number;
  circuitRounds: number;
  circuitTimed: boolean;
  circuitTimePerExercise: number;
  circuitTransitionTime: number;
  name: string | null;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupPreset {
  id: string;
  userId: string;
  name: string;
  groupType: GroupType;
  exercises: ExerciseInGroup[];
  restBetweenExercises: number;
  restAfterGroup: number;
  circuitRounds: number;
  circuitTimed: boolean;
  circuitTimePerExercise: number;
  color: string;
  timesUsed: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SERVICE CLASS
// ============================================

class ExerciseGroupsService {
  /**
   * Create a new exercise group
   */
  async createGroup(userId: string, input: CreateGroupInput): Promise<ExerciseGroup> {
    const data = createGroupSchema.parse(input);

    // Validate that at least one parent is provided
    if (!data.workoutId && !data.templateId && !data.programDayId) {
      throw new Error('Exercise group must belong to a workout, template, or program day');
    }

    // Validate group type matches exercise count
    if (data.groupType === GROUP_TYPES.SUPERSET && data.exercises.length !== 2) {
      throw new Error('Superset must have exactly 2 exercises');
    }
    if (data.groupType === GROUP_TYPES.GIANT_SET && data.exercises.length < 3) {
      throw new Error('Giant set must have at least 3 exercises');
    }

    // Apply default rest times based on group type
    const restBetween = data.restBetweenExercises ?? this.getDefaultRestBetween(data.groupType);
    const restAfter = data.restAfterGroup ?? this.getDefaultRestAfter(data.groupType);

    const result = await queryOne<ExerciseGroup>(
      `INSERT INTO exercise_groups (
        user_id, workout_id, template_id, program_day_id,
        group_type, exercises,
        rest_between_exercises, rest_after_group,
        circuit_rounds, circuit_timed, circuit_time_per_exercise, circuit_transition_time,
        name, color, position
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING
        id, workout_id as "workoutId", template_id as "templateId",
        program_day_id as "programDayId", user_id as "userId",
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        circuit_transition_time as "circuitTransitionTime",
        name, color, position,
        created_at as "createdAt", updated_at as "updatedAt"`,
      [
        userId,
        data.workoutId || null,
        data.templateId || null,
        data.programDayId || null,
        data.groupType,
        JSON.stringify(data.exercises),
        restBetween,
        restAfter,
        data.circuitRounds || 1,
        data.circuitTimed || false,
        data.circuitTimePerExercise || 30,
        data.circuitTransitionTime || 10,
        data.name || null,
        data.color || '#0066FF',
        data.position || 0,
      ]
    );

    if (!result) {
      throw new Error('Failed to create exercise group');
    }

    log.info({ groupId: result.id, userId, groupType: data.groupType }, 'Exercise group created');
    return result;
  }

  /**
   * Get a single exercise group by ID
   */
  async getGroup(groupId: string, userId: string): Promise<ExerciseGroup | null> {
    return queryOne<ExerciseGroup>(
      `SELECT
        id, workout_id as "workoutId", template_id as "templateId",
        program_day_id as "programDayId", user_id as "userId",
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        circuit_transition_time as "circuitTransitionTime",
        name, color, position,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM exercise_groups
      WHERE id = $1 AND user_id = $2`,
      [groupId, userId]
    );
  }

  /**
   * Get all groups for a workout
   */
  async getGroupsForWorkout(workoutId: string, userId: string): Promise<ExerciseGroup[]> {
    return queryAll<ExerciseGroup>(
      `SELECT
        id, workout_id as "workoutId", template_id as "templateId",
        program_day_id as "programDayId", user_id as "userId",
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        circuit_transition_time as "circuitTransitionTime",
        name, color, position,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM exercise_groups
      WHERE workout_id = $1 AND user_id = $2
      ORDER BY position ASC`,
      [workoutId, userId]
    );
  }

  /**
   * Get all groups for a template
   */
  async getGroupsForTemplate(templateId: string): Promise<ExerciseGroup[]> {
    return queryAll<ExerciseGroup>(
      `SELECT
        id, workout_id as "workoutId", template_id as "templateId",
        program_day_id as "programDayId", user_id as "userId",
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        circuit_transition_time as "circuitTransitionTime",
        name, color, position,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM exercise_groups
      WHERE template_id = $1
      ORDER BY position ASC`,
      [templateId]
    );
  }

  /**
   * Update an exercise group
   */
  async updateGroup(groupId: string, userId: string, input: UpdateGroupInput): Promise<ExerciseGroup | null> {
    const data = updateGroupSchema.parse(input);

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.groupType !== undefined) {
      updates.push(`group_type = $${paramIndex++}`);
      values.push(data.groupType);
    }
    if (data.exercises !== undefined) {
      updates.push(`exercises = $${paramIndex++}`);
      values.push(JSON.stringify(data.exercises));
    }
    if (data.restBetweenExercises !== undefined) {
      updates.push(`rest_between_exercises = $${paramIndex++}`);
      values.push(data.restBetweenExercises);
    }
    if (data.restAfterGroup !== undefined) {
      updates.push(`rest_after_group = $${paramIndex++}`);
      values.push(data.restAfterGroup);
    }
    if (data.circuitRounds !== undefined) {
      updates.push(`circuit_rounds = $${paramIndex++}`);
      values.push(data.circuitRounds);
    }
    if (data.circuitTimed !== undefined) {
      updates.push(`circuit_timed = $${paramIndex++}`);
      values.push(data.circuitTimed);
    }
    if (data.circuitTimePerExercise !== undefined) {
      updates.push(`circuit_time_per_exercise = $${paramIndex++}`);
      values.push(data.circuitTimePerExercise);
    }
    if (data.circuitTransitionTime !== undefined) {
      updates.push(`circuit_transition_time = $${paramIndex++}`);
      values.push(data.circuitTransitionTime);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }
    if (data.position !== undefined) {
      updates.push(`position = $${paramIndex++}`);
      values.push(data.position);
    }

    if (updates.length === 0) {
      return this.getGroup(groupId, userId);
    }

    values.push(groupId, userId);

    const result = await queryOne<ExerciseGroup>(
      `UPDATE exercise_groups
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING
        id, workout_id as "workoutId", template_id as "templateId",
        program_day_id as "programDayId", user_id as "userId",
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        circuit_transition_time as "circuitTransitionTime",
        name, color, position,
        created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result) {
      log.info({ groupId, userId }, 'Exercise group updated');
    }

    return result;
  }

  /**
   * Delete an exercise group
   */
  async deleteGroup(groupId: string, userId: string): Promise<boolean> {
    const result = await queryOne<{ id: string }>(
      `DELETE FROM exercise_groups WHERE id = $1 AND user_id = $2 RETURNING id`,
      [groupId, userId]
    );

    if (result) {
      log.info({ groupId, userId }, 'Exercise group deleted');
      return true;
    }

    return false;
  }

  /**
   * Reorder exercises within a group
   */
  async reorderExercises(groupId: string, userId: string, newOrder: string[]): Promise<ExerciseGroup | null> {
    const group = await this.getGroup(groupId, userId);
    if (!group) return null;

    // Reorder exercises based on the new order array (array of exerciseIds)
    const exerciseMap = new Map(group.exercises.map(e => [e.exerciseId, e]));
    const reorderedExercises = newOrder.map((exerciseId, index) => {
      const exercise = exerciseMap.get(exerciseId);
      if (!exercise) {
        throw new Error(`Exercise ${exerciseId} not found in group`);
      }
      return { ...exercise, order: index };
    });

    return this.updateGroup(groupId, userId, { exercises: reorderedExercises });
  }

  /**
   * Add an exercise to an existing group
   */
  async addExerciseToGroup(
    groupId: string,
    userId: string,
    exerciseData: ExerciseInGroup
  ): Promise<ExerciseGroup | null> {
    const group = await this.getGroup(groupId, userId);
    if (!group) return null;

    // Check if exercise already exists in group
    if (group.exercises.some(e => e.exerciseId === exerciseData.exerciseId)) {
      throw new Error('Exercise already exists in group');
    }

    // Add to the end
    const newExercise = { ...exerciseData, order: group.exercises.length };
    const updatedExercises = [...group.exercises, newExercise];

    // Auto-upgrade superset to giant set if adding 3rd exercise
    let groupType = group.groupType;
    if (groupType === GROUP_TYPES.SUPERSET && updatedExercises.length > 2) {
      groupType = GROUP_TYPES.GIANT_SET;
    }

    return this.updateGroup(groupId, userId, { exercises: updatedExercises, groupType });
  }

  /**
   * Remove an exercise from a group
   */
  async removeExerciseFromGroup(
    groupId: string,
    userId: string,
    exerciseId: string
  ): Promise<ExerciseGroup | null> {
    const group = await this.getGroup(groupId, userId);
    if (!group) return null;

    const updatedExercises = group.exercises
      .filter(e => e.exerciseId !== exerciseId)
      .map((e, index) => ({ ...e, order: index }));

    if (updatedExercises.length < 2) {
      throw new Error('Cannot remove exercise: group must have at least 2 exercises');
    }

    // Auto-downgrade giant set to superset if only 2 exercises remain
    let groupType = group.groupType;
    if (groupType === GROUP_TYPES.GIANT_SET && updatedExercises.length === 2) {
      groupType = GROUP_TYPES.SUPERSET;
    }

    return this.updateGroup(groupId, userId, { exercises: updatedExercises, groupType });
  }

  /**
   * Log a set within an exercise group
   */
  async logGroupSet(userId: string, input: LogGroupSetInput): Promise<{ id: string }> {
    const data = logGroupSetSchema.parse(input);

    const result = await queryOne<{ id: string }>(
      `INSERT INTO exercise_group_sets (
        group_id, workout_id, user_id,
        round_number, exercise_index, exercise_id,
        weight, reps, duration_seconds, rpe, rir, notes, skipped
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        data.groupId,
        data.workoutId,
        userId,
        data.roundNumber,
        data.exerciseIndex,
        data.exerciseId,
        data.weight || null,
        data.reps,
        data.durationSeconds || null,
        data.rpe || null,
        data.rir || null,
        data.notes || null,
        data.skipped || false,
      ]
    );

    if (!result) {
      throw new Error('Failed to log group set');
    }

    return result;
  }

  /**
   * Get all logged sets for a group in a workout
   */
  async getGroupSets(groupId: string, workoutId: string, userId: string) {
    return queryAll(
      `SELECT
        id, round_number as "roundNumber", exercise_index as "exerciseIndex",
        exercise_id as "exerciseId", weight, reps, duration_seconds as "durationSeconds",
        rpe, rir, notes, skipped, performed_at as "performedAt"
      FROM exercise_group_sets
      WHERE group_id = $1 AND workout_id = $2 AND user_id = $3
      ORDER BY round_number ASC, exercise_index ASC, performed_at ASC`,
      [groupId, workoutId, userId]
    );
  }

  // ============================================
  // PRESETS
  // ============================================

  /**
   * Save current group as a preset
   */
  async saveAsPreset(
    userId: string,
    name: string,
    group: Pick<ExerciseGroup, 'groupType' | 'exercises' | 'restBetweenExercises' | 'restAfterGroup' | 'circuitRounds' | 'circuitTimed' | 'circuitTimePerExercise' | 'color'>
  ): Promise<GroupPreset> {
    const result = await queryOne<GroupPreset>(
      `INSERT INTO exercise_group_presets (
        user_id, name, group_type, exercises,
        rest_between_exercises, rest_after_group,
        circuit_rounds, circuit_timed, circuit_time_per_exercise, color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id, user_id as "userId", name,
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        color, times_used as "timesUsed",
        last_used_at as "lastUsedAt",
        created_at as "createdAt", updated_at as "updatedAt"`,
      [
        userId,
        name,
        group.groupType,
        JSON.stringify(group.exercises),
        group.restBetweenExercises,
        group.restAfterGroup,
        group.circuitRounds,
        group.circuitTimed,
        group.circuitTimePerExercise,
        group.color,
      ]
    );

    if (!result) {
      throw new Error('Failed to save preset');
    }

    log.info({ presetId: result.id, userId, name }, 'Exercise group preset saved');
    return result;
  }

  /**
   * Get user's presets
   */
  async getPresets(userId: string): Promise<GroupPreset[]> {
    return queryAll<GroupPreset>(
      `SELECT
        id, user_id as "userId", name,
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        color, times_used as "timesUsed",
        last_used_at as "lastUsedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM exercise_group_presets
      WHERE user_id = $1
      ORDER BY times_used DESC, updated_at DESC`,
      [userId]
    );
  }

  /**
   * Create a group from a preset
   */
  async createFromPreset(
    userId: string,
    presetId: string,
    parentRef: { workoutId?: string; templateId?: string; programDayId?: string }
  ): Promise<ExerciseGroup> {
    const preset = await queryOne<GroupPreset>(
      `SELECT
        group_type as "groupType", exercises,
        rest_between_exercises as "restBetweenExercises",
        rest_after_group as "restAfterGroup",
        circuit_rounds as "circuitRounds",
        circuit_timed as "circuitTimed",
        circuit_time_per_exercise as "circuitTimePerExercise",
        color
      FROM exercise_group_presets
      WHERE id = $1 AND user_id = $2`,
      [presetId, userId]
    );

    if (!preset) {
      throw new Error('Preset not found');
    }

    // Update preset usage
    await query(
      `UPDATE exercise_group_presets
       SET times_used = times_used + 1, last_used_at = NOW()
       WHERE id = $1`,
      [presetId]
    );

    return this.createGroup(userId, {
      ...parentRef,
      groupType: preset.groupType,
      exercises: preset.exercises,
      restBetweenExercises: preset.restBetweenExercises,
      restAfterGroup: preset.restAfterGroup,
      circuitRounds: preset.circuitRounds,
      circuitTimed: preset.circuitTimed,
      circuitTimePerExercise: preset.circuitTimePerExercise,
      color: preset.color,
    });
  }

  /**
   * Delete a preset
   */
  async deletePreset(presetId: string, userId: string): Promise<boolean> {
    const result = await queryOne<{ id: string }>(
      `DELETE FROM exercise_group_presets WHERE id = $1 AND user_id = $2 RETURNING id`,
      [presetId, userId]
    );
    return !!result;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get default rest between exercises based on group type
   */
  getDefaultRestBetween(groupType: GroupType): number {
    switch (groupType) {
      case GROUP_TYPES.SUPERSET:
        return 0; // No rest between superset exercises
      case GROUP_TYPES.GIANT_SET:
        return 0; // No rest between giant set exercises
      case GROUP_TYPES.CIRCUIT:
        return 10; // Quick transition
      case GROUP_TYPES.DROP_SET:
        return 0; // Immediate drop
      case GROUP_TYPES.CLUSTER:
        return 15; // Brief pause for cluster sets
      default:
        return 0;
    }
  }

  /**
   * Get default rest after completing group based on type
   */
  getDefaultRestAfter(groupType: GroupType): number {
    switch (groupType) {
      case GROUP_TYPES.SUPERSET:
        return 90; // Standard rest after superset
      case GROUP_TYPES.GIANT_SET:
        return 120; // Longer rest after giant set
      case GROUP_TYPES.CIRCUIT:
        return 60; // Rest between rounds
      case GROUP_TYPES.DROP_SET:
        return 120; // Longer rest after drop set
      case GROUP_TYPES.CLUSTER:
        return 180; // Full rest after cluster
      default:
        return 90;
    }
  }

  /**
   * Calculate total estimated time for a group
   */
  calculateGroupDuration(group: ExerciseGroup): number {
    const exerciseCount = group.exercises.length;

    if (group.circuitTimed) {
      // Timed circuit: (time per exercise + transition) * exercises * rounds
      const perRound = (group.circuitTimePerExercise + group.circuitTransitionTime) * exerciseCount;
      return (perRound * group.circuitRounds) + ((group.circuitRounds - 1) * group.restAfterGroup);
    }

    // Non-timed: estimate based on sets/reps
    // Assume 30 seconds per set average + rest times
    let totalSets = 0;
    for (const exercise of group.exercises) {
      totalSets += exercise.sets || 3;
    }

    const exerciseTime = totalSets * 30; // 30s per set average
    const restBetween = (exerciseCount - 1) * group.restBetweenExercises * group.circuitRounds;
    const restAfter = (group.circuitRounds - 1) * group.restAfterGroup;

    return exerciseTime + restBetween + restAfter;
  }

  /**
   * Get group display label (e.g., "2x Superset", "3x Circuit")
   */
  getGroupLabel(group: ExerciseGroup): string {
    const count = group.exercises.length;
    const rounds = group.circuitRounds > 1 ? ` x ${group.circuitRounds}` : '';

    switch (group.groupType) {
      case GROUP_TYPES.SUPERSET:
        return `${count}x Superset${rounds}`;
      case GROUP_TYPES.GIANT_SET:
        return `${count}x Giant Set${rounds}`;
      case GROUP_TYPES.CIRCUIT:
        return `${count}x Circuit${rounds}`;
      case GROUP_TYPES.DROP_SET:
        return `Drop Set (${count})`;
      case GROUP_TYPES.CLUSTER:
        return `Cluster Set${rounds}`;
      default:
        return `${count}x Group`;
    }
  }
}

export const exerciseGroupsService = new ExerciseGroupsService();
