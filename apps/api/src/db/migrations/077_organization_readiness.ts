/**
 * Migration 077: Organization Readiness Caching and Historical Snapshots
 *
 * This migration adds tables for:
 * 1. organization_readiness_cache - Cached aggregate readiness metrics for fast dashboard queries
 * 2. organization_readiness_snapshots - Historical snapshots for trend analysis
 * 3. organization_audit_log - Audit trail for compliance and security
 *
 * Based on: docs/specs/ENTERPRISE-ORGANIZATIONS.md
 *
 * These tables support the Enterprise Dashboard with:
 * - Real-time readiness aggregates per org/unit/standard
 * - Daily/weekly/monthly historical snapshots
 * - Trend analysis (improving, stable, declining)
 * - Weak event tracking
 * - Compliance monitoring (overdue recerts, stale assessments)
 * - Full audit trail for security/compliance
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
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

export async function migrate(): Promise<void> {
  log.info('Running migration: 077_organization_readiness');

  // ============================================
  // ORGANIZATION READINESS CACHE TABLE
  // Cached readiness data for fast dashboard queries
  // ============================================
  if (!(await tableExists('organization_readiness_cache'))) {
    log.info('Creating organization_readiness_cache table...');
    await db.query(`
      CREATE TABLE organization_readiness_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        unit_id UUID REFERENCES organization_units(id) ON DELETE CASCADE,
        standard_id TEXT NOT NULL REFERENCES pt_tests(id) ON DELETE CASCADE,

        -- Aggregate metrics
        total_members INTEGER NOT NULL DEFAULT 0,
        members_opted_in INTEGER NOT NULL DEFAULT 0,
        members_with_goal INTEGER NOT NULL DEFAULT 0,
        members_assessed INTEGER NOT NULL DEFAULT 0,

        -- Readiness breakdown
        members_ready INTEGER NOT NULL DEFAULT 0,        -- >= compliance threshold
        members_at_risk INTEGER NOT NULL DEFAULT 0,      -- 70% to threshold
        members_not_ready INTEGER NOT NULL DEFAULT 0,    -- < 70%

        -- Scores (aggregates of opted-in members)
        average_readiness DECIMAL(5, 2),                 -- 0.00 to 100.00
        median_readiness DECIMAL(5, 2),
        min_readiness DECIMAL(5, 2),
        max_readiness DECIMAL(5, 2),

        -- Weak areas (common failure points)
        -- Format: [{event_id: string, count: number, pct: number}]
        weak_events JSONB DEFAULT '[]',

        -- Compliance metrics
        compliance_rate DECIMAL(5, 2),                   -- Percentage meeting threshold
        overdue_recerts INTEGER NOT NULL DEFAULT 0,      -- Members past recert date
        stale_assessments INTEGER NOT NULL DEFAULT 0,    -- Members without recent assessment

        -- Trend analysis (compared to previous period)
        trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),
        trend_delta DECIMAL(5, 2),                       -- Change from last period (-100 to +100)

        -- Metadata
        computed_at TIMESTAMP NOT NULL DEFAULT NOW()
        -- Note: unique constraint handled by partial unique indexes below
      )
    `);

    // Create unique index to ensure no duplicate org+unit+standard combinations
    // Use partial indexes for null and non-null unit_id cases
    if (!(await indexExists('idx_org_readiness_cache_unique_with_unit'))) {
      log.info('Creating unique index for non-null unit_id...');
      await db.query(`CREATE UNIQUE INDEX idx_org_readiness_cache_unique_with_unit ON organization_readiness_cache(org_id, unit_id, standard_id) WHERE unit_id IS NOT NULL`);
    }
    if (!(await indexExists('idx_org_readiness_cache_unique_org_only'))) {
      log.info('Creating unique index for null unit_id...');
      await db.query(`CREATE UNIQUE INDEX idx_org_readiness_cache_unique_org_only ON organization_readiness_cache(org_id, standard_id) WHERE unit_id IS NULL`);
    }

    // Create indexes for efficient querying
    if (!(await indexExists('idx_org_readiness_cache_org'))) {
      log.info('Creating index idx_org_readiness_cache_org...');
      await db.query(`CREATE INDEX idx_org_readiness_cache_org ON organization_readiness_cache(org_id)`);
    }
    if (!(await indexExists('idx_org_readiness_cache_unit'))) {
      log.info('Creating index idx_org_readiness_cache_unit...');
      await db.query(`CREATE INDEX idx_org_readiness_cache_unit ON organization_readiness_cache(unit_id) WHERE unit_id IS NOT NULL`);
    }
    if (!(await indexExists('idx_org_readiness_cache_standard'))) {
      log.info('Creating index idx_org_readiness_cache_standard...');
      await db.query(`CREATE INDEX idx_org_readiness_cache_standard ON organization_readiness_cache(standard_id)`);
    }
    if (!(await indexExists('idx_org_readiness_cache_computed'))) {
      log.info('Creating index idx_org_readiness_cache_computed...');
      await db.query(`CREATE INDEX idx_org_readiness_cache_computed ON organization_readiness_cache(computed_at DESC)`);
    }
    if (!(await indexExists('idx_org_readiness_cache_org_computed'))) {
      log.info('Creating index idx_org_readiness_cache_org_computed...');
      await db.query(`CREATE INDEX idx_org_readiness_cache_org_computed ON organization_readiness_cache(org_id, computed_at DESC)`);
    }

    log.info('organization_readiness_cache table created');
  }

  // ============================================
  // ORGANIZATION READINESS SNAPSHOTS TABLE
  // Historical snapshots for trend analysis
  // ============================================
  if (!(await tableExists('organization_readiness_snapshots'))) {
    log.info('Creating organization_readiness_snapshots table...');
    await db.query(`
      CREATE TABLE organization_readiness_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        unit_id UUID REFERENCES organization_units(id) ON DELETE CASCADE,
        standard_id TEXT NOT NULL REFERENCES pt_tests(id) ON DELETE CASCADE,

        -- Snapshot timing
        snapshot_date DATE NOT NULL,
        snapshot_type TEXT NOT NULL DEFAULT 'weekly' CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),

        -- Core metrics (same as cache for consistency)
        total_members INTEGER NOT NULL DEFAULT 0,
        members_opted_in INTEGER NOT NULL DEFAULT 0,
        members_ready INTEGER NOT NULL DEFAULT 0,
        members_at_risk INTEGER NOT NULL DEFAULT 0,
        members_not_ready INTEGER NOT NULL DEFAULT 0,
        average_readiness DECIMAL(5, 2),
        compliance_rate DECIMAL(5, 2),

        -- Full data for detailed historical analysis
        -- Contains anonymized member data, weak events, distribution, etc.
        full_data JSONB DEFAULT '{}',

        -- Metadata
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
        -- Note: unique constraint handled by partial unique indexes below
      )
    `);

    // Create unique indexes for snapshot uniqueness
    if (!(await indexExists('idx_org_snapshots_unique_with_unit'))) {
      log.info('Creating unique index for snapshots with unit...');
      await db.query(`CREATE UNIQUE INDEX idx_org_snapshots_unique_with_unit ON organization_readiness_snapshots(org_id, unit_id, standard_id, snapshot_date, snapshot_type) WHERE unit_id IS NOT NULL`);
    }
    if (!(await indexExists('idx_org_snapshots_unique_org_only'))) {
      log.info('Creating unique index for snapshots without unit...');
      await db.query(`CREATE UNIQUE INDEX idx_org_snapshots_unique_org_only ON organization_readiness_snapshots(org_id, standard_id, snapshot_date, snapshot_type) WHERE unit_id IS NULL`);
    }

    // Create indexes for efficient querying
    if (!(await indexExists('idx_org_snapshots_org'))) {
      log.info('Creating index idx_org_snapshots_org...');
      await db.query(`CREATE INDEX idx_org_snapshots_org ON organization_readiness_snapshots(org_id)`);
    }
    if (!(await indexExists('idx_org_snapshots_unit'))) {
      log.info('Creating index idx_org_snapshots_unit...');
      await db.query(`CREATE INDEX idx_org_snapshots_unit ON organization_readiness_snapshots(unit_id) WHERE unit_id IS NOT NULL`);
    }
    if (!(await indexExists('idx_org_snapshots_date'))) {
      log.info('Creating index idx_org_snapshots_date...');
      await db.query(`CREATE INDEX idx_org_snapshots_date ON organization_readiness_snapshots(snapshot_date DESC)`);
    }
    if (!(await indexExists('idx_org_snapshots_type'))) {
      log.info('Creating index idx_org_snapshots_type...');
      await db.query(`CREATE INDEX idx_org_snapshots_type ON organization_readiness_snapshots(snapshot_type)`);
    }
    if (!(await indexExists('idx_org_snapshots_org_date_type'))) {
      log.info('Creating index idx_org_snapshots_org_date_type...');
      await db.query(`CREATE INDEX idx_org_snapshots_org_date_type ON organization_readiness_snapshots(org_id, snapshot_date DESC, snapshot_type)`);
    }
    // Keyset pagination index for historical queries
    if (!(await indexExists('idx_org_snapshots_keyset'))) {
      log.info('Creating index idx_org_snapshots_keyset...');
      await db.query(`CREATE INDEX idx_org_snapshots_keyset ON organization_readiness_snapshots(org_id, snapshot_date DESC, id DESC)`);
    }

    log.info('organization_readiness_snapshots table created');
  }

  // ============================================
  // ORGANIZATION AUDIT LOG TABLE
  // Audit trail for compliance and security
  // ============================================
  if (!(await tableExists('organization_audit_log'))) {
    log.info('Creating organization_audit_log table...');
    await db.query(`
      CREATE TABLE organization_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

        -- Actor information
        actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        actor_email TEXT,                                -- Preserved even if user deleted
        actor_ip TEXT,                                   -- IP address of request

        -- Action details
        action TEXT NOT NULL,                            -- "member.added", "settings.updated", etc.
        resource_type TEXT,                              -- "member", "unit", "settings", "readiness"
        resource_id TEXT,                                -- ID of affected resource

        -- Change details
        old_value JSONB,                                 -- Previous state (for updates)
        new_value JSONB,                                 -- New state (for creates/updates)
        metadata JSONB DEFAULT '{}',                     -- Additional context (user agent, etc.)

        -- Timestamp (immutable - logs are append-only)
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for efficient querying
    if (!(await indexExists('idx_org_audit_org'))) {
      log.info('Creating index idx_org_audit_org...');
      await db.query(`CREATE INDEX idx_org_audit_org ON organization_audit_log(org_id)`);
    }
    if (!(await indexExists('idx_org_audit_actor'))) {
      log.info('Creating index idx_org_audit_actor...');
      await db.query(`CREATE INDEX idx_org_audit_actor ON organization_audit_log(actor_id) WHERE actor_id IS NOT NULL`);
    }
    if (!(await indexExists('idx_org_audit_action'))) {
      log.info('Creating index idx_org_audit_action...');
      await db.query(`CREATE INDEX idx_org_audit_action ON organization_audit_log(action)`);
    }
    if (!(await indexExists('idx_org_audit_resource'))) {
      log.info('Creating index idx_org_audit_resource...');
      await db.query(`CREATE INDEX idx_org_audit_resource ON organization_audit_log(resource_type, resource_id)`);
    }
    if (!(await indexExists('idx_org_audit_created'))) {
      log.info('Creating index idx_org_audit_created...');
      await db.query(`CREATE INDEX idx_org_audit_created ON organization_audit_log(created_at DESC)`);
    }
    if (!(await indexExists('idx_org_audit_org_created'))) {
      log.info('Creating index idx_org_audit_org_created...');
      await db.query(`CREATE INDEX idx_org_audit_org_created ON organization_audit_log(org_id, created_at DESC)`);
    }
    // Keyset pagination index for audit queries
    if (!(await indexExists('idx_org_audit_keyset'))) {
      log.info('Creating index idx_org_audit_keyset...');
      await db.query(`CREATE INDEX idx_org_audit_keyset ON organization_audit_log(org_id, created_at DESC, id DESC)`);
    }
    // Composite index for filtered action queries
    if (!(await indexExists('idx_org_audit_org_action_created'))) {
      log.info('Creating index idx_org_audit_org_action_created...');
      await db.query(`CREATE INDEX idx_org_audit_org_action_created ON organization_audit_log(org_id, action, created_at DESC)`);
    }

    log.info('organization_audit_log table created');
  }

  // ============================================
  // CREATE HELPER FUNCTION FOR UPSERT READINESS CACHE
  // ============================================
  log.info('Creating upsert_organization_readiness_cache function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION upsert_organization_readiness_cache(
      p_org_id UUID,
      p_unit_id UUID,
      p_standard_id TEXT,
      p_total_members INTEGER,
      p_members_opted_in INTEGER,
      p_members_with_goal INTEGER,
      p_members_assessed INTEGER,
      p_members_ready INTEGER,
      p_members_at_risk INTEGER,
      p_members_not_ready INTEGER,
      p_average_readiness DECIMAL,
      p_median_readiness DECIMAL,
      p_min_readiness DECIMAL,
      p_max_readiness DECIMAL,
      p_weak_events JSONB,
      p_compliance_rate DECIMAL,
      p_overdue_recerts INTEGER,
      p_stale_assessments INTEGER,
      p_trend_direction TEXT,
      p_trend_delta DECIMAL
    )
    RETURNS UUID AS $$
    DECLARE
      v_id UUID;
      v_coalesced_unit_id UUID := COALESCE(p_unit_id, '00000000-0000-0000-0000-000000000000'::UUID);
    BEGIN
      INSERT INTO organization_readiness_cache (
        org_id, unit_id, standard_id,
        total_members, members_opted_in, members_with_goal, members_assessed,
        members_ready, members_at_risk, members_not_ready,
        average_readiness, median_readiness, min_readiness, max_readiness,
        weak_events, compliance_rate, overdue_recerts, stale_assessments,
        trend_direction, trend_delta, computed_at
      ) VALUES (
        p_org_id, p_unit_id, p_standard_id,
        p_total_members, p_members_opted_in, p_members_with_goal, p_members_assessed,
        p_members_ready, p_members_at_risk, p_members_not_ready,
        p_average_readiness, p_median_readiness, p_min_readiness, p_max_readiness,
        p_weak_events, p_compliance_rate, p_overdue_recerts, p_stale_assessments,
        p_trend_direction, p_trend_delta, NOW()
      )
      ON CONFLICT (org_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::UUID), standard_id)
      DO UPDATE SET
        total_members = EXCLUDED.total_members,
        members_opted_in = EXCLUDED.members_opted_in,
        members_with_goal = EXCLUDED.members_with_goal,
        members_assessed = EXCLUDED.members_assessed,
        members_ready = EXCLUDED.members_ready,
        members_at_risk = EXCLUDED.members_at_risk,
        members_not_ready = EXCLUDED.members_not_ready,
        average_readiness = EXCLUDED.average_readiness,
        median_readiness = EXCLUDED.median_readiness,
        min_readiness = EXCLUDED.min_readiness,
        max_readiness = EXCLUDED.max_readiness,
        weak_events = EXCLUDED.weak_events,
        compliance_rate = EXCLUDED.compliance_rate,
        overdue_recerts = EXCLUDED.overdue_recerts,
        stale_assessments = EXCLUDED.stale_assessments,
        trend_direction = EXCLUDED.trend_direction,
        trend_delta = EXCLUDED.trend_delta,
        computed_at = NOW()
      RETURNING id INTO v_id;

      RETURN v_id;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // CREATE VIEW FOR READINESS TREND ANALYSIS
  // ============================================
  log.info('Creating readiness trend view...');
  await db.query(`
    CREATE OR REPLACE VIEW v_organization_readiness_trends AS
    SELECT
      s.org_id,
      s.unit_id,
      s.standard_id,
      s.snapshot_date,
      s.snapshot_type,
      s.average_readiness,
      s.compliance_rate,
      s.members_ready,
      s.total_members,
      LAG(s.average_readiness) OVER (
        PARTITION BY s.org_id, s.unit_id, s.standard_id, s.snapshot_type
        ORDER BY s.snapshot_date
      ) as prev_average_readiness,
      LAG(s.compliance_rate) OVER (
        PARTITION BY s.org_id, s.unit_id, s.standard_id, s.snapshot_type
        ORDER BY s.snapshot_date
      ) as prev_compliance_rate,
      s.average_readiness - LAG(s.average_readiness) OVER (
        PARTITION BY s.org_id, s.unit_id, s.standard_id, s.snapshot_type
        ORDER BY s.snapshot_date
      ) as readiness_delta
    FROM organization_readiness_snapshots s
    ORDER BY s.org_id, s.unit_id, s.standard_id, s.snapshot_date DESC
  `);

  log.info('Migration 077_organization_readiness complete');
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 077_organization_readiness');

  // Drop view first (depends on table)
  await db.query(`DROP VIEW IF EXISTS v_organization_readiness_trends`);

  // Drop function
  await db.query(`DROP FUNCTION IF EXISTS upsert_organization_readiness_cache`);

  // Drop tables (in reverse order of dependencies)
  await db.query(`DROP TABLE IF EXISTS organization_audit_log`);
  await db.query(`DROP TABLE IF EXISTS organization_readiness_snapshots`);
  await db.query(`DROP TABLE IF EXISTS organization_readiness_cache`);

  log.info('Rollback 077_organization_readiness complete');
}

// Export for compatibility with different migration runners
export const up = migrate;
export const down = rollback;
