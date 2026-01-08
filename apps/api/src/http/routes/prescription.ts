/**
 * Prescription Routes (Fastify)
 *
 * Handles workout prescription generation with constraints.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';
import { economyService } from '../../modules/economy';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Constraint schema
const constraintSchema = z.object({
  timeAvailable: z.number().min(15).max(120).default(45),
  location: z.enum(['gym', 'home', 'park', 'hotel', 'office', 'travel']).default('gym'),
  equipmentAvailable: z.array(z.string()).optional(),
  goals: z.array(z.enum(['strength', 'hypertrophy', 'endurance', 'mobility', 'fat_loss'])).default(['hypertrophy']),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  targetMuscles: z.array(z.string()).optional(),
  excludeMuscles: z.array(z.string()).optional(),
  excludeExercises: z.array(z.string()).optional(),
  preferCompound: z.boolean().default(true),
  idempotencyKey: z.string().optional(),
});

/**
 * Score an exercise based on constraints
 */
function scoreExercise(
  exercise: any,
  constraints: z.infer<typeof constraintSchema>,
  recentExercises: Set<string>,
  muscleNeeds: Map<string, number>
): number {
  let score = 100;

  // Location match
  const locations = exercise.locations || ['gym'];
  if (!locations.includes(constraints.location)) {
    return 0; // Exclude exercises not available at location
  }

  // Equipment check
  const requiredEquipment = exercise.equipment_required || [];
  const availableEquipment = constraints.equipmentAvailable || [];
  for (const eq of requiredEquipment) {
    if (!availableEquipment.includes(eq)) {
      return 0; // Exclude if required equipment unavailable
    }
  }

  // Difficulty match
  const difficulty = exercise.difficulty || 2;
  const levelMap: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const userLevel = levelMap[constraints.fitnessLevel];
  if (difficulty > userLevel + 1) {
    score -= 30; // Penalize exercises too hard
  }

  // Compound preference
  if (constraints.preferCompound && exercise.is_compound) {
    score += 20;
  }

  // Muscle targeting
  const primaryMuscles = exercise.primary_muscles || [];
  for (const muscle of primaryMuscles) {
    if (constraints.targetMuscles?.includes(muscle)) {
      score += 15;
    }
    if (constraints.excludeMuscles?.includes(muscle)) {
      return 0;
    }
    const need = muscleNeeds.get(muscle) || 0;
    score += need * 10;
  }

  // Variety - penalize recently used
  if (recentExercises.has(exercise.id)) {
    score -= 40;
  }

  // Excluded exercises
  if (constraints.excludeExercises?.includes(exercise.id)) {
    return 0;
  }

  return Math.max(0, score);
}

/**
 * Generate a workout prescription
 */
async function generatePrescription(
  userId: string,
  constraints: z.infer<typeof constraintSchema>
): Promise<any> {
  // Get user's recent exercises (last 7 days)
  const recentWorkouts = await queryAll<{ exercise_data: unknown }>(
    `SELECT exercise_data FROM workouts
     WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId]
  );

  const recentExercises = new Set<string>();
  for (const w of recentWorkouts) {
    // exercise_data is JSONB so it may already be parsed as an object
    const exercises = typeof w.exercise_data === 'string'
      ? JSON.parse(w.exercise_data || '[]')
      : (w.exercise_data || []);
    for (const e of exercises) {
      recentExercises.add(e.exerciseId);
    }
  }

  // Get muscle needs (muscles not recently worked)
  const muscleNeeds = new Map<string, number>();
  const muscles = await queryAll<{ id: string; optimal_weekly_volume: number }>(
    'SELECT id, optimal_weekly_volume FROM muscles'
  );
  for (const m of muscles) {
    muscleNeeds.set(m.id, m.optimal_weekly_volume || 10);
  }

  // Reduce needs for recently worked muscles
  for (const w of recentWorkouts) {
    // exercise_data is JSONB so it may already be parsed as an object
    const exercises = typeof w.exercise_data === 'string'
      ? JSON.parse(w.exercise_data || '[]')
      : (w.exercise_data || []);
    for (const e of exercises) {
      // This is simplified - in reality we'd calculate actual activation
      for (const [muscleId, need] of muscleNeeds) {
        muscleNeeds.set(muscleId, Math.max(0, need - 2));
      }
    }
  }

  // Get available exercises
  const exercises = await queryAll<{
    id: string;
    name: string;
    type: string;
    difficulty: number;
    is_compound: boolean;
    estimated_seconds: number;
    rest_seconds: number;
    locations: string[];
    equipment_required: string[];
    primary_muscles: string[];
  }>('SELECT * FROM exercises');

  // Score and sort exercises
  const scoredExercises = exercises
    .map((ex) => ({
      exercise: ex,
      score: scoreExercise(ex, constraints, recentExercises, muscleNeeds),
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);

  // Select exercises to fit time budget
  const selectedExercises: any[] = [];
  let totalTime = 0;
  const targetTime = constraints.timeAvailable * 60; // Convert to seconds
  const warmupTime = 5 * 60; // 5 min warmup
  const cooldownTime = 5 * 60; // 5 min cooldown
  const workoutTime = targetTime - warmupTime - cooldownTime;

  for (const { exercise } of scoredExercises) {
    const exerciseTime = (exercise.estimated_seconds + exercise.rest_seconds) * 3; // 3 sets per exercise
    if (totalTime + exerciseTime <= workoutTime) {
      selectedExercises.push({
        id: exercise.id,
        name: exercise.name,
        sets: 3,
        estimatedSeconds: exercise.estimated_seconds,
        restSeconds: exercise.rest_seconds,
      });
      totalTime += exerciseTime;
    }
    if (selectedExercises.length >= 8) break; // Max 8 exercises
  }

  // Calculate muscle coverage
  const exerciseIds = selectedExercises.map((e) => e.id);
  const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');
  const activations = exerciseIds.length > 0
    ? await queryAll<{ exercise_id: string; muscle_id: string; activation: number }>(
        `SELECT exercise_id, muscle_id, activation FROM exercise_activations WHERE exercise_id IN (${placeholders})`,
        exerciseIds
      )
    : [];

  const muscleCoverage: Record<string, number> = {};
  for (const act of activations) {
    muscleCoverage[act.muscle_id] = (muscleCoverage[act.muscle_id] || 0) + act.activation;
  }

  return {
    exercises: selectedExercises,
    warmup: [
      { type: 'cardio', duration: 120, description: 'Light cardio (jumping jacks, jogging)' },
      { type: 'dynamic_stretch', duration: 180, description: 'Dynamic stretches' },
    ],
    cooldown: [
      { type: 'static_stretch', duration: 300, description: 'Static stretches' },
    ],
    muscleCoverage,
    estimatedDuration: Math.ceil(totalTime / 60) + 10, // Include warmup/cooldown
  };
}

export async function registerPrescriptionRoutes(app: FastifyInstance) {
  // Generate prescription
  app.post('/prescription/generate', { preHandler: authenticate }, async (request, reply) => {
    const constraints = constraintSchema.parse(request.body);
    const userId = request.user!.userId;

    // Check idempotency
    if (constraints.idempotencyKey) {
      const existing = await queryOne<{ id: string; exercises: string }>(
        'SELECT id, exercises FROM prescriptions WHERE id = $1',
        [constraints.idempotencyKey]
      );
      if (existing) {
        return reply.send({ data: { id: existing.id, exercises: JSON.parse(existing.exercises) } });
      }
    }

    // Charge credit
    const chargeResult = await economyService.charge({
      userId,
      action: 'prescription.generate',
      idempotencyKey: constraints.idempotencyKey || `rx-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      metadata: { constraints },
    });

    if (!chargeResult.success && chargeResult.error?.includes('Insufficient')) {
      return reply.status(402).send({
        error: { code: 'INSUFFICIENT_CREDITS', message: chargeResult.error, statusCode: 402 },
      });
    }

    // Generate prescription
    const prescription = await generatePrescription(userId, constraints);
    const prescriptionId = constraints.idempotencyKey || `rx_${crypto.randomBytes(12).toString('hex')}`;

    // Save prescription
    await query(
      `INSERT INTO prescriptions (id, user_id, constraints, exercises, warmup, cooldown, muscle_coverage, estimated_duration, actual_duration, credit_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        prescriptionId,
        userId,
        JSON.stringify(constraints),
        JSON.stringify(prescription.exercises),
        JSON.stringify(prescription.warmup),
        JSON.stringify(prescription.cooldown),
        JSON.stringify(prescription.muscleCoverage),
        prescription.estimatedDuration,
        prescription.estimatedDuration,
        1,
      ]
    );

    log.info({ prescriptionId, userId, exerciseCount: prescription.exercises.length }, 'Prescription generated');

    return reply.status(201).send({
      data: {
        id: prescriptionId,
        ...prescription,
      },
    });
  });

  // Get prescription
  app.get('/prescription/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const prescription = await queryOne<{
      id: string;
      user_id: string;
      constraints: string;
      exercises: string;
      warmup: string;
      cooldown: string;
      muscle_coverage: string;
      estimated_duration: number;
      created_at: Date;
    }>(
      'SELECT * FROM prescriptions WHERE id = $1 AND user_id = $2',
      [id, request.user!.userId]
    );

    if (!prescription) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Prescription not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        id: prescription.id,
        constraints: JSON.parse(prescription.constraints),
        exercises: JSON.parse(prescription.exercises),
        warmup: JSON.parse(prescription.warmup || '[]'),
        cooldown: JSON.parse(prescription.cooldown || '[]'),
        muscleCoverage: JSON.parse(prescription.muscle_coverage),
        estimatedDuration: prescription.estimated_duration,
        createdAt: prescription.created_at,
      },
    });
  });

  // V1 API compatibility
  app.post('/v1/prescription/generate', { preHandler: authenticate }, async (request, reply) => {
    const constraints = constraintSchema.parse(request.body);
    const prescription = await generatePrescription(request.user!.userId, constraints);
    return reply.send({ data: prescription });
  });
}
