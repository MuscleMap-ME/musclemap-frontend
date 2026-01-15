/**
 * MuscleExplorer - Interactive 3D-like muscle model explorer
 *
 * Main component that combines:
 * - SVG body diagram with front/back views
 * - Interactive muscle regions with activation visualization
 * - Detail panel for selected muscles
 * - Touch-friendly controls (pinch to zoom, swipe to rotate)
 *
 * @module MuscleExplorer
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  MUSCLE_DATA,
  getMusclesForView,
  getMusclePathsForView,
  VIEWBOX,
  BODY_OUTLINE,
  GLOW_FILTER_DEF,
} from './muscleData';
import { MuscleRegionGroup, COLOR_SCHEMES } from './MuscleRegion';
import MuscleDetail from './MuscleDetail';
import MuscleControls from './MuscleControls';
import { useMuscleExplorer, VIEW_PRESETS } from './useMuscleExplorer';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

/**
 * Size presets for the explorer
 */
const SIZE_PRESETS = {
  sm: { width: 280, height: 400, controlsPosition: 'bottom' },
  md: { width: 360, height: 520, controlsPosition: 'bottom' },
  lg: { width: 480, height: 680, controlsPosition: 'floating' },
};

/**
 * Animation timing
 */
const ANIMATION = {
  viewTransition: 0.4,
  hover: 0.15,
  zoom: 0.3,
};

// ============================================
// HEAD COMPONENT
// ============================================

const Head = React.memo(() => (
  <ellipse
    cx="100"
    cy="50"
    rx="25"
    ry="30"
    fill="rgba(71, 85, 105, 0.15)"
    stroke="rgba(148, 163, 184, 0.2)"
    strokeWidth="1"
  />
));

Head.displayName = 'Head';

// ============================================
// BODY OUTLINE COMPONENT
// ============================================

const BodyOutline = React.memo(({ view }) => (
  <path
    d={BODY_OUTLINE[view]}
    fill="none"
    stroke="rgba(148, 163, 184, 0.2)"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

BodyOutline.displayName = 'BodyOutline';

// ============================================
// VIEW LABEL COMPONENT
// ============================================

const ViewLabel = React.memo(({ view, motionAllowed }) => (
  <motion.div
    key={view}
    initial={motionAllowed ? { opacity: 0, y: -10 } : false}
    animate={{ opacity: 1, y: 0 }}
    exit={motionAllowed ? { opacity: 0, y: 10 } : undefined}
    className={clsx(
      'absolute top-2 left-1/2 -translate-x-1/2',
      'px-3 py-1 rounded-full',
      'bg-[var(--glass-white-10,rgba(255,255,255,0.1))]',
      'border border-[var(--border-subtle,#1e293b)]',
      'text-xs font-medium text-[var(--text-secondary,#cbd5e1)]',
      'pointer-events-none'
    )}
  >
    {VIEW_PRESETS[view]?.label || 'Front'}
  </motion.div>
));

ViewLabel.displayName = 'ViewLabel';

// ============================================
// ACTIVATION LEGEND COMPONENT
// ============================================

const ActivationLegend = React.memo(({ colorScheme }) => {
  const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.heat;

  const levels = [
    { label: 'Low', value: 25 },
    { label: 'Med', value: 50 },
    { label: 'High', value: 75 },
    { label: 'Max', value: 100 },
  ];

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-[var(--text-quaternary,#64748b)]">Activation:</span>
      <div className="flex items-center gap-1">
        {levels.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-0.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: scheme.getColor(value) }}
              title={`${label} (${value}%)`}
            />
          </div>
        ))}
      </div>
      <span className="text-[var(--text-quaternary,#64748b)]">Low - Max</span>
    </div>
  );
});

ActivationLegend.displayName = 'ActivationLegend';

// ============================================
// HOVER TOOLTIP COMPONENT
// ============================================

const HoverTooltip = React.memo(({ muscle, activation, motionAllowed }) => {
  if (!muscle) return null;

  return (
    <motion.div
      initial={motionAllowed ? { opacity: 0, y: 5 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={motionAllowed ? { opacity: 0, y: 5 } : undefined}
      className={clsx(
        'absolute top-4 left-1/2 -translate-x-1/2 z-20',
        'px-3 py-2 rounded-lg',
        'bg-[var(--void-deep,#0f172a)] border border-[var(--border-subtle,#1e293b)]',
        'shadow-lg pointer-events-none'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: muscle.color }}
        />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary,#f1f5f9)]">
            {muscle.commonName}
          </p>
          <p className="text-xs text-[var(--text-tertiary,#94a3b8)]">
            {activation > 0
              ? `${Math.round(activation)}% activation`
              : 'Click for details'}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

HoverTooltip.displayName = 'HoverTooltip';

// ============================================
// MAIN MUSCLE EXPLORER COMPONENT
// ============================================

/**
 * MuscleExplorer - Interactive muscle model explorer component
 *
 * @param {Object} props
 * @param {'front'|'back'|'both'} props.view - View mode (both = side by side)
 * @param {Object} props.activations - Map of muscle IDs to activation levels (0-1 or 0-100)
 * @param {string} props.selectedMuscle - Currently selected muscle ID
 * @param {Function} props.onMuscleSelect - Callback when muscle is selected
 * @param {boolean} props.interactive - Enable/disable interactivity
 * @param {boolean} props.showLabels - Show muscle labels on hover
 * @param {'sm'|'md'|'lg'} props.size - Size preset
 * @param {'heat'|'bioluminescent'|'monochrome'} props.colorScheme - Color scheme
 * @param {boolean} props.showControls - Show view/zoom controls
 * @param {boolean} props.showLegend - Show activation legend
 * @param {Object} props.activationHistory - History data for detail panel
 * @param {Object} props.muscleStats - Stats data for detail panel
 * @param {Array} props.personalRecords - PRs for detail panel
 * @param {Function} props.onFindExercises - Callback for find exercises action
 * @param {Function} props.onViewHistory - Callback for view history action
 * @param {Function} props.onExerciseClick - Callback when exercise is clicked
 * @param {string} props.className - Additional CSS classes
 */
const MuscleExplorer = ({
  view: viewProp = 'front',
  activations = {},
  selectedMuscle: selectedMuscleProp,
  onMuscleSelect: onMuscleSelectProp,
  interactive = true,
  showLabels = true,
  size = 'md',
  colorScheme = 'heat',
  showControls = true,
  showLegend = true,
  activationHistory = {},
  muscleStats = {},
  personalRecords = [],
  onFindExercises,
  onViewHistory,
  onExerciseClick,
  className,
}) => {
  const motionAllowed = useMotionAllowed();
  const containerRef = useRef(null);

  // Use the muscle explorer hook for state management
  const {
    selectedMuscle: internalSelectedMuscle,
    selectMuscle: internalSelectMuscle,
    clearSelection: internalClearSelection,
    rotation,
    rotateBy,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    currentView,
    setView,
    resetView,
    isAutoRotating,
    toggleAutoRotate,
    config,
  } = useMuscleExplorer({
    initialView: viewProp === 'both' ? 'front' : viewProp,
  });

  // Use prop values if provided, otherwise use internal state
  const selectedMuscle = selectedMuscleProp !== undefined ? selectedMuscleProp : internalSelectedMuscle;
  const onMuscleSelect = onMuscleSelectProp || internalSelectMuscle;

  // Hovered muscle state
  const [hoveredMuscle, setHoveredMuscle] = useState(null);

  // Touch gesture state (used internally by touch handlers)
  const [_gestureState, _setGestureState] = useState({
    isPinching: false,
    initialDistance: null,
    initialZoom: null,
  });

  // Size configuration
  const sizeConfig = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  // Normalize activations to 0-100 range
  const normalizedActivations = useMemo(() => {
    const result = {};
    Object.entries(activations).forEach(([key, value]) => {
      result[key] = value <= 1 && value > 0 ? value * 100 : value;
    });
    return result;
  }, [activations]);

  // Get muscles for current view (used by renderMuscles)
  const _visibleMuscles = useMemo(() => {
    return getMusclesForView(currentView);
  }, [currentView]);

  // Calculate SVG transform for zoom/rotation
  const svgTransform = useMemo(() => {
    const rotationDeg = rotation.y % 360;
    const scaleX = Math.cos((rotationDeg * Math.PI) / 180);

    return {
      transform: `scale(${zoom}) scaleX(${Math.abs(scaleX) < 0.1 ? 0.1 : scaleX})`,
      transformOrigin: 'center center',
    };
  }, [zoom, rotation.y]);

  // Handle muscle click
  const handleMuscleClick = useCallback((muscleId) => {
    if (!interactive) return;
    if (selectedMuscle === muscleId) {
      if (internalClearSelection) internalClearSelection();
      if (onMuscleSelectProp) onMuscleSelectProp(null);
    } else {
      onMuscleSelect(muscleId);
    }
  }, [interactive, selectedMuscle, onMuscleSelect, onMuscleSelectProp, internalClearSelection]);

  // Handle muscle hover
  const handleMuscleHover = useCallback((muscleId) => {
    if (!interactive) return;
    setHoveredMuscle(muscleId);
  }, [interactive]);

  // Handle background click (deselect)
  const handleBackgroundClick = useCallback(() => {
    if (selectedMuscle) {
      if (internalClearSelection) internalClearSelection();
      if (onMuscleSelectProp) onMuscleSelectProp(null);
    }
  }, [selectedMuscle, internalClearSelection, onMuscleSelectProp]);

  // Handle detail panel close
  const handleDetailClose = useCallback(() => {
    if (internalClearSelection) internalClearSelection();
    if (onMuscleSelectProp) onMuscleSelectProp(null);
  }, [internalClearSelection, onMuscleSelectProp]);

  // Handle related muscle click in detail panel
  const handleRelatedMuscleClick = useCallback((muscleId) => {
    onMuscleSelect(muscleId);
  }, [onMuscleSelect]);

  // Handle manual rotation
  const handleRotateLeft = useCallback(() => {
    rotateBy(0, -30);
  }, [rotateBy]);

  const handleRotateRight = useCallback(() => {
    rotateBy(0, 30);
  }, [rotateBy]);

  // Touch gesture handlers for pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !interactive) return;

    let initialDistance = null;
    let initialZoom = zoom;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches);
        initialZoom = zoom;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && initialDistance) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistance;
        const newZoom = Math.max(
          config.minZoom,
          Math.min(config.maxZoom, initialZoom * scale)
        );
        setZoom(newZoom);
      }
    };

    const handleTouchEnd = () => {
      initialDistance = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [interactive, zoom, setZoom, config.minZoom, config.maxZoom]);

  // Render muscle paths for a view
  const renderMuscles = useCallback((viewToRender) => {
    const muscles = getMusclesForView(viewToRender);

    return muscles.map((muscle) => {
      const paths = getMusclePathsForView(muscle, viewToRender);
      if (!paths.length) return null;

      return (
        <MuscleRegionGroup
          key={muscle.id}
          muscleId={muscle.id}
          paths={paths}
          activation={normalizedActivations[muscle.id] || 0}
          isSelected={selectedMuscle === muscle.id}
          isHovered={hoveredMuscle === muscle.id}
          onClick={handleMuscleClick}
          onHover={handleMuscleHover}
          colorScheme={colorScheme}
          showLabel={showLabels}
        />
      );
    });
  }, [
    normalizedActivations,
    selectedMuscle,
    hoveredMuscle,
    handleMuscleClick,
    handleMuscleHover,
    colorScheme,
    showLabels,
  ]);

  // Render both views side by side
  if (viewProp === 'both') {
    return (
      <div
        className={clsx(
          'flex flex-col lg:flex-row gap-4',
          className
        )}
      >
        {/* Front view */}
        <div className="flex-1">
          <MuscleExplorer
            view="front"
            activations={activations}
            selectedMuscle={selectedMuscle}
            onMuscleSelect={onMuscleSelect}
            interactive={interactive}
            showLabels={showLabels}
            size={size}
            colorScheme={colorScheme}
            showControls={false}
            showLegend={false}
            activationHistory={activationHistory}
            muscleStats={muscleStats}
            personalRecords={personalRecords}
            onFindExercises={onFindExercises}
            onViewHistory={onViewHistory}
            onExerciseClick={onExerciseClick}
          />
        </div>

        {/* Back view */}
        <div className="flex-1">
          <MuscleExplorer
            view="back"
            activations={activations}
            selectedMuscle={selectedMuscle}
            onMuscleSelect={onMuscleSelect}
            interactive={interactive}
            showLabels={showLabels}
            size={size}
            colorScheme={colorScheme}
            showControls={false}
            showLegend={showLegend}
            activationHistory={activationHistory}
            muscleStats={muscleStats}
            personalRecords={personalRecords}
            onFindExercises={onFindExercises}
            onViewHistory={onViewHistory}
            onExerciseClick={onExerciseClick}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative flex flex-col',
        className
      )}
      style={{
        width: sizeConfig.width,
        minHeight: sizeConfig.height,
      }}
    >
      {/* Header with legend */}
      {showLegend && (
        <div className="flex items-center justify-between mb-2 px-2">
          <ActivationLegend colorScheme={colorScheme} />
        </div>
      )}

      {/* Main visualization area */}
      <div
        className={clsx(
          'relative flex-1 flex items-center justify-center',
          'bg-[var(--glass-white-3,rgba(255,255,255,0.03))]',
          'rounded-xl overflow-hidden'
        )}
        onClick={handleBackgroundClick}
      >
        {/* View label */}
        <AnimatePresence mode="wait">
          <ViewLabel view={currentView} motionAllowed={motionAllowed} />
        </AnimatePresence>

        {/* SVG body model */}
        <AnimatePresence mode="wait">
          <motion.svg
            key={currentView}
            viewBox={VIEWBOX}
            className="w-full h-full max-w-full max-h-full"
            style={svgTransform}
            initial={motionAllowed ? { opacity: 0, x: currentView === 'front' ? -30 : 30 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={motionAllowed ? { opacity: 0, x: currentView === 'front' ? 30 : -30 } : undefined}
            transition={{ duration: motionAllowed ? ANIMATION.viewTransition : 0 }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Filter definitions */}
            <defs dangerouslySetInnerHTML={{ __html: GLOW_FILTER_DEF }} />

            {/* Background gradient */}
            <defs>
              <radialGradient id="bodyBgGradient" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="rgba(15, 23, 42, 0.2)" />
                <stop offset="100%" stopColor="rgba(2, 6, 23, 0.4)" />
              </radialGradient>
            </defs>

            {/* Body glow background */}
            <ellipse
              cx="100"
              cy="220"
              rx="85"
              ry="175"
              fill="url(#bodyBgGradient)"
              opacity="0.5"
            />

            {/* Head */}
            <Head />

            {/* Body outline */}
            <BodyOutline view={currentView} />

            {/* Muscle regions */}
            <g className="muscles">
              {renderMuscles(currentView)}
            </g>
          </motion.svg>
        </AnimatePresence>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredMuscle && MUSCLE_DATA[hoveredMuscle] && (
            <HoverTooltip
              muscle={MUSCLE_DATA[hoveredMuscle]}
              activation={normalizedActivations[hoveredMuscle] || 0}
              motionAllowed={motionAllowed}
            />
          )}
        </AnimatePresence>

        {/* Floating controls */}
        {showControls && sizeConfig.controlsPosition === 'floating' && (
          <MuscleControls
            currentView={currentView}
            zoom={zoom}
            isAutoRotating={isAutoRotating}
            onViewChange={setView}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onToggleAutoRotate={toggleAutoRotate}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
            onReset={resetView}
            onMuscleSearch={handleMuscleClick}
            layout="floating"
          />
        )}

        {/* Detail panel */}
        <MuscleDetail
          muscleId={selectedMuscle}
          activationHistory={activationHistory}
          stats={muscleStats[selectedMuscle] || {}}
          personalRecords={personalRecords.filter(pr =>
            MUSCLE_DATA[selectedMuscle]?.exercises.includes(pr.exercise)
          )}
          onClose={handleDetailClose}
          onFindExercises={onFindExercises}
          onViewHistory={onViewHistory}
          onExerciseClick={onExerciseClick}
          onMuscleClick={handleRelatedMuscleClick}
        />
      </div>

      {/* Bottom controls */}
      {showControls && sizeConfig.controlsPosition === 'bottom' && (
        <MuscleControls
          currentView={currentView}
          zoom={zoom}
          isAutoRotating={isAutoRotating}
          onViewChange={setView}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onToggleAutoRotate={toggleAutoRotate}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onReset={resetView}
          onMuscleSearch={handleMuscleClick}
          layout="horizontal"
          className="mt-3"
        />
      )}
    </div>
  );
};

MuscleExplorer.displayName = 'MuscleExplorer';

export default MuscleExplorer;
