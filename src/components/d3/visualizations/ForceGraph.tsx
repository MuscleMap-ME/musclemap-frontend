/**
 * ForceGraph - D3 Force-Directed Graph Visualization
 *
 * A cutting-edge force-directed graph featuring:
 * - Physics-based node positioning
 * - Smooth zoom and pan
 * - Node clustering by category
 * - Animated edges with gradients
 * - Interactive drag and click
 * - Beautiful glow effects
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { D3Container } from '../core/D3Container';
import { createGlowFilter, createLinearGradient, withOpacity } from '../core/gradients';
import { easings, transitions } from '../core/animations';

// ============================================
// TYPES
// ============================================

export interface ForceGraphNode {
  id: string;
  label: string;
  category?: string;
  description?: string;
  size?: number;
  color?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface ForceGraphEdge {
  source: string;
  target: string;
  weight?: number;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface ForceGraphProps {
  nodes: ForceGraphNode[];
  edges: ForceGraphEdge[];
  onNodeClick?: (node: ForceGraphNode) => void;
  onNodeHover?: (node: ForceGraphNode | null) => void;
  height?: number;
  width?: number | string;
  className?: string;
  nodeRadius?: number;
  linkDistance?: number;
  chargeStrength?: number;
  centerStrength?: number;
  clusterStrength?: number;
  showLabels?: boolean;
  animated?: boolean;
  interactive?: boolean;
  categoryColors?: Record<string, string>;
}

interface SimulationNode extends ForceGraphNode, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationEdge extends d3.SimulationLinkDatum<SimulationNode> {
  source: SimulationNode | string;
  target: SimulationNode | string;
  weight?: number;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

// ============================================
// DEFAULT COLORS
// ============================================

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  core: '#3b82f6',
  community: '#22c55e',
  account: '#f59e0b',
  health: '#ec4899',
  docs: '#8b5cf6',
  issues: '#ef4444',
  admin: '#dc2626',
  default: '#64748b',
};

// ============================================
// COMPONENT
// ============================================

export function ForceGraph({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  height = 600,
  width = '100%',
  className = '',
  nodeRadius = 20,
  linkDistance = 100,
  chargeStrength = -300,
  centerStrength = 0.05,
  clusterStrength = 0.5,
  showLabels = true,
  animated = true,
  interactive = true,
  categoryColors = DEFAULT_CATEGORY_COLORS,
}: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationEdge> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Get color for node
  const getNodeColor = useCallback(
    (node: ForceGraphNode) => {
      if (node.color) return node.color;
      return categoryColors[node.category || 'default'] || categoryColors.default;
    },
    [categoryColors]
  );

  // Get unique categories for clustering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    nodes.forEach((n) => {
      if (n.category) cats.add(n.category);
    });
    return Array.from(cats);
  }, [nodes]);

  // Calculate cluster centers
  const clusterCenters = useMemo(() => {
    const centers: Record<string, { x: number; y: number }> = {};
    const angleStep = (2 * Math.PI) / categories.length;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3;

    categories.forEach((cat, i) => {
      const angle = angleStep * i - Math.PI / 2;
      centers[cat] = {
        x: dimensions.width / 2 + radius * Math.cos(angle),
        y: dimensions.height / 2 + radius * Math.sin(angle),
      };
    });

    return centers;
  }, [categories, dimensions]);

  // Update dimensions on resize
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

  // Main D3 rendering effect
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const { width: svgWidth, height: svgHeight } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Set up SVG
    svg
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

    // Create defs
    const defs = svg.append('defs');

    // Create glow filters
    ['blue', 'green', 'amber', 'pink', 'purple', 'red'].forEach((color, i) => {
      const colors: Record<string, string> = {
        blue: '#3b82f6',
        green: '#22c55e',
        amber: '#f59e0b',
        pink: '#ec4899',
        purple: '#8b5cf6',
        red: '#ef4444',
      };

      const filter = defs
        .append('filter')
        .attr('id', `node-glow-${color}`)
        .attr('x', '-100%')
        .attr('y', '-100%')
        .attr('width', '300%')
        .attr('height', '300%');

      filter
        .append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', 8)
        .attr('result', 'blur');

      filter
        .append('feFlood')
        .attr('flood-color', colors[color])
        .attr('flood-opacity', '0.5')
        .attr('result', 'color');

      filter
        .append('feComposite')
        .attr('in', 'color')
        .attr('in2', 'blur')
        .attr('operator', 'in')
        .attr('result', 'glow');

      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'glow');
      merge.append('feMergeNode').attr('in', 'glow');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Create gradient for edges
    createLinearGradient(svg, {
      id: 'edge-gradient',
      stops: [
        { offset: '0%', color: '#6366f1', opacity: 0.6 },
        { offset: '100%', color: '#8b5cf6', opacity: 0.3 },
      ],
    });

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Main container for zoom/pan
    const container = svg.append('g').attr('class', 'graph-container');

    // Create simulation nodes
    const simNodes: SimulationNode[] = nodes.map((n) => ({ ...n }));
    const simEdges: SimulationEdge[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
      label: e.label,
      style: e.style,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(simNodes)
      .force(
        'link',
        d3.forceLink<SimulationNode, SimulationEdge>(simEdges)
          .id((d) => d.id)
          .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(svgWidth / 2, svgHeight / 2).strength(centerStrength))
      .force('collision', d3.forceCollide<SimulationNode>().radius((d) => (d.size || nodeRadius) + 10))
      .force('cluster', (alpha) => {
        simNodes.forEach((node) => {
          if (node.category && clusterCenters[node.category]) {
            const center = clusterCenters[node.category];
            const dx = center.x - (node.x || 0);
            const dy = center.y - (node.y || 0);
            node.vx = (node.vx || 0) + dx * alpha * clusterStrength;
            node.vy = (node.vy || 0) + dy * alpha * clusterStrength;
          }
        });
      });

    simulationRef.current = simulation;

    // Draw edges
    const edgeGroup = container.append('g').attr('class', 'edges');

    const edgePaths = edgeGroup
      .selectAll<SVGLineElement, SimulationEdge>('line')
      .data(simEdges)
      .enter()
      .append('line')
      .attr('stroke', 'url(#edge-gradient)')
      .attr('stroke-width', (d) => (d.weight || 1) * 1.5)
      .attr('stroke-dasharray', (d) => {
        switch (d.style) {
          case 'dashed':
            return '8 4';
          case 'dotted':
            return '2 4';
          default:
            return 'none';
        }
      })
      .attr('opacity', 0);

    // Animate edges in
    if (animated) {
      edgePaths
        .transition()
        .duration(500)
        .delay(300)
        .attr('opacity', 1);
    } else {
      edgePaths.attr('opacity', 1);
    }

    // Draw nodes
    const nodeGroup = container.append('g').attr('class', 'nodes');

    const nodeContainers = nodeGroup
      .selectAll<SVGGElement, SimulationNode>('g.node')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', interactive ? 'pointer' : 'default');

    // Node circles
    const circles = nodeContainers
      .append('circle')
      .attr('r', (d) => d.size || nodeRadius)
      .attr('fill', (d) => getNodeColor(d))
      .attr('stroke', (d) => d3.color(getNodeColor(d))?.brighter(0.5)?.formatHex() || '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', 0);

    // Animate nodes in
    if (animated) {
      circles
        .transition()
        .duration(500)
        .delay((_, i) => i * 20)
        .ease(easings.back)
        .attr('opacity', 1)
        .attr('r', (d) => d.size || nodeRadius);
    } else {
      circles.attr('opacity', 1);
    }

    // Node labels
    if (showLabels) {
      const labels = nodeContainers
        .append('text')
        .text((d) => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => (d.size || nodeRadius) + 15)
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('opacity', 0)
        .attr('pointer-events', 'none')
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.5)');

      if (animated) {
        labels
          .transition()
          .duration(500)
          .delay((_, i) => 200 + i * 20)
          .attr('opacity', 0.9);
      } else {
        labels.attr('opacity', 0.9);
      }
    }

    // Drag behavior
    if (interactive) {
      const drag = d3
        .drag<SVGGElement, SimulationNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      nodeContainers.call(drag);

      // Hover effects
      nodeContainers
        .on('mouseenter', function (event, d) {
          const colorName = getColorName(getNodeColor(d));

          d3.select(this)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', (d.size || nodeRadius) * 1.2)
            .style('filter', `url(#node-glow-${colorName})`);

          // Highlight connected edges
          edgePaths
            .transition()
            .duration(200)
            .attr('opacity', (e) => {
              const sourceId = typeof e.source === 'object' ? e.source.id : e.source;
              const targetId = typeof e.target === 'object' ? e.target.id : e.target;
              return sourceId === d.id || targetId === d.id ? 1 : 0.2;
            })
            .attr('stroke-width', (e) => {
              const sourceId = typeof e.source === 'object' ? e.source.id : e.source;
              const targetId = typeof e.target === 'object' ? e.target.id : e.target;
              return sourceId === d.id || targetId === d.id ? 3 : 1;
            });

          setHoveredNode(d.id);
          onNodeHover?.(d);
        })
        .on('mouseleave', function (event, d) {
          d3.select(this)
            .select('circle')
            .transition()
            .duration(200)
            .attr('r', d.size || nodeRadius)
            .style('filter', 'none');

          edgePaths
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .attr('stroke-width', (e) => (e.weight || 1) * 1.5);

          setHoveredNode(null);
          onNodeHover?.(null);
        })
        .on('click', (event, d) => {
          event.stopPropagation();
          onNodeClick?.(d);
        });
    }

    // Simulation tick
    simulation.on('tick', () => {
      edgePaths
        .attr('x1', (d) => (d.source as SimulationNode).x || 0)
        .attr('y1', (d) => (d.source as SimulationNode).y || 0)
        .attr('x2', (d) => (d.target as SimulationNode).x || 0)
        .attr('y2', (d) => (d.target as SimulationNode).y || 0);

      nodeContainers.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    // Initial position
    simulation.alpha(1).restart();

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [
    nodes,
    edges,
    dimensions,
    nodeRadius,
    linkDistance,
    chargeStrength,
    centerStrength,
    clusterStrength,
    clusterCenters,
    showLabels,
    animated,
    interactive,
    getNodeColor,
    onNodeClick,
    onNodeHover,
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
        <svg
          ref={svgRef}
          className="w-full h-full"
        />
      </div>

      {/* Tooltip */}
      {hoveredNode && interactive && (
        <div
          className="absolute top-4 right-4 px-4 py-3 rounded-xl bg-black/80 backdrop-blur-sm border border-white/20 shadow-xl max-w-xs"
        >
          <div className="text-white font-semibold">
            {nodes.find((n) => n.id === hoveredNode)?.label}
          </div>
          {nodes.find((n) => n.id === hoveredNode)?.description && (
            <p className="text-sm text-gray-400 mt-1">
              {nodes.find((n) => n.id === hoveredNode)?.description}
            </p>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Click to navigate
          </div>
        </div>
      )}
    </D3Container>
  );
}

// Helper to map color to filter name
function getColorName(color: string): string {
  const colorMap: Record<string, string> = {
    '#3b82f6': 'blue',
    '#22c55e': 'green',
    '#f59e0b': 'amber',
    '#ec4899': 'pink',
    '#8b5cf6': 'purple',
    '#ef4444': 'red',
  };
  return colorMap[color] || 'blue';
}

export default ForceGraph;
