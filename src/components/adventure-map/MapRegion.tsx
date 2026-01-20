/**
 * MapRegion
 *
 * Renders a themed region area on the adventure map.
 * Theme park style with soft organic boundaries and ground tints.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MapRegionProps } from './types';

// Theme park region colors - soft, natural tints
const REGION_GROUND_COLORS: Record<string, { base: string; accent: string; border: string }> = {
  'central-hub': { base: '#F5E6D3', accent: '#E8D4B8', border: '#C9A66B' }, // Sandy castle grounds
  'warrior-arena': { base: '#E8F0E8', accent: '#D4E4D4', border: '#8BAD8B' }, // Training grass
  'progress-path': { base: '#FFF8E1', accent: '#FFE0B2', border: '#FFB74D' }, // Golden achievement area
  'guild-hall': { base: '#E3F2FD', accent: '#BBDEFB', border: '#64B5F6' }, // Community plaza
  'market-district': { base: '#FFF3E0', accent: '#FFE0B2', border: '#FF9800' }, // Market cobblestone
  'wellness-springs': { base: '#E0F7FA', accent: '#B2EBF2', border: '#4DD0E1' }, // Spa water tones
  'scholars-tower': { base: '#F3E5F5', accent: '#E1BEE7', border: '#BA68C8' }, // Mystic academy
  'summit-peak': { base: '#FCE4EC', accent: '#F8BBD9', border: '#EC407A' }, // Royal summit
};

// Generate organic blob path for region boundary
function generateOrganicShape(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number
): string {
  const padding = 30;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2 + padding;
  const ry = height / 2 + padding;

  // Generate wavy ellipse with organic variations
  const points: { x: number; y: number }[] = [];
  const numPoints = 12;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // Add organic variation using seed
    const variation = 0.85 + 0.3 * Math.sin(angle * 3 + seed) * Math.cos(angle * 2 + seed * 0.5);
    const px = cx + Math.cos(angle) * rx * variation;
    const py = cy + Math.sin(angle) * ry * variation;
    points.push({ x: px, y: py });
  }

  // Create smooth curve through points using Catmull-Rom spline
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    // Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  path += ' Z';
  return path;
}

export default function MapRegion({
  region,
  isActive = false,
  children,
}: MapRegionProps) {
  const { bounds, name, id, icon } = region;

  // Region dimensions from bounds
  const { x, y, width, height } = bounds;

  // Get region-specific ground colors
  const groundColors = REGION_GROUND_COLORS[id] || {
    base: '#E8F5E9',
    accent: '#C8E6C9',
    border: '#81C784',
  };

  // Generate organic shape path (memoized with seed based on region id)
  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }, [id]);

  const organicPath = useMemo(
    () => generateOrganicShape(x, y, width, height, seed),
    [x, y, width, height, seed]
  );

  // Label positioning
  const labelX = x + width / 2;
  const labelY = y - 25;
  const labelWidth = Math.max(name.length * 8 + 40, 100);

  return (
    <g className={`region region-${id}`}>
      {/* Region background with soft organic shape */}
      <defs>
        {/* Radial gradient for soft ground tint */}
        <radialGradient id={`ground-${id}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={groundColors.base} stopOpacity="0.6" />
          <stop offset="60%" stopColor={groundColors.accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor={groundColors.accent} stopOpacity="0" />
        </radialGradient>

        {/* Soft edge filter for organic boundary */}
        <filter id={`soft-edge-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Active glow filter */}
        <filter id={`active-glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feFlood floodColor={groundColors.border} floodOpacity="0.5" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Drop shadow for signpost */}
        <filter id={`sign-shadow-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#3E2723" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Soft ground tint - organic shape */}
      <motion.path
        d={organicPath}
        fill={`url(#ground-${id})`}
        filter={isActive ? `url(#active-glow-${id})` : `url(#soft-edge-${id})`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Dashed border when active - like a garden fence */}
      {isActive && (
        <motion.path
          d={organicPath}
          fill="none"
          stroke={groundColors.border}
          strokeWidth={3}
          strokeDasharray="8 6"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      )}

      {/* Theme park signpost label */}
      <motion.g
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {/* Signpost pole */}
        <rect
          x={labelX - 3}
          y={labelY + 12}
          width={6}
          height={25}
          fill="#5D4037"
          rx={2}
        />
        <rect
          x={labelX - 2}
          y={labelY + 12}
          width={2}
          height={25}
          fill="#8D6E63"
          rx={1}
        />

        {/* Sign board background */}
        <g filter={`url(#sign-shadow-${id})`}>
          {/* Main sign board */}
          <rect
            x={labelX - labelWidth / 2}
            y={labelY - 12}
            width={labelWidth}
            height={28}
            rx={4}
            fill="#FFF8E1"
            stroke="#5D4037"
            strokeWidth={2}
          />

          {/* Sign board inner border */}
          <rect
            x={labelX - labelWidth / 2 + 3}
            y={labelY - 9}
            width={labelWidth - 6}
            height={22}
            rx={2}
            fill="none"
            stroke="#D7CCC8"
            strokeWidth={1}
          />

          {/* Decorative corner nails */}
          <circle cx={labelX - labelWidth / 2 + 8} cy={labelY - 4} r={2} fill="#8D6E63" />
          <circle cx={labelX + labelWidth / 2 - 8} cy={labelY - 4} r={2} fill="#8D6E63" />
          <circle cx={labelX - labelWidth / 2 + 8} cy={labelY + 8} r={2} fill="#8D6E63" />
          <circle cx={labelX + labelWidth / 2 - 8} cy={labelY + 8} r={2} fill="#8D6E63" />
        </g>

        {/* Region icon and name */}
        <text
          x={labelX}
          y={labelY + 6}
          textAnchor="middle"
          fill="#4E342E"
          fontSize={13}
          fontWeight={700}
          fontFamily="'Fredoka One', 'Comic Sans MS', cursive, sans-serif"
          style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          {icon} {name}
        </text>
      </motion.g>

      {/* Admin-only indicator - special VIP badge */}
      {region.isAdminOnly && (
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        >
          {/* Crown/VIP badge */}
          <g transform={`translate(${x + width - 20}, ${y - 35})`}>
            {/* Badge background */}
            <ellipse cx="0" cy="0" rx="22" ry="14" fill="#FFD700" stroke="#B8860B" strokeWidth={2} />
            {/* Crown icon */}
            <path
              d="M -10 2 L -8 -6 L -4 -2 L 0 -8 L 4 -2 L 8 -6 L 10 2 Z"
              fill="#B8860B"
            />
            {/* VIP text */}
            <text
              x="0"
              y="8"
              textAnchor="middle"
              fill="#5D4037"
              fontSize={8}
              fontWeight={800}
              fontFamily="Inter, system-ui, sans-serif"
            >
              VIP
            </text>
          </g>
        </motion.g>
      )}

      {/* Small decorative elements around region */}
      {isActive && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Subtle sparkles */}
          {[0, 1, 2, 3].map((i) => {
            const angle = (i / 4) * Math.PI * 2 + seed * 0.1;
            const dist = Math.min(width, height) / 2 + 50;
            const sx = x + width / 2 + Math.cos(angle) * dist;
            const sy = y + height / 2 + Math.sin(angle) * dist;
            return (
              <motion.circle
                key={i}
                cx={sx}
                cy={sy}
                r={3}
                fill={groundColors.border}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  delay: i * 0.5,
                  ease: 'easeInOut',
                }}
              />
            );
          })}
        </motion.g>
      )}

      {/* Children (location nodes) */}
      {children}
    </g>
  );
}
