/**
 * ButtonEffects - Enhanced button micro-interactions
 *
 * Canvas-based ripple effects and feedback hooks for glass buttons.
 * Provides tactile visual feedback while respecting prefers-reduced-motion.
 *
 * @module ButtonEffects
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

// ============================================
// CONSTANTS
// ============================================

/**
 * Ripple colors matched to button variants
 */
const RIPPLE_COLORS = {
  glass: 'rgba(255, 255, 255, 0.35)',
  primary: 'rgba(0, 102, 255, 0.4)',
  pulse: 'rgba(255, 51, 102, 0.4)',
  ghost: 'rgba(255, 255, 255, 0.25)',
};

/**
 * Glow colors matched to button variants for hover effect
 */
const GLOW_COLORS = {
  glass: 'rgba(255, 255, 255, 0.15)',
  primary: 'rgba(0, 102, 255, 0.35)',
  pulse: 'rgba(255, 51, 102, 0.35)',
  ghost: 'rgba(255, 255, 255, 0.1)',
};

/**
 * Success animation types
 */
const SUCCESS_ANIMATION_TYPES = {
  burst: 'burst',
  checkmark: 'checkmark',
  glow: 'glow',
  none: 'none',
};

/**
 * Animation durations
 */
const DURATIONS = {
  ripple: 600, // ms for ripple to expand and fade
  press: 100,  // ms for press feedback
  success: 600, // ms for success animation (increased for glow effect)
  shake: 500, // ms for error shake animation
  burst: 800, // ms for success burst animation
};

/**
 * Haptic vibration pattern for mobile devices
 * Short pulse pattern feels satisfying on tap
 */
const HAPTIC_PATTERN = [10]; // Single 10ms vibration

// ============================================
// HAPTIC FEEDBACK UTILITY
// ============================================

/**
 * triggerHaptic - Trigger haptic feedback on mobile devices
 *
 * Uses the Vibration API when available. Fails silently on
 * devices that don't support haptic feedback.
 *
 * @param {number[]} pattern - Vibration pattern in ms (default: short pulse)
 */
export function triggerHaptic(pattern = HAPTIC_PATTERN) {
  // Check for reduced motion preference
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  // Check for Vibration API support
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration not allowed
    }
  }
}

// ============================================
// SOUND EFFECTS UTILITIES
// ============================================

/**
 * Audio context singleton for Web Audio API sounds
 * Created lazily on first use to avoid autoplay issues
 */
let audioContext = null;

/**
 * getAudioContext - Get or create the shared AudioContext
 *
 * @returns {AudioContext|null} The audio context or null if not supported
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContext = new AudioContext();
      }
    } catch {
      // Web Audio API not supported
      return null;
    }
  }

  return audioContext;
}

/**
 * playClickSound - Play a subtle click sound using Web Audio API
 *
 * Creates a short, satisfying click sound without requiring audio files.
 * The sound is a quick sine wave with exponential decay.
 *
 * @param {Object} options - Sound configuration
 * @param {number} options.frequency - Base frequency in Hz (default: 1200)
 * @param {number} options.duration - Sound duration in seconds (default: 0.05)
 * @param {number} options.volume - Volume level 0-1 (default: 0.15)
 */
export function playClickSound({ frequency = 1200, duration = 0.05, volume = 0.15 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  try {
    // Create oscillator for the click tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configure the click sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.5,
      ctx.currentTime + duration
    );

    // Quick attack, exponential decay for satisfying click
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    // Play the sound
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio playback fails
  }
}

/**
 * playSuccessSound - Play a satisfying success sound
 *
 * Creates a pleasant two-tone chime for success feedback.
 */
export function playSuccessSound({ volume = 0.12 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  try {
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.value = 880; // A5
    gain1.gain.setValueAtTime(volume, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second tone (higher, delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.value = 1320; // E6
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(volume, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.25);
  } catch {
    // Silently fail
  }
}

/**
 * useSound - Hook for managing button sounds
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether sounds are enabled
 * @param {string} options.variant - Button variant for sound customization
 *
 * @returns {Object} Sound trigger functions
 */
export function useSound({ enabled = false, variant = 'primary' } = {}) {
  const reducedMotion = useReducedMotion();

  const playClick = useCallback(() => {
    if (!enabled || reducedMotion) return;

    // Slightly different frequencies for different variants
    const frequencies = {
      glass: 1100,
      primary: 1200,
      pulse: 1400,
      ghost: 1000,
    };

    playClickSound({ frequency: frequencies[variant] || 1200 });
  }, [enabled, reducedMotion, variant]);

  const playSuccess = useCallback(() => {
    if (!enabled || reducedMotion) return;
    playSuccessSound();
  }, [enabled, reducedMotion]);

  return { playClick, playSuccess };
}

// ============================================
// RIPPLE EFFECT COMPONENT (Canvas-based)
// ============================================

/**
 * RippleEffect - Canvas-based ripple animation
 *
 * Uses requestAnimationFrame for smooth 60fps animations.
 * Canvas approach is more performant than DOM-based ripples
 * as it avoids layout thrashing.
 *
 * @param {Object} props
 * @param {string} props.variant - Button variant for color matching
 * @param {string} props.className - Additional CSS classes
 */
export const RippleEffect = forwardRef(
  ({ variant = 'glass', className = '' }, ref) => {
    const canvasRef = useRef(null);
    const ripplesRef = useRef([]);
    const animationRef = useRef(null);
    const reducedMotion = useReducedMotion();

    // Expose trigger method to parent
    useImperativeHandle(ref, () => ({
      trigger: (x, y) => {
        if (reducedMotion) return;
        addRipple(x, y);
      },
    }));

    /**
     * Animation loop using requestAnimationFrame
     */
    const animate = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const now = performance.now();

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Filter out completed ripples and draw active ones
      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        const elapsed = now - ripple.startTime;
        const progress = Math.min(elapsed / DURATIONS.ripple, 1);

        if (progress >= 1) return false;

        // Easing: ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const radius = ripple.maxRadius * eased;
        const opacity = 1 - progress;

        // Draw ripple
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = ripple.color.replace(
          /[\d.]+\)$/,
          `${opacity * parseFloat(ripple.color.match(/[\d.]+\)$/)[0])})`
        );
        ctx.fill();

        return true;
      });

      // Continue animation if ripples remain
      if (ripplesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    }, []);

    /**
     * Add a new ripple at the specified position
     */
    const addRipple = useCallback((x, y) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const maxRadius = Math.sqrt(
        Math.pow(Math.max(x, rect.width - x), 2) +
        Math.pow(Math.max(y, rect.height - y), 2)
      );

      ripplesRef.current.push({
        x,
        y,
        startTime: performance.now(),
        maxRadius,
        color: RIPPLE_COLORS[variant] || RIPPLE_COLORS.glass,
      });

      // Start animation loop if not running
      if (!animationRef.current) {
        animate();
      }
    }, [variant, animate]);

    /**
     * Handle canvas resize
     */
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const updateSize = () => {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
      };

      updateSize();
      const resizeObserver = new ResizeObserver(updateSize);
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }

      return () => {
        resizeObserver.disconnect();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none rounded-inherit ${className}`}
        style={{ borderRadius: 'inherit' }}
      />
    );
  }
);

RippleEffect.displayName = 'RippleEffect';

// ============================================
// SUCCESS ANIMATION COMPONENT
// ============================================

/**
 * Success animation variant colors
 */
const SUCCESS_COLORS = {
  glass: { check: '#00ff88', glow: 'rgba(0, 255, 136, 0.6)', brand: 'rgba(255, 255, 255, 0.4)' },
  primary: { check: '#ffffff', glow: 'rgba(0, 255, 136, 0.6)', brand: 'rgba(0, 102, 255, 0.6)' },
  pulse: { check: '#ffffff', glow: 'rgba(255, 51, 102, 0.6)', brand: 'rgba(255, 51, 102, 0.6)' },
  ghost: { check: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)', brand: 'rgba(255, 255, 255, 0.3)' },
};

/**
 * SuccessEffect - Multi-type success animation
 *
 * Supports different animation types:
 * - 'checkmark': Classic checkmark with green glow pulse (default)
 * - 'burst': Particle explosion celebration
 * - 'glow': Intense brand-colored glow pulse
 * - 'none': No animation
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether to show the animation
 * @param {string} props.variant - Button variant for color matching
 * @param {'checkmark' | 'burst' | 'glow' | 'none'} props.animationType - Type of success animation
 * @param {Function} props.onComplete - Callback when animation completes
 */
export const SuccessEffect = ({
  active,
  variant = 'primary',
  animationType = 'checkmark',
  onComplete,
}) => {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  const colors = SUCCESS_COLORS[variant] || SUCCESS_COLORS.primary;

  useEffect(() => {
    if (active && animationType !== 'none') {
      setVisible(true);

      // Trigger burst particles if animationType is 'burst'
      if (animationType === 'burst' && !reducedMotion) {
        createBurstParticles();
      }

      const duration = animationType === 'burst' ? DURATIONS.burst : DURATIONS.success;
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, animationType, onComplete, reducedMotion]);

  // Create burst particles for 'burst' animation type
  const createBurstParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const burstColors = {
      glass: ['#ffffff', '#0066ff', '#00aaff', '#00ff88'],
      primary: ['#0066ff', '#00aaff', '#ffffff', '#00ff88'],
      pulse: ['#ff3366', '#ff6699', '#ffffff', '#ff99bb'],
      ghost: ['#ffffff', '#94a3b8', '#64748b', '#00ff88'],
    };

    const colorSet = burstColors[variant] || burstColors.primary;

    // Create 30 particles shooting outward
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.3;
      const velocity = Math.random() * 4 + 3;
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 5 + 2,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
        opacity: 1,
        decay: Math.random() * 0.02 + 0.012,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    // Start animation
    if (!animationRef.current) {
      animateBurst();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const animateBurst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.vy += 0.08; // gravity
      particle.opacity -= particle.decay;
      particle.rotation += particle.rotationSpeed;

      if (particle.opacity <= 0) return false;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;

      // Draw star shape for more festive look
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const outerRadius = particle.size;
        const innerRadius = particle.size * 0.4;
        if (i === 0) {
          ctx.moveTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        } else {
          ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        }
        const innerAngle = angle + Math.PI / 5;
        ctx.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      return true;
    });

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animateBurst);
    } else {
      animationRef.current = null;
    }
  }, []);

  // Handle canvas resize for burst effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!visible || animationType === 'none') return null;

  // Render based on animation type
  if (animationType === 'burst') {
    return (
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: 'inherit' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ borderRadius: 'inherit' }}
        />
      </div>
    );
  }

  if (animationType === 'glow') {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          borderRadius: 'inherit',
        }}
      >
        {/* Intense brand glow pulse */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${colors.brand} 0%, transparent 60%)`,
            animation: reducedMotion ? 'none' : 'success-intense-glow 0.6s ease-out forwards',
            borderRadius: 'inherit',
          }}
        />
        {/* Outer ring pulse */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `0 0 30px 10px ${colors.brand}, inset 0 0 20px 5px ${colors.brand}`,
            animation: reducedMotion ? 'none' : 'success-ring-pulse 0.6s ease-out forwards',
            borderRadius: 'inherit',
          }}
        />
      </div>
    );
  }

  // Default: checkmark animation
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{
        animation: reducedMotion ? 'none' : 'success-glow 0.6s ease-out forwards',
        borderRadius: 'inherit',
      }}
    >
      {/* Green glow background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`,
          animation: reducedMotion ? 'none' : 'success-glow-pulse 0.6s ease-out forwards',
          borderRadius: 'inherit',
        }}
      />
      {/* Checkmark icon */}
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 relative z-10"
        style={{
          animation: reducedMotion ? 'none' : 'success-check 0.4s ease-out forwards',
          filter: reducedMotion ? 'none' : `drop-shadow(0 0 8px ${colors.glow})`,
        }}
      >
        <path
          fill="none"
          stroke={colors.check}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
          style={{
            strokeDasharray: 24,
            strokeDashoffset: reducedMotion ? 0 : 24,
            animation: reducedMotion ? 'none' : 'success-check-path 0.4s ease-out 0.1s forwards',
          }}
        />
      </svg>
    </div>
  );
};

// ============================================
// BUTTON FEEDBACK HOOK
// ============================================

/**
 * useButtonFeedback - Hook for managing button interaction states
 *
 * Handles press feedback, success states, error states, and coordinates with ripple effects.
 * Respects prefers-reduced-motion for accessibility.
 *
 * @param {Object} options
 * @param {'ripple' | 'pulse' | 'shake' | 'burst' | 'none'} options.feedback - Type of click feedback
 * @param {Function} options.onSuccess - Callback for success state
 * @param {Function} options.onError - Callback for error state
 * @param {boolean} options.disabled - Whether button is disabled
 *
 * @returns {Object} Feedback state and handlers
 *
 * @example
 * const { handlers, isPressed, showSuccess, showError, rippleRef, triggerSuccess, triggerError } = useButtonFeedback({
 *   feedback: 'ripple',
 *   onSuccess: () => console.log('Success!'),
 *   onError: () => console.log('Error!'),
 * });
 *
 * <button {...handlers}>Click me</button>
 */
export function useButtonFeedback({
  feedback = 'ripple',
  onSuccess,
  onError,
  disabled = false,
} = {}) {
  const [isPressed, setIsPressed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const rippleRef = useRef(null);
  const burstRef = useRef(null);
  const reducedMotion = useReducedMotion();

  /**
   * Trigger success animation
   */
  const triggerSuccess = useCallback(() => {
    if (reducedMotion) {
      onSuccess?.();
      return;
    }
    setShowSuccess(true);
  }, [reducedMotion, onSuccess]);

  /**
   * Trigger error shake animation
   */
  const triggerError = useCallback(() => {
    if (reducedMotion) {
      onError?.();
      return;
    }
    setShowError(true);
  }, [reducedMotion, onError]);

  /**
   * Trigger burst animation
   */
  const triggerBurst = useCallback(() => {
    if (reducedMotion) return;
    setShowBurst(true);
    burstRef.current?.trigger();
  }, [reducedMotion]);

  /**
   * Handle success animation completion
   */
  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    onSuccess?.();
  }, [onSuccess]);

  /**
   * Handle error animation completion
   */
  const handleErrorComplete = useCallback(() => {
    setShowError(false);
    onError?.();
  }, [onError]);

  /**
   * Handle burst animation completion
   */
  const handleBurstComplete = useCallback(() => {
    setShowBurst(false);
  }, []);

  /**
   * Handle mouse/touch down
   */
  const handlePressStart = useCallback(
    (e) => {
      if (disabled) return;

      setIsPressed(true);

      // Trigger ripple at click position
      if (feedback === 'ripple' && rippleRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        rippleRef.current.trigger(x, y);
      }

      // Trigger burst on click
      if (feedback === 'burst') {
        triggerBurst();
      }
    },
    [disabled, feedback, triggerBurst]
  );

  /**
   * Handle mouse/touch up
   */
  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  /**
   * Combined event handlers
   */
  const handlers = {
    onMouseDown: handlePressStart,
    onMouseUp: handlePressEnd,
    onMouseLeave: handlePressEnd,
    onTouchStart: handlePressStart,
    onTouchEnd: handlePressEnd,
  };

  return {
    handlers,
    isPressed,
    showSuccess,
    showError,
    showBurst,
    rippleRef,
    burstRef,
    triggerSuccess,
    triggerError,
    triggerBurst,
    handleSuccessComplete,
    handleErrorComplete,
    handleBurstComplete,
    reducedMotion,
  };
}

// ============================================
// REDUCED MOTION HOOK
// ============================================

/**
 * useReducedMotion - Hook to detect prefers-reduced-motion
 *
 * This hook now uses the enhanced useReducedMotion from hooks/useReducedMotion.js
 * which supports both system preference AND user override stored in localStorage.
 *
 * @returns {boolean} True if user prefers reduced motion (motionAllowed === false)
 *
 * For the full API with user preference controls, import from hooks/useReducedMotion.js:
 * @example
 * import { useReducedMotion as useReducedMotionFull } from '../../hooks/useReducedMotion';
 * const { prefersReducedMotion, motionAllowed, userMotionPref, setUserMotionPref } = useReducedMotionFull();
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for user override in localStorage
    const MOTION_PREF_KEY = 'musclemap_motion_preference';
    const _stored = localStorage.getItem(MOTION_PREF_KEY);

    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Determine effective preference
    const updatePreference = () => {
      const systemPrefers = mediaQuery.matches;
      const currentStored = localStorage.getItem(MOTION_PREF_KEY);

      if (currentStored === 'reduced') {
        setReducedMotion(true);
      } else if (currentStored === 'full') {
        setReducedMotion(false);
      } else {
        // 'system' or null - follow system preference
        setReducedMotion(systemPrefers);
      }
    };

    updatePreference();

    // Listen for system preference changes
    const handler = () => updatePreference();
    mediaQuery.addEventListener('change', handler);

    // Listen for localStorage changes (cross-tab sync)
    const storageHandler = (e) => {
      if (e.key === MOTION_PREF_KEY) {
        updatePreference();
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  return reducedMotion;
}

// ============================================
// PULSE EFFECT COMPONENT
// ============================================

/**
 * PulseEffect - Radial pulse animation from center
 *
 * Alternative to ripple for buttons that need attention-grabbing feedback.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether to trigger pulse
 * @param {string} props.variant - Button variant for color matching
 */
export const PulseEffect = ({ active, variant = 'primary' }) => {
  const [pulses, setPulses] = useState([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (active && !reducedMotion) {
      const id = Date.now();
      setPulses((prev) => [...prev, id]);

      const timer = setTimeout(() => {
        setPulses((prev) => prev.filter((p) => p !== id));
      }, DURATIONS.ripple);

      return () => clearTimeout(timer);
    }
  }, [active, reducedMotion]);

  const color = RIPPLE_COLORS[variant] || RIPPLE_COLORS.primary;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ borderRadius: 'inherit' }}>
      {pulses.map((id) => (
        <div
          key={id}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{
              backgroundColor: color,
              animation: `pulse-expand ${DURATIONS.ripple}ms ease-out forwards`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// ============================================
// GLOW EFFECT COMPONENT
// ============================================

/**
 * GlowEffect - Ambient glow on hover
 *
 * Creates a soft glow around the button that matches the variant color.
 * The glow grows slightly on hover for enhanced visual feedback.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether to show the glow (hover state)
 * @param {string} props.variant - Button variant for color matching
 */
export const GlowEffect = ({ active, variant = 'primary' }) => {
  const reducedMotion = useReducedMotion();
  const glowColor = GLOW_COLORS[variant] || GLOW_COLORS.primary;

  if (reducedMotion) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none transition-all duration-300"
      style={{
        borderRadius: 'inherit',
        opacity: active ? 1 : 0,
        boxShadow: active
          ? `0 0 20px 4px ${glowColor}, 0 0 40px 8px ${glowColor.replace(/[\d.]+\)$/, '0.15)')}`
          : 'none',
        transform: active ? 'scale(1.02)' : 'scale(1)',
      }}
    />
  );
};

// ============================================
// SHAKE EFFECT COMPONENT
// ============================================

/**
 * ShakeEffect - Error shake animation
 *
 * Provides horizontal shake animation for error feedback.
 * Automatically resets after animation completes.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether to trigger shake
 * @param {Function} props.onComplete - Callback when animation completes
 */
export const ShakeEffect = ({ active, onComplete }) => {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (active && !reducedMotion) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, DURATIONS.shake);
      return () => clearTimeout(timer);
    } else if (active && reducedMotion) {
      // Immediately complete for reduced motion
      onComplete?.();
    }
  }, [active, onComplete, reducedMotion]);

  return null; // Shake is applied via parent's animation state
};

// ============================================
// BURST EFFECT COMPONENT
// ============================================

/**
 * BurstEffect - Mini confetti burst contained within button
 *
 * Canvas-based particle burst that stays within button bounds.
 * Lighter weight than full SuccessBurst for inline use.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether to trigger burst
 * @param {string} props.variant - Button variant for color matching
 * @param {Function} props.onComplete - Callback when animation completes
 */
export const BurstEffect = forwardRef(({ active, variant = 'primary', onComplete }, ref) => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  // Burst colors based on variant
  const BURST_COLORS = {
    glass: ['#ffffff', '#0066ff', '#00aaff'],
    primary: ['#0066ff', '#00aaff', '#ffffff'],
    pulse: ['#00ff88', '#22c55e', '#10b981'],
    ghost: ['#ffffff', '#94a3b8', '#64748b'],
  };

  // Expose trigger method
  useImperativeHandle(ref, () => ({
    trigger: () => {
      if (reducedMotion) return;
      createBurst();
    },
  }));

  const createBurst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const colors = BURST_COLORS[variant] || BURST_COLORS.primary;

    // Create 20-30 small particles
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const velocity = Math.random() * 3 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 4 + 2,
        color,
        opacity: 1,
        decay: Math.random() * 0.02 + 0.015,
        startTime: performance.now(),
      });
    }

    // Start animation
    if (!animationRef.current) {
      animate();
    }

    // Complete callback
    setTimeout(() => {
      onComplete?.();
    }, DURATIONS.burst);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, onComplete, reducedMotion]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.vy += 0.1; // gravity
      particle.opacity -= particle.decay;

      if (particle.opacity <= 0) return false;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.opacity;
      ctx.fill();
      ctx.globalAlpha = 1;

      return true;
    });

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      animationRef.current = null;
    }
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Trigger burst when active changes to true
  useEffect(() => {
    if (active && !reducedMotion) {
      createBurst();
    }
  }, [active, createBurst, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ borderRadius: 'inherit' }}
    />
  );
});

BurstEffect.displayName = 'BurstEffect';

// ============================================
// CSS KEYFRAMES (injected once)
// ============================================

// Inject keyframes into document head
if (typeof document !== 'undefined') {
  const styleId = 'button-effects-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes success-check {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        50% {
          transform: scale(1.2);
          opacity: 1;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes success-check-path {
        to {
          stroke-dashoffset: 0;
        }
      }

      @keyframes success-glow {
        0% {
          opacity: 0;
        }
        30% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }

      @keyframes success-glow-pulse {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        30% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.2);
          opacity: 0;
        }
      }

      @keyframes pulse-expand {
        0% {
          transform: scale(1);
          opacity: 0.8;
        }
        100% {
          transform: scale(20);
          opacity: 0;
        }
      }

      @keyframes error-shake {
        0%, 100% {
          transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
          transform: translateX(-4px);
        }
        20%, 40%, 60%, 80% {
          transform: translateX(4px);
        }
      }

      @keyframes error-flash {
        0%, 100% {
          box-shadow: none;
        }
        50% {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5), 0 0 12px rgba(239, 68, 68, 0.4);
        }
      }

      @keyframes success-intense-glow {
        0% {
          opacity: 0;
          transform: scale(0.8);
        }
        30% {
          opacity: 1;
          transform: scale(1.1);
        }
        60% {
          opacity: 0.8;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(1.2);
        }
      }

      @keyframes success-ring-pulse {
        0% {
          opacity: 0;
          transform: scale(0.95);
        }
        30% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(1.05);
        }
      }

      @keyframes loading-breathe {
        0%, 100% {
          opacity: 0.8;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.02);
        }
      }

      @keyframes spinner-pulse {
        0%, 100% {
          opacity: 0.9;
          filter: drop-shadow(0 0 2px currentColor);
        }
        50% {
          opacity: 1;
          filter: drop-shadow(0 0 6px currentColor);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        @keyframes success-check {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes success-check-path {
          0%, 100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes success-glow {
          0%, 100% {
            opacity: 0;
          }
        }
        @keyframes success-glow-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes pulse-expand {
          0%, 100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        @keyframes error-shake {
          0%, 100% {
            transform: translateX(0);
          }
        }
        @keyframes error-flash {
          0%, 100% {
            box-shadow: none;
          }
        }
        @keyframes success-intense-glow {
          0%, 100% {
            opacity: 0;
            transform: scale(1);
          }
        }
        @keyframes success-ring-pulse {
          0%, 100% {
            opacity: 0;
            transform: scale(1);
          }
        }
        @keyframes loading-breathe {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes spinner-pulse {
          0%, 100% {
            opacity: 1;
            filter: none;
          }
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export default {
  RippleEffect,
  SuccessEffect,
  PulseEffect,
  GlowEffect,
  ShakeEffect,
  BurstEffect,
  useButtonFeedback,
  useReducedMotion,
  useSound,
  triggerHaptic,
  playClickSound,
  playSuccessSound,
  RIPPLE_COLORS,
  GLOW_COLORS,
  DURATIONS,
  SUCCESS_ANIMATION_TYPES,
};
