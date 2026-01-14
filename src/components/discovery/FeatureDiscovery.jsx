/**
 * FeatureDiscovery Component
 *
 * A horizontal scrollable row of cards highlighting features the user hasn't tried yet.
 * Tracks visited features in localStorage and provides an engaging way to help users
 * discover all of MuscleMap's capabilities.
 *
 * @example Basic Usage
 * <FeatureDiscovery maxCards={3} />
 *
 * @example With Custom Handling
 * <FeatureDiscovery
 *   maxCards={4}
 *   onFeatureClick={(feature) => analytics.track('feature_discovered', feature.id)}
 *   exclude={['martial_arts']} // Hide from certain users
 * />
 *
 * @example Grid Mode (default)
 * <FeatureDiscovery maxCards={3} layout="grid" />
 *
 * @example Horizontal Scroll Mode
 * <FeatureDiscovery maxCards={5} layout="scroll" />
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import FeatureCard, { FeatureCardSkeleton, FeatureCardCompact } from './FeatureCard';
import { DISCOVERABLE_FEATURES, sortByPriority } from './featureDefinitions';

/**
 * localStorage keys for feature tracking
 */
const STORAGE_KEYS = {
  USED: 'musclemap_used_features',
  DISMISSED: 'musclemap_dismissed_features',
  LAST_ROTATION: 'musclemap_feature_rotation_index',
};

/**
 * Hook to manage used features tracking
 */
function useUsedFeatures() {
  const [used, setUsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markUsed = useCallback((featureId) => {
    setUsed((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      try {
        localStorage.setItem(STORAGE_KEYS.USED, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save used features:', e);
      }
      return updated;
    });
  }, []);

  return { used, markUsed };
}

/**
 * Hook to manage dismissed features
 */
function useDismissedFeatures() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DISMISSED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const dismiss = useCallback((featureId) => {
    setDismissed((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      try {
        localStorage.setItem(STORAGE_KEYS.DISMISSED, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save dismissed features:', e);
      }
      return updated;
    });
  }, []);

  const undismiss = useCallback((featureId) => {
    setDismissed((prev) => {
      const updated = prev.filter((id) => id !== featureId);
      try {
        localStorage.setItem(STORAGE_KEYS.DISMISSED, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save dismissed features:', e);
      }
      return updated;
    });
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissed([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.DISMISSED);
    } catch (e) {
      console.warn('Failed to clear dismissed features:', e);
    }
  }, []);

  return { dismissed, dismiss, undismiss, clearDismissed };
}

/**
 * FeatureDiscovery Component
 */
export default function FeatureDiscovery({
  features: propFeatures,
  maxCards = 3,
  layout = 'scroll', // 'scroll' for horizontal, 'grid' for responsive grid
  autoRotate = true,
  rotationInterval = 8000,
  onFeatureClick,
  onDismiss,
  exclude = [], // Array of feature IDs to never show
  showHeader = true,
  className,
}) {
  // Feature tracking hooks
  const { used, markUsed } = useUsedFeatures();
  const { dismissed, dismiss } = useDismissedFeatures();

  // Rotation state for grid layout
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoRotateRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Use prop features or default to all discoverable features
  const allFeatures = propFeatures || DISCOVERABLE_FEATURES;

  // Filter out used, dismissed, and excluded features, sort by priority
  const availableFeatures = useMemo(() => {
    const filtered = allFeatures.filter(
      (f) =>
        !used.includes(f.id) && !dismissed.includes(f.id) && !exclude.includes(f.id)
    );
    return sortByPriority(filtered);
  }, [allFeatures, used, dismissed, exclude]);

  // Get currently visible features (for grid layout with rotation)
  const visibleFeatures = useMemo(() => {
    if (availableFeatures.length === 0) return [];

    if (layout === 'scroll') {
      // For scroll layout, return all available features
      return availableFeatures;
    }

    // For grid layout with rotation
    if (availableFeatures.length <= maxCards) return availableFeatures;

    const features = [];
    for (let i = 0; i < maxCards; i++) {
      const idx = (currentIndex + i) % availableFeatures.length;
      features.push(availableFeatures[idx]);
    }
    return features;
  }, [availableFeatures, currentIndex, maxCards, layout]);

  // Auto-rotation effect (only for grid layout)
  useEffect(() => {
    if (
      layout !== 'grid' ||
      !autoRotate ||
      isPaused ||
      availableFeatures.length <= maxCards
    ) {
      return;
    }

    autoRotateRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % availableFeatures.length);
    }, rotationInterval);

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [autoRotate, isPaused, availableFeatures.length, maxCards, rotationInterval, layout]);

  // Handle feature click
  const handleFeatureClick = useCallback(
    (feature) => {
      markUsed(feature.id);
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [markUsed, onFeatureClick]
  );

  // Handle dismiss
  const handleDismiss = useCallback(
    (featureId) => {
      dismiss(featureId);
      if (onDismiss) {
        onDismiss(featureId);
      }
    },
    [dismiss, onDismiss]
  );

  // Navigation handlers (for grid layout)
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? availableFeatures.length - 1 : prev - 1
    );
  }, [availableFeatures.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % availableFeatures.length);
  }, [availableFeatures.length]);

  // Scroll handlers (for scroll layout)
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  }, []);

  // Pause rotation on hover/focus
  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  // Don't render if no features to show
  if (availableFeatures.length === 0) {
    return null;
  }

  const showNavigation =
    layout === 'grid'
      ? availableFeatures.length > maxCards
      : availableFeatures.length > maxCards;

  // Horizontal scroll layout
  if (layout === 'scroll') {
    return (
      <div
        className={clsx('relative', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <motion.div
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(59, 130, 246, 0.3)',
                    '0 0 20px rgba(139, 92, 246, 0.4)',
                    '0 0 10px rgba(59, 130, 246, 0.3)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
              </motion.div>
              <div>
                <h3 className="text-sm font-semibold text-white">Discover Features</h3>
                <p className="text-xs text-gray-500">
                  {availableFeatures.length} features to explore
                </p>
              </div>
            </div>

            {/* Scroll navigation arrows */}
            {showNavigation && (
              <div className="flex items-center gap-2">
                <button
                  onClick={scrollLeft}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollRight}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Horizontal scrollable row */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <AnimatePresence mode="popLayout">
            {visibleFeatures.slice(0, maxCards * 2).map((feature, index) => (
              <div key={feature.id} className="flex-shrink-0 w-72 snap-start">
                <FeatureCard
                  feature={feature}
                  onClick={handleFeatureClick}
                  onDismiss={handleDismiss}
                  showPulse={index === 0}
                  index={index}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* Scroll indicator dots */}
        {availableFeatures.length > maxCards && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: Math.min(availableFeatures.length, maxCards * 2) }).map(
              (_, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-all duration-200',
                    idx === 0 ? 'bg-blue-500' : 'bg-white/20'
                  )}
                />
              )
            )}
            {availableFeatures.length > maxCards * 2 && (
              <span className="text-xs text-gray-500 ml-1">
                +{availableFeatures.length - maxCards * 2}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid layout (default for backward compatibility)
  return (
    <div
      className={clsx('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20"
              animate={{
                boxShadow: [
                  '0 0 10px rgba(59, 130, 246, 0.3)',
                  '0 0 20px rgba(139, 92, 246, 0.4)',
                  '0 0 10px rgba(59, 130, 246, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
            </motion.div>
            <div>
              <h3 className="text-sm font-semibold text-white">Discover Features</h3>
              <p className="text-xs text-gray-500">
                {availableFeatures.length} features to explore
              </p>
            </div>
          </div>

          {/* Navigation arrows */}
          {showNavigation && (
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                aria-label="Previous features"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNext}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                aria-label="Next features"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feature cards grid */}
      <div
        className={clsx(
          'grid gap-4',
          maxCards === 1
            ? 'grid-cols-1'
            : maxCards === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        <AnimatePresence mode="popLayout">
          {visibleFeatures.slice(0, maxCards).map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onClick={handleFeatureClick}
              onDismiss={handleDismiss}
              showPulse={index === 0}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      {showNavigation && availableFeatures.length > maxCards && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: Math.ceil(availableFeatures.length / maxCards) }).map(
            (_, idx) => {
              const isActive =
                Math.floor(currentIndex / maxCards) === idx ||
                (currentIndex % maxCards !== 0 &&
                  Math.ceil(currentIndex / maxCards) === idx);
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx * maxCards)}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-all duration-200',
                    isActive ? 'bg-blue-500 w-6' : 'bg-white/20 hover:bg-white/40'
                  )}
                  aria-label={`Go to page ${idx + 1}`}
                />
              );
            }
          )}
        </div>
      )}

      {/* Auto-rotate indicator */}
      {autoRotate && showNavigation && !isPaused && (
        <div className="absolute top-0 right-0 -translate-y-full pb-2">
          <motion.div
            className="h-0.5 bg-blue-500/50 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{
              duration: rotationInterval / 1000,
              ease: 'linear',
              repeat: Infinity,
            }}
            style={{ width: 60 }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * FeatureDiscoverySkeleton - Loading state
 */
export function FeatureDiscoverySkeleton({ count = 3, layout = 'grid' }) {
  if (layout === 'scroll') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
          <div>
            <div className="h-4 w-28 bg-white/10 rounded animate-pulse mb-1" />
            <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72">
              <FeatureCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
        <div>
          <div className="h-4 w-28 bg-white/10 rounded animate-pulse mb-1" />
          <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <FeatureCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * FeatureDiscoveryCompact - Horizontal scrolling compact version
 */
export function FeatureDiscoveryCompact({
  features: propFeatures,
  maxCards = 10,
  exclude = [],
  onFeatureClick,
  className,
}) {
  const { used, markUsed } = useUsedFeatures();
  const { dismissed } = useDismissedFeatures();

  const allFeatures = propFeatures || DISCOVERABLE_FEATURES;

  const availableFeatures = useMemo(() => {
    const filtered = allFeatures.filter(
      (f) =>
        !used.includes(f.id) && !dismissed.includes(f.id) && !exclude.includes(f.id)
    );
    return sortByPriority(filtered).slice(0, maxCards);
  }, [allFeatures, used, dismissed, exclude, maxCards]);

  const handleClick = useCallback(
    (feature) => {
      markUsed(feature.id);
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [markUsed, onFeatureClick]
  );

  if (availableFeatures.length === 0) {
    return null;
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-400">Try something new</span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {availableFeatures.map((feature) => (
          <FeatureCardCompact
            key={feature.id}
            feature={feature}
            onClick={handleClick}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * useFeatureDiscovery - Hook for programmatic access
 * (Re-exported from useFeatureDiscovery.js for backward compatibility)
 */
export function useFeatureDiscovery() {
  const { used, markUsed } = useUsedFeatures();
  const { dismissed, dismiss, undismiss, clearDismissed } = useDismissedFeatures();

  const getUnusedFeatures = useCallback(
    (features = DISCOVERABLE_FEATURES, excludeIds = []) => {
      return features.filter(
        (f) =>
          !used.includes(f.id) &&
          !dismissed.includes(f.id) &&
          !excludeIds.includes(f.id)
      );
    },
    [used, dismissed]
  );

  const hasUnusedFeatures = useCallback(
    (features = DISCOVERABLE_FEATURES, excludeIds = []) => {
      return getUnusedFeatures(features, excludeIds).length > 0;
    },
    [getUnusedFeatures]
  );

  return {
    usedFeatures: used,
    dismissedFeatures: dismissed,
    unusedFeatures: getUnusedFeatures(),
    markUsed,
    dismiss,
    undismiss,
    clearDismissed,
    getUnusedFeatures,
    hasUnusedFeatures,
  };
}
