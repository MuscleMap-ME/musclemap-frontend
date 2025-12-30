import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { api } from '../utils/api';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Wallet: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  ArrowUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>,
  ArrowDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>,
  Star: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
};

const VIP_TIERS = {
  bronze: { color: 'from-amber-700 to-amber-900', min: 0, discount: 0 },
  silver: { color: 'from-gray-400 to-gray-600', min: 100, discount: 5 },
  gold: { color: 'from-yellow-400 to-amber-500', min: 500, discount: 10 },
  platinum: { color: 'from-cyan-300 to-blue-500', min: 2000, discount: 15 },
  diamond: { color: 'from-violet-400 to-purple-600', min: 10000, discount: 20 },
};

const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 100, price: 1.00, popular: false },
  { id: 'value', name: 'Value', credits: 550, price: 5.00, bonus: 50, popular: false },
  { id: 'popular', name: 'Popular', credits: 1200, price: 10.00, bonus: 200, popular: true },
  { id: 'premium', name: 'Premium', credits: 2750, price: 25.00, bonus: 250, popular: false },
  { id: 'mega', name: 'Mega', credits: 6000, price: 50.00, bonus: 1000, popular: false },
  { id: 'ultimate', name: 'Ultimate', credits: 15000, price: 100.00, bonus: 5000, popular: false },
];

const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendMessage, setSendMessage] = useState('');

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const data = await api.wallet.balance();
      setWallet(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await api.wallet.transactions(20);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const data = await api.wallet.transfer({
        recipient_username: sendRecipient,
        amount: parseFloat(sendAmount),
        message: sendMessage
      });
      if (data.success) {
        setShowSendModal(false);
        setSendAmount('');
        setSendRecipient('');
        setSendMessage('');
        fetchWallet();
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const tier = wallet?.ranking?.vip_tier || 'bronze';
  const tierConfig = VIP_TIERS[tier] || VIP_TIERS.bronze;

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
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Wallet</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx('relative overflow-hidden rounded-2xl p-6 mb-6 bg-gradient-to-br', tierConfig.color)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium capitalize">
            <Icons.Star />
            {tier}
          </div>
          
          <div className="mb-6">
            <p className="text-white/70 text-sm mb-1">Available Balance</p>
            <div className="text-4xl font-bold">{(wallet?.wallet?.balance || 0).toLocaleString()}</div>
            <p className="text-white/70 text-sm">credits</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowBuyModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all"
            >
              <Icons.Plus />
              Add Credits
            </button>
            <button
              onClick={() => setShowSendModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all"
            >
              <Icons.Send />
              Send
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Lifetime Earned</p>
            <p className="text-xl font-semibold">{(wallet?.wallet?.lifetime_earned || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Lifetime Spent</p>
            <p className="text-xl font-semibold">{(wallet?.wallet?.lifetime_spent || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Sent to Others</p>
            <p className="text-xl font-semibold">{(wallet?.wallet?.lifetime_transferred || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Received</p>
            <p className="text-xl font-semibold">{(wallet?.wallet?.lifetime_received || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* VIP Progress */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icons.Shield />
              <span className="font-semibold">VIP Status</span>
            </div>
            {tierConfig.discount > 0 && (
              <span className="text-sm text-emerald-400">{tierConfig.discount}% discount</span>
            )}
          </div>
          <div className="flex gap-1 mb-2">
            {Object.entries(VIP_TIERS).map(([name, config], i) => (
              <div
                key={name}
                className={clsx(
                  'flex-1 h-2 rounded-full',
                  tier === name ? `bg-gradient-to-r ${config.color}` : 
                  Object.keys(VIP_TIERS).indexOf(tier) > i ? 'bg-white/30' : 'bg-white/10'
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {Object.entries(VIP_TIERS).map(([name]) => (
              <span key={name} className={clsx(tier === name ? 'text-white font-medium' : '', 'capitalize')}>{name}</span>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                  <Icons.Wallet />
                </div>
                <p>No transactions yet</p>
              </div>
            ) : (
              transactions.map(tx => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  )}>
                    {tx.amount > 0 ? <Icons.ArrowDown /> : <Icons.ArrowUp />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tx.type || tx.description || 'Transaction'}</p>
                    <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className={clsx('font-semibold', tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Buy Credits Modal */}
      <AnimatePresence>
        {showBuyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setShowBuyModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Buy Credits</h2>
                <button onClick={() => setShowBuyModal(false)} className="p-2 rounded-xl hover:bg-white/5">
                  <Icons.Close />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="grid gap-3">
                  {CREDIT_PACKS.map(pack => (
                    <button
                      key={pack.id}
                      className={clsx(
                        'relative p-4 rounded-xl border transition-all text-left',
                        pack.popular 
                          ? 'border-violet-500 bg-violet-500/10' 
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      )}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2 left-4 px-2 py-0.5 bg-violet-500 text-xs font-bold rounded-full">
                          MOST POPULAR
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{pack.name}</p>
                          <p className="text-2xl font-bold">{pack.credits.toLocaleString()} <span className="text-sm font-normal text-gray-400">credits</span></p>
                          {pack.bonus && (
                            <p className="text-sm text-emerald-400">+{pack.bonus} bonus</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">${pack.price.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">${(pack.price / pack.credits * 100).toFixed(1)}¢/credit</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Credits Modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Send Credits</h2>
                <button onClick={() => setShowSendModal(false)} className="p-2 rounded-xl hover:bg-white/5">
                  <Icons.Close />
                </button>
              </div>
              <form onSubmit={handleSend} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Recipient Username</label>
                  <input
                    type="text"
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-2xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Message (optional)</label>
                  <input
                    type="text"
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
                >
                  Send Credits
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
