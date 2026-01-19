/**
 * Command Center
 *
 * A beautiful, hierarchical interface for executing server commands.
 * Part of the Empire control panel at /empire/commands
 *
 * Features:
 * - 470+ pre-approved commands organized by category
 * - Real-time output streaming via SSE
 * - Search and filter commands
 * - Execution history
 * - Mobile-friendly responsive design
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Search,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  AlertTriangle,
  History,
  Zap,
  Activity,
  GitBranch,
  Rocket,
  Database,
  Layers,
  Cpu,
  Globe,
  FileText,
  Server,
  Shield,
  Trash2,
  Settings,
  AlertOctagon,
  Stethoscope,
  RefreshCw,
  Package,
  HardDrive,
  Key,
  Lock,
  Network,
  Heart,
  Wrench,
  Save,
  Download,
  Archive,
  BarChart,
  ArrowUpDown,
  Info,
  Hammer,
  Monitor,
  Gauge,
  Code,
  FileCode,
  File,
  ShieldAlert,
  Share2,
} from 'lucide-react';
import { useAuth } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import SEO from '../components/SEO';

// ============================================
// TYPES
// ============================================

interface CommandDef {
  cmd: string;
  description: string;
  dangerous: boolean;
  timeout: number;
}

interface SubCategory {
  name: string;
  icon: string;
  commands: CommandDef[];
}

interface Category {
  name: string;
  icon: string;
  description: string;
  subcategories: SubCategory[];
}

interface FlatCommand {
  category: string;
  categoryIcon: string;
  subcategory: string;
  subcategoryIcon: string;
  cmd: string;
  description: string;
  dangerous: boolean;
  timeout: number;
}

interface ExecutionRecord {
  id: string;
  command: string;
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  exitCode?: number;
  output: string;
}

// ============================================
// ICON MAPPING
// ============================================

const iconMap: Record<string, React.ReactNode> = {
  Activity: <Activity className="w-4 h-4" />,
  GitBranch: <GitBranch className="w-4 h-4" />,
  Rocket: <Rocket className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  Globe: <Globe className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Server: <Server className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Trash2: <Trash2 className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  AlertOctagon: <AlertOctagon className="w-4 h-4" />,
  Stethoscope: <Stethoscope className="w-4 h-4" />,
  Info: <Info className="w-4 h-4" />,
  Play: <Play className="w-4 h-4" />,
  Save: <Save className="w-4 h-4" />,
  Download: <Download className="w-4 h-4" />,
  Archive: <Archive className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Hammer: <Hammer className="w-4 h-4" />,
  Terminal: <Terminal className="w-4 h-4" />,
  BarChart: <BarChart className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
  ArrowUpDown: <ArrowUpDown className="w-4 h-4" />,
  Key: <Key className="w-4 h-4" />,
  Monitor: <Monitor className="w-4 h-4" />,
  HardDrive: <HardDrive className="w-4 h-4" />,
  Gauge: <Gauge className="w-4 h-4" />,
  Network: <Network className="w-4 h-4" />,
  Search: <Search className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4" />,
  Code: <Code className="w-4 h-4" />,
  FileCode: <FileCode className="w-4 h-4" />,
  File: <File className="w-4 h-4" />,
  XCircle: <XCircle className="w-4 h-4" />,
  RefreshCw: <RefreshCw className="w-4 h-4" />,
  Share2: <Share2 className="w-4 h-4" />,
};

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
    running: { color: 'text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" />, bg: 'bg-blue-500/20' },
    success: { color: 'text-green-400', icon: <CheckCircle className="w-3 h-3" />, bg: 'bg-green-500/20' },
    failed: { color: 'text-red-400', icon: <XCircle className="w-3 h-3" />, bg: 'bg-red-500/20' },
    timeout: { color: 'text-orange-400', icon: <AlertTriangle className="w-3 h-3" />, bg: 'bg-orange-500/20' },
    cancelled: { color: 'text-gray-400', icon: <Square className="w-3 h-3" />, bg: 'bg-gray-500/20' },
  };

  const { color, icon, bg } = config[status] || config.running;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${color} ${bg}`}>
      {icon}
      {status}
    </span>
  );
}

function CommandCard({
  command,
  onExecute,
  disabled,
}: {
  command: FlatCommand;
  onExecute: (cmd: string) => void;
  disabled: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(command.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-3 rounded-lg border transition-all duration-200
        ${command.dangerous
          ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
          : 'bg-white/5 border-white/10 hover:border-white/20'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-300 mb-1">{command.description}</p>
          <code className="text-xs text-cyan-400 font-mono break-all">{command.cmd}</code>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
            title="Copy command"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onExecute(command.cmd)}
            disabled={disabled}
            className={`
              p-1.5 rounded transition-colors
              ${command.dangerous
                ? 'text-red-400 hover:bg-red-500/20'
                : 'text-green-400 hover:bg-green-500/20'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="Execute command"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      </div>
      {command.dangerous && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="w-3 h-3" />
          <span>Dangerous operation</span>
        </div>
      )}
    </motion.div>
  );
}

function CategorySection({
  category,
  onExecute,
  disabled,
  expandedSubcategories,
  toggleSubcategory,
}: {
  category: Category;
  onExecute: (cmd: string) => void;
  disabled: boolean;
  expandedSubcategories: Set<string>;
  toggleSubcategory: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
            {iconMap[category.icon] || <Terminal className="w-4 h-4" />}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">{category.name}</h3>
            <p className="text-xs text-gray-400">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {category.subcategories.reduce((acc, sub) => acc + sub.commands.length, 0)} commands
          </span>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            {category.subcategories.map((subcategory) => {
              const subKey = `${category.name}:${subcategory.name}`;
              const isSubExpanded = expandedSubcategories.has(subKey);

              return (
                <div key={subcategory.name} className="border-b border-white/5 last:border-b-0">
                  <button
                    onClick={() => toggleSubcategory(subKey)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-white/10">
                        {iconMap[subcategory.icon] || <Terminal className="w-3 h-3" />}
                      </div>
                      <span className="text-sm text-gray-300">{subcategory.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{subcategory.commands.length}</span>
                      {isSubExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isSubExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="px-4 pb-4 space-y-2"
                      >
                        {subcategory.commands.map((cmd) => (
                          <CommandCard
                            key={cmd.cmd}
                            command={{
                              ...cmd,
                              category: category.name,
                              categoryIcon: category.icon,
                              subcategory: subcategory.name,
                              subcategoryIcon: subcategory.icon,
                            }}
                            onExecute={onExecute}
                            disabled={disabled}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExecutionPanel({
  execution,
  output,
  onCancel,
  onClose,
}: {
  execution: { id: string; command: string; status: string } | null;
  output: string;
  onCancel: () => void;
  onClose: () => void;
}) {
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  if (!execution) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-4 bottom-4 md:inset-x-auto md:right-4 md:bottom-4 md:w-[600px] bg-gray-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50"
    >
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <StatusBadge status={execution.status} />
          <code className="text-xs text-gray-400 font-mono truncate max-w-[300px]">
            {execution.command}
          </code>
        </div>
        <div className="flex items-center gap-2">
          {execution.status === 'running' && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded text-red-400 hover:bg-red-500/20 transition-colors"
              title="Cancel execution"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:bg-white/10 transition-colors"
            title="Close"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
      <pre
        ref={outputRef}
        className="p-4 text-xs font-mono text-gray-300 bg-black/50 h-64 overflow-auto whitespace-pre-wrap"
      >
        {output || 'Waiting for output...'}
      </pre>
    </motion.div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CommandCenter() {
  const { user, loading, hasHydrated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FlatCommand[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [activeExecution, setActiveExecution] = useState<{ id: string; command: string; status: string } | null>(null);
  const [executionOutput, setExecutionOutput] = useState('');
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Determine if user is authorized (for conditional logic in effects)
  const isAuthorized = hasHydrated && !loading && user && user.is_admin;

  // Load categories
  useEffect(() => {
    if (!isAuthorized) return;
    async function loadCategories() {
      try {
        const res = await fetchWithAuth('/api/admin/commands/hierarchy');
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to load command hierarchy:', error);
      }
    }
    loadCategories();
  }, [isAuthorized]);

  // Load history
  useEffect(() => {
    if (!isAuthorized) return;
    async function loadHistory() {
      try {
        const res = await fetchWithAuth('/api/admin/commands/history?limit=20');
        const data = await res.json();
        setHistory(data.history || []);
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    }
    loadHistory();
  }, [isAuthorized, activeExecution?.status]);

  // Search
  useEffect(() => {
    if (!isAuthorized) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/admin/commands/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isAuthorized, searchQuery]);

  // Execute command
  const executeCommand = useCallback(async (cmd: string) => {
    try {
      const res = await fetchWithAuth('/api/admin/commands/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd }),
      });
      const data = await res.json();

      if (data.executionId) {
        setActiveExecution({
          id: data.executionId,
          command: cmd,
          status: 'running',
        });
        setExecutionOutput('');

        // Connect to SSE stream
        const token = localStorage.getItem('musclemap_token');
        const streamUrl = `/api/admin/commands/stream/${data.executionId}?token=${token}`;
        console.log('[CommandCenter] Connecting to SSE:', streamUrl);
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          console.log('[CommandCenter] SSE connection opened');
        };

        es.onmessage = (event) => {
          console.log('[CommandCenter] SSE message received:', event.data);
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output') {
              setExecutionOutput((prev) => prev + msg.chunk);
            } else if (msg.type === 'complete') {
              setActiveExecution((prev) => prev ? { ...prev, status: msg.status } : null);
              es.close();
            } else if (msg.type === 'timeout') {
              setActiveExecution((prev) => prev ? { ...prev, status: 'timeout' } : null);
              es.close();
            } else if (msg.type === 'cancelled') {
              setActiveExecution((prev) => prev ? { ...prev, status: 'cancelled' } : null);
              es.close();
            } else if (msg.type === 'history') {
              setExecutionOutput(msg.output || '');
              setActiveExecution((prev) => prev ? { ...prev, status: msg.status } : null);
              es.close();
            } else if (msg.type === 'error') {
              console.error('[CommandCenter] SSE error message:', msg.message);
              setExecutionOutput(`Error: ${msg.message}`);
              setActiveExecution((prev) => prev ? { ...prev, status: 'failed' } : null);
              es.close();
            }
          } catch (e) {
            console.error('[CommandCenter] SSE parse error:', e, 'data:', event.data);
          }
        };

        es.onerror = (e) => {
          console.error('[CommandCenter] SSE connection error:', e, 'readyState:', es.readyState);
          // readyState: 0=CONNECTING, 1=OPEN, 2=CLOSED
          if (es.readyState === EventSource.CLOSED) {
            setActiveExecution((prev) => prev ? { ...prev, status: 'failed' } : null);
          }
          es.close();
        };
      }
    } catch (error) {
      console.error('Execution failed:', error);
    }
  }, []);

  // Cancel execution
  const cancelExecution = useCallback(async () => {
    if (!activeExecution) return;
    try {
      await fetchWithAuth(`/api/admin/commands/cancel/${activeExecution.id}`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  }, [activeExecution]);

  // Close execution panel
  const closeExecution = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setActiveExecution(null);
    setExecutionOutput('');
  }, []);

  // Toggle subcategory
  const toggleSubcategory = useCallback((key: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Auth check - must be AFTER all hooks
  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  const totalCommands = categories.reduce(
    (acc, cat) => acc + cat.subcategories.reduce((a, sub) => a + sub.commands.length, 0),
    0
  );

  return (
    <>
      <SEO
        title="Command Center | Empire"
        description="Execute and manage server commands"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/20">
                <Terminal className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Command Center</h1>
                <p className="text-sm text-gray-400">
                  {totalCommands} pre-approved commands organized by category
                </p>
              </div>
            </div>
          </div>

          {/* Search & History */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 animate-spin" />
              )}
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors
                ${showHistory
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }
              `}
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">
                Search Results ({searchResults.length})
              </h2>
              {searchResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No commands found matching &quot;{searchQuery}&quot;</p>
              ) : (
                <div className="grid gap-2">
                  {searchResults.slice(0, 20).map((cmd) => (
                    <CommandCard
                      key={cmd.cmd}
                      command={cmd}
                      onExecute={executeCommand}
                      disabled={activeExecution?.status === 'running'}
                    />
                  ))}
                  {searchResults.length > 20 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Showing first 20 of {searchResults.length} results
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History Panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h2 className="text-lg font-semibold text-white mb-3">Recent Executions</h2>
                  {history.length === 0 ? (
                    <p className="text-gray-500 text-sm">No execution history</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {history.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => {
                            setActiveExecution({
                              id: record.id,
                              command: record.command,
                              status: record.status,
                            });
                            setExecutionOutput(record.output || '');
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <StatusBadge status={record.status} />
                            <code className="text-xs text-gray-400 font-mono truncate">
                              {record.command}
                            </code>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {record.durationMs && (
                              <span>{(record.durationMs / 1000).toFixed(1)}s</span>
                            )}
                            <span>
                              {new Date(record.startedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          {!searchQuery && (
            <div className="space-y-4">
              {categories.map((category) => (
                <CategorySection
                  key={category.name}
                  category={category}
                  onExecute={executeCommand}
                  disabled={activeExecution?.status === 'running'}
                  expandedSubcategories={expandedSubcategories}
                  toggleSubcategory={toggleSubcategory}
                />
              ))}
            </div>
          )}
        </div>

        {/* Execution Panel */}
        <ExecutionPanel
          execution={activeExecution}
          output={executionOutput}
          onCancel={cancelExecution}
          onClose={closeExecution}
        />
      </div>
    </>
  );
}
