/**
 * Dev Updates Page
 *
 * Development updates, announcements, and changelog:
 * - Release notes
 * - Bug fixes
 * - Feature announcements
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
};

const UPDATE_TYPES = {
  0: { label: 'Update', color: 'bg-blue-500', icon: '📢' },
  1: { label: 'Release', color: 'bg-green-500', icon: '🚀' },
  2: { label: 'Announcement', color: 'bg-purple-500', icon: '📣' },
  3: { label: 'Bug Fix', color: 'bg-orange-500', icon: '🔧' },
  4: { label: 'Maintenance', color: 'bg-gray-500', icon: '🛠️' },
};

function UpdateCard({ update }) {
  const type = UPDATE_TYPES[update.type] || UPDATE_TYPES[0];
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-full ${type.color} flex items-center justify-center text-xl`}>
              {type.icon}
            </span>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${type.color}/20 text-white/80`}>
                {type.label}
              </span>
              <h3 className="font-semibold text-white text-lg mt-1">{update.title}</h3>
            </div>
          </div>
          <time className="text-sm text-gray-500 whitespace-nowrap">
            {update.publishedAt
              ? format(new Date(update.publishedAt), 'MMM d, yyyy')
              : formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
          </time>
        </div>

        {/* Content */}
        <div
          className={`prose prose-invert prose-sm max-w-none ${
            !expanded && update.content.length > 300 ? 'line-clamp-4' : ''
          }`}
        >
          <p className="text-gray-300 whitespace-pre-wrap">{update.content}</p>
        </div>

        {update.content.length > 300 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-purple-400 hover:text-purple-300 text-sm mt-2"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Related Issues */}
      {update.relatedIssueIds && update.relatedIssueIds.length > 0 && (
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 mb-2">Related Issues:</p>
          <div className="flex flex-wrap gap-2">
            {update.relatedIssueIds.map((issueId) => (
              <Link
                key={issueId}
                to={`/issues/${issueId}`}
                className="text-xs px-2 py-1 bg-gray-700/50 rounded text-purple-400 hover:text-purple-300"
              >
                #{issueId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-800/30 border-t border-gray-700/50 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          by {update.authorDisplayName || update.authorUsername || 'Team'}
        </span>
        <span className="text-sm text-gray-500">{update.viewCount} views</span>
      </div>
    </motion.article>
  );
}

export default function DevUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      params.set('limit', limit.toString());
      params.set('offset', (page * limit).toString());

      const res = await fetch(`/api/updates?${params}`);
      const data = await res.json();
      setUpdates(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/issues"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">📢</span>
              <span>Development Updates</span>
            </h1>

            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-gray-800/50 border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => { setFilter('all'); setPage(0); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Updates
            </button>
            {Object.entries(UPDATE_TYPES).map(([value, { label, icon }]) => (
              <button
                key={value}
                onClick={() => { setFilter(value); setPage(0); }}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Updates List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading updates...</p>
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl">
              <p className="text-4xl mb-4">📭</p>
              <h3 className="text-lg font-semibold text-white mb-2">No updates yet</h3>
              <p className="text-gray-400">
                Check back soon for development updates and announcements.
              </p>
            </div>
          ) : (
            updates.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page + 1} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
