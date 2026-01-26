/**
 * Load Prescription Calculator
 * RPE-based load calculations and progressive overload
 */

let wasmModule: any = null;

export async function initLoad(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    const mod = await import('../../pkg/musclemap_load/musclemap_load.js');
    await mod.default?.();
    wasmModule = mod;
  } catch (e) {
    console.warn('[load] WASM module not available, using JS fallback');
    wasmModule = false;
  }
}

// RPE Table: rows = reps (1-12), cols = RPE (6.0-10.0 in 0.5 increments)
// Values are percentage of 1RM
const RPE_TABLE = [
  // RPE:  6.0   6.5   7.0   7.5   8.0   8.5   9.0   9.5  10.0
  /* 1 */ [88.0, 90.0, 92.0, 94.0, 96.0, 98.0, 100.0, 100.0, 100.0],
  /* 2 */ [85.0, 87.0, 89.0, 91.0, 93.0, 95.0, 97.0, 99.0, 100.0],
  /* 3 */ [82.0, 84.0, 86.0, 88.0, 90.0, 92.0, 94.0, 96.0, 98.0],
  /* 4 */ [79.0, 81.0, 83.0, 85.0, 87.0, 89.0, 91.0, 93.0, 95.0],
  /* 5 */ [76.0, 78.0, 80.0, 82.0, 84.0, 86.0, 88.0, 90.0, 92.0],
  /* 6 */ [73.0, 75.0, 77.0, 79.0, 81.0, 83.0, 85.0, 87.0, 89.0],
  /* 7 */ [70.0, 72.0, 74.0, 76.0, 78.0, 80.0, 82.0, 84.0, 86.0],
  /* 8 */ [67.0, 69.0, 71.0, 73.0, 75.0, 77.0, 79.0, 81.0, 83.0],
  /* 9 */ [64.0, 66.0, 68.0, 70.0, 72.0, 74.0, 76.0, 78.0, 80.0],
  /* 10 */ [61.0, 63.0, 65.0, 67.0, 69.0, 71.0, 73.0, 75.0, 77.0],
  /* 11 */ [58.0, 60.0, 62.0, 64.0, 66.0, 68.0, 70.0, 72.0, 74.0],
  /* 12 */ [55.0, 57.0, 59.0, 61.0, 63.0, 65.0, 67.0, 69.0, 71.0],
];

export type TrainingPhase = 'strength' | 'hypertrophy' | 'power' | 'endurance' | 'peaking';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface LoadPrescription {
  weightKg: number;
  reps: number;
  sets: number;
  rpe: number;
  percentOf1RM: number;
  restSeconds: number;
}

export interface ProgressiveOverloadResult {
  newWeight: number;
  newReps: number;
  newSets: number;
  progressionType: 'weight' | 'reps' | 'sets' | 'none';
  percentIncrease: number;
}

export interface E1RMResult {
  estimated1RM: number;
  confidence: number;
  formula: string;
}

/**
 * Convert RPE and reps to percentage of 1RM
 */
export function rpeToPercentage(reps: number, rpe: number): number {
  if (wasmModule?.rpe_to_percentage) {
    return wasmModule.rpe_to_percentage(reps, rpe);
  }

  // JS fallback
  const repIndex = Math.min(Math.max(1, Math.round(reps)), 12) - 1;
  const rpeIndex = Math.min(
    Math.max(0, Math.round((rpe - 6.0) / 0.5)),
    8
  );

  return RPE_TABLE[repIndex][rpeIndex];
}

/**
 * Convert percentage of 1RM to approximate RPE for given reps
 */
export function percentageToRpe(reps: number, percentage: number): number {
  if (wasmModule?.percentage_to_rpe) {
    return wasmModule.percentage_to_rpe(reps, percentage);
  }

  // JS fallback - find closest RPE
  const repIndex = Math.min(Math.max(1, Math.round(reps)), 12) - 1;
  const row = RPE_TABLE[repIndex];

  let closestIndex = 0;
  let minDiff = Math.abs(row[0] - percentage);

  for (let i = 1; i < row.length; i++) {
    const diff = Math.abs(row[i] - percentage);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  return 6.0 + closestIndex * 0.5;
}

/**
 * Estimate 1RM from weight, reps, and RPE
 */
export function estimate1RM(
  weight: number,
  reps: number,
  rpe: number
): E1RMResult {
  if (wasmModule?.estimate_1rm) {
    const result = wasmModule.estimate_1rm(weight, reps, rpe);
    return {
      estimated1RM: result.estimated_1rm,
      confidence: result.confidence,
      formula: result.formula,
    };
  }

  // JS fallback using RPE table
  const percentage = rpeToPercentage(reps, rpe) / 100;
  const e1rm = weight / percentage;

  // Confidence decreases with higher reps and lower RPE
  const confidence = Math.max(0.5, 1.0 - (reps - 1) * 0.02 - (10 - rpe) * 0.05);

  return {
    estimated1RM: Math.round(e1rm * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    formula: 'RPE Table',
  };
}

/**
 * Calculate target load for given parameters
 */
export function calculateLoad(
  e1rm: number,
  targetReps: number,
  targetRpe: number
): number {
  if (wasmModule?.calculate_load) {
    return wasmModule.calculate_load(e1rm, targetReps, targetRpe);
  }

  const percentage = rpeToPercentage(targetReps, targetRpe) / 100;
  return Math.round((e1rm * percentage) * 10) / 10;
}

/**
 * Get complete load prescription for training phase
 */
export function getLoadPrescription(
  e1rm: number,
  phase: TrainingPhase,
  experience: ExperienceLevel
): LoadPrescription {
  // Phase-specific parameters
  const phaseParams = {
    strength: { reps: 5, rpe: 8.5, sets: 5, rest: 180 },
    hypertrophy: { reps: 10, rpe: 8.0, sets: 4, rest: 90 },
    power: { reps: 3, rpe: 7.5, sets: 6, rest: 240 },
    endurance: { reps: 15, rpe: 7.0, sets: 3, rest: 60 },
    peaking: { reps: 2, rpe: 9.5, sets: 3, rest: 300 },
  };

  // Experience adjustments
  const expAdjust = {
    beginner: { rpe: -1.0, sets: -1 },
    intermediate: { rpe: 0, sets: 0 },
    advanced: { rpe: 0.5, sets: 1 },
    elite: { rpe: 1.0, sets: 1 },
  };

  const params = phaseParams[phase];
  const adjust = expAdjust[experience];

  const rpe = Math.min(10, Math.max(6, params.rpe + adjust.rpe));
  const sets = Math.max(2, params.sets + adjust.sets);
  const percentOf1RM = rpeToPercentage(params.reps, rpe);
  const weightKg = calculateLoad(e1rm, params.reps, rpe);

  return {
    weightKg,
    reps: params.reps,
    sets,
    rpe,
    percentOf1RM,
    restSeconds: params.rest,
  };
}

/**
 * Calculate progressive overload recommendation
 */
export function progressiveOverload(
  currentWeight: number,
  currentReps: number,
  currentSets: number,
  completedRpe: number,
  targetRpe: number
): ProgressiveOverloadResult {
  if (wasmModule?.progressive_overload) {
    const result = wasmModule.progressive_overload(
      currentWeight,
      currentReps,
      currentSets,
      completedRpe,
      targetRpe
    );
    return {
      newWeight: result.new_weight,
      newReps: result.new_reps,
      newSets: result.new_sets,
      progressionType: result.progression_type,
      percentIncrease: result.percent_increase,
    };
  }

  // JS fallback
  const rpeDiff = targetRpe - completedRpe;

  // If completed RPE is lower than target, increase load
  if (rpeDiff > 0.5) {
    // Easy - increase weight by 2.5-5%
    const increase = rpeDiff > 1.5 ? 0.05 : 0.025;
    const newWeight = Math.round(currentWeight * (1 + increase) * 10) / 10;
    return {
      newWeight,
      newReps: currentReps,
      newSets: currentSets,
      progressionType: 'weight',
      percentIncrease: increase * 100,
    };
  } else if (rpeDiff > 0) {
    // Slightly easy - add a rep
    return {
      newWeight: currentWeight,
      newReps: currentReps + 1,
      newSets: currentSets,
      progressionType: 'reps',
      percentIncrease: (1 / currentReps) * 100,
    };
  } else if (rpeDiff < -1) {
    // Too hard - reduce weight
    const newWeight = Math.round(currentWeight * 0.95 * 10) / 10;
    return {
      newWeight,
      newReps: currentReps,
      newSets: currentSets,
      progressionType: 'weight',
      percentIncrease: -5,
    };
  }

  // On target - no change
  return {
    newWeight: currentWeight,
    newReps: currentReps,
    newSets: currentSets,
    progressionType: 'none',
    percentIncrease: 0,
  };
}

/**
 * Calculate loads for multiple exercises
 */
export function calculateLoadsBatch(
  e1rms: number[],
  targetReps: number[],
  targetRpes: number[]
): number[] {
  if (wasmModule?.calculate_loads_batch) {
    return Array.from(
      wasmModule.calculate_loads_batch(e1rms, targetReps, targetRpes)
    );
  }

  // JS fallback
  return e1rms.map((e1rm, i) =>
    calculateLoad(e1rm, targetReps[i], targetRpes[i])
  );
}

/**
 * Parse tempo string (e.g., "3010") into components
 */
export function parseTempo(
  tempo: string
): { eccentric: number; pause1: number; concentric: number; pause2: number } {
  if (wasmModule?.parse_tempo) {
    const result = wasmModule.parse_tempo(tempo);
    return {
      eccentric: result.eccentric,
      pause1: result.pause1,
      concentric: result.concentric,
      pause2: result.pause2,
    };
  }

  // JS fallback
  const digits = tempo.replace(/[^0-9X]/g, '').split('');
  const parseDigit = (d: string) => (d === 'X' ? 0 : parseInt(d) || 0);

  return {
    eccentric: parseDigit(digits[0] || '0'),
    pause1: parseDigit(digits[1] || '0'),
    concentric: parseDigit(digits[2] || '0'),
    pause2: parseDigit(digits[3] || '0'),
  };
}

/**
 * Calculate time under tension for a set
 */
export function timeUnderTension(tempo: string, reps: number): number {
  if (wasmModule?.time_under_tension) {
    return wasmModule.time_under_tension(tempo, reps);
  }

  // JS fallback
  const t = parseTempo(tempo);
  const repDuration = t.eccentric + t.pause1 + t.concentric + t.pause2;
  return repDuration * reps;
}

/**
 * Get recommended rest time based on intensity and phase
 */
export function recommendedRest(
  percentOf1RM: number,
  phase: TrainingPhase
): number {
  // Base rest times by percentage
  let baseRest: number;
  if (percentOf1RM >= 90) baseRest = 300;
  else if (percentOf1RM >= 80) baseRest = 180;
  else if (percentOf1RM >= 70) baseRest = 120;
  else baseRest = 90;

  // Phase adjustments
  const phaseMultiplier = {
    strength: 1.2,
    hypertrophy: 0.8,
    power: 1.5,
    endurance: 0.6,
    peaking: 1.4,
  };

  return Math.round(baseRest * phaseMultiplier[phase]);
}
