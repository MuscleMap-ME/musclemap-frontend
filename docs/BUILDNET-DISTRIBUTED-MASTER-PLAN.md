# BuildNet Distributed Resource Pooling - Master Plan

**Version:** 1.0.0
**Status:** Planning Phase
**Last Updated:** January 2025

---

## Executive Summary

This document outlines the comprehensive architecture for transforming BuildNet Native from a single-machine build daemon into a **distributed resource pooling system** where multiple BuildNet instances communicate, share resources, and present a unified interface to users.

### Key Goals

1. **Resource Discovery & Advertising** - Each BuildNet scans its host for available resources (CPU, RAM, storage, tools like ImageMagick/FFmpeg)
2. **Resource Pooling** - Combine disparate resources across hosts (e.g., 2 cores from Host A + 8GB RAM from Host B + storage on Host C)
3. **Unified Interface** - Control the entire distributed BuildNet from any machine via Web UI or CLI
4. **Visual Configuration Builder** - Drag-and-drop GUI for assembling build configurations from pooled resources
5. **Performance Benchmarking** - Automatic latency/throughput testing of resources with display to users
6. **Build Time Estimation** - Predict build duration based on selected configuration
7. **Historical Ledger** - Shared, synchronized activity log visible to all nodes
8. **Port 80 Communication** - Use HTTP/WebSocket on port 80 to minimize firewall issues

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Resource Discovery System](#2-resource-discovery-system)
3. [Communication Protocol](#3-communication-protocol)
4. [Resource Pool Management](#4-resource-pool-management)
5. [Configuration System](#5-configuration-system)
6. [Web UI: Visual Configuration Builder](#6-web-ui-visual-configuration-builder)
7. [CLI Interface](#7-cli-interface)
8. [Performance Benchmarking](#8-performance-benchmarking)
9. [Build Time Estimation](#9-build-time-estimation)
10. [Historical Ledger & Synchronization](#10-historical-ledger--synchronization)
11. [Security Architecture](#11-security-architecture)
12. [Database Schema](#12-database-schema)
13. [API Specification](#13-api-specification)
14. [Implementation Phases](#14-implementation-phases)
15. [Risk Analysis](#15-risk-analysis)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BUILDNET DISTRIBUTED MESH                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│   │  BuildNet Node A │    │  BuildNet Node B │    │  BuildNet Node C │         │
│   │  (Dev MacBook)   │◄──►│  (VPS Server)    │◄──►│  (CI Runner)     │         │
│   │                  │    │                  │    │                  │         │
│   │  Resources:      │    │  Resources:      │    │  Resources:      │         │
│   │  • 8 CPU cores   │    │  • 2 CPU cores   │    │  • 16 CPU cores  │         │
│   │  • 32GB RAM      │    │  • 8GB RAM       │    │  • 64GB RAM      │         │
│   │  • SSD: 500GB    │    │  • SSD: 100GB    │    │  • NVMe: 1TB     │         │
│   │  • ImageMagick   │    │  • FFmpeg        │    │  • Docker        │         │
│   │  • Node.js 22    │    │  • Bun 1.3       │    │  • Rust toolchain│         │
│   └──────────────────┘    └──────────────────┘    └──────────────────┘         │
│            │                       │                       │                    │
│            └───────────────────────┼───────────────────────┘                    │
│                                    │                                            │
│                        ┌───────────▼───────────┐                               │
│                        │    Resource Pool      │                               │
│                        │    (Virtual View)     │                               │
│                        │                       │                               │
│                        │  Combined Resources:  │                               │
│                        │  • 26 CPU cores       │                               │
│                        │  • 104GB RAM          │                               │
│                        │  • 1.6TB Storage      │                               │
│                        │  • All tools merged   │                               │
│                        └───────────────────────┘                               │
│                                    │                                            │
│            ┌───────────────────────┼───────────────────────┐                    │
│            ▼                       ▼                       ▼                    │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│   │    Web UI        │    │    CLI Client    │    │   API Client     │         │
│   │  (Any Browser)   │    │  (buildnet-cli)  │    │  (Programmatic)  │         │
│   └──────────────────┘    └──────────────────┘    └──────────────────┘         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Node Roles

| Role | Description | Responsibilities |
|------|-------------|------------------|
| **Coordinator** | Elected leader node | Maintains resource registry, schedules builds, manages ledger |
| **Worker** | Standard node | Advertises resources, executes tasks, reports metrics |
| **Observer** | Read-only node | Monitors activity, doesn't contribute resources |

### 1.3 Data Flow

```
1. NODE STARTUP
   ┌─────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────────┐
   │ Daemon  │───►│ Self-Scan    │───►│ Benchmark  │───►│ Advertise to │
   │ Start   │    │ Resources    │    │ Resources  │    │ Other Nodes  │
   └─────────┘    └──────────────┘    └────────────┘    └──────────────┘

2. BUILD REQUEST
   ┌─────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────────┐
   │ User    │───►│ Config       │───►│ Coordinator│───►│ Distributed  │
   │ Request │    │ Validation   │    │ Scheduling │    │ Execution    │
   └─────────┘    └──────────────┘    └────────────┘    └──────────────┘

3. RESOURCE ALLOCATION
   ┌─────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────────┐
   │ Select  │───►│ Check        │───►│ Reserve    │───►│ Execute or   │
   │ Config  │    │ Availability │    │ Resources  │    │ Queue        │
   └─────────┘    └──────────────┘    └────────────┘    └──────────────┘
```

---

## 2. Resource Discovery System

### 2.1 Resource Types

```rust
/// All discoverable resource types
pub enum ResourceType {
    // Compute Resources
    CpuCores {
        count: usize,
        architecture: CpuArchitecture,  // x86_64, aarch64
        model: String,                   // "Apple M3 Pro", "AMD EPYC 7543"
        frequency_mhz: u32,
        features: Vec<String>,           // ["avx2", "neon", "sse4.2"]
    },

    Memory {
        total_bytes: u64,
        available_bytes: u64,
        memory_type: MemoryType,        // DDR4, DDR5, etc.
        speed_mhz: Option<u32>,
    },

    // Storage Resources
    StorageVolume {
        path: PathBuf,
        total_bytes: u64,
        available_bytes: u64,
        storage_type: StorageType,      // NVMe, SSD, HDD, Network
        mount_point: String,
        read_speed_mbps: f64,           // Benchmarked
        write_speed_mbps: f64,          // Benchmarked
        iops: u32,                       // Benchmarked
    },

    // Software/Tools Resources
    Tool {
        name: String,                    // "imagemagick", "ffmpeg", "docker"
        version: String,
        path: PathBuf,
        capabilities: Vec<String>,      // ["webp", "heic", "avif"]
    },

    // Runtime Environments
    Runtime {
        name: String,                    // "node", "bun", "rust", "python"
        version: String,
        path: PathBuf,
    },

    // Network Resources
    NetworkInterface {
        name: String,
        bandwidth_mbps: f64,             // Benchmarked
        latency_ms: f64,                 // To coordinator
    },
}
```

### 2.2 Discovery Process

```rust
/// Resource discovery orchestrator
pub struct ResourceScanner {
    node_id: String,
    scan_config: ScanConfig,
}

impl ResourceScanner {
    /// Full system scan (runs on startup and periodically)
    pub async fn scan_all(&self) -> NodeResources {
        let mut resources = NodeResources::new(self.node_id.clone());

        // 1. CPU Discovery
        resources.cpu = self.scan_cpu().await;

        // 2. Memory Discovery
        resources.memory = self.scan_memory().await;

        // 3. Storage Discovery
        resources.storage = self.scan_storage().await;

        // 4. Tool Discovery (ImageMagick, FFmpeg, etc.)
        resources.tools = self.scan_tools().await;

        // 5. Runtime Discovery (Node, Bun, Rust, Python)
        resources.runtimes = self.scan_runtimes().await;

        // 6. Network Interface Discovery
        resources.network = self.scan_network().await;

        resources
    }

    /// Scan for installed tools
    async fn scan_tools(&self) -> Vec<Tool> {
        let known_tools = [
            ("imagemagick", vec!["convert", "magick"],
             |path| self.detect_imagemagick_capabilities(path)),
            ("ffmpeg", vec!["ffmpeg"],
             |path| self.detect_ffmpeg_capabilities(path)),
            ("docker", vec!["docker"],
             |path| self.detect_docker_capabilities(path)),
            ("git", vec!["git"],
             |path| vec!["clone", "pull", "push"]),
            // ... more tools
        ];

        let mut found = Vec::new();
        for (name, binaries, cap_fn) in known_tools {
            if let Some(path) = self.find_executable(&binaries) {
                let version = self.get_tool_version(name, &path).await;
                let capabilities = cap_fn(&path);
                found.push(Tool {
                    name: name.to_string(),
                    version,
                    path,
                    capabilities,
                });
            }
        }
        found
    }
}
```

### 2.3 Storage Performance Detection

```rust
/// Benchmark storage performance
pub struct StorageBenchmark {
    path: PathBuf,
    test_size_mb: u64,
}

impl StorageBenchmark {
    pub async fn run(&self) -> StoragePerformance {
        let test_file = self.path.join(".buildnet_benchmark_tmp");

        // Sequential Write Test
        let write_speed = self.test_sequential_write(&test_file).await;

        // Sequential Read Test
        let read_speed = self.test_sequential_read(&test_file).await;

        // Random IOPS Test
        let iops = self.test_random_iops(&test_file).await;

        // Cleanup
        let _ = fs::remove_file(&test_file).await;

        StoragePerformance {
            read_speed_mbps: read_speed,
            write_speed_mbps: write_speed,
            iops,
            storage_class: self.classify_storage(read_speed, write_speed, iops),
        }
    }

    fn classify_storage(&self, read: f64, write: f64, iops: u32) -> StorageClass {
        match (read, iops) {
            (r, i) if r > 3000.0 && i > 100_000 => StorageClass::NVMe,
            (r, i) if r > 500.0 && i > 10_000 => StorageClass::SSD,
            (r, _) if r > 100.0 => StorageClass::HDD,
            _ => StorageClass::Network,
        }
    }
}
```

### 2.4 Resource Manifest File

Each BuildNet node maintains a local configuration specifying what resources are available:

```json
// .buildnet/node-config.json
{
  "node_id": "auto",  // "auto" = generate UUID, or specify manually
  "node_name": "dev-macbook",
  "node_tags": ["development", "primary"],

  "resource_limits": {
    "cpu": {
      "max_cores": 6,           // Limit to 6 of 8 available cores
      "reserved_cores": [0, 1]  // Reserve cores 0,1 for system
    },
    "memory": {
      "max_gb": 24,             // Limit to 24 of 32GB
      "reserved_gb": 8          // Keep 8GB for OS/other apps
    },
    "storage": [
      {
        "path": "/Users/me/buildnet-cache",
        "max_gb": 100,
        "purpose": "cache"
      },
      {
        "path": "/Volumes/FastSSD/builds",
        "max_gb": 200,
        "purpose": "builds"
      }
    ]
  },

  "tool_overrides": {
    "imagemagick": {
      "path": "/opt/homebrew/bin/magick",
      "enabled": true
    },
    "docker": {
      "enabled": false  // Disable even if installed
    }
  },

  "network": {
    "listen_port": 80,
    "advertise_address": "192.168.1.100",
    "peers": [
      "https://buildnet.musclemap.me",
      "http://192.168.1.101:80"
    ]
  },

  "scheduling": {
    "accept_remote_builds": true,
    "priority_weight": 1.0,      // Higher = prefer this node
    "time_restrictions": {
      "local_only_hours": ["09:00-17:00"]  // During work hours, only local builds
    }
  }
}
```

---

## 3. Communication Protocol

### 3.1 Protocol Selection: HTTP/2 + WebSocket over Port 80

**Rationale for Port 80:**
- Least likely to be blocked by firewalls
- Works through corporate proxies
- No special network configuration needed
- HTTPS (port 443) available as fallback

### 3.2 Message Protocol

```rust
/// BuildNet inter-node message types
#[derive(Serialize, Deserialize)]
pub enum NodeMessage {
    // Discovery & Health
    Ping { timestamp: i64 },
    Pong { timestamp: i64, load: f64 },
    Announce(NodeAnnouncement),
    Heartbeat(HeartbeatData),

    // Resource Management
    ResourceUpdate(ResourceUpdate),
    ResourceQuery { query: ResourceQuery },
    ResourceResponse { resources: Vec<PooledResource> },

    // Build Coordination
    BuildRequest(DistributedBuildRequest),
    BuildAccepted { build_id: String, estimated_duration_secs: u64 },
    BuildRejected { build_id: String, reason: String },
    BuildProgress(BuildProgressUpdate),
    BuildComplete(BuildResult),

    // Task Distribution
    TaskAssign(BuildTask),
    TaskAccept { task_id: String },
    TaskReject { task_id: String, reason: String },
    TaskProgress { task_id: String, progress: f64, output: String },
    TaskComplete(TaskResult),

    // Ledger Synchronization
    LedgerSync { from_sequence: u64 },
    LedgerEntries { entries: Vec<LedgerEntry> },
    LedgerAck { sequence: u64 },

    // Configuration
    ConfigSync { config_hash: String },
    ConfigRequest { config_id: String },
    ConfigResponse { config: BuildConfiguration },
    TemplateSync { templates: Vec<ConfigTemplate> },

    // Benchmarking
    BenchmarkRequest { target_node: String, test_type: BenchmarkType },
    BenchmarkResult { node_id: String, results: BenchmarkResults },
}

/// Node announcement (sent on join/periodically)
#[derive(Serialize, Deserialize)]
pub struct NodeAnnouncement {
    pub node_id: String,
    pub node_name: String,
    pub version: String,
    pub capabilities: NodeCapabilities,
    pub resources: NodeResources,
    pub address: String,
    pub role: NodeRole,
    pub status: NodeStatus,
    pub joined_at: DateTime<Utc>,
    pub last_build_at: Option<DateTime<Utc>>,
}
```

### 3.3 Connection Manager

```rust
/// Manages connections to peer BuildNet nodes
pub struct PeerManager {
    node_id: String,
    peers: DashMap<String, PeerConnection>,
    coordinator: RwLock<Option<String>>,
    discovery_config: DiscoveryConfig,
}

impl PeerManager {
    /// Connect to a peer node
    pub async fn connect(&self, address: &str) -> Result<(), PeerError> {
        let ws_url = format!("ws://{}/ws", address);
        let (ws_stream, _) = connect_async(&ws_url).await?;

        let (write, read) = ws_stream.split();
        let peer_id = self.handshake(write, read).await?;

        let peer = PeerConnection {
            id: peer_id.clone(),
            address: address.to_string(),
            writer: Arc::new(Mutex::new(write)),
            status: PeerStatus::Connected,
            last_heartbeat: Instant::now(),
            metrics: PeerMetrics::default(),
        };

        self.peers.insert(peer_id.clone(), peer);

        // Start message handler task
        tokio::spawn(self.handle_peer_messages(peer_id, read));

        Ok(())
    }

    /// Broadcast message to all peers
    pub async fn broadcast(&self, msg: &NodeMessage) -> usize {
        let data = serde_json::to_string(msg).unwrap();
        let mut sent = 0;

        for peer in self.peers.iter() {
            if peer.writer.lock().await.send(Message::Text(data.clone())).await.is_ok() {
                sent += 1;
            }
        }

        sent
    }

    /// Send message to specific peer
    pub async fn send_to(&self, peer_id: &str, msg: &NodeMessage) -> Result<(), PeerError> {
        if let Some(peer) = self.peers.get(peer_id) {
            let data = serde_json::to_string(msg)?;
            peer.writer.lock().await.send(Message::Text(data)).await?;
            Ok(())
        } else {
            Err(PeerError::NotConnected(peer_id.to_string()))
        }
    }
}
```

### 3.4 Coordinator Election

Using a simple leader election algorithm (Bully Algorithm):

```rust
/// Coordinator election manager
pub struct CoordinatorElection {
    node_id: String,
    peer_manager: Arc<PeerManager>,
    is_coordinator: AtomicBool,
    election_in_progress: AtomicBool,
}

impl CoordinatorElection {
    /// Start an election when coordinator is unreachable
    pub async fn start_election(&self) {
        if self.election_in_progress.swap(true, Ordering::SeqCst) {
            return; // Election already in progress
        }

        // Get all nodes with higher IDs
        let higher_nodes: Vec<_> = self.peer_manager.peers.iter()
            .filter(|p| p.key() > &self.node_id)
            .map(|p| p.key().clone())
            .collect();

        if higher_nodes.is_empty() {
            // We have the highest ID, become coordinator
            self.become_coordinator().await;
        } else {
            // Send election message to higher nodes
            for node_id in higher_nodes {
                self.peer_manager.send_to(&node_id, &NodeMessage::Election {
                    candidate: self.node_id.clone(),
                }).await.ok();
            }

            // Wait for response
            tokio::time::sleep(Duration::from_secs(5)).await;

            // If no response, become coordinator
            if !self.received_ok.load(Ordering::SeqCst) {
                self.become_coordinator().await;
            }
        }

        self.election_in_progress.store(false, Ordering::SeqCst);
    }

    async fn become_coordinator(&self) {
        self.is_coordinator.store(true, Ordering::SeqCst);

        // Announce to all peers
        self.peer_manager.broadcast(&NodeMessage::Coordinator {
            node_id: self.node_id.clone(),
        }).await;

        log::info!("This node is now the coordinator");
    }
}
```

---

## 4. Resource Pool Management

### 4.1 Resource Pool Structure

```rust
/// Virtual resource pool aggregating all node resources
pub struct ResourcePool {
    /// All known nodes
    nodes: DashMap<String, NodeState>,

    /// Aggregated resources (virtual view)
    aggregate: RwLock<AggregateResources>,

    /// Current allocations
    allocations: DashMap<String, ResourceAllocation>,

    /// Reservation queue
    reservations: Arc<Mutex<VecDeque<ResourceReservation>>>,
}

/// Aggregate view of all pool resources
#[derive(Default)]
pub struct AggregateResources {
    pub total_cpu_cores: usize,
    pub available_cpu_cores: usize,

    pub total_memory_bytes: u64,
    pub available_memory_bytes: u64,

    pub storage_volumes: Vec<PooledStorageVolume>,

    pub tools: HashMap<String, Vec<PooledTool>>,
    pub runtimes: HashMap<String, Vec<PooledRuntime>>,

    pub last_updated: DateTime<Utc>,
}

/// A resource with its source node
#[derive(Clone)]
pub struct PooledResource {
    pub resource: ResourceType,
    pub node_id: String,
    pub node_name: String,
    pub latency_ms: f64,
    pub availability: f64,  // 0.0 - 1.0 (fraction available)
    pub performance_score: f64,  // Normalized 0.0 - 1.0
}
```

### 4.2 Resource Allocation

```rust
/// Request a specific configuration of resources
pub struct ResourceRequest {
    pub build_id: String,
    pub requirements: BuildRequirements,
    pub preferences: BuildPreferences,
    pub timeout_secs: u64,
}

#[derive(Default)]
pub struct BuildRequirements {
    pub min_cpu_cores: usize,
    pub min_memory_gb: f64,
    pub min_storage_gb: f64,
    pub required_tools: Vec<String>,
    pub required_runtimes: Vec<RuntimeRequirement>,
}

#[derive(Default)]
pub struct BuildPreferences {
    /// Prefer resources from specific node
    pub preferred_node: Option<String>,

    /// Prefer local resources (minimize network transfer)
    pub prefer_local: bool,

    /// Storage speed requirement
    pub storage_class: Option<StorageClass>,

    /// Maximum acceptable latency between resources
    pub max_latency_ms: Option<f64>,
}

impl ResourcePool {
    /// Allocate resources for a build
    pub async fn allocate(
        &self,
        request: ResourceRequest,
    ) -> Result<ResourceAllocation, AllocationError> {
        let aggregate = self.aggregate.read().await;

        // 1. Find nodes that can satisfy requirements
        let candidates = self.find_candidate_nodes(&request.requirements);

        if candidates.is_empty() {
            return Err(AllocationError::InsufficientResources {
                required: request.requirements,
                available: aggregate.clone(),
            });
        }

        // 2. Score candidates based on preferences
        let mut scored: Vec<_> = candidates.into_iter()
            .map(|node| {
                let score = self.score_node(&node, &request.preferences);
                (node, score)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // 3. Try to allocate from best candidates
        for (node, _score) in scored {
            match self.try_allocate_from(&node, &request).await {
                Ok(allocation) => {
                    self.record_allocation(&allocation).await;
                    return Ok(allocation);
                }
                Err(_) => continue,  // Try next candidate
            }
        }

        // 4. If single-node allocation failed, try distributed allocation
        self.try_distributed_allocation(&request).await
    }

    /// Allocate resources across multiple nodes
    async fn try_distributed_allocation(
        &self,
        request: &ResourceRequest,
    ) -> Result<ResourceAllocation, AllocationError> {
        let mut allocation = ResourceAllocation {
            id: Uuid::new_v4().to_string(),
            build_id: request.build_id.clone(),
            resources: Vec::new(),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::seconds(request.timeout_secs as i64),
        };

        let req = &request.requirements;

        // Allocate CPU from best available nodes
        let cpu_allocation = self.allocate_cpu_distributed(req.min_cpu_cores).await?;
        allocation.resources.extend(cpu_allocation);

        // Allocate memory from best available nodes
        let mem_allocation = self.allocate_memory_distributed(req.min_memory_gb).await?;
        allocation.resources.extend(mem_allocation);

        // Allocate storage (prefer single node for coherence)
        let storage = self.allocate_storage(req.min_storage_gb, &request.preferences).await?;
        allocation.resources.push(storage);

        // Verify tools are available somewhere
        for tool in &req.required_tools {
            let tool_resource = self.find_tool(tool).await?;
            allocation.resources.push(tool_resource);
        }

        Ok(allocation)
    }
}
```

### 4.3 Resource Visualization Data

```rust
/// Data structure for UI resource visualization
#[derive(Serialize)]
pub struct PoolVisualization {
    pub nodes: Vec<NodeVisualization>,
    pub connections: Vec<ConnectionVisualization>,
    pub aggregate: AggregateVisualization,
}

#[derive(Serialize)]
pub struct NodeVisualization {
    pub id: String,
    pub name: String,
    pub status: String,  // "online", "busy", "offline"
    pub position: Option<(f64, f64)>,  // For graph layout

    pub resources: NodeResourceVisualization,
    pub utilization: NodeUtilization,
    pub performance: NodePerformance,
}

#[derive(Serialize)]
pub struct NodeResourceVisualization {
    pub cpu: CpuVisualization,
    pub memory: MemoryVisualization,
    pub storage: Vec<StorageVisualization>,
    pub tools: Vec<ToolVisualization>,
    pub runtimes: Vec<RuntimeVisualization>,
}

#[derive(Serialize)]
pub struct ConnectionVisualization {
    pub from_node: String,
    pub to_node: String,
    pub latency_ms: f64,
    pub bandwidth_mbps: f64,
    pub status: String,  // "excellent", "good", "fair", "poor"
}
```

---

## 5. Configuration System

### 5.1 Build Configuration

```rust
/// Complete build configuration
#[derive(Serialize, Deserialize, Clone)]
pub struct BuildConfiguration {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub created_by: String,

    /// Resource selection
    pub resources: ResourceSelection,

    /// Build settings
    pub build: BuildSettings,

    /// Execution preferences
    pub execution: ExecutionSettings,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResourceSelection {
    /// CPU allocation
    pub cpu: CpuSelection,

    /// Memory allocation
    pub memory: MemorySelection,

    /// Storage selection
    pub storage: StorageSelection,

    /// Tool requirements
    pub tools: Vec<ToolRequirement>,

    /// Runtime requirements
    pub runtimes: Vec<RuntimeRequirement>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CpuSelection {
    /// Total cores to use
    pub cores: usize,

    /// Specific node allocations (optional)
    pub node_allocations: Option<Vec<NodeCpuAllocation>>,

    /// Priority tier
    pub priority: CpuPriority,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct NodeCpuAllocation {
    pub node_id: String,
    pub cores: usize,
    pub specific_cores: Option<Vec<usize>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MemorySelection {
    /// Total memory in GB
    pub gb: f64,

    /// Specific node allocations
    pub node_allocations: Option<Vec<NodeMemoryAllocation>>,

    /// Memory priority
    pub priority: MemoryPriority,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StorageSelection {
    /// Storage path selection
    pub volumes: Vec<StorageVolumeSelection>,

    /// Preferred storage class
    pub min_class: StorageClass,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StorageVolumeSelection {
    pub node_id: String,
    pub path: String,
    pub purpose: StoragePurpose,  // Cache, Build, Output
    pub size_gb: f64,
}
```

### 5.2 Configuration Templates

```rust
/// Pre-defined configuration template
#[derive(Serialize, Deserialize, Clone)]
pub struct ConfigTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub category: TemplateCategory,

    /// Template configuration (with placeholders)
    pub config: BuildConfiguration,

    /// Variables that can be customized
    pub variables: Vec<TemplateVariable>,

    /// Recommended use cases
    pub use_cases: Vec<String>,

    /// Is this a system template?
    pub system: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum TemplateCategory {
    /// Local-only builds
    LocalOnly,
    /// Fast builds (minimal resources)
    QuickBuild,
    /// Full builds (maximum resources)
    FullBuild,
    /// CI/CD optimized
    CiCd,
    /// Custom user template
    Custom,
}

/// Built-in templates
pub fn default_templates() -> Vec<ConfigTemplate> {
    vec![
        ConfigTemplate {
            id: "local-only".to_string(),
            name: "Local Only".to_string(),
            description: "Build using only local machine resources".to_string(),
            icon: "laptop".to_string(),
            category: TemplateCategory::LocalOnly,
            config: BuildConfiguration {
                resources: ResourceSelection {
                    cpu: CpuSelection {
                        cores: 0,  // 0 = use all available
                        node_allocations: Some(vec![NodeCpuAllocation {
                            node_id: "local".to_string(),
                            cores: 0,
                            specific_cores: None,
                        }]),
                        priority: CpuPriority::Normal,
                    },
                    memory: MemorySelection {
                        gb: 0.0,  // 0 = use available
                        node_allocations: None,
                        priority: MemoryPriority::Normal,
                    },
                    storage: StorageSelection {
                        volumes: vec![],  // Auto-detect
                        min_class: StorageClass::Any,
                    },
                    tools: vec![],
                    runtimes: vec![],
                },
                ..Default::default()
            },
            variables: vec![
                TemplateVariable {
                    name: "cores".to_string(),
                    description: "Number of CPU cores".to_string(),
                    var_type: VariableType::Integer,
                    default: Some("0".to_string()),
                },
            ],
            use_cases: vec![
                "Quick local development builds".to_string(),
                "Offline development".to_string(),
            ],
            system: true,
        },

        ConfigTemplate {
            id: "distributed-full".to_string(),
            name: "Full Distributed".to_string(),
            description: "Use all available pool resources for maximum speed".to_string(),
            icon: "cloud".to_string(),
            category: TemplateCategory::FullBuild,
            config: BuildConfiguration {
                resources: ResourceSelection {
                    cpu: CpuSelection {
                        cores: 0,  // All available
                        node_allocations: None,  // Auto-distribute
                        priority: CpuPriority::High,
                    },
                    memory: MemorySelection {
                        gb: 0.0,
                        node_allocations: None,
                        priority: MemoryPriority::High,
                    },
                    storage: StorageSelection {
                        volumes: vec![],
                        min_class: StorageClass::SSD,
                    },
                    tools: vec![],
                    runtimes: vec![],
                },
                ..Default::default()
            },
            variables: vec![],
            use_cases: vec![
                "Full production builds".to_string(),
                "Release builds".to_string(),
            ],
            system: true,
        },

        // More templates...
    ]
}
```

---

## 6. Web UI: Visual Configuration Builder

### 6.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BuildNet Configuration Builder                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │    Resource Palette     │  │           Configuration Canvas              │   │
│  │    (Drag Sources)       │  │           (Drop Targets)                    │   │
│  │                         │  │                                             │   │
│  │  ┌───────────────────┐  │  │  ┌─────────────────────────────────────┐   │   │
│  │  │ 🖥️ Node A         │  │  │  │         CPU Selection               │   │   │
│  │  │   8 cores         │  │  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │   │   │
│  │  │   32GB RAM        │◄─┼──┼──│  │ 2c  │ │ 4c  │ │     │ │     │   │   │   │
│  │  │   SSD: 500GB      │  │  │  │  │ A   │ │ B   │ │     │ │     │   │   │   │
│  │  └───────────────────┘  │  │  │  └─────┘ └─────┘ └─────┘ └─────┘   │   │   │
│  │                         │  │  │  Total: 6 cores                     │   │   │
│  │  ┌───────────────────┐  │  │  └─────────────────────────────────────┘   │   │
│  │  │ 🖥️ Node B         │  │  │                                             │   │
│  │  │   2 cores         │  │  │  ┌─────────────────────────────────────┐   │   │
│  │  │   8GB RAM         │◄─┼──┼──│         Memory Selection            │   │   │
│  │  │   SSD: 100GB      │  │  │  │  ┌─────────┐ ┌─────────┐            │   │   │
│  │  └───────────────────┘  │  │  │  │ 8GB     │ │ 16GB    │            │   │   │
│  │                         │  │  │  │ Node B  │ │ Node A  │            │   │   │
│  │  ┌───────────────────┐  │  │  │  └─────────┘ └─────────┘            │   │   │
│  │  │ 🖥️ Node C         │  │  │  │  Total: 24GB                        │   │   │
│  │  │   16 cores        │  │  │  └─────────────────────────────────────┘   │   │
│  │  │   64GB RAM        │  │  │                                             │   │
│  │  │   NVMe: 1TB       │  │  │  ┌─────────────────────────────────────┐   │   │
│  │  └───────────────────┘  │  │  │         Storage Selection           │   │   │
│  │                         │  │  │  ┌─────────────────────────────────┐│   │   │
│  │  ══════════════════════ │  │  │  │ 📁 /builds on Node C           ││   │   │
│  │       Tools             │  │  │  │    NVMe • 3500MB/s • 200GB     ││   │   │
│  │  ══════════════════════ │  │  │  └─────────────────────────────────┘│   │   │
│  │                         │  │  └─────────────────────────────────────┘   │   │
│  │  ┌───────────────────┐  │  │                                             │   │
│  │  │ 🖼️ ImageMagick    │  │  │  ┌─────────────────────────────────────┐   │   │
│  │  │   v7.1.1 @ Node A │  │  │  │         Tools Selection             │   │   │
│  │  └───────────────────┘  │  │  │  ┌─────────┐ ┌─────────┐            │   │   │
│  │                         │  │  │  │ 🖼️ IM   │ │ 🎬 FFm  │            │   │   │
│  │  ┌───────────────────┐  │  │  │  │ Node A  │ │ Node B  │            │   │   │
│  │  │ 🎬 FFmpeg         │  │  │  │  └─────────┘ └─────────┘            │   │   │
│  │  │   v6.1 @ Node B   │  │  │  └─────────────────────────────────────┘   │   │
│  │  └───────────────────┘  │  │                                             │   │
│  │                         │  └─────────────────────────────────────────────┘   │
│  └─────────────────────────┘                                                    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        Configuration Summary                             │    │
│  │                                                                          │    │
│  │  ⏱️ Estimated Build Time: ~45 seconds                                    │    │
│  │                                                                          │    │
│  │  📊 Resource Distribution:                                               │    │
│  │     CPU:  ████████░░ 6/26 cores (23%)                                   │    │
│  │     RAM:  ██░░░░░░░░ 24/104 GB (23%)                                    │    │
│  │     Disk: █░░░░░░░░░ 200/1600 GB (12%)                                  │    │
│  │                                                                          │    │
│  │  🌐 Network Latency:                                                     │    │
│  │     A ↔ B: 15ms    A ↔ C: 45ms    B ↔ C: 50ms                          │    │
│  │                                                                          │    │
│  │  [💾 Save as Template]  [▶️ Run Build]  [📋 Export Config]              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 React Component Structure

```typescript
// BuildConfigBuilder.tsx - Main component structure

interface BuildConfigBuilderProps {
  poolData: PoolVisualization;
  templates: ConfigTemplate[];
  onSave: (config: BuildConfiguration) => void;
  onBuild: (config: BuildConfiguration) => void;
}

const BuildConfigBuilder: React.FC<BuildConfigBuilderProps> = ({
  poolData,
  templates,
  onSave,
  onBuild,
}) => {
  const [config, setConfig] = useState<BuildConfiguration>(defaultConfig);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-[300px_1fr] gap-4 h-full">
        {/* Resource Palette */}
        <ResourcePalette
          nodes={poolData.nodes}
          onDragStart={setDragState}
        />

        {/* Configuration Canvas */}
        <div className="space-y-4">
          {/* Template Selector */}
          <TemplateSelector
            templates={templates}
            onSelect={(template) => setConfig(template.config)}
          />

          {/* Resource Drop Zones */}
          <CpuSelector
            config={config.resources.cpu}
            availableNodes={poolData.nodes}
            onChange={(cpu) => updateConfig({ ...config.resources, cpu })}
          />

          <MemorySelector
            config={config.resources.memory}
            availableNodes={poolData.nodes}
            onChange={(memory) => updateConfig({ ...config.resources, memory })}
          />

          <StorageSelector
            config={config.resources.storage}
            availableVolumes={getAllStorageVolumes(poolData.nodes)}
            onChange={(storage) => updateConfig({ ...config.resources, storage })}
          />

          <ToolSelector
            config={config.resources.tools}
            availableTools={getAllTools(poolData.nodes)}
            onChange={(tools) => updateConfig({ ...config.resources, tools })}
          />

          {/* Build Time Estimation */}
          <BuildEstimation
            config={config}
            estimatedTime={estimatedTime}
          />

          {/* Network Topology View */}
          <NetworkTopology
            nodes={poolData.nodes}
            connections={poolData.connections}
            selectedNodes={getSelectedNodes(config)}
          />

          {/* Actions */}
          <ConfigActions
            onSave={() => onSave(config)}
            onBuild={() => onBuild(config)}
            onExport={() => exportConfig(config)}
          />
        </div>
      </div>
    </DndProvider>
  );
};

// Draggable Resource Card
const DraggableResource: React.FC<{
  resource: PooledResource;
  node: NodeVisualization;
}> = ({ resource, node }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: getResourceDragType(resource),
    item: { resource, node },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-3 rounded-lg bg-white/5 border border-white/10 cursor-grab
        ${isDragging ? 'opacity-50' : ''}`}
    >
      <ResourceIcon type={resource.resource} />
      <ResourceDetails resource={resource} />
      <PerformanceIndicator score={resource.performance_score} />
    </div>
  );
};

// Drop Zone for CPU cores
const CpuDropZone: React.FC<{
  config: CpuSelection;
  onDrop: (resource: PooledResource, nodeId: string, cores: number) => void;
}> = ({ config, onDrop }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'cpu',
    drop: (item: { resource: PooledResource; node: NodeVisualization }) => {
      onDrop(item.resource, item.node.id, item.resource.resource.count);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`p-4 rounded-xl border-2 border-dashed transition-colors
        ${isOver && canDrop ? 'border-blue-500 bg-blue-500/10' : 'border-white/20'}
        ${!canDrop && isOver ? 'border-red-500 bg-red-500/10' : ''}`}
    >
      <h3 className="text-lg font-medium mb-3">CPU Allocation</h3>

      {/* Current allocations */}
      <div className="flex flex-wrap gap-2">
        {config.node_allocations?.map((alloc) => (
          <CpuAllocationChip
            key={alloc.node_id}
            allocation={alloc}
            onRemove={() => removeAllocation(alloc.node_id)}
          />
        ))}

        {/* Empty slots */}
        {[...Array(8 - (config.node_allocations?.length || 0))].map((_, i) => (
          <EmptySlot key={i} label="Drop CPU cores here" />
        ))}
      </div>

      <div className="mt-3 text-sm text-gray-400">
        Total: {getTotalCores(config)} cores
      </div>
    </div>
  );
};
```

### 6.3 Real-Time Resource Updates

```typescript
// useResourcePool.ts - WebSocket hook for real-time updates

export function useResourcePool() {
  const [pool, setPool] = useState<PoolVisualization | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        setConnected(true);
        // Subscribe to resource updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['resources', 'builds', 'ledger'],
        }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'resource_update':
            setPool((prev) => updatePoolResources(prev, msg.data));
            break;
          case 'node_joined':
            setPool((prev) => addNodeToPool(prev, msg.node));
            break;
          case 'node_left':
            setPool((prev) => removeNodeFromPool(prev, msg.node_id));
            break;
          case 'allocation_changed':
            setPool((prev) => updateAllocations(prev, msg.allocations));
            break;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after delay
        setTimeout(connect, 5000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { pool, connected };
}
```

---

## 7. CLI Interface

### 7.1 CLI Commands

```bash
# BuildNet CLI - buildnet-cli

# Node Management
buildnet node status                    # Show local node status
buildnet node scan                      # Re-scan local resources
buildnet node benchmark                 # Run benchmarks
buildnet node join <address>            # Join a BuildNet cluster
buildnet node leave                     # Leave the cluster

# Pool Management
buildnet pool status                    # Show entire pool status
buildnet pool resources                 # List all pooled resources
buildnet pool nodes                     # List all nodes
buildnet pool health                    # Run health check

# Configuration
buildnet config list                    # List saved configurations
buildnet config show <name>             # Show configuration details
buildnet config create                  # Interactive config creator
buildnet config edit <name>             # Edit configuration
buildnet config delete <name>           # Delete configuration
buildnet config export <name> <file>    # Export to file
buildnet config import <file>           # Import from file

# Templates
buildnet template list                  # List available templates
buildnet template use <name>            # Create config from template
buildnet template save <name>           # Save current config as template

# Building
buildnet build                          # Build with default config
buildnet build --config <name>          # Build with named config
buildnet build --template <name>        # Build with template
buildnet build --local-only             # Force local-only build
buildnet build --estimate               # Only estimate, don't build

# Resource Testing
buildnet test storage <path>            # Test storage performance
buildnet test network <node>            # Test network to node
buildnet test cpu                       # Run CPU benchmark
buildnet test all                       # Run all tests

# History & Ledger
buildnet history                        # Show build history
buildnet history <build-id>             # Show specific build details
buildnet ledger                         # Show activity ledger
buildnet ledger sync                    # Force ledger sync
```

### 7.2 CLI Implementation

```rust
// cli.rs - CLI implementation

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "buildnet")]
#[command(about = "BuildNet Distributed Build System CLI")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,

    /// BuildNet daemon address
    #[arg(long, default_value = "http://localhost:80")]
    pub address: String,

    /// Output format
    #[arg(long, default_value = "table")]
    pub format: OutputFormat,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Node management
    Node {
        #[command(subcommand)]
        action: NodeCommands,
    },

    /// Pool management
    Pool {
        #[command(subcommand)]
        action: PoolCommands,
    },

    /// Configuration management
    Config {
        #[command(subcommand)]
        action: ConfigCommands,
    },

    /// Template management
    Template {
        #[command(subcommand)]
        action: TemplateCommands,
    },

    /// Run a build
    Build {
        /// Configuration name
        #[arg(long)]
        config: Option<String>,

        /// Template name
        #[arg(long)]
        template: Option<String>,

        /// Force local-only build
        #[arg(long)]
        local_only: bool,

        /// Only estimate, don't build
        #[arg(long)]
        estimate: bool,

        /// Force rebuild
        #[arg(long)]
        force: bool,
    },

    /// Resource testing
    Test {
        #[command(subcommand)]
        test_type: TestCommands,
    },

    /// Build history
    History {
        /// Specific build ID
        build_id: Option<String>,

        /// Number of entries
        #[arg(short, default_value = "20")]
        limit: usize,
    },

    /// Activity ledger
    Ledger {
        /// Force sync
        #[arg(long)]
        sync: bool,

        /// Number of entries
        #[arg(short, default_value = "50")]
        limit: usize,
    },
}

#[derive(Subcommand)]
pub enum ConfigCommands {
    /// List configurations
    List,

    /// Show configuration details
    Show { name: String },

    /// Create configuration interactively
    Create,

    /// Edit configuration
    Edit { name: String },

    /// Delete configuration
    Delete { name: String },

    /// Export to file
    Export {
        name: String,
        #[arg(short, long)]
        output: PathBuf,
    },

    /// Import from file
    Import {
        #[arg(short, long)]
        input: PathBuf,
    },
}

// Interactive config creator
pub async fn create_config_interactive(client: &BuildNetClient) -> Result<BuildConfiguration> {
    let pool = client.get_pool_status().await?;

    println!("🔧 BuildNet Configuration Creator\n");

    // 1. Select template or start fresh
    let templates = client.get_templates().await?;
    let template_choice = Select::new()
        .with_prompt("Start from template?")
        .items(&["Fresh Configuration", /* template names */])
        .interact()?;

    let mut config = match template_choice {
        0 => BuildConfiguration::default(),
        n => templates[n - 1].config.clone(),
    };

    // 2. CPU Selection
    println!("\n📊 CPU Selection");
    println!("Available: {} cores across {} nodes",
        pool.aggregate.total_cpu_cores,
        pool.nodes.len());

    let cores = Input::<usize>::new()
        .with_prompt("How many CPU cores?")
        .with_default(4)
        .interact()?;

    let prefer_local = Confirm::new()
        .with_prompt("Prefer local CPU?")
        .with_default(true)
        .interact()?;

    config.resources.cpu = CpuSelection {
        cores,
        node_allocations: if prefer_local {
            Some(vec![NodeCpuAllocation {
                node_id: "local".to_string(),
                cores,
                specific_cores: None,
            }])
        } else {
            None
        },
        priority: CpuPriority::Normal,
    };

    // 3. Memory Selection
    println!("\n💾 Memory Selection");
    println!("Available: {:.1} GB across {} nodes",
        pool.aggregate.available_memory_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
        pool.nodes.len());

    let memory_gb = Input::<f64>::new()
        .with_prompt("How much memory (GB)?")
        .with_default(8.0)
        .interact()?;

    config.resources.memory = MemorySelection {
        gb: memory_gb,
        node_allocations: None,
        priority: MemoryPriority::Normal,
    };

    // 4. Storage Selection
    println!("\n📁 Storage Selection");
    let volumes: Vec<_> = pool.nodes.iter()
        .flat_map(|n| n.resources.storage.iter())
        .collect();

    let storage_choices: Vec<_> = volumes.iter()
        .map(|v| format!("{} on {} ({:.0} GB free, {:.0} MB/s)",
            v.path, v.node_name, v.available_gb, v.read_speed_mbps))
        .collect();

    let storage_idx = Select::new()
        .with_prompt("Select storage volume")
        .items(&storage_choices)
        .interact()?;

    let selected_volume = &volumes[storage_idx];
    config.resources.storage = StorageSelection {
        volumes: vec![StorageVolumeSelection {
            node_id: selected_volume.node_id.clone(),
            path: selected_volume.path.clone(),
            purpose: StoragePurpose::Build,
            size_gb: 50.0,
        }],
        min_class: StorageClass::Any,
    };

    // 5. Tool Requirements
    println!("\n🔨 Tool Requirements");
    let available_tools: Vec<_> = pool.nodes.iter()
        .flat_map(|n| n.resources.tools.iter())
        .map(|t| t.name.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let tool_selections = MultiSelect::new()
        .with_prompt("Select required tools")
        .items(&available_tools)
        .interact()?;

    config.resources.tools = tool_selections.iter()
        .map(|&i| ToolRequirement {
            name: available_tools[i].clone(),
            version: None,
        })
        .collect();

    // 6. Save configuration
    let config_name = Input::<String>::new()
        .with_prompt("Configuration name")
        .interact()?;

    config.name = config_name;

    // Show estimation
    let estimation = client.estimate_build(&config).await?;
    println!("\n⏱️ Estimated build time: {} seconds", estimation.duration_secs);

    if Confirm::new()
        .with_prompt("Save this configuration?")
        .with_default(true)
        .interact()?
    {
        client.save_config(&config).await?;
        println!("✅ Configuration saved!");
    }

    Ok(config)
}
```

### 7.3 CLI Output Formatting

```rust
// Pretty table output for CLI

pub fn print_pool_status(pool: &PoolVisualization, format: OutputFormat) {
    match format {
        OutputFormat::Table => print_pool_table(pool),
        OutputFormat::Json => println!("{}", serde_json::to_string_pretty(pool).unwrap()),
        OutputFormat::Yaml => println!("{}", serde_yaml::to_string(pool).unwrap()),
    }
}

fn print_pool_table(pool: &PoolVisualization) {
    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║                    BuildNet Resource Pool                       ║");
    println!("╠════════════════════════════════════════════════════════════════╣");

    // Aggregate stats
    let agg = &pool.aggregate;
    println!("║ Total Resources:                                               ║");
    println!("║   CPU:     {:>4} cores ({:>4} available)                        ║",
        agg.total_cpu_cores, agg.available_cpu_cores);
    println!("║   Memory:  {:>4} GB   ({:>4} GB available)                      ║",
        agg.total_memory_bytes / 1024 / 1024 / 1024,
        agg.available_memory_bytes / 1024 / 1024 / 1024);
    println!("║   Storage: {:>4} GB   (across {} volumes)                       ║",
        agg.storage_volumes.iter().map(|v| v.total_gb).sum::<f64>() as u64,
        agg.storage_volumes.len());
    println!("╠════════════════════════════════════════════════════════════════╣");

    // Node table
    println!("║ Nodes ({} total):                                               ║", pool.nodes.len());
    println!("║ ┌────────────┬────────┬────────┬──────────┬─────────┐          ║");
    println!("║ │ Name       │ Status │ CPU    │ Memory   │ Latency │          ║");
    println!("║ ├────────────┼────────┼────────┼──────────┼─────────┤          ║");

    for node in &pool.nodes {
        let status_icon = match node.status.as_str() {
            "online" => "🟢",
            "busy" => "🟡",
            _ => "🔴",
        };

        println!("║ │ {:10} │ {}     │ {:>2}/{:>2}  │ {:>3}/{:>3} GB │ {:>5}ms │          ║",
            truncate(&node.name, 10),
            status_icon,
            node.utilization.cpu_used,
            node.resources.cpu.cores,
            node.utilization.memory_used_gb as u32,
            node.resources.memory.total_gb as u32,
            node.performance.latency_ms as u32);
    }

    println!("║ └────────────┴────────┴────────┴──────────┴─────────┘          ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
}
```

---

## 8. Performance Benchmarking

### 8.1 Benchmark Types

```rust
/// Types of performance benchmarks
pub enum BenchmarkType {
    /// CPU performance (single-core, multi-core)
    Cpu {
        single_core: bool,
        multi_core: bool,
        duration_secs: u64,
    },

    /// Memory bandwidth and latency
    Memory {
        bandwidth: bool,
        latency: bool,
    },

    /// Storage performance
    Storage {
        path: PathBuf,
        sequential: bool,
        random: bool,
        file_size_mb: u64,
    },

    /// Network performance to another node
    Network {
        target_node: String,
        latency: bool,
        bandwidth: bool,
        duration_secs: u64,
    },

    /// Full system benchmark
    Full,
}

/// Benchmark results
#[derive(Serialize, Deserialize)]
pub struct BenchmarkResults {
    pub node_id: String,
    pub timestamp: DateTime<Utc>,
    pub duration_ms: u64,

    pub cpu: Option<CpuBenchmarkResult>,
    pub memory: Option<MemoryBenchmarkResult>,
    pub storage: Option<StorageBenchmarkResult>,
    pub network: Option<NetworkBenchmarkResult>,

    /// Overall score (0-100)
    pub overall_score: f64,
}

#[derive(Serialize, Deserialize)]
pub struct CpuBenchmarkResult {
    /// Single-core score (higher is better)
    pub single_core_score: f64,

    /// Multi-core score
    pub multi_core_score: f64,

    /// Parallel efficiency (0.0 - 1.0)
    pub parallel_efficiency: f64,

    /// Estimated cores that scale well
    pub effective_cores: usize,
}

#[derive(Serialize, Deserialize)]
pub struct StorageBenchmarkResult {
    pub path: String,
    pub storage_class: StorageClass,

    /// Sequential read speed (MB/s)
    pub seq_read_mbps: f64,

    /// Sequential write speed (MB/s)
    pub seq_write_mbps: f64,

    /// Random read IOPS
    pub random_read_iops: u32,

    /// Random write IOPS
    pub random_write_iops: u32,

    /// Latency for small reads (microseconds)
    pub read_latency_us: u64,
}

#[derive(Serialize, Deserialize)]
pub struct NetworkBenchmarkResult {
    pub target_node: String,

    /// Round-trip latency (milliseconds)
    pub latency_ms: f64,

    /// Jitter (milliseconds)
    pub jitter_ms: f64,

    /// Upload bandwidth (Mbps)
    pub upload_mbps: f64,

    /// Download bandwidth (Mbps)
    pub download_mbps: f64,
}
```

### 8.2 Benchmark Runner

```rust
/// Runs benchmarks on the local system
pub struct BenchmarkRunner {
    node_id: String,
    config: BenchmarkConfig,
}

impl BenchmarkRunner {
    /// Run full system benchmark
    pub async fn run_full(&self) -> BenchmarkResults {
        let start = Instant::now();

        let cpu = self.benchmark_cpu().await;
        let memory = self.benchmark_memory().await;
        let storage = self.benchmark_storage(&self.config.storage_paths).await;

        let overall_score = self.calculate_overall_score(&cpu, &memory, &storage);

        BenchmarkResults {
            node_id: self.node_id.clone(),
            timestamp: Utc::now(),
            duration_ms: start.elapsed().as_millis() as u64,
            cpu: Some(cpu),
            memory: Some(memory),
            storage: Some(storage),
            network: None,
            overall_score,
        }
    }

    /// CPU benchmark using compute-intensive tasks
    async fn benchmark_cpu(&self) -> CpuBenchmarkResult {
        // Single-core test: Prime sieve
        let single_score = self.run_prime_sieve_single().await;

        // Multi-core test: Parallel prime sieve
        let multi_score = self.run_prime_sieve_parallel().await;

        let cores = num_cpus::get();
        let parallel_efficiency = multi_score / (single_score * cores as f64);
        let effective_cores = (parallel_efficiency * cores as f64).round() as usize;

        CpuBenchmarkResult {
            single_core_score: single_score,
            multi_core_score: multi_score,
            parallel_efficiency,
            effective_cores,
        }
    }

    /// Storage benchmark
    async fn benchmark_storage(&self, paths: &[PathBuf]) -> StorageBenchmarkResult {
        let path = &paths[0];  // Primary storage path
        let test_file = path.join(".buildnet_bench_tmp");
        let test_size = 256 * 1024 * 1024;  // 256MB

        // Sequential write
        let seq_write = self.test_sequential_write(&test_file, test_size).await;

        // Sequential read
        let seq_read = self.test_sequential_read(&test_file).await;

        // Random IOPS
        let (random_read_iops, random_write_iops) = self.test_random_iops(&test_file).await;

        // Read latency
        let read_latency = self.test_read_latency(&test_file).await;

        // Cleanup
        let _ = tokio::fs::remove_file(&test_file).await;

        // Classify storage
        let storage_class = classify_storage(seq_read, random_read_iops);

        StorageBenchmarkResult {
            path: path.to_string_lossy().to_string(),
            storage_class,
            seq_read_mbps: seq_read,
            seq_write_mbps: seq_write,
            random_read_iops,
            random_write_iops,
            read_latency_us: read_latency,
        }
    }

    /// Network benchmark to another node
    pub async fn benchmark_network(&self, target: &str) -> NetworkBenchmarkResult {
        let client = reqwest::Client::new();
        let base_url = format!("http://{}", target);

        // Latency test (multiple pings)
        let mut latencies = Vec::new();
        for _ in 0..20 {
            let start = Instant::now();
            let _ = client.get(&format!("{}/health", base_url)).send().await;
            latencies.push(start.elapsed().as_secs_f64() * 1000.0);
        }

        let avg_latency = latencies.iter().sum::<f64>() / latencies.len() as f64;
        let jitter = calculate_jitter(&latencies);

        // Bandwidth test (upload large payload)
        let upload_mbps = self.test_upload_bandwidth(&base_url).await;
        let download_mbps = self.test_download_bandwidth(&base_url).await;

        NetworkBenchmarkResult {
            target_node: target.to_string(),
            latency_ms: avg_latency,
            jitter_ms: jitter,
            upload_mbps,
            download_mbps,
        }
    }
}
```

### 8.3 Scheduled Benchmarking

```rust
/// Manages periodic benchmark runs
pub struct BenchmarkScheduler {
    runner: Arc<BenchmarkRunner>,
    results: Arc<RwLock<Vec<BenchmarkResults>>>,
    config: BenchmarkScheduleConfig,
}

impl BenchmarkScheduler {
    /// Start the benchmark scheduler
    pub fn start(self: Arc<Self>) {
        let scheduler = self.clone();

        tokio::spawn(async move {
            loop {
                // Run benchmark
                let results = scheduler.runner.run_full().await;

                // Store results
                scheduler.results.write().await.push(results.clone());

                // Broadcast to peers
                scheduler.broadcast_results(&results).await;

                // Wait for next interval
                tokio::time::sleep(scheduler.config.interval).await;
            }
        });
    }

    /// Get historical benchmark data for visualization
    pub async fn get_history(&self, limit: usize) -> Vec<BenchmarkResults> {
        let results = self.results.read().await;
        results.iter().rev().take(limit).cloned().collect()
    }
}
```

---

## 9. Build Time Estimation

### 9.1 Estimation Model

```rust
/// Build time estimation engine
pub struct BuildEstimator {
    /// Historical build data
    history: Arc<RwLock<Vec<BuildHistoryEntry>>>,

    /// Node benchmark data
    benchmarks: Arc<RwLock<HashMap<String, BenchmarkResults>>>,

    /// Package complexity profiles
    package_profiles: HashMap<String, PackageProfile>,
}

#[derive(Clone)]
pub struct BuildHistoryEntry {
    pub config_hash: String,
    pub package: String,
    pub duration_ms: u64,
    pub source_file_count: usize,
    pub source_size_bytes: u64,
    pub cpu_cores_used: usize,
    pub memory_used_mb: u64,
    pub storage_class: StorageClass,
    pub timestamp: DateTime<Utc>,
}

#[derive(Clone)]
pub struct PackageProfile {
    pub name: String,
    pub complexity_factor: f64,  // Higher = more complex
    pub parallelizable: f64,     // 0.0 - 1.0 (how well it parallelizes)
    pub io_bound: f64,           // 0.0 - 1.0 (higher = more I/O bound)
    pub base_duration_ms: u64,   // Historical average
}

impl BuildEstimator {
    /// Estimate build time for a configuration
    pub async fn estimate(&self, config: &BuildConfiguration) -> BuildEstimation {
        let mut total_duration_ms = 0u64;
        let mut package_estimates = Vec::new();

        let benchmarks = self.benchmarks.read().await;

        // Estimate each package
        for package in &config.packages {
            let profile = self.get_package_profile(&package.name);
            let estimate = self.estimate_package(config, &profile, &benchmarks).await;

            total_duration_ms += estimate.duration_ms;
            package_estimates.push(estimate);
        }

        // Apply parallelization factor
        let parallelization = self.calculate_parallelization(config, &package_estimates);
        let parallel_duration_ms = (total_duration_ms as f64 / parallelization) as u64;

        // Add network overhead for distributed builds
        let network_overhead_ms = self.estimate_network_overhead(config).await;

        BuildEstimation {
            total_duration_ms: parallel_duration_ms + network_overhead_ms,
            package_estimates,
            parallelization_factor: parallelization,
            network_overhead_ms,
            confidence: self.calculate_confidence(config),
        }
    }

    /// Estimate single package build time
    async fn estimate_package(
        &self,
        config: &BuildConfiguration,
        profile: &PackageProfile,
        benchmarks: &HashMap<String, BenchmarkResults>,
    ) -> PackageEstimate {
        let base = profile.base_duration_ms as f64;

        // CPU factor
        let cpu_score = self.get_weighted_cpu_score(config, benchmarks);
        let cpu_factor = 1.0 / (cpu_score / 1000.0);  // Normalize to baseline

        // Memory factor (less memory = slower for large builds)
        let memory_factor = if config.resources.memory.gb < 8.0 {
            1.0 + (8.0 - config.resources.memory.gb) * 0.1
        } else {
            1.0
        };

        // Storage factor (based on I/O bound ratio)
        let storage_score = self.get_storage_score(config, benchmarks);
        let storage_factor = profile.io_bound * (1.0 / (storage_score / 1000.0))
            + (1.0 - profile.io_bound);

        // Parallelization factor
        let cores = config.resources.cpu.cores as f64;
        let parallel_speedup = 1.0 + (cores - 1.0) * profile.parallelizable * 0.7;

        let duration_ms = (base * cpu_factor * memory_factor * storage_factor / parallel_speedup) as u64;

        PackageEstimate {
            package: profile.name.clone(),
            duration_ms,
            factors: EstimationFactors {
                cpu_factor,
                memory_factor,
                storage_factor,
                parallel_speedup,
            },
        }
    }

    /// Learn from completed builds
    pub async fn record_build(&self, result: &BuildResult) {
        let entry = BuildHistoryEntry {
            config_hash: result.config_hash.clone(),
            package: result.package.clone(),
            duration_ms: result.duration_ms,
            source_file_count: result.metrics.source_files,
            source_size_bytes: result.metrics.source_bytes,
            cpu_cores_used: result.metrics.cpu_cores,
            memory_used_mb: result.metrics.peak_memory_mb,
            storage_class: result.metrics.storage_class,
            timestamp: Utc::now(),
        };

        self.history.write().await.push(entry);

        // Update package profile with new data
        self.update_package_profile(&result.package, result.duration_ms).await;
    }
}
```

### 9.2 Estimation Display

```rust
/// Estimation result for display
#[derive(Serialize)]
pub struct BuildEstimation {
    /// Total estimated duration
    pub total_duration_ms: u64,

    /// Per-package estimates
    pub package_estimates: Vec<PackageEstimate>,

    /// Parallelization speedup factor
    pub parallelization_factor: f64,

    /// Network overhead for distributed
    pub network_overhead_ms: u64,

    /// Confidence level (0.0 - 1.0)
    pub confidence: f64,
}

#[derive(Serialize)]
pub struct PackageEstimate {
    pub package: String,
    pub duration_ms: u64,
    pub factors: EstimationFactors,
}

#[derive(Serialize)]
pub struct EstimationFactors {
    pub cpu_factor: f64,
    pub memory_factor: f64,
    pub storage_factor: f64,
    pub parallel_speedup: f64,
}

impl BuildEstimation {
    /// Format for display
    pub fn format_human(&self) -> String {
        let secs = self.total_duration_ms / 1000;
        let confidence_str = match self.confidence {
            c if c > 0.8 => "high",
            c if c > 0.5 => "medium",
            _ => "low",
        };

        format!(
            "Estimated time: ~{} seconds ({} confidence)\n\
             Parallelization: {:.1}x speedup\n\
             Network overhead: {}ms",
            secs,
            confidence_str,
            self.parallelization_factor,
            self.network_overhead_ms
        )
    }
}
```

---

## 10. Historical Ledger & Synchronization

### 10.1 Ledger Structure

```rust
/// Distributed ledger for activity tracking
pub struct Ledger {
    /// Local storage
    db: Arc<LedgerDb>,

    /// Current sequence number
    sequence: AtomicU64,

    /// Peer connections for sync
    peers: Arc<PeerManager>,

    /// Pending entries to sync
    pending_sync: Arc<Mutex<Vec<LedgerEntry>>>,
}

/// Single ledger entry
#[derive(Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    /// Unique entry ID
    pub id: String,

    /// Sequence number (monotonically increasing)
    pub sequence: u64,

    /// Node that created this entry
    pub origin_node: String,

    /// Entry type
    pub entry_type: LedgerEntryType,

    /// Timestamp
    pub timestamp: DateTime<Utc>,

    /// Entry data
    pub data: LedgerData,

    /// Hash of previous entry (chain integrity)
    pub prev_hash: String,

    /// This entry's hash
    pub hash: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum LedgerEntryType {
    /// Node joined the network
    NodeJoined,
    /// Node left the network
    NodeLeft,
    /// Build started
    BuildStarted,
    /// Build completed
    BuildCompleted,
    /// Build failed
    BuildFailed,
    /// Resource allocation
    ResourceAllocated,
    /// Resource released
    ResourceReleased,
    /// Configuration created
    ConfigCreated,
    /// Configuration modified
    ConfigModified,
    /// Benchmark completed
    BenchmarkCompleted,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum LedgerData {
    NodeJoined {
        node_id: String,
        node_name: String,
        capabilities: NodeCapabilities,
    },
    NodeLeft {
        node_id: String,
        reason: String,
    },
    BuildStarted {
        build_id: String,
        config_id: String,
        packages: Vec<String>,
        resources: ResourceSummary,
    },
    BuildCompleted {
        build_id: String,
        duration_ms: u64,
        artifacts: Vec<String>,
    },
    BuildFailed {
        build_id: String,
        error: String,
    },
    ResourceAllocated {
        allocation_id: String,
        build_id: String,
        resources: ResourceSummary,
    },
    ResourceReleased {
        allocation_id: String,
    },
    ConfigCreated {
        config_id: String,
        config_name: String,
        created_by: String,
    },
    BenchmarkCompleted {
        node_id: String,
        results: BenchmarkSummary,
    },
}
```

### 10.2 Ledger Synchronization

```rust
impl Ledger {
    /// Append a new entry to the ledger
    pub async fn append(&self, entry_type: LedgerEntryType, data: LedgerData) -> Result<LedgerEntry> {
        let sequence = self.sequence.fetch_add(1, Ordering::SeqCst);
        let prev = self.get_latest().await?;

        let entry = LedgerEntry {
            id: Uuid::new_v4().to_string(),
            sequence,
            origin_node: self.node_id.clone(),
            entry_type,
            timestamp: Utc::now(),
            data,
            prev_hash: prev.map(|e| e.hash).unwrap_or_default(),
            hash: String::new(),  // Will be computed
        };

        let entry = self.compute_hash(entry);

        // Store locally
        self.db.insert(&entry).await?;

        // Queue for sync
        self.pending_sync.lock().await.push(entry.clone());

        // Trigger sync
        self.sync_to_peers().await;

        Ok(entry)
    }

    /// Synchronize with peers
    pub async fn sync_to_peers(&self) {
        let pending = {
            let mut guard = self.pending_sync.lock().await;
            std::mem::take(&mut *guard)
        };

        if pending.is_empty() {
            return;
        }

        // Broadcast new entries
        let msg = NodeMessage::LedgerEntries { entries: pending.clone() };
        let sent = self.peers.broadcast(&msg).await;

        if sent < self.peers.len() / 2 {
            // Not enough peers received, re-queue
            self.pending_sync.lock().await.extend(pending);
        }
    }

    /// Handle incoming ledger entries from peer
    pub async fn receive_entries(&self, entries: Vec<LedgerEntry>) -> Result<()> {
        for entry in entries {
            // Verify entry integrity
            if !self.verify_entry(&entry) {
                log::warn!("Received invalid ledger entry: {}", entry.id);
                continue;
            }

            // Check if we already have this entry
            if self.db.exists(&entry.id).await? {
                continue;
            }

            // Verify chain integrity
            if !self.verify_chain(&entry).await? {
                log::warn!("Chain integrity failed for entry: {}", entry.id);
                // Request missing entries
                self.request_missing_entries(entry.sequence).await;
                continue;
            }

            // Store entry
            self.db.insert(&entry).await?;

            // Update sequence if needed
            let current = self.sequence.load(Ordering::SeqCst);
            if entry.sequence >= current {
                self.sequence.store(entry.sequence + 1, Ordering::SeqCst);
            }
        }

        Ok(())
    }

    /// Request missing entries from peers
    async fn request_missing_entries(&self, from_sequence: u64) {
        let msg = NodeMessage::LedgerSync { from_sequence };
        self.peers.broadcast(&msg).await;
    }

    /// Query ledger with filters
    pub async fn query(&self, filter: LedgerFilter) -> Result<Vec<LedgerEntry>> {
        self.db.query(filter).await
    }
}

#[derive(Default)]
pub struct LedgerFilter {
    pub entry_types: Option<Vec<LedgerEntryType>>,
    pub origin_node: Option<String>,
    pub from_time: Option<DateTime<Utc>>,
    pub to_time: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
}
```

### 10.3 Ledger Visualization

```typescript
// LedgerView.tsx - React component for ledger visualization

interface LedgerViewProps {
  entries: LedgerEntry[];
  onLoadMore: () => void;
  filter: LedgerFilter;
  onFilterChange: (filter: LedgerFilter) => void;
}

const LedgerView: React.FC<LedgerViewProps> = ({
  entries,
  onLoadMore,
  filter,
  onFilterChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <LedgerFilters filter={filter} onChange={onFilterChange} />

      {/* Timeline view */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />

        {/* Entries */}
        <div className="space-y-3">
          {entries.map((entry) => (
            <LedgerEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>

      {/* Load more */}
      <button
        onClick={onLoadMore}
        className="w-full py-2 text-center text-gray-400 hover:text-white"
      >
        Load more...
      </button>
    </div>
  );
};

const LedgerEntryCard: React.FC<{ entry: LedgerEntry }> = ({ entry }) => {
  const icon = getEntryIcon(entry.entry_type);
  const color = getEntryColor(entry.entry_type);

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={`absolute left-2 top-3 w-4 h-4 rounded-full ${color}
          flex items-center justify-center`}
      >
        {icon}
      </div>

      {/* Card */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-white">
            {formatEntryType(entry.entry_type)}
          </span>
          <span className="text-xs text-gray-500">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </div>

        <div className="text-sm text-gray-400">
          <LedgerEntryDetails data={entry.data} />
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <span>From: {entry.origin_node}</span>
          <span>•</span>
          <span>Seq: #{entry.sequence}</span>
        </div>
      </div>
    </div>
  );
};
```

---

## 11. Security Architecture

### 11.1 Authentication

```rust
/// Node authentication using Ed25519 keys
pub struct NodeIdentity {
    /// Node's unique ID
    pub node_id: String,

    /// Ed25519 signing key pair
    pub keypair: ed25519_dalek::SigningKey,

    /// Public key for verification
    pub public_key: ed25519_dalek::VerifyingKey,
}

impl NodeIdentity {
    /// Generate new identity
    pub fn generate() -> Self {
        let mut rng = rand::thread_rng();
        let keypair = SigningKey::generate(&mut rng);
        let public_key = keypair.verifying_key();
        let node_id = hex::encode(&public_key.as_bytes()[..8]);

        NodeIdentity {
            node_id,
            keypair,
            public_key,
        }
    }

    /// Sign a message
    pub fn sign(&self, message: &[u8]) -> Signature {
        self.keypair.sign(message)
    }

    /// Verify a signature from another node
    pub fn verify(public_key: &VerifyingKey, message: &[u8], signature: &Signature) -> bool {
        public_key.verify(message, signature).is_ok()
    }
}

/// Network authentication protocol
pub struct AuthProtocol {
    identity: Arc<NodeIdentity>,
    trusted_keys: RwLock<HashMap<String, VerifyingKey>>,
}

impl AuthProtocol {
    /// Handshake with a peer
    pub async fn handshake(&self, stream: &mut WebSocketStream) -> Result<PeerIdentity> {
        // 1. Send our public key and challenge
        let challenge = rand::thread_rng().gen::<[u8; 32]>();
        let hello = AuthHello {
            node_id: self.identity.node_id.clone(),
            public_key: self.identity.public_key.as_bytes().to_vec(),
            challenge: challenge.to_vec(),
        };
        stream.send(Message::Binary(serde_json::to_vec(&hello)?)).await?;

        // 2. Receive peer's hello and challenge response
        let peer_hello: AuthHello = receive_message(stream).await?;
        let peer_response: AuthResponse = receive_message(stream).await?;

        // 3. Verify peer's response to our challenge
        let peer_key = VerifyingKey::from_bytes(
            peer_hello.public_key.as_slice().try_into()?
        )?;

        let expected_response = self.compute_challenge_response(&peer_key, &challenge);
        if peer_response.signature != expected_response {
            return Err(AuthError::InvalidChallengeResponse);
        }

        // 4. Send our response to peer's challenge
        let our_response = self.compute_challenge_response(
            &self.identity.public_key,
            &peer_hello.challenge
        );
        let response = AuthResponse { signature: our_response };
        stream.send(Message::Binary(serde_json::to_vec(&response)?)).await?;

        // 5. Store trusted key
        self.trusted_keys.write().await.insert(
            peer_hello.node_id.clone(),
            peer_key
        );

        Ok(PeerIdentity {
            node_id: peer_hello.node_id,
            public_key: peer_key,
        })
    }
}
```

### 11.2 Message Signing

```rust
/// All messages are signed for integrity
#[derive(Serialize, Deserialize)]
pub struct SignedMessage {
    /// Original message
    pub message: NodeMessage,

    /// Sender's node ID
    pub sender: String,

    /// Timestamp (for replay protection)
    pub timestamp: i64,

    /// Nonce (for uniqueness)
    pub nonce: u64,

    /// Signature over (message || sender || timestamp || nonce)
    pub signature: Vec<u8>,
}

impl SignedMessage {
    pub fn sign(message: NodeMessage, identity: &NodeIdentity) -> Self {
        let timestamp = Utc::now().timestamp();
        let nonce = rand::thread_rng().gen();

        let payload = Self::compute_payload(&message, &identity.node_id, timestamp, nonce);
        let signature = identity.sign(&payload);

        SignedMessage {
            message,
            sender: identity.node_id.clone(),
            timestamp,
            nonce,
            signature: signature.to_bytes().to_vec(),
        }
    }

    pub fn verify(&self, public_key: &VerifyingKey) -> bool {
        // Check timestamp (reject messages older than 5 minutes)
        let now = Utc::now().timestamp();
        if (now - self.timestamp).abs() > 300 {
            return false;
        }

        let payload = Self::compute_payload(
            &self.message,
            &self.sender,
            self.timestamp,
            self.nonce
        );

        let signature = Signature::from_bytes(
            self.signature.as_slice().try_into().unwrap()
        );

        NodeIdentity::verify(public_key, &payload, &signature)
    }
}
```

### 11.3 Access Control

```rust
/// Role-based access control
pub enum NodeRole {
    /// Full access - can modify configs, trigger builds, manage resources
    Admin,
    /// Can trigger builds, view resources, but not modify configs
    Builder,
    /// Can only observe - view resources, builds, ledger
    Observer,
}

pub struct AccessControl {
    /// Node roles
    roles: RwLock<HashMap<String, NodeRole>>,

    /// API key authentication (for external access)
    api_keys: RwLock<HashMap<String, ApiKeyInfo>>,
}

impl AccessControl {
    /// Check if node has permission for action
    pub async fn check_permission(&self, node_id: &str, action: Action) -> bool {
        let roles = self.roles.read().await;
        let role = roles.get(node_id).unwrap_or(&NodeRole::Observer);

        match (role, action) {
            // Admin can do everything
            (NodeRole::Admin, _) => true,

            // Builder can build and view
            (NodeRole::Builder, Action::TriggerBuild) => true,
            (NodeRole::Builder, Action::ViewResources) => true,
            (NodeRole::Builder, Action::ViewLedger) => true,
            (NodeRole::Builder, Action::ViewBuilds) => true,
            (NodeRole::Builder, _) => false,

            // Observer can only view
            (NodeRole::Observer, Action::ViewResources) => true,
            (NodeRole::Observer, Action::ViewLedger) => true,
            (NodeRole::Observer, Action::ViewBuilds) => true,
            (NodeRole::Observer, _) => false,
        }
    }
}

#[derive(Clone, Copy)]
pub enum Action {
    TriggerBuild,
    CancelBuild,
    ModifyConfig,
    DeleteConfig,
    ModifyResources,
    ViewResources,
    ViewLedger,
    ViewBuilds,
    ManageNodes,
}
```

---

## 12. Database Schema

### 12.1 SQLite Schema

```sql
-- Node information
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    public_key BLOB NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker',
    status TEXT NOT NULL DEFAULT 'offline',
    capabilities TEXT NOT NULL,  -- JSON
    last_seen_at INTEGER NOT NULL,
    joined_at INTEGER NOT NULL,
    UNIQUE(address)
);

-- Node resources (one row per resource type per node)
CREATE TABLE node_resources (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    resource_data TEXT NOT NULL,  -- JSON
    benchmark_data TEXT,  -- JSON
    last_updated_at INTEGER NOT NULL,
    UNIQUE(node_id, resource_type)
);

-- Build configurations
CREATE TABLE configurations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config_data TEXT NOT NULL,  -- JSON
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_category TEXT,
    UNIQUE(name)
);

-- Build history
CREATE TABLE builds (
    id TEXT PRIMARY KEY,
    config_id TEXT REFERENCES configurations(id),
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    duration_ms INTEGER,
    error TEXT,
    metrics TEXT,  -- JSON
    artifacts TEXT,  -- JSON array of artifact hashes
    triggered_by TEXT NOT NULL
);

-- Build packages (child of builds)
CREATE TABLE build_packages (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    package_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    duration_ms INTEGER,
    assigned_node TEXT REFERENCES nodes(id),
    output TEXT,
    error TEXT
);

-- Resource allocations
CREATE TABLE allocations (
    id TEXT PRIMARY KEY,
    build_id TEXT REFERENCES builds(id) ON DELETE SET NULL,
    resource_type TEXT NOT NULL,
    node_id TEXT NOT NULL REFERENCES nodes(id),
    amount TEXT NOT NULL,  -- JSON (cores, bytes, etc.)
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    released_at INTEGER
);

-- Distributed ledger
CREATE TABLE ledger (
    id TEXT PRIMARY KEY,
    sequence INTEGER NOT NULL UNIQUE,
    origin_node TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    entry_data TEXT NOT NULL,  -- JSON
    timestamp INTEGER NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
);

-- Benchmark results
CREATE TABLE benchmarks (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    benchmark_type TEXT NOT NULL,
    results TEXT NOT NULL,  -- JSON
    run_at INTEGER NOT NULL
);

-- API keys for external access
CREATE TABLE api_keys (
    id TEXT PRIMARY KEY,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    last_used_at INTEGER
);

-- Indexes
CREATE INDEX idx_nodes_status ON nodes(status);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_started ON builds(started_at DESC);
CREATE INDEX idx_ledger_sequence ON ledger(sequence);
CREATE INDEX idx_ledger_type ON ledger(entry_type);
CREATE INDEX idx_allocations_build ON allocations(build_id);
CREATE INDEX idx_allocations_expires ON allocations(expires_at);
```

---

## 13. API Specification

### 13.1 HTTP API Endpoints

```yaml
# BuildNet Distributed API

# === Node Management ===
GET /api/node
  description: Get local node status
  response: NodeStatus

POST /api/node/scan
  description: Re-scan local resources
  response: { success: boolean, resources: NodeResources }

POST /api/node/benchmark
  description: Run benchmarks
  request: { types?: BenchmarkType[] }
  response: BenchmarkResults

# === Pool Management ===
GET /api/pool
  description: Get pool status and all resources
  response: PoolVisualization

GET /api/pool/nodes
  description: List all nodes in pool
  response: { nodes: NodeVisualization[] }

GET /api/pool/resources
  description: List all pooled resources
  query: { type?: string, node?: string }
  response: { resources: PooledResource[] }

POST /api/pool/join
  description: Join a BuildNet cluster
  request: { address: string }
  response: { success: boolean, node_id: string }

POST /api/pool/leave
  description: Leave the cluster
  response: { success: boolean }

# === Configuration ===
GET /api/configs
  description: List configurations
  response: { configs: ConfigSummary[] }

GET /api/configs/:id
  description: Get configuration details
  response: BuildConfiguration

POST /api/configs
  description: Create configuration
  request: BuildConfiguration
  response: { id: string }

PUT /api/configs/:id
  description: Update configuration
  request: Partial<BuildConfiguration>
  response: { success: boolean }

DELETE /api/configs/:id
  description: Delete configuration
  response: { success: boolean }

# === Templates ===
GET /api/templates
  description: List available templates
  response: { templates: ConfigTemplate[] }

POST /api/templates
  description: Save current config as template
  request: { config_id: string, name: string, description: string }
  response: { id: string }

# === Building ===
POST /api/build
  description: Trigger a build
  request: {
    config_id?: string,
    template?: string,
    force?: boolean,
    packages?: string[]
  }
  response: { build_id: string, estimated_duration_ms: number }

GET /api/build/:id
  description: Get build status
  response: BuildStatus

POST /api/build/:id/cancel
  description: Cancel a build
  response: { success: boolean }

POST /api/build/estimate
  description: Estimate build time without running
  request: BuildConfiguration
  response: BuildEstimation

# === History & Ledger ===
GET /api/builds
  description: List build history
  query: { limit?: number, status?: string }
  response: { builds: BuildSummary[] }

GET /api/ledger
  description: Query ledger
  query: LedgerFilter
  response: { entries: LedgerEntry[] }

# === Resource Testing ===
POST /api/test/storage
  description: Test storage performance
  request: { path: string }
  response: StorageBenchmarkResult

POST /api/test/network
  description: Test network to another node
  request: { target: string }
  response: NetworkBenchmarkResult

# === WebSocket ===
WS /ws
  description: Real-time updates
  messages:
    - subscribe: { channels: string[] }
    - resource_update: ResourceUpdate
    - build_progress: BuildProgress
    - ledger_entry: LedgerEntry
    - node_status: NodeStatusUpdate
```

### 13.2 WebSocket Events

```typescript
// WebSocket event types

interface WsMessage {
  type: string;
  data: unknown;
}

// Client -> Server
interface SubscribeMessage {
  type: 'subscribe';
  channels: ('resources' | 'builds' | 'ledger' | 'nodes')[];
}

// Server -> Client
interface ResourceUpdateMessage {
  type: 'resource_update';
  node_id: string;
  resources: NodeResources;
  utilization: NodeUtilization;
}

interface BuildProgressMessage {
  type: 'build_progress';
  build_id: string;
  package: string;
  status: string;
  progress: number;  // 0.0 - 1.0
  output?: string;
}

interface LedgerEntryMessage {
  type: 'ledger_entry';
  entry: LedgerEntry;
}

interface NodeStatusMessage {
  type: 'node_status';
  node_id: string;
  status: 'online' | 'busy' | 'offline';
  reason?: string;
}
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Core resource discovery and single-node configuration

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 1 | Resource Scanner | CPU, memory, storage detection |
| 2 | Resource Scanner | Tool/runtime detection, benchmarking |
| 3 | Config System | Configuration structs, templates, storage |
| 4 | Basic API | HTTP endpoints for config and builds |

**Files to create:**
- `buildnet-core/src/resources/scanner.rs`
- `buildnet-core/src/resources/benchmark.rs`
- `buildnet-core/src/config/configuration.rs`
- `buildnet-core/src/config/templates.rs`

### Phase 2: Networking (Weeks 5-8)

**Goal:** Multi-node communication and discovery

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 5 | P2P Communication | WebSocket connections, message protocol |
| 6 | Node Discovery | Peer discovery, handshake, authentication |
| 7 | Coordinator Election | Leader election, coordinator duties |
| 8 | Resource Pooling | Virtual resource pool, aggregation |

**Files to create:**
- `buildnet-core/src/network/peer.rs`
- `buildnet-core/src/network/protocol.rs`
- `buildnet-core/src/network/discovery.rs`
- `buildnet-core/src/pool/mod.rs`

### Phase 3: Distributed Builds (Weeks 9-12)

**Goal:** Cross-node build execution

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 9 | Resource Allocation | Distributed allocation, reservations |
| 10 | Task Distribution | Task assignment, execution tracking |
| 11 | Build Orchestration | Cross-node builds, artifact transfer |
| 12 | Failure Handling | Retries, fallbacks, recovery |

**Files to create:**
- `buildnet-core/src/pool/allocator.rs`
- `buildnet-core/src/distributed/task.rs`
- `buildnet-core/src/distributed/orchestrator.rs`

### Phase 4: Ledger & History (Weeks 13-14)

**Goal:** Distributed ledger and build history

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 13 | Ledger Core | Entry structure, chain integrity |
| 14 | Ledger Sync | Cross-node synchronization |

**Files to create:**
- `buildnet-core/src/ledger/mod.rs`
- `buildnet-core/src/ledger/sync.rs`

### Phase 5: Web UI (Weeks 15-18)

**Goal:** Visual configuration builder

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 15 | UI Foundation | Pool visualization, node cards |
| 16 | Drag & Drop | Resource palette, drop zones |
| 17 | Config Builder | Visual config creation |
| 18 | Ledger View | Timeline, history display |

**Files to create:**
- `src/components/buildnet/ConfigBuilder.tsx`
- `src/components/buildnet/ResourcePalette.tsx`
- `src/components/buildnet/PoolVisualization.tsx`
- `src/components/buildnet/LedgerView.tsx`

### Phase 6: CLI & Polish (Weeks 19-20)

**Goal:** CLI interface and production readiness

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 19 | CLI | All CLI commands, interactive config |
| 20 | Polish | Documentation, testing, optimization |

**Files to create:**
- `buildnet-cli/src/main.rs`
- `buildnet-cli/src/commands/`

---

## 15. Risk Analysis

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Network partitions | Builds may fail if coordinator unreachable | Automatic coordinator re-election, local fallback |
| Resource contention | Over-allocation could degrade performance | Strict resource limits, queue overflow handling |
| Clock drift | Ledger ordering issues | NTP requirement, logical clocks |
| Large artifact transfer | Slow builds over WAN | Artifact caching, delta transfers |
| Security vulnerabilities | Unauthorized access, data leaks | Ed25519 auth, message signing, role-based access |

### Operational Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single coordinator failure | Brief unavailability | Fast election (<5s), state persistence |
| Node overload | Performance degradation | Health-based load balancing |
| Configuration errors | Failed builds | Configuration validation, dry-run mode |
| Network firewall blocks | Nodes can't communicate | Port 80 default, fallback to 443 |

### Mitigation Strategies

1. **Graceful Degradation:** If distributed features fail, fall back to local-only builds
2. **Health Monitoring:** Continuous monitoring with automatic remediation
3. **Audit Logging:** All actions logged in ledger for debugging
4. **Configuration Validation:** Validate all configs before execution
5. **Automatic Recovery:** Retry failed operations with exponential backoff

---

## Appendix A: File Structure

```
packages/buildnet-native/
├── Cargo.toml                      # Workspace manifest
├── buildnet-core/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── config/
│       │   ├── mod.rs
│       │   ├── configuration.rs    # BuildConfiguration struct
│       │   ├── templates.rs        # ConfigTemplate system
│       │   └── validation.rs       # Config validation
│       ├── resources/
│       │   ├── mod.rs
│       │   ├── scanner.rs          # Resource discovery
│       │   ├── benchmark.rs        # Performance benchmarking
│       │   ├── cpu.rs              # CPU resources
│       │   ├── memory.rs           # Memory resources
│       │   ├── storage.rs          # Storage resources
│       │   └── tools.rs            # Tool/runtime detection
│       ├── network/
│       │   ├── mod.rs
│       │   ├── peer.rs             # Peer connection management
│       │   ├── protocol.rs         # Message protocol
│       │   ├── discovery.rs        # Node discovery
│       │   └── auth.rs             # Authentication
│       ├── pool/
│       │   ├── mod.rs
│       │   ├── aggregate.rs        # Resource aggregation
│       │   ├── allocator.rs        # Resource allocation
│       │   └── visualization.rs    # Pool visualization data
│       ├── distributed/
│       │   ├── mod.rs
│       │   ├── coordinator.rs      # Coordinator logic
│       │   ├── worker.rs           # Worker logic
│       │   ├── task.rs             # Task distribution
│       │   ├── orchestrator.rs     # Build orchestration
│       │   └── election.rs         # Leader election
│       ├── ledger/
│       │   ├── mod.rs
│       │   ├── entry.rs            # Ledger entries
│       │   ├── chain.rs            # Chain integrity
│       │   └── sync.rs             # Synchronization
│       └── estimation/
│           ├── mod.rs
│           └── estimator.rs        # Build time estimation
├── buildnet-daemon/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── api.rs                  # Extended HTTP API
│       ├── websocket.rs            # WebSocket handler
│       └── cli.rs                  # CLI arguments
├── buildnet-cli/                   # NEW: Standalone CLI tool
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── node.rs
│       │   ├── pool.rs
│       │   ├── config.rs
│       │   ├── template.rs
│       │   ├── build.rs
│       │   ├── test.rs
│       │   └── ledger.rs
│       └── output.rs               # Output formatting
└── buildnet-ffi/
    ├── Cargo.toml
    └── src/
        └── lib.rs

# Frontend components
src/components/buildnet/
├── index.ts                        # Exports
├── ConfigBuilder.tsx               # Main config builder
├── ResourcePalette.tsx             # Draggable resources
├── DropZones.tsx                   # CPU/Memory/Storage drop zones
├── PoolVisualization.tsx           # Network topology view
├── NodeCard.tsx                    # Individual node display
├── LedgerView.tsx                  # Activity timeline
├── BuildEstimation.tsx             # Time estimation display
├── TemplateSelector.tsx            # Template picker
└── hooks/
    ├── useResourcePool.ts          # WebSocket hook
    ├── useBuildEstimation.ts       # Estimation hook
    └── useLedger.ts                # Ledger hook
```

---

## Appendix B: Configuration Examples

### Example 1: Local Development Build

```json
{
  "id": "local-dev",
  "name": "Local Development",
  "resources": {
    "cpu": {
      "cores": 4,
      "node_allocations": [
        { "node_id": "local", "cores": 4 }
      ],
      "priority": "normal"
    },
    "memory": {
      "gb": 8.0,
      "priority": "normal"
    },
    "storage": {
      "volumes": [
        {
          "node_id": "local",
          "path": "/Users/dev/.buildnet/cache",
          "purpose": "cache",
          "size_gb": 50
        }
      ],
      "min_class": "ssd"
    },
    "tools": [],
    "runtimes": [
      { "name": "node", "version": ">=20" }
    ]
  }
}
```

### Example 2: Distributed Full Build

```json
{
  "id": "dist-full",
  "name": "Distributed Full Build",
  "resources": {
    "cpu": {
      "cores": 12,
      "node_allocations": [
        { "node_id": "node-a", "cores": 4 },
        { "node_id": "node-b", "cores": 2 },
        { "node_id": "node-c", "cores": 6 }
      ],
      "priority": "high"
    },
    "memory": {
      "gb": 32.0,
      "node_allocations": [
        { "node_id": "node-a", "gb": 16 },
        { "node_id": "node-c", "gb": 16 }
      ],
      "priority": "high"
    },
    "storage": {
      "volumes": [
        {
          "node_id": "node-c",
          "path": "/data/builds",
          "purpose": "build",
          "size_gb": 100
        }
      ],
      "min_class": "nvme"
    },
    "tools": [
      { "name": "imagemagick" },
      { "name": "ffmpeg" }
    ],
    "runtimes": [
      { "name": "node", "version": ">=20" },
      { "name": "bun", "version": ">=1.0" }
    ]
  }
}
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Node** | A single BuildNet instance running on a machine |
| **Pool** | The aggregated view of all resources across all nodes |
| **Coordinator** | The elected leader node that manages scheduling |
| **Worker** | A node that executes build tasks |
| **Ledger** | Distributed append-only log of all activity |
| **Configuration** | A saved set of resource selections for builds |
| **Template** | A pre-defined configuration pattern |
| **Allocation** | A reserved set of resources for a build |

---

*Document end. For questions or updates, contact the development team.*
