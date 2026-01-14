/**
 * Organizations Module
 *
 * Enterprise organization management for MuscleMap.
 * Provides hierarchical team structures with units, role-based permissions,
 * and comprehensive audit logging.
 */

import { queryOne, queryAll, query, transaction } from '../../db/client';
import { ValidationError, NotFoundError, AuthorizationError, ConflictError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';
import type {
  Organization,
  OrgSettings,
  OrgUnit,
  OrgUnitTree,
  OrgMember,
  OrgInvite,
  OrgRole,
  OrgPermission,
  CreateOrgData,
  UpdateOrgData,
  CreateUnitData,
  UpdateUnitData,
  MemberFilters,
  UnitFilters,
  BulkInviteItem,
  BulkUpdateData,
  OrgAuditLog,
} from './types';
import { ROLE_PERMISSIONS } from './types';

const log = loggers.db;

// =============================================
// HELPERS
// =============================================

/**
 * Generate a unique ID with prefix
 */
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Generate a secure invite token
 */
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Default organization settings
 */
const DEFAULT_ORG_SETTINGS: OrgSettings = {
  allowPublicJoin: false,
  requireEmailDomain: false,
  allowedDomains: [],
  defaultRole: 'member',
  requireMfa: false,
  ssoEnabled: false,
  ssoProvider: null,
};

// =============================================
// ORGANIZATION CRUD
// =============================================

/**
 * Create a new organization
 */
export async function createOrganization(
  data: CreateOrgData,
  userId: string
): Promise<Organization> {
  const id = genId('org');
  const slug = data.slug || generateSlug(data.name);
  const now = new Date().toISOString();
  const settings = { ...DEFAULT_ORG_SETTINGS, ...data.settings };

  return await transaction(async (client) => {
    // Check slug uniqueness
    const existingSlug = await client.query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    if (existingSlug.rows.length > 0) {
      throw new ConflictError(`Organization slug "${slug}" is already taken`);
    }

    // Create the organization
    await client.query(
      `INSERT INTO organizations (
        id, name, slug, description, logo, domain, settings, owner_id,
        member_count, unit_count, max_members, tier, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 0, $9, $10, $11, $11)`,
      [
        id,
        data.name,
        slug,
        data.description || null,
        data.logo || null,
        data.domain || null,
        JSON.stringify(settings),
        userId,
        null, // max_members
        'free',
        now,
      ]
    );

    // Add creator as owner member
    const memberId = genId('om');
    await client.query(
      `INSERT INTO org_members (
        id, org_id, user_id, unit_id, role, permissions, joined_at, updated_at
      ) VALUES ($1, $2, $3, NULL, 'owner', $4, $5, $5)`,
      [memberId, id, userId, JSON.stringify(ROLE_PERMISSIONS.owner), now]
    );

    // Create audit log entry
    await createAuditLog(client, {
      orgId: id,
      userId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: id,
      details: { name: data.name, slug },
    });

    log.info({ orgId: id, userId, name: data.name }, 'Organization created');

    return {
      id,
      name: data.name,
      slug,
      description: data.description || null,
      logo: data.logo || null,
      domain: data.domain || null,
      settings,
      ownerId: userId,
      memberCount: 1,
      unitCount: 0,
      maxMembers: null,
      tier: 'free',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  });
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    domain: string | null;
    settings: OrgSettings;
    owner_id: string;
    member_count: number;
    unit_count: number;
    max_members: number | null;
    tier: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL`,
    [orgId]
  );

  if (!row) return null;

  return mapOrgRow(row);
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    domain: string | null;
    settings: OrgSettings;
    owner_id: string;
    member_count: number;
    unit_count: number;
    max_members: number | null;
    tier: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL`,
    [slug]
  );

  if (!row) return null;

  return mapOrgRow(row);
}

/**
 * Update organization
 */
export async function updateOrganization(
  orgId: string,
  data: UpdateOrgData,
  userId: string
): Promise<Organization | null> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'org:update');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to update this organization');
  }

  const updates: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.slug !== undefined) {
    // Check slug uniqueness
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1 AND id != $2 AND deleted_at IS NULL',
      [data.slug, orgId]
    );
    if (existing) {
      throw new ConflictError(`Organization slug "${data.slug}" is already taken`);
    }
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.logo !== undefined) {
    updates.push(`logo = $${paramIndex++}`);
    values.push(data.logo);
  }
  if (data.domain !== undefined) {
    updates.push(`domain = $${paramIndex++}`);
    values.push(data.domain);
  }
  if (data.settings !== undefined) {
    // Merge with existing settings
    const org = await getOrganization(orgId);
    if (org) {
      const newSettings = { ...org.settings, ...data.settings };
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(newSettings));
    }
  }
  if (data.maxMembers !== undefined) {
    updates.push(`max_members = $${paramIndex++}`);
    values.push(data.maxMembers);
  }
  if (data.tier !== undefined) {
    updates.push(`tier = $${paramIndex++}`);
    values.push(data.tier);
  }

  values.push(orgId);

  await query(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL`,
    values
  );

  // Create audit log
  await logAuditEvent(orgId, userId, 'organization.updated', 'organization', orgId, data);

  return getOrganization(orgId);
}

/**
 * Soft delete organization
 */
export async function deleteOrganization(orgId: string, userId: string): Promise<boolean> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'org:delete');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to delete this organization');
  }

  const result = await query(
    `UPDATE organizations SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [orgId]
  );

  if ((result?.rowCount ?? 0) > 0) {
    await logAuditEvent(orgId, userId, 'organization.deleted', 'organization', orgId, null);
    log.info({ orgId, userId }, 'Organization soft deleted');
    return true;
  }

  return false;
}

// =============================================
// UNIT MANAGEMENT
// =============================================

/**
 * Create a new unit within an organization
 */
export async function createUnit(
  orgId: string,
  data: CreateUnitData,
  userId: string
): Promise<OrgUnit> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'unit:create');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to create units');
  }

  const id = genId('unit');
  const slug = data.slug || generateSlug(data.name);
  const now = new Date().toISOString();

  return await transaction(async (client) => {
    // If parent specified, verify it exists and calculate path
    let path = `/${id}`;
    let level = 0;

    if (data.parentId) {
      const parent = await client.query<{ path: string; level: number }>(
        'SELECT path, level FROM org_units WHERE id = $1 AND org_id = $2',
        [data.parentId, orgId]
      );
      if (parent.rows.length === 0) {
        throw new NotFoundError('Parent unit not found');
      }
      path = `${parent.rows[0].path}/${id}`;
      level = parent.rows[0].level + 1;
    }

    // Check slug uniqueness within org
    const existingSlug = await client.query<{ id: string }>(
      'SELECT id FROM org_units WHERE org_id = $1 AND slug = $2',
      [orgId, slug]
    );
    if (existingSlug.rows.length > 0) {
      throw new ConflictError(`Unit slug "${slug}" already exists in this organization`);
    }

    // Get max sort order for sibling units
    const maxOrder = await client.query<{ max_order: number | null }>(
      `SELECT MAX(sort_order) as max_order FROM org_units
       WHERE org_id = $1 AND COALESCE(parent_id, '') = COALESCE($2, '')`,
      [orgId, data.parentId || null]
    );
    const sortOrder = data.sortOrder ?? ((maxOrder.rows[0]?.max_order ?? -1) + 1);

    // Insert the unit
    await client.query(
      `INSERT INTO org_units (
        id, org_id, name, slug, description, parent_id, path, level,
        member_count, sort_order, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $11)`,
      [
        id,
        orgId,
        data.name,
        slug,
        data.description || null,
        data.parentId || null,
        path,
        level,
        sortOrder,
        data.metadata ? JSON.stringify(data.metadata) : null,
        now,
      ]
    );

    // Update org unit count
    await client.query(
      'UPDATE organizations SET unit_count = unit_count + 1 WHERE id = $1',
      [orgId]
    );

    // Audit log
    await createAuditLog(client, {
      orgId,
      userId,
      action: 'unit.created',
      resourceType: 'unit',
      resourceId: id,
      details: { name: data.name, parentId: data.parentId },
    });

    log.info({ orgId, unitId: id, userId, name: data.name }, 'Unit created');

    return {
      id,
      orgId,
      name: data.name,
      slug,
      description: data.description || null,
      parentId: data.parentId || null,
      path,
      level,
      memberCount: 0,
      sortOrder,
      metadata: data.metadata || null,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Get units for an organization with optional filters
 */
export async function getUnits(
  orgId: string,
  filters?: UnitFilters
): Promise<OrgUnit[]> {
  let whereClause = 'WHERE org_id = $1';
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (filters?.parentId !== undefined) {
    if (filters.parentId === null) {
      whereClause += ' AND parent_id IS NULL';
    } else {
      whereClause += ` AND parent_id = $${paramIndex++}`;
      params.push(filters.parentId);
    }
  }

  const rows = await queryAll<{
    id: string;
    org_id: string;
    name: string;
    slug: string;
    description: string | null;
    parent_id: string | null;
    path: string;
    level: number;
    member_count: number;
    sort_order: number;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM org_units ${whereClause} ORDER BY level, sort_order, name`,
    params
  );

  return rows.map(mapUnitRow);
}

/**
 * Get unit tree structure for an organization
 */
export async function getUnitTree(orgId: string): Promise<OrgUnitTree[]> {
  const units = await getUnits(orgId);

  // Build tree from flat list
  const unitMap = new Map<string, OrgUnitTree>();
  const roots: OrgUnitTree[] = [];

  // First pass: create all nodes
  for (const unit of units) {
    unitMap.set(unit.id, { ...unit, children: [] });
  }

  // Second pass: build tree structure
  for (const unit of units) {
    const node = unitMap.get(unit.id)!;
    if (unit.parentId && unitMap.has(unit.parentId)) {
      unitMap.get(unit.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Update a unit
 */
export async function updateUnit(
  orgId: string,
  unitId: string,
  data: UpdateUnitData,
  userId: string
): Promise<OrgUnit | null> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'unit:update');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to update units');
  }

  return await transaction(async (client) => {
    // Get current unit
    const current = await client.query<{
      id: string;
      org_id: string;
      path: string;
      level: number;
      parent_id: string | null;
    }>(
      'SELECT id, org_id, path, level, parent_id FROM org_units WHERE id = $1 AND org_id = $2 FOR UPDATE',
      [unitId, orgId]
    );

    if (current.rows.length === 0) {
      return null;
    }

    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      // Check slug uniqueness within org
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM org_units WHERE org_id = $1 AND slug = $2 AND id != $3',
        [orgId, data.slug, unitId]
      );
      if (existing.rows.length > 0) {
        throw new ConflictError(`Unit slug "${data.slug}" already exists`);
      }
      updates.push(`slug = $${paramIndex++}`);
      values.push(data.slug);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(data.sortOrder);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata ? JSON.stringify(data.metadata) : null);
    }

    // Handle parent change (requires path recalculation)
    if (data.parentId !== undefined && data.parentId !== current.rows[0].parent_id) {
      // Prevent circular reference
      if (data.parentId) {
        const newParent = await client.query<{ path: string; level: number }>(
          'SELECT path, level FROM org_units WHERE id = $1 AND org_id = $2',
          [data.parentId, orgId]
        );
        if (newParent.rows.length === 0) {
          throw new NotFoundError('New parent unit not found');
        }
        // Check not moving to descendant
        if (newParent.rows[0].path.startsWith(current.rows[0].path)) {
          throw new ValidationError('Cannot move unit to its own descendant');
        }

        const newPath = `${newParent.rows[0].path}/${unitId}`;
        const newLevel = newParent.rows[0].level + 1;
        const oldPath = current.rows[0].path;

        updates.push(`parent_id = $${paramIndex++}`);
        values.push(data.parentId);
        updates.push(`path = $${paramIndex++}`);
        values.push(newPath);
        updates.push(`level = $${paramIndex++}`);
        values.push(newLevel);

        // Update all descendants' paths
        const levelDiff = newLevel - current.rows[0].level;
        await client.query(
          `UPDATE org_units
           SET path = $1 || SUBSTRING(path FROM $2),
               level = level + $3
           WHERE org_id = $4 AND path LIKE $5 AND id != $6`,
          [newPath, oldPath.length + 1, levelDiff, orgId, `${oldPath}/%`, unitId]
        );
      } else {
        // Moving to root
        const newPath = `/${unitId}`;
        const newLevel = 0;
        const oldPath = current.rows[0].path;

        updates.push(`parent_id = $${paramIndex++}`);
        values.push(null);
        updates.push(`path = $${paramIndex++}`);
        values.push(newPath);
        updates.push(`level = $${paramIndex++}`);
        values.push(newLevel);

        // Update all descendants' paths
        const levelDiff = newLevel - current.rows[0].level;
        await client.query(
          `UPDATE org_units
           SET path = $1 || SUBSTRING(path FROM $2),
               level = level + $3
           WHERE org_id = $4 AND path LIKE $5 AND id != $6`,
          [newPath, oldPath.length + 1, levelDiff, orgId, `${oldPath}/%`, unitId]
        );
      }
    }

    values.push(unitId, orgId);

    await client.query(
      `UPDATE org_units SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND org_id = $${paramIndex}`,
      values
    );

    // Audit log
    await createAuditLog(client, {
      orgId,
      userId,
      action: 'unit.updated',
      resourceType: 'unit',
      resourceId: unitId,
      details: data,
    });

    // Return updated unit
    const updated = await client.query<{
      id: string;
      org_id: string;
      name: string;
      slug: string;
      description: string | null;
      parent_id: string | null;
      path: string;
      level: number;
      member_count: number;
      sort_order: number;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM org_units WHERE id = $1',
      [unitId]
    );

    return updated.rows.length > 0 ? mapUnitRow(updated.rows[0]) : null;
  });
}

/**
 * Delete a unit
 */
export async function deleteUnit(
  orgId: string,
  unitId: string,
  userId: string
): Promise<boolean> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'unit:delete');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to delete units');
  }

  return await transaction(async (client) => {
    // Check for members in unit
    const memberCount = await client.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM org_members WHERE org_id = $1 AND unit_id = $2',
      [orgId, unitId]
    );
    if (parseInt(memberCount.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete unit with members. Reassign members first.');
    }

    // Check for child units
    const childCount = await client.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM org_units WHERE org_id = $1 AND parent_id = $2',
      [orgId, unitId]
    );
    if (parseInt(childCount.rows[0].count) > 0) {
      throw new ValidationError('Cannot delete unit with child units. Delete or move children first.');
    }

    // Delete the unit
    const result = await client.query(
      'DELETE FROM org_units WHERE id = $1 AND org_id = $2',
      [unitId, orgId]
    );

    if ((result.rowCount ?? 0) > 0) {
      // Update org unit count
      await client.query(
        'UPDATE organizations SET unit_count = unit_count - 1 WHERE id = $1',
        [orgId]
      );

      // Audit log
      await createAuditLog(client, {
        orgId,
        userId,
        action: 'unit.deleted',
        resourceType: 'unit',
        resourceId: unitId,
        details: null,
      });

      log.info({ orgId, unitId, userId }, 'Unit deleted');
      return true;
    }

    return false;
  });
}

// =============================================
// MEMBER MANAGEMENT
// =============================================

/**
 * Invite a member to the organization
 */
export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgRole,
  unitId: string | null,
  userId: string,
  message?: string
): Promise<OrgInvite> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'member:invite');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to invite members');
  }

  // Only owners/admins can invite as admin
  if (role === 'admin' || role === 'owner') {
    const userRole = await getOrgRole(userId, orgId);
    if (userRole !== 'owner') {
      throw new AuthorizationError('Only owners can invite admins');
    }
  }

  const id = genId('inv');
  const token = generateInviteToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check for existing pending invite
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM org_invites WHERE org_id = $1 AND email = $2 AND status = 'pending'`,
    [orgId, email.toLowerCase()]
  );
  if (existing) {
    throw new ConflictError('An invite is already pending for this email');
  }

  // Check if already a member
  const existingMember = await queryOne<{ id: string }>(
    `SELECT om.id FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1 AND u.email = $2`,
    [orgId, email.toLowerCase()]
  );
  if (existingMember) {
    throw new ConflictError('User is already a member of this organization');
  }

  // Verify unit exists if specified
  if (unitId) {
    const unit = await queryOne<{ id: string }>(
      'SELECT id FROM org_units WHERE id = $1 AND org_id = $2',
      [unitId, orgId]
    );
    if (!unit) {
      throw new NotFoundError('Unit not found');
    }
  }

  await query(
    `INSERT INTO org_invites (
      id, org_id, email, role, unit_id, token, status, invited_by,
      message, expires_at, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)`,
    [
      id,
      orgId,
      email.toLowerCase(),
      role,
      unitId,
      token,
      userId,
      message || null,
      expiresAt.toISOString(),
      now.toISOString(),
    ]
  );

  // Audit log
  await logAuditEvent(orgId, userId, 'member.invited', 'invite', id, { email, role, unitId });

  log.info({ orgId, email, role, userId }, 'Member invited');

  return {
    id,
    orgId,
    email: email.toLowerCase(),
    role,
    unitId,
    token,
    status: 'pending',
    invitedBy: userId,
    message: message || null,
    expiresAt: expiresAt.toISOString(),
    acceptedAt: null,
    acceptedBy: null,
    createdAt: now.toISOString(),
  };
}

/**
 * Accept an invite using token
 */
export async function acceptInvite(
  token: string,
  userId: string
): Promise<OrgMember> {
  return await transaction(async (client) => {
    // Get and lock the invite
    const inviteResult = await client.query<{
      id: string;
      org_id: string;
      email: string;
      role: string;
      unit_id: string | null;
      status: string;
      invited_by: string;
      expires_at: string;
    }>(
      `SELECT * FROM org_invites WHERE token = $1 AND status = 'pending' FOR UPDATE`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      throw new NotFoundError('Invite not found or already used');
    }

    const invite = inviteResult.rows[0];

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      await client.query(
        `UPDATE org_invites SET status = 'expired' WHERE id = $1`,
        [invite.id]
      );
      throw new ValidationError('Invite has expired');
    }

    // Verify user email matches invite (optional, can be removed for flexibility)
    const user = await client.query<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    // Note: Could enforce email match here if needed
    // if (user.rows[0].email?.toLowerCase() !== invite.email) {
    //   throw new ValidationError('Email does not match invite');
    // }

    // Check not already a member
    const existingMember = await client.query<{ id: string }>(
      'SELECT id FROM org_members WHERE org_id = $1 AND user_id = $2',
      [invite.org_id, userId]
    );
    if (existingMember.rows.length > 0) {
      throw new ConflictError('You are already a member of this organization');
    }

    // Check org member limit
    const org = await client.query<{ member_count: number; max_members: number | null }>(
      'SELECT member_count, max_members FROM organizations WHERE id = $1',
      [invite.org_id]
    );
    if (org.rows[0].max_members && org.rows[0].member_count >= org.rows[0].max_members) {
      throw new ValidationError('Organization has reached member limit');
    }

    // Create membership
    const memberId = genId('om');
    const now = new Date().toISOString();
    const role = invite.role as OrgRole;
    const permissions = ROLE_PERMISSIONS[role];

    await client.query(
      `INSERT INTO org_members (
        id, org_id, user_id, unit_id, role, permissions, joined_at, updated_at, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)`,
      [
        memberId,
        invite.org_id,
        userId,
        invite.unit_id,
        role,
        JSON.stringify(permissions),
        now,
        invite.invited_by,
      ]
    );

    // Update invite status
    await client.query(
      `UPDATE org_invites SET status = 'accepted', accepted_at = $1, accepted_by = $2 WHERE id = $3`,
      [now, userId, invite.id]
    );

    // Update org member count
    await client.query(
      'UPDATE organizations SET member_count = member_count + 1 WHERE id = $1',
      [invite.org_id]
    );

    // Update unit member count if applicable
    if (invite.unit_id) {
      await client.query(
        'UPDATE org_units SET member_count = member_count + 1 WHERE id = $1',
        [invite.unit_id]
      );
    }

    // Audit log
    await createAuditLog(client, {
      orgId: invite.org_id,
      userId,
      action: 'member.joined',
      resourceType: 'member',
      resourceId: memberId,
      details: { role, unitId: invite.unit_id, inviteId: invite.id },
    });

    log.info({ orgId: invite.org_id, userId, memberId }, 'Member joined via invite');

    return {
      id: memberId,
      orgId: invite.org_id,
      userId,
      unitId: invite.unit_id,
      role,
      title: null,
      permissions,
      joinedAt: now,
      updatedAt: now,
      invitedBy: invite.invited_by,
    };
  });
}

/**
 * Get organization members with filters
 */
export async function getMembers(
  orgId: string,
  filters?: MemberFilters
): Promise<{ members: OrgMember[]; total: number }> {
  let whereClause = 'WHERE om.org_id = $1';
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (filters?.role) {
    whereClause += ` AND om.role = $${paramIndex++}`;
    params.push(filters.role);
  }
  if (filters?.unitId !== undefined) {
    if (filters.unitId === null) {
      whereClause += ' AND om.unit_id IS NULL';
    } else {
      whereClause += ` AND om.unit_id = $${paramIndex++}`;
      params.push(filters.unitId);
    }
  }
  if (filters?.search) {
    whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM org_members om
     LEFT JOIN users u ON u.id = om.user_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const rows = await queryAll<{
    id: string;
    org_id: string;
    user_id: string;
    unit_id: string | null;
    role: string;
    title: string | null;
    permissions: OrgPermission[];
    joined_at: string;
    updated_at: string;
    invited_by: string | null;
    username: string | null;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>(
    `SELECT om.*, u.username, u.display_name, u.email, u.avatar_url
     FROM org_members om
     LEFT JOIN users u ON u.id = om.user_id
     ${whereClause}
     ORDER BY om.role, om.joined_at
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return {
    members: rows.map(mapMemberRow),
    total,
  };
}

/**
 * Update a member
 */
export async function updateMember(
  orgId: string,
  memberId: string,
  data: BulkUpdateData,
  userId: string
): Promise<OrgMember | null> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'member:update');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to update members');
  }

  // Check role change permission
  if (data.role) {
    const canManageRoles = await checkOrgPermission(userId, orgId, 'member:manage_roles');
    if (!canManageRoles) {
      throw new AuthorizationError('You do not have permission to change member roles');
    }

    // Only owners can create other owners
    if (data.role === 'owner') {
      const userRole = await getOrgRole(userId, orgId);
      if (userRole !== 'owner') {
        throw new AuthorizationError('Only owners can promote to owner');
      }
    }
  }

  return await transaction(async (client) => {
    // Get current member
    const current = await client.query<{
      id: string;
      user_id: string;
      unit_id: string | null;
      role: string;
    }>(
      'SELECT id, user_id, unit_id, role FROM org_members WHERE id = $1 AND org_id = $2 FOR UPDATE',
      [memberId, orgId]
    );

    if (current.rows.length === 0) {
      return null;
    }

    // Prevent demoting the last owner
    if (current.rows[0].role === 'owner' && data.role && data.role !== 'owner') {
      const ownerCount = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM org_members WHERE org_id = $1 AND role = 'owner'`,
        [orgId]
      );
      if (parseInt(ownerCount.rows[0].count) <= 1) {
        throw new ValidationError('Cannot demote the last owner');
      }
    }

    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
      // Update permissions based on new role
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(data.permissions || ROLE_PERMISSIONS[data.role]));
    } else if (data.permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(data.permissions));
    }

    if (data.unitId !== undefined) {
      // Handle unit change
      const oldUnitId = current.rows[0].unit_id;
      const newUnitId = data.unitId;

      if (oldUnitId !== newUnitId) {
        // Decrement old unit count
        if (oldUnitId) {
          await client.query(
            'UPDATE org_units SET member_count = member_count - 1 WHERE id = $1',
            [oldUnitId]
          );
        }
        // Increment new unit count
        if (newUnitId) {
          await client.query(
            'UPDATE org_units SET member_count = member_count + 1 WHERE id = $1',
            [newUnitId]
          );
        }
      }

      updates.push(`unit_id = $${paramIndex++}`);
      values.push(newUnitId);
    }

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }

    values.push(memberId, orgId);

    await client.query(
      `UPDATE org_members SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND org_id = $${paramIndex}`,
      values
    );

    // Audit log
    await createAuditLog(client, {
      orgId,
      userId,
      action: 'member.updated',
      resourceType: 'member',
      resourceId: memberId,
      details: { ...data, targetUserId: current.rows[0].user_id },
    });

    // Return updated member
    const updated = await client.query<{
      id: string;
      org_id: string;
      user_id: string;
      unit_id: string | null;
      role: string;
      title: string | null;
      permissions: OrgPermission[];
      joined_at: string;
      updated_at: string;
      invited_by: string | null;
      username: string | null;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
    }>(
      `SELECT om.*, u.username, u.display_name, u.email, u.avatar_url
       FROM org_members om
       LEFT JOIN users u ON u.id = om.user_id
       WHERE om.id = $1`,
      [memberId]
    );

    return updated.rows.length > 0 ? mapMemberRow(updated.rows[0]) : null;
  });
}

/**
 * Remove a member from the organization
 */
export async function removeMember(
  orgId: string,
  memberId: string,
  userId: string
): Promise<boolean> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'member:remove');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to remove members');
  }

  return await transaction(async (client) => {
    // Get member details
    const member = await client.query<{
      id: string;
      user_id: string;
      unit_id: string | null;
      role: string;
    }>(
      'SELECT id, user_id, unit_id, role FROM org_members WHERE id = $1 AND org_id = $2 FOR UPDATE',
      [memberId, orgId]
    );

    if (member.rows.length === 0) {
      return false;
    }

    // Prevent removing the last owner
    if (member.rows[0].role === 'owner') {
      const ownerCount = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM org_members WHERE org_id = $1 AND role = 'owner'`,
        [orgId]
      );
      if (parseInt(ownerCount.rows[0].count) <= 1) {
        throw new ValidationError('Cannot remove the last owner');
      }
    }

    // Delete the member
    await client.query(
      'DELETE FROM org_members WHERE id = $1',
      [memberId]
    );

    // Update org member count
    await client.query(
      'UPDATE organizations SET member_count = member_count - 1 WHERE id = $1',
      [orgId]
    );

    // Update unit member count if applicable
    if (member.rows[0].unit_id) {
      await client.query(
        'UPDATE org_units SET member_count = member_count - 1 WHERE id = $1',
        [member.rows[0].unit_id]
      );
    }

    // Audit log
    await createAuditLog(client, {
      orgId,
      userId,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: memberId,
      details: { removedUserId: member.rows[0].user_id },
    });

    log.info({ orgId, memberId, userId }, 'Member removed');

    return true;
  });
}

/**
 * Bulk invite multiple members
 */
export async function bulkInvite(
  orgId: string,
  members: BulkInviteItem[],
  userId: string
): Promise<{ success: OrgInvite[]; failed: Array<{ email: string; error: string }> }> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'member:invite');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to invite members');
  }

  const success: OrgInvite[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const item of members) {
    try {
      const invite = await inviteMember(
        orgId,
        item.email,
        item.role || 'member',
        item.unitId || null,
        userId,
        item.message
      );
      success.push(invite);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failed.push({ email: item.email, error: errorMessage });
    }
  }

  return { success, failed };
}

/**
 * Bulk update multiple members
 */
export async function bulkUpdateMembers(
  orgId: string,
  userIds: string[],
  updates: BulkUpdateData,
  userId: string
): Promise<{ success: string[]; failed: Array<{ userId: string; error: string }> }> {
  // Check permission
  const hasPermission = await checkOrgPermission(userId, orgId, 'member:update');
  if (!hasPermission) {
    throw new AuthorizationError('You do not have permission to update members');
  }

  const success: string[] = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const targetUserId of userIds) {
    try {
      // Find member by userId
      const member = await queryOne<{ id: string }>(
        'SELECT id FROM org_members WHERE org_id = $1 AND user_id = $2',
        [orgId, targetUserId]
      );

      if (!member) {
        failed.push({ userId: targetUserId, error: 'Member not found' });
        continue;
      }

      await updateMember(orgId, member.id, updates, userId);
      success.push(targetUserId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failed.push({ userId: targetUserId, error: errorMessage });
    }
  }

  return { success, failed };
}

// =============================================
// AUTHORIZATION HELPERS
// =============================================

/**
 * Check if user has a specific permission in organization
 */
export async function checkOrgPermission(
  userId: string,
  orgId: string,
  permission: OrgPermission
): Promise<boolean> {
  const member = await queryOne<{ permissions: OrgPermission[] }>(
    'SELECT permissions FROM org_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );

  if (!member) return false;

  return member.permissions.includes(permission);
}

/**
 * Get user's role in organization
 */
export async function getOrgRole(
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const member = await queryOne<{ role: string }>(
    'SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );

  return member ? (member.role as OrgRole) : null;
}

/**
 * Check if user can view a specific unit
 */
export async function canViewUnit(
  userId: string,
  orgId: string,
  unitId: string
): Promise<boolean> {
  // First check if user is org member
  const member = await queryOne<{ unit_id: string | null; role: string }>(
    'SELECT unit_id, role FROM org_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );

  if (!member) return false;

  // Owners and admins can view all units
  if (member.role === 'owner' || member.role === 'admin') {
    return true;
  }

  // If user has no unit assigned, they can view all (based on org policy)
  if (!member.unit_id) return true;

  // Check if target unit is in user's unit path (self or descendant)
  const unit = await queryOne<{ path: string }>(
    'SELECT path FROM org_units WHERE id = $1 AND org_id = $2',
    [unitId, orgId]
  );

  if (!unit) return false;

  const userUnit = await queryOne<{ path: string }>(
    'SELECT path FROM org_units WHERE id = $1',
    [member.unit_id]
  );

  if (!userUnit) return false;

  // User can view their unit and all descendants
  return unit.path.startsWith(userUnit.path);
}

/**
 * Get organizations the user is a member of
 */
export async function getUserOrganizations(userId: string): Promise<Array<{ org: Organization; role: OrgRole }>> {
  const rows = await queryAll<{
    role: string;
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    domain: string | null;
    settings: OrgSettings;
    owner_id: string;
    member_count: number;
    unit_count: number;
    max_members: number | null;
    tier: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT om.role, o.*
     FROM org_members om
     JOIN organizations o ON o.id = om.org_id
     WHERE om.user_id = $1 AND o.deleted_at IS NULL
     ORDER BY o.name`,
    [userId]
  );

  return rows.map(row => ({
    org: mapOrgRow(row),
    role: row.role as OrgRole,
  }));
}

// =============================================
// AUDIT LOGGING
// =============================================

interface AuditLogData {
  orgId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create audit log entry within a transaction
 */
async function createAuditLog(
  client: { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> },
  data: AuditLogData
): Promise<void> {
  const id = genId('audit');
  await client.query(
    `INSERT INTO org_audit_logs (
      id, org_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      id,
      data.orgId,
      data.userId,
      data.action,
      data.resourceType,
      data.resourceId,
      data.details ? JSON.stringify(data.details) : null,
      data.ipAddress || null,
      data.userAgent || null,
    ]
  );
}

/**
 * Log audit event (standalone)
 */
async function logAuditEvent(
  orgId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown> | null
): Promise<void> {
  const id = genId('audit');
  await query(
    `INSERT INTO org_audit_logs (
      id, org_id, user_id, action, resource_type, resource_id, details, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [id, orgId, userId, action, resourceType, resourceId, details ? JSON.stringify(details) : null]
  );
}

/**
 * Get audit logs for organization
 */
export async function getAuditLogs(
  orgId: string,
  options?: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: OrgAuditLog[]; total: number }> {
  let whereClause = 'WHERE org_id = $1';
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (options?.userId) {
    whereClause += ` AND user_id = $${paramIndex++}`;
    params.push(options.userId);
  }
  if (options?.action) {
    whereClause += ` AND action = $${paramIndex++}`;
    params.push(options.action);
  }
  if (options?.resourceType) {
    whereClause += ` AND resource_type = $${paramIndex++}`;
    params.push(options.resourceType);
  }
  if (options?.startDate) {
    whereClause += ` AND created_at >= $${paramIndex++}`;
    params.push(options.startDate);
  }
  if (options?.endDate) {
    whereClause += ` AND created_at <= $${paramIndex++}`;
    params.push(options.endDate);
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM org_audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0');

  // Get paginated results
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const rows = await queryAll<{
    id: string;
    org_id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  }>(
    `SELECT * FROM org_audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return {
    logs: rows.map(row => ({
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    total,
  };
}

// =============================================
// ROW MAPPERS
// =============================================

function mapOrgRow(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  domain: string | null;
  settings: OrgSettings;
  owner_id: string;
  member_count: number;
  unit_count: number;
  max_members: number | null;
  tier: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logo: row.logo,
    domain: row.domain,
    settings: row.settings || DEFAULT_ORG_SETTINGS,
    ownerId: row.owner_id,
    memberCount: row.member_count,
    unitCount: row.unit_count,
    maxMembers: row.max_members,
    tier: row.tier as 'free' | 'team' | 'enterprise',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapUnitRow(row: {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  path: string;
  level: number;
  member_count: number;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}): OrgUnit {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    path: row.path,
    level: row.level,
    memberCount: row.member_count,
    sortOrder: row.sort_order,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMemberRow(row: {
  id: string;
  org_id: string;
  user_id: string;
  unit_id: string | null;
  role: string;
  title: string | null;
  permissions: OrgPermission[];
  joined_at: string;
  updated_at: string;
  invited_by: string | null;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}): OrgMember {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    unitId: row.unit_id,
    role: row.role as OrgRole,
    title: row.title,
    permissions: row.permissions || [],
    joinedAt: row.joined_at,
    updatedAt: row.updated_at,
    invitedBy: row.invited_by,
    username: row.username ?? undefined,
    displayName: row.display_name ?? undefined,
    email: row.email ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

// =============================================
// SERVICE EXPORT
// =============================================

export const organizationsService = {
  // Organization CRUD
  createOrganization,
  getOrganization,
  getOrganizationBySlug,
  updateOrganization,
  deleteOrganization,
  // Unit management
  createUnit,
  getUnits,
  getUnitTree,
  updateUnit,
  deleteUnit,
  // Member management
  inviteMember,
  acceptInvite,
  getMembers,
  updateMember,
  removeMember,
  bulkInvite,
  bulkUpdateMembers,
  // Authorization
  checkOrgPermission,
  getOrgRole,
  canViewUnit,
  getUserOrganizations,
  // Audit
  getAuditLogs,
};

export default organizationsService;

// Re-export types
export * from './types';

// Re-export readiness module
export * from './readiness';
export { default as organizationReadinessService } from './readiness';
