/**
 * VeteranBadge Component
 *
 * Displays tenure-based veteran badges for MuscleMap members.
 *
 * Veteran Tiers:
 * - Tier 0: No badge (< 6 months)
 * - Tier 1 (Bronze): 6+ months
 * - Tier 2 (Silver): 1+ year
 * - Tier 3 (Gold): 2+ years
 *
 * @example
 * <VeteranBadge tier={2} size="md" />
 * <VeteranBadge tier={3} size="lg" showLabel />
 */

import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

// Veteran tier configurations
const TIER_CONFIG = {
  0: {
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563'],
    label: 'New Member',
    description: 'Less than 6 months',
  },
  1: {
    color: '#CD7F32',
    gradient: ['#CD7F32', '#8B4513'],
    label: 'Bronze Veteran',
    description: '6+ months',
  },
  2: {
    color: '#C0C0C0',
    gradient: ['#E8E8E8', '#A0A0A0'],
    label: 'Silver Veteran',
    description: '1+ year',
  },
  3: {
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    label: 'Gold Veteran',
    description: '2+ years',
  },
};

// Size configurations
const SIZES = {
  xs: { badge: 16, icon: 12, fontSize: '0.5rem', strokeWidth: 1 },
  sm: { badge: 24, icon: 16, fontSize: '0.625rem', strokeWidth: 1.5 },
  md: { badge: 32, icon: 22, fontSize: '0.75rem', strokeWidth: 2 },
  lg: { badge: 48, icon: 32, fontSize: '0.875rem', strokeWidth: 2 },
  xl: { badge: 64, icon: 44, fontSize: '1rem', strokeWidth: 2.5 },
};

// Medal SVG component
function Medal({ tier, size, strokeWidth }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[0];
  const gradientId = `veteran-grad-${tier}`;

  // No badge for tier 0
  if (tier === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke={config.color}
          strokeWidth={strokeWidth}
          strokeDasharray="4 2"
          opacity={0.4}
        />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="10"
          fill={config.color}
          opacity={0.6}
        >
          ?
        </text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={config.gradient[0]} />
          <stop offset="100%" stopColor={config.gradient[1]} />
        </linearGradient>
        <filter id={`shadow-${tier}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor={config.color} floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Ribbon at top */}
      <path
        d="M8 2V8L12 6L16 8V2"
        fill={`url(#${gradientId})`}
        stroke={config.color}
        strokeWidth={strokeWidth * 0.5}
        strokeLinejoin="round"
      />

      {/* Medal circle */}
      <circle
        cx="12"
        cy="15"
        r="7"
        fill={`url(#${gradientId})`}
        stroke={config.color}
        strokeWidth={strokeWidth * 0.75}
        filter={`url(#shadow-${tier})`}
      />

      {/* Star in center */}
      <path
        d="M12 10L13.09 12.91L16 13.27L14 15.14L14.54 18L12 16.5L9.46 18L10 15.14L8 13.27L10.91 12.91L12 10Z"
        fill={tier === 3 ? '#FFFFFF' : config.gradient[1]}
        stroke={tier === 3 ? config.gradient[1] : 'none'}
        strokeWidth="0.5"
      />

      {/* Tier number indicator (small dots at bottom) */}
      {tier >= 1 && <circle cx="9" cy="20" r="1" fill={config.color} opacity="0.8" />}
      {tier >= 2 && <circle cx="12" cy="20" r="1" fill={config.color} opacity="0.8" />}
      {tier >= 3 && <circle cx="15" cy="20" r="1" fill={config.color} opacity="0.8" />}
    </svg>
  );
}

export function VeteranBadge({
  tier = 0,
  size = 'md',
  showLabel = false,
  showTooltip = true,
  showDescription = false,
  animate = true,
  className = '',
  style = {},
}) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[0];
  const sizeConfig = SIZES[size] || SIZES.md;

  // Don't render anything for tier 0 unless explicitly showing
  if (tier === 0 && !showLabel && !showDescription) {
    return null;
  }

  const badgeContent = (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: sizeConfig.badge,
        height: sizeConfig.badge,
        borderRadius: '50%',
        backgroundColor: `${config.color}15`,
        border: `1px solid ${config.color}30`,
        ...style,
      }}
      title={showTooltip ? `${config.label} - ${config.description}` : undefined}
    >
      <Medal tier={tier} size={sizeConfig.icon} strokeWidth={sizeConfig.strokeWidth} />
    </div>
  );

  const wrapper = animate ? (
    <motion.div
      whileHover={{ scale: 1.1, rotate: tier > 0 ? 5 : 0 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      {badgeContent}
    </motion.div>
  ) : (
    badgeContent
  );

  if (showLabel || showDescription) {
    return (
      <div className="inline-flex items-center gap-2">
        {wrapper}
        <div className="flex flex-col">
          {showLabel && (
            <span
              style={{
                color: config.color,
                fontSize: sizeConfig.fontSize,
                fontWeight: 600,
              }}
            >
              {config.label}
            </span>
          )}
          {showDescription && (
            <span
              style={{
                color: `${config.color}99`,
                fontSize: `calc(${sizeConfig.fontSize} * 0.85)`,
                fontWeight: 400,
              }}
            >
              {config.description}
            </span>
          )}
        </div>
      </div>
    );
  }

  return wrapper;
}

VeteranBadge.propTypes = {
  tier: PropTypes.oneOf([0, 1, 2, 3]),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  showLabel: PropTypes.bool,
  showTooltip: PropTypes.bool,
  showDescription: PropTypes.bool,
  animate: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

// Helper function to calculate tier from months
export function calculateVeteranTier(monthsActive) {
  if (monthsActive >= 24) return 3; // 2+ years = Gold
  if (monthsActive >= 12) return 2; // 1+ year = Silver
  if (monthsActive >= 6) return 1;  // 6+ months = Bronze
  return 0;                          // New member
}

// Helper to calculate from join date
export function getVeteranTierFromDate(joinDate) {
  const now = new Date();
  const join = new Date(joinDate);
  const monthsDiff = (now.getFullYear() - join.getFullYear()) * 12 +
    (now.getMonth() - join.getMonth());
  return calculateVeteranTier(monthsDiff);
}

export default VeteranBadge;
