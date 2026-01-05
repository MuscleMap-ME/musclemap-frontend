import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';

// Document metadata with icons and descriptions
const DOCS = [
  {
    id: 'USER_GUIDE',
    title: 'User Guide',
    description: 'Getting started, dashboard, workouts, and progression',
    icon: 'book',
    color: 'blue'
  },
  {
    id: 'FEATURES',
    title: 'Features',
    description: 'Complete list of MuscleMap capabilities',
    icon: 'star',
    color: 'yellow'
  },
  {
    id: 'ARCHITECTURE',
    title: 'Architecture',
    description: 'System design and tech stack overview',
    icon: 'cube',
    color: 'purple'
  },
  {
    id: 'API_REFERENCE',
    title: 'API Reference',
    description: 'Complete REST API endpoint documentation',
    icon: 'code',
    color: 'cyan'
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
    id: 'BIOMETRICS',
    title: 'Biometrics',
    description: 'Body metrics and tracking documentation',
    icon: 'heart',
    color: 'red'
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
    id: 'NATIVE_EXTENSIONS',
    title: 'Native Extensions',
    description: 'Building native platform extensions',
    icon: 'mobile',
    color: 'pink'
  },
  {
    id: 'SECURITY',
    title: 'Security',
    description: 'Security best practices and considerations',
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
  {
    id: 'REFACTOR_PLAN',
    title: 'Refactor Plan',
    description: 'Planned improvements and refactoring',
    icon: 'wrench',
    color: 'amber'
  },
];

const ICON_COMPONENTS = {
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
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', hover: 'hover:border-blue-500/50' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', hover: 'hover:border-yellow-500/50' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', hover: 'hover:border-purple-500/50' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', hover: 'hover:border-cyan-500/50' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', hover: 'hover:border-green-500/50' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', hover: 'hover:border-indigo-500/50' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', hover: 'hover:border-red-500/50' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', hover: 'hover:border-orange-500/50' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30', hover: 'hover:border-teal-500/50' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30', hover: 'hover:border-pink-500/50' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', hover: 'hover:border-emerald-500/50' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', hover: 'hover:border-violet-500/50' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', hover: 'hover:border-amber-500/50' },
};

// Document card component
function DocCard({ doc, onClick }) {
  const colors = COLOR_CLASSES[doc.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onClick(doc.id)}
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

        {/* Action buttons */}
        <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(doc.id);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            Read
          </button>
          <a
            href={`/docs-files/${doc.id}.md`}
            download={`${doc.id}.md`}
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            Download
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// Document viewer component
function DocViewer({ docId, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const doc = DOCS.find(d => d.id === docId);
  const colors = doc ? COLOR_CLASSES[doc.color] : COLOR_CLASSES.blue;

  useEffect(() => {
    async function loadDoc() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/docs-files/${docId}.md`);
        if (!response.ok) throw new Error('Document not found');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDoc();
  }, [docId]);

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
        <div className={clsx(
          'flex items-center justify-between px-6 py-4 border-b border-white/10',
          'bg-gradient-to-r from-white/5 to-transparent'
        )}>
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

          <div className="flex items-center gap-2">
            <a
              href={`/docs-files/${docId}.md`}
              download={`${docId}.md`}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <a
              href={`/docs-files/${docId}.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
              title="Open in new tab"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
                  h1: ({ children }) => <h1 className="text-3xl font-bold text-white mb-6 pb-3 border-b border-white/10">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-200 mt-6 mb-3">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-lg font-semibold text-gray-300 mt-4 mb-2">{children}</h4>,
                  p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-300">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-300">{children}</li>,
                  code: ({ inline, children, className }) =>
                    inline ? (
                      <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 text-sm font-mono">{children}</code>
                    ) : (
                      <code className={clsx("block p-4 rounded-lg bg-black/50 text-sm font-mono overflow-x-auto", className)}>{children}</code>
                    ),
                  pre: ({ children }) => <pre className="mb-4 rounded-lg overflow-hidden">{children}</pre>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-violet-500 pl-4 py-2 my-4 bg-white/5 rounded-r-lg italic text-gray-400">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-white/10">{children}</thead>,
                  th: ({ children }) => <th className="px-4 py-2 text-left text-white font-semibold border-b border-white/10">{children}</th>,
                  td: ({ children }) => <td className="px-4 py-2 text-gray-300 border-b border-white/5">{children}</td>,
                  hr: () => <hr className="my-8 border-white/10" />,
                  img: ({ src, alt }) => (
                    <img src={src} alt={alt} className="rounded-lg max-w-full h-auto my-4" />
                  ),
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

// Main Docs page component
export default function Docs() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState(docId || null);

  useEffect(() => {
    if (docId) {
      setSelectedDoc(docId);
    }
  }, [docId]);

  const handleDocClick = (id) => {
    setSelectedDoc(id);
    navigate(`/docs/${id}`, { replace: true });
  };

  const handleClose = () => {
    setSelectedDoc(null);
    navigate('/docs', { replace: true });
  };

  return (
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
          className="text-center mb-12"
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
            Explore our comprehensive documentation to learn about MuscleMap's features, architecture, and how to get started.
          </p>
        </motion.div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DOCS.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DocCard doc={doc} onClick={handleDocClick} />
            </motion.div>
          ))}
        </div>

        {/* Back to home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
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
          <DocViewer docId={selectedDoc} onClose={handleClose} />
        )}
      </AnimatePresence>
    </div>
  );
}
