import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { api } from '../utils/api';
import { sanitizeText, sanitizeNumber } from '../utils/sanitize';
import { XPProgress } from '../components/gamification';
import { WeeklyHeatmap } from '../components/analytics';
import { MuscleViewer } from '../components/muscle-viewer';
import type { MuscleActivation } from '../components/muscle-viewer/types';

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
  const { token, user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [avatars, setAvatars] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');
  const [success, setSuccess] = useState(false);
  const [muscleActivations, setMuscleActivations] = useState<Record<string, number>>({});

  const loadProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [p, a, t] = await Promise.all([
        api.profile.get(),
        api.profile.avatars().catch(() => ({ avatars: [] })),
        api.profile.themes().catch(() => ({ themes: [] })),
      ]);
      setProfile({ ...p, limitations: JSON.parse(p.limitations || '[]'), equipment_inventory: JSON.parse(p.equipment_inventory || '[]') });
      setAvatars(a.avatars || []);
      setThemes(t.themes || []);
    } catch {
      // Failed to load profile
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load muscle activation data for physique display
  const loadMuscleData = useCallback(async () => {
    try {
      const response = await fetch('/api/muscles/activations');
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        const activationMap: Record<string, number> = {};
        data.data.forEach((item: { muscleId: string; activation: number }) => {
          activationMap[item.muscleId] = item.activation;
        });
        setMuscleActivations(activationMap);
      }
    } catch {
      // Use mock data if API fails
      setMuscleActivations({
        'chest': 65,
        'front_delts': 45,
        'biceps': 30,
        'abs': 20,
        'quads': 50,
        'lats': 35,
        'traps': 40,
        'glutes': 55,
      });
    }
  }, []);

  // Convert to MuscleActivation array format
  const physiqueActivations = useMemo((): MuscleActivation[] => {
    return Object.entries(muscleActivations).map(([muscleId, activation]) => ({
      id: muscleId,
      intensity: activation / 100,
      isPrimary: activation > 50,
    }));
  }, [muscleActivations]);

  useEffect(() => {
    loadProfile();
    loadMuscleData();
  }, [loadProfile, loadMuscleData]);

  async function save() {
    setSaving(true);
    try {
      // Sanitize profile data before sending to API
      const sanitizedProfile = {
        ...profile,
        username: sanitizeText(profile.username || ''),
        age: sanitizeNumber(profile.age, { min: 1, max: 150, defaultValue: null }),
        gender: sanitizeText(profile.gender || ''),
        limitations: JSON.stringify(profile.limitations),
        equipment_inventory: JSON.stringify(profile.equipment_inventory),
      };
      await api.profile.update(sanitizedProfile);
      login({ ...user, ...profile }, token);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      // Failed to save profile
    }
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
          <XPProgress
            currentXP={profile?.xp || 0}
            xpForNextLevel={1000}
            level={level}
            levelTitle={level <= 5 ? 'Beginner' : level <= 15 ? 'Intermediate' : level <= 30 ? 'Advanced' : 'Elite'}
            colorScheme="light"
          />
        </div>

        {/* Weekly Activity */}
        <div className="bg-gray-800 rounded-2xl p-4 mb-6">
          <h3 className="text-sm text-gray-400 uppercase mb-3">This Week's Activity</h3>
          <WeeklyHeatmap
            data={profile?.weeklyActivity || [2, 1, 3, 0, 2, 1, 0]}
            colorScheme="purple"
            showTooltip={true}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['profile', 'physique', 'health', 'equipment', 'avatar', 'theme'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full font-bold capitalize whitespace-nowrap ${tab===t ? 'bg-purple-600' : 'bg-gray-700'}`}>
              {t === 'physique' ? '💪 Physique' : t}
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

        {/* Physique Tab */}
        {tab === 'physique' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-2">Your Physique</h3>
              <p className="text-gray-400 text-sm">Based on your training history</p>
            </div>

            {/* 3D Muscle Visualization */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <MuscleViewer
                muscles={physiqueActivations}
                mode="card"
                interactive={true}
                showLabels={true}
                autoRotate={true}
                initialView="front"
                className="w-full max-w-[300px] mx-auto"
                style={{ height: 360 }}
              />
            </div>

            {/* Muscle Development Stats */}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h4 className="text-sm text-gray-400 uppercase mb-3">Muscle Development</h4>
              <div className="space-y-3">
                {physiqueActivations.slice(0, 6).map((muscle) => (
                  <div key={muscle.id} className="flex items-center gap-3">
                    <span className="text-white/80 text-sm w-24 capitalize">{muscle.id.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${muscle.intensity * 100}%` }}
                      />
                    </div>
                    <span className="text-white/60 text-xs w-10 text-right">{Math.round(muscle.intensity * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-4 border border-purple-500/30">
              <p className="text-sm text-gray-300">
                💡 <strong>Tip:</strong> Your physique visualization updates based on your workout history. Train consistently to see your progress!
              </p>
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