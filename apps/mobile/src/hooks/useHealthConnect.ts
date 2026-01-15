/**
 * useHealthConnect Hook
 *
 * Provides Health Connect (Google Fit) integration for Android devices.
 * Features:
 * - Heart rate monitoring
 * - Workout syncing (read and write)
 * - Step tracking
 * - Sleep data
 * - Body measurements (weight, height, body fat)
 *
 * @see https://github.com/matinzd/react-native-health-connect
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
  insertRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
  Permission,
  RecordType,
} from 'react-native-health-connect';
import {
  apiClient,
  type HealthSummary,
  type HealthSyncPayload,
  type HeartRateSample,
  type WorkoutSample,
  type ActivitySample,
  type SleepSample,
  type BodyMeasurementSample,
} from '@musclemap/client';

// ============================================
// TYPES
// ============================================

interface UseHealthConnectResult {
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

const HEALTH_CONNECT_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'Height' },
  { accessType: 'write', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'write', recordType: 'Weight' },
  { accessType: 'write', recordType: 'BodyFat' },
];

// ============================================
// HELPERS
// ============================================

function isHealthConnectAvailable(): boolean {
  return Platform.OS === 'android';
}

// Map Health Connect exercise types to our workout types
function mapExerciseType(healthConnectType: number): string {
  const exerciseTypes: Record<number, string> = {
    0: 'Other',
    2: 'Badminton',
    4: 'Baseball',
    5: 'Basketball',
    8: 'Biking',
    9: 'Biking - Stationary',
    10: 'Boot Camp',
    11: 'Boxing',
    13: 'Calisthenics',
    14: 'Cricket',
    16: 'Dancing',
    25: 'Elliptical',
    26: 'Exercise Class',
    27: 'Fencing',
    28: 'Football - American',
    29: 'Football - Australian',
    31: 'Frisbee Disc',
    32: 'Golf',
    33: 'Guided Breathing',
    34: 'Gymnastics',
    35: 'Handball',
    36: 'HIIT',
    37: 'Hiking',
    38: 'Ice Hockey',
    39: 'Ice Skating',
    44: 'Martial Arts',
    46: 'Paddling',
    47: 'Paragliding',
    48: 'Pilates',
    50: 'Racquetball',
    51: 'Rock Climbing',
    52: 'Roller Hockey',
    53: 'Rowing',
    54: 'Rowing - Machine',
    55: 'Rugby',
    56: 'Running',
    57: 'Running - Treadmill',
    58: 'Sailing',
    59: 'Scuba Diving',
    60: 'Skating',
    61: 'Skiing',
    62: 'Skiing - Cross Country',
    63: 'Skiing - Downhill',
    64: 'Snowboarding',
    65: 'Snowshoeing',
    66: 'Soccer',
    67: 'Softball',
    68: 'Squash',
    69: 'Stair Climbing',
    70: 'Stair Climbing - Machine',
    71: 'Strength Training',
    72: 'Stretching',
    73: 'Surfing',
    74: 'Swimming - Open Water',
    75: 'Swimming - Pool',
    76: 'Table Tennis',
    77: 'Tennis',
    78: 'Volleyball',
    79: 'Walking',
    80: 'Water Polo',
    81: 'Weightlifting',
    82: 'Wheelchair',
    83: 'Yoga',
  };
  return exerciseTypes[healthConnectType] || 'Other';
}

// Map our workout types to Health Connect exercise types
function mapToExerciseType(workoutType: string): number {
  const typeMap: Record<string, number> = {
    'Running': 56,
    'Walking': 79,
    'Cycling': 8,
    'Biking': 8,
    'Swimming': 75,
    'Yoga': 83,
    'Pilates': 48,
    'Strength Training': 71,
    'Weightlifting': 81,
    'HIIT': 36,
    'Boxing': 11,
    'Martial Arts': 44,
    'Dancing': 16,
    'Hiking': 37,
    'Rock Climbing': 51,
    'Tennis': 77,
    'Basketball': 5,
    'Soccer': 66,
    'Football': 28,
    'Golf': 32,
    'Rowing': 53,
    'Skiing': 61,
    'Snowboarding': 64,
    'Surfing': 73,
    'Other': 0,
  };
  return typeMap[workoutType] ?? 0;
}

// ============================================
// HOOK
// ============================================

export function useHealthConnect(): UseHealthConnectResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const initializedRef = useRef(false);

  // Check availability on mount
  useEffect(() => {
    async function checkAvailability() {
      if (!isHealthConnectAvailable()) {
        setIsAvailable(false);
        return;
      }

      try {
        const status = await getSdkStatus();
        setIsAvailable(status === SdkAvailabilityStatus.SDK_AVAILABLE);

        if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
          // Initialize Health Connect
          const initialized = await initialize();
          initializedRef.current = initialized;

          if (initialized) {
            // Check if we already have authorization
            await checkAuthorization();
            await loadSummary();
          }
        }
      } catch (err) {
        console.error('Failed to check Health Connect availability:', err);
        setIsAvailable(false);
      }
    }

    checkAvailability();
  }, []);

  const checkAuthorization = useCallback(async () => {
    try {
      // Check if we've already connected to Google Fit
      const response = await apiClient.wearables.summary();
      const googleFit = response.data?.connections?.find(
        (c) => c.provider === 'google_fit' && c.isActive
      );
      setIsAuthorized(Boolean(googleFit));
    } catch {
      // Not authorized or error - that's ok
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiClient.wearables.summary();
      setSummary(response.data);

      const googleFit = response.data?.connections?.find(
        (c) => c.provider === 'google_fit' && c.isActive
      );
      setIsAuthorized(Boolean(googleFit));
    } catch (err) {
      console.error('Failed to load health summary:', err);
    }
  }, []);

  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      setError('Health Connect is not available on this device');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permissions
      const grantedPermissions = await requestPermission(HEALTH_CONNECT_PERMISSIONS);

      if (grantedPermissions.length === 0) {
        setError('No permissions were granted');
        setIsLoading(false);
        return false;
      }

      // Create connection in our backend
      await apiClient.wearables.connect('google_fit');
      setIsAuthorized(true);
      await loadSummary();
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize Health Connect');
      setIsLoading(false);
      return false;
    }
  }, [isAvailable, loadSummary]);

  // ============================================
  // DATA FETCHERS
  // ============================================

  const getHeartRate = useCallback(async (options?: DateRangeOptions): Promise<HeartRateSample[]> => {
    if (!isAuthorized || !initializedRef.current) return [];

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    try {
      const records = await readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      const samples: HeartRateSample[] = [];
      for (const record of records) {
        if (record.samples) {
          for (const sample of record.samples) {
            samples.push({
              timestamp: sample.time,
              bpm: Math.round(sample.beatsPerMinute),
              source: 'google_fit',
            });
          }
        }
      }
      return samples;
    } catch (err) {
      console.error('Failed to get heart rate:', err);
      return [];
    }
  }, [isAuthorized]);

  const getSteps = useCallback(async (options?: DateRangeOptions): Promise<number> => {
    if (!isAuthorized || !initializedRef.current) return 0;

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    try {
      const records = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      let totalSteps = 0;
      for (const record of records) {
        totalSteps += record.count || 0;
      }
      return totalSteps;
    } catch (err) {
      console.error('Failed to get steps:', err);
      return 0;
    }
  }, [isAuthorized]);

  const getWorkouts = useCallback(async (options?: DateRangeOptions): Promise<WorkoutSample[]> => {
    if (!isAuthorized || !initializedRef.current) return [];

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const records = await readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      const workouts: WorkoutSample[] = records.map((record: any) => ({
        id: record.metadata?.id || `hc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: mapExerciseType(record.exerciseType || 0),
        startTime: record.startTime,
        endTime: record.endTime,
        duration: Math.round(
          (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000
        ),
        calories: undefined, // Need to read ActiveCaloriesBurned separately
        distance: undefined, // Need to read Distance separately
        source: 'google_fit',
      }));

      return workouts;
    } catch (err) {
      console.error('Failed to get workouts:', err);
      return [];
    }
  }, [isAuthorized]);

  const getSleep = useCallback(async (options?: DateRangeOptions): Promise<SleepSample[]> => {
    if (!isAuthorized || !initializedRef.current) return [];

    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    try {
      const records = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      const sleepSamples: SleepSample[] = records.map((record: any) => {
        // Calculate sleep stages from stages array if available
        const stages = record.stages || [];
        const sleepStages = {
          awake: 0,
          light: 0,
          deep: 0,
          rem: 0,
        };

        for (const stage of stages) {
          const duration = Math.round(
            (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()) / 60000
          );
          switch (stage.stage) {
            case 1: // Awake
              sleepStages.awake += duration;
              break;
            case 2: // Sleeping (light)
            case 4: // Light
              sleepStages.light += duration;
              break;
            case 5: // Deep
              sleepStages.deep += duration;
              break;
            case 6: // REM
              sleepStages.rem += duration;
              break;
          }
        }

        return {
          id: record.metadata?.id || `sleep_${Date.now()}`,
          startTime: record.startTime,
          endTime: record.endTime,
          duration: Math.round(
            (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 60000
          ),
          sleepStages,
          source: 'google_fit',
        };
      });

      return sleepSamples;
    } catch (err) {
      console.error('Failed to get sleep:', err);
      return [];
    }
  }, [isAuthorized]);

  const getWeight = useCallback(async (): Promise<number | null> => {
    if (!isAuthorized || !initializedRef.current) return null;

    try {
      const records = await readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        },
        ascendingOrder: false,
        pageSize: 1,
      });

      if (records.length > 0) {
        // Weight is stored in kg, convert to lb for consistency with HealthKit
        return records[0].weight?.inPounds || (records[0].weight?.inKilograms * 2.20462);
      }
      return null;
    } catch (err) {
      console.error('Failed to get weight:', err);
      return null;
    }
  }, [isAuthorized]);

  const getBodyFat = useCallback(async (): Promise<number | null> => {
    if (!isAuthorized || !initializedRef.current) return null;

    try {
      const records = await readRecords('BodyFat', {
        timeRangeFilter: {
          operator: 'between',
          startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
        },
        ascendingOrder: false,
        pageSize: 1,
      });

      if (records.length > 0) {
        return records[0].percentage;
      }
      return null;
    } catch (err) {
      console.error('Failed to get body fat:', err);
      return null;
    }
  }, [isAuthorized]);

  // ============================================
  // SYNC FUNCTIONS
  // ============================================

  const syncData = useCallback(async (): Promise<void> => {
    if (!isAuthorized || !initializedRef.current) {
      setError('Health Connect is not authorized');
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
            source: 'google_fit',
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
          source: 'google_fit',
        });
      }

      if (bodyFat) {
        syncPayload.bodyMeasurements!.push({
          type: 'body_fat',
          value: bodyFat,
          unit: 'percent',
          measuredAt: now.toISOString(),
          source: 'google_fit',
        });
      }

      // Calculate active calories from workouts
      const activeCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      const moveMinutes = workouts.reduce((sum, w) => sum + Math.round((w.duration || 0) / 60), 0);
      syncPayload.activity![0].activeCalories = activeCalories;
      syncPayload.activity![0].moveMinutes = moveMinutes;

      // Send to API
      await apiClient.wearables.sync('google_fit', syncPayload);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync Health Connect data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized, loadSummary, getHeartRate, getSteps, getWorkouts, getSleep, getWeight, getBodyFat]);

  const syncWorkout = useCallback(async (workout: WorkoutInput): Promise<boolean> => {
    if (!isAuthorized || !initializedRef.current) {
      setError('Health Connect is not authorized');
      return false;
    }

    try {
      await insertRecords([
        {
          recordType: 'ExerciseSession',
          startTime: workout.startTime.toISOString(),
          endTime: workout.endTime.toISOString(),
          exerciseType: mapToExerciseType(workout.type),
        },
      ]);

      // Also insert calories if provided
      if (workout.calories && workout.calories > 0) {
        await insertRecords([
          {
            recordType: 'ActiveCaloriesBurned',
            startTime: workout.startTime.toISOString(),
            endTime: workout.endTime.toISOString(),
            energy: {
              inKilocalories: workout.calories,
            },
          },
        ]);
      }

      return true;
    } catch (err) {
      console.error('Failed to save workout to Health Connect:', err);
      setError(`Failed to save workout: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }, [isAuthorized]);

  const disconnect = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.wearables.disconnect('google_fit');
      setIsAuthorized(false);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Health Connect');
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

export default useHealthConnect;
