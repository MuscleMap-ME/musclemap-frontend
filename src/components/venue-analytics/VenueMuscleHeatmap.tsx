/**
 * VenueMuscleHeatmap - Muscle Activation Heatmap
 *
 * Displays a heatmap showing:
 * - Muscle groups worked at venue
 * - Intensity based on Training Units (TU)
 * - Interactive hover with details
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../d3/core/D3Container';
import { easings } from '../d3/core/animations';

// ============================================
// TYPES
// ============================================

export interface MuscleActivationData {
  muscleId: string;
  muscleName: string;
  totalTu: number;
  percentage: number;
}

export interface VenueMuscleHeatmapProps {
  data: MuscleActivationData[];
  height?: number;
  className?: string;
  colorScale?: [string, string, string]; // [low, mid, high]
  animated?: boolean;
  showLabels?: boolean;
  showPercentages?: boolean;
  layout?: 'grid' | 'treemap';
}

// ============================================
// CONSTANTS
// ============================================

// Muscle group layout for grid view (anatomical positioning)
const MUSCLE_LAYOUT: Record<string, { row: number; col: number; group: string }> = {
  // Upper body - front
  pectoralis_major: { row: 0, col: 1, group: 'chest' },
  pectoralis_minor: { row: 0, col: 2, group: 'chest' },
  deltoid_anterior: { row: 0, col: 0, group: 'shoulders' },
  deltoid_lateral: { row: 0, col: 3, group: 'shoulders' },
  biceps: { row: 1, col: 0, group: 'arms' },
  brachialis: { row: 1, col: 1, group: 'arms' },
  forearm_flexors: { row: 2, col: 0, group: 'arms' },
  forearm_extensors: { row: 2, col: 1, group: 'arms' },

  // Core
  rectus_abdominis: { row: 1, col: 2, group: 'core' },
  obliques: { row: 1, col: 3, group: 'core' },
  transverse_abdominis: { row: 2, col: 2, group: 'core' },

  // Upper body - back
  trapezius: { row: 0, col: 4, group: 'back' },
  rhomboids: { row: 0, col: 5, group: 'back' },
  latissimus_dorsi: { row: 1, col: 4, group: 'back' },
  erector_spinae: { row: 1, col: 5, group: 'back' },
  deltoid_posterior: { row: 0, col: 6, group: 'shoulders' },
  triceps: { row: 2, col: 3, group: 'arms' },

  // Lower body
  quadriceps: { row: 3, col: 0, group: 'legs' },
  hamstrings: { row: 3, col: 1, group: 'legs' },
  gluteus_maximus: { row: 3, col: 2, group: 'glutes' },
  gluteus_medius: { row: 3, col: 3, group: 'glutes' },
  hip_flexors: { row: 3, col: 4, group: 'hips' },
  adductors: { row: 4, col: 0, group: 'legs' },
  abductors: { row: 4, col: 1, group: 'legs' },
  calves: { row: 4, col: 2, group: 'legs' },
  tibialis_anterior: { row: 4, col: 3, group: 'legs' },
};

// Muscle group colors - prefixed with _ to indicate intentionally unused
// Could be used for color-coding in a future enhancement
const _MUSCLE_GROUPS = {
  chest: '#ef4444',
  shoulders: '#f97316',
  arms: '#eab308',
  core: '#22c55e',
  back: '#06b6d4',
  legs: '#8b5cf6',
  glutes: '#ec4899',
  hips: '#f472b6',
};

// ============================================
// COMPONENT
// ============================================

export function VenueMuscleHeatmap({
  data,
  height = 300,
  className = '',
  colorScale = ['#1e1b4b', '#7c3aed', '#fbbf24'],
  animated = true,
  showLabels = true,
  showPercentages = false,
  layout = 'treemap',
}: VenueMuscleHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  const margin = useMemo(() => ({ top: 10, right: 10, bottom: 10, left: 10 }), []);

  // Sort data by TU for display
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.totalTu - a.totalTu);
  }, [data]);

  // Get max TU for color scaling
  const maxTu = useMemo(() => {
    return d3.max(data, (d) => d.totalTu) || 1;
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

  // D3 Rendering - Treemap Layout
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || layout !== 'treemap') return;

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

    // Glow filter
    const glowFilter = defs
      .append('filter')
      .attr('id', 'muscle-glow')
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

    // Color scale
    const color = d3
      .scaleSequential()
      .domain([0, maxTu])
      .interpolator(d3.interpolateRgbBasis(colorScale));

    // Create hierarchy for treemap
    const hierarchyData = {
      name: 'root',
      children: sortedData.map((d) => ({
        name: d.muscleName,
        value: d.totalTu,
        id: d.muscleId,
        percentage: d.percentage,
      })),
    };

    const root = d3
      .hierarchy(hierarchyData)
      .sum((d: any) => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemap = d3
      .treemap<typeof hierarchyData>()
      .size([innerWidth, innerHeight])
      .paddingInner(2)
      .paddingOuter(4)
      .round(true);

    treemap(root);

    // Main group
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Draw cells
    const cells = g
      .selectAll('.cell')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('transform', (d: any) => `translate(${d.x0}, ${d.y0})`);

    // Background rectangles
    const rects = cells
      .append('rect')
      .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', (d: any) => color(d.value || 0))
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer');

    // Animation
    if (animated) {
      rects
        .attr('opacity', 0)
        .attr('transform', 'scale(0.8)')
        .transition()
        .duration(500)
        .delay((_, i) => i * 30)
        .ease(easings.easeOut)
        .attr('opacity', 1)
        .attr('transform', 'scale(1)');
    }

    // Labels
    if (showLabels) {
      cells
        .filter((d: any) => (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 30)
        .append('text')
        .attr('x', (d: any) => (d.x1 - d.x0) / 2)
        .attr('y', (d: any) => (d.y1 - d.y0) / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', (d: any) => {
          const cellWidth = d.x1 - d.x0;
          const cellHeight = d.y1 - d.y0;
          const size = Math.min(cellWidth / 8, cellHeight / 3, 14);
          return `${Math.max(8, size)}px`;
        })
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text((d: any) => {
          const name = d.data.name;
          const cellWidth = d.x1 - d.x0;
          // Truncate name if cell is small
          if (cellWidth < 80) {
            return name.length > 6 ? name.substring(0, 5) + '…' : name;
          }
          return name.length > 12 ? name.substring(0, 10) + '…' : name;
        })
        .attr('opacity', 0)
        .transition()
        .duration(300)
        .delay(animated ? 500 : 0)
        .attr('opacity', 1);

      // Percentage labels
      if (showPercentages) {
        cells
          .filter((d: any) => (d.x1 - d.x0) > 60 && (d.y1 - d.y0) > 45)
          .append('text')
          .attr('x', (d: any) => (d.x1 - d.x0) / 2)
          .attr('y', (d: any) => (d.y1 - d.y0) / 2 + 14)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'rgba(255, 255, 255, 0.7)')
          .attr('font-size', '10px')
          .attr('pointer-events', 'none')
          .text((d: any) => `${d.data.percentage.toFixed(1)}%`)
          .attr('opacity', 0)
          .transition()
          .duration(300)
          .delay(animated ? 600 : 0)
          .attr('opacity', 1);
      }
    }

    // Interactivity
    cells
      .on('mouseenter', function (event, d: any) {
        d3.select(this).select('rect').transition().duration(200).attr('filter', 'url(#muscle-glow)');

        // Dim other cells
        cells
          .filter((_, j, nodes) => nodes[j] !== this)
          .select('rect')
          .transition()
          .duration(200)
          .attr('opacity', 0.4);

        setHoveredMuscle(d.data.id);
      })
      .on('mouseleave', function () {
        d3.select(this).select('rect').transition().duration(200).attr('filter', 'none');

        cells.select('rect').transition().duration(200).attr('opacity', 1);

        setHoveredMuscle(null);
      });
  }, [sortedData, dimensions, margin, colorScale, maxTu, animated, showLabels, showPercentages, layout]);

  // D3 Rendering - Grid Layout
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || layout !== 'grid') return;

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

    // Calculate grid dimensions
    const cols = 7;
    const rows = 5;
    const cellWidth = innerWidth / cols;
    const cellHeight = innerHeight / rows;
    const cellPadding = 4;

    // Color scale
    const color = d3
      .scaleSequential()
      .domain([0, maxTu])
      .interpolator(d3.interpolateRgbBasis(colorScale));

    // Create data map
    const dataMap = new Map(data.map((d) => [d.muscleId, d]));

    // Main group
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Draw grid cells
    Object.entries(MUSCLE_LAYOUT).forEach(([muscleId, position], index) => {
      const muscleData = dataMap.get(muscleId);
      const x = position.col * cellWidth + cellPadding;
      const y = position.row * cellHeight + cellPadding;
      const w = cellWidth - cellPadding * 2;
      const cellH = cellHeight - cellPadding * 2;

      const cellGroup = g.append('g').attr('class', 'muscle-cell').attr('transform', `translate(${x}, ${y})`);

      // Background
      const rect = cellGroup
        .append('rect')
        .attr('width', w)
        .attr('height', cellH)
        .attr('rx', 4)
        .attr('fill', muscleData ? color(muscleData.totalTu) : 'rgba(255, 255, 255, 0.05)')
        .attr('stroke', `rgba(255, 255, 255, ${muscleData ? 0.2 : 0.05})`)
        .attr('cursor', muscleData ? 'pointer' : 'default');

      // Animation
      if (animated) {
        rect
          .attr('opacity', 0)
          .transition()
          .duration(400)
          .delay(index * 20)
          .ease(easings.easeOut)
          .attr('opacity', 1);
      }

      // Label
      if (showLabels) {
        const shortName = muscleId
          .split('_')
          .map((word) => word.charAt(0).toUpperCase())
          .join('');

        cellGroup
          .append('text')
          .attr('x', w / 2)
          .attr('y', cellH / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', muscleData ? 'white' : 'rgba(255, 255, 255, 0.3)')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('pointer-events', 'none')
          .text(shortName);
      }

      // Interactivity
      if (muscleData) {
        cellGroup
          .on('mouseenter', function () {
            d3.select(this)
              .select('rect')
              .transition()
              .duration(200)
              .attr('stroke-width', 2)
              .attr('stroke', 'white');

            setHoveredMuscle(muscleId);
          })
          .on('mouseleave', function () {
            d3.select(this)
              .select('rect')
              .transition()
              .duration(200)
              .attr('stroke-width', 1)
              .attr('stroke', 'rgba(255, 255, 255, 0.2)');

            setHoveredMuscle(null);
          });
      }
    });
  }, [data, dimensions, margin, colorScale, maxTu, animated, showLabels, layout]);

  // Get hovered data
  const hoveredData = hoveredMuscle ? data.find((d) => d.muscleId === hoveredMuscle) : null;

  return (
    <D3Container height={height} className={className} noPadding>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-white/80">Muscle Activation</span>
        <div className="flex items-center gap-2 text-xs">
          <div
            className="w-20 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]}, ${colorScale[2]})`,
            }}
          />
          <span className="text-white/60">TU</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full relative" style={{ height: height - 32 }}>
        <svg ref={svgRef} className="w-full h-full" />

        {/* Tooltip */}
        {hoveredData && (
          <div className="absolute top-2 right-2 px-3 py-2 rounded-lg bg-black/90 backdrop-blur-sm border border-white/20">
            <div className="text-white font-medium">{hoveredData.muscleName}</div>
            <div className="flex flex-col gap-1 mt-1 text-xs">
              <div>
                <span className="text-white/50">Total TU: </span>
                <span className="font-bold text-violet-400">{hoveredData.totalTu.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-white/50">Share: </span>
                <span className="font-bold text-cyan-400">{hoveredData.percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </D3Container>
  );
}

export default VenueMuscleHeatmap;
