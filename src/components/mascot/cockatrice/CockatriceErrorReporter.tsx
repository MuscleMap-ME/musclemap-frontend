/**
 * CockatriceErrorReporter
 *
 * A friendly error display component featuring the Cockatrice mascot.
 * Shows error messages with personality while automatically reporting
 * issues to the backend for the auto-healing system.
 *
 * Features:
 * - Animated Cockatrice mascot with mood-based expressions
 * - Charming, context-aware error messages
 * - Automatic error reporting to backend
 * - Retry/refresh actions
 * - Accessibility support
 * - Glassmorphic design
 */

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CockatriceHeraldic from './CockatriceHeraldic';
import {
  getCockatriceMessage,
  getSuccessMessage,
  detectErrorCategory,
  type CockatriceMessage,
} from './cockatriceMessages';
import { reportError, type ErrorReport } from '../../../services/errorReporting';
import { haptic } from '../../../utils/haptics';

export interface CockatriceErrorReporterProps {
  /** The error that occurred */
  error: Error | null;
  /** Optional HTTP status code */
  httpStatus?: number;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Callback when user clicks go home */
  onGoHome?: () => void;
  /** Component name where error occurred (for logging) */
  componentName?: string;
  /** Additional context to include in error report */
  errorContext?: Record<string, unknown>;
  /** Whether to show full-screen or inline */
  variant?: 'fullscreen' | 'inline' | 'modal';
  /** Whether retry has been attempted */
  retryCount?: number;
  /** Maximum retries before showing alternative action */
  maxRetries?: number;
  /** Whether to auto-report the error (default: true) */
  autoReport?: boolean;
  /** Custom className */
  className?: string;
}

export default function CockatriceErrorReporter({
  error,
  httpStatus,
  onRetry,
  onGoHome,
  componentName,
  errorContext,
  variant = 'fullscreen',
  retryCount = 0,
  maxRetries = 2,
  autoReport = true,
  className = '',
}: CockatriceErrorReporterProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [showSuccess, _setShowSuccess] = useState(false);

  // Detect error category and get appropriate message
  const category = detectErrorCategory(error, httpStatus);
  const [message, _setMessage] = useState<CockatriceMessage>(() =>
    getCockatriceMessage(category)
  );

  // Report error to backend
  useEffect(() => {
    if (!error || !autoReport || reportSent) return;

    const sendReport = async () => {
      setIsReporting(true);

      const report: ErrorReport = {
        type: category,
        message: error.message,
        stack: error.stack,
        componentName,
        httpStatus,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        context: {
          ...errorContext,
          retryCount,
          errorName: error.name,
        },
      };

      try {
        const result = await reportError(report);
        setReportId(result?.id || null);
        setReportSent(true);
      } catch (reportErr) {
        // Don't show error for error reporting failure
        console.error('Failed to report error:', reportErr);
        setReportSent(true);
      } finally {
        setIsReporting(false);
      }
    };

    sendReport();
  }, [error, category, componentName, httpStatus, errorContext, retryCount, autoReport, reportSent]);

  // Trigger haptic feedback on error display
  useEffect(() => {
    if (error) {
      haptic('error');
    }
  }, [error]);

  const handleRetry = useCallback(() => {
    haptic('light');
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  const handleGoHome = useCallback(() => {
    haptic('light');
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  }, [onGoHome]);

  const handleReload = useCallback(() => {
    haptic('light');
    window.location.reload();
  }, []);

  // Determine if we should show retry button
  const showRetryButton = onRetry && retryCount < maxRetries;
  const showReloadButton = !showRetryButton || retryCount >= maxRetries;

  // Variant-specific styles
  const variantStyles = {
    fullscreen:
      'min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4',
    inline: 'p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10',
    modal:
      'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
  };

  const containerStyles = {
    fullscreen: 'max-w-md w-full',
    inline: 'w-full',
    modal: 'max-w-md w-full',
  };

  if (!error) return null;

  return (
    <div className={`${variantStyles[variant]} ${className}`} role="alert" aria-live="assertive">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`${containerStyles[variant]} bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center`}
      >
        {/* Cockatrice Mascot */}
        <div className="flex justify-center mb-6">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <CockatriceHeraldic state="victorious" size="xl" />
              </motion.div>
            ) : (
              <motion.div
                key="error"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <CockatriceHeraldic state={message.mood as any} size="xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-white mb-3"
        >
          {showSuccess ? getSuccessMessage().title : message.title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 mb-4 leading-relaxed"
        >
          {showSuccess ? getSuccessMessage().message : message.message}
        </motion.p>

        {/* Tip */}
        {message.tip && !showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3 mb-6"
          >
            <p className="text-violet-300 text-sm flex items-center justify-center gap-2">
              <span className="text-lg">💡</span>
              {message.tip}
            </p>
          </motion.div>
        )}

        {/* Reporting status */}
        {isReporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-500 text-sm mb-4 flex items-center justify-center gap-2"
          >
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full"
            />
            Reporting issue to our team...
          </motion.div>
        )}

        {reportSent && !isReporting && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-green-400/70 text-sm mb-4 flex items-center justify-center gap-2"
          >
            <span className="text-green-400">✓</span>
            Issue reported - our team has been notified
            {reportId && (
              <span className="text-gray-500 text-xs ml-1">
                (#{reportId.slice(0, 8)})
              </span>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          {showRetryButton && (
            <button
              onClick={handleRetry}
              className="px-6 py-3 min-h-[48px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] active:scale-95"
            >
              Try Again
            </button>
          )}

          {showReloadButton && (
            <button
              onClick={handleReload}
              className="px-6 py-3 min-h-[48px] bg-white/10 hover:bg-white/20 rounded-xl font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] active:scale-95"
            >
              Reload Page
            </button>
          )}

          <button
            onClick={handleGoHome}
            className="px-6 py-3 min-h-[48px] bg-transparent hover:bg-white/5 rounded-xl font-medium text-gray-400 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] active:scale-95"
          >
            Go Home
          </button>
        </motion.div>

        {/* Technical details (dev mode) */}
        {process.env.NODE_ENV !== 'production' && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400 select-none">
              Technical details
            </summary>
            <div className="mt-3 space-y-2">
              <div className="bg-black/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Error Type</p>
                <p className="text-sm text-rose-400 font-mono">{category}</p>
              </div>
              <pre className="p-4 bg-black/50 rounded-xl text-xs text-rose-400 overflow-auto max-h-48 font-mono">
                {error.name}: {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
              {componentName && (
                <p className="text-xs text-gray-600">
                  Component: {componentName}
                </p>
              )}
            </div>
          </details>
        )}

        {/* TRIPTOMEAN credit */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-xs text-gray-600"
        >
          Cockatrice mascot from{' '}
          <a
            href="https://triptomean.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-400 underline"
          >
            TRIPTOMEAN.com
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}

export { CockatriceErrorReporter };
