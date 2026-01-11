/**
 * Issue Detail Page
 *
 * Single issue view with:
 * - Full issue details
 * - Comments thread
 * - Voting and subscription
 * - Status history
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../store/authStore';
import { useUser } from '../contexts/UserContext';
import { sanitizeText } from '../utils/sanitize';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  ChevronUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7"/></svg>,
  Bell: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  BellOff: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11M6.26 6.26A5.86 5.86 0 006 8v3.159c0 .538-.214 1.055-.595 1.436L4 14h9m2 3a3 3 0 11-6 0m13-11L3 21"/></svg>,
  Pin: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>,
  Lock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Reply: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
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
  0: { label: 'Open', color: 'bg-green-500', textColor: 'text-green-400' },
  1: { label: 'In Progress', color: 'bg-blue-500', textColor: 'text-blue-400' },
  2: { label: 'Under Review', color: 'bg-purple-500', textColor: 'text-purple-400' },
  3: { label: 'Resolved', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  4: { label: 'Closed', color: 'bg-gray-500', textColor: 'text-gray-400' },
  5: { label: "Won't Fix", color: 'bg-red-500', textColor: 'text-red-400' },
  6: { label: 'Duplicate', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
};

const PRIORITIES = {
  0: { label: 'Low', color: 'text-gray-400' },
  1: { label: 'Medium', color: 'text-blue-400' },
  2: { label: 'High', color: 'text-orange-400' },
  3: { label: 'Critical', color: 'text-red-400' },
};

function Comment({ comment, isStaff, onMarkSolution, canMarkSolution }) {
  const isAuthorStaff = comment.isStaffReply || comment.authorRoles?.includes('admin') || comment.authorRoles?.includes('moderator');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 ${
        comment.isSolution
          ? 'bg-green-500/10 border-2 border-green-500/50'
          : isAuthorStaff
          ? 'bg-purple-500/10 border border-purple-500/30'
          : 'bg-gray-800/50 border border-gray-700/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
          {comment.authorAvatarUrl ? (
            <img
              src={comment.authorAvatarUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-lg">{comment.authorUsername?.[0]?.toUpperCase() || '?'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-semibold text-white">
              {comment.authorDisplayName || comment.authorUsername || 'Unknown'}
            </span>
            {isAuthorStaff && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">
                Staff
              </span>
            )}
            {comment.isSolution && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/30 text-green-300 flex items-center gap-1">
                <Icons.Check /> Solution
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.editCount > 0 && (
              <span className="text-xs text-gray-600">(edited)</span>
            )}
          </div>

          <div className="text-gray-300 whitespace-pre-wrap break-words">
            {comment.content}
          </div>

          {canMarkSolution && !comment.isSolution && (
            <button
              onClick={() => onMarkSolution(comment.id)}
              className="mt-3 text-xs text-gray-400 hover:text-green-400 flex items-center gap-1"
            >
              <Icons.Check /> Mark as solution
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function IssueDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const isAdmin = user?.is_admin || user?.roles?.includes('admin');
  const isModerator = isAdmin || user?.roles?.includes('moderator');

  useEffect(() => {
    fetchIssue();
    fetchComments();
  }, [id]);

  const fetchIssue = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/issues/${id}`, { headers });
      if (!res.ok) throw new Error('Issue not found');
      const data = await res.json();
      setIssue(data.data);
    } catch (err) {
      console.error(err);
      navigate('/issues');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/issues/${id}/comments`);
      const data = await res.json();
      setComments(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setVoting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setIssue({ ...issue, hasVoted: data.data.voted, voteCount: data.data.voteCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoting(false);
    }
  };

  const handleSubscribe = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setIssue({ ...issue, isSubscribed: data.data.subscribed, subscriberCount: data.data.subscriberCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !token) return;

    setSubmitting(true);
    try {
      // Sanitize comment content before sending
      const res = await fetch(`/api/issues/${issue.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: sanitizeText(newComment) }),
      });
      const data = await res.json();
      if (data.data) {
        setComments([...comments, data.data]);
        setNewComment('');
        setIssue({ ...issue, commentCount: issue.commentCount + 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSolution = async (commentId) => {
    try {
      await fetch(`/api/issues/${issue.id}/comments/${commentId}/solution`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(comments.map(c => ({
        ...c,
        isSolution: c.id === commentId,
      })));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!issue) return null;

  const type = ISSUE_TYPES[issue.type] || ISSUE_TYPES[5];
  const status = ISSUE_STATUSES[issue.status] || ISSUE_STATUSES[0];
  const priority = PRIORITIES[issue.priority] || PRIORITIES[1];

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/issues"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Icons.Back />
              <span className="hidden sm:inline">Back to Issues</span>
            </Link>

            <span className="text-gray-500 text-sm">#{issue.issueNumber}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Column */}
          <div className="flex-1 min-w-0">
            {/* Issue Header */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6">
              <div className="flex items-start gap-4">
                {/* Vote */}
                <div className="flex-shrink-0">
                  <button
                    onClick={handleVote}
                    disabled={voting}
                    className={`flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-colors ${
                      issue.hasVoted
                        ? 'bg-purple-600/30 text-purple-400'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icons.ChevronUp />
                    <span className="text-xl font-bold">{issue.voteCount}</span>
                    <span className="text-xs">votes</span>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
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
                    <span className={`text-sm px-3 py-1 rounded-full ${type.color}`}>
                      {type.icon} {type.label}
                    </span>
                    <span className={`text-sm px-3 py-1 rounded-full ${status.color} text-white`}>
                      {status.label}
                    </span>
                    <span className={`text-sm ${priority.color}`}>
                      {priority.label} Priority
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold text-white mb-4">{issue.title}</h1>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 whitespace-pre-wrap">{issue.description}</p>
                  </div>

                  {/* Labels */}
                  {issue.labels && issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {issue.labels.map((label) => (
                        <span
                          key={label.id}
                          className="text-sm px-3 py-1 rounded-full"
                          style={{ backgroundColor: `${label.color}20`, color: label.color }}
                        >
                          {label.icon} {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Screenshots */}
                  {issue.screenshotUrls && issue.screenshotUrls.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">Screenshots</h4>
                      <div className="flex gap-2 flex-wrap">
                        {issue.screenshotUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-24 h-24 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icons.User />
                      {issue.authorDisplayName || issue.authorUsername}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.Calendar />
                      {format(new Date(issue.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.Eye />
                      {issue.viewCount} views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-semibold text-white mb-4">
                Comments ({issue.commentCount})
              </h2>

              {/* Comments List */}
              <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No comments yet. Be the first to respond!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <Comment
                      key={comment.id}
                      comment={comment}
                      isStaff={isModerator}
                      canMarkSolution={isModerator}
                      onMarkSolution={handleMarkSolution}
                    />
                  ))
                )}
              </div>

              {/* Add Comment */}
              {user ? (
                issue.isLocked && !isModerator ? (
                  <div className="bg-gray-700/30 rounded-lg p-4 text-center text-gray-400">
                    <Icons.Lock />
                    <p className="mt-2">This issue is locked. Only moderators can comment.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitComment}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        type="submit"
                        disabled={!newComment.trim() || submitting}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        {submitting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                  <p className="text-gray-400 mb-3">Sign in to leave a comment</p>
                  <Link
                    to="/login"
                    className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
            {/* Actions */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="font-semibold text-white mb-3">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    issue.isSubscribed
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {issue.isSubscribed ? <Icons.BellOff /> : <Icons.Bell />}
                  {issue.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {issue.subscriberCount} subscriber{issue.subscriberCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Info */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="font-semibold text-white mb-3">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={status.textColor}>{status.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Priority</span>
                  <span className={priority.color}>{priority.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span>{type.icon} {type.label}</span>
                </div>
                {issue.assigneeUsername && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assignee</span>
                    <span className="text-white">{issue.assigneeDisplayName || issue.assigneeUsername}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white">{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Updated</span>
                  <span className="text-white">{formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Resolution Note */}
            {issue.resolutionNote && (
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                <h3 className="font-semibold text-green-400 mb-2">Resolution</h3>
                <p className="text-sm text-gray-300">{issue.resolutionNote}</p>
              </div>
            )}

            {/* Browser Info */}
            {issue.browserInfo && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h3 className="font-semibold text-white mb-3">Environment</h3>
                <div className="space-y-1 text-xs text-gray-400">
                  {Object.entries(issue.browserInfo).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}</span>
                      <span className="text-gray-300 truncate ml-2">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
