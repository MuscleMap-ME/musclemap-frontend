# BuildNet Resource Management & Distributed Build System

## Overview

BuildNet provides a comprehensive resource management system for distributed builds across multiple machines, CPU cores, storage devices, and network topologies. This document covers resource discovery, benchmarking, allocation, visualization, and distributed build orchestration.

---

## Table of Contents

1. [Resource Types](#resource-types)
2. [Resource Discovery & Registration](#resource-discovery--registration)
3. [Benchmarking & Performance Units](#benchmarking--performance-units)
4. [Storage Tiers & Directory Management](#storage-tiers--directory-management)
5. [CPU Core Management](#cpu-core-management)
6. [Distributed Build Orchestration](#distributed-build-orchestration)
7. [Network Topology & Latency](#network-topology--latency)
8. [Resource Visualization UI](#resource-visualization-ui)
9. [Build Queue & Job Scheduling](#build-queue--job-scheduling)
10. [Configuration Profiles](#configuration-profiles)
11. [CLI Interface](#cli-interface)
12. [API Reference](#api-reference)
13. [Implementation Phases](#implementation-phases)

---

## Resource Types

### 1. Compute Resources

| Resource | Description | Metrics |
|----------|-------------|---------|
| **CPU Cores** | Physical/virtual processor cores | Speed (GHz), architecture, cache size |
| **RAM** | System memory | Capacity (GB), speed (MHz), type (DDR4/DDR5) |
| **GPU** | Graphics processors (optional) | CUDA cores, VRAM, compute capability |

### 2. Storage Resources

| Resource | Description | Metrics |
|----------|-------------|---------|
| **NVMe SSD** | Fast solid-state storage | IOPS, throughput (MB/s), latency (μs) |
| **SATA SSD** | Standard solid-state storage | IOPS, throughput, latency |
| **HDD** | Mechanical hard drives | IOPS, throughput, latency |
| **RAM Disk** | In-memory filesystem (tmpfs) | Throughput, capacity |
| **Network Storage** | NFS, SMB, iSCSI mounts | Latency, bandwidth |

### 3. Network Resources

| Resource | Description | Metrics |
|----------|-------------|---------|
| **Local** | Same machine | ~0ms latency |
| **LAN** | Local network | 0.1-1ms latency |
| **WAN** | Wide area network | 10-100ms latency |
| **Cloud** | Cloud provider network | Variable latency |

---

## Resource Discovery & Registration

### Automatic Discovery

BuildNet automatically discovers available resources on startup:

```rust
// Resource discovery on daemon startup
pub struct ResourceDiscovery {
    /// Discovered CPU cores with topology
    cpus: Vec<CpuCore>,
    /// Discovered storage mounts
    storage: Vec<StorageMount>,
    /// Available RAM
    memory: MemoryInfo,
    /// Network interfaces
    network: Vec<NetworkInterface>,
}
```

### Manual Registration

Register remote build nodes and storage locations:

```yaml
# .buildnet/resources.yaml
resources:
  # Local resources (auto-discovered, but can override)
  local:
    cpus:
      enabled: true
      max_cores: 8  # Limit to 8 cores (leave some for OS)
    storage:
      - path: "/var/www/musclemap.me/.buildnet/workspace"
        type: nvme
        priority: 1
      - path: "/tmp/buildnet-fast"
        type: ramdisk
        priority: 0  # Highest priority (fastest)
        max_size_gb: 4

  # Remote build nodes
  nodes:
    - name: "build-server-1"
      host: "192.168.1.100"
      port: 9876
      auth:
        type: api_key
        key: "${BUILD_SERVER_1_KEY}"
      resources:
        cpus: 16
        ram_gb: 64
        storage:
          - path: "/fast/builds"
            type: nvme

    - name: "build-server-2"
      host: "build2.example.com"
      port: 9876
      auth:
        type: mtls
        cert: "/etc/buildnet/certs/client.pem"
      resources:
        cpus: 32
        ram_gb: 128

  # Cloud build nodes (auto-scaling)
  cloud:
    provider: aws
    region: us-east-1
    instance_type: c5.4xlarge
    min_nodes: 0
    max_nodes: 10
    scale_up_threshold: 5  # Queue depth
    scale_down_idle_mins: 15
```

### Node Registration API

```bash
# Register a new build node
curl -X POST http://localhost:9876/api/resources/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "build-server-3",
    "host": "192.168.1.101",
    "port": 9876,
    "api_key": "secret-key"
  }'

# List all registered nodes
curl http://localhost:9876/api/resources/nodes

# Get node details
curl http://localhost:9876/api/resources/nodes/build-server-1
```

---

## Benchmarking & Performance Units

### BuildNet Performance Units (BPU)

To normalize performance across heterogeneous hardware, BuildNet uses **BuildNet Performance Units (BPU)**:

```
1 BPU = Performance of a single Intel Core i5-10400 core at 2.9GHz
        compiling a standard TypeScript benchmark
```

### Automatic Benchmarking

On first connection, each resource is benchmarked:

```yaml
benchmarks:
  # CPU benchmark results
  cpu:
    single_core_bpu: 1.45      # 45% faster than baseline
    multi_core_bpu: 11.2       # 8 cores * 1.4 efficiency
    memory_bandwidth_gbps: 42

  # Storage benchmark results
  storage:
    - path: "/tmp/buildnet-fast"
      type: ramdisk
      read_mbps: 12000
      write_mbps: 10000
      iops_4k: 500000
      latency_us: 1
      score: 1000  # Normalized 0-1000

    - path: "/var/www/musclemap.me"
      type: nvme
      read_mbps: 3500
      write_mbps: 3000
      iops_4k: 500000
      latency_us: 50
      score: 850

    - path: "/mnt/hdd"
      type: hdd
      read_mbps: 150
      write_mbps: 140
      iops_4k: 200
      latency_us: 8000
      score: 150

  # Network benchmark results
  network:
    - target: "build-server-1"
      latency_ms: 0.5
      bandwidth_mbps: 10000
      score: 950

    - target: "cloud-builder-1"
      latency_ms: 25
      bandwidth_mbps: 1000
      score: 600
```

### Benchmark Commands

```bash
# Run full benchmark suite
buildnetd benchmark --all

# Benchmark specific resource
buildnetd benchmark --storage /path/to/dir
buildnetd benchmark --cpu
buildnetd benchmark --network build-server-1

# View benchmark results
buildnetd benchmark --results

# Export as JSON
buildnetd benchmark --results --format json > benchmarks.json
```

### Re-Benchmarking Schedule

```yaml
benchmarks:
  schedule:
    # Re-benchmark storage weekly
    storage: "0 3 * * 0"  # Sunday 3 AM
    # Re-benchmark CPU monthly
    cpu: "0 3 1 * *"      # 1st of month 3 AM
    # Re-benchmark network daily
    network: "0 * * * *"  # Every hour
```

---

## Storage Tiers & Directory Management

### Storage Tier Hierarchy

```
Tier 0: RAM Disk (tmpfs/ramfs)
        - Latency: ~1μs
        - Speed: 10-20 GB/s
        - Use: Hot build artifacts, temporary files
        - Persistence: None (lost on reboot)

Tier 1: NVMe SSD
        - Latency: ~50μs
        - Speed: 3-7 GB/s
        - Use: Active workspace, source code
        - Persistence: Full

Tier 2: SATA SSD
        - Latency: ~100μs
        - Speed: 500-600 MB/s
        - Use: Build cache, artifacts
        - Persistence: Full

Tier 3: HDD
        - Latency: ~8ms
        - Speed: 100-200 MB/s
        - Use: Archive, cold storage
        - Persistence: Full

Tier 4: Network Storage
        - Latency: Variable (1-100ms)
        - Speed: Variable
        - Use: Shared artifacts, distributed cache
        - Persistence: Full
```

### Directory Configuration

```yaml
storage:
  directories:
    # Fast workspace for active builds
    - name: "fast-workspace"
      path: "/tmp/buildnet-workspace"
      tier: 0
      type: ramdisk
      max_size_gb: 8
      auto_create: true
      cleanup_policy: "on_build_complete"

    # Primary workspace
    - name: "workspace"
      path: "/var/www/musclemap.me/.buildnet/workspace"
      tier: 1
      type: nvme
      max_size_gb: 50
      auto_create: true

    # Build cache
    - name: "cache"
      path: "/var/www/musclemap.me/.buildnet/cache"
      tier: 1
      type: nvme
      max_size_gb: 20

    # Artifact archive
    - name: "archive"
      path: "/mnt/storage/buildnet-archive"
      tier: 3
      type: hdd
      max_size_gb: 500
      retention_days: 90

  # Automatic tiering policies
  tiering:
    # Move hot artifacts to fast storage
    hot_threshold_accesses: 10
    hot_threshold_hours: 1

    # Move cold artifacts to archive
    cold_threshold_hours: 168  # 7 days

    # Auto-migrate between tiers
    auto_migrate: true
```

### Directory Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Storage Directory Overview                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tier 0: RAM Disk                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ /tmp/buildnet-fast                                       │    │
│  │ ████████████░░░░░░░░░░░░░░░░░░░░  3.2/8 GB (40%)        │    │
│  │ Speed: 12,000 MB/s read | 10,000 MB/s write              │    │
│  │ Score: 1000 BPU                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Tier 1: NVMe SSD                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ /var/www/musclemap.me/.buildnet/workspace               │    │
│  │ ████████████████████░░░░░░░░░░░░  22/50 GB (44%)        │    │
│  │ Speed: 3,500 MB/s read | 3,000 MB/s write                │    │
│  │ Score: 850 BPU                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ /var/www/musclemap.me/.buildnet/cache                   │    │
│  │ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  4.5/20 GB (23%)       │    │
│  │ Speed: 3,500 MB/s read | 3,000 MB/s write                │    │
│  │ Score: 850 BPU                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Tier 3: HDD                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ /mnt/storage/buildnet-archive                            │    │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░  85/500 GB (17%)       │    │
│  │ Speed: 150 MB/s read | 140 MB/s write                    │    │
│  │ Score: 150 BPU                                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## CPU Core Management

### Core Discovery & Topology

```yaml
# Auto-discovered CPU topology
cpu:
  physical_cpus: 1
  cores_per_cpu: 8
  threads_per_core: 2
  total_threads: 16

  topology:
    - cpu_id: 0
      cores:
        - core_id: 0
          threads: [0, 8]
          frequency_mhz: 3600
          cache_l1_kb: 64
          cache_l2_kb: 512
          cache_l3_mb: 16
          bpu_score: 1.45

        - core_id: 1
          threads: [1, 9]
          frequency_mhz: 3600
          bpu_score: 1.42
        # ... more cores
```

### Core Allocation Strategies

```yaml
cpu:
  allocation:
    # Default: Use all available cores
    strategy: "all"

    # Alternative strategies:
    # strategy: "fixed"      # Use exactly N cores
    # strategy: "percentage" # Use N% of cores
    # strategy: "reserved"   # Leave N cores for OS

    # Fixed allocation
    fixed_cores: 6

    # Percentage allocation
    percentage: 75

    # Reserved cores (for OS/other processes)
    reserved_cores: 2

    # NUMA-aware allocation
    numa_aware: true
    prefer_same_numa: true

    # Hyperthreading
    use_hyperthreads: true
    prefer_physical_cores: true

    # Core affinity (pin builds to specific cores)
    affinity:
      enabled: true
      # Pin TypeScript builds to performance cores
      typescript:
        cores: [0, 1, 2, 3]
      # Pin Rust builds to all cores
      rust:
        cores: "all"
```

### Core Performance Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                     CPU Core Performance                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Core 0 (P-Core)  ████████████████░░░░  82%  3.6 GHz  1.45 BPU  │
│  Core 1 (P-Core)  ██████████████░░░░░░  71%  3.5 GHz  1.42 BPU  │
│  Core 2 (P-Core)  ████████████████████  99%  3.6 GHz  1.44 BPU  │
│  Core 3 (P-Core)  ████████░░░░░░░░░░░░  42%  3.2 GHz  1.38 BPU  │
│  Core 4 (E-Core)  ██████████████████░░  89%  2.8 GHz  0.95 BPU  │
│  Core 5 (E-Core)  ██████████░░░░░░░░░░  52%  2.8 GHz  0.94 BPU  │
│  Core 6 (E-Core)  ████░░░░░░░░░░░░░░░░  22%  2.4 GHz  0.82 BPU  │
│  Core 7 (E-Core)  ░░░░░░░░░░░░░░░░░░░░   0%  idle    0.80 BPU  │
│                                                                   │
│  Total Compute: 8.80 BPU available | 5.62 BPU in use (64%)       │
│                                                                   │
│  ┌─ Legend ─────────────────────────────────────────────────┐   │
│  │ P-Core = Performance Core   E-Core = Efficiency Core     │   │
│  │ BPU = BuildNet Performance Unit (normalized score)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Distributed Build Orchestration

### Build Distribution Strategies

```yaml
distribution:
  # Strategy for distributing build tasks
  strategy: "smart"  # smart | round_robin | least_loaded | fastest | locality

  strategies:
    smart:
      # Weighted factors (must sum to 1.0)
      weights:
        speed: 0.4        # Prefer faster nodes
        locality: 0.3     # Prefer nodes with cached data
        load: 0.2         # Prefer less loaded nodes
        cost: 0.1         # Prefer cheaper nodes (cloud)

    round_robin:
      # Simple round-robin distribution
      skip_unhealthy: true

    least_loaded:
      # Send to node with lowest current load
      load_metric: "cpu"  # cpu | queue_depth | memory

    fastest:
      # Always use fastest available node
      metric: "bpu_score"

    locality:
      # Prefer nodes with source/cache data
      cache_weight: 0.7
      source_weight: 0.3

  # Fallback behavior
  fallback:
    # If preferred node unavailable
    strategy: "least_loaded"
    # Maximum wait time for preferred node
    max_wait_secs: 30
```

### Task Partitioning

```yaml
partitioning:
  # How to split large builds
  strategy: "package"  # package | file | hybrid

  package:
    # Build independent packages in parallel
    parallel_packages: true
    # Maximum parallel package builds
    max_parallel: 4

  file:
    # Split large packages by file count
    min_files_to_split: 100
    files_per_chunk: 50

  hybrid:
    # Package-level parallelism + file splitting for large packages
    large_package_threshold: 200
```

### Build Distribution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Distributed Build Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Build Request                                                   │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────────┐                                                │
│   │   Scheduler │ ◄── Analyzes dependencies, creates task graph  │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐                                                │
│   │ Task Queue  │ ◄── Prioritized queue of build tasks           │
│   └──────┬──────┘                                                │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │ Distributor │ ──► │ Node Scorer │ ──► │ Assignment  │       │
│   └─────────────┘     └─────────────┘     └──────┬──────┘       │
│                                                   │               │
│          ┌───────────────────┬───────────────────┼───────────┐   │
│          │                   │                   │           │   │
│          ▼                   ▼                   ▼           ▼   │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐  ┌─────┐ │
│   │   Local    │     │  Server 1  │     │  Server 2  │  │Cloud│ │
│   │  8 cores   │     │  16 cores  │     │  32 cores  │  │ ... │ │
│   │  1.2 BPU   │     │  2.4 BPU   │     │  4.8 BPU   │  │     │ │
│   └─────┬──────┘     └─────┬──────┘     └─────┬──────┘  └──┬──┘ │
│         │                  │                  │            │     │
│         └──────────────────┴──────────────────┴────────────┘     │
│                              │                                    │
│                              ▼                                    │
│                       ┌─────────────┐                            │
│                       │  Collector  │ ◄── Aggregates results     │
│                       └──────┬──────┘                            │
│                              │                                    │
│                              ▼                                    │
│                       Build Complete                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Network Topology & Latency

### Latency Measurement

```yaml
network:
  # Continuous latency monitoring
  monitoring:
    enabled: true
    interval_secs: 60
    timeout_ms: 5000

  # Latency thresholds for node selection
  thresholds:
    local: 1        # < 1ms = local
    lan: 10         # < 10ms = LAN
    wan: 100        # < 100ms = WAN
    cloud: 500      # < 500ms = Cloud

  # Bandwidth requirements
  bandwidth:
    min_mbps: 100   # Minimum bandwidth for node inclusion
    preferred_mbps: 1000
```

### Network Topology Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                    Network Topology View                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                      ┌─────────────┐                             │
│                      │   Primary   │                             │
│                      │   (Local)   │                             │
│                      │   0ms       │                             │
│                      └──────┬──────┘                             │
│                             │                                     │
│              ┌──────────────┼──────────────┐                     │
│              │              │              │                     │
│              ▼              ▼              ▼                     │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│       │ Server 1 │   │ Server 2 │   │   NAS    │               │
│       │  0.5ms   │   │  0.8ms   │   │  2.1ms   │               │
│       │ 10 Gbps  │   │ 10 Gbps  │   │  1 Gbps  │               │
│       │ ●●●●●○   │   │ ●●●●○○   │   │ ●●○○○○   │               │
│       └──────────┘   └──────────┘   └──────────┘               │
│                             │                                     │
│                      ┌──────┴──────┐                             │
│                      │   Internet  │                             │
│                      └──────┬──────┘                             │
│                             │                                     │
│              ┌──────────────┼──────────────┐                     │
│              │              │              │                     │
│              ▼              ▼              ▼                     │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│       │  AWS 1   │   │  AWS 2   │   │  GCP 1   │               │
│       │   25ms   │   │   28ms   │   │   45ms   │               │
│       │  1 Gbps  │   │  1 Gbps  │   │ 500 Mbps │               │
│       │ ●●●○○○   │   │ ●●●○○○   │   │ ●●○○○○   │               │
│       └──────────┘   └──────────┘   └──────────┘               │
│                                                                   │
│  Legend: ● = 200 Mbps effective bandwidth                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Speed vs Bandwidth Priority

```yaml
priorities:
  profiles:
    # Speed priority: Minimize build time
    speed:
      prefer_local: true
      prefer_fast_storage: true
      network_latency_weight: 0.8
      bandwidth_weight: 0.2

    # Bandwidth priority: Minimize network usage
    bandwidth:
      prefer_local: true
      prefer_cached_nodes: true
      network_latency_weight: 0.3
      bandwidth_weight: 0.7
      avoid_cloud: true

    # Cost priority: Minimize cloud costs
    cost:
      prefer_local: true
      cloud_only_when_queue_deep: true
      cloud_queue_threshold: 10

    # Balanced: Default balanced approach
    balanced:
      network_latency_weight: 0.5
      bandwidth_weight: 0.5
```

---

## Resource Visualization UI

### Web Dashboard Tabs

#### 1. Overview Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  BuildNet Resource Overview                              🔄 Auto │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ Cluster Health ──────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Total BPU: 18.4 available | 12.2 in use (66%)            │  │
│  │  ████████████████████████████████░░░░░░░░░░░░░░░░         │  │
│  │                                                            │  │
│  │  Nodes: 5 online | 1 degraded | 0 offline                 │  │
│  │  ●●●●●◐○                                                  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Active Builds ───────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  #1 api (Server 1)      ████████████░░░░░░  67%  2m 15s   │  │
│  │  #2 shared (Local)      ████████████████░░  89%  0m 45s   │  │
│  │  #3 ui (Server 2)       ██████░░░░░░░░░░░░  34%  1m 02s   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Quick Stats ─────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Today:  47 builds | 42 passed | 5 failed | 89% success   │  │
│  │  Avg:    12.3s per build | 3.2 BPU avg utilization        │  │
│  │  Cache:  74% hit rate | 4.2 MB total | 6 artifacts        │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Nodes Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Build Nodes                                    [+ Add Node]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ Local (Primary) ─────────────────────────────────────────┐  │
│  │  Status: ● Online                                         │  │
│  │  CPU: 8 cores @ 3.6 GHz | 1.45 BPU/core | 11.6 BPU total │  │
│  │  RAM: 32 GB (18 GB available)                             │  │
│  │  Load: ████████░░░░░░░░░░░░  42%                          │  │
│  │  Storage: 3 directories (see Storage tab)                  │  │
│  │  [Configure] [Benchmark] [Disable]                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ build-server-1 (192.168.1.100) ──────────────────────────┐  │
│  │  Status: ● Online | Latency: 0.5ms                        │  │
│  │  CPU: 16 cores @ 4.0 GHz | 1.8 BPU/core | 28.8 BPU total │  │
│  │  RAM: 64 GB (45 GB available)                             │  │
│  │  Load: ██████████████░░░░░░  71%                          │  │
│  │  Active: 2 builds (api, core)                              │  │
│  │  [Configure] [Benchmark] [SSH] [Disable]                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ build-server-2 (build2.example.com) ─────────────────────┐  │
│  │  Status: ◐ Degraded | Latency: 0.8ms                      │  │
│  │  CPU: 32 cores @ 3.8 GHz | 1.6 BPU/core | 51.2 BPU total │  │
│  │  RAM: 128 GB (12 GB available) ⚠️ LOW MEMORY               │  │
│  │  Load: ████████████████████  98%                          │  │
│  │  Active: 8 builds                                          │  │
│  │  [Configure] [Benchmark] [SSH] [Disable]                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ AWS Cloud Pool ──────────────────────────────────────────┐  │
│  │  Status: ● Available | Instances: 0/10                    │  │
│  │  Type: c5.4xlarge (16 vCPU, 32 GB) | ~1.2 BPU/core        │  │
│  │  Cost: $0.68/hr per instance                               │  │
│  │  Auto-scale: Queue depth > 5                               │  │
│  │  [Configure] [Scale Up] [Scale Down]                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Storage Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Storage Management                              [+ Add Directory]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Sort by: [Speed ▼] [Size] [Usage] [Type]                        │
│                                                                   │
│  ┌─ Tier 0: RAM Disk ────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  📁 /tmp/buildnet-fast (ramdisk)                          │  │
│  │     Speed: ████████████████████  12,000 MB/s  Score: 1000 │  │
│  │     Size:  ████████░░░░░░░░░░░░  3.2/8 GB (40%)           │  │
│  │     Files: 1,247 | Last used: 2s ago                       │  │
│  │     [Browse] [Clear] [Resize] [Configure]                  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Tier 1: NVMe SSD ────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  📁 /var/www/musclemap.me/.buildnet/workspace             │  │
│  │     Speed: █████████████░░░░░░░  3,500 MB/s   Score: 850  │  │
│  │     Size:  ████████████░░░░░░░░  22/50 GB (44%)           │  │
│  │     Files: 45,892 | Last used: 1m ago                      │  │
│  │     [Browse] [Clear] [Resize] [Configure]                  │  │
│  │                                                            │  │
│  │  📁 /var/www/musclemap.me/.buildnet/cache                 │  │
│  │     Speed: █████████████░░░░░░░  3,500 MB/s   Score: 850  │  │
│  │     Size:  ██████░░░░░░░░░░░░░░  4.5/20 GB (23%)          │  │
│  │     Files: 12,456 | Artifacts: 156                         │  │
│  │     [Browse] [Clear] [Resize] [Configure]                  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Comparison Chart ────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Read Speed (MB/s)                                        │  │
│  │  ramdisk  ████████████████████████████████████  12,000    │  │
│  │  nvme     ███████████                           3,500     │  │
│  │  sata     ██                                    550       │  │
│  │  hdd      ░                                     150       │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. Topology Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Network Topology                                    [Refresh]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                         ┌─────────┐                              │
│                         │ Primary │                              │
│                         │ ●11.6BPU│                              │
│                         └────┬────┘                              │
│                              │ 0ms                                │
│               ┌──────────────┼──────────────┐                    │
│               │              │              │                    │
│          0.5ms│         0.8ms│         2.1ms│                    │
│               │              │              │                    │
│          ┌────▼────┐    ┌────▼────┐    ┌────▼────┐              │
│          │Server 1 │    │Server 2 │    │   NAS   │              │
│          │●28.8BPU │    │◐51.2BPU │    │ Storage │              │
│          │  71%    │    │  98%    │    │  only   │              │
│          └─────────┘    └─────────┘    └─────────┘              │
│                                                                   │
│                         ┌─────────┐                              │
│                         │Internet │                              │
│                         └────┬────┘                              │
│                              │                                    │
│               ┌──────────────┼──────────────┐                    │
│               │              │              │                    │
│           25ms│          28ms│          45ms│                    │
│               │              │              │                    │
│          ┌────▼────┐    ┌────▼────┐    ┌────▼────┐              │
│          │  AWS 1  │    │  AWS 2  │    │  GCP 1  │              │
│          │ ○ idle  │    │ ○ idle  │    │ ○ idle  │              │
│          │ on-dem. │    │ on-dem. │    │ on-dem. │              │
│          └─────────┘    └─────────┘    └─────────┘              │
│                                                                   │
│  Legend: ● Online  ◐ Degraded  ○ Idle/Offline                    │
│          BPU = BuildNet Performance Units                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### 5. Queue Tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Build Queue                                    [Clear] [Pause]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ Running (3) ─────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  #1 api           Server 1    ████████████░░  67%  2m 15s │  │
│  │     Priority: High | Requested by: CI Pipeline             │  │
│  │     [View Logs] [Cancel]                                   │  │
│  │                                                            │  │
│  │  #2 shared        Local       ████████████████  89%  0m 45s│  │
│  │     Priority: Normal | Requested by: User                  │  │
│  │     [View Logs] [Cancel]                                   │  │
│  │                                                            │  │
│  │  #3 ui            Server 2    ██████░░░░░░░░  34%  1m 02s │  │
│  │     Priority: Normal | Requested by: Webhook               │  │
│  │     [View Logs] [Cancel]                                   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Queued (5) ──────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  #4 core          Pending     Priority: Normal  ETA: ~30s  │  │
│  │  #5 plugin-sdk    Pending     Priority: Low     ETA: ~1m   │  │
│  │  #6 client        Pending     Priority: Low     ETA: ~2m   │  │
│  │  #7 mobile        Pending     Priority: Low     ETA: ~3m   │  │
│  │  #8 docs          Pending     Priority: Low     ETA: ~4m   │  │
│  │                                                            │  │
│  │  [Reorder] [Set Priorities] [Cancel All]                   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Add to Queue ────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Package: [Select... ▼]  Priority: [Normal ▼]              │  │
│  │                                                            │  │
│  │  Options:                                                  │  │
│  │  ☑ Force rebuild (ignore cache)                           │  │
│  │  ☐ Prefer fast storage                                    │  │
│  │  ☐ Prefer local node                                      │  │
│  │  ☐ Low bandwidth mode                                     │  │
│  │                                                            │  │
│  │  [Add to Queue]                                            │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Build Queue & Job Scheduling

### Queue Configuration

```yaml
queue:
  # Maximum concurrent builds across cluster
  max_concurrent: 10

  # Maximum concurrent builds per node
  max_per_node: 4

  # Priority levels
  priorities:
    critical: 100
    high: 75
    normal: 50
    low: 25
    background: 10

  # Queue policies
  policies:
    # Coalesce identical requests
    coalesce_duplicates: true
    coalesce_window_secs: 10

    # Preemption (high priority can pause low priority)
    preemption:
      enabled: true
      min_priority_diff: 50  # Critical can preempt low

    # Fairness (prevent starvation)
    fairness:
      enabled: true
      max_wait_mins: 30  # Boost priority after waiting

    # Scheduling
    scheduling:
      algorithm: "weighted_fair"  # fifo | priority | weighted_fair
```

### Job Options

```yaml
# Per-job options (can be specified in build request)
job:
  options:
    # Force full rebuild
    force: false

    # Preferred node
    preferred_node: null  # or "build-server-1"

    # Storage preference
    storage_preference: "fastest"  # fastest | largest | specific

    # Network preference
    network_preference: "balanced"  # speed | bandwidth | balanced

    # Resource limits
    limits:
      max_cores: null      # Use all available
      max_memory_gb: null  # Use all available
      timeout_mins: 30     # Cancel if exceeds

    # Notifications
    notify:
      on_start: false
      on_complete: true
      on_failure: true
      channels: ["slack", "email"]
```

---

## Configuration Profiles

### Predefined Profiles

```yaml
profiles:
  # Maximum speed (use fastest resources)
  speed:
    distribution:
      strategy: "fastest"
    storage:
      preference: "tier_0"  # RAM disk
    network:
      preference: "lowest_latency"
    cpu:
      use_all_cores: true
      prefer_performance_cores: true

  # Bandwidth saver (minimize network usage)
  bandwidth_saver:
    distribution:
      strategy: "locality"
      prefer_local: true
      avoid_cloud: true
    storage:
      preference: "local_only"
    network:
      preference: "lowest_bandwidth"

  # Cost optimized (minimize cloud costs)
  cost_optimized:
    distribution:
      strategy: "least_loaded"
      prefer_local: true
      cloud_only_overflow: true
    storage:
      preference: "existing"  # Use existing caches

  # Reliability (prioritize stability)
  reliability:
    distribution:
      strategy: "round_robin"
      skip_degraded: true
    queue:
      coalesce_duplicates: false
    job:
      retry_failures: 3
```

### Custom Profile Creation

```yaml
# Custom profile in .buildnet/profiles/my-profile.yaml
name: "my-custom-profile"
description: "Optimized for our CI pipeline"

distribution:
  strategy: "smart"
  weights:
    speed: 0.5
    locality: 0.3
    cost: 0.2

storage:
  preference: "tier_1"
  fallback: "tier_2"

cpu:
  max_cores: 12
  reserved_cores: 4

network:
  max_latency_ms: 50
  min_bandwidth_mbps: 500

queue:
  max_concurrent: 8
  priority: "high"
```

### Profile Selection

```bash
# CLI
buildnetd build --profile speed
buildnetd build --profile bandwidth_saver
buildnetd build --profile my-custom-profile

# API
curl -X POST http://localhost:9876/build \
  -H "Content-Type: application/json" \
  -d '{"profile": "speed"}'

# Environment variable default
export BUILDNET_PROFILE=speed
```

---

## CLI Interface

### Resource Management Commands

```bash
# ═══════════════════════════════════════════════════════════════
# NODE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# List all nodes
buildnetd nodes list
buildnetd nodes list --format json
buildnetd nodes list --verbose

# Add a node
buildnetd nodes add build-server-1 --host 192.168.1.100 --port 9876 --key $API_KEY

# Remove a node
buildnetd nodes remove build-server-1

# Get node details
buildnetd nodes info build-server-1

# Enable/disable node
buildnetd nodes enable build-server-1
buildnetd nodes disable build-server-1

# SSH to node
buildnetd nodes ssh build-server-1

# ═══════════════════════════════════════════════════════════════
# STORAGE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# List storage directories
buildnetd storage list
buildnetd storage list --sort speed
buildnetd storage list --sort size

# Add storage directory
buildnetd storage add /path/to/dir --tier 1 --type nvme --max-size 50GB

# Remove storage directory
buildnetd storage remove /path/to/dir

# Benchmark storage
buildnetd storage benchmark /path/to/dir
buildnetd storage benchmark --all

# Clear storage
buildnetd storage clear /path/to/dir
buildnetd storage clear --tier 0  # Clear all RAM disks

# Browse storage
buildnetd storage browse /path/to/dir

# ═══════════════════════════════════════════════════════════════
# CPU MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# Show CPU info
buildnetd cpu info
buildnetd cpu info --topology

# Benchmark CPU
buildnetd cpu benchmark
buildnetd cpu benchmark --single-core
buildnetd cpu benchmark --multi-core

# Configure CPU allocation
buildnetd cpu config --max-cores 8
buildnetd cpu config --reserved 2
buildnetd cpu config --strategy percentage --value 75

# ═══════════════════════════════════════════════════════════════
# NETWORK MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# Show network topology
buildnetd network topology
buildnetd network topology --format ascii
buildnetd network topology --format json

# Measure latency to node
buildnetd network ping build-server-1

# Measure bandwidth to node
buildnetd network bandwidth build-server-1

# Full network benchmark
buildnetd network benchmark --all

# ═══════════════════════════════════════════════════════════════
# BENCHMARK COMMANDS
# ═══════════════════════════════════════════════════════════════

# Run all benchmarks
buildnetd benchmark --all

# View benchmark results
buildnetd benchmark results
buildnetd benchmark results --format json

# Compare nodes
buildnetd benchmark compare build-server-1 build-server-2

# ═══════════════════════════════════════════════════════════════
# QUEUE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# View queue
buildnetd queue list
buildnetd queue list --running
buildnetd queue list --pending

# Add to queue
buildnetd queue add api --priority high
buildnetd queue add api --profile speed --force

# Reorder queue
buildnetd queue move 5 --position 1  # Move job #5 to first position
buildnetd queue priority 5 --set critical  # Change priority

# Cancel jobs
buildnetd queue cancel 5
buildnetd queue cancel --all-pending

# Pause/resume queue
buildnetd queue pause
buildnetd queue resume

# ═══════════════════════════════════════════════════════════════
# PROFILE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# List profiles
buildnetd profiles list

# Show profile details
buildnetd profiles show speed

# Create profile
buildnetd profiles create my-profile --from speed

# Set default profile
buildnetd profiles default speed

# Delete profile
buildnetd profiles delete my-profile
```

### Interactive Shell

```bash
# Start interactive shell
buildnetd shell

buildnet> nodes list
┌────────────────┬─────────────────┬────────┬──────────┬────────┐
│ Name           │ Host            │ Status │ BPU      │ Load   │
├────────────────┼─────────────────┼────────┼──────────┼────────┤
│ local          │ localhost       │ ●      │ 11.6     │ 42%    │
│ build-server-1 │ 192.168.1.100   │ ●      │ 28.8     │ 71%    │
│ build-server-2 │ build2.example  │ ◐      │ 51.2     │ 98%    │
└────────────────┴─────────────────┴────────┴──────────┴────────┘

buildnet> storage list --sort speed
┌────────────────────────────────────────┬────────┬───────────┬────────┐
│ Path                                   │ Type   │ Speed     │ Score  │
├────────────────────────────────────────┼────────┼───────────┼────────┤
│ /tmp/buildnet-fast                     │ ramdisk│ 12000 MB/s│ 1000   │
│ /var/www/musclemap.me/.buildnet/cache  │ nvme   │ 3500 MB/s │ 850    │
│ /mnt/storage/archive                   │ hdd    │ 150 MB/s  │ 150    │
└────────────────────────────────────────┴────────┴───────────┴────────┘

buildnet> build api --profile speed
🚀 Build queued: api (job #42)
   Profile: speed
   Assigned: build-server-1
   ETA: ~15s

buildnet> watch
[Live build output streaming...]
```

---

## API Reference

### Resource Endpoints

```
# Nodes
GET    /api/resources/nodes                List all nodes
POST   /api/resources/nodes                Register a node
GET    /api/resources/nodes/{id}           Get node details
PUT    /api/resources/nodes/{id}           Update node config
DELETE /api/resources/nodes/{id}           Remove node
POST   /api/resources/nodes/{id}/enable    Enable node
POST   /api/resources/nodes/{id}/disable   Disable node
POST   /api/resources/nodes/{id}/benchmark Trigger benchmark

# Storage
GET    /api/resources/storage              List storage directories
POST   /api/resources/storage              Add storage directory
GET    /api/resources/storage/{id}         Get directory details
PUT    /api/resources/storage/{id}         Update directory config
DELETE /api/resources/storage/{id}         Remove directory
POST   /api/resources/storage/{id}/clear   Clear directory
POST   /api/resources/storage/{id}/benchmark Benchmark directory

# CPU
GET    /api/resources/cpu                  Get CPU info
GET    /api/resources/cpu/topology         Get CPU topology
PUT    /api/resources/cpu/config           Update CPU config
POST   /api/resources/cpu/benchmark        Run CPU benchmark

# Network
GET    /api/resources/network              Get network topology
GET    /api/resources/network/latency      Get latency matrix
POST   /api/resources/network/benchmark    Run network benchmark

# Benchmarks
GET    /api/benchmarks                     Get all benchmark results
POST   /api/benchmarks/run                 Run benchmarks
GET    /api/benchmarks/compare             Compare resources

# Queue
GET    /api/queue                          List queue
POST   /api/queue                          Add to queue
GET    /api/queue/{id}                     Get job details
DELETE /api/queue/{id}                     Cancel job
PUT    /api/queue/{id}/priority            Update priority
POST   /api/queue/pause                    Pause queue
POST   /api/queue/resume                   Resume queue

# Profiles
GET    /api/profiles                       List profiles
POST   /api/profiles                       Create profile
GET    /api/profiles/{name}                Get profile
PUT    /api/profiles/{name}                Update profile
DELETE /api/profiles/{name}                Delete profile
```

### WebSocket Events

```javascript
// Connect to resource events
const ws = new WebSocket('wss://buildnet.example.com/ws/resources');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'node.status':
      // Node status changed
      // data.node_id, data.status, data.load
      break;

    case 'node.joined':
      // New node joined cluster
      break;

    case 'node.left':
      // Node left cluster
      break;

    case 'storage.usage':
      // Storage usage updated
      // data.path, data.used, data.total
      break;

    case 'cpu.usage':
      // CPU usage updated
      // data.node_id, data.cores, data.utilization
      break;

    case 'build.assigned':
      // Build assigned to node
      // data.job_id, data.node_id
      break;

    case 'build.progress':
      // Build progress update
      // data.job_id, data.progress, data.stage
      break;

    case 'benchmark.complete':
      // Benchmark finished
      // data.resource_type, data.results
      break;
  }
};
```

---

## Implementation Phases

### Phase 1: Local Resource Management (Week 1-2)
- [ ] CPU discovery and topology mapping
- [ ] Storage directory discovery and configuration
- [ ] Basic benchmarking (CPU single/multi core, storage read/write)
- [ ] BPU scoring system
- [ ] Local resource visualization (CLI)

### Phase 2: Storage Tiers (Week 3-4)
- [ ] RAM disk support (tmpfs configuration)
- [ ] Multi-tier storage configuration
- [ ] Storage comparison visualization
- [ ] Automatic tier selection for builds
- [ ] Storage usage monitoring

### Phase 3: Distributed Nodes (Week 5-6)
- [ ] Node registration protocol
- [ ] Node health monitoring
- [ ] Remote node benchmarking
- [ ] Secure node communication (mTLS)
- [ ] Node status dashboard

### Phase 4: Network Topology (Week 7-8)
- [ ] Latency measurement
- [ ] Bandwidth measurement
- [ ] Network topology visualization
- [ ] Latency-aware scheduling
- [ ] Speed vs bandwidth profiles

### Phase 5: Build Distribution (Week 9-10)
- [ ] Task scheduler implementation
- [ ] Distribution strategies (smart, round_robin, etc.)
- [ ] Task partitioning (package, file, hybrid)
- [ ] Result collection and aggregation
- [ ] Distributed build visualization

### Phase 6: Queue Management (Week 11-12)
- [ ] Priority-based queue
- [ ] Queue visualization
- [ ] Job options (force, preferred node, etc.)
- [ ] Preemption support
- [ ] Fairness policies

### Phase 7: Configuration Profiles (Week 13-14)
- [ ] Predefined profiles (speed, bandwidth_saver, etc.)
- [ ] Custom profile creation
- [ ] Profile selection UI
- [ ] Per-job profile override
- [ ] Default profile configuration

### Phase 8: Web UI (Week 15-16)
- [ ] Overview dashboard
- [ ] Nodes management tab
- [ ] Storage management tab
- [ ] Network topology tab
- [ ] Queue management tab
- [ ] Real-time updates (WebSocket)

### Phase 9: Advanced Features (Week 17-20)
- [ ] Cloud auto-scaling (AWS, GCP, Azure)
- [ ] GPU support for specialized builds
- [ ] Cache distribution across nodes
- [ ] Artifact mirroring
- [ ] Historical analytics

---

## Quick Start

### 1. Configure Local Resources

```bash
# Edit resource configuration
cat > .buildnet/resources.yaml << 'EOF'
resources:
  local:
    cpus:
      enabled: true
      max_cores: 6
    storage:
      - path: "/tmp/buildnet-fast"
        type: ramdisk
        max_size_gb: 4
      - path: ".buildnet/workspace"
        type: nvme
EOF
```

### 2. Run Benchmarks

```bash
buildnetd benchmark --all
```

### 3. Add Remote Nodes

```bash
buildnetd nodes add build-server-1 \
  --host 192.168.1.100 \
  --port 9876 \
  --key $BUILD_SERVER_KEY
```

### 4. Build with Profile

```bash
# Use speed profile
buildnetd build --all --profile speed

# Use bandwidth saver profile
buildnetd build --all --profile bandwidth_saver
```

### 5. Open Web Dashboard

```bash
open http://localhost:9876
# Navigate to Resources tab
```

---

## See Also

- [BuildNet Master Plan](./BUILDNET-MASTER-PLAN.md)
- [BuildNet Notification System](./BUILDNET-NOTIFICATION-SYSTEM.md)
- [BuildNet API Reference](./BUILDNET-API.md)
- [BuildNet Configuration Guide](./BUILDNET-CONFIG.md)
