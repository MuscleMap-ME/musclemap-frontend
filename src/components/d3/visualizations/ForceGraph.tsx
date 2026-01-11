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

// Category-specific SVG icon paths for visual variety
const CATEGORY_ICONS: Record<string, string> = {
  core: 'M13 10V3L4 14h7v7l9-11h-7z', // lightning bolt - activity
  community: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', // users
  account: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', // user/profile
  health: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', // heart
  docs: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', // book
  issues: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', // alert/bug
  admin: 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z', // lock/shield
  default: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', // layers
};

// Unique node shapes for different route types within categories
const getNodeShape = (routeId: string): 'circle' | 'hexagon' | 'rounded-square' | 'diamond' => {
  // Map specific routes to different shapes
  const shapeMap: Record<string, 'circle' | 'hexagon' | 'rounded-square' | 'diamond'> = {
    dashboard: 'hexagon',
    workout: 'rounded-square',
    profile: 'hexagon',
    settings: 'diamond',
    community: 'hexagon',
    docs: 'rounded-square',
    landing: 'hexagon',
    issues: 'diamond',
    roadmap: 'rounded-square',
  };
  return shapeMap[routeId] || 'circle';
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

    // Helper function to create different node shapes
    const createNodeShape = (selection: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>) => {
      selection.each(function (d) {
        const g = d3.select(this);
        const size = d.size || nodeRadius;
        const color = getNodeColor(d);
        const brighterColor = d3.color(color)?.brighter(0.5)?.formatHex() || '#fff';
        const shape = getNodeShape(d.id);

        // Add glow background
        g.append('circle')
          .attr('r', size * 1.3)
          .attr('fill', color)
          .attr('opacity', 0.15)
          .attr('class', 'node-glow');

        // Create different shapes based on route
        switch (shape) {
          case 'hexagon': {
            const points = [];
            for (let i = 0; i < 6; i++) {
              const angle = (i * 60 - 30) * Math.PI / 180;
              points.push([size * Math.cos(angle), size * Math.sin(angle)]);
            }
            g.append('polygon')
              .attr('points', points.map(p => p.join(',')).join(' '))
              .attr('fill', color)
              .attr('stroke', brighterColor)
              .attr('stroke-width', 2)
              .attr('class', 'node-shape')
              .attr('opacity', 0);
            break;
          }
          case 'rounded-square': {
            g.append('rect')
              .attr('x', -size * 0.8)
              .attr('y', -size * 0.8)
              .attr('width', size * 1.6)
              .attr('height', size * 1.6)
              .attr('rx', size * 0.3)
              .attr('ry', size * 0.3)
              .attr('fill', color)
              .attr('stroke', brighterColor)
              .attr('stroke-width', 2)
              .attr('class', 'node-shape')
              .attr('opacity', 0);
            break;
          }
          case 'diamond': {
            const diamondSize = size * 1.1;
            g.append('polygon')
              .attr('points', `0,${-diamondSize} ${diamondSize},0 0,${diamondSize} ${-diamondSize},0`)
              .attr('fill', color)
              .attr('stroke', brighterColor)
              .attr('stroke-width', 2)
              .attr('class', 'node-shape')
              .attr('opacity', 0);
            break;
          }
          default: // circle
            g.append('circle')
              .attr('r', size)
              .attr('fill', color)
              .attr('stroke', brighterColor)
              .attr('stroke-width', 2)
              .attr('class', 'node-shape')
              .attr('opacity', 0);
        }

        // Add category icon in the center
        const iconPath = CATEGORY_ICONS[d.category || 'default'] || CATEGORY_ICONS.default;
        const iconSize = size * 0.8;
        g.append('g')
          .attr('class', 'node-icon')
          .attr('transform', `translate(${-iconSize/2}, ${-iconSize/2}) scale(${iconSize/24})`)
          .append('path')
          .attr('d', iconPath)
          .attr('fill', 'none')
          .attr('stroke', 'white')
          .attr('stroke-width', 2)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('opacity', 0);
      });
    };

    // Apply node shapes
    createNodeShape(nodeContainers);

    // Animate nodes in
    if (animated) {
      nodeContainers
        .select('.node-shape')
        .transition()
        .duration(500)
        .delay((_, i) => i * 20)
        .ease(easings.back)
        .attr('opacity', 1);

      nodeContainers
        .select('.node-icon path')
        .transition()
        .duration(400)
        .delay((_, i) => 150 + i * 20)
        .attr('opacity', 0.9);
    } else {
      nodeContainers.select('.node-shape').attr('opacity', 1);
      nodeContainers.select('.node-icon path').attr('opacity', 0.9);
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

    // Drag behavior with click detection for mobile
    if (interactive) {
      // Track drag state to distinguish tap from drag on touch devices
      let dragStartPos: { x: number; y: number } | null = null;
      let hasDragged = false;
      const DRAG_THRESHOLD = 5; // pixels - movement below this is considered a tap

      const drag = d3
        .drag<SVGGElement, SimulationNode>()
        .on('start', (event, d) => {
          dragStartPos = { x: event.x, y: event.y };
          hasDragged = false;
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          // Check if we've moved enough to count as a drag
          if (dragStartPos) {
            const dx = event.x - dragStartPos.x;
            const dy = event.y - dragStartPos.y;
            if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
              hasDragged = true;
            }
          }
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;

          // If this was a tap (not a drag), trigger the click handler
          if (!hasDragged && onNodeClick) {
            onNodeClick(d);
          }

          dragStartPos = null;
          hasDragged = false;
        });

      nodeContainers.call(drag);

      // Hover effects
      nodeContainers
        .on('mouseenter', function (event, d) {
          const colorName = getColorName(getNodeColor(d));
          const size = d.size || nodeRadius;

          // Scale up the whole node group
          d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', function() {
              const currentTransform = d3.select(this).attr('transform');
              const match = currentTransform?.match(/translate\(([^,]+),\s*([^)]+)\)/);
              if (match) {
                return `translate(${match[1]}, ${match[2]}) scale(1.15)`;
              }
              return currentTransform;
            });

          // Add glow filter to node shape
          d3.select(this)
            .select('.node-shape')
            .style('filter', `url(#node-glow-${colorName})`);

          // Brighten the glow background
          d3.select(this)
            .select('.node-glow')
            .transition()
            .duration(200)
            .attr('opacity', 0.3);

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
          // Reset scale
          d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', `translate(${d.x || 0}, ${d.y || 0})`);

          // Remove glow filter
          d3.select(this)
            .select('.node-shape')
            .style('filter', 'none');

          // Dim the glow background
          d3.select(this)
            .select('.node-glow')
            .transition()
            .duration(200)
            .attr('opacity', 0.15);

          edgePaths
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .attr('stroke-width', (e) => (e.weight || 1) * 1.5);

          setHoveredNode(null);
          onNodeHover?.(null);
        })
        .on('click', (event, d) => {
          // Only handle click on desktop (touch is handled via drag end)
          // Check if this is a touch event - if so, ignore (drag handles it)
          if (event.sourceEvent?.type?.startsWith('touch')) {
            return;
          }
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
