/**
 * Prescription Module
 *
 * Constraint-based workout prescription engine.
 */

import { Router, Request, Response } from 'express';
import { db, transaction } from '../../db/client';
import { authenticateToken } from '../auth';
import { asyncHandler, ValidationError } from '../../lib/errors';
import { entitlementsService } from '../entitlements';
import { economyService } from '../economy';
import { loggers } from '../../lib/logger';
import { z } from 'zod';
import crypto from 'crypto';

import {
  PrescriptionRequest,
  PrescriptionResponse,
  PrescribedExercise,
  LocationId,
  GoalType,
  FitnessLevel,
  WARMUP_TEMPLATES,
  COOLDOWN_TEMPLATES,
} from './types';
import { solveConstraints } from './constraint-solver';

const log = loggers.db;

// Request validation schema
const prescriptionRequestSchema = z.object({
  timeAvailable: z.number().int().min(15).max(120),
  location: z.enum(['gym', 'home', 'park', 'hotel', 'office', 'travel']),
  equipment: z.array(z.string()).default([]),
  goals: z.array(z.enum(['strength', 'hypertrophy', 'endurance', 'mobility', 'fat_loss'])).optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  excludedExercises: z.array(z.string()).optional(),
  excludedMuscles: z.array(z.string()).optional(),
  recentWorkoutIds: z.array(z.string()).optional(),
});

/**
 * Prescription Service
 */
export const prescriptionService = {
  /**
   * Generate a workout prescription based on constraints
   */
  async generate(userId: string, request: PrescriptionRequest): Promise<PrescriptionResponse> {
    return transaction(async (client) => {
      const prescriptionId = `rx_${crypto.randomBytes(12).toString('hex')}`;

      // Solve constraints
      const { exercises, coverage, actualDurationSeconds, substitutions } = await solveConstraints(request);

      if (exercises.length === 0) {
        throw new ValidationError(
          'No exercises match your constraints. Try relaxing location, equipment, or time requirements.'
        );
      }

      // Generate warmup based on workout focus
      const warmup = generateWarmup(exercises, request.timeAvailable);

      // Generate cooldown
      const cooldown = generateCooldown(request.timeAvailable);

      // Calculate actual duration in minutes
      const actualDuration = Math.ceil(actualDurationSeconds / 60);

      // Build response
      const response: PrescriptionResponse = {
        id: prescriptionId,
        exercises,
        estimatedDuration: request.timeAvailable,
        actualDuration,
        muscleCoverage: coverage,
        warmup: warmup.length > 0 ? warmup : undefined,
        cooldown: cooldown.length > 0 ? cooldown : undefined,
        substitutions,
        constraints: request,
        creditCost: 1,
        generatedAt: new Date().toISOString(),
      };

      // Store prescription in database
      await client.query(`
        INSERT INTO prescriptions (id, user_id, constraints, exercises, warmup, cooldown, substitutions, muscle_coverage, estimated_duration, actual_duration, credit_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        prescriptionId,
        userId,
        JSON.stringify(request),
        JSON.stringify(exercises),
        JSON.stringify(warmup),
        JSON.stringify(cooldown),
        JSON.stringify(substitutions),
        JSON.stringify(coverage),
        request.timeAvailable,
        actualDuration,
        1
      ]);

      log.info('Prescription generated', {
        prescriptionId,
        userId,
        exerciseCount: exercises.length,
        actualDuration,
      });

      return response;
    });
  },

  /**
   * Get a prescription by ID
   */
  async getById(id: string, userId?: string): Promise<PrescriptionResponse | null> {
    const row = await db.queryOne<any>(`
      SELECT * FROM prescriptions WHERE id = $1
    `, [id]);

    if (!row) return null;

    // Optionally check ownership
    if (userId && row.user_id !== userId) {
      return null;
    }

    return {
      id: row.id,
      exercises: JSON.parse(row.exercises),
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      muscleCoverage: JSON.parse(row.muscle_coverage),
      warmup: row.warmup ? JSON.parse(row.warmup) : undefined,
      cooldown: row.cooldown ? JSON.parse(row.cooldown) : undefined,
      substitutions: JSON.parse(row.substitutions || '{}'),
      constraints: JSON.parse(row.constraints),
      creditCost: row.credit_cost,
      generatedAt: row.created_at,
    };
  },

  /**
   * Get user's prescription history
   */
  async getByUser(userId: string, limit: number = 20): Promise<PrescriptionResponse[]> {
    const rows = await db.queryAll<any>(`
      SELECT * FROM prescriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(row => ({
      id: row.id,
      exercises: JSON.parse(row.exercises),
      estimatedDuration: row.estimated_duration,
      actualDuration: row.actual_duration,
      muscleCoverage: JSON.parse(row.muscle_coverage),
      warmup: row.warmup ? JSON.parse(row.warmup) : undefined,
      cooldown: row.cooldown ? JSON.parse(row.cooldown) : undefined,
      substitutions: JSON.parse(row.substitutions || '{}'),
      constraints: JSON.parse(row.constraints),
      creditCost: row.credit_cost,
      generatedAt: row.created_at,
    }));
  },
};

/**
 * Generate warmup exercises based on the main workout
 */
function generateWarmup(
  exercises: PrescribedExercise[],
  timeAvailable: number
): PrescribedExercise[] {
  if (timeAvailable < 30) return []; // Skip warmup for short workouts

  const warmup: PrescribedExercise[] = [];

  // Always start with general warmup
  warmup.push(WARMUP_TEMPLATES['jumping-jacks']);

  // Check if workout has upper body focus
  const hasUpperPush = exercises.some(e =>
    e.movementPattern === 'push' && e.primaryMuscles.some(m =>
      m.includes('chest') || m.includes('delt') || m.includes('triceps')
    )
  );

  const hasUpperPull = exercises.some(e =>
    e.movementPattern === 'pull' && e.primaryMuscles.some(m =>
      m.includes('lat') || m.includes('biceps') || m.includes('rhomboid')
    )
  );

  const hasLower = exercises.some(e =>
    ['squat', 'hinge'].includes(e.movementPattern)
  );

  if (hasUpperPush || hasUpperPull) {
    warmup.push(WARMUP_TEMPLATES['arm-circles']);
  }

  if (hasLower) {
    warmup.push(WARMUP_TEMPLATES['leg-swings']);
  }

  return warmup;
}

/**
 * Generate cooldown exercises
 */
function generateCooldown(timeAvailable: number): PrescribedExercise[] {
  if (timeAvailable < 30) return []; // Skip cooldown for short workouts

  return [
    COOLDOWN_TEMPLATES['deep-breathing'],
    COOLDOWN_TEMPLATES['child-pose'],
  ];
}

/**
 * Credit check middleware for prescription generation
 */
async function requireCreditsForPrescription(req: Request, res: Response, next: Function) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Check if user has unlimited access (trial or subscription)
  const entitlements = await entitlementsService.getEntitlements(userId);

  if (entitlements.unlimited) {
    // Trial or subscription - no credit needed
    (req as any).creditCost = 0;
    return next();
  }

  // Check credit balance
  const canPerform = await entitlementsService.canPerformAction(userId, 1);

  if (!canPerform.allowed) {
    const balance = await economyService.getBalance(userId);
    return res.status(402).json({
      error: {
        code: 'INSUFFICIENT_CREDITS',
        message: 'Insufficient credits',
        creditsNeeded: 1,
        currentBalance: balance,
        purchaseUrl: '/credits',
        pricePerHundred: '$1.00',
      },
    });
  }

  (req as any).creditCost = 1;
  next();
}

/**
 * Router
 */
export const prescriptionRouter = Router();

// Generate prescription
prescriptionRouter.post(
  '/generate',
  authenticateToken,
  requireCreditsForPrescription,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const data = prescriptionRequestSchema.parse(req.body);

    // Generate prescription
    const prescription = await prescriptionService.generate(userId, data as PrescriptionRequest);

    // Charge credit if needed
    const creditCost = (req as any).creditCost;
    if (creditCost > 0) {
      const chargeResult = await economyService.charge({
        userId,
        action: 'prescription.generate',
        amount: 1,
        idempotencyKey: `prescription-${prescription.id}`,
        metadata: {
          prescriptionId: prescription.id,
          timeAvailable: data.timeAvailable,
          location: data.location,
        },
      });

      if (!chargeResult.success) {
        // This shouldn't happen since we checked above, but handle it
        log.warn('Credit charge failed after prescription generation', {
          userId,
          prescriptionId: prescription.id,
          error: chargeResult.error,
        });
      }
    }

    res.status(201).json({ data: prescription });
  })
);

// Get prescription by ID
prescriptionRouter.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const prescription = await prescriptionService.getById(req.params.id, req.user!.userId);

    if (!prescription) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Prescription not found',
        },
      });
      return;
    }

    res.json({ data: prescription });
  })
);

// Get user's prescription history
prescriptionRouter.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const prescriptions = await prescriptionService.getByUser(req.user!.userId, limit);

    res.json({
      data: prescriptions,
      meta: { limit },
    });
  })
);

// Preview prescription (no credit charge, no storage)
prescriptionRouter.post(
  '/preview',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const data = prescriptionRequestSchema.parse(req.body);
    const { exercises, coverage, actualDurationSeconds, substitutions } = await solveConstraints(
      data as PrescriptionRequest
    );

    if (exercises.length === 0) {
      res.status(400).json({
        error: {
          code: 'NO_EXERCISES',
          message:
            'No exercises match your constraints. Try relaxing location, equipment, or time requirements.',
        },
      });
      return;
    }

    res.json({
      data: {
        exerciseCount: exercises.length,
        actualDuration: Math.ceil(actualDurationSeconds / 60),
        musclesCovered: Object.keys(coverage).length,
        exercises: exercises.map(e => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
        })),
      },
    });
  })
);
