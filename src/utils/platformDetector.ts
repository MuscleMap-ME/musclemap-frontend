/**
 * Platform Detector Utility
 *
 * Detects the user's OS, browser, and privacy settings to provide
 * targeted geolocation help instructions.
 */

export interface PlatformInfo {
  os: 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';
  browser: 'safari' | 'chrome' | 'firefox' | 'brave' | 'edge' | 'samsung' | 'unknown';
  isMobile: boolean;
  isTablet: boolean;
  isPrivacyMode: boolean;
  isLockdownMode: boolean;
  osVersion: string | null;
  browserVersion: string | null;
}

// Cache the result to avoid repeated detection
let cachedPlatformInfo: PlatformInfo | null = null;

/**
 * Detect the user's platform, browser, and privacy settings
 */
export function detectPlatform(): PlatformInfo {
  if (cachedPlatformInfo) {
    return cachedPlatformInfo;
  }

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return getDefaultPlatformInfo();
  }

  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  const platform = navigator.platform || '';

  const info: PlatformInfo = {
    os: detectOS(ua, platform),
    browser: detectBrowser(ua, vendor),
    isMobile: detectMobile(ua),
    isTablet: detectTablet(ua),
    isPrivacyMode: detectPrivacyMode(),
    isLockdownMode: detectLockdownMode(ua),
    osVersion: detectOSVersion(ua),
    browserVersion: detectBrowserVersion(ua),
  };

  cachedPlatformInfo = info;
  return info;
}

/**
 * Reset the cached platform info (useful for testing)
 */
export function resetPlatformCache(): void {
  cachedPlatformInfo = null;
}

/**
 * Get a human-readable platform description
 */
export function getPlatformDescription(info: PlatformInfo): string {
  const osNames: Record<string, string> = {
    ios: 'iOS',
    android: 'Android',
    macos: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    unknown: 'Unknown OS',
  };

  const browserNames: Record<string, string> = {
    safari: 'Safari',
    chrome: 'Chrome',
    firefox: 'Firefox',
    brave: 'Brave',
    edge: 'Edge',
    samsung: 'Samsung Internet',
    unknown: 'Browser',
  };

  const os = osNames[info.os];
  const browser = browserNames[info.browser];
  const device = info.isMobile ? 'Mobile' : info.isTablet ? 'Tablet' : 'Desktop';

  return `${browser} on ${os} (${device})`;
}

/**
 * Get the key for platform-specific instructions
 */
export function getInstructionKey(info: PlatformInfo): string {
  // iOS has browser-specific settings
  if (info.os === 'ios') {
    if (info.browser === 'brave') return 'ios-brave';
    if (info.browser === 'chrome') return 'ios-chrome';
    if (info.browser === 'firefox') return 'ios-firefox';
    return 'ios-safari'; // Default for iOS
  }

  // Android
  if (info.os === 'android') {
    if (info.browser === 'samsung') return 'android-samsung';
    if (info.browser === 'firefox') return 'android-firefox';
    return 'android-chrome'; // Default for Android
  }

  // Desktop
  if (info.os === 'macos') {
    if (info.browser === 'safari') return 'desktop-safari';
    if (info.browser === 'brave') return 'desktop-brave';
    if (info.browser === 'firefox') return 'desktop-firefox';
    return 'desktop-chrome';
  }

  if (info.os === 'windows') {
    if (info.browser === 'edge') return 'desktop-edge';
    if (info.browser === 'firefox') return 'desktop-firefox';
    if (info.browser === 'brave') return 'desktop-brave';
    return 'desktop-chrome';
  }

  // Fallback
  return 'generic';
}

// --- Detection helpers ---

function detectOS(ua: string, platform: string): PlatformInfo['os'] {
  // iOS detection (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  // Android
  if (/Android/.test(ua)) {
    return 'android';
  }

  // macOS (but not iOS on iPad pretending to be Mac)
  if (/Mac OS X/.test(ua) && navigator.maxTouchPoints <= 1) {
    return 'macos';
  }

  // Windows
  if (/Windows/.test(ua)) {
    return 'windows';
  }

  // Linux
  if (/Linux/.test(ua) && !/Android/.test(ua)) {
    return 'linux';
  }

  return 'unknown';
}

function detectBrowser(ua: string, vendor: string): PlatformInfo['browser'] {
  // Brave - check for Brave-specific navigator property
  if ((navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave?.isBrave) {
    return 'brave';
  }

  // Brave fallback - check UA patterns (less reliable)
  if (/Brave/.test(ua)) {
    return 'brave';
  }

  // Edge (Chromium-based)
  if (/Edg\//.test(ua)) {
    return 'edge';
  }

  // Samsung Internet
  if (/SamsungBrowser/.test(ua)) {
    return 'samsung';
  }

  // Firefox
  if (/Firefox/.test(ua) && !/Seamonkey/.test(ua)) {
    return 'firefox';
  }

  // Chrome (must check after Edge since Edge also has Chrome in UA)
  if (/Chrome/.test(ua) && /Google Inc/.test(vendor)) {
    return 'chrome';
  }

  // Safari (must check after Chrome since Chrome also has Safari in UA)
  if (/Safari/.test(ua) && /Apple Computer/.test(vendor)) {
    return 'safari';
  }

  return 'unknown';
}

function detectMobile(ua: string): boolean {
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function detectTablet(ua: string): boolean {
  return /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
}

function detectPrivacyMode(): boolean {
  // Check for Brave shields indicator
  const isBrave = !!(navigator as unknown as { brave?: unknown }).brave;

  // Try to detect private/incognito mode
  // This is an approximation - browsers make it hard to detect
  try {
    // Safari private mode blocks localStorage
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
  } catch {
    return true; // Likely private mode
  }

  // Check for Do Not Track
  const dnt = navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1';

  return isBrave || dnt;
}

function detectLockdownMode(ua: string): boolean {
  // iOS Lockdown Mode is hard to detect directly
  // We can infer it from certain behaviors:
  // 1. WebGL is disabled
  // 2. JIT compilation is limited
  // 3. Certain fonts are unavailable

  // Check for iOS first
  if (!/iPad|iPhone|iPod/.test(ua)) {
    return false;
  }

  // Try to detect WebGL availability (Lockdown Mode disables it)
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      return true; // Likely Lockdown Mode
    }
  } catch {
    return true;
  }

  return false;
}

function detectOSVersion(ua: string): string | null {
  // iOS version
  const iosMatch = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
  if (iosMatch) {
    return iosMatch[1].replace(/_/g, '.');
  }

  // Android version
  const androidMatch = ua.match(/Android (\d+\.?\d*)/);
  if (androidMatch) {
    return androidMatch[1];
  }

  // macOS version
  const macMatch = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
  if (macMatch) {
    return macMatch[1].replace(/_/g, '.');
  }

  // Windows version
  const winMatch = ua.match(/Windows NT (\d+\.?\d*)/);
  if (winMatch) {
    const ntVersions: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
    };
    return ntVersions[winMatch[1]] || winMatch[1];
  }

  return null;
}

function detectBrowserVersion(ua: string): string | null {
  // Chrome
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch && !/Edg\//.test(ua)) {
    return chromeMatch[1];
  }

  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  if (firefoxMatch) {
    return firefoxMatch[1];
  }

  // Safari
  const safariMatch = ua.match(/Version\/(\d+)/);
  if (safariMatch && /Safari/.test(ua)) {
    return safariMatch[1];
  }

  // Edge
  const edgeMatch = ua.match(/Edg\/(\d+)/);
  if (edgeMatch) {
    return edgeMatch[1];
  }

  return null;
}

function getDefaultPlatformInfo(): PlatformInfo {
  return {
    os: 'unknown',
    browser: 'unknown',
    isMobile: false,
    isTablet: false,
    isPrivacyMode: false,
    isLockdownMode: false,
    osVersion: null,
    browserVersion: null,
  };
}

export default detectPlatform;
