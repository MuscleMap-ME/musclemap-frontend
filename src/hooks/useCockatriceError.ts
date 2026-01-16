/**
 * useCockatriceError Hook
 *
 * A convenient hook for showing Cockatrice error messages throughout the app.
 * Integrates with the UI store's toast system while maintaining the Cockatrice
 * personality and automatic error reporting.
 *
 * @example
 * ```tsx
 * const { showError, showAPIError, showNetworkError } = useCockatriceError();
 *
 * // Show a generic error
 * showError(new Error('Something went wrong'));
 *
 * // Show an API error with retry option
 * showAPIError({
 *   status: 500,
 *   message: 'Server error',
 *   onRetry: () => refetch(),
 * });
 *
 * // Show a network error
 * showNetworkError('Failed to load workouts');
 * ```
 */

import { useCallback } from 'react';
import { useUIStore } from '../store/uiStore';
import {
  getCockatriceMessage,
  detectErrorCategory,
  type ErrorCategory,
} from '../components/mascot/cockatrice';
import { reportError, reportAPIError, reportNetworkError } from '../services/errorReporting';

interface ErrorOptions {
  /** Don't automatically report to backend */
  skipReport?: boolean;
  /** Additional context for error report */
  context?: Record<string, unknown>;
  /** Component name for error attribution */
  componentName?: string;
  /** Duration in ms (default: 5000) */
  duration?: number;
  /** Callback for retry action */
  onRetry?: () => void;
}

interface APIErrorOptions extends ErrorOptions {
  /** HTTP status code */
  status: number;
  /** Error message */
  message: string;
  /** Request URL */
  url?: string;
  /** Request method */
  method?: string;
}

export function useCockatriceError() {
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);

  /**
   * Show a generic error with Cockatrice personality
   */
  const showError = useCallback(
    (error: Error | string, options: ErrorOptions = {}) => {
      const err = typeof error === 'string' ? new Error(error) : error;
      const category = detectErrorCategory(err);
      const message = getCockatriceMessage(category);

      // Report to backend (unless skipped)
      if (!options.skipReport) {
        reportError({
          type: category,
          message: err.message,
          stack: err.stack,
          componentName: options.componentName,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          context: options.context,
        });
      }

      // Show toast
      const toastId = addToast({
        type: 'error',
        message: `${message.title}: ${err.message.slice(0, 80)}`,
        duration: options.duration || 5000,
      });

      return toastId;
    },
    [addToast]
  );

  /**
   * Show an API error with status code handling
   */
  const showAPIError = useCallback(
    (options: APIErrorOptions) => {
      const {
        status,
        message,
        url,
        method = 'GET',
        skipReport = false,
        context,
        duration = 5000,
        onRetry,
      } = options;

      const category = detectErrorCategory(null, status);
      const cockatriceMessage = getCockatriceMessage(category);

      // Report to backend
      if (!skipReport) {
        reportAPIError(url || window.location.href, method, status, message, context);
      }

      // Show toast
      const toastId = addToast({
        type: 'error',
        message: `${cockatriceMessage.title}${onRetry ? '' : `: ${message.slice(0, 60)}`}`,
        duration,
      });

      return toastId;
    },
    [addToast]
  );

  /**
   * Show a network/connection error
   */
  const showNetworkError = useCallback(
    (operation: string, options: ErrorOptions = {}) => {
      const category: ErrorCategory = 'network';
      const message = getCockatriceMessage(category);

      // Report to backend
      if (!options.skipReport) {
        reportNetworkError(operation, options.context);
      }

      // Show toast
      const toastId = addToast({
        type: 'error',
        message: `${message.title}: ${operation}`,
        duration: options.duration || 5000,
      });

      return toastId;
    },
    [addToast]
  );

  /**
   * Show an auth error (session expired, unauthorized)
   */
  const showAuthError = useCallback(
    (message = 'Session expired', options: ErrorOptions = {}) => {
      const cockatriceMessage = getCockatriceMessage('auth');

      // Report to backend
      if (!options.skipReport) {
        reportError({
          type: 'auth',
          message,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          context: options.context,
        });
      }

      // Show toast
      const toastId = addToast({
        type: 'warning',
        message: cockatriceMessage.title,
        duration: options.duration || 6000,
      });

      return toastId;
    },
    [addToast]
  );

  /**
   * Dismiss a specific error toast
   */
  const dismissError = useCallback(
    (toastId: string) => {
      removeToast(toastId);
    },
    [removeToast]
  );

  return {
    showError,
    showAPIError,
    showNetworkError,
    showAuthError,
    dismissError,
  };
}

export default useCockatriceError;
