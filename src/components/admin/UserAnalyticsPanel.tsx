/**
 * User Analytics Panel Component
 *
 * Comprehensive user analytics dashboard for the Empire control panel:
 * - New users timeline with time-windowed filtering
 * - Individual user deep-dive with activity timeline
 * - Feature popularity rankings
 * - Behavioral segments with member counts
 * - Cohort retention analysis heatmap
 *
 * Designed for scale: efficient keyset pagination, pre-computed aggregations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronRight,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api';

const TIME_RANGES = [
  { id: '24h', label: 'Today', days: 1 },
  { id: '7d', label: '7 Days', days: 7 },
  { id: '30d', label: '30 Days', days: 30 },
  { id: '90d', label: '90 Days', days: 90 },
];

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'New Users', icon: UserPlus },
  { id: 'features', label: 'Features', icon: Zap },
  { id: 'segments', label: 'Segments', icon: Users },
  { id: 'cohorts', label: 'Cohorts', icon: Calendar },
];

const CATEGORY_COLORS = {
  fitness: '#10b981',
  social: '#3b82f6',
  economy: '#f59e0b',
  competition: '#ef4444',
  progression: '#8b5cf6',
  profile: '#ec4899',
  messaging: '#06b6d4',
  notifications: '#f97316',
  onboarding: '#84cc16',
  analytics: '#6366f1',
  other: '#6b7280',
};

const _TREND_COLORS = {
  rising: '#10b981',
  stable: '#6b7280',
  declining: '#f59e0b',
  churned: '#ef4444',
  new: '#3b82f6',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(num: number, decimals = 0): string {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(decimals);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function getEngagementColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

// ============================================
// TYPES
// ============================================

interface DashboardData {
  summary: {
    totalUsers: number;
    newUsers24h: number;
    newUsers7d: number;
    activeUsers30d: number;
    featureCount: number;
  };
  topSegments: Array<{ name: string; memberCount: number }>;
  signupTrend: Array<{ date: string; count: number }>;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  archetypeId: string | null;
  totalXp: number;
  rank: string;
  wealthTier: number;
  engagementScore: number;
  workouts30d: number;
  lastActivityAt: string;
}

interface UserDetail {
  user: UserData & { roles: string[]; flags: Record<string, boolean> };
  activity: {
    totalSessions: number;
    sessions30d: number;
    totalWorkouts: number;
    workouts30d: number;
    totalFeatureInteractions: number;
    featureInteractions30d: number;
    uniqueFeaturesUsed: number;
    firstActivityAt: string | null;
    lastActivityAt: string | null;
    daysActiveTotal: number;
    daysActive30d: number;
    engagementScore: number;
    engagementTrend: string;
  } | null;
  featureUsage: Array<{
    featureId: string;
    featureCategory: string;
    featureName: string;
    useCount: number;
    lastUsedAt: string;
  }>;
  segments: Array<{ id: string; name: string; score: number; joinedAt: string }>;
  credits: { balance: number; lifetimeEarned: number; lifetimeSpent: number };
  streaks: Array<{ type: string; current: number; longest: number }>;
  cohort: { date: string; size: number; retainedD7: number; retainedD30: number } | null;
}

interface FeatureData {
  id: string;
  category: string;
  name: string;
  totalUses: number;
  uniqueUsers: number;
  uses24h: number;
  uses7d: number;
  uses30d: number;
  users30d: number;
}

interface SegmentData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  memberCount: number;
}

interface CohortData {
  date: string;
  size: number;
  retention: {
    d1: number;
    d7: number;
    d14: number;
    d30: number;
  };
  adoption: {
    workout: number;
    social: number;
    economy: number;
  };
}

// ============================================
// SUBCOMPONENTS
// ============================================

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = '#8b5cf6',
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  subtitle?: string;
}) {
  return (
    <GlassSurface className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center mt-2 text-sm">
          {trend === 'up' ? (
            <TrendingUp size={14} className="text-green-400 mr-1" />
          ) : trend === 'down' ? (
            <TrendingDown size={14} className="text-red-400 mr-1" />
          ) : null}
          <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}>
            {trendValue}
          </span>
        </div>
      )}
    </GlassSurface>
  );
}

function UserCard({ user, onClick }: { user: UserData; onClick: () => void }) {
  return (
    <GlassSurface
      className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium truncate">{user.displayName || user.username}</p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              {user.rank}
            </span>
          </div>
          <p className="text-sm text-gray-400 truncate">@{user.username}</p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${getEngagementColor(user.engagementScore)}`}>
            {user.engagementScore}
          </div>
          <p className="text-xs text-gray-500">{getTimeAgo(user.createdAt)}</p>
        </div>
        <ChevronRight size={16} className="text-gray-500" />
      </div>
    </GlassSurface>
  );
}

function FeatureRow({ feature }: { feature: FeatureData }) {
  const categoryColor = CATEGORY_COLORS[feature.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other;

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: categoryColor }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{feature.name}</p>
        <p className="text-xs text-gray-500 capitalize">{feature.category}</p>
      </div>
      <div className="text-right">
        <p className="text-white font-medium">{formatNumber(feature.uses30d)}</p>
        <p className="text-xs text-gray-500">uses/30d</p>
      </div>
      <div className="text-right w-16">
        <p className="text-gray-400">{formatNumber(feature.users30d)}</p>
        <p className="text-xs text-gray-500">users</p>
      </div>
    </div>
  );
}

function SegmentCard({ segment, onClick }: { segment: SegmentData; onClick: () => void }) {
  return (
    <GlassSurface
      className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${segment.color || '#6b7280'}20` }}
        >
          <Users size={20} style={{ color: segment.color || '#6b7280' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{segment.name}</p>
          {segment.description && (
            <p className="text-xs text-gray-500 truncate">{segment.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-white font-bold">{formatNumber(segment.memberCount)}</p>
          <p className="text-xs text-gray-500">members</p>
        </div>
      </div>
    </GlassSurface>
  );
}

function CohortHeatmap({ cohorts }: { cohorts: CohortData[] }) {
  if (cohorts.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No cohort data available yet
      </div>
    );
  }

  const getRetentionColor = (pct: number) => {
    if (pct >= 50) return 'bg-green-500';
    if (pct >= 30) return 'bg-green-600';
    if (pct >= 20) return 'bg-yellow-600';
    if (pct >= 10) return 'bg-orange-600';
    return 'bg-red-600';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left">
            <th className="py-2 px-2">Cohort</th>
            <th className="py-2 px-2 text-center">Size</th>
            <th className="py-2 px-2 text-center">D1</th>
            <th className="py-2 px-2 text-center">D7</th>
            <th className="py-2 px-2 text-center">D14</th>
            <th className="py-2 px-2 text-center">D30</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.slice(0, 14).map((cohort) => (
            <tr key={cohort.date} className="border-t border-white/5">
              <td className="py-2 px-2 text-white">{formatDate(cohort.date)}</td>
              <td className="py-2 px-2 text-center text-gray-400">{cohort.size}</td>
              <td className="py-2 px-2">
                <div
                  className={`mx-auto w-12 h-6 rounded flex items-center justify-center text-xs text-white ${getRetentionColor(cohort.retention.d1)}`}
                >
                  {cohort.retention.d1}%
                </div>
              </td>
              <td className="py-2 px-2">
                <div
                  className={`mx-auto w-12 h-6 rounded flex items-center justify-center text-xs text-white ${getRetentionColor(cohort.retention.d7)}`}
                >
                  {cohort.retention.d7}%
                </div>
              </td>
              <td className="py-2 px-2">
                <div
                  className={`mx-auto w-12 h-6 rounded flex items-center justify-center text-xs text-white ${getRetentionColor(cohort.retention.d14)}`}
                >
                  {cohort.retention.d14}%
                </div>
              </td>
              <td className="py-2 px-2">
                <div
                  className={`mx-auto w-12 h-6 rounded flex items-center justify-center text-xs text-white ${getRetentionColor(cohort.retention.d30)}`}
                >
                  {cohort.retention.d30}%
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDetailDrawer({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserDetail() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/admin/analytics/users/${userId}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load user');
        }
      } catch {
        setError('Failed to load user details');
      } finally {
        setLoading(false);
      }
    }
    fetchUserDetail();
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-gray-900 border-l border-white/10 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* User Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {data.user.avatarUrl ? (
                    <img
                      src={data.user.avatarUrl}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    data.user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {data.user.displayName || data.user.username}
                  </h3>
                  <p className="text-gray-400">@{data.user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {data.user.rank}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                      Tier {data.user.wealthTier}
                    </span>
                    {data.user.roles.includes('admin') && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              {data.activity && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <GlassSurface className="p-3 text-center">
                    <p className="text-2xl font-bold text-white">{data.activity.engagementScore}</p>
                    <p className="text-xs text-gray-400">Engagement</p>
                  </GlassSurface>
                  <GlassSurface className="p-3 text-center">
                    <p className="text-2xl font-bold text-white">{data.activity.workouts30d}</p>
                    <p className="text-xs text-gray-400">Workouts/30d</p>
                  </GlassSurface>
                  <GlassSurface className="p-3 text-center">
                    <p className="text-2xl font-bold text-white">{data.activity.daysActive30d}</p>
                    <p className="text-xs text-gray-400">Days Active</p>
                  </GlassSurface>
                  <GlassSurface className="p-3 text-center">
                    <p className="text-2xl font-bold text-white">{data.activity.uniqueFeaturesUsed}</p>
                    <p className="text-xs text-gray-400">Features Used</p>
                  </GlassSurface>
                </div>
              )}

              {/* Segments */}
              {data.segments.length > 0 && (
                <GlassSurface className="p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Segments</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.segments.map((seg) => (
                      <span
                        key={seg.id}
                        className="px-3 py-1 rounded-full text-sm bg-white/10 text-white"
                      >
                        {seg.name}
                      </span>
                    ))}
                  </div>
                </GlassSurface>
              )}

              {/* Credits */}
              <GlassSurface className="p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Economy</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-lg font-bold text-white">{formatNumber(data.credits.balance)}</p>
                    <p className="text-xs text-gray-500">Balance</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-400">{formatNumber(data.credits.lifetimeEarned)}</p>
                    <p className="text-xs text-gray-500">Earned</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">{formatNumber(data.credits.lifetimeSpent)}</p>
                    <p className="text-xs text-gray-500">Spent</p>
                  </div>
                </div>
              </GlassSurface>

              {/* Top Features */}
              {data.featureUsage.length > 0 && (
                <GlassSurface className="p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Top Features Used</h4>
                  <div className="space-y-2">
                    {data.featureUsage.slice(0, 5).map((f) => (
                      <div key={f.featureId} className="flex items-center justify-between">
                        <span className="text-white">{f.featureName}</span>
                        <span className="text-gray-400">{f.useCount} uses</span>
                      </div>
                    ))}
                  </div>
                </GlassSurface>
              )}

              {/* Metadata */}
              <GlassSurface className="p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Account Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID</span>
                    <span className="text-white font-mono text-xs">{data.user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white">{data.user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Joined</span>
                    <span className="text-white">{formatDateTime(data.user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total XP</span>
                    <span className="text-white">{formatNumber(data.user.totalXp)}</span>
                  </div>
                  {data.activity?.lastActivityAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Active</span>
                      <span className="text-white">{getTimeAgo(data.activity.lastActivityAt)}</span>
                    </div>
                  )}
                </div>
              </GlassSurface>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function UserAnalyticsPanel() {
  const [activeView, setActiveView] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Users data
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersCursor, setUsersCursor] = useState<string | null>(null);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Features data
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [featureCategory, _setFeatureCategory] = useState<string | null>(null);

  // Segments data
  const [segments, setSegments] = useState<SegmentData[]>([]);

  // Cohorts data
  const [cohorts, setCohorts] = useState<CohortData[]>([]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/analytics/dashboard`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
      } else {
        setError(json.error || 'Failed to load dashboard');
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch new users
  const fetchUsers = useCallback(async (reset = true) => {
    try {
      if (reset) setLoading(true);
      const params = new URLSearchParams({
        timeRange,
        limit: '20',
      });
      if (!reset && usersCursor) {
        params.set('cursor', usersCursor);
      }

      const res = await fetch(`${API_BASE}/admin/analytics/users/new?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        if (reset) {
          setUsers(json.data.users);
        } else {
          setUsers((prev) => [...prev, ...json.data.users]);
        }
        setUsersCursor(json.data.pagination.nextCursor);
        setUsersHasMore(json.data.pagination.hasNextPage);
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [timeRange, usersCursor]);

  // Fetch features
  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ timeRange });
      if (featureCategory) {
        params.set('category', featureCategory);
      }

      const res = await fetch(`${API_BASE}/admin/analytics/features?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setFeatures(json.data.features);
      }
    } catch {
      setError('Failed to load features');
    } finally {
      setLoading(false);
    }
  }, [timeRange, featureCategory]);

  // Fetch segments
  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/analytics/segments`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setSegments(json.data.segments);
      }
    } catch {
      setError('Failed to load segments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cohorts
  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/analytics/cohorts`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setCohorts(json.data.cohorts);
      }
    } catch {
      setError('Failed to load cohorts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data based on active view
  useEffect(() => {
    setError(null);
    switch (activeView) {
      case 'dashboard':
        fetchDashboard();
        break;
      case 'users':
        fetchUsers(true);
        break;
      case 'features':
        fetchFeatures();
        break;
      case 'segments':
        fetchSegments();
        break;
      case 'cohorts':
        fetchCohorts();
        break;
    }
  }, [activeView, timeRange, featureCategory, fetchDashboard, fetchUsers, fetchFeatures, fetchSegments, fetchCohorts]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/admin/analytics/recalculate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mvs' }),
      });
      // Reload current view
      switch (activeView) {
        case 'dashboard':
          fetchDashboard();
          break;
        case 'users':
          fetchUsers(true);
          break;
        case 'features':
          fetchFeatures();
          break;
        case 'segments':
          fetchSegments();
          break;
        case 'cohorts':
          fetchCohorts();
          break;
      }
    } catch {
      setError('Failed to refresh');
    }
  }, [activeView, fetchDashboard, fetchUsers, fetchFeatures, fetchSegments, fetchCohorts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">User Analytics</h2>
          <p className="text-gray-400 text-sm">Track users, features, and behavior patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === view.id
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <view.icon size={16} />
            {view.label}
          </button>
        ))}
      </div>

      {/* Time Range Filter (for relevant views) */}
      {['users', 'features'].includes(activeView) && (
        <div className="flex gap-2">
          {TIME_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                timeRange === range.id
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <GlassSurface className="p-4 border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        </GlassSurface>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="text-purple-400 animate-spin" />
        </div>
      )}

      {/* Dashboard View */}
      {!loading && activeView === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={formatNumber(dashboardData.summary.totalUsers)}
              icon={Users}
              color="#8b5cf6"
            />
            <StatCard
              title="New Today"
              value={formatNumber(dashboardData.summary.newUsers24h)}
              icon={UserPlus}
              color="#10b981"
              trend="up"
              trendValue={`${dashboardData.summary.newUsers7d} this week`}
            />
            <StatCard
              title="Active (30d)"
              value={formatNumber(dashboardData.summary.activeUsers30d)}
              icon={Activity}
              color="#3b82f6"
            />
            <StatCard
              title="Features"
              value={dashboardData.summary.featureCount}
              icon={Zap}
              color="#f59e0b"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Signup Trend Chart */}
            <GlassSurface className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Signup Trend (7 days)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...dashboardData.signupTrend].reverse()}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                      labelFormatter={formatDate}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      fill="url(#signupGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassSurface>

            {/* Top Segments */}
            <GlassSurface className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Top Segments</h3>
              <div className="space-y-3">
                {dashboardData.topSegments.map((seg, i) => (
                  <div key={seg.name} className="flex items-center gap-3">
                    <div className="w-6 text-center text-gray-500 text-sm">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white">{seg.name}</span>
                        <span className="text-gray-400">{formatNumber(seg.memberCount)}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full mt-1">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (seg.memberCount / dashboardData.summary.totalUsers) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassSurface>
          </div>
        </div>
      )}

      {/* Users View */}
      {!loading && activeView === 'users' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            Showing new signups from the last {TIME_RANGES.find((r) => r.id === timeRange)?.label.toLowerCase()}
          </div>
          <div className="space-y-2">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onClick={() => setSelectedUserId(user.id)}
              />
            ))}
          </div>
          {usersHasMore && (
            <button
              onClick={() => fetchUsers(false)}
              className="w-full py-3 text-center text-purple-400 hover:text-purple-300 transition-colors"
            >
              Load More
            </button>
          )}
          {users.length === 0 && (
            <div className="text-center text-gray-400 py-8">No users found in this time range</div>
          )}
        </div>
      )}

      {/* Features View */}
      {!loading && activeView === 'features' && (
        <div className="space-y-4">
          <GlassSurface className="divide-y divide-white/5">
            {features.map((feature) => (
              <FeatureRow key={feature.id} feature={feature} />
            ))}
            {features.length === 0 && (
              <div className="text-center text-gray-400 py-8">No feature data available</div>
            )}
          </GlassSurface>
        </div>
      )}

      {/* Segments View */}
      {!loading && activeView === 'segments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onClick={() => {
                // Could navigate to segment members view
              }}
            />
          ))}
          {segments.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              No segments configured yet
            </div>
          )}
        </div>
      )}

      {/* Cohorts View */}
      {!loading && activeView === 'cohorts' && (
        <GlassSurface className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Cohort Retention Matrix</h3>
          <CohortHeatmap cohorts={cohorts} />
        </GlassSurface>
      )}

      {/* User Detail Drawer */}
      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
