/**
 * Auth Store (Zustand)
 *
 * Single source of truth for authentication state.
 * Uses Zustand with persist middleware for localStorage persistence.
 * Uses resilient storage that works with Brave Shields and other blockers.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { clearApolloCache } from '../graphql/client';
import {
  resilientStorage,
  setToken as setStoredToken,
  removeToken as removeStoredToken,
  setUser as setStoredUser,
  removeUser as removeStoredUser,
} from '../lib/zustand-storage';

/**
 * Create a safe JSON storage that catches all errors during creation.
 * This handles Brave Shields making storage APIs throw during initialization.
 */
function createSafeStorage(): ReturnType<typeof createJSONStorage> {
  try {
    return createJSONStorage(() => resilientStorage);
  } catch (e) {
    console.warn('[authStore] Failed to create JSON storage, using in-memory fallback:', e);
    // Return a no-op storage that stores nothing
    // The app will work but won't persist auth state
    const memoryStore: Record<string, string> = {};
    const memoryStorage: StateStorage = {
      getItem: (name: string) => memoryStore[name] ?? null,
      setItem: (name: string, value: string) => { memoryStore[name] = value; },
      removeItem: (name: string) => { delete memoryStore[name]; },
    };
    return createJSONStorage(() => memoryStorage);
  }
}

/**
 * Auth store with persistent state
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      loading: true,
      _hasHydrated: false,

      // Hydration
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated, loading: false }),

      // Actions
      setAuth: (user, token) => {
        // Also save to legacy keys for @musclemap/client compatibility
        setStoredToken(token);
        setStoredUser(user);
        set({ user, token, isAuthenticated: true, loading: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: async () => {
        // Also clear legacy keys
        removeStoredToken();
        removeStoredUser();
        // Clear Apollo cache (in-memory and persisted)
        await clearApolloCache();
        set({ user: null, token: null, isAuthenticated: false, loading: false });
      },

      // Helper to get auth header
      getAuthHeader: () => {
        const token = get().token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },

      // Check if authenticated (with hydration awareness)
      checkAuth: () => {
        const state = get();
        return state._hasHydrated && state.isAuthenticated;
      },
    }),
    {
      name: 'musclemap-auth',
      storage: createSafeStorage(),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // Clear corrupted state
          resilientStorage.removeItem('musclemap-auth');
        } else if (state?.token) {
          // Sync to legacy keys for @musclemap/client compatibility
          setStoredToken(state.token);
          if (state.user) {
            setStoredUser(state.user);
          }
        }
        // Schedule hydration completion for next tick to ensure store is ready
        setTimeout(() => {
          useAuthStore.getState().setHasHydrated(true);
        }, 0);
      },
    }
  )
);

// Fallback: ensure hydration completes even if onRehydrateStorage doesn't fire
// This handles edge cases where:
// - Safari private mode doesn't call the callback
// - Brave Shields blocks storage operations
// - Any other storage-related failure
if (typeof window !== 'undefined') {
  // Primary fallback: 100ms should be enough for normal rehydration
  setTimeout(() => {
    try {
      const state = useAuthStore.getState();
      if (!state._hasHydrated) {
        console.warn('[authStore] Primary hydration fallback triggered at 100ms');
        state.setHasHydrated(true);
      }
    } catch (e) {
      console.error('[authStore] Error in primary hydration fallback:', e);
    }
  }, 100);

  // Secondary fallback: 500ms - in case something is slow
  setTimeout(() => {
    try {
      const state = useAuthStore.getState();
      if (!state._hasHydrated) {
        console.warn('[authStore] Secondary hydration fallback triggered at 500ms');
        state.setHasHydrated(true);
      }
    } catch (e) {
      console.error('[authStore] Error in secondary hydration fallback:', e);
    }
  }, 500);

  // Emergency fallback: 2000ms - something is very wrong but app should still work
  setTimeout(() => {
    try {
      const state = useAuthStore.getState();
      if (!state._hasHydrated) {
        console.error('[authStore] Emergency hydration fallback triggered at 2000ms - storage may be completely blocked');
        state.setHasHydrated(true);
      }
    } catch (e) {
      console.error('[authStore] Error in emergency hydration fallback:', e);
      // Last resort: directly mutate the store state
      // This bypasses Zustand's normal flow but ensures the app doesn't hang forever
      try {
        useAuthStore.setState({ _hasHydrated: true, loading: false });
      } catch {
        // At this point, something is catastrophically wrong
        // The app will show a spinner forever, but at least we tried
      }
    }
  }, 2000);
}

/**
 * Hook to access auth state (replaces UserContext)
 */
export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    loading: store.loading,
    hasHydrated: store._hasHydrated,
    login: store.setAuth,
    logout: store.logout,
    updateUser: store.updateUser,
    getAuthHeader: store.getAuthHeader,
  };
}

/**
 * Get auth token outside of React components
 */
export function getToken() {
  return useAuthStore.getState().token;
}

/**
 * Get auth header outside of React components
 */
export function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default useAuthStore;
