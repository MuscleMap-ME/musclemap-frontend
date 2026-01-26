//! Discord notification channel

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::BuildNetError;
use super::super::{BuildNetEvent, NotificationChannel, Priority};

/// Discord notification channel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscordConfig {
    /// Discord Bot token
    pub bot_token: Option<String>,
    /// Discord Webhook URL (alternative to bot token)
    pub webhook_url: Option<String>,
    /// Default channel ID (for bot token)
    pub default_channel_id: Option<String>,
    /// Guild ID
    pub guild_id: Option<String>,
    /// Enable this channel
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }

/// Discord notification channel
pub struct DiscordChannel {
    config: DiscordConfig,
    client: reqwest::Client,
}

impl DiscordChannel {
    /// Create a new Discord channel
    pub fn new(config: DiscordConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    fn get_color(&self, priority: Priority) -> u32 {
        match priority {
            Priority::Low => 0x6c757d,     // Gray
            Priority::Medium => 0x0066ff,  // Blue
            Priority::High => 0xfd7e14,    // Orange
            Priority::Critical => 0xdc3545, // Red
        }
    }

    fn get_emoji(&self, event: &BuildNetEvent) -> &'static str {
        match event {
            BuildNetEvent::BuildStarted { .. } => "🔨",
            BuildNetEvent::BuildCompleted { .. } => "✅",
            BuildNetEvent::BuildFailed { .. } => "❌",
            BuildNetEvent::BuildCached { .. } => "⚡",
            BuildNetEvent::ResourceCpuHigh { .. } => "🔥",
            BuildNetEvent::ResourceMemoryHigh { .. } => "🔥",
            BuildNetEvent::ResourceDiskLow { .. } => "⚠️",
            BuildNetEvent::DaemonStarted { .. } => "🚀",
            BuildNetEvent::DaemonStopped { .. } => "🛑",
            BuildNetEvent::NodeJoined { .. } => "➕",
            BuildNetEvent::NodeFailed { .. } => "💀",
            BuildNetEvent::PluginLoaded { .. } => "📦",
            BuildNetEvent::Custom { .. } => "ℹ️",
        }
    }

    fn build_discord_embed(&self, event: &BuildNetEvent, priority: Priority) -> serde_json::Value {
        let emoji = self.get_emoji(event);
        let color = self.get_color(priority);

        serde_json::json!({
            "embeds": [{
                "title": format!("{} BuildNet Notification", emoji),
                "description": event.format_message(),
                "color": color,
                "fields": [
                    {
                        "name": "Event",
                        "value": event.event_type(),
                        "inline": true
                    },
                    {
                        "name": "Priority",
                        "value": format!("{:?}", priority),
                        "inline": true
                    }
                ],
                "footer": {
                    "text": "BuildNet Notification System"
                },
                "timestamp": event.timestamp().to_rfc3339()
            }]
        })
    }
}

#[async_trait]
impl NotificationChannel for DiscordChannel {
    fn name(&self) -> &'static str {
        "discord"
    }

    fn is_enabled(&self) -> bool {
        self.config.enabled && (self.config.bot_token.is_some() || self.config.webhook_url.is_some())
    }

    async fn send(&self, event: &BuildNetEvent, priority: Priority) -> Result<(), BuildNetError> {
        let payload = self.build_discord_embed(event, priority);

        let response = if let Some(webhook_url) = &self.config.webhook_url {
            // Use Discord webhook
            self.client
                .post(webhook_url)
                .json(&payload)
                .send()
                .await
                .map_err(|e| BuildNetError::Notification(format!("Discord webhook failed: {}", e)))?
        } else if let (Some(bot_token), Some(channel_id)) = (&self.config.bot_token, &self.config.default_channel_id) {
            // Use Discord API
            self.client
                .post(format!("https://discord.com/api/v10/channels/{}/messages", channel_id))
                .header("Authorization", format!("Bot {}", bot_token))
                .json(&payload)
                .send()
                .await
                .map_err(|e| BuildNetError::Notification(format!("Discord API failed: {}", e)))?
        } else {
            return Err(BuildNetError::Notification("No Discord credentials configured".into()));
        };

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::Notification(format!(
                "Discord returned error status {}: {}",
                status, body
            )));
        }

        tracing::debug!("Discord notification sent");
        Ok(())
    }

    fn should_receive(&self, _event_type: &str, _priority: Priority) -> bool {
        true
    }
}
