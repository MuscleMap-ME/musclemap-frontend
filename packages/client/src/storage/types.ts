/**
 * Storage Adapter Interface
 *
 * Platform-agnostic storage abstraction that can be implemented
 * by localStorage (web) or expo-secure-store (native).
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Storage keys used throughout the application
 */
export const STORAGE_KEYS = {
  TOKEN: 'musclemap_token',
  USER: 'musclemap_user',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Global storage instance - set this before using auth/http modules
 */
let globalStorage: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void {
  globalStorage = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  if (!globalStorage) {
    throw new Error(
      'Storage adapter not initialized. Call setStorageAdapter() before using auth/http modules.'
    );
  }
  return globalStorage;
}

/**
 * Check if storage adapter has been initialized
 */
export function hasStorageAdapter(): boolean {
  return globalStorage !== null;
}
