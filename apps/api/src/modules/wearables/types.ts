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
  createdAt: string;
}

export interface HeartRateSample {
  timestamp: string;
  bpm: number;
  source?: string;
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
  source: WearableProvider;
}

export interface ActivitySample {
  date: string;
  steps?: number;
  activeCalories?: number;
  totalCalories?: number;
  moveMinutes?: number;
  standHours?: number;
  source: WearableProvider;
}

export interface SleepSample {
  startTime: string;
  endTime: string;
  duration: number; // minutes
  sleepStages?: {
    awake?: number;
    light?: number;
    deep?: number;
    rem?: number;
  };
  source: WearableProvider;
}

export interface HealthSyncPayload {
  heartRate?: HeartRateSample[];
  workouts?: WorkoutSample[];
  activity?: ActivitySample[];
  sleep?: SleepSample[];
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
