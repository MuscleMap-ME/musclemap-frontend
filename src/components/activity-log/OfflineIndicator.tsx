/**
 * OfflineIndicator Component
 *
 * Shows offline status and queued actions indicator.
 * Provides visual feedback when the user is offline
 * and has pending workout logs to sync.
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setPendingCount(0);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for pending items in localStorage (offline queue)
  useEffect(() => {
    const checkPendingItems = () => {
      try {
        const offlineQueue = localStorage.getItem('musclemap_offline_queue');
        if (offlineQueue) {
          const queue = JSON.parse(offlineQueue);
          setPendingCount(Array.isArray(queue) ? queue.length : 0);
        }
      } catch {
        setPendingCount(0);
      }
    };

    checkPendingItems();
    const interval = setInterval(checkPendingItems, 5000);

    return () => clearInterval(interval);
  }, []);

  // Don't render if online and no pending items
  if (isOnline && pendingCount === 0 && !showSyncStatus) {
    return null;
  }

  return (
    <SafeAnimatePresence>
      <SafeMotion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${className}`}
        role="status"
        aria-live="polite"
      >
        {!isOnline ? (
          // Offline indicator
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-lg text-sm">
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span>
              Offline mode
              {pendingCount > 0 && (
                <span className="ml-1 text-amber-200">
                  • {pendingCount} pending
                </span>
              )}
            </span>
          </div>
        ) : isSyncing ? (
          // Syncing indicator
          <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-sm">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Syncing...</span>
          </div>
        ) : pendingCount > 0 ? (
          // Pending items indicator
          <button
            onClick={() => setShowSyncStatus(!showSyncStatus)}
            className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-2 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors"
            aria-expanded={showSyncStatus}
          >
            <CloudOff className="w-4 h-4" aria-hidden="true" />
            <span>{pendingCount} pending sync</span>
          </button>
        ) : (
          // All synced indicator (shows briefly)
          <SafeMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => {
              setTimeout(() => setShowSyncStatus(false), 2000);
            }}
            className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-300 px-3 py-2 rounded-lg text-sm"
          >
            <Cloud className="w-4 h-4" aria-hidden="true" />
            <span>All synced</span>
          </SafeMotion.div>
        )}
      </SafeMotion.div>
    </SafeAnimatePresence>
  );
}

export default OfflineIndicator;
