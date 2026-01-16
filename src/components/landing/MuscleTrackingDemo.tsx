/**
 * MuscleTrackingDemo Component
 *
 * Interactive demo showing muscle tracking functionality.
 * Features a small body silhouette where hovering highlights muscles
 * with glow effects, and clicking shows activation percentage with particles.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Simplified muscle data for the demo
const DEMO_MUSCLES = {
  chest: {
    id: 'chest',
    name: 'Chest',
    color: '#ef4444',
    glowColor: '#ff6b6b',
    activation: 87,
    path: `M 35 50 Q 25 55, 22 62 Q 20 72, 25 78 Q 35 83, 45 80 Q 52 76, 53 68 Q 53 58, 45 52 Q 40 50, 35 50
           M 65 50 Q 75 55, 78 62 Q 80 72, 75 78 Q 65 83, 55 80 Q 48 76, 47 68 Q 47 58, 55 52 Q 60 50, 65 50`,
    center: { x: 50, y: 65 },
  },
  shoulders: {
    id: 'shoulders',
    name: 'Shoulders',
    color: '#f97316',
    glowColor: '#fb923c',
    activation: 72,
    path: `M 20 48 Q 12 52, 10 60 Q 9 70, 15 76 Q 22 80, 28 76 Q 32 70, 30 62 Q 28 54, 20 48
           M 80 48 Q 88 52, 90 60 Q 91 70, 85 76 Q 78 80, 72 76 Q 68 70, 70 62 Q 72 54, 80 48`,
    center: { x: 50, y: 55 },
  },
  arms: {
    id: 'arms',
    name: 'Biceps',
    color: '#eab308',
    glowColor: '#facc15',
    activation: 94,
    path: `M 14 78 Q 8 85, 7 95 Q 6 105, 10 112 Q 16 118, 22 114 Q 26 106, 25 95 Q 24 85, 14 78
           M 86 78 Q 92 85, 93 95 Q 94 105, 90 112 Q 84 118, 78 114 Q 74 106, 75 95 Q 76 85, 86 78`,
    center: { x: 50, y: 95 },
  },
  core: {
    id: 'core',
    name: 'Core',
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    activation: 65,
    path: `M 42 82 Q 38 90, 38 100 Q 38 112, 42 120 Q 48 126, 50 127 Q 52 126, 58 120 Q 62 112, 62 100 Q 62 90, 58 82 Q 52 78, 50 78 Q 48 78, 42 82`,
    center: { x: 50, y: 102 },
  },
  legs: {
    id: 'legs',
    name: 'Quads',
    color: '#ec4899',
    glowColor: '#f472b6',
    activation: 81,
    path: `M 38 128 Q 32 140, 30 155 Q 28 170, 32 185 Q 38 192, 45 190 Q 52 186, 53 170 Q 54 155, 48 140 Q 44 130, 38 128
           M 62 128 Q 68 140, 70 155 Q 72 170, 68 185 Q 62 192, 55 190 Q 48 186, 47 170 Q 46 155, 52 140 Q 56 130, 62 128`,
    center: { x: 50, y: 160 },
  },
};

// Particle burst component
function ParticleBurst({ x, y, color, onComplete }) {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 45 * Math.PI) / 180,
    distance: 20 + Math.random() * 15,
    size: 2 + Math.random() * 2,
    delay: Math.random() * 0.1,
  }));

  return (
    <g>
      {particles.map((p) => (
        <motion.circle
          key={p.id}
          cx={x}
          cy={y}
          r={p.size}
          fill={color}
          initial={{ opacity: 1, cx: x, cy: y }}
          animate={{
            opacity: 0,
            cx: x + Math.cos(p.angle) * p.distance,
            cy: y + Math.sin(p.angle) * p.distance,
          }}
          transition={{
            duration: 0.6,
            delay: p.delay,
            ease: 'easeOut',
          }}
          onAnimationComplete={p.id === 0 ? onComplete : undefined}
        />
      ))}
    </g>
  );
}

// Activation tooltip
function ActivationTooltip({ muscle, isVisible }) {
  if (!isVisible || !muscle) return null;

  return (
    <motion.g
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.15 }}
    >
      <rect
        x={muscle.center.x - 28}
        y={muscle.center.y - 18}
        width={56}
        height={36}
        rx={6}
        fill="rgba(0, 0, 0, 0.9)"
        stroke={muscle.glowColor}
        strokeWidth={1.5}
      />
      <text
        x={muscle.center.x}
        y={muscle.center.y - 4}
        textAnchor="middle"
        fill={muscle.glowColor}
        fontSize="9"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
      >
        {muscle.name}
      </text>
      <text
        x={muscle.center.x}
        y={muscle.center.y + 10}
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {muscle.activation}%
      </text>
    </motion.g>
  );
}

export default function MuscleTrackingDemo({ className = '' }) {
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [particles, setParticles] = useState([]);
  const particleIdRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  // Handle muscle click
  const handleMuscleClick = useCallback((muscle) => {
    setSelectedMuscle(muscle);

    // Add particle burst if motion is allowed
    if (!prefersReducedMotion) {
      const newParticle = {
        id: particleIdRef.current++,
        x: muscle.center.x,
        y: muscle.center.y,
        color: muscle.glowColor,
      };
      setParticles((prev) => [...prev, newParticle]);
    }
  }, [prefersReducedMotion]);

  // Remove particle after animation
  const handleParticleComplete = useCallback((id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Auto-clear selection after delay
  useEffect(() => {
    if (selectedMuscle) {
      const timer = setTimeout(() => setSelectedMuscle(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedMuscle]);

  const activeMuscle = selectedMuscle || (hoveredMuscle ? DEMO_MUSCLES[hoveredMuscle] : null);

  return (
    <div className={`muscle-tracking-demo ${className}`}>
      {/* Demo container with glass styling */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 max-w-[280px] mx-auto">
        {/* Header */}
        <div className="text-center mb-3">
          <h3 className="text-sm font-semibold text-white mb-1">Muscle Tracking</h3>
          <p className="text-xs text-gray-400">Hover to explore muscles</p>
        </div>

        {/* SVG Body */}
        <div className="relative">
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none rounded-lg transition-all duration-300"
            style={{
              background: activeMuscle
                ? `radial-gradient(ellipse at center, ${activeMuscle.glowColor}20 0%, transparent 70%)`
                : 'transparent',
            }}
          />

          <svg
            viewBox="0 0 100 210"
            className="w-full h-auto"
            style={{ maxWidth: 200, margin: '0 auto', display: 'block' }}
          >
            {/* Filters */}
            <defs>
              <filter id="demo-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Body outline */}
            <g className="body-outline" opacity="0.3">
              {/* Head */}
              <ellipse cx="50" cy="22" rx="12" ry="14" fill="none" stroke="currentColor" strokeWidth="1" />
              {/* Neck */}
              <line x1="50" y1="36" x2="50" y2="44" stroke="currentColor" strokeWidth="1" />
              {/* Torso outline */}
              <path
                d="M 28 48 Q 20 60, 20 80 Q 20 100, 25 120 Q 30 135, 38 145 L 38 125 Q 50 132, 62 125 L 62 145 Q 70 135, 75 120 Q 80 100, 80 80 Q 80 60, 72 48 Q 62 42, 50 42 Q 38 42, 28 48"
                fill="rgba(255,255,255,0.05)"
                stroke="currentColor"
                strokeWidth="1"
              />
              {/* Arms outline */}
              <path d="M 28 50 Q 15 55, 10 70 Q 5 90, 8 110 Q 6 130, 10 150" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M 72 50 Q 85 55, 90 70 Q 95 90, 92 110 Q 94 130, 90 150" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
              {/* Legs outline */}
              <path d="M 40 143 Q 35 160, 33 180 Q 32 195, 35 210" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M 60 143 Q 65 160, 67 180 Q 68 195, 65 210" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
            </g>

            {/* Muscle groups */}
            {Object.values(DEMO_MUSCLES).map((muscle) => {
              const isHovered = hoveredMuscle === muscle.id;
              const isSelected = selectedMuscle?.id === muscle.id;
              const isActive = isHovered || isSelected;

              return (
                <motion.path
                  key={muscle.id}
                  d={muscle.path}
                  fill={muscle.color}
                  fillRule="evenodd"
                  stroke={isActive ? muscle.glowColor : muscle.color}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  style={{ cursor: 'pointer' }}
                  initial={{ opacity: 0.25 }}
                  animate={{
                    opacity: isActive ? 0.9 : 0.3,
                    filter: isActive
                      ? `drop-shadow(0 0 6px ${muscle.glowColor}) drop-shadow(0 0 12px ${muscle.glowColor})`
                      : 'none',
                  }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={() => setHoveredMuscle(muscle.id)}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  onClick={() => handleMuscleClick(muscle)}
                />
              );
            })}

            {/* Particle effects */}
            {particles.map((p) => (
              <ParticleBurst
                key={p.id}
                x={p.x}
                y={p.y}
                color={p.color}
                onComplete={() => handleParticleComplete(p.id)}
              />
            ))}

            {/* Tooltip */}
            <AnimatePresence>
              <ActivationTooltip muscle={activeMuscle} isVisible={!!activeMuscle} />
            </AnimatePresence>
          </svg>
        </div>

        {/* Instruction text */}
        <motion.p
          className="text-center text-xs text-gray-500 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Click any muscle for details
        </motion.p>
      </div>
    </div>
  );
}
