/**
 * Training Units (TU) Calculation
 *
 * TU is the core metric in MuscleMap that quantifies training volume
 * in a way that accounts for exercise difficulty, muscle activation,
 * and progressive overload.
 *
 * Formula: TU = SUM(sets * reps * weight_factor * activation_factor)
 * Where:
 *   - weight_factor: Normalized weight relative to bodyweight or reference
 *   - activation_factor: How much the exercise activates target muscles (0-1)
 */

export interface TUInput {
  sets: number;
  reps: number;
  weight?: number;        // Weight in lbs (optional for bodyweight exercises)
  bodyweight?: number;    // User's bodyweight in lbs
  activationFactor: number;  // Exercise activation factor (0-1)
  isBodyweight?: boolean;
}

export interface TUResult {
  raw: number;          // Raw TU value
  normalized: number;   // Normalized to 0-100 scale
  breakdown: {
    volume: number;     // sets * reps
    weightFactor: number;
    activationFactor: number;
  };
}

/**
 * Calculate Training Units for a single exercise performance.
 */
export function calculateTU(input: TUInput): TUResult {
  const { sets, reps, weight = 0, bodyweight = 150, activationFactor, isBodyweight = false } = input;

  // Volume is sets * reps
  const volume = sets * reps;

  // Weight factor calculation
  let weightFactor: number;
  if (isBodyweight) {
    // Bodyweight exercises use bodyweight as the load
    // Normalized to a reference of 150lbs
    weightFactor = bodyweight / 150;
  } else if (weight > 0) {
    // Weighted exercises: normalize to bodyweight ratio
    weightFactor = weight / bodyweight;
  } else {
    // No weight specified, assume bodyweight-equivalent
    weightFactor = 1;
  }

  // Calculate raw TU
  const raw = volume * weightFactor * activationFactor;

  // Normalize to 0-100 scale (rough approximation)
  // A "standard" workout might have ~500-1000 raw TU
  const normalized = Math.min(100, (raw / 50) * 10);

  return {
    raw: Math.round(raw * 100) / 100,
    normalized: Math.round(normalized * 10) / 10,
    breakdown: {
      volume,
      weightFactor: Math.round(weightFactor * 100) / 100,
      activationFactor,
    },
  };
}

/**
 * Calculate total TU for a workout (multiple exercises).
 */
export function calculateWorkoutTU(exercises: TUInput[]): {
  total: number;
  average: number;
  perExercise: number[];
} {
  if (exercises.length === 0) {
    return { total: 0, average: 0, perExercise: [] };
  }

  const perExercise = exercises.map((e) => calculateTU(e).raw);
  const total = perExercise.reduce((sum, tu) => sum + tu, 0);
  const average = total / exercises.length;

  return {
    total: Math.round(total * 100) / 100,
    average: Math.round(average * 100) / 100,
    perExercise,
  };
}

/**
 * Estimate TU from basic inputs (for quick calculations).
 */
export function estimateTU(sets: number, reps: number, intensity: 'light' | 'moderate' | 'heavy' = 'moderate'): number {
  const intensityFactors = {
    light: 0.5,
    moderate: 0.75,
    heavy: 1.0,
  };

  return Math.round(sets * reps * intensityFactors[intensity] * 100) / 100;
}
