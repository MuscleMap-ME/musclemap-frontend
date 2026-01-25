/**
 * Duplicate Detection Utility
 *
 * Detects potential duplicate exercises and sets during workout import.
 * Uses multiple strategies:
 * - Exact matching (same exercise, weight, reps)
 * - Fuzzy name matching (typos, abbreviations)
 * - Time-based detection (workouts within same time window)
 */

// ============================================
// TYPES
// ============================================

export interface SetData {
  weight?: number;
  reps?: number;
  duration?: number;
  setNumber: number;
}

export interface ExerciseData {
  id?: string;
  exerciseName: string;
  exerciseId?: string;
  sets: SetData[];
}

export interface DuplicateResult {
  type: 'exact' | 'similar' | 'potential';
  confidence: number; // 0-1
  originalIndex: number;
  duplicateIndex: number;
  reason: string;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: DuplicateResult[];
  suggestions: string[];
}

// ============================================
// STRING SIMILARITY (Levenshtein-based)
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity (0-1, where 1 is identical)
 */
export function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 1;
  if (aLower.length === 0 || bLower.length === 0) return 0;

  const maxLength = Math.max(aLower.length, bLower.length);
  const distance = levenshteinDistance(aLower, bLower);

  return (maxLength - distance) / maxLength;
}

// ============================================
// EXERCISE NAME NORMALIZATION
// ============================================

/**
 * Common exercise name abbreviations and aliases
 */
const EXERCISE_ALIASES: Record<string, string[]> = {
  'bench press': ['bp', 'bench', 'flat bench', 'barbell bench'],
  'incline bench press': ['incline bench', 'incline bp', 'incline press'],
  'decline bench press': ['decline bench', 'decline bp', 'decline press'],
  'squat': ['back squat', 'bb squat', 'barbell squat'],
  'deadlift': ['dl', 'dead', 'conventional deadlift'],
  'romanian deadlift': ['rdl', 'romanian dl', 'stiff leg dl'],
  'overhead press': ['ohp', 'shoulder press', 'military press', 'strict press'],
  'barbell row': ['bb row', 'bent over row', 'pendlay row'],
  'pull up': ['pullup', 'pull-up', 'chin up', 'chinup'],
  'lat pulldown': ['pulldown', 'lat pull', 'cable pulldown'],
  'bicep curl': ['curls', 'bb curl', 'barbell curl', 'biceps'],
  'tricep extension': ['triceps', 'skull crusher', 'skullcrusher'],
  'leg press': ['lp', 'leg machine'],
  'leg curl': ['hamstring curl', 'lying leg curl'],
  'leg extension': ['quad extension', 'knee extension'],
  'calf raise': ['calf raises', 'calves', 'standing calf'],
  'lateral raise': ['side raise', 'side lateral', 'db lateral'],
};

/**
 * Normalize exercise name for comparison
 */
export function normalizeExerciseName(name: string): string {
  const lower = name.toLowerCase().trim();

  // Check for exact alias match
  for (const [canonical, aliases] of Object.entries(EXERCISE_ALIASES)) {
    if (aliases.includes(lower) || canonical === lower) {
      return canonical;
    }
  }

  // Remove common modifiers for comparison
  return lower
    .replace(/\b(barbell|dumbbell|bb|db|cable|machine|ez|smith)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================
// SET COMPARISON
// ============================================

/**
 * Check if two sets are effectively the same
 */
export function areSetsEqual(a: SetData, b: SetData): boolean {
  // Compare weight (within 5% tolerance for floating point)
  const weightTolerance = 0.05;
  const weightEqual =
    (!a.weight && !b.weight) ||
    (a.weight !== undefined &&
      b.weight !== undefined &&
      Math.abs(a.weight - b.weight) / Math.max(a.weight, b.weight, 1) <= weightTolerance);

  // Compare reps (exact match)
  const repsEqual = a.reps === b.reps;

  // Compare duration (within 10% tolerance)
  const durationTolerance = 0.1;
  const durationEqual =
    (!a.duration && !b.duration) ||
    (a.duration !== undefined &&
      b.duration !== undefined &&
      Math.abs(a.duration - b.duration) / Math.max(a.duration, b.duration, 1) <= durationTolerance);

  return weightEqual && repsEqual && durationEqual;
}

/**
 * Calculate similarity between two set arrays
 */
export function setsSimilarity(a: SetData[], b: SetData[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0.5; // Different set counts

  let matchingCount = 0;
  for (let i = 0; i < a.length; i++) {
    if (areSetsEqual(a[i], b[i])) {
      matchingCount++;
    }
  }

  return matchingCount / a.length;
}

// ============================================
// EXERCISE COMPARISON
// ============================================

/**
 * Check if two exercises are duplicates
 */
export function areExercisesDuplicate(
  a: ExerciseData,
  b: ExerciseData,
  threshold: number = 0.8
): {
  isDuplicate: boolean;
  confidence: number;
  type: 'exact' | 'similar' | 'potential' | 'none';
  reason: string;
} {
  const normalizedA = normalizeExerciseName(a.exerciseName);
  const normalizedB = normalizeExerciseName(b.exerciseName);

  // Check normalized name match
  if (normalizedA === normalizedB) {
    const setsMatch = setsSimilarity(a.sets, b.sets);

    if (setsMatch === 1) {
      return {
        isDuplicate: true,
        confidence: 1,
        type: 'exact',
        reason: `Exact duplicate: ${a.exerciseName} with identical sets`,
      };
    }

    if (setsMatch >= 0.8) {
      return {
        isDuplicate: true,
        confidence: 0.9,
        type: 'similar',
        reason: `Same exercise with similar sets (${Math.round(setsMatch * 100)}% match)`,
      };
    }

    return {
      isDuplicate: false,
      confidence: setsMatch * 0.5,
      type: 'none',
      reason: 'Same exercise but different sets',
    };
  }

  // Check string similarity for fuzzy matching
  const nameSimilarity = stringSimilarity(normalizedA, normalizedB);

  if (nameSimilarity >= threshold) {
    const setsMatch = setsSimilarity(a.sets, b.sets);

    if (setsMatch >= 0.8) {
      return {
        isDuplicate: true,
        confidence: nameSimilarity * 0.9,
        type: 'potential',
        reason: `Possible duplicate: "${a.exerciseName}" similar to "${b.exerciseName}" (${Math.round(nameSimilarity * 100)}% name match)`,
      };
    }
  }

  return {
    isDuplicate: false,
    confidence: nameSimilarity * 0.3,
    type: 'none',
    reason: '',
  };
}

// ============================================
// MAIN DETECTION FUNCTIONS
// ============================================

/**
 * Check a list of exercises for duplicates
 */
export function detectDuplicates(
  exercises: ExerciseData[],
  options: {
    threshold?: number;
    checkSets?: boolean;
  } = {}
): DuplicateCheckResult {
  const { threshold = 0.8, checkSets = true } = options;
  const duplicates: DuplicateResult[] = [];
  const suggestions: string[] = [];

  // Compare each pair of exercises
  for (let i = 0; i < exercises.length; i++) {
    for (let j = i + 1; j < exercises.length; j++) {
      const result = areExercisesDuplicate(exercises[i], exercises[j], threshold);

      if (result.isDuplicate) {
        duplicates.push({
          type: result.type as 'exact' | 'similar' | 'potential',
          confidence: result.confidence,
          originalIndex: i,
          duplicateIndex: j,
          reason: result.reason,
        });
      }
    }
  }

  // Generate suggestions
  if (duplicates.length > 0) {
    const exactDupes = duplicates.filter((d) => d.type === 'exact');
    const similarDupes = duplicates.filter((d) => d.type === 'similar');
    const potentialDupes = duplicates.filter((d) => d.type === 'potential');

    if (exactDupes.length > 0) {
      suggestions.push(`Found ${exactDupes.length} exact duplicate(s) - these can be safely merged.`);
    }

    if (similarDupes.length > 0) {
      suggestions.push(
        `Found ${similarDupes.length} similar exercise(s) with different sets - review before merging.`
      );
    }

    if (potentialDupes.length > 0) {
      suggestions.push(
        `Found ${potentialDupes.length} potential duplicate(s) due to similar names - please verify.`
      );
    }
  }

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
    suggestions,
  };
}

/**
 * Remove exact duplicates from exercise list
 */
export function removeDuplicates(exercises: ExerciseData[]): ExerciseData[] {
  const result: ExerciseData[] = [];
  const seen = new Map<string, boolean>();

  for (const exercise of exercises) {
    // Create a hash key for exact matching
    const normalizedName = normalizeExerciseName(exercise.exerciseName);
    const setsHash = exercise.sets
      .map((s) => `${s.weight || 0}-${s.reps || 0}-${s.duration || 0}`)
      .join('|');
    const key = `${normalizedName}::${setsHash}`;

    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(exercise);
    }
  }

  return result;
}

/**
 * Merge similar exercises (same name, combine sets)
 */
export function mergeSimilarExercises(exercises: ExerciseData[]): ExerciseData[] {
  const merged = new Map<string, ExerciseData>();

  for (const exercise of exercises) {
    const normalizedName = normalizeExerciseName(exercise.exerciseName);

    if (merged.has(normalizedName)) {
      // Merge sets
      const existing = merged.get(normalizedName)!;
      const newSetNumber = existing.sets.length + 1;

      for (const set of exercise.sets) {
        existing.sets.push({
          ...set,
          setNumber: newSetNumber + existing.sets.indexOf(set),
        });
      }

      // Renumber sets
      existing.sets.forEach((set, index) => {
        set.setNumber = index + 1;
      });
    } else {
      merged.set(normalizedName, {
        ...exercise,
        sets: [...exercise.sets],
      });
    }
  }

  return Array.from(merged.values());
}

// ============================================
// RECENT WORKOUT COMPARISON
// ============================================

/**
 * Check if an exercise was already logged today/recently
 */
export function checkRecentWorkouts(
  newExercise: ExerciseData,
  recentWorkouts: Array<{
    date: string;
    exercises: ExerciseData[];
  }>,
  options: {
    sameDay?: boolean;
    withinHours?: number;
  } = {}
): {
  isDuplicate: boolean;
  matchedWorkout?: { date: string; exercise: ExerciseData };
  suggestion: string;
} {
  const { sameDay = true, withinHours = 24 } = options;
  const now = new Date();

  for (const workout of recentWorkouts) {
    const workoutDate = new Date(workout.date);
    const hoursDiff = (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60);

    // Check time constraints
    if (sameDay) {
      if (workoutDate.toDateString() !== now.toDateString()) {
        continue;
      }
    } else if (hoursDiff > withinHours) {
      continue;
    }

    // Check for matching exercise
    for (const exercise of workout.exercises) {
      const result = areExercisesDuplicate(newExercise, exercise, 0.9);

      if (result.isDuplicate && result.confidence >= 0.8) {
        return {
          isDuplicate: true,
          matchedWorkout: { date: workout.date, exercise },
          suggestion: `You already logged ${newExercise.exerciseName} today. Add more sets to the existing entry?`,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    suggestion: '',
  };
}

export default {
  stringSimilarity,
  normalizeExerciseName,
  areSetsEqual,
  setsSimilarity,
  areExercisesDuplicate,
  detectDuplicates,
  removeDuplicates,
  mergeSimilarExercises,
  checkRecentWorkouts,
};
