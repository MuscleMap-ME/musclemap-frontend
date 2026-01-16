/**
 * Confetti Component
 *
 * A performant canvas-based confetti burst animation with bioluminescent aesthetic.
 * Uses requestAnimationFrame for smooth 60fps rendering and respects reduced motion.
 *
 * @example
 * // Basic usage
 * <Confetti active={showConfetti} />
 *
 * // With custom origin and colors
 * <Confetti
 *   active={celebrate}
 *   origin={{ x: 0.5, y: 0.3 }}
 *   colors={['#0066ff', '#ff3366']}
 *   particleCount={100}
 * />
 */

import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';

// Default colors from MuscleMap design system
const DEFAULT_COLORS = [
  '#0066ff',  // brand-blue-500
  '#1a80ff',  // brand-blue-400
  '#ff3366',  // brand-pulse-500
  '#ff4d74',  // brand-pulse-300
  '#22c55e',  // success green
  '#8b5cf6',  // purple
  '#f59e0b',  // amber
];

// Particle class for physics simulation
class Particle {
  constructor(x, y, color, size, options = {}) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;

    // Calculate velocity based on spread and origin
    const spreadRad = ((options.spread || 360) / 360) * Math.PI * 2;
    const angle = Math.random() * spreadRad - spreadRad / 2 - Math.PI / 2;
    const speed = Math.random() * 8 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 6; // Upward bias

    // Physics properties
    this.gravity = options.gravity || 0.15;
    this.friction = 0.99;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;

    // Lifecycle
    this.opacity = 1;
    this.decay = Math.random() * 0.015 + 0.01;

    // Shape variation
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    this.aspect = Math.random() * 0.5 + 0.5;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    this.rotation += this.rotationSpeed;
    this.opacity -= this.decay;

    return this.opacity > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;

    // Glow effect for bioluminescent look
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.size * 2;

    ctx.fillStyle = this.color;

    if (this.shape === 'rect') {
      ctx.fillRect(
        -this.size / 2,
        -this.size * this.aspect / 2,
        this.size,
        this.size * this.aspect
      );
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export function Confetti({
  active = false,
  duration = 3000,
  particleCount = 80,
  colors = DEFAULT_COLORS,
  origin = { x: 0.5, y: 0.5 },
  spread = 360,
  gravity = 0.15,
  className = '',
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const isVisibleRef = useRef(true);
  const reducedMotion = useReducedMotion();

  // Memoize origin in pixels
  const getOriginPixels = useCallback(() => {
    if (typeof origin.x === 'number' && origin.x <= 1) {
      return {
        x: origin.x * window.innerWidth,
        y: origin.y * window.innerHeight,
      };
    }
    return origin;
  }, [origin]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisibleRef.current) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter(particle => {
      const alive = particle.update();
      if (alive) {
        particle.draw(ctx);
      }
      return alive;
    });

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      animationRef.current = null;
    }
  }, []);

  // Spawn particles
  const spawnParticles = useCallback(() => {
    const { x, y } = getOriginPixels();

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      particlesRef.current.push(new Particle(x, y, color, size, { spread, gravity }));
    }
  }, [getOriginPixels, particleCount, colors, spread, gravity]);

  // Handle visibility change (pause when tab not visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current && particlesRef.current.length > 0 && !animationRef.current) {
        animate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [animate]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Trigger confetti when active changes
  useEffect(() => {
    if (active && !reducedMotion) {
      spawnParticles();

      if (!animationRef.current) {
        animate();
      }

      // Auto cleanup after duration
      const timeout = setTimeout(() => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        particlesRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, duration);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [active, reducedMotion, spawnParticles, animate, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Don't render canvas if reduced motion preferred
  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    />
  );
}

Confetti.propTypes = {
  /** Whether the confetti animation is active */
  active: PropTypes.bool,
  /** Duration of the animation in milliseconds */
  duration: PropTypes.number,
  /** Number of particles to spawn */
  particleCount: PropTypes.number,
  /** Array of colors for particles */
  colors: PropTypes.arrayOf(PropTypes.string),
  /** Origin point (0-1 viewport ratio or pixel coordinates) */
  origin: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  /** Spread angle in degrees */
  spread: PropTypes.number,
  /** Gravity multiplier */
  gravity: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default Confetti;
