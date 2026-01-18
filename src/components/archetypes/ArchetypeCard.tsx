/**
 * ArchetypeCard - Reusable card component for displaying archetypes
 *
 * Features glassmorphism styling, 3D tilt effect, gradient borders,
 * and smooth animations following the MuscleMap design system.
 */

import React, { useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import VanillaTilt from 'vanilla-tilt';

/**
 * Size configurations for the card
 */
const SIZE_CONFIG = {
  sm: {
    card: 'w-48 h-64',
    image: 'h-32',
    icon: 'w-10 h-10 text-2xl',
    name: 'text-sm',
    description: 'text-xs line-clamp-2',
    padding: 'p-3',
    tilt: { max: 10, scale: 1.02 },
  },
  md: {
    card: 'w-64 h-80',
    image: 'h-44',
    icon: 'w-12 h-12 text-3xl',
    name: 'text-base',
    description: 'text-sm line-clamp-3',
    padding: 'p-4',
    tilt: { max: 15, scale: 1.03 },
  },
  lg: {
    card: 'w-80 h-96',
    image: 'h-56',
    icon: 'w-14 h-14 text-4xl',
    name: 'text-lg',
    description: 'text-base line-clamp-4',
    padding: 'p-5',
    tilt: { max: 20, scale: 1.04 },
  },
};

/**
 * Default fallback gradient colors for archetypes without images
 */
const DEFAULT_GRADIENTS = {
  strength: 'from-red-600/40 via-red-800/30 to-black',
  endurance: 'from-blue-600/40 via-blue-800/30 to-black',
  flexibility: 'from-purple-600/40 via-purple-800/30 to-black',
  balance: 'from-green-600/40 via-green-800/30 to-black',
  power: 'from-orange-600/40 via-orange-800/30 to-black',
  agility: 'from-cyan-600/40 via-cyan-800/30 to-black',
  default: 'from-brand-blue-600/40 via-brand-blue-800/30 to-black',
};

/**
 * Get gradient class based on archetype ID or color
 */
function getGradientClass(archetype) {
  if (archetype.color) {
    // If a hex color is provided, we'll use inline styles instead
    return null;
  }
  return DEFAULT_GRADIENTS[archetype.id] || DEFAULT_GRADIENTS.default;
}

/**
 * Selection indicator ring component
 */
function SelectionRing({ color }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-2xl pointer-events-none"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        boxShadow: `0 0 0 3px ${color || 'var(--brand-blue-500)'}, 0 0 20px ${color || 'var(--brand-blue-500)'}40`,
      }}
    />
  );
}

/**
 * Image component with lazy loading and blur placeholder
 */
function ArchetypeImage({ src, alt, height, onLoad, isLoaded }) {
  return (
    <div className={clsx('relative overflow-hidden', height)}>
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={onLoad}
        className={clsx(
          'w-full h-full object-cover transition-all duration-500',
          'group-hover:scale-105',
          isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
        )}
      />
      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    </div>
  );
}

/**
 * Fallback gradient background with icon
 */
function FallbackBackground({ archetype, sizeConfig }) {
  const gradientClass = getGradientClass(archetype);

  return (
    <div
      className={clsx(
        'relative overflow-hidden flex items-center justify-center',
        sizeConfig.image,
        gradientClass && `bg-gradient-to-br ${gradientClass}`
      )}
      style={
        archetype.color && !gradientClass
          ? {
              background: `linear-gradient(to bottom right, ${archetype.color}66, ${archetype.color}33, black)`,
            }
          : undefined
      }
    >
      {/* Animated icon */}
      <motion.div
        className={clsx(
          'flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm',
          sizeConfig.icon
        )}
        animate={{
          y: [0, -4, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {archetype.icon || '?'}
      </motion.div>
      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
    </div>
  );
}

/**
 * ArchetypeCard Component
 */
const ArchetypeCard = memo(function ArchetypeCard({
  archetype,
  selected = false,
  onClick,
  size = 'md',
  showDetails = true,
}) {
  const cardRef = useRef(null);
  const tiltRef = useRef(null);
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);

  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  // Initialize vanilla-tilt
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    VanillaTilt.init(card, {
      max: sizeConfig.tilt.max,
      scale: sizeConfig.tilt.scale,
      speed: 400,
      glare: true,
      'max-glare': 0.15,
      perspective: 1000,
      gyroscope: true,
    });

    tiltRef.current = card.vanillaTilt;

    return () => {
      if (tiltRef.current) {
        tiltRef.current.destroy();
      }
    };
  }, [sizeConfig.tilt.max, sizeConfig.tilt.scale]);

  const handleClick = () => {
    onClick?.(archetype);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(archetype);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={clsx(
        // Base sizing
        sizeConfig.card,
        // Glassmorphism base
        'relative overflow-hidden rounded-2xl',
        'bg-white/5 backdrop-blur-md',
        // Border
        'border border-white/10',
        // Cursor and interaction
        'cursor-pointer select-none',
        // Group for child animations
        'group'
      )}
      style={{
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`Select ${archetype.name} archetype`}
    >
      {/* Gradient border glow on hover */}
      <div
        className={clsx(
          'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300',
          'group-hover:opacity-100 pointer-events-none'
        )}
        style={{
          background: archetype.color
            ? `linear-gradient(135deg, ${archetype.color}40, transparent, ${archetype.color}40)`
            : 'linear-gradient(135deg, rgba(0, 102, 255, 0.3), transparent, rgba(0, 102, 255, 0.3))',
          padding: '1px',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Hero image or fallback gradient */}
      {archetype.imageUrl ? (
        <ArchetypeImage
          src={archetype.imageUrl}
          alt={archetype.name}
          height={sizeConfig.image}
          onLoad={() => setIsImageLoaded(true)}
          isLoaded={isImageLoaded}
        />
      ) : (
        <FallbackBackground archetype={archetype} sizeConfig={sizeConfig} />
      )}

      {/* Content section */}
      <div className={clsx('relative flex flex-col', sizeConfig.padding)}>
        {/* Icon badge (shown when image is present) */}
        {archetype.imageUrl && archetype.icon && (
          <motion.div
            className={clsx(
              'absolute -top-6 left-4 flex items-center justify-center rounded-xl',
              'bg-black/60 backdrop-blur-sm border border-white/20',
              size === 'sm' ? 'w-8 h-8 text-lg' : 'w-10 h-10 text-xl'
            )}
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {archetype.icon}
          </motion.div>
        )}

        {/* Name */}
        <h3
          className={clsx(
            'font-bold text-white truncate',
            sizeConfig.name,
            archetype.imageUrl && archetype.icon && 'mt-2'
          )}
        >
          {archetype.name}
        </h3>

        {/* Description */}
        {showDetails && archetype.description && (
          <p
            className={clsx(
              'mt-1 text-gray-400',
              sizeConfig.description
            )}
          >
            {archetype.description}
          </p>
        )}

        {/* Philosophy (smaller text, shown only in lg size) */}
        {showDetails && size === 'lg' && archetype.philosophy && (
          <p className="mt-2 text-xs text-gray-500 italic line-clamp-2">
            &ldquo;{archetype.philosophy}&rdquo;
          </p>
        )}
      </div>

      {/* Selection indicator */}
      {selected && <SelectionRing color={archetype.color} />}

      {/* Subtle shine effect on hover */}
      <div
        className={clsx(
          'absolute inset-0 opacity-0 group-hover:opacity-100',
          'transition-opacity duration-500 pointer-events-none'
        )}
        style={{
          background:
            'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.05) 45%, transparent 50%)',
        }}
      />
    </motion.div>
  );
});

export default ArchetypeCard;
