//! Build orchestration for BuildNet
//!
//! Handles dependency resolution, parallel builds, and caching.

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Instant;

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tokio::sync::Semaphore;
use uuid::Uuid;

use crate::cache::ArtifactCache;
use crate::config::{Config, PackageConfig};
use crate::hasher::ContentHasher;
use crate::state::{BuildStatus, StateManager};
use crate::{BuildNetError, Result};

/// Build tier for intelligent caching
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BuildTier {
    /// No changes, skip entirely
    InstantSkip = 0,
    /// Restore from cache
    CacheRestore = 1,
    /// Small change, quick incremental
    MicroIncremental = 2,
    /// Moderate changes
    SmartIncremental = 3,
    /// Full rebuild needed
    FullBuild = 4,
}

impl std::fmt::Display for BuildTier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BuildTier::InstantSkip => write!(f, "INSTANT_SKIP"),
            BuildTier::CacheRestore => write!(f, "CACHE_RESTORE"),
            BuildTier::MicroIncremental => write!(f, "MICRO_INCREMENTAL"),
            BuildTier::SmartIncremental => write!(f, "SMART_INCREMENTAL"),
            BuildTier::FullBuild => write!(f, "FULL_BUILD"),
        }
    }
}

/// Build result for a single package
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildResult {
    pub package: String,
    pub tier: BuildTier,
    pub status: BuildStatus,
    pub duration_ms: u64,
    pub source_hash: String,
    pub output_hash: Option<String>,
    pub error: Option<String>,
}

/// Build orchestrator
pub struct BuildOrchestrator {
    config: Config,
    state: Arc<StateManager>,
    cache: Arc<ArtifactCache>,
    hasher: Arc<RwLock<ContentHasher>>,
    /// Semaphore for limiting concurrent builds
    semaphore: Arc<Semaphore>,
    /// Unique ID for this orchestrator instance
    instance_id: String,
}

impl BuildOrchestrator {
    /// Create a new build orchestrator
    pub fn new(config: Config, state: Arc<StateManager>, cache: Arc<ArtifactCache>) -> Self {
        let max_concurrent = config.max_concurrent_builds;

        Self {
            config,
            state,
            cache,
            hasher: Arc::new(RwLock::new(ContentHasher::new())),
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            instance_id: Uuid::new_v4().to_string(),
        }
    }

    /// Determine the build tier for a package
    pub async fn determine_tier(&self, package: &PackageConfig) -> Result<(BuildTier, String)> {
        // Hash source files
        let source_hash = {
            let mut hasher = self.hasher.write();
            let files = hasher.hash_glob(&self.config.project_root, &package.sources)?;
            let hashes: Vec<&str> = files.iter().map(|f| f.hash.as_str()).collect();
            ContentHasher::combine_hashes(&hashes)
        };

        // Check for existing cached build
        if let Some(cached) = self.state.find_cached_build(&package.name, &source_hash)? {
            // Check if output still exists
            let output_dir = self.config.project_root.join(&package.output_dir);
            if output_dir.exists() {
                // Output exists and source unchanged - instant skip
                return Ok((BuildTier::InstantSkip, source_hash));
            }

            // Output missing but we have cache - restore from cache
            if let Some(output_hash) = &cached.output_hash {
                if self.cache.exists(output_hash) {
                    return Ok((BuildTier::CacheRestore, source_hash));
                }
            }
        }

        // No cache hit - determine build tier based on change analysis
        // For now, use SmartIncremental as default
        // TODO: Implement dependency graph analysis for more precise tier selection

        Ok((BuildTier::SmartIncremental, source_hash))
    }

    /// Build a single package
    pub async fn build_package(&self, package: &PackageConfig) -> Result<BuildResult> {
        let start = Instant::now();

        // Determine build tier
        let (tier, source_hash) = self.determine_tier(package).await?;

        tracing::info!(
            "Building {} - Tier: {}, Source Hash: {}",
            package.name,
            tier,
            &source_hash[..8]
        );

        match tier {
            BuildTier::InstantSkip => {
                return Ok(BuildResult {
                    package: package.name.clone(),
                    tier,
                    status: BuildStatus::Cached,
                    duration_ms: start.elapsed().as_millis() as u64,
                    source_hash,
                    output_hash: None,
                    error: None,
                });
            }

            BuildTier::CacheRestore => {
                // Find cached build and restore
                if let Some(cached) = self.state.find_cached_build(&package.name, &source_hash)? {
                    if let Some(output_hash) = &cached.output_hash {
                        let output_dir = self.config.project_root.join(&package.output_dir);
                        self.cache.restore(output_hash, &output_dir)?;

                        return Ok(BuildResult {
                            package: package.name.clone(),
                            tier,
                            status: BuildStatus::Cached,
                            duration_ms: start.elapsed().as_millis() as u64,
                            source_hash,
                            output_hash: Some(output_hash.clone()),
                            error: None,
                        });
                    }
                }
                // Fall through to actual build if restore fails
            }

            _ => {}
        }

        // Acquire build lock
        let lock_acquired = self
            .state
            .acquire_lock(&package.name, &self.instance_id, 600)?;

        if !lock_acquired {
            return Err(BuildNetError::LockFailed(format!(
                "Could not acquire lock for package {}",
                package.name
            )));
        }

        // Start build in state
        let build_id = self.state.start_build(&package.name, &source_hash)?;

        // Acquire semaphore permit
        let _permit = self.semaphore.acquire().await.unwrap();

        // Execute build command
        let result = self.execute_build(package).await;

        // Release lock
        self.state.release_lock(&package.name, &self.instance_id)?;

        match result {
            Ok(()) => {
                // Store output in cache
                let output_dir = self.config.project_root.join(&package.output_dir);
                let output_hash = if output_dir.exists() {
                    Some(self.cache.store(&package.name, &output_dir)?)
                } else {
                    None
                };

                // Complete build in state
                self.state
                    .complete_build(&build_id, output_hash.as_deref(), BuildStatus::Completed, None)?;

                Ok(BuildResult {
                    package: package.name.clone(),
                    tier,
                    status: BuildStatus::Completed,
                    duration_ms: start.elapsed().as_millis() as u64,
                    source_hash,
                    output_hash,
                    error: None,
                })
            }

            Err(e) => {
                let error_msg = e.to_string();

                self.state.complete_build(
                    &build_id,
                    None,
                    BuildStatus::Failed,
                    Some(&error_msg),
                )?;

                Ok(BuildResult {
                    package: package.name.clone(),
                    tier,
                    status: BuildStatus::Failed,
                    duration_ms: start.elapsed().as_millis() as u64,
                    source_hash,
                    output_hash: None,
                    error: Some(error_msg),
                })
            }
        }
    }

    /// Execute the build command for a package
    async fn execute_build(&self, package: &PackageConfig) -> Result<()> {
        let cwd = self.config.project_root.join(&package.path);

        tracing::debug!("Executing: {} in {:?}", package.build_cmd, cwd);

        let output = Command::new("sh")
            .arg("-c")
            .arg(&package.build_cmd)
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(BuildNetError::BuildFailed(format!(
                "Command failed with exit code {}: {}",
                output.status.code().unwrap_or(-1),
                stderr
            )));
        }

        Ok(())
    }

    /// Build all packages respecting dependencies
    pub async fn build_all(&self) -> Result<Vec<BuildResult>> {
        let packages = &self.config.packages;

        // Build dependency graph
        let order = self.topological_sort(packages)?;

        let mut results = Vec::new();

        // Build in dependency order
        // Group packages at same level for parallel execution
        let mut levels: Vec<Vec<&PackageConfig>> = Vec::new();
        let mut built: HashSet<String> = HashSet::new();

        while built.len() < packages.len() {
            let mut level = Vec::new();

            for name in &order {
                if built.contains(name) {
                    continue;
                }

                let pkg = packages.iter().find(|p| &p.name == name).unwrap();

                // Check if all dependencies are built
                let deps_ready = pkg.dependencies.iter().all(|d| built.contains(d));

                if deps_ready {
                    level.push(pkg);
                }
            }

            if level.is_empty() {
                break; // No progress, cycle detected
            }

            levels.push(level);

            for pkg in &levels[levels.len() - 1] {
                built.insert(pkg.name.clone());
            }
        }

        // Execute each level
        for level in levels {
            if level.len() == 1 {
                // Single package - build directly
                let result = self.build_package(level[0]).await?;
                results.push(result);
            } else {
                // Multiple packages - build in parallel
                let mut handles = Vec::new();

                for pkg in level {
                    let pkg = pkg.clone();
                    let orchestrator = self.clone();

                    handles.push(tokio::spawn(async move {
                        orchestrator.build_package(&pkg).await
                    }));
                }

                for handle in handles {
                    match handle.await {
                        Ok(Ok(result)) => results.push(result),
                        Ok(Err(e)) => return Err(e),
                        Err(e) => return Err(BuildNetError::Internal(e.into())),
                    }
                }
            }
        }

        Ok(results)
    }

    /// Topological sort of packages
    fn topological_sort(&self, packages: &[PackageConfig]) -> Result<Vec<String>> {
        let mut order = Vec::new();
        let mut visited = HashSet::new();
        let mut temp = HashSet::new();

        let pkg_map: HashMap<&str, &PackageConfig> =
            packages.iter().map(|p| (p.name.as_str(), p)).collect();

        fn visit<'a>(
            name: &'a str,
            pkg_map: &HashMap<&'a str, &'a PackageConfig>,
            visited: &mut HashSet<&'a str>,
            temp: &mut HashSet<&'a str>,
            order: &mut Vec<String>,
        ) -> Result<()> {
            if temp.contains(name) {
                return Err(BuildNetError::InvalidConfig(format!(
                    "Circular dependency detected: {}",
                    name
                )));
            }
            if visited.contains(name) {
                return Ok(());
            }

            temp.insert(name);

            if let Some(pkg) = pkg_map.get(name) {
                for dep in &pkg.dependencies {
                    visit(dep.as_str(), pkg_map, visited, temp, order)?;
                }
            }

            temp.remove(name);
            visited.insert(name);
            order.push(name.to_string());

            Ok(())
        }

        for pkg in packages {
            visit(&pkg.name, &pkg_map, &mut visited, &mut temp, &mut order)?;
        }

        Ok(order)
    }
}

impl Clone for BuildOrchestrator {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            state: Arc::clone(&self.state),
            cache: Arc::clone(&self.cache),
            hasher: Arc::clone(&self.hasher),
            semaphore: Arc::clone(&self.semaphore),
            instance_id: self.instance_id.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_topological_sort() {
        let packages = vec![
            PackageConfig {
                name: "a".into(),
                dependencies: vec!["b".into(), "c".into()],
                ..Default::default()
            },
            PackageConfig {
                name: "b".into(),
                dependencies: vec!["c".into()],
                ..Default::default()
            },
            PackageConfig {
                name: "c".into(),
                dependencies: vec![],
                ..Default::default()
            },
        ];

        let state = StateManager::in_memory().unwrap();
        let cache = ArtifactCache::new(Path::new("/tmp/test-cache")).unwrap();

        let orchestrator = BuildOrchestrator::new(
            Config::default(),
            Arc::new(state),
            Arc::new(cache),
        );

        let order = orchestrator.topological_sort(&packages).unwrap();

        // c should come before b, b should come before a
        let c_pos = order.iter().position(|x| x == "c").unwrap();
        let b_pos = order.iter().position(|x| x == "b").unwrap();
        let a_pos = order.iter().position(|x| x == "a").unwrap();

        assert!(c_pos < b_pos);
        assert!(b_pos < a_pos);
    }
}

impl Default for PackageConfig {
    fn default() -> Self {
        Self {
            name: String::new(),
            path: PathBuf::new(),
            build_cmd: String::new(),
            dependencies: Vec::new(),
            sources: Vec::new(),
            output_dir: PathBuf::new(),
        }
    }
}
