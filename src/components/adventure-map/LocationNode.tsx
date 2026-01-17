/**
 * LocationNode
 *
 * Renders an interactive location marker on the adventure map.
 * Supports hover, selection, visited states, and character proximity.
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { LocationNodeProps } from './types';
import { REGIONS } from './data/regions';

// Size configurations
const SIZES = {
  small: { radius: 16, iconSize: 14, labelOffset: 28 },
  medium: { radius: 22, iconSize: 18, labelOffset: 34 },
  large: { radius: 30, iconSize: 24, labelOffset: 42 },
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
  const { position, icon, name, size, regionId, isAdminOnly, isLocked } = location;
  const config = SIZES[size];
  const region = REGIONS[regionId];

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

  // Animation variants
  const nodeVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.1 },
    selected: { scale: 1.15 },
    locked: { scale: 1, filter: 'grayscale(1)' },
  };

  const pulseVariants = {
    idle: { opacity: 0, scale: 1 },
    nearby: {
      opacity: [0, 0.6, 0],
      scale: [1, 1.5, 1],
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
    >
      {/* Glow filter definition */}
      <defs>
        <filter id={`location-glow-${location.id}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id={`location-gradient-${location.id}`}>
          <stop offset="0%" stopColor={region?.theme.primaryColor || '#3b82f6'} stopOpacity="0.9" />
          <stop offset="100%" stopColor={region?.theme.secondaryColor || '#1d4ed8'} stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Character nearby pulse ring */}
      {isCharacterNearby && !isLocked && (
        <motion.circle
          cx={position.x}
          cy={position.y}
          r={config.radius + 10}
          fill="none"
          stroke={region?.theme.primaryColor || '#3b82f6'}
          strokeWidth={3}
          variants={pulseVariants}
          animate="nearby"
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <motion.circle
          cx={position.x}
          cy={position.y}
          r={config.radius + 6}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeDasharray="4 2"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
        />
      )}

      {/* Outer glow ring */}
      <motion.circle
        cx={position.x}
        cy={position.y}
        r={config.radius + 4}
        fill="none"
        stroke={region?.theme.glowColor || 'rgba(59, 130, 246, 0.5)'}
        strokeWidth={isHovered || isSelected ? 3 : 2}
        filter={isHovered || isSelected ? `url(#location-glow-${location.id})` : undefined}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: isHovered || isSelected ? 0.8 : 0.4 }}
      />

      {/* Main circle - glass effect */}
      <circle
        cx={position.x}
        cy={position.y}
        r={config.radius}
        fill="rgba(0, 0, 0, 0.6)"
        stroke={region?.theme.primaryColor || '#3b82f6'}
        strokeWidth={2}
      />

      {/* Inner gradient overlay */}
      <circle
        cx={position.x}
        cy={position.y}
        r={config.radius - 2}
        fill={`url(#location-gradient-${location.id})`}
        fillOpacity={0.3}
      />

      {/* Location icon */}
      <text
        x={position.x}
        y={position.y + config.iconSize / 3}
        textAnchor="middle"
        fontSize={config.iconSize}
        style={{ pointerEvents: 'none' }}
      >
        {isLocked ? '🔒' : icon}
      </text>

      {/* Visited checkmark */}
      {isVisited && !isLocked && (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <circle
            cx={position.x + config.radius - 4}
            cy={position.y - config.radius + 4}
            r={8}
            fill="#22c55e"
          />
          <text
            x={position.x + config.radius - 4}
            y={position.y - config.radius + 8}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            fontWeight="bold"
          >
            ✓
          </text>
        </motion.g>
      )}

      {/* Admin badge */}
      {isAdminOnly && (
        <g>
          <circle
            cx={position.x - config.radius + 4}
            cy={position.y - config.radius + 4}
            r={8}
            fill="#fbbf24"
          />
          <text
            x={position.x - config.radius + 4}
            y={position.y - config.radius + 7}
            textAnchor="middle"
            fill="#422006"
            fontSize={8}
            fontWeight="bold"
          >
            ★
          </text>
        </g>
      )}

      {/* Location name label */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered || isSelected ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
      >
        {/* Label background */}
        <rect
          x={position.x - 50}
          y={position.y + config.labelOffset - 10}
          width={100}
          height={20}
          rx={10}
          fill="rgba(0, 0, 0, 0.75)"
          style={{ backdropFilter: 'blur(4px)' }}
        />

        {/* Label text */}
        <text
          x={position.x}
          y={position.y + config.labelOffset + 4}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontWeight={500}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none' }}
        >
          {name.length > 14 ? name.substring(0, 12) + '...' : name}
        </text>
      </motion.g>

      {/* Tooltip on hover */}
      {isHovered && !isLocked && (
        <motion.g
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          <rect
            x={position.x - 80}
            y={position.y - config.radius - 50}
            width={160}
            height={40}
            rx={8}
            fill="rgba(0, 0, 0, 0.9)"
            stroke={region?.theme.primaryColor || '#3b82f6'}
            strokeWidth={1}
          />
          <text
            x={position.x}
            y={position.y - config.radius - 35}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight={600}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {name}
          </text>
          <text
            x={position.x}
            y={position.y - config.radius - 20}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize={10}
            fontFamily="Inter, system-ui, sans-serif"
          >
            Press Enter or Click
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}
