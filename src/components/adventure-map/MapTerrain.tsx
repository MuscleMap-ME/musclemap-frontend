/**
 * MapTerrain.tsx - Theme park terrain system
 *
 * Renders the grassy green background with terrain features:
 * - Base grass texture
 * - Tree clusters (cypress-style)
 * - Water features (pond)
 * - Decorative elements (flowers, shrubs)
 */

import React from 'react';

interface TerrainProps {
  width: number;
  height: number;
}

// Theme park color palette
const COLORS = {
  grassLight: '#C4D93F',
  grassMedium: '#8DC63F',
  grassDark: '#6B9B2D',
  grassShadow: '#5A8A24',
  treeDark: '#2D4A2D',
  treeMedium: '#3B5E3B',
  treeLight: '#4A7A4A',
  treeHighlight: '#5A8A5A',
  water: '#7EC8E3',
  waterDark: '#5BADD4',
  waterHighlight: '#A8DCF0',
  pathTan: '#E8DBC4',
  pathShadow: '#D4C4A8',
  flowerPink: '#FF9ECE',
  flowerYellow: '#FFE066',
  flowerWhite: '#FFF5E6',
  shrubGreen: '#5AAF5A',
};

// Tree cluster component - cypress-style tall trees
const TreeCluster: React.FC<{ x: number; y: number; scale?: number; variant?: number }> = ({
  x, y, scale = 1, variant = 0
}) => {
  const baseScale = scale * 0.8;

  return (
    <g transform={`translate(${x}, ${y}) scale(${baseScale})`}>
      {/* Shadow */}
      <ellipse cx="0" cy="35" rx="25" ry="8" fill="rgba(0,0,0,0.15)" />

      {/* Back trees */}
      <ellipse cx="-12" cy="-10" rx="10" ry="35" fill={COLORS.treeDark} />
      <ellipse cx="15" cy="-5" rx="9" ry="30" fill={COLORS.treeDark} />

      {/* Main center tree */}
      <ellipse cx="0" cy="-15" rx="12" ry="40" fill={COLORS.treeMedium} />

      {/* Highlights */}
      <ellipse cx="-3" cy="-20" rx="6" ry="25" fill={COLORS.treeLight} opacity="0.6" />
      <ellipse cx="2" cy="-30" rx="4" ry="15" fill={COLORS.treeHighlight} opacity="0.4" />

      {/* Front small trees based on variant */}
      {variant % 2 === 0 && (
        <ellipse cx="-18" cy="5" rx="7" ry="25" fill={COLORS.treeMedium} />
      )}
      {variant % 3 === 0 && (
        <ellipse cx="20" cy="8" rx="6" ry="22" fill={COLORS.treeMedium} />
      )}
    </g>
  );
};

// Single decorative shrub
const Shrub: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x}, ${y}) scale(${scale})`}>
    <ellipse cx="0" cy="5" rx="12" ry="4" fill="rgba(0,0,0,0.1)" />
    <ellipse cx="0" cy="0" rx="10" ry="8" fill={COLORS.shrubGreen} />
    <ellipse cx="-4" cy="-2" rx="5" ry="4" fill={COLORS.treeLight} opacity="0.5" />
  </g>
);

// Flower patch
const FlowerPatch: React.FC<{ x: number; y: number; variant?: number }> = ({ x, y, variant = 0 }) => {
  const colors = [COLORS.flowerPink, COLORS.flowerYellow, COLORS.flowerWhite];

  return (
    <g transform={`translate(${x}, ${y})`}>
      {[...Array(5)].map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const radius = 4 + (i % 2) * 3;
        const fx = Math.cos(angle + variant) * radius;
        const fy = Math.sin(angle + variant) * radius * 0.5;
        return (
          <circle
            key={i}
            cx={fx}
            cy={fy}
            r={2}
            fill={colors[(i + variant) % colors.length]}
          />
        );
      })}
    </g>
  );
};

// Water feature - pond with lily pads
const WaterFeature: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Water body */}
    <ellipse
      cx={width / 2}
      cy={height / 2}
      rx={width / 2}
      ry={height / 2}
      fill={COLORS.water}
    />
    {/* Water depth gradient */}
    <ellipse
      cx={width / 2}
      cy={height / 2 + 5}
      rx={width / 2 - 10}
      ry={height / 2 - 8}
      fill={COLORS.waterDark}
      opacity="0.4"
    />
    {/* Water highlight */}
    <ellipse
      cx={width / 2 - 10}
      cy={height / 2 - 10}
      rx={width / 4}
      ry={height / 4}
      fill={COLORS.waterHighlight}
      opacity="0.5"
    />

    {/* Lily pads */}
    {[
      { cx: width * 0.3, cy: height * 0.4, r: 8 },
      { cx: width * 0.6, cy: height * 0.3, r: 6 },
      { cx: width * 0.7, cy: height * 0.6, r: 7 },
      { cx: width * 0.4, cy: height * 0.7, r: 5 },
    ].map((pad, i) => (
      <g key={i}>
        <circle cx={pad.cx} cy={pad.cy} r={pad.r} fill="#4A8A4A" opacity="0.8" />
        <path
          d={`M ${pad.cx} ${pad.cy - pad.r} L ${pad.cx} ${pad.cy}`}
          stroke={COLORS.water}
          strokeWidth="2"
        />
        {/* Small flower on some pads */}
        {i % 2 === 0 && (
          <circle cx={pad.cx + 2} cy={pad.cy - 2} r={2} fill={COLORS.flowerPink} />
        )}
      </g>
    ))}
  </g>
);

// Grass patch with texture
const GrassPatch: React.FC<{ x: number; y: number; width: number; height: number; shade?: 'light' | 'medium' | 'dark' }> = ({
  x, y, width, height, shade = 'medium'
}) => {
  const color = shade === 'light' ? COLORS.grassLight :
                shade === 'dark' ? COLORS.grassDark : COLORS.grassMedium;

  return (
    <ellipse
      cx={x + width / 2}
      cy={y + height / 2}
      rx={width / 2}
      ry={height / 2}
      fill={color}
      opacity="0.6"
    />
  );
};

export const MapTerrain: React.FC<TerrainProps> = ({ width, height }) => {
  // Pre-calculated positions for terrain features
  // These are distributed across the map to create visual interest
  const treePositions = [
    // Top left corner cluster
    { x: 80, y: 100, scale: 1.1, variant: 0 },
    { x: 150, y: 80, scale: 0.9, variant: 1 },
    { x: 50, y: 200, scale: 1.0, variant: 2 },

    // Top right area
    { x: width - 120, y: 90, scale: 1.0, variant: 3 },
    { x: width - 200, y: 150, scale: 0.85, variant: 0 },
    { x: width - 80, y: 180, scale: 0.95, variant: 1 },

    // Bottom left
    { x: 100, y: height - 180, scale: 1.05, variant: 2 },
    { x: 180, y: height - 120, scale: 0.9, variant: 3 },
    { x: 60, y: height - 250, scale: 0.8, variant: 0 },

    // Bottom right
    { x: width - 150, y: height - 150, scale: 1.0, variant: 1 },
    { x: width - 100, y: height - 220, scale: 0.85, variant: 2 },

    // Middle edges
    { x: 50, y: height / 2 - 50, scale: 0.9, variant: 3 },
    { x: 40, y: height / 2 + 100, scale: 0.75, variant: 0 },
    { x: width - 60, y: height / 2 - 80, scale: 0.85, variant: 1 },
    { x: width - 80, y: height / 2 + 60, scale: 0.9, variant: 2 },

    // Scattered interior trees
    { x: 300, y: 150, scale: 0.7, variant: 3 },
    { x: width - 350, y: 200, scale: 0.65, variant: 0 },
    { x: 350, y: height - 200, scale: 0.7, variant: 1 },
    { x: width - 400, y: height - 180, scale: 0.6, variant: 2 },
  ];

  const shrubPositions = [
    { x: 200, y: 180, scale: 0.8 },
    { x: width - 250, y: 120, scale: 0.9 },
    { x: 120, y: height - 280, scale: 0.7 },
    { x: width - 180, y: height - 250, scale: 0.85 },
    { x: width / 2 - 300, y: 220, scale: 0.6 },
    { x: width / 2 + 280, y: 180, scale: 0.7 },
    { x: width / 2 - 250, y: height - 230, scale: 0.65 },
    { x: width / 2 + 320, y: height - 200, scale: 0.75 },
  ];

  const flowerPositions = [
    { x: 250, y: 200, variant: 0 },
    { x: 300, y: 250, variant: 1 },
    { x: width - 280, y: 230, variant: 2 },
    { x: width - 320, y: 180, variant: 0 },
    { x: 280, y: height - 220, variant: 1 },
    { x: width - 350, y: height - 200, variant: 2 },
    { x: width / 2 - 200, y: 280, variant: 0 },
    { x: width / 2 + 180, y: 260, variant: 1 },
    { x: width / 2 - 180, y: height - 280, variant: 2 },
    { x: width / 2 + 200, y: height - 260, variant: 0 },
  ];

  const grassPatches = [
    { x: 150, y: 300, width: 120, height: 60, shade: 'light' as const },
    { x: width - 300, y: 280, width: 100, height: 50, shade: 'dark' as const },
    { x: 200, y: height - 350, width: 80, height: 40, shade: 'light' as const },
    { x: width - 250, y: height - 320, width: 90, height: 45, shade: 'dark' as const },
    { x: width / 2 - 100, y: 320, width: 70, height: 35, shade: 'light' as const },
    { x: width / 2 + 50, y: height - 340, width: 85, height: 42, shade: 'dark' as const },
  ];

  return (
    <g className="map-terrain">
      {/* Grass texture patches for visual variety */}
      {grassPatches.map((patch, i) => (
        <GrassPatch key={`grass-${i}`} {...patch} />
      ))}

      {/* Water feature in wellness springs area (bottom center-right) */}
      <WaterFeature
        x={width * 0.65}
        y={height * 0.7}
        width={140}
        height={80}
      />

      {/* Small stream/pond in scholar's tower area */}
      <WaterFeature
        x={width * 0.15}
        y={height * 0.55}
        width={80}
        height={50}
      />

      {/* Flower patches scattered around */}
      {flowerPositions.map((flower, i) => (
        <FlowerPatch key={`flower-${i}`} {...flower} />
      ))}

      {/* Shrubs for mid-ground detail */}
      {shrubPositions.map((shrub, i) => (
        <Shrub key={`shrub-${i}`} {...shrub} />
      ))}

      {/* Tree clusters - rendered last to be in foreground */}
      {treePositions.map((tree, i) => (
        <TreeCluster key={`tree-${i}`} {...tree} />
      ))}
    </g>
  );
};

export default MapTerrain;
