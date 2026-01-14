#!/usr/bin/env npx tsx
/**
 * MuscleMap Test Harness
 * Main entry point for running comprehensive API tests
 *
 * Usage:
 *   pnpm test:harness                    # Run all tests
 *   pnpm test:harness --category core    # Run core tests only
 *   pnpm test:harness --persona elite_eve # Run as specific persona
 *   pnpm test:harness --env production   # Run against production
 *   pnpm test:harness --verbose          # Verbose output
 */

import { parseArgs } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFile, mkdir } from 'fs/promises';

import type {
  CLIArgs,
  ExecutionOptions,
  TestCategory,
  PersonaType,
  Environment,
  ReporterFormat,
} from './types.js';
import { executeSuites, loadScripts, builtInSuites } from './orchestrator.js';
import { getAllPersonaIds } from './personas.js';
import { scorecardToJson, scorecardToHtml, scorecardToJUnit } from './scorecard.js';

// ============================================================================
// Constants
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRIPTS_DIR = join(__dirname, 'scripts');

const VALID_CATEGORIES: TestCategory[] = [
  'core',
  'auth',
  'profile',
  'workouts',
  'exercises',
  'social',
  'economy',
  'achievements',
  'competitions',
  'settings',
  'graphql',
  'stress',
  'security',
  'edge-cases',
];

const VALID_ENVIRONMENTS: Environment[] = ['local', 'staging', 'production'];
const VALID_FORMATS: ReporterFormat[] = ['console', 'json', 'html', 'junit'];

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function printHelp(): void {
  const personas = getAllPersonaIds();

  console.log(`
\x1b[1mMuscleMap Test Harness\x1b[0m

Usage: pnpm test:harness [options]

Options:
  --category, -c <name>     Filter tests by category
  --suite, -s <name>        Filter tests by suite name (partial match)
  --persona, -p <id>        Run tests as specific persona
  --env, -e <environment>   Target environment (local, staging, production)
  --verbose, -v             Enable verbose output
  --parallel                Run tests in parallel
  --retries <number>        Number of retries for failed tests (default: 0)
  --timeout <number>        Default timeout in ms (default: 30000)
  --fail-fast               Stop on first failure
  --dry-run                 Show what would be run without executing
  --output, -o <path>       Output file path for report
  --format, -f <format>     Output format (console, json, html, junit)
  --help, -h                Show this help message

Categories:
  ${VALID_CATEGORIES.join(', ')}

Personas:
  ${personas.slice(0, 5).join(', ')}...
  (and ${personas.length - 5} more)

Examples:
  pnpm test:harness                           # Run all tests locally
  pnpm test:harness --category core           # Run core tests only
  pnpm test:harness --persona elite_eve       # Run as premium user
  pnpm test:harness --env production -v       # Run against prod with verbose
  pnpm test:harness --format html -o report.html  # Generate HTML report
`);
}

function parseCliArgs(): CLIArgs {
  const { values } = parseArgs({
    options: {
      category: { type: 'string', short: 'c' },
      suite: { type: 'string', short: 's' },
      persona: { type: 'string', short: 'p' },
      env: { type: 'string', short: 'e', default: 'local' },
      verbose: { type: 'boolean', short: 'v', default: false },
      parallel: { type: 'boolean', default: false },
      retries: { type: 'string', default: '0' },
      timeout: { type: 'string', default: '30000' },
      'fail-fast': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f', default: 'console' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  return {
    category: values.category as TestCategory | undefined,
    suite: values.suite,
    persona: values.persona as PersonaType | undefined,
    env: values.env as Environment,
    verbose: values.verbose as boolean,
    parallel: values.parallel as boolean,
    retries: parseInt(values.retries as string, 10),
    timeout: parseInt(values.timeout as string, 10),
    failFast: values['fail-fast'] as boolean,
    dryRun: values['dry-run'] as boolean,
    output: values.output,
    format: values.format as ReporterFormat,
    help: values.help as boolean,
  };
}

// ============================================================================
// Validation
// ============================================================================

function validateArgs(args: CLIArgs): string[] {
  const errors: string[] = [];

  if (args.category && !VALID_CATEGORIES.includes(args.category)) {
    errors.push(
      `Invalid category "${args.category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`
    );
  }

  if (args.persona && !getAllPersonaIds().includes(args.persona)) {
    errors.push(
      `Invalid persona "${args.persona}". Valid personas: ${getAllPersonaIds().join(', ')}`
    );
  }

  if (!VALID_ENVIRONMENTS.includes(args.env)) {
    errors.push(
      `Invalid environment "${args.env}". Valid environments: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }

  if (!VALID_FORMATS.includes(args.format)) {
    errors.push(
      `Invalid format "${args.format}". Valid formats: ${VALID_FORMATS.join(', ')}`
    );
  }

  if (isNaN(args.retries) || args.retries < 0) {
    errors.push('Retries must be a non-negative number');
  }

  if (isNaN(args.timeout) || args.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms');
  }

  return errors;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = parseCliArgs();

  // Show help
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate arguments
  const validationErrors = validateArgs(args);
  if (validationErrors.length > 0) {
    console.error('\x1b[31mValidation errors:\x1b[0m');
    for (const error of validationErrors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  // Build execution options
  const options: ExecutionOptions = {
    category: args.category,
    suite: args.suite,
    persona: args.persona,
    environment: args.env,
    verbose: args.verbose,
    parallel: args.parallel,
    retries: args.retries,
    timeout: args.timeout,
    failFast: args.failFast,
    dryRun: args.dryRun,
  };

  // Load test scripts
  console.log('\x1b[2mLoading test scripts...\x1b[0m');
  const userScripts = await loadScripts(SCRIPTS_DIR);
  const allScripts = [...builtInSuites, ...userScripts];

  console.log(`\x1b[2mFound ${allScripts.length} test scripts\x1b[0m`);

  // Dry run - just show what would be run
  if (args.dryRun) {
    console.log('\n\x1b[1mDry Run - Would execute:\x1b[0m');

    let filtered = allScripts;
    if (args.category) {
      filtered = filtered.filter((s) => s.category === args.category);
    }
    if (args.suite) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(args.suite!.toLowerCase())
      );
    }

    for (const script of filtered) {
      console.log(`  - ${script.name} (${script.category}) - ${script.steps.length} steps`);
    }

    console.log(`\nTotal: ${filtered.length} scripts`);
    process.exit(0);
  }

  // Execute tests
  const { suiteResults, scorecard } = await executeSuites(allScripts, options);

  // Generate output
  if (args.output) {
    let content: string;

    switch (args.format) {
      case 'json':
        content = scorecardToJson(scorecard);
        break;
      case 'html':
        content = scorecardToHtml(scorecard);
        break;
      case 'junit':
        content = scorecardToJUnit(scorecard);
        break;
      default:
        content = scorecardToJson(scorecard);
    }

    // Ensure output directory exists
    const outputDir = dirname(args.output);
    await mkdir(outputDir, { recursive: true });

    await writeFile(args.output, content, 'utf-8');
    console.log(`\nReport written to: ${args.output}`);
  }

  // Exit with appropriate code
  const exitCode = scorecard.summary.failed > 0 ? 1 : 0;
  process.exit(exitCode);
}

// ============================================================================
// Run
// ============================================================================

main().catch((error) => {
  console.error('\x1b[31mFatal error:\x1b[0m', error);
  process.exit(1);
});
