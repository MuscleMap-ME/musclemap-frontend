/**
 * Settings Page - Tabbed Interface
 *
 * Comprehensive settings organized by category:
 * - General: Theme, accessibility, units
 * - Coaching: Max/mascot visibility, guidance level
 * - Notifications: All notification controls
 * - Sounds: Sound effects, metronome settings
 * - Workout: Rest timer, reminders
 * - Hydration: Water break reminders
 * - Dashboard: Widget customization
 * - Music: Streaming integration
 * - Privacy: Privacy settings
 * - Profiles: Configuration profiles
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Settings,
  User,
  Bell,
  Volume2,
  Dumbbell,
  Droplets,
  LayoutGrid,
  Music,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { usePreferencesStore } from '../../store/preferencesStore';

// Lazy load tabs
const GeneralTab = lazy(() => import('./tabs/GeneralTab'));
const CoachingTab = lazy(() => import('./tabs/CoachingTab'));
const NotificationsTab = lazy(() => import('./tabs/NotificationsTab'));
const SoundsTab = lazy(() => import('./tabs/SoundsTab'));
const WorkoutTab = lazy(() => import('./tabs/WorkoutTab'));
const HydrationTab = lazy(() => import('./tabs/HydrationTab'));
const DashboardTab = lazy(() => import('./tabs/DashboardTab'));
const MusicTab = lazy(() => import('./tabs/MusicTab'));
const PrivacyTab = lazy(() => import('./tabs/PrivacyTab'));
const ProfilesTab = lazy(() => import('./tabs/ProfilesTab'));

// Tab configuration
const TABS = [
  { id: 'general', label: 'General', icon: Settings, description: 'Theme, accessibility, units' },
  { id: 'coaching', label: 'Coaching', icon: User, description: 'Max & mascot visibility' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
  { id: 'sounds', label: 'Sounds', icon: Volume2, description: 'Sound effects & metronome' },
  { id: 'workout', label: 'Workout', icon: Dumbbell, description: 'Rest timer & reminders' },
  { id: 'hydration', label: 'Hydration', icon: Droplets, description: 'Water break reminders' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, description: 'Widget customization' },
  { id: 'music', label: 'Music', icon: Music, description: 'Streaming integration' },
  { id: 'privacy', label: 'Privacy', icon: Shield, description: 'Privacy controls' },
  { id: 'profiles', label: 'Profiles', icon: Layers, description: 'Configuration profiles' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// Loading skeleton
function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-700 rounded w-1/3"></div>
      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      <div className="space-y-3 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-700 rounded-xl"></div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get('tab');
    return TABS.find((t) => t.id === tab)?.id || 'general';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const loadPreferences = usePreferencesStore((s) => s.loadPreferences);
  const isSaving = usePreferencesStore((s) => s.isSaving);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    if (isMobile) setShowMobileNav(false);
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />;
      case 'coaching':
        return <CoachingTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'sounds':
        return <SoundsTab />;
      case 'workout':
        return <WorkoutTab />;
      case 'hydration':
        return <HydrationTab />;
      case 'dashboard':
        return <DashboardTab />;
      case 'music':
        return <MusicTab />;
      case 'privacy':
        return <PrivacyTab />;
      case 'profiles':
        return <ProfilesTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-lg sticky top-0 z-20 border-b border-gray-700/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>←</span>
            <img src="/logo.png" alt="MuscleMap" className="w-6 h-6 rounded-md" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h1>
          <div className="w-16 text-right">
            {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
          </div>
        </div>

        {/* Mobile tab selector */}
        {isMobile && (
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-800/50 border-t border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              {React.createElement(TABS.find((t) => t.id === activeTab)?.icon || Settings, {
                className: 'w-5 h-5 text-purple-400',
              })}
              <span className="font-medium">{TABS.find((t) => t.id === activeTab)?.label}</span>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${showMobileNav ? 'rotate-90' : ''}`}
            />
          </button>
        )}
      </header>

      {/* Mobile navigation dropdown */}
      {isMobile && showMobileNav && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setShowMobileNav(false)}>
          <div
            className="bg-gray-800 border-b border-gray-700 shadow-xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 border-b border-gray-700/50 transition-colors ${
                  activeTab === tab.id ? 'bg-purple-900/30' : 'hover:bg-gray-700/50'
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${activeTab === tab.id ? 'text-purple-400' : 'text-gray-400'}`}
                />
                <div className="text-left">
                  <div className={`font-medium ${activeTab === tab.id ? 'text-purple-400' : ''}`}>
                    {tab.label}
                  </div>
                  <div className="text-xs text-gray-500">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-64 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto border-r border-gray-700/50 bg-gray-800/30">
            <nav className="py-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-900/30 border-r-2 border-purple-500'
                      : 'hover:bg-gray-700/30'
                  }`}
                >
                  <tab.icon
                    className={`w-5 h-5 ${activeTab === tab.id ? 'text-purple-400' : 'text-gray-400'}`}
                  />
                  <div className="text-left">
                    <div
                      className={`font-medium text-sm ${activeTab === tab.id ? 'text-purple-400' : 'text-gray-200'}`}
                    >
                      {tab.label}
                    </div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Content area */}
        <main className="flex-1 p-4 md:p-6 pb-24">
          <Suspense fallback={<TabSkeleton />}>{renderTabContent()}</Suspense>
        </main>
      </div>
    </div>
  );
}
