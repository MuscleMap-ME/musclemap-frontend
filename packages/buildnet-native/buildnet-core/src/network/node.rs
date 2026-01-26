//! Node Identity and State
//!
//! Represents a node in the BuildNet network with its identity,
//! capabilities, and current state.

use crate::discovery::NodeResources;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// Unique node identifier (Ed25519 public key hash)
pub type NodeId = String;

/// Node information for network communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    /// Unique node ID
    pub id: NodeId,
    /// Human-readable name
    pub name: String,
    /// Network address
    pub address: String,
    /// Port number
    pub port: u16,
    /// Node version
    pub version: String,
    /// Node capabilities
    pub capabilities: NodeCapabilities,
    /// When node came online
    pub started_at: DateTime<Utc>,
    /// Node's public key (Ed25519)
    pub public_key: Vec<u8>,
}

/// Node capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeCapabilities {
    /// Can execute builds
    pub can_build: bool,
    /// Can store artifacts
    pub can_store: bool,
    /// Can be coordinator
    pub can_coordinate: bool,
    /// Maximum concurrent builds
    pub max_concurrent_builds: u32,
    /// Available storage in bytes
    pub available_storage_bytes: u64,
    /// CPU cores available
    pub cpu_cores: usize,
    /// Memory available in bytes
    pub memory_bytes: u64,
    /// Supported runtimes
    pub runtimes: Vec<String>,
    /// Supported tools
    pub tools: Vec<String>,
}

impl Default for NodeCapabilities {
    fn default() -> Self {
        Self {
            can_build: true,
            can_store: true,
            can_coordinate: true,
            max_concurrent_builds: 4,
            available_storage_bytes: 0,
            cpu_cores: 0,
            memory_bytes: 0,
            runtimes: vec![],
            tools: vec![],
        }
    }
}

impl NodeCapabilities {
    /// Create capabilities from discovered resources
    pub fn from_resources(resources: &NodeResources) -> Self {
        Self {
            can_build: true,
            can_store: resources.available_storage() > 1024 * 1024 * 1024, // 1GB min
            can_coordinate: true,
            max_concurrent_builds: (resources.cpu.logical_cores / 2).max(1) as u32,
            available_storage_bytes: resources.available_storage(),
            cpu_cores: resources.cpu.logical_cores,
            memory_bytes: resources.memory.available_bytes,
            runtimes: resources.runtimes.iter().map(|r| r.name.clone()).collect(),
            tools: resources.tools.iter().map(|t| t.name.clone()).collect(),
        }
    }
}

/// Node role in the network
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeRole {
    /// Worker node (executes builds)
    Worker,
    /// Coordinator (manages builds)
    Coordinator,
    /// Storage node (stores artifacts)
    Storage,
    /// Observer (read-only)
    Observer,
}

impl Default for NodeRole {
    fn default() -> Self {
        Self::Worker
    }
}

/// Node status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeStatus {
    /// Node is initializing
    Starting,
    /// Node is online and ready
    Online,
    /// Node is busy with builds
    Busy,
    /// Node is draining (finishing current work)
    Draining,
    /// Node is offline
    Offline,
    /// Node is in error state
    Error,
}

impl Default for NodeStatus {
    fn default() -> Self {
        Self::Starting
    }
}

/// Complete node state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    /// Node info
    pub info: NodeInfo,
    /// Current role
    pub role: NodeRole,
    /// Current status
    pub status: NodeStatus,
    /// Last heartbeat received
    pub last_heartbeat: DateTime<Utc>,
    /// Current load (0.0 - 1.0)
    pub load: f64,
    /// Active builds on this node
    pub active_builds: u32,
    /// Node metadata
    pub metadata: HashMap<String, String>,
    /// Network latency to this node (ms)
    pub latency_ms: Option<u32>,
}

impl Node {
    /// Create a new node
    pub fn new(info: NodeInfo) -> Self {
        Self {
            info,
            role: NodeRole::default(),
            status: NodeStatus::Starting,
            last_heartbeat: Utc::now(),
            load: 0.0,
            active_builds: 0,
            metadata: HashMap::new(),
            latency_ms: None,
        }
    }

    /// Update heartbeat timestamp
    pub fn heartbeat(&mut self) {
        self.last_heartbeat = Utc::now();
    }

    /// Check if node is healthy (recent heartbeat)
    pub fn is_healthy(&self, max_age_secs: i64) -> bool {
        let age = Utc::now().signed_duration_since(self.last_heartbeat);
        age.num_seconds() < max_age_secs && self.status != NodeStatus::Offline
    }

    /// Check if node can accept more builds
    pub fn can_accept_build(&self) -> bool {
        self.status == NodeStatus::Online
            && self.info.capabilities.can_build
            && self.active_builds < self.info.capabilities.max_concurrent_builds
            && self.load < 0.9
    }

    /// Calculate effective priority for coordinator election
    /// Higher value = more likely to become coordinator
    pub fn election_priority(&self) -> u64 {
        if !self.info.capabilities.can_coordinate {
            return 0;
        }

        let cpu_score = (self.info.capabilities.cpu_cores as u64) * 100;
        let memory_score = self.info.capabilities.memory_bytes / (1024 * 1024); // MB
        let storage_score = self.info.capabilities.available_storage_bytes / (1024 * 1024 * 1024); // GB
        let load_penalty = ((1.0 - self.load) * 100.0) as u64;

        cpu_score + memory_score / 100 + storage_score + load_penalty
    }
}

/// Node registry for tracking all known nodes
#[derive(Debug, Clone)]
pub struct NodeRegistry {
    /// Local node
    local_node: Node,
    /// Known remote nodes
    nodes: HashMap<NodeId, Node>,
    /// Current coordinator ID
    coordinator_id: Option<NodeId>,
}

impl NodeRegistry {
    /// Create a new registry with local node
    pub fn new(local_node: Node) -> Self {
        Self {
            local_node,
            nodes: HashMap::new(),
            coordinator_id: None,
        }
    }

    /// Get local node
    pub fn local(&self) -> &Node {
        &self.local_node
    }

    /// Get local node mutably
    pub fn local_mut(&mut self) -> &mut Node {
        &mut self.local_node
    }

    /// Add or update a remote node
    pub fn upsert(&mut self, node: Node) {
        self.nodes.insert(node.info.id.clone(), node);
    }

    /// Get a node by ID
    pub fn get(&self, id: &NodeId) -> Option<&Node> {
        if id == &self.local_node.info.id {
            Some(&self.local_node)
        } else {
            self.nodes.get(id)
        }
    }

    /// Remove a node
    pub fn remove(&mut self, id: &NodeId) -> Option<Node> {
        self.nodes.remove(id)
    }

    /// List all nodes (including local)
    pub fn all(&self) -> Vec<&Node> {
        let mut nodes: Vec<_> = std::iter::once(&self.local_node)
            .chain(self.nodes.values())
            .collect();
        nodes.sort_by(|a, b| a.info.id.cmp(&b.info.id));
        nodes
    }

    /// List remote nodes only
    pub fn remotes(&self) -> Vec<&Node> {
        self.nodes.values().collect()
    }

    /// List healthy nodes
    pub fn healthy(&self, max_age_secs: i64) -> Vec<&Node> {
        self.all()
            .into_iter()
            .filter(|n| n.is_healthy(max_age_secs))
            .collect()
    }

    /// List nodes that can accept builds
    pub fn available_workers(&self) -> Vec<&Node> {
        self.all()
            .into_iter()
            .filter(|n| n.can_accept_build())
            .collect()
    }

    /// Set coordinator
    pub fn set_coordinator(&mut self, id: Option<NodeId>) {
        self.coordinator_id = id;
    }

    /// Get coordinator
    pub fn coordinator(&self) -> Option<&Node> {
        self.coordinator_id.as_ref().and_then(|id| self.get(id))
    }

    /// Check if local node is coordinator
    pub fn is_local_coordinator(&self) -> bool {
        self.coordinator_id.as_ref() == Some(&self.local_node.info.id)
    }

    /// Get node count
    pub fn len(&self) -> usize {
        self.nodes.len() + 1
    }

    /// Check if registry is empty (only local node)
    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    /// Update node heartbeat
    pub fn update_heartbeat(&mut self, id: &NodeId) {
        if id == &self.local_node.info.id {
            self.local_node.heartbeat();
        } else if let Some(node) = self.nodes.get_mut(id) {
            node.heartbeat();
        }
    }

    /// Remove stale nodes
    pub fn remove_stale(&mut self, max_age_secs: i64) -> Vec<NodeId> {
        let stale: Vec<_> = self.nodes
            .iter()
            .filter(|(_, n)| !n.is_healthy(max_age_secs))
            .map(|(id, _)| id.clone())
            .collect();

        for id in &stale {
            self.nodes.remove(id);
        }

        stale
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_node(id: &str, cores: usize) -> Node {
        Node::new(NodeInfo {
            id: id.to_string(),
            name: format!("node-{}", id),
            address: "127.0.0.1".to_string(),
            port: 9877,
            version: "0.1.0".to_string(),
            capabilities: NodeCapabilities {
                cpu_cores: cores,
                ..Default::default()
            },
            started_at: Utc::now(),
            public_key: vec![],
        })
    }

    #[test]
    fn test_node_registry() {
        let local = make_node("local", 8);
        let mut registry = NodeRegistry::new(local);

        registry.upsert(make_node("remote1", 4));
        registry.upsert(make_node("remote2", 16));

        assert_eq!(registry.len(), 3);
        assert!(registry.get(&"remote1".to_string()).is_some());
    }

    #[test]
    fn test_election_priority() {
        let node1 = make_node("1", 4);
        let node2 = make_node("2", 8);

        assert!(node2.election_priority() > node1.election_priority());
    }

    #[test]
    fn test_health_check() {
        let mut node = make_node("test", 4);
        node.status = NodeStatus::Online;
        node.heartbeat();

        assert!(node.is_healthy(60));

        // Simulate old heartbeat
        node.last_heartbeat = Utc::now() - chrono::Duration::seconds(120);
        assert!(!node.is_healthy(60));
    }
}
