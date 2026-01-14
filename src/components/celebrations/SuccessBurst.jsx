/**
 * SuccessBurst Component
 *
 * Canvas-based confetti particle burst for achievements and celebrations.
 * Features multiple presets and a `useConfetti` hook for easy triggering.
 *
 * @example
 * // Using the hook
 * const { fireConfetti } = useConfetti();
 * fireConfetti({ preset: 'achievement', origin: { x: 0.5, y: 0.5 } });
 *
 * // Using the component directly
 * <SuccessBurst ref={burstRef} />
 * burstRef.current.fire({ preset: 'workout' });
 */

import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  createContext,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// PRESETS
// ============================================

const PRESETS = {
  achievement: {
    particleCount: 100,
    spread: 360,
    colors: ['#0066ff', '#00aaff', '#ff3366', '#ffd700', '#22c55e'],
    duration: 3000,
    gravity: 0.15,
    velocityMultiplier: 1.2,
    shapes: ['circle', 'rect', 'star'],
    glow: true,
  },
  workout: {
    particleCount: 60,
    spread: 180,
    colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7'],
    duration: 2500,
    gravity: 0.12,
    velocityMultiplier: 1.0,
    shapes: ['circle', 'rect'],
    glow: true,
  },
  levelup: {
    particleCount: 150,
    spread: 360,
    colors: ['#0066ff', '#8b5cf6', '#d946ef', '#f59e0b', '#ffd700'],
    duration: 4000,
    gravity: 0.1,
    velocityMultiplier: 1.5,
    shapes: ['circle', 'rect', 'star', 'diamond'],
    glow: true,
  },
  subtle: {
    particleCount: 30,
    spread: 120,
    colors: ['#0066ff', '#00aaff', '#94a3b8'],
    duration: 2000,
    gravity: 0.18,
    velocityMultiplier: 0.7,
    shapes: ['circle'],
    glow: false,
  },
};

// ============================================
// PARTICLE CLASS
// ============================================

class Particle {
  constructor(x, y, options) {
    this.x = x;
    this.y = y;
    this.color = options.color;
    this.size = Math.random() * 8 + 4;
    this.shape = options.shape;
    this.glow = options.glow;

    // Random velocity with spread
    const spreadRad = (options.spread / 360) * Math.PI * 2;
    const angle = Math.random() * spreadRad - spreadRad / 2 - Math.PI / 2;
    const speed = (Math.random() * 8 + 4) * options.velocityMultiplier;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Physics
    this.gravity = options.gravity;
    this.friction = 0.99;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;

    // Lifecycle
    this.opacity = 1;
    this.decay = Math.random() * 0.015 + 0.01;
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

    // Glow effect
    if (this.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.size * 2;
    }

    ctx.fillStyle = this.color;

    switch (this.shape) {
      case 'rect':
        ctx.fillRect(
          -this.size / 2,
          (-this.size * this.aspect) / 2,
          this.size,
          this.size * this.aspect
        );
        break;

      case 'star':
        this.drawStar(ctx, this.size / 2);
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -this.size / 2);
        ctx.lineTo(this.size / 3, 0);
        ctx.lineTo(0, this.size / 2);
        ctx.lineTo(-this.size / 3, 0);
        ctx.closePath();
        ctx.fill();
        break;

      case 'circle':
      default:
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  drawStar(ctx, radius) {
    const spikes = 5;
    const outerRadius = radius;
    const innerRadius = radius / 2;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}

// ============================================
// CONFETTI CONTEXT
// ============================================

const ConfettiContext = createContext(null);

export function ConfettiProvider({ children }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  // Initialize canvas
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
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

  // Fire confetti
  const fireConfetti = useCallback(
    ({
      preset = 'achievement',
      origin = { x: 0.5, y: 0.5 },
      colors,
      particleCount,
      spread,
      duration,
    } = {}) => {
      if (reducedMotion) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const presetConfig = PRESETS[preset] || PRESETS.achievement;
      const config = {
        ...presetConfig,
        ...(colors && { colors }),
        ...(particleCount !== undefined && { particleCount }),
        ...(spread !== undefined && { spread }),
        ...(duration !== undefined && { duration }),
      };

      // Calculate origin in pixels
      const x = origin.x * canvas.width;
      const y = origin.y * canvas.height;

      // Create particles
      for (let i = 0; i < config.particleCount; i++) {
        const color = config.colors[Math.floor(Math.random() * config.colors.length)];
        const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];
        particlesRef.current.push(
          new Particle(x, y, {
            color,
            shape,
            spread: config.spread,
            gravity: config.gravity,
            velocityMultiplier: config.velocityMultiplier,
            glow: config.glow,
          })
        );
      }

      // Start animation
      if (!animationRef.current) {
        animate();
      }

      // Cleanup after duration
      setTimeout(() => {
        particlesRef.current = [];
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }, config.duration);
    },
    [reducedMotion, animate]
  );

  return (
    <ConfettiContext.Provider value={{ fireConfetti }}>
      {children}
    </ConfettiContext.Provider>
  );
}

ConfettiProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ============================================
// STANDALONE CONFETTI HOOK (internal)
// ============================================

/**
 * Internal hook for standalone confetti (no provider needed)
 * Always calls all hooks unconditionally
 */
function useStandaloneConfetti() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Check if canvas already exists
    let canvas = document.getElementById('standalone-confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'standalone-confetti-canvas';
      canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      `;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
    }
    canvasRef.current = canvas;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
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

  const fireConfetti = useCallback(
    ({
      preset = 'achievement',
      origin = { x: 0.5, y: 0.5 },
      colors,
      particleCount,
      spread,
      duration,
    } = {}) => {
      if (reducedMotion) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const presetConfig = PRESETS[preset] || PRESETS.achievement;
      const config = {
        ...presetConfig,
        ...(colors && { colors }),
        ...(particleCount !== undefined && { particleCount }),
        ...(spread !== undefined && { spread }),
        ...(duration !== undefined && { duration }),
      };

      const x = origin.x * canvas.width;
      const y = origin.y * canvas.height;

      for (let i = 0; i < config.particleCount; i++) {
        const color = config.colors[Math.floor(Math.random() * config.colors.length)];
        const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];
        particlesRef.current.push(
          new Particle(x, y, {
            color,
            shape,
            spread: config.spread,
            gravity: config.gravity,
            velocityMultiplier: config.velocityMultiplier,
            glow: config.glow,
          })
        );
      }

      if (!animationRef.current) {
        animate();
      }

      setTimeout(() => {
        particlesRef.current = [];
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }, config.duration);
    },
    [reducedMotion, animate]
  );

  return { fireConfetti };
}

// ============================================
// USE CONFETTI HOOK
// ============================================

/**
 * Hook for triggering confetti celebrations
 *
 * @example
 * const { fireConfetti } = useConfetti();
 *
 * // Basic usage
 * fireConfetti();
 *
 * // With preset
 * fireConfetti({ preset: 'achievement' });
 *
 * // With custom origin (0-1 normalized)
 * fireConfetti({ preset: 'workout', origin: { x: 0.5, y: 0.3 } });
 *
 * // With custom options
 * fireConfetti({
 *   preset: 'levelup',
 *   particleCount: 200,
 *   colors: ['#ff0000', '#00ff00'],
 * });
 */
export function useConfetti() {
  const context = useContext(ConfettiContext);
  const standalone = useStandaloneConfetti();

  // Return context if available, otherwise use standalone
  return context || standalone;
}

// ============================================
// SUCCESS BURST COMPONENT
// ============================================

/**
 * SuccessBurst - Imperative confetti component
 *
 * @example
 * const burstRef = useRef();
 *
 * // Fire programmatically
 * burstRef.current.fire({ preset: 'achievement' });
 *
 * <SuccessBurst ref={burstRef} />
 */
export const SuccessBurst = forwardRef(function SuccessBurst(
  { className = '' },
  ref
) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  // Initialize canvas
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((particle) => {
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

  // Expose fire method via ref
  useImperativeHandle(
    ref,
    () => ({
      fire: ({
        preset = 'achievement',
        origin = { x: 0.5, y: 0.5 },
        colors,
        particleCount,
        spread,
        duration,
      } = {}) => {
        if (reducedMotion) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const presetConfig = PRESETS[preset] || PRESETS.achievement;
        const config = {
          ...presetConfig,
          ...(colors && { colors }),
          ...(particleCount !== undefined && { particleCount }),
          ...(spread !== undefined && { spread }),
          ...(duration !== undefined && { duration }),
        };

        const x = origin.x * canvas.width;
        const y = origin.y * canvas.height;

        for (let i = 0; i < config.particleCount; i++) {
          const color = config.colors[Math.floor(Math.random() * config.colors.length)];
          const shape = config.shapes[Math.floor(Math.random() * config.shapes.length)];
          particlesRef.current.push(
            new Particle(x, y, {
              color,
              shape,
              spread: config.spread,
              gravity: config.gravity,
              velocityMultiplier: config.velocityMultiplier,
              glow: config.glow,
            })
          );
        }

        if (!animationRef.current) {
          animate();
        }

        setTimeout(() => {
          particlesRef.current = [];
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, config.duration);
      },
    }),
    [reducedMotion, animate]
  );

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 9999 }}
    />
  );
});

SuccessBurst.propTypes = {
  className: PropTypes.string,
};

// Export presets for external use
export { PRESETS as CONFETTI_PRESETS };

export default SuccessBurst;
