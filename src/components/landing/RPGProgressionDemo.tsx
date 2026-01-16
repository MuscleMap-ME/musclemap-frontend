/**
 * RPGProgressionDemo Component
 *
 * Interactive demo showing RPG-style progression with XP bar.
 * Clicking "Complete Set" adds XP, and when full shows a level up celebration.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// XP required for level up
const XP_PER_LEVEL = 100;
const XP_PER_SET = 25;

// Mini confetti particle
function ConfettiParticle({ index, color, startX, startY }) {
  const angle = (index * 30 + Math.random() * 20) * (Math.PI / 180);
  const distance = 30 + Math.random() * 40;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{
        backgroundColor: color,
        left: startX,
        top: startY,
      }}
      initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      animate={{
        opacity: 0,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        rotate: rotation,
        scale: 0.5,
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        ease: 'easeOut',
      }}
    />
  );
}

// Level up celebration
function LevelUpCelebration({ onComplete }) {
  const confettiColors = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb7185'];
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
  }));

  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Confetti particles */}
      {particles.map((p) => (
        <ConfettiParticle
          key={p.id}
          index={p.id}
          color={p.color}
          startX="50%"
          startY="50%"
        />
      ))}

      {/* Level up text */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.2, opacity: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <div className="text-center">
          <motion.div
            className="text-2xl font-bold"
            style={{
              background: 'linear-gradient(90deg, #fbbf24, #f472b6, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, repeat: 2 }}
          >
            LEVEL UP!
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// XP gain animation
function XPGainIndicator({ amount, onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute right-2 top-1/2 text-sm font-bold text-yellow-400"
      initial={{ opacity: 0, y: 0, x: 0 }}
      animate={{ opacity: [0, 1, 1, 0], y: -20 }}
      transition={{ duration: 0.8 }}
    >
      +{amount} XP
    </motion.div>
  );
}

export default function RPGProgressionDemo({ className = '' }) {
  const [level, setLevel] = useState(5);
  const [currentXP, setCurrentXP] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [xpGains, setXpGains] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const xpGainIdRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  // Calculate XP percentage
  const xpPercent = (currentXP / XP_PER_LEVEL) * 100;

  // Handle set completion
  const handleCompleteSet = useCallback(() => {
    if (isAnimating) return;

    const newXP = currentXP + XP_PER_SET;

    // Show XP gain indicator
    if (!prefersReducedMotion) {
      const gainId = xpGainIdRef.current++;
      setXpGains((prev) => [...prev, { id: gainId, amount: XP_PER_SET }]);
    }

    if (newXP >= XP_PER_LEVEL) {
      // Level up!
      setIsAnimating(true);
      setCurrentXP(XP_PER_LEVEL);

      // Show celebration after bar fills
      setTimeout(() => {
        setShowLevelUp(true);
      }, 300);
    } else {
      setCurrentXP(newXP);
    }
  }, [currentXP, isAnimating, prefersReducedMotion]);

  // Handle level up completion
  const handleLevelUpComplete = useCallback(() => {
    setShowLevelUp(false);
    setLevel((prev) => prev + 1);
    setCurrentXP(0);
    setIsAnimating(false);
  }, []);

  // Remove XP gain indicator
  const removeXPGain = useCallback((id) => {
    setXpGains((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // Reset demo when level gets too high
  useEffect(() => {
    if (level > 7) {
      const timer = setTimeout(() => {
        setLevel(5);
        setCurrentXP(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [level]);

  return (
    <div className={`rpg-progression-demo ${className}`}>
      {/* Demo container with glass styling */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 max-w-[280px] mx-auto relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-sm font-semibold text-white mb-1">RPG Progression</h3>
          <p className="text-xs text-gray-400">Earn XP with every set</p>
        </div>

        {/* Level display */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <motion.div
            className="text-center"
            animate={showLevelUp ? { scale: [1, 1.1, 1] } : {}}
          >
            <div className="text-xs text-gray-400 mb-1">Level</div>
            <motion.div
              className="text-3xl font-bold"
              style={{
                background: 'linear-gradient(180deg, #fbbf24, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              key={level}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {level}
            </motion.div>
          </motion.div>

          <motion.div
            className="text-2xl text-gray-500"
            animate={isAnimating && !showLevelUp ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {'\u2192'}
          </motion.div>

          <div className="text-center opacity-50">
            <div className="text-xs text-gray-400 mb-1">Next</div>
            <div className="text-3xl font-bold text-gray-500">
              {level + 1}
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="relative mb-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>XP</span>
            <span>{currentXP}/{XP_PER_LEVEL}</span>
          </div>

          <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            {/* XP fill */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 1,
              }}
            />
          </div>

          {/* XP gain indicators */}
          {xpGains.map((gain) => (
            <XPGainIndicator
              key={gain.id}
              amount={gain.amount}
              onComplete={() => removeXPGain(gain.id)}
            />
          ))}
        </div>

        {/* Complete Set Button */}
        <motion.button
          onClick={handleCompleteSet}
          disabled={isAnimating}
          className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isAnimating
              ? 'rgba(75, 85, 99, 0.5)'
              : 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: isAnimating
              ? 'none'
              : '0 4px 15px rgba(16, 185, 129, 0.3)',
          }}
          whileHover={!isAnimating ? { scale: 1.02 } : {}}
          whileTap={!isAnimating ? { scale: 0.98 } : {}}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Complete Set
          </span>
        </motion.button>

        {/* Stats preview */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-red-400">12</div>
              <div className="text-xs text-gray-500">STR</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">8</div>
              <div className="text-xs text-gray-500">END</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">10</div>
              <div className="text-xs text-gray-500">VIT</div>
            </div>
          </div>
        </div>

        {/* Level up celebration overlay */}
        <AnimatePresence>
          {showLevelUp && (
            <LevelUpCelebration onComplete={handleLevelUpComplete} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
