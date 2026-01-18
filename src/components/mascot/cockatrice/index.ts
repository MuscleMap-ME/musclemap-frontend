/**
 * Cockatrice Mascot Components
 *
 * The Cockatrice is the mascot from TRIPTOMEAN.com - a mythical creature
 * that's part rooster, part serpent. Used throughout MuscleMap for:
 * - Error messages and notifications (Error Reporter)
 * - Bug hunting dashboard (Bug Hunter)
 * - Delightful interactions
 *
 * Two visual styles available:
 * - CockatriceHeraldic: 2D SVG matching the TripToMean logo (heraldic/medieval line art)
 * - Cockatrice3D: Three.js 3D version for immersive experiences
 * - Cockatrice (legacy): Original cartoon style (deprecated)
 */

// New heraldic version - matches TripToMean.com logo exactly
export { default as CockatriceHeraldic } from './CockatriceHeraldic';
export type { CockatriceState } from './CockatriceHeraldic';

// 3D version for immersive presentations
export { default as Cockatrice3D } from './Cockatrice3D';
export type { Cockatrice3DState } from './Cockatrice3D';

// Legacy cartoon version (keeping for backwards compatibility)
export { default as Cockatrice } from './Cockatrice';
export type { CockatriceState as CockatriceLegacyState } from './Cockatrice';

export { default as CockatriceErrorReporter } from './CockatriceErrorReporter';
export type { CockatriceErrorReporterProps } from './CockatriceErrorReporter';

export { default as CockatriceToast } from './CockatriceToast';
export type { CockatriceToastProps } from './CockatriceToast';

export {
  getCockatriceMessage,
  getSuccessMessage,
  detectErrorCategory,
  type CockatriceMessage,
  type ErrorCategory,
  ALL_MESSAGES,
} from './cockatriceMessages';
