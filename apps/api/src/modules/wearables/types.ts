/**
 * Wearables Types
 *
 * Type definitions for wearable device integrations (Apple Watch, Fitbit, etc.)
 */

export type WearableProvider = 'apple_health' | 'fitbit' | 'garmin' | 'google_fit' | 'whoop' | 'oura';

export interface WearableConnection {
  id: string;
  userId: string;
  provider: WearableProvider;
  providerUserId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncError?: string | null;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  createdAt: string;
}

export interface HeartRateSample {
  timestamp: string;
  bpm: number;
  source?: string;
  context?: 'resting' | 'active' | 'workout' | 'sleep';
}

export interface WorkoutSample {
  id: string;
  type: string;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  calories?: number;
  distance?: number; // meters
  avgHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  steps?: number;
  elevationGain?: number; // meters
  source: WearableProvider;
  externalId?: string; // ID from the source platform
}

export interface ActivitySample {
  date: string;
  steps?: number;
  activeCalories?: number;
  totalCalories?: number;
  moveMinutes?: number;
  standHours?: number;
  exerciseMinutes?: number;
  distanceMeters?: number;
  floorsClimbed?: number;
  source: WearableProvider;
}

export interface SleepSample {
  id?: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  sleepStages?: {
    awake?: number;
    light?: number;
    deep?: number;
    rem?: number;
  };
  sleepScore?: number;
  source: WearableProvider;
}

export interface BodyMeasurementSample {
  type: 'weight' | 'body_fat' | 'height' | 'bmi' | 'lean_mass';
  value: number;
  unit: string;
  measuredAt: string;
  source: WearableProvider;
}

export interface HealthSyncPayload {
  heartRate?: HeartRateSample[];
  workouts?: WorkoutSample[];
  activity?: ActivitySample[];
  sleep?: SleepSample[];
  bodyMeasurements?: BodyMeasurementSample[];
}

export interface HealthSyncResult {
  synced: {
    heartRate: number;
    workouts: number;
    activity: number;
    sleep: number;
    bodyMeasurements: number;
  };
  conflicts: SyncConflict[];
  lastSyncAt: string;
}

export interface SyncConflict {
  type: 'workout' | 'activity' | 'bodyMeasurement';
  localId?: string;
  remoteId?: string;
  field?: string;
  localValue?: unknown;
  remoteValue?: unknown;
  resolution: 'local_wins' | 'remote_wins' | 'merged' | 'skipped';
  timestamp: string;
}

export interface HealthSyncStatus {
  provider: WearableProvider;
  lastSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  lastSyncedCounts?: {
    heartRate: number;
    workouts: number;
    activity: number;
    sleep: number;
    bodyMeasurements: number;
  };
  nextScheduledSync?: string;
}

export interface HealthSummary {
  today: {
    steps: number;
    activeCalories: number;
    avgHeartRate: number | null;
    workoutMinutes: number;
    sleepHours: number | null;
  };
  thisWeek: {
    totalSteps: number;
    avgDailySteps: number;
    totalWorkoutMinutes: number;
    avgSleepHours: number | null;
    avgRestingHeartRate: number | null;
  };
  connections: WearableConnection[];
  syncStatus?: HealthSyncStatus[];
}

export interface WearableEvent {
  type: 'health.synced' | 'health.workout_detected' | 'health.goal_achieved';
  userId: string;
  data: {
    provider?: WearableProvider;
    summary?: Partial<HealthSummary>;
    workout?: WorkoutSample;
    goal?: string;
    message?: string;
  };
}

// Conflict resolution strategy
export type ConflictResolutionStrategy = 'local_wins' | 'remote_wins' | 'newest_wins' | 'merge';

export interface SyncOptions {
  conflictStrategy?: ConflictResolutionStrategy;
  syncDirection?: 'upload' | 'download' | 'bidirectional';
  startDate?: string;
  endDate?: string;
}
