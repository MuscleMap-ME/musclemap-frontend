/**
 * Migration: Credit Ledger Archival System
 *
 * Implements hot/cold storage pattern for transaction history:
 * 1. Creates credit_ledger_archive table (cold storage)
 * 2. Adds archived flag to credit_ledger
 * 3. Creates archival function for transactions older than 6 months
 * 4. Creates summary view for archived transaction stats
 *
 * This keeps the main ledger table bounded for faster queries while
 * preserving full transaction history in the archive.
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full optimization roadmap.
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
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
  log.info('Running migration: 063_credit_ledger_archival');

  // Check if credit_ledger exists
  if (!(await tableExists('credit_ledger'))) {
    log.info('credit_ledger table does not exist, skipping archival setup');
    return;
  }

  // ============================================
  // 1. CREATE ARCHIVE TABLE
  // ============================================
  if (!(await tableExists('credit_ledger_archive'))) {
    log.info('Creating credit_ledger_archive table...');
    await db.query(`
      CREATE TABLE credit_ledger_archive (
        id UUID NOT NULL,
        user_id UUID NOT NULL,
        action TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_type TEXT,
        reference_id UUID,
        idempotency_key TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        archived_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, created_at)
      )
    `);

    // Partition by month for efficient archival management
    // Note: For existing data, we create one big partition initially
    await db.query(`
      CREATE INDEX idx_credit_ledger_archive_user
      ON credit_ledger_archive(user_id, created_at DESC)
    `);

    await db.query(`
      CREATE INDEX idx_credit_ledger_archive_created
      ON credit_ledger_archive(created_at DESC)
    `);
  }

  // ============================================
  // 2. ADD ARCHIVED FLAG TO CREDIT_LEDGER
  // ============================================
  if (!(await columnExists('credit_ledger', 'archived'))) {
    log.info('Adding archived column to credit_ledger...');
    await db.query(`
      ALTER TABLE credit_ledger
      ADD COLUMN archived BOOLEAN DEFAULT FALSE
    `);

    // Index for non-archived entries (hot data)
    if (!(await indexExists('idx_credit_ledger_active'))) {
      await db.query(`
        CREATE INDEX idx_credit_ledger_active
        ON credit_ledger(user_id, created_at DESC)
        WHERE archived = FALSE
      `);
    }
  }

  // ============================================
  // 3. CREATE ARCHIVAL FUNCTION
  // ============================================
  log.info('Creating archive_old_credit_transactions function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION archive_old_credit_transactions(
      p_months_old INTEGER DEFAULT 6,
      p_batch_size INTEGER DEFAULT 10000
    )
    RETURNS TABLE (
      archived_count INTEGER,
      duration_ms INTEGER,
      oldest_archived TIMESTAMPTZ,
      newest_archived TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_start TIMESTAMPTZ;
      v_cutoff TIMESTAMPTZ;
      v_archived INTEGER := 0;
      v_oldest TIMESTAMPTZ;
      v_newest TIMESTAMPTZ;
      v_batch_count INTEGER;
    BEGIN
      v_start := clock_timestamp();
      v_cutoff := NOW() - (p_months_old || ' months')::INTERVAL;

      -- Archive in batches to avoid long-running transactions
      LOOP
        WITH to_archive AS (
          SELECT id, user_id, action, amount, balance_after,
                 reference_type, reference_id, idempotency_key,
                 metadata, created_at
          FROM credit_ledger
          WHERE created_at < v_cutoff
            AND archived = FALSE
          LIMIT p_batch_size
          FOR UPDATE SKIP LOCKED
        ),
        inserted AS (
          INSERT INTO credit_ledger_archive
          SELECT ta.*, NOW() as archived_at
          FROM to_archive ta
          RETURNING created_at
        ),
        updated AS (
          UPDATE credit_ledger cl
          SET archived = TRUE
          FROM to_archive ta
          WHERE cl.id = ta.id
          RETURNING 1
        )
        SELECT COUNT(*)::INTEGER, MIN(created_at), MAX(created_at)
        INTO v_batch_count, v_oldest, v_newest
        FROM inserted;

        EXIT WHEN v_batch_count = 0;

        v_archived := v_archived + v_batch_count;

        -- Commit progress periodically (via separate function calls)
        IF v_archived >= 50000 THEN
          EXIT; -- Return and let caller decide to continue
        END IF;
      END LOOP;

      archived_count := v_archived;
      duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INTEGER;
      oldest_archived := v_oldest;
      newest_archived := v_newest;
      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 4. CREATE SUMMARY VIEW FOR ARCHIVED DATA
  // ============================================
  log.info('Creating credit_ledger_summary view...');
  await db.query(`
    CREATE OR REPLACE VIEW credit_ledger_summary AS
    SELECT
      'active' as storage_tier,
      COUNT(*) as transaction_count,
      MIN(created_at) as oldest_transaction,
      MAX(created_at) as newest_transaction,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits_earned,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_credits_spent
    FROM credit_ledger
    WHERE archived = FALSE

    UNION ALL

    SELECT
      'archived' as storage_tier,
      COUNT(*) as transaction_count,
      MIN(created_at) as oldest_transaction,
      MAX(created_at) as newest_transaction,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_credits_earned,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_credits_spent
    FROM credit_ledger_archive
  `);

  // ============================================
  // 5. CREATE USER TRANSACTION HISTORY VIEW
  // ============================================
  log.info('Creating user_credit_history_full view...');
  // Note: Types differ between credit_ledger (SMALLINT ref_type, TEXT ref_id)
  // and credit_ledger_archive (TEXT reference_type, UUID reference_id)
  // Cast to common types (TEXT) for the union
  await db.query(`
    CREATE OR REPLACE VIEW user_credit_history_full AS
    SELECT
      id, user_id, action, amount, balance_after,
      ref_type::TEXT as ref_type, ref_id, created_at,
      'active' as storage_tier
    FROM credit_ledger
    WHERE archived = FALSE

    UNION ALL

    SELECT
      id::TEXT, user_id::TEXT, action, amount, balance_after,
      reference_type as ref_type, reference_id::TEXT as ref_id, created_at,
      'archived' as storage_tier
    FROM credit_ledger_archive
  `);

  // ============================================
  // 6. CREATE ARCHIVAL STATUS FUNCTION
  // ============================================
  log.info('Creating get_archival_status function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION get_archival_status()
    RETURNS TABLE (
      active_transactions BIGINT,
      archived_transactions BIGINT,
      oldest_active TIMESTAMPTZ,
      archivable_count BIGINT,
      estimated_archive_time_ms INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        (SELECT COUNT(*) FROM credit_ledger WHERE archived = FALSE) as active_transactions,
        (SELECT COUNT(*) FROM credit_ledger_archive) as archived_transactions,
        (SELECT MIN(created_at) FROM credit_ledger WHERE archived = FALSE) as oldest_active,
        (SELECT COUNT(*) FROM credit_ledger
         WHERE archived = FALSE
         AND created_at < NOW() - INTERVAL '6 months') as archivable_count,
        -- Estimate: ~100ms per 1000 rows
        ((SELECT COUNT(*) FROM credit_ledger
          WHERE archived = FALSE
          AND created_at < NOW() - INTERVAL '6 months') / 10)::INTEGER as estimated_archive_time_ms;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 7. ADD TO RETENTION POLICIES
  // ============================================
  if (await tableExists('data_retention_policies')) {
    log.info('Adding credit ledger archive policy...');
    await db.query(`
      INSERT INTO data_retention_policies
        (policy_name, target_table, retention_days, condition_sql, description)
      VALUES
        ('credit_ledger_archive', 'credit_ledger_archive', 730, NULL,
         'Delete archived transactions older than 2 years')
      ON CONFLICT (policy_name) DO NOTHING
    `);
  }

  log.info('Migration 063_credit_ledger_archival complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 063_credit_ledger_archival');

  // Remove from retention policies
  await db.query(`
    DELETE FROM data_retention_policies
    WHERE policy_name = 'credit_ledger_archive'
  `);

  // Drop views
  await db.query('DROP VIEW IF EXISTS user_credit_history_full');
  await db.query('DROP VIEW IF EXISTS credit_ledger_summary');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS get_archival_status()');
  await db.query('DROP FUNCTION IF EXISTS archive_old_credit_transactions(INTEGER, INTEGER)');

  // Drop indexes and columns
  await db.query('DROP INDEX IF EXISTS idx_credit_ledger_active');
  if (await columnExists('credit_ledger', 'archived')) {
    await db.query('ALTER TABLE credit_ledger DROP COLUMN archived');
  }

  // Drop archive table
  await db.query('DROP TABLE IF EXISTS credit_ledger_archive CASCADE');

  log.info('Rollback 063_credit_ledger_archival complete');
}

export const migrate = up;
