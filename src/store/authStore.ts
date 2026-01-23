/**
 * Auth Store (Zustand)
 *
 * Single source of truth for authentication state.
 * Uses Zustand with persist middleware for localStorage persistence.
 * Uses resilient storage that works with Brave Shields and other blockers.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearApolloCache } from '../graphql/client';
import {
  resilientStorage,
  getToken as getStoredToken,
  setToken as setStoredToken,
  removeToken as removeStoredToken,
  setUser as setStoredUser,
  removeUser as removeStoredUser,
} from '../lib/zustand-storage';

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
      storage: createJSONStorage(() => resilientStorage),
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
// This handles edge cases in Safari private mode where persist may not call the callback
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useAuthStore.getState();
    if (!state._hasHydrated) {
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
