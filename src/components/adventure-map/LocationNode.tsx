/**
 * LocationNode
 *
 * Renders an interactive location marker on the adventure map.
 * Theme park style with illustrated buildings instead of emoji circles.
 * Supports hover, selection, visited states, and character proximity.
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { LocationNodeProps } from './types';
import { REGIONS } from './data/regions';
import { getLocationIllustrationByProps } from './illustrations';

// Size configurations based on tier - larger for illustrated buildings
const TIER_SIZES = {
  common: { size: 60, labelOffset: 38 },
  uncommon: { size: 68, labelOffset: 42 },
  rare: { size: 76, labelOffset: 46 },
  epic: { size: 84, labelOffset: 50 },
  legendary: { size: 96, labelOffset: 56 },
};

// Theme park signpost colors
const SIGN_COLORS = {
  background: '#FFF8E1',
  border: '#8D6E63',
  text: '#5D4037',
  shadow: '#4E342E',
};

export default function LocationNode({
  location,
  isSelected = false,
  isHovered = false,
  isVisited = false,
  isCharacterNearby = false,
  onClick,
  onHover,
}: LocationNodeProps) {
  const { position, icon, name, tier, region: regionId, requiredRole, isLocked } = location;
  const config = TIER_SIZES[tier] || TIER_SIZES.common;
  const region = REGIONS[regionId];

  // Get the appropriate illustration component for this location
  const IllustrationComponent = getLocationIllustrationByProps(
    location.id,
    icon,
    name,
    regionId
  );

  const handleClick = useCallback(() => {
    if (!isLocked && onClick) {
      onClick();
    }
  }, [isLocked, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (onHover) onHover(true);
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    if (onHover) onHover(false);
  }, [onHover]);

  // Animation variants - theme park bouncy feel
  const nodeVariants = {
    idle: { scale: 1, y: 0 },
    hover: { scale: 1.08, y: -4 },
    selected: { scale: 1.12, y: -6 },
    locked: { scale: 0.95, filter: 'grayscale(0.8) opacity(0.6)' },
  };

  const pulseVariants = {
    idle: { opacity: 0, scale: 1 },
    nearby: {
      opacity: [0, 0.7, 0],
      scale: [1, 1.3, 1],
      transition: { repeat: Infinity, duration: 1.5 },
    },
  };

  const currentState = isLocked
    ? 'locked'
    : isSelected
    ? 'selected'
    : isHovered
    ? 'hover'
    : 'idle';

  // Calculate illustration position (centered on position, offset up so it sits on the ground)
  const illustrationX = position.x - config.size / 2;
  const illustrationY = position.y - config.size * 0.8;

  return (
    <motion.g
      className={`location-node location-${location.id}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
      initial="idle"
      animate={currentState}
      whileHover={!isLocked ? 'hover' : undefined}
      variants={nodeVariants}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Filter definitions */}
      <defs>
        <filter id={`location-glow-${location.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`building-shadow-${location.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Character nearby indicator - golden ring on ground */}
      {isCharacterNearby && !isLocked && (
        <motion.ellipse
          cx={position.x}
          cy={position.y + 5}
          rx={config.size / 2 + 15}
          ry={(config.size / 2 + 15) * 0.4}
          fill="none"
          stroke="#FFD700"
          strokeWidth={4}
          variants={pulseVariants}
          animate="nearby"
        />
      )}

      {/* Selection indicator - sparkling ring */}
      {isSelected && (
        <motion.ellipse
          cx={position.x}
          cy={position.y + 5}
          rx={config.size / 2 + 10}
          ry={(config.size / 2 + 10) * 0.4}
          fill="none"
          stroke="#FFD700"
          strokeWidth={3}
          strokeDasharray="8 4"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -24 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      )}

      {/* Hover glow effect */}
      {(isHovered || isSelected) && (
        <ellipse
          cx={position.x}
          cy={position.y + 5}
          rx={config.size / 2 + 5}
          ry={(config.size / 2 + 5) * 0.4}
          fill="#FFD700"
          opacity={0.3}
          filter={`url(#location-glow-${location.id})`}
        />
      )}

      {/* Illustrated building */}
      <g
        transform={`translate(${illustrationX}, ${illustrationY})`}
        filter={`url(#building-shadow-${location.id})`}
      >
        {isLocked ? (
          // Locked state - show silhouette
          <g opacity={0.5}>
            <IllustrationComponent
              size={config.size}
              animate={false}
            />
            {/* Lock overlay */}
            <g transform={`translate(${config.size / 2 - 12}, ${config.size / 2 - 8})`}>
              <rect x="0" y="8" width="24" height="18" rx="3" fill="#5D4037" />
              <path
                d="M 6 8 V 4 C 6 -2 18 -2 18 4 V 8"
                fill="none"
                stroke="#5D4037"
                strokeWidth="4"
              />
              <circle cx="12" cy="17" r="3" fill="#FFC107" />
            </g>
          </g>
        ) : (
          <IllustrationComponent
            size={config.size}
            animate={isHovered || isSelected || isCharacterNearby}
          />
        )}
      </g>

      {/* Visited checkmark badge */}
      {isVisited && !isLocked && (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <circle
            cx={position.x + config.size / 2 - 8}
            cy={illustrationY + 10}
            r={10}
            fill="#4CAF50"
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={position.x + config.size / 2 - 8}
            y={illustrationY + 14}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight="bold"
          >
            ✓
          </text>
        </motion.g>
      )}

      {/* Admin badge - golden star */}
      {requiredRole === 'admin' && (
        <g>
          <circle
            cx={position.x - config.size / 2 + 8}
            cy={illustrationY + 10}
            r={10}
            fill="#FFD700"
            stroke="#F57F17"
            strokeWidth={2}
          />
          <text
            x={position.x - config.size / 2 + 8}
            y={illustrationY + 14}
            textAnchor="middle"
            fill="#5D4037"
            fontSize={12}
            fontWeight="bold"
          >
            ★
          </text>
        </g>
      )}

      {/* Location name signpost */}
      <motion.g
        initial={{ opacity: 0.9 }}
        animate={{ opacity: isHovered || isSelected ? 1 : 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Signpost shadow */}
        <rect
          x={position.x - 52}
          y={position.y + config.labelOffset - 7}
          width={104}
          height={22}
          rx={4}
          fill={SIGN_COLORS.shadow}
          opacity={0.3}
          transform="translate(2, 2)"
        />

        {/* Signpost background */}
        <rect
          x={position.x - 52}
          y={position.y + config.labelOffset - 8}
          width={104}
          height={22}
          rx={4}
          fill={SIGN_COLORS.background}
          stroke={SIGN_COLORS.border}
          strokeWidth={2}
        />

        {/* Signpost text */}
        <text
          x={position.x}
          y={position.y + config.labelOffset + 6}
          textAnchor="middle"
          fill={SIGN_COLORS.text}
          fontSize={11}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {name.length > 14 ? name.substring(0, 12) + '...' : name}
        </text>
      </motion.g>

      {/* Detailed tooltip on hover */}
      {isHovered && !isLocked && (
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
        >
          {/* Tooltip shadow */}
          <rect
            x={position.x - 82}
            y={illustrationY - 50}
            width={164}
            height={44}
            rx={8}
            fill="rgba(0,0,0,0.2)"
            transform="translate(2, 2)"
          />

          {/* Tooltip background */}
          <rect
            x={position.x - 82}
            y={illustrationY - 52}
            width={164}
            height={44}
            rx={8}
            fill={SIGN_COLORS.background}
            stroke={region?.theme.primary || SIGN_COLORS.border}
            strokeWidth={2}
          />

          {/* Tooltip title */}
          <text
            x={position.x}
            y={illustrationY - 34}
            textAnchor="middle"
            fill={SIGN_COLORS.text}
            fontSize={13}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {name}
          </text>

          {/* Tooltip instruction */}
          <text
            x={position.x}
            y={illustrationY - 18}
            textAnchor="middle"
            fill="#8D6E63"
            fontSize={10}
            fontFamily="Inter, system-ui, sans-serif"
          >
            🎯 Click to visit
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}
