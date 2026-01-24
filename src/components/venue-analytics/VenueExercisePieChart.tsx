/**
 * VenueExercisePieChart - Exercise Distribution Visualization
 *
 * Displays a donut chart showing:
 * - Exercise distribution at a venue
 * - Muscle group distribution
 * - Interactive segments with hover effects
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../d3/core/D3Container';
import { easings } from '../d3/core/animations';

// ============================================
// TYPES
// ============================================

export interface PieDataItem {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface VenueExercisePieChartProps {
  data: PieDataItem[];
  title?: string;
  height?: number;
  className?: string;
  innerRadius?: number;
  animated?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
  colorScheme?: string[];
  onSegmentClick?: (item: PieDataItem) => void;
}

// ============================================
// DEFAULT COLORS
// ============================================

const DEFAULT_COLORS = [
  '#8b5cf6', '#6366f1', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#ef4444', '#84cc16',
  '#a855f7', '#3b82f6', '#14b8a6', '#f97316',
];

// ============================================
// COMPONENT
// ============================================

export function VenueExercisePieChart({
  data,
  title,
  height = 300,
  className = '',
  innerRadius = 0.6,
  animated = true,
  showLegend = true,
  showValues = true,
  colorScheme = DEFAULT_COLORS,
  onSegmentClick,
}: VenueExercisePieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<PieDataItem | null>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });

  // Update dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = Math.min(entry.contentRect.width, entry.contentRect.height);
        setDimensions({
          width: entry.contentRect.width,
          height: size,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Color scale
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string>().domain(data.map((d) => d.id)).range(colorScheme);
  }, [data, colorScheme]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const size = Math.min(dimensions.width, dimensions.height);
    const radius = size / 2 - 20;
    const inner = radius * innerRadius;

    // Clear previous
    svg.selectAll('*').remove();

    // Setup
    svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    // Defs
    const defs = svg.append('defs');

    // Create gradients for each segment
    data.forEach((item, i) => {
      const baseColor = item.color || colorScale(item.id);
      const gradient = defs
        .append('radialGradient')
        .attr('id', `pie-gradient-${i}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(baseColor)?.brighter(0.3)?.formatHex() || baseColor);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d3.color(baseColor)?.darker(0.2)?.formatHex() || baseColor);
    });

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'pie-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 4)
      .attr('result', 'blur');

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${dimensions.width / 2}, ${dimensions.height / 2})`);

    // Pie generator
    const pie = d3
      .pie<PieDataItem>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.02);

    // Arc generator
    const arc = d3
      .arc<d3.PieArcDatum<PieDataItem>>()
      .innerRadius(inner)
      .outerRadius(radius)
      .cornerRadius(4);

    // Hover arc (larger)
    const hoverArc = d3
      .arc<d3.PieArcDatum<PieDataItem>>()
      .innerRadius(inner - 5)
      .outerRadius(radius + 10)
      .cornerRadius(4);

    // Label arc
    const labelArc = d3
      .arc<d3.PieArcDatum<PieDataItem>>()
      .innerRadius(radius * 0.75)
      .outerRadius(radius * 0.75);

    // Draw segments
    const arcs = pie(data);

    const segments = g
      .selectAll('path')
      .data(arcs)
      .enter()
      .append('path')
      .attr('fill', (_, i) => `url(#pie-gradient-${i})`)
      .attr('stroke', 'rgba(0, 0, 0, 0.3)')
      .attr('stroke-width', 1)
      .attr('cursor', onSegmentClick ? 'pointer' : 'default');

    // Animation
    if (animated) {
      segments
        .attr('d', (d) => {
          const startArc = { ...d, startAngle: d.startAngle, endAngle: d.startAngle };
          return arc(startArc);
        })
        .transition()
        .duration(1000)
        .delay((_, i) => i * 100)
        .ease(easings.easeInOut)
        .attrTween('d', function (d) {
          const interpolate = d3.interpolate({ ...d, endAngle: d.startAngle }, d);
          return (t) => arc(interpolate(t)) || '';
        });
    } else {
      segments.attr('d', arc);
    }

    // Interactivity
    segments
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc(d) || '')
          .attr('filter', 'url(#pie-glow)');

        // Dim other segments
        segments
          .filter((_, j, nodes) => nodes[j] !== this)
          .transition()
          .duration(200)
          .attr('opacity', 0.5);

        setHoveredSegment(d.data);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', (d) => arc(d) || '')
          .attr('filter', 'none');

        segments.transition().duration(200).attr('opacity', 1);

        setHoveredSegment(null);
      })
      .on('click', (event, d) => {
        onSegmentClick?.(d.data);
      });

    // Value labels inside segments (for larger segments)
    if (showValues) {
      g.selectAll('text.value')
        .data(arcs.filter((d) => d.data.percentage > 5))
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)')
        .attr('opacity', 0)
        .text((d) => `${d.data.percentage.toFixed(0)}%`)
        .transition()
        .duration(500)
        .delay(animated ? 800 : 0)
        .attr('opacity', 1);
    }

    // Center text (total or hovered info)
    const centerGroup = g.append('g').attr('class', 'center-text');

    centerGroup
      .append('text')
      .attr('class', 'center-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', -10)
      .attr('fill', 'rgba(255, 255, 255, 0.6)')
      .attr('font-size', '12px')
      .text(title || 'Total');

    const totalValue = data.reduce((sum, d) => sum + d.value, 0);
    centerGroup
      .append('text')
      .attr('class', 'center-value')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 12)
      .attr('fill', 'white')
      .attr('font-size', '20px')
      .attr('font-weight', 'bold')
      .text(totalValue.toLocaleString());
  }, [
    data,
    dimensions,
    colorScale,
    innerRadius,
    animated,
    showValues,
    title,
    onSegmentClick,
  ]);

  return (
    <D3Container height={height} className={className} noPadding>
      <div className="flex flex-col md:flex-row gap-4">
        <div
          ref={containerRef}
          className="flex-1"
          style={{ height: showLegend ? height - 40 : height }}
        >
          <svg ref={svgRef} className="w-full h-full" />
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="md:w-40 space-y-1 max-h-60 overflow-y-auto">
            {data.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all ${
                  hoveredSegment?.id === item.id
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
                onMouseEnter={() => setHoveredSegment(item)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color || colorScale(item.id) }}
                />
                <span className="text-xs text-white/80 truncate flex-1">
                  {item.name}
                </span>
                <span className="text-xs text-white/60">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
            {data.length > 10 && (
              <div className="text-xs text-white/40 px-2">
                +{data.length - 10} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredSegment && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20 pointer-events-none">
          <div className="text-white font-semibold text-sm">{hoveredSegment.name}</div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-white/60 text-sm">
              {hoveredSegment.value.toLocaleString()} sets
            </span>
            <span
              className="font-bold"
              style={{ color: hoveredSegment.color || colorScale(hoveredSegment.id) }}
            >
              {hoveredSegment.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </D3Container>
  );
}

export default VenueExercisePieChart;
