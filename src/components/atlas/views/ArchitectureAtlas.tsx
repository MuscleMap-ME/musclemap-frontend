/**
 * ArchitectureAtlas - System architecture diagrams
 *
 * Interactive diagrams showing MuscleMap's technical architecture.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ArchitectureNode {
  id: string;
  label: string;
  description: string;
  type: 'client' | 'server' | 'database' | 'service' | 'external';
  icon: string;
  color: string;
}

interface ArchitectureConnection {
  from: string;
  to: string;
  label?: string;
  type: 'data' | 'auth' | 'realtime';
}

interface ArchitectureDiagram {
  id: string;
  title: string;
  description: string;
  nodes: ArchitectureNode[];
  connections: ArchitectureConnection[];
}

const DIAGRAMS: ArchitectureDiagram[] = [
  {
    id: 'frontend',
    title: 'Frontend Architecture',
    description: 'React web app and Expo mobile app',
    nodes: [
      { id: 'web', label: 'Web App', description: 'React + Vite', type: 'client', icon: '🌐', color: '#3b82f6' },
      { id: 'mobile', label: 'Mobile App', description: 'React Native + Expo', type: 'client', icon: '📱', color: '#22c55e' },
      { id: 'state', label: 'Zustand Store', description: 'Global state management', type: 'service', icon: '🗄️', color: '#8b5cf6' },
      { id: 'apollo', label: 'Apollo Client', description: 'GraphQL client', type: 'service', icon: '🚀', color: '#e535ab' },
      { id: 'api', label: 'API Client', description: '@musclemap/client SDK', type: 'service', icon: '📦', color: '#f59e0b' },
    ],
    connections: [
      { from: 'web', to: 'state', label: 'State', type: 'data' },
      { from: 'mobile', to: 'state', label: 'State', type: 'data' },
      { from: 'web', to: 'apollo', label: 'GraphQL', type: 'data' },
      { from: 'mobile', to: 'api', label: 'REST', type: 'data' },
    ],
  },
  {
    id: 'backend',
    title: 'Backend Architecture',
    description: 'Fastify API server with modules',
    nodes: [
      { id: 'fastify', label: 'Fastify Server', description: 'HTTP/GraphQL server', type: 'server', icon: '⚡', color: '#3b82f6' },
      { id: 'graphql', label: 'GraphQL API', description: 'Apollo Server', type: 'service', icon: '🔷', color: '#e535ab' },
      { id: 'rest', label: 'REST API', description: '47+ route modules', type: 'service', icon: '🔌', color: '#22c55e' },
      { id: 'auth', label: 'Auth Module', description: 'JWT authentication', type: 'service', icon: '🔐', color: '#f59e0b' },
      { id: 'modules', label: 'Feature Modules', description: 'Skills, Credits, etc.', type: 'service', icon: '📦', color: '#8b5cf6' },
    ],
    connections: [
      { from: 'fastify', to: 'graphql', type: 'data' },
      { from: 'fastify', to: 'rest', type: 'data' },
      { from: 'rest', to: 'auth', label: 'Auth', type: 'auth' },
      { from: 'rest', to: 'modules', type: 'data' },
    ],
  },
  {
    id: 'data',
    title: 'Data Architecture',
    description: 'PostgreSQL database and caching',
    nodes: [
      { id: 'postgres', label: 'PostgreSQL', description: 'Primary database', type: 'database', icon: '🐘', color: '#336791' },
      { id: 'redis', label: 'Redis', description: 'Cache & sessions', type: 'database', icon: '🔴', color: '#dc382d' },
      { id: 'migrations', label: 'Migrations', description: '44+ schema migrations', type: 'service', icon: '📋', color: '#f59e0b' },
      { id: 'schema', label: 'Schema', description: 'TypeScript types', type: 'service', icon: '📐', color: '#3178c6' },
    ],
    connections: [
      { from: 'migrations', to: 'postgres', label: 'DDL', type: 'data' },
      { from: 'schema', to: 'postgres', label: 'Types', type: 'data' },
      { from: 'redis', to: 'postgres', label: 'Cache', type: 'data' },
    ],
  },
  {
    id: 'deployment',
    title: 'Deployment Architecture',
    description: 'VPS hosting with Caddy proxy',
    nodes: [
      { id: 'caddy', label: 'Caddy', description: 'Reverse proxy + SSL', type: 'server', icon: '🔒', color: '#22c55e' },
      { id: 'pm2', label: 'PM2', description: 'Process manager', type: 'service', icon: '⚙️', color: '#2b037a' },
      { id: 'vps', label: 'VPS', description: 'Ubuntu server', type: 'server', icon: '🖥️', color: '#e95420' },
      { id: 'github', label: 'GitHub', description: 'Source control', type: 'external', icon: '🐙', color: '#333' },
    ],
    connections: [
      { from: 'github', to: 'vps', label: 'Deploy', type: 'data' },
      { from: 'caddy', to: 'pm2', label: 'Proxy', type: 'data' },
      { from: 'pm2', to: 'vps', label: 'Manage', type: 'data' },
    ],
  },
];

const typeColors = {
  client: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  server: 'from-green-500/20 to-green-500/5 border-green-500/30',
  database: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  service: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  external: 'from-gray-500/20 to-gray-500/5 border-gray-500/30',
};

interface ArchitectureAtlasProps {
  className?: string;
  defaultDiagram?: string;
}

export function ArchitectureAtlas({ className = '', defaultDiagram = 'backend' }: ArchitectureAtlasProps) {
  const [activeDiagram, setActiveDiagram] = useState(defaultDiagram);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const currentDiagram = DIAGRAMS.find((d) => d.id === activeDiagram) || DIAGRAMS[0];

  return (
    <div className={`architecture-atlas ${className}`}>
      {/* Diagram selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {DIAGRAMS.map((diagram) => (
          <button
            key={diagram.id}
            onClick={() => setActiveDiagram(diagram.id)}
            className={`
              px-4 py-2 rounded-lg whitespace-nowrap
              transition-colors text-sm font-medium
              ${activeDiagram === diagram.id
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
              }
            `}
          >
            {diagram.title}
          </button>
        ))}
      </div>

      {/* Diagram display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentDiagram.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-1">{currentDiagram.title}</h3>
            <p className="text-gray-400">{currentDiagram.description}</p>
          </div>

          {/* Nodes grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {currentDiagram.nodes.map((node) => (
              <motion.div
                key={node.id}
                onHoverStart={() => setHoveredNode(node.id)}
                onHoverEnd={() => setHoveredNode(null)}
                className={`
                  relative p-4 rounded-xl
                  bg-gradient-to-br ${typeColors[node.type]}
                  border backdrop-blur-sm
                  transition-all duration-200
                  ${hoveredNode === node.id ? 'scale-105 shadow-lg' : ''}
                `}
              >
                <div className="flex flex-col items-center text-center">
                  <span className="text-3xl mb-2">{node.icon}</span>
                  <h4 className="font-semibold text-white text-sm">{node.label}</h4>
                  <p className="text-xs text-gray-400 mt-1">{node.description}</p>
                </div>

                {/* Highlight connected nodes */}
                {hoveredNode && hoveredNode !== node.id && (
                  <div
                    className={`
                      absolute inset-0 rounded-xl transition-opacity
                      ${currentDiagram.connections.some(
                        (c) =>
                          (c.from === hoveredNode && c.to === node.id) ||
                          (c.to === hoveredNode && c.from === node.id)
                      )
                        ? 'bg-white/5'
                        : 'bg-black/20'
                      }
                    `}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Connections list */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">Data Flow</h4>
            <div className="flex flex-wrap gap-2">
              {currentDiagram.connections.map((conn, index) => {
                const fromNode = currentDiagram.nodes.find((n) => n.id === conn.from);
                const toNode = currentDiagram.nodes.find((n) => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                return (
                  <div
                    key={index}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg
                      bg-white/5 text-xs
                      ${hoveredNode === conn.from || hoveredNode === conn.to
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'text-gray-400'
                      }
                    `}
                  >
                    <span>{fromNode.icon}</span>
                    <span className="text-gray-600">→</span>
                    <span>{toNode.icon}</span>
                    {conn.label && (
                      <span className="text-gray-500">({conn.label})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Node Types</div>
        <div className="flex flex-wrap gap-3">
          {[
            { type: 'client', label: 'Client App', color: 'bg-blue-500' },
            { type: 'server', label: 'Server', color: 'bg-green-500' },
            { type: 'database', label: 'Database', color: 'bg-purple-500' },
            { type: 'service', label: 'Service', color: 'bg-amber-500' },
            { type: 'external', label: 'External', color: 'bg-gray-500' },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
