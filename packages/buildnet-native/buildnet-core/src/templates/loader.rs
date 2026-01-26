//! Template loading and hot-swapping

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use notify::{RecommendedWatcher, RecursiveMode, Watcher, EventKind};
use parking_lot::RwLock;
use tokio::sync::mpsc;

use super::{BuildTemplate, TemplateError, TemplateRegistry};
use crate::Result;

/// Template source
#[derive(Debug, Clone)]
pub enum TemplateSource {
    /// Load from file system
    File(PathBuf),
    /// Load from URL
    Url(String),
    /// Load from embedded/inline
    Inline(String),
    /// Load from registry
    Registry(String),
}

/// Template loader with hot-swapping support
pub struct TemplateLoader {
    /// Template registry
    registry: Arc<RwLock<TemplateRegistry>>,
    /// Template directory
    template_dir: PathBuf,
    /// File watcher (for hot-swapping)
    watcher: Option<RecommendedWatcher>,
    /// Last reload times
    reload_times: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    /// Callbacks for template changes
    change_callbacks: Arc<RwLock<Vec<Box<dyn Fn(&str) + Send + Sync>>>>,
}

impl TemplateLoader {
    /// Create a new template loader
    pub fn new(template_dir: impl AsRef<Path>) -> Self {
        Self {
            registry: Arc::new(RwLock::new(TemplateRegistry::new())),
            template_dir: template_dir.as_ref().to_path_buf(),
            watcher: None,
            reload_times: Arc::new(RwLock::new(HashMap::new())),
            change_callbacks: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Get the template registry
    pub fn registry(&self) -> Arc<RwLock<TemplateRegistry>> {
        Arc::clone(&self.registry)
    }

    /// Load all templates from directory
    pub async fn load_all(&self) -> Result<usize> {
        let mut count = 0;

        // Load built-in templates first
        {
            let mut registry = self.registry.write();
            for template in super::builtin_templates() {
                if let Err(e) = registry.register(template) {
                    tracing::warn!("Failed to register built-in template: {}", e);
                }
                count += 1;
            }
        }

        // Load from directory
        if self.template_dir.exists() {
            count += self.load_from_directory(&self.template_dir).await?;
        }

        Ok(count)
    }

    /// Load templates from a directory
    async fn load_from_directory(&self, dir: &Path) -> Result<usize> {
        let mut count = 0;

        let mut entries = tokio::fs::read_dir(dir).await?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();

            if path.is_file() {
                let ext = path.extension().and_then(|e| e.to_str());

                if matches!(ext, Some("json") | Some("yaml") | Some("yml") | Some("toml")) {
                    if let Err(e) = self.load_template_file(&path).await {
                        tracing::warn!("Failed to load template {:?}: {}", path, e);
                    } else {
                        count += 1;
                    }
                }
            } else if path.is_dir() {
                // Recursively load subdirectories
                count += self.load_from_directory(&path).await?;
            }
        }

        Ok(count)
    }

    /// Load a single template file
    pub async fn load_template_file(&self, path: &Path) -> Result<BuildTemplate> {
        let content = tokio::fs::read_to_string(path).await?;
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("json");

        let template: BuildTemplate = match ext {
            "json" => serde_json::from_str(&content)
                .map_err(|e| crate::BuildNetError::Template(e.to_string()))?,
            "yaml" | "yml" => {
                // Would use serde_yaml here
                return Err(crate::BuildNetError::Template("YAML support not implemented".into()));
            }
            "toml" => {
                // Would use toml here
                return Err(crate::BuildNetError::Template("TOML support not implemented".into()));
            }
            _ => return Err(crate::BuildNetError::Template(format!("Unknown template format: {}", ext))),
        };

        // Register the template
        {
            let mut registry = self.registry.write();
            registry.register(template.clone())
                .map_err(|e| crate::BuildNetError::Template(e.to_string()))?;
        }

        // Update reload time
        {
            let mut times = self.reload_times.write();
            times.insert(template.id.clone(), Utc::now());
        }

        Ok(template)
    }

    /// Enable hot-swapping with file watching
    pub fn enable_hot_swap(&mut self) -> Result<()> {
        let registry = Arc::clone(&self.registry);
        let reload_times = Arc::clone(&self.reload_times);
        let callbacks = Arc::clone(&self.change_callbacks);
        let template_dir = self.template_dir.clone();

        let (tx, mut rx) = mpsc::channel(100);

        // Create watcher
        let watcher_tx = tx.clone();
        let mut watcher = notify::recommended_watcher(move |res: std::result::Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = watcher_tx.blocking_send(event);
            }
        }).map_err(|e| crate::BuildNetError::Watch(e))?;

        // Watch template directory
        watcher.watch(&self.template_dir, RecursiveMode::Recursive)
            .map_err(|e| crate::BuildNetError::Watch(e))?;

        self.watcher = Some(watcher);

        // Spawn handler task
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                    for path in event.paths {
                        if path.starts_with(&template_dir) {
                            let ext = path.extension().and_then(|e| e.to_str());
                            if matches!(ext, Some("json") | Some("yaml") | Some("yml") | Some("toml")) {
                                tracing::info!("Template changed: {:?}", path);

                                // Reload the template
                                if let Ok(content) = tokio::fs::read_to_string(&path).await {
                                    if let Ok(template) = serde_json::from_str::<BuildTemplate>(&content) {
                                        let id = template.id.clone();

                                        {
                                            let mut reg = registry.write();
                                            let _ = reg.register(template);
                                        }

                                        {
                                            let mut times = reload_times.write();
                                            times.insert(id.clone(), Utc::now());
                                        }

                                        // Notify callbacks
                                        {
                                            let cbs = callbacks.read();
                                            for cb in cbs.iter() {
                                                cb(&id);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        Ok(())
    }

    /// Register a callback for template changes
    pub fn on_change<F>(&self, callback: F)
    where
        F: Fn(&str) + Send + Sync + 'static,
    {
        let mut callbacks = self.change_callbacks.write();
        callbacks.push(Box::new(callback));
    }

    /// Get a template by ID
    pub fn get_template(&self, id: &str) -> Option<BuildTemplate> {
        let registry = self.registry.read();
        registry.get(id).cloned()
    }

    /// List all templates
    pub fn list_templates(&self) -> Vec<BuildTemplate> {
        let registry = self.registry.read();
        registry.list().into_iter().cloned().collect()
    }

    /// Find templates by tag
    pub fn find_by_tag(&self, tag: &str) -> Vec<BuildTemplate> {
        let registry = self.registry.read();
        registry.find_by_tag(tag).into_iter().cloned().collect()
    }

    /// Get last reload time for a template
    pub fn last_reload(&self, id: &str) -> Option<DateTime<Utc>> {
        let times = self.reload_times.read();
        times.get(id).copied()
    }

    /// Save a template to file
    pub async fn save_template(&self, template: &BuildTemplate) -> Result<PathBuf> {
        let filename = format!("{}.json", template.id);
        let path = self.template_dir.join(&filename);

        let content = serde_json::to_string_pretty(template)
            .map_err(|e| crate::BuildNetError::Template(e.to_string()))?;

        tokio::fs::write(&path, content).await?;

        // Register it
        {
            let mut registry = self.registry.write();
            registry.register(template.clone())
                .map_err(|e| crate::BuildNetError::Template(e.to_string()))?;
        }

        Ok(path)
    }

    /// Delete a template
    pub async fn delete_template(&self, id: &str) -> Result<bool> {
        // Remove from registry
        let removed = {
            let mut registry = self.registry.write();
            registry.remove(id).is_some()
        };

        if removed {
            // Try to delete file
            let path = self.template_dir.join(format!("{}.json", id));
            if path.exists() {
                tokio::fs::remove_file(&path).await?;
            }
        }

        Ok(removed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_load_builtin() {
        let loader = TemplateLoader::new("/tmp/buildnet-templates");
        let count = loader.load_all().await.unwrap();
        assert!(count >= 3); // At least the built-in templates

        let registry = loader.registry();
        let reg = registry.read();
        assert!(reg.get("node-typescript").is_some());
        assert!(reg.get("rust-release").is_some());
        assert!(reg.get("vite-react").is_some());
    }
}
