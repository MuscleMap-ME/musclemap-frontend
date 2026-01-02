/**
 * Native Storage Adapter
 *
 * expo-secure-store implementation for React Native
 * This file will be used in apps/mobile
 */
import type { StorageAdapter } from './types';

// expo-secure-store is dynamically imported to avoid bundling issues on web
let SecureStore: typeof import('expo-secure-store') | null = null;

async function getSecureStore() {
  if (!SecureStore) {
    SecureStore = await import('expo-secure-store');
  }
  return SecureStore;
}

export class NativeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    const store = await getSecureStore();
    return store.getItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const store = await getSecureStore();
    await store.setItemAsync(key, value);
  }

  async removeItem(key: string): Promise<void> {
    const store = await getSecureStore();
    await store.deleteItemAsync(key);
  }

  async clear(): Promise<void> {
    // expo-secure-store doesn't have a clear method
    // We'll need to manually track and clear known keys
    // For now, clear the known auth keys
    const store = await getSecureStore();
    const { STORAGE_KEYS } = await import('./types');
    await Promise.all([
      store.deleteItemAsync(STORAGE_KEYS.TOKEN),
      store.deleteItemAsync(STORAGE_KEYS.USER),
    ]);
  }
}

/**
 * Default native storage adapter instance
 */
export const nativeStorage = new NativeStorageAdapter();
