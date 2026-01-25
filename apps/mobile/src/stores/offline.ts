/**
 * Offline Store
 *
 * Manages offline-first functionality:
 * - Queue mutations when offline
 * - Sync when back online
 * - Track pending actions
 * - Handle conflicts
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Types
// ============================================================================

export type OfflineActionType =
  | 'LOG_SET'
  | 'COMPLETE_WORKOUT'
  | 'EARN_CREDITS'
  | 'UPDATE_PROFILE'
  | 'SEND_HIGH_FIVE'
  | 'JOIN_CREW'
  | 'LEAVE_CREW';

export interface OfflineAction<T = unknown> {
  id: string;
  type: OfflineActionType;
  payload: T;
  createdAt: string; // ISO string for serialization
  retryCount: number;
  lastError?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncResult {
  success: boolean;
  actionId: string;
  error?: string;
}

// Payload types for type safety
export interface LogSetPayload {
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
}

export interface CompleteWorkoutPayload {
  workoutId: string;
  duration: number;
  completedSets: Array<{
    exerciseId: string;
    setNumber: number;
    weight: number;
    reps: number;
  }>;
}

export interface EarnCreditsPayload {
  amount: number;
  reason: string;
  sourceType: 'workout' | 'achievement' | 'pr' | 'daily' | 'leaderboard';
  sourceId?: string;
}

// ============================================================================
// Store
// ============================================================================

interface OfflineState {
  // Connection state
  isOnline: boolean;
  lastOnlineAt: string | null;

  // Queue state
  pendingActions: OfflineAction[];
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  syncErrors: string[];

  // Actions - Connection
  setOnline: (online: boolean) => void;
  checkConnection: () => Promise<boolean>;

  // Actions - Queue
  queueAction: <T>(type: OfflineActionType, payload: T) => string;
  removeAction: (id: string) => void;
  clearQueue: () => void;
  retryAction: (id: string) => void;

  // Actions - Sync
  processQueue: () => Promise<SyncResult[]>;
  syncAction: (action: OfflineAction) => Promise<SyncResult>;

  // Computed
  hasPendingActions: () => boolean;
  getPendingCount: () => number;
}

let actionIdCounter = 0;
const generateActionId = () => `offline-${Date.now()}-${++actionIdCounter}`;

const MAX_RETRY_COUNT = 3;

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      // ======================================================================
      // Initial State
      // ======================================================================
      isOnline: true,
      lastOnlineAt: null,

      pendingActions: [],
      syncStatus: 'idle',
      lastSyncAt: null,
      syncErrors: [],

      // ======================================================================
      // Connection Management
      // ======================================================================
      setOnline: (online) => {
        const wasOffline = !get().isOnline;

        set({
          isOnline: online,
          lastOnlineAt: online ? new Date().toISOString() : get().lastOnlineAt,
        });

        // Auto-sync when coming back online
        if (online && wasOffline && get().hasPendingActions()) {
          get().processQueue();
        }
      },

      checkConnection: async () => {
        try {
          const state = await NetInfo.fetch();
          const online = state.isConnected ?? false;
          get().setOnline(online);
          return online;
        } catch {
          return get().isOnline;
        }
      },

      // ======================================================================
      // Queue Management
      // ======================================================================
      queueAction: (type, payload) => {
        const id = generateActionId();

        const action: OfflineAction = {
          id,
          type,
          payload,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        };

        set((state) => ({
          pendingActions: [...state.pendingActions, action],
        }));

        // Try to sync immediately if online
        if (get().isOnline) {
          get().processQueue();
        }

        return id;
      },

      removeAction: (id) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.id !== id),
        }));
      },

      clearQueue: () => {
        set({ pendingActions: [], syncErrors: [] });
      },

      retryAction: (id) => {
        set((state) => ({
          pendingActions: state.pendingActions.map((a) =>
            a.id === id ? { ...a, retryCount: 0, lastError: undefined } : a,
          ),
        }));

        if (get().isOnline) {
          get().processQueue();
        }
      },

      // ======================================================================
      // Sync Logic
      // ======================================================================
      processQueue: async () => {
        const { pendingActions, isOnline, syncStatus } = get();

        // Skip if already syncing, offline, or no actions
        if (syncStatus === 'syncing' || !isOnline || pendingActions.length === 0) {
          return [];
        }

        set({ syncStatus: 'syncing', syncErrors: [] });

        const results: SyncResult[] = [];
        const errors: string[] = [];
        const completedIds: string[] = [];

        // Process actions sequentially (order matters for some operations)
        for (const action of pendingActions) {
          // Skip if max retries exceeded
          if (action.retryCount >= MAX_RETRY_COUNT) {
            errors.push(`Action ${action.id} exceeded max retries`);
            continue;
          }

          const result = await get().syncAction(action);
          results.push(result);

          if (result.success) {
            completedIds.push(action.id);
          } else {
            errors.push(result.error ?? `Failed to sync action ${action.id}`);

            // Increment retry count
            set((state) => ({
              pendingActions: state.pendingActions.map((a) =>
                a.id === action.id
                  ? { ...a, retryCount: a.retryCount + 1, lastError: result.error }
                  : a,
              ),
            }));
          }
        }

        // Remove completed actions
        set((state) => ({
          pendingActions: state.pendingActions.filter(
            (a) => !completedIds.includes(a.id),
          ),
          syncStatus: errors.length > 0 ? 'error' : 'idle',
          syncErrors: errors,
          lastSyncAt: new Date().toISOString(),
        }));

        // Haptic feedback
        if (completedIds.length > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        return results;
      },

      syncAction: async (action) => {
        try {
          // TODO: Implement actual GraphQL mutations based on action type
          // This is a placeholder that simulates the sync operation

          switch (action.type) {
            case 'LOG_SET': {
              // await apolloClient.mutate({
              //   mutation: LOG_SET_MUTATION,
              //   variables: action.payload,
              // });
              break;
            }
            case 'COMPLETE_WORKOUT': {
              // await apolloClient.mutate({
              //   mutation: COMPLETE_WORKOUT_MUTATION,
              //   variables: action.payload,
              // });
              break;
            }
            case 'EARN_CREDITS': {
              // await apolloClient.mutate({
              //   mutation: EARN_CREDITS_MUTATION,
              //   variables: action.payload,
              // });
              break;
            }
            default:
              throw new Error(`Unknown action type: ${action.type}`);
          }

          return { success: true, actionId: action.id };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, actionId: action.id, error: message };
        }
      },

      // ======================================================================
      // Computed
      // ======================================================================
      hasPendingActions: () => get().pendingActions.length > 0,
      getPendingCount: () => get().pendingActions.length,
    }),
    {
      name: 'musclemap-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist the queue and last sync time
        pendingActions: state.pendingActions,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for offline status
 */
export function useOfflineStatus() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const syncStatus = useOfflineStore((s) => s.syncStatus);
  const pendingCount = useOfflineStore((s) => s.getPendingCount());
  const lastSyncAt = useOfflineStore((s) => s.lastSyncAt);
  const checkConnection = useOfflineStore((s) => s.checkConnection);

  return {
    isOnline,
    isOffline: !isOnline,
    isSyncing: syncStatus === 'syncing',
    hasError: syncStatus === 'error',
    pendingCount,
    lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : null,
    checkConnection,
  };
}

/**
 * Hook for queueing offline actions
 */
export function useOfflineQueue() {
  const queueAction = useOfflineStore((s) => s.queueAction);
  const isOnline = useOfflineStore((s) => s.isOnline);

  return {
    isOnline,
    queueSet: (payload: LogSetPayload) => queueAction('LOG_SET', payload),
    queueWorkoutComplete: (payload: CompleteWorkoutPayload) =>
      queueAction('COMPLETE_WORKOUT', payload),
    queueCredits: (payload: EarnCreditsPayload) => queueAction('EARN_CREDITS', payload),
  };
}

// ============================================================================
// Network Listener Setup
// ============================================================================

/**
 * Initialize network state listener
 * Call this in app root layout
 */
export function initializeNetworkListener() {
  const unsubscribe = NetInfo.addEventListener((state) => {
    useOfflineStore.getState().setOnline(state.isConnected ?? false);
  });

  // Initial check
  useOfflineStore.getState().checkConnection();

  return unsubscribe;
}
