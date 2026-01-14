/**
 * Confetti Component
 *
 * A performant canvas-based confetti burst animation with bioluminescent aesthetic.
 * Uses requestAnimationFrame for smooth 60fps rendering.
 *
 * @example
 * <Confetti trigger={showConfetti} origin={buttonRef} />
 * <Confetti trigger={celebrate} particleCount={100} colors={['#0066ff', '#ff3366']} />
 */

import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

// Default colors from MuscleMap design system
const DEFAULT_COLORS = [
  'var(--brand-blue-400)',
  'var(--brand-blue-500)',
  'var(--brand-pulse-400)',
  'var(--brand-pulse-500)',
  '#22c55e', // success green
  '#8b5cf6', // purple
  '#f59e0b', // amber
];

// Parse CSS variable to actual color value
function resolveColor(color) {
  if (color.startsWith('var(')) {
    const varName = color.match(/var\((--[^)]+)\)/)?.[1];
    if (varName) {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || color;
    }
  }
  return color;
}

// Particle class for physics simulation
class Particle {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;

    // Random velocity with upward bias
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 6; // Upward bias

    // Physics properties
    this.gravity = 0.15;
    this.friction = 0.99;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;

    // Lifecycle
    this.opacity = 1;
    this.decay = Math.random() * 0.015 + 0.01;

    // Shape variation
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    this.aspect = Math.random() * 0.5 + 0.5; // For rectangles
  }

  update() {
    // Apply physics
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

    // Add glow effect for bioluminescent look
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
  trigger = false,
  origin = null,
  colors = DEFAULT_COLORS,
  particleCount = 80,
  spread = 360,
  duration = 3000,
  className = '',
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const resolvedColorsRef = useRef([]);

  // Resolve CSS variables to actual colors
  useEffect(() => {
    resolvedColorsRef.current = colors.map(resolveColor);
  }, [colors]);

  // Get origin coordinates
  const getOrigin = useCallback(() => {
    if (!origin) {
      // Default to center of screen
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }

    // If origin is a ref with current element
    if (origin.current) {
      const rect = origin.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    // If origin is coordinates object
    if (typeof origin.x === 'number' && typeof origin.y === 'number') {
      return origin;
    }

    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
  }, [origin]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter(particle => {
      const alive = particle.update();
      if (alive) {
        particle.draw(ctx);
      }
      return alive;
    });

    // Continue animation if particles remain
    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Spawn particles
  const spawnParticles = useCallback(() => {
    const { x, y } = getOrigin();
    const colors = resolvedColorsRef.current;

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      particlesRef.current.push(new Particle(x, y, color, size));
    }
  }, [getOrigin, particleCount]);

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

  // Trigger confetti
  useEffect(() => {
    if (trigger) {
      spawnParticles();

      // Start animation if not already running
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
  }, [trigger, spawnParticles, animate, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 9999 }}
    />
  );
}

Confetti.propTypes = {
  trigger: PropTypes.bool,
  origin: PropTypes.oneOfType([
    PropTypes.shape({ current: PropTypes.any }),
    PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
  ]),
  colors: PropTypes.arrayOf(PropTypes.string),
  particleCount: PropTypes.number,
  spread: PropTypes.number,
  duration: PropTypes.number,
  className: PropTypes.string,
};

export default Confetti;
