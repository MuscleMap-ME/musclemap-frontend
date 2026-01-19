/**
 * Dashboard Settings Tab
 *
 * Controls dashboard widget customization:
 * - Widget visibility toggles
 * - Preview of widgets
 * - Reset to defaults
 */

import React from 'react';
import { LayoutGrid, Eye, EyeOff, RotateCcw, Info } from 'lucide-react';
import { useDashboardStore, useDashboardLayout, useWidgetManager } from '../../../store/dashboardStore';

// ============================================
// WIDGET ICONS
// ============================================

const WIDGET_ICONS: Record<string, string> = {
  current_path: '🎯',
  stats: '📊',
  quick_actions: '⚡',
  xp_progress: '⭐',
  daily_quests: '📋',
  insights: '💡',
  daily_challenges: '🏆',
  todays_workout: '💪',
  weekly_progress: '📈',
  nutrition: '🥗',
  muscle_map: '🦴',
  daily_tip: '💬',
  milestones: '🎖️',
  adventure_map: '🗺️',
  activity: '📰',
  hydration: '💧',
  music_player: '🎵',
  coach_tips: '🎓',
};

const WIDGET_DESCRIPTIONS: Record<string, string> = {
  current_path: 'Your active fitness journey path',
  stats: 'Key metrics at a glance',
  quick_actions: 'Start workout, log food, etc.',
  xp_progress: 'Experience and level progress',
  daily_quests: 'Daily objectives to complete',
  insights: 'AI-powered recommendations',
  daily_challenges: 'Community challenges',
  todays_workout: 'Scheduled workout preview',
  weekly_progress: 'Week-over-week comparison',
  nutrition: 'Calorie and macro tracking',
  muscle_map: '3D muscle visualization',
  daily_tip: 'Tip of the day from Max',
  milestones: 'Upcoming achievements',
  adventure_map: 'RPG-style progress map',
  activity: 'Recent activity feed',
  hydration: 'Water intake tracker',
  music_player: 'Music playback controls',
  coach_tips: 'Coaching suggestions',
};

// ============================================
// COMPONENTS
// ============================================

function WidgetToggle({
  widget,
  onToggle,
}: {
  widget: { id: string; type: string; visible: boolean };
  onToggle: () => void;
}) {
  const icon = WIDGET_ICONS[widget.type] || '📦';
  const description = WIDGET_DESCRIPTIONS[widget.type] || 'Dashboard widget';
  const name = widget.type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <button
      onClick={onToggle}
      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
        widget.visible
          ? 'border-purple-500/50 bg-purple-900/20'
          : 'border-transparent bg-gray-700/50 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-xs text-gray-400">{description}</div>
          </div>
        </div>
        {widget.visible ? (
          <Eye className="w-5 h-5 text-green-400" />
        ) : (
          <EyeOff className="w-5 h-5 text-gray-500" />
        )}
      </div>
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DashboardTab() {
  const { widgets, isEditMode, toggleEditMode, reset } = useDashboardLayout();
  const { toggleVisibility } = useWidgetManager();
  const isSaving = useDashboardStore((s) => s.isSaving);

  // Group widgets by category
  const coreWidgets = widgets.filter((w) =>
    ['current_path', 'stats', 'quick_actions', 'todays_workout'].includes(w.type)
  );
  const progressWidgets = widgets.filter((w) =>
    ['xp_progress', 'weekly_progress', 'milestones', 'daily_quests'].includes(w.type)
  );
  const featuredWidgets = widgets.filter((w) =>
    ['muscle_map', 'adventure_map', 'insights', 'daily_challenges'].includes(w.type)
  );
  const healthWidgets = widgets.filter((w) =>
    ['nutrition', 'hydration', 'daily_tip', 'coach_tips'].includes(w.type)
  );
  const mediaWidgets = widgets.filter((w) =>
    ['music_player', 'activity'].includes(w.type)
  );

  const visibleCount = widgets.filter((w) => w.visible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="font-bold">Dashboard Widgets</h2>
              <p className="text-sm text-gray-400">
                {visibleCount} of {widgets.length} widgets visible
              </p>
            </div>
          </div>
          {isSaving && <span className="text-xs text-purple-400">Saving...</span>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleEditMode}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              isEditMode
                ? 'bg-green-600 hover:bg-green-500'
                : 'bg-purple-600 hover:bg-purple-500'
            }`}
          >
            {isEditMode ? '✓ Done Editing' : '✏️ Edit Layout'}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Edit mode tip */}
      {isEditMode && (
        <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-xl flex gap-2">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-200">
            Go to your Dashboard to drag and resize widgets. Changes are saved automatically.
          </p>
        </div>
      )}

      {/* Core Widgets */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">⭐ Core Widgets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {coreWidgets.map((widget) => (
            <WidgetToggle
              key={widget.id}
              widget={widget}
              onToggle={() => toggleVisibility(widget.id)}
            />
          ))}
        </div>
      </section>

      {/* Progress Widgets */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">📈 Progress Tracking</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {progressWidgets.map((widget) => (
            <WidgetToggle
              key={widget.id}
              widget={widget}
              onToggle={() => toggleVisibility(widget.id)}
            />
          ))}
        </div>
      </section>

      {/* Featured Widgets */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">✨ Featured</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {featuredWidgets.map((widget) => (
            <WidgetToggle
              key={widget.id}
              widget={widget}
              onToggle={() => toggleVisibility(widget.id)}
            />
          ))}
        </div>
      </section>

      {/* Health & Coaching */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">🏥 Health & Coaching</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {healthWidgets.map((widget) => (
            <WidgetToggle
              key={widget.id}
              widget={widget}
              onToggle={() => toggleVisibility(widget.id)}
            />
          ))}
        </div>
      </section>

      {/* Media & Social */}
      <section className="bg-gray-800 rounded-2xl p-4">
        <h3 className="font-bold mb-4">🎵 Media & Social</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {mediaWidgets.map((widget) => (
            <WidgetToggle
              key={widget.id}
              widget={widget}
              onToggle={() => toggleVisibility(widget.id)}
            />
          ))}
        </div>
      </section>

      {/* Summary */}
      <section className="bg-gray-800/50 rounded-2xl p-4">
        <h3 className="font-bold mb-3">Widget Summary</h3>
        <div className="flex flex-wrap gap-2">
          {widgets
            .filter((w) => w.visible)
            .map((widget) => (
              <span
                key={widget.id}
                className="text-sm bg-purple-900/30 border border-purple-500/30 px-2 py-1 rounded-lg"
              >
                {WIDGET_ICONS[widget.type] || '📦'}{' '}
                {widget.type
                  .split('_')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </span>
            ))}
        </div>
        {widgets.filter((w) => !w.visible).length > 0 && (
          <div className="mt-3 text-sm text-gray-500">
            + {widgets.filter((w) => !w.visible).length} hidden widgets
          </div>
        )}
      </section>
    </div>
  );
}
