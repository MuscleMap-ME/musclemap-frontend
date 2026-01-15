/**
 * Apple Watch Shared Types
 *
 * These types define the communication protocol between the
 * iPhone app and Apple Watch companion app.
 *
 * Used by:
 * - React Native hook (useWatchConnectivity)
 * - Native iOS WatchConnectivity bridge
 * - watchOS Swift app
 */

// ============================================
// CONNECTION TYPES
// ============================================

/**
 * Watch connectivity session states
 */
export type WCSessionState =
  | 'notSupported'  // Device doesn't support Watch connectivity
  | 'notPaired'     // No watch paired with this iPhone
  | 'notInstalled'  // MuscleMap not installed on watch
  | 'inactive'      // Session not activated
  | 'active';       // Ready for communication

/**
 * Connection info sent when state changes
 */
export interface WatchConnectionInfo {
  state: WCSessionState;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
  isReachable: boolean;
  watchDirectoryURL?: string;
}

// ============================================
// MESSAGE PROTOCOL
// ============================================

/**
 * All message types for watch/phone communication
 */
export enum WatchMessageType {
  // Workout lifecycle
  START_WORKOUT = 'startWorkout',
  END_WORKOUT = 'endWorkout',
  PAUSE_WORKOUT = 'pauseWorkout',
  RESUME_WORKOUT = 'resumeWorkout',

  // Exercise & set tracking
  SET_EXERCISE = 'setExercise',
  LOG_SET = 'logSet',
  SKIP_SET = 'skipSet',

  // Timer
  REST_TIMER_START = 'restTimerStart',
  REST_TIMER_STOP = 'restTimerStop',
  REST_TIMER_UPDATE = 'restTimerUpdate',

  // Health data
  HEART_RATE_UPDATE = 'heartRateUpdate',
  CALORIES_UPDATE = 'caloriesUpdate',

  // Sync
  SYNC_REQUEST = 'syncRequest',
  SYNC_RESPONSE = 'syncResponse',
  SYNC_EXERCISES = 'syncExercises',
  SYNC_TEMPLATES = 'syncTemplates',
  SYNC_USER = 'syncUser',

  // Notifications
  ACHIEVEMENT_UNLOCKED = 'achievementUnlocked',
  PR_ACHIEVED = 'prAchieved',
  WORKOUT_REMINDER = 'workoutReminder',

  // Watch complications
  UPDATE_COMPLICATION = 'updateComplication',

  // Error handling
  ERROR = 'error',
}

/**
 * Base message structure
 */
export interface WatchMessageBase {
  type: WatchMessageType;
  timestamp: number;
  replyHandler?: string;
}

/**
 * Message with typed payload
 */
export interface WatchMessage<T = unknown> extends WatchMessageBase {
  payload: T;
}

// ============================================
// WORKOUT DATA TYPES
// ============================================

/**
 * Workout types supported by Apple Watch
 */
export enum WatchWorkoutActivityType {
  TRADITIONAL_STRENGTH = 'traditionalStrengthTraining',
  FUNCTIONAL_STRENGTH = 'functionalStrengthTraining',
  HIIT = 'highIntensityIntervalTraining',
  CORE_TRAINING = 'coreTraining',
  FLEXIBILITY = 'flexibility',
  MIXED_CARDIO = 'mixedCardio',
  RUNNING = 'running',
  WALKING = 'walking',
  CYCLING = 'cycling',
  OTHER = 'other',
}

/**
 * Workout state on watch
 */
export enum WatchWorkoutState {
  NOT_STARTED = 'notStarted',
  RUNNING = 'running',
  PAUSED = 'paused',
  ENDED = 'ended',
}

/**
 * Set data logged from watch
 */
export interface WatchSetLog {
  setNumber: number;
  exerciseId: string;
  reps?: number;
  weight?: number;
  weightUnit: 'kg' | 'lbs';
  duration?: number;     // seconds (for timed exercises)
  distance?: number;     // meters
  heartRate?: number;    // BPM at completion
  rpe?: number;          // Rate of Perceived Exertion (1-10)
  notes?: string;
  completedAt: number;   // timestamp
}

/**
 * Exercise progress during workout
 */
export interface WatchExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  completedSets: number;
  sets: WatchSetLog[];
  startedAt: number;
  completedAt?: number;
}

/**
 * Full workout session data from watch
 */
export interface WatchWorkoutSession {
  id: string;
  activityType: WatchWorkoutActivityType;
  state: WatchWorkoutState;
  templateId?: string;
  templateName?: string;

  // Timing
  startedAt: number;
  endedAt?: number;
  pausedDuration: number;  // total time paused
  activeDuration: number;  // total active time

  // Exercises
  exercises: WatchExerciseProgress[];
  currentExerciseIndex: number;

  // Health metrics
  activeCalories: number;
  totalCalories: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  heartRateSamples: HeartRateSample[];

  // Location (if outdoor)
  distanceMeters?: number;
  route?: GeoCoordinate[];
}

/**
 * Heart rate sample
 */
export interface HeartRateSample {
  value: number;
  timestamp: number;
}

/**
 * Geographic coordinate
 */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
}

// ============================================
// DATA TRANSFER TYPES
// ============================================

/**
 * Exercise data transferred to watch
 */
export interface WatchExerciseData {
  id: string;
  name: string;
  shortName: string;           // Abbreviated for watch display
  category: string;
  primaryMuscle: string;
  equipment: string[];
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number;
  defaultDuration?: number;    // for timed exercises
  instructions?: string;
  isFavorite: boolean;
}

/**
 * Workout template for watch
 */
export interface WatchWorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  activityType: WatchWorkoutActivityType;
  estimatedDuration: number;  // minutes
  exercises: WatchTemplateExercise[];
  createdAt: number;
  lastUsedAt?: number;
  useCount: number;
}

/**
 * Exercise within a template
 */
export interface WatchTemplateExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  reps?: number;
  duration?: number;
  restAfter: number;  // seconds
}

/**
 * User profile for watch
 */
export interface WatchUserProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  preferredUnits: 'metric' | 'imperial';
  defaultRestDuration: number;
  showHeartRate: boolean;
  hapticFeedback: boolean;
  autoStartRest: boolean;
}

// ============================================
// APPLICATION CONTEXT
// ============================================

/**
 * Application context for background sync
 * This data is available even when the phone app isn't running
 */
export interface WatchApplicationContext {
  // User state
  userId?: string;
  isLoggedIn: boolean;

  // Current workout
  activeWorkoutId?: string;
  activeWorkoutState?: WatchWorkoutState;

  // Stats for complications
  todayWorkoutCount: number;
  currentStreak: number;
  weeklyWorkouts: number;
  totalTU: number;

  // Sync metadata
  lastSyncTimestamp: number;
  exerciseCount: number;
  templateCount: number;

  // Version info
  appVersion: string;
  dataVersion: number;  // Increment when data format changes
}

// ============================================
// COMPLICATION DATA
// ============================================

/**
 * Data for watch face complications
 */
export interface WatchComplicationData {
  // Current workout status
  isWorkoutActive: boolean;
  workoutDuration?: number;
  currentExercise?: string;
  setProgress?: string;  // e.g., "3/4"

  // Today's stats
  todayWorkouts: number;
  todayTU: number;

  // Streak
  currentStreak: number;
  streakEmoji: string;  // 🔥 or ❄️

  // Next scheduled workout (if any)
  nextWorkoutTime?: number;
  nextWorkoutName?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export enum WatchErrorCode {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_PAIRED = 'NOT_PAIRED',
  NOT_REACHABLE = 'NOT_REACHABLE',
  SESSION_INACTIVE = 'SESSION_INACTIVE',
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  WORKOUT_ERROR = 'WORKOUT_ERROR',
  SYNC_FAILED = 'SYNC_FAILED',
  HEALTHKIT_ERROR = 'HEALTHKIT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface WatchError {
  code: WatchErrorCode;
  message: string;
  details?: unknown;
}

// ============================================
// MESSAGE PAYLOADS
// ============================================

// Start workout payload
export interface StartWorkoutPayload {
  activityType: WatchWorkoutActivityType;
  templateId?: string;
  exercises?: WatchExerciseData[];
}

// Log set payload
export interface LogSetPayload {
  exerciseId: string;
  set: WatchSetLog;
}

// Rest timer payload
export interface RestTimerPayload {
  duration: number;
  exerciseName?: string;
  nextExerciseName?: string;
}

// Heart rate update payload
export interface HeartRatePayload {
  heartRate: number;
  timestamp: number;
}

// Sync exercises payload
export interface SyncExercisesPayload {
  exercises: WatchExerciseData[];
  batchIndex: number;
  totalBatches: number;
}

// Sync templates payload
export interface SyncTemplatesPayload {
  templates: WatchWorkoutTemplate[];
}

// Achievement payload
export interface AchievementPayload {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// PR payload
export interface PRPayload {
  exerciseId: string;
  exerciseName: string;
  metric: string;
  oldValue: number;
  newValue: number;
  unit: string;
}
