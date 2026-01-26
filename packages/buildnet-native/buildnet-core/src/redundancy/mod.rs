//! Redundancy & Reliability
//!
//! Provides high availability features:
//! - Automatic failover between nodes
//! - State replication across cluster
//! - Build queue persistence
//! - Crash recovery
//! - Health-based leader election

pub mod failover;
pub mod replication;
pub mod recovery;
pub mod checkpoint;

pub use failover::{FailoverManager, FailoverConfig, FailoverState};
pub use replication::{StateReplicator, ReplicationConfig, ReplicaNode};
pub use recovery::{RecoveryManager, RecoveryPoint, RecoveryStrategy};
pub use checkpoint::{CheckpointManager, Checkpoint, CheckpointConfig};

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};

/// Redundancy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedundancyConfig {
    /// Enable redundancy features
    pub enabled: bool,
    /// Minimum replicas for high availability
    pub min_replicas: usize,
    /// Checkpoint interval in seconds
    pub checkpoint_interval_secs: u64,
    /// State sync interval in seconds
    pub sync_interval_secs: u64,
    /// Maximum replication lag before alert (seconds)
    pub max_replication_lag_secs: u64,
    /// Failover configuration
    pub failover: FailoverConfig,
    /// Replication configuration
    pub replication: ReplicationConfig,
    /// Recovery configuration
    pub recovery: RecoveryStrategy,
}

impl Default for RedundancyConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            min_replicas: 2,
            checkpoint_interval_secs: 300, // 5 minutes
            sync_interval_secs: 10,
            max_replication_lag_secs: 30,
            failover: FailoverConfig::default(),
            replication: ReplicationConfig::default(),
            recovery: RecoveryStrategy::default(),
        }
    }
}

/// Redundancy status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedundancyStatus {
    /// Current node role
    pub role: NodeRole,
    /// Total nodes in cluster
    pub total_nodes: usize,
    /// Healthy nodes count
    pub healthy_nodes: usize,
    /// Current leader (if not self)
    pub leader_id: Option<String>,
    /// Last checkpoint time
    pub last_checkpoint: Option<DateTime<Utc>>,
    /// Replication lag in milliseconds
    pub replication_lag_ms: u64,
    /// Is cluster healthy
    pub is_healthy: bool,
}

/// Node role in the cluster
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeRole {
    /// Leader node - handles writes
    Leader,
    /// Follower node - handles reads, replicates from leader
    Follower,
    /// Candidate - participating in election
    Candidate,
    /// Standalone - single node mode
    Standalone,
}

/// Redundancy coordinator
pub struct RedundancyCoordinator {
    /// Configuration
    config: RedundancyConfig,
    /// Node ID
    node_id: String,
    /// Current role
    role: Arc<RwLock<NodeRole>>,
    /// Failover manager
    failover: Option<Arc<FailoverManager>>,
    /// State replicator
    replicator: Option<Arc<StateReplicator>>,
    /// Recovery manager
    recovery: Arc<RecoveryManager>,
    /// Checkpoint manager
    checkpoint: Arc<CheckpointManager>,
    /// Cluster nodes
    nodes: Arc<RwLock<HashMap<String, ClusterNode>>>,
}

/// Cluster node info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterNode {
    /// Node ID
    pub id: String,
    /// Node address
    pub address: String,
    /// Node role
    pub role: NodeRole,
    /// Last heartbeat
    pub last_heartbeat: DateTime<Utc>,
    /// Is healthy
    pub is_healthy: bool,
    /// Replication position
    pub replication_position: u64,
}

impl RedundancyCoordinator {
    /// Create a new redundancy coordinator
    pub fn new(config: RedundancyConfig, node_id: &str, data_dir: &str) -> Result<Self> {
        let role = if config.enabled {
            NodeRole::Follower // Start as follower, election will determine leader
        } else {
            NodeRole::Standalone
        };

        let recovery = Arc::new(RecoveryManager::new(
            data_dir,
            config.recovery.clone(),
        )?);

        let checkpoint = Arc::new(CheckpointManager::new(
            data_dir,
            CheckpointConfig {
                interval_secs: config.checkpoint_interval_secs,
                max_checkpoints: 10,
                compression: true,
            },
        )?);

        let failover = if config.enabled {
            Some(Arc::new(FailoverManager::new(
                config.failover.clone(),
                node_id,
            )))
        } else {
            None
        };

        let replicator = if config.enabled {
            Some(Arc::new(StateReplicator::new(
                config.replication.clone(),
                node_id,
            )?))
        } else {
            None
        };

        Ok(Self {
            config,
            node_id: node_id.to_string(),
            role: Arc::new(RwLock::new(role)),
            failover,
            replicator,
            recovery,
            checkpoint,
            nodes: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Get current status
    pub fn status(&self) -> RedundancyStatus {
        let nodes = self.nodes.read();
        let healthy = nodes.values().filter(|n| n.is_healthy).count();
        let leader = nodes.values().find(|n| n.role == NodeRole::Leader);

        RedundancyStatus {
            role: *self.role.read(),
            total_nodes: nodes.len(),
            healthy_nodes: healthy,
            leader_id: leader.map(|l| l.id.clone()),
            last_checkpoint: self.checkpoint.last_checkpoint_time(),
            replication_lag_ms: self.calculate_replication_lag(),
            is_healthy: healthy >= self.config.min_replicas,
        }
    }

    /// Check if this node is the leader
    pub fn is_leader(&self) -> bool {
        *self.role.read() == NodeRole::Leader
    }

    /// Get current role
    pub fn role(&self) -> NodeRole {
        *self.role.read()
    }

    /// Register a cluster node
    pub fn register_node(&self, node: ClusterNode) {
        let mut nodes = self.nodes.write();
        nodes.insert(node.id.clone(), node);
    }

    /// Remove a cluster node
    pub fn remove_node(&self, node_id: &str) {
        let mut nodes = self.nodes.write();
        nodes.remove(node_id);
    }

    /// Update node heartbeat
    pub fn update_heartbeat(&self, node_id: &str) {
        let mut nodes = self.nodes.write();
        if let Some(node) = nodes.get_mut(node_id) {
            node.last_heartbeat = Utc::now();
            node.is_healthy = true;
        }
    }

    /// Check for failed nodes
    pub fn check_node_health(&self) {
        let now = Utc::now();
        let timeout_secs = self.config.failover.heartbeat_timeout_secs as i64;

        let mut nodes = self.nodes.write();
        for node in nodes.values_mut() {
            let elapsed = (now - node.last_heartbeat).num_seconds();
            node.is_healthy = elapsed < timeout_secs;
        }
    }

    /// Trigger failover if leader is unhealthy
    pub async fn check_failover(&self) -> Result<bool> {
        if !self.config.enabled {
            return Ok(false);
        }

        let failover = self.failover.as_ref()
            .ok_or_else(|| BuildNetError::Internal(anyhow::anyhow!("Failover not initialized")))?;

        let nodes = self.nodes.read();
        let leader = nodes.values().find(|n| n.role == NodeRole::Leader);

        if let Some(leader) = leader {
            if !leader.is_healthy && leader.id != self.node_id {
                // Leader is down, initiate election
                drop(nodes);
                return self.initiate_election().await;
            }
        } else if self.config.enabled {
            // No leader, initiate election
            drop(nodes);
            return self.initiate_election().await;
        }

        Ok(false)
    }

    /// Initiate leader election
    async fn initiate_election(&self) -> Result<bool> {
        let failover = self.failover.as_ref()
            .ok_or_else(|| BuildNetError::Internal(anyhow::anyhow!("Failover not initialized")))?;

        // Simple election: node with lowest ID becomes leader
        let nodes = self.nodes.read();
        let healthy_nodes: Vec<_> = nodes.values()
            .filter(|n| n.is_healthy)
            .collect();

        if healthy_nodes.is_empty() {
            return Err(BuildNetError::Distributed("No healthy nodes available".into()));
        }

        let new_leader_id = healthy_nodes.iter()
            .min_by_key(|n| &n.id)
            .map(|n| n.id.clone())
            .unwrap();

        drop(nodes);

        if new_leader_id == self.node_id {
            // We are the new leader
            *self.role.write() = NodeRole::Leader;
            tracing::info!("Node {} elected as leader", self.node_id);
            return Ok(true);
        }

        *self.role.write() = NodeRole::Follower;
        Ok(false)
    }

    /// Create a checkpoint
    pub async fn create_checkpoint(&self) -> Result<Checkpoint> {
        self.checkpoint.create_checkpoint().await
    }

    /// Restore from checkpoint
    pub async fn restore_checkpoint(&self, checkpoint_id: &str) -> Result<()> {
        self.checkpoint.restore_checkpoint(checkpoint_id).await
    }

    /// Start recovery process
    pub async fn recover(&self) -> Result<()> {
        self.recovery.recover().await
    }

    /// Replicate state to followers
    pub async fn replicate(&self, data: &[u8]) -> Result<()> {
        if !self.is_leader() {
            return Err(BuildNetError::Auth("Only leader can replicate".into()));
        }

        if let Some(replicator) = &self.replicator {
            let nodes = self.nodes.read();
            let followers: Vec<_> = nodes.values()
                .filter(|n| n.role == NodeRole::Follower && n.is_healthy)
                .cloned()
                .collect();
            drop(nodes);

            replicator.replicate_to_nodes(data, &followers).await?;
        }

        Ok(())
    }

    /// Calculate replication lag
    fn calculate_replication_lag(&self) -> u64 {
        if let Some(replicator) = &self.replicator {
            replicator.lag_ms()
        } else {
            0
        }
    }

    /// Step down from leader role
    pub fn step_down(&self) {
        if self.is_leader() {
            *self.role.write() = NodeRole::Follower;
            tracing::info!("Node {} stepping down from leader", self.node_id);
        }
    }
}
