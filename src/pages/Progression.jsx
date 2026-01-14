import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';

const TIERS = [
  { id: 'novice', name: 'Novice', min: 0, icon: 'S', color: 'bg-gray-600' },
  { id: 'journeyman', name: 'Journeyman', min: 1000, icon: 'J', color: 'bg-green-600' },
  { id: 'advanced', name: 'Advanced', min: 2000, icon: 'A', color: 'bg-blue-600' },
  { id: 'master', name: 'Master', min: 5000, icon: 'M', color: 'bg-purple-600' },
  { id: 'grandmaster', name: 'Grandmaster', min: 10000, icon: 'G', color: 'bg-yellow-500' },
];

export default function Progression() {
  const [tab, setTab] = useState('mastery');
  const [mastery, setMastery] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [nutrition, setNutrition] = useState({ tips: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch('/api/progression/mastery', { headers }).then(r => r.json()),
      fetch('/api/progression/achievements', { headers }).then(r => r.json()),
      fetch('/api/progression/nutrition', { headers }).then(r => r.json()),
      fetch('/api/progression/leaderboard?limit=10').then(r => r.json()),
    ]).then(([m, a, n, l]) => {
      setMastery(m.mastery || []);
      setAchievements(a.achievements || []);
      setNutrition(n);
      setLeaderboard(l.leaderboard || []);
      setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTier = (tu) => {
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
          {['mastery','achievements','nutrition','leaderboard'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-full capitalize ${tab===t?'bg-purple-600':'bg-gray-700'}`}>{t}</button>
          ))}
        </div>
        {tab==='mastery'&&mastery.map(m=>{
          const tier=getTier(m.total_tu);
          return(<div key={m.archetype_id} className="bg-gray-800 rounded-xl p-4 mb-4">
            <div className="font-bold capitalize">{m.archetype_id} - {tier.name}</div>
            <div>{Math.round(m.total_tu)} TU</div>
          </div>);
        })}
        {tab==='achievements'&&achievements.map(a=>(
          <div key={a.id} className={`p-4 rounded-xl mb-2 ${a.earned?'bg-yellow-600':'bg-gray-800 opacity-50'}`}>
            <div className="font-bold">{a.name}</div>
            <div className="text-sm">{a.description}</div>
          </div>
        ))}
        {tab==='nutrition'&&nutrition.tips?.map(t=>(
          <div key={t.id} className="bg-green-900 rounded-xl p-4 mb-2">
            <div className="font-bold">{t.title}</div>
            <div className="text-sm">{t.content}</div>
          </div>
        ))}
        {tab==='leaderboard'&&leaderboard.map((e,i)=>(
          <div key={i} className="bg-gray-800 rounded-xl p-4 mb-2 flex justify-between">
            <div>#{i+1} {e.display_name}</div>
            <div>{Math.round(e.total_tu)} TU</div>
          </div>
        ))}
      </main>
    </div>
  );
}
