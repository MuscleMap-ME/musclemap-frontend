/**
 * WorldMapD3 - Interactive Geographic Visualization
 *
 * Features:
 * - D3 geo projections
 * - Animated markers
 * - Heat map coloring
 * - Zoom and pan
 * - Connection lines
 * - Beautiful glow effects
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../core/D3Container';
import { easings } from '../core/animations';

// ============================================
// TYPES
// ============================================

export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  value: number;
  category?: string;
  data?: Record<string, unknown>;
}

export interface MapConnection {
  from: string;
  to: string;
  weight?: number;
}

export interface WorldMapD3Props {
  locations: MapLocation[];
  connections?: MapConnection[];
  onLocationClick?: (location: MapLocation) => void;
  onLocationHover?: (location: MapLocation | null) => void;
  height?: number;
  className?: string;
  projection?: 'mercator' | 'naturalEarth' | 'orthographic' | 'equirectangular';
  showConnections?: boolean;
  animated?: boolean;
  interactive?: boolean;
  markerSizeRange?: [number, number];
  colorScheme?: string[];
}

// ============================================
// WORLD MAP DATA (simplified GeoJSON)
// ============================================

// We'll use a simplified world outline
const _WORLD_OUTLINE: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-180, 90], [180, 90], [180, -90], [-180, -90], [-180, 90]
    ]]
  }
};

// Major landmass simplified paths (for a beautiful visualization without loading full GeoJSON)
const SIMPLIFIED_CONTINENTS: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // North America
    {
      type: 'Feature',
      properties: { name: 'North America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-168, 65], [-140, 70], [-100, 75], [-60, 60], [-50, 45],
          [-65, 45], [-75, 35], [-80, 25], [-95, 20], [-105, 20],
          [-120, 35], [-125, 40], [-130, 55], [-145, 60], [-168, 65]
        ]]
      }
    },
    // South America
    {
      type: 'Feature',
      properties: { name: 'South America' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80, 10], [-60, 5], [-35, -5], [-40, -20], [-55, -25],
          [-65, -40], [-70, -55], [-75, -50], [-80, -40], [-75, -20],
          [-80, -5], [-80, 10]
        ]]
      }
    },
    // Europe
    {
      type: 'Feature',
      properties: { name: 'Europe' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-10, 35], [0, 38], [5, 43], [10, 45], [20, 40], [25, 42],
          [30, 45], [40, 45], [50, 50], [60, 55], [50, 60], [30, 70],
          [10, 70], [-5, 60], [-10, 50], [-10, 35]
        ]]
      }
    },
    // Africa
    {
      type: 'Feature',
      properties: { name: 'Africa' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-15, 35], [10, 37], [25, 32], [35, 30], [45, 12], [50, 2],
          [40, -10], [35, -25], [25, -35], [15, -35], [10, -30],
          [5, -5], [-5, 5], [-15, 15], [-20, 20], [-15, 35]
        ]]
      }
    },
    // Asia
    {
      type: 'Feature',
      properties: { name: 'Asia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [25, 42], [40, 45], [60, 55], [80, 70], [100, 75], [140, 70],
          [170, 65], [180, 60], [145, 45], [130, 35], [120, 25],
          [110, 20], [100, 10], [95, 5], [80, 8], [75, 15], [70, 25],
          [65, 25], [55, 25], [45, 35], [35, 37], [25, 42]
        ]]
      }
    },
    // Australia
    {
      type: 'Feature',
      properties: { name: 'Australia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [115, -20], [120, -18], [130, -12], [140, -12], [150, -25],
          [155, -30], [150, -38], [140, -40], [130, -35], [120, -35],
          [115, -30], [115, -20]
        ]]
      }
    }
  ]
};

// ============================================
// DEFAULT COLORS
// ============================================

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e'];

// ============================================
// COMPONENT
// ============================================

export function WorldMapD3({
  locations,
  connections = [],
  onLocationClick,
  onLocationHover,
  height = 500,
  className = '',
  projection = 'naturalEarth',
  showConnections = true,
  animated = true,
  interactive = true,
  markerSizeRange = [5, 30],
  colorScheme = DEFAULT_COLORS,
}: WorldMapD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Update dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate marker size scale
  const sizeScale = useMemo(() => {
    const maxValue = Math.max(...locations.map((l) => l.value), 1);
    return d3.scaleSqrt()
      .domain([0, maxValue])
      .range(markerSizeRange);
  }, [locations, markerSizeRange]);

  // Color scale
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string>().range(colorScheme);
  }, [colorScheme]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height: h } = dimensions;

    // Clear previous
    svg.selectAll('*').remove();

    // Setup
    svg
      .attr('width', width)
      .attr('height', h)
      .attr('viewBox', `0 0 ${width} ${h}`);

    // Create projection
    let geoProjection: d3.GeoProjection;
    switch (projection) {
      case 'mercator':
        geoProjection = d3.geoMercator();
        break;
      case 'orthographic':
        geoProjection = d3.geoOrthographic();
        break;
      case 'equirectangular':
        geoProjection = d3.geoEquirectangular();
        break;
      default:
        geoProjection = d3.geoNaturalEarth1();
    }

    geoProjection
      .scale(width / 5.5)
      .translate([width / 2, h / 2]);

    const pathGenerator = d3.geoPath().projection(geoProjection);

    // Defs
    const defs = svg.append('defs');

    // Ocean gradient
    const oceanGradient = defs
      .append('radialGradient')
      .attr('id', 'ocean-gradient')
      .attr('cx', '30%')
      .attr('cy', '30%');

    oceanGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#1e3a5f')
      .attr('stop-opacity', '0.3');

    oceanGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0a0a1a')
      .attr('stop-opacity', '0.8');

    // Glow filter for markers
    const glowFilter = defs
      .append('filter')
      .attr('id', 'marker-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');

    glowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 5)
      .attr('result', 'blur');

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main container for zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Ocean background
    g.append('rect')
      .attr('width', width * 3)
      .attr('height', h * 3)
      .attr('x', -width)
      .attr('y', -h)
      .attr('fill', 'url(#ocean-gradient)');

    // Draw continents
    const landGroup = g.append('g').attr('class', 'land');

    landGroup
      .selectAll('path')
      .data(SIMPLIFIED_CONTINENTS.features)
      .enter()
      .append('path')
      .attr('d', (d) => pathGenerator(d) || '')
      .attr('fill', 'rgba(30, 41, 59, 0.8)')
      .attr('stroke', 'rgba(71, 85, 105, 0.5)')
      .attr('stroke-width', 0.5);

    // Animate land entrance
    if (animated) {
      landGroup
        .selectAll('path')
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay((_, i) => i * 100)
        .attr('opacity', 1);
    }

    // Draw connections
    if (showConnections && connections.length > 0) {
      const connectionGroup = g.append('g').attr('class', 'connections');

      connections.forEach((conn, i) => {
        const fromLoc = locations.find((l) => l.id === conn.from);
        const toLoc = locations.find((l) => l.id === conn.to);

        if (!fromLoc || !toLoc) return;

        const fromPoint = geoProjection([fromLoc.lng, fromLoc.lat]);
        const toPoint = geoProjection([toLoc.lng, toLoc.lat]);

        if (!fromPoint || !toPoint) return;

        // Calculate arc
        const midX = (fromPoint[0] + toPoint[0]) / 2;
        const midY = (fromPoint[1] + toPoint[1]) / 2;
        const dist = Math.sqrt(
          Math.pow(toPoint[0] - fromPoint[0], 2) +
          Math.pow(toPoint[1] - fromPoint[1], 2)
        );
        const arc = dist * 0.2;

        const path = connectionGroup
          .append('path')
          .attr('d', `M ${fromPoint[0]} ${fromPoint[1]} Q ${midX} ${midY - arc} ${toPoint[0]} ${toPoint[1]}`)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(139, 92, 246, 0.5)')
          .attr('stroke-width', Math.max(1, (conn.weight || 1) * 0.5))
          .attr('stroke-dasharray', '4 2');

        // Animate connection
        if (animated) {
          const pathNode = path.node();
          if (pathNode) {
            const length = pathNode.getTotalLength();
            path
              .attr('stroke-dasharray', `${length} ${length}`)
              .attr('stroke-dashoffset', length)
              .transition()
              .duration(1500)
              .delay(800 + i * 100)
              .ease(easings.smooth)
              .attr('stroke-dashoffset', 0)
              .on('end', function() {
                d3.select(this).attr('stroke-dasharray', '4 2');
              });
          }
        }
      });
    }

    // Draw markers
    const markerGroup = g.append('g').attr('class', 'markers');

    // Sort by value (smaller on top for visibility)
    const sortedLocations = [...locations].sort((a, b) => b.value - a.value);

    sortedLocations.forEach((loc, i) => {
      const point = geoProjection([loc.lng, loc.lat]);
      if (!point) return;

      const color = colorScale(loc.category || 'default');
      const size = sizeScale(loc.value);

      // Outer glow circle
      const glowCircle = markerGroup
        .append('circle')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', size * 1.5)
        .attr('fill', color)
        .attr('opacity', 0.2)
        .style('filter', 'url(#marker-glow)');

      // Main circle
      const circle = markerGroup
        .append('circle')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', size)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('cursor', interactive ? 'pointer' : 'default')
        .style('filter', 'url(#marker-glow)');

      // Label
      if (loc.value > sizeScale.domain()[1] * 0.3) {
        markerGroup
          .append('text')
          .attr('x', point[0])
          .attr('y', point[1] + size + 15)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)')
          .text(loc.name);
      }

      // Animate entrance
      if (animated) {
        circle
          .attr('r', 0)
          .attr('opacity', 0)
          .transition()
          .duration(500)
          .delay(1000 + i * 50)
          .ease(easings.elastic)
          .attr('r', size)
          .attr('opacity', 1);

        glowCircle
          .attr('r', 0)
          .attr('opacity', 0)
          .transition()
          .duration(500)
          .delay(1000 + i * 50)
          .ease(easings.elastic)
          .attr('r', size * 1.5)
          .attr('opacity', 0.2);
      }

      // Pulsing animation
      if (animated) {
        const pulse = () => {
          glowCircle
            .transition()
            .duration(1500)
            .ease(easings.sin)
            .attr('r', size * 2)
            .attr('opacity', 0.1)
            .transition()
            .duration(1500)
            .ease(easings.sin)
            .attr('r', size * 1.5)
            .attr('opacity', 0.2)
            .on('end', pulse);
        };
        setTimeout(pulse, 1500 + i * 50);
      }

      // Interactivity
      if (interactive) {
        circle
          .on('mouseenter', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('r', size * 1.3)
              .attr('stroke-width', 3);

            glowCircle
              .transition()
              .duration(200)
              .attr('r', size * 2)
              .attr('opacity', 0.4);

            setHoveredLocation(loc.id);
            onLocationHover?.(loc);
          })
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('r', size)
              .attr('stroke-width', 2);

            glowCircle
              .transition()
              .duration(200)
              .attr('r', size * 1.5)
              .attr('opacity', 0.2);

            setHoveredLocation(null);
            onLocationHover?.(null);
          })
          .on('click', () => {
            onLocationClick?.(loc);
          });
      }
    });
  }, [
    locations,
    connections,
    dimensions,
    projection,
    showConnections,
    animated,
    interactive,
    sizeScale,
    colorScale,
    onLocationClick,
    onLocationHover,
  ]);

  return (
    <D3Container
      height={height}
      className={className}
      noPadding
    >
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ height }}
      >
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Tooltip */}
      {hoveredLocation && interactive && (
        <div className="absolute top-4 right-4 px-4 py-3 rounded-xl bg-black/80 backdrop-blur-sm border border-white/20 shadow-xl">
          <div className="text-white font-semibold">
            {locations.find((l) => l.id === hoveredLocation)?.name}
          </div>
          <div className="text-sm mt-1">
            <span className="text-gray-400">Active: </span>
            <span className="text-purple-400 font-bold">
              {locations.find((l) => l.id === hoveredLocation)?.value}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm">
        <div className="text-xs text-gray-400">Scroll to zoom, drag to pan</div>
      </div>
    </D3Container>
  );
}

export default WorldMapD3;
