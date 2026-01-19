/**
 * Notifications Settings Tab
 *
 * Controls all notification preferences including:
 * - Achievement notifications
 * - Goal success alerts
 * - Workout reminders
 * - Social notifications
 * - Quiet hours
 */

import React from 'react';
import { Bell, Trophy, Calendar, Users, Moon, Clock } from 'lucide-react';
import { useNotificationSettings } from '../../../store/preferencesStore';

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

function TimeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    />
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationsTab() {
  const { settings, updateSettings } = useNotificationSettings();

  const handleToggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      updateSettings({ [key]: !settings[key] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="font-bold">Notification Settings</h2>
              <p className="text-sm text-gray-400">Control what alerts you receive</p>
            </div>
          </div>
        </div>
      </section>

      {/* Achievement Notifications */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Achievements & Progress
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Achievement Unlocks</div>
              <div className="text-sm text-gray-400">Get notified when you earn achievements</div>
            </div>
            <Toggle
              value={settings.achievementsEnabled}
              onChange={() => handleToggle('achievementsEnabled')}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Goal Success</div>
              <div className="text-sm text-gray-400">Celebrate when you reach your goals</div>
            </div>
            <Toggle
              value={settings.goalSuccessEnabled}
              onChange={() => handleToggle('goalSuccessEnabled')}
            />
          </div>
        </div>

        {!settings.achievementsEnabled && !settings.goalSuccessEnabled && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-xl">
            <p className="text-sm text-yellow-200">
              You won&apos;t receive any achievement or goal notifications. This is fine if you prefer a minimal
              experience!
            </p>
          </div>
        )}
      </section>

      {/* Workout Reminders */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Workout Reminders
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Workout Reminders</div>
              <div className="text-sm text-gray-400">Daily reminders to hit the gym</div>
            </div>
            <Toggle
              value={settings.workoutReminders}
              onChange={() => handleToggle('workoutReminders')}
            />
          </div>
        </div>
      </section>

      {/* Social Notifications */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          Social
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Social Notifications</div>
              <div className="text-sm text-gray-400">High fives, mentions, crew activity</div>
            </div>
            <Toggle
              value={settings.socialNotifications}
              onChange={() => handleToggle('socialNotifications')}
            />
          </div>
        </div>

        {!settings.socialNotifications && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-xl">
            <p className="text-sm text-blue-200">
              You won&apos;t see social updates. You can still interact with the community, just without push
              notifications.
            </p>
          </div>
        )}
      </section>

      {/* Quiet Hours */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          Quiet Hours
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div>
              <div className="font-medium">Enable Quiet Hours</div>
              <div className="text-sm text-gray-400">Pause notifications during specified times</div>
            </div>
            <Toggle
              value={settings.quietHoursEnabled}
              onChange={() => handleToggle('quietHoursEnabled')}
            />
          </div>

          {settings.quietHoursEnabled && (
            <div className="p-4 bg-gray-700/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Start Time</span>
                </div>
                <TimeSelect
                  value={settings.quietHoursStart}
                  onChange={(time) => updateSettings({ quietHoursStart: time })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>End Time</span>
                </div>
                <TimeSelect
                  value={settings.quietHoursEnd}
                  onChange={(time) => updateSettings({ quietHoursEnd: time })}
                />
              </div>

              <div className="text-sm text-gray-400 text-center">
                Notifications will be silenced from {settings.quietHoursStart} to {settings.quietHoursEnd}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Summary */}
      <section className="bg-gray-800/50 rounded-2xl p-4">
        <h3 className="font-bold mb-3">Quick Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={settings.achievementsEnabled ? 'text-green-400' : 'text-gray-500'}>
              {settings.achievementsEnabled ? '✓' : '✗'}
            </span>
            <span>Achievement alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.goalSuccessEnabled ? 'text-green-400' : 'text-gray-500'}>
              {settings.goalSuccessEnabled ? '✓' : '✗'}
            </span>
            <span>Goal celebrations</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.workoutReminders ? 'text-green-400' : 'text-gray-500'}>
              {settings.workoutReminders ? '✓' : '✗'}
            </span>
            <span>Workout reminders</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={settings.socialNotifications ? 'text-green-400' : 'text-gray-500'}>
              {settings.socialNotifications ? '✓' : '✗'}
            </span>
            <span>Social updates</span>
          </div>
        </div>
        {settings.quietHoursEnabled && (
          <div className="mt-3 pt-3 border-t border-gray-700 text-sm">
            <span className="text-indigo-400">Quiet hours active:</span> {settings.quietHoursStart} -{' '}
            {settings.quietHoursEnd}
          </div>
        )}
      </section>
    </div>
  );
}
