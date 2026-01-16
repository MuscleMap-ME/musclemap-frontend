/**
 * Offline-Aware API Client
 *
 * Wraps API calls with offline detection, request queuing, and automatic sync.
 * Uses the service worker for actual offline storage but provides a clean
 * JavaScript API for use in React components.
 *
 * Features:
 * - Automatic offline detection
 * - Request queuing when offline
 * - Optimistic updates for mutations
 * - Cache integration for reads
 * - Sync status tracking via offlineStore
 */

import { cache } from './cache';
import {
  savePendingWorkout,
  savePendingSet,
  getCachedExercises,
  searchExercises as searchExercisesDB,
  addToSyncQueue,
} from './offlineDB';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api';

const CACHE_KEYS = {
  EXERCISES: 'ref:exercises',
  MUSCLES: 'ref:muscles',
  EQUIPMENT: 'ref:equipment',
  PROFILE: 'user:profile',
  STATS: 'user:stats',
};

// Operations that can be queued offline (used for validation)
const _QUEUEABLE_OPERATIONS = [
  'workout',
  'set',
  'profile',
  'settings',
];

// ============================================
// OFFLINE STATE
// ============================================

let offlineStore = null;

/**
 * Initialize offline API with store reference
 * Call this from your app initialization
 */
export function initOfflineApi(store) {
  offlineStore = store;
}

/**
 * Check if we're currently online
 */
function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Notify the offline store of a pending operation
 */
function notifyPending(operationType) {
  if (offlineStore) {
    offlineStore.getState().incrementPending(operationType);
  }
}

/**
 * Notify the offline store of a completed operation
 * Called by service worker via message handler
 */
function _notifyCompleted(operationType) {
  if (offlineStore) {
    offlineStore.getState().decrementPending(operationType);
  }
}

// ============================================
// REQUEST HELPERS
// ============================================

/**
 * Get auth token from localStorage
 */
function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || null;
  } catch {
    return null;
  }
}

/**
 * Build request headers
 */
function buildHeaders(includeAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Send message to service worker
 */
async function sendToServiceWorker(type, payload = {}) {
  if (!navigator.serviceWorker?.controller) {
    return null;
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

    setTimeout(() => resolve(null), 5000);
  });
}

// ============================================
// OFFLINE-AWARE FETCH
// ============================================

/**
 * Make an offline-aware API request
 *
 * @param {string} path - API path
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {Object} options.body - Request body
 * @param {boolean} options.auth - Include auth token
 * @param {string} options.operationType - Type for queue prioritization
 * @param {boolean} options.queueIfOffline - Queue mutations when offline
 * @param {string} options.cacheKey - Cache key for GET requests
 * @param {number} options.cacheTtl - Cache TTL in ms
 * @param {Function} options.optimisticUpdate - Function to update local state optimistically
 * @param {Function} options.onQueuedOffline - Callback when request is queued
 */
export async function offlineRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = true,
    operationType = 'unknown',
    queueIfOffline = true,
    cacheKey,
    cacheTtl,
    optimisticUpdate,
    onQueuedOffline,
  } = options;

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

  // For GET requests, try cache first if offline
  if (!isMutation && !isOnline()) {
    if (cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true, offline: true };
      }
    }
    throw new Error('Offline and no cached data available');
  }

  // For mutations when offline, queue the request
  if (isMutation && !isOnline() && queueIfOffline) {
    // Apply optimistic update if provided
    if (optimisticUpdate) {
      optimisticUpdate(body);
    }

    // Queue the request
    await addToSyncQueue({
      url,
      method,
      headers: buildHeaders(auth),
      body: JSON.stringify(body),
      operation: operationType,
      priority: operationType === 'workout' ? 'high' : 'normal',
    });

    // Notify store
    notifyPending(operationType);

    // Notify callback
    if (onQueuedOffline) {
      onQueuedOffline({ url, method, body });
    }

    // Return queued response
    return {
      queued: true,
      offline: true,
      message: 'Request queued for sync when online',
      localData: body,
    };
  }

  // Make the actual request
  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(auth),
      body: body ? JSON.stringify(body) : undefined,
    });

    // Check for queued response from service worker
    if (response.status === 202) {
      const data = await response.json();
      if (data.queued) {
        notifyPending(operationType);
        if (onQueuedOffline) {
          onQueuedOffline({ url, method, body });
        }
        return { ...data, offline: true };
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache successful GET responses
    if (!isMutation && cacheKey) {
      await cache.set(cacheKey, data, { ttl: cacheTtl });
    }

    return { data, fromCache: false, offline: false };
  } catch (error) {
    // If we went offline during the request, queue it
    if (isMutation && !isOnline() && queueIfOffline) {
      await addToSyncQueue({
        url,
        method,
        headers: buildHeaders(auth),
        body: JSON.stringify(body),
        operation: operationType,
        priority: operationType === 'workout' ? 'high' : 'normal',
      });

      notifyPending(operationType);

      return {
        queued: true,
        offline: true,
        message: 'Request queued for sync when online',
        localData: body,
      };
    }

    throw error;
  }
}

// ============================================
// EXERCISE API (with offline support)
// ============================================

/**
 * Get all exercises (with IndexedDB fallback)
 */
export async function getExercises(options = {}) {
  const { forceRefresh = false } = options;

  // Try cache first
  if (!forceRefresh) {
    const cached = await cache.get(CACHE_KEYS.EXERCISES);
    if (cached) {
      return { exercises: cached, fromCache: true };
    }
  }

  // If offline, try IndexedDB
  if (!isOnline()) {
    const exercises = await getCachedExercises();
    if (exercises.length > 0) {
      return { exercises, fromCache: true, offline: true };
    }
    throw new Error('Offline and no cached exercises available');
  }

  // Fetch from server
  const result = await offlineRequest('/exercises', {
    cacheKey: CACHE_KEYS.EXERCISES,
    cacheTtl: 3600000, // 1 hour
  });

  // Also cache in IndexedDB via service worker
  if (result.data?.exercises) {
    await sendToServiceWorker('CACHE_EXERCISES', { exercises: result.data.exercises });
  }

  return { exercises: result.data?.exercises || result.data, fromCache: false };
}

/**
 * Search exercises (works offline via IndexedDB)
 */
export async function searchExercises(query) {
  if (!query || query.length < 2) {
    return [];
  }

  // If offline, search IndexedDB
  if (!isOnline()) {
    return searchExercisesDB(query);
  }

  // Online: search via API
  try {
    const result = await offlineRequest(`/exercises/search?q=${encodeURIComponent(query)}`);
    return result.data?.exercises || result.data || [];
  } catch {
    // Fallback to local search
    return searchExercisesDB(query);
  }
}

// ============================================
// WORKOUT API (with offline support)
// ============================================

/**
 * Save a workout (queues when offline)
 */
export async function saveWorkout(workoutData) {
  const result = await offlineRequest('/workouts', {
    method: 'POST',
    body: workoutData,
    operationType: 'workout',
    queueIfOffline: true,
    optimisticUpdate: async (data) => {
      // Save to local IndexedDB for offline access
      await savePendingWorkout(data);
    },
    onQueuedOffline: (info) => {
      console.log('[OfflineAPI] Workout queued for sync:', info);
    },
  });

  return result;
}

/**
 * Log a set (queues when offline)
 */
export async function logSet(setData) {
  const result = await offlineRequest('/sets', {
    method: 'POST',
    body: setData,
    operationType: 'set',
    queueIfOffline: true,
    optimisticUpdate: async (data) => {
      await savePendingSet(data);
    },
  });

  return result;
}

/**
 * Complete a workout (high priority queue when offline)
 */
export async function completeWorkout(workoutId, completionData) {
  const result = await offlineRequest(`/workouts/${workoutId}/complete`, {
    method: 'POST',
    body: completionData,
    operationType: 'workout',
    queueIfOffline: true,
  });

  return result;
}

// ============================================
// USER DATA API (with offline support)
// ============================================

/**
 * Get user profile (with cache fallback)
 */
export async function getUserProfile() {
  return offlineRequest('/profile', {
    cacheKey: CACHE_KEYS.PROFILE,
    cacheTtl: 300000, // 5 minutes
  });
}

/**
 * Update user profile (queues when offline)
 */
export async function updateUserProfile(profileData) {
  return offlineRequest('/profile', {
    method: 'PATCH',
    body: profileData,
    operationType: 'profile',
    queueIfOffline: true,
  });
}

/**
 * Get user stats (with cache fallback)
 */
export async function getUserStats() {
  return offlineRequest('/stats', {
    cacheKey: CACHE_KEYS.STATS,
    cacheTtl: 300000, // 5 minutes
  });
}

// ============================================
// SYNC HELPERS
// ============================================

/**
 * Trigger manual sync
 */
export async function triggerSync() {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  await sendToServiceWorker('FORCE_SYNC');

  if (offlineStore) {
    await offlineStore.getState().refreshSyncStatus();
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus() {
  return sendToServiceWorker('GET_SYNC_STATUS');
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  return sendToServiceWorker('GET_QUEUE_STATUS');
}

/**
 * Pre-cache exercises for offline use
 */
export async function precacheExercises() {
  try {
    const { exercises } = await getExercises({ forceRefresh: true });
    if (exercises) {
      await sendToServiceWorker('CACHE_EXERCISES', { exercises });
      console.log(`[OfflineAPI] Precached ${exercises.length} exercises`);
      return exercises.length;
    }
    return 0;
  } catch (error) {
    console.error('[OfflineAPI] Failed to precache exercises:', error);
    return 0;
  }
}

// ============================================
// HOOKS FOR REACT
// ============================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for offline-aware data fetching
 */
export function useOfflineQuery(fetcher, cacheKey, options = {}) {
  const { enabled = true, refetchOnOnline = true } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isOffline, setIsOffline] = useState(!isOnline());

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result.data || result);
      setIsFromCache(result.fromCache || false);
      setIsOffline(result.offline || false);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetcher, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (!refetchOnOnline) return;

    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData, refetchOnOnline]);

  return {
    data,
    loading,
    error,
    isFromCache,
    isOffline,
    refetch: fetchData,
  };
}

/**
 * Hook for offline-aware mutations
 */
export function useOfflineMutation(mutationFn, options = {}) {
  const { onSuccess, onError, onQueued } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQueued, setIsQueued] = useState(false);

  const mutate = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    setIsQueued(false);

    try {
      const result = await mutationFn(data);

      if (result.queued) {
        setIsQueued(true);
        if (onQueued) {
          onQueued(result);
        }
      } else if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, onSuccess, onError, onQueued]);

  return {
    mutate,
    loading,
    error,
    isQueued,
  };
}

export default {
  initOfflineApi,
  offlineRequest,
  getExercises,
  searchExercises,
  saveWorkout,
  logSet,
  completeWorkout,
  getUserProfile,
  updateUserProfile,
  getUserStats,
  triggerSync,
  getSyncStatus,
  getQueueStatus,
  precacheExercises,
  useOfflineQuery,
  useOfflineMutation,
};
