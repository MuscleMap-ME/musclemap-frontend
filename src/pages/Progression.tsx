import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import {
  PROGRESSION_MASTERY_QUERY,
  PROGRESSION_ACHIEVEMENTS_QUERY,
  PROGRESSION_NUTRITION_QUERY,
  PROGRESSION_LEADERBOARD_QUERY,
} from '../graphql';

// Types
interface MasteryItem {
  archetypeId: string;
  archetypeName: string;
  totalTu: number;
  tier: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
  iconUrl?: string;
}

interface NutritionTip {
  id: string;
  title: string;
  content: string;
}

interface NutritionData {
  tips: NutritionTip[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  level: number;
  xp: number;
  totalTu: number;
}

interface Tier {
  id: string;
  name: string;
  min: number;
  icon: string;
  color: string;
}

const TIERS: Tier[] = [
  { id: 'novice', name: 'Novice', min: 0, icon: 'S', color: 'bg-gray-600' },
  { id: 'journeyman', name: 'Journeyman', min: 1000, icon: 'J', color: 'bg-green-600' },
  { id: 'advanced', name: 'Advanced', min: 2000, icon: 'A', color: 'bg-blue-600' },
  { id: 'master', name: 'Master', min: 5000, icon: 'M', color: 'bg-purple-600' },
  { id: 'grandmaster', name: 'Grandmaster', min: 10000, icon: 'G', color: 'bg-yellow-500' },
];

export default function Progression() {
  const [tab, setTab] = useState('mastery');

  // GraphQL queries
  const { data: masteryData, loading: masteryLoading } = useQuery<{ progressionMastery: MasteryItem[] }>(
    PROGRESSION_MASTERY_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data: achievementsData, loading: achievementsLoading } = useQuery<{ progressionAchievements: Achievement[] }>(
    PROGRESSION_ACHIEVEMENTS_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data: nutritionData, loading: nutritionLoading } = useQuery<{ progressionNutrition: NutritionData }>(
    PROGRESSION_NUTRITION_QUERY,
    { fetchPolicy: 'cache-and-network' }
  );

  const { data: leaderboardData, loading: leaderboardLoading } = useQuery<{ progressionLeaderboard: LeaderboardEntry[] }>(
    PROGRESSION_LEADERBOARD_QUERY,
    {
      variables: { limit: 10 },
      fetchPolicy: 'cache-and-network'
    }
  );

  // Extract data from queries
  const mastery = useMemo(() => masteryData?.progressionMastery || [], [masteryData]);
  const achievements = useMemo(() => achievementsData?.progressionAchievements || [], [achievementsData]);
  const nutrition = useMemo(() => nutritionData?.progressionNutrition || { tips: [] }, [nutritionData]);
  const leaderboard = useMemo(() => leaderboardData?.progressionLeaderboard || [], [leaderboardData]);

  const loading = masteryLoading || achievementsLoading || nutritionLoading || leaderboardLoading;

  const getTier = (tu: number): Tier => {
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (tu >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[0];
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400">Back</Link>
          <h1 className="text-xl font-bold">Progression</h1>
          <div></div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 mb-6">
          {['mastery', 'achievements', 'nutrition', 'leaderboard'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full capitalize ${tab === t ? 'bg-purple-600' : 'bg-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'mastery' && mastery.map(m => {
          const tier = getTier(m.totalTu);
          return (
            <div key={m.archetypeId} className="bg-gray-800 rounded-xl p-4 mb-4">
              <div className="font-bold capitalize">{m.archetypeName || m.archetypeId} - {tier.name}</div>
              <div>{Math.round(m.totalTu)} TU</div>
            </div>
          );
        })}

        {tab === 'achievements' && achievements.map(a => (
          <div key={a.id} className={`p-4 rounded-xl mb-2 ${a.earned ? 'bg-yellow-600' : 'bg-gray-800 opacity-50'}`}>
            <div className="font-bold">{a.name}</div>
            <div className="text-sm">{a.description}</div>
          </div>
        ))}

        {tab === 'nutrition' && nutrition.tips?.map(t => (
          <div key={t.id} className="bg-green-900 rounded-xl p-4 mb-2">
            <div className="font-bold">{t.title}</div>
            <div className="text-sm">{t.content}</div>
          </div>
        ))}

        {tab === 'leaderboard' && leaderboard.map((e, i) => (
          <div key={e.userId || i} className="bg-gray-800 rounded-xl p-4 mb-2 flex justify-between">
            <div>#{e.rank || i + 1} {e.username}</div>
            <div>{Math.round(e.totalTu)} TU</div>
          </div>
        ))}
      </main>
    </div>
  );
}
