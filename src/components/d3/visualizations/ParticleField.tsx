/**
 * ParticleField - Stunning Animated Particle Background
 *
 * Features:
 * - Physics-based particle movement
 * - Interconnected particle lines
 * - Mouse interaction
 * - Multiple particle types
 * - Performance optimized with canvas
 * - Beautiful glow effects
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  type: 'normal' | 'glow' | 'star';
}

export interface ParticleFieldProps {
  particleCount?: number;
  connectionDistance?: number;
  mouseInfluence?: number;
  speed?: number;
  colorScheme?: string[];
  backgroundColor?: string;
  className?: string;
  style?: React.CSSProperties;
  showConnections?: boolean;
  glowIntensity?: number;
  interactive?: boolean;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#22c55e'];

// ============================================
// COMPONENT
// ============================================

export function ParticleField({
  particleCount = 80,
  connectionDistance = 120,
  mouseInfluence = 100,
  speed = 0.5,
  colorScheme = DEFAULT_COLORS,
  backgroundColor = 'transparent',
  className = '',
  style,
  showConnections = true,
  glowIntensity = 1,
  interactive = true,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Initialize particles
  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    const { width, height } = dimensions;

    for (let i = 0; i < particleCount; i++) {
      const type: Particle['type'] = Math.random() < 0.1 ? 'glow' : Math.random() < 0.05 ? 'star' : 'normal';

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        radius: type === 'star' ? Math.random() * 3 + 2 : Math.random() * 2 + 1,
        color: colorScheme[Math.floor(Math.random() * colorScheme.length)],
        opacity: type === 'glow' ? 0.8 : Math.random() * 0.5 + 0.3,
        type,
      });
    }

    particlesRef.current = particles;
  }, [particleCount, speed, colorScheme, dimensions]);

  // Update dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize particles when dimensions change
  useEffect(() => {
    initParticles();
  }, [initParticles]);

  // Mouse tracking
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const animate = () => {
      const particles = particlesRef.current;
      const { width, height } = dimensions;
      const mouse = mouseRef.current;

      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Mouse influence
        if (interactive) {
          const dx = mouse.x - particle.x;
          const dy = mouse.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseInfluence) {
            const force = (mouseInfluence - dist) / mouseInfluence;
            particle.vx -= (dx / dist) * force * 0.5;
            particle.vy -= (dy / dist) * force * 0.5;
          }
        }

        // Apply velocity
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Damping
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Add some random motion
        particle.vx += (Math.random() - 0.5) * 0.1;
        particle.vy += (Math.random() - 0.5) * 0.1;

        // Speed limit
        const maxSpeed = speed * 2;
        const currentSpeed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
        if (currentSpeed > maxSpeed) {
          particle.vx = (particle.vx / currentSpeed) * maxSpeed;
          particle.vy = (particle.vy / currentSpeed) * maxSpeed;
        }

        // Wrap around edges
        if (particle.x < -50) particle.x = width + 50;
        if (particle.x > width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = height + 50;
        if (particle.y > height + 50) particle.y = -50;

        // Draw connections
        if (showConnections) {
          for (let j = i + 1; j < particles.length; j++) {
            const other = particles[j];
            const cdx = other.x - particle.x;
            const cdy = other.y - particle.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

            if (cdist < connectionDistance) {
              const opacity = (1 - cdist / connectionDistance) * 0.2;
              ctx.beginPath();
              ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          }
        }

        // Draw particle
        ctx.beginPath();

        if (particle.type === 'glow' && glowIntensity > 0) {
          // Glow effect
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.radius * 4
          );
          gradient.addColorStop(0, particle.color);
          gradient.addColorStop(0.4, `${particle.color}80`);
          gradient.addColorStop(1, 'transparent');

          ctx.fillStyle = gradient;
          ctx.arc(particle.x, particle.y, particle.radius * 4 * glowIntensity, 0, Math.PI * 2);
          ctx.fill();
        } else if (particle.type === 'star') {
          // Star shape
          ctx.fillStyle = particle.color;
          drawStar(ctx, particle.x, particle.y, 5, particle.radius, particle.radius * 0.5);
          ctx.fill();
        } else {
          // Normal circle
          ctx.fillStyle = `rgba(${hexToRgb(particle.color)}, ${particle.opacity})`;
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, backgroundColor, connectionDistance, mouseInfluence, speed, showConnections, glowIntensity, interactive]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        ...style,
        zIndex: 0,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}

// Helper: Draw a star shape
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// Helper: Convert hex to RGB
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '255, 255, 255';
}

export default ParticleField;
