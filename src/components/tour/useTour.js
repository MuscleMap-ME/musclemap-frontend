/**
 * useTour Hook - Programmatic control for spotlight tours
 *
 * Provides a global tour state management system that can be used
 * to start, navigate, and control tours from anywhere in the app.
 *
 * Features:
 * - Start tours programmatically
 * - Navigate between steps
 * - Skip/end tours early
 * - Track completion state in localStorage
 * - Multiple concurrent tour support
 *
 * @example
 * // Start a tour
 * const { startTour, isActive, currentStep } = useTour();
 * startTour(dashboardTour);
 *
 * // Check if a specific tour is complete
 * const { isTourComplete } = useTour();
 * if (!isTourComplete('onboarding')) {
 *   startTour(onboardingTour, 'onboarding');
 * }
 */

import { create } from 'zustand';
import { useCallback, useEffect } from 'react';

/**
 * localStorage key prefix for tour completion states
 */
const STORAGE_PREFIX = 'musclemap_tour_';

/**
 * Zustand store for global tour state
 */
const useTourStore = create((set, get) => ({
  // Current tour state
  isActive: false,
  steps: [],
  currentStep: 0,
  tourId: null,

  // Callbacks
  onComplete: null,
  onSkip: null,
  onStepChange: null,

  // Configuration
  config: {
    showProgress: true,
    showSkip: true,
    backdropColor: 'rgba(0, 0, 0, 0.75)',
    allowBackdropClick: true,
    scrollBehavior: 'smooth',
    spotlightPadding: 8,
  },

  // Actions
  startTour: (steps, options = {}) => {
    const {
      tourId = null,
      onComplete = null,
      onSkip = null,
      onStepChange = null,
      showProgress = true,
      showSkip = true,
      backdropColor = 'rgba(0, 0, 0, 0.75)',
      allowBackdropClick = true,
      scrollBehavior = 'smooth',
      spotlightPadding = 8,
    } = options;

    // Check if tour already completed and should only show once
    if (tourId) {
      const isComplete = localStorage.getItem(`${STORAGE_PREFIX}${tourId}`) === 'true';
      if (isComplete && !options.force) {
        return false;
      }
    }

    set({
      isActive: true,
      steps,
      currentStep: 0,
      tourId,
      onComplete,
      onSkip,
      onStepChange,
      config: {
        showProgress,
        showSkip,
        backdropColor,
        allowBackdropClick,
        scrollBehavior,
        spotlightPadding,
      },
    });

    return true;
  },

  nextStep: () => {
    const { currentStep, steps, tourId, onComplete, onStepChange } = get();

    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1;
      set({ currentStep: newStep });
      onStepChange?.(newStep, steps[newStep]);
    } else {
      // Tour complete
      if (tourId) {
        localStorage.setItem(`${STORAGE_PREFIX}${tourId}`, 'true');
      }
      set({ isActive: false, steps: [], currentStep: 0, tourId: null });
      onComplete?.();
    }
  },

  prevStep: () => {
    const { currentStep, steps, onStepChange } = get();

    if (currentStep > 0) {
      const newStep = currentStep - 1;
      set({ currentStep: newStep });
      onStepChange?.(newStep, steps[newStep]);
    }
  },

  goToStep: (index) => {
    const { steps, onStepChange } = get();

    if (index >= 0 && index < steps.length) {
      set({ currentStep: index });
      onStepChange?.(index, steps[index]);
    }
  },

  skipTour: () => {
    const { tourId, onSkip } = get();

    if (tourId) {
      localStorage.setItem(`${STORAGE_PREFIX}${tourId}`, 'true');
    }
    set({ isActive: false, steps: [], currentStep: 0, tourId: null });
    onSkip?.();
  },

  endTour: () => {
    set({ isActive: false, steps: [], currentStep: 0, tourId: null });
  },

  resetTour: (tourId) => {
    if (tourId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${tourId}`);
    }
  },

  isTourComplete: (tourId) => {
    return localStorage.getItem(`${STORAGE_PREFIX}${tourId}`) === 'true';
  },
}));

/**
 * useTour Hook
 *
 * Main hook for controlling spotlight tours programmatically.
 *
 * @returns {Object} Tour control functions and state
 */
export function useTour() {
  const store = useTourStore();

  // Memoized action creators
  const startTour = useCallback(
    (steps, optionsOrTourId) => {
      const options =
        typeof optionsOrTourId === 'string'
          ? { tourId: optionsOrTourId }
          : optionsOrTourId || {};
      return store.startTour(steps, options);
    },
    [store]
  );

  const nextStep = useCallback(() => store.nextStep(), [store]);
  const prevStep = useCallback(() => store.prevStep(), [store]);
  const goToStep = useCallback((index) => store.goToStep(index), [store]);
  const skipTour = useCallback(() => store.skipTour(), [store]);
  const endTour = useCallback(() => store.endTour(), [store]);
  const resetTour = useCallback((tourId) => store.resetTour(tourId), [store]);
  const isTourComplete = useCallback(
    (tourId) => store.isTourComplete(tourId),
    [store]
  );

  return {
    // State
    isActive: store.isActive,
    steps: store.steps,
    currentStep: store.currentStep,
    tourId: store.tourId,
    config: store.config,

    // Computed
    totalSteps: store.steps.length,
    currentStepData: store.steps[store.currentStep] || null,
    isFirstStep: store.currentStep === 0,
    isLastStep: store.currentStep === store.steps.length - 1,
    progress: store.steps.length > 0
      ? ((store.currentStep + 1) / store.steps.length) * 100
      : 0,

    // Actions
    startTour,
    nextStep,
    prevStep,
    goToStep,
    skipTour,
    endTour,
    resetTour,
    isTourComplete,
    hasCompletedTour: isTourComplete, // Alias for API consistency
  };
}

/**
 * useTourAutoStart Hook
 *
 * Automatically starts a tour on mount if it hasn't been completed.
 *
 * @param {Array} steps - Tour steps
 * @param {string} tourId - Unique tour identifier
 * @param {Object} options - Tour options
 *
 * @example
 * useTourAutoStart(dashboardTour, 'dashboard-intro', {
 *   delay: 1000,
 *   onComplete: () => console.log('Tour complete!')
 * });
 */
export function useTourAutoStart(steps, tourId, options = {}) {
  const { startTour, isTourComplete } = useTour();
  const { delay = 500, ...tourOptions } = options;

  useEffect(() => {
    if (!isTourComplete(tourId) && steps.length > 0) {
      const timer = setTimeout(() => {
        startTour(steps, { tourId, ...tourOptions });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [steps, tourId, delay, startTour, isTourComplete, tourOptions]);
}

/**
 * useTourStep Hook
 *
 * Hook to register an element as a potential tour target.
 * Returns a ref that should be attached to the target element.
 *
 * @param {string} stepId - Unique step identifier
 * @returns {Object} Ref object for the target element
 */
export function useTourStep(stepId) {
  // This is a simple ref hook that can be extended to
  // automatically register elements with the tour system
  return useCallback((node) => {
    if (node && stepId) {
      node.setAttribute('data-tour-step', stepId);
    }
  }, [stepId]);
}

// Export store for direct access if needed
export { useTourStore };

export default useTour;
