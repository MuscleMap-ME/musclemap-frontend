//! Resource Pool Management
//!
//! Manages pools of resources across distributed nodes, allowing
//! builds to use CPU from one host, RAM from another, storage from a third.

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// A resource pool combining resources from multiple nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePool {
    /// Unique pool identifier
    pub id: String,
    /// Pool name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Pool configuration
    pub config: PoolConfig,
    /// Allocated resources by node
    pub allocations: Vec<NodeAllocation>,
    /// Pool status
    pub status: PoolStatus,
    /// When pool was created
    pub created_at: DateTime<Utc>,
    /// Last update time
    pub updated_at: DateTime<Utc>,
}

/// Pool configuration defining resource requirements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolConfig {
    /// Total CPU cores needed
    pub cpu_cores: usize,
    /// Total memory needed in bytes
    pub memory_bytes: u64,
    /// Storage requirements
    pub storage: Vec<StorageRequirement>,
    /// Required tools
    pub required_tools: Vec<String>,
    /// Required runtimes with optional version constraints
    pub required_runtimes: Vec<RuntimeRequirement>,
    /// Network latency requirements (max acceptable latency in ms)
    pub max_latency_ms: Option<u32>,
    /// Minimum storage class required
    pub min_storage_class: Option<super::StorageClass>,
    /// Whether to prefer local resources when possible
    pub prefer_local: bool,
    /// Load balancing strategy
    pub load_balance: LoadBalanceStrategy,
}

/// Storage requirement for a pool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageRequirement {
    /// Purpose (e.g., "workspace", "cache", "artifacts")
    pub purpose: String,
    /// Minimum bytes needed
    pub min_bytes: u64,
    /// Minimum storage class
    pub min_class: super::StorageClass,
    /// Whether fast random I/O is needed
    pub needs_fast_iops: bool,
}

/// Runtime requirement with version constraint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeRequirement {
    /// Runtime name
    pub name: String,
    /// Version constraint (e.g., ">=20", "^18.0", "~3.11")
    pub version: Option<String>,
}

/// Load balancing strategy for distributed builds
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LoadBalanceStrategy {
    /// Distribute evenly across nodes
    RoundRobin,
    /// Send to least loaded node
    LeastConnections,
    /// Send to fastest node
    FastestResponse,
    /// Random selection
    Random,
    /// Based on resource availability
    ResourceBased,
    /// Geographic proximity
    Geographic,
}

impl Default for LoadBalanceStrategy {
    fn default() -> Self {
        Self::ResourceBased
    }
}

/// Resource allocation from a specific node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeAllocation {
    /// Node ID
    pub node_id: String,
    /// Node hostname/address
    pub node_address: String,
    /// Allocated CPU cores
    pub cpu_cores: usize,
    /// Allocated memory in bytes
    pub memory_bytes: u64,
    /// Allocated storage volumes
    pub storage: Vec<StorageAllocation>,
    /// Allocation status
    pub status: AllocationStatus,
    /// When allocated
    pub allocated_at: DateTime<Utc>,
    /// Last health check
    pub last_health_check: Option<DateTime<Utc>>,
}

/// Storage allocation from a node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageAllocation {
    /// Purpose of this storage
    pub purpose: String,
    /// Path on the node
    pub path: PathBuf,
    /// Allocated bytes
    pub allocated_bytes: u64,
    /// Storage class
    pub storage_class: super::StorageClass,
    /// Measured read speed
    pub read_speed_mbps: Option<f64>,
    /// Measured write speed
    pub write_speed_mbps: Option<f64>,
}

/// Pool status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PoolStatus {
    /// Pool is being created
    Creating,
    /// Pool is ready for use
    Ready,
    /// Pool is in use
    Active,
    /// Pool has degraded (some nodes unavailable)
    Degraded,
    /// Pool is being destroyed
    Destroying,
    /// Pool failed to create
    Failed,
}

/// Allocation status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AllocationStatus {
    /// Allocation is pending
    Pending,
    /// Allocation is active
    Active,
    /// Node is unreachable
    Unreachable,
    /// Allocation released
    Released,
}

/// Resource pool manager
pub struct PoolManager {
    /// Active pools
    pools: HashMap<String, ResourcePool>,
    /// Pool templates
    templates: Vec<PoolTemplate>,
}

/// Pool template for quick creation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolTemplate {
    /// Template ID
    pub id: String,
    /// Template name
    pub name: String,
    /// Description
    pub description: String,
    /// Configuration
    pub config: PoolConfig,
    /// Whether this is a built-in template
    pub builtin: bool,
}

impl PoolManager {
    /// Create a new pool manager
    pub fn new() -> Self {
        let mut manager = Self {
            pools: HashMap::new(),
            templates: Vec::new(),
        };
        manager.load_builtin_templates();
        manager
    }

    /// Load built-in pool templates
    fn load_builtin_templates(&mut self) {
        // Local only template
        self.templates.push(PoolTemplate {
            id: "local-only".to_string(),
            name: "Local Only".to_string(),
            description: "Use only local machine resources".to_string(),
            config: PoolConfig {
                cpu_cores: 0, // 0 means use all available
                memory_bytes: 0, // 0 means use all available
                storage: vec![StorageRequirement {
                    purpose: "workspace".to_string(),
                    min_bytes: 1024 * 1024 * 1024, // 1GB
                    min_class: super::StorageClass::Unknown,
                    needs_fast_iops: false,
                }],
                required_tools: vec![],
                required_runtimes: vec![],
                max_latency_ms: None,
                min_storage_class: None,
                prefer_local: true,
                load_balance: LoadBalanceStrategy::ResourceBased,
            },
            builtin: true,
        });

        // Small distributed pool
        self.templates.push(PoolTemplate {
            id: "small-distributed".to_string(),
            name: "Small Distributed".to_string(),
            description: "Small distributed build (2-4 nodes)".to_string(),
            config: PoolConfig {
                cpu_cores: 8,
                memory_bytes: 16 * 1024 * 1024 * 1024, // 16GB
                storage: vec![
                    StorageRequirement {
                        purpose: "workspace".to_string(),
                        min_bytes: 10 * 1024 * 1024 * 1024, // 10GB
                        min_class: super::StorageClass::SSD,
                        needs_fast_iops: true,
                    },
                    StorageRequirement {
                        purpose: "cache".to_string(),
                        min_bytes: 20 * 1024 * 1024 * 1024, // 20GB
                        min_class: super::StorageClass::HDD,
                        needs_fast_iops: false,
                    },
                ],
                required_tools: vec!["git".to_string()],
                required_runtimes: vec![],
                max_latency_ms: Some(100),
                min_storage_class: Some(super::StorageClass::SSD),
                prefer_local: false,
                load_balance: LoadBalanceStrategy::LeastConnections,
            },
            builtin: true,
        });

        // Large distributed pool
        self.templates.push(PoolTemplate {
            id: "large-distributed".to_string(),
            name: "Large Distributed".to_string(),
            description: "Large distributed build (4+ nodes)".to_string(),
            config: PoolConfig {
                cpu_cores: 32,
                memory_bytes: 64 * 1024 * 1024 * 1024, // 64GB
                storage: vec![
                    StorageRequirement {
                        purpose: "workspace".to_string(),
                        min_bytes: 50 * 1024 * 1024 * 1024, // 50GB
                        min_class: super::StorageClass::NVMe,
                        needs_fast_iops: true,
                    },
                    StorageRequirement {
                        purpose: "cache".to_string(),
                        min_bytes: 100 * 1024 * 1024 * 1024, // 100GB
                        min_class: super::StorageClass::SSD,
                        needs_fast_iops: false,
                    },
                    StorageRequirement {
                        purpose: "artifacts".to_string(),
                        min_bytes: 200 * 1024 * 1024 * 1024, // 200GB
                        min_class: super::StorageClass::HDD,
                        needs_fast_iops: false,
                    },
                ],
                required_tools: vec![
                    "git".to_string(),
                    "docker".to_string(),
                ],
                required_runtimes: vec![],
                max_latency_ms: Some(50),
                min_storage_class: Some(super::StorageClass::NVMe),
                prefer_local: false,
                load_balance: LoadBalanceStrategy::FastestResponse,
            },
            builtin: true,
        });

        // CI/CD optimized pool
        self.templates.push(PoolTemplate {
            id: "ci-cd-optimized".to_string(),
            name: "CI/CD Optimized".to_string(),
            description: "Optimized for continuous integration".to_string(),
            config: PoolConfig {
                cpu_cores: 16,
                memory_bytes: 32 * 1024 * 1024 * 1024, // 32GB
                storage: vec![
                    StorageRequirement {
                        purpose: "workspace".to_string(),
                        min_bytes: 20 * 1024 * 1024 * 1024, // 20GB
                        min_class: super::StorageClass::NVMe,
                        needs_fast_iops: true,
                    },
                    StorageRequirement {
                        purpose: "cache".to_string(),
                        min_bytes: 50 * 1024 * 1024 * 1024, // 50GB
                        min_class: super::StorageClass::SSD,
                        needs_fast_iops: true,
                    },
                ],
                required_tools: vec![
                    "git".to_string(),
                    "docker".to_string(),
                ],
                required_runtimes: vec![],
                max_latency_ms: Some(20),
                min_storage_class: Some(super::StorageClass::NVMe),
                prefer_local: false,
                load_balance: LoadBalanceStrategy::FastestResponse,
            },
            builtin: true,
        });
    }

    /// Get all templates
    pub fn templates(&self) -> &[PoolTemplate] {
        &self.templates
    }

    /// Get a template by ID
    pub fn get_template(&self, id: &str) -> Option<&PoolTemplate> {
        self.templates.iter().find(|t| t.id == id)
    }

    /// Add a custom template
    pub fn add_template(&mut self, template: PoolTemplate) {
        self.templates.push(template);
    }

    /// Create a new pool from a template
    pub fn create_pool_from_template(
        &mut self,
        template_id: &str,
        name: String,
        description: Option<String>,
    ) -> Result<String> {
        let template = self
            .get_template(template_id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Template not found: {}", template_id)))?
            .clone();

        let pool = ResourcePool {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            config: template.config,
            allocations: Vec::new(),
            status: PoolStatus::Creating,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let id = pool.id.clone();
        self.pools.insert(id.clone(), pool);
        Ok(id)
    }

    /// Create a custom pool
    pub fn create_pool(&mut self, name: String, description: Option<String>, config: PoolConfig) -> String {
        let pool = ResourcePool {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            config,
            allocations: Vec::new(),
            status: PoolStatus::Creating,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let id = pool.id.clone();
        self.pools.insert(id.clone(), pool);
        id
    }

    /// Get a pool by ID
    pub fn get_pool(&self, id: &str) -> Option<&ResourcePool> {
        self.pools.get(id)
    }

    /// Get a mutable pool by ID
    pub fn get_pool_mut(&mut self, id: &str) -> Option<&mut ResourcePool> {
        self.pools.get_mut(id)
    }

    /// List all pools
    pub fn list_pools(&self) -> Vec<&ResourcePool> {
        self.pools.values().collect()
    }

    /// Add an allocation to a pool
    pub fn add_allocation(&mut self, pool_id: &str, allocation: NodeAllocation) -> Result<()> {
        let pool = self
            .pools
            .get_mut(pool_id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Pool not found: {}", pool_id)))?;

        pool.allocations.push(allocation);
        pool.updated_at = Utc::now();

        // Check if pool is now ready
        if Self::check_pool_ready(pool) {
            pool.status = PoolStatus::Ready;
        }

        Ok(())
    }

    /// Check if a pool has all required resources
    fn check_pool_ready(pool: &ResourcePool) -> bool {
        // Calculate total allocated resources
        let total_cores: usize = pool
            .allocations
            .iter()
            .filter(|a| a.status == AllocationStatus::Active)
            .map(|a| a.cpu_cores)
            .sum();

        let total_memory: u64 = pool
            .allocations
            .iter()
            .filter(|a| a.status == AllocationStatus::Active)
            .map(|a| a.memory_bytes)
            .sum();

        // Check CPU (0 means any)
        if pool.config.cpu_cores > 0 && total_cores < pool.config.cpu_cores {
            return false;
        }

        // Check memory (0 means any)
        if pool.config.memory_bytes > 0 && total_memory < pool.config.memory_bytes {
            return false;
        }

        // Check storage requirements
        for req in &pool.config.storage {
            let total_storage: u64 = pool
                .allocations
                .iter()
                .flat_map(|a| a.storage.iter())
                .filter(|s| s.purpose == req.purpose && s.storage_class >= req.min_class)
                .map(|s| s.allocated_bytes)
                .sum();

            if total_storage < req.min_bytes {
                return false;
            }
        }

        true
    }

    /// Mark a pool as active
    pub fn activate_pool(&mut self, pool_id: &str) -> Result<()> {
        let pool = self
            .pools
            .get_mut(pool_id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Pool not found: {}", pool_id)))?;

        if pool.status != PoolStatus::Ready {
            return Err(crate::BuildNetError::Config(
                "Pool is not ready to be activated".to_string(),
            ));
        }

        pool.status = PoolStatus::Active;
        pool.updated_at = Utc::now();
        Ok(())
    }

    /// Destroy a pool
    pub fn destroy_pool(&mut self, pool_id: &str) -> Result<ResourcePool> {
        let mut pool = self
            .pools
            .remove(pool_id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Pool not found: {}", pool_id)))?;

        pool.status = PoolStatus::Destroying;
        Ok(pool)
    }

    /// Update pool health status based on node heartbeats
    pub fn update_pool_health(&mut self, pool_id: &str, node_id: &str, is_healthy: bool) -> Result<()> {
        let pool = self
            .pools
            .get_mut(pool_id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Pool not found: {}", pool_id)))?;

        if let Some(allocation) = pool.allocations.iter_mut().find(|a| a.node_id == node_id) {
            allocation.last_health_check = Some(Utc::now());
            allocation.status = if is_healthy {
                AllocationStatus::Active
            } else {
                AllocationStatus::Unreachable
            };
        }

        // Update pool status based on allocations
        let active_count = pool
            .allocations
            .iter()
            .filter(|a| a.status == AllocationStatus::Active)
            .count();

        let total_count = pool.allocations.len();

        if active_count == 0 {
            pool.status = PoolStatus::Failed;
        } else if active_count < total_count {
            pool.status = PoolStatus::Degraded;
        } else if pool.status == PoolStatus::Degraded {
            // Recovered
            pool.status = PoolStatus::Active;
        }

        pool.updated_at = Utc::now();
        Ok(())
    }
}

impl Default for PoolManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            cpu_cores: 0,
            memory_bytes: 0,
            storage: vec![],
            required_tools: vec![],
            required_runtimes: vec![],
            max_latency_ms: None,
            min_storage_class: None,
            prefer_local: true,
            load_balance: LoadBalanceStrategy::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_manager_templates() {
        let manager = PoolManager::new();
        let templates = manager.templates();
        assert!(templates.len() >= 4);

        // Check local-only template exists
        let local = manager.get_template("local-only");
        assert!(local.is_some());
        assert!(local.unwrap().config.prefer_local);
    }

    #[test]
    fn test_create_pool_from_template() {
        let mut manager = PoolManager::new();
        let pool_id = manager
            .create_pool_from_template("local-only", "Test Pool".to_string(), None)
            .unwrap();

        let pool = manager.get_pool(&pool_id).unwrap();
        assert_eq!(pool.name, "Test Pool");
        assert_eq!(pool.status, PoolStatus::Creating);
    }

    #[test]
    fn test_pool_allocation() {
        let mut manager = PoolManager::new();
        let pool_id = manager.create_pool(
            "Test Pool".to_string(),
            None,
            PoolConfig {
                cpu_cores: 4,
                memory_bytes: 8 * 1024 * 1024 * 1024,
                ..Default::default()
            },
        );

        let allocation = NodeAllocation {
            node_id: "node-1".to_string(),
            node_address: "192.168.1.1:9876".to_string(),
            cpu_cores: 4,
            memory_bytes: 8 * 1024 * 1024 * 1024,
            storage: vec![],
            status: AllocationStatus::Active,
            allocated_at: Utc::now(),
            last_health_check: None,
        };

        manager.add_allocation(&pool_id, allocation).unwrap();

        let pool = manager.get_pool(&pool_id).unwrap();
        assert_eq!(pool.status, PoolStatus::Ready);
        assert_eq!(pool.allocations.len(), 1);
    }
}
