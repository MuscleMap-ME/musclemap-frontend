/**
 * Rank System Types
 *
 * Shared types for the MuscleMap ranking/leveling system.
 * Used by both API and frontend.
 */

// Rank tier constants
export const RANK_TIERS = {
  NOVICE: 1,
  TRAINEE: 2,
  APPRENTICE: 3,
  PRACTITIONER: 4,
  JOURNEYPERSON: 5,
  EXPERT: 6,
  MASTER: 7,
  GRANDMASTER: 8,
} as const;

export type RankTier = (typeof RANK_TIERS)[keyof typeof RANK_TIERS];

export type RankName =
  | 'novice'
  | 'trainee'
  | 'apprentice'
  | 'practitioner'
  | 'journeyperson'
  | 'expert'
  | 'master'
  | 'grandmaster';

// XP source types
export type XpSourceType =
  | 'workout'
  | 'goal'
  | 'archetype'
  | 'streak'
  | 'achievement'
  | 'special'
  | 'backfill'
  | 'admin';

// Rank definition from database
export interface RankDefinition {
  id: string;
  tier: RankTier;
  name: RankName;
  displayName: string;
  xpThreshold: number;
  badgeIcon: string;
  badgeColor: string;
  perks: string[];
}

// User's rank information
export interface UserRankInfo {
  userId: string;
  currentRank: RankName;
  currentTier: RankTier;
  displayName: string;
  totalXp: number;
  xpToNextRank: number | null;
  progressPercent: number;
  badgeIcon: string;
  badgeColor: string;
  perks: string[];
  nextRank: {
    name: RankName;
    displayName: string;
    xpThreshold: number;
    badgeIcon?: string;
    badgeColor?: string;
  } | null;
  veteranTier: number;
  veteranLabel: string | null;
  rankUpdatedAt: string | null;
  xpToday?: number;
  xpThisWeek?: number;
}

// XP history entry
export interface XpHistoryEntry {
  id: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  reason: string;
  createdAt: string;
}

// Veteran badge info
export interface VeteranBadge {
  tier: 0 | 1 | 2 | 3;
  label: string | null;
  icon: string;
  color: string;
  monthsActive: number;
  nextTier?: {
    tier: number;
    monthsRequired: number;
    monthsRemaining: number;
  } | null;
}

// Leaderboard entry
export interface RankLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  totalXp: number;
  currentRank: RankName;
  badgeIcon: string;
  badgeColor: string;
  veteranTier: number;
  country?: string;
}

// Leaderboard response
export interface RankLeaderboardResponse {
  data: {
    entries: RankLeaderboardEntry[];
    userRank: number | null;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  meta: {
    scope: 'global' | 'country' | 'state' | 'city';
    filters: {
      country?: string;
      state?: string;
      city?: string;
    };
  };
}

// Field visibility settings
export interface FieldVisibility {
  showLocation: boolean;
  showGender: boolean;
  showAge: boolean;
  showAbility: boolean;
  showStats: boolean;
  showAchievements: boolean;
  showRank: boolean;
  showWorkouts: boolean;
  showLanguages: boolean;
  showVeteranBadge: boolean;
  showAboutMe: boolean;
}

// User language
export interface UserLanguage {
  id: string;
  languageCode: string;
  name: string;
  nativeName: string;
  flagEmoji: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  isPrimary: boolean;
}

// Language option
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flagEmoji: string;
  region?: string;
}

// Profile visibility level
export type ProfileVisibility = 'public' | 'friends' | 'private';

// Location visibility level
export type LocationVisibility = 'none' | 'country' | 'state' | 'city';

// Age bracket
export type AgeBracket =
  | '13-17'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65+'
  | 'prefer_not_to_say';

// Ability category
export type AbilityCategory =
  | 'standard'
  | 'adaptive'
  | 'wheelchair'
  | 'visually_impaired'
  | 'other'
  | 'prefer_not_to_say';

// Extended profile data
export interface ExtendedProfile {
  userId: string;
  gender?: string;
  genderCustomLabel?: string;
  ageBracket?: AgeBracket;
  abilityCategory?: AbilityCategory;
  abilityCustomLabel?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  aboutMe?: string;
  aboutMeVisibility?: ProfileVisibility;
  ghostMode: boolean;
  leaderboardOptIn: boolean;
  profileVisibility: ProfileVisibility;
  locationVisibilityLevel: LocationVisibility;
}

// Profile update request
export interface ProfileUpdateRequest {
  displayName?: string;
  avatarUrl?: string;
  gender?: string;
  genderCustomLabel?: string;
  ageBracket?: AgeBracket;
  abilityCategory?: AbilityCategory;
  abilityCustomLabel?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  aboutMe?: string;
  aboutMeVisibility?: ProfileVisibility;
  ghostMode?: boolean;
  leaderboardOptIn?: boolean;
  profileVisibility?: ProfileVisibility;
  locationVisibilityLevel?: LocationVisibility;
  fieldVisibility?: Partial<FieldVisibility>;
}

// Rank badge visual info (for frontend rendering)
export const RANK_BADGE_VISUALS: Record<RankName, {
  type: 'chevron' | 'star' | 'shield';
  count: number;
  variant?: 'outline' | 'bronze' | 'silver' | 'gold' | 'diamond';
  color: string;
}> = {
  novice: { type: 'chevron', count: 0, variant: 'outline', color: '#6B7280' },
  trainee: { type: 'chevron', count: 1, color: '#22C55E' },
  apprentice: { type: 'chevron', count: 2, color: '#3B82F6' },
  practitioner: { type: 'chevron', count: 3, color: '#8B5CF6' },
  journeyperson: { type: 'star', count: 1, variant: 'bronze', color: '#EAB308' },
  expert: { type: 'star', count: 1, variant: 'silver', color: '#F97316' },
  master: { type: 'star', count: 2, variant: 'gold', color: '#EF4444' },
  grandmaster: { type: 'shield', count: 1, variant: 'diamond', color: '#EC4899' },
};

// Veteran badge visuals
export const VETERAN_BADGE_VISUALS: Record<0 | 1 | 2 | 3, {
  label: string | null;
  icon: string;
  color: string;
}> = {
  0: { label: null, icon: '', color: '' },
  1: { label: '6 Months', icon: 'veteran-bronze', color: '#CD7F32' },
  2: { label: '1 Year', icon: 'veteran-silver', color: '#C0C0C0' },
  3: { label: '2+ Years', icon: 'veteran-gold', color: '#FFD700' },
};
