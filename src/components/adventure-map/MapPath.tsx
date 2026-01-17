/**
 * MapPath
 *
 * Renders roads/paths between locations on the adventure map.
 * Different styles for roads, trails, bridges, and portals.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MapPath as MapPathType, Position } from './types';
import { getLocation } from './data/mapLayout';

interface MapPathProps {
  path: MapPathType;
  isActive?: boolean;
  isHighlighted?: boolean;
}

// Path style configurations
const PATH_STYLES = {
  road: {
    strokeWidth: 6,
    stroke: 'rgba(120, 120, 140, 0.4)',
    strokeDasharray: undefined,
    strokeLinecap: 'round' as const,
  },
  trail: {
    strokeWidth: 3,
    stroke: 'rgba(100, 100, 120, 0.35)',
    strokeDasharray: '8 4',
    strokeLinecap: 'round' as const,
  },
  bridge: {
    strokeWidth: 5,
    stroke: 'rgba(139, 92, 246, 0.3)',
    strokeDasharray: '12 6',
    strokeLinecap: 'round' as const,
  },
  portal: {
    strokeWidth: 2,
    stroke: 'rgba(251, 191, 36, 0.5)',
    strokeDasharray: '4 8',
    strokeLinecap: 'round' as const,
  },
};

export default function MapPath({
  path,
  isActive = false,
  isHighlighted = false,
}: MapPathProps) {
  const { from, to, waypoints, style = 'road' } = path;

  // Get location positions
  const fromLocation = getLocation(from);
  const toLocation = getLocation(to);

  // Build path string (always call useMemo to avoid conditional hook call)
  const pathString = useMemo(() => {
    if (!fromLocation || !toLocation) {
      return '';
    }

    const points: Position[] = [
      fromLocation.position,
      ...(waypoints || []),
      toLocation.position,
    ];

    if (points.length === 2) {
      // Simple line
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    // Curved path using quadratic bezier
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];

      // Control point calculation for smooth curve
      const cpX = curr.x;
      const cpY = curr.y;

      d += ` Q ${cpX} ${cpY} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
    }

    // Final segment
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;

    return d;
  }, [fromLocation, toLocation, waypoints]);

  // Early return after hooks
  if (!fromLocation || !toLocation || !pathString) {
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

      {/* Base path shadow */}
      <path
        d={pathString}
        fill="none"
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth={pathStyle.strokeWidth + 2}
        strokeLinecap={pathStyle.strokeLinecap}
        strokeDasharray={pathStyle.strokeDasharray}
      />

      {/* Main path */}
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

      {/* Highlighted overlay */}
      {isHighlighted && (
        <motion.path
          d={pathString}
          fill="none"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth={pathStyle.strokeWidth + 2}
          strokeLinecap={pathStyle.strokeLinecap}
          filter={`url(#path-glow-${path.id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}

      {/* Active path animation (character walking) */}
      {isActive && (
        <motion.path
          d={pathString}
          fill="none"
          stroke="rgba(251, 191, 36, 0.8)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="10 10"
          filter={`url(#path-glow-${path.id})`}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -20 }}
          transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}
        />
      )}

      {/* Portal special effect */}
      {style === 'portal' && (
        <>
          {/* Start portal ring */}
          <motion.circle
            cx={fromLocation.position.x}
            cy={fromLocation.position.y}
            r={15}
            fill="none"
            stroke="rgba(251, 191, 36, 0.5)"
            strokeWidth={2}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 0.8, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          {/* End portal ring */}
          <motion.circle
            cx={toLocation.position.x}
            cy={toLocation.position.y}
            r={15}
            fill="none"
            stroke="rgba(251, 191, 36, 0.5)"
            strokeWidth={2}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [1.2, 0.8, 1.2], opacity: [0.8, 0.5, 0.8] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </>
      )}

      {/* Bridge pillars for bridge style */}
      {style === 'bridge' && (
        <>
          <circle
            cx={(fromLocation.position.x + toLocation.position.x) / 2}
            cy={(fromLocation.position.y + toLocation.position.y) / 2}
            r={4}
            fill="rgba(139, 92, 246, 0.4)"
          />
        </>
      )}
    </g>
  );
}
