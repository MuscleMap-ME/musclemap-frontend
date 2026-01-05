/**
 * New Issue Page
 *
 * Create a new bug report, feature request, or other issue:
 * - Form with validation
 * - Auto-capture browser/device info
 * - Screenshot upload
 * - Label selection
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { useUser } from '../contexts/UserContext';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Info: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
};

const ISSUE_TYPES = [
  { value: 0, label: 'Bug Report', icon: '🐛', description: 'Something is broken or not working correctly' },
  { value: 1, label: 'Feature Request', icon: '✨', description: 'Suggest a new feature or functionality' },
  { value: 2, label: 'Enhancement', icon: '💡', description: 'Improve an existing feature' },
  { value: 3, label: 'Account Issue', icon: '👤', description: 'Problems with your account or settings' },
  { value: 4, label: 'Question', icon: '❓', description: 'General questions or need help' },
  { value: 5, label: 'Other', icon: '📝', description: 'Anything else' },
];

const PRIORITIES = [
  { value: 0, label: 'Low', description: 'Minor issue, no rush' },
  { value: 1, label: 'Medium', description: 'Standard priority' },
  { value: 2, label: 'High', description: 'Important, needs attention soon' },
  { value: 3, label: 'Critical', description: 'Urgent, blocking work or major bug' },
];

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = '';

  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    version = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
  } else if (ua.includes('Safari/')) {
    browser = 'Safari';
    version = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
  }

  return {
    browser: `${browser} ${version}`.trim(),
    platform: navigator.platform,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: ua.substring(0, 200),
  };
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  let os = 'Unknown';

  if (/iPhone|iPad|iPod/.test(ua)) {
    device = /iPad/.test(ua) ? 'Tablet' : 'Mobile';
    os = 'iOS';
  } else if (/Android/.test(ua)) {
    device = /Mobile/.test(ua) ? 'Mobile' : 'Tablet';
    os = 'Android';
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS/.test(ua)) {
    os = 'macOS';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  return { device, os };
}

export default function NewIssue() {
  const { token } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    type: 0,
    priority: 1,
    title: '',
    description: '',
    labelIds: [],
    includeEnvironment: true,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Fetch labels
  useEffect(() => {
    fetch('/api/issues/labels')
      .then(r => r.json())
      .then(data => setLabels(data.data || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (form.title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }
    if (form.description.length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }

    setLoading(true);

    try {
      const body = {
        type: form.type,
        priority: form.priority,
        title: form.title,
        description: form.description,
        labelIds: form.labelIds,
        pageUrl: window.location.origin + window.location.pathname,
      };

      if (form.includeEnvironment) {
        body.browserInfo = getBrowserInfo();
        body.deviceInfo = getDeviceInfo();
      }

      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create issue');
      }

      navigate(`/issues/${data.data.issueNumber}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = (labelId) => {
    if (form.labelIds.includes(labelId)) {
      setForm({ ...form, labelIds: form.labelIds.filter(id => id !== labelId) });
    } else if (form.labelIds.length < 5) {
      setForm({ ...form, labelIds: [...form.labelIds, labelId] });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/issues"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span>Back to Issues</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Create New Issue</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              What type of issue is this?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ISSUE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.type === type.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium text-white">{type.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief summary of the issue..."
              maxLength={200}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {form.title.length < 5 ? `${5 - form.title.length} more characters needed` : ''}
              </span>
              <span className="text-xs text-gray-500">{form.title.length}/200</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={
                form.type === 0
                  ? "Please describe the bug in detail:\n\n1. What were you trying to do?\n2. What happened instead?\n3. What did you expect to happen?\n4. Steps to reproduce the issue"
                  : form.type === 1
                  ? "Please describe your feature request:\n\n1. What problem does this solve?\n2. How would this feature work?\n3. Any examples from other apps?"
                  : "Please provide as much detail as possible..."
              }
              rows={8}
              maxLength={10000}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {form.description.length < 20 ? `${20 - form.description.length} more characters needed` : ''}
              </span>
              <span className="text-xs text-gray-500">{form.description.length}/10000</span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: priority.value })}
                  className={`px-4 py-2 rounded-lg border transition-all ${
                    form.priority === priority.value
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {PRIORITIES.find(p => p.value === form.priority)?.description}
            </p>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Labels (optional, max 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1 ${
                      form.labelIds.includes(label.id)
                        ? 'ring-2 ring-white/50'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    {form.labelIds.includes(label.id) && <Icons.Check />}
                    {label.icon} {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Environment Info Toggle */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.includeEnvironment}
                onChange={(e) => setForm({ ...form, includeEnvironment: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
              />
              <div>
                <span className="font-medium text-white">Include environment info</span>
                <p className="text-sm text-gray-400 mt-1">
                  Automatically include your browser, screen size, and operating system.
                  This helps us debug issues faster.
                </p>
                {form.includeEnvironment && (
                  <div className="mt-3 p-3 bg-gray-700/50 rounded-lg text-xs text-gray-400">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Browser: {getBrowserInfo().browser}</div>
                      <div>Platform: {getBrowserInfo().platform}</div>
                      <div>Screen: {getBrowserInfo().screenSize}</div>
                      <div>OS: {getDeviceInfo().os}</div>
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/issues')}
              className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || form.title.length < 5 || form.description.length < 20}
              className="flex-1 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Create Issue'}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <Icons.Info />
              <div>
                <h4 className="font-medium text-blue-400 mb-1">Tips for a great issue report</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>Be specific and provide concrete examples</li>
                  <li>Include steps to reproduce the issue</li>
                  <li>Search existing issues first to avoid duplicates</li>
                  <li>One issue per report - don't combine multiple problems</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
