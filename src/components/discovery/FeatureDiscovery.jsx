/**
 * FeatureDiscovery Component
 *
 * A container component that displays feature cards for features the user hasn't tried yet.
 * Shows a rotating/scrollable set of feature cards with various layout options.
 *
 * @example Basic Usage (Dashboard)
 * <FeatureDiscovery
 *   maxVisible={3}
 *   layout="carousel"
 *   filter={['social', 'tracking']}
 * />
 *
 * @example Compact in Sidebar
 * <FeatureDiscovery maxVisible={1} layout="stack" />
 *
 * @example Grid with Progress
 * <FeatureDiscovery
 *   maxVisible={6}
 *   layout="grid"
 *   showProgress
 *   onFeatureClick={(feature) => navigate(feature.route)}
 * />
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import FeatureCard, { FeatureCardSkeleton } from './FeatureCard';
import {
  DISCOVERABLE_FEATURES,
  sortByPriority,
  getFeaturesByCategories,
} from './featureDefinitions';

/**
 * localStorage keys for feature tracking
 */
const STORAGE_KEY = 'musclemap_discovered_features';
const DISMISSED_KEY = 'musclemap_dismissed_features';

/**
 * Get stored array from localStorage
 */
function getStoredArray(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save array to localStorage
 */
function saveStoredArray(key, array) {
  try {
    localStorage.setItem(key, JSON.stringify(array));
  } catch (e) {
    console.warn(`Failed to save to ${key}:`, e);
  }
}

/**
 * Internal hook to manage discovered features tracking
 */
function useDiscoveredFeatures() {
  const [discovered, setDiscovered] = useState(() => getStoredArray(STORAGE_KEY));

  const markDiscovered = useCallback((featureId) => {
    setDiscovered((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      saveStoredArray(STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  return { discovered, markDiscovered };
}

/**
 * Internal hook to manage dismissed features
 */
function useDismissedFeatures() {
  const [dismissed, setDismissed] = useState(() => getStoredArray(DISMISSED_KEY));

  const dismissFeature = useCallback((featureId) => {
    setDismissed((prev) => {
      if (prev.includes(featureId)) return prev;
      const updated = [...prev, featureId];
      saveStoredArray(DISMISSED_KEY, updated);
      return updated;
    });
  }, []);

  const undismissFeature = useCallback((featureId) => {
    setDismissed((prev) => {
      const updated = prev.filter((id) => id !== featureId);
      saveStoredArray(DISMISSED_KEY, updated);
      return updated;
    });
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissed([]);
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch (e) {
      console.warn('Failed to clear dismissed features:', e);
    }
  }, []);

  return { dismissed, dismissFeature, undismissFeature, clearDismissed };
}

/**
 * FeatureDiscovery Component
 *
 * @param {Object} props
 * @param {number} props.maxVisible - How many cards to show at once (default 3)
 * @param {string} props.layout - 'carousel' | 'grid' | 'stack' (default 'carousel')
 * @param {string[]} props.filter - Only show specific feature categories
 * @param {Function} props.onFeatureClick - Called when user clicks a feature
 * @param {boolean} props.showProgress - Show "X of Y features discovered" (default false)
 * @param {boolean} props.showHeader - Show the header section (default true)
 * @param {boolean} props.autoRotate - Auto-rotate carousel (default true)
 * @param {number} props.rotationInterval - Rotation interval in ms (default 8000)
 * @param {string} props.className - Additional CSS classes
 */
export default function FeatureDiscovery({
  maxVisible = 3,
  layout = 'carousel',
  filter,
  onFeatureClick,
  showProgress = false,
  showHeader = true,
  autoRotate = true,
  rotationInterval = 8000,
  className,
}) {
  // Feature tracking hooks
  const { discovered, markDiscovered } = useDiscoveredFeatures();
  const { dismissed, dismissFeature } = useDismissedFeatures();

  // Carousel/rotation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoRotateRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Get all features, optionally filtered by categories
  const allFeatures = useMemo(() => {
    if (filter && filter.length > 0) {
      return getFeaturesByCategories(filter);
    }
    return DISCOVERABLE_FEATURES;
  }, [filter]);

  // Filter out discovered and dismissed features, sort by priority
  const undiscoveredFeatures = useMemo(() => {
    const filtered = allFeatures.filter(
      (f) => !discovered.includes(f.id) && !dismissed.includes(f.id)
    );
    return sortByPriority(filtered);
  }, [allFeatures, discovered, dismissed]);

  // Calculate discovery progress
  const discoveryProgress = useMemo(() => {
    const total = allFeatures.length;
    const discoveredCount = discovered.filter((id) =>
      allFeatures.some((f) => f.id === id)
    ).length;
    const percent = total > 0 ? Math.round((discoveredCount / total) * 100) : 0;
    return { discovered: discoveredCount, total, percent };
  }, [allFeatures, discovered]);

  // Get currently visible features based on layout
  const visibleFeatures = useMemo(() => {
    if (undiscoveredFeatures.length === 0) return [];

    if (layout === 'carousel') {
      // Show all for horizontal scrolling, but limit display
      return undiscoveredFeatures.slice(0, maxVisible * 2);
    }

    if (layout === 'stack') {
      // Stack shows one at a time
      return [undiscoveredFeatures[currentIndex % undiscoveredFeatures.length]];
    }

    // Grid layout with rotation
    if (undiscoveredFeatures.length <= maxVisible) {
      return undiscoveredFeatures;
    }

    const features = [];
    for (let i = 0; i < maxVisible; i++) {
      const idx = (currentIndex + i) % undiscoveredFeatures.length;
      features.push(undiscoveredFeatures[idx]);
    }
    return features;
  }, [undiscoveredFeatures, currentIndex, maxVisible, layout]);

  // Auto-rotation effect (for grid and stack layouts)
  useEffect(() => {
    if (layout === 'carousel' || !autoRotate || isPaused || undiscoveredFeatures.length <= maxVisible) {
      return;
    }

    autoRotateRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % undiscoveredFeatures.length);
    }, rotationInterval);

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [autoRotate, isPaused, undiscoveredFeatures.length, maxVisible, rotationInterval, layout]);

  // Handle feature click
  const handleFeatureClick = useCallback(
    (feature) => {
      markDiscovered(feature.id);
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [markDiscovered, onFeatureClick]
  );

  // Handle dismiss
  const handleDismiss = useCallback(
    (featureId) => {
      dismissFeature(featureId);
    },
    [dismissFeature]
  );

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? undiscoveredFeatures.length - 1 : prev - 1
    );
  }, [undiscoveredFeatures.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % undiscoveredFeatures.length);
  }, [undiscoveredFeatures.length]);

  // Scroll handlers (for carousel layout)
  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);

  // Pause rotation on hover/focus
  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  // Don't render if no features to show
  if (undiscoveredFeatures.length === 0) {
    // Optionally show completion message if showProgress is enabled
    if (showProgress && discoveryProgress.total > 0) {
      return (
        <div className={clsx('text-center py-6', className)}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-sm text-gray-400">
            You have explored all {discoveryProgress.total} features!
          </p>
        </div>
      );
    }
    return null;
  }

  const showNavigation =
    layout === 'carousel'
      ? undiscoveredFeatures.length > maxVisible
      : undiscoveredFeatures.length > (layout === 'stack' ? 1 : maxVisible);

  // Render header with progress
  const renderHeader = () => {
    if (!showHeader) return null;

    return (
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
              {showProgress
                ? `${discoveryProgress.discovered} of ${discoveryProgress.total} discovered`
                : `${undiscoveredFeatures.length} features to explore`}
            </p>
          </div>
        </div>

        {/* Navigation arrows */}
        {showNavigation && (
          <div className="flex items-center gap-2">
            <button
              onClick={layout === 'carousel' ? scrollLeft : goToPrevious}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Previous features"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={layout === 'carousel' ? scrollRight : goToNext}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Next features"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render progress bar
  const renderProgress = () => {
    if (!showProgress) return null;

    return (
      <div className="mt-4">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${discoveryProgress.percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right">
          {discoveryProgress.percent}% complete
        </p>
      </div>
    );
  };

  // Carousel layout - horizontal scrolling
  if (layout === 'carousel') {
    return (
      <div
        className={clsx('relative', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderHeader()}

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
            {visibleFeatures.map((feature, index) => (
              <div key={feature.id} className="flex-shrink-0 w-72 snap-start">
                <FeatureCard
                  feature={feature}
                  variant={index === 0 ? 'highlighted' : 'default'}
                  onTry={handleFeatureClick}
                  onDismiss={handleDismiss}
                  showPulse={index === 0}
                  index={index}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>

        {/* Scroll indicator dots */}
        {undiscoveredFeatures.length > maxVisible && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: Math.min(undiscoveredFeatures.length, maxVisible * 2) }).map(
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
            {undiscoveredFeatures.length > maxVisible * 2 && (
              <span className="text-xs text-gray-500 ml-1">
                +{undiscoveredFeatures.length - maxVisible * 2}
              </span>
            )}
          </div>
        )}

        {renderProgress()}
      </div>
    );
  }

  // Stack layout - one card at a time with transitions
  if (layout === 'stack') {
    return (
      <div
        className={clsx('relative', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {renderHeader()}

        {/* Single card with animation */}
        <div className="relative min-h-[200px]">
          <AnimatePresence mode="wait">
            {visibleFeatures.map((feature) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <FeatureCard
                  feature={feature}
                  variant="default"
                  onTry={handleFeatureClick}
                  onDismiss={handleDismiss}
                  showPulse
                  index={0}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Stack indicator */}
        {undiscoveredFeatures.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {undiscoveredFeatures.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={clsx(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  idx === currentIndex % undiscoveredFeatures.length
                    ? 'bg-blue-500 w-6'
                    : 'bg-white/20 hover:bg-white/40'
                )}
                aria-label={`Go to feature ${idx + 1}`}
              />
            ))}
            {undiscoveredFeatures.length > 5 && (
              <span className="text-xs text-gray-500 ml-1">
                +{undiscoveredFeatures.length - 5}
              </span>
            )}
          </div>
        )}

        {renderProgress()}
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div
      className={clsx('relative', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {renderHeader()}

      {/* Feature cards grid */}
      <div
        className={clsx(
          'grid gap-4',
          maxVisible === 1
            ? 'grid-cols-1'
            : maxVisible === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        <AnimatePresence mode="popLayout">
          {visibleFeatures.slice(0, maxVisible).map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              variant={index === 0 ? 'highlighted' : 'default'}
              onTry={handleFeatureClick}
              onDismiss={handleDismiss}
              showPulse={index === 0}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Progress dots for grid */}
      {showNavigation && undiscoveredFeatures.length > maxVisible && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: Math.ceil(undiscoveredFeatures.length / maxVisible) }).map(
            (_, idx) => {
              const isActive =
                Math.floor(currentIndex / maxVisible) === idx ||
                (currentIndex % maxVisible !== 0 && Math.ceil(currentIndex / maxVisible) === idx);
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx * maxVisible)}
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

      {renderProgress()}
    </div>
  );
}

/**
 * FeatureDiscoverySkeleton - Loading state
 */
export function FeatureDiscoverySkeleton({ count = 3, layout = 'grid' }) {
  if (layout === 'carousel') {
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

  if (layout === 'stack') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
          <div>
            <div className="h-4 w-28 bg-white/10 rounded animate-pulse mb-1" />
            <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <FeatureCardSkeleton />
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
  maxVisible = 10,
  filter,
  onFeatureClick,
  className,
}) {
  const { discovered, markDiscovered } = useDiscoveredFeatures();
  const { dismissed } = useDismissedFeatures();

  const allFeatures = useMemo(() => {
    if (filter && filter.length > 0) {
      return getFeaturesByCategories(filter);
    }
    return DISCOVERABLE_FEATURES;
  }, [filter]);

  const undiscoveredFeatures = useMemo(() => {
    const filtered = allFeatures.filter(
      (f) => !discovered.includes(f.id) && !dismissed.includes(f.id)
    );
    return sortByPriority(filtered).slice(0, maxVisible);
  }, [allFeatures, discovered, dismissed, maxVisible]);

  const handleClick = useCallback(
    (feature) => {
      markDiscovered(feature.id);
      if (onFeatureClick) {
        onFeatureClick(feature);
      }
    },
    [markDiscovered, onFeatureClick]
  );

  if (undiscoveredFeatures.length === 0) {
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
        {undiscoveredFeatures.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            variant="compact"
            onTry={handleClick}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * useFeatureDiscovery - Hook for programmatic access
 * Re-exported for convenience (main implementation in useFeatureDiscovery.js)
 */
export { useFeatureDiscovery } from './useFeatureDiscovery';
