import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

// =====================================================
// ICONS
// =====================================================

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Exchange: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Inbox: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  History: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  AlertTriangle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
};

// =====================================================
// CONSTANTS
// =====================================================

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  mythic: { label: 'Mythic', color: 'from-pink-500 to-rose-600', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
  divine: { label: 'Divine', color: 'from-cyan-400 to-sky-500', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10' },
};

const TRADE_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  accepted: { label: 'Accepted', color: 'bg-green-500/20 text-green-400' },
  declined: { label: 'Declined', color: 'bg-red-500/20 text-red-400' },
  countered: { label: 'Countered', color: 'bg-blue-500/20 text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-400' },
};

const TABS = [
  { key: 'incoming', label: 'Incoming', icon: <Icons.Inbox /> },
  { key: 'outgoing', label: 'Outgoing', icon: <Icons.Send /> },
  { key: 'history', label: 'History', icon: <Icons.History /> },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Trading() {
  const { token } = useAuth();
  const { tradeId } = useParams();

  // State
  const [activeTab, setActiveTab] = useState('incoming');
  const [incomingTrades, setIncomingTrades] = useState([]);
  const [outgoingTrades, setOutgoingTrades] = useState([]);
  const [historyTrades, setHistoryTrades] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showNewTradeModal, setShowNewTradeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [inRes, outRes, histRes, walletRes] = await Promise.all([
        fetch('/api/trades/incoming', { headers }),
        fetch('/api/trades/outgoing', { headers }),
        fetch('/api/trades/history', { headers }),
        fetch('/api/wallet', { headers }),
      ]);

      const [inData, outData, histData, walletData] = await Promise.all([
        inRes.json(),
        outRes.json(),
        histRes.json(),
        walletRes.json(),
      ]);

      setIncomingTrades(inData.data || []);
      setOutgoingTrades(outData.data || []);
      setHistoryTrades(histData.data || []);
      setWallet(walletData.data);

      // Auto-select trade if tradeId in URL
      if (tradeId) {
        const allTrades = [...(inData.data || []), ...(outData.data || []), ...(histData.data || [])];
        const trade = allTrades.find(t => t.id === tradeId);
        if (trade) setSelectedTrade(trade);
      }
    } catch {
      // Failed to fetch trades
    } finally {
      setLoading(false);
    }
  }, [token, tradeId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // =====================================================
  // ACTIONS
  // =====================================================

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const acceptTrade = async (tradeId) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.data?.success) {
        showSnackbar('Trade accepted!', 'success');
        setSelectedTrade(null);
        fetchTrades();
      } else {
        showSnackbar(data.error?.message || 'Failed to accept trade', 'error');
      }
    } catch (_err) {
      showSnackbar('Failed to accept trade', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const declineTrade = async (tradeId) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.data?.success) {
        showSnackbar('Trade declined', 'success');
        setSelectedTrade(null);
        fetchTrades();
      } else {
        showSnackbar(data.error?.message || 'Failed to decline trade', 'error');
      }
    } catch (_err) {
      showSnackbar('Failed to decline trade', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelTrade = async (tradeId) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.data?.success) {
        showSnackbar('Trade cancelled', 'success');
        setSelectedTrade(null);
        fetchTrades();
      } else {
        showSnackbar(data.error?.message || 'Failed to cancel trade', 'error');
      }
    } catch (_err) {
      showSnackbar('Failed to cancel trade', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  const getCurrentTrades = () => {
    switch (activeTab) {
      case 'incoming': return incomingTrades;
      case 'outgoing': return outgoingTrades;
      case 'history': return historyTrades;
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Trading</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTradeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
            >
              <Icons.Plus />
              <span className="hidden sm:inline">New Trade</span>
            </button>
            <Link
              to="/wallet"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <Icons.Sparkle className="text-violet-400" />
              <span className="font-bold">{(wallet?.balance || 0).toLocaleString()}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Trade Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-400">{incomingTrades.filter(t => t.status === 'pending').length}</p>
            <p className="text-sm text-gray-400">Pending Incoming</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <p className="text-2xl font-bold text-blue-400">{outgoingTrades.filter(t => t.status === 'pending').length}</p>
            <p className="text-sm text-gray-400">Pending Outgoing</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <p className="text-2xl font-bold text-green-400">{historyTrades.filter(t => t.status === 'completed').length}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
                activeTab === tab.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
              {tab.key === 'incoming' && incomingTrades.filter(t => t.status === 'pending').length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 rounded-full">
                  {incomingTrades.filter(t => t.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Trades List */}
        <div className="space-y-4">
          {getCurrentTrades().length === 0 ? (
            <div className="text-center py-16">
              <Icons.Exchange className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No {activeTab} trades</p>
              {activeTab !== 'history' && (
                <p className="text-sm text-gray-500 mt-1">
                  {activeTab === 'incoming' ? 'Waiting for trade requests' : 'Start a new trade'}
                </p>
              )}
            </div>
          ) : (
            getCurrentTrades().map(trade => (
              <TradeCard
                key={trade.id}
                trade={trade}
                isIncoming={activeTab === 'incoming'}
                onClick={() => setSelectedTrade(trade)}
              />
            ))
          )}
        </div>
      </main>

      {/* Trade Detail Modal */}
      <AnimatePresence>
        {selectedTrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTrade(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <TradeDetailModal
                trade={selectedTrade}
                isIncoming={incomingTrades.some(t => t.id === selectedTrade.id)}
                onAccept={() => acceptTrade(selectedTrade.id)}
                onDecline={() => declineTrade(selectedTrade.id)}
                onCancel={() => cancelTrade(selectedTrade.id)}
                submitting={submitting}
                onClose={() => setSelectedTrade(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Trade Modal */}
      <AnimatePresence>
        {showNewTradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewTradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <NewTradeModal
                token={token}
                wallet={wallet}
                onSuccess={() => {
                  setShowNewTradeModal(false);
                  showSnackbar('Trade request sent!', 'success');
                  fetchTrades();
                }}
                onError={(msg) => showSnackbar(msg, 'error')}
                onClose={() => setShowNewTradeModal(false)}
              />
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

// =====================================================
// TRADE CARD COMPONENT
// =====================================================

function TradeCard({ trade, isIncoming, onClick }) {
  const statusConfig = TRADE_STATUS_CONFIG[trade.status] || TRADE_STATUS_CONFIG.pending;
  const otherUser = isIncoming ? trade.initiator_username : trade.receiver_username;
  const itemCount = (trade.initiator_items?.length || 0) + (trade.receiver_items?.length || 0);
  const totalCredits = (trade.initiator_credits || 0) + (trade.receiver_credits || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-lg font-bold">
            {(otherUser || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{otherUser || 'Unknown User'}</p>
            <p className="text-sm text-gray-400">
              {new Date(trade.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{itemCount} items</span>
          {totalCredits > 0 && (
            <span className="flex items-center gap-1">
              <Icons.Sparkle className="w-4 h-4 text-violet-400" />
              {totalCredits.toLocaleString()} credits
            </span>
          )}
        </div>

        {trade.value_warning && (
          <div className="flex items-center gap-1 text-amber-400 text-sm">
            <Icons.AlertTriangle className="w-4 h-4" />
            <span>Value mismatch</span>
          </div>
        )}
      </div>

      {trade.message && (
        <p className="mt-2 text-sm text-gray-400 italic line-clamp-1">"{trade.message}"</p>
      )}
    </motion.div>
  );
}

// =====================================================
// TRADE DETAIL MODAL
// =====================================================

function TradeDetailModal({ trade, isIncoming, onAccept, onDecline, onCancel, submitting, onClose }) {
  const statusConfig = TRADE_STATUS_CONFIG[trade.status] || TRADE_STATUS_CONFIG.pending;
  const isPending = trade.status === 'pending';
  const otherUser = isIncoming ? trade.initiator_username : trade.receiver_username;

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
              {(otherUser || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">Trade with {otherUser}</p>
              <p className="text-sm text-gray-400">
                {new Date(trade.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
            <Icons.Close />
          </button>
        </div>
        <div className="mt-3">
          <span className={clsx('px-3 py-1 text-sm font-medium rounded-full', statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Trade Contents */}
      <div className="p-6">
        {/* Value Warning */}
        {trade.value_warning && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
            <Icons.AlertTriangle className="text-amber-400" />
            <div>
              <p className="font-medium text-amber-400">Value Discrepancy Warning</p>
              <p className="text-sm text-gray-400">
                The items in this trade have significantly different values. Review carefully before accepting.
              </p>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Side - Initiator */}
          <div>
            <p className="text-sm text-gray-400 mb-3">
              {isIncoming ? `${trade.initiator_username} offers` : 'You offer'}
            </p>
            <div className="space-y-2">
              {(trade.initiator_items || []).map((item, i) => (
                <TradeItem key={i} item={item} />
              ))}
              {trade.initiator_credits > 0 && (
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                  <Icons.Sparkle className="text-violet-400" />
                  <span className="font-bold">{trade.initiator_credits.toLocaleString()} credits</span>
                </div>
              )}
              {(trade.initiator_items || []).length === 0 && !trade.initiator_credits && (
                <p className="text-gray-500 italic">No items offered</p>
              )}
            </div>
          </div>

          {/* Exchange Icon */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
            <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
              <Icons.Exchange />
            </div>
          </div>

          {/* Right Side - Receiver */}
          <div>
            <p className="text-sm text-gray-400 mb-3">
              {isIncoming ? 'You give' : `${trade.receiver_username} gives`}
            </p>
            <div className="space-y-2">
              {(trade.receiver_items || []).map((item, i) => (
                <TradeItem key={i} item={item} />
              ))}
              {trade.receiver_credits > 0 && (
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                  <Icons.Sparkle className="text-violet-400" />
                  <span className="font-bold">{trade.receiver_credits.toLocaleString()} credits</span>
                </div>
              )}
              {(trade.receiver_items || []).length === 0 && !trade.receiver_credits && (
                <p className="text-gray-500 italic">No items requested</p>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {trade.message && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-gray-400 mb-1">Message</p>
            <p className="text-gray-200">"{trade.message}"</p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="mt-6 space-y-3">
            {isIncoming ? (
              <>
                <button
                  onClick={onAccept}
                  disabled={submitting}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Icons.Check />
                  {submitting ? 'Processing...' : 'Accept Trade'}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={`/trades/${trade.id}/counter`}
                    className="py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-center transition-all"
                  >
                    Counter Offer
                  </Link>
                  <button
                    onClick={onDecline}
                    disabled={submitting}
                    className="py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
                  >
                    Decline
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onCancel}
                disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Icons.Trash />
                {submitting ? 'Cancelling...' : 'Cancel Trade'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================
// TRADE ITEM COMPONENT
// =====================================================

function TradeItem({ item }) {
  const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

  return (
    <div className={clsx('flex items-center gap-3 p-3 rounded-xl border', rarity.border, rarity.bg)}>
      <div className={clsx('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center', rarity.color, 'opacity-50')}>
        <span className="text-xl">{item.icon || '🎨'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        <p className={clsx('text-xs', rarity.color.replace('from-', 'text-').split(' ')[0].replace('text-', 'text-') || 'text-gray-400')}>
          {rarity.label}
        </p>
      </div>
    </div>
  );
}

// =====================================================
// NEW TRADE MODAL
// =====================================================

function NewTradeModal({ token, wallet, onSuccess, onError, onClose }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myCollection, setMyCollection] = useState([]);
  const [_theirWishlist, _setTheirWishlist] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [_theirItems, _setTheirItems] = useState([]);
  const [myCredits, setMyCredits] = useState(0);
  const [theirCredits, setTheirCredits] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingCollection, setLoadingCollection] = useState(false);

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(data.data || []);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const selectUser = async (user) => {
    setSelectedUser(user);
    setLoadingCollection(true);

    try {
      const res = await fetch('/api/collection', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyCollection(data.data?.items || []);
    } catch (err) {
      console.error('Failed to load collection:', err);
    } finally {
      setLoadingCollection(false);
    }

    setStep(2);
  };

  const toggleMyItem = (item) => {
    if (myItems.find(i => i.id === item.id)) {
      setMyItems(myItems.filter(i => i.id !== item.id));
    } else if (myItems.length < 10) {
      setMyItems([...myItems, item]);
    }
  };

  const submitTrade = async () => {
    if (!selectedUser) {
      onError('Please select a user');
      return;
    }

    if (myItems.length === 0 && myCredits === 0 && theirItems.length === 0 && theirCredits === 0) {
      onError('Trade must include at least one item or credits');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          initiatorItems: myItems.map(i => i.id),
          initiatorCredits: myCredits,
          receiverItems: theirItems.map(i => i.id),
          receiverCredits: theirCredits,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (data.data) {
        onSuccess();
      } else {
        onError(data.error?.message || 'Failed to create trade');
      }
    } catch (_err) {
      onError('Failed to create trade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">New Trade Request</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
            <Icons.Close />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={clsx(
                'flex-1 h-1 rounded-full',
                s <= step ? 'bg-violet-600' : 'bg-white/10'
              )}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Select User */}
        {step === 1 && (
          <div>
            <p className="text-gray-400 mb-4">Who do you want to trade with?</p>
            <div className="relative mb-4">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.username}</p>
                    {user.displayName && (
                      <p className="text-sm text-gray-400">{user.displayName}</p>
                    )}
                  </div>
                </button>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-gray-400 py-4">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Items */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep(1)} className="p-2 rounded-xl hover:bg-white/5">
                <Icons.Back />
              </button>
              <div>
                <p className="font-medium">Trading with {selectedUser?.username}</p>
                <p className="text-sm text-gray-400">Select items to trade</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Your Items */}
              <div>
                <p className="text-sm text-gray-400 mb-2">You offer ({myItems.length}/10)</p>
                {loadingCollection ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {myCollection.map(item => (
                      <button
                        key={item.id}
                        onClick={() => toggleMyItem(item)}
                        className={clsx(
                          'w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left',
                          myItems.find(i => i.id === item.id)
                            ? 'bg-violet-600/20 border border-violet-500'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        )}
                      >
                        <span className="text-lg">{item.icon || '🎨'}</span>
                        <span className="text-sm truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-sm text-gray-400 mb-1">Credits to offer</p>
                  <input
                    type="number"
                    value={myCredits}
                    onChange={(e) => setMyCredits(Math.max(0, Math.min(wallet?.balance || 0, parseInt(e.target.value) || 0)))}
                    max={wallet?.balance || 0}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                  />
                </div>
              </div>

              {/* Their Items */}
              <div>
                <p className="text-sm text-gray-400 mb-2">You want ({theirItems.length}/10)</p>
                <p className="text-center text-gray-500 py-8 text-sm">
                  You can specify desired items when the other party views the trade
                </p>

                <div className="mt-3">
                  <p className="text-sm text-gray-400 mb-1">Credits to request</p>
                  <input
                    type="number"
                    value={theirCredits}
                    onChange={(e) => setTheirCredits(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={myItems.length === 0 && myCredits === 0}
              className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep(2)} className="p-2 rounded-xl hover:bg-white/5">
                <Icons.Back />
              </button>
              <p className="font-medium">Review Trade</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">You offer</p>
                {myItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg mb-1">
                    <span>{item.icon || '🎨'}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
                {myCredits > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <Icons.Sparkle className="text-violet-400 w-4 h-4" />
                    <span className="text-sm">{myCredits.toLocaleString()} credits</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">You request</p>
                {theirCredits > 0 ? (
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <Icons.Sparkle className="text-violet-400 w-4 h-4" />
                    <span className="text-sm">{theirCredits.toLocaleString()} credits</span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">Open to offers</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Message (optional)</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message..."
                rows={2}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg resize-none"
              />
            </div>

            <button
              onClick={submitTrade}
              disabled={submitting}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
            >
              {submitting ? 'Sending...' : 'Send Trade Request'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
