import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';

const LIMITATIONS = [
  { id: 'back_pain', name: 'Back Pain', icon: '🤴' },
  { id: 'knee_issue', name: 'Knee Issues', icon: '🦵' },
  { id: 'shoulder_injury', name: 'Shoulder Injury', icon: '💪' },
  { id: 'wrist_pain', name: 'Wrist Pain', icon: '🖐' },
  { id: 'limited_mobility', name: 'Limited Mobility', icon: '🦼﻿' },
  { id: 'heart_condition', name: 'Heart Condition', icon: '❤️' },
  { id: 'breathing', name: 'Breathing Issues', icon: '🫁' },
  { id: 'pregnant', name: 'Pregnant', icon: '🤰' },
];

const EQUIPMENT = [
  { id: 'dumbbells', name: 'Dumbbells', icon: '🪦' },
  { id: 'barbell', name: 'Barbell', icon: '🏋' },
  { id: 'kettlebells', name: 'Kettlebells', icon: '🔹' },
  { id: 'pullup_bar', name: 'Pull-up Bar', icon: '🪵' },
  { id: 'bench', name: 'Bench', icon: '🪰' },
  { id: 'resistance_bands', name: 'Resistance Bands', icon: '🎯' },
  { id: 'jump_rope', name: 'Jump Rope', icon: '🪢' },
  { id: 'yoga_mat', name: 'Yoga Mat', icon: '🤾' },
];

export default function Profile() {
  const { user, login } = useUser();
  const [profile, setProfile] = useState(null);
  const [avatars, setAvatars] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      api.profile.get(),
      api.profile.avatars().catch(() => ({ avatars: [] })),
      api.profile.themes().catch(() => ({ themes: [] })),
    ]).then(([p, a, t]) => {
      setProfile({ ...p, limitations: JSON.parse(p.limitations || '[]'), equipment_inventory: JSON.parse(p.equipment_inventory || '[]') });
      setAvatars(a.avatars || []);
      setThemes(t.themes || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.profile.update({ ...profile, limitations: JSON.stringify(profile.limitations), equipment_inventory: JSON.stringify(profile.equipment_inventory) });
      const token = localStorage.getItem('musclemap_token');
      login({ ...user, ...profile }, token);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch(e) {}
    setSaving(false);
  }

  function toggle(arr, id) {
    return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
  }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center"><div className="animate-pulse text-3xl">👤 Loading...</div></div>;

  const level = profile?.level || 1;
  const rarityColors = { common: 'bg-gray-600', uncommon: 'bg-green-600', rare: 'bg-blue-600', epic: 'bg-purple-600', legendary: 'bg-yellow-500' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pb-24">
      {success && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 px-8 py-4 rounded-2xl font-bold animate-bounce">✈ Saved!</div>}

      <header className="bg-gray-900/80 backdrop-blur-lg p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-blue-400">← Back</Link>
          <h1 className="text-xl font-bold">👤‍💪 Profile</h1>
          <button onClick={save} disabled={saving} className="bg-green-600 px-4 py-2 rounded-full font-bold">{saving ? '...' : 'Save'}</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {/* Level Badge */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 mb-6 text-center">
          <div className="text-6xl mb-2">{profile?.avatar_id ? '🐉' : '👀'}</div>
          <div className="text-2xl font-bold">{profile?.username}</div>
          <div className="text-lg opacity-90">Level {level} • {profile?.xp || 0} XP</div>
          <div className="bg-white/20 rounded-full h-3 mt-3 overflow-hidden"><div className="h-full bg-white rounded-full" style={{width: `${(profile?.xp || 0) % 100}%`}}></div></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['profile', 'health', 'equipment', 'avatar', 'theme'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full font-bold capitalize whitespace-nowrap ${tab===t ? 'bg-purple-600' : 'bg-gray-700'}`}>
{t}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Age</label>
              <input type="number" value={profile?.age || ''} onChange={e => setProfile({...profile, age: Number(e.target.value)})} className="w-full bg-gray-800 rounded-xl p-4 text-lg" placeholder="Enter your age" />
            </div>
            <div>
              <label className="text-sm text-gray-400">Gender</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['male', 'female', 'other'].map(g => (
                  <button key={g} onClick={() => setProfile({...profile, gender: g})} className={`p-3 rounded-xl font-bold capitalize ${profile?.gender === g ? 'bg-purple-600' : 'bg-gray-700'}`}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Health Tab */}
        {tab === 'health' && (
          <div>
            <p className="text-gray-400 mb-4">Select any limitations so we can adjust your workouts:</p>
            <div className="grid grid-cols-2 gap-3">
              {LIMITATIONS.map(l => (
                <button key={l.id} onClick={() => setProfile({...profile, limitations: toggle(profile?.limitations || [], l.id)})} className={`p-4 rounded-xl text-left transition-all ${(profile?.limitations || []).includes(l.id) ? 'bg-red-600 ring-2 ring-red-400' : 'bg-gray-700'}`}>
                  <span className="text-2xl">{l.icon}</span>
                  <span className="ml-2 font-bold">{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {tab === 'equipment' && (
          <div>
            <p className="text-gray-400 mb-4">What equipment do you have access to?</p>
            <div className="grid grid-cols-2 gap-3">
              {EQUIPMENT.map(e => (
                <button key={e.id} onClick={() => setProfile({...profile, equipment_inventory: toggle(profile?.equipment_inventory || [], e.id)})} className={`p-4 rounded-xl text-left transition-all ${(profile?.equipment_inventory || []).includes(e.id) ? 'bg-green-600 ring-2 ring-green-400' : 'bg-gray-700'}`}>
                  <span className="text-2xl">{e.icon}</span>
                  <span className="ml-2 font-bold">{e.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Avatar Tab */}
        {tab === 'avatar' && (
          <div>
            <p className="text-gray-400 mb-4">Choose your mascot (unlock more by leveling up!):</p>
            <div className="grid grid-cols-3 gap-4">
              {avatars.length > 0 ? avatars.map(a => {
                const locked = a.unlock_level > level;
                return (
                  <button key={a.id} onClick={() => !locked && setProfile({...profile, avatar_id: a.id})} disabled={locked} className={`p-4 rounded-2xl text-center transition-all ${locked ? 'opacity-40 cursor-not-allowed bg-gray-800' : profile?.avatar_id === a.id ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <div className="text-4xl mb-2">{locked ? '🔒' : '🐾'}</div>
                    <div className="font-bold text-sm">{a.name}</div>
                    <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${rarityColors[a.rarity] || 'rarityColors.common'}`}>{a.rarity}</div>
                    {locked && <div className="text-xs text-gray-500 mt-1">Lvl {a.unlock_level}</div>}
                  </button>
                );
              }) : <div className="col-span-3 text-center text-gray-500 py-8">No avatars available yet</div>}
            </div>
          </div>
        )}

        {/* Theme Tab */}
        {tab === 'theme' && (
          <div>
            <p className="text-gray-400 mb-4">Choose your app theme:</p>
            <div className="grid grid-cols-2 gap-4">
              {themes.length > 0 ? themes.map(t => {
                const locked = t.unlock_level > level;
                const colors = JSON.parse(t.colors || '{}');
                return (
                  <button key={t.id} onClick={() => !locked && setProfile({...profile, theme: t.id})} disabled={locked} className={`p-4 rounded-2xl text-center transition-all ${locked ? 'opacity-40 cursor-not-allowed' : profile?.theme === t.id ? 'ring-2 ring-purple-400' : ''}`} style={{background: colors.primary}}>
                    <div className="h-8 w-full rounded-lg mb-2" style={{background: colors.accent}}></div>
                    <div className="font-bold">{t.name}</div>
                    <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${rarityColors[t.rarity] || rarityColors.common}`}>{t.rarity}</div>
                    {locked && <div className="text-xs text-gray-500 mt-1">Lvl {t.unlock_level}</div>}
                  </button>
                );
              }) : <div className="col-span-2 text-center text-gray-500 py-8">No themes available yet</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}