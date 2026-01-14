/**
 * useXR - React hook for WebXR session management
 *
 * Provides:
 * - XR device capability detection
 * - Session lifecycle management
 * - Render loop integration
 * - Input source tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isWebXRSupported,
  isSessionModeSupported,
  getXRCapabilities,
  XRSessionManager,
  XR_SESSION_MODES,
  XR_REFERENCE_SPACES,
} from '../utils/xr';

/**
 * XR session states
 */
export const XR_STATE = {
  UNSUPPORTED: 'unsupported',
  CHECKING: 'checking',
  READY: 'ready',
  REQUESTING: 'requesting',
  ACTIVE: 'active',
  ENDING: 'ending',
  ERROR: 'error',
};

/**
 * useXR hook
 *
 * @param {Object} options
 * @param {string} options.mode - XR session mode (default: 'immersive-vr')
 * @param {string} options.referenceSpaceType - Reference space type (default: 'local-floor')
 * @param {string[]} options.optionalFeatures - Optional XR features
 * @param {string[]} options.requiredFeatures - Required XR features
 * @param {Function} options.onSessionStart - Called when session starts
 * @param {Function} options.onSessionEnd - Called when session ends
 * @param {Function} options.onFrame - Called each XR frame
 * @param {Function} options.onError - Called on error
 */
export default function useXR(options = {}) {
  const {
    mode = XR_SESSION_MODES.IMMERSIVE_VR,
    referenceSpaceType = XR_REFERENCE_SPACES.LOCAL_FLOOR,
    optionalFeatures = ['hand-tracking'],
    requiredFeatures = ['local-floor'],
    onSessionStart,
    onSessionEnd,
    onFrame,
    onError,
  } = options;

  const [state, setState] = useState(XR_STATE.CHECKING);
  const [capabilities, setCapabilities] = useState(null);
  const [session, setSession] = useState(null);
  const [referenceSpace, setReferenceSpace] = useState(null);
  const [inputSources, setInputSources] = useState([]);
  const [error, setError] = useState(null);

  const managerRef = useRef(null);
  const mountedRef = useRef(true);

  // Initialize manager and check capabilities
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      if (!isWebXRSupported()) {
        setState(XR_STATE.UNSUPPORTED);
        return;
      }

      try {
        const caps = await getXRCapabilities();
        if (!mountedRef.current) return;

        setCapabilities(caps);

        // Check if requested mode is supported
        const modeSupported = await isSessionModeSupported(mode);
        if (!mountedRef.current) return;

        if (modeSupported) {
          setState(XR_STATE.READY);
        } else {
          setState(XR_STATE.UNSUPPORTED);
        }

        // Create session manager
        managerRef.current = new XRSessionManager();
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err);
        setState(XR_STATE.ERROR);
        onError?.(err);
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      // Clean up session if active
      if (managerRef.current?.isActive()) {
        managerRef.current.endSession().catch(() => {});
      }
    };
  }, [mode, onError]);

  // Track input sources
  useEffect(() => {
    if (!session) return;

    const handleInputSourcesChange = (_event) => {
      setInputSources([...session.inputSources]);
    };

    session.addEventListener('inputsourceschange', handleInputSourcesChange);

    // Set initial input sources
    setInputSources([...session.inputSources]);

    return () => {
      session.removeEventListener('inputsourceschange', handleInputSourcesChange);
    };
  }, [session]);

  /**
   * Start XR session
   */
  const startSession = useCallback(async () => {
    if (!managerRef.current || state !== XR_STATE.READY) {
      return null;
    }

    setState(XR_STATE.REQUESTING);
    setError(null);

    try {
      // Set up callbacks
      managerRef.current.onSessionStart = (sess, refSpace) => {
        if (!mountedRef.current) return;
        setSession(sess);
        setReferenceSpace(refSpace);
        setState(XR_STATE.ACTIVE);
        onSessionStart?.(sess, refSpace);
      };

      managerRef.current.onSessionEnd = () => {
        if (!mountedRef.current) return;
        setSession(null);
        setReferenceSpace(null);
        setInputSources([]);
        setState(XR_STATE.READY);
        onSessionEnd?.();
      };

      managerRef.current.onFrame = onFrame;

      const result = await managerRef.current.startSession({
        mode,
        referenceSpaceType,
        optionalFeatures,
        requiredFeatures,
      });

      return result;
    } catch (err) {
      if (!mountedRef.current) return null;
      setError(err);
      setState(XR_STATE.ERROR);
      onError?.(err);
      return null;
    }
  }, [
    state,
    mode,
    referenceSpaceType,
    optionalFeatures,
    requiredFeatures,
    onSessionStart,
    onSessionEnd,
    onFrame,
    onError,
  ]);

  /**
   * End XR session
   */
  const endSession = useCallback(async () => {
    if (!managerRef.current?.isActive()) {
      return;
    }

    setState(XR_STATE.ENDING);

    try {
      await managerRef.current.endSession();
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
      setState(XR_STATE.ERROR);
      onError?.(err);
    }
  }, [onError]);

  /**
   * Toggle XR session
   */
  const toggleSession = useCallback(async () => {
    if (state === XR_STATE.ACTIVE) {
      await endSession();
    } else if (state === XR_STATE.READY) {
      await startSession();
    }
  }, [state, startSession, endSession]);

  /**
   * Start render loop
   */
  const startRenderLoop = useCallback(
    (callback) => {
      if (!managerRef.current?.isActive()) {
        return;
      }

      managerRef.current.startRenderLoop(callback);
    },
    []
  );

  /**
   * Stop render loop
   */
  const stopRenderLoop = useCallback(() => {
    managerRef.current?.stopRenderLoop();
  }, []);

  /**
   * Get current viewer pose
   */
  const getPose = useCallback(
    (frame) => {
      return managerRef.current?.getPose(frame) || null;
    },
    []
  );

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
    if (capabilities && isSessionModeSupported(mode)) {
      setState(XR_STATE.READY);
    } else {
      setState(XR_STATE.UNSUPPORTED);
    }
  }, [capabilities, mode]);

  return {
    // State
    state,
    isSupported: state !== XR_STATE.UNSUPPORTED,
    isReady: state === XR_STATE.READY,
    isActive: state === XR_STATE.ACTIVE,
    isLoading: state === XR_STATE.REQUESTING || state === XR_STATE.ENDING,
    error,

    // Capabilities
    capabilities,
    supportsVR: capabilities?.immersiveVR ?? false,
    supportsAR: capabilities?.immersiveAR ?? false,

    // Session data
    session,
    referenceSpace,
    inputSources,

    // Actions
    startSession,
    endSession,
    toggleSession,
    startRenderLoop,
    stopRenderLoop,
    getPose,
    resetError,
  };
}

/**
 * useXRButton hook - simplified interface for VR entry button
 */
export function useXRButton(options = {}) {
  const xr = useXR(options);

  const buttonProps = {
    disabled: !xr.isSupported || xr.isLoading,
    onClick: xr.toggleSession,
    'aria-pressed': xr.isActive,
    'aria-busy': xr.isLoading,
  };

  const buttonText = (() => {
    switch (xr.state) {
      case XR_STATE.UNSUPPORTED:
        return 'VR Not Supported';
      case XR_STATE.CHECKING:
        return 'Checking VR...';
      case XR_STATE.REQUESTING:
        return 'Entering VR...';
      case XR_STATE.ACTIVE:
        return 'Exit VR';
      case XR_STATE.ENDING:
        return 'Exiting VR...';
      case XR_STATE.ERROR:
        return 'VR Error';
      default:
        return 'Enter VR';
    }
  })();

  return {
    ...xr,
    buttonProps,
    buttonText,
  };
}
