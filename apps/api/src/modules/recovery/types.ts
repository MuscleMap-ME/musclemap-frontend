/**
 * Recovery Module Types
 *
 * Type definitions for sleep tracking and recovery scoring.
 */

// ============================================
// SLEEP LOG TYPES
// ============================================

export interface SleepLog {
  id: string;
  userId: string;
  bedTime: string;
  wakeTime: string;
  sleepDurationMinutes: number;
  quality: 1 | 2 | 3 | 4 | 5;
  sleepEnvironment?: SleepEnvironment;
  timeToFallAsleepMinutes?: number;
  wakeCount?: number;
  notes?: string;
  source: SleepSource;
  externalId?: string;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleepEnvironment {
  dark?: boolean;
  quiet?: boolean;
  temperature?: 'cold' | 'cool' | 'comfortable' | 'warm' | 'hot';
  screenBeforeBed?: boolean;
  caffeineAfter6pm?: boolean;
  alcoholConsumed?: boolean;
}

export type SleepSource = 'manual' | 'apple_health' | 'fitbit' | 'garmin' | 'google_fit' | 'whoop' | 'oura';

export interface CreateSleepLogInput {
  bedTime: string;
  wakeTime: string;
  quality: 1 | 2 | 3 | 4 | 5;
  sleepEnvironment?: SleepEnvironment;
  timeToFallAsleepMinutes?: number;
  wakeCount?: number;
  notes?: string;
  source?: SleepSource;
  externalId?: string;
  loggedAt?: string;
}

export interface UpdateSleepLogInput {
  quality?: 1 | 2 | 3 | 4 | 5;
  sleepEnvironment?: SleepEnvironment;
  timeToFallAsleepMinutes?: number;
  wakeCount?: number;
  notes?: string;
}

// ============================================
// RECOVERY SCORE TYPES
// ============================================

export interface RecoveryScore {
  id: string;
  userId: string;
  score: number;
  classification: RecoveryClassification;
  factors: RecoveryFactors;
  recommendedIntensity: WorkoutIntensity;
  recommendedWorkoutTypes: string[];
  trend?: 'improving' | 'stable' | 'declining';
  trendConfidence?: number;
  calculatedAt: string;
  expiresAt: string;
  dataSources: string[];
}

export type RecoveryClassification = 'poor' | 'fair' | 'moderate' | 'good' | 'excellent';

export type WorkoutIntensity = 'rest' | 'light' | 'moderate' | 'normal' | 'high';

export interface RecoveryFactors {
  sleepDurationScore: number;      // 0-40 points
  sleepQualityScore: number;       // 0-30 points
  restDaysScore: number;           // 0-20 points
  hrvBonus?: number;               // 0-10 points (optional)
  strainPenalty?: number;          // Negative if overtraining
  consistencyBonus?: number;       // Bonus for consistent sleep schedule
  sleepDetails?: {
    hoursSlept: number;
    targetHours: number;
    qualityRating: number;
  };
  restDetails?: {
    daysSinceLastWorkout: number;
    workoutsThisWeek: number;
    averageIntensity: number;
  };
  hrvDetails?: {
    currentHrv?: number;
    baselineHrv?: number;
    percentOfBaseline?: number;
  };
}

export interface CalculateRecoveryInput {
  userId: string;
  forceRecalculate?: boolean;
}

// ============================================
// RECOVERY RECOMMENDATION TYPES
// ============================================

export interface RecoveryRecommendation {
  id: string;
  userId: string;
  recoveryScoreId?: string;
  type: RecommendationType;
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  actionItems: ActionItem[];
  relatedExerciseIds: string[];
  relatedTipIds: string[];
  acknowledgedAt?: string;
  followed?: boolean;
  feedback?: string;
  createdAt: string;
  expiresAt: string;
}

export type RecommendationType = 'workout' | 'sleep' | 'nutrition' | 'lifestyle' | 'rest';

export interface ActionItem {
  action: string;
  completed: boolean;
}

// ============================================
// SLEEP GOAL TYPES
// ============================================

export interface SleepGoal {
  id: string;
  userId: string;
  targetHours: number;
  targetBedTime?: string;
  targetWakeTime?: string;
  targetQuality?: number;
  consistencyTarget: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSleepGoalInput {
  targetHours: number;
  targetBedTime?: string;
  targetWakeTime?: string;
  targetQuality?: number;
  consistencyTarget?: number;
}

export interface UpdateSleepGoalInput {
  targetHours?: number;
  targetBedTime?: string;
  targetWakeTime?: string;
  targetQuality?: number;
  consistencyTarget?: number;
}

// ============================================
// SLEEP STATS TYPES
// ============================================

export interface SleepStats {
  period: 'week' | 'month' | 'all';
  nightsLogged: number;
  avgDurationMinutes: number;
  avgDurationHours: number;
  avgQuality: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  consistency: number; // 0-100 percentage
  targetMet: number; // nights meeting target
  qualityDistribution: {
    terrible: number;
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
}

export interface WeeklySleepStats {
  weekStart: string;
  nightsLogged: number;
  avgDurationMinutes: number;
  avgQuality: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  stddevDuration: number;
}

// ============================================
// RECOVERY HISTORY TYPES
// ============================================

export interface RecoveryHistory {
  scores: RecoveryScore[];
  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
  bestScore: number;
  worstScore: number;
  daysTracked: number;
}

// ============================================
// COMBINED RECOVERY STATUS
// ============================================

export interface RecoveryStatus {
  currentScore?: RecoveryScore;
  lastSleep?: SleepLog;
  sleepStats: SleepStats;
  recommendations: RecoveryRecommendation[];
  sleepGoal?: SleepGoal;
  nextWorkoutSuggestion: {
    intensity: WorkoutIntensity;
    types: string[];
    reason: string;
  };
}
