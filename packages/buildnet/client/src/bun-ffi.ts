/**
 * BuildNet Bun FFI Client
 *
 * Uses Bun's native FFI for direct communication with the BuildNet library.
 * This provides maximum performance by avoiding HTTP overhead.
 *
 * @example
 * ```typescript
 * import { BuildNetFFI } from '@musclemap.me/buildnet-client/bun-ffi';
 *
 * const buildnet = new BuildNetFFI('/path/to/project');
 *
 * const results = buildnet.buildAll();
 * console.log(results);
 *
 * buildnet.close();
 * ```
 */

/// <reference types="bun-types" />

import { dlopen, FFIType, ptr, suffix } from 'bun:ffi';
import { join } from 'path';

// Library path based on platform
const LIBRARY_NAME = `libbuildnet_ffi.${suffix}`;

interface FFISymbols {
  buildnet_new: (projectRoot: number) => number;
  buildnet_free: (handle: number) => void;
  buildnet_version: () => number;
  buildnet_string_free: (str: number) => void;
  buildnet_build_all: (handle: number) => number;
  buildnet_stats: (handle: number) => number;
}

/**
 * BuildNet FFI Client for Bun
 *
 * Provides direct FFI access to the BuildNet native library.
 */
export class BuildNetFFI {
  private lib: ReturnType<typeof dlopen<FFISymbols>>;
  private handle: number;

  /**
   * Create a new BuildNet FFI client
   *
   * @param projectRoot - Path to the project root
   * @param libraryPath - Path to the BuildNet shared library (optional)
   */
  constructor(projectRoot: string = '.', libraryPath?: string) {
    // Find the library
    const libPath =
      libraryPath ??
      join(
        process.cwd(),
        'packages',
        'buildnet-native',
        'target',
        'release',
        LIBRARY_NAME
      );

    // Define FFI symbols
    this.lib = dlopen(libPath, {
      buildnet_new: {
        args: [FFIType.ptr],
        returns: FFIType.ptr,
      },
      buildnet_free: {
        args: [FFIType.ptr],
        returns: FFIType.void,
      },
      buildnet_version: {
        args: [],
        returns: FFIType.ptr,
      },
      buildnet_string_free: {
        args: [FFIType.ptr],
        returns: FFIType.void,
      },
      buildnet_build_all: {
        args: [FFIType.ptr],
        returns: FFIType.ptr,
      },
      buildnet_stats: {
        args: [FFIType.ptr],
        returns: FFIType.ptr,
      },
    });

    // Create handle
    const projectRootBuf = Buffer.from(projectRoot + '\0');
    this.handle = this.lib.symbols.buildnet_new(ptr(projectRootBuf));

    if (this.handle === 0) {
      throw new Error('Failed to create BuildNet instance');
    }
  }

  /**
   * Get BuildNet version
   */
  version(): string {
    const strPtr = this.lib.symbols.buildnet_version();
    const str = this.readCString(strPtr);
    this.lib.symbols.buildnet_string_free(strPtr);
    return str;
  }

  /**
   * Build all packages
   */
  buildAll<T = unknown>(): T {
    const resultPtr = this.lib.symbols.buildnet_build_all(this.handle);
    if (resultPtr === 0) {
      throw new Error('Build failed');
    }
    const json = this.readCString(resultPtr);
    this.lib.symbols.buildnet_string_free(resultPtr);
    return JSON.parse(json);
  }

  /**
   * Get build statistics
   */
  stats<T = unknown>(): T {
    const resultPtr = this.lib.symbols.buildnet_stats(this.handle);
    if (resultPtr === 0) {
      throw new Error('Failed to get stats');
    }
    const json = this.readCString(resultPtr);
    this.lib.symbols.buildnet_string_free(resultPtr);
    return JSON.parse(json);
  }

  /**
   * Close the BuildNet instance
   */
  close(): void {
    if (this.handle !== 0) {
      this.lib.symbols.buildnet_free(this.handle);
      this.handle = 0;
    }
  }

  private readCString(ptr: number): string {
    // Read null-terminated string from pointer
    const view = new DataView(new ArrayBuffer(1024));
    let str = '';
    let offset = 0;

    while (true) {
      const byte = new Uint8Array(Bun.mmap(ptr + offset, 1))[0];
      if (byte === 0) break;
      str += String.fromCharCode(byte);
      offset++;
      if (offset > 1024 * 1024) {
        throw new Error('String too long');
      }
    }

    return str;
  }
}

/**
 * Create a BuildNet FFI client
 */
export function createFFIClient(
  projectRoot?: string,
  libraryPath?: string
): BuildNetFFI {
  return new BuildNetFFI(projectRoot, libraryPath);
}

export default BuildNetFFI;
