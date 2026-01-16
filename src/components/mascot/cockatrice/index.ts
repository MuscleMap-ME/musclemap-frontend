/**
 * Cockatrice Mascot Components
 *
 * The Cockatrice is the mascot from TRIPTOMEAN.com - a mythical creature
 * that's part rooster, part serpent. Used throughout MuscleMap for
 * error messages, notifications, and delightful interactions.
 */

export { default as Cockatrice } from './Cockatrice';
export type { CockatriceState } from './Cockatrice';

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
