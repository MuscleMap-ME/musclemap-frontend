//! Template System for BuildNet
//!
//! Build templates with hot-swapping support.

pub mod engine;
pub mod loader;

pub use engine::{TemplateEngine, TemplateContext};
pub use loader::{TemplateLoader, TemplateSource};

use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Build template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildTemplate {
    /// Template ID
    pub id: String,
    /// Template name
    pub name: String,
    /// Description
    pub description: Option<String>,
    /// Template version
    pub version: String,
    /// Author
    pub author: Option<String>,
    /// Tags for searching
    pub tags: Vec<String>,
    /// Build configuration
    pub build: BuildConfig,
    /// Environment variables
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// Pre-build steps
    #[serde(default)]
    pub pre_build: Vec<BuildStep>,
    /// Post-build steps
    #[serde(default)]
    pub post_build: Vec<BuildStep>,
    /// Created timestamp
    pub created_at: DateTime<Utc>,
    /// Updated timestamp
    pub updated_at: DateTime<Utc>,
}

impl BuildTemplate {
    /// Create a new template
    pub fn new(id: &str, name: &str) -> Self {
        let now = Utc::now();
        Self {
            id: id.to_string(),
            name: name.to_string(),
            description: None,
            version: "1.0.0".to_string(),
            author: None,
            tags: vec![],
            build: BuildConfig::default(),
            env: HashMap::new(),
            pre_build: vec![],
            post_build: vec![],
            created_at: now,
            updated_at: now,
        }
    }

    /// Validate template
    pub fn validate(&self) -> Result<(), TemplateError> {
        if self.id.is_empty() {
            return Err(TemplateError::Invalid("Template ID cannot be empty".into()));
        }
        if self.name.is_empty() {
            return Err(TemplateError::Invalid("Template name cannot be empty".into()));
        }
        if self.build.command.is_empty() {
            return Err(TemplateError::Invalid("Build command cannot be empty".into()));
        }
        Ok(())
    }
}

/// Build configuration within a template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildConfig {
    /// Build command
    pub command: String,
    /// Working directory (relative to project root)
    #[serde(default = "default_cwd")]
    pub cwd: String,
    /// Timeout in seconds
    #[serde(default = "default_timeout")]
    pub timeout_secs: u64,
    /// Continue on error
    #[serde(default)]
    pub continue_on_error: bool,
    /// Cache settings
    #[serde(default)]
    pub cache: CacheConfig,
    /// Output patterns to capture
    #[serde(default)]
    pub outputs: Vec<String>,
    /// Input patterns (sources)
    #[serde(default)]
    pub inputs: Vec<String>,
}

fn default_cwd() -> String { ".".into() }
fn default_timeout() -> u64 { 600 }

impl Default for BuildConfig {
    fn default() -> Self {
        Self {
            command: "pnpm build".to_string(),
            cwd: default_cwd(),
            timeout_secs: default_timeout(),
            continue_on_error: false,
            cache: CacheConfig::default(),
            outputs: vec!["dist/**".into()],
            inputs: vec!["src/**".into()],
        }
    }
}

/// Cache configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// Enable caching
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// Cache key template
    #[serde(default = "default_cache_key")]
    pub key: String,
    /// Paths to cache
    #[serde(default)]
    pub paths: Vec<String>,
    /// TTL in seconds
    #[serde(default = "default_cache_ttl")]
    pub ttl_secs: u64,
}

fn default_true() -> bool { true }
fn default_cache_key() -> String { "{{ package }}-{{ hash }}".into() }
fn default_cache_ttl() -> u64 { 86400 * 7 } // 7 days

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            key: default_cache_key(),
            paths: vec!["dist".into(), "node_modules/.cache".into()],
            ttl_secs: default_cache_ttl(),
        }
    }
}

/// Build step (pre/post)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildStep {
    /// Step name
    pub name: String,
    /// Command to run
    pub command: String,
    /// Working directory
    #[serde(default = "default_cwd")]
    pub cwd: String,
    /// Continue on error
    #[serde(default)]
    pub continue_on_error: bool,
    /// Condition for running (optional)
    pub condition: Option<String>,
}

impl BuildStep {
    /// Create a new build step
    pub fn new(name: &str, command: &str) -> Self {
        Self {
            name: name.to_string(),
            command: command.to_string(),
            cwd: default_cwd(),
            continue_on_error: false,
            condition: None,
        }
    }
}

/// Template error
#[derive(Debug, Clone, thiserror::Error)]
pub enum TemplateError {
    #[error("Invalid template: {0}")]
    Invalid(String),
    #[error("Template not found: {0}")]
    NotFound(String),
    #[error("Template parse error: {0}")]
    Parse(String),
    #[error("Template render error: {0}")]
    Render(String),
    #[error("Template IO error: {0}")]
    Io(String),
}

/// Template registry
pub struct TemplateRegistry {
    /// Templates by ID
    templates: HashMap<String, BuildTemplate>,
    /// Templates by tag
    by_tag: HashMap<String, Vec<String>>,
}

impl TemplateRegistry {
    /// Create a new template registry
    pub fn new() -> Self {
        Self {
            templates: HashMap::new(),
            by_tag: HashMap::new(),
        }
    }

    /// Register a template
    pub fn register(&mut self, template: BuildTemplate) -> Result<(), TemplateError> {
        template.validate()?;

        let id = template.id.clone();

        // Index by tags
        for tag in &template.tags {
            self.by_tag
                .entry(tag.clone())
                .or_default()
                .push(id.clone());
        }

        self.templates.insert(id, template);
        Ok(())
    }

    /// Get a template by ID
    pub fn get(&self, id: &str) -> Option<&BuildTemplate> {
        self.templates.get(id)
    }

    /// Find templates by tag
    pub fn find_by_tag(&self, tag: &str) -> Vec<&BuildTemplate> {
        self.by_tag
            .get(tag)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| self.templates.get(id))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// List all templates
    pub fn list(&self) -> Vec<&BuildTemplate> {
        self.templates.values().collect()
    }

    /// Remove a template
    pub fn remove(&mut self, id: &str) -> Option<BuildTemplate> {
        if let Some(template) = self.templates.remove(id) {
            // Remove from tag index
            for tag in &template.tags {
                if let Some(ids) = self.by_tag.get_mut(tag) {
                    ids.retain(|i| i != id);
                }
            }
            Some(template)
        } else {
            None
        }
    }
}

impl Default for TemplateRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Built-in templates
pub fn builtin_templates() -> Vec<BuildTemplate> {
    vec![
        // Node.js TypeScript template
        BuildTemplate {
            id: "node-typescript".into(),
            name: "Node.js TypeScript".into(),
            description: Some("Standard Node.js TypeScript project".into()),
            version: "1.0.0".into(),
            author: Some("BuildNet".into()),
            tags: vec!["node".into(), "typescript".into()],
            build: BuildConfig {
                command: "pnpm build".into(),
                cwd: ".".into(),
                timeout_secs: 300,
                continue_on_error: false,
                cache: CacheConfig::default(),
                outputs: vec!["dist/**".into()],
                inputs: vec!["src/**/*.ts".into(), "src/**/*.tsx".into()],
            },
            env: HashMap::new(),
            pre_build: vec![
                BuildStep::new("typecheck", "pnpm typecheck"),
            ],
            post_build: vec![],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
        // Rust template
        BuildTemplate {
            id: "rust-release".into(),
            name: "Rust Release Build".into(),
            description: Some("Optimized Rust release build".into()),
            version: "1.0.0".into(),
            author: Some("BuildNet".into()),
            tags: vec!["rust".into()],
            build: BuildConfig {
                command: "cargo build --release".into(),
                cwd: ".".into(),
                timeout_secs: 600,
                continue_on_error: false,
                cache: CacheConfig {
                    enabled: true,
                    key: "{{ package }}-rust-{{ hash }}".into(),
                    paths: vec!["target/release".into()],
                    ttl_secs: 86400 * 14, // 14 days
                },
                outputs: vec!["target/release/*".into()],
                inputs: vec!["src/**/*.rs".into(), "Cargo.toml".into(), "Cargo.lock".into()],
            },
            env: {
                let mut env = HashMap::new();
                env.insert("RUSTFLAGS".into(), "-C target-cpu=native".into());
                env
            },
            pre_build: vec![
                BuildStep::new("fmt", "cargo fmt --check"),
                BuildStep::new("clippy", "cargo clippy -- -D warnings"),
            ],
            post_build: vec![],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
        // Vite React template
        BuildTemplate {
            id: "vite-react".into(),
            name: "Vite React".into(),
            description: Some("Vite React frontend build".into()),
            version: "1.0.0".into(),
            author: Some("BuildNet".into()),
            tags: vec!["vite".into(), "react".into(), "frontend".into()],
            build: BuildConfig {
                command: "pnpm build".into(),
                cwd: ".".into(),
                timeout_secs: 300,
                continue_on_error: false,
                cache: CacheConfig {
                    enabled: true,
                    key: "{{ package }}-vite-{{ hash }}".into(),
                    paths: vec!["dist".into(), "node_modules/.vite".into()],
                    ttl_secs: 86400 * 7,
                },
                outputs: vec!["dist/**".into()],
                inputs: vec!["src/**".into(), "index.html".into(), "vite.config.*".into()],
            },
            env: {
                let mut env = HashMap::new();
                env.insert("NODE_OPTIONS".into(), "--max-old-space-size=4096".into());
                env
            },
            pre_build: vec![],
            post_build: vec![
                BuildStep::new("compress", "./scripts/compress-assets.sh"),
            ],
            created_at: Utc::now(),
            updated_at: Utc::now(),
        },
    ]
}
