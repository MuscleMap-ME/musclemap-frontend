/**
 * Tour Components Index
 *
 * Spotlight tour system for guided onboarding in MuscleMap.
 *
 * USAGE PATTERNS:
 * ===============
 *
 * 1. Declarative (in JSX):
 * ```jsx
 * <SpotlightTour
 *   steps={dashboardTour}
 *   tourId="dashboard-intro"
 *   onComplete={() => console.log('Done!')}
 *   showProgress
 * />
 * ```
 *
 * 2. Using presets:
 * ```jsx
 * <SpotlightTour preset="onboarding" isOpen={isNewUser} onComplete={markOnboarded} />
 * ```
 *
 * 3. Programmatic (via hook):
 * ```jsx
 * const { startTour, isActive, skipTour, hasCompletedTour } = useTour();
 *
 * // Start a tour
 * startTour(dashboardTour, { tourId: 'dashboard-intro' });
 *
 * // Or with shorthand
 * startTour(dashboardTour, 'dashboard-intro');
 *
 * // Check completion
 * if (!hasCompletedTour('onboarding')) {
 *   startTour(TOUR_PRESETS.onboarding.steps, 'onboarding');
 * }
 * ```
 *
 * 4. Auto-start on mount:
 * ```jsx
 * useTourAutoStart(onboardingTour, 'onboarding', { delay: 1000 });
 * ```
 *
 * SETUP:
 * ======
 * Add SpotlightTourRenderer to your app root for global tour rendering:
 *
 * ```jsx
 * // In App.jsx
 * import { SpotlightTourRenderer } from '@/components/tour';
 *
 * function App() {
 *   return (
 *     <>
 *       <Routes />
 *       <SpotlightTourRenderer />
 *     </>
 *   );
 * }
 * ```
 *
 * STEP CONFIGURATION:
 * ===================
 * Each step can have the following properties:
 * ```js
 * {
 *   target: string,              // CSS selector for the target element
 *   title: string,               // Step title
 *   body: string | ReactNode,    // Step description
 *   position: 'top' | 'bottom' | 'left' | 'right' | 'auto',
 *   action: {                    // Optional action button
 *     label: string,
 *     onClick: function
 *   },
 *   beforeShow: function,        // Called before step is shown
 *   afterHide: function,         // Called after step is hidden
 *   content: ReactNode,          // Optional custom content
 * }
 * ```
 */

// Main tour component
export { default as SpotlightTour, SpotlightTourRenderer, Spotlight } from './SpotlightTour';

// Tour step component
export { default as TourStep, TourStepSkeleton } from './TourStep';

// Tour hook
export {
  useTour,
  useTourAutoStart,
  useTourStep,
  useTourStore,
} from './useTour';

// Tour presets
export {
  TOUR_PRESETS,
  onboardingTour,
  workoutIntroTour,
  communityIntroTour,
  economyIntroTour,
  dashboardTour,
  archetypeTour,
  getTourPreset,
  getTourPresetIds,
  createFeatureSpotlight,
  tourBuilder,
} from './tourPresets';

// ============================================
// LEGACY EXPORTS (for backwards compatibility)
// ============================================
// Note: These are re-exported from tourPresets.js
// For new code, import directly from tourPresets.js

// Legacy tour exports (simple array format)
// These are provided for backwards compatibility with code that expects
// the tour steps as plain arrays rather than the new preset object format

export { workoutTour, communityTour, creditsTour, createFeatureTour } from './tourPresets';

/**
 * workoutTour - How to log a workout (legacy alias for workoutIntroTour)
 * communityTour - Social features guide (legacy alias for communityIntroTour)
 * creditsTour - Economy guide (legacy alias for economyIntroTour)
 */
