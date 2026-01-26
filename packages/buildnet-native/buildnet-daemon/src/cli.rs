//! CLI commands for BuildNet daemon

use std::path::Path;

use anyhow::Result;

use buildnet_core::Config;

/// Network-related CLI commands
pub mod network {
    use anyhow::Result;

    /// List connected nodes in the network
    pub async fn list_nodes(port: u16) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/network/nodes", port);

        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let nodes: serde_json::Value = response.json().await?;

                    println!("BuildNet Network Nodes");
                    println!("======================\n");

                    if let Some(local) = nodes.get("local") {
                        println!("Local Node:");
                        println!("  ID: {}", local["id"]);
                        println!("  Address: {}", local["address"]);
                        println!("  Role: {}", local["role"]);
                        println!("  Status: {}", local["status"]);
                    }

                    if let Some(peers) = nodes["peers"].as_array() {
                        println!("\nConnected Peers ({}):", peers.len());
                        for peer in peers {
                            let status_icon = match peer["status"].as_str() {
                                Some("online") => "●",
                                Some("offline") => "○",
                                Some("connecting") => "◐",
                                _ => "?",
                            };
                            println!(
                                "  {} {} - {} ({})",
                                status_icon,
                                peer["id"].as_str().unwrap_or("unknown").get(..8).unwrap_or("unknown"),
                                peer["address"],
                                peer["role"]
                            );
                        }
                        if peers.is_empty() {
                            println!("  (no connected peers)");
                        }
                    }
                } else {
                    println!("Failed to get nodes: {}", response.status());
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }

    /// Join the network by connecting to a bootstrap node
    pub async fn join_network(port: u16, bootstrap_addr: &str) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/network/join", port);

        let body = serde_json::json!({
            "bootstrap_addr": bootstrap_addr
        });

        match client.post(&url).json(&body).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let result: serde_json::Value = response.json().await?;
                    println!("✓ Joined network via {}", bootstrap_addr);
                    if let Some(peers) = result["connected_peers"].as_u64() {
                        println!("  Connected to {} peers", peers);
                    }
                    if let Some(coordinator) = result["coordinator"].as_str() {
                        println!("  Coordinator: {}", coordinator);
                    }
                } else {
                    let error: serde_json::Value = response.json().await.unwrap_or_default();
                    println!("✗ Failed to join network: {}", error["error"]);
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }

    /// Leave the network
    pub async fn leave_network(port: u16) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/network/leave", port);

        match client.post(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    println!("✓ Left the network");
                } else {
                    println!("✗ Failed to leave network");
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }

    /// Show detailed info about a specific node
    pub async fn node_info(port: u16, node_id: &str) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/network/nodes/{}", port, node_id);

        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let node: serde_json::Value = response.json().await?;

                    println!("Node Information");
                    println!("================\n");
                    println!("ID: {}", node["id"]);
                    println!("Address: {}", node["address"]);
                    println!("Status: {}", node["status"]);
                    println!("Role: {}", node["role"]);

                    if let Some(caps) = node.get("capabilities") {
                        println!("\nCapabilities:");
                        println!("  CPU cores: {}", caps["cpu_cores"]);
                        println!("  Memory: {} MB", caps["memory_mb"]);
                        println!("  Disk: {} MB", caps["disk_mb"]);
                        if let Some(tools) = caps["tools"].as_array() {
                            println!("  Tools: {}", tools.iter()
                                .filter_map(|t| t.as_str())
                                .collect::<Vec<_>>()
                                .join(", "));
                        }
                    }

                    if let Some(stats) = node.get("stats") {
                        println!("\nStatistics:");
                        println!("  Builds completed: {}", stats["builds_completed"]);
                        println!("  Tasks processed: {}", stats["tasks_processed"]);
                        println!("  Uptime: {} seconds", stats["uptime_secs"]);
                    }
                } else {
                    println!("Node not found: {}", node_id);
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }
}

/// Ledger-related CLI commands
pub mod ledger {
    use anyhow::Result;

    /// Show recent ledger entries
    pub async fn show_history(port: u16, limit: usize) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/ledger/history?limit={}", port, limit);

        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let history: serde_json::Value = response.json().await?;

                    println!("Ledger History (last {} entries)", limit);
                    println!("================================\n");

                    if let Some(entries) = history["entries"].as_array() {
                        for entry in entries {
                            let entry_type = entry["entry_type"].as_str().unwrap_or("unknown");
                            let timestamp = entry["timestamp"].as_str().unwrap_or("unknown");
                            let origin = entry["origin_node"].as_str()
                                .unwrap_or("unknown")
                                .get(..8)
                                .unwrap_or("unknown");

                            let icon = match entry_type {
                                "build_started" => "🏗️ ",
                                "build_completed" => "✓ ",
                                "task_assigned" => "→ ",
                                "task_completed" => "✓ ",
                                "node_joined" => "+ ",
                                "node_left" => "- ",
                                "coordinator_elected" => "👑",
                                _ => "  ",
                            };

                            println!(
                                "{} {} [{}] from {}",
                                icon,
                                entry_type,
                                &timestamp[11..19], // Extract time portion
                                origin
                            );

                            // Show relevant data based on entry type
                            if let Some(build_id) = entry["build_id"].as_str() {
                                println!("   Build: {}", build_id.get(..8).unwrap_or(build_id));
                            }
                        }

                        if entries.is_empty() {
                            println!("(no ledger entries)");
                        }
                    }

                    if let Some(root) = history["merkle_root"].as_str() {
                        println!("\nMerkle Root: {}...", root.get(..16).unwrap_or(root));
                    }
                } else {
                    println!("Failed to get ledger history");
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }

    /// Show sync status with peers
    pub async fn sync_status(port: u16) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/ledger/sync", port);

        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let sync: serde_json::Value = response.json().await?;

                    println!("Ledger Sync Status");
                    println!("==================\n");

                    println!("Local State:");
                    println!("  Entries: {}", sync["local"]["entry_count"]);
                    println!("  Merkle root: {}...",
                        sync["local"]["merkle_root"].as_str()
                            .unwrap_or("none")
                            .get(..16)
                            .unwrap_or("none"));

                    if let Some(peers) = sync["peers"].as_array() {
                        println!("\nPeer Sync Status ({}):", peers.len());
                        for peer in peers {
                            let status_icon = match peer["status"].as_str() {
                                Some("in_sync") => "✓",
                                Some("syncing") => "↻",
                                Some("behind") => "↓",
                                Some("ahead") => "↑",
                                Some("failed") => "✗",
                                _ => "?",
                            };
                            println!(
                                "  {} {} - {} (entries behind: {})",
                                status_icon,
                                peer["peer_id"].as_str().unwrap_or("unknown").get(..8).unwrap_or("unknown"),
                                peer["status"],
                                peer["entries_behind"]
                            );
                        }
                        if peers.is_empty() {
                            println!("  (no peers connected)");
                        }
                    }
                } else {
                    println!("Failed to get sync status");
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }

    /// Force sync with a specific peer or all peers
    pub async fn force_sync(port: u16, peer_id: Option<&str>) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/ledger/sync", port);

        let body = if let Some(peer) = peer_id {
            serde_json::json!({ "peer_id": peer })
        } else {
            serde_json::json!({ "all": true })
        };

        match client.post(&url).json(&body).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let result: serde_json::Value = response.json().await?;
                    println!("✓ Sync initiated");
                    if let Some(synced) = result["synced_entries"].as_u64() {
                        println!("  Synced {} entries", synced);
                    }
                } else {
                    println!("✗ Sync failed");
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }

    /// Show builds for this node from ledger
    pub async fn show_builds(port: u16, limit: usize) -> Result<()> {
        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{}/ledger/builds?limit={}", port, limit);

        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let builds: serde_json::Value = response.json().await?;

                    println!("Build History (last {})", limit);
                    println!("===========================\n");

                    if let Some(entries) = builds["builds"].as_array() {
                        for build in entries {
                            let success = build["success"].as_bool().unwrap_or(false);
                            let icon = if success { "✓" } else { "✗" };

                            println!(
                                "{} {} - {} packages, {}ms",
                                icon,
                                build["build_id"].as_str().unwrap_or("unknown").get(..8).unwrap_or("unknown"),
                                build["packages"].as_array().map(|a| a.len()).unwrap_or(0),
                                build["duration_ms"]
                            );

                            if let Some(started) = build["started_at"].as_str() {
                                println!("  Started: {}", &started[..19]);
                            }
                        }

                        if entries.is_empty() {
                            println!("(no builds recorded)");
                        }
                    }
                } else {
                    println!("Failed to get build history");
                }
            }
            Err(_) => {
                println!("Failed to connect to daemon. Is it running?");
            }
        }

        Ok(())
    }
}

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
