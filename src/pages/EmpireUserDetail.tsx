/**
 * Empire User Detail - Admin view of individual user profiles
 *
 * Displays comprehensive user data including:
 * - Basic info (username, email, avatar)
 * - Activity timeline
 * - Feature usage
 * - Economy stats (credits, transactions)
 * - Admin actions (ban, gift, message)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import GlassSurface from '../components/glass/GlassSurface';
import {
  ArrowLeft,
  Award,
  Ban,
  Calendar,
  ChevronRight,
  Clock,
  Coins,
  Crown,
  Gift,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Shield,
  Star,
  Target,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Zap,
} from 'lucide-react';

interface UserDetails {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  current_archetype_id: string | null;
  total_xp: number;
  current_rank: string;
  wealth_tier: number;
  roles: string;
  flags: string;
  status?: string;
  credit_balance?: number;
  level?: number;
}

interface ActivityEvent {
  id: string;
  feature_id: string;
  feature_category: string;
  action: string;
  metadata?: string;
  duration_ms: number;
  created_at: string;
}

interface UserAnalytics {
  user: UserDetails;
  activity_summary: {
    total_actions_7d: number;
    total_actions_30d: number;
    active_days_7d: number;
    active_days_30d: number;
    avg_session_duration_ms: number;
  };
  top_features: Array<{
    feature_id: string;
    feature_category: string;
    action_count: number;
    total_duration_ms: number;
  }>;
  recent_activity: ActivityEvent[];
}

export default function EmpireUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserAnalytics | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState(100);

  const getAuthHeader = useCallback(() => {
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/analytics/users/${userId}`, {
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await res.json();
      setUserData(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [userId, getAuthHeader]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleAction = async (action: string) => {
    if (!userId) return;

    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin-control/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        // Refresh user data
        await fetchUserData();
      } else {
        const data = await res.json();
        alert(data.error?.message || `Failed to ${action} user`);
      }
    } catch {
      alert(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGiftCredits = async () => {
    if (!userId || !giftAmount) return;

    setActionLoading('gift');
    try {
      const res = await fetch('/api/owner/gift-credits', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          amount: giftAmount,
          reason: 'Admin gift from Empire Control',
        }),
      });

      if (res.ok) {
        setGiftModalOpen(false);
        await fetchUserData();
        alert(`Successfully gifted ${giftAmount} credits!`);
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Failed to gift credits');
      }
    } catch {
      alert('Failed to gift credits');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getWealthTierColor = (tier: number) => {
    const colors = [
      'text-gray-400', // 0 - Broke
      'text-amber-700', // 1 - Bronze
      'text-gray-300', // 2 - Silver
      'text-yellow-400', // 3 - Gold
      'text-cyan-300', // 4 - Platinum
      'text-blue-300', // 5 - Diamond
      'text-purple-500', // 6 - Obsidian
    ];
    return colors[tier] || colors[0];
  };

  const getWealthTierName = (tier: number) => {
    const names = ['Broke', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Obsidian'];
    return names[tier] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <span className="text-lg">Loading user data...</span>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/empire"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Empire
          </Link>
          <GlassSurface className="p-8 text-center">
            <UserX className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">User Not Found</h2>
            <p className="text-gray-400">{error || 'Unable to load user data'}</p>
          </GlassSurface>
        </div>
      </div>
    );
  }

  const { user, activity_summary, top_features, recent_activity } = userData;
  const isBanned = user.status === 'banned';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/empire"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Empire
          </Link>
          <button
            onClick={fetchUserData}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* User Profile Header */}
        <GlassSurface className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-3xl font-bold">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.username?.charAt(0).toUpperCase() || '?'
                )}
              </div>

              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold">{user.display_name || user.username}</h1>
                  {isBanned && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                      <Ban className="w-3 h-3" />
                      Banned
                    </span>
                  )}
                  {user.roles?.includes('admin') && (
                    <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-gray-400">@{user.username}</p>
                <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </p>
                <p className="text-gray-500 text-sm flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Joined {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGiftModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Gift className="w-4 h-4" />
                Gift Credits
              </button>
              <button
                onClick={() => navigate(`/messages?user=${user.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>
              {isBanned ? (
                <button
                  onClick={() => handleAction('unban')}
                  disabled={actionLoading === 'unban'}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {actionLoading === 'unban' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  Unban
                </button>
              ) : (
                <button
                  onClick={() => handleAction('ban')}
                  disabled={actionLoading === 'ban'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  {actionLoading === 'ban' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Ban
                </button>
              )}
            </div>
          </div>
        </GlassSurface>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {/* XP & Level */}
          <GlassSurface className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-500/20 rounded-lg">
                <Star className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total XP</p>
                <p className="text-xl font-bold">{(user.total_xp || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {user.current_rank || 'Unranked'}
                </p>
              </div>
            </div>
          </GlassSurface>

          {/* Credits */}
          <GlassSurface className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Coins className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Credits</p>
                <p className="text-xl font-bold">{(user.credit_balance || 0).toLocaleString()}</p>
                <p className={`text-xs ${getWealthTierColor(user.wealth_tier)}`}>
                  {getWealthTierName(user.wealth_tier)}
                </p>
              </div>
            </div>
          </GlassSurface>

          {/* Activity (7d) */}
          <GlassSurface className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Actions (7d)</p>
                <p className="text-xl font-bold">{activity_summary?.total_actions_7d || 0}</p>
                <p className="text-xs text-gray-500">
                  {activity_summary?.active_days_7d || 0} active days
                </p>
              </div>
            </div>
          </GlassSurface>

          {/* Avg Session */}
          <GlassSurface className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Session</p>
                <p className="text-xl font-bold">
                  {formatDuration(activity_summary?.avg_session_duration_ms || 0)}
                </p>
                <p className="text-xs text-gray-500">per session</p>
              </div>
            </div>
          </GlassSurface>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Features */}
          <GlassSurface className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Top Features Used
            </h3>
            {top_features && top_features.length > 0 ? (
              <div className="space-y-3">
                {top_features.slice(0, 8).map((feature, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{feature.feature_id}</p>
                        <p className="text-xs text-gray-400">{feature.feature_category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{feature.action_count}</p>
                      <p className="text-xs text-gray-400">
                        {formatDuration(feature.total_duration_ms)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No feature usage data</p>
            )}
          </GlassSurface>

          {/* Recent Activity */}
          <GlassSurface className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" />
              Recent Activity
            </h3>
            {recent_activity && recent_activity.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recent_activity.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded-lg bg-white/5"
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Target className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {event.feature_id} - {event.action}
                      </p>
                      <p className="text-xs text-gray-400">{event.feature_category}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(event.created_at)} ({formatDuration(event.duration_ms)})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No recent activity</p>
            )}
          </GlassSurface>
        </div>

        {/* Gift Modal */}
        {giftModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <GlassSurface className="p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-400" />
                Gift Credits to {user.username}
              </h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <input
                  type="number"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-lg"
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex gap-3">
                {[100, 500, 1000, 5000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setGiftAmount(amount)}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      giftAmount === amount
                        ? 'bg-green-600 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setGiftModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGiftCredits}
                  disabled={actionLoading === 'gift' || giftAmount < 1}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === 'gift' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Gift {giftAmount} Credits
                    </>
                  )}
                </button>
              </div>
            </GlassSurface>
          </div>
        )}
      </div>
    </div>
  );
}
