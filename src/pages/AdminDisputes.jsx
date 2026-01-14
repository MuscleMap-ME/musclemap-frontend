/**
 * Admin Disputes Dashboard
 *
 * Admin interface for managing economy disputes.
 * Allows viewing, investigating, and resolving disputes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';

// ============================================
// ICONS
// ============================================
const Icons = {
  AlertTriangle: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Clock: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Coins: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  MessageCircle: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Search: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Eye: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Scale: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
};

// Status colors
const STATUS_CONFIG = {
  open: { label: 'Open', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  investigating: { label: 'Investigating', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  pending_response: { label: 'Pending Response', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  resolved_reporter: { label: 'Resolved (Reporter)', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  resolved_respondent: { label: 'Resolved (Respondent)', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  resolved_split: { label: 'Resolved (Split)', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  dismissed: { label: 'Dismissed', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  escalated: { label: 'Escalated', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const TYPE_CONFIG = {
  class_noshow: { label: 'Class No-Show', icon: '🏃' },
  class_quality: { label: 'Class Quality', icon: '⭐' },
  transfer_fraud: { label: 'Transfer Fraud', icon: '💸' },
  refund_request: { label: 'Refund Request', icon: '💰' },
  other: { label: 'Other', icon: '❓' },
};

// ============================================
// DISPUTE ROW COMPONENT
// ============================================
function DisputeRow({ dispute, onSelect }) {
  const status = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
  const type = TYPE_CONFIG[dispute.disputeType] || TYPE_CONFIG.other;
  const deadline = dispute.deadline ? new Date(dispute.deadline) : null;
  const isOverdue = deadline && deadline < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer"
      onClick={() => onSelect(dispute)}
    >
      <GlassCard className="p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{type.icon}</span>
            <div>
              <div className="text-white font-medium">{type.label}</div>
              <div className="text-white/50 text-xs">{dispute.id}</div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} ${status.border} border`}>
            {status.label}
          </span>
        </div>

        <p className="text-white/70 text-sm mb-3 line-clamp-2">
          {dispute.description}
        </p>

        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-4">
            {dispute.amountDisputed && (
              <div className="flex items-center gap-1">
                <Icons.Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400">{dispute.amountDisputed}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Icons.Clock className="w-4 h-4" />
              <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {deadline && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
              <Icons.AlertTriangle className="w-4 h-4" />
              <span>{isOverdue ? 'Overdue' : `Due ${deadline.toLocaleDateString()}`}</span>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ============================================
// DISPUTE DETAIL MODAL
// ============================================
function DisputeDetailModal({ dispute, onClose, onResolve, onUpdateStatus }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolutionType, setResolutionType] = useState('resolved_reporter');
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolutionAmount, setResolutionAmount] = useState(dispute.amountDisputed || 0);

  useEffect(() => {
    loadMessages();
  }, [dispute.id]);

  const loadMessages = async () => {
    try {
      const res = await api.get(`/admin/disputes/${dispute.id}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.post(`/admin/disputes/${dispute.id}/messages`, {
        message: newMessage,
      });
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await api.post(`/admin/disputes/${dispute.id}/resolve`, {
        resolution: resolutionType,
        reason: resolutionReason,
        amount: resolutionAmount,
      });
      onResolve();
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolving(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/admin/disputes/${dispute.id}/status`, { status });
      onUpdateStatus(status);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const status = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
  const type = TYPE_CONFIG[dispute.disputeType] || TYPE_CONFIG.other;
  const isResolved = ['resolved_reporter', 'resolved_respondent', 'resolved_split', 'dismissed'].includes(dispute.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{type.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{type.label}</h2>
                <p className="text-white/50 text-sm">{dispute.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text} ${status.border} border`}>
            {status.label}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Details */}
          <div>
            <h3 className="text-white font-semibold mb-3">Details</h3>
            <GlassCard className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-white/50">Reporter</span>
                <span className="text-white">{dispute.reporterId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Respondent</span>
                <span className="text-white">{dispute.respondentId}</span>
              </div>
              {dispute.amountDisputed && (
                <div className="flex justify-between">
                  <span className="text-white/50">Amount</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Icons.Coins className="w-4 h-4" />
                    {dispute.amountDisputed}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/50">Reference</span>
                <span className="text-white">{dispute.referenceType}: {dispute.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Created</span>
                <span className="text-white">{new Date(dispute.createdAt).toLocaleString()}</span>
              </div>
              {dispute.deadline && (
                <div className="flex justify-between">
                  <span className="text-white/50">Deadline</span>
                  <span className={new Date(dispute.deadline) < new Date() ? 'text-red-400' : 'text-white'}>
                    {new Date(dispute.deadline).toLocaleString()}
                  </span>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-white font-semibold mb-3">Description</h3>
            <GlassCard className="p-4">
              <p className="text-white/80">{dispute.description}</p>
            </GlassCard>
          </div>

          {/* Evidence */}
          {dispute.evidence?.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Evidence</h3>
              <div className="space-y-2">
                {dispute.evidence.map((e, i) => (
                  <GlassCard key={i} className="p-4">
                    <div className="text-white/50 text-xs mb-1 capitalize">{e.type}</div>
                    {e.text && <p className="text-white">{e.text}</p>}
                    {e.url && (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                        {e.url}
                      </a>
                    )}
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div>
            <h3 className="text-white font-semibold mb-3">Messages ({messages.length})</h3>
            <div className="space-y-3 mb-4">
              {loading ? (
                <div className="text-center text-white/50">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-white/50">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`p-3 rounded-lg ${msg.isAdmin ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-white/5'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icons.User className="w-4 h-4 text-white/50" />
                      <span className={`text-sm ${msg.isAdmin ? 'text-violet-400' : 'text-white/70'}`}>
                        {msg.isAdmin ? 'Admin' : msg.senderId}
                      </span>
                      <span className="text-xs text-white/30">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            {!isResolved && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                  placeholder="Send admin message..."
                />
                <GlassButton onClick={handleSendMessage}>Send</GlassButton>
              </div>
            )}
          </div>

          {/* Resolution */}
          {!isResolved && (
            <div>
              <h3 className="text-white font-semibold mb-3">Resolve Dispute</h3>
              <GlassCard className="p-4 space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-1">Resolution Type</label>
                  <select
                    value={resolutionType}
                    onChange={(e) => setResolutionType(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="resolved_reporter">Resolve in favor of Reporter</option>
                    <option value="resolved_respondent">Resolve in favor of Respondent</option>
                    <option value="resolved_split">Split Resolution</option>
                    <option value="dismissed">Dismiss</option>
                  </select>
                </div>

                {resolutionType !== 'dismissed' && dispute.amountDisputed && (
                  <div>
                    <label className="block text-white/70 text-sm mb-1">
                      {resolutionType === 'resolved_split' ? 'Amount to Reporter' : 'Resolution Amount'}
                    </label>
                    <input
                      type="number"
                      value={resolutionAmount}
                      onChange={(e) => setResolutionAmount(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                      min={0}
                      max={dispute.amountDisputed}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-white/70 text-sm mb-1">Reason</label>
                  <textarea
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none resize-none"
                    placeholder="Explain the resolution..."
                  />
                </div>

                <div className="flex gap-2">
                  <GlassButton
                    onClick={handleResolve}
                    disabled={resolving || !resolutionReason}
                    className="flex-1 bg-green-500/20 border-green-500/30 text-green-400"
                  >
                    <Icons.Check className="w-4 h-4 mr-2" />
                    {resolving ? 'Resolving...' : 'Resolve'}
                  </GlassButton>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Quick Actions */}
          {!isResolved && (
            <div>
              <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                {dispute.status === 'open' && (
                  <GlassButton onClick={() => handleStatusChange('investigating')} className="text-sm">
                    Start Investigation
                  </GlassButton>
                )}
                {dispute.status === 'investigating' && (
                  <GlassButton onClick={() => handleStatusChange('pending_response')} className="text-sm">
                    Request Response
                  </GlassButton>
                )}
                <GlassButton onClick={() => handleStatusChange('escalated')} className="text-sm text-red-400 border-red-400/30">
                  Escalate
                </GlassButton>
              </div>
            </div>
          )}

          {/* Resolution Details (if resolved) */}
          {isResolved && dispute.resolution && (
            <div>
              <h3 className="text-white font-semibold mb-3">Resolution</h3>
              <GlassCard className="p-4 bg-green-500/10 border border-green-500/30">
                <p className="text-green-400 mb-2">{dispute.resolution}</p>
                {dispute.resolutionAmount > 0 && (
                  <div className="text-white/70 text-sm">
                    Amount: {dispute.resolutionAmount} credits
                  </div>
                )}
                {dispute.resolvedAt && (
                  <div className="text-white/50 text-xs mt-2">
                    Resolved: {new Date(dispute.resolvedAt).toLocaleString()}
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN ADMIN DISPUTES PAGE
// ============================================
export default function AdminDisputes() {
  const { user } = useUser();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [total, setTotal] = useState(0);

  const loadDisputes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('disputeType', typeFilter);
      params.set('limit', '50');

      const res = await api.get(`/admin/disputes?${params.toString()}`);
      setDisputes(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleResolve = () => {
    setSelectedDispute(null);
    loadDisputes();
  };

  const handleUpdateStatus = (newStatus) => {
    setSelectedDispute((prev) => ({ ...prev, status: newStatus }));
    loadDisputes();
  };

  // Count by status
  const openCount = disputes.filter((d) => d.status === 'open').length;
  const investigatingCount = disputes.filter((d) => d.status === 'investigating').length;
  const pendingCount = disputes.filter((d) => d.status === 'pending_response').length;

  if (loading && disputes.length === 0) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading disputes...</p>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dispute Management</h1>
          <p className="text-white/60">Review and resolve economy disputes</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{openCount}</div>
            <div className="text-white/50 text-sm">Open</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{investigatingCount}</div>
            <div className="text-white/50 text-sm">Investigating</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{pendingCount}</div>
            <div className="text-white/50 text-sm">Pending</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-3xl font-bold text-white">{total}</div>
            <div className="text-white/50 text-sm">Total</div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="pending_response">Pending Response</option>
              <option value="escalated">Escalated</option>
              <option value="resolved_reporter">Resolved (Reporter)</option>
              <option value="resolved_respondent">Resolved (Respondent)</option>
              <option value="resolved_split">Resolved (Split)</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="class_noshow">Class No-Show</option>
              <option value="class_quality">Class Quality</option>
              <option value="transfer_fraud">Transfer Fraud</option>
              <option value="refund_request">Refund Request</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Icons.Scale className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Disputes</h2>
            <p className="text-white/60">
              {statusFilter || typeFilter
                ? 'No disputes match your filters.'
                : 'There are no pending disputes to review.'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {disputes.map((dispute) => (
              <DisputeRow key={dispute.id} dispute={dispute} onSelect={setSelectedDispute} />
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedDispute && (
            <DisputeDetailModal
              dispute={selectedDispute}
              onClose={() => setSelectedDispute(null)}
              onResolve={handleResolve}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
        </AnimatePresence>
      </div>
    </GlassSurface>
  );
}
