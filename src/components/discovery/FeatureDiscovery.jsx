/**
 * FeatureDiscovery Component
 *
 * Shows rotating cards highlighting features the user hasn't tried yet.
 * Tracks visited features in localStorage and provides an engaging way
 * to help users discover all of MuscleMap's capabilities.
 *
 * @example
 * <FeatureDiscovery
 *   features={unusedFeatures}
 *   maxVisible={3}
 *   autoRotate={true}
 *   onFeatureClick={(feature) => navigate(feature.path)}
 * />
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import FeatureCard, { FeatureCardSkeleton } from './FeatureCard';
import { DISCOVERABLE_FEATURES, sortByPriority } from './featureDefinitions';

/**
 * localStorage keys for feature tracking
 */
const STORAGE_KEYS = {
  VISITED: 'musclemap_visited_features',
  DISMISSED: 'musclemap_dismissed_features',
  LAST_ROTATION: 'musclemap_feature_rotation_index',
};

/**
 * Hook to manage visited features tracking
 */
function useVisitedFeatures() {
  const [visited, setVisited] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VISITED);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markVisited = useCallback((featureId) => {
    setVisited((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      try {
        localStorage.setItem(STORAGE_KEYS.VISITED, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save visited features:', e);
      }
      return updated;
    });
  }, []);

  return { visited, markVisited };
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
  maxVisible = 3,
  autoRotate = true,
  rotationInterval = 8000,
  onFeatureClick,
  onDismiss,
  showHeader = true,
  compact = false,
  className,
}) {
  // Feature tracking hooks
  const { visited, markVisited } = useVisitedFeatures();
  const { dismissed, dismiss } = useDismissedFeatures();

  // Rotation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoRotateRef = useRef(null);

  // Use prop features or default to all discoverable features
  const allFeatures = propFeatures || DISCOVERABLE_FEATURES;

  // Filter out visited and dismissed features, sort by priority
  const availableFeatures = useMemo(() => {
    const filtered = allFeatures.filter(
      (f) => !visited.includes(f.id) && !dismissed.includes(f.id)
    );
    return sortByPriority(filtered);
  }, [allFeatures, visited, dismissed]);

  // Get currently visible features
  const visibleFeatures = useMemo(() => {
    if (availableFeatures.length === 0) return [];
    if (availableFeatures.length <= maxVisible) return availableFeatures;

    const features = [];
    for (let i = 0; i < maxVisible; i++) {
      const idx = (currentIndex + i) % availableFeatures.length;
      features.push(availableFeatures[idx]);
    }
    return features;
  }, [availableFeatures, currentIndex, maxVisible]);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || isPaused || availableFeatures.length <= maxVisible) {
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
  }, [autoRotate, isPaused, availableFeatures.length, maxVisible, rotationInterval]);

  // Handle feature click
  const handleFeatureClick = useCallback(
    (feature) => {
      markVisited(feature.id);
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [markVisited, onFeatureClick]
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

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? availableFeatures.length - 1 : prev - 1
    );
  }, [availableFeatures.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % availableFeatures.length);
  }, [availableFeatures.length]);

  // Pause rotation on hover/focus
  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  // Don't render if no features to show
  if (availableFeatures.length === 0) {
    return null;
  }

  const showNavigation = availableFeatures.length > maxVisible;

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
              <h3 className="text-sm font-semibold text-white">
                Discover Features
              </h3>
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
          compact
            ? 'grid-cols-1'
            : maxVisible === 1
            ? 'grid-cols-1'
            : maxVisible === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        <AnimatePresence mode="popLayout">
          {visibleFeatures.map((feature, index) => (
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
      {showNavigation && availableFeatures.length > maxVisible && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: Math.ceil(availableFeatures.length / maxVisible) }).map(
            (_, idx) => {
              const isActive =
                Math.floor(currentIndex / maxVisible) === idx ||
                (currentIndex % maxVisible !== 0 &&
                  Math.ceil(currentIndex / maxVisible) === idx);
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx * maxVisible)}
                  className={clsx(
                    'w-2 h-2 rounded-full transition-all duration-200',
                    isActive
                      ? 'bg-blue-500 w-6'
                      : 'bg-white/20 hover:bg-white/40'
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
export function FeatureDiscoverySkeleton({ count = 3 }) {
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
 * FeatureDiscoveryCompact - Horizontal scrolling version
 */
export function FeatureDiscoveryCompact({
  features: propFeatures,
  onFeatureClick,
  className,
}) {
  const { visited, markVisited } = useVisitedFeatures();
  const { dismissed } = useDismissedFeatures();

  const allFeatures = propFeatures || DISCOVERABLE_FEATURES;

  const availableFeatures = useMemo(() => {
    const filtered = allFeatures.filter(
      (f) => !visited.includes(f.id) && !dismissed.includes(f.id)
    );
    return sortByPriority(filtered).slice(0, 10);
  }, [allFeatures, visited, dismissed]);

  const handleClick = useCallback(
    (feature) => {
      markVisited(feature.id);
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [markVisited, onFeatureClick]
  );

  if (availableFeatures.length === 0) {
    return null;
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-400">
          Try something new
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {availableFeatures.map((feature) => (
          <motion.button
            key={feature.id}
            className={clsx(
              'flex-shrink-0 px-4 py-3 rounded-xl',
              'bg-white/5 backdrop-blur-md border border-white/10',
              'flex items-center gap-2',
              'cursor-pointer hover:bg-white/10 transition-colors'
            )}
            onClick={() => handleClick(feature)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${feature.color}20` }}
            >
              {React.createElement(
                require('lucide-react')[feature.icon] ||
                  require('lucide-react').HelpCircle,
                {
                  className: 'w-4 h-4',
                  style: { color: feature.color },
                  strokeWidth: 1.5,
                }
              )}
            </div>
            <span className="text-sm font-medium text-white whitespace-nowrap">
              {feature.title}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/**
 * useFeatureDiscovery - Hook for programmatic access
 */
export function useFeatureDiscovery() {
  const { visited, markVisited } = useVisitedFeatures();
  const { dismissed, dismiss, undismiss, clearDismissed } = useDismissedFeatures();

  const getUnvisitedFeatures = useCallback(
    (features = DISCOVERABLE_FEATURES) => {
      return features.filter(
        (f) => !visited.includes(f.id) && !dismissed.includes(f.id)
      );
    },
    [visited, dismissed]
  );

  const hasUnvisitedFeatures = useCallback(
    (features = DISCOVERABLE_FEATURES) => {
      return getUnvisitedFeatures(features).length > 0;
    },
    [getUnvisitedFeatures]
  );

  return {
    visited,
    dismissed,
    markVisited,
    dismiss,
    undismiss,
    clearDismissed,
    getUnvisitedFeatures,
    hasUnvisitedFeatures,
  };
}
