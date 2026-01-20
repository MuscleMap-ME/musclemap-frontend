/**
 * Empire Control - Master Admin Panel
 *
 * The ultimate control center for the MuscleMap empire, integrating:
 * - System metrics and monitoring dashboards
 * - Community management and messaging
 * - Owner avatar with unlimited powers
 * - User and resource management
 * - Slack integration
 * - Real-time activity feeds
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlassSurface from '../components/glass/GlassSurface';
import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  Bell,
  Bug,
  CheckCircle,
  ChevronRight,
  Clock,
  Coins,
  Crown,
  Flame,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Infinity,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Play,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  Slack,
  Star,
  Target,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
  TrendingUp,
  ExternalLink,
  Database,
  Calendar,
  FileCode,
  Rocket,
  AlertTriangle,
  Lock,
  ToggleLeft,
  FileSearch,
  Archive,
  BookOpen,
  Eye,
  Terminal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Lazy load heavy components (available for future use)
const _ActivityFeed = lazy(() => import('../components/community/ActivityFeed'));
const ServerControl = lazy(() => import('../components/admin/ServerControl'));
const DatabasePanel = lazy(() => import('../components/admin/DatabasePanel'));
const SchedulerPanel = lazy(() => import('../components/admin/SchedulerPanel'));
const EnvPanel = lazy(() => import('../components/admin/EnvPanel'));
const DeployPanel = lazy(() => import('../components/admin/DeployPanel'));
const MetricsPanel = lazy(() => import('../components/admin/MetricsPanel'));
const AlertsPanel = lazy(() => import('../components/admin/AlertsPanel'));
const SecurityPanel = lazy(() => import('../components/admin/SecurityPanel'));
const FeatureFlagsPanel = lazy(() => import('../components/admin/FeatureFlagsPanel'));
const LogsPanel = lazy(() => import('../components/admin/LogsPanel'));
const BackupPanel = lazy(() => import('../components/admin/BackupPanel'));
const MarkdownEditor = lazy(() => import('../components/admin/MarkdownEditor'));
const UserAnalyticsPanel = lazy(() => import('../components/admin/UserAnalyticsPanel'));
const BuildDaemonPanel = lazy(() => import('../components/admin/BuildDaemonPanel'));

// ============================================
// CONSTANTS
// ============================================

const OWNER_POWERS = [
  { id: 'unlimited_credits', name: 'Unlimited Credits', icon: Infinity, color: '#fbbf24' },
  { id: 'gift_credits', name: 'Gift Credits', icon: Gift, color: '#10b981' },
  { id: 'ban_user', name: 'Ban Users', icon: Shield, color: '#ef4444' },
  { id: 'grant_achievements', name: 'Grant Achievements', icon: Award, color: '#8b5cf6' },
  { id: 'broadcast', name: 'Broadcast Message', icon: MessageCircle, color: '#06b6d4' },
  { id: 'system_override', name: 'System Override', icon: Zap, color: '#f59e0b' },
];

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'server', label: 'Server Control', icon: Server },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'scheduler', label: 'Scheduler', icon: Calendar },
  { id: 'env', label: 'Environment', icon: FileCode },
  { id: 'deploy', label: 'Deployments', icon: Rocket, link: '/empire/deploy' },
  { id: 'build-daemon', label: 'Build Daemon', icon: Zap },
  { id: 'commands', label: 'Command Center', icon: Terminal, link: '/empire/commands' },
  { id: 'realtime-metrics', label: 'Real-time Metrics', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'feature-flags', label: 'Feature Flags', icon: ToggleLeft },
  { id: 'logs', label: 'Log Analysis', icon: FileSearch },
  { id: 'backup', label: 'Backup & Recovery', icon: Archive },
  { id: 'docs', label: 'Documentation', icon: BookOpen },
  { id: 'feedback', label: 'Feedback Queue', icon: MessageSquare },
  { id: 'bug-tracker', label: 'Bug Tracker', icon: Bug },
  { id: 'user-analytics', label: 'User Analytics', icon: UserPlus },
  { id: 'analytics', label: 'GA Analytics', icon: TrendingUp },
  { id: 'metrics', label: 'System Metrics', icon: BarChart3 },
  { id: 'scorecard', label: 'Test Scorecard', icon: Target, link: '/empire/scorecard' },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'community', label: 'Community', icon: Globe },
  { id: 'messages', label: 'Messages', icon: Mail },
  { id: 'economy', label: 'Economy', icon: Coins },
  { id: 'avatar', label: 'My Avatar', icon: Crown },
  { id: 'slack', label: 'Slack', icon: Slack },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Google Analytics Configuration
const GA_PROPERTY_ID = 'G-S4RPD5JD5L';
const _GA_DASHBOARD_URL = `https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/intelligenthome`;

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({ title, value, icon: Icon, trend, trendValue, color = '#8b5cf6', onClick }) {
  return (
    <GlassSurface
      className={`p-4 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">{title}</div>
          <div className="text-2xl font-bold" style={{ color }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${
              trend === 'up' ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5" style={{ color }}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </GlassSurface>
  );
}

function QuickAction({ icon: Icon, label, onClick, color = '#8b5cf6' }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </button>
  );
}

function StatusIndicator({ status, label }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-500'}`} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function UserCard({ user, onAction }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
          {user.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-medium">{user.displayName || user.username}</div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAction('gift', user)}
          className="p-2 rounded-lg hover:bg-white/10 text-green-400"
          title="Gift Credits"
        >
          <Gift className="w-4 h-4" />
        </button>
        <button
          onClick={() => onAction('message', user)}
          className="p-2 rounded-lg hover:bg-white/10 text-blue-400"
          title="Message"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
        <button
          onClick={() => onAction('more', user)}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EmpireControl() {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [_recentActivity, _setRecentActivity] = useState([]);
  const [messages, setMessages] = useState([]);
  const [economyStats, setEconomyStats] = useState(null);
  const [slackMessages, setSlackMessages] = useState<Array<{text: string; user: string; time: string}>>([]);
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackConnecting, setSlackConnecting] = useState(false);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [giftAmount, setGiftAmount] = useState(100);

  // Feedback state
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState({ type: null, status: null });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [feedbackDetailOpen, setFeedbackDetailOpen] = useState(false);
  const [respondMessage, setRespondMessage] = useState('');
  const [respondInternal, setRespondInternal] = useState(false);

  // Bug tracker state
  const [bugStats, setBugStats] = useState(null);
  const [bugItems, setBugItems] = useState([]);
  const [bugFilter, setBugFilter] = useState({ status: 'all', source: 'all', priority: 'all' });
  const [selectedBug, setSelectedBug] = useState(null);
  const [bugDetailOpen, setBugDetailOpen] = useState(false);
  const [bugTimeline, setBugTimeline] = useState([]);
  const [syncingBugs, setSyncingBugs] = useState(false);

  // Cockatrice (frontend error) state
  const [cockatriceErrors, setCockatriceErrors] = useState([]);
  const [cockatriceStats, setCockatriceStats] = useState(null);
  const [cockatriceFilter, setCockatriceFilter] = useState({ status: 'all', severity: 'all', type: 'all' });
  const [selectedCockatriceError, setSelectedCockatriceError] = useState(null);
  const [cockatriceTab, setCockatriceTab] = useState('errors'); // 'errors' | 'bugs'

  // Notification state
  const [notificationCount, setNotificationCount] = useState(0);

  // Owner Powers state
  const [ownerPowerModal, setOwnerPowerModal] = useState<string | null>(null);
  const [unlimitedCreditsLoading, setUnlimitedCreditsLoading] = useState(false);
  const [banUserSearch, setBanUserSearch] = useState('');
  const [banUserResults, setBanUserResults] = useState<Array<{id: string; username: string; displayName?: string}>>([]);
  const [banUserTarget, setBanUserTarget] = useState<{id: string; username: string; displayName?: string} | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [achievementUserSearch, setAchievementUserSearch] = useState('');
  const [achievementUserResults, setAchievementUserResults] = useState<Array<{id: string; username: string; displayName?: string}>>([]);
  const [achievementUserTarget, setAchievementUserTarget] = useState<{id: string; username: string; displayName?: string} | null>(null);
  const [achievementToGrant, setAchievementToGrant] = useState('');
  const [achievementLoading, setAchievementLoading] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [systemOverrideAction, setSystemOverrideAction] = useState('');
  const [systemOverrideLoading, setSystemOverrideLoading] = useState(false);
  const [giftUserSearch, setGiftUserSearch] = useState('');
  const [giftUserResults, setGiftUserResults] = useState<Array<{id: string; username: string; displayName?: string}>>([]);
  const [giftUserTarget, setGiftUserTarget] = useState<{id: string; username: string; displayName?: string} | null>(null);
  const [giftCreditsAmount, setGiftCreditsAmount] = useState(100);
  const [giftCreditsLoading, setGiftCreditsLoading] = useState(false);

  // Get auth header
  const getAuthHeader = useCallback(() => {
    try {
      const authData = localStorage.getItem('musclemap-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const token = parsed?.state?.token;
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      }
    } catch {
      // Failed to parse auth data
    }
    return {};
  }, []);

  // Fetch system metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/metrics');
      if (res.ok) {
        const text = await res.text();
        const parsed = parsePrometheusMetrics(text);
        setMetrics(parsed);

        // Add to history
        setMetricsHistory(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            requests: parsed.musclemap_http_requests_total?.[0]?.value || 0,
            connections: parsed.musclemap_db_connections_total?.[0]?.value || 0,
          };
          return [...prev, newPoint].slice(-30);
        });
      }
    } catch {
      // Failed to fetch metrics
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-control/users?limit=20', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || data.users || []);
      }
    } catch {
      // Failed to fetch users
    }
  }, [getAuthHeader]);

  // Fetch economy stats
  const fetchEconomyStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-control/audit/credits', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setEconomyStats(data);
      }
    } catch {
      // Failed to fetch economy stats
    }
  }, [getAuthHeader]);

  // Fetch messages (conversations)
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messaging/conversations', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        // Extract conversations and flatten recent messages
        const conversations = data.data || [];
        // Just show conversations as messages for now
        setMessages(conversations.map(conv => ({
          id: conv.id,
          content: conv.lastMessage?.content || 'No messages yet',
          createdAt: conv.lastMessage?.createdAt || conv.createdAt,
          participant: conv.participant,
          unreadCount: conv.unreadCount,
        })));
      }
    } catch {
      // Failed to fetch messages
    }
  }, [getAuthHeader]);

  // Fetch notification count
  const fetchNotificationCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationCount(data.data?.count || 0);
      }
    } catch {
      // Failed to fetch notification count
    }
  }, [getAuthHeader]);

  // Fetch feedback stats
  const fetchFeedbackStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feedback/stats', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackStats(data);
      }
    } catch {
      // Failed to fetch feedback stats
    }
  }, [getAuthHeader]);

  // Fetch feedback items
  const fetchFeedbackItems = useCallback(async () => {
    try {
      let url = '/api/admin/feedback?limit=50';
      if (feedbackFilter.type) url += `&type=${feedbackFilter.type}`;
      if (feedbackFilter.status) url += `&status=${feedbackFilter.status}`;

      const res = await fetch(url, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackItems(data.items || []);
      }
    } catch {
      // Failed to fetch feedback
    }
  }, [getAuthHeader, feedbackFilter]);

  // Fetch single feedback detail
  const fetchFeedbackDetail = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFeedback(data);
        setFeedbackDetailOpen(true);
      }
    } catch {
      // Failed to fetch feedback detail
    }
  }, [getAuthHeader]);

  // Confirm bug for auto-fix
  const confirmBug = async (id) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}/confirm-bug`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Bug confirmed! Job ID: ${data.jobId}`);
        fetchFeedbackItems();
        fetchFeedbackStats();
      }
    } catch {
      // Failed to confirm bug
    }
  };

  // Update feedback status
  const updateFeedbackStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchFeedbackItems();
        fetchFeedbackStats();
        if (selectedFeedback?.id === id) {
          fetchFeedbackDetail(id);
        }
      }
    } catch {
      // Failed to update feedback
    }
  };

  // Respond to feedback
  const respondToFeedback = async () => {
    if (!selectedFeedback || !respondMessage.trim()) return;

    try {
      const res = await fetch(`/api/admin/feedback/${selectedFeedback.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          message: respondMessage,
          is_internal: respondInternal,
        }),
      });
      if (res.ok) {
        setRespondMessage('');
        setRespondInternal(false);
        fetchFeedbackDetail(selectedFeedback.id);
      }
    } catch {
      // Failed to respond
    }
  };

  // Bug tracker functions
  const fetchBugStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bugs/stats', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBugStats(data);
      }
    } catch {
      // Failed to fetch bug stats
    }
  }, [getAuthHeader]);

  const fetchBugItems = useCallback(async () => {
    try {
      let url = '/api/admin/bugs?limit=100';
      if (bugFilter.status !== 'all') url += `&status=${bugFilter.status}`;
      if (bugFilter.source !== 'all') url += `&source=${bugFilter.source}`;
      if (bugFilter.priority !== 'all') url += `&priority=${bugFilter.priority}`;

      const res = await fetch(url, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBugItems(data.items || []);
      }
    } catch {
      // Failed to fetch bugs
    }
  }, [getAuthHeader, bugFilter]);

  const fetchBugDetail = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/admin/bugs/${id}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBug(data);
        setBugDetailOpen(true);
      }
    } catch {
      // Failed to fetch bug detail
    }
  }, [getAuthHeader]);

  const fetchBugTimeline = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bugs/timeline?limit=50', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBugTimeline(data.items || []);
      }
    } catch {
      // Failed to fetch timeline
    }
  }, [getAuthHeader]);

  // Cockatrice (frontend error) functions
  const fetchCockatriceErrors = useCallback(async () => {
    try {
      let url = '/api/errors/list?limit=100';
      if (cockatriceFilter.status !== 'all') url += `&status=${cockatriceFilter.status}`;
      if (cockatriceFilter.severity !== 'all') url += `&severity=${cockatriceFilter.severity}`;
      if (cockatriceFilter.type !== 'all') url += `&type=${cockatriceFilter.type}`;

      const res = await fetch(url, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setCockatriceErrors(data.items || []);
      }
    } catch {
      // Failed to fetch cockatrice errors
    }
  }, [getAuthHeader, cockatriceFilter]);

  const fetchCockatriceStats = useCallback(async () => {
    try {
      const res = await fetch('/api/errors/admin-stats', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setCockatriceStats(data);
      }
    } catch {
      // Failed to fetch cockatrice stats
    }
  }, [getAuthHeader]);

  const convertErrorToBug = async (errorId) => {
    try {
      const res = await fetch(`/api/errors/${errorId}/convert-to-bug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.data?.converted) {
          alert(`Bug report created: ${result.data.id}`);
          fetchCockatriceErrors();
          fetchCockatriceStats();
          fetchBugItems();
          fetchBugStats();
        } else {
          alert('Bug report already exists');
        }
      }
    } catch {
      alert('Failed to convert error to bug');
    }
  };

  const syncBugHunterReports = async () => {
    setSyncingBugs(true);
    try {
      // Sync high-severity frontend errors to bug reports
      const reportsRes = await fetch('/api/errors/sync-to-bugs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ severity: 'high', hours: 168 }), // Last 7 days of high/critical errors
      });

      if (reportsRes.ok) {
        const result = await reportsRes.json();
        alert(`Synced errors to bugs: ${result.data?.created || 0} created, ${result.data?.skipped || 0} skipped`);
        fetchBugStats();
        fetchBugItems();
        fetchCockatriceStats();
        fetchCockatriceErrors();
      } else {
        alert('Failed to sync - check server logs');
      }
    } catch {
      alert('Failed to sync bug reports');
    } finally {
      setSyncingBugs(false);
    }
  };

  const updateBugStatus = async (bugId, status) => {
    try {
      const res = await fetch(`/api/admin/bugs/${bugId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchBugItems();
        fetchBugStats();
        if (selectedBug?.id === bugId) {
          fetchBugDetail(bugId);
        }
      }
    } catch {
      // Failed to update bug
    }
  };

  const resolveBug = async (bugId, resolutionType, notes) => {
    try {
      const res = await fetch(`/api/admin/bugs/${bugId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          status: 'resolved',
          resolutionType,
          resolutionNotes: notes,
        }),
      });
      if (res.ok) {
        fetchBugItems();
        fetchBugStats();
        setBugDetailOpen(false);
      }
    } catch {
      // Failed to resolve bug
    }
  };

  // Gift credits to user
  const giftCredits = async () => {
    if (!selectedUser || giftAmount <= 0) return;

    try {
      const res = await fetch('/api/admin-control/credits/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: giftAmount,
          reason: 'Gift from owner',
          type: 'admin_grant',
        }),
      });

      if (res.ok) {
        setGiftModalOpen(false);
        setSelectedUser(null);
        setGiftAmount(100);
        // Show success notification
        alert(`Gifted ${giftAmount} credits to ${selectedUser.username}!`);
      }
    } catch {
      // Failed to gift credits
    }
  };

  // Owner Power handlers
  const handleOwnerPower = (powerId: string) => {
    setOwnerPowerModal(powerId);
    // Reset states
    setBanUserSearch('');
    setBanUserResults([]);
    setBanUserTarget(null);
    setBanReason('');
    setAchievementUserSearch('');
    setAchievementUserResults([]);
    setAchievementUserTarget(null);
    setAchievementToGrant('');
    setBroadcastMessage('');
    setSystemOverrideAction('');
    setGiftUserSearch('');
    setGiftUserResults([]);
    setGiftUserTarget(null);
    setGiftCreditsAmount(100);
  };

  const handleUnlimitedCredits = async () => {
    setUnlimitedCreditsLoading(true);
    try {
      const res = await fetch('/api/admin-control/credits/owner-unlimited', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        alert('Your credits have been set to unlimited (1,000,000,000)!');
        setOwnerPowerModal(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to grant unlimited credits');
      }
    } catch {
      alert('Failed to grant unlimited credits');
    } finally {
      setUnlimitedCreditsLoading(false);
    }
  };

  const searchUsersForPower = async (query: string, setPower: 'ban' | 'achievement' | 'gift') => {
    if (!query || query.length < 2) {
      if (setPower === 'ban') setBanUserResults([]);
      else if (setPower === 'achievement') setAchievementUserResults([]);
      else setGiftUserResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          query: `query SearchUsers($query: String!) {
            searchUsers(query: $query, limit: 10) {
              id
              username
              displayName
            }
          }`,
          variables: { query },
        }),
      });
      const data = await res.json();
      const results = data.data?.searchUsers || [];
      if (setPower === 'ban') setBanUserResults(results);
      else if (setPower === 'achievement') setAchievementUserResults(results);
      else setGiftUserResults(results);
    } catch {
      // Failed to search users
    }
  };

  const handleBanUser = async () => {
    if (!banUserTarget) return;
    setBanLoading(true);
    try {
      const res = await fetch('/api/admin-control/users/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          userId: banUserTarget.id,
          reason: banReason || 'Banned by owner',
        }),
      });
      if (res.ok) {
        alert(`User ${banUserTarget.username} has been banned!`);
        setOwnerPowerModal(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to ban user');
      }
    } catch {
      alert('Failed to ban user');
    } finally {
      setBanLoading(false);
    }
  };

  const handleGrantAchievement = async () => {
    if (!achievementUserTarget || !achievementToGrant) return;
    setAchievementLoading(true);
    try {
      const res = await fetch('/api/admin-control/achievements/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          userId: achievementUserTarget.id,
          achievementId: achievementToGrant,
        }),
      });
      if (res.ok) {
        alert(`Achievement granted to ${achievementUserTarget.username}!`);
        setOwnerPowerModal(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to grant achievement');
      }
    } catch {
      alert('Failed to grant achievement');
    } finally {
      setAchievementLoading(false);
    }
  };

  const handleBroadcastMessage = async () => {
    if (!broadcastMessage) return;
    setBroadcastLoading(true);
    try {
      const res = await fetch('/api/admin-control/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          message: broadcastMessage,
        }),
      });
      if (res.ok) {
        alert('Broadcast message sent to all users!');
        setOwnerPowerModal(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to send broadcast');
      }
    } catch {
      alert('Failed to send broadcast');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleSystemOverride = async (action: string) => {
    setSystemOverrideAction(action);
    setSystemOverrideLoading(true);
    try {
      const res = await fetch('/api/admin-control/system/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        alert(`System override "${action}" executed!`);
        setOwnerPowerModal(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to execute system override');
      }
    } catch {
      alert('Failed to execute system override');
    } finally {
      setSystemOverrideLoading(false);
    }
  };

  const handleGiftCreditsFromPower = async () => {
    if (!giftUserTarget || giftCreditsAmount <= 0) return;
    setGiftCreditsLoading(true);
    try {
      const res = await fetch('/api/admin-control/credits/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          userId: giftUserTarget.id,
          amount: giftCreditsAmount,
          reason: 'Gift from owner',
          type: 'admin_grant',
        }),
      });
      if (res.ok) {
        alert(`Gifted ${giftCreditsAmount} credits to ${giftUserTarget.username}!`);
        setOwnerPowerModal(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to gift credits');
      }
    } catch {
      alert('Failed to gift credits');
    } finally {
      setGiftCreditsLoading(false);
    }
  };

  // Handle user actions
  const handleUserAction = (action, targetUser) => {
    switch (action) {
      case 'gift':
        setSelectedUser(targetUser);
        setGiftModalOpen(true);
        break;
      case 'message':
        // Navigate to messages with user selected
        window.location.href = `/messages?user=${targetUser.id}`;
        break;
      default:
        // Unhandled action
    }
  };

  // Handle Slack connection
  const handleConnectSlack = async () => {
    if (!slackWebhookUrl) {
      setSlackError('Please enter a Slack webhook URL');
      return;
    }

    // Validate URL format
    if (!slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
      setSlackError('Invalid Slack webhook URL. It should start with https://hooks.slack.com/');
      return;
    }

    setSlackConnecting(true);
    setSlackError(null);

    try {
      // Test the webhook by sending a test message
      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ':muscle: *MuscleMap.ME Connected!*\nYour Empire dashboard is now linked to this Slack channel.',
          username: 'MuscleMap Bot',
          icon_emoji: ':muscle:',
        }),
      });

      if (response.ok || response.status === 200) {
        // Save webhook URL to localStorage for persistence
        localStorage.setItem('musclemap_slack_webhook', slackWebhookUrl);
        setSlackConnected(true);
        setSlackMessages([
          {
            text: 'MuscleMap.ME Connected! Your Empire dashboard is now linked.',
            user: 'MuscleMap Bot',
            time: 'Just now',
          },
        ]);
      } else {
        const errorText = await response.text();
        setSlackError(`Failed to connect: ${errorText || 'Unknown error'}`);
      }
    } catch {
      // Slack webhooks have CORS restrictions, but they still work
      // If we get a network error, the message likely still went through
      localStorage.setItem('musclemap_slack_webhook', slackWebhookUrl);
      setSlackConnected(true);
      setSlackMessages([
        {
          text: 'MuscleMap.ME Connected! Check your Slack channel for confirmation.',
          user: 'MuscleMap Bot',
          time: 'Just now',
        },
      ]);
    } finally {
      setSlackConnecting(false);
    }
  };

  // Load saved Slack connection on mount
  useEffect(() => {
    const savedWebhook = localStorage.getItem('musclemap_slack_webhook');
    if (savedWebhook) {
      setSlackWebhookUrl(savedWebhook);
      setSlackConnected(true);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMetrics(),
        fetchUsers(),
        fetchEconomyStats(),
        fetchMessages(),
        fetchFeedbackStats(),
        fetchFeedbackItems(),
        fetchNotificationCount(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchMetrics, fetchUsers, fetchEconomyStats, fetchMessages, fetchFeedbackStats, fetchFeedbackItems, fetchNotificationCount]);

  // Refresh feedback when filter changes
  useEffect(() => {
    fetchFeedbackItems();
  }, [feedbackFilter, fetchFeedbackItems]);

  // Load bug tracker data when section is active
  useEffect(() => {
    if (activeSection === 'bug-tracker') {
      fetchBugStats();
      fetchBugItems();
      fetchBugTimeline();
      fetchCockatriceStats();
      fetchCockatriceErrors();
    }
  }, [activeSection, fetchBugStats, fetchBugItems, fetchBugTimeline, fetchCockatriceStats, fetchCockatriceErrors]);

  // Refresh bugs when filter changes
  useEffect(() => {
    if (activeSection === 'bug-tracker') {
      fetchBugItems();
    }
  }, [bugFilter, activeSection, fetchBugItems]);

  // Refresh cockatrice errors when filter changes
  useEffect(() => {
    if (activeSection === 'bug-tracker') {
      fetchCockatriceErrors();
    }
  }, [cockatriceFilter, activeSection, fetchCockatriceErrors]);

  // Auto-refresh metrics
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Check if user is owner
  if (!user?.is_admin && !user?.is_owner && !user?.roles?.includes('admin') && !user?.roles?.includes('owner')) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Empire Access Required</h1>
          <p className="text-gray-400">Only the empire owner can access this panel.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-violet-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Extract metric values
  const totalRequests = metrics?.musclemap_http_requests_total?.[0]?.value || 0;
  const dbConnections = metrics?.musclemap_db_connections_total?.[0]?.value || 0;
  const dbHealthy = metrics?.musclemap_db_healthy?.[0]?.value === 1;
  const redisConnected = metrics?.musclemap_redis_connected?.[0]?.value === 1;
  const uptime = metrics?.musclemap_uptime_seconds?.[0]?.value || 0;

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg">Empire Control</div>
              <div className="text-xs text-gray-400">Master Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            section.link ? (
              <Link
                key={section.id}
                to={section.link}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 text-gray-400 hover:text-white hover:bg-white/5"
              >
                <section.icon className="w-5 h-5" />
                <span>{section.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </Link>
            ) : (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                  activeSection === section.id
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <section.icon className="w-5 h-5" />
                <span>{section.label}</span>
              </button>
            )
          ))}
        </nav>

        {/* Owner Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-medium">{user?.displayName || user?.username}</div>
              <div className="text-xs text-yellow-400 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Owner
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Infinity className="w-4 h-4 text-yellow-400" />
            <span>Unlimited Powers</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              {NAV_SECTIONS.find(s => s.id === activeSection)?.icon &&
                React.createElement(NAV_SECTIONS.find(s => s.id === activeSection).icon, { className: 'w-6 h-6 text-violet-400' })}
              {NAV_SECTIONS.find(s => s.id === activeSection)?.label}
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500 w-64"
                />
              </div>
              <button className="p-2 rounded-lg hover:bg-white/10 relative">
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              <button onClick={fetchMetrics} className="p-2 rounded-lg hover:bg-white/10">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {loading && !metrics ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* Overview Section */}
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  {/* System Status */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      title="System Status"
                      value={dbHealthy && redisConnected ? 'Healthy' : 'Degraded'}
                      icon={Server}
                      color={dbHealthy && redisConnected ? '#10b981' : '#f59e0b'}
                    />
                    <StatCard
                      title="Uptime"
                      value={formatUptime(uptime)}
                      icon={Activity}
                      color="#06b6d4"
                    />
                    <StatCard
                      title="Total Users"
                      value={users.length}
                      icon={Users}
                      color="#8b5cf6"
                    />
                    <StatCard
                      title="Requests"
                      value={totalRequests}
                      icon={BarChart3}
                      color="#f59e0b"
                    />
                  </div>

                  {/* Quick Actions */}
                  <GlassSurface className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Owner Powers
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {OWNER_POWERS.map((power) => (
                        <QuickAction
                          key={power.id}
                          icon={power.icon}
                          label={power.name}
                          color={power.color}
                          onClick={() => handleOwnerPower(power.id)}
                        />
                      ))}
                    </div>
                  </GlassSurface>

                  {/* Charts Row */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <GlassSurface className="p-4">
                      <h3 className="font-semibold mb-4">Request Traffic</h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metricsHistory}>
                            <defs>
                              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="time" stroke="#666" fontSize={10} />
                            <YAxis stroke="#666" fontSize={10} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(10,10,15,0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="requests"
                              stroke="#8b5cf6"
                              fill="url(#colorRequests)"
                              name="Requests"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassSurface>

                    <GlassSurface className="p-4">
                      <h3 className="font-semibold mb-4">System Health</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <StatusIndicator status={dbHealthy ? 'healthy' : 'unhealthy'} label="PostgreSQL" />
                          <span className="text-sm text-gray-400">{dbConnections} connections</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <StatusIndicator status={redisConnected ? 'healthy' : 'unhealthy'} label="Redis" />
                          <span className="text-sm text-gray-400">{redisConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <StatusIndicator status="healthy" label="API Server" />
                          <span className="text-sm text-gray-400">Running</span>
                        </div>
                      </div>
                    </GlassSurface>
                  </div>

                  {/* Recent Users */}
                  <GlassSurface className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-400" />
                        Recent Users
                      </h3>
                      <Link to="/admin-control" className="text-sm text-violet-400 hover:underline flex items-center gap-1">
                        View All <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {users.slice(0, 5).map((u) => (
                        <UserCard key={u.id} user={u} onAction={handleUserAction} />
                      ))}
                    </div>
                  </GlassSurface>
                </div>
              )}

              {/* Server Control Section */}
              {activeSection === 'server' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <ServerControl />
                </Suspense>
              )}

              {/* Database Panel Section */}
              {activeSection === 'database' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <DatabasePanel />
                </Suspense>
              )}

              {/* Scheduler Panel Section */}
              {activeSection === 'scheduler' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <SchedulerPanel />
                </Suspense>
              )}

              {/* Environment Panel Section */}
              {activeSection === 'env' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <EnvPanel />
                </Suspense>
              )}

              {/* Deployments Panel Section */}
              {activeSection === 'deploy' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <DeployPanel />
                </Suspense>
              )}

              {/* Build Daemon Panel Section */}
              {activeSection === 'build-daemon' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <BuildDaemonPanel />
                </Suspense>
              )}

              {/* Real-time Metrics Panel Section */}
              {activeSection === 'realtime-metrics' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <MetricsPanel />
                </Suspense>
              )}

              {/* User Analytics Panel Section */}
              {activeSection === 'user-analytics' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <UserAnalyticsPanel />
                </Suspense>
              )}

              {/* Alerts Panel Section */}
              {activeSection === 'alerts' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <AlertsPanel />
                </Suspense>
              )}

              {/* Security Panel Section */}
              {activeSection === 'security' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <SecurityPanel />
                </Suspense>
              )}

              {/* Feature Flags Panel Section */}
              {activeSection === 'feature-flags' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <FeatureFlagsPanel />
                </Suspense>
              )}

              {/* Logs Panel Section */}
              {activeSection === 'logs' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <LogsPanel />
                </Suspense>
              )}

              {/* Backup Panel Section */}
              {activeSection === 'backup' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <BackupPanel />
                </Suspense>
              )}

              {/* Documentation Editor Section */}
              {activeSection === 'docs' && (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                }>
                  <MarkdownEditor />
                </Suspense>
              )}

              {/* Feedback Queue Section */}
              {activeSection === 'feedback' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Feedback"
                      value={feedbackStats?.total || 0}
                      icon={MessageSquare}
                      color="#8b5cf6"
                    />
                    <StatCard
                      title="Open Bugs"
                      value={feedbackStats?.unresolved_bugs || 0}
                      icon={Bug}
                      color="#ef4444"
                      onClick={() => setFeedbackFilter({ type: 'bug_report', status: 'open' })}
                    />
                    <StatCard
                      title="Auto-Fix Queue"
                      value={(feedbackStats?.auto_fix_pending || 0) + (feedbackStats?.auto_fix_in_progress || 0)}
                      icon={Zap}
                      color="#f59e0b"
                    />
                    <StatCard
                      title="Pending Review"
                      value={feedbackStats?.pending_review || 0}
                      icon={Clock}
                      color="#06b6d4"
                      onClick={() => setFeedbackFilter({ type: null, status: 'open' })}
                    />
                  </div>

                  {/* Type Breakdown */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { type: 'bug_report', label: 'Bugs', icon: Bug, color: '#ef4444' },
                      { type: 'feature_request', label: 'Features', icon: Lightbulb, color: '#10b981' },
                      { type: 'question', label: 'Questions', icon: HelpCircle, color: '#3b82f6' },
                      { type: 'general', label: 'General', icon: MessageCircle, color: '#8b5cf6' },
                    ].map((t) => (
                      <button
                        key={t.type}
                        onClick={() => setFeedbackFilter(prev => ({ ...prev, type: prev.type === t.type ? null : t.type }))}
                        className={`p-3 rounded-lg border transition-all ${
                          feedbackFilter.type === t.type
                            ? 'border-violet-500 bg-violet-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <t.icon className="w-5 h-5 mx-auto mb-1" style={{ color: t.color }} />
                        <div className="text-xs text-gray-400">{t.label}</div>
                        <div className="text-lg font-bold">{feedbackStats?.by_type?.[t.type] || 0}</div>
                      </button>
                    ))}
                  </div>

                  {/* Status Filter */}
                  <div className="flex gap-2 flex-wrap">
                    {['open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFeedbackFilter(prev => ({ ...prev, status: prev.status === s ? null : s }))}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          feedbackFilter.status === s
                            ? 'bg-violet-500 text-white'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {s.replace('_', ' ')} ({feedbackStats?.by_status?.[s] || 0})
                      </button>
                    ))}
                    {(feedbackFilter.type || feedbackFilter.status) && (
                      <button
                        onClick={() => setFeedbackFilter({ type: null, status: null })}
                        className="px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>

                  {/* Feedback List */}
                  <GlassSurface className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Feedback Items</h3>
                      <button
                        onClick={() => { fetchFeedbackItems(); fetchFeedbackStats(); }}
                        className="p-2 rounded-lg hover:bg-white/10"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {feedbackItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No feedback items found</p>
                        </div>
                      ) : (
                        feedbackItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => fetchFeedbackDetail(item.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.type === 'bug_report' && <Bug className="w-4 h-4 text-red-400" />}
                                  {item.type === 'feature_request' && <Lightbulb className="w-4 h-4 text-green-400" />}
                                  {item.type === 'question' && <HelpCircle className="w-4 h-4 text-blue-400" />}
                                  {item.type === 'general' && <MessageCircle className="w-4 h-4 text-violet-400" />}
                                  <span className="font-medium truncate">{item.title}</span>
                                </div>
                                <div className="text-sm text-gray-400 truncate">{item.description}</div>
                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                  <span>@{item.user?.username}</span>
                                  <span>•</span>
                                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                  {item.autoFixStatus && (
                                    <>
                                      <span>•</span>
                                      <span className={`flex items-center gap-1 ${
                                        item.autoFixStatus === 'completed' ? 'text-green-400' :
                                        item.autoFixStatus === 'failed' ? 'text-red-400' :
                                        item.autoFixStatus === 'in_progress' ? 'text-yellow-400' :
                                        'text-gray-400'
                                      }`}>
                                        <Zap className="w-3 h-3" />
                                        {item.autoFixStatus}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  item.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                                  item.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                  item.status === 'confirmed' ? 'bg-orange-500/20 text-orange-400' :
                                  item.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {item.status}
                                </span>
                                {item.type === 'bug_report' && item.status === 'open' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); confirmBug(item.id); }}
                                    className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-xs hover:bg-orange-500/30 flex items-center gap-1"
                                    title="Confirm bug for auto-fix"
                                  >
                                    <Play className="w-3 h-3" />
                                    Fix
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </GlassSurface>
                </div>
              )}

              {/* Feedback Detail Modal */}
              {feedbackDetailOpen && selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                  <div className="bg-[#0f0f15] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-[#0f0f15] border-b border-white/10 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedFeedback.type === 'bug_report' && <Bug className="w-5 h-5 text-red-400" />}
                        {selectedFeedback.type === 'feature_request' && <Lightbulb className="w-5 h-5 text-green-400" />}
                        {selectedFeedback.type === 'question' && <HelpCircle className="w-5 h-5 text-blue-400" />}
                        {selectedFeedback.type === 'general' && <MessageCircle className="w-5 h-5 text-violet-400" />}
                        <h2 className="font-bold text-lg">{selectedFeedback.title}</h2>
                      </div>
                      <button
                        onClick={() => { setFeedbackDetailOpen(false); setSelectedFeedback(null); }}
                        className="p-2 rounded-lg hover:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Status & Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedFeedback.status}
                          onChange={(e) => updateFeedbackStatus(selectedFeedback.id, e.target.value)}
                          className="bg-white/10 border border-white/10 rounded-lg px-3 py-1 text-sm"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="wont_fix">{"Won't Fix"}</option>
                        </select>
                        {selectedFeedback.type === 'bug_report' && selectedFeedback.status === 'open' && (
                          <button
                            onClick={() => confirmBug(selectedFeedback.id)}
                            className="px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-sm hover:bg-orange-500/30 flex items-center gap-1"
                          >
                            <Zap className="w-4 h-4" />
                            Confirm & Auto-Fix
                          </button>
                        )}
                        {selectedFeedback.autoFixStatus && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            selectedFeedback.autoFixStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
                            selectedFeedback.autoFixStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                            selectedFeedback.autoFixStatus === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            Auto-fix: {selectedFeedback.autoFixStatus}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                          {selectedFeedback.user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium">@{selectedFeedback.user?.username}</div>
                          <div className="text-xs text-gray-400">{new Date(selectedFeedback.createdAt).toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                        <p className="text-gray-300 whitespace-pre-wrap">{selectedFeedback.description}</p>
                      </div>

                      {/* Bug-specific fields */}
                      {selectedFeedback.type === 'bug_report' && (
                        <>
                          {selectedFeedback.stepsToReproduce && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-1">Steps to Reproduce</h4>
                              <p className="text-gray-300 whitespace-pre-wrap">{selectedFeedback.stepsToReproduce}</p>
                            </div>
                          )}
                          {selectedFeedback.expectedBehavior && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-1">Expected Behavior</h4>
                              <p className="text-gray-300 whitespace-pre-wrap">{selectedFeedback.expectedBehavior}</p>
                            </div>
                          )}
                          {selectedFeedback.actualBehavior && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-1">Actual Behavior</h4>
                              <p className="text-gray-300 whitespace-pre-wrap">{selectedFeedback.actualBehavior}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Device Info */}
                      {(selectedFeedback.platform || selectedFeedback.userAgent) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {selectedFeedback.platform && (
                            <div className="p-2 bg-white/5 rounded">
                              <span className="text-gray-500">Platform:</span> {selectedFeedback.platform}
                            </div>
                          )}
                          {selectedFeedback.appVersion && (
                            <div className="p-2 bg-white/5 rounded">
                              <span className="text-gray-500">Version:</span> {selectedFeedback.appVersion}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Notes */}
                      {selectedFeedback.adminNotes && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <h4 className="text-sm font-medium text-yellow-400 mb-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Admin Notes (Internal)
                          </h4>
                          <p className="text-gray-300 text-sm">{selectedFeedback.adminNotes}</p>
                        </div>
                      )}

                      {/* Responses */}
                      {selectedFeedback.responses?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Conversation</h4>
                          <div className="space-y-2">
                            {selectedFeedback.responses.map((r) => (
                              <div
                                key={r.id}
                                className={`p-3 rounded-lg ${
                                  r.isInternal ? 'bg-yellow-500/10 border border-yellow-500/20' :
                                  r.responderType === 'admin' ? 'bg-violet-500/10 border border-violet-500/20' :
                                  r.responderType === 'system' ? 'bg-gray-500/10 border border-gray-500/20' :
                                  'bg-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
                                  <span className="font-medium">
                                    {r.responderType === 'system' ? 'System' :
                                     r.responderType === 'admin' ? `Admin (${r.responderUsername || 'Unknown'})` :
                                     `@${r.responderUsername || 'User'}`}
                                  </span>
                                  {r.isInternal && <span className="text-yellow-400">(Internal)</span>}
                                  <span>•</span>
                                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-300 text-sm">{r.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agent Jobs */}
                      {selectedFeedback.agentJobs?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            Auto-Fix Jobs
                          </h4>
                          <div className="space-y-2">
                            {selectedFeedback.agentJobs.map((j) => (
                              <div key={j.id} className="p-3 bg-white/5 rounded-lg text-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    j.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                    j.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                    j.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {j.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(j.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                {j.filesModified?.length > 0 && (
                                  <div className="text-xs text-gray-400 mb-1">
                                    Files: {j.filesModified.join(', ')}
                                  </div>
                                )}
                                {j.deployed && j.deployCommit && (
                                  <div className="text-xs text-green-400">
                                    Deployed: {j.deployCommit}
                                  </div>
                                )}
                                {j.errorMessage && (
                                  <div className="text-xs text-red-400 mt-1">
                                    Error: {j.errorMessage}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Respond Form */}
                      <div className="border-t border-white/10 pt-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Add Response</h4>
                        <textarea
                          value={respondMessage}
                          onChange={(e) => setRespondMessage(e.target.value)}
                          placeholder="Type your response..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:border-violet-500"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={respondInternal}
                              onChange={(e) => setRespondInternal(e.target.checked)}
                              className="rounded bg-white/10 border-white/20"
                            />
                            Internal note (not visible to user)
                          </label>
                          <button
                            onClick={respondToFeedback}
                            disabled={!respondMessage.trim()}
                            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bug Tracker Section */}
              {activeSection === 'bug-tracker' && (
                <div className="space-y-6">
                  {/* Tab Switcher */}
                  <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                    <button
                      onClick={() => setCockatriceTab('errors')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        cockatriceTab === 'errors'
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Cockatrice Errors
                      {cockatriceStats?.totals?.unresolved > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {cockatriceStats.totals.unresolved}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setCockatriceTab('bugs')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        cockatriceTab === 'bugs'
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      <Bug className="w-4 h-4" />
                      Bug Reports
                      {bugStats?.totals?.open > 0 && (
                        <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                          {bugStats.totals.open}
                        </span>
                      )}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={syncBugHunterReports}
                      disabled={syncingBugs}
                      className="px-4 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncingBugs ? 'animate-spin' : ''}`} />
                      {syncingBugs ? 'Syncing...' : 'Sync to Bug Reports'}
                    </button>
                  </div>

                  {/* COCKATRICE ERRORS TAB */}
                  {cockatriceTab === 'errors' && (
                    <>
                      {/* Cockatrice Stats Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard
                          title="Total Errors"
                          value={cockatriceStats?.totals?.total || 0}
                          icon={AlertCircle}
                          color="#ef4444"
                        />
                        <StatCard
                          title="Unresolved"
                          value={cockatriceStats?.totals?.unresolved || 0}
                          icon={AlertCircle}
                          color="#f59e0b"
                          onClick={() => setCockatriceFilter({ ...cockatriceFilter, status: 'new' })}
                        />
                        <StatCard
                          title="Resolved"
                          value={cockatriceStats?.totals?.resolved || 0}
                          icon={CheckCircle}
                          color="#10b981"
                          onClick={() => setCockatriceFilter({ ...cockatriceFilter, status: 'resolved' })}
                        />
                        <StatCard
                          title="Today"
                          value={cockatriceStats?.totals?.today || 0}
                          icon={Clock}
                          color="#06b6d4"
                        />
                        <StatCard
                          title="Affected Users"
                          value={cockatriceStats?.totals?.uniqueUsersThisWeek || 0}
                          icon={Users}
                          color="#8b5cf6"
                        />
                      </div>

                      {/* Error Type Filter */}
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(cockatriceStats?.byType || {}).map(([type, count]) => (
                          <button
                            key={type}
                            onClick={() => setCockatriceFilter({ ...cockatriceFilter, type: cockatriceFilter.type === type ? 'all' : type })}
                            className={`px-3 py-1 rounded-full text-xs transition-colors ${
                              cockatriceFilter.type === type
                                ? 'bg-violet-500 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {type} ({count})
                          </button>
                        ))}
                      </div>

                      {/* Severity Filter */}
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setCockatriceFilter({ ...cockatriceFilter, severity: s })}
                            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                              cockatriceFilter.severity === s
                                ? s === 'critical' ? 'bg-red-500 text-white' :
                                  s === 'high' ? 'bg-orange-500 text-white' :
                                  s === 'medium' ? 'bg-yellow-500 text-black' :
                                  s === 'low' ? 'bg-blue-500 text-white' :
                                  'bg-violet-500 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)} {cockatriceStats?.bySeverity?.[s] ? `(${cockatriceStats.bySeverity[s]})` : ''}
                          </button>
                        ))}
                        {(cockatriceFilter.status !== 'all' || cockatriceFilter.severity !== 'all' || cockatriceFilter.type !== 'all') && (
                          <button
                            onClick={() => setCockatriceFilter({ status: 'all', severity: 'all', type: 'all' })}
                            className="px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>

                      {/* Cockatrice Error List */}
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <GlassSurface className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold">Frontend Errors ({cockatriceErrors.length})</h3>
                              <button
                                onClick={() => { fetchCockatriceErrors(); fetchCockatriceStats(); }}
                                className="p-2 rounded-lg hover:bg-white/10"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                              {cockatriceErrors.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p>No frontend errors captured</p>
                                  <p className="text-sm mt-2">When users encounter errors, they will appear here</p>
                                </div>
                              ) : (
                                cockatriceErrors.map((error) => (
                                  <div
                                    key={error.id}
                                    className={`p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
                                      selectedCockatriceError?.id === error.id ? 'ring-2 ring-violet-500' : ''
                                    }`}
                                    onClick={() => setSelectedCockatriceError(error)}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`w-2 h-2 rounded-full ${
                                            error.severity === 'critical' ? 'bg-red-500' :
                                            error.severity === 'high' ? 'bg-orange-500' :
                                            error.severity === 'medium' ? 'bg-yellow-500' :
                                            'bg-blue-500'
                                          }`} />
                                          <span className="font-medium text-sm truncate">{error.message}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">{error.url}</div>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                            {error.type}
                                          </span>
                                          {error.username && (
                                            <>
                                              <span>•</span>
                                              <Link
                                                to={`/profile/${error.username}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-violet-400 hover:text-violet-300 hover:underline"
                                              >
                                                {error.username}
                                              </Link>
                                            </>
                                          )}
                                          <span>•</span>
                                          <span>{new Date(error.errorAt).toLocaleString()}</span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                          error.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                                          error.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                          error.status === 'converted' ? 'bg-violet-500/20 text-violet-400' :
                                          'bg-gray-500/20 text-gray-400'
                                        }`}>
                                          {error.status}
                                        </span>
                                        {error.status !== 'converted' && error.status !== 'resolved' && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); convertErrorToBug(error.id); }}
                                            className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                          >
                                            → Bug
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </GlassSurface>
                        </div>

                        {/* Error Detail Panel */}
                        <div>
                          <GlassSurface className="p-4">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                              <Eye className="w-4 h-4 text-violet-400" />
                              Error Details
                            </h3>
                            {selectedCockatriceError ? (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-xs text-gray-500 mb-1">Message</h4>
                                  <p className="text-sm text-gray-300">{selectedCockatriceError.message}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs text-gray-500 mb-1">Type</h4>
                                  <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                    {selectedCockatriceError.type}
                                  </span>
                                </div>
                                {selectedCockatriceError.username && (
                                  <div>
                                    <h4 className="text-xs text-gray-500 mb-1">User</h4>
                                    <Link
                                      to={`/profile/${selectedCockatriceError.username}`}
                                      className="text-sm text-violet-400 hover:text-violet-300 hover:underline flex items-center gap-1"
                                    >
                                      {selectedCockatriceError.username}
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs text-gray-500 mb-1">URL</h4>
                                  <a href={selectedCockatriceError.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline break-all">
                                    {selectedCockatriceError.url}
                                  </a>
                                </div>
                                {selectedCockatriceError.componentName && (
                                  <div>
                                    <h4 className="text-xs text-gray-500 mb-1">Component</h4>
                                    <code className="text-xs text-gray-300 bg-black/30 px-2 py-1 rounded">{selectedCockatriceError.componentName}</code>
                                  </div>
                                )}
                                {selectedCockatriceError.stack && (
                                  <div>
                                    <h4 className="text-xs text-gray-500 mb-1">Stack Trace</h4>
                                    <pre className="text-xs text-gray-400 bg-black/30 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">
                                      {selectedCockatriceError.stack}
                                    </pre>
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs text-gray-500 mb-1">Occurred</h4>
                                  <p className="text-xs text-gray-400">{new Date(selectedCockatriceError.errorAt).toLocaleString()}</p>
                                </div>
                                {selectedCockatriceError.status !== 'converted' && selectedCockatriceError.status !== 'resolved' && (
                                  <button
                                    onClick={() => convertErrorToBug(selectedCockatriceError.id)}
                                    className="w-full px-3 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-sm"
                                  >
                                    Convert to Bug Report
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500 text-sm">
                                Select an error to view details
                              </div>
                            )}
                          </GlassSurface>
                        </div>
                      </div>
                    </>
                  )}

                  {/* BUG REPORTS TAB */}
                  {cockatriceTab === 'bugs' && (
                    <>
                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard
                          title="Total Bugs"
                          value={bugStats?.totals?.total || 0}
                          icon={Bug}
                          color="#8b5cf6"
                        />
                        <StatCard
                          title="Open"
                          value={bugStats?.totals?.open || 0}
                          icon={AlertCircle}
                          color="#ef4444"
                          onClick={() => setBugFilter({ ...bugFilter, status: 'open' })}
                        />
                        <StatCard
                          title="Resolved"
                          value={bugStats?.totals?.resolved || 0}
                          icon={CheckCircle}
                          color="#10b981"
                          onClick={() => setBugFilter({ ...bugFilter, status: 'resolved' })}
                        />
                        <StatCard
                          title="Auto-Fixed"
                          value={bugStats?.autoFix?.completed || 0}
                          icon={Zap}
                          color="#f59e0b"
                        />
                        <StatCard
                          title="Today"
                          value={bugStats?.totals?.today || 0}
                          icon={Clock}
                          color="#06b6d4"
                        />
                      </div>

                      {/* Source Breakdown */}
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(bugStats?.bySource || {}).map(([source, count]) => (
                          <button
                            key={source}
                            onClick={() => setBugFilter({ ...bugFilter, source: bugFilter.source === source ? 'all' : source })}
                            className={`px-3 py-1 rounded-full text-xs transition-colors ${
                              bugFilter.source === source
                                ? 'bg-violet-500 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {source} ({count})
                          </button>
                        ))}
                      </div>

                      {/* Priority Filter */}
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
                          <button
                            key={p}
                            onClick={() => setBugFilter({ ...bugFilter, priority: p })}
                            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                              bugFilter.priority === p
                                ? p === 'critical' ? 'bg-red-500 text-white' :
                                  p === 'high' ? 'bg-orange-500 text-white' :
                                  p === 'medium' ? 'bg-yellow-500 text-black' :
                                  p === 'low' ? 'bg-blue-500 text-white' :
                                  'bg-violet-500 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)} {bugStats?.byPriority?.[p] ? `(${bugStats.byPriority[p]})` : ''}
                          </button>
                        ))}
                      </div>

                      {/* Status Filter */}
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setBugFilter({ ...bugFilter, status: s })}
                            className={`px-3 py-1 rounded-full text-xs transition-colors ${
                              bugFilter.status === s
                                ? 'bg-violet-500 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {s.replace('_', ' ')} {bugStats?.byStatus?.[s] ? `(${bugStats.byStatus[s]})` : ''}
                          </button>
                        ))}
                        {(bugFilter.status !== 'all' || bugFilter.source !== 'all' || bugFilter.priority !== 'all') && (
                          <button
                            onClick={() => setBugFilter({ status: 'all', source: 'all', priority: 'all' })}
                            className="px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                    {/* Bug List */}
                    <div className="md:col-span-2">
                      <GlassSurface className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Bug List ({bugItems.length})</h3>
                          <button
                            onClick={() => { fetchBugItems(); fetchBugStats(); }}
                            className="p-2 rounded-lg hover:bg-white/10"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                          {bugItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                              <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>No bugs found</p>
                              <p className="text-sm mt-2">Click &quot;Sync Bug Hunter&quot; to import discovered bugs</p>
                            </div>
                          ) : (
                            bugItems.map((bug) => (
                              <div
                                key={bug.id}
                                className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                onClick={() => fetchBugDetail(bug.id)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`w-2 h-2 rounded-full ${
                                        bug.priority === 'critical' ? 'bg-red-500' :
                                        bug.priority === 'high' ? 'bg-orange-500' :
                                        bug.priority === 'medium' ? 'bg-yellow-500' :
                                        'bg-blue-500'
                                      }`} />
                                      <span className="font-medium truncate">{bug.title}</span>
                                    </div>
                                    <div className="text-sm text-gray-400 truncate">{bug.pageUrl || bug.description}</div>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                      <span className={`px-1.5 py-0.5 rounded ${
                                        bug.source === 'bug_hunter' ? 'bg-orange-500/20 text-orange-400' :
                                        bug.source === 'user' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-gray-500/20 text-gray-400'
                                      }`}>
                                        {bug.source}
                                      </span>
                                      <span>•</span>
                                      <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                                      {bug.resolution && (
                                        <>
                                          <span>•</span>
                                          <CheckCircle className="w-3 h-3 text-green-400" />
                                          <span className="text-green-400">Fixed {new Date(bug.resolution.resolvedAt).toLocaleDateString()}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      bug.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                                      bug.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                      bug.status === 'confirmed' ? 'bg-orange-500/20 text-orange-400' :
                                      bug.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                      bug.status === 'closed' ? 'bg-gray-500/20 text-gray-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {bug.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </GlassSurface>
                    </div>

                    {/* Activity Timeline */}
                    <div>
                      <GlassSurface className="p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-violet-400" />
                          Recent Activity
                        </h3>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {bugTimeline.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              No activity yet
                            </div>
                          ) : (
                            bugTimeline.map((event) => (
                              <div key={event.id} className="flex gap-3 text-sm">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  event.action === 'created' ? 'bg-blue-500' :
                                  event.action === 'resolved' ? 'bg-green-500' :
                                  event.action === 'status_changed' ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-gray-300 truncate">{event.bugTitle}</div>
                                  <div className="text-gray-500 text-xs">
                                    {event.action.replace('_', ' ')} by {event.actorUsername || event.actorType}
                                  </div>
                                  <div className="text-gray-600 text-xs">{new Date(event.createdAt).toLocaleString()}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </GlassSurface>

                        {/* Resolution Stats */}
                        {bugStats?.avgResolutionTimeHours > 0 && (
                          <GlassSurface className="p-4 mt-4">
                            <h3 className="font-semibold mb-3 text-sm">Resolution Metrics</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Avg. Time to Fix</span>
                                <span className="font-medium">{bugStats.avgResolutionTimeHours.toFixed(1)}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Auto-Fix Success</span>
                                <span className="font-medium text-green-400">
                                  {bugStats?.autoFix?.completed || 0} / {(bugStats?.autoFix?.completed || 0) + (bugStats?.autoFix?.failed || 0)}
                                </span>
                              </div>
                            </div>
                          </GlassSurface>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              )}

              {/* Bug Detail Modal */}
              {bugDetailOpen && selectedBug && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                  <div className="bg-[#0f0f15] border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-[#0f0f15] border-b border-white/10 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bug className={`w-5 h-5 ${
                          selectedBug.priority === 'critical' ? 'text-red-500' :
                          selectedBug.priority === 'high' ? 'text-orange-500' :
                          selectedBug.priority === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <h2 className="font-bold text-lg truncate">{selectedBug.title}</h2>
                      </div>
                      <button
                        onClick={() => { setBugDetailOpen(false); setSelectedBug(null); }}
                        className="p-2 rounded-lg hover:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Status & Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedBug.status}
                          onChange={(e) => updateBugStatus(selectedBug.id, e.target.value)}
                          className="bg-white/10 border border-white/10 rounded-lg px-3 py-1 text-sm"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="wont_fix">{"Won't Fix"}</option>
                        </select>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedBug.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          selectedBug.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          selectedBug.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {selectedBug.priority}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-white/10 text-gray-400">
                          {selectedBug.source}
                        </span>
                        {selectedBug.status !== 'resolved' && selectedBug.status !== 'closed' && (
                          <button
                            onClick={() => resolveBug(selectedBug.id, 'manual_fix', 'Resolved manually')}
                            className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>

                      {/* URL */}
                      {selectedBug.pageUrl && (
                        <div className="p-3 bg-white/5 rounded-lg">
                          <h4 className="text-xs text-gray-500 mb-1">URL</h4>
                          <a href={selectedBug.pageUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline text-sm break-all">
                            {selectedBug.pageUrl}
                          </a>
                        </div>
                      )}

                      {/* Description */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                        <p className="text-gray-300 whitespace-pre-wrap text-sm">{selectedBug.description}</p>
                      </div>

                      {/* Root Cause */}
                      {selectedBug.rootCause && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <h4 className="text-sm font-medium text-orange-400 mb-2">Root Cause Analysis</h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-gray-500">Type:</span> <span className="text-gray-300">{selectedBug.rootCause.type}</span></div>
                            {selectedBug.rootCause.file && (
                              <div><span className="text-gray-500">File:</span> <code className="text-gray-300 bg-black/30 px-1 rounded">{selectedBug.rootCause.file}</code></div>
                            )}
                            {selectedBug.rootCause.hypothesis && (
                              <div><span className="text-gray-500">Hypothesis:</span> <span className="text-gray-300">{selectedBug.rootCause.hypothesis}</span></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Console Errors */}
                      {selectedBug.consoleErrors?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Console Errors</h4>
                          <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {selectedBug.consoleErrors.map((err, i) => (
                              <div key={i} className="text-xs text-red-400 font-mono mb-1">{err}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Network Errors */}
                      {selectedBug.networkErrors?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Network Errors</h4>
                          <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {selectedBug.networkErrors.map((err, i) => (
                              <div key={i} className="text-xs text-yellow-400 font-mono mb-1">{err}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resolution Info */}
                      {selectedBug.resolution && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Resolution Details
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-gray-500">Resolved:</span> <span className="text-gray-300">{new Date(selectedBug.resolution.resolvedAt).toLocaleString()}</span></div>
                            {selectedBug.resolution.resolvedBy && (
                              <div><span className="text-gray-500">By:</span> <span className="text-gray-300">@{selectedBug.resolution.resolvedBy}</span></div>
                            )}
                            {selectedBug.resolution.type && (
                              <div><span className="text-gray-500">Type:</span> <span className="text-gray-300">{selectedBug.resolution.type.replace('_', ' ')}</span></div>
                            )}
                            {selectedBug.resolution.notes && (
                              <div><span className="text-gray-500">Notes:</span> <span className="text-gray-300">{selectedBug.resolution.notes}</span></div>
                            )}
                            {selectedBug.resolution.commit && (
                              <div><span className="text-gray-500">Commit:</span> <code className="text-gray-300 bg-black/30 px-1 rounded">{selectedBug.resolution.commit}</code></div>
                            )}
                            {selectedBug.resolution.prUrl && (
                              <div><span className="text-gray-500">PR:</span> <a href={selectedBug.resolution.prUrl} className="text-violet-400 hover:underline">{selectedBug.resolution.prUrl}</a></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* History */}
                      {selectedBug.history?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">History</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {selectedBug.history.map((h) => (
                              <div key={h.id} className="flex gap-3 text-sm p-2 bg-white/5 rounded">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                  h.action === 'created' ? 'bg-blue-500' :
                                  h.action === 'resolved' ? 'bg-green-500' :
                                  h.action === 'status_changed' ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }`} />
                                <div className="flex-1">
                                  <div className="text-gray-300">
                                    <span className="font-medium">{h.actorUsername || h.actorType}</span>
                                    {' '}{h.action.replace('_', ' ')}
                                    {h.previousValue && h.newValue && (
                                      <span className="text-gray-500"> from {h.previousValue} to {h.newValue}</span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 text-xs">{new Date(h.createdAt).toLocaleString()}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related Bugs */}
                      {selectedBug.relatedBugs?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">Related Bugs</h4>
                          <div className="space-y-1">
                            {selectedBug.relatedBugs.map((r) => (
                              <div
                                key={r.id}
                                className="text-sm p-2 bg-white/5 rounded hover:bg-white/10 cursor-pointer"
                                onClick={() => fetchBugDetail(r.id)}
                              >
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                  r.status === 'resolved' ? 'bg-green-500' : 'bg-blue-500'
                                }`} />
                                {r.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Metrics Section */}
              {activeSection === 'metrics' && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 text-violet-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">System Metrics</h2>
                    <p className="text-gray-400 mb-4">View detailed system performance metrics</p>
                    <Link
                      to="/admin/metrics"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                    >
                      Open Metrics Dashboard <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Users Section */}
              {activeSection === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">User Management</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{users.length} users</span>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {users
                      .filter(u => !searchQuery ||
                        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((u) => (
                        <UserCard key={u.id} user={u} onAction={handleUserAction} />
                      ))}
                  </div>
                </div>
              )}

              {/* Community Section */}
              {activeSection === 'community' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <GlassSurface className="p-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-400" />
                        Live Activity
                      </h3>
                      <div className="text-center py-8 text-gray-400">
                        <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Activity feed loading...</p>
                      </div>
                    </GlassSurface>
                    <GlassSurface className="p-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-400" />
                        Community Stats
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Total Workouts</span>
                          <span className="font-bold">12,847</span>
                        </div>
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Active Today</span>
                          <span className="font-bold">234</span>
                        </div>
                        <div className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span>Achievements Earned</span>
                          <span className="font-bold">5,421</span>
                        </div>
                      </div>
                    </GlassSurface>
                  </div>
                  <div className="text-center">
                    <Link
                      to="/community"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                    >
                      Open Community Dashboard <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Messages Section */}
              {activeSection === 'messages' && (
                <div className="space-y-6">
                  <GlassSurface className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-400" />
                      Recent Conversations
                    </h3>
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No conversations yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {messages.slice(0, 10).map((msg) => (
                          <Link
                            key={msg.id}
                            to={`/messages?conversation=${msg.id}`}
                            className="block p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">
                                {msg.participant?.displayName || msg.participant?.username || 'Unknown'}
                              </span>
                              {msg.unreadCount > 0 && (
                                <span className="bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full">
                                  {msg.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 truncate">{msg.content}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'Just now'}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </GlassSurface>
                  <div className="text-center">
                    <Link
                      to="/messages"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                    >
                      Open Messages <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Economy Section */}
              {activeSection === 'economy' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Total Credits" value="∞" icon={Coins} color="#fbbf24" />
                    <StatCard title="Credits Gifted" value={economyStats?.totalGifted || 0} icon={Gift} color="#10b981" />
                    <StatCard title="Transactions" value={economyStats?.totalTransactions || 0} icon={Activity} color="#06b6d4" />
                    <StatCard title="Active Wallets" value={users.length} icon={Wallet} color="#8b5cf6" />
                  </div>
                  <GlassSurface className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-green-400" />
                      Quick Gift
                    </h3>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        placeholder="Search user..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={giftAmount}
                        onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
                        className="w-32 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-violet-500"
                      />
                      <button className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2">
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </div>
                  </GlassSurface>
                </div>
              )}

              {/* Avatar Section */}
              {activeSection === 'avatar' && (
                <div className="space-y-6">
                  <GlassSurface className="p-6">
                    <div className="flex items-center gap-6">
                      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 flex items-center justify-center text-white text-4xl font-bold shadow-2xl shadow-orange-500/30">
                        {user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-2xl font-bold">{user?.displayName || user?.username}</h2>
                          <Crown className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div className="text-gray-400 mb-3">{user?.email}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                            <Infinity className="w-4 h-4" /> Unlimited Credits
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/20 text-violet-400 rounded-full text-sm">
                            <Zap className="w-4 h-4" /> All Powers
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassSurface>

                  <div className="grid md:grid-cols-3 gap-4">
                    <GlassSurface className="p-4 text-center">
                      <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold">∞</div>
                      <div className="text-sm text-gray-400">Achievements</div>
                    </GlassSurface>
                    <GlassSurface className="p-4 text-center">
                      <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold">MAX</div>
                      <div className="text-sm text-gray-400">Level</div>
                    </GlassSurface>
                    <GlassSurface className="p-4 text-center">
                      <Star className="w-10 h-10 text-violet-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold">Owner</div>
                      <div className="text-sm text-gray-400">Rank</div>
                    </GlassSurface>
                  </div>

                  <GlassSurface className="p-4">
                    <h3 className="font-semibold mb-4">Owner Powers</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {OWNER_POWERS.map((power) => (
                        <button
                          key={power.id}
                          onClick={() => handleOwnerPower(power.id)}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-left"
                        >
                          <power.icon className="w-5 h-5" style={{ color: power.color }} />
                          <span className="text-sm">{power.name}</span>
                          <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                        </button>
                      ))}
                    </div>
                  </GlassSurface>
                </div>
              )}

              {/* Slack Section */}
              {activeSection === 'slack' && (
                <div className="space-y-6">
                  {/* Connection Status */}
                  <GlassSurface className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <Slack className="w-12 h-12 text-[#4A154B]" />
                      <div>
                        <h2 className="text-xl font-bold">Slack Integration</h2>
                        <p className="text-gray-400">Real-time notifications for your MuscleMap empire</p>
                      </div>
                      {slackConnected && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" /> Connected
                        </div>
                      )}
                    </div>

                    {!slackConnected ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Connect your Slack workspace to receive real-time notifications about new users, bug reports, feedback, deployments, and more.
                        </p>
                        <div className="flex gap-2 max-w-lg">
                          <input
                            type="text"
                            placeholder="https://hooks.slack.com/services/..."
                            value={slackWebhookUrl}
                            onChange={(e) => {
                              setSlackWebhookUrl(e.target.value);
                              setSlackError(null);
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500"
                          />
                          <button
                            onClick={handleConnectSlack}
                            disabled={slackConnecting || !slackWebhookUrl}
                            className="px-6 py-3 bg-[#4A154B] hover:bg-[#611f69] disabled:bg-[#4A154B]/50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                          >
                            {slackConnecting ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Slack className="w-5 h-5" />
                            )}
                            Connect
                          </button>
                        </div>
                        {slackError && (
                          <p className="text-sm text-red-400">{slackError}</p>
                        )}
                        <p className="text-xs text-gray-600">
                          <a
                            href="https://api.slack.com/messaging/webhooks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline"
                          >
                            Learn how to create a Slack webhook
                          </a>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-sm text-gray-400">Webhook URL</span>
                          <code className="text-sm text-green-400">{slackWebhookUrl.replace(/\/[^\/]+$/, '/****')}</code>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/admin/slack/send-digest', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: 'daily' })
                                });
                                if (res.ok) {
                                  setSlackMessages(prev => [...prev, { text: 'Daily digest sent!', user: 'System', time: 'Just now' }]);
                                }
                              } catch { /* ignore */ }
                            }}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm"
                          >
                            Send Daily Digest
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/admin/slack/send-digest', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ type: 'weekly' })
                                });
                                if (res.ok) {
                                  setSlackMessages(prev => [...prev, { text: 'Weekly digest sent!', user: 'System', time: 'Just now' }]);
                                }
                              } catch { /* ignore */ }
                            }}
                            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm"
                          >
                            Send Weekly Digest
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem('musclemap_slack_webhook');
                              setSlackConnected(false);
                              setSlackWebhookUrl('');
                            }}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm ml-auto"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    )}
                  </GlassSurface>

                  {/* Notification Types */}
                  {slackConnected && (
                    <GlassSurface className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-400" />
                        Notification Types
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        These notifications are automatically sent to your Slack channel:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          { icon: '🚨', name: 'System Alerts', desc: 'CPU, memory, error thresholds', enabled: true },
                          { icon: '🚀', name: 'Deployments', desc: 'Deploy start, complete, fail', enabled: true },
                          { icon: '👋', name: 'New Users', desc: 'When someone signs up', enabled: true },
                          { icon: '🏆', name: 'Achievements', desc: 'Level ups, milestones', enabled: true },
                          { icon: '🐛', name: 'Bug Reports', desc: 'User-submitted bugs', enabled: true },
                          { icon: '💬', name: 'Feedback', desc: 'Feature requests, questions', enabled: true },
                          { icon: '❌', name: 'Errors', desc: 'Application exceptions', enabled: true },
                          { icon: '☀️', name: 'Daily Digest', desc: '9 AM UTC summary', enabled: true },
                          { icon: '📅', name: 'Weekly Digest', desc: 'Monday summary', enabled: true },
                          { icon: '💰', name: 'Economy Events', desc: 'Large transactions', enabled: true },
                          { icon: '👥', name: 'Community', desc: 'Crews, competitions', enabled: true },
                          { icon: '🛡️', name: 'Security', desc: 'Failed logins, blocks', enabled: true },
                        ].map((notif) => (
                          <div key={notif.name} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                            <span className="text-xl">{notif.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{notif.name}</div>
                              <div className="text-xs text-gray-500 truncate">{notif.desc}</div>
                            </div>
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </GlassSurface>
                  )}

                  {/* Recent Messages */}
                  {slackConnected && slackMessages.length > 0 && (
                    <GlassSurface className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                        Recent Activity
                      </h3>
                      <div className="space-y-2">
                        {slackMessages.slice(-5).reverse().map((msg, i) => (
                          <div key={i} className="p-3 bg-white/5 rounded-lg">
                            <div className="text-sm">{msg.text}</div>
                            <div className="text-xs text-gray-500 mt-1">{msg.user} · {msg.time}</div>
                          </div>
                        ))}
                      </div>
                    </GlassSurface>
                  )}
                </div>
              )}

              {/* Analytics Section */}
              {activeSection === 'analytics' && (
                <div className="space-y-6">
                  {/* GA4 Quick Links */}
                  <GlassSurface className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        Google Analytics 4
                      </h3>
                      <span className="text-xs text-gray-500 font-mono">{GA_PROPERTY_ID}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <a
                        href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/reportinghub`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <BarChart3 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Reports Overview</div>
                          <div className="text-xs text-gray-500">View all reports</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/dashboard?params=_u..nav%3Dmaui`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Real-Time</div>
                          <div className="text-xs text-gray-500">Live visitors</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/acquisition-overview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">User Acquisition</div>
                          <div className="text-xs text-gray-500">Traffic sources</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/engagement-overview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <Heart className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Engagement</div>
                          <div className="text-xs text-gray-500">User behavior</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/retention-overview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-pink-500/20 rounded-lg">
                          <RefreshCw className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Retention</div>
                          <div className="text-xs text-gray-500">User return rate</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                      <a
                        href={`https://analytics.google.com/analytics/web/#/p${GA_PROPERTY_ID.replace('G-', '')}/reports/explorer-events`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 group"
                      >
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                          <Zap className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Events</div>
                          <div className="text-xs text-gray-500">Custom events</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                    </div>
                  </GlassSurface>

                  {/* Tracked Events Info */}
                  <GlassSurface className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      Tracked Events
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { name: 'sign_up', description: 'User registration', color: 'green' },
                        { name: 'login', description: 'User login', color: 'blue' },
                        { name: 'page_view', description: 'Page navigation', color: 'purple' },
                        { name: 'workout_complete', description: 'Workout finished', color: 'yellow' },
                        { name: 'archetype_selected', description: 'Archetype chosen', color: 'pink' },
                        { name: 'community_join', description: 'Joined community', color: 'cyan' },
                        { name: 'achievement_unlocked', description: 'Achievement earned', color: 'orange' },
                        { name: 'level_up', description: 'Level increased', color: 'violet' },
                        { name: 'credits_purchased', description: 'Credits bought', color: 'emerald' },
                      ].map((event) => (
                        <div
                          key={event.name}
                          className="p-3 bg-white/5 rounded-lg flex items-center gap-3"
                        >
                          <div className={`w-2 h-2 rounded-full bg-${event.color}-400`} />
                          <div>
                            <div className="text-sm font-mono">{event.name}</div>
                            <div className="text-xs text-gray-500">{event.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassSurface>

                  {/* GA4 Info Box */}
                  <GlassSurface className="p-4 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">About Google Analytics Integration</h4>
                        <p className="text-sm text-gray-400 mb-3">
                          MuscleMap tracks user behavior with GA4 to help understand how people use the app.
                          Page views, signups, logins, and key actions are automatically tracked.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href="https://analytics.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                          >
                            Open GA4 Dashboard <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-gray-600">|</span>
                          <a
                            href="https://support.google.com/analytics/answer/9304153"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
                          >
                            GA4 Documentation <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </GlassSurface>
                </div>
              )}

              {/* Settings Section */}
              {activeSection === 'settings' && (
                <div className="space-y-6">
                  <GlassSurface className="p-4">
                    <h3 className="font-semibold mb-4">Empire Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span>Maintenance Mode</span>
                        <button className="px-3 py-1 bg-white/10 rounded text-sm">Disabled</button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span>New User Registration</span>
                        <button className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm">Enabled</button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span>API Rate Limiting</span>
                        <button className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm">Enabled</button>
                      </div>
                    </div>
                  </GlassSurface>
                  <div className="flex gap-4 flex-wrap">
                    <Link
                      to="/admin-control"
                      className="flex-1 min-w-[200px] text-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      Admin Control Panel
                    </Link>
                    <Link
                      to="/admin/monitoring"
                      className="flex-1 min-w-[200px] text-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      System Monitoring
                    </Link>
                    <Link
                      to="/live"
                      className="flex-1 min-w-[200px] text-center px-6 py-3 bg-gradient-to-r from-blue-500/20 to-violet-500/20 hover:from-blue-500/30 hover:to-violet-500/30 border border-blue-500/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      Live Activity
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Gift Modal */}
      {giftModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <GlassSurface className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-400" />
              Gift Credits
            </h3>
            <p className="text-gray-400 mb-4">
              Send credits to <strong>{selectedUser.displayName || selectedUser.username}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Amount</label>
              <input
                type="number"
                value={giftAmount}
                onChange={(e) => setGiftAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setGiftModalOpen(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={giftCredits}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                Send Gift
              </button>
            </div>
          </GlassSurface>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parsePrometheusMetrics(text) {
  const metrics = {};
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;

    const match = line.match(/^(\w+)(?:\{([^}]*)\})?\s+(.+)$/);
    if (match) {
      const [, name, labels, value] = match;
      const numValue = parseFloat(value);

      if (!metrics[name]) {
        metrics[name] = [];
      }

      if (labels) {
        const labelObj = {};
        labels.split(',').forEach(pair => {
          const [k, v] = pair.split('=');
          labelObj[k] = v?.replace(/"/g, '');
        });
        metrics[name].push({ labels: labelObj, value: numValue });
      } else {
        metrics[name].push({ value: numValue });
      }
    }
  }

  return metrics;
}
