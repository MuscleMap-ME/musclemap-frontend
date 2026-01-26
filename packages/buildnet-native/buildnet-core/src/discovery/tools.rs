//! Tool Discovery
//!
//! Scans for installed tools like ImageMagick, FFmpeg, Docker, etc.

use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

/// Discovered tool information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    /// Tool name (lowercase)
    pub name: String,
    /// Display name
    pub display_name: String,
    /// Version string
    pub version: String,
    /// Path to executable
    pub path: PathBuf,
    /// Tool capabilities
    pub capabilities: Vec<ToolCapability>,
    /// Is this tool working correctly?
    pub healthy: bool,
}

/// Tool capability descriptor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCapability {
    /// Capability name
    pub name: String,
    /// Description
    pub description: String,
    /// Category (e.g., "format", "codec", "feature")
    pub category: String,
}

/// Known tools and how to detect them
struct ToolDefinition {
    name: &'static str,
    display_name: &'static str,
    binaries: &'static [&'static str],
    version_arg: &'static str,
    version_parser: fn(&str) -> Option<String>,
    capability_detector: fn(&PathBuf) -> Vec<ToolCapability>,
}

/// Tool scanner for discovering installed tools
pub struct ToolScanner {
    definitions: Vec<ToolDefinition>,
}

impl ToolScanner {
    /// Create a new tool scanner
    pub fn new() -> Self {
        Self {
            definitions: vec![
                ToolDefinition {
                    name: "imagemagick",
                    display_name: "ImageMagick",
                    binaries: &["magick", "convert"],
                    version_arg: "--version",
                    version_parser: parse_imagemagick_version,
                    capability_detector: detect_imagemagick_capabilities,
                },
                ToolDefinition {
                    name: "ffmpeg",
                    display_name: "FFmpeg",
                    binaries: &["ffmpeg"],
                    version_arg: "-version",
                    version_parser: parse_ffmpeg_version,
                    capability_detector: detect_ffmpeg_capabilities,
                },
                ToolDefinition {
                    name: "docker",
                    display_name: "Docker",
                    binaries: &["docker"],
                    version_arg: "--version",
                    version_parser: parse_docker_version,
                    capability_detector: detect_docker_capabilities,
                },
                ToolDefinition {
                    name: "git",
                    display_name: "Git",
                    binaries: &["git"],
                    version_arg: "--version",
                    version_parser: parse_git_version,
                    capability_detector: detect_git_capabilities,
                },
                ToolDefinition {
                    name: "rsync",
                    display_name: "rsync",
                    binaries: &["rsync"],
                    version_arg: "--version",
                    version_parser: parse_rsync_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "tar",
                    display_name: "tar",
                    binaries: &["tar", "gtar"],
                    version_arg: "--version",
                    version_parser: parse_tar_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "gzip",
                    display_name: "gzip",
                    binaries: &["gzip"],
                    version_arg: "--version",
                    version_parser: parse_generic_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "brotli",
                    display_name: "Brotli",
                    binaries: &["brotli"],
                    version_arg: "--version",
                    version_parser: parse_generic_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "zstd",
                    display_name: "Zstandard",
                    binaries: &["zstd"],
                    version_arg: "--version",
                    version_parser: parse_generic_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "jq",
                    display_name: "jq",
                    binaries: &["jq"],
                    version_arg: "--version",
                    version_parser: parse_jq_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "curl",
                    display_name: "cURL",
                    binaries: &["curl"],
                    version_arg: "--version",
                    version_parser: parse_curl_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "wget",
                    display_name: "wget",
                    binaries: &["wget"],
                    version_arg: "--version",
                    version_parser: parse_wget_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "cmake",
                    display_name: "CMake",
                    binaries: &["cmake"],
                    version_arg: "--version",
                    version_parser: parse_cmake_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "make",
                    display_name: "Make",
                    binaries: &["make", "gmake"],
                    version_arg: "--version",
                    version_parser: parse_make_version,
                    capability_detector: |_| vec![],
                },
                ToolDefinition {
                    name: "ninja",
                    display_name: "Ninja",
                    binaries: &["ninja"],
                    version_arg: "--version",
                    version_parser: |s| Some(s.trim().to_string()),
                    capability_detector: |_| vec![],
                },
            ],
        }
    }

    /// Scan for all known tools
    pub async fn scan_all(&self) -> Vec<Tool> {
        let mut tools = Vec::new();

        for def in &self.definitions {
            if let Some(tool) = self.scan_tool(def).await {
                tools.push(tool);
            }
        }

        tools
    }

    /// Scan for a specific tool
    async fn scan_tool(&self, def: &ToolDefinition) -> Option<Tool> {
        // Try each binary name
        for binary in def.binaries {
            if let Some(path) = self.find_executable(binary).await {
                // Get version
                let version = self
                    .get_version(&path, def.version_arg, def.version_parser)
                    .await
                    .unwrap_or_else(|| "unknown".to_string());

                // Get capabilities
                let capabilities = (def.capability_detector)(&path);

                // Health check
                let healthy = self.check_health(&path, def.version_arg).await;

                return Some(Tool {
                    name: def.name.to_string(),
                    display_name: def.display_name.to_string(),
                    version,
                    path,
                    capabilities,
                    healthy,
                });
            }
        }

        None
    }

    /// Find an executable in PATH
    async fn find_executable(&self, name: &str) -> Option<PathBuf> {
        // Use `which` command on Unix
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

        // Use `where` command on Windows
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

    /// Get version string from a tool
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

        // Try stdout first, then stderr (some tools output version to stderr)
        parser(&stdout).or_else(|| parser(&stderr))
    }

    /// Check if a tool is healthy (can execute)
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

impl Default for ToolScanner {
    fn default() -> Self {
        Self::new()
    }
}

// Version parsers

fn parse_imagemagick_version(output: &str) -> Option<String> {
    // "Version: ImageMagick 7.1.1-20 Q16-HDRI..."
    output
        .lines()
        .find(|l| l.contains("ImageMagick"))
        .and_then(|l| {
            l.split_whitespace()
                .find(|s| s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
                .map(|s| s.to_string())
        })
}

fn parse_ffmpeg_version(output: &str) -> Option<String> {
    // "ffmpeg version 6.1 Copyright..."
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .nth(2)
            .map(|s| s.to_string())
    })
}

fn parse_docker_version(output: &str) -> Option<String> {
    // "Docker version 24.0.6, build ed223bc"
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .nth(2)
            .map(|s| s.trim_end_matches(',').to_string())
    })
}

fn parse_git_version(output: &str) -> Option<String> {
    // "git version 2.42.0"
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .nth(2)
            .map(|s| s.to_string())
    })
}

fn parse_rsync_version(output: &str) -> Option<String> {
    // "rsync  version 3.2.7  protocol version 31"
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .find(|s| s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
            .map(|s| s.to_string())
    })
}

fn parse_tar_version(output: &str) -> Option<String> {
    // "tar (GNU tar) 1.35"
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .last()
            .map(|s| s.to_string())
    })
}

fn parse_generic_version(output: &str) -> Option<String> {
    // Try to find version number pattern
    let version_regex = regex::Regex::new(r"\d+\.\d+(?:\.\d+)?").ok()?;
    version_regex
        .find(output)
        .map(|m| m.as_str().to_string())
}

fn parse_jq_version(output: &str) -> Option<String> {
    // "jq-1.7"
    output.trim().strip_prefix("jq-").map(|s| s.to_string())
}

fn parse_curl_version(output: &str) -> Option<String> {
    // "curl 8.4.0 (x86_64-apple-darwin23.0)..."
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .nth(1)
            .map(|s| s.to_string())
    })
}

fn parse_wget_version(output: &str) -> Option<String> {
    // "GNU Wget 1.21.4..."
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .find(|s| s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
            .map(|s| s.to_string())
    })
}

fn parse_cmake_version(output: &str) -> Option<String> {
    // "cmake version 3.27.7"
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .last()
            .map(|s| s.to_string())
    })
}

fn parse_make_version(output: &str) -> Option<String> {
    // "GNU Make 4.4.1"
    output.lines().next().and_then(|l| {
        l.split_whitespace()
            .last()
            .map(|s| s.to_string())
    })
}

// Capability detectors

fn detect_imagemagick_capabilities(path: &PathBuf) -> Vec<ToolCapability> {
    let mut caps = vec![
        ToolCapability {
            name: "resize".to_string(),
            description: "Image resizing and scaling".to_string(),
            category: "transform".to_string(),
        },
        ToolCapability {
            name: "convert".to_string(),
            description: "Format conversion".to_string(),
            category: "format".to_string(),
        },
    ];

    // Could run `magick -list format` to get supported formats
    // For now, include common ones
    for format in ["png", "jpg", "webp", "gif", "svg", "pdf", "heic", "avif"] {
        caps.push(ToolCapability {
            name: format.to_string(),
            description: format!("{} format support", format.to_uppercase()),
            category: "format".to_string(),
        });
    }

    caps
}

fn detect_ffmpeg_capabilities(path: &PathBuf) -> Vec<ToolCapability> {
    let mut caps = vec![
        ToolCapability {
            name: "transcode".to_string(),
            description: "Video/audio transcoding".to_string(),
            category: "codec".to_string(),
        },
    ];

    // Common codecs - could detect with `ffmpeg -codecs`
    for codec in ["h264", "h265", "vp9", "av1", "aac", "opus", "mp3"] {
        caps.push(ToolCapability {
            name: codec.to_string(),
            description: format!("{} codec support", codec.to_uppercase()),
            category: "codec".to_string(),
        });
    }

    for format in ["mp4", "webm", "mkv", "mov", "avi", "flac", "wav"] {
        caps.push(ToolCapability {
            name: format.to_string(),
            description: format!("{} container support", format.to_uppercase()),
            category: "format".to_string(),
        });
    }

    caps
}

fn detect_docker_capabilities(path: &PathBuf) -> Vec<ToolCapability> {
    vec![
        ToolCapability {
            name: "container".to_string(),
            description: "Container execution".to_string(),
            category: "feature".to_string(),
        },
        ToolCapability {
            name: "build".to_string(),
            description: "Image building".to_string(),
            category: "feature".to_string(),
        },
        ToolCapability {
            name: "compose".to_string(),
            description: "Multi-container orchestration".to_string(),
            category: "feature".to_string(),
        },
    ]
}

fn detect_git_capabilities(path: &PathBuf) -> Vec<ToolCapability> {
    vec![
        ToolCapability {
            name: "clone".to_string(),
            description: "Repository cloning".to_string(),
            category: "feature".to_string(),
        },
        ToolCapability {
            name: "lfs".to_string(),
            description: "Large file storage".to_string(),
            category: "feature".to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tool_scanner() {
        let scanner = ToolScanner::new();
        let tools = scanner.scan_all().await;

        // Should find at least git on most systems
        println!("Found {} tools", tools.len());
        for tool in &tools {
            println!("  {} v{} at {:?}", tool.display_name, tool.version, tool.path);
        }
    }
}
