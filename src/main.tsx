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
      const authData = storage.getItem('musclemap-auth')
      if (!authData) return null

      const parsed = JSON.parse(authData)
      const state = parsed?.state
      if (!state) return null

      // Map the client storage keys to Zustand state
      if (key === 'musclemap_token') {
        return state.token || null
      }
      if (key === 'musclemap_user') {
        return state.user ? JSON.stringify(state.user) : null
      }
      return null
    } catch {
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
setStorageAdapter(zustandSyncStorage)

// Configure HTTP client for web
configureHttpClient({
  baseUrl: '/api',
  onUnauthorized: () => {
    // Clear Zustand auth state and redirect
    storage.removeItem('musclemap-auth')
    window.location.href = '/login'
  },
})

// Render the app - this MUST succeed even if initialization fails
function renderApp() {
  try {
    const root = document.getElementById('root')
    if (!root) {
      logBootError('render', new Error('Root element not found'))
      return
    }
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (error) {
    logBootError('render', error)
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
  try {
    // Request persistent storage (prevents browser eviction)
    await requestPersistentStorage()
  } catch (error) {
    logBootError('requestPersistentStorage', error)
  }

  try {
    // Initialize Apollo cache persistence
    // This restores cached data from IndexedDB for instant loads
    await initializeApolloCache()
  } catch (error) {
    logBootError('initializeApolloCache', error)
  }

  try {
    // Check and prune storage if needed
    await checkAndPruneStorage()
  } catch (error) {
    logBootError('checkAndPruneStorage', error)
  }

  // Render the app - always succeeds
  renderApp()
}

// Start initialization, but ensure we render even if it fails completely
initializeApp().catch((error) => {
  logBootError('initializeApp', error)
  // Critical initialization error - render anyway, app should work without cache persistence
  renderApp()
})

// Report Web Vitals - send to analytics in production, log to console in development
if (import.meta.env.PROD) {
  reportWebVitals()
} else {
  logWebVitals()
}

// Register Service Worker for PWA functionality (production only)
if (import.meta.env.PROD) {
  registerServiceWorker()
  setupControllerChangeHandler()
}
