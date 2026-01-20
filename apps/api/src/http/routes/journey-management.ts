/**
 * Journey Management Routes (Fastify)
 *
 * Handles user journey state management including:
 * - Creating manual snapshots
 * - Listing user snapshots
 * - Restoring from snapshots
 * - Fresh start (reset all progress)
 * - Restart onboarding
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Validation schemas
const createSnapshotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const _restoreSnapshotSchema = z.object({
  snapshotId: z.string(),
  components: z.array(z.enum([
    'archetype',
    'profile',
    'equipment',
    'goals',
    'journeys',
  ])).optional(), // If not provided, restore everything
});

export async function registerJourneyManagementRoutes(app: FastifyInstance) {
  /**
   * GET /journey/snapshots
   * List all snapshots for the current user
   */
  app.get('/journey/snapshots', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { limit = 20, cursor } = request.query as { limit?: number; cursor?: string };

    let cursorCondition = '';
    const params: (string | number)[] = [userId, Math.min(limit, 50)];

    if (cursor) {
      // Cursor format: "createdAt|id"
      const [createdAt, id] = cursor.split('|');
      cursorCondition = `
        AND (created_at, id) < ($3::timestamptz, $4)
      `;
      params.push(createdAt, id);
    }

    const snapshots = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      snapshot_type: string;
      archetype_id: string | null;
      archetype_level: number | null;
      total_tu: string | null;
      total_workouts: number | null;
      created_at: string;
      is_restorable: boolean;
      restored_count: number;
    }>(`
      SELECT
        id, name, description, snapshot_type,
        archetype_id, archetype_level, total_tu, total_workouts,
        created_at, is_restorable, restored_count
      FROM journey_snapshots
      WHERE user_id = $1
        ${cursorCondition}
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `, params);

    // Build next cursor
    let nextCursor = null;
    if (snapshots.length === Math.min(limit, 50)) {
      const last = snapshots[snapshots.length - 1];
      nextCursor = `${last.created_at}|${last.id}`;
    }

    return reply.send({
      data: {
        snapshots: snapshots.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          snapshotType: s.snapshot_type,
          archetypeId: s.archetype_id,
          archetypeLevel: s.archetype_level,
          totalTu: s.total_tu ? parseFloat(s.total_tu) : 0,
          totalWorkouts: s.total_workouts || 0,
          createdAt: s.created_at,
          isRestorable: s.is_restorable,
          restoredCount: s.restored_count,
        })),
        nextCursor,
        hasMore: !!nextCursor,
      },
    });
  });

  /**
   * GET /journey/snapshots/:id
   * Get detailed snapshot info
   */
  app.get('/journey/snapshots/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const snapshot = await db.queryOne<{
      id: string;
      user_id: string;
      name: string;
      description: string | null;
      snapshot_type: string;
      archetype_id: string | null;
      archetype_level: number | null;
      total_tu: string | null;
      total_workouts: number | null;
      total_exercises: number | null;
      profile_data: Record<string, unknown>;
      equipment_data: unknown[];
      journey_data: unknown[];
      goals_data: unknown[];
      achievements_data: unknown[];
      workout_summary: Record<string, unknown>;
      onboarding_data: Record<string, unknown>;
      created_at: string;
      is_restorable: boolean;
      restored_count: number;
      last_restored_at: string | null;
    }>(`
      SELECT *
      FROM journey_snapshots
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (!snapshot) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Snapshot not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        id: snapshot.id,
        name: snapshot.name,
        description: snapshot.description,
        snapshotType: snapshot.snapshot_type,
        archetypeId: snapshot.archetype_id,
        archetypeLevel: snapshot.archetype_level,
        totalTu: snapshot.total_tu ? parseFloat(snapshot.total_tu) : 0,
        totalWorkouts: snapshot.total_workouts || 0,
        totalExercises: snapshot.total_exercises || 0,
        profileData: snapshot.profile_data,
        equipmentData: snapshot.equipment_data,
        journeyData: snapshot.journey_data,
        goalsData: snapshot.goals_data,
        achievementsData: snapshot.achievements_data,
        workoutSummary: snapshot.workout_summary,
        onboardingData: snapshot.onboarding_data,
        createdAt: snapshot.created_at,
        isRestorable: snapshot.is_restorable,
        restoredCount: snapshot.restored_count,
        lastRestoredAt: snapshot.last_restored_at,
      },
    });
  });

  /**
   * POST /journey/snapshots
   * Create a manual snapshot of current state
   */
  app.post('/journey/snapshots', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = createSnapshotSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid snapshot data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const { name, description } = parsed.data;
    const snapshotId = `snap_${crypto.randomBytes(12).toString('hex')}`;

    // Gather current user state
    const user = await db.queryOne<{
      current_archetype_id: string | null;
      current_level: number;
    }>(`
      SELECT current_archetype_id, current_level
      FROM users
      WHERE id = $1
    `, [userId]);

    // Get profile data
    const profile = await db.queryOne<Record<string, unknown>>(`
      SELECT
        gender, date_of_birth, height_cm, weight_kg,
        preferred_units, primary_intent, onboarding_completed_at
      FROM user_profile_extended
      WHERE user_id = $1
    `, [userId]);

    // Get equipment
    const equipment = await db.queryAll<{ equipment_type_id: string; location_type: string }>(`
      SELECT equipment_type_id, location_type
      FROM user_home_equipment
      WHERE user_id = $1
    `, [userId]);

    // Get workout stats
    const stats = await db.queryOne<{
      total_tu: string;
      total_workouts: string;
      total_exercises: string;
    }>(`
      SELECT
        COALESCE(SUM(total_tu), 0)::text as total_tu,
        COUNT(*)::text as total_workouts,
        COALESCE(SUM(exercise_count), 0)::text as total_exercises
      FROM workout_records
      WHERE user_id = $1
    `, [userId]);

    // Get active goals
    const goals = await db.queryAll<{ id: string; title: string; target_value: number; current_value: number }>(`
      SELECT id, title, target_value, current_value
      FROM user_goals
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);

    // Get journey progress
    const journeys = await db.queryAll<{ journey_id: string; current_value: number; target_value: number }>(`
      SELECT journey_id, current_value, target_value
      FROM journey_progress
      WHERE user_id = $1 AND completed = FALSE
    `, [userId]);

    // Get onboarding state
    const onboardingState = await db.queryOne<Record<string, unknown>>(`
      SELECT selected_intent, current_step, status, collected_data
      FROM user_onboarding_state
      WHERE user_id = $1
    `, [userId]);

    // Create snapshot
    await db.query(`
      INSERT INTO journey_snapshots (
        id, user_id, name, description, snapshot_type,
        archetype_id, archetype_level,
        total_tu, total_workouts, total_exercises,
        profile_data, equipment_data, journey_data, goals_data,
        onboarding_data, created_at
      )
      VALUES (
        $1, $2, $3, $4, 'manual',
        $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13,
        $14, NOW()
      )
    `, [
      snapshotId,
      userId,
      name,
      description || null,
      user?.current_archetype_id || null,
      user?.current_level || 1,
      parseFloat(stats?.total_tu || '0'),
      parseInt(stats?.total_workouts || '0'),
      parseInt(stats?.total_exercises || '0'),
      JSON.stringify(profile || {}),
      JSON.stringify(equipment || []),
      JSON.stringify(journeys || []),
      JSON.stringify(goals || []),
      JSON.stringify(onboardingState || {}),
    ]);

    log.info({ userId, snapshotId, name }, 'User created manual snapshot');

    return reply.status(201).send({
      data: {
        id: snapshotId,
        name,
        description,
        snapshotType: 'manual',
        archetypeId: user?.current_archetype_id,
        archetypeLevel: user?.current_level || 1,
        totalTu: parseFloat(stats?.total_tu || '0'),
        totalWorkouts: parseInt(stats?.total_workouts || '0'),
        createdAt: new Date().toISOString(),
      },
      message: 'Snapshot created successfully',
    });
  });

  /**
   * POST /journey/snapshots/:id/restore
   * Restore user state from a snapshot
   */
  app.post('/journey/snapshots/:id/restore', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const body = request.body as { components?: string[] };
    const components = body?.components || ['archetype', 'profile', 'equipment', 'goals'];

    // Get snapshot
    const snapshot = await db.queryOne<{
      id: string;
      user_id: string;
      archetype_id: string | null;
      archetype_level: number | null;
      total_tu: string | null;
      profile_data: Record<string, unknown>;
      equipment_data: Array<{ equipment_type_id: string; location_type: string }>;
      goals_data: unknown[];
      journey_data: unknown[];
      onboarding_data: Record<string, unknown>;
      is_restorable: boolean;
    }>(`
      SELECT *
      FROM journey_snapshots
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (!snapshot) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Snapshot not found', statusCode: 404 },
      });
    }

    if (!snapshot.is_restorable) {
      return reply.status(400).send({
        error: { code: 'NOT_RESTORABLE', message: 'This snapshot cannot be restored', statusCode: 400 },
      });
    }

    // Get current state for logging
    const currentUser = await db.queryOne<{
      current_archetype_id: string | null;
      current_level: number;
    }>(`
      SELECT current_archetype_id, current_level
      FROM users
      WHERE id = $1
    `, [userId]);

    const currentStats = await db.queryOne<{ total_tu: string }>(`
      SELECT COALESCE(SUM(total_tu), 0)::text as total_tu
      FROM workout_records
      WHERE user_id = $1
    `, [userId]);

    // Start restoration
    const restoredComponents: string[] = [];

    // Restore archetype if requested
    if (components.includes('archetype') && snapshot.archetype_id) {
      await db.query(`
        UPDATE users
        SET current_archetype_id = $1, current_level = $2, updated_at = NOW()
        WHERE id = $3
      `, [snapshot.archetype_id, snapshot.archetype_level || 1, userId]);
      restoredComponents.push('archetype');
    }

    // Restore profile if requested
    if (components.includes('profile') && snapshot.profile_data) {
      const p = snapshot.profile_data;
      await db.query(`
        UPDATE user_profile_extended
        SET
          gender = COALESCE($2, gender),
          preferred_units = COALESCE($3, preferred_units),
          primary_intent = COALESCE($4, primary_intent),
          updated_at = NOW()
        WHERE user_id = $1
      `, [
        userId,
        p.gender || null,
        p.preferred_units || null,
        p.primary_intent || null,
      ]);
      restoredComponents.push('profile');
    }

    // Restore equipment if requested
    if (components.includes('equipment') && snapshot.equipment_data?.length > 0) {
      // Clear existing equipment
      await db.query(`DELETE FROM user_home_equipment WHERE user_id = $1`, [userId]);

      // Insert snapshot equipment
      for (const eq of snapshot.equipment_data) {
        await db.query(`
          INSERT INTO user_home_equipment (user_id, equipment_type_id, location_type)
          VALUES ($1, $2, $3)
        `, [userId, eq.equipment_type_id, eq.location_type || 'home']);
      }
      restoredComponents.push('equipment');
    }

    // Update snapshot restore count
    await db.query(`
      UPDATE journey_snapshots
      SET restored_count = restored_count + 1, last_restored_at = NOW()
      WHERE id = $1
    `, [id]);

    // Log the restoration
    await db.query(`
      INSERT INTO snapshot_restore_log (
        user_id, snapshot_id, restore_type,
        previous_archetype, previous_level, previous_tu,
        restored_archetype, restored_level, restored_tu,
        components_restored
      )
      VALUES ($1, $2, 'partial', $3, $4, $5, $6, $7, $8, $9)
    `, [
      userId,
      id,
      currentUser?.current_archetype_id,
      currentUser?.current_level,
      parseFloat(currentStats?.total_tu || '0'),
      snapshot.archetype_id,
      snapshot.archetype_level,
      parseFloat(snapshot.total_tu || '0'),
      JSON.stringify(restoredComponents),
    ]);

    log.info({ userId, snapshotId: id, restoredComponents }, 'User restored from snapshot');

    return reply.send({
      data: {
        restored: true,
        snapshotId: id,
        componentsRestored: restoredComponents,
        newArchetype: snapshot.archetype_id,
        newLevel: snapshot.archetype_level,
      },
      message: `Restored ${restoredComponents.length} components from snapshot`,
    });
  });

  /**
   * DELETE /journey/snapshots/:id
   * Delete a snapshot
   */
  app.delete('/journey/snapshots/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const result = await db.query(`
      DELETE FROM journey_snapshots
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Snapshot not found', statusCode: 404 },
      });
    }

    log.info({ userId, snapshotId: id }, 'User deleted snapshot');

    return reply.send({ message: 'Snapshot deleted' });
  });

  /**
   * POST /journey/fresh-start
   * Reset all progress and start fresh (keeps account)
   */
  app.post('/journey/fresh-start', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { confirmPhrase } = request.body as { confirmPhrase?: string };

    // Require confirmation phrase for safety
    if (confirmPhrase !== 'FRESH START') {
      return reply.status(400).send({
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Please confirm by sending { confirmPhrase: "FRESH START" }',
          statusCode: 400,
        },
      });
    }

    // Get current state for logging
    const currentUser = await db.queryOne<{
      current_archetype_id: string | null;
      current_level: number;
    }>(`
      SELECT current_archetype_id, current_level
      FROM users
      WHERE id = $1
    `, [userId]);

    const currentStats = await db.queryOne<{ total_tu: string }>(`
      SELECT COALESCE(SUM(total_tu), 0)::text as total_tu
      FROM workout_records
      WHERE user_id = $1
    `, [userId]);

    // Create an automatic snapshot before fresh start
    const snapshotId = `snap_${crypto.randomBytes(12).toString('hex')}`;
    await db.query(`
      INSERT INTO journey_snapshots (
        id, user_id, name, description, snapshot_type,
        archetype_id, archetype_level, total_tu,
        profile_data, created_at
      )
      VALUES (
        $1, $2, 'Before Fresh Start', 'Automatic backup before resetting all progress',
        'auto', $3, $4, $5, '{}', NOW()
      )
    `, [
      snapshotId,
      userId,
      currentUser?.current_archetype_id,
      currentUser?.current_level || 1,
      parseFloat(currentStats?.total_tu || '0'),
    ]);

    // Reset user to initial state
    await db.query(`
      UPDATE users
      SET current_archetype_id = NULL, current_level = 1, updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Reset onboarding
    await db.query(`
      UPDATE user_profile_extended
      SET onboarding_completed_at = NULL, primary_intent = NULL, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    // Delete onboarding state
    await db.query(`DELETE FROM user_onboarding_state WHERE user_id = $1`, [userId]);

    // Delete equipment
    await db.query(`DELETE FROM user_home_equipment WHERE user_id = $1`, [userId]);

    // Delete goals
    await db.query(`UPDATE user_goals SET status = 'cancelled' WHERE user_id = $1`, [userId]);

    // Note: We DON'T delete workout_records - that's historical data
    // Users can still see their past workouts, but progression is reset

    // Log the fresh start
    await db.query(`
      INSERT INTO snapshot_restore_log (
        user_id, snapshot_id, restore_type,
        previous_archetype, previous_level, previous_tu,
        components_restored, notes
      )
      VALUES ($1, $2, 'fresh_start', $3, $4, $5, $6, 'User initiated fresh start')
    `, [
      userId,
      snapshotId,
      currentUser?.current_archetype_id,
      currentUser?.current_level,
      parseFloat(currentStats?.total_tu || '0'),
      JSON.stringify(['archetype', 'onboarding', 'equipment', 'goals']),
    ]);

    log.info({ userId, snapshotId }, 'User initiated fresh start');

    return reply.send({
      data: {
        freshStart: true,
        backupSnapshotId: snapshotId,
        message: 'Your progress has been reset. A backup snapshot was created.',
      },
    });
  });

  /**
   * POST /journey/restart-onboarding
   * Just restart onboarding flow without resetting progress
   */
  app.post('/journey/restart-onboarding', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Reset onboarding status only
    await db.query(`
      UPDATE user_profile_extended
      SET onboarding_completed_at = NULL, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    // Clear onboarding state
    await db.query(`DELETE FROM user_onboarding_state WHERE user_id = $1`, [userId]);

    // Optionally clear archetype to force re-selection
    const { clearArchetype } = request.body as { clearArchetype?: boolean };
    if (clearArchetype) {
      await db.query(`
        UPDATE users
        SET current_archetype_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [userId]);
    }

    log.info({ userId, clearArchetype: !!clearArchetype }, 'User restarted onboarding');

    return reply.send({
      data: {
        onboardingReset: true,
        archetypeCleared: !!clearArchetype,
        redirectTo: '/onboarding',
      },
      message: 'Onboarding has been reset. You can now go through the setup process again.',
    });
  });

  /**
   * GET /journey/settings
   * Get journey management settings
   */
  app.get('/journey/settings', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const settings = await db.queryOne<{
      auto_snapshot_enabled: boolean;
      snapshot_retention_days: number;
      last_auto_snapshot_at: string | null;
    }>(`
      SELECT auto_snapshot_enabled, snapshot_retention_days, last_auto_snapshot_at
      FROM user_profile_extended
      WHERE user_id = $1
    `, [userId]);

    // Count snapshots
    const snapshotCount = await db.queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count
      FROM journey_snapshots
      WHERE user_id = $1
    `, [userId]);

    return reply.send({
      data: {
        autoSnapshotEnabled: settings?.auto_snapshot_enabled ?? true,
        snapshotRetentionDays: settings?.snapshot_retention_days ?? 90,
        lastAutoSnapshotAt: settings?.last_auto_snapshot_at,
        totalSnapshots: parseInt(snapshotCount?.count || '0'),
      },
    });
  });

  /**
   * PUT /journey/settings
   * Update journey management settings
   */
  app.put('/journey/settings', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { autoSnapshotEnabled, snapshotRetentionDays } = request.body as {
      autoSnapshotEnabled?: boolean;
      snapshotRetentionDays?: number;
    };

    const updates: string[] = [];
    const params: (string | boolean | number)[] = [userId];
    let paramIndex = 2;

    if (autoSnapshotEnabled !== undefined) {
      updates.push(`auto_snapshot_enabled = $${paramIndex++}`);
      params.push(autoSnapshotEnabled);
    }

    if (snapshotRetentionDays !== undefined) {
      const days = Math.min(Math.max(snapshotRetentionDays, 7), 365);
      updates.push(`snapshot_retention_days = $${paramIndex++}`);
      params.push(days);
    }

    if (updates.length > 0) {
      await db.query(`
        UPDATE user_profile_extended
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
      `, params);
    }

    log.info({ userId, autoSnapshotEnabled, snapshotRetentionDays }, 'User updated journey settings');

    return reply.send({
      data: { updated: true },
      message: 'Settings updated',
    });
  });

  /**
   * GET /journey/restore-history
   * Get history of restorations
   */
  app.get('/journey/restore-history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const history = await db.queryAll<{
      id: number;
      snapshot_id: string | null;
      restore_type: string;
      restored_at: string;
      previous_archetype: string | null;
      restored_archetype: string | null;
      components_restored: string[];
      notes: string | null;
    }>(`
      SELECT
        id, snapshot_id, restore_type, restored_at,
        previous_archetype, restored_archetype,
        components_restored, notes
      FROM snapshot_restore_log
      WHERE user_id = $1
      ORDER BY restored_at DESC
      LIMIT 20
    `, [userId]);

    return reply.send({
      data: {
        history: history.map(h => ({
          id: h.id,
          snapshotId: h.snapshot_id,
          restoreType: h.restore_type,
          restoredAt: h.restored_at,
          previousArchetype: h.previous_archetype,
          restoredArchetype: h.restored_archetype,
          componentsRestored: h.components_restored,
          notes: h.notes,
        })),
      },
    });
  });
}
