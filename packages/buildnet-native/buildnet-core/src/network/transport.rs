//! Transport Layer
//!
//! WebSocket-based transport for P2P communication:
//! - Connection management (connect, disconnect, reconnect)
//! - Message serialization (MessagePack)
//! - Heartbeat and keepalive
//! - Connection pooling

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async,
    tungstenite::Message as WsMessage,
    WebSocketStream,
    MaybeTlsStream,
};
use futures_util::{SinkExt, StreamExt, stream::SplitSink, stream::SplitStream};
use chrono::{DateTime, Utc};

use super::node::NodeId;
use super::protocol::{Message, Envelope};

/// Transport configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportConfig {
    /// Maximum message size in bytes
    pub max_message_size: usize,
    /// Connection timeout in seconds
    pub connect_timeout_secs: u64,
    /// Read timeout in seconds
    pub read_timeout_secs: u64,
    /// Write timeout in seconds
    pub write_timeout_secs: u64,
    /// Heartbeat interval in seconds
    pub heartbeat_interval_secs: u64,
    /// Maximum reconnection attempts
    pub max_reconnect_attempts: u32,
    /// Reconnection delay in milliseconds
    pub reconnect_delay_ms: u64,
    /// Enable message compression
    pub enable_compression: bool,
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            max_message_size: 16 * 1024 * 1024, // 16 MB
            connect_timeout_secs: 10,
            read_timeout_secs: 30,
            write_timeout_secs: 30,
            heartbeat_interval_secs: 30,
            max_reconnect_attempts: 5,
            reconnect_delay_ms: 1000,
            enable_compression: true,
        }
    }
}

/// Connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConnectionState {
    /// Not connected
    Disconnected,
    /// Attempting to connect
    Connecting,
    /// Connected and ready
    Connected,
    /// Reconnecting after failure
    Reconnecting,
    /// Connection failed permanently
    Failed,
}

/// Connection statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ConnectionStats {
    /// Messages sent
    pub messages_sent: u64,
    /// Messages received
    pub messages_received: u64,
    /// Bytes sent
    pub bytes_sent: u64,
    /// Bytes received
    pub bytes_received: u64,
    /// Connection errors
    pub errors: u64,
    /// Reconnection attempts
    pub reconnects: u32,
    /// When connection was established
    pub connected_at: Option<DateTime<Utc>>,
    /// Last activity time
    pub last_activity: Option<DateTime<Utc>>,
    /// Average latency in milliseconds
    pub avg_latency_ms: Option<f64>,
}

/// A connection to a remote node
pub struct Connection {
    /// Remote node ID
    pub node_id: NodeId,
    /// Remote address
    pub address: String,
    /// Connection state
    state: Arc<RwLock<ConnectionState>>,
    /// Connection statistics
    stats: Arc<RwLock<ConnectionStats>>,
    /// Send channel
    tx: Option<mpsc::Sender<Envelope>>,
    /// Configuration
    config: TransportConfig,
}

impl Connection {
    /// Create a new connection
    pub fn new(node_id: NodeId, address: String, config: TransportConfig) -> Self {
        Self {
            node_id,
            address,
            state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
            stats: Arc::new(RwLock::new(ConnectionStats::default())),
            tx: None,
            config,
        }
    }

    /// Get connection state
    pub async fn state(&self) -> ConnectionState {
        *self.state.read().await
    }

    /// Get connection statistics
    pub async fn stats(&self) -> ConnectionStats {
        self.stats.read().await.clone()
    }

    /// Check if connected
    pub async fn is_connected(&self) -> bool {
        *self.state.read().await == ConnectionState::Connected
    }

    /// Send a message
    pub async fn send(&self, envelope: Envelope) -> Result<()> {
        if let Some(ref tx) = self.tx {
            tx.send(envelope).await.map_err(|e| {
                crate::BuildNetError::Network(format!("Send failed: {}", e))
            })?;

            let mut stats = self.stats.write().await;
            stats.messages_sent += 1;
            stats.last_activity = Some(Utc::now());
        }
        Ok(())
    }
}

/// Transport layer for managing connections
pub struct Transport {
    /// Local node ID
    local_id: NodeId,
    /// Configuration
    config: TransportConfig,
    /// Active connections
    connections: Arc<RwLock<HashMap<NodeId, Arc<Connection>>>>,
    /// Channel for incoming messages
    incoming_tx: mpsc::Sender<(NodeId, Message)>,
    /// Running flag
    running: Arc<RwLock<bool>>,
}

impl Transport {
    /// Create a new transport
    pub fn new(
        local_id: NodeId,
        config: TransportConfig,
        incoming_tx: mpsc::Sender<(NodeId, Message)>,
    ) -> Self {
        Self {
            local_id,
            config,
            connections: Arc::new(RwLock::new(HashMap::new())),
            incoming_tx,
            running: Arc::new(RwLock::new(false)),
        }
    }

    /// Start the transport
    pub async fn start(&self) -> Result<()> {
        *self.running.write().await = true;
        Ok(())
    }

    /// Stop the transport
    pub async fn stop(&self) {
        *self.running.write().await = false;

        // Close all connections
        let connections = self.connections.read().await;
        for (node_id, _conn) in connections.iter() {
            tracing::info!("Closing connection to {}", node_id);
        }
    }

    /// Connect to a remote node
    pub async fn connect(&self, node_id: NodeId, address: &str) -> Result<Arc<Connection>> {
        // Check if already connected
        {
            let connections = self.connections.read().await;
            if let Some(conn) = connections.get(&node_id) {
                if conn.is_connected().await {
                    return Ok(conn.clone());
                }
            }
        }

        let conn = Arc::new(Connection::new(
            node_id.clone(),
            address.to_string(),
            self.config.clone(),
        ));

        // Update connection state
        *conn.state.write().await = ConnectionState::Connecting;

        // Attempt WebSocket connection
        let ws_url = format!("ws://{}/buildnet/ws", address);

        match tokio::time::timeout(
            std::time::Duration::from_secs(self.config.connect_timeout_secs),
            connect_async(&ws_url),
        ).await {
            Ok(Ok((ws_stream, _response))) => {
                *conn.state.write().await = ConnectionState::Connected;
                conn.stats.write().await.connected_at = Some(Utc::now());

                // Spawn connection handler
                self.spawn_connection_handler(node_id.clone(), ws_stream).await;

                // Store connection
                self.connections.write().await.insert(node_id.clone(), conn.clone());

                tracing::info!("Connected to {} at {}", node_id, address);
                Ok(conn)
            }
            Ok(Err(e)) => {
                *conn.state.write().await = ConnectionState::Failed;
                Err(crate::BuildNetError::Network(format!(
                    "WebSocket connection failed: {}", e
                )))
            }
            Err(_) => {
                *conn.state.write().await = ConnectionState::Failed;
                Err(crate::BuildNetError::Network("Connection timeout".to_string()))
            }
        }
    }

    /// Disconnect from a node
    pub async fn disconnect(&self, node_id: &NodeId) {
        if let Some(conn) = self.connections.write().await.remove(node_id) {
            *conn.state.write().await = ConnectionState::Disconnected;
            tracing::info!("Disconnected from {}", node_id);
        }
    }

    /// Send message to a specific node
    pub async fn send(&self, node_id: &NodeId, message: Message) -> Result<()> {
        let envelope = Envelope::new(
            self.local_id.clone(),
            Some(node_id.clone()),
            message,
        );

        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(node_id) {
            conn.send(envelope).await
        } else {
            Err(crate::BuildNetError::Network(format!(
                "Not connected to {}", node_id
            )))
        }
    }

    /// Broadcast message to all connected nodes
    pub async fn broadcast(&self, message: Message) -> Result<()> {
        let envelope = Envelope::new(
            self.local_id.clone(),
            None, // No specific recipient = broadcast
            message,
        );

        let connections = self.connections.read().await;
        for (node_id, conn) in connections.iter() {
            if let Err(e) = conn.send(envelope.clone()).await {
                tracing::warn!("Failed to send to {}: {}", node_id, e);
            }
        }

        Ok(())
    }

    /// Get connection to a node
    pub async fn get_connection(&self, node_id: &NodeId) -> Option<Arc<Connection>> {
        self.connections.read().await.get(node_id).cloned()
    }

    /// Get all connected node IDs
    pub async fn connected_nodes(&self) -> Vec<NodeId> {
        let connections = self.connections.read().await;
        let mut nodes = Vec::new();

        for (id, conn) in connections.iter() {
            if conn.is_connected().await {
                nodes.push(id.clone());
            }
        }

        nodes
    }

    /// Get connection count
    pub async fn connection_count(&self) -> usize {
        self.connections.read().await.len()
    }

    /// Spawn handler for a WebSocket connection
    async fn spawn_connection_handler(
        &self,
        node_id: NodeId,
        ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
    ) {
        let (write, read) = ws_stream.split();
        let incoming_tx = self.incoming_tx.clone();
        let running = self.running.clone();
        let connections = self.connections.clone();

        // Spawn read task
        tokio::spawn(async move {
            Self::read_loop(node_id.clone(), read, incoming_tx, running, connections).await;
        });
    }

    /// Read loop for incoming messages (TLS-wrapped streams)
    async fn read_loop(
        node_id: NodeId,
        mut read: SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
        incoming_tx: mpsc::Sender<(NodeId, Message)>,
        running: Arc<RwLock<bool>>,
        connections: Arc<RwLock<HashMap<NodeId, Arc<Connection>>>>,
    ) {
        Self::process_messages(node_id, &mut read, incoming_tx, running, connections).await;
    }

    /// Read loop for incoming messages (plain TCP streams)
    async fn read_loop_tcp(
        node_id: NodeId,
        mut read: SplitStream<WebSocketStream<TcpStream>>,
        incoming_tx: mpsc::Sender<(NodeId, Message)>,
        running: Arc<RwLock<bool>>,
        connections: Arc<RwLock<HashMap<NodeId, Arc<Connection>>>>,
    ) {
        Self::process_messages(node_id, &mut read, incoming_tx, running, connections).await;
    }

    /// Process incoming WebSocket messages
    async fn process_messages<S, E>(
        node_id: NodeId,
        read: &mut S,
        incoming_tx: mpsc::Sender<(NodeId, Message)>,
        running: Arc<RwLock<bool>>,
        connections: Arc<RwLock<HashMap<NodeId, Arc<Connection>>>>,
    )
    where
        S: StreamExt<Item = std::result::Result<WsMessage, E>> + Unpin,
        E: std::fmt::Display,
    {
        while *running.read().await {
            match read.next().await {
                Some(Ok(ws_msg)) => {
                    match ws_msg {
                        WsMessage::Binary(data) => {
                            // Deserialize MessagePack envelope
                            match rmp_serde::from_slice::<Envelope>(&data) {
                                Ok(envelope) => {
                                    // Update stats
                                    if let Some(conn) = connections.read().await.get(&node_id) {
                                        let mut stats = conn.stats.write().await;
                                        stats.messages_received += 1;
                                        stats.bytes_received += data.len() as u64;
                                        stats.last_activity = Some(Utc::now());
                                    }

                                    // Forward to incoming channel
                                    let _ = incoming_tx.send((node_id.clone(), envelope.message)).await;
                                }
                                Err(e) => {
                                    tracing::warn!("Failed to deserialize message: {}", e);
                                }
                            }
                        }
                        WsMessage::Ping(_data) => {
                            tracing::debug!("Received ping from {}", node_id);
                        }
                        WsMessage::Pong(_) => {
                            // Heartbeat response
                        }
                        WsMessage::Close(_) => {
                            tracing::info!("Connection closed by {}", node_id);
                            break;
                        }
                        _ => {}
                    }
                }
                Some(Err(e)) => {
                    tracing::warn!("WebSocket error from {}: {}", node_id, e);
                    if let Some(conn) = connections.read().await.get(&node_id) {
                        conn.stats.write().await.errors += 1;
                    }
                    break;
                }
                None => {
                    break;
                }
            }
        }

        // Mark connection as disconnected
        if let Some(conn) = connections.read().await.get(&node_id) {
            *conn.state.write().await = ConnectionState::Disconnected;
        }
    }
}

/// WebSocket transport implementation
pub struct WebSocketTransport {
    inner: Transport,
}

impl WebSocketTransport {
    /// Create a new WebSocket transport
    pub fn new(
        local_id: NodeId,
        config: TransportConfig,
        incoming_tx: mpsc::Sender<(NodeId, Message)>,
    ) -> Self {
        Self {
            inner: Transport::new(local_id, config, incoming_tx),
        }
    }

    /// Start listening for incoming connections
    pub async fn listen(&self, addr: &str) -> Result<()> {
        let listener = tokio::net::TcpListener::bind(addr).await?;
        tracing::info!("WebSocket transport listening on {}", addr);

        self.inner.start().await?;

        let running = self.inner.running.clone();
        let incoming_tx = self.inner.incoming_tx.clone();
        let connections = self.inner.connections.clone();
        let local_id = self.inner.local_id.clone();

        tokio::spawn(async move {
            while *running.read().await {
                match listener.accept().await {
                    Ok((stream, addr)) => {
                        tracing::info!("Incoming connection from {}", addr);

                        // Accept WebSocket handshake
                        match tokio_tungstenite::accept_async(stream).await {
                            Ok(ws_stream) => {
                                let (write, read) = ws_stream.split();

                                // We'll get the node ID from the first message
                                let node_id = format!("pending-{}", addr);

                                // Spawn read handler
                                let tx = incoming_tx.clone();
                                let r = running.clone();
                                let c = connections.clone();

                                tokio::spawn(async move {
                                    Transport::read_loop_tcp(
                                        node_id,
                                        read,
                                        tx,
                                        r,
                                        c,
                                    ).await;
                                });
                            }
                            Err(e) => {
                                tracing::warn!("WebSocket handshake failed: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Accept failed: {}", e);
                    }
                }
            }
        });

        Ok(())
    }

    /// Connect to a remote node
    pub async fn connect(&self, node_id: NodeId, address: &str) -> Result<Arc<Connection>> {
        self.inner.connect(node_id, address).await
    }

    /// Disconnect from a node
    pub async fn disconnect(&self, node_id: &NodeId) {
        self.inner.disconnect(node_id).await;
    }

    /// Send message to a node
    pub async fn send(&self, node_id: &NodeId, message: Message) -> Result<()> {
        self.inner.send(node_id, message).await
    }

    /// Broadcast message
    pub async fn broadcast(&self, message: Message) -> Result<()> {
        self.inner.broadcast(message).await
    }

    /// Stop the transport
    pub async fn stop(&self) {
        self.inner.stop().await;
    }

    /// Get connected nodes
    pub async fn connected_nodes(&self) -> Vec<NodeId> {
        self.inner.connected_nodes().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transport_config_default() {
        let config = TransportConfig::default();
        assert_eq!(config.max_message_size, 16 * 1024 * 1024);
        assert_eq!(config.connect_timeout_secs, 10);
        assert!(config.enable_compression);
    }

    #[tokio::test]
    async fn test_connection_state() {
        let config = TransportConfig::default();
        let conn = Connection::new(
            "test-node".to_string(),
            "127.0.0.1:9877".to_string(),
            config,
        );

        assert_eq!(conn.state().await, ConnectionState::Disconnected);
        assert!(!conn.is_connected().await);
    }

    #[tokio::test]
    async fn test_transport_creation() {
        let (tx, _rx) = mpsc::channel(100);
        let transport = Transport::new(
            "local-node".to_string(),
            TransportConfig::default(),
            tx,
        );

        assert_eq!(transport.connection_count().await, 0);
        assert!(transport.connected_nodes().await.is_empty());
    }
}
