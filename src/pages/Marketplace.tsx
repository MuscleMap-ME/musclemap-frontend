import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

// =====================================================
// ICONS
// =====================================================

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Filter: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  Heart: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
  HeartFilled: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Tag: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  ShoppingBag: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>,
  Gavel: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  Exchange: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>,
  Gift: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
};

// =====================================================
// CONSTANTS
// =====================================================

const RARITY_CONFIG = {
  common: { label: 'Common', color: 'from-gray-500 to-gray-600', border: 'border-gray-500/30', bg: 'bg-gray-500/10', textColor: 'text-gray-400' },
  uncommon: { label: 'Uncommon', color: 'from-green-500 to-emerald-600', border: 'border-green-500/30', bg: 'bg-green-500/10', textColor: 'text-green-400' },
  rare: { label: 'Rare', color: 'from-blue-500 to-cyan-600', border: 'border-blue-500/30', bg: 'bg-blue-500/10', textColor: 'text-blue-400' },
  epic: { label: 'Epic', color: 'from-purple-500 to-violet-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10', textColor: 'text-purple-400' },
  legendary: { label: 'Legendary', color: 'from-amber-400 to-orange-500', border: 'border-amber-500/30', bg: 'bg-amber-500/10', textColor: 'text-amber-400' },
  mythic: { label: 'Mythic', color: 'from-pink-500 to-rose-600', border: 'border-pink-500/30', bg: 'bg-pink-500/10', textColor: 'text-pink-400' },
  divine: { label: 'Divine', color: 'from-cyan-400 to-sky-500', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10', textColor: 'text-cyan-400' },
};

const LISTING_TYPES = [
  { key: 'all', label: 'All', icon: <Icons.ShoppingBag /> },
  { key: 'buy_now', label: 'Buy Now', icon: <Icons.Tag /> },
  { key: 'auction', label: 'Auctions', icon: <Icons.Gavel /> },
  { key: 'offer_only', label: 'Offers', icon: <Icons.Exchange /> },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'ending_soon', label: 'Ending Soon' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'popular', label: 'Most Popular' },
];

const CATEGORY_OPTIONS = [
  { key: 'all', label: 'All Categories' },
  { key: 'skin', label: 'Skins' },
  { key: 'frame', label: 'Profile Frames' },
  { key: 'badge', label: 'Badges' },
  { key: 'effect', label: 'Effects' },
  { key: 'theme', label: 'Themes' },
  { key: 'emote', label: 'Emotes' },
  { key: 'title', label: 'Titles' },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Marketplace() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [listings, setListings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [listingType, setListingType] = useState(searchParams.get('type') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [rarity, setRarity] = useState(searchParams.get('rarity') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchListings = useCallback(async (resetCursor = true) => {
    if (resetCursor) {
      setLoading(true);
      setCursor(null);
    }

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (listingType !== 'all') params.set('listingType', listingType);
      if (category !== 'all') params.set('category', category);
      if (rarity !== 'all') params.set('rarity', rarity);
      if (sortBy) params.set('sortBy', sortBy);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (!resetCursor && cursor) params.set('cursor', cursor);
      params.set('limit', '24');

      const res = await fetch(`/api/marketplace?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (resetCursor) {
        setListings(data.data?.listings || []);
      } else {
        setListings(prev => [...prev, ...(data.data?.listings || [])]);
      }

      setCursor(data.data?.nextCursor || null);
      setHasMore(!!data.data?.nextCursor);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, listingType, category, rarity, sortBy, minPrice, maxPrice, cursor]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [walletRes, watchlistRes, statsRes] = await Promise.all([
        fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/marketplace/watchlist', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/marketplace/my-stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [walletData, watchlistData, statsData] = await Promise.all([
        walletRes.json(),
        watchlistRes.json(),
        statsRes.json(),
      ]);

      setWallet(walletData.data);
      setWatchlist(watchlistData.data || []);
      setMyStats(statsData.data);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchInitialData();
    fetchListings(true);
  }, [fetchInitialData, fetchListings]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (listingType !== 'all') params.set('type', listingType);
    if (category !== 'all') params.set('category', category);
    if (rarity !== 'all') params.set('rarity', rarity);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    setSearchParams(params);
  }, [search, listingType, category, rarity, sortBy, minPrice, maxPrice, setSearchParams]);

  // =====================================================
  // ACTIONS
  // =====================================================

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'success' }), 3000);
  };

  const buyNow = async (listingId) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.data?.success) {
        showSnackbar('Purchase successful!', 'success');
        setSelectedListing(null);
        fetchListings(true);
        fetchInitialData();
      } else {
        showSnackbar(data.error?.message || 'Purchase failed', 'error');
      }
    } catch (err) {
      showSnackbar('Purchase failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const makeOffer = async (listingId) => {
    if (!offerAmount || parseInt(offerAmount) <= 0) {
      showSnackbar('Please enter a valid offer amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseInt(offerAmount),
          message: offerMessage || undefined,
        }),
      });
      const data = await res.json();

      if (data.data) {
        showSnackbar('Offer submitted!', 'success');
        setOfferAmount('');
        setOfferMessage('');
        setSelectedListing(null);
      } else {
        showSnackbar(data.error?.message || 'Failed to submit offer', 'error');
      }
    } catch (err) {
      showSnackbar('Failed to submit offer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWatchlist = async (listingId) => {
    const isWatched = watchlist.some(w => w.listing_id === listingId);

    try {
      if (isWatched) {
        await fetch(`/api/marketplace/watchlist/${listingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setWatchlist(prev => prev.filter(w => w.listing_id !== listingId));
      } else {
        await fetch('/api/marketplace/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ listingId }),
        });
        setWatchlist(prev => [...prev, { listing_id: listingId }]);
      }
    } catch (err) {
      console.error('Failed to update watchlist:', err);
    }
  };

  const isWatched = (listingId) => watchlist.some(w => w.listing_id === listingId);
  const canAfford = (price) => (wallet?.balance || 0) >= price;

  // =====================================================
  // RENDER
  // =====================================================

  if (loading && listings.length === 0) {
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
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Marketplace</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/marketplace/my-listings"
              className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              My Listings
            </Link>
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        {myStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-gray-400">Total Sales</p>
              <p className="text-xl font-bold">{myStats.totalSales || 0}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-gray-400">Revenue</p>
              <p className="text-xl font-bold">{(myStats.totalRevenue || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-gray-400">Purchases</p>
              <p className="text-xl font-bold">{myStats.totalPurchases || 0}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-gray-400">Seller Level</p>
              <p className="text-xl font-bold">{myStats.sellerLevel || 1}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search marketplace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'px-4 py-3 rounded-xl transition-colors',
              showFilters ? 'bg-violet-600' : 'bg-white/5 hover:bg-white/10'
            )}
          >
            <Icons.Filter />
          </button>
          <Link
            to="/marketplace/create"
            className="flex items-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
          >
            <Icons.Plus />
            <span className="hidden sm:inline">Sell Item</span>
          </Link>
        </div>

        {/* Listing Type Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {LISTING_TYPES.map(type => (
            <button
              key={type.key}
              onClick={() => setListingType(type.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all',
                listingType === type.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              {type.icon}
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/5 rounded-xl mb-6">
                {/* Category */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Rarity */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Rarity</label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    <option value="all">All Rarities</option>
                    {Object.entries(RARITY_CONFIG).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Price Range</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-1/2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-1/2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listings Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isWatched={isWatched(listing.id)}
              canAfford={canAfford(listing.price)}
              onWatchlistToggle={() => toggleWatchlist(listing.id)}
              onClick={() => setSelectedListing(listing)}
            />
          ))}
        </div>

        {listings.length === 0 && !loading && (
          <div className="text-center py-16">
            <Icons.ShoppingBag className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No listings found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Load More */}
        {hasMore && listings.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={() => fetchListings(false)}
              disabled={loading}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <Link to="/trades" className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center">
            <Icons.Exchange className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="font-medium">Trading</p>
            <p className="text-sm text-gray-400">P2P Trades</p>
          </Link>
          <Link to="/collection" className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center">
            <Icons.Eye className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="font-medium">Collection</p>
            <p className="text-sm text-gray-400">Your Items</p>
          </Link>
          <Link to="/mystery-boxes" className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center">
            <Icons.Gift className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="font-medium">Mystery Boxes</p>
            <p className="text-sm text-gray-400">Open Boxes</p>
          </Link>
          <Link to="/marketplace/watchlist" className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center">
            <Icons.Heart className="w-8 h-8 mx-auto mb-2 text-pink-400" />
            <p className="font-medium">Watchlist</p>
            <p className="text-sm text-gray-400">{watchlist.length} items</p>
          </Link>
        </div>
      </main>

      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedListing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <ListingDetailModal
                listing={selectedListing}
                wallet={wallet}
                canAfford={canAfford(selectedListing.price)}
                isWatched={isWatched(selectedListing.id)}
                onWatchlistToggle={() => toggleWatchlist(selectedListing.id)}
                onBuyNow={() => buyNow(selectedListing.id)}
                onMakeOffer={() => makeOffer(selectedListing.id)}
                offerAmount={offerAmount}
                setOfferAmount={setOfferAmount}
                offerMessage={offerMessage}
                setOfferMessage={setOfferMessage}
                submitting={submitting}
                onClose={() => setSelectedListing(null)}
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
// LISTING CARD COMPONENT
// =====================================================

function ListingCard({ listing, isWatched, canAfford, onWatchlistToggle, onClick }) {
  const rarity = RARITY_CONFIG[listing.rarity] || RARITY_CONFIG.common;
  const timeLeft = getTimeLeft(listing.expires_at);

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
      {/* Watchlist Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onWatchlistToggle(); }}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
      >
        {isWatched ? <Icons.HeartFilled className="text-pink-500" /> : <Icons.Heart />}
      </button>

      {/* Listing Type Badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className={clsx(
          'px-2 py-0.5 text-xs font-medium rounded-full',
          listing.listing_type === 'auction' ? 'bg-amber-500 text-black' :
          listing.listing_type === 'offer_only' ? 'bg-blue-500 text-white' :
          'bg-green-500 text-black'
        )}>
          {listing.listing_type === 'auction' ? 'Auction' :
           listing.listing_type === 'offer_only' ? 'Offers' : 'Buy Now'}
        </span>
      </div>

      {/* Item Preview */}
      <div className={clsx('h-24 bg-gradient-to-br flex items-center justify-center', rarity.color, 'opacity-30')}>
        <span className="text-5xl">{listing.cosmetic_icon || '🎨'}</span>
      </div>

      <div className="p-4">
        {/* Rarity Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
            rarity.color
          )}>
            {rarity.label}
          </span>
        </div>

        <h3 className="font-semibold mb-1 line-clamp-1">{listing.cosmetic_name || listing.name}</h3>

        {/* Time Left (for auctions) */}
        {listing.listing_type === 'auction' && timeLeft && (
          <div className="flex items-center gap-1 text-sm text-amber-400 mb-2">
            <Icons.Clock className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Icons.Sparkle className={clsx('w-4 h-4', canAfford ? 'text-violet-400' : 'text-red-400')} />
            <span className={clsx('font-bold', canAfford ? 'text-white' : 'text-red-400')}>
              {(listing.price || 0).toLocaleString()}
            </span>
          </div>
          {listing.bid_count > 0 && (
            <span className="text-xs text-gray-400">{listing.bid_count} bids</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// =====================================================
// LISTING DETAIL MODAL
// =====================================================

function ListingDetailModal({
  listing,
  wallet,
  canAfford,
  isWatched,
  onWatchlistToggle,
  onBuyNow,
  onMakeOffer,
  offerAmount,
  setOfferAmount,
  offerMessage,
  setOfferMessage,
  submitting,
  onClose,
}) {
  const rarity = RARITY_CONFIG[listing.rarity] || RARITY_CONFIG.common;
  const [showOfferForm, setShowOfferForm] = useState(false);

  return (
    <>
      {/* Header gradient */}
      <div className={clsx(
        'h-40 bg-gradient-to-br relative',
        rarity.color
      )}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl opacity-50">{listing.cosmetic_icon || '🎨'}</span>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 transition-all"
        >
          <Icons.Close />
        </button>
      </div>

      <div className="p-6">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
            rarity.color
          )}>
            {rarity.label}
          </span>
          <span className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            listing.listing_type === 'auction' ? 'bg-amber-500/20 text-amber-400' :
            listing.listing_type === 'offer_only' ? 'bg-blue-500/20 text-blue-400' :
            'bg-green-500/20 text-green-400'
          )}>
            {listing.listing_type === 'auction' ? 'Auction' :
             listing.listing_type === 'offer_only' ? 'Offers Only' : 'Buy Now'}
          </span>
          <button
            onClick={onWatchlistToggle}
            className={clsx(
              'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
              isWatched ? 'bg-pink-500/20 text-pink-400' : 'bg-white/10 text-gray-400'
            )}
          >
            {isWatched ? <Icons.HeartFilled className="w-3 h-3" /> : <Icons.Heart className="w-3 h-3" />}
            {isWatched ? 'Watching' : 'Watch'}
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-2">{listing.cosmetic_name || listing.name}</h2>
        <p className="text-gray-400 mb-4">{listing.cosmetic_description || listing.description}</p>

        {/* Seller Info */}
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-lg font-bold">
            {(listing.seller_username || 'S')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{listing.seller_username || 'Seller'}</p>
            <p className="text-sm text-gray-400">
              {listing.seller_rating ? `${listing.seller_rating}% positive` : 'New seller'}
            </p>
          </div>
        </div>

        {/* Price Display */}
        <div className="p-4 bg-white/5 rounded-xl mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">
              {listing.listing_type === 'auction' ? 'Current Bid' : 'Price'}
            </span>
            <div className="flex items-center gap-2">
              <Icons.Sparkle className="text-violet-400" />
              <span className="text-2xl font-bold">{(listing.price || 0).toLocaleString()}</span>
            </div>
          </div>
          {listing.listing_type === 'auction' && (
            <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
              <span>Min bid increment: {listing.bid_increment}</span>
              <span>{listing.bid_count || 0} bids</span>
            </div>
          )}
        </div>

        {/* Your Balance */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-4">
          <span className="text-gray-400">Your Balance</span>
          <div className="flex items-center gap-2">
            <Icons.Sparkle className="text-violet-400 w-4 h-4" />
            <span className="font-bold">{(wallet?.balance || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        {listing.listing_type === 'buy_now' && (
          <div className="space-y-3">
            {!canAfford ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                <p className="text-red-400 font-medium">Insufficient credits</p>
                <p className="text-sm text-gray-400">
                  You need {(listing.price - (wallet?.balance || 0)).toLocaleString()} more credits
                </p>
              </div>
            ) : (
              <button
                onClick={onBuyNow}
                disabled={submitting}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
              >
                {submitting ? 'Processing...' : `Buy Now for ${listing.price.toLocaleString()}`}
              </button>
            )}

            {listing.allow_offers && (
              <>
                <button
                  onClick={() => setShowOfferForm(!showOfferForm)}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-all"
                >
                  Make an Offer
                </button>

                {showOfferForm && (
                  <div className="space-y-3 p-4 bg-white/5 rounded-xl">
                    <input
                      type="number"
                      placeholder="Offer amount"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
                    />
                    <textarea
                      placeholder="Message (optional)"
                      value={offerMessage}
                      onChange={(e) => setOfferMessage(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500 resize-none"
                    />
                    <button
                      onClick={onMakeOffer}
                      disabled={submitting || !offerAmount}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-semibold transition-all"
                    >
                      {submitting ? 'Submitting...' : 'Submit Offer'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {listing.listing_type === 'offer_only' && (
          <div className="space-y-3">
            <div className="space-y-3 p-4 bg-white/5 rounded-xl">
              <p className="text-sm text-gray-400 mb-2">
                This item is only available via offers. Min offer: {listing.min_offer?.toLocaleString() || 0}
              </p>
              <input
                type="number"
                placeholder="Offer amount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                min={listing.min_offer || 0}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500"
              />
              <textarea
                placeholder="Message (optional)"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-violet-500 resize-none"
              />
              <button
                onClick={onMakeOffer}
                disabled={submitting || !offerAmount || parseInt(offerAmount) < (listing.min_offer || 0)}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl font-semibold transition-all"
              >
                {submitting ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        )}

        {listing.listing_type === 'auction' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Auction ends in {getTimeLeft(listing.expires_at)}
            </p>
            <Link
              to={`/marketplace/auction/${listing.id}`}
              className="block w-full py-3 bg-amber-600 hover:bg-amber-700 rounded-xl font-semibold text-center transition-all"
            >
              View Auction & Place Bid
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================
// HELPERS
// =====================================================

function getTimeLeft(expiresAt) {
  if (!expiresAt) return null;

  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
