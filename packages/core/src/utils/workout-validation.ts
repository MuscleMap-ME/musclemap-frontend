/**
 * Workout Validation Utilities
 *
 * Shared validation logic for workout data across all platforms.
 */

export interface WorkoutSetInput {
  reps: number;
  weight?: number;
  duration?: number;  // in seconds, for timed exercises
  distance?: number;  // in meters, for distance exercises
}

export interface WorkoutExerciseInput {
  exerciseId: string;
  sets: WorkoutSetInput[];
}

export interface WorkoutInput {
  exercises: WorkoutExerciseInput[];
  startedAt?: Date | string;
  completedAt?: Date | string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Validation constants
const MAX_SETS_PER_EXERCISE = 20;
const MAX_REPS_PER_SET = 500;
const MAX_WEIGHT = 2000; // lbs
const MAX_EXERCISES_PER_WORKOUT = 50;
const MIN_REPS = 1;

/**
 * Validate a single set input.
 */
export function validateSet(set: WorkoutSetInput, setIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof set.reps !== 'number' || !Number.isFinite(set.reps)) {
    errors.push({
      field: `sets[${setIndex}].reps`,
      message: 'Reps must be a valid number',
      code: 'INVALID_REPS',
    });
  } else if (set.reps < MIN_REPS || set.reps > MAX_REPS_PER_SET) {
    errors.push({
      field: `sets[${setIndex}].reps`,
      message: `Reps must be between ${MIN_REPS} and ${MAX_REPS_PER_SET}`,
      code: 'REPS_OUT_OF_RANGE',
    });
  }

  if (set.weight !== undefined) {
    if (typeof set.weight !== 'number' || !Number.isFinite(set.weight)) {
      errors.push({
        field: `sets[${setIndex}].weight`,
        message: 'Weight must be a valid number',
        code: 'INVALID_WEIGHT',
      });
    } else if (set.weight < 0 || set.weight > MAX_WEIGHT) {
      errors.push({
        field: `sets[${setIndex}].weight`,
        message: `Weight must be between 0 and ${MAX_WEIGHT} lbs`,
        code: 'WEIGHT_OUT_OF_RANGE',
      });
    }
  }

  if (set.duration !== undefined) {
    if (typeof set.duration !== 'number' || !Number.isFinite(set.duration)) {
      errors.push({
        field: `sets[${setIndex}].duration`,
        message: 'Duration must be a valid number',
        code: 'INVALID_DURATION',
      });
    } else if (set.duration < 0 || set.duration > 86400) { // max 24 hours
      errors.push({
        field: `sets[${setIndex}].duration`,
        message: 'Duration must be between 0 and 86400 seconds',
        code: 'DURATION_OUT_OF_RANGE',
      });
    }
  }

  return errors;
}

/**
 * Validate a workout exercise input.
 */
export function validateWorkoutExercise(
  exercise: WorkoutExerciseInput,
  exerciseIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!exercise.exerciseId || typeof exercise.exerciseId !== 'string') {
    errors.push({
      field: `exercises[${exerciseIndex}].exerciseId`,
      message: 'Exercise ID is required',
      code: 'MISSING_EXERCISE_ID',
    });
  }

  if (!Array.isArray(exercise.sets)) {
    errors.push({
      field: `exercises[${exerciseIndex}].sets`,
      message: 'Sets must be an array',
      code: 'INVALID_SETS',
    });
    return errors;
  }

  if (exercise.sets.length === 0) {
    errors.push({
      field: `exercises[${exerciseIndex}].sets`,
      message: 'At least one set is required',
      code: 'NO_SETS',
    });
  }

  if (exercise.sets.length > MAX_SETS_PER_EXERCISE) {
    errors.push({
      field: `exercises[${exerciseIndex}].sets`,
      message: `Maximum ${MAX_SETS_PER_EXERCISE} sets allowed per exercise`,
      code: 'TOO_MANY_SETS',
    });
  }

  // Validate each set
  exercise.sets.forEach((set, setIndex) => {
    const setErrors = validateSet(set, setIndex);
    errors.push(
      ...setErrors.map((e) => ({
        ...e,
        field: `exercises[${exerciseIndex}].${e.field}`,
      }))
    );
  });

  return errors;
}

/**
 * Validate a complete workout input.
 */
export function validateWorkout(workout: WorkoutInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (!workout || typeof workout !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'workout', message: 'Invalid workout data', code: 'INVALID_WORKOUT' }],
    };
  }

  if (!Array.isArray(workout.exercises)) {
    errors.push({
      field: 'exercises',
      message: 'Exercises must be an array',
      code: 'INVALID_EXERCISES',
    });
    return { valid: false, errors };
  }

  if (workout.exercises.length === 0) {
    errors.push({
      field: 'exercises',
      message: 'At least one exercise is required',
      code: 'NO_EXERCISES',
    });
  }

  if (workout.exercises.length > MAX_EXERCISES_PER_WORKOUT) {
    errors.push({
      field: 'exercises',
      message: `Maximum ${MAX_EXERCISES_PER_WORKOUT} exercises allowed per workout`,
      code: 'TOO_MANY_EXERCISES',
    });
  }

  // Validate each exercise
  workout.exercises.forEach((exercise, index) => {
    const exerciseErrors = validateWorkoutExercise(exercise, index);
    errors.push(...exerciseErrors);
  });

  // Validate timestamps if provided
  if (workout.startedAt && workout.completedAt) {
    const started = new Date(workout.startedAt);
    const completed = new Date(workout.completedAt);

    if (isNaN(started.getTime())) {
      errors.push({
        field: 'startedAt',
        message: 'Invalid start date',
        code: 'INVALID_START_DATE',
      });
    }

    if (isNaN(completed.getTime())) {
      errors.push({
        field: 'completedAt',
        message: 'Invalid completion date',
        code: 'INVALID_COMPLETED_DATE',
      });
    }

    if (!isNaN(started.getTime()) && !isNaN(completed.getTime()) && completed < started) {
      errors.push({
        field: 'completedAt',
        message: 'Completion date must be after start date',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a workout has any completed sets (non-zero reps).
 */
export function hasCompletedSets(workout: WorkoutInput): boolean {
  return workout.exercises.some((exercise) =>
    exercise.sets.some((set) => set.reps > 0)
  );
}

/**
 * Calculate workout summary statistics.
 */
export function getWorkoutSummary(workout: WorkoutInput): {
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  completedSets: number;
} {
  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  let completedSets = 0;

  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) {
      totalSets++;
      totalReps += set.reps || 0;
      totalWeight += (set.weight || 0) * (set.reps || 0);
      if (set.reps > 0) {
        completedSets++;
      }
    }
  }

  return {
    totalExercises: workout.exercises.length,
    totalSets,
    totalReps,
    totalWeight,
    completedSets,
  };
}
