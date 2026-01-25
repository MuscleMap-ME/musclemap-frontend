/**
 * Migration XXX: Description
 *
 * ================================================================================
 * ⚠️ IMPORTANT: MIGRATION PATTERN
 * ================================================================================
 *
 * This project uses raw SQL via the `query` function from '../client'.
 *
 * DO NOT USE:
 *   - import { Knex } from 'knex';  ❌
 *   - knex.schema.createTable()    ❌
 *   - table.text('column')         ❌
 *
 * USE INSTEAD:
 *   - import { query } from '../client';  ✅
 *   - await query(`CREATE TABLE ...`)     ✅
 *   - Raw SQL strings                     ✅
 *
 * ================================================================================
 *
 * Describe what this migration does:
 * - Table 1: Purpose
 * - Table 2: Purpose
 * - Index: Purpose
 *
 * DESTRUCTIVE: Template file - down() shows example DROP statements for rollback
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // ============================================
  // TABLE NAME
  // Description of table purpose
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS table_name (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Always add indexes for foreign keys and common queries
  await query(`CREATE INDEX IF NOT EXISTS idx_table_name_user ON table_name(user_id)`);

  // For paginated tables, add keyset pagination index
  await query(`CREATE INDEX IF NOT EXISTS idx_table_name_keyset ON table_name(user_id, created_at DESC, id DESC)`);

  // ============================================
  // TRIGGERS (if needed)
  // ============================================
  // await query(`
  //   CREATE OR REPLACE FUNCTION function_name()
  //   RETURNS TRIGGER AS $$
  //   BEGIN
  //     -- trigger logic
  //     RETURN NEW;
  //   END;
  //   $$ LANGUAGE plpgsql
  // `);
  //
  // await query(`DROP TRIGGER IF EXISTS trigger_name ON table_name`);
  // await query(`
  //   CREATE TRIGGER trigger_name
  //   AFTER INSERT ON table_name
  //   FOR EACH ROW EXECUTE FUNCTION function_name()
  // `);
}

export async function down(): Promise<void> {
  // Drop in reverse order of dependencies
  // await query(`DROP TRIGGER IF EXISTS trigger_name ON table_name`);
  // await query(`DROP FUNCTION IF EXISTS function_name()`);
  await query(`DROP TABLE IF EXISTS table_name`);
}
