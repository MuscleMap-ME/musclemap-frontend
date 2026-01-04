/**
 * XR (Extended Reality) Utilities
 *
 * Foundation for WebXR-based VR mode:
 * - Device capability detection
 * - Session management
 * - Input handling
 * - Render loop integration
 */

// XR session types
export const XR_SESSION_MODES = {
  INLINE: 'inline',
  IMMERSIVE_VR: 'immersive-vr',
  IMMERSIVE_AR: 'immersive-ar',
};

// Reference space types
export const XR_REFERENCE_SPACES = {
  LOCAL: 'local',
  LOCAL_FLOOR: 'local-floor',
  BOUNDED_FLOOR: 'bounded-floor',
  UNBOUNDED: 'unbounded',
  VIEWER: 'viewer',
};

/**
 * Check if WebXR is supported
 */
export function isWebXRSupported() {
  return 'xr' in navigator;
}

/**
 * Check if a specific XR session mode is supported
 */
export async function isSessionModeSupported(mode = XR_SESSION_MODES.IMMERSIVE_VR) {
  if (!isWebXRSupported()) {
    return false;
  }

  try {
    return await navigator.xr.isSessionSupported(mode);
  } catch (error) {
    console.warn('Error checking XR session support:', error);
    return false;
  }
}

/**
 * Get XR device capabilities
 */
export async function getXRCapabilities() {
  if (!isWebXRSupported()) {
    return {
      supported: false,
      immersiveVR: false,
      immersiveAR: false,
      inline: false,
    };
  }

  const [immersiveVR, immersiveAR, inline] = await Promise.all([
    isSessionModeSupported(XR_SESSION_MODES.IMMERSIVE_VR),
    isSessionModeSupported(XR_SESSION_MODES.IMMERSIVE_AR),
    isSessionModeSupported(XR_SESSION_MODES.INLINE),
  ]);

  return {
    supported: true,
    immersiveVR,
    immersiveAR,
    inline,
  };
}

/**
 * XR Session Manager
 *
 * Handles XR session lifecycle and events
 */
export class XRSessionManager {
  constructor() {
    this.session = null;
    this.referenceSpace = null;
    this.onSessionStart = null;
    this.onSessionEnd = null;
    this.onFrame = null;
    this.animationFrameId = null;
  }

  /**
   * Start an XR session
   */
  async startSession(options = {}) {
    const {
      mode = XR_SESSION_MODES.IMMERSIVE_VR,
      referenceSpaceType = XR_REFERENCE_SPACES.LOCAL_FLOOR,
      optionalFeatures = ['hand-tracking'],
      requiredFeatures = ['local-floor'],
    } = options;

    if (!isWebXRSupported()) {
      throw new Error('WebXR is not supported');
    }

    if (this.session) {
      throw new Error('XR session already active');
    }

    const supported = await isSessionModeSupported(mode);
    if (!supported) {
      throw new Error(`XR session mode "${mode}" is not supported`);
    }

    try {
      this.session = await navigator.xr.requestSession(mode, {
        optionalFeatures,
        requiredFeatures,
      });

      this.referenceSpace = await this.session.requestReferenceSpace(referenceSpaceType);

      // Set up event handlers
      this.session.addEventListener('end', this.handleSessionEnd.bind(this));
      this.session.addEventListener('inputsourceschange', this.handleInputSourcesChange.bind(this));

      if (this.onSessionStart) {
        this.onSessionStart(this.session, this.referenceSpace);
      }

      return { session: this.session, referenceSpace: this.referenceSpace };
    } catch (error) {
      console.error('Failed to start XR session:', error);
      throw error;
    }
  }

  /**
   * End the current XR session
   */
  async endSession() {
    if (!this.session) {
      return;
    }

    if (this.animationFrameId) {
      this.session.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    await this.session.end();
  }

  /**
   * Handle session end event
   */
  handleSessionEnd() {
    this.session = null;
    this.referenceSpace = null;

    if (this.onSessionEnd) {
      this.onSessionEnd();
    }
  }

  /**
   * Handle input sources change
   */
  handleInputSourcesChange(event) {
    // Log added and removed input sources
    for (const inputSource of event.added) {
      console.log('XR input source added:', inputSource.handedness, inputSource.targetRayMode);
    }

    for (const inputSource of event.removed) {
      console.log('XR input source removed:', inputSource.handedness);
    }
  }

  /**
   * Start the render loop
   */
  startRenderLoop(callback) {
    if (!this.session) {
      throw new Error('No active XR session');
    }

    const renderFrame = (time, frame) => {
      this.animationFrameId = this.session.requestAnimationFrame(renderFrame);

      if (callback) {
        callback(time, frame, this.referenceSpace);
      }

      if (this.onFrame) {
        this.onFrame(time, frame, this.referenceSpace);
      }
    };

    this.animationFrameId = this.session.requestAnimationFrame(renderFrame);
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop() {
    if (this.animationFrameId && this.session) {
      this.session.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get current XR pose
   */
  getPose(frame) {
    if (!frame || !this.referenceSpace) {
      return null;
    }

    return frame.getViewerPose(this.referenceSpace);
  }

  /**
   * Check if session is active
   */
  isActive() {
    return !!this.session;
  }
}

/**
 * Create an XR-compatible WebGL context
 */
export function createXRContext(canvas, options = {}) {
  const contextOptions = {
    xrCompatible: true,
    antialias: true,
    alpha: true,
    ...options,
  };

  const gl = canvas.getContext('webgl2', contextOptions) || canvas.getContext('webgl', contextOptions);

  if (!gl) {
    throw new Error('Failed to create WebGL context');
  }

  return gl;
}

/**
 * Configure renderer for XR
 */
export function configureXRRenderer(renderer) {
  if (!renderer) {
    return;
  }

  // For Three.js renderers
  if (renderer.xr) {
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
  }
}

/**
 * Get controller grip space for hand positioning
 */
export function getControllerGripSpace(session, inputSource) {
  if (!session || !inputSource || !inputSource.gripSpace) {
    return null;
  }

  return inputSource.gripSpace;
}

/**
 * VR UI helper - position element in 3D space
 */
export function positionInVR(position, rotation, scale = 1) {
  return {
    position: {
      x: position.x || 0,
      y: position.y || 1.5, // Default eye height
      z: position.z || -2, // In front of viewer
    },
    rotation: {
      x: rotation.x || 0,
      y: rotation.y || 0,
      z: rotation.z || 0,
    },
    scale: {
      x: scale,
      y: scale,
      z: scale,
    },
  };
}

/**
 * XR Button Component helper
 */
export function createXRButton(options = {}) {
  const {
    mode = XR_SESSION_MODES.IMMERSIVE_VR,
    onSessionStart,
    onSessionEnd,
    buttonText = 'Enter VR',
    exitText = 'Exit VR',
    className = 'xr-button',
  } = options;

  const button = document.createElement('button');
  button.className = className;
  button.textContent = buttonText;
  button.disabled = true;

  let session = null;

  // Check support and enable button
  isSessionModeSupported(mode).then((supported) => {
    if (supported) {
      button.disabled = false;
      button.addEventListener('click', async () => {
        if (session) {
          await session.end();
        } else {
          try {
            session = await navigator.xr.requestSession(mode, {
              optionalFeatures: ['hand-tracking'],
              requiredFeatures: ['local-floor'],
            });

            session.addEventListener('end', () => {
              session = null;
              button.textContent = buttonText;
              if (onSessionEnd) onSessionEnd();
            });

            button.textContent = exitText;
            if (onSessionStart) onSessionStart(session);
          } catch (error) {
            console.error('Failed to start XR session:', error);
          }
        }
      });
    } else {
      button.textContent = 'VR Not Supported';
    }
  });

  return button;
}

// Default export
export default {
  isWebXRSupported,
  isSessionModeSupported,
  getXRCapabilities,
  XRSessionManager,
  createXRContext,
  configureXRRenderer,
  positionInVR,
  createXRButton,
  XR_SESSION_MODES,
  XR_REFERENCE_SPACES,
};
