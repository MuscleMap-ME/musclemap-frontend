//! Failover management
//!
//! Handles automatic failover between nodes when the leader becomes unhealthy.

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};

/// Failover configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailoverConfig {
    /// Heartbeat interval in seconds
    pub heartbeat_interval_secs: u64,
    /// Heartbeat timeout before considering node dead
    pub heartbeat_timeout_secs: u64,
    /// Minimum votes required for election
    pub election_quorum: usize,
    /// Election timeout in seconds
    pub election_timeout_secs: u64,
    /// Cooldown between failovers in seconds
    pub failover_cooldown_secs: u64,
    /// Maximum failovers per hour
    pub max_failovers_per_hour: usize,
}

impl Default for FailoverConfig {
    fn default() -> Self {
        Self {
            heartbeat_interval_secs: 5,
            heartbeat_timeout_secs: 15,
            election_quorum: 2,
            election_timeout_secs: 10,
            failover_cooldown_secs: 60,
            max_failovers_per_hour: 5,
        }
    }
}

/// Failover state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailoverState {
    /// Current leader ID
    pub leader_id: Option<String>,
    /// Election term (increases on each election)
    pub term: u64,
    /// Last failover time
    pub last_failover: Option<DateTime<Utc>>,
    /// Failover count this hour
    pub failover_count_this_hour: usize,
    /// Is election in progress
    pub election_in_progress: bool,
    /// Votes received
    pub votes: HashMap<String, String>, // voter_id -> candidate_id
}

impl Default for FailoverState {
    fn default() -> Self {
        Self {
            leader_id: None,
            term: 0,
            last_failover: None,
            failover_count_this_hour: 0,
            election_in_progress: false,
            votes: HashMap::new(),
        }
    }
}

/// Failover manager
pub struct FailoverManager {
    /// Configuration
    config: FailoverConfig,
    /// Node ID
    node_id: String,
    /// Current state
    state: Arc<RwLock<FailoverState>>,
    /// Node health tracker
    health: Arc<RwLock<HashMap<String, NodeHealth>>>,
}

/// Node health information
#[derive(Debug, Clone)]
pub struct NodeHealth {
    /// Node ID
    pub node_id: String,
    /// Last heartbeat received
    pub last_heartbeat: DateTime<Utc>,
    /// Consecutive failures
    pub consecutive_failures: usize,
    /// Is node healthy
    pub is_healthy: bool,
}

impl FailoverManager {
    /// Create a new failover manager
    pub fn new(config: FailoverConfig, node_id: &str) -> Self {
        Self {
            config,
            node_id: node_id.to_string(),
            state: Arc::new(RwLock::new(FailoverState::default())),
            health: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get current state
    pub fn state(&self) -> FailoverState {
        self.state.read().clone()
    }

    /// Record heartbeat from a node
    pub fn record_heartbeat(&self, node_id: &str) {
        let mut health = self.health.write();
        let entry = health.entry(node_id.to_string()).or_insert_with(|| NodeHealth {
            node_id: node_id.to_string(),
            last_heartbeat: Utc::now(),
            consecutive_failures: 0,
            is_healthy: true,
        });

        entry.last_heartbeat = Utc::now();
        entry.consecutive_failures = 0;
        entry.is_healthy = true;
    }

    /// Check health of all nodes
    pub fn check_all_health(&self) {
        let now = Utc::now();
        let timeout = self.config.heartbeat_timeout_secs as i64;

        let mut health = self.health.write();
        for entry in health.values_mut() {
            let elapsed = (now - entry.last_heartbeat).num_seconds();
            if elapsed > timeout {
                entry.consecutive_failures += 1;
                entry.is_healthy = false;
            }
        }
    }

    /// Check if leader is healthy
    pub fn is_leader_healthy(&self) -> bool {
        let state = self.state.read();
        if let Some(leader_id) = &state.leader_id {
            let health = self.health.read();
            if let Some(leader_health) = health.get(leader_id) {
                return leader_health.is_healthy;
            }
        }
        false
    }

    /// Can we initiate a failover?
    pub fn can_failover(&self) -> bool {
        let state = self.state.read();

        // Check cooldown
        if let Some(last) = state.last_failover {
            let elapsed = (Utc::now() - last).num_seconds() as u64;
            if elapsed < self.config.failover_cooldown_secs {
                return false;
            }
        }

        // Check rate limit
        if state.failover_count_this_hour >= self.config.max_failovers_per_hour {
            return false;
        }

        // Check if election already in progress
        !state.election_in_progress
    }

    /// Start election
    pub fn start_election(&self) -> Result<u64> {
        if !self.can_failover() {
            return Err(BuildNetError::RateLimited("Cannot start election during cooldown".into()));
        }

        let mut state = self.state.write();
        state.term += 1;
        state.election_in_progress = true;
        state.votes.clear();

        // Vote for self
        state.votes.insert(self.node_id.clone(), self.node_id.clone());

        tracing::info!("Starting election for term {}", state.term);
        Ok(state.term)
    }

    /// Vote in election
    pub fn vote(&self, term: u64, candidate_id: &str) -> Result<bool> {
        let mut state = self.state.write();

        // Only vote if this is for current or newer term
        if term < state.term {
            return Ok(false);
        }

        // Update term if newer
        if term > state.term {
            state.term = term;
            state.votes.clear();
            state.election_in_progress = true;
        }

        // Check if already voted this term
        if state.votes.contains_key(&self.node_id) {
            return Ok(false);
        }

        // Cast vote
        state.votes.insert(self.node_id.clone(), candidate_id.to_string());
        tracing::info!("Voted for {} in term {}", candidate_id, term);
        Ok(true)
    }

    /// Receive vote
    pub fn receive_vote(&self, term: u64, voter_id: &str, candidate_id: &str) -> bool {
        let mut state = self.state.write();

        if term != state.term {
            return false;
        }

        state.votes.insert(voter_id.to_string(), candidate_id.to_string());
        true
    }

    /// Check if we have won the election
    pub fn check_election_result(&self) -> Option<String> {
        let state = self.state.read();

        if !state.election_in_progress {
            return None;
        }

        // Count votes per candidate
        let mut vote_counts: HashMap<String, usize> = HashMap::new();
        for candidate in state.votes.values() {
            *vote_counts.entry(candidate.clone()).or_insert(0) += 1;
        }

        // Check if any candidate has quorum
        for (candidate, count) in vote_counts {
            if count >= self.config.election_quorum {
                return Some(candidate);
            }
        }

        None
    }

    /// Complete election with winner
    pub fn complete_election(&self, winner_id: &str) {
        let mut state = self.state.write();
        state.leader_id = Some(winner_id.to_string());
        state.election_in_progress = false;
        state.last_failover = Some(Utc::now());
        state.failover_count_this_hour += 1;

        tracing::info!("Election complete. New leader: {}", winner_id);
    }

    /// Cancel election
    pub fn cancel_election(&self) {
        let mut state = self.state.write();
        state.election_in_progress = false;
        state.votes.clear();
    }

    /// Reset hourly failover count
    pub fn reset_hourly_count(&self) {
        let mut state = self.state.write();
        state.failover_count_this_hour = 0;
    }

    /// Get healthy node count
    pub fn healthy_node_count(&self) -> usize {
        let health = self.health.read();
        health.values().filter(|h| h.is_healthy).count()
    }

    /// Get all healthy nodes
    pub fn healthy_nodes(&self) -> Vec<String> {
        let health = self.health.read();
        health.values()
            .filter(|h| h.is_healthy)
            .map(|h| h.node_id.clone())
            .collect()
    }

    /// Remove a node from tracking
    pub fn remove_node(&self, node_id: &str) {
        let mut health = self.health.write();
        health.remove(node_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_election() {
        let config = FailoverConfig {
            election_quorum: 2,
            ..Default::default()
        };

        let manager = FailoverManager::new(config, "node1");

        // Start election
        let term = manager.start_election().unwrap();
        assert_eq!(term, 1);

        // Receive another vote
        manager.receive_vote(1, "node2", "node1");

        // Should have won
        let winner = manager.check_election_result();
        assert_eq!(winner, Some("node1".to_string()));
    }

    #[test]
    fn test_heartbeat() {
        let manager = FailoverManager::new(FailoverConfig::default(), "node1");

        manager.record_heartbeat("node2");

        let health = manager.health.read();
        assert!(health.get("node2").unwrap().is_healthy);
    }
}
