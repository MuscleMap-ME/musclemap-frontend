//! Build Configuration System
//!
//! Defines build configurations that can use resource pools,
//! specify build steps, and estimate build times.

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// A complete build configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildConfig {
    /// Unique configuration ID
    pub id: String,
    /// Configuration name
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Resource pool to use (or "local" for local-only)
    pub pool_id: Option<String>,
    /// Build steps to execute
    pub steps: Vec<BuildStep>,
    /// Environment variables
    pub env: HashMap<String, String>,
    /// Working directory
    pub working_dir: Option<PathBuf>,
    /// Artifact patterns to collect
    pub artifacts: Vec<ArtifactConfig>,
    /// Cache configuration
    pub cache: CacheConfig,
    /// Notification settings
    pub notifications: NotificationConfig,
    /// Timeout in seconds (0 = no timeout)
    pub timeout_seconds: u64,
    /// Retry configuration
    pub retry: RetryConfig,
    /// Tags for categorization
    pub tags: Vec<String>,
    /// Whether this config is enabled
    pub enabled: bool,
    /// When config was created
    pub created_at: DateTime<Utc>,
    /// Last update time
    pub updated_at: DateTime<Utc>,
}

/// A single build step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildStep {
    /// Step ID
    pub id: String,
    /// Step name
    pub name: String,
    /// Step type
    pub step_type: StepType,
    /// Whether this step can run in parallel with previous
    pub parallel: bool,
    /// Dependencies (step IDs that must complete first)
    pub depends_on: Vec<String>,
    /// Resource requirements for this step
    pub resources: StepResources,
    /// Whether failure of this step fails the entire build
    pub critical: bool,
    /// Timeout for this specific step (seconds)
    pub timeout_seconds: Option<u64>,
    /// Retry configuration for this step
    pub retry: Option<RetryConfig>,
}

/// Step type with specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "config")]
pub enum StepType {
    /// Shell command execution
    Shell(ShellStepConfig),
    /// Run a script
    Script(ScriptStepConfig),
    /// Docker container build
    DockerBuild(DockerBuildConfig),
    /// Docker container run
    DockerRun(DockerRunConfig),
    /// Cargo build
    CargoBuild(CargoBuildConfig),
    /// npm/pnpm/yarn command
    NodePackage(NodePackageConfig),
    /// File copy/sync
    FileSync(FileSyncConfig),
    /// Archive creation
    Archive(ArchiveConfig),
    /// Custom plugin step
    Plugin(PluginStepConfig),
}

/// Shell command configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellStepConfig {
    /// Command to execute
    pub command: String,
    /// Shell to use (default: /bin/sh)
    pub shell: Option<String>,
    /// Working directory override
    pub working_dir: Option<PathBuf>,
    /// Environment variables
    pub env: HashMap<String, String>,
}

/// Script step configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptStepConfig {
    /// Script content
    pub script: String,
    /// Interpreter (e.g., "bash", "python", "node")
    pub interpreter: String,
    /// Working directory
    pub working_dir: Option<PathBuf>,
    /// Environment variables
    pub env: HashMap<String, String>,
}

/// Docker build configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerBuildConfig {
    /// Dockerfile path (relative to context)
    pub dockerfile: String,
    /// Build context path
    pub context: PathBuf,
    /// Image tag
    pub tag: String,
    /// Build arguments
    pub build_args: HashMap<String, String>,
    /// Target stage (for multi-stage builds)
    pub target: Option<String>,
    /// Cache from images
    pub cache_from: Vec<String>,
    /// Platform (e.g., "linux/amd64")
    pub platform: Option<String>,
}

/// Docker run configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerRunConfig {
    /// Image to run
    pub image: String,
    /// Command override
    pub command: Option<Vec<String>>,
    /// Volume mounts
    pub volumes: Vec<VolumeMount>,
    /// Port mappings
    pub ports: Vec<PortMapping>,
    /// Environment variables
    pub env: HashMap<String, String>,
    /// Network mode
    pub network: Option<String>,
    /// Remove container after run
    pub rm: bool,
}

/// Cargo build configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CargoBuildConfig {
    /// Manifest path
    pub manifest_path: Option<PathBuf>,
    /// Package to build
    pub package: Option<String>,
    /// Build profile (dev, release, etc.)
    pub profile: String,
    /// Target triple
    pub target: Option<String>,
    /// Features to enable
    pub features: Vec<String>,
    /// Enable all features
    pub all_features: bool,
    /// Additional cargo arguments
    pub extra_args: Vec<String>,
}

/// Node package manager configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodePackageConfig {
    /// Package manager (npm, pnpm, yarn, bun)
    pub manager: String,
    /// Command (install, build, test, etc.)
    pub command: String,
    /// Additional arguments
    pub args: Vec<String>,
    /// Working directory
    pub working_dir: Option<PathBuf>,
    /// Environment variables
    pub env: HashMap<String, String>,
}

/// File sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSyncConfig {
    /// Source path
    pub source: PathBuf,
    /// Destination path
    pub destination: PathBuf,
    /// Include patterns
    pub include: Vec<String>,
    /// Exclude patterns
    pub exclude: Vec<String>,
    /// Delete files in dest not in source
    pub delete: bool,
    /// Preserve timestamps
    pub preserve_times: bool,
}

/// Archive configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveConfig {
    /// Output path
    pub output: PathBuf,
    /// Format (tar, tar.gz, tar.zst, zip)
    pub format: String,
    /// Source paths
    pub sources: Vec<PathBuf>,
    /// Compression level (1-9)
    pub compression_level: Option<u32>,
}

/// Plugin step configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginStepConfig {
    /// Plugin name
    pub plugin: String,
    /// Plugin-specific configuration
    pub config: serde_json::Value,
}

/// Volume mount for Docker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeMount {
    /// Host path
    pub host: PathBuf,
    /// Container path
    pub container: PathBuf,
    /// Read-only
    pub readonly: bool,
}

/// Port mapping for Docker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    /// Host port
    pub host: u16,
    /// Container port
    pub container: u16,
    /// Protocol (tcp/udp)
    pub protocol: String,
}

/// Resource requirements for a step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResources {
    /// CPU cores needed
    pub cpu_cores: Option<usize>,
    /// Memory needed in bytes
    pub memory_bytes: Option<u64>,
    /// Storage needed in bytes
    pub storage_bytes: Option<u64>,
    /// Required tools
    pub tools: Vec<String>,
    /// Required runtimes
    pub runtimes: Vec<String>,
    /// GPU required
    pub gpu: bool,
}

impl Default for StepResources {
    fn default() -> Self {
        Self {
            cpu_cores: None,
            memory_bytes: None,
            storage_bytes: None,
            tools: vec![],
            runtimes: vec![],
            gpu: false,
        }
    }
}

/// Artifact configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactConfig {
    /// Artifact name
    pub name: String,
    /// Path patterns to collect
    pub paths: Vec<String>,
    /// Expiration days (0 = never)
    pub expire_days: u32,
}

/// Cache configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// Enable caching
    pub enabled: bool,
    /// Cache key template
    pub key: String,
    /// Paths to cache
    pub paths: Vec<PathBuf>,
    /// Fallback keys
    pub fallback_keys: Vec<String>,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            key: "{{ .Branch }}-{{ hash .LockFile }}".to_string(),
            paths: vec![],
            fallback_keys: vec![],
        }
    }
}

/// Notification configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    /// Notify on success
    pub on_success: bool,
    /// Notify on failure
    pub on_failure: bool,
    /// Notify on start
    pub on_start: bool,
    /// Notification channels
    pub channels: Vec<String>,
}

impl Default for NotificationConfig {
    fn default() -> Self {
        Self {
            on_success: false,
            on_failure: true,
            on_start: false,
            channels: vec![],
        }
    }
}

/// Retry configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// Maximum retry attempts
    pub max_attempts: u32,
    /// Initial delay between retries (seconds)
    pub initial_delay_seconds: u32,
    /// Backoff multiplier
    pub backoff_multiplier: f32,
    /// Maximum delay (seconds)
    pub max_delay_seconds: u32,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_seconds: 5,
            backoff_multiplier: 2.0,
            max_delay_seconds: 60,
        }
    }
}

/// Build configuration manager
pub struct BuildConfigManager {
    /// Stored configurations
    configs: HashMap<String, BuildConfig>,
    /// Configuration templates
    templates: Vec<BuildConfigTemplate>,
}

/// Build configuration template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildConfigTemplate {
    /// Template ID
    pub id: String,
    /// Template name
    pub name: String,
    /// Description
    pub description: String,
    /// Base configuration
    pub config: BuildConfig,
    /// Variables that can be customized
    pub variables: Vec<TemplateVariable>,
    /// Whether this is a built-in template
    pub builtin: bool,
}

/// Template variable
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    /// Variable name
    pub name: String,
    /// Description
    pub description: String,
    /// Default value
    pub default: Option<String>,
    /// Whether required
    pub required: bool,
    /// Validation pattern (regex)
    pub pattern: Option<String>,
}

impl BuildConfigManager {
    /// Create a new configuration manager
    pub fn new() -> Self {
        let mut manager = Self {
            configs: HashMap::new(),
            templates: Vec::new(),
        };
        manager.load_builtin_templates();
        manager
    }

    /// Load built-in templates
    fn load_builtin_templates(&mut self) {
        // Rust/Cargo template
        self.templates.push(BuildConfigTemplate {
            id: "rust-cargo".to_string(),
            name: "Rust Cargo Build".to_string(),
            description: "Standard Cargo build with test and release".to_string(),
            config: BuildConfig {
                id: String::new(),
                name: "Rust Cargo Build".to_string(),
                description: None,
                pool_id: None,
                steps: vec![
                    BuildStep {
                        id: "check".to_string(),
                        name: "Cargo Check".to_string(),
                        step_type: StepType::CargoBuild(CargoBuildConfig {
                            manifest_path: None,
                            package: None,
                            profile: "dev".to_string(),
                            target: None,
                            features: vec![],
                            all_features: false,
                            extra_args: vec!["check".to_string()],
                        }),
                        parallel: false,
                        depends_on: vec![],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(300),
                        retry: None,
                    },
                    BuildStep {
                        id: "test".to_string(),
                        name: "Cargo Test".to_string(),
                        step_type: StepType::CargoBuild(CargoBuildConfig {
                            manifest_path: None,
                            package: None,
                            profile: "dev".to_string(),
                            target: None,
                            features: vec![],
                            all_features: false,
                            extra_args: vec!["test".to_string()],
                        }),
                        parallel: false,
                        depends_on: vec!["check".to_string()],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(600),
                        retry: None,
                    },
                    BuildStep {
                        id: "build".to_string(),
                        name: "Cargo Build Release".to_string(),
                        step_type: StepType::CargoBuild(CargoBuildConfig {
                            manifest_path: None,
                            package: None,
                            profile: "release".to_string(),
                            target: None,
                            features: vec![],
                            all_features: false,
                            extra_args: vec![],
                        }),
                        parallel: false,
                        depends_on: vec!["test".to_string()],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(900),
                        retry: None,
                    },
                ],
                env: HashMap::new(),
                working_dir: None,
                artifacts: vec![ArtifactConfig {
                    name: "binaries".to_string(),
                    paths: vec!["target/release/*".to_string()],
                    expire_days: 30,
                }],
                cache: CacheConfig {
                    enabled: true,
                    key: "rust-{{ hash Cargo.lock }}".to_string(),
                    paths: vec![
                        PathBuf::from("target"),
                        PathBuf::from("~/.cargo/registry"),
                    ],
                    fallback_keys: vec!["rust-".to_string()],
                },
                notifications: NotificationConfig::default(),
                timeout_seconds: 1800,
                retry: RetryConfig::default(),
                tags: vec!["rust".to_string(), "cargo".to_string()],
                enabled: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            variables: vec![
                TemplateVariable {
                    name: "profile".to_string(),
                    description: "Build profile".to_string(),
                    default: Some("release".to_string()),
                    required: false,
                    pattern: None,
                },
                TemplateVariable {
                    name: "target".to_string(),
                    description: "Target triple".to_string(),
                    default: None,
                    required: false,
                    pattern: None,
                },
            ],
            builtin: true,
        });

        // Node.js/TypeScript template
        self.templates.push(BuildConfigTemplate {
            id: "nodejs-typescript".to_string(),
            name: "Node.js TypeScript Build".to_string(),
            description: "TypeScript build with lint, test, and bundle".to_string(),
            config: BuildConfig {
                id: String::new(),
                name: "Node.js TypeScript Build".to_string(),
                description: None,
                pool_id: None,
                steps: vec![
                    BuildStep {
                        id: "install".to_string(),
                        name: "Install Dependencies".to_string(),
                        step_type: StepType::NodePackage(NodePackageConfig {
                            manager: "pnpm".to_string(),
                            command: "install".to_string(),
                            args: vec!["--frozen-lockfile".to_string()],
                            working_dir: None,
                            env: HashMap::new(),
                        }),
                        parallel: false,
                        depends_on: vec![],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(300),
                        retry: Some(RetryConfig {
                            max_attempts: 3,
                            initial_delay_seconds: 10,
                            backoff_multiplier: 2.0,
                            max_delay_seconds: 60,
                        }),
                    },
                    BuildStep {
                        id: "typecheck".to_string(),
                        name: "TypeScript Check".to_string(),
                        step_type: StepType::NodePackage(NodePackageConfig {
                            manager: "pnpm".to_string(),
                            command: "run".to_string(),
                            args: vec!["typecheck".to_string()],
                            working_dir: None,
                            env: HashMap::new(),
                        }),
                        parallel: true,
                        depends_on: vec!["install".to_string()],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(180),
                        retry: None,
                    },
                    BuildStep {
                        id: "lint".to_string(),
                        name: "Lint".to_string(),
                        step_type: StepType::NodePackage(NodePackageConfig {
                            manager: "pnpm".to_string(),
                            command: "run".to_string(),
                            args: vec!["lint".to_string()],
                            working_dir: None,
                            env: HashMap::new(),
                        }),
                        parallel: true,
                        depends_on: vec!["install".to_string()],
                        resources: StepResources::default(),
                        critical: false,
                        timeout_seconds: Some(180),
                        retry: None,
                    },
                    BuildStep {
                        id: "test".to_string(),
                        name: "Test".to_string(),
                        step_type: StepType::NodePackage(NodePackageConfig {
                            manager: "pnpm".to_string(),
                            command: "run".to_string(),
                            args: vec!["test".to_string()],
                            working_dir: None,
                            env: HashMap::new(),
                        }),
                        parallel: false,
                        depends_on: vec!["typecheck".to_string()],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(600),
                        retry: None,
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
                        parallel: false,
                        depends_on: vec!["test".to_string()],
                        resources: StepResources::default(),
                        critical: true,
                        timeout_seconds: Some(600),
                        retry: None,
                    },
                ],
                env: HashMap::new(),
                working_dir: None,
                artifacts: vec![ArtifactConfig {
                    name: "dist".to_string(),
                    paths: vec!["dist/**/*".to_string()],
                    expire_days: 30,
                }],
                cache: CacheConfig {
                    enabled: true,
                    key: "node-{{ hash pnpm-lock.yaml }}".to_string(),
                    paths: vec![
                        PathBuf::from("node_modules"),
                        PathBuf::from(".pnpm-store"),
                    ],
                    fallback_keys: vec!["node-".to_string()],
                },
                notifications: NotificationConfig::default(),
                timeout_seconds: 1800,
                retry: RetryConfig::default(),
                tags: vec!["node".to_string(), "typescript".to_string()],
                enabled: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            variables: vec![
                TemplateVariable {
                    name: "package_manager".to_string(),
                    description: "Package manager (npm, pnpm, yarn, bun)".to_string(),
                    default: Some("pnpm".to_string()),
                    required: false,
                    pattern: Some("^(npm|pnpm|yarn|bun)$".to_string()),
                },
            ],
            builtin: true,
        });

        // Docker build template
        self.templates.push(BuildConfigTemplate {
            id: "docker-build".to_string(),
            name: "Docker Build & Push".to_string(),
            description: "Build Docker image and push to registry".to_string(),
            config: BuildConfig {
                id: String::new(),
                name: "Docker Build".to_string(),
                description: None,
                pool_id: None,
                steps: vec![
                    BuildStep {
                        id: "build".to_string(),
                        name: "Docker Build".to_string(),
                        step_type: StepType::DockerBuild(DockerBuildConfig {
                            dockerfile: "Dockerfile".to_string(),
                            context: PathBuf::from("."),
                            tag: "app:latest".to_string(),
                            build_args: HashMap::new(),
                            target: None,
                            cache_from: vec![],
                            platform: None,
                        }),
                        parallel: false,
                        depends_on: vec![],
                        resources: StepResources {
                            tools: vec!["docker".to_string()],
                            ..Default::default()
                        },
                        critical: true,
                        timeout_seconds: Some(1200),
                        retry: None,
                    },
                ],
                env: HashMap::new(),
                working_dir: None,
                artifacts: vec![],
                cache: CacheConfig::default(),
                notifications: NotificationConfig::default(),
                timeout_seconds: 1800,
                retry: RetryConfig::default(),
                tags: vec!["docker".to_string()],
                enabled: true,
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            variables: vec![
                TemplateVariable {
                    name: "tag".to_string(),
                    description: "Docker image tag".to_string(),
                    default: Some("app:latest".to_string()),
                    required: true,
                    pattern: None,
                },
                TemplateVariable {
                    name: "dockerfile".to_string(),
                    description: "Dockerfile path".to_string(),
                    default: Some("Dockerfile".to_string()),
                    required: false,
                    pattern: None,
                },
            ],
            builtin: true,
        });
    }

    /// Get all templates
    pub fn templates(&self) -> &[BuildConfigTemplate] {
        &self.templates
    }

    /// Get a template by ID
    pub fn get_template(&self, id: &str) -> Option<&BuildConfigTemplate> {
        self.templates.iter().find(|t| t.id == id)
    }

    /// Add a custom template
    pub fn add_template(&mut self, template: BuildConfigTemplate) {
        self.templates.push(template);
    }

    /// Create a configuration from template
    pub fn create_from_template(
        &mut self,
        template_id: &str,
        name: String,
        variables: HashMap<String, String>,
    ) -> Result<String> {
        let template = self
            .get_template(template_id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Template not found: {}", template_id)))?
            .clone();

        let mut config = template.config;
        config.id = Uuid::new_v4().to_string();
        config.name = name;
        config.created_at = Utc::now();
        config.updated_at = Utc::now();

        // TODO: Apply variables to configuration

        let id = config.id.clone();
        self.configs.insert(id.clone(), config);
        Ok(id)
    }

    /// Create a custom configuration
    pub fn create_config(&mut self, config: BuildConfig) -> String {
        let mut config = config;
        if config.id.is_empty() {
            config.id = Uuid::new_v4().to_string();
        }
        config.created_at = Utc::now();
        config.updated_at = Utc::now();

        let id = config.id.clone();
        self.configs.insert(id.clone(), config);
        id
    }

    /// Get a configuration by ID
    pub fn get_config(&self, id: &str) -> Option<&BuildConfig> {
        self.configs.get(id)
    }

    /// Get a mutable configuration
    pub fn get_config_mut(&mut self, id: &str) -> Option<&mut BuildConfig> {
        self.configs.get_mut(id)
    }

    /// List all configurations
    pub fn list_configs(&self) -> Vec<&BuildConfig> {
        self.configs.values().collect()
    }

    /// Delete a configuration
    pub fn delete_config(&mut self, id: &str) -> Option<BuildConfig> {
        self.configs.remove(id)
    }

    /// Clone a configuration
    pub fn clone_config(&mut self, id: &str, new_name: String) -> Result<String> {
        let config = self
            .configs
            .get(id)
            .ok_or_else(|| crate::BuildNetError::Config(format!("Config not found: {}", id)))?
            .clone();

        let mut new_config = config;
        new_config.id = Uuid::new_v4().to_string();
        new_config.name = new_name;
        new_config.created_at = Utc::now();
        new_config.updated_at = Utc::now();

        let new_id = new_config.id.clone();
        self.configs.insert(new_id.clone(), new_config);
        Ok(new_id)
    }
}

impl Default for BuildConfigManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for BuildConfig {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            description: None,
            pool_id: None,
            steps: vec![],
            env: HashMap::new(),
            working_dir: None,
            artifacts: vec![],
            cache: CacheConfig::default(),
            notifications: NotificationConfig::default(),
            timeout_seconds: 3600,
            retry: RetryConfig::default(),
            tags: vec![],
            enabled: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl Default for BuildStep {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: String::new(),
            step_type: StepType::Shell(ShellStepConfig {
                command: String::new(),
                shell: None,
                working_dir: None,
                env: HashMap::new(),
            }),
            parallel: false,
            depends_on: vec![],
            resources: StepResources::default(),
            critical: true,
            timeout_seconds: None,
            retry: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_manager_templates() {
        let manager = BuildConfigManager::new();
        let templates = manager.templates();
        assert!(templates.len() >= 3);

        // Check rust template exists
        let rust = manager.get_template("rust-cargo");
        assert!(rust.is_some());
        assert_eq!(rust.unwrap().config.steps.len(), 3);
    }

    #[test]
    fn test_create_config() {
        let mut manager = BuildConfigManager::new();

        let config = BuildConfig {
            name: "Test Config".to_string(),
            steps: vec![BuildStep {
                name: "Test Step".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };

        let id = manager.create_config(config);
        let saved = manager.get_config(&id).unwrap();
        assert_eq!(saved.name, "Test Config");
        assert_eq!(saved.steps.len(), 1);
    }

    #[test]
    fn test_clone_config() {
        let mut manager = BuildConfigManager::new();

        let config = BuildConfig {
            name: "Original".to_string(),
            ..Default::default()
        };

        let id = manager.create_config(config);
        let cloned_id = manager.clone_config(&id, "Cloned".to_string()).unwrap();

        let original = manager.get_config(&id).unwrap();
        let cloned = manager.get_config(&cloned_id).unwrap();

        assert_eq!(original.name, "Original");
        assert_eq!(cloned.name, "Cloned");
        assert_ne!(original.id, cloned.id);
    }
}
