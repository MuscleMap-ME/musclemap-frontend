# BuildNet Competitor Analysis & Feature Gap Assessment

> **Document Purpose**: Comprehensive analysis of competitor build systems to identify features BuildNet should implement to achieve market leadership.

---

## Executive Summary

BuildNet has a strong foundation with its Rust-native architecture, intelligent caching, and real-time monitoring. However, analysis of leading build systems reveals several categories of features that would significantly enhance BuildNet's capabilities:

| Priority | Feature Category | Key Competitors | BuildNet Status |
|----------|-----------------|-----------------|-----------------|
| **P0** | Remote Execution API (REAPI) | Bazel, Buck2, Pants | ❌ Missing |
| **P0** | Content-Addressable Storage | Bazel, Buck2 | ⚠️ Partial |
| **P1** | Hermetic Builds | Bazel, Earthly | ❌ Missing |
| **P1** | Dynamic Dependencies | Buck2 | ❌ Missing |
| **P1** | Build Graph Visualization | Nx, Gradle | ⚠️ Basic |
| **P2** | Test Distribution | Gradle, Nx | ❌ Missing |
| **P2** | Starlark/WASM Extensibility | Bazel, Buck2 | ⚠️ Planned |
| **P2** | Build Scans & Analytics | Gradle | ⚠️ Basic |
| **P3** | Containerized Builds | Earthly, Pants | ❌ Missing |
| **P3** | Remote Caching CDN | Nx Cloud, Gradle | ❌ Missing |

---

## Competitor Deep Dives

### 1. Bazel (Google)

**Overview**: Google's open-source build system, battle-tested at massive scale.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Remote Execution API (REAPI)** | gRPC-based protocol for distributing build actions to remote workers | P0 | High |
| **Content-Addressable Storage (CAS)** | Store build artifacts by their content hash for perfect deduplication | P0 | Medium |
| **Hermetic Builds** | Builds that are fully reproducible regardless of host environment | P1 | High |
| **Starlark Configuration** | Python-like DSL for defining build rules | P2 | Medium |
| **Action Graph** | Fine-grained dependency graph at the action level, not just package level | P1 | High |
| **Sandboxed Execution** | Isolate build actions to prevent accidental dependencies | P1 | Medium |
| **Query Language** | Rich query language for exploring the build graph | P2 | Medium |
| **Aspects** | Cross-cutting concerns that traverse the dependency graph | P3 | Medium |
| **Platforms & Toolchains** | Abstract platform configuration for cross-compilation | P2 | High |

#### REAPI Specification Details

```protobuf
// Key services in the Remote Execution API
service Execution {
  rpc Execute(ExecuteRequest) returns (stream Operation);
  rpc WaitExecution(WaitExecutionRequest) returns (stream Operation);
}

service ActionCache {
  rpc GetActionResult(GetActionResultRequest) returns (ActionResult);
  rpc UpdateActionResult(UpdateActionResultRequest) returns (ActionResult);
}

service ContentAddressableStorage {
  rpc FindMissingBlobs(FindMissingBlobsRequest) returns (FindMissingBlobsResponse);
  rpc BatchUpdateBlobs(BatchUpdateBlobsRequest) returns (BatchUpdateBlobsResponse);
  rpc BatchReadBlobs(BatchReadBlobsRequest) returns (BatchReadBlobsResponse);
  rpc GetTree(GetTreeRequest) returns (stream GetTreeResponse);
}
```

**BuildNet Implementation Recommendation**:
```rust
// Implement REAPI-compatible server in buildnet-daemon
pub mod reapi {
    use tonic::{Request, Response, Status};

    pub struct ExecutionService {
        scheduler: Arc<DistributedScheduler>,
        cas: Arc<ContentAddressableStorage>,
    }

    #[tonic::async_trait]
    impl Execution for ExecutionService {
        type ExecuteStream = ReceiverStream<Result<Operation, Status>>;

        async fn execute(
            &self,
            request: Request<ExecuteRequest>,
        ) -> Result<Response<Self::ExecuteStream>, Status> {
            // Schedule action on distributed workers
            // Stream progress updates back to client
        }
    }
}
```

---

### 2. Buck2 (Meta)

**Overview**: Meta's next-generation build system, rewritten in Rust from Buck1.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Incremental Actions** | Only re-run the specific actions that changed, not entire packages | P0 | High |
| **Dynamic Dependencies** | Dependencies that are computed during build execution | P1 | Very High |
| **Anonymous Targets** | Generate targets on-the-fly without explicit BUILD file entries | P2 | Medium |
| **BXL (Buck Extension Language)** | Introspection and scripting language for the build graph | P2 | High |
| **Deferred Computation** | Lazy evaluation of build graph for better parallelism | P1 | High |
| **Dice (Computation Engine)** | Incremental computation framework for memoized rebuilds | P1 | Very High |
| **Virtual Filesystem** | Abstract filesystem for hermetic builds | P1 | High |

#### Buck2's DICE Engine

Buck2's secret weapon is DICE (Dynamic Incremental Computation Engine):

```rust
// DICE-style incremental computation
pub trait DiceComputation {
    type Key: Hash + Eq + Clone;
    type Value: Clone;

    async fn compute(&self, key: &Self::Key, ctx: &mut DiceCtx) -> Self::Value;
}

pub struct DiceCtx {
    // Tracks which keys this computation depends on
    deps: Vec<Box<dyn Any>>,
    // Memoization cache
    cache: Arc<DashMap<TypeId, Box<dyn Any>>>,
}

impl DiceCtx {
    pub async fn compute<C: DiceComputation>(&mut self, key: C::Key) -> C::Value {
        // Record dependency
        self.deps.push(Box::new(key.clone()));

        // Check cache or compute
        self.cache
            .entry(TypeId::of::<C>())
            .or_insert_with(|| /* compute */)
    }
}
```

**BuildNet Implementation Recommendation**:
Create a `buildnet-dice` crate that provides incremental computation:

```rust
// buildnet-dice/src/lib.rs
pub struct IncrementalEngine {
    /// Version counter for change detection
    version: AtomicU64,
    /// Computation cache with version tracking
    cache: DashMap<ComputationKey, CachedValue>,
    /// Dependency graph for invalidation
    deps: DashMap<ComputationKey, HashSet<ComputationKey>>,
}

impl IncrementalEngine {
    pub async fn compute<T: Computation>(&self, key: T::Key) -> T::Output {
        // 1. Check if cached value is still valid
        // 2. If not, recompute and track dependencies
        // 3. Propagate invalidations to dependents
    }

    pub fn invalidate(&self, key: &ComputationKey) {
        // Cascade invalidation through dependency graph
    }
}
```

---

### 3. Nx (Nrwl)

**Overview**: Smart monorepo build system with cloud-based distribution.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Distributed Task Execution (DTE)** | Automatically distribute tasks across multiple agents | P0 | High |
| **Affected Commands** | Only run tasks for projects affected by changes | P1 | Medium |
| **Computation Caching** | Hash-based caching of task outputs | ✅ Have | - |
| **Task Graph Visualization** | Interactive visualization of the build graph | P1 | Medium |
| **Nx Cloud** | Cloud-hosted caching and distribution | P2 | High |
| **Project Crystal** | Infer project configuration from source code | P3 | Medium |
| **Module Boundary Rules** | Enforce architectural boundaries | P2 | Medium |
| **Generators** | Code generation from templates | P3 | Low |

#### Nx Cloud Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nx Cloud                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Cache     │    │   Task      │    │   Insights  │        │
│   │   Server    │    │   Runner    │    │   Engine    │        │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│          │                  │                  │                 │
│          └──────────────────┼──────────────────┘                │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    │  Agent Pool     │                          │
│                    │  ┌───┐ ┌───┐    │                          │
│                    │  │ A │ │ B │... │                          │
│                    │  └───┘ └───┘    │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ CI Job  │         │ CI Job  │         │ Dev     │
    │   #1    │         │   #2    │         │ Machine │
    └─────────┘         └─────────┘         └─────────┘
```

**BuildNet Implementation Recommendation**:
```rust
// Nx-style task distribution
pub struct TaskDistributor {
    /// Available execution agents
    agents: Vec<Agent>,
    /// Task queue with priorities
    queue: PriorityQueue<Task, TaskPriority>,
    /// Assignment algorithm
    scheduler: Box<dyn Scheduler>,
}

impl TaskDistributor {
    pub async fn distribute(&mut self, tasks: Vec<Task>) -> DistributionPlan {
        // 1. Analyze task graph for parallelism
        let waves = self.scheduler.compute_waves(&tasks);

        // 2. Assign tasks to agents based on:
        //    - Agent capabilities (CPU, memory, tools)
        //    - Cache locality (prefer agent with cached deps)
        //    - Current load
        let assignments = self.scheduler.assign_tasks(waves, &self.agents);

        // 3. Return execution plan
        DistributionPlan { assignments, estimated_time: ... }
    }
}
```

---

### 4. Gradle Build Tool

**Overview**: Enterprise-grade build automation with powerful caching and distribution.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Test Distribution** | Distribute test execution across multiple machines | P1 | High |
| **Build Scans** | Rich analytics and debugging for builds | P1 | Medium |
| **Configuration Cache** | Cache the configuration phase, not just outputs | P1 | Medium |
| **Predictive Test Selection** | ML-based selection of tests likely to fail | P3 | Very High |
| **Build Cache Nodes** | Distributed cache with geographic replication | P2 | High |
| **Failure Analytics** | Aggregate failure patterns across builds | P2 | Medium |
| **Flaky Test Detection** | Automatically identify and quarantine flaky tests | P2 | Medium |
| **Dependency Verification** | Cryptographic verification of dependencies | P1 | Medium |

#### Test Distribution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Gradle Enterprise                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                Test Distribution Controller              │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│   │  │ Splitter │  │ Balancer │  │ Collector│              │   │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │   │
│   └───────┼─────────────┼─────────────┼─────────────────────┘   │
│           │             │             │                          │
│   ┌───────▼─────────────▼─────────────▼─────────────────────┐   │
│   │                   Test Execution Agents                  │   │
│   │                                                          │   │
│   │   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐    │   │
│   │   │Agent 1 │   │Agent 2 │   │Agent 3 │   │Agent N │    │   │
│   │   │        │   │        │   │        │   │        │    │   │
│   │   │ Test A │   │ Test B │   │ Test C │   │ Test D │    │   │
│   │   │ Test E │   │ Test F │   │ Test G │   │ Test H │    │   │
│   │   └────────┘   └────────┘   └────────┘   └────────┘    │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**BuildNet Implementation Recommendation**:
```rust
// Test distribution module
pub struct TestDistributor {
    /// Historical test timing data
    test_history: Arc<TestHistoryStore>,
    /// Available test agents
    agents: Vec<TestAgent>,
}

impl TestDistributor {
    pub async fn distribute_tests(&self, tests: Vec<TestCase>) -> TestPlan {
        // 1. Estimate test durations from history
        let estimates = self.estimate_durations(&tests);

        // 2. Partition tests to balance total time across agents
        let partitions = self.balance_partitions(tests, estimates, self.agents.len());

        // 3. Assign partitions to agents
        let assignments = self.assign_to_agents(partitions);

        TestPlan { assignments, estimated_duration: ... }
    }

    fn balance_partitions(&self, tests: Vec<TestCase>, estimates: HashMap<TestId, Duration>, n: usize) -> Vec<Vec<TestCase>> {
        // Use bin-packing algorithm to balance test times
        // Goal: minimize max(partition_time) across all partitions
    }
}
```

---

### 5. Pants Build System

**Overview**: Python and monorepo-focused build system with excellent ergonomics.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Environments** | Define named environments for different platforms/configs | P1 | Medium |
| **Fine-grained Dependencies** | Track dependencies at file level, not package level | P1 | High |
| **Export Command** | Generate standalone deployable artifacts | P2 | Medium |
| **Tagging System** | Organize targets with custom tags for filtering | P2 | Low |
| **Lockfiles** | Generate and verify dependency lockfiles | P1 | Medium |
| **Pex/Shiv Generation** | Create self-contained Python executables | P3 | Medium |
| **Deploy Targets** | First-class support for deployment artifacts | P2 | Medium |

#### Environments System

```python
# pants.toml environment configuration
[environments-preview.names]
linux_x86_64 = "//:linux_x86_64"
linux_arm64 = "//:linux_arm64"
macos_arm64 = "//:macos_arm64"
docker = "//:docker_env"

# BUILD file
local_environment(
    name="linux_x86_64",
    compatible_platforms=["linux_x86_64"],
    fallback_environment="docker",
)

docker_environment(
    name="docker_env",
    image="python:3.11-slim",
    platform="linux_x86_64",
)
```

**BuildNet Implementation Recommendation**:
```rust
// Environment abstraction
#[derive(Debug, Clone)]
pub struct BuildEnvironment {
    pub name: String,
    pub platform: Platform,
    pub toolchains: Vec<Toolchain>,
    pub env_vars: HashMap<String, String>,
    pub execution_strategy: ExecutionStrategy,
}

#[derive(Debug, Clone)]
pub enum ExecutionStrategy {
    Local,
    Docker { image: String, volumes: Vec<Mount> },
    Remote { worker_pool: String },
    Sandbox { root: PathBuf },
}

pub struct EnvironmentResolver {
    environments: HashMap<String, BuildEnvironment>,
    platform_detector: PlatformDetector,
}

impl EnvironmentResolver {
    pub fn resolve(&self, target: &Target) -> BuildEnvironment {
        // 1. Check if target specifies environment
        // 2. Fall back to compatible environment for current platform
        // 3. Use remote/docker if no local match
    }
}
```

---

### 6. Earthly

**Overview**: Containerized builds combining Dockerfile and Makefile concepts.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Earthfile Syntax** | Familiar Dockerfile-like syntax for builds | P3 | Medium |
| **Containerized Reproducibility** | Every build runs in a container for isolation | P2 | High |
| **Satellites** | Self-hosted remote build runners | P2 | Medium |
| **Multi-platform Builds** | Build for multiple architectures in one command | P1 | High |
| **Secrets Management** | Secure secret injection into builds | P1 | Medium |
| **Interactive Debugging** | Drop into a shell in a failing build step | P2 | Medium |

#### Containerized Build Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Earthly                                 │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Earthfile                    BuildKit Daemon                │
│   ┌─────────────────┐         ┌─────────────────┐            │
│   │ VERSION 0.8     │         │  ┌───────────┐  │            │
│   │                 │ parse   │  │ LLB Graph │  │            │
│   │ base:           │ ───────▶│  └─────┬─────┘  │            │
│   │   FROM alpine   │         │        │        │            │
│   │   RUN apk add.. │         │  ┌─────▼─────┐  │            │
│   │                 │         │  │ Executor  │  │            │
│   │ build:          │         │  └─────┬─────┘  │            │
│   │   FROM +base    │         │        │        │            │
│   │   COPY . .      │         │  ┌─────▼─────┐  │            │
│   │   RUN make      │         │  │ Container │  │            │
│   │   SAVE ARTIFACT │         │  │  Runtime  │  │            │
│   └─────────────────┘         │  └───────────┘  │            │
│                               └─────────────────┘            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**BuildNet Implementation Recommendation**:
```rust
// Container-based execution
pub struct ContainerExecutor {
    runtime: ContainerRuntime, // Docker, Podman, containerd
    image_cache: ImageCache,
}

impl ContainerExecutor {
    pub async fn execute(&self, action: &BuildAction) -> ActionResult {
        // 1. Pull/build required image
        let image = self.ensure_image(&action.environment).await?;

        // 2. Create container with mounted inputs
        let container = self.runtime.create(ContainerConfig {
            image,
            mounts: self.prepare_mounts(action),
            env: action.env_vars.clone(),
            network: NetworkMode::None, // Hermetic
            resource_limits: action.limits.clone(),
        }).await?;

        // 3. Execute command
        let output = container.exec(&action.command).await?;

        // 4. Extract outputs
        self.extract_outputs(&container, &action.outputs).await
    }
}
```

---

### 7. Please Build System (Thought Machine)

**Overview**: Fast, extensible build system with excellent parallelism.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Go-based Performance** | Sub-second incremental builds | ✅ Have (Rust) | - |
| **Plugin Architecture** | First-class plugin support | P2 | Medium |
| **Remote Execution** | Built-in distributed execution | ✅ Planned | - |
| **Build Language** | Python-like configuration language | P3 | High |
| **Watch Mode** | Continuous build on file changes | P2 | Low |
| **HTTP Cache** | Built-in HTTP-based cache server | P2 | Medium |

---

### 8. Turborepo (Vercel)

**Overview**: High-performance build system for JavaScript/TypeScript monorepos.

#### Key Features BuildNet Should Adopt

| Feature | Description | Priority | Implementation Effort |
|---------|-------------|----------|----------------------|
| **Pipeline Definition** | Declarative task dependency definition | ✅ Have | - |
| **Remote Caching** | Cloud-based artifact caching | P2 | High |
| **Pruned Workspaces** | Generate minimal workspace for deployment | P2 | Medium |
| **Dry Runs** | Preview what would run without executing | ✅ Have | - |
| **Watch Mode** | Continuous execution on changes | P2 | Low |
| **Codemods** | Automated migration tools | P3 | Medium |

---

## Feature Gap Analysis Summary

### Critical Missing Features (P0)

These features are table-stakes for enterprise adoption:

| Feature | Description | Key Benefit | Complexity |
|---------|-------------|-------------|------------|
| **REAPI Compatibility** | Implement Bazel's Remote Execution API | Interoperability with existing infrastructure | High |
| **Action-Level Caching** | Cache individual build actions, not just packages | 10x better cache hit rates | High |
| **Incremental Computation** | DICE-style dependency tracking | Sub-second rebuilds | Very High |

### High Priority Features (P1)

| Feature | Description | Key Benefit | Complexity |
|---------|-------------|-------------|------------|
| **Hermetic Builds** | Fully reproducible builds | Eliminates "works on my machine" | High |
| **Test Distribution** | Distribute tests across workers | 10x faster test suites | High |
| **Dynamic Dependencies** | Runtime-computed dependencies | Support generated code | Very High |
| **Build Environments** | Named, configurable environments | Cross-platform builds | Medium |
| **Build Graph Visualization** | Interactive dependency explorer | Debugging & optimization | Medium |
| **Secrets Management** | Secure secret injection | CI/CD integration | Medium |
| **Dependency Verification** | Cryptographic dep verification | Supply chain security | Medium |

### Medium Priority Features (P2)

| Feature | Description | Key Benefit | Complexity |
|---------|-------------|-------------|------------|
| **Build Scans** | Rich build analytics | Performance optimization | Medium |
| **WASM Plugin System** | Extensible build rules | Ecosystem growth | Medium |
| **Remote Cache CDN** | Geographically distributed cache | Global team support | High |
| **Containerized Execution** | Docker-based builds | Reproducibility | High |
| **Query Language** | Graph query capabilities | Build analysis | Medium |
| **Flaky Test Detection** | Auto-detect unreliable tests | CI stability | Medium |
| **Module Boundaries** | Enforce architecture | Code quality | Medium |

### Lower Priority Features (P3)

| Feature | Description | Key Benefit | Complexity |
|---------|-------------|-------------|------------|
| **Predictive Test Selection** | ML-based test selection | Faster feedback | Very High |
| **Code Generation** | Template-based generators | Developer productivity | Low |
| **Interactive Debug** | Shell into failing builds | Debugging | Medium |
| **Configuration DSL** | Starlark-like language | Flexibility | High |

---

## Recommended Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Goal**: Establish core distributed execution capabilities

1. **REAPI-Compatible Server** (Week 1-2)
   - Implement gRPC services for Execution, ActionCache, CAS
   - Support basic action execution and caching

2. **Content-Addressable Storage** (Week 2-3)
   - Blake3-based content addressing
   - Deduplication across builds
   - Garbage collection

3. **Action-Level Granularity** (Week 3-4)
   - Break packages into individual actions
   - Track action-level dependencies
   - Implement action cache

### Phase 2: Incremental Engine (Weeks 5-8)

**Goal**: Achieve sub-second incremental builds

1. **DICE-Style Computation** (Week 5-6)
   - Incremental computation framework
   - Dependency tracking
   - Automatic invalidation

2. **Fine-Grained File Tracking** (Week 6-7)
   - File-level dependency detection
   - Automatic dependency inference
   - Import graph analysis

3. **Watch Mode** (Week 7-8)
   - File system watcher integration
   - Incremental rebuild on change
   - Hot reload support

### Phase 3: Distribution (Weeks 9-12)

**Goal**: Scale to large teams and codebases

1. **Distributed Scheduler** (Week 9-10)
   - Worker pool management
   - Intelligent task assignment
   - Load balancing

2. **Test Distribution** (Week 10-11)
   - Test splitting algorithms
   - Parallel test execution
   - Result aggregation

3. **Remote Cache** (Week 11-12)
   - HTTP cache server
   - Geographic replication
   - Cache warming strategies

### Phase 4: Enterprise Features (Weeks 13-16)

**Goal**: Production-ready for enterprise deployment

1. **Build Scans & Analytics** (Week 13-14)
   - Build timeline visualization
   - Performance profiling
   - Failure analytics

2. **Hermetic Execution** (Week 14-15)
   - Sandbox implementation
   - Container integration
   - Environment isolation

3. **Secrets Management** (Week 15-16)
   - Secure secret injection
   - Vault integration
   - Audit logging

---

## Unique BuildNet Advantages

While implementing competitor features, BuildNet should leverage its unique strengths:

### 1. Rust-Native Performance
- Zero-copy data handling
- Predictable latency without GC pauses
- Memory safety without runtime overhead

### 2. WASM Plugin Ecosystem
- Language-agnostic plugins
- Sandboxed execution
- Hot-reloadable extensions

### 3. Real-Time Bidirectional Communication
- WebSocket-based progress streaming
- Interactive build control
- Live collaboration

### 4. Intelligent Defaults
- Auto-detected project configuration
- Smart resource allocation
- Self-tuning performance

### 5. Beautiful Web UI
- Leptos-based WASM frontend
- Real-time build visualization
- Mobile-responsive design

---

## Conclusion

BuildNet has a solid foundation but needs to implement key features from established build systems to achieve competitive parity. The recommended approach is:

1. **Start with REAPI** - Enables interoperability and establishes credibility
2. **Build DICE-style incremental** - Massive performance gains
3. **Add test distribution** - High-value for enterprise adoption
4. **Polish with analytics** - Differentiate on developer experience

By implementing these features while maintaining BuildNet's Rust-native performance and WASM extensibility, the system can become a best-in-class build tool for modern development teams.

---

## Appendix: Competitor Feature Matrix

| Feature | Bazel | Buck2 | Nx | Gradle | Pants | Earthly | Turbo | BuildNet |
|---------|-------|-------|-----|--------|-------|---------|-------|----------|
| Remote Execution | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 🔜 |
| Remote Caching | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Incremental Builds | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Action-Level Cache | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | 🔜 |
| Test Distribution | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🔜 |
| Hermetic Builds | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | 🔜 |
| Container Support | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | 🔜 |
| Build Scans | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | 🔜 |
| WASM Plugins | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Web UI | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Watch Mode | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | 🔜 |
| Query Language | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | 🔜 |

Legend: ✅ = Has feature | ❌ = Missing | 🔜 = Planned

---

*Document generated: 2026-01-25*
*Last updated: 2026-01-25*
