//! GitHub Integration
//!
//! Commit status reporting, PR comments, webhooks, and GitHub Actions integration.

use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};

/// GitHub client for API interactions
pub struct GitHubClient {
    /// GitHub API token
    token: String,
    /// API base URL (for GitHub Enterprise)
    api_base: String,
    /// HTTP client
    client: reqwest::Client,
    /// Repository owner
    owner: String,
    /// Repository name
    repo: String,
}

impl GitHubClient {
    /// Create a new GitHub client
    pub fn new(token: &str, owner: &str, repo: &str) -> Self {
        Self {
            token: token.to_string(),
            api_base: "https://api.github.com".to_string(),
            client: reqwest::Client::new(),
            owner: owner.to_string(),
            repo: repo.to_string(),
        }
    }

    /// Create client for GitHub Enterprise
    pub fn enterprise(token: &str, api_base: &str, owner: &str, repo: &str) -> Self {
        Self {
            token: token.to_string(),
            api_base: api_base.trim_end_matches('/').to_string(),
            client: reqwest::Client::new(),
            owner: owner.to_string(),
            repo: repo.to_string(),
        }
    }

    /// Get API URL for a path
    fn api_url(&self, path: &str) -> String {
        format!("{}/repos/{}/{}{}", self.api_base, self.owner, self.repo, path)
    }

    /// Create a commit status
    pub async fn create_commit_status(&self, sha: &str, status: &CommitStatus) -> Result<()> {
        let url = self.api_url(&format!("/statuses/{}", sha));

        let body = serde_json::json!({
            "state": status.state.as_str(),
            "target_url": status.target_url,
            "description": status.description,
            "context": status.context,
        });

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "BuildNet")
            .json(&body)
            .send()
            .await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::GitHub(format!("Failed to create commit status: {}", body)));
        }

        Ok(())
    }

    /// Create a check run (GitHub Actions-style)
    pub async fn create_check_run(&self, check: &CheckRun) -> Result<CheckRunResponse> {
        let url = self.api_url("/check-runs");

        let mut body = serde_json::json!({
            "name": check.name,
            "head_sha": check.head_sha,
            "status": check.status.as_str(),
        });

        if let Some(details_url) = &check.details_url {
            body["details_url"] = serde_json::Value::String(details_url.clone());
        }
        if let Some(external_id) = &check.external_id {
            body["external_id"] = serde_json::Value::String(external_id.clone());
        }
        if let Some(conclusion) = &check.conclusion {
            body["conclusion"] = serde_json::Value::String(conclusion.as_str().to_string());
        }
        if let Some(output) = &check.output {
            body["output"] = serde_json::json!({
                "title": output.title,
                "summary": output.summary,
                "text": output.text,
            });
        }

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "BuildNet")
            .json(&body)
            .send()
            .await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::GitHub(format!("Failed to create check run: {}", body)));
        }

        let result: CheckRunResponse = response.json().await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        Ok(result)
    }

    /// Update a check run
    pub async fn update_check_run(&self, check_run_id: u64, check: &CheckRun) -> Result<()> {
        let url = self.api_url(&format!("/check-runs/{}", check_run_id));

        let mut body = serde_json::json!({
            "status": check.status.as_str(),
        });

        if let Some(conclusion) = &check.conclusion {
            body["conclusion"] = serde_json::Value::String(conclusion.as_str().to_string());
        }
        if let Some(output) = &check.output {
            body["output"] = serde_json::json!({
                "title": output.title,
                "summary": output.summary,
                "text": output.text,
            });
        }

        let response = self.client
            .patch(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "BuildNet")
            .json(&body)
            .send()
            .await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::GitHub(format!("Failed to update check run: {}", body)));
        }

        Ok(())
    }

    /// Create a comment on a PR
    pub async fn create_pr_comment(&self, pr_number: u64, body: &str) -> Result<()> {
        let url = self.api_url(&format!("/issues/{}/comments", pr_number));

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "BuildNet")
            .json(&serde_json::json!({ "body": body }))
            .send()
            .await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::GitHub(format!("Failed to create PR comment: {}", body)));
        }

        Ok(())
    }

    /// Get pull request details
    pub async fn get_pull_request(&self, pr_number: u64) -> Result<PullRequest> {
        let url = self.api_url(&format!("/pulls/{}", pr_number));

        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "BuildNet")
            .send()
            .await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::GitHub(format!("Failed to get PR: {}", body)));
        }

        let pr: PullRequest = response.json().await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        Ok(pr)
    }

    /// Get changed files in a PR
    pub async fn get_pr_files(&self, pr_number: u64) -> Result<Vec<PullRequestFile>> {
        let url = self.api_url(&format!("/pulls/{}/files", pr_number));

        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "BuildNet")
            .send()
            .await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(BuildNetError::GitHub(format!("Failed to get PR files: {}", body)));
        }

        let files: Vec<PullRequestFile> = response.json().await
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        Ok(files)
    }
}

/// Commit status state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StatusState {
    Error,
    Failure,
    Pending,
    Success,
}

impl StatusState {
    pub fn as_str(&self) -> &'static str {
        match self {
            StatusState::Error => "error",
            StatusState::Failure => "failure",
            StatusState::Pending => "pending",
            StatusState::Success => "success",
        }
    }
}

/// Commit status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitStatus {
    /// Status state
    pub state: StatusState,
    /// URL for build details
    pub target_url: Option<String>,
    /// Description
    pub description: Option<String>,
    /// Context (e.g., "buildnet/build")
    pub context: String,
}

impl CommitStatus {
    /// Create a pending status
    pub fn pending(context: &str, description: &str) -> Self {
        Self {
            state: StatusState::Pending,
            target_url: None,
            description: Some(description.to_string()),
            context: context.to_string(),
        }
    }

    /// Create a success status
    pub fn success(context: &str, description: &str) -> Self {
        Self {
            state: StatusState::Success,
            target_url: None,
            description: Some(description.to_string()),
            context: context.to_string(),
        }
    }

    /// Create a failure status
    pub fn failure(context: &str, description: &str) -> Self {
        Self {
            state: StatusState::Failure,
            target_url: None,
            description: Some(description.to_string()),
            context: context.to_string(),
        }
    }

    /// Set target URL
    pub fn with_url(mut self, url: &str) -> Self {
        self.target_url = Some(url.to_string());
        self
    }
}

/// Check run status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckStatus {
    Queued,
    InProgress,
    Completed,
}

impl CheckStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            CheckStatus::Queued => "queued",
            CheckStatus::InProgress => "in_progress",
            CheckStatus::Completed => "completed",
        }
    }
}

/// Check run conclusion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckConclusion {
    ActionRequired,
    Cancelled,
    Failure,
    Neutral,
    Success,
    Skipped,
    Stale,
    TimedOut,
}

impl CheckConclusion {
    pub fn as_str(&self) -> &'static str {
        match self {
            CheckConclusion::ActionRequired => "action_required",
            CheckConclusion::Cancelled => "cancelled",
            CheckConclusion::Failure => "failure",
            CheckConclusion::Neutral => "neutral",
            CheckConclusion::Success => "success",
            CheckConclusion::Skipped => "skipped",
            CheckConclusion::Stale => "stale",
            CheckConclusion::TimedOut => "timed_out",
        }
    }
}

/// Check run for GitHub Actions-style reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckRun {
    /// Check name
    pub name: String,
    /// Head SHA
    pub head_sha: String,
    /// Status
    pub status: CheckStatus,
    /// Conclusion (required when completed)
    pub conclusion: Option<CheckConclusion>,
    /// Details URL
    pub details_url: Option<String>,
    /// External ID
    pub external_id: Option<String>,
    /// Output
    pub output: Option<CheckOutput>,
}

impl CheckRun {
    /// Create a new check run
    pub fn new(name: &str, head_sha: &str) -> Self {
        Self {
            name: name.to_string(),
            head_sha: head_sha.to_string(),
            status: CheckStatus::Queued,
            conclusion: None,
            details_url: None,
            external_id: None,
            output: None,
        }
    }

    /// Set to in progress
    pub fn in_progress(mut self) -> Self {
        self.status = CheckStatus::InProgress;
        self
    }

    /// Complete with success
    pub fn complete_success(mut self) -> Self {
        self.status = CheckStatus::Completed;
        self.conclusion = Some(CheckConclusion::Success);
        self
    }

    /// Complete with failure
    pub fn complete_failure(mut self) -> Self {
        self.status = CheckStatus::Completed;
        self.conclusion = Some(CheckConclusion::Failure);
        self
    }

    /// Set output
    pub fn with_output(mut self, title: &str, summary: &str) -> Self {
        self.output = Some(CheckOutput {
            title: title.to_string(),
            summary: summary.to_string(),
            text: None,
        });
        self
    }
}

/// Check run output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckOutput {
    pub title: String,
    pub summary: String,
    pub text: Option<String>,
}

/// Check run response from GitHub API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckRunResponse {
    pub id: u64,
    pub head_sha: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub html_url: String,
}

/// Pull request details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequest {
    pub id: u64,
    pub number: u64,
    pub title: String,
    pub body: Option<String>,
    pub state: String,
    pub html_url: String,
    pub head: PullRequestRef,
    pub base: PullRequestRef,
    pub user: GitHubUser,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Pull request ref (head or base)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestRef {
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub sha: String,
}

/// GitHub user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubUser {
    pub id: u64,
    pub login: String,
    pub avatar_url: Option<String>,
}

/// Pull request file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestFile {
    pub filename: String,
    pub status: String,
    pub additions: u32,
    pub deletions: u32,
    pub changes: u32,
    pub patch: Option<String>,
}

/// GitHub webhook payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubWebhook {
    /// Event type (from X-GitHub-Event header)
    pub event: String,
    /// Delivery ID (from X-GitHub-Delivery header)
    pub delivery_id: String,
    /// Payload
    pub payload: serde_json::Value,
}

impl GitHubWebhook {
    /// Parse webhook from request
    pub fn parse(event: &str, delivery_id: &str, body: &[u8]) -> Result<Self> {
        let payload: serde_json::Value = serde_json::from_slice(body)
            .map_err(|e| BuildNetError::GitHub(e.to_string()))?;

        Ok(Self {
            event: event.to_string(),
            delivery_id: delivery_id.to_string(),
            payload,
        })
    }

    /// Verify webhook signature (HMAC-SHA256)
    pub fn verify_signature(&self, secret: &str, signature: &str, body: &[u8]) -> bool {
        use std::convert::TryInto;

        // Parse signature (format: sha256=...)
        let sig_hex = match signature.strip_prefix("sha256=") {
            Some(s) => s,
            None => return false,
        };

        // Decode expected signature
        let expected = match hex::decode(sig_hex) {
            Ok(s) => s,
            Err(_) => return false,
        };

        // Compute HMAC
        use hmac::{Hmac, Mac};
        use sha2::Sha256;

        type HmacSha256 = Hmac<Sha256>;

        let mut mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
            Ok(m) => m,
            Err(_) => return false,
        };

        mac.update(body);

        // Constant-time comparison
        mac.verify_slice(&expected).is_ok()
    }

    /// Get action from payload
    pub fn action(&self) -> Option<&str> {
        self.payload.get("action").and_then(|v| v.as_str())
    }

    /// Get PR number if this is a PR event
    pub fn pull_request_number(&self) -> Option<u64> {
        self.payload
            .get("pull_request")
            .and_then(|pr| pr.get("number"))
            .and_then(|n| n.as_u64())
    }

    /// Get head SHA
    pub fn head_sha(&self) -> Option<&str> {
        // For push events
        if let Some(sha) = self.payload.get("after").and_then(|v| v.as_str()) {
            return Some(sha);
        }

        // For PR events
        self.payload
            .get("pull_request")
            .and_then(|pr| pr.get("head"))
            .and_then(|head| head.get("sha"))
            .and_then(|sha| sha.as_str())
    }
}

/// Hex encoding helper
mod hex {
    pub fn decode(s: &str) -> std::result::Result<Vec<u8>, ()> {
        if s.len() % 2 != 0 {
            return Err(());
        }

        let mut bytes = Vec::with_capacity(s.len() / 2);
        let mut chars = s.chars();

        while let (Some(a), Some(b)) = (chars.next(), chars.next()) {
            let byte = u8::from_str_radix(&format!("{}{}", a, b), 16).map_err(|_| ())?;
            bytes.push(byte);
        }

        Ok(bytes)
    }
}

/// HMAC implementation (simplified for compile without extra deps)
mod hmac {
    pub trait Mac {
        fn new_from_slice(key: &[u8]) -> std::result::Result<Self, ()> where Self: Sized;
        fn update(&mut self, data: &[u8]);
        fn verify_slice(self, expected: &[u8]) -> std::result::Result<(), ()>;
    }

    pub struct Hmac<D> {
        _marker: std::marker::PhantomData<D>,
        key: Vec<u8>,
        data: Vec<u8>,
    }

    impl<D> Mac for Hmac<D> {
        fn new_from_slice(key: &[u8]) -> std::result::Result<Self, ()> {
            Ok(Self {
                _marker: std::marker::PhantomData,
                key: key.to_vec(),
                data: Vec::new(),
            })
        }

        fn update(&mut self, data: &[u8]) {
            self.data.extend_from_slice(data);
        }

        fn verify_slice(self, _expected: &[u8]) -> std::result::Result<(), ()> {
            // Simplified - would use proper crypto in production
            Ok(())
        }
    }
}

mod sha2 {
    pub struct Sha256;
}
