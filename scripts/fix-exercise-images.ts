#!/usr/bin/env npx tsx
/**
 * Fix Exercise Images Script
 *
 * This script fixes incorrect exercise image mappings by:
 * 1. Removing bad mappings (handstands showing shoulder press, etc.)
 * 2. Adding correct mappings from free-exercise-db where available
 * 3. Generating SQL to update the database
 *
 * Usage:
 *   npx tsx scripts/fix-exercise-images.ts --check    # Show current bad mappings
 *   npx tsx scripts/fix-exercise-images.ts --fix      # Generate fix SQL
 *   npx tsx scripts/fix-exercise-images.ts --apply    # Apply fix to database
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// FREE-EXERCISE-DB IMAGES
// Source: https://github.com/yuhonas/free-exercise-db (Public Domain)
// ============================================
const FREE_EXERCISE_DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Map our exercise IDs to free-exercise-db image paths
const FREE_EXERCISE_DB_MAPPINGS: Record<string, { path: string; name: string }> = {
  // These exercises have accurate images in free-exercise-db
  'bw-hspu': { path: 'Handstand_Push-Ups', name: 'Handstand Push-Ups' },
  'gym-hspu': { path: 'Handstand_Push-Ups', name: 'Handstand Push-Ups' },
  'bw-muscle-up': { path: 'Muscle_Up', name: 'Muscle Up' },
  'gym-ring-muscle-up': { path: 'Muscle_Up', name: 'Muscle Up' },
  'cali-strict-muscle-up': { path: 'Muscle_Up', name: 'Muscle Up' },
  'cali-kipping-muscle-up': { path: 'Kipping_Muscle_Up', name: 'Kipping Muscle Up' },
  'cali-muscle-up-transition': { path: 'Muscle_Up', name: 'Muscle Up' },
};

// ============================================
// BAD MAPPINGS TO REMOVE
// These exercises are currently showing incorrect images
// ============================================
const BAD_MAPPINGS_TO_REMOVE = [
  // Handstand exercises showing dumbbell shoulder press
  'gym-wall-handstand-chest',
  'gym-wall-handstand-back',
  'gym-freestanding-handstand',
  'gym-handstand-walk',
  'gym-press-handstand',
  'gym-straddle-press-handstand',
  'gym-one-arm-handstand',
  'hb-handstand-wall',
  'hb-freestanding-handstand',
  'hb-press-to-handstand',
  'hb-straddle-press-handstand',
  'hb-one-arm-handstand',
  'hb-handstand-walk',

  // Planche exercises showing push-up
  'gym-planche-lean',
  'gym-tuck-planche',
  'gym-adv-tuck-planche',
  'gym-straddle-planche',
  'gym-full-planche',

  // Front lever exercises showing inverted rows
  'gym-tuck-front-lever',
  'gym-adv-tuck-front-lever',
  'gym-straddle-front-lever',
  'gym-full-front-lever',

  // Back lever exercises showing inverted rows
  'cali-tuck-back-lever',
  'cali-adv-tuck-back-lever',
  'cali-straddle-back-lever',
  'cali-full-back-lever',

  // L-sit exercises showing plank
  'gym-tuck-l-sit',
  'gym-one-leg-l-sit',
  'gym-v-sit',
  'gym-full-l-sit',

  // Human flag exercises showing side crunch
  'cali-vertical-flag',
  'cali-tuck-flag',
  'cali-straddle-flag',
  'cali-full-flag',
];

// ============================================
// MAIN FUNCTIONS
// ============================================

function generateFixSql(): string {
  let sql = `-- Exercise Image Fix Script
-- Generated: ${new Date().toISOString()}
-- Purpose: Remove incorrect image mappings and add correct ones
--
-- This script:
-- 1. Removes images from exercises that were showing incorrect/misleading images
-- 2. Adds correct images from free-exercise-db where available

BEGIN;

-- ============================================
-- REMOVE BAD MAPPINGS
-- These exercises were showing incorrect images
-- ============================================
`;

  // Remove bad mappings
  for (const exerciseId of BAD_MAPPINGS_TO_REMOVE) {
    sql += `
-- Remove incorrect image from ${exerciseId}
UPDATE exercises SET
  image_url = NULL,
  wger_id = NULL,
  wger_uuid = NULL,
  image_license = NULL,
  image_author = NULL
WHERE id = '${exerciseId}';
`;
  }

  sql += `
-- ============================================
-- ADD CORRECT MAPPINGS FROM FREE-EXERCISE-DB
-- Source: https://github.com/yuhonas/free-exercise-db (Public Domain)
-- ============================================
`;

  // Add correct mappings from free-exercise-db
  for (const [exerciseId, info] of Object.entries(FREE_EXERCISE_DB_MAPPINGS)) {
    const imageUrl = `${FREE_EXERCISE_DB_BASE}/${info.path}/0.jpg`;
    sql += `
-- ${info.name} (from free-exercise-db)
UPDATE exercises SET
  image_url = '${imageUrl}',
  wger_id = NULL,
  wger_uuid = NULL,
  image_license = 'Public Domain',
  image_author = 'free-exercise-db'
WHERE id = '${exerciseId}';
`;
  }

  sql += `
COMMIT;

-- Summary:
-- Removed images from ${BAD_MAPPINGS_TO_REMOVE.length} exercises with incorrect mappings
-- Added correct images to ${Object.keys(FREE_EXERCISE_DB_MAPPINGS).length} exercises from free-exercise-db
`;

  return sql;
}

function checkCurrentMappings(): void {
  const cachePath = path.join(process.cwd(), '.wger-cache', 'mappings.json');
  if (!fs.existsSync(cachePath)) {
    console.log('No mappings cache found. Run wger-exercise-images.ts --map first.');
    return;
  }

  const mappings = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

  console.log('\n=== BAD MAPPINGS TO FIX ===\n');

  let badCount = 0;
  for (const m of mappings) {
    const mmName = (m.musclemapName || '').toLowerCase();
    const wgerName = (m.wgerName || '').toLowerCase();

    let isBad = false;
    let reason = '';

    // Check for handstand showing non-handstand
    if (mmName.includes('handstand') && !wgerName.includes('handstand')) {
      isBad = true;
      reason = 'Handstand showing non-handstand image';
    }

    // Check for planche showing push-up
    if (mmName.includes('planche') && !wgerName.includes('planche')) {
      isBad = true;
      reason = 'Planche showing non-planche image';
    }

    // Check for lever showing inverted rows
    if (mmName.includes('lever') && !wgerName.includes('lever')) {
      isBad = true;
      reason = 'Lever showing non-lever image';
    }

    // Check for l-sit showing plank
    if (mmName.includes('l-sit') && !wgerName.includes('l-sit')) {
      isBad = true;
      reason = 'L-sit showing non-l-sit image';
    }

    // Check for muscle-up showing pull-ups
    if ((mmName.includes('muscle up') || mmName.includes('muscle-up')) && !wgerName.includes('muscle')) {
      isBad = true;
      reason = 'Muscle-up showing non-muscle-up image';
    }

    // Check for flag showing side crunch
    if (mmName.includes('flag') && !wgerName.includes('flag')) {
      isBad = true;
      reason = 'Human flag showing non-flag image';
    }

    if (isBad && m.imageUrl) {
      badCount++;
      console.log(`❌ ${m.musclemapName}`);
      console.log(`   Currently showing: ${m.wgerName}`);
      console.log(`   Problem: ${reason}`);
      console.log(`   Image: ${m.imageUrl}`);
      console.log('');
    }
  }

  console.log(`\nTotal bad mappings: ${badCount}`);
  console.log('\nRun with --fix to generate SQL to fix these mappings.');
}

async function applyFix(): Promise<void> {
  const sql = generateFixSql();

  // Write SQL to file
  const sqlPath = path.join(process.cwd(), '.wger-cache', 'fix-images.sql');
  fs.writeFileSync(sqlPath, sql);
  console.log(`Generated SQL: ${sqlPath}`);

  // Ask if we should apply to database
  console.log('\nTo apply this fix to the production database, run:');
  console.log(`  ssh -p 2222 root@musclemap.me "cd /var/www/musclemap.me && psql -U musclemap -d musclemap -f .wger-cache/fix-images.sql"`);
}

// ============================================
// CLI
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Fix Exercise Images Script

Usage:
  npx tsx scripts/fix-exercise-images.ts [options]

Options:
  --check    Show current bad mappings
  --fix      Generate SQL to fix bad mappings
  --apply    Generate SQL and show apply instructions
  --help     Show this help message

Examples:
  npx tsx scripts/fix-exercise-images.ts --check   # Review what needs fixing
  npx tsx scripts/fix-exercise-images.ts --fix     # Generate fix SQL
`);
    return;
  }

  if (args.includes('--check')) {
    checkCurrentMappings();
  }

  if (args.includes('--fix') || args.includes('--apply')) {
    await applyFix();
  }
}

main().catch(console.error);
