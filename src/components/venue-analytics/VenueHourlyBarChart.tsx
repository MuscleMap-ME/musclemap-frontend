/**
 * VenueHourlyBarChart - Hourly Activity Patterns
 *
 * Displays a bar chart showing:
 * - Activity patterns by hour of day (0-23)
 * - Peak hours highlighted
 * - Interactive hover effects
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../d3/core/D3Container';
import { easings } from '../d3/core/animations';

// ============================================
// TYPES
// ============================================

export interface HourlyDataPoint {
  hour: number;
  value: number;
}

export interface VenueHourlyBarChartProps {
  data: number[] | HourlyDataPoint[];
  height?: number;
  className?: string;
  color?: string;
  peakColor?: string;
  animated?: boolean;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
}

// ============================================
// COMPONENT
// ============================================

export function VenueHourlyBarChart({
  data,
  height = 200,
  className = '',
  color = '#8b5cf6',
  peakColor = '#ec4899',
  animated = true,
  showLabels = true,
  formatValue = (v) => v.toFixed(1),
}: VenueHourlyBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });

  const margin = useMemo(() => ({ top: 20, right: 10, bottom: 30, left: 40 }), []);

  // Normalize data to HourlyDataPoint array
  const normalizedData = useMemo(() => {
    if (Array.isArray(data) && typeof data[0] === 'number') {
      return (data as number[]).map((value, hour) => ({ hour, value }));
    }
    return data as HourlyDataPoint[];
  }, [data]);

  // Find peak hours (top 3)
  const peakHours = useMemo(() => {
    const sorted = [...normalizedData].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 3).map((d) => d.hour);
  }, [normalizedData]);

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
    if (!svgRef.current || dimensions.width === 0 || normalizedData.length === 0) return;

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

    // Normal gradient
    const normalGradient = defs
      .append('linearGradient')
      .attr('id', 'hourly-normal-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    normalGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(color)?.darker(0.5)?.formatHex() || color);

    normalGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color);

    // Peak gradient
    const peakGradient = defs
      .append('linearGradient')
      .attr('id', 'hourly-peak-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    peakGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(peakColor)?.darker(0.5)?.formatHex() || peakColor);

    peakGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', peakColor);

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'hourly-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 2)
      .attr('result', 'blur');

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main group
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(normalizedData.map((d) => String(d.hour)))
      .range([0, innerWidth])
      .padding(0.2);

    const yMax = d3.max(normalizedData, (d) => d.value) || 0;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([innerHeight, 0]);

    // Grid lines
    const gridGroup = g.append('g').attr('class', 'grid');
    const yTicks = yScale.ticks(4);
    yTicks.forEach((tick) => {
      gridGroup
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(tick))
        .attr('y2', yScale(tick))
        .attr('stroke', 'rgba(255, 255, 255, 0.05)')
        .attr('stroke-dasharray', '4 2');
    });

    // X Axis
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`);

    xAxisGroup
      .call(
        d3.axisBottom(xScale).tickValues(
          normalizedData.filter((_, i) => i % 4 === 0).map((d) => String(d.hour))
        )
      )
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '10px')
      .text((d) => {
        const hour = parseInt(d as string);
        if (hour === 0) return '12am';
        if (hour === 12) return '12pm';
        return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
      });

    // Y Axis
    const yAxisGroup = g.append('g').attr('class', 'y-axis');
    yAxisGroup
      .call(d3.axisLeft(yScale).ticks(4))
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '10px');

    // Style axes
    g.selectAll('.domain').attr('stroke', 'rgba(255, 255, 255, 0.2)');
    g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.1)');

    // Draw bars
    const barsGroup = g.append('g').attr('class', 'bars');

    const bars = barsGroup
      .selectAll('rect')
      .data(normalizedData)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(String(d.hour)) || 0)
      .attr('width', xScale.bandwidth())
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', (d) =>
        peakHours.includes(d.hour) ? 'url(#hourly-peak-gradient)' : 'url(#hourly-normal-gradient)'
      )
      .attr('cursor', 'pointer');

    // Animation
    if (animated) {
      bars
        .attr('y', innerHeight)
        .attr('height', 0)
        .transition()
        .duration(600)
        .delay((_, i) => i * 20)
        .ease(easings.elastic)
        .attr('y', (d) => yScale(d.value))
        .attr('height', (d) => innerHeight - yScale(d.value));
    } else {
      bars
        .attr('y', (d) => yScale(d.value))
        .attr('height', (d) => innerHeight - yScale(d.value));
    }

    // Interactivity
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('filter', 'url(#hourly-glow)');

        // Dim other bars
        bars
          .filter((_, j, nodes) => nodes[j] !== this)
          .transition()
          .duration(200)
          .attr('opacity', 0.4);

        setHoveredHour(d.hour);
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(200).attr('filter', 'none');

        bars.transition().duration(200).attr('opacity', 1);

        setHoveredHour(null);
      });

    // Peak indicator labels
    if (showLabels) {
      barsGroup
        .selectAll('text.peak')
        .data(normalizedData.filter((d) => peakHours.includes(d.hour)))
        .enter()
        .append('text')
        .attr('class', 'peak')
        .attr('x', (d) => (xScale(String(d.hour)) || 0) + xScale.bandwidth() / 2)
        .attr('y', (d) => yScale(d.value) - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', peakColor)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('★')
        .attr('opacity', 0)
        .transition()
        .duration(300)
        .delay(animated ? 800 : 0)
        .attr('opacity', 1);
    }
  }, [
    normalizedData,
    dimensions,
    margin,
    color,
    peakColor,
    peakHours,
    animated,
    showLabels,
  ]);

  // Get hovered data
  const hoveredData = hoveredHour !== null
    ? normalizedData.find((d) => d.hour === hoveredHour)
    : null;

  return (
    <D3Container height={height} className={className} noPadding>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-white/80">Activity by Hour</span>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-white/60">Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: peakColor }} />
            <span className="text-white/60">Peak Hours</span>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full relative"
        style={{ height: height - 32 }}
      >
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {hoveredData && (
          <div className="absolute top-2 right-2 px-3 py-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20">
            <div className="text-white/60 text-xs">
              {hoveredData.hour === 0
                ? '12:00 AM'
                : hoveredData.hour === 12
                ? '12:00 PM'
                : hoveredData.hour > 12
                ? `${hoveredData.hour - 12}:00 PM`
                : `${hoveredData.hour}:00 AM`}
            </div>
            <div
              className="font-bold"
              style={{ color: peakHours.includes(hoveredData.hour) ? peakColor : color }}
            >
              {formatValue(hoveredData.value)} avg users
            </div>
            {peakHours.includes(hoveredData.hour) && (
              <div className="text-xs text-pink-400">★ Peak Hour</div>
            )}
          </div>
        )}
      </div>
    </D3Container>
  );
}

export default VenueHourlyBarChart;
