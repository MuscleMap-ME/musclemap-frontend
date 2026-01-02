import React from 'react'
import ReactDOM from 'react-dom/client'
import { setStorageAdapter, configureHttpClient } from '@musclemap/client'
import { webStorage } from '@musclemap/client/storage/web'
import App from './App'
import './styles/index.css'

// Initialize @musclemap/client storage adapter
setStorageAdapter(webStorage)

// Configure HTTP client for web
configureHttpClient({
  baseUrl: '/api',
  onUnauthorized: () => {
    window.location.href = '/login'
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
