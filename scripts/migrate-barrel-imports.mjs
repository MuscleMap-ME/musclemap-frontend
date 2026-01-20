#!/usr/bin/env node

/**
 * Barrel Import Migration Script
 *
 * Migrates barrel imports to direct imports for better tree-shaking.
 * Converts:
 *   import { useAuth, useToast } from '@/hooks';
 * To:
 *   import { useAuth } from '@/store/authStore';
 *   import { useToast } from '@/store/uiStore';
 *
 * Usage:
 *   node scripts/migrate-barrel-imports.mjs --dry-run  # Preview changes
 *   node scripts/migrate-barrel-imports.mjs            # Apply changes
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname, resolve } from 'path';

// Map of exports to their actual source files
// This tells the script where each export actually comes from
const HOOK_SOURCES = {
  // Auth hooks
  useAuth: '@/store/authStore',
  useAuthStore: '@/store/authStore',
  getToken: '@/store/authStore',
  getAuthHeader: '@/store/authStore',

  // UI hooks
  useUIStore: '@/store/uiStore',
  useModal: '@/store/uiStore',
  useToast: '@/store/uiStore',
  useConfirm: '@/store/uiStore',
  useResponsive: '@/store/uiStore',

  // Workout hooks
  useWorkoutSessionStore: '@/store/workoutSessionStore',
  useRestTimer: '@/store/workoutSessionStore',
  useWorkoutMetrics: '@/store/workoutSessionStore',
  useCurrentExercise: '@/store/workoutSessionStore',
  useSessionPRs: '@/store/workoutSessionStore',
  use1RM: '@/store/workoutSessionStore',
  useSetLogging: '@/store/workoutSessionStore',

  // Muscle visualization hooks
  useMuscleVisualizationStore: '@/store/muscleVisualizationStore',
  useMuscleHighlight: '@/store/muscleVisualizationStore',
  useMuscleIntensity: '@/store/muscleVisualizationStore',
  useCameraControls: '@/store/muscleVisualizationStore',

  // Nutrition hooks
  useNutritionStore: '@/store/nutritionStore',
  useNutritionEnabled: '@/store/nutritionStore',
  useNutritionPreferences: '@/store/nutritionStore',
  useNutritionGoals: '@/store/nutritionStore',
  useTodaysSummary: '@/store/nutritionStore',
  useTodaysMeals: '@/store/nutritionStore',

  // Feedback hooks
  useFeedbackStore: '@/store/feedbackStore',
  useFeedbackModal: '@/store/feedbackStore',
  useFeedbackForm: '@/store/feedbackStore',

  // Offline hooks
  useOfflineStore: '@/store/offlineStore',
  useOnlineStatus: '@/store/offlineStore',
  useSyncStatus: '@/store/offlineStore',
  usePendingOperations: '@/store/offlineStore',

  // Engagement hooks
  useEngagementStore: '@/store/engagementStore',
  useDailyLogin: '@/store/engagementStore',
  useStreaks: '@/store/engagementStore',
  useChallenges: '@/store/engagementStore',

  // Adventure map hooks
  useAdventureMapStore: '@/store/adventureMapStore',
  useCharacterPosition: '@/store/adventureMapStore',
  useMapView: '@/store/adventureMapStore',

  // Preferences hooks
  usePreferencesStore: '@/store/preferencesStore',
  useCoachingSettings: '@/store/preferencesStore',
  useGuidanceLevel: '@/store/preferencesStore',

  // Dashboard hooks
  useDashboardStore: '@/store/dashboardStore',
  useDashboardLayout: '@/store/dashboardStore',
  useWidgetManager: '@/store/dashboardStore',

  // Hydration hooks
  useHydrationStore: '@/store/hydrationStore',
  useHydrationTracker: '@/store/hydrationStore',
  useHydrationReminders: '@/store/hydrationStore',

  // Music hooks
  useMusicStore: '@/store/musicStore',
  useMusicPlayback: '@/store/musicStore',
  useMusicConnections: '@/store/musicStore',
};

const STORE_SOURCES = {
  ...HOOK_SOURCES,
  // Store utilities
  resetAllStores: '@/store/index',
  subscribeToStore: '@/store/index',
  getStoreState: '@/store/index',
  createSelector: '@/store/index',
  selectors: '@/store/index',
  CELEBRATION_EVENTS: '@/store/index',
  createCelebrationConfig: '@/store/index',
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function getAllFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const results = [];

  function walk(currentDir) {
    const files = readdirSync(currentDir);
    for (const file of files) {
      const filePath = join(currentDir, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
          walk(filePath);
        }
      } else if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }

  walk(dir);
  return results;
}

function parseImports(content) {
  // Match: import { name1, name2 } from 'source';
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    const source = match[2];
    imports.push({
      fullMatch: match[0],
      names,
      source,
      index: match.index,
    });
  }

  return imports;
}

function isBarrelImport(source) {
  const barrelPatterns = [
    /^@\/hooks$/,
    /^@\/store$/,
    /^\.\.?\/hooks$/,
    /^\.\.?\/store$/,
    /\/hooks\/index$/,
    /\/store\/index$/,
  ];

  return barrelPatterns.some(p => p.test(source));
}

function migrateFile(filePath, dryRun = true) {
  const content = readFileSync(filePath, 'utf-8');
  const imports = parseImports(content);

  const barrelImports = imports.filter(imp => isBarrelImport(imp.source));

  if (barrelImports.length === 0) {
    return null;
  }

  let newContent = content;
  const changes = [];

  for (const imp of barrelImports) {
    // Group imports by their actual source
    const sourceMap = new Map();

    for (const name of imp.names) {
      const sourceLookup = imp.source.includes('hook') ? HOOK_SOURCES : STORE_SOURCES;
      const actualSource = sourceLookup[name];

      if (actualSource) {
        if (!sourceMap.has(actualSource)) {
          sourceMap.set(actualSource, []);
        }
        sourceMap.get(actualSource).push(name);
      } else {
        // Unknown export - keep original
        if (!sourceMap.has(imp.source)) {
          sourceMap.set(imp.source, []);
        }
        sourceMap.get(imp.source).push(name);
      }
    }

    // Generate new import statements
    const newImports = [];
    for (const [source, names] of sourceMap) {
      newImports.push(`import { ${names.join(', ')} } from '${source}';`);
    }

    const newImportText = newImports.join('\n');

    changes.push({
      original: imp.fullMatch,
      replacement: newImportText,
    });

    newContent = newContent.replace(imp.fullMatch, newImportText);
  }

  if (changes.length === 0) {
    return null;
  }

  if (!dryRun) {
    writeFileSync(filePath, newContent);
  }

  return { filePath, changes };
}

// Main execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const srcDir = resolve(process.cwd(), 'src');

console.log(`\n${colors.bold}Barrel Import Migration${colors.reset}`);
console.log(`Mode: ${dryRun ? colors.yellow + 'DRY RUN' : colors.green + 'APPLY CHANGES'}${colors.reset}\n`);

const files = getAllFiles(srcDir);
console.log(`Scanning ${files.length} files...\n`);

let totalChanges = 0;
const results = [];

for (const file of files) {
  const result = migrateFile(file, dryRun);
  if (result) {
    results.push(result);
    totalChanges += result.changes.length;
  }
}

if (results.length === 0) {
  console.log(`${colors.green}No barrel imports found!${colors.reset}\n`);
} else {
  for (const result of results) {
    const relPath = relative(process.cwd(), result.filePath);
    console.log(`${colors.cyan}${relPath}${colors.reset}`);

    for (const change of result.changes) {
      console.log(`  ${colors.red}- ${change.original}${colors.reset}`);
      for (const line of change.replacement.split('\n')) {
        console.log(`  ${colors.green}+ ${line}${colors.reset}`);
      }
    }
    console.log('');
  }

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  Files affected: ${results.length}`);
  console.log(`  Total changes: ${totalChanges}`);

  if (dryRun) {
    console.log(`\n${colors.yellow}This was a dry run. Run without --dry-run to apply changes.${colors.reset}`);
  } else {
    console.log(`\n${colors.green}Changes applied successfully!${colors.reset}`);
  }
}
