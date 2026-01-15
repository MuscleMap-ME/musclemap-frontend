/**
 * useHealthKit Hook
 *
 * Provides HealthKit integration for iOS devices using react-native-health.
 * Features:
 * - Heart rate monitoring
 * - Workout syncing (read and write)
 * - Step tracking
 * - Sleep data
 * - Body measurements (weight, height, body fat)
 *
 * @see https://github.com/agencyenterprise/react-native-health
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HealthInputOptions,
  HealthActivitySummary,
} from 'react-native-health';
import {
  apiClient,
  type HealthSummary,
  type HealthSyncPayload,
  type HeartRateSample,
  type WorkoutSample,
  type ActivitySample,
  type SleepSample,
  type BodyMeasurement,
} from '@musclemap/client';

// ============================================
// TYPES
// ============================================

interface UseHealthKitResult {
  isAvailable: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  error: string | null;
  summary: HealthSummary | null;
  requestAuthorization: () => Promise<boolean>;
  syncData: () => Promise<void>;
  syncWorkout: (workout: WorkoutInput) => Promise<boolean>;
  disconnect: () => Promise<void>;
  // Individual data fetchers
  getHeartRate: (options?: DateRangeOptions) => Promise<HeartRateSample[]>;
  getSteps: (options?: DateRangeOptions) => Promise<number>;
  getWorkouts: (options?: DateRangeOptions) => Promise<WorkoutSample[]>;
  getSleep: (options?: DateRangeOptions) => Promise<SleepSample[]>;
  getWeight: () => Promise<number | null>;
  getBodyFat: () => Promise<number | null>;
}

interface WorkoutInput {
  type: string;
  startTime: Date;
  endTime: Date;
  calories?: number;
  distance?: number;
  metadata?: Record<string, unknown>;
}

interface DateRangeOptions {
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// PERMISSIONS
// ============================================

const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.Height,
      AppleHealthKit.Constants.Permissions.BodyMassIndex,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
    ],
  },
};

// ============================================
// HELPERS
// ============================================

function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios' && AppleHealthKit.isAvailable !== undefined;
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Map HealthKit workout types to our workout types
function mapWorkoutType(healthKitType: number): string {
  const workoutTypes: Record<number, string> = {
    1: 'American Football',
    2: 'Archery',
    3: 'Australian Football',
    4: 'Badminton',
    5: 'Baseball',
    6: 'Basketball',
    7: 'Bowling',
    8: 'Boxing',
    9: 'Climbing',
    10: 'Cricket',
    11: 'Cross Training',
    12: 'Curling',
    13: 'Cycling',
    14: 'Dance',
    16: 'Elliptical',
    17: 'Equestrian Sports',
    18: 'Fencing',
    19: 'Fishing',
    20: 'Functional Strength Training',
    21: 'Golf',
    22: 'Gymnastics',
    23: 'Handball',
    24: 'Hiking',
    25: 'Hockey',
    26: 'Hunting',
    27: 'Lacrosse',
    28: 'Martial Arts',
    29: 'Mind and Body',
    30: 'Mixed Metabolic Cardio',
    31: 'Paddle Sports',
    32: 'Play',
    33: 'Preparation and Recovery',
    34: 'Racquetball',
    35: 'Rowing',
    36: 'Rugby',
    37: 'Running',
    38: 'Sailing',
    39: 'Skating Sports',
    40: 'Snow Sports',
    41: 'Soccer',
    42: 'Softball',
    43: 'Squash',
    44: 'Stair Climbing',
    45: 'Surfing Sports',
    46: 'Swimming',
    47: 'Table Tennis',
    48: 'Tennis',
    49: 'Track and Field',
    50: 'Traditional Strength Training',
    51: 'Volleyball',
    52: 'Walking',
    53: 'Water Fitness',
    54: 'Water Polo',
    55: 'Water Sports',
    56: 'Wrestling',
    57: 'Yoga',
    58: 'Barre',
    59: 'Core Training',
    60: 'Cross Country Skiing',
    61: 'Downhill Skiing',
    62: 'Flexibility',
    63: 'High Intensity Interval Training',
    64: 'Jump Rope',
    65: 'Kickboxing',
    66: 'Pilates',
    67: 'Snowboarding',
    68: 'Stairs',
    69: 'Step Training',
    70: 'Wheelchair Walk Pace',
    71: 'Wheelchair Run Pace',
    72: 'Tai Chi',
    73: 'Mixed Cardio',
    74: 'Hand Cycling',
    75: 'Disc Sports',
    76: 'Fitness Gaming',
    77: 'Strength Training', // Our custom mapping for weight training
    3000: 'Other',
  };
  return workoutTypes[healthKitType] || 'Other';
}

// ============================================
// HOOK
// ============================================

export function useHealthKit(): UseHealthKitResult {
  const [isAvailable] = useState(isHealthKitAvailable);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const initializedRef = useRef(false);

  // Load existing data on mount
  useEffect(() => {
    loadSummary();
    checkAuthorization();
  }, []);

  const checkAuthorization = useCallback(async () => {
    if (!isAvailable) return;

    try {
      // Check if we've already initialized and have permissions
      const response = await apiClient.wearables.summary();
      const appleHealth = response.data?.connections?.find(
        (c) => c.provider === 'apple_health' && c.isActive
      );
      setIsAuthorized(Boolean(appleHealth));
    } catch {
      // Not authorized or error - that's ok
    }
  }, [isAvailable]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiClient.wearables.summary();
      setSummary(response.data);

      const appleHealth = response.data?.connections?.find(
        (c) => c.provider === 'apple_health' && c.isActive
      );
      setIsAuthorized(Boolean(appleHealth));
    } catch (err) {
      console.error('Failed to load health summary:', err);
    }
  }, []);

  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      setError('HealthKit is not available on this device');
      return false;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, async (initError: string) => {
        if (initError) {
          setError(`HealthKit authorization failed: ${initError}`);
          setIsLoading(false);
          resolve(false);
          return;
        }

        try {
          // Create connection in our backend
          await apiClient.wearables.connect('apple_health');
          setIsAuthorized(true);
          initializedRef.current = true;
          await loadSummary();
          setIsLoading(false);
          resolve(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save HealthKit connection');
          setIsLoading(false);
          resolve(false);
        }
      });
    });
  }, [isAvailable, loadSummary]);

  // ============================================
  // DATA FETCHERS
  // ============================================

  const getHeartRate = useCallback(async (options?: DateRangeOptions): Promise<HeartRateSample[]> => {
    if (!isAuthorized) return [];

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    return new Promise((resolve) => {
      const healthOptions: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 1000,
      };

      AppleHealthKit.getHeartRateSamples(healthOptions, (err, results) => {
        if (err || !results) {
          console.error('Failed to get heart rate:', err);
          resolve([]);
          return;
        }

        const samples: HeartRateSample[] = results.map((sample: HealthValue) => ({
          timestamp: sample.startDate,
          bpm: Math.round(sample.value),
          source: 'apple_health',
        }));
        resolve(samples);
      });
    });
  }, [isAuthorized]);

  const getSteps = useCallback(async (options?: DateRangeOptions): Promise<number> => {
    if (!isAuthorized) return 0;

    const date = options?.startDate || new Date();

    return new Promise((resolve) => {
      const healthOptions = {
        date: date.toISOString(),
        includeManuallyAdded: true,
      };

      AppleHealthKit.getStepCount(healthOptions, (err, results) => {
        if (err || !results) {
          console.error('Failed to get steps:', err);
          resolve(0);
          return;
        }
        resolve(results.value || 0);
      });
    });
  }, [isAuthorized]);

  const getWorkouts = useCallback(async (options?: DateRangeOptions): Promise<WorkoutSample[]> => {
    if (!isAuthorized) return [];

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    return new Promise((resolve) => {
      const healthOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type: 'Workout',
      };

      AppleHealthKit.getSamples(healthOptions, (err, results) => {
        if (err || !results) {
          console.error('Failed to get workouts:', err);
          resolve([]);
          return;
        }

        const workouts: WorkoutSample[] = results.map((workout: any) => ({
          id: workout.id || `hk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: mapWorkoutType(workout.activityType || 3000),
          startTime: workout.startDate,
          endTime: workout.endDate,
          duration: Math.round((new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) / 1000),
          calories: Math.round(workout.calories || 0),
          distance: workout.distance ? Math.round(workout.distance * 1000) / 1000 : undefined,
          avgHeartRate: workout.metadata?.HKAverageHeartRate ? Math.round(workout.metadata.HKAverageHeartRate) : undefined,
          maxHeartRate: workout.metadata?.HKMaximumHeartRate ? Math.round(workout.metadata.HKMaximumHeartRate) : undefined,
          source: 'apple_health',
        }));
        resolve(workouts);
      });
    });
  }, [isAuthorized]);

  const getSleep = useCallback(async (options?: DateRangeOptions): Promise<SleepSample[]> => {
    if (!isAuthorized) return [];

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    return new Promise((resolve) => {
      const healthOptions: HealthInputOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      AppleHealthKit.getSleepSamples(healthOptions, (err, results) => {
        if (err || !results) {
          console.error('Failed to get sleep:', err);
          resolve([]);
          return;
        }

        const sleepSamples: SleepSample[] = results.map((sample: any) => ({
          id: sample.id || `sleep_${Date.now()}`,
          startTime: sample.startDate,
          endTime: sample.endDate,
          value: sample.value, // 'INBED', 'ASLEEP', 'AWAKE', etc.
          source: 'apple_health',
        }));
        resolve(sleepSamples);
      });
    });
  }, [isAuthorized]);

  const getWeight = useCallback(async (): Promise<number | null> => {
    if (!isAuthorized) return null;

    return new Promise((resolve) => {
      const healthOptions = {
        unit: 'pound',
      };

      AppleHealthKit.getLatestWeight(healthOptions, (err, results) => {
        if (err || !results) {
          resolve(null);
          return;
        }
        resolve(results.value || null);
      });
    });
  }, [isAuthorized]);

  const getBodyFat = useCallback(async (): Promise<number | null> => {
    if (!isAuthorized) return null;

    return new Promise((resolve) => {
      AppleHealthKit.getLatestBodyFatPercentage({}, (err, results) => {
        if (err || !results) {
          resolve(null);
          return;
        }
        resolve(results.value || null);
      });
    });
  }, [isAuthorized]);

  // ============================================
  // SYNC FUNCTIONS
  // ============================================

  const syncData = useCallback(async (): Promise<void> => {
    if (!isAuthorized) {
      setError('HealthKit is not authorized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [heartRate, steps, workouts, sleep, weight, bodyFat] = await Promise.all([
        getHeartRate({ startDate: yesterday, endDate: now }),
        getSteps({ startDate: now }),
        getWorkouts({ startDate: yesterday, endDate: now }),
        getSleep({ startDate: yesterday, endDate: now }),
        getWeight(),
        getBodyFat(),
      ]);

      // Build sync payload
      const syncPayload: HealthSyncPayload = {
        heartRate,
        activity: [
          {
            date: today,
            steps,
            activeCalories: 0, // Will be calculated from workouts
            moveMinutes: 0,
            source: 'apple_health',
          },
        ],
        workouts,
        sleep,
        bodyMeasurements: [],
      };

      // Add body measurements if available
      if (weight) {
        syncPayload.bodyMeasurements!.push({
          type: 'weight',
          value: weight,
          unit: 'lb',
          measuredAt: now.toISOString(),
          source: 'apple_health',
        });
      }

      if (bodyFat) {
        syncPayload.bodyMeasurements!.push({
          type: 'body_fat',
          value: bodyFat,
          unit: 'percent',
          measuredAt: now.toISOString(),
          source: 'apple_health',
        });
      }

      // Calculate active calories from workouts
      const activeCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      const moveMinutes = workouts.reduce((sum, w) => sum + Math.round((w.duration || 0) / 60), 0);
      syncPayload.activity![0].activeCalories = activeCalories;
      syncPayload.activity![0].moveMinutes = moveMinutes;

      // Send to API
      await apiClient.wearables.sync('apple_health', syncPayload);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync HealthKit data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, loadSummary, getHeartRate, getSteps, getWorkouts, getSleep, getWeight, getBodyFat]);

  const syncWorkout = useCallback(async (workout: WorkoutInput): Promise<boolean> => {
    if (!isAuthorized) {
      setError('HealthKit is not authorized');
      return false;
    }

    return new Promise((resolve) => {
      const healthOptions = {
        type: 'TraditionalStrengthTraining', // Default for MuscleMap workouts
        startDate: workout.startTime.toISOString(),
        endDate: workout.endTime.toISOString(),
        energyBurned: workout.calories || 0,
        distance: workout.distance || 0,
      };

      AppleHealthKit.saveWorkout(healthOptions, (err, results) => {
        if (err) {
          console.error('Failed to save workout to HealthKit:', err);
          setError(`Failed to save workout: ${err}`);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }, [isAuthorized]);

  const disconnect = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.wearables.disconnect('apple_health');
      setIsAuthorized(false);
      initializedRef.current = false;
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect HealthKit');
    } finally {
      setIsLoading(false);
    }
  }, [loadSummary]);

  return {
    isAvailable,
    isAuthorized,
    isLoading,
    error,
    summary,
    requestAuthorization,
    syncData,
    syncWorkout,
    disconnect,
    getHeartRate,
    getSteps,
    getWorkouts,
    getSleep,
    getWeight,
    getBodyFat,
  };
}

export default useHealthKit;
