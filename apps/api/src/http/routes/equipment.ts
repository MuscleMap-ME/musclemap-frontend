/**
 * Equipment Routes (Fastify)
 *
 * Handles equipment-related endpoints:
 * - Equipment types (reference data)
 * - Location equipment (crowd-sourced equipment at gyms/parks)
 * - User home equipment
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';
import * as equipmentService from '../../services/equipment.service';

const log = loggers.core;

// Validation schemas
const reportEquipmentSchema = z.object({
  types: z.array(z.string()).min(1),
  reportType: z.enum(['present', 'absent']),
});

const setHomeEquipmentSchema = z.object({
  equipmentIds: z.array(z.string()),
  locationType: z.enum(['home', 'work', 'other']).default('home'),
});

const addHomeEquipmentSchema = z.object({
  equipmentId: z.string(),
  locationType: z.enum(['home', 'work', 'other']).default('home'),
  notes: z.string().optional(),
});

export async function registerEquipmentRoutes(app: FastifyInstance) {
  // =====================
  // Equipment Types (Public)
  // =====================

  /**
   * GET /equipment/types
   * Get all equipment types (reference data)
   */
  app.get('/equipment/types', async (request, reply) => {
    const types = await equipmentService.getEquipmentTypes();

    return reply.send({
      data: types,
    });
  });

  /**
   * GET /equipment/types/:category
   * Get equipment types by category
   */
  app.get('/equipment/types/:category', async (request, reply) => {
    const { category } = request.params as { category: string };

    const types = await equipmentService.getEquipmentTypesByCategory(category);

    return reply.send({
      data: types,
    });
  });

  /**
   * GET /equipment/categories
   * Get all equipment categories
   */
  app.get('/equipment/categories', async (request, reply) => {
    const categories = await equipmentService.getEquipmentCategories();

    return reply.send({
      data: categories,
    });
  });

  // =====================
  // Location Equipment (Crowd-Sourced)
  // =====================

  /**
   * GET /locations/:id/equipment
   * Get equipment at a specific location (hangout)
   */
  app.get('/locations/:id/equipment', async (request, reply) => {
    const { id: hangoutId } = request.params as { id: string };

    const equipment = await equipmentService.getLocationEquipment(hangoutId);

    return reply.send({
      data: equipment,
    });
  });

  /**
   * GET /locations/:id/equipment/verified
   * Get only verified equipment at a location (for workout recommendations)
   */
  app.get('/locations/:id/equipment/verified', async (request, reply) => {
    const { id: hangoutId } = request.params as { id: string };

    const equipmentIds = await equipmentService.getVerifiedLocationEquipment(hangoutId);

    return reply.send({
      data: equipmentIds,
    });
  });

  /**
   * POST /locations/:id/equipment
   * Report equipment at a location
   */
  app.post(
    '/locations/:id/equipment',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id: hangoutId } = request.params as { id: string };
      const parsed = reportEquipmentSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION',
            message: 'Invalid equipment report',
            details: parsed.error.errors,
            statusCode: 400,
          },
        });
      }

      const { types, reportType } = parsed.data;

      await equipmentService.reportEquipment(userId, hangoutId, types, reportType);

      log.info(
        { userId, hangoutId, equipmentCount: types.length, reportType },
        'User reported equipment at location'
      );

      return reply.send({
        data: {
          success: true,
          message: `Equipment ${reportType === 'present' ? 'confirmed' : 'reported absent'} at location`,
          reportedCount: types.length,
        },
      });
    }
  );

  /**
   * GET /locations/:id/equipment/my-reports
   * Get user's existing reports for a location
   */
  app.get(
    '/locations/:id/equipment/my-reports',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id: hangoutId } = request.params as { id: string };

      const reports = await equipmentService.getUserReportsForLocation(userId, hangoutId);

      return reply.send({
        data: reports,
      });
    }
  );

  // =====================
  // User Home Equipment
  // =====================

  /**
   * GET /equipment/home
   * Get user's home equipment
   */
  app.get('/equipment/home', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { locationType } = request.query as { locationType?: 'home' | 'work' | 'other' };

    const equipment = await equipmentService.getUserHomeEquipment(userId, locationType);

    return reply.send({
      data: equipment,
    });
  });

  /**
   * GET /equipment/home/ids
   * Get just the equipment IDs for user's home (simpler response)
   */
  app.get('/equipment/home/ids', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { locationType } = request.query as { locationType?: 'home' | 'work' | 'other' };

    const equipmentIds = await equipmentService.getUserHomeEquipmentIds(userId, locationType);

    return reply.send({
      data: equipmentIds,
    });
  });

  /**
   * PUT /equipment/home
   * Set user's home equipment (replaces all for location type)
   */
  app.put('/equipment/home', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = setHomeEquipmentSchema.safeParse(request.body);

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

    await equipmentService.setUserHomeEquipment(userId, equipmentIds, locationType);

    log.info(
      { userId, equipmentCount: equipmentIds.length, locationType },
      'User updated home equipment'
    );

    return reply.send({
      data: {
        success: true,
        message: 'Home equipment updated',
        equipmentCount: equipmentIds.length,
      },
    });
  });

  /**
   * POST /equipment/home
   * Add single equipment to user's home
   */
  app.post('/equipment/home', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = addHomeEquipmentSchema.safeParse(request.body);

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

    const { equipmentId, locationType, notes } = parsed.data;

    await equipmentService.addUserHomeEquipment(userId, equipmentId, locationType, notes);

    return reply.send({
      data: {
        success: true,
        message: 'Equipment added to home',
      },
    });
  });

  /**
   * DELETE /equipment/home/:equipmentId
   * Remove equipment from user's home
   */
  app.delete(
    '/equipment/home/:equipmentId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { equipmentId } = request.params as { equipmentId: string };
      const { locationType } = request.query as { locationType?: 'home' | 'work' | 'other' };

      await equipmentService.removeUserHomeEquipment(
        userId,
        equipmentId,
        locationType || 'home'
      );

      return reply.send({
        data: {
          success: true,
          message: 'Equipment removed from home',
        },
      });
    }
  );
}
