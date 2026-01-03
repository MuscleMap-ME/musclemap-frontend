/**
 * Auth Store (Zustand)
 *
 * Single source of truth for authentication state.
 * Uses Zustand with persist middleware for localStorage persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
      setHasHydrated: (state) => set({ _hasHydrated: state, loading: false }),

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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Auth state rehydration error:', error);
          // Clear corrupted state
          localStorage.removeItem('musclemap-auth');
        } else if (state?.token) {
          console.log('Auth state restored from storage');
        }
        // Use getState().setHasHydrated since state is just the hydrated data, not the store
        useAuthStore.getState().setHasHydrated(true);
      },
    }
  )
);

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
