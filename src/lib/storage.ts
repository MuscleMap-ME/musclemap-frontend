/**
 * Resilient Storage - Works everywhere including:
 * - Brave Shields Up
 * - Private/Incognito mode
 * - Firefox Enhanced Tracking Protection
 * - Safari ITP
 * - Corporate proxies blocking localStorage
 *
 * Falls back to in-memory storage when localStorage is unavailable.
 */

type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

interface StorageState {
  type: StorageType;
  available: boolean;
  testedAt: number;
}

class ResilientStorage {
  private memoryStorage: Map<string, string> = new Map();
  private state: StorageState | null = null;
  private readonly TEST_KEY = '__mm_storage_test__';

  /**
   * Test if localStorage is available
   */
  private testLocalStorage(): boolean {
    try {
      localStorage.setItem(this.TEST_KEY, 'test');
      localStorage.removeItem(this.TEST_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test if sessionStorage is available
   */
  private testSessionStorage(): boolean {
    try {
      sessionStorage.setItem(this.TEST_KEY, 'test');
      sessionStorage.removeItem(this.TEST_KEY);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine the best available storage type
   */
  private detectStorageType(): StorageState {
    // Cache result for 5 minutes
    if (this.state && Date.now() - this.state.testedAt < 5 * 60 * 1000) {
      return this.state;
    }

    // Try localStorage first (persistent)
    if (this.testLocalStorage()) {
      this.state = { type: 'localStorage', available: true, testedAt: Date.now() };
      return this.state;
    }

    // Fall back to sessionStorage (temporary but still useful)
    if (this.testSessionStorage()) {
      this.state = { type: 'sessionStorage', available: true, testedAt: Date.now() };
      console.info('[Storage] localStorage unavailable, using sessionStorage');
      return this.state;
    }

    // Last resort: memory storage
    this.state = { type: 'memory', available: true, testedAt: Date.now() };
    console.info('[Storage] Browser storage unavailable, using memory storage');
    return this.state;
  }

  /**
   * Get the native storage object if available
   */
  private getNativeStorage(): Storage | null {
    const state = this.detectStorageType();
    switch (state.type) {
      case 'localStorage':
        return localStorage;
      case 'sessionStorage':
        return sessionStorage;
      default:
        return null;
    }
  }

  /**
   * Get an item from storage
   */
  getItem(key: string): string | null {
    const native = this.getNativeStorage();
    if (native) {
      try {
        return native.getItem(key);
      } catch {
        // Fall through to memory
      }
    }
    return this.memoryStorage.get(key) ?? null;
  }

  /**
   * Set an item in storage
   */
  setItem(key: string, value: string): void {
    const native = this.getNativeStorage();
    if (native) {
      try {
        native.setItem(key, value);
        return;
      } catch (e) {
        // Quota exceeded or blocked - fall through to memory
        console.warn('[Storage] Native storage failed, using memory:', e);
      }
    }
    this.memoryStorage.set(key, value);
  }

  /**
   * Remove an item from storage
   */
  removeItem(key: string): void {
    const native = this.getNativeStorage();
    if (native) {
      try {
        native.removeItem(key);
      } catch {
        // Ignore errors
      }
    }
    this.memoryStorage.delete(key);
  }

  /**
   * Clear all storage
   */
  clear(): void {
    const native = this.getNativeStorage();
    if (native) {
      try {
        native.clear();
      } catch {
        // Ignore errors
      }
    }
    this.memoryStorage.clear();
  }

  /**
   * Get the current storage type being used
   */
  getStorageType(): StorageType {
    return this.detectStorageType().type;
  }

  /**
   * Check if persistent storage is available
   */
  isPersistent(): boolean {
    return this.detectStorageType().type === 'localStorage';
  }

  /**
   * Get storage info for debugging
   */
  getStorageInfo(): {
    type: StorageType;
    isPersistent: boolean;
    memoryItemCount: number;
  } {
    const state = this.detectStorageType();
    return {
      type: state.type,
      isPersistent: state.type === 'localStorage',
      memoryItemCount: this.memoryStorage.size,
    };
  }
}

// Singleton instance
export const storage = new ResilientStorage();

// Named exports for specific use cases
export const getItem = (key: string) => storage.getItem(key);
export const setItem = (key: string, value: string) => storage.setItem(key, value);
export const removeItem = (key: string) => storage.removeItem(key);
export const clearStorage = () => storage.clear();
export const getStorageType = () => storage.getStorageType();
export const isPersistentStorage = () => storage.isPersistent();

export default storage;
