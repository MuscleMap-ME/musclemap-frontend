//! Build Time Estimation
//!
//! Estimates build times based on historical data, resource availability,
//! and configuration complexity.

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc, Duration};

use super::{NodeResources, StorageClass};
use super::build_config::{BuildConfig, BuildStep, StepType};
use super::pool::{ResourcePool, PoolConfig};

/// Build time estimation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildEstimate {
    /// Estimated total time in seconds
    pub total_seconds: f64,
    /// Estimated time per step
    pub step_estimates: Vec<StepEstimate>,
    /// Confidence level (0.0 - 1.0)
    pub confidence: f64,
    /// Factors affecting the estimate
    pub factors: Vec<EstimationFactor>,
    /// Warning messages
    pub warnings: Vec<String>,
    /// When estimate was generated
    pub generated_at: DateTime<Utc>,
}

/// Estimate for a single step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepEstimate {
    /// Step ID
    pub step_id: String,
    /// Step name
    pub step_name: String,
    /// Estimated time in seconds
    pub estimated_seconds: f64,
    /// Time range (min, max)
    pub range: (f64, f64),
    /// Whether this step runs in parallel
    pub parallel: bool,
    /// Dependencies that must complete first
    pub blocked_by: Vec<String>,
}

/// Factor affecting build time estimate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstimationFactor {
    /// Factor name
    pub name: String,
    /// Impact multiplier (1.0 = no impact, >1.0 = slower, <1.0 = faster)
    pub multiplier: f64,
    /// Description
    pub description: String,
}

/// Historical build data for learning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildHistoryEntry {
    /// Build configuration ID
    pub config_id: String,
    /// Configuration hash (for similarity matching)
    pub config_hash: String,
    /// Actual build time in seconds
    pub actual_seconds: f64,
    /// Step timings
    pub step_timings: HashMap<String, f64>,
    /// Resources used
    pub resources_used: ResourcesUsed,
    /// When the build completed
    pub completed_at: DateTime<Utc>,
    /// Whether build was successful
    pub success: bool,
}

/// Resources used during a build
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesUsed {
    /// CPU cores used
    pub cpu_cores: usize,
    /// Memory used in bytes
    pub memory_bytes: u64,
    /// Storage class of workspace
    pub storage_class: StorageClass,
    /// Was build distributed
    pub distributed: bool,
    /// Number of nodes used
    pub node_count: usize,
}

/// Build time estimator
pub struct BuildEstimator {
    /// Historical build data
    history: Vec<BuildHistoryEntry>,
    /// Base time estimates for different step types (seconds)
    base_estimates: HashMap<String, f64>,
}

impl BuildEstimator {
    /// Create a new estimator
    pub fn new() -> Self {
        let mut estimator = Self {
            history: Vec::new(),
            base_estimates: HashMap::new(),
        };
        estimator.load_base_estimates();
        estimator
    }

    /// Load default base estimates for step types
    fn load_base_estimates(&mut self) {
        // Shell commands - varies widely
        self.base_estimates.insert("shell".to_string(), 10.0);
        self.base_estimates.insert("script".to_string(), 30.0);

        // Docker operations
        self.base_estimates.insert("docker_build".to_string(), 300.0);
        self.base_estimates.insert("docker_run".to_string(), 60.0);

        // Cargo operations
        self.base_estimates.insert("cargo_check".to_string(), 60.0);
        self.base_estimates.insert("cargo_test".to_string(), 120.0);
        self.base_estimates.insert("cargo_build_dev".to_string(), 90.0);
        self.base_estimates.insert("cargo_build_release".to_string(), 180.0);

        // Node operations
        self.base_estimates.insert("npm_install".to_string(), 60.0);
        self.base_estimates.insert("pnpm_install".to_string(), 30.0);
        self.base_estimates.insert("yarn_install".to_string(), 45.0);
        self.base_estimates.insert("bun_install".to_string(), 15.0);
        self.base_estimates.insert("node_build".to_string(), 60.0);
        self.base_estimates.insert("node_test".to_string(), 45.0);
        self.base_estimates.insert("node_lint".to_string(), 20.0);

        // File operations
        self.base_estimates.insert("file_sync".to_string(), 30.0);
        self.base_estimates.insert("archive".to_string(), 20.0);
    }

    /// Add historical build data
    pub fn add_history(&mut self, entry: BuildHistoryEntry) {
        self.history.push(entry);
    }

    /// Estimate build time for a configuration
    pub fn estimate(
        &self,
        config: &BuildConfig,
        resources: Option<&NodeResources>,
        pool: Option<&ResourcePool>,
    ) -> BuildEstimate {
        let mut factors = Vec::new();
        let mut warnings = Vec::new();
        let mut step_estimates = Vec::new();

        // Calculate base estimates for each step
        for step in &config.steps {
            let base_time = self.estimate_step_time(step);
            step_estimates.push(StepEstimate {
                step_id: step.id.clone(),
                step_name: step.name.clone(),
                estimated_seconds: base_time,
                range: (base_time * 0.7, base_time * 1.5),
                parallel: step.parallel,
                blocked_by: step.depends_on.clone(),
            });
        }

        // Apply resource-based adjustments
        if let Some(resources) = resources {
            let cpu_factor = self.calculate_cpu_factor(resources, config);
            if cpu_factor != 1.0 {
                factors.push(EstimationFactor {
                    name: "CPU".to_string(),
                    multiplier: cpu_factor,
                    description: format!(
                        "{} cores available ({})",
                        resources.cpu.logical_cores,
                        if cpu_factor < 1.0 { "faster" } else { "slower" }
                    ),
                });
            }

            let memory_factor = self.calculate_memory_factor(resources, config);
            if memory_factor != 1.0 {
                factors.push(EstimationFactor {
                    name: "Memory".to_string(),
                    multiplier: memory_factor,
                    description: format!(
                        "{:.1} GB available",
                        resources.memory.available_bytes as f64 / (1024.0 * 1024.0 * 1024.0)
                    ),
                });
            }

            let storage_factor = self.calculate_storage_factor(resources);
            if storage_factor != 1.0 {
                factors.push(EstimationFactor {
                    name: "Storage".to_string(),
                    multiplier: storage_factor,
                    description: format!(
                        "Storage class: {:?}",
                        resources.fastest_storage().map(|s| s.storage_class)
                    ),
                });
            }

            // Check for missing tools
            for step in &config.steps {
                for tool in &step.resources.tools {
                    if !resources.has_tool(tool) {
                        warnings.push(format!("Tool '{}' not available on this node", tool));
                    }
                }
                for runtime in &step.resources.runtimes {
                    if !resources.has_runtime(runtime) {
                        warnings.push(format!("Runtime '{}' not available on this node", runtime));
                    }
                }
            }
        }

        // Apply pool/distributed adjustments
        if let Some(pool) = pool {
            if pool.allocations.len() > 1 {
                let distribution_factor = self.calculate_distribution_factor(pool, config);
                factors.push(EstimationFactor {
                    name: "Distribution".to_string(),
                    multiplier: distribution_factor,
                    description: format!(
                        "Distributed across {} nodes",
                        pool.allocations.len()
                    ),
                });
            }
        }

        // Apply factors to step estimates
        let total_factor: f64 = factors.iter().map(|f| f.multiplier).product();
        for estimate in &mut step_estimates {
            estimate.estimated_seconds *= total_factor;
            estimate.range = (estimate.range.0 * total_factor, estimate.range.1 * total_factor);
        }

        // Calculate total time considering parallelism
        let total_seconds = self.calculate_total_time(&step_estimates);

        // Calculate confidence based on history and factors
        let confidence = self.calculate_confidence(config, &factors);

        BuildEstimate {
            total_seconds,
            step_estimates,
            confidence,
            factors,
            warnings,
            generated_at: Utc::now(),
        }
    }

    /// Estimate time for a single step
    fn estimate_step_time(&self, step: &BuildStep) -> f64 {
        let key = match &step.step_type {
            StepType::Shell(_) => "shell",
            StepType::Script(_) => "script",
            StepType::DockerBuild(_) => "docker_build",
            StepType::DockerRun(_) => "docker_run",
            StepType::CargoBuild(cfg) => {
                if cfg.extra_args.contains(&"check".to_string()) {
                    "cargo_check"
                } else if cfg.extra_args.contains(&"test".to_string()) {
                    "cargo_test"
                } else if cfg.profile == "release" {
                    "cargo_build_release"
                } else {
                    "cargo_build_dev"
                }
            }
            StepType::NodePackage(cfg) => {
                if cfg.command == "install" {
                    match cfg.manager.as_str() {
                        "pnpm" => "pnpm_install",
                        "yarn" => "yarn_install",
                        "bun" => "bun_install",
                        _ => "npm_install",
                    }
                } else if cfg.command == "run" && cfg.args.first().map(|s| s.as_str()) == Some("build") {
                    "node_build"
                } else if cfg.command == "run" && cfg.args.first().map(|s| s.as_str()) == Some("test") {
                    "node_test"
                } else if cfg.command == "run" && cfg.args.first().map(|s| s.as_str()) == Some("lint") {
                    "node_lint"
                } else {
                    "shell"
                }
            }
            StepType::FileSync(_) => "file_sync",
            StepType::Archive(_) => "archive",
            StepType::Plugin(_) => "shell",
        };

        // First check history for similar steps
        let historical_avg = self.get_historical_average(&step.id);
        if let Some(avg) = historical_avg {
            return avg;
        }

        // Fall back to base estimate
        *self.base_estimates.get(key).unwrap_or(&30.0)
    }

    /// Get historical average for a step ID
    fn get_historical_average(&self, step_id: &str) -> Option<f64> {
        let timings: Vec<f64> = self.history
            .iter()
            .filter(|h| h.success)
            .filter_map(|h| h.step_timings.get(step_id).copied())
            .collect();

        if timings.len() >= 3 {
            Some(timings.iter().sum::<f64>() / timings.len() as f64)
        } else {
            None
        }
    }

    /// Calculate CPU factor based on available cores
    fn calculate_cpu_factor(&self, resources: &NodeResources, config: &BuildConfig) -> f64 {
        let available_cores = resources.cpu.logical_cores;

        // Estimate needed cores based on config
        let needed_cores: usize = config.steps
            .iter()
            .filter_map(|s| s.resources.cpu_cores)
            .max()
            .unwrap_or(4);

        if available_cores >= needed_cores * 2 {
            0.8 // Lots of cores = faster
        } else if available_cores >= needed_cores {
            1.0 // Adequate
        } else {
            1.0 + (needed_cores - available_cores) as f64 * 0.2 // Under-resourced
        }
    }

    /// Calculate memory factor
    fn calculate_memory_factor(&self, resources: &NodeResources, config: &BuildConfig) -> f64 {
        let available_gb = resources.memory.available_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

        // Estimate needed memory based on config
        let needed_bytes: u64 = config.steps
            .iter()
            .filter_map(|s| s.resources.memory_bytes)
            .max()
            .unwrap_or(4 * 1024 * 1024 * 1024); // Default 4GB

        let needed_gb = needed_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

        if available_gb >= needed_gb * 2.0 {
            0.9 // Plenty of memory
        } else if available_gb >= needed_gb {
            1.0 // Adequate
        } else {
            1.0 + (needed_gb - available_gb) * 0.1 // May swap
        }
    }

    /// Calculate storage factor based on storage class
    fn calculate_storage_factor(&self, resources: &NodeResources) -> f64 {
        match resources.fastest_storage().map(|s| s.storage_class) {
            Some(StorageClass::NVMe) => 0.8,
            Some(StorageClass::SSD) => 1.0,
            Some(StorageClass::HDD) => 1.5,
            Some(StorageClass::Network) => 2.0,
            _ => 1.0,
        }
    }

    /// Calculate distribution factor
    fn calculate_distribution_factor(&self, pool: &ResourcePool, config: &BuildConfig) -> f64 {
        let node_count = pool.allocations.len();
        let parallelizable_steps = config.steps.iter().filter(|s| s.parallel).count();
        let total_steps = config.steps.len();

        if parallelizable_steps == 0 || node_count == 1 {
            return 1.0;
        }

        // Estimate speedup from parallelization
        // Amdahl's Law: 1 / (s + p/n) where s = serial fraction, p = parallel fraction
        let parallel_fraction = parallelizable_steps as f64 / total_steps as f64;
        let serial_fraction = 1.0 - parallel_fraction;

        let theoretical_speedup = 1.0 / (serial_fraction + parallel_fraction / node_count as f64);

        // Account for network overhead (diminishing returns)
        let overhead = 1.0 + 0.1 * (node_count as f64 - 1.0);

        theoretical_speedup / overhead
    }

    /// Calculate total time considering step dependencies and parallelism
    fn calculate_total_time(&self, estimates: &[StepEstimate]) -> f64 {
        if estimates.is_empty() {
            return 0.0;
        }

        // Build dependency graph and calculate critical path
        let mut completion_times: HashMap<String, f64> = HashMap::new();

        // Topological sort and calculate
        let mut remaining: Vec<&StepEstimate> = estimates.iter().collect();
        let mut progress = true;

        while !remaining.is_empty() && progress {
            progress = false;
            let mut completed_this_round = Vec::new();

            for (idx, estimate) in remaining.iter().enumerate() {
                // Check if all dependencies are complete
                let deps_complete = estimate.blocked_by.iter().all(|dep| completion_times.contains_key(dep));

                if deps_complete {
                    // Calculate start time (max completion time of dependencies)
                    let start_time = estimate.blocked_by
                        .iter()
                        .filter_map(|dep| completion_times.get(dep))
                        .max_by(|a, b| a.partial_cmp(b).unwrap())
                        .copied()
                        .unwrap_or(0.0);

                    // Completion time = start + duration
                    completion_times.insert(
                        estimate.step_id.clone(),
                        start_time + estimate.estimated_seconds,
                    );

                    completed_this_round.push(idx);
                    progress = true;
                }
            }

            // Remove completed from remaining (in reverse order to maintain indices)
            for idx in completed_this_round.into_iter().rev() {
                remaining.remove(idx);
            }
        }

        // Total time is the max completion time
        completion_times.values().max_by(|a, b| a.partial_cmp(b).unwrap()).copied().unwrap_or(0.0)
    }

    /// Calculate confidence level
    fn calculate_confidence(&self, config: &BuildConfig, factors: &[EstimationFactor]) -> f64 {
        let mut confidence = 0.5; // Base confidence

        // More history = more confidence
        let relevant_history = self.history
            .iter()
            .filter(|h| h.config_id == config.id && h.success)
            .count();

        confidence += (relevant_history as f64 * 0.1).min(0.3);

        // Fewer extreme factors = more confidence
        let extreme_factors = factors.iter().filter(|f| f.multiplier < 0.5 || f.multiplier > 2.0).count();
        confidence -= extreme_factors as f64 * 0.1;

        // Simpler configs = more predictable
        if config.steps.len() <= 3 {
            confidence += 0.1;
        }

        confidence.clamp(0.1, 0.95)
    }

    /// Format estimate as human-readable string
    pub fn format_estimate(estimate: &BuildEstimate) -> String {
        let duration = Duration::seconds(estimate.total_seconds as i64);
        let minutes = duration.num_minutes();
        let seconds = duration.num_seconds() % 60;

        if minutes > 0 {
            format!(
                "~{}m {}s (confidence: {:.0}%)",
                minutes, seconds, estimate.confidence * 100.0
            )
        } else {
            format!(
                "~{}s (confidence: {:.0}%)",
                seconds, estimate.confidence * 100.0
            )
        }
    }
}

impl Default for BuildEstimator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::build_config::*;

    #[test]
    fn test_basic_estimation() {
        let estimator = BuildEstimator::new();

        let config = BuildConfig {
            name: "Test Build".to_string(),
            steps: vec![
                BuildStep {
                    id: "install".to_string(),
                    name: "Install".to_string(),
                    step_type: StepType::NodePackage(NodePackageConfig {
                        manager: "pnpm".to_string(),
                        command: "install".to_string(),
                        args: vec![],
                        working_dir: None,
                        env: HashMap::new(),
                    }),
                    ..Default::default()
                },
                BuildStep {
                    id: "build".to_string(),
                    name: "Build".to_string(),
                    step_type: StepType::NodePackage(NodePackageConfig {
                        manager: "pnpm".to_string(),
                        command: "run".to_string(),
                        args: vec!["build".to_string()],
                        working_dir: None,
                        env: HashMap::new(),
                    }),
                    depends_on: vec!["install".to_string()],
                    ..Default::default()
                },
            ],
            ..Default::default()
        };

        let estimate = estimator.estimate(&config, None, None);

        assert!(estimate.total_seconds > 0.0);
        assert!(estimate.confidence > 0.0);
        assert_eq!(estimate.step_estimates.len(), 2);
    }

    #[test]
    fn test_format_estimate() {
        let estimate = BuildEstimate {
            total_seconds: 125.0,
            step_estimates: vec![],
            confidence: 0.75,
            factors: vec![],
            warnings: vec![],
            generated_at: Utc::now(),
        };

        let formatted = BuildEstimator::format_estimate(&estimate);
        assert!(formatted.contains("2m"));
        assert!(formatted.contains("5s"));
        assert!(formatted.contains("75%"));
    }

    #[test]
    fn test_parallel_calculation() {
        let estimator = BuildEstimator::new();

        let config = BuildConfig {
            name: "Parallel Build".to_string(),
            steps: vec![
                BuildStep {
                    id: "a".to_string(),
                    name: "Step A".to_string(),
                    step_type: StepType::Shell(ShellStepConfig {
                        command: "echo a".to_string(),
                        shell: None,
                        working_dir: None,
                        env: HashMap::new(),
                    }),
                    ..Default::default()
                },
                BuildStep {
                    id: "b".to_string(),
                    name: "Step B".to_string(),
                    step_type: StepType::Shell(ShellStepConfig {
                        command: "echo b".to_string(),
                        shell: None,
                        working_dir: None,
                        env: HashMap::new(),
                    }),
                    parallel: true,
                    depends_on: vec!["a".to_string()],
                    ..Default::default()
                },
                BuildStep {
                    id: "c".to_string(),
                    name: "Step C".to_string(),
                    step_type: StepType::Shell(ShellStepConfig {
                        command: "echo c".to_string(),
                        shell: None,
                        working_dir: None,
                        env: HashMap::new(),
                    }),
                    parallel: true,
                    depends_on: vec!["a".to_string()],
                    ..Default::default()
                },
                BuildStep {
                    id: "d".to_string(),
                    name: "Step D".to_string(),
                    step_type: StepType::Shell(ShellStepConfig {
                        command: "echo d".to_string(),
                        shell: None,
                        working_dir: None,
                        env: HashMap::new(),
                    }),
                    depends_on: vec!["b".to_string(), "c".to_string()],
                    ..Default::default()
                },
            ],
            ..Default::default()
        };

        let estimate = estimator.estimate(&config, None, None);

        // B and C should run in parallel after A, so total should be less than sum
        let sum: f64 = estimate.step_estimates.iter().map(|s| s.estimated_seconds).sum();
        assert!(estimate.total_seconds < sum);
    }
}
