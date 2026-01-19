/**
 * Privacy Settings Tab
 *
 * Controls privacy preferences:
 * - Public profile
 * - Leaderboard visibility
 * - Progress sharing
 * - Location sharing
 * - Achievement visibility
 */

import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, MapPin, Trophy, Users, BarChart3, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePrivacySettings } from '../../../store/preferencesStore';
import { api } from '../../../utils/api';

// ============================================
// COMPONENTS
// ============================================

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-14 h-8 rounded-full transition-all duration-200 ${
        value ? 'bg-purple-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full transition-transform duration-200 mx-1 ${
          value ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PrivacyTab() {
  const { settings, updateSettings } = usePrivacySettings();
  const [_legacySettings, setLegacySettings] = useState({
    is_public: 0,
    show_location: 0,
    show_progress: 1,
  });
  const [saving, setSaving] = useState(false);

  // Load legacy settings
  useEffect(() => {
    api.settings
      .fetch()
      .then((s: { settings?: typeof legacySettings } & typeof legacySettings) => {
        if (s.settings) setLegacySettings((prev) => ({ ...prev, ...s.settings }));
        else setLegacySettings((prev) => ({ ...prev, ...s }));
      })
      .catch(() => {});
  }, []);

  const saveLegacy = async (updates: Partial<typeof legacySettings>) => {
    setSaving(true);
    setLegacySettings((s) => ({ ...s, ...updates }));
    try {
      await api.settings.update(updates);
    } catch {
      // Silent fail
    }
    setSaving(false);
  };

  const isFullyPrivate =
    !settings.publicProfile &&
    !settings.showOnLeaderboards &&
    !settings.showProgress &&
    !settings.showLocation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="font-bold">Privacy Controls</h2>
            <p className="text-sm text-gray-400">
              Control who can see your profile and data
            </p>
          </div>
        </div>

        {saving && (
          <div className="mt-2 text-xs text-purple-400">Saving changes...</div>
        )}
      </section>

      {/* Privacy Mode Link */}
      <Link
        to="/community"
        state={{ tab: 'privacy' }}
        className="block p-4 bg-green-900/30 border border-green-600/30 rounded-2xl hover:bg-green-900/40 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="font-medium">Full Privacy Mode & Data Controls</div>
              <div className="text-sm text-gray-400">
                Completely opt out of community features, manage data collection
              </div>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-gray-400" />
        </div>
      </Link>

      {/* Profile Visibility */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Profile Visibility
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              {settings.publicProfile ? (
                <Eye className="w-5 h-5 text-green-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <div className="font-medium">Public Profile</div>
                <div className="text-sm text-gray-400">Others can view your profile</div>
              </div>
            </div>
            <Toggle
              value={settings.publicProfile}
              onChange={() => {
                updateSettings({ publicProfile: !settings.publicProfile });
                saveLegacy({ is_public: settings.publicProfile ? 0 : 1 });
              }}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium">Show Location</div>
                <div className="text-sm text-gray-400">Display your city on profile</div>
              </div>
            </div>
            <Toggle
              value={settings.showLocation}
              onChange={() => {
                updateSettings({ showLocation: !settings.showLocation });
                saveLegacy({ show_location: settings.showLocation ? 0 : 1 });
              }}
              disabled={!settings.publicProfile}
            />
          </div>
        </div>

        {!settings.publicProfile && (
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-xl flex gap-2">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200">
              Your profile is private. Others cannot find or view your profile.
            </p>
          </div>
        )}
      </section>

      {/* Progress & Achievements */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Progress & Data
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Show Progress (TU)</div>
              <div className="text-sm text-gray-400">Let others see your training units</div>
            </div>
            <Toggle
              value={settings.showProgress}
              onChange={() => {
                updateSettings({ showProgress: !settings.showProgress });
                saveLegacy({ show_progress: settings.showProgress ? 0 : 1 });
              }}
              disabled={!settings.publicProfile}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="font-medium">Show Achievements</div>
                <div className="text-sm text-gray-400">Display badges on your profile</div>
              </div>
            </div>
            <Toggle
              value={settings.showAchievementsOnProfile}
              onChange={() =>
                updateSettings({ showAchievementsOnProfile: !settings.showAchievementsOnProfile })
              }
              disabled={!settings.publicProfile}
            />
          </div>
        </div>
      </section>

      {/* Leaderboard Settings */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">🏆 Leaderboards</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Appear on Leaderboards</div>
              <div className="text-sm text-gray-400">Compete and rank with others</div>
            </div>
            <Toggle
              value={settings.showOnLeaderboards}
              onChange={() => updateSettings({ showOnLeaderboards: !settings.showOnLeaderboards })}
              disabled={!settings.publicProfile}
            />
          </div>
        </div>

        {!settings.showOnLeaderboards && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-xl flex gap-2">
            <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              You won&apos;t appear on any leaderboards. You can still view rankings.
            </p>
          </div>
        )}
      </section>

      {/* Privacy Summary */}
      <section
        className={`rounded-2xl p-4 ${
          isFullyPrivate
            ? 'bg-green-900/30 border border-green-500/30'
            : 'bg-gray-800/50'
        }`}
      >
        <h3 className="font-bold mb-3">Privacy Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={settings.publicProfile ? 'text-yellow-400' : 'text-green-400'}>
              {settings.publicProfile ? '⚠' : '✓'}
            </span>
            <span>Profile: {settings.publicProfile ? 'Public' : 'Private'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.showLocation ? 'text-yellow-400' : 'text-green-400'}>
              {settings.showLocation ? '⚠' : '✓'}
            </span>
            <span>Location: {settings.showLocation ? 'Visible' : 'Hidden'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.showProgress ? 'text-yellow-400' : 'text-green-400'}>
              {settings.showProgress ? '⚠' : '✓'}
            </span>
            <span>Progress: {settings.showProgress ? 'Visible' : 'Hidden'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.showOnLeaderboards ? 'text-yellow-400' : 'text-green-400'}>
              {settings.showOnLeaderboards ? '⚠' : '✓'}
            </span>
            <span>Leaderboards: {settings.showOnLeaderboards ? 'Opted In' : 'Opted Out'}</span>
          </div>
        </div>

        {isFullyPrivate && (
          <div className="mt-3 pt-3 border-t border-green-500/30 text-sm text-green-400">
            🔒 Maximum privacy - your data is completely private
          </div>
        )}
      </section>
    </div>
  );
}
