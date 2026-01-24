import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  COLLECTION_STATS_QUERY,
  COLLECTION_ITEMS_QUERY,
  COLLECTION_FAVORITES_QUERY,
  COLLECTION_SETS_QUERY,
  COLLECTION_SHOWCASE_QUERY,
  COLLECTION_NEW_COUNT_QUERY,
  TOGGLE_FAVORITE_MUTATION,
  MARK_ITEM_SEEN_MUTATION,
  MARK_ALL_SEEN_MUTATION,
  CLAIM_SET_REWARD_MUTATION,
} from '../graphql';

// =====================================================
// TYPES
// =====================================================

interface CollectionItem {
  id: string;
  cosmeticId: string;
  name: string;
  description?: string;
  category?: string;
  rarity: string;
  icon?: string;
  previewUrl?: string;
  acquiredAt: string;
  isFavorite: boolean;
  isNew: boolean;
  estimatedValue?: number;
  isTradeable?: boolean;
  isGiftable?: boolean;
}

interface CollectionStats {
  totalOwned: number;
  totalValue: number;
  rarityBreakdown: { rarity: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  completedSets: number;
}

interface CollectionSet {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  theme?: string;
  isLimited: boolean;
  expirationDate?: string;
  ownedCount: number;
  totalCount: number;
  rewards: SetRewardInfo[];
}

interface SetRewardInfo {
  threshold: number;
  icon?: string;
  description: string;
  claimed: boolean;
}

interface _SetItem {
  id: string;
  name: string;
  icon?: string;
  rarity: string;
  owned: boolean;
}

// =====================================================
// ICONS
// =====================================================

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Grid: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>,
  Star: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  StarFilled: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Gift: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  Puzzle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>,
  Trophy: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>,
  Tag: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  New: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
};

// =====================================================
// CONSTANTS
// =====================================================

const RARITY_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; textColor: string }> = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10', textColor: 'text-gray-400' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10', textColor: 'text-green-400' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10', textColor: 'text-blue-400' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10', textColor: 'text-purple-400' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10', textColor: 'text-amber-400' },
  mythic: { label: 'Mythic', color: 'from-pink-500 to-rose-600', border: 'border-pink-500/30', bg: 'bg-pink-500/10', textColor: 'text-pink-400' },
  divine: { label: 'Divine', color: 'from-cyan-400 to-sky-500', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10', textColor: 'text-cyan-400' },
};

const TABS = [
  { key: 'all', label: 'All Items', icon: <Icons.Grid /> },
  { key: 'favorites', label: 'Favorites', icon: <Icons.StarFilled /> },
  { key: 'sets', label: 'Sets', icon: <Icons.Puzzle /> },
  { key: 'showcase', label: 'Showcase', icon: <Icons.Eye /> },
];

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'skin', label: 'Skins' },
  { key: 'frame', label: 'Frames' },
  { key: 'badge', label: 'Badges' },
  { key: 'effect', label: 'Effects' },
  { key: 'theme', label: 'Themes' },
  { key: 'emote', label: 'Emotes' },
  { key: 'title', label: 'Titles' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Collection() {
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [selectedSet, setSelectedSet] = useState<CollectionSet | null>(null);
  const [viewMode, setViewMode] = useState('grid');
  const [category, setCategory] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  // GraphQL Queries
  const { data: statsData } = useQuery(COLLECTION_STATS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: itemsData, loading } = useQuery(COLLECTION_ITEMS_QUERY, {
    variables: {
      category: category !== 'all' ? category : undefined,
      rarity: rarity !== 'all' ? rarity : undefined,
      sortBy: 'acquired',
      limit: 100,
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: favoritesData } = useQuery(COLLECTION_FAVORITES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: setsData } = useQuery(COLLECTION_SETS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: showcaseData } = useQuery(COLLECTION_SHOWCASE_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: newCountData, refetch: refetchNewCount } = useQuery(COLLECTION_NEW_COUNT_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL Mutations
  const [toggleFavoriteMutation] = useMutation(TOGGLE_FAVORITE_MUTATION);
  const [markItemSeenMutation] = useMutation(MARK_ITEM_SEEN_MUTATION);
  const [markAllSeenMutation] = useMutation(MARK_ALL_SEEN_MUTATION);
  const [claimSetRewardMutation] = useMutation(CLAIM_SET_REWARD_MUTATION);

  // Derived Data
  const stats: CollectionStats | null = statsData?.collectionStats || null;
  const items: CollectionItem[] = itemsData?.collectionItems?.items || [];
  const favorites: CollectionItem[] = favoritesData?.collectionFavorites || [];
  const sets: CollectionSet[] = setsData?.collectionSets || [];
  const showcase: CollectionItem[] = showcaseData?.collectionShowcase || [];
  const newCount: number = newCountData?.collectionNewCount || 0;

  // Build rarity breakdown object for display
  const rarityBreakdown: Record<string, number> = {};
  if (stats?.rarityBreakdown) {
    stats.rarityBreakdown.forEach((r) => {
      rarityBreakdown[r.rarity] = r.count;
    });
  }

  // =====================================================
  // ACTIONS
  // =====================================================

  const showSnackbar = useCallback((message: string, type = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const toggleFavorite = async (itemId: string) => {
    try {
      const { data } = await toggleFavoriteMutation({
        variables: { itemId },
        refetchQueries: [
          { query: COLLECTION_ITEMS_QUERY, variables: { category: category !== 'all' ? category : undefined, rarity: rarity !== 'all' ? rarity : undefined, sortBy: 'acquired', limit: 100 } },
          { query: COLLECTION_FAVORITES_QUERY },
        ],
      });

      if (data?.toggleFavorite) {
        showSnackbar(data.toggleFavorite.isFavorite ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch {
      showSnackbar('Failed to update favorite', 'error');
    }
  };

  const markAsSeen = async (itemId: string) => {
    try {
      await markItemSeenMutation({ variables: { itemId } });
      refetchNewCount();
    } catch {
      // Silent fail
    }
  };

  const markAllSeen = async () => {
    try {
      await markAllSeenMutation();
      refetchNewCount();
      showSnackbar('All items marked as seen');
    } catch {
      showSnackbar('Failed to mark all as seen', 'error');
    }
  };

  const claimSetReward = async (setId: string, threshold: number) => {
    try {
      const { data } = await claimSetRewardMutation({
        variables: { setId, threshold },
        refetchQueries: [{ query: COLLECTION_SETS_QUERY }],
      });

      if (data?.claimSetReward?.success) {
        showSnackbar(`Reward claimed: ${data.claimSetReward.reward?.description || 'Success!'}`, 'success');
        setSelectedSet(null);
      } else {
        showSnackbar('Failed to claim reward', 'error');
      }
    } catch {
      showSnackbar('Failed to claim reward', 'error');
    }
  };

  const isFavorite = (itemId: string) => favorites.some(f => f.id === itemId);

  // =====================================================
  // RENDER
  // =====================================================

  const getDisplayItems = (): CollectionItem[] => {
    switch (activeTab) {
      case 'favorites':
        return favorites;
      case 'showcase':
        return showcase;
      default:
        return items;
    }
  };

  if (loading && !stats) {
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">My Collection</h1>
            {newCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-violet-600 rounded-full">
                {newCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <button
                onClick={markAllSeen}
                className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                Mark all seen
              </button>
            )}
            <Link
              to="/marketplace"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
            >
              <Icons.Tag />
              <span className="hidden sm:inline">Browse</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl">
              <p className="text-3xl font-bold">{stats.totalOwned || 0}</p>
              <p className="text-sm text-gray-400">Total Items</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-3xl font-bold text-green-400">
                {(stats.totalValue || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">Est. Value</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-3xl font-bold text-amber-400">
                {rarityBreakdown.legendary || 0}
              </p>
              <p className="text-sm text-gray-400">Legendaries</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-3xl font-bold text-pink-400">
                {stats.completedSets || 0}
              </p>
              <p className="text-sm text-gray-400">Sets Complete</p>
            </div>
          </div>
        )}

        {/* Rarity Breakdown */}
        {Object.keys(rarityBreakdown).length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {Object.entries(RARITY_CONFIG).map(([key, config]) => {
                const count = rarityBreakdown[key] || 0;
                return (
                  <button
                    key={key}
                    onClick={() => setRarity(rarity === key ? 'all' : key)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all',
                      rarity === key ? config.bg + ' ' + config.border + ' border' : 'bg-white/5'
                    )}
                  >
                    <span className={clsx('w-3 h-3 rounded-full bg-gradient-to-r', config.color)} />
                    <span className="text-sm">{config.label}</span>
                    <span className={clsx('text-sm font-bold', config.textColor)}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
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
                <span className="text-sm font-medium hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx('p-2 rounded-lg', viewMode === 'grid' && 'bg-white/10')}
              >
                <Icons.Grid />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx('p-2 rounded-lg', viewMode === 'list' && 'bg-white/10')}
              >
                <Icons.List />
              </button>
            </div>
          </div>
        </div>

        {/* Items Grid/List */}
        {activeTab === 'sets' ? (
          <SetsView
            sets={sets}
            onSelectSet={setSelectedSet}
          />
        ) : (
          <>
            {getDisplayItems().length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 mx-auto text-gray-600 mb-4">
                  <Icons.Gift />
                </div>
                <p className="text-gray-400">
                  {activeTab === 'favorites' ? 'No favorites yet' : 'No items in collection'}
                </p>
                <Link
                  to={activeTab === 'favorites' ? '#' : '/mystery-boxes'}
                  className="inline-block mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
                >
                  {activeTab === 'favorites' ? 'Mark some favorites' : 'Open Mystery Boxes'}
                </Link>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {getDisplayItems().map(item => (
                  <CollectionItemCard
                    key={item.id}
                    item={item}
                    isFavorite={isFavorite(item.id)}
                    onFavoriteToggle={() => toggleFavorite(item.id)}
                    onClick={() => {
                      setSelectedItem(item);
                      if (item.isNew) markAsSeen(item.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {getDisplayItems().map(item => (
                  <CollectionItemRow
                    key={item.id}
                    item={item}
                    isFavorite={isFavorite(item.id)}
                    onFavoriteToggle={() => toggleFavorite(item.id)}
                    onClick={() => {
                      setSelectedItem(item);
                      if (item.isNew) markAsSeen(item.id);
                    }}
                  />
                ))}
              </div>
            )}
          </>
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
              <ItemDetailModal
                item={selectedItem}
                isFavorite={isFavorite(selectedItem.id)}
                onFavoriteToggle={() => toggleFavorite(selectedItem.id)}
                onClose={() => setSelectedItem(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Set Detail Modal */}
      <AnimatePresence>
        {selectedSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSet(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <SetDetailModal
                set={selectedSet}
                onClaimReward={claimSetReward}
                onClose={() => setSelectedSet(null)}
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
// COLLECTION ITEM CARD
// =====================================================

interface CollectionItemCardProps {
  item: CollectionItem;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onClick: () => void;
}

function CollectionItemCard({ item, isFavorite, onFavoriteToggle, onClick }: CollectionItemCardProps) {
  const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-2xl border cursor-pointer transition-all',
        rarity.border, rarity.bg
      )}
    >
      {/* New Badge */}
      {item.isNew && (
        <div className="absolute top-2 left-2 z-10">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-600 text-white">
            NEW
          </span>
        </div>
      )}

      {/* Favorite Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
      >
        {isFavorite ? <Icons.StarFilled className="text-amber-400 w-4 h-4" /> : <Icons.Star className="w-4 h-4" />}
      </button>

      {/* Item Preview */}
      <div className={clsx('h-20 bg-gradient-to-br flex items-center justify-center', rarity.color, 'opacity-30')}>
        <span className="text-4xl">{item.icon || '🎨'}</span>
      </div>

      <div className="p-3">
        <span className={clsx(
          'inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white mb-1',
          rarity.color
        )}>
          {rarity.label}
        </span>
        <h3 className="font-medium text-sm truncate">{item.name}</h3>
        <p className="text-xs text-gray-400 mt-1">
          Acquired {new Date(item.acquiredAt).toLocaleDateString()}
        </p>
      </div>
    </motion.div>
  );
}

// =====================================================
// COLLECTION ITEM ROW
// =====================================================

interface CollectionItemRowProps {
  item: CollectionItem;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onClick: () => void;
}

function CollectionItemRow({ item, isFavorite, onFavoriteToggle, onClick }: CollectionItemRowProps) {
  const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all hover:bg-white/5',
        rarity.border, rarity.bg
      )}
    >
      <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', rarity.color, 'opacity-50')}>
        <span className="text-2xl">{item.icon || '🎨'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{item.name}</h3>
          {item.isNew && (
            <span className="px-2 py-0.5 text-xs bg-violet-600 rounded-full">NEW</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className={rarity.textColor}>{rarity.label}</span>
          <span>•</span>
          <span>{new Date(item.acquiredAt).toLocaleDateString()}</span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
      >
        {isFavorite ? <Icons.StarFilled className="text-amber-400" /> : <Icons.Star />}
      </button>
    </div>
  );
}

// =====================================================
// SETS VIEW
// =====================================================

interface SetsViewProps {
  sets: CollectionSet[];
  onSelectSet: (set: CollectionSet) => void;
}

function SetsView({ sets, onSelectSet }: SetsViewProps) {
  if (sets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 mx-auto text-gray-600 mb-4">
          <Icons.Puzzle />
        </div>
        <p className="text-gray-400">No sets available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sets.map(set => {
        const progress = set.ownedCount / set.totalCount;
        const isComplete = progress >= 1;

        return (
          <motion.div
            key={set.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => onSelectSet(set)}
            className={clsx(
              'p-4 rounded-xl border cursor-pointer transition-all',
              isComplete
                ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{set.icon || '📦'}</span>
              <div>
                <h3 className="font-semibold">{set.name}</h3>
                <p className="text-sm text-gray-400">{set.description}</p>
              </div>
              {isComplete && <Icons.Trophy className="text-amber-400 ml-auto" />}
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Progress</span>
                <span className={isComplete ? 'text-amber-400' : 'text-gray-400'}>
                  {set.ownedCount}/{set.totalCount}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    isComplete ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-violet-600'
                  )}
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
            </div>

            {/* Rewards Preview */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Icons.Gift className="w-4 h-4" />
              <span>{set.rewards?.length || 0} rewards available</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// =====================================================
// ITEM DETAIL MODAL
// =====================================================

interface ItemDetailModalProps {
  item: CollectionItem;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onClose: () => void;
}

function ItemDetailModal({ item, isFavorite, onFavoriteToggle, onClose }: ItemDetailModalProps) {
  const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

  return (
    <>
      <div className={clsx('h-40 bg-gradient-to-br relative', rarity.color)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl opacity-50">{item.icon || '🎨'}</span>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
        >
          <Icons.Close />
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
            rarity.color
          )}>
            {rarity.label}
          </span>
          <button
            onClick={onFavoriteToggle}
            className={clsx(
              'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
              isFavorite ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400'
            )}
          >
            {isFavorite ? <Icons.StarFilled className="w-3 h-3" /> : <Icons.Star className="w-3 h-3" />}
            {isFavorite ? 'Favorite' : 'Add to Favorites'}
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-2">{item.name}</h2>
        <p className="text-gray-400 mb-4">{item.description}</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <span className="text-gray-400">Category</span>
            <span className="capitalize">{item.category}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <span className="text-gray-400">Acquired</span>
            <span>{new Date(item.acquiredAt).toLocaleDateString()}</span>
          </div>
          {item.estimatedValue && (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <span className="text-gray-400">Est. Value</span>
              <div className="flex items-center gap-1">
                <Icons.Sparkle className="text-violet-400 w-4 h-4" />
                <span>{item.estimatedValue.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            to={`/marketplace/create?item=${item.id}`}
            className="py-3 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold text-center transition-all"
          >
            Sell on Market
          </Link>
          <Link
            to={`/trades/new?item=${item.id}`}
            className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-center transition-all"
          >
            Trade
          </Link>
        </div>
      </div>
    </>
  );
}

// =====================================================
// SET DETAIL MODAL
// =====================================================

interface SetDetailModalProps {
  set: CollectionSet;
  onClaimReward: (setId: string, threshold: number) => void;
  onClose: () => void;
}

function SetDetailModal({ set, onClaimReward, onClose }: SetDetailModalProps) {
  const progress = set.ownedCount / set.totalCount;
  const isComplete = progress >= 1;

  return (
    <>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{set.icon || '📦'}</span>
            <div>
              <h2 className="text-xl font-semibold">{set.name}</h2>
              <p className="text-sm text-gray-400">{set.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
            <Icons.Close />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Collection Progress</span>
            <span className={isComplete ? 'text-amber-400 font-bold' : 'text-gray-400'}>
              {set.ownedCount}/{set.totalCount} ({Math.round(progress * 100)}%)
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                isComplete ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-violet-600'
              )}
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        </div>

        {/* Rewards */}
        <div>
          <h3 className="text-sm text-gray-400 mb-3">Rewards</h3>
          <div className="space-y-2">
            {(set.rewards || []).map((reward, i) => {
              const threshold = reward.threshold * 100;
              const canClaim = progress >= reward.threshold && !reward.claimed;

              return (
                <div
                  key={i}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-xl',
                    reward.claimed ? 'bg-green-500/10 border border-green-500/30' :
                    canClaim ? 'bg-amber-500/10 border border-amber-500/30' :
                    'bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{reward.icon || '🎁'}</span>
                    <div>
                      <p className="font-medium">{reward.description}</p>
                      <p className="text-sm text-gray-400">At {threshold}% completion</p>
                    </div>
                  </div>

                  {reward.claimed ? (
                    <span className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-full">
                      Claimed
                    </span>
                  ) : canClaim ? (
                    <button
                      onClick={() => onClaimReward(set.id, reward.threshold)}
                      className="px-3 py-1 text-sm bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="px-3 py-1 text-sm bg-white/10 text-gray-400 rounded-full">
                      {Math.round((reward.threshold - progress) * set.totalCount)} more
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
