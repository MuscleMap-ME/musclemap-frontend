/**
 * Exercise Groups Routes (Fastify)
 *
 * API endpoints for managing supersets, giant sets, circuits, and other exercise groupings.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { exerciseGroupsService, GROUP_TYPES } from '../../services/exercise-groups.service';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================
// VALIDATION SCHEMAS
// ============================================

const exerciseInGroupSchema = z.object({
  exerciseId: z.string(),
  order: z.number().int().min(0),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.union([z.number().int(), z.string()]).optional(),
  weight: z.number().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

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

const updateGroupSchema = createGroupSchema.partial().omit({
  workoutId: true,
  templateId: true,
  programDayId: true,
});

const logGroupSetSchema = z.object({
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

const savePresetSchema = z.object({
  name: z.string().min(1).max(100),
  groupType: z.enum(['superset', 'giant_set', 'circuit', 'drop_set', 'cluster']),
  exercises: z.array(exerciseInGroupSchema).min(2).max(10),
  restBetweenExercises: z.number().int().min(0).max(600).optional(),
  restAfterGroup: z.number().int().min(0).max(600).optional(),
  circuitRounds: z.number().int().min(1).max(20).optional(),
  circuitTimed: z.boolean().optional(),
  circuitTimePerExercise: z.number().int().min(5).max(300).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// ============================================
// ROUTES
// ============================================

export async function registerExerciseGroupRoutes(app: FastifyInstance) {
  // ============================================
  // GROUP CRUD
  // ============================================

  /**
   * Create a new exercise group
   * POST /api/exercise-groups
   */
  app.post('/exercise-groups', { preHandler: authenticate }, async (request, reply) => {
    try {
      const data = createGroupSchema.parse(request.body);
      const userId = request.user!.userId;

      const group = await exerciseGroupsService.createGroup(userId, data);

      return reply.status(201).send({
        data: {
          ...group,
          label: exerciseGroupsService.getGroupLabel(group),
          estimatedDuration: exerciseGroupsService.calculateGroupDuration(group),
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.errors[0].message, statusCode: 400 },
        });
      }
      log.error({ error: error.message }, 'Failed to create exercise group');
      return reply.status(400).send({
        error: { code: 'CREATE_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Get exercise groups for a workout
   * GET /api/workouts/:workoutId/groups
   */
  app.get('/workouts/:workoutId/groups', { preHandler: authenticate }, async (request, reply) => {
    const { workoutId } = request.params as { workoutId: string };
    const userId = request.user!.userId;

    const groups = await exerciseGroupsService.getGroupsForWorkout(workoutId, userId);

    return reply.send({
      data: groups.map((group) => ({
        ...group,
        label: exerciseGroupsService.getGroupLabel(group),
        estimatedDuration: exerciseGroupsService.calculateGroupDuration(group),
      })),
    });
  });

  /**
   * Get a single exercise group
   * GET /api/exercise-groups/:groupId
   */
  app.get('/exercise-groups/:groupId', { preHandler: authenticate }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const userId = request.user!.userId;

    const group = await exerciseGroupsService.getGroup(groupId, userId);

    if (!group) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Exercise group not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        ...group,
        label: exerciseGroupsService.getGroupLabel(group),
        estimatedDuration: exerciseGroupsService.calculateGroupDuration(group),
      },
    });
  });

  /**
   * Update an exercise group
   * PUT /api/exercise-groups/:groupId
   */
  app.put('/exercise-groups/:groupId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const data = updateGroupSchema.parse(request.body);
      const userId = request.user!.userId;

      const group = await exerciseGroupsService.updateGroup(groupId, userId, data);

      if (!group) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Exercise group not found', statusCode: 404 },
        });
      }

      return reply.send({
        data: {
          ...group,
          label: exerciseGroupsService.getGroupLabel(group),
          estimatedDuration: exerciseGroupsService.calculateGroupDuration(group),
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.errors[0].message, statusCode: 400 },
        });
      }
      log.error({ error: error.message }, 'Failed to update exercise group');
      return reply.status(400).send({
        error: { code: 'UPDATE_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Delete an exercise group
   * DELETE /api/exercise-groups/:groupId
   */
  app.delete('/exercise-groups/:groupId', { preHandler: authenticate }, async (request, reply) => {
    const { groupId } = request.params as { groupId: string };
    const userId = request.user!.userId;

    const deleted = await exerciseGroupsService.deleteGroup(groupId, userId);

    if (!deleted) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Exercise group not found', statusCode: 404 },
      });
    }

    return reply.status(204).send();
  });

  // ============================================
  // GROUP EXERCISE MANAGEMENT
  // ============================================

  /**
   * Reorder exercises within a group
   * PUT /api/exercise-groups/:groupId/reorder
   */
  app.put('/exercise-groups/:groupId/reorder', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const { exerciseOrder } = z.object({
        exerciseOrder: z.array(z.string()).min(2).max(10),
      }).parse(request.body);
      const userId = request.user!.userId;

      const group = await exerciseGroupsService.reorderExercises(groupId, userId, exerciseOrder);

      if (!group) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Exercise group not found', statusCode: 404 },
        });
      }

      return reply.send({
        data: {
          ...group,
          label: exerciseGroupsService.getGroupLabel(group),
        },
      });
    } catch (error: any) {
      log.error({ error: error.message }, 'Failed to reorder exercises');
      return reply.status(400).send({
        error: { code: 'REORDER_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Add an exercise to a group
   * POST /api/exercise-groups/:groupId/exercises
   */
  app.post('/exercise-groups/:groupId/exercises', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const exerciseData = exerciseInGroupSchema.parse(request.body);
      const userId = request.user!.userId;

      const group = await exerciseGroupsService.addExerciseToGroup(groupId, userId, exerciseData);

      if (!group) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Exercise group not found', statusCode: 404 },
        });
      }

      return reply.send({
        data: {
          ...group,
          label: exerciseGroupsService.getGroupLabel(group),
        },
      });
    } catch (error: any) {
      log.error({ error: error.message }, 'Failed to add exercise to group');
      return reply.status(400).send({
        error: { code: 'ADD_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Remove an exercise from a group
   * DELETE /api/exercise-groups/:groupId/exercises/:exerciseId
   */
  app.delete('/exercise-groups/:groupId/exercises/:exerciseId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { groupId, exerciseId } = request.params as { groupId: string; exerciseId: string };
      const userId = request.user!.userId;

      const group = await exerciseGroupsService.removeExerciseFromGroup(groupId, userId, exerciseId);

      if (!group) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Exercise group not found', statusCode: 404 },
        });
      }

      return reply.send({
        data: {
          ...group,
          label: exerciseGroupsService.getGroupLabel(group),
        },
      });
    } catch (error: any) {
      log.error({ error: error.message }, 'Failed to remove exercise from group');
      return reply.status(400).send({
        error: { code: 'REMOVE_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  // ============================================
  // SET LOGGING
  // ============================================

  /**
   * Log a set within an exercise group
   * POST /api/workouts/:workoutId/groups/:groupId/sets
   */
  app.post('/workouts/:workoutId/groups/:groupId/sets', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { workoutId, groupId } = request.params as { workoutId: string; groupId: string };
      const setData = logGroupSetSchema.parse(request.body);
      const userId = request.user!.userId;

      const result = await exerciseGroupsService.logGroupSet(userId, {
        ...setData,
        groupId,
        workoutId,
      });

      return reply.status(201).send({ data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.errors[0].message, statusCode: 400 },
        });
      }
      log.error({ error: error.message }, 'Failed to log group set');
      return reply.status(400).send({
        error: { code: 'LOG_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Get logged sets for an exercise group
   * GET /api/workouts/:workoutId/groups/:groupId/sets
   */
  app.get('/workouts/:workoutId/groups/:groupId/sets', { preHandler: authenticate }, async (request, reply) => {
    const { workoutId, groupId } = request.params as { workoutId: string; groupId: string };
    const userId = request.user!.userId;

    const sets = await exerciseGroupsService.getGroupSets(groupId, workoutId, userId);

    return reply.send({ data: sets });
  });

  // ============================================
  // PRESETS
  // ============================================

  /**
   * Get user's exercise group presets
   * GET /api/exercise-group-presets
   */
  app.get('/exercise-group-presets', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const presets = await exerciseGroupsService.getPresets(userId);

    return reply.send({ data: presets });
  });

  /**
   * Save an exercise group as a preset
   * POST /api/exercise-group-presets
   */
  app.post('/exercise-group-presets', { preHandler: authenticate }, async (request, reply) => {
    try {
      const data = savePresetSchema.parse(request.body);
      const userId = request.user!.userId;

      const preset = await exerciseGroupsService.saveAsPreset(userId, data.name, {
        groupType: data.groupType,
        exercises: data.exercises,
        restBetweenExercises: data.restBetweenExercises || 0,
        restAfterGroup: data.restAfterGroup || 90,
        circuitRounds: data.circuitRounds || 1,
        circuitTimed: data.circuitTimed || false,
        circuitTimePerExercise: data.circuitTimePerExercise || 30,
        color: data.color || '#0066FF',
      });

      return reply.status(201).send({ data: preset });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.errors[0].message, statusCode: 400 },
        });
      }
      log.error({ error: error.message }, 'Failed to save preset');
      return reply.status(400).send({
        error: { code: 'SAVE_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Create a group from a preset
   * POST /api/exercise-group-presets/:presetId/apply
   */
  app.post('/exercise-group-presets/:presetId/apply', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { presetId } = request.params as { presetId: string };
      const { workoutId, templateId, programDayId } = z.object({
        workoutId: z.string().optional(),
        templateId: z.string().optional(),
        programDayId: z.string().optional(),
      }).parse(request.body);
      const userId = request.user!.userId;

      if (!workoutId && !templateId && !programDayId) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: 'Must specify workoutId, templateId, or programDayId', statusCode: 400 },
        });
      }

      const group = await exerciseGroupsService.createFromPreset(userId, presetId, {
        workoutId,
        templateId,
        programDayId,
      });

      return reply.status(201).send({
        data: {
          ...group,
          label: exerciseGroupsService.getGroupLabel(group),
          estimatedDuration: exerciseGroupsService.calculateGroupDuration(group),
        },
      });
    } catch (error: any) {
      log.error({ error: error.message }, 'Failed to create group from preset');
      return reply.status(400).send({
        error: { code: 'CREATE_FAILED', message: error.message, statusCode: 400 },
      });
    }
  });

  /**
   * Delete a preset
   * DELETE /api/exercise-group-presets/:presetId
   */
  app.delete('/exercise-group-presets/:presetId', { preHandler: authenticate }, async (request, reply) => {
    const { presetId } = request.params as { presetId: string };
    const userId = request.user!.userId;

    const deleted = await exerciseGroupsService.deletePreset(presetId, userId);

    if (!deleted) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Preset not found', statusCode: 404 },
      });
    }

    return reply.status(204).send();
  });

  // ============================================
  // UTILITY ENDPOINTS
  // ============================================

  /**
   * Get group type information and defaults
   * GET /api/exercise-groups/types
   */
  app.get('/exercise-groups/types', async (_request, reply) => {
    const types = Object.entries(GROUP_TYPES).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      defaultRestBetween: exerciseGroupsService.getDefaultRestBetween(value),
      defaultRestAfter: exerciseGroupsService.getDefaultRestAfter(value),
      minExercises: value === 'superset' ? 2 : value === 'giant_set' ? 3 : 2,
      maxExercises: 10,
      supportsRounds: ['circuit', 'giant_set', 'cluster'].includes(value),
      supportsTimed: value === 'circuit',
      description: getGroupTypeDescription(value),
    }));

    return reply.send({ data: types });
  });
}

/**
 * Get description for a group type
 */
function getGroupTypeDescription(type: string): string {
  switch (type) {
    case 'superset':
      return 'Perform 2 exercises back-to-back with no rest between them. Rest only after completing both exercises.';
    case 'giant_set':
      return 'Perform 3 or more exercises consecutively with minimal rest between them. Great for metabolic conditioning.';
    case 'circuit':
      return 'Rotate through multiple exercises for a set number of rounds. Can be time-based or rep-based.';
    case 'drop_set':
      return 'Perform an exercise to failure, then immediately reduce weight and continue. Repeat for multiple drops.';
    case 'cluster':
      return 'Perform a few reps, rest briefly (10-20 seconds), then repeat. Allows heavier weights with accumulated volume.';
    default:
      return '';
  }
}
