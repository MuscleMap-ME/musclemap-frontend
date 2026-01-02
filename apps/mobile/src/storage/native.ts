/**
 * Native Storage Adapter for React Native
 *
 * Uses expo-secure-store for secure credential storage.
 */
import * as SecureStore from 'expo-secure-store';
import type { StorageAdapter, StorageKey } from '@musclemap/client';
import { STORAGE_KEYS } from '@musclemap/client';

class NativeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  async clear(): Promise<void> {
    // Clear all known storage keys
    const keys: StorageKey[] = Object.values(STORAGE_KEYS);
    await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  }
}

export const nativeStorage = new NativeStorageAdapter();
