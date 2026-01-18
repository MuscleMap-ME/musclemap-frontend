/**
 * CockatriceToast
 *
 * A compact error toast featuring the Cockatrice mascot.
 * Used for non-fatal errors that don't require the full error reporter.
 * Integrates with the existing toast system.
 */

import React from 'react';
import { motion } from 'framer-motion';
import CockatriceHeraldic from './CockatriceHeraldic';
import {
  getCockatriceMessage,
  detectErrorCategory,
  type ErrorCategory,
} from './cockatriceMessages';
import { reportError } from '../../../services/errorReporting';

export interface CockatriceToastProps {
  /** Error message to display */
  message: string;
  /** Error category (auto-detected if not provided) */
  category?: ErrorCategory;
  /** HTTP status code (if applicable) */
  httpStatus?: number;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /** Callback for retry action (if applicable) */
  onRetry?: () => void;
  /** Whether to report the error to the backend */
  shouldReport?: boolean;
  /** Additional context for error reporting */
  context?: Record<string, unknown>;
}

export default function CockatriceToast({
  message,
  category,
  httpStatus,
  onDismiss,
  onRetry,
  shouldReport = true,
  context,
}: CockatriceToastProps) {
  // Detect category if not provided
  const errorCategory = category || detectErrorCategory(new Error(message), httpStatus);
  const cockatriceMessage = getCockatriceMessage(errorCategory);

  // Report error
  React.useEffect(() => {
    if (shouldReport) {
      reportError({
        type: errorCategory,
        message,
        httpStatus,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        context: {
          ...context,
          isToast: true,
        },
      });
    }
  }, [message, errorCategory, httpStatus, shouldReport, context]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="pointer-events-auto px-4 py-3 rounded-2xl backdrop-blur-xl border border-rose-500/30 bg-rose-500/10 shadow-lg flex items-center gap-4 max-w-md"
    >
      {/* Mini Cockatrice */}
      <div className="flex-shrink-0">
        <CockatriceHeraldic state={cockatriceMessage.mood as any} size="sm" />
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">
          {cockatriceMessage.title}
        </p>
        <p className="text-gray-400 text-xs truncate">
          {message.length > 60 ? `${message.slice(0, 60)}...` : message}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 min-h-[36px] bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors active:scale-95"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}

export { CockatriceToast };
