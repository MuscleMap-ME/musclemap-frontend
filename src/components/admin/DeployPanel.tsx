/**
 * Deploy Panel Component
 *
 * Provides a web interface for deployment pipeline management:
 * - Current deployment status with git commit, branch, timestamp
 * - Deployment history timeline with status badges
 * - Branch selector dropdown
 * - Deploy button with confirmation modal
 * - Rollback functionality
 * - Real-time deployment progress via WebSocket
 * - Preview changes before deploying
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  GitBranch,
  GitCommit,
  History,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  RotateCcw,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/deploy';

const STATUS_CONFIG = {
  success: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    icon: CheckCircle,
    label: 'Success',
  },
  failed: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: XCircle,
    label: 'Failed',
  },
  'in-progress': {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    icon: Loader2,
    label: 'In Progress',
  },
  pending: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
    icon: Clock,
    label: 'Pending',
  },
  'rolled-back': {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: RotateCcw,
    label: 'Rolled Back',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'N/A';
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function truncateCommit(commit) {
  if (!commit) return 'N/A';
  return commit.length > 7 ? commit.substring(0, 7) : commit;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const isAnimated = status === 'in-progress';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <Icon className={`w-3.5 h-3.5 ${isAnimated ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

function CurrentDeploymentCard({ deployment, loading, onRefresh }) {
  if (loading) {
    return (
      <GlassSurface className="p-4">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      </GlassSurface>
    );
  }

  if (!deployment) {
    return (
      <GlassSurface className="p-4">
        <div className="text-center py-8">
          <Rocket className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No deployment information available</p>
          <button
            onClick={onRefresh}
            className="mt-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-400" />
          Current Deployment
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Status</div>
          <StatusBadge status={deployment.status} />
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Branch</div>
          <div className="flex items-center gap-1.5 text-white">
            <GitBranch className="w-4 h-4 text-orange-400" />
            <span className="font-mono text-sm">{deployment.branch || 'main'}</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Commit</div>
          <div className="flex items-center gap-1.5 text-white">
            <GitCommit className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-sm">{truncateCommit(deployment.commit)}</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Deployed</div>
          <div className="flex items-center gap-1.5 text-white">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm">{formatRelativeTime(deployment.timestamp)}</span>
          </div>
        </div>
      </div>

      {deployment.message && (
        <div className="mt-3 p-3 bg-white/5 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Message</div>
          <div className="text-sm text-white">{deployment.message}</div>
        </div>
      )}
    </GlassSurface>
  );
}

function BranchSelector({ branches, selectedBranch, onSelect, loading }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors min-w-[160px]"
      >
        <GitBranch className="w-4 h-4 text-orange-400" />
        <span className="text-sm text-white flex-1 text-left font-mono">
          {selectedBranch || 'Select branch'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900/95 border border-white/10 rounded-lg shadow-xl backdrop-blur-xl z-50 max-h-60 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">No branches found</div>
          ) : (
            branches.map((branch) => (
              <button
                key={branch}
                onClick={() => {
                  onSelect(branch);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                  branch === selectedBranch ? 'bg-white/5 text-cyan-400' : 'text-white'
                }`}
              >
                <span className="font-mono">{branch}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmationModal({ isOpen, onClose, onConfirm, branch, changes, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg mx-4 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Confirm Deployment
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-gray-300">
            You are about to deploy the <span className="font-mono text-cyan-400">{branch}</span> branch to production.
          </p>

          {changes && changes.length > 0 && (
            <div className="bg-white/5 rounded-lg p-3 max-h-40 overflow-auto">
              <div className="text-xs text-gray-400 mb-2">Changes to be deployed:</div>
              <div className="font-mono text-xs text-gray-300 space-y-1">
                {changes.slice(0, 10).map((change, i) => (
                  <div key={i} className="truncate">{change}</div>
                ))}
                {changes.length > 10 && (
                  <div className="text-gray-500">... and {changes.length - 10} more changes</div>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-400">
              This action will update the production server. Make sure all tests pass before proceeding.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Deploy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeploymentHistoryItem({ deployment, onRollback, isRollingBack }) {
  const config = STATUS_CONFIG[deployment.status] || STATUS_CONFIG.pending;
  const canRollback = deployment.status === 'success' && !deployment.isCurrentDeployment;

  return (
    <div className={`relative pl-6 pb-6 border-l-2 ${config.borderColor} last:pb-0`}>
      {/* Timeline dot */}
      <div
        className={`absolute -left-2 top-0 w-4 h-4 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
      </div>

      <div className="bg-white/5 rounded-lg p-3 ml-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={deployment.status} />
            {deployment.isCurrentDeployment && (
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                Current
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{formatRelativeTime(deployment.timestamp)}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-300">
            <GitBranch className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono">{deployment.branch}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            <GitCommit className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono">{truncateCommit(deployment.commit)}</span>
          </div>
        </div>

        {deployment.message && (
          <div className="mt-2 text-xs text-gray-400 truncate">{deployment.message}</div>
        )}

        {canRollback && (
          <button
            onClick={() => onRollback(deployment.id)}
            disabled={isRollingBack}
            className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs transition-colors disabled:opacity-50"
          >
            {isRollingBack ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RotateCcw className="w-3 h-3" />
            )}
            Rollback to this version
          </button>
        )}
      </div>
    </div>
  );
}

function DeploymentProgress({ logs, isActive }) {
  const logsRef = useRef(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <GlassSurface className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          Deployment Progress
        </h3>
        {isActive && (
          <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div
        ref={logsRef}
        className="font-mono text-xs text-gray-300 bg-black/40 rounded-lg p-3 h-64 overflow-auto whitespace-pre-wrap border border-white/5"
      >
        {logs || 'Waiting for deployment output...'}
      </div>
    </GlassSurface>
  );
}

function PreviewChangesModal({ isOpen, onClose, changes, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl mx-4 backdrop-blur-xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Preview Changes
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : changes && changes.length > 0 ? (
            <div className="space-y-2">
              {changes.map((change, i) => (
                <div
                  key={i}
                  className={`font-mono text-sm p-2 rounded ${
                    change.startsWith('+')
                      ? 'bg-green-500/10 text-green-400'
                      : change.startsWith('-')
                      ? 'bg-red-500/10 text-red-400'
                      : change.startsWith('M ')
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : change.startsWith('A ')
                      ? 'bg-green-500/10 text-green-400'
                      : change.startsWith('D ')
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-white/5 text-gray-300'
                  }`}
                >
                  {change}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-400">No pending changes to deploy</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DeployPanel() {
  // State
  const [currentDeployment, setCurrentDeployment] = useState(null);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [previewChanges, setPreviewChanges] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [rollingBack, setRollingBack] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // WebSocket streaming
  const [deploymentLogs, setDeploymentLogs] = useState('');
  const [isDeploymentActive, setIsDeploymentActive] = useState(false);
  const wsRef = useRef(null);

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

  // Fetch current deployment status
  const fetchCurrentDeployment = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentDeployment(data);
      }
    } catch (err) {
      console.error('Failed to fetch deployment status:', err);
    }
  }, [getAuthHeader]);

  // Fetch deployment history
  const fetchDeploymentHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setDeploymentHistory(data.deployments || []);
      }
    } catch (err) {
      console.error('Failed to fetch deployment history:', err);
    }
  }, [getAuthHeader]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setBranchesLoading(false);
    }
  }, [getAuthHeader]);

  // Fetch preview changes
  const fetchPreviewChanges = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/preview/${encodeURIComponent(selectedBranch)}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewChanges(data.changes || []);
      }
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  }, [getAuthHeader, selectedBranch]);

  // Connect WebSocket for deployment streaming
  const connectDeploymentStream = useCallback(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      console.error('No auth token for WebSocket');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/admin/deploy/stream?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Deployment WebSocket connected');
      setDeploymentLogs('Connected to deployment stream...\n');
      setIsDeploymentActive(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'log') {
          setDeploymentLogs((prev) => {
            const lines = (prev + message.data + '\n').split('\n');
            return lines.slice(-500).join('\n');
          });
        } else if (message.type === 'complete') {
          setDeploymentLogs((prev) => prev + `\n[Deployment ${message.success ? 'completed successfully' : 'failed'}]\n`);
          setDeploying(false);
          setIsDeploymentActive(false);
          fetchCurrentDeployment();
          fetchDeploymentHistory();
        }
      } catch {
        setDeploymentLogs((prev) => {
          const lines = (prev + event.data + '\n').split('\n');
          return lines.slice(-500).join('\n');
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setDeploymentLogs((prev) => prev + '\n[WebSocket Error: Connection failed]\n');
    };

    ws.onclose = () => {
      console.log('Deployment WebSocket disconnected');
      setIsDeploymentActive(false);
    };

    return ws;
  }, [fetchCurrentDeployment, fetchDeploymentHistory]);

  // Start deployment
  const startDeployment = useCallback(async () => {
    setDeploying(true);
    setDeploymentLogs('');
    setShowConfirmModal(false);

    // Connect to WebSocket for streaming
    connectDeploymentStream();

    try {
      const res = await fetch(`${API_BASE}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ branch: selectedBranch }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDeploymentLogs((prev) => prev + `\n[Error: ${data.error || 'Deployment failed'}]\n`);
        setDeploying(false);
      }
    } catch (err) {
      setDeploymentLogs((prev) => prev + `\n[Error: ${err.message}]\n`);
      setDeploying(false);
    }
  }, [connectDeploymentStream, getAuthHeader, selectedBranch]);

  // Rollback deployment
  const rollbackDeployment = useCallback(async (deploymentId) => {
    setRollingBack(deploymentId);

    try {
      const res = await fetch(`${API_BASE}/rollback/${deploymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (res.ok) {
        fetchCurrentDeployment();
        fetchDeploymentHistory();
      } else {
        const data = await res.json();
        console.error('Rollback failed:', data.error);
      }
    } catch (err) {
      console.error('Rollback failed:', err);
    } finally {
      setRollingBack(null);
    }
  }, [getAuthHeader, fetchCurrentDeployment, fetchDeploymentHistory]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCurrentDeployment(),
      fetchDeploymentHistory(),
      fetchBranches(),
    ]);
    setLoading(false);
  }, [fetchCurrentDeployment, fetchDeploymentHistory, fetchBranches]);

  // Handle preview button click
  const handlePreview = useCallback(() => {
    setShowPreviewModal(true);
    fetchPreviewChanges();
  }, [fetchPreviewChanges]);

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
    refreshAll();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchCurrentDeployment();
      fetchDeploymentHistory();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshAll, fetchCurrentDeployment, fetchDeploymentHistory]);

  // Render loading state
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
            <Rocket className="w-6 h-6 text-cyan-400" />
            Deployment Pipeline
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Deploy, rollback, and monitor production deployments
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Refresh</span>
        </button>
      </div>

      {/* Current Deployment Status */}
      <CurrentDeploymentCard
        deployment={currentDeployment}
        loading={false}
        onRefresh={fetchCurrentDeployment}
      />

      {/* Deploy Controls */}
      <GlassSurface className="p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-green-400" />
          Deploy Controls
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <BranchSelector
            branches={branches}
            selectedBranch={selectedBranch}
            onSelect={setSelectedBranch}
            loading={branchesLoading}
          />

          <button
            onClick={handlePreview}
            disabled={deploying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Preview Changes
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={deploying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Deploy to Production
              </>
            )}
          </button>
        </div>
      </GlassSurface>

      {/* Deployment Progress (shown during deployment) */}
      {(deploying || deploymentLogs) && (
        <DeploymentProgress logs={deploymentLogs} isActive={isDeploymentActive} />
      )}

      {/* Deployment History */}
      <GlassSurface className="p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          Deployment History
        </h3>

        {deploymentHistory.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No deployment history available</p>
          </div>
        ) : (
          <div className="space-y-0">
            {deploymentHistory.map((deployment) => (
              <DeploymentHistoryItem
                key={deployment.id}
                deployment={deployment}
                onRollback={rollbackDeployment}
                isRollingBack={rollingBack === deployment.id}
              />
            ))}
          </div>
        )}
      </GlassSurface>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={startDeployment}
        branch={selectedBranch}
        changes={previewChanges}
        loading={deploying}
      />

      {/* Preview Changes Modal */}
      <PreviewChangesModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        changes={previewChanges}
        loading={previewLoading}
      />
    </div>
  );
}
