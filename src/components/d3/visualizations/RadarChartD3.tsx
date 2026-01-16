/**
 * RadarChartD3 - Stunning Animated Radar/Spider Chart
 *
 * Features:
 * - Smooth animated transitions
 * - Gradient fills
 * - Pulsing glow effects
 * - Interactive hover states
 * - Multiple data series support
 * - Beautiful axis styling
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../core/D3Container';
import { easings } from '../core/animations';

// ============================================
// TYPES
// ============================================

export interface RadarChartAxis {
  key: string;
  label: string;
  max?: number;
  color?: string;
}

export interface RadarChartDataPoint {
  [key: string]: number;
}

export interface RadarChartSeries {
  name: string;
  data: RadarChartDataPoint;
  color: string;
  fillOpacity?: number;
}

export interface RadarChartD3Props {
  axes: RadarChartAxis[];
  series: RadarChartSeries[];
  onAxisClick?: (axis: RadarChartAxis) => void;
  onAxisHover?: (axis: RadarChartAxis | null) => void;
  height?: number;
  width?: number | string;
  className?: string;
  levels?: number;
  maxValue?: number;
  showLegend?: boolean;
  showValues?: boolean;
  animated?: boolean;
  interactive?: boolean;
  pulsing?: boolean;
}

// ============================================
// DEFAULT COLORS
// ============================================

const STAT_COLORS: Record<string, string> = {
  strength: '#FF3366',
  constitution: '#00CC66',
  dexterity: '#FFB800',
  power: '#FF6B00',
  endurance: '#0066FF',
  vitality: '#9333EA',
};

// ============================================
// COMPONENT
// ============================================

export function RadarChartD3({
  axes,
  series,
  onAxisClick,
  onAxisHover,
  height = 400,
  width: _width = '100%',
  className = '',
  levels = 5,
  maxValue = 100,
  showLegend = true,
  showValues = true,
  animated = true,
  interactive = true,
  pulsing = true,
}: RadarChartD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
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

  // Calculate actual max value from data
  const actualMaxValue = useMemo(() => {
    let max = maxValue;
    series.forEach((s) => {
      axes.forEach((axis) => {
        const val = s.data[axis.key] || 0;
        if (val > max) max = val;
      });
    });
    return Math.ceil(max / 10) * 10; // Round up to nearest 10
  }, [series, axes, maxValue]);

  // D3 Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const { width: svgWidth, height: svgHeight } = dimensions;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const radius = Math.min(svgWidth, svgHeight) * 0.35;

    // Clear previous
    svg.selectAll('*').remove();

    // Setup
    svg
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    // Defs
    const defs = svg.append('defs');

    // Create gradients for each series
    series.forEach((s, i) => {
      const gradient = defs
        .append('radialGradient')
        .attr('id', `radar-gradient-${i}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '70%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', s.color)
        .attr('stop-opacity', (s.fillOpacity || 0.4) * 1.5);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', s.color)
        .attr('stop-opacity', s.fillOpacity || 0.4);
    });

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'radar-glow')
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
    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Angle calculation
    const angleSlice = (2 * Math.PI) / axes.length;

    // Scale
    const rScale = d3.scaleLinear().domain([0, actualMaxValue]).range([0, radius]);

    // Draw level circles (web)
    const levelGroup = g.append('g').attr('class', 'levels');

    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;
      const levelValue = (actualMaxValue / levels) * level;

      // Polygon for level
      const levelPoints: string[] = [];
      axes.forEach((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = levelRadius * Math.cos(angle);
        const y = levelRadius * Math.sin(angle);
        levelPoints.push(`${x},${y}`);
      });

      levelGroup
        .append('polygon')
        .attr('points', levelPoints.join(' '))
        .attr('fill', 'none')
        .attr('stroke', `rgba(255, 255, 255, ${0.05 + (level / levels) * 0.1})`)
        .attr('stroke-width', 1);

      // Level label
      if (showValues) {
        levelGroup
          .append('text')
          .attr('x', 5)
          .attr('y', -levelRadius)
          .attr('fill', 'rgba(255, 255, 255, 0.4)')
          .attr('font-size', '10px')
          .text(Math.round(levelValue));
      }
    }

    // Draw axes
    const axisGroup = g.append('g').attr('class', 'axes');

    axes.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const axisColor = axis.color || STAT_COLORS[axis.key] || '#6366f1';

      // Axis line
      const axisLine = axisGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'rgba(255, 255, 255, 0.15)')
        .attr('stroke-width', 1);

      // Axis label
      const labelRadius = radius + 30;
      const labelX = labelRadius * Math.cos(angle);
      const labelY = labelRadius * Math.sin(angle);

      const label = axisGroup
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', axisColor)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('cursor', interactive ? 'pointer' : 'default')
        .text(axis.label);

      // Interactivity
      if (interactive) {
        const hitArea = axisGroup
          .append('circle')
          .attr('cx', labelX)
          .attr('cy', labelY)
          .attr('r', 20)
          .attr('fill', 'transparent')
          .attr('cursor', 'pointer');

        hitArea
          .on('mouseenter', () => {
            label
              .transition()
              .duration(200)
              .attr('font-size', '14px')
              .attr('fill', d3.color(axisColor)?.brighter(0.5)?.formatHex() || axisColor);

            axisLine
              .transition()
              .duration(200)
              .attr('stroke', axisColor)
              .attr('stroke-width', 2);

            setHoveredAxis(axis.key);
            onAxisHover?.(axis);
          })
          .on('mouseleave', () => {
            label
              .transition()
              .duration(200)
              .attr('font-size', '12px')
              .attr('fill', axisColor);

            axisLine
              .transition()
              .duration(200)
              .attr('stroke', 'rgba(255, 255, 255, 0.15)')
              .attr('stroke-width', 1);

            setHoveredAxis(null);
            onAxisHover?.(null);
          })
          .on('click', () => {
            onAxisClick?.(axis);
          });
      }
    });

    // Draw data polygons
    const dataGroup = g.append('g').attr('class', 'data');

    series.forEach((s, seriesIndex) => {
      // Calculate points
      const points: Array<{ x: number; y: number; value: number }> = axes.map((axis, i) => {
        const value = s.data[axis.key] || 0;
        const angle = angleSlice * i - Math.PI / 2;
        const r = rScale(value);
        return {
          x: r * Math.cos(angle),
          y: r * Math.sin(angle),
          value,
        };
      });

      // Path generator
      const lineGenerator = d3
        .lineRadial<{ value: number }>()
        .radius((d) => rScale(d.value))
        .angle((_, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

      const pathData = lineGenerator(points.map((p) => ({ value: p.value })));

      // Create area
      const area = dataGroup
        .append('path')
        .attr('d', pathData || '')
        .attr('fill', `url(#radar-gradient-${seriesIndex})`)
        .attr('stroke', s.color)
        .attr('stroke-width', 2)
        .style('filter', 'url(#radar-glow)');

      // Animate entrance
      if (animated) {
        area
          .attr('opacity', 0)
          .attr('transform', 'scale(0.5)')
          .transition()
          .duration(800)
          .delay(seriesIndex * 200)
          .ease(easings.elastic)
          .attr('opacity', 1)
          .attr('transform', 'scale(1)');
      }

      // Pulsing animation
      if (pulsing && animated) {
        const pulse = () => {
          area
            .transition()
            .duration(2000)
            .ease(easings.sin)
            .attr('stroke-width', 3)
            .style('filter', 'url(#radar-glow)')
            .transition()
            .duration(2000)
            .ease(easings.sin)
            .attr('stroke-width', 2)
            .on('end', pulse);
        };
        setTimeout(pulse, seriesIndex * 200 + 800);
      }

      // Data points
      points.forEach((point, pointIndex) => {
        const circle = dataGroup
          .append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', 5)
          .attr('fill', s.color)
          .attr('stroke', 'white')
          .attr('stroke-width', 2);

        if (animated) {
          circle
            .attr('r', 0)
            .transition()
            .duration(400)
            .delay(seriesIndex * 200 + pointIndex * 50)
            .ease(easings.back)
            .attr('r', 5);
        }

        // Value labels
        if (showValues && point.value > 0) {
          const valueLabel = dataGroup
            .append('text')
            .attr('x', point.x)
            .attr('y', point.y - 12)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)')
            .text(Math.round(point.value));

          if (animated) {
            valueLabel
              .attr('opacity', 0)
              .transition()
              .duration(300)
              .delay(seriesIndex * 200 + pointIndex * 50 + 200)
              .attr('opacity', 1);
          }
        }

        // Hover effect on points
        if (interactive) {
          circle
            .on('mouseenter', function () {
              d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 8);
            })
            .on('mouseleave', function () {
              d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 5);
            });
        }
      });
    });
  }, [
    axes,
    series,
    dimensions,
    levels,
    actualMaxValue,
    showValues,
    animated,
    interactive,
    pulsing,
    onAxisClick,
    onAxisHover,
  ]);

  return (
    <D3Container
      height={height}
      className={className}
      noPadding
    >
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ height }}
      >
        <svg ref={svgRef} />
      </div>

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 px-4 py-2 rounded-xl bg-black/50 backdrop-blur-sm">
          {series.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-sm text-white">{s.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hovered axis info */}
      {hoveredAxis && interactive && (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20">
          <div className="text-white font-semibold text-sm">
            {axes.find((a) => a.key === hoveredAxis)?.label}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {series.map((s, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span>{s.name}:</span>
                <span style={{ color: s.color }} className="font-bold">
                  {Math.round(s.data[hoveredAxis] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </D3Container>
  );
}

export default RadarChartD3;
