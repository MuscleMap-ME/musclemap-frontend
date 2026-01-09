import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Warning: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  Refresh: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  Unlock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
};

const SEVERITY_CONFIG = {
  low: { label: 'Low', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  high: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const FLAG_TYPE_CONFIG = {
  rapid_earning: { label: 'Rapid Earning', icon: '🚀' },
  bulk_transfers: { label: 'Bulk Transfers', icon: '📦' },
  transfer_loop: { label: 'Transfer Loop', icon: '🔄' },
  unusual_pattern: { label: 'Unusual Pattern', icon: '📊' },
  impossible_value: { label: 'Impossible Value', icon: '❌' },
  geo_mismatch: { label: 'Geo Mismatch', icon: '🗺️' },
  time_anomaly: { label: 'Time Anomaly', icon: '⏰' },
  suspicious_referral: { label: 'Suspicious Referral', icon: '🔗' },
  excessive_tips: { label: 'Excessive Tips', icon: '💰' },
  alt_account_suspected: { label: 'Alt Account', icon: '👥' },
  velocity: { label: 'Velocity', icon: '⚡' },
  self_farming: { label: 'Self Farming', icon: '🌾' },
  bot_behavior: { label: 'Bot Behavior', icon: '🤖' },
  collusion: { label: 'Collusion', icon: '🤝' },
  manual: { label: 'Manual Flag', icon: '🚩' },
};

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-500/20 text-red-400' },
  investigating: { label: 'Investigating', color: 'bg-yellow-500/20 text-yellow-400' },
  resolved_valid: { label: 'Valid', color: 'bg-green-500/20 text-green-400' },
  resolved_invalid: { label: 'Invalid', color: 'bg-gray-500/20 text-gray-400' },
  escalated: { label: 'Escalated', color: 'bg-purple-500/20 text-purple-400' },
};

const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

export default function AdminFraud() {
  const { token } = useAuth();
  const [flags, setFlags] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('flags');
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchUserId, setSearchUserId] = useState('');
  const [walletLookup, setWalletLookup] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ userId: '', amount: 0, reason: '' });
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchData();
  }, [statusFilter, severityFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [flagsRes, auditRes] = await Promise.all([
        fetch(`/api/admin/fraud-flags?status=${statusFilter}${severityFilter !== 'all' ? `&severity=${severityFilter}` : ''}&limit=100`, { headers }),
        fetch('/api/admin/credits/audit?limit=50', { headers }),
      ]);

      const [flagsData, auditData] = await Promise.all([
        flagsRes.json(),
        auditRes.json(),
      ]);

      setFlags(flagsData.data || []);
      setAuditLog(auditData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lookupWallet = async () => {
    if (!searchUserId.trim()) return;

    try {
      const res = await fetch(`/api/admin/wallet/${searchUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWalletLookup(data.data);
    } catch (err) {
      showSnackbar('User not found', 'error');
    }
  };

  const reviewFlag = async (flagId, status, notes) => {
    try {
      const res = await fetch(`/api/admin/fraud-flags/${flagId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (data.data?.success) {
        showSnackbar('Flag updated', 'success');
        setSelectedFlag(null);
        fetchData();
      }
    } catch (err) {
      showSnackbar('Failed to update flag', 'error');
    }
  };

  const freezeWallet = async (userId, reason) => {
    try {
      const res = await fetch('/api/admin/wallet/freeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, reason }),
      });
      const data = await res.json();
      if (data.data?.success) {
        showSnackbar('Wallet frozen', 'success');
        if (walletLookup?.userId === userId) {
          setWalletLookup({ ...walletLookup, status: 'frozen' });
        }
      }
    } catch (err) {
      showSnackbar('Failed to freeze wallet', 'error');
    }
  };

  const unfreezeWallet = async (userId, reason) => {
    try {
      const res = await fetch('/api/admin/wallet/unfreeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, reason }),
      });
      const data = await res.json();
      if (data.data?.success) {
        showSnackbar('Wallet unfrozen', 'success');
        if (walletLookup?.userId === userId) {
          setWalletLookup({ ...walletLookup, status: 'active' });
        }
      }
    } catch (err) {
      showSnackbar('Failed to unfreeze wallet', 'error');
    }
  };

  const adjustCredits = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adjustForm),
      });
      const data = await res.json();
      if (data.data) {
        showSnackbar(`Adjusted ${adjustForm.amount} credits`, 'success');
        setShowAdjustModal(false);
        setAdjustForm({ userId: '', amount: 0, reason: '' });
        fetchData();
      }
    } catch (err) {
      showSnackbar('Failed to adjust credits', 'error');
    }
  };

  const runAbuseCheck = async (userId) => {
    try {
      const res = await fetch(`/api/admin/abuse-check/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        showSnackbar(`Check complete: ${data.data.flags?.length || 0} issues found`, data.data.passed ? 'success' : 'error');
        fetchData();
      }
    } catch (err) {
      showSnackbar('Failed to run check', 'error');
    }
  };

  const showSnackbar = (message, type) => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const openFlags = flags.filter(f => f.status === 'open' || f.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Fraud Management</h1>
          </div>
          <div className="flex items-center gap-2">
            {openFlags.length > 0 && (
              <span className="px-3 py-1 bg-red-500/20 rounded-full text-red-400 text-sm font-medium">
                {openFlags.length} Open
              </span>
            )}
            <button
              onClick={fetchData}
              className="p-2 hover:bg-white/5 rounded-xl"
            >
              <Icons.Refresh />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
          >
            <span className="text-xl">💰</span>
            <span className="text-sm font-medium">Adjust Credits</span>
          </button>
          <button
            onClick={() => {
              const userId = prompt('Enter User ID to check:');
              if (userId) runAbuseCheck(userId);
            }}
            className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
          >
            <span className="text-xl">🔍</span>
            <span className="text-sm font-medium">Run Abuse Check</span>
          </button>
          <button
            onClick={() => {
              const userId = prompt('Enter User ID to freeze:');
              if (userId) freezeWallet(userId, 'Manual freeze by admin');
            }}
            className="flex items-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all text-red-400"
          >
            <Icons.Lock />
            <span className="text-sm font-medium">Freeze Wallet</span>
          </button>
          <button
            onClick={() => {
              const userId = prompt('Enter User ID to unfreeze:');
              if (userId) unfreezeWallet(userId, 'Manual unfreeze by admin');
            }}
            className="flex items-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all text-green-400"
          >
            <Icons.Unlock />
            <span className="text-sm font-medium">Unfreeze Wallet</span>
          </button>
        </div>

        {/* Wallet Lookup */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3">Wallet Lookup</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              placeholder="Enter User ID"
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={lookupWallet}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl transition-all"
            >
              <Icons.Search />
            </button>
          </div>

          {walletLookup && (
            <div className="mt-4 p-4 bg-black/20 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">User ID: {walletLookup.userId}</span>
                <span className={clsx(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  walletLookup.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  walletLookup.status === 'frozen' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                )}>
                  {walletLookup.status}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">Balance</div>
                  <div className="font-bold">{walletLookup.balance?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">Earned</div>
                  <div className="font-bold">{walletLookup.totalEarned?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">Spent</div>
                  <div className="font-bold">{walletLookup.totalSpent?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">Transferred</div>
                  <div className="font-bold">{(walletLookup.totalTransferredOut || 0).toLocaleString()}</div>
                </div>
              </div>
              {walletLookup.status === 'frozen' && walletLookup.frozenReason && (
                <div className="mt-3 p-2 bg-red-500/10 rounded text-sm text-red-400">
                  Frozen: {walletLookup.frozenReason}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {['flags', 'audit'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize',
                activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab === 'flags' ? `Fraud Flags (${flags.length})` : 'Audit Log'}
            </button>
          ))}
        </div>

        {activeTab === 'flags' && (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
                {['open', 'investigating', 'resolved_valid', 'resolved_invalid', 'escalated'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                      statusFilter === status ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {STATUS_CONFIG[status]?.label || status}
                  </button>
                ))}
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm"
              >
                <option value="all">All Severities</option>
                {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Flags List */}
            <div className="space-y-3">
              {flags.length === 0 ? (
                <div className="bg-white/5 rounded-xl p-8 text-center text-gray-400">
                  <Icons.Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No fraud flags found</p>
                </div>
              ) : (
                flags.map(flag => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    onClick={() => setSelectedFlag(flag)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <div className="bg-white/5 rounded-xl p-8 text-center text-gray-400">
                No audit entries
              </div>
            ) : (
              auditLog.map(entry => (
                <div key={entry.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-xs text-gray-400">{formatDate(entry.createdAt || entry.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {entry.targetUserId || entry.target_user_id && (
                      <span>User: {entry.targetUserId || entry.target_user_id} • </span>
                    )}
                    {entry.amount && <span>Amount: {entry.amount} • </span>}
                    <span>Reason: {entry.reason}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Flag Detail Modal */}
      <AnimatePresence>
        {selectedFlag && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedFlag(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Review Flag</h2>
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full border',
                    SEVERITY_CONFIG[selectedFlag.severity]?.color
                  )}>
                    {SEVERITY_CONFIG[selectedFlag.severity]?.label}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{FLAG_TYPE_CONFIG[selectedFlag.flagType || selectedFlag.flag_type]?.icon}</span>
                    <div>
                      <div className="font-semibold">
                        {FLAG_TYPE_CONFIG[selectedFlag.flagType || selectedFlag.flag_type]?.label}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDate(selectedFlag.createdAt || selectedFlag.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">User ID</div>
                    <div className="font-mono">{selectedFlag.userId || selectedFlag.user_id}</div>
                  </div>

                  {selectedFlag.details && (
                    <div className="p-3 bg-white/5 rounded-xl">
                      <div className="text-sm text-gray-400 mb-1">Details</div>
                      <pre className="text-sm overflow-x-auto">
                        {JSON.stringify(selectedFlag.details, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => reviewFlag(selectedFlag.id, 'resolved_valid', 'Confirmed suspicious activity')}
                      className="py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium transition-all"
                    >
                      Confirm Valid
                    </button>
                    <button
                      onClick={() => reviewFlag(selectedFlag.id, 'resolved_invalid', 'False positive')}
                      className="py-2 bg-gray-600 hover:bg-gray-700 rounded-xl text-sm font-medium transition-all"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => reviewFlag(selectedFlag.id, 'investigating', 'Under investigation')}
                      className="py-2 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-sm font-medium transition-all"
                    >
                      Investigate
                    </button>
                    <button
                      onClick={() => reviewFlag(selectedFlag.id, 'escalated', 'Escalated for review')}
                      className="py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-all"
                    >
                      Escalate
                    </button>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <button
                      onClick={() => freezeWallet(selectedFlag.userId || selectedFlag.user_id, `Fraud flag: ${selectedFlag.flagType || selectedFlag.flag_type}`)}
                      className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium transition-all"
                    >
                      Freeze User's Wallet
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjust Credits Modal */}
      <AnimatePresence>
        {showAdjustModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAdjustModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6">Adjust Credits</h2>
                <form onSubmit={adjustCredits} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">User ID</label>
                    <input
                      type="text"
                      value={adjustForm.userId}
                      onChange={(e) => setAdjustForm({ ...adjustForm, userId: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Amount (+ to add, - to remove)</label>
                    <input
                      type="number"
                      value={adjustForm.amount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, amount: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reason</label>
                    <textarea
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-violet-500 focus:outline-none h-20 resize-none"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAdjustModal(false)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
                    >
                      Adjust
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar.show && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              'fixed bottom-4 left-4 right-4 mx-auto max-w-md px-4 py-3 rounded-xl text-center font-medium z-50',
              snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            )}
          >
            {snackbar.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FlagCard({ flag, onClick }) {
  const flagType = FLAG_TYPE_CONFIG[flag.flagType || flag.flag_type] || { label: flag.flagType || flag.flag_type, icon: '🚩' };
  const severity = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.medium;
  const status = STATUS_CONFIG[flag.status] || STATUS_CONFIG.open;

  return (
    <div
      onClick={onClick}
      className="bg-white/5 hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{flagType.icon}</span>
          <div>
            <div className="font-semibold">{flagType.label}</div>
            <div className="text-xs text-gray-400">{flag.userId || flag.user_id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', status.color)}>
            {status.label}
          </span>
          <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full border', severity.color)}>
            {severity.label}
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        {formatDate(flag.createdAt || flag.created_at)}
      </div>
    </div>
  );
}
