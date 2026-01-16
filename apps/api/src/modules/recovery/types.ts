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

// ============================================
// SLEEP HYGIENE TYPES
// ============================================

export interface SleepHygienePreferences {
  id: string;
  userId: string;
  enabled: boolean;
  showOnDashboard: boolean;
  showTips: boolean;
  showAssessments: boolean;
  bedtimeReminderEnabled: boolean;
  bedtimeReminderMinutesBefore?: number;
  morningCheckInEnabled: boolean;
  weeklyReportEnabled: boolean;
  earnCreditsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSleepHygienePreferencesInput {
  enabled?: boolean;
  showOnDashboard?: boolean;
  showTips?: boolean;
  showAssessments?: boolean;
  bedtimeReminderEnabled?: boolean;
  bedtimeReminderMinutesBefore?: number;
  morningCheckInEnabled?: boolean;
  weeklyReportEnabled?: boolean;
  earnCreditsEnabled?: boolean;
}

export type SleepHygieneTipCategory =
  | 'environment'
  | 'routine'
  | 'nutrition'
  | 'activity'
  | 'mental'
  | 'technology'
  | 'timing'
  | 'general';

export type EvidenceLevel = 'strong' | 'moderate' | 'emerging' | 'anecdotal';

export interface SleepHygieneTip {
  id: string;
  category: SleepHygieneTipCategory;
  priority: number;
  title: string;
  description: string;
  detailedExplanation?: string;
  icon: string;
  evidenceLevel?: EvidenceLevel;
  sourceReferences?: string[];
  applicableToArchetypes?: string[];
  applicableToIssues?: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SleepHygieneTipWithInteraction extends SleepHygieneTip {
  isBookmarked: boolean;
  isDismissed: boolean;
  isFollowing: boolean;
  timesShown: number;
}

export interface PreSleepChecklist {
  avoidedCaffeine?: boolean;
  avoidedAlcohol?: boolean;
  avoidedScreens1hr?: boolean;
  coolRoom?: boolean;
  darkRoom?: boolean;
  windDownRoutine?: boolean;
  consistentBedtime?: boolean;
  lightDinner?: boolean;
  noLateExercise?: boolean;
  relaxationPractice?: boolean;
}

export interface PostSleepChecklist {
  fellAsleepEasily?: boolean;
  stayedAsleep?: boolean;
  wokeRefreshed?: boolean;
  noGrogginess?: boolean;
  goodEnergy?: boolean;
  noMidnightWaking?: boolean;
}

export interface SleepHygieneAssessment {
  id: string;
  userId: string;
  assessmentDate: string;
  preSleepChecklist: PreSleepChecklist;
  postSleepChecklist: PostSleepChecklist;
  preSleepScore?: number;
  postSleepScore?: number;
  overallScore?: number;
  creditsAwarded: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSleepHygieneAssessmentInput {
  assessmentDate?: string;
  preSleepChecklist?: PreSleepChecklist;
  postSleepChecklist?: PostSleepChecklist;
  notes?: string;
}

export interface UpdateSleepHygieneAssessmentInput {
  preSleepChecklist?: PreSleepChecklist;
  postSleepChecklist?: PostSleepChecklist;
  notes?: string;
}

export type SleepStreakType =
  | 'sleep_logged'
  | 'target_duration_met'
  | 'good_quality'
  | 'excellent_quality'
  | 'hygiene_checklist'
  | 'perfect_hygiene'
  | 'consistent_bedtime'
  | 'no_screens';

export interface SleepHygieneStreak {
  id: string;
  userId: string;
  streakType: SleepStreakType;
  currentStreak: number;
  currentStreakStart?: string;
  bestStreak: number;
  bestStreakStart?: string;
  bestStreakEnd?: string;
  lastActivityDate?: string;
  totalCreditsEarned: number;
  createdAt: string;
  updatedAt: string;
}

export type SleepCreditAwardType =
  | 'daily_log'
  | 'target_met'
  | 'good_quality'
  | 'excellent_quality'
  | 'hygiene_checklist'
  | 'perfect_hygiene'
  | 'streak_milestone_7'
  | 'streak_milestone_14'
  | 'streak_milestone_30'
  | 'streak_milestone_60'
  | 'streak_milestone_90'
  | 'weekly_consistency';

export interface SleepCreditAward {
  id: string;
  userId: string;
  awardDate: string;
  awardType: SleepCreditAwardType;
  credits: number;
  sleepLogId?: string;
  assessmentId?: string;
  streakId?: string;
  metadata?: Record<string, unknown>;
  ledgerEntryId?: string;
  createdAt: string;
}

export interface SleepHygieneDashboard {
  preferences: SleepHygienePreferences;
  todayAssessment?: SleepHygieneAssessment;
  streaks: SleepHygieneStreak[];
  recentTips: SleepHygieneTipWithInteraction[];
  bookmarkedTips: SleepHygieneTipWithInteraction[];
  todayCreditsEarned: number;
  totalCreditsEarned: number;
  weeklyStats: {
    daysLogged: number;
    avgHygieneScore: number;
    creditsEarned: number;
  };
}

// Credit amounts for sleep hygiene rewards
export const SLEEP_CREDIT_AMOUNTS: Record<SleepCreditAwardType, number> = {
  daily_log: 5,
  target_met: 10,
  good_quality: 5,
  excellent_quality: 10,
  hygiene_checklist: 5,
  perfect_hygiene: 15,
  streak_milestone_7: 25,
  streak_milestone_14: 50,
  streak_milestone_30: 100,
  streak_milestone_60: 200,
  streak_milestone_90: 350,
  weekly_consistency: 20,
};
