import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';

const THEMES = [
  { id: 'dark', name: 'Dark', bg: '#111827', icon: '🌙' },
  { id: 'light', name: 'Light', bg: '#f9fafb', icon: '☀️', textDark: true },
  { id: 'midnight', name: 'Midnight', bg: '#0f172a', icon: '🌌' },
  { id: 'ocean', name: 'Ocean', bg: '#0c4a6e', icon: '🌊', level: 5 },
  { id: 'forest', name: 'Forest', bg: '#14532d', icon: '🌲', level: 10 },
  { id: 'sunset', name: 'Sunset', bg: '#7c2d12', icon: '🌅', level: 15 },
  { id: 'cosmic', name: 'Cosmic', bg: '#1e1b4b', icon: '✨', level: 25 },
];

export default function Settings() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    reduced_motion: 0,
    high_contrast: 0,
    text_size: 'normal',
    is_public: 0,
    show_location: 0,
    show_progress: 1
  });
  const [userLevel, setUserLevel] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.settings.fetch(),
      api.profile.get()
    ]).then(([s, p]) => {
      if (s.settings) setSettings(prev => ({ ...prev, ...s.settings }));
      else setSettings(prev => ({ ...prev, ...s }));
      if (p.level) setUserLevel(p.level);
    }).catch(() => {});
  }, []);

  const save = async (updates) => {
    setSaving(true);
    setSettings(s => ({ ...s, ...updates }));
    try {
      await api.settings.update(updates);
      if (updates.theme) localStorage.setItem('musclemap_theme', updates.theme);
    } catch(_err) {}
    setSaving(false);
  };

  const Toggle = ({ value, onChange }) => (
    <button 
      onClick={onChange} 
      className={'w-14 h-8 rounded-full transition-all duration-200 ' + (value ? 'bg-purple-600' : 'bg-gray-600')}
    >
      <div className={'w-6 h-6 bg-white rounded-full transition-transform duration-200 mx-1 ' + (value ? 'translate-x-6' : '')} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <header className="bg-gray-800/90 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <span>←</span>
            <img src="/logo.png" alt="MuscleMap" className="w-6 h-6 rounded-md" />
          </Link>
          <h1 className="text-xl font-bold">⚙️ Settings</h1>
          <div className="w-16">{saving && <span className="text-xs text-gray-400">Saving...</span>}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Theme Selection */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4 flex items-center gap-2">🎨 Theme <span className="text-xs text-gray-400 font-normal">Level {userLevel}</span></h2>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(t => {
              const locked = t.level && userLevel < t.level;
              return (
                <button
                  key={t.id}
                  onClick={() => !locked && save({ theme: t.id })}
                  disabled={locked}
                  className={'p-3 rounded-xl border-2 transition-all ' + 
                    (settings.theme === t.id ? 'border-purple-500 scale-105' : 'border-transparent') +
                    (locked ? ' opacity-40 cursor-not-allowed' : ' hover:scale-102')}
                  style={{ backgroundColor: t.bg, color: t.textDark ? '#111' : '#fff' }}
                >
                  <div className="text-xl">{t.icon}</div>
                  <div className="text-xs font-bold mt-1">{t.name}</div>
                  {locked && <div className="text-xs opacity-75">🔒 Lv{t.level}</div>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Accessibility */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">♿ Accessibility</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Reduced Motion</div>
                <div className="text-sm text-gray-400">Minimize animations</div>
              </div>
              <Toggle value={settings.reduced_motion} onChange={() => save({ reduced_motion: settings.reduced_motion ? 0 : 1 })} />
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">High Contrast</div>
                <div className="text-sm text-gray-400">Increase text visibility</div>
              </div>
              <Toggle value={settings.high_contrast} onChange={() => save({ high_contrast: settings.high_contrast ? 0 : 1 })} />
            </div>
            
            <div>
              <div className="font-medium mb-2">Text Size</div>
              <div className="flex gap-2">
                {['small', 'normal', 'large', 'xlarge'].map(s => (
                  <button 
                    key={s} 
                    onClick={() => save({ text_size: s })} 
                    className={'flex-1 py-2 rounded-xl capitalize transition-all ' + (settings.text_size === s ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600')}
                  >
                    {s === 'xlarge' ? 'XL' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">🔒 Privacy</h2>
          <div className="space-y-4">
            {/* Link to full privacy settings */}
            <Link
              to="/community"
              state={{ tab: 'privacy' }}
              className="block p-4 bg-green-900/30 border border-green-600/30 rounded-xl hover:bg-green-900/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <div className="font-medium">Privacy Mode & Data Controls</div>
                    <div className="text-sm text-gray-400">
                      Opt out of community features, manage data collection
                    </div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>

            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-4">Quick settings (for full control, use Privacy Mode above)</p>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Public Profile</div>
                <div className="text-sm text-gray-400">Appear in leaderboards & community</div>
              </div>
              <Toggle value={settings.is_public} onChange={() => save({ is_public: settings.is_public ? 0 : 1 })} />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Show Location</div>
                <div className="text-sm text-gray-400">Share your city with others</div>
              </div>
              <Toggle value={settings.show_location} onChange={() => save({ show_location: settings.show_location ? 0 : 1 })} />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Show Progress</div>
                <div className="text-sm text-gray-400">Let others see your TU</div>
              </div>
              <Toggle value={settings.show_progress} onChange={() => save({ show_progress: settings.show_progress ? 0 : 1 })} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
