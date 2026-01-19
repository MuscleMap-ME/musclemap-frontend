/**
 * Coaching Settings Tab
 *
 * Controls Max (strength coach) and mascot visibility,
 * guidance level, and coaching-related features.
 */

import React from 'react';
import { User, MessageSquare, Lightbulb, Target, Info } from 'lucide-react';
import { usePreferencesStore, useCoachingSettings, useGuidanceLevel } from '../../../store/preferencesStore';

// ============================================
// GUIDANCE LEVELS
// ============================================

const GUIDANCE_LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Maximum guidance with detailed explanations',
    features: ['Form tutorials', 'Workout walkthroughs', 'Frequent tips', 'Video demonstrations'],
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Balanced guidance for experienced users',
    features: ['Occasional tips', 'Progress insights', 'Form reminders when needed'],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Minimal guidance, focus on data',
    features: ['Stats only', 'PRs and records', 'Rare suggestions'],
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'No hand-holding, maximum control',
    features: ['Data-driven', 'No tutorials', 'Full control'],
  },
];

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

export default function CoachingTab() {
  const {
    maxCoachVisible,
    mascotVisible,
    coachTipsEnabled,
    motivationalQuotes,
    formCuesEnabled,
    toggleMaxCoach,
    toggleMascot,
    toggleCoachTips,
    toggleMotivationalQuotes,
    toggleFormCues,
  } = useCoachingSettings();

  const { level: guidanceLevel, setLevel: setGuidanceLevel } = useGuidanceLevel();
  const isSaving = usePreferencesStore((s) => s.isSaving);

  return (
    <div className="space-y-6">
      {/* Max Coach Visibility */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
            💪
          </div>
          <div className="flex-1">
            <h2 className="font-bold flex items-center gap-2">
              Max - Your Strength Coach
              {isSaving && <span className="text-xs text-purple-400">Saving...</span>}
            </h2>
            <p className="text-sm text-gray-400">
              Max provides workout guidance, form tips, and motivational support
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-medium">Show Max</div>
                <div className="text-sm text-gray-400">Display coach avatar and dialog</div>
              </div>
            </div>
            <Toggle value={maxCoachVisible} onChange={toggleMaxCoach} />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-400" />
              <div>
                <div className="font-medium">Coach Tips</div>
                <div className="text-sm text-gray-400">Receive workout suggestions</div>
              </div>
            </div>
            <Toggle value={coachTipsEnabled} onChange={toggleCoachTips} disabled={!maxCoachVisible} />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="font-medium">Motivational Quotes</div>
                <div className="text-sm text-gray-400">Daily inspiration from Max</div>
              </div>
            </div>
            <Toggle
              value={motivationalQuotes}
              onChange={toggleMotivationalQuotes}
              disabled={!maxCoachVisible}
            />
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-red-400" />
              <div>
                <div className="font-medium">Form Cues</div>
                <div className="text-sm text-gray-400">Real-time form reminders</div>
              </div>
            </div>
            <Toggle value={formCuesEnabled} onChange={toggleFormCues} disabled={!maxCoachVisible} />
          </div>
        </div>
      </section>

      {/* Mascot Visibility */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-2xl">
            🦁
          </div>
          <div className="flex-1">
            <h2 className="font-bold">Mascot Character</h2>
            <p className="text-sm text-gray-400">
              Your companion character that celebrates achievements and milestones
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-xl">
          <div>
            <div className="font-medium">Show Mascot</div>
            <div className="text-sm text-gray-400">Display mascot animations and celebrations</div>
          </div>
          <Toggle value={mascotVisible} onChange={toggleMascot} />
        </div>

        {!mascotVisible && (
          <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-xl flex gap-2">
            <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              With mascot hidden, achievement celebrations will be more subtle
            </p>
          </div>
        )}
      </section>

      {/* Guidance Level */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h2 className="font-bold mb-2">📊 Guidance Level</h2>
        <p className="text-sm text-gray-400 mb-4">
          Choose how much hand-holding you want from MuscleMap
        </p>

        <div className="space-y-3">
          {GUIDANCE_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setGuidanceLevel(level.id as typeof guidanceLevel)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                guidanceLevel === level.id
                  ? 'border-purple-500 bg-purple-900/20'
                  : 'border-transparent bg-gray-700/50 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{level.name}</span>
                {guidanceLevel === level.id && (
                  <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">Active</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-2">{level.description}</p>
              <div className="flex flex-wrap gap-2">
                {level.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs bg-gray-600/50 px-2 py-1 rounded-full text-gray-300"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Summary */}
      <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-4">
        <h3 className="font-bold mb-3">Current Coaching Setup</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className={maxCoachVisible ? 'text-green-400' : 'text-gray-500'}>
              {maxCoachVisible ? '✓' : '✗'}
            </span>
            <span className={maxCoachVisible ? '' : 'text-gray-500'}>Max Coach</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={mascotVisible ? 'text-green-400' : 'text-gray-500'}>
              {mascotVisible ? '✓' : '✗'}
            </span>
            <span className={mascotVisible ? '' : 'text-gray-500'}>Mascot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={coachTipsEnabled ? 'text-green-400' : 'text-gray-500'}>
              {coachTipsEnabled ? '✓' : '✗'}
            </span>
            <span className={coachTipsEnabled ? '' : 'text-gray-500'}>Coach Tips</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={formCuesEnabled ? 'text-green-400' : 'text-gray-500'}>
              {formCuesEnabled ? '✓' : '✗'}
            </span>
            <span className={formCuesEnabled ? '' : 'text-gray-500'}>Form Cues</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-purple-500/30">
          <span className="text-gray-400">Guidance Level:</span>{' '}
          <span className="font-bold capitalize">{guidanceLevel}</span>
        </div>
      </section>
    </div>
  );
}
