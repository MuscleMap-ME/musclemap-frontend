/**
 * Watch Connectivity Bridge
 *
 * TypeScript interface for communicating between the React Native app
 * and the Apple Watch companion app via WatchConnectivity.
 *
 * This module provides methods for:
 * - Sending workout data to the watch
 * - Receiving workout completions from the watch
 * - Syncing rest timer state
 * - Checking watch connectivity status
 *
 * Note: This module requires react-native-watch-connectivity to be installed
 * and configured. It only works on iOS with a paired Apple Watch.
 *
 * @example
 * ```typescript
 * import { watchConnectivity } from '@/native/WatchConnectivity';
 *
 * // Send workout to watch
 * await watchConnectivity.sendWorkoutToWatch({
 *   exercises: [...],
 *   restTimer: { defaultSeconds: 90 }
 * });
 *
 * // Listen for workout completion
 * watchConnectivity.onWorkoutCompleted((data) => {
 *   console.log('Workout from watch:', data);
 * });
 * ```
 */

import { Platform, NativeEventEmitter, NativeModules } from 'react-native';

// Types
export interface WatchExercise {
  id: string;
  name: string;
  muscleGroup: string;
  usesWeight: boolean;
  defaultSets: number;
  defaultReps: number;
  defaultRestSeconds: number;
}

export interface WatchWorkoutPrescription {
  exercises: WatchExercise[];
  restTimer?: {
    defaultSeconds: number;
  };
  userId?: string;
  workoutName?: string;
}

export interface WatchWorkoutResult {
  id: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
  exercises: WatchSetData[];
  totalSets: number;
  totalReps: number;
  heartRateSamples: number[];
  caloriesBurned: number;
}

export interface WatchSetData {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WatchRestTimerState {
  isActive: boolean;
  remainingSeconds: number;
  defaultSeconds: number;
}

export interface WatchConnectionStatus {
  isPaired: boolean;
  isReachable: boolean;
  isWatchAppInstalled: boolean;
  activationState: 'notActivated' | 'inactive' | 'activated';
}

export type WatchMessageType =
  | 'workout_started'
  | 'workout_ended'
  | 'set_logged'
  | 'rest_timer_started'
  | 'rest_timer_stopped'
  | 'exercise_changed'
  | 'sync_request'
  | 'sync_response'
  | 'user_data_update'
  | 'workout_prescription';

export interface WatchMessage {
  type: WatchMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
}

// Event listener types
type WorkoutCompletedListener = (data: WatchWorkoutResult) => void;
type SetLoggedListener = (data: WatchSetData & { workoutId: string }) => void;
type RestTimerListener = (state: WatchRestTimerState) => void;
type ConnectionStatusListener = (status: WatchConnectionStatus) => void;
type MessageListener = (message: WatchMessage) => void;

/**
 * Watch Connectivity Manager
 *
 * Provides a high-level API for communicating with the Apple Watch companion app.
 * Handles message passing, event subscription, and error handling.
 */
class WatchConnectivityManager {
  private isSupported: boolean;
  private eventEmitter: NativeEventEmitter | null = null;
  private subscriptions: Map<string, Set<Function>> = new Map();
  private nativeModule: any = null;

  constructor() {
    // Only supported on iOS
    this.isSupported = Platform.OS === 'ios';

    if (this.isSupported) {
      try {
        // Try to get the native module
        // This will be available after react-native-watch-connectivity is installed
        this.nativeModule = NativeModules.WatchConnectivity;

        if (this.nativeModule) {
          this.eventEmitter = new NativeEventEmitter(this.nativeModule);
          this.setupEventListeners();
        }
      } catch (error) {
        console.warn('[WatchConnectivity] Native module not available:', error);
      }
    }
  }

  /**
   * Check if Watch Connectivity is supported on this device
   */
  isWatchConnectivitySupported(): boolean {
    return this.isSupported && this.nativeModule !== null;
  }

  /**
   * Get the current connection status with the Apple Watch
   */
  async getConnectionStatus(): Promise<WatchConnectionStatus> {
    if (!this.isWatchConnectivitySupported()) {
      return {
        isPaired: false,
        isReachable: false,
        isWatchAppInstalled: false,
        activationState: 'notActivated',
      };
    }

    try {
      const status = await this.nativeModule.getReachability();
      return {
        isPaired: status.isPaired ?? false,
        isReachable: status.isReachable ?? false,
        isWatchAppInstalled: status.isWatchAppInstalled ?? false,
        activationState: status.activationState ?? 'notActivated',
      };
    } catch (error) {
      console.error('[WatchConnectivity] Failed to get connection status:', error);
      return {
        isPaired: false,
        isReachable: false,
        isWatchAppInstalled: false,
        activationState: 'notActivated',
      };
    }
  }

  /**
   * Send a workout prescription to the watch
   * The watch app will display these exercises for the user to log
   */
  async sendWorkoutToWatch(prescription: WatchWorkoutPrescription): Promise<boolean> {
    if (!this.isWatchConnectivitySupported()) {
      console.warn('[WatchConnectivity] Watch connectivity not supported');
      return false;
    }

    try {
      const message = {
        type: 'workout_prescription',
        payload: prescription,
        timestamp: Date.now(),
      };

      await this.nativeModule.sendMessage(message);
      return true;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to send workout to watch:', error);
      return false;
    }
  }

  /**
   * Send a message to the watch
   */
  async sendMessage(
    type: WatchMessageType,
    payload: Record<string, unknown> = {}
  ): Promise<boolean> {
    if (!this.isWatchConnectivitySupported()) {
      return false;
    }

    try {
      const message = {
        type,
        payload,
        timestamp: Date.now(),
      };

      await this.nativeModule.sendMessage(message);
      return true;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Send user data update to the watch (today's stats, etc.)
   */
  async sendUserDataUpdate(data: {
    todayTU: number;
    todayWorkouts: number;
    creditBalance?: number;
    streakDays?: number;
  }): Promise<boolean> {
    return this.sendMessage('user_data_update', data);
  }

  /**
   * Request the current workout state from the watch
   */
  async requestWorkoutState(): Promise<WatchWorkoutResult | null> {
    if (!this.isWatchConnectivitySupported()) {
      return null;
    }

    try {
      const response = await this.nativeModule.sendMessage(
        { type: 'sync_request', payload: {}, timestamp: Date.now() },
        true // wait for reply
      );
      return response?.workout ?? null;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to request workout state:', error);
      return null;
    }
  }

  /**
   * Sync rest timer state with the watch
   */
  async syncRestTimer(state: WatchRestTimerState): Promise<boolean> {
    return this.sendMessage(state.isActive ? 'rest_timer_started' : 'rest_timer_stopped', {
      remainingSeconds: state.remainingSeconds,
      defaultSeconds: state.defaultSeconds,
    });
  }

  /**
   * Subscribe to workout completion events from the watch
   */
  onWorkoutCompleted(listener: WorkoutCompletedListener): () => void {
    return this.addListener('workout_ended', listener);
  }

  /**
   * Subscribe to set logged events from the watch
   */
  onSetLogged(listener: SetLoggedListener): () => void {
    return this.addListener('set_logged', listener);
  }

  /**
   * Subscribe to rest timer state changes from the watch
   */
  onRestTimerChanged(listener: RestTimerListener): () => void {
    return this.addListener('rest_timer', listener);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChanged(listener: ConnectionStatusListener): () => void {
    return this.addListener('connection_status', listener);
  }

  /**
   * Subscribe to all messages from the watch
   */
  onMessage(listener: MessageListener): () => void {
    return this.addListener('message', listener);
  }

  // Private helper methods

  private setupEventListeners(): void {
    if (!this.eventEmitter) return;

    // Listen for messages from watch
    this.eventEmitter.addListener('WatchMessage', (message: WatchMessage) => {
      this.handleWatchMessage(message);
    });

    // Listen for reachability changes
    this.eventEmitter.addListener('WatchReachabilityChanged', (status: WatchConnectionStatus) => {
      this.notifyListeners('connection_status', status);
    });
  }

  private handleWatchMessage(message: WatchMessage): void {
    // Notify generic message listeners
    this.notifyListeners('message', message);

    // Notify specific listeners based on message type
    switch (message.type) {
      case 'workout_ended':
        this.notifyListeners('workout_ended', message.payload as WatchWorkoutResult);
        break;

      case 'set_logged':
        this.notifyListeners('set_logged', message.payload);
        break;

      case 'rest_timer_started':
      case 'rest_timer_stopped':
        this.notifyListeners('rest_timer', {
          isActive: message.type === 'rest_timer_started',
          ...message.payload,
        });
        break;
    }
  }

  private addListener(event: string, listener: Function): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }

    this.subscriptions.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(event)?.delete(listener);
    };
  }

  private notifyListeners(event: string, data: unknown): void {
    const listeners = this.subscriptions.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[WatchConnectivity] Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const watchConnectivity = new WatchConnectivityManager();

// Export hook for React components
import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for Watch Connectivity
 *
 * @example
 * ```tsx
 * function WorkoutScreen() {
 *   const {
 *     isSupported,
 *     isReachable,
 *     sendWorkout,
 *     lastWorkoutFromWatch
 *   } = useWatchConnectivity();
 *
 *   if (!isSupported) {
 *     return <Text>Watch not supported</Text>;
 *   }
 *
 *   return (
 *     <Button
 *       onPress={() => sendWorkout(prescription)}
 *       disabled={!isReachable}
 *     >
 *       Send to Watch
 *     </Button>
 *   );
 * }
 * ```
 */
export function useWatchConnectivity() {
  const [isSupported] = useState(watchConnectivity.isWatchConnectivitySupported());
  const [connectionStatus, setConnectionStatus] = useState<WatchConnectionStatus>({
    isPaired: false,
    isReachable: false,
    isWatchAppInstalled: false,
    activationState: 'notActivated',
  });
  const [lastWorkoutFromWatch, setLastWorkoutFromWatch] = useState<WatchWorkoutResult | null>(null);
  const [lastSetFromWatch, setLastSetFromWatch] = useState<WatchSetData | null>(null);

  useEffect(() => {
    // Get initial connection status
    watchConnectivity.getConnectionStatus().then(setConnectionStatus);

    // Subscribe to events
    const unsubscribeConnection = watchConnectivity.onConnectionStatusChanged(setConnectionStatus);
    const unsubscribeWorkout = watchConnectivity.onWorkoutCompleted(setLastWorkoutFromWatch);
    const unsubscribeSet = watchConnectivity.onSetLogged((data) => {
      setLastSetFromWatch({
        exerciseId: data.exerciseId,
        setNumber: data.setNumber,
        reps: data.reps,
        weight: data.weight,
      });
    });

    return () => {
      unsubscribeConnection();
      unsubscribeWorkout();
      unsubscribeSet();
    };
  }, []);

  const sendWorkout = useCallback(async (prescription: WatchWorkoutPrescription) => {
    return watchConnectivity.sendWorkoutToWatch(prescription);
  }, []);

  const sendUserData = useCallback(
    async (data: Parameters<typeof watchConnectivity.sendUserDataUpdate>[0]) => {
      return watchConnectivity.sendUserDataUpdate(data);
    },
    []
  );

  const syncRestTimer = useCallback(async (state: WatchRestTimerState) => {
    return watchConnectivity.syncRestTimer(state);
  }, []);

  return {
    isSupported,
    isPaired: connectionStatus.isPaired,
    isReachable: connectionStatus.isReachable,
    isWatchAppInstalled: connectionStatus.isWatchAppInstalled,
    activationState: connectionStatus.activationState,
    connectionStatus,
    lastWorkoutFromWatch,
    lastSetFromWatch,
    sendWorkout,
    sendUserData,
    syncRestTimer,
    requestWorkoutState: watchConnectivity.requestWorkoutState.bind(watchConnectivity),
  };
}
