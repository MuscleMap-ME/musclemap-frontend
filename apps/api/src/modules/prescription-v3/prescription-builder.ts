/**
 * Prescription Engine v3.0 - Prescription Builder
 *
 * Builds optimized workout prescriptions with:
 * - Intelligent exercise ordering (compounds first, skill-based sequencing)
 * - Superset and circuit optimization
 * - Warmup and cooldown generation
 * - Progressive overload integration
 */

import type {
  ExerciseMetadataV3,
  ScoredExerciseV3,
  SupersetPair,
  UserContextV3,
  Goal,
  MovementPattern,
  PrescriptionResultV3,
  SubstituteInfo,
} from './types';
import { LoadCalculator, loadCalculator } from './load-calculator';
import type { UserExercisePerformance } from './types';

// ============================================
// ORDERING RULES
// ============================================

// Movement patterns that should come first (skill/CNS dependent)
const PRIORITY_PATTERNS: MovementPattern[] = [
  'olympic',        // Highest skill, do when fresh
  'plyometric',     // Explosive, needs CNS freshness
  'hip_hinge',      // Heavy compounds
  'squat',          // Heavy compounds
  'vertical_push',
  'horizontal_push',
  'vertical_pull',
  'horizontal_pull',
  'lunge',
  'carry',
  'rotation',
  'anti_rotation',
  'stability',
  'isolation_upper',
  'isolation_lower',
  'flexion',
  'extension',
  'mobility',
];

// Superset pairing rules (agonist-antagonist)
const SUPERSET_PAIRS: [MovementPattern, MovementPattern][] = [
  ['horizontal_push', 'horizontal_pull'],
  ['vertical_push', 'vertical_pull'],
  ['squat', 'hip_hinge'],
  ['flexion', 'extension'],
  ['isolation_upper', 'isolation_upper'], // Biceps/triceps
];

// ============================================
// PRESCRIPTION BUILDER
// ============================================

export class PrescriptionBuilder {
  private loadCalculator: LoadCalculator;

  constructor() {
    this.loadCalculator = loadCalculator;
  }

  /**
   * Build a complete prescription from scored exercises
   */
  async buildPrescription(
    scoredExercises: ScoredExerciseV3[],
    userContext: UserContextV3,
    request: {
      maxExercises?: number;
      includeWarmup?: boolean;
      includeCooldown?: boolean;
      includeSupersets?: boolean;
      preferredIntensity?: 'light' | 'moderate' | 'intense';
    },
    performanceMap: Map<string, UserExercisePerformance>,
    allExercises: ExerciseMetadataV3[]
  ): Promise<Omit<PrescriptionResultV3, 'metadata'>> {
    const startTime = Date.now();

    // Calculate max exercises based on time
    const maxExercises = request.maxExercises ||
      this.calculateMaxExercises(userContext.timeAvailable, userContext.goals[0]);

    // Select and order exercises
    const selected = this.selectExercises(scoredExercises, maxExercises, userContext);

    // Order exercises optimally
    const ordered = this.orderExercises(selected, userContext.goals);

    // Find supersets if requested
    const supersets = request.includeSupersets
      ? this.findSupersets(ordered)
      : [];

    // Generate warmup
    const warmup = request.includeWarmup
      ? await this.generateWarmup(ordered, allExercises, userContext)
      : [];

    // Generate cooldown
    const cooldown = request.includeCooldown
      ? await this.generateCooldown(ordered, allExercises, userContext)
      : [];

    // Add substitutes to each exercise
    const withSubstitutes = this.addSubstitutes(ordered, allExercises);

    // Calculate coverage metrics
    const muscleCoverage = this.calculateMuscleCoverage(withSubstitutes);
    const patternBalance = this.calculatePatternBalance(withSubstitutes);

    // Estimate duration
    const targetDuration = userContext.timeAvailable;
    const actualDuration = this.estimateDuration(withSubstitutes, warmup, cooldown, supersets);

    // Determine difficulty
    const difficulty = this.determineDifficulty(
      withSubstitutes,
      userContext.recoveryScore?.classification
    );

    return {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId: userContext.userId,
      exercises: withSubstitutes,
      warmup,
      cooldown,
      supersets,
      targetDuration,
      actualDuration,
      muscleCoverage,
      movementPatternBalance: patternBalance,
      difficulty,
      periodizationPhase: userContext.currentPhase,
      recoveryAdjusted: !!userContext.recoveryScore,
    };
  }

  /**
   * Calculate max exercises based on time and goals
   */
  private calculateMaxExercises(timeMinutes: number, primaryGoal: Goal): number {
    // Estimate time per exercise based on goal
    const timePerExercise: Record<Goal, number> = {
      strength: 8,      // Longer rest periods
      power: 8,
      hypertrophy: 6,   // Moderate rest
      endurance: 4,     // Short rest
      fat_loss: 4,      // Circuit style
      rehabilitation: 5,
      flexibility: 3,
      athletic: 6,
    };

    const avgTime = timePerExercise[primaryGoal] || 6;
    const warmupCooldown = 10; // Reserve 10 minutes

    return Math.max(3, Math.min(12, Math.floor((timeMinutes - warmupCooldown) / avgTime)));
  }

  /**
   * Select exercises ensuring variety and balance
   */
  private selectExercises(
    scored: ScoredExerciseV3[],
    maxCount: number,
    context: UserContextV3
  ): ScoredExerciseV3[] {
    const selected: ScoredExerciseV3[] = [];
    const selectedPatterns = new Set<MovementPattern>();
    const selectedMuscles = new Set<string>();

    // If recovery is poor, reduce count
    let adjustedMax = maxCount;
    if (context.recoveryScore?.classification === 'poor') {
      adjustedMax = Math.max(3, Math.floor(maxCount * 0.6));
    } else if (context.recoveryScore?.classification === 'fair') {
      adjustedMax = Math.max(4, Math.floor(maxCount * 0.8));
    }

    // Sort by score (already sorted, but ensure it)
    const sortedExercises = [...scored].sort((a, b) => b.score - a.score);

    for (const exercise of sortedExercises) {
      if (selected.length >= adjustedMax) break;

      // Ensure pattern variety (max 2 of same pattern)
      const patternCount = selected.filter(e => e.movementPattern === exercise.movementPattern).length;
      if (patternCount >= 2) continue;

      // Ensure muscle variety
      const newMuscles = exercise.primaryMuscles.filter(m => !selectedMuscles.has(m));
      if (newMuscles.length === 0 && selected.length >= 3) continue;

      selected.push(exercise);
      selectedPatterns.add(exercise.movementPattern);
      exercise.primaryMuscles.forEach(m => selectedMuscles.add(m));
    }

    return selected;
  }

  /**
   * Order exercises for optimal performance
   */
  private orderExercises(exercises: ScoredExerciseV3[], goals: Goal[]): ScoredExerciseV3[] {
    const primaryGoal = goals[0] || 'hypertrophy';

    // For strength: compounds first, ordered by CNS demand
    if (primaryGoal === 'strength' || primaryGoal === 'power') {
      return this.orderByPriorityAndCNS(exercises);
    }

    // For hypertrophy: compounds first, then antagonist pairing potential
    if (primaryGoal === 'hypertrophy') {
      return this.orderForHypertrophy(exercises);
    }

    // For fat loss/endurance: circuit-friendly ordering
    if (primaryGoal === 'fat_loss' || primaryGoal === 'endurance') {
      return this.orderForCircuit(exercises);
    }

    // Default: priority-based ordering
    return this.orderByPriorityAndCNS(exercises);
  }

  /**
   * Order by movement priority and CNS load (for strength)
   */
  private orderByPriorityAndCNS(exercises: ScoredExerciseV3[]): ScoredExerciseV3[] {
    return [...exercises].sort((a, b) => {
      // First by movement pattern priority
      const priorityA = PRIORITY_PATTERNS.indexOf(a.movementPattern);
      const priorityB = PRIORITY_PATTERNS.indexOf(b.movementPattern);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by CNS load (higher first)
      const cnsA = a.scoreBreakdown.recoveryAppropriate || 5;
      const cnsB = b.scoreBreakdown.recoveryAppropriate || 5;

      return cnsB - cnsA;
    });
  }

  /**
   * Order for hypertrophy (pair-friendly)
   */
  private orderForHypertrophy(exercises: ScoredExerciseV3[]): ScoredExerciseV3[] {
    // Separate into compounds and isolation
    const compounds = exercises.filter(e =>
      !e.movementPattern.includes('isolation') &&
      e.movementPattern !== 'flexion' &&
      e.movementPattern !== 'extension'
    );
    const isolation = exercises.filter(e =>
      e.movementPattern.includes('isolation') ||
      e.movementPattern === 'flexion' ||
      e.movementPattern === 'extension'
    );

    // Sort compounds by CNS load
    compounds.sort((a, b) => {
      const priorityA = PRIORITY_PATTERNS.indexOf(a.movementPattern);
      const priorityB = PRIORITY_PATTERNS.indexOf(b.movementPattern);
      return priorityA - priorityB;
    });

    // Isolation at the end
    return [...compounds, ...isolation];
  }

  /**
   * Order for circuit training
   */
  private orderForCircuit(exercises: ScoredExerciseV3[]): ScoredExerciseV3[] {
    // Alternate upper and lower body
    const upper: ScoredExerciseV3[] = [];
    const lower: ScoredExerciseV3[] = [];
    const core: ScoredExerciseV3[] = [];

    for (const exercise of exercises) {
      const pattern = exercise.movementPattern;
      if (pattern.includes('push') || pattern.includes('pull') || pattern === 'isolation_upper') {
        upper.push(exercise);
      } else if (pattern === 'squat' || pattern === 'hip_hinge' || pattern === 'lunge' || pattern === 'isolation_lower') {
        lower.push(exercise);
      } else {
        core.push(exercise);
      }
    }

    // Interleave for minimal local fatigue
    const ordered: ScoredExerciseV3[] = [];
    const maxLen = Math.max(upper.length, lower.length, core.length);

    for (let i = 0; i < maxLen; i++) {
      if (upper[i]) ordered.push(upper[i]);
      if (lower[i]) ordered.push(lower[i]);
      if (core[i]) ordered.push(core[i]);
    }

    return ordered;
  }

  /**
   * Find optimal superset pairs
   */
  private findSupersets(exercises: ScoredExerciseV3[]): SupersetPair[] {
    const pairs: SupersetPair[] = [];
    const used = new Set<string>();

    for (const [pattern1, pattern2] of SUPERSET_PAIRS) {
      // Find matching exercises not yet used
      const ex1 = exercises.find(e =>
        e.movementPattern === pattern1 && !used.has(e.exerciseId)
      );
      const ex2 = exercises.find(e =>
        e.movementPattern === pattern2 && !used.has(e.exerciseId) && e.exerciseId !== ex1?.exerciseId
      );

      if (ex1 && ex2) {
        // Create minimal metadata objects for superset rest calculation
        const ex1Meta = {
          movementPattern: ex1.movementPattern,
          muscleActivation: {
            primary: ex1.primaryMuscles.map(m => ({ muscleId: m, activation: 80 })),
            secondary: [],
            stabilizers: [],
          },
        } as unknown as ExerciseMetadataV3;
        const ex2Meta = {
          movementPattern: ex2.movementPattern,
          muscleActivation: {
            primary: ex2.primaryMuscles.map(m => ({ muscleId: m, activation: 80 })),
            secondary: [],
            stabilizers: [],
          },
        } as unknown as ExerciseMetadataV3;
        const restTimes = this.loadCalculator.calculateSupersetRest(ex1Meta, ex2Meta);

        pairs.push({
          exercise1: ex1,
          exercise2: ex2,
          restBetween: restTimes.restBetween,
          restAfter: restTimes.restAfter,
          rationale: `${pattern1}/${pattern2} pairing - opposing muscle groups`,
        });

        used.add(ex1.exerciseId);
        used.add(ex2.exerciseId);
      }
    }

    return pairs;
  }

  /**
   * Generate warmup exercises
   */
  private async generateWarmup(
    mainExercises: ScoredExerciseV3[],
    allExercises: ExerciseMetadataV3[],
    _context: UserContextV3
  ): Promise<ScoredExerciseV3[]> {
    // Get target muscles from main exercises
    const targetMuscles = new Set(mainExercises.flatMap(e => e.primaryMuscles));
    const targetPatterns = new Set(mainExercises.map(e => e.movementPattern));

    // Find mobility/activation exercises
    const warmupExercises = allExercises.filter(e =>
      e.movementPattern === 'mobility' ||
      e.movementPattern === 'stability' ||
      (e.performanceMetrics.cnsLoadFactor <= 3 &&
       e.muscleActivation.primary.some(m => targetMuscles.has(m.muscleId)))
    );

    // Select up to 4 warmup exercises
    const selected = warmupExercises.slice(0, 4);

    return selected.map(e => ({
      exerciseId: e.id,
      name: e.name,
      type: e.category,
      movementPattern: e.movementPattern,
      score: 100,
      scoreBreakdown: {
        equipmentMatch: 25,
        goalEffectiveness: 15,
        muscleTargetMatch: 10,
        biomechanicalFit: 8,
        skillAppropriate: 7,
        userPreference: 5,
        performanceHistory: 5,
        recoveryAppropriate: 8,
        injurySafe: 7,
        jointStressAcceptable: 5,
        periodizationAlignment: 4,
        varietyOptimization: 3,
        movementPatternBalance: 3,
        progressionOpportunity: 0,
        timeEfficiency: 0,
        equipmentOptimization: 0,
        totalScore: 100,
      },
      sets: 1,
      reps: 10,
      rpe: 4,
      restSeconds: 30,
      primaryMuscles: e.muscleActivation.primary.map(m => m.muscleId),
      secondaryMuscles: e.muscleActivation.secondary.map(m => m.muscleId),
      notes: ['Focus on controlled movement', 'Prepare the body for main workout'],
      substitutes: [],
      reasoning: 'Warmup - activating target muscles',
    }));
  }

  /**
   * Generate cooldown exercises
   */
  private async generateCooldown(
    mainExercises: ScoredExerciseV3[],
    allExercises: ExerciseMetadataV3[],
    _context: UserContextV3
  ): Promise<ScoredExerciseV3[]> {
    // Get muscles worked
    const workedMuscles = new Set(mainExercises.flatMap(e => e.primaryMuscles));

    // Find stretching/mobility exercises for worked muscles
    const cooldownExercises = allExercises.filter(e =>
      e.movementPattern === 'mobility' &&
      e.muscleActivation.primary.some(m => workedMuscles.has(m.muscleId))
    );

    // Select up to 3 cooldown exercises
    const selected = cooldownExercises.slice(0, 3);

    return selected.map(e => ({
      exerciseId: e.id,
      name: e.name,
      type: e.category,
      movementPattern: e.movementPattern,
      score: 100,
      scoreBreakdown: {
        equipmentMatch: 25,
        goalEffectiveness: 15,
        muscleTargetMatch: 10,
        biomechanicalFit: 8,
        skillAppropriate: 7,
        userPreference: 5,
        performanceHistory: 5,
        recoveryAppropriate: 8,
        injurySafe: 7,
        jointStressAcceptable: 5,
        periodizationAlignment: 4,
        varietyOptimization: 3,
        movementPatternBalance: 3,
        progressionOpportunity: 0,
        timeEfficiency: 0,
        equipmentOptimization: 0,
        totalScore: 100,
      },
      sets: 1,
      reps: 1,
      rpe: 3,
      restSeconds: 0,
      primaryMuscles: e.muscleActivation.primary.map(m => m.muscleId),
      secondaryMuscles: e.muscleActivation.secondary.map(m => m.muscleId),
      notes: ['Hold for 30-60 seconds', 'Breathe deeply and relax'],
      substitutes: [],
      reasoning: 'Cooldown - promoting recovery',
    }));
  }

  /**
   * Add substitute recommendations to exercises
   */
  private addSubstitutes(
    exercises: ScoredExerciseV3[],
    allExercises: ExerciseMetadataV3[]
  ): ScoredExerciseV3[] {
    return exercises.map(exercise => {
      const metadata = allExercises.find(e => e.id === exercise.exerciseId);
      if (!metadata) return exercise;

      const substitutes: SubstituteInfo[] = [];

      // Add regressions as substitutes
      for (const regId of metadata.progressionTree.regressions.slice(0, 2)) {
        const regExercise = allExercises.find(e => e.id === regId);
        if (regExercise) {
          substitutes.push({
            exerciseId: regId,
            name: regExercise.name,
            similarityScore: 85,
            differenceNotes: 'Easier variation - less load/complexity',
            whenToPrefer: ['When fatigued', 'For beginners', 'During deload'],
          });
        }
      }

      // Add lateral variations
      for (const varId of metadata.progressionTree.lateralVariations.slice(0, 2)) {
        const varExercise = allExercises.find(e => e.id === varId);
        if (varExercise) {
          substitutes.push({
            exerciseId: varId,
            name: varExercise.name,
            similarityScore: 90,
            differenceNotes: 'Different stimulus, same difficulty',
            whenToPrefer: ['For variety', 'Equipment availability'],
          });
        }
      }

      return {
        ...exercise,
        substitutes,
      };
    });
  }

  /**
   * Calculate muscle coverage map
   */
  private calculateMuscleCoverage(exercises: ScoredExerciseV3[]): Record<string, number> {
    const coverage: Record<string, number> = {};

    for (const exercise of exercises) {
      const volume = exercise.sets * (typeof exercise.reps === 'number' ? exercise.reps : 10);

      for (const muscle of exercise.primaryMuscles) {
        coverage[muscle] = (coverage[muscle] || 0) + volume;
      }

      for (const muscle of exercise.secondaryMuscles || []) {
        coverage[muscle] = (coverage[muscle] || 0) + Math.round(volume * 0.5);
      }
    }

    return coverage;
  }

  /**
   * Calculate movement pattern balance
   */
  private calculatePatternBalance(exercises: ScoredExerciseV3[]): Record<MovementPattern, number> {
    const balance: Partial<Record<MovementPattern, number>> = {};

    for (const exercise of exercises) {
      const pattern = exercise.movementPattern;
      balance[pattern] = (balance[pattern] || 0) + 1;
    }

    return balance as Record<MovementPattern, number>;
  }

  /**
   * Estimate workout duration
   */
  private estimateDuration(
    exercises: ScoredExerciseV3[],
    warmup: ScoredExerciseV3[],
    cooldown: ScoredExerciseV3[],
    supersets: SupersetPair[]
  ): number {
    let totalSeconds = 0;

    // Warmup: ~40s per exercise
    totalSeconds += warmup.length * 40;

    // Create set of supersetted exercises
    const supersetExercises = new Set<string>();
    for (const pair of supersets) {
      supersetExercises.add(pair.exercise1.exerciseId);
      supersetExercises.add(pair.exercise2.exerciseId);
    }

    // Main exercises
    for (const exercise of exercises) {
      if (supersetExercises.has(exercise.exerciseId)) continue; // Counted in supersets

      const reps = typeof exercise.reps === 'number' ? exercise.reps : 10;
      const setTime = Math.round(reps * 3); // ~3 seconds per rep
      const totalSetTime = exercise.sets * setTime;
      const totalRestTime = (exercise.sets - 1) * exercise.restSeconds;
      totalSeconds += totalSetTime + totalRestTime + 60; // +60 for setup/transition
    }

    // Supersets (more time-efficient)
    for (const pair of supersets) {
      const ex1 = pair.exercise1;
      const ex2 = pair.exercise2;

      const reps1 = typeof ex1.reps === 'number' ? ex1.reps : 10;
      const reps2 = typeof ex2.reps === 'number' ? ex2.reps : 10;

      const sets = Math.max(ex1.sets, ex2.sets);
      const setTime = (reps1 + reps2) * 3;

      for (let i = 0; i < sets; i++) {
        totalSeconds += setTime;
        totalSeconds += pair.restBetween;
        if (i < sets - 1) totalSeconds += pair.restAfter;
      }
      totalSeconds += 60; // Setup time
    }

    // Cooldown: ~45s per stretch
    totalSeconds += cooldown.length * 45;

    return Math.round(totalSeconds / 60);
  }

  /**
   * Determine workout difficulty rating
   */
  private determineDifficulty(
    exercises: ScoredExerciseV3[],
    recoveryClassification?: string
  ): 'easy' | 'moderate' | 'intense' | 'brutal' {
    if (exercises.length === 0) return 'easy';

    // Calculate average intensity metrics
    const avgRPE = exercises.reduce((sum, e) => sum + (e.rpe || 7), 0) / exercises.length;
    const totalVolume = exercises.reduce((sum, e) => {
      const reps = typeof e.reps === 'number' ? e.reps : 10;
      return sum + (e.sets * reps);
    }, 0);

    // Recovery-adjusted difficulty
    if (recoveryClassification === 'poor' || recoveryClassification === 'fair') {
      if (avgRPE > 7 || totalVolume > 100) return 'moderate';
      return 'easy';
    }

    // Normal difficulty calculation
    if (avgRPE >= 9 && totalVolume >= 150) return 'brutal';
    if (avgRPE >= 8 || totalVolume >= 120) return 'intense';
    if (avgRPE >= 7 || totalVolume >= 80) return 'moderate';
    return 'easy';
  }
}

// Export singleton
export const prescriptionBuilder = new PrescriptionBuilder();
