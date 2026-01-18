/**
 * Migration: Expand bug_history action constraint
 *
 * Adds new action types for automated bug processing:
 * - auto_confirmed: Bug was auto-confirmed for auto-fix processing
 * - queued_for_auto_fix: Bug was queued for BullMQ auto-fix worker
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 123_bug_history_action_expand');

  // Drop and recreate the check constraint with expanded action values
  await db.query(`
    ALTER TABLE bug_history DROP CONSTRAINT IF EXISTS bug_history_action_check;

    ALTER TABLE bug_history ADD CONSTRAINT bug_history_action_check CHECK (
      action IN (
        'created',
        'status_changed',
        'priority_changed',
        'assigned',
        'commented',
        'auto_fix_started',
        'auto_fix_completed',
        'auto_fix_failed',
        'resolved',
        'reopened',
        'marked_duplicate',
        'verified',
        'auto_confirmed',
        'queued_for_auto_fix'
      )
    );
  `);

  log.info('Migration 123_bug_history_action_expand completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 123_bug_history_action_expand');

  // Revert to original constraint
  await db.query(`
    ALTER TABLE bug_history DROP CONSTRAINT IF EXISTS bug_history_action_check;

    ALTER TABLE bug_history ADD CONSTRAINT bug_history_action_check CHECK (
      action IN (
        'created',
        'status_changed',
        'priority_changed',
        'assigned',
        'commented',
        'auto_fix_started',
        'auto_fix_completed',
        'auto_fix_failed',
        'resolved',
        'reopened',
        'marked_duplicate',
        'verified'
      )
    );
  `);

  log.info('Rollback 123_bug_history_action_expand completed');
}
