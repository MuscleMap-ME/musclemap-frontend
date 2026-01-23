/**
 * Offline Store (Zustand)
 *
 * Manages offline state and synchronization for MuscleMap.
 * Tracks pending operations, sync status, and conflict resolution.
 *
 * Features:
 * - Real-time online/offline status tracking
 * - Pending operations queue management
 * - Sync progress and status tracking
 * - Conflict resolution state management
 * - Integration with Service Worker
 *
 * @example
 * // Get current online status
 * const isOnline = useOfflineStore((s) => s.isOnline);
 *
 * // Get pending sync count
 * const { pendingCount } = useSyncStatus();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { resilientStorage } from '../lib/zustand-storage';

// ============================================
// SYNC STATUS TYPES
// ============================================

/**
 * Sync status values
 */
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  CONFLICT: 'conflict',
};

/**
 * Conflict resolution strategies
 */
export const CONFLICT_RESOLUTION = {
  CLIENT_WINS: 'client_wins',
  SERVER_WINS: 'server_wins',
  MERGE: 'merge',
  MANUAL: 'manual',
};

/**
 * Operation types for sync queue
 */
export const OPERATION_TYPES = {
  WORKOUT: 'workout',
  SET: 'set',
  PROFILE: 'profile',
  SETTINGS: 'settings',
  GRAPHQL: 'graphql',
  UNKNOWN: 'unknown',
};

// ============================================
// SERVICE WORKER COMMUNICATION
// ============================================

/**
 * Send message to service worker
 */
function postToServiceWorker(type, payload = {}) {
  if (!navigator.serviceWorker?.controller) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(
      { type, payload },
      [messageChannel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Request sync status from service worker
 */
async function getSyncStatusFromSW() {
  return postToServiceWorker('GET_SYNC_STATUS');
}

/**
 * Request queue status from service worker
 */
async function getQueueStatusFromSW() {
  return postToServiceWorker('GET_QUEUE_STATUS');
}

/**
 * Force sync with service worker
 */
async function forceSyncWithSW() {
  return postToServiceWorker('FORCE_SYNC');
}

/**
 * Resolve conflict via service worker
 */
async function resolveConflictViaSW(id, resolution) {
  return postToServiceWorker('RESOLVE_CONFLICT', { id, resolution });
}

/**
 * Cache exercises via service worker
 */
async function cacheExercisesViaSW(exercises) {
  return postToServiceWorker('CACHE_EXERCISES', { exercises });
}

/**
 * Get cached exercises from service worker
 */
async function getCachedExercisesFromSW() {
  return postToServiceWorker('GET_CACHED_EXERCISES');
}

// ============================================
// OFFLINE STORE
// ============================================

export const useOfflineStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ============================================
        // ONLINE/OFFLINE STATE
        // ============================================
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastOnlineAt: null,
        lastOfflineAt: null,
        offlineDuration: 0,

        // ============================================
        // SYNC STATUS
        // ============================================
        syncStatus: SYNC_STATUS.IDLE,
        lastSyncAttempt: null,
        lastSuccessfulSync: null,
        syncError: null,
        syncProgress: 0,

        // ============================================
        // PENDING OPERATIONS
        // ============================================
        pendingCount: 0,
        pendingWorkouts: 0,
        pendingSets: 0,
        pendingOther: 0,
        failedCount: 0,

        // ============================================
        // CONFLICTS
        // ============================================
        conflictCount: 0,
        conflicts: [],
        defaultResolutionStrategy: CONFLICT_RESOLUTION.SERVER_WINS,

        // ============================================
        // EXERCISE CACHE
        // ============================================
        exerciseCacheCount: 0,
        lastExerciseCacheUpdate: null,
        exerciseCacheExpiry: 30 * 24 * 60 * 60 * 1000, // 30 days

        // ============================================
        // QUEUE DETAILS
        // ============================================
        queueDetails: [],

        // ============================================
        // ACTIONS - ONLINE/OFFLINE
        // ============================================
        setOnline: () => {
          const now = Date.now();
          const lastOfflineAt = get().lastOfflineAt;
          const offlineDuration = lastOfflineAt ? now - lastOfflineAt : 0;

          set({
            isOnline: true,
            lastOnlineAt: now,
            offlineDuration,
          });

          // Trigger sync when coming online
          get().refreshSyncStatus();
          get().triggerSync();
        },

        setOffline: () => {
          set({
            isOnline: false,
            lastOfflineAt: Date.now(),
          });
        },

        // ============================================
        // ACTIONS - SYNC STATUS
        // ============================================
        setSyncStatus: (status) => set({ syncStatus: status }),

        setSyncProgress: (progress) => set({ syncProgress: progress }),

        setSyncError: (error) => set({
          syncStatus: SYNC_STATUS.ERROR,
          syncError: error,
        }),

        clearSyncError: () => set({
          syncError: null,
          syncStatus: SYNC_STATUS.IDLE,
        }),

        /**
         * Refresh sync status from service worker
         */
        refreshSyncStatus: async () => {
          try {
            const status = await getSyncStatusFromSW();
            if (status) {
              set({
                pendingCount: status.pending || 0,
                failedCount: status.failed || 0,
                conflictCount: status.conflicts || 0,
                lastSyncAttempt: status.lastAttempt,
                lastSuccessfulSync: status.lastSuccess,
              });
            }

            const queueStatus = await getQueueStatusFromSW();
            if (queueStatus) {
              set({
                pendingCount: queueStatus.count || 0,
                conflictCount: queueStatus.conflictCount || 0,
                queueDetails: queueStatus.syncQueue || [],
                conflicts: queueStatus.conflicts || [],
              });
            }
          } catch {
            // Failed to refresh sync status
          }
        },

        /**
         * Trigger manual sync
         */
        triggerSync: async () => {
          if (!get().isOnline) {
            return false;
          }

          set({
            syncStatus: SYNC_STATUS.SYNCING,
            syncProgress: 0,
          });

          try {
            await forceSyncWithSW();

            set({
              syncStatus: SYNC_STATUS.SUCCESS,
              lastSuccessfulSync: Date.now(),
              syncProgress: 100,
            });

            // Refresh status after sync
            await get().refreshSyncStatus();

            return true;
          } catch (error) {
            set({
              syncStatus: SYNC_STATUS.ERROR,
              syncError: error.message || 'Sync failed',
            });
            return false;
          }
        },

        // ============================================
        // ACTIONS - PENDING OPERATIONS
        // ============================================
        incrementPending: (type = OPERATION_TYPES.UNKNOWN) => {
          const updates = { pendingCount: get().pendingCount + 1 };

          if (type === OPERATION_TYPES.WORKOUT) {
            updates.pendingWorkouts = get().pendingWorkouts + 1;
          } else if (type === OPERATION_TYPES.SET) {
            updates.pendingSets = get().pendingSets + 1;
          } else {
            updates.pendingOther = get().pendingOther + 1;
          }

          set(updates);
        },

        decrementPending: (type = OPERATION_TYPES.UNKNOWN) => {
          const updates = { pendingCount: Math.max(0, get().pendingCount - 1) };

          if (type === OPERATION_TYPES.WORKOUT) {
            updates.pendingWorkouts = Math.max(0, get().pendingWorkouts - 1);
          } else if (type === OPERATION_TYPES.SET) {
            updates.pendingSets = Math.max(0, get().pendingSets - 1);
          } else {
            updates.pendingOther = Math.max(0, get().pendingOther - 1);
          }

          set(updates);
        },

        clearPending: () => set({
          pendingCount: 0,
          pendingWorkouts: 0,
          pendingSets: 0,
          pendingOther: 0,
          failedCount: 0,
          queueDetails: [],
        }),

        // ============================================
        // ACTIONS - CONFLICTS
        // ============================================
        setConflicts: (conflicts) => set({
          conflicts,
          conflictCount: conflicts.length,
        }),

        addConflict: (conflict) => {
          const conflicts = [...get().conflicts, conflict];
          set({
            conflicts,
            conflictCount: conflicts.length,
            syncStatus: SYNC_STATUS.CONFLICT,
          });
        },

        /**
         * Resolve a conflict
         */
        resolveConflict: async (conflictId, resolution) => {
          try {
            await resolveConflictViaSW(conflictId, resolution);

            const conflicts = get().conflicts.filter((c) => c.id !== conflictId);
            set({
              conflicts,
              conflictCount: conflicts.length,
              syncStatus: conflicts.length === 0 ? SYNC_STATUS.IDLE : SYNC_STATUS.CONFLICT,
            });

            // Trigger sync after resolving conflict
            if (resolution !== CONFLICT_RESOLUTION.MANUAL) {
              await get().triggerSync();
            }

            return true;
          } catch {
            return false;
          }
        },

        /**
         * Resolve all conflicts with default strategy
         */
        resolveAllConflicts: async () => {
          const { conflicts, defaultResolutionStrategy } = get();

          for (const conflict of conflicts) {
            await get().resolveConflict(conflict.id, defaultResolutionStrategy);
          }
        },

        setDefaultResolutionStrategy: (strategy) => set({
          defaultResolutionStrategy: strategy,
        }),

        // ============================================
        // ACTIONS - EXERCISE CACHE
        // ============================================
        /**
         * Cache exercises for offline use
         */
        cacheExercises: async (exercises) => {
          try {
            const result = await cacheExercisesViaSW(exercises);

            if (result?.count) {
              set({
                exerciseCacheCount: result.count,
                lastExerciseCacheUpdate: Date.now(),
              });
            }

            return result?.count || 0;
          } catch {
            return 0;
          }
        },

        /**
         * Get cached exercise count
         */
        refreshExerciseCacheStatus: async () => {
          try {
            const result = await getCachedExercisesFromSW();

            if (result?.count !== undefined) {
              set({
                exerciseCacheCount: result.count,
              });
            }
          } catch {
            // Failed to get exercise cache status
          }
        },

        /**
         * Check if exercise cache is stale
         */
        isExerciseCacheStale: () => {
          const { lastExerciseCacheUpdate, exerciseCacheExpiry } = get();
          if (!lastExerciseCacheUpdate) return true;
          return Date.now() - lastExerciseCacheUpdate > exerciseCacheExpiry;
        },

        // ============================================
        // ACTIONS - INITIALIZATION
        // ============================================
        /**
         * Initialize offline store
         * Should be called once when app starts
         */
        initialize: () => {
          // Set initial online state
          set({ isOnline: navigator.onLine });

          // Listen for online/offline events
          window.addEventListener('online', () => get().setOnline());
          window.addEventListener('offline', () => get().setOffline());

          // Listen for service worker messages
          if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('message', (event) => {
              const { type, ...data } = event.data || {};

              switch (type) {
                case 'SYNC_SUCCESS':
                  get().decrementPending(data.operation);
                  break;

                case 'SYNC_FAILED':
                  set({ failedCount: get().failedCount + 1 });
                  break;

                case 'SYNC_CONFLICT':
                  get().addConflict({
                    id: Date.now(),
                    operation: data.operation,
                    resourceId: data.resourceId,
                    createdAt: Date.now(),
                  });
                  break;

                case 'QUEUE_STATUS':
                  set({
                    pendingCount: data.count || 0,
                    conflictCount: data.conflictCount || 0,
                    queueDetails: data.syncQueue || [],
                    conflicts: data.conflicts || [],
                  });
                  break;

                case 'SYNC_STATUS':
                  set({
                    pendingCount: data.pending || 0,
                    failedCount: data.failed || 0,
                    conflictCount: data.conflicts || 0,
                    lastSyncAttempt: data.lastAttempt,
                    lastSuccessfulSync: data.lastSuccess,
                  });
                  break;

                case 'EXERCISES_CACHED':
                  set({
                    exerciseCacheCount: data.count || 0,
                    lastExerciseCacheUpdate: Date.now(),
                  });
                  break;
              }
            });
          }

          // Initial status refresh
          get().refreshSyncStatus();
          get().refreshExerciseCacheStatus();
        },
      }),
      {
        name: 'musclemap-offline',
        storage: createJSONStorage(() => resilientStorage),
        partialize: (state) => ({
          // Only persist preferences, not runtime state
          defaultResolutionStrategy: state.defaultResolutionStrategy,
          exerciseCacheExpiry: state.exerciseCacheExpiry,
        }),
      }
    )
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for online/offline status
 */
export const useOnlineStatus = () => {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const lastOnlineAt = useOfflineStore((s) => s.lastOnlineAt);
  const lastOfflineAt = useOfflineStore((s) => s.lastOfflineAt);
  const offlineDuration = useOfflineStore((s) => s.offlineDuration);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnlineAt,
    lastOfflineAt,
    offlineDuration,
    offlineSince: isOnline ? null : lastOfflineAt,
  };
};

/**
 * Hook for sync status and operations
 */
export const useSyncStatus = () => {
  const syncStatus = useOfflineStore((s) => s.syncStatus);
  const syncProgress = useOfflineStore((s) => s.syncProgress);
  const lastSyncAttempt = useOfflineStore((s) => s.lastSyncAttempt);
  const lastSuccessfulSync = useOfflineStore((s) => s.lastSuccessfulSync);
  const syncError = useOfflineStore((s) => s.syncError);
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const failedCount = useOfflineStore((s) => s.failedCount);
  const triggerSync = useOfflineStore((s) => s.triggerSync);
  const clearSyncError = useOfflineStore((s) => s.clearSyncError);

  return {
    status: syncStatus,
    progress: syncProgress,
    lastAttempt: lastSyncAttempt,
    lastSuccess: lastSuccessfulSync,
    error: syncError,
    pendingCount,
    failedCount,
    isSyncing: syncStatus === SYNC_STATUS.SYNCING,
    hasError: syncStatus === SYNC_STATUS.ERROR,
    hasPending: pendingCount > 0,
    triggerSync,
    clearError: clearSyncError,
  };
};

/**
 * Hook for pending operations
 */
export const usePendingOperations = () => {
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const pendingWorkouts = useOfflineStore((s) => s.pendingWorkouts);
  const pendingSets = useOfflineStore((s) => s.pendingSets);
  const pendingOther = useOfflineStore((s) => s.pendingOther);
  const queueDetails = useOfflineStore((s) => s.queueDetails);

  return {
    total: pendingCount,
    workouts: pendingWorkouts,
    sets: pendingSets,
    other: pendingOther,
    details: queueDetails,
    hasPending: pendingCount > 0,
  };
};

/**
 * Hook for conflict management
 */
export const useConflicts = () => {
  const conflicts = useOfflineStore((s) => s.conflicts);
  const conflictCount = useOfflineStore((s) => s.conflictCount);
  const defaultResolutionStrategy = useOfflineStore((s) => s.defaultResolutionStrategy);
  const resolveConflict = useOfflineStore((s) => s.resolveConflict);
  const resolveAllConflicts = useOfflineStore((s) => s.resolveAllConflicts);
  const setDefaultResolutionStrategy = useOfflineStore((s) => s.setDefaultResolutionStrategy);

  return {
    conflicts,
    count: conflictCount,
    hasConflicts: conflictCount > 0,
    defaultStrategy: defaultResolutionStrategy,
    resolve: resolveConflict,
    resolveAll: resolveAllConflicts,
    setDefaultStrategy: setDefaultResolutionStrategy,
    strategies: CONFLICT_RESOLUTION,
  };
};

/**
 * Hook for exercise cache status
 */
export const useExerciseCache = () => {
  const exerciseCacheCount = useOfflineStore((s) => s.exerciseCacheCount);
  const lastExerciseCacheUpdate = useOfflineStore((s) => s.lastExerciseCacheUpdate);
  const cacheExercises = useOfflineStore((s) => s.cacheExercises);
  const isStale = useOfflineStore((s) => s.isExerciseCacheStale);
  const refreshExerciseCacheStatus = useOfflineStore((s) => s.refreshExerciseCacheStatus);

  return {
    count: exerciseCacheCount,
    lastUpdate: lastExerciseCacheUpdate,
    isStale: isStale(),
    isCached: exerciseCacheCount > 0,
    cache: cacheExercises,
    refresh: refreshExerciseCacheStatus,
  };
};

/**
 * Combined offline state hook
 */
export const useOffline = () => {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const syncStatus = useOfflineStore((s) => s.syncStatus);
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const conflictCount = useOfflineStore((s) => s.conflictCount);
  const triggerSync = useOfflineStore((s) => s.triggerSync);
  const initialize = useOfflineStore((s) => s.initialize);

  return {
    isOnline,
    isOffline: !isOnline,
    isSyncing: syncStatus === SYNC_STATUS.SYNCING,
    pendingCount,
    conflictCount,
    hasIssues: pendingCount > 0 || conflictCount > 0,
    triggerSync,
    initialize,
  };
};

export default useOfflineStore;
