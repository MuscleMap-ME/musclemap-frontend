/**
 * OfflineIndicator Component
 *
 * Shows a banner when the user loses network connectivity.
 * Automatically hides when connection is restored.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useMotion } from '../../contexts/MotionContext';
import { haptic } from '../../utils/haptics';

interface OfflineIndicatorProps {
  /** Position of the indicator (default: 'top') */
  position?: 'top' | 'bottom';
  /** Whether to show connection quality info (default: false) */
  showQuality?: boolean;
  /** Custom class for styling */
  className?: string;
  /** Whether the indicator can be dismissed (default: false when offline) */
  dismissible?: boolean;
}

export function OfflineIndicator({
  position = 'top',
  showQuality = false,
  className = '',
  dismissible = false,
}: OfflineIndicatorProps) {
  const { reducedMotion } = useMotion();
  const {
    isOnline,
    effectiveType,
    isSlowConnection,
    saveData,
  } = useNetworkStatus();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Track when going offline/online
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsDismissed(false);
      haptic('warning');
    } else if (wasOffline) {
      // Just came back online
      setShowReconnected(true);
      haptic('success');
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleDismiss = () => {
    haptic('light');
    setIsDismissed(true);
  };

  const handleRetry = () => {
    haptic('light');
    // Trigger a network check by reloading
    window.location.reload();
  };

  const getConnectionLabel = () => {
    if (!isOnline) return 'Offline';
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'Very slow connection';
    if (effectiveType === '3g') return 'Slow connection';
    if (saveData) return 'Data saver enabled';
    return 'Connected';
  };

  const getConnectionColor = () => {
    if (!isOnline) return 'bg-red-500/90';
    if (isSlowConnection) return 'bg-yellow-500/90';
    if (showReconnected) return 'bg-green-500/90';
    return 'bg-blue-500/90';
  };

  const shouldShow =
    !isDismissed &&
    (!isOnline || showReconnected || (showQuality && isSlowConnection));

  const positionClasses = position === 'top'
    ? 'top-0 pt-[env(safe-area-inset-top,0px)]'
    : 'bottom-0 pb-[env(safe-area-inset-bottom,0px)]';

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{
            y: position === 'top' ? -100 : 100,
            opacity: 0
          }}
          animate={{ y: 0, opacity: 1 }}
          exit={{
            y: position === 'top' ? -100 : 100,
            opacity: 0
          }}
          transition={{
            type: reducedMotion ? 'tween' : 'spring',
            damping: 25,
            stiffness: 300,
            duration: reducedMotion ? 0.15 : undefined,
          }}
          className={`
            fixed left-0 right-0 z-[100]
            ${positionClasses}
            ${className}
          `}
        >
          <div
            className={`
              mx-4 my-2 px-4 py-3 rounded-xl
              ${getConnectionColor()}
              backdrop-blur-lg shadow-lg
              flex items-center justify-between gap-3
            `}
          >
            {/* Icon and message */}
            <div className="flex items-center gap-3">
              {!isOnline ? (
                <WifiOff className="w-5 h-5 text-white flex-shrink-0" />
              ) : showReconnected ? (
                <Wifi className="w-5 h-5 text-white flex-shrink-0" />
              ) : (
                <Wifi className="w-5 h-5 text-white flex-shrink-0 opacity-60" />
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {showReconnected ? 'Back online!' : getConnectionLabel()}
                </p>
                {!isOnline && (
                  <p className="text-xs text-white/70">
                    Some features may be unavailable
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {!isOnline && (
                <button
                  onClick={handleRetry}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors touch-target-sm"
                  aria-label="Retry connection"
                >
                  <RefreshCw className="w-4 h-4 text-white" />
                </button>
              )}
              {(dismissible || isOnline) && (
                <button
                  onClick={handleDismiss}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors touch-target-sm"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineIndicator;
