/**
 * Admin Metrics Dashboard
 *
 * Beautiful visual dashboard for Prometheus metrics with:
 * - Real-time gauges for connections and health
 * - Time-series charts for request latency
 * - Status indicators with animations
 * - Auto-refresh every 10 seconds
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import GlassSurface from '../components/glass/GlassSurface';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  MemoryStick,
  RefreshCw,
  Timer,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Parse Prometheus text format
function parsePrometheusMetrics(text) {
  const metrics = {};
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;

    // Parse metric line: metric_name{labels} value
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

// Animated gauge component
function AnimatedGauge({ value, max, label, unit = '', color = '#8b5cf6', size = 120 }) {
  const percentage = Math.min((value / max) * 100, 100);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
          {unit && <span className="text-xs text-gray-400">{unit}</span>}
        </div>
      </div>
      <span className="text-sm text-gray-400 mt-2">{label}</span>
    </div>
  );
}

// Status indicator with pulse animation
function StatusIndicator({ status, label, sublabel }) {
  const colors = {
    healthy: { bg: 'bg-green-500', glow: 'shadow-green-500/50' },
    degraded: { bg: 'bg-yellow-500', glow: 'shadow-yellow-500/50' },
    unhealthy: { bg: 'bg-red-500', glow: 'shadow-red-500/50' },
    connected: { bg: 'bg-green-500', glow: 'shadow-green-500/50' },
    disconnected: { bg: 'bg-red-500', glow: 'shadow-red-500/50' },
  };

  const { bg, glow } = colors[status] || colors.healthy;

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${bg} ${glow} shadow-lg`} />
        {status === 'healthy' || status === 'connected' ? (
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${bg} animate-ping opacity-75`} />
        ) : null}
      </div>
      <div>
        <div className="text-sm font-medium capitalize">{label}</div>
        {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
      </div>
    </div>
  );
}

// Metric card with trend indicator
function MetricCard({ title, value, unit, icon: Icon, trend, trendValue, color = '#8b5cf6' }) {
  return (
    <GlassSurface className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">{title}</div>
          <div className="text-2xl font-bold" style={{ color }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendValue}
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

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminMetrics() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [history, setHistory] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/metrics');
      if (res.ok) {
        const text = await res.text();
        const parsed = parsePrometheusMetrics(text);
        setMetrics(parsed);
        setLastUpdated(new Date());

        // Add to history for charts
        setHistory(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            requests: parsed.musclemap_http_requests_total?.[0]?.value || 0,
            errors: parsed.musclemap_http_errors_total?.[0]?.value || 0,
            p50: parsed.musclemap_http_request_duration_ms?.find(m => m.labels?.quantile === '0.5')?.value || 0,
            p99: parsed.musclemap_http_request_duration_ms?.find(m => m.labels?.quantile === '0.99')?.value || 0,
            heapUsed: (parsed.musclemap_memory_heap_used_bytes?.[0]?.value || 0) / 1024 / 1024,
            eventLoop: parsed.musclemap_event_loop_lag_ms?.[0]?.value || 0,
          };
          const updated = [...prev, newPoint].slice(-30); // Keep last 30 points
          return updated;
        });
      }
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin access required</p>
          <Link to="/dashboard" className="mt-4 inline-block text-violet-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Extract metric values
  const uptime = metrics?.musclemap_uptime_seconds?.[0]?.value || 0;
  const totalRequests = metrics?.musclemap_http_requests_total?.[0]?.value || 0;
  const totalErrors = metrics?.musclemap_http_errors_total?.[0]?.value || 0;
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0;

  const dbConnections = metrics?.musclemap_db_connections_total?.[0]?.value || 0;
  const dbIdle = metrics?.musclemap_db_connections_idle?.[0]?.value || 0;
  const dbWaiting = metrics?.musclemap_db_connections_waiting?.[0]?.value || 0;
  const dbHealthy = metrics?.musclemap_db_healthy?.[0]?.value === 1;

  const redisConnected = metrics?.musclemap_redis_connected?.[0]?.value === 1;

  const cacheHits = metrics?.musclemap_graphql_cache_hits_total?.[0]?.value || 0;
  const cacheMisses = metrics?.musclemap_graphql_cache_misses_total?.[0]?.value || 0;
  const cacheHitRate = metrics?.musclemap_graphql_cache_hit_rate?.[0]?.value || 0;

  const heapUsed = metrics?.musclemap_memory_heap_used_bytes?.[0]?.value || 0;
  const heapTotal = metrics?.musclemap_memory_heap_total_bytes?.[0]?.value || 0;
  const rss = metrics?.musclemap_memory_rss_bytes?.[0]?.value || 0;

  const eventLoopLag = metrics?.musclemap_event_loop_lag_ms?.[0]?.value || 0;

  // Latency percentiles
  const p50 = metrics?.musclemap_http_request_duration_ms?.find(m => m.labels?.quantile === '0.5')?.value || 0;
  const p90 = metrics?.musclemap_http_request_duration_ms?.find(m => m.labels?.quantile === '0.9')?.value || 0;
  const p95 = metrics?.musclemap_http_request_duration_ms?.find(m => m.labels?.quantile === '0.95')?.value || 0;
  const p99 = metrics?.musclemap_http_request_duration_ms?.find(m => m.labels?.quantile === '0.99')?.value || 0;

  // Status codes
  const statusCodes = metrics?.musclemap_http_requests_by_status || [];
  const statusData = statusCodes.map(s => ({
    name: s.labels?.status || 'unknown',
    value: s.value,
  }));

  // Format uptime
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin-control" className="text-gray-400 hover:text-white">
                ← Admin
              </Link>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Gauge className="w-6 h-6 text-violet-400" />
                System Metrics
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-white/10 border-white/20"
                />
                Auto-refresh
              </label>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading && !metrics ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : (
          <>
            {/* Status Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GlassSurface className="p-4">
                <StatusIndicator
                  status={dbHealthy ? 'healthy' : 'unhealthy'}
                  label="PostgreSQL"
                  sublabel={`${dbConnections} connections`}
                />
              </GlassSurface>
              <GlassSurface className="p-4">
                <StatusIndicator
                  status={redisConnected ? 'connected' : 'disconnected'}
                  label="Redis"
                  sublabel={redisConnected ? 'Connected' : 'Disconnected'}
                />
              </GlassSurface>
              <GlassSurface className="p-4">
                <StatusIndicator
                  status={eventLoopLag < 50 ? 'healthy' : eventLoopLag < 100 ? 'degraded' : 'unhealthy'}
                  label="Event Loop"
                  sublabel={`${eventLoopLag.toFixed(2)}ms lag`}
                />
              </GlassSurface>
              <GlassSurface className="p-4">
                <StatusIndicator
                  status={parseFloat(errorRate) < 1 ? 'healthy' : parseFloat(errorRate) < 5 ? 'degraded' : 'unhealthy'}
                  label="Error Rate"
                  sublabel={`${errorRate}%`}
                />
              </GlassSurface>
            </div>

            {/* Gauges Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <GlassSurface className="p-6 flex justify-center">
                <AnimatedGauge
                  value={formatUptime(uptime)}
                  max={1}
                  label="Uptime"
                  color="#10b981"
                  size={100}
                />
              </GlassSurface>
              <GlassSurface className="p-6 flex justify-center">
                <AnimatedGauge
                  value={totalRequests}
                  max={10000}
                  label="Total Requests"
                  color="#8b5cf6"
                  size={100}
                />
              </GlassSurface>
              <GlassSurface className="p-6 flex justify-center">
                <AnimatedGauge
                  value={dbConnections}
                  max={20}
                  label="DB Connections"
                  color="#06b6d4"
                  size={100}
                />
              </GlassSurface>
              <GlassSurface className="p-6 flex justify-center">
                <AnimatedGauge
                  value={(cacheHitRate * 100).toFixed(0)}
                  max={100}
                  label="Cache Hit Rate"
                  unit="%"
                  color="#f59e0b"
                  size={100}
                />
              </GlassSurface>
              <GlassSurface className="p-6 flex justify-center">
                <AnimatedGauge
                  value={Math.round(heapUsed / 1024 / 1024)}
                  max={Math.round(heapTotal / 1024 / 1024)}
                  label="Heap Used"
                  unit="MB"
                  color="#ef4444"
                  size={100}
                />
              </GlassSurface>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Request Latency Chart */}
              <GlassSurface className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-violet-400" />
                  Request Latency (ms)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorP99" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
                        dataKey="p50"
                        stroke="#8b5cf6"
                        fill="url(#colorP50)"
                        name="P50"
                      />
                      <Area
                        type="monotone"
                        dataKey="p99"
                        stroke="#ef4444"
                        fill="url(#colorP99)"
                        name="P99"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassSurface>

              {/* Memory Usage Chart */}
              <GlassSurface className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MemoryStick className="w-5 h-5 text-cyan-400" />
                  Memory Usage (MB)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
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
                      <Line
                        type="monotone"
                        dataKey="heapUsed"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={false}
                        name="Heap Used"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassSurface>
            </div>

            {/* Status Codes & Latency Percentiles */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Status Code Distribution */}
              <GlassSurface className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Response Status Distribution
                </h3>
                <div className="flex items-center gap-8">
                  <div className="h-48 w-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(10,10,15,0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {statusData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{entry.name}</span>
                        </div>
                        <span className="font-mono text-sm">{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassSurface>

              {/* Latency Percentiles */}
              <GlassSurface className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Latency Percentiles (ms)
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'P50', value: p50, fill: '#10b981' },
                        { name: 'P90', value: p90, fill: '#06b6d4' },
                        { name: 'P95', value: p95, fill: '#f59e0b' },
                        { name: 'P99', value: p99, fill: '#ef4444' },
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="#666" fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke="#666" fontSize={12} width={40} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(10,10,15,0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [`${value.toFixed(2)}ms`]}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {[
                          { name: 'P50', fill: '#10b981' },
                          { name: 'P90', fill: '#06b6d4' },
                          { name: 'P95', fill: '#f59e0b' },
                          { name: 'P99', fill: '#ef4444' },
                        ].map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassSurface>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Requests"
                value={totalRequests}
                icon={Activity}
                color="#8b5cf6"
              />
              <MetricCard
                title="Total Errors"
                value={totalErrors}
                icon={AlertTriangle}
                color="#ef4444"
              />
              <MetricCard
                title="DB Idle"
                value={dbIdle}
                icon={Database}
                color="#06b6d4"
              />
              <MetricCard
                title="DB Waiting"
                value={dbWaiting}
                icon={Clock}
                color="#f59e0b"
              />
              <MetricCard
                title="Cache Hits"
                value={cacheHits}
                icon={CheckCircle}
                color="#10b981"
              />
              <MetricCard
                title="Cache Misses"
                value={cacheMisses}
                icon={XCircle}
                color="#ef4444"
              />
              <MetricCard
                title="RSS Memory"
                value={Math.round(rss / 1024 / 1024)}
                unit="MB"
                icon={MemoryStick}
                color="#8b5cf6"
              />
              <MetricCard
                title="Event Loop Lag"
                value={eventLoopLag.toFixed(2)}
                unit="ms"
                icon={Timer}
                color={eventLoopLag < 50 ? '#10b981' : eventLoopLag < 100 ? '#f59e0b' : '#ef4444'}
              />
            </div>

            {/* Raw Metrics Link */}
            <div className="text-center text-sm text-gray-500">
              <a
                href="/metrics"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-violet-400 transition-colors"
              >
                View raw Prometheus metrics →
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
