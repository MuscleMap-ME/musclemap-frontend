import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { RestTimerSettings } from '../components/workout/RestTimerSettings';
import { EquipmentSelector, UnitToggle } from '../components/settings';
import JourneyManagement from '../components/settings/JourneyManagement';
import { useUnitsPreferences } from '../store/preferencesStore';
import { useAuth } from '../store';
import {
  MY_SETTINGS_QUERY,
  MESSAGING_PRIVACY_QUERY,
  MY_PROFILE_LEVEL_QUERY,
} from '../graphql/queries';
import {
  UPDATE_SETTINGS_MUTATION,
  UPDATE_MESSAGING_PRIVACY_MUTATION,
} from '../graphql/mutations';

// Types
interface UserSettings {
  theme: string;
  reducedMotion: boolean;
  highContrast: boolean;
  textSize: string;
  isPublic: boolean;
  showLocation: boolean;
  showProgress: boolean;
  equipment: string[] | null;
}

interface MessagingPrivacy {
  messagingEnabled: boolean;
}

interface ProfileLevel {
  id: string;
  level: number;
}

interface MySettingsData {
  mySettings: UserSettings | null;
}

interface MessagingPrivacyData {
  messagingPrivacy: MessagingPrivacy | null;
}

interface MyProfileLevelData {
  me: ProfileLevel | null;
}

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
  const { isAuthenticated } = useAuth();

  // Unit preferences from the store (persisted)
  const {
    weight: weightUnit,
    height: heightUnit,
    distance: distanceUnit,
    setWeightUnit,
    setHeightUnit,
    setDistanceUnit,
    setMetric,
    setImperial,
    isMetric,
    isImperial,
  } = useUnitsPreferences();

  // GraphQL queries
  const { data: settingsData, loading: settingsLoading } = useQuery<MySettingsData>(
    MY_SETTINGS_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: messagingData } = useQuery<MessagingPrivacyData>(
    MESSAGING_PRIVACY_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: profileData } = useQuery<MyProfileLevelData>(
    MY_PROFILE_LEVEL_QUERY,
    {
      skip: !isAuthenticated,
      fetchPolicy: 'cache-and-network',
    }
  );

  // GraphQL mutations
  const [updateSettings, { loading: saving }] = useMutation(UPDATE_SETTINGS_MUTATION, {
    refetchQueries: [{ query: MY_SETTINGS_QUERY }],
  });

  const [updateMessagingPrivacy] = useMutation(UPDATE_MESSAGING_PRIVACY_MUTATION, {
    refetchQueries: [{ query: MESSAGING_PRIVACY_QUERY }],
  });

  // Memoized data extraction
  const settings = useMemo(() => {
    const s = settingsData?.mySettings;
    return {
      theme: s?.theme || 'dark',
      reduced_motion: s?.reducedMotion ? 1 : 0,
      high_contrast: s?.highContrast ? 1 : 0,
      text_size: s?.textSize || 'normal',
      is_public: s?.isPublic ? 1 : 0,
      show_location: s?.showLocation ? 1 : 0,
      show_progress: s?.showProgress ? 1 : 0,
      equipment: s?.equipment || [],
    };
  }, [settingsData]);

  const messagingEnabled = useMemo(() => {
    return messagingData?.messagingPrivacy?.messagingEnabled ?? true;
  }, [messagingData]);

  const userLevel = useMemo(() => {
    return profileData?.me?.level || 1;
  }, [profileData]);

  const toggleMessaging = async () => {
    const newValue = !messagingEnabled;
    try {
      await updateMessagingPrivacy({
        variables: { enabled: newValue },
        optimisticResponse: {
          updateMessagingPrivacy: {
            __typename: 'MessagingPrivacy',
            messagingEnabled: newValue,
          },
        },
      });
    } catch {
      // Error handled by Apollo
    }
  };

  const save = async (updates: Partial<{
    theme: string;
    reduced_motion: number;
    high_contrast: number;
    text_size: string;
    is_public: number;
    show_location: number;
    show_progress: number;
    equipment: string[];
  }>) => {
    // Convert snake_case to camelCase for GraphQL
    const input: Record<string, any> = {};
    if (updates.theme !== undefined) input.theme = updates.theme;
    if (updates.reduced_motion !== undefined) input.reducedMotion = Boolean(updates.reduced_motion);
    if (updates.high_contrast !== undefined) input.highContrast = Boolean(updates.high_contrast);
    if (updates.text_size !== undefined) input.textSize = updates.text_size;
    if (updates.is_public !== undefined) input.isPublic = Boolean(updates.is_public);
    if (updates.show_location !== undefined) input.showLocation = Boolean(updates.show_location);
    if (updates.show_progress !== undefined) input.showProgress = Boolean(updates.show_progress);
    if (updates.equipment !== undefined) input.equipment = updates.equipment;

    try {
      await updateSettings({ variables: { input } });
      if (updates.theme) localStorage.setItem('musclemap_theme', updates.theme);
    } catch {
      // Error handled by Apollo
    }
  };

  const Toggle = ({ value, onChange }: { value: number | boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={'w-14 h-8 rounded-full transition-all duration-200 ' + (value ? 'bg-purple-600' : 'bg-gray-600')}
    >
      <div className={'w-6 h-6 bg-white rounded-full transition-transform duration-200 mx-1 ' + (value ? 'translate-x-6' : '')} />
    </button>
  );

  if (settingsLoading && !settingsData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

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

        {/* Workout Settings */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">Rest Timer</h2>
          <RestTimerSettings compact className="bg-transparent border-0 p-0" />
        </section>

        {/* Units */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">📏 Units</h2>

          {/* Quick presets */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMetric()}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                isMetric
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="font-medium">Metric</div>
              <div className="text-xs text-gray-400">kg, cm, km</div>
            </button>
            <button
              onClick={() => setImperial()}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                isImperial
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="font-medium">Imperial</div>
              <div className="text-xs text-gray-400">lbs, in, mi</div>
            </button>
          </div>

          <div className="text-xs text-gray-500 mb-4">Or customize individual units:</div>

          <div className="space-y-4">
            <UnitToggle
              label="Weight"
              value={weightUnit}
              options={[
                { value: 'lbs', label: 'Pounds (lbs)' },
                { value: 'kg', label: 'Kilograms (kg)' },
              ]}
              onChange={(value) => setWeightUnit(value as 'lbs' | 'kg')}
            />
            <UnitToggle
              label="Height & Circumferences"
              value={heightUnit}
              options={[
                { value: 'cm', label: 'Centimeters (cm)' },
                { value: 'ft_in', label: 'Feet & Inches' },
              ]}
              onChange={(value) => setHeightUnit(value as 'cm' | 'ft_in')}
            />
            <UnitToggle
              label="Distance"
              value={distanceUnit}
              options={[
                { value: 'km', label: 'Kilometers (km)' },
                { value: 'mi', label: 'Miles (mi)' },
              ]}
              onChange={(value) => setDistanceUnit(value as 'km' | 'mi')}
            />
          </div>
        </section>

        {/* Equipment */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">Available Equipment</h2>
          <p className="text-sm text-gray-400 mb-4">Select equipment you have access to for personalized workout recommendations</p>
          <EquipmentSelector
            selected={settings.equipment || []}
            onChange={(equipment) => save({ equipment })}
            equipment={[
              { id: 'barbell', name: 'Barbell', icon: '🏋️' },
              { id: 'dumbbells', name: 'Dumbbells', icon: '💪' },
              { id: 'cables', name: 'Cables', icon: '🔗' },
              { id: 'bench', name: 'Bench', icon: '🪑' },
              { id: 'kettlebell', name: 'Kettlebell', icon: '⚡' },
              { id: 'resistance', name: 'Resistance Bands', icon: '🎯' },
              { id: 'pullup_bar', name: 'Pull-up Bar', icon: '📏' },
              { id: 'machines', name: 'Machines', icon: '🔧' },
            ]}
          />
        </section>

        {/* Journey Management */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">Journey & Progress</h2>
          <p className="text-sm text-gray-400 mb-4">
            Manage your fitness journey, create snapshots, or start fresh
          </p>
          <JourneyManagement />
        </section>

        {/* Privacy */}
        <section className="bg-gray-800 rounded-2xl p-4">
          <h2 className="font-bold mb-4">Privacy</h2>
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

            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Allow Messages</div>
                <div className="text-sm text-gray-400">Let others send you direct messages</div>
              </div>
              <Toggle value={messagingEnabled} onChange={toggleMessaging} />
            </div>

            <Link
              to="/messages"
              className="block p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors mt-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <span className="text-sm">Manage Blocked Users</span>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
