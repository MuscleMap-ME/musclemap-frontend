/**
 * Issues Page
 *
 * Bug and issue tracker with:
 * - Issue listing with filters
 * - Search functionality
 * - Voting system
 * - Status badges
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../store/authStore';
import { useUser } from '../contexts/UserContext';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  ChevronUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>,
  Comment: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  Pin: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>,
  Lock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
};

const ISSUE_TYPES = {
  0: { label: 'Bug', color: 'bg-red-500/20 text-red-400', icon: '🐛' },
  1: { label: 'Feature', color: 'bg-green-500/20 text-green-400', icon: '✨' },
  2: { label: 'Enhancement', color: 'bg-blue-500/20 text-blue-400', icon: '💡' },
  3: { label: 'Account', color: 'bg-orange-500/20 text-orange-400', icon: '👤' },
  4: { label: 'Question', color: 'bg-pink-500/20 text-pink-400', icon: '❓' },
  5: { label: 'Other', color: 'bg-gray-500/20 text-gray-400', icon: '📝' },
};

const ISSUE_STATUSES = {
  0: { label: 'Open', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  1: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  2: { label: 'Under Review', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  3: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  4: { label: 'Closed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  5: { label: "Won't Fix", color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  6: { label: 'Duplicate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const PRIORITY_COLORS = {
  0: 'border-l-gray-500',
  1: 'border-l-blue-500',
  2: 'border-l-orange-500',
  3: 'border-l-red-500',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'votes', label: 'Most Voted' },
  { value: 'comments', label: 'Most Comments' },
  { value: 'updated', label: 'Recently Updated' },
];

function IssueCard({ issue, onVote, votingId }) {
  const navigate = useNavigate();
  const type = ISSUE_TYPES[issue.type] || ISSUE_TYPES[5];
  const status = ISSUE_STATUSES[issue.status] || ISSUE_STATUSES[0];
  const priorityColor = PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/30 transition-all cursor-pointer border-l-4 ${priorityColor}`}
      onClick={() => navigate(`/issues/${issue.issueNumber}`)}
    >
      <div className="flex gap-3">
        {/* Vote button */}
        <div className="flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote(issue.id);
            }}
            disabled={votingId === issue.id}
            className={`flex flex-col items-center justify-center w-12 h-16 rounded-lg transition-colors ${
              issue.hasVoted
                ? 'bg-purple-600/30 text-purple-400'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Icons.ChevronUp />
            <span className="text-sm font-semibold">{issue.voteCount}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {issue.isPinned && (
                <span className="text-yellow-400" title="Pinned">
                  <Icons.Pin />
                </span>
              )}
              {issue.isLocked && (
                <span className="text-gray-400" title="Locked">
                  <Icons.Lock />
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${type.color}`}>
                {type.icon} {type.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
                {status.label}
              </span>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              #{issue.issueNumber}
            </span>
          </div>

          <h3 className="font-semibold text-white mb-1 line-clamp-1">{issue.title}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">{issue.description}</p>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${label.color}20`, color: label.color }}
                >
                  {label.icon} {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              by <span className="text-gray-400">{issue.authorUsername || 'Unknown'}</span>
            </span>
            <span>{formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
            <span className="flex items-center gap-1">
              <Icons.Comment />
              {issue.commentCount}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FilterSidebar({ filters, setFilters, labels, stats }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <h3 className="font-semibold text-white mb-3">Statistics</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-700/30 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-white">{stats.totalIssues || 0}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-green-400">{stats.openIssues || 0}</div>
            <div className="text-xs text-gray-400">Open</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-emerald-400">{stats.resolvedIssues || 0}</div>
            <div className="text-xs text-gray-400">Resolved</div>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-purple-400">{stats.totalVotes || 0}</div>
            <div className="text-xs text-gray-400">Votes</div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <h3 className="font-semibold text-white mb-3">Status</h3>
        <div className="space-y-1">
          <button
            onClick={() => setFilters({ ...filters, status: undefined })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              filters.status === undefined ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Statuses
          </button>
          {Object.entries(ISSUE_STATUSES).map(([value, { label, color: _color }]) => (
            <button
              key={value}
              onClick={() => setFilters({ ...filters, status: parseInt(value) })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.status === parseInt(value) ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <h3 className="font-semibold text-white mb-3">Type</h3>
        <div className="space-y-1">
          <button
            onClick={() => setFilters({ ...filters, type: undefined })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              filters.type === undefined ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Types
          </button>
          {Object.entries(ISSUE_TYPES).map(([value, { label, icon }]) => (
            <button
              key={value}
              onClick={() => setFilters({ ...filters, type: parseInt(value) })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.type === parseInt(value) ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Labels Filter */}
      {labels.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <h3 className="font-semibold text-white mb-3">Labels</h3>
          <div className="space-y-1">
            <button
              onClick={() => setFilters({ ...filters, labelSlug: undefined })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !filters.labelSlug ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Labels
            </button>
            {labels.map((label) => (
              <button
                key={label.slug}
                onClick={() => setFilters({ ...filters, labelSlug: label.slug })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  filters.labelSlug === label.slug ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Issues() {
  const { token } = useAuth();
  const { user: _user } = useUser();
  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();

  const [issues, setIssues] = useState([]);
  const [labels, setLabels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [votingId, setVotingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    status: searchParams.get('status') ? parseInt(searchParams.get('status')) : undefined,
    type: searchParams.get('type') ? parseInt(searchParams.get('type')) : undefined,
    labelSlug: searchParams.get('label') || undefined,
    search: searchParams.get('q') || '',
    sortBy: searchParams.get('sort') || 'newest',
    offset: 0,
    limit: 20,
  });

  // Fetch labels and stats on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/issues/labels').then(r => r.json()),
      fetch('/api/issues/stats').then(r => r.json()),
    ]).then(([labelsRes, statsRes]) => {
      setLabels(labelsRes.data || []);
      setStats(statsRes.data || {});
    }).catch(console.error);
  }, []);

  // Fetch issues when filters change
  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.type, filters.labelSlug, filters.search, filters.sortBy, filters.offset]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== undefined) params.set('status', filters.status.toString());
      if (filters.type !== undefined) params.set('type', filters.type.toString());
      if (filters.labelSlug) params.set('labelSlug', filters.labelSlug);
      if (filters.search) params.set('search', filters.search);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      params.set('limit', filters.limit.toString());
      params.set('offset', filters.offset.toString());

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/issues?${params}`, { headers });
      const data = await res.json();

      setIssues(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (issueId) => {
    if (!token) {
      navigate('/login');
      return;
    }

    setVotingId(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.data) {
        setIssues(issues.map(issue =>
          issue.id === issueId
            ? { ...issue, hasVoted: data.data.voted, voteCount: data.data.voteCount }
            : issue
        ));
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setVotingId(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, offset: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🐛</span>
              <span>Issues & Feedback</span>
            </h1>

            {user && (
              <Link
                to="/issues/new"
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Icons.Plus />
                <span className="hidden sm:inline">New Issue</span>
              </Link>
            )}
            {!user && <div className="w-24" />}
          </div>
        </div>
      </header>

      {/* Quick Links */}
      <div className="bg-gray-800/50 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link
              to="/updates"
              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium text-blue-400 transition-colors"
            >
              📢 Dev Updates
            </Link>
            <Link
              to="/roadmap"
              className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium text-green-400 transition-colors"
            >
              🗺️ Roadmap
            </Link>
            {user && (
              <Link
                to="/my-issues"
                className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium text-purple-400 transition-colors"
              >
                📋 My Issues
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar
              filters={filters}
              setFilters={(f) => setFilters({ ...f, offset: 0 })}
              labels={labels}
              stats={stats}
            />
          </aside>

          {/* Main Area */}
          <div className="flex-1 min-w-0">
            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Icons.Search />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icons.Search />
                  </div>
                </div>
              </form>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white"
                >
                  <Icons.Filter />
                  Filters
                </button>

                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value, offset: 0 })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden mb-6 overflow-hidden"
                >
                  <FilterSidebar
                    filters={filters}
                    setFilters={(f) => {
                      setFilters({ ...f, offset: 0 });
                      setShowFilters(false);
                    }}
                    labels={labels}
                    stats={stats}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Count */}
            <div className="text-sm text-gray-400 mb-4">
              {loading ? 'Loading...' : `${total} issue${total !== 1 ? 's' : ''} found`}
            </div>

            {/* Issues List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading issues...</p>
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl">
                  <p className="text-4xl mb-4">🔍</p>
                  <h3 className="text-lg font-semibold text-white mb-2">No issues found</h3>
                  <p className="text-gray-400 mb-4">
                    {filters.search
                      ? 'Try adjusting your search or filters'
                      : 'Be the first to report an issue!'}
                  </p>
                  {user && (
                    <Link
                      to="/issues/new"
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Icons.Plus />
                      Create Issue
                    </Link>
                  )}
                </div>
              ) : (
                <AnimatePresence>
                  {issues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onVote={handleVote}
                      votingId={votingId}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Pagination */}
            {total > filters.limit && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                  disabled={filters.offset === 0}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-400">
                  Page {Math.floor(filters.offset / filters.limit) + 1} of {Math.ceil(total / filters.limit)}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                  disabled={filters.offset + filters.limit >= total}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
