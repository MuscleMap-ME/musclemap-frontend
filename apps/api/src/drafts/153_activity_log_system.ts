import { Knex } from 'knex';

/**
 * Migration 153: Activity Log System
 *
 * Creates infrastructure for the Activity Log panel - a multi-input
 * workout logging system supporting voice, screenshot, clipboard,
 * CSV import, and health platform sync.
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Voice commands table - stores voice input history for learning
  await knex.schema.createTable('voice_commands', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('raw_text').notNullable();
    table.jsonb('parsed_intent').defaultTo('{}');
    table.boolean('was_corrected').defaultTo(false);
    table.jsonb('corrected_data');
    table.float('confidence').defaultTo(0);
    table.string('provider', 50).defaultTo('web_speech_api'); // web_speech_api, whisper, deepgram
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index for user's voice history
    table.index(['user_id', 'created_at'], 'idx_voice_commands_user_date');
  });

  // 2. Import jobs table - tracks bulk import progress
  await knex.schema.createTable('import_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('source', 50).notNullable(); // strong, hevy, jefit, fitbod, fitnotes, csv, apple_health, google_fit
    table.string('file_name', 255);
    table.integer('file_size');
    table.string('status', 20).defaultTo('pending'); // pending, processing, completed, failed, cancelled
    table.integer('total_records');
    table.integer('imported_count').defaultTo(0);
    table.integer('skipped_count').defaultTo(0);
    table.integer('error_count').defaultTo(0);
    table.jsonb('errors').defaultTo('[]');
    table.jsonb('field_mapping'); // Custom column mappings for CSV
    table.string('date_range', 20); // 30d, 90d, 6mo, 1yr, all
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index for user's import history
    table.index(['user_id', 'created_at'], 'idx_import_jobs_user_date');
    table.index(['status'], 'idx_import_jobs_status');
  });

  // 3. Screenshot imports table - tracks OCR processing
  await knex.schema.createTable('screenshot_imports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('image_url', 500);
    table.text('raw_ocr_text');
    table.jsonb('parsed_exercises').defaultTo('[]');
    table.float('overall_confidence').defaultTo(0);
    table.string('ocr_provider', 50).defaultTo('tesseract'); // tesseract, openai_vision, google_vision
    table.string('status', 20).defaultTo('pending'); // pending, processing, completed, failed
    table.uuid('workout_id').references('id').inTable('workouts').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index for user's screenshot history
    table.index(['user_id', 'created_at'], 'idx_screenshot_imports_user_date');
  });

  // 4. Extend imported_activities with new source types
  // The imported_activities table already exists from migration 023
  // We just need to ensure it supports our new sources
  // Sources to add: voice, screenshot, clipboard, csv_import

  // 5. Quick pick patterns table - stores user workout patterns for suggestions
  await knex.schema.createTable('workout_patterns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('day_of_week').notNullable(); // 0-6 (Sunday-Saturday)
    table.integer('hour_of_day'); // 0-23, nullable for any time
    table.string('workout_type', 100); // push, pull, legs, upper, lower, full_body, cardio
    table.string('workout_name', 255);
    table.jsonb('typical_exercises').defaultTo('[]'); // Most common exercises for this pattern
    table.integer('occurrence_count').defaultTo(1);
    table.timestamp('last_occurred').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint per user + day + hour
    table.unique(['user_id', 'day_of_week', 'hour_of_day'], { indexName: 'idx_workout_patterns_unique' });
    // Index for pattern lookup
    table.index(['user_id', 'day_of_week'], 'idx_workout_patterns_user_day');
  });

  // 6. Export jobs table - tracks export progress
  await knex.schema.createTable('export_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('format', 50).notNullable(); // musclemap_json, strong_csv, generic_csv, apple_health_xml
    table.string('date_range', 20); // 30d, 90d, 6mo, 1yr, all
    table.string('status', 20).defaultTo('pending'); // pending, processing, completed, failed
    table.integer('total_workouts');
    table.integer('exported_count').defaultTo(0);
    table.string('file_url', 500);
    table.integer('file_size');
    table.timestamp('expires_at'); // Files auto-delete after expiration
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index for user's export history
    table.index(['user_id', 'created_at'], 'idx_export_jobs_user_date');
  });

  // 7. Add activity_source to workout_sets to track where each set came from
  const hasActivitySource = await knex.schema.hasColumn('workout_sets', 'activity_source');
  if (!hasActivitySource) {
    await knex.schema.alterTable('workout_sets', (table) => {
      table.string('activity_source', 50).defaultTo('manual'); // manual, voice, screenshot, import, health_sync
    });
  }

  // 8. Add source tracking to workouts table
  const hasWorkoutSource = await knex.schema.hasColumn('workouts', 'source');
  if (!hasWorkoutSource) {
    await knex.schema.alterTable('workouts', (table) => {
      table.string('source', 50).defaultTo('manual'); // manual, voice, screenshot, import, health_sync, template
      table.uuid('import_job_id').references('id').inTable('import_jobs').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove columns from workouts
  const hasWorkoutSource = await knex.schema.hasColumn('workouts', 'source');
  if (hasWorkoutSource) {
    await knex.schema.alterTable('workouts', (table) => {
      table.dropColumn('source');
      table.dropColumn('import_job_id');
    });
  }

  // Remove column from workout_sets
  const hasActivitySource = await knex.schema.hasColumn('workout_sets', 'activity_source');
  if (hasActivitySource) {
    await knex.schema.alterTable('workout_sets', (table) => {
      table.dropColumn('activity_source');
    });
  }

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('export_jobs');
  await knex.schema.dropTableIfExists('workout_patterns');
  await knex.schema.dropTableIfExists('screenshot_imports');
  await knex.schema.dropTableIfExists('import_jobs');
  await knex.schema.dropTableIfExists('voice_commands');
}
