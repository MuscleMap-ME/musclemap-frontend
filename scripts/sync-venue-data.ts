#!/usr/bin/env npx tsx
/**
 * Venue Data Sync CLI
 *
 * Orchestrates data ingestion from all venue sources:
 * - NYC Open Data (recreation centers, athletic facilities)
 * - OpenStreetMap (outdoor fitness stations)
 * - Calisthenics-Parks.com (global outdoor spots) - Coming Soon
 *
 * Usage:
 *   pnpm venue:sync              # Sync all sources
 *   pnpm venue:sync --source=osm # Sync specific source
 *   pnpm venue:sync --dry-run    # Report only, no writes
 *
 * @module scripts/sync-venue-data
 */

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  source: 'all', // 'all' | 'nyc' | 'osm' | 'calisthenics-parks'
  dryRun: false,
  help: false,
  verbose: false,
};

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    flags.help = true;
  } else if (arg === '--dry-run') {
    flags.dryRun = true;
  } else if (arg === '--verbose' || arg === '-v') {
    flags.verbose = true;
  } else if (arg.startsWith('--source=')) {
    flags.source = arg.replace('--source=', '');
  }
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStats(label: string, stats: { created: number; updated: number; skipped: number; failed: number }): void {
  console.log(`\n${colors.bright}${label}${colors.reset}`);
  console.log(`  ${colors.green}✓ Created:${colors.reset} ${stats.created}`);
  console.log(`  ${colors.blue}↻ Updated:${colors.reset} ${stats.updated}`);
  console.log(`  ${colors.dim}⊘ Skipped:${colors.reset} ${stats.skipped}`);
  if (stats.failed > 0) {
    console.log(`  ${colors.red}✗ Failed:${colors.reset} ${stats.failed}`);
  }
}

function showHelp(): void {
  console.log(`
${colors.bright}MuscleMap Venue Data Sync${colors.reset}

Aggregates outdoor fitness venue data from multiple sources.

${colors.cyan}USAGE${colors.reset}
  pnpm venue:sync [options]

${colors.cyan}OPTIONS${colors.reset}
  --source=<source>   Sync specific source (default: all)
                      Options: all, nyc, osm, calisthenics-parks
  --dry-run           Preview what would be synced (no database writes)
  --verbose, -v       Show detailed output
  --help, -h          Show this help message

${colors.cyan}EXAMPLES${colors.reset}
  ${colors.dim}# Sync all data sources${colors.reset}
  pnpm venue:sync

  ${colors.dim}# Sync only OpenStreetMap data${colors.reset}
  pnpm venue:sync --source=osm

  ${colors.dim}# Preview NYC data without writing${colors.reset}
  pnpm venue:sync --source=nyc --dry-run

${colors.cyan}DATA SOURCES${colors.reset}
  ${colors.yellow}nyc${colors.reset}     NYC Open Data (recreation centers, athletic facilities)
  ${colors.yellow}osm${colors.reset}     OpenStreetMap (leisure=fitness_station tags)
  ${colors.yellow}calisthenics-parks${colors.reset}  Calisthenics-Parks.com API (coming soon)

${colors.cyan}NOTES${colors.reset}
  - Rate limiting is applied to respect API limits
  - Duplicate venues within 50m are automatically merged
  - OSM data may require user verification for equipment details
  - This script must be run from the project root directory
  - Requires DATABASE_URL environment variable to be set
`);
}

interface SyncResult {
  source: string;
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  error?: string;
  duration: number;
}

async function loadServices(): Promise<{
  nycDataIngestionService: any;
  osmDataIngestionService: any;
}> {
  // Dynamic import to allow the script to show help without loading database deps
  const nycModule = await import('../apps/api/src/modules/venues/nyc-data-ingestion.service.js');
  const osmModule = await import('../apps/api/src/modules/venues/osm-data-ingestion.service.js');

  return {
    nycDataIngestionService: nycModule.nycDataIngestionService || nycModule.default,
    osmDataIngestionService: osmModule.osmDataIngestionService || osmModule.default,
  };
}

async function syncNYC(nycDataIngestionService: any, dryRun: boolean): Promise<SyncResult> {
  const start = Date.now();
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📍 NYC Open Data', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  if (dryRun) {
    log('\n[DRY RUN] Would fetch from NYC Open Data APIs:', 'yellow');
    log('  - Recreation Centers: https://data.cityofnewyork.us/resource/ydj7-rk56.json');
    log('  - Athletic Facilities: https://data.cityofnewyork.us/resource/qpgi-ckmp.json');
    log('  - Parks Properties: https://data.cityofnewyork.us/resource/enfh-gkve.json');
    return {
      source: 'nyc',
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: Date.now() - start,
    };
  }

  try {
    log('\n🔄 Ingesting NYC Recreation Centers...', 'dim');
    const recStats = await nycDataIngestionService.ingestRecreationCenters();
    logStats('Recreation Centers', recStats);

    log('\n🔄 Linking venues to parks...', 'dim');
    const linkResult = await nycDataIngestionService.linkVenuesToParks();
    log(`  Linked: ${linkResult.linked}, Not found: ${linkResult.notFound}`);

    return {
      source: 'nyc',
      success: true,
      created: recStats.created,
      updated: recStats.updated,
      skipped: recStats.skipped,
      failed: recStats.failed,
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`\n❌ NYC sync failed: ${message}`, 'red');
    return {
      source: 'nyc',
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      error: message,
      duration: Date.now() - start,
    };
  }
}

async function syncOSM(osmDataIngestionService: any, dryRun: boolean): Promise<SyncResult> {
  const start = Date.now();
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🗺️  OpenStreetMap', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  if (dryRun) {
    log('\n[DRY RUN] Would query Overpass API for:', 'yellow');
    log('  - leisure=fitness_station');
    log('  - leisure=outdoor_gym');
    log('  - sport=fitness');
    log('  Bounding box: NYC area (40.4774,-74.2591 to 40.9176,-73.7004)');
    return {
      source: 'osm',
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: Date.now() - start,
    };
  }

  try {
    log('\n🔄 Querying Overpass API for fitness stations...', 'dim');
    const osmStats = await osmDataIngestionService.ingestOsmFitnessStations();
    logStats('OpenStreetMap Fitness Stations', osmStats);

    return {
      source: 'osm',
      success: true,
      created: osmStats.created,
      updated: osmStats.updated,
      skipped: osmStats.skipped,
      failed: osmStats.failed,
      duration: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`\n❌ OSM sync failed: ${message}`, 'red');
    return {
      source: 'osm',
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      error: message,
      duration: Date.now() - start,
    };
  }
}

async function syncCalisthenicsParks(dryRun: boolean): Promise<SyncResult> {
  const start = Date.now();
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🏋️  Calisthenics-Parks.com', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n⚠️  Calisthenics-Parks integration coming soon!', 'yellow');
  log('  This will import 26,000+ outdoor fitness spots globally.', 'dim');

  return {
    source: 'calisthenics-parks',
    success: true,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    duration: Date.now() - start,
  };
}

async function main(): Promise<void> {
  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  const startTime = Date.now();

  log('\n╔════════════════════════════════════════════════╗', 'bright');
  log('║     🏋️  MuscleMap Venue Data Sync              ║', 'bright');
  log('╚════════════════════════════════════════════════╝', 'bright');

  if (flags.dryRun) {
    log('\n⚠️  DRY RUN MODE - No database writes will occur', 'yellow');
  }

  log(`\n📊 Source: ${flags.source}`, 'dim');
  log(`   Verbose: ${flags.verbose}`, 'dim');

  // Load services only if not dry run
  let services: { nycDataIngestionService: any; osmDataIngestionService: any } | null = null;

  if (!flags.dryRun) {
    try {
      log('\n🔌 Loading database services...', 'dim');
      services = await loadServices();
      log('   Database connection ready', 'dim');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log(`\n❌ Failed to load services: ${message}`, 'red');
      log('\nMake sure:', 'dim');
      log('  1. DATABASE_URL is set in your environment', 'dim');
      log('  2. The database is accessible', 'dim');
      log('  3. You\'re running from the project root directory', 'dim');
      process.exit(1);
    }
  }

  const results: SyncResult[] = [];

  // Run syncs based on source flag
  if (flags.source === 'all' || flags.source === 'nyc') {
    results.push(await syncNYC(services?.nycDataIngestionService, flags.dryRun));
  }

  if (flags.source === 'all' || flags.source === 'osm') {
    results.push(await syncOSM(services?.osmDataIngestionService, flags.dryRun));
  }

  if (flags.source === 'all' || flags.source === 'calisthenics-parks') {
    results.push(await syncCalisthenicsParks(flags.dryRun));
  }

  // Summary
  const totalDuration = Date.now() - startTime;
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const successCount = results.filter((r) => r.success).length;

  log('\n═══════════════════════════════════════════════════', 'bright');
  log('📈 SYNC SUMMARY', 'bright');
  log('═══════════════════════════════════════════════════', 'bright');

  for (const result of results) {
    const statusIcon = result.success ? '✓' : '✗';
    const statusColor = result.success ? 'green' : 'red';
    log(`  ${colors[statusColor]}${statusIcon}${colors.reset} ${result.source}: ${result.created + result.updated} records in ${(result.duration / 1000).toFixed(1)}s`);
    if (result.error) {
      log(`    ${colors.red}Error: ${result.error}${colors.reset}`);
    }
  }

  log(`\n${colors.bright}Totals:${colors.reset}`);
  log(`  ${colors.green}Created:${colors.reset} ${totalCreated}`);
  log(`  ${colors.blue}Updated:${colors.reset} ${totalUpdated}`);
  log(`  ${colors.dim}Skipped:${colors.reset} ${totalSkipped}`);
  if (totalFailed > 0) {
    log(`  ${colors.red}Failed:${colors.reset} ${totalFailed}`);
  }

  log(`\n⏱️  Total time: ${(totalDuration / 1000).toFixed(1)}s`);
  log(`📊 Sources: ${successCount}/${results.length} successful\n`);

  // Exit with error if any sync failed
  if (successCount < results.length) {
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
