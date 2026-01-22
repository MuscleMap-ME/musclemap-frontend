/**
 * Workout Notes
 *
 * Session-level notes for workouts.
 * Allows users to add notes about their workout session.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Smile,
  Frown,
  Meh,
  Zap,
  BatteryLow,
  BatteryMedium,
  Moon,
  Edit2,
  Trash2,
  Plus,
  Tag,
} from 'lucide-react';

// Types
interface WorkoutNote {
  id: string;
  content: string;
  mood?: 'great' | 'good' | 'okay' | 'bad';
  energy?: 'high' | 'medium' | 'low';
  sleepQuality?: 'good' | 'average' | 'poor';
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

interface WorkoutNotesProps {
  workoutId: string;
  initialNotes?: WorkoutNote;
  onSave?: (notes: WorkoutNote) => void;
  onDelete?: () => void;
  compact?: boolean;
  autoSave?: boolean;
  className?: string;
}

// Mood options
const MOODS: { value: WorkoutNote['mood']; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'great', label: 'Great', icon: Smile, color: 'text-green-400' },
  { value: 'good', label: 'Good', icon: Smile, color: 'text-blue-400' },
  { value: 'okay', label: 'Okay', icon: Meh, color: 'text-yellow-400' },
  { value: 'bad', label: 'Bad', icon: Frown, color: 'text-red-400' },
];

// Energy options
const ENERGY_LEVELS: { value: WorkoutNote['energy']; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'high', label: 'High Energy', icon: Zap, color: 'text-yellow-400' },
  { value: 'medium', label: 'Normal', icon: BatteryMedium, color: 'text-blue-400' },
  { value: 'low', label: 'Low Energy', icon: BatteryLow, color: 'text-red-400' },
];

// Sleep quality options
const SLEEP_QUALITY: { value: WorkoutNote['sleepQuality']; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'good', label: 'Good Sleep', icon: Moon, color: 'text-violet-400' },
  { value: 'average', label: 'Average', icon: Moon, color: 'text-blue-400' },
  { value: 'poor', label: 'Poor Sleep', icon: Moon, color: 'text-orange-400' },
];

// Common workout tags
const COMMON_TAGS = [
  'PR Day',
  'Deload',
  'Testing',
  'Recovery',
  'First Day Back',
  'Travel',
  'Morning',
  'Evening',
  'Fasted',
  'Post-Meal',
  'Pre-Workout',
  'No Caffeine',
  'New Exercise',
  'Form Focus',
  'High Volume',
  'Low Volume',
];

export function WorkoutNotes({
  workoutId: _workoutId,
  initialNotes,
  onSave,
  onDelete,
  compact = false,
  autoSave = true,
  className = '',
}: WorkoutNotesProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isEditing, setIsEditing] = useState(!initialNotes);
  const [content, setContent] = useState(initialNotes?.content || '');
  const [mood, setMood] = useState<WorkoutNote['mood']>(initialNotes?.mood);
  const [energy, setEnergy] = useState<WorkoutNote['energy']>(initialNotes?.energy);
  const [sleepQuality, setSleepQuality] = useState<WorkoutNote['sleepQuality']>(initialNotes?.sleepQuality);
  const [tags, setTags] = useState<string[]>(initialNotes?.tags || []);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Track changes
  useEffect(() => {
    const hasChanged =
      content !== (initialNotes?.content || '') ||
      mood !== initialNotes?.mood ||
      energy !== initialNotes?.energy ||
      sleepQuality !== initialNotes?.sleepQuality ||
      JSON.stringify(tags) !== JSON.stringify(initialNotes?.tags || []);

    setHasChanges(hasChanged);
  }, [content, mood, energy, sleepQuality, tags, initialNotes]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  const handleSave = useCallback(() => {
    const notes: WorkoutNote = {
      id: initialNotes?.id || `note-${Date.now()}`,
      content,
      mood,
      energy,
      sleepQuality,
      tags,
      createdAt: initialNotes?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave?.(notes);
    setHasChanges(false);
    if (!compact) {
      setIsEditing(false);
    }
  }, [content, mood, energy, sleepQuality, tags, initialNotes, onSave, compact]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSave, hasChanges, handleSave]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Delete this note?')) {
      onDelete?.();
      setContent('');
      setMood(undefined);
      setEnergy(undefined);
      setSleepQuality(undefined);
      setTags([]);
      setIsEditing(true);
    }
  }, [onDelete]);

  const toggleTag = useCallback((tag: string) => {
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const addCustomTag = useCallback(() => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  }, [customTag, tags]);

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${className}`}
      >
        <StickyNote className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-white/60">
          {initialNotes?.content ? 'View Notes' : 'Add Notes'}
        </span>
        {initialNotes && (
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
        )}
        <ChevronDown className="w-4 h-4 text-white/40" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <StickyNote className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Workout Notes</h3>
            {initialNotes?.updatedAt && (
              <p className="text-xs text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last updated {new Date(initialNotes.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && autoSave && (
            <span className="text-xs text-yellow-400">Saving...</span>
          )}
          {!isEditing && initialNotes && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-white/60" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </>
          )}
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Quick status selectors */}
      <div className="p-4 border-b border-white/10 space-y-4">
        {/* Mood */}
        <div>
          <label className="text-xs font-medium text-white/60 mb-2 block">How did you feel?</label>
          <div className="flex gap-2">
            {MOODS.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.value}
                  onClick={() => setMood(mood === m.value ? undefined : m.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    mood === m.value
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${mood === m.value ? m.color : 'text-white/40'}`} />
                  <span className={mood === m.value ? 'text-white' : 'text-white/60'}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy level */}
        <div>
          <label className="text-xs font-medium text-white/60 mb-2 block">Energy level</label>
          <div className="flex gap-2">
            {ENERGY_LEVELS.map(e => {
              const Icon = e.icon;
              return (
                <button
                  key={e.value}
                  onClick={() => setEnergy(energy === e.value ? undefined : e.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    energy === e.value
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${energy === e.value ? e.color : 'text-white/40'}`} />
                  <span className={energy === e.value ? 'text-white' : 'text-white/60'}>{e.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sleep quality */}
        <div>
          <label className="text-xs font-medium text-white/60 mb-2 block">Sleep quality</label>
          <div className="flex gap-2">
            {SLEEP_QUALITY.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => setSleepQuality(sleepQuality === s.value ? undefined : s.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    sleepQuality === s.value
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${sleepQuality === s.value ? s.color : 'text-white/40'}`} />
                  <span className={sleepQuality === s.value ? 'text-white' : 'text-white/60'}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/60">Tags</label>
          <button
            onClick={() => setShowTagPicker(!showTagPicker)}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Tag
          </button>
        </div>

        {/* Selected tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs"
              >
                <Tag className="w-3 h-3" />
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-1 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tag picker */}
        <AnimatePresence>
          {showTagPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_TAGS.filter(t => !tags.includes(t)).map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-xs transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Custom tag input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                  placeholder="Custom tag..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={addCustomTag}
                  disabled={!customTag.trim()}
                  className="px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notes content */}
      <div className="p-4">
        {isEditing ? (
          <>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="How was your workout? Any observations, adjustments, or things to remember for next time..."
              className="w-full min-h-[120px] p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500 resize-none"
            />

            {!autoSave && (
              <div className="flex justify-end gap-2 mt-4">
                {initialNotes && (
                  <button
                    onClick={() => {
                      setContent(initialNotes.content || '');
                      setMood(initialNotes.mood);
                      setEnergy(initialNotes.energy);
                      setSleepQuality(initialNotes.sleepQuality);
                      setTags(initialNotes.tags || []);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Notes
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            {content ? (
              <p className="text-white/80 whitespace-pre-wrap">{content}</p>
            ) : (
              <p className="text-white/40 italic">No notes added yet</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default WorkoutNotes;
