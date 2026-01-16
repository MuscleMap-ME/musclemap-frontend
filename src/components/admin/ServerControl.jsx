/**
 * Server Control Panel Component
 *
 * Provides a web interface for server management:
 * - Service status monitoring
 * - Script execution (start, stop, deploy, build, etc.)
 * - PM2 process management
 * - Log viewing with real-time updates
 * - Git status and pull
 * - System metrics (disk, memory, uptime)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Database,
  FileText,
  GitBranch,
  GitCommit,
  GitPullRequest,
  HardDrive,
  Loader2,
  MemoryStick,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  Square,
  Terminal,
  Upload,
  XCircle,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api';

const SCRIPTS = [
  { id: 'status', name: 'Check Status', icon: Activity, color: '#10b981', description: 'Check all service status' },
  { id: 'start', name: 'Start Services', icon: Play, color: '#22c55e', description: 'Start PostgreSQL, Redis, API, Vite' },
  { id: 'stop', name: 'Stop Services', icon: Square, color: '#ef4444', description: 'Stop all services', dangerous: true },
  { id: 'restart-api', name: 'Restart API', icon: RotateCcw, color: '#f59e0b', description: 'Restart API server' },
  { id: 'build', name: 'Build All', icon: Code, color: '#8b5cf6', description: 'Build packages and frontend' },
  { id: 'deploy', name: 'Deploy', icon: Upload, color: '#3b82f6', description: 'Full production deploy', dangerous: true },
  { id: 'test', name: 'Run Tests', icon: CheckCircle, color: '#06b6d4', description: 'Run test suite' },
  { id: 'typecheck', name: 'Typecheck', icon: FileText, color: '#14b8a6', description: 'TypeScript validation' },
  { id: 'lint', name: 'Lint', icon: Code, color: '#a855f7', description: 'ESLint code quality' },
  { id: 'migrate', name: 'Migrate DB', icon: Database, color: '#f97316', description: 'Run database migrations', dangerous: true },
  { id: 'pre-deploy-check', name: 'Pre-Deploy Check', icon: CheckCircle, color: '#10b981', description: 'Validation checks' },
  { id: 'generate-docs', name: 'Generate Docs', icon: FileText, color: '#6366f1', description: 'Regenerate documentation' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatUptime(ms) {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (typeof bytes === 'string') return bytes;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function ServiceStatus({ name, online, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        online ? 'bg-green-500/20' : 'bg-red-500/20'
      }`}>
        <Icon className={`w-5 h-5 ${online ? 'text-green-400' : 'text-red-400'}`} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{name}</div>
        <div className={`text-xs ${online ? 'text-green-400' : 'text-red-400'}`}>
          {online ? 'Online' : 'Offline'}
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
    </div>
  );
}

function ProcessCard({ process, onAction }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    await onAction(action, process.name);
    setLoading(false);
  };

  const statusColors = {
    online: 'text-green-400',
    stopped: 'text-gray-400',
    errored: 'text-red-400',
    launching: 'text-yellow-400',
  };

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-medium text-white">{process.name}</div>
          <div className={`text-xs ${statusColors[process.status] || 'text-gray-400'}`}>
            {process.status} • PID: {process.pid || 'N/A'}
          </div>
        </div>
        <div className="flex gap-1">
          {process.status === 'online' ? (
            <>
              <button
                onClick={() => handleAction('restart')}
                disabled={loading}
                className="p-1.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors disabled:opacity-50"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAction('stop')}
                disabled={loading}
                className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction('start')}
              disabled={loading}
              className="p-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors disabled:opacity-50"
              title="Start"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">CPU</div>
          <div className="text-white font-medium">{process.cpu?.toFixed(1) || 0}%</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">Memory</div>
          <div className="text-white font-medium">{formatBytes(process.memory)}</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400">Uptime</div>
          <div className="text-white font-medium">{formatUptime(process.uptime)}</div>
        </div>
      </div>
      {process.restarts > 0 && (
        <div className="mt-2 text-xs text-yellow-400">
          ⚠️ {process.restarts} restart{process.restarts > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function ScriptButton({ script, onRun, running }) {
  const Icon = script.icon;
  const isRunning = running === script.id;

  return (
    <button
      onClick={() => onRun(script.id)}
      disabled={running}
      className={`
        relative p-3 rounded-lg border transition-all duration-200
        ${script.dangerous
          ? 'border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10'
          : 'border-white/10 hover:border-white/30 hover:bg-white/5'
        }
        ${running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        group
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${script.color}20` }}
        >
          {isRunning ? (
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: script.color }} />
          ) : (
            <Icon className="w-5 h-5" style={{ color: script.color }} />
          )}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-white">{script.name}</div>
          <div className="text-xs text-gray-400">{script.description}</div>
        </div>
      </div>
      {script.dangerous && (
        <div className="absolute top-1 right-1">
          <AlertTriangle className="w-3 h-3 text-red-400" />
        </div>
      )}
    </button>
  );
}

function LogViewer({ logs, loading, onRefresh, streamEnabled, onToggleStream, streamLogs }) {
  const logRef = useRef(null);
  const displayLogs = streamEnabled ? streamLogs : logs;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [displayLogs]);

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">Logs</span>
          {streamEnabled && (
            <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStream}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              streamEnabled
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {streamEnabled ? 'Stop Live' : 'Go Live'}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading || streamEnabled}
            className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div
        ref={logRef}
        className="p-3 font-mono text-xs text-gray-300 bg-black/40 h-64 overflow-auto whitespace-pre-wrap"
      >
        {displayLogs || 'No logs available. Click refresh to load or "Go Live" for real-time streaming.'}
      </div>
    </div>
  );
}

function OutputPanel({ output, title, onClose }) {
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!output) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-gray-900/95 border-t border-white/10 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">{title}</span>
            {output.success !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                output.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {output.success ? 'Success' : 'Failed'}
              </span>
            )}
            {output.duration !== undefined && (
              <span className="text-xs text-gray-400">
                {(output.duration / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div
          ref={outputRef}
          className="font-mono text-xs text-gray-300 bg-black/60 rounded-lg p-3 h-48 overflow-auto whitespace-pre-wrap"
        >
          {output.output || output.error || 'No output'}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ServerControl() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState('');
  const [gitInfo, setGitInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [runningScript, setRunningScript] = useState(null);
  const [scriptOutput, setScriptOutput] = useState(null);
  const [_activeTab, _setActiveTab] = useState('overview');
  const [expandedSection, setExpandedSection] = useState('scripts');

  // WebSocket streaming state
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [streamLogs, setStreamLogs] = useState('');
  const wsRef = useRef(null);

  // Get auth token
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch system status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/server/status`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/server/logs?lines=200`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [getAuthHeader]);

  // Fetch git info
  const fetchGitInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/server/git`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setGitInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch git info:', err);
    }
  }, [getAuthHeader]);

  // Run script
  const runScript = useCallback(async (scriptId) => {
    setRunningScript(scriptId);
    setScriptOutput(null);

    try {
      const res = await fetch(`${API_BASE}/admin/server/script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ script: scriptId }),
      });

      const data = await res.json();
      setScriptOutput({ ...data, script: scriptId });

      // Refresh status after script execution
      fetchStatus();
    } catch (err) {
      setScriptOutput({
        success: false,
        error: err.message,
        script: scriptId,
      });
    } finally {
      setRunningScript(null);
    }
  }, [getAuthHeader, fetchStatus]);

  // Process action (PM2)
  const handleProcessAction = useCallback(async (action, processName) => {
    try {
      const res = await fetch(`${API_BASE}/admin/server/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action, process: processName }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh status
        setTimeout(fetchStatus, 1000);
      }
    } catch (err) {
      console.error('Process action failed:', err);
    }
  }, [getAuthHeader, fetchStatus]);

  // Git pull
  const handleGitPull = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/server/git/pull`, {
        method: 'POST',
        headers: getAuthHeader(),
      });

      const data = await res.json();
      setScriptOutput({ ...data, script: 'git-pull' });
      fetchGitInfo();
    } catch (err) {
      setScriptOutput({
        success: false,
        error: err.message,
        script: 'git-pull',
      });
    }
  }, [getAuthHeader, fetchGitInfo]);

  // WebSocket log streaming
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      console.error('No auth token for WebSocket');
      return;
    }

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/admin/server/logs/stream?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected for log streaming');
      setStreamLogs('Connected to live log stream...\n');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'log') {
          setStreamLogs((prev) => {
            // Keep last 500 lines to prevent memory issues
            const lines = (prev + message.data + '\n').split('\n');
            return lines.slice(-500).join('\n');
          });
        }
      } catch {
        // If not JSON, treat as raw log line
        setStreamLogs((prev) => {
          const lines = (prev + event.data + '\n').split('\n');
          return lines.slice(-500).join('\n');
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStreamLogs((prev) => prev + '\n[WebSocket Error: Connection failed]\n');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (streamEnabled) {
        setStreamLogs((prev) => prev + '\n[Disconnected]\n');
      }
    };
  }, [streamEnabled]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleToggleStream = useCallback(() => {
    if (streamEnabled) {
      disconnectWebSocket();
      setStreamEnabled(false);
    } else {
      setStreamLogs('');
      setStreamEnabled(true);
      connectWebSocket();
    }
  }, [streamEnabled, connectWebSocket, disconnectWebSocket]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchGitInfo();
    fetchLogs();

    // Auto-refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchGitInfo, fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-cyan-400" />
            Server Control
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage services, run scripts, and monitor the system
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Refresh</span>
        </button>
      </div>

      {/* Services Status */}
      <GlassSurface className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Services
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ServiceStatus
            name="PostgreSQL"
            online={status?.services?.postgres}
            icon={Database}
          />
          <ServiceStatus
            name="Redis"
            online={status?.services?.redis}
            icon={MemoryStick}
          />
          <ServiceStatus
            name="API Server"
            online={status?.services?.api}
            icon={Server}
          />
          <ServiceStatus
            name="Vite Dev"
            online={status?.services?.vite}
            icon={Zap}
          />
        </div>
      </GlassSurface>

      {/* System Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Disk Usage</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {status?.disk?.percent || 0}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {status?.disk?.used || '0'} / {status?.disk?.total || '0'}
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${status?.disk?.percent || 0}%` }}
            />
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Memory</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {status?.memory?.percent || 0}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {status?.memory?.used || '0'} / {status?.memory?.total || '0'}
          </div>
          <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${status?.memory?.percent || 0}%` }}
            />
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">Uptime</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatUptime(status?.uptime)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            System running since boot
          </div>
        </GlassSurface>
      </div>

      {/* Scripts */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'scripts' ? '' : 'scripts')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-green-400" />
            Scripts
          </h3>
          {expandedSection === 'scripts' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'scripts' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {SCRIPTS.map((script) => (
              <ScriptButton
                key={script.id}
                script={script}
                onRun={runScript}
                running={runningScript}
              />
            ))}
          </div>
        )}
      </GlassSurface>

      {/* PM2 Processes */}
      {status?.processes?.length > 0 && (
        <GlassSurface className="p-4">
          <button
            onClick={() => setExpandedSection(expandedSection === 'processes' ? '' : 'processes')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400" />
              PM2 Processes ({status.processes.length})
            </h3>
            {expandedSection === 'processes' ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSection === 'processes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {status.processes.map((process) => (
                <ProcessCard
                  key={process.name}
                  process={process}
                  onAction={handleProcessAction}
                />
              ))}
            </div>
          )}
        </GlassSurface>
      )}

      {/* Git Status */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'git' ? '' : 'git')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-orange-400" />
            Git Status
            {gitInfo?.branch && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                {gitInfo.branch}
              </span>
            )}
          </h3>
          {expandedSection === 'git' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'git' && gitInfo && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleGitPull}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
              >
                <GitPullRequest className="w-4 h-4" />
                Pull Latest
              </button>
              <button
                onClick={fetchGitInfo}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {gitInfo.status?.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="text-xs font-medium text-yellow-400 mb-2">
                  {gitInfo.status.length} uncommitted change{gitInfo.status.length !== 1 ? 's' : ''}
                </div>
                <div className="font-mono text-xs text-gray-300 space-y-1">
                  {gitInfo.status.slice(0, 10).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                  {gitInfo.status.length > 10 && (
                    <div className="text-gray-500">... and {gitInfo.status.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-gray-400 mb-2">Recent Commits</div>
              <div className="font-mono text-xs text-gray-300 space-y-1">
                {gitInfo.recentCommits?.slice(0, 5).map((commit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GitCommit className="w-3 h-3 text-gray-500" />
                    <span>{commit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </GlassSurface>

      {/* Logs */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'logs' ? '' : 'logs')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            Server Logs
          </h3>
          {expandedSection === 'logs' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'logs' && (
          <LogViewer
            logs={logs}
            loading={logsLoading}
            onRefresh={fetchLogs}
            streamEnabled={streamEnabled}
            onToggleStream={handleToggleStream}
            streamLogs={streamLogs}
          />
        )}
      </GlassSurface>

      {/* Script Output Panel */}
      <OutputPanel
        output={scriptOutput}
        title={`Output: ${scriptOutput?.script || 'Script'}`}
        onClose={() => setScriptOutput(null)}
      />
    </div>
  );
}
