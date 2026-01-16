/**
 * useRipple - Hook for adding ripple effects to any element
 *
 * Provides canvas-based ripple animations that can be applied to
 * any container element. Respects prefers-reduced-motion.
 *
 * @module useRipple
 *
 * @example
 * // Basic usage
 * const { rippleProps, RippleContainer } = useRipple();
 *
 * return (
 *   <div className="my-clickable-element" {...rippleProps}>
 *     <RippleContainer />
 *     <span>Click me</span>
 *   </div>
 * );
 *
 * @example
 * // With custom options
 * const { rippleProps, RippleContainer } = useRipple({
 *   color: 'rgba(0, 102, 255, 0.4)',
 *   duration: 800,
 *   disabled: false,
 * });
 *
 * @example
 * // Manual trigger
 * const { triggerRipple, RippleContainer } = useRipple();
 *
 * const handleCustomEvent = (e) => {
 *   triggerRipple(e.clientX, e.clientY);
 * };
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

const DEFAULT_OPTIONS = {
  color: 'rgba(255, 255, 255, 0.35)',
  duration: 600, // ms
  disabled: false,
};

// ============================================
// RIPPLE CANVAS COMPONENT
// ============================================

/**
 * RippleCanvas - Internal canvas component for rendering ripples
 *
 * Uses requestAnimationFrame for smooth 60fps animations.
 * Canvas approach is more performant than DOM-based ripples.
 */
const RippleCanvas = forwardRef(({ color, duration, className = '' }, ref) => {
  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);
  const animationRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Expose trigger method to parent
  useImperativeHandle(ref, () => ({
    trigger: (clientX, clientY) => {
      if (reducedMotion) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
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
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) return false;

      // Easing: ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const radius = ripple.maxRadius * eased;
      const opacity = 1 - progress;

      // Draw ripple
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);

      // Parse and adjust color opacity
      const colorMatch = color.match(/rgba?\(([^)]+)\)/);
      if (colorMatch) {
        const parts = colorMatch[1].split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          const baseOpacity = parseFloat(parts[3]);
          ctx.fillStyle = `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity * baseOpacity})`;
        } else {
          ctx.fillStyle = `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity * 0.4})`;
        }
      } else {
        ctx.fillStyle = color;
      }

      ctx.fill();
      return true;
    });

    // Continue animation if ripples remain
    if (ripplesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      animationRef.current = null;
    }
  }, [color, duration]);

  /**
   * Add a new ripple at the specified position
   */
  const addRipple = useCallback(
    (x, y) => {
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
      });

      // Start animation loop if not running
      if (!animationRef.current) {
        animate();
      }
    },
    [animate]
  );

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
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ borderRadius: 'inherit' }}
      aria-hidden="true"
    />
  );
});

RippleCanvas.displayName = 'RippleCanvas';

// ============================================
// MAIN HOOK
// ============================================

/**
 * useRipple - Hook for adding ripple effects to elements
 *
 * @param {Object} options - Configuration options
 * @param {string} options.color - Ripple color (rgba format recommended)
 * @param {number} options.duration - Animation duration in ms
 * @param {boolean} options.disabled - Disable ripple effects
 *
 * @returns {Object} Hook return value
 * @returns {Object} returns.rippleProps - Props to spread on the container element
 * @returns {React.FC} returns.RippleContainer - Component to render inside the container
 * @returns {Function} returns.triggerRipple - Manual trigger function (clientX, clientY)
 * @returns {boolean} returns.isReducedMotion - Whether reduced motion is preferred
 */
export function useRipple(options = {}) {
  const { color, duration, disabled } = { ...DEFAULT_OPTIONS, ...options };
  const rippleRef = useRef(null);
  const containerRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  /**
   * Trigger ripple at specific client coordinates
   */
  const triggerRipple = useCallback(
    (clientX, clientY) => {
      if (disabled || reducedMotion) return;
      rippleRef.current?.trigger(clientX, clientY);
    },
    [disabled, reducedMotion]
  );

  /**
   * Handle click/touch to trigger ripple
   */
  const handleInteraction = useCallback(
    (e) => {
      if (disabled || reducedMotion) return;

      // Get client coordinates from event
      let clientX, clientY;

      if (e.touches && e.touches.length > 0) {
        // Touch event
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.clientX !== undefined) {
        // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      rippleRef.current?.trigger(clientX, clientY);
    },
    [disabled, reducedMotion]
  );

  /**
   * Props to spread on the container element
   */
  const rippleProps = {
    ref: containerRef,
    onMouseDown: handleInteraction,
    onTouchStart: handleInteraction,
    style: { position: 'relative', overflow: 'hidden' },
  };

  /**
   * RippleContainer component to render inside the element
   */
  const RippleContainer = useCallback(
    () =>
      disabled ? null : (
        <RippleCanvas ref={rippleRef} color={color} duration={duration} />
      ),
    [color, duration, disabled]
  );

  return {
    rippleProps,
    RippleContainer,
    triggerRipple,
    isReducedMotion: reducedMotion,
  };
}

export default useRipple;
