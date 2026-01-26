/**
 * BuildNet Panel - High-Performance Rust Build System
 *
 * Real-time view of BuildNet Native with:
 * - Live streaming events via SSE (Server-Sent Events)
 * - Build queue status
 * - Build history
 * - Daemon controls (build/force)
 * - Cache statistics
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import GlassSurface from '../glass/GlassSurface';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  Package,
  HardDrive,
} from 'lucide-react';

// Configuration - BuildNet Native runs on port 9876
// Proxied through Caddy at /buildnet/*
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/buildnet`;
  }
  return 'http://localhost:9876';
};

// Types matching BuildNet Native API
interface Build {
  id: string;
  package: string;
  source_hash: string;
  output_hash: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_ms: number;
  error: string | null;
}

interface BuildNetStatus {
  status: string;
  version: string;
  project_root: string;
  packages: string[];
  state_stats: {
    total_builds: number;
    cached_builds: number;
    failed_builds: number;
    cached_files: number;
    artifacts: number;
  };
}

interface CacheStats {
  cached_files: number;
  artifacts: number;
  total_size_bytes?: number;
}

interface LogEntry {
  timestamp: string;
  level: string;
  msg: string;
  package?: string;
}

// Status colors for build states
const statusColors: Record<string, string> = {
  pending: 'text-blue-400',
  running: 'text-yellow-400 animate-pulse',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

export default function BuildDaemonPanel() {
  // State
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<BuildNetStatus | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [output, setOutput] = useState<string>('');
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch daemon status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
        setConnected(true);
      } else {
        throw new Error('BuildNet not responding');
      }
    } catch (_err) {
      setStatus(null);
      setConnected(false);
      setError('BuildNet not running');
    }
  }, []);

  // Fetch build history
  const fetchBuilds = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/builds`);
      if (response.ok) {
        const data = await response.json();
        setBuilds(data);
      }
    } catch (_err) {
      // Silently fail - status will show the error
    }
  }, []);

  // Fetch cache statistics
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/cache/stats`);
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data);
      }
    } catch (_err) {
      // Silently fail
    }
  }, []);

  // Connect to SSE events stream
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(`${getApiBaseUrl()}/events`);

      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
        console.info('[BuildNet] SSE connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Add to logs
          const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: msg.level || 'info',
            msg: msg.message || JSON.stringify(msg),
            package: msg.package,
          };
          setLogs(prev => [logEntry, ...prev].slice(0, 500));

          // Handle specific event types
          if (msg.type === 'build_started') {
            setBuilding(true);
            setOutput('');
          } else if (msg.type === 'build_completed' || msg.type === 'build_failed') {
            setBuilding(false);
            fetchBuilds();
            fetchStatus();
          } else if (msg.type === 'build_output') {
            setOutput(prev => prev + (msg.output || msg.text || '') + '\n');
          }
        } catch (e) {
          console.error('[BuildNet] Failed to parse SSE message:', e);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSourceRef.current = null;
        console.info('[BuildNet] SSE disconnected');

        // Attempt reconnect
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectSSE();
          }, 5000);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (_err) {
      setError('Failed to connect to BuildNet events');
    }
  }, [fetchBuilds, fetchStatus]);

  // Request a build
  const requestBuild = useCallback(async (force = false) => {
    setBuilding(true);
    setOutput('');
    setError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to queue build');
      }

      const data = await response.json();
      console.info('[BuildNet] Build queued:', data);

      // Add to output
      setOutput(`Build started for packages: ${data.packages?.join(', ') || 'all'}\n`);

      // Refresh status after a moment
      setTimeout(() => {
        fetchStatus();
        fetchBuilds();
      }, 1000);
    } catch (err) {
      setBuilding(false);
      setError(`Build request failed: ${err}`);
    }
  }, [fetchStatus, fetchBuilds]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/cache/clear`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchCacheStats();
        setLogs(prev => [{
          timestamp: new Date().toISOString(),
          level: 'info',
          msg: 'Cache cleared successfully',
        }, ...prev]);
      }
    } catch (_err) {
      setError('Failed to clear cache');
    }
  }, [fetchCacheStats]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Initial fetch and SSE connection
  useEffect(() => {
    fetchStatus();
    fetchBuilds();
    fetchCacheStats();
    connectSSE();

    // Refresh status periodically
    const statusInterval = setInterval(() => {
      fetchStatus();
      fetchBuilds();
    }, 10000);

    return () => {
      clearInterval(statusInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      eventSourceRef.current?.close();
    };
  }, [fetchStatus, fetchBuilds, fetchCacheStats, connectSSE]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (filter && !log.msg.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  // Count running builds
  const runningBuilds = builds.filter(b => b.status === 'running').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h2 className="text-xl font-bold text-white">BuildNet Native</h2>
          {connected ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          {status?.version && (
            <span className="text-xs text-gray-500">v{status.version}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => requestBuild(false)}
            disabled={building}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Build
          </button>
          <button
            onClick={() => requestBuild(true)}
            disabled={building}
            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Force
          </button>
          <button
            onClick={fetchStatus}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Status</div>
          <div className={`text-xl font-bold ${status ? 'text-green-400' : 'text-red-400'}`}>
            {status?.status === 'running' ? 'Running' : 'Offline'}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Total Builds</div>
          <div className="text-xl font-bold text-white">
            {status?.state_stats.total_builds ?? '-'}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Cached</div>
          <div className="text-xl font-bold text-cyan-400">
            {status?.state_stats.cached_builds ?? '-'}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Failed</div>
          <div className="text-xl font-bold text-red-400">
            {status?.state_stats.failed_builds ?? '-'}
          </div>
        </GlassSurface>
      </div>

      {/* Packages & Cache */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 text-gray-300 mb-3">
            <Package className="w-4 h-4" />
            <span className="font-medium">Packages</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {status?.packages.map(pkg => (
              <span key={pkg} className="px-2 py-1 bg-white/5 rounded text-sm text-gray-300">
                {pkg}
              </span>
            )) ?? <span className="text-gray-500">No packages</span>}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-300">
              <HardDrive className="w-4 h-4" />
              <span className="font-medium">Cache</span>
            </div>
            <button
              onClick={clearCache}
              className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Files:</span>{' '}
              <span className="text-white">{cacheStats?.cached_files ?? status?.state_stats.cached_files ?? 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Artifacts:</span>{' '}
              <span className="text-white">{cacheStats?.artifacts ?? status?.state_stats.artifacts ?? 0}</span>
            </div>
            {cacheStats?.total_size_bytes && (
              <div className="col-span-2">
                <span className="text-gray-500">Size:</span>{' '}
                <span className="text-white">{formatBytes(cacheStats.total_size_bytes)}</span>
              </div>
            )}
          </div>
        </GlassSurface>
      </div>

      {/* Build Output */}
      <GlassSurface className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-gray-300">
            <Terminal className="w-4 h-4" />
            <span className="font-medium">Build Output</span>
            {runningBuilds > 0 && (
              <span className="text-yellow-400 text-xs animate-pulse">
                ({runningBuilds} running)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-1.5 rounded ${autoScroll ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-400'}`}
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOutput('')}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div
          ref={outputRef}
          className="h-64 overflow-auto p-4 font-mono text-xs bg-black/50 whitespace-pre-wrap"
        >
          {output || (
            <span className="text-gray-500">
              {building ? 'Waiting for output...' : 'No build output. Click "Build" to start.'}
            </span>
          )}
        </div>
      </GlassSurface>

      {/* Build History */}
      <GlassSurface className="overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5"
        >
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Build History</span>
            <span className="text-gray-500 text-sm">
              ({builds.length} builds)
            </span>
          </div>
          {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {showHistory && (
          <div className="divide-y divide-white/5 max-h-96 overflow-auto">
            {builds.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No build history yet
              </div>
            ) : (
              builds.slice(0, 20).map((build) => (
                <div key={build.id} className={`px-4 py-3 ${build.status === 'failed' ? 'bg-red-500/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {build.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : build.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : build.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="font-mono text-sm text-gray-300">
                        {build.package}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[build.status]}`}>
                        {build.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {build.duration_ms > 0 && (
                        <span className="text-gray-500">{formatDuration(build.duration_ms)}</span>
                      )}
                      {build.completed_at && (
                        <span className="text-gray-600 text-xs">
                          {new Date(build.completed_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {build.status === 'failed' && build.error && (
                    <div className="mt-2 text-xs text-red-400/80 font-mono truncate pl-7">
                      {build.error.split('\n')[0]}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </GlassSurface>

      {/* Live Logs */}
      <GlassSurface className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-gray-300">
            <Activity className="w-4 h-4" />
            <span className="font-medium">Live Logs</span>
            {connected && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-gray-300"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-gray-300 w-32"
            />
          </div>
        </div>
        <div ref={logsRef} className="h-48 overflow-auto divide-y divide-white/5">
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No logs yet
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div
                key={i}
                className={`px-4 py-2 text-xs font-mono flex items-start gap-3 ${
                  log.level === 'error' ? 'bg-red-500/5' :
                  log.level === 'warn' ? 'bg-yellow-500/5' :
                  log.level === 'success' ? 'bg-green-500/5' : ''
                }`}
              >
                <span className="text-gray-600 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`flex-shrink-0 w-16 uppercase ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  log.level === 'success' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  [{log.level}]
                </span>
                {log.package && (
                  <span className="text-purple-400 flex-shrink-0">[{log.package}]</span>
                )}
                <span className="text-gray-300 break-all">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </GlassSurface>
    </div>
  );
}
