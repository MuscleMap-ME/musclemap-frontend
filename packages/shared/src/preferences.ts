/**
 * User Preferences Types
 *
 * Comprehensive type definitions for the MuscleMap user customization system.
 * These types are shared between the API and frontend.
 */

// ============================================
// GUIDANCE LEVELS
// ============================================
export type GuidanceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const GUIDANCE_LEVELS: Record<GuidanceLevel, { label: string; description: string }> = {
  beginner: {
    label: 'Beginner',
    description: 'Full guidance with all tips, detailed explanations, and step-by-step instructions',
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Occasional tips and moderate detail for experienced users',
  },
  advanced: {
    label: 'Advanced',
    description: 'Minimal guidance with only essential information',
  },
  expert: {
    label: 'Expert',
    description: 'No guidance, data-focused view for power users',
  },
};

// ============================================
// SOUND TYPES
// ============================================
export type TimerSoundType = 'beep' | 'chime' | 'bell' | 'custom';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type TextSize = 'small' | 'normal' | 'large' | 'xlarge';
export type DashboardLayout = 'default' | 'compact' | 'detailed' | 'custom';
export type WeightUnit = 'lbs' | 'kg';
export type DistanceUnit = 'mi' | 'km';
export type MusicProvider = 'spotify' | 'apple_music' | 'youtube_music';
export type Platform = 'web' | 'ios' | 'android' | 'watchos';
export type HydrationSource = 'manual' | 'quick_log' | 'reminder' | 'wearable';

// ============================================
// COACHING PREFERENCES
// ============================================
export interface CoachingPreferences {
  /** Show Max the strength coach character */
  maxCoachVisible: boolean;
  /** Show companion mascot character */
  mascotVisible: boolean;
  /** Show coaching tips during workouts */
  coachTipsEnabled: boolean;
  /** Show motivational quotes */
  motivationalQuotes: boolean;
  /** Show exercise form cues */
  formCuesEnabled: boolean;
  /** Enable voice guidance (future feature) */
  voiceGuidanceEnabled: boolean;
}

// ============================================
// DASHBOARD PREFERENCES
// ============================================
export interface DashboardPreferences {
  /** Layout style */
  layout: DashboardLayout;
  /** Show quick action buttons */
  showQuickActions: boolean;
  /** Show daily training tip */
  showDailyTip: boolean;
  /** Show milestone progress */
  showMilestones: boolean;
  /** Show adventure map widget */
  showAdventureMap: boolean;
  /** Show muscle activation map */
  showMuscleMap: boolean;
  /** Show nutrition tracking card */
  showNutrition: boolean;
  /** Show daily challenges */
  showChallenges: boolean;
  /** Show AI insights */
  showInsights: boolean;
  /** Show recent activity feed */
  showActivity: boolean;
  /** Show hydration tracker */
  showHydration: boolean;
  /** Show music player */
  showMusicPlayer: boolean;
  /** Show coach tips widget */
  showCoachTips: boolean;
  /** Show XP progress bar */
  showXpProgress: boolean;
  /** Show daily quests */
  showDailyQuests: boolean;
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================
export interface NotificationPreferences {
  /** Enable achievement notifications */
  achievementsEnabled: boolean;
  /** Enable goal success notifications */
  goalSuccessEnabled: boolean;
  /** Enable workout reminders */
  workoutReminders: boolean;
  /** Enable social notifications (follows, high fives, etc.) */
  socialNotifications: boolean;
  /** Enable system announcements */
  systemAnnouncements: boolean;
  /** Enable quiet hours */
  quietHoursEnabled: boolean;
  /** Quiet hours start time (HH:mm format) */
  quietHoursStart: string;
  /** Quiet hours end time (HH:mm format) */
  quietHoursEnd: string;
  /** Enable push notifications */
  pushEnabled: boolean;
  /** Enable email notifications */
  emailEnabled: boolean;
}

// ============================================
// HYDRATION PREFERENCES
// ============================================
export interface HydrationPreferences {
  /** Enable hydration reminders */
  enabled: boolean;
  /** Reminder interval in minutes */
  intervalMinutes: number;
  /** Play sound with reminder */
  soundEnabled: boolean;
  /** Vibrate with reminder */
  vibrationEnabled: boolean;
  /** Show reminders during workout only */
  showDuringWorkout: boolean;
  /** Show reminders outside of workout */
  showOutsideWorkout: boolean;
  /** Daily water goal in ounces */
  dailyGoalOz: number;
}

// ============================================
// SOUND PREFERENCES
// ============================================
export interface SoundPreferences {
  /** Master volume (0-1) */
  masterVolume: number;
  /** Enable timer sounds */
  timerSoundEnabled: boolean;
  /** Timer sound type */
  timerSoundType: TimerSoundType;
  /** Enable timer vibration */
  timerVibrationEnabled: boolean;
  /** Enable metronome */
  metronomeEnabled: boolean;
  /** Metronome BPM */
  metronomeBpm: number;
  /** Metronome accent (every N beats) */
  metronomeAccent: number;
  /** Enable rep count sounds */
  repCountSoundEnabled: boolean;
  /** Enable set complete sound */
  setCompleteSoundEnabled: boolean;
  /** Enable workout complete sound */
  workoutCompleteSoundEnabled: boolean;
  /** Enable achievement sound */
  achievementSoundEnabled: boolean;
  /** Custom sound pack ID (null = system default) */
  customSoundPackId: string | null;
  /** System sound pack ID */
  systemSoundPackId: string;
}

// ============================================
// WORKOUT PREFERENCES
// ============================================
export interface WorkoutPreferences {
  /** Default rest timer duration in seconds */
  defaultRestSeconds: number;
  /** Auto-start rest timer after logging set */
  autoStartTimer: boolean;
  /** Show floating timer during workout */
  showFloatingTimer: boolean;
  /** Countdown warning threshold in seconds */
  countdownWarningSeconds: number;
  /** Show warmup reminder before workout */
  warmupReminder: boolean;
  /** Show cooldown reminder after workout */
  cooldownReminder: boolean;
  /** Show stretch reminder */
  stretchReminder: boolean;
  /** Quick adjust amount for timer (+/- seconds) */
  quickAdjustAmount: number;
}

// ============================================
// DISPLAY PREFERENCES
// ============================================
export interface DisplayPreferences {
  /** Theme ID */
  theme: string;
  /** Reduce motion/animations */
  reducedMotion: boolean;
  /** High contrast mode */
  highContrast: boolean;
  /** Text size */
  textSize: TextSize;
  /** Color blind mode */
  colorBlindMode: ColorBlindMode;
  /** Show animations */
  animationsEnabled: boolean;
}

// ============================================
// UNITS PREFERENCES
// ============================================
export interface UnitsPreferences {
  /** Weight unit */
  weight: WeightUnit;
  /** Distance unit */
  distance: DistanceUnit;
  /** Height format */
  height: 'ft_in' | 'cm';
  /** Temperature unit */
  temperature: 'f' | 'c';
}

// ============================================
// PRIVACY PREFERENCES
// ============================================
export interface PrivacyPreferences {
  /** Public profile */
  publicProfile: boolean;
  /** Show location */
  showLocation: boolean;
  /** Show progress/TU */
  showProgress: boolean;
  /** Show workout details */
  showWorkoutDetails: boolean;
  /** Appear on leaderboards */
  showOnLeaderboards: boolean;
  /** Show achievements on profile */
  showAchievementsOnProfile: boolean;
}

// ============================================
// MUSIC PREFERENCES
// ============================================
export interface MusicPreferences {
  /** Auto-play music when starting workout */
  autoPlayOnWorkout: boolean;
  /** Enable BPM matching for cardio */
  bpmMatchingEnabled: boolean;
  /** Default music provider */
  defaultProvider: MusicProvider | null;
  /** Default playlist ID */
  defaultPlaylistId: string | null;
  /** Fade music during rest periods */
  fadeOnRest: boolean;
  /** Reduce volume when coach tips play */
  volumeReductionOnTips: boolean;
  /** Volume reduction percentage */
  tipVolumeReduction: number;
}

// ============================================
// FULL USER PREFERENCES
// ============================================
export interface UserPreferences {
  coaching: CoachingPreferences;
  guidanceLevel: GuidanceLevel;
  dashboard: DashboardPreferences;
  notifications: NotificationPreferences;
  hydration: HydrationPreferences;
  sounds: SoundPreferences;
  workout: WorkoutPreferences;
  display: DisplayPreferences;
  units: UnitsPreferences;
  privacy: PrivacyPreferences;
  music: MusicPreferences;
}

// ============================================
// DEFAULT PREFERENCES
// ============================================
export const DEFAULT_PREFERENCES: UserPreferences = {
  coaching: {
    maxCoachVisible: true,
    mascotVisible: true,
    coachTipsEnabled: true,
    motivationalQuotes: true,
    formCuesEnabled: true,
    voiceGuidanceEnabled: false,
  },
  guidanceLevel: 'intermediate',
  dashboard: {
    layout: 'default',
    showQuickActions: true,
    showDailyTip: true,
    showMilestones: true,
    showAdventureMap: true,
    showMuscleMap: true,
    showNutrition: true,
    showChallenges: true,
    showInsights: true,
    showActivity: true,
    showHydration: true,
    showMusicPlayer: true,
    showCoachTips: true,
    showXpProgress: true,
    showDailyQuests: true,
  },
  notifications: {
    achievementsEnabled: true,
    goalSuccessEnabled: true,
    workoutReminders: true,
    socialNotifications: true,
    systemAnnouncements: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    pushEnabled: true,
    emailEnabled: true,
  },
  hydration: {
    enabled: true, // Default ON per requirements
    intervalMinutes: 15,
    soundEnabled: true,
    vibrationEnabled: true,
    showDuringWorkout: true,
    showOutsideWorkout: false,
    dailyGoalOz: 64,
  },
  sounds: {
    masterVolume: 0.7,
    timerSoundEnabled: true,
    timerSoundType: 'beep',
    timerVibrationEnabled: true,
    metronomeEnabled: false,
    metronomeBpm: 60,
    metronomeAccent: 4,
    repCountSoundEnabled: false,
    setCompleteSoundEnabled: true,
    workoutCompleteSoundEnabled: true,
    achievementSoundEnabled: true,
    customSoundPackId: null,
    systemSoundPackId: 'default',
  },
  workout: {
    defaultRestSeconds: 90,
    autoStartTimer: true,
    showFloatingTimer: true,
    countdownWarningSeconds: 10,
    warmupReminder: true,
    cooldownReminder: true,
    stretchReminder: false,
    quickAdjustAmount: 30,
  },
  display: {
    theme: 'dark',
    reducedMotion: false,
    highContrast: false,
    textSize: 'normal',
    colorBlindMode: 'none',
    animationsEnabled: true,
  },
  units: {
    weight: 'lbs',
    distance: 'mi',
    height: 'ft_in',
    temperature: 'f',
  },
  privacy: {
    publicProfile: true,
    showLocation: false,
    showProgress: true,
    showWorkoutDetails: true,
    showOnLeaderboards: true,
    showAchievementsOnProfile: true,
  },
  music: {
    autoPlayOnWorkout: true,
    bpmMatchingEnabled: false,
    defaultProvider: null,
    defaultPlaylistId: null,
    fadeOnRest: true,
    volumeReductionOnTips: true,
    tipVolumeReduction: 0.5,
  },
};

// ============================================
// PREFERENCE PROFILE
// ============================================
export interface PreferenceProfile {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  preferencesOverride: Partial<UserPreferences>;
  autoActivateRules?: {
    timeStart?: string;
    timeEnd?: string;
    dayOfWeek?: number[];
    location?: string;
  };
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DASHBOARD WIDGET
// ============================================
export interface DashboardWidget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  settings: Record<string, unknown>;
}

export interface DashboardLayoutConfig {
  id: string;
  userId: string;
  profileId?: string;
  widgets: DashboardWidget[];
  columns: number;
  rowHeight: number;
  platform: Platform;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// WIDGET REGISTRY
// ============================================
export interface WidgetDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'core' | 'visualization' | 'gamification' | 'health' | 'social' | 'media';
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  isPremium: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

// ============================================
// MUSIC CONNECTION
// ============================================
export interface MusicConnection {
  id: string;
  userId: string;
  provider: MusicProvider;
  providerUserId?: string;
  providerDisplayName?: string;
  defaultPlaylistId?: string;
  defaultPlaylistName?: string;
  autoPlayOnWorkout: boolean;
  bpmMatchingEnabled: boolean;
  connectedAt: string;
  lastUsedAt?: string;
}

// ============================================
// SOUND PACK
// ============================================
export interface SoundPack {
  id: string;
  name: string;
  description?: string;
  category?: string;
  sounds: {
    timer_complete?: string;
    timer_warning?: string;
    rep_count?: string;
    set_complete?: string;
    workout_complete?: string;
    achievement?: string;
    metronome_tick?: string;
    metronome_accent?: string;
    hydration_reminder?: string;
  };
  isPremium: boolean;
  isPublic: boolean;
  userId?: string; // null for system packs
}

// ============================================
// DEVICE SETTINGS
// ============================================
export interface DeviceSettings {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  platform: Platform;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  settingsOverride: Partial<UserPreferences>;
  syncEnabled: boolean;
  lastSyncAt?: string;
  pushToken?: string;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// HYDRATION LOG
// ============================================
export interface HydrationLog {
  id: string;
  userId: string;
  amountOz: number;
  workoutSessionId?: string;
  source: HydrationSource;
  loggedAt: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================
export interface GetPreferencesResponse {
  preferences: UserPreferences;
  activeProfileId?: string;
  version: number;
}

export interface UpdatePreferencesRequest {
  preferences: Partial<UserPreferences>;
}

export interface CreateProfileRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  preferencesOverride?: Partial<UserPreferences>;
  isDefault?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  preferencesOverride?: Partial<UserPreferences>;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface SaveDashboardLayoutRequest {
  widgets: DashboardWidget[];
  columns?: number;
  rowHeight?: number;
  profileId?: string;
}

export interface ConnectMusicRequest {
  provider: MusicProvider;
  redirectUri: string;
}

export interface LogHydrationRequest {
  amountOz: number;
  workoutSessionId?: string;
  source?: HydrationSource;
}

export interface RegisterDeviceRequest {
  deviceId: string;
  deviceName?: string;
  platform: Platform;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Deep merge preferences with defaults
 */
export function mergeWithDefaults(partial: Partial<UserPreferences>): UserPreferences {
  return {
    coaching: { ...DEFAULT_PREFERENCES.coaching, ...partial.coaching },
    guidanceLevel: partial.guidanceLevel ?? DEFAULT_PREFERENCES.guidanceLevel,
    dashboard: { ...DEFAULT_PREFERENCES.dashboard, ...partial.dashboard },
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...partial.notifications },
    hydration: { ...DEFAULT_PREFERENCES.hydration, ...partial.hydration },
    sounds: { ...DEFAULT_PREFERENCES.sounds, ...partial.sounds },
    workout: { ...DEFAULT_PREFERENCES.workout, ...partial.workout },
    display: { ...DEFAULT_PREFERENCES.display, ...partial.display },
    units: { ...DEFAULT_PREFERENCES.units, ...partial.units },
    privacy: { ...DEFAULT_PREFERENCES.privacy, ...partial.privacy },
    music: { ...DEFAULT_PREFERENCES.music, ...partial.music },
  };
}

/**
 * Apply profile overrides to base preferences
 */
export function applyProfileOverrides(
  base: UserPreferences,
  override: Partial<UserPreferences>
): UserPreferences {
  return {
    coaching: { ...base.coaching, ...override.coaching },
    guidanceLevel: override.guidanceLevel ?? base.guidanceLevel,
    dashboard: { ...base.dashboard, ...override.dashboard },
    notifications: { ...base.notifications, ...override.notifications },
    hydration: { ...base.hydration, ...override.hydration },
    sounds: { ...base.sounds, ...override.sounds },
    workout: { ...base.workout, ...override.workout },
    display: { ...base.display, ...override.display },
    units: { ...base.units, ...override.units },
    privacy: { ...base.privacy, ...override.privacy },
    music: { ...base.music, ...override.music },
  };
}

/**
 * Convert ounces to milliliters
 */
export function ozToMl(oz: number): number {
  return Math.round(oz * 29.5735);
}

/**
 * Convert milliliters to ounces
 */
export function mlToOz(ml: number): number {
  return Math.round((ml / 29.5735) * 10) / 10;
}
