/**
 * Web Storage Adapter
 *
 * localStorage implementation wrapped as async for API compatibility
 */
import type { StorageAdapter } from './types';

export class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.clear();
  }
}

/**
 * Default web storage adapter instance
 */
export const webStorage = new WebStorageAdapter();
