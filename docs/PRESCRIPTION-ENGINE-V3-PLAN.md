# Prescription Engine v3.0 - Master Architecture Plan

## Executive Summary

This document outlines a comprehensive redesign of the MuscleMap Prescription Engine to transform it from a basic scoring system into an intelligent, learning, research-backed exercise recommendation platform.

**Current State (v2.0):** 8-factor scoring algorithm with 86 exercises
**Target State (v3.0):** Multi-dimensional AI-assisted engine with 500+ exercises, personalized to biomechanics, learning from feedback, and backed by exercise science research

---

## I. Architecture Vision

### Current Architecture Problems

```
Current: Request → 7 Queries → Score 86 Exercises → Pick Top N → Return
         └── No learning, no caching, no personalization depth
```

### Proposed v3.0 Architecture

```
                    ┌─────────────────────────────────────────────────┐
                    │           PRESCRIPTION ENGINE v3.0              │
                    └─────────────────────────────────────────────────┘
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          │                              │                              │
          ▼                              ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────┐
│   USER CONTEXT      │    │   EXERCISE KNOWLEDGE    │    │   LEARNING SYSTEM   │
│   LAYER             │    │   GRAPH                 │    │                     │
├─────────────────────┤    ├─────────────────────────┤    ├─────────────────────┤
│ • Biomechanics      │    │ • 500+ Exercises        │    │ • Feedback Loop     │
│ • Training Age      │    │ • Effectiveness Matrix  │    │ • Preference Model  │
│ • Recovery State    │    │ • Substitution Graph    │    │ • Adherence Predict │
│ • Limitations/Injury│    │ • Movement Patterns     │    │ • A/B Testing       │
│ • Goals & Preferences│   │ • Research Backing      │    │ • Weight Adaptation │
└─────────────────────┘    └─────────────────────────┘    └─────────────────────┘
          │                              │                              │
          └──────────────────────────────┼──────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │            SCORING ENGINE v3.0                  │
                    │  ┌────────────────────────────────────────────┐ │
                    │  │ Multi-Dimensional Scoring (16 factors)     │ │
                    │  │ • Adaptive weights per user profile        │ │
                    │  │ • Exercise-specific recovery modeling      │ │
                    │  │ • Biomechanical compatibility scoring      │ │
                    │  │ • Research-backed effectiveness ranking    │ │
                    │  └────────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │         PRESCRIPTION BUILDER                    │
                    │  • Intelligent exercise ordering                │
                    │  • Superset/circuit optimization                │
                    │  • Progressive overload suggestions             │
                    │  • Form regression/progression recommendations  │
                    └─────────────────────────────────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │              OUTPUT                              │
                    │  • Structured workout prescription              │
                    │  • Explanation/reasoning for each exercise      │
                    │  • Substitution options                         │
                    │  • Progress metrics & targets                   │
                    └─────────────────────────────────────────────────┘
```

---

## II. Core Components

### Component 1: User Context Layer

#### 1.1 Enhanced User Profile Schema

```typescript
interface UserBiomechanics {
  // Physical Attributes
  heightCm: number;
  weightKg: number;
  armSpanCm: number;
  femurLengthRelative: 'short' | 'average' | 'long';
  torsoLengthRelative: 'short' | 'average' | 'long';

  // Frame Classification
  frameSize: 'small' | 'medium' | 'large';  // Based on wrist/ankle circumference
  somatotype: 'ectomorph' | 'mesomorph' | 'endomorph' | 'mixed';

  // Mobility Assessment
  mobilityProfile: {
    shoulderFlexion: number;        // Degrees
    shoulderInternalRotation: number;
    hipFlexion: number;
    ankleFlexion: number;
    thoracicExtension: number;
    hamstringLength: number;
  };

  // Strength Curves (where user is weak in ROM)
  strengthCurveAnomalies: {
    benchPress?: 'weak_bottom' | 'weak_lockout' | 'balanced';
    squat?: 'weak_hole' | 'weak_lockout' | 'balanced';
    deadlift?: 'weak_floor' | 'weak_lockout' | 'balanced';
  };
}

interface UserTrainingProfile {
  // Experience
  trainingAgeYears: number;           // How long have they been training?
  experienceLevel: ExperienceLevel;    // beginner | intermediate | advanced | elite
  technicalProficiency: Record<MovementPattern, 1 | 2 | 3 | 4 | 5>;

  // Current Strength Levels (estimated 1RM)
  strengthLevels: {
    squat?: number;
    deadlift?: number;
    benchPress?: number;
    overheadPress?: number;
    pullUp?: number;  // Weighted or bodyweight
    row?: number;
  };

  // Historical Performance
  lifetimeWorkouts: number;
  averageSessionsPerWeek: number;
  longestConsistentStreak: number;
  currentStreak: number;

  // Preferences (learned over time)
  preferredExerciseStyles: string[];
  dislikedExercises: string[];
  preferredRepRanges: { min: number; max: number };
  preferredSessionDuration: number;
}

interface UserHealthProfile {
  // Demographics
  age: number;
  biologicalSex: 'male' | 'female';

  // Health Conditions
  activeInjuries: Injury[];
  historicalInjuries: Injury[];
  chronicalConditions: ChronicCondition[];

  // Limitations
  limitations: Limitation[];
  contraindications: string[];  // Movement patterns to avoid

  // Recovery Factors
  averageSleepHours: number;
  sleepQualityAvg: number;
  stressLevel: 'low' | 'moderate' | 'high';
  occupationType: 'sedentary' | 'light' | 'moderate' | 'heavy';

  // Menstrual Cycle (if applicable)
  cycleTracking?: {
    enabled: boolean;
    currentPhase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual';
    daysIntoCycle?: number;
  };
}
```

#### 1.2 Database Migrations Required

```sql
-- Migration: user_biomechanics
CREATE TABLE user_biomechanics (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  arm_span_cm DECIMAL(5,2),
  femur_length_relative TEXT CHECK (femur_length_relative IN ('short', 'average', 'long')),
  torso_length_relative TEXT CHECK (torso_length_relative IN ('short', 'average', 'long')),
  frame_size TEXT CHECK (frame_size IN ('small', 'medium', 'large')),
  somatotype TEXT,
  mobility_profile JSONB DEFAULT '{}',
  strength_curve_anomalies JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: user_exercise_performance (critical for learning)
CREATE TABLE user_exercise_performance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES exercises(id) ON DELETE CASCADE,

  -- Strength Metrics
  estimated_1rm DECIMAL(8,2),
  recent_max_weight DECIMAL(8,2),
  max_weight_ever DECIMAL(8,2),
  best_rep_max JSONB, -- {"3rm": 100, "5rm": 90, "10rm": 75}

  -- Volume Metrics
  lifetime_total_reps BIGINT DEFAULT 0,
  lifetime_total_tonnage DECIMAL(12,2) DEFAULT 0,
  monthly_volume_trend JSONB, -- [{"month": "2026-01", "volume": 5000}, ...]

  -- Technical Competency (1-5 scale)
  form_rating SMALLINT CHECK (form_rating BETWEEN 1 AND 5),
  skill_progression TEXT CHECK (skill_progression IN ('learning', 'competent', 'proficient', 'mastered')),
  sessions_to_competency INT,

  -- User Feedback
  enjoyment_rating SMALLINT CHECK (enjoyment_rating BETWEEN 1 AND 5),
  perceived_difficulty SMALLINT CHECK (perceived_difficulty BETWEEN 1 AND 5),
  joint_stress_experienced SMALLINT CHECK (joint_stress_experienced BETWEEN 1 AND 5),

  -- Timeline
  first_performed_at TIMESTAMPTZ,
  last_performed_at TIMESTAMPTZ,
  total_sessions INT DEFAULT 0,
  consecutive_success_sessions INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_user_exercise_perf_user ON user_exercise_performance(user_id);
CREATE INDEX idx_user_exercise_perf_exercise ON user_exercise_performance(exercise_id);
CREATE INDEX idx_user_exercise_perf_last ON user_exercise_performance(user_id, last_performed_at DESC);

-- Migration: prescription_feedback (learning loop)
CREATE TABLE prescription_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  prescription_id TEXT NOT NULL,

  -- Adherence Metrics
  exercises_prescribed INT NOT NULL,
  exercises_completed INT NOT NULL,
  exercises_skipped INT DEFAULT 0,
  exercises_substituted INT DEFAULT 0,
  substitutions JSONB, -- [{"original": "ex1", "substituted": "ex2", "reason": "..."}]

  -- Perceived Metrics
  overall_difficulty_rating SMALLINT CHECK (overall_difficulty_rating BETWEEN 1 AND 5),
  estimated_time_minutes INT,
  actual_time_minutes INT,
  fatigue_at_end SMALLINT CHECK (fatigue_at_end BETWEEN 1 AND 5),
  soreness_next_day SMALLINT CHECK (soreness_next_day BETWEEN 1 AND 5),

  -- Satisfaction
  overall_satisfaction SMALLINT CHECK (overall_satisfaction BETWEEN 1 AND 5),
  would_repeat BOOLEAN,
  free_text_feedback TEXT,

  -- Per-Exercise Feedback
  exercise_feedback JSONB, -- [{"exerciseId": "...", "tooEasy": true, "causedPain": false}]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prescription_feedback_user ON prescription_feedback(user_id);
CREATE INDEX idx_prescription_feedback_created ON prescription_feedback(created_at DESC);
```

---

### Component 2: Exercise Knowledge Graph

#### 2.1 Enhanced Exercise Schema

```typescript
interface ExerciseMetadataV3 {
  // Core Identity
  id: string;
  name: string;
  aliases: string[];  // ["bench", "chest press", "barbell bench"]
  category: ExerciseCategory;

  // Movement Classification
  movementPattern: MovementPattern;  // push, pull, squat, hinge, carry, lunge, rotation
  plane: 'sagittal' | 'frontal' | 'transverse' | 'multi';
  jointActions: JointAction[];  // [{joint: 'elbow', action: 'flexion'}]

  // Muscle Activation (research-backed percentages)
  muscleActivation: {
    primary: { muscleId: string; activation: number }[];   // 60-100% activation
    secondary: { muscleId: string; activation: number }[]; // 30-60% activation
    stabilizers: { muscleId: string; activation: number }[];// 10-30% activation
  };

  // Biomechanical Properties
  biomechanics: {
    loadingPattern: 'axial' | 'horizontal' | 'rotational' | 'unloaded';
    resistanceCurve: 'ascending' | 'descending' | 'bell' | 'flat';
    stickingPointRom: number;  // Degrees where exercise is hardest
    jointStressProfile: Record<JointId, 'low' | 'moderate' | 'high'>;
  };

  // Performance Science
  performanceMetrics: {
    cnsLoadFactor: number;           // 1-10 (deadlifts=9, curls=2)
    metabolicDemand: number;         // 1-10 (burpees=10, leg curl=3)
    technicalComplexity: number;     // 1-10 (olympic lifts=10, machines=2)
    skillLearningCurve: number;      // Sessions to competency
    balanceRequirement: number;      // 1-10 (single-leg=9, machine=1)
  };

  // Recovery Requirements
  recoveryProfile: {
    typicalSorenessHours: number;
    minimumRecoveryHours: number;
    muscleGroupRecoveryFactor: Record<MuscleId, number>;
  };

  // Effectiveness Ratings (research-backed)
  effectiveness: {
    forStrength: number;       // 1-10
    forHypertrophy: number;    // 1-10
    forPower: number;          // 1-10
    forEndurance: number;      // 1-10
    forRehabilitation: number; // 1-10
    researchCitations: string[]; // DOI references
  };

  // Constraints
  requirements: {
    equipment: string[];
    optionalEquipment: string[];
    spaceNeeded: 'minimal' | 'moderate' | 'large';
    noiseLevel: 'silent' | 'quiet' | 'moderate' | 'loud';
    safeForHome: boolean;
  };

  // Progression/Regression Graph
  progressionTree: {
    regressions: string[];     // Easier variations
    progressions: string[];    // Harder variations
    lateralVariations: string[]; // Same difficulty, different stimulus
  };

  // Safety
  contraindications: {
    injuryTypes: string[];
    conditionTypes: string[];
    ageRestrictions?: { minAge?: number; maxAge?: number };
    pregnancySafe: boolean;
  };

  // Coaching
  coaching: {
    formVideoUrl?: string;
    commonMistakesUrl?: string;
    setupCues: string[];
    executionCues: string[];
    breathingPattern: string;
  };
}

// Movement Pattern Classification
type MovementPattern =
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
```

#### 2.2 Exercise Effectiveness Matrix

```typescript
// Research-backed effectiveness rankings by goal
const EXERCISE_EFFECTIVENESS_MATRIX: Record<Goal, ExerciseRanking[]> = {
  strength: [
    { pattern: 'squat', exercises: ['back_squat', 'front_squat', 'box_squat'], efficacy: 10 },
    { pattern: 'hip_hinge', exercises: ['deadlift', 'trap_bar_dl', 'sumo_dl'], efficacy: 10 },
    { pattern: 'horizontal_push', exercises: ['bench_press', 'close_grip_bench'], efficacy: 9 },
    { pattern: 'vertical_push', exercises: ['overhead_press', 'push_press'], efficacy: 8 },
    { pattern: 'horizontal_pull', exercises: ['pendlay_row', 'bb_row'], efficacy: 8 },
    { pattern: 'vertical_pull', exercises: ['weighted_pullup', 'weighted_chinup'], efficacy: 9 },
  ],

  hypertrophy: [
    { pattern: 'horizontal_push', exercises: ['db_bench', 'incline_db', 'cable_fly'], efficacy: 10 },
    { pattern: 'horizontal_pull', exercises: ['cable_row', 'db_row', 'chest_supported_row'], efficacy: 9 },
    { pattern: 'squat', exercises: ['hack_squat', 'leg_press', 'bulgarian_split'], efficacy: 9 },
    { pattern: 'isolation_upper', exercises: ['lateral_raise', 'curl_variations', 'tricep_pushdown'], efficacy: 8 },
    { pattern: 'isolation_lower', exercises: ['leg_curl', 'leg_extension', 'calf_raise'], efficacy: 8 },
  ],

  fat_loss: [
    { pattern: 'compound', exercises: ['deadlift', 'squat', 'bench'], efficacy: 9, reason: 'high_metabolic_demand' },
    { pattern: 'metabolic', exercises: ['kettlebell_swing', 'thrusters', 'burpees'], efficacy: 10 },
    { pattern: 'circuit', exercises: ['pushup', 'row', 'squat', 'lunge'], efficacy: 9 },
  ],

  endurance: [
    { pattern: 'high_rep', exercises: ['bodyweight_squat', 'pushup', 'row'], efficacy: 8 },
    { pattern: 'metabolic', exercises: ['rowing', 'assault_bike', 'ski_erg'], efficacy: 10 },
  ],

  rehabilitation: [
    { pattern: 'mobility', exercises: ['hip_flexor_stretch', 'cat_cow', 'world_greatest'], efficacy: 10 },
    { pattern: 'stability', exercises: ['dead_bug', 'bird_dog', 'pallof_press'], efficacy: 9 },
    { pattern: 'isometric', exercises: ['plank', 'wall_sit', 'iso_holds'], efficacy: 8 },
  ],
};
```

#### 2.3 Exercise Substitution Graph

```typescript
interface SubstitutionGraph {
  // Direct substitutions (same movement pattern, similar effectiveness)
  directSubstitutes: Map<ExerciseId, SubstituteInfo[]>;

  // Equipment-based substitutes (when specific equipment unavailable)
  equipmentSubstitutes: Map<Equipment, Map<ExerciseId, ExerciseId[]>>;

  // Injury-safe substitutes (when exercise contraindicated)
  injurySafeSubstitutes: Map<InjuryType, Map<ExerciseId, ExerciseId[]>>;

  // Location-based substitutes (gym vs home vs outdoor)
  locationSubstitutes: Map<Location, Map<ExerciseId, ExerciseId[]>>;
}

interface SubstituteInfo {
  exerciseId: string;
  similarityScore: number;  // 0-100
  differenceNotes: string;  // "Less glute activation, more quad dominant"
  whenToPrefer: string[];   // ["shoulder_impingement", "limited_equipment"]
}

// Example substitution data
const SUBSTITUTION_DATA = {
  'barbell_bench_press': {
    directSubstitutes: [
      { id: 'dumbbell_bench_press', similarity: 95, note: 'More ROM, less total load' },
      { id: 'machine_chest_press', similarity: 85, note: 'Fixed path, safer for beginners' },
      { id: 'floor_press', similarity: 80, note: 'Reduced ROM, tricep emphasis' },
    ],
    injurySubstitutes: {
      'shoulder_impingement': ['neutral_grip_db_press', 'floor_press', 'landmine_press'],
      'elbow_tendinitis': ['machine_press', 'pushup_variations'],
    },
    equipmentSubstitutes: {
      'no_barbell': ['dumbbell_bench_press', 'resistance_band_press'],
      'no_bench': ['floor_press', 'pushup_variations'],
    },
  },
};
```

---

### Component 3: Intelligent Scoring Engine v3

#### 3.1 Multi-Dimensional Scoring (16 Factors)

```typescript
interface ScoringWeightsV3 {
  // Core Factors (50 points total)
  equipmentMatch: 0 | 25;              // Binary: must have equipment
  goalEffectiveness: 15;               // Research-backed effectiveness for goal
  muscleTargetMatch: 10;               // Does it hit requested muscles?

  // Personalization Factors (25 points total)
  biomechanicalFit: 8;                 // Suits user's body proportions
  skillAppropriate: 7;                 // Matches technical ability
  userPreference: 5;                   // Historical enjoyment rating
  performanceHistory: 5;               // Past success with exercise

  // Recovery & Safety (20 points total)
  recoveryAppropriate: 8;              // Based on recovery score + exercise-specific recovery
  injurySafe: 7;                       // No contraindications
  jointStressAcceptable: 5;            // Within tolerance for user

  // Periodization & Variety (10 points total)
  periodizationAlignment: 4;           // Fits current training phase
  varietyOptimization: 3;              // Introduces novelty without chaos
  movementPatternBalance: 3;           // Balances push/pull/squat/hinge

  // Bonus Factors (-10 to +10)
  progressionOpportunity: { min: -5, max: 5 };  // Can they progress from last time?
  timeEfficiency: { min: -3, max: 3 };          // Superset/circuit potential
  equipmentOptimization: { min: -2, max: 2 };   // Minimizes equipment switches
}

// Adaptive weight profiles based on user goals
const ADAPTIVE_WEIGHTS: Record<Goal, Partial<ScoringWeightsV3>> = {
  strength: {
    goalEffectiveness: 20,      // More important for strength
    skillAppropriate: 10,       // Technique matters more
    progressionOpportunity: { min: -5, max: 10 }, // Progressive overload critical
  },
  hypertrophy: {
    goalEffectiveness: 18,
    varietyOptimization: 6,     // Muscle confusion principle
    timeEfficiency: { min: -5, max: 5 }, // Supersets important
  },
  fat_loss: {
    timeEfficiency: { min: -5, max: 8 }, // Circuit training important
    recoveryAppropriate: 5,     // Can push harder
  },
  rehabilitation: {
    injurySafe: 15,             // Safety paramount
    jointStressAcceptable: 10,
    skillAppropriate: 3,        // Simpler movements okay
  },
};
```

#### 3.2 Scoring Functions

```typescript
class ScoringEngineV3 {

  /**
   * Calculate biomechanical fit score
   * Considers limb proportions, mobility, and strength curves
   */
  calculateBiomechanicalFit(
    exercise: ExerciseMetadataV3,
    user: UserBiomechanics
  ): number {
    let score = 8; // Start with max

    // Femur length affects squat mechanics
    if (exercise.movementPattern === 'squat') {
      if (user.femurLengthRelative === 'long') {
        // Long femurs = harder squat, penalize high-bar, reward low-bar/front squat
        if (exercise.id === 'high_bar_squat') score -= 3;
        if (exercise.id === 'front_squat') score -= 4;
        if (exercise.id === 'low_bar_squat') score += 2;
        if (exercise.id === 'box_squat') score += 3;
      }
    }

    // Arm span affects pressing
    if (exercise.movementPattern.includes('push')) {
      const armSpanRatio = user.armSpanCm / user.heightCm;
      if (armSpanRatio > 1.05) { // Long arms
        // Penalize full ROM pressing, reward partial ROM
        if (exercise.id === 'bench_press') score -= 2;
        if (exercise.id === 'floor_press') score += 2;
        if (exercise.id === 'board_press') score += 3;
      }
    }

    // Mobility affects overhead movements
    if (exercise.movementPattern === 'vertical_push') {
      if (user.mobilityProfile.shoulderFlexion < 170) {
        score -= 4; // Limited shoulder mobility
        if (exercise.id === 'landmine_press') score += 3; // Angled is safer
      }
      if (user.mobilityProfile.thoracicExtension < 30) {
        score -= 3; // Limited t-spine
      }
    }

    // Ankle mobility affects squats
    if (exercise.movementPattern === 'squat') {
      if (user.mobilityProfile.ankleFlexion < 35) {
        if (exercise.requirements.equipment.includes('heeled_shoes')) score += 2;
        if (exercise.id === 'goblet_squat') score -= 2;
        if (exercise.id === 'box_squat') score += 2;
      }
    }

    return Math.max(0, Math.min(8, score));
  }

  /**
   * Calculate exercise-specific recovery score
   * Uses exercise's recovery profile + user's recovery state
   */
  calculateRecoveryScore(
    exercise: ExerciseMetadataV3,
    userRecovery: RecoveryScore,
    recentHistory: ExerciseHistory[]
  ): number {
    let score = 8;

    // Check when user last did this specific exercise
    const lastPerformed = recentHistory.find(h => h.exerciseId === exercise.id);
    if (lastPerformed) {
      const hoursSince = (Date.now() - lastPerformed.performedAt.getTime()) / (1000 * 60 * 60);
      const minRecovery = exercise.recoveryProfile.minimumRecoveryHours;

      if (hoursSince < minRecovery * 0.5) {
        score = 0; // Way too soon
      } else if (hoursSince < minRecovery) {
        score = Math.round(8 * (hoursSince / minRecovery) * 0.5); // Partial recovery
      }
    }

    // Adjust for CNS-heavy exercises based on global recovery
    if (exercise.performanceMetrics.cnsLoadFactor >= 8) {
      if (userRecovery.classification === 'poor') {
        score -= 4; // Don't do deadlifts when beat up
      } else if (userRecovery.classification === 'fair') {
        score -= 2;
      }
    }

    // Low-intensity exercises get bonus when recovery is poor
    if (exercise.performanceMetrics.cnsLoadFactor <= 3) {
      if (userRecovery.classification === 'poor') {
        score += 2; // Isolation work is fine
      }
    }

    return Math.max(0, Math.min(8, score));
  }

  /**
   * Calculate goal effectiveness score
   * Uses research-backed effectiveness matrix
   */
  calculateGoalEffectiveness(
    exercise: ExerciseMetadataV3,
    userGoals: Goal[]
  ): number {
    let totalScore = 0;

    for (const goal of userGoals) {
      const effectiveness = exercise.effectiveness[`for${capitalize(goal)}`] || 5;
      totalScore += effectiveness;
    }

    // Normalize to 0-15 scale
    const avgEffectiveness = totalScore / userGoals.length;
    return Math.round((avgEffectiveness / 10) * 15);
  }

  /**
   * Calculate progression opportunity score
   * Rewards exercises where user can likely progress
   */
  calculateProgressionOpportunity(
    exercise: ExerciseMetadataV3,
    userPerformance: UserExercisePerformance | null,
    userGoals: Goal[]
  ): number {
    if (!userPerformance) {
      return 0; // Neutral for new exercises
    }

    // Check if user has been stuck
    const sessionsSinceProgress = userPerformance.consecutive_success_sessions;
    if (sessionsSinceProgress >= 3) {
      return -3; // May be stalled, try variation
    }

    // Check if strength goal and weight is trackable
    if (userGoals.includes('strength') && userPerformance.estimated_1rm) {
      const recentTrend = this.calculate1RMTrend(userPerformance);
      if (recentTrend > 0) return 5;  // Progressing well
      if (recentTrend < 0) return -3; // Regressing
    }

    // Check enjoyment - users do exercises they enjoy more consistently
    if (userPerformance.enjoyment_rating >= 4) return 3;
    if (userPerformance.enjoyment_rating <= 2) return -2;

    return 0;
  }
}
```

---

### Component 4: Prescription Builder

#### 4.1 Intelligent Exercise Ordering

```typescript
class PrescriptionBuilder {

  /**
   * Order exercises for optimal performance
   * Principles:
   * 1. Compound before isolation
   * 2. High skill before low skill (when fresh)
   * 3. CNS-heavy before metabolically demanding
   * 4. Agonist-antagonist pairing for supersets
   * 5. Pre-fatigue techniques when appropriate
   */
  orderExercises(
    exercises: ScoredExercise[],
    goals: Goal[],
    timeConstraint: number
  ): OrderedPrescription {

    // Categorize exercises
    const compounds = exercises.filter(e => e.performanceMetrics.cnsLoadFactor >= 7);
    const accessories = exercises.filter(e =>
      e.performanceMetrics.cnsLoadFactor >= 4 && e.performanceMetrics.cnsLoadFactor < 7
    );
    const isolation = exercises.filter(e => e.performanceMetrics.cnsLoadFactor < 4);

    // For strength: compounds first, heavy to light
    if (goals.includes('strength')) {
      return {
        order: [
          ...compounds.sort((a, b) => b.performanceMetrics.cnsLoadFactor - a.performanceMetrics.cnsLoadFactor),
          ...accessories,
          ...isolation,
        ],
        supersets: [], // No supersets for strength (full recovery needed)
      };
    }

    // For hypertrophy: pair agonist-antagonist for supersets
    if (goals.includes('hypertrophy')) {
      const supersets = this.findSupersetPairs(exercises);
      return {
        order: this.interleaveSupersets(compounds, accessories, isolation, supersets),
        supersets,
      };
    }

    // For fat loss: circuit style
    if (goals.includes('fat_loss')) {
      return {
        order: this.createMetabolicCircuit(exercises),
        supersets: [], // Entire workout is a circuit
        isCircuit: true,
        rounds: 3,
      };
    }

    // Default ordering
    return {
      order: [...compounds, ...accessories, ...isolation],
      supersets: [],
    };
  }

  /**
   * Find optimal superset pairs
   * Pairs opposing muscle groups to maximize rest while maintaining intensity
   */
  findSupersetPairs(exercises: ScoredExercise[]): SupersetPair[] {
    const pairs: SupersetPair[] = [];
    const used = new Set<string>();

    const pushPull = [
      ['horizontal_push', 'horizontal_pull'],
      ['vertical_push', 'vertical_pull'],
    ];

    for (const [pattern1, pattern2] of pushPull) {
      const ex1 = exercises.find(e => e.movementPattern === pattern1 && !used.has(e.id));
      const ex2 = exercises.find(e => e.movementPattern === pattern2 && !used.has(e.id));

      if (ex1 && ex2) {
        pairs.push({
          exercise1: ex1,
          exercise2: ex2,
          restBetween: 30,  // Short rest between exercises
          restAfter: 90,    // Full rest after both
        });
        used.add(ex1.id);
        used.add(ex2.id);
      }
    }

    return pairs;
  }
}
```

#### 4.2 Sets, Reps, and Load Recommendations

```typescript
interface LoadRecommendation {
  sets: number;
  reps: number | string;  // "8-12" or specific number
  rpe: number;            // 7-10 scale
  percentOf1RM?: number;  // If user has 1RM data
  restSeconds: number;
  tempo?: string;         // "3-1-2-0" (eccentric-pause-concentric-pause)
  notes: string[];
}

class LoadCalculator {

  /**
   * Calculate optimal load parameters based on goal and recovery
   */
  calculateLoad(
    exercise: ExerciseMetadataV3,
    userPerformance: UserExercisePerformance | null,
    goal: Goal,
    recovery: RecoveryScore,
    periodizationPhase: TrainingPhase
  ): LoadRecommendation {

    // Base parameters by goal
    const baseParams = GOAL_LOAD_PARAMS[goal];

    let sets = baseParams.sets;
    let reps = baseParams.reps;
    let rpe = baseParams.rpe;
    let rest = baseParams.rest;

    // Adjust for recovery state
    if (recovery.classification === 'poor') {
      sets = Math.max(2, sets - 1);
      rpe = Math.max(6, rpe - 2);
      rest = Math.round(rest * 1.3);
    } else if (recovery.classification === 'excellent') {
      rpe = Math.min(10, rpe + 0.5);
    }

    // Adjust for periodization phase
    if (periodizationPhase === 'deload') {
      sets = Math.max(2, Math.round(sets * 0.6));
      rpe = Math.max(5, rpe - 2);
    } else if (periodizationPhase === 'realization') {
      sets = Math.max(2, sets - 1);
      reps = typeof reps === 'number' ? Math.max(3, reps - 2) : '3-5';
      rpe = Math.min(10, rpe + 1);
    }

    // Calculate actual weight if user has 1RM data
    let percentOf1RM: number | undefined;
    if (userPerformance?.estimated_1rm && goal === 'strength') {
      const repRange = typeof reps === 'number' ? reps : 5;
      percentOf1RM = this.repsToPercent1RM(repRange, rpe);
    }

    // Add progressive overload suggestion
    const notes: string[] = [];
    if (userPerformance) {
      const suggestion = this.getProgressionSuggestion(userPerformance, goal);
      if (suggestion) notes.push(suggestion);
    }

    return { sets, reps, rpe, percentOf1RM, restSeconds: rest, notes };
  }

  /**
   * Convert reps and RPE to percentage of 1RM
   * Based on Brzycki formula adjusted for RPE
   */
  repsToPercent1RM(reps: number, rpe: number): number {
    // Base percentage from reps (Brzycki)
    const basePercent = 100 * (1 - 0.0278 * reps);

    // Adjust for RPE (each point of RPE ~2.5% of 1RM)
    const rpeAdjustment = (10 - rpe) * 2.5;

    return Math.round(basePercent - rpeAdjustment);
  }
}

const GOAL_LOAD_PARAMS: Record<Goal, BaseLoadParams> = {
  strength: { sets: 4, reps: 5, rpe: 8, rest: 180 },
  hypertrophy: { sets: 3, reps: '8-12', rpe: 7.5, rest: 90 },
  endurance: { sets: 3, reps: '15-20', rpe: 7, rest: 45 },
  power: { sets: 5, reps: 3, rpe: 8, rest: 180 },
  fat_loss: { sets: 3, reps: '12-15', rpe: 7, rest: 30 },
  rehabilitation: { sets: 2, reps: '12-15', rpe: 5, rest: 60 },
};
```

---

### Component 5: Learning System

#### 5.1 Feedback Collection

```typescript
interface FeedbackCollector {

  /**
   * After workout completion, prompt for feedback
   */
  async collectPostWorkoutFeedback(
    prescriptionId: string,
    completedExercises: CompletedExercise[]
  ): Promise<void> {

    // 1. Calculate automatic metrics
    const autoMetrics = {
      exercisesCompleted: completedExercises.length,
      exercisesSkipped: this.countSkipped(prescriptionId, completedExercises),
      actualDuration: this.calculateActualDuration(completedExercises),
    };

    // 2. Prompt for user ratings (in-app)
    const userRatings = await this.promptUserFeedback({
      questions: [
        { id: 'difficulty', question: 'How hard was this workout?', scale: 1-5 },
        { id: 'enjoyment', question: 'Did you enjoy it?', scale: 1-5 },
        { id: 'wouldRepeat', question: 'Would you do this again?', type: 'boolean' },
      ],
      exerciseQuestions: [
        { id: 'tooEasy', question: 'Mark exercises that were too easy', multi: true },
        { id: 'tooHard', question: 'Mark exercises that were too hard', multi: true },
        { id: 'causedPain', question: 'Mark exercises that caused discomfort', multi: true },
      ],
    });

    // 3. Store feedback
    await this.storeFeedback(prescriptionId, { ...autoMetrics, ...userRatings });

    // 4. Update user exercise performance
    await this.updateExercisePerformance(completedExercises);

    // 5. Trigger learning system update
    await this.learningSystem.processNewFeedback(prescriptionId);
  }
}
```

#### 5.2 Adaptive Weight Learning

```typescript
class AdaptiveLearningSystem {

  /**
   * Adjust scoring weights based on user feedback patterns
   * Uses simple reinforcement learning
   */
  async updateUserWeights(userId: string): Promise<void> {
    // Get user's prescription history with feedback
    const history = await this.getPrescriptionHistory(userId, 30); // Last 30 days

    if (history.length < 5) return; // Need minimum data

    // Analyze patterns
    const patterns = this.analyzePatterns(history);

    // Adjust weights based on patterns
    const weightAdjustments: Partial<ScoringWeightsV3> = {};

    // If user consistently skips certain exercise types, reduce their scores
    if (patterns.consistentlySkippedPatterns.length > 0) {
      for (const pattern of patterns.consistentlySkippedPatterns) {
        weightAdjustments[`${pattern}Penalty`] = -5;
      }
    }

    // If user rates workouts with more variety higher, increase variety weight
    if (patterns.prefersVariety) {
      weightAdjustments.varietyOptimization = 6; // Up from default 3
    }

    // If user consistently rates exercises as too easy, reduce skill tolerance
    if (patterns.consistentlyTooEasy) {
      weightAdjustments.skillAppropriate = 3; // Allow harder exercises
    }

    // If user has high adherence with certain exercise types, boost them
    for (const [exerciseType, adherence] of Object.entries(patterns.typeAdherence)) {
      if (adherence > 0.9) { // 90%+ completion
        weightAdjustments[`${exerciseType}Bonus`] = 3;
      }
    }

    // Store personalized weights
    await this.storeUserWeights(userId, weightAdjustments);
  }

  /**
   * A/B test different weight configurations
   */
  async runABTest(testConfig: ABTestConfig): Promise<void> {
    const { testName, variants, userSegment, duration } = testConfig;

    // Assign users to variants
    const assignments = await this.assignUsersToVariants(userSegment, variants);

    // Track metrics over duration
    // Metrics: prescription completion rate, satisfaction, retention

    // After duration, analyze and potentially adopt winner
    if (testConfig.autoAdopt) {
      const winner = await this.analyzeTestResults(testName);
      if (winner && winner.significantlyBetter) {
        await this.adoptWeightVariant(winner.variant);
      }
    }
  }
}
```

#### 5.3 Preference Modeling

```typescript
interface UserPreferenceModel {
  // Explicit preferences (user set)
  explicit: {
    favoriteExercises: string[];
    dislikedExercises: string[];
    preferredEquipment: string[];
    avoidedEquipment: string[];
    preferredSessionDuration: number;
    preferredWorkoutTimes: string[]; // ['morning', 'evening']
  };

  // Implicit preferences (learned from behavior)
  implicit: {
    actuallyEnjoyedExercises: string[];      // High completion + good ratings
    actuallyDislikedExercises: string[];      // Low completion or bad ratings
    optimalSetRange: { min: number; max: number };
    optimalRepRange: { min: number; max: number };
    toleratedRestPeriods: { min: number; max: number };
    preferredIntensity: 'low' | 'moderate' | 'high';
    preferredComplexity: 'simple' | 'moderate' | 'complex';
  };

  // Computed preference scores
  exerciseScores: Map<string, number>; // -10 to +10 preference modifier
}

class PreferenceModeler {

  /**
   * Build user preference model from history
   */
  async buildPreferenceModel(userId: string): Promise<UserPreferenceModel> {
    const [explicit, history, feedback] = await Promise.all([
      this.getExplicitPreferences(userId),
      this.getExerciseHistory(userId, 90), // 90 days
      this.getFeedbackHistory(userId, 90),
    ]);

    // Analyze implicit preferences
    const implicit = {
      actuallyEnjoyedExercises: this.findEnjoyedExercises(history, feedback),
      actuallyDislikedExercises: this.findDislikedExercises(history, feedback),
      optimalSetRange: this.findOptimalSetRange(history, feedback),
      optimalRepRange: this.findOptimalRepRange(history, feedback),
      toleratedRestPeriods: this.findToleratedRest(history),
      preferredIntensity: this.inferIntensityPreference(history, feedback),
      preferredComplexity: this.inferComplexityPreference(history, feedback),
    };

    // Compute per-exercise scores
    const exerciseScores = this.computeExerciseScores(explicit, implicit, history);

    return { explicit, implicit, exerciseScores };
  }

  /**
   * Find exercises user actually enjoys (not just says they do)
   */
  findEnjoyedExercises(
    history: ExerciseHistory[],
    feedback: PrescriptionFeedback[]
  ): string[] {
    const exerciseMetrics = new Map<string, {
      completionRate: number;
      averageRating: number;
      substitutionRate: number;
    }>();

    // Calculate metrics per exercise
    for (const record of history) {
      // ... aggregate metrics
    }

    // Return exercises with high completion AND good ratings
    return Array.from(exerciseMetrics.entries())
      .filter(([_, metrics]) =>
        metrics.completionRate > 0.9 &&
        metrics.averageRating >= 4 &&
        metrics.substitutionRate < 0.1
      )
      .map(([exerciseId]) => exerciseId);
  }
}
```

---

## III. Performance Optimization

### 3.1 Caching Strategy

```typescript
interface CacheConfiguration {
  // User context cache (changes infrequently)
  userContext: {
    ttl: '24h',
    invalidateOn: ['profile_update', 'injury_update', 'limitation_update'],
    storage: 'redis',
  };

  // Muscle stats cache (changes after each workout)
  muscleStats: {
    ttl: '1h',
    invalidateOn: ['workout_complete'],
    storage: 'redis',
  };

  // Exercise metadata cache (changes rarely)
  exerciseMetadata: {
    ttl: '7d',
    invalidateOn: ['exercise_update', 'admin_exercise_edit'],
    storage: 'memory+redis', // Memory for hot path, Redis for persistence
  };

  // User preferences cache
  userPreferences: {
    ttl: '24h',
    invalidateOn: ['preference_update', 'feedback_submitted'],
    storage: 'redis',
  };

  // Recovery score cache (recalculated daily)
  recoveryScore: {
    ttl: '6h',
    invalidateOn: ['sleep_logged', 'workout_complete'],
    storage: 'redis',
  };
}

class PrescriptionCache {
  private memoryCache: LRUCache<string, any>;
  private redis: Redis;

  async getUserContext(userId: string): Promise<UserContext> {
    const cacheKey = `user_context:${userId}`;

    // Check memory cache first
    let cached = this.memoryCache.get(cacheKey);
    if (cached) return cached;

    // Check Redis
    cached = await this.redis.get(cacheKey);
    if (cached) {
      this.memoryCache.set(cacheKey, JSON.parse(cached));
      return JSON.parse(cached);
    }

    // Fetch from database
    const context = await this.fetchUserContext(userId);

    // Cache in both layers
    await this.redis.setex(cacheKey, 86400, JSON.stringify(context)); // 24h
    this.memoryCache.set(cacheKey, context);

    return context;
  }
}
```

### 3.2 Query Optimization

```typescript
// Batch queries into single database round trip
class OptimizedDataFetcher {

  async fetchAllPrescriptionData(userId: string): Promise<PrescriptionData> {
    // Single query with multiple CTEs instead of 7 separate queries
    const result = await query(`
      WITH user_injuries_cte AS (
        SELECT ui.*, ip.contraindicated_movements
        FROM user_injuries ui
        JOIN injury_profiles ip ON ip.id = ui.injury_profile_id
        WHERE ui.user_id = $1 AND ui.status IN ('active', 'recovering')
      ),
      workout_history_cte AS (
        SELECT
          we.exercise_id,
          MAX(w.created_at) as last_performed,
          COUNT(*) as times_performed,
          AVG(wf.rpe) as avg_rpe
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        LEFT JOIN workout_feedback wf ON wf.workout_id = w.id
        WHERE w.user_id = $1 AND w.created_at > NOW() - INTERVAL '30 days'
        GROUP BY we.exercise_id
      ),
      muscle_stats_cte AS (
        SELECT
          ea.muscle_id,
          SUM(we.sets * we.reps * COALESCE(we.weight, 1) * (ea.activation / 100.0)) as total_volume
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        JOIN exercise_activations ea ON ea.exercise_id = we.exercise_id
        WHERE w.user_id = $1 AND w.created_at > NOW() - INTERVAL '14 days'
        GROUP BY ea.muscle_id
      ),
      user_preferences_cte AS (
        SELECT exercise_id, preference_score
        FROM user_exercise_preferences
        WHERE user_id = $1
      ),
      training_phase_cte AS (
        SELECT tp.phase_type, tp.volume_modifier, tp.intensity_modifier
        FROM training_weeks tw
        JOIN training_phases tp ON tp.id = tw.phase_id
        JOIN training_cycles tc ON tc.id = tp.cycle_id
        WHERE tc.user_id = $1 AND tc.status = 'active'
        LIMIT 1
      )
      SELECT
        (SELECT jsonb_agg(row_to_json(ui)) FROM user_injuries_cte ui) as injuries,
        (SELECT jsonb_agg(row_to_json(wh)) FROM workout_history_cte wh) as workout_history,
        (SELECT jsonb_object_agg(muscle_id, total_volume) FROM muscle_stats_cte) as muscle_stats,
        (SELECT jsonb_object_agg(exercise_id, preference_score) FROM user_preferences_cte) as preferences,
        (SELECT row_to_json(tp) FROM training_phase_cte tp) as training_phase
    `, [userId]);

    return this.transformResult(result);
  }
}
```

### 3.3 Parallel Processing

```typescript
class ParallelPrescriptionEngine {

  async generatePrescription(request: PrescriptionRequest): Promise<PrescriptionResult> {
    const { userId } = request.userContext;

    // Phase 1: Parallel data fetch (cached where possible)
    const [
      userContext,
      exerciseMetadata,
      recoveryScore,
    ] = await Promise.all([
      this.cache.getUserContext(userId),          // Usually cached
      this.cache.getExerciseMetadata(),           // Always cached
      this.recoveryService.getRecoveryScore(userId), // Computed or cached
    ]);

    // Phase 2: Score exercises in parallel batches
    const batchSize = 100;
    const exerciseBatches = this.batchArray(exerciseMetadata, batchSize);

    const scoredBatches = await Promise.all(
      exerciseBatches.map(batch =>
        this.scoreExerciseBatch(batch, userContext, recoveryScore)
      )
    );

    const allScored = scoredBatches.flat().sort((a, b) => b.score - a.score);

    // Phase 3: Sequential selection (must be sequential for muscle balance)
    const selected = this.selectExercises(allScored, request);

    // Phase 4: Parallel warmup/cooldown generation
    const [warmup, cooldown] = await Promise.all([
      request.includeWarmup ? this.generateWarmup(selected, userContext) : [],
      request.includeCooldown ? this.generateCooldown(selected, userContext) : [],
    ]);

    return this.buildPrescription(selected, warmup, cooldown, request);
  }
}
```

---

## IV. Implementation Phases

### Phase 1: Data Foundation (Weeks 1-3)

**Migrations:**
- [ ] Create `user_biomechanics` table
- [ ] Create `user_exercise_performance` table
- [ ] Create `prescription_feedback` table
- [ ] Add enhanced metadata columns to `exercises` table
- [ ] Create `exercise_effectiveness` table
- [ ] Create `exercise_substitutions` table (if not exists)

**Data Population:**
- [ ] Expand exercise database from 86 to 200+ exercises
- [ ] Populate effectiveness ratings from research
- [ ] Build substitution graph for top 50 exercises
- [ ] Add recovery profiles to all exercises

**Estimated Effort:** 3 weeks, 1 developer

### Phase 2: Core Engine Upgrade (Weeks 4-7)

**Scoring Engine:**
- [ ] Implement 16-factor scoring system
- [ ] Add biomechanical fit calculation
- [ ] Add exercise-specific recovery scoring
- [ ] Implement goal effectiveness scoring
- [ ] Add progression opportunity scoring

**Prescription Builder:**
- [ ] Implement intelligent exercise ordering
- [ ] Add superset pairing algorithm
- [ ] Implement adaptive load calculator
- [ ] Add warmup/cooldown generator v2

**Estimated Effort:** 4 weeks, 2 developers

### Phase 3: Caching & Performance (Weeks 8-9)

**Infrastructure:**
- [ ] Implement Redis caching layer
- [ ] Add memory cache for hot paths
- [ ] Batch queries into single round trip
- [ ] Implement parallel scoring
- [ ] Add performance monitoring

**Targets:**
- p50 response time: < 100ms
- p99 response time: < 500ms
- Cache hit rate: > 90%

**Estimated Effort:** 2 weeks, 1 developer

### Phase 4: Learning System (Weeks 10-13)

**Feedback Loop:**
- [ ] Implement post-workout feedback collection
- [ ] Build preference modeling system
- [ ] Create adaptive weight learning
- [ ] Add A/B testing infrastructure

**Analytics:**
- [ ] Track prescription adherence rates
- [ ] Track satisfaction scores
- [ ] Track exercise completion rates
- [ ] Build learning dashboard

**Estimated Effort:** 4 weeks, 2 developers

### Phase 5: Advanced Features (Weeks 14-16)

**Enhancements:**
- [ ] Add substitution suggestions in response
- [ ] Add reasoning/explanation for each exercise
- [ ] Implement progression tree navigation
- [ ] Add injury rehabilitation protocols
- [ ] Implement periodization-aware prescriptions

**GraphQL Updates:**
- [ ] Add new fields to Prescription type
- [ ] Add substitution query
- [ ] Add feedback mutation
- [ ] Add preference query/mutation

**Estimated Effort:** 3 weeks, 2 developers

---

## V. Success Metrics

### Primary Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Prescription completion rate | Unknown | >80% | % of prescribed exercises completed |
| User satisfaction | Unknown | >4.2/5 | Post-workout rating |
| Repeat usage | Unknown | >70% | % users who use prescription again within 7 days |
| Response time (p50) | ~300ms | <100ms | Server-side measurement |
| Response time (p99) | ~800ms | <500ms | Server-side measurement |

### Secondary Metrics

| Metric | Target | Purpose |
|--------|--------|---------|
| Exercise variety | 30+ unique exercises/month per user | Prevent staleness |
| Injury incident rate | <1% | Safety validation |
| Progression rate | Positive 1RM trend for 70%+ users | Effectiveness validation |
| Substitution acceptance | >60% | Substitution quality |
| Feedback submission rate | >40% | Learning data quality |

---

## VI. Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Exercise data quality | Recommendations may be inappropriate | Manual review of top 100 exercises, staged rollout |
| Learning system overfitting | Recommendations become narrow | Enforce minimum variety, A/B test changes |
| Cache invalidation bugs | Stale data in recommendations | Comprehensive invalidation tests, short TTLs initially |
| Migration data loss | Corrupt user data | Blue-green deployment, rollback scripts |

### Product Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-personalization | Users get stuck in comfort zone | Periodic novelty injection, "challenge me" mode |
| Analysis paralysis | Too much data overwhelms users | Progressive disclosure, sensible defaults |
| Cold start problem | New users get generic prescriptions | Enhanced onboarding questionnaire |

---

## VII. Future Considerations

### Beyond v3.0

1. **AI Form Coach** - Video analysis for real-time form feedback
2. **Voice Guidance** - Audio cues during workout
3. **Wearable Integration** - HRV, heart rate for real-time intensity adjustment
4. **Social Prescriptions** - Workouts designed for training partners
5. **Coach Marketplace** - Human coaches can customize prescriptions
6. **Multi-Modal Planning** - Combine strength, cardio, mobility in weekly plan

---

## VIII. References

### Research Citations

1. Schoenfeld, B.J. (2010). The mechanisms of muscle hypertrophy and their application to resistance training. *JSCR*
2. Krieger, J.W. (2009). Single versus multiple sets of resistance exercise. *JSCR*
3. Helms, E.R. et al. (2016). Application of the RPE scale in resistance training. *NSCA*
4. Zourdos, M.C. et al. (2016). Novel resistance training-specific rating of perceived exertion scale. *JSCR*

### Technical References

1. PostgreSQL JSONB indexing strategies
2. Redis caching patterns for real-time applications
3. LRU cache implementation in Node.js
4. GraphQL subscription patterns for streaming

---

*Document Version: 1.0*
*Last Updated: 2026-01-25*
*Author: MuscleMap Engineering*
