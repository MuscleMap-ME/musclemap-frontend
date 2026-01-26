//! Runtime Discovery
//!
//! Scans for installed runtime environments like Node.js, Bun, Rust, Python, etc.

use crate::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

/// Discovered runtime environment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Runtime {
    /// Runtime name (lowercase)
    pub name: String,
    /// Display name
    pub display_name: String,
    /// Version string
    pub version: String,
    /// Semantic version components if parseable
    pub semver: Option<SemVer>,
    /// Path to executable
    pub path: PathBuf,
    /// Associated package managers
    pub package_managers: Vec<PackageManager>,
    /// Is this runtime working correctly?
    pub healthy: bool,
}

/// Semantic version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemVer {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub prerelease: Option<String>,
}

impl SemVer {
    /// Parse a version string into semver
    pub fn parse(version: &str) -> Option<Self> {
        let version = version.trim_start_matches('v');
        let parts: Vec<&str> = version.split(|c| c == '.' || c == '-').collect();

        if parts.len() >= 3 {
            Some(Self {
                major: parts[0].parse().ok()?,
                minor: parts[1].parse().ok()?,
                patch: parts[2].parse().unwrap_or(0),
                prerelease: parts.get(3).map(|s| s.to_string()),
            })
        } else if parts.len() == 2 {
            Some(Self {
                major: parts[0].parse().ok()?,
                minor: parts[1].parse().ok()?,
                patch: 0,
                prerelease: None,
            })
        } else {
            None
        }
    }

    /// Check if this version satisfies a requirement
    pub fn satisfies(&self, requirement: &str) -> bool {
        // Simple version matching - supports >=X.Y, ^X.Y, ~X.Y
        let req = requirement.trim();

        if req.starts_with(">=") {
            if let Some(req_ver) = Self::parse(&req[2..]) {
                return self.major > req_ver.major
                    || (self.major == req_ver.major && self.minor >= req_ver.minor);
            }
        } else if req.starts_with('^') {
            if let Some(req_ver) = Self::parse(&req[1..]) {
                return self.major == req_ver.major && self.minor >= req_ver.minor;
            }
        } else if req.starts_with('~') {
            if let Some(req_ver) = Self::parse(&req[1..]) {
                return self.major == req_ver.major
                    && self.minor == req_ver.minor
                    && self.patch >= req_ver.patch;
            }
        } else if let Some(req_ver) = Self::parse(req) {
            return self.major == req_ver.major
                && self.minor == req_ver.minor
                && self.patch == req_ver.patch;
        }

        false
    }
}

/// Package manager information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageManager {
    /// Package manager name
    pub name: String,
    /// Version string
    pub version: String,
    /// Path to executable
    pub path: PathBuf,
}

/// Runtime requirement for build configurations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeRequirement {
    /// Runtime name
    pub name: String,
    /// Version requirement (e.g., ">=20", "^18.0", "~3.11")
    pub version: Option<String>,
}

impl RuntimeRequirement {
    /// Check if a runtime satisfies this requirement
    pub fn satisfied_by(&self, runtime: &Runtime) -> bool {
        if !runtime.name.eq_ignore_ascii_case(&self.name) {
            return false;
        }

        if let Some(req) = &self.version {
            if let Some(semver) = &runtime.semver {
                return semver.satisfies(req);
            }
            return false;
        }

        true
    }
}

/// Known runtime definitions
struct RuntimeDefinition {
    name: &'static str,
    display_name: &'static str,
    binaries: &'static [&'static str],
    version_arg: &'static str,
    version_parser: fn(&str) -> Option<String>,
    package_managers: &'static [PackageManagerDef],
}

struct PackageManagerDef {
    name: &'static str,
    binary: &'static str,
    version_arg: &'static str,
}

/// Runtime scanner
pub struct RuntimeScanner {
    definitions: Vec<RuntimeDefinition>,
}

impl RuntimeScanner {
    /// Create a new runtime scanner
    pub fn new() -> Self {
        Self {
            definitions: vec![
                RuntimeDefinition {
                    name: "node",
                    display_name: "Node.js",
                    binaries: &["node"],
                    version_arg: "--version",
                    version_parser: |s| Some(s.trim().trim_start_matches('v').to_string()),
                    package_managers: &[
                        PackageManagerDef {
                            name: "npm",
                            binary: "npm",
                            version_arg: "--version",
                        },
                        PackageManagerDef {
                            name: "pnpm",
                            binary: "pnpm",
                            version_arg: "--version",
                        },
                        PackageManagerDef {
                            name: "yarn",
                            binary: "yarn",
                            version_arg: "--version",
                        },
                    ],
                },
                RuntimeDefinition {
                    name: "bun",
                    display_name: "Bun",
                    binaries: &["bun"],
                    version_arg: "--version",
                    version_parser: |s| Some(s.trim().to_string()),
                    package_managers: &[],
                },
                RuntimeDefinition {
                    name: "deno",
                    display_name: "Deno",
                    binaries: &["deno"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.lines()
                            .find(|l| l.starts_with("deno"))
                            .and_then(|l| l.split_whitespace().nth(1))
                            .map(|v| v.to_string())
                    },
                    package_managers: &[],
                },
                RuntimeDefinition {
                    name: "rust",
                    display_name: "Rust",
                    binaries: &["rustc"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.split_whitespace()
                            .nth(1)
                            .map(|v| v.to_string())
                    },
                    package_managers: &[PackageManagerDef {
                        name: "cargo",
                        binary: "cargo",
                        version_arg: "--version",
                    }],
                },
                RuntimeDefinition {
                    name: "python",
                    display_name: "Python",
                    binaries: &["python3", "python"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.split_whitespace()
                            .nth(1)
                            .map(|v| v.to_string())
                    },
                    package_managers: &[
                        PackageManagerDef {
                            name: "pip",
                            binary: "pip3",
                            version_arg: "--version",
                        },
                        PackageManagerDef {
                            name: "uv",
                            binary: "uv",
                            version_arg: "--version",
                        },
                    ],
                },
                RuntimeDefinition {
                    name: "go",
                    display_name: "Go",
                    binaries: &["go"],
                    version_arg: "version",
                    version_parser: |s| {
                        s.split_whitespace()
                            .find(|p| p.starts_with("go"))
                            .map(|v| v.trim_start_matches("go").to_string())
                    },
                    package_managers: &[],
                },
                RuntimeDefinition {
                    name: "java",
                    display_name: "Java",
                    binaries: &["java"],
                    version_arg: "-version",
                    version_parser: |s| {
                        // Java outputs to stderr: 'openjdk version "21.0.1"' or similar
                        s.lines()
                            .find(|l| l.contains("version"))
                            .and_then(|l| {
                                l.split('"').nth(1).map(|v| v.to_string())
                            })
                    },
                    package_managers: &[
                        PackageManagerDef {
                            name: "maven",
                            binary: "mvn",
                            version_arg: "--version",
                        },
                        PackageManagerDef {
                            name: "gradle",
                            binary: "gradle",
                            version_arg: "--version",
                        },
                    ],
                },
                RuntimeDefinition {
                    name: "ruby",
                    display_name: "Ruby",
                    binaries: &["ruby"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.split_whitespace()
                            .nth(1)
                            .map(|v| v.to_string())
                    },
                    package_managers: &[
                        PackageManagerDef {
                            name: "gem",
                            binary: "gem",
                            version_arg: "--version",
                        },
                        PackageManagerDef {
                            name: "bundler",
                            binary: "bundle",
                            version_arg: "--version",
                        },
                    ],
                },
                RuntimeDefinition {
                    name: "php",
                    display_name: "PHP",
                    binaries: &["php"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.split_whitespace()
                            .nth(1)
                            .map(|v| v.to_string())
                    },
                    package_managers: &[PackageManagerDef {
                        name: "composer",
                        binary: "composer",
                        version_arg: "--version",
                    }],
                },
                RuntimeDefinition {
                    name: "dotnet",
                    display_name: ".NET",
                    binaries: &["dotnet"],
                    version_arg: "--version",
                    version_parser: |s| Some(s.trim().to_string()),
                    package_managers: &[],
                },
                RuntimeDefinition {
                    name: "elixir",
                    display_name: "Elixir",
                    binaries: &["elixir"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.lines()
                            .find(|l| l.starts_with("Elixir"))
                            .and_then(|l| l.split_whitespace().nth(1))
                            .map(|v| v.to_string())
                    },
                    package_managers: &[PackageManagerDef {
                        name: "mix",
                        binary: "mix",
                        version_arg: "--version",
                    }],
                },
                RuntimeDefinition {
                    name: "swift",
                    display_name: "Swift",
                    binaries: &["swift"],
                    version_arg: "--version",
                    version_parser: |s| {
                        s.split_whitespace()
                            .find(|p| p.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
                            .map(|v| v.to_string())
                    },
                    package_managers: &[],
                },
                RuntimeDefinition {
                    name: "zig",
                    display_name: "Zig",
                    binaries: &["zig"],
                    version_arg: "version",
                    version_parser: |s| Some(s.trim().to_string()),
                    package_managers: &[],
                },
            ],
        }
    }

    /// Scan for all known runtimes
    pub async fn scan_all(&self) -> Vec<Runtime> {
        let mut runtimes = Vec::new();

        for def in &self.definitions {
            if let Some(runtime) = self.scan_runtime(def).await {
                runtimes.push(runtime);
            }
        }

        runtimes
    }

    /// Scan for a specific runtime
    async fn scan_runtime(&self, def: &RuntimeDefinition) -> Option<Runtime> {
        // Try each binary name
        for binary in def.binaries {
            if let Some(path) = self.find_executable(binary).await {
                // Get version
                let version = self
                    .get_version(&path, def.version_arg, def.version_parser)
                    .await
                    .unwrap_or_else(|| "unknown".to_string());

                let semver = SemVer::parse(&version);

                // Scan for associated package managers
                let mut package_managers = Vec::new();
                for pm_def in def.package_managers {
                    if let Some(pm) = self.scan_package_manager(pm_def).await {
                        package_managers.push(pm);
                    }
                }

                // Health check
                let healthy = self.check_health(&path, def.version_arg).await;

                return Some(Runtime {
                    name: def.name.to_string(),
                    display_name: def.display_name.to_string(),
                    version,
                    semver,
                    path,
                    package_managers,
                    healthy,
                });
            }
        }

        None
    }

    /// Scan for a package manager
    async fn scan_package_manager(&self, def: &PackageManagerDef) -> Option<PackageManager> {
        let path = self.find_executable(def.binary).await?;
        let version = self
            .get_version(&path, def.version_arg, |s| {
                // Generic version extraction
                let s = s.trim();
                // Try to find version number
                let re = regex::Regex::new(r"\d+\.\d+(?:\.\d+)?").ok()?;
                re.find(s).map(|m| m.as_str().to_string())
            })
            .await
            .unwrap_or_else(|| "unknown".to_string());

        Some(PackageManager {
            name: def.name.to_string(),
            version,
            path,
        })
    }

    /// Find an executable in PATH
    async fn find_executable(&self, name: &str) -> Option<PathBuf> {
        #[cfg(unix)]
        {
            let output = Command::new("which")
                .arg(name)
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .output()
                .await
                .ok()?;

            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .trim()
                    .to_string();
                if !path.is_empty() {
                    return Some(PathBuf::from(path));
                }
            }
        }

        #[cfg(windows)]
        {
            let output = Command::new("where")
                .arg(name)
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .output()
                .await
                .ok()?;

            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()?
                    .trim()
                    .to_string();
                if !path.is_empty() {
                    return Some(PathBuf::from(path));
                }
            }
        }

        None
    }

    /// Get version string
    async fn get_version(
        &self,
        path: &PathBuf,
        version_arg: &str,
        parser: fn(&str) -> Option<String>,
    ) -> Option<String> {
        let output = Command::new(path)
            .arg(version_arg)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .ok()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        parser(&stdout).or_else(|| parser(&stderr))
    }

    /// Check if runtime is healthy
    async fn check_health(&self, path: &PathBuf, test_arg: &str) -> bool {
        Command::new(path)
            .arg(test_arg)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    }
}

impl Default for RuntimeScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_semver_parse() {
        let v = SemVer::parse("20.10.0").unwrap();
        assert_eq!(v.major, 20);
        assert_eq!(v.minor, 10);
        assert_eq!(v.patch, 0);

        let v = SemVer::parse("v18.17.1").unwrap();
        assert_eq!(v.major, 18);
        assert_eq!(v.minor, 17);
        assert_eq!(v.patch, 1);
    }

    #[test]
    fn test_semver_satisfies() {
        let v = SemVer::parse("20.10.0").unwrap();
        assert!(v.satisfies(">=20"));
        assert!(v.satisfies(">=18"));
        assert!(!v.satisfies(">=21"));
        assert!(v.satisfies("^20.0"));
        assert!(!v.satisfies("^19.0"));
    }

    #[tokio::test]
    async fn test_runtime_scanner() {
        let scanner = RuntimeScanner::new();
        let runtimes = scanner.scan_all().await;

        println!("Found {} runtimes", runtimes.len());
        for runtime in &runtimes {
            println!(
                "  {} v{} at {:?}",
                runtime.display_name, runtime.version, runtime.path
            );
            for pm in &runtime.package_managers {
                println!("    - {} v{}", pm.name, pm.version);
            }
        }
    }
}
