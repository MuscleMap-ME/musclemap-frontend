import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Trophy: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3a1 1 0 011-1h12a1 1 0 011 1v2h2a1 1 0 011 1v3a4 4 0 01-4 4h-.535c-.578 1.74-2.032 3.034-3.798 3.465A3.99 3.99 0 0113 19.17V21h2a1 1 0 110 2H9a1 1 0 110-2h2v-1.83c-.796-.137-1.531-.471-2.167-.965C7.032 13.034 5.578 11.74 5 10H4.535A4 4 0 01.535 6V3a1 1 0 011-1h2V3zm14 3v3a2 2 0 002-2V6h-2zM4 6v3a2 2 0 002 2V6H4z"/></svg>,
  Fire: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>,
  TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  Medal: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>,
};

const _RANK_COLORS = {
  1: 'from-amber-400 to-yellow-600',
  2: 'from-gray-300 to-gray-500',
  3: 'from-amber-600 to-amber-800',
};

const RANK_ICONS = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const TIME_WINDOWS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'all_time', label: 'All Time' },
];

const LEADERBOARD_TYPES = [
  { key: 'workouts', label: 'Workouts', icon: '💪', metric: 'workout_count' },
  { key: 'volume', label: 'Volume', icon: '🏋️', metric: 'total_volume' },
  { key: 'streak', label: 'Streak', icon: '🔥', metric: 'current_streak' },
  { key: 'credits', label: 'Credits', icon: '💰', metric: 'credits_earned' },
  { key: 'buddy', label: 'Buddy Level', icon: '🐺', metric: 'buddy_level' },
];

export default function Leaderboard() {
  const { token, user } = useAuth();
  const [leaderboards, setLeaderboards] = useState({});
  const [userRanks, setUserRanks] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('workouts');
  const [selectedWindow, setSelectedWindow] = useState('weekly');
  const [_selectedScope, _setSelectedScope] = useState('global');

  useEffect(() => {
    fetchLeaderboards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedWindow, _selectedScope]);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const type = LEADERBOARD_TYPES.find(t => t.key === selectedType);

      // Fetch global leaderboard
      const leaderboardRes = await fetch(
        `/api/leaderboards/global?metric=${type?.metric || 'workout_count'}&window=${selectedWindow}&limit=50`,
        { headers }
      );
      const leaderboardData = await leaderboardRes.json();

      // Fetch user's rank
      const rankRes = await fetch(
        `/api/leaderboards/user-rank?metric=${type?.metric || 'workout_count'}&window=${selectedWindow}`,
        { headers }
      );
      const rankData = await rankRes.json();

      setLeaderboards(prev => ({
        ...prev,
        [selectedType]: leaderboardData.data || [],
      }));

      setUserRanks(prev => ({
        ...prev,
        [selectedType]: rankData.data,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentLeaderboard = leaderboards[selectedType] || [];
  const currentUserRank = userRanks[selectedType];
  const typeConfig = LEADERBOARD_TYPES.find(t => t.key === selectedType);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
              <Icons.Back />
            </Link>
            <h1 className="text-xl font-semibold">Leaderboard</h1>
          </div>
          <Icons.Trophy className="text-amber-500" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* User's Rank Card */}
        {currentUserRank && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  #{currentUserRank.rank || '—'}
                </div>
                <div>
                  <div className="text-sm text-white/70">Your Rank</div>
                  <div className="text-2xl font-bold">
                    {currentUserRank.value?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-white/70">{typeConfig?.label}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/70">
                  {selectedWindow === 'daily' ? 'Today' :
                   selectedWindow === 'weekly' ? 'This Week' :
                   selectedWindow === 'monthly' ? 'This Month' : 'All Time'}
                </div>
                {currentUserRank.percentile && (
                  <div className="text-lg font-semibold">
                    Top {currentUserRank.percentile.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Type Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {LEADERBOARD_TYPES.map(type => (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all',
                selectedType === type.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              <span>{type.icon}</span>
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Time Window Selector */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
          {TIME_WINDOWS.map(window => (
            <button
              key={window.key}
              onClick={() => setSelectedWindow(window.key)}
              className={clsx(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                selectedWindow === window.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {window.label}
            </button>
          ))}
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentLeaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Icons.Trophy className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No rankings yet</p>
            <p className="text-sm text-gray-500 mt-1">Complete workouts to appear on the leaderboard</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 Podium */}
            {currentLeaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* Second Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="order-1"
                >
                  <PodiumCard entry={currentLeaderboard[1]} rank={2} typeConfig={typeConfig} />
                </motion.div>

                {/* First Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="order-0 sm:order-1"
                >
                  <PodiumCard entry={currentLeaderboard[0]} rank={1} typeConfig={typeConfig} />
                </motion.div>

                {/* Third Place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="order-2"
                >
                  <PodiumCard entry={currentLeaderboard[2]} rank={3} typeConfig={typeConfig} />
                </motion.div>
              </div>
            )}

            {/* Rest of the list */}
            {currentLeaderboard.slice(3).map((entry, index) => (
              <motion.div
                key={entry.userId || entry.user_id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <LeaderboardEntry
                  entry={entry}
                  rank={index + 4}
                  typeConfig={typeConfig}
                  isCurrentUser={entry.userId === user?.id || entry.user_id === user?.id}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Rewards Info */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Icons.Medal className="text-amber-500" />
            Weekly Rewards
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-xl">🥇</span>
                <span>1st Place</span>
              </span>
              <span className="font-semibold text-amber-400">500 credits</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-xl">🥈</span>
                <span>2nd Place</span>
              </span>
              <span className="font-semibold text-gray-400">300 credits</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-xl">🥉</span>
                <span>3rd Place</span>
              </span>
              <span className="font-semibold text-amber-700">200 credits</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-xl">🏅</span>
                <span>Top 10</span>
              </span>
              <span className="font-semibold text-violet-400">100 credits</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PodiumCard({ entry, rank, typeConfig }) {
  const value = entry?.value || entry?.score || 0;
  const username = entry?.username || entry?.display_name || 'Anonymous';

  return (
    <div className={clsx(
      'rounded-xl p-4 text-center relative overflow-hidden',
      rank === 1 ? 'bg-gradient-to-br from-amber-500/30 to-yellow-600/30 border-2 border-amber-500/50' :
      rank === 2 ? 'bg-gradient-to-br from-gray-400/30 to-gray-600/30 border border-gray-500/30' :
      'bg-gradient-to-br from-amber-700/30 to-amber-900/30 border border-amber-700/30'
    )}>
      <div className="text-4xl mb-2">{RANK_ICONS[rank]}</div>
      <div className="font-semibold truncate">{username}</div>
      <div className={clsx(
        'text-2xl font-bold mt-1',
        rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600'
      )}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-400 mt-1">{typeConfig?.label}</div>
    </div>
  );
}

function LeaderboardEntry({ entry, rank, typeConfig, isCurrentUser }) {
  const value = entry?.value || entry?.score || 0;
  const username = entry?.username || entry?.display_name || 'Anonymous';

  return (
    <div className={clsx(
      'flex items-center gap-4 p-4 rounded-xl transition-all',
      isCurrentUser ? 'bg-violet-600/20 border border-violet-500/50' : 'bg-white/5 hover:bg-white/10'
    )}>
      <div className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
        rank <= 10 ? 'bg-violet-600' : 'bg-white/10'
      )}>
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{username}</div>
        {isCurrentUser && (
          <div className="text-xs text-violet-400">You</div>
        )}
      </div>

      <div className="text-right">
        <div className="font-bold text-lg">{value.toLocaleString()}</div>
        <div className="text-xs text-gray-400">{typeConfig?.label}</div>
      </div>
    </div>
  );
}
