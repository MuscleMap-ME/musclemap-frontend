# BuildNet

A distributed build system with hot-swappable bundlers, plugins, and DragonflyDB state management.

## Features

- **Distributed Builds**: Coordinate builds across multiple machines
- **Hot-Swappable Bundlers**: Switch between Vite/Rolldown, Rspack, esbuild at runtime
- **Plugin System**: Pre-build, build, post-build, and deploy hooks
- **State Backends**: DragonflyDB (recommended), Redis, file-based, or in-memory
- **Intelligent Caching**: Skip unnecessary rebuilds with content hashing
- **Graceful Degradation**: Automatic failover and recovery
- **CLI & Web UI**: Full control from command line or browser

## Quick Start

```bash
# Install
npm install @buildnet/core @buildnet/cli

# Initialize configuration
npx buildnet init

# Start the controller
npx buildnet controller start

# Request a build
npx buildnet build frontend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD CONTROLLER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ gRPC Server │  │ HTTP/REST   │  │ WebSocket (streaming)   │  │
│  │ :9900       │  │ :9901       │  │ :9902                   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    RESOURCE SCHEDULER                        ││
│  │  • Node health monitoring    • Priority routing             ││
│  │  • Resource normalization    • Load balancing               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  WORKER:     │     │  WORKER:     │     │  WORKER:     │
│  Production  │     │  Dev Mac     │     │  Dev Mac 2   │
│  VPS         │     │  (primary)   │     │  (optional)  │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Configuration

Create a `build-network.yaml` file:

```yaml
version: "1.0.0"

controller:
  id: "my-build-controller"
  listen:
    http: "0.0.0.0:9901"

state:
  backend: "auto"  # Tries dragonfly -> file -> memory

bundlers:
  active: "vite-rolldown"
  available:
    vite-rolldown:
      enabled: true
    rspack:
      enabled: true
    esbuild:
      enabled: true

plugins:
  core:
    typecheck:
      enabled: true
      hook: "pre-build"
      command: "pnpm typecheck"
    compress:
      enabled: true
      hook: "post-build"

tasks:
  frontend:
    command: "pnpm build"
    memory_required_gb: 4
```

## CLI Commands

```bash
# Controller management
buildnet controller start     # Start the controller
buildnet controller status    # Show status
buildnet controller stop      # Stop the controller

# Build operations
buildnet build [task]         # Request a build
buildnet status [buildId]     # Check build status
buildnet cancel <buildId>     # Cancel a build

# Node management
buildnet nodes                # List all nodes
buildnet node show <id>       # Show node details

# Bundler management
buildnet bundler list         # List available bundlers
buildnet bundler active       # Show active bundler
buildnet bundler switch <name> # Switch bundler (hot-swap)

# Plugin management
buildnet plugin list          # List all plugins
buildnet plugin enable <name> # Enable a plugin
buildnet plugin disable <name> # Disable a plugin
```

## State Backends

### DragonflyDB (Recommended)

DragonflyDB is a modern Redis-compatible database that's 25x faster and uses 80% less memory.

```yaml
state:
  backend: "dragonfly"
  dragonfly:
    url: "dragonfly://localhost:6379"
```

### File-Based (Single Node)

For single-node deployments without external dependencies:

```yaml
state:
  backend: "file"
  file:
    path: ".buildnet-state/"
```

### Memory (Development)

For testing and development:

```yaml
state:
  backend: "memory"
```

## Hot-Swappable Bundlers

Switch bundlers at runtime without restarting:

```bash
# Via CLI
buildnet bundler switch rspack

# Via API
curl -X POST http://localhost:9901/api/bundler/switch \
  -H "Content-Type: application/json" \
  -d '{"bundler": "rspack"}'
```

### Supported Bundlers

| Bundler | Performance | Use Case |
|---------|-------------|----------|
| Vite + Rolldown | 10-30x faster than Rollup | Production (default) |
| Rspack | Webpack-compatible, Rust-based | Webpack migration |
| esbuild | Fastest, limited features | CI/CD, simple builds |
| Turbopack | Next.js optimized | Next.js projects |

## Plugin System

### Built-in Plugins

- **typecheck**: Run TypeScript type checking
- **lint**: Run ESLint
- **clean**: Clean build directories
- **compress**: Gzip/Brotli compression
- **sourcemaps**: Source map handling
- **notify**: Send notifications

### Custom Plugins

```javascript
// plugins/my-plugin.mjs
export default {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    'pre-build': async (context) => {
      console.log('Running pre-build...');
    },
    'post-build': async (context, result) => {
      if (result.success) {
        console.log(`Build completed in ${result.duration_ms}ms`);
      }
    }
  }
};
```

## Packages

| Package | Description |
|---------|-------------|
| `@buildnet/core` | Core functionality (controller, worker, state, extensions) |
| `@buildnet/cli` | Command-line interface |

## Extension System

BuildNet includes a powerful extension system that automatically discovers and leverages the fastest tools available on your system.

### Quick Extension Setup

```typescript
import {
  createExtensionScanner,
  createExtensionInstaller,
  buildConfig,
} from '@buildnet/core';

// 1. Scan for available tools
const scanner = createExtensionScanner();
const capabilities = await scanner.scan();

console.log(`Found ${capabilities.extensions.filter(e => e.available).length} tools`);

// 2. See recommendations
for (const rec of capabilities.recommended) {
  console.log(`Install ${rec.extension.name}: ${rec.expectedSpeedup}`);
}

// 3. Install missing tools
const installer = createExtensionInstaller();
await installer.initialize();

const plan = await installer.createInstallationPlan(
  capabilities.recommended.map(r => r.extension)
);
console.log(installer.generateInstallationSummary(plan));
```

### Built-in Extensions (60+)

| Category | Tools | Best Performer |
|----------|-------|----------------|
| **Bundlers** | esbuild, SWC, Rspack, Turbopack | esbuild (100x) |
| **CSS** | Lightning CSS, PostCSS, cssnano | Lightning CSS (100x) |
| **Linters** | Oxlint, Biome, ESLint | Oxlint (100x) |
| **Compressors** | Brotli, Zstd, Gzip | Zstd (1.5x) |
| **Images** | Sharp, libvips, pngquant, SVGO | Sharp (5x) |
| **Caching** | ccache, sccache | Both (10x) |
| **WASM** | wasm-opt, wasm-pack | wasm-opt (2x) |

### Compiler Definitions (35+)

| Category | Compilers |
|----------|-----------|
| **C/C++** | GCC, Clang/LLVM, MSVC |
| **Systems** | Rust, Go, Zig, Nim |
| **JVM** | Java, Kotlin, Scala, Groovy |
| **.NET** | .NET SDK, Mono |
| **Scripting** | Python, PyPy, Ruby, PHP, Perl |
| **Functional** | Haskell, OCaml, Erlang, Elixir |
| **Build Systems** | Make, CMake, Ninja, Meson, Bazel |
| **Containers** | Docker, Podman |
| **Mobile** | Flutter, Xcode, Android NDK |

### AI-Friendly Fluent API

```typescript
import { buildConfig } from '@buildnet/core';

const config = buildConfig()
  .target('web')
  .language('typescript')
  .optimize('speed')
  .bundler('esbuild')
  .linter('biome')
  .sourceMaps(true)
  .build();

console.log(config.estimatedPerformance.description);
// "Extremely fast (50x+ improvement)"
```

### Workflow Recommendations

```typescript
import { createUnifiedRegistry } from '@buildnet/core';

const registry = createUnifiedRegistry();
const recommendations = registry.getRecommendedForWorkflow('web-frontend');

for (const rec of recommendations) {
  console.log(`${rec.tool.name}: ${rec.reason} (${rec.priority})`);
}

// Supported workflows:
// - web-frontend, web-backend
// - mobile-native, mobile-hybrid
// - monorepo, microservices
// - wasm, data-science, embedded
```

### Quick Install Commands

**macOS (Homebrew):**
```bash
brew install esbuild brotli zstd vips pngquant
pnpm add -D @swc/core @biomejs/biome lightningcss-cli sharp
```

**Linux (apt):**
```bash
sudo apt-get install -y brotli zstd libvips-tools pngquant
pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp
```

## API Reference

### BuildController

```typescript
import { BuildController, createBackend, StateManager } from '@buildnet/core';

const backend = await autoDetectBackend(stateConfig);
const stateManager = new StateManager(backend);
const controller = new BuildController(stateManager, config, plugins, bundlers, logger);

await controller.start();

// Request a build
const buildId = await controller.requestBuild({
  task: 'frontend',
  triggeredBy: 'cli',
  priority: TaskPriority.NORMAL,
});

// Check status
const status = await controller.getBuildStatus(buildId);

// Subscribe to events
controller.onEvent((event) => {
  console.log('Event:', event.type);
});
```

### WorkerAgent

```typescript
import { WorkerAgent } from '@buildnet/core';

const worker = new WorkerAgent({
  nodeId: 'worker-1',
  controllerUrl: 'http://localhost:9901',
  capabilities: ['frontend', 'api'],
});

await worker.start();
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
