/**
 * Smart Entry Method Suggestion
 *
 * Analyzes user behavior and context to suggest the best input method
 * for logging workouts:
 * - Quick Pick: For users who do the same exercises frequently
 * - Voice: For hands-free logging during workouts
 * - Text: For detailed/custom entries
 * - Screenshot: For importing from other apps
 * - Health Sync: For Apple Health / Google Fit users
 */

import detectPlatform, { type PlatformInfo } from './platformDetector';

// Helper to check OS type from PlatformInfo
const isIOS = (p: PlatformInfo) => p.os === 'ios';
const isAndroid = (p: PlatformInfo) => p.os === 'android';
const isDesktop = (p: PlatformInfo) => !p.isMobile && !p.isTablet;

// ============================================
// TYPES
// ============================================

export type EntryMethod = 'quick' | 'voice' | 'text' | 'screenshot' | 'health' | 'file';

export interface EntryMethodScore {
  method: EntryMethod;
  score: number; // 0-100
  reasons: string[];
}

export interface SuggestionResult {
  recommended: EntryMethod;
  scores: EntryMethodScore[];
  context: string;
}

export interface UserBehavior {
  // Usage history
  recentMethods: EntryMethod[];
  totalEntriesByMethod: Record<EntryMethod, number>;
  lastEntryMethod?: EntryMethod;
  lastEntryTime?: Date;

  // Exercise patterns
  frequentExercises: Array<{ id: string; name: string; count: number }>;
  hasRecurringWorkout: boolean;

  // Platform capabilities
  hasMicrophone: boolean;
  hasCamera: boolean;
  hasHealthKit: boolean;
  hasGoogleFit: boolean;

  // Context
  isInWorkout: boolean;
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night';
  dayOfWeek: number; // 0-6
}

// ============================================
// SCORING WEIGHTS
// ============================================

// Scoring weights for different factors (reserved for future use)
const _WEIGHTS = {
  // Usage history
  recentUsage: 15,
  totalUsage: 10,
  successRate: 10,

  // Context
  workoutContext: 20,
  platformCapability: 15,
  timeContext: 5,

  // Efficiency
  expectedSpeed: 15,
  errorRate: 10,
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score Quick Pick method
 */
function scoreQuickPick(behavior: UserBehavior, platform: PlatformInfo): EntryMethodScore {
  const reasons: string[] = [];
  let score = 50; // Base score

  // Boost if user has frequent exercises
  if (behavior.frequentExercises.length >= 5) {
    score += 20;
    reasons.push('You have a consistent exercise routine');
  }

  // Boost if recurring workout pattern
  if (behavior.hasRecurringWorkout) {
    score += 15;
    reasons.push('Your recent workouts match a pattern');
  }

  // Boost if used recently with success
  if (behavior.lastEntryMethod === 'quick') {
    score += 10;
    reasons.push('You used Quick Pick last time');
  }

  // Boost on mobile (touch-friendly)
  if (platform.isMobile || platform.isTablet) {
    score += 5;
    reasons.push('Quick Pick works great on mobile');
  }

  return { method: 'quick', score: Math.min(100, score), reasons };
}

/**
 * Score Voice method
 */
function scoreVoice(behavior: UserBehavior, platform: PlatformInfo): EntryMethodScore {
  const reasons: string[] = [];
  let score = 40; // Base score

  // Require microphone
  if (!behavior.hasMicrophone) {
    return { method: 'voice', score: 0, reasons: ['Microphone not available'] };
  }

  // Boost if in workout (hands-free is valuable)
  if (behavior.isInWorkout) {
    score += 30;
    reasons.push('Voice is great during workouts (hands-free)');
  }

  // Boost on mobile (more likely to have good mic)
  if (platform.isMobile) {
    score += 10;
    reasons.push('Mobile devices have great microphones');
  }

  // Boost if used successfully before
  const voiceCount = behavior.totalEntriesByMethod.voice || 0;
  if (voiceCount > 5) {
    score += 15;
    reasons.push('You\'ve used voice input successfully');
  }

  // Slight penalty on desktop (typing might be faster)
  if (isDesktop(platform) && !behavior.isInWorkout) {
    score -= 10;
  }

  return { method: 'voice', score: Math.min(100, Math.max(0, score)), reasons };
}

/**
 * Score Text method
 */
function scoreText(behavior: UserBehavior, platform: PlatformInfo): EntryMethodScore {
  const reasons: string[] = [];
  let score = 45; // Base score

  // Boost on desktop (keyboard)
  if (isDesktop(platform)) {
    score += 20;
    reasons.push('Desktop keyboards are great for text entry');
  }

  // Boost if user prefers text
  const textCount = behavior.totalEntriesByMethod.text || 0;
  const totalEntries = Object.values(behavior.totalEntriesByMethod).reduce((a, b) => a + b, 0);
  if (totalEntries > 0 && textCount / totalEntries > 0.5) {
    score += 15;
    reasons.push('You prefer text-based entry');
  }

  // Good for detailed/custom entries
  if (behavior.frequentExercises.length < 3) {
    score += 10;
    reasons.push('Text is flexible for varied exercises');
  }

  return { method: 'text', score: Math.min(100, score), reasons };
}

/**
 * Score Screenshot method
 */
function scoreScreenshot(behavior: UserBehavior, platform: PlatformInfo): EntryMethodScore {
  const reasons: string[] = [];
  let score = 30; // Base score (specialty use case)

  // Require camera
  if (!behavior.hasCamera) {
    return { method: 'screenshot', score: 5, reasons: ['Camera not available'] };
  }

  // Boost if used recently
  if (behavior.lastEntryMethod === 'screenshot') {
    score += 20;
    reasons.push('You recently imported a screenshot');
  }

  // Good for migrating from other apps
  const screenshotCount = behavior.totalEntriesByMethod.screenshot || 0;
  if (screenshotCount > 3) {
    score += 15;
    reasons.push('You\'ve used screenshot import before');
  }

  // Better on mobile (can take photos directly)
  if (platform.isMobile) {
    score += 10;
    reasons.push('Easy to capture gym screenshots');
  }

  return { method: 'screenshot', score: Math.min(100, score), reasons };
}

/**
 * Score Health Sync method
 */
function scoreHealthSync(behavior: UserBehavior, platform: PlatformInfo): EntryMethodScore {
  const reasons: string[] = [];
  let score = 25; // Base score

  // Check platform support
  const hasHealth = behavior.hasHealthKit || behavior.hasGoogleFit;
  if (!hasHealth) {
    return { method: 'health', score: 0, reasons: ['Health platform not connected'] };
  }

  // Boost on iOS with HealthKit
  if (isIOS(platform) && behavior.hasHealthKit) {
    score += 30;
    reasons.push('Apple Health integration available');
  }

  // Boost on Android with Google Fit
  if (isAndroid(platform) && behavior.hasGoogleFit) {
    score += 30;
    reasons.push('Google Fit integration available');
  }

  // Boost if used successfully
  const healthCount = behavior.totalEntriesByMethod.health || 0;
  if (healthCount > 5) {
    score += 20;
    reasons.push('You\'ve synced from health apps before');
  }

  return { method: 'health', score: Math.min(100, score), reasons };
}

/**
 * Score File Import method
 */
function scoreFileImport(behavior: UserBehavior, platform: PlatformInfo): EntryMethodScore {
  const reasons: string[] = [];
  let score = 20; // Base score (specialty use case)

  // Better on desktop (easier file management)
  if (isDesktop(platform)) {
    score += 15;
    reasons.push('File import is easier on desktop');
  }

  // Boost if used before
  const fileCount = behavior.totalEntriesByMethod.file || 0;
  if (fileCount > 0) {
    score += 20;
    reasons.push('You\'ve imported files before');
  }

  return { method: 'file', score: Math.min(100, score), reasons };
}

// ============================================
// MAIN SUGGESTION FUNCTION
// ============================================

/**
 * Get smart suggestion for entry method based on user behavior and context
 */
export function suggestEntryMethod(behavior: UserBehavior): SuggestionResult {
  const platform = detectPlatform();

  // Score all methods
  const scores: EntryMethodScore[] = [
    scoreQuickPick(behavior, platform),
    scoreVoice(behavior, platform),
    scoreText(behavior, platform),
    scoreScreenshot(behavior, platform),
    scoreHealthSync(behavior, platform),
    scoreFileImport(behavior, platform),
  ];

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Get context description
  let context = '';
  if (behavior.isInWorkout) {
    context = 'during your workout';
  } else if (behavior.timeOfDay === 'morning') {
    context = 'to plan your workout';
  } else if (behavior.timeOfDay === 'evening') {
    context = 'to log your day';
  }

  return {
    recommended: scores[0].method,
    scores,
    context,
  };
}

/**
 * Get default behavior for new users
 */
export function getDefaultBehavior(): UserBehavior {
  const now = new Date();
  const hour = now.getHours();

  return {
    recentMethods: [],
    totalEntriesByMethod: {
      quick: 0,
      voice: 0,
      text: 0,
      screenshot: 0,
      health: 0,
      file: 0,
    },
    frequentExercises: [],
    hasRecurringWorkout: false,
    hasMicrophone: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
    hasCamera: typeof navigator !== 'undefined' && 'mediaDevices' in navigator,
    hasHealthKit: false,
    hasGoogleFit: false,
    isInWorkout: false,
    timeOfDay: hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'midday' : 'evening',
    dayOfWeek: now.getDay(),
  };
}

/**
 * Create behavior object from user history
 */
export function createBehaviorFromHistory(
  history: {
    entryMethod: EntryMethod;
    timestamp: Date;
    exercises: Array<{ id: string; name: string }>;
  }[]
): Partial<UserBehavior> {
  // Count methods
  const totalEntriesByMethod: Record<EntryMethod, number> = {
    quick: 0,
    voice: 0,
    text: 0,
    screenshot: 0,
    health: 0,
    file: 0,
  };

  const recentMethods: EntryMethod[] = [];
  const exerciseCounts = new Map<string, { id: string; name: string; count: number }>();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const entry of history) {
    totalEntriesByMethod[entry.entryMethod]++;

    // Track recent methods
    if (entry.timestamp >= sevenDaysAgo) {
      recentMethods.push(entry.entryMethod);
    }

    // Track exercise frequency
    for (const exercise of entry.exercises) {
      const existing = exerciseCounts.get(exercise.id);
      if (existing) {
        existing.count++;
      } else {
        exerciseCounts.set(exercise.id, { id: exercise.id, name: exercise.name, count: 1 });
      }
    }
  }

  // Get top exercises
  const frequentExercises = Array.from(exerciseCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Check for recurring pattern (same exercises on same day of week)
  const hasRecurringWorkout = frequentExercises.length >= 3 && history.length >= 4;

  return {
    recentMethods: recentMethods.slice(-5),
    totalEntriesByMethod,
    lastEntryMethod: history[0]?.entryMethod,
    lastEntryTime: history[0]?.timestamp,
    frequentExercises,
    hasRecurringWorkout,
  };
}

export default {
  suggestEntryMethod,
  getDefaultBehavior,
  createBehaviorFromHistory,
};
