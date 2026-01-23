/**
 * MemoryWarningBanner
 *
 * Displays a warning banner when memory usage is high.
 * Only shows in Chrome/Edge where memory API is available.
 */

import React from 'react';
import { AlertTriangle, X, RefreshCw, Trash2 } from 'lucide-react';
import { useMemoryMonitor, type MemoryWarning } from '../../lib/memory-monitor';
import { clearApolloCache } from '../../graphql/client';
import clsx from 'clsx';

interface MemoryWarningBannerProps {
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Custom class name */
  className?: string;
}

export function MemoryWarningBanner({
  position = 'top',
  className,
}: MemoryWarningBannerProps) {
  const { warning, clearWarning, forceGC, supported } = useMemoryMonitor();

  // Don't render if no warning or not supported
  if (!supported || !warning) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleClearCache = async () => {
    try {
      await clearApolloCache();
      forceGC();
      clearWarning();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const handleDismiss = () => {
    if (warning.level !== 'emergency') {
      clearWarning();
    }
  };

  const levelStyles: Record<MemoryWarning['level'], string> = {
    warning: 'bg-amber-500/90 text-amber-950',
    critical: 'bg-orange-600/90 text-white',
    emergency: 'bg-red-600/95 text-white animate-pulse',
  };

  const levelIcons: Record<MemoryWarning['level'], React.ReactNode> = {
    warning: <AlertTriangle className="w-5 h-5" />,
    critical: <AlertTriangle className="w-5 h-5" />,
    emergency: <AlertTriangle className="w-6 h-6" />,
  };

  return (
    <div
      className={clsx(
        'fixed left-0 right-0 z-50 px-4 py-3 shadow-lg',
        position === 'top' ? 'top-0' : 'bottom-0',
        levelStyles[warning.level],
        className
      )}
      role="alert"
      aria-live={warning.level === 'emergency' ? 'assertive' : 'polite'}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {levelIcons[warning.level]}
          <div>
            <p className="font-semibold">
              {warning.level === 'warning' && 'Memory Usage Elevated'}
              {warning.level === 'critical' && 'High Memory Usage'}
              {warning.level === 'emergency' && 'Critical Memory Warning'}
            </p>
            <p className="text-sm opacity-90">
              {warning.memoryInfo.usedMB}MB used of {warning.memoryInfo.limitMB}MB
              {warning.level === 'emergency' && ' - Page may crash soon!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear cache button */}
          <button
            onClick={handleClearCache}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-white/20 hover:bg-white/30 transition-colors'
            )}
            title="Clear cache to free memory"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear Cache</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-white/20 hover:bg-white/30 transition-colors'
            )}
            title="Refresh page"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Dismiss button (not for emergency) */}
          {warning.level !== 'emergency' && (
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              title="Dismiss"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions for emergency */}
      {warning.level === 'emergency' && warning.suggestions.length > 0 && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-white/20">
          <p className="text-sm font-medium mb-1">Recommended actions:</p>
          <ul className="text-sm opacity-90 list-disc list-inside">
            {warning.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MemoryWarningBanner;
