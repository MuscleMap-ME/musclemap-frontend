/**
 * Muscle Visualization Store (Zustand)
 *
 * Manages state for 3D muscle model visualization. Uses selector-based
 * subscriptions so camera updates don't re-render muscle intensity displays.
 *
 * @example
 * // Only re-renders when highlighted muscles change
 * const highlighted = useMuscleVisualization((s) => s.highlightedMuscles);
 *
 * // Only re-renders when camera position changes
 * const camera = useMuscleVisualization((s) => s.cameraPosition);
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Muscle groups for the body model
export const MUSCLE_GROUPS = {
  // Upper body - front
  CHEST: 'chest',
  ABS: 'abs',
  OBLIQUES: 'obliques',
  FRONT_DELTS: 'front_delts',

  // Upper body - back
  UPPER_BACK: 'upper_back',
  LATS: 'lats',
  LOWER_BACK: 'lower_back',
  REAR_DELTS: 'rear_delts',
  TRAPS: 'traps',

  // Arms
  BICEPS: 'biceps',
  TRICEPS: 'triceps',
  FOREARMS: 'forearms',
  SIDE_DELTS: 'side_delts',

  // Lower body - front
  QUADS: 'quads',
  HIP_FLEXORS: 'hip_flexors',
  ADDUCTORS: 'adductors',

  // Lower body - back
  GLUTES: 'glutes',
  HAMSTRINGS: 'hamstrings',
  CALVES: 'calves',
};

// Preset camera positions for different views
export const CAMERA_PRESETS = {
  FRONT: { x: 0, y: 0, z: 5, rotation: { x: 0, y: 0, z: 0 } },
  BACK: { x: 0, y: 0, z: -5, rotation: { x: 0, y: Math.PI, z: 0 } },
  LEFT: { x: -5, y: 0, z: 0, rotation: { x: 0, y: -Math.PI / 2, z: 0 } },
  RIGHT: { x: 5, y: 0, z: 0, rotation: { x: 0, y: Math.PI / 2, z: 0 } },
  TOP: { x: 0, y: 5, z: 0, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
  ISOMETRIC: { x: 3, y: 2, z: 4, rotation: { x: -0.3, y: 0.6, z: 0 } },
};

/**
 * Muscle Visualization Store
 * Handles 3D model state and muscle activation visualization
 */
export const useMuscleVisualizationStore = create(
  subscribeWithSelector((set, get) => ({
    // ============================================
    // HIGHLIGHTING
    // ============================================
    highlightedMuscles: [],
    hoverMuscle: null,
    selectedMuscle: null,

    highlightMuscle: (muscleId) =>
      set((s) => ({
        highlightedMuscles: s.highlightedMuscles.includes(muscleId)
          ? s.highlightedMuscles
          : [...s.highlightedMuscles, muscleId],
      })),

    unhighlightMuscle: (muscleId) =>
      set((s) => ({
        highlightedMuscles: s.highlightedMuscles.filter((id) => id !== muscleId),
      })),

    setHighlightedMuscles: (muscleIds) => set({ highlightedMuscles: muscleIds }),

    clearHighlights: () => set({ highlightedMuscles: [] }),

    setHoverMuscle: (muscleId) => set({ hoverMuscle: muscleId }),

    setSelectedMuscle: (muscleId) => set({ selectedMuscle: muscleId }),

    // ============================================
    // INTENSITY HEAT MAP
    // ============================================
    // Values from 0 (no activation) to 1 (max activation)
    muscleIntensity: {},

    setMuscleIntensity: (muscleId, intensity) =>
      set((s) => ({
        muscleIntensity: {
          ...s.muscleIntensity,
          [muscleId]: Math.max(0, Math.min(1, intensity)),
        },
      })),

    setAllIntensities: (intensityMap) => set({ muscleIntensity: intensityMap }),

    clearIntensities: () => set({ muscleIntensity: {} }),

    // Calculate intensity from workout data
    setIntensityFromWorkout: (sets) => {
      const intensity = {};

      // Count volume per muscle group
      sets.forEach((set) => {
        const volume = (set.weight || 0) * (set.reps || 0);
        const muscles = [...(set.primaryMuscles || []), ...(set.secondaryMuscles || [])];

        muscles.forEach((muscle, index) => {
          // Primary muscles get full credit, secondary get half
          const multiplier = index < (set.primaryMuscles?.length || 0) ? 1 : 0.5;
          intensity[muscle] = (intensity[muscle] || 0) + volume * multiplier;
        });
      });

      // Normalize to 0-1 range
      const maxIntensity = Math.max(...Object.values(intensity), 1);
      const normalized = {};
      Object.keys(intensity).forEach((muscle) => {
        normalized[muscle] = intensity[muscle] / maxIntensity;
      });

      set({ muscleIntensity: normalized });
    },

    // ============================================
    // CAMERA CONTROLS
    // ============================================
    cameraPosition: CAMERA_PRESETS.FRONT,
    cameraTarget: { x: 0, y: 0, z: 0 },
    autoRotate: false,
    zoom: 1,

    setCameraPosition: (position) => set({ cameraPosition: position }),

    setCameraPreset: (presetName) => {
      const preset = CAMERA_PRESETS[presetName];
      if (preset) {
        set({ cameraPosition: preset });
      }
    },

    setCameraTarget: (target) => set({ cameraTarget: target }),

    setAutoRotate: (enabled) => set({ autoRotate: enabled }),

    toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),

    setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),

    zoomIn: () => set((s) => ({ zoom: Math.min(3, s.zoom + 0.1) })),

    zoomOut: () => set((s) => ({ zoom: Math.max(0.5, s.zoom - 0.1) })),

    resetCamera: () =>
      set({
        cameraPosition: CAMERA_PRESETS.FRONT,
        cameraTarget: { x: 0, y: 0, z: 0 },
        zoom: 1,
        autoRotate: false,
      }),

    // ============================================
    // DISPLAY OPTIONS
    // ============================================
    showLabels: true,
    showSkeleton: false,
    wireframeMode: false,
    transparencyMode: false,
    colorScheme: 'heatmap', // 'heatmap', 'anatomical', 'custom'

    setShowLabels: (show) => set({ showLabels: show }),
    toggleShowLabels: () => set((s) => ({ showLabels: !s.showLabels })),

    setShowSkeleton: (show) => set({ showSkeleton: show }),
    toggleShowSkeleton: () => set((s) => ({ showSkeleton: !s.showSkeleton })),

    setWireframeMode: (enabled) => set({ wireframeMode: enabled }),
    toggleWireframeMode: () => set((s) => ({ wireframeMode: !s.wireframeMode })),

    setTransparencyMode: (enabled) => set({ transparencyMode: enabled }),
    setColorScheme: (scheme) => set({ colorScheme: scheme }),

    // ============================================
    // ANIMATION
    // ============================================
    animationState: 'idle', // 'idle', 'contracting', 'stretching', 'resting'
    animationProgress: 0,

    setAnimationState: (state) => set({ animationState: state }),
    setAnimationProgress: (progress) => set({ animationProgress: progress }),

    // ============================================
    // COMPUTED HELPERS
    // ============================================
    getMuscleIntensity: (muscleId) => get().muscleIntensity[muscleId] || 0,

    getActiveMuscles: () =>
      Object.entries(get().muscleIntensity)
        .filter(([_, intensity]) => intensity > 0)
        .map(([muscle]) => muscle),

    getMuscleColor: (muscleId) => {
      const intensity = get().muscleIntensity[muscleId] || 0;
      const { colorScheme, highlightedMuscles, hoverMuscle, selectedMuscle } = get();

      // Override colors for interaction states
      if (selectedMuscle === muscleId) {
        return { r: 0.2, g: 0.6, b: 1, a: 1 }; // Bright blue
      }
      if (hoverMuscle === muscleId) {
        return { r: 0.8, g: 0.8, b: 1, a: 0.9 }; // Light blue
      }
      if (highlightedMuscles.includes(muscleId)) {
        return { r: 1, g: 0.8, b: 0.2, a: 0.9 }; // Gold
      }

      // Heatmap color based on intensity
      if (colorScheme === 'heatmap') {
        // Blue (cold) -> Green -> Yellow -> Red (hot)
        if (intensity < 0.25) {
          return { r: 0.2, g: 0.2 + intensity * 2, b: 0.8, a: 0.6 + intensity };
        } else if (intensity < 0.5) {
          const t = (intensity - 0.25) * 4;
          return { r: t, g: 0.7, b: 0.8 - t * 0.8, a: 0.7 + intensity * 0.3 };
        } else if (intensity < 0.75) {
          const t = (intensity - 0.5) * 4;
          return { r: 1, g: 0.7 - t * 0.3, b: 0, a: 0.8 + intensity * 0.2 };
        } else {
          const t = (intensity - 0.75) * 4;
          return { r: 1, g: 0.4 - t * 0.4, b: 0, a: 0.9 + intensity * 0.1 };
        }
      }

      // Default anatomical coloring
      return { r: 0.8, g: 0.3, b: 0.3, a: 0.7 };
    },
  }))
);

/**
 * Shorthand hooks for common visualization operations
 */
export const useMuscleHighlight = () => {
  const highlightedMuscles = useMuscleVisualizationStore((s) => s.highlightedMuscles);
  const highlightMuscle = useMuscleVisualizationStore((s) => s.highlightMuscle);
  const unhighlightMuscle = useMuscleVisualizationStore((s) => s.unhighlightMuscle);
  const clearHighlights = useMuscleVisualizationStore((s) => s.clearHighlights);

  return {
    highlighted: highlightedMuscles,
    highlight: highlightMuscle,
    unhighlight: unhighlightMuscle,
    clear: clearHighlights,
    isHighlighted: (muscleId) => highlightedMuscles.includes(muscleId),
  };
};

export const useMuscleIntensity = () => {
  const muscleIntensity = useMuscleVisualizationStore((s) => s.muscleIntensity);
  const setMuscleIntensity = useMuscleVisualizationStore((s) => s.setMuscleIntensity);
  const setIntensityFromWorkout = useMuscleVisualizationStore((s) => s.setIntensityFromWorkout);
  const clearIntensities = useMuscleVisualizationStore((s) => s.clearIntensities);

  return {
    intensities: muscleIntensity,
    setIntensity: setMuscleIntensity,
    fromWorkout: setIntensityFromWorkout,
    clear: clearIntensities,
    getIntensity: (muscleId) => muscleIntensity[muscleId] || 0,
  };
};

export const useCameraControls = () => {
  const cameraPosition = useMuscleVisualizationStore((s) => s.cameraPosition);
  const autoRotate = useMuscleVisualizationStore((s) => s.autoRotate);
  const zoom = useMuscleVisualizationStore((s) => s.zoom);
  const setCameraPreset = useMuscleVisualizationStore((s) => s.setCameraPreset);
  const toggleAutoRotate = useMuscleVisualizationStore((s) => s.toggleAutoRotate);
  const zoomIn = useMuscleVisualizationStore((s) => s.zoomIn);
  const zoomOut = useMuscleVisualizationStore((s) => s.zoomOut);
  const resetCamera = useMuscleVisualizationStore((s) => s.resetCamera);

  return {
    position: cameraPosition,
    autoRotate,
    zoom,
    setPreset: setCameraPreset,
    toggleAutoRotate,
    zoomIn,
    zoomOut,
    reset: resetCamera,
  };
};

export default useMuscleVisualizationStore;
