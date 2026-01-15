/**
 * SyncStatus - Display sync status and pending operations
 *
 * Features:
 * - Pending operation count with breakdown
 * - Sync progress indicator
 * - Manual sync trigger
 * - Error state display
 * - Last sync timestamp
 */

import React from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Cloud,
  CloudOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Dumbbell,
  BarChart2,
} from 'lucide-react';
import {
  useSyncStatus,
  usePendingOperations,
  useOnlineStatus,
  SYNC_STATUS,
} from '../../store/offlineStore';
import { GlassProgressBar } from '../glass/GlassProgress';

/**
 * SyncStatusBadge - Compact sync status indicator
 */
export const SyncStatusBadge = ({ className }) => {
  const { status, pendingCount, isSyncing } = useSyncStatus();
  const { isOnline } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'bg-amber-500/10 text-amber-500',
          className
        )}
      >
        <CloudOff className="w-3.5 h-3.5" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-white px-1.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'bg-[var(--brand-blue-500)]/10 text-[var(--brand-blue-500)]',
          className
        )}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.div>
        <span>Syncing...</span>
      </div>
    );
  }

  if (status === SYNC_STATUS.ERROR) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'bg-red-500/10 text-red-500',
          className
        )}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Sync Error</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'bg-amber-500/10 text-amber-500',
          className
        )}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>{pendingCount} pending</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        'bg-emerald-500/10 text-emerald-500',
        className
      )}
    >
      <CheckCircle className="w-3.5 h-3.5" />
      <span>Synced</span>
    </div>
  );
};

/**
 * SyncStatusCard - Detailed sync status with breakdown
 */
export const SyncStatusCard = ({ className, collapsible = true }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { isOnline } = useOnlineStatus();
  const {
    status,
    progress,
    lastSuccess,
    error,
    pendingCount,
    failedCount,
    isSyncing,
    triggerSync,
    clearError,
  } = useSyncStatus();
  const { workouts, sets, other, details } = usePendingOperations();

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const statusConfig = {
    [SYNC_STATUS.IDLE]: {
      icon: Cloud,
      color: 'text-[var(--text-secondary)]',
      bg: 'bg-[var(--glass-white-5)]',
      label: 'Ready',
    },
    [SYNC_STATUS.SYNCING]: {
      icon: RefreshCw,
      color: 'text-[var(--brand-blue-500)]',
      bg: 'bg-[var(--brand-blue-500)]/10',
      label: 'Syncing...',
      animate: true,
    },
    [SYNC_STATUS.SUCCESS]: {
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      label: 'Synced',
    },
    [SYNC_STATUS.ERROR]: {
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'Error',
    },
    [SYNC_STATUS.CONFLICT]: {
      icon: AlertCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      label: 'Conflicts',
    },
  };

  const currentStatus = !isOnline
    ? { icon: CloudOff, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Offline' }
    : statusConfig[status];

  const StatusIcon = currentStatus.icon;

  return (
    <div
      className={clsx(
        'glass-card p-4 rounded-xl',
        className
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center justify-between',
          collapsible && 'cursor-pointer'
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'p-2 rounded-lg',
              currentStatus.bg
            )}
          >
            <motion.div
              animate={currentStatus.animate ? { rotate: 360 } : {}}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <StatusIcon className={clsx('w-5 h-5', currentStatus.color)} />
            </motion.div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Sync Status
            </h3>
            <p className={clsx('text-xs', currentStatus.color)}>
              {currentStatus.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full">
              {pendingCount} pending
            </span>
          )}
          {collapsible && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress bar during sync */}
      {isSyncing && (
        <div className="mt-3">
          <GlassProgressBar
            value={progress}
            max={100}
            variant="brand"
            size="sm"
            animated
          />
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {(isExpanded || !collapsible) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              {/* Pending breakdown */}
              {pendingCount > 0 && (
                <div className="mb-4 space-y-2">
                  <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Pending Operations
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-white-5)]">
                      <Dumbbell className="w-4 h-4 text-[var(--brand-blue-500)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {workouts}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">Workouts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-white-5)]">
                      <BarChart2 className="w-4 h-4 text-[var(--brand-pulse-500)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {sets}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">Sets</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-white-5)]">
                      <Cloud className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {other}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">Other</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-500">Sync Failed</p>
                      <p className="text-xs text-red-400 mt-0.5">{error}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearError();
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <div>
                  <span>Last synced: </span>
                  <span className="text-[var(--text-secondary)]">
                    {formatTime(lastSuccess)}
                  </span>
                </div>
                {failedCount > 0 && (
                  <span className="text-red-400">
                    {failedCount} failed
                  </span>
                )}
              </div>

              {/* Sync button */}
              {isOnline && pendingCount > 0 && !isSyncing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerSync();
                  }}
                  className={clsx(
                    'mt-4 w-full flex items-center justify-center gap-2',
                    'px-4 py-2 rounded-lg',
                    'bg-[var(--brand-blue-500)] text-white',
                    'hover:bg-[var(--brand-blue-600)] transition-colors',
                    'text-sm font-medium'
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </button>
              )}

              {/* Queue details */}
              {details.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Queue Details
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {details.slice(0, 5).map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between text-xs p-2 rounded bg-[var(--glass-white-5)]"
                      >
                        <span className="text-[var(--text-secondary)]">
                          {item.operation || 'Unknown'}
                        </span>
                        <span
                          className={clsx(
                            'px-1.5 py-0.5 rounded',
                            item.status === 'pending' && 'bg-amber-500/10 text-amber-500',
                            item.status === 'failed' && 'bg-red-500/10 text-red-500',
                            item.priority === 'high' && 'border border-current'
                          )}
                        >
                          {item.status}
                          {item.retryCount > 0 && ` (${item.retryCount})`}
                        </span>
                      </div>
                    ))}
                    {details.length > 5 && (
                      <p className="text-xs text-[var(--text-tertiary)] text-center py-1">
                        +{details.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * SyncProgressIndicator - Minimal progress indicator for syncing
 */
export const SyncProgressIndicator = ({ className }) => {
  const { isSyncing, progress, pendingCount } = useSyncStatus();

  if (!isSyncing && pendingCount === 0) return null;

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {isSyncing ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4 text-[var(--brand-blue-500)]" />
          </motion.div>
          <div className="flex-1 max-w-24">
            <GlassProgressBar value={progress} max={100} size="sm" variant="brand" />
          </div>
        </>
      ) : (
        <span className="text-xs text-amber-500 font-medium">
          {pendingCount} pending
        </span>
      )}
    </div>
  );
};

export default SyncStatusCard;
