/**
 * Rivals Page
 *
 * 1v1 rivalry competition system for web.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useAuth } from '../store';
import {
  RIVALS_QUERY,
  PENDING_RIVALS_QUERY,
  SEARCH_POTENTIAL_RIVALS_QUERY,
} from '../graphql/queries';
import {
  CHALLENGE_RIVAL_MUTATION,
  ACCEPT_RIVALRY_MUTATION,
  DECLINE_RIVALRY_MUTATION,
  END_RIVALRY_MUTATION,
} from '../graphql/mutations';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';

// ============================================
// ICONS
// ============================================
const Icons = {
  Swords: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Search: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  UserPlus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
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
  Minus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
    </svg>
  ),
  Zap: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

// ============================================
// TYPES
// ============================================
interface RivalOpponent {
  id: string;
  username: string;
  avatar?: string;
  archetype?: string;
  level?: number;
}

interface RivalWithUser {
  id: string;
  challengerId: string;
  challengedId: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  challengerTU: number;
  challengedTU: number;
  opponent: RivalOpponent;
  isChallenger: boolean;
  myTU: number;
  opponentTU: number;
  myLastWorkout?: string;
  opponentLastWorkout?: string;
  tuDifference: number;
  isWinning: boolean;
}

interface RivalStats {
  activeRivals: number;
  wins: number;
  losses: number;
  ties: number;
  totalTUEarned: number;
  currentStreak: number;
  longestStreak: number;
}

interface PotentialRival {
  id: string;
  username: string;
  avatar?: string;
  archetype?: string;
  level?: number;
}

interface RivalsData {
  rivals: {
    rivals: RivalWithUser[];
    stats: RivalStats;
  };
}

interface PendingRivalsData {
  pendingRivals: RivalWithUser[];
}

interface SearchRivalsData {
  searchPotentialRivals: PotentialRival[];
}

// ============================================
// MAIN RIVALS PAGE
// ============================================
export default function Rivals() {
  const { isAuthenticated } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  // Search UI state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PotentialRival[]>([]);

  // GraphQL queries
  const {
    data: rivalsData,
    loading: rivalsLoading,
    error: rivalsError,
    refetch: refetchRivals,
  } = useQuery<RivalsData>(RIVALS_QUERY, {
    variables: { status: 'active' },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: pendingData,
    loading: pendingLoading,
    refetch: refetchPending,
  } = useQuery<PendingRivalsData>(PENDING_RIVALS_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  // Lazy query for search
  const [searchRivals, { loading: searching }] = useLazyQuery<SearchRivalsData>(
    SEARCH_POTENTIAL_RIVALS_QUERY,
    {
      fetchPolicy: 'network-only',
      onCompleted: (data) => {
        setSearchResults(data?.searchPotentialRivals || []);
      },
      onError: (err) => {
        console.error('Search failed:', err);
        setSearchResults([]);
      },
    }
  );

  // GraphQL mutations
  const [challengeRival] = useMutation(CHALLENGE_RIVAL_MUTATION, {
    onCompleted: () => {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
      refetchRivals();
      refetchPending();
    },
    onError: (err) => {
      setLocalError(err.message || 'Failed to send challenge');
    },
  });

  const [acceptRivalry] = useMutation(ACCEPT_RIVALRY_MUTATION, {
    onCompleted: () => {
      refetchRivals();
      refetchPending();
    },
    onError: (err) => {
      setLocalError(err.message || 'Failed to accept rivalry');
    },
  });

  const [declineRivalry] = useMutation(DECLINE_RIVALRY_MUTATION, {
    onCompleted: () => {
      refetchPending();
    },
    onError: (err) => {
      setLocalError(err.message || 'Failed to decline rivalry');
    },
  });

  const [endRivalry] = useMutation(END_RIVALRY_MUTATION, {
    onCompleted: () => {
      refetchRivals();
    },
    onError: (err) => {
      setLocalError(err.message || 'Failed to end rivalry');
    },
  });

  // Extract data with memoization
  const rivals = useMemo<RivalWithUser[]>(
    () => rivalsData?.rivals?.rivals || [],
    [rivalsData?.rivals?.rivals]
  );

  const stats = useMemo<RivalStats | null>(
    () => rivalsData?.rivals?.stats || null,
    [rivalsData?.rivals?.stats]
  );

  const pendingRivals = useMemo<RivalWithUser[]>(
    () => pendingData?.pendingRivals || [],
    [pendingData?.pendingRivals]
  );

  const loading = rivalsLoading || pendingLoading;
  const error = localError || rivalsError?.message || null;

  // Search effect with debounce
  const handleSearch = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    searchRivals({ variables: { query, limit: 20 } });
  }, [searchRivals]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, handleSearch]);

  // Challenge user
  const handleChallenge = async (userId: string) => {
    // Optimistically remove user from search results
    setSearchResults((prev) => prev.filter((u) => u.id !== userId));

    await challengeRival({ variables: { opponentId: userId } });
  };

  // Accept rivalry
  const handleAccept = async (id: string) => {
    await acceptRivalry({ variables: { rivalryId: id } });
  };

  // Decline rivalry
  const handleDecline = async (id: string) => {
    await declineRivalry({ variables: { rivalryId: id } });
  };

  // End rivalry
  const handleEnd = async (id: string) => {
    if (!window.confirm('Are you sure you want to end this rivalry?')) return;
    await endRivalry({ variables: { rivalryId: id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <GlassSurface className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading rivals...</p>
          </div>
        </GlassSurface>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Rivals</h1>
          <p className="text-white/60">1v1 competition to push your limits</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <Icons.X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <GlassCard className="p-6">
            <div className="flex justify-around text-center">
              <div>
                <Icons.Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{stats.wins || 0}</div>
                <div className="text-white/50 text-sm">Wins</div>
              </div>
              <div>
                <Icons.Swords className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{stats.activeRivals || 0}</div>
                <div className="text-white/50 text-sm">Active</div>
              </div>
              <div>
                <Icons.Zap className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white">{(stats.totalTUEarned || 0).toLocaleString()}</div>
                <div className="text-white/50 text-sm">TU Earned</div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Find Rivals */}
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Find Rivals</h3>
            <GlassButton
              onClick={() => {
                setShowSearch(!showSearch);
                setSearchQuery('');
                setSearchResults([]);
              }}
              size="sm"
              className="flex items-center gap-2"
            >
              {showSearch ? <Icons.X className="w-4 h-4" /> : <Icons.Search className="w-4 h-4" />}
              {showSearch ? 'Close' : 'Search'}
            </GlassButton>
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full bg-white/10 text-white rounded-lg px-4 py-2 border border-white/10 focus:border-violet-500 outline-none mb-4"
                  autoFocus
                />

                {searching && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="space-y-2">
                  {(Array.isArray(searchResults) ? searchResults : []).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {result.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{result.username}</div>
                          {result.archetype && (
                            <div className="text-white/50 text-sm">{result.archetype}</div>
                          )}
                        </div>
                      </div>
                      <GlassButton
                        onClick={() => handleChallenge(result.id)}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Icons.UserPlus className="w-4 h-4" />
                        Challenge
                      </GlassButton>
                    </div>
                  ))}
                  {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                    <p className="text-white/50 text-center py-4">No users found</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Pending Requests */}
        {Array.isArray(pendingRivals) && pendingRivals.length > 0 && (
          <GlassCard className="p-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold text-white mb-4">Pending Requests</h3>
            <div className="space-y-3">
              {pendingRivals.map((rival) => (
                <div key={rival.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {rival.opponent?.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{rival.opponent?.username}</div>
                      <div className="text-white/50 text-sm">
                        {rival.isChallenger ? 'Waiting for response' : 'Wants to compete'}
                      </div>
                    </div>
                  </div>
                  {!rival.isChallenger && (
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={() => handleAccept(rival.id)}
                        size="sm"
                        className="bg-green-500/20 hover:bg-green-500/30 border-green-500/50"
                      >
                        <Icons.Check className="w-4 h-4" />
                      </GlassButton>
                      <GlassButton
                        onClick={() => handleDecline(rival.id)}
                        size="sm"
                        className="bg-red-500/20 hover:bg-red-500/30 border-red-500/50"
                      >
                        <Icons.X className="w-4 h-4" />
                      </GlassButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Active Rivalries */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-white">Active Rivalries</h3>

          {!Array.isArray(rivals) || rivals.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Icons.Swords className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/50">
                No active rivalries yet.<br />
                Challenge someone to compete!
              </p>
            </GlassCard>
          ) : (
            rivals.map((rival) => {
              const total = (rival.myTU || 0) + (rival.opponentTU || 0);
              const myPercent = total > 0 ? (rival.myTU / total) * 100 : 50;
              const isWinning = rival.myTU > rival.opponentTU;
              const tuDiff = rival.myTU - rival.opponentTU;

              return (
                <motion.div
                  key={rival.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {rival.opponent?.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">{rival.opponent?.username}</div>
                          <div className="text-white/50 text-sm">vs You</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isWinning ? (
                          <Icons.TrendingUp className="w-5 h-5 text-green-400" />
                        ) : tuDiff < 0 ? (
                          <Icons.TrendingDown className="w-5 h-5 text-red-400" />
                        ) : (
                          <Icons.Minus className="w-5 h-5 text-white/50" />
                        )}
                        <span className={`font-bold text-lg ${isWinning ? 'text-green-400' : tuDiff < 0 ? 'text-red-400' : 'text-white/50'}`}>
                          {tuDiff > 0 ? '+' : ''}{tuDiff} TU
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-blue-400">You: {(rival.myTU || 0).toLocaleString()} TU</span>
                        <span className="text-red-400">{rival.opponent?.username}: {(rival.opponentTU || 0).toLocaleString()} TU</span>
                      </div>
                      <div className="h-3 flex rounded-full overflow-hidden">
                        <motion.div
                          className="bg-blue-500"
                          initial={{ width: '50%' }}
                          animate={{ width: `${myPercent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                        <motion.div
                          className="bg-red-500"
                          initial={{ width: '50%' }}
                          animate={{ width: `${100 - myPercent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>

                    <GlassButton
                      onClick={() => handleEnd(rival.id)}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-400"
                    >
                      End Rivalry
                    </GlassButton>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </GlassSurface>
    </div>
  );
}
