/**
 * BonusEventPopup - Celebratory popup for random bonus events
 *
 * Shows when user triggers a random bonus like Lucky Rep or Golden Set.
 * Full-screen overlay with confetti-like animation.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Sparkles,
  Gift,
  Trophy,
  Zap,
  Flame,
  Crown,
  Coins,
} from 'lucide-react';

// Bonus event configurations
const BONUS_CONFIGS = {
  lucky_rep: {
    icon: Star,
    title: 'Lucky Rep!',
    gradient: 'from-yellow-400 to-amber-500',
    bgGradient: 'from-yellow-500/20 to-amber-600/20',
    particleColor: '#FBBF24',
  },
  golden_set: {
    icon: Crown,
    title: 'Golden Set!',
    gradient: 'from-amber-400 to-yellow-500',
    bgGradient: 'from-amber-500/20 to-yellow-500/20',
    particleColor: '#FFD700',
  },
  jackpot_workout: {
    icon: Trophy,
    title: 'JACKPOT!',
    gradient: 'from-purple-400 to-pink-500',
    bgGradient: 'from-purple-500/20 to-pink-600/20',
    particleColor: '#A855F7',
  },
  mystery_box: {
    icon: Gift,
    title: 'Mystery Box!',
    gradient: 'from-blue-400 to-cyan-500',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
    particleColor: '#3B82F6',
  },
  early_bird: {
    icon: Zap,
    title: 'Early Bird!',
    gradient: 'from-orange-400 to-red-500',
    bgGradient: 'from-orange-500/20 to-red-500/20',
    particleColor: '#F97316',
  },
  night_owl: {
    icon: Sparkles,
    title: 'Night Owl!',
    gradient: 'from-indigo-400 to-purple-500',
    bgGradient: 'from-indigo-500/20 to-purple-500/20',
    particleColor: '#6366F1',
  },
  weekend_warrior: {
    icon: Flame,
    title: 'Weekend Warrior!',
    gradient: 'from-red-400 to-orange-500',
    bgGradient: 'from-red-500/20 to-orange-500/20',
    particleColor: '#EF4444',
  },
  comeback: {
    icon: Star,
    title: 'Welcome Back!',
    gradient: 'from-green-400 to-emerald-500',
    bgGradient: 'from-green-500/20 to-emerald-500/20',
    particleColor: '#22C55E',
  },
  default: {
    icon: Gift,
    title: 'Bonus!',
    gradient: 'from-amber-400 to-yellow-500',
    bgGradient: 'from-amber-500/20 to-yellow-500/20',
    particleColor: '#F59E0B',
  },
};

// Particle component for confetti effect
function Particle({ delay, color, x, y }) {
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-full"
      style={{
        backgroundColor: color,
        left: '50%',
        top: '50%',
        boxShadow: `0 0 10px ${color}`,
      }}
      initial={{
        x: 0,
        y: 0,
        scale: 0,
        opacity: 1,
      }}
      animate={{
        x: x * 150,
        y: y * 150,
        scale: [0, 1.5, 0],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 1,
        delay: delay,
        ease: 'easeOut',
      }}
    />
  );
}

export function BonusEventPopup({
  isOpen,
  onClose,
  eventType = 'default',
  credits = 0,
  message = '',
  autoCloseMs = 3000,
}) {
  const [particles, setParticles] = useState([]);
  const config = BONUS_CONFIGS[eventType] || BONUS_CONFIGS.default;
  const Icon = config.icon;

  // Generate particles on open
  useEffect(() => {
    if (isOpen) {
      const newParticles = [];
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        newParticles.push({
          id: i,
          x: Math.cos(angle),
          y: Math.sin(angle),
          delay: Math.random() * 0.3,
        });
      }
      setParticles(newParticles);
    }
  }, [isOpen]);

  // Auto-close
  useEffect(() => {
    if (isOpen && autoCloseMs > 0) {
      const timer = setTimeout(onClose, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-b ${config.bgGradient}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Content */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', damping: 15 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Particles */}
            {particles.map(p => (
              <Particle
                key={p.id}
                delay={p.delay}
                color={config.particleColor}
                x={p.x}
                y={p.y}
              />
            ))}

            {/* Main content */}
            <div className="flex flex-col items-center">
              {/* Glowing icon */}
              <motion.div
                className={`
                  w-24 h-24 rounded-full flex items-center justify-center
                  bg-gradient-to-br ${config.gradient}
                  shadow-lg
                `}
                style={{
                  boxShadow: `0 0 60px ${config.particleColor}80`,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    `0 0 40px ${config.particleColor}60`,
                    `0 0 80px ${config.particleColor}80`,
                    `0 0 40px ${config.particleColor}60`,
                  ],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
              >
                <Icon className="w-12 h-12 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                className={`
                  mt-6 text-4xl font-black
                  bg-gradient-to-r ${config.gradient}
                  bg-clip-text text-transparent
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {config.title}
              </motion.h2>

              {/* Credits amount */}
              <motion.div
                className="mt-4 flex items-center gap-2"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <Coins className="w-8 h-8 text-amber-400" />
                <span className="text-5xl font-black text-amber-300">
                  +{credits}
                </span>
              </motion.div>

              {/* Message */}
              {message && (
                <motion.p
                  className="mt-4 text-lg text-white/80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {message}
                </motion.p>
              )}

              {/* Tap to dismiss */}
              <motion.p
                className="mt-8 text-sm text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Tap anywhere to continue
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BonusEventPopup;
