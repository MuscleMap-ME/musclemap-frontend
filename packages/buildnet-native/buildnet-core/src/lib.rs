//! BuildNet Core Library
//!
//! High-performance build orchestration engine with:
//! - SQLite state management (WAL mode, connection pooling)
//! - Content-addressed artifact caching
//! - File watching with debouncing
//! - Parallel build execution
//! - Cross-runtime IPC via MessagePack
//! - Multi-channel notifications (Slack, Discord, Email, SMS, Webhooks)
//! - Resource monitoring and metrics export
//! - Distributed build orchestration
//! - Template system with hot-swapping
//! - High availability with failover and replication
//! - REAPI compatibility for enterprise builds
//! - Native Cargo/Rust build support
//! - Automatic resource discovery (CPU, RAM, storage, tools, runtimes)
//! - Performance benchmarking and classification
//! - Resource pooling across distributed nodes

pub mod state;
pub mod cache;
pub mod watcher;
pub mod builder;
pub mod hasher;
pub mod config;
pub mod error;
pub mod notifications;
pub mod monitoring;
pub mod resources;
pub mod distributed;
pub mod templates;
pub mod integrations;
pub mod sessions;
pub mod redundancy;
pub mod reapi;
pub mod cargo;
pub mod discovery;
pub mod network;
pub mod ledger;

pub use error::{BuildNetError, Result};
pub use state::StateManager;
pub use cache::ArtifactCache;
pub use watcher::FileWatcher;
pub use builder::BuildOrchestrator;
pub use config::Config;
pub use notifications::{NotificationRouter, NotificationChannel, BuildNetEvent, Priority};
pub use monitoring::{ResourceMonitor, MetricsExporter};
pub use resources::{ResourceManager, CpuTier, StorageTier};
pub use distributed::{DistributedOrchestrator, WorkerNode, BuildTask};
pub use templates::{TemplateEngine, BuildTemplate};
pub use integrations::{GitHubClient, MuscleMapClient};
pub use sessions::{SessionManager, UserSession, AuthLevel};
pub use redundancy::{RedundancyCoordinator, FailoverManager, CheckpointManager};
pub use reapi::{ExecutionService, ContentAddressableStorage, ActionCache};
pub use cargo::{CargoBuilder, CargoBuildOptions, CargoBuildResult, CargoProfile, CargoWorkspace};
pub use discovery::{
    // Resource scanning
    ResourceScanner, NodeResources, ScanConfig,
    BenchmarkRunner, BenchmarkResults, StoragePerformance,
    ToolScanner, Tool, ToolCapability,
    RuntimeScanner, Runtime, RuntimeRequirement,
    CpuArchitecture, MemoryType, StorageClass, CpuInfo, MemoryInfo, StorageVolume, NetworkInterface,
    // Resource pools
    PoolManager, ResourcePool, PoolConfig, PoolTemplate, PoolStatus,
    NodeAllocation, AllocationStatus, StorageRequirement, LoadBalanceStrategy,
    // Build configurations
    BuildConfigManager, BuildConfig, BuildConfigTemplate, BuildStep, StepType,
    ShellStepConfig, ScriptStepConfig, DockerBuildConfig, DockerRunConfig,
    CargoBuildConfig, NodePackageConfig, FileSyncConfig, ArchiveConfig,
    StepResources, ArtifactConfig, CacheConfig, NotificationConfig, RetryConfig,
    // Build estimation
    BuildEstimator, BuildEstimate, StepEstimate, EstimationFactor,
};
pub use network::{
    // Node management
    Node, NodeId, NodeInfo, NodeStatus, NodeRole, NodeRegistry, NodeCapabilities,
    // Protocol
    Message, MessageType, Envelope,
    // Discovery
    NodeDiscovery, DiscoveryConfig, PeerInfo, DiscoveryMethod,
    // Coordinator election
    CoordinatorElection, ElectionState, ElectionConfig, ElectionEvent,
    // Transport
    Transport, WebSocketTransport, Connection, TransportConfig, ConnectionState, ConnectionStats,
    // Configuration
    NetworkConfig,
};
pub use ledger::{
    // Ledger entries
    DistributedLedger, LedgerConfig, LedgerEntry, EntryType, EntryId,
    BuildRecord, TaskRecord, ArtifactRecord,
    // Merkle tree
    MerkleTree, MerkleProof,
    // Synchronization
    LedgerSync, SyncState, SyncProgress,
    // Storage
    LedgerStorage, SqliteLedgerStorage, LedgerStats,
};

/// BuildNet version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Default socket path for daemon communication
pub const DEFAULT_SOCKET_PATH: &str = "/tmp/buildnet.sock";

/// Default HTTP port for API server
pub const DEFAULT_HTTP_PORT: u16 = 9876;

/// Default database path
pub const DEFAULT_DB_PATH: &str = ".buildnet/state.db";
