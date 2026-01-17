/**
 * MapMenu Store
 *
 * Zustand store for MapMenu state management.
 * Handles view state, selection, filtering, and quality settings.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MapMenuState, MapViewType, MapMode, QualityLevel } from '../components/map-menu/types';

// Default state values
const DEFAULT_STATE = {
  currentView: 'constellation' as MapViewType,
  mode: 'full' as MapMode,
  isLoading: false,
  isExpanded: false,
  activeNodeId: null,
  hoveredNodeId: null,
  selectedCategory: null,
  searchQuery: '',
  qualityLevel: 'medium' as QualityLevel,
  fps: 60,
  showOnboarding: true,
  showLegend: true,
  showSearch: false,
};

export const useMapMenuStore = create<MapMenuState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_STATE,

      // View actions
      setView: (view) => set({ currentView: view }),
      setMode: (mode) => set({ mode }),
      setLoading: (isLoading) => set({ isLoading }),
      setExpanded: (isExpanded) => set({ isExpanded }),

      // Selection actions
      setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
      setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
      setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Quality actions
      setQualityLevel: (level) => set({ qualityLevel: level }),
      setFPS: (fps) => set({ fps }),

      // UI actions
      dismissOnboarding: () => set({ showOnboarding: false }),
      toggleLegend: () => set((state) => ({ showLegend: !state.showLegend })),
      toggleSearch: () => set((state) => ({ showSearch: !state.showSearch })),

      // Reset
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'musclemap-map-menu',
      partialize: (state) => ({
        // Only persist user preferences, not transient state
        currentView: state.currentView,
        qualityLevel: state.qualityLevel,
        showOnboarding: state.showOnboarding,
        showLegend: state.showLegend,
      }),
    }
  )
);

// ============================================
// SELECTOR HOOKS
// ============================================

/**
 * Get current view settings
 */
export const useMapView = () =>
  useMapMenuStore((state) => ({
    view: state.currentView,
    mode: state.mode,
    isLoading: state.isLoading,
    setView: state.setView,
    setMode: state.setMode,
  }));

/**
 * Get selection state
 */
export const useMapSelection = () =>
  useMapMenuStore((state) => ({
    activeNodeId: state.activeNodeId,
    hoveredNodeId: state.hoveredNodeId,
    selectedCategory: state.selectedCategory,
    searchQuery: state.searchQuery,
    setActiveNode: state.setActiveNode,
    setHoveredNode: state.setHoveredNode,
    setSelectedCategory: state.setSelectedCategory,
    setSearchQuery: state.setSearchQuery,
  }));

/**
 * Get quality settings
 */
export const useMapQuality = () =>
  useMapMenuStore((state) => ({
    qualityLevel: state.qualityLevel,
    fps: state.fps,
    setQualityLevel: state.setQualityLevel,
    setFPS: state.setFPS,
  }));

/**
 * Get UI preferences
 */
export const useMapUI = () =>
  useMapMenuStore((state) => ({
    showOnboarding: state.showOnboarding,
    showLegend: state.showLegend,
    showSearch: state.showSearch,
    dismissOnboarding: state.dismissOnboarding,
    toggleLegend: state.toggleLegend,
    toggleSearch: state.toggleSearch,
  }));

/**
 * Check if onboarding should be shown
 */
export const useShowOnboarding = () =>
  useMapMenuStore((state) => state.showOnboarding);

/**
 * Get and set the current view
 */
export const useCurrentView = () =>
  useMapMenuStore((state) => ({
    view: state.currentView,
    setView: state.setView,
  }));

export default useMapMenuStore;
