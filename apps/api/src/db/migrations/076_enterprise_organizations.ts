/**
 * Migration 076: Enterprise Organizations
 *
 * Adds tables for multi-tenant organization management:
 * - organizations: Top-level organization entities (fire depts, police, military, etc.)
 * - organization_units: Hierarchical units (stations, precincts, platoons, etc.)
 * - organization_members: User membership with roles and permissions
 * - organization_invites: Invitation system for onboarding
 *
 * See docs/specs/ENTERPRISE-ORGANIZATIONS.md for full specification.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 076_enterprise_organizations');

  // ============================================
  // ORGANIZATIONS TABLE
  // ============================================
  if (!(await tableExists('organizations'))) {
    log.info('Creating organizations table...');
    await db.query(`
      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        logo_url TEXT,
        website TEXT,

        -- Location
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        country TEXT DEFAULT 'US',
        timezone TEXT DEFAULT 'America/Chicago',

        -- Contact
        primary_contact_name TEXT,
        primary_contact_email TEXT,
        primary_contact_phone TEXT,

        -- Settings (see OrganizationSettings interface in spec)
        settings JSONB DEFAULT '{}',

        -- Subscription
        subscription_tier TEXT DEFAULT 'trial',
        subscription_status TEXT DEFAULT 'active',
        subscription_seats INTEGER,
        subscription_expires_at TIMESTAMPTZ,

        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Primary lookup indexes
    if (!(await indexExists('idx_organizations_slug'))) {
      await db.query('CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug)');
    }
    if (!(await indexExists('idx_organizations_type'))) {
      await db.query('CREATE INDEX idx_organizations_type ON organizations(type)');
    }
    if (!(await indexExists('idx_organizations_subscription'))) {
      await db.query('CREATE INDEX idx_organizations_subscription ON organizations(subscription_tier, subscription_status)');
    }
    if (!(await indexExists('idx_organizations_created_by'))) {
      await db.query('CREATE INDEX idx_organizations_created_by ON organizations(created_by)');
    }
    // Keyset pagination index
    if (!(await indexExists('idx_organizations_keyset'))) {
      await db.query('CREATE INDEX idx_organizations_keyset ON organizations(created_at DESC, id DESC)');
    }

    log.info('organizations table created');
  }

  // ============================================
  // ORGANIZATION UNITS TABLE
  // ============================================
  if (!(await tableExists('organization_units'))) {
    log.info('Creating organization_units table...');
    await db.query(`
      CREATE TABLE organization_units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        parent_unit_id UUID REFERENCES organization_units(id) ON DELETE SET NULL,

        name TEXT NOT NULL,
        code TEXT,
        type TEXT NOT NULL,

        -- Location (optional, for stations/precincts)
        address_line1 TEXT,
        city TEXT,
        state TEXT,

        -- Hierarchy
        level INTEGER DEFAULT 1,
        path TEXT,

        -- Settings (overrides org settings)
        settings JSONB DEFAULT '{}',

        -- Metadata
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for common queries
    if (!(await indexExists('idx_organization_units_org'))) {
      await db.query('CREATE INDEX idx_organization_units_org ON organization_units(org_id)');
    }
    if (!(await indexExists('idx_organization_units_parent'))) {
      await db.query('CREATE INDEX idx_organization_units_parent ON organization_units(parent_unit_id)');
    }
    if (!(await indexExists('idx_organization_units_path'))) {
      await db.query('CREATE INDEX idx_organization_units_path ON organization_units(path)');
    }
    if (!(await indexExists('idx_organization_units_type'))) {
      await db.query('CREATE INDEX idx_organization_units_type ON organization_units(type)');
    }
    // Composite index for hierarchy queries
    if (!(await indexExists('idx_organization_units_org_level'))) {
      await db.query('CREATE INDEX idx_organization_units_org_level ON organization_units(org_id, level)');
    }
    // Active units lookup
    if (!(await indexExists('idx_organization_units_org_active'))) {
      await db.query('CREATE INDEX idx_organization_units_org_active ON organization_units(org_id, active) WHERE active = true');
    }
    // Keyset pagination
    if (!(await indexExists('idx_organization_units_keyset'))) {
      await db.query('CREATE INDEX idx_organization_units_keyset ON organization_units(org_id, created_at DESC, id DESC)');
    }
    // Code lookup within org
    if (!(await indexExists('idx_organization_units_org_code'))) {
      await db.query('CREATE INDEX idx_organization_units_org_code ON organization_units(org_id, code) WHERE code IS NOT NULL');
    }

    log.info('organization_units table created');
  }

  // ============================================
  // ORGANIZATION MEMBERS TABLE
  // ============================================
  if (!(await tableExists('organization_members'))) {
    log.info('Creating organization_members table...');
    await db.query(`
      CREATE TABLE organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        unit_id UUID REFERENCES organization_units(id) ON DELETE SET NULL,

        -- Role & Permissions
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'supervisor', 'admin', 'owner')),
        permissions TEXT[] DEFAULT '{}',

        -- Employment details (optional)
        badge_number TEXT,
        employee_id TEXT,
        rank TEXT,
        title TEXT,
        hire_date DATE,

        -- Readiness sharing consent
        share_readiness BOOLEAN DEFAULT false,
        share_assessments BOOLEAN DEFAULT false,
        share_weak_events BOOLEAN DEFAULT false,
        opted_in_at TIMESTAMPTZ,

        -- Status
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),

        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,

        CONSTRAINT unique_org_member UNIQUE (org_id, user_id)
      )
    `);

    // Primary lookup indexes
    if (!(await indexExists('idx_organization_members_org'))) {
      await db.query('CREATE INDEX idx_organization_members_org ON organization_members(org_id)');
    }
    if (!(await indexExists('idx_organization_members_user'))) {
      await db.query('CREATE INDEX idx_organization_members_user ON organization_members(user_id)');
    }
    if (!(await indexExists('idx_organization_members_unit'))) {
      await db.query('CREATE INDEX idx_organization_members_unit ON organization_members(unit_id)');
    }
    if (!(await indexExists('idx_organization_members_role'))) {
      await db.query('CREATE INDEX idx_organization_members_role ON organization_members(org_id, role)');
    }
    if (!(await indexExists('idx_organization_members_status'))) {
      await db.query('CREATE INDEX idx_organization_members_status ON organization_members(org_id, status)');
    }
    // Active members with readiness sharing
    if (!(await indexExists('idx_organization_members_readiness'))) {
      await db.query(`
        CREATE INDEX idx_organization_members_readiness
        ON organization_members(org_id, unit_id)
        WHERE status = 'active' AND share_readiness = true
      `);
    }
    // Badge number lookup
    if (!(await indexExists('idx_organization_members_badge'))) {
      await db.query(`
        CREATE INDEX idx_organization_members_badge
        ON organization_members(org_id, badge_number)
        WHERE badge_number IS NOT NULL
      `);
    }
    // Keyset pagination for member lists
    if (!(await indexExists('idx_organization_members_keyset'))) {
      await db.query('CREATE INDEX idx_organization_members_keyset ON organization_members(org_id, created_at DESC, id DESC)');
    }
    // User's organizations lookup
    if (!(await indexExists('idx_organization_members_user_status'))) {
      await db.query('CREATE INDEX idx_organization_members_user_status ON organization_members(user_id, status)');
    }

    log.info('organization_members table created');
  }

  // ============================================
  // ORGANIZATION INVITES TABLE
  // ============================================
  if (!(await tableExists('organization_invites'))) {
    log.info('Creating organization_invites table...');
    await db.query(`
      CREATE TABLE organization_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'member' CHECK (role IN ('member', 'supervisor', 'admin', 'owner')),
        unit_id UUID REFERENCES organization_units(id) ON DELETE SET NULL,

        -- Invite details
        token TEXT UNIQUE NOT NULL,
        message TEXT,

        -- Status
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,
        invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        accepted_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Primary lookup indexes
    if (!(await indexExists('idx_organization_invites_org'))) {
      await db.query('CREATE INDEX idx_organization_invites_org ON organization_invites(org_id)');
    }
    if (!(await indexExists('idx_organization_invites_email'))) {
      await db.query('CREATE INDEX idx_organization_invites_email ON organization_invites(email)');
    }
    if (!(await indexExists('idx_organization_invites_token'))) {
      await db.query('CREATE UNIQUE INDEX idx_organization_invites_token ON organization_invites(token)');
    }
    if (!(await indexExists('idx_organization_invites_status'))) {
      await db.query('CREATE INDEX idx_organization_invites_status ON organization_invites(org_id, status)');
    }
    // Pending invites lookup for expiration checks
    if (!(await indexExists('idx_organization_invites_pending'))) {
      await db.query(`
        CREATE INDEX idx_organization_invites_pending
        ON organization_invites(expires_at)
        WHERE status = 'pending'
      `);
    }
    // Keyset pagination
    if (!(await indexExists('idx_organization_invites_keyset'))) {
      await db.query('CREATE INDEX idx_organization_invites_keyset ON organization_invites(org_id, created_at DESC, id DESC)');
    }
    // Invited by lookup
    if (!(await indexExists('idx_organization_invites_invited_by'))) {
      await db.query('CREATE INDEX idx_organization_invites_invited_by ON organization_invites(invited_by)');
    }

    log.info('organization_invites table created');
  }

  // ============================================
  // TRIGGER FOR UPDATED_AT
  // ============================================
  log.info('Creating updated_at trigger function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION update_organization_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Apply trigger to organizations table
  await db.query(`
    DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations
  `);
  await db.query(`
    CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at()
  `);

  // Apply trigger to organization_units table
  await db.query(`
    DROP TRIGGER IF EXISTS trigger_organization_units_updated_at ON organization_units
  `);
  await db.query(`
    CREATE TRIGGER trigger_organization_units_updated_at
    BEFORE UPDATE ON organization_units
    FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at()
  `);

  // Apply trigger to organization_members table
  await db.query(`
    DROP TRIGGER IF EXISTS trigger_organization_members_updated_at ON organization_members
  `);
  await db.query(`
    CREATE TRIGGER trigger_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at()
  `);

  log.info('Migration 076_enterprise_organizations completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 076_enterprise_organizations');

  // Drop triggers first
  await db.query('DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations');
  await db.query('DROP TRIGGER IF EXISTS trigger_organization_units_updated_at ON organization_units');
  await db.query('DROP TRIGGER IF EXISTS trigger_organization_members_updated_at ON organization_members');
  await db.query('DROP FUNCTION IF EXISTS update_organization_updated_at()');

  // Drop tables in reverse dependency order
  await db.query('DROP TABLE IF EXISTS organization_invites CASCADE');
  await db.query('DROP TABLE IF EXISTS organization_members CASCADE');
  await db.query('DROP TABLE IF EXISTS organization_units CASCADE');
  await db.query('DROP TABLE IF EXISTS organizations CASCADE');

  log.info('Rollback 076_enterprise_organizations completed');
}

// Alternative export for migration runners that use `migrate` instead of `up`
export const migrate = up;
