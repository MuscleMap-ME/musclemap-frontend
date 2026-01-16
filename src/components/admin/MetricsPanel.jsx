/**
 * Metrics Panel Component
 *
 * Real-time metrics dashboard for monitoring API performance:
 * - Live metrics cards with sparkline charts
 * - Per-endpoint statistics table with sorting
 * - Latency percentiles (p50, p95, p99)
 * - WebSocket connection count
 * - Auto-refreshing via WebSocket every 5 seconds
 * - Time range selector for historical view
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Clock,
  Gauge,
  Loader2,
  Radio,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api';

const TIME_RANGES = [
  { id: '5m', label: '5 min', seconds: 300 },
  { id: '15m', label: '15 min', seconds: 900 },
  { id: '1h', label: '1 hour', seconds: 3600 },
  { id: '6h', label: '6 hours', seconds: 21600 },
  { id: '24h', label: '24 hours', seconds: 86400 },
];

const METRIC_COLORS = {
  requests: '#3b82f6', // Blue
  errors: '#ef4444',   // Red
  latency: '#f59e0b',  // Amber
  users: '#10b981',    // Green
  websocket: '#8b5cf6', // Purple
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(decimals);
}

function formatLatency(ms) {
  if (ms === null || ms === undefined) return '0ms';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

function formatPercent(value) {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(2)}%`;
}

function getTrendDirection(current, previous) {
  if (!previous || current === previous) return 'neutral';
  return current > previous ? 'up' : 'down';
}

function getTrendColor(direction, metric) {
  // For errors, up is bad, down is good
  if (metric === 'errors') {
    return direction === 'up' ? 'text-red-400' : direction === 'down' ? 'text-green-400' : 'text-gray-400';
  }
  // For latency, up is bad, down is good
  if (metric === 'latency') {
    return direction === 'up' ? 'text-red-400' : direction === 'down' ? 'text-green-400' : 'text-gray-400';
  }
  // For requests and users, up is good
  return direction === 'up' ? 'text-green-400' : direction === 'down' ? 'text-red-400' : 'text-gray-400';
}

// ============================================
// SUBCOMPONENTS
// ============================================

/**
 * Mini sparkline chart using SVG
 */
function Sparkline({ data, color, height = 40, width = 100 }) {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center bg-white/5 rounded"
        style={{ height, width }}
      >
        <span className="text-xs text-gray-500">No data</span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(' ');

  // Create gradient fill path
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={fillPoints}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point indicator */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height * 0.8 - height * 0.1}
        r="3"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
}

/**
 * Metrics card with value, trend, and sparkline
 */
function MetricCard({ title, value, unit, trend: _trend, trendValue, sparklineData, color, icon: Icon, isLoading }) {
  const trendDirection = getTrendDirection(value, trendValue);
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Activity;

  return (
    <GlassSurface className="p-4 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-10 blur-3xl"
        style={{ backgroundColor: color }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-sm font-medium text-gray-300">{title}</span>
          </div>
          {trendDirection !== 'neutral' && (
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(trendDirection, title.toLowerCase())}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendDirection === 'up' ? '+' : '-'}{Math.abs(((value - trendValue) / trendValue) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1 mb-3">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          ) : (
            <>
              <span className="text-3xl font-bold text-white transition-all duration-300">
                {typeof value === 'number' ? formatNumber(value, 1) : value}
              </span>
              {unit && <span className="text-sm text-gray-400">{unit}</span>}
            </>
          )}
        </div>

        {/* Sparkline */}
        <div className="flex justify-end">
          <Sparkline data={sparklineData} color={color} width={120} height={32} />
        </div>
      </div>
    </GlassSurface>
  );
}

/**
 * Latency percentiles display
 */
function LatencyPercentiles({ percentiles, isLoading }) {
  const items = [
    { label: 'p50', value: percentiles?.p50, description: 'Median' },
    { label: 'p95', value: percentiles?.p95, description: '95th' },
    { label: 'p99', value: percentiles?.p99, description: '99th' },
  ];

  const getLatencyColor = (ms) => {
    if (!ms) return 'text-gray-400';
    if (ms < 100) return 'text-green-400';
    if (ms < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <GlassSurface className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Latency Percentiles</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map(({ label, value, description }) => (
            <div key={label} className="text-center">
              <div className="text-xs text-gray-400 mb-1">{description}</div>
              <div className={`text-xl font-bold ${getLatencyColor(value)}`}>
                {formatLatency(value)}
              </div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Visual bar representation */}
      <div className="mt-4 space-y-2">
        {items.map(({ label, value }) => {
          const maxLatency = Math.max(percentiles?.p99 || 100, 100);
          const width = ((value || 0) / maxLatency) * 100;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="w-8 text-xs text-gray-400">{label}</div>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    (value || 0) < 100 ? 'bg-green-500' :
                    (value || 0) < 500 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(width, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassSurface>
  );
}

/**
 * WebSocket connection status
 */
function WebSocketStatus({ connected, connectionCount, lastUpdate }) {
  return (
    <GlassSurface className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <h3 className="text-sm font-semibold text-white">WebSocket</h3>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
          connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Active Connections</div>
          <div className="text-2xl font-bold text-white">{connectionCount || 0}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Last Update</div>
          <div className="text-sm font-medium text-white">
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>
    </GlassSurface>
  );
}

/**
 * Per-endpoint statistics table with sorting
 */
function EndpointTable({ endpoints, isLoading, sortConfig, onSort }) {
  const columns = [
    { key: 'endpoint', label: 'Endpoint', sortable: true },
    { key: 'method', label: 'Method', sortable: true },
    { key: 'requests', label: 'Requests', sortable: true },
    { key: 'errors', label: 'Errors', sortable: true },
    { key: 'errorRate', label: 'Error Rate', sortable: true },
    { key: 'avgLatency', label: 'Avg Latency', sortable: true },
    { key: 'p99Latency', label: 'p99 Latency', sortable: true },
  ];

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-500/20 text-green-400',
      POST: 'bg-blue-500/20 text-blue-400',
      PUT: 'bg-yellow-500/20 text-yellow-400',
      DELETE: 'bg-red-500/20 text-red-400',
      PATCH: 'bg-purple-500/20 text-purple-400',
    };
    return colors[method] || 'bg-gray-500/20 text-gray-400';
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-gray-500" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 text-cyan-400" />
      : <ArrowDown className="w-3 h-3 text-cyan-400" />;
  };

  return (
    <GlassSurface className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Endpoint Statistics</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-medium text-gray-400 pb-3 pr-4 ${
                    col.sortable ? 'cursor-pointer hover:text-white select-none' : ''
                  }`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                </td>
              </tr>
            ) : endpoints?.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-400 text-sm">
                  No endpoint data available
                </td>
              </tr>
            ) : (
              endpoints?.map((endpoint, index) => (
                <tr
                  key={`${endpoint.method}-${endpoint.endpoint}-${index}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <code className="text-xs text-gray-300 font-mono">
                      {endpoint.endpoint}
                    </code>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-white font-medium">
                    {formatNumber(endpoint.requests)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-sm ${endpoint.errors > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {formatNumber(endpoint.errors)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-sm ${
                      endpoint.errorRate > 5 ? 'text-red-400' :
                      endpoint.errorRate > 1 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {formatPercent(endpoint.errorRate)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-sm ${
                      endpoint.avgLatency > 500 ? 'text-red-400' :
                      endpoint.avgLatency > 200 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {formatLatency(endpoint.avgLatency)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-sm ${
                      endpoint.p99Latency > 1000 ? 'text-red-400' :
                      endpoint.p99Latency > 500 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {formatLatency(endpoint.p99Latency)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassSurface>
  );
}

/**
 * Time range selector
 */
function TimeRangeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.id}
          onClick={() => onChange(range.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === range.id
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MetricsPanel() {
  // State
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('5m');
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'requests', direction: 'desc' });

  // Sparkline history (keep last 20 data points)
  const [history, setHistory] = useState({
    requests: [],
    errors: [],
    latency: [],
    users: [],
  });

  // Refs
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Get auth token
  const getAuthHeader = useCallback(() => {
    try {
      // Try musclemap-auth (Zustand store)
      const authData = localStorage.getItem('musclemap-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.state?.token) {
          return { Authorization: `Bearer ${parsed.state.token}` };
        }
      }
      // Fallback to legacy token
      const token = localStorage.getItem('musclemap_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (e) {
      console.error('Failed to get auth header:', e);
      return {};
    }
  }, []);

  // Fetch metrics via REST
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/metrics?range=${timeRange}`, {
        headers: getAuthHeader(),
      });

      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setLastUpdate(Date.now());

        // Update history for sparklines
        setHistory((prev) => ({
          requests: [...prev.requests.slice(-19), data.requestsPerSecond || 0],
          errors: [...prev.errors.slice(-19), data.errorRate || 0],
          latency: [...prev.latency.slice(-19), data.avgLatency || 0],
          users: [...prev.users.slice(-19), data.activeUsers || 0],
        }));
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, timeRange]);

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      console.error('No auth token for WebSocket');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/admin/metrics/stream?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Metrics WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'metrics') {
            setMetrics((prev) => ({ ...prev, ...data.metrics }));
            setLastUpdate(Date.now());

            // Update history
            setHistory((prev) => ({
              requests: [...prev.requests.slice(-19), data.metrics.requestsPerSecond || 0],
              errors: [...prev.errors.slice(-19), data.metrics.errorRate || 0],
              latency: [...prev.latency.slice(-19), data.metrics.avgLatency || 0],
              users: [...prev.users.slice(-19), data.metrics.activeUsers || 0],
            }));
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = (error) => {
        console.error('Metrics WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('Metrics WebSocket disconnected');
        setWsConnected(false);

        // Attempt reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setWsConnected(false);
    }
  }, []);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Sort endpoints
  const sortedEndpoints = useMemo(() => {
    if (!metrics?.endpoints) return [];

    return [...metrics.endpoints].sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [metrics?.endpoints, sortConfig]);

  // Handle sort
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // Initial load and WebSocket setup
  useEffect(() => {
    fetchMetrics();
    connectWebSocket();

    // Fallback polling every 5 seconds if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!wsConnected) {
        fetchMetrics();
      }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      disconnectWebSocket();
    };
  }, [fetchMetrics, connectWebSocket, disconnectWebSocket, wsConnected]);

  // Refetch when time range changes
  useEffect(() => {
    fetchMetrics();
  }, [timeRange, fetchMetrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Real-Time Metrics
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Monitor API performance and system health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live indicator */}
      {wsConnected && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Live updates enabled</span>
        </div>
      )}

      {/* Main metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Requests/sec"
          value={metrics?.requestsPerSecond}
          unit="req/s"
          trend="up"
          trendValue={history.requests[history.requests.length - 2]}
          sparklineData={history.requests}
          color={METRIC_COLORS.requests}
          icon={Zap}
          isLoading={loading}
        />
        <MetricCard
          title="Error Rate"
          value={metrics?.errorRate}
          unit="%"
          trend="down"
          trendValue={history.errors[history.errors.length - 2]}
          sparklineData={history.errors}
          color={METRIC_COLORS.errors}
          icon={AlertTriangle}
          isLoading={loading}
        />
        <MetricCard
          title="Avg Latency"
          value={metrics?.avgLatency}
          unit="ms"
          trend="down"
          trendValue={history.latency[history.latency.length - 2]}
          sparklineData={history.latency}
          color={METRIC_COLORS.latency}
          icon={Clock}
          isLoading={loading}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers}
          unit="users"
          trend="up"
          trendValue={history.users[history.users.length - 2]}
          sparklineData={history.users}
          color={METRIC_COLORS.users}
          icon={Users}
          isLoading={loading}
        />
      </div>

      {/* Latency percentiles and WebSocket status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LatencyPercentiles
          percentiles={metrics?.percentiles}
          isLoading={loading}
        />
        <WebSocketStatus
          connected={wsConnected}
          connectionCount={metrics?.websocketConnections}
          lastUpdate={lastUpdate}
        />
      </div>

      {/* Endpoint statistics table */}
      <EndpointTable
        endpoints={sortedEndpoints}
        isLoading={loading}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </div>
  );
}
