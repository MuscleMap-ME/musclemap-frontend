/**
 * WorkoutTemplatesSheet Component
 *
 * Bottom sheet for selecting and starting from workout templates.
 * Shows built-in templates and user's custom templates.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Dumbbell,
  Clock,
  Flame,
  ChevronRight,
  Star,
  Filter,
  Plus,
  Trash2,
} from 'lucide-react';
import { haptic } from '@/utils/haptics';
import {
  type WorkoutTemplate,
  type TemplateCategory,
  getAllTemplates,
  searchTemplates,
  getTemplatesByCategory,
  deleteCustomTemplate,
  incrementTemplateUsage,
  createWorkoutFromTemplate,
} from '@/utils/workoutTemplates';

interface WorkoutTemplatesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (workout: ReturnType<typeof createWorkoutFromTemplate>) => void;
}

const CATEGORY_OPTIONS: { id: TemplateCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🏋️' },
  { id: 'push', label: 'Push', icon: '💪' },
  { id: 'pull', label: 'Pull', icon: '🔙' },
  { id: 'legs', label: 'Legs', icon: '🦵' },
  { id: 'upper', label: 'Upper', icon: '⬆️' },
  { id: 'lower', label: 'Lower', icon: '⬇️' },
  { id: 'full-body', label: 'Full Body', icon: '🫀' },
  { id: 'strength', label: 'Strength', icon: '🎯' },
  { id: 'hiit', label: 'HIIT', icon: '🔥' },
  { id: 'custom', label: 'My Templates', icon: '⭐' },
];

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-red-500/20 text-red-400',
};

export function WorkoutTemplatesSheet({
  isOpen,
  onClose,
  onSelectTemplate,
}: WorkoutTemplatesSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Get filtered templates
  const templates = useMemo(() => {
    let results: WorkoutTemplate[];

    if (searchQuery.trim()) {
      results = searchTemplates(searchQuery);
    } else if (selectedCategory === 'all') {
      results = getAllTemplates();
    } else {
      results = getTemplatesByCategory(selectedCategory);
    }

    // Sort: custom first, then by usage count
    return results.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) {
        return a.isBuiltIn ? 1 : -1;
      }
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    haptic('medium');
    incrementTemplateUsage(template.id);
    const workout = createWorkoutFromTemplate(template);
    onSelectTemplate(workout);
    onClose();
  };

  const handleDeleteTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this custom template?')) {
      haptic('warning');
      deleteCustomTemplate(templateId);
      // Force re-render
      setSearchQuery((q) => q);
    }
  };

  const toggleExpand = (templateId: string) => {
    haptic('light');
    setExpandedTemplateId((current) => (current === templateId ? null : templateId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-gray-900 rounded-t-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Workout Templates</h2>
              <p className="text-xs text-gray-400">{templates.length} templates available</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 rounded-xl border border-gray-700
                       focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none
                       text-sm placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-3 border-b border-gray-800 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  haptic('light');
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-all whitespace-nowrap
                  ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No templates found</p>
              <p className="text-sm text-gray-500 mt-1">Try a different search or category</p>
            </div>
          ) : (
            templates.map((template) => {
              const isExpanded = expandedTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  className={`
                    bg-gray-800/50 rounded-2xl border transition-all
                    ${isExpanded ? 'border-purple-500/50' : 'border-gray-700/50'}
                  `}
                >
                  {/* Template Header */}
                  <button
                    onClick={() => toggleExpand(template.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    {/* Icon */}
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                        ${template.isBuiltIn ? 'bg-gradient-to-br from-blue-600 to-cyan-500' : 'bg-gradient-to-br from-purple-600 to-pink-500'}
                      `}
                    >
                      {template.isBuiltIn ? (
                        <Dumbbell className="w-6 h-6" />
                      ) : (
                        <Star className="w-6 h-6" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{template.name}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[template.difficulty]}`}
                        >
                          {template.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-1">{template.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5" />
                          {template.exercises.length} exercises
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {template.estimatedMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          {template.targetMuscles.slice(0, 2).join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-700/50 pt-3 space-y-3">
                      {/* Exercise List */}
                      <div className="space-y-2">
                        {template.exercises.map((exercise, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-gray-300">{exercise.exerciseName}</span>
                            <span className="text-gray-500">
                              {exercise.sets.length} × {exercise.sets[0]?.reps || exercise.sets[0]?.duration + 's'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-gray-700/50 rounded-full text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSelectTemplate(template)}
                          className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-500
                                   rounded-xl font-medium text-sm flex items-center justify-center gap-2
                                   hover:from-purple-500 hover:to-pink-400 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Start Workout
                        </button>
                        {!template.isBuiltIn && (
                          <button
                            onClick={(e) => handleDeleteTemplate(e, template.id)}
                            className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Safe Area */}
        <div className="h-6 bg-gray-900" />
      </div>
    </div>
  );
}

export default WorkoutTemplatesSheet;
