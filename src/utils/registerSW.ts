/**
 * Service Worker Registration Utility
 *
 * Handles registration, updates, and lifecycle management of the
 * MuscleMap service worker for PWA functionality.
 */

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported() {
  return 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (!isServiceWorkerSupported()) {
    console.log('[SW Registration] Service workers not supported');
    return null;
  }

  // Only register in production
  if (import.meta.env.DEV) {
    console.log('[SW Registration] Skipping in development mode');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // Always check for updates
    });

    console.log('[SW Registration] Registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, notify user
            onUpdateAvailable(registration);
          }
        });
      }
    });

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[SW Registration] Failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers
 * @returns {Promise<boolean>}
 */
export async function unregisterServiceWorker() {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('[SW Registration] Unregistered:', success);
    return success;
  } catch (error) {
    console.error('[SW Registration] Unregister failed:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaiting() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCache() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }

  // Also clear caches directly as fallback
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('musclemap-'))
        .map((name) => caches.delete(name))
    );
    console.log('[SW Registration] Caches cleared');
  }
}

/**
 * Called when a new service worker is available
 * You can customize this to show a toast/notification to the user
 */
function onUpdateAvailable(registration) {
  console.log('[SW Registration] Update available');

  // Dispatch custom event that components can listen to
  window.dispatchEvent(new CustomEvent('sw-update-available', {
    detail: { registration }
  }));

  // Auto-update strategy: skip waiting if no active clients
  // This ensures users get updates on next visit without disruption
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Listen for controller changes (new SW activated)
 * Reload the page to ensure consistency
 */
export function setupControllerChangeHandler() {
  if (!isServiceWorkerSupported()) {
    return;
  }

  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[SW Registration] Controller changed, reloading...');
    window.location.reload();
  });
}

/**
 * Get the current service worker registration
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function getRegistration() {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  return navigator.serviceWorker.getRegistration();
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
