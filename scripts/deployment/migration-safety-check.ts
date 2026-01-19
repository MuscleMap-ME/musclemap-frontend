#!/usr/bin/env npx tsx
/**
 * Migration Safety Check
 *
 * Analyzes new migrations for potential risks and data loss scenarios.
 * Runs as part of CI/CD to catch dangerous migrations before they reach production.
 *
 * Usage:
 *   npx tsx scripts/deployment/migration-safety-check.ts [--strict] [--ci]
 *
 * Options:
 *   --strict  Fail on any risk level above LOW
 *   --ci      Output in CI-friendly format
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

// ============================================
// TYPES
// ============================================

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface MigrationRisk {
  file: string;
  risk: RiskLevel;
  reasons: string[];
  suggestions: string[];
}

interface RiskPattern {
  pattern: RegExp;
  risk: RiskLevel;
  reason: string;
  suggestion: string;
}

// ============================================
// CONFIGURATION
// ============================================

const args = process.argv.slice(2);
const STRICT_MODE = args.includes('--strict');
const CI_MODE = args.includes('--ci');

const MIGRATIONS_DIR = 'apps/api/src/db/migrations';

const RISK_PATTERNS: RiskPattern[] = [
  // CRITICAL - Data loss
  {
    pattern: /DROP\s+TABLE/i,
    risk: 'CRITICAL',
    reason: 'Drops entire table - all data will be lost',
    suggestion: 'Consider renaming table first and dropping after data migration verified',
  },
  {
    pattern: /TRUNCATE/i,
    risk: 'CRITICAL',
    reason: 'Truncates table - all data will be lost',
    suggestion: 'Use DELETE with WHERE clause or backup data first',
  },
  {
    pattern: /DELETE\s+FROM\s+[a-z_]+\s*(?:;|$)/i,
    risk: 'CRITICAL',
    reason: 'Deletes all rows from table without WHERE clause',
    suggestion: 'Add WHERE clause to limit deletion scope',
  },

  // HIGH - Potential data loss or breaking changes
  {
    pattern: /DROP\s+COLUMN/i,
    risk: 'HIGH',
    reason: 'Drops column - data in that column will be lost',
    suggestion: 'Ensure column data is backed up or migrated first',
  },
  {
    pattern: /ALTER.*TYPE/i,
    risk: 'HIGH',
    reason: 'Changes column type - may cause data conversion issues',
    suggestion: 'Test with production data snapshot first',
  },
  {
    pattern: /RENAME\s+TABLE/i,
    risk: 'HIGH',
    reason: 'Renames table - may break application queries',
    suggestion: 'Coordinate with application code changes',
  },
  {
    pattern: /DROP\s+INDEX.*CONCURRENTLY/i,
    risk: 'HIGH',
    reason: 'Drops index - may impact query performance',
    suggestion: 'Monitor query performance after migration',
  },
  {
    pattern: /\.dropColumn\(/i,
    risk: 'HIGH',
    reason: 'Drops column via Knex - data will be lost',
    suggestion: 'Verify column is unused and data is backed up',
  },

  // MEDIUM - Potential issues
  {
    pattern: /NOT\s+NULL(?!.*DEFAULT)/i,
    risk: 'MEDIUM',
    reason: 'Adds NOT NULL constraint without default value',
    suggestion: 'Add DEFAULT value or ensure all rows have values first',
  },
  {
    pattern: /\.notNullable\(\)(?!.*\.defaultTo\()/i,
    risk: 'MEDIUM',
    reason: 'Adds NOT NULL constraint via Knex without default',
    suggestion: 'Chain .defaultTo() to provide a default value',
  },
  {
    pattern: /RENAME\s+COLUMN/i,
    risk: 'MEDIUM',
    reason: 'Renames column - may break application queries',
    suggestion: 'Update all application code referencing this column',
  },
  {
    pattern: /\.renameColumn\(/i,
    risk: 'MEDIUM',
    reason: 'Renames column via Knex - may break application queries',
    suggestion: 'Update all application code referencing this column',
  },
  {
    pattern: /ADD\s+CONSTRAINT.*UNIQUE/i,
    risk: 'MEDIUM',
    reason: 'Adds unique constraint - may fail if duplicates exist',
    suggestion: 'Clean up duplicate data before adding constraint',
  },
  {
    pattern: /\.unique\(/i,
    risk: 'MEDIUM',
    reason: 'Adds unique constraint via Knex - may fail if duplicates exist',
    suggestion: 'Clean up duplicate data before adding constraint',
  },
  {
    pattern: /ADD\s+CONSTRAINT.*FOREIGN\s+KEY/i,
    risk: 'MEDIUM',
    reason: 'Adds foreign key - may fail if orphan records exist',
    suggestion: 'Clean up orphan records before adding constraint',
  },
  {
    pattern: /\.references\(/i,
    risk: 'MEDIUM',
    reason: 'Adds foreign key via Knex - may fail if orphan records exist',
    suggestion: 'Clean up orphan records before adding constraint',
  },

  // LOW - Worth noting
  {
    pattern: /CREATE\s+INDEX(?!.*CONCURRENTLY)/i,
    risk: 'LOW',
    reason: 'Creates index without CONCURRENTLY - may lock table',
    suggestion: 'Use CREATE INDEX CONCURRENTLY for large tables',
  },
  {
    pattern: /\.index\(/i,
    risk: 'LOW',
    reason: 'Creates index via Knex - may lock table briefly',
    suggestion: 'For large tables, consider raw SQL with CONCURRENTLY',
  },
  {
    pattern: /ALTER\s+TABLE.*ADD/i,
    risk: 'LOW',
    reason: 'Alters table structure',
    suggestion: 'Test on staging with production-like data volume',
  },
];

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

function getRiskColor(risk: RiskLevel): keyof typeof colors {
  switch (risk) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'red';
    case 'MEDIUM':
      return 'yellow';
    case 'LOW':
      return 'dim';
  }
}

function getRiskIcon(risk: RiskLevel): string {
  switch (risk) {
    case 'CRITICAL':
      return '🚨';
    case 'HIGH':
      return '⚠️';
    case 'MEDIUM':
      return '📝';
    case 'LOW':
      return '💡';
  }
}

// ============================================
// ANALYSIS
// ============================================

function getNewMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const allFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.ts'));

  try {
    // Get files that exist in main branch
    const mainFilesRaw = execSync(
      `git ls-tree -r origin/main --name-only ${MIGRATIONS_DIR} 2>/dev/null || true`,
      { encoding: 'utf-8' }
    );

    const mainFiles = mainFilesRaw
      .split('\n')
      .filter(Boolean)
      .map((f) => basename(f));

    // Return files that are new (not in main)
    return allFiles.filter((f) => !mainFiles.includes(f));
  } catch {
    // If git comparison fails, analyze all migrations
    return allFiles;
  }
}

function analyzeMigration(filePath: string): MigrationRisk {
  const content = readFileSync(filePath, 'utf-8');
  const filename = basename(filePath);

  const reasons: string[] = [];
  const suggestions: string[] = [];
  let maxRisk: RiskLevel = 'LOW';

  const riskPriority: Record<RiskLevel, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
  };

  for (const { pattern, risk, reason, suggestion } of RISK_PATTERNS) {
    if (pattern.test(content)) {
      reasons.push(reason);
      suggestions.push(suggestion);

      if (riskPriority[risk] > riskPriority[maxRisk]) {
        maxRisk = risk;
      }
    }
  }

  // Check for acknowledged destructive operations
  if (
    content.includes('// DESTRUCTIVE:') ||
    content.includes('/* DESTRUCTIVE:')
  ) {
    // If acknowledged, downgrade risk by one level
    if (maxRisk === 'CRITICAL') maxRisk = 'HIGH';
    else if (maxRisk === 'HIGH') maxRisk = 'MEDIUM';
    reasons.push('(Acknowledged as destructive by developer)');
  }

  return {
    file: filename,
    risk: reasons.length > 0 ? maxRisk : 'LOW',
    reasons,
    suggestions,
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  log('\n🔍 Migration Safety Analysis', 'bold');
  log('═'.repeat(60));

  const newMigrations = getNewMigrations();

  if (newMigrations.length === 0) {
    log('\n✅ No new migrations to analyze\n', 'green');
    process.exit(0);
  }

  log(`\nAnalyzing ${newMigrations.length} new migration(s)...\n`);

  const risks: MigrationRisk[] = [];

  for (const file of newMigrations) {
    const filePath = join(MIGRATIONS_DIR, file);
    const risk = analyzeMigration(filePath);
    risks.push(risk);
  }

  // Sort by risk level (highest first)
  const riskOrder: Record<RiskLevel, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  risks.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

  // Display results
  for (const risk of risks) {
    const icon = getRiskIcon(risk.risk);
    const color = getRiskColor(risk.risk);

    log(`${icon} ${risk.file} [${risk.risk}]`, color);

    if (risk.reasons.length > 0) {
      for (let i = 0; i < risk.reasons.length; i++) {
        log(`   • ${risk.reasons[i]}`, 'dim');
        if (risk.suggestions[i] && !risk.suggestions[i].includes('acknowledged')) {
          log(`     → ${risk.suggestions[i]}`, 'blue');
        }
      }
    } else {
      log('   • No significant risks detected', 'green');
    }
    console.log();
  }

  // Summary
  const criticalCount = risks.filter((r) => r.risk === 'CRITICAL').length;
  const highCount = risks.filter((r) => r.risk === 'HIGH').length;
  const mediumCount = risks.filter((r) => r.risk === 'MEDIUM').length;
  const lowCount = risks.filter((r) => r.risk === 'LOW').length;

  log('═'.repeat(60));
  log('\n📊 Summary:', 'bold');
  if (criticalCount > 0) log(`   🚨 CRITICAL: ${criticalCount}`, 'red');
  if (highCount > 0) log(`   ⚠️  HIGH: ${highCount}`, 'red');
  if (mediumCount > 0) log(`   📝 MEDIUM: ${mediumCount}`, 'yellow');
  if (lowCount > 0) log(`   💡 LOW: ${lowCount}`, 'dim');

  // Exit codes
  if (criticalCount > 0) {
    log(
      '\n❌ CRITICAL migrations detected - manual review required before merge\n',
      'red'
    );
    process.exit(1);
  }

  if (STRICT_MODE && highCount > 0) {
    log('\n❌ HIGH risk migrations detected (strict mode enabled)\n', 'red');
    process.exit(1);
  }

  if (highCount > 0 || mediumCount > 0) {
    log('\n⚠️  Review recommended before deploying\n', 'yellow');
    process.exit(0);
  }

  log('\n✅ All migrations appear safe\n', 'green');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error analyzing migrations:', error);
  process.exit(1);
});
