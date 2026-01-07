/**
 * Onboarding Routes (Fastify)
 *
 * Handles user onboarding flow including:
 * - Checking onboarding status
 * - Saving physical profile (height, weight, DOB, gender, units)
 * - Saving home equipment
 * - Completing onboarding
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { setUserHomeEquipment } from '../../services/equipment.service';

const log = loggers.core;

// Validation schemas
const physicalProfileSchema = z.object({
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  heightCm: z.number().positive().optional(),
  heightFt: z.number().int().min(0).max(9).optional(),
  heightIn: z.number().min(0).max(11.9).optional(),
  weightKg: z.number().positive().optional(),
  weightLbs: z.number().positive().optional(),
  preferredUnits: z.enum(['metric', 'imperial']),
});

const homeEquipmentSchema = z.object({
  equipmentIds: z.array(z.string()),
  locationType: z.enum(['home', 'work', 'other']).default('home'),
});

// Helper to convert between units
function convertHeight(
  heightCm?: number,
  heightFt?: number,
  heightIn?: number,
  preferredUnits?: 'metric' | 'imperial'
): { heightCm: number | null; heightFt: number | null; heightIn: number | null } {
  if (preferredUnits === 'metric' && heightCm) {
    // Convert cm to ft/in for storage
    const totalInches = heightCm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { heightCm, heightFt: ft, heightIn: Math.round(inches * 10) / 10 };
  } else if (preferredUnits === 'imperial' && heightFt !== undefined) {
    // Convert ft/in to cm for storage
    const totalInches = (heightFt || 0) * 12 + (heightIn || 0);
    const cm = totalInches * 2.54;
    return {
      heightCm: Math.round(cm * 10) / 10,
      heightFt: heightFt || 0,
      heightIn: heightIn || 0,
    };
  }
  return { heightCm: heightCm || null, heightFt: heightFt || null, heightIn: heightIn || null };
}

function convertWeight(
  weightKg?: number,
  weightLbs?: number,
  preferredUnits?: 'metric' | 'imperial'
): { weightKg: number | null; weightLbs: number | null } {
  if (preferredUnits === 'metric' && weightKg) {
    // Convert kg to lbs for storage
    return { weightKg, weightLbs: Math.round(weightKg * 2.20462 * 10) / 10 };
  } else if (preferredUnits === 'imperial' && weightLbs) {
    // Convert lbs to kg for storage
    return { weightKg: Math.round(weightLbs / 2.20462 * 10) / 10, weightLbs };
  }
  return { weightKg: weightKg || null, weightLbs: weightLbs || null };
}

export async function registerOnboardingRoutes(app: FastifyInstance) {
  /**
   * GET /onboarding/status
   * Check if user needs to complete onboarding
   */
  app.get('/onboarding/status', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const profile = await db.queryOne<{
      onboarding_completed_at: string | null;
      gender: string | null;
      preferred_units: string | null;
    }>(
      `SELECT onboarding_completed_at, gender, preferred_units
       FROM user_profile_extended
       WHERE user_id = $1`,
      [userId]
    );

    const completed = !!profile?.onboarding_completed_at;

    return reply.send({
      data: {
        completed,
        completedAt: profile?.onboarding_completed_at || null,
        hasProfile: !!profile,
        hasGender: !!profile?.gender,
        hasUnits: !!profile?.preferred_units,
      },
    });
  });

  /**
   * GET /onboarding/profile
   * Get current physical profile (for editing)
   */
  app.get('/onboarding/profile', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const profile = await db.queryOne<{
      gender: string | null;
      date_of_birth: string | null;
      height_cm: number | null;
      height_ft: number | null;
      height_in: number | null;
      weight_kg: number | null;
      weight_lbs: number | null;
      preferred_units: string | null;
      onboarding_completed_at: string | null;
    }>(
      `SELECT gender, date_of_birth, height_cm, height_ft, height_in,
              weight_kg, weight_lbs, preferred_units, onboarding_completed_at
       FROM user_profile_extended
       WHERE user_id = $1`,
      [userId]
    );

    return reply.send({
      data: {
        gender: profile?.gender || null,
        dateOfBirth: profile?.date_of_birth || null,
        heightCm: profile?.height_cm || null,
        heightFt: profile?.height_ft || null,
        heightIn: profile?.height_in || null,
        weightKg: profile?.weight_kg || null,
        weightLbs: profile?.weight_lbs || null,
        preferredUnits: profile?.preferred_units || 'metric',
        onboardingCompletedAt: profile?.onboarding_completed_at || null,
      },
    });
  });

  /**
   * POST /onboarding/profile
   * Save physical profile during onboarding
   */
  app.post('/onboarding/profile', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = physicalProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid profile data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const data = parsed.data;

    // Convert heights/weights to store both units
    const heights = convertHeight(data.heightCm, data.heightFt, data.heightIn, data.preferredUnits);
    const weights = convertWeight(data.weightKg, data.weightLbs, data.preferredUnits);

    // Upsert profile
    await db.query(
      `INSERT INTO user_profile_extended (
        user_id, gender, date_of_birth, height_cm, height_ft, height_in,
        weight_kg, weight_lbs, preferred_units, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        gender = COALESCE($2, user_profile_extended.gender),
        date_of_birth = COALESCE($3, user_profile_extended.date_of_birth),
        height_cm = COALESCE($4, user_profile_extended.height_cm),
        height_ft = COALESCE($5, user_profile_extended.height_ft),
        height_in = COALESCE($6, user_profile_extended.height_in),
        weight_kg = COALESCE($7, user_profile_extended.weight_kg),
        weight_lbs = COALESCE($8, user_profile_extended.weight_lbs),
        preferred_units = $9,
        updated_at = NOW()`,
      [
        userId,
        data.gender || null,
        data.dateOfBirth || null,
        heights.heightCm,
        heights.heightFt,
        heights.heightIn,
        weights.weightKg,
        weights.weightLbs,
        data.preferredUnits,
      ]
    );

    log.info({ userId, preferredUnits: data.preferredUnits }, 'User saved physical profile');

    return reply.send({
      data: {
        success: true,
        message: 'Profile saved successfully',
      },
    });
  });

  /**
   * POST /onboarding/home-equipment
   * Save user's home equipment during onboarding
   */
  app.post('/onboarding/home-equipment', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = homeEquipmentSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid equipment data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const { equipmentIds, locationType } = parsed.data;

    await setUserHomeEquipment(userId, equipmentIds, locationType);

    log.info({ userId, equipmentCount: equipmentIds.length, locationType }, 'User saved home equipment');

    return reply.send({
      data: {
        success: true,
        message: 'Home equipment saved successfully',
        equipmentCount: equipmentIds.length,
      },
    });
  });

  /**
   * POST /onboarding/complete
   * Mark onboarding as complete
   */
  app.post('/onboarding/complete', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Ensure profile exists and mark as complete
    await db.query(
      `INSERT INTO user_profile_extended (user_id, onboarding_completed_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET onboarding_completed_at = NOW(), updated_at = NOW()`,
      [userId]
    );

    log.info({ userId }, 'User completed onboarding');

    return reply.send({
      data: {
        success: true,
        message: 'Onboarding completed',
        completedAt: new Date().toISOString(),
      },
    });
  });

  /**
   * POST /onboarding/skip
   * Skip onboarding (for users who want to go straight to the app)
   */
  app.post('/onboarding/skip', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Mark as complete without filling in profile
    await db.query(
      `INSERT INTO user_profile_extended (user_id, onboarding_completed_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET onboarding_completed_at = NOW(), updated_at = NOW()`,
      [userId]
    );

    log.info({ userId }, 'User skipped onboarding');

    return reply.send({
      data: {
        success: true,
        message: 'Onboarding skipped',
        skipped: true,
      },
    });
  });
}
