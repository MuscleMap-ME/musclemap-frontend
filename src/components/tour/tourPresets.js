/**
 * Tour Presets - Predefined tour configurations for MuscleMap
 *
 * This file contains all the predefined tour definitions that can be used
 * throughout the app for guided onboarding and feature discovery.
 *
 * @example
 * import { TOUR_PRESETS } from './tourPresets';
 *
 * <SpotlightTour preset="onboarding" isOpen={isNewUser} />
 *
 * // Or with the hook
 * const { startTour } = useTour();
 * startTour(TOUR_PRESETS.onboarding.steps, { tourId: 'onboarding' });
 */

/**
 * Onboarding Tour
 *
 * First-time user tour covering the main dashboard elements.
 * Should be shown on first login to familiarize users with the app.
 */
export const onboardingTour = {
  id: 'onboarding',
  name: 'Welcome Tour',
  description: 'Introduction to MuscleMap for new users',
  steps: [
    {
      target: '[data-tour="welcome"], .welcome-message, h1.dashboard-title',
      title: 'Welcome to MuscleMap!',
      body: "Let me show you around. This quick tour will help you get started on your fitness journey.",
      position: 'bottom',
    },
    {
      target: '[data-tour="muscle-map"], .muscle-visualization, .body-muscle-map, #muscle-model',
      title: 'Your Muscle Map',
      body: "This 3D visualization shows which muscles you've trained. The brighter the color, the more recently you worked that muscle.",
      position: 'right',
    },
    {
      target: '[data-tour="start-workout"], .start-workout-btn, [href="/workout"], button[data-action="start-workout"]',
      title: 'Quick Start Workout',
      body: 'Tap here to begin a new workout. Choose from templates or create your own custom routine.',
      position: 'bottom',
    },
    {
      target: '[data-tour="stats-card"], .stats-overview, .character-stats, .stats-summary',
      title: 'Track Your Progress',
      body: 'Watch your stats grow as you train. Your strength, endurance, and other attributes level up with each workout.',
      position: 'left',
    },
    {
      target: '[data-tour="profile"], .profile-menu, [href="/profile"], .user-avatar',
      title: 'Your Profile',
      body: 'View your stats, achievements, and customize your character. This is your fitness identity.',
      position: 'left',
    },
    {
      target: '[data-tour="settings"], .settings-btn, [href="/settings"], [aria-label="Settings"]',
      title: 'Settings',
      body: 'Customize your experience here. Set preferences, connect devices, and manage notifications.',
      position: 'left',
    },
  ],
};

/**
 * Workout Intro Tour
 *
 * How to log a workout - shown on first workout screen visit.
 */
export const workoutIntroTour = {
  id: 'workout-intro',
  name: 'Workout Guide',
  description: 'Learn how to log your first workout',
  steps: [
    {
      target: '[data-tour="exercise-search"], .exercise-search, input[placeholder*="Search"], input[name="exercise-search"]',
      title: 'Find Exercises',
      body: 'Search for any exercise by name, muscle group, or equipment. We have hundreds of exercises to choose from.',
      position: 'bottom',
    },
    {
      target: '[data-tour="add-exercise"], .add-exercise-btn, [aria-label*="add exercise"], button[data-action="add-exercise"]',
      title: 'Add to Workout',
      body: 'Tap to add an exercise to your workout. You can add as many exercises as you want.',
      position: 'bottom',
    },
    {
      target: '[data-tour="set-logger"], .set-logger, .set-input, [data-component="set-row"]',
      title: 'Log Your Sets',
      body: "Enter the weight and reps for each set. Swipe left to delete a set, or tap the + to add more.",
      position: 'top',
    },
    {
      target: '[data-tour="rest-timer"], .rest-timer, .timer-control, [data-component="rest-timer"]',
      title: 'Rest Timer',
      body: "The rest timer starts automatically between sets. Adjust the time or skip it if you're ready to go.",
      position: 'left',
    },
    {
      target: '[data-tour="muscle-preview"], .muscle-preview, .exercise-muscles, [data-component="muscle-indicator"]',
      title: 'Muscle Activation',
      body: 'See which muscles each exercise targets. Primary muscles are highlighted in blue, secondary in purple.',
      position: 'right',
    },
    {
      target: '[data-tour="finish-workout"], .finish-workout, button[type="submit"], [data-action="finish-workout"]',
      title: 'Finish Workout',
      body: "When you're done, tap Finish to save your workout. You'll see a summary of what you accomplished.",
      position: 'top',
    },
  ],
};

/**
 * Community Intro Tour
 *
 * Introduction to social features and community interactions.
 */
export const communityIntroTour = {
  id: 'community-intro',
  name: 'Community Guide',
  description: 'Discover social features',
  steps: [
    {
      target: '[data-tour="activity-feed"], .activity-feed, [href="/community"], [data-component="feed"]',
      title: 'Activity Feed',
      body: 'See what your friends and the community are up to. Celebrate their achievements with high fives!',
      position: 'right',
    },
    {
      target: '[data-tour="high-five"], .high-five-btn, [aria-label*="high five"], button[data-action="high-five"]',
      title: 'Send High Fives',
      body: 'Tap to send encouragement! High fives boost motivation and earn you both credits.',
      position: 'bottom',
      action: {
        label: 'Try it!',
        onClick: null, // Will be bound at runtime
      },
    },
    {
      target: '[data-tour="leaderboard"], .leaderboard, [href="/leaderboard"], [data-component="leaderboard"]',
      title: 'Leaderboards',
      body: 'Compete with others on various leaderboards. Filter by friends, your archetype, or go global.',
      position: 'left',
    },
    {
      target: '[data-tour="crews"], .crews-section, [href="/crews"], [data-component="crews"]',
      title: 'Join a Crew',
      body: 'Teams that train together, gain together. Join a crew to participate in group challenges.',
      position: 'bottom',
    },
    {
      target: '[data-tour="challenges"], .challenges, [href="/challenges"], [data-component="challenges"]',
      title: 'Challenges',
      body: 'Take on solo or group challenges. Complete them to earn badges, credits, and bragging rights.',
      position: 'top',
    },
  ],
};

/**
 * Economy Intro Tour
 *
 * Explains the credit system and how to earn/spend.
 */
export const economyIntroTour = {
  id: 'economy-intro',
  name: 'Credits Guide',
  description: 'Learn about the MuscleMap economy',
  steps: [
    {
      target: '[data-tour="credit-balance"], .credit-balance, .credits-widget, [data-component="credit-display"]',
      title: 'Your Credit Balance',
      body: "Credits are MuscleMap's currency. You earn them by training and helping the community.",
      position: 'bottom',
    },
    {
      target: '[data-tour="earn-credits"], .earn-section, [href="/credits/earn"], [data-action="view-earning"]',
      title: 'Ways to Earn',
      body: 'Complete workouts, hit milestones, send high fives, and participate in challenges to earn credits.',
      position: 'right',
    },
    {
      target: '[data-tour="spend-credits"], .spend-section, [href="/credits/store"], [data-action="open-store"]',
      title: 'Premium Features',
      body: 'Use credits to unlock premium workout programs, custom themes, and exclusive badges.',
      position: 'left',
    },
    {
      target: '[data-tour="bonus-events"], .bonus-events, [data-component="bonus-banner"]',
      title: 'Bonus Events',
      body: 'Keep an eye out for special events that offer double credits, rare rewards, and limited-time challenges.',
      position: 'bottom',
    },
  ],
};

/**
 * Dashboard Tour
 *
 * Introduces main dashboard elements to new users.
 */
export const dashboardTour = {
  id: 'dashboard',
  name: 'Dashboard Tour',
  description: 'Learn about your dashboard',
  steps: [
    {
      target: '[data-tour="muscle-map"], .muscle-visualization, .body-muscle-map',
      title: 'Your Muscle Map',
      body: "This 3D visualization shows which muscles you've trained. The brighter the color, the more recently you worked that muscle.",
      position: 'right',
    },
    {
      target: '[data-tour="start-workout"], .start-workout-btn, [href="/workout"]',
      title: 'Quick Start',
      body: 'Tap here to begin a new workout. Choose from templates or create your own custom routine.',
      position: 'bottom',
    },
    {
      target: '[data-tour="stats-card"], .stats-overview, .character-stats',
      title: 'Track Your Progress',
      body: 'Watch your stats grow as you train. Your strength, endurance, and other attributes level up with each workout.',
      position: 'left',
    },
    {
      target: '[data-tour="achievements"], .achievements-section, [href="/achievements"]',
      title: 'Earn Achievements',
      body: 'Complete challenges and milestones to unlock achievements. Each one earns you credits and XP.',
      position: 'bottom',
    },
    {
      target: '[data-tour="credits"], .credit-balance, .credits-display',
      title: 'Your Credits',
      body: 'Earn credits by working out, completing challenges, and helping others. Use them to unlock premium features.',
      position: 'left',
    },
  ],
};

/**
 * Archetype Tour
 *
 * Explains the archetype system and character progression.
 */
export const archetypeTour = {
  id: 'archetype',
  name: 'Archetype Guide',
  description: 'Understand the archetype system',
  steps: [
    {
      target: '[data-tour="archetype-select"], .archetype-selector, .archetype-grid',
      title: 'Choose Your Path',
      body: 'Select an archetype that matches your fitness goals. Each one has unique bonuses and progression tracks.',
      position: 'bottom',
    },
    {
      target: '[data-tour="archetype-stats"], .archetype-stats, .stat-bonuses',
      title: 'Archetype Bonuses',
      body: 'Your archetype provides stat bonuses and unlocks special abilities as you level up.',
      position: 'right',
    },
    {
      target: '[data-tour="progression"], .progression-path, .journey-progress',
      title: 'Your Journey',
      body: "Follow your archetype's progression path to unlock new titles, abilities, and rewards.",
      position: 'left',
    },
  ],
};

/**
 * All tour presets keyed by ID
 */
export const TOUR_PRESETS = {
  onboarding: onboardingTour,
  'workout-intro': workoutIntroTour,
  'community-intro': communityIntroTour,
  'economy-intro': economyIntroTour,
  dashboard: dashboardTour,
  archetype: archetypeTour,
};

/**
 * Get tour preset by ID
 *
 * @param {string} presetId - The tour preset ID
 * @returns {Object|null} The tour preset or null if not found
 */
export function getTourPreset(presetId) {
  return TOUR_PRESETS[presetId] || null;
}

/**
 * Get all available tour IDs
 *
 * @returns {string[]} Array of tour preset IDs
 */
export function getTourPresetIds() {
  return Object.keys(TOUR_PRESETS);
}

/**
 * Create a custom feature spotlight tour
 *
 * Utility to quickly create a single-step tour for highlighting a new feature.
 *
 * @param {string} target - CSS selector for the feature element
 * @param {string} title - Feature title
 * @param {string} body - Feature description
 * @param {Object} options - Additional options
 * @param {string} options.position - Tooltip position
 * @param {Object} options.action - Optional action button
 * @returns {Object} Tour configuration
 *
 * @example
 * const newFeatureTour = createFeatureSpotlight(
 *   '.new-button',
 *   'New Feature!',
 *   'Check out this awesome new feature.',
 *   { position: 'right' }
 * );
 */
export function createFeatureSpotlight(target, title, body, options = {}) {
  const { position = 'auto', action = null, id = `feature-${Date.now()}` } = options;

  return {
    id,
    name: title,
    description: body,
    steps: [
      {
        target,
        title,
        body,
        position,
        action,
      },
    ],
  };
}

/**
 * Tour builder utility
 *
 * Fluent API for constructing custom tours.
 *
 * @example
 * const customTour = tourBuilder('my-custom-tour')
 *   .setName('My Custom Tour')
 *   .addStep('.element1', 'Step 1', 'Description 1')
 *   .addStep('.element2', 'Step 2', 'Description 2', { position: 'left' })
 *   .build();
 */
export function tourBuilder(id) {
  const tour = {
    id,
    name: '',
    description: '',
    steps: [],
  };

  return {
    setName(name) {
      tour.name = name;
      return this;
    },

    setDescription(description) {
      tour.description = description;
      return this;
    },

    addStep(target, title, body, options = {}) {
      const { position = 'auto', action = null, beforeShow = null, afterHide = null } = options;

      tour.steps.push({
        target,
        title,
        body,
        position,
        action,
        beforeShow,
        afterHide,
      });

      return this;
    },

    build() {
      return { ...tour };
    },
  };
}

// ============================================
// LEGACY EXPORTS (for backwards compatibility)
// ============================================
// These export the step arrays directly for code that expects
// the old tour format (array of steps) rather than preset objects

/**
 * Legacy export: workoutTour steps array
 */
export const workoutTour = workoutIntroTour.steps;

/**
 * Legacy export: communityTour steps array
 */
export const communityTour = communityIntroTour.steps;

/**
 * Legacy export: creditsTour steps array
 */
export const creditsTour = economyIntroTour.steps;

/**
 * Legacy: createFeatureTour (returns array instead of preset object)
 */
export function createFeatureTour(target, title, body, placement = 'auto') {
  return [{ target, title, body, placement }];
}

export default TOUR_PRESETS;
