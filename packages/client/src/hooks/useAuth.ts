/**
 * useAuth Hook
 *
 * Provides authentication state management with platform-agnostic storage.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getStorageAdapter, STORAGE_KEYS } from '../storage/types';
import type { User, AuthResponse } from '../api';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UseAuthOptions {
  onLogout?: () => void | Promise<void>;
}

export interface UseAuthResult extends AuthState {
  login: (response: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshFromStorage: () => Promise<void>;
}

/**
 * Get auth data from storage
 */
async function getAuthFromStorage(): Promise<{ token: string | null; user: User | null }> {
  try {
    const storage = getStorageAdapter();
    const [token, userJson] = await Promise.all([
      storage.getItem(STORAGE_KEYS.TOKEN),
      storage.getItem(STORAGE_KEYS.USER),
    ]);

    let user: User | null = null;
    if (userJson) {
      try {
        user = JSON.parse(userJson) as User;
      } catch {
        user = null;
      }
    }

    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

/**
 * Save auth data to storage
 */
async function saveAuthToStorage(token: string, user: User): Promise<void> {
  const storage = getStorageAdapter();
  await Promise.all([
    storage.setItem(STORAGE_KEYS.TOKEN, token),
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
  ]);
}

/**
 * Clear auth data from storage
 */
async function clearAuthFromStorage(): Promise<void> {
  const storage = getStorageAdapter();
  await Promise.all([
    storage.removeItem(STORAGE_KEYS.TOKEN),
    storage.removeItem(STORAGE_KEYS.USER),
  ]);
}

/**
 * Hook for managing authentication state
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const { onLogout } = options;

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = useMemo(() => Boolean(token && user), [token, user]);

  // Restore auth state from storage on mount
  const refreshFromStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const { token: storedToken, user: storedUser } = await getAuthFromStorage();
      setToken(storedToken);
      setUser(storedUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login - save credentials and update state
  const login = useCallback(async (response: AuthResponse) => {
    await saveAuthToStorage(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
  }, []);

  // Logout - clear credentials and update state
  const logout = useCallback(async () => {
    await clearAuthFromStorage();
    setToken(null);
    setUser(null);
    await onLogout?.();
  }, [onLogout]);

  // Update user data
  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user || !token) return;
      const updatedUser = { ...user, ...updates };
      await saveAuthToStorage(token, updatedUser);
      setUser(updatedUser);
    },
    [user, token]
  );

  // Restore auth on mount
  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
    refreshFromStorage,
  };
}

/**
 * Standalone auth functions for use outside React components
 */
export const auth = {
  getToken: async (): Promise<string | null> => {
    const { token } = await getAuthFromStorage();
    return token;
  },

  getUser: async (): Promise<User | null> => {
    const { user } = await getAuthFromStorage();
    return user;
  },

  setAuth: async (token: string, user: User): Promise<void> => {
    await saveAuthToStorage(token, user);
  },

  clearAuth: async (): Promise<void> => {
    await clearAuthFromStorage();
  },

  isAuthenticated: async (): Promise<boolean> => {
    const { token, user } = await getAuthFromStorage();
    return Boolean(token && user);
  },
};

export default useAuth;
