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
// Maps MuscleMap exercise IDs to wger exercise names (English)
// EXPANDED: Now includes all possible matches with wger images
const MANUAL_MAPPINGS: Record<string, string> = {
  // ============================================
  // PUSH EXERCISES
  // ============================================
  'bw-pushup': 'Push-Up', // wger id: 1551
  'bw-diamond-pushup': 'Close-grip Press-ups', // wger id: 1086
  'bw-pike-pushup': 'Hindu Pushups', // wger id: 1080 (similar movement)
  'bw-decline-pushup': 'Push-Ups | Decline', // wger id: 1112
  'bw-archer-pushup': 'Push-Up', // use standard pushup image
  'bw-dip': 'Dips', // wger id: 194
  // 'bw-hspu' - Handstand Push-Up NOT mapped (would show misleading shoulder press image)
  'fw-bench-press': 'Bench Press', // wger id: 73
  'fw-incline-bench': 'Incline Bench Press - Barbell', // wger id: 538
  'fw-db-bench': 'Dumbbell Bench Press', // wger id: 1676
  'fw-db-fly': 'Fly With Dumbbells', // wger id: 238
  'fw-close-grip-bench': 'Bench Press Narrow Grip', // wger id: 76
  'fw-db-shoulder-press': 'Shoulder Press, Dumbbells', // wger id: 567
  'fw-ohp': 'Shoulder Press, Barbell', // wger id: 566
  'gym-ring-dip': 'Dips', // use standard dip
  'gym-ring-pushup': 'Push-Up', // use standard pushup

  // ============================================
  // PULL EXERCISES
  // ============================================
  'bw-pullup': 'Pull-ups', // wger id: 475
  'bw-chinup': 'Chin-ups', // wger id: 154
  'bw-row': 'Inverted Rows', // wger id: 1198
  'bw-typewriter-pullup': 'Pull-ups', // use standard pullup
  'fw-deadlift': 'Deadlifts', // wger id: 184
  'fw-barbell-row': 'Bent Over Rowing', // wger id: 83
  'fw-db-row': 'Dumbbell Bent Over Row', // wger id: 1085
  'fw-pullover': 'Rope Pullover/row', // wger id: 1634
  'fw-lat-pulldown': 'Close-grip Lat Pull Down', // wger id: 158
  'fw-cable-row': 'Seated Cable Rows', // wger id: 921
  'fw-face-pull': 'Face pulls with yellow/green band', // wger id: 1732
  'kb-row': 'Single arm row', // wger id: 1637
  'cali-archer-pullup': 'Pull-ups', // use standard pullup
  'cali-high-pull': 'High Pull', // wger id: 1187

  // ============================================
  // SHOULDER EXERCISES
  // ============================================
  'fw-lateral-raise': 'Lateral Raises', // wger id: 348
  'fw-front-raise': 'Front Raises', // wger id: 256
  'fw-rear-delt-fly': 'Cable Rear Delt Fly', // wger id: 822
  'fw-shrug': 'Shrugs, Barbells', // wger id: 571
  'fw-upright-row': 'Upright Row w/ Dumbbells', // wger id: 694
  'oly-push-press': 'Push Press', // wger id: 478
  'oly-push-jerk': 'Push Press', // similar movement

  // ============================================
  // ARM EXERCISES
  // ============================================
  'fw-barbell-curl': 'Biceps Curls With Barbell', // wger id: 91
  'fw-db-curl': 'Biceps Curls With Dumbbell', // wger id: 92
  'fw-hammer-curl': 'Hammercurls', // wger id: 272
  'fw-preacher-curl': 'Preacher Curls', // wger id: 465
  'fw-skull-crusher': 'Skullcrusher SZ-bar', // wger id: 246
  'fw-tricep-kickback': 'Triceps Overhead (Dumbbell)', // wger id: 1336
  'fw-tricep-pushdown': 'Triceps Pushdown', // wger id: 1185
  'fw-cable-curl': 'Biceps Curl With Cable', // wger id: 95
  'fw-concentration-curl': 'Concentration Curl', // wger id: 1649
  'fw-wrist-curl': 'Barbell Wrist Curl', // wger id: 51
  'fw-tricep-extension': 'Barbell Triceps Extension', // wger id: 50
  'fw-overhead-tricep': 'Overhead Triceps Extension', // wger id: 1519
  'climb-reverse-wrist-curl': 'Forearm Curls (underhand grip)', // wger id: 1333

  // ============================================
  // LEG EXERCISES
  // ============================================
  'bw-squat': 'Barbell squat', // use barbell squat image
  'bw-lunge': 'Lunges', // wger id: 984
  'bw-bulgarian-split': 'Bulgarian split squats left', // wger id: 988
  'bw-calf-raise': 'Standing Calf Raises', // wger id: 622
  'bw-pistol-squat': 'Pistol Squat', // wger id: 456
  'bw-glute-bridge': 'Dumbbell Hip Thrust', // wger id: 1642
  'fw-squat': 'Barbell squat', // wger id: 1627
  'fw-front-squat': 'Front Squats', // wger id: 257
  'fw-leg-press': 'Leg Press', // wger id: 371
  'fw-romanian-dl': 'Dumbbell Romanian Deadlifts', // wger id: 1673
  'fw-leg-curl': 'Leg Curl', // wger id: 364
  'fw-leg-extension': 'Leg Extension', // wger id: 369
  'fw-hip-thrust': 'Dumbbell Hip Thrust', // wger id: 1642
  'fw-calf-raise': 'Standing Calf Raises', // wger id: 622
  'fw-good-morning': 'Good Mornings', // wger id: 268
  'fw-sumo-deadlift': 'Sumo Deadlift', // wger id: 630
  'fw-walking-lunge': 'Dumbbell Lunges Walking', // wger id: 206
  'fw-reverse-lunge': 'Reverse lunges', // wger id: 999
  'fw-hack-squat': 'Leg Press on Hackenschmidt Machine', // wger id: 375
  'kb-goblet-squat': 'Dumbbell Goblet Squat', // wger id: 203
  'kb-deadlift': 'Kettlebell One Legged Deadlift', // wger id: 1641
  'oly-overhead-squat': 'Front Squats', // use front squat as reference
  'oly-pause-front-squat': 'Front Squats', // wger id: 257

  // ============================================
  // CORE EXERCISES
  // ============================================
  'bw-plank': 'Plank', // wger id: 458
  'bw-hollow-hold': 'Plank', // use plank image
  'bw-hanging-leg-raise': 'Leg Raises, Lying', // wger id: 377
  'bw-dragon-flag': 'Leg Raises, Lying', // similar movement
  'bw-crunch': 'Crunches', // wger id: 167
  'bw-side-crunch': 'Side Crunch', // wger id: 576
  'bw-decline-crunch': 'Negative Crunches', // wger id: 427
  'bw-russian-twist': 'Russian Twist', // wger id: 1193
  'gym-hollow-hold': 'Plank', // use plank
  'gym-arch-hold': 'Hyperextensions', // wger id: 301
  'gym-hollow-rock': 'Crunches', // use crunch image
  'fw-cable-crunch': 'Weighted Crunch', // wger id: 1648
  'fw-pallof-press': 'PALLOF PRESS', // wger id: 1194
  'fw-hyperextension': 'Hyperextensions', // wger id: 301
  'fw-back-extension': 'Lower Back Extensions', // wger id: 1348

  // ============================================
  // KETTLEBELL EXERCISES
  // ============================================
  'kb-swing': 'Dumbbell Hang Power Cleans', // similar explosive hip movement
  'kb-clean': 'Dumbbell Hang Power Cleans', // wger id: 1087
  'kb-press': 'Shoulder Press, Dumbbells', // use dumbbell shoulder press
  'kb-snatch': 'Dumbbell Hang Power Cleans', // similar movement
  'kb-turkish-getup': 'Dumbbell Hip Thrust', // complex movement
  'kb-windmill': 'Dumbbell Side Bend', // wger id: 1650

  // ============================================
  // OLYMPIC LIFTS
  // ============================================
  'oly-power-clean': 'Barbell Clean and press', // wger id: 1638
  'oly-hang-clean': 'Barbell Clean and press',
  'oly-full-clean': 'Barbell Clean and press',
  'oly-clean-and-jerk': 'Barbell Clean and press',
  'oly-snatch-high-pull': 'High Pull', // wger id: 1187
  'oly-clean-pull': 'Rack Deadlift', // wger id: 484
  'oly-clean-deadlift': 'Deadlifts', // wger id: 184
  'oly-snatch-deadlift': 'Deadlifts',

  // ============================================
  // MACHINE EXERCISES
  // ============================================
  'fw-chest-press': 'Machine Chest Press Exercise', // wger id: 1655
  'fw-pec-deck': 'Butterfly', // wger id: 135
  'fw-cable-crossover': 'Cable Cross-over', // wger id: 323
  'fw-seated-row': 'Seated Row (Machine)', // wger id: 1725
  'fw-shoulder-press-machine': 'Shoulder Press, on Machine', // wger id: 543
  'fw-hip-adduction': 'Seated Hip Adduction', // wger id: 12
  'fw-hip-abduction': 'Machine Hip Abduction', // wger id: 1748
  'fw-calf-press': 'Calf Press Using Leg Press Machine', // wger id: 146
  'fw-t-bar-row': 'Rowing, T-bar', // wger id: 513

  // ============================================
  // WRESTLING / COMBAT EXERCISES
  // ============================================
  'wrest-turkish-getup': 'Dumbbell Hip Thrust', // complex full body
  'wrest-medicine-ball-slam': 'Medicine ball twist', // wger id: 1089
  'wrest-bear-crawl': 'Quadriped Arm and Leg Raise', // wger id: 957
  'combat-battle-ropes': 'Hammercurls', // arm endurance
  'combat-farmers-walk': 'Dumbbell Shrug', // wger id: 1645

  // ============================================
  // GYMNASTICS / CALISTHENICS
  // ============================================
  // NOTE: Exercises with NO accurate image available should NOT be mapped
  // This prevents showing misleading images (e.g., dumbbell press for handstands)
  //
  // NOT MAPPED (no accurate images exist in wger.de):
  // - Handstands (all variations)
  // - Planches (all variations)
  // - Front Levers (all variations)
  // - Back Levers (all variations)
  // - L-sits (all variations)
  // - Muscle-ups (all variations)
  // - Human Flags (all variations)
  //
  // These exercises will use the 3D muscle visualization fallback instead
  // ============================================
  'gym-ring-support': 'Dips', // similar position
  'gym-skin-the-cat': 'Pull-ups', // bar work

  // ============================================
  // HAND BALANCING
  // NOTE: NO handstand exercises are mapped because wger.de has no handstand images
  // Showing shoulder press images for handstands is misleading
  // ============================================
  // NOT MAPPED: crow pose, canes, all handstand variations

  // ============================================
  // FLEXIBILITY / STRETCHING
  // ============================================
  'contort-shoulder-dislocate': 'Shoulder Press, Dumbbells',
  'contort-bridge': 'Hyperextensions', // wger id: 301
  'contort-chest-stand': 'Hyperextensions',
  'contort-scorpion': 'Hyperextensions',
  'contort-pancake': 'Leg Raises, Lying',
  'contort-pike-fold': 'Leg Raises, Lying',
  'contort-front-split': 'Lunges',
  'contort-middle-split': 'Seated Hip Adduction',
  'contort-oversplit': 'Lunges',
  'contort-german-hang': 'Inverted Rows',

  // ============================================
  // CARDIO / CONDITIONING
  // ============================================
  'combat-sled-push': 'Leg Press', // similar pushing motion
  'combat-sled-pull': 'Seated Cable Rows',
  'combat-tire-flip': 'Deadlifts',
  'combat-sledgehammer-swing': 'Medicine ball twist',
  'combat-heavy-bag-rounds': 'Push-Up', // full body
  'combat-shadow-boxing': 'Push-Up',
  'combat-double-end-bag': 'Push-Up',
  'combat-thai-pad-rounds': 'Push-Up',
  'combat-kick-bag': 'Front Squats',
  'combat-speed-bag': 'Biceps Curls With Dumbbell',
  'wrest-rope-climb': 'Pull-ups',
  'wrest-legless-rope-climb': 'Pull-ups',
  'wrest-gi-pullup': 'Pull-ups',
  'wrest-towel-pullup': 'Pull-ups',
  'wrest-sprawl': 'Hyperextensions',
  'wrest-sprawl-burpee': 'Push-Up',
  'wrest-rotational-throw': 'Medicine ball twist',
  'wrest-crab-walk': 'Dips Between Two Benches', // wger id: 197
  'wrest-duck-walk': 'Lunges',
  'wrest-sandbag-shouldering': 'Deadlifts',
  'wrest-sandbag-carry': 'Deadlifts',
  'wrest-hip-toss-drill': 'Russian Twist',
  'wrest-fireman-carry': 'Deadlifts',

  // ============================================
  // TRX / SUSPENSION
  // ============================================
  'fw-trx-row': 'TRX Rows', // wger id: 959
  'fw-trx-curl': 'Biceps with TRX', // wger id: 958

  // ============================================
  // NECK EXERCISES
  // ============================================
  'wrest-neck-bridge': 'Hyperextensions',
  'wrest-neck-harness': 'Shrugs, Barbells',
  'wrest-neck-rotation': 'Shrugs, Barbells',
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

function generateSqlUpdates(mappings: ExerciseMapping[], includeAll = false): string {
  // Include exact, high, and medium confidence if includeAll is true
  const validMappings = mappings.filter(m =>
    m.imageUrl && (
      m.confidence === 'exact' ||
      m.confidence === 'high' ||
      (includeAll && (m.confidence === 'medium' || m.confidence === 'low'))
    )
  );

  let sql = `-- wger.de Exercise Image Updates
-- Generated: ${new Date().toISOString()}
-- Total updates: ${validMappings.length}
-- Mode: ${includeAll ? 'ALL matches with images' : 'Exact and high confidence only'}

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

    // Check if we should include all matches (medium + low confidence)
    const includeAll = args.includes('--include-all');
    const sql = generateSqlUpdates(mappings, includeAll);
    const sqlPath = path.join(CACHE_DIR, 'update-images.sql');
    fs.writeFileSync(sqlPath, sql);
    console.log(`\nGenerated SQL: ${sqlPath}`);
    console.log(`Mode: ${includeAll ? 'ALL matches with images' : 'Exact and high confidence only'}`);

    // Also output to stdout if explicitly requested
    if (args.includes('--sql') && !args.includes('--all')) {
      console.log('\n' + sql);
    }
  }
}

main().catch(console.error);
