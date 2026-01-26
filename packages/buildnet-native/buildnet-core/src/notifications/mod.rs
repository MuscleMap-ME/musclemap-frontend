//! Notification system for BuildNet
//!
//! Multi-channel notification support including SMS, Email, Slack, Discord,
//! Telegram, Push notifications, and Webhooks.

pub mod channels;
pub mod commands;
pub mod reports;

use std::collections::HashMap;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};

use crate::BuildNetError;

/// Event priority levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for Priority {
    fn default() -> Self {
        Priority::Medium
    }
}

/// Build event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum BuildNetEvent {
    /// Build process initiated
    BuildStarted {
        package: Option<String>,
        timestamp: DateTime<Utc>,
    },
    /// Build finished successfully
    BuildCompleted {
        package: Option<String>,
        duration_ms: u64,
        tier: String,
        timestamp: DateTime<Utc>,
    },
    /// Build encountered errors
    BuildFailed {
        package: Option<String>,
        error: String,
        timestamp: DateTime<Utc>,
    },
    /// Build skipped (cache hit)
    BuildCached {
        package: String,
        timestamp: DateTime<Utc>,
    },
    /// CPU usage exceeds threshold
    ResourceCpuHigh {
        usage_percent: f64,
        threshold: f64,
        timestamp: DateTime<Utc>,
    },
    /// Memory usage exceeds threshold
    ResourceMemoryHigh {
        usage_percent: f64,
        threshold: f64,
        timestamp: DateTime<Utc>,
    },
    /// Disk space below threshold
    ResourceDiskLow {
        path: String,
        available_percent: f64,
        threshold: f64,
        timestamp: DateTime<Utc>,
    },
    /// BuildNet daemon started
    DaemonStarted {
        version: String,
        timestamp: DateTime<Utc>,
    },
    /// BuildNet daemon stopped
    DaemonStopped {
        reason: String,
        timestamp: DateTime<Utc>,
    },
    /// Worker node joined cluster
    NodeJoined {
        node_id: String,
        address: String,
        timestamp: DateTime<Utc>,
    },
    /// Worker node health check failed
    NodeFailed {
        node_id: String,
        reason: String,
        timestamp: DateTime<Utc>,
    },
    /// Plugin loaded successfully
    PluginLoaded {
        name: String,
        version: String,
        timestamp: DateTime<Utc>,
    },
    /// Custom event
    Custom {
        name: String,
        data: serde_json::Value,
        timestamp: DateTime<Utc>,
    },
}

impl BuildNetEvent {
    /// Get the event type name
    pub fn event_type(&self) -> &'static str {
        match self {
            BuildNetEvent::BuildStarted { .. } => "build.started",
            BuildNetEvent::BuildCompleted { .. } => "build.completed",
            BuildNetEvent::BuildFailed { .. } => "build.failed",
            BuildNetEvent::BuildCached { .. } => "build.cached",
            BuildNetEvent::ResourceCpuHigh { .. } => "resource.cpu.high",
            BuildNetEvent::ResourceMemoryHigh { .. } => "resource.memory.high",
            BuildNetEvent::ResourceDiskLow { .. } => "resource.disk.low",
            BuildNetEvent::DaemonStarted { .. } => "daemon.started",
            BuildNetEvent::DaemonStopped { .. } => "daemon.stopped",
            BuildNetEvent::NodeJoined { .. } => "node.joined",
            BuildNetEvent::NodeFailed { .. } => "node.failed",
            BuildNetEvent::PluginLoaded { .. } => "plugin.loaded",
            BuildNetEvent::Custom { name, .. } => {
                // Note: This leaks memory but is acceptable for long-running daemons
                Box::leak(format!("custom.{}", name).into_boxed_str())
            }
        }
    }

    /// Get the default priority for this event type
    pub fn default_priority(&self) -> Priority {
        match self {
            BuildNetEvent::BuildStarted { .. } => Priority::Low,
            BuildNetEvent::BuildCompleted { .. } => Priority::Medium,
            BuildNetEvent::BuildFailed { .. } => Priority::High,
            BuildNetEvent::BuildCached { .. } => Priority::Low,
            BuildNetEvent::ResourceCpuHigh { .. } => Priority::High,
            BuildNetEvent::ResourceMemoryHigh { .. } => Priority::High,
            BuildNetEvent::ResourceDiskLow { .. } => Priority::Critical,
            BuildNetEvent::DaemonStarted { .. } => Priority::Medium,
            BuildNetEvent::DaemonStopped { .. } => Priority::High,
            BuildNetEvent::NodeJoined { .. } => Priority::Medium,
            BuildNetEvent::NodeFailed { .. } => Priority::Critical,
            BuildNetEvent::PluginLoaded { .. } => Priority::Low,
            BuildNetEvent::Custom { .. } => Priority::Medium,
        }
    }

    /// Get the timestamp of the event
    pub fn timestamp(&self) -> DateTime<Utc> {
        match self {
            BuildNetEvent::BuildStarted { timestamp, .. } => *timestamp,
            BuildNetEvent::BuildCompleted { timestamp, .. } => *timestamp,
            BuildNetEvent::BuildFailed { timestamp, .. } => *timestamp,
            BuildNetEvent::BuildCached { timestamp, .. } => *timestamp,
            BuildNetEvent::ResourceCpuHigh { timestamp, .. } => *timestamp,
            BuildNetEvent::ResourceMemoryHigh { timestamp, .. } => *timestamp,
            BuildNetEvent::ResourceDiskLow { timestamp, .. } => *timestamp,
            BuildNetEvent::DaemonStarted { timestamp, .. } => *timestamp,
            BuildNetEvent::DaemonStopped { timestamp, .. } => *timestamp,
            BuildNetEvent::NodeJoined { timestamp, .. } => *timestamp,
            BuildNetEvent::NodeFailed { timestamp, .. } => *timestamp,
            BuildNetEvent::PluginLoaded { timestamp, .. } => *timestamp,
            BuildNetEvent::Custom { timestamp, .. } => *timestamp,
        }
    }

    /// Format the event as a human-readable message
    pub fn format_message(&self) -> String {
        match self {
            BuildNetEvent::BuildStarted { package, .. } => {
                match package {
                    Some(pkg) => format!("Build started for {}", pkg),
                    None => "Full build started".to_string(),
                }
            }
            BuildNetEvent::BuildCompleted { package, duration_ms, tier, .. } => {
                match package {
                    Some(pkg) => format!("Build completed for {} ({}) in {}ms", pkg, tier, duration_ms),
                    None => format!("Full build completed ({}) in {}ms", tier, duration_ms),
                }
            }
            BuildNetEvent::BuildFailed { package, error, .. } => {
                match package {
                    Some(pkg) => format!("Build failed for {}: {}", pkg, error),
                    None => format!("Full build failed: {}", error),
                }
            }
            BuildNetEvent::BuildCached { package, .. } => {
                format!("Build cached for {}", package)
            }
            BuildNetEvent::ResourceCpuHigh { usage_percent, threshold, .. } => {
                format!("CPU usage high: {:.1}% (threshold: {:.1}%)", usage_percent, threshold)
            }
            BuildNetEvent::ResourceMemoryHigh { usage_percent, threshold, .. } => {
                format!("Memory usage high: {:.1}% (threshold: {:.1}%)", usage_percent, threshold)
            }
            BuildNetEvent::ResourceDiskLow { path, available_percent, threshold, .. } => {
                format!("Disk space low on {}: {:.1}% available (threshold: {:.1}%)", path, available_percent, threshold)
            }
            BuildNetEvent::DaemonStarted { version, .. } => {
                format!("BuildNet daemon v{} started", version)
            }
            BuildNetEvent::DaemonStopped { reason, .. } => {
                format!("BuildNet daemon stopped: {}", reason)
            }
            BuildNetEvent::NodeJoined { node_id, address, .. } => {
                format!("Worker node {} joined at {}", node_id, address)
            }
            BuildNetEvent::NodeFailed { node_id, reason, .. } => {
                format!("Worker node {} failed: {}", node_id, reason)
            }
            BuildNetEvent::PluginLoaded { name, version, .. } => {
                format!("Plugin {} v{} loaded", name, version)
            }
            BuildNetEvent::Custom { name, data, .. } => {
                format!("Custom event {}: {:?}", name, data)
            }
        }
    }
}

/// Notification channel trait
#[async_trait::async_trait]
pub trait NotificationChannel: Send + Sync {
    /// Get the channel name
    fn name(&self) -> &'static str;

    /// Check if the channel is enabled
    fn is_enabled(&self) -> bool;

    /// Send a notification
    async fn send(&self, event: &BuildNetEvent, priority: Priority) -> Result<(), BuildNetError>;

    /// Check if this channel should receive the given event
    fn should_receive(&self, event_type: &str, priority: Priority) -> bool;
}

/// Notification settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    /// Deduplication window in seconds
    #[serde(default = "default_dedup_window")]
    pub dedup_window_secs: u64,

    /// Rate limit: max notifications per minute
    #[serde(default = "default_rate_limit_minute")]
    pub rate_limit_per_minute: u32,

    /// Rate limit: max notifications per hour
    #[serde(default = "default_rate_limit_hour")]
    pub rate_limit_per_hour: u32,

    /// Quiet hours settings
    #[serde(default)]
    pub quiet_hours: Option<QuietHours>,
}

fn default_dedup_window() -> u64 { 300 }
fn default_rate_limit_minute() -> u32 { 10 }
fn default_rate_limit_hour() -> u32 { 100 }

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            dedup_window_secs: default_dedup_window(),
            rate_limit_per_minute: default_rate_limit_minute(),
            rate_limit_per_hour: default_rate_limit_hour(),
            quiet_hours: None,
        }
    }
}

/// Quiet hours configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuietHours {
    /// Enable quiet hours
    pub enabled: bool,
    /// Start time (HH:MM format)
    pub start: String,
    /// End time (HH:MM format)
    pub end: String,
    /// Event patterns that bypass quiet hours
    #[serde(default)]
    pub exceptions: Vec<String>,
}

/// Notification router - routes events to appropriate channels
pub struct NotificationRouter {
    channels: Vec<Box<dyn NotificationChannel>>,
    settings: NotificationSettings,
    /// Track recent events for deduplication
    recent_events: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    /// Track rate limiting
    rate_tracker: Arc<RwLock<RateTracker>>,
}

struct RateTracker {
    minute_count: u32,
    hour_count: u32,
    minute_start: DateTime<Utc>,
    hour_start: DateTime<Utc>,
}

impl NotificationRouter {
    /// Create a new notification router
    pub fn new(settings: NotificationSettings) -> Self {
        Self {
            channels: Vec::new(),
            settings,
            recent_events: Arc::new(RwLock::new(HashMap::new())),
            rate_tracker: Arc::new(RwLock::new(RateTracker {
                minute_count: 0,
                hour_count: 0,
                minute_start: Utc::now(),
                hour_start: Utc::now(),
            })),
        }
    }

    /// Add a notification channel
    pub fn add_channel(&mut self, channel: Box<dyn NotificationChannel>) {
        self.channels.push(channel);
    }

    /// Route an event to all applicable channels
    pub async fn route(&self, event: &BuildNetEvent) -> Result<(), BuildNetError> {
        let event_type = event.event_type();
        let priority = event.default_priority();

        // Check deduplication
        if self.is_duplicate(event_type).await {
            tracing::debug!("Skipping duplicate event: {}", event_type);
            return Ok(());
        }

        // Check rate limiting
        if !self.check_rate_limit().await {
            tracing::warn!("Rate limit exceeded, skipping notification for: {}", event_type);
            return Ok(());
        }

        // Check quiet hours
        if self.in_quiet_hours(event_type, priority) {
            tracing::debug!("In quiet hours, skipping notification for: {}", event_type);
            return Ok(());
        }

        // Send to all applicable channels
        let mut errors = Vec::new();
        for channel in &self.channels {
            if channel.is_enabled() && channel.should_receive(event_type, priority) {
                if let Err(e) = channel.send(event, priority).await {
                    tracing::error!("Failed to send notification via {}: {}", channel.name(), e);
                    errors.push(e);
                }
            }
        }

        // Mark event as seen
        self.mark_event_seen(event_type).await;

        if errors.is_empty() {
            Ok(())
        } else {
            Err(BuildNetError::Notification(format!(
                "Failed to send {} notification(s)",
                errors.len()
            )))
        }
    }

    async fn is_duplicate(&self, event_type: &str) -> bool {
        let events = self.recent_events.read().await;
        if let Some(last_seen) = events.get(event_type) {
            let elapsed = (Utc::now() - *last_seen).num_seconds();
            elapsed < self.settings.dedup_window_secs as i64
        } else {
            false
        }
    }

    async fn mark_event_seen(&self, event_type: &str) {
        let mut events = self.recent_events.write().await;
        events.insert(event_type.to_string(), Utc::now());

        // Clean up old entries
        let cutoff = Utc::now() - chrono::Duration::seconds(self.settings.dedup_window_secs as i64 * 2);
        events.retain(|_, v| *v > cutoff);
    }

    async fn check_rate_limit(&self) -> bool {
        let mut tracker = self.rate_tracker.write().await;
        let now = Utc::now();

        // Reset minute counter if needed
        if (now - tracker.minute_start).num_seconds() >= 60 {
            tracker.minute_count = 0;
            tracker.minute_start = now;
        }

        // Reset hour counter if needed
        if (now - tracker.hour_start).num_seconds() >= 3600 {
            tracker.hour_count = 0;
            tracker.hour_start = now;
        }

        // Check limits
        if tracker.minute_count >= self.settings.rate_limit_per_minute {
            return false;
        }
        if tracker.hour_count >= self.settings.rate_limit_per_hour {
            return false;
        }

        // Increment counters
        tracker.minute_count += 1;
        tracker.hour_count += 1;

        true
    }

    fn in_quiet_hours(&self, event_type: &str, priority: Priority) -> bool {
        let Some(quiet) = &self.settings.quiet_hours else {
            return false;
        };

        if !quiet.enabled {
            return false;
        }

        // Check if event is in exceptions
        for pattern in &quiet.exceptions {
            if pattern.ends_with('*') {
                let prefix = &pattern[..pattern.len() - 1];
                if event_type.starts_with(prefix) {
                    return false;
                }
            } else if pattern == event_type {
                return false;
            }
            // Check priority exceptions like "*.critical"
            if pattern == "*.critical" && priority == Priority::Critical {
                return false;
            }
        }

        // Parse and check time
        let now = chrono::Local::now();
        let current_time = now.format("%H:%M").to_string();

        // Simple time comparison (assumes same day)
        if quiet.start <= quiet.end {
            // Normal range (e.g., 22:00 to 08:00 doesn't wrap)
            current_time >= quiet.start && current_time <= quiet.end
        } else {
            // Wrapped range (e.g., 22:00 to 08:00)
            current_time >= quiet.start || current_time <= quiet.end
        }
    }
}
