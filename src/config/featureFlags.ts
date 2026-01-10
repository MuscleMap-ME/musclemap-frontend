/**
 * Feature Flags Configuration
 *
 * Enables/disables features based on environment variables.
 * Set VITE_ATLAS_ENABLED=false in .env to disable Visual Architecture Maps.
 */

export const FEATURE_FLAGS = {
  /** Visual Architecture Maps - interactive site navigation (enabled by default) */
  ATLAS_ENABLED: import.meta.env.VITE_ATLAS_ENABLED !== 'false',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
