/**
 * Tracing Panel Component (Enhanced)
 *
 * Comprehensive distributed tracing visualization interface with:
 * - Timeline view of traces
 * - Waterfall view of span hierarchy
 * - Filtering by user, time, status, operation type
 * - Trace detail modal with full span breakdown
 * - Statistics dashboard
 * - Auto-refresh capability
 * - Error Pattern Analysis
 * - Session Replay
 * - Performance Heatmap
 * - Export (JSON/CSV)
 * - Trace Comparison
 * - Alerting
 * - Error Search
 * - User Journey Timeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Bell,
  ChevronRight,
  Clock,
  GitCompare,
  Database,
  Download,
  Filter,
  GitBranch,
  History,
  Layers,
  Loader2,
  Map,
  Power,
  RefreshCw,
  Search,
  Server,
  Settings,
  User,
  X,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// TRACING CONFIG TYPES & HOOK
// ============================================

interface TracingConfig {
  backendEnabled: boolean;
  frontendEnabled: boolean;
  sampleRate: number;
}

function useTracingConfig() {
  const [config, setConfig] = useState<TracingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/traces/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch tracing config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (updates: Partial<TracingConfig>) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/traces/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        return true;
      }
    } catch (error) {
      console.error('Failed to update tracing config:', error);
    } finally {
      setUpdating(false);
    }
    return false;
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, updating, updateConfig, refetch: fetchConfig };
}

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

const STATUS_COLORS: Record<string, string> = {
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

const VIEWS = [
  { id: 'traces', label: 'Traces', icon: GitBranch },
  { id: 'errors', label: 'Error Patterns', icon: AlertCircle },
  { id: 'session', label: 'Session Replay', icon: History },
  { id: 'heatmap', label: 'Performance', icon: BarChart3 },
  { id: 'journey', label: 'User Journey', icon: Map },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'compare', label: 'Compare', icon: GitCompare },
];

// ============================================
// TYPES
// ============================================

interface Trace {
  id: string;
  user_id?: string;
  session_id?: string;
  root_operation: string;
  started_at: number;
  ended_at?: number;
  duration_ms?: number;
  status: 'in_progress' | 'success' | 'error';
  error_message?: string;
  metadata?: string;
}

interface Span {
  id: string;
  trace_id: string;
  parent_span_id?: string;
  operation_name: string;
  operation_type: string;
  service: string;
  started_at: number;
  ended_at?: number;
  duration_ms?: number;
  status: string;
  error_message?: string;
  attributes?: string;
}

interface TraceWithSpans extends Trace {
  spans: Span[];
}

interface ErrorPattern {
  pattern: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: number;
  operations: string[];
}

interface RecentError {
  traceId: string;
  spanId?: string;
  operation: string;
  service: string;
  errorMessage: string;
  startedAt: number;
  durationMs?: number;
  userId?: string;
}

interface SessionData {
  id: string;
  traces: TraceWithSpans[];
  startedAt?: number;
  endedAt?: number;
  totalDuration: number;
  traceCount: number;
  errorCount: number;
}

interface HeatmapHour {
  hour: string;
  operations: Array<{
    operation: string;
    count: number;
    avgDuration: number;
    maxDuration: number;
    errorCount: number;
  }>;
  totalCount: number;
  avgDuration: number;
}

interface Alert {
  type: 'error_rate' | 'slow_performance' | 'error_spike';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}

interface JourneySession {
  sessionId: string;
  traceCount: number;
  errorCount: number;
  startedAt: number;
  endedAt: number;
  operations: string[];
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
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <GlassSurface
      className={`p-4 ${onClick ? 'cursor-pointer hover:bg-white/10' : ''}`}
      onClick={onClick}
    >
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
  onCompareSelect,
  compareMode,
}: {
  trace: Trace;
  onClick: () => void;
  isSelected: boolean;
  onCompareSelect?: (traceId: string) => void;
  compareMode?: boolean;
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
          {compareMode && (
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-600 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                onCompareSelect?.(trace.id);
              }}
            />
          )}
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          <span className="font-mono text-sm text-cyan-400 truncate max-w-[200px]">
            {trace.root_operation}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatRelativeTime(trace.started_at)}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(trace.duration_ms)}
        </span>
        {trace.user_id && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {trace.user_id.slice(0, 8)}...
          </span>
        )}
        {trace.error_message && (
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
  const spanMap = new Map<string, Span>();
  const rootSpans: Span[] = [];

  spans.forEach((span) => {
    spanMap.set(span.id, span);
    if (!span.parent_span_id) {
      rootSpans.push(span);
    }
  });

  const getChildren = (parentId: string): Span[] => {
    return spans.filter((s) => s.parent_span_id === parentId);
  };

  const renderSpan = (span: Span, depth: number = 0): React.ReactNode => {
    const children = getChildren(span.id);
    const startOffset = ((span.started_at - traceStartTime) / traceDuration) * 100;
    const width = ((span.duration_ms || 1) / traceDuration) * 100;
    const typeInfo = getOperationTypeInfo(span.operation_type);
    const statusColor = STATUS_COLORS[span.status] || STATUS_COLORS.in_progress;
    const attrs = parseAttributes(span.attributes);

    return (
      <div key={span.id} className="mb-2">
        <div className="flex items-center gap-2">
          <div style={{ width: depth * 20 }} />
          {children.length > 0 ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <div className="w-4" />
          )}
          <div className="flex items-center gap-2 min-w-[200px]">
            <typeInfo.icon className="w-4 h-4" style={{ color: typeInfo.color }} />
            <span className="text-sm truncate max-w-[180px]" title={span.operation_name}>
              {span.operation_name}
            </span>
          </div>
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
          <div className="text-xs text-gray-400 w-16 text-right">
            {formatDuration(span.duration_ms)}
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>
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
        {children.map((child) => renderSpan(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
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

  const traceDuration = traceData.duration_ms || 1;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <GlassSurface className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-cyan-400">{traceData.root_operation}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
              <span>{formatTimestamp(traceData.started_at)}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(traceData.duration_ms)}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-4 h-4" />
                {traceData.spans.length} spans
              </span>
              {traceData.user_id && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {traceData.user_id}
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
        {traceData.error_message && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Error</span>
            </div>
            <div className="mt-1 text-sm text-red-300 font-mono">{traceData.error_message}</div>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4">
          <SpanWaterfall
            spans={traceData.spans}
            traceStartTime={traceData.started_at}
            traceDuration={traceDuration}
          />
        </div>
        <div className="p-4 border-t border-white/10 text-xs text-gray-500 font-mono">
          Trace ID: {traceData.id}
        </div>
      </GlassSurface>
    </div>
  );
}

// ============================================
// ERROR PATTERNS VIEW
// ============================================

function ErrorPatternsView() {
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPattern, setSearchPattern] = useState('');
  const [searchResults, setSearchResults] = useState<Trace[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [patternsRes, errorsRes] = await Promise.all([
          fetch(`${API_BASE}/errors/stats`),
          fetch(`${API_BASE}/errors/recent?limit=20`),
        ]);

        if (patternsRes.ok) {
          const data = await patternsRes.json();
          setPatterns(data.errorPatterns || []);
        }
        if (errorsRes.ok) {
          const data = await errorsRes.json();
          setRecentErrors(data.errors || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchPattern.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/errors/search?pattern=${encodeURIComponent(searchPattern)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.traces || []);
      }
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search by Error */}
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-cyan-400" />
          Search by Error Pattern
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter error message pattern..."
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
            {searchResults.map((trace) => (
              <div key={trace.id} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-cyan-400">{trace.root_operation}</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(trace.started_at)}</span>
                </div>
                <div className="text-sm text-red-400 mt-1 truncate">{trace.error_message}</div>
                <div className="text-xs text-gray-500 font-mono mt-1">ID: {trace.id}</div>
              </div>
            ))}
          </div>
        )}
      </GlassSurface>

      {/* Error Patterns */}
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Error Patterns (24h)
        </h3>
        {patterns.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No error patterns found</div>
        ) : (
          <div className="space-y-3">
            {patterns.slice(0, 10).map((pattern, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-red-400 font-mono truncate max-w-[70%]">
                    {pattern.pattern}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                    {pattern.count}x
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{pattern.affectedUsers} user{pattern.affectedUsers !== 1 ? 's' : ''}</span>
                  <span>Last: {formatRelativeTime(pattern.lastSeen)}</span>
                  <span>{pattern.operations.slice(0, 2).join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassSurface>

      {/* Recent Errors */}
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400" />
          Recent Errors
        </h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {recentErrors.map((err, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-cyan-400">{err.operation}</span>
                <span className="text-xs text-gray-400">{formatRelativeTime(err.startedAt)}</span>
              </div>
              <div className="text-sm text-red-400 mt-1 truncate">{err.errorMessage}</div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                <span>Service: {err.service}</span>
                {err.userId && <span>User: {err.userId.slice(0, 8)}...</span>}
                {err.durationMs && <span>{formatDuration(err.durationMs)}</span>}
              </div>
            </div>
          ))}
        </div>
      </GlassSurface>
    </div>
  );
}

// ============================================
// SESSION REPLAY VIEW
// ============================================

function SessionReplayView() {
  const [sessionId, setSessionId] = useState('');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<TraceWithSpans | null>(null);

  const fetchSession = async () => {
    if (!sessionId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data.session);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-cyan-400" />
          Session Replay
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchSession()}
            placeholder="Enter session ID..."
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <button
            onClick={fetchSession}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
          </button>
        </div>

        {sessionData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Traces</div>
                <div className="text-xl font-bold text-white">{sessionData.traceCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Errors</div>
                <div className="text-xl font-bold text-red-400">{sessionData.errorCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Duration</div>
                <div className="text-xl font-bold text-cyan-400">
                  {formatDuration(sessionData.totalDuration)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Started</div>
                <div className="text-sm font-bold text-white">
                  {sessionData.startedAt ? formatTimestamp(sessionData.startedAt) : '-'}
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Timeline visualization */}
              <div className="h-2 bg-white/10 rounded-full mb-4 relative">
                {sessionData.traces.map((trace, _idx) => {
                  const start = sessionData.startedAt || 0;
                  const total = sessionData.totalDuration || 1;
                  const left = ((trace.started_at - start) / total) * 100;
                  const width = ((trace.duration_ms || 1) / total) * 100;
                  return (
                    <div
                      key={trace.id}
                      className="absolute h-2 rounded-full cursor-pointer hover:opacity-100"
                      style={{
                        left: `${Math.max(0, left)}%`,
                        width: `${Math.max(0.5, Math.min(width, 100 - left))}%`,
                        backgroundColor: trace.status === 'error' ? '#ef4444' : '#10b981',
                        opacity: 0.7,
                      }}
                      title={`${trace.root_operation} - ${formatDuration(trace.duration_ms)}`}
                      onClick={() => setSelectedTrace(trace as TraceWithSpans)}
                    />
                  );
                })}
              </div>

              {/* Trace list */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sessionData.traces.map((trace, idx) => (
                  <div
                    key={trace.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTrace?.id === trace.id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedTrace(trace as TraceWithSpans)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{idx + 1}</span>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[trace.status] }}
                        />
                        <span className="font-mono text-sm text-cyan-400">{trace.root_operation}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDuration(trace.duration_ms)}</span>
                    </div>
                    {trace.error_message && (
                      <div className="text-xs text-red-400 mt-1 truncate">{trace.error_message}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassSurface>

      {selectedTrace && (
        <TraceDetailModal
          traceData={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}

// ============================================
// PERFORMANCE HEATMAP VIEW
// ============================================

function PerformanceHeatmapView() {
  const [heatmapData, setHeatmapData] = useState<HeatmapHour[]>([]);
  const [slowTraces, setSlowTraces] = useState<TraceWithSpans[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<TraceWithSpans | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [heatmapRes, slowRes] = await Promise.all([
          fetch(`${API_BASE}/performance/heatmap`),
          fetch(`${API_BASE}/performance/slow?minDuration=1000&limit=10`),
        ]);

        if (heatmapRes.ok) {
          const data = await heatmapRes.json();
          setHeatmapData(data.heatmap || []);
        }
        if (slowRes.ok) {
          const data = await slowRes.json();
          setSlowTraces(data.traces || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const maxCount = Math.max(...heatmapData.map(h => h.totalCount), 1);

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Performance Heatmap (7 days)
        </h3>
        <div className="overflow-x-auto">
          <div className="space-y-1 min-w-[600px]">
            {heatmapData.slice(0, 48).map((hour) => (
              <div key={hour.hour} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-32 truncate">{hour.hour}</span>
                <div className="flex-1 h-6 bg-white/5 rounded relative">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(hour.totalCount / maxCount) * 100}%`,
                      backgroundColor: hour.avgDuration > 500
                        ? '#ef4444'
                        : hour.avgDuration > 200
                        ? '#f59e0b'
                        : '#10b981',
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-20 text-right">{hour.totalCount} reqs</span>
                <span className="text-xs text-gray-400 w-16 text-right">
                  {formatDuration(hour.avgDuration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </GlassSurface>

      {/* Slow Traces */}
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-red-400" />
          Slowest Traces (24h)
        </h3>
        <div className="space-y-2">
          {slowTraces.map((trace) => (
            <div
              key={trace.id}
              className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              onClick={() => setSelectedTrace(trace)}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-cyan-400">{trace.root_operation}</span>
                <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-bold">
                  {formatDuration(trace.duration_ms)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                <span>{formatRelativeTime(trace.started_at)}</span>
                <span>{trace.spans?.length || 0} spans</span>
                {trace.user_id && <span>User: {trace.user_id.slice(0, 8)}...</span>}
              </div>
            </div>
          ))}
        </div>
      </GlassSurface>

      {selectedTrace && (
        <TraceDetailModal
          traceData={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}

// ============================================
// USER JOURNEY VIEW
// ============================================

function UserJourneyView() {
  const [userId, setUserId] = useState('');
  const [journey, setJourney] = useState<{
    userId: string;
    sessions: JourneySession[];
    totalSessions: number;
    totalTraces: number;
    totalErrors: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const fetchJourney = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/${userId}/journey`);
      if (res.ok) {
        const data = await res.json();
        setJourney(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <Map className="w-4 h-4 text-cyan-400" />
          User Journey
        </h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchJourney()}
            placeholder="Enter user ID..."
            className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <button
            onClick={fetchJourney}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
          </button>
        </div>

        {journey && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Sessions</div>
                <div className="text-xl font-bold text-white">{journey.totalSessions}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Total Traces</div>
                <div className="text-xl font-bold text-cyan-400">{journey.totalTraces}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400">Total Errors</div>
                <div className="text-xl font-bold text-red-400">{journey.totalErrors}</div>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {journey.sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedSession === session.sessionId
                      ? 'bg-cyan-500/20 border border-cyan-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedSession(
                    selectedSession === session.sessionId ? null : session.sessionId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-cyan-400">
                      {session.sessionId.slice(0, 16)}...
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(session.startedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span>{session.traceCount} traces</span>
                    {session.errorCount > 0 && (
                      <span className="text-red-400">{session.errorCount} errors</span>
                    )}
                    <span>{formatDuration(session.endedAt - session.startedAt)}</span>
                  </div>
                  {selectedSession === session.sessionId && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Operations:</div>
                      <div className="flex flex-wrap gap-1">
                        {session.operations.slice(0, 5).map((op, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-gray-300">
                            {op}
                          </span>
                        ))}
                        {session.operations.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{session.operations.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassSurface>
    </div>
  );
}

// ============================================
// ALERTS VIEW
// ============================================

function AlertsView() {
  const [alertData, setAlertData] = useState<{
    alerts: Alert[];
    currentWindow: {
      total: number;
      errors: number;
      errorRate: number;
      avgDuration: number;
      slowCount: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/alerts/check`);
        if (res.ok) {
          const data = await res.json();
          setAlertData(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Alerts */}
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-cyan-400" />
          Active Alerts
        </h3>
        {alertData?.alerts.length === 0 ? (
          <div className="p-4 rounded-lg bg-green-500/20 text-green-400 text-center">
            No active alerts - all systems nominal
          </div>
        ) : (
          <div className="space-y-2">
            {alertData?.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  alert.severity === 'critical'
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-yellow-500/20 border border-yellow-500/30'
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 flex-shrink-0 ${
                    alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    >
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        alert.severity === 'critical'
                          ? 'bg-red-500/30 text-red-300'
                          : 'bg-yellow-500/30 text-yellow-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassSurface>

      {/* Current Metrics */}
      {alertData?.currentWindow && (
        <GlassSurface className="p-4">
          <h3 className="font-medium text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-400" />
            Current Window (5 min)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-gray-400">Total Requests</div>
              <div className="text-xl font-bold text-white">{alertData.currentWindow.total}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-gray-400">Errors</div>
              <div className="text-xl font-bold text-red-400">{alertData.currentWindow.errors}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-gray-400">Error Rate</div>
              <div className="text-xl font-bold text-yellow-400">
                {(alertData.currentWindow.errorRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-gray-400">Avg Duration</div>
              <div className="text-xl font-bold text-cyan-400">
                {formatDuration(alertData.currentWindow.avgDuration)}
              </div>
            </div>
          </div>
        </GlassSurface>
      )}
    </div>
  );
}

// ============================================
// COMPARE VIEW
// ============================================

function CompareView() {
  const [traceId1, setTraceId1] = useState('');
  const [traceId2, setTraceId2] = useState('');
  const [comparison, setComparison] = useState<{
    trace1: TraceWithSpans & { spanCount: number; errorCount: number };
    trace2: TraceWithSpans & { spanCount: number; errorCount: number };
    diff: {
      durationDiff: number;
      durationPct: number;
      spanCountDiff: number;
      sameOperation: boolean;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!traceId1.trim() || !traceId2.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traceId1, traceId2 }),
      });
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassSurface className="p-4">
        <h3 className="font-medium text-white flex items-center gap-2 mb-4">
          <GitCompare className="w-4 h-4 text-cyan-400" />
          Compare Traces
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            value={traceId1}
            onChange={(e) => setTraceId1(e.target.value)}
            placeholder="Trace ID 1..."
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          <input
            type="text"
            value={traceId2}
            onChange={(e) => setTraceId2(e.target.value)}
            placeholder="Trace ID 2..."
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <button
          onClick={handleCompare}
          disabled={loading || !traceId1 || !traceId2}
          className="w-full px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Compare'}
        </button>

        {comparison && (
          <div className="mt-6 space-y-4">
            {/* Diff Summary */}
            <div className={`p-4 rounded-lg ${
              comparison.diff.durationDiff > 0
                ? 'bg-red-500/20 border border-red-500/30'
                : 'bg-green-500/20 border border-green-500/30'
            }`}>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {comparison.diff.durationDiff > 0 ? '+' : ''}
                  {formatDuration(comparison.diff.durationDiff)}
                </div>
                <div className="text-sm text-gray-400">
                  ({comparison.diff.durationPct > 0 ? '+' : ''}
                  {comparison.diff.durationPct.toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400 mb-2">Trace 1</div>
                <div className="text-sm text-cyan-400 font-mono truncate mb-2">
                  {comparison.trace1.root_operation}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span>{formatDuration(comparison.trace1.duration_ms)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Spans:</span>
                    <span>{comparison.trace1.spanCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Errors:</span>
                    <span className={comparison.trace1.errorCount > 0 ? 'text-red-400' : ''}>
                      {comparison.trace1.errorCount}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-white/5">
                <div className="text-xs text-gray-400 mb-2">Trace 2</div>
                <div className="text-sm text-cyan-400 font-mono truncate mb-2">
                  {comparison.trace2.root_operation}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span>{formatDuration(comparison.trace2.duration_ms)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Spans:</span>
                    <span>{comparison.trace2.spanCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Errors:</span>
                    <span className={comparison.trace2.errorCount > 0 ? 'text-red-400' : ''}>
                      {comparison.trace2.errorCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassSurface>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TracingPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    stats: { total: number; errors: number; avgDuration: number };
    byOperation: Array<{ rootOperation: string; count: number }>;
  } | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceWithSpans | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeView, setActiveView] = useState('traces');

  // Tracing config (on/off toggle)
  const { config: tracingConfig, updating: configUpdating, updateConfig } = useTracingConfig();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('day');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [operationFilter, setOperationFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval] = useState(10000);

  // Export
  const handleExport = async (format: 'json' | 'csv') => {
    const range = TIME_RANGES.find((r) => r.id === timeRange);
    const startTime = range ? new Date(Date.now() - range.ms).toISOString() : '';

    const url = `${API_BASE}/export?format=${format}&startTime=${startTime}${
      statusFilter ? `&status=${statusFilter}` : ''
    }&limit=1000`;

    window.open(url, '_blank');
  };

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
    if (activeView === 'traces') {
      fetchStats();
      fetchTraces();
    }
  }, [activeView, fetchStats, fetchTraces]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || activeView !== 'traces') return;

    const interval = setInterval(() => {
      fetchStats();
      fetchTraces();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, activeView, refreshInterval, fetchStats, fetchTraces]);

  // Filter traces by search
  const filteredTraces = traces.filter((trace) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      trace.root_operation.toLowerCase().includes(search) ||
      trace.id.toLowerCase().includes(search) ||
      (trace.user_id && trace.user_id.toLowerCase().includes(search))
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
          {/* Export buttons */}
          <button
            onClick={() => handleExport('json')}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10"
            title="Export JSON"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10"
            title="Export CSV"
          >
            <ArrowDownToLine className="w-5 h-5" />
          </button>
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

      {/* Tracing Power Controls */}
      {tracingConfig && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Tracing Controls</span>
          </div>

          {/* Backend Tracing Toggle */}
          <button
            onClick={() => updateConfig({ backendEnabled: !tracingConfig.backendEnabled })}
            disabled={configUpdating}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tracingConfig.backendEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'}
              ${configUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Power className={`w-4 h-4 ${configUpdating ? 'animate-pulse' : ''}`} />
            Backend: {tracingConfig.backendEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Frontend Tracing Toggle */}
          <button
            onClick={() => updateConfig({ frontendEnabled: !tracingConfig.frontendEnabled })}
            disabled={configUpdating}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tracingConfig.frontendEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'}
              ${configUpdating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Power className={`w-4 h-4 ${configUpdating ? 'animate-pulse' : ''}`} />
            Frontend: {tracingConfig.frontendEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Sample Rate Display */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-400">
            <span>Sample Rate:</span>
            <span className="text-white font-mono">{Math.round(tracingConfig.sampleRate * 100)}%</span>
          </div>

          {/* Status Indicator */}
          <div className="ml-auto flex items-center gap-2 text-sm">
            {tracingConfig.backendEnabled || tracingConfig.frontendEnabled ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Tracing Active</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400">Tracing Disabled</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors
              ${activeView === view.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'}
            `}
          >
            <view.icon className="w-4 h-4" />
            {view.label}
          </button>
        ))}
      </div>

      {/* View Content */}
      {activeView === 'traces' && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Traces"
                value={stats.stats.total.toLocaleString()}
                icon={GitBranch}
                color="#8b5cf6"
              />
              <StatsCard
                title="Errors"
                value={stats.stats.errors}
                icon={AlertTriangle}
                color="#ef4444"
              />
              <StatsCard
                title="Error Rate"
                value={`${stats.stats.total > 0 ? ((stats.stats.errors / stats.stats.total) * 100).toFixed(1) : 0}%`}
                icon={AlertCircle}
                color={stats.stats.errors / stats.stats.total > 0.05 ? '#ef4444' : '#10b981'}
              />
              <StatsCard
                title="Avg Duration"
                value={formatDuration(stats.stats.avgDuration)}
                icon={Clock}
                color="#f59e0b"
              />
            </div>
          )}

          {/* Filters */}
          <GlassSurface className="p-4">
            <div className="flex flex-wrap items-center gap-4">
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

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4">
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
                    isSelected={selectedTrace?.id === trace.id}
                  />
                ))}
              </div>
            )}
          </GlassSurface>
        </>
      )}

      {activeView === 'errors' && <ErrorPatternsView />}
      {activeView === 'session' && <SessionReplayView />}
      {activeView === 'heatmap' && <PerformanceHeatmapView />}
      {activeView === 'journey' && <UserJourneyView />}
      {activeView === 'alerts' && <AlertsView />}
      {activeView === 'compare' && <CompareView />}

      {/* Loading detail indicator */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Trace detail modal */}
      {selectedTrace && !loadingDetail && activeView === 'traces' && (
        <TraceDetailModal
          traceData={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}
