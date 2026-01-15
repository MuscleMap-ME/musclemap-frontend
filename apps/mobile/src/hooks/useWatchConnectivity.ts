/**
 * useWatchConnectivity Hook
 *
 * Provides Apple Watch connectivity for MuscleMap:
 * - Workout sync between watch and phone
 * - Real-time workout data streaming
 * - Watch app state management
 * - Background data transfer
 *
 * Note: This is the foundation for Watch integration.
 * Full implementation requires native watchOS app.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// Watch connectivity states
export type WatchConnectivityState =
  | 'notSupported'
  | 'notPaired'
  | 'notInstalled'
  | 'inactive'
  | 'active';

// Watch workout types
export type WatchWorkoutType =
  | 'traditionalStrengthTraining'
  | 'functionalStrengthTraining'
  | 'highIntensityIntervalTraining'
  | 'coreTraining'
  | 'flexibility'
  | 'running'
  | 'cycling'
  | 'other';

// Message types for watch/phone communication
export interface WatchMessage {
  type: WatchMessageType;
  payload: unknown;
  timestamp: number;
}

export type WatchMessageType =
  | 'startWorkout'
  | 'endWorkout'
  | 'updateExercise'
  | 'logSet'
  | 'restTimerStart'
  | 'restTimerEnd'
  | 'heartRateUpdate'
  | 'syncRequest'
  | 'syncResponse'
  | 'exerciseList'
  | 'workoutTemplate'
  | 'userProfile';

// Workout data from watch
export interface WatchWorkoutData {
  id: string;
  type: WatchWorkoutType;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  activeCalories: number;
  totalCalories: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  exercises: WatchExerciseData[];
}

export interface WatchExerciseData {
  exerciseId: string;
  sets: WatchSetData[];
  startTime: Date;
  endTime?: Date;
}

export interface WatchSetData {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  heartRate?: number;
  completedAt: Date;
}

// Heart rate sample
export interface HeartRateSample {
  value: number;
  timestamp: Date;
}

// Application context for background sync
export interface WatchApplicationContext {
  lastSyncTime?: string;
  userId?: string;
  activeWorkoutId?: string;
  exerciseCount?: number;
  todayWorkoutCount?: number;
  streak?: number;
}

// User data to transfer to watch
export interface WatchUserContext {
  userId: string;
  username: string;
  avatar?: string;
  preferredUnits: 'metric' | 'imperial';
  defaultRestDuration: number;
  favoriteExercises: string[];
}

// Exercise data for watch
export interface WatchExercise {
  id: string;
  name: string;
  category: string;
  primaryMuscle: string;
  defaultSets: number;
  defaultReps: number;
}

// Return type
export interface UseWatchConnectivityResult {
  // Connection state
  state: WatchConnectivityState;
  isReachable: boolean;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
  error: string | null;

  // Workout state
  activeWatchWorkout: WatchWorkoutData | null;
  currentHeartRate: number | null;
  heartRateHistory: HeartRateSample[];

  // Actions
  sendMessage: (message: WatchMessage) => Promise<boolean>;
  updateApplicationContext: (context: WatchApplicationContext) => Promise<boolean>;
  transferUserContext: (user: WatchUserContext) => Promise<boolean>;
  transferExercises: (exercises: WatchExercise[]) => Promise<boolean>;
  requestWorkoutSync: () => Promise<WatchWorkoutData[] | null>;

  // Workout controls (phone -> watch)
  startWatchWorkout: (type: WatchWorkoutType, templateId?: string) => Promise<boolean>;
  endWatchWorkout: () => Promise<WatchWorkoutData | null>;
  sendExerciseToWatch: (exerciseId: string) => Promise<boolean>;
  sendRestTimerToWatch: (duration: number) => Promise<boolean>;
}

// Placeholder for native module (will be implemented in native code)
const WatchConnectivityModule = NativeModules.MuscleMapWatchConnectivity;
const hasNativeModule = !!WatchConnectivityModule;

/**
 * Hook for Apple Watch connectivity
 */
export function useWatchConnectivity(): UseWatchConnectivityResult {
  const [state, setState] = useState<WatchConnectivityState>(
    Platform.OS !== 'ios' ? 'notSupported' : 'inactive'
  );
  const [isReachable, setIsReachable] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [isWatchAppInstalled, setIsWatchAppInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeWatchWorkout, setActiveWatchWorkout] = useState<WatchWorkoutData | null>(null);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateSample[]>([]);

  const eventEmitter = useRef<NativeEventEmitter | null>(null);

  // Initialize watch connectivity
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setState('notSupported');
      return;
    }

    if (!hasNativeModule) {
      // Native module not available yet - this is expected during development
      console.log('WatchConnectivity: Native module not available');
      setState('notSupported');
      return;
    }

    // Create event emitter
    eventEmitter.current = new NativeEventEmitter(WatchConnectivityModule);

    // Subscribe to state changes
    const stateSubscription = eventEmitter.current.addListener(
      'watchConnectivityStateChanged',
      (newState: { state: WatchConnectivityState; isPaired: boolean; isInstalled: boolean }) => {
        setState(newState.state);
        setIsPaired(newState.isPaired);
        setIsWatchAppInstalled(newState.isInstalled);
      }
    );

    // Subscribe to reachability changes
    const reachabilitySubscription = eventEmitter.current.addListener(
      'watchReachabilityChanged',
      (data: { isReachable: boolean }) => {
        setIsReachable(data.isReachable);
      }
    );

    // Subscribe to message received
    const messageSubscription = eventEmitter.current.addListener(
      'watchMessageReceived',
      handleWatchMessage
    );

    // Subscribe to heart rate updates
    const heartRateSubscription = eventEmitter.current.addListener(
      'watchHeartRateUpdated',
      (data: { heartRate: number; timestamp: string }) => {
        const sample: HeartRateSample = {
          value: data.heartRate,
          timestamp: new Date(data.timestamp),
        };
        setCurrentHeartRate(data.heartRate);
        setHeartRateHistory((prev) => [...prev.slice(-60), sample]); // Keep last 60 samples
      }
    );

    // Subscribe to workout updates
    const workoutSubscription = eventEmitter.current.addListener(
      'watchWorkoutUpdated',
      (data: WatchWorkoutData) => {
        setActiveWatchWorkout(data);
      }
    );

    // Activate session
    WatchConnectivityModule.activateSession()
      .then((result: { isPaired: boolean; isInstalled: boolean; isReachable: boolean }) => {
        setIsPaired(result.isPaired);
        setIsWatchAppInstalled(result.isInstalled);
        setIsReachable(result.isReachable);
        setState(result.isPaired ? (result.isInstalled ? 'active' : 'notInstalled') : 'notPaired');
      })
      .catch((err: Error) => {
        setError(err.message);
        setState('inactive');
      });

    return () => {
      stateSubscription.remove();
      reachabilitySubscription.remove();
      messageSubscription.remove();
      heartRateSubscription.remove();
      workoutSubscription.remove();
    };
  }, []);

  // Handle incoming watch messages
  const handleWatchMessage = useCallback((message: WatchMessage) => {
    switch (message.type) {
      case 'heartRateUpdate':
        const hrData = message.payload as { heartRate: number };
        setCurrentHeartRate(hrData.heartRate);
        break;

      case 'endWorkout':
        const workoutData = message.payload as WatchWorkoutData;
        setActiveWatchWorkout(null);
        setHeartRateHistory([]);
        // Return the workout data to be synced
        break;

      case 'logSet':
        // Update active workout with new set data
        if (activeWatchWorkout) {
          const setData = message.payload as { exerciseId: string; set: WatchSetData };
          setActiveWatchWorkout((prev) => {
            if (!prev) return null;
            const exercises = [...prev.exercises];
            const exerciseIdx = exercises.findIndex((e) => e.exerciseId === setData.exerciseId);
            if (exerciseIdx >= 0) {
              exercises[exerciseIdx] = {
                ...exercises[exerciseIdx],
                sets: [...exercises[exerciseIdx].sets, setData.set],
              };
            }
            return { ...prev, exercises };
          });
        }
        break;

      case 'syncRequest':
        // Watch is requesting sync
        break;

      default:
        console.log('Unknown watch message type:', message.type);
    }
  }, [activeWatchWorkout]);

  // Send message to watch
  const sendMessage = useCallback(async (message: WatchMessage): Promise<boolean> => {
    if (!hasNativeModule || state !== 'active' || !isReachable) {
      return false;
    }

    try {
      await WatchConnectivityModule.sendMessage(message);
      return true;
    } catch (err) {
      console.error('Failed to send message to watch:', err);
      return false;
    }
  }, [state, isReachable]);

  // Update application context (background sync)
  const updateApplicationContext = useCallback(
    async (context: WatchApplicationContext): Promise<boolean> => {
      if (!hasNativeModule || state !== 'active') {
        return false;
      }

      try {
        await WatchConnectivityModule.updateApplicationContext(context);
        return true;
      } catch (err) {
        console.error('Failed to update application context:', err);
        return false;
      }
    },
    [state]
  );

  // Transfer user context to watch
  const transferUserContext = useCallback(
    async (user: WatchUserContext): Promise<boolean> => {
      if (!hasNativeModule || state !== 'active') {
        return false;
      }

      try {
        await WatchConnectivityModule.transferUserInfo(user);
        return true;
      } catch (err) {
        console.error('Failed to transfer user context:', err);
        return false;
      }
    },
    [state]
  );

  // Transfer exercises to watch
  const transferExercises = useCallback(
    async (exercises: WatchExercise[]): Promise<boolean> => {
      if (!hasNativeModule || state !== 'active') {
        return false;
      }

      try {
        // Batch exercises in groups of 50 to avoid transfer size limits
        const batchSize = 50;
        for (let i = 0; i < exercises.length; i += batchSize) {
          const batch = exercises.slice(i, i + batchSize);
          await WatchConnectivityModule.transferFile({
            type: 'exercises',
            data: batch,
            metadata: { batch: Math.floor(i / batchSize), total: Math.ceil(exercises.length / batchSize) },
          });
        }
        return true;
      } catch (err) {
        console.error('Failed to transfer exercises:', err);
        return false;
      }
    },
    [state]
  );

  // Request workout sync from watch
  const requestWorkoutSync = useCallback(async (): Promise<WatchWorkoutData[] | null> => {
    if (!hasNativeModule || state !== 'active' || !isReachable) {
      return null;
    }

    try {
      const workouts = await WatchConnectivityModule.requestWorkoutSync();
      return workouts;
    } catch (err) {
      console.error('Failed to request workout sync:', err);
      return null;
    }
  }, [state, isReachable]);

  // Start workout on watch
  const startWatchWorkout = useCallback(
    async (type: WatchWorkoutType, templateId?: string): Promise<boolean> => {
      const message: WatchMessage = {
        type: 'startWorkout',
        payload: { workoutType: type, templateId },
        timestamp: Date.now(),
      };
      return sendMessage(message);
    },
    [sendMessage]
  );

  // End workout on watch
  const endWatchWorkout = useCallback(async (): Promise<WatchWorkoutData | null> => {
    if (!hasNativeModule || state !== 'active') {
      return null;
    }

    try {
      const workoutData = await WatchConnectivityModule.endWorkout();
      setActiveWatchWorkout(null);
      setHeartRateHistory([]);
      return workoutData;
    } catch (err) {
      console.error('Failed to end workout:', err);
      return null;
    }
  }, [state]);

  // Send exercise to watch
  const sendExerciseToWatch = useCallback(
    async (exerciseId: string): Promise<boolean> => {
      const message: WatchMessage = {
        type: 'updateExercise',
        payload: { exerciseId },
        timestamp: Date.now(),
      };
      return sendMessage(message);
    },
    [sendMessage]
  );

  // Send rest timer to watch
  const sendRestTimerToWatch = useCallback(
    async (duration: number): Promise<boolean> => {
      const message: WatchMessage = {
        type: 'restTimerStart',
        payload: { duration },
        timestamp: Date.now(),
      };
      return sendMessage(message);
    },
    [sendMessage]
  );

  return {
    state,
    isReachable,
    isPaired,
    isWatchAppInstalled,
    error,
    activeWatchWorkout,
    currentHeartRate,
    heartRateHistory,
    sendMessage,
    updateApplicationContext,
    transferUserContext,
    transferExercises,
    requestWorkoutSync,
    startWatchWorkout,
    endWatchWorkout,
    sendExerciseToWatch,
    sendRestTimerToWatch,
  };
}

export default useWatchConnectivity;
