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
  ShoppingCart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Star: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Fire: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>,
};

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10', textColor: 'text-gray-400' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10', textColor: 'text-green-400' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10', textColor: 'text-blue-400' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10', textColor: 'text-purple-400' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10', textColor: 'text-amber-400' },
};

const CATEGORY_CONFIG = {
  buddy_species: { label: 'Companions', icon: '🐺', group: 'buddy' },
  buddy_aura: { label: 'Auras', icon: '✨', group: 'buddy' },
  buddy_armor: { label: 'Armor', icon: '🛡️', group: 'buddy' },
  buddy_wings: { label: 'Wings', icon: '🦋', group: 'buddy' },
  buddy_tool: { label: 'Tools', icon: '🔧', group: 'buddy' },
  buddy_emote: { label: 'Emotes', icon: '💃', group: 'buddy' },
  buddy_voice: { label: 'Voices', icon: '🔊', group: 'buddy' },
  buddy_ability: { label: 'Abilities', icon: '⚡', group: 'buddy' },
  buddy_skin: { label: 'Skins', icon: '🎨', group: 'buddy' },
  cosmetic_frame: { label: 'Frames', icon: '🖼️', group: 'cosmetic' },
  cosmetic_badge: { label: 'Badges', icon: '🏅', group: 'cosmetic' },
  cosmetic_theme: { label: 'Themes', icon: '🎭', group: 'cosmetic' },
  cosmetic_trail: { label: 'Trails', icon: '🌈', group: 'cosmetic' },
  cosmetic_card: { label: 'Cards', icon: '🃏', group: 'cosmetic' },
  cosmetic_flair: { label: 'Flair', icon: '🎆', group: 'cosmetic' },
  community_tip: { label: 'Tips', icon: '💰', group: 'community' },
  community_bounty: { label: 'Bounties', icon: '🎯', group: 'community' },
  community_challenge: { label: 'Challenges', icon: '🏆', group: 'community' },
  community_boost: { label: 'Boosts', icon: '🚀', group: 'community' },
  community_shoutout: { label: 'Shoutouts', icon: '📢', group: 'community' },
  community_gift: { label: 'Gifts', icon: '🎁', group: 'community' },
  utility_analytics: { label: 'Analytics', icon: '📊', group: 'utility' },
  utility_export: { label: 'Export', icon: '📤', group: 'utility' },
  utility_support: { label: 'Support', icon: '🛎️', group: 'utility' },
  utility_beta: { label: 'Beta Access', icon: '🔬', group: 'utility' },
  trainer_promotion: { label: 'Promotion', icon: '📈', group: 'trainer' },
  trainer_verification: { label: 'Verification', icon: '✅', group: 'trainer' },
  prestige_hall_of_fame: { label: 'Hall of Fame', icon: '👑', group: 'prestige' },
  prestige_title: { label: 'Titles', icon: '🏷️', group: 'prestige' },
};

const GROUPS = [
  { key: 'all', label: 'All Items', icon: '🛒' },
  { key: 'featured', label: 'Featured', icon: '⭐' },
  { key: 'buddy', label: 'Training Buddy', icon: '🐺' },
  { key: 'cosmetic', label: 'App Cosmetics', icon: '🎨' },
  { key: 'community', label: 'Community', icon: '👥' },
  { key: 'utility', label: 'Utilities', icon: '🛠️' },
  { key: 'trainer', label: 'Trainer', icon: '🏋️' },
  { key: 'prestige', label: 'Prestige', icon: '👑' },
];

export default function Store() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [itemsRes, featuredRes, inventoryRes, walletRes] = await Promise.all([
        fetch('/api/store/items?limit=200', { headers }),
        fetch('/api/store/featured', { headers }),
        fetch('/api/store/inventory', { headers }),
        fetch('/api/wallet', { headers }),
      ]);

      const [itemsData, featuredData, inventoryData, walletData] = await Promise.all([
        itemsRes.json(),
        featuredRes.json(),
        inventoryRes.json(),
        walletRes.json(),
      ]);

      setItems(itemsData.data || []);
      setFeaturedItems(featuredData.data || []);
      setInventory(inventoryData.data || []);
      setWallet(walletData.data);
    } catch {
      // Error occurred
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (sku) => {
    setPurchasing(true);
    try {
      const res = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sku }),
      });
      const data = await res.json();

      if (data.data?.success) {
        setSelectedItem(null);
        showSnackbar('Purchase successful!', 'success');
        fetchData();
      } else {
        showSnackbar(data.error?.message || 'Purchase failed', 'error');
      }
    } catch (_err) {
      showSnackbar('Purchase failed', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const showSnackbar = (message, type) => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const isOwned = (sku) => inventory.some(i => i.sku === sku);
  const canAfford = (price) => (wallet?.balance || 0) >= price;

  const getDisplayItems = () => {
    let filtered = items;

    if (selectedGroup === 'featured') {
      filtered = featuredItems;
    } else if (selectedGroup !== 'all') {
      filtered = items.filter(item => {
        const config = CATEGORY_CONFIG[item.category];
        return config?.group === selectedGroup;
      });
    }

    if (selectedRarity !== 'all') {
      filtered = filtered.filter(item => item.rarity === selectedRarity);
    }

    return filtered;
  };

  const groupedItems = getDisplayItems();

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
            <h1 className="text-xl font-semibold">Store</h1>
          </div>
          <Link to="/wallet" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl transition-all hover:opacity-90">
            <Icons.Sparkle />
            <span className="font-bold">{(wallet?.balance || 0).toLocaleString()}</span>
            <span className="text-sm opacity-80">credits</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Featured Banner */}
        {featuredItems.length > 0 && selectedGroup === 'all' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Fire className="text-orange-500" />
              <h2 className="text-lg font-semibold">Featured Items</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {featuredItems.slice(0, 4).map(item => (
                <ItemCard
                  key={item.sku}
                  item={item}
                  owned={isOwned(item.sku)}
                  canAfford={canAfford(item.priceCredits || item.price_credits)}
                  onClick={() => setSelectedItem(item)}
                  featured
                />
              ))}
            </div>
          </div>
        )}

        {/* Group Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {GROUPS.map(group => (
            <button
              key={group.key}
              onClick={() => setSelectedGroup(group.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all',
                selectedGroup === group.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              <span>{group.icon}</span>
              <span className="text-sm font-medium">{group.label}</span>
            </button>
          ))}
        </div>

        {/* Rarity Filter */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 overflow-x-auto">
          {['all', ...Object.keys(RARITY_CONFIG)].map(rarity => (
            <button
              key={rarity}
              onClick={() => setSelectedRarity(rarity)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize whitespace-nowrap',
                selectedRarity === rarity ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {rarity}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {groupedItems.map(item => (
            <ItemCard
              key={item.sku}
              item={item}
              owned={isOwned(item.sku)}
              canAfford={canAfford(item.priceCredits || item.price_credits)}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>

        {groupedItems.length === 0 && (
          <div className="text-center py-16">
            <Icons.ShoppingCart className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No items found</p>
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header gradient */}
              <div className={clsx(
                'h-32 bg-gradient-to-br relative',
                RARITY_CONFIG[selectedItem.rarity]?.color || 'from-gray-500 to-gray-600'
              )}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-50">
                    {CATEGORY_CONFIG[selectedItem.category]?.icon || '📦'}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
                    RARITY_CONFIG[selectedItem.rarity]?.color
                  )}>
                    {RARITY_CONFIG[selectedItem.rarity]?.label || 'Common'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10">
                    {CATEGORY_CONFIG[selectedItem.category]?.label || selectedItem.category}
                  </span>
                  {isOwned(selectedItem.sku) && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                      Owned
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-2">{selectedItem.name}</h2>
                <p className="text-gray-400 mb-6">{selectedItem.description}</p>

                {isOwned(selectedItem.sku) ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                      <Icons.Check className="w-8 h-8 mx-auto text-green-400 mb-2" />
                      <p className="font-medium text-green-400">You own this item</p>
                    </div>
                    {selectedItem.category?.includes('buddy') && (
                      <Link
                        to="/buddy"
                        className="block w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold text-center transition-all"
                      >
                        Equip in Buddy Settings
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <span className="text-gray-400">Price</span>
                      <div className="flex items-center gap-2">
                        <Icons.Sparkle className="text-violet-400" />
                        <span className="text-xl font-bold">
                          {(selectedItem.priceCredits || selectedItem.price_credits || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {!canAfford(selectedItem.priceCredits || selectedItem.price_credits) ? (
                      <div className="space-y-2">
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                          <p className="text-red-400 font-medium">Insufficient credits</p>
                          <p className="text-sm text-gray-400">
                            You need {((selectedItem.priceCredits || selectedItem.price_credits) - (wallet?.balance || 0)).toLocaleString()} more credits
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
                      <button
                        onClick={() => purchaseItem(selectedItem.sku)}
                        disabled={purchasing}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
                      >
                        {purchasing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </span>
                        ) : (
                          'Purchase'
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
              >
                <Icons.Close />
              </button>
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

function ItemCard({ item, owned, canAfford, onClick, featured }) {
  const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const category = CATEGORY_CONFIG[item.category];
  const price = item.priceCredits || item.price_credits || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-2xl border cursor-pointer transition-all',
        rarity.border, rarity.bg,
        featured && 'ring-2 ring-amber-500/50'
      )}
    >
      {owned && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <Icons.Check />
        </div>
      )}

      {featured && (
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500 text-black">
            Featured
          </span>
        </div>
      )}

      <div className={clsx('h-20 bg-gradient-to-br flex items-center justify-center', rarity.color, 'opacity-30')}>
        <span className="text-4xl">{category?.icon || '📦'}</span>
      </div>

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

        <h3 className="font-semibold mb-1 line-clamp-1">{item.name}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{item.description}</p>

        {!owned && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Icons.Sparkle className={canAfford ? 'text-violet-400' : 'text-red-400'} />
              <span className={clsx('font-bold', canAfford ? 'text-white' : 'text-red-400')}>
                {price.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
