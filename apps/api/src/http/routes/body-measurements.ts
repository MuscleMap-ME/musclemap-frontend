/**
 * Body Measurements Routes
 *
 * API endpoints for tracking body measurements over time:
 * - Weight and body composition
 * - Circumference measurements (arms, chest, waist, etc.)
 * - Measurement history and progress charts
 */

import { FastifyPluginAsync } from 'fastify';
import { authenticate } from './auth';
import { db } from '../../db/client';

// Types
interface Measurement {
  weight_kg?: number;
  body_fat_percentage?: number;
  lean_mass_kg?: number;
  neck_cm?: number;
  shoulders_cm?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_bicep_cm?: number;
  right_bicep_cm?: number;
  left_forearm_cm?: number;
  right_forearm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  left_calf_cm?: number;
  right_calf_cm?: number;
  measurement_source?: string;
  notes?: string;
  measurement_date: string;
}

// Valid measurement fields for validation
const MEASUREMENT_FIELDS = [
  'weight_kg', 'body_fat_percentage', 'lean_mass_kg',
  'neck_cm', 'shoulders_cm', 'chest_cm', 'waist_cm', 'hips_cm',
  'left_bicep_cm', 'right_bicep_cm', 'left_forearm_cm', 'right_forearm_cm',
  'left_thigh_cm', 'right_thigh_cm', 'left_calf_cm', 'right_calf_cm'
];

const bodyMeasurementsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all measurements for user (keyset pagination)
  fastify.get(
    '/body-measurements',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { limit = 50, cursor } = request.query as { limit?: number; cursor?: string };

      // Decode cursor for keyset pagination
      let cursorData: { measurementDate: string; id: string } | null = null;
      if (cursor) {
        try {
          cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
        } catch {
          // Invalid cursor, start from beginning
        }
      }

      // Fetch one extra to determine if there are more results
      const fetchLimit = Math.min(limit, 100) + 1;

      let measurements;
      if (cursorData) {
        measurements = await db.queryAll(
          `SELECT * FROM body_measurements
           WHERE user_id = $1
             AND (measurement_date, id) < ($2, $3)
           ORDER BY measurement_date DESC, id DESC
           LIMIT $4`,
          [userId, cursorData.measurementDate, cursorData.id, fetchLimit]
        );
      } else {
        measurements = await db.queryAll(
          `SELECT * FROM body_measurements
           WHERE user_id = $1
           ORDER BY measurement_date DESC, id DESC
           LIMIT $2`,
          [userId, fetchLimit]
        );
      }

      // Determine if there are more results
      const hasMore = measurements.length > limit;
      const items = hasMore ? measurements.slice(0, -1) : measurements;

      // Generate next cursor from last item
      const nextCursor = items.length > 0
        ? Buffer.from(JSON.stringify({
            measurementDate: items[items.length - 1].measurement_date,
            id: items[items.length - 1].id
          })).toString('base64')
        : null;

      return reply.send({
        measurements: items,
        pagination: {
          hasMore,
          nextCursor,
          count: items.length
        }
      });
    }
  );

  // Get latest measurement
  fastify.get(
    '/body-measurements/latest',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;

      const measurement = await db.queryOne(
        `SELECT * FROM body_measurements
         WHERE user_id = $1
         ORDER BY measurement_date DESC
         LIMIT 1`,
        [userId]
      );

      return reply.send({ measurement: measurement || null });
    }
  );

  // Get measurement by ID
  fastify.get(
    '/body-measurements/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const measurement = await db.queryOne(
        `SELECT * FROM body_measurements
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (!measurement) {
        return reply.status(404).send({ error: 'Measurement not found' });
      }

      return reply.send({ measurement });
    }
  );

  // Add new measurement
  fastify.post(
    '/body-measurements',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const body = request.body as Measurement;

      // Validate required fields
      if (!body.measurement_date) {
        return reply.status(400).send({ error: 'measurement_date is required' });
      }

      // Check if at least one measurement is provided
      const hasAtLeastOne = MEASUREMENT_FIELDS.some(
        field => body[field as keyof Measurement] !== undefined
      );

      if (!hasAtLeastOne) {
        return reply.status(400).send({ error: 'At least one measurement value is required' });
      }

      const measurement = await db.queryOne(
        `INSERT INTO body_measurements (
          user_id, weight_kg, body_fat_percentage, lean_mass_kg,
          neck_cm, shoulders_cm, chest_cm, waist_cm, hips_cm,
          left_bicep_cm, right_bicep_cm, left_forearm_cm, right_forearm_cm,
          left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm,
          measurement_source, notes, measurement_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          userId, body.weight_kg, body.body_fat_percentage, body.lean_mass_kg,
          body.neck_cm, body.shoulders_cm, body.chest_cm, body.waist_cm, body.hips_cm,
          body.left_bicep_cm, body.right_bicep_cm, body.left_forearm_cm, body.right_forearm_cm,
          body.left_thigh_cm, body.right_thigh_cm, body.left_calf_cm, body.right_calf_cm,
          body.measurement_source || 'manual', body.notes, body.measurement_date
        ]
      );

      return reply.status(201).send({ measurement });
    }
  );

  // Update measurement
  fastify.put(
    '/body-measurements/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };
      const body = request.body as Partial<Measurement>;

      const existing = await db.queryOne(
        `SELECT id FROM body_measurements WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (!existing) {
        return reply.status(404).send({ error: 'Measurement not found' });
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const fieldsToUpdate = [...MEASUREMENT_FIELDS, 'measurement_source', 'notes', 'measurement_date'];
      for (const field of fieldsToUpdate) {
        if (body[field as keyof Measurement] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          values.push(body[field as keyof Measurement]);
        }
      }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      values.push(id, userId);
      const measurement = await db.queryOne(
        `UPDATE body_measurements
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
         RETURNING *`,
        values
      );

      return reply.send({ measurement });
    }
  );

  // Delete measurement
  fastify.delete(
    '/body-measurements/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { id } = request.params as { id: string };

      const deleted = await db.execute(
        `DELETE FROM body_measurements WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (!deleted) {
        return reply.status(404).send({ error: 'Measurement not found' });
      }

      return reply.send({ success: true });
    }
  );

  // Get measurement history for a specific field (for charts)
  fastify.get(
    '/body-measurements/history/:field',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { field } = request.params as { field: string };
      const { days = 365 } = request.query as { days?: number };

      // Validate field name to prevent SQL injection
      if (!MEASUREMENT_FIELDS.includes(field)) {
        return reply.status(400).send({ error: 'Invalid field name' });
      }

      // Validate days is a positive integer to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(3650, Math.floor(Number(days) || 365)));

      const history = await db.queryAll<{ measurement_date: string; [key: string]: unknown }>(
        `SELECT measurement_date, ${field}
         FROM body_measurements
         WHERE user_id = $1 AND ${field} IS NOT NULL
           AND measurement_date >= CURRENT_DATE - INTERVAL '1 day' * $2
         ORDER BY measurement_date ASC`,
        [userId, validatedDays]
      );

      // Calculate stats
      const values = history.map((h) => h[field] as number).filter((v) => v !== null);
      const stats = values.length > 0 ? {
        current: values[values.length - 1],
        min: Math.min(...values),
        max: Math.max(...values),
        change: values.length > 1 ? values[values.length - 1] - values[0] : 0,
        changePercent: values.length > 1
          ? ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1)
          : '0',
      } : null;

      return reply.send({ history, stats });
    }
  );

  // Get measurement comparison (compare current to X days ago)
  fastify.get(
    '/body-measurements/comparison',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { days = 30 } = request.query as { days?: number };

      // Get latest measurement
      const latest = await db.queryOne<Record<string, unknown>>(
        `SELECT * FROM body_measurements
         WHERE user_id = $1
         ORDER BY measurement_date DESC
         LIMIT 1`,
        [userId]
      );

      if (!latest) {
        return reply.send({ comparison: null, message: 'No measurements found' });
      }

      // Validate days is a positive integer to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(3650, Math.floor(Number(days) || 30)));

      // Get measurement from X days ago
      const past = await db.queryOne<Record<string, unknown>>(
        `SELECT * FROM body_measurements
         WHERE user_id = $1
           AND measurement_date <= CURRENT_DATE - INTERVAL '1 day' * $2
         ORDER BY measurement_date DESC
         LIMIT 1`,
        [userId, validatedDays]
      );

      if (!past) {
        return reply.send({
          comparison: null,
          current: latest,
          message: `No measurements found from ${days} days ago`
        });
      }

      // Calculate differences for all fields
      const comparison: Record<string, { current: number | null; past: number | null; change: number | null; changePercent: string | null }> = {};

      for (const field of MEASUREMENT_FIELDS) {
        const current = latest[field] as number | null;
        const pastVal = past[field] as number | null;

        if (current !== null && pastVal !== null) {
          comparison[field] = {
            current,
            past: pastVal,
            change: current - pastVal,
            changePercent: ((current - pastVal) / pastVal * 100).toFixed(1),
          };
        } else {
          comparison[field] = { current, past: pastVal, change: null, changePercent: null };
        }
      }

      const latestDate = new Date(latest.measurement_date as string);
      const pastDate = new Date(past.measurement_date as string);
      const daysBetween = Math.round((latestDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24));

      return reply.send({
        comparison,
        currentDate: latest.measurement_date,
        pastDate: past.measurement_date,
        daysBetween,
      });
    }
  );
};

export default bodyMeasurementsRoutes;
