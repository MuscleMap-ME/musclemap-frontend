/**
 * Scheduler Panel Component
 *
 * Provides a web interface for scheduled task management:
 * - Jobs list with name, cron expression, next run time, status
 * - Add/Edit job modal with cron expression builder
 * - Job execution history table
 * - Enable/disable toggle for each job
 * - "Run Now" button for manual execution
 * - Visual cron expression helper (shows human-readable schedule)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  History,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Timer,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/scheduler';

// Common cron presets for quick selection
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' },
  { label: 'Monthly on 1st', value: '0 0 1 * *' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse a cron expression into human-readable format
 */
function parseCronExpression(cron) {
  if (!cron) return 'Invalid cron expression';

  const parts = cron.split(' ');
  if (parts.length !== 5) return 'Invalid cron expression';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Check for common patterns
  if (cron === '* * * * *') return 'Every minute';
  if (cron.startsWith('*/') && parts.slice(1).every((p) => p === '*')) {
    const interval = minute.replace('*/', '');
    return `Every ${interval} minute${interval !== '1' ? 's' : ''}`;
  }
  if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const interval = hour.replace('*/', '');
    return `Every ${interval} hour${interval !== '1' ? 's' : ''}`;
  }
  if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour.padStart(2, '0')}:00`;
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Weekly on ${days[parseInt(dayOfWeek)] || dayOfWeek}`;
  }
  if (minute === '0' && hour === '0' && dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    return `Monthly on day ${dayOfMonth}`;
  }

  // Generic description
  let description = '';
  if (minute !== '*') description += `At minute ${minute}`;
  if (hour !== '*') description += description ? `, hour ${hour}` : `At hour ${hour}`;
  if (dayOfMonth !== '*') description += `, on day ${dayOfMonth}`;
  if (month !== '*') description += `, in month ${month}`;
  if (dayOfWeek !== '*') description += `, on weekday ${dayOfWeek}`;

  return description || 'Custom schedule';
}

/**
 * Format a date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  const now = new Date();
  const diffMs = date - now;
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins > 0 && diffMins < 60) {
    return `in ${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  }
  if (diffMins >= 60 && diffMins < 1440) {
    const hours = Math.round(diffMins / 60);
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms) {
  if (!ms && ms !== 0) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function StatusBadge({ status }) {
  const statusConfig = {
    active: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, label: 'Active' },
    paused: { color: 'bg-yellow-500/20 text-yellow-400', icon: Pause, label: 'Paused' },
    running: { color: 'bg-blue-500/20 text-blue-400', icon: Loader2, label: 'Running', animate: true },
    error: { color: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Error' },
    disabled: { color: 'bg-gray-500/20 text-gray-400', icon: Pause, label: 'Disabled' },
  };

  const config = statusConfig[status] || statusConfig.disabled;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

function JobCard({ job, onToggle, onRunNow, onEdit, onDelete, loading }) {
  const [showHistory, setShowHistory] = useState(false);
  const isRunning = job.status === 'running';

  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{job.name}</h4>
            <StatusBadge status={job.status} />
          </div>
          {job.description && (
            <p className="text-xs text-gray-400 mt-1 truncate">{job.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => onRunNow(job.id)}
            disabled={loading || isRunning}
            className="p-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50"
            title="Run Now"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onToggle(job.id, job.status !== 'active')}
            disabled={loading || isRunning}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
              job.status === 'active'
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
            }`}
            title={job.status === 'active' ? 'Pause' : 'Enable'}
          >
            {job.status === 'active' ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onEdit(job)}
            disabled={loading || isRunning}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 transition-colors disabled:opacity-50"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(job.id)}
            disabled={loading || isRunning}
            className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400 flex items-center gap-1">
            <Timer className="w-3 h-3" />
            Cron
          </div>
          <div className="text-white font-mono mt-0.5">{job.cron}</div>
          <div className="text-gray-500 mt-0.5">{parseCronExpression(job.cron)}</div>
        </div>
        <div className="bg-white/5 rounded p-2">
          <div className="text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Next Run
          </div>
          <div className="text-white mt-0.5">{formatDate(job.nextRun)}</div>
        </div>
      </div>

      {job.lastRun && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-300"
          >
            <span className="flex items-center gap-1">
              <History className="w-3 h-3" />
              Last run: {formatDate(job.lastRun)}
              {job.lastDuration && (
                <span className="text-gray-500">({formatDuration(job.lastDuration)})</span>
              )}
            </span>
            {showHistory ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
          {showHistory && job.history?.length > 0 && (
            <div className="mt-2 space-y-1">
              {job.history.slice(0, 5).map((run, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                    run.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <span className={run.success ? 'text-green-400' : 'text-red-400'}>
                    {run.success ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                    {formatDate(run.timestamp)}
                  </span>
                  <span className="text-gray-400">{formatDuration(run.duration)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JobModal({ job, onSave, onClose, loading }) {
  const [formData, setFormData] = useState({
    name: job?.name || '',
    description: job?.description || '',
    cron: job?.cron || '0 * * * *',
    handler: job?.handler || '',
    enabled: job?.status === 'active' || !job,
  });
  const [cronMode, setCronMode] = useState('preset');
  const [errors, setErrors] = useState({});
  const [availableCommands, setAvailableCommands] = useState([]);
  const [commandsLoading, setCommandsLoading] = useState(true);

  // Fetch available commands on mount
  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const authData = localStorage.getItem('musclemap-auth');
        let headers = {};
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed?.state?.token) {
            headers = { Authorization: `Bearer ${parsed.state.token}` };
          }
        }
        const res = await fetch(`${API_BASE}/commands`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAvailableCommands(data.commands || []);
        }
      } catch (err) {
        console.error('Failed to fetch commands:', err);
      } finally {
        setCommandsLoading(false);
      }
    };
    fetchCommands();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handlePresetSelect = (preset) => {
    setFormData((prev) => ({ ...prev, cron: preset.value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.cron.trim()) newErrors.cron = 'Cron expression is required';
    if (!formData.handler.trim()) newErrors.handler = 'Handler is required';

    // Basic cron validation
    const cronParts = formData.cron.split(' ');
    if (cronParts.length !== 5) newErrors.cron = 'Invalid cron expression (must have 5 parts)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        id: job?.id,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            {job ? 'Edit Job' : 'Add New Job'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Job Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Daily Cleanup"
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                errors.name ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="What does this job do?"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Handler */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Handler *
            </label>
            {commandsLoading ? (
              <div className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading available handlers...
              </div>
            ) : (
              <select
                value={formData.handler}
                onChange={(e) => handleChange('handler', e.target.value)}
                className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                  errors.handler ? 'border-red-500' : 'border-white/10'
                }`}
              >
                <option value="" className="bg-gray-900 text-gray-400">Select a handler...</option>
                {availableCommands.map((cmd) => (
                  <option key={cmd.name} value={cmd.name} className="bg-gray-900 text-white">
                    {cmd.name}
                  </option>
                ))}
              </select>
            )}
            {errors.handler && <p className="text-xs text-red-400 mt-1">{errors.handler}</p>}
            {formData.handler && availableCommands.find((c) => c.name === formData.handler) && (
              <p className="text-xs text-cyan-400 mt-1">
                {availableCommands.find((c) => c.name === formData.handler)?.description}
              </p>
            )}
          </div>

          {/* Cron Expression */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Schedule *
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setCronMode('preset')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  cronMode === 'preset'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setCronMode('custom')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  cronMode === 'custom'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                Custom
              </button>
            </div>

            {cronMode === 'preset' ? (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-2 text-left rounded border transition-colors ${
                      formData.cron === preset.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm">{preset.label}</div>
                    <div className="text-xs font-mono text-gray-500">{preset.value}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={formData.cron}
                  onChange={(e) => handleChange('cron', e.target.value)}
                  placeholder="* * * * *"
                  className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                    errors.cron ? 'border-red-500' : 'border-white/10'
                  }`}
                />
                <div className="mt-2 p-2 bg-white/5 rounded text-xs">
                  <div className="text-gray-400 mb-1">Format: minute hour day-of-month month day-of-week</div>
                  <div className="flex gap-2 text-gray-500 font-mono">
                    <span>0-59</span>
                    <span>0-23</span>
                    <span>1-31</span>
                    <span>1-12</span>
                    <span>0-6</span>
                  </div>
                </div>
              </div>
            )}
            {errors.cron && <p className="text-xs text-red-400 mt-1">{errors.cron}</p>}

            {/* Human-readable preview */}
            <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded">
              <div className="text-xs text-cyan-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {parseCronExpression(formData.cron)}
              </div>
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Enable Job</div>
              <div className="text-xs text-gray-400">Job will run according to schedule</div>
            </div>
            <button
              type="button"
              onClick={() => handleChange('enabled', !formData.enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                formData.enabled ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  formData.enabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {job ? 'Update Job' : 'Create Job'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryTable({ history, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No execution history yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-white/10">
            <th className="pb-2 pr-4">Job</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Started</th>
            <th className="pb-2 pr-4">Duration</th>
            <th className="pb-2">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {history.map((run, i) => (
            <tr key={i} className="hover:bg-white/5">
              <td className="py-2 pr-4">
                <span className="font-medium text-white">{run.jobName}</span>
              </td>
              <td className="py-2 pr-4">
                {run.success ? (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <XCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-gray-300">{formatDate(run.timestamp)}</td>
              <td className="py-2 pr-4 text-gray-300 font-mono">{formatDuration(run.duration)}</td>
              <td className="py-2 text-gray-400 truncate max-w-xs" title={run.result || run.error}>
                {run.error ? (
                  <span className="text-red-400">{run.error}</span>
                ) : (
                  run.result || '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchedulerPanel() {
  const [jobs, setJobs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalJob, setModalJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState('jobs');

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

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setError('Failed to connect to scheduler API');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Fetch execution history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [getAuthHeader]);

  // Toggle job enabled/disabled
  const toggleJob = useCallback(async (jobId, enable) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/${enable ? 'enable' : 'disable'}`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to toggle job:', err);
    } finally {
      setActionLoading(false);
    }
  }, [getAuthHeader, fetchJobs]);

  // Run job immediately
  const runJobNow = useCallback(async (jobId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/run`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        // Refresh both jobs and history
        fetchJobs();
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to run job:', err);
    } finally {
      setActionLoading(false);
    }
  }, [getAuthHeader, fetchJobs, fetchHistory]);

  // Delete job
  const deleteJob = useCallback(async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to delete job:', err);
    } finally {
      setActionLoading(false);
    }
  }, [getAuthHeader, fetchJobs]);

  // Save job (create or update)
  const saveJob = useCallback(async (jobData) => {
    setActionLoading(true);
    try {
      const isUpdate = !!jobData.id;
      const res = await fetch(
        isUpdate ? `${API_BASE}/jobs/${jobData.id}` : `${API_BASE}/jobs`,
        {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            name: jobData.name,
            description: jobData.description,
            cron: jobData.cron,
            handler: jobData.handler,
            enabled: jobData.enabled,
          }),
        }
      );
      if (res.ok) {
        setShowModal(false);
        setModalJob(null);
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to save job:', err);
    } finally {
      setActionLoading(false);
    }
  }, [getAuthHeader, fetchJobs]);

  // Open modal for editing
  const openEditModal = useCallback((job) => {
    setModalJob(job);
    setShowModal(true);
  }, []);

  // Open modal for creating
  const openCreateModal = useCallback(() => {
    setModalJob(null);
    setShowModal(true);
  }, []);

  // Initial load
  useEffect(() => {
    fetchJobs();
    fetchHistory();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchJobs();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchJobs, fetchHistory]);

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
            <Calendar className="w-6 h-6 text-cyan-400" />
            Scheduled Tasks
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage automated jobs and cron schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="text-sm text-white font-medium">Add Job</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">Total Jobs</span>
          </div>
          <div className="text-2xl font-bold text-white">{jobs.length}</div>
        </GlassSurface>
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Play className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {jobs.filter((j) => j.status === 'active').length}
          </div>
        </GlassSurface>
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Pause className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-400">Paused</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {jobs.filter((j) => j.status === 'paused' || j.status === 'disabled').length}
          </div>
        </GlassSurface>
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Errors</span>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {jobs.filter((j) => j.status === 'error').length}
          </div>
        </GlassSurface>
      </div>

      {/* Jobs List */}
      <GlassSurface className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'jobs' ? '' : 'jobs')}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Timer className="w-4 h-4 text-cyan-400" />
            Scheduled Jobs ({jobs.length})
          </h3>
          {expandedSection === 'jobs' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'jobs' && (
          jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No scheduled jobs yet</p>
              <button
                onClick={openCreateModal}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create your first job
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onToggle={toggleJob}
                  onRunNow={runJobNow}
                  onEdit={openEditModal}
                  onDelete={deleteJob}
                  loading={actionLoading}
                />
              ))}
            </div>
          )
        )}
      </GlassSurface>

      {/* Execution History */}
      <GlassSurface className="p-4">
        <button
          onClick={() => {
            setExpandedSection(expandedSection === 'history' ? '' : 'history');
            if (expandedSection !== 'history') fetchHistory();
          }}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Execution History
          </h3>
          {expandedSection === 'history' ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSection === 'history' && (
          <HistoryTable history={history} loading={historyLoading} />
        )}
      </GlassSurface>

      {/* Job Modal */}
      {showModal && (
        <JobModal
          job={modalJob}
          onSave={saveJob}
          onClose={() => {
            setShowModal(false);
            setModalJob(null);
          }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
