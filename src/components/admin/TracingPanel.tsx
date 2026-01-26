/**
 * Tracing Panel Component
 *
 * Distributed tracing visualization interface with:
 * - Timeline view of traces
 * - Waterfall view of span hierarchy
 * - Filtering by user, time, status, operation type
 * - Trace detail modal with full span breakdown
 * - Statistics dashboard
 * - Auto-refresh capability
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Filter,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Server,
  User,
  X,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/traces';

const OPERATION_TYPES = [
  { id: 'graphql', label: 'GraphQL', color: '#e535ab', icon: Zap },
  { id: 'db', label: 'Database', color: '#336791', icon: Database },
  { id: 'http', label: 'HTTP', color: '#4caf50', icon: Server },
  { id: 'ui', label: 'UI', color: '#61dafb', icon: Activity },
  { id: 'navigation', label: 'Navigation', color: '#f59e0b', icon: GitBranch },
  { id: 'interaction', label: 'Interaction', color: '#8b5cf6', icon: Layers },
];

const STATUS_COLORS = {
  success: '#10b981',
  error: '#ef4444',
  in_progress: '#f59e0b',
};

const TIME_RANGES = [
  { id: 'hour', label: 'Last Hour', ms: 60 * 60 * 1000 },
  { id: '6hours', label: 'Last 6 Hours', ms: 6 * 60 * 60 * 1000 },
  { id: 'day', label: 'Last 24 Hours', ms: 24 * 60 * 60 * 1000 },
  { id: 'week', label: 'Last Week', ms: 7 * 24 * 60 * 60 * 1000 },
];

// ============================================
// TYPES
// ============================================

interface Trace {
  id: string;
  userId?: string;
  sessionId?: string;
  rootOperation: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'in_progress' | 'success' | 'error';
  errorMessage?: string;
  metadata?: string;
}

interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  service: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: string;
  errorMessage?: string;
  attributes?: string;
}

interface TraceWithSpans {
  trace: Trace;
  spans: Span[];
}

interface TraceStats {
  totalTraces: number;
  totalSpans: number;
  errorRate: number;
  avgDuration: number;
  byOperationType: Record<string, number>;
  byStatus: Record<string, number>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getOperationTypeInfo(type: string) {
  return OPERATION_TYPES.find((t) => t.id === type) || OPERATION_TYPES[0];
}

function parseAttributes(attrs: string | undefined): Record<string, unknown> {
  if (!attrs) return {};
  try {
    return JSON.parse(attrs);
  } catch {
    return {};
  }
}

// ============================================
// SUBCOMPONENTS
// ============================================

function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <GlassSurface className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">{title}</div>
          <div className="text-2xl font-bold" style={{ color }}>
            {value}
          </div>
          {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </div>
        <div className="p-2 rounded-lg bg-white/5" style={{ color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </GlassSurface>
  );
}

function TraceRow({
  trace,
  onClick,
  isSelected,
}: {
  trace: Trace;
  onClick: () => void;
  isSelected: boolean;
}) {
  const statusColor = STATUS_COLORS[trace.status] || STATUS_COLORS.in_progress;

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="font-mono text-sm text-cyan-400 truncate max-w-[200px]">
            {trace.rootOperation}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatRelativeTime(trace.startedAt)}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(trace.durationMs)}
        </span>
        {trace.userId && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {trace.userId.slice(0, 8)}...
          </span>
        )}
        {trace.errorMessage && (
          <span className="flex items-center gap-1 text-red-400">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        )}
      </div>
    </div>
  );
}

function SpanWaterfall({
  spans,
  traceStartTime,
  traceDuration,
}: {
  spans: Span[];
  traceStartTime: number;
  traceDuration: number;
}) {
  // Build span hierarchy
  const spanMap = new Map<string, Span>();
  const rootSpans: Span[] = [];

  spans.forEach((span) => {
    spanMap.set(span.id, span);
    if (!span.parentSpanId) {
      rootSpans.push(span);
    }
  });

  const getChildren = (parentId: string): Span[] => {
    return spans.filter((s) => s.parentSpanId === parentId);
  };

  const renderSpan = (span: Span, depth: number = 0): React.ReactNode => {
    const children = getChildren(span.id);
    const startOffset = ((span.startedAt - traceStartTime) / traceDuration) * 100;
    const width = ((span.durationMs || 1) / traceDuration) * 100;
    const typeInfo = getOperationTypeInfo(span.operationType);
    const statusColor = STATUS_COLORS[span.status] || STATUS_COLORS.in_progress;
    const attrs = parseAttributes(span.attributes);

    return (
      <div key={span.id} className="mb-2">
        <div className="flex items-center gap-2">
          {/* Indentation */}
          <div style={{ width: depth * 20 }} />

          {/* Expand/collapse button placeholder */}
          {children.length > 0 ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <div className="w-4" />
          )}

          {/* Operation name */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <typeInfo.icon className="w-4 h-4" style={{ color: typeInfo.color }} />
            <span className="text-sm truncate max-w-[180px]" title={span.operationName}>
              {span.operationName}
            </span>
          </div>

          {/* Duration bar */}
          <div className="flex-1 h-6 bg-white/5 rounded relative min-w-[300px]">
            <div
              className="absolute h-full rounded"
              style={{
                left: `${Math.max(0, Math.min(startOffset, 100))}%`,
                width: `${Math.max(1, Math.min(width, 100 - startOffset))}%`,
                backgroundColor: typeInfo.color,
                opacity: 0.7,
              }}
            />
            {span.status === 'error' && (
              <div
                className="absolute inset-0 border-2 border-red-500/50 rounded"
                style={{
                  left: `${Math.max(0, Math.min(startOffset, 100))}%`,
                  width: `${Math.max(1, Math.min(width, 100 - startOffset))}%`,
                }}
              />
            )}
          </div>

          {/* Duration */}
          <div className="text-xs text-gray-400 w-16 text-right">
            {formatDuration(span.durationMs)}
          </div>

          {/* Status indicator */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* Span details */}
        {Object.keys(attrs).length > 0 && (
          <div className="ml-10 mt-1 text-xs text-gray-500 font-mono">
            {attrs.sql && (
              <div className="truncate max-w-[500px]" title={attrs.sql as string}>
                SQL: {attrs.sql as string}
              </div>
            )}
            {attrs.rowCount !== undefined && <span>Rows: {attrs.rowCount as number}</span>}
          </div>
        )}

        {/* Render children */}
        {children.map((child) => renderSpan(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      {/* Timeline header */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
        <div style={{ width: 20 }} />
        <div className="w-4" />
        <div className="min-w-[200px]">Operation</div>
        <div className="flex-1 flex justify-between min-w-[300px]">
          <span>0ms</span>
          <span>{formatDuration(traceDuration / 2)}</span>
          <span>{formatDuration(traceDuration)}</span>
        </div>
        <div className="w-16 text-right">Duration</div>
        <div className="w-2" />
      </div>

      {/* Spans */}
      {rootSpans.length > 0 ? (
        rootSpans.map((span) => renderSpan(span))
      ) : (
        <div className="text-center text-gray-500 py-4">No spans recorded</div>
      )}
    </div>
  );
}

function TraceDetailModal({
  traceData,
  onClose,
}: {
  traceData: TraceWithSpans | null;
  onClose: () => void;
}) {
  if (!traceData) return null;

  const { trace, spans } = traceData;
  const traceDuration = trace.durationMs || 1;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <GlassSurface className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-cyan-400">{trace.rootOperation}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
              <span>{formatTimestamp(trace.startedAt)}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(trace.durationMs)}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-4 h-4" />
                {spans.length} spans
              </span>
              {trace.userId && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {trace.userId}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message if present */}
        {trace.errorMessage && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Error</span>
            </div>
            <div className="mt-1 text-sm text-red-300 font-mono">{trace.errorMessage}</div>
          </div>
        )}

        {/* Waterfall view */}
        <div className="flex-1 overflow-auto p-4">
          <SpanWaterfall
            spans={spans}
            traceStartTime={trace.startedAt}
            traceDuration={traceDuration}
          />
        </div>

        {/* Footer with trace ID */}
        <div className="p-4 border-t border-white/10 text-xs text-gray-500 font-mono">
          Trace ID: {trace.id}
        </div>
      </GlassSurface>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TracingPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceWithSpans | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('day');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [operationFilter, setOperationFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10000);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch trace stats:', error);
    }
  }, []);

  // Fetch traces
  const fetchTraces = useCallback(async () => {
    try {
      setLoading(true);

      const range = TIME_RANGES.find((r) => r.id === timeRange);
      const startTime = range ? Date.now() - range.ms : Date.now() - 86400000;

      const params = new URLSearchParams({
        startTime: new Date(startTime).toISOString(),
        limit: '100',
      });

      if (statusFilter) params.append('status', statusFilter);
      if (operationFilter) params.append('operationType', operationFilter);

      const res = await fetch(`${API_BASE}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);
      }
    } catch (error) {
      console.error('Failed to fetch traces:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, statusFilter, operationFilter]);

  // Fetch trace detail
  const fetchTraceDetail = useCallback(async (traceId: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`${API_BASE}/${traceId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTrace(data);
      }
    } catch (error) {
      console.error('Failed to fetch trace detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchTraces();
  }, [fetchStats, fetchTraces]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStats();
      fetchTraces();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStats, fetchTraces]);

  // Filter traces by search
  const filteredTraces = traces.filter((trace) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      trace.rootOperation.toLowerCase().includes(search) ||
      trace.id.toLowerCase().includes(search) ||
      (trace.userId && trace.userId.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Distributed Tracing
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Track user actions and debug performance issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`
              p-2 rounded-lg transition-colors
              ${autoRefresh ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}
            `}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              fetchStats();
              fetchTraces();
            }}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Traces"
            value={stats.totalTraces.toLocaleString()}
            icon={GitBranch}
            color="#8b5cf6"
          />
          <StatsCard
            title="Total Spans"
            value={stats.totalSpans.toLocaleString()}
            icon={Layers}
            color="#06b6d4"
          />
          <StatsCard
            title="Error Rate"
            value={`${(stats.errorRate * 100).toFixed(1)}%`}
            icon={AlertTriangle}
            color={stats.errorRate > 0.05 ? '#ef4444' : '#10b981'}
          />
          <StatsCard
            title="Avg Duration"
            value={formatDuration(stats.avgDuration)}
            icon={Clock}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Filters */}
      <GlassSurface className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search traces..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Time range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {TIME_RANGES.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>

          {/* Toggle filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
              ${showFilters ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}
            `}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(statusFilter || operationFilter) && (
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <div className="flex gap-1">
                {['success', 'error', 'in_progress'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                    className={`
                      px-2 py-1 rounded text-xs transition-colors
                      ${statusFilter === status
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                    `}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Operation type filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Type:</span>
              <div className="flex gap-1 flex-wrap">
                {OPERATION_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setOperationFilter(operationFilter === type.id ? null : type.id)}
                    className={`
                      px-2 py-1 rounded text-xs transition-colors flex items-center gap-1
                      ${operationFilter === type.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                    `}
                  >
                    <type.icon className="w-3 h-3" style={{ color: type.color }} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {(statusFilter || operationFilter) && (
              <button
                onClick={() => {
                  setStatusFilter(null);
                  setOperationFilter(null);
                }}
                className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </GlassSurface>

      {/* Traces list */}
      <GlassSurface className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            Recent Traces
          </h3>
          <span className="text-sm text-gray-400">{filteredTraces.length} traces</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : filteredTraces.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No traces found for the selected time range
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredTraces.map((trace) => (
              <TraceRow
                key={trace.id}
                trace={trace}
                onClick={() => fetchTraceDetail(trace.id)}
                isSelected={selectedTrace?.trace.id === trace.id}
              />
            ))}
          </div>
        )}
      </GlassSurface>

      {/* Loading detail indicator */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Trace detail modal */}
      {selectedTrace && !loadingDetail && (
        <TraceDetailModal
          traceData={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}
