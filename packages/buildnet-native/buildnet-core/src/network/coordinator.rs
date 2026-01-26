//! Coordinator Election
//!
//! Implements the Bully Algorithm for coordinator election:
//! 1. Any node can start an election by sending ELECTION messages to all higher-ID nodes
//! 2. If a higher-ID node responds, it takes over the election
//! 3. If no higher-ID node responds within timeout, the initiator becomes coordinator
//! 4. The new coordinator sends COORDINATOR messages to all nodes

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio::time::Duration;
use chrono::{DateTime, Utc};

use super::node::{Node, NodeId, NodeInfo, NodeRegistry};
use super::protocol::{Message, ElectionMessage, VoteMessage, CoordinatorAnnounceMessage};

/// Election configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionConfig {
    /// Timeout for waiting for higher-ID responses (ms)
    pub election_timeout_ms: u64,
    /// Timeout for waiting for coordinator announcement (ms)
    pub coordinator_timeout_ms: u64,
    /// Minimum time between elections (ms)
    pub election_cooldown_ms: u64,
    /// Whether to use node capabilities in priority calculation
    pub use_capability_priority: bool,
}

impl Default for ElectionConfig {
    fn default() -> Self {
        Self {
            election_timeout_ms: 5000,
            coordinator_timeout_ms: 10000,
            election_cooldown_ms: 30000,
            use_capability_priority: true,
        }
    }
}

/// Current election state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ElectionState {
    /// No election in progress
    Idle,
    /// Election started, waiting for responses
    ElectionInProgress,
    /// Waiting for coordinator announcement
    WaitingForCoordinator,
    /// This node is the coordinator
    Coordinator,
    /// Another node is the coordinator
    Follower,
}

/// Election event for external notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ElectionEvent {
    /// Election started
    ElectionStarted { initiator: NodeId },
    /// Received election message from another node
    ElectionReceived { from: NodeId },
    /// This node won the election
    BecameCoordinator,
    /// Another node became coordinator
    NewCoordinator { coordinator: NodeId },
    /// Election timed out
    ElectionTimeout,
    /// Lost coordinator contact
    CoordinatorLost { previous: NodeId },
}

/// Coordinator election manager
pub struct CoordinatorElection {
    /// Local node ID
    local_id: NodeId,
    /// Local node info
    local_info: NodeInfo,
    /// Election configuration
    config: ElectionConfig,
    /// Current state
    state: Arc<RwLock<ElectionState>>,
    /// Current coordinator (if known)
    coordinator: Arc<RwLock<Option<NodeId>>>,
    /// When the current coordinator was elected
    coordinator_since: Arc<RwLock<Option<DateTime<Utc>>>>,
    /// Last election time
    last_election: Arc<RwLock<Option<DateTime<Utc>>>>,
    /// Current election ID
    current_election_id: Arc<RwLock<Option<String>>>,
    /// Nodes that responded to our election
    election_responses: Arc<RwLock<HashSet<NodeId>>>,
    /// Node registry for getting peer info (wrapped in RwLock for async access)
    registry: Arc<RwLock<NodeRegistry>>,
    /// Channel for sending messages
    message_tx: mpsc::Sender<(NodeId, Message)>,
    /// Channel for election events
    event_tx: mpsc::Sender<ElectionEvent>,
}

impl CoordinatorElection {
    /// Create a new coordinator election manager
    pub fn new(
        local_id: NodeId,
        local_info: NodeInfo,
        config: ElectionConfig,
        registry: Arc<RwLock<NodeRegistry>>,
        message_tx: mpsc::Sender<(NodeId, Message)>,
        event_tx: mpsc::Sender<ElectionEvent>,
    ) -> Self {
        Self {
            local_id,
            local_info,
            config,
            state: Arc::new(RwLock::new(ElectionState::Idle)),
            coordinator: Arc::new(RwLock::new(None)),
            coordinator_since: Arc::new(RwLock::new(None)),
            last_election: Arc::new(RwLock::new(None)),
            current_election_id: Arc::new(RwLock::new(None)),
            election_responses: Arc::new(RwLock::new(HashSet::new())),
            registry,
            message_tx,
            event_tx,
        }
    }

    /// Get current election state
    pub async fn state(&self) -> ElectionState {
        *self.state.read().await
    }

    /// Get current coordinator
    pub async fn coordinator(&self) -> Option<NodeId> {
        self.coordinator.read().await.clone()
    }

    /// Check if this node is the coordinator
    pub async fn is_coordinator(&self) -> bool {
        *self.state.read().await == ElectionState::Coordinator
    }

    /// Start an election
    pub async fn start_election(&self) -> Result<()> {
        // Check cooldown
        if let Some(last) = *self.last_election.read().await {
            let elapsed = Utc::now().signed_duration_since(last).num_milliseconds() as u64;
            if elapsed < self.config.election_cooldown_ms {
                tracing::debug!("Election cooldown active, skipping");
                return Ok(());
            }
        }

        // Generate election ID
        let election_id = uuid::Uuid::new_v4().to_string();

        // Set state to election in progress
        *self.state.write().await = ElectionState::ElectionInProgress;
        *self.last_election.write().await = Some(Utc::now());
        *self.current_election_id.write().await = Some(election_id.clone());
        self.election_responses.write().await.clear();

        // Notify of election start
        let _ = self.event_tx.send(ElectionEvent::ElectionStarted {
            initiator: self.local_id.clone(),
        }).await;

        // Get all nodes with higher priority
        let higher_nodes = self.get_higher_priority_nodes().await;

        if higher_nodes.is_empty() {
            // No higher priority nodes, we become coordinator
            self.become_coordinator(&election_id).await?;
            return Ok(());
        }

        // Send ELECTION messages to higher priority nodes
        let local_priority = self.get_local_priority().await;
        let election_msg = Message::Election(ElectionMessage {
            election_id: election_id.clone(),
            candidate_id: self.local_id.clone(),
            priority: local_priority,
        });

        for node_id in &higher_nodes {
            let _ = self.message_tx.send((node_id.clone(), election_msg.clone())).await;
        }

        // Start timeout for responses
        let state = self.state.clone();
        let responses = self.election_responses.clone();
        let config = self.config.clone();
        let event_tx = self.event_tx.clone();
        let local_id = self.local_id.clone();
        let local_info = self.local_info.clone();
        let registry = self.registry.clone();
        let message_tx = self.message_tx.clone();
        let coordinator = self.coordinator.clone();
        let coordinator_since = self.coordinator_since.clone();
        let election_id_clone = election_id.clone();

        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(config.election_timeout_ms)).await;

            let current_state = *state.read().await;
            if current_state == ElectionState::ElectionInProgress {
                let response_count = responses.read().await.len();
                if response_count == 0 {
                    // No responses from higher nodes, become coordinator
                    *state.write().await = ElectionState::Coordinator;
                    *coordinator.write().await = Some(local_id.clone());
                    *coordinator_since.write().await = Some(Utc::now());

                    let _ = event_tx.send(ElectionEvent::BecameCoordinator).await;

                    // Announce to all nodes
                    let announcement = Message::CoordinatorAnnounce(CoordinatorAnnounceMessage {
                        election_id: election_id_clone,
                        coordinator_id: local_id.clone(),
                        coordinator_info: local_info,
                    });

                    let registry_guard = registry.read().await;
                    let nodes = registry_guard.all();
                    for node in nodes {
                        if node.info.id != local_id {
                            let _ = message_tx.send((node.info.id.clone(), announcement.clone())).await;
                        }
                    }
                } else {
                    // Got responses, wait for coordinator announcement
                    *state.write().await = ElectionState::WaitingForCoordinator;

                    // Start coordinator timeout
                    tokio::time::sleep(Duration::from_millis(config.coordinator_timeout_ms)).await;

                    let current_state = *state.read().await;
                    if current_state == ElectionState::WaitingForCoordinator {
                        // Coordinator announcement timed out, restart election
                        let _ = event_tx.send(ElectionEvent::ElectionTimeout).await;
                    }
                }
            }
        });

        Ok(())
    }

    /// Handle incoming election message
    pub async fn handle_election(&self, msg: ElectionMessage) -> Result<()> {
        let _ = self.event_tx.send(ElectionEvent::ElectionReceived {
            from: msg.candidate_id.clone(),
        }).await;

        let local_priority = self.get_local_priority().await;

        if local_priority > msg.priority {
            // We have higher priority, respond with a vote and start our own election
            let vote = Message::Vote(VoteMessage {
                election_id: msg.election_id,
                voter_id: self.local_id.clone(),
                candidate_id: self.local_id.clone(), // Vote for ourselves
            });

            let _ = self.message_tx.send((msg.candidate_id, vote)).await;

            // Start our own election
            self.start_election().await?;
        }

        Ok(())
    }

    /// Handle vote message
    pub async fn handle_vote(&self, msg: VoteMessage) -> Result<()> {
        // Check if this is for our current election
        if let Some(ref election_id) = *self.current_election_id.read().await {
            if &msg.election_id == election_id {
                self.election_responses.write().await.insert(msg.voter_id);
            }
        }
        Ok(())
    }

    /// Handle coordinator announcement
    pub async fn handle_coordinator(&self, msg: CoordinatorAnnounceMessage) -> Result<()> {
        *self.state.write().await = ElectionState::Follower;
        *self.coordinator.write().await = Some(msg.coordinator_id.clone());
        *self.coordinator_since.write().await = Some(Utc::now());

        let _ = self.event_tx.send(ElectionEvent::NewCoordinator {
            coordinator: msg.coordinator_id,
        }).await;

        Ok(())
    }

    /// Called when coordinator heartbeat is missed
    pub async fn coordinator_lost(&self) -> Result<()> {
        let previous = self.coordinator.read().await.clone();

        *self.coordinator.write().await = None;
        *self.coordinator_since.write().await = None;
        *self.state.write().await = ElectionState::Idle;

        if let Some(prev) = previous {
            let _ = self.event_tx.send(ElectionEvent::CoordinatorLost {
                previous: prev,
            }).await;
        }

        // Start new election
        self.start_election().await
    }

    /// Become the coordinator
    async fn become_coordinator(&self, election_id: &str) -> Result<()> {
        *self.state.write().await = ElectionState::Coordinator;
        *self.coordinator.write().await = Some(self.local_id.clone());
        *self.coordinator_since.write().await = Some(Utc::now());

        let _ = self.event_tx.send(ElectionEvent::BecameCoordinator).await;

        // Announce to all nodes
        let announcement = Message::CoordinatorAnnounce(CoordinatorAnnounceMessage {
            election_id: election_id.to_string(),
            coordinator_id: self.local_id.clone(),
            coordinator_info: self.local_info.clone(),
        });

        let registry = self.registry.read().await;
        let nodes = registry.all();
        for node in nodes {
            if node.info.id != self.local_id {
                let _ = self.message_tx.send((node.info.id.clone(), announcement.clone())).await;
            }
        }

        Ok(())
    }

    /// Get local node's election priority
    async fn get_local_priority(&self) -> u64 {
        let registry = self.registry.read().await;
        if let Some(node) = registry.get(&self.local_id) {
            node.election_priority()
        } else {
            // Fallback: use hash of node ID
            use std::hash::{Hash, Hasher};
            use std::collections::hash_map::DefaultHasher;
            let mut hasher = DefaultHasher::new();
            self.local_id.hash(&mut hasher);
            hasher.finish()
        }
    }

    /// Get nodes with higher election priority
    async fn get_higher_priority_nodes(&self) -> Vec<NodeId> {
        let local_priority = self.get_local_priority().await;
        let registry = self.registry.read().await;
        let nodes = registry.all();

        nodes
            .into_iter()
            .filter(|n| {
                n.info.id != self.local_id &&
                n.election_priority() > local_priority
            })
            .map(|n| n.info.id.clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_node(id: &str) -> Node {
        Node::new(NodeInfo {
            id: id.to_string(),
            name: format!("test-node-{}", id),
            address: "127.0.0.1".to_string(),
            port: 9877,
            version: "0.1.0".to_string(),
            capabilities: Default::default(),
            started_at: Utc::now(),
            public_key: vec![],
        })
    }

    #[tokio::test]
    async fn test_election_config_default() {
        let config = ElectionConfig::default();
        assert_eq!(config.election_timeout_ms, 5000);
        assert_eq!(config.coordinator_timeout_ms, 10000);
        assert!(config.use_capability_priority);
    }

    #[tokio::test]
    async fn test_election_state_transitions() {
        let (msg_tx, _msg_rx) = mpsc::channel(100);
        let (event_tx, _event_rx) = mpsc::channel(100);

        let local_node = make_test_node("node-1");
        let local_info = local_node.info.clone();
        let registry = Arc::new(RwLock::new(NodeRegistry::new(local_node)));

        let election = CoordinatorElection::new(
            "node-1".to_string(),
            local_info,
            ElectionConfig::default(),
            registry,
            msg_tx,
            event_tx,
        );

        assert_eq!(election.state().await, ElectionState::Idle);
        assert!(!election.is_coordinator().await);
        assert!(election.coordinator().await.is_none());
    }
}
