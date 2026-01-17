/**
 * MapRegion
 *
 * Renders a themed region area on the adventure map.
 * Each region has a distinct color theme and glow effect.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { MapRegionProps } from './types';

export default function MapRegion({
  region,
  isActive = false,
  children,
}: MapRegionProps) {
  const { bounds, theme, name, id } = region;

  // Calculate region dimensions
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const padding = 20;

  return (
    <g className={`region region-${id}`}>
      {/* Region background with glass effect */}
      <defs>
        <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.primaryColor} stopOpacity="0.15" />
          <stop offset="50%" stopColor={theme.secondaryColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={theme.primaryColor} stopOpacity="0.12" />
        </linearGradient>

        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`active-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow when active */}
      {isActive && (
        <motion.rect
          x={bounds.minX - padding - 5}
          y={bounds.minY - padding - 5}
          width={width + padding * 2 + 10}
          height={height + padding * 2 + 10}
          rx={24}
          fill="none"
          stroke={theme.glowColor}
          strokeWidth={3}
          filter={`url(#active-glow-${id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      {/* Region boundary */}
      <motion.rect
        x={bounds.minX - padding}
        y={bounds.minY - padding}
        width={width + padding * 2}
        height={height + padding * 2}
        rx={20}
        fill={`url(#gradient-${id})`}
        stroke={theme.primaryColor}
        strokeWidth={isActive ? 2 : 1}
        strokeOpacity={isActive ? 0.6 : 0.3}
        filter={isActive ? `url(#glow-${id})` : undefined}
        initial={false}
        animate={{
          strokeOpacity: isActive ? 0.6 : 0.3,
        }}
        transition={{ duration: 0.3 }}
        style={{
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Region label */}
      <motion.g
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Label background */}
        <rect
          x={bounds.minX + width / 2 - 60}
          y={bounds.minY - padding - 10}
          width={120}
          height={24}
          rx={12}
          fill={theme.primaryColor}
          fillOpacity={0.9}
        />

        {/* Region icon and name */}
        <text
          x={bounds.minX + width / 2}
          y={bounds.minY - padding + 6}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {theme.icon} {name}
        </text>
      </motion.g>

      {/* Admin-only indicator */}
      {region.isAdminOnly && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <rect
            x={bounds.maxX + padding - 50}
            y={bounds.minY - padding - 10}
            width={50}
            height={20}
            rx={10}
            fill="#fbbf24"
            fillOpacity={0.9}
          />
          <text
            x={bounds.maxX + padding - 25}
            y={bounds.minY - padding + 4}
            textAnchor="middle"
            fill="#422006"
            fontSize={10}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
          >
            ADMIN
          </text>
        </motion.g>
      )}

      {/* Children (location nodes) */}
      {children}
    </g>
  );
}
