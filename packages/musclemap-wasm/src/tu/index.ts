/**
 * Training Unit (TU) Calculator
 * Calculates workout volume across muscle groups
 * Formula: TU = Σ(activation × sets × bias_weight) for each muscle
 */

let wasmModule: any = null;

export async function initTU(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    const mod = await import('../../pkg/musclemap_tu/musclemap_tu.js');
    await mod.default?.();
    // Test that it actually works
    mod.tu_calculate_simple(new Float32Array([50]), new Uint32Array([1]), new Float32Array([1.0]), 1, 1);
    wasmModule = mod;
  } catch (e) {
    console.warn('[tu] WASM module not available, using JS fallback');
    wasmModule = false;
  }
}

export interface MuscleActivation {
  muscleId: string;
  activation: number; // 0-100
}

export interface ExerciseInput {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
}

export interface TUResult {
  totalTU: number;
  durationMs: number;
  native: boolean;
}

export interface MuscleTU {
  muscleId: string;
  tu: number;
  weightedTU: number;
}

export interface DetailedTUResult extends TUResult {
  muscles: MuscleTU[];
}

/**
 * TU Calculator class with exercise caching
 */
export class TUCalculator {
  private exerciseCache: Map<string, MuscleActivation[]> = new Map();
  private muscleBias: Map<string, number> = new Map();
  private wasmCalculator: any = null;

  constructor() {
    if (wasmModule?.TUCalculator) {
      this.wasmCalculator = new wasmModule.TUCalculator();
    }
  }

  /**
   * Add an exercise to the cache
   */
  addExercise(exerciseId: string, activations: MuscleActivation[]): void {
    this.exerciseCache.set(exerciseId, activations);

    if (this.wasmCalculator) {
      const muscleIds = activations.map((a) => a.muscleId);
      const values = activations.map((a) => a.activation);
      this.wasmCalculator.add_exercise(exerciseId, muscleIds, values);
    }
  }

  /**
   * Set bias weight for a muscle
   */
  setMuscleBias(muscleId: string, biasWeight: number): void {
    this.muscleBias.set(muscleId, biasWeight);

    if (this.wasmCalculator) {
      this.wasmCalculator.set_muscle_bias(muscleId, biasWeight);
    }
  }

  /**
   * Calculate TU for a workout
   */
  calculate(exercises: ExerciseInput[]): TUResult {
    const start = performance.now();

    if (this.wasmCalculator) {
      try {
        const exerciseIds = exercises.map((e) => e.exerciseId);
        const sets = exercises.map((e) => e.sets);
        const result = this.wasmCalculator.calculate_cached(exerciseIds, sets);
        return {
          totalTU: result.total_tu,
          durationMs: result.duration_ms,
          native: true,
        };
      } catch {
        // Fall through to JS
      }
    }

    // JS fallback
    const muscleTotals = new Map<string, number>();

    for (const exercise of exercises) {
      const activations = this.exerciseCache.get(exercise.exerciseId);
      if (!activations) continue;

      for (const { muscleId, activation } of activations) {
        if (activation > 0) {
          const contribution = (activation / 100) * exercise.sets;
          const current = muscleTotals.get(muscleId) || 0;
          muscleTotals.set(muscleId, current + contribution);
        }
      }
    }

    let total = 0;
    for (const [muscleId, tu] of muscleTotals) {
      const bias = this.muscleBias.get(muscleId) || 1.0;
      total += tu * bias;
    }

    return {
      totalTU: Math.round(total * 100) / 100,
      durationMs: performance.now() - start,
      native: false,
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.exerciseCache.clear();
    this.muscleBias.clear();
    if (this.wasmCalculator) {
      this.wasmCalculator.clear();
    }
  }
}

/**
 * Calculate TU directly without caching (simple interface)
 */
export function tuCalculateSimple(
  activations: number[], // Flat array: [ex0_m0, ex0_m1, ..., ex1_m0, ...]
  sets: number[],
  biasWeights: number[],
  exerciseCount: number,
  muscleCount: number
): number {
  if (wasmModule?.tu_calculate_simple) {
    return wasmModule.tu_calculate_simple(
      activations,
      sets,
      biasWeights,
      exerciseCount,
      muscleCount
    );
  }

  // JS fallback
  const muscleTotals = new Array(muscleCount).fill(0);

  for (let e = 0; e < exerciseCount; e++) {
    const s = Math.max(1, sets[e]);
    for (let m = 0; m < muscleCount; m++) {
      const activation = activations[e * muscleCount + m];
      if (activation > 0) {
        muscleTotals[m] += (activation / 100) * s;
      }
    }
  }

  let total = 0;
  for (let m = 0; m < muscleCount; m++) {
    if (muscleTotals[m] > 0) {
      total += muscleTotals[m] * biasWeights[m];
    }
  }

  return Math.round(total * 100) / 100;
}

/**
 * Batch calculate TU for multiple workouts
 */
export function tuCalculateBatch(
  allActivations: number[],
  allSets: number[],
  biasWeights: number[],
  workoutSizes: number[],
  muscleCount: number
): number[] {
  if (wasmModule?.tu_calculate_batch) {
    return Array.from(
      wasmModule.tu_calculate_batch(
        allActivations,
        allSets,
        biasWeights,
        workoutSizes,
        muscleCount
      )
    );
  }

  // JS fallback
  const results: number[] = [];
  let actOffset = 0;
  let setOffset = 0;

  for (const size of workoutSizes) {
    const actLen = size * muscleCount;
    const activations = allActivations.slice(actOffset, actOffset + actLen);
    const sets = allSets.slice(setOffset, setOffset + size);

    results.push(
      tuCalculateSimple(activations, sets, biasWeights, size, muscleCount)
    );

    actOffset += actLen;
    setOffset += size;
  }

  return results;
}
