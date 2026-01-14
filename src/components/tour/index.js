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
 * 2. Programmatic (via hook):
 * ```jsx
 * const { startTour, isActive, skipTour } = useTour();
 *
 * // Start a tour
 * startTour(dashboardTour, { tourId: 'dashboard-intro' });
 *
 * // Or with shorthand
 * startTour(dashboardTour, 'dashboard-intro');
 * ```
 *
 * 3. Auto-start on mount:
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

// ============================================
// PREDEFINED TOURS
// ============================================

/**
 * Dashboard Tour
 *
 * Introduces main dashboard elements to new users.
 * Should be shown on first login.
 */
export const dashboardTour = [
  {
    target: '[data-tour="muscle-map"], .muscle-visualization, .body-muscle-map',
    title: 'Your Muscle Map',
    body: 'This 3D visualization shows which muscles you\'ve trained. The brighter the color, the more recently you worked that muscle.',
    placement: 'right',
  },
  {
    target: '[data-tour="start-workout"], .start-workout-btn, [href="/workout"]',
    title: 'Quick Start',
    body: 'Tap here to begin a new workout. Choose from templates or create your own custom routine.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="stats-card"], .stats-overview, .character-stats',
    title: 'Track Your Progress',
    body: 'Watch your stats grow as you train. Your strength, endurance, and other attributes level up with each workout.',
    placement: 'left',
  },
  {
    target: '[data-tour="achievements"], .achievements-section, [href="/achievements"]',
    title: 'Earn Achievements',
    body: 'Complete challenges and milestones to unlock achievements. Each one earns you credits and XP.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="credits"], .credit-balance, .credits-display',
    title: 'Your Credits',
    body: 'Earn credits by working out, completing challenges, and helping others. Use them to unlock premium features.',
    placement: 'left',
  },
];

/**
 * Workout Tour
 *
 * Shows how to log a workout and use the workout interface.
 */
export const workoutTour = [
  {
    target: '[data-tour="exercise-search"], .exercise-search, input[placeholder*="exercise"]',
    title: 'Find Exercises',
    body: 'Search for any exercise by name, muscle group, or equipment. We have hundreds of exercises to choose from.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-exercise"], .add-exercise-btn, [aria-label*="add exercise"]',
    title: 'Add to Workout',
    body: 'Tap to add an exercise to your workout. You can add as many exercises as you want.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="set-logger"], .set-logger, .set-input',
    title: 'Log Your Sets',
    body: 'Enter the weight and reps for each set. Swipe left to delete a set, or tap the + to add more.',
    placement: 'top',
  },
  {
    target: '[data-tour="rest-timer"], .rest-timer, .timer-control',
    title: 'Rest Timer',
    body: 'The rest timer starts automatically between sets. Adjust the time or skip it if you\'re ready to go.',
    placement: 'left',
  },
  {
    target: '[data-tour="muscle-preview"], .muscle-preview, .exercise-muscles',
    title: 'Muscle Activation',
    body: 'See which muscles each exercise targets. Primary muscles are highlighted in blue, secondary in purple.',
    placement: 'right',
  },
  {
    target: '[data-tour="finish-workout"], .finish-workout, button[type="submit"]',
    title: 'Finish Workout',
    body: 'When you\'re done, tap Finish to save your workout. You\'ll see a summary of what you accomplished.',
    placement: 'top',
  },
];

/**
 * Community Tour
 *
 * Introduces social features and community interactions.
 */
export const communityTour = [
  {
    target: '[data-tour="activity-feed"], .activity-feed, [href="/community"]',
    title: 'Activity Feed',
    body: 'See what your friends and the community are up to. Celebrate their achievements with high fives!',
    placement: 'right',
  },
  {
    target: '[data-tour="high-five"], .high-five-btn, [aria-label*="high five"]',
    title: 'Send High Fives',
    body: 'Tap to send encouragement! High fives boost motivation and earn you both credits.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="leaderboard"], .leaderboard, [href="/leaderboard"]',
    title: 'Leaderboards',
    body: 'Compete with others on various leaderboards. Filter by friends, your archetype, or go global.',
    placement: 'left',
  },
  {
    target: '[data-tour="crews"], .crews-section, [href="/crews"]',
    title: 'Join a Crew',
    body: 'Teams that train together, gain together. Join a crew to participate in group challenges and competitions.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="challenges"], .challenges, [href="/challenges"]',
    title: 'Challenges',
    body: 'Take on solo or group challenges. Complete them to earn badges, credits, and bragging rights.',
    placement: 'top',
  },
];

/**
 * Archetype Tour
 *
 * Explains the archetype system and character progression.
 */
export const archetypeTour = [
  {
    target: '[data-tour="archetype-select"], .archetype-selector, .archetype-grid',
    title: 'Choose Your Path',
    body: 'Select an archetype that matches your fitness goals. Each one has unique bonuses and progression tracks.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="archetype-stats"], .archetype-stats, .stat-bonuses',
    title: 'Archetype Bonuses',
    body: 'Your archetype provides stat bonuses and unlocks special abilities as you level up.',
    placement: 'right',
  },
  {
    target: '[data-tour="progression"], .progression-path, .journey-progress',
    title: 'Your Journey',
    body: 'Follow your archetype\'s progression path to unlock new titles, abilities, and rewards.',
    placement: 'left',
  },
];

/**
 * Credits/Economy Tour
 *
 * Explains the credit system and how to earn/spend.
 */
export const creditsTour = [
  {
    target: '[data-tour="credit-balance"], .credit-balance, .credits-widget',
    title: 'Your Credit Balance',
    body: 'Credits are MuscleMap\'s currency. You earn them by training and helping the community.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="earn-credits"], .earn-section, [href="/credits/earn"]',
    title: 'Ways to Earn',
    body: 'Complete workouts, hit milestones, send high fives, and participate in challenges to earn credits.',
    placement: 'right',
  },
  {
    target: '[data-tour="spend-credits"], .spend-section, [href="/credits/store"]',
    title: 'Premium Features',
    body: 'Use credits to unlock premium workout programs, custom themes, and exclusive badges.',
    placement: 'left',
  },
];

/**
 * Onboarding Tour
 *
 * Complete new user onboarding flow. Combines elements from other tours.
 */
export const onboardingTour = [
  {
    target: '[data-tour="welcome"], .welcome-message, h1',
    title: 'Welcome to MuscleMap!',
    body: 'Let me show you around. This quick tour will help you get started on your fitness journey.',
    placement: 'bottom',
  },
  ...dashboardTour.slice(0, 3),
  {
    target: '[data-tour="profile"], .profile-menu, [href="/profile"]',
    title: 'Your Profile',
    body: 'View your stats, achievements, and customize your character. This is your fitness identity.',
    placement: 'left',
  },
  {
    target: '[data-tour="settings"], .settings-btn, [href="/settings"]',
    title: 'Settings',
    body: 'Customize your experience here. Set your preferences, connect devices, and manage notifications.',
    placement: 'left',
  },
];

/**
 * Feature Discovery Tour Factory
 *
 * Creates a tour for highlighting a single new feature.
 *
 * @param {string} target - CSS selector for the feature element
 * @param {string} title - Feature title
 * @param {string} body - Feature description
 * @param {string} placement - Tooltip placement
 * @returns {Array} Tour steps array
 */
export function createFeatureTour(target, title, body, placement = 'auto') {
  return [
    {
      target,
      title,
      body,
      placement,
    },
  ];
}

/**
 * Tour builder utility
 *
 * Helps construct custom tours with proper structure.
 *
 * @example
 * const myTour = tourBuilder()
 *   .addStep('.element1', 'Step 1', 'Description 1')
 *   .addStep('.element2', 'Step 2', 'Description 2', 'left')
 *   .build();
 */
export function tourBuilder() {
  const steps = [];

  return {
    addStep(target, title, body, placement = 'auto') {
      steps.push({ target, title, body, placement });
      return this;
    },
    build() {
      return [...steps];
    },
  };
}
