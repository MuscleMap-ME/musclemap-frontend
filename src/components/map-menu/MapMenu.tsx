/**
 * MapMenu - Main Component
 *
 * Interactive navigation map with three visualization styles:
 * - World/Globe (3D rotating globe)
 * - Constellation (star map with twinkling effects)
 * - Isometric (room-based building view)
 *
 * Automatically adapts quality based on device capabilities.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  MapMenuProps,
  MapViewType,
  MapNode,
  MapRenderer,
  QualityLevel,
} from './types';
import { createRenderer, preloadRenderer } from './renderers';
import { getMapData, getCompactMapData } from './data/mapData';
import {
  detectCapabilities,
  determineQualityLevel,
  probeFPS,
  perfLogger,
} from './utils/performance';
import { ViewSelector } from './components/ViewSelector';
import { SearchOverlay } from './components/SearchOverlay';
import { Legend } from './components/Legend';
import { NodeTooltip } from './components/NodeTooltip';
import { QualityIndicator } from './components/QualityIndicator';
import { MapMenuSkeleton } from './components/MapMenuSkeleton';

const DEFAULT_VIEW: MapViewType = 'constellation';
const LOW_FPS_THRESHOLD = 24;

export function MapMenu({
  mode,
  initialView,
  currentRoute,
  onNavigate,
  className = '',
}: MapMenuProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<MapViewType>(
    (searchParams.get('view') as MapViewType) || initialView || DEFAULT_VIEW
  );
  const [qualityLevel, setQualityLevel] = useState<QualityLevel>('medium');
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('mapMenuOnboardingDismissed');
    }
    return true;
  });
  const [fps, setFps] = useState(60);

  // Initialize quality based on device capabilities
  useEffect(() => {
    const caps = detectCapabilities();
    const quality = determineQualityLevel(caps);
    setQualityLevel(quality);
  }, []);

  // Initialize and manage renderer
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    const container = containerRef.current;

    const initRenderer = async () => {
      setIsLoading(true);

      // Clean up previous renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }

      // Clear container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Get appropriate data for mode
      const data = mode === 'compact' ? getCompactMapData() : getMapData();

      // Force lite quality for compact mode
      const effectiveQuality = mode === 'compact' ? 'lite' : qualityLevel;

      try {
        const endTiming = perfLogger.start('mapMenu.rendererInit');
        const renderer = await createRenderer(currentView, effectiveQuality);

        if (!isMounted) {
          renderer.dispose();
          return;
        }

        await renderer.initialize(container, data);

        // Set up callbacks
        renderer.onNodeClick((node) => {
          if (onNavigate) {
            onNavigate(node.route);
          } else {
            navigate(node.route);
          }
        });

        renderer.onNodeHover(setHoveredNode);

        // Set active node based on current route
        if (currentRoute) {
          const activeNode = data.nodes.find((n) => n.route === currentRoute);
          if (activeNode) {
            renderer.setActiveNode(activeNode.id);
          }
        }

        rendererRef.current = renderer;
        endTiming();

        // Check FPS after a short delay and auto-downgrade if needed
        if (effectiveQuality !== 'lite') {
          setTimeout(async () => {
            const measuredFps = await probeFPS();
            setFps(measuredFps);

            if (measuredFps < LOW_FPS_THRESHOLD && isMounted) {
              console.log(`[MapMenu] Low FPS detected (${measuredFps}), downgrading to lite`);
              setQualityLevel('lite');
            }
          }, 1000);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('[MapMenu] Renderer initialization failed:', error);
        // Fallback to lite mode on error
        setQualityLevel('lite');
        setIsLoading(false);
      }
    };

    initRenderer();

    return () => {
      isMounted = false;
      rendererRef.current?.dispose();
    };
  }, [currentView, qualityLevel, mode, currentRoute, navigate, onNavigate]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        rendererRef.current?.resize(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Sync view to URL
  useEffect(() => {
    setSearchParams(
      (params) => {
        params.set('view', currentView);
        return params;
      },
      { replace: true }
    );
  }, [currentView, setSearchParams]);

  // Apply filters
  useEffect(() => {
    rendererRef.current?.setSearchFilter(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    rendererRef.current?.setHighlightedCategory(selectedCategory);
  }, [selectedCategory]);

  // Update FPS periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (rendererRef.current) {
        setFps(rendererRef.current.getFPS());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleViewHover = useCallback((view: MapViewType) => {
    preloadRenderer(view);
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('mapMenuOnboardingDismissed', 'true');
  }, []);

  const toggleQuality = useCallback(() => {
    setQualityLevel((prev) => (prev === 'lite' ? 'high' : 'lite'));
  }, []);

  const mapData = mode === 'compact' ? getCompactMapData() : getMapData();

  return (
    <div
      className={`
        relative flex flex-col overflow-hidden rounded-glass-xl
        bg-void-base border border-glass-default
        ${mode === 'compact' ? 'w-full h-[200px] max-w-md' : 'w-full h-full min-h-[500px]'}
        ${className}
      `}
      role="navigation"
      aria-label="Interactive map navigation"
    >
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-3">
        <ViewSelector
          currentView={currentView}
          onViewChange={setCurrentView}
          onViewHover={handleViewHover}
          disabled={isLoading}
        />

        {mode === 'full' && (
          <SearchOverlay
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search features..."
          />
        )}

        <div className="ml-auto">
          <QualityIndicator
            level={qualityLevel}
            fps={fps}
            onToggle={toggleQuality}
          />
        </div>
      </div>

      {/* Renderer container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        aria-busy={isLoading}
      >
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-5"
            >
              <MapMenuSkeleton mode={mode} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend (full mode only) */}
      {mode === 'full' && (
        <Legend
          categories={mapData.categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <NodeTooltip node={hoveredNode} />
        )}
      </AnimatePresence>

      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && mode === 'full' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="
              absolute bottom-20 left-1/2 -translate-x-1/2 z-20
              bg-glass-white-10 backdrop-blur-glass-md
              border border-glass-default rounded-glass-lg
              px-5 py-3 flex items-center gap-4
            "
            role="dialog"
            aria-label="Navigation tips"
          >
            <p className="text-white/80 text-sm">
              Navigate MuscleMap visually! Click on any node to explore.
            </p>
            <button
              onClick={dismissOnboarding}
              className="
                px-4 py-1.5 rounded-glass-md
                bg-brand-blue-500 hover:bg-brand-blue-600
                text-white text-sm font-semibold
                transition-colors duration-fast
              "
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard hint (full mode only) */}
      {mode === 'full' && !isLoading && (
        <div className="absolute bottom-4 left-4 text-white/30 text-xs">
          Scroll to zoom • Drag to rotate
        </div>
      )}
    </div>
  );
}

export default MapMenu;
