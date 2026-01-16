/**
 * Rehabilitation API Routes
 *
 * Provides endpoints for injury assessment, rehab protocols,
 * and progress tracking based on evidence-based rehabilitation science.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db/client';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.api;

interface InjuryProfile {
  id: string;
  name: string;
  body_region: string;
  icd_10_code?: string;
  description?: string;
  typical_recovery_weeks?: number;
  severity_levels?: Record<string, unknown>;
  contraindicated_movements?: string[];
  recommended_movements?: string[];
}

interface UserInjury {
  id: string;
  user_id: string;
  injury_profile_id: string;
  severity: string;
  onset_date?: string;
  is_surgical: boolean;
  surgery_date?: string;
  current_phase: number;
  pain_level?: number;
  rom_flexion_percent: number;
  rom_extension_percent: number;
  rom_rotation_percent: number;
  status: string;
  notes?: string;
}

interface StartRehabInput {
  injuryProfileId: string;
  severity: 'mild' | 'moderate' | 'severe';
  onsetDate?: string;
  isSurgical?: boolean;
  surgeryDate?: string;
  painLevel?: number;
  notes?: string;
}

interface LogProgressInput {
  injuryId: string;
  painBefore?: number;
  painAfter?: number;
  romAchieved?: Record<string, number>;
  exercisesCompleted?: Array<{ exerciseId: string; sets: number; reps: number }>;
  notes?: string;
}

export default async function rehabilitationRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================
  // GET /api/rehabilitation/profiles
  // Get all injury profiles, optionally filtered by body region
  // ============================================
  fastify.get(
    '/profiles',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Querystring: { bodyRegion?: string } }>, reply: FastifyReply) => {
      try {
        const { bodyRegion } = request.query;

        let query = 'SELECT * FROM injury_profiles';
        const params: string[] = [];

        if (bodyRegion) {
          query += ' WHERE body_region = $1';
          params.push(bodyRegion);
        }

        query += ' ORDER BY body_region, name';

        const profiles = await db.queryAll<InjuryProfile>(query, params);

        return reply.send({
          success: true,
          profiles,
          count: profiles.length,
        });
      } catch (error) {
        log.error('Error fetching injury profiles:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch injury profiles' });
      }
    }
  );

  // ============================================
  // GET /api/rehabilitation/profiles/:id
  // Get a specific injury profile with its protocols
  // ============================================
  fastify.get(
    '/profiles/:id',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const profile = await db.queryOne<InjuryProfile>(
          'SELECT * FROM injury_profiles WHERE id = $1',
          [id]
        );

        if (!profile) {
          return reply.status(404).send({ success: false, error: 'Injury profile not found' });
        }

        // Get associated protocols
        const protocols = await db.queryAll(
          'SELECT * FROM rehab_protocols WHERE injury_profile_id = $1 ORDER BY phase',
          [id]
        );

        return reply.send({
          success: true,
          profile: {
            ...profile,
            protocols,
          },
        });
      } catch (error) {
        log.error('Error fetching injury profile:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch injury profile' });
      }
    }
  );

  // ============================================
  // GET /api/rehabilitation/body-regions
  // Get list of body regions with injury counts
  // ============================================
  fastify.get(
    '/body-regions',
    { preHandler: [authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const regions = await db.queryAll<{ body_region: string; count: string }>(
          `SELECT body_region, COUNT(*) as count
           FROM injury_profiles
           GROUP BY body_region
           ORDER BY body_region`
        );

        return reply.send({
          success: true,
          regions: regions.map(r => ({
            region: r.body_region,
            injuryCount: parseInt(r.count),
          })),
        });
      } catch (error) {
        log.error('Error fetching body regions:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch body regions' });
      }
    }
  );

  // ============================================
  // POST /api/rehabilitation/start
  // Start a new rehabilitation journey
  // ============================================
  fastify.post(
    '/start',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Body: StartRehabInput }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { injuryProfileId, severity, onsetDate, isSurgical, surgeryDate, painLevel, notes } = request.body;

        // Validate injury profile exists
        const profile = await db.queryOne<InjuryProfile>(
          'SELECT * FROM injury_profiles WHERE id = $1',
          [injuryProfileId]
        );

        if (!profile) {
          return reply.status(404).send({ success: false, error: 'Injury profile not found' });
        }

        // Check for existing active injury of same type
        const existingInjury = await db.queryOne<UserInjury>(
          `SELECT * FROM user_injuries
           WHERE user_id = $1 AND injury_profile_id = $2 AND status = 'active'`,
          [userId, injuryProfileId]
        );

        if (existingInjury) {
          return reply.status(400).send({
            success: false,
            error: 'You already have an active rehabilitation journey for this injury',
            existingInjuryId: existingInjury.id,
          });
        }

        // Create user injury record
        const injury = await db.queryOne<UserInjury>(
          `INSERT INTO user_injuries (
            user_id, injury_profile_id, severity, onset_date, is_surgical,
            surgery_date, current_phase, pain_level, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, 'active', $8)
          RETURNING *`,
          [userId, injuryProfileId, severity, onsetDate || null, isSurgical || false,
           surgeryDate || null, painLevel || null, notes || null]
        );

        // Get the first phase protocol
        const protocol = await db.queryOne(
          `SELECT * FROM rehab_protocols
           WHERE injury_profile_id = $1 AND phase = 1`,
          [injuryProfileId]
        );

        log.info(`User ${userId} started rehab journey for ${profile.name} (${severity})`);

        return reply.status(201).send({
          success: true,
          injury,
          profile,
          currentProtocol: protocol,
          message: `Started ${profile.name} rehabilitation - Phase 1: ${protocol?.phase_name || 'Initial'}`,
        });
      } catch (error) {
        log.error('Error starting rehab journey:', error);
        return reply.status(500).send({ success: false, error: 'Failed to start rehabilitation journey' });
      }
    }
  );

  // ============================================
  // GET /api/rehabilitation/my-injuries
  // Get user's current injuries
  // ============================================
  fastify.get(
    '/my-injuries',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;

        const injuriesResult = await db.queryAll(
          `SELECT ui.*, ip.name as injury_name, ip.body_region, ip.typical_recovery_weeks
           FROM user_injuries ui
           JOIN injury_profiles ip ON ui.injury_profile_id = ip.id
           WHERE ui.user_id = $1
           ORDER BY ui.status = 'active' DESC, ui.created_at DESC`,
          [userId]
        );

        // Get current protocol for each active injury
        const injuriesWithProtocols = await Promise.all(
          injuriesResult.map(async (injury: any) => {
            if (injury.status === 'active') {
              const protocol = await db.queryOne(
                `SELECT * FROM rehab_protocols
                 WHERE injury_profile_id = $1 AND phase = $2`,
                [injury.injury_profile_id, injury.current_phase]
              );
              return { ...injury, currentProtocol: protocol };
            }
            return injury;
          })
        );

        return reply.send({
          success: true,
          injuries: injuriesWithProtocols,
          activeCount: injuriesResult.filter((i: any) => i.status === 'active').length,
        });
      } catch (error) {
        log.error('Error fetching user injuries:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch injuries' });
      }
    }
  );

  // ============================================
  // GET /api/rehabilitation/progress/:injuryId
  // Get progress history for an injury
  // ============================================
  fastify.get(
    '/progress/:injuryId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { injuryId: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { injuryId } = request.params;

        // Verify ownership
        const injury = await db.queryOne<UserInjury>(
          'SELECT * FROM user_injuries WHERE id = $1 AND user_id = $2',
          [injuryId, userId]
        );

        if (!injury) {
          return reply.status(404).send({ success: false, error: 'Injury not found' });
        }

        // Get progress entries
        const progressResult = await db.queryAll(
          `SELECT * FROM rehab_progress
           WHERE user_injury_id = $1
           ORDER BY date DESC`,
          [injuryId]
        );

        // Calculate trends
        const recentProgress = progressResult.slice(0, 7) as any[];
        const painTrend = recentProgress.length > 1
          ? recentProgress[recentProgress.length - 1].pain_after - recentProgress[0].pain_after
          : 0;

        return reply.send({
          success: true,
          injury,
          progress: progressResult,
          trends: {
            painTrend, // negative is good (decreasing pain)
            sessionsThisWeek: recentProgress.length,
          },
        });
      } catch (error) {
        log.error('Error fetching rehab progress:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch progress' });
      }
    }
  );

  // ============================================
  // POST /api/rehabilitation/log
  // Log a rehab session
  // ============================================
  fastify.post(
    '/log',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Body: LogProgressInput }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { injuryId, painBefore, painAfter, romAchieved, exercisesCompleted, notes } = request.body;

        // Verify ownership
        const injury = await db.queryOne<UserInjury>(
          'SELECT * FROM user_injuries WHERE id = $1 AND user_id = $2',
          [injuryId, userId]
        );

        if (!injury) {
          return reply.status(404).send({ success: false, error: 'Injury not found' });
        }

        if (injury.status !== 'active') {
          return reply.status(400).send({ success: false, error: 'This injury is not in active rehabilitation' });
        }

        // Create progress entry
        const progressEntry = await db.queryOne(
          `INSERT INTO rehab_progress (
            user_injury_id, date, phase, pain_before, pain_after,
            rom_achieved, exercises_completed, notes
          ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            injuryId, injury.current_phase, painBefore || null, painAfter || null,
            romAchieved ? JSON.stringify(romAchieved) : '{}',
            exercisesCompleted ? JSON.stringify(exercisesCompleted) : '[]',
            notes || null,
          ]
        );

        // Update injury with latest pain level and ROM
        await db.query(
          `UPDATE user_injuries SET
            pain_level = COALESCE($2, pain_level),
            rom_flexion_percent = COALESCE($3, rom_flexion_percent),
            rom_extension_percent = COALESCE($4, rom_extension_percent),
            rom_rotation_percent = COALESCE($5, rom_rotation_percent),
            updated_at = NOW()
          WHERE id = $1`,
          [
            injuryId,
            painAfter,
            romAchieved?.flexion,
            romAchieved?.extension,
            romAchieved?.rotation,
          ]
        );

        log.info(`User ${userId} logged rehab progress for injury ${injuryId}`);

        return reply.status(201).send({
          success: true,
          progress: progressEntry,
          message: 'Rehab session logged successfully',
        });
      } catch (error) {
        log.error('Error logging rehab progress:', error);
        return reply.status(500).send({ success: false, error: 'Failed to log progress' });
      }
    }
  );

  // ============================================
  // POST /api/rehabilitation/advance-phase/:injuryId
  // Advance to the next rehabilitation phase
  // ============================================
  fastify.post(
    '/advance-phase/:injuryId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { injuryId: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { injuryId } = request.params;

        // Verify ownership
        const injury = await db.queryOne<UserInjury>(
          'SELECT * FROM user_injuries WHERE id = $1 AND user_id = $2',
          [injuryId, userId]
        );

        if (!injury) {
          return reply.status(404).send({ success: false, error: 'Injury not found' });
        }

        // Check if there's a next phase
        const nextPhase = await db.queryOne(
          `SELECT * FROM rehab_protocols
           WHERE injury_profile_id = $1 AND phase = $2`,
          [injury.injury_profile_id, injury.current_phase + 1]
        );

        if (!nextPhase) {
          // No more phases - mark as resolved
          await db.query(
            `UPDATE user_injuries SET
              status = 'resolved',
              clearance_date = CURRENT_DATE,
              updated_at = NOW()
            WHERE id = $1`,
            [injuryId]
          );

          return reply.send({
            success: true,
            message: 'Congratulations! You have completed your rehabilitation journey!',
            status: 'resolved',
          });
        }

        // Advance to next phase
        await db.query(
          `UPDATE user_injuries SET
            current_phase = $2,
            updated_at = NOW()
          WHERE id = $1`,
          [injuryId, injury.current_phase + 1]
        );

        log.info(`User ${userId} advanced to phase ${injury.current_phase + 1} for injury ${injuryId}`);

        return reply.send({
          success: true,
          message: `Advanced to Phase ${injury.current_phase + 1}: ${nextPhase.phase_name}`,
          currentPhase: injury.current_phase + 1,
          protocol: nextPhase,
        });
      } catch (error) {
        log.error('Error advancing rehab phase:', error);
        return reply.status(500).send({ success: false, error: 'Failed to advance phase' });
      }
    }
  );

  // ============================================
  // GET /api/rehabilitation/exercises/:injuryId
  // Get exercises for current rehabilitation phase
  // ============================================
  fastify.get(
    '/exercises/:injuryId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { injuryId: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { injuryId } = request.params;

        // Verify ownership
        const injury = await db.queryOne<UserInjury>(
          'SELECT * FROM user_injuries WHERE id = $1 AND user_id = $2',
          [injuryId, userId]
        );

        if (!injury) {
          return reply.status(404).send({ success: false, error: 'Injury not found' });
        }

        // Get current protocol
        const protocol = await db.queryOne<{ exercises: unknown[] | null }>(
          `SELECT exercises FROM rehab_protocols
           WHERE injury_profile_id = $1 AND phase = $2`,
          [injury.injury_profile_id, injury.current_phase]
        );

        if (!protocol) {
          return reply.status(404).send({ success: false, error: 'Protocol not found' });
        }

        const exercises = protocol.exercises || [];

        return reply.send({
          success: true,
          phase: injury.current_phase,
          exercises,
        });
      } catch (error) {
        log.error('Error fetching rehab exercises:', error);
        return reply.status(500).send({ success: false, error: 'Failed to fetch exercises' });
      }
    }
  );

  // ============================================
  // DELETE /api/rehabilitation/:injuryId
  // End or abandon a rehabilitation journey
  // ============================================
  fastify.delete(
    '/:injuryId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { injuryId: string }; Querystring: { status?: string } }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId;
        const { injuryId } = request.params;
        const { status } = request.query;

        // Verify ownership
        const injury = await db.queryOne<UserInjury>(
          'SELECT * FROM user_injuries WHERE id = $1 AND user_id = $2',
          [injuryId, userId]
        );

        if (!injury) {
          return reply.status(404).send({ success: false, error: 'Injury not found' });
        }

        const newStatus = status === 'resolved' ? 'resolved' : 'chronic';

        await db.query(
          `UPDATE user_injuries SET
            status = $2,
            clearance_date = CASE WHEN $2 = 'resolved' THEN CURRENT_DATE ELSE NULL END,
            updated_at = NOW()
          WHERE id = $1`,
          [injuryId, newStatus]
        );

        log.info(`User ${userId} ended rehab journey for injury ${injuryId} with status ${newStatus}`);

        return reply.send({
          success: true,
          message: `Rehabilitation journey marked as ${newStatus}`,
          status: newStatus,
        });
      } catch (error) {
        log.error('Error ending rehab journey:', error);
        return reply.status(500).send({ success: false, error: 'Failed to end rehabilitation journey' });
      }
    }
  );
}
