/**
 * Prescription Types
 *
 * TypeScript interfaces for the constraint-based workout prescription system.
 */

// Location types
export type LocationId = 'gym' | 'home' | 'park' | 'hotel' | 'office' | 'travel';

// Goal types
export type GoalType = 'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'fat_loss';

// Fitness level
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

// Movement patterns for balancing
export type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core' | 'isolation';

/**
 * Request to generate a prescription
 */
export interface PrescriptionRequest {
  timeAvailable: number;              // minutes: 15, 30, 45, 60, 90
  location: LocationId;               // where the workout will take place
  equipment: string[];                // e.g., ["pullup_bar", "dumbbells", "kettlebell", "bands"] or [] for bodyweight
  goals?: GoalType[];                 // what the user wants to achieve
  fitnessLevel?: FitnessLevel;        // user's fitness level
  excludedExercises?: string[];       // injuries, preferences
  excludedMuscles?: string[];         // e.g., ["lower_back"] for injury
  recentWorkoutIds?: string[];        // for muscle group balancing
}

/**
 * A single exercise in a prescription
 */
export interface PrescribedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number | string;              // number or "30s" for timed exercises
  restSeconds: number;
  estimatedSeconds: number;           // total time for this exercise
  primaryMuscles: string[];
  secondaryMuscles: string[];
  notes?: string;                     // form cues, modifications
  movementPattern: MovementPattern;
}

/**
 * Muscle coverage information
 */
export interface MuscleCoverage {
  name: string;
  activationLevel: 'primary' | 'secondary';
  totalSets: number;                  // sets targeting this muscle
}

export type MuscleCoverageMap = Record<string, MuscleCoverage>;

/**
 * Full prescription response
 */
export interface PrescriptionResponse {
  id: string;                         // unique prescription ID
  exercises: PrescribedExercise[];
  estimatedDuration: number;          // requested minutes
  actualDuration: number;             // calculated from exercises (minutes)
  muscleCoverage: MuscleCoverageMap;
  warmup?: PrescribedExercise[];
  cooldown?: PrescribedExercise[];
  substitutions: Record<string, PrescribedExercise[]>; // alternatives for each exercise
  constraints: PrescriptionRequest;   // echo back what was requested
  creditCost: 1;                      // always 1
  generatedAt: string;                // ISO timestamp
}

/**
 * Internal exercise representation with all constraint data
 */
export interface ExerciseWithConstraints {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  description: string | null;
  cues: string | null;
  primaryMuscles: string[];
  equipmentRequired: string[];
  equipmentOptional: string[];
  locations: LocationId[];
  isCompound: boolean;
  estimatedSeconds: number;
  restSeconds: number;
  movementPattern: MovementPattern;
  activations: Record<string, number>; // muscleId -> activation percentage
}

/**
 * Scoring weights for exercise selection
 */
export interface ScoringWeights {
  goalAlignment: number;          // +10 if matches stated goal
  compoundPreference: number;     // +5 for compound movements
  recoveryPenalty24h: number;     // -20 if muscle worked in last 24h
  recoveryPenalty48h: number;     // -10 if muscle worked in last 48h
  fitnessLevelMatch: number;      // +5 if difficulty matches user level
  muscleCoverageGap: number;      // +15 for muscles not yet covered
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  goalAlignment: 10,
  compoundPreference: 5,
  recoveryPenalty24h: -20,
  recoveryPenalty48h: -10,
  fitnessLevelMatch: 5,
  muscleCoverageGap: 15,
};

/**
 * Balance constraints
 */
export interface BalanceConstraints {
  pushPullRatioMin: number;       // 0.8
  pushPullRatioMax: number;       // 1.2
  upperLowerRatioMin: number;     // 0.6
  upperLowerRatioMax: number;     // 1.4
  maxSetsPerMuscle: number;       // 4
  minCompoundIfTime20: boolean;   // true - at least one compound if time > 20 min
}

export const DEFAULT_BALANCE_CONSTRAINTS: BalanceConstraints = {
  pushPullRatioMin: 0.8,
  pushPullRatioMax: 1.2,
  upperLowerRatioMin: 0.6,
  upperLowerRatioMax: 1.4,
  maxSetsPerMuscle: 4,
  minCompoundIfTime20: true,
};

/**
 * Goal-specific exercise preferences
 */
export const GOAL_PREFERENCES: Record<GoalType, {
  preferCompound: boolean;
  setsRange: [number, number];
  repsRange: [number, number];
  restSecondsMultiplier: number;
  preferredPatterns: MovementPattern[];
}> = {
  strength: {
    preferCompound: true,
    setsRange: [4, 6],
    repsRange: [3, 6],
    restSecondsMultiplier: 1.5,
    preferredPatterns: ['squat', 'hinge', 'push', 'pull'],
  },
  hypertrophy: {
    preferCompound: true,
    setsRange: [3, 4],
    repsRange: [8, 12],
    restSecondsMultiplier: 1.0,
    preferredPatterns: ['push', 'pull', 'squat', 'hinge'],
  },
  endurance: {
    preferCompound: false,
    setsRange: [2, 3],
    repsRange: [15, 25],
    restSecondsMultiplier: 0.5,
    preferredPatterns: ['push', 'pull', 'squat', 'core'],
  },
  mobility: {
    preferCompound: false,
    setsRange: [2, 3],
    repsRange: [10, 15],
    restSecondsMultiplier: 0.75,
    preferredPatterns: ['core', 'hinge', 'squat'],
  },
  fat_loss: {
    preferCompound: true,
    setsRange: [3, 4],
    repsRange: [12, 15],
    restSecondsMultiplier: 0.6,
    preferredPatterns: ['squat', 'hinge', 'push', 'pull'],
  },
};

/**
 * Difficulty mapping for fitness levels
 */
export const DIFFICULTY_BY_LEVEL: Record<FitnessLevel, { min: number; max: number }> = {
  beginner: { min: 1, max: 2 },
  intermediate: { min: 2, max: 3 },
  advanced: { min: 3, max: 5 },
};

/**
 * Warmup exercise templates
 */
export const WARMUP_TEMPLATES: Record<string, PrescribedExercise> = {
  'arm-circles': {
    exerciseId: 'warmup-arm-circles',
    name: 'Arm Circles',
    sets: 2,
    reps: '30s',
    restSeconds: 0,
    estimatedSeconds: 60,
    primaryMuscles: ['delt-front', 'delt-side'],
    secondaryMuscles: ['rotator-cuff'],
    movementPattern: 'isolation',
  },
  'leg-swings': {
    exerciseId: 'warmup-leg-swings',
    name: 'Leg Swings',
    sets: 2,
    reps: '30s',
    restSeconds: 0,
    estimatedSeconds: 60,
    primaryMuscles: ['hip-flexors', 'hamstring-bicep'],
    secondaryMuscles: ['glute-med'],
    movementPattern: 'isolation',
  },
  'jumping-jacks': {
    exerciseId: 'warmup-jumping-jacks',
    name: 'Jumping Jacks',
    sets: 1,
    reps: '60s',
    restSeconds: 30,
    estimatedSeconds: 90,
    primaryMuscles: ['gastrocnemius'],
    secondaryMuscles: ['delt-side'],
    movementPattern: 'core',
  },
};

/**
 * Cooldown exercise templates
 */
export const COOLDOWN_TEMPLATES: Record<string, PrescribedExercise> = {
  'deep-breathing': {
    exerciseId: 'cooldown-deep-breathing',
    name: 'Deep Breathing',
    sets: 1,
    reps: '60s',
    restSeconds: 0,
    estimatedSeconds: 60,
    primaryMuscles: [],
    secondaryMuscles: [],
    movementPattern: 'core',
  },
  'child-pose': {
    exerciseId: 'cooldown-child-pose',
    name: 'Child\'s Pose',
    sets: 1,
    reps: '60s',
    restSeconds: 0,
    estimatedSeconds: 60,
    primaryMuscles: ['erector-spinae'],
    secondaryMuscles: ['lats'],
    movementPattern: 'hinge',
  },
};
