/**
 * useHealth Hook
 *
 * Unified health data hook that abstracts platform-specific health APIs.
 * - iOS: Uses Apple HealthKit via react-native-health
 * - Android: Uses Google Health Connect via react-native-health-connect
 *
 * This hook provides a consistent API across platforms for:
 * - Heart rate monitoring
 * - Workout syncing (read and write)
 * - Step tracking
 * - Sleep data
 * - Body measurements
 */
import { Platform } from 'react-native';
import { useHealthKit } from './useHealthKit';
import { useHealthConnect } from './useHealthConnect';
import type {
  HealthSummary,
  HeartRateSample,
  WorkoutSample,
  SleepSample,
} from '@musclemap/client';

// ============================================
// TYPES
// ============================================

export interface UseHealthResult {
  /** Whether the health platform is available on this device */
  isAvailable: boolean;
  /** Whether the user has authorized health data access */
  isAuthorized: boolean;
  /** Whether a sync or authorization is in progress */
  isLoading: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Current health summary from the backend */
  summary: HealthSummary | null;
  /** Name of the health platform being used */
  platformName: 'Apple Health' | 'Google Health Connect' | 'None';
  /** Request authorization to access health data */
  requestAuthorization: () => Promise<boolean>;
  /** Sync all health data to the backend */
  syncData: () => Promise<void>;
  /** Write a workout to the health platform */
  syncWorkout: (workout: WorkoutInput) => Promise<boolean>;
  /** Disconnect from the health platform */
  disconnect: () => Promise<void>;
  /** Get heart rate samples */
  getHeartRate: (options?: DateRangeOptions) => Promise<HeartRateSample[]>;
  /** Get step count */
  getSteps: (options?: DateRangeOptions) => Promise<number>;
  /** Get workout records */
  getWorkouts: (options?: DateRangeOptions) => Promise<WorkoutSample[]>;
  /** Get sleep records */
  getSleep: (options?: DateRangeOptions) => Promise<SleepSample[]>;
  /** Get latest weight in pounds */
  getWeight: () => Promise<number | null>;
  /** Get latest body fat percentage */
  getBodyFat: () => Promise<number | null>;
}

export interface WorkoutInput {
  type: string;
  startTime: Date;
  endTime: Date;
  calories?: number;
  distance?: number;
  metadata?: Record<string, unknown>;
}

export interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// HOOK
// ============================================

/**
 * Unified health hook that automatically uses the appropriate platform API
 */
export function useHealth(): UseHealthResult {
  const healthKit = useHealthKit();
  const healthConnect = useHealthConnect();

  // Determine which platform to use
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  // Use HealthKit on iOS, Health Connect on Android
  const health = isIOS ? healthKit : healthConnect;

  // Determine platform name
  let platformName: 'Apple Health' | 'Google Health Connect' | 'None' = 'None';
  if (isIOS && healthKit.isAvailable) {
    platformName = 'Apple Health';
  } else if (isAndroid && healthConnect.isAvailable) {
    platformName = 'Google Health Connect';
  }

  return {
    isAvailable: health.isAvailable,
    isAuthorized: health.isAuthorized,
    isLoading: health.isLoading,
    error: health.error,
    summary: health.summary,
    platformName,
    requestAuthorization: health.requestAuthorization,
    syncData: health.syncData,
    syncWorkout: health.syncWorkout,
    disconnect: health.disconnect,
    getHeartRate: health.getHeartRate,
    getSteps: health.getSteps,
    getWorkouts: health.getWorkouts,
    getSleep: health.getSleep,
    getWeight: health.getWeight,
    getBodyFat: health.getBodyFat,
  };
}

export default useHealth;
