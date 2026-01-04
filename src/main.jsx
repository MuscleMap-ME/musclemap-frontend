import React from 'react'
import ReactDOM from 'react-dom/client'
import { setStorageAdapter, configureHttpClient } from '@musclemap/client'
import App from './App'
import './styles/index.css'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
