import React from 'react'
import ReactDOM from 'react-dom/client'
import { setStorageAdapter, configureHttpClient } from '@musclemap/client'
import App from './App'
import './styles/index.css'
import { reportWebVitals, logWebVitals } from './utils/webVitals'
import { registerServiceWorker, setupControllerChangeHandler } from './utils/registerSW'
import { initializeApolloCache } from './graphql/client'
import { checkAndPruneStorage, requestPersistentStorage } from './lib/storage-manager'

/**
 * Storage adapter that syncs with Zustand auth store
 * Reads token/user from the 'musclemap-auth' localStorage key used by Zustand
 */
const zustandSyncStorage = {
  async getItem(key) {
    try {
      const authData = localStorage.getItem('musclemap-auth')
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
    localStorage.removeItem('musclemap-auth')
    window.location.href = '/login'
  },
})

// Render the app - this MUST succeed even if initialization fails
function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Initialize storage and cache persistence before rendering
async function initializeApp() {
  try {
    // Request persistent storage (prevents browser eviction)
    await requestPersistentStorage()
  } catch {
    // Persistent storage request failed - non-critical
  }

  try {
    // Initialize Apollo cache persistence
    // This restores cached data from IndexedDB for instant loads
    await initializeApolloCache()
  } catch {
    // Apollo cache initialization failed - app will work without persistence
  }

  try {
    // Check and prune storage if needed
    await checkAndPruneStorage()
  } catch {
    // Storage pruning failed - non-critical
  }

  // Render the app - always succeeds
  renderApp()
}

// Start initialization, but ensure we render even if it fails completely
initializeApp().catch(() => {
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
