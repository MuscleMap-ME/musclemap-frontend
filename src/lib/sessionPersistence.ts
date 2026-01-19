/**
 * Workout Session Persistence Layer
 *
 * Provides multi-layer persistence for workout sessions:
 * 1. IndexedDB (primary) - Instant recovery on refresh/crash
 * 2. Server sync - Cross-device recovery and backup
 *
 * Auto-saves session state on every change with debouncing.
 * Recovers session automatically on app startup.
 */

import { apiClient } from '../utils/apiClient';

// ============================================
// INDEXEDDB STORAGE
// ============================================

const DB_NAME = 'musclemap-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'active_session';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open session database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for active session
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

/**
 * Save session to IndexedDB
 */
export async function saveSessionToIndexedDB(session: WorkoutSession): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Always use 'current' as key for single active session
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ ...session, id: 'current', savedAt: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save session to IndexedDB:', error);
  }
}

/**
 * Load session from IndexedDB
 */
export async function loadSessionFromIndexedDB(): Promise<WorkoutSession | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get('current');
      request.onsuccess = () => {
        const session = request.result;
        if (session) {
          // Remove the synthetic 'id' key we added
          delete session.id;
          delete session.savedAt;
          resolve(session as WorkoutSession);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load session from IndexedDB:', error);
    return null;
  }
}

/**
 * Clear session from IndexedDB
 */
export async function clearSessionFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete('current');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear session from IndexedDB:', error);
  }
}

// ============================================
// SERVER SYNC
// ============================================

let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 5000; // Sync to server every 5 seconds (debounced)
const SYNC_FORCE_INTERVAL_MS = 30000; // Force sync every 30 seconds
let lastSyncTime = 0;

/**
 * Sync session to server (debounced)
 */
export async function syncSessionToServer(session: WorkoutSession, force = false): Promise<void> {
  // Don't sync if not authenticated
  const token = localStorage.getItem('token');
  if (!token) return;

  const now = Date.now();

  // If force sync or it's been too long since last sync
  if (force || now - lastSyncTime > SYNC_FORCE_INTERVAL_MS) {
    // Clear pending debounced sync
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }

    try {
      await apiClient.post('/sessions', sessionToServerFormat(session));
      lastSyncTime = now;
    } catch (error) {
      console.error('Failed to sync session to server:', error);
    }
    return;
  }

  // Debounced sync
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      await apiClient.post('/sessions', sessionToServerFormat(session));
      lastSyncTime = Date.now();
    } catch (error) {
      console.error('Failed to sync session to server:', error);
    }
    syncTimeout = null;
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Load session from server
 */
export async function loadSessionFromServer(): Promise<WorkoutSession | null> {
  // Don't load if not authenticated
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const response = await apiClient.get('/sessions/active');
    if (response.data?.data) {
      return serverFormatToSession(response.data.data);
    }
    return null;
  } catch (error: unknown) {
    // 404 means no active session - that's fine
    if ((error as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    console.error('Failed to load session from server:', error);
    return null;
  }
}

/**
 * Archive session on server (when completing or abandoning)
 */
export async function archiveSessionOnServer(
  reason: 'completed' | 'abandoned' | 'replaced',
  workoutId?: string
): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    await apiClient.delete('/sessions/active', {
      data: { reason, workoutId },
    });
  } catch (error) {
    console.error('Failed to archive session on server:', error);
  }
}

/**
 * Check if user has active session on server
 */
export async function checkServerSessionStatus(): Promise<{
  hasActiveSession: boolean;
  sessionId?: string;
  startedAt?: number;
  setsCount?: number;
} | null> {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const response = await apiClient.get('/sessions/status');
    return response.data?.data || null;
  } catch (error) {
    console.error('Failed to check session status:', error);
    return null;
  }
}

// ============================================
// SESSION RECOVERY
// ============================================

export interface WorkoutSession {
  sessionId: string;
  isActive: boolean;
  startTime: number;
  pausedAt: number | null;
  totalPausedTime: number;

  // Workout plan
  workoutPlan?: {
    exercises?: Array<{
      id: string;
      name: string;
      primaryMuscles?: string[];
      secondaryMuscles?: string[];
    }>;
  };

  // Current position
  currentExercise?: {
    id: string;
    name: string;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
  } | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: Array<{
    id: string;
    name: string;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
  }>;

  // Sets (the critical data)
  sets: Array<{
    id: string;
    exerciseId: string;
    exerciseName?: string;
    weight: number;
    reps: number;
    rpe?: number | null;
    rir?: number | null;
    tag: 'warmup' | 'working' | 'failure' | 'drop' | 'cluster' | 'amrap';
    notes?: string;
    estimated1RM?: number | null;
    timestamp: number;
    isGroupSet?: boolean;
    groupId?: string;
    groupType?: string;
  }>;

  // Metrics
  totalVolume: number;
  totalReps: number;
  estimatedCalories: number;
  musclesWorked: string[];

  // PRs
  sessionPRs: Array<{
    type: 'weight' | '1rm' | 'volume';
    exerciseId: string;
    exerciseName?: string;
    value: number;
    previous: number;
  }>;

  // Rest timer state
  restTimer?: {
    remaining?: number | null;
    totalDuration?: number | null;
    startedAt?: number | null;
  };

  // Exercise groups
  exerciseGroups: unknown[];
  activeGroup?: unknown;
  activeGroupExerciseIndex: number;
  activeGroupRound: number;
  groupSets: unknown[];

  // Sync tracking
  clientVersion: number;
}

/**
 * Convert client session to server format
 */
function sessionToServerFormat(session: WorkoutSession) {
  return {
    sessionId: session.sessionId,
    startedAt: session.startTime,
    pausedAt: session.pausedAt,
    totalPausedTime: session.totalPausedTime,
    workoutPlan: session.workoutPlan || { exercises: session.exercises },
    currentExerciseIndex: session.currentExerciseIndex,
    currentSetIndex: session.currentSetIndex,
    sets: session.sets,
    totalVolume: session.totalVolume,
    totalReps: session.totalReps,
    estimatedCalories: session.estimatedCalories,
    musclesWorked: session.musclesWorked,
    sessionPRs: session.sessionPRs,
    restTimer: session.restTimer,
    exerciseGroups: session.exerciseGroups,
    activeGroup: session.activeGroup,
    activeGroupExerciseIndex: session.activeGroupExerciseIndex,
    activeGroupRound: session.activeGroupRound,
    groupSets: session.groupSets,
    clientVersion: session.clientVersion,
  };
}

/**
 * Convert server format to client session
 */
function serverFormatToSession(data: Record<string, unknown>): WorkoutSession {
  const exercises = (data.workoutPlan as { exercises?: unknown[] })?.exercises || [];
  return {
    sessionId: data.sessionId as string,
    isActive: true,
    startTime: data.startedAt as number,
    pausedAt: (data.pausedAt as number) || null,
    totalPausedTime: (data.totalPausedTime as number) || 0,
    workoutPlan: data.workoutPlan as WorkoutSession['workoutPlan'],
    currentExercise: exercises[(data.currentExerciseIndex as number) || 0] as WorkoutSession['currentExercise'],
    currentExerciseIndex: (data.currentExerciseIndex as number) || 0,
    currentSetIndex: (data.currentSetIndex as number) || 0,
    exercises: exercises as WorkoutSession['exercises'],
    sets: (data.sets as WorkoutSession['sets']) || [],
    totalVolume: (data.totalVolume as number) || 0,
    totalReps: (data.totalReps as number) || 0,
    estimatedCalories: (data.estimatedCalories as number) || 0,
    musclesWorked: (data.musclesWorked as string[]) || [],
    sessionPRs: (data.sessionPRs as WorkoutSession['sessionPRs']) || [],
    restTimer: data.restTimer as WorkoutSession['restTimer'],
    exerciseGroups: (data.exerciseGroups as unknown[]) || [],
    activeGroup: data.activeGroup,
    activeGroupExerciseIndex: (data.activeGroupExerciseIndex as number) || 0,
    activeGroupRound: (data.activeGroupRound as number) || 1,
    groupSets: (data.groupSets as unknown[]) || [],
    clientVersion: (data.clientVersion as number) || 1,
  };
}

/**
 * Recover session from available sources
 * Priority: IndexedDB (faster) > Server (more authoritative if IndexedDB is stale)
 */
export async function recoverSession(): Promise<{
  session: WorkoutSession | null;
  source: 'indexeddb' | 'server' | 'none';
}> {
  // First try IndexedDB (instant)
  const localSession = await loadSessionFromIndexedDB();

  // Then check server (authoritative)
  const serverSession = await loadSessionFromServer();

  // If both exist, use the one with more recent data
  if (localSession && serverSession) {
    // Compare by number of sets as a proxy for "more complete"
    // Or by client version if available
    const localSets = localSession.sets?.length || 0;
    const serverSets = serverSession.sets?.length || 0;
    const localVersion = localSession.clientVersion || 0;
    const serverVersion = serverSession.clientVersion || 0;

    // Use whichever has more data
    if (serverSets > localSets || serverVersion > localVersion) {
      // Server has more data - use it and update local
      await saveSessionToIndexedDB(serverSession);
      return { session: serverSession, source: 'server' };
    } else {
      // Local has more data - sync to server
      await syncSessionToServer(localSession, true);
      return { session: localSession, source: 'indexeddb' };
    }
  }

  // If only local exists
  if (localSession) {
    // Sync to server for backup
    await syncSessionToServer(localSession, true);
    return { session: localSession, source: 'indexeddb' };
  }

  // If only server exists
  if (serverSession) {
    // Save to IndexedDB for future instant recovery
    await saveSessionToIndexedDB(serverSession);
    return { session: serverSession, source: 'server' };
  }

  // No session found
  return { session: null, source: 'none' };
}

/**
 * Clear all session persistence (call when workout is completed or abandoned)
 */
export async function clearAllSessionPersistence(
  reason: 'completed' | 'abandoned' = 'completed',
  workoutId?: string
): Promise<void> {
  // Clear debounced sync
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  // Clear IndexedDB
  await clearSessionFromIndexedDB();

  // Archive on server
  await archiveSessionOnServer(reason, workoutId);
}

// ============================================
// VISIBILITY CHANGE HANDLING
// ============================================

/**
 * Setup handlers for page visibility changes
 * Forces sync when user leaves the page
 */
export function setupVisibilityHandlers(
  getSession: () => WorkoutSession | null
): () => void {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const session = getSession();
      if (session?.isActive) {
        // Force sync when user leaves page
        void syncSessionToServer(session, true);
      }
    }
  };

  const handleBeforeUnload = () => {
    const session = getSession();
    if (session?.isActive) {
      // Use sendBeacon for reliable delivery during page unload
      const token = localStorage.getItem('token');
      if (token) {
        const data = JSON.stringify(sessionToServerFormat(session));
        navigator.sendBeacon('/api/sessions', data);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}
