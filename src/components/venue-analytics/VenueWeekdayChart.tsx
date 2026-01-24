/**
 * VenueWeekdayChart - Day-of-Week Activity Patterns
 *
 * Displays a bar/radar chart showing:
 * - Average activity by day of week
 * - Highlight busiest days
 * - Interactive hover effects
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../d3/core/D3Container';
import { easings } from '../d3/core/animations';

// ============================================
// TYPES
// ============================================

export interface WeekdayDataPoint {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  dayName: string;
  averageUsers: number;
  averageWorkouts: number;
}

export interface VenueWeekdayChartProps {
  data: WeekdayDataPoint[];
  height?: number;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
  animated?: boolean;
  showLegend?: boolean;
  chartType?: 'bar' | 'radar';
}

// ============================================
// CONSTANTS
// ============================================

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// ============================================
// COMPONENT
// ============================================

export function VenueWeekdayChart({
  data,
  height = 250,
  className = '',
  primaryColor = '#8b5cf6',
  secondaryColor = '#06b6d4',
  animated = true,
  showLegend = true,
  chartType = 'bar',
}: VenueWeekdayChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 250 });

  const margin = useMemo(() => ({ top: 20, right: 20, bottom: 40, left: 50 }), []);

  // Normalize data to ensure all 7 days present
  const normalizedData = useMemo(() => {
    const dataMap = new Map(data.map((d) => [d.dayOfWeek, d]));
    return DAY_NAMES.map((name, i) => ({
      dayOfWeek: i,
      dayName: name,
      fullName: DAY_FULL_NAMES[i],
      averageUsers: dataMap.get(i)?.averageUsers || 0,
      averageWorkouts: dataMap.get(i)?.averageWorkouts || 0,
    }));
  }, [data]);

  // Find busiest day
  const busiestDay = useMemo(() => {
    return normalizedData.reduce(
      (max, d) => (d.averageWorkouts > max.averageWorkouts ? d : max),
      normalizedData[0]
    );
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

  // D3 Rendering - Bar Chart
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || chartType !== 'bar') return;

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

    // Gradients for each metric
    const usersGradient = defs
      .append('linearGradient')
      .attr('id', 'weekday-users-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    usersGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(primaryColor)?.darker(0.5)?.formatHex() || primaryColor);

    usersGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', primaryColor);

    const workoutsGradient = defs
      .append('linearGradient')
      .attr('id', 'weekday-workouts-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    workoutsGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(secondaryColor)?.darker(0.5)?.formatHex() || secondaryColor);

    workoutsGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', secondaryColor);

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'weekday-glow')
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
    const x0 = d3
      .scaleBand()
      .domain(normalizedData.map((d) => d.dayName))
      .range([0, innerWidth])
      .paddingInner(0.2)
      .paddingOuter(0.1);

    const x1 = d3
      .scaleBand()
      .domain(['users', 'workouts'])
      .range([0, x0.bandwidth()])
      .padding(0.1);

    const yMaxUsers = d3.max(normalizedData, (d) => d.averageUsers) || 0;
    const yMaxWorkouts = d3.max(normalizedData, (d) => d.averageWorkouts) || 0;
    const yMax = Math.max(yMaxUsers, yMaxWorkouts);

    const y = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([innerHeight, 0]);

    // Grid lines
    const gridGroup = g.append('g').attr('class', 'grid');
    const yTicks = y.ticks(5);
    yTicks.forEach((tick) => {
      gridGroup
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y(tick))
        .attr('y2', y(tick))
        .attr('stroke', 'rgba(255, 255, 255, 0.05)')
        .attr('stroke-dasharray', '4 2');
    });

    // X Axis
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`);

    xAxisGroup
      .call(d3.axisBottom(x0))
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d === busiestDay.dayName ? 'bold' : 'normal'));

    // Y Axis
    const yAxisGroup = g.append('g').attr('class', 'y-axis');
    yAxisGroup
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.7)')
      .attr('font-size', '10px');

    // Style axes
    g.selectAll('.domain').attr('stroke', 'rgba(255, 255, 255, 0.2)');
    g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.1)');

    // Draw grouped bars
    const dayGroups = g
      .selectAll('.day-group')
      .data(normalizedData)
      .enter()
      .append('g')
      .attr('class', 'day-group')
      .attr('transform', (d) => `translate(${x0(d.dayName)}, 0)`);

    // Users bars
    const usersBars = dayGroups
      .append('rect')
      .attr('class', 'users-bar')
      .attr('x', x1('users') || 0)
      .attr('width', x1.bandwidth())
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', 'url(#weekday-users-gradient)')
      .attr('cursor', 'pointer');

    // Workouts bars
    const workoutsBars = dayGroups
      .append('rect')
      .attr('class', 'workouts-bar')
      .attr('x', x1('workouts') || 0)
      .attr('width', x1.bandwidth())
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', 'url(#weekday-workouts-gradient)')
      .attr('cursor', 'pointer');

    // Animation
    if (animated) {
      usersBars
        .attr('y', innerHeight)
        .attr('height', 0)
        .transition()
        .duration(600)
        .delay((_, i) => i * 50)
        .ease(easings.elastic)
        .attr('y', (d) => y(d.averageUsers))
        .attr('height', (d) => innerHeight - y(d.averageUsers));

      workoutsBars
        .attr('y', innerHeight)
        .attr('height', 0)
        .transition()
        .duration(600)
        .delay((_, i) => i * 50 + 50)
        .ease(easings.elastic)
        .attr('y', (d) => y(d.averageWorkouts))
        .attr('height', (d) => innerHeight - y(d.averageWorkouts));
    } else {
      usersBars
        .attr('y', (d) => y(d.averageUsers))
        .attr('height', (d) => innerHeight - y(d.averageUsers));

      workoutsBars
        .attr('y', (d) => y(d.averageWorkouts))
        .attr('height', (d) => innerHeight - y(d.averageWorkouts));
    }

    // Busiest day indicator
    dayGroups
      .filter((d) => d.dayOfWeek === busiestDay.dayOfWeek)
      .append('text')
      .attr('x', x0.bandwidth() / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fbbf24')
      .attr('font-size', '12px')
      .text('★')
      .attr('opacity', 0)
      .transition()
      .duration(300)
      .delay(animated ? 600 : 0)
      .attr('opacity', 1);

    // Interactivity
    dayGroups
      .on('mouseenter', function (event, d) {
        d3.select(this).selectAll('rect').transition().duration(200).attr('filter', 'url(#weekday-glow)');

        // Dim other groups
        dayGroups
          .filter((_, j, nodes) => nodes[j] !== this)
          .selectAll('rect')
          .transition()
          .duration(200)
          .attr('opacity', 0.4);

        setHoveredDay(d.dayOfWeek);
      })
      .on('mouseleave', function () {
        d3.select(this).selectAll('rect').transition().duration(200).attr('filter', 'none');

        dayGroups.selectAll('rect').transition().duration(200).attr('opacity', 1);

        setHoveredDay(null);
      });
  }, [normalizedData, dimensions, margin, primaryColor, secondaryColor, busiestDay, animated, chartType]);

  // D3 Rendering - Radar Chart
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || chartType !== 'radar') return;

    const svg = d3.select(svgRef.current);
    const { width, height: h } = dimensions;
    const centerX = width / 2;
    const centerY = h / 2;
    const radius = Math.min(width, h) / 2 - 40;

    // Clear previous
    svg.selectAll('*').remove();

    // Setup
    svg
      .attr('width', width)
      .attr('height', h)
      .attr('viewBox', `0 0 ${width} ${h}`);

    // Defs
    const defs = svg.append('defs');

    // Gradient fills
    const usersGradient = defs
      .append('radialGradient')
      .attr('id', 'radar-users-fill')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    usersGradient.append('stop').attr('offset', '0%').attr('stop-color', primaryColor).attr('stop-opacity', 0.4);

    usersGradient.append('stop').attr('offset', '100%').attr('stop-color', primaryColor).attr('stop-opacity', 0.1);

    const workoutsGradient = defs
      .append('radialGradient')
      .attr('id', 'radar-workouts-fill')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    workoutsGradient.append('stop').attr('offset', '0%').attr('stop-color', secondaryColor).attr('stop-opacity', 0.4);

    workoutsGradient.append('stop').attr('offset', '100%').attr('stop-color', secondaryColor).attr('stop-opacity', 0.1);

    // Main group
    const g = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    // Scales
    const angleSlice = (Math.PI * 2) / 7;
    const yMaxUsers = d3.max(normalizedData, (d) => d.averageUsers) || 0;
    const yMaxWorkouts = d3.max(normalizedData, (d) => d.averageWorkouts) || 0;
    const yMax = Math.max(yMaxUsers, yMaxWorkouts);
    const rScale = d3.scaleLinear().domain([0, yMax]).range([0, radius]);

    // Draw concentric circles
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;
      g.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-dasharray', '2 2');
    }

    // Draw axis lines and labels
    normalizedData.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'rgba(255, 255, 255, 0.1)');

      const labelX = Math.cos(angle) * (radius + 20);
      const labelY = Math.sin(angle) * (radius + 20);

      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', d.dayOfWeek === busiestDay.dayOfWeek ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)')
        .attr('font-size', '11px')
        .attr('font-weight', d.dayOfWeek === busiestDay.dayOfWeek ? 'bold' : 'normal')
        .text(d.dayName);
    });

    // Create radar line generator
    const radarLine = d3
      .lineRadial<typeof normalizedData[0]>()
      .radius((d) => rScale(d.averageUsers))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    const radarLineWorkouts = d3
      .lineRadial<typeof normalizedData[0]>()
      .radius((d) => rScale(d.averageWorkouts))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    // Draw users area
    const usersPath = g
      .append('path')
      .datum(normalizedData)
      .attr('fill', 'url(#radar-users-fill)')
      .attr('stroke', primaryColor)
      .attr('stroke-width', 2)
      .attr('d', radarLine);

    // Draw workouts area
    const workoutsPath = g
      .append('path')
      .datum(normalizedData)
      .attr('fill', 'url(#radar-workouts-fill)')
      .attr('stroke', secondaryColor)
      .attr('stroke-width', 2)
      .attr('d', radarLineWorkouts);

    // Animation
    if (animated) {
      const totalLength = usersPath.node()?.getTotalLength() || 0;
      usersPath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .attr('fill-opacity', 0)
        .transition()
        .duration(1000)
        .ease(easings.easeInOut)
        .attr('stroke-dashoffset', 0)
        .attr('fill-opacity', 1);

      const totalLengthWorkouts = workoutsPath.node()?.getTotalLength() || 0;
      workoutsPath
        .attr('stroke-dasharray', `${totalLengthWorkouts} ${totalLengthWorkouts}`)
        .attr('stroke-dashoffset', totalLengthWorkouts)
        .attr('fill-opacity', 0)
        .transition()
        .duration(1000)
        .delay(200)
        .ease(easings.easeInOut)
        .attr('stroke-dashoffset', 0)
        .attr('fill-opacity', 1);
    }

    // Draw points
    normalizedData.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const usersX = Math.cos(angle) * rScale(d.averageUsers);
      const usersY = Math.sin(angle) * rScale(d.averageUsers);
      const workoutsX = Math.cos(angle) * rScale(d.averageWorkouts);
      const workoutsY = Math.sin(angle) * rScale(d.averageWorkouts);

      // Users point
      const usersPoint = g
        .append('circle')
        .attr('cx', usersX)
        .attr('cy', usersY)
        .attr('r', animated ? 0 : 5)
        .attr('fill', primaryColor)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer');

      // Workouts point
      const workoutsPoint = g
        .append('circle')
        .attr('cx', workoutsX)
        .attr('cy', workoutsY)
        .attr('r', animated ? 0 : 4)
        .attr('fill', secondaryColor)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer');

      if (animated) {
        usersPoint
          .transition()
          .duration(400)
          .delay(800 + i * 50)
          .ease(easings.elastic)
          .attr('r', 5);

        workoutsPoint
          .transition()
          .duration(400)
          .delay(1000 + i * 50)
          .ease(easings.elastic)
          .attr('r', 4);
      }

      // Hover interactivity
      [usersPoint, workoutsPoint].forEach((point) => {
        point
          .on('mouseenter', function () {
            d3.select(this).transition().duration(200).attr('r', 8);
            setHoveredDay(d.dayOfWeek);
          })
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(200)
              .attr('r', this === usersPoint.node() ? 5 : 4);
            setHoveredDay(null);
          });
      });
    });
  }, [normalizedData, dimensions, primaryColor, secondaryColor, busiestDay, animated, chartType]);

  // Get hovered data
  const hoveredData = hoveredDay !== null ? normalizedData.find((d) => d.dayOfWeek === hoveredDay) : null;

  return (
    <D3Container height={height} className={className} noPadding>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-white/80">Activity by Day</span>
        {showLegend && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: primaryColor }} />
              <span className="text-white/60">Avg Users</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: secondaryColor }} />
              <span className="text-white/60">Avg Workouts</span>
            </div>
          </div>
        )}
      </div>
      <div ref={containerRef} className="w-full relative" style={{ height: height - 32 }}>
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {hoveredData && (
          <div className="absolute top-2 right-2 px-3 py-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20">
            <div className="text-white/60 text-xs">{hoveredData.fullName}</div>
            <div className="flex gap-4 mt-1">
              <div>
                <span className="text-xs text-white/50">Users: </span>
                <span className="font-bold" style={{ color: primaryColor }}>
                  {hoveredData.averageUsers.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-xs text-white/50">Workouts: </span>
                <span className="font-bold" style={{ color: secondaryColor }}>
                  {hoveredData.averageWorkouts.toFixed(1)}
                </span>
              </div>
            </div>
            {hoveredData.dayOfWeek === busiestDay.dayOfWeek && (
              <div className="text-xs text-amber-400 mt-1">★ Busiest Day</div>
            )}
          </div>
        )}
      </div>
    </D3Container>
  );
}

export default VenueWeekdayChart;
