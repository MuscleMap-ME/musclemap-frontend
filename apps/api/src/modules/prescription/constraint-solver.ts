/**
 * Constraint Solver
 *
 * Core algorithm for selecting exercises based on user constraints.
 * Uses native C module for performance-critical operations when available.
 */

import { queryAll } from '../../db/client';
import {
  PrescriptionRequest,
  PrescribedExercise,
  ExerciseWithConstraints,
  MuscleCoverageMap,
  GoalType,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  BalanceConstraints,
  DEFAULT_BALANCE_CONSTRAINTS,
  GOAL_PREFERENCES,
  DIFFICULTY_BY_LEVEL,
} from './types';
import {
  isNativeAvailable,
  initializeExercises,
  nativeSolve,
  isInitialized,
} from '../../../native';
import { loggers } from '../../lib/logger';

const log = loggers.prescription;

// Cache for exercises (refreshed periodically)
let exerciseCache: ExerciseWithConstraints[] | null = null;
let exerciseCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all exercises with their constraint data
 */
export async function getAllExercisesWithConstraints(): Promise<ExerciseWithConstraints[]> {
  // Check cache
  const now = Date.now();
  if (exerciseCache && now - exerciseCacheTime < CACHE_TTL_MS) {
    return exerciseCache;
  }

  // Fetch exercises with activations in a single query using JOIN
  const rows = await queryAll<{
    id: string;
    name: string;
    type: string;
    difficulty: number;
    description: string | null;
    cues: string | null;
    primary_muscles: string | null;
    equipment_required: string | null;
    equipment_optional: string | null;
    locations: string | null;
    is_compound: boolean;
    estimated_seconds: number;
    rest_seconds: number;
    movement_pattern: string;
    activations: { muscle_id: string; activation: number }[] | null;
  }>(`
    SELECT
      e.id,
      e.name,
      e.type,
      e.difficulty,
      e.description,
      e.cues,
      e.primary_muscles,
      e.equipment_required,
      e.equipment_optional,
      e.locations,
      e.is_compound,
      e.estimated_seconds,
      e.rest_seconds,
      e.movement_pattern,
      COALESCE(
        json_agg(
          json_build_object('muscle_id', ea.muscle_id, 'activation', ea.activation)
        ) FILTER (WHERE ea.muscle_id IS NOT NULL),
        '[]'
      ) as activations
    FROM exercises e
    LEFT JOIN exercise_activations ea ON e.id = ea.exercise_id
    WHERE e.equipment_required IS NOT NULL
    GROUP BY e.id
  `);

  // Parse JSON fields safely
  const parseJson = (val: string | null, fallback: any) => {
    if (!val) return fallback;
    if (typeof val === 'object') return val; // Already parsed
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  };

  exerciseCache = rows.map(row => {
    // Build activation map
    const activationMap: Record<string, number> = {};
    const activations = row.activations || [];
    for (const a of activations) {
      if (a.muscle_id) {
        activationMap[a.muscle_id] = a.activation;
      }
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      difficulty: row.difficulty,
      description: row.description,
      cues: row.cues,
      primaryMuscles: row.primary_muscles ? row.primary_muscles.split(',') : [],
      equipmentRequired: parseJson(row.equipment_required, []),
      equipmentOptional: parseJson(row.equipment_optional, []),
      locations: parseJson(row.locations, ['gym']),
      isCompound: Boolean(row.is_compound),
      estimatedSeconds: row.estimated_seconds || 45,
      restSeconds: row.rest_seconds || 60,
      movementPattern: row.movement_pattern || 'isolation',
      activations: activationMap,
    } as ExerciseWithConstraints;
  });

  exerciseCacheTime = now;

  // Initialize native module if available
  if (isNativeAvailable() && !isInitialized()) {
    try {
      initializeExercises(exerciseCache);
      log.info('Native constraint solver initialized');
    } catch (err) {
      log.warn({ err }, 'Failed to initialize native solver, using JS fallback');
    }
  }

  return exerciseCache;
}

/**
 * Clear exercise cache (call when exercises are updated)
 */
export function clearExerciseCache(): void {
  exerciseCache = null;
  exerciseCacheTime = 0;
}

/**
 * Filter exercises based on hard constraints
 */
export function applyHardFilters(
  exercises: ExerciseWithConstraints[],
  request: PrescriptionRequest
): ExerciseWithConstraints[] {
  const { location, equipment, excludedExercises, excludedMuscles } = request;
  const userEquipment = new Set(equipment);

  return exercises.filter(exercise => {
    // Check location appropriateness
    if (!exercise.locations.includes(location)) {
      return false;
    }

    // Check equipment requirements (skip for gym location)
    if (location !== 'gym') {
      for (const required of exercise.equipmentRequired) {
        if (!userEquipment.has(required)) {
          return false;
        }
      }
    }

    // Check excluded exercises
    if (excludedExercises?.includes(exercise.id)) {
      return false;
    }

    // Check excluded muscles
    if (excludedMuscles?.length) {
      for (const muscle of excludedMuscles) {
        if (exercise.primaryMuscles.includes(muscle)) {
          return false;
        }
        // Also check activations for any significant involvement
        if (exercise.activations[muscle] && exercise.activations[muscle] > 40) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Score an exercise based on soft constraints
 */
export function scoreExercise(
  exercise: ExerciseWithConstraints,
  request: PrescriptionRequest,
  currentCoverage: MuscleCoverageMap,
  recentMuscles24h: Set<string>,
  recentMuscles48h: Set<string>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  let score = 0;

  // Goal alignment
  if (request.goals?.length) {
    for (const goal of request.goals) {
      const prefs = GOAL_PREFERENCES[goal];
      if (prefs.preferredPatterns.includes(exercise.movementPattern)) {
        score += weights.goalAlignment;
      }
      if (prefs.preferCompound && exercise.isCompound) {
        score += weights.goalAlignment / 2;
      }
    }
  }

  // Compound preference (time efficient)
  if (exercise.isCompound) {
    score += weights.compoundPreference;
  }

  // Recovery score - check each activated muscle
  for (const muscleId of Object.keys(exercise.activations)) {
    if (recentMuscles24h.has(muscleId)) {
      score += weights.recoveryPenalty24h;
    } else if (recentMuscles48h.has(muscleId)) {
      score += weights.recoveryPenalty48h;
    }
  }

  // Fitness level match
  if (request.fitnessLevel) {
    const levelRange = DIFFICULTY_BY_LEVEL[request.fitnessLevel];
    if (exercise.difficulty >= levelRange.min && exercise.difficulty <= levelRange.max) {
      score += weights.fitnessLevelMatch;
    }
    // Penalty for exercises too hard
    if (exercise.difficulty > levelRange.max) {
      score -= (exercise.difficulty - levelRange.max) * 5;
    }
  }

  // Muscle coverage gap - prioritize uncovered muscles
  for (const muscleId of Object.keys(exercise.activations)) {
    if (!currentCoverage[muscleId]) {
      score += weights.muscleCoverageGap;
    }
  }

  return score;
}

/**
 * Estimate time for an exercise in the workout
 */
export function estimateExerciseTime(
  exercise: ExerciseWithConstraints,
  sets: number,
  reps: number,
  restMultiplier: number = 1.0
): number {
  const repDuration = 3; // seconds per rep
  const repTime = reps * repDuration;
  const restTime = Math.round(exercise.restSeconds * restMultiplier);
  const setupTime = exercise.equipmentRequired.length > 0 ? 30 : 0;

  // Total = setup + (sets * rep_time) + ((sets - 1) * rest)
  return setupTime + (sets * repTime) + ((sets - 1) * restTime);
}

/**
 * Update muscle coverage map with a selected exercise
 */
export function updateCoverage(
  coverage: MuscleCoverageMap,
  exercise: ExerciseWithConstraints,
  sets: number,
  muscleNames: Map<string, string>
): void {
  for (const [muscleId, activation] of Object.entries(exercise.activations)) {
    const isPrimary = exercise.primaryMuscles.includes(muscleId) || activation >= 60;

    if (coverage[muscleId]) {
      coverage[muscleId].totalSets += sets;
      // Upgrade to primary if this exercise primarily targets it
      if (isPrimary && coverage[muscleId].activationLevel === 'secondary') {
        coverage[muscleId].activationLevel = 'primary';
      }
    } else {
      coverage[muscleId] = {
        name: muscleNames.get(muscleId) || muscleId,
        activationLevel: isPrimary ? 'primary' : 'secondary',
        totalSets: sets,
      };
    }
  }
}

/**
 * Get muscle names from database
 */
export async function getMuscleNames(): Promise<Map<string, string>> {
  const rows = await queryAll<{ id: string; name: string }>('SELECT id, name FROM muscles');
  return new Map(rows.map(r => [r.id, r.name]));
}

/**
 * Get muscle activations from recent workouts
 */
export async function getRecentMuscleActivations(
  workoutIds: string[]
): Promise<{ last24h: Set<string>; last48h: Set<string> }> {
  if (!workoutIds.length) {
    return { last24h: new Set(), last48h: new Set() };
  }

  const placeholders = workoutIds.map((_, i) => `$${i + 1}`).join(',');
  const rows = await queryAll<{ muscle_activations: string; created_at: Date }>(
    `SELECT muscle_activations, created_at FROM workouts WHERE id IN (${placeholders})`,
    workoutIds
  );

  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h48 = 48 * 60 * 60 * 1000;

  const last24h = new Set<string>();
  const last48h = new Set<string>();

  for (const row of rows) {
    const workoutTime = new Date(row.created_at).getTime();
    const age = now - workoutTime;

    let activations: Record<string, number>;
    try {
      activations = typeof row.muscle_activations === 'string'
        ? JSON.parse(row.muscle_activations || '{}')
        : row.muscle_activations || {};
    } catch {
      continue;
    }

    for (const muscleId of Object.keys(activations)) {
      if (age <= h24) {
        last24h.add(muscleId);
      } else if (age <= h48) {
        last48h.add(muscleId);
      }
    }
  }

  return { last24h, last48h };
}

/**
 * Determine sets and reps based on goals
 */
export function determineSetsReps(
  exercise: ExerciseWithConstraints,
  goals: GoalType[]
): { sets: number; reps: number } {
  // Default values
  let sets = 3;
  let reps = 10;

  if (goals.length > 0) {
    const prefs = GOAL_PREFERENCES[goals[0]];
    sets = Math.floor((prefs.setsRange[0] + prefs.setsRange[1]) / 2);
    reps = Math.floor((prefs.repsRange[0] + prefs.repsRange[1]) / 2);
  }

  return { sets, reps };
}

/**
 * Check movement pattern balance
 */
export function checkBalance(
  selected: ExerciseWithConstraints[],
  constraints: BalanceConstraints = DEFAULT_BALANCE_CONSTRAINTS
): { isBalanced: boolean; issues: string[] } {
  const issues: string[] = [];

  let pushCount = 0;
  let pullCount = 0;
  let upperCount = 0;
  let lowerCount = 0;

  for (const ex of selected) {
    if (ex.movementPattern === 'push') {
      pushCount++;
      upperCount++;
    } else if (ex.movementPattern === 'pull') {
      pullCount++;
      upperCount++;
    } else if (ex.movementPattern === 'squat' || ex.movementPattern === 'hinge') {
      lowerCount++;
    }
  }

  // Check push/pull ratio
  if (pushCount > 0 && pullCount > 0) {
    const pushPullRatio = pushCount / pullCount;
    if (pushPullRatio < constraints.pushPullRatioMin) {
      issues.push(`Push/Pull ratio ${pushPullRatio.toFixed(2)} below ${constraints.pushPullRatioMin}`);
    } else if (pushPullRatio > constraints.pushPullRatioMax) {
      issues.push(`Push/Pull ratio ${pushPullRatio.toFixed(2)} above ${constraints.pushPullRatioMax}`);
    }
  }

  // Check upper/lower ratio
  if (upperCount > 0 && lowerCount > 0) {
    const upperLowerRatio = upperCount / lowerCount;
    if (upperLowerRatio < constraints.upperLowerRatioMin) {
      issues.push(`Upper/Lower ratio ${upperLowerRatio.toFixed(2)} below ${constraints.upperLowerRatioMin}`);
    } else if (upperLowerRatio > constraints.upperLowerRatioMax) {
      issues.push(`Upper/Lower ratio ${upperLowerRatio.toFixed(2)} above ${constraints.upperLowerRatioMax}`);
    }
  }

  return { isBalanced: issues.length === 0, issues };
}

/**
 * Find substitutions for an exercise
 */
export function findSubstitutions(
  exercise: ExerciseWithConstraints,
  allExercises: ExerciseWithConstraints[],
  request: PrescriptionRequest,
  limit: number = 3
): ExerciseWithConstraints[] {
  // Filter to exercises with similar muscle targets
  const targetMuscles = new Set(exercise.primaryMuscles);

  return allExercises
    .filter(ex => {
      // Don't suggest the same exercise
      if (ex.id === exercise.id) return false;

      // Must be valid for the location/equipment
      if (!ex.locations.includes(request.location)) return false;

      if (request.location !== 'gym') {
        for (const required of ex.equipmentRequired) {
          if (!request.equipment.includes(required)) return false;
        }
      }

      // Must share at least one primary muscle
      return ex.primaryMuscles.some(m => targetMuscles.has(m));
    })
    .slice(0, limit);
}

/**
 * Helper to create a PrescribedExercise
 */
function createPrescribedExercise(
  exercise: ExerciseWithConstraints,
  sets: number,
  reps: number,
  restSeconds: number,
  estimatedSeconds: number
): PrescribedExercise {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    sets,
    reps,
    restSeconds,
    estimatedSeconds,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: Object.keys(exercise.activations).filter(
      m => !exercise.primaryMuscles.includes(m)
    ),
    notes: exercise.cues || undefined,
    movementPattern: exercise.movementPattern,
  };
}

/**
 * Main constraint solver
 * Uses native implementation when available for 10-50x speedup
 */
export async function solveConstraints(
  request: PrescriptionRequest
): Promise<{
  exercises: PrescribedExercise[];
  coverage: MuscleCoverageMap;
  actualDurationSeconds: number;
  substitutions: Record<string, PrescribedExercise[]>;
}> {
  const startTime = performance.now();

  const timeAvailableSeconds = request.timeAvailable * 60;
  const warmupCooldownTime = request.timeAvailable >= 30 ? 300 : 120;
  let timeRemaining = timeAvailableSeconds - warmupCooldownTime;

  // Get all exercises with constraint data
  const allExercises = await getAllExercisesWithConstraints();

  // Get muscle names for coverage map
  const muscleNames = await getMuscleNames();

  // Get recent muscle activations if workout IDs provided
  const recentMuscles = await getRecentMuscleActivations(request.recentWorkoutIds || []);

  // Try native solver first
  if (isNativeAvailable() && isInitialized()) {
    const nativeResult = nativeSolve(allExercises, request, recentMuscles.last24h, recentMuscles.last48h);

    if (nativeResult && nativeResult.length > 0) {
      const duration = performance.now() - startTime;
      log.info({ duration, count: nativeResult.length }, 'Native solver completed');

      // Build result from native output
      const selectedExercises: PrescribedExercise[] = [];
      const coverage: MuscleCoverageMap = {};
      const substitutions: Record<string, PrescribedExercise[]> = {};
      let totalTimeSeconds = 0;

      const restMultiplier = request.goals?.length
        ? GOAL_PREFERENCES[request.goals[0]].restSecondsMultiplier
        : 1.0;

      for (const result of nativeResult) {
        const exercise = allExercises[result.index];
        if (!exercise) continue;

        const timeNeeded = estimateExerciseTime(exercise, result.sets, result.reps, restMultiplier);
        totalTimeSeconds += timeNeeded;

        const prescribed = createPrescribedExercise(
          exercise,
          result.sets,
          result.reps,
          Math.round(exercise.restSeconds * restMultiplier),
          timeNeeded
        );
        selectedExercises.push(prescribed);
        updateCoverage(coverage, exercise, result.sets, muscleNames);

        // Find substitutions
        const subs = findSubstitutions(exercise, allExercises, request);
        if (subs.length > 0) {
          substitutions[exercise.id] = subs.map(s =>
            createPrescribedExercise(s, result.sets, result.reps, Math.round(s.restSeconds * restMultiplier), 0)
          );
        }
      }

      return {
        exercises: selectedExercises,
        coverage,
        actualDurationSeconds: totalTimeSeconds + warmupCooldownTime,
        substitutions,
      };
    }
  }

  // Fallback to JavaScript implementation
  log.debug('Using JavaScript solver fallback');

  // Apply hard filters
  const validExercises = applyHardFilters(allExercises, request);

  if (validExercises.length === 0) {
    return {
      exercises: [],
      coverage: {},
      actualDurationSeconds: 0,
      substitutions: {},
    };
  }

  // Initialize tracking
  const coverage: MuscleCoverageMap = {};
  const selectedExercises: PrescribedExercise[] = [];
  const selectedIds = new Set<string>();
  const substitutions: Record<string, PrescribedExercise[]> = {};
  let totalTimeSeconds = 0;

  // Determine rest multiplier based on goals
  const restMultiplier = request.goals?.length
    ? GOAL_PREFERENCES[request.goals[0]].restSecondsMultiplier
    : 1.0;

  // Selection loop
  while (timeRemaining > 60) {
    // Score remaining exercises
    const scored = validExercises
      .filter(ex => !selectedIds.has(ex.id))
      .map(ex => ({
        exercise: ex,
        score: scoreExercise(
          ex,
          request,
          coverage,
          recentMuscles.last24h,
          recentMuscles.last48h
        ),
      }))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) break;

    // Try to fit the highest-scoring exercise
    const best = scored[0].exercise;
    const { sets, reps } = determineSetsReps(best, request.goals || []);
    const timeNeeded = estimateExerciseTime(best, sets, reps, restMultiplier);

    if (timeNeeded > timeRemaining) {
      // Try next exercise or reduce sets
      let found = false;
      for (const { exercise } of scored.slice(1)) {
        const { sets: s, reps: r } = determineSetsReps(exercise, request.goals || []);
        const t = estimateExerciseTime(exercise, s, r, restMultiplier);
        if (t <= timeRemaining) {
          // Use this exercise instead
          const prescribed = createPrescribedExercise(
            exercise,
            s,
            r,
            Math.round(exercise.restSeconds * restMultiplier),
            t
          );
          selectedExercises.push(prescribed);
          selectedIds.add(exercise.id);
          updateCoverage(coverage, exercise, s, muscleNames);
          timeRemaining -= t;
          totalTimeSeconds += t;

          // Find substitutions
          const subs = findSubstitutions(exercise, allExercises, request);
          if (subs.length > 0) {
            substitutions[exercise.id] = subs.map(s =>
              createPrescribedExercise(s, sets, reps, Math.round(s.restSeconds * restMultiplier), 0)
            );
          }

          found = true;
          break;
        }
      }

      if (!found) break;
    } else {
      // Add the best exercise
      const prescribed = createPrescribedExercise(
        best,
        sets,
        reps,
        Math.round(best.restSeconds * restMultiplier),
        timeNeeded
      );
      selectedExercises.push(prescribed);
      selectedIds.add(best.id);
      updateCoverage(coverage, best, sets, muscleNames);
      timeRemaining -= timeNeeded;
      totalTimeSeconds += timeNeeded;

      // Find substitutions
      const subs = findSubstitutions(best, allExercises, request);
      if (subs.length > 0) {
        substitutions[best.id] = subs.map(s =>
          createPrescribedExercise(s, sets, reps, Math.round(s.restSeconds * restMultiplier), 0)
        );
      }
    }

    // Balance check
    if (selectedExercises.length >= 3) {
      checkBalance(validExercises.filter(e => selectedIds.has(e.id)));
    }
  }

  const duration = performance.now() - startTime;
  log.info({ duration, count: selectedExercises.length }, 'JS solver completed');

  return {
    exercises: selectedExercises,
    coverage,
    actualDurationSeconds: totalTimeSeconds + warmupCooldownTime,
    substitutions,
  };
}
