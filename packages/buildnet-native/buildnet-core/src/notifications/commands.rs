//! Remote control commands for BuildNet
//!
//! Allows controlling BuildNet via SMS, Email, or other channels.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

use crate::BuildNetError;

/// Command authorization levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthLevel {
    /// Read-only access (status, reports)
    Read,
    /// Build access (trigger builds, cancel)
    Build,
    /// Admin access (cache clear, shutdown)
    Admin,
}

impl Default for AuthLevel {
    fn default() -> Self {
        AuthLevel::Read
    }
}

/// Remote command definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    /// Command name (e.g., "STATUS", "BUILD")
    pub name: String,
    /// Command description
    pub description: String,
    /// Required authorization level
    pub auth_level: AuthLevel,
    /// Whether confirmation is required
    #[serde(default)]
    pub requires_confirmation: bool,
}

/// Available remote commands
pub fn available_commands() -> Vec<Command> {
    vec![
        Command {
            name: "STATUS".into(),
            description: "Get current daemon status".into(),
            auth_level: AuthLevel::Read,
            requires_confirmation: false,
        },
        Command {
            name: "BUILD".into(),
            description: "Trigger build (optionally specify package)".into(),
            auth_level: AuthLevel::Build,
            requires_confirmation: false,
        },
        Command {
            name: "CANCEL".into(),
            description: "Cancel a running build".into(),
            auth_level: AuthLevel::Build,
            requires_confirmation: false,
        },
        Command {
            name: "CACHE CLEAR".into(),
            description: "Clear build cache".into(),
            auth_level: AuthLevel::Admin,
            requires_confirmation: true,
        },
        Command {
            name: "REPORT".into(),
            description: "Generate a report (daily, weekly, summary)".into(),
            auth_level: AuthLevel::Read,
            requires_confirmation: false,
        },
        Command {
            name: "NODE LIST".into(),
            description: "List cluster nodes".into(),
            auth_level: AuthLevel::Read,
            requires_confirmation: false,
        },
        Command {
            name: "PLUGIN LIST".into(),
            description: "List loaded plugins".into(),
            auth_level: AuthLevel::Read,
            requires_confirmation: false,
        },
        Command {
            name: "STOP".into(),
            description: "Stop the daemon".into(),
            auth_level: AuthLevel::Admin,
            requires_confirmation: true,
        },
        Command {
            name: "HELP".into(),
            description: "Show available commands".into(),
            auth_level: AuthLevel::Read,
            requires_confirmation: false,
        },
    ]
}

/// Parsed remote command
#[derive(Debug, Clone)]
pub struct ParsedCommand {
    /// Command name
    pub command: String,
    /// Command arguments
    pub args: Vec<String>,
}

/// Parse a remote command from text
pub fn parse_command(input: &str) -> Result<ParsedCommand, BuildNetError> {
    let input = input.trim().to_uppercase();

    if input.is_empty() {
        return Err(BuildNetError::InvalidCommand("Empty command".into()));
    }

    // Try to match multi-word commands first
    let multi_word_commands = ["CACHE CLEAR", "NODE LIST", "PLUGIN LIST"];
    for cmd in multi_word_commands {
        if input.starts_with(cmd) {
            let rest = input[cmd.len()..].trim();
            let args: Vec<String> = if rest.is_empty() {
                vec![]
            } else {
                rest.split_whitespace().map(String::from).collect()
            };
            return Ok(ParsedCommand {
                command: cmd.to_string(),
                args,
            });
        }
    }

    // Parse single-word command
    let parts: Vec<&str> = input.split_whitespace().collect();
    if parts.is_empty() {
        return Err(BuildNetError::InvalidCommand("Empty command".into()));
    }

    let command = parts[0].to_string();
    let args = parts[1..].iter().map(|s| s.to_string()).collect();

    Ok(ParsedCommand { command, args })
}

/// Command executor result
#[derive(Debug, Clone, Serialize)]
pub struct CommandResult {
    /// Whether the command succeeded
    pub success: bool,
    /// Result message
    pub message: String,
    /// Additional data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

/// Remote control authentication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    /// API keys with permissions
    #[serde(default)]
    pub api_keys: Vec<ApiKeyConfig>,
    /// SMS authentication settings
    #[serde(default)]
    pub sms: Option<SmsAuthConfig>,
    /// Email authentication settings
    #[serde(default)]
    pub email: Option<EmailAuthConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyConfig {
    /// API key (hashed or plain - should be env var reference)
    pub key: String,
    /// Name for this key (for logging)
    #[serde(default)]
    pub name: Option<String>,
    /// Permission patterns (e.g., ["*"], ["read:*", "build:*"])
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmsAuthConfig {
    /// Allowed phone numbers
    pub allowed_numbers: Vec<String>,
    /// Require confirmation for destructive operations
    #[serde(default = "default_true")]
    pub require_confirmation: bool,
}

fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailAuthConfig {
    /// Allowed email addresses
    pub allowed_addresses: Vec<String>,
    /// Require confirmation for destructive operations
    #[serde(default = "default_true")]
    pub require_confirmation: bool,
}

/// Command handler trait
#[async_trait::async_trait]
pub trait CommandHandler: Send + Sync {
    /// Execute a command
    async fn execute(&self, cmd: &ParsedCommand, sender_id: &str) -> Result<CommandResult, BuildNetError>;

    /// Check if the sender is authorized for the command
    fn is_authorized(&self, cmd: &ParsedCommand, sender_id: &str) -> bool;
}

/// Remote control manager
pub struct RemoteControlManager {
    auth_config: AuthConfig,
    /// Pending confirmations (confirmation_id -> original command)
    pending_confirmations: tokio::sync::RwLock<HashMap<String, (ParsedCommand, String, chrono::DateTime<chrono::Utc>)>>,
}

impl RemoteControlManager {
    /// Create a new remote control manager
    pub fn new(auth_config: AuthConfig) -> Self {
        Self {
            auth_config,
            pending_confirmations: tokio::sync::RwLock::new(HashMap::new()),
        }
    }

    /// Check if a sender (phone number or email) is authorized
    pub fn get_auth_level(&self, sender_id: &str) -> Option<AuthLevel> {
        // Check SMS
        if let Some(sms) = &self.auth_config.sms {
            if sms.allowed_numbers.iter().any(|n| n == sender_id) {
                return Some(AuthLevel::Admin); // SMS users get admin by default
            }
        }

        // Check email
        if let Some(email) = &self.auth_config.email {
            if email.allowed_addresses.iter().any(|e| e == sender_id) {
                return Some(AuthLevel::Admin); // Email users get admin by default
            }
        }

        // Check API keys
        for key in &self.auth_config.api_keys {
            if key.key == sender_id {
                // Parse permissions to determine level
                if key.permissions.iter().any(|p| p == "*" || p.starts_with("admin:")) {
                    return Some(AuthLevel::Admin);
                }
                if key.permissions.iter().any(|p| p.starts_with("build:")) {
                    return Some(AuthLevel::Build);
                }
                return Some(AuthLevel::Read);
            }
        }

        None
    }

    /// Create a confirmation request
    pub async fn request_confirmation(&self, cmd: ParsedCommand, sender_id: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        // Generate a pseudo-random confirmation ID using current time and sender
        let mut hasher = DefaultHasher::new();
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0).hash(&mut hasher);
        sender_id.hash(&mut hasher);
        let confirmation_id = format!("{:08x}", hasher.finish() as u32);

        let mut pending = self.pending_confirmations.write().await;
        pending.insert(
            confirmation_id.clone(),
            (cmd, sender_id.to_string(), chrono::Utc::now()),
        );
        confirmation_id
    }

    /// Confirm a pending command
    pub async fn confirm(&self, confirmation_id: &str, sender_id: &str) -> Result<ParsedCommand, BuildNetError> {
        let mut pending = self.pending_confirmations.write().await;

        // Clean up old confirmations (> 5 minutes)
        let cutoff = chrono::Utc::now() - chrono::Duration::minutes(5);
        pending.retain(|_, (_, _, ts)| *ts > cutoff);

        match pending.remove(confirmation_id) {
            Some((cmd, original_sender, _)) if original_sender == sender_id => Ok(cmd),
            Some(_) => Err(BuildNetError::Unauthorized("Confirmation from different sender".into())),
            None => Err(BuildNetError::InvalidCommand("Confirmation not found or expired".into())),
        }
    }

    /// Format the help message
    pub fn format_help(&self) -> String {
        let commands = available_commands();
        let mut help = String::from("BuildNet Commands:\n");

        for cmd in commands {
            help.push_str(&format!("• {} - {}\n", cmd.name, cmd.description));
        }

        help
    }

    /// Format a status response for SMS
    pub fn format_status_sms(
        status: &str,
        total_builds: u64,
        cache_size: u64,
        nodes_online: usize,
    ) -> String {
        let status_emoji = if status == "running" { "🟢" } else { "🔴" };
        let cache_mb = cache_size as f64 / (1024.0 * 1024.0);

        format!(
            "{} {} | Builds: {} | Cache: {:.1}MB | Nodes: {} online",
            status_emoji,
            status.chars().next().unwrap().to_uppercase().chain(status.chars().skip(1)).collect::<String>(),
            total_builds,
            cache_mb,
            nodes_online
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_command() {
        let cmd = parse_command("status").unwrap();
        assert_eq!(cmd.command, "STATUS");
        assert!(cmd.args.is_empty());
    }

    #[test]
    fn test_parse_command_with_args() {
        let cmd = parse_command("build api").unwrap();
        assert_eq!(cmd.command, "BUILD");
        assert_eq!(cmd.args, vec!["API"]);
    }

    #[test]
    fn test_parse_multi_word_command() {
        let cmd = parse_command("cache clear").unwrap();
        assert_eq!(cmd.command, "CACHE CLEAR");
        assert!(cmd.args.is_empty());
    }

    #[test]
    fn test_parse_empty_command() {
        assert!(parse_command("").is_err());
        assert!(parse_command("   ").is_err());
    }
}
