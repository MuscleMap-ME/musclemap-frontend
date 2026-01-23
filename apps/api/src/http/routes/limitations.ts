/**
 * Limitations Routes (Fastify)
 *
 * Manages user physical limitations, disabilities, and exercise modifications.
 * Provides personalized exercise substitutions based on user's limitations.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Limitation types
const LIMITATION_TYPES = [
  'injury', 'chronic_condition', 'disability', 'surgery_recovery',
  'mobility_restriction', 'pain', 'weakness', 'amputation',
  'prosthetic', 'age_related', 'pregnancy', 'other'
] as const;

const SEVERITY_LEVELS = ['mild', 'moderate', 'severe', 'complete'] as const;
const STATUS_TYPES = ['active', 'recovering', 'resolved', 'permanent'] as const;

// Create limitation schema
const createLimitationSchema = z.object({
  bodyRegionId: z.string().optional(),
  limitationType: z.enum(LIMITATION_TYPES),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  status: z.enum(STATUS_TYPES).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  medicalNotes: z.string().optional(),
  avoidMovements: z.array(z.string()).optional(),
  avoidImpact: z.boolean().optional(),
  avoidWeightBearing: z.boolean().optional(),
  maxWeightLbs: z.number().optional(),
  maxReps: z.number().optional(),
  romFlexionPercent: z.number().min(0).max(100).optional(),
  romExtensionPercent: z.number().min(0).max(100).optional(),
  romRotationPercent: z.number().min(0).max(100).optional(),
  onsetDate: z.string().optional(),
  expectedRecoveryDate: z.string().optional(),
  diagnosedBy: z.string().optional(),
  ptApproved: z.boolean().optional(),
});

// Update limitation schema
const updateLimitationSchema = createLimitationSchema.partial();

export interface Limitation {
  id: string;
  userId: string;
  bodyRegionId: string | null;
  bodyRegionName: string | null;
  limitationType: string;
  severity: string;
  status: string;
  name: string;
  description: string | null;
  avoidMovements: string[];
  avoidImpact: boolean;
  avoidWeightBearing: boolean;
  maxWeightLbs: number | null;
  maxReps: number | null;
  onsetDate: string | null;
  expectedRecoveryDate: string | null;
}

export interface BodyRegion {
  id: string;
  name: string;
  parentRegion: string | null;
  icon: string | null;
}

export async function registerLimitationsRoutes(app: FastifyInstance) {
  // Debug hook to log all incoming limitation requests
  app.addHook('preHandler', async (request, _reply) => {
    if (request.url.startsWith('/limitations') && request.method === 'POST') {
      log.info({
        url: request.url,
        method: request.method,
        contentType: request.headers['content-type'],
        contentLength: request.headers['content-length'],
        hasBody: !!request.body,
        bodyType: typeof request.body,
        bodyKeys: request.body && typeof request.body === 'object' ? Object.keys(request.body as object) : [],
        rawBody: request.body,
      }, '[LIMITATION DEBUG] Incoming POST request');
    }
  });

  /**
   * GET /limitations/body-regions
   * Get all body regions for selection
   */
  app.get('/limitations/body-regions', { preHandler: authenticate }, async (request, reply) => {
    const regions = await db.queryAll<{
      id: string;
      name: string;
      parent_region: string | null;
      display_order: number;
      icon: string | null;
    }>(
      `SELECT id, name, parent_region, display_order, icon
       FROM body_regions
       ORDER BY display_order, name`
    );

    // Organize into hierarchy
    const topLevel = regions.filter(r => !r.parent_region);
    const byParent = regions.reduce((acc, r) => {
      if (r.parent_region) {
        if (!acc[r.parent_region]) acc[r.parent_region] = [];
        acc[r.parent_region].push(r);
      }
      return acc;
    }, {} as Record<string, typeof regions>);

    const organized = topLevel.map(parent => ({
      id: parent.id,
      name: parent.name,
      icon: parent.icon,
      children: (byParent[parent.id] || []).map(child => ({
        id: child.id,
        name: child.name,
        icon: child.icon,
      })),
    }));

    return reply.send({ data: { regions: organized } });
  });

  /**
   * GET /limitations
   * Get all limitations for the current user
   */
  app.get('/limitations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { status } = request.query as { status?: string };

    let query = `
      SELECT
        l.id, l.user_id, l.body_region_id, l.limitation_type,
        l.severity, l.status, l.name, l.description, l.medical_notes,
        l.avoid_movements, l.avoid_impact, l.avoid_weight_bearing,
        l.max_weight_lbs, l.max_reps,
        l.rom_flexion_percent, l.rom_extension_percent, l.rom_rotation_percent,
        l.onset_date, l.expected_recovery_date, l.last_reviewed,
        l.diagnosed_by, l.pt_approved,
        l.created_at, l.updated_at,
        br.name as body_region_name
      FROM user_limitations l
      LEFT JOIN body_regions br ON l.body_region_id = br.id
      WHERE l.user_id = $1
    `;
    const params: unknown[] = [userId];

    if (status) {
      query += ` AND l.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY l.status ASC, l.severity DESC, l.created_at DESC`;

    const rows = await db.queryAll<{
      id: string;
      user_id: string;
      body_region_id: string | null;
      limitation_type: string;
      severity: string;
      status: string;
      name: string;
      description: string | null;
      medical_notes: string | null;
      avoid_movements: string[] | null;
      avoid_impact: boolean;
      avoid_weight_bearing: boolean;
      max_weight_lbs: number | null;
      max_reps: number | null;
      rom_flexion_percent: number | null;
      rom_extension_percent: number | null;
      rom_rotation_percent: number | null;
      onset_date: string | null;
      expected_recovery_date: string | null;
      last_reviewed: string | null;
      diagnosed_by: string | null;
      pt_approved: boolean;
      body_region_name: string | null;
    }>(query, params);

    const limitations = rows.map(row => ({
      id: row.id,
      bodyRegionId: row.body_region_id,
      bodyRegionName: row.body_region_name,
      limitationType: row.limitation_type,
      severity: row.severity,
      status: row.status,
      name: row.name,
      description: row.description,
      medicalNotes: row.medical_notes,
      avoidMovements: row.avoid_movements || [],
      avoidImpact: row.avoid_impact,
      avoidWeightBearing: row.avoid_weight_bearing,
      maxWeightLbs: row.max_weight_lbs,
      maxReps: row.max_reps,
      romFlexionPercent: row.rom_flexion_percent,
      romExtensionPercent: row.rom_extension_percent,
      romRotationPercent: row.rom_rotation_percent,
      onsetDate: row.onset_date,
      expectedRecoveryDate: row.expected_recovery_date,
      lastReviewed: row.last_reviewed,
      diagnosedBy: row.diagnosed_by,
      ptApproved: row.pt_approved,
    }));

    return reply.send({ data: { limitations } });
  });

  /**
   * POST /limitations
   * Create a new limitation
   */
  app.post('/limitations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Debug logging for troubleshooting
    log.info({ userId, body: request.body }, 'Received limitation creation request');

    const parsed = createLimitationSchema.safeParse(request.body);

    if (!parsed.success) {
      log.warn({ userId, errors: parsed.error.errors, body: request.body }, 'Limitation validation failed');
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid limitation data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const data = parsed.data;

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_limitations (
        user_id, body_region_id, limitation_type, severity, status,
        name, description, medical_notes, avoid_movements,
        avoid_impact, avoid_weight_bearing, max_weight_lbs, max_reps,
        rom_flexion_percent, rom_extension_percent, rom_rotation_percent,
        onset_date, expected_recovery_date, diagnosed_by, pt_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id`,
      [
        userId,
        data.bodyRegionId ?? null,
        data.limitationType,
        data.severity ?? 'moderate',
        data.status ?? 'active',
        data.name,
        data.description ?? null,
        data.medicalNotes ?? null,
        data.avoidMovements ?? null,
        data.avoidImpact ?? false,
        data.avoidWeightBearing ?? false,
        data.maxWeightLbs ?? null,
        data.maxReps ?? null,
        data.romFlexionPercent ?? null,
        data.romExtensionPercent ?? null,
        data.romRotationPercent ?? null,
        data.onsetDate ?? null,
        data.expectedRecoveryDate ?? null,
        data.diagnosedBy ?? null,
        data.ptApproved ?? false,
      ]
    );

    log.info({ userId, limitationId: result?.id, type: data.limitationType }, 'Limitation created');

    return reply.status(201).send({
      data: { id: result?.id },
      message: 'Limitation recorded successfully',
    });
  });

  /**
   * PUT /limitations/:id
   * Update a limitation
   */
  app.put('/limitations/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const parsed = updateLimitationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid limitation data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Verify ownership
    const existing = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_limitations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Limitation not found', statusCode: 404 },
      });
    }

    const data = parsed.data;

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMappings: Record<string, string> = {
      bodyRegionId: 'body_region_id',
      limitationType: 'limitation_type',
      severity: 'severity',
      status: 'status',
      name: 'name',
      description: 'description',
      medicalNotes: 'medical_notes',
      avoidMovements: 'avoid_movements',
      avoidImpact: 'avoid_impact',
      avoidWeightBearing: 'avoid_weight_bearing',
      maxWeightLbs: 'max_weight_lbs',
      maxReps: 'max_reps',
      romFlexionPercent: 'rom_flexion_percent',
      romExtensionPercent: 'rom_extension_percent',
      romRotationPercent: 'rom_rotation_percent',
      onsetDate: 'onset_date',
      expectedRecoveryDate: 'expected_recovery_date',
      diagnosedBy: 'diagnosed_by',
      ptApproved: 'pt_approved',
    };

    for (const [key, dbColumn] of Object.entries(fieldMappings)) {
      const value = (data as Record<string, unknown>)[key];
      if (value !== undefined) {
        updates.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    updates.push('updated_at = NOW()');

    if (updates.length > 0) {
      values.push(id, userId);
      await db.query(
        `UPDATE user_limitations SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      );
    }

    log.info({ userId, limitationId: id }, 'Limitation updated');

    return reply.send({ message: 'Limitation updated successfully' });
  });

  /**
   * DELETE /limitations/:id
   * Delete a limitation
   */
  app.delete('/limitations/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    await db.query(
      `DELETE FROM user_limitations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    log.info({ userId, limitationId: id }, 'Limitation deleted');

    return reply.send({ message: 'Limitation deleted successfully' });
  });

  /**
   * GET /limitations/substitutions/:exerciseId
   * Get exercise substitutions based on user's limitations
   */
  app.get('/limitations/substitutions/:exerciseId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { exerciseId } = request.params as { exerciseId: string };

    // Get user's active limitations
    const limitations = await db.queryAll<{
      body_region_id: string | null;
      limitation_type: string;
      severity: string;
    }>(
      `SELECT body_region_id, limitation_type, severity
       FROM user_limitations
       WHERE user_id = $1 AND status IN ('active', 'recovering')`,
      [userId]
    );

    if (limitations.length === 0) {
      return reply.send({
        data: {
          substitutions: [],
          warnings: [],
          message: 'No active limitations found - all exercises available',
        },
      });
    }

    // Get exercise flags for this exercise
    const flags = await db.queryAll<{
      flag_type: string;
      severity_threshold: string;
      warning_message: string | null;
      modification_instructions: string | null;
      body_region_id: string | null;
      limitation_type: string | null;
    }>(
      `SELECT flag_type, severity_threshold, warning_message, modification_instructions, body_region_id, limitation_type
       FROM limitation_exercise_flags
       WHERE exercise_id = $1`,
      [exerciseId]
    );

    // Check if any flags apply to user's limitations
    const warnings: { type: string; message: string; modification?: string }[] = [];
    const severityOrder = ['mild', 'moderate', 'severe', 'complete'];

    for (const limitation of limitations) {
      for (const flag of flags) {
        // Check if flag applies to this limitation
        const regionMatch = !flag.body_region_id || flag.body_region_id === limitation.body_region_id;
        const typeMatch = !flag.limitation_type || flag.limitation_type === limitation.limitation_type;
        const severityIndex = severityOrder.indexOf(limitation.severity);
        const thresholdIndex = severityOrder.indexOf(flag.severity_threshold);
        const severityMatch = severityIndex >= thresholdIndex;

        if (regionMatch && typeMatch && severityMatch) {
          warnings.push({
            type: flag.flag_type,
            message: flag.warning_message || `Exercise flagged: ${flag.flag_type}`,
            modification: flag.modification_instructions || undefined,
          });
        }
      }
    }

    // Get substitutions based on user's limitations
    const substitutionConditions = limitations.map((l, i) => {
      const conditions: string[] = [];
      if (l.body_region_id) {
        conditions.push(`body_region_id = $${i * 2 + 2}`);
      }
      if (l.limitation_type) {
        conditions.push(`limitation_type = $${i * 2 + 3}`);
      }
      return conditions.length > 0 ? `(${conditions.join(' AND ')})` : null;
    }).filter(Boolean);

    let substitutions: {
      substituteExerciseId: string;
      reason: string | null;
      notes: string | null;
      similarityScore: number;
    }[] = [];

    if (substitutionConditions.length > 0) {
      const params: unknown[] = [exerciseId];
      limitations.forEach(l => {
        params.push(l.body_region_id, l.limitation_type);
      });

      const subs = await db.queryAll<{
        substitute_exercise_id: string;
        reason: string | null;
        notes: string | null;
        similarity_score: number;
      }>(
        `SELECT substitute_exercise_id, reason, notes, similarity_score
         FROM exercise_substitutions
         WHERE original_exercise_id = $1
         AND (${substitutionConditions.join(' OR ')})
         ORDER BY similarity_score DESC
         LIMIT 5`,
        params
      );

      substitutions = subs.map(s => ({
        substituteExerciseId: s.substitute_exercise_id,
        reason: s.reason,
        notes: s.notes,
        similarityScore: s.similarity_score,
      }));
    }

    return reply.send({
      data: {
        exerciseId,
        warnings,
        substitutions,
        shouldAvoid: warnings.some(w => w.type === 'avoid'),
      },
    });
  });

  /**
   * GET /limitations/check-workout
   * Check a list of exercises against user's limitations
   */
  app.post('/limitations/check-workout', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { exerciseIds } = request.body as { exerciseIds: string[] };

    if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'exerciseIds array required', statusCode: 400 },
      });
    }

    // Get user's active limitations
    const limitations = await db.queryAll<{
      body_region_id: string | null;
      limitation_type: string;
      severity: string;
      avoid_movements: string[] | null;
    }>(
      `SELECT body_region_id, limitation_type, severity, avoid_movements
       FROM user_limitations
       WHERE user_id = $1 AND status IN ('active', 'recovering')`,
      [userId]
    );

    if (limitations.length === 0) {
      return reply.send({
        data: {
          exerciseChecks: exerciseIds.map(id => ({ exerciseId: id, safe: true, warnings: [] })),
          overallSafe: true,
        },
      });
    }

    // Get all flags for the exercises
    const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(', ');
    const flags = await db.queryAll<{
      exercise_id: string;
      flag_type: string;
      severity_threshold: string;
      warning_message: string | null;
      body_region_id: string | null;
      limitation_type: string | null;
    }>(
      `SELECT exercise_id, flag_type, severity_threshold, warning_message, body_region_id, limitation_type
       FROM limitation_exercise_flags
       WHERE exercise_id IN (${placeholders})`,
      exerciseIds
    );

    const severityOrder = ['mild', 'moderate', 'severe', 'complete'];

    const exerciseChecks = exerciseIds.map(exerciseId => {
      const exerciseFlags = flags.filter(f => f.exercise_id === exerciseId);
      const warnings: string[] = [];
      let shouldAvoid = false;

      for (const limitation of limitations) {
        for (const flag of exerciseFlags) {
          const regionMatch = !flag.body_region_id || flag.body_region_id === limitation.body_region_id;
          const typeMatch = !flag.limitation_type || flag.limitation_type === limitation.limitation_type;
          const severityIndex = severityOrder.indexOf(limitation.severity);
          const thresholdIndex = severityOrder.indexOf(flag.severity_threshold);
          const severityMatch = severityIndex >= thresholdIndex;

          if (regionMatch && typeMatch && severityMatch) {
            warnings.push(flag.warning_message || `${flag.flag_type}: potential issue`);
            if (flag.flag_type === 'avoid') {
              shouldAvoid = true;
            }
          }
        }
      }

      return {
        exerciseId,
        safe: !shouldAvoid,
        warnings: [...new Set(warnings)], // Remove duplicates
      };
    });

    return reply.send({
      data: {
        exerciseChecks,
        overallSafe: exerciseChecks.every(c => c.safe),
        warningCount: exerciseChecks.filter(c => c.warnings.length > 0).length,
      },
    });
  });
}
