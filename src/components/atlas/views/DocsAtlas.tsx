/**
 * DocsAtlas - Documentation directory visualization
 *
 * Tree view of documentation structure with search and navigation.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import type { DocsAtlasManifest, DocNode } from '../atlasTypes';

// Static docs structure - matches docs/public/
const STATIC_DOCS: DocsAtlasManifest = {
  version: '1.0.0',
  generated: 'static',
  rootPath: 'docs/public',
  documents: [
    {
      id: 'getting-started',
      path: 'getting-started',
      title: 'Getting Started',
      description: 'Begin your MuscleMap journey',
      icon: '🚀',
      children: [
        { id: 'onboarding-flow', path: 'getting-started/onboarding-flow', title: 'Onboarding Flow', description: 'How to set up your account' },
      ],
    },
    {
      id: 'features',
      path: 'features',
      title: 'Features',
      description: 'Explore MuscleMap capabilities',
      icon: '✨',
      children: [
        { id: 'muscle-system', path: 'features/muscle-system', title: 'Muscle Tracking', description: 'Real-time muscle activation' },
      ],
    },
    {
      id: 'guides',
      path: 'guides',
      title: 'User Guides',
      description: 'Step-by-step tutorials',
      icon: '📚',
      children: [
        { id: 'dashboard', path: 'guides/dashboard', title: 'Dashboard Guide', description: 'Navigate your dashboard' },
        { id: 'logging-workouts', path: 'guides/logging-workouts', title: 'Logging Workouts', description: 'Track your sessions' },
        { id: 'tracking-progress', path: 'guides/tracking-progress', title: 'Tracking Progress', description: 'Monitor your gains' },
        { id: 'crews', path: 'guides/crews', title: 'Crews', description: 'Team up with others' },
        { id: 'rivalries', path: 'guides/rivalries', title: 'Rivalries', description: 'Compete with friends' },
        { id: 'first-week', path: 'guides/first-week', title: 'Your First Week', description: 'Getting started guide' },
        { id: 'advanced-features', path: 'guides/advanced-features', title: 'Advanced Features', description: 'Power user tips' },
        { id: 'troubleshooting', path: 'guides/troubleshooting', title: 'Troubleshooting', description: 'Common issues' },
      ],
    },
    {
      id: 'api',
      path: 'api',
      title: 'API Reference',
      description: 'Developer documentation',
      icon: '🔌',
    },
    {
      id: 'community',
      path: 'community',
      title: 'Community',
      description: 'Social features guide',
      icon: '👥',
    },
  ],
};

interface DocsAtlasProps {
  className?: string;
  onNavigate?: (path: string) => void;
  currentDocId?: string;
}

interface TreeNodeProps {
  node: DocNode;
  level: number;
  currentDocId?: string;
  searchQuery: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (path: string) => void;
}

function TreeNode({
  node,
  level,
  currentDocId,
  searchQuery,
  expandedIds,
  onToggle,
  onNavigate,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isCurrent = node.id === currentDocId;

  // Check if node matches search
  const matchesSearch = searchQuery
    ? node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description?.toLowerCase().includes(searchQuery.toLowerCase())
    : true;

  // Check if any children match
  const childrenMatch = node.children?.some(
    (child) =>
      child.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!matchesSearch && !childrenMatch && searchQuery) {
    return null;
  }

  return (
    <div className="docs-tree-node">
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(node.id);
          }
          onNavigate(node.path);
        }}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg
          text-left text-sm transition-colors
          ${isCurrent
            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            : 'hover:bg-white/5 text-gray-300 hover:text-white'
          }
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* Expand/collapse icon */}
        {hasChildren && (
          <svg
            className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}

        {/* Icon */}
        {node.icon && !hasChildren && (
          <span className="text-sm">{node.icon}</span>
        )}

        {/* Folder icon for nodes with children */}
        {hasChildren && !node.icon && (
          <svg
            className={`w-4 h-4 ${isExpanded ? 'text-yellow-400' : 'text-gray-500'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        )}

        {/* Document icon */}
        {!hasChildren && !node.icon && (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        {/* Title */}
        <span className="flex-1 truncate">{node.title}</span>

        {/* Current indicator */}
        {isCurrent && (
          <span className="w-2 h-2 rounded-full bg-blue-400" />
        )}
      </button>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                currentDocId={currentDocId}
                searchQuery={searchQuery}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onNavigate={onNavigate}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DocsAtlas({ className = '', onNavigate: onNavigateProp, currentDocId }: DocsAtlasProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['getting-started', 'guides']));

  // Handle navigation
  const handleNavigate = (path: string) => {
    if (onNavigateProp) {
      onNavigateProp(path);
    } else {
      navigate(`/docs/${path}`);
    }
  };

  // Toggle expanded state
  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all when searching
  const effectiveExpandedIds = useMemo(() => {
    if (searchQuery) {
      const allIds = new Set<string>();
      const addIds = (nodes: DocNode[]) => {
        nodes.forEach((node) => {
          allIds.add(node.id);
          if (node.children) addIds(node.children);
        });
      };
      addIds(STATIC_DOCS.documents);
      return allIds;
    }
    return expandedIds;
  }, [searchQuery, expandedIds]);

  return (
    <div className={`docs-atlas ${className}`}>
      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search docs..."
          className="
            w-full px-3 py-2 pl-9
            text-sm text-white placeholder-gray-500
            bg-white/5 border border-white/10 rounded-lg
            focus:outline-none focus:border-blue-500/50
          "
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Tree view */}
      <div className="docs-tree space-y-1">
        {STATIC_DOCS.documents.map((doc) => (
          <TreeNode
            key={doc.id}
            node={doc}
            level={0}
            currentDocId={currentDocId}
            searchQuery={searchQuery}
            expandedIds={effectiveExpandedIds}
            onToggle={handleToggle}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Quick Links
        </div>
        <div className="space-y-1">
          <a
            href="/docs/pdf/musclemap-features.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            Features Guide (PDF)
          </a>
          <a
            href="/docs/pdf/musclemap-api-reference.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            API Reference (PDF)
          </a>
        </div>
      </div>
    </div>
  );
}
