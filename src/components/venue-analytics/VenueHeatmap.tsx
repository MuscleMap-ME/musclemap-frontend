/**
 * VenueHeatmap - Geographic Activity Heatmap
 *
 * Displays a heatmap of venues on a map showing:
 * - Venue locations with activity intensity
 * - Interactive markers with venue details
 * - Cluster visualization for dense areas
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../d3/core/D3Container';
import { easings } from '../d3/core/animations';

// ============================================
// TYPES
// ============================================

export interface VenueHeatmapPoint {
  venueId: string;
  venueName: string;
  latitude: number;
  longitude: number;
  intensity: number; // 0-1 based on activity level
  workouts: number;
  users?: number;
}

export interface VenueHeatmapProps {
  data: VenueHeatmapPoint[];
  height?: number;
  className?: string;
  colorScale?: [string, string, string]; // [low, mid, high]
  animated?: boolean;
  showLabels?: boolean;
  minZoom?: number;
  maxZoom?: number;
  centerLatitude?: number;
  centerLongitude?: number;
}

// ============================================
// COMPONENT
// ============================================

export function VenueHeatmap({
  data,
  height = 400,
  className = '',
  colorScale = ['#1e1b4b', '#7c3aed', '#fbbf24'],
  animated = true,
  showLabels = true,
  minZoom = 0.5,
  maxZoom = 10,
  centerLatitude,
  centerLongitude,
}: VenueHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredVenue, setHoveredVenue] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const margin = useMemo(() => ({ top: 10, right: 10, bottom: 10, left: 10 }), []);

  // Calculate bounds
  const bounds = useMemo(() => {
    if (data.length === 0) return null;

    const lats = data.map((d) => d.latitude);
    const lngs = data.map((d) => d.longitude);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [data]);

  // Center point
  const center = useMemo(() => {
    if (centerLatitude !== undefined && centerLongitude !== undefined) {
      return { lat: centerLatitude, lng: centerLongitude };
    }
    if (!bounds) return { lat: 40.7128, lng: -74.006 }; // Default to NYC

    return {
      lat: (bounds.minLat + bounds.maxLat) / 2,
      lng: (bounds.minLng + bounds.maxLng) / 2,
    };
  }, [bounds, centerLatitude, centerLongitude]);

  // Max intensity for scaling
  const maxIntensity = useMemo(() => {
    return Math.max(...data.map((d) => d.intensity), 0.1);
  }, [data]);

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

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || !bounds) return;

    const svg = d3.select(svgRef.current);
    const { width, height: h } = dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = h - margin.top - margin.bottom;

    // Clear previous
    svg.selectAll('*').remove();

    // Setup
    svg
      .attr('width', width)
      .attr('height', h)
      .attr('viewBox', `0 0 ${width} ${h}`);

    // Defs
    const defs = svg.append('defs');

    // Color scale for heatmap
    const color = d3
      .scaleSequential()
      .domain([0, maxIntensity])
      .interpolator(d3.interpolateRgbBasis(colorScale));

    // Radial gradient for each point
    data.forEach((point, i) => {
      const gradient = defs
        .append('radialGradient')
        .attr('id', `heatmap-gradient-${i}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color(point.intensity))
        .attr('stop-opacity', 0.9);

      gradient
        .append('stop')
        .attr('offset', '70%')
        .attr('stop-color', color(point.intensity))
        .attr('stop-opacity', 0.4);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color(point.intensity))
        .attr('stop-opacity', 0);
    });

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'venue-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');

    glowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 4)
      .attr('result', 'blur');

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Projection - Mercator for local areas
    const projection = d3
      .geoMercator()
      .center([center.lng, center.lat])
      .scale(calculateScale(bounds, innerWidth, innerHeight))
      .translate([innerWidth / 2, innerHeight / 2]);

    // Main group for zoom/pan
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Clip path
    g.append('clipPath')
      .attr('id', 'map-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    // Map content group
    const mapGroup = g.append('g').attr('clip-path', 'url(#map-clip)');

    // Background
    mapGroup
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'rgba(0, 0, 0, 0.2)')
      .attr('rx', 8);

    // Grid lines for reference
    const gridGroup = mapGroup.append('g').attr('class', 'grid');

    // Draw latitude lines
    const latStep = (bounds.maxLat - bounds.minLat) / 4;
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
      const points = [
        projection([bounds.minLng, lat]),
        projection([bounds.maxLng, lat]),
      ];
      if (points[0] && points[1]) {
        gridGroup
          .append('line')
          .attr('x1', points[0][0])
          .attr('y1', points[0][1])
          .attr('x2', points[1][0])
          .attr('y2', points[1][1])
          .attr('stroke', 'rgba(255, 255, 255, 0.05)')
          .attr('stroke-dasharray', '4 2');
      }
    }

    // Draw longitude lines
    const lngStep = (bounds.maxLng - bounds.minLng) / 4;
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      const points = [
        projection([lng, bounds.minLat]),
        projection([lng, bounds.maxLat]),
      ];
      if (points[0] && points[1]) {
        gridGroup
          .append('line')
          .attr('x1', points[0][0])
          .attr('y1', points[0][1])
          .attr('x2', points[1][0])
          .attr('y2', points[1][1])
          .attr('stroke', 'rgba(255, 255, 255, 0.05)')
          .attr('stroke-dasharray', '4 2');
      }
    }

    // Heatmap layer - draw heat circles first (background)
    const heatGroup = mapGroup.append('g').attr('class', 'heat');

    data.forEach((point, i) => {
      const coords = projection([point.longitude, point.latitude]);
      if (!coords) return;

      const radius = 20 + point.intensity * 40;

      heatGroup
        .append('circle')
        .attr('cx', coords[0])
        .attr('cy', coords[1])
        .attr('r', animated ? 0 : radius)
        .attr('fill', `url(#heatmap-gradient-${i})`)
        .attr('pointer-events', 'none')
        .transition()
        .duration(animated ? 800 : 0)
        .delay(i * 50)
        .ease(easings.easeOut)
        .attr('r', radius);
    });

    // Venue markers
    const markersGroup = mapGroup.append('g').attr('class', 'markers');

    const markers = markersGroup
      .selectAll('.marker')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'marker')
      .attr('transform', (d) => {
        const coords = projection([d.longitude, d.latitude]);
        return coords ? `translate(${coords[0]}, ${coords[1]})` : '';
      })
      .attr('cursor', 'pointer');

    // Marker circles
    const markerCircles = markers
      .append('circle')
      .attr('r', animated ? 0 : 8)
      .attr('fill', (d) => color(d.intensity))
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    if (animated) {
      markerCircles
        .transition()
        .duration(500)
        .delay((_, i) => 400 + i * 30)
        .ease(easings.elastic)
        .attr('r', 8);
    }

    // Labels
    if (showLabels) {
      markers
        .filter((d) => d.intensity > 0.3) // Only show labels for high-intensity venues
        .append('text')
        .attr('x', 12)
        .attr('y', 4)
        .attr('fill', 'rgba(255, 255, 255, 0.8)')
        .attr('font-size', '10px')
        .attr('pointer-events', 'none')
        .text((d) => {
          const name = d.venueName;
          return name.length > 15 ? name.substring(0, 12) + '…' : name;
        })
        .attr('opacity', 0)
        .transition()
        .duration(300)
        .delay(animated ? 800 : 0)
        .attr('opacity', 1);
    }

    // Interactivity
    markers
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', 12)
          .attr('filter', 'url(#venue-glow)');

        // Dim other markers
        markers
          .filter((_, j, nodes) => nodes[j] !== this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('opacity', 0.4);

        setHoveredVenue(d.venueId);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(200)
          .attr('r', 8)
          .attr('filter', 'none');

        markers.select('circle').transition().duration(200).attr('opacity', 1);

        setHoveredVenue(null);
      });

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on('zoom', (event) => {
        mapGroup.attr('transform', event.transform);
        setTransform(event.transform);
      });

    svg.call(zoom);

    // Reset zoom button
    g.append('g')
      .attr('class', 'reset-zoom')
      .attr('transform', `translate(${innerWidth - 30}, 10)`)
      .style('cursor', 'pointer')
      .on('click', () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      })
      .call((g) => {
        g.append('rect')
          .attr('width', 24)
          .attr('height', 24)
          .attr('rx', 4)
          .attr('fill', 'rgba(255, 255, 255, 0.1)')
          .attr('stroke', 'rgba(255, 255, 255, 0.2)');

        g.append('text')
          .attr('x', 12)
          .attr('y', 16)
          .attr('text-anchor', 'middle')
          .attr('fill', 'rgba(255, 255, 255, 0.7)')
          .attr('font-size', '12px')
          .text('⌖');
      });

    // Compass
    g.append('g')
      .attr('class', 'compass')
      .attr('transform', `translate(${innerWidth - 30}, ${innerHeight - 30})`)
      .call((g) => {
        g.append('circle')
          .attr('r', 15)
          .attr('fill', 'rgba(0, 0, 0, 0.5)')
          .attr('stroke', 'rgba(255, 255, 255, 0.2)');

        g.append('text')
          .attr('y', 4)
          .attr('text-anchor', 'middle')
          .attr('fill', 'rgba(255, 255, 255, 0.7)')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text('N');

        g.append('path')
          .attr('d', 'M 0 -8 L 3 -2 L 0 0 L -3 -2 Z')
          .attr('fill', '#ef4444');
      });
  }, [data, dimensions, margin, bounds, center, colorScale, maxIntensity, animated, showLabels, minZoom, maxZoom]);

  // Get hovered data
  const hoveredData = hoveredVenue ? data.find((d) => d.venueId === hoveredVenue) : null;

  return (
    <D3Container height={height} className={className} noPadding>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-white/80">Venue Activity Map</span>
        <div className="flex items-center gap-2 text-xs">
          <div
            className="w-20 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]}, ${colorScale[2]})`,
            }}
          />
          <span className="text-white/60">Activity</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full relative" style={{ height: height - 32 }}>
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {hoveredData && (
          <div className="absolute top-2 left-2 px-3 py-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20 max-w-xs">
            <div className="text-white font-medium text-sm">{hoveredData.venueName}</div>
            <div className="flex flex-col gap-1 mt-1 text-xs">
              <div>
                <span className="text-white/50">Workouts: </span>
                <span className="font-bold text-violet-400">{hoveredData.workouts.toLocaleString()}</span>
              </div>
              {hoveredData.users !== undefined && (
                <div>
                  <span className="text-white/50">Active Users: </span>
                  <span className="font-bold text-cyan-400">{hoveredData.users.toLocaleString()}</span>
                </div>
              )}
              <div>
                <span className="text-white/50">Activity Level: </span>
                <span className="font-bold text-amber-400">
                  {(hoveredData.intensity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Zoom level indicator */}
        {transform.k !== 1 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white/60 text-xs">
            {transform.k.toFixed(1)}x
          </div>
        )}
      </div>
    </D3Container>
  );
}

// Helper function to calculate appropriate scale
function calculateScale(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number
): number {
  const latDiff = bounds.maxLat - bounds.minLat;
  const lngDiff = bounds.maxLng - bounds.minLng;

  // Estimate scale based on bounds
  const scaleX = width / (lngDiff * 111000); // ~111km per degree longitude at equator
  const scaleY = height / (latDiff * 111000);

  // Use the smaller scale to fit everything
  const baseScale = Math.min(scaleX, scaleY) * 0.0001;

  // Clamp to reasonable range
  return Math.max(5000, Math.min(500000, baseScale * 1000000));
}

export default VenueHeatmap;
