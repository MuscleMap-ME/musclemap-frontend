//! External Integrations
//!
//! GitHub, CI/CD, and other external service integrations.

pub mod github;
pub mod musclemap;

pub use github::{GitHubClient, GitHubWebhook, PullRequest, CommitStatus};
pub use musclemap::{MuscleMapClient, DeploymentNotification};
