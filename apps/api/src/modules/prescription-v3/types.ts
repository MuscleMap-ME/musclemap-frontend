/**
 * Prescription Engine v3.0 - Type Definitions
 *
 * Comprehensive type system for the 16-factor scoring algorithm
 * with support for user biomechanics, adaptive learning, and research-backed effectiveness.
 */

// ============================================
// MOVEMENT PATTERNS
// ============================================

export type MovementPattern =
  | 'horizontal_push'    // Bench press, pushup
  | 'horizontal_pull'    // Row variations
  | 'vertical_push'      // Overhead press
  | 'vertical_pull'      // Pullup, lat pulldown
  | 'squat'              // Squat variations
  | 'hip_hinge'          // Deadlift, RDL
  | 'lunge'              // Lunges, split squats
  | 'carry'              // Farmer walks
  | 'rotation'           // Wood chops
  | 'anti_rotation'      // Pallof press
  | 'flexion'            // Crunches
  | 'extension'          // Back extensions
  | 'isolation_upper'    // Curls, extensions
  | 'isolation_lower'    // Leg curl, leg extension
  | 'plyometric'         // Jumps, throws
  | 'olympic'            // Clean, snatch
  | 'mobility'           // Stretches, flows
  | 'stability';         // Core, balance

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export type Goal =
  | 'strength'
  | 'hypertrophy'
  | 'endurance'
  | 'power'
  | 'fat_loss'
  | 'rehabilitation'
  | 'flexibility'
  | 'athletic';

export type TrainingPhase =
  | 'accumulation'
  | 'intensification'
  | 'realization'
  | 'deload'
  | 'maintenance';

export type RecoveryClassification = 'poor' | 'fair' | 'good' | 'excellent';

// ============================================
// USER BIOMECHANICS
// ============================================

export interface UserBiomechanics {
  userId: string;

  // Physical Attributes
  heightCm?: number;
  weightKg?: number;
  armSpanCm?: number;
  femurLengthRelative?: 'short' | 'average' | 'long';
  torsoLengthRelative?: 'short' | 'average' | 'long';

  // Frame Classification
  frameSize?: 'small' | 'medium' | 'large';
  somatotype?: 'ectomorph' | 'mesomorph' | 'endomorph' | 'mixed';

  // Mobility Assessment (degrees or scale 1-10)
  mobilityProfile: {
    shoulderFlexion?: number;
    shoulderInternalRotation?: number;
    hipFlexion?: number;
    ankleFlexion?: number;
    thoracicExtension?: number;
    hamstringLength?: number;
  };

  // Strength Curves
  strengthCurveAnomalies: {
    benchPress?: 'weak_bottom' | 'weak_lockout' | 'balanced';
    squat?: 'weak_hole' | 'weak_lockout' | 'balanced';
    deadlift?: 'weak_floor' | 'weak_lockout' | 'balanced';
  };
}

// ============================================
// USER TRAINING PROFILE
// ============================================

export interface UserTrainingProfile {
  userId: string;
  trainingAgeYears: number;
  experienceLevel: ExperienceLevel;
  technicalProficiency: Partial<Record<MovementPattern, 1 | 2 | 3 | 4 | 5>>;

  // Current Strength Levels (estimated 1RM in kg)
  strengthLevels: {
    squat?: number;
    deadlift?: number;
    benchPress?: number;
    overheadPress?: number;
    pullUp?: number;
    row?: number;
  };

  // Historical Performance
  lifetimeWorkouts: number;
  averageSessionsPerWeek: number;
  longestConsistentStreak: number;
  currentStreak: number;

  // Preferences
  preferredExerciseStyles: string[];
  dislikedExercises: string[];
  preferredRepRanges: { min: number; max: number };
  preferredSessionDuration: number;
}

// ============================================
// USER HEALTH PROFILE
// ============================================

export interface UserHealthProfile {
  userId: string;
  age: number;
  biologicalSex: 'male' | 'female';

  // Active injuries and limitations
  activeInjuries: UserInjury[];
  historicalInjuries: UserInjury[];
  limitations: Limitation[];
  contraindications: string[];

  // Recovery Factors
  averageSleepHours: number;
  sleepQualityAvg: number; // 1-10
  stressLevel: 'low' | 'moderate' | 'high';
  occupationType: 'sedentary' | 'light' | 'moderate' | 'heavy';

  // Optional: Menstrual Cycle Tracking
  cycleTracking?: {
    enabled: boolean;
    currentPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual';
    daysIntoCycle?: number;
  };
}

export interface UserInjury {
  injuryProfileId: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'recovering' | 'resolved';
  affectedJoints: string[];
  contraindicatedMovements: string[];
  startDate: Date;
  expectedRecoveryDate?: Date;
}

export interface Limitation {
  type: 'equipment' | 'mobility' | 'strength' | 'medical' | 'preference';
  description: string;
  affectedExercises: string[];
  severity: 'minor' | 'moderate' | 'major';
}

// ============================================
// EXERCISE METADATA v3
// ============================================

export interface ExerciseMetadataV3 {
  id: string;
  name: string;
  aliases: string[];
  category: string;

  // Movement Classification
  movementPattern: MovementPattern;
  plane: 'sagittal' | 'frontal' | 'transverse' | 'multi';
  jointActions: JointAction[];

  // Muscle Activation
  muscleActivation: {
    primary: MuscleActivation[];
    secondary: MuscleActivation[];
    stabilizers: MuscleActivation[];
  };

  // Biomechanical Properties
  biomechanics: {
    loadingPattern: 'axial' | 'horizontal' | 'rotational' | 'unloaded';
    resistanceCurve: 'ascending' | 'descending' | 'bell' | 'flat';
    stickingPointRom?: number;
    jointStressProfile: Record<string, 'low' | 'moderate' | 'high'>;
  };

  // Performance Metrics
  performanceMetrics: {
    cnsLoadFactor: number;           // 1-10
    metabolicDemand: number;         // 1-10
    technicalComplexity: number;     // 1-10
    skillLearningCurve: number;      // Sessions to competency
    balanceRequirement: number;      // 1-10
  };

  // Recovery Requirements
  recoveryProfile: {
    typicalSorenessHours: number;
    minimumRecoveryHours: number;
    muscleGroupRecoveryFactor: Record<string, number>;
  };

  // Effectiveness Ratings
  effectiveness: {
    forStrength: number;
    forHypertrophy: number;
    forPower: number;
    forEndurance: number;
    forRehabilitation: number;
    evidenceLevel: 'low' | 'moderate' | 'high';
    researchCitations: string[];
  };

  // Requirements
  requirements: {
    equipment: string[];
    optionalEquipment: string[];
    spaceNeeded: 'minimal' | 'moderate' | 'large';
    noiseLevel: 'silent' | 'quiet' | 'moderate' | 'loud';
    safeForHome: boolean;
  };

  // Progression Tree
  progressionTree: {
    regressions: string[];
    progressions: string[];
    lateralVariations: string[];
  };

  // Contraindications
  contraindications: {
    injuryTypes: string[];
    conditionTypes: string[];
    ageRestrictions?: { minAge?: number; maxAge?: number };
    pregnancySafe: boolean;
  };
}

export interface MuscleActivation {
  muscleId: string;
  activation: number; // 0-100
}

export interface JointAction {
  joint: string;
  action: 'flexion' | 'extension' | 'abduction' | 'adduction' | 'rotation' | 'circumduction';
}

// ============================================
// USER EXERCISE PERFORMANCE
// ============================================

export interface UserExercisePerformance {
  userId: string;
  exerciseId: string;

  // Strength Metrics
  estimated1RM?: number;
  recentMaxWeight?: number;
  maxWeightEver?: number;
  bestRepMax: Record<string, number>; // {"3rm": 100, "5rm": 90}

  // Volume Metrics
  lifetimeTotalReps: number;
  lifetimeTotalTonnage: number;
  monthlyVolumeTrend: { month: string; volume: number }[];

  // Technical Competency
  formRating?: number; // 1-5
  skillProgression: 'learning' | 'competent' | 'proficient' | 'mastered';
  sessionsToCompetency?: number;

  // User Feedback
  enjoymentRating?: number; // 1-5
  perceivedDifficulty?: number; // 1-5
  jointStressExperienced?: number; // 1-5

  // Timeline
  firstPerformedAt?: Date;
  lastPerformedAt?: Date;
  totalSessions: number;
  consecutiveSuccessSessions: number;
}

// ============================================
// SCORING SYSTEM
// ============================================

export interface ScoringWeightsV3 {
  // Core Factors (50 points total)
  equipmentMatch: number;          // 0 or 25 (binary)
  goalEffectiveness: number;       // 0-15
  muscleTargetMatch: number;       // 0-10

  // Personalization Factors (25 points total)
  biomechanicalFit: number;        // 0-8
  skillAppropriate: number;        // 0-7
  userPreference: number;          // 0-5
  performanceHistory: number;      // 0-5

  // Recovery & Safety (20 points total)
  recoveryAppropriate: number;     // 0-8
  injurySafe: number;              // 0-7 or -100
  jointStressAcceptable: number;   // 0-5

  // Periodization & Variety (10 points total)
  periodizationAlignment: number;  // 0-4
  varietyOptimization: number;     // 0-3
  movementPatternBalance: number;  // 0-3
}

export interface ScoringBonus {
  progressionOpportunity: number;  // -5 to +5
  timeEfficiency: number;          // -3 to +3
  equipmentOptimization: number;   // -2 to +2
}

export interface ScoreBreakdownV3 extends ScoringWeightsV3, ScoringBonus {
  totalScore: number;
}

// ============================================
// PRESCRIPTION REQUEST/RESULT
// ============================================

export interface UserContextV3 {
  userId: string;
  biomechanics?: UserBiomechanics;
  trainingProfile?: UserTrainingProfile;
  healthProfile?: UserHealthProfile;

  // Current session context
  equipment: string[];
  location: 'home' | 'gym' | 'outdoor' | 'travel';
  timeAvailable: number;
  goals: Goal[];
  currentPhase?: TrainingPhase;
  recoveryScore?: RecoveryScoreV3;
}

export interface RecoveryScoreV3 {
  score: number; // 0-100
  classification: RecoveryClassification;
  recommendedIntensity: 'rest' | 'light' | 'moderate' | 'normal' | 'high';
  factors: {
    sleepQuality: number;
    muscleReadiness: number;
    stressLevel: number;
    previousWorkoutIntensity: number;
  };
}

export interface PrescriptionRequestV3 {
  userContext: UserContextV3;
  targetMuscles?: string[];
  excludeMuscles?: string[];
  exerciseTypes?: string[];
  maxExercises?: number;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
  includeSupersets?: boolean;
  preferredIntensity?: 'light' | 'moderate' | 'intense';
}

export interface ScoredExerciseV3 {
  exerciseId: string;
  name: string;
  type: string;
  movementPattern: MovementPattern;
  score: number;
  scoreBreakdown: ScoreBreakdownV3;

  // Load recommendations
  sets: number;
  reps: number | string; // Can be "8-12"
  rpe: number;
  percentOf1RM?: number;
  restSeconds: number;
  tempo?: string;

  // Metadata
  primaryMuscles: string[];
  secondaryMuscles: string[];
  notes: string[];

  // Substitutions
  substitutes: SubstituteInfo[];
  reasoning: string;
}

export interface SubstituteInfo {
  exerciseId: string;
  name: string;
  similarityScore: number;
  differenceNotes: string;
  whenToPrefer: string[];
}

export interface SupersetPair {
  exercise1: ScoredExerciseV3;
  exercise2: ScoredExerciseV3;
  restBetween: number;
  restAfter: number;
  rationale: string;
}

export interface PrescriptionResultV3 {
  id: string;
  userId: string;

  // Exercises
  exercises: ScoredExerciseV3[];
  warmup: ScoredExerciseV3[];
  cooldown: ScoredExerciseV3[];
  supersets: SupersetPair[];

  // Metrics
  targetDuration: number;
  actualDuration: number;
  muscleCoverage: Record<string, number>;
  movementPatternBalance: Record<MovementPattern, number>;

  // Context
  difficulty: 'easy' | 'moderate' | 'intense' | 'brutal';
  periodizationPhase?: TrainingPhase;
  recoveryAdjusted: boolean;

  // Metadata
  metadata: {
    algorithmVersion: string;
    generatedAt: string;
    factorsConsidered: string[];
    recoveryScore?: number;
    cacheHit: boolean;
    generationTimeMs: number;
  };
}

// ============================================
// FEEDBACK & LEARNING
// ============================================

export interface PrescriptionFeedback {
  prescriptionId: string;
  userId: string;

  // Adherence
  exercisesPrescribed: number;
  exercisesCompleted: number;
  exercisesSkipped: number;
  exercisesSubstituted: number;
  substitutions: {
    original: string;
    substituted: string;
    reason: string;
  }[];

  // Perceived Metrics
  overallDifficultyRating: number; // 1-5
  estimatedTimeMinutes: number;
  actualTimeMinutes: number;
  fatigueAtEnd: number; // 1-5
  sorenessNextDay?: number; // 1-5

  // Satisfaction
  overallSatisfaction: number; // 1-5
  wouldRepeat: boolean;
  freeTextFeedback?: string;

  // Per-Exercise Feedback
  exerciseFeedback: {
    exerciseId: string;
    tooEasy: boolean;
    tooHard: boolean;
    causedPain: boolean;
    wouldDoAgain: boolean;
  }[];

  createdAt: Date;
}

export interface AdaptiveUserWeights {
  userId: string;

  // Weight modifiers for this user
  weightModifiers: Partial<ScoringWeightsV3>;

  // Learned preferences
  preferredPatterns: MovementPattern[];
  avoidedPatterns: MovementPattern[];
  preferredIntensityRange: { min: number; max: number };

  // Model metadata
  samplesUsed: number;
  lastUpdated: Date;
  confidence: number; // 0-1
}

// ============================================
// CACHE TYPES
// ============================================

export interface CachedUserContext {
  context: UserContextV3;
  cachedAt: Date;
  ttlSeconds: number;
  invalidateOn: string[];
}

export interface CachedExerciseMetadata {
  exercises: ExerciseMetadataV3[];
  cachedAt: Date;
  ttlSeconds: number;
}
