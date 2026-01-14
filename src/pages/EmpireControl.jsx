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

import React, { useState, useEffect, useCallback, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlassSurface from '../components/glass/GlassSurface';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  CheckCircle,
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  Globe,
  Heart,
  Infinity,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreVertical,
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
  Users,
  Wallet,
  Zap,
  TrendingUp,
  ExternalLink,
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
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'metrics', label: 'System Metrics', icon: BarChart3 },
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
  const [_slackMessages, _setSlackMessages] = useState([]);
  const [_slackConnected, _setSlackConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [giftAmount, setGiftAmount] = useState(100);

  // Get auth header
  const getAuthHeader = useCallback(() => {
    try {
      const authData = localStorage.getItem('musclemap-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return { Authorization: `Bearer ${parsed?.state?.token}` };
      }
    } catch (_e) {}
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
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
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
    } catch (e) {
      console.error('Failed to fetch users:', e);
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
    } catch (e) {
      console.error('Failed to fetch economy stats:', e);
    }
  }, [getAuthHeader]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages', {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
  }, [getAuthHeader]);

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
    } catch (e) {
      console.error('Failed to gift credits:', e);
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
        console.log('Action:', action, targetUser);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMetrics(),
        fetchUsers(),
        fetchEconomyStats(),
        fetchMessages(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchMetrics, fetchUsers, fetchEconomyStats, fetchMessages]);

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
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
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
                          onClick={() => console.log('Power:', power.id)}
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
                      Recent Messages
                    </h3>
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {messages.slice(0, 10).map((msg, i) => (
                          <div key={i} className="p-3 bg-white/5 rounded-lg">
                            <div className="text-sm">{msg.content || msg.message}</div>
                            <div className="text-xs text-gray-500 mt-1">{msg.createdAt || 'Just now'}</div>
                          </div>
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
                        <div key={power.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                          <power.icon className="w-5 h-5" style={{ color: power.color }} />
                          <span className="text-sm">{power.name}</span>
                          <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </GlassSurface>
                </div>
              )}

              {/* Slack Section */}
              {activeSection === 'slack' && (
                <div className="space-y-6">
                  <GlassSurface className="p-6 text-center">
                    <Slack className="w-16 h-16 text-[#4A154B] mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Slack Integration</h2>
                    <p className="text-gray-400 mb-6">Connect to your MuscleMap.ME Slack channel</p>

                    {slackConnected ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2 text-green-400">
                          <CheckCircle className="w-5 h-5" />
                          <span>Connected to #musclemap-me</span>
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                          {slackMessages.map((msg, i) => (
                            <div key={i} className="p-3 bg-white/5 rounded-lg text-left">
                              <div className="text-sm">{msg.text}</div>
                              <div className="text-xs text-gray-500 mt-1">{msg.user} · {msg.time}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          To integrate Slack, you&apos;ll need to create a Slack App and add its webhook URL.
                        </p>
                        <input
                          type="text"
                          placeholder="Slack Webhook URL"
                          className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-violet-500"
                        />
                        <button className="px-6 py-3 bg-[#4A154B] hover:bg-[#611f69] rounded-lg transition-colors flex items-center gap-2 mx-auto">
                          <Slack className="w-5 h-5" /> Connect Slack
                        </button>
                      </div>
                    )}
                  </GlassSurface>
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
