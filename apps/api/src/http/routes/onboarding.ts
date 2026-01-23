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

// Date of birth schema - must be a valid date in the past, user must be 13+ years old
const dateOfBirthSchema = z.string().optional().transform((val) => {
  if (!val || val.trim() === '') return undefined;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(val)) return undefined;
  const date = new Date(val);
  if (isNaN(date.getTime())) return undefined;
  // Must be in the past
  const today = new Date();
  if (date >= today) return undefined;
  // Must be at least 13 years old
  const minAge = 13;
  const minBirthDate = new Date();
  minBirthDate.setFullYear(minBirthDate.getFullYear() - minAge);
  if (date > minBirthDate) return undefined;
  // Must not be more than 120 years ago (reasonable upper bound)
  const maxAge = 120;
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - maxAge);
  if (date < maxBirthDate) return undefined;
  return val;
});

// Validation schemas
const physicalProfileSchema = z.object({
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  dateOfBirth: dateOfBirthSchema,
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

  // ============================================
  // V2 INTENT-BASED ONBOARDING ENDPOINTS
  // ============================================

  /**
   * GET /onboarding/intents
   * Get all available onboarding intents
   */
  app.get('/onboarding/intents', async (request, reply) => {
    const intents = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      tagline: string | null;
      flow_steps: string[];
      estimated_time_minutes: number;
      requires_medical_disclaimer: boolean;
    }>(
      `SELECT id, name, description, icon, tagline, flow_steps, estimated_time_minutes, requires_medical_disclaimer
       FROM onboarding_intents
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );

    return reply.send({
      data: {
        intents: intents.map(i => ({
          id: i.id,
          name: i.name,
          description: i.description,
          icon: i.icon,
          tagline: i.tagline,
          flowSteps: i.flow_steps,
          estimatedTimeMinutes: i.estimated_time_minutes,
          requiresMedicalDisclaimer: i.requires_medical_disclaimer,
        })),
      },
    });
  });

  /**
   * GET /onboarding/steps
   * Get all onboarding steps (for reference)
   */
  app.get('/onboarding/steps', async (request, reply) => {
    const steps = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      step_type: string;
      component_name: string;
      is_skippable: boolean;
    }>(
      `SELECT id, name, description, step_type, component_name, is_skippable
       FROM onboarding_steps
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );

    return reply.send({
      data: {
        steps: steps.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          stepType: s.step_type,
          componentName: s.component_name,
          isSkippable: s.is_skippable,
        })),
      },
    });
  });

  /**
   * GET /onboarding/state
   * Get user's current onboarding state
   */
  app.get('/onboarding/state', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const state = await db.queryOne<{
      id: string;
      selected_intent: string | null;
      current_step: string | null;
      current_step_index: number;
      collected_data: Record<string, unknown>;
      status: string;
      started_at: string;
      last_activity_at: string;
      completed_at: string | null;
    }>(
      `SELECT id, selected_intent, current_step, current_step_index, collected_data, status, started_at, last_activity_at, completed_at
       FROM user_onboarding_state
       WHERE user_id = $1`,
      [userId]
    );

    if (!state) {
      return reply.send({
        data: {
          state: null,
          hasStarted: false,
        },
      });
    }

    // Get intent details if selected
    let intent = null;
    if (state.selected_intent) {
      intent = await db.queryOne<{
        id: string;
        name: string;
        flow_steps: string[];
      }>(
        `SELECT id, name, flow_steps FROM onboarding_intents WHERE id = $1`,
        [state.selected_intent]
      );
    }

    // Get current step details
    let currentStepDetails = null;
    if (state.current_step) {
      currentStepDetails = await db.queryOne<{
        id: string;
        name: string;
        step_type: string;
        component_name: string;
        is_skippable: boolean;
      }>(
        `SELECT id, name, step_type, component_name, is_skippable FROM onboarding_steps WHERE id = $1`,
        [state.current_step]
      );
    }

    return reply.send({
      data: {
        state: {
          id: state.id,
          selectedIntent: state.selected_intent,
          currentStep: state.current_step,
          currentStepIndex: state.current_step_index,
          collectedData: state.collected_data,
          status: state.status,
          startedAt: state.started_at,
          lastActivityAt: state.last_activity_at,
          completedAt: state.completed_at,
        },
        intent: intent ? {
          id: intent.id,
          name: intent.name,
          flowSteps: intent.flow_steps,
          totalSteps: intent.flow_steps.length,
        } : null,
        currentStepDetails: currentStepDetails ? {
          id: currentStepDetails.id,
          name: currentStepDetails.name,
          stepType: currentStepDetails.step_type,
          componentName: currentStepDetails.component_name,
          isSkippable: currentStepDetails.is_skippable,
        } : null,
        hasStarted: true,
      },
    });
  });

  /**
   * POST /onboarding/start
   * Start onboarding with a selected intent
   */
  app.post('/onboarding/start', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { intentId } = request.body as { intentId: string };

    // Validate intent
    const intent = await db.queryOne<{
      id: string;
      name: string;
      flow_steps: string[];
    }>(
      `SELECT id, name, flow_steps FROM onboarding_intents WHERE id = $1 AND is_active = TRUE`,
      [intentId]
    );

    if (!intent) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Intent not found', statusCode: 404 },
      });
    }

    const firstStep = intent.flow_steps[0];

    // Upsert onboarding state
    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_onboarding_state (user_id, selected_intent, current_step, current_step_index, status, collected_data)
       VALUES ($1, $2, $3, 0, 'in_progress', '{}')
       ON CONFLICT (user_id)
       DO UPDATE SET
         selected_intent = $2,
         current_step = $3,
         current_step_index = 0,
         status = 'in_progress',
         collected_data = '{}',
         last_activity_at = NOW(),
         updated_at = NOW()
       RETURNING id`,
      [userId, intentId, firstStep]
    );

    // Update user profile with intent
    await db.query(
      `INSERT INTO user_profile_extended (user_id, primary_intent, onboarding_version, updated_at)
       VALUES ($1, $2, 2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET primary_intent = $2, onboarding_version = 2, updated_at = NOW()`,
      [userId, intentId]
    );

    log.info({ userId, intentId }, 'User started onboarding v2');

    return reply.status(201).send({
      data: {
        stateId: result?.id,
        intentId,
        intentName: intent.name,
        currentStep: firstStep,
        totalSteps: intent.flow_steps.length,
      },
      message: 'Onboarding started',
    });
  });

  /**
   * POST /onboarding/step
   * Complete a step and advance to next
   */
  app.post('/onboarding/step', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { stepId, data: stepData, skipped } = request.body as {
      stepId: string;
      data?: Record<string, unknown>;
      skipped?: boolean;
    };

    // Get current state
    const state = await db.queryOne<{
      id: string;
      selected_intent: string;
      current_step: string;
      current_step_index: number;
      collected_data: Record<string, unknown>;
    }>(
      `SELECT id, selected_intent, current_step, current_step_index, collected_data
       FROM user_onboarding_state
       WHERE user_id = $1`,
      [userId]
    );

    if (!state) {
      return reply.status(400).send({
        error: { code: 'NO_STATE', message: 'Onboarding not started', statusCode: 400 },
      });
    }

    // Verify step matches current
    if (state.current_step !== stepId) {
      return reply.status(400).send({
        error: { code: 'STEP_MISMATCH', message: 'Step does not match current step', statusCode: 400 },
      });
    }

    // Get intent to find next step
    const intent = await db.queryOne<{ flow_steps: string[] }>(
      `SELECT flow_steps FROM onboarding_intents WHERE id = $1`,
      [state.selected_intent]
    );

    if (!intent) {
      return reply.status(400).send({
        error: { code: 'INVALID_INTENT', message: 'Invalid intent', statusCode: 400 },
      });
    }

    // Record step completion
    await db.query(
      `INSERT INTO onboarding_step_completions (user_id, state_id, step_id, input_data, skipped)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, state.id, stepId, JSON.stringify(stepData || {}), skipped || false]
    );

    // Merge step data into collected_data
    const updatedCollectedData = {
      ...state.collected_data,
      [stepId]: stepData || {},
    };

    const nextStepIndex = state.current_step_index + 1;
    const isComplete = nextStepIndex >= intent.flow_steps.length;
    const nextStep = isComplete ? null : intent.flow_steps[nextStepIndex];

    // Update state
    if (isComplete) {
      await db.query(
        `UPDATE user_onboarding_state
         SET current_step = NULL, current_step_index = $1, collected_data = $2,
             status = 'completed', completed_at = NOW(), last_activity_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [nextStepIndex, JSON.stringify(updatedCollectedData), state.id]
      );

      // Mark profile onboarding as complete
      await db.query(
        `UPDATE user_profile_extended SET onboarding_completed_at = NOW(), updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      log.info({ userId }, 'User completed onboarding v2');
    } else {
      await db.query(
        `UPDATE user_onboarding_state
         SET current_step = $1, current_step_index = $2, collected_data = $3,
             last_activity_at = NOW(), updated_at = NOW()
         WHERE id = $4`,
        [nextStep, nextStepIndex, JSON.stringify(updatedCollectedData), state.id]
      );
    }

    // Get next step details if not complete
    let nextStepDetails = null;
    if (nextStep) {
      nextStepDetails = await db.queryOne<{
        id: string;
        name: string;
        step_type: string;
        component_name: string;
        is_skippable: boolean;
      }>(
        `SELECT id, name, step_type, component_name, is_skippable FROM onboarding_steps WHERE id = $1`,
        [nextStep]
      );
    }

    return reply.send({
      data: {
        completed: isComplete,
        nextStep,
        nextStepIndex,
        totalSteps: intent.flow_steps.length,
        progress: Math.round((nextStepIndex / intent.flow_steps.length) * 100),
        nextStepDetails: nextStepDetails ? {
          id: nextStepDetails.id,
          name: nextStepDetails.name,
          stepType: nextStepDetails.step_type,
          componentName: nextStepDetails.component_name,
          isSkippable: nextStepDetails.is_skippable,
        } : null,
      },
    });
  });

  /**
   * POST /onboarding/back
   * Go back to previous step
   */
  app.post('/onboarding/back', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const state = await db.queryOne<{
      id: string;
      selected_intent: string;
      current_step_index: number;
    }>(
      `SELECT id, selected_intent, current_step_index
       FROM user_onboarding_state
       WHERE user_id = $1`,
      [userId]
    );

    if (!state || state.current_step_index <= 0) {
      return reply.status(400).send({
        error: { code: 'CANNOT_GO_BACK', message: 'Cannot go back further', statusCode: 400 },
      });
    }

    const intent = await db.queryOne<{ flow_steps: string[] }>(
      `SELECT flow_steps FROM onboarding_intents WHERE id = $1`,
      [state.selected_intent]
    );

    const prevStepIndex = state.current_step_index - 1;
    const prevStep = intent!.flow_steps[prevStepIndex];

    await db.query(
      `UPDATE user_onboarding_state
       SET current_step = $1, current_step_index = $2, last_activity_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [prevStep, prevStepIndex, state.id]
    );

    const stepDetails = await db.queryOne<{
      id: string;
      name: string;
      step_type: string;
      component_name: string;
      is_skippable: boolean;
    }>(
      `SELECT id, name, step_type, component_name, is_skippable FROM onboarding_steps WHERE id = $1`,
      [prevStep]
    );

    return reply.send({
      data: {
        currentStep: prevStep,
        currentStepIndex: prevStepIndex,
        stepDetails: stepDetails ? {
          id: stepDetails.id,
          name: stepDetails.name,
          stepType: stepDetails.step_type,
          componentName: stepDetails.component_name,
          isSkippable: stepDetails.is_skippable,
        } : null,
      },
    });
  });

  /**
   * GET /onboarding/injury-regions
   * Get injury regions for recovery flow
   */
  app.get('/onboarding/injury-regions', async (request, reply) => {
    const regions = await db.queryAll<{
      id: string;
      name: string;
      body_area: string;
      common_conditions: string[];
    }>(
      `SELECT id, name, body_area, common_conditions
       FROM injury_regions
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );

    // Group by body area
    const grouped: Record<string, typeof regions> = {};
    for (const region of regions) {
      if (!grouped[region.body_area]) {
        grouped[region.body_area] = [];
      }
      grouped[region.body_area].push(region);
    }

    return reply.send({
      data: {
        bodyAreas: Object.keys(grouped).map(area => ({
          area,
          regions: grouped[area].map(r => ({
            id: r.id,
            name: r.name,
            commonConditions: r.common_conditions,
          })),
        })),
      },
    });
  });

  /**
   * DELETE /onboarding/state
   * Reset onboarding state (start over)
   */
  app.delete('/onboarding/state', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    await db.query(`DELETE FROM user_onboarding_state WHERE user_id = $1`, [userId]);

    log.info({ userId }, 'User reset onboarding state');

    return reply.send({ message: 'Onboarding state reset' });
  });
}
