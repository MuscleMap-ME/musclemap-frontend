/**
 * Auth utilities - re-exported from @musclemap/client for backwards compatibility
 *
 * @deprecated Import directly from '@musclemap/client' instead:
 *   import { auth, request } from '@musclemap/client';
 */
import { auth, request } from '@musclemap/client';

// Sync wrappers for backwards compatibility (these are now async in the client)
// Using localStorage directly for sync access since webStorage is initialized
export const getToken = () => localStorage.getItem('musclemap_token');
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('musclemap_user') || '{}');
  } catch {
    return {};
  }
};

export const setAuth = async (token, user) => {
  await auth.setAuth(token, user);
};

export const clearAuth = async () => {
  await auth.clearAuth();
};

export const authHeaders = () => ({ Authorization: 'Bearer ' + getToken() });

export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json'
    }
  });
  if (res.status === 401) {
    await clearAuth();
    window.location.href = '/login';
  }
  return res;
};
