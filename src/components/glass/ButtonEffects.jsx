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
  pulse: 'rgba(0, 255, 136, 0.4)',
  ghost: 'rgba(255, 255, 255, 0.25)',
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
 * SuccessEffect - Checkmark animation with green glow pulse
 *
 * Shows a brief checkmark with a green glow pulse effect,
 * then returns to normal state.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether to show the animation
 * @param {string} props.variant - Button variant for color matching
 * @param {Function} props.onComplete - Callback when animation completes
 */
export const SuccessEffect = ({ active, variant = 'primary', onComplete }) => {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, DURATIONS.success);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!visible) return null;

  const checkColor = variant === 'primary' ? '#fff' : '#00ff88';
  const glowColor = 'rgba(0, 255, 136, 0.6)';

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
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
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
          filter: reducedMotion ? 'none' : 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.8))',
        }}
      >
        <path
          fill="none"
          stroke={checkColor}
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
 * @returns {boolean} True if user prefers reduced motion
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
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
      }
    `;
    document.head.appendChild(style);
  }
}

export default {
  RippleEffect,
  SuccessEffect,
  PulseEffect,
  ShakeEffect,
  BurstEffect,
  useButtonFeedback,
  useReducedMotion,
  triggerHaptic,
  RIPPLE_COLORS,
  DURATIONS,
};
