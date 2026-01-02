import type { Storage } from './types';

/**
 * Web storage implementation using localStorage.
 * Note: This is NOT secure for production token storage.
 * For web, tokens should be stored in HttpOnly cookies (handled server-side).
 * This implementation is primarily for non-sensitive data and development.
 */
class WebStorage implements Storage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      console.warn('Failed to get item from localStorage:', key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn('Failed to set item in localStorage:', key);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn('Failed to remove item from localStorage:', key);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      // Only clear musclemap-related keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('musclemap_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      console.warn('Failed to clear localStorage');
    }
  }
}

export const webStorage = new WebStorage();
