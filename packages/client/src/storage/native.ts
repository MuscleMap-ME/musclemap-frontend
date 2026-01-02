import type { Storage } from './types';

// Dynamic import types for expo-secure-store
// This file is only imported on native platforms
type SecureStoreModule = typeof import('expo-secure-store');

let SecureStore: SecureStoreModule | null = null;

/**
 * Load expo-secure-store dynamically to prevent import errors on web.
 */
async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (SecureStore) return SecureStore;

  try {
    SecureStore = await import('expo-secure-store');
    return SecureStore;
  } catch {
    console.warn('expo-secure-store not available');
    return null;
  }
}

/**
 * Native storage implementation using expo-secure-store.
 * Provides encrypted storage for sensitive data like tokens.
 */
class NativeStorage implements Storage {
  async getItem(key: string): Promise<string | null> {
    const store = await getSecureStore();
    if (!store) return null;

    try {
      return await store.getItemAsync(key);
    } catch (error) {
      console.warn('Failed to get item from SecureStore:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const store = await getSecureStore();
    if (!store) return;

    try {
      await store.setItemAsync(key, value);
    } catch (error) {
      console.warn('Failed to set item in SecureStore:', key, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    const store = await getSecureStore();
    if (!store) return;

    try {
      await store.deleteItemAsync(key);
    } catch (error) {
      console.warn('Failed to remove item from SecureStore:', key, error);
    }
  }

  async clear(): Promise<void> {
    // SecureStore doesn't have a clear method, so we manually remove known keys
    const { STORAGE_KEYS } = await import('./types');
    const store = await getSecureStore();
    if (!store) return;

    await Promise.all(
      Object.values(STORAGE_KEYS).map((key) =>
        store.deleteItemAsync(key).catch(() => {
          // Ignore errors for non-existent keys
        })
      )
    );
  }
}

export const nativeStorage = new NativeStorage();
