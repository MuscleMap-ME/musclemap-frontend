/**
 * Google Analytics 4 Integration for MuscleMap
 *
 * This module provides a clean API for tracking user behavior
 * across the application. All events are sent to GA4.
 */

const GA_MEASUREMENT_ID = 'G-S4RPD5JD5L';

// Check if gtag is available
const isGtagAvailable = () =>
  typeof window !== 'undefined' && typeof window.gtag === 'function';

/**
 * Send a custom event to GA4
 */
export function trackEvent(eventName, params = {}) {
  if (!isGtagAvailable()) {
    console.debug('[Analytics] gtag not available, skipping event:', eventName);
    return;
  }

  try {
    window.gtag('event', eventName, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
}

/**
 * Track page views (for SPA navigation)
 */
export function trackPageView(path, title) {
  if (!isGtagAvailable()) return;

  try {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href,
      send_to: GA_MEASUREMENT_ID,
    });
  } catch (error) {
    console.error('[Analytics] Error tracking page view:', error);
  }
}

/**
 * Set user properties (called after login)
 */
export function setUserProperties(userId, properties = {}) {
  if (!isGtagAvailable()) return;

  try {
    // Set user ID for cross-device tracking
    window.gtag('config', GA_MEASUREMENT_ID, {
      user_id: userId,
    });

    // Set user properties
    window.gtag('set', 'user_properties', {
      user_id: userId,
      ...properties,
    });
  } catch (error) {
    console.error('[Analytics] Error setting user properties:', error);
  }
}

/**
 * Clear user properties (called on logout)
 */
export function clearUserProperties() {
  if (!isGtagAvailable()) return;

  try {
    window.gtag('config', GA_MEASUREMENT_ID, {
      user_id: null,
    });
  } catch (error) {
    console.error('[Analytics] Error clearing user properties:', error);
  }
}

// ============================================
// AUTHENTICATION EVENTS
// ============================================

export function trackSignUp(method = 'email') {
  trackEvent('sign_up', { method });
}

export function trackLogin(method = 'email') {
  trackEvent('login', { method });
}

export function trackLogout() {
  trackEvent('logout');
  clearUserProperties();
}

// ============================================
// ONBOARDING EVENTS
// ============================================

export function trackOnboardingStart() {
  trackEvent('onboarding_start');
}

export function trackOnboardingStep(stepName, stepNumber) {
  trackEvent('onboarding_step', {
    step_name: stepName,
    step_number: stepNumber,
  });
}

export function trackOnboardingComplete() {
  trackEvent('onboarding_complete');
}

export function trackArchetypeSelected(archetypeId, archetypeName) {
  trackEvent('archetype_selected', {
    archetype_id: archetypeId,
    archetype_name: archetypeName,
  });
}

// ============================================
// WORKOUT EVENTS
// ============================================

export function trackWorkoutStart(workoutType) {
  trackEvent('workout_start', {
    workout_type: workoutType,
  });
}

export function trackWorkoutComplete(params = {}) {
  trackEvent('workout_complete', {
    duration_minutes: params.durationMinutes,
    exercise_count: params.exerciseCount,
    total_sets: params.totalSets,
    total_reps: params.totalReps,
    tu_earned: params.tuEarned,
    workout_type: params.workoutType,
  });
}

export function trackExerciseComplete(exerciseId, exerciseName, sets, reps) {
  trackEvent('exercise_complete', {
    exercise_id: exerciseId,
    exercise_name: exerciseName,
    sets,
    reps,
  });
}

// ============================================
// ENGAGEMENT EVENTS
// ============================================

export function trackAchievementUnlocked(achievementId, achievementName) {
  trackEvent('achievement_unlocked', {
    achievement_id: achievementId,
    achievement_name: achievementName,
  });
}

export function trackLevelUp(newLevel, xpEarned) {
  trackEvent('level_up', {
    new_level: newLevel,
    xp_earned: xpEarned,
  });
}

export function trackStreakMilestone(streakDays) {
  trackEvent('streak_milestone', {
    streak_days: streakDays,
  });
}

// ============================================
// SOCIAL EVENTS
// ============================================

export function trackCommunityJoin(communityId, communityName) {
  trackEvent('community_join', {
    community_id: communityId,
    community_name: communityName,
  });
}

export function trackHighFiveSent(recipientId) {
  trackEvent('high_five_sent', {
    recipient_id: recipientId,
  });
}

export function trackRivalryStarted(opponentId) {
  trackEvent('rivalry_started', {
    opponent_id: opponentId,
  });
}

export function trackCrewJoined(crewId, crewName) {
  trackEvent('crew_joined', {
    crew_id: crewId,
    crew_name: crewName,
  });
}

// ============================================
// ECONOMY EVENTS
// ============================================

export function trackCreditsPurchased(amount, packageName) {
  trackEvent('credits_purchased', {
    value: amount,
    currency: 'USD',
    item_name: packageName,
  });
}

export function trackCreditsSpent(amount, itemType, itemId) {
  trackEvent('credits_spent', {
    value: amount,
    item_type: itemType,
    item_id: itemId,
  });
}

// ============================================
// FEATURE USAGE EVENTS
// ============================================

export function trackFeatureUsed(featureName, details = {}) {
  trackEvent('feature_used', {
    feature_name: featureName,
    ...details,
  });
}

export function trackSearch(searchTerm, resultCount, searchType = 'exercises') {
  trackEvent('search', {
    search_term: searchTerm,
    result_count: resultCount,
    search_type: searchType,
  });
}

export function trackMuscleVisualization(muscleIds) {
  trackEvent('muscle_visualization', {
    muscle_count: muscleIds.length,
    muscle_ids: muscleIds.join(','),
  });
}

// ============================================
// ERROR TRACKING
// ============================================

export function trackError(errorType, errorMessage, errorSource) {
  trackEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage?.substring(0, 100),
    error_source: errorSource,
  });
}

// ============================================
// TIMING EVENTS
// ============================================

export function trackTiming(category, variable, timeMs, label) {
  trackEvent('timing_complete', {
    name: variable,
    value: timeMs,
    event_category: category,
    event_label: label,
  });
}

// ============================================
// UTILITY: React Router Integration Hook
// ============================================

/**
 * Hook to track page views on route changes
 * Usage: usePageTracking() in App.jsx
 */
export function usePageTracking() {
  if (typeof window === 'undefined') return;

  // This is called externally when route changes
  return {
    trackPage: (location) => {
      trackPageView(location.pathname, document.title);
    },
  };
}

// Default export for convenience
export default {
  trackEvent,
  trackPageView,
  setUserProperties,
  clearUserProperties,
  trackSignUp,
  trackLogin,
  trackLogout,
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingComplete,
  trackArchetypeSelected,
  trackWorkoutStart,
  trackWorkoutComplete,
  trackExerciseComplete,
  trackAchievementUnlocked,
  trackLevelUp,
  trackStreakMilestone,
  trackCommunityJoin,
  trackHighFiveSent,
  trackRivalryStarted,
  trackCrewJoined,
  trackCreditsPurchased,
  trackCreditsSpent,
  trackFeatureUsed,
  trackSearch,
  trackMuscleVisualization,
  trackError,
  trackTiming,
};
