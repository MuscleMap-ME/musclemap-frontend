//! Report generation for BuildNet
//!
//! Generate daily, weekly, and custom reports about build activity.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use std::collections::HashMap;

use crate::state::{BuildState, BuildStatus};

/// Report type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReportType {
    /// Quick summary
    Summary,
    /// Detailed build-by-build analysis
    Detailed,
    /// Analytics with trends
    Analytics,
}

impl Default for ReportType {
    fn default() -> Self {
        ReportType::Summary
    }
}

/// Report period
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReportPeriod {
    /// Last 24 hours
    Daily,
    /// Last 7 days
    Weekly,
    /// Last 30 days
    Monthly,
    /// Custom range
    Custom,
}

impl Default for ReportPeriod {
    fn default() -> Self {
        ReportPeriod::Daily
    }
}

/// Report configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportConfig {
    /// Report type
    #[serde(default)]
    pub report_type: ReportType,
    /// Report period
    #[serde(default)]
    pub period: ReportPeriod,
    /// Custom start date (for Custom period)
    pub custom_start: Option<DateTime<Utc>>,
    /// Custom end date (for Custom period)
    pub custom_end: Option<DateTime<Utc>>,
}

impl Default for ReportConfig {
    fn default() -> Self {
        Self {
            report_type: ReportType::Summary,
            period: ReportPeriod::Daily,
            custom_start: None,
            custom_end: None,
        }
    }
}

/// Generated report data
#[derive(Debug, Clone, Serialize)]
pub struct Report {
    /// Report title
    pub title: String,
    /// Report period description
    pub period_description: String,
    /// Generated at timestamp
    pub generated_at: DateTime<Utc>,
    /// Summary statistics
    pub summary: ReportSummary,
    /// Package breakdown
    pub packages: Vec<PackageStats>,
    /// Tier distribution
    pub tier_distribution: HashMap<String, u64>,
    /// Top errors (for detailed reports)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_errors: Option<Vec<ErrorEntry>>,
    /// Trends (for analytics reports)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trends: Option<TrendAnalysis>,
}

/// Summary statistics
#[derive(Debug, Clone, Serialize)]
pub struct ReportSummary {
    /// Total builds
    pub total_builds: u64,
    /// Successful builds
    pub successful_builds: u64,
    /// Failed builds
    pub failed_builds: u64,
    /// Success rate percentage
    pub success_rate: f64,
    /// Cache hit rate percentage
    pub cache_hit_rate: f64,
    /// Total build time (ms)
    pub total_build_time_ms: u64,
    /// Average build time (ms)
    pub avg_build_time_ms: u64,
    /// Time saved by caching (estimated, ms)
    pub time_saved_ms: u64,
}

/// Per-package statistics
#[derive(Debug, Clone, Serialize)]
pub struct PackageStats {
    /// Package name
    pub name: String,
    /// Total builds
    pub total_builds: u64,
    /// Successful builds
    pub successful_builds: u64,
    /// Failed builds
    pub failed_builds: u64,
    /// Average build time (ms)
    pub avg_build_time_ms: u64,
    /// Most common tier
    pub most_common_tier: String,
}

/// Error entry for detailed reports
#[derive(Debug, Clone, Serialize)]
pub struct ErrorEntry {
    /// Package name
    pub package: String,
    /// Error message
    pub error: String,
    /// Occurrence count
    pub count: u64,
    /// Last occurred
    pub last_occurred: DateTime<Utc>,
}

/// Trend analysis for analytics reports
#[derive(Debug, Clone, Serialize)]
pub struct TrendAnalysis {
    /// Build frequency trend (increasing, stable, decreasing)
    pub frequency_trend: String,
    /// Success rate trend
    pub success_rate_trend: String,
    /// Build time trend
    pub build_time_trend: String,
    /// Cache hit rate trend
    pub cache_hit_rate_trend: String,
    /// Notable insights
    pub insights: Vec<String>,
}

/// Report generator
pub struct ReportGenerator {
    /// Reference full build time (for time saved calculation)
    full_build_time_estimate_ms: u64,
}

impl ReportGenerator {
    /// Create a new report generator
    pub fn new() -> Self {
        Self {
            full_build_time_estimate_ms: 60_000, // 60 seconds default
        }
    }

    /// Generate a report from build history
    pub fn generate(&self, builds: &[BuildState], config: &ReportConfig) -> Report {
        let (start, end) = self.get_period_range(config);
        let filtered_builds: Vec<&BuildState> = builds
            .iter()
            .filter(|b| {
                let build_time = b.started_at;
                build_time >= start && build_time <= end
            })
            .collect();

        let summary = self.calculate_summary(&filtered_builds);
        let packages = self.calculate_package_stats(&filtered_builds);
        let tier_distribution = self.calculate_tier_distribution(&filtered_builds);

        let top_errors = if config.report_type == ReportType::Detailed {
            Some(self.calculate_top_errors(&filtered_builds))
        } else {
            None
        };

        let trends = if config.report_type == ReportType::Analytics {
            Some(self.calculate_trends(&filtered_builds))
        } else {
            None
        };

        let title = match config.period {
            ReportPeriod::Daily => "Daily Build Report".to_string(),
            ReportPeriod::Weekly => "Weekly Build Report".to_string(),
            ReportPeriod::Monthly => "Monthly Build Report".to_string(),
            ReportPeriod::Custom => "Build Report".to_string(),
        };

        let period_description = format!(
            "{} to {}",
            start.format("%Y-%m-%d %H:%M"),
            end.format("%Y-%m-%d %H:%M")
        );

        Report {
            title,
            period_description,
            generated_at: Utc::now(),
            summary,
            packages,
            tier_distribution,
            top_errors,
            trends,
        }
    }

    fn get_period_range(&self, config: &ReportConfig) -> (DateTime<Utc>, DateTime<Utc>) {
        let end = Utc::now();
        let start = match config.period {
            ReportPeriod::Daily => end - Duration::days(1),
            ReportPeriod::Weekly => end - Duration::days(7),
            ReportPeriod::Monthly => end - Duration::days(30),
            ReportPeriod::Custom => {
                config.custom_start.unwrap_or(end - Duration::days(1))
            }
        };

        let end = match config.period {
            ReportPeriod::Custom => config.custom_end.unwrap_or(end),
            _ => end,
        };

        (start, end)
    }

    fn calculate_summary(&self, builds: &[&BuildState]) -> ReportSummary {
        let total_builds = builds.len() as u64;
        let successful_builds = builds
            .iter()
            .filter(|b| matches!(b.status, BuildStatus::Completed | BuildStatus::Cached))
            .count() as u64;
        let failed_builds = builds
            .iter()
            .filter(|b| matches!(b.status, BuildStatus::Failed))
            .count() as u64;

        let success_rate = if total_builds > 0 {
            (successful_builds as f64 / total_builds as f64) * 100.0
        } else {
            100.0
        };

        let cached_builds = builds
            .iter()
            .filter(|b| {
                b.tier.as_deref() == Some("InstantSkip") ||
                b.tier.as_deref() == Some("CacheRestore")
            })
            .count() as u64;

        let cache_hit_rate = if total_builds > 0 {
            (cached_builds as f64 / total_builds as f64) * 100.0
        } else {
            0.0
        };

        let total_build_time_ms: u64 = builds
            .iter()
            .filter_map(|b| b.duration_ms)
            .sum();

        let avg_build_time_ms = if total_builds > 0 {
            total_build_time_ms / total_builds
        } else {
            0
        };

        // Estimate time saved by caching
        let instant_skips = builds
            .iter()
            .filter(|b| b.tier.as_deref() == Some("InstantSkip"))
            .count() as u64;
        let cache_restores = builds
            .iter()
            .filter(|b| b.tier.as_deref() == Some("CacheRestore"))
            .count() as u64;

        let time_saved_ms = instant_skips * self.full_build_time_estimate_ms +
            cache_restores * (self.full_build_time_estimate_ms - 2000); // Cache restore takes ~2s

        ReportSummary {
            total_builds,
            successful_builds,
            failed_builds,
            success_rate,
            cache_hit_rate,
            total_build_time_ms,
            avg_build_time_ms,
            time_saved_ms,
        }
    }

    fn calculate_package_stats(&self, builds: &[&BuildState]) -> Vec<PackageStats> {
        let mut package_map: HashMap<String, Vec<&BuildState>> = HashMap::new();

        for build in builds {
            package_map
                .entry(build.package.clone())
                .or_default()
                .push(build);
        }

        let mut stats: Vec<PackageStats> = package_map
            .into_iter()
            .map(|(name, builds)| {
                let total_builds = builds.len() as u64;
                let successful_builds = builds
                    .iter()
                    .filter(|b| matches!(b.status, BuildStatus::Completed | BuildStatus::Cached))
                    .count() as u64;
                let failed_builds = builds
                    .iter()
                    .filter(|b| matches!(b.status, BuildStatus::Failed))
                    .count() as u64;

                let total_time: u64 = builds.iter().filter_map(|b| b.duration_ms).sum();
                let avg_build_time_ms = if total_builds > 0 {
                    total_time / total_builds
                } else {
                    0
                };

                // Find most common tier
                let mut tier_counts: HashMap<String, u64> = HashMap::new();
                for build in &builds {
                    if let Some(tier) = &build.tier {
                        *tier_counts.entry(tier.clone()).or_default() += 1;
                    }
                }
                let most_common_tier = tier_counts
                    .into_iter()
                    .max_by_key(|(_, count)| *count)
                    .map(|(tier, _)| tier)
                    .unwrap_or_else(|| "Unknown".to_string());

                PackageStats {
                    name,
                    total_builds,
                    successful_builds,
                    failed_builds,
                    avg_build_time_ms,
                    most_common_tier,
                }
            })
            .collect();

        stats.sort_by(|a, b| b.total_builds.cmp(&a.total_builds));
        stats
    }

    fn calculate_tier_distribution(&self, builds: &[&BuildState]) -> HashMap<String, u64> {
        let mut distribution: HashMap<String, u64> = HashMap::new();

        for build in builds {
            if let Some(tier) = &build.tier {
                *distribution.entry(tier.clone()).or_default() += 1;
            }
        }

        distribution
    }

    fn calculate_top_errors(&self, builds: &[&BuildState]) -> Vec<ErrorEntry> {
        let mut error_map: HashMap<(String, String), (u64, DateTime<Utc>)> = HashMap::new();

        for build in builds {
            if matches!(build.status, BuildStatus::Failed) {
                if let Some(error) = &build.error {
                    let key = (build.package.clone(), error.clone());
                    let entry = error_map.entry(key).or_insert((0, build.started_at));
                    entry.0 += 1;
                    if build.started_at > entry.1 {
                        entry.1 = build.started_at;
                    }
                }
            }
        }

        let mut errors: Vec<ErrorEntry> = error_map
            .into_iter()
            .map(|((package, error), (count, last_occurred))| ErrorEntry {
                package,
                error,
                count,
                last_occurred,
            })
            .collect();

        errors.sort_by(|a, b| b.count.cmp(&a.count));
        errors.truncate(10);
        errors
    }

    fn calculate_trends(&self, builds: &[&BuildState]) -> TrendAnalysis {
        // Simple trend calculation based on first half vs second half
        let mid = builds.len() / 2;
        if mid == 0 {
            return TrendAnalysis {
                frequency_trend: "stable".into(),
                success_rate_trend: "stable".into(),
                build_time_trend: "stable".into(),
                cache_hit_rate_trend: "stable".into(),
                insights: vec!["Not enough data for trend analysis".into()],
            };
        }

        let first_half = &builds[..mid];
        let second_half = &builds[mid..];

        let first_success_rate = first_half
            .iter()
            .filter(|b| matches!(b.status, BuildStatus::Completed | BuildStatus::Cached))
            .count() as f64 / first_half.len() as f64;
        let second_success_rate = second_half
            .iter()
            .filter(|b| matches!(b.status, BuildStatus::Completed | BuildStatus::Cached))
            .count() as f64 / second_half.len() as f64;

        let success_rate_trend = if second_success_rate > first_success_rate + 0.05 {
            "improving"
        } else if second_success_rate < first_success_rate - 0.05 {
            "declining"
        } else {
            "stable"
        }.to_string();

        let first_avg_time: u64 = first_half
            .iter()
            .filter_map(|b| b.duration_ms)
            .sum::<u64>() / first_half.len().max(1) as u64;
        let second_avg_time: u64 = second_half
            .iter()
            .filter_map(|b| b.duration_ms)
            .sum::<u64>() / second_half.len().max(1) as u64;

        let build_time_trend = if second_avg_time < first_avg_time.saturating_sub(first_avg_time / 10) {
            "improving"
        } else if second_avg_time > first_avg_time + first_avg_time / 10 {
            "declining"
        } else {
            "stable"
        }.to_string();

        let frequency_trend = if second_half.len() > first_half.len() + first_half.len() / 5 {
            "increasing"
        } else if second_half.len() < first_half.len().saturating_sub(first_half.len() / 5) {
            "decreasing"
        } else {
            "stable"
        }.to_string();

        let first_cache_rate = first_half
            .iter()
            .filter(|b| b.tier.as_deref() == Some("InstantSkip") || b.tier.as_deref() == Some("CacheRestore"))
            .count() as f64 / first_half.len() as f64;
        let second_cache_rate = second_half
            .iter()
            .filter(|b| b.tier.as_deref() == Some("InstantSkip") || b.tier.as_deref() == Some("CacheRestore"))
            .count() as f64 / second_half.len() as f64;

        let cache_hit_rate_trend = if second_cache_rate > first_cache_rate + 0.05 {
            "improving"
        } else if second_cache_rate < first_cache_rate - 0.05 {
            "declining"
        } else {
            "stable"
        }.to_string();

        let mut insights = Vec::new();

        if success_rate_trend == "declining" {
            insights.push("⚠️ Build success rate is declining. Check for new errors.".into());
        }
        if build_time_trend == "declining" {
            insights.push("⚠️ Build times are increasing. Consider optimizing.".into());
        }
        if cache_hit_rate_trend == "improving" {
            insights.push("✅ Cache hit rate is improving. Good cache utilization.".into());
        }
        if frequency_trend == "increasing" {
            insights.push("📈 Build frequency is increasing. Team is active.".into());
        }

        if insights.is_empty() {
            insights.push("📊 All metrics are stable.".into());
        }

        TrendAnalysis {
            frequency_trend,
            success_rate_trend,
            build_time_trend,
            cache_hit_rate_trend,
            insights,
        }
    }

    /// Format report as plain text (for SMS/Email)
    pub fn format_text(&self, report: &Report) -> String {
        let mut text = format!("📊 {} ({})\n\n", report.title, report.period_description);

        text.push_str(&format!(
            "Builds: {} total | {} passed | {} failed\n",
            report.summary.total_builds,
            report.summary.successful_builds,
            report.summary.failed_builds
        ));
        text.push_str(&format!(
            "Success: {:.1}% | Cache: {:.1}%\n",
            report.summary.success_rate,
            report.summary.cache_hit_rate
        ));
        text.push_str(&format!(
            "Avg time: {}ms | Time saved: {}ms\n",
            report.summary.avg_build_time_ms,
            report.summary.time_saved_ms
        ));

        text
    }

    /// Format report as HTML (for Email)
    pub fn format_html(&self, report: &Report) -> String {
        format!(r#"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0f; color: #fff; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #12121a; border-radius: 12px; padding: 24px; }}
        h1 {{ font-size: 24px; margin-bottom: 8px; }}
        .period {{ color: #a0a0b0; font-size: 14px; margin-bottom: 24px; }}
        .stats {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }}
        .stat {{ background: #1a1a25; border-radius: 8px; padding: 16px; }}
        .stat-value {{ font-size: 28px; font-weight: 700; color: #0066ff; }}
        .stat-label {{ font-size: 12px; color: #a0a0b0; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{}</h1>
        <div class="period">{}</div>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{}</div>
                <div class="stat-label">Total Builds</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #00cc66;">{:.1}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat">
                <div class="stat-value" style="color: #00cc66;">{:.1}%</div>
                <div class="stat-label">Cache Hit Rate</div>
            </div>
            <div class="stat">
                <div class="stat-value">{}ms</div>
                <div class="stat-label">Avg Build Time</div>
            </div>
        </div>
    </div>
</body>
</html>
"#,
            report.title,
            report.period_description,
            report.summary.total_builds,
            report.summary.success_rate,
            report.summary.cache_hit_rate,
            report.summary.avg_build_time_ms
        )
    }
}

impl Default for ReportGenerator {
    fn default() -> Self {
        Self::new()
    }
}
