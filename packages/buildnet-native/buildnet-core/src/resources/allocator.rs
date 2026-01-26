//! Resource allocation for builds

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{MaxConcurrent, CpuTier};
use crate::notifications::Priority;

/// Resource request for a build
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRequest {
    /// Request ID
    pub id: String,
    /// Build ID
    pub build_id: String,
    /// Package name
    pub package: String,
    /// Requested priority
    pub priority: Priority,
    /// Requested CPU tier
    pub cpu_tier: CpuTier,
    /// Estimated duration (seconds)
    pub estimated_duration_secs: Option<u64>,
    /// Required memory (bytes)
    pub required_memory: Option<u64>,
    /// Request timestamp
    pub requested_at: DateTime<Utc>,
}

impl ResourceRequest {
    /// Create a new resource request
    pub fn new(build_id: &str, package: &str, priority: Priority) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            build_id: build_id.to_string(),
            package: package.to_string(),
            priority,
            cpu_tier: match priority {
                Priority::Critical => CpuTier::High,
                Priority::High => CpuTier::High,
                Priority::Medium => CpuTier::Normal,
                Priority::Low => CpuTier::Low,
            },
            estimated_duration_secs: None,
            required_memory: None,
            requested_at: Utc::now(),
        }
    }
}

/// Resource allocation granted to a build
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceAllocation {
    /// Allocation ID
    pub id: String,
    /// Request ID
    pub request_id: String,
    /// Build ID
    pub build_id: String,
    /// Allocated CPU tier
    pub cpu_tier: CpuTier,
    /// Allocated cores (if affinity enabled)
    pub cores: Vec<usize>,
    /// Allocation timestamp
    pub allocated_at: DateTime<Utc>,
    /// Expiry timestamp (for auto-release)
    pub expires_at: Option<DateTime<Utc>>,
}

/// Resource allocator
pub struct ResourceAllocator {
    config: MaxConcurrent,
    /// Active allocations by priority
    allocations: Arc<RwLock<HashMap<String, ResourceAllocation>>>,
    /// Waiting queue by priority
    queues: Arc<RwLock<HashMap<Priority, VecDeque<ResourceRequest>>>>,
    /// Current counts by priority
    counts: Arc<RwLock<HashMap<Priority, usize>>>,
}

impl ResourceAllocator {
    /// Create a new resource allocator
    pub fn new(config: MaxConcurrent) -> Self {
        let mut queues = HashMap::new();
        let mut counts = HashMap::new();

        for priority in [Priority::Critical, Priority::High, Priority::Medium, Priority::Low] {
            queues.insert(priority, VecDeque::new());
            counts.insert(priority, 0);
        }

        Self {
            config,
            allocations: Arc::new(RwLock::new(HashMap::new())),
            queues: Arc::new(RwLock::new(queues)),
            counts: Arc::new(RwLock::new(counts)),
        }
    }

    /// Request resource allocation
    pub fn request(&self, request: ResourceRequest) -> AllocationResult {
        let priority = request.priority;

        // Check if we can allocate immediately
        if self.can_allocate(priority) {
            let allocation = self.do_allocate(&request);
            AllocationResult::Granted(allocation)
        } else {
            // Add to queue
            let position = {
                let mut queues = self.queues.write();
                if let Some(queue) = queues.get_mut(&priority) {
                    queue.push_back(request.clone());
                    queue.len()
                } else {
                    0
                }
            };

            AllocationResult::Queued {
                request_id: request.id,
                position,
                estimated_wait_secs: self.estimate_wait(priority),
            }
        }
    }

    /// Check if allocation is possible for priority
    fn can_allocate(&self, priority: Priority) -> bool {
        let counts = self.counts.read();
        let current = counts.get(&priority).unwrap_or(&0);

        let max = match priority {
            Priority::Critical | Priority::High => self.config.high,
            Priority::Medium => self.config.normal,
            Priority::Low => self.config.low,
        };

        *current < max
    }

    /// Perform allocation
    fn do_allocate(&self, request: &ResourceRequest) -> ResourceAllocation {
        // Increment count
        {
            let mut counts = self.counts.write();
            if let Some(count) = counts.get_mut(&request.priority) {
                *count += 1;
            }
        }

        let allocation = ResourceAllocation {
            id: Uuid::new_v4().to_string(),
            request_id: request.id.clone(),
            build_id: request.build_id.clone(),
            cpu_tier: request.cpu_tier,
            cores: vec![], // Would be filled by CpuManager
            allocated_at: Utc::now(),
            expires_at: request.estimated_duration_secs.map(|d| {
                Utc::now() + chrono::Duration::seconds((d * 2) as i64) // 2x buffer
            }),
        };

        // Store allocation
        {
            let mut allocations = self.allocations.write();
            allocations.insert(allocation.id.clone(), allocation.clone());
        }

        allocation
    }

    /// Release allocation
    pub fn release(&self, allocation_id: &str) -> Option<ResourceAllocation> {
        let allocation = {
            let mut allocations = self.allocations.write();
            allocations.remove(allocation_id)
        };

        if let Some(ref alloc) = allocation {
            // Decrement count
            let priority = match alloc.cpu_tier {
                CpuTier::High => Priority::High,
                CpuTier::Normal => Priority::Medium,
                CpuTier::Low | CpuTier::Idle => Priority::Low,
            };

            {
                let mut counts = self.counts.write();
                if let Some(count) = counts.get_mut(&priority) {
                    *count = count.saturating_sub(1);
                }
            }

            // Try to process next in queue
            self.process_queue(priority);
        }

        allocation
    }

    /// Process waiting queue for a priority
    fn process_queue(&self, priority: Priority) -> Option<ResourceAllocation> {
        if !self.can_allocate(priority) {
            return None;
        }

        let request = {
            let mut queues = self.queues.write();
            queues.get_mut(&priority).and_then(|q| q.pop_front())
        };

        request.map(|r| self.do_allocate(&r))
    }

    /// Cancel a queued request
    pub fn cancel_request(&self, request_id: &str) -> bool {
        let mut queues = self.queues.write();

        for queue in queues.values_mut() {
            if let Some(pos) = queue.iter().position(|r| r.id == request_id) {
                queue.remove(pos);
                return true;
            }
        }

        false
    }

    /// Get queue status
    pub fn get_status(&self) -> AllocatorStatus {
        let counts = self.counts.read();
        let queues = self.queues.read();
        let allocations = self.allocations.read();

        AllocatorStatus {
            active_high: *counts.get(&Priority::High).unwrap_or(&0),
            max_high: self.config.high,
            queued_high: queues.get(&Priority::High).map_or(0, |q| q.len()),
            active_normal: *counts.get(&Priority::Medium).unwrap_or(&0),
            max_normal: self.config.normal,
            queued_normal: queues.get(&Priority::Medium).map_or(0, |q| q.len()),
            active_low: *counts.get(&Priority::Low).unwrap_or(&0),
            max_low: self.config.low,
            queued_low: queues.get(&Priority::Low).map_or(0, |q| q.len()),
            total_allocations: allocations.len(),
        }
    }

    /// Estimate wait time for a priority
    fn estimate_wait(&self, priority: Priority) -> u64 {
        let queues = self.queues.read();
        let queue_len = queues.get(&priority).map_or(0, |q| q.len());

        // Rough estimate: 30 seconds per item in queue
        (queue_len as u64) * 30
    }

    /// Get allocation by ID
    pub fn get_allocation(&self, id: &str) -> Option<ResourceAllocation> {
        let allocations = self.allocations.read();
        allocations.get(id).cloned()
    }

    /// Get all active allocations
    pub fn get_all_allocations(&self) -> Vec<ResourceAllocation> {
        let allocations = self.allocations.read();
        allocations.values().cloned().collect()
    }

    /// Check and release expired allocations
    pub fn release_expired(&self) -> Vec<ResourceAllocation> {
        let now = Utc::now();
        let expired: Vec<String> = {
            let allocations = self.allocations.read();
            allocations.iter()
                .filter(|(_, a)| a.expires_at.map_or(false, |e| e < now))
                .map(|(id, _)| id.clone())
                .collect()
        };

        expired.iter()
            .filter_map(|id| self.release(id))
            .collect()
    }
}

/// Result of allocation request
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status")]
pub enum AllocationResult {
    /// Allocation granted immediately
    Granted(ResourceAllocation),
    /// Request queued
    Queued {
        request_id: String,
        position: usize,
        estimated_wait_secs: u64,
    },
    /// Request rejected
    Rejected {
        reason: String,
    },
}

/// Allocator status
#[derive(Debug, Clone, Serialize)]
pub struct AllocatorStatus {
    pub active_high: usize,
    pub max_high: usize,
    pub queued_high: usize,
    pub active_normal: usize,
    pub max_normal: usize,
    pub queued_normal: usize,
    pub active_low: usize,
    pub max_low: usize,
    pub queued_low: usize,
    pub total_allocations: usize,
}

impl AllocatorStatus {
    /// Get total active builds
    pub fn total_active(&self) -> usize {
        self.active_high + self.active_normal + self.active_low
    }

    /// Get total queued builds
    pub fn total_queued(&self) -> usize {
        self.queued_high + self.queued_normal + self.queued_low
    }

    /// Get total capacity
    pub fn total_capacity(&self) -> usize {
        self.max_high + self.max_normal + self.max_low
    }

    /// Get utilization percentage
    pub fn utilization_percent(&self) -> f64 {
        let capacity = self.total_capacity();
        if capacity > 0 {
            (self.total_active() as f64 / capacity as f64) * 100.0
        } else {
            0.0
        }
    }
}
