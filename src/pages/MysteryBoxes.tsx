import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

// =====================================================
// ICONS
// =====================================================

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Gift: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Info: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  History: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Zap: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
};

// =====================================================
// CONSTANTS
// =====================================================

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', textColor: 'text-gray-400', probability: 50 },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', textColor: 'text-green-400', probability: 25 },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', textColor: 'text-blue-400', probability: 15 },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', textColor: 'text-purple-400', probability: 7 },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', textColor: 'text-amber-400', probability: 2.5 },
  mythic: { label: 'Mythic', color: 'from-pink-500 to-rose-600', textColor: 'text-pink-400', probability: 0.4 },
  divine: { label: 'Divine', color: 'from-cyan-400 to-sky-500', textColor: 'text-cyan-400', probability: 0.1 },
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function MysteryBoxes() {
  const { token } = useAuth();

  // State
  const [boxes, setBoxes] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [pityCounters, setPityCounters] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBox, setSelectedBox] = useState(null);
  const [openingBox, setOpeningBox] = useState(false);
  const [openResults, setOpenResults] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [boxesRes, walletRes, pityRes, historyRes] = await Promise.all([
        fetch('/api/mystery-boxes', { headers }),
        fetch('/api/wallet', { headers }),
        fetch('/api/mystery-boxes/pity', { headers }),
        fetch('/api/mystery-boxes/history', { headers }),
      ]);

      const [boxesData, walletData, pityData, historyData] = await Promise.all([
        boxesRes.json(),
        walletRes.json(),
        pityRes.json(),
        historyRes.json(),
      ]);

      setBoxes(boxesData.data || []);
      setWallet(walletData.data);
      setPityCounters(pityData.data);
      setHistory(historyData.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =====================================================
  // ACTIONS
  // =====================================================

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const openBox = async (boxId) => {
    if (!selectedBox) return;

    const totalCost = selectedBox.price * quantity;
    if ((wallet?.balance || 0) < totalCost) {
      showSnackbar('Insufficient credits', 'error');
      return;
    }

    setOpeningBox(true);
    setOpenResults(null);

    try {
      const res = await fetch(`/api/mystery-boxes/${boxId}/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });

      const data = await res.json();

      if (data.data) {
        // Simulate dramatic reveal
        await new Promise(resolve => setTimeout(resolve, 1500));
        setOpenResults(data.data);
        fetchData(); // Refresh wallet and pity counters
      } else {
        showSnackbar(data.error?.message || 'Failed to open box', 'error');
      }
    } catch (err) {
      showSnackbar('Failed to open box', 'error');
    } finally {
      setOpeningBox(false);
    }
  };

  const canAfford = (price, qty = 1) => (wallet?.balance || 0) >= (price * qty);

  // =====================================================
  // RENDER
  // =====================================================

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
            <h1 className="text-xl font-semibold">Mystery Boxes</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Icons.History />
            </button>
            <Link
              to="/wallet"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl transition-all hover:opacity-90"
            >
              <Icons.Sparkle />
              <span className="font-bold">{(wallet?.balance || 0).toLocaleString()}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Pity System Info */}
        {pityCounters && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Zap className="text-purple-400" />
              <h2 className="font-semibold">Pity System Active</h2>
              <button
                onClick={() => setShowOdds(true)}
                className="ml-auto text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <Icons.Info className="w-4 h-4" />
                View Odds
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Epic Pity (30 pulls)</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(pityCounters.epic_pity / 30) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-purple-400">{pityCounters.epic_pity}/30</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Legendary Pity (100 pulls)</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(pityCounters.legendary_pity / 100) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-amber-400">{pityCounters.legendary_pity}/100</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Guaranteed Epic at 30 pulls without one. Guaranteed Legendary at 100 pulls without one.
              Rates increase after 20 pulls (soft pity).
            </p>
          </div>
        )}

        {/* Box Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {boxes.map(box => (
            <BoxCard
              key={box.id}
              box={box}
              canAfford={canAfford(box.price)}
              onClick={() => {
                setSelectedBox(box);
                setQuantity(1);
                setOpenResults(null);
              }}
            />
          ))}
        </div>

        {boxes.length === 0 && (
          <div className="text-center py-16">
            <Icons.Gift className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No mystery boxes available</p>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            to="/collection"
            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center"
          >
            <span className="text-3xl block mb-2">🎨</span>
            <p className="font-medium">My Collection</p>
            <p className="text-sm text-gray-400">View your items</p>
          </Link>
          <Link
            to="/marketplace"
            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center"
          >
            <span className="text-3xl block mb-2">🛒</span>
            <p className="font-medium">Marketplace</p>
            <p className="text-sm text-gray-400">Trade & sell items</p>
          </Link>
        </div>
      </main>

      {/* Box Opening Modal */}
      <AnimatePresence>
        {selectedBox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !openingBox && setSelectedBox(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              {openResults ? (
                <OpenResultsView
                  results={openResults}
                  onClose={() => {
                    setSelectedBox(null);
                    setOpenResults(null);
                  }}
                  onOpenAgain={() => {
                    setOpenResults(null);
                    openBox(selectedBox.id);
                  }}
                  canAffordAgain={canAfford(selectedBox.price, quantity)}
                />
              ) : (
                <BoxOpeningView
                  box={selectedBox}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  wallet={wallet}
                  opening={openingBox}
                  onOpen={() => openBox(selectedBox.id)}
                  onClose={() => setSelectedBox(null)}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden max-h-[80vh]"
            >
              <HistoryModal history={history} onClose={() => setShowHistory(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Odds Modal */}
      <AnimatePresence>
        {showOdds && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowOdds(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <OddsModal onClose={() => setShowOdds(false)} />
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
// BOX CARD
// =====================================================

function BoxCard({ box, canAfford, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent cursor-pointer group"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Box Visual */}
      <div className="relative h-40 flex items-center justify-center">
        <motion.span
          className="text-8xl filter drop-shadow-lg"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {box.icon || '📦'}
        </motion.span>
        {/* Sparkles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.3,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold mb-1">{box.name}</h3>
        <p className="text-sm text-gray-400 mb-3">{box.description}</p>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.Sparkle className={clsx('w-5 h-5', canAfford ? 'text-violet-400' : 'text-red-400')} />
            <span className={clsx('text-lg font-bold', canAfford ? 'text-white' : 'text-red-400')}>
              {box.price.toLocaleString()}
            </span>
          </div>
          <span className="text-sm text-gray-400">per box</span>
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================
// BOX OPENING VIEW
// =====================================================

function BoxOpeningView({ box, quantity, setQuantity, wallet, opening, onOpen, onClose }) {
  const totalCost = box.price * quantity;
  const canAfford = (wallet?.balance || 0) >= totalCost;

  return (
    <>
      <div className="relative h-48 bg-gradient-to-br from-violet-600/20 to-purple-600/20 flex items-center justify-center">
        <motion.span
          className="text-9xl"
          animate={opening ? {
            rotateY: [0, 360],
            scale: [1, 1.2, 0.8, 1.2, 1],
          } : {
            y: [0, -10, 0],
          }}
          transition={opening ? {
            duration: 1.5,
            ease: 'easeInOut',
          } : {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {box.icon || '📦'}
        </motion.span>
        <button
          onClick={onClose}
          disabled={opening}
          className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-all disabled:opacity-50"
        >
          <Icons.Close />
        </button>
      </div>

      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">{box.name}</h2>
        <p className="text-gray-400 mb-6">{box.description}</p>

        {/* Quantity Selector */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Quantity</label>
          <div className="flex items-center gap-2">
            {[1, 3, 5, 10].map(q => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                disabled={opening}
                className={clsx(
                  'flex-1 py-2 rounded-xl font-semibold transition-all',
                  quantity === q
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                {q}x
              </button>
            ))}
          </div>
        </div>

        {/* Cost Display */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-4">
          <span className="text-gray-400">Total Cost</span>
          <div className="flex items-center gap-2">
            <Icons.Sparkle className={clsx(canAfford ? 'text-violet-400' : 'text-red-400')} />
            <span className={clsx('text-xl font-bold', canAfford ? 'text-white' : 'text-red-400')}>
              {totalCost.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-6 text-sm">
          <span className="text-gray-400">Your Balance</span>
          <div className="flex items-center gap-1">
            <Icons.Sparkle className="text-violet-400 w-4 h-4" />
            <span>{(wallet?.balance || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Open Button */}
        {!canAfford ? (
          <div className="space-y-3">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <p className="text-red-400 font-medium">Insufficient credits</p>
              <p className="text-sm text-gray-400">
                You need {(totalCost - (wallet?.balance || 0)).toLocaleString()} more credits
              </p>
            </div>
            <Link
              to="/credits"
              className="block w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold text-center transition-all"
            >
              Get More Credits
            </Link>
          </div>
        ) : (
          <motion.button
            onClick={onOpen}
            disabled={opening}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-bold text-lg transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {opening ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Opening...
              </span>
            ) : (
              `Open ${quantity}x Box${quantity > 1 ? 'es' : ''}`
            )}
          </motion.button>
        )}
      </div>
    </>
  );
}

// =====================================================
// OPEN RESULTS VIEW
// =====================================================

function OpenResultsView({ results, onClose, onOpenAgain, canAffordAgain }) {
  const items = results.items || [];
  const bestRarity = getBestRarity(items);
  const bestConfig = RARITY_CONFIG[bestRarity] || RARITY_CONFIG.common;

  return (
    <>
      <div className={clsx(
        'h-32 flex items-center justify-center relative',
        `bg-gradient-to-br ${bestConfig.color}`
      )}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-6xl"
        >
          🎉
        </motion.div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
        >
          <Icons.Close />
        </button>
      </div>

      <div className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6">You received!</h2>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {items.map((item, i) => {
            const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  `bg-gradient-to-r ${rarity.color}/10`,
                  item.is_duplicate && 'opacity-75'
                )}
              >
                <span className="text-3xl">{item.icon || '🎨'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{item.name}</p>
                    {item.is_duplicate && (
                      <span className="text-xs text-gray-400">(Duplicate)</span>
                    )}
                  </div>
                  <p className={clsx('text-sm', rarity.textColor)}>{rarity.label}</p>
                </div>
                {item.is_duplicate && item.refund_amount && (
                  <div className="flex items-center gap-1 text-green-400">
                    <Icons.Sparkle className="w-4 h-4" />
                    <span className="text-sm">+{item.refund_amount}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Summary */}
        {results.totalDuplicateRefund > 0 && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
            <p className="text-green-400 font-medium">
              +{results.totalDuplicateRefund.toLocaleString()} credits from duplicates
            </p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {canAffordAgain && (
            <button
              onClick={onOpenAgain}
              className="py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
            >
              Open Again
            </button>
          )}
          <Link
            to="/collection"
            className={clsx(
              'py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-center transition-all',
              !canAffordAgain && 'col-span-2'
            )}
          >
            View Collection
          </Link>
        </div>
      </div>
    </>
  );
}

// =====================================================
// HISTORY MODAL
// =====================================================

function HistoryModal({ history, onClose }) {
  return (
    <>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Opening History</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
          <Icons.Close />
        </button>
      </div>

      <div className="p-6 max-h-96 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No history yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => {
              const rarity = RARITY_CONFIG[entry.rarity] || RARITY_CONFIG.common;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                >
                  <span className="text-2xl">{entry.item_icon || '🎨'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.item_name}</p>
                    <p className={clsx('text-sm', rarity.textColor)}>{rarity.label}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(entry.opened_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================
// ODDS MODAL
// =====================================================

function OddsModal({ onClose }) {
  return (
    <>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Drop Rates</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
          <Icons.Close />
        </button>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-400 mb-4">
          These are the base drop rates for mystery boxes. Actual rates may vary by box type.
        </p>

        <div className="space-y-2">
          {Object.entries(RARITY_CONFIG).map(([key, config]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className={clsx('w-3 h-3 rounded-full bg-gradient-to-r', config.color)} />
                <span className={config.textColor}>{config.label}</span>
              </div>
              <span className="font-bold">{config.probability}%</span>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
          <h3 className="font-semibold mb-2">Pity System</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li className="flex items-center gap-2">
              <Icons.Check className="w-4 h-4 text-green-400" />
              Soft pity starts at 20 pulls (increased rates)
            </li>
            <li className="flex items-center gap-2">
              <Icons.Check className="w-4 h-4 text-green-400" />
              Guaranteed Epic at 30 pulls without one
            </li>
            <li className="flex items-center gap-2">
              <Icons.Check className="w-4 h-4 text-green-400" />
              Guaranteed Legendary at 100 pulls without one
            </li>
            <li className="flex items-center gap-2">
              <Icons.Check className="w-4 h-4 text-green-400" />
              Duplicates refund 50% of base value
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getBestRarity(items) {
  const rarityOrder = ['divine', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
  for (const rarity of rarityOrder) {
    if (items.some(item => item.rarity === rarity)) {
      return rarity;
    }
  }
  return 'common';
}
