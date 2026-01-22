/**
 * Mobile Debug Overlay
 *
 * A floating debug panel for iOS/mobile devices where DevTools isn't available.
 * Captures:
 * - JavaScript errors
 * - Console errors
 * - Failed network requests
 * - Unhandled promise rejections
 *
 * Enable by setting localStorage.musclemap_debug_mode = 'true'
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Bug,
  ChevronDown,
  Copy,
  Trash2,
  Send,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '@musclemap/client';

// ============================================
// TYPES
// ============================================

interface CapturedError {
  id: string;
  type: 'error' | 'console' | 'network' | 'promise';
  message: string;
  stack?: string;
  url?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// ============================================
// ERROR CAPTURE UTILITIES
// ============================================

let errorBuffer: CapturedError[] = [];
let errorListeners: ((errors: CapturedError[]) => void)[] = [];

const notifyListeners = () => {
  errorListeners.forEach(listener => listener([...errorBuffer]));
};

const addError = (error: CapturedError) => {
  // Prevent duplicates (same message within 1 second)
  const isDuplicate = errorBuffer.some(
    e => e.message === error.message &&
    Date.now() - e.timestamp.getTime() < 1000
  );
  if (isDuplicate) return;

  errorBuffer.unshift(error);
  // Keep max 50 errors
  if (errorBuffer.length > 50) {
    errorBuffer = errorBuffer.slice(0, 50);
  }
  notifyListeners();
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// Global error handler
const setupGlobalErrorHandlers = () => {
  // Capture uncaught errors
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    addError({
      id: generateId(),
      type: 'error',
      message: String(message),
      stack: error?.stack,
      url: source || window.location.href,
      timestamp: new Date(),
      details: { lineno, colno },
    });
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    addError({
      id: generateId(),
      type: 'promise',
      message: `Unhandled Promise: ${message}`,
      stack: event.reason?.stack,
      url: window.location.href,
      timestamp: new Date(),
    });
  });

  // Intercept console.error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.map(a =>
      typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
    ).join(' ');

    // Don't capture our own debug messages
    if (!message.includes('[MobileDebug]')) {
      addError({
        id: generateId(),
        type: 'console',
        message: message.slice(0, 500),
        url: window.location.href,
        timestamp: new Date(),
      });
    }
    originalConsoleError.apply(console, args);
  };

  // Intercept fetch for network errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
    try {
      const response = await originalFetch.apply(window, args);
      if (!response.ok && response.status >= 400) {
        addError({
          id: generateId(),
          type: 'network',
          message: `HTTP ${response.status}: ${response.statusText}`,
          url: url,
          timestamp: new Date(),
          details: { status: response.status },
        });
      }
      return response;
    } catch (err) {
      addError({
        id: generateId(),
        type: 'network',
        message: `Network Error: ${err instanceof Error ? err.message : 'Unknown'}`,
        url: url,
        timestamp: new Date(),
      });
      throw err;
    }
  };
};

// ============================================
// COMPONENT
// ============================================

export default function MobileDebugOverlay() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const setupDone = useRef(false);

  // Check if debug mode is enabled
  useEffect(() => {
    const enabled = localStorage.getItem('musclemap_debug_mode') === 'true';
    setIsEnabled(enabled);

    if (enabled && !setupDone.current) {
      setupDone.current = true;
      setupGlobalErrorHandlers();
      console.log('[MobileDebug] Debug overlay enabled');
    }
  }, []);

  // Subscribe to error updates
  useEffect(() => {
    if (!isEnabled) return;

    const listener = (newErrors: CapturedError[]) => {
      setErrors(newErrors);
    };
    errorListeners.push(listener);
    setErrors([...errorBuffer]);

    return () => {
      errorListeners = errorListeners.filter(l => l !== listener);
    };
  }, [isEnabled]);

  // Copy all errors to clipboard
  const copyErrors = useCallback(async () => {
    const text = errors.map(e =>
      `[${e.type.toUpperCase()}] ${e.timestamp.toLocaleTimeString()}\n${e.message}${e.url ? `\nURL: ${e.url}` : ''}${e.stack ? `\nStack: ${e.stack}` : ''}`
    ).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for iOS
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [errors]);

  // Send errors to bug tracker
  const sendToBugTracker = useCallback(async () => {
    if (errors.length === 0) return;

    setSending(true);
    try {
      const errorMessages = errors.map(e => e.message);
      const networkErrors = errors.filter(e => e.type === 'network').map(e => `${e.url}: ${e.message}`);

      await apiClient.post('/feedback', {
        type: 'bug_report',
        title: `[Auto-captured] ${errors.length} error(s) on ${window.location.pathname}`,
        description: `Automatically captured errors from mobile device.\n\nURL: ${window.location.href}\nUser Agent: ${navigator.userAgent}\nScreen: ${window.innerWidth}x${window.innerHeight}`,
        priority: errors.some(e => e.type === 'error' || e.type === 'promise') ? 'high' : 'medium',
        metadata: {
          consoleErrors: errorMessages,
          networkErrors,
          capturedAt: new Date().toISOString(),
          errorCount: errors.length,
          errorDetails: errors.slice(0, 10).map(e => ({
            type: e.type,
            message: e.message,
            url: e.url,
            timestamp: e.timestamp,
          })),
        },
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
      });

      setSent(true);
      setTimeout(() => setSent(false), 3000);
      // Clear errors after sending
      errorBuffer = [];
      setErrors([]);
    } catch (err) {
      console.error('[MobileDebug] Failed to send errors:', err);
    } finally {
      setSending(false);
    }
  }, [errors]);

  // Clear errors
  const clearErrors = useCallback(() => {
    errorBuffer = [];
    setErrors([]);
  }, []);

  if (!isEnabled) return null;

  // Error type colors
  const typeColors: Record<string, string> = {
    error: 'bg-red-500',
    console: 'bg-orange-500',
    network: 'bg-yellow-500',
    promise: 'bg-purple-500',
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed bottom-4 right-4 z-[9999] p-3 rounded-full shadow-lg transition-all ${
          errors.length > 0 ? 'bg-red-600 animate-pulse' : 'bg-gray-800'
        }`}
        style={{ touchAction: 'manipulation' }}
      >
        <Bug className="w-6 h-6 text-white" />
        {errors.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {errors.length > 9 ? '9+' : errors.length}
          </span>
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed inset-x-0 bottom-0 z-[9998] bg-gray-900 border-t border-gray-700 shadow-2xl max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-400" />
              <span className="font-semibold text-white">Debug Console</span>
              <span className="text-xs text-gray-400">({errors.length} errors)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyErrors}
                disabled={errors.length === 0}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                title="Copy all errors"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <button
                onClick={sendToBugTracker}
                disabled={errors.length === 0 || sending}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                title="Send to bug tracker"
              >
                {sent ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Send className={`w-4 h-4 text-violet-400 ${sending ? 'animate-pulse' : ''}`} />
                )}
              </button>
              <button
                onClick={clearErrors}
                disabled={errors.length === 0}
                className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
                title="Clear errors"
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-700 rounded"
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Error List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {errors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No errors captured</p>
                <p className="text-xs mt-1">Errors will appear here as they occur</p>
              </div>
            ) : (
              errors.map((error) => (
                <div
                  key={error.id}
                  className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${typeColors[error.type]}`}>
                      {error.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {error.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white mt-2 break-words">{error.message}</p>
                  {error.url && (
                    <p className="text-xs text-gray-500 mt-1 break-all">{error.url}</p>
                  )}
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">Stack trace</summary>
                      <pre className="text-xs text-gray-400 mt-1 p-2 bg-black/30 rounded overflow-x-auto whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-500 text-center">
            Tap Send to report these errors •
            <button
              onClick={() => {
                localStorage.removeItem('musclemap_debug_mode');
                window.location.reload();
              }}
              className="text-violet-400 ml-1"
            >
              Disable debug mode
            </button>
          </div>
        </div>
      )}
    </>
  );
}
