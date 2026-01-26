//! Webhook notification channel

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::BuildNetError;
use super::super::{BuildNetEvent, NotificationChannel, Priority};

/// Webhook notification channel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    /// Webhook URL
    pub url: String,
    /// Event patterns to subscribe to (e.g., "build.*", "*")
    #[serde(default)]
    pub events: Vec<String>,
    /// Optional authentication header
    pub auth_header: Option<String>,
    /// Optional authentication value
    pub auth_value: Option<String>,
    /// Enable this channel
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }

/// Webhook notification channel
pub struct WebhookChannel {
    config: WebhookConfig,
    client: reqwest::Client,
}

impl WebhookChannel {
    /// Create a new webhook channel
    pub fn new(config: WebhookConfig) -> Self {
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

        if pattern.ends_with('*') {
            let prefix = &pattern[..pattern.len() - 1];
            return event_type.starts_with(prefix);
        }

        event_type == pattern
    }
}

#[async_trait]
impl NotificationChannel for WebhookChannel {
    fn name(&self) -> &'static str {
        "webhook"
    }

    fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    async fn send(&self, event: &BuildNetEvent, priority: Priority) -> Result<(), BuildNetError> {
        let payload = serde_json::json!({
            "event": event,
            "priority": priority,
            "message": event.format_message(),
            "timestamp": event.timestamp(),
        });

        let mut request = self.client
            .post(&self.config.url)
            .header("Content-Type", "application/json")
            .json(&payload);

        // Add authentication header if configured
        if let (Some(header), Some(value)) = (&self.config.auth_header, &self.config.auth_value) {
            request = request.header(header.as_str(), value.as_str());
        }

        let response = request
            .send()
            .await
            .map_err(|e| BuildNetError::Notification(format!("Webhook request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(BuildNetError::Notification(format!(
                "Webhook returned error status: {}",
                response.status()
            )));
        }

        tracing::debug!("Webhook notification sent to {}", self.config.url);
        Ok(())
    }

    fn should_receive(&self, event_type: &str, _priority: Priority) -> bool {
        if self.config.events.is_empty() {
            return true; // Subscribe to all events if none specified
        }

        for pattern in &self.config.events {
            if self.matches_pattern(event_type, pattern) {
                return true;
            }
        }

        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_matching() {
        let config = WebhookConfig {
            url: "https://example.com".into(),
            events: vec!["build.*".into()],
            auth_header: None,
            auth_value: None,
            enabled: true,
        };
        let channel = WebhookChannel::new(config);

        assert!(channel.matches_pattern("build.started", "build.*"));
        assert!(channel.matches_pattern("build.completed", "build.*"));
        assert!(!channel.matches_pattern("resource.cpu.high", "build.*"));
        assert!(channel.matches_pattern("anything", "*"));
    }
}
