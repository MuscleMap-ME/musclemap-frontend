/**
 * Migration: Expand bug_history action constraint
 *
 * Adds new action types for automated bug processing:
 * - auto_confirmed: Bug was auto-confirmed for auto-fix processing
 * - queued_for_auto_fix: Bug was queued for BullMQ auto-fix worker
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop and recreate the check constraint with expanded action values
  await knex.raw(`
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
}

export async function down(knex: Knex): Promise<void> {
  // Revert to original constraint
  await knex.raw(`
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
}
