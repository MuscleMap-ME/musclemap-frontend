/**
 * My Issues Page
 *
 * User's submitted issues:
 * - View status of reported issues
 * - Track responses
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../store/authStore';
import { useUser } from '../contexts/UserContext';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  Comment: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  ChevronUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>,
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

function IssueRow({ issue }) {
  const navigate = useNavigate();
  const type = ISSUE_TYPES[issue.type] || ISSUE_TYPES[5];
  const status = ISSUE_STATUSES[issue.status] || ISSUE_STATUSES[0];

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hover:bg-gray-800/30 cursor-pointer transition-colors"
      onClick={() => navigate(`/issues/${issue.issueNumber}`)}
    >
      <td className="px-4 py-3">
        <span className="text-gray-500">#{issue.issueNumber}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${type.color}`}>
            {type.icon}
          </span>
          <span className="font-medium text-white truncate max-w-[300px]">
            {issue.title}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="flex items-center justify-center gap-1 text-gray-400">
          <Icons.ChevronUp />
          {issue.voteCount}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="flex items-center justify-center gap-1 text-gray-400">
          <Icons.Comment />
          {issue.commentCount}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-500">
        {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
      </td>
    </motion.tr>
  );
}

export default function MyIssues() {
  const { token } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchIssues();
  }, [token, filter, page]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'open') params.set('status', '0');
      else if (filter === 'resolved') params.set('status', '3');
      else if (filter === 'closed') params.set('status', '4');
      params.set('limit', limit.toString());
      params.set('offset', (page * limit).toString());

      const res = await fetch(`/api/me/issues?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIssues(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const openCount = issues.filter(i => i.status === 0).length;
  const resolvedCount = issues.filter(i => i.status === 3 || i.status === 4).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/issues"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">📋</span>
              <span>My Issues</span>
            </h1>

            <Link
              to="/issues/new"
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Icons.Plus />
              <span className="hidden sm:inline">New Issue</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-sm text-gray-400">Total Submitted</div>
          </div>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 text-center">
            <div className="text-2xl font-bold text-green-400">{openCount}</div>
            <div className="text-sm text-gray-400">Open</div>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 text-center">
            <div className="text-2xl font-bold text-emerald-400">{resolvedCount}</div>
            <div className="text-sm text-gray-400">Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'open', 'resolved', 'closed'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Issues Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading your issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl">
            <p className="text-4xl mb-4">📭</p>
            <h3 className="text-lg font-semibold text-white mb-2">No issues found</h3>
            <p className="text-gray-400 mb-4">
              {filter === 'all'
                ? "You haven't submitted any issues yet."
                : `No ${filter} issues found.`}
            </p>
            <Link
              to="/issues/new"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Icons.Plus />
              Create Issue
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50 text-left">
                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">#</th>
                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Title</th>
                    <th className="px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-xs text-gray-400 font-medium text-center">Votes</th>
                    <th className="px-4 py-3 text-xs text-gray-400 font-medium text-center">Comments</th>
                    <th className="px-4 py-3 text-xs text-gray-400 font-medium text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {issues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center gap-2 mt-6">
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
