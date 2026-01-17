/**
 * MapMenu Data
 *
 * Generates the map data including categories and nodes for the MapMenu navigation.
 * Maps to actual MuscleMap routes and features.
 */

import type { MapData, MapNode, MapCategory } from '../types';

// ============================================
// CATEGORIES
// ============================================

export const MAP_CATEGORIES: MapCategory[] = [
  {
    id: 'training',
    label: 'Training',
    color: '#FF6B6B',
    icon: '💪',
    nodeCount: 8,
  },
  {
    id: 'progress',
    label: 'Progress',
    color: '#4ECDC4',
    icon: '📊',
    nodeCount: 6,
  },
  {
    id: 'community',
    label: 'Community',
    color: '#9B59B6',
    icon: '👥',
    nodeCount: 7,
  },
  {
    id: 'economy',
    label: 'Economy',
    color: '#F39C12',
    icon: '💰',
    nodeCount: 5,
  },
  {
    id: 'health',
    label: 'Health',
    color: '#2ECC71',
    icon: '❤️',
    nodeCount: 5,
  },
  {
    id: 'account',
    label: 'Account',
    color: '#95A5A6',
    icon: '⚙️',
    nodeCount: 4,
  },
];

// ============================================
// NODE GENERATORS
// ============================================

function generateTrainingNodes(): MapNode[] {
  return [
    {
      id: 'training-workout',
      label: 'Workout',
      shortLabel: 'Workout',
      category: 'training',
      route: '/workout',
      position: { x: 0.15, y: 0.35, z: 0.5 },
      metadata: { color: '#FF6B6B', icon: '🏋️', description: 'Start your workout session' },
      connections: ['training-exercises', 'training-journey'],
    },
    {
      id: 'training-exercises',
      label: 'Exercises',
      shortLabel: 'Exercises',
      category: 'training',
      route: '/exercises',
      position: { x: 0.25, y: 0.25, z: 0.45 },
      metadata: { color: '#FF6B6B', icon: '📝', description: 'Browse exercise library' },
      connections: ['training-workout'],
    },
    {
      id: 'training-journey',
      label: 'Journey',
      shortLabel: 'Journey',
      category: 'training',
      route: '/journey',
      position: { x: 0.2, y: 0.45, z: 0.55 },
      metadata: { color: '#FF6B6B', icon: '🗺️', description: 'Your fitness journey' },
      connections: ['training-workout', 'training-skills'],
    },
    {
      id: 'training-skills',
      label: 'Skills',
      shortLabel: 'Skills',
      category: 'training',
      route: '/skills',
      position: { x: 0.1, y: 0.5, z: 0.6 },
      metadata: { color: '#FF6B6B', icon: '⚔️', description: 'Skill tree progression' },
      connections: ['training-journey', 'training-martial'],
    },
    {
      id: 'training-martial',
      label: 'Martial Arts',
      shortLabel: 'Martial',
      category: 'training',
      route: '/martial-arts',
      position: { x: 0.05, y: 0.4, z: 0.5 },
      metadata: { color: '#FF6B6B', icon: '🥋', description: 'Martial arts training' },
      connections: ['training-skills'],
    },
    {
      id: 'training-pt',
      label: 'PT Tests',
      shortLabel: 'PT Tests',
      category: 'training',
      route: '/pt-tests',
      position: { x: 0.3, y: 0.35, z: 0.4 },
      metadata: { color: '#FF6B6B', icon: '🎖️', description: 'Physical fitness tests' },
      connections: ['training-exercises', 'training-career'],
    },
    {
      id: 'training-career',
      label: 'Career Readiness',
      shortLabel: 'Career',
      category: 'training',
      route: '/career-readiness',
      position: { x: 0.35, y: 0.45, z: 0.45 },
      metadata: { color: '#FF6B6B', icon: '🎯', description: 'Career fitness goals' },
      connections: ['training-pt'],
    },
    {
      id: 'training-adventure',
      label: 'Adventure Map',
      shortLabel: 'Adventure',
      category: 'training',
      route: '/adventure-map',
      position: { x: 0.15, y: 0.55, z: 0.5 },
      metadata: { color: '#FF6B6B', icon: '🗺️', description: 'RPG-style navigation' },
      connections: ['training-journey'],
    },
  ];
}

function generateProgressNodes(): MapNode[] {
  return [
    {
      id: 'progress-dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      category: 'progress',
      route: '/dashboard',
      position: { x: 0.5, y: 0.3, z: 0.5 },
      metadata: { color: '#4ECDC4', icon: '📱', description: 'Your fitness dashboard' },
      connections: ['progress-stats', 'progress-records'],
    },
    {
      id: 'progress-stats',
      label: 'Statistics',
      shortLabel: 'Stats',
      category: 'progress',
      route: '/stats',
      position: { x: 0.55, y: 0.2, z: 0.45 },
      metadata: { color: '#4ECDC4', icon: '📈', description: 'Detailed statistics' },
      connections: ['progress-dashboard'],
    },
    {
      id: 'progress-records',
      label: 'Personal Records',
      shortLabel: 'Records',
      category: 'progress',
      route: '/personal-records',
      position: { x: 0.6, y: 0.35, z: 0.5 },
      metadata: { color: '#4ECDC4', icon: '🏆', description: 'Your personal bests' },
      connections: ['progress-dashboard', 'progress-achievements'],
    },
    {
      id: 'progress-achievements',
      label: 'Achievements',
      shortLabel: 'Achieve',
      category: 'progress',
      route: '/achievements',
      position: { x: 0.65, y: 0.25, z: 0.45 },
      metadata: { color: '#4ECDC4', icon: '🎖️', description: 'Earned achievements' },
      connections: ['progress-records', 'progress-progression'],
    },
    {
      id: 'progress-progression',
      label: 'Progression',
      shortLabel: 'Progress',
      category: 'progress',
      route: '/progression',
      position: { x: 0.5, y: 0.4, z: 0.55 },
      metadata: { color: '#4ECDC4', icon: '📊', description: 'Character progression' },
      connections: ['progress-achievements'],
    },
    {
      id: 'progress-photos',
      label: 'Progress Photos',
      shortLabel: 'Photos',
      category: 'progress',
      route: '/progress-photos',
      position: { x: 0.45, y: 0.2, z: 0.4 },
      metadata: { color: '#4ECDC4', icon: '📷', description: 'Visual progress tracking' },
      connections: ['progress-stats'],
    },
  ];
}

function generateCommunityNodes(): MapNode[] {
  return [
    {
      id: 'community-hub',
      label: 'Community Hub',
      shortLabel: 'Community',
      category: 'community',
      route: '/community',
      position: { x: 0.75, y: 0.5, z: 0.5 },
      metadata: { color: '#9B59B6', icon: '🏠', description: 'Community dashboard' },
      connections: ['community-crews', 'community-rivals', 'community-competitions'],
    },
    {
      id: 'community-crews',
      label: 'Crews',
      shortLabel: 'Crews',
      category: 'community',
      route: '/crews',
      position: { x: 0.8, y: 0.4, z: 0.45 },
      metadata: { color: '#9B59B6', icon: '👥', description: 'Join or create crews' },
      connections: ['community-hub'],
    },
    {
      id: 'community-rivals',
      label: 'Rivals',
      shortLabel: 'Rivals',
      category: 'community',
      route: '/rivals',
      position: { x: 0.85, y: 0.55, z: 0.55 },
      metadata: { color: '#9B59B6', icon: '⚔️', description: 'Challenge your rivals' },
      connections: ['community-hub'],
    },
    {
      id: 'community-competitions',
      label: 'Competitions',
      shortLabel: 'Compete',
      category: 'community',
      route: '/competitions',
      position: { x: 0.7, y: 0.6, z: 0.6 },
      metadata: { color: '#9B59B6', icon: '🏆', description: 'Join competitions' },
      connections: ['community-hub', 'community-highfives'],
    },
    {
      id: 'community-highfives',
      label: 'High Fives',
      shortLabel: 'High 5s',
      category: 'community',
      route: '/highfives',
      position: { x: 0.8, y: 0.65, z: 0.55 },
      metadata: { color: '#9B59B6', icon: '🖐️', description: 'Give and receive high fives' },
      connections: ['community-competitions'],
    },
    {
      id: 'community-messages',
      label: 'Messages',
      shortLabel: 'Messages',
      category: 'community',
      route: '/messages',
      position: { x: 0.9, y: 0.5, z: 0.5 },
      metadata: { color: '#9B59B6', icon: '💬', description: 'Direct messages' },
      connections: ['community-hub'],
    },
    {
      id: 'community-live',
      label: 'Live Activity',
      shortLabel: 'Live',
      category: 'community',
      route: '/live',
      position: { x: 0.75, y: 0.35, z: 0.4 },
      metadata: { color: '#9B59B6', icon: '📡', description: 'Live activity feed' },
      connections: ['community-hub'],
    },
  ];
}

function generateEconomyNodes(): MapNode[] {
  return [
    {
      id: 'economy-credits',
      label: 'Credits',
      shortLabel: 'Credits',
      category: 'economy',
      route: '/credits',
      position: { x: 0.4, y: 0.7, z: 0.5 },
      metadata: { color: '#F39C12', icon: '💎', description: 'Your credit balance' },
      connections: ['economy-wallet', 'economy-marketplace'],
    },
    {
      id: 'economy-wallet',
      label: 'Wallet',
      shortLabel: 'Wallet',
      category: 'economy',
      route: '/wallet',
      position: { x: 0.35, y: 0.8, z: 0.55 },
      metadata: { color: '#F39C12', icon: '👛', description: 'Manage your wallet' },
      connections: ['economy-credits'],
    },
    {
      id: 'economy-marketplace',
      label: 'Marketplace',
      shortLabel: 'Market',
      category: 'economy',
      route: '/marketplace',
      position: { x: 0.5, y: 0.75, z: 0.55 },
      metadata: { color: '#F39C12', icon: '🏪', description: 'Buy and sell items' },
      connections: ['economy-credits', 'economy-skins'],
    },
    {
      id: 'economy-skins',
      label: 'Skins Store',
      shortLabel: 'Skins',
      category: 'economy',
      route: '/skins',
      position: { x: 0.55, y: 0.85, z: 0.6 },
      metadata: { color: '#F39C12', icon: '🎨', description: 'Customize your look' },
      connections: ['economy-marketplace'],
    },
    {
      id: 'economy-collection',
      label: 'Collection',
      shortLabel: 'Collection',
      category: 'economy',
      route: '/collection',
      position: { x: 0.45, y: 0.85, z: 0.5 },
      metadata: { color: '#F39C12', icon: '📦', description: 'Your item collection' },
      connections: ['economy-marketplace'],
    },
  ];
}

function generateHealthNodes(): MapNode[] {
  return [
    {
      id: 'health-overview',
      label: 'Health',
      shortLabel: 'Health',
      category: 'health',
      route: '/health',
      position: { x: 0.2, y: 0.75, z: 0.5 },
      metadata: { color: '#2ECC71', icon: '❤️', description: 'Health overview' },
      connections: ['health-recovery', 'health-nutrition', 'health-goals'],
    },
    {
      id: 'health-recovery',
      label: 'Recovery',
      shortLabel: 'Recovery',
      category: 'health',
      route: '/recovery',
      position: { x: 0.15, y: 0.85, z: 0.55 },
      metadata: { color: '#2ECC71', icon: '😴', description: 'Rest and recovery' },
      connections: ['health-overview'],
    },
    {
      id: 'health-nutrition',
      label: 'Nutrition',
      shortLabel: 'Nutrition',
      category: 'health',
      route: '/nutrition',
      position: { x: 0.25, y: 0.85, z: 0.55 },
      metadata: { color: '#2ECC71', icon: '🥗', description: 'Nutrition tracking' },
      connections: ['health-overview'],
    },
    {
      id: 'health-goals',
      label: 'Goals',
      shortLabel: 'Goals',
      category: 'health',
      route: '/goals',
      position: { x: 0.3, y: 0.75, z: 0.45 },
      metadata: { color: '#2ECC71', icon: '🎯', description: 'Set your goals' },
      connections: ['health-overview', 'health-limitations'],
    },
    {
      id: 'health-limitations',
      label: 'Limitations',
      shortLabel: 'Limits',
      category: 'health',
      route: '/limitations',
      position: { x: 0.35, y: 0.85, z: 0.5 },
      metadata: { color: '#2ECC71', icon: '⚠️', description: 'Track limitations' },
      connections: ['health-goals'],
    },
  ];
}

function generateAccountNodes(): MapNode[] {
  return [
    {
      id: 'account-profile',
      label: 'Profile',
      shortLabel: 'Profile',
      category: 'account',
      route: '/profile',
      position: { x: 0.9, y: 0.2, z: 0.5 },
      metadata: { color: '#95A5A6', icon: '👤', description: 'Your profile' },
      connections: ['account-settings', 'account-trainers'],
    },
    {
      id: 'account-settings',
      label: 'Settings',
      shortLabel: 'Settings',
      category: 'account',
      route: '/settings',
      position: { x: 0.95, y: 0.3, z: 0.45 },
      metadata: { color: '#95A5A6', icon: '⚙️', description: 'App settings' },
      connections: ['account-profile'],
    },
    {
      id: 'account-trainers',
      label: 'Trainers',
      shortLabel: 'Trainers',
      category: 'account',
      route: '/trainers',
      position: { x: 0.85, y: 0.15, z: 0.55 },
      metadata: { color: '#95A5A6', icon: '🏃', description: 'Find trainers' },
      connections: ['account-profile'],
    },
    {
      id: 'account-plugins',
      label: 'Plugins',
      shortLabel: 'Plugins',
      category: 'account',
      route: '/plugins',
      position: { x: 0.95, y: 0.15, z: 0.5 },
      metadata: { color: '#95A5A6', icon: '🔌', description: 'Manage plugins' },
      connections: ['account-settings'],
    },
  ];
}

// ============================================
// DATA GENERATORS
// ============================================

/**
 * Generate full map data for full-page view
 */
export function getMapData(): MapData {
  return {
    nodes: [
      ...generateTrainingNodes(),
      ...generateProgressNodes(),
      ...generateCommunityNodes(),
      ...generateEconomyNodes(),
      ...generateHealthNodes(),
      ...generateAccountNodes(),
    ],
    categories: MAP_CATEGORIES,
    edges: [], // Edges derived from node connections
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Generate compact map data showing only category nodes
 */
export function getCompactMapData(): MapData {
  const categoryPositions: Record<string, { x: number; y: number; z: number }> = {
    training: { x: 0.2, y: 0.3, z: 0.5 },
    progress: { x: 0.5, y: 0.2, z: 0.5 },
    community: { x: 0.8, y: 0.3, z: 0.5 },
    economy: { x: 0.35, y: 0.7, z: 0.5 },
    health: { x: 0.2, y: 0.7, z: 0.5 },
    account: { x: 0.8, y: 0.7, z: 0.5 },
  };

  return {
    nodes: MAP_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      category: cat.id,
      route: getCategoryDefaultRoute(cat.id),
      position: categoryPositions[cat.id] || { x: 0.5, y: 0.5, z: 0.5 },
      metadata: {
        color: cat.color,
        icon: cat.icon,
        description: `${cat.nodeCount} features`,
        nodeCount: cat.nodeCount,
      },
    })),
    categories: MAP_CATEGORIES,
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Get default route for a category
 */
function getCategoryDefaultRoute(categoryId: string): string {
  const routes: Record<string, string> = {
    training: '/workout',
    progress: '/dashboard',
    community: '/community',
    economy: '/credits',
    health: '/health',
    account: '/profile',
  };
  return routes[categoryId] || '/dashboard';
}

/**
 * Find a node by ID
 */
export function findNodeById(id: string): MapNode | undefined {
  const data = getMapData();
  return data.nodes.find((n) => n.id === id);
}

/**
 * Find nodes by category
 */
export function findNodesByCategory(categoryId: string): MapNode[] {
  const data = getMapData();
  return data.nodes.filter((n) => n.category === categoryId);
}

/**
 * Find node by route
 */
export function findNodeByRoute(route: string): MapNode | undefined {
  const data = getMapData();
  return data.nodes.find((n) => n.route === route);
}

/**
 * Get connected nodes
 */
export function getConnectedNodes(nodeId: string): MapNode[] {
  const data = getMapData();
  const node = data.nodes.find((n) => n.id === nodeId);

  if (!node || !node.connections) {
    return [];
  }

  return node.connections
    .map((connId) => data.nodes.find((n) => n.id === connId))
    .filter((n): n is MapNode => n !== undefined);
}
