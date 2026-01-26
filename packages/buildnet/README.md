# @musclemap.me/buildnet

TypeScript client for **BuildNet** - a high-performance build orchestration system written in Rust.

[![npm version](https://img.shields.io/npm/v/@musclemap.me/buildnet.svg)](https://www.npmjs.com/package/@musclemap.me/buildnet)
[![npm downloads](https://img.shields.io/npm/dm/@musclemap.me/buildnet.svg)](https://www.npmjs.com/package/@musclemap.me/buildnet)

## Features

- **Intelligent Caching**: Content-addressed storage with xxHash3 for fast file hashing
- **Incremental Builds**: Only rebuild what changed (10-100x faster)
- **Parallel Execution**: Build independent packages concurrently
- **Real-time Events**: Stream build progress via Server-Sent Events
- **SQLite Persistence**: WAL mode for concurrent access
- **TypeScript First**: Full type definitions included
- **Zero Dependencies**: Lightweight client with no runtime dependencies

## Installation

```bash
npm install @musclemap.me/buildnet
# or
pnpm add @musclemap.me/buildnet
# or
yarn add @musclemap.me/buildnet
```

## Quick Start

```typescript
import { BuildNetClient } from '@musclemap.me/buildnet';

const client = new BuildNetClient({
  baseUrl: 'http://localhost:9876',
});

// Check health
const health = await client.health();
console.log(`BuildNet v${health.version} - uptime: ${health.uptime_secs}s`);

// Build all packages
const result = await client.buildAll();
console.log(`Build ${result.success ? 'succeeded' : 'failed'} in ${result.total_duration_ms}ms`);

// Build a single package
const packageResult = await client.buildPackage('api');
console.log(`Package build: ${packageResult.status}`);
```

## API Reference

### Client Options

```typescript
interface BuildNetClientOptions {
  /** Base URL for the BuildNet API */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 300000) */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Authentication token */
  token?: string;
}
```

### Methods

#### Health & Status

```typescript
// Health check
const health = await client.health();
// { status: 'ok', version: '0.1.0', uptime_secs: 3600 }

// Detailed status
const status = await client.status();
// { status: 'running', packages: ['shared', 'core', 'api'], state_stats: {...} }

// Statistics only
const stats = await client.stats();
// { total_builds: 42, cached_builds: 38, failed_builds: 2, ... }
```

#### Build Operations

```typescript
// Build all packages
const result = await client.buildAll();
// { success: true, results: [...], total_duration_ms: 1234 }

// Build with force rebuild
const result = await client.buildAll({ force: true });

// Build single package
const pkgResult = await client.buildPackage('api');
// { package: 'api', tier: 'SmartIncremental', status: 'completed', ... }
```

#### Build History

```typescript
// List recent builds
const builds = await client.listBuilds();

// Get specific build
const build = await client.getBuild('uuid-here');
```

#### Cache Operations

```typescript
// Get cache stats
const cacheStats = await client.cacheStats();
// { total_size: 1048576, artifact_count: 12, ... }

// Clear cache
const cleared = await client.cacheClear();
// { removed: 5 }

// Clear cache, keeping under 100MB
const cleared = await client.cacheClear({ max_size_mb: 100 });
```

#### Configuration

```typescript
// Get current config
const config = await client.getConfig();
// { project_root: '/path/to/project', packages: [...], ... }
```

#### Event Streaming

```typescript
// Stream build events (async generator)
for await (const event of client.events()) {
  console.log(`[${event.event_type}] ${event.message}`);

  if (event.event_type === 'build_complete') {
    break;
  }
}
```

### Build Tiers

BuildNet uses intelligent tiering to minimize build times:

| Tier | Name | Description |
|------|------|-------------|
| 0 | `InstantSkip` | No changes detected, skip entirely (<0.1s) |
| 1 | `CacheRestore` | Restore output from cache (1-2s) |
| 2 | `MicroIncremental` | 1-3 files changed (5-15s) |
| 3 | `SmartIncremental` | Moderate changes with dependency analysis (15-30s) |
| 4 | `FullBuild` | Many files changed, full rebuild (60-90s) |

## FFI Bindings (Bun)

For maximum performance in Bun, use the FFI bindings:

```typescript
import { BuildNetFFI } from '@musclemap.me/buildnet/ffi';

const ffi = new BuildNetFFI('/path/to/libbuildnet_ffi.dylib');

const result = ffi.buildAll({ force: false });
console.log(result);

ffi.close();
```

Note: FFI bindings require the native library to be compiled for your platform.

## Running the BuildNet Daemon

The BuildNet daemon is a Rust binary. To run it:

```bash
# Build the daemon
cd packages/buildnet-native
cargo build --release

# Run the daemon
./target/release/buildnetd --port 9876 --foreground
```

Or use PM2 for production:

```bash
pm2 start ecosystem.config.cjs --only buildnet
```

## Configuration

Create `.buildnet/config.json` in your project root:

```json
{
  "project_root": "/path/to/project",
  "db_path": ".buildnet/state.db",
  "cache_path": ".buildnet/cache",
  "http_port": 9876,
  "max_concurrent_builds": 4,
  "packages": [
    {
      "name": "shared",
      "path": "packages/shared",
      "build_cmd": "pnpm build",
      "dependencies": [],
      "sources": ["packages/shared/src/**/*.ts"],
      "output_dir": "packages/shared/dist"
    },
    {
      "name": "api",
      "path": "apps/api",
      "build_cmd": "pnpm build",
      "dependencies": ["shared"],
      "sources": ["apps/api/src/**/*.ts"],
      "output_dir": "apps/api/dist"
    }
  ]
}
```

## Error Handling

```typescript
import { BuildNetClient, BuildNetError } from '@musclemap.me/buildnet';

try {
  const result = await client.buildAll();
} catch (error) {
  if (error instanceof BuildNetError) {
    console.error(`BuildNet error (${error.statusCode}): ${error.message}`);
  } else {
    throw error;
  }
}
```

## Helper Function

```typescript
import { createClient, MUSCLEMAP_BUILDNET_URL } from '@musclemap.me/buildnet';

// Quick client creation
const client = createClient('http://localhost:9876');

// Or use MuscleMap's production BuildNet
const prodClient = createClient(MUSCLEMAP_BUILDNET_URL);
```

## Related Packages

- **BuildNet Native** (Rust): The core daemon at `packages/buildnet-native/`
- **@musclemap.me/core**: Shared domain types
- **@musclemap.me/shared**: Shared utilities

## License

MIT
