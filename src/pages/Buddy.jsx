import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Edit: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Star: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  EyeOff: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>,
};

const SPECIES_CONFIG = {
  wolf: { emoji: '🐺', color: 'from-gray-500 to-gray-700', name: 'Wolf' },
  bear: { emoji: '🐻', color: 'from-amber-700 to-amber-900', name: 'Bear' },
  eagle: { emoji: '🦅', color: 'from-amber-500 to-amber-700', name: 'Eagle' },
  phoenix: { emoji: '🔥', color: 'from-orange-500 to-red-600', name: 'Phoenix' },
  dragon: { emoji: '🐉', color: 'from-emerald-600 to-teal-800', name: 'Dragon' },
  tiger: { emoji: '🐅', color: 'from-orange-600 to-orange-800', name: 'Tiger' },
  ox: { emoji: '🐂', color: 'from-stone-600 to-stone-800', name: 'Ox' },
  shark: { emoji: '🦈', color: 'from-blue-600 to-blue-900', name: 'Shark' },
};

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
};

const COSMETIC_SLOTS = [
  { key: 'aura', label: 'Aura', category: 'buddy_aura' },
  { key: 'armor', label: 'Armor', category: 'buddy_armor' },
  { key: 'wings', label: 'Wings', category: 'buddy_wings' },
  { key: 'tool', label: 'Tool', category: 'buddy_tool' },
  { key: 'skin', label: 'Skin', category: 'buddy_skin' },
  { key: 'emote_pack', label: 'Emotes', category: 'buddy_emote' },
  { key: 'voice_pack', label: 'Voice', category: 'buddy_voice' },
];

export default function Buddy() {
  const { token } = useAuth();
  const [buddy, setBuddy] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [evolutionPath, setEvolutionPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [_selectedSlot, setSelectedSlot] = useState(null);
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [buddyRes, inventoryRes, walletRes] = await Promise.all([
        fetch('/api/buddy', { headers }),
        fetch('/api/store/inventory?category=buddy', { headers }),
        fetch('/api/wallet', { headers }),
      ]);

      const [buddyData, inventoryData, walletData] = await Promise.all([
        buddyRes.json(),
        inventoryRes.json(),
        walletRes.json(),
      ]);

      setBuddy(buddyData.data);
      setInventory(inventoryData.data || []);
      setWallet(walletData.data);

      if (buddyData.data?.species) {
        const evoRes = await fetch(`/api/buddy/evolution/${buddyData.data.species}`, { headers });
        const evoData = await evoRes.json();
        setEvolutionPath(evoData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createBuddy = async (species) => {
    try {
      const res = await fetch('/api/buddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ species }),
      });
      const data = await res.json();
      if (data.data) {
        setBuddy(data.data);
        setShowCreateModal(false);
        showSnackbar('Training buddy created!', 'success');
        fetchData();
      }
    } catch (_err) {
      showSnackbar('Failed to create buddy', 'error');
    }
  };

  const changeSpecies = async (species) => {
    try {
      const res = await fetch('/api/buddy/species', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ species }),
      });
      const data = await res.json();
      if (data.data) {
        setBuddy(data.data);
        setShowSpeciesModal(false);
        showSnackbar('Species changed!', 'success');
        fetchData();
      }
    } catch (_err) {
      showSnackbar('Failed to change species', 'error');
    }
  };

  const updateNickname = async () => {
    try {
      const res = await fetch('/api/buddy/nickname', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: newNickname || null }),
      });
      const data = await res.json();
      if (data.data) {
        setBuddy(data.data);
        setEditingNickname(false);
        showSnackbar('Nickname updated!', 'success');
      }
    } catch (_err) {
      showSnackbar('Failed to update nickname', 'error');
    }
  };

  const equipCosmetic = async (sku, slot) => {
    try {
      const res = await fetch('/api/buddy/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sku, slot }),
      });
      const data = await res.json();
      if (data.data) {
        setBuddy(data.data);
        setSelectedSlot(null);
        showSnackbar('Cosmetic equipped!', 'success');
      }
    } catch (_err) {
      showSnackbar('Failed to equip cosmetic', 'error');
    }
  };

  const unequipCosmetic = async (slot) => {
    try {
      const res = await fetch('/api/buddy/unequip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slot }),
      });
      const data = await res.json();
      if (data.data) {
        setBuddy(data.data);
        showSnackbar('Cosmetic unequipped!', 'success');
      }
    } catch (_err) {
      showSnackbar('Failed to unequip cosmetic', 'error');
    }
  };

  const toggleVisibility = async (setting, value) => {
    try {
      const res = await fetch('/api/buddy/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [setting]: value }),
      });
      const data = await res.json();
      if (data.data) {
        setBuddy(data.data);
        showSnackbar('Settings updated!', 'success');
      }
    } catch (_err) {
      showSnackbar('Failed to update settings', 'error');
    }
  };

  const showSnackbar = (message, type) => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const getEquippedItem = (slot) => {
    const equippedSku = buddy?.[`equipped_${slot}`] || buddy?.[`equipped${slot.charAt(0).toUpperCase() + slot.slice(1)}`];
    if (!equippedSku) return null;
    return inventory.find(i => i.sku === equippedSku);
  };

  const getAvailableItems = (slot) => {
    const slotConfig = COSMETIC_SLOTS.find(s => s.key === slot);
    if (!slotConfig) return [];
    return inventory.filter(i => i.category?.includes(slotConfig.category.replace('buddy_', '')));
  };

  const xpProgress = buddy ? (buddy.xp / buddy.xpToNextLevel) * 100 : 0;
  const speciesConfig = buddy ? SPECIES_CONFIG[buddy.species] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!buddy) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
                <Icons.Back />
              </Link>
              <h1 className="text-xl font-semibold">Training Buddy</h1>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">🐺</div>
          <h2 className="text-2xl font-bold mb-4">Choose Your Training Companion</h2>
          <p className="text-gray-400 mb-8">
            Your training buddy will accompany you on your fitness journey, celebrating your victories and pushing you to be better.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
          >
            Choose Your Buddy
          </button>
        </main>

        {/* Create Buddy Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">Choose Your Companion</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(SPECIES_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => createBuddy(key)}
                        className={clsx(
                          'p-4 rounded-xl bg-gradient-to-br transition-all hover:scale-105',
                          config.color
                        )}
                      >
                        <div className="text-4xl mb-2">{config.emoji}</div>
                        <div className="font-semibold">{config.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Training Buddy</h1>
          </div>
          <Link to="/wallet" className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <Icons.Sparkle />
            <span className="font-semibold">{wallet?.balance || 0}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Buddy Card */}
        <div className={clsx(
          'rounded-2xl p-6 mb-6 bg-gradient-to-br relative overflow-hidden',
          speciesConfig?.color || 'from-violet-600 to-violet-800'
        )}>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <div className="text-[12rem] leading-none">{speciesConfig?.emoji}</div>
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-5xl">{speciesConfig?.emoji}</span>
                  <div>
                    {editingNickname ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newNickname}
                          onChange={(e) => setNewNickname(e.target.value)}
                          placeholder="Enter nickname"
                          className="px-3 py-1 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50"
                          maxLength={30}
                        />
                        <button onClick={updateNickname} className="p-1 hover:bg-white/20 rounded">
                          <Icons.Check />
                        </button>
                        <button onClick={() => setEditingNickname(false)} className="p-1 hover:bg-white/20 rounded">
                          <Icons.Close />
                        </button>
                      </div>
                    ) : (
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        {buddy.nickname || speciesConfig?.name}
                        <button onClick={() => { setNewNickname(buddy.nickname || ''); setEditingNickname(true); }} className="p-1 hover:bg-white/20 rounded">
                          <Icons.Edit />
                        </button>
                      </h2>
                    )}
                    <p className="text-white/70">Level {buddy.level} {speciesConfig?.name}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSpeciesModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all"
              >
                Change Species
              </button>
            </div>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>XP Progress</span>
                <span>{buddy.xp} / {buddy.xpToNextLevel}</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  className="h-full bg-white/80 rounded-full"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.level}</div>
                <div className="text-xs text-white/70">Level</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.stage}</div>
                <div className="text-xs text-white/70">Stage</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.totalXpEarned || buddy.total_xp_earned || 0}</div>
                <div className="text-xs text-white/70">Total XP</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{buddy.workoutsTogether || buddy.workouts_together || 0}</div>
                <div className="text-xs text-white/70">Workouts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {['overview', 'cosmetics', 'evolution', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize',
                activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Equipped Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Equipped Cosmetics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COSMETIC_SLOTS.map(slot => {
                  const equipped = getEquippedItem(slot.key);
                  return (
                    <div
                      key={slot.key}
                      className="bg-white/5 rounded-xl p-4 text-center cursor-pointer hover:bg-white/10 transition-all"
                      onClick={() => setSelectedSlot(slot.key)}
                    >
                      <div className="text-xs text-gray-400 mb-2">{slot.label}</div>
                      {equipped ? (
                        <>
                          <div className={clsx(
                            'text-xs px-2 py-0.5 rounded-full mb-2 inline-block bg-gradient-to-r text-white',
                            RARITY_CONFIG[equipped.rarity]?.color || 'from-gray-500 to-gray-600'
                          )}>
                            {RARITY_CONFIG[equipped.rarity]?.label || 'Common'}
                          </div>
                          <div className="font-medium text-sm truncate">{equipped.name}</div>
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Training Stats</h3>
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">PRs Celebrated</span>
                  <span className="font-medium">{buddy.prsCelebrated || buddy.prs_celebrated || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Streaks Witnessed</span>
                  <span className="font-medium">{buddy.streaksWitnessed || buddy.streaks_witnessed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Workouts Together</span>
                  <span className="font-medium">{buddy.workoutsTogether || buddy.workouts_together || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cosmetics' && (
          <div className="space-y-6">
            {COSMETIC_SLOTS.map(slot => {
              const items = getAvailableItems(slot.key);
              const equipped = getEquippedItem(slot.key);

              return (
                <div key={slot.key}>
                  <h3 className="text-lg font-semibold mb-3">{slot.label}</h3>
                  {items.length === 0 ? (
                    <div className="bg-white/5 rounded-xl p-6 text-center text-gray-400">
                      No {slot.label.toLowerCase()} items owned. <Link to="/store" className="text-violet-400 hover:underline">Visit Store</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.map(item => {
                        const isEquipped = equipped?.sku === item.sku;
                        const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

                        return (
                          <div
                            key={item.sku}
                            className={clsx(
                              'rounded-xl border p-4 cursor-pointer transition-all',
                              isEquipped ? 'border-violet-500 bg-violet-500/20' : rarity.border,
                              rarity.bg
                            )}
                            onClick={() => isEquipped ? unequipCosmetic(slot.key) : equipCosmetic(item.sku, slot.key)}
                          >
                            {isEquipped && (
                              <div className="flex items-center gap-1 text-violet-400 text-xs mb-2">
                                <Icons.Check /> Equipped
                              </div>
                            )}
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full bg-gradient-to-r text-white',
                              rarity.color
                            )}>
                              {rarity.label}
                            </span>
                            <div className="font-medium mt-2">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'evolution' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Evolution Path</h3>
            {evolutionPath.map((stage, _i) => {
              const isUnlocked = buddy.level >= stage.minLevel;
              const isCurrent = buddy.stage === stage.stage;

              return (
                <div
                  key={stage.stage}
                  className={clsx(
                    'flex items-center gap-4 p-4 rounded-xl transition-all',
                    isCurrent ? 'bg-violet-500/20 border border-violet-500' :
                    isUnlocked ? 'bg-white/5' : 'bg-white/5 opacity-50'
                  )}
                >
                  <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                    isUnlocked ? 'bg-violet-600' : 'bg-gray-700'
                  )}>
                    {isUnlocked ? speciesConfig?.emoji : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stage.stageName || stage.stage_name}</span>
                      {isCurrent && <span className="text-xs bg-violet-600 px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                    <div className="text-sm text-gray-400">{stage.description}</div>
                    <div className="text-xs text-gray-500 mt-1">Level {stage.minLevel || stage.min_level}+</div>
                  </div>
                  {isUnlocked && (
                    <Icons.Check className="text-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Display Settings</h3>

            <div className="bg-white/5 rounded-xl divide-y divide-white/5">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">Show Buddy</div>
                  <div className="text-sm text-gray-400">Display your buddy throughout the app</div>
                </div>
                <button
                  onClick={() => toggleVisibility('visible', !buddy.visible)}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all relative',
                    buddy.visible ? 'bg-violet-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-1 transition-all',
                    buddy.visible ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">Show on Profile</div>
                  <div className="text-sm text-gray-400">Display buddy on your public profile</div>
                </div>
                <button
                  onClick={() => toggleVisibility('showOnProfile', !(buddy.showOnProfile ?? buddy.show_on_profile))}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all relative',
                    (buddy.showOnProfile ?? buddy.show_on_profile) ? 'bg-violet-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-1 transition-all',
                    (buddy.showOnProfile ?? buddy.show_on_profile) ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">Show in Workouts</div>
                  <div className="text-sm text-gray-400">Display buddy during workout sessions</div>
                </div>
                <button
                  onClick={() => toggleVisibility('showInWorkouts', !(buddy.showInWorkouts ?? buddy.show_in_workouts))}
                  className={clsx(
                    'w-12 h-7 rounded-full transition-all relative',
                    (buddy.showInWorkouts ?? buddy.show_in_workouts) ? 'bg-violet-600' : 'bg-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 rounded-full bg-white absolute top-1 transition-all',
                    (buddy.showInWorkouts ?? buddy.show_in_workouts) ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Species Change Modal */}
      <AnimatePresence>
        {showSpeciesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSpeciesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2">Change Species</h2>
                <p className="text-gray-400 text-sm mb-4">Your buddy will keep all progress and cosmetics.</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SPECIES_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => changeSpecies(key)}
                      disabled={key === buddy.species}
                      className={clsx(
                        'p-4 rounded-xl bg-gradient-to-br transition-all',
                        key === buddy.species ? 'opacity-50 cursor-not-allowed ring-2 ring-white' : 'hover:scale-105',
                        config.color
                      )}
                    >
                      <div className="text-4xl mb-2">{config.emoji}</div>
                      <div className="font-semibold">{config.name}</div>
                      {key === buddy.species && <div className="text-xs opacity-70">Current</div>}
                    </button>
                  ))}
                </div>
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
