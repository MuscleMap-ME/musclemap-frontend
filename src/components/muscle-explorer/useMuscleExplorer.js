/**
 * useMuscleExplorer - State management hook for the 3D Muscle Explorer
 *
 * Manages selection, rotation, zoom, and view state for the muscle model.
 *
 * @example
 * const {
 *   selectedMuscle,
 *   setSelectedMuscle,
 *   hoveredMuscle,
 *   setHoveredMuscle,
 *   view,
 *   setView,
 *   getMuscleActivation,
 *   getMuscleStats
 * } = useMuscleExplorer(activations);
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MUSCLE_DATA } from './muscleData';

/**
 * Default configuration for the explorer
 */
const DEFAULT_CONFIG = {
  initialView: 'front',
  initialZoom: 1,
  initialRotation: { x: 0, y: 0 },
  minZoom: 0.5,
  maxZoom: 2.5,
  rotationSpeed: 0.5,
  autoRotateSpeed: 0.3,
};

/**
 * View presets for the body model
 */
export const VIEW_PRESETS = {
  front: { rotationY: 0, label: 'Front' },
  back: { rotationY: 180, label: 'Back' },
  left: { rotationY: -90, label: 'Left Side' },
  right: { rotationY: 90, label: 'Right Side' },
};

/**
 * useMuscleExplorer - Main hook for managing muscle explorer state
 *
 * @param {Object} options - Configuration options
 * @param {string} options.initialView - Starting view ('front' | 'back' | 'left' | 'right')
 * @param {number} options.initialZoom - Starting zoom level (0.5 - 2.5)
 * @param {Function} options.onMuscleSelect - Callback when muscle is selected
 *
 * @returns {Object} State and control functions
 *
 * @example
 * const {
 *   selectedMuscle,
 *   selectMuscle,
 *   clearSelection,
 *   rotation,
 *   setRotation,
 *   zoom,
 *   setZoom,
 *   resetView,
 *   toggleView,
 *   currentView,
 *   isAutoRotating,
 *   startAutoRotate,
 *   stopAutoRotate,
 * } = useMuscleExplorer();
 */
export function useMuscleExplorer(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  // ============================================
  // STATE
  // ============================================

  // Selected muscle
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  // Current view
  const [currentView, setCurrentView] = useState(config.initialView);

  // Rotation state (degrees)
  const [rotation, setRotationState] = useState({
    x: config.initialRotation.x,
    y: VIEW_PRESETS[config.initialView]?.rotationY || 0,
  });

  // Zoom state
  const [zoom, setZoomState] = useState(config.initialZoom);

  // Auto-rotation
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const autoRotateRef = useRef(null);

  // ============================================
  // MUSCLE SELECTION
  // ============================================

  /**
   * Select a muscle by ID
   */
  const selectMuscle = useCallback(
    (muscleId) => {
      setSelectedMuscle(muscleId);
      if (options.onMuscleSelect) {
        options.onMuscleSelect(muscleId);
      }
    },
    [options]
  );

  /**
   * Clear the current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedMuscle(null);
    if (options.onMuscleSelect) {
      options.onMuscleSelect(null);
    }
  }, [options]);

  // ============================================
  // ROTATION CONTROLS
  // ============================================

  /**
   * Set rotation with bounds checking
   */
  const setRotation = useCallback((newRotation) => {
    setRotationState((prev) => {
      const next =
        typeof newRotation === 'function' ? newRotation(prev) : newRotation;

      return {
        x: Math.max(-45, Math.min(45, next.x)), // Limit vertical tilt
        y: next.y % 360, // Wrap horizontal rotation
      };
    });
  }, []);

  /**
   * Rotate by delta values
   */
  const rotateBy = useCallback(
    (deltaX, deltaY) => {
      setRotation((prev) => ({
        x: prev.x + deltaX * config.rotationSpeed,
        y: prev.y + deltaY * config.rotationSpeed,
      }));
    },
    [setRotation, config.rotationSpeed]
  );

  // ============================================
  // ZOOM CONTROLS
  // ============================================

  /**
   * Set zoom with bounds checking
   */
  const setZoom = useCallback(
    (newZoom) => {
      setZoomState((prev) => {
        const next = typeof newZoom === 'function' ? newZoom(prev) : newZoom;
        return Math.max(config.minZoom, Math.min(config.maxZoom, next));
      });
    },
    [config.minZoom, config.maxZoom]
  );

  /**
   * Zoom in by a step
   */
  const zoomIn = useCallback(() => {
    setZoom((z) => z + 0.2);
  }, [setZoom]);

  /**
   * Zoom out by a step
   */
  const zoomOut = useCallback(() => {
    setZoom((z) => z - 0.2);
  }, [setZoom]);

  // ============================================
  // VIEW CONTROLS
  // ============================================

  /**
   * Set a specific view preset
   */
  const setView = useCallback((view) => {
    const preset = VIEW_PRESETS[view];
    if (preset) {
      setCurrentView(view);
      setRotationState((prev) => ({
        x: prev.x,
        y: preset.rotationY,
      }));
    }
  }, []);

  /**
   * Toggle between front and back views
   */
  const toggleView = useCallback(() => {
    setCurrentView((prev) => {
      const nextView = prev === 'front' ? 'back' : 'front';
      setRotationState((rot) => ({
        x: rot.x,
        y: VIEW_PRESETS[nextView].rotationY,
      }));
      return nextView;
    });
  }, []);

  /**
   * Cycle through all views
   */
  const cycleView = useCallback(() => {
    const views = Object.keys(VIEW_PRESETS);
    setCurrentView((prev) => {
      const currentIndex = views.indexOf(prev);
      const nextIndex = (currentIndex + 1) % views.length;
      const nextView = views[nextIndex];
      setRotationState((rot) => ({
        x: rot.x,
        y: VIEW_PRESETS[nextView].rotationY,
      }));
      return nextView;
    });
  }, []);

  /**
   * Reset to initial view and zoom
   */
  const resetView = useCallback(() => {
    setCurrentView(config.initialView);
    setRotationState({
      x: config.initialRotation.x,
      y: VIEW_PRESETS[config.initialView]?.rotationY || 0,
    });
    setZoomState(config.initialZoom);
    setIsAutoRotating(false);
  }, [config.initialView, config.initialRotation, config.initialZoom]);

  // ============================================
  // AUTO-ROTATION
  // ============================================

  /**
   * Start auto-rotation animation
   */
  const startAutoRotate = useCallback(() => {
    setIsAutoRotating(true);
  }, []);

  /**
   * Stop auto-rotation animation
   */
  const stopAutoRotate = useCallback(() => {
    setIsAutoRotating(false);
    if (autoRotateRef.current) {
      cancelAnimationFrame(autoRotateRef.current);
      autoRotateRef.current = null;
    }
  }, []);

  /**
   * Toggle auto-rotation
   */
  const toggleAutoRotate = useCallback(() => {
    if (isAutoRotating) {
      stopAutoRotate();
    } else {
      startAutoRotate();
    }
  }, [isAutoRotating, startAutoRotate, stopAutoRotate]);

  // Auto-rotation animation loop
  useEffect(() => {
    if (!isAutoRotating) return;

    let lastTime = performance.now();

    const animate = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      setRotationState((prev) => ({
        x: prev.x,
        y: (prev.y + config.autoRotateSpeed * (deltaTime / 16)) % 360,
      }));

      autoRotateRef.current = requestAnimationFrame(animate);
    };

    autoRotateRef.current = requestAnimationFrame(animate);

    return () => {
      if (autoRotateRef.current) {
        cancelAnimationFrame(autoRotateRef.current);
      }
    };
  }, [isAutoRotating, config.autoRotateSpeed]);

  // ============================================
  // HOVERED MUSCLE STATE
  // ============================================

  const [hoveredMuscle, setHoveredMuscle] = useState(null);

  // ============================================
  // HELPER FUNCTIONS FOR ACTIVATIONS
  // ============================================

  /**
   * Get activation level for a specific muscle
   * @param {string} muscleId - The muscle identifier
   * @returns {number} Activation level 0-100
   */
  const getMuscleActivation = useCallback((muscleId) => {
    if (!options.activations) return 0;
    const value = options.activations[muscleId];
    if (value === undefined) return 0;
    // Normalize to 0-100
    return value <= 1 && value > 0 ? value * 100 : value;
  }, [options.activations]);

  /**
   * Get stats for a specific muscle
   * @param {string} muscleId - The muscle identifier
   * @returns {Object} Muscle stats object
   */
  const getMuscleStats = useCallback((muscleId) => {
    const muscle = MUSCLE_DATA[muscleId];
    if (!muscle) return null;

    const activation = getMuscleActivation(muscleId);

    return {
      id: muscleId,
      name: muscle.commonName,
      scientificName: muscle.name,
      activation,
      group: muscle.group,
      exercises: muscle.exercises,
      color: muscle.color,
      glowColor: muscle.glowColor,
    };
  }, [getMuscleActivation]);

  // ============================================
  // RETURN VALUE
  // ============================================

  return {
    // Selection
    selectedMuscle,
    setSelectedMuscle: selectMuscle,
    selectMuscle,
    clearSelection,

    // Hovered
    hoveredMuscle,
    setHoveredMuscle,

    // Rotation
    rotation,
    setRotation,
    rotateBy,

    // Zoom
    zoom,
    setZoom,
    zoomIn,
    zoomOut,

    // View - alias for compatibility
    view: currentView,
    currentView,
    setView,
    toggleView,
    cycleView,
    resetView,

    // Auto-rotation
    isAutoRotating,
    startAutoRotate,
    stopAutoRotate,
    toggleAutoRotate,

    // Helper functions
    getMuscleActivation,
    getMuscleStats,

    // Config
    viewPresets: VIEW_PRESETS,
    config,
  };
}

export default useMuscleExplorer;
