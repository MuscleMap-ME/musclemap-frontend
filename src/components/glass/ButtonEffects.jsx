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
  success: 400, // ms for success animation
};

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
 * SuccessEffect - Checkmark animation on successful action
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

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6"
        style={{
          animation: reducedMotion ? 'none' : 'success-check 0.4s ease-out forwards',
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
 * Handles press feedback, success states, and coordinates with ripple effects.
 * Respects prefers-reduced-motion for accessibility.
 *
 * @param {Object} options
 * @param {'ripple' | 'pulse' | 'none'} options.feedback - Type of click feedback
 * @param {Function} options.onSuccess - Callback for success state
 * @param {boolean} options.disabled - Whether button is disabled
 *
 * @returns {Object} Feedback state and handlers
 *
 * @example
 * const { handlers, isPressed, showSuccess, rippleRef, triggerSuccess } = useButtonFeedback({
 *   feedback: 'ripple',
 *   onSuccess: () => console.log('Success!'),
 * });
 *
 * <button {...handlers}>Click me</button>
 */
export function useButtonFeedback({
  feedback = 'ripple',
  onSuccess,
  disabled = false,
} = {}) {
  const [isPressed, setIsPressed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const rippleRef = useRef(null);
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
   * Handle success animation completion
   */
  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    onSuccess?.();
  }, [onSuccess]);

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
    },
    [disabled, feedback]
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
    rippleRef,
    triggerSuccess,
    handleSuccessComplete,
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
        @keyframes pulse-expand {
          0%, 100% {
            transform: scale(1);
            opacity: 0;
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
  useButtonFeedback,
  useReducedMotion,
  RIPPLE_COLORS,
  DURATIONS,
};
