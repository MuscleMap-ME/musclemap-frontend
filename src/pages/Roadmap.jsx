/**
 * Roadmap Page
 *
 * Public roadmap showing:
 * - Planned features
 * - In progress work
 * - Completed features
 * - Voting on priorities
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../store/authStore';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { RoadmapAtlas } from '../components/atlas';
import SEO, { getBreadcrumbSchema } from '../components/SEO';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  ChevronUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
};

const ROADMAP_STATUSES = {
  0: { label: 'Planned', color: 'bg-gray-500', icon: '📋' },
  1: { label: 'In Progress', color: 'bg-blue-500', icon: '🚧' },
  2: { label: 'Completed', color: 'bg-green-500', icon: '✅' },
  3: { label: 'Paused', color: 'bg-yellow-500', icon: '⏸️' },
  4: { label: 'Cancelled', color: 'bg-red-500', icon: '❌' },
};

const CATEGORY_ICONS = {
  'Feature': '✨',
  'Performance': '⚡',
  'UI/UX': '🎨',
  'Infrastructure': '🏗️',
  'Mobile': '📱',
  'Security': '🔒',
  'Integration': '🔌',
};

function RoadmapCard({ item, onVote, votingId }) {
  const navigate = useNavigate();
  const status = ROADMAP_STATUSES[item.status] || ROADMAP_STATUSES[0];
  const categoryIcon = CATEGORY_ICONS[item.category] || '📦';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
    >
      <div className="flex gap-3">
        {/* Vote button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => onVote(item.id)}
            disabled={votingId === item.id}
            className={`flex flex-col items-center justify-center w-12 h-14 rounded-lg transition-colors ${
              item.hasVoted
                ? 'bg-purple-600/30 text-purple-400'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Icons.ChevronUp />
            <span className="text-sm font-semibold">{item.voteCount}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}/20 text-white`}>
              {status.icon} {status.label}
            </span>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                {categoryIcon} {item.category}
              </span>
            )}
            {item.quarter && (
              <span className="text-xs text-gray-500">{item.quarter}</span>
            )}
          </div>

          <h3 className="font-semibold text-white mb-1">{item.title}</h3>
          {item.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
          )}

          {/* Progress bar */}
          {item.status === 1 && item.progress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Related issues */}
          {item.relatedIssueIds && item.relatedIssueIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {item.relatedIssueIds.slice(0, 3).map((issueId) => (
                <Link
                  key={issueId}
                  to={`/issues/${issueId}`}
                  className="text-xs px-2 py-0.5 bg-gray-700/50 rounded text-purple-400 hover:text-purple-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{issueId}
                </Link>
              ))}
              {item.relatedIssueIds.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.relatedIssueIds.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Completion date */}
          {item.completedAt && (
            <p className="text-xs text-green-400 mt-2">
              Completed {format(new Date(item.completedAt), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RoadmapColumn({ title, icon, items, onVote, votingId, emptyMessage }) {
  return (
    <div className="flex-1 min-w-[300px]">
      <div className="sticky top-20 bg-gray-900 pb-3 z-10">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          {title}
          <span className="text-sm text-gray-500 font-normal">({items.length})</span>
        </h2>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-gray-800/30 rounded-xl p-6 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          items.map((item) => (
            <RoadmapCard
              key={item.id}
              item={item}
              onVote={onVote}
              votingId={votingId}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Roadmap() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [view, setView] = useState('board'); // 'board' or 'list'

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/roadmap', { headers });
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (itemId) => {
    if (!token) {
      navigate('/login');
      return;
    }

    setVotingId(itemId);
    try {
      const res = await fetch(`/api/roadmap/${itemId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.data) {
        setItems(items.map(item =>
          item.id === itemId
            ? { ...item, hasVoted: data.data.voted, voteCount: data.data.voteCount }
            : item
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVotingId(null);
    }
  };

  // Group items by status
  const planned = items.filter(i => i.status === 0).sort((a, b) => b.voteCount - a.voteCount);
  const inProgress = items.filter(i => i.status === 1).sort((a, b) => b.progress - a.progress);
  const completed = items.filter(i => i.status === 2).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  // Breadcrumb structured data
  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Roadmap', path: '/roadmap' },
  ]);

  return (
    <>
      <SEO
        title="Roadmap"
        description="MuscleMap development roadmap. Upcoming features, planned improvements, and long-term vision for the fitness tracking platform."
        structuredData={breadcrumbs}
      />
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/issues"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              <span>Product Roadmap</span>
            </h1>

            <div className="flex gap-2">
              <button
                onClick={() => setView('board')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  view === 'board' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  view === 'list' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Description */}
      <div className="bg-gray-800/50 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-gray-400 text-center">
            Vote on features you want to see! Your feedback helps prioritize what we build next.
          </p>
        </div>
      </div>

      {/* Visual Roadmap Atlas */}
      {FEATURE_FLAGS.ATLAS_ENABLED && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🗺️</span>
              <div>
                <h2 className="text-lg font-semibold text-white">Feature Timeline</h2>
                <p className="text-sm text-gray-400">Visual overview of completed and upcoming features</p>
              </div>
            </div>
            <RoadmapAtlas />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading roadmap...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl">
            <p className="text-4xl mb-4">🗺️</p>
            <h3 className="text-lg font-semibold text-white mb-2">Roadmap coming soon</h3>
            <p className="text-gray-400">
              Check back later to see our planned features and vote on priorities.
            </p>
          </div>
        ) : view === 'board' ? (
          <div className="flex gap-6 overflow-x-auto pb-4">
            <RoadmapColumn
              title="Planned"
              icon="📋"
              items={planned}
              onVote={handleVote}
              votingId={votingId}
              emptyMessage="Nothing planned yet"
            />
            <RoadmapColumn
              title="In Progress"
              icon="🚧"
              items={inProgress}
              onVote={handleVote}
              votingId={votingId}
              emptyMessage="Nothing in progress"
            />
            <RoadmapColumn
              title="Completed"
              icon="✅"
              items={completed}
              onVote={handleVote}
              votingId={votingId}
              emptyMessage="Nothing completed yet"
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* In Progress Section */}
            {inProgress.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🚧</span> In Progress
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {inProgress.map((item) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      onVote={handleVote}
                      votingId={votingId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Planned Section */}
            {planned.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📋</span> Planned
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {planned.map((item) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      onVote={handleVote}
                      votingId={votingId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Section */}
            {completed.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>✅</span> Completed
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {completed.map((item) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      onVote={handleVote}
                      votingId={votingId}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
