#!/usr/bin/env npx tsx
/**
 * GraphQL Contract Check
 *
 * Detects breaking changes in the GraphQL schema that could break clients.
 * Compares current schema against a baseline (from main branch or saved snapshot).
 *
 * Usage:
 *   npx tsx scripts/deployment/graphql-contract-check.ts [--update-baseline] [--ci]
 *
 * Options:
 *   --update-baseline  Update the baseline schema from current
 *   --ci               Output in CI-friendly format
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  buildSchema,
  findBreakingChanges,
  findDangerousChanges,
  printSchema,
  introspectionFromSchema,
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  BreakingChange,
  DangerousChange,
} from 'graphql';

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2);
const UPDATE_BASELINE = args.includes('--update-baseline');
const CI_MODE = args.includes('--ci');

const BASELINE_DIR = '.graphql-baseline';
const BASELINE_SCHEMA_PATH = join(BASELINE_DIR, 'schema.graphql');
const SCHEMA_SOURCES = [
  'apps/api/src/graphql/schema.graphql',
  'apps/api/src/graphql/schema.ts',
  'packages/contracts/src/schema.graphql',
];

const API_URL = process.env.API_URL || 'http://localhost:3001/api/graphql';

// ============================================
// UTILITIES
// ============================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  if (CI_MODE) {
    console.log(message);
  } else {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

// ============================================
// SCHEMA LOADING
// ============================================

async function getSchemaFromIntrospection(): Promise<GraphQLSchema | null> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: getIntrospectionQuery() }),
    });

    if (!response.ok) {
      return null;
    }

    const { data } = await response.json();
    return buildClientSchema(data);
  } catch {
    return null;
  }
}

function getSchemaFromFile(): GraphQLSchema | null {
  for (const source of SCHEMA_SOURCES) {
    if (existsSync(source)) {
      try {
        const content = readFileSync(source, 'utf-8');

        // If it's a .ts file, try to extract SDL
        if (source.endsWith('.ts')) {
          const sdlMatch = content.match(/`([\s\S]*?)`/);
          if (sdlMatch) {
            return buildSchema(sdlMatch[1]);
          }
        } else {
          return buildSchema(content);
        }
      } catch (e) {
        log(`Could not parse schema from ${source}: ${e}`, 'dim');
      }
    }
  }
  return null;
}

async function getCurrentSchema(): Promise<GraphQLSchema | null> {
  // Try introspection first (most accurate)
  const introspectionSchema = await getSchemaFromIntrospection();
  if (introspectionSchema) {
    log('📡 Schema loaded via introspection', 'dim');
    return introspectionSchema;
  }

  // Fall back to file-based schema
  const fileSchema = getSchemaFromFile();
  if (fileSchema) {
    log('📁 Schema loaded from file', 'dim');
    return fileSchema;
  }

  return null;
}

function getBaselineSchema(): GraphQLSchema | null {
  if (!existsSync(BASELINE_SCHEMA_PATH)) {
    return null;
  }

  try {
    const content = readFileSync(BASELINE_SCHEMA_PATH, 'utf-8');
    return buildSchema(content);
  } catch (e) {
    log(`Could not parse baseline schema: ${e}`, 'yellow');
    return null;
  }
}

function saveBaseline(schema: GraphQLSchema): void {
  if (!existsSync(BASELINE_DIR)) {
    mkdirSync(BASELINE_DIR, { recursive: true });
  }

  const sdl = printSchema(schema);
  writeFileSync(BASELINE_SCHEMA_PATH, sdl);

  // Add to gitignore if not already there
  const gitignorePath = '.gitignore';
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes(BASELINE_DIR)) {
      writeFileSync(gitignorePath, gitignore + `\n# GraphQL schema baseline\n${BASELINE_DIR}/\n`);
    }
  }
}

// ============================================
// CHANGE ANALYSIS
// ============================================

interface ChangeReport {
  breaking: BreakingChange[];
  dangerous: DangerousChange[];
  safe: boolean;
}

function analyzeChanges(
  baseline: GraphQLSchema,
  current: GraphQLSchema
): ChangeReport {
  const breaking = findBreakingChanges(baseline, current);
  const dangerous = findDangerousChanges(baseline, current);

  return {
    breaking,
    dangerous,
    safe: breaking.length === 0,
  };
}

function formatBreakingChange(change: BreakingChange): string {
  return `${change.type}: ${change.description}`;
}

function formatDangerousChange(change: DangerousChange): string {
  return `${change.type}: ${change.description}`;
}

// ============================================
// MAIN
// ============================================

async function main() {
  log('\n🔍 GraphQL Contract Check', 'bold');
  log('═'.repeat(60));

  // Get current schema
  const currentSchema = await getCurrentSchema();

  if (!currentSchema) {
    log('\n❌ Could not load current GraphQL schema', 'red');
    log('Make sure the API server is running or schema files exist\n', 'dim');
    process.exit(1);
  }

  // Update baseline if requested
  if (UPDATE_BASELINE) {
    saveBaseline(currentSchema);
    log('\n✅ Baseline schema updated\n', 'green');
    process.exit(0);
  }

  // Get baseline schema
  const baselineSchema = getBaselineSchema();

  if (!baselineSchema) {
    log('\n📝 No baseline schema found', 'yellow');
    log('Creating initial baseline from current schema...\n', 'dim');
    saveBaseline(currentSchema);
    log('✅ Baseline created. Future runs will compare against this.\n', 'green');
    process.exit(0);
  }

  // Analyze changes
  const report = analyzeChanges(baselineSchema, currentSchema);

  // Report breaking changes
  if (report.breaking.length > 0) {
    log('\n🚨 BREAKING CHANGES DETECTED:', 'red');
    log('─'.repeat(40), 'dim');

    for (const change of report.breaking) {
      log(`  ❌ ${formatBreakingChange(change)}`, 'red');
    }

    log('\nThese changes will break existing clients!', 'red');
    log('Consider:', 'yellow');
    log('  1. Deprecating fields instead of removing them', 'dim');
    log('  2. Adding new fields alongside old ones', 'dim');
    log('  3. Using @deprecated directive for transitional period', 'dim');
  }

  // Report dangerous changes
  if (report.dangerous.length > 0) {
    log('\n⚠️  DANGEROUS CHANGES (review recommended):', 'yellow');
    log('─'.repeat(40), 'dim');

    for (const change of report.dangerous) {
      log(`  📝 ${formatDangerousChange(change)}`, 'yellow');
    }
  }

  // Summary
  log('\n' + '═'.repeat(60));

  if (report.breaking.length === 0 && report.dangerous.length === 0) {
    log('\n✅ No schema changes detected\n', 'green');
    process.exit(0);
  }

  if (report.breaking.length === 0) {
    log('\n✅ No breaking changes - safe to deploy\n', 'green');
    log(
      `   (${report.dangerous.length} dangerous change(s) should be reviewed)\n`,
      'dim'
    );
    process.exit(0);
  }

  log(
    `\n❌ ${report.breaking.length} breaking change(s) detected - DO NOT DEPLOY\n`,
    'red'
  );

  if (CI_MODE) {
    // Output structured data for CI
    console.log('\n::error::GraphQL breaking changes detected');
    for (const change of report.breaking) {
      console.log(`::error::${formatBreakingChange(change)}`);
    }
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('Error checking GraphQL contract:', error);
  process.exit(1);
});
