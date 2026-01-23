import React from 'react';
import logger from '../utils/logger';
import { CockatriceErrorReporter } from './mascot/cockatrice';

/**
 * ErrorBoundary - Catches React errors and displays the Cockatrice error UI
 *
 * Part of MuscleMap's SPA UX improvements, now featuring the Cockatrice mascot
 * from TRIPTOMEAN.com for friendly, charming error messages.
 *
 * Features:
 * - Cockatrice mascot delivers error messages with personality
 * - Automatic error reporting to backend for auto-healing
 * - Retry functionality without full page reload
 * - Error logging
 * - Network error detection
 * - Development mode stack traces
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Component name for error context */
  name?: string;
  /** Use inline variant instead of fullscreen */
  inline?: boolean;
  /** Fallback to render instead of default error UI */
  fallback?: React.ReactNode;
  /** Callback when an error is caught - useful for custom error tracking */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'network' | 'chunk' | 'runtime' | null;
  retryCount: number;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Detect error type for better messaging
    let errorType: ErrorBoundaryState['errorType'] = 'runtime';

    if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
      errorType = 'chunk';
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      errorType = 'network';
    }

    return { hasError: true, error, errorType };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.componentError(this.props.name || 'Unknown', error);
    logger.error('react_error_boundary', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType: this.state.errorType,
    });

    // Call onError callback if provided (for custom error tracking)
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch {
        // Don't let callback errors propagate
      }
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorType: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use the Cockatrice error reporter
      return (
        <CockatriceErrorReporter
          error={this.state.error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          componentName={this.props.name}
          variant={this.props.inline ? 'inline' : 'fullscreen'}
          retryCount={this.state.retryCount}
          maxRetries={2}
          autoReport={true}
          errorContext={{
            errorType: this.state.errorType,
          }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
