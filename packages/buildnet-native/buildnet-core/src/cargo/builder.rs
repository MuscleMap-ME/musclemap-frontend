//! Cargo build execution

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::Instant;

use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::broadcast;

use super::target::{ArtifactType, BuildArtifact, TargetCache, TargetTriple};
use super::workspace::{CargoWorkspace, CrateInfo, CrateType};
use crate::hasher::ContentHasher;
use crate::{BuildNetError, Result};

/// Cargo build profile
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CargoProfile {
    /// Debug profile (unoptimized, debug symbols)
    #[default]
    Dev,
    /// Release profile (optimized)
    Release,
    /// Test profile
    Test,
    /// Bench profile
    Bench,
    /// Custom profile
    Custom,
}

impl CargoProfile {
    /// Get the cargo flag for this profile
    pub fn cargo_flag(&self) -> Option<&'static str> {
        match self {
            CargoProfile::Dev => None,
            CargoProfile::Release => Some("--release"),
            CargoProfile::Test => None,
            CargoProfile::Bench => Some("--bench"),
            CargoProfile::Custom => None,
        }
    }

    /// Get the target directory name for this profile
    pub fn target_dir(&self) -> &'static str {
        match self {
            CargoProfile::Dev | CargoProfile::Test => "debug",
            CargoProfile::Release | CargoProfile::Bench => "release",
            CargoProfile::Custom => "custom",
        }
    }
}

impl std::fmt::Display for CargoProfile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CargoProfile::Dev => write!(f, "dev"),
            CargoProfile::Release => write!(f, "release"),
            CargoProfile::Test => write!(f, "test"),
            CargoProfile::Bench => write!(f, "bench"),
            CargoProfile::Custom => write!(f, "custom"),
        }
    }
}

/// Options for cargo build
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CargoBuildOptions {
    /// Target triple (defaults to host)
    pub target: Option<TargetTriple>,
    /// Build profile
    pub profile: CargoProfile,
    /// Features to enable
    pub features: Vec<String>,
    /// Disable default features
    pub no_default_features: bool,
    /// Build all features
    pub all_features: bool,
    /// Specific packages to build (empty = all)
    pub packages: Vec<String>,
    /// Exclude packages
    pub exclude: Vec<String>,
    /// Build all targets (lib, bin, tests, examples)
    pub all_targets: bool,
    /// Number of parallel jobs
    pub jobs: Option<u32>,
    /// Use locked Cargo.lock
    pub locked: bool,
    /// Offline mode
    pub offline: bool,
    /// Extra cargo flags
    pub extra_flags: Vec<String>,
    /// Environment variables
    pub env: HashMap<String, String>,
    /// Verbose output
    pub verbose: bool,
    /// Build timing info
    pub timings: bool,
}

impl CargoBuildOptions {
    /// Create options for release build
    pub fn release() -> Self {
        Self {
            profile: CargoProfile::Release,
            ..Default::default()
        }
    }

    /// Create options for a specific package
    pub fn package(name: &str) -> Self {
        Self {
            packages: vec![name.to_string()],
            ..Default::default()
        }
    }

    /// Build arguments for cargo command
    pub fn build_args(&self) -> Vec<String> {
        let mut args = vec!["build".to_string()];

        // Profile
        if let Some(flag) = self.profile.cargo_flag() {
            args.push(flag.to_string());
        }

        // Target
        if let Some(target) = &self.target {
            args.push("--target".to_string());
            args.push(target.0.clone());
        }

        // Features
        if self.all_features {
            args.push("--all-features".to_string());
        } else {
            if self.no_default_features {
                args.push("--no-default-features".to_string());
            }
            if !self.features.is_empty() {
                args.push("--features".to_string());
                args.push(self.features.join(","));
            }
        }

        // Packages
        for pkg in &self.packages {
            args.push("-p".to_string());
            args.push(pkg.clone());
        }

        for pkg in &self.exclude {
            args.push("--exclude".to_string());
            args.push(pkg.clone());
        }

        // All targets
        if self.all_targets {
            args.push("--all-targets".to_string());
        }

        // Jobs
        if let Some(jobs) = self.jobs {
            args.push("-j".to_string());
            args.push(jobs.to_string());
        }

        // Locked/Offline
        if self.locked {
            args.push("--locked".to_string());
        }
        if self.offline {
            args.push("--offline".to_string());
        }

        // Verbose
        if self.verbose {
            args.push("-v".to_string());
        }

        // Timing
        if self.timings {
            args.push("--timings".to_string());
        }

        // Extra flags
        args.extend(self.extra_flags.clone());

        args
    }
}

/// Result of a cargo build
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CargoBuildResult {
    /// Build success
    pub success: bool,
    /// Packages built
    pub packages: Vec<String>,
    /// Build duration in milliseconds
    pub duration_ms: u64,
    /// Artifacts produced
    pub artifacts: Vec<BuildArtifact>,
    /// Compiler warnings
    pub warnings: Vec<CompilerMessage>,
    /// Compiler errors
    pub errors: Vec<CompilerMessage>,
    /// Build started at
    pub started_at: DateTime<Utc>,
    /// Build completed at
    pub completed_at: DateTime<Utc>,
    /// Target triple
    pub target: TargetTriple,
    /// Profile used
    pub profile: CargoProfile,
    /// Source hash (for caching)
    pub source_hash: String,
}

/// Compiler message (warning or error)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompilerMessage {
    /// Message level (warning, error, note, help)
    pub level: String,
    /// Message text
    pub message: String,
    /// Source file
    pub file: Option<String>,
    /// Line number
    pub line: Option<u32>,
    /// Column number
    pub column: Option<u32>,
    /// Code (e.g., E0001)
    pub code: Option<String>,
}

/// Cargo builder
pub struct CargoBuilder {
    /// Workspace root
    workspace_root: PathBuf,
    /// Parsed workspace
    workspace: CargoWorkspace,
    /// Target cache
    target_cache: Arc<TargetCache>,
    /// Content hasher
    hasher: Arc<RwLock<ContentHasher>>,
    /// Build output sender
    output_tx: broadcast::Sender<BuildOutput>,
}

/// Build output message
#[derive(Debug, Clone)]
pub enum BuildOutput {
    /// Stdout line
    Stdout(String),
    /// Stderr line
    Stderr(String),
    /// Compiler message
    Message(CompilerMessage),
    /// Build started
    Started { package: String },
    /// Build completed
    Completed { package: String, success: bool },
}

impl CargoBuilder {
    /// Create a new cargo builder
    pub fn new(workspace_root: &Path, cache_dir: &Path) -> Result<Self> {
        let workspace = CargoWorkspace::parse(workspace_root)?;
        let target_cache = Arc::new(TargetCache::new(cache_dir)?);
        let (output_tx, _) = broadcast::channel(1000);

        Ok(Self {
            workspace_root: workspace_root.to_path_buf(),
            workspace,
            target_cache,
            hasher: Arc::new(RwLock::new(ContentHasher::new())),
            output_tx,
        })
    }

    /// Subscribe to build output
    pub fn subscribe(&self) -> broadcast::Receiver<BuildOutput> {
        self.output_tx.subscribe()
    }

    /// Get workspace info
    pub fn workspace(&self) -> &CargoWorkspace {
        &self.workspace
    }

    /// Get target cache
    pub fn cache(&self) -> &Arc<TargetCache> {
        &self.target_cache
    }

    /// Build the entire workspace
    pub async fn build(&self, options: &CargoBuildOptions) -> Result<CargoBuildResult> {
        let start = Instant::now();
        let started_at = Utc::now();
        let target = options.target.clone().unwrap_or_else(TargetTriple::host);

        // Calculate source hash
        let source_hash = self.calculate_source_hash(&options.packages).await?;

        // Check cache
        if !options.packages.is_empty() {
            let all_cached = options.packages.iter().all(|pkg| {
                self.target_cache.has_cached(pkg, &target, &options.profile.to_string(), &source_hash)
            });

            if all_cached {
                tracing::info!("All packages cached, skipping build");
                return Ok(CargoBuildResult {
                    success: true,
                    packages: options.packages.clone(),
                    duration_ms: start.elapsed().as_millis() as u64,
                    artifacts: Vec::new(), // Would need to restore from cache
                    warnings: Vec::new(),
                    errors: Vec::new(),
                    started_at,
                    completed_at: Utc::now(),
                    target,
                    profile: options.profile,
                    source_hash,
                });
            }
        }

        // Build arguments
        let args = options.build_args();
        tracing::info!("Running: cargo {}", args.join(" "));

        // Execute cargo build
        let mut cmd = Command::new("cargo");
        cmd.args(&args)
            .current_dir(&self.workspace_root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("CARGO_TERM_COLOR", "always");

        // Add custom environment
        for (key, value) in &options.env {
            cmd.env(key, value);
        }

        // Use JSON output for better parsing
        cmd.arg("--message-format=json-diagnostic-rendered-ansi");

        let mut child = cmd.spawn()?;

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let mut warnings = Vec::new();
        let mut errors = Vec::new();
        let mut artifacts = Vec::new();

        // Process stdout (JSON messages)
        let output_tx = self.output_tx.clone();
        let stdout_handle = tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                let _ = output_tx.send(BuildOutput::Stdout(line.clone()));

                // Try to parse as cargo JSON message
                if let Ok(msg) = serde_json::from_str::<CargoMessage>(&line) {
                    match msg {
                        CargoMessage::CompilerMessage { message } => {
                            if let Some(rendered) = message.rendered {
                                let _ = output_tx.send(BuildOutput::Stderr(rendered));
                            }
                        }
                        CargoMessage::CompilerArtifact { target, filenames, .. } => {
                            tracing::debug!("Artifact: {} -> {:?}", target.name, filenames);
                        }
                        CargoMessage::BuildFinished { success } => {
                            tracing::info!("Build finished: success={}", success);
                        }
                        _ => {}
                    }
                }
            }
        });

        // Process stderr
        let output_tx2 = self.output_tx.clone();
        let stderr_handle = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                let _ = output_tx2.send(BuildOutput::Stderr(line));
            }
        });

        // Wait for completion
        let status = child.wait().await?;
        let _ = stdout_handle.await;
        let _ = stderr_handle.await;

        let completed_at = Utc::now();
        let duration_ms = start.elapsed().as_millis() as u64;

        // Find produced artifacts
        let target_dir = self.workspace_root.join("target");
        let profile_dir = if let Some(t) = &options.target {
            target_dir.join(&t.0).join(options.profile.target_dir())
        } else {
            target_dir.join(options.profile.target_dir())
        };

        if profile_dir.exists() {
            artifacts = self.collect_artifacts(&profile_dir, &target, &options.profile).await?;

            // Cache artifacts
            for artifact in &artifacts {
                if let Err(e) = self.target_cache.store(artifact, &source_hash) {
                    tracing::warn!("Failed to cache artifact {}: {}", artifact.name, e);
                }
            }
        }

        Ok(CargoBuildResult {
            success: status.success(),
            packages: if options.packages.is_empty() {
                self.workspace.crates.iter().map(|c| c.name.clone()).collect()
            } else {
                options.packages.clone()
            },
            duration_ms,
            artifacts,
            warnings,
            errors,
            started_at,
            completed_at,
            target,
            profile: options.profile,
            source_hash,
        })
    }

    /// Build a specific crate
    pub async fn build_crate(&self, name: &str, options: &CargoBuildOptions) -> Result<CargoBuildResult> {
        let mut opts = options.clone();
        opts.packages = vec![name.to_string()];
        self.build(&opts).await
    }

    /// Clean build artifacts
    pub async fn clean(&self, package: Option<&str>) -> Result<()> {
        let mut args = vec!["clean".to_string()];

        if let Some(pkg) = package {
            args.push("-p".to_string());
            args.push(pkg.to_string());
        }

        let output = Command::new("cargo")
            .args(&args)
            .current_dir(&self.workspace_root)
            .output()
            .await?;

        if !output.status.success() {
            return Err(BuildNetError::BuildFailed(
                String::from_utf8_lossy(&output.stderr).to_string()
            ));
        }

        Ok(())
    }

    /// Run cargo check (fast compilation check)
    pub async fn check(&self, options: &CargoBuildOptions) -> Result<CargoBuildResult> {
        let start = Instant::now();
        let started_at = Utc::now();
        let target = options.target.clone().unwrap_or_else(TargetTriple::host);

        let mut args = vec!["check".to_string()];

        // Add common options
        if let Some(flag) = options.profile.cargo_flag() {
            args.push(flag.to_string());
        }
        if let Some(t) = &options.target {
            args.push("--target".to_string());
            args.push(t.0.clone());
        }
        for pkg in &options.packages {
            args.push("-p".to_string());
            args.push(pkg.clone());
        }

        args.push("--message-format=json".to_string());

        let output = Command::new("cargo")
            .args(&args)
            .current_dir(&self.workspace_root)
            .output()
            .await?;

        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Parse JSON output
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if let Ok(msg) = serde_json::from_str::<CargoMessage>(line) {
                if let CargoMessage::CompilerMessage { message } = msg {
                    let compiler_msg = CompilerMessage {
                        level: message.level.clone(),
                        message: message.message.clone(),
                        file: message.spans.first().and_then(|s| s.file_name.clone()),
                        line: message.spans.first().map(|s| s.line_start),
                        column: message.spans.first().map(|s| s.column_start),
                        code: message.code.as_ref().map(|c| c.code.clone()),
                    };

                    if message.level == "warning" {
                        warnings.push(compiler_msg);
                    } else if message.level == "error" {
                        errors.push(compiler_msg);
                    }
                }
            }
        }

        let source_hash = self.calculate_source_hash(&options.packages).await?;

        Ok(CargoBuildResult {
            success: output.status.success(),
            packages: if options.packages.is_empty() {
                self.workspace.crates.iter().map(|c| c.name.clone()).collect()
            } else {
                options.packages.clone()
            },
            duration_ms: start.elapsed().as_millis() as u64,
            artifacts: Vec::new(),
            warnings,
            errors,
            started_at,
            completed_at: Utc::now(),
            target,
            profile: options.profile,
            source_hash,
        })
    }

    /// Run cargo test
    pub async fn test(&self, options: &CargoBuildOptions) -> Result<TestResult> {
        let start = Instant::now();

        let mut args = vec!["test".to_string()];

        if let Some(flag) = options.profile.cargo_flag() {
            args.push(flag.to_string());
        }
        for pkg in &options.packages {
            args.push("-p".to_string());
            args.push(pkg.clone());
        }

        let output = Command::new("cargo")
            .args(&args)
            .current_dir(&self.workspace_root)
            .output()
            .await?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        // Parse test results
        let mut passed = 0u32;
        let mut failed = 0u32;
        let mut ignored = 0u32;

        for line in stdout.lines() {
            if line.starts_with("test result:") {
                // Parse "test result: ok. X passed; Y failed; Z ignored"
                let parts: Vec<&str> = line.split(|c| c == '.' || c == ';').collect();
                for part in parts {
                    let part = part.trim();
                    if part.ends_with("passed") {
                        if let Ok(n) = part.split_whitespace().next().unwrap_or("0").parse() {
                            passed = n;
                        }
                    } else if part.ends_with("failed") {
                        if let Ok(n) = part.split_whitespace().next().unwrap_or("0").parse() {
                            failed = n;
                        }
                    } else if part.ends_with("ignored") {
                        if let Ok(n) = part.split_whitespace().next().unwrap_or("0").parse() {
                            ignored = n;
                        }
                    }
                }
            }
        }

        Ok(TestResult {
            success: output.status.success(),
            passed,
            failed,
            ignored,
            duration_ms: start.elapsed().as_millis() as u64,
            stdout,
            stderr,
        })
    }

    /// Calculate source hash for packages
    async fn calculate_source_hash(&self, packages: &[String]) -> Result<String> {
        let crates: Vec<&CrateInfo> = if packages.is_empty() {
            self.workspace.crates.iter().collect()
        } else {
            self.workspace.crates.iter()
                .filter(|c| packages.contains(&c.name))
                .collect()
        };

        let mut hashes = Vec::new();
        let mut hasher = self.hasher.write();

        for crate_info in crates {
            let src_dir = crate_info.path.join("src");
            if src_dir.exists() {
                let files = hasher.hash_glob(&crate_info.path, &["src/**/*.rs".to_string()])?;
                for file in files {
                    hashes.push(file.hash);
                }
            }

            // Include Cargo.toml
            let cargo_toml = crate_info.path.join("Cargo.toml");
            if cargo_toml.exists() {
                let meta = hasher.hash_file(&cargo_toml)?;
                hashes.push(meta.hash);
            }
        }

        let refs: Vec<&str> = hashes.iter().map(|s| s.as_str()).collect();
        Ok(ContentHasher::combine_hashes(&refs))
    }

    /// Collect build artifacts from target directory
    async fn collect_artifacts(
        &self,
        profile_dir: &Path,
        target: &TargetTriple,
        profile: &CargoProfile,
    ) -> Result<Vec<BuildArtifact>> {
        let mut artifacts = Vec::new();

        // Look for binaries
        for entry in std::fs::read_dir(profile_dir)? {
            let entry = entry?;
            let path = entry.path();

            if !path.is_file() {
                continue;
            }

            let name = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();

            // Skip build script outputs and deps
            if name.starts_with("build-script-") || name.starts_with("lib") && name.contains("-") {
                continue;
            }

            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
            let artifact_type = match ext {
                "" if !target.is_windows() => Some(ArtifactType::Binary),
                "exe" if target.is_windows() => Some(ArtifactType::Binary),
                "rlib" => Some(ArtifactType::Rlib),
                "so" | "dylib" | "dll" => Some(ArtifactType::DynamicLib),
                "a" | "lib" => Some(ArtifactType::StaticLib),
                _ => None,
            };

            if let Some(artifact_type) = artifact_type {
                let metadata = std::fs::metadata(&path)?;
                let file_meta = {
                    let mut hasher = self.hasher.write();
                    hasher.hash_file(&path)?
                };

                artifacts.push(BuildArtifact {
                    name: name.clone(),
                    artifact_type,
                    path: path.clone(),
                    size: metadata.len(),
                    hash: file_meta.hash,
                    target: target.clone(),
                    profile: profile.to_string(),
                    built_at: Utc::now(),
                    features: Vec::new(),
                });
            }
        }

        Ok(artifacts)
    }
}

/// Test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub success: bool,
    pub passed: u32,
    pub failed: u32,
    pub ignored: u32,
    pub duration_ms: u64,
    pub stdout: String,
    pub stderr: String,
}

// Cargo JSON message types

#[derive(Debug, Deserialize)]
#[serde(tag = "reason")]
#[serde(rename_all = "kebab-case")]
enum CargoMessage {
    CompilerMessage {
        message: DiagnosticMessage,
    },
    CompilerArtifact {
        target: ArtifactTarget,
        filenames: Vec<String>,
    },
    BuildFinished {
        success: bool,
    },
    BuildScriptExecuted {
        package_id: String,
    },
    #[serde(other)]
    Other,
}

#[derive(Debug, Deserialize)]
struct DiagnosticMessage {
    level: String,
    message: String,
    code: Option<DiagnosticCode>,
    spans: Vec<DiagnosticSpan>,
    rendered: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DiagnosticCode {
    code: String,
}

#[derive(Debug, Deserialize)]
struct DiagnosticSpan {
    file_name: Option<String>,
    line_start: u32,
    column_start: u32,
}

#[derive(Debug, Deserialize)]
struct ArtifactTarget {
    name: String,
}
