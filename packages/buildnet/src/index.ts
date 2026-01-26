/**
 * @musclemap.me/buildnet
 *
 * TypeScript client for BuildNet - High-performance build orchestration system.
 *
 * BuildNet is a Rust-powered build daemon that provides:
 * - Intelligent caching with content-addressed storage
 * - Incremental builds using xxHash3 for fast file hashing
 * - Parallel build execution with dependency resolution
 * - Real-time build events via Server-Sent Events
 * - SQLite state persistence with WAL mode
 *
 * @example
 * ```typescript
 * import { BuildNetClient } from '@musclemap.me/buildnet';
 *
 * const client = new BuildNetClient({
 *   baseUrl: 'http://localhost:9876',
 * });
 *
 * // Check if daemon is running
 * const health = await client.health();
 * console.log(`BuildNet v${health.version}`);
 *
 * // Build all packages
 * const result = await client.buildAll();
 * if (result.success) {
 *   console.log(`Build completed in ${result.total_duration_ms}ms`);
 * } else {
 *   console.error('Build failed:', result.results.filter(r => r.error));
 * }
 *
 * // Stream build events
 * for await (const event of client.events()) {
 *   console.log(`[${event.event_type}] ${event.message}`);
 * }
 * ```
 *
 * @packageDocumentation
 */

// Re-export client
export { BuildNetClient, BuildNetError } from './client';

// Re-export BuildTier enum
export { BuildTier } from './types';

// Re-export all types
export type {
  BuildStatus,
  BuildResult,
  BuildResponse,
  HealthResponse,
  StatusResponse,
  StateStats,
  CacheStats,
  BuildState,
  PackageConfig,
  Config,
  BuildEvent,
  BuildNetClientOptions,
  BuildOptions,
  CacheClearOptions,
  CacheClearResponse,
} from './types';

import { BuildNetClient as Client } from './client';

/**
 * Create a BuildNet client with default options
 *
 * @param baseUrl - BuildNet daemon URL (default: http://localhost:9876)
 * @returns BuildNet client instance
 *
 * @example
 * ```typescript
 * import { createClient } from '@musclemap.me/buildnet';
 *
 * const client = createClient('http://localhost:9876');
 * const health = await client.health();
 * ```
 */
export function createClient(baseUrl = 'http://localhost:9876'): Client {
  return new Client({ baseUrl });
}

/**
 * Default BuildNet daemon URL
 */
export const DEFAULT_BUILDNET_URL = 'http://localhost:9876';

/**
 * Default BuildNet production URL (MuscleMap)
 */
export const MUSCLEMAP_BUILDNET_URL = 'https://musclemap.me/buildnet';
