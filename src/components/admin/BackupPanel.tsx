/**
 * Backup Panel Component
 *
 * Provides backup and recovery management:
 * - Backup list with filename, size, date, status
 * - Create backup with progress indicator
 * - Restore from backup with confirmation modal
 * - Delete backup functionality
 * - Backup schedule configuration
 * - Current backup job status
 * - Test restore to verify integrity
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileArchive,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import GlassSurface from '../glass/GlassSurface';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/admin/backup';

const SCHEDULE_OPTIONS = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily (2 AM)' },
  { value: 'weekly', label: 'Weekly (Sunday 2 AM)' },
  { value: 'monthly', label: 'Monthly (1st, 2 AM)' },
];

const STATUS_COLORS = {
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
  in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Loader2 },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
  verified: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Shield },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (typeof bytes === 'string') return bytes;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, isDangerous }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${isDangerous ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
            <AlertTriangle className={`w-6 h-6 ${isDangerous ? 'text-red-400' : 'text-yellow-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-2">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
              isDangerous
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupStatus({ status }) {
  const config = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const Icon = config.icon;
  const isLoading = status === 'in_progress';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

function BackupListItem({ backup, onRestore, onDelete, onTest, isRestoring, isDeleting, isTesting }) {
  const isLoading = isRestoring || isDeleting || isTesting;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <FileArchive className="w-6 h-6 text-blue-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{backup.filename}</span>
          <BackupStatus status={backup.status} />
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatBytes(backup.size)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(backup.createdAt)}
          </span>
          {backup.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(backup.duration)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onTest(backup.id)}
          disabled={isLoading || backup.status !== 'completed'}
          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Test Restore"
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onRestore(backup)}
          disabled={isLoading || backup.status !== 'completed'}
          className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Restore Backup"
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onDelete(backup)}
          disabled={isLoading}
          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete Backup"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function JobStatus({ job }) {
  if (!job) return null;

  const progress = job.progress || 0;
  const config = STATUS_COLORS[job.status] || STATUS_COLORS.pending;
  const Icon = config.icon;
  const isRunning = job.status === 'in_progress';

  return (
    <GlassSurface className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Archive className="w-4 h-4 text-cyan-400" />
          Current Job
        </h3>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
          <Icon className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
          {job.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{job.type === 'backup' ? 'Creating backup' : 'Restoring backup'}</span>
          <span className="text-white font-medium">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              job.status === 'failed' ? 'bg-red-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {job.message && (
          <div className="text-xs text-gray-400">{job.message}</div>
        )}

        {job.startedAt && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Started: {formatDate(job.startedAt)}</span>
            {job.estimatedCompletion && (
              <span>ETA: {formatDate(job.estimatedCompletion)}</span>
            )}
          </div>
        )}
      </div>
    </GlassSurface>
  );
}

function ScheduleConfig({ schedule, onUpdate, isLoading }) {
  const [selectedSchedule, setSelectedSchedule] = useState(schedule?.frequency || 'disabled');
  const [retention, setRetention] = useState(schedule?.retention || 7);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSelectedSchedule(schedule?.frequency || 'disabled');
    setRetention(schedule?.retention || 7);
    setHasChanges(false);
  }, [schedule]);

  const handleScheduleChange = (value) => {
    setSelectedSchedule(value);
    setHasChanges(true);
  };

  const handleRetentionChange = (value) => {
    setRetention(parseInt(value, 10) || 7);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate({ frequency: selectedSchedule, retention });
    setHasChanges(false);
  };

  return (
    <GlassSurface className="p-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4 text-purple-400" />
        Backup Schedule
      </h3>

      <div className="space-y-4">
        {/* Schedule frequency */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Frequency</label>
          <select
            value={selectedSchedule}
            onChange={(e) => handleScheduleChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            {SCHEDULE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Retention period */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Retention (days)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={retention}
            onChange={(e) => handleRetentionChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Backups older than {retention} days will be automatically deleted
          </p>
        </div>

        {/* Next scheduled backup */}
        {schedule?.nextRun && selectedSchedule !== 'disabled' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg p-3">
            <Clock className="w-4 h-4" />
            <span>Next backup: {formatDate(schedule.nextRun)}</span>
          </div>
        )}

        {/* Save button */}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              'Save Schedule'
            )}
          </button>
        )}
      </div>
    </GlassSurface>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BackupPanel() {
  // State
  const [backups, setBackups] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [testingId, setTestingId] = useState(null);

  // Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDangerous: false,
    onConfirm: () => {},
  });

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

  // Fetch backups list
  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/list`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    }
  }, [getAuthHeader]);

  // Fetch schedule config
  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/schedule`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setSchedule(data.schedule || null);
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    }
  }, [getAuthHeader]);

  // Fetch current job status
  const fetchJobStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentJob(data.job || null);
      }
    } catch (err) {
      console.error('Failed to fetch job status:', err);
    }
  }, [getAuthHeader]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBackups(), fetchSchedule(), fetchJobStatus()]);
    setLoading(false);
  }, [fetchBackups, fetchSchedule, fetchJobStatus]);

  // Create backup
  const createBackup = useCallback(async () => {
    setCreateLoading(true);
    try {
      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (res.ok) {
        // Refresh job status and backups list
        fetchJobStatus();
        setTimeout(fetchBackups, 2000);
      }
    } catch (err) {
      console.error('Failed to create backup:', err);
    } finally {
      setCreateLoading(false);
    }
  }, [getAuthHeader, fetchBackups, fetchJobStatus]);

  // Restore backup
  const restoreBackup = useCallback(async (backup) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Backup',
      message: `This will restore the database from "${backup.filename}". This action will overwrite ALL current data and cannot be undone. Are you absolutely sure?`,
      confirmText: 'Yes, Restore Backup',
      isDangerous: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setRestoringId(backup.id);

        try {
          const res = await fetch(`${API_BASE}/restore`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader(),
            },
            body: JSON.stringify({ backupId: backup.id }),
          });

          if (res.ok) {
            fetchJobStatus();
            setTimeout(fetchBackups, 2000);
          }
        } catch (err) {
          console.error('Failed to restore backup:', err);
        } finally {
          setRestoringId(null);
        }
      },
    });
  }, [getAuthHeader, fetchBackups, fetchJobStatus]);

  // Delete backup
  const deleteBackup = useCallback(async (backup) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Backup',
      message: `Are you sure you want to permanently delete "${backup.filename}"? This action cannot be undone.`,
      confirmText: 'Delete Backup',
      isDangerous: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setDeletingId(backup.id);

        try {
          const res = await fetch(`${API_BASE}/delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeader(),
            },
            body: JSON.stringify({ backupId: backup.id }),
          });

          if (res.ok) {
            fetchBackups();
          }
        } catch (err) {
          console.error('Failed to delete backup:', err);
        } finally {
          setDeletingId(null);
        }
      },
    });
  }, [getAuthHeader, fetchBackups]);

  // Test restore (verify integrity)
  const testRestore = useCallback(async (backupId) => {
    setTestingId(backupId);
    try {
      const res = await fetch(`${API_BASE}/test-restore/${backupId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (res.ok) {
        // Refresh backups to show verified status
        fetchBackups();
      }
    } catch (err) {
      console.error('Failed to test restore:', err);
    } finally {
      setTestingId(null);
    }
  }, [getAuthHeader, fetchBackups]);

  // Update schedule
  const updateSchedule = useCallback(async (newSchedule) => {
    setScheduleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(newSchedule),
      });

      if (res.ok) {
        fetchSchedule();
      }
    } catch (err) {
      console.error('Failed to update schedule:', err);
    } finally {
      setScheduleLoading(false);
    }
  }, [getAuthHeader, fetchSchedule]);

  // Close modal
  const closeModal = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll();

    // Poll for job status updates every 5 seconds if there's an active job
    const interval = setInterval(() => {
      if (currentJob?.status === 'in_progress') {
        fetchJobStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAll, fetchJobStatus, currentJob?.status]);

  // Calculate storage stats
  const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
  const completedCount = backups.filter((b) => b.status === 'completed').length;

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
            <Archive className="w-6 h-6 text-cyan-400" />
            Backup & Recovery
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage database backups and restore points
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Refresh</span>
          </button>
          <button
            onClick={createBackup}
            disabled={createLoading || currentJob?.status === 'in_progress'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Create Backup</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileArchive className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Total Backups</span>
          </div>
          <div className="text-2xl font-bold text-white">{backups.length}</div>
          <div className="text-xs text-gray-400 mt-1">
            {completedCount} completed, {backups.length - completedCount} other
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Storage Used</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatBytes(totalSize)}</div>
          <div className="text-xs text-gray-400 mt-1">
            Across all backups
          </div>
        </GlassSurface>

        <GlassSurface className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">Last Backup</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {backups[0] ? formatDate(backups[0].createdAt).split(',')[0] : 'Never'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {backups[0] ? formatDate(backups[0].createdAt).split(',')[1] : 'No backups yet'}
          </div>
        </GlassSurface>
      </div>

      {/* Current Job Status */}
      {currentJob && <JobStatus job={currentJob} />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup List */}
        <div className="lg:col-span-2">
          <GlassSurface className="p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              Backup History
            </h3>

            {backups.length === 0 ? (
              <div className="text-center py-12">
                <FileArchive className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No backups yet</p>
                <p className="text-xs text-gray-500">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {backups.map((backup) => (
                  <BackupListItem
                    key={backup.id}
                    backup={backup}
                    onRestore={restoreBackup}
                    onDelete={deleteBackup}
                    onTest={testRestore}
                    isRestoring={restoringId === backup.id}
                    isDeleting={deletingId === backup.id}
                    isTesting={testingId === backup.id}
                  />
                ))}
              </div>
            )}
          </GlassSurface>
        </div>

        {/* Schedule Config */}
        <div>
          <ScheduleConfig
            schedule={schedule}
            onUpdate={updateSchedule}
            isLoading={scheduleLoading}
          />

          {/* Quick Tips */}
          <GlassSurface className="p-4 mt-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Best Practices
            </h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Enable automatic backups on at least a daily schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Test restore periodically to verify backup integrity</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Create a manual backup before major updates</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Keep at least 7 days of backup retention</span>
              </li>
            </ul>
          </GlassSurface>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDangerous={confirmModal.isDangerous}
      />
    </div>
  );
}
