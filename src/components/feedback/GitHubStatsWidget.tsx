/**
 * GitHubStatsWidget Component
 *
 * Displays live GitHub repository statistics including stars, forks,
 * open issues, and contributors. Data is fetched from GitHub API.
 */

import { useState, useEffect } from 'react';
import { Star, GitFork, AlertCircle, Users, GitPullRequest, Eye } from 'lucide-react';

const GITHUB_REPO = 'musclemap/musclemap-frontend';
const CACHE_KEY = 'github-stats-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  contributors: number;
  openPRs: number;
}

interface CachedStats {
  data: GitHubStats;
  timestamp: number;
}

interface GitHubStatsWidgetProps {
  className?: string;
}

// Default stats to show while loading or if fetch fails
const defaultStats: GitHubStats = {
  stars: 0,
  forks: 0,
  openIssues: 0,
  watchers: 0,
  contributors: 0,
  openPRs: 0,
};

export function GitHubStatsWidget({ className = '' }: GitHubStatsWidgetProps) {
  const [stats, setStats] = useState<GitHubStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedStats = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            setStats(parsed.data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Cache read failed, continue to fetch
      }

      try {
        // Fetch repo stats
        const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`);

        if (!repoResponse.ok) {
          if (repoResponse.status === 404) {
            // Repository doesn't exist yet, show placeholders
            setStats(defaultStats);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch repository stats');
        }

        const repoData = await repoResponse.json();

        // Fetch contributors count (separate endpoint)
        let contributorsCount = 0;
        try {
          const contributorsResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=1&anon=true`,
            { method: 'HEAD' }
          );
          const linkHeader = contributorsResponse.headers.get('Link');
          if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            contributorsCount = match ? parseInt(match[1], 10) : 1;
          } else {
            contributorsCount = 1;
          }
        } catch {
          contributorsCount = 0;
        }

        // Fetch open PRs count
        let openPRsCount = 0;
        try {
          const prsResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=1`,
            { method: 'HEAD' }
          );
          const linkHeader = prsResponse.headers.get('Link');
          if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            openPRsCount = match ? parseInt(match[1], 10) : 1;
          }
        } catch {
          openPRsCount = 0;
        }

        const newStats: GitHubStats = {
          stars: repoData.stargazers_count || 0,
          forks: repoData.forks_count || 0,
          openIssues: repoData.open_issues_count || 0,
          watchers: repoData.subscribers_count || 0,
          contributors: contributorsCount,
          openPRs: openPRsCount,
        };

        // Cache the results
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              data: newStats,
              timestamp: Date.now(),
            })
          );
        } catch {
          // Cache write failed, continue anyway
        }

        setStats(newStats);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch GitHub stats:', err);
        setError('Unable to load live stats');
        // Keep showing cached or default stats
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statItems = [
    {
      icon: Star,
      label: 'Stars',
      value: stats.stars,
      color: 'text-yellow-400',
      href: `https://github.com/${GITHUB_REPO}/stargazers`,
    },
    {
      icon: GitFork,
      label: 'Forks',
      value: stats.forks,
      color: 'text-blue-400',
      href: `https://github.com/${GITHUB_REPO}/network/members`,
    },
    {
      icon: Users,
      label: 'Contributors',
      value: stats.contributors,
      color: 'text-green-400',
      href: `https://github.com/${GITHUB_REPO}/graphs/contributors`,
    },
    {
      icon: AlertCircle,
      label: 'Open Issues',
      value: stats.openIssues,
      color: 'text-orange-400',
      href: `https://github.com/${GITHUB_REPO}/issues`,
    },
    {
      icon: GitPullRequest,
      label: 'Open PRs',
      value: stats.openPRs,
      color: 'text-purple-400',
      href: `https://github.com/${GITHUB_REPO}/pulls`,
    },
    {
      icon: Eye,
      label: 'Watchers',
      value: stats.watchers,
      color: 'text-cyan-400',
      href: `https://github.com/${GITHUB_REPO}/watchers`,
    },
  ];

  return (
    <div className={className}>
      <div className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Repository Stats</h3>
          {error && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
            >
              <item.icon
                className={`w-6 h-6 ${item.color} mb-2 group-hover:scale-110 transition-transform`}
              />
              <span className="text-2xl font-bold text-white mb-1">
                {loading ? (
                  <span className="animate-pulse bg-white/20 rounded w-8 h-6 inline-block" />
                ) : (
                  formatNumber(item.value)
                )}
              </span>
              <span className="text-xs text-gray-400">{item.label}</span>
            </a>
          ))}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Stats update every 5 minutes • Live from GitHub API
        </p>
      </div>
    </div>
  );
}

/**
 * Formats a number with K/M suffixes for large values
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export default GitHubStatsWidget;
