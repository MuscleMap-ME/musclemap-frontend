/**
 * Organizations Routes (Fastify)
 *
 * Enterprise multi-tenant organization management with:
 * - Organization CRUD
 * - Hierarchical unit management
 * - Member management with roles
 * - Team readiness tracking
 * - Settings and audit logging
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';

const log = loggers.core;

// =============================================================================
// TYPES
// =============================================================================

type OrganizationRole = 'member' | 'supervisor' | 'admin' | 'owner';

interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  unit_id: string | null;
  role: OrganizationRole;
  permissions: string[];
  badge_number: string | null;
  employee_id: string | null;
  rank: string | null;
  title: string | null;
  hire_date: string | null;
  share_readiness: boolean;
  share_assessments: boolean;
  share_weak_events: boolean;
  opted_in_at: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  created_at: string;
  updated_at: string;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum([
    'fire_department',
    'police_department',
    'military',
    'corrections',
    'ems_agency',
    'company',
  ]),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  primary_contact_name: z.string().max(100).optional(),
  primary_contact_email: z.string().email().optional(),
  primary_contact_phone: z.string().max(30).optional(),
  required_standards: z.array(z.string()).optional(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

const createUnitSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(50),
  code: z.string().max(50).optional(),
  parent_unit_id: z.string().uuid().optional().nullable(),
  address_line1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateUnitSchema = createUnitSchema.partial();

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'supervisor', 'admin']).optional(),
  unit_id: z.string().uuid().optional(),
  message: z.string().max(1000).optional(),
});

const bulkInviteSchema = z.object({
  members: z.array(z.object({
    email: z.string().email(),
    role: z.enum(['member', 'supervisor', 'admin']).optional(),
    unit_id: z.string().uuid().optional(),
  })).min(1).max(100),
});

const updateMemberSchema = z.object({
  role: z.enum(['member', 'supervisor', 'admin']).optional(),
  unit_id: z.string().uuid().optional().nullable(),
  badge_number: z.string().max(50).optional().nullable(),
  employee_id: z.string().max(50).optional().nullable(),
  rank: z.string().max(100).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  hire_date: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
  share_readiness: z.boolean().optional(),
  share_assessments: z.boolean().optional(),
  share_weak_events: z.boolean().optional(),
});

const bulkUpdateMembersSchema = z.object({
  user_ids: z.array(z.string()).min(1).max(100),
  updates: z.object({
    unit_id: z.string().uuid().optional().nullable(),
    role: z.enum(['member', 'supervisor', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'on_leave']).optional(),
  }),
});

const updateSettingsSchema = z.object({
  required_standards: z.array(z.string()).optional(),
  compliance_threshold: z.number().min(0).max(100).optional(),
  recert_grace_period_days: z.number().min(0).max(365).optional(),
  stale_assessment_days: z.number().min(0).max(365).optional(),
  require_member_opt_in: z.boolean().optional(),
  allow_individual_scores: z.boolean().optional(),
  allow_weak_event_sharing: z.boolean().optional(),
  notify_on_below_threshold: z.boolean().optional(),
  notify_on_recert_due: z.boolean().optional(),
  notify_supervisors_weekly: z.boolean().optional(),
  enable_benchmarking: z.boolean().optional(),
  enable_ai_recommendations: z.boolean().optional(),
  enable_prescription_assignment: z.boolean().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const exportReportSchema = z.object({
  format: z.enum(['pdf', 'csv', 'xlsx']),
  include_individual: z.boolean().optional(),
  date_range: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  unit_ids: z.array(z.string()).optional(),
  standard_id: z.string().optional(),
});

// =============================================================================
// AUTHORIZATION HELPERS
// =============================================================================

/**
 * Get user's membership in an organization
 */
async function getMembership(orgId: string, userId: string): Promise<OrganizationMember | null> {
  const result = await db.queryOne<OrganizationMember>(
    `SELECT * FROM organization_members WHERE org_id = $1 AND user_id = $2`,
    [orgId, userId]
  );
  return result ?? null;
}

/**
 * Check if user has required role level in organization
 */
function hasRole(member: OrganizationMember | null, requiredRoles: OrganizationRole[]): boolean {
  if (!member) return false;
  return requiredRoles.includes(member.role);
}

/**
 * Check if user can manage members (supervisor+)
 */
function canManageMembers(member: OrganizationMember | null): boolean {
  return hasRole(member, ['supervisor', 'admin', 'owner']);
}

/**
 * Check if user can manage units (admin+)
 */
function canManageUnits(member: OrganizationMember | null): boolean {
  return hasRole(member, ['admin', 'owner']);
}

/**
 * Check if user can manage organization settings (admin+)
 */
function canManageOrg(member: OrganizationMember | null): boolean {
  return hasRole(member, ['admin', 'owner']);
}

/**
 * Check if user is organization owner
 */
function isOwner(member: OrganizationMember | null): boolean {
  return hasRole(member, ['owner']);
}

/**
 * Log audit event
 */
async function auditLog(
  orgId: string,
  actorId: string,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  oldValue: unknown,
  newValue: unknown,
  metadata?: unknown
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO organization_audit_log
       (id, org_id, actor_id, action, resource_type, resource_id, old_value, new_value, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        orgId,
        actorId,
        action,
        resourceType,
        resourceId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    log.error({ err, orgId, action }, 'Failed to log audit event');
  }
}

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// =============================================================================
// ROUTE REGISTRATION
// =============================================================================

export async function registerOrganizationsRoutes(app: FastifyInstance) {
  // ==========================================================================
  // ORGANIZATION MANAGEMENT
  // ==========================================================================

  /**
   * POST /organizations
   * Create a new organization
   */
  app.post('/organizations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const body = createOrganizationSchema.parse(request.body);

    // Generate slug if not provided
    const slug = body.slug || generateSlug(body.name);

    // Check slug uniqueness
    const existing = await db.queryOne<{ id: string }>(
      `SELECT id FROM organizations WHERE slug = $1`,
      [slug]
    );

    if (existing) {
      return reply.status(400).send({
        error: {
          code: 'SLUG_EXISTS',
          message: 'An organization with this slug already exists',
          statusCode: 400,
        },
      });
    }

    const orgId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Default settings
    const settings = {
      required_standards: body.required_standards || [],
      compliance_threshold: 80,
      recert_grace_period_days: 30,
      stale_assessment_days: 90,
      require_member_opt_in: true,
      allow_individual_scores: true,
      allow_weak_event_sharing: true,
      notify_on_below_threshold: true,
      notify_on_recert_due: true,
      notify_supervisors_weekly: false,
      enable_benchmarking: false,
      enable_ai_recommendations: true,
      enable_prescription_assignment: true,
      primary_color: '#0066FF',
      secondary_color: '#1a1a1a',
    };

    // Create organization
    await db.query(
      `INSERT INTO organizations (
        id, name, slug, type, logo_url, website,
        address_line1, address_line2, city, state, zip, country, timezone,
        primary_contact_name, primary_contact_email, primary_contact_phone,
        settings, subscription_tier, subscription_status,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        orgId,
        body.name,
        slug,
        body.type,
        body.logo_url || null,
        body.website || null,
        body.address_line1 || null,
        body.address_line2 || null,
        body.city || null,
        body.state || null,
        body.zip || null,
        body.country || 'US',
        body.timezone || 'America/Chicago',
        body.primary_contact_name || null,
        body.primary_contact_email || null,
        body.primary_contact_phone || null,
        JSON.stringify(settings),
        'trial',
        'active',
        now,
        now,
        userId,
      ]
    );

    // Add creator as owner
    await db.query(
      `INSERT INTO organization_members (
        id, org_id, user_id, role, permissions, status, created_at, updated_at, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        orgId,
        userId,
        'owner',
        JSON.stringify([]),
        'active',
        now,
        now,
        userId,
      ]
    );

    // Audit log
    await auditLog(orgId, userId, 'org.created', 'organization', orgId, null, { name: body.name, type: body.type });

    log.info({ userId, orgId, name: body.name }, 'Organization created');

    const organization = await db.queryOne(
      `SELECT * FROM organizations WHERE id = $1`,
      [orgId]
    );

    return reply.status(201).send({
      data: organization,
    });
  });

  /**
   * GET /organizations/:orgId
   * Get organization details
   */
  app.get('/organizations/:orgId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    const organization = await db.queryOne(
      `SELECT * FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (!organization) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    // Get member count
    const memberCount = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM organization_members WHERE org_id = $1 AND status = 'active'`,
      [orgId]
    );

    // Get unit count
    const unitCount = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM organization_units WHERE org_id = $1 AND active = true`,
      [orgId]
    );

    return reply.send({
      data: {
        ...organization,
        member_count: parseInt(memberCount?.count || '0'),
        unit_count: parseInt(unitCount?.count || '0'),
        user_role: membership.role,
      },
    });
  });

  /**
   * GET /organizations/by-slug/:slug
   * Get organization by slug
   */
  app.get('/organizations/by-slug/:slug', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { slug } = request.params as { slug: string };

    const organization = await db.queryOne<{ id: string }>(
      `SELECT * FROM organizations WHERE slug = $1`,
      [slug]
    );

    if (!organization) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    const membership = await getMembership(organization.id, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    // Get counts
    const [memberCount, unitCount] = await Promise.all([
      db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM organization_members WHERE org_id = $1 AND status = 'active'`,
        [organization.id]
      ),
      db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM organization_units WHERE org_id = $1 AND active = true`,
        [organization.id]
      ),
    ]);

    return reply.send({
      data: {
        ...organization,
        member_count: parseInt(memberCount?.count || '0'),
        unit_count: parseInt(unitCount?.count || '0'),
        user_role: membership.role,
      },
    });
  });

  /**
   * PUT /organizations/:orgId
   * Update organization
   */
  app.put('/organizations/:orgId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = updateOrganizationSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!canManageOrg(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const oldOrg = await db.queryOne(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
    if (!oldOrg) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'name', 'type', 'logo_url', 'website',
      'address_line1', 'address_line2', 'city', 'state', 'zip', 'country', 'timezone',
      'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
    ];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push((body as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return reply.send({ data: oldOrg });
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(orgId);

    await db.query(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const newOrg = await db.queryOne(`SELECT * FROM organizations WHERE id = $1`, [orgId]);

    await auditLog(orgId, userId, 'org.updated', 'organization', orgId, oldOrg, newOrg);

    log.info({ userId, orgId }, 'Organization updated');

    return reply.send({ data: newOrg });
  });

  /**
   * DELETE /organizations/:orgId
   * Delete organization (owner only)
   */
  app.delete('/organizations/:orgId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };

    const membership = await getMembership(orgId, userId);
    if (!isOwner(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only the owner can delete the organization', statusCode: 403 },
      });
    }

    const org = await db.queryOne(`SELECT * FROM organizations WHERE id = $1`, [orgId]);
    if (!org) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    // Soft delete or hard delete based on preference
    // For now, we'll hard delete (cascade will handle related records)
    await db.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);

    log.info({ userId, orgId }, 'Organization deleted');

    return reply.send({ message: 'Organization deleted successfully' });
  });

  // ==========================================================================
  // UNIT MANAGEMENT
  // ==========================================================================

  /**
   * GET /organizations/:orgId/units
   * List units (with optional parent filter)
   */
  app.get('/organizations/:orgId/units', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const { parent_id, type } = request.query as { parent_id?: string; type?: string };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    let query = `SELECT * FROM organization_units WHERE org_id = $1 AND active = true`;
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (parent_id) {
      query += ` AND parent_unit_id = $${paramIndex}`;
      params.push(parent_id);
      paramIndex++;
    } else if (parent_id === null || parent_id === 'null') {
      query += ` AND parent_unit_id IS NULL`;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
    }

    query += ` ORDER BY level, name`;

    const units = await db.queryAll<{ id: string }>(query, params);

    // Get member counts per unit
    const unitIds = units.map(u => u.id);
    let memberCounts: Record<string, number> = {};

    if (unitIds.length > 0) {
      const counts = await db.queryAll<{ unit_id: string; count: string }>(
        `SELECT unit_id, COUNT(*) as count
         FROM organization_members
         WHERE org_id = $1 AND unit_id = ANY($2) AND status = 'active'
         GROUP BY unit_id`,
        [orgId, unitIds]
      );
      memberCounts = Object.fromEntries(counts.map(c => [c.unit_id, parseInt(c.count)]));
    }

    return reply.send({
      data: units.map(unit => ({
        ...unit,
        member_count: memberCounts[unit.id] || 0,
      })),
    });
  });

  /**
   * GET /organizations/:orgId/units/tree
   * Get nested unit tree
   */
  app.get('/organizations/:orgId/units/tree', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    interface UnitRow {
      id: string;
      parent_unit_id: string | null;
      [key: string]: unknown;
    }

    const units = await db.queryAll<UnitRow>(
      `SELECT * FROM organization_units WHERE org_id = $1 AND active = true ORDER BY level, name`,
      [orgId]
    );

    // Build tree structure
    interface UnitNode extends UnitRow {
      children: UnitNode[];
    }

    const unitMap = new Map<string, UnitNode>();
    const roots: UnitNode[] = [];

    // First pass: create all nodes
    for (const unit of units) {
      unitMap.set(unit.id, { ...unit, children: [] });
    }

    // Second pass: build tree
    for (const unit of units) {
      const node = unitMap.get(unit.id)!;
      if (unit.parent_unit_id && unitMap.has(unit.parent_unit_id)) {
        unitMap.get(unit.parent_unit_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return reply.send({ data: roots });
  });

  /**
   * POST /organizations/:orgId/units
   * Create a unit
   */
  app.post('/organizations/:orgId/units', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = createUnitSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!canManageUnits(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required to manage units', statusCode: 403 },
      });
    }

    // Calculate level and path
    let level = 1;
    let path = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (body.parent_unit_id) {
      const parent = await db.queryOne<{ level: number; path: string }>(
        `SELECT level, path FROM organization_units WHERE id = $1 AND org_id = $2`,
        [body.parent_unit_id, orgId]
      );

      if (!parent) {
        return reply.status(400).send({
          error: { code: 'INVALID_PARENT', message: 'Parent unit not found', statusCode: 400 },
        });
      }

      level = parent.level + 1;
      path = `${parent.path}/${path}`;
    }

    const unitId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.query(
      `INSERT INTO organization_units (
        id, org_id, parent_unit_id, name, code, type,
        address_line1, city, state, level, path, settings, active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        unitId,
        orgId,
        body.parent_unit_id || null,
        body.name,
        body.code || null,
        body.type,
        body.address_line1 || null,
        body.city || null,
        body.state || null,
        level,
        path,
        JSON.stringify(body.settings || {}),
        true,
        now,
        now,
      ]
    );

    await auditLog(orgId, userId, 'unit.created', 'unit', unitId, null, { name: body.name, type: body.type });

    const unit = await db.queryOne(`SELECT * FROM organization_units WHERE id = $1`, [unitId]);

    log.info({ userId, orgId, unitId, name: body.name }, 'Unit created');

    return reply.status(201).send({ data: unit });
  });

  /**
   * PUT /organizations/:orgId/units/:unitId
   * Update a unit
   */
  app.put('/organizations/:orgId/units/:unitId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId, unitId } = request.params as { orgId: string; unitId: string };
    const body = updateUnitSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!canManageUnits(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required to manage units', statusCode: 403 },
      });
    }

    const oldUnit = await db.queryOne(
      `SELECT * FROM organization_units WHERE id = $1 AND org_id = $2`,
      [unitId, orgId]
    );

    if (!oldUnit) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Unit not found', statusCode: 404 },
      });
    }

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = ['name', 'code', 'type', 'address_line1', 'city', 'state', 'settings'];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(field === 'settings' ? JSON.stringify((body as Record<string, unknown>)[field]) : (body as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return reply.send({ data: oldUnit });
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(unitId);
    values.push(orgId);

    await db.query(
      `UPDATE organization_units SET ${updates.join(', ')} WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}`,
      values
    );

    const newUnit = await db.queryOne(`SELECT * FROM organization_units WHERE id = $1`, [unitId]);

    await auditLog(orgId, userId, 'unit.updated', 'unit', unitId, oldUnit, newUnit);

    return reply.send({ data: newUnit });
  });

  /**
   * DELETE /organizations/:orgId/units/:unitId
   * Delete a unit
   */
  app.delete('/organizations/:orgId/units/:unitId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId, unitId } = request.params as { orgId: string; unitId: string };

    const membership = await getMembership(orgId, userId);
    if (!canManageUnits(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required to manage units', statusCode: 403 },
      });
    }

    const unit = await db.queryOne(
      `SELECT * FROM organization_units WHERE id = $1 AND org_id = $2`,
      [unitId, orgId]
    );

    if (!unit) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Unit not found', statusCode: 404 },
      });
    }

    // Soft delete
    await db.query(
      `UPDATE organization_units SET active = false, updated_at = $1 WHERE id = $2`,
      [new Date().toISOString(), unitId]
    );

    // Move members from this unit to no unit
    await db.query(
      `UPDATE organization_members SET unit_id = NULL, updated_at = $1 WHERE unit_id = $2`,
      [new Date().toISOString(), unitId]
    );

    await auditLog(orgId, userId, 'unit.deleted', 'unit', unitId, unit, null);

    log.info({ userId, orgId, unitId }, 'Unit deleted');

    return reply.send({ message: 'Unit deleted successfully' });
  });

  // ==========================================================================
  // MEMBER MANAGEMENT
  // ==========================================================================

  /**
   * GET /organizations/:orgId/members
   * List members (paginated, filterable)
   */
  app.get('/organizations/:orgId/members', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const {
      unit_id,
      role,
      status,
      search,
      limit = '50',
      offset = '0',
    } = request.query as {
      unit_id?: string;
      role?: string;
      status?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    // Supervisors can only see their unit and below
    // Admins and owners can see everyone
    let unitFilter = '';
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (membership.role === 'supervisor' && membership.unit_id) {
      // Get all descendant unit IDs
      const descendantUnits = await db.queryAll<{ id: string }>(
        `WITH RECURSIVE descendants AS (
          SELECT id FROM organization_units WHERE id = $1
          UNION ALL
          SELECT u.id FROM organization_units u
          INNER JOIN descendants d ON u.parent_unit_id = d.id
        )
        SELECT id FROM descendants`,
        [membership.unit_id]
      );
      const unitIds = descendantUnits.map(u => u.id);
      unitFilter = ` AND (om.unit_id = ANY($${paramIndex}) OR om.unit_id IS NULL)`;
      params.push(unitIds);
      paramIndex++;
    }

    let query = `
      SELECT om.*, u.username, u.display_name, u.email, u.avatar_url,
             ou.name as unit_name
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      LEFT JOIN organization_units ou ON om.unit_id = ou.id
      WHERE om.org_id = $1${unitFilter}
    `;

    if (unit_id) {
      query += ` AND om.unit_id = $${paramIndex}`;
      params.push(unit_id);
      paramIndex++;
    }

    if (role) {
      query += ` AND om.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (status) {
      query += ` AND om.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.username ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count query
    const countQuery = query.replace(/SELECT om\.\*.*FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = await db.queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // Add pagination
    query += ` ORDER BY om.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const members = await db.queryAll(query, params);

    return reply.send({
      data: members,
      meta: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  });

  /**
   * POST /organizations/:orgId/invite
   * Invite a member
   */
  app.post('/organizations/:orgId/invite', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = inviteMemberSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!canManageMembers(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Supervisor access required to invite members', statusCode: 403 },
      });
    }

    // Check if already a member
    const existingMember = await db.queryOne(
      `SELECT om.id FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.org_id = $1 AND u.email = $2`,
      [orgId, body.email]
    );

    if (existingMember) {
      return reply.status(400).send({
        error: { code: 'ALREADY_MEMBER', message: 'User is already a member', statusCode: 400 },
      });
    }

    // Check for existing pending invite
    const existingInvite = await db.queryOne(
      `SELECT id FROM organization_invites
       WHERE org_id = $1 AND email = $2 AND status = 'pending'`,
      [orgId, body.email]
    );

    if (existingInvite) {
      return reply.status(400).send({
        error: { code: 'INVITE_EXISTS', message: 'A pending invite already exists for this email', statusCode: 400 },
      });
    }

    const inviteId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await db.query(
      `INSERT INTO organization_invites (
        id, org_id, email, role, unit_id, token, message, status, expires_at, created_at, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        inviteId,
        orgId,
        body.email,
        body.role || 'member',
        body.unit_id || null,
        token,
        body.message || null,
        'pending',
        expiresAt,
        new Date().toISOString(),
        userId,
      ]
    );

    await auditLog(orgId, userId, 'member.invited', 'invite', inviteId, null, { email: body.email, role: body.role });

    log.info({ userId, orgId, inviteId, email: body.email }, 'Member invited');

    // In production, send email with invite link
    const inviteUrl = `https://musclemap.me/organizations/invite/${token}`;

    return reply.status(201).send({
      data: {
        invite_id: inviteId,
        invite_url: inviteUrl,
        expires_at: expiresAt,
      },
    });
  });

  /**
   * POST /organizations/:orgId/invite/bulk
   * Bulk invite members
   */
  app.post('/organizations/:orgId/invite/bulk', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = bulkInviteSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!canManageMembers(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Supervisor access required to invite members', statusCode: 403 },
      });
    }

    const results: { email: string; status: 'invited' | 'already_member' | 'already_invited' }[] = [];
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const member of body.members) {
      // Check if already a member
      const existingMember = await db.queryOne(
        `SELECT om.id FROM organization_members om
         JOIN users u ON om.user_id = u.id
         WHERE om.org_id = $1 AND u.email = $2`,
        [orgId, member.email]
      );

      if (existingMember) {
        results.push({ email: member.email, status: 'already_member' });
        continue;
      }

      // Check for existing invite
      const existingInvite = await db.queryOne(
        `SELECT id FROM organization_invites
         WHERE org_id = $1 AND email = $2 AND status = 'pending'`,
        [orgId, member.email]
      );

      if (existingInvite) {
        results.push({ email: member.email, status: 'already_invited' });
        continue;
      }

      const inviteId = crypto.randomUUID();
      const token = crypto.randomBytes(32).toString('hex');

      await db.query(
        `INSERT INTO organization_invites (
          id, org_id, email, role, unit_id, token, status, expires_at, created_at, invited_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          inviteId,
          orgId,
          member.email,
          member.role || 'member',
          member.unit_id || null,
          token,
          'pending',
          expiresAt,
          now,
          userId,
        ]
      );

      results.push({ email: member.email, status: 'invited' });
    }

    const invitedCount = results.filter(r => r.status === 'invited').length;
    await auditLog(orgId, userId, 'member.bulk_invited', null, null, null, { count: invitedCount });

    log.info({ userId, orgId, invitedCount }, 'Bulk invite completed');

    return reply.status(201).send({
      data: {
        results,
        summary: {
          invited: invitedCount,
          already_member: results.filter(r => r.status === 'already_member').length,
          already_invited: results.filter(r => r.status === 'already_invited').length,
        },
      },
    });
  });

  /**
   * POST /organizations/invites/:token/accept
   * Accept an invitation
   */
  app.post('/organizations/invites/:token/accept', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { token } = request.params as { token: string };

    // Get invite
    const invite = await db.queryOne<{
      id: string;
      org_id: string;
      email: string;
      role: string;
      unit_id: string | null;
      status: string;
      expires_at: string;
    }>(
      `SELECT * FROM organization_invites WHERE token = $1`,
      [token]
    );

    if (!invite) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Invite not found', statusCode: 404 },
      });
    }

    if (invite.status !== 'pending') {
      return reply.status(400).send({
        error: { code: 'INVALID_INVITE', message: `Invite is ${invite.status}`, statusCode: 400 },
      });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await db.query(
        `UPDATE organization_invites SET status = 'expired' WHERE id = $1`,
        [invite.id]
      );
      return reply.status(400).send({
        error: { code: 'INVITE_EXPIRED', message: 'Invite has expired', statusCode: 400 },
      });
    }

    // Verify email matches
    const user = await db.queryOne<{ email: string }>(
      `SELECT email FROM users WHERE id = $1`,
      [userId]
    );

    if (user?.email.toLowerCase() !== invite.email.toLowerCase()) {
      return reply.status(403).send({
        error: { code: 'EMAIL_MISMATCH', message: 'Invite is for a different email address', statusCode: 403 },
      });
    }

    // Check if already a member
    const existingMember = await getMembership(invite.org_id, userId);
    if (existingMember) {
      return reply.status(400).send({
        error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this organization', statusCode: 400 },
      });
    }

    const now = new Date().toISOString();
    const memberId = crypto.randomUUID();

    // Create membership
    await db.query(
      `INSERT INTO organization_members (
        id, org_id, user_id, unit_id, role, permissions, status, created_at, updated_at, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        memberId,
        invite.org_id,
        userId,
        invite.unit_id,
        invite.role,
        JSON.stringify([]),
        'active',
        now,
        now,
        userId,
      ]
    );

    // Update invite
    await db.query(
      `UPDATE organization_invites SET status = 'accepted', accepted_at = $1, accepted_by = $2 WHERE id = $3`,
      [now, userId, invite.id]
    );

    await auditLog(invite.org_id, userId, 'member.added', 'member', memberId, null, { role: invite.role });

    log.info({ userId, orgId: invite.org_id, memberId }, 'Invite accepted');

    // Get org details
    const org = await db.queryOne(`SELECT * FROM organizations WHERE id = $1`, [invite.org_id]);

    return reply.send({
      data: {
        membership_id: memberId,
        organization: org,
      },
      message: 'Successfully joined organization',
    });
  });

  /**
   * PUT /organizations/:orgId/members/:userId
   * Update a member
   */
  app.put('/organizations/:orgId/members/:memberId', { preHandler: authenticate }, async (request, reply) => {
    const actorId = request.user!.userId;
    const { orgId, memberId } = request.params as { orgId: string; memberId: string };
    const body = updateMemberSchema.parse(request.body);

    const actorMembership = await getMembership(orgId, actorId);
    if (!canManageMembers(actorMembership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Supervisor access required', statusCode: 403 },
      });
    }

    const targetMember = await db.queryOne<OrganizationMember>(
      `SELECT * FROM organization_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, memberId]
    );

    if (!targetMember) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Member not found', statusCode: 404 },
      });
    }

    // Can't change role of owner, and only owners can promote to admin
    if (body.role) {
      if (targetMember.role === 'owner') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot change owner role', statusCode: 403 },
        });
      }

      if (body.role === 'admin' && !isOwner(actorMembership)) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Only owners can promote to admin', statusCode: 403 },
        });
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'role', 'unit_id', 'badge_number', 'employee_id', 'rank', 'title',
      'hire_date', 'status', 'share_readiness', 'share_assessments', 'share_weak_events',
    ];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push((body as Record<string, unknown>)[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return reply.send({ data: targetMember });
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(orgId);
    values.push(memberId);

    await db.query(
      `UPDATE organization_members SET ${updates.join(', ')} WHERE org_id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      values
    );

    const newMember = await db.queryOne(
      `SELECT * FROM organization_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, memberId]
    );

    await auditLog(orgId, actorId, 'member.updated', 'member', targetMember.id, targetMember, newMember);

    return reply.send({ data: newMember });
  });

  /**
   * PUT /organizations/:orgId/members/bulk
   * Bulk update members
   */
  app.put('/organizations/:orgId/members/bulk', { preHandler: authenticate }, async (request, reply) => {
    const actorId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = bulkUpdateMembersSchema.parse(request.body);

    const actorMembership = await getMembership(orgId, actorId);
    if (!canManageMembers(actorMembership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Supervisor access required', statusCode: 403 },
      });
    }

    // Don't allow bulk role changes to admin
    if (body.updates.role === 'admin' && !isOwner(actorMembership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only owners can promote to admin', statusCode: 403 },
      });
    }

    const updates: string[] = [];
    const values: unknown[] = [orgId, body.user_ids];
    let paramIndex = 3;

    if (body.updates.unit_id !== undefined) {
      updates.push(`unit_id = $${paramIndex}`);
      values.push(body.updates.unit_id);
      paramIndex++;
    }

    if (body.updates.role) {
      updates.push(`role = $${paramIndex}`);
      values.push(body.updates.role);
      paramIndex++;
    }

    if (body.updates.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(body.updates.status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return reply.send({ data: { updated: 0 } });
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());

    const result = await db.queryAll<{ id: string }>(
      `UPDATE organization_members
       SET ${updates.join(', ')}
       WHERE org_id = $1 AND user_id = ANY($2) AND role != 'owner'
       RETURNING id`,
      values
    );

    await auditLog(orgId, actorId, 'member.bulk_updated', null, null, null, {
      user_ids: body.user_ids,
      updates: body.updates,
    });

    return reply.send({
      data: { updated: result.length },
    });
  });

  /**
   * DELETE /organizations/:orgId/members/:userId
   * Remove a member
   */
  app.delete('/organizations/:orgId/members/:memberId', { preHandler: authenticate }, async (request, reply) => {
    const actorId = request.user!.userId;
    const { orgId, memberId } = request.params as { orgId: string; memberId: string };

    const actorMembership = await getMembership(orgId, actorId);
    if (!canManageMembers(actorMembership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Supervisor access required', statusCode: 403 },
      });
    }

    const targetMember = await db.queryOne<OrganizationMember>(
      `SELECT * FROM organization_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, memberId]
    );

    if (!targetMember) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Member not found', statusCode: 404 },
      });
    }

    if (targetMember.role === 'owner') {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Cannot remove the owner', statusCode: 403 },
      });
    }

    await db.query(
      `DELETE FROM organization_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, memberId]
    );

    await auditLog(orgId, actorId, 'member.removed', 'member', targetMember.id, targetMember, null);

    log.info({ actorId, orgId, memberId }, 'Member removed');

    return reply.send({ message: 'Member removed successfully' });
  });

  // ==========================================================================
  // ORGANIZATION READINESS
  // ==========================================================================

  /**
   * GET /organizations/:orgId/readiness
   * Get organization-wide readiness
   */
  app.get('/organizations/:orgId/readiness', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const { standard_id } = request.query as { standard_id?: string };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    // Get organization
    const org = await db.queryOne<{ settings: string }>(
      `SELECT * FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (!org) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    // Get cached readiness data
    let query = `SELECT * FROM organization_readiness_cache WHERE org_id = $1 AND unit_id IS NULL`;
    const params: unknown[] = [orgId];

    if (standard_id) {
      query += ` AND standard_id = $2`;
      params.push(standard_id);
    }

    const readinessData = await db.queryAll(query, params);

    // Get unit-level breakdown
    const unitReadiness = await db.queryAll(
      `SELECT orc.*, ou.name as unit_name, ou.type as unit_type
       FROM organization_readiness_cache orc
       JOIN organization_units ou ON orc.unit_id = ou.id
       WHERE orc.org_id = $1 AND orc.unit_id IS NOT NULL
       ${standard_id ? 'AND orc.standard_id = $2' : ''}
       ORDER BY ou.level, ou.name`,
      standard_id ? [orgId, standard_id] : [orgId]
    );

    return reply.send({
      data: {
        organization: org,
        aggregate: readinessData[0] || null,
        by_unit: unitReadiness,
        standards: readinessData,
      },
    });
  });

  /**
   * GET /organizations/:orgId/units/:unitId/readiness
   * Get unit readiness
   */
  app.get('/organizations/:orgId/units/:unitId/readiness', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId, unitId } = request.params as { orgId: string; unitId: string };
    const { standard_id } = request.query as { standard_id?: string };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    // Supervisors can only view their unit and descendants
    if (membership.role === 'supervisor' && membership.unit_id) {
      const isDescendant = await db.queryOne(
        `WITH RECURSIVE descendants AS (
          SELECT id FROM organization_units WHERE id = $1
          UNION ALL
          SELECT u.id FROM organization_units u
          INNER JOIN descendants d ON u.parent_unit_id = d.id
        )
        SELECT id FROM descendants WHERE id = $2`,
        [membership.unit_id, unitId]
      );

      if (!isDescendant) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot view readiness for this unit', statusCode: 403 },
        });
      }
    }

    // Get unit
    const unit = await db.queryOne(
      `SELECT * FROM organization_units WHERE id = $1 AND org_id = $2`,
      [unitId, orgId]
    );

    if (!unit) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Unit not found', statusCode: 404 },
      });
    }

    // Get cached readiness
    let query = `SELECT * FROM organization_readiness_cache WHERE org_id = $1 AND unit_id = $2`;
    const params: unknown[] = [orgId, unitId];

    if (standard_id) {
      query += ` AND standard_id = $3`;
      params.push(standard_id);
    }

    const readinessData = await db.queryAll(query, params);

    // Get member readiness if allowed by org settings
    const orgRow = await db.queryOne<{ settings: Record<string, unknown> }>(
      `SELECT settings FROM organizations WHERE id = $1`,
      [orgId]
    );
    const orgSettings = orgRow?.settings || {};

    let memberReadiness: unknown[] = [];
    if (orgSettings.allow_individual_scores && hasRole(membership, ['supervisor', 'admin', 'owner'])) {
      memberReadiness = await db.queryAll(
        `SELECT om.user_id, u.username, u.display_name,
                om.rank, om.title, om.share_readiness,
                ucg.readiness_score, ucg.last_assessment_at
         FROM organization_members om
         JOIN users u ON om.user_id = u.id
         LEFT JOIN user_career_goals ucg ON om.user_id = ucg.user_id
         WHERE om.org_id = $1 AND om.unit_id = $2 AND om.status = 'active'
         AND (om.share_readiness = true OR $3 = true)
         ORDER BY u.display_name, u.username`,
        [orgId, unitId, !orgSettings.require_member_opt_in]
      );
    }

    return reply.send({
      data: {
        unit,
        aggregate: readinessData[0] || null,
        members: memberReadiness,
        standards: readinessData,
      },
    });
  });

  /**
   * GET /organizations/:orgId/readiness/history
   * Get historical readiness trend
   */
  app.get('/organizations/:orgId/readiness/history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const {
      standard_id,
      unit_id,
      start_date,
      end_date,
    } = request.query as {
      standard_id?: string;
      unit_id?: string;
      start_date?: string;
      end_date?: string;
    };

    const membership = await getMembership(orgId, userId);
    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this organization', statusCode: 403 },
      });
    }

    let query = `
      SELECT * FROM organization_readiness_snapshots
      WHERE org_id = $1
    `;
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (unit_id) {
      query += ` AND unit_id = $${paramIndex}`;
      params.push(unit_id);
      paramIndex++;
    } else {
      query += ` AND unit_id IS NULL`;
    }

    if (standard_id) {
      query += ` AND standard_id = $${paramIndex}`;
      params.push(standard_id);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND snapshot_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND snapshot_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ` ORDER BY snapshot_date ASC`;

    const snapshots = await db.queryAll<{ average_readiness: number }>(query, params);

    // Calculate trend
    let trend = 'stable';
    let delta = 0;

    if (snapshots.length >= 2) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];

      if (first.average_readiness && last.average_readiness) {
        delta = last.average_readiness - first.average_readiness;
        if (delta > 2) trend = 'improving';
        else if (delta < -2) trend = 'declining';
      }
    }

    return reply.send({
      data: {
        snapshots,
        trend: { direction: trend, delta },
      },
    });
  });

  /**
   * POST /organizations/:orgId/readiness/refresh
   * Force refresh readiness cache
   */
  app.post('/organizations/:orgId/readiness/refresh', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };

    const membership = await getMembership(orgId, userId);
    if (!canManageOrg(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    // In production, this would trigger a background job
    // For now, we'll just mark the cache as stale
    await db.query(
      `UPDATE organization_readiness_cache SET computed_at = NULL WHERE org_id = $1`,
      [orgId]
    );

    await auditLog(orgId, userId, 'readiness.refreshed', null, null, null, null);

    log.info({ userId, orgId }, 'Readiness cache refresh requested');

    return reply.send({
      message: 'Readiness refresh queued',
    });
  });

  /**
   * POST /organizations/:orgId/readiness/export
   * Generate readiness report
   */
  app.post('/organizations/:orgId/readiness/export', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = exportReportSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!hasRole(membership, ['supervisor', 'admin', 'owner'])) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Supervisor access required', statusCode: 403 },
      });
    }

    // Get organization details
    const org = await db.queryOne<{
      name: string;
      settings: { required_standards?: string[]; compliance_threshold?: number }
    }>(
      `SELECT name, settings FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (!org) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    const settings = org.settings || {};
    const requiredStandards = settings.required_standards || [];
    const complianceThreshold = settings.compliance_threshold ?? 80;

    // Build unit filter if specified
    let unitFilter = '';
    const baseParams: unknown[] = [orgId];
    if (body.unit_ids && body.unit_ids.length > 0) {
      unitFilter = ` AND orc.unit_id = ANY($2)`;
      baseParams.push(body.unit_ids);
    }

    // Get aggregate readiness data from cache
    const standardFilter = body.standard_id
      ? ` AND orc.standard_id = $${baseParams.length + 1}`
      : '';
    if (body.standard_id) {
      baseParams.push(body.standard_id);
    }

    const aggregateData = await db.queryAll<{
      unit_id: string | null;
      unit_name: string | null;
      standard_id: string;
      total_members: number;
      members_opted_in: number;
      members_ready: number;
      members_at_risk: number;
      members_not_ready: number;
      average_readiness: number | null;
      compliance_rate: number | null;
      trend_direction: string | null;
      computed_at: string;
    }>(
      `SELECT
         orc.unit_id,
         ou.name as unit_name,
         orc.standard_id,
         orc.total_members,
         orc.members_opted_in,
         orc.members_ready,
         orc.members_at_risk,
         orc.members_not_ready,
         orc.average_readiness,
         orc.compliance_rate,
         orc.trend_direction,
         orc.computed_at
       FROM organization_readiness_cache orc
       LEFT JOIN organization_units ou ON orc.unit_id = ou.id
       WHERE orc.org_id = $1${unitFilter}${standardFilter}
       ORDER BY ou.name NULLS FIRST, orc.standard_id`,
      baseParams
    );

    // Get member-level data if requested
    let memberData: Array<{
      user_id: string;
      username: string;
      display_name: string | null;
      unit_name: string | null;
      standard_id: string;
      readiness_score: number | null;
      last_assessment_at: string | null;
      status: string;
    }> = [];

    if (body.include_individual) {
      const memberParams: unknown[] = [orgId, 'active'];
      let memberUnitFilter = '';
      if (body.unit_ids && body.unit_ids.length > 0) {
        memberUnitFilter = ` AND om.unit_id = ANY($3)`;
        memberParams.push(body.unit_ids);
      }

      const standards = body.standard_id ? [body.standard_id] : requiredStandards;
      if (standards.length > 0) {
        memberParams.push(standards);
        const standardParamIndex = memberParams.length;

        const rawMemberData = await db.queryAll<{
          user_id: string;
          username: string;
          display_name: string | null;
          unit_name: string | null;
          standard_id: string;
          readiness_score: number | null;
          last_assessment_at: string | null;
        }>(
          `SELECT
             om.user_id,
             u.username,
             u.display_name,
             ou.name as unit_name,
             ucg.pt_test_id as standard_id,
             crc.readiness_score,
             crc.last_assessment_at
           FROM organization_members om
           JOIN users u ON u.id = om.user_id
           LEFT JOIN organization_units ou ON ou.id = om.unit_id
           LEFT JOIN user_career_goals ucg ON ucg.user_id = om.user_id AND ucg.pt_test_id = ANY($${standardParamIndex})
           LEFT JOIN career_readiness_cache crc ON crc.goal_id = ucg.id
           WHERE om.org_id = $1 AND om.status = $2 AND om.share_readiness = true${memberUnitFilter}
           ORDER BY ou.name NULLS FIRST, u.username`,
          memberParams
        );

        // Add status based on readiness score
        memberData = rawMemberData.map(m => ({
          ...m,
          status: m.readiness_score === null
            ? 'no_data'
            : m.readiness_score >= complianceThreshold
              ? 'ready'
              : m.readiness_score >= 70
                ? 'at_risk'
                : 'not_ready',
        }));
      }
    }

    // Get historical data if date range specified
    let historyData: Array<{
      snapshot_date: string;
      unit_name: string | null;
      standard_id: string;
      average_readiness: number | null;
      compliance_rate: number | null;
      total_members: number;
    }> = [];

    if (body.date_range) {
      const historyParams: unknown[] = [orgId, body.date_range.start, body.date_range.end];
      let historyUnitFilter = '';
      if (body.unit_ids && body.unit_ids.length > 0) {
        historyUnitFilter = ` AND ors.unit_id = ANY($4)`;
        historyParams.push(body.unit_ids);
      }

      const historyStandardFilter = body.standard_id
        ? ` AND ors.standard_id = $${historyParams.length + 1}`
        : '';
      if (body.standard_id) {
        historyParams.push(body.standard_id);
      }

      historyData = await db.queryAll<{
        snapshot_date: string;
        unit_name: string | null;
        standard_id: string;
        average_readiness: number | null;
        compliance_rate: number | null;
        total_members: number;
      }>(
        `SELECT
           ors.snapshot_date,
           ou.name as unit_name,
           ors.standard_id,
           ors.average_readiness,
           ors.compliance_rate,
           ors.total_members
         FROM organization_readiness_snapshots ors
         LEFT JOIN organization_units ou ON ors.unit_id = ou.id
         WHERE ors.org_id = $1
           AND ors.snapshot_date >= $2
           AND ors.snapshot_date <= $3${historyUnitFilter}${historyStandardFilter}
         ORDER BY ors.snapshot_date DESC, ou.name NULLS FIRST`,
        historyParams
      );
    }

    const reportId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();

    // Generate report based on format
    if (body.format === 'csv') {
      // Generate CSV content
      const lines: string[] = [];

      // Header section
      lines.push(`# Organization Readiness Report`);
      lines.push(`# Organization: ${org.name}`);
      lines.push(`# Generated: ${generatedAt}`);
      lines.push(`# Compliance Threshold: ${complianceThreshold}%`);
      lines.push('');

      // Aggregate summary section
      lines.push('## Aggregate Readiness Summary');
      lines.push('Unit,Standard,Total Members,Opted In,Ready,At Risk,Not Ready,Avg Readiness,Compliance Rate,Trend');
      for (const row of aggregateData) {
        lines.push([
          row.unit_name || 'Organization-wide',
          row.standard_id,
          row.total_members,
          row.members_opted_in,
          row.members_ready,
          row.members_at_risk,
          row.members_not_ready,
          row.average_readiness !== null ? `${row.average_readiness}%` : 'N/A',
          row.compliance_rate !== null ? `${row.compliance_rate}%` : 'N/A',
          row.trend_direction || 'N/A',
        ].join(','));
      }
      lines.push('');

      // Individual member section (if requested)
      if (body.include_individual && memberData.length > 0) {
        lines.push('## Individual Member Readiness');
        lines.push('Username,Display Name,Unit,Standard,Readiness Score,Status,Last Assessment');
        for (const member of memberData) {
          lines.push([
            member.username,
            member.display_name || '',
            member.unit_name || 'Unassigned',
            member.standard_id || 'N/A',
            member.readiness_score !== null ? `${member.readiness_score}%` : 'N/A',
            member.status,
            member.last_assessment_at || 'Never',
          ].join(','));
        }
        lines.push('');
      }

      // Historical section (if date range provided)
      if (historyData.length > 0) {
        lines.push('## Historical Readiness');
        lines.push('Date,Unit,Standard,Avg Readiness,Compliance Rate,Total Members');
        for (const snapshot of historyData) {
          lines.push([
            snapshot.snapshot_date,
            snapshot.unit_name || 'Organization-wide',
            snapshot.standard_id,
            snapshot.average_readiness !== null ? `${snapshot.average_readiness}%` : 'N/A',
            snapshot.compliance_rate !== null ? `${snapshot.compliance_rate}%` : 'N/A',
            snapshot.total_members,
          ].join(','));
        }
      }

      const csvContent = lines.join('\n');

      await auditLog(orgId, userId, 'report.generated', 'report', reportId, null, {
        format: body.format,
        include_individual: body.include_individual,
        row_count: aggregateData.length + memberData.length + historyData.length,
      });

      log.info({ userId, orgId, reportId, format: body.format }, 'Report generated');

      // Return CSV directly with appropriate headers
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="readiness-report-${orgId}-${generatedAt.split('T')[0]}.csv"`)
        .send(csvContent);
    }

    // For PDF and XLSX formats, return JSON data that can be rendered client-side
    // These formats would typically require external libraries (pdfkit, exceljs)
    const reportData = {
      report_id: reportId,
      organization: org.name,
      generated_at: generatedAt,
      compliance_threshold: complianceThreshold,
      format: body.format,
      aggregate: aggregateData,
      members: body.include_individual ? memberData : undefined,
      history: historyData.length > 0 ? historyData : undefined,
      summary: {
        total_units: new Set(aggregateData.filter(a => a.unit_id).map(a => a.unit_id)).size,
        total_members: aggregateData.reduce((sum, a) => a.unit_id === null ? a.total_members : sum, 0),
        average_compliance: aggregateData.length > 0
          ? Math.round(aggregateData.filter(a => a.compliance_rate !== null).reduce((sum, a) => sum + (a.compliance_rate || 0), 0) / aggregateData.filter(a => a.compliance_rate !== null).length * 10) / 10
          : null,
      },
    };

    await auditLog(orgId, userId, 'report.generated', 'report', reportId, null, {
      format: body.format,
      include_individual: body.include_individual,
      row_count: aggregateData.length + memberData.length + historyData.length,
    });

    log.info({ userId, orgId, reportId, format: body.format }, 'Report generated');

    // For PDF/XLSX, return JSON data with a note about client-side rendering
    return reply.send({
      data: reportData,
      message: `${body.format.toUpperCase()} format requested - use the returned data to generate the report client-side or implement server-side rendering with appropriate libraries`,
    });
  });

  // ==========================================================================
  // SETTINGS & AUDIT
  // ==========================================================================

  /**
   * GET /organizations/:orgId/settings
   * Get organization settings
   */
  app.get('/organizations/:orgId/settings', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };

    const membership = await getMembership(orgId, userId);
    if (!canManageOrg(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const org = await db.queryOne<{ settings: string }>(
      `SELECT settings FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (!org) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: org.settings,
    });
  });

  /**
   * PUT /organizations/:orgId/settings
   * Update organization settings
   */
  app.put('/organizations/:orgId/settings', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const body = updateSettingsSchema.parse(request.body);

    const membership = await getMembership(orgId, userId);
    if (!canManageOrg(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const org = await db.queryOne<{ settings: string }>(
      `SELECT settings FROM organizations WHERE id = $1`,
      [orgId]
    );

    if (!org) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', statusCode: 404 },
      });
    }

    const oldSettings = org.settings || {};
    const newSettings = { ...oldSettings, ...body };

    await db.query(
      `UPDATE organizations SET settings = $1, updated_at = $2 WHERE id = $3`,
      [newSettings, new Date().toISOString(), orgId]
    );

    await auditLog(orgId, userId, 'settings.updated', 'settings', null, oldSettings, newSettings);

    log.info({ userId, orgId }, 'Organization settings updated');

    return reply.send({
      data: newSettings,
    });
  });

  /**
   * GET /organizations/:orgId/audit
   * Get audit log
   */
  app.get('/organizations/:orgId/audit', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { orgId } = request.params as { orgId: string };
    const {
      action,
      actor_id,
      start_date,
      end_date,
      limit = '50',
      offset = '0',
    } = request.query as {
      action?: string;
      actor_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: string;
      offset?: string;
    };

    const membership = await getMembership(orgId, userId);
    if (!canManageOrg(membership)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    let query = `
      SELECT oal.*, u.username as actor_username, u.display_name as actor_display_name
      FROM organization_audit_log oal
      LEFT JOIN users u ON oal.actor_id = u.id
      WHERE oal.org_id = $1
    `;
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (action) {
      // Support wildcard patterns like "member.*"
      if (action.includes('*')) {
        query += ` AND oal.action LIKE $${paramIndex}`;
        params.push(action.replace('*', '%'));
      } else {
        query += ` AND oal.action = $${paramIndex}`;
        params.push(action);
      }
      paramIndex++;
    }

    if (actor_id) {
      query += ` AND oal.actor_id = $${paramIndex}`;
      params.push(actor_id);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND oal.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND oal.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Count query
    const countQuery = query.replace(/SELECT oal\.\*.*FROM/, 'SELECT COUNT(*) as count FROM');
    const countResult = await db.queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0');

    // Add pagination
    query += ` ORDER BY oal.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const entries = await db.queryAll(query, params);

    return reply.send({
      data: entries,
      meta: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  });
}
