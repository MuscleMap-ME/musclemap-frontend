/**
 * ConflictResolver - UI for resolving sync conflicts
 *
 * Features:
 * - Visual comparison of local vs server data
 * - Multiple resolution strategies (client wins, server wins, merge)
 * - Batch resolution
 * - Conflict history
 */

import React, { useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  GitMerge,
  Check,
  X,
  ChevronDown,
  Clock,
  Cloud,
  Smartphone,
} from 'lucide-react';
import { useConflicts, CONFLICT_RESOLUTION } from '../../store/offlineStore';

/**
 * ConflictCard - Single conflict item display
 */
const ConflictCard = ({ conflict, onResolve }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const handleResolve = (strategy) => {
    setSelectedStrategy(strategy);
    onResolve(conflict.id, strategy);
  };

  return (
    <motion.div
      layout
      className={clsx(
        'glass-card rounded-xl overflow-hidden',
        'border border-amber-500/20'
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {conflict.resourceType || 'Unknown'} Conflict
              </h3>
              <span className="px-1.5 py-0.5 text-xs bg-amber-500/10 text-amber-500 rounded">
                #{conflict.resourceId || conflict.id}
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatDate(conflict.createdAt)}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[var(--border-default)]">
              {/* Data comparison */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Local data */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <Smartphone className="w-4 h-4" />
                    <span>Your Changes</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-default)]">
                    <pre className="text-xs text-[var(--text-primary)] overflow-auto max-h-40 whitespace-pre-wrap">
                      {formatValue(conflict.localData)}
                    </pre>
                  </div>
                </div>

                {/* Server data */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <Cloud className="w-4 h-4" />
                    <span>Server Version</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-default)]">
                    <pre className="text-xs text-[var(--text-primary)] overflow-auto max-h-40 whitespace-pre-wrap">
                      {formatValue(conflict.serverData)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Resolution actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleResolve(CONFLICT_RESOLUTION.CLIENT_WINS)}
                  disabled={selectedStrategy !== null}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                    'bg-[var(--brand-blue-500)]/10 text-[var(--brand-blue-500)]',
                    'hover:bg-[var(--brand-blue-500)]/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <ArrowRight className="w-4 h-4" />
                  Keep My Changes
                </button>

                <button
                  onClick={() => handleResolve(CONFLICT_RESOLUTION.SERVER_WINS)}
                  disabled={selectedStrategy !== null}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                    'bg-emerald-500/10 text-emerald-500',
                    'hover:bg-emerald-500/20 transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Use Server Version
                </button>

                {conflict.localData && conflict.serverData && (
                  <button
                    onClick={() => handleResolve(CONFLICT_RESOLUTION.MERGE)}
                    disabled={selectedStrategy !== null}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                      'bg-purple-500/10 text-purple-500',
                      'hover:bg-purple-500/20 transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <GitMerge className="w-4 h-4" />
                    Merge Both
                  </button>
                )}
              </div>

              {/* Resolution indicator */}
              {selectedStrategy && (
                <div className="mt-4 p-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Resolving with &quot;{selectedStrategy.replace('_', ' ')}&quot;...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * ConflictResolver - Main conflict resolution UI
 */
export const ConflictResolver = ({ className }) => {
  const {
    conflicts,
    count,
    hasConflicts,
    defaultStrategy,
    resolve,
    resolveAll,
    setDefaultStrategy,
    strategies,
  } = useConflicts();

  const [isResolvingAll, setIsResolvingAll] = useState(false);

  const handleResolveAll = async () => {
    setIsResolvingAll(true);
    await resolveAll();
    setIsResolvingAll(false);
  };

  if (!hasConflicts) {
    return null;
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Sync Conflicts
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {count} conflict{count !== 1 ? 's' : ''} need{count === 1 ? 's' : ''} your attention
            </p>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <select
            value={defaultStrategy}
            onChange={(e) => setDefaultStrategy(e.target.value)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm',
              'bg-[var(--glass-white-5)] border border-[var(--border-default)]',
              'text-[var(--text-primary)]'
            )}
          >
            <option value={strategies.SERVER_WINS}>Server Wins</option>
            <option value={strategies.CLIENT_WINS}>Client Wins</option>
            <option value={strategies.MERGE}>Merge</option>
          </select>

          <button
            onClick={handleResolveAll}
            disabled={isResolvingAll}
            className={clsx(
              'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium',
              'bg-[var(--brand-blue-500)] text-white',
              'hover:bg-[var(--brand-blue-600)] transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isResolvingAll ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Check className="w-4 h-4" />
                </motion.div>
                Resolving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Resolve All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conflict list */}
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            onResolve={resolve}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * ConflictBanner - Minimal conflict notification
 */
export const ConflictBanner = ({ className, onViewAll }) => {
  const { count, hasConflicts, resolveAll } = useConflicts();

  if (!hasConflicts) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-amber-500/10 border border-amber-500/20',
        className
      )}
    >
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">
          {count} sync conflict{count !== 1 ? 's' : ''} to resolve
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
          >
            View All
          </button>
        )}
        <button
          onClick={resolveAll}
          className={clsx(
            'px-3 py-1 rounded text-sm font-medium',
            'bg-amber-500 text-white',
            'hover:bg-amber-600 transition-colors'
          )}
        >
          Resolve All
        </button>
      </div>
    </motion.div>
  );
};

/**
 * ConflictModal - Modal for conflict resolution
 */
export const ConflictModal = ({ isOpen, onClose }) => {
  const { hasConflicts } = useConflicts();

  if (!isOpen || !hasConflicts) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={clsx(
            'w-full max-w-2xl max-h-[80vh] overflow-y-auto',
            'glass-card rounded-2xl p-6'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Resolve Conflicts
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--glass-white-10)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>
          <ConflictResolver />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConflictResolver;
