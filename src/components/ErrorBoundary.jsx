import React from 'react';
import logger from '../utils/logger';

/**
 * ErrorBoundary - Catches React errors and displays friendly fallback UI
 *
 * Part of MuscleMap's SPA UX improvements.
 * Features:
 * - User-friendly error display
 * - Retry functionality without full page reload
 * - Error logging
 * - Network error detection
 * - Development mode stack traces
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: null, // 'network', 'chunk', 'runtime'
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Detect error type for better messaging
    let errorType = 'runtime';

    if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
      errorType = 'chunk';
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      errorType = 'network';
    }

    return { hasError: true, error, errorType };
  }

  componentDidCatch(error, errorInfo) {
    logger.componentError(this.props.name || 'Unknown', error);
    logger.error('react_error_boundary', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType: this.state.errorType,
    });
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorType: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  getErrorContent() {
    const { errorType } = this.state;

    switch (errorType) {
      case 'chunk':
        return {
          icon: (
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          iconBg: 'bg-amber-500/20',
          title: 'Page failed to load',
          message: 'The page content could not be loaded. This might be due to a network issue or an update.',
          showRetry: true,
        };
      case 'network':
        return {
          icon: (
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ),
          iconBg: 'bg-blue-500/20',
          title: 'Connection issue',
          message: 'Please check your internet connection and try again.',
          showRetry: true,
        };
      default:
        return {
          icon: (
            <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          iconBg: 'bg-rose-500/20',
          title: 'Something went wrong',
          message: "We've logged this error and will look into it.",
          showRetry: this.state.retryCount < 2,
        };
    }
  }

  render() {
    if (this.state.hasError) {
      const content = this.getErrorContent();

      return (
        <div
          className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
            {/* Icon */}
            <div className={`w-16 h-16 mx-auto mb-5 rounded-full ${content.iconBg} flex items-center justify-center`}>
              {content.icon}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">
              {content.title}
            </h1>

            {/* Message */}
            <p className="text-gray-400 mb-6">
              {content.message}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {content.showRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-6 py-3 bg-transparent hover:bg-white/5 rounded-xl font-medium text-gray-400 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
              >
                Go Home
              </button>
            </div>

            {/* Debug info in development */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                  Technical details
                </summary>
                <pre className="mt-2 p-4 bg-black/50 rounded-xl text-xs text-rose-400 overflow-auto max-h-48">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Component name (for debugging) */}
            {this.props.name && process.env.NODE_ENV !== 'production' && (
              <p className="mt-4 text-xs text-gray-600">
                Error in: {this.props.name}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
