//! MuscleMap Integration
//!
//! Deployment notifications, health checks, and PM2 management for MuscleMap.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};

/// MuscleMap deployment client
pub struct MuscleMapClient {
    /// API base URL
    api_base: String,
    /// HTTP client
    client: reqwest::Client,
    /// Admin token for authenticated requests
    admin_token: Option<String>,
}

impl MuscleMapClient {
    /// Create a new client for local development
    pub fn local() -> Self {
        Self {
            api_base: "http://localhost:3001".to_string(),
            client: reqwest::Client::new(),
            admin_token: None,
        }
    }

    /// Create a new client for production
    pub fn production() -> Self {
        Self {
            api_base: "https://musclemap.me".to_string(),
            client: reqwest::Client::new(),
            admin_token: None,
        }
    }

    /// Create a client with custom URL
    pub fn new(api_base: &str) -> Self {
        Self {
            api_base: api_base.trim_end_matches('/').to_string(),
            client: reqwest::Client::new(),
            admin_token: None,
        }
    }

    /// Set admin token for authenticated requests
    pub fn with_admin_token(mut self, token: &str) -> Self {
        self.admin_token = Some(token.to_string());
        self
    }

    /// Check API health
    pub async fn health_check(&self) -> Result<HealthStatus> {
        let url = format!("{}/health", self.api_base);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if !response.status().is_success() {
            return Ok(HealthStatus {
                status: "unhealthy".to_string(),
                database: false,
                redis: false,
                uptime_secs: 0,
            });
        }

        let status: HealthStatus = response.json().await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(status)
    }

    /// Notify about deployment status
    pub async fn notify_deployment(&self, notification: &DeploymentNotification) -> Result<()> {
        let url = format!("{}/api/deploy/notify", self.api_base);

        let mut request = self.client
            .post(&url)
            .json(notification);

        if let Some(token) = &self.admin_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::Internal(anyhow::anyhow!("Deployment notification failed: {}", body)));
        }

        Ok(())
    }

    /// Execute a deployment command
    pub async fn execute_command(&self, command: &str) -> Result<CommandResult> {
        let url = format!("{}/api/deploy/execute", self.api_base);

        let mut request = self.client
            .post(&url)
            .json(&serde_json::json!({ "command": command }));

        if let Some(token) = &self.admin_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::Internal(anyhow::anyhow!("Command execution failed: {}", body)));
        }

        let result: CommandResult = response.json().await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(result)
    }

    /// Get PM2 process status
    pub async fn pm2_status(&self) -> Result<Vec<Pm2Process>> {
        let result = self.execute_command("pm2-status").await?;

        // Parse PM2 output
        let processes = parse_pm2_status(&result.output);

        Ok(processes)
    }

    /// Restart PM2 process
    pub async fn pm2_restart(&self, process_name: &str) -> Result<CommandResult> {
        self.execute_command(&format!("pm2-restart-{}", process_name)).await
    }

    /// Trigger a build
    pub async fn trigger_build(&self, packages: Option<Vec<String>>) -> Result<BuildTriggerResponse> {
        let url = format!("{}/buildnet/build", self.api_base);

        let body = match packages {
            Some(pkgs) => serde_json::json!({ "packages": pkgs }),
            None => serde_json::json!({}),
        };

        let mut request = self.client
            .post(&url)
            .json(&body);

        if let Some(token) = &self.admin_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::Internal(anyhow::anyhow!("Build trigger failed: {}", body)));
        }

        let result: BuildTriggerResponse = response.json().await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(result)
    }

    /// Get BuildNet status
    pub async fn buildnet_status(&self) -> Result<BuildNetStatus> {
        let url = format!("{}/buildnet/status", self.api_base);

        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if !response.status().is_success() {
            return Err(BuildNetError::Internal(anyhow::anyhow!("Failed to get BuildNet status")));
        }

        let status: BuildNetStatus = response.json().await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(status)
    }

    /// Clear BuildNet cache
    pub async fn clear_cache(&self) -> Result<()> {
        let url = format!("{}/buildnet/cache/clear", self.api_base);

        let mut request = self.client.post(&url);

        if let Some(token) = &self.admin_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::Internal(anyhow::anyhow!("Cache clear failed: {}", body)));
        }

        Ok(())
    }
}

/// Health status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: String,
    pub database: bool,
    pub redis: bool,
    #[serde(default)]
    pub uptime_secs: u64,
}

/// Deployment notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentNotification {
    /// Deployment status
    pub status: DeploymentStatus,
    /// Commit SHA
    pub commit_sha: String,
    /// Commit message
    pub commit_message: Option<String>,
    /// Branch name
    pub branch: String,
    /// Deployer (git user)
    pub deployer: Option<String>,
    /// Build duration in milliseconds
    pub duration_ms: Option<u64>,
    /// Error message if failed
    pub error: Option<String>,
    /// Packages that were built
    pub packages: Vec<String>,
    /// Build tier used
    pub build_tier: Option<String>,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
}

impl DeploymentNotification {
    /// Create a started notification
    pub fn started(commit_sha: &str, branch: &str) -> Self {
        Self {
            status: DeploymentStatus::Started,
            commit_sha: commit_sha.to_string(),
            commit_message: None,
            branch: branch.to_string(),
            deployer: None,
            duration_ms: None,
            error: None,
            packages: vec![],
            build_tier: None,
            timestamp: Utc::now(),
        }
    }

    /// Create a success notification
    pub fn success(commit_sha: &str, branch: &str, duration_ms: u64) -> Self {
        Self {
            status: DeploymentStatus::Success,
            commit_sha: commit_sha.to_string(),
            commit_message: None,
            branch: branch.to_string(),
            deployer: None,
            duration_ms: Some(duration_ms),
            error: None,
            packages: vec![],
            build_tier: None,
            timestamp: Utc::now(),
        }
    }

    /// Create a failed notification
    pub fn failed(commit_sha: &str, branch: &str, error: &str) -> Self {
        Self {
            status: DeploymentStatus::Failed,
            commit_sha: commit_sha.to_string(),
            commit_message: None,
            branch: branch.to_string(),
            deployer: None,
            duration_ms: None,
            error: Some(error.to_string()),
            packages: vec![],
            build_tier: None,
            timestamp: Utc::now(),
        }
    }
}

/// Deployment status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeploymentStatus {
    Started,
    Building,
    Deploying,
    Validating,
    Success,
    Failed,
    RolledBack,
}

/// Command execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub output: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
}

/// PM2 process info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pm2Process {
    pub name: String,
    pub pm_id: u32,
    pub status: String,
    pub cpu: f32,
    pub memory: u64,
    pub uptime: u64,
    pub restarts: u32,
}

/// Parse PM2 status output
fn parse_pm2_status(output: &str) -> Vec<Pm2Process> {
    // This is a simplified parser - would need to handle actual PM2 output format
    let mut processes = Vec::new();

    for line in output.lines() {
        // Parse PM2 jlist format if available
        if let Ok(procs) = serde_json::from_str::<Vec<serde_json::Value>>(line) {
            for proc in procs {
                if let Some(name) = proc.get("name").and_then(|v| v.as_str()) {
                    processes.push(Pm2Process {
                        name: name.to_string(),
                        pm_id: proc.get("pm_id").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        status: proc.get("pm2_env")
                            .and_then(|e| e.get("status"))
                            .and_then(|s| s.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        cpu: proc.get("monit")
                            .and_then(|m| m.get("cpu"))
                            .and_then(|c| c.as_f64())
                            .unwrap_or(0.0) as f32,
                        memory: proc.get("monit")
                            .and_then(|m| m.get("memory"))
                            .and_then(|m| m.as_u64())
                            .unwrap_or(0),
                        uptime: proc.get("pm2_env")
                            .and_then(|e| e.get("pm_uptime"))
                            .and_then(|u| u.as_u64())
                            .unwrap_or(0),
                        restarts: proc.get("pm2_env")
                            .and_then(|e| e.get("restart_time"))
                            .and_then(|r| r.as_u64())
                            .unwrap_or(0) as u32,
                    });
                }
            }
        }
    }

    processes
}

/// Build trigger response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildTriggerResponse {
    pub build_id: String,
    pub status: String,
    pub tier: Option<String>,
    pub packages: Vec<String>,
}

/// BuildNet status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildNetStatus {
    pub status: String,
    pub uptime_secs: u64,
    pub version: String,
    pub packages: Vec<PackageStatus>,
    pub last_build: Option<LastBuildInfo>,
}

/// Package status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageStatus {
    pub name: String,
    pub last_built: Option<DateTime<Utc>>,
    pub hash: Option<String>,
}

/// Last build info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LastBuildInfo {
    pub id: String,
    pub tier: String,
    pub duration_ms: u64,
    pub packages_built: usize,
    pub timestamp: DateTime<Utc>,
}
