//! SMS notification channel (Twilio)

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::BuildNetError;
use super::super::{BuildNetEvent, NotificationChannel, Priority};

/// SMS notification channel configuration (Twilio)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmsConfig {
    /// Twilio Account SID
    pub account_sid: String,
    /// Twilio Auth Token
    pub auth_token: String,
    /// Twilio phone number (from)
    pub from_number: String,
    /// Recipients
    pub recipients: Vec<SmsRecipient>,
    /// Enable this channel
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool { true }

/// SMS recipient configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmsRecipient {
    /// Phone number (E.164 format)
    pub phone: String,
    /// Event patterns to subscribe to
    #[serde(default)]
    pub events: Vec<String>,
    /// Minimum priority to receive
    #[serde(default = "default_high_priority")]
    pub min_priority: Priority,
}

fn default_high_priority() -> Priority { Priority::High }

/// SMS notification channel
pub struct SmsChannel {
    config: SmsConfig,
    client: reqwest::Client,
}

impl SmsChannel {
    /// Create a new SMS channel
    pub fn new(config: SmsConfig) -> Self {
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

    fn should_send_to_recipient(&self, recipient: &SmsRecipient, event_type: &str, priority: Priority) -> bool {
        // Check priority threshold
        if priority < recipient.min_priority {
            return false;
        }

        // Check event patterns
        if recipient.events.is_empty() {
            return true;
        }

        for pattern in &recipient.events {
            if self.matches_pattern(event_type, pattern) {
                return true;
            }
        }

        false
    }

    fn format_sms(&self, event: &BuildNetEvent, priority: Priority) -> String {
        let emoji = match priority {
            Priority::Low => "📋",
            Priority::Medium => "📢",
            Priority::High => "⚠️",
            Priority::Critical => "🚨",
        };

        format!("{} BuildNet: {}", emoji, event.format_message())
    }

    async fn send_sms(&self, to: &str, body: &str) -> Result<(), BuildNetError> {
        let url = format!(
            "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
            self.config.account_sid
        );

        let response = self.client
            .post(&url)
            .basic_auth(&self.config.account_sid, Some(&self.config.auth_token))
            .form(&[
                ("From", &self.config.from_number),
                ("To", &to.to_string()),
                ("Body", &body.to_string()),
            ])
            .send()
            .await
            .map_err(|e| BuildNetError::Notification(format!("Twilio request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::Notification(format!(
                "Twilio returned error status {}: {}",
                status, body
            )));
        }

        Ok(())
    }
}

#[async_trait]
impl NotificationChannel for SmsChannel {
    fn name(&self) -> &'static str {
        "sms"
    }

    fn is_enabled(&self) -> bool {
        self.config.enabled && !self.config.account_sid.is_empty()
    }

    async fn send(&self, event: &BuildNetEvent, priority: Priority) -> Result<(), BuildNetError> {
        let event_type = event.event_type();
        let message = self.format_sms(event, priority);

        for recipient in &self.config.recipients {
            if self.should_send_to_recipient(recipient, event_type, priority) {
                tracing::info!("Sending SMS to {}: {}", recipient.phone, message);
                self.send_sms(&recipient.phone, &message).await?;
            }
        }

        Ok(())
    }

    fn should_receive(&self, event_type: &str, priority: Priority) -> bool {
        for recipient in &self.config.recipients {
            if self.should_send_to_recipient(recipient, event_type, priority) {
                return true;
            }
        }
        false
    }
}
