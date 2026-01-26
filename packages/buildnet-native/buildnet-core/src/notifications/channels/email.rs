//! Email notification channel

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::BuildNetError;
use super::super::{BuildNetEvent, NotificationChannel, Priority};

/// Email notification channel configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailConfig {
    /// SMTP server host
    pub smtp_host: String,
    /// SMTP server port
    #[serde(default = "default_smtp_port")]
    pub smtp_port: u16,
    /// SMTP username
    pub username: Option<String>,
    /// SMTP password
    pub password: Option<String>,
    /// Use TLS
    #[serde(default = "default_true")]
    pub use_tls: bool,
    /// From address
    pub from_address: String,
    /// From name
    #[serde(default = "default_from_name")]
    pub from_name: String,
    /// Recipient email addresses
    pub recipients: Vec<EmailRecipient>,
    /// Enable this channel
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_smtp_port() -> u16 { 587 }
fn default_true() -> bool { true }
fn default_from_name() -> String { "BuildNet".into() }

/// Email recipient configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailRecipient {
    /// Email address
    pub email: String,
    /// Event patterns to subscribe to
    #[serde(default)]
    pub events: Vec<String>,
    /// Minimum priority to receive
    #[serde(default)]
    pub min_priority: Priority,
    /// Email format (html or text)
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String { "html".into() }

/// Email notification channel
pub struct EmailChannel {
    config: EmailConfig,
}

impl EmailChannel {
    /// Create a new email channel
    pub fn new(config: EmailConfig) -> Self {
        Self { config }
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

    fn format_html(&self, event: &BuildNetEvent, priority: Priority) -> String {
        let priority_color = match priority {
            Priority::Low => "#6c757d",
            Priority::Medium => "#0d6efd",
            Priority::High => "#fd7e14",
            Priority::Critical => "#dc3545",
        };

        let priority_badge = match priority {
            Priority::Low => "LOW",
            Priority::Medium => "MEDIUM",
            Priority::High => "HIGH",
            Priority::Critical => "CRITICAL",
        };

        format!(r#"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #ffffff; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #12121a; border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }}
        .header {{ display: flex; align-items: center; margin-bottom: 20px; }}
        .logo {{ width: 40px; height: 40px; background: linear-gradient(135deg, #0066ff, #0044cc); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; }}
        .title {{ font-size: 20px; font-weight: 600; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; background: {}; color: white; margin-bottom: 16px; }}
        .message {{ font-size: 16px; line-height: 1.6; color: #a0a0b0; }}
        .timestamp {{ font-size: 12px; color: #606070; margin-top: 16px; }}
        .footer {{ margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #606070; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">⚡</div>
            <div class="title">BuildNet Notification</div>
        </div>
        <div class="badge">{}</div>
        <div class="message">{}</div>
        <div class="timestamp">Event: {} at {}</div>
        <div class="footer">
            This notification was sent by BuildNet. You can configure notification settings in your BuildNet configuration.
        </div>
    </div>
</body>
</html>
"#, priority_color, priority_badge, event.format_message(), event.event_type(), event.timestamp())
    }

    fn format_text(&self, event: &BuildNetEvent, priority: Priority) -> String {
        format!(
            "BuildNet Notification\n\nPriority: {:?}\n\n{}\n\nEvent: {} at {}\n\n--\nSent by BuildNet",
            priority,
            event.format_message(),
            event.event_type(),
            event.timestamp()
        )
    }

    fn should_send_to_recipient(&self, recipient: &EmailRecipient, event_type: &str, priority: Priority) -> bool {
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
}

#[async_trait]
impl NotificationChannel for EmailChannel {
    fn name(&self) -> &'static str {
        "email"
    }

    fn is_enabled(&self) -> bool {
        self.config.enabled
    }

    async fn send(&self, event: &BuildNetEvent, priority: Priority) -> Result<(), BuildNetError> {
        let event_type = event.event_type();

        // In a real implementation, we would use lettre or similar
        // For now, we'll log the notification and indicate it's not fully implemented
        for recipient in &self.config.recipients {
            if self.should_send_to_recipient(recipient, event_type, priority) {
                let body = if recipient.format == "html" {
                    self.format_html(event, priority)
                } else {
                    self.format_text(event, priority)
                };

                tracing::info!(
                    "Email notification would be sent to {} ({}): {}",
                    recipient.email,
                    recipient.format,
                    event.format_message()
                );

                // TODO: Implement actual SMTP sending with lettre
                // For now, this is a placeholder
                let _ = body; // Use the body variable to avoid warning
            }
        }

        Ok(())
    }

    fn should_receive(&self, event_type: &str, priority: Priority) -> bool {
        // Check if any recipient should receive this event
        for recipient in &self.config.recipients {
            if self.should_send_to_recipient(recipient, event_type, priority) {
                return true;
            }
        }

        false
    }
}
