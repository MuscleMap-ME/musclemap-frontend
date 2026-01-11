/**
 * BarChartD3 - Animated Bar Chart Visualization
 *
 * Features:
 * - Horizontal and vertical layouts
 * - Smooth entrance animations
 * - Gradient fills
 * - Interactive hover effects
 * - Grouped and stacked modes
 * - Value labels
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../core/D3Container';
import { createLinearGradient, withOpacity } from '../core/gradients';
import { easings, transitions } from '../core/animations';

// ============================================
// TYPES
// ============================================

export interface BarChartDataItem {
  label: string;
  value: number;
  color?: string;
  category?: string;
}

export interface BarChartD3Props {
  data: BarChartDataItem[];
  onBarClick?: (item: BarChartDataItem) => void;
  onBarHover?: (item: BarChartDataItem | null) => void;
  height?: number;
  className?: string;
  layout?: 'horizontal' | 'vertical';
  showValues?: boolean;
  showGrid?: boolean;
  animated?: boolean;
  interactive?: boolean;
  barPadding?: number;
  cornerRadius?: number;
  colorScheme?: string[];
  gradientFill?: boolean;
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

export function BarChartD3({
  data,
  onBarClick,
  onBarHover,
  height = 300,
  className = '',
  layout = 'vertical',
  showValues = true,
  showGrid = true,
  animated = true,
  interactive = true,
  barPadding = 0.3,
  cornerRadius = 4,
  colorScheme = DEFAULT_COLORS,
  gradientFill = true,
}: BarChartD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  // Margins
  const margin = useMemo(() => ({
    top: 20,
    right: 20,
    bottom: layout === 'vertical' ? 60 : 20,
    left: layout === 'horizontal' ? 120 : 50,
  }), [layout]);

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

  // Color scale
  const colorScale = useMemo(() => {
    return d3.scaleOrdinal<string>().range(colorScheme);
  }, [colorScheme]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || data.length === 0) return;

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

    // Defs for gradients
    const defs = svg.append('defs');

    // Create gradient for each bar
    if (gradientFill) {
      data.forEach((item, i) => {
        const color = item.color || colorScale(item.category || String(i));
        const gradient = defs
          .append('linearGradient')
          .attr('id', `bar-gradient-${i}`)
          .attr('x1', layout === 'horizontal' ? '0%' : '50%')
          .attr('y1', layout === 'horizontal' ? '50%' : '100%')
          .attr('x2', layout === 'horizontal' ? '100%' : '50%')
          .attr('y2', layout === 'horizontal' ? '50%' : '0%');

        gradient
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', d3.color(color)?.darker(0.3)?.formatHex() || color);

        gradient
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', d3.color(color)?.brighter(0.3)?.formatHex() || color);
      });
    }

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'bar-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 3)
      .attr('result', 'blur');

    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main group
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Scales
    const maxValue = d3.max(data, (d) => d.value) || 0;

    let xScale: d3.ScaleBand<string> | d3.ScaleLinear<number, number>;
    let yScale: d3.ScaleBand<string> | d3.ScaleLinear<number, number>;

    if (layout === 'vertical') {
      xScale = d3.scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerWidth])
        .padding(barPadding);

      yScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .nice()
        .range([innerHeight, 0]);
    } else {
      xScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .nice()
        .range([0, innerWidth]);

      yScale = d3.scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerHeight])
        .padding(barPadding);
    }

    // Grid lines
    if (showGrid) {
      const gridGroup = g.append('g').attr('class', 'grid');

      if (layout === 'vertical') {
        const yTicks = (yScale as d3.ScaleLinear<number, number>).ticks(5);
        yTicks.forEach((tick) => {
          gridGroup
            .append('line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', (yScale as d3.ScaleLinear<number, number>)(tick))
            .attr('y2', (yScale as d3.ScaleLinear<number, number>)(tick))
            .attr('stroke', 'rgba(255, 255, 255, 0.05)')
            .attr('stroke-dasharray', '4 2');
        });
      } else {
        const xTicks = (xScale as d3.ScaleLinear<number, number>).ticks(5);
        xTicks.forEach((tick) => {
          gridGroup
            .append('line')
            .attr('x1', (xScale as d3.ScaleLinear<number, number>)(tick))
            .attr('x2', (xScale as d3.ScaleLinear<number, number>)(tick))
            .attr('y1', 0)
            .attr('y2', innerHeight)
            .attr('stroke', 'rgba(255, 255, 255, 0.05)')
            .attr('stroke-dasharray', '4 2');
        });
      }
    }

    // Axes
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`);

    const yAxisGroup = g.append('g').attr('class', 'y-axis');

    if (layout === 'vertical') {
      xAxisGroup
        .call(d3.axisBottom(xScale as d3.ScaleBand<string>))
        .selectAll('text')
        .attr('fill', 'rgba(255, 255, 255, 0.7)')
        .attr('font-size', '11px')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end');

      yAxisGroup
        .call(d3.axisLeft(yScale as d3.ScaleLinear<number, number>).ticks(5))
        .selectAll('text')
        .attr('fill', 'rgba(255, 255, 255, 0.7)')
        .attr('font-size', '11px');
    } else {
      xAxisGroup
        .call(d3.axisBottom(xScale as d3.ScaleLinear<number, number>).ticks(5))
        .selectAll('text')
        .attr('fill', 'rgba(255, 255, 255, 0.7)')
        .attr('font-size', '11px');

      yAxisGroup
        .call(d3.axisLeft(yScale as d3.ScaleBand<string>))
        .selectAll('text')
        .attr('fill', 'rgba(255, 255, 255, 0.7)')
        .attr('font-size', '11px');
    }

    // Style axes
    g.selectAll('.domain').attr('stroke', 'rgba(255, 255, 255, 0.2)');
    g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.1)');

    // Draw bars
    const barsGroup = g.append('g').attr('class', 'bars');

    const bars = barsGroup
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('rx', cornerRadius)
      .attr('ry', cornerRadius)
      .attr('fill', (d, i) => {
        if (gradientFill) return `url(#bar-gradient-${i})`;
        return d.color || colorScale(d.category || String(i));
      })
      .attr('cursor', interactive ? 'pointer' : 'default');

    if (layout === 'vertical') {
      bars
        .attr('x', (d) => (xScale as d3.ScaleBand<string>)(d.label) || 0)
        .attr('width', (xScale as d3.ScaleBand<string>).bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0);

      if (animated) {
        bars
          .transition()
          .duration(800)
          .delay((_, i) => i * 50)
          .ease(easings.elastic)
          .attr('y', (d) => (yScale as d3.ScaleLinear<number, number>)(d.value))
          .attr('height', (d) => innerHeight - (yScale as d3.ScaleLinear<number, number>)(d.value));
      } else {
        bars
          .attr('y', (d) => (yScale as d3.ScaleLinear<number, number>)(d.value))
          .attr('height', (d) => innerHeight - (yScale as d3.ScaleLinear<number, number>)(d.value));
      }
    } else {
      bars
        .attr('x', 0)
        .attr('y', (d) => (yScale as d3.ScaleBand<string>)(d.label) || 0)
        .attr('height', (yScale as d3.ScaleBand<string>).bandwidth())
        .attr('width', 0);

      if (animated) {
        bars
          .transition()
          .duration(800)
          .delay((_, i) => i * 50)
          .ease(easings.elastic)
          .attr('width', (d) => (xScale as d3.ScaleLinear<number, number>)(d.value));
      } else {
        bars.attr('width', (d) => (xScale as d3.ScaleLinear<number, number>)(d.value));
      }
    }

    // Value labels
    if (showValues) {
      const labels = barsGroup
        .selectAll('text')
        .data(data)
        .enter()
        .append('text')
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)')
        .text((d) => d.value.toLocaleString());

      if (layout === 'vertical') {
        labels
          .attr('x', (d) => ((xScale as d3.ScaleBand<string>)(d.label) || 0) + (xScale as d3.ScaleBand<string>).bandwidth() / 2)
          .attr('y', (d) => (yScale as d3.ScaleLinear<number, number>)(d.value) - 8)
          .attr('text-anchor', 'middle')
          .attr('opacity', 0);

        if (animated) {
          labels
            .transition()
            .duration(300)
            .delay((_, i) => 500 + i * 50)
            .attr('opacity', 1);
        } else {
          labels.attr('opacity', 1);
        }
      } else {
        labels
          .attr('x', (d) => (xScale as d3.ScaleLinear<number, number>)(d.value) + 8)
          .attr('y', (d) => ((yScale as d3.ScaleBand<string>)(d.label) || 0) + (yScale as d3.ScaleBand<string>).bandwidth() / 2)
          .attr('dominant-baseline', 'middle')
          .attr('opacity', 0);

        if (animated) {
          labels
            .transition()
            .duration(300)
            .delay((_, i) => 500 + i * 50)
            .attr('opacity', 1);
        } else {
          labels.attr('opacity', 1);
        }
      }
    }

    // Interactivity
    if (interactive) {
      bars
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('filter', 'url(#bar-glow)')
            .attr('opacity', 1);

          // Dim other bars
          bars.filter((_, j, nodes) => nodes[j] !== this)
            .transition()
            .duration(200)
            .attr('opacity', 0.5);

          setHoveredBar(d.label);
          onBarHover?.(d);
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(200)
            .style('filter', 'none');

          bars
            .transition()
            .duration(200)
            .attr('opacity', 1);

          setHoveredBar(null);
          onBarHover?.(null);
        })
        .on('click', (event, d) => {
          onBarClick?.(d);
        });
    }
  }, [
    data,
    dimensions,
    margin,
    layout,
    showValues,
    showGrid,
    animated,
    interactive,
    barPadding,
    cornerRadius,
    colorScale,
    gradientFill,
    onBarClick,
    onBarHover,
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
      {hoveredBar && interactive && (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/20">
          <div className="text-white font-semibold text-sm">{hoveredBar}</div>
          <div className="text-purple-400 font-bold">
            {data.find((d) => d.label === hoveredBar)?.value.toLocaleString()}
          </div>
        </div>
      )}
    </D3Container>
  );
}

export default BarChartD3;
