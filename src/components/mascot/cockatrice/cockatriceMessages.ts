/**
 * Cockatrice Error Messages
 *
 * The Cockatrice delivers error messages with personality - part helpful,
 * part apologetic, and always charming. Messages are categorized by error type
 * with multiple variants for variety.
 *
 * Each message has:
 * - title: The main heading
 * - message: Detailed explanation
 * - tip: A helpful suggestion (optional)
 * - mood: The Cockatrice's emotional state
 */

import type { CockatriceState } from './Cockatrice';

export interface CockatriceMessage {
  title: string;
  message: string;
  tip?: string;
  mood: CockatriceState;
}

// Network/Connection Errors
export const NETWORK_ERRORS: CockatriceMessage[] = [
  {
    title: "Looks like we've lost signal!",
    message:
      "The Cockatrice tried to reach our servers but got tangled in the web. Check your internet connection and we'll try again.",
    tip: "While you wait, maybe do a quick stretch?",
    mood: 'concerned',
  },
  {
    title: 'The tubes are clogged!',
    message:
      "Your internet connection seems to have wandered off. The Cockatrice is waiting patiently for it to return.",
    tip: "Try toggling WiFi or checking your router.",
    mood: 'apologetic',
  },
  {
    title: 'Connection took a coffee break',
    message:
      "We can't reach MuscleMap's servers right now. The Cockatrice suggests checking if your internet is feeling okay.",
    tip: "If this persists, our servers might be doing push-ups. Try again in a minute!",
    mood: 'helpful',
  },
];

// Chunk Loading Errors (lazy load failures)
export const CHUNK_ERRORS: CockatriceMessage[] = [
  {
    title: 'Page got lost in transit',
    message:
      "The content you requested took a wrong turn somewhere. This usually means there's been an update - let's try loading it fresh!",
    tip: "A quick refresh usually does the trick.",
    mood: 'concerned',
  },
  {
    title: "Oops! Couldn't load that bit",
    message:
      "Part of the app didn't load properly. The Cockatrice has already dispatched a fresh copy - try again!",
    tip: "If this keeps happening, try clearing your browser cache.",
    mood: 'helpful',
  },
  {
    title: 'Update in progress?',
    message:
      "Looks like MuscleMap may have gotten an update while you were here. The page content needs a refresh.",
    tip: "Click 'Try Again' or refresh the page to get the latest version.",
    mood: 'thinking',
  },
];

// Runtime/JavaScript Errors
export const RUNTIME_ERRORS: CockatriceMessage[] = [
  {
    title: 'Well, that was unexpected!',
    message:
      "Something broke that shouldn't have. The Cockatrice has already reported this to our engineers - they're on it!",
    tip: "Your data is safe. Try refreshing to continue your workout.",
    mood: 'apologetic',
  },
  {
    title: 'Glitch in the matrix',
    message:
      "We encountered a bug. Don't worry - the Cockatrice has captured it and sent it to the bug containment facility.",
    tip: "Our team will squash this bug soon!",
    mood: 'concerned',
  },
  {
    title: 'The app did a face-plant',
    message:
      "Even the mightiest apps sometimes trip. This error has been automatically reported, and help is on the way.",
    tip: "Try the action again - it often works the second time!",
    mood: 'apologetic',
  },
  {
    title: 'Ouch! That hurt',
    message:
      "Something went wrong on our end. The Cockatrice is embarrassed but has already flagged this for immediate repair.",
    tip: "Your progress has been saved. Refresh to continue.",
    mood: 'apologetic',
  },
];

// Authentication Errors
export const AUTH_ERRORS: CockatriceMessage[] = [
  {
    title: 'Session got sleepy',
    message:
      "Your login session has expired - happens to the best of us after some time. Let's get you signed back in!",
    tip: "You'll be right back where you left off.",
    mood: 'helpful',
  },
  {
    title: "Who goes there?",
    message:
      "The Cockatrice needs to verify it's really you. Your session may have timed out for security.",
    tip: "Sign in again to continue your fitness journey.",
    mood: 'concerned',
  },
];

// Permission/Authorization Errors
export const PERMISSION_ERRORS: CockatriceMessage[] = [
  {
    title: "Can't go there!",
    message:
      "You don't have access to this area. The Cockatrice guards this content carefully.",
    tip: "If you think this is a mistake, contact support.",
    mood: 'concerned',
  },
  {
    title: 'VIP area ahead',
    message:
      "This feature requires special access. The Cockatrice suggests checking your subscription or permissions.",
    tip: "Upgrade your account to unlock more features!",
    mood: 'helpful',
  },
];

// Server Errors (500s)
export const SERVER_ERRORS: CockatriceMessage[] = [
  {
    title: 'Our servers are doing burpees',
    message:
      "The MuscleMap servers are taking a breather. They'll be back in fighting shape soon!",
    tip: "Try again in a few seconds.",
    mood: 'apologetic',
  },
  {
    title: 'Temporary turbulence',
    message:
      "Our servers hit a rough patch. The Cockatrice has alerted the ops team and they're flexing their fixing muscles.",
    tip: "This usually resolves quickly - hang tight!",
    mood: 'thinking',
  },
  {
    title: 'Server needs a spot',
    message:
      "Our backend is struggling with a heavy lift right now. Give it a moment and it'll push through.",
    tip: "Heavy traffic can cause this. Try again shortly.",
    mood: 'helpful',
  },
];

// Not Found Errors (404s)
export const NOT_FOUND_ERRORS: CockatriceMessage[] = [
  {
    title: 'Page went AWOL',
    message:
      "The Cockatrice searched high and low but couldn't find what you're looking for. It may have been moved or deleted.",
    tip: "Check the URL or head back to the homepage.",
    mood: 'concerned',
  },
  {
    title: "Nothing here but tumbleweeds",
    message:
      "This page doesn't exist - or maybe it's just really good at hide and seek.",
    tip: "Try searching for what you need, or go back home.",
    mood: 'helpful',
  },
];

// Rate Limit Errors (429)
export const RATE_LIMIT_ERRORS: CockatriceMessage[] = [
  {
    title: 'Whoa there, speedy!',
    message:
      "You're moving faster than the Cockatrice can keep up! Take a quick breather and try again.",
    tip: "Wait about 30 seconds before your next request.",
    mood: 'concerned',
  },
  {
    title: 'Too many reps too fast!',
    message:
      "Even in fitness, pacing matters. You've made too many requests - the Cockatrice needs a quick rest.",
    tip: "Slow and steady wins the race.",
    mood: 'helpful',
  },
];

// Validation Errors
export const VALIDATION_ERRORS: CockatriceMessage[] = [
  {
    title: 'Something seems off',
    message:
      "The data you entered didn't pass the Cockatrice's quality check. Double-check your input and try again.",
    tip: "Look for red highlights on form fields.",
    mood: 'helpful',
  },
  {
    title: "That doesn't add up",
    message:
      "Some of the information provided isn't quite right. The Cockatrice is a stickler for details!",
    tip: "Review the form and fix any highlighted errors.",
    mood: 'concerned',
  },
];

// Timeout Errors
export const TIMEOUT_ERRORS: CockatriceMessage[] = [
  {
    title: 'Taking too long...',
    message:
      "The request timed out - either the servers are busy or the operation is complex. The Cockatrice is patient, but has limits.",
    tip: "Try again, or wait a moment if the servers seem busy.",
    mood: 'thinking',
  },
  {
    title: 'Response got stuck',
    message:
      "We sent the request but never heard back. The digital carrier pigeon might have gotten lost.",
    tip: "Check your connection and try again.",
    mood: 'apologetic',
  },
];

// Success messages (for when issues are auto-fixed)
export const SUCCESS_MESSAGES: CockatriceMessage[] = [
  {
    title: 'All fixed!',
    message:
      "The Cockatrice worked its magic and everything is back to normal. Crisis averted!",
    mood: 'victorious',
  },
  {
    title: 'Problem solved!',
    message:
      "Whatever was broken has been automatically repaired. The Cockatrice is pleased.",
    mood: 'victorious',
  },
  {
    title: 'Back in action!',
    message:
      "The issue has been resolved. You can continue your workout without interruption.",
    mood: 'victorious',
  },
];

// Generic fallback messages
export const GENERIC_ERRORS: CockatriceMessage[] = [
  {
    title: 'Something went wrong',
    message:
      "An unexpected error occurred. The Cockatrice has logged it and our team will investigate.",
    tip: "Try refreshing the page or come back later.",
    mood: 'apologetic',
  },
  {
    title: 'Oops!',
    message:
      "We hit a snag. The good news? The Cockatrice is already working on it behind the scenes.",
    tip: "Your data should be safe. Try again in a moment.",
    mood: 'concerned',
  },
];

/**
 * Get a random message from an array
 */
function getRandomMessage(messages: CockatriceMessage[]): CockatriceMessage {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

/**
 * Error type detection and message selection
 */
export type ErrorCategory =
  | 'network'
  | 'chunk'
  | 'runtime'
  | 'auth'
  | 'permission'
  | 'server'
  | 'notFound'
  | 'rateLimit'
  | 'validation'
  | 'timeout'
  | 'generic';

/**
 * Detect error category from error object or HTTP status
 */
export function detectErrorCategory(
  error?: Error | null,
  httpStatus?: number
): ErrorCategory {
  // Check HTTP status first
  if (httpStatus) {
    if (httpStatus === 401) return 'auth';
    if (httpStatus === 403) return 'permission';
    if (httpStatus === 404) return 'notFound';
    if (httpStatus === 422 || httpStatus === 400) return 'validation';
    if (httpStatus === 429) return 'rateLimit';
    if (httpStatus === 408) return 'timeout';
    if (httpStatus >= 500) return 'server';
  }

  // Check error properties
  if (error) {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    // Network errors
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('internet') ||
      name === 'typeerror' && message.includes('failed to fetch')
    ) {
      return 'network';
    }

    // Chunk loading errors
    if (
      name === 'chunkloaderror' ||
      message.includes('loading chunk') ||
      message.includes('loading css chunk') ||
      message.includes('dynamically imported module')
    ) {
      return 'chunk';
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      name === 'aborterror'
    ) {
      return 'timeout';
    }

    // Auth errors
    if (
      message.includes('unauthorized') ||
      message.includes('unauthenticated') ||
      message.includes('session expired') ||
      message.includes('token')
    ) {
      return 'auth';
    }

    // Permission errors
    if (
      message.includes('forbidden') ||
      message.includes('permission') ||
      message.includes('access denied')
    ) {
      return 'permission';
    }
  }

  // Default to runtime for JS errors, generic otherwise
  if (error instanceof Error) {
    return 'runtime';
  }

  return 'generic';
}

/**
 * Get an appropriate Cockatrice message for an error
 */
export function getCockatriceMessage(
  category: ErrorCategory
): CockatriceMessage {
  const messageMap: Record<ErrorCategory, CockatriceMessage[]> = {
    network: NETWORK_ERRORS,
    chunk: CHUNK_ERRORS,
    runtime: RUNTIME_ERRORS,
    auth: AUTH_ERRORS,
    permission: PERMISSION_ERRORS,
    server: SERVER_ERRORS,
    notFound: NOT_FOUND_ERRORS,
    rateLimit: RATE_LIMIT_ERRORS,
    validation: VALIDATION_ERRORS,
    timeout: TIMEOUT_ERRORS,
    generic: GENERIC_ERRORS,
  };

  return getRandomMessage(messageMap[category] || GENERIC_ERRORS);
}

/**
 * Get a success message (for auto-fixed issues)
 */
export function getSuccessMessage(): CockatriceMessage {
  return getRandomMessage(SUCCESS_MESSAGES);
}

/**
 * Export all message arrays for testing/customization
 */
export const ALL_MESSAGES = {
  NETWORK_ERRORS,
  CHUNK_ERRORS,
  RUNTIME_ERRORS,
  AUTH_ERRORS,
  PERMISSION_ERRORS,
  SERVER_ERRORS,
  NOT_FOUND_ERRORS,
  RATE_LIMIT_ERRORS,
  VALIDATION_ERRORS,
  TIMEOUT_ERRORS,
  SUCCESS_MESSAGES,
  GENERIC_ERRORS,
};
