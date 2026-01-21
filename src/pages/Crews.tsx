/**
 * Crews Page
 *
 * Crew management and Crew Wars tournament system for web.
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
  Users: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Swords: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Search: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Crown: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3l4 9-6 3 9 6 9-6-6-3 4-9-5 3-3-6-3 6-5-3z" />
    </svg>
  ),
  Shield: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  TrendingUp: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendingDown: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Clock: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ============================================
// WAR CARD COMPONENT
// ============================================
function WarCard({ war, myCrew }) {
  const isChallenger = war.challengerCrewId === myCrew.id;
  const opponentCrew = isChallenger ? war.defendingCrew : war.challengerCrew;
  const myTU = isChallenger ? war.challengerTU : war.defendingTU;
  const opponentTU = isChallenger ? war.defendingTU : war.challengerTU;
  const total = myTU + opponentTU;
  const myPercent = total > 0 ? (myTU / total) * 100 : 50;
  const isWinning = myTU > opponentTU;

  return (
    <GlassCard className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="text-red-400">
            <Icons.Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-white">vs {opponentCrew?.name || 'Unknown'}</div>
            <div className="flex items-center gap-1 text-white/50 text-sm">
              <Icons.Clock className="w-3 h-3" />
              <span>{war.daysRemaining || 0} days left</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isWinning ? (
            <Icons.TrendingUp className="w-5 h-5 text-green-400" />
          ) : myTU < opponentTU ? (
            <Icons.TrendingDown className="w-5 h-5 text-red-400" />
          ) : null}
          <span className={`font-bold ${isWinning ? 'text-green-400' : myTU < opponentTU ? 'text-red-400' : 'text-white/50'}`}>
            {myTU > opponentTU ? '+' : ''}{myTU - opponentTU} TU
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-blue-400">{myCrew.name}: {myTU.toLocaleString()} TU</span>
          <span className="text-red-400">{opponentCrew?.name || 'Opponent'}: {opponentTU.toLocaleString()} TU</span>
        </div>
        <div className="h-2 flex rounded-full overflow-hidden">
          <div className="bg-blue-500 transition-all" style={{ width: `${myPercent}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${100 - myPercent}%` }} />
        </div>
      </div>
    </GlassCard>
  );
}

// ============================================
// MAIN CREWS PAGE
// ============================================
export default function Crews() {
  const { user: _user } = useUser();
  const [myCrew, setMyCrew] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create/Search UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Create crew form
  const [crewName, setCrewName] = useState('');
  const [crewTag, setCrewTag] = useState('');
  const [crewDescription, setCrewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [crewRes, leaderboardRes] = await Promise.all([
        api.get('/crews/my').catch(() => ({ data: null })),
        api.get('/crews/leaderboard?limit=20'),
      ]);

      setMyCrew(crewRes.data);
      // API response is { data: { data: [...] } }, so extract the inner array
      const leaderboardData = leaderboardRes.data?.data || leaderboardRes.data || [];
      setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
    } catch (err) {
      setError(err.message || 'Failed to load crews data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search crews
  const handleSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/crews/search?q=${encodeURIComponent(query)}`);
      const searchData = response.data?.data || response.data || [];
      setSearchResults(Array.isArray(searchData) ? searchData : []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, handleSearch]);

  // Create crew
  const handleCreateCrew = async () => {
    if (!crewName.trim() || !crewTag.trim()) {
      setError('Name and tag are required');
      return;
    }

    setCreating(true);
    try {
      await api.post('/crews', {
        name: crewName.trim(),
        tag: crewTag.trim().toUpperCase(),
        description: crewDescription.trim() || undefined,
      });
      setShowCreate(false);
      setCrewName('');
      setCrewTag('');
      setCrewDescription('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to create crew');
    } finally {
      setCreating(false);
    }
  };

  // Leave crew
  const handleLeaveCrew = async () => {
    if (!window.confirm('Are you sure you want to leave this crew?')) return;

    try {
      await api.post('/crews/leave');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to leave crew');
    }
  };

  // Join crew
  const handleJoinCrew = async (crewId) => {
    try {
      await api.post(`/crews/${crewId}/join`);
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to join crew');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Icons.Crown className="w-4 h-4 text-yellow-400" />;
      case 'captain':
        return <Icons.Shield className="w-4 h-4 text-blue-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading crews...</p>
        </div>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Crews</h1>
          <p className="text-white/60">Team up and compete in Crew Wars</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <Icons.X className="w-5 h-5" />
            </button>
          </div>
        )}

        {myCrew ? (
          <>
            {/* My Crew Header */}
            <GlassCard
              className="p-6"
              style={{ backgroundColor: `${myCrew.crew?.color || '#6366f1'}20` }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: myCrew.crew?.color || '#6366f1' }}
                  >
                    {myCrew.crew?.tag || '??'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-white">{myCrew.crew?.name}</h2>
                      {getRoleIcon(myCrew.membership?.role)}
                    </div>
                    <p className="text-white/60">
                      [{myCrew.crew?.tag}] · {myCrew.crew?.memberCount || 0} members
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{myCrew.stats?.weeklyTU?.toLocaleString() || 0}</div>
                    <div className="text-white/50 text-sm">Weekly TU</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{myCrew.stats?.warsWon || 0}</div>
                    <div className="text-white/50 text-sm">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{myCrew.stats?.warsLost || 0}</div>
                    <div className="text-white/50 text-sm">Losses</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Active Wars */}
            {myCrew.wars?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-white">Active Wars</h3>
                {myCrew.wars.map((war) => (
                  <WarCard key={war.id} war={war} myCrew={myCrew.crew} />
                ))}
              </div>
            )}

            {/* Top Contributors */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {myCrew.stats?.topContributors?.map((contributor, index) => (
                  <div key={contributor.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white/50 w-6">#{index + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {contributor.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="text-white">{contributor.username}</span>
                    </div>
                    <span className="text-blue-400 font-bold">
                      {contributor.weeklyTU?.toLocaleString() || 0} TU
                    </span>
                  </div>
                ))}
                {(!myCrew.stats?.topContributors || myCrew.stats.topContributors.length === 0) && (
                  <p className="text-white/50 text-center py-4">No contributions this week yet</p>
                )}
              </div>
            </GlassCard>

            {/* Leave Button */}
            {myCrew.membership?.role !== 'owner' && (
              <GlassButton
                onClick={handleLeaveCrew}
                className="w-full bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-400"
              >
                Leave Crew
              </GlassButton>
            )}
          </>
        ) : (
          <>
            {/* No Crew - Create or Join */}
            <GlassCard className="p-8 text-center">
              <Icons.Users className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Join a Crew</h2>
              <p className="text-white/60 mb-6">Team up with others and compete in Crew Wars!</p>
              <div className="flex justify-center gap-4">
                <GlassButton
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2"
                >
                  <Icons.Plus className="w-4 h-4" />
                  Create Crew
                </GlassButton>
                <GlassButton
                  onClick={() => setShowSearch(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Icons.Search className="w-4 h-4" />
                  Find Crew
                </GlassButton>
              </div>
            </GlassCard>

            {/* Create Crew Modal */}
            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                  onClick={() => setShowCreate(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GlassCard className="p-6 w-full max-w-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Create Crew</h3>
                        <button onClick={() => setShowCreate(false)} className="text-white/50 hover:text-white">
                          <Icons.X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-white/70 text-sm mb-1">Crew Name</label>
                          <input
                            type="text"
                            value={crewName}
                            onChange={(e) => setCrewName(e.target.value)}
                            placeholder="Enter crew name"
                            className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-violet-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-white/70 text-sm mb-1">Tag (3-5 characters)</label>
                          <input
                            type="text"
                            value={crewTag}
                            onChange={(e) => setCrewTag(e.target.value.toUpperCase())}
                            placeholder="ABC"
                            maxLength={5}
                            className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-violet-500 outline-none uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-white/70 text-sm mb-1">Description (optional)</label>
                          <textarea
                            value={crewDescription}
                            onChange={(e) => setCrewDescription(e.target.value)}
                            placeholder="Tell others about your crew"
                            rows={3}
                            className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-violet-500 outline-none resize-none"
                          />
                        </div>
                        <GlassButton
                          onClick={handleCreateCrew}
                          disabled={creating || !crewName.trim() || !crewTag.trim()}
                          className="w-full"
                        >
                          {creating ? 'Creating...' : 'Create Crew'}
                        </GlassButton>
                      </div>
                    </GlassCard>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Crews Modal */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                  onClick={() => setShowSearch(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GlassCard className="p-6 w-full max-w-md">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Find Crew</h3>
                        <button onClick={() => setShowSearch(false)} className="text-white/50 hover:text-white">
                          <Icons.X className="w-5 h-5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or tag..."
                        className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-violet-500 outline-none mb-4"
                      />

                      {searching && (
                        <div className="flex justify-center py-4">
                          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResults.map((crew) => (
                          <div key={crew.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: crew.color || '#6366f1' }}
                              >
                                {crew.tag}
                              </div>
                              <div>
                                <div className="text-white font-medium">{crew.name}</div>
                                <div className="text-white/50 text-sm">
                                  {crew.memberCount} members · {crew.weeklyTU?.toLocaleString() || 0} TU
                                </div>
                              </div>
                            </div>
                            <GlassButton
                              onClick={() => handleJoinCrew(crew.id)}
                              size="sm"
                            >
                              Join
                            </GlassButton>
                          </div>
                        ))}
                        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                          <p className="text-white/50 text-center py-4">No crews found</p>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Leaderboard */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Icons.Trophy className="w-5 h-5 text-yellow-400" />
              Leaderboard
            </h3>
          </div>

          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry) => (
              <motion.div
                key={entry.crew?.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-bold ${entry.rank <= 3 ? 'text-yellow-400' : 'text-white/50'}`}>
                    #{entry.rank}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: entry.crew?.color || '#6366f1' }}
                  >
                    {entry.crew?.tag || '??'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{entry.crew?.name}</div>
                    <div className="text-white/50 text-xs">{entry.crew?.memberCount || 0} members</div>
                  </div>
                </div>
                <span className="text-blue-400 font-bold">
                  {entry.crew?.weeklyTU?.toLocaleString() || 0}
                </span>
              </motion.div>
            ))}

            {leaderboard.length === 0 && (
              <p className="text-white/50 text-center py-8">No crews yet. Be the first to create one!</p>
            )}
          </div>
        </GlassCard>
      </div>
    </GlassSurface>
  );
}
