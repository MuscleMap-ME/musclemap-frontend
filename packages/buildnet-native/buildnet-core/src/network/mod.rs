//! Network Module
//!
//! P2P networking for distributed BuildNet nodes:
//! - Node discovery via UDP broadcast and HTTP registry
//! - WebSocket-based communication
//! - Ed25519 node authentication
//! - Coordinator election (Bully Algorithm)
//! - Message routing and forwarding

pub mod node;
pub mod protocol;
pub mod discovery;
pub mod coordinator;
pub mod transport;

pub use node::{Node, NodeId, NodeInfo, NodeStatus, NodeRole, NodeRegistry, NodeCapabilities};
pub use protocol::{Message, MessageType, Envelope};
pub use discovery::{NodeDiscovery, DiscoveryConfig, PeerInfo, DiscoveryMethod};
pub use coordinator::{CoordinatorElection, ElectionState, ElectionConfig, ElectionEvent};
pub use transport::{Transport, WebSocketTransport, Connection, TransportConfig, ConnectionState, ConnectionStats};

use serde::{Deserialize, Serialize};

/// Network configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Local node ID (generated if not provided)
    pub node_id: Option<String>,
    /// Listen address for incoming connections
    pub listen_addr: String,
    /// Listen port
    pub listen_port: u16,
    /// External address (for NAT traversal)
    pub external_addr: Option<String>,
    /// Bootstrap nodes to connect to
    pub bootstrap_nodes: Vec<String>,
    /// UDP broadcast port for local discovery
    pub broadcast_port: u16,
    /// Enable local network discovery
    pub enable_local_discovery: bool,
    /// Discovery registry URL (optional)
    pub registry_url: Option<String>,
    /// Maximum peer connections
    pub max_peers: usize,
    /// Heartbeat interval in seconds
    pub heartbeat_interval_secs: u64,
    /// Connection timeout in seconds
    pub connection_timeout_secs: u64,
    /// Message retry attempts
    pub retry_attempts: u32,
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            node_id: None,
            listen_addr: "0.0.0.0".to_string(),
            listen_port: 9877,
            external_addr: None,
            bootstrap_nodes: vec![],
            broadcast_port: 9878,
            enable_local_discovery: true,
            registry_url: None,
            max_peers: 50,
            heartbeat_interval_secs: 30,
            connection_timeout_secs: 10,
            retry_attempts: 3,
        }
    }
}
