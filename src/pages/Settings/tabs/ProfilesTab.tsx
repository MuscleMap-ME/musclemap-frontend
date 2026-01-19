/**
 * Profiles Settings Tab
 *
 * Manages configuration profiles:
 * - Create/edit/delete profiles
 * - Quick switch between profiles (Gym Mode, Home Mode, etc.)
 * - Profile-specific preference overrides
 */

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, Check, X, Zap, Home, Building, Trophy } from 'lucide-react';
import { usePreferencesStore, usePreferenceProfiles } from '../../../store/preferencesStore';
import type { PreferenceProfile } from '@musclemap/shared';

// ============================================
// PRESET PROFILES
// ============================================

const PROFILE_PRESETS = [
  {
    name: 'Gym Mode',
    icon: '🏋️',
    color: '#3B82F6',
    description: 'Optimized for gym workouts',
    overrides: {
      sounds: { masterVolume: 0.8, metronomeEnabled: false },
      hydration: { intervalMinutes: 20 },
      music: { autoPlayOnWorkout: true, fadeOnRest: true },
    },
  },
  {
    name: 'Home Mode',
    icon: '🏠',
    color: '#10B981',
    description: 'Quieter settings for home workouts',
    overrides: {
      sounds: { masterVolume: 0.5, timerSoundEnabled: true },
      hydration: { intervalMinutes: 30 },
      music: { autoPlayOnWorkout: false },
    },
  },
  {
    name: 'Competition Mode',
    icon: '🏆',
    color: '#F59E0B',
    description: 'Maximum focus, minimal distractions',
    overrides: {
      coaching: { coachTipsEnabled: false, motivationalQuotes: false },
      notifications: { socialNotifications: false },
      hydration: { enabled: false },
    },
  },
  {
    name: 'Recovery Mode',
    icon: '🧘',
    color: '#8B5CF6',
    description: 'Gentle settings for rest days',
    overrides: {
      sounds: { masterVolume: 0.3 },
      hydration: { intervalMinutes: 45 },
      workout: { defaultRestSeconds: 180 },
    },
  },
];

// ============================================
// COMPONENTS
// ============================================

function ProfileCard({
  profile,
  isActive,
  onActivate,
  onEdit,
  onDelete,
}: {
  profile: PreferenceProfile;
  isActive: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isActive
          ? 'border-purple-500 bg-purple-900/20'
          : 'border-transparent bg-gray-700/50 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: profile.color + '30' }}
          >
            {profile.icon}
          </div>
          <div>
            <div className="font-bold">{profile.name}</div>
            <div className="text-xs text-gray-400">{profile.description}</div>
          </div>
        </div>
        {isActive && (
          <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">Active</span>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onActivate}
          disabled={isActive}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            isActive
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-purple-600 hover:bg-purple-500'
          }`}
        >
          {isActive ? 'Active' : 'Activate'}
        </button>
        <button
          onClick={onEdit}
          className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {!profile.isDefault && (
          <button
            onClick={onDelete}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function CreateProfileModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (profile: Partial<PreferenceProfile>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚙️');
  const [color, setColor] = useState('#3B82F6');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;

    const preset = PROFILE_PRESETS.find((p) => p.name === selectedPreset);
    onCreate({
      name,
      description,
      icon,
      color,
      preferencesOverride: preset?.overrides || {},
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Create Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Start from preset */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Start from preset</label>
            <div className="grid grid-cols-2 gap-2">
              {PROFILE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setSelectedPreset(preset.name);
                    setName(preset.name);
                    setDescription(preset.description);
                    setIcon(preset.icon);
                    setColor(preset.color);
                  }}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedPreset === preset.name
                      ? 'border-2 border-purple-500 bg-purple-900/20'
                      : 'border-2 border-transparent bg-gray-700'
                  }`}
                >
                  <span className="text-xl mr-2">{preset.icon}</span>
                  <span className="text-sm">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Profile"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2"
            />
          </div>

          {/* Icon & Color */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-center text-2xl"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 bg-gray-700 border border-gray-600 rounded-xl cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfilesTab() {
  const {
    profiles,
    activeProfile,
    loadProfiles,
    createProfile,
    deleteProfile,
    activateProfile,
    deactivateProfile,
  } = usePreferenceProfiles();

  const isSaving = usePreferencesStore((s) => s.isSaving);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleCreate = (profile: Partial<PreferenceProfile>) => {
    createProfile(profile as Omit<PreferenceProfile, 'id' | 'userId' | 'createdAt'>);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="font-bold">Configuration Profiles</h2>
              <p className="text-sm text-gray-400">
                Quick switch between different setups
              </p>
            </div>
          </div>
          {isSaving && <span className="text-xs text-purple-400">Saving...</span>}
        </div>
      </section>

      {/* Active Profile */}
      {activeProfile && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Currently Active
          </h3>
          <div className="flex items-center justify-between p-3 bg-purple-900/30 border border-purple-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: activeProfile.color + '30' }}
              >
                {activeProfile.icon}
              </div>
              <div>
                <div className="font-bold">{activeProfile.name}</div>
                <div className="text-xs text-gray-400">{activeProfile.description}</div>
              </div>
            </div>
            <button
              onClick={deactivateProfile}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Deactivate
            </button>
          </div>
        </section>
      )}

      {/* Create New Profile */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full p-4 border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-2xl transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-white"
      >
        <Plus className="w-5 h-5" />
        Create New Profile
      </button>

      {/* Profile List */}
      {profiles.length > 0 && (
        <section className="bg-gray-800 rounded-2xl p-4">
          <h3 className="font-bold mb-4">Your Profiles</h3>
          <div className="space-y-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isActive={activeProfile?.id === profile.id}
                onActivate={() => activateProfile(profile.id)}
                onEdit={() => {
                  // TODO: Implement edit modal
                }}
                onDelete={() => deleteProfile(profile.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Preset Suggestions */}
      {profiles.length < 4 && (
        <section className="bg-gray-800/50 rounded-2xl p-4">
          <h3 className="font-bold mb-3">💡 Quick Setup Ideas</h3>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_PRESETS.filter(
              (preset) => !profiles.some((p) => p.name === preset.name)
            ).map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  createProfile({
                    name: preset.name,
                    description: preset.description,
                    icon: preset.icon,
                    color: preset.color,
                    preferencesOverride: preset.overrides,
                    isDefault: false,
                    sortOrder: profiles.length,
                  });
                }}
                className="p-3 bg-gray-700/50 hover:bg-gray-700 rounded-xl text-left transition-colors"
              >
                <span className="text-xl">{preset.icon}</span>
                <div className="font-medium text-sm mt-1">{preset.name}</div>
                <div className="text-xs text-gray-500">{preset.description}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="bg-gray-800/50 rounded-2xl p-4">
        <h3 className="font-bold mb-3">How Profiles Work</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Profiles override your base preferences when active</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Switch profiles to quickly change multiple settings at once</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Deactivate a profile to return to your default settings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">•</span>
            <span>Settings not specified in a profile use your defaults</span>
          </li>
        </ul>
      </section>

      {/* Create Profile Modal */}
      {showCreateModal && (
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
