/**
 * Admin Issues Page
 *
 * Admin dashboard for managing issues:
 * - View all issues (including private)
 * - Change status, priority, assignee
 * - Bulk actions
 * - Create dev updates
 * - Manage roadmap
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../store/authStore';
import { useUser } from '../contexts/UserContext';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  ChevronDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>,
};

const ISSUE_TYPES = {
  0: { label: 'Bug', color: 'text-red-400' },
  1: { label: 'Feature', color: 'text-green-400' },
  2: { label: 'Enhancement', color: 'text-blue-400' },
  3: { label: 'Account', color: 'text-orange-400' },
  4: { label: 'Question', color: 'text-pink-400' },
  5: { label: 'Other', color: 'text-gray-400' },
};

const ISSUE_STATUSES = {
  0: { label: 'Open', color: 'bg-green-500' },
  1: { label: 'In Progress', color: 'bg-blue-500' },
  2: { label: 'Under Review', color: 'bg-purple-500' },
  3: { label: 'Resolved', color: 'bg-emerald-500' },
  4: { label: 'Closed', color: 'bg-gray-500' },
  5: { label: "Won't Fix", color: 'bg-red-500' },
  6: { label: 'Duplicate', color: 'bg-yellow-500' },
};

const PRIORITIES = {
  0: { label: 'Low', color: 'text-gray-400' },
  1: { label: 'Medium', color: 'text-blue-400' },
  2: { label: 'High', color: 'text-orange-400' },
  3: { label: 'Critical', color: 'text-red-400' },
};

const UPDATE_TYPES = [
  { value: 0, label: 'Update' },
  { value: 1, label: 'Release' },
  { value: 2, label: 'Announcement' },
  { value: 3, label: 'Bug Fix' },
  { value: 4, label: 'Maintenance' },
];

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = ISSUE_STATUSES[value] || ISSUE_STATUSES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
      >
        <span className={`w-2 h-2 rounded-full ${current.color}`} />
        {current.label}
        <Icons.ChevronDown />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[140px]">
          {Object.entries(ISSUE_STATUSES).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => { onChange(parseInt(key)); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = PRIORITIES[value] || PRIORITIES[1];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 ${current.color}`}
      >
        {current.label}
        <Icons.ChevronDown />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[100px]">
          {Object.entries(PRIORITIES).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => { onChange(parseInt(key)); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, selected, onSelect, onUpdate }) {
  const navigate = useNavigate();
  const type = ISSUE_TYPES[issue.type] || ISSUE_TYPES[5];

  const handleStatusChange = async (newStatus) => {
    onUpdate(issue.id, { status: newStatus });
  };

  const handlePriorityChange = async (newPriority) => {
    onUpdate(issue.id, { priority: newPriority });
  };

  return (
    <tr className="hover:bg-gray-800/30 border-b border-gray-700/50">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(issue.id)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500"
        />
      </td>
      <td className="px-3 py-3">
        <span className="text-gray-500 text-sm">#{issue.issue_number}</span>
      </td>
      <td className="px-3 py-3">
        <button
          onClick={() => navigate(`/issues/${issue.issue_number}`)}
          className="text-white hover:text-purple-400 font-medium text-left truncate max-w-[250px] block"
        >
          {issue.title}
        </button>
        <span className={`text-xs ${type.color}`}>{type.label}</span>
      </td>
      <td className="px-3 py-3">
        <StatusDropdown value={issue.status} onChange={handleStatusChange} />
      </td>
      <td className="px-3 py-3">
        <PriorityDropdown value={issue.priority} onChange={handlePriorityChange} />
      </td>
      <td className="px-3 py-3 text-sm text-gray-400">
        {issue.author_username || 'Unknown'}
      </td>
      <td className="px-3 py-3 text-center text-sm text-gray-400">
        {issue.vote_count}
      </td>
      <td className="px-3 py-3 text-center text-sm text-gray-400">
        {issue.comment_count}
      </td>
      <td className="px-3 py-3 text-sm text-gray-500 text-right">
        {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
      </td>
    </tr>
  );
}

function CreateUpdateModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 0,
    isPublished: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
    onClose();
    setForm({ title: '', content: '', type: 0, isPublished: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">Create Dev Update</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: parseInt(e.target.value) })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              {UPDATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
              required
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500"
            />
            <span className="text-sm text-gray-300">Publish immediately</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Update'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CreateRoadmapModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 0,
    quarter: '',
    category: '',
    progress: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
    onClose();
    setForm({ title: '', description: '', status: 0, quarter: '', category: '', progress: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">Add Roadmap Item</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value={0}>Planned</option>
                <option value={1}>In Progress</option>
                <option value={2}>Completed</option>
                <option value={3}>Paused</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quarter</label>
              <input
                type="text"
                value={form.quarter}
                onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                placeholder="Q1 2024"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Feature, Performance..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Progress %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Add to Roadmap'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminIssues() {
  const { token } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState({ status: undefined });
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const limit = 25;

  // Check admin access
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user && !user.is_admin && !user.roles?.includes('admin')) {
      navigate('/dashboard');
    }
  }, [token, user, navigate]);

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status !== undefined) params.set('status', filter.status.toString());
      params.set('limit', limit.toString());
      params.set('offset', (page * limit).toString());

      const res = await fetch(`/api/admin/issues?${params}`, {
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

  const handleSelect = (issueId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelected(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(issues.map(i => i.id)));
    }
  };

  const handleUpdate = async (issueId, update) => {
    try {
      await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(update),
      });
      // Refresh the list
      fetchIssues();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkUpdate = async (update) => {
    if (selected.size === 0) return;

    try {
      await fetch('/api/admin/issues/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issueIds: Array.from(selected),
          update,
        }),
      });
      setSelected(new Set());
      fetchIssues();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUpdate = async (data) => {
    try {
      await fetch('/api/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoadmap = async (data) => {
    try {
      await fetch('/api/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/admin-control"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <h1 className="text-xl font-bold">Issue Management</h1>

            <div className="flex gap-2">
              <button
                onClick={() => setShowUpdateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Icons.Plus /> Update
              </button>
              <button
                onClick={() => setShowRoadmapModal(true)}
                className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Icons.Plus /> Roadmap
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters & Bulk Actions */}
      <div className="bg-gray-800/50 border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => { setFilter({ status: undefined }); setPage(0); }}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter.status === undefined ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                All
              </button>
              {Object.entries(ISSUE_STATUSES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => { setFilter({ status: parseInt(key) }); setPage(0); }}
                  className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap ${
                    filter.status === parseInt(key) ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{selected.size} selected</span>
                <button
                  onClick={() => handleBulkUpdate({ status: 1 })}
                  className="px-3 py-1 bg-blue-600 rounded-lg text-sm"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleBulkUpdate({ status: 3 })}
                  className="px-3 py-1 bg-green-600 rounded-lg text-sm"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleBulkUpdate({ status: 4 })}
                  className="px-3 py-1 bg-gray-600 rounded-lg text-sm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading issues...</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800/50 text-left text-xs text-gray-400 font-medium">
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === issues.length && issues.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500"
                        />
                      </th>
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">Issue</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Priority</th>
                      <th className="px-3 py-3">Author</th>
                      <th className="px-3 py-3 text-center">Votes</th>
                      <th className="px-3 py-3 text-center">Comments</th>
                      <th className="px-3 py-3 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        selected={selected.has(issue.id)}
                        onSelect={handleSelect}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-400">
                  Page {page + 1} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreateUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSubmit={handleCreateUpdate}
      />
      <CreateRoadmapModal
        isOpen={showRoadmapModal}
        onClose={() => setShowRoadmapModal(false)}
        onSubmit={handleCreateRoadmap}
      />
    </div>
  );
}
