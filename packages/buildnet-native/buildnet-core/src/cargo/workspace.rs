//! Cargo workspace parsing and management

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};

/// Cargo workspace information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CargoWorkspace {
    /// Workspace root directory
    pub root: PathBuf,
    /// Workspace members (crate paths)
    pub members: Vec<PathBuf>,
    /// Parsed crate information
    pub crates: Vec<CrateInfo>,
    /// Default members (if specified)
    pub default_members: Option<Vec<String>>,
    /// Workspace-level dependencies
    pub workspace_dependencies: HashMap<String, String>,
}

impl CargoWorkspace {
    /// Parse a Cargo workspace from the given directory
    pub fn parse(root: &Path) -> Result<Self> {
        let manifest_path = root.join("Cargo.toml");
        if !manifest_path.exists() {
            return Err(BuildNetError::InvalidConfig(format!(
                "No Cargo.toml found at {:?}",
                manifest_path
            )));
        }

        let content = std::fs::read_to_string(&manifest_path)?;
        let manifest: CargoManifest = toml::from_str(&content)
            .map_err(|e| BuildNetError::InvalidConfig(format!("Failed to parse Cargo.toml: {}", e)))?;

        let mut workspace = CargoWorkspace {
            root: root.to_path_buf(),
            members: Vec::new(),
            crates: Vec::new(),
            default_members: None,
            workspace_dependencies: HashMap::new(),
        };

        // Handle workspace manifest
        if let Some(ws) = manifest.workspace {
            // Parse member patterns
            for pattern in ws.members.unwrap_or_default() {
                let members = Self::expand_glob(root, &pattern)?;
                workspace.members.extend(members);
            }

            workspace.default_members = ws.default_members;

            // Parse workspace dependencies
            if let Some(deps) = ws.dependencies {
                for (name, dep) in deps {
                    let version = match dep {
                        TomlDependency::Simple(v) => v,
                        TomlDependency::Detailed(d) => d.version.unwrap_or_default(),
                    };
                    workspace.workspace_dependencies.insert(name, version);
                }
            }
        } else {
            // Single crate, not a workspace
            workspace.members.push(root.to_path_buf());
        }

        // Parse each member crate
        for member_path in &workspace.members {
            if let Ok(crate_info) = CrateInfo::parse(member_path) {
                workspace.crates.push(crate_info);
            }
        }

        Ok(workspace)
    }

    /// Expand glob patterns in workspace members
    fn expand_glob(root: &Path, pattern: &str) -> Result<Vec<PathBuf>> {
        let full_pattern = root.join(pattern).to_string_lossy().to_string();

        let mut paths = Vec::new();
        for entry in glob::glob(&full_pattern)
            .map_err(|e| BuildNetError::InvalidConfig(format!("Invalid glob pattern: {}", e)))?
        {
            match entry {
                Ok(path) => {
                    if path.join("Cargo.toml").exists() {
                        paths.push(path);
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to expand glob entry: {}", e);
                }
            }
        }

        Ok(paths)
    }

    /// Get crate by name
    pub fn get_crate(&self, name: &str) -> Option<&CrateInfo> {
        self.crates.iter().find(|c| c.name == name)
    }

    /// Get dependency order for building
    pub fn build_order(&self) -> Result<Vec<&CrateInfo>> {
        let mut order = Vec::new();
        let mut visited = std::collections::HashSet::new();
        let mut temp = std::collections::HashSet::new();

        let crate_map: HashMap<&str, &CrateInfo> =
            self.crates.iter().map(|c| (c.name.as_str(), c)).collect();

        fn visit<'a>(
            name: &'a str,
            crate_map: &HashMap<&'a str, &'a CrateInfo>,
            visited: &mut std::collections::HashSet<&'a str>,
            temp: &mut std::collections::HashSet<&'a str>,
            order: &mut Vec<&'a CrateInfo>,
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

            if let Some(crate_info) = crate_map.get(name) {
                for dep in &crate_info.dependencies {
                    // Only visit workspace dependencies
                    if crate_map.contains_key(dep.as_str()) {
                        visit(dep.as_str(), crate_map, visited, temp, order)?;
                    }
                }
                temp.remove(name);
                visited.insert(name);
                order.push(crate_info);
            }

            Ok(())
        }

        for crate_info in &self.crates {
            visit(&crate_info.name, &crate_map, &mut visited, &mut temp, &mut order)?;
        }

        Ok(order)
    }
}

/// Information about a single crate
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrateInfo {
    /// Crate name
    pub name: String,
    /// Crate version
    pub version: String,
    /// Crate path
    pub path: PathBuf,
    /// Crate type (bin, lib, etc.)
    pub crate_type: CrateType,
    /// Dependencies (names only)
    pub dependencies: Vec<String>,
    /// Dev dependencies (names only)
    pub dev_dependencies: Vec<String>,
    /// Build dependencies (names only)
    pub build_dependencies: Vec<String>,
    /// Features
    pub features: HashMap<String, Vec<String>>,
    /// Default features
    pub default_features: Vec<String>,
    /// Edition (2018, 2021, etc.)
    pub edition: String,
    /// Binary targets
    pub bins: Vec<String>,
    /// Library target
    pub lib: Option<String>,
}

impl CrateInfo {
    /// Parse crate info from a directory
    pub fn parse(path: &Path) -> Result<Self> {
        let manifest_path = path.join("Cargo.toml");
        let content = std::fs::read_to_string(&manifest_path)?;
        let manifest: CargoManifest = toml::from_str(&content)
            .map_err(|e| BuildNetError::InvalidConfig(format!("Failed to parse Cargo.toml: {}", e)))?;

        let package = manifest.package.ok_or_else(|| {
            BuildNetError::InvalidConfig("Missing [package] section in Cargo.toml".into())
        })?;

        let mut crate_info = CrateInfo {
            name: package.name,
            version: package.version.unwrap_or_else(|| "0.0.0".into()),
            path: path.to_path_buf(),
            crate_type: CrateType::Library,
            dependencies: Vec::new(),
            dev_dependencies: Vec::new(),
            build_dependencies: Vec::new(),
            features: HashMap::new(),
            default_features: Vec::new(),
            edition: package.edition.unwrap_or_else(|| "2021".into()),
            bins: Vec::new(),
            lib: None,
        };

        // Determine crate type
        if path.join("src/main.rs").exists() {
            crate_info.crate_type = CrateType::Binary;
            crate_info.bins.push(crate_info.name.clone());
        }
        if path.join("src/lib.rs").exists() {
            if crate_info.crate_type == CrateType::Binary {
                crate_info.crate_type = CrateType::Both;
            } else {
                crate_info.crate_type = CrateType::Library;
            }
            crate_info.lib = Some(crate_info.name.clone());
        }

        // Parse dependencies
        if let Some(deps) = manifest.dependencies {
            for (name, _) in deps {
                crate_info.dependencies.push(name);
            }
        }

        if let Some(dev_deps) = manifest.dev_dependencies {
            for (name, _) in dev_deps {
                crate_info.dev_dependencies.push(name);
            }
        }

        if let Some(build_deps) = manifest.build_dependencies {
            for (name, _) in build_deps {
                crate_info.build_dependencies.push(name);
            }
        }

        // Parse features
        if let Some(features) = manifest.features {
            for (name, deps) in features {
                if name == "default" {
                    crate_info.default_features = deps;
                } else {
                    crate_info.features.insert(name, deps);
                }
            }
        }

        // Parse bin targets
        if let Some(bins) = manifest.bin {
            for bin in bins {
                if let Some(name) = bin.name {
                    crate_info.bins.push(name);
                }
            }
        }

        Ok(crate_info)
    }
}

/// Type of crate
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CrateType {
    /// Library crate
    Library,
    /// Binary crate
    Binary,
    /// Both library and binary
    Both,
    /// Procedural macro
    ProcMacro,
}

// Internal structures for TOML parsing

#[derive(Debug, Deserialize)]
struct CargoManifest {
    package: Option<PackageSection>,
    workspace: Option<WorkspaceSection>,
    dependencies: Option<HashMap<String, TomlDependency>>,
    #[serde(rename = "dev-dependencies")]
    dev_dependencies: Option<HashMap<String, TomlDependency>>,
    #[serde(rename = "build-dependencies")]
    build_dependencies: Option<HashMap<String, TomlDependency>>,
    features: Option<HashMap<String, Vec<String>>>,
    bin: Option<Vec<BinTarget>>,
}

#[derive(Debug, Deserialize)]
struct PackageSection {
    name: String,
    version: Option<String>,
    edition: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WorkspaceSection {
    members: Option<Vec<String>>,
    #[serde(rename = "default-members")]
    default_members: Option<Vec<String>>,
    dependencies: Option<HashMap<String, TomlDependency>>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum TomlDependency {
    Simple(String),
    Detailed(DetailedDependency),
}

#[derive(Debug, Deserialize)]
struct DetailedDependency {
    version: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BinTarget {
    name: Option<String>,
}
