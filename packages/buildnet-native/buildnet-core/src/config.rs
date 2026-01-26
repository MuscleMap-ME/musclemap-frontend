//! BuildNet configuration

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// BuildNet configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Path to the project root
    pub project_root: PathBuf,

    /// Path to the state database
    pub db_path: PathBuf,

    /// Path to the artifact cache
    pub cache_path: PathBuf,

    /// HTTP server port
    pub http_port: u16,

    /// Unix socket path for IPC
    pub socket_path: PathBuf,

    /// Maximum concurrent builds
    pub max_concurrent_builds: usize,

    /// File watch debounce interval in milliseconds
    pub watch_debounce_ms: u64,

    /// Build timeout in seconds
    pub build_timeout_secs: u64,

    /// Enable verbose logging
    pub verbose: bool,

    /// Packages to build (workspace members)
    pub packages: Vec<PackageConfig>,
}

/// Package configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageConfig {
    /// Package name
    pub name: String,

    /// Path relative to project root
    pub path: PathBuf,

    /// Build command
    pub build_cmd: String,

    /// Dependencies (other package names)
    pub dependencies: Vec<String>,

    /// Source patterns to watch
    pub sources: Vec<String>,

    /// Output directory
    pub output_dir: PathBuf,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            project_root: PathBuf::from("."),
            db_path: PathBuf::from(".buildnet/state.db"),
            cache_path: PathBuf::from(".buildnet/cache"),
            http_port: 9876,
            socket_path: PathBuf::from("/tmp/buildnet.sock"),
            max_concurrent_builds: num_cpus(),
            watch_debounce_ms: 100,
            build_timeout_secs: 600,
            verbose: false,
            packages: Vec::new(),
        }
    }
}

impl Config {
    /// Load configuration from a file
    pub fn load(path: &std::path::Path) -> crate::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to a file
    pub fn save(&self, path: &std::path::Path) -> crate::Result<()> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Create configuration for a typical pnpm monorepo
    pub fn for_pnpm_monorepo(project_root: PathBuf) -> Self {
        Self {
            project_root,
            packages: vec![
                PackageConfig {
                    name: "shared".into(),
                    path: "packages/shared".into(),
                    build_cmd: "pnpm -C packages/shared build".into(),
                    dependencies: vec![],
                    sources: vec!["packages/shared/src/**/*.ts".into()],
                    output_dir: "packages/shared/dist".into(),
                },
                PackageConfig {
                    name: "core".into(),
                    path: "packages/core".into(),
                    build_cmd: "pnpm -C packages/core build".into(),
                    dependencies: vec!["shared".into()],
                    sources: vec!["packages/core/src/**/*.ts".into()],
                    output_dir: "packages/core/dist".into(),
                },
                PackageConfig {
                    name: "api".into(),
                    path: "apps/api".into(),
                    build_cmd: "pnpm -C apps/api build".into(),
                    dependencies: vec!["shared".into(), "core".into()],
                    sources: vec!["apps/api/src/**/*.ts".into()],
                    output_dir: "apps/api/dist".into(),
                },
                PackageConfig {
                    name: "frontend".into(),
                    path: ".".into(),
                    build_cmd: "pnpm build:vite".into(),
                    dependencies: vec!["shared".into(), "core".into()],
                    sources: vec!["src/**/*.{ts,tsx,js,jsx}".into()],
                    output_dir: "dist".into(),
                },
            ],
            ..Default::default()
        }
    }
}

fn num_cpus() -> usize {
    std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(4)
}
