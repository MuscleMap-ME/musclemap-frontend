#!/usr/bin/env npx tsx
/**
 * wger.de Exercise Image Integration Script
 *
 * This script fetches exercise images from the wger.de API and maps them
 * to our exercises database. wger.de is an open-source fitness database
 * with CC-BY-SA licensed exercise illustrations.
 *
 * Usage:
 *   npx tsx scripts/wger-exercise-images.ts --fetch    # Fetch all wger data to local cache
 *   npx tsx scripts/wger-exercise-images.ts --map      # Generate exercise mappings
 *   npx tsx scripts/wger-exercise-images.ts --apply    # Apply mappings to database
 *   npx tsx scripts/wger-exercise-images.ts --all      # Do everything
 *   npx tsx scripts/wger-exercise-images.ts --status   # Show current status
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface WgerImage {
  id: number;
  uuid: string;
  exercise: number;
  image: string;
  is_main: boolean;
  style: string;
  license: number;
  license_author: string;
  author_history: string[];
}

interface WgerExerciseTranslation {
  id: number;
  uuid: string;
  name: string;
  description: string;
  language: number;
}

interface WgerExerciseInfo {
  id: number;
  uuid: string;
  category: { id: number; name: string };
  muscles: { id: number; name: string; name_en: string }[];
  muscles_secondary: { id: number; name: string; name_en: string }[];
  equipment: { id: number; name: string }[];
  images: WgerImage[];
  translations: WgerExerciseTranslation[];
}

interface ExerciseMapping {
  musclemapId: string;
  musclemapName: string;
  wgerId: number | null;
  wgerUuid: string | null;
  wgerName: string | null;
  imageUrl: string | null;
  imageLicense: string | null;
  imageAuthor: string | null;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  matchReason: string;
}

// ============================================
// CONFIGURATION
// ============================================

const CACHE_DIR = path.join(process.cwd(), '.wger-cache');
const WGER_API_BASE = 'https://wger.de/api/v2';
const RATE_LIMIT_MS = 200; // Be nice to wger API

// ============================================
// UTILITY FUNCTIONS
// ============================================

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 429) {
        console.log(`Rate limited, waiting ${(i + 1) * 2} seconds...`);
        await sleep((i + 1) * 2000);
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await sleep(1000);
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================
// WGER API FUNCTIONS
// ============================================

async function fetchAllWgerExercises(): Promise<WgerExerciseInfo[]> {
  console.log('Fetching all exercises from wger.de API...');
  const exercises: WgerExerciseInfo[] = [];
  let url: string | null = `${WGER_API_BASE}/exerciseinfo/?language=2&limit=50`;
  let page = 1;

  while (url) {
    console.log(`  Fetching page ${page}...`);
    const response = await fetchWithRetry(url);
    const data = await response.json();
    exercises.push(...data.results);
    url = data.next;
    page++;
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`  Fetched ${exercises.length} exercises total`);
  return exercises;
}

async function fetchAllWgerImages(): Promise<WgerImage[]> {
  console.log('Fetching all images from wger.de API...');
  const images: WgerImage[] = [];
  let url: string | null = `${WGER_API_BASE}/exerciseimage/?limit=100`;
  let page = 1;

  while (url) {
    console.log(`  Fetching page ${page}...`);
    const response = await fetchWithRetry(url);
    const data = await response.json();
    images.push(...data.results);
    url = data.next;
    page++;
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`  Fetched ${images.length} images total`);
  return images;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

function saveCacheFile(filename: string, data: unknown): void {
  ensureCacheDir();
  const filepath = path.join(CACHE_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Saved cache: ${filepath}`);
}

function loadCacheFile<T>(filename: string): T | null {
  const filepath = path.join(CACHE_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// ============================================
// EXERCISE MAPPING
// ============================================

// Normalize exercise names for comparison
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Common variations
    .replace(/dumbbell/g, 'db')
    .replace(/barbell/g, 'bb')
    .replace(/kettlebell/g, 'kb')
    .replace(/body ?weight/g, 'bw')
    .replace(/press/g, 'press')
    .replace(/pull ?up/g, 'pullup')
    .replace(/push ?up/g, 'pushup')
    .replace(/chin ?up/g, 'chinup');
}

// Calculate similarity between two strings (Levenshtein-based)
function stringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  // Check if one contains the other
  if (longer.includes(shorter)) {
    return shorter.length / longer.length * 0.9 + 0.1;
  }

  // Simple word overlap
  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  const intersection = [...aWords].filter(w => bWords.has(w));

  return intersection.length / Math.max(aWords.size, bWords.size);
}

// Hand-curated mappings for common exercises
const MANUAL_MAPPINGS: Record<string, string> = {
  // Push exercises
  'bw-pushup': 'Push-ups',
  'bw-diamond-pushup': 'Diamond Push-ups',
  'bw-decline-pushup': 'Decline Push-ups',
  'bw-dip': 'Dips',
  'fw-bench-press': 'Bench Press',
  'fw-incline-bench': 'Incline Bench Press',
  'fw-db-bench': 'Dumbbell Bench Press',
  'fw-db-fly': 'Dumbbell Flyes',

  // Pull exercises
  'bw-pullup': 'Pull-ups',
  'bw-chinup': 'Chin-ups',
  'bw-row': 'Inverted Row',
  'fw-deadlift': 'Deadlift',
  'fw-barbell-row': 'Bent Over Barbell Row',
  'fw-db-row': 'Bent Over Row - Dumbbell',

  // Shoulder exercises
  'fw-ohp': 'Overhead Press',
  'fw-db-shoulder-press': 'Dumbbell Shoulder Press',
  'fw-lateral-raise': 'Lateral Raise',
  'fw-front-raise': 'Front Raise',
  'fw-rear-delt-fly': 'Reverse Fly',
  'fw-shrug': 'Shrugs',

  // Arm exercises
  'fw-barbell-curl': 'Barbell Curl',
  'fw-db-curl': 'Dumbbell Curl',
  'fw-hammer-curl': 'Hammer Curl',
  'fw-preacher-curl': 'Preacher Curl',
  'fw-skull-crusher': 'Skull Crusher',
  'fw-close-grip-bench': 'Close-Grip Bench Press',
  'fw-tricep-kickback': 'Tricep Kickback',

  // Leg exercises
  'bw-squat': 'Bodyweight Squat',
  'bw-lunge': 'Lunge',
  'bw-bulgarian-split': 'Bulgarian Split Squat',
  'bw-calf-raise': 'Standing Calf Raise',
  'bw-glute-bridge': 'Glute Bridge',
  'fw-squat': 'Barbell Squat',
  'fw-front-squat': 'Front Squat',
  'fw-leg-press': 'Leg Press',
  'fw-romanian-dl': 'Romanian Deadlift',
  'fw-leg-curl': 'Leg Curl',
  'fw-leg-extension': 'Leg Extension',
  'fw-hip-thrust': 'Hip Thrust',
  'fw-calf-raise': 'Standing Calf Raise',
  'fw-good-morning': 'Good Morning',

  // Core exercises
  'bw-plank': 'Plank',
  'bw-hollow-hold': 'Hollow Hold',
  'bw-hanging-leg-raise': 'Hanging Leg Raise',

  // Kettlebell exercises
  'kb-swing': 'Kettlebell Swing',
  'kb-goblet-squat': 'Goblet Squat',
  'kb-row': 'Kettlebell Row',
  'kb-deadlift': 'Kettlebell Deadlift',
  'kb-press': 'Kettlebell Press',
  'kb-snatch': 'Kettlebell Snatch',
  'kb-turkish-getup': 'Turkish Get-up',
};

function findBestWgerMatch(
  musclemapExercise: { id: string; name: string },
  wgerExercises: WgerExerciseInfo[]
): {
  wgerExercise: WgerExerciseInfo | null;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  matchReason: string;
} {
  const normalizedMuscleMap = normalizeExerciseName(musclemapExercise.name);

  // Check manual mapping first
  const manualMatch = MANUAL_MAPPINGS[musclemapExercise.id];
  if (manualMatch) {
    const wger = wgerExercises.find(e =>
      e.translations.some(t =>
        t.language === 2 && // English
        t.name.toLowerCase() === manualMatch.toLowerCase()
      )
    );
    if (wger) {
      return {
        wgerExercise: wger,
        confidence: 'exact',
        matchReason: `Manual mapping: "${manualMatch}"`
      };
    }
  }

  // Try exact name match
  const exactMatch = wgerExercises.find(e =>
    e.translations.some(t =>
      t.language === 2 &&
      normalizeExerciseName(t.name) === normalizedMuscleMap
    )
  );
  if (exactMatch) {
    return {
      wgerExercise: exactMatch,
      confidence: 'exact',
      matchReason: 'Exact name match'
    };
  }

  // Try fuzzy matching
  let bestMatch: WgerExerciseInfo | null = null;
  let bestScore = 0;
  let bestName = '';

  for (const wger of wgerExercises) {
    for (const translation of wger.translations || []) {
      if (translation.language !== 2) continue; // English only

      const normalizedWger = normalizeExerciseName(translation.name);
      const score = stringSimilarity(normalizedMuscleMap, normalizedWger);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = wger;
        bestName = translation.name;
      }
    }
  }

  if (bestScore >= 0.8) {
    return {
      wgerExercise: bestMatch,
      confidence: 'high',
      matchReason: `High similarity (${(bestScore * 100).toFixed(0)}%): "${bestName}"`
    };
  } else if (bestScore >= 0.6) {
    return {
      wgerExercise: bestMatch,
      confidence: 'medium',
      matchReason: `Medium similarity (${(bestScore * 100).toFixed(0)}%): "${bestName}"`
    };
  } else if (bestScore >= 0.4) {
    return {
      wgerExercise: bestMatch,
      confidence: 'low',
      matchReason: `Low similarity (${(bestScore * 100).toFixed(0)}%): "${bestName}"`
    };
  }

  return {
    wgerExercise: null,
    confidence: 'none',
    matchReason: 'No match found'
  };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function getMusclemaExercises(): Promise<{ id: string; name: string }[]> {
  // This reads from the seed file to get our exercise list
  // In production, this would query the database
  const seedPath = path.join(process.cwd(), 'apps/api/src/db/seed.ts');
  const seedContent = fs.readFileSync(seedPath, 'utf-8');

  // Extract exercises array using regex
  const exercisesMatch = seedContent.match(/const exercises = \[([\s\S]*?)\];/);
  if (!exercisesMatch) {
    console.error('Could not parse exercises from seed file');
    return [];
  }

  // Parse exercise objects
  const exercises: { id: string; name: string }[] = [];
  const objectRegex = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = objectRegex.exec(exercisesMatch[1])) !== null) {
    exercises.push({ id: match[1], name: match[2] });
  }

  // Also check the specialized exercise seed files
  const seedFiles = [
    'apps/api/src/db/seeds/climbing-gymnastics-exercises.ts',
    'apps/api/src/db/seeds/olympic-wrestling-exercises.ts',
    'apps/api/src/db/seeds/circus-aerial-exercises.ts',
  ];

  for (const seedFile of seedFiles) {
    const filePath = path.join(process.cwd(), seedFile);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    let match;
    while ((match = objectRegex.exec(content)) !== null) {
      exercises.push({ id: match[1], name: match[2] });
    }
  }

  return exercises;
}

async function generateMappings(): Promise<ExerciseMapping[]> {
  console.log('Generating exercise mappings...\n');

  // Load cached wger data
  const wgerExercises = loadCacheFile<WgerExerciseInfo[]>('exercises.json');
  if (!wgerExercises) {
    console.error('No cached wger data found. Run with --fetch first.');
    process.exit(1);
  }

  // Get our exercises
  const musclemapExercises = await getMusclemaExercises();
  console.log(`Found ${musclemapExercises.length} MuscleMap exercises`);
  console.log(`Found ${wgerExercises.length} wger exercises`);

  // Generate mappings
  const mappings: ExerciseMapping[] = [];

  for (const exercise of musclemapExercises) {
    const { wgerExercise, confidence, matchReason } = findBestWgerMatch(exercise, wgerExercises);

    // Find the main image
    let imageUrl: string | null = null;
    let imageLicense: string | null = null;
    let imageAuthor: string | null = null;

    if (wgerExercise && wgerExercise.images.length > 0) {
      const mainImage = wgerExercise.images.find(img => img.is_main) || wgerExercise.images[0];
      imageUrl = mainImage.image;
      imageLicense = 'CC-BY-SA'; // wger uses CC-BY-SA for all images
      imageAuthor = mainImage.license_author;
    }

    mappings.push({
      musclemapId: exercise.id,
      musclemapName: exercise.name,
      wgerId: wgerExercise?.id || null,
      wgerUuid: wgerExercise?.uuid || null,
      wgerName: wgerExercise?.translations.find(t => t.language === 2)?.name || null,
      imageUrl,
      imageLicense,
      imageAuthor,
      confidence,
      matchReason,
    });
  }

  // Sort by confidence level
  const order = ['exact', 'high', 'medium', 'low', 'none'];
  mappings.sort((a, b) => order.indexOf(a.confidence) - order.indexOf(b.confidence));

  return mappings;
}

function printMappingStats(mappings: ExerciseMapping[]): void {
  const stats = {
    exact: mappings.filter(m => m.confidence === 'exact').length,
    high: mappings.filter(m => m.confidence === 'high').length,
    medium: mappings.filter(m => m.confidence === 'medium').length,
    low: mappings.filter(m => m.confidence === 'low').length,
    none: mappings.filter(m => m.confidence === 'none').length,
  };

  const withImages = mappings.filter(m => m.imageUrl).length;

  console.log('\n=== MAPPING STATISTICS ===');
  console.log(`Total exercises: ${mappings.length}`);
  console.log(`With images: ${withImages} (${(withImages / mappings.length * 100).toFixed(1)}%)`);
  console.log(`\nConfidence breakdown:`);
  console.log(`  Exact:  ${stats.exact} (${(stats.exact / mappings.length * 100).toFixed(1)}%)`);
  console.log(`  High:   ${stats.high} (${(stats.high / mappings.length * 100).toFixed(1)}%)`);
  console.log(`  Medium: ${stats.medium} (${(stats.medium / mappings.length * 100).toFixed(1)}%)`);
  console.log(`  Low:    ${stats.low} (${(stats.low / mappings.length * 100).toFixed(1)}%)`);
  console.log(`  None:   ${stats.none} (${(stats.none / mappings.length * 100).toFixed(1)}%)`);
}

function generateSqlUpdates(mappings: ExerciseMapping[]): string {
  const validMappings = mappings.filter(m =>
    m.imageUrl && (m.confidence === 'exact' || m.confidence === 'high')
  );

  let sql = `-- wger.de Exercise Image Updates
-- Generated: ${new Date().toISOString()}
-- Total updates: ${validMappings.length}
-- Note: Only exact and high confidence matches are included

BEGIN;

`;

  for (const mapping of validMappings) {
    sql += `-- ${mapping.musclemapName} -> ${mapping.wgerName} (${mapping.confidence})
UPDATE exercises SET
  image_url = '${mapping.imageUrl}',
  wger_id = ${mapping.wgerId},
  wger_uuid = '${mapping.wgerUuid}',
  image_license = '${mapping.imageLicense || 'CC-BY-SA'}',
  image_author = '${(mapping.imageAuthor || 'Everkinetic').replace(/'/g, "''")}'
WHERE id = '${mapping.musclemapId}';

`;
  }

  sql += 'COMMIT;\n';

  return sql;
}

// ============================================
// MAIN CLI
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
wger.de Exercise Image Integration

Usage:
  npx tsx scripts/wger-exercise-images.ts [options]

Options:
  --fetch    Fetch all wger data to local cache
  --map      Generate exercise mappings and show statistics
  --sql      Generate SQL update statements
  --all      Fetch, map, and generate SQL
  --status   Show current cache status
  --help     Show this help message

Examples:
  # First time setup
  npx tsx scripts/wger-exercise-images.ts --fetch
  npx tsx scripts/wger-exercise-images.ts --map
  npx tsx scripts/wger-exercise-images.ts --sql > update-images.sql

  # Do everything at once
  npx tsx scripts/wger-exercise-images.ts --all
`);
    return;
  }

  if (args.includes('--status')) {
    const exercises = loadCacheFile<WgerExerciseInfo[]>('exercises.json');
    const mappings = loadCacheFile<ExerciseMapping[]>('mappings.json');

    console.log('=== CACHE STATUS ===');
    console.log(`Cache directory: ${CACHE_DIR}`);
    console.log(`wger exercises: ${exercises ? exercises.length : 'not cached'}`);
    console.log(`Mappings: ${mappings ? mappings.length : 'not generated'}`);

    if (mappings) {
      printMappingStats(mappings);
    }
    return;
  }

  if (args.includes('--fetch') || args.includes('--all')) {
    const exercises = await fetchAllWgerExercises();
    saveCacheFile('exercises.json', exercises);

    // Extract images separately for easier processing
    const allImages: WgerImage[] = [];
    for (const exercise of exercises) {
      allImages.push(...exercise.images);
    }
    saveCacheFile('images.json', allImages);
    console.log(`Extracted ${allImages.length} images`);
  }

  if (args.includes('--map') || args.includes('--all')) {
    const mappings = await generateMappings();
    saveCacheFile('mappings.json', mappings);
    printMappingStats(mappings);

    // Print some examples
    console.log('\n=== SAMPLE MAPPINGS ===');
    const samples = mappings.slice(0, 10);
    for (const m of samples) {
      console.log(`${m.confidence.padEnd(6)} | ${m.musclemapName.padEnd(25)} -> ${m.wgerName || 'NO MATCH'}`);
      if (m.imageUrl) {
        console.log(`         Image: ${m.imageUrl}`);
      }
    }

    // Print unmatched exercises
    const unmatched = mappings.filter(m => m.confidence === 'none');
    if (unmatched.length > 0) {
      console.log('\n=== UNMATCHED EXERCISES ===');
      for (const m of unmatched.slice(0, 20)) {
        console.log(`  - ${m.musclemapName}`);
      }
      if (unmatched.length > 20) {
        console.log(`  ... and ${unmatched.length - 20} more`);
      }
    }
  }

  if (args.includes('--sql') || args.includes('--all')) {
    const mappings = loadCacheFile<ExerciseMapping[]>('mappings.json');
    if (!mappings) {
      console.error('No mappings found. Run with --map first.');
      process.exit(1);
    }

    const sql = generateSqlUpdates(mappings);
    const sqlPath = path.join(CACHE_DIR, 'update-images.sql');
    fs.writeFileSync(sqlPath, sql);
    console.log(`\nGenerated SQL: ${sqlPath}`);

    // Also output to stdout if explicitly requested
    if (args.includes('--sql') && !args.includes('--all')) {
      console.log('\n' + sql);
    }
  }
}

main().catch(console.error);
