//! CLI commands for BuildNet daemon

use std::path::Path;

use anyhow::Result;

use buildnet_core::Config;

/// Initialize a new configuration file
pub fn init_config(project_root: &Path, project_type: &str) -> Result<()> {
    let config = match project_type {
        "pnpm" => Config::for_pnpm_monorepo(project_root.to_path_buf()),
        _ => {
            tracing::warn!("Unknown project type '{}', using pnpm defaults", project_type);
            Config::for_pnpm_monorepo(project_root.to_path_buf())
        }
    };

    let config_path = project_root.join(".buildnet/config.json");

    // Create directory if needed
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    config.save(&config_path)?;

    tracing::info!("Created configuration at {:?}", config_path);
    println!("✓ Created .buildnet/config.json");
    println!("  Packages configured:");
    for pkg in &config.packages {
        println!("    - {} ({})", pkg.name, pkg.path.display());
    }

    Ok(())
}

/// Show daemon status
pub async fn show_status(port: u16) -> Result<()> {
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/status", port);

    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                let status: serde_json::Value = response.json().await?;
                println!("BuildNet Daemon Status");
                println!("======================");
                println!("Status: {}", status["status"]);
                println!("Version: {}", status["version"]);
                println!("Project: {}", status["project_root"]);
                println!("\nPackages:");
                if let Some(packages) = status["packages"].as_array() {
                    for pkg in packages {
                        println!("  - {}", pkg);
                    }
                }
                println!("\nState Statistics:");
                println!("  Total builds: {}", status["state_stats"]["total_builds"]);
                println!("  Cached builds: {}", status["state_stats"]["cached_builds"]);
                println!("  Failed builds: {}", status["state_stats"]["failed_builds"]);
                println!("  Cached files: {}", status["state_stats"]["cached_files"]);
                println!("  Artifacts: {}", status["state_stats"]["artifacts"]);
            } else {
                println!("Daemon returned error: {}", response.status());
            }
        }
        Err(_) => {
            println!("BuildNet daemon is not running on port {}", port);
            println!("Start it with: buildnetd start");
        }
    }

    Ok(())
}

/// Stop the daemon
pub async fn stop_daemon(port: u16) -> Result<()> {
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:{}/shutdown", port);

    match client.post(&url).send().await {
        Ok(_) => {
            println!("✓ Shutdown signal sent to daemon");
        }
        Err(_) => {
            println!("Daemon is not running or already stopped");
        }
    }

    Ok(())
}

/// Trigger a build
pub async fn trigger_build(port: u16, package: Option<&str>, force: bool) -> Result<()> {
    let client = reqwest::Client::new();

    let url = if let Some(pkg) = package {
        format!("http://127.0.0.1:{}/build/{}", port, pkg)
    } else {
        format!("http://127.0.0.1:{}/build", port)
    };

    let body = serde_json::json!({ "force": force });

    match client.post(&url).json(&body).send().await {
        Ok(response) => {
            if response.status().is_success() {
                let result: serde_json::Value = response.json().await?;

                if let Some(results) = result["results"].as_array() {
                    println!("Build Results:");
                    println!("==============");
                    for r in results {
                        let status_icon = match r["status"].as_str() {
                            Some("completed") => "✓",
                            Some("cached") => "⚡",
                            Some("failed") => "✗",
                            _ => "?",
                        };
                        println!(
                            "  {} {} - {} ({}ms)",
                            status_icon,
                            r["package"],
                            r["tier"],
                            r["duration_ms"]
                        );
                        if let Some(error) = r["error"].as_str() {
                            println!("    Error: {}", error);
                        }
                    }
                    println!("\nTotal time: {}ms", result["total_duration_ms"]);
                } else {
                    // Single package result
                    let status_icon = match result["status"].as_str() {
                        Some("completed") => "✓",
                        Some("cached") => "⚡",
                        Some("failed") => "✗",
                        _ => "?",
                    };
                    println!(
                        "{} {} - {} ({}ms)",
                        status_icon,
                        result["package"],
                        result["tier"],
                        result["duration_ms"]
                    );
                    if let Some(error) = result["error"].as_str() {
                        println!("Error: {}", error);
                    }
                }
            } else {
                let error: serde_json::Value = response.json().await?;
                println!("Build failed: {}", error["error"]);
            }
        }
        Err(_) => {
            println!("Failed to connect to daemon. Is it running?");
            println!("Start with: buildnetd start");
        }
    }

    Ok(())
}

/// Show statistics
pub async fn show_stats(port: u16) -> Result<()> {
    let client = reqwest::Client::new();

    // Get state stats
    let state_url = format!("http://127.0.0.1:{}/stats", port);
    let cache_url = format!("http://127.0.0.1:{}/cache/stats", port);

    println!("BuildNet Statistics");
    println!("===================\n");

    if let Ok(response) = client.get(&state_url).send().await {
        if let Ok(stats) = response.json::<serde_json::Value>().await {
            println!("State Statistics:");
            println!("  Total builds: {}", stats["total_builds"]);
            println!("  Cached builds: {}", stats["cached_builds"]);
            println!("  Failed builds: {}", stats["failed_builds"]);
            println!("  Cached files: {}", stats["cached_files"]);
            println!("  Artifacts: {}", stats["artifacts"]);
        }
    }

    println!();

    if let Ok(response) = client.get(&cache_url).send().await {
        if let Ok(stats) = response.json::<serde_json::Value>().await {
            println!("Cache Statistics:");
            println!("  Cache directory: {}", stats["cache_dir"]);
            println!("  Total size: {} bytes", stats["total_size"]);
            println!("  Artifact count: {}", stats["artifact_count"]);
        }
    }

    Ok(())
}

/// Clear cache
pub fn clear_cache(project_root: &Path, all: bool) -> Result<()> {
    let cache_path = project_root.join(".buildnet/cache");
    let db_path = project_root.join(".buildnet/state.db");

    if cache_path.exists() {
        std::fs::remove_dir_all(&cache_path)?;
        println!("✓ Cleared artifact cache");
    }

    if all && db_path.exists() {
        std::fs::remove_file(&db_path)?;
        println!("✓ Cleared state database");
    }

    println!("Cache cleared successfully");

    Ok(())
}
