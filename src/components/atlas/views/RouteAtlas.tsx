/**
 * RouteAtlas - Interactive site navigation map
 *
 * Displays all MuscleMap routes as an interactive, explorable graph.
 * Uses React Flow with glass-styled custom nodes.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { RouteNode } from '../nodes/RouteNode';
import { AtlasControls } from '../core/AtlasControls';
import { AtlasLegend } from '../core/AtlasLegend';
import { AtlasSearch } from '../core/AtlasSearch';
import { useAtlasSearch } from '../hooks/useAtlasSearch';
import { useAtlasData } from '../hooks/useAtlasData';
import type { RouteAtlasManifest, RouteNodeData } from '../atlasTypes';

// Fallback static data if fetch fails
const STATIC_ROUTE_ATLAS: RouteAtlasManifest = {
  version: '1.0.0',
  generated: 'static',
  categories: [
    {
      id: 'core',
      label: 'Core',
      color: '#3b82f6',
      icon: 'activity',
      routes: [
        { id: 'dashboard', path: '/dashboard', label: 'Dashboard', description: 'Your personal training hub', protection: 'protected' },
        { id: 'workout', path: '/workout', label: 'Workout', description: 'Log training sessions', protection: 'protected' },
        { id: 'exercises', path: '/exercises', label: 'Exercises', description: '65+ exercises with muscle data', protection: 'protected' },
        { id: 'journey', path: '/journey', label: 'Journey', description: 'Personalized training path', protection: 'protected' },
        { id: 'progression', path: '/progression', label: 'Progression', description: 'Track strength gains', protection: 'protected' },
        { id: 'skills', path: '/skills', label: 'Skills', description: '7 skill trees with 45+ skills', protection: 'public' },
        { id: 'martial-arts', path: '/martial-arts', label: 'Martial Arts', description: '10 disciplines, 60+ techniques', protection: 'public' },
      ],
    },
    {
      id: 'community',
      label: 'Community',
      color: '#22c55e',
      icon: 'users',
      routes: [
        { id: 'community', path: '/community', label: 'Community Hub', description: 'Feed, map, and stats', protection: 'protected' },
        { id: 'crews', path: '/crews', label: 'Crews', description: 'Team up with others', protection: 'protected' },
        { id: 'rivals', path: '/rivals', label: 'Rivals', description: 'Friendly competition', protection: 'protected' },
        { id: 'competitions', path: '/competitions', label: 'Competitions', description: 'Compete for rewards', protection: 'protected' },
        { id: 'highfives', path: '/highfives', label: 'High Fives', description: 'Celebrate achievements', protection: 'protected' },
        { id: 'messages', path: '/messages', label: 'Messages', description: 'Connect with others', protection: 'protected' },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      color: '#f59e0b',
      icon: 'wallet',
      routes: [
        { id: 'profile', path: '/profile', label: 'Profile', description: 'Your public profile', protection: 'protected' },
        { id: 'settings', path: '/settings', label: 'Settings', description: 'App preferences', protection: 'protected' },
        { id: 'credits', path: '/credits', label: 'Credits', description: 'Credit balance and history', protection: 'protected' },
        { id: 'wallet', path: '/wallet', label: 'Wallet', description: 'Manage payments', protection: 'protected' },
        { id: 'stats', path: '/stats', label: 'Stats', description: 'Character stats', protection: 'protected' },
      ],
    },
    {
      id: 'health',
      label: 'Health',
      color: '#ec4899',
      icon: 'heart',
      routes: [
        { id: 'health', path: '/health', label: 'Health', description: 'Wearable integrations', protection: 'protected' },
        { id: 'goals', path: '/goals', label: 'Goals', description: 'Set and track goals', protection: 'protected' },
        { id: 'limitations', path: '/limitations', label: 'Limitations', description: 'Injury accommodations', protection: 'protected' },
        { id: 'pt-tests', path: '/pt-tests', label: 'PT Tests', description: 'Military fitness tests', protection: 'protected' },
      ],
    },
    {
      id: 'docs',
      label: 'Documentation',
      color: '#8b5cf6',
      icon: 'book-open',
      routes: [
        { id: 'landing', path: '/', label: 'Home', description: 'Welcome to MuscleMap', protection: 'public' },
        { id: 'features', path: '/features', label: 'Features', description: 'Feature overview', protection: 'public' },
        { id: 'technology', path: '/technology', label: 'Technology', description: 'Tech stack', protection: 'public' },
        { id: 'science', path: '/science', label: 'Science', description: 'The methodology', protection: 'public' },
        { id: 'design', path: '/design', label: 'Design', description: 'Design system', protection: 'public' },
        { id: 'docs', path: '/docs', label: 'Docs', description: 'Full documentation', protection: 'public' },
      ],
    },
    {
      id: 'issues',
      label: 'Issue Tracker',
      color: '#ef4444',
      icon: 'bug',
      routes: [
        { id: 'issues', path: '/issues', label: 'Issues', description: 'Report and track bugs', protection: 'public' },
        { id: 'roadmap', path: '/roadmap', label: 'Roadmap', description: 'Feature roadmap', protection: 'public' },
        { id: 'updates', path: '/updates', label: 'Dev Updates', description: 'Latest changes', protection: 'public' },
      ],
    },
  ],
};

// Layout constants
const CATEGORY_SPACING = 280;
const NODE_SPACING_X = 160;
const NODE_SPACING_Y = 70;
const MAX_NODES_PER_ROW = 3;
const CATEGORY_HEADER_HEIGHT = 40;

// Node types registration
const nodeTypes = {
  routeNode: RouteNode,
};

interface RouteAtlasProps {
  className?: string;
  height?: string | number;
  showSearch?: boolean;
  showLegend?: boolean;
  showMiniMap?: boolean;
  compact?: boolean;
}

function generateLayout(
  manifest: RouteAtlasManifest,
  currentPath: string,
  highlightedIds: string[],
  activeCategories: string[],
  onNavigate: (path: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let categoryX = 0;

  // Filter active categories
  const visibleCategories = manifest.categories.filter(
    (cat) => activeCategories.length === 0 || activeCategories.includes(cat.id)
  );

  visibleCategories.forEach((category) => {
    const visibleRoutes = category.routes;
    const _rows = Math.ceil(visibleRoutes.length / MAX_NODES_PER_ROW);
    const categoryWidth = Math.min(visibleRoutes.length, MAX_NODES_PER_ROW) * NODE_SPACING_X;

    // Category header node
    nodes.push({
      id: `category-${category.id}`,
      type: 'default',
      position: { x: categoryX + categoryWidth / 2 - 60, y: -CATEGORY_HEADER_HEIGHT },
      data: { label: category.label },
      style: {
        background: `${category.color}20`,
        border: `1px solid ${category.color}50`,
        borderRadius: '8px',
        padding: '6px 16px',
        fontSize: '13px',
        fontWeight: 600,
        color: category.color,
        pointerEvents: 'none' as const,
      },
      draggable: false,
      selectable: false,
      connectable: false,
    });

    // Route nodes
    visibleRoutes.forEach((route, routeIndex) => {
      const row = Math.floor(routeIndex / MAX_NODES_PER_ROW);
      const col = routeIndex % MAX_NODES_PER_ROW;

      const x = categoryX + col * NODE_SPACING_X;
      const y = row * NODE_SPACING_Y + 20;

      const isHighlighted = highlightedIds.includes(route.id);
      const isCurrentRoute = route.path === currentPath;

      nodes.push({
        id: route.id,
        type: 'routeNode',
        position: { x, y },
        data: {
          route,
          category,
          isHighlighted,
          isCurrentRoute,
          onNavigate,
        } as RouteNodeData,
      });
    });

    // Move to next category
    categoryX += categoryWidth + CATEGORY_SPACING;
  });

  return { nodes, edges };
}

function RouteAtlasInner({
  className = '',
  height = 480,
  showSearch = true,
  showLegend = true,
  compact = false,
}: RouteAtlasProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { fitView: _fitView } = useReactFlow();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const hasInitialized = useRef(false);

  // Try to load from API, fall back to static
  const { routeAtlas: fetchedAtlas, loading } = useAtlasData();
  const manifest = fetchedAtlas || STATIC_ROUTE_ATLAS;

  // Category filter state
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // Search state
  const { query, setQuery, highlightedIds, resultCount } = useAtlasSearch(manifest);

  // Navigation handler
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Handle React Flow initialization
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    // Delay fitView to ensure nodes are rendered
    setTimeout(() => {
      instance.fitView({ padding: 0.1, duration: 0 });
      hasInitialized.current = true;
    }, 50);
  }, []);

  // Generate layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => generateLayout(
      manifest,
      location.pathname,
      highlightedIds,
      activeCategories,
      handleNavigate
    ),
    [manifest, location.pathname, highlightedIds, activeCategories, handleNavigate]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when filters change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = generateLayout(
      manifest,
      location.pathname,
      highlightedIds,
      activeCategories,
      handleNavigate
    );
    setNodes(newNodes);
    setEdges(newEdges);

    // Only fitView after initial load (when filters change)
    if (hasInitialized.current && reactFlowInstance.current) {
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.1, duration: 300 });
      }, 50);
    }
  }, [manifest, location.pathname, highlightedIds, activeCategories, handleNavigate, setNodes, setEdges]);

  // Toggle category filter
  const handleToggleCategory = useCallback((categoryId: string) => {
    setActiveCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  if (loading) {
    return (
      <div
        className={`atlas-container flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading atlas...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`atlas-container relative rounded-2xl overflow-hidden ${className}`}
      style={{
        height,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="rgba(255, 255, 255, 0.05)"
          gap={20}
          size={1}
        />

        {/* Search and controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {showSearch && (
            <AtlasSearch
              value={query}
              onChange={setQuery}
              placeholder="Search routes..."
              resultCount={query ? resultCount : undefined}
              className="w-44 md:w-52"
            />
          )}
          <AtlasControls
            searchQuery=""
            onSearchChange={() => {}}
            showSearch={false}
          />
        </div>

        {/* Legend */}
        {showLegend && !compact && (
          <AtlasLegend
            categories={manifest.categories}
            activeCategories={activeCategories}
            onToggleCategory={handleToggleCategory}
          />
        )}
      </ReactFlow>

      {/* Search results indicator */}
      {query && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-300 z-10">
          {resultCount} result{resultCount !== 1 ? 's' : ''} for "{query}"
        </div>
      )}

      {/* Current location indicator */}
      {!compact && (
        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 z-10">
          <span className="text-pink-400 mr-1">●</span>
          You are here: <span className="text-white font-medium">{location.pathname}</span>
        </div>
      )}
    </div>
  );
}

export function RouteAtlas(props: RouteAtlasProps) {
  return (
    <ReactFlowProvider>
      <RouteAtlasInner {...props} />
    </ReactFlowProvider>
  );
}
