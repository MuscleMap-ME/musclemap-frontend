# BuildNet Master Plan

## Vision

BuildNet is a **high-performance native build orchestration system** built entirely in **Rust and WebAssembly** with:

### Core Architecture
- **Pure Rust native binaries** - No Node.js, Bun, or Deno dependencies
- **WebAssembly plugin system** - Language-agnostic, sandboxed extensibility
- **10-100x faster builds** via intelligent caching and distribution

### Control Plane
- Self-hosted **Leptos-based web control panel** (Rust → WASM)
- Multiple control vectors: CLI, REST API, gRPC, Web, SMS, Email, Slack, External Agents
- Multi-user concurrent access without performance degradation

### Distributed Build Engine
- **Fault-tolerant distributed orchestration** across multiple servers
- **REAPI compatibility** - Interoperable with Bazel, Buck2, Pants infrastructure
- **Action-level caching** with content-addressable storage
- **DICE-style incremental computation** for sub-second rebuilds
- **Checkpoint & recovery** for crash resilience

### Resource Management
- **BPU-normalized CPU scheduling** (performance cores vs efficiency cores)
- **Storage tier optimization** (RAM disk → NVMe → SSD → HDD → Network)
- **Latency-aware task distribution** with work stealing
- **Visual resource management** dashboards

### Reliability & Operations
- **Multi-channel notifications** (SMS, Email, Slack, Discord, Telegram, Webhooks)
- **Remote control via SMS/Email** for headless operation
- **Comprehensive audit trail** with structured logging
- **Real-time monitoring** with Prometheus/Grafana integration
- **Automated redundancy** and graceful degradation

## Current Status (Completed)

### Core Native Daemon ✅
- [x] Rust workspace with buildnet-core, buildnet-daemon, buildnet-ffi
- [x] HTTP API on port 9876 (Axum)
- [x] SQLite state persistence with WAL mode
- [x] Content-addressed artifact caching (Blake3)
- [x] xxHash3 incremental file hashing
- [x] Topological dependency resolution
- [x] Build tiers (InstantSkip → FullBuild)
- [x] PM2 integration with `interpreter: 'none'`

### Web Control Panel ✅
- [x] Self-hosted at `http://localhost:9876/`
- [x] Dark theme with glassmorphism design
- [x] Real-time status display
- [x] Build all / Build individual packages
- [x] Cache statistics and clearing
- [x] SSE event stream for live output
- [x] Embedded via rust-embed (single binary)

### Deployed to Production ✅
- [x] Running on musclemap.me VPS
- [x] 36s initial build → 5ms cached builds
- [x] 6 packages configured (shared, core, plugin-sdk, client, ui, api)

---

## Phase 1: Enhanced Web Control Panel

### 1.1 Multi-Tab Dashboard
- **Overview Tab**: System health, recent builds, quick actions
- **Packages Tab**: Visual package cards with dependency graph
- **Builds Tab**: Build history with filtering and search
- **Cache Tab**: Artifact browser, cache management
- **Config Tab**: Edit configuration, package settings
- **Logs Tab**: Real-time log viewer with filtering

### 1.2 Visual Dependency Graph
- Interactive D3.js/vis-network graph of package dependencies
- Color-coded by build status (cached, building, failed)
- Click to build individual packages
- Drag to rearrange layout
- Export as SVG/PNG

### 1.3 Drag & Drop Asset Management
- File browser for source files
- Drag files between packages
- Visual diff viewer
- File history tracking
- Quick edit inline

### 1.4 Real-time Build Output
- WebSocket upgrade from SSE for bidirectional communication
- ANSI color support in terminal output
- Scrollable log with search
- Download build logs
- Build time graphs

---

## Phase 2: Multi-Vector Control

### 2.1 CLI Interface
```bash
# Already working
buildnetd start --port 9876
buildnetd status
buildnetd build --all
buildnetd build --package api
buildnetd cache stats
buildnetd cache clear

# To add
buildnetd watch                    # Auto-rebuild on changes
buildnetd deploy                   # Trigger deployment pipeline
buildnetd template list            # List available templates
buildnetd template apply <name>    # Apply a template
```

### 2.2 REST API (Current)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web control panel |
| `/health` | GET | Health check |
| `/status` | GET | Full daemon status |
| `/build` | POST | Build all packages |
| `/build/{package}` | POST | Build specific package |
| `/builds` | GET | Build history |
| `/cache/stats` | GET | Cache statistics |
| `/cache/clear` | POST | Clear cache |
| `/config` | GET | View configuration |
| `/events` | GET | SSE event stream |

### 2.3 Node.js SDK (To Add)
```typescript
import { BuildNet } from '@buildnet/client';

const client = new BuildNet('http://localhost:9876');

// Subscribe to events
client.on('build:start', (pkg) => console.log(`Building ${pkg}`));
client.on('build:complete', (result) => console.log(result));

// Trigger builds
await client.buildAll();
await client.build('api', { force: true });

// Watch mode
client.watch(['src/**/*.ts'], async () => {
  await client.buildAll();
});
```

### 2.4 External Agent Support
- API key authentication
- Permission levels (read-only, build, admin)
- Rate limiting per agent
- Audit log per agent
- Multiple simultaneous connections

---

## Phase 3: Multi-User & Concurrency

### 3.1 Session Manager
- Unique session IDs per connection
- Session-scoped build queues
- Session timeout and cleanup
- Concurrent session limits
- Session handoff between agents

### 3.2 User Management
- User authentication (JWT)
- Role-based access control
- User-scoped configurations
- Build history per user
- Notification preferences

### 3.3 Concurrent Build Handling
- Build queue with priority levels
- Lock acquisition per package
- Parallel builds for independent packages
- Build coalescence (merge identical requests)
- Fair scheduling across users

---

## Phase 4: Templates & Hot-Swapping

### 4.1 Template System
```yaml
# templates/react-app.yaml
name: react-app
description: React TypeScript application template
packages:
  - name: "{name}"
    path: "packages/{name}"
    build_cmd: "pnpm build"
    dependencies: ["shared", "core"]
    sources: ["packages/{name}/src/**/*.tsx"]
    output_dir: "packages/{name}/dist"
hooks:
  pre_build: "pnpm lint"
  post_build: "pnpm test"
```

### 4.2 Hot-Swap Resources
- Reload configuration without restart
- Add/remove packages dynamically
- Update build commands on the fly
- Swap backends (SQLite → PostgreSQL)
- Plugin system for custom handlers

### 4.3 Resource Registry
- Register custom build tools
- Custom hash algorithms
- Custom cache backends
- Custom notification channels
- Plugin marketplace integration

---

## Phase 5: Notification System & Remote Control

> **Detailed documentation:** See [BUILDNET-NOTIFICATION-SYSTEM.md](./BUILDNET-NOTIFICATION-SYSTEM.md)

### 5.1 Event Types & Notifications

**Build Events:**
| Event | Description | Default Priority |
|-------|-------------|------------------|
| `build.started` | Build process initiated | Low |
| `build.completed` | Build finished successfully | Medium |
| `build.failed` | Build encountered errors | High |
| `build.cached` | Build skipped (cache hit) | Low |

**Resource Events:**
| Event | Description | Default Priority |
|-------|-------------|------------------|
| `resource.cpu.high` | CPU usage exceeds threshold | High |
| `resource.memory.high` | Memory usage exceeds threshold | High |
| `resource.disk.low` | Disk space below threshold | Critical |

**System Events:**
| Event | Description | Default Priority |
|-------|-------------|------------------|
| `daemon.started` | BuildNet daemon started | Medium |
| `daemon.stopped` | BuildNet daemon stopped | High |
| `node.joined` | Worker node joined cluster | Medium |
| `node.failed` | Worker node health check failed | Critical |
| `plugin.loaded` | Plugin loaded successfully | Low |

### 5.2 Notification Channels

```yaml
notifications:
  channels:
    sms:
      enabled: true
      provider: twilio
      recipients:
        - phone: "+1234567890"
          events: ["build.failed", "daemon.*", "*.critical"]

    email:
      enabled: true
      provider: smtp
      recipients:
        - email: "devops@example.com"
          format: "html"

    slack:
      enabled: true
      default_channel: "#buildnet"

    discord:
      enabled: true
      guild_id: "123456789"

    webhooks:
      - url: "https://api.example.com/events"
        events: ["*"]

    telegram:
      enabled: true
      allowed_users: ["123456789"]

    push:
      enabled: true
      provider: firebase
```

### 5.3 Remote Control via SMS/Email

**Available Commands:**
| Command | Description | Auth Level |
|---------|-------------|------------|
| `STATUS` | Get current daemon status | Read |
| `BUILD [pkg]` | Trigger build | Build |
| `CANCEL [id]` | Cancel build | Build |
| `CACHE CLEAR` | Clear build cache | Admin |
| `REPORT daily` | Generate daily report | Read |
| `NODE LIST` | List cluster nodes | Read |
| `PLUGIN LIST` | List loaded plugins | Read |
| `STOP` | Stop daemon (requires confirmation) | Admin |

**SMS Example:**
```
You: STATUS
BuildNet: 🟢 Running | Builds: 47 | Cache: 4.2MB | Nodes: 3 online
```

**Email Example:**
- Subject: `[BUILDNET] BUILD api`
- BuildNet replies with build status

### 5.4 Resource Monitoring

```yaml
monitoring:
  resources:
    cpu:
      warning: 70
      critical: 90

    memory:
      warning_percent: 70
      critical_percent: 90

    disk:
      paths:
        - path: "/var/www/musclemap.me"
          warning: 80
          critical: 95

  cluster:
    health_check_interval_secs: 30
    max_node_failures: 3
```

### 5.5 Historical Reports

**Report Types:**
- **Summary**: Quick overview of build activity
- **Detailed**: Build-by-build analysis with error details
- **Analytics**: Trend analysis with charts and insights

**Scheduled Reports:**
```yaml
reports:
  scheduled:
    - name: "Daily Summary"
      cron: "0 9 * * *"
      recipients: ["email:devops@example.com", "sms:+1234567890"]

    - name: "Weekly Report"
      cron: "0 9 * * 1"
      type: "detailed"
      recipients: ["email:team@example.com"]
```

### 5.6 Configuration Options

```yaml
notifications:
  settings:
    # Deduplication window
    dedup_window_secs: 300

    # Rate limiting
    rate_limit:
      max_per_minute: 10
      max_per_hour: 100

    # Quiet hours
    quiet_hours:
      enabled: true
      start: "22:00"
      end: "08:00"
      exceptions: ["*.critical"]

remote_control:
  authentication:
    api_keys:
      - key: "${BUILDNET_API_KEY}"
        permissions: ["*"]
    sms:
      allowed_numbers: ["+1234567890"]
      require_confirmation: true
```

---

## Phase 6: Monitoring & Observability

### 6.1 Real-time Activity Dashboard
- Active builds with progress bars
- Build queue visualization
- Resource utilization (CPU, memory, disk)
- Network traffic monitoring
- Error rate graphs

### 6.2 Audit Logging
- Every action logged with timestamp, user, details
- Searchable audit log
- Export to external systems (Elasticsearch, Loki)
- Retention policies
- Compliance reporting

### 6.3 Metrics Export
- Prometheus metrics endpoint
- Grafana dashboard templates
- OpenTelemetry integration
- Custom metric definitions
- Historical trend analysis

---

## Phase 7: Redundancy & Reliability

### 7.1 High Availability
- Primary/secondary daemon setup
- Automatic failover
- State replication
- Load balancing
- Health checks with auto-recovery

### 7.2 Backup & Recovery
- Automatic state backups
- Cache artifact backups
- Point-in-time recovery
- Cross-region replication
- Disaster recovery procedures

### 7.3 Performance Optimization
- Connection pooling
- Request batching
- Lazy loading
- Incremental updates
- Memory-mapped file access

---

## Phase 8: GitHub Integration

### 8.1 GitHub App
- Repository webhooks
- Pull request builds
- Status checks
- Commit status updates
- Release automation

### 8.2 Actions Integration
```yaml
# .github/workflows/build.yml
- name: BuildNet Build
  uses: musclemap/buildnet-action@v1
  with:
    endpoint: ${{ secrets.BUILDNET_URL }}
    api_key: ${{ secrets.BUILDNET_KEY }}
    packages: all
```

### 8.3 Deployment Pipeline
- Build → Test → Deploy workflow
- Environment promotion (dev → staging → prod)
- Rollback capabilities
- Deployment notifications
- Artifact versioning

---

## Phase 9: MuscleMap Integration

### 9.1 Dedicated Page
- `/tools/buildnet` on musclemap.me
- Documentation and tutorials
- Live demo environment
- Download links
- Community forum

### 9.2 Separate Repository
- `github.com/musclemap/buildnet`
- Standalone package on npm/cargo
- CI/CD with GitHub Actions
- Automated releases
- Community contributions

### 9.3 Documentation
- Getting started guide
- API reference
- Configuration guide
- Best practices
- Troubleshooting

---

## Phase 10: Resource Management & Distributed Builds

> **Detailed documentation:** See [BUILDNET-RESOURCE-MANAGEMENT.md](./BUILDNET-RESOURCE-MANAGEMENT.md)

### 10.1 CPU Core Management

**Performance Normalization (BPU - BuildNet Performance Units):**
- 1 BPU = Intel Core i5-10400 @ 2.9GHz single-threaded reference
- Automatic benchmarking on first run
- Per-core performance profiling (P-cores vs E-cores)
- NUMA topology awareness for memory locality

```yaml
resources:
  cpu:
    cores:
      - id: 0
        physical_id: 0
        performance_bpu: 1.45
        type: "performance"
        assigned_to: null
      - id: 1
        physical_id: 0
        performance_bpu: 0.72
        type: "efficiency"
        assigned_to: "build-queue-1"

    allocation:
      default: "all"           # Use all cores by default
      reserved_for_system: 1   # Keep 1 core for OS
      strategy: "performance"  # performance, balanced, efficiency
```

**Core Assignment:**
- Assign specific cores to build tasks
- Priority-based core allocation
- Automatic load balancing
- Core affinity for cache optimization

### 10.2 Storage Tier System

**Tier Hierarchy:**
| Tier | Type | Typical Speed | Use Case |
|------|------|---------------|----------|
| 0 | RAM Disk (tmpfs) | 10+ GB/s | Hot caches, temp files |
| 1 | NVMe SSD | 3-7 GB/s | Active builds, artifacts |
| 2 | SATA SSD | 500-550 MB/s | Warm cache, backups |
| 3 | HDD | 100-200 MB/s | Cold storage, archives |
| 4 | Network (NFS/S3) | Variable | Shared artifacts |

**Storage Configuration:**
```yaml
storage:
  tiers:
    - tier: 0
      name: "RAM Cache"
      path: "/dev/shm/buildnet"
      type: "ramdisk"
      capacity_mb: 2048
      measured_speed_mbps: 12500
      latency_us: 0.1

    - tier: 1
      name: "NVMe Primary"
      path: "/var/buildnet/cache"
      type: "nvme"
      capacity_mb: 102400
      measured_speed_mbps: 6800
      latency_us: 10

    - tier: 2
      name: "SSD Archive"
      path: "/mnt/ssd/buildnet"
      type: "ssd"
      capacity_mb: 512000
      measured_speed_mbps: 520
      latency_us: 50
```

**Automatic Tier Selection:**
- Place hot artifacts in fastest available tier
- Demote cold artifacts to slower tiers
- Size-based placement (large files to HDD)
- Access pattern analysis

### 10.3 Distributed Build Orchestration

**Cluster Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                     BuildNet Coordinator                        │
│                    (Primary Control Node)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │  Worker A   │    │  Worker B   │    │  Worker C   │        │
│   │  4 cores    │    │  8 cores    │    │  16 cores   │        │
│   │  6.2 BPU    │    │  12.8 BPU   │    │  28.4 BPU   │        │
│   │  NVMe+SSD   │    │  NVMe only  │    │  RAM+NVMe   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Distribution Strategies:**
| Strategy | Description | Best For |
|----------|-------------|----------|
| `smart` | AI-based optimal distribution | General use |
| `round_robin` | Equal distribution to all nodes | Consistent workloads |
| `least_loaded` | Send to least busy node | Variable workloads |
| `fastest` | Send to highest BPU node | Time-critical builds |
| `locality` | Keep related files together | Large monorepos |

**Task Partitioning:**
- **Package-level**: Distribute entire packages to different nodes
- **File-level**: Split large package builds across nodes
- **Hybrid**: Packages distributed, hot files cached locally

### 10.4 Network Topology & Latency

**Latency Measurement:**
```yaml
network:
  topology:
    coordinator:
      address: "10.0.1.1:9876"
      location: "us-east-1"

    workers:
      - name: "worker-a"
        address: "10.0.1.10:9877"
        location: "us-east-1"
        latency_to_coordinator_ms: 0.5
        bandwidth_mbps: 10000

      - name: "worker-b"
        address: "10.0.2.10:9877"
        location: "us-west-2"
        latency_to_coordinator_ms: 45
        bandwidth_mbps: 1000
```

**Latency-Aware Scheduling:**
- Measure real-time latency between all nodes
- Route latency-sensitive tasks to nearby nodes
- Batch large transfers during low-activity periods
- Predict transfer times for scheduling

### 10.5 Configuration Profiles

**Speed Priority:**
```yaml
profiles:
  speed:
    name: "Maximum Speed"
    description: "Minimize build time at any cost"
    cpu_strategy: "all_cores"
    storage_preference: "fastest"
    distribution: "fastest"
    network_preference: "lowest_latency"
    cache_policy: "aggressive"
```

**Bandwidth Saver:**
```yaml
profiles:
  bandwidth_saver:
    name: "Bandwidth Saver"
    description: "Minimize network transfer"
    cpu_strategy: "local_only"
    storage_preference: "local"
    distribution: "locality"
    network_preference: "minimize_transfer"
    cache_policy: "aggressive_local"
```

**Cost Optimized:**
```yaml
profiles:
  cost_optimized:
    name: "Cost Optimized"
    description: "Use cheapest resources"
    cpu_strategy: "efficiency_cores"
    storage_preference: "cheapest"
    distribution: "least_loaded"
    network_preference: "batch_transfers"
    cache_policy: "minimal"
```

### 10.6 Visual Management Interfaces

**Web UI Tabs:**

1. **Overview Dashboard**
   - Real-time cluster status
   - Active builds progress
   - Resource utilization gauges
   - Quick action buttons

2. **Nodes Tab**
   - Visual node cards with specs
   - Per-node CPU/RAM/disk meters
   - Drag-to-assign tasks
   - Node health indicators

3. **Storage Tab**
   - Tier comparison chart
   - Capacity/usage breakdown
   - Speed benchmark results
   - File browser per tier

4. **Topology Tab**
   - Interactive network graph
   - Latency heatmap
   - Bandwidth flow visualization
   - Connection status indicators

5. **Queue Tab**
   - Build queue management
   - Drag-to-reorder
   - Priority adjustment
   - Resource allocation per build

**CLI Interface:**
```bash
# Resource discovery
buildnetd resources list
buildnetd resources benchmark

# CPU management
buildnetd cpu cores
buildnetd cpu assign --core 0 --task build-123
buildnetd cpu profile

# Storage management
buildnetd storage tiers
buildnetd storage benchmark
buildnetd storage optimize

# Cluster management
buildnetd cluster status
buildnetd cluster nodes
buildnetd cluster add-worker <address>
buildnetd cluster remove-worker <name>

# Distribution
buildnetd distribute --strategy smart
buildnetd queue list
buildnetd queue add --package api --priority high

# Profiles
buildnetd profile list
buildnetd profile use speed
buildnetd profile create custom.yaml
```

### 10.7 Build Queue System

**Queue Configuration:**
```yaml
queue:
  max_concurrent: 4
  priority_levels:
    - name: "critical"
      weight: 100
      max_wait_secs: 10
    - name: "high"
      weight: 50
      max_wait_secs: 60
    - name: "normal"
      weight: 10
      max_wait_secs: 300
    - name: "low"
      weight: 1
      max_wait_secs: 3600

  scheduling:
    algorithm: "weighted_fair"
    preemption: true
    starvation_prevention: true
```

**Queue Management:**
- Add builds with priority
- Reorder queue visually
- Cancel/pause builds
- Resource reservation
- ETA calculation

---

## Phase 11: Advanced Distributed Build Orchestration

> **Detailed documentation:** See [BUILDNET-DISTRIBUTED-ALGORITHM.md](./BUILDNET-DISTRIBUTED-ALGORITHM.md)

### 11.1 Core Distributed Algorithm

**Build Graph Decomposition:**
- Parse package dependencies into directed acyclic graph (DAG)
- Compute topological order for dependency-aware scheduling
- Identify critical path for optimization focus
- Break packages into file-level chunks for parallel execution

**Intelligent Work Distribution:**
```rust
// Scoring algorithm for worker selection
WorkerScore = (
    performance_score * 0.4 +    // BPU-based performance rating
    locality_score * 0.3 +       // Cache hits for required files
    latency_score * 0.2 +        // Network proximity to coordinator
    availability_score * 0.1     // Current load and queue depth
)
```

### 11.2 Fault Tolerance & Recovery

**Graceful Degradation:**
| Worker Failures | System Response |
|-----------------|-----------------|
| 1 worker | Redistribute tasks, continue |
| 50% workers | Switch to conservative mode |
| All workers | Fall back to local execution |

**Checkpoint & Recovery:**
- Periodic state snapshots (every 30 seconds)
- Write-ahead logging for crash recovery
- Automatic retry with exponential backoff
- Dead letter queue for failed tasks

### 11.3 Concurrency & Locking

**Distributed Lock Manager:**
- Raft-based consensus for lock coordination
- Fencing tokens to prevent stale operations
- Hierarchical locking (project → package → file)
- Lock timeout with automatic release

**Multi-Agent Coordination:**
- Support for concurrent users, CI/CD pipelines, AI agents
- Build request merging for identical requests
- Priority-based queue management
- Fair scheduling across agent types

### 11.4 Real-Time Communication

**Bidirectional Streaming:**
- gRPC streams for worker ↔ coordinator communication
- WebSocket for client ↔ daemon interaction
- Server-Sent Events for web UI updates
- Heartbeat monitoring with configurable intervals

**Event Types:**
| Event | Direction | Purpose |
|-------|-----------|---------|
| `TaskAssignment` | Coord → Worker | Assign new build task |
| `TaskProgress` | Worker → Coord | Progress updates (0-100%) |
| `TaskComplete` | Worker → Coord | Task finished with result |
| `WorkerStatus` | Worker → Coord | Periodic health report |
| `BuildEvent` | Daemon → Client | Real-time build updates |

### 11.5 Audit Trail & Monitoring

**Comprehensive Logging:**
- Every action logged with timestamp, actor, details
- Structured JSON logs for machine parsing
- Configurable retention policies
- Export to external systems (Elasticsearch, Loki)

**Real-Time Dashboards:**
- Build progress visualization
- Worker utilization graphs
- Network topology map
- Error rate monitoring

### 11.6 Intelligent Defaults & Templates

**Auto-Configuration:**
- Detect CPU topology and storage tiers on startup
- Benchmark new workers automatically
- Suggest optimal configuration based on workload
- Self-tuning scheduler parameters

**Configuration Templates:**
```yaml
templates:
  monorepo-large:
    distribution: "smart"
    chunk_strategy: "file-level"
    parallel_builds: 8

  ci-pipeline:
    distribution: "fastest"
    priority: "high"
    timeout_mins: 30
```

---

## Phase 12: REAPI Compatibility & Enterprise Features

> **Reference:** See [BUILDNET-COMPETITOR-ANALYSIS.md](./BUILDNET-COMPETITOR-ANALYSIS.md)

### 12.1 Remote Execution API (REAPI)

Implement Bazel-compatible Remote Execution API for interoperability:

**gRPC Services:**
- `Execution` - Execute build actions remotely
- `ActionCache` - Cache action results
- `ContentAddressableStorage` - Store/retrieve blobs by hash

**Benefits:**
- Compatible with existing Bazel/Buck2 infrastructure
- Industry-standard protocol
- Enterprise adoption enabler

### 12.2 Action-Level Caching

Move from package-level to action-level caching:
- 10x better cache hit rates
- Fine-grained dependency tracking
- Incremental computation (DICE-style)

### 12.3 Hermetic Builds

Ensure reproducible builds:
- Sandbox execution environment
- Container-based isolation (optional)
- Input/output verification
- Deterministic timestamps

### 12.4 Test Distribution

Distribute test execution across workers:
- Historical timing data for balancing
- Bin-packing algorithm for even distribution
- Parallel test execution
- Result aggregation

### 12.5 Build Scans & Analytics

Rich build analytics:
- Build timeline visualization
- Performance profiling
- Failure pattern detection
- Flaky test identification

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           BuildNet Control Plane                               │
├───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬───────┤
│  Web UI   │   CLI   │   API   │   SDK   │   SMS   │  Email  │  Slack  │ Agents│
│  (React)  │ (Clap)  │ (Axum)  │  (TS)   │(Twilio) │ (SMTP)  │  (Bot)  │ (JWT) │
└─────┬─────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴───┬───┘
      │          │         │         │         │         │         │        │
      └──────────┴─────────┴─────────┴─────────┴─────────┴─────────┴────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │         BuildNet Daemon           │
                        │         (Rust Native)             │
                        ├───────────────────────────────────┤
                        │                                   │
                        │  ┌─────────────────────────────┐  │
                        │  │      Build Orchestrator      │  │
                        │  └──────────────┬──────────────┘  │
                        │                 │                 │
                        │  ┌──────────────┼──────────────┐  │
                        │  │              │              │  │
                        │  ▼              ▼              ▼  │
                        │ State      Artifact     Notification │
                        │ Manager      Cache        Router   │
                        │ (SQLite)   (Blake3)    (Channels) │
                        └───────────────────────────────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           │                              │                              │
           ▼                              ▼                              ▼
    ┌────────────┐                 ┌────────────┐                 ┌────────────┐
    │  Packages  │                 │  Cluster   │                 │  Reports   │
    │ shared,api │                 │   Nodes    │                 │  Storage   │
    └────────────┘                 └────────────┘                 └────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                          Notification Flow                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Build Event ──► Event Bus ──► Notification Router ──┬──► SMS (Twilio)      │
│                        │              │               ├──► Email (SMTP)      │
│                        │              │               ├──► Slack             │
│                        │              │               ├──► Discord           │
│                        │              │               ├──► Telegram          │
│                        ▼              ▼               ├──► Push (FCM)        │
│                   Event Log    Rate Limiter           └──► Webhooks          │
│                   (SQLite)     Deduplication                                 │
│                               Quiet Hours                                    │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                          Remote Control Flow                                   │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   SMS "BUILD api" ──► Inbound Webhook ──► Command Parser ──► Auth Check      │
│                                                │                              │
│   Email [BUILDNET] ──► IMAP Polling ──────────┤                              │
│                                                │                              │
│   Slack /buildnet ──► Events Webhook ─────────┴──► Execute ──► Response      │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                     Resource Management Architecture                           │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                    Resource Discovery Engine                          │    │
│  │  CPU Profiler ──► Core Topology ──► BPU Benchmark ──► Assignment     │    │
│  │  (sysinfo)       (NUMA aware)      (normalized)      (per-task)      │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                         │                                     │
│  ┌──────────────────────────────────────┴────────────────────────────────┐   │
│  │                         Storage Tier Manager                           │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   ┌─────────┐  │   │
│  │  │ Tier 0      │    │ Tier 1      │    │ Tier 2      │   │ Tier 3  │  │   │
│  │  │ RAM Disk    │◄──►│ NVMe SSD    │◄──►│ SATA SSD    │◄─►│ HDD     │  │   │
│  │  │ 10+ GB/s    │    │ 3-7 GB/s    │    │ 500 MB/s    │   │ 150MB/s │  │   │
│  │  │ Hot Cache   │    │ Build Files │    │ Warm Cache  │   │ Archive │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘   └─────────┘  │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                      Distributed Build Cluster                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌───────────────────────────────────────────────────────────────────────┐  │
│   │                        Cluster Coordinator                             │  │
│   │  Task Scheduler │ Load Balancer │ Latency Monitor │ Fault Handler     │  │
│   └───────────────────────────────────────────────────────────────────────┘  │
│                                         │                                     │
│        ┌────────────────────────────────┼────────────────────────────────┐   │
│        │                                │                                │   │
│        ▼                                ▼                                ▼   │
│   ┌─────────┐                     ┌─────────┐                     ┌─────────┐│
│   │Worker A │◄────── 0.5ms ──────►│ Coord.  │◄────── 45ms ──────►│Worker B ││
│   │ 4 cores │                     │         │                     │ 8 cores ││
│   │ 6.2 BPU │                     │         │                     │12.8 BPU ││
│   │NVMe+SSD │                     │         │                     │NVMe     ││
│   └─────────┘                     └─────────┘                     └─────────┘│
│        │                                                               │      │
│        └───────────────────── 50ms latency ────────────────────────────┘      │
│                                                                               │
│   Distribution: smart │ round_robin │ fastest │ locality                      │
│   Partitioning: package │ file │ hybrid                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Immediate (This Week)
1. Deploy web control panel to production ✅
2. Add WebSocket for real-time output
3. Add package dependency graph visualization
4. Add build history with search/filter

### Short-term (This Month)
5. Drag & drop file browser
6. Multi-tab dashboard layout
7. CLI enhancements (watch mode)
8. Node.js SDK with TypeScript types
9. **Webhook notification channel**
10. **Basic email notifications (SMTP)**

### Medium-term (Next Quarter)
11. User authentication
12. External agent support
13. Template system
14. **SMS notifications (Twilio)**
15. **Remote control via SMS**
16. **Resource monitoring alerts**
17. **Historical reports (summary)**

### Long-term (Future)
18. GitHub App integration
19. High availability setup
20. **Slack/Discord bot integration**
21. **Advanced analytics reports**
22. **Cluster node monitoring**
23. **Plugin lifecycle notifications**
24. Separate repository
25. npm/cargo package publishing
26. Community plugins
27. **CPU core discovery & BPU benchmarking**
28. **Storage tier management (RAM/NVMe/SSD/HDD)**
29. **Distributed build orchestration**
30. **Cluster coordinator & worker nodes**
31. **Latency-aware task scheduling**
32. **Visual resource management UI**
33. **Build queue with priority levels**
34. **Configuration profiles (speed/bandwidth/cost)**

### Enterprise Features (Phase 11-12)
35. **Build graph decomposition & DAG analysis**
36. **Intelligent work distribution with scoring algorithm**
37. **Checkpoint & recovery system**
38. **Distributed lock manager (Raft-based)**
39. **Multi-agent coordination (users, CI/CD, AI)**
40. **Bidirectional gRPC streaming**
41. **Comprehensive audit trail**
42. **REAPI compatibility (Bazel/Buck2 interop)**
43. **Action-level caching (10x hit rates)**
44. **Hermetic/sandboxed builds**
45. **Test distribution across workers**
46. **Build scans & analytics dashboard**
47. **WASM plugin ecosystem**
48. **Leptos-based web UI (pure Rust)**

---

## Files Reference

```
packages/buildnet-native/
├── Cargo.toml                          # Workspace manifest
├── buildnet-core/                      # Core library
│   └── src/
│       ├── lib.rs                      # Library entry
│       ├── state.rs                    # SQLite state
│       ├── cache.rs                    # Artifact cache
│       ├── hasher.rs                   # xxHash3 + Blake3
│       ├── builder.rs                  # Build orchestration
│       ├── config.rs                   # Configuration
│       ├── notifications/              # Notification system
│       │   ├── mod.rs                  # Notification router
│       │   ├── channels/               # Channel implementations
│       │   │   ├── sms.rs              # Twilio SMS
│       │   │   ├── email.rs            # SMTP/SendGrid
│       │   │   ├── slack.rs            # Slack integration
│       │   │   ├── discord.rs          # Discord integration
│       │   │   ├── webhook.rs          # Generic webhooks
│       │   │   └── push.rs             # Firebase push
│       │   ├── commands.rs             # Remote command handler
│       │   └── reports.rs              # Report generator
│       ├── monitoring/                 # Resource monitoring
│       │   ├── mod.rs                  # Monitor coordinator
│       │   ├── system.rs               # CPU/memory/disk
│       │   └── cluster.rs              # Node health
│       ├── resources/                  # Resource management
│       │   ├── mod.rs                  # Resource manager entry
│       │   ├── cpu.rs                  # CPU discovery, BPU benchmarking
│       │   ├── storage.rs              # Storage tiers, benchmarking
│       │   ├── network.rs              # Latency measurement, topology
│       │   ├── cluster.rs              # Distributed coordination
│       │   ├── scheduler.rs            # Task distribution strategies
│       │   └── queue.rs                # Priority build queue
│       └── distributed/                # Distributed build algorithm (NEW)
│           ├── mod.rs                  # Module entry
│           ├── graph.rs                # Build graph & DAG analysis
│           ├── decomposer.rs           # Stage/chunk decomposition
│           ├── distributor.rs          # Intelligent work distribution
│           ├── scoring.rs              # Worker scoring algorithm
│           ├── assembler.rs            # Assembly & reassembly protocol
│           ├── fault_tolerance.rs      # Graceful degradation
│           ├── checkpoint.rs           # Checkpoint & recovery
│           ├── locks.rs                # Distributed lock manager
│           ├── agents.rs               # Multi-agent coordination
│           ├── communication.rs        # Bidirectional streaming
│           └── audit.rs                # Audit trail & monitoring
├── buildnet-daemon/                    # HTTP daemon
│   ├── src/
│   │   ├── main.rs                     # CLI entry
│   │   ├── api.rs                      # Axum HTTP routes
│   │   ├── grpc.rs                     # gRPC services (NEW)
│   │   ├── reapi.rs                    # REAPI compatibility (NEW)
│   │   ├── cli.rs                      # Clap commands
│   │   └── webhooks.rs                 # Inbound webhooks
│   └── static/
│       └── index.html                  # Web control panel
├── buildnet-worker/                    # Distributed worker (NEW)
│   └── src/
│       ├── main.rs                     # Worker entry point
│       ├── executor.rs                 # Task execution
│       ├── sandbox.rs                  # Hermetic execution
│       └── heartbeat.rs                # Health reporting
├── buildnet-ui/                        # Leptos WASM UI (NEW)
│   └── src/
│       ├── lib.rs                      # UI component library
│       ├── dashboard.rs                # Main dashboard
│       ├── topology.rs                 # Network topology view
│       └── builds.rs                   # Build progress views
└── buildnet-ffi/                       # FFI bindings
    └── src/lib.rs                      # C ABI + napi-rs + PyO3

.buildnet/
├── config.json                         # Package configuration
├── notifications.yaml                  # Notification config (NEW)
├── resources.yaml                      # Resource management config (NEW)
├── profiles/                           # Configuration profiles (NEW)
│   ├── speed.yaml                      # Maximum speed profile
│   ├── bandwidth_saver.yaml            # Minimize network transfer
│   └── cost_optimized.yaml             # Use cheapest resources
├── state.db                            # SQLite state database
├── resources.db                        # Resource state (NEW)
├── events.db                           # Event/command log (NEW)
├── cache/                              # Artifact cache directory
├── reports/                            # Generated reports (NEW)
└── benchmarks/                         # Benchmark results (NEW)
    ├── cpu_cores.json                  # Per-core BPU measurements
    └── storage_tiers.json              # Storage speed benchmarks
```

## Documentation

- [BuildNet Master Plan](./BUILDNET-MASTER-PLAN.md) - This document
- [BuildNet Notification System](./BUILDNET-NOTIFICATION-SYSTEM.md) - Detailed notification docs
- [BuildNet Resource Management](./BUILDNET-RESOURCE-MANAGEMENT.md) - Distributed builds & resources
- [BuildNet Distributed Algorithm](./BUILDNET-DISTRIBUTED-ALGORITHM.md) - Fault-tolerant distributed build orchestration
- [BuildNet Competitor Analysis](./BUILDNET-COMPETITOR-ANALYSIS.md) - Competitor research & feature gaps
- [BuildNet API Reference](./BUILDNET-API.md) - REST/WebSocket API
- [BuildNet Configuration](./BUILDNET-CONFIG.md) - Configuration options

---

## Quick Start

```bash
# Start BuildNet daemon
pnpm buildnet:start

# Open web control panel
open http://localhost:9876

# Or use CLI
ssh -p 2222 root@musclemap.me "curl -s http://localhost:9876/status | jq ."

# Trigger a build
ssh -p 2222 root@musclemap.me "curl -s -X POST http://localhost:9876/build -d '{}' -H 'Content-Type: application/json' | jq ."
```
