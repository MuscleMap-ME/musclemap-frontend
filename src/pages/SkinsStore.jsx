import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
};

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
};

const CATEGORIES = ['all', 'dashboard_theme', 'avatar_frame', 'badge', 'effect'];

const tabs = [
  { id: 'store', label: 'Store' },
  { id: 'owned', label: 'Owned' },
  { id: 'unlockable', label: 'Unlockable' },
];

export default function SkinsStore() {
  const { token } = useAuth();
  const [skins, setSkins] = useState([]);
  const [ownedSkins, setOwnedSkins] = useState([]);
  const [equippedSkins, setEquippedSkins] = useState([]);
  const [unlockableSkins, setUnlockableSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('store');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [selectedSkin, setSelectedSkin] = useState(null);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [skinsRes, ownedRes, equippedRes, unlockableRes, walletRes] = await Promise.all([
        fetch('/api/skins', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/skins/owned', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/skins/equipped', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/skins/unlockable', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/economy/wallet', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      const [skinsData, ownedData, equippedData, unlockableData, walletData] = await Promise.all([
        skinsRes.json(), ownedRes.json(), equippedRes.json(), unlockableRes.json(), walletRes.json()
      ]);

      setSkins(skinsData.skins || []);
      setOwnedSkins(ownedData.skins || []);
      setEquippedSkins(equippedData.skins || []);
      setUnlockableSkins(unlockableData.skins || []);
      setWallet(walletData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const purchaseSkin = async (skinId) => {
    try {
      const res = await fetch(`/api/skins/${skinId}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedSkin(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const equipSkin = async (skinId) => {
    try {
      const res = await fetch(`/api/skins/${skinId}/equip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const unequipSkin = async (skinId) => {
    try {
      const res = await fetch(`/api/skins/${skinId}/unequip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const getDisplaySkins = () => {
    let items = [];
    switch (activeTab) {
      case 'store': items = skins; break;
      case 'owned': items = ownedSkins; break;
      case 'unlockable': items = unlockableSkins; break;
    }

    if (selectedCategory !== 'all') {
      items = items.filter(s => s.category === selectedCategory);
    }
    if (selectedRarity !== 'all') {
      items = items.filter(s => s.rarity === selectedRarity);
    }
    return items;
  };

  const isOwned = (skinId) => ownedSkins.some(s => s.id === skinId);
  const isEquipped = (skinId) => equippedSkins.some(s => s.id === skinId);

  const SkinCard = ({ skin }) => {
    const rarity = RARITY_CONFIG[skin.rarity] || RARITY_CONFIG.common;
    const owned = isOwned(skin.id);
    const equipped = isEquipped(skin.id);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => setSelectedSkin(skin)}
        className={clsx(
          'relative overflow-hidden rounded-2xl border cursor-pointer transition-all',
          rarity.border, rarity.bg
        )}
      >
        {equipped && (
          <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <Icons.Check />
          </div>
        )}
        
        <div className={clsx('h-24 bg-gradient-to-br', rarity.color, 'opacity-20')} />
        
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx(
              'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
              rarity.color
            )}>
              {rarity.label}
            </span>
            {owned && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10">Owned</span>}
          </div>
          
          <h3 className="font-semibold mb-1">{skin.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-2">{skin.description}</p>
          
          {!owned && (
            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold">{skin.price} credits</span>
              {skin.unlock_requirement && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icons.Lock />
                  {skin.credits_required} generated
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

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
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Customization</h1>
          </div>
          <Link to="/wallet" className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <Icons.Sparkle />
            <span className="font-semibold">{wallet?.wallet?.balance || 0}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all',
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
              {tab.id === 'owned' && ownedSkins.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded-full">{ownedSkins.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {['all', ...Object.keys(RARITY_CONFIG)].map(rarity => (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize',
                  selectedRarity === rarity ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {rarity}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all capitalize',
                selectedCategory === cat 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getDisplaySkins().map(skin => (
            <SkinCard key={skin.id} skin={skin} />
          ))}
        </div>

        {getDisplaySkins().length === 0 && (
          <div className="text-center py-16">
            <Icons.Sparkle />
            <p className="text-gray-400 mt-2">No items found</p>
          </div>
        )}
      </main>

      {/* Skin Detail Modal */}
      <AnimatePresence>
        {selectedSkin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSkin(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              {/* Preview */}
              <div className={clsx(
                'h-32 bg-gradient-to-br',
                RARITY_CONFIG[selectedSkin.rarity]?.color || 'from-gray-500 to-gray-600'
              )} />

              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
                    RARITY_CONFIG[selectedSkin.rarity]?.color
                  )}>
                    {RARITY_CONFIG[selectedSkin.rarity]?.label}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10 capitalize">
                    {selectedSkin.category?.replace('_', ' ')}
                  </span>
                </div>

                <h2 className="text-2xl font-bold mb-2">{selectedSkin.name}</h2>
                <p className="text-gray-400 mb-6">{selectedSkin.description}</p>

                {isOwned(selectedSkin.id) ? (
                  <div className="space-y-3">
                    {isEquipped(selectedSkin.id) ? (
                      <button
                        onClick={() => unequipSkin(selectedSkin.id)}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all"
                      >
                        Unequip
                      </button>
                    ) : (
                      <button
                        onClick={() => equipSkin(selectedSkin.id)}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold transition-all"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <span className="text-gray-400">Price</span>
                      <span className="text-xl font-bold">{selectedSkin.price} credits</span>
                    </div>
                    
                    {selectedSkin.unlock_requirement ? (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <div className="flex items-center gap-2 text-amber-400 mb-2">
                          <Icons.Lock />
                          <span className="font-medium">Unlock Required</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          Generate {selectedSkin.credits_required} credits to unlock this item
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => purchaseSkin(selectedSkin.id)}
                        disabled={(wallet?.wallet?.balance || 0) < selectedSkin.price}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all"
                      >
                        Purchase
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSkin(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
              >
                <Icons.Close />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
