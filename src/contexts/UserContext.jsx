/**
 * User Context (Legacy Wrapper)
 *
 * This is a compatibility layer that wraps the Zustand auth store.
 * New code should use useAuth() from store/authStore.js directly.
 *
 * @deprecated Use useAuth() from 'store/authStore' instead
 */

import React, { createContext, useContext } from 'react';
import { useAuth, useAuthStore } from '../store/authStore';

const UserContext = createContext(null);

/**
 * UserProvider - wraps the Zustand store for backward compatibility
 * @deprecated Use Zustand store directly
 */
export function UserProvider({ children }) {
  const auth = useAuth();

  // Provide the same interface as the old context
  const value = {
    user: auth.user,
    setUser: (user) => useAuthStore.getState().updateUser(user),
    login: auth.login,
    logout: auth.logout,
    loading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * useUser hook - wraps the Zustand store for backward compatibility
 * @deprecated Use useAuth() from 'store/authStore' instead
 */
export function useUser() {
  const context = useContext(UserContext);

  // If used outside provider, fall back to Zustand store directly
  if (!context) {
    const auth = useAuth();
    return {
      user: auth.user,
      setUser: auth.updateUser,
      login: auth.login,
      logout: auth.logout,
      loading: auth.loading,
      isAuthenticated: auth.isAuthenticated,
    };
  }

  return context;
}

export default UserContext;
