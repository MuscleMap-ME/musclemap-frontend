/**
 * Organizations Module
 *
 * Enterprise organization management for MuscleMap.
 * Provides hierarchical team structures with units, role-based permissions,
 * and comprehensive audit logging.
 *
 * Schema: apps/api/src/db/migrations/076_enterprise_organizations.ts
 * Types: apps/api/src/modules/organizations/types.ts
 */

import { query, queryOne, queryAll, transaction } from '../../db/client';
import { NotFoundError, ConflictError } from '../../lib/errors';
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
} from './types';
import { ROLE_PERMISSIONS } from './types';

const log = loggers.db;

// =============================================
// HELPERS
// =============================================

function genId(): string {
  return crypto.randomUUID();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

const DEFAULT_ORG_SETTINGS: OrgSettings = {
  allowPublicJoin: false,
  requireEmailDomain: false,
  allowedDomains: [],
  defaultRole: 'member',
  requireMfa: false,
  ssoEnabled: false,
  ssoProvider: null,
  defaultPtTestId: null,
  requireReadinessSharing: false,
};

// Map database row to Organization interface
function mapOrgRow(row: Record<string, unknown>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    type: row.type as string,
    logoUrl: row.logo_url as string | null,
    website: row.website as string | null,
    addressLine1: row.address_line1 as string | null,
    addressLine2: row.address_line2 as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    zip: row.zip as string | null,
    country: row.country as string || 'US',
    timezone: row.timezone as string || 'America/Chicago',
    primaryContactName: row.primary_contact_name as string | null,
    primaryContactEmail: row.primary_contact_email as string | null,
    primaryContactPhone: row.primary_contact_phone as string | null,
    settings: (row.settings as OrgSettings) || DEFAULT_ORG_SETTINGS,
    subscriptionTier: (row.subscription_tier as Organization['subscriptionTier']) || 'trial',
    subscriptionStatus: (row.subscription_status as Organization['subscriptionStatus']) || 'active',
    subscriptionSeats: row.subscription_seats as number | null,
    subscriptionExpiresAt: row.subscription_expires_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string | null,
    memberCount: row.member_count as number | undefined,
    unitCount: row.unit_count as number | undefined,
  };
}

// Map database row to OrgUnit interface
function mapUnitRow(row: Record<string, unknown>): OrgUnit {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    parentUnitId: row.parent_unit_id as string | null,
    name: row.name as string,
    code: row.code as string | null,
    type: row.type as string,
    addressLine1: row.address_line1 as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    level: row.level as number || 1,
    path: row.path as string | null,
    settings: (row.settings as Record<string, unknown>) || {},
    active: row.active as boolean ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    memberCount: row.member_count as number | undefined,
  };
}

// Map database row to OrgMember interface
function mapMemberRow(row: Record<string, unknown>): OrgMember {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    userId: row.user_id as string,
    unitId: row.unit_id as string | null,
    role: row.role as OrgRole,
    permissions: (row.permissions as string[]) || [],
    badgeNumber: row.badge_number as string | null,
    employeeId: row.employee_id as string | null,
    rank: row.rank as string | null,
    title: row.title as string | null,
    hireDate: row.hire_date as string | null,
    shareReadiness: row.share_readiness as boolean ?? false,
    shareAssessments: row.share_assessments as boolean ?? false,
    shareWeakEvents: row.share_weak_events as boolean ?? false,
    optedInAt: row.opted_in_at as string | null,
    status: (row.status as OrgMember['status']) || 'active',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    invitedBy: row.invited_by as string | null,
    // User info from join
    username: row.username as string | undefined,
    displayName: row.display_name as string | null | undefined,
    email: row.email as string | null | undefined,
    avatarUrl: row.avatar_url as string | null | undefined,
  };
}

// Map database row to OrgInvite interface
function mapInviteRow(row: Record<string, unknown>): OrgInvite {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    email: row.email as string,
    role: row.role as OrgRole,
    unitId: row.unit_id as string | null,
    token: row.token as string,
    message: row.message as string | null,
    status: (row.status as OrgInvite['status']) || 'pending',
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
    acceptedAt: row.accepted_at as string | null,
    invitedBy: row.invited_by as string,
    acceptedBy: row.accepted_by as string | null,
  };
}

// =============================================
// ORGANIZATION CRUD
// =============================================

export async function createOrganization(
  data: CreateOrgData,
  userId: string
): Promise<Organization> {
  const id = genId();
  const slug = data.slug || generateSlug(data.name);
  const now = new Date().toISOString();
  const settings = { ...DEFAULT_ORG_SETTINGS, ...data.settings };

  return await transaction(async (client) => {
    // Check slug uniqueness
    const existingSlug = await client.query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug]
    );
    if (existingSlug.rows.length > 0) {
      throw new ConflictError(`Organization slug "${slug}" is already taken`);
    }

    // Create the organization
    const result = await client.query(
      `INSERT INTO organizations (
        id, name, slug, type, logo_url, website,
        address_line1, address_line2, city, state, zip, country, timezone,
        primary_contact_name, primary_contact_email, primary_contact_phone,
        settings, subscription_tier, subscription_status,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20, $21)
      RETURNING *`,
      [
        id,
        data.name,
        slug,
        data.type,
        data.logoUrl || null,
        data.website || null,
        data.addressLine1 || null,
        data.addressLine2 || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.country || 'US',
        data.timezone || 'America/Chicago',
        data.primaryContactName || null,
        data.primaryContactEmail || null,
        data.primaryContactPhone || null,
        JSON.stringify(settings),
        'trial',
        'active',
        now,
        userId,
      ]
    );

    // Add creator as owner member
    const memberId = genId();
    await client.query(
      `INSERT INTO organization_members (
        id, org_id, user_id, unit_id, role, permissions, status, created_at, updated_at, invited_by
      ) VALUES ($1, $2, $3, NULL, 'owner', $4, 'active', $5, $5, $3)`,
      [memberId, id, userId, ROLE_PERMISSIONS.owner, now]
    );

    log.info({ orgId: id, userId, name: data.name }, 'Organization created');

    return mapOrgRow(result.rows[0]);
  });
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT o.*,
      (SELECT COUNT(*)::int FROM organization_members WHERE org_id = o.id) as member_count,
      (SELECT COUNT(*)::int FROM organization_units WHERE org_id = o.id) as unit_count
     FROM organizations o
     WHERE o.id = $1`,
    [orgId]
  );

  if (!row) return null;
  return mapOrgRow(row);
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT o.*,
      (SELECT COUNT(*)::int FROM organization_members WHERE org_id = o.id) as member_count,
      (SELECT COUNT(*)::int FROM organization_units WHERE org_id = o.id) as unit_count
     FROM organizations o
     WHERE o.slug = $1`,
    [slug]
  );

  if (!row) return null;
  return mapOrgRow(row);
}

export async function updateOrganization(
  orgId: string,
  data: UpdateOrgData,
  userId: string
): Promise<Organization> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(data.slug);
  }
  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }
  if (data.logoUrl !== undefined) {
    updates.push(`logo_url = $${paramIndex++}`);
    values.push(data.logoUrl);
  }
  if (data.website !== undefined) {
    updates.push(`website = $${paramIndex++}`);
    values.push(data.website);
  }
  if (data.addressLine1 !== undefined) {
    updates.push(`address_line1 = $${paramIndex++}`);
    values.push(data.addressLine1);
  }
  if (data.addressLine2 !== undefined) {
    updates.push(`address_line2 = $${paramIndex++}`);
    values.push(data.addressLine2);
  }
  if (data.city !== undefined) {
    updates.push(`city = $${paramIndex++}`);
    values.push(data.city);
  }
  if (data.state !== undefined) {
    updates.push(`state = $${paramIndex++}`);
    values.push(data.state);
  }
  if (data.zip !== undefined) {
    updates.push(`zip = $${paramIndex++}`);
    values.push(data.zip);
  }
  if (data.country !== undefined) {
    updates.push(`country = $${paramIndex++}`);
    values.push(data.country);
  }
  if (data.timezone !== undefined) {
    updates.push(`timezone = $${paramIndex++}`);
    values.push(data.timezone);
  }
  if (data.primaryContactName !== undefined) {
    updates.push(`primary_contact_name = $${paramIndex++}`);
    values.push(data.primaryContactName);
  }
  if (data.primaryContactEmail !== undefined) {
    updates.push(`primary_contact_email = $${paramIndex++}`);
    values.push(data.primaryContactEmail);
  }
  if (data.primaryContactPhone !== undefined) {
    updates.push(`primary_contact_phone = $${paramIndex++}`);
    values.push(data.primaryContactPhone);
  }
  if (data.settings !== undefined) {
    updates.push(`settings = settings || $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(data.settings));
  }
  if (data.subscriptionTier !== undefined) {
    updates.push(`subscription_tier = $${paramIndex++}`);
    values.push(data.subscriptionTier);
  }
  if (data.subscriptionStatus !== undefined) {
    updates.push(`subscription_status = $${paramIndex++}`);
    values.push(data.subscriptionStatus);
  }
  if (data.subscriptionSeats !== undefined) {
    updates.push(`subscription_seats = $${paramIndex++}`);
    values.push(data.subscriptionSeats);
  }
  if (data.subscriptionExpiresAt !== undefined) {
    updates.push(`subscription_expires_at = $${paramIndex++}`);
    values.push(data.subscriptionExpiresAt);
  }

  if (updates.length === 0) {
    const org = await getOrganization(orgId);
    if (!org) throw new NotFoundError('Organization not found');
    return org;
  }

  values.push(orgId);
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (!row) throw new NotFoundError('Organization not found');

  log.info({ orgId, userId, updates: Object.keys(data) }, 'Organization updated');
  return mapOrgRow(row);
}

export async function deleteOrganization(orgId: string, userId: string): Promise<void> {
  await query(
    'DELETE FROM organizations WHERE id = $1',
    [orgId]
  );
  log.info({ orgId, userId }, 'Organization deleted');
}

// =============================================
// UNIT MANAGEMENT
// =============================================

export async function createUnit(
  orgId: string,
  data: CreateUnitData,
  userId: string
): Promise<OrgUnit> {
  const id = genId();
  const now = new Date().toISOString();

  let level = 1;
  let path = data.name;

  if (data.parentUnitId) {
    const parent = await queryOne<{ level: number; path: string }>(
      'SELECT level, path FROM organization_units WHERE id = $1 AND org_id = $2',
      [data.parentUnitId, orgId]
    );
    if (!parent) {
      throw new NotFoundError('Parent unit not found');
    }
    level = parent.level + 1;
    path = `${parent.path}/${data.name}`;
  }

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO organization_units (
      id, org_id, parent_unit_id, name, code, type,
      address_line1, city, state, level, path, settings,
      active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $13)
    RETURNING *`,
    [
      id,
      orgId,
      data.parentUnitId || null,
      data.name,
      data.code || null,
      data.type,
      data.addressLine1 || null,
      data.city || null,
      data.state || null,
      level,
      path,
      JSON.stringify(data.settings || {}),
      now,
    ]
  );

  log.info({ unitId: id, orgId, name: data.name, userId }, 'Unit created');
  return mapUnitRow(row!);
}

export async function getUnits(orgId: string, filters: UnitFilters = {}): Promise<OrgUnit[]> {
  const conditions = ['org_id = $1'];
  const values: unknown[] = [orgId];
  let paramIndex = 2;

  if (filters.parentUnitId !== undefined) {
    if (filters.parentUnitId === null) {
      conditions.push('parent_unit_id IS NULL');
    } else {
      conditions.push(`parent_unit_id = $${paramIndex++}`);
      values.push(filters.parentUnitId);
    }
  }
  if (filters.type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(filters.type);
  }
  if (filters.active !== undefined) {
    conditions.push(`active = $${paramIndex++}`);
    values.push(filters.active);
  }

  const rows = await queryAll<Record<string, unknown>>(
    `SELECT u.*,
      (SELECT COUNT(*)::int FROM organization_members WHERE unit_id = u.id) as member_count
     FROM organization_units u
     WHERE ${conditions.join(' AND ')}
     ORDER BY level, name`,
    values
  );

  return rows.map(mapUnitRow);
}

export async function getUnitTree(orgId: string): Promise<OrgUnitTree[]> {
  const units = await getUnits(orgId, { active: true });

  const unitMap = new Map<string, OrgUnitTree>();
  const roots: OrgUnitTree[] = [];

  // First pass: create all nodes
  for (const unit of units) {
    unitMap.set(unit.id, { ...unit, children: [] });
  }

  // Second pass: build tree structure
  for (const unit of units) {
    const node = unitMap.get(unit.id)!;
    if (unit.parentUnitId) {
      const parent = unitMap.get(unit.parentUnitId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function updateUnit(
  orgId: string,
  unitId: string,
  data: UpdateUnitData,
  userId: string
): Promise<OrgUnit> {
  // Check if we need to recalculate level/path (parent or name change)
  const needsPathRecalc = data.parentUnitId !== undefined || data.name !== undefined;

  // Use transaction when path recalculation is needed (affects descendants)
  if (needsPathRecalc) {
    return await transaction(async (client) => {
      // Get current unit info
      const currentResult = await client.query<{ name: string; path: string; level: number; parent_unit_id: string | null }>(
        'SELECT name, path, level, parent_unit_id FROM organization_units WHERE id = $1 AND org_id = $2',
        [unitId, orgId]
      );
      if (currentResult.rows.length === 0) {
        throw new NotFoundError('Unit not found');
      }
      const current = currentResult.rows[0];

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      // Build base updates
      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.code !== undefined) {
        updates.push(`code = $${paramIndex++}`);
        values.push(data.code);
      }
      if (data.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(data.type);
      }
      if (data.addressLine1 !== undefined) {
        updates.push(`address_line1 = $${paramIndex++}`);
        values.push(data.addressLine1);
      }
      if (data.city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(data.city);
      }
      if (data.state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(data.state);
      }
      if (data.settings !== undefined) {
        updates.push(`settings = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(data.settings));
      }
      if (data.active !== undefined) {
        updates.push(`active = $${paramIndex++}`);
        values.push(data.active);
      }
      if (data.parentUnitId !== undefined) {
        updates.push(`parent_unit_id = $${paramIndex++}`);
        values.push(data.parentUnitId);
      }

      // Calculate new level and path
      const newName = data.name !== undefined ? data.name : current.name;
      const newParentId = data.parentUnitId !== undefined ? data.parentUnitId : current.parent_unit_id;
      let newLevel: number;
      let newPath: string;

      if (newParentId === null) {
        // Root level unit
        newLevel = 1;
        newPath = newName;
      } else {
        // Get parent's level and path
        const parentResult = await client.query<{ level: number; path: string }>(
          'SELECT level, path FROM organization_units WHERE id = $1 AND org_id = $2',
          [newParentId, orgId]
        );
        if (parentResult.rows.length === 0) {
          throw new NotFoundError('Parent unit not found');
        }
        const parent = parentResult.rows[0];
        newLevel = parent.level + 1;
        newPath = `${parent.path}/${newName}`;
      }

      // Add level and path updates if changed
      if (newLevel !== current.level) {
        updates.push(`level = $${paramIndex++}`);
        values.push(newLevel);
      }
      if (newPath !== current.path) {
        updates.push(`path = $${paramIndex++}`);
        values.push(newPath);
      }

      if (updates.length === 0) {
        return mapUnitRow(currentResult.rows[0] as Record<string, unknown>);
      }

      // Perform the update
      values.push(unitId, orgId);
      const updateResult = await client.query<Record<string, unknown>>(
        `UPDATE organization_units SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (updateResult.rows.length === 0) {
        throw new NotFoundError('Unit not found');
      }

      // If path or level changed, update all descendant units
      if (current.path !== newPath || current.level !== newLevel) {
        const oldPathPrefix = current.path + '/';
        const levelDiff = newLevel - current.level;

        // Update all descendants: replace old path prefix with new, adjust level
        await client.query(
          `UPDATE organization_units
           SET path = $1 || SUBSTRING(path FROM $2),
               level = level + $3
           WHERE org_id = $4 AND path LIKE $5`,
          [newPath, oldPathPrefix.length + 1, levelDiff, orgId, oldPathPrefix + '%']
        );

        log.info(
          { unitId, orgId, userId, oldPath: current.path, newPath, levelDiff },
          'Unit hierarchy updated with descendants'
        );
      }

      log.info({ unitId, orgId, userId, updates: Object.keys(data) }, 'Unit updated');
      return mapUnitRow(updateResult.rows[0]);
    });
  }

  // Simple update without path recalculation
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.code !== undefined) {
    updates.push(`code = $${paramIndex++}`);
    values.push(data.code);
  }
  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }
  if (data.addressLine1 !== undefined) {
    updates.push(`address_line1 = $${paramIndex++}`);
    values.push(data.addressLine1);
  }
  if (data.city !== undefined) {
    updates.push(`city = $${paramIndex++}`);
    values.push(data.city);
  }
  if (data.state !== undefined) {
    updates.push(`state = $${paramIndex++}`);
    values.push(data.state);
  }
  if (data.settings !== undefined) {
    updates.push(`settings = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(data.settings));
  }
  if (data.active !== undefined) {
    updates.push(`active = $${paramIndex++}`);
    values.push(data.active);
  }

  if (updates.length === 0) {
    const rows = await queryAll<Record<string, unknown>>(
      'SELECT * FROM organization_units WHERE id = $1 AND org_id = $2',
      [unitId, orgId]
    );
    if (rows.length === 0) throw new NotFoundError('Unit not found');
    return mapUnitRow(rows[0]);
  }

  values.push(unitId, orgId);
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE organization_units SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (!row) throw new NotFoundError('Unit not found');

  log.info({ unitId, orgId, userId, updates: Object.keys(data) }, 'Unit updated');
  return mapUnitRow(row);
}

export async function deleteUnit(
  orgId: string,
  unitId: string,
  userId: string
): Promise<void> {
  // Move members to no unit first
  await query(
    'UPDATE organization_members SET unit_id = NULL WHERE unit_id = $1',
    [unitId]
  );

  // Move child units to no parent
  await query(
    'UPDATE organization_units SET parent_unit_id = NULL WHERE parent_unit_id = $1',
    [unitId]
  );

  await query(
    'DELETE FROM organization_units WHERE id = $1 AND org_id = $2',
    [unitId, orgId]
  );

  log.info({ unitId, orgId, userId }, 'Unit deleted');
}

// =============================================
// MEMBER MANAGEMENT
// =============================================

export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgRole,
  unitId: string | null,
  message: string | null,
  invitedBy: string
): Promise<OrgInvite> {
  const id = genId();
  const token = generateInviteToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO organization_invites (
      id, org_id, email, role, unit_id, token, message, status, expires_at, created_at, invited_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
    RETURNING *`,
    [id, orgId, email, role, unitId, token, message, expiresAt, now, invitedBy]
  );

  log.info({ inviteId: id, orgId, email, role, invitedBy }, 'Member invited');
  return mapInviteRow(row!);
}

export async function acceptInvite(token: string, userId: string): Promise<OrgMember> {
  return await transaction(async (client) => {
    // Get and validate invite
    const invite = await client.query<Record<string, unknown>>(
      `SELECT * FROM organization_invites
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );

    if (invite.rows.length === 0) {
      throw new NotFoundError('Invalid or expired invite');
    }

    const inv = mapInviteRow(invite.rows[0]);
    const now = new Date().toISOString();

    // Check if already a member
    const existing = await client.query(
      'SELECT id FROM organization_members WHERE org_id = $1 AND user_id = $2',
      [inv.orgId, userId]
    );

    if (existing.rows.length > 0) {
      throw new ConflictError('Already a member of this organization');
    }

    // Create membership
    const memberId = genId();
    const memberResult = await client.query<Record<string, unknown>>(
      `INSERT INTO organization_members (
        id, org_id, user_id, unit_id, role, permissions, status, created_at, updated_at, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $7, $8)
      RETURNING *`,
      [
        memberId,
        inv.orgId,
        userId,
        inv.unitId,
        inv.role,
        ROLE_PERMISSIONS[inv.role],
        now,
        inv.invitedBy,
      ]
    );

    // Update invite status
    await client.query(
      `UPDATE organization_invites
       SET status = 'accepted', accepted_at = $1, accepted_by = $2
       WHERE id = $3`,
      [now, userId, inv.id]
    );

    log.info({ memberId, orgId: inv.orgId, userId, role: inv.role }, 'Invite accepted');
    return mapMemberRow(memberResult.rows[0]);
  });
}

export async function getMembers(orgId: string, filters: MemberFilters = {}): Promise<OrgMember[]> {
  const conditions = ['m.org_id = $1'];
  const values: unknown[] = [orgId];
  let paramIndex = 2;

  if (filters.role) {
    conditions.push(`m.role = $${paramIndex++}`);
    values.push(filters.role);
  }
  if (filters.unitId !== undefined) {
    if (filters.unitId === null) {
      conditions.push('m.unit_id IS NULL');
    } else {
      conditions.push(`m.unit_id = $${paramIndex++}`);
      values.push(filters.unitId);
    }
  }
  if (filters.status) {
    conditions.push(`m.status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters.shareReadiness !== undefined) {
    conditions.push(`m.share_readiness = $${paramIndex++}`);
    values.push(filters.shareReadiness);
  }
  if (filters.search) {
    conditions.push(`(u.username ILIKE $${paramIndex} OR u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  const limit = Math.min(filters.limit || 50, 1000);
  const offset = Math.max(filters.offset || 0, 0);

  values.push(limit, offset);

  const rows = await queryAll<Record<string, unknown>>(
    `SELECT m.*, u.username, u.display_name, u.email, u.avatar_url
     FROM organization_members m
     JOIN users u ON u.id = m.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY m.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    values
  );

  return rows.map(mapMemberRow);
}

export async function getMember(orgId: string, userId: string): Promise<OrgMember | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT m.*, u.username, u.display_name, u.email, u.avatar_url
     FROM organization_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.org_id = $1 AND m.user_id = $2`,
    [orgId, userId]
  );

  if (!row) return null;
  return mapMemberRow(row);
}

export async function updateMember(
  orgId: string,
  memberId: string,
  data: BulkUpdateData,
  updatedBy: string
): Promise<OrgMember> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(data.role);
    // Update permissions when role changes
    updates.push(`permissions = $${paramIndex++}`);
    values.push(ROLE_PERMISSIONS[data.role]);
  }
  if (data.unitId !== undefined) {
    updates.push(`unit_id = $${paramIndex++}`);
    values.push(data.unitId);
  }
  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.rank !== undefined) {
    updates.push(`rank = $${paramIndex++}`);
    values.push(data.rank);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.shareReadiness !== undefined) {
    updates.push(`share_readiness = $${paramIndex++}`);
    values.push(data.shareReadiness);
    if (data.shareReadiness) {
      updates.push(`opted_in_at = NOW()`);
    }
  }
  if (data.shareAssessments !== undefined) {
    updates.push(`share_assessments = $${paramIndex++}`);
    values.push(data.shareAssessments);
  }
  if (data.shareWeakEvents !== undefined) {
    updates.push(`share_weak_events = $${paramIndex++}`);
    values.push(data.shareWeakEvents);
  }

  if (updates.length === 0) {
    const rows = await queryAll<Record<string, unknown>>(
      `SELECT m.*, u.username, u.display_name, u.email, u.avatar_url
       FROM organization_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.id = $1 AND m.org_id = $2`,
      [memberId, orgId]
    );
    if (rows.length === 0) throw new NotFoundError('Member not found');
    return mapMemberRow(rows[0]);
  }

  values.push(memberId, orgId);
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE organization_members SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
     RETURNING *`,
    values
  );

  if (!row) throw new NotFoundError('Member not found');

  log.info({ memberId, orgId, updatedBy, updates: Object.keys(data) }, 'Member updated');
  return mapMemberRow(row);
}

export async function removeMember(
  orgId: string,
  memberId: string,
  removedBy: string
): Promise<void> {
  await query(
    'DELETE FROM organization_members WHERE id = $1 AND org_id = $2',
    [memberId, orgId]
  );
  log.info({ memberId, orgId, removedBy }, 'Member removed');
}

export async function bulkInvite(
  orgId: string,
  items: BulkInviteItem[],
  invitedBy: string
): Promise<OrgInvite[]> {
  const invites: OrgInvite[] = [];

  for (const item of items) {
    const invite = await inviteMember(
      orgId,
      item.email,
      item.role || 'member',
      item.unitId || null,
      item.message || null,
      invitedBy
    );
    invites.push(invite);
  }

  return invites;
}

export async function bulkUpdateMembers(
  orgId: string,
  userIds: string[],
  data: BulkUpdateData,
  updatedBy: string
): Promise<number> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(data.role);
    updates.push(`permissions = $${paramIndex++}`);
    values.push(ROLE_PERMISSIONS[data.role]);
  }
  if (data.unitId !== undefined) {
    updates.push(`unit_id = $${paramIndex++}`);
    values.push(data.unitId);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.shareReadiness !== undefined) {
    updates.push(`share_readiness = $${paramIndex++}`);
    values.push(data.shareReadiness);
  }

  if (updates.length === 0) return 0;

  values.push(orgId, userIds);
  const result = await query(
    `UPDATE organization_members SET ${updates.join(', ')}
     WHERE org_id = $${paramIndex} AND user_id = ANY($${paramIndex + 1})`,
    values
  );

  log.info({ orgId, userIds, updatedBy, count: result.rowCount }, 'Bulk member update');
  return result.rowCount || 0;
}

// =============================================
// AUTHORIZATION HELPERS
// =============================================

export async function getOrgRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const row = await queryOne<{ role: OrgRole }>(
    'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2 AND status = $3',
    [orgId, userId, 'active']
  );
  return row?.role || null;
}

export function hasPermission(role: OrgRole, permission: OrgPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function checkOrgPermission(
  userId: string,
  orgId: string,
  permission: OrgPermission
): Promise<boolean> {
  const role = await getOrgRole(userId, orgId);
  if (!role) return false;
  return hasPermission(role, permission);
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const rows = await queryAll<Record<string, unknown>>(
    `SELECT o.*,
      (SELECT COUNT(*)::int FROM organization_members WHERE org_id = o.id) as member_count,
      (SELECT COUNT(*)::int FROM organization_units WHERE org_id = o.id) as unit_count
     FROM organizations o
     JOIN organization_members m ON m.org_id = o.id
     WHERE m.user_id = $1 AND m.status = 'active'
     ORDER BY o.name`,
    [userId]
  );

  return rows.map(mapOrgRow);
}

// =============================================
// INVITES MANAGEMENT
// =============================================

export async function getInvites(
  orgId: string,
  status?: OrgInvite['status']
): Promise<OrgInvite[]> {
  const conditions = ['org_id = $1'];
  const values: unknown[] = [orgId];

  if (status) {
    conditions.push('status = $2');
    values.push(status);
  }

  const rows = await queryAll<Record<string, unknown>>(
    `SELECT * FROM organization_invites
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    values
  );

  return rows.map(mapInviteRow);
}

export async function revokeInvite(orgId: string, inviteId: string): Promise<void> {
  await query(
    `UPDATE organization_invites SET status = 'revoked' WHERE id = $1 AND org_id = $2`,
    [inviteId, orgId]
  );
}

export async function getInviteByToken(token: string): Promise<OrgInvite | null> {
  const row = await queryOne<Record<string, unknown>>(
    'SELECT * FROM organization_invites WHERE token = $1',
    [token]
  );
  if (!row) return null;
  return mapInviteRow(row);
}

// Export types for use in routes
export type {
  Organization,
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
};
