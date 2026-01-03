/**
 * MeshBackground - Animated atmospheric background
 *
 * Creates an aurora/nebula effect using animated mesh gradients.
 * Respects reduced-motion preferences and performance constraints.
 */

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/**
 * Detects if user prefers reduced motion
 */
const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

/**
 * Static mesh gradient - no animation, good for performance
 */
export const MeshBackgroundStatic = ({ className, intensity = 'medium' }) => {
  const intensityMap = {
    subtle: {
      blue: 'rgba(0, 102, 255, 0.05)',
      purple: 'rgba(139, 92, 246, 0.04)',
      pulse: 'rgba(255, 51, 102, 0.03)',
    },
    medium: {
      blue: 'rgba(0, 102, 255, 0.08)',
      purple: 'rgba(139, 92, 246, 0.06)',
      pulse: 'rgba(255, 51, 102, 0.04)',
    },
    strong: {
      blue: 'rgba(0, 102, 255, 0.12)',
      purple: 'rgba(139, 92, 246, 0.10)',
      pulse: 'rgba(255, 51, 102, 0.08)',
    },
  };

  const colors = intensityMap[intensity] || intensityMap.medium;

  return (
    <div
      className={clsx('fixed inset-0 -z-10', className)}
      style={{
        backgroundColor: 'var(--void-base)',
        backgroundImage: `
          radial-gradient(ellipse at 0% 0%, ${colors.blue} 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, ${colors.purple} 0%, transparent 40%),
          radial-gradient(ellipse at 100% 100%, ${colors.pulse} 0%, transparent 50%),
          radial-gradient(ellipse at 0% 100%, ${colors.blue} 0%, transparent 40%)
        `,
      }}
    />
  );
};

/**
 * Animated mesh gradient using CSS animations (performant)
 */
export const MeshBackgroundAnimated = ({ className, intensity = 'medium' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Fall back to static if reduced motion preferred
  if (prefersReducedMotion) {
    return <MeshBackgroundStatic className={className} intensity={intensity} />;
  }

  const intensityMap = {
    subtle: 0.6,
    medium: 1,
    strong: 1.4,
  };

  const scale = intensityMap[intensity] || 1;

  return (
    <div className={clsx('fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* Base void color */}
      <div className="absolute inset-0 bg-[var(--void-base)]" />

      {/* Animated gradient orbs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-3xl animate-mesh-float-1"
        style={{
          background: `radial-gradient(circle, rgba(0, 102, 255, ${0.15 * scale}) 0%, transparent 70%)`,
          left: '-10%',
          top: '-10%',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl animate-mesh-float-2"
        style={{
          background: `radial-gradient(circle, rgba(139, 92, 246, ${0.12 * scale}) 0%, transparent 70%)`,
          right: '-5%',
          top: '10%',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl animate-mesh-float-3"
        style={{
          background: `radial-gradient(circle, rgba(255, 51, 102, ${0.08 * scale}) 0%, transparent 70%)`,
          right: '20%',
          bottom: '10%',
        }}
      />

      {/* Keyframe styles */}
      <style>{`
        @keyframes mesh-float-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(5%, 10%) scale(1.1);
          }
          66% {
            transform: translate(-5%, 5%) scale(0.95);
          }
        }
        @keyframes mesh-float-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-8%, 5%) scale(0.9);
          }
          66% {
            transform: translate(5%, -8%) scale(1.05);
          }
        }
        @keyframes mesh-float-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(10%, -5%) scale(1.1);
          }
          66% {
            transform: translate(-10%, 8%) scale(0.95);
          }
        }
        .animate-mesh-float-1 {
          animation: mesh-float-1 25s ease-in-out infinite;
        }
        .animate-mesh-float-2 {
          animation: mesh-float-2 30s ease-in-out infinite;
        }
        .animate-mesh-float-3 {
          animation: mesh-float-3 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

/**
 * Canvas-based mesh for higher fidelity (use sparingly)
 * Only renders if WebGL is available and no reduced motion
 */
export const MeshBackgroundCanvas = ({ className, intensity = 'medium' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Gradient points that will animate
    const points = [
      { x: 0.2, y: 0.2, vx: 0.0003, vy: 0.0002, color: [0, 102, 255], size: 0.6 },
      { x: 0.8, y: 0.1, vx: -0.0002, vy: 0.0003, color: [139, 92, 246], size: 0.5 },
      { x: 0.6, y: 0.8, vx: 0.0002, vy: -0.0002, color: [255, 51, 102], size: 0.4 },
    ];

    const intensityMap = { subtle: 0.08, medium: 0.12, strong: 0.18 };
    const alpha = intensityMap[intensity] || 0.12;

    let lastTime = 0;
    const targetFPS = 30; // Limit to 30fps for performance
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime) => {
      animationRef.current = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      lastTime = currentTime - (deltaTime % frameInterval);

      // Clear with base color
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw each gradient point
      points.forEach((point) => {
        // Move point
        point.x += point.vx;
        point.y += point.vy;

        // Bounce off edges
        if (point.x < 0 || point.x > 1) point.vx *= -1;
        if (point.y < 0 || point.y > 1) point.vy *= -1;

        // Draw radial gradient
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        const radius = Math.min(canvas.width, canvas.height) * point.size;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${point.color.join(',')}, ${alpha})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [intensity, prefersReducedMotion]);

  // Fallback for reduced motion
  if (prefersReducedMotion) {
    return <MeshBackgroundStatic className={className} intensity={intensity} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={clsx('fixed inset-0 -z-10', className)}
      style={{ pointerEvents: 'none' }}
    />
  );
};

/**
 * Default export - use CSS animation version (best balance of quality/performance)
 */
const MeshBackground = MeshBackgroundAnimated;
export default MeshBackground;
