/**
 * PullToRefresh Component
 *
 * A reusable pull-to-refresh wrapper for list pages.
 * Works on mobile touch devices with native-feeling physics.
 */

import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useMotion } from '../../contexts/MotionContext';

interface PullToRefreshProps {
  /** Content to wrap */
  children: React.ReactNode;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Whether refresh is currently in progress */
  isRefreshing?: boolean;
  /** Pull distance threshold in pixels (default: 80) */
  threshold?: number;
  /** Custom refresh message */
  refreshText?: string;
  /** Custom pull message */
  pullText?: string;
  /** Custom release message */
  releaseText?: string;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Custom class for the container */
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  isRefreshing: externalRefreshing,
  threshold = 80,
  refreshText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  enabled = true,
  className = '',
}: PullToRefreshProps) {
  const { reducedMotion } = useMotion();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isPulling = useRef(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshing = externalRefreshing ?? isRefreshing;
  const canRefresh = pullDistance >= threshold && !refreshing;
  const progress = Math.min(pullDistance / threshold, 1);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || refreshing) return;

      // Only start pull if scrolled to top
      const container = containerRef.current;
      if (container && container.scrollTop > 0) return;

      isPulling.current = true;
      startY.current = e.touches[0].clientY;
    },
    [enabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || !enabled || refreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Only allow pulling down
      if (diff < 0) {
        setPullDistance(0);
        return;
      }

      // Apply resistance as pull increases
      const resistance = 0.5;
      const adjustedDiff = diff * resistance;
      setPullDistance(Math.min(adjustedDiff, threshold * 2));

      // Haptic feedback when crossing threshold
      if (adjustedDiff >= threshold && pullDistance < threshold) {
        haptic('selection');
      }
    },
    [enabled, refreshing, threshold, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (canRefresh) {
      haptic('medium');
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [canRefresh, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
    >
      {/* Pull indicator */}
      <motion.div
        initial={false}
        animate={{
          height: refreshing ? threshold : pullDistance,
          opacity: pullDistance > 10 || refreshing ? 1 : 0,
        }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        className="flex items-center justify-center overflow-hidden bg-slate-900/50"
      >
        <div className="flex flex-col items-center gap-2 py-3">
          {refreshing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 1,
                  ease: 'linear',
                }}
              >
                <RefreshCw className="w-6 h-6 text-blue-400" />
              </motion.div>
              <span className="text-sm text-gray-400">{refreshText}</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{
                  rotate: canRefresh ? 180 : 0,
                  scale: canRefresh ? 1.1 : 1,
                }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
              >
                <ArrowDown
                  className={`w-6 h-6 transition-colors ${
                    canRefresh ? 'text-blue-400' : 'text-gray-500'
                  }`}
                />
              </motion.div>
              <span className="text-sm text-gray-400">
                {canRefresh ? releaseText : pullText}
              </span>
              {/* Progress bar */}
              <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Content */}
      {children}
    </div>
  );
}

export default PullToRefresh;
