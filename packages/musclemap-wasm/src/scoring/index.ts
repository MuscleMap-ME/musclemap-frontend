/**
 * Exercise Prescription Scoring Engine
 * 16-factor scoring system for personalized exercise recommendations
 */

let wasmModule: any = null;

export async function initScoring(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    const mod = await import('../../pkg/musclemap_scoring/musclemap_scoring.js');
    await mod.default?.();
    wasmModule = mod;
  } catch (e) {
    console.warn('[scoring] WASM module not available, using JS fallback');
    wasmModule = false;
  }
}

// Factor names
export const FACTOR_NAMES = [
  'muscle_activation',
  'equipment_match',
  'skill_level',
  'injury_safety',
  'time_efficiency',
  'fatigue_management',
  'variety_novelty',
  'progressive_overload',
  'movement_balance',
  'recovery_status',
  'goal_alignment',
  'preference_match',
  'limb_compatibility',
  'experience_appropriateness',
  'session_context',
  'historical_success',
] as const;

// Default weights (normalized)
export const DEFAULT_WEIGHTS = [
  0.15, // muscle_activation
  0.10, // equipment_match
  0.08, // skill_level
  0.12, // injury_safety
  0.05, // time_efficiency
  0.08, // fatigue_management
  0.04, // variety_novelty
  0.08, // progressive_overload
  0.06, // movement_balance
  0.06, // recovery_status
  0.08, // goal_alignment
  0.04, // preference_match
  0.02, // limb_compatibility
  0.02, // experience_appropriateness
  0.01, // session_context
  0.01, // historical_success
];

export interface ExerciseData {
  id: string;
  name: string;
  muscleActivations: Record<string, number>; // muscleId -> activation (0-100)
  equipmentRequired: string[];
  difficultyLevel: number; // 1-5
  movementPattern: string;
  isCompound: boolean;
  estimatedDuration?: number; // seconds
}

export interface UserContext {
  userId: string;
  injuredMuscles?: string[];
  availableEquipment?: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  goals?: string[];
  preferences?: {
    likedExercises?: string[];
    dislikedExercises?: string[];
    preferredEquipment?: string[];
  };
  limbRatios?: {
    armLength?: number;
    legLength?: number;
    torsoLength?: number;
  };
}

export interface WorkoutContext {
  targetMuscles: string[];
  completedExercises?: string[];
  currentFatigueLevel?: number; // 0-100
  sessionDuration?: number; // minutes
  movementPatterns?: string[]; // already used in session
}

export interface ScoringResult {
  exerciseId: string;
  totalScore: number;
  factorScores: Record<string, number>;
  recommendation: 'highly_recommended' | 'recommended' | 'neutral' | 'not_recommended';
}

export interface DetailedScoringResult extends ScoringResult {
  explanations: Record<string, string>;
  warnings?: string[];
}

/**
 * Scoring Engine with customizable weights and factors
 */
export class ScoringEngine {
  private weights: number[];
  private recentExercises: Set<string> = new Set();
  private muscleImbalances: Map<string, number> = new Map();
  private wasmEngine: any = null;

  constructor(customWeights?: number[]) {
    this.weights = customWeights || [...DEFAULT_WEIGHTS];

    if (wasmModule?.ScoringEngine) {
      this.wasmEngine = new wasmModule.ScoringEngine(this.weights);
    }
  }

  /**
   * Score a single exercise
   */
  scoreExercise(
    exercise: ExerciseData,
    user: UserContext,
    workout: WorkoutContext
  ): ScoringResult {
    if (this.wasmEngine) {
      try {
        const result = this.wasmEngine.score_exercise(
          JSON.stringify(exercise),
          JSON.stringify(user),
          JSON.stringify(workout)
        );
        return {
          exerciseId: result.exercise_id,
          totalScore: result.total_score,
          factorScores: result.factor_scores,
          recommendation: this.getRecommendation(result.total_score),
        };
      } catch {
        // Fall through to JS
      }
    }

    return this.scoreExerciseJS(exercise, user, workout);
  }

  /**
   * Score multiple exercises and return sorted by score
   */
  scoreExercises(
    exercises: ExerciseData[],
    user: UserContext,
    workout: WorkoutContext
  ): ScoringResult[] {
    if (this.wasmEngine) {
      try {
        const results = this.wasmEngine.score_exercises_batch(
          JSON.stringify(exercises),
          JSON.stringify(user),
          JSON.stringify(workout)
        );
        return results.map((r: any) => ({
          exerciseId: r.exercise_id,
          totalScore: r.total_score,
          factorScores: r.factor_scores,
          recommendation: this.getRecommendation(r.total_score),
        }));
      } catch {
        // Fall through to JS
      }
    }

    return exercises
      .map((e) => this.scoreExerciseJS(e, user, workout))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get top N recommended exercises
   */
  getRecommendations(
    exercises: ExerciseData[],
    user: UserContext,
    workout: WorkoutContext,
    count: number = 5
  ): ScoringResult[] {
    const scored = this.scoreExercises(exercises, user, workout);
    return scored.slice(0, count);
  }

  /**
   * Update recent exercises (for variety scoring)
   */
  addRecentExercise(exerciseId: string): void {
    this.recentExercises.add(exerciseId);
    if (this.wasmEngine) {
      this.wasmEngine.add_recent_exercise(exerciseId);
    }
  }

  /**
   * Update muscle imbalances
   */
  setMuscleImbalance(muscleId: string, imbalance: number): void {
    this.muscleImbalances.set(muscleId, imbalance);
    if (this.wasmEngine) {
      this.wasmEngine.set_muscle_imbalance(muscleId, imbalance);
    }
  }

  /**
   * Update weights
   */
  setWeights(weights: number[]): void {
    if (weights.length !== 16) {
      throw new Error('Must provide exactly 16 weights');
    }
    this.weights = [...weights];
    if (this.wasmEngine) {
      this.wasmEngine.set_weights(weights);
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.recentExercises.clear();
    this.muscleImbalances.clear();
    if (this.wasmEngine) {
      this.wasmEngine.clear();
    }
  }

  private scoreExerciseJS(
    exercise: ExerciseData,
    user: UserContext,
    workout: WorkoutContext
  ): ScoringResult {
    const scores: number[] = [];

    // 1. Muscle Activation (0-100)
    const targetActivation = workout.targetMuscles.reduce((sum, muscle) => {
      return sum + (exercise.muscleActivations[muscle] || 0);
    }, 0);
    scores.push(Math.min(100, targetActivation / workout.targetMuscles.length));

    // 2. Equipment Match (0 or 100)
    const hasEquipment = exercise.equipmentRequired.every(
      (eq) => user.availableEquipment?.includes(eq) ?? true
    );
    scores.push(hasEquipment ? 100 : 0);

    // 3. Skill Level Match (0-100)
    const levelMap = { beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
    const userLevel = levelMap[user.experienceLevel];
    const levelDiff = Math.abs(exercise.difficultyLevel - userLevel);
    scores.push(Math.max(0, 100 - levelDiff * 25));

    // 4. Injury Safety (0-100)
    const injuredMuscleActivation = (user.injuredMuscles || []).reduce(
      (sum, muscle) => sum + (exercise.muscleActivations[muscle] || 0),
      0
    );
    scores.push(Math.max(0, 100 - injuredMuscleActivation));

    // 5. Time Efficiency (0-100)
    const duration = exercise.estimatedDuration || 60;
    const efficiency = exercise.isCompound ? 100 : Math.max(0, 100 - duration / 2);
    scores.push(efficiency);

    // 6. Fatigue Management (0-100)
    const fatigue = workout.currentFatigueLevel || 0;
    const fatigueScore = fatigue > 70 && exercise.isCompound ? 50 : 100;
    scores.push(fatigueScore);

    // 7. Variety/Novelty (0-100)
    const isRecent = this.recentExercises.has(exercise.id);
    const isInSession = workout.completedExercises?.includes(exercise.id);
    scores.push(isInSession ? 0 : isRecent ? 50 : 100);

    // 8. Progressive Overload (0-100) - simplified
    scores.push(80); // Would need history data for accurate calculation

    // 9. Movement Balance (0-100)
    const usedPatterns = workout.movementPatterns || [];
    const isBalanced = !usedPatterns.includes(exercise.movementPattern);
    scores.push(isBalanced ? 100 : 60);

    // 10. Recovery Status (0-100) - simplified
    scores.push(80); // Would need recovery data

    // 11. Goal Alignment (0-100)
    scores.push(85); // Would need goal analysis

    // 12. Preference Match (0-100)
    const isLiked = user.preferences?.likedExercises?.includes(exercise.id);
    const isDisliked = user.preferences?.dislikedExercises?.includes(exercise.id);
    scores.push(isDisliked ? 20 : isLiked ? 100 : 70);

    // 13. Limb Compatibility (0-100) - simplified
    scores.push(85);

    // 14. Experience Appropriateness (0-100)
    scores.push(scores[2]); // Same as skill level for now

    // 15. Session Context (0-100)
    scores.push(80);

    // 16. Historical Success (0-100) - simplified
    scores.push(75);

    // Calculate weighted total
    let totalScore = 0;
    const factorScores: Record<string, number> = {};

    for (let i = 0; i < 16; i++) {
      const weightedScore = scores[i] * this.weights[i];
      totalScore += weightedScore;
      factorScores[FACTOR_NAMES[i]] = Math.round(scores[i] * 100) / 100;
    }

    return {
      exerciseId: exercise.id,
      totalScore: Math.round(totalScore * 100) / 100,
      factorScores,
      recommendation: this.getRecommendation(totalScore),
    };
  }

  private getRecommendation(
    score: number
  ): 'highly_recommended' | 'recommended' | 'neutral' | 'not_recommended' {
    if (score >= 80) return 'highly_recommended';
    if (score >= 60) return 'recommended';
    if (score >= 40) return 'neutral';
    return 'not_recommended';
  }
}

/**
 * Simple scoring function for single exercise
 */
export function scoreExerciseSimple(
  factorScores: number[],
  weights: number[] = DEFAULT_WEIGHTS
): number {
  if (wasmModule?.score_exercise_simple) {
    return wasmModule.score_exercise_simple(factorScores, weights);
  }

  // JS fallback
  let total = 0;
  for (let i = 0; i < Math.min(factorScores.length, weights.length); i++) {
    total += factorScores[i] * weights[i];
  }
  return Math.round(total * 100) / 100;
}
