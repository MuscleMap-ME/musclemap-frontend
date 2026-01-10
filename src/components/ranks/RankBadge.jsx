/**
 * RankBadge Component
 *
 * Displays military-inspired rank insignia for the MuscleMap leveling system.
 *
 * Rank Tiers:
 * - Novice (0 XP): Empty chevron outline
 * - Trainee (100 XP): 1 chevron
 * - Apprentice (500 XP): 2 chevrons
 * - Practitioner (1,500 XP): 3 chevrons
 * - Journeyperson (4,000 XP): Bronze star
 * - Expert (10,000 XP): Silver star
 * - Master (25,000 XP): Gold star
 * - Grandmaster (60,000 XP): Diamond shield
 *
 * @example
 * <RankBadge rank="apprentice" size="md" />
 * <RankBadge rank="master" size="lg" showLabel />
 */

import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

// Rank visual configurations
const RANK_CONFIG = {
  novice: {
    type: 'chevron',
    count: 0,
    color: '#6B7280',
    label: 'Novice',
  },
  trainee: {
    type: 'chevron',
    count: 1,
    color: '#22C55E',
    label: 'Trainee',
  },
  apprentice: {
    type: 'chevron',
    count: 2,
    color: '#3B82F6',
    label: 'Apprentice',
  },
  practitioner: {
    type: 'chevron',
    count: 3,
    color: '#8B5CF6',
    label: 'Practitioner',
  },
  journeyperson: {
    type: 'star',
    count: 1,
    variant: 'bronze',
    color: '#EAB308',
    label: 'Journeyperson',
  },
  expert: {
    type: 'star',
    count: 1,
    variant: 'silver',
    color: '#F97316',
    label: 'Expert',
  },
  master: {
    type: 'star',
    count: 2,
    variant: 'gold',
    color: '#EF4444',
    label: 'Master',
  },
  grandmaster: {
    type: 'shield',
    count: 1,
    variant: 'diamond',
    color: '#EC4899',
    label: 'Grandmaster',
  },
};

// Size configurations
const SIZES = {
  xs: { badge: 16, icon: 12, fontSize: '0.5rem' },
  sm: { badge: 24, icon: 16, fontSize: '0.625rem' },
  md: { badge: 32, icon: 22, fontSize: '0.75rem' },
  lg: { badge: 48, icon: 32, fontSize: '0.875rem' },
  xl: { badge: 64, icon: 44, fontSize: '1rem' },
};

// Chevron SVG component
function Chevron({ count, color, size }) {
  const svgSize = size;
  const strokeWidth = size > 24 ? 2 : 1.5;

  // Empty outline for novice
  if (count === 0) {
    return (
      <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4L4 12L12 20L20 12L12 4Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 2"
          opacity={0.5}
        />
      </svg>
    );
  }

  // Chevrons (1-3 bars)
  const chevrons = [];
  const spacing = 5;
  const baseY = count === 1 ? 12 : count === 2 ? 10 : 8;

  for (let i = 0; i < count; i++) {
    const y = baseY + i * spacing;
    chevrons.push(
      <path
        key={i}
        d={`M6 ${y}L12 ${y + 4}L18 ${y}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  }

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
      {chevrons}
    </svg>
  );
}

// Star SVG component
function Star({ count, variant, color, size }) {
  const svgSize = size;
  const fillGradient = variant === 'bronze' ? '#CD7F32' :
    variant === 'silver' ? '#C0C0C0' :
    variant === 'gold' ? '#FFD700' : color;

  if (count === 1) {
    return (
      <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id={`star-grad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={fillGradient} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={`url(#star-grad-${variant})`}
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Two stars for Master
  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`star-grad-${variant}-double`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fillGradient} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Small star top-left */}
      <path
        d="M6 4L7.2 6.8L10 7.2L8 9.1L8.4 12L6 10.7L3.6 12L4 9.1L2 7.2L4.8 6.8L6 4Z"
        fill={`url(#star-grad-${variant}-double)`}
        stroke={color}
        strokeWidth="0.5"
      />
      {/* Large star bottom-right */}
      <path
        d="M15 8L17.5 13L23 13.8L19 17.6L20 23L15 20.2L10 23L11 17.6L7 13.8L12.5 13L15 8Z"
        fill={`url(#star-grad-${variant}-double)`}
        stroke={color}
        strokeWidth="0.5"
      />
    </svg>
  );
}

// Shield SVG component (for Grandmaster)
function Shield({ color, size }) {
  const svgSize = size;

  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E879F9" stopOpacity="1" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="diamond-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#F0ABFC" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path
        d="M12 2L3 6V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6L12 2Z"
        fill="url(#shield-grad)"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Diamond in center */}
      <path
        d="M12 7L9 12L12 17L15 12L12 7Z"
        fill="url(#diamond-grad)"
        stroke="#FFFFFF"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function RankBadge({
  rank = 'novice',
  size = 'md',
  showLabel = false,
  showTooltip = true,
  animate = true,
  className = '',
  style = {},
}) {
  const config = RANK_CONFIG[rank] || RANK_CONFIG.novice;
  const sizeConfig = SIZES[size] || SIZES.md;

  const renderIcon = () => {
    switch (config.type) {
      case 'chevron':
        return <Chevron count={config.count} color={config.color} size={sizeConfig.icon} />;
      case 'star':
        return <Star count={config.count} variant={config.variant} color={config.color} size={sizeConfig.icon} />;
      case 'shield':
        return <Shield color={config.color} size={sizeConfig.icon} />;
      default:
        return <Chevron count={0} color={config.color} size={sizeConfig.icon} />;
    }
  };

  const badgeContent = (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: sizeConfig.badge,
        height: sizeConfig.badge,
        borderRadius: '50%',
        backgroundColor: `${config.color}15`,
        border: `1px solid ${config.color}40`,
        ...style,
      }}
      title={showTooltip ? config.label : undefined}
    >
      {renderIcon()}
    </div>
  );

  const wrapper = animate ? (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {badgeContent}
    </motion.div>
  ) : (
    badgeContent
  );

  if (showLabel) {
    return (
      <div className="inline-flex items-center gap-2">
        {wrapper}
        <span
          style={{
            color: config.color,
            fontSize: sizeConfig.fontSize,
            fontWeight: 600,
          }}
        >
          {config.label}
        </span>
      </div>
    );
  }

  return wrapper;
}

RankBadge.propTypes = {
  rank: PropTypes.oneOf([
    'novice',
    'trainee',
    'apprentice',
    'practitioner',
    'journeyperson',
    'expert',
    'master',
    'grandmaster',
  ]),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  showLabel: PropTypes.bool,
  showTooltip: PropTypes.bool,
  animate: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default RankBadge;
