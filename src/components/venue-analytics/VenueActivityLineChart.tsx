/**
 * VenueActivityLineChart - Daily Activity Trend Visualization
 *
 * Displays line charts for:
 * - Daily workouts over time
 * - Daily users over time
 * - Volume trends
 * - Records set per day
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../d3/core/D3Container';
import { easings } from '../d3/core/animations';

// ============================================
// TYPES
// ============================================

export interface DailyDataPoint {
  date: string;
  value: number;
}

export interface VenueActivityLineChartProps {
  data: DailyDataPoint[];
  label: string;
  color?: string;
  height?: number;
  className?: string;
  showArea?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  animated?: boolean;
  formatValue?: (value: number) => string;
}

// ============================================
// COMPONENT
// ============================================

export function VenueActivityLineChart({
  data,
  label,
  color = '#8b5cf6',
  height = 200,
  className = '',
  showArea = true,
  showPoints = true,
  showGrid = true,
  animated = true,
  formatValue = (v) => v.toLocaleString(),
}: VenueActivityLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DailyDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });

  const margin = useMemo(() => ({ top: 20, right: 20, bottom: 40, left: 50 }), []);

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

  // Parse dates
  const parsedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      parsedDate: new Date(d.date),
    }));
  }, [data]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || parsedData.length === 0) return;

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

    // Line gradient
    const lineGradient = defs
      .append('linearGradient')
      .attr('id', 'line-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    lineGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(color)?.darker(0.5)?.formatHex() || color);

    lineGradient
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', color);

    lineGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d3.color(color)?.brighter(0.5)?.formatHex() || color);

    // Area gradient
    if (showArea) {
      const areaGradient = defs
        .append('linearGradient')
        .attr('id', 'area-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      areaGradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.3);

      areaGradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0);
    }

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'line-glow')
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
    const xExtent = d3.extent(parsedData, (d) => d.parsedDate) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    const yMax = d3.max(parsedData, (d) => d.value) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    if (showGrid) {
      const gridGroup = g.append('g').attr('class', 'grid');

      const yTicks = yScale.ticks(5);
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
    }

    // Axes
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`);

    xAxisGroup
      .call(
        d3.axisBottom(xScale)
          .ticks(Math.min(7, parsedData.length))
          .tickFormat((d) => d3.timeFormat('%b %d')(d as Date))
      )
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '10px');

    const yAxisGroup = g.append('g').attr('class', 'y-axis');

    yAxisGroup
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '10px');

    // Style axes
    g.selectAll('.domain').attr('stroke', 'rgba(255, 255, 255, 0.2)');
    g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.1)');

    // Line generator
    const lineGenerator = d3
      .line<typeof parsedData[0]>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Area generator
    const areaGenerator = d3
      .area<typeof parsedData[0]>()
      .x((d) => xScale(d.parsedDate))
      .y0(innerHeight)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw area
    if (showArea) {
      const area = g
        .append('path')
        .datum(parsedData)
        .attr('fill', 'url(#area-gradient)')
        .attr('d', areaGenerator);

      if (animated) {
        area
          .attr('opacity', 0)
          .transition()
          .duration(800)
          .ease(easings.easeInOut)
          .attr('opacity', 1);
      }
    }

    // Draw line
    const linePath = g
      .append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', 'url(#line-gradient)')
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#line-glow)')
      .attr('d', lineGenerator);

    // Animate line drawing
    if (animated) {
      const totalLength = linePath.node()?.getTotalLength() || 0;
      linePath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1500)
        .ease(easings.easeInOut)
        .attr('stroke-dashoffset', 0);
    }

    // Draw points
    if (showPoints) {
      const pointsGroup = g.append('g').attr('class', 'points');

      const points = pointsGroup
        .selectAll('circle')
        .data(parsedData)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.parsedDate))
        .attr('cy', (d) => yScale(d.value))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer');

      if (animated) {
        points
          .attr('r', 0)
          .transition()
          .duration(400)
          .delay((_, i) => 1000 + i * 30)
          .ease(easings.elastic)
          .attr('r', 4);
      }

      // Interactivity
      points
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 7);

          setHoveredPoint(d);
          setMousePosition({ x: xScale(d.parsedDate), y: yScale(d.value) });
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 4);

          setHoveredPoint(null);
        });
    }

    // Hover line and interactive overlay
    const hoverLine = g
      .append('line')
      .attr('class', 'hover-line')
      .attr('stroke', 'rgba(255, 255, 255, 0.3)')
      .attr('stroke-dasharray', '4 2')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('opacity', 0);

    // Overlay for hover detection
    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', function (event) {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);

        // Find closest point
        const bisect = d3.bisector<typeof parsedData[0], Date>((d) => d.parsedDate).left;
        const index = bisect(parsedData, x0, 1);
        const d0 = parsedData[index - 1];
        const d1 = parsedData[index];

        if (!d0 || !d1) return;

        const closest =
          x0.getTime() - d0.parsedDate.getTime() > d1.parsedDate.getTime() - x0.getTime()
            ? d1
            : d0;

        hoverLine
          .attr('x1', xScale(closest.parsedDate))
          .attr('x2', xScale(closest.parsedDate))
          .attr('opacity', 1);

        setHoveredPoint(closest);
        setMousePosition({ x: xScale(closest.parsedDate), y: yScale(closest.value) });
      })
      .on('mouseleave', function () {
        hoverLine.attr('opacity', 0);
        setHoveredPoint(null);
      });
  }, [
    parsedData,
    dimensions,
    margin,
    color,
    showArea,
    showPoints,
    showGrid,
    animated,
  ]);

  return (
    <D3Container height={height} className={className} noPadding>
      <div className="mb-2">
        <span className="text-sm font-medium text-white/80">{label}</span>
      </div>
      <div
        ref={containerRef}
        className="w-full relative"
        style={{ height: height - 24 }}
      >
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute px-3 py-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20 pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: mousePosition.x + margin.left,
              top: mousePosition.y + margin.top - 10,
            }}
          >
            <div className="text-white/60 text-xs">
              {new Date(hoveredPoint.date).toLocaleDateString()}
            </div>
            <div className="text-white font-bold" style={{ color }}>
              {formatValue(hoveredPoint.value)}
            </div>
          </div>
        )}
      </div>
    </D3Container>
  );
}

export default VenueActivityLineChart;
