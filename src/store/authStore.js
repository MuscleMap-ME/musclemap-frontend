import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { 
      name: 'musclemap-auth',
      onRehydrateStorage: () => (state) => {
        // Handle rehydration errors
        if (state && state.token) {
          console.log('Auth state restored from storage');
        }
        state?.setHasHydrated(true);
      },
    }
  )
)
