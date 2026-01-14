import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../store/authStore';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  Trophy: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3a1 1 0 011-1h12a1 1 0 011 1v2h2a1 1 0 011 1v3a4 4 0 01-4 4h-.535c-.578 1.74-2.032 3.034-3.798 3.465A3.99 3.99 0 0113 19.17V21h2a1 1 0 110 2H9a1 1 0 110-2h2v-1.83c-.796-.137-1.531-.471-2.167-.965C7.032 13.034 5.578 11.74 5 10H4.535A4 4 0 01.535 6V3a1 1 0 011-1h2V3zm14 3v3a2 2 0 002-2V6h-2zM4 6v3a2 2 0 002 2V6H4z"/></svg>,
  Sparkle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>,
  Close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Video: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
};

const CATEGORY_CONFIG = {
  streak: { label: 'Streak', icon: '🔥', color: 'from-orange-500 to-red-600' },
  volume: { label: 'Volume', icon: '🏋️', color: 'from-blue-500 to-cyan-600' },
  pr: { label: 'Personal Records', icon: '🏆', color: 'from-amber-400 to-orange-500' },
  consistency: { label: 'Consistency', icon: '📅', color: 'from-green-500 to-emerald-600' },
  community: { label: 'Community', icon: '👥', color: 'from-purple-500 to-violet-600' },
  special: { label: 'Special', icon: '⭐', color: 'from-pink-500 to-rose-600' },
  workout: { label: 'Workout', icon: '💪', color: 'from-blue-500 to-indigo-600' },
  social: { label: 'Social', icon: '🤝', color: 'from-teal-500 to-cyan-600' },
  trainer: { label: 'Trainer', icon: '🏋️‍♂️', color: 'from-amber-500 to-yellow-600' },
  leaderboard: { label: 'Leaderboard', icon: '📊', color: 'from-violet-500 to-purple-600' },
  goal: { label: 'Goals', icon: '🎯', color: 'from-emerald-500 to-green-600' },
};

const TIER_CONFIG = {
  1: { label: 'Bronze', color: 'from-amber-700 to-amber-900', border: 'border-amber-700/50' },
  2: { label: 'Silver', color: 'from-gray-400 to-gray-600', border: 'border-gray-400/50' },
  3: { label: 'Gold', color: 'from-amber-400 to-yellow-600', border: 'border-amber-400/50' },
  4: { label: 'Platinum', color: 'from-cyan-400 to-blue-600', border: 'border-cyan-400/50' },
  5: { label: 'Diamond', color: 'from-violet-400 to-purple-600', border: 'border-violet-400/50' },
};

const formatDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function Achievements() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [_summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [defsRes, userRes, summaryRes] = await Promise.all([
        fetch('/api/achievements/definitions', { headers }),
        fetch('/api/me/achievements', { headers }),
        fetch('/api/me/achievements/summary', { headers }),
      ]);

      const [defsData, userData, summaryData] = await Promise.all([
        defsRes.json(),
        userRes.json(),
        summaryRes.json(),
      ]);

      setDefinitions(defsData.data || []);
      setUserAchievements(userData.data || []);
      setSummary(summaryData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const earnedSet = new Set(userAchievements.map(a => a.achievementKey || a.achievement_key));
  const earnedMap = userAchievements.reduce((acc, a) => {
    acc[a.achievementKey || a.achievement_key] = a;
    return acc;
  }, {});

  const categories = ['all', ...new Set(definitions.map(d => d.category))];

  const getFilteredAchievements = () => {
    let filtered = definitions;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }

    if (activeTab === 'earned') {
      filtered = filtered.filter(d => earnedSet.has(d.key));
    } else if (activeTab === 'locked') {
      filtered = filtered.filter(d => !earnedSet.has(d.key));
    }

    return filtered;
  };

  const filteredAchievements = getFilteredAchievements();
  const totalCredits = userAchievements.reduce((acc, a) => acc + (a.creditsEarned || a.credits_earned || 0), 0);
  const totalXp = userAchievements.reduce((acc, a) => acc + (a.xpEarned || a.xp_earned || 0), 0);

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
            <h1 className="text-xl font-semibold">Achievements</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              to="/achievements/my-verifications"
              className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-gray-300 transition-colors"
            >
              <Icons.Video />
              <span className="hidden sm:inline">Verifications</span>
            </Link>
            <span className="px-3 py-1 bg-violet-600/20 rounded-full text-violet-400 font-medium">
              {earnedSet.size}/{definitions.length}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {earnedSet.size} Achievements
              </h2>
              <p className="text-white/70">
                {((earnedSet.size / definitions.length) * 100).toFixed(0)}% Complete
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-3 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(earnedSet.size / definitions.length) * 100}%` }}
                className="h-full bg-white/80 rounded-full"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{earnedSet.size}</div>
              <div className="text-xs text-white/70">Earned</div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{totalCredits.toLocaleString()}</div>
              <div className="text-xs text-white/70">Credits</div>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{totalXp.toLocaleString()}</div>
              <div className="text-xs text-white/70">XP</div>
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
          {['all', 'earned', 'locked'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize',
                activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
              {tab === 'earned' && <span className="ml-1 text-xs text-violet-400">({earnedSet.size})</span>}
              {tab === 'locked' && <span className="ml-1 text-xs text-gray-500">({definitions.length - earnedSet.size})</span>}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {categories.map(cat => {
            const config = CATEGORY_CONFIG[cat] || { label: cat, icon: '📋' };
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all capitalize',
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                )}
              >
                <span>{cat === 'all' ? '🏆' : config.icon}</span>
                <span className="text-sm font-medium">{cat === 'all' ? 'All' : config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAchievements.map((achievement, index) => {
            const isEarned = earnedSet.has(achievement.key);
            const earnedData = earnedMap[achievement.key];
            const category = CATEGORY_CONFIG[achievement.category] || CATEGORY_CONFIG.special;
            const tier = TIER_CONFIG[achievement.tier] || TIER_CONFIG[1];

            return (
              <motion.div
                key={achievement.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedAchievement({ ...achievement, earned: isEarned, earnedData })}
                className={clsx(
                  'relative overflow-hidden rounded-2xl border cursor-pointer transition-all hover:scale-[1.02]',
                  isEarned
                    ? `bg-gradient-to-br ${tier.color} ${tier.border}`
                    : 'bg-white/5 border-white/10 opacity-60'
                )}
              >
                {/* Badge */}
                <div className="p-4 text-center">
                  <div className={clsx(
                    'w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-3',
                    isEarned ? 'bg-black/30' : 'bg-white/5'
                  )}>
                    {isEarned ? category.icon : <Icons.Lock className="w-6 h-6 text-gray-500" />}
                  </div>

                  <h3 className="font-semibold text-sm mb-1 line-clamp-1">{achievement.name}</h3>

                  {isEarned ? (
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <Icons.Check className="w-3 h-3" />
                      <span>Earned</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Locked</div>
                  )}

                  {achievement.creditsReward > 0 && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                      <Icons.Sparkle className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">{achievement.creditsReward}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-16">
            <Icons.Trophy className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No achievements found</p>
          </div>
        )}
      </main>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className={clsx(
                'h-32 bg-gradient-to-br flex items-center justify-center relative',
                selectedAchievement.earned
                  ? TIER_CONFIG[selectedAchievement.tier]?.color || 'from-amber-700 to-amber-900'
                  : 'from-gray-700 to-gray-900'
              )}>
                <div className="text-6xl">
                  {selectedAchievement.earned
                    ? CATEGORY_CONFIG[selectedAchievement.category]?.icon || '🏆'
                    : '🔒'
                  }
                </div>
              </div>

              <div className="p-6">
                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    selectedAchievement.earned
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  )}>
                    {selectedAchievement.earned ? 'Earned' : 'Locked'}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10">
                    {CATEGORY_CONFIG[selectedAchievement.category]?.label || selectedAchievement.category}
                  </span>
                  {selectedAchievement.tier > 1 && (
                    <span className={clsx(
                      'px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r text-white',
                      TIER_CONFIG[selectedAchievement.tier]?.color
                    )}>
                      {TIER_CONFIG[selectedAchievement.tier]?.label}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-2">{selectedAchievement.name}</h2>
                <p className="text-gray-400 mb-6">{selectedAchievement.description}</p>

                {/* Rewards */}
                {(selectedAchievement.creditsReward > 0 || selectedAchievement.xpReward > 0) && (
                  <div className="p-4 bg-white/5 rounded-xl mb-4">
                    <h4 className="text-sm text-gray-400 mb-2">Rewards</h4>
                    <div className="flex items-center gap-4">
                      {selectedAchievement.creditsReward > 0 && (
                        <div className="flex items-center gap-2">
                          <Icons.Sparkle className="text-amber-400" />
                          <span className="font-bold text-amber-400">
                            {selectedAchievement.creditsReward} credits
                          </span>
                        </div>
                      )}
                      {selectedAchievement.xpReward > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-violet-400">XP</span>
                          <span className="font-bold text-violet-400">
                            +{selectedAchievement.xpReward}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Earned Info */}
                {selectedAchievement.earned && selectedAchievement.earnedData && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <Icons.Check />
                      <span className="font-medium">Achievement Unlocked!</span>
                      {selectedAchievement.earnedData.isVerified && (
                        <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-violet-500/20 rounded-full text-xs text-violet-400">
                          <Icons.Shield /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Earned on {formatDate(selectedAchievement.earnedData.earnedAt || selectedAchievement.earnedData.earned_at)}
                    </p>
                    {selectedAchievement.earnedData.witnessUsername && (
                      <p className="text-sm text-violet-400 mt-1">
                        Witnessed by @{selectedAchievement.earnedData.witnessUsername}
                      </p>
                    )}
                  </div>
                )}

                {/* How to Unlock / Verification */}
                {!selectedAchievement.earned && (
                  <div className="space-y-4">
                    {selectedAchievement.requiresVerification && (
                      <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                        <div className="flex items-center gap-2 text-violet-400 mb-2">
                          <Icons.Shield />
                          <span className="font-medium">Verification Required</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          This elite achievement requires video proof and a witness to verify you&apos;ve completed it.
                        </p>
                        <button
                          onClick={() => {
                            setSelectedAchievement(null);
                            navigate(`/achievements/verify/${selectedAchievement.id}`);
                          }}
                          className="w-full py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
                        >
                          Submit Verification
                        </button>
                      </div>
                    )}
                    <div className="p-4 bg-white/5 rounded-xl">
                      <h4 className="text-sm text-gray-400 mb-2">How to Unlock</h4>
                      <p className="text-sm">
                        {selectedAchievement.unlockHint || selectedAchievement.description || 'Keep training to unlock this achievement!'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedAchievement(null)}
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
