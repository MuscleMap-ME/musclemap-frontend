/**
 * Resilient Zustand Storage Adapter
 *
 * Provides a localStorage-like interface for Zustand's persist middleware
 * that gracefully handles environments where localStorage is blocked:
 * - Brave Shields UP (makes localStorage undefined or throw)
 * - Firefox Enhanced Tracking Protection
 * - Safari Private Mode
 * - iOS WKWebView restrictions
 *
 * Falls back to in-memory storage when localStorage is unavailable.
 */

import { StateStorage } from 'zustand/middleware';
import { storage } from './storage';

/**
 * Resilient storage adapter for Zustand persist middleware.
 * Uses our resilient storage module that handles Brave Shields and other blockers.
 */
export const resilientStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return storage.getItem(name);
    } catch {
      // If even the resilient storage fails, return null
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    try {
      storage.setItem(name, value);
    } catch {
      // Silently fail - data won't persist but app won't crash
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[zustand-storage] Failed to persist state for ${name}`);
      }
    }
  },

  removeItem: (name: string): void => {
    try {
      storage.removeItem(name);
    } catch {
      // Silently fail
    }
  },
};

/**
 * Check if persistent storage is available.
 * Use this to show users a warning that their data won't persist.
 */
export function isPersistentStorageAvailable(): boolean {
  return storage.isPersistent();
}

/**
 * Get the current storage type being used.
 * Returns 'localStorage', 'sessionStorage', or 'memory'.
 */
export function getStorageType(): 'localStorage' | 'sessionStorage' | 'memory' {
  return storage.getStorageType();
}

/**
 * Safe wrapper for getting token that works with Brave Shields.
 * Use this instead of direct localStorage.getItem('musclemap_token')
 */
export function getToken(): string | null {
  try {
    return storage.getItem('musclemap_token');
  } catch {
    return null;
  }
}

/**
 * Safe wrapper for setting token that works with Brave Shields.
 */
export function setToken(token: string): void {
  try {
    storage.setItem('musclemap_token', token);
  } catch {
    // Silently fail
  }
}

/**
 * Safe wrapper for removing token that works with Brave Shields.
 */
export function removeToken(): void {
  try {
    storage.removeItem('musclemap_token');
  } catch {
    // Silently fail
  }
}

/**
 * Safe wrapper for getting user that works with Brave Shields.
 */
export function getUser(): unknown {
  try {
    const userStr = storage.getItem('musclemap_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Safe wrapper for setting user that works with Brave Shields.
 */
export function setUser(user: unknown): void {
  try {
    storage.setItem('musclemap_user', JSON.stringify(user));
  } catch {
    // Silently fail
  }
}

/**
 * Safe wrapper for removing user that works with Brave Shields.
 */
export function removeUser(): void {
  try {
    storage.removeItem('musclemap_user');
  } catch {
    // Silently fail
  }
}

export default resilientStorage;
