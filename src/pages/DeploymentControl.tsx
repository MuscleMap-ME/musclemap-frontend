/**
 * Deployment Control Center
 *
 * A sophisticated web management portal for deployment operations.
 * Features:
 * - Real-time deployment streaming with SSE
 * - Interactive command execution via buttons
 * - Complete audit log with filtering
 * - System status dashboard
 * - Mobile-friendly touch interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Server,
  GitBranch,
  Package,
  Database,
  HardDrive,
  Cpu,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Filter,
  Download,
  Zap,
  Shield,
  Rocket,
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import SEO from '../components/SEO';

// ============================================
// TYPES
// ============================================

interface Command {
  key: string;
  description: string;
  dangerous: boolean;
}

interface Sequence {
  key: string;
  name: string;
  description: string;
  steps: string[];
}

interface DeploymentLog {
  id: string;
  command_key: string | null;
  sequence_key: string | null;
  initiated_by: 'api' | 'web' | 'webhook';
  initiator_ip: string;
  initiator_user_id: string | null;
  status: 'pending' | 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  exit_code: number | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  output?: string;
}

interface StreamEvent {
  type: 'start' | 'step-start' | 'output' | 'complete' | 'sequence-complete' | 'history' | 'cancelled';
  command?: string;
  description?: string;
  chunk?: string;
  output?: string;
  exitCode?: number;
  duration?: number;
  success?: boolean;
  timedOut?: boolean;
  timestamp?: number;
}

// ============================================
// API HELPERS
// ============================================

const API_BASE = '';

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('musclemap_token');
  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// ============================================
// COMPONENTS
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
    pending: { color: 'text-yellow-400', icon: <Clock className="w-3 h-3" />, bg: 'bg-yellow-500/20' },
    running: { color: 'text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" />, bg: 'bg-blue-500/20' },
    success: { color: 'text-green-400', icon: <CheckCircle className="w-3 h-3" />, bg: 'bg-green-500/20' },
    failed: { color: 'text-red-400', icon: <XCircle className="w-3 h-3" />, bg: 'bg-red-500/20' },
    timeout: { color: 'text-orange-400', icon: <AlertTriangle className="w-3 h-3" />, bg: 'bg-orange-500/20' },
    cancelled: { color: 'text-gray-400', icon: <Square className="w-3 h-3" />, bg: 'bg-gray-500/20' },
  };

  const { color, icon, bg } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color} ${bg}`}>
      {icon}
      {status}
    </span>
  );
}

function CommandButton({
  command,
  onExecute,
  disabled,
  loading,
}: {
  command: Command;
  onExecute: (key: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const icons: Record<string, React.ReactNode> = {
    'git-pull': <GitBranch className="w-4 h-4" />,
    'git-status': <GitBranch className="w-4 h-4" />,
    'git-log': <GitBranch className="w-4 h-4" />,
    'pnpm-install': <Package className="w-4 h-4" />,
    'build-packages': <Package className="w-4 h-4" />,
    'build-api': <Server className="w-4 h-4" />,
    'build-frontend': <Zap className="w-4 h-4" />,
    'build-all': <Rocket className="w-4 h-4" />,
    'pm2-restart': <RefreshCw className="w-4 h-4" />,
    'pm2-status': <Activity className="w-4 h-4" />,
    'pm2-logs': <Terminal className="w-4 h-4" />,
    'db-migrate': <Database className="w-4 h-4" />,
    'health-check': <CheckCircle className="w-4 h-4" />,
    'disk-usage': <HardDrive className="w-4 h-4" />,
    'memory-usage': <Cpu className="w-4 h-4" />,
    'typecheck': <Shield className="w-4 h-4" />,
    'lint': <Shield className="w-4 h-4" />,
  };

  return (
    <button
      onClick={() => onExecute(command.key)}
      disabled={disabled || loading}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200 active:scale-95
        ${command.dangerous
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icons[command.key] || <Terminal className="w-4 h-4" />}
      <span className="hidden sm:inline">{command.description}</span>
      <span className="sm:hidden">{command.key.split('-').pop()}</span>
    </button>
  );
}

function SequenceCard({
  sequence,
  onExecute,
  disabled,
  loading,
  isActive,
}: {
  sequence: Sequence;
  onExecute: (key: string) => void;
  disabled: boolean;
  loading: boolean;
  isActive: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const icons: Record<string, React.ReactNode> = {
    'full-deploy': <Rocket className="w-5 h-5" />,
    'quick-deploy': <Zap className="w-5 h-5" />,
    'frontend-deploy': <Package className="w-5 h-5" />,
    'safe-check': <Shield className="w-5 h-5" />,
    'system-status': <Activity className="w-5 h-5" />,
  };

  const colors: Record<string, string> = {
    'full-deploy': 'from-purple-500 to-pink-500',
    'quick-deploy': 'from-blue-500 to-cyan-500',
    'frontend-deploy': 'from-green-500 to-emerald-500',
    'safe-check': 'from-yellow-500 to-orange-500',
    'system-status': 'from-gray-500 to-slate-500',
  };

  return (
    <motion.div
      layout
      className={`
        rounded-xl border overflow-hidden transition-all duration-300
        ${isActive
          ? 'border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/30'
          : 'border-white/10 bg-white/5 hover:border-white/20'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[sequence.key] || 'from-gray-500 to-slate-500'}`}>
              {icons[sequence.key] || <Terminal className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-semibold text-white">{sequence.name}</h3>
              <p className="text-sm text-gray-400">{sequence.description}</p>
            </div>
          </div>
          <button
            onClick={() => onExecute(sequence.key)}
            disabled={disabled || loading}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm
              bg-gradient-to-r ${colors[sequence.key] || 'from-gray-500 to-slate-500'}
              text-white shadow-lg hover:shadow-xl
              transition-all duration-200 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isActive ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Steps accordion */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-400"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {sequence.steps.length} steps
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 pl-2 border-l-2 border-white/10 space-y-1">
                {sequence.steps.map((step, i) => (
                  <div key={step} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-4 text-center text-gray-600">{i + 1}</span>
                    <code className="font-mono">{step}</code>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function OutputTerminal({
  output,
  status,
  onClear,
}: {
  output: string[];
  status: string | null;
  onClear: () => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output.join(''));
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Output</span>
          {status && <StatusBadge status={status} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyOutput}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Copy output"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Clear output"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={terminalRef}
        className="h-80 overflow-auto p-4 font-mono text-xs text-green-400 whitespace-pre-wrap"
      >
        {output.length === 0 ? (
          <span className="text-gray-600">Waiting for deployment output...</span>
        ) : (
          output.map((line, i) => (
            <span key={i} className={line.includes('Error') || line.includes('error') ? 'text-red-400' : ''}>
              {line}
            </span>
          ))
        )}
        {status === 'running' && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}

function LogsTable({
  logs,
  onViewDetails,
  loading,
}: {
  logs: DeploymentLog[];
  onViewDetails: (log: DeploymentLog) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No deployment logs yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-white/10">
            <th className="pb-3 font-medium">ID</th>
            <th className="pb-3 font-medium">Command/Sequence</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Source</th>
            <th className="pb-3 font-medium">Duration</th>
            <th className="pb-3 font-medium">Time</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => onViewDetails(log)}
            >
              <td className="py-3 font-mono text-xs text-gray-400">
                {log.id.slice(0, 16)}...
              </td>
              <td className="py-3">
                <span className="font-medium text-white">
                  {log.sequence_key || log.command_key || 'Unknown'}
                </span>
              </td>
              <td className="py-3">
                <StatusBadge status={log.status} />
              </td>
              <td className="py-3 text-gray-400">
                {log.initiated_by}
              </td>
              <td className="py-3 text-gray-400">
                {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
              </td>
              <td className="py-3 text-gray-400">
                {new Date(log.started_at).toLocaleString()}
              </td>
              <td className="py-3">
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogDetailModal({
  log,
  onClose,
}: {
  log: DeploymentLog | null;
  onClose: () => void;
}) {
  const [fullLog, setFullLog] = useState<DeploymentLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log) {
      setLoading(true);
      fetchWithAuth(`/api/deploy/logs/${log.id}`)
        .then((res) => res.json())
        .then((data) => setFullLog(data.data))
        .finally(() => setLoading(false));
    }
  }, [log]);

  if (!log) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl max-h-[80vh] bg-gray-900 rounded-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="font-semibold text-white">
              {log.sequence_key || log.command_key}
            </h3>
            <p className="text-sm text-gray-400 font-mono">{log.id}</p>
          </div>
          <StatusBadge status={log.status} />
        </div>

        <div className="p-4 space-y-4 overflow-auto max-h-[60vh]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Source</p>
              <p className="text-sm text-white">{log.initiated_by}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IP</p>
              <p className="text-sm text-white font-mono">{log.initiator_ip}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm text-white">
                {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Exit Code</p>
              <p className="text-sm text-white">{log.exit_code ?? '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Output</p>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <pre className="p-4 bg-black/50 rounded-lg text-xs font-mono text-green-400 overflow-auto max-h-80 whitespace-pre-wrap">
                {fullLog?.output || 'No output'}
              </pre>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DeploymentControl() {
  const { user, hasHydrated } = useAuth();
  const [commands, setCommands] = useState<Command[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [activeDeployment, setActiveDeployment] = useState<string | null>(null);
  const [activeSequence, setActiveSequence] = useState<string | null>(null);
  const [loadingCommand, setLoadingCommand] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<DeploymentLog | null>(null);
  const [tab, setTab] = useState<'deploy' | 'logs'>('deploy');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch available commands and sequences
  useEffect(() => {
    fetchWithAuth('/api/deploy/commands')
      .then((res) => res.json())
      .then((data) => {
        setCommands(data.data.commands);
        setSequences(data.data.sequences);
      })
      .catch(console.error);
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(() => {
    setLogsLoading(true);
    fetchWithAuth('/api/deploy/logs?limit=50')
      .then((res) => res.json())
      .then((data) => setLogs(data.data.logs))
      .catch(console.error)
      .finally(() => setLogsLoading(false));
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Clean up event source on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Execute a single command
  const executeCommand = async (commandKey: string) => {
    setLoadingCommand(commandKey);
    setOutput([`> Executing: ${commandKey}\n`]);

    try {
      const res = await fetchWithAuth('/api/deploy/execute', {
        method: 'POST',
        body: JSON.stringify({ command: commandKey }),
      });

      const data = await res.json();

      if (data.data) {
        setOutput((prev) => [...prev, data.data.output || '', `\nExit code: ${data.data.exitCode}\n`]);
      } else {
        setOutput((prev) => [...prev, `Error: ${data.error?.message || 'Unknown error'}\n`]);
      }

      fetchLogs();
    } catch (err) {
      setOutput((prev) => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`]);
    } finally {
      setLoadingCommand(null);
    }
  };

  // Execute a sequence with streaming
  const executeSequence = async (sequenceKey: string) => {
    setActiveSequence(sequenceKey);
    setOutput([`> Starting sequence: ${sequenceKey}\n`]);

    try {
      const res = await fetchWithAuth('/api/deploy/execute', {
        method: 'POST',
        body: JSON.stringify({ sequence: sequenceKey }),
      });

      const data = await res.json();

      if (data.data?.deploymentId) {
        setActiveDeployment(data.data.deploymentId);

        // Connect to SSE stream
        const token = localStorage.getItem('musclemap_token');
        const eventSource = new EventSource(
          `${API_BASE}/api/deploy/stream/${data.data.deploymentId}?token=${token}`
        );
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          const eventData: StreamEvent = JSON.parse(event.data);

          switch (eventData.type) {
            case 'history':
              setOutput((prev) => [...prev, eventData.output || '']);
              break;
            case 'step-start':
              setOutput((prev) => [...prev, `\n--- ${eventData.command}: ${eventData.description} ---\n`]);
              break;
            case 'output':
              setOutput((prev) => [...prev, eventData.chunk || '']);
              break;
            case 'complete':
              setOutput((prev) => [
                ...prev,
                `\n[${eventData.command}] Exit: ${eventData.exitCode} (${eventData.duration}ms)\n`,
              ]);
              break;
            case 'sequence-complete':
              setOutput((prev) => [
                ...prev,
                `\n=== ${eventData.success ? 'SUCCESS' : 'FAILED'} (${eventData.duration}ms) ===\n`,
              ]);
              setActiveDeployment(null);
              setActiveSequence(null);
              eventSource.close();
              fetchLogs();
              break;
            case 'cancelled':
              setOutput((prev) => [...prev, '\n=== CANCELLED ===\n']);
              setActiveDeployment(null);
              setActiveSequence(null);
              eventSource.close();
              fetchLogs();
              break;
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setActiveDeployment(null);
          setActiveSequence(null);
        };
      }
    } catch (err) {
      setOutput((prev) => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`]);
      setActiveSequence(null);
    }
  };

  // Cancel active deployment
  const cancelDeployment = async () => {
    if (!activeDeployment) return;

    try {
      await fetchWithAuth(`/api/deploy/cancel/${activeDeployment}`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  // Auth check
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <SEO
        title="Deployment Control"
        description="MuscleMap deployment management portal"
      />

      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Header */}
        <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Deployment Control</h1>
                  <p className="text-sm text-gray-400">MuscleMap Production Server</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {activeDeployment && (
                  <button
                    onClick={cancelDeployment}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Cancel
                  </button>
                )}
                <button
                  onClick={fetchLogs}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              <button
                onClick={() => setTab('deploy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'deploy'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Rocket className="w-4 h-4 inline-block mr-2" />
                Deploy
              </button>
              <button
                onClick={() => setTab('logs')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'logs'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Terminal className="w-4 h-4 inline-block mr-2" />
                Logs
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {tab === 'deploy' ? (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column - Actions */}
              <div className="space-y-6">
                {/* Sequences */}
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Deployment Sequences
                  </h2>
                  <div className="space-y-3">
                    {sequences.map((seq) => (
                      <SequenceCard
                        key={seq.key}
                        sequence={seq}
                        onExecute={executeSequence}
                        disabled={!!activeDeployment || !!loadingCommand}
                        loading={activeSequence === seq.key}
                        isActive={activeSequence === seq.key}
                      />
                    ))}
                  </div>
                </section>

                {/* Individual Commands */}
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-400" />
                    Individual Commands
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {commands.map((cmd) => (
                      <CommandButton
                        key={cmd.key}
                        command={cmd}
                        onExecute={executeCommand}
                        disabled={!!activeDeployment}
                        loading={loadingCommand === cmd.key}
                      />
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column - Output */}
              <div>
                <OutputTerminal
                  output={output}
                  status={activeDeployment ? 'running' : null}
                  onClear={() => setOutput([])}
                />
              </div>
            </div>
          ) : (
            /* Logs Tab */
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Deployment History
                </h2>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <LogsTable logs={logs} onViewDetails={setSelectedLog} loading={logsLoading} />
            </div>
          )}
        </main>

        {/* Log Detail Modal */}
        <AnimatePresence>
          {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
        </AnimatePresence>
      </div>
    </>
  );
}
