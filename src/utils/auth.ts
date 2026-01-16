/**
 * Auth Utilities
 *
 * These functions provide access to auth state from the Zustand store.
 * They work both inside and outside React components.
 */

import { useAuthStore, getToken as storeGetToken, getAuthHeader } from '../store/authStore';

/**
 * Get the current auth token
 */
export const getToken = () => {
  return storeGetToken();
};

/**
 * Get the current user
 */
export const getUser = () => {
  return useAuthStore.getState().user || {};
};

/**
 * Set auth state (login)
 */
export const setAuth = (token, user) => {
  useAuthStore.getState().setAuth(user, token);
};

/**
 * Clear auth state (logout)
 */
export const clearAuth = () => {
  useAuthStore.getState().logout();
};

/**
 * Get authorization headers
 */
export const authHeaders = () => {
  return getAuthHeader();
};

/**
 * Fetch with auth headers
 */
export const authFetch = async (url, options = {}) => {
  const headers = {
    ...options.headers,
    ...authHeaders(),
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return res;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const state = useAuthStore.getState();
  return state._hasHydrated && state.isAuthenticated;
};
