/**
 * BuildNet FFI Bindings
 *
 * Direct FFI bindings to the native BuildNet library for maximum performance.
 * Requires the native library to be compiled and available.
 *
 * @example
 * ```typescript
 * import { BuildNetFFI } from '@musclemap.me/buildnet/ffi';
 *
 * // For Bun
 * const ffi = new BuildNetFFI('/path/to/libbuildnet_ffi.dylib');
 *
 * const result = ffi.buildAll({ force: false });
 * console.log(result);
 *
 * ffi.close();
 * ```
 */

import type { BuildResponse, Config, HealthResponse, StatusResponse } from './types';

/** FFI library interface */
interface FFILibrary {
  buildnet_health: () => string;
  buildnet_status: () => string;
  buildnet_build_all: (force: number) => string;
  buildnet_build_package: (name: string, force: number) => string;
  buildnet_config: () => string;
  buildnet_cache_stats: () => string;
  buildnet_cache_clear: (maxSizeMb: number) => string;
  buildnet_free_string: (ptr: number) => void;
}

/**
 * BuildNet FFI Client
 *
 * Direct bindings to the native BuildNet library using FFI.
 * This provides the best performance by avoiding HTTP overhead.
 *
 * Note: This is platform-specific and requires the native library to be compiled
 * for your platform (macOS: .dylib, Linux: .so, Windows: .dll).
 */
export class BuildNetFFI {
  private lib: FFILibrary | null = null;

  /**
   * Create a new FFI client
   *
   * @param libraryPath - Path to the native library (.dylib, .so, or .dll)
   */
  constructor(libraryPath: string) {
    // Check if we're in Bun (has native FFI support)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as any).Bun !== 'undefined') {
      this.initBun(libraryPath);
    } else {
      throw new BuildNetFFIError(
        'FFI is only supported in Bun. For Node.js, use the HTTP client instead.'
      );
    }
  }

  /**
   * Initialize FFI bindings for Bun
   */
  private initBun(libraryPath: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BunFFI = (globalThis as any).Bun.FFI;

    const symbols = {
      buildnet_health: {
        args: [],
        returns: 'cstring',
      },
      buildnet_status: {
        args: [],
        returns: 'cstring',
      },
      buildnet_build_all: {
        args: ['i32'],
        returns: 'cstring',
      },
      buildnet_build_package: {
        args: ['cstring', 'i32'],
        returns: 'cstring',
      },
      buildnet_config: {
        args: [],
        returns: 'cstring',
      },
      buildnet_cache_stats: {
        args: [],
        returns: 'cstring',
      },
      buildnet_cache_clear: {
        args: ['i64'],
        returns: 'cstring',
      },
      buildnet_free_string: {
        args: ['ptr'],
        returns: 'void',
      },
    };

    this.lib = BunFFI.dlopen(libraryPath, symbols).symbols as FFILibrary;
  }

  /**
   * Parse JSON response from FFI call
   */
  private parseResponse<T>(json: string): T {
    try {
      const result = JSON.parse(json);
      if (result.error) {
        throw new BuildNetFFIError(result.error);
      }
      return result as T;
    } catch (e) {
      if (e instanceof BuildNetFFIError) throw e;
      throw new BuildNetFFIError(`Failed to parse FFI response: ${json}`);
    }
  }

  /**
   * Check if the library is loaded
   */
  private ensureLoaded(): void {
    if (!this.lib) {
      throw new BuildNetFFIError('FFI library not loaded');
    }
  }

  /**
   * Get health status
   */
  health(): HealthResponse {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_health());
  }

  /**
   * Get detailed status
   */
  status(): StatusResponse {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_status());
  }

  /**
   * Build all packages
   */
  buildAll(options: { force?: boolean } = {}): BuildResponse {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_build_all(options.force ? 1 : 0));
  }

  /**
   * Build a single package
   */
  buildPackage(name: string, options: { force?: boolean } = {}): BuildResponse {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_build_package(name, options.force ? 1 : 0));
  }

  /**
   * Get configuration
   */
  config(): Config {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_config());
  }

  /**
   * Get cache statistics
   */
  cacheStats(): { total_size: number; artifact_count: number } {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_cache_stats());
  }

  /**
   * Clear cache
   */
  cacheClear(maxSizeMb = 0): { removed: number } {
    this.ensureLoaded();
    return this.parseResponse(this.lib!.buildnet_cache_clear(maxSizeMb));
  }

  /**
   * Close the FFI library
   */
  close(): void {
    this.lib = null;
  }
}

/**
 * BuildNet FFI Error
 */
export class BuildNetFFIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildNetFFIError';
  }
}

/**
 * Detect the correct library extension for the current platform
 */
export function getLibraryExtension(): string {
  if (typeof process !== 'undefined') {
    switch (process.platform) {
      case 'darwin':
        return '.dylib';
      case 'win32':
        return '.dll';
      default:
        return '.so';
    }
  }
  return '.so'; // Default to Linux
}

/**
 * Get the default library path
 */
export function getDefaultLibraryPath(): string {
  const ext = getLibraryExtension();
  return `libbuildnet_ffi${ext}`;
}
