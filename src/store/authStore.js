/**
 * Auth Store (Zustand)
 *
 * Single source of truth for authentication state.
 * Uses Zustand with persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Safe localStorage wrapper that handles Safari private mode and other edge cases
 */
const safeStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Safari private mode or quota exceeded - silently fail
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore errors
    }
  },
};

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
        set({ user, token, isAuthenticated: true, loading: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () => {
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
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Auth state rehydration error:', error);
          // Clear corrupted state
          safeStorage.removeItem('musclemap-auth');
        } else if (state?.token) {
          console.log('Auth state restored from storage');
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
// This handles edge cases in Safari private mode where persist may not call the callback
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useAuthStore.getState();
    if (!state._hasHydrated) {
      console.log('Forcing hydration completion (fallback)');
      state.setHasHydrated(true);
    }
  }, 100);
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
