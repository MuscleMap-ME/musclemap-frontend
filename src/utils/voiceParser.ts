/**
 * Smart Voice Parser
 *
 * Parses voice transcriptions into structured workout data using:
 * - Natural language processing patterns
 * - Fuzzy matching with Fuse.js for exercise names
 * - Number word to digit conversion
 * - Unit detection and conversion
 */

import Fuse from 'fuse.js';

// ============================================
// TYPES
// ============================================

export interface ParsedSet {
  weight?: number;
  reps?: number;
  duration?: number;
  setNumber: number;
  unit?: 'lbs' | 'kg';
}

export interface ParsedExercise {
  id: string;
  exerciseName: string;
  matchedExerciseId?: string;
  matchConfidence: number;
  sets: ParsedSet[];
  rawText: string;
}

export interface VoiceParseResult {
  success: boolean;
  exercises: ParsedExercise[];
  warnings: string[];
  unrecognized: string[];
}

// ============================================
// COMMON EXERCISE DATABASE
// ============================================

const COMMON_EXERCISES = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', aliases: ['bench', 'flat bench', 'barbell bench'] },
  { id: 'incline-bench', name: 'Incline Bench Press', aliases: ['incline bench', 'incline press'] },
  { id: 'decline-bench', name: 'Decline Bench Press', aliases: ['decline bench', 'decline press'] },
  { id: 'dumbbell-press', name: 'Dumbbell Press', aliases: ['db press', 'dumbbell bench'] },
  { id: 'chest-fly', name: 'Chest Fly', aliases: ['fly', 'dumbbell fly', 'cable fly', 'pec fly'] },
  { id: 'pushup', name: 'Push-up', aliases: ['push up', 'pushups', 'push ups'] },

  // Back
  { id: 'deadlift', name: 'Deadlift', aliases: ['dead lift', 'dl'] },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', aliases: ['rdl', 'stiff leg deadlift'] },
  { id: 'barbell-row', name: 'Barbell Row', aliases: ['bb row', 'bent over row', 'pendlay row'] },
  { id: 'lat-pulldown', name: 'Lat Pulldown', aliases: ['pulldown', 'lat pull', 'cable pulldown'] },
  { id: 'pull-up', name: 'Pull-up', aliases: ['pullup', 'pull ups', 'pullups', 'chin up', 'chinup'] },
  { id: 'seated-row', name: 'Seated Row', aliases: ['cable row', 'seated cable row'] },

  // Legs
  { id: 'squat', name: 'Squat', aliases: ['back squat', 'barbell squat', 'bb squat'] },
  { id: 'front-squat', name: 'Front Squat', aliases: ['front sq'] },
  { id: 'leg-press', name: 'Leg Press', aliases: ['lp'] },
  { id: 'leg-curl', name: 'Leg Curl', aliases: ['hamstring curl', 'lying leg curl'] },
  { id: 'leg-extension', name: 'Leg Extension', aliases: ['quad extension'] },
  { id: 'lunge', name: 'Lunge', aliases: ['lunges', 'walking lunge'] },
  { id: 'calf-raise', name: 'Calf Raise', aliases: ['calf raises', 'calves', 'standing calf'] },

  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', aliases: ['ohp', 'shoulder press', 'military press', 'strict press'] },
  { id: 'lateral-raise', name: 'Lateral Raise', aliases: ['side raise', 'lateral raises', 'side lateral'] },
  { id: 'front-raise', name: 'Front Raise', aliases: ['front raises'] },
  { id: 'face-pull', name: 'Face Pull', aliases: ['face pulls'] },
  { id: 'shrug', name: 'Shrug', aliases: ['shrugs', 'barbell shrug', 'dumbbell shrug'] },

  // Arms
  { id: 'bicep-curl', name: 'Bicep Curl', aliases: ['curl', 'curls', 'barbell curl', 'dumbbell curl', 'biceps'] },
  { id: 'hammer-curl', name: 'Hammer Curl', aliases: ['hammer curls'] },
  { id: 'preacher-curl', name: 'Preacher Curl', aliases: ['preacher curls'] },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', aliases: ['pushdown', 'cable pushdown', 'triceps'] },
  { id: 'tricep-extension', name: 'Tricep Extension', aliases: ['skull crusher', 'skull crushers', 'overhead tricep'] },
  { id: 'dip', name: 'Dip', aliases: ['dips', 'tricep dip', 'tricep dips'] },

  // Core
  { id: 'plank', name: 'Plank', aliases: ['planks'] },
  { id: 'crunch', name: 'Crunch', aliases: ['crunches', 'ab crunch'] },
  { id: 'leg-raise', name: 'Leg Raise', aliases: ['leg raises', 'hanging leg raise'] },
  { id: 'russian-twist', name: 'Russian Twist', aliases: ['russian twists'] },
  { id: 'ab-rollout', name: 'Ab Rollout', aliases: ['ab wheel', 'wheel rollout'] },
];

// Flatten for searching
const SEARCHABLE_EXERCISES = COMMON_EXERCISES.flatMap((ex) => [
  { id: ex.id, name: ex.name, searchName: ex.name },
  ...ex.aliases.map((alias) => ({ id: ex.id, name: ex.name, searchName: alias })),
]);

// Initialize Fuse for fuzzy search
const exerciseFuse = new Fuse(SEARCHABLE_EXERCISES, {
  keys: ['searchName'],
  threshold: 0.4, // Lower = stricter matching
  includeScore: true,
  minMatchCharLength: 2,
});

// ============================================
// NUMBER WORD CONVERSION
// ============================================

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/**
 * Convert number words to digits
 * "one thirty five" → "135"
 * "twenty five" → "25"
 */
export function convertNumberWords(text: string): string {
  let result = text.toLowerCase();

  // Handle compound numbers like "one thirty five" (135)
  result = result.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+(hundred)(?:\s+(?:and\s+)?(\w+))?(?:\s+(\w+))?/gi,
    (_, hundreds, _hundred, tens, ones) => {
      let num = NUMBER_WORDS[hundreds.toLowerCase()] * 100;
      if (tens) {
        if (NUMBER_WORDS[tens.toLowerCase()] !== undefined) {
          num += NUMBER_WORDS[tens.toLowerCase()];
        }
      }
      if (ones && NUMBER_WORDS[ones.toLowerCase()] !== undefined) {
        num += NUMBER_WORDS[ones.toLowerCase()];
      }
      return String(num);
    }
  );

  // Handle simple compound numbers like "twenty five" → 25
  result = result.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]+(one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (_, tens, ones) => {
      return String(NUMBER_WORDS[tens.toLowerCase()] + NUMBER_WORDS[ones.toLowerCase()]);
    }
  );

  // Replace standalone number words
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(num));
  }

  return result;
}

// ============================================
// UNIT DETECTION
// ============================================

/**
 * Detect and normalize weight units
 */
export function normalizeUnits(text: string): { text: string; defaultUnit: 'lbs' | 'kg' } {
  let normalized = text.toLowerCase();
  let defaultUnit: 'lbs' | 'kg' = 'lbs'; // Default to pounds

  // Detect metric units mentioned
  if (/\b(kg|kilo|kilos|kilogram|kilograms)\b/.test(normalized)) {
    defaultUnit = 'kg';
  }

  // Normalize unit names
  normalized = normalized
    .replace(/\b(pound|pounds|lb)\b/gi, 'lbs')
    .replace(/\b(kilogram|kilograms|kilo|kilos)\b/gi, 'kg');

  return { text: normalized, defaultUnit };
}

// ============================================
// PATTERN MATCHING
// ============================================

// Patterns for parsing workout mentions
const PATTERNS = {
  // "bench press 185 for 8" or "bench 185 pounds 8 reps"
  exerciseWeightReps: /([a-zA-Z][a-zA-Z\s-]+?)\s+(\d+(?:\.\d+)?)\s*(?:lbs?|kg|pounds?)?\s*(?:for|x|×|,|:)?\s*(\d+)\s*(?:reps?)?/gi,

  // "3 sets of 10 at 135" or "3 x 10 @ 135"
  setsRepsWeight: /(\d+)\s*(?:sets?|x)?\s*(?:of|x|×)?\s*(\d+)\s*(?:reps?)?\s*(?:at|@|with)?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?/gi,

  // "bench press 3 sets" followed by individual sets
  exerciseSets: /([a-zA-Z][a-zA-Z\s-]+?)\s+(\d+)\s*sets?/gi,

  // "185 x 8" or "185 times 8"
  weightTimesReps: /(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*(?:x|×|times|by)\s*(\d+)/gi,

  // "8 reps at 185" or "8 at 185"
  repsAtWeight: /(\d+)\s*(?:reps?)?\s*(?:at|@|with)\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?/gi,

  // "did 10 pullups" or "10 pushups"
  bodyweightExercise: /(?:did\s+)?(\d+)\s+([a-zA-Z][a-zA-Z\s-]+s)/gi,
};

// ============================================
// EXERCISE MATCHING
// ============================================

/**
 * Find best matching exercise using fuzzy search
 */
export function findExercise(text: string): {
  id: string;
  name: string;
  confidence: number;
} | null {
  const results = exerciseFuse.search(text.trim());

  if (results.length === 0) {
    return null;
  }

  const best = results[0];
  const confidence = best.score !== undefined ? 1 - best.score : 0.5;

  return {
    id: best.item.id,
    name: best.item.name,
    confidence,
  };
}

// ============================================
// MAIN PARSER
// ============================================

/**
 * Parse voice transcription into structured workout data
 */
export function parseVoiceInput(transcript: string): VoiceParseResult {
  const exercises: ParsedExercise[] = [];
  const warnings: string[] = [];
  const unrecognized: string[] = [];

  // Pre-process text
  let processed = convertNumberWords(transcript);
  const { text: normalizedText, defaultUnit } = normalizeUnits(processed);
  processed = normalizedText;

  // Split into sentences/phrases
  const phrases = processed.split(/[.!?;]|\band\b|\bthen\b/).filter((p) => p.trim());

  for (const phrase of phrases) {
    let matched = false;

    // Try pattern: "exercise weight for reps"
    const exerciseMatches = [...phrase.matchAll(PATTERNS.exerciseWeightReps)];
    for (const match of exerciseMatches) {
      const exerciseText = match[1].trim();
      const weight = parseFloat(match[2]);
      const reps = parseInt(match[3], 10);

      const exerciseMatch = findExercise(exerciseText);
      if (exerciseMatch) {
        exercises.push({
          id: Math.random().toString(36).substring(2, 9),
          exerciseName: exerciseMatch.name,
          matchedExerciseId: exerciseMatch.id,
          matchConfidence: exerciseMatch.confidence,
          sets: [{ weight, reps, setNumber: 1, unit: defaultUnit }],
          rawText: match[0],
        });
        matched = true;
      }
    }

    // Try pattern: "sets x reps @ weight"
    const setsMatches = [...phrase.matchAll(PATTERNS.setsRepsWeight)];
    for (const match of setsMatches) {
      const setCount = parseInt(match[1], 10);
      const reps = parseInt(match[2], 10);
      const weight = parseFloat(match[3]);

      // Find exercise name in phrase (before the pattern)
      const beforeMatch = phrase.substring(0, phrase.indexOf(match[0])).trim();
      const exerciseMatch = findExercise(beforeMatch);

      if (exerciseMatch) {
        const sets: ParsedSet[] = [];
        for (let i = 0; i < setCount; i++) {
          sets.push({ weight, reps, setNumber: i + 1, unit: defaultUnit });
        }

        exercises.push({
          id: Math.random().toString(36).substring(2, 9),
          exerciseName: exerciseMatch.name,
          matchedExerciseId: exerciseMatch.id,
          matchConfidence: exerciseMatch.confidence,
          sets,
          rawText: phrase.trim(),
        });
        matched = true;
      }
    }

    // Try pattern: "weight x reps"
    if (!matched) {
      const weightRepsMatches = [...phrase.matchAll(PATTERNS.weightTimesReps)];
      for (const match of weightRepsMatches) {
        const weight = parseFloat(match[1]);
        const reps = parseInt(match[2], 10);

        // Find exercise name in phrase
        const phraseWithoutMatch = phrase.replace(match[0], '').trim();
        const exerciseMatch = findExercise(phraseWithoutMatch);

        if (exerciseMatch) {
          exercises.push({
            id: Math.random().toString(36).substring(2, 9),
            exerciseName: exerciseMatch.name,
            matchedExerciseId: exerciseMatch.id,
            matchConfidence: exerciseMatch.confidence,
            sets: [{ weight, reps, setNumber: 1, unit: defaultUnit }],
            rawText: phrase.trim(),
          });
          matched = true;
        }
      }
    }

    // Try pattern: bodyweight exercise
    if (!matched) {
      const bodyweightMatches = [...phrase.matchAll(PATTERNS.bodyweightExercise)];
      for (const match of bodyweightMatches) {
        const reps = parseInt(match[1], 10);
        const exerciseText = match[2].trim();

        const exerciseMatch = findExercise(exerciseText);
        if (exerciseMatch) {
          exercises.push({
            id: Math.random().toString(36).substring(2, 9),
            exerciseName: exerciseMatch.name,
            matchedExerciseId: exerciseMatch.id,
            matchConfidence: exerciseMatch.confidence,
            sets: [{ reps, setNumber: 1 }],
            rawText: match[0],
          });
          matched = true;
        }
      }
    }

    // Track unrecognized phrases
    if (!matched && phrase.trim().length > 3) {
      const cleaned = phrase.trim().replace(/\s+/g, ' ');
      if (cleaned.length > 0 && !/^\d+$/.test(cleaned)) {
        unrecognized.push(cleaned);
      }
    }
  }

  // Merge consecutive sets for same exercise
  const mergedExercises: ParsedExercise[] = [];
  for (const exercise of exercises) {
    const existing = mergedExercises.find(
      (e) => e.exerciseName.toLowerCase() === exercise.exerciseName.toLowerCase()
    );

    if (existing) {
      const newSetNumber = existing.sets.length + 1;
      for (const set of exercise.sets) {
        existing.sets.push({ ...set, setNumber: newSetNumber + existing.sets.indexOf(set) });
      }
      // Renumber
      existing.sets.forEach((set, idx) => {
        set.setNumber = idx + 1;
      });
    } else {
      mergedExercises.push(exercise);
    }
  }

  // Add warnings for low confidence matches
  for (const exercise of mergedExercises) {
    if (exercise.matchConfidence < 0.7) {
      warnings.push(
        `"${exercise.rawText}" matched to "${exercise.exerciseName}" with ${Math.round(
          exercise.matchConfidence * 100
        )}% confidence - please verify`
      );
    }
  }

  // Add warning for unrecognized phrases
  if (unrecognized.length > 0) {
    warnings.push(
      `Could not parse: ${unrecognized.slice(0, 3).join(', ')}${
        unrecognized.length > 3 ? ` and ${unrecognized.length - 3} more` : ''
      }`
    );
  }

  return {
    success: mergedExercises.length > 0,
    exercises: mergedExercises,
    warnings,
    unrecognized,
  };
}

/**
 * Add custom exercises to the search index
 */
export function addCustomExercise(id: string, name: string, aliases: string[] = []): void {
  const entries = [
    { id, name, searchName: name },
    ...aliases.map((alias) => ({ id, name, searchName: alias })),
  ];

  SEARCHABLE_EXERCISES.push(...entries);

  // Rebuild fuse index (unfortunately no way to add incrementally)
  exerciseFuse.setCollection(SEARCHABLE_EXERCISES);
}

/**
 * Get all registered exercises
 */
export function getExerciseList(): Array<{ id: string; name: string }> {
  return COMMON_EXERCISES.map((e) => ({ id: e.id, name: e.name }));
}

export default {
  parseVoiceInput,
  findExercise,
  convertNumberWords,
  normalizeUnits,
  addCustomExercise,
  getExerciseList,
};
