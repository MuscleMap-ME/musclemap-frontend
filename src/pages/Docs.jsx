import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { DocsAtlas } from '../components/atlas';
import SEO, { getBreadcrumbSchema } from '../components/SEO';

// Public User Documentation (new!)
const PUBLIC_DOCS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to MuscleMap? Start your fitness journey here',
    icon: 'rocket',
    color: 'green',
    path: '/docs/public/getting-started/README.md',
    category: 'user'
  },
  {
    id: 'features',
    title: 'All Features',
    description: 'Explore everything MuscleMap has to offer',
    icon: 'star',
    color: 'yellow',
    path: '/docs/public/features/README.md',
    category: 'user'
  },
  {
    id: 'community',
    title: 'Community Guide',
    description: 'Hangouts, rivalries, crews, and social features',
    icon: 'users',
    color: 'violet',
    path: '/docs/public/community/README.md',
    category: 'user'
  },
  {
    id: 'api',
    title: 'API Reference',
    description: 'Developer documentation for integrations',
    icon: 'code',
    color: 'cyan',
    path: '/docs/public/api/README.md',
    category: 'developer'
  },
  {
    id: 'guides',
    title: 'User Guides',
    description: 'Step-by-step tutorials for all MuscleMap features',
    icon: 'book',
    color: 'violet',
    path: '/docs/public/guides/README.md',
    category: 'user'
  },
];

// Individual User Guides (broken out from single page)
const USER_GUIDES = [
  {
    id: 'guide-first-week',
    title: 'Your First Week',
    description: 'Day-by-day guide to getting started',
    icon: 'rocket',
    color: 'green',
    path: '/docs/public/guides/first-week.md',
    category: 'guide'
  },
  {
    id: 'guide-dashboard',
    title: 'Understanding the Dashboard',
    description: 'Navigate your home base effectively',
    icon: 'cube',
    color: 'blue',
    path: '/docs/public/guides/dashboard.md',
    category: 'guide'
  },
  {
    id: 'guide-logging-workouts',
    title: 'Logging Workouts',
    description: 'Track every set, rep, and exercise',
    icon: 'heart',
    color: 'red',
    path: '/docs/public/guides/logging-workouts.md',
    category: 'guide'
  },
  {
    id: 'guide-tracking-progress',
    title: 'Tracking Progress',
    description: 'Stats, goals, and muscle balance',
    icon: 'flow',
    color: 'indigo',
    path: '/docs/public/guides/tracking-progress.md',
    category: 'guide'
  },
  {
    id: 'guide-rivalries',
    title: 'Rivalries & Competitions',
    description: 'Challenge others and compete',
    icon: 'shield',
    color: 'orange',
    path: '/docs/public/guides/rivalries.md',
    category: 'guide'
  },
  {
    id: 'guide-crews',
    title: 'Creating Crews',
    description: 'Build and manage your fitness squad',
    icon: 'users',
    color: 'violet',
    path: '/docs/public/guides/crews.md',
    category: 'guide'
  },
  {
    id: 'guide-advanced',
    title: 'Advanced Features',
    description: 'Wearables, journeys, and companions',
    icon: 'star',
    color: 'yellow',
    path: '/docs/public/guides/advanced-features.md',
    category: 'guide'
  },
  {
    id: 'guide-troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and FAQ',
    icon: 'wrench',
    color: 'teal',
    path: '/docs/public/guides/troubleshooting.md',
    category: 'guide'
  },
];

// PDF Documentation (LaTeX-generated)
const PDF_DOCS = [
  {
    id: 'architecture',
    title: 'System Architecture',
    description: 'Complete technical architecture with data flow diagrams',
    icon: 'cube',
    color: 'purple',
    file: 'musclemap-architecture.pdf',
    pages: 12,
  },
  {
    id: 'features-pdf',
    title: 'Feature Guide',
    description: 'Visual guide to all MuscleMap features',
    icon: 'star',
    color: 'yellow',
    file: 'musclemap-features.pdf',
    pages: 10,
  },
  {
    id: 'api-reference',
    title: 'API Quick Reference',
    description: 'Printable API reference card',
    icon: 'code',
    color: 'cyan',
    file: 'musclemap-api-reference.pdf',
    pages: 1,
  },
];

// Technical Documentation (for developers)
const TECH_DOCS = [
  {
    id: 'ARCHITECTURE',
    title: 'Architecture',
    description: 'System design and tech stack overview',
    icon: 'cube',
    color: 'purple'
  },
  {
    id: 'DATA_MODEL',
    title: 'Data Model',
    description: 'Database schema and data structures',
    icon: 'database',
    color: 'green'
  },
  {
    id: 'DATA_FLOW',
    title: 'Data Flow',
    description: 'How data moves through the system',
    icon: 'flow',
    color: 'indigo'
  },
  {
    id: 'API_REFERENCE',
    title: 'API Reference',
    description: 'Complete REST API endpoint documentation',
    icon: 'code',
    color: 'cyan'
  },
  {
    id: 'PLUGINS',
    title: 'Plugins',
    description: 'Plugin system and development guide',
    icon: 'puzzle',
    color: 'orange'
  },
  {
    id: 'EXTENSIBILITY',
    title: 'Extensibility',
    description: 'Patterns for extending the platform',
    icon: 'expand',
    color: 'teal'
  },
  {
    id: 'SECURITY',
    title: 'Security',
    description: 'Security best practices',
    icon: 'shield',
    color: 'emerald'
  },
  {
    id: 'CONTRIBUTING',
    title: 'Contributing',
    description: 'How to contribute to MuscleMap',
    icon: 'users',
    color: 'violet'
  },
];

const ICON_COMPONENTS = {
  rocket: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  book: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  star: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  cube: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  code: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  database: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  flow: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  heart: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  puzzle: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  expand: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  mobile: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  wrench: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', hover: 'hover:border-blue-500/50', gradient: 'from-blue-500/20' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', hover: 'hover:border-yellow-500/50', gradient: 'from-yellow-500/20' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', hover: 'hover:border-purple-500/50', gradient: 'from-purple-500/20' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', hover: 'hover:border-cyan-500/50', gradient: 'from-cyan-500/20' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', hover: 'hover:border-green-500/50', gradient: 'from-green-500/20' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', hover: 'hover:border-indigo-500/50', gradient: 'from-indigo-500/20' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', hover: 'hover:border-red-500/50', gradient: 'from-red-500/20' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', hover: 'hover:border-orange-500/50', gradient: 'from-orange-500/20' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30', hover: 'hover:border-teal-500/50', gradient: 'from-teal-500/20' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', hover: 'hover:border-pink-500/50', gradient: 'from-pink-500/20' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', hover: 'hover:border-emerald-500/50', gradient: 'from-emerald-500/20' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', hover: 'hover:border-violet-500/50', gradient: 'from-violet-500/20' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', hover: 'hover:border-amber-500/50', gradient: 'from-amber-500/20' },
};

// Hero documentation card for featured docs
function HeroDocCard({ doc, onClick }) {
  const colors = COLOR_CLASSES[doc.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onClick(doc.id)}
      className={clsx(
        'group cursor-pointer p-8 rounded-2xl border bg-gradient-to-br backdrop-blur-sm transition-all duration-300',
        colors.border,
        colors.hover,
        colors.gradient,
        'to-transparent hover:bg-white/10'
      )}
    >
      <div className="flex items-start gap-6">
        <div className={clsx(
          'w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0',
          colors.bg
        )}>
          <span className={colors.text}>
            {ICON_COMPONENTS[doc.icon]}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-2xl mb-2">{doc.title}</h3>
          <p className="text-gray-400 mb-4">{doc.description}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className={clsx('font-medium', colors.text)}>Read guide</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Standard document card
function DocCard({ doc, onClick, isPublic = false }) {
  const colors = COLOR_CLASSES[doc.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onClick(doc.id, isPublic)}
      className={clsx(
        'group cursor-pointer p-6 rounded-xl border bg-white/5 backdrop-blur-sm transition-all duration-300',
        colors.border,
        colors.hover,
        'hover:bg-white/10'
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className={clsx(
          'w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110',
          colors.bg
        )}>
          <span className={colors.text}>
            {ICON_COMPONENTS[doc.icon]}
          </span>
        </div>
        <h3 className="font-semibold text-white mb-2 text-lg">{doc.title}</h3>
        <p className="text-sm text-gray-400 line-clamp-2">{doc.description}</p>
      </div>
    </motion.div>
  );
}

// PDF document card
function PdfDocCard({ doc }) {
  const colors = COLOR_CLASSES[doc.color];

  return (
    <motion.a
      href={`/docs/pdf/${doc.file}`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={clsx(
        'group block p-5 rounded-xl border bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm transition-all duration-300',
        colors.border,
        colors.hover,
        'hover:bg-white/10'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0',
          colors.bg
        )}>
          <span className={colors.text}>
            {ICON_COMPONENTS[doc.icon]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">{doc.title}</h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/30 text-violet-300 shrink-0">PDF</span>
          </div>
          <p className="text-xs text-gray-400 line-clamp-1">{doc.description}</p>
        </div>
        <svg className="w-4 h-4 text-gray-500 group-hover:text-violet-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </motion.a>
  );
}

// Helper to resolve relative markdown links to doc IDs
function resolveDocLink(href, currentDocId, isPublic) {
  if (!href) return null;

  // External links - return as-is
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return { type: 'external', href };
  }

  // Absolute app routes (e.g., /roadmap, /signup)
  // But treat /docs/* paths as internal doc links
  if (href.startsWith('/') && !href.includes('.md')) {
    // Check if this is a /docs/docId link (with optional anchor)
    const docsMatch = href.match(/^\/docs\/([^#]+)(#.*)?$/);
    if (docsMatch) {
      const [, docIdFromPath, anchor] = docsMatch;
      // Check if this docId exists in our docs
      const isPublicDoc = PUBLIC_DOCS.some(d => d.id === docIdFromPath) || USER_GUIDES.some(d => d.id === docIdFromPath);
      const isTechDoc = TECH_DOCS.some(d => d.id === docIdFromPath);
      if (isPublicDoc || isTechDoc) {
        return { type: 'doc', id: docIdFromPath, isPublic: isPublicDoc, anchor: anchor?.slice(1) };
      }
    }
    return { type: 'route', href };
  }

  // Handle anchor links
  if (href.startsWith('#')) {
    return { type: 'anchor', href };
  }

  // Handle relative markdown links
  if (href.endsWith('.md') || href.includes('.md#')) {
    // Extract the path without anchor
    const [path, anchor] = href.split('#');

    // Map common relative paths to doc IDs
    const pathMappings = {
      // Public docs
      '../index.md': { id: null, isPublic: true }, // Go back to docs home
      './README.md': { id: currentDocId, isPublic },
      './getting-started/README.md': { id: 'getting-started', isPublic: true },
      './features/README.md': { id: 'features', isPublic: true },
      './community/README.md': { id: 'community', isPublic: true },
      './guides/README.md': { id: 'guides', isPublic: true },
      './api/README.md': { id: 'api', isPublic: true },
      '../getting-started/README.md': { id: 'getting-started', isPublic: true },
      '../features/README.md': { id: 'features', isPublic: true },
      '../community/README.md': { id: 'community', isPublic: true },
      '../guides/README.md': { id: 'guides', isPublic: true },
      '../api/README.md': { id: 'api', isPublic: true },
      // Sub-pages
      './onboarding-flow.md': { id: 'onboarding-flow', isPublic: true },
      './muscle-system.md': { id: 'muscle-system', isPublic: true },
      // Individual guides
      './first-week.md': { id: 'guide-first-week', isPublic: true },
      './dashboard.md': { id: 'guide-dashboard', isPublic: true },
      './logging-workouts.md': { id: 'guide-logging-workouts', isPublic: true },
      './tracking-progress.md': { id: 'guide-tracking-progress', isPublic: true },
      './rivalries.md': { id: 'guide-rivalries', isPublic: true },
      './crews.md': { id: 'guide-crews', isPublic: true },
      './advanced-features.md': { id: 'guide-advanced', isPublic: true },
      './troubleshooting.md': { id: 'guide-troubleshooting', isPublic: true },
    };

    const mapping = pathMappings[path];
    if (mapping) {
      return { type: 'doc', ...mapping, anchor };
    }

    // Try to extract doc ID from filename
    const filename = path.split('/').pop().replace('.md', '');
    if (filename && filename !== 'README' && filename !== 'index') {
      return { type: 'doc', id: filename, isPublic, anchor };
    }
  }

  return null;
}

// Document viewer component
function DocViewer({ docId, isPublic, onClose, onNavigate, initialAnchor, onAnchorScrolled }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const contentRef = React.useRef(null);

  const doc = isPublic
    ? PUBLIC_DOCS.find(d => d.id === docId) || USER_GUIDES.find(d => d.id === docId)
    : TECH_DOCS.find(d => d.id === docId);

  const colors = doc ? COLOR_CLASSES[doc.color] : COLOR_CLASSES.blue;

  useEffect(() => {
    async function loadDoc() {
      setLoading(true);
      setError(null);
      try {
        const path = isPublic
          ? doc?.path
          : `/docs-files/${docId}.md`;

        const response = await fetch(path);
        if (!response.ok) throw new Error('Document not found');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (doc) loadDoc();
  }, [docId, isPublic, doc]);

  // Scroll to anchor after content loads
  useEffect(() => {
    if (!loading && content && initialAnchor && contentRef.current) {
      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(() => {
        const anchor = initialAnchor.startsWith('#') ? initialAnchor : `#${initialAnchor}`;
        // Try to find the element by id (ReactMarkdown generates ids from headings)
        const targetId = anchor.slice(1).toLowerCase().replace(/\s+/g, '-');
        const element = contentRef.current.querySelector(`#${CSS.escape(targetId)}`) ||
                       contentRef.current.querySelector(`[id="${targetId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (onAnchorScrolled) onAnchorScrolled();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, content, initialAnchor, onAnchorScrolled]);

  // Handle link clicks within markdown
  const handleLinkClick = (e, href) => {
    const resolved = resolveDocLink(href, docId, isPublic);

    // Always prevent default for .md links to avoid broken navigation
    const isMdLink = href?.endsWith('.md') || href?.includes('.md#');
    if (isMdLink) {
      e.preventDefault();
    }

    if (!resolved) {
      // For unresolved .md links, try to extract ID from filename
      if (isMdLink) {
        const [path] = href.split('#');
        const filename = path.split('/').pop().replace('.md', '');
        if (filename && filename !== 'README' && filename !== 'index' && onNavigate) {
          // Try to find a matching guide by filename
          const guideId = `guide-${filename}`;
          onNavigate(guideId, true);
        }
      }
      return;
    }

    e.preventDefault();

    switch (resolved.type) {
      case 'external':
        window.open(resolved.href, '_blank', 'noopener,noreferrer');
        break;
      case 'route':
        onClose();
        navigate(resolved.href);
        break;
      case 'anchor':
        // Scroll to anchor within current doc
        const element = document.querySelector(resolved.href);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'doc':
        if (resolved.id === null) {
          // Navigate back to docs home
          onClose();
        } else if (onNavigate) {
          onNavigate(resolved.id, resolved.isPublic, resolved.anchor);
        }
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <div className="flex items-center gap-3">
            {doc && (
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colors.bg)}>
                <span className={colors.text}>
                  {ICON_COMPONENTS[doc.icon]}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{doc?.title || 'Document'}</h2>
              <p className="text-sm text-gray-400">{doc?.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <article className="prose prose-invert prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, node: _node }) => {
                    const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
                    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                    return <h1 id={id} className="text-3xl font-bold text-white mb-6 pb-3 border-b border-white/10">{children}</h1>;
                  },
                  h2: ({ children, node: _node }) => {
                    const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
                    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                    return <h2 id={id} className="text-2xl font-bold text-white mt-8 mb-4">{children}</h2>;
                  },
                  h3: ({ children, node: _node }) => {
                    const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
                    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                    return <h3 id={id} className="text-xl font-semibold text-gray-200 mt-6 mb-3">{children}</h3>;
                  },
                  h4: ({ children, node: _node }) => {
                    const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
                    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                    return <h4 id={id} className="text-lg font-semibold text-gray-300 mt-4 mb-2">{children}</h4>;
                  },
                  p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-300">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-300">{children}</li>,
                  code: ({ inline, children, className }) =>
                    inline ? (
                      <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 text-sm font-mono">{children}</code>
                    ) : (
                      <code className={clsx("block p-4 rounded-lg bg-black/50 text-sm font-mono overflow-x-auto text-gray-300", className)}>{children}</code>
                    ),
                  pre: ({ children }) => <pre className="mb-4 rounded-lg overflow-hidden">{children}</pre>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-violet-500 pl-4 py-2 my-4 bg-white/5 rounded-r-lg italic text-gray-400">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => {
                    const resolved = resolveDocLink(href, docId, isPublic);
                    const isExternal = resolved?.type === 'external';
                    const isInternal = resolved?.type === 'doc' || resolved?.type === 'route' || resolved?.type === 'anchor';
                    // Treat .md links as internal even if not in pathMappings
                    const isMdLink = href?.endsWith('.md') || href?.includes('.md#');

                    return (
                      <a
                        href={href}
                        onClick={(e) => (isInternal || isMdLink) ? handleLinkClick(e, href) : undefined}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className={clsx(
                          'underline transition-colors',
                          (isInternal || isMdLink) ? 'text-violet-400 hover:text-violet-300 cursor-pointer' : 'text-blue-400 hover:text-blue-300'
                        )}
                      >
                        {children}
                        {isExternal && (
                          <svg className="inline-block w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </a>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-white/10">{children}</thead>,
                  th: ({ children }) => <th className="px-4 py-2 text-left text-white font-semibold border-b border-white/10">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-2 text-gray-300 border-b border-white/5">{children}</td>,
                  hr: () => <hr className="my-8 border-white/10" />,
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper to find a document by ID across all doc arrays
function findDocById(id) {
  const publicDoc = PUBLIC_DOCS.find(d => d.id === id);
  if (publicDoc) return { doc: publicDoc, isPublic: true };

  const userGuide = USER_GUIDES.find(d => d.id === id);
  if (userGuide) return { doc: userGuide, isPublic: true };

  const techDoc = TECH_DOCS.find(d => d.id === id);
  if (techDoc) return { doc: techDoc, isPublic: false };

  return null;
}

// Main Docs page component
export default function Docs() {
  const { docId, '*': splatPath } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Use docId directly - the splat path is only for catching unknown routes
  // If we have a splat path, it means the URL didn't match a known doc route
  // In that case, show the docs index page
  const requestedDocId = splatPath ? null : docId;

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isPublicDoc, setIsPublicDoc] = useState(false);
  const [_activeTab, _setActiveTab] = useState('all');
  const [pendingAnchor, setPendingAnchor] = useState(null);

  useEffect(() => {
    if (requestedDocId) {
      const found = findDocById(requestedDocId);
      if (found) {
        setSelectedDoc(requestedDocId);
        setIsPublicDoc(found.isPublic);
        // Capture anchor from URL hash for scrolling after content loads
        if (location.hash) {
          setPendingAnchor(location.hash);
        }
      } else {
        // Unknown doc ID - show index page
        setSelectedDoc(null);
        setIsPublicDoc(false);
      }
    } else {
      // No doc ID or splat path - show index page
      setSelectedDoc(null);
      setIsPublicDoc(false);
    }
  }, [requestedDocId, location.hash]);

  const handleDocClick = (id, isPublic = false, anchor = null) => {
    setSelectedDoc(id);
    setIsPublicDoc(isPublic);
    setPendingAnchor(anchor ? `#${anchor}` : null);
    navigate(`/docs/${id}${anchor ? `#${anchor}` : ''}`, { replace: true });
  };

  const handleClose = () => {
    setSelectedDoc(null);
    setIsPublicDoc(false);
    setPendingAnchor(null);
    navigate('/docs', { replace: true });
  };

  // Dynamic SEO based on selected doc
  const seoTitle = selectedDoc
    ? `${selectedDoc.charAt(0).toUpperCase() + selectedDoc.slice(1).replace(/-/g, ' ')} - Documentation`
    : 'Documentation';
  const seoDescription = selectedDoc
    ? `MuscleMap documentation for ${selectedDoc.replace(/-/g, ' ')}. User guides, API reference, and feature documentation.`
    : 'Complete MuscleMap documentation. User guides, API reference, getting started tutorials, and feature documentation.';
  const breadcrumbs = getBreadcrumbSchema(
    selectedDoc
      ? [{ name: 'Home', path: '/' }, { name: 'Docs', path: '/docs' }, { name: selectedDoc, path: `/docs/${selectedDoc}` }]
      : [{ name: 'Home', path: '/' }, { name: 'Docs', path: '/docs' }]
  );

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} structuredData={breadcrumbs} />
    <div
      className="min-h-screen"
      style={{
        backgroundColor: '#0a0a0f',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.15), transparent 35%), radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.2), transparent 30%)',
        color: '#e5e7eb',
      }}
    >
      {/* Header */}
      <header className="w-full border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <RouterLink to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="MuscleMap" className="w-10 h-10 rounded-lg" />
            <span
              className="text-xl font-extrabold"
              style={{
                background: 'linear-gradient(90deg, #60a5fa 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MuscleMap
            </span>
          </RouterLink>

          <div className="flex items-center gap-3">
            <RouterLink
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-200 transition hover:text-white"
            >
              Log In
            </RouterLink>
            <RouterLink
              to="/signup"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              Sign Up
            </RouterLink>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1
            className="text-4xl md:text-5xl font-black mb-4"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #c7d2fe 50%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Documentation
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about MuscleMap - from getting started to advanced features.
          </p>
        </motion.div>

        {/* Visual Docs Atlas */}
        {FEATURE_FLAGS.ATLAS_ENABLED && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Visual Documentation Map</h2>
                  <p className="text-sm text-gray-400">Navigate documentation visually</p>
                </div>
              </div>
              <DocsAtlas height={320} showSearch={true} />
            </div>
          </motion.div>
        )}

        {/* Quick Start CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="relative rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">New to MuscleMap?</h2>
                  <p className="text-gray-400">Start with our Getting Started guide - you&apos;ll be tracking workouts in minutes.</p>
                </div>
              </div>
              <button
                onClick={() => handleDocClick('getting-started', true)}
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-400 transition-colors shadow-lg shadow-green-500/30"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Overview Guides Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Overview Guides</h2>
              <p className="text-sm text-gray-400">High-level guides for key areas of MuscleMap</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PUBLIC_DOCS.filter(d => d.category === 'user').map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <HeroDocCard doc={doc} onClick={(id) => handleDocClick(id, true)} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Step-by-Step User Guides Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Step-by-Step Tutorials</h2>
              <p className="text-sm text-gray-400">Detailed guides for specific tasks and features</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {USER_GUIDES.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.03 }}
              >
                <DocCard doc={doc} onClick={(id) => handleDocClick(id, true)} isPublic={true} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* PDF Documentation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Visual Documentation</h2>
              <p className="text-sm text-gray-400">Beautiful LaTeX-generated PDFs with diagrams</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PDF_DOCS.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <PdfDocCard doc={doc} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Developer Documentation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Developer Documentation</h2>
              <p className="text-sm text-gray-400">Technical docs for developers and integrations</p>
            </div>
          </div>

          {/* API Reference Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <HeroDocCard
              doc={PUBLIC_DOCS.find(d => d.id === 'api')}
              onClick={(id) => handleDocClick(id, true)}
            />
          </motion.div>

          {/* Technical Docs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {TECH_DOCS.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + index * 0.03 }}
              >
                <DocCard doc={doc} onClick={(id) => handleDocClick(id, false)} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Plain-Text Documentation Repository */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Plain-Text Documentation</h2>
              <p className="text-sm text-gray-400">Browsable markdown files - perfect for AI agents, terminal users, and low-bandwidth</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <a
                  href="/docs-plain/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Browse All</div>
                    <div className="text-xs text-gray-400">File index</div>
                  </div>
                </a>

                <a
                  href="/docs-plain/user-guide/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">User Guide</div>
                    <div className="text-xs text-gray-400">Getting started</div>
                  </div>
                </a>

                <a
                  href="/docs-plain/api-reference/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">API Reference</div>
                    <div className="text-xs text-gray-400">GraphQL &amp; REST</div>
                  </div>
                </a>

                <a
                  href="/docs-plain/machine-readable/openapi.yaml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/30 hover:bg-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">OpenAPI Spec</div>
                    <div className="text-xs text-gray-400">Machine-readable</div>
                  </div>
                </a>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-300">46 markdown files</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-300">ASCII diagrams</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-300">No JavaScript required</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-gray-300">Agent-friendly</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
        >
          <h3 className="text-xl font-bold text-white mb-2">Need more help?</h3>
          <p className="text-gray-400 mb-6">Can&apos;t find what you&apos;re looking for? We&apos;re here to help.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <RouterLink
              to="/roadmap"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              View Roadmap
            </RouterLink>
            <RouterLink
              to="/issues"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Report an Issue
            </RouterLink>
            <a
              href="https://github.com/jeanpaulniko/musclemap"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
          </div>
        </motion.div>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-12 text-center"
        >
          <RouterLink
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </RouterLink>
        </motion.div>
      </main>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <DocViewer
            docId={selectedDoc}
            isPublic={isPublicDoc}
            onClose={handleClose}
            onNavigate={handleDocClick}
            initialAnchor={pendingAnchor}
            onAnchorScrolled={() => setPendingAnchor(null)}
          />
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
