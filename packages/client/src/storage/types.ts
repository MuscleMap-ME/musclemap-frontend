/**
 * Platform-agnostic storage interface for secure token storage.
 * Implementations exist for web (localStorage) and native (expo-secure-store).
 */
export interface Storage {
  /**
   * Get a value from storage.
   * @param key - The key to retrieve
   * @returns The stored value, or null if not found
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Set a value in storage.
   * @param key - The key to store under
   * @param value - The value to store
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Remove a value from storage.
   * @param key - The key to remove
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clear all stored values.
   */
  clear?(): Promise<void>;
}

/**
 * Storage keys used by the MuscleMap client.
 */
export const STORAGE_KEYS = {
  TOKEN: 'musclemap_token',
  REFRESH_TOKEN: 'musclemap_refresh_token',
  USER: 'musclemap_user',
  PREFERENCES: 'musclemap_preferences',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
