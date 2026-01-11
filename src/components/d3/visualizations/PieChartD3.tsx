/**
 * PieChartD3 - Stunning Animated Pie/Donut Chart
 *
 * Features:
 * - Smooth entrance animations
 * - Exploding hover effects
 * - Gradient fills
 * - Interactive segments
 * - Center content support (donut)
 * - Beautiful glow effects
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../core/D3Container';
import { createGlowFilter, withOpacity } from '../core/gradients';
import { easings, transitions } from '../core/animations';

// ============================================
// TYPES
// ============================================

export interface PieChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartD3Props {
  data: PieChartDataItem[];
  onSegmentClick?: (item: PieChartDataItem) => void;
  onSegmentHover?: (item: PieChartDataItem | null) => void;
  height?: number;
  className?: string;
  innerRadius?: number; // 0 = pie, >0 = donut
  showLabels?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
  animated?: boolean;
  interactive?: boolean;
  colorScheme?: string[];
  centerContent?: React.ReactNode;
}

// ============================================
// DEFAULT COLORS
// ============================================

const DEFAULT_COLORS = [
  '#8b5cf6', '#6366f1', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#ef4444', '#84cc16',
];

// ============================================
// COMPONENT
// ============================================

export function PieChartD3({
  data,
  onSegmentClick,
  onSegmentHover,
  height = 400,
  className = '',
  innerRadius = 0,
  showLabels = true,
  showValues = false,
  showPercentages = true,
  animated = true,
  interactive = true,
  colorScheme = DEFAULT_COLORS,
  centerContent,
}: PieChartD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  // Update dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = Math.min(entry.contentRect.width, entry.contentRect.height);
        setDimensions({ width: size, height: size });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Color scale
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string>().range(colorScheme);
  }, [colorScheme]);

  // Calculate total
  const total = useMemo(() => d3.sum(data, (d) => d.value), [data]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const size = Math.min(dimensions.width, dimensions.height);
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size * 0.4;
    const actualInnerRadius = innerRadius * outerRadius;

    // Clear previous
    svg.selectAll('*').remove();

    // Setup
    svg
      .attr('width', size)
      .attr('height', size)
      .attr('viewBox', `0 0 ${size} ${size}`);

    // Defs
    const defs = svg.append('defs');

    // Create gradients for each segment
    data.forEach((item, i) => {
      const color = item.color || colorScale(String(i));
      const gradient = defs
        .append('linearGradient')
        .attr('id', `pie-gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(color)?.brighter(0.3)?.formatHex() || color);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d3.color(color)?.darker(0.3)?.formatHex() || color);
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
      .attr('stdDeviation', 5)
      .attr('result', 'blur');

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main group
    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Pie generator
    const pie = d3.pie<PieChartDataItem>()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.02);

    // Arc generator
    const arc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
      .innerRadius(actualInnerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(4);

    // Hover arc (slightly larger)
    const hoverArc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
      .innerRadius(actualInnerRadius)
      .outerRadius(outerRadius * 1.08)
      .cornerRadius(4);

    // Label arc
    const labelArc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
      .innerRadius(outerRadius * 0.7)
      .outerRadius(outerRadius * 0.7);

    // Outer label arc
    const outerLabelArc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
      .innerRadius(outerRadius * 1.15)
      .outerRadius(outerRadius * 1.15);

    // Create pie data
    const pieData = pie(data);

    // Draw segments
    const segments = g
      .selectAll<SVGPathElement, d3.PieArcDatum<PieChartDataItem>>('path')
      .data(pieData)
      .enter()
      .append('path')
      .attr('fill', (d, i) => `url(#pie-gradient-${i})`)
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1)
      .attr('cursor', interactive ? 'pointer' : 'default');

    // Animate entrance
    if (animated) {
      segments
        .attr('d', (d) => {
          const startArc = d3.arc<d3.PieArcDatum<PieChartDataItem>>()
            .innerRadius(actualInnerRadius)
            .outerRadius(actualInnerRadius)
            .cornerRadius(4);
          return startArc(d) || '';
        })
        .transition()
        .duration(800)
        .delay((_, i) => i * 100)
        .ease(easings.elastic)
        .attrTween('d', function (d) {
          const interpolate = d3.interpolate(
            { startAngle: d.startAngle, endAngle: d.startAngle },
            d
          );
          return (t) => arc(interpolate(t)) || '';
        });
    } else {
      segments.attr('d', arc);
    }

    // Inner labels (percentages)
    if (showPercentages || showValues) {
      const labels = g
        .selectAll<SVGTextElement, d3.PieArcDatum<PieChartDataItem>>('text.inner-label')
        .data(pieData)
        .enter()
        .append('text')
        .attr('class', 'inner-label')
        .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)')
        .text((d) => {
          const percentage = ((d.data.value / total) * 100).toFixed(0);
          if (showValues && showPercentages) {
            return `${d.data.value} (${percentage}%)`;
          } else if (showValues) {
            return d.data.value.toString();
          } else {
            return `${percentage}%`;
          }
        });

      if (animated) {
        labels
          .attr('opacity', 0)
          .transition()
          .duration(300)
          .delay((_, i) => 600 + i * 100)
          .attr('opacity', 1);
      }
    }

    // Outer labels
    if (showLabels) {
      pieData.forEach((d, i) => {
        const pos = outerLabelArc.centroid(d);
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const textAnchor = midAngle < Math.PI ? 'start' : 'end';

        // Line from segment to label
        const lineStart = arc.centroid(d);
        const lineMid = labelArc.centroid(d);

        const line = g
          .append('polyline')
          .attr('points', `${lineStart[0]},${lineStart[1]} ${lineMid[0]},${lineMid[1]} ${pos[0]},${pos[1]}`)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255, 255, 255, 0.3)')
          .attr('stroke-width', 1);

        const label = g
          .append('text')
          .attr('x', pos[0])
          .attr('y', pos[1])
          .attr('text-anchor', textAnchor)
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'rgba(255, 255, 255, 0.8)')
          .attr('font-size', '11px')
          .text(d.data.label);

        if (animated) {
          line
            .attr('opacity', 0)
            .transition()
            .duration(300)
            .delay(800 + i * 50)
            .attr('opacity', 1);

          label
            .attr('opacity', 0)
            .transition()
            .duration(300)
            .delay(800 + i * 50)
            .attr('opacity', 1);
        }
      });
    }

    // Interactivity
    if (interactive) {
      segments
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', hoverArc)
            .style('filter', 'url(#pie-glow)');

          // Dim other segments
          segments.filter((_, j, nodes) => nodes[j] !== this)
            .transition()
            .duration(200)
            .attr('opacity', 0.5);

          setHoveredSegment(d.data.label);
          onSegmentHover?.(d.data);
        })
        .on('mouseleave', function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('d', arc)
            .style('filter', 'none');

          segments
            .transition()
            .duration(200)
            .attr('opacity', 1);

          setHoveredSegment(null);
          onSegmentHover?.(null);
        })
        .on('click', (event, d) => {
          onSegmentClick?.(d.data);
        });
    }
  }, [
    data,
    dimensions,
    innerRadius,
    showLabels,
    showValues,
    showPercentages,
    animated,
    interactive,
    colorScale,
    total,
    onSegmentClick,
    onSegmentHover,
  ]);

  return (
    <D3Container
      height={height}
      className={className}
      noPadding
    >
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative"
        style={{ height }}
      >
        <svg ref={svgRef} />

        {/* Center content for donut */}
        {innerRadius > 0 && centerContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">{centerContent}</div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredSegment && interactive && (
        <div className="absolute top-4 right-4 px-4 py-3 rounded-xl bg-black/80 backdrop-blur-sm border border-white/20 shadow-xl">
          <div className="text-white font-semibold">{hoveredSegment}</div>
          <div className="text-sm mt-1">
            <span className="text-gray-400">Value: </span>
            <span className="text-purple-400 font-bold">
              {data.find((d) => d.label === hoveredSegment)?.value.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {((data.find((d) => d.label === hoveredSegment)?.value || 0) / total * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </D3Container>
  );
}

export default PieChartD3;
