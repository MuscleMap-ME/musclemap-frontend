/**
 * AchievementBurst Component
 *
 * Badge unlock animation with zoom effect and particle burst.
 * Rarity affects particle colors and intensity.
 *
 * @example
 * <AchievementBurst
 *   achievement={{ name: 'First Workout', icon: '💪', rarity: 'common' }}
 *   active={showAchievement}
 *   onComplete={() => setShowAchievement(false)}
 * />
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// RARITY CONFIGURATIONS
// ============================================

const RARITY_CONFIG = {
  common: {
    colors: ['#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8'],
    glow: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gradientFrom: '#f8fafc',
    gradientTo: '#e2e8f0',
    particleCount: 30,
    label: 'Common',
    labelColor: '#94a3b8',
  },
  rare: {
    colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
    glow: 'rgba(59, 130, 246, 0.5)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    gradientFrom: '#3b82f6',
    gradientTo: '#1d4ed8',
    particleCount: 50,
    label: 'Rare',
    labelColor: '#3b82f6',
  },
  epic: {
    colors: ['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'],
    glow: 'rgba(168, 85, 247, 0.6)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
    gradientFrom: '#a855f7',
    gradientTo: '#7c3aed',
    particleCount: 70,
    label: 'Epic',
    labelColor: '#a855f7',
  },
  legendary: {
    colors: ['#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#ffffff'],
    glow: 'rgba(251, 191, 36, 0.7)',
    borderColor: 'rgba(251, 191, 36, 0.6)',
    gradientFrom: '#fbbf24',
    gradientTo: '#f59e0b',
    particleCount: 100,
    label: 'Legendary',
    labelColor: '#fbbf24',
  },
};

// ============================================
// PARTICLE CLASS (Module-level for performance)
// ============================================

class AchievementParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 6 + 3;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.gravity = 0.1;
    this.friction = 0.98;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    this.opacity = 1;
    this.decay = Math.random() * 0.02 + 0.01;
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
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.size * 1.5;
    ctx.fillStyle = this.color;

    // Draw star shape
    const spikes = 4;
    const outerRadius = this.size;
    const innerRadius = this.size / 2;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ============================================
// PARTICLE BURST (Canvas)
// ============================================

function ParticleBurstCanvas({ active, config, onComplete }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      onComplete?.();
    }
  }, [onComplete]);

  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < config.particleCount; i++) {
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      particlesRef.current.push(new AchievementParticle(centerX, centerY, color));
    }
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (active && !reducedMotion) {
      spawnParticles();
      if (!animationRef.current) {
        animate();
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [active, reducedMotion, spawnParticles, animate]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9998 }}
      aria-hidden="true"
    />
  );
}

ParticleBurstCanvas.propTypes = {
  active: PropTypes.bool.isRequired,
  config: PropTypes.object.isRequired,
  onComplete: PropTypes.func,
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const badgeVariants = {
  hidden: { scale: 0, rotate: -180, opacity: 0 },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.5, duration: 0.4 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

const rarityVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.7, type: 'spring' },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function AchievementBurst({
  achievement = { name: 'Achievement Unlocked', icon: '🏆', rarity: 'common' },
  active = false,
  onComplete,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef(null);
  const config = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;

  // Auto-complete after animation
  useEffect(() => {
    if (active && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  // Handle keyboard dismiss
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onComplete?.();
      }
    },
    [onComplete]
  );

  // Focus management
  useEffect(() => {
    if (active && containerRef.current) {
      containerRef.current.focus();
    }
  }, [active]);

  // Ring elements for legendary rarity
  const rings = useMemo(() => {
    if (achievement.rarity !== 'legendary') return [];
    return Array.from({ length: 3 }).map((_, i) => ({
      delay: 0.3 + i * 0.2,
      scale: 1.5 + i * 0.5,
    }));
  }, [achievement.rarity]);

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Particle burst canvas */}
          <ParticleBurstCanvas active={active} config={config} />

          <motion.div
            ref={containerRef}
            className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onComplete}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-label={`Achievement unlocked: ${achievement.name}`}
            aria-live="assertive"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-[var(--void-deep)]/85 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Flash effect */}
            {!reducedMotion && (
              <motion.div
                className="absolute inset-0 bg-white pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />
            )}

            {/* Radial glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${config.glow} 0%, transparent 50%)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />

            {/* Expanding rings for legendary */}
            {!reducedMotion &&
              rings.map((ring, i) => (
                <motion.div
                  key={i}
                  className="absolute w-32 h-32 rounded-full border-2"
                  style={{
                    borderColor: config.glow,
                    boxShadow: `0 0 20px ${config.glow}`,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0.5, ring.scale, ring.scale + 1],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: ring.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              {/* Badge container */}
              <motion.div
                variants={badgeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative"
              >
                {/* Glow behind badge */}
                {!reducedMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${config.glow}, transparent)`,
                      filter: 'blur(20px)',
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                {/* Badge circle */}
                <div
                  className="relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${config.gradientFrom}, ${config.gradientTo})`,
                    border: `3px solid ${config.borderColor}`,
                    boxShadow: `
                      0 0 40px ${config.glow},
                      inset 0 0 20px rgba(255, 255, 255, 0.2)
                    `,
                  }}
                >
                  {/* Icon */}
                  <span className="text-5xl md:text-6xl" role="img" aria-hidden="true">
                    {achievement.icon}
                  </span>
                </div>

                {/* Shine effect */}
                {!reducedMotion && (
                  <motion.div
                    className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute w-full h-full"
                      style={{
                        background:
                          'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                      }}
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 0.5,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>

              {/* Rarity label */}
              <motion.div
                variants={rarityVariants}
                initial="hidden"
                animate="visible"
                className="mt-4"
              >
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: `${config.glow}`,
                    color: config.labelColor,
                    border: `1px solid ${config.borderColor}`,
                    textShadow: `0 0 10px ${config.labelColor}`,
                  }}
                >
                  {config.label}
                </span>
              </motion.div>

              {/* Achievement name */}
              <motion.div variants={textVariants} initial="hidden" animate="visible" exit="exit">
                <h2
                  className="mt-4 text-2xl md:text-3xl font-bold text-white"
                  style={{
                    textShadow: `0 0 20px ${config.glow}`,
                  }}
                >
                  {achievement.name}
                </h2>
                <p className="mt-2 text-[var(--text-secondary)]">Achievement Unlocked</p>
              </motion.div>
            </div>

            {/* Dismiss hint */}
            <motion.div
              className="absolute bottom-8 left-0 right-0 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              <button
                onClick={onComplete}
                className="text-sm text-[var(--text-quaternary)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue-400)] rounded px-2 py-1"
              >
                Tap to continue
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

AchievementBurst.propTypes = {
  /** Achievement details */
  achievement: PropTypes.shape({
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    rarity: PropTypes.oneOf(['common', 'rare', 'epic', 'legendary']),
  }),
  /** Whether the burst is active */
  active: PropTypes.bool,
  /** Callback when animation completes or is dismissed */
  onComplete: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default AchievementBurst;
