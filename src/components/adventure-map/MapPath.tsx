/**
 * MapPath
 *
 * Renders roads/paths between locations on the adventure map.
 * Different styles for roads, trails, bridges, and portals.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MapPath as MapPathType, Position } from './types';
import { useLocationPosition } from './hooks/useCalculatedLayout';

interface MapPathProps {
  path: MapPathType;
  isActive?: boolean;
  isHighlighted?: boolean;
}

// Theme park path color palette
const THEME_COLORS = {
  pathTan: '#E8DBC4',
  pathBorder: '#C9B896',
  pathShadow: '#8B7355',
  bridgeWood: '#8B4513',
  bridgePlank: '#DEB887',
  portalGold: '#FFD700',
  portalGlow: '#FFF59D',
};

// Path style configurations - theme park style
const PATH_STYLES = {
  road: {
    strokeWidth: 18,
    stroke: THEME_COLORS.pathTan,
    borderStroke: THEME_COLORS.pathBorder,
    strokeDasharray: undefined,
    strokeLinecap: 'round' as const,
  },
  trail: {
    strokeWidth: 12,
    stroke: THEME_COLORS.pathTan,
    borderStroke: THEME_COLORS.pathBorder,
    strokeDasharray: undefined, // Solid for theme park look
    strokeLinecap: 'round' as const,
  },
  bridge: {
    strokeWidth: 16,
    stroke: THEME_COLORS.bridgePlank,
    borderStroke: THEME_COLORS.bridgeWood,
    strokeDasharray: '20 4', // Plank effect
    strokeLinecap: 'butt' as const,
  },
  portal: {
    strokeWidth: 8,
    stroke: THEME_COLORS.portalGold,
    borderStroke: THEME_COLORS.portalGlow,
    strokeDasharray: '6 6',
    strokeLinecap: 'round' as const,
  },
};

// Generate organic curve control points for natural-looking paths
function generateOrganicPath(from: Position, to: Position, waypoints?: Position[]): string {
  const points: Position[] = [from, ...(waypoints || []), to];

  if (points.length === 2) {
    // Add slight curve even for direct connections
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // Calculate perpendicular offset for natural curve
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Small perpendicular offset (10% of distance, alternating direction)
    const offsetMagnitude = dist * 0.1;
    const perpX = -dy / dist * offsetMagnitude;
    const perpY = dx / dist * offsetMagnitude;

    // Alternate curve direction based on position for variety
    const curveDirection = ((from.x + from.y) % 2 === 0) ? 1 : -1;

    const controlX = midX + perpX * curveDirection;
    const controlY = midY + perpY * curveDirection;

    return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
  }

  // For paths with waypoints, use smooth Catmull-Rom-like curves
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate control points for smooth curve
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

export default function MapPath({
  path,
  isActive = false,
  isHighlighted = false,
}: MapPathProps) {
  const { from, to, waypoints, style = 'road' } = path;

  // Get calculated positions for both endpoints
  const fromPosition = useLocationPosition(from);
  const toPosition = useLocationPosition(to);

  // Build organic curved path string
  const pathString = useMemo(() => {
    if (!fromPosition || !toPosition) {
      return '';
    }

    return generateOrganicPath(fromPosition, toPosition, waypoints);
  }, [fromPosition, toPosition, waypoints]);

  // Early return after hooks
  if (!fromPosition || !toPosition || !pathString) {
    return null;
  }

  const pathStyle = PATH_STYLES[style];

  return (
    <g className={`map-path path-${path.id}`}>
      {/* Path glow filter */}
      {(isActive || isHighlighted) && (
        <defs>
          <filter id={`path-glow-${path.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Path shadow (underneath) */}
      <path
        d={pathString}
        fill="none"
        stroke={THEME_COLORS.pathShadow}
        strokeWidth={pathStyle.strokeWidth + 6}
        strokeLinecap={pathStyle.strokeLinecap}
        strokeDasharray={pathStyle.strokeDasharray}
        opacity={0.4}
        transform="translate(2, 3)"
      />

      {/* Path border/edge */}
      <path
        d={pathString}
        fill="none"
        stroke={pathStyle.borderStroke}
        strokeWidth={pathStyle.strokeWidth + 4}
        strokeLinecap={pathStyle.strokeLinecap}
        strokeDasharray={pathStyle.strokeDasharray}
      />

      {/* Main path surface */}
      <motion.path
        d={pathString}
        fill="none"
        stroke={pathStyle.stroke}
        strokeWidth={pathStyle.strokeWidth}
        strokeLinecap={pathStyle.strokeLinecap}
        strokeDasharray={pathStyle.strokeDasharray}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Center line marking (for roads) */}
      {style === 'road' && (
        <path
          d={pathString}
          fill="none"
          stroke="#D4C4A8"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="12 8"
          opacity={0.6}
        />
      )}

      {/* Highlighted overlay */}
      {isHighlighted && (
        <motion.path
          d={pathString}
          fill="none"
          stroke="#FFD700"
          strokeWidth={pathStyle.strokeWidth + 4}
          strokeLinecap={pathStyle.strokeLinecap}
          filter={`url(#path-glow-${path.id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      {/* Active path animation (character walking) */}
      {isActive && (
        <motion.path
          d={pathString}
          fill="none"
          stroke="#FFD700"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="15 10"
          filter={`url(#path-glow-${path.id})`}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -25 }}
          transition={{ repeat: Infinity, duration: 0.4, ease: 'linear' }}
        />
      )}

      {/* Portal special effect */}
      {style === 'portal' && (
        <>
          {/* Start portal ring */}
          <motion.circle
            cx={fromPosition.x}
            cy={fromPosition.y}
            r={20}
            fill="none"
            stroke={THEME_COLORS.portalGold}
            strokeWidth={3}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 0.8, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <circle
            cx={fromPosition.x}
            cy={fromPosition.y}
            r={12}
            fill={THEME_COLORS.portalGlow}
            opacity={0.3}
          />
          {/* End portal ring */}
          <motion.circle
            cx={toPosition.x}
            cy={toPosition.y}
            r={20}
            fill="none"
            stroke={THEME_COLORS.portalGold}
            strokeWidth={3}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [1.2, 0.8, 1.2], opacity: [0.8, 0.5, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <circle
            cx={toPosition.x}
            cy={toPosition.y}
            r={12}
            fill={THEME_COLORS.portalGlow}
            opacity={0.3}
          />
        </>
      )}

      {/* Bridge railings for bridge style */}
      {style === 'bridge' && (
        <>
          {/* Bridge support posts */}
          <circle
            cx={(fromPosition.x + toPosition.x) / 2}
            cy={(fromPosition.y + toPosition.y) / 2}
            r={6}
            fill={THEME_COLORS.bridgeWood}
          />
          <circle
            cx={(fromPosition.x * 0.7 + toPosition.x * 0.3)}
            cy={(fromPosition.y * 0.7 + toPosition.y * 0.3)}
            r={5}
            fill={THEME_COLORS.bridgeWood}
          />
          <circle
            cx={(fromPosition.x * 0.3 + toPosition.x * 0.7)}
            cy={(fromPosition.y * 0.3 + toPosition.y * 0.7)}
            r={5}
            fill={THEME_COLORS.bridgeWood}
          />
        </>
      )}
    </g>
  );
}
