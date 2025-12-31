/**
 * PrivacySettings Component
 *
 * User privacy controls for community features.
 */

import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/auth';

function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-purple-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, enabled, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-700 last:border-0">
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function PrivacySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    shareLocation: false,
    showInFeed: true,
    showOnMap: true,
    showWorkoutDetails: false,
    publicProfile: true,
    publicDisplayName: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await authFetch('/api/community/privacy');
      if (!res.ok) throw new Error('Failed to fetch privacy settings');
      const json = await res.json();
      setSettings(json.data);
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
      const res = await authFetch('/api/community/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      const json = await res.json();
      setSettings(json.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateDisplayName = async () => {
    if (!settings.publicDisplayName.trim()) return;
    await updateSetting('publicDisplayName', settings.publicDisplayName.trim());
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Privacy Settings</h3>
        {success && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <span>✓</span> Saved
          </span>
        )}
        {saving && (
          <span className="text-gray-400 text-sm">Saving...</span>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <SettingRow
          title="Share Location"
          description="Allow your coarse location (city level) to appear on the community map"
          enabled={settings.shareLocation}
          onChange={(v) => updateSetting('shareLocation', v)}
          disabled={saving}
        />

        <SettingRow
          title="Show in Activity Feed"
          description="Allow your activities to appear in the community feed"
          enabled={settings.showInFeed}
          onChange={(v) => updateSetting('showInFeed', v)}
          disabled={saving}
        />

        <SettingRow
          title="Show on Map"
          description="Display your presence on the community map when active"
          enabled={settings.showOnMap}
          onChange={(v) => updateSetting('showOnMap', v)}
          disabled={saving || !settings.shareLocation}
        />

        <SettingRow
          title="Show Workout Details"
          description="Include exercise details in your public activity"
          enabled={settings.showWorkoutDetails}
          onChange={(v) => updateSetting('showWorkoutDetails', v)}
          disabled={saving || !settings.showInFeed}
        />

        <SettingRow
          title="Public Profile"
          description="Show your username instead of anonymous in the feed"
          enabled={settings.publicProfile}
          onChange={(v) => updateSetting('publicProfile', v)}
          disabled={saving}
        />
      </div>

      {/* Display Name */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h4 className="text-white font-medium mb-2">Public Display Name</h4>
        <p className="text-gray-400 text-sm mb-3">
          Optional: Set a custom name to appear in the community (instead of your username)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.publicDisplayName || ''}
            onChange={(e) =>
              setSettings((s) => ({ ...s, publicDisplayName: e.target.value }))
            }
            placeholder="Enter display name..."
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            maxLength={50}
          />
          <button
            onClick={updateDisplayName}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-white font-medium flex items-center gap-2 mb-2">
          <span>🔒</span> Privacy First
        </h4>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>• We never store or share your exact GPS coordinates</li>
          <li>• Location data is coarse (city-level only)</li>
          <li>• You can disable all sharing at any time</li>
          <li>• Activity older than 90 days is automatically deleted</li>
        </ul>
      </div>
    </div>
  );
}
