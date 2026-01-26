//! Node Discovery
//!
//! Discovers other BuildNet nodes on the network via:
//! - UDP broadcast on local network
//! - Bootstrap nodes
//! - Optional central registry

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::UdpSocket;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};

use super::node::{NodeId, NodeInfo};

/// Discovery configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryConfig {
    /// UDP broadcast port
    pub broadcast_port: u16,
    /// Enable local network discovery
    pub enable_local: bool,
    /// Bootstrap node addresses
    pub bootstrap_nodes: Vec<String>,
    /// Registry URL for centralized discovery
    pub registry_url: Option<String>,
    /// Discovery interval in seconds
    pub discovery_interval_secs: u64,
    /// Peer timeout in seconds
    pub peer_timeout_secs: u64,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            broadcast_port: 9878,
            enable_local: true,
            bootstrap_nodes: vec![],
            registry_url: None,
            discovery_interval_secs: 30,
            peer_timeout_secs: 90,
        }
    }
}

/// Information about a discovered peer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerInfo {
    /// Node info
    pub node_info: NodeInfo,
    /// How the peer was discovered
    pub discovery_method: DiscoveryMethod,
    /// Socket address
    pub address: SocketAddr,
    /// When first discovered
    pub discovered_at: DateTime<Utc>,
    /// When last seen
    pub last_seen: DateTime<Utc>,
    /// Number of successful connections
    pub connection_count: u32,
}

impl PeerInfo {
    /// Create new peer info
    pub fn new(node_info: NodeInfo, method: DiscoveryMethod, address: SocketAddr) -> Self {
        let now = Utc::now();
        Self {
            node_info,
            discovery_method: method,
            address,
            discovered_at: now,
            last_seen: now,
            connection_count: 0,
        }
    }

    /// Update last seen time
    pub fn seen(&mut self) {
        self.last_seen = Utc::now();
    }

    /// Check if peer is stale
    pub fn is_stale(&self, timeout_secs: u64) -> bool {
        let age = Utc::now().signed_duration_since(self.last_seen);
        age.num_seconds() > timeout_secs as i64
    }
}

/// How a peer was discovered
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiscoveryMethod {
    /// Local network broadcast
    LocalBroadcast,
    /// Bootstrap node
    Bootstrap,
    /// Central registry
    Registry,
    /// Peer exchange
    PeerExchange,
    /// Manual configuration
    Manual,
}

/// UDP discovery message
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DiscoveryMessage {
    /// Message type
    msg_type: DiscoveryMessageType,
    /// Node info (for announce)
    node_info: Option<NodeInfo>,
    /// Protocol version
    version: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
enum DiscoveryMessageType {
    /// Looking for peers
    Query,
    /// Announcing presence
    Announce,
}

/// Node discovery service
pub struct NodeDiscovery {
    config: DiscoveryConfig,
    local_node_info: NodeInfo,
    peers: Arc<RwLock<HashMap<NodeId, PeerInfo>>>,
    udp_socket: Option<Arc<UdpSocket>>,
    running: Arc<RwLock<bool>>,
}

impl NodeDiscovery {
    /// Create a new discovery service
    pub fn new(config: DiscoveryConfig, local_node_info: NodeInfo) -> Self {
        Self {
            config,
            local_node_info,
            peers: Arc::new(RwLock::new(HashMap::new())),
            udp_socket: None,
            running: Arc::new(RwLock::new(false)),
        }
    }

    /// Start discovery service
    pub async fn start(&mut self) -> Result<()> {
        *self.running.write().await = true;

        // Bind UDP socket for local discovery
        if self.config.enable_local {
            let addr = format!("0.0.0.0:{}", self.config.broadcast_port);
            match UdpSocket::bind(&addr).await {
                Ok(socket) => {
                    socket.set_broadcast(true)?;
                    self.udp_socket = Some(Arc::new(socket));
                    tracing::info!("Discovery listening on {}", addr);
                }
                Err(e) => {
                    tracing::warn!("Failed to bind UDP socket: {}", e);
                }
            }
        }

        // Connect to bootstrap nodes
        for bootstrap in &self.config.bootstrap_nodes {
            if let Err(e) = self.connect_bootstrap(bootstrap).await {
                tracing::warn!("Failed to connect to bootstrap node {}: {}", bootstrap, e);
            }
        }

        // Register with central registry if configured
        if let Some(ref url) = self.config.registry_url {
            if let Err(e) = self.register_with_registry(url).await {
                tracing::warn!("Failed to register with registry: {}", e);
            }
        }

        Ok(())
    }

    /// Stop discovery service
    pub async fn stop(&mut self) {
        *self.running.write().await = false;
    }

    /// Run discovery loop
    pub async fn run(&self) -> Result<()> {
        let socket = match &self.udp_socket {
            Some(s) => s.clone(),
            None => return Ok(()),
        };

        let mut buf = vec![0u8; 65535];
        let mut interval = tokio::time::interval(
            std::time::Duration::from_secs(self.config.discovery_interval_secs)
        );

        while *self.running.read().await {
            tokio::select! {
                // Listen for incoming messages
                result = socket.recv_from(&mut buf) => {
                    match result {
                        Ok((len, addr)) => {
                            if let Ok(msg) = rmp_serde::from_slice::<DiscoveryMessage>(&buf[..len]) {
                                self.handle_discovery_message(msg, addr).await;
                            }
                        }
                        Err(e) => {
                            tracing::debug!("UDP recv error: {}", e);
                        }
                    }
                }

                // Periodic announcement
                _ = interval.tick() => {
                    self.broadcast_announce().await;
                    self.cleanup_stale_peers().await;
                }
            }
        }

        Ok(())
    }

    /// Broadcast announce message
    async fn broadcast_announce(&self) {
        if let Some(ref socket) = self.udp_socket {
            let msg = DiscoveryMessage {
                msg_type: DiscoveryMessageType::Announce,
                node_info: Some(self.local_node_info.clone()),
                version: 1,
            };

            if let Ok(data) = rmp_serde::to_vec(&msg) {
                let broadcast_addr = format!("255.255.255.255:{}", self.config.broadcast_port);
                if let Err(e) = socket.send_to(&data, &broadcast_addr).await {
                    tracing::debug!("Broadcast failed: {}", e);
                }
            }
        }
    }

    /// Handle incoming discovery message
    async fn handle_discovery_message(&self, msg: DiscoveryMessage, addr: SocketAddr) {
        match msg.msg_type {
            DiscoveryMessageType::Query => {
                // Respond with our info
                self.send_announce_to(addr).await;
            }
            DiscoveryMessageType::Announce => {
                if let Some(node_info) = msg.node_info {
                    // Don't add ourselves
                    if node_info.id == self.local_node_info.id {
                        return;
                    }

                    let peer = PeerInfo::new(node_info, DiscoveryMethod::LocalBroadcast, addr);
                    self.add_peer(peer).await;
                }
            }
        }
    }

    /// Send announce to specific address
    async fn send_announce_to(&self, addr: SocketAddr) {
        if let Some(ref socket) = self.udp_socket {
            let msg = DiscoveryMessage {
                msg_type: DiscoveryMessageType::Announce,
                node_info: Some(self.local_node_info.clone()),
                version: 1,
            };

            if let Ok(data) = rmp_serde::to_vec(&msg) {
                let _ = socket.send_to(&data, addr).await;
            }
        }
    }

    /// Connect to a bootstrap node
    async fn connect_bootstrap(&self, address: &str) -> Result<()> {
        // Parse address and fetch node info via HTTP
        let url = format!("http://{}/buildnet/node-info", address);
        let response = reqwest::get(&url).await?;

        if response.status().is_success() {
            let node_info: NodeInfo = response.json().await?;

            // Don't add ourselves
            if node_info.id != self.local_node_info.id {
                let addr: SocketAddr = address.parse().map_err(|e| {
                    crate::BuildNetError::Network(format!("Invalid address: {}", e))
                })?;
                let peer = PeerInfo::new(node_info, DiscoveryMethod::Bootstrap, addr);
                self.add_peer(peer).await;
            }
        }

        Ok(())
    }

    /// Register with central registry
    async fn register_with_registry(&self, registry_url: &str) -> Result<()> {
        let url = format!("{}/api/nodes/register", registry_url);
        let client = reqwest::Client::new();

        let response = client
            .post(&url)
            .json(&self.local_node_info)
            .send()
            .await?;

        if response.status().is_success() {
            // Fetch other nodes from registry
            let nodes_url = format!("{}/api/nodes", registry_url);
            let response = client.get(&nodes_url).send().await?;

            if response.status().is_success() {
                let nodes: Vec<NodeInfo> = response.json().await?;
                for node_info in nodes {
                    if node_info.id != self.local_node_info.id {
                        let addr: SocketAddr = format!("{}:{}", node_info.address, node_info.port)
                            .parse()
                            .unwrap_or_else(|_| "0.0.0.0:0".parse().unwrap());
                        let peer = PeerInfo::new(node_info, DiscoveryMethod::Registry, addr);
                        self.add_peer(peer).await;
                    }
                }
            }
        }

        Ok(())
    }

    /// Add a discovered peer
    async fn add_peer(&self, peer: PeerInfo) {
        let id = peer.node_info.id.clone();
        let mut peers = self.peers.write().await;

        if let Some(existing) = peers.get_mut(&id) {
            existing.seen();
            existing.connection_count += 1;
        } else {
            tracing::info!("Discovered peer: {} at {}", id, peer.address);
            peers.insert(id, peer);
        }
    }

    /// Update peer last seen time
    pub async fn peer_seen(&self, id: &NodeId) {
        let mut peers = self.peers.write().await;
        if let Some(peer) = peers.get_mut(id) {
            peer.seen();
        }
    }

    /// Get all discovered peers
    pub async fn peers(&self) -> Vec<PeerInfo> {
        self.peers.read().await.values().cloned().collect()
    }

    /// Get a specific peer
    pub async fn get_peer(&self, id: &NodeId) -> Option<PeerInfo> {
        self.peers.read().await.get(id).cloned()
    }

    /// Remove a peer
    pub async fn remove_peer(&self, id: &NodeId) {
        self.peers.write().await.remove(id);
    }

    /// Cleanup stale peers
    async fn cleanup_stale_peers(&self) {
        let timeout = self.config.peer_timeout_secs;
        let mut peers = self.peers.write().await;
        let stale: Vec<_> = peers
            .iter()
            .filter(|(_, p)| p.is_stale(timeout))
            .map(|(id, _)| id.clone())
            .collect();

        for id in stale {
            tracing::info!("Removing stale peer: {}", id);
            peers.remove(&id);
        }
    }

    /// Add peer manually
    pub async fn add_manual_peer(&self, node_info: NodeInfo, address: SocketAddr) {
        let peer = PeerInfo::new(node_info, DiscoveryMethod::Manual, address);
        self.add_peer(peer).await;
    }

    /// Get peer count
    pub async fn peer_count(&self) -> usize {
        self.peers.read().await.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_node_info(id: &str) -> NodeInfo {
        NodeInfo {
            id: id.to_string(),
            name: format!("node-{}", id),
            address: "127.0.0.1".to_string(),
            port: 9877,
            version: "0.1.0".to_string(),
            capabilities: super::super::node::NodeCapabilities::default(),
            started_at: Utc::now(),
            public_key: vec![],
        }
    }

    #[tokio::test]
    async fn test_discovery_basic() {
        let config = DiscoveryConfig {
            enable_local: false, // Don't try to bind UDP in test
            ..Default::default()
        };
        let local_info = make_node_info("local");
        let discovery = NodeDiscovery::new(config, local_info);

        assert_eq!(discovery.peer_count().await, 0);
    }

    #[tokio::test]
    async fn test_add_peer() {
        let config = DiscoveryConfig {
            enable_local: false,
            ..Default::default()
        };
        let local_info = make_node_info("local");
        let discovery = NodeDiscovery::new(config, local_info);

        let peer_info = make_node_info("peer1");
        let addr: SocketAddr = "127.0.0.1:9877".parse().unwrap();
        discovery.add_manual_peer(peer_info, addr).await;

        assert_eq!(discovery.peer_count().await, 1);
        let peer = discovery.get_peer(&"peer1".to_string()).await;
        assert!(peer.is_some());
    }

    #[tokio::test]
    async fn test_stale_peer_cleanup() {
        let config = DiscoveryConfig {
            enable_local: false,
            peer_timeout_secs: 1,
            ..Default::default()
        };
        let local_info = make_node_info("local");
        let discovery = NodeDiscovery::new(config, local_info);

        let peer_info = make_node_info("peer1");
        let addr: SocketAddr = "127.0.0.1:9877".parse().unwrap();

        // Add peer with old timestamp
        let mut peer = PeerInfo::new(peer_info, DiscoveryMethod::Manual, addr);
        peer.last_seen = Utc::now() - chrono::Duration::seconds(10);
        discovery.add_peer(peer).await;

        // Should be removed as stale
        discovery.cleanup_stale_peers().await;
        assert_eq!(discovery.peer_count().await, 0);
    }
}
