/**
 * OfflineIndicator - Visual indicator for online/offline status
 *
 * Features:
 * - Real-time status updates
 * - Animated transitions
 * - Compact and expanded variants
 * - Optional toast on status change
 */

import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { useOnlineStatus, useSyncStatus } from '../../store/offlineStore';
import { useToast } from '../../store';

/**
 * OfflineIndicator - Shows current online/offline status
 */
export const OfflineIndicator = ({
  variant = 'compact', // 'compact' | 'badge' | 'banner' | 'dot'
  showSyncStatus = true,
  showToastOnChange = false,
  className,
}) => {
  const { isOnline, isOffline, offlineSince } = useOnlineStatus();
  const { pendingCount, isSyncing } = useSyncStatus();
  const { toast } = useToast();
  const prevOnlineRef = useRef(isOnline);

  // Show toast on status change
  useEffect(() => {
    if (showToastOnChange && prevOnlineRef.current !== isOnline) {
      if (isOnline) {
        toast({
          title: 'Back Online',
          description: pendingCount > 0
            ? `Syncing ${pendingCount} pending changes...`
            : 'Connection restored',
          variant: 'success',
        });
      } else {
        toast({
          title: 'You\'re Offline',
          description: 'Changes will be saved locally and synced when back online',
          variant: 'warning',
        });
      }
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, showToastOnChange, toast, pendingCount]);

  // Format offline duration
  const formatDuration = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Dot variant - minimal indicator
  if (variant === 'dot') {
    return (
      <div className={clsx('relative', className)}>
        <motion.div
          className={clsx(
            'w-2 h-2 rounded-full',
            isOnline ? 'bg-emerald-500' : 'bg-amber-500'
          )}
          animate={{
            scale: isSyncing ? [1, 1.2, 1] : 1,
          }}
          transition={{
            repeat: isSyncing ? Infinity : 0,
            duration: 1,
          }}
        />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 text-[8px] font-bold flex items-center justify-center bg-amber-500 text-white rounded-full">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </div>
    );
  }

  // Compact variant - icon with status
  if (variant === 'compact') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={isOnline ? 'online' : 'offline'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            isOnline
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-amber-500/10 text-amber-500',
            className
          )}
        >
          {isOnline ? (
            <>
              {isSyncing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Cloud className="w-3.5 h-3.5" />
                </motion.div>
              ) : (
                <Wifi className="w-3.5 h-3.5" />
              )}
              <span>{isSyncing ? 'Syncing...' : 'Online'}</span>
              {showSyncStatus && pendingCount > 0 && !isSyncing && (
                <span className="text-amber-500">({pendingCount})</span>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
              {showSyncStatus && pendingCount > 0 && (
                <span className="opacity-70">({pendingCount} pending)</span>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Badge variant - more detailed
  if (variant === 'badge') {
    return (
      <motion.div
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border',
          isOnline
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
          className
        )}
      >
        <div className="relative">
          {isOnline ? (
            isSyncing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              >
                <Cloud className="w-4 h-4" />
              </motion.div>
            ) : (
              <Wifi className="w-4 h-4" />
            )
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
          {/* Status dot */}
          <motion.div
            className={clsx(
              'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-900',
              isOnline ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {isOnline
              ? isSyncing
                ? 'Syncing...'
                : 'Connected'
              : 'Offline Mode'}
          </span>
          {showSyncStatus && (
            <span className="text-xs opacity-70">
              {isOnline
                ? pendingCount > 0
                  ? `${pendingCount} changes to sync`
                  : 'All changes saved'
                : offlineSince
                  ? `Since ${formatDuration(offlineSince)}`
                  : 'Working offline'}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  // Banner variant - full width notification
  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={clsx(
              'w-full bg-amber-500/10 border-b border-amber-500/20',
              className
            )}
          >
            <div className="container mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">
                  You&apos;re offline
                </span>
                {pendingCount > 0 && (
                  <span className="text-xs opacity-70">
                    ({pendingCount} changes pending)
                  </span>
                )}
              </div>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                Changes saved locally
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return null;
};

/**
 * OfflineBanner - Persistent banner for offline status
 * Use at the top of the app for visibility
 */
export const OfflineBanner = ({ className }) => {
  return <OfflineIndicator variant="banner" className={className} />;
};

/**
 * OfflineDot - Minimal dot indicator
 * Use in navigation or header
 */
export const OfflineDot = ({ className }) => {
  return <OfflineIndicator variant="dot" className={className} />;
};

export default OfflineIndicator;
