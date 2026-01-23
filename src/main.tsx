/**
 * MuscleMap Main Entry Point
 *
 * CRITICAL: Heavy defensive coding to handle Brave Shields and other
 * content blockers that may cause initialization failures.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { setStorageAdapter, configureHttpClient } from '@musclemap/client'
import App from './App'
import './styles/index.css'
import { reportWebVitals, logWebVitals } from './utils/webVitals'
import { registerServiceWorker, setupControllerChangeHandler } from './utils/registerSW'
import { initializeApolloCache } from './graphql/client'
import { checkAndPruneStorage, requestPersistentStorage } from './lib/storage-manager'
import { storage } from './lib/storage'

// Ultra-early bootstrap logging
const bootLog = (phase: string, msg: string, error?: unknown) => {
  const info = { phase, msg, error: error instanceof Error ? error.message : error };
  console.log('[MM-Boot]', phase, msg, error || '');
  // Send to server (fire and forget)
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/client-error', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      type: 'boot_log',
      ...info,
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: navigator.userAgent,
      time: new Date().toISOString(),
    }));
  } catch { /* ignore */ }
};

bootLog('init', 'Module imports completed successfully');

/**
 * iOS Safari Compatibility Logging
 * Captures errors that happen before React can handle them
 */
function logBootError(phase: string, error: unknown) {
  const errorInfo = {
    phase,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }

  // Log to console
  console.error('[MuscleMap Boot Error]', errorInfo)

  // Try to send to server (fire and forget)
  try {
    fetch('/api/trace/frontend-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: [{
          level: 'error',
          type: 'boot_error',
          data: errorInfo,
          sessionId: 'boot_' + Date.now().toString(36),
          url: window.location.pathname,
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          timestamp: new Date().toISOString(),
          userId: null,
        }]
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Ignore fetch errors during boot
  }
}

/**
 * Storage adapter that syncs with Zustand auth store
 * Reads token/user from the 'musclemap-auth' localStorage key used by Zustand
 * Uses resilient storage that works with Brave Shields and other blockers
 */
const zustandSyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      bootLog('storage', `Getting item: ${key}`);
      const authData = storage.getItem('musclemap-auth')
      if (!authData) {
        bootLog('storage', `No auth data found for ${key}`);
        return null
      }

      const parsed = JSON.parse(authData)
      const state = parsed?.state
      if (!state) {
        bootLog('storage', `No state in auth data for ${key}`);
        return null
      }

      // Map the client storage keys to Zustand state
      if (key === 'musclemap_token') {
        return state.token || null
      }
      if (key === 'musclemap_user') {
        return state.user ? JSON.stringify(state.user) : null
      }
      return null
    } catch (e) {
      bootLog('storage', `Error getting ${key}`, e);
      return null
    }
  },

  async setItem() {
    // Let Zustand handle writes - this is read-only for the HTTP client
  },

  async removeItem() {
    // Let Zustand handle removes
  },

  async clear() {
    // Let Zustand handle clears
  },
}

// Initialize @musclemap/client storage adapter to sync with Zustand
try {
  bootLog('config', 'Setting storage adapter');
  setStorageAdapter(zustandSyncStorage)
  bootLog('config', 'Storage adapter set');
} catch (e) {
  bootLog('config', 'FAILED to set storage adapter', e);
}

// Configure HTTP client for web
try {
  bootLog('config', 'Configuring HTTP client');
  configureHttpClient({
    baseUrl: '/api',
    onUnauthorized: () => {
      // Clear Zustand auth state and redirect
      storage.removeItem('musclemap-auth')
      window.location.href = '/login'
    },
  })
  bootLog('config', 'HTTP client configured');
} catch (e) {
  bootLog('config', 'FAILED to configure HTTP client', e);
}

// Render the app - this MUST succeed even if initialization fails
function renderApp() {
  try {
    bootLog('render', 'Starting render');
    const root = document.getElementById('root')
    if (!root) {
      logBootError('render', new Error('Root element not found'))
      return
    }
    bootLog('render', 'Root element found');

    bootLog('render', 'Creating React root');
    const reactRoot = ReactDOM.createRoot(root);

    bootLog('render', 'Rendering App component');
    reactRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    bootLog('render', 'Render completed');
  } catch (error) {
    logBootError('render', error)
    bootLog('render', 'FAILED', error);
    // Show a basic error message in the DOM
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0f;color:white;padding:20px;text-align:center;font-family:system-ui,sans-serif;">
          <h1 style="font-size:24px;margin-bottom:16px;">Something went wrong</h1>
          <p style="color:#999;margin-bottom:20px;">We're having trouble loading MuscleMap.</p>
          <button onclick="window.location.reload()" style="background:#6366f1;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:16px;cursor:pointer;">
            Reload Page
          </button>
          <p style="color:#666;font-size:12px;margin-top:20px;">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `
    }
  }
}

// Initialize storage and cache persistence before rendering
async function initializeApp() {
  bootLog('init', 'Starting app initialization');

  try {
    // Request persistent storage (prevents browser eviction)
    bootLog('init', 'Requesting persistent storage');
    await requestPersistentStorage()
    bootLog('init', 'Persistent storage requested');
  } catch (error) {
    logBootError('requestPersistentStorage', error)
    bootLog('init', 'Persistent storage request failed (non-fatal)', error);
  }

  try {
    // Initialize Apollo cache persistence
    // This restores cached data from IndexedDB for instant loads
    bootLog('init', 'Initializing Apollo cache');
    await initializeApolloCache()
    bootLog('init', 'Apollo cache initialized');
  } catch (error) {
    logBootError('initializeApolloCache', error)
    bootLog('init', 'Apollo cache init failed (non-fatal)', error);
  }

  try {
    // Check and prune storage if needed
    bootLog('init', 'Checking and pruning storage');
    await checkAndPruneStorage()
    bootLog('init', 'Storage pruned');
  } catch (error) {
    logBootError('checkAndPruneStorage', error)
    bootLog('init', 'Storage prune failed (non-fatal)', error);
  }

  // Render the app - always succeeds
  bootLog('init', 'Initialization complete, rendering app');
  renderApp()
}

// Start initialization, but ensure we render even if it fails completely
bootLog('init', 'Calling initializeApp');
initializeApp().catch((error) => {
  logBootError('initializeApp', error)
  bootLog('init', 'initializeApp failed, rendering anyway', error);
  // Critical initialization error - render anyway, app should work without cache persistence
  renderApp()
})

// Report Web Vitals - send to analytics in production, log to console in development
if (import.meta.env.PROD) {
  bootLog('vitals', 'Setting up production web vitals');
  reportWebVitals()
} else {
  bootLog('vitals', 'Setting up dev web vitals');
  logWebVitals()
}

// Register Service Worker for PWA functionality (production only)
if (import.meta.env.PROD) {
  bootLog('sw', 'Registering service worker');
  registerServiceWorker()
  setupControllerChangeHandler()
}

bootLog('init', 'main.tsx execution complete');
