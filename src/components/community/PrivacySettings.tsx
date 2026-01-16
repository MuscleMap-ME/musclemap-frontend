/**
 * PrivacySettings Component
 *
 * User privacy controls for community features and minimalist mode.
 * Allows users to opt out of all community features entirely.
 */

import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/auth';

function ToggleSwitch({ enabled, onChange, disabled = false, color = 'purple' }) {
  const colorClasses = {
    purple: enabled ? 'bg-purple-600' : 'bg-gray-600',
    green: enabled ? 'bg-green-600' : 'bg-gray-600',
    blue: enabled ? 'bg-blue-600' : 'bg-gray-600',
  };

  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${colorClasses[color]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, enabled, onChange, disabled, icon }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-700 last:border-0">
      <div className="flex items-start gap-3">
        {icon && <span className="text-xl mt-0.5">{icon}</span>}
        <div>
          <h4 className="text-white font-medium">{title}</h4>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  );
}

export default function PrivacySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, summaryRes] = await Promise.all([
        authFetch('/api/privacy'),
        authFetch('/api/privacy/summary'),
      ]);

      if (!settingsRes.ok) throw new Error('Failed to fetch privacy settings');
      if (!summaryRes.ok) throw new Error('Failed to fetch privacy summary');

      const settingsJson = await settingsRes.json();
      const summaryJson = await summaryRes.json();

      setSettings(settingsJson.data);
      setSummary(summaryJson.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await authFetch('/api/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      const json = await res.json();
      setSettings(json.data);

      // Refresh summary
      const summaryRes = await authFetch('/api/privacy/summary');
      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json();
        setSummary(summaryJson.data);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const enableMinimalistMode = async () => {
    if (!window.confirm(
      'Enable Minimalist Mode?\n\nThis will disable all community features and exclude your data from all comparisons and public features.\n\nYou can always re-enable features later.'
    )) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await authFetch('/api/privacy/enable-minimalist', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to enable minimalist mode');
      await fetchSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const disableMinimalistMode = async () => {
    if (!window.confirm(
      'Disable Minimalist Mode?\n\nThis will restore all features to their default settings. Your data will again be visible in community features.'
    )) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await authFetch('/api/privacy/disable-minimalist', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to disable minimalist mode');
      await fetchSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isMinimalist = settings?.minimalistMode;

  return (
    <div className="space-y-6">
      {/* Minimalist Mode Card */}
      <div className={`rounded-xl p-6 ${isMinimalist ? 'bg-green-900/30 border border-green-600/30' : 'bg-gray-800'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{isMinimalist ? '🛡️' : '🔒'}</span>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isMinimalist ? 'Minimalist Mode Active' : 'Privacy Mode'}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {isMinimalist
                  ? 'All community features are disabled'
                  : 'One-click to disable all social features'}
              </p>
            </div>
          </div>
          {success && (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <span>✓</span> Saved
            </span>
          )}
          {saving && (
            <span className="text-gray-400 text-sm">Saving...</span>
          )}
        </div>

        {summary && (
          <p className="text-gray-300 text-sm mb-4 bg-gray-700/50 rounded-lg p-3">
            {summary.summary}
          </p>
        )}

        <button
          onClick={isMinimalist ? disableMinimalistMode : enableMinimalistMode}
          disabled={saving}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            isMinimalist
              ? 'bg-gray-600 hover:bg-gray-500 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {saving ? (
            'Processing...'
          ) : isMinimalist ? (
            '🔓 Restore Standard Mode'
          ) : (
            '🔒 Enable Minimalist Mode'
          )}
        </button>

        {!isMinimalist && (
          <p className="text-gray-500 text-xs text-center mt-2">
            Disable all community features with one click
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Data Privacy Summary */}
      {summary && (
        <div className="bg-gray-800 rounded-xl p-6">
          <SectionHeader title="Your Data Privacy" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Comparisons', key: 'excludedFromComparisons' },
              { label: 'Activity Feed', key: 'excludedFromActivityFeed' },
              { label: 'Location', key: 'locationHidden' },
              { label: 'Presence', key: 'presenceHidden' },
              { label: 'Profile', key: 'profilePrivate' },
            ].map(({ label, key }) => (
              <div
                key={key}
                className={`p-3 rounded-lg text-center ${
                  summary.dataPrivacy[key] ? 'bg-green-900/30' : 'bg-gray-700/50'
                }`}
              >
                <span className="text-2xl">{summary.dataPrivacy[key] ? '🔒' : '👁️'}</span>
                <p className="text-white text-sm font-medium mt-1">{label}</p>
                <p className="text-gray-400 text-xs">
                  {summary.dataPrivacy[key] ? 'Hidden' : 'Visible'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Features */}
      <div className={`bg-gray-800 rounded-xl p-6 ${isMinimalist ? 'opacity-60' : ''}`}>
        <SectionHeader
          title="Community Features"
          description={isMinimalist ? 'Disabled in minimalist mode' : 'Toggle individual features'}
        />

        <div className="space-y-1">
          <SettingRow
            icon="🏆"
            title="Leaderboards"
            description="Appear in public rankings"
            enabled={!settings?.optOutLeaderboards}
            onChange={(v) => updateSetting('optOutLeaderboards', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="📰"
            title="Community Feed"
            description="Your activity visible in the feed"
            enabled={!settings?.optOutCommunityFeed}
            onChange={(v) => updateSetting('optOutCommunityFeed', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="👥"
            title="Crews"
            description="Join and participate in crews"
            enabled={!settings?.optOutCrews}
            onChange={(v) => updateSetting('optOutCrews', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="⚔️"
            title="Rivals"
            description="Challenge and compete with others"
            enabled={!settings?.optOutRivals}
            onChange={(v) => updateSetting('optOutRivals', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="📍"
            title="Hangouts"
            description="Location-based community hubs"
            enabled={!settings?.optOutHangouts}
            onChange={(v) => updateSetting('optOutHangouts', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="💬"
            title="Messaging"
            description="Direct and group messages"
            enabled={!settings?.optOutMessaging}
            onChange={(v) => updateSetting('optOutMessaging', !v)}
            disabled={saving || isMinimalist}
          />
        </div>
      </div>

      {/* UI Preferences */}
      <div className="bg-gray-800 rounded-xl p-6">
        <SectionHeader title="UI Preferences" description="Customize your experience" />

        <div className="space-y-1">
          <SettingRow
            icon="🎮"
            title="Gamification"
            description="XP, levels, and RPG elements"
            enabled={!settings?.hideGamification}
            onChange={(v) => updateSetting('hideGamification', !v)}
            disabled={saving}
          />

          <SettingRow
            icon="🏅"
            title="Achievements"
            description="Badges and milestones"
            enabled={!settings?.hideAchievements}
            onChange={(v) => updateSetting('hideAchievements', !v)}
            disabled={saving}
          />

          <SettingRow
            icon="💡"
            title="Tips & Insights"
            description="Contextual guidance"
            enabled={!settings?.hideTips}
            onChange={(v) => updateSetting('hideTips', !v)}
            disabled={saving}
          />

          <SettingRow
            icon="🔔"
            title="Social Notifications"
            description="Alerts about social activity"
            enabled={!settings?.hideSocialNotifications}
            onChange={(v) => updateSetting('hideSocialNotifications', !v)}
            disabled={saving}
          />

          <SettingRow
            icon="📊"
            title="Progress Comparisons"
            description="Compare with other users"
            enabled={!settings?.hideProgressComparisons}
            onChange={(v) => updateSetting('hideProgressComparisons', !v)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Data & Tracking */}
      <div className={`bg-gray-800 rounded-xl p-6 ${isMinimalist ? 'opacity-60' : ''}`}>
        <SectionHeader title="Data & Tracking" description="Control how your data is used" />

        <div className="space-y-1">
          <SettingRow
            icon="📈"
            title="Stats Comparison"
            description="Include in aggregated statistics"
            enabled={!settings?.excludeFromStatsComparison}
            onChange={(v) => updateSetting('excludeFromStatsComparison', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="🗺️"
            title="Location Features"
            description="Geographic data collection"
            enabled={!settings?.excludeFromLocationFeatures}
            onChange={(v) => updateSetting('excludeFromLocationFeatures', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="🟢"
            title="Presence Tracking"
            description="Online status visibility"
            enabled={!settings?.disablePresenceTracking}
            onChange={(v) => updateSetting('disablePresenceTracking', !v)}
            disabled={saving || isMinimalist}
          />

          <SettingRow
            icon="📤"
            title="Workout Sharing"
            description="Allow workouts to be public"
            enabled={!settings?.disableWorkoutSharing}
            onChange={(v) => updateSetting('disableWorkoutSharing', !v)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-white font-medium flex items-center gap-2 mb-2">
          <span>🔒</span> Privacy First
        </h4>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• Your personal workout data is always private unless you explicitly share it</li>
          <li>• Changes are saved automatically</li>
          <li>• You can enable minimalist mode at any time to disable all community features</li>
          <li>• Your data is never sold to third parties</li>
        </ul>
      </div>
    </div>
  );
}
