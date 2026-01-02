/**
 * Native Constraint Solver Bindings
 *
 * TypeScript wrapper for the native C constraint solver.
 * Falls back to JavaScript implementation if native module is not available.
 */

import path from 'path';
import { ExerciseWithConstraints, PrescriptionRequest, MovementPattern, GoalType, LocationId } from '../src/modules/prescription/types';

// Movement pattern to numeric mapping
const PATTERN_MAP: Record<MovementPattern, number> = {
  push: 0,
  pull: 1,
  squat: 2,
  hinge: 3,
  carry: 4,
  core: 5,
  isolation: 6,
};

// Location to numeric mapping
const LOCATION_MAP: Record<LocationId, number> = {
  gym: 0,
  home: 1,
  park: 2,
  hotel: 3,
  office: 4,
  travel: 5,
};

// Goal to numeric mapping
const GOAL_MAP: Record<GoalType, number> = {
  strength: 0,
  hypertrophy: 1,
  endurance: 2,
  mobility: 3,
  fat_loss: 4,
};

// Equipment to bit index mapping (extend as needed)
const EQUIPMENT_MAP: Record<string, number> = {
  barbell: 0,
  dumbbell: 1,
  kettlebell: 2,
  pullup_bar: 3,
  bench: 4,
  cable_machine: 5,
  resistance_bands: 6,
  trx: 7,
  medicine_ball: 8,
  foam_roller: 9,
  ab_wheel: 10,
  jump_rope: 11,
  box: 12,
  rack: 13,
  ez_bar: 14,
  landmine: 15,
};

// Muscle to bit index mapping (extend as needed)
const MUSCLE_MAP: Record<string, number> = {
  chest: 0,
  'pec-major-sternal': 0,
  'pec-major-clavicular': 1,
  'delt-front': 2,
  'delt-side': 3,
  'delt-rear': 4,
  triceps: 5,
  'triceps-long': 5,
  'triceps-lateral': 6,
  biceps: 7,
  'biceps-short': 7,
  'biceps-long': 8,
  forearms: 9,
  'brachioradialis': 9,
  lats: 10,
  'lat-dorsi': 10,
  traps: 11,
  'trap-upper': 11,
  'trap-mid': 12,
  'trap-lower': 13,
  rhomboids: 14,
  'erector-spinae': 15,
  'lower-back': 15,
  'rectus-abdominis': 16,
  abs: 16,
  obliques: 17,
  'oblique-external': 17,
  'hip-flexors': 18,
  quads: 19,
  'quad-rectus': 19,
  'quad-vastus-lat': 20,
  'quad-vastus-med': 21,
  hamstrings: 22,
  'hamstring-bicep': 22,
  'hamstring-semi': 23,
  glutes: 24,
  'glute-max': 24,
  'glute-med': 25,
  'glute-min': 26,
  calves: 27,
  gastrocnemius: 27,
  soleus: 28,
  adductors: 29,
  'adductor-longus': 29,
};

interface NativeSolverResult {
  index: number;
  sets: number;
  reps: number;
}

interface NativeModule {
  initExercises: (exercises: any[]) => number;
  solve: (request: any) => NativeSolverResult[];
  scoreBatch: (indices: number[], request: any) => number[];
  getExerciseCount: () => number;
}

let nativeModule: NativeModule | null = null;
let initialized = false;

/**
 * Try to load the native module
 */
export function loadNativeModule(): boolean {
  if (nativeModule !== null) {
    return true;
  }

  try {
    // Try to load the native module
    const modulePath = path.join(__dirname, 'build', 'Release', 'constraint_solver.node');
    nativeModule = require(modulePath) as NativeModule;
    console.log('[native] Loaded native constraint solver');
    return true;
  } catch (err) {
    // Try debug build
    try {
      const debugPath = path.join(__dirname, 'build', 'Debug', 'constraint_solver.node');
      nativeModule = require(debugPath) as NativeModule;
      console.log('[native] Loaded native constraint solver (debug build)');
      return true;
    } catch {
      console.log('[native] Native module not available, using JS fallback');
      return false;
    }
  }
}

/**
 * Convert equipment list to bitmask
 */
function equipmentToBitmask(equipment: string[]): number {
  let mask = 0;
  for (const eq of equipment) {
    const bit = EQUIPMENT_MAP[eq.toLowerCase().replace(/[^a-z_]/g, '_')];
    if (bit !== undefined) {
      mask |= (1 << bit);
    }
  }
  return mask;
}

/**
 * Convert muscle list to bitmask
 */
function musclesToBitmask(muscles: string[]): number {
  let mask = 0;
  for (const m of muscles) {
    const bit = MUSCLE_MAP[m.toLowerCase().replace(/[^a-z-]/g, '')];
    if (bit !== undefined) {
      mask |= (1 << bit);
    }
  }
  return mask;
}

/**
 * Convert goals to bitmask
 */
function goalsToBitmask(goals: GoalType[] | undefined): number {
  if (!goals) return 0;
  let mask = 0;
  for (const g of goals) {
    const bit = GOAL_MAP[g];
    if (bit !== undefined) {
      mask |= (1 << bit);
    }
  }
  return mask;
}

/**
 * Convert locations to bitmask
 */
function locationsToBitmask(locations: LocationId[]): number {
  let mask = 0;
  for (const loc of locations) {
    const bit = LOCATION_MAP[loc];
    if (bit !== undefined) {
      mask |= (1 << bit);
    }
  }
  return mask;
}

/**
 * Convert activations to array indexed by muscle bit
 */
function activationsToArray(activations: Record<string, number>): number[] {
  const result = new Array(50).fill(0);
  for (const [muscle, value] of Object.entries(activations)) {
    const bit = MUSCLE_MAP[muscle.toLowerCase().replace(/[^a-z-]/g, '')];
    if (bit !== undefined && bit < 50) {
      result[bit] = value;
    }
  }
  return result;
}

/**
 * Initialize the native solver with exercise data
 */
export function initializeExercises(exercises: ExerciseWithConstraints[]): boolean {
  if (!loadNativeModule() || !nativeModule) {
    return false;
  }

  const nativeExercises = exercises.map((ex, index) => ({
    id: index,
    difficulty: ex.difficulty,
    isCompound: ex.isCompound,
    movementPattern: PATTERN_MAP[ex.movementPattern] ?? 6,
    estimatedSeconds: ex.estimatedSeconds,
    restSeconds: ex.restSeconds,
    locationsMask: locationsToBitmask(ex.locations),
    equipmentRequiredMask: equipmentToBitmask(ex.equipmentRequired),
    primaryMusclesMask: musclesToBitmask(ex.primaryMuscles),
    activations: activationsToArray(ex.activations),
  }));

  const count = nativeModule.initExercises(nativeExercises);
  initialized = count > 0;
  console.log(`[native] Initialized ${count} exercises`);
  return initialized;
}

/**
 * Convert fitness level to numeric
 */
function fitnessLevelToNumber(level: string | undefined): number {
  switch (level) {
    case 'beginner': return 0;
    case 'intermediate': return 1;
    case 'advanced': return 2;
    default: return 1;
  }
}

/**
 * Solve constraints using native module
 */
export function nativeSolve(
  exercises: ExerciseWithConstraints[],
  request: PrescriptionRequest,
  recentMuscles24h: Set<string>,
  recentMuscles48h: Set<string>
): { index: number; sets: number; reps: number }[] | null {
  if (!initialized || !nativeModule) {
    return null;
  }

  // Build excluded exercises bitmask array (16 x 32-bit = 512 exercises)
  const excludedMask = new Array(16).fill(0);
  if (request.excludedExercises) {
    for (const exId of request.excludedExercises) {
      // Find index
      const idx = exercises.findIndex(e => e.id === exId);
      if (idx >= 0 && idx < 512) {
        const bucket = Math.floor(idx / 32);
        const bit = idx % 32;
        excludedMask[bucket] |= (1 << bit);
      }
    }
  }

  const nativeRequest = {
    timeAvailableSeconds: request.timeAvailable * 60,
    location: LOCATION_MAP[request.location] ?? 0,
    equipmentMask: equipmentToBitmask(request.equipment),
    goalsMask: goalsToBitmask(request.goals),
    fitnessLevel: fitnessLevelToNumber(request.fitnessLevel),
    excludedMusclesMask: musclesToBitmask(request.excludedMuscles || []),
    recent24hMusclesMask: musclesToBitmask(Array.from(recentMuscles24h)),
    recent48hMusclesMask: musclesToBitmask(Array.from(recentMuscles48h)),
    excludedExercisesMask: excludedMask,
  };

  try {
    return nativeModule.solve(nativeRequest);
  } catch (err) {
    console.error('[native] Solve failed:', err);
    return null;
  }
}

/**
 * Check if native module is available
 */
export function isNativeAvailable(): boolean {
  return loadNativeModule();
}

/**
 * Check if exercises are initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Get exercise count from native module
 */
export function getExerciseCount(): number {
  if (!nativeModule) return 0;
  return nativeModule.getExerciseCount();
}
