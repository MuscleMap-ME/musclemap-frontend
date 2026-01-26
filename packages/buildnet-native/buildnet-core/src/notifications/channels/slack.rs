//! Slack notification channel

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::BuildNetError;
use super::super::{BuildNetEvent, NotificationChannel, Priority};

/// Slack notification channel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackConfig {
    /// Slack Bot OAuth token
    pub bot_token: Option<String>,
    /// Slack Webhook URL (alternative to bot token)
    pub webhook_url: Option<String>,
    /// Default channel to post to
    pub default_channel: String,
    /// Channel routing by event type
    #[serde(default)]
    pub channel_routing: Vec<ChannelRoute>,
    /// Enable this channel
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }

/// Route events to specific channels
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelRoute {
    /// Event pattern
    pub event_pattern: String,
    /// Channel to route to
    pub channel: String,
}

/// Slack notification channel
pub struct SlackChannel {
    config: SlackConfig,
    client: reqwest::Client,
}

impl SlackChannel {
    /// Create a new Slack channel
    pub fn new(config: SlackConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    fn matches_pattern(&self, event_type: &str, pattern: &str) -> bool {
        if pattern == "*" {
            return true;
        }

        if pattern.ends_with(".*") {
            let prefix = &pattern[..pattern.len() - 2];
            return event_type.starts_with(prefix);
        }

        event_type == pattern
    }

    fn get_channel_for_event(&self, event_type: &str) -> &str {
        for route in &self.config.channel_routing {
            if self.matches_pattern(event_type, &route.event_pattern) {
                return &route.channel;
            }
        }
        &self.config.default_channel
    }

    fn get_emoji(&self, event: &BuildNetEvent) -> &'static str {
        match event {
            BuildNetEvent::BuildStarted { .. } => ":hammer:",
            BuildNetEvent::BuildCompleted { .. } => ":white_check_mark:",
            BuildNetEvent::BuildFailed { .. } => ":x:",
            BuildNetEvent::BuildCached { .. } => ":zap:",
            BuildNetEvent::ResourceCpuHigh { .. } => ":fire:",
            BuildNetEvent::ResourceMemoryHigh { .. } => ":fire:",
            BuildNetEvent::ResourceDiskLow { .. } => ":warning:",
            BuildNetEvent::DaemonStarted { .. } => ":rocket:",
            BuildNetEvent::DaemonStopped { .. } => ":stop_sign:",
            BuildNetEvent::NodeJoined { .. } => ":heavy_plus_sign:",
            BuildNetEvent::NodeFailed { .. } => ":skull:",
            BuildNetEvent::PluginLoaded { .. } => ":package:",
            BuildNetEvent::Custom { .. } => ":information_source:",
        }
    }

    fn get_color(&self, priority: Priority) -> &'static str {
        match priority {
            Priority::Low => "#6c757d",
            Priority::Medium => "#0066ff",
            Priority::High => "#fd7e14",
            Priority::Critical => "#dc3545",
        }
    }

    fn build_slack_message(&self, event: &BuildNetEvent, priority: Priority) -> serde_json::Value {
        let emoji = self.get_emoji(event);
        let color = self.get_color(priority);
        let channel = self.get_channel_for_event(event.event_type());

        serde_json::json!({
            "channel": channel,
            "text": format!("{} BuildNet: {}", emoji, event.format_message()),
            "attachments": [{
                "color": color,
                "fields": [
                    {
                        "title": "Event",
                        "value": event.event_type(),
                        "short": true
                    },
                    {
                        "title": "Priority",
                        "value": format!("{:?}", priority),
                        "short": true
                    },
                    {
                        "title": "Timestamp",
                        "value": event.timestamp().to_rfc3339(),
                        "short": true
                    }
                ],
                "footer": "BuildNet Notification System",
                "footer_icon": "https://buildnet.dev/icon.png"
            }]
        })
    }
}

#[async_trait]
impl NotificationChannel for SlackChannel {
    fn name(&self) -> &'static str {
        "slack"
    }

    fn is_enabled(&self) -> bool {
        self.config.enabled && (self.config.bot_token.is_some() || self.config.webhook_url.is_some())
    }

    async fn send(&self, event: &BuildNetEvent, priority: Priority) -> Result<(), BuildNetError> {
        let message = self.build_slack_message(event, priority);

        let response = if let Some(webhook_url) = &self.config.webhook_url {
            // Use incoming webhook
            self.client
                .post(webhook_url)
                .json(&message)
                .send()
                .await
                .map_err(|e| BuildNetError::Notification(format!("Slack webhook failed: {}", e)))?
        } else if let Some(bot_token) = &self.config.bot_token {
            // Use Slack API
            self.client
                .post("https://slack.com/api/chat.postMessage")
                .header("Authorization", format!("Bearer {}", bot_token))
                .json(&message)
                .send()
                .await
                .map_err(|e| BuildNetError::Notification(format!("Slack API failed: {}", e)))?
        } else {
            return Err(BuildNetError::Notification("No Slack credentials configured".into()));
        };

        if !response.status().is_success() {
            return Err(BuildNetError::Notification(format!(
                "Slack returned error status: {}",
                response.status()
            )));
        }

        // Check for Slack API error response
        let body: serde_json::Value = response
            .json()
            .await
            .unwrap_or_else(|_| serde_json::json!({"ok": true}));

        if let Some(false) = body.get("ok").and_then(|v| v.as_bool()) {
            let error = body.get("error").and_then(|v| v.as_str()).unwrap_or("unknown");
            return Err(BuildNetError::Notification(format!("Slack API error: {}", error)));
        }

        tracing::debug!("Slack notification sent");
        Ok(())
    }

    fn should_receive(&self, _event_type: &str, _priority: Priority) -> bool {
        // Slack receives all events, filtered by channel routing
        true
    }
}
