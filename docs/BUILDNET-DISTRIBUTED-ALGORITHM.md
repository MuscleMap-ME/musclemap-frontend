# BuildNet Distributed Build Algorithm & Fault-Tolerant Architecture

> **Version:** 1.0.0
> **Status:** Design Specification
> **Last Updated:** 2026-01-25

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Algorithm: Distributed Work Decomposition](#core-algorithm)
3. [Stage & Chunk Decomposition](#stage-chunk-decomposition)
4. [Intelligent Distribution Engine](#intelligent-distribution-engine)
5. [Latency-Aware Scheduling](#latency-aware-scheduling)
6. [Assembly & Reassembly Protocol](#assembly-reassembly-protocol)
7. [Fault Tolerance & Graceful Degradation](#fault-tolerance)
8. [Concurrency & Atomic Locking](#concurrency-locking)
9. [Multi-Agent Support](#multi-agent-support)
10. [Bidirectional Communication Protocol](#bidirectional-communication)
11. [Audit Trail & Real-Time Monitoring](#audit-monitoring)
12. [Intelligent Defaults & Templates](#intelligent-defaults)
13. [Implementation Architecture (Rust + WASM)](#implementation-architecture)

---

## 1. Executive Summary <a name="executive-summary"></a>

BuildNet's distributed build system implements a **hierarchical task decomposition algorithm** that:

1. **Breaks builds into stages** (dependency-ordered phases)
2. **Breaks stages into chunks** (parallelizable work units)
3. **Distributes chunks intelligently** based on:
   - Worker node capabilities (BPU, storage tiers)
   - Network latency between nodes
   - Current load and availability
   - Data locality (minimizing transfers)
4. **Assembles results** at the fastest node with sufficient storage
5. **Places final artifacts** in the correct directory on the correct server

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Fault Tolerance** | N+1 redundancy, automatic failover, checkpoint recovery |
| **Graceful Degradation** | Continue with reduced capacity when nodes fail |
| **Hermetic Builds** | Isolated, reproducible execution environments |
| **Atomic Operations** | Distributed locks with fencing tokens |
| **Auditability** | Complete trace of every action with timestamps |
| **Multi-Agent Safe** | Supports concurrent users, AI agents, autonomous systems |
| **Interruptible** | Clean pause/resume at any checkpoint |
| **Network Resilient** | Handles partitions, latency spikes, packet loss |

---

## 2. Core Algorithm: Distributed Work Decomposition <a name="core-algorithm"></a>

### 2.1 Build Graph Analysis

```rust
/// The core build graph representation
pub struct BuildGraph {
    /// All packages in the workspace
    packages: Vec<Package>,
    /// Dependency edges: (from, to)
    dependencies: Vec<(PackageId, PackageId)>,
    /// Files within each package
    files: HashMap<PackageId, Vec<SourceFile>>,
    /// Computed topological order
    topo_order: Vec<PackageId>,
    /// Critical path (longest dependency chain)
    critical_path: Vec<PackageId>,
}

impl BuildGraph {
    /// Analyze and decompose the build into stages
    pub fn decompose(&self) -> Vec<BuildStage> {
        // 1. Compute topological order using Kahn's algorithm
        let topo = self.topological_sort();

        // 2. Group packages into stages (packages at same depth can run in parallel)
        let stages = self.group_by_depth(&topo);

        // 3. Within each stage, break into chunks
        stages.iter().map(|stage| {
            BuildStage {
                id: stage.id,
                packages: stage.packages.clone(),
                chunks: self.chunkify(stage),
                dependencies: stage.deps.clone(),
            }
        }).collect()
    }

    /// Break a stage into parallelizable chunks
    fn chunkify(&self, stage: &Stage) -> Vec<Chunk> {
        let mut chunks = Vec::new();

        for package in &stage.packages {
            let files = &self.files[&package.id];

            // Strategy 1: Package-level chunks (default)
            if files.len() < CHUNK_THRESHOLD {
                chunks.push(Chunk::Package(package.clone()));
            }
            // Strategy 2: File-level chunks for large packages
            else {
                for file_batch in files.chunks(FILES_PER_CHUNK) {
                    chunks.push(Chunk::Files {
                        package: package.id,
                        files: file_batch.to_vec(),
                    });
                }
            }
        }

        chunks
    }
}
```

### 2.2 Stage Definition

```rust
/// A build stage is a set of packages that can be built in parallel
/// after all their dependencies are satisfied
pub struct BuildStage {
    pub id: StageId,
    /// Packages in this stage (all have satisfied deps)
    pub packages: Vec<PackageId>,
    /// Chunks within this stage
    pub chunks: Vec<Chunk>,
    /// Which stages must complete before this one
    pub depends_on: Vec<StageId>,
    /// Estimated total BPU-seconds to complete
    pub estimated_work: f64,
    /// Priority (higher = more urgent)
    pub priority: u32,
}

/// A chunk is the smallest unit of distributable work
pub enum Chunk {
    /// Entire package (most common)
    Package(PackageId),
    /// Subset of files from a package
    Files { package: PackageId, files: Vec<SourceFile> },
    /// Linking/bundling task
    Link { inputs: Vec<ArtifactId>, output: ArtifactId },
    /// Post-processing (minification, compression)
    PostProcess { artifact: ArtifactId, operations: Vec<PostOp> },
}
```

### 2.3 Decomposition Algorithm

```
ALGORITHM: BuildDecomposition

INPUT:
  - packages: List of all packages to build
  - deps: Dependency graph between packages
  - files: Files within each package

OUTPUT:
  - stages: Ordered list of BuildStages
  - chunks: Parallelizable work units within each stage

1. TOPOLOGICAL SORT:
   a. Compute in-degree for each package
   b. Initialize queue with packages having in-degree 0
   c. Process queue, recording depth level for each package
   d. Packages at same depth form a stage

2. STAGE FORMATION:
   FOR each depth level d:
     stage[d] = { packages with depth == d }
     stage[d].depends_on = [d-1] if d > 0 else []

3. CHUNK FORMATION:
   FOR each stage s:
     FOR each package p in s:
       IF p.file_count < CHUNK_THRESHOLD:
         s.chunks.add(PackageChunk(p))
       ELSE:
         FOR batch in p.files.batches(FILES_PER_CHUNK):
           s.chunks.add(FileChunk(p, batch))

4. CRITICAL PATH ANALYSIS:
   - Identify longest dependency chain
   - Mark critical path packages as HIGH_PRIORITY
   - Chunks from critical path get scheduling preference

5. WORK ESTIMATION:
   FOR each chunk c:
     c.estimated_work = estimate_bpu_seconds(c)
   FOR each stage s:
     s.estimated_work = sum(c.estimated_work for c in s.chunks)

RETURN stages
```

---

## 3. Stage & Chunk Decomposition <a name="stage-chunk-decomposition"></a>

### 3.1 Stage Types

| Stage Type | Description | Parallelism |
|------------|-------------|-------------|
| **Foundation** | Core shared packages (no deps) | Fully parallel |
| **Core** | Packages depending only on foundation | Fully parallel |
| **Feature** | Feature packages with mixed deps | Partial parallel |
| **Integration** | Packages requiring multiple features | Limited parallel |
| **Final** | Top-level apps/binaries | Sequential |

### 3.2 Chunk Granularity Configuration

```yaml
# .buildnet/chunking.yaml
chunking:
  # Minimum files to trigger file-level chunking
  file_chunk_threshold: 100

  # Files per chunk when using file-level chunking
  files_per_chunk: 25

  # Maximum chunks per stage (prevents over-parallelization)
  max_chunks_per_stage: 50

  # Strategies by package type
  strategies:
    rust:
      mode: "package"  # Cargo handles internal parallelism
    typescript:
      mode: "file"     # TSC benefits from file-level distribution
      batch_size: 50
    assets:
      mode: "file"
      batch_size: 100  # Images/fonts can be processed individually
```

### 3.3 Dynamic Chunk Sizing

```rust
/// Dynamically adjust chunk size based on cluster state
pub fn compute_optimal_chunk_size(
    cluster: &ClusterState,
    stage: &BuildStage,
) -> ChunkConfig {
    let total_workers = cluster.available_workers();
    let total_bpu = cluster.total_bpu();
    let network_health = cluster.avg_network_latency_ms();

    // More workers = smaller chunks (more parallelism)
    let base_chunk_size = stage.total_files() / (total_workers * 2);

    // High latency = larger chunks (fewer transfers)
    let latency_factor = if network_health > 50.0 {
        2.0  // Double chunk size for high latency
    } else if network_health > 20.0 {
        1.5
    } else {
        1.0
    };

    // Ensure minimum chunk size for efficiency
    let chunk_size = (base_chunk_size as f64 * latency_factor)
        .max(MIN_CHUNK_SIZE as f64)
        .min(MAX_CHUNK_SIZE as f64) as usize;

    ChunkConfig {
        files_per_chunk: chunk_size,
        max_parallel_chunks: total_workers * 2,
    }
}
```

---

## 4. Intelligent Distribution Engine <a name="intelligent-distribution-engine"></a>

### 4.1 Worker Scoring Algorithm

```rust
/// Score a worker for a specific chunk assignment
pub fn score_worker_for_chunk(
    worker: &Worker,
    chunk: &Chunk,
    cluster: &ClusterState,
) -> WorkerScore {
    let mut score = 0.0;

    // 1. PERFORMANCE SCORE (0-40 points)
    // Higher BPU = better for compute-heavy chunks
    let bpu_score = (worker.total_bpu / cluster.max_bpu()) * 40.0;
    score += bpu_score;

    // 2. LOCALITY SCORE (0-30 points)
    // Prefer workers that already have inputs cached
    let cached_inputs = chunk.inputs.iter()
        .filter(|input| worker.has_cached(input))
        .count();
    let locality_score = (cached_inputs as f64 / chunk.inputs.len() as f64) * 30.0;
    score += locality_score;

    // 3. LATENCY SCORE (0-20 points)
    // Lower latency to coordinator = better
    let latency_ms = cluster.latency_to(worker.id);
    let latency_score = (1.0 - (latency_ms / 100.0).min(1.0)) * 20.0;
    score += latency_score;

    // 4. AVAILABILITY SCORE (0-10 points)
    // Prefer less loaded workers
    let load_factor = worker.current_load / worker.capacity;
    let availability_score = (1.0 - load_factor) * 10.0;
    score += availability_score;

    // 5. STORAGE SCORE (bonus points)
    // Bonus for having fast storage
    if worker.has_tier(StorageTier::RamDisk) && chunk.is_io_heavy() {
        score += 5.0;
    }

    WorkerScore {
        worker_id: worker.id,
        score,
        breakdown: ScoreBreakdown {
            bpu: bpu_score,
            locality: locality_score,
            latency: latency_score,
            availability: availability_score,
        },
    }
}
```

### 4.2 Distribution Strategies

```rust
pub enum DistributionStrategy {
    /// AI-optimized distribution (default)
    Smart,
    /// Equal distribution across all workers
    RoundRobin,
    /// Send to least loaded worker
    LeastLoaded,
    /// Send to fastest worker (highest BPU)
    Fastest,
    /// Keep related files on same worker (cache locality)
    Locality,
    /// Minimize network transfer
    BandwidthOptimized,
    /// Custom strategy via WASM plugin
    Custom(WasmPluginId),
}

impl Distributor {
    pub async fn distribute(
        &self,
        stage: &BuildStage,
        strategy: DistributionStrategy,
    ) -> Result<Distribution> {
        match strategy {
            DistributionStrategy::Smart => self.smart_distribute(stage).await,
            DistributionStrategy::RoundRobin => self.round_robin(stage).await,
            DistributionStrategy::LeastLoaded => self.least_loaded(stage).await,
            DistributionStrategy::Fastest => self.fastest_first(stage).await,
            DistributionStrategy::Locality => self.locality_aware(stage).await,
            DistributionStrategy::BandwidthOptimized => self.bandwidth_optimized(stage).await,
            DistributionStrategy::Custom(plugin) => {
                self.wasm_runtime.invoke_distribution(plugin, stage).await
            }
        }
    }

    /// Smart distribution using multi-factor optimization
    async fn smart_distribute(&self, stage: &BuildStage) -> Result<Distribution> {
        let workers = self.cluster.available_workers().await?;
        let mut assignments: Vec<ChunkAssignment> = Vec::new();

        // Sort chunks by estimated work (largest first)
        let mut chunks: Vec<_> = stage.chunks.iter().collect();
        chunks.sort_by(|a, b| b.estimated_work.partial_cmp(&a.estimated_work).unwrap());

        for chunk in chunks {
            // Score all workers for this chunk
            let mut scores: Vec<_> = workers.iter()
                .map(|w| score_worker_for_chunk(w, chunk, &self.cluster))
                .collect();

            // Sort by score (highest first)
            scores.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

            // Assign to best worker
            let best_worker = &scores[0];
            assignments.push(ChunkAssignment {
                chunk_id: chunk.id,
                worker_id: best_worker.worker_id,
                score: best_worker.score,
            });

            // Update worker load estimate
            self.cluster.add_pending_work(best_worker.worker_id, chunk.estimated_work);
        }

        Ok(Distribution { assignments })
    }
}
```

### 4.3 Work Stealing

```rust
/// Work stealing for load balancing
pub async fn work_stealing_loop(cluster: &ClusterState) {
    loop {
        tokio::time::sleep(WORK_STEAL_INTERVAL).await;

        let workers = cluster.workers.read().await;

        // Find overloaded and underloaded workers
        let overloaded: Vec<_> = workers.iter()
            .filter(|w| w.queue_depth > QUEUE_HIGH_WATERMARK)
            .collect();

        let underloaded: Vec<_> = workers.iter()
            .filter(|w| w.queue_depth < QUEUE_LOW_WATERMARK && w.is_healthy())
            .collect();

        // Steal work from overloaded to underloaded
        for victim in overloaded {
            if let Some(thief) = underloaded.iter()
                .filter(|t| cluster.latency_between(victim.id, t.id) < MAX_STEAL_LATENCY)
                .max_by_key(|t| t.available_bpu())
            {
                // Steal up to N chunks
                let stolen = victim.steal_chunks(CHUNKS_TO_STEAL);
                for chunk in stolen {
                    thief.enqueue(chunk).await;
                }

                audit_log!(
                    WorkSteal,
                    from = victim.id,
                    to = thief.id,
                    chunks = stolen.len()
                );
            }
        }
    }
}
```

---

## 5. Latency-Aware Scheduling <a name="latency-aware-scheduling"></a>

### 5.1 Latency Measurement

```rust
/// Continuous latency monitoring between all nodes
pub struct LatencyMonitor {
    /// Latency matrix: [from][to] -> measurements
    measurements: Arc<RwLock<HashMap<(NodeId, NodeId), LatencyStats>>>,
    /// Bandwidth estimates
    bandwidth: Arc<RwLock<HashMap<(NodeId, NodeId), BandwidthStats>>>,
}

impl LatencyMonitor {
    /// Measure latency between two nodes
    pub async fn probe(&self, from: NodeId, to: NodeId) -> Duration {
        let start = Instant::now();

        // Send probe packet
        let probe = ProbePacket {
            id: Uuid::new_v4(),
            timestamp: start,
            payload_size: PROBE_SIZE,
        };

        // Receive acknowledgment
        let ack = self.send_probe(from, to, probe).await?;

        // Calculate RTT
        let rtt = start.elapsed();
        let one_way = rtt / 2;  // Approximate

        // Update statistics
        self.update_stats(from, to, one_way).await;

        one_way
    }

    /// Get optimal path between two nodes (may be indirect)
    pub async fn optimal_path(&self, from: NodeId, to: NodeId) -> Path {
        let measurements = self.measurements.read().await;

        // Use Dijkstra's algorithm to find lowest-latency path
        let mut dist: HashMap<NodeId, Duration> = HashMap::new();
        let mut prev: HashMap<NodeId, NodeId> = HashMap::new();
        let mut pq = BinaryHeap::new();

        dist.insert(from, Duration::ZERO);
        pq.push(Reverse((Duration::ZERO, from)));

        while let Some(Reverse((d, node))) = pq.pop() {
            if node == to {
                break;
            }

            if d > dist.get(&node).copied().unwrap_or(Duration::MAX) {
                continue;
            }

            for neighbor in self.neighbors(&node) {
                let edge_latency = measurements
                    .get(&(node, neighbor))
                    .map(|s| s.p50)
                    .unwrap_or(Duration::from_millis(1000));

                let new_dist = d + edge_latency;
                if new_dist < dist.get(&neighbor).copied().unwrap_or(Duration::MAX) {
                    dist.insert(neighbor, new_dist);
                    prev.insert(neighbor, node);
                    pq.push(Reverse((new_dist, neighbor)));
                }
            }
        }

        // Reconstruct path
        let mut path = Vec::new();
        let mut current = to;
        while current != from {
            path.push(current);
            current = prev[&current];
        }
        path.push(from);
        path.reverse();

        Path {
            nodes: path,
            total_latency: dist[&to],
        }
    }
}
```

### 5.2 Latency-Based Scheduling Decisions

```rust
/// Schedule considering latency constraints
pub async fn schedule_with_latency(
    chunk: &Chunk,
    deadline: Option<Instant>,
    cluster: &ClusterState,
) -> Result<NodeId> {
    let workers = cluster.available_workers().await?;

    // If we have a deadline, filter out workers that can't meet it
    let viable_workers: Vec<_> = if let Some(deadline) = deadline {
        let remaining = deadline.saturating_duration_since(Instant::now());

        workers.into_iter().filter(|w| {
            let transfer_time = estimate_transfer_time(chunk, w, cluster);
            let compute_time = estimate_compute_time(chunk, w);
            let return_time = estimate_return_time(chunk, w, cluster);

            transfer_time + compute_time + return_time < remaining
        }).collect()
    } else {
        workers
    };

    if viable_workers.is_empty() {
        return Err(BuildError::NoViableWorkers);
    }

    // Among viable workers, pick the one with best latency profile
    let best = viable_workers.iter()
        .min_by_key(|w| {
            let to_latency = cluster.latency_to(w.id);
            let from_latency = cluster.latency_from(w.id);
            to_latency + from_latency
        })
        .unwrap();

    Ok(best.id)
}

/// Estimate time to transfer inputs to a worker
fn estimate_transfer_time(
    chunk: &Chunk,
    worker: &Worker,
    cluster: &ClusterState,
) -> Duration {
    let bytes_to_transfer: u64 = chunk.inputs.iter()
        .filter(|input| !worker.has_cached(input))
        .map(|input| input.size_bytes)
        .sum();

    let bandwidth = cluster.bandwidth_to(worker.id);
    let latency = cluster.latency_to(worker.id);

    // Time = latency + (bytes / bandwidth)
    latency + Duration::from_secs_f64(bytes_to_transfer as f64 / bandwidth as f64)
}
```

---

## 6. Assembly & Reassembly Protocol <a name="assembly-reassembly-protocol"></a>

### 6.1 Artifact Collection

```rust
/// Collect artifacts from distributed workers
pub struct ArtifactCollector {
    /// Where to assemble final results
    assembly_node: NodeId,
    /// Collected artifacts
    artifacts: Arc<RwLock<HashMap<ChunkId, Artifact>>>,
    /// Expected artifacts
    expected: HashSet<ChunkId>,
}

impl ArtifactCollector {
    /// Select optimal assembly node
    pub async fn select_assembly_node(
        cluster: &ClusterState,
        chunks: &[ChunkAssignment],
    ) -> NodeId {
        // Criteria for assembly node:
        // 1. Has sufficient storage (Tier 0 or 1)
        // 2. Low average latency to all worker nodes
        // 3. High bandwidth

        let candidates = cluster.workers_with_storage(StorageTier::NVMe).await;

        candidates.iter()
            .min_by_key(|node| {
                // Calculate average latency from all workers
                let avg_latency: Duration = chunks.iter()
                    .map(|c| cluster.latency_between(c.worker_id, node.id))
                    .sum::<Duration>() / chunks.len() as u32;
                avg_latency
            })
            .map(|n| n.id)
            .unwrap_or(cluster.coordinator_id())
    }

    /// Collect artifacts as they complete
    pub async fn collect(&self, artifact: Artifact) -> Result<()> {
        let chunk_id = artifact.chunk_id;

        // Validate artifact integrity
        let hash = blake3::hash(&artifact.data);
        if hash != artifact.expected_hash {
            return Err(BuildError::ArtifactCorrupted { chunk_id, hash });
        }

        // Store artifact
        {
            let mut artifacts = self.artifacts.write().await;
            artifacts.insert(chunk_id, artifact);
        }

        audit_log!(
            ArtifactCollected,
            chunk_id = chunk_id,
            size = artifact.data.len(),
            from = artifact.source_worker
        );

        // Check if all artifacts collected
        if self.is_complete().await {
            self.trigger_assembly().await?;
        }

        Ok(())
    }

    /// Check if all expected artifacts are collected
    pub async fn is_complete(&self) -> bool {
        let artifacts = self.artifacts.read().await;
        self.expected.iter().all(|id| artifacts.contains_key(id))
    }
}
```

### 6.2 Assembly Algorithm

```rust
/// Assemble final build output from chunks
pub async fn assemble_build(
    stage: &BuildStage,
    artifacts: &HashMap<ChunkId, Artifact>,
    config: &AssemblyConfig,
) -> Result<BuildOutput> {
    // 1. Sort artifacts by chunk order
    let mut ordered: Vec<_> = artifacts.values().collect();
    ordered.sort_by_key(|a| a.chunk_id);

    // 2. Verify all dependencies satisfied
    for artifact in &ordered {
        for dep in &artifact.dependencies {
            if !artifacts.contains_key(dep) {
                return Err(BuildError::MissingDependency {
                    chunk: artifact.chunk_id,
                    dependency: *dep,
                });
            }
        }
    }

    // 3. Merge artifacts based on type
    let output = match stage.output_type {
        OutputType::Library => {
            // Combine object files into library
            let objects: Vec<_> = ordered.iter()
                .flat_map(|a| &a.objects)
                .collect();
            link_library(&objects, &config.linker_args)?
        }
        OutputType::Binary => {
            // Link into executable
            let objects: Vec<_> = ordered.iter()
                .flat_map(|a| &a.objects)
                .collect();
            link_binary(&objects, &config.linker_args)?
        }
        OutputType::Bundle => {
            // Bundle for deployment
            let files: Vec<_> = ordered.iter()
                .flat_map(|a| &a.output_files)
                .collect();
            create_bundle(&files, &config.bundle_config)?
        }
    };

    // 4. Generate build manifest
    let manifest = BuildManifest {
        stage_id: stage.id,
        artifacts: artifacts.keys().cloned().collect(),
        output_hash: blake3::hash(&output.data),
        timestamp: Utc::now(),
    };

    Ok(BuildOutput {
        data: output.data,
        manifest,
    })
}
```

### 6.3 Final Placement

```rust
/// Place final artifacts in correct location
pub async fn place_final_artifacts(
    output: &BuildOutput,
    config: &PlacementConfig,
) -> Result<()> {
    // 1. Determine target server
    let target_server = match &config.placement_strategy {
        PlacementStrategy::Coordinator => config.coordinator_id,
        PlacementStrategy::Fastest => {
            // Place on fastest storage tier available
            config.cluster.fastest_storage_node().await?
        }
        PlacementStrategy::Specified(node) => *node,
        PlacementStrategy::Origin => config.build_origin,
    };

    // 2. Determine target directory
    let target_dir = match &config.output_dir {
        OutputDir::Package(pkg) => format!("{}/dist", pkg.path),
        OutputDir::Workspace(path) => path.clone(),
        OutputDir::Custom(path) => path.clone(),
    };

    // 3. Transfer to target
    if target_server == config.current_node {
        // Local write
        tokio::fs::write(&target_dir, &output.data).await?;
    } else {
        // Remote write via gRPC
        let client = config.cluster.client(target_server).await?;
        client.write_artifact(WriteRequest {
            path: target_dir.clone(),
            data: output.data.clone(),
            hash: output.manifest.output_hash,
        }).await?;
    }

    // 4. Verify placement
    let verification = verify_artifact(target_server, &target_dir, &output.manifest).await?;
    if !verification.success {
        return Err(BuildError::PlacementFailed {
            server: target_server,
            path: target_dir,
            reason: verification.error,
        });
    }

    audit_log!(
        ArtifactPlaced,
        server = target_server,
        path = target_dir,
        size = output.data.len(),
        hash = output.manifest.output_hash
    );

    Ok(())
}
```

---

## 7. Fault Tolerance & Graceful Degradation <a name="fault-tolerance"></a>

### 7.1 Failure Modes & Recovery

| Failure Mode | Detection | Recovery Strategy |
|--------------|-----------|-------------------|
| **Worker Crash** | Heartbeat timeout | Reassign chunks to healthy workers |
| **Network Partition** | Probe failure | Use alternate paths, local fallback |
| **Coordinator Crash** | Raft election timeout | Automatic failover to standby |
| **Disk Full** | Capacity monitoring | Overflow to lower tier, alert |
| **Memory Exhaustion** | OOM signals | Pause, reduce parallelism, retry |
| **Build Timeout** | Deadline exceeded | Kill, mark failed, retry with different strategy |
| **Corrupt Artifact** | Hash mismatch | Discard, rebuild chunk |

### 7.2 Checkpoint & Recovery

```rust
/// Checkpoint state for recovery
pub struct CheckpointManager {
    /// Persistent storage for checkpoints
    store: Arc<dyn CheckpointStore>,
    /// Current checkpoint interval
    interval: Duration,
}

impl CheckpointManager {
    /// Create checkpoint of current build state
    pub async fn checkpoint(&self, build: &BuildState) -> Result<CheckpointId> {
        let checkpoint = Checkpoint {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            build_id: build.id,
            // Completed stages
            completed_stages: build.completed_stages.clone(),
            // In-progress stage with chunk status
            current_stage: build.current_stage.as_ref().map(|s| StageCheckpoint {
                stage_id: s.id,
                completed_chunks: s.completed_chunks.clone(),
                in_progress_chunks: s.in_progress_chunks.clone(),
                pending_chunks: s.pending_chunks.clone(),
            }),
            // Collected artifacts
            artifacts: build.artifacts.clone(),
            // Configuration at time of checkpoint
            config: build.config.clone(),
        };

        // Persist checkpoint
        let id = self.store.save(&checkpoint).await?;

        // Prune old checkpoints (keep last N)
        self.store.prune(CHECKPOINT_RETENTION).await?;

        Ok(id)
    }

    /// Recover from checkpoint
    pub async fn recover(&self, checkpoint_id: CheckpointId) -> Result<BuildState> {
        let checkpoint = self.store.load(checkpoint_id).await?;

        // Reconstruct build state
        let mut build = BuildState::new(checkpoint.build_id, checkpoint.config);

        // Mark completed stages
        for stage_id in checkpoint.completed_stages {
            build.mark_stage_complete(stage_id);
        }

        // Restore current stage state
        if let Some(stage_cp) = checkpoint.current_stage {
            let stage = build.get_or_create_stage(stage_cp.stage_id);
            stage.completed_chunks = stage_cp.completed_chunks;
            stage.in_progress_chunks.clear();  // Will be requeued
            stage.pending_chunks = stage_cp.pending_chunks;

            // Requeue in-progress chunks (may have been lost)
            for chunk_id in stage_cp.in_progress_chunks {
                stage.pending_chunks.push(chunk_id);
            }
        }

        // Restore artifacts
        build.artifacts = checkpoint.artifacts;

        audit_log!(
            RecoveredFromCheckpoint,
            checkpoint_id = checkpoint_id,
            build_id = build.id,
            stages_completed = build.completed_stages.len()
        );

        Ok(build)
    }
}
```

### 7.3 Graceful Degradation

```rust
/// Gracefully degrade when capacity is reduced
pub struct DegradationManager {
    cluster: Arc<ClusterState>,
    config: DegradationConfig,
}

impl DegradationManager {
    /// Handle worker loss
    pub async fn on_worker_lost(&self, worker_id: NodeId) -> Result<()> {
        let remaining = self.cluster.healthy_workers().await;
        let lost_capacity = self.cluster.worker_bpu(worker_id);

        // Reassign chunks from lost worker
        let orphaned_chunks = self.cluster.chunks_assigned_to(worker_id).await;
        for chunk in orphaned_chunks {
            // Find new worker
            if let Some(new_worker) = self.find_replacement_worker(&chunk).await {
                self.cluster.reassign_chunk(chunk.id, new_worker).await?;
                audit_log!(ChunkReassigned, chunk = chunk.id, from = worker_id, to = new_worker);
            } else {
                // No replacement available - queue for later
                self.cluster.queue_chunk(chunk.id).await?;
                audit_log!(ChunkQueued, chunk = chunk.id, reason = "no_workers_available");
            }
        }

        // Adjust parallelism if capacity significantly reduced
        let total_capacity = self.cluster.total_bpu().await;
        if lost_capacity / total_capacity > 0.2 {
            // Lost more than 20% capacity - reduce parallelism
            let new_parallelism = (self.config.max_parallelism as f64 * 0.8) as usize;
            self.cluster.set_max_parallelism(new_parallelism).await;

            audit_log!(
                ParallelismReduced,
                new_value = new_parallelism,
                reason = "capacity_loss"
            );
        }

        Ok(())
    }

    /// Handle storage tier loss
    pub async fn on_storage_tier_lost(&self, tier: StorageTier) -> Result<()> {
        // Migrate artifacts to next best tier
        let next_tier = tier.next_lower();
        let artifacts = self.cluster.artifacts_on_tier(tier).await;

        for artifact in artifacts {
            if let Ok(target) = self.cluster.find_storage(next_tier, artifact.size).await {
                self.migrate_artifact(artifact.id, target).await?;
            }
        }

        // Update placement preferences
        self.cluster.disable_tier(tier).await;

        Ok(())
    }

    /// Emergency mode - continue with minimal resources
    pub async fn enter_emergency_mode(&self) -> Result<()> {
        // Reduce to single-threaded builds
        self.cluster.set_max_parallelism(1).await;

        // Use only local storage
        self.cluster.disable_remote_storage().await;

        // Disable optional features
        self.cluster.disable_feature(Feature::WorkStealing).await;
        self.cluster.disable_feature(Feature::Prefetching).await;

        // Notify all clients
        self.broadcast_degradation_notice(DegradationLevel::Emergency).await;

        audit_log!(EmergencyModeEntered);

        Ok(())
    }
}
```

---

## 8. Concurrency & Atomic Locking <a name="concurrency-locking"></a>

### 8.1 Distributed Lock Manager

```rust
/// Distributed lock with fencing tokens
pub struct DistributedLockManager {
    /// Lock state storage (Raft-replicated)
    state: Arc<RaftState>,
    /// Fencing token counter
    token_counter: AtomicU64,
}

impl DistributedLockManager {
    /// Acquire lock with fencing token
    pub async fn acquire(
        &self,
        resource: &str,
        holder: NodeId,
        timeout: Duration,
    ) -> Result<Lock> {
        let token = self.token_counter.fetch_add(1, Ordering::SeqCst);
        let deadline = Instant::now() + timeout;

        loop {
            // Try to acquire via Raft consensus
            let result = self.state.propose(LockOperation::Acquire {
                resource: resource.to_string(),
                holder,
                token,
                expires: Utc::now() + chrono::Duration::from_std(timeout).unwrap(),
            }).await;

            match result {
                Ok(LockResult::Acquired) => {
                    return Ok(Lock {
                        resource: resource.to_string(),
                        holder,
                        token,
                        expires: deadline,
                    });
                }
                Ok(LockResult::Held { by, token: existing_token }) => {
                    if Instant::now() > deadline {
                        return Err(LockError::Timeout);
                    }

                    // Wait and retry
                    tokio::time::sleep(LOCK_RETRY_INTERVAL).await;
                }
                Err(e) => return Err(e.into()),
            }
        }
    }

    /// Release lock
    pub async fn release(&self, lock: &Lock) -> Result<()> {
        self.state.propose(LockOperation::Release {
            resource: lock.resource.clone(),
            holder: lock.holder,
            token: lock.token,
        }).await?;

        Ok(())
    }

    /// Validate lock is still held (for fencing)
    pub async fn validate(&self, lock: &Lock) -> bool {
        self.state.query(LockQuery::IsValid {
            resource: lock.resource.clone(),
            token: lock.token,
        }).await.unwrap_or(false)
    }
}

/// Lock guard that auto-releases
pub struct LockGuard<'a> {
    manager: &'a DistributedLockManager,
    lock: Lock,
}

impl<'a> Drop for LockGuard<'a> {
    fn drop(&mut self) {
        // Spawn release task
        let manager = self.manager.clone();
        let lock = self.lock.clone();
        tokio::spawn(async move {
            let _ = manager.release(&lock).await;
        });
    }
}
```

### 8.2 Resource Locking Protocol

```rust
/// Lock resources before operating on them
pub async fn execute_with_locks<F, T>(
    resources: &[ResourceId],
    operation: F,
) -> Result<T>
where
    F: FnOnce() -> Result<T>,
{
    // Sort resources to prevent deadlocks (always acquire in same order)
    let mut sorted: Vec<_> = resources.to_vec();
    sorted.sort();

    // Acquire all locks
    let mut guards = Vec::new();
    for resource in &sorted {
        let guard = LOCK_MANAGER.acquire(resource, NODE_ID, LOCK_TIMEOUT).await?;
        guards.push(guard);
    }

    // Execute operation
    let result = operation();

    // Locks released automatically when guards drop

    result
}

/// Optimistic locking for artifacts
pub struct VersionedArtifact {
    data: Vec<u8>,
    version: u64,
}

impl VersionedArtifact {
    /// Update only if version matches
    pub async fn compare_and_swap(
        &self,
        new_data: Vec<u8>,
        expected_version: u64,
    ) -> Result<()> {
        if self.version != expected_version {
            return Err(ConcurrencyError::VersionMismatch {
                expected: expected_version,
                actual: self.version,
            });
        }

        // Atomic update
        self.data = new_data;
        self.version += 1;

        Ok(())
    }
}
```

### 8.3 Build Queue Concurrency

```rust
/// Thread-safe build queue with priority
pub struct BuildQueue {
    /// Priority queue (concurrent skip list)
    inner: Arc<SegQueue<QueuedBuild>>,
    /// Deduplication set
    pending: Arc<DashSet<BuildId>>,
    /// Active builds
    active: Arc<DashMap<BuildId, ActiveBuild>>,
    /// Semaphore for max concurrency
    concurrency: Arc<Semaphore>,
}

impl BuildQueue {
    /// Enqueue a build request
    pub async fn enqueue(&self, request: BuildRequest) -> Result<QueuePosition> {
        // Check for duplicate
        if self.pending.contains(&request.id) {
            return Err(QueueError::Duplicate);
        }

        // Add to pending set
        self.pending.insert(request.id);

        // Create queue entry
        let entry = QueuedBuild {
            id: request.id,
            priority: request.priority,
            enqueued_at: Utc::now(),
            request,
        };

        // Insert into priority queue
        self.inner.push(entry);

        Ok(self.calculate_position(request.id))
    }

    /// Dequeue next build (blocks until available)
    pub async fn dequeue(&self) -> Result<QueuedBuild> {
        // Acquire concurrency permit
        let permit = self.concurrency.acquire().await?;

        // Pop from queue
        loop {
            if let Some(entry) = self.inner.pop() {
                self.pending.remove(&entry.id);
                self.active.insert(entry.id, ActiveBuild {
                    started_at: Utc::now(),
                    permit: Some(permit),
                });
                return Ok(entry);
            }

            // Wait for new entries
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }

    /// Mark build complete (releases concurrency slot)
    pub fn complete(&self, id: BuildId) {
        self.active.remove(&id);
        // Permit dropped automatically, releasing semaphore
    }
}
```

---

## 9. Multi-Agent Support <a name="multi-agent-support"></a>

### 9.1 Agent Types

| Agent Type | Capabilities | Auth Level |
|------------|-------------|------------|
| **User** | Interactive builds, configuration | Full |
| **CI/CD** | Automated builds, limited config | Build |
| **AI Agent** | Autonomous builds, suggestions | Build |
| **Monitor** | Read-only access, metrics | Read |
| **Plugin** | Scoped operations | Scoped |

### 9.2 Multi-Agent Coordination

```rust
/// Coordinate multiple concurrent agents
pub struct AgentCoordinator {
    /// Registered agents
    agents: Arc<DashMap<AgentId, AgentState>>,
    /// Agent sessions
    sessions: Arc<DashMap<SessionId, Session>>,
    /// Build ownership
    build_owners: Arc<DashMap<BuildId, AgentId>>,
}

impl AgentCoordinator {
    /// Register a new agent
    pub async fn register(&self, agent: AgentRegistration) -> Result<AgentId> {
        let id = AgentId::new();

        // Validate credentials
        self.auth.validate(&agent.credentials).await?;

        // Create agent state
        let state = AgentState {
            id,
            agent_type: agent.agent_type,
            capabilities: self.compute_capabilities(&agent),
            registered_at: Utc::now(),
            last_seen: Utc::now(),
        };

        self.agents.insert(id, state);

        audit_log!(AgentRegistered, id = id, type = agent.agent_type);

        Ok(id)
    }

    /// Handle build request from agent
    pub async fn request_build(
        &self,
        agent_id: AgentId,
        request: BuildRequest,
    ) -> Result<BuildHandle> {
        // Validate agent can build
        let agent = self.agents.get(&agent_id)
            .ok_or(AgentError::NotRegistered)?;

        if !agent.capabilities.contains(Capability::Build) {
            return Err(AgentError::InsufficientPermissions);
        }

        // Check if agent already has active build
        if self.has_active_build(agent_id) && !agent.capabilities.contains(Capability::ParallelBuilds) {
            return Err(AgentError::BuildInProgress);
        }

        // Enqueue build
        let build_id = self.queue.enqueue(request).await?;

        // Record ownership
        self.build_owners.insert(build_id, agent_id);

        Ok(BuildHandle { id: build_id, agent_id })
    }

    /// Broadcast event to interested agents
    pub async fn broadcast(&self, event: BuildEvent) {
        let interested: Vec<_> = self.agents.iter()
            .filter(|a| a.subscribed_to(&event))
            .map(|a| a.id)
            .collect();

        for agent_id in interested {
            if let Some(session) = self.sessions.get(&agent_id) {
                let _ = session.send(event.clone()).await;
            }
        }
    }
}
```

### 9.3 AI Agent Integration

```rust
/// Special handling for AI agents (Claude, GPT, etc.)
pub struct AIAgentHandler {
    coordinator: Arc<AgentCoordinator>,
    rate_limiter: Arc<RateLimiter>,
}

impl AIAgentHandler {
    /// Handle AI agent build request
    pub async fn handle_ai_request(&self, request: AIBuildRequest) -> Result<AIBuildResponse> {
        // Rate limit AI agents
        self.rate_limiter.check(&request.agent_id).await?;

        // Validate request is safe
        self.validate_safety(&request).await?;

        // Create build with AI-specific settings
        let build_request = BuildRequest {
            packages: request.packages,
            options: BuildOptions {
                // AI agents get slightly lower priority
                priority: Priority::Normal,
                // Enable extra logging for AI debugging
                verbose: true,
                // Timeout protection
                max_duration: Duration::from_secs(3600),
                ..Default::default()
            },
            metadata: BuildMetadata {
                agent_type: AgentType::AI,
                agent_name: request.agent_name.clone(),
                ..Default::default()
            },
        };

        let handle = self.coordinator.request_build(request.agent_id, build_request).await?;

        // Return structured response for AI
        Ok(AIBuildResponse {
            build_id: handle.id,
            status: "queued",
            estimated_wait: self.estimate_wait_time(&handle).await,
            stream_url: format!("/builds/{}/events", handle.id),
        })
    }

    /// Validate AI request is safe
    async fn validate_safety(&self, request: &AIBuildRequest) -> Result<()> {
        // Prevent malicious build commands
        for package in &request.packages {
            if package.contains("..") || package.contains(";") || package.contains("&&") {
                return Err(AIError::InvalidPackageName);
            }
        }

        // Prevent excessive resource usage
        if request.packages.len() > MAX_AI_PACKAGES {
            return Err(AIError::TooManyPackages);
        }

        Ok(())
    }
}
```

---

## 10. Bidirectional Communication Protocol <a name="bidirectional-communication"></a>

### 10.1 Protocol Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       BuildNet Communication Protocol                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐                                      ┌─────────────┐      │
│   │  User/AI    │                                      │   Worker    │      │
│   │   Agent     │                                      │   Node      │      │
│   └──────┬──────┘                                      └──────┬──────┘      │
│          │                                                    │             │
│          │  1. Build Request                                  │             │
│          │ ─────────────────────►                             │             │
│          │                       ┌─────────────┐              │             │
│          │                       │ Coordinator │              │             │
│          │                       │   (Master)  │              │             │
│          │  2. Ack + BuildId     └──────┬──────┘              │             │
│          │ ◄─────────────────────       │                     │             │
│          │                              │  3. Assign Chunk    │             │
│          │                              │ ────────────────────►             │
│          │                              │                     │             │
│          │                              │  4. Progress Update │             │
│          │  5. Status Stream            │ ◄────────────────────             │
│          │ ◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                     │             │
│          │                              │  6. Chunk Complete  │             │
│          │                              │ ◄────────────────────             │
│          │  7. Build Complete           │                     │             │
│          │ ◄─────────────────────       │                     │             │
│          │                              │                     │             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 gRPC Service Definitions

```protobuf
syntax = "proto3";
package buildnet.v1;

// Master daemon service
service BuildNetDaemon {
    // Build operations
    rpc Build(BuildRequest) returns (BuildResponse);
    rpc CancelBuild(CancelRequest) returns (CancelResponse);
    rpc GetBuildStatus(StatusRequest) returns (BuildStatus);

    // Streaming operations
    rpc StreamBuildEvents(StreamRequest) returns (stream BuildEvent);
    rpc StreamLogs(LogStreamRequest) returns (stream LogEntry);

    // Cluster management
    rpc RegisterWorker(WorkerRegistration) returns (WorkerResponse);
    rpc Heartbeat(HeartbeatRequest) returns (HeartbeatResponse);
    rpc ReportProgress(ProgressReport) returns (Ack);

    // Bidirectional streaming for workers
    rpc WorkerStream(stream WorkerMessage) returns (stream CoordinatorMessage);
}

// Worker node service (called by coordinator)
service BuildNetWorker {
    rpc ExecuteChunk(ChunkRequest) returns (ChunkResponse);
    rpc CancelChunk(CancelChunkRequest) returns (Ack);
    rpc GetStatus(Empty) returns (WorkerStatus);
    rpc TransferArtifact(TransferRequest) returns (stream ArtifactChunk);
}

// Messages
message BuildEvent {
    string build_id = 1;
    EventType type = 2;
    string message = 3;
    google.protobuf.Timestamp timestamp = 4;
    map<string, string> metadata = 5;
}

message ProgressReport {
    string worker_id = 1;
    string chunk_id = 2;
    float progress = 3;  // 0.0 - 1.0
    uint64 bytes_processed = 4;
    Duration elapsed = 5;
    Duration estimated_remaining = 6;
}

message WorkerMessage {
    oneof message {
        ProgressReport progress = 1;
        ChunkComplete complete = 2;
        ChunkFailed failed = 3;
        ResourceUpdate resources = 4;
        LogEntry log = 5;
    }
}

message CoordinatorMessage {
    oneof message {
        ChunkAssignment assign = 1;
        CancelChunk cancel = 2;
        ConfigUpdate config = 3;
        Ping ping = 4;
    }
}
```

### 10.3 WebSocket Bridge for Web/CLI Clients

```rust
/// WebSocket handler for real-time client communication
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<WsParams>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state, params))
}

async fn handle_socket(socket: WebSocket, state: AppState, params: WsParams) {
    let (mut sender, mut receiver) = socket.split();

    // Authenticate
    let agent_id = match state.auth.validate_token(&params.token).await {
        Ok(id) => id,
        Err(_) => {
            let _ = sender.send(Message::Close(None)).await;
            return;
        }
    };

    // Create message channels
    let (tx, mut rx) = mpsc::channel::<ServerMessage>(100);

    // Register for events
    state.coordinator.register_listener(agent_id, tx.clone()).await;

    // Handle incoming messages
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                        handle_client_message(&state, agent_id, client_msg).await;
                    }
                }
                Ok(Message::Close(_)) => break,
                _ => {}
            }
        }
    });

    // Send outgoing messages
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let text = serde_json::to_string(&msg).unwrap();
            if sender.send(Message::Text(text)).await.is_err() {
                break;
            }
        }
    });

    // Wait for either to complete
    tokio::select! {
        _ = recv_task => {},
        _ = send_task => {},
    }

    // Cleanup
    state.coordinator.unregister_listener(agent_id).await;
}
```

---

## 11. Audit Trail & Real-Time Monitoring <a name="audit-monitoring"></a>

### 11.1 Comprehensive Audit Logging

```rust
/// Every action is logged with full context
#[derive(Debug, Clone, Serialize)]
pub struct AuditEntry {
    /// Unique entry ID
    pub id: Uuid,
    /// When this occurred
    pub timestamp: DateTime<Utc>,
    /// Type of action
    pub action: AuditAction,
    /// Who performed the action
    pub actor: Actor,
    /// What resource was affected
    pub resource: Resource,
    /// Action-specific details
    pub details: serde_json::Value,
    /// Outcome (success/failure/partial)
    pub outcome: Outcome,
    /// Duration if applicable
    pub duration: Option<Duration>,
    /// Parent action (for nested operations)
    pub parent_id: Option<Uuid>,
    /// Correlation ID (for distributed tracing)
    pub correlation_id: Uuid,
}

/// All auditable actions
#[derive(Debug, Clone, Serialize)]
pub enum AuditAction {
    // Build actions
    BuildRequested,
    BuildStarted,
    BuildCompleted,
    BuildFailed,
    BuildCancelled,

    // Stage/Chunk actions
    StageStarted,
    StageCompleted,
    ChunkAssigned,
    ChunkStarted,
    ChunkCompleted,
    ChunkFailed,
    ChunkReassigned,

    // Resource actions
    WorkerJoined,
    WorkerLeft,
    WorkerFailed,
    ResourceAllocated,
    ResourceReleased,

    // Lock actions
    LockAcquired,
    LockReleased,
    LockTimeout,

    // Transfer actions
    ArtifactTransferStarted,
    ArtifactTransferCompleted,
    ArtifactTransferFailed,

    // System actions
    ConfigChanged,
    CheckpointCreated,
    RecoveryStarted,
    EmergencyModeEntered,
    EmergencyModeExited,
}

/// Audit log storage
pub struct AuditLog {
    /// Primary storage (SQLite for reliability)
    db: SqlitePool,
    /// In-memory buffer for recent entries
    buffer: Arc<RwLock<VecDeque<AuditEntry>>>,
    /// Real-time subscribers
    subscribers: Arc<DashMap<SubscriberId, mpsc::Sender<AuditEntry>>>,
}

impl AuditLog {
    /// Log an action (non-blocking)
    pub fn log(&self, entry: AuditEntry) {
        // Buffer for immediate queries
        {
            let mut buffer = self.buffer.write().unwrap();
            buffer.push_front(entry.clone());
            if buffer.len() > AUDIT_BUFFER_SIZE {
                buffer.pop_back();
            }
        }

        // Notify subscribers
        for subscriber in self.subscribers.iter() {
            let _ = subscriber.try_send(entry.clone());
        }

        // Persist asynchronously
        let db = self.db.clone();
        let entry = entry.clone();
        tokio::spawn(async move {
            sqlx::query!(
                r#"
                INSERT INTO audit_log
                (id, timestamp, action, actor, resource, details, outcome, duration_ms, parent_id, correlation_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                entry.id.to_string(),
                entry.timestamp,
                serde_json::to_string(&entry.action).unwrap(),
                serde_json::to_string(&entry.actor).unwrap(),
                serde_json::to_string(&entry.resource).unwrap(),
                entry.details,
                serde_json::to_string(&entry.outcome).unwrap(),
                entry.duration.map(|d| d.as_millis() as i64),
                entry.parent_id.map(|id| id.to_string()),
                entry.correlation_id.to_string(),
            )
            .execute(&db)
            .await
            .ok();
        });
    }

    /// Query audit log
    pub async fn query(&self, filter: AuditFilter) -> Result<Vec<AuditEntry>> {
        // Build query based on filter
        let mut query = "SELECT * FROM audit_log WHERE 1=1".to_string();

        if let Some(action) = &filter.action {
            query.push_str(&format!(" AND action = '{}'", action));
        }
        if let Some(actor) = &filter.actor {
            query.push_str(&format!(" AND actor LIKE '%{}%'", actor));
        }
        if let Some(since) = filter.since {
            query.push_str(&format!(" AND timestamp >= '{}'", since));
        }
        if let Some(until) = filter.until {
            query.push_str(&format!(" AND timestamp <= '{}'", until));
        }
        if let Some(correlation_id) = &filter.correlation_id {
            query.push_str(&format!(" AND correlation_id = '{}'", correlation_id));
        }

        query.push_str(" ORDER BY timestamp DESC");
        query.push_str(&format!(" LIMIT {}", filter.limit.unwrap_or(100)));

        sqlx::query_as::<_, AuditEntryRow>(&query)
            .fetch_all(&self.db)
            .await?
            .into_iter()
            .map(|row| row.try_into())
            .collect()
    }
}

/// Macro for easy audit logging
#[macro_export]
macro_rules! audit_log {
    ($action:ident $(, $key:ident = $value:expr)*) => {
        AUDIT_LOG.log(AuditEntry {
            id: Uuid::new_v4(),
            timestamp: Utc::now(),
            action: AuditAction::$action,
            actor: current_actor(),
            resource: current_resource(),
            details: serde_json::json!({ $(stringify!($key): $value),* }),
            outcome: Outcome::Success,
            duration: None,
            parent_id: current_parent_action(),
            correlation_id: current_correlation_id(),
        });
    };
}
```

### 11.2 Real-Time Monitoring Dashboard

```rust
/// Metrics for monitoring
pub struct BuildMetrics {
    /// Active builds
    pub active_builds: AtomicU64,
    /// Queued builds
    pub queued_builds: AtomicU64,
    /// Completed builds (total)
    pub completed_builds: AtomicU64,
    /// Failed builds (total)
    pub failed_builds: AtomicU64,

    /// Chunks in progress
    pub active_chunks: AtomicU64,
    /// Chunks completed
    pub completed_chunks: AtomicU64,

    /// Worker count
    pub worker_count: AtomicU64,
    /// Total BPU available
    pub total_bpu: AtomicU64,
    /// BPU in use
    pub used_bpu: AtomicU64,

    /// Build time histogram (microseconds)
    pub build_time_histogram: Histogram,
    /// Chunk time histogram
    pub chunk_time_histogram: Histogram,
    /// Queue wait time histogram
    pub queue_wait_histogram: Histogram,

    /// Transfer bandwidth (bytes/sec)
    pub transfer_bandwidth: Gauge,
    /// Cache hit rate
    pub cache_hit_rate: Gauge,
}

/// Prometheus metrics endpoint
pub async fn metrics_handler(State(state): State<AppState>) -> impl IntoResponse {
    let metrics = state.metrics.export_prometheus();
    ([(header::CONTENT_TYPE, "text/plain")], metrics)
}

/// Real-time metrics stream
pub async fn metrics_stream(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = tokio_stream::wrappers::IntervalStream::new(
        tokio::time::interval(Duration::from_secs(1))
    )
    .map(move |_| {
        let snapshot = MetricsSnapshot {
            active_builds: state.metrics.active_builds.load(Ordering::Relaxed),
            queued_builds: state.metrics.queued_builds.load(Ordering::Relaxed),
            worker_count: state.metrics.worker_count.load(Ordering::Relaxed),
            total_bpu: state.metrics.total_bpu.load(Ordering::Relaxed),
            used_bpu: state.metrics.used_bpu.load(Ordering::Relaxed),
            cache_hit_rate: state.metrics.cache_hit_rate.get(),
            transfer_bandwidth: state.metrics.transfer_bandwidth.get(),
        };

        Ok(Event::default()
            .event("metrics")
            .json_data(&snapshot)
            .unwrap())
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
```

---

## 12. Intelligent Defaults & Templates <a name="intelligent-defaults"></a>

### 12.1 Automatic Resource Discovery

```rust
/// Discover and configure resources automatically
pub async fn auto_configure() -> Result<BuildNetConfig> {
    let mut config = BuildNetConfig::default();

    // 1. Discover CPU cores
    let cpu_info = sysinfo::System::new_all();
    let cores: Vec<CoreConfig> = cpu_info.cpus().iter().enumerate().map(|(id, cpu)| {
        CoreConfig {
            id,
            frequency_mhz: cpu.frequency() as u32,
            // Estimate BPU based on frequency (normalized to i5-10400)
            bpu: estimate_bpu(cpu.frequency(), cpu.brand()),
        }
    }).collect();
    config.cpu.cores = cores;
    config.cpu.allocation.default = "all";
    config.cpu.allocation.reserved_for_system = 1;

    // 2. Discover storage
    let disks = sysinfo::Disks::new_with_refreshed_list();
    for disk in disks.iter() {
        let tier = detect_storage_tier(disk);
        let benchmark = benchmark_storage(disk.mount_point()).await?;

        config.storage.tiers.push(StorageTierConfig {
            tier,
            name: disk.name().to_string_lossy().to_string(),
            path: disk.mount_point().to_string_lossy().to_string(),
            capacity_mb: disk.total_space() / 1024 / 1024,
            measured_speed_mbps: benchmark.sequential_read_mbps,
            latency_us: benchmark.latency_us,
        });
    }

    // 3. Detect memory
    let mem = sysinfo::System::new_all();
    config.memory.total_mb = mem.total_memory() / 1024 / 1024;
    config.memory.available_mb = mem.available_memory() / 1024 / 1024;
    config.memory.reserved_mb = config.memory.total_mb / 10; // Reserve 10%

    // 4. Network auto-discovery
    if let Some(coordinator) = discover_coordinator().await {
        config.network.coordinator = coordinator;
        config.network.role = NodeRole::Worker;
    } else {
        config.network.role = NodeRole::Coordinator;
    }

    // 5. Set intelligent defaults based on hardware
    config.build.max_parallelism = optimal_parallelism(&config);
    config.build.chunk_size = optimal_chunk_size(&config);
    config.build.distribution_strategy = DistributionStrategy::Smart;

    Ok(config)
}

/// Calculate optimal parallelism based on resources
fn optimal_parallelism(config: &BuildNetConfig) -> usize {
    let cpu_factor = config.cpu.cores.len();
    let memory_factor = config.memory.available_mb / 512; // ~512MB per parallel task
    let storage_factor = if config.storage.has_tier(StorageTier::NVMe) { 2 } else { 1 };

    // Use minimum of all factors
    (cpu_factor * storage_factor).min(memory_factor as usize)
}
```

### 12.2 Configuration Templates

```yaml
# templates/monorepo-large.yaml
name: "Large Monorepo"
description: "Optimized for 100+ packages"

cpu:
  allocation:
    default: "all"
    strategy: "performance"
    reserved_for_system: 2

storage:
  preferences:
    hot_artifacts: "tier_0"  # RAM disk
    active_builds: "tier_1"  # NVMe
    cache: "tier_2"          # SSD
    archives: "tier_3"       # HDD

build:
  chunking:
    mode: "adaptive"
    min_chunk_size: 10
    max_chunk_size: 100

  distribution:
    strategy: "smart"
    work_stealing: true
    prefetch_inputs: true

  caching:
    local: true
    remote: true
    artifact_ttl_days: 30

network:
  topology: "hierarchical"
  max_latency_ms: 50
  bandwidth_optimization: true

fault_tolerance:
  checkpoint_interval_secs: 60
  max_retries: 3
  graceful_degradation: true

monitoring:
  audit_level: "detailed"
  metrics_interval_secs: 5
  real_time_streaming: true

---
# templates/ci-optimized.yaml
name: "CI/CD Optimized"
description: "Fast builds for CI environments"

build:
  distribution:
    strategy: "fastest"
    parallelism: "max"

  caching:
    prefer_remote: true
    upload_artifacts: true

fault_tolerance:
  max_retries: 1
  timeout_secs: 1800
  fail_fast: true

---
# templates/bandwidth-saver.yaml
name: "Bandwidth Saver"
description: "Minimize network transfer"

build:
  distribution:
    strategy: "locality"
    prefer_local: true

  caching:
    local_only: true
    compression: "aggressive"

network:
  batch_transfers: true
  deduplication: true
```

---

## 13. Implementation Architecture (Rust + WASM) <a name="implementation-architecture"></a>

### 13.1 Pure Rust + WebAssembly Stack

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        BuildNet Technology Stack                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                          Control Plane                                   │  │
│  │                                                                          │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │  │
│  │  │   Web UI      │  │    CLI        │  │   SMS/Email   │               │  │
│  │  │   (WASM)      │  │   (Native)    │  │   (Native)    │               │  │
│  │  │   Yew/Leptos  │  │   Clap        │  │   Handlers    │               │  │
│  │  └───────────────┘  └───────────────┘  └───────────────┘               │  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Core Daemon (Rust Native)                        │  │
│  │                                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   HTTP/WS   │  │   gRPC      │  │   Raft      │  │   Plugin    │   │  │
│  │  │   Server    │  │   Server    │  │   Consensus │  │   Runtime   │   │  │
│  │  │   (Axum)    │  │   (Tonic)   │  │   (openraft)│  │   (Wasmtime)│   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   Build     │  │   Scheduler │  │   Cache     │  │   State     │   │  │
│  │  │   Engine    │  │   & Queue   │  │   Manager   │  │   Machine   │   │  │
│  │  │             │  │             │  │   (Blake3)  │  │   (SQLite)  │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Worker Nodes (Rust Native)                       │  │
│  │                                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   Task      │  │   Resource  │  │   Artifact  │  │   Sandbox   │   │  │
│  │  │   Executor  │  │   Monitor   │  │   Transfer  │  │   (WASM)    │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Plugin System (WASM)                             │  │
│  │                                                                          │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐│  │
│  │  │ Custom    │ │ Language  │ │ Notifier  │ │ Scheduler │ │ Auth      ││  │
│  │  │ Builders  │ │ Handlers  │ │ Plugins   │ │ Plugins   │ │ Plugins   ││  │
│  │  │ (.wasm)   │ │ (.wasm)   │ │ (.wasm)   │ │ (.wasm)   │ │ (.wasm)   ││  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘│  │
│  │                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Rust Crate Dependencies

```toml
# Cargo.toml - Core daemon
[dependencies]
# Async runtime
tokio = { version = "1", features = ["full"] }

# HTTP server
axum = { version = "0.7", features = ["ws"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression"] }

# gRPC
tonic = "0.11"
prost = "0.12"

# Consensus
openraft = "0.9"

# Database
rusqlite = { version = "0.31", features = ["bundled"] }
r2d2 = "0.8"
r2d2_sqlite = "0.24"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Hashing
blake3 = "1"
xxhash-rust = { version = "0.8", features = ["xxh3"] }

# WASM runtime
wasmtime = "18"
wasmtime-wasi = "18"

# System info
sysinfo = "0.30"

# Tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Utilities
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dashmap = "5"
parking_lot = "0.12"
crossbeam-queue = "0.3"
```

### 13.3 Web UI (WASM - Leptos)

```rust
// buildnet-ui/src/lib.rs
use leptos::*;
use leptos_router::*;

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <main class="app">
                <NavBar/>
                <Routes>
                    <Route path="/" view=Dashboard/>
                    <Route path="/builds" view=BuildsPage/>
                    <Route path="/builds/:id" view=BuildDetail/>
                    <Route path="/nodes" view=NodesPage/>
                    <Route path="/storage" view=StoragePage/>
                    <Route path="/queue" view=QueuePage/>
                    <Route path="/config" view=ConfigPage/>
                    <Route path="/audit" view=AuditPage/>
                </Routes>
            </main>
        </Router>
    }
}

#[component]
fn Dashboard() -> impl IntoView {
    let (metrics, set_metrics) = create_signal(MetricsSnapshot::default());

    // WebSocket connection for real-time updates
    create_effect(move |_| {
        spawn_local(async move {
            let ws = WebSocket::new("/ws/metrics").await.unwrap();
            while let Some(msg) = ws.next().await {
                if let Ok(snapshot) = serde_json::from_str::<MetricsSnapshot>(&msg) {
                    set_metrics.set(snapshot);
                }
            }
        });
    });

    view! {
        <div class="dashboard">
            <div class="metrics-grid">
                <MetricCard
                    title="Active Builds"
                    value=move || metrics.get().active_builds
                    icon="build"
                />
                <MetricCard
                    title="Workers"
                    value=move || metrics.get().worker_count
                    icon="server"
                />
                <MetricCard
                    title="BPU Usage"
                    value=move || format!("{}/{}", metrics.get().used_bpu, metrics.get().total_bpu)
                    icon="cpu"
                />
                <MetricCard
                    title="Cache Hit Rate"
                    value=move || format!("{:.1}%", metrics.get().cache_hit_rate * 100.0)
                    icon="cache"
                />
            </div>

            <div class="dashboard-panels">
                <BuildQueuePanel/>
                <ActiveBuildsPanel/>
                <ClusterTopologyPanel/>
            </div>
        </div>
    }
}
```

### 13.4 CLI (Native Rust - Clap)

```rust
// buildnet-cli/src/main.rs
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "buildnet")]
#[command(about = "BuildNet distributed build system CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Coordinator address
    #[arg(short, long, default_value = "http://localhost:9876")]
    coordinator: String,

    /// Output format
    #[arg(short, long, default_value = "text")]
    format: OutputFormat,
}

#[derive(Subcommand)]
enum Commands {
    /// Build operations
    Build {
        #[command(subcommand)]
        action: BuildAction,
    },
    /// Cluster management
    Cluster {
        #[command(subcommand)]
        action: ClusterAction,
    },
    /// Resource management
    Resources {
        #[command(subcommand)]
        action: ResourceAction,
    },
    /// Queue management
    Queue {
        #[command(subcommand)]
        action: QueueAction,
    },
    /// Real-time monitoring
    Monitor {
        /// Show build events
        #[arg(short, long)]
        builds: bool,
        /// Show cluster events
        #[arg(short, long)]
        cluster: bool,
        /// Filter by build ID
        #[arg(long)]
        build_id: Option<String>,
    },
    /// Configuration
    Config {
        #[command(subcommand)]
        action: ConfigAction,
    },
}

#[derive(Subcommand)]
enum BuildAction {
    /// Start a new build
    Start {
        /// Packages to build (empty = all)
        packages: Vec<String>,
        /// Force rebuild (ignore cache)
        #[arg(short, long)]
        force: bool,
        /// Priority level
        #[arg(short, long, default_value = "normal")]
        priority: Priority,
    },
    /// Cancel a build
    Cancel {
        build_id: String,
    },
    /// Get build status
    Status {
        build_id: String,
        /// Follow output
        #[arg(short, long)]
        follow: bool,
    },
    /// List recent builds
    List {
        #[arg(short, long, default_value = "10")]
        limit: usize,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let client = BuildNetClient::new(&cli.coordinator)?;

    match cli.command {
        Commands::Build { action } => handle_build(&client, action, cli.format).await,
        Commands::Cluster { action } => handle_cluster(&client, action, cli.format).await,
        Commands::Resources { action } => handle_resources(&client, action, cli.format).await,
        Commands::Queue { action } => handle_queue(&client, action, cli.format).await,
        Commands::Monitor { builds, cluster, build_id } => {
            handle_monitor(&client, builds, cluster, build_id).await
        }
        Commands::Config { action } => handle_config(&client, action, cli.format).await,
    }
}
```

### 13.5 WASM Plugin Interface

```rust
// buildnet-plugin-sdk/src/lib.rs
//! SDK for creating BuildNet plugins in any language that compiles to WASM

use wit_bindgen::generate;

generate!({
    world: "buildnet-plugin",
    path: "wit/buildnet.wit",
});

/// Plugin trait that all plugins must implement
pub trait BuildNetPlugin {
    /// Plugin metadata
    fn metadata(&self) -> PluginMetadata;

    /// Initialize plugin with config
    fn init(&mut self, config: PluginConfig) -> Result<(), PluginError>;

    /// Handle an event
    fn on_event(&mut self, event: BuildEvent) -> Result<EventResponse, PluginError>;

    /// Cleanup
    fn shutdown(&mut self);
}

/// Custom distribution strategy plugin
pub trait DistributionPlugin: BuildNetPlugin {
    /// Compute distribution for a stage
    fn distribute(
        &self,
        stage: &BuildStage,
        workers: &[WorkerInfo],
        cluster_state: &ClusterState,
    ) -> Result<Vec<ChunkAssignment>, PluginError>;
}

/// Custom builder plugin (for new languages)
pub trait BuilderPlugin: BuildNetPlugin {
    /// Can this plugin build the given files?
    fn can_build(&self, files: &[SourceFile]) -> bool;

    /// Build the files
    fn build(
        &self,
        files: &[SourceFile],
        options: &BuildOptions,
    ) -> Result<BuildOutput, PluginError>;
}

/// Custom notification channel plugin
pub trait NotificationPlugin: BuildNetPlugin {
    /// Send a notification
    fn send(&self, notification: Notification) -> Result<(), PluginError>;

    /// Check if channel is available
    fn is_available(&self) -> bool;
}
```

```wit
// wit/buildnet.wit
package buildnet:plugin@1.0.0;

interface types {
    record plugin-metadata {
        name: string,
        version: string,
        author: string,
        description: string,
        capabilities: list<string>,
    }

    record build-event {
        event-type: string,
        build-id: string,
        timestamp: u64,
        data: string,  // JSON
    }

    record chunk-assignment {
        chunk-id: string,
        worker-id: string,
        priority: u32,
    }

    variant plugin-error {
        invalid-config(string),
        execution-failed(string),
        unsupported-operation,
    }
}

world buildnet-plugin {
    import types;

    export metadata: func() -> types.plugin-metadata;
    export init: func(config: string) -> result<_, types.plugin-error>;
    export on-event: func(event: types.build-event) -> result<string, types.plugin-error>;
    export shutdown: func();
}
```

---

## Summary

This document specifies a comprehensive distributed build system that:

1. **Decomposes builds** into stages (dependency-ordered) and chunks (parallelizable units)
2. **Distributes intelligently** based on worker capabilities, locality, latency, and load
3. **Handles faults gracefully** with checkpoints, automatic recovery, and degradation
4. **Supports concurrent agents** including users, CI/CD, and AI agents
5. **Provides complete auditability** with real-time monitoring
6. **Uses pure Rust + WASM** for maximum performance and portability

The system is designed to be:
- **Fast**: 10-100x faster than traditional builds through intelligent caching and distribution
- **Reliable**: Fault-tolerant with automatic recovery
- **Scalable**: Handles clusters from 1 to 1000+ nodes
- **Extensible**: WASM plugin system for customization
- **Observable**: Complete audit trail and real-time metrics

---

## References

- [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis)
- [Buck2 Architecture](https://buck2.build/docs/about/why/)
- [Pants Distributed Execution](https://www.pantsbuild.org/dev/docs/using-pants/remote-caching-and-execution/remote-execution)
- [Nx Distributed Task Execution](https://nx.dev/docs/features/ci-features/distribute-task-execution)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)
- [Icecream Distributed Compiler](https://github.com/icecc/icecream)
