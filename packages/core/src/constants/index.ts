/**
 * @musclemap/core - Constants
 * 
 * Shared constants across the application.
 */

// Define CreditTier inline to avoid circular imports
interface CreditTier {
  id: string;
  credits: number;
  priceCents: number;
  label: string;
  popular?: boolean;
}

// ============================================
// CREDIT SYSTEM CONSTANTS
// ============================================

export const CREDITS_PER_DOLLAR = 100;
export const DEFAULT_WORKOUT_COST = 25;
export const MINIMUM_PURCHASE_CENTS = 100; // $1.00

/**
 * Official pricing tiers - must match /api/economy/pricing response
 */
export const PRICING_TIERS: CreditTier[] = [
  { id: 'starter', credits: 100, priceCents: 100, label: '$1 = 100 credits' },
  { id: 'value', credits: 550, priceCents: 500, label: '$5 = 550 credits (+10%)' },
  { id: 'popular', credits: 1200, priceCents: 1000, label: '$10 = 1,200 credits (+20%)', popular: true },
  { id: 'premium', credits: 2750, priceCents: 2000, label: '$20 = 2,750 credits (+37.5%)' },
  { id: 'mega', credits: 6000, priceCents: 4000, label: '$40 = 6,000 credits (+50%)' },
  { id: 'ultimate', credits: 15000, priceCents: 8000, label: '$80 = 15,000 credits (+87.5%)' },
];

export const PRICING_RATE = '1 credit = $0.01';

// ============================================
// COLOR TIER SYSTEM
// ============================================

export const COLOR_TIERS = {
  0: { name: 'Inactive', hex: '#2A2A4A', rgb: [42, 42, 74] },
  1: { name: 'Light', hex: '#3B82F6', rgb: [59, 130, 246] },
  2: { name: 'Moderate', hex: '#22C55E', rgb: [34, 197, 94] },
  3: { name: 'Working', hex: '#EAB308', rgb: [234, 179, 8] },
  4: { name: 'High', hex: '#F97316', rgb: [249, 115, 22] },
  5: { name: 'Maximum', hex: '#EF4444', rgb: [239, 68, 68] },
} as const;

export function getColorTier(normalizedActivation: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (normalizedActivation <= 0) return 0;
  if (normalizedActivation <= 20) return 1;
  if (normalizedActivation <= 40) return 2;
  if (normalizedActivation <= 60) return 3;
  if (normalizedActivation <= 80) return 4;
  return 5;
}

// ============================================
// ARCHETYPE IDS
// ============================================

export const ArchetypeIds = {
  BALANCED: 'ARCH-001',
  JUDOKA: 'ARCH-002',
  SPRINTER: 'ARCH-003',
  SWIMMER: 'ARCH-004',
  TENNIS: 'ARCH-005',
  SAMOAN: 'ARCH-006',
  CLIMBER: 'ARCH-007',
  POWERLIFTER: 'ARCH-008',
  SOCCER: 'ARCH-009',
  GYMNAST: 'ARCH-010',
} as const;

// ============================================
// EXERCISE TYPES
// ============================================

export const ExerciseTypes = {
  BODYWEIGHT: 'bodyweight',
  KETTLEBELL: 'kettlebell',
  FREEWEIGHT: 'freeweight',
  MACHINE: 'machine',
  CABLE: 'cable',
} as const;

// ============================================
// COMPETITION CONSTANTS
// ============================================

export const CompetitionDefaults = {
  MIN_DURATION_DAYS: 1,
  MAX_DURATION_DAYS: 90,
  DEFAULT_MAX_PARTICIPANTS: 100,
  MAX_PARTICIPANTS_LIMIT: 10000,
};

// ============================================
// API CONSTANTS
// ============================================

export const ApiVersions = {
  CURRENT: 'v1',
  LEGACY: 'legacy',
} as const;

export const ApiHeaders = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  API_VERSION: 'x-api-version',
  IDEMPOTENCY_KEY: 'idempotency-key',
} as const;

// ============================================
// RATE LIMITS
// ============================================

export const RateLimits = {
  AUTH_ATTEMPTS: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 per 15 min
  API_GENERAL: { windowMs: 60 * 1000, max: 100 }, // 100 per minute
  API_EXPENSIVE: { windowMs: 60 * 1000, max: 10 }, // 10 per minute
  WEBHOOK: { windowMs: 60 * 1000, max: 1000 }, // 1000 per minute
} as const;

// ============================================
// PLUGIN SYSTEM
// ============================================

export const PluginConstants = {
  ENGINE_VERSION: '2.0.0',
  MANIFEST_FILENAME: 'manifest.json',
  MAX_PERMISSIONS: 50,
  MAX_CREDIT_ACTIONS: 20,
} as const;

// ============================================
// WEALTH TIERS
// ============================================

export * from './wealth-tiers.js';
