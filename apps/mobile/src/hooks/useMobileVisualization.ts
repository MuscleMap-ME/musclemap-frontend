/**
 * useMobileVisualization Hook
 *
 * Determines optimal visualization mode (2D vs 3D) based on:
 * - Device capabilities (GPU, memory)
 * - Battery level
 * - User preferences stored in AsyncStorage
 * - Performance mode settings
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, PixelRatio } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type VisualizationMode = '2d' | '3d';
export type VisualizationPreference = 'auto' | 'always-3d' | 'always-2d';

export interface MobileVisualizationSettings {
  /** Whether to use 3D rendering */
  use3D: boolean;
  /** Current visualization mode */
  mode: VisualizationMode;
  /** User's preference setting */
  preference: VisualizationPreference;
  /** Whether device supports 3D (WebGL via expo-gl) */
  supports3D: boolean;
  /** Whether in low power mode */
  lowPowerMode: boolean;
  /** Reason for current mode selection */
  reason: string;
  /** Update user preference */
  setPreference: (pref: VisualizationPreference) => Promise<void>;
}

const PREFERENCE_KEY = 'musclemap_visualization_pref';

// Device capability thresholds
const MIN_PIXEL_RATIO_FOR_3D = 2; // Avoid 3D on very low-res devices
const HIGH_END_PIXEL_RATIO = 3;

/**
 * Detect if device is likely capable of smooth 3D rendering
 */
function detectDeviceCapability(): { supports3D: boolean; isHighEnd: boolean; reason: string } {
  const pixelRatio = PixelRatio.get();
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  // iOS devices with expo-gl generally perform well
  if (isIOS) {
    return {
      supports3D: true,
      isHighEnd: true,
      reason: 'iOS device with Metal support',
    };
  }

  // Android - be more conservative
  if (isAndroid) {
    if (pixelRatio >= HIGH_END_PIXEL_RATIO) {
      return {
        supports3D: true,
        isHighEnd: true,
        reason: 'High-end Android device',
      };
    }

    if (pixelRatio >= MIN_PIXEL_RATIO_FOR_3D) {
      return {
        supports3D: true,
        isHighEnd: false,
        reason: 'Mid-range Android device',
      };
    }

    return {
      supports3D: false,
      isHighEnd: false,
      reason: 'Low-end Android device - using 2D for performance',
    };
  }

  // Web or other - assume capable
  return {
    supports3D: true,
    isHighEnd: true,
    reason: 'Platform supports WebGL',
  };
}

/**
 * Hook to manage mobile visualization settings
 */
export function useMobileVisualization(): MobileVisualizationSettings {
  const [preference, setPreferenceState] = useState<VisualizationPreference>('auto');
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Detect device capabilities once
  const deviceCapability = useMemo(() => detectDeviceCapability(), []);

  // Load saved preference
  useEffect(() => {
    async function loadPreference() {
      try {
        const saved = await SecureStore.getItemAsync(PREFERENCE_KEY);
        if (saved && ['auto', 'always-3d', 'always-2d'].includes(saved)) {
          setPreferenceState(saved as VisualizationPreference);
        }
      } catch (err) {
        console.warn('Failed to load visualization preference:', err);
      } finally {
        setLoaded(true);
      }
    }

    loadPreference();
  }, []);

  // Save preference when changed
  const setPreference = useCallback(async (pref: VisualizationPreference) => {
    setPreferenceState(pref);
    try {
      await SecureStore.setItemAsync(PREFERENCE_KEY, pref);
    } catch (err) {
      console.warn('Failed to save visualization preference:', err);
    }
  }, []);

  // Determine actual mode based on preference and capabilities
  const settings = useMemo((): Omit<MobileVisualizationSettings, 'setPreference'> => {
    const { supports3D, isHighEnd, reason: deviceReason } = deviceCapability;

    // If user explicitly set preference, honor it (if possible)
    if (preference === 'always-3d') {
      if (supports3D) {
        return {
          use3D: true,
          mode: '3d',
          preference,
          supports3D,
          lowPowerMode,
          reason: 'User preference: always 3D',
        };
      }
      return {
        use3D: false,
        mode: '2d',
        preference,
        supports3D,
        lowPowerMode,
        reason: 'User prefers 3D but device does not support it',
      };
    }

    if (preference === 'always-2d') {
      return {
        use3D: false,
        mode: '2d',
        preference,
        supports3D,
        lowPowerMode,
        reason: 'User preference: always 2D',
      };
    }

    // Auto mode - smart detection
    if (!supports3D) {
      return {
        use3D: false,
        mode: '2d',
        preference,
        supports3D,
        lowPowerMode,
        reason: deviceReason,
      };
    }

    if (lowPowerMode) {
      return {
        use3D: false,
        mode: '2d',
        preference,
        supports3D,
        lowPowerMode,
        reason: 'Low power mode enabled - using 2D for battery savings',
      };
    }

    // High-end devices default to 3D, others to 2D
    if (isHighEnd) {
      return {
        use3D: true,
        mode: '3d',
        preference,
        supports3D,
        lowPowerMode,
        reason: 'Auto-detected high-end device - using 3D',
      };
    }

    // Mid-range: default to 2D but allow user override
    return {
      use3D: false,
      mode: '2d',
      preference,
      supports3D,
      lowPowerMode,
      reason: 'Auto-detected mid-range device - defaulting to 2D for performance',
    };
  }, [preference, lowPowerMode, deviceCapability]);

  return {
    ...settings,
    setPreference,
  };
}

export default useMobileVisualization;
