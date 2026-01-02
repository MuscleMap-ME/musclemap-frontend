import type { Storage } from './types';
import { webStorage } from './web';
import { nativeStorage } from './native';

export * from './types';
export { webStorage } from './web';
export { nativeStorage } from './native';

/**
 * Detect if we're running in a React Native environment.
 */
function isNativePlatform(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  );
}

/**
 * Get the appropriate storage implementation for the current platform.
 * - Native (iOS/Android): Uses expo-secure-store for encrypted storage
 * - Web: Uses localStorage (for non-sensitive data only)
 */
export function getStorage(): Storage {
  if (isNativePlatform()) {
    return nativeStorage;
  }
  return webStorage;
}

/**
 * Default storage instance for the current platform.
 */
export const storage = getStorage();
