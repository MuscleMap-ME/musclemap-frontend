#!/usr/bin/env npx tsx
/**
 * Bug Hunter CLI
 * Autonomous bug detection and fixing system for MuscleMap
 *
 * Usage:
 *   npx tsx scripts/bug-hunter/index.ts                    # Run one discovery cycle
 *   npx tsx scripts/bug-hunter/index.ts --daemon           # Run continuous daemon
 *   npx tsx scripts/bug-hunter/index.ts --level aggressive # Run aggressively
 *   npx tsx scripts/bug-hunter/index.ts --section workout  # Test specific section
 *   npx tsx scripts/bug-hunter/index.ts --dry-run          # Discovery only (no fixes)
 *   npx tsx scripts/bug-hunter/index.ts --fix <bug-id>     # Fix specific bug
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { getConfig, parseArgs, printConfig, type CLIOptions } from './config.js';
import { BugHunterDaemon, createBugHunterDaemon } from './daemon.js';
import { BugHunterAgent, createBugHunterAgent } from './agent.js';
import { AutoFixer, createAutoFixer } from './auto-fixer.js';
import { ClaudeIntegration, createClaudeIntegration } from './claude-integration.js';
import { BugReporter, createBugReporter } from './bug-reporter.js';
import { DiagnosticsEngine } from './diagnostics.js';
import { getCoverageSummary } from './coverage-map.js';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Parse arguments
  const options = parseArgs(args);

  // Get configuration
  const config = getConfig({
    automationLevel: options.automationLevel,
    dryRun: options.dryRun,
    baseUrl: options.production ? 'https://musclemap.me' : 'http://localhost:5173',
    productionUrl: 'https://musclemap.me',
  });

  // Print banner
  printBanner();

  // Handle specific commands
  if (args.includes('--status')) {
    await showStatus(config);
    return;
  }

  if (args.includes('--coverage')) {
    showCoverage();
    return;
  }

  if (args.includes('--queue')) {
    await showClaudeQueue(config);
    return;
  }

  if (args.includes('--process-queue')) {
    await processClaudeQueue(config);
    return;
  }

  if (options.fixBugId) {
    await fixSpecificBug(options.fixBugId, config, options);
    return;
  }

  // Print configuration
  if (options.verbose) {
    printConfig(config);
  }

  // Run daemon or single cycle
  if (options.daemon) {
    await runDaemon(config, options);
  } else {
    await runSingleCycle(config, options);
  }
}

// ============================================================================
// RUN MODES
// ============================================================================

async function runDaemon(config: ReturnType<typeof getConfig>, options: CLIOptions): Promise<void> {
  const daemon = createBugHunterDaemon(PROJECT_ROOT, config);

  // Handle signals
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Received SIGINT - shutting down gracefully...');
    await daemon.pause();
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n⚠️  Received SIGTERM - shutting down gracefully...');
    await daemon.stop();
    process.exit(0);
  });

  // Start daemon
  await daemon.start({
    verbose: options.verbose,
    headed: options.headed,
  });
}

async function runSingleCycle(config: ReturnType<typeof getConfig>, options: CLIOptions): Promise<void> {
  console.log('\n🔍 Running single discovery cycle...\n');

  const agent = createBugHunterAgent(PROJECT_ROOT, config);

  try {
    await agent.start({
      verbose: options.verbose,
      headed: options.headed,
    });

    const bugs = await agent.explore({
      duration: options.aggressive ? 5 * 60 * 1000 : 15 * 60 * 1000,  // 5 or 15 minutes
      section: options.section,
      depth: options.aggressive ? 'quick' : 'comprehensive',
    });

    console.log(`\n${'═'.repeat(55)}`);
    console.log('📊 DISCOVERY RESULTS');
    console.log(`${'═'.repeat(55)}`);
    console.log(`   Routes tested: ${agent.getRoutesTested().length}`);
    console.log(`   Bugs found: ${bugs.length}`);

    if (bugs.length > 0) {
      console.log('\n📋 Bugs by severity:');
      const bySeverity = {
        critical: bugs.filter(b => b.severity === 'critical'),
        high: bugs.filter(b => b.severity === 'high'),
        medium: bugs.filter(b => b.severity === 'medium'),
        low: bugs.filter(b => b.severity === 'low'),
      };

      for (const [severity, severityBugs] of Object.entries(bySeverity)) {
        if (severityBugs.length > 0) {
          console.log(`   ${severity.toUpperCase()}: ${severityBugs.length}`);
          for (const bug of severityBugs.slice(0, 3)) {
            console.log(`      - ${bug.title.slice(0, 60)}`);
          }
        }
      }

      // Save reports
      const reporter = await createBugReporter(config.reportDir, PROJECT_ROOT);
      for (const bug of bugs) {
        await reporter.saveBugReport(bug);
      }

      await reporter.updateKnownBugsDocs(bugs);
      console.log(`\n📁 Reports saved to: ${config.reportDir}`);

      // Auto-fix if enabled and not dry-run
      if (!config.dryRun && config.automationLevel !== 'discover' && config.automationLevel !== 'diagnose') {
        console.log('\n🔧 Starting auto-fix phase...\n');

        const autoFixer = createAutoFixer(PROJECT_ROOT, config);
        const fixResults = await autoFixer.fixBatch(bugs.filter(b =>
          b.severity === 'critical' || b.severity === 'high'
        ));

        const fixed = fixResults.filter(r => r.success).length;
        console.log(`\n✅ Fixed ${fixed}/${fixResults.length} bugs`);
      }
    }

    console.log(`${'═'.repeat(55)}\n`);

  } finally {
    await agent.stop();
  }
}

async function fixSpecificBug(bugId: string, config: ReturnType<typeof getConfig>, options: CLIOptions): Promise<void> {
  console.log(`\n🔧 Fixing bug: ${bugId}\n`);

  // Load bug from reports
  const bugPath = path.join(config.reportDir, `bug-${bugId}.json`);

  let bug;
  try {
    const content = await fs.readFile(bugPath, 'utf-8');
    bug = JSON.parse(content);
  } catch {
    console.error(`❌ Bug not found: ${bugPath}`);
    console.log('   Try running a discovery cycle first to find bugs.');
    return;
  }

  console.log(`📋 Bug: ${bug.title}`);
  console.log(`   Severity: ${bug.severity}`);
  console.log(`   File: ${bug.rootCause?.file || 'unknown'}`);
  console.log(`   Confidence: ${bug.rootCause?.confidence ? (bug.rootCause.confidence * 100).toFixed(0) + '%' : 'unknown'}`);

  if (config.dryRun) {
    console.log('\n⚠️  Dry run - no changes will be made');
    return;
  }

  const autoFixer = createAutoFixer(PROJECT_ROOT, config);
  const result = await autoFixer.fix(bug);

  if (result.success) {
    console.log('\n✅ Bug fixed successfully!');
    console.log(`   Files changed: ${result.filesChanged.join(', ')}`);
    console.log(`   Commit: ${result.commit}`);
  } else {
    console.log('\n❌ Fix failed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Errors: ${result.errors.join(', ')}`);

    if (config.claudeEnabled) {
      console.log('\n🤖 Queuing for Claude analysis...');
      const claude = createClaudeIntegration(PROJECT_ROOT, config);
      await claude.queueForClaude(bug);
      console.log('   Bug queued. Run --process-queue to have Claude fix it.');
    }
  }
}

// ============================================================================
// INFO COMMANDS
// ============================================================================

async function showStatus(config: ReturnType<typeof getConfig>): Promise<void> {
  console.log('\n📊 Bug Hunter Status\n');

  // Check if daemon is running
  const statePath = path.join(config.dataDir, 'daemon-state.json');
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    const state = JSON.parse(content);
    console.log(`Daemon: ${state.running ? '🟢 Running' : '🔴 Stopped'}`);
    console.log(`Current Cycle: ${state.currentCycle}`);
    console.log(`Phase: ${state.currentPhase}`);
    console.log(`Bugs in Queue: ${state.bugsInQueue}`);
  } catch {
    console.log('Daemon: 🔴 Not running');
  }

  // Show pending bugs count
  const reportsDir = config.reportDir;
  try {
    const files = await fs.readdir(reportsDir);
    const bugFiles = files.filter(f => f.startsWith('bug-') && f.endsWith('.json'));
    console.log(`\nPending Bugs: ${bugFiles.length}`);
  } catch {
    console.log('\nNo reports found');
  }

  // Show Claude queue
  try {
    const queueFiles = await fs.readdir(config.fixQueueDir);
    const mdFiles = queueFiles.filter(f => f.endsWith('.md'));
    console.log(`Claude Queue: ${mdFiles.length} bugs`);
  } catch {
    console.log('Claude Queue: 0 bugs');
  }

  // Show recent activity
  console.log('\nRecent Activity:');
  try {
    const metricsPath = path.join(config.dataDir, 'metrics.json');
    const content = await fs.readFile(metricsPath, 'utf-8');
    const metrics = JSON.parse(content);
    console.log(`   Total Bugs Found: ${metrics.totalBugsFound}`);
    console.log(`   Total Bugs Fixed: ${metrics.totalBugsFixed}`);
    console.log(`   Success Rate: ${metrics.autoFixSuccessRate ? (metrics.autoFixSuccessRate * 100).toFixed(1) + '%' : 'N/A'}`);
  } catch {
    console.log('   No metrics available');
  }
}

function showCoverage(): void {
  console.log('\n📋 Coverage Map Summary\n');

  const summary = getCoverageSummary();

  console.log(`Routes:             ${summary.routes}`);
  console.log(`  Authenticated:    ${summary.authenticatedRoutes}`);
  console.log(`  Public:           ${summary.publicRoutes}`);
  console.log(`  Admin:            ${summary.adminRoutes}`);
  console.log(`Categories:         ${summary.categories}`);
  console.log(`Interactions:       ${summary.interactions}`);
  console.log(`Forms:              ${summary.forms}`);
  console.log(`API Endpoints:      ${summary.apiEndpoints}`);
  console.log(`GraphQL Operations: ${summary.graphqlOperations}`);
  console.log(`Edge Cases:         ${summary.edgeCases}`);
}

async function showClaudeQueue(config: ReturnType<typeof getConfig>): Promise<void> {
  console.log('\n🤖 Claude Fix Queue\n');

  try {
    const files = await fs.readdir(config.fixQueueDir);
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'));

    if (mdFiles.length === 0) {
      console.log('Queue is empty');
      return;
    }

    console.log(`${mdFiles.length} bugs queued for Claude:\n`);
    for (const file of mdFiles) {
      const bugId = file.replace('.md', '');
      console.log(`  - ${bugId}`);
    }

    console.log('\nRun --process-queue to have Claude fix these bugs.');
  } catch {
    console.log('Queue is empty');
  }
}

async function processClaudeQueue(config: ReturnType<typeof getConfig>): Promise<void> {
  console.log('\n🤖 Processing Claude Queue...\n');

  const claude = createClaudeIntegration(PROJECT_ROOT, config);

  const isAvailable = await claude.isClaudeAvailable();
  if (!isAvailable) {
    console.error('❌ Claude CLI not found. Please install it first.');
    return;
  }

  const results = await claude.processQueue();

  console.log(`\n✅ Processed ${results.length} bugs`);
  console.log(`   Fixed: ${results.filter(r => r.success).length}`);
  console.log(`   Failed: ${results.filter(r => !r.success).length}`);
}

// ============================================================================
// HELP
// ============================================================================

function printBanner(): void {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🐛  B U G   H U N T E R                               ║
║                                                          ║
║   Autonomous Bug Detection & Auto-Fixing System          ║
║   for MuscleMap                                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
}

function printHelp(): void {
  console.log(`
Bug Hunter - Autonomous Bug Detection & Fixing

USAGE:
  npx tsx scripts/bug-hunter/index.ts [OPTIONS]

OPTIONS:
  --daemon, -D          Run as continuous daemon
  --level, -l LEVEL     Automation level:
                          discover       - Find bugs only
                          diagnose       - Find and analyze bugs
                          suggest        - Find, analyze, suggest fixes
                          auto-fix-simple - Auto-fix simple bugs
                          auto-fix-all   - Auto-fix all bugs
                          autonomous     - Full autonomous operation (default)
                          aggressive     - Faster cycles, parallel fixes

  --section, -s SECTION Test specific section:
                          public, auth, core, workout, exercises,
                          journey, profile, stats, social, economy,
                          health, career, admin, developer

  --production, --prod  Test against production (https://musclemap.me)
  --dry-run, -d         Discovery only, no fixes
  --verbose, -v         Show detailed output
  --headed, -h          Show browser window
  --aggressive, -a      Run aggressively (short cycles)

  --fix <bug-id>        Fix a specific bug by ID
  --status              Show daemon status
  --coverage            Show coverage map summary
  --queue               Show Claude fix queue
  --process-queue       Process Claude fix queue

  --help                Show this help

EXAMPLES:
  # Run single discovery cycle
  npx tsx scripts/bug-hunter/index.ts

  # Run as daemon with verbose output
  npx tsx scripts/bug-hunter/index.ts --daemon --verbose

  # Test only workout section
  npx tsx scripts/bug-hunter/index.ts --section workout

  # Aggressive mode against production
  npx tsx scripts/bug-hunter/index.ts --aggressive --production

  # Fix specific bug
  npx tsx scripts/bug-hunter/index.ts --fix abc12345

CONFIGURATION:
  Edit scripts/bug-hunter/config.ts to change defaults.
  Environment variables:
    NODE_ENV          - development/production
    AUTOMATION_LEVEL  - Override automation level
`);
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
