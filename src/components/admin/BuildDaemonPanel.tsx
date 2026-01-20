/**
 * Build Daemon Panel - Live Build Monitoring
 *
 * Real-time view of the build daemon with:
 * - Live streaming logs with WebSocket
 * - Build queue status
 * - Build history
 * - Daemon controls (start/stop/build)
 * - Chronologically sorted logs with filtering
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
} from 'lucide-react';

// Configuration - Use proxied routes through Caddy
// The build daemon runs on localhost:9876 (HTTP) and localhost:9877 (WS)
// but is proxied through Caddy at /api/build-daemon/*
const getApiBaseUrl = () => {
  // In production, use the same origin with /api/build-daemon prefix
  // In development, connect directly to localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api/build-daemon`;
  }
  return 'http://localhost:9876';
};

const getWsBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/build-daemon/ws`;
  }
  return 'ws://localhost:9877';
};

// Types
interface BuildJob {
  id: string;
  type: string;
  source: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queuedAt?: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  result?: {
    tier: number;
    code: number;
  };
  error?: string;
}

interface DaemonStatus {
  status: string;
  hostname: string;
  uptime: number;
  wsClients: number;
  build: {
    queueLength: number;
    currentBuild: BuildJob | null;
    history: BuildJob[];
  };
}

interface LogEntry {
  timestamp: string;
  level: string;
  msg: string;
  jobId?: string;
  [key: string]: unknown;
}

// Tier badges
const tierBadges: Record<number, { label: string; color: string }> = {
  0: { label: 'INSTANT', color: 'text-green-400 bg-green-500/20' },
  1: { label: 'RESTORE', color: 'text-cyan-400 bg-cyan-500/20' },
  2: { label: 'INCREMENTAL', color: 'text-yellow-400 bg-yellow-500/20' },
  3: { label: 'FULL', color: 'text-purple-400 bg-purple-500/20' },
};

// Status colors (reserved for future enhanced status display)
const _statusColors: Record<string, string> = {
  queued: 'text-blue-400',
  running: 'text-yellow-400 animate-pulse',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

export default function BuildDaemonPanel() {
  // State
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<DaemonStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [output, setOutput] = useState<string>('');
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
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
      } else {
        throw new Error('Daemon not responding');
      }
    } catch (_err) {
      setStatus(null);
      setError('Daemon not running');
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsBaseUrl());

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('[BuildDaemon] WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'connected':
              setStatus(prev => prev ? { ...prev, ...msg.status } : null);
              break;

            case 'queued':
            case 'started':
            case 'completed':
            case 'failed':
              setStatus(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  build: {
                    ...prev.build,
                    currentBuild: msg.type === 'started' ? msg.job :
                      msg.type === 'completed' || msg.type === 'failed' ? null : prev.build.currentBuild,
                    history: msg.type === 'completed' || msg.type === 'failed'
                      ? [msg.job, ...prev.build.history.slice(0, 9)]
                      : prev.build.history,
                  },
                };
              });
              if (msg.type === 'completed' || msg.type === 'failed') {
                setBuilding(false);
              }
              // Add to logs
              setLogs(prev => [{
                timestamp: new Date().toISOString(),
                level: msg.type === 'failed' ? 'error' : 'info',
                msg: `Build ${msg.type}: ${msg.job?.id?.slice(0, 8)}`,
                jobId: msg.job?.id,
              }, ...prev].slice(0, 1000));
              break;

            case 'output':
              setOutput(prev => prev + msg.text);
              break;

            default:
              console.log('[BuildDaemon] Unknown message type:', msg.type);
          }
        } catch (e) {
          console.error('[BuildDaemon] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        console.log('[BuildDaemon] WebSocket closed');

        // Attempt reconnect
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[BuildDaemon] WebSocket error:', error);
        setError('WebSocket connection failed');
      };

      wsRef.current = ws;
    } catch (_err) {
      setError('Failed to connect to daemon');
    }
  }, []);

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
        throw new Error('Failed to queue build');
      }

      const data = await response.json();
      console.log('[BuildDaemon] Build queued:', data);
    } catch (err) {
      setBuilding(false);
      setError(`Build request failed: ${err}`);
    }
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  // Initial fetch and WebSocket connection
  useEffect(() => {
    fetchStatus();
    connectWebSocket();

    // Refresh status periodically
    const statusInterval = setInterval(fetchStatus, 5000);

    return () => {
      clearInterval(statusInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [fetchStatus, connectWebSocket]);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h2 className="text-xl font-bold text-white">Build Daemon</h2>
          {connected ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => requestBuild(false)}
            disabled={building || !status}
            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Build
          </button>
          <button
            onClick={() => requestBuild(true)}
            disabled={building || !status}
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
      <div className="grid grid-cols-4 gap-4">
        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Status</div>
          <div className={`text-xl font-bold ${status ? 'text-green-400' : 'text-red-400'}`}>
            {status ? 'Running' : 'Offline'}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Queue</div>
          <div className="text-xl font-bold text-white">
            {status?.build.queueLength ?? '-'}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Current Build</div>
          <div className="text-xl font-bold">
            {status?.build.currentBuild ? (
              <span className="text-yellow-400 animate-pulse">
                {status.build.currentBuild.id.slice(0, 8)}
              </span>
            ) : (
              <span className="text-gray-500">None</span>
            )}
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="text-sm text-gray-400 mb-1">Uptime</div>
          <div className="text-xl font-bold text-white">
            {status ? `${(status.uptime / 60).toFixed(0)}m` : '-'}
          </div>
        </GlassSurface>
      </div>

      {/* Build Output */}
      <GlassSurface className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-gray-300">
            <Terminal className="w-4 h-4" />
            <span className="font-medium">Build Output</span>
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
              ({status?.build.history.length ?? 0} builds)
            </span>
          </div>
          {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {showHistory && (
          <div className="divide-y divide-white/5">
            {status?.build.history.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No build history yet
              </div>
            ) : (
              status?.build.history.map((job) => (
                <div key={job.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {job.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-mono text-sm text-gray-300">
                      {job.id.slice(0, 8)}
                    </span>
                    {job.result?.tier !== undefined && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierBadges[job.result.tier]?.color}`}>
                        {tierBadges[job.result.tier]?.label ?? `T${job.result.tier}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{job.source}</span>
                    {job.duration && (
                      <span className="text-gray-500">{formatDuration(job.duration)}</span>
                    )}
                    {job.completedAt && (
                      <span className="text-gray-600 text-xs">
                        {new Date(job.completedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
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
                <span className="text-gray-300 break-all">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </GlassSurface>
    </div>
  );
}
