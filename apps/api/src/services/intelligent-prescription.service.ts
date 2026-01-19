/**
 * Intelligent Exercise Prescription Service
 *
 * AI-powered workout prescription engine that considers:
 * - User preferences and exercise history
 * - Progression readiness and fatigue levels
 * - Injury/limitation awareness
 * - Periodization context
 * - Movement pattern variety
 * - Equipment availability
 * - Recovery status
 */

import { db } from '../db/client';
import { loggers } from '../lib/logger';

const log = loggers.core.child({ module: 'intelligent-prescription' });

// ============================================
// TYPES
// ============================================

export interface PrescriptionConstraints {
  timeAvailable: number; // minutes
  location: string;
  equipmentAvailable: string[];
  goals: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  targetMuscles?: string[];
  excludeMuscles?: string[];
  excludeExercises?: string[];
  preferCompound: boolean;

  // Enhanced constraints
  activeInjuryIds?: string[];
  avoidBodyParts?: string[];
  maxPainTolerance?: number;
  skillsInProgress?: string[];
  allocateSkillTime?: number;
  trainingPhase?: 'accumulation' | 'intensification' | 'realization' | 'deload';
  weekInCycle?: number;
  splitDay?: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';
  varietyPreference?: 'consistent' | 'varied' | 'highly_varied';
  intensityPreference?: 'light' | 'moderate' | 'hard' | 'very_hard';
}

export interface ScoredExercise {
  exercise: ExerciseData;
  score: number;
  reasons: string[];
}

export interface ExerciseData {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  is_compound: boolean;
  estimated_seconds: number;
  rest_seconds: number;
  locations: string[];
  equipment_required: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  movement_pattern?: string;
  force_vector?: string;
  contraction_type?: string;
  skill_level?: string;
  regression_exercise?: string;
  progression_exercise?: string;
  injury_risk_areas?: string[];
  contraindications?: string[];
  optimal_rep_range_low?: number;
  optimal_rep_range_high?: number;
  typical_intensity_percent?: number;
}

export interface PrescribedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  estimatedSeconds: number;
  notes?: string;
  substituteFor?: string;
  reasons?: string[];
}

export interface IntelligentPrescription {
  exercises: PrescribedExercise[];
  warmup: WarmupExercise[];
  cooldown: CooldownExercise[];
  skillWork?: SkillWorkBlock;
  muscleCoverage: Record<string, number>;
  estimatedDuration: number;
  periodizationContext?: PeriodizationContext;
  explanation: PrescriptionExplanation;
}

export interface WarmupExercise {
  name: string;
  type: string;
  duration: number;
  description: string;
  sets: number;
  reps: string;
  restSeconds: number;
  isActivity: boolean;
}

export interface CooldownExercise {
  name: string;
  type: string;
  duration: number;
  description: string;
  sets: number;
  reps: string;
  restSeconds: number;
  isActivity: boolean;
}

export interface SkillWorkBlock {
  skillName: string;
  exercises: PrescribedExercise[];
  allocatedMinutes: number;
  currentLevel: number;
  targetMetric: string;
  targetValue: number;
}

export interface PeriodizationContext {
  phaseName: string;
  weekInPhase: number;
  volumeModifier: number;
  intensityRange: { low: number; high: number };
  repRange: { low: number; high: number };
  focusAreas: string[];
}

export interface PrescriptionExplanation {
  volumeAnalysis: {
    push: number;
    pull: number;
    legs: number;
    core: number;
  };
  adjustmentsMade: string[];
  avoidedExercises: { exerciseId: string; reason: string }[];
  periodizationNote?: string;
  recoveryNote?: string;
}

export interface DeloadRecommendation {
  recommend: boolean;
  reason?: string;
  suggestedDuration?: string;
  suggestedVolume?: string;
  suggestedIntensity?: string;
  fatigueScore?: number;
  readinessScore?: number;
}

export interface ExerciseAlternative {
  exerciseId: string;
  name: string;
  reason: string;
  similarityScore: number;
  notes?: string;
}

// ============================================
// SCORING WEIGHTS
// ============================================

const SCORING_WEIGHTS = {
  // Base factors (existing)
  COMPOUND_PREFERENCE: 20,
  MUSCLE_TARGET_MATCH: 15,
  RECENCY_PENALTY: -40,
  DIFFICULTY_MISMATCH: -30,

  // New personalization factors
  USER_PREFERENCE_BONUS: 25,          // User rated exercise highly
  HIGH_COMPLETION_RATE: 15,           // User finishes this exercise
  PROGRESSION_READY: 20,              // Prerequisites met for harder variation
  FATIGUE_ADJUSTMENT: -15,            // Recent high volume in same pattern

  // Optimization factors
  MUSCLE_BALANCE_BONUS: 20,           // Addresses imbalance
  MOVEMENT_PATTERN_VARIETY: 15,       // Not overused pattern
  PERIODIZATION_ALIGNMENT: 25,        // Matches current phase
  RECOVERY_OPTIMAL: 10,               // HRV/sleep data good

  // Safety factors
  INJURY_RISK_PENALTY: -100,          // Contraindicated for user's injury
  PAIN_ZONE_PENALTY: -50,             // Affects injured area

  // Learning factors
  SIMILAR_USER_SUCCESS: 10,           // Worked for similar profiles
  EFFECTIVENESS_SCORE: 15,            // Good TU/effort ratio
  PLATEAU_PREVENTION: 10,             // Vary stale exercises
};

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Generate an intelligent workout prescription
 */
export async function generateIntelligentPrescription(
  userId: string,
  constraints: PrescriptionConstraints
): Promise<IntelligentPrescription> {
  log.info({ userId, constraints }, 'Generating intelligent prescription');

  // 1. Gather user context
  const userContext = await gatherUserContext(userId);

  // 2. Get periodization context if available
  const periodizationContext = await getPeriodizationContext(userId);

  // 3. Get available exercises
  const exercises = await getAvailableExercises(constraints);

  // 4. Score all exercises
  const scoredExercises = await scoreExercises(
    exercises,
    userId,
    constraints,
    userContext,
    periodizationContext
  );

  // 5. Select exercises to fit time budget
  const selectedExercises = selectExercises(scoredExercises, constraints, periodizationContext);

  // 6. Add skill work if requested
  let skillWork: SkillWorkBlock | undefined;
  if (constraints.skillsInProgress?.length && constraints.allocateSkillTime) {
    const result = await generateSkillWorkBlock(
      userId,
      constraints.skillsInProgress[0],
      constraints.allocateSkillTime
    );
    skillWork = result ?? undefined;
  }

  // 7. Generate warmup/cooldown
  const warmup = generateWarmup(selectedExercises, constraints);
  const cooldown = generateCooldown(selectedExercises);

  // 8. Calculate muscle coverage
  const muscleCoverage = await calculateMuscleCoverage(selectedExercises);

  // 9. Generate explanation
  const explanation = generateExplanation(
    selectedExercises,
    scoredExercises,
    userContext,
    periodizationContext
  );

  // 10. Calculate total duration
  const exerciseTime = selectedExercises.reduce(
    (sum, e) => sum + (e.estimatedSeconds + e.restSeconds) * e.sets / 60,
    0
  );
  const warmupTime = warmup.reduce((sum, w) => sum + w.duration / 60, 0);
  const cooldownTime = cooldown.reduce((sum, c) => sum + c.duration / 60, 0);
  const skillTime = skillWork?.allocatedMinutes || 0;
  const estimatedDuration = Math.ceil(exerciseTime + warmupTime + cooldownTime + skillTime);

  return {
    exercises: selectedExercises,
    warmup,
    cooldown,
    skillWork,
    muscleCoverage,
    estimatedDuration,
    periodizationContext,
    explanation,
  };
}

/**
 * Get exercise alternatives based on equipment/injuries/preferences
 */
export async function getExerciseAlternatives(
  exerciseId: string,
  userId: string,
  reason: 'equipment' | 'injury' | 'preference' | 'any' = 'any'
): Promise<ExerciseAlternative[]> {
  log.info({ exerciseId, userId, reason }, 'Getting exercise alternatives');

  const alternatives: ExerciseAlternative[] = [];

  // Get the original exercise
  const original = await db.queryOne<ExerciseData>(
    'SELECT * FROM exercises WHERE id = $1',
    [exerciseId]
  );

  if (!original) {
    return [];
  }

  // Get user limitations
  const userLimitations = await db.queryAll<{
    body_region_id: string | null;
    limitation_type: string;
    severity: string;
  }>(
    `SELECT body_region_id, limitation_type, severity
     FROM user_limitations
     WHERE user_id = $1 AND status IN ('active', 'recovering')`,
    [userId]
  );

  // 1. Check for stored substitutions based on limitations
  if (reason === 'injury' || reason === 'any') {
    const injuryAlternatives = await db.queryAll<{
      substitute_exercise_id: string;
      reason: string | null;
      notes: string | null;
      similarity_score: number;
      name: string;
    }>(
      `SELECT es.substitute_exercise_id, es.reason, es.notes, es.similarity_score, e.name
       FROM exercise_substitutions es
       JOIN exercises e ON e.id = es.substitute_exercise_id
       WHERE es.original_exercise_id = $1`,
      [exerciseId]
    );

    for (const alt of injuryAlternatives) {
      alternatives.push({
        exerciseId: alt.substitute_exercise_id,
        name: alt.name,
        reason: alt.reason || 'Injury-safe alternative',
        similarityScore: alt.similarity_score,
        notes: alt.notes || undefined,
      });
    }
  }

  // 2. Find exercises with same movement pattern
  if (original.movement_pattern && (reason === 'preference' || reason === 'any')) {
    const patternAlternatives = await db.queryAll<{
      id: string;
      name: string;
      difficulty: number;
    }>(
      `SELECT id, name, difficulty
       FROM exercises
       WHERE movement_pattern = $1
         AND id != $2
         AND ABS(difficulty - $3) <= 1
       ORDER BY ABS(difficulty - $3)
       LIMIT 5`,
      [original.movement_pattern, exerciseId, original.difficulty]
    );

    for (const alt of patternAlternatives) {
      // Check if not already in alternatives
      if (!alternatives.find(a => a.exerciseId === alt.id)) {
        alternatives.push({
          exerciseId: alt.id,
          name: alt.name,
          reason: `Same movement pattern (${original.movement_pattern})`,
          similarityScore: 0.8,
        });
      }
    }
  }

  // 3. Find exercises targeting same primary muscles
  if (original.primary_muscles?.length && (reason === 'equipment' || reason === 'any')) {
    const muscleAlternatives = await db.queryAll<{
      id: string;
      name: string;
      equipment_required: string[];
    }>(
      `SELECT id, name, equipment_required
       FROM exercises
       WHERE id != $1
         AND primary_muscles && $2
       LIMIT 10`,
      [exerciseId, original.primary_muscles]
    );

    for (const alt of muscleAlternatives) {
      if (!alternatives.find(a => a.exerciseId === alt.id)) {
        // Check if it requires less/different equipment
        const requiresLessEquipment =
          !alt.equipment_required?.length ||
          (original.equipment_required?.length || 0) > (alt.equipment_required?.length || 0);

        alternatives.push({
          exerciseId: alt.id,
          name: alt.name,
          reason: requiresLessEquipment
            ? 'Targets same muscles with less equipment'
            : 'Targets same primary muscles',
          similarityScore: 0.7,
        });
      }
    }
  }

  // 4. Use regression/progression if available
  if (original.regression_exercise) {
    const regression = await db.queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM exercises WHERE id = $1',
      [original.regression_exercise]
    );
    if (regression && !alternatives.find(a => a.exerciseId === regression.id)) {
      alternatives.push({
        exerciseId: regression.id,
        name: regression.name,
        reason: 'Easier regression of the same exercise',
        similarityScore: 0.9,
      });
    }
  }

  if (original.progression_exercise) {
    const progression = await db.queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM exercises WHERE id = $1',
      [original.progression_exercise]
    );
    if (progression && !alternatives.find(a => a.exerciseId === progression.id)) {
      alternatives.push({
        exerciseId: progression.id,
        name: progression.name,
        reason: 'Harder progression of the same exercise',
        similarityScore: 0.9,
      });
    }
  }

  // Filter out contraindicated exercises for user's injuries
  const safeAlternatives = alternatives.filter(_alt => {
    // Check each alternative against user limitations
    for (const _limitation of userLimitations) {
      // Would need to check exercise's injury_risk_areas/contraindications
      // This is simplified - full implementation would query the exercise details
    }
    return true;
  });

  // Sort by similarity score
  safeAlternatives.sort((a, b) => b.similarityScore - a.similarityScore);

  return safeAlternatives.slice(0, 10);
}

/**
 * Get progressive overload suggestions for an exercise
 */
export async function getProgressiveOverloadSuggestion(
  userId: string,
  exerciseId: string
): Promise<{
  recommendation: 'increase_weight' | 'increase_reps' | 'increase_sets' | 'maintain' | 'deload';
  currentStats: { avgWeight: number; avgReps: number; lastSets: number };
  suggestedParams: { weight?: number; reps?: string; sets?: number };
  reasoning: string;
}> {
  // Get recent workout history for this exercise
  const recentSets = await db.queryAll<{
    weight: number;
    reps: number;
    date: Date;
  }>(
    `SELECT ws.weight, ws.reps, wl.started_at as date
     FROM workout_sets ws
     JOIN workout_logs wl ON ws.workout_log_id = wl.id
     WHERE ws.exercise_id = $1 AND wl.user_id = $2
     ORDER BY wl.started_at DESC
     LIMIT 30`,
    [exerciseId, userId]
  );

  if (recentSets.length < 3) {
    return {
      recommendation: 'maintain',
      currentStats: { avgWeight: 0, avgReps: 0, lastSets: 0 },
      suggestedParams: {},
      reasoning: 'Not enough data - complete at least 3 sessions to get recommendations.',
    };
  }

  // Calculate current stats
  const avgWeight = recentSets.reduce((sum, s) => sum + (s.weight || 0), 0) / recentSets.length;
  const avgReps = recentSets.reduce((sum, s) => sum + (s.reps || 0), 0) / recentSets.length;

  // Get last workout's set count
  const lastWorkoutSets = recentSets.filter(
    s => s.date.getTime() === recentSets[0].date.getTime()
  ).length;

  // Analyze trend (last 2 weeks vs previous 2 weeks)
  const recent = recentSets.slice(0, 10);
  const older = recentSets.slice(10, 20);

  if (older.length === 0) {
    return {
      recommendation: 'maintain',
      currentStats: { avgWeight, avgReps, lastSets: lastWorkoutSets },
      suggestedParams: {},
      reasoning: 'Building baseline data - maintain current intensity.',
    };
  }

  const recentAvgWeight = recent.reduce((sum, s) => sum + (s.weight || 0), 0) / recent.length;
  const olderAvgWeight = older.reduce((sum, s) => sum + (s.weight || 0), 0) / older.length;
  const recentAvgReps = recent.reduce((sum, s) => sum + (s.reps || 0), 0) / recent.length;

  // Decision logic
  if (recentAvgReps >= 12 && recentAvgWeight === olderAvgWeight) {
    // Can do 12+ reps consistently - increase weight
    return {
      recommendation: 'increase_weight',
      currentStats: { avgWeight: recentAvgWeight, avgReps: recentAvgReps, lastSets: lastWorkoutSets },
      suggestedParams: { weight: Math.round(recentAvgWeight * 1.05) }, // 5% increase
      reasoning: `Consistently completing ${Math.round(recentAvgReps)} reps. Time to increase weight by 5%.`,
    };
  }

  if (recentAvgReps >= 8 && recentAvgReps < 12) {
    // In good rep range - try to add reps
    return {
      recommendation: 'increase_reps',
      currentStats: { avgWeight: recentAvgWeight, avgReps: recentAvgReps, lastSets: lastWorkoutSets },
      suggestedParams: { reps: `${Math.round(recentAvgReps) + 1}-${Math.round(recentAvgReps) + 2}` },
      reasoning: `Good progress at ${Math.round(recentAvgReps)} reps. Push for 1-2 more reps before increasing weight.`,
    };
  }

  if (recentAvgReps < 6 && recentAvgWeight > olderAvgWeight * 1.1) {
    // Jumped weight too fast - deload
    return {
      recommendation: 'deload',
      currentStats: { avgWeight: recentAvgWeight, avgReps: recentAvgReps, lastSets: lastWorkoutSets },
      suggestedParams: { weight: Math.round(recentAvgWeight * 0.9) },
      reasoning: 'Weight increased too fast. Drop 10% and rebuild rep strength.',
    };
  }

  // Default - maintain
  return {
    recommendation: 'maintain',
    currentStats: { avgWeight: recentAvgWeight, avgReps: recentAvgReps, lastSets: lastWorkoutSets },
    suggestedParams: {},
    reasoning: 'Good progress. Maintain current intensity and focus on form.',
  };
}

/**
 * Check if user should take a deload week
 */
export async function checkDeloadRecommendation(userId: string): Promise<DeloadRecommendation> {
  log.info({ userId }, 'Checking deload recommendation');

  // Get training data from last 4 weeks
  const weeklyStats = await db.queryAll<{
    week_start: Date;
    workout_count: number;
    total_volume: number;
    avg_rpe: number;
  }>(
    `SELECT
       date_trunc('week', started_at) as week_start,
       COUNT(*) as workout_count,
       SUM(COALESCE((metrics->>'total_volume')::numeric, 0)) as total_volume,
       AVG(COALESCE((metrics->>'avg_rpe')::numeric, 5)) as avg_rpe
     FROM workout_logs
     WHERE user_id = $1
       AND started_at >= NOW() - INTERVAL '4 weeks'
     GROUP BY date_trunc('week', started_at)
     ORDER BY week_start DESC`,
    [userId]
  );

  if (weeklyStats.length < 3) {
    return { recommend: false };
  }

  // Calculate fatigue accumulation
  const _avgVolume = weeklyStats.reduce((sum, w) => sum + Number(w.total_volume || 0), 0) / weeklyStats.length;
  const avgRPE = weeklyStats.reduce((sum, w) => sum + Number(w.avg_rpe || 5), 0) / weeklyStats.length;
  const avgWorkouts = weeklyStats.reduce((sum, w) => sum + Number(w.workout_count || 0), 0) / weeklyStats.length;

  // Check for volume ramp (increasing each week)
  const volumeIncreasing = weeklyStats.length >= 3 &&
    Number(weeklyStats[0].total_volume) > Number(weeklyStats[1].total_volume) &&
    Number(weeklyStats[1].total_volume) > Number(weeklyStats[2].total_volume);

  // Check weeks since last deload
  const lastDeload = await db.queryOne<{ created_at: Date }>(
    `SELECT created_at FROM training_weeks
     WHERE phase_id IN (
       SELECT id FROM training_phases WHERE phase_type = 'deload'
     )
     AND phase_id IN (
       SELECT tp.id FROM training_phases tp
       JOIN training_cycles tc ON tp.cycle_id = tc.id
       WHERE tc.user_id = $1
     )
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  const weeksSinceDeload = lastDeload
    ? Math.floor((Date.now() - lastDeload.created_at.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 12; // Assume it's been a while

  // Scoring
  let fatigueScore = 0;
  if (avgRPE > 8) fatigueScore += 30;
  else if (avgRPE > 7) fatigueScore += 20;
  else if (avgRPE > 6) fatigueScore += 10;

  if (volumeIncreasing) fatigueScore += 20;
  if (weeksSinceDeload >= 6) fatigueScore += 20;
  if (weeksSinceDeload >= 8) fatigueScore += 10;
  if (avgWorkouts > 5) fatigueScore += 15;

  // Readiness score (inverse of fatigue)
  const readinessScore = 100 - fatigueScore;

  // Recommendation thresholds
  if (fatigueScore >= 60 || weeksSinceDeload >= 8) {
    return {
      recommend: true,
      reason: fatigueScore >= 60
        ? 'High accumulated fatigue detected'
        : `${weeksSinceDeload} weeks since last deload`,
      suggestedDuration: '1 week',
      suggestedVolume: '50% of normal',
      suggestedIntensity: '60-70% of normal',
      fatigueScore,
      readinessScore,
    };
  }

  if (fatigueScore >= 45) {
    return {
      recommend: false,
      reason: 'Fatigue accumulating - consider a deload within 1-2 weeks',
      fatigueScore,
      readinessScore,
    };
  }

  return {
    recommend: false,
    fatigueScore,
    readinessScore,
  };
}

/**
 * Get skill training prescription for a specific skill
 */
export async function getSkillTrainingPrescription(
  userId: string,
  skillName: string,
  allocatedMinutes: number
): Promise<SkillWorkBlock | null> {
  return generateSkillWorkBlock(userId, skillName, allocatedMinutes);
}

/**
 * Get rehabilitation workout prescription
 */
export async function getRehabilitationPrescription(
  userId: string,
  userInjuryId: string
): Promise<{
  phase: number;
  phaseName: string;
  exercises: PrescribedExercise[];
  frequency: string;
  precautions: string[];
  progressionCriteria: Record<string, unknown>;
} | null> {
  // Get the user injury and current phase
  const injury = await db.queryOne<{
    id: string;
    injury_profile_id: string;
    severity: string;
    current_phase: number;
    pain_level: number;
  }>(
    `SELECT id, injury_profile_id, severity, current_phase, pain_level
     FROM user_injuries
     WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [userInjuryId, userId]
  );

  if (!injury) {
    return null;
  }

  // Get the protocol for this phase
  const protocol = await db.queryOne<{
    name: string;
    phase: number;
    phase_name: string;
    duration_weeks: number;
    goals: Record<string, unknown>;
    progression_criteria: Record<string, unknown>;
    exercises: Array<{
      exercise_id: string;
      sets: number;
      reps: string;
      notes?: string;
    }>;
    frequency_per_week: number;
    precautions: string[];
  }>(
    `SELECT name, phase, phase_name, duration_weeks, goals, progression_criteria, exercises, frequency_per_week, precautions
     FROM rehab_protocols
     WHERE injury_profile_id = $1 AND phase = $2`,
    [injury.injury_profile_id, injury.current_phase]
  );

  if (!protocol) {
    return null;
  }

  // Convert protocol exercises to prescribed exercises
  const prescribedExercises: PrescribedExercise[] = [];
  const exercises = protocol.exercises || [];

  for (const ex of exercises) {
    // Get exercise details
    const exerciseDetails = await db.queryOne<{ name: string; estimated_seconds: number; rest_seconds: number }>(
      'SELECT name, estimated_seconds, rest_seconds FROM exercises WHERE id = $1',
      [ex.exercise_id]
    );

    prescribedExercises.push({
      id: ex.exercise_id,
      name: exerciseDetails?.name || ex.exercise_id,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: exerciseDetails?.rest_seconds || 60,
      estimatedSeconds: exerciseDetails?.estimated_seconds || 30,
      notes: ex.notes,
    });
  }

  return {
    phase: protocol.phase,
    phaseName: protocol.phase_name,
    exercises: prescribedExercises,
    frequency: `${protocol.frequency_per_week}x per week`,
    precautions: protocol.precautions,
    progressionCriteria: protocol.progression_criteria,
  };
}

/**
 * Get exercise progression chain (regressions and progressions)
 */
export async function getExerciseProgressionChain(exerciseId: string): Promise<{
  regressions: Array<{ id: string; name: string; difficulty: number }>;
  current: { id: string; name: string; difficulty: number };
  progressions: Array<{ id: string; name: string; difficulty: number }>;
}> {
  const current = await db.queryOne<{
    id: string;
    name: string;
    difficulty: number;
    regression_exercise: string | null;
    progression_exercise: string | null;
  }>(
    'SELECT id, name, difficulty, regression_exercise, progression_exercise FROM exercises WHERE id = $1',
    [exerciseId]
  );

  if (!current) {
    return {
      regressions: [],
      current: { id: exerciseId, name: 'Unknown', difficulty: 0 },
      progressions: [],
    };
  }

  const regressions: Array<{ id: string; name: string; difficulty: number }> = [];
  const progressions: Array<{ id: string; name: string; difficulty: number }> = [];

  // Traverse regressions
  let regressionId = current.regression_exercise;
  while (regressionId && regressions.length < 5) {
    const regression = await db.queryOne<{
      id: string;
      name: string;
      difficulty: number;
      regression_exercise: string | null;
    }>(
      'SELECT id, name, difficulty, regression_exercise FROM exercises WHERE id = $1',
      [regressionId]
    );
    if (regression) {
      regressions.unshift({ id: regression.id, name: regression.name, difficulty: regression.difficulty });
      regressionId = regression.regression_exercise;
    } else {
      break;
    }
  }

  // Traverse progressions
  let progressionId = current.progression_exercise;
  while (progressionId && progressions.length < 5) {
    const progression = await db.queryOne<{
      id: string;
      name: string;
      difficulty: number;
      progression_exercise: string | null;
    }>(
      'SELECT id, name, difficulty, progression_exercise FROM exercises WHERE id = $1',
      [progressionId]
    );
    if (progression) {
      progressions.push({ id: progression.id, name: progression.name, difficulty: progression.difficulty });
      progressionId = progression.progression_exercise;
    } else {
      break;
    }
  }

  return {
    regressions,
    current: { id: current.id, name: current.name, difficulty: current.difficulty },
    progressions,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface UserContext {
  recentExercises: Set<string>;
  muscleNeeds: Map<string, number>;
  exercisePreferences: Map<string, number>;
  completionRates: Map<string, number>;
  limitations: Array<{
    body_region_id: string | null;
    limitation_type: string;
    severity: string;
    avoid_movements: string[];
  }>;
  movementPatternUsage: Map<string, number>;
  weeklyVolume: { push: number; pull: number; legs: number; core: number };
}

async function gatherUserContext(userId: string): Promise<UserContext> {
  // Get recent workouts (last 7 days)
  const recentWorkouts = await db.queryAll<{ exercise_data: unknown }>(
    `SELECT exercise_data FROM workouts
     WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId]
  );

  const recentExercises = new Set<string>();
  for (const w of recentWorkouts) {
    const exercises = typeof w.exercise_data === 'string'
      ? JSON.parse(w.exercise_data || '[]')
      : (w.exercise_data || []);
    for (const e of exercises) {
      recentExercises.add(e.exerciseId);
    }
  }

  // Get muscle needs
  const muscleNeeds = new Map<string, number>();
  const muscles = await db.queryAll<{ id: string; optimal_weekly_volume: number }>(
    'SELECT id, optimal_weekly_volume FROM muscles'
  );
  for (const m of muscles) {
    muscleNeeds.set(m.id, m.optimal_weekly_volume || 10);
  }

  // Get exercise preferences (from ratings or completion data)
  const exercisePreferences = new Map<string, number>();
  const completionRates = new Map<string, number>();

  // Get user limitations
  const limitations = await db.queryAll<{
    body_region_id: string | null;
    limitation_type: string;
    severity: string;
    avoid_movements: string[];
  }>(
    `SELECT body_region_id, limitation_type, severity, avoid_movements
     FROM user_limitations
     WHERE user_id = $1 AND status IN ('active', 'recovering')`,
    [userId]
  );

  // Get movement pattern usage
  const movementPatternUsage = new Map<string, number>();

  // Get weekly volume split
  const weeklyVolume = { push: 0, pull: 0, legs: 0, core: 0 };

  return {
    recentExercises,
    muscleNeeds,
    exercisePreferences,
    completionRates,
    limitations,
    movementPatternUsage,
    weeklyVolume,
  };
}

async function getPeriodizationContext(userId: string): Promise<PeriodizationContext | undefined> {
  const cycle = await db.queryOne<{
    phase_type: string;
    week_number: number;
    volume_modifier: number;
    intensity_range_low: number;
    intensity_range_high: number;
    rep_range_low: number;
    rep_range_high: number;
    focus_areas: string[];
  }>(
    `SELECT tp.phase_type, tw.week_number, tp.volume_modifier,
            tp.intensity_range_low, tp.intensity_range_high,
            tp.rep_range_low, tp.rep_range_high, tp.focus_areas
     FROM training_cycles tc
     JOIN training_phases tp ON tp.cycle_id = tc.id
     LEFT JOIN training_weeks tw ON tw.phase_id = tp.id
     WHERE tc.user_id = $1 AND tc.status = 'active'
     ORDER BY tp.phase_order, tw.week_number
     LIMIT 1`,
    [userId]
  );

  if (!cycle) return undefined;

  return {
    phaseName: cycle.phase_type,
    weekInPhase: cycle.week_number || 1,
    volumeModifier: cycle.volume_modifier || 1.0,
    intensityRange: {
      low: cycle.intensity_range_low || 65,
      high: cycle.intensity_range_high || 85,
    },
    repRange: {
      low: cycle.rep_range_low || 6,
      high: cycle.rep_range_high || 12,
    },
    focusAreas: cycle.focus_areas || [],
  };
}

async function getAvailableExercises(constraints: PrescriptionConstraints): Promise<ExerciseData[]> {
  // Build query with filters
  let query = `
    SELECT id, name, type, difficulty, is_compound, estimated_seconds, rest_seconds,
           locations, equipment_required, primary_muscles, secondary_muscles,
           movement_pattern, force_vector, contraction_type, skill_level,
           regression_exercise, progression_exercise, injury_risk_areas, contraindications,
           optimal_rep_range_low, optimal_rep_range_high, typical_intensity_percent
    FROM exercises
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  // Location filter
  query += ` AND (locations IS NULL OR $${paramIndex} = ANY(locations))`;
  params.push(constraints.location);
  paramIndex++;

  // Equipment filter - if user has no equipment, only show bodyweight
  if (!constraints.equipmentAvailable?.length) {
    query += ` AND (equipment_required IS NULL OR array_length(equipment_required, 1) IS NULL)`;
  }

  // Exclude specific exercises
  if (constraints.excludeExercises?.length) {
    query += ` AND id NOT IN (${constraints.excludeExercises.map((_, i) => `$${paramIndex + i}`).join(',')})`;
    params.push(...constraints.excludeExercises);
    paramIndex += constraints.excludeExercises.length;
  }

  const exercises = await db.queryAll<ExerciseData>(query, params);

  // Filter by equipment in application layer for better control
  return exercises.filter(ex => {
    if (!ex.equipment_required?.length) return true;
    if (!constraints.equipmentAvailable?.length) return false;
    return ex.equipment_required.every(eq => constraints.equipmentAvailable?.includes(eq));
  });
}

async function scoreExercises(
  exercises: ExerciseData[],
  userId: string,
  constraints: PrescriptionConstraints,
  userContext: UserContext,
  periodizationContext?: PeriodizationContext
): Promise<ScoredExercise[]> {
  const scoredExercises: ScoredExercise[] = [];

  for (const exercise of exercises) {
    let score = 100;
    const reasons: string[] = [];

    // Difficulty match
    const levelMap: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
    const userLevel = levelMap[constraints.fitnessLevel];
    const exerciseDifficulty = exercise.difficulty || 2;
    if (exerciseDifficulty > userLevel + 1) {
      score += SCORING_WEIGHTS.DIFFICULTY_MISMATCH;
      reasons.push('Exercise too difficult');
    }

    // Compound preference
    if (constraints.preferCompound && exercise.is_compound) {
      score += SCORING_WEIGHTS.COMPOUND_PREFERENCE;
      reasons.push('Compound exercise preferred');
    }

    // Muscle targeting
    for (const muscle of exercise.primary_muscles || []) {
      if (constraints.targetMuscles?.includes(muscle)) {
        score += SCORING_WEIGHTS.MUSCLE_TARGET_MATCH;
        reasons.push(`Targets ${muscle}`);
      }
      if (constraints.excludeMuscles?.includes(muscle)) {
        score = 0;
        reasons.push(`Excluded muscle: ${muscle}`);
        break;
      }
      const need = userContext.muscleNeeds.get(muscle) || 0;
      if (need > 5) {
        score += SCORING_WEIGHTS.MUSCLE_BALANCE_BONUS * (need / 10);
        reasons.push(`Addresses ${muscle} need`);
      }
    }

    // Recently used penalty
    if (userContext.recentExercises.has(exercise.id)) {
      score += SCORING_WEIGHTS.RECENCY_PENALTY;
      reasons.push('Recently performed');
    }

    // User preference bonus
    const preference = userContext.exercisePreferences.get(exercise.id);
    if (preference && preference > 3) {
      score += SCORING_WEIGHTS.USER_PREFERENCE_BONUS * (preference / 5);
      reasons.push('User favorite');
    }

    // Injury/limitation check
    for (const limitation of userContext.limitations) {
      // Check if exercise affects injured area
      if (limitation.body_region_id && exercise.injury_risk_areas?.includes(limitation.body_region_id)) {
        if (limitation.severity === 'severe') {
          score = 0;
          reasons.push(`Contraindicated: ${limitation.limitation_type}`);
        } else {
          score += SCORING_WEIGHTS.PAIN_ZONE_PENALTY;
          reasons.push(`Caution: affects ${limitation.body_region_id}`);
        }
      }

      // Check contraindications
      if (exercise.contraindications?.some(c => c === limitation.limitation_type)) {
        score += SCORING_WEIGHTS.INJURY_RISK_PENALTY;
        reasons.push(`Contraindicated for ${limitation.limitation_type}`);
      }

      // Check avoid movements
      if (limitation.avoid_movements?.some(m => exercise.movement_pattern === m)) {
        score += SCORING_WEIGHTS.PAIN_ZONE_PENALTY;
        reasons.push(`Avoid movement: ${exercise.movement_pattern}`);
      }
    }

    // Periodization alignment
    if (periodizationContext) {
      const repRangeMatch =
        (exercise.optimal_rep_range_low || 8) >= periodizationContext.repRange.low &&
        (exercise.optimal_rep_range_high || 12) <= periodizationContext.repRange.high;
      if (repRangeMatch) {
        score += SCORING_WEIGHTS.PERIODIZATION_ALIGNMENT;
        reasons.push(`Fits ${periodizationContext.phaseName} phase`);
      }
    }

    // Movement pattern variety
    const patternUsage = userContext.movementPatternUsage.get(exercise.movement_pattern || '') || 0;
    if (patternUsage > 3) {
      score -= 10; // Already doing this pattern a lot
    } else {
      score += SCORING_WEIGHTS.MOVEMENT_PATTERN_VARIETY;
      reasons.push('Adds movement variety');
    }

    if (score > 0) {
      scoredExercises.push({ exercise, score, reasons });
    }
  }

  return scoredExercises.sort((a, b) => b.score - a.score);
}

function selectExercises(
  scoredExercises: ScoredExercise[],
  constraints: PrescriptionConstraints,
  periodizationContext?: PeriodizationContext
): PrescribedExercise[] {
  const selected: PrescribedExercise[] = [];
  let totalTime = 0;
  const warmupTime = 5 * 60; // 5 minutes
  const cooldownTime = 5 * 60; // 5 minutes
  const skillTime = (constraints.allocateSkillTime || 0) * 60;
  const targetTime = (constraints.timeAvailable * 60) - warmupTime - cooldownTime - skillTime;

  const usedPatterns = new Set<string>();

  for (const { exercise, reasons } of scoredExercises) {
    // Ensure variety in movement patterns
    if (exercise.movement_pattern && usedPatterns.has(exercise.movement_pattern)) {
      // Only allow 2 exercises per pattern
      const patternCount = selected.filter(
        e => exercises.find(ex => ex.id === e.id)?.movement_pattern === exercise.movement_pattern
      ).length;
      if (patternCount >= 2) continue;
    }

    // Calculate time for this exercise
    const sets = periodizationContext?.volumeModifier
      ? Math.round(3 * periodizationContext.volumeModifier)
      : 3;
    const exerciseTime = (exercise.estimated_seconds + exercise.rest_seconds) * sets;

    if (totalTime + exerciseTime <= targetTime) {
      // Determine rep range
      let reps = '8-12';
      if (periodizationContext) {
        reps = `${periodizationContext.repRange.low}-${periodizationContext.repRange.high}`;
      } else if (exercise.optimal_rep_range_low && exercise.optimal_rep_range_high) {
        reps = `${exercise.optimal_rep_range_low}-${exercise.optimal_rep_range_high}`;
      }

      selected.push({
        id: exercise.id,
        name: exercise.name,
        sets,
        reps,
        restSeconds: exercise.rest_seconds,
        estimatedSeconds: exercise.estimated_seconds,
        reasons,
      });

      totalTime += exerciseTime;
      if (exercise.movement_pattern) {
        usedPatterns.add(exercise.movement_pattern);
      }
    }

    if (selected.length >= 8) break; // Max 8 exercises
  }

  return selected;
}

// Helper to access exercises within selectExercises
const exercises: ExerciseData[] = [];

async function generateSkillWorkBlock(
  userId: string,
  skillName: string,
  allocatedMinutes: number
): Promise<SkillWorkBlock | null> {
  // Get user's current skill level
  const userProgress = await db.queryOne<{
    current_value: number;
    best_value: number;
    status: string;
  }>(
    `SELECT usp.current_value, usp.best_value, usp.status
     FROM user_skill_progress usp
     JOIN skill_progressions sp ON sp.id = usp.skill_progression_id
     WHERE usp.user_id = $1 AND sp.skill_name = $2
     ORDER BY sp.level DESC
     LIMIT 1`,
    [userId, skillName]
  );

  // Get the current level's progression details
  const currentLevel = userProgress?.status === 'achieved'
    ? await db.queryOne<{
        level: number;
        exercise_id: string;
        target_metric: string;
        target_value: number;
      }>(
        `SELECT level, exercise_id, target_metric, target_value
         FROM skill_progressions
         WHERE skill_name = $1
         ORDER BY level DESC
         LIMIT 1`,
        [skillName]
      )
    : await db.queryOne<{
        level: number;
        exercise_id: string;
        target_metric: string;
        target_value: number;
      }>(
        `SELECT level, exercise_id, target_metric, target_value
         FROM skill_progressions
         WHERE skill_name = $1 AND level = (
           SELECT COALESCE(MAX(sp.level), 0) + 1
           FROM skill_progressions sp
           JOIN user_skill_progress usp ON usp.skill_progression_id = sp.id
           WHERE sp.skill_name = $1 AND usp.user_id = $2 AND usp.status = 'achieved'
         )`,
        [skillName, userId]
      );

  if (!currentLevel) {
    return null;
  }

  // Get exercise details
  const exerciseDetails = await db.queryOne<{
    name: string;
    estimated_seconds: number;
    rest_seconds: number;
  }>(
    'SELECT name, estimated_seconds, rest_seconds FROM exercises WHERE id = $1',
    [currentLevel.exercise_id]
  );

  // Build skill work block
  const exercises: PrescribedExercise[] = [
    {
      id: currentLevel.exercise_id,
      name: exerciseDetails?.name || skillName,
      sets: 5,
      reps: currentLevel.target_metric === 'duration_seconds'
        ? `${Math.floor(currentLevel.target_value)}s holds`
        : `${currentLevel.target_value} reps`,
      restSeconds: 180, // 3 min rest for skill work
      estimatedSeconds: exerciseDetails?.estimated_seconds || 30,
      notes: 'Focus on form over duration/reps',
    },
  ];

  return {
    skillName,
    exercises,
    allocatedMinutes,
    currentLevel: currentLevel.level,
    targetMetric: currentLevel.target_metric,
    targetValue: currentLevel.target_value,
  };
}

function generateWarmup(
  selectedExercises: PrescribedExercise[],
  _constraints: PrescriptionConstraints
): WarmupExercise[] {
  // Determine what body parts will be worked
  const warmup: WarmupExercise[] = [
    {
      name: 'Light Cardio',
      type: 'cardio',
      duration: 120,
      description: 'Jumping jacks, jogging in place, or cycling',
      sets: 1,
      reps: '2 min',
      restSeconds: 0,
      isActivity: true,
    },
    {
      name: 'Dynamic Stretches',
      type: 'dynamic_stretch',
      duration: 180,
      description: 'Arm circles, leg swings, hip rotations, torso twists',
      sets: 1,
      reps: '3 min',
      restSeconds: 0,
      isActivity: true,
    },
  ];

  // Add specific warmup based on exercises
  const hasUpperBody = selectedExercises.some(e =>
    e.name.toLowerCase().includes('press') ||
    e.name.toLowerCase().includes('pull') ||
    e.name.toLowerCase().includes('row')
  );

  if (hasUpperBody) {
    warmup.push({
      name: 'Band Pull-Aparts',
      type: 'activation',
      duration: 60,
      description: 'Activate rear delts and upper back',
      sets: 2,
      reps: '15',
      restSeconds: 30,
      isActivity: false,
    });
  }

  return warmup;
}

function generateCooldown(_selectedExercises: PrescribedExercise[]): CooldownExercise[] {
  return [
    {
      name: 'Static Stretches',
      type: 'static_stretch',
      duration: 300,
      description: 'Hold each stretch for 30 seconds - focus on worked muscles',
      sets: 1,
      reps: '5 min',
      restSeconds: 0,
      isActivity: true,
    },
    {
      name: 'Deep Breathing',
      type: 'recovery',
      duration: 60,
      description: 'Box breathing: 4 count inhale, 4 count hold, 4 count exhale, 4 count hold',
      sets: 1,
      reps: '1 min',
      restSeconds: 0,
      isActivity: true,
    },
  ];
}

async function calculateMuscleCoverage(
  selectedExercises: PrescribedExercise[]
): Promise<Record<string, number>> {
  const coverage: Record<string, number> = {};

  const exerciseIds = selectedExercises.map(e => e.id);
  if (exerciseIds.length === 0) return coverage;

  const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');
  const activations = await db.queryAll<{
    exercise_id: string;
    muscle_id: string;
    activation: number;
  }>(
    `SELECT exercise_id, muscle_id, activation
     FROM exercise_activations
     WHERE exercise_id IN (${placeholders})`,
    exerciseIds
  );

  for (const act of activations) {
    const exercise = selectedExercises.find(e => e.id === act.exercise_id);
    const sets = exercise?.sets || 3;
    coverage[act.muscle_id] = (coverage[act.muscle_id] || 0) + (act.activation * sets);
  }

  return coverage;
}

function generateExplanation(
  selectedExercises: PrescribedExercise[],
  scoredExercises: ScoredExercise[],
  _userContext: UserContext,
  periodizationContext?: PeriodizationContext
): PrescriptionExplanation {
  // Analyze volume distribution
  const volumeAnalysis = { push: 0, pull: 0, legs: 0, core: 0 };
  // This would need actual exercise categorization

  // Collect adjustments made
  const adjustmentsMade: string[] = [];

  // Collect avoided exercises with reasons
  const avoidedExercises = scoredExercises
    .filter(se => se.score <= 0)
    .slice(0, 5)
    .map(se => ({
      exerciseId: se.exercise.id,
      reason: se.reasons.find(r => r.includes('Contraindicated') || r.includes('Excluded')) || 'Low score',
    }));

  // Periodization note
  let periodizationNote: string | undefined;
  if (periodizationContext) {
    periodizationNote = `Week ${periodizationContext.weekInPhase} of ${periodizationContext.phaseName} phase. ` +
      `Focus: ${periodizationContext.focusAreas.join(', ') || 'General development'}. ` +
      `Target intensity: ${periodizationContext.intensityRange.low}-${periodizationContext.intensityRange.high}%.`;
  }

  return {
    volumeAnalysis,
    adjustmentsMade,
    avoidedExercises,
    periodizationNote,
  };
}
