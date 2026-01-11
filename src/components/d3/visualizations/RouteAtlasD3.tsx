/**
 * RouteAtlasD3 - D3-based Interactive Site Navigation Map
 *
 * A stunning force-directed graph for navigating MuscleMap routes.
 * Features:
 * - Force-directed layout with category clustering
 * - Animated node entrance
 * - Glowing active routes
 * - Smooth zoom and pan
 * - Search highlighting
 * - Category filtering
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ForceGraph, ForceGraphNode, ForceGraphEdge } from './ForceGraph';
import { D3Container } from '../core/D3Container';
import { useUser } from '../../../contexts/UserContext';

// ============================================
// TYPES
// ============================================

export interface RouteDefinition {
  id: string;
  path: string;
  label: string;
  description: string;
  protection: 'public' | 'protected' | 'admin';
}

export interface RouteCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
  routes: RouteDefinition[];
}

export interface RouteAtlasManifest {
  version: string;
  generated: string;
  categories: RouteCategory[];
}

export interface RouteAtlasD3Props {
  manifest?: RouteAtlasManifest;
  height?: number;
  className?: string;
  showSearch?: boolean;
  showLegend?: boolean;
  onRouteSelect?: (route: RouteDefinition) => void;
}

// ============================================
// STATIC DATA
// ============================================

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

// ============================================
// COMPONENT
// ============================================

export function RouteAtlasD3({
  manifest = STATIC_ROUTE_ATLAS,
  height = 600,
  className = '',
  showSearch = true,
  showLegend = true,
  onRouteSelect,
}: RouteAtlasD3Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  // Check if user is logged in
  const isLoggedIn = !!user;

  // Convert manifest to ForceGraph data
  const { nodes, edges, categoryColors } = useMemo(() => {
    const nodes: ForceGraphNode[] = [];
    const edges: ForceGraphEdge[] = [];
    const colors: Record<string, string> = {};

    // Filter by active categories
    const visibleCategories = activeCategories.length > 0
      ? manifest.categories.filter((c) => activeCategories.includes(c.id))
      : manifest.categories;

    // Add category center nodes (invisible, for clustering)
    visibleCategories.forEach((category) => {
      colors[category.id] = category.color;

      // Add route nodes
      category.routes.forEach((route) => {
        // Skip protected routes for non-logged-in users
        if (!isLoggedIn && route.protection === 'protected') {
          return;
        }

        // Filter by search
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matches =
            route.label.toLowerCase().includes(query) ||
            route.description.toLowerCase().includes(query) ||
            route.path.toLowerCase().includes(query);
          if (!matches) return;
        }

        const isCurrentRoute = route.path === location.pathname;

        nodes.push({
          id: route.id,
          label: route.label,
          category: category.id,
          description: route.description,
          size: isCurrentRoute ? 28 : 22,
          color: category.color,
          data: { route, category, isCurrentRoute },
        });

      });
    });

    // Create edges between related routes in same category
    // Only create edges between nodes that actually exist
    const nodeIds = new Set(nodes.map(n => n.id));

    visibleCategories.forEach((category) => {
      const categoryNodeIds = category.routes
        .filter(r => nodeIds.has(r.id))
        .map(r => r.id);

      // Create some edges between nodes in the same category
      for (let i = 0; i < categoryNodeIds.length; i++) {
        for (let j = i + 1; j < categoryNodeIds.length; j++) {
          if (Math.random() < 0.3) {
            const existingEdge = edges.find(
              (e) =>
                (e.source === categoryNodeIds[i] && e.target === categoryNodeIds[j]) ||
                (e.source === categoryNodeIds[j] && e.target === categoryNodeIds[i])
            );
            if (!existingEdge) {
              edges.push({
                source: categoryNodeIds[i],
                target: categoryNodeIds[j],
                weight: 0.5,
                style: 'dashed' as const,
              });
            }
          }
        }
      }
    });

    return { nodes, edges, categoryColors: colors };
  }, [manifest, location.pathname, searchQuery, activeCategories, isLoggedIn]);

  // Get categories that have visible routes (for legend filtering)
  const visibleCategoryIds = useMemo(() => {
    return manifest.categories
      .filter((category) => {
        // Check if category has any visible routes for current user
        return category.routes.some((route) => {
          if (!isLoggedIn && route.protection === 'protected') {
            return false;
          }
          return true;
        });
      })
      .map((c) => c.id);
  }, [manifest, isLoggedIn]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: ForceGraphNode) => {
      const route = (node.data as { route: RouteDefinition })?.route;
      if (route) {
        if (onRouteSelect) {
          onRouteSelect(route);
        } else {
          navigate(route.path);
        }
      }
    },
    [navigate, onRouteSelect]
  );

  // Toggle category filter
  const handleToggleCategory = useCallback((categoryId: string) => {
    setActiveCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  }, []);

  return (
    <D3Container
      height={height}
      className={className}
      glassmorphism
    >
      {/* Search and Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap gap-3">
        {showSearch && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search routes..."
              className="w-48 px-4 py-2 pl-10 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}

        {searchQuery && (
          <div className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-sm text-purple-300">
            {nodes.length} result{nodes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Legend - only show categories with visible routes */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2">
          {manifest.categories
            .filter((category) => visibleCategoryIds.includes(category.id))
            .map((category) => (
              <button
                key={category.id}
                onClick={() => handleToggleCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategories.length === 0 || activeCategories.includes(category.id)
                    ? 'opacity-100'
                    : 'opacity-40'
                }`}
                style={{
                  backgroundColor: `${category.color}20`,
                  borderColor: `${category.color}40`,
                  borderWidth: 1,
                  color: category.color,
                }}
              >
                {category.label}
              </button>
            ))}

          {activeCategories.length > 0 && (
            <button
              onClick={() => setActiveCategories([])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 border border-white/20 text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Current location indicator */}
      <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg text-xs text-gray-400">
        <span className="text-pink-400 mr-1">●</span>
        Current: <span className="text-white font-medium">{location.pathname}</span>
      </div>

      {/* Force Graph */}
      <ForceGraph
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        height={height - 100}
        categoryColors={categoryColors}
        showLabels
        animated
        interactive
        nodeRadius={22}
        linkDistance={80}
        chargeStrength={-400}
        clusterStrength={0.6}
      />
    </D3Container>
  );
}

export default RouteAtlasD3;
