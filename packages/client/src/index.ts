/**
 * @musclemap/client
 *
 * Shared client-side business logic for MuscleMap.
 * Platform-agnostic: works in browser (web) and React Native (mobile).
 *
 * @example
 * // Web setup
 * import { setStorageAdapter } from '@musclemap/client';
 * import { webStorage } from '@musclemap/client/storage/web';
 * setStorageAdapter(webStorage);
 *
 * @example
 * // React Native setup
 * import { setStorageAdapter } from '@musclemap/client';
 * import { nativeStorage } from '@musclemap/client/storage/native';
 * setStorageAdapter(nativeStorage);
 *
 * @example
 * // Using the API client
 * import { apiClient, useAuth, configureHttpClient } from '@musclemap/client';
 *
 * configureHttpClient({
 *   baseUrl: 'https://api.musclemap.me',
 *   onUnauthorized: () => router.push('/login'),
 * });
 *
 * const { user, login, logout } = useAuth();
 * const response = await apiClient.auth.login(email, password);
 */

// Storage
export {
  type StorageAdapter,
  STORAGE_KEYS,
  type StorageKey,
  setStorageAdapter,
  getStorageAdapter,
  hasStorageAdapter,
} from './storage';

// HTTP Client
export {
  request,
  clearRequestCache,
  configureHttpClient,
  apiHelpers,
  type RequestOptions,
  type HttpClientConfig,
} from './http';

// Schema Validation
export {
  Type,
  isValidationSchema,
  parseWithSchema,
  applySchema,
  type Schema,
  type StringSchema,
  type NumberSchema,
  type BooleanSchema,
  type NullSchema,
  type AnySchema,
  type UnionSchema,
  type ArraySchema,
  type ObjectSchema,
  type ExternalSchema,
  type AnyValidationSchema,
} from './http';

// API Client
export {
  apiClient,
  // User & Auth types
  type User,
  type AuthResponse,
  // Billing types
  type Subscription,
  type BillingCheckoutResponse,
  type FoundingMemberStatus,
  // Wallet types
  type Wallet,
  type Transaction,
  type TransactionsResponse,
  // High Five types
  type HighFiveUser,
  type Encouragement,
  type HighFiveFeed,
  type HighFiveStats,
  // Settings & Profile types
  type Settings,
  type SettingsResponse,
  type Profile,
  type Stats,
  // Exercise types
  type Exercise,
  type ExerciseActivation,
  type ExerciseWithActivations,
  // Muscle types
  type Muscle,
  type MuscleActivation,
  // Workout types
  type WorkoutExercise,
  type Workout,
  type WorkoutStats,
  type WorkoutPreview,
  // Archetype types
  type Archetype,
  type ArchetypeLevel,
  type ArchetypeWithLevels,
  type ArchetypeProgress,
  // Journey types
  type JourneyPath,
  type JourneyMuscleBreakdown,
  type JourneyStats,
  type JourneyData,
  // Rival types
  type RivalStatus,
  type RivalOpponent,
  type Rival,
  type RivalStats,
  type RivalSearchResult,
  // Wearables types
  type WearableProvider,
  type WearableConnection,
  type HeartRateSample,
  type WorkoutSample,
  type ActivitySample,
  type SleepSample,
  type HealthSyncPayload,
  type HealthSummary,
  // Crew types
  type CrewRole,
  type CrewWarStatus,
  type Crew,
  type CrewMember,
  type CrewWar,
  type CrewStats,
  type CrewLeaderboardEntry,
  type MyCrewData,
  // Character Stats types (D&D-style attributes)
  type CharacterStats,
  type StatRanking,
  type StatRankingsByScope,
  type StatsWithRankings,
  type StatsHistoryEntry,
  type ExtendedProfile,
  type LeaderboardEntry,
  type StatInfo,
  // Privacy Settings types (Minimalist Mode)
  type PrivacySettings,
  type PrivacySummary,
  // Virtual Hangout types
  type VirtualHangoutTheme,
  type VirtualHangout,
  type HangoutMember,
  type HangoutActivity,
  // Community types
  type Community,
  type CommunityMember,
  type CommunityEvent,
  // Bulletin board types
  type BulletinPost,
  type BulletinComment,
} from './api';

// Hooks
export {
  useWebSocket,
  type WebSocketMessage,
  type UseWebSocketOptions,
  type UseWebSocketResult,
  useAuth,
  auth,
  type AuthState,
  type UseAuthOptions,
  type UseAuthResult,
} from './hooks';
