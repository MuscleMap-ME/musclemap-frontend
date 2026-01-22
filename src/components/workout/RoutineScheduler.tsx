/**
 * Routine Scheduler
 *
 * Assign workouts/templates to specific days of the week.
 * Provides a weekly calendar view for planning workout routines.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  GripVertical,
  Dumbbell,
  Clock,
  Repeat,
  Check,
  Settings,
} from 'lucide-react';

// Types
interface ScheduledWorkout {
  id: string;
  templateId?: string;
  templateName: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  time?: string; // HH:MM format
  duration?: number; // minutes
  notes?: string;
  isRecurring: boolean;
  color?: string;
}

interface WeeklySchedule {
  id: string;
  name: string;
  workouts: ScheduledWorkout[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

interface RoutineSchedulerProps {
  templates?: { id: string; name: string; duration?: number }[];
  schedule?: WeeklySchedule;
  onSave?: (schedule: WeeklySchedule) => void;
  onStartWorkout?: (workout: ScheduledWorkout) => void;
  compact?: boolean;
  className?: string;
}

// Days of the week
const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' },
];

// Color presets for workouts
const WORKOUT_COLORS = [
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

// Helper to get current day of week
function getCurrentDayOfWeek(): number {
  return new Date().getDay();
}

// Helper to format time
function formatTime(time?: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Scheduled workout card
function WorkoutCard({
  workout,
  onEdit,
  onDelete,
  onStart,
  isToday,
  compact,
}: {
  workout: ScheduledWorkout;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
  isToday: boolean;
  compact: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`group relative rounded-lg overflow-hidden ${compact ? 'p-2' : 'p-3'}`}
      style={{
        backgroundColor: `${workout.color || WORKOUT_COLORS[0]}20`,
        borderLeft: `3px solid ${workout.color || WORKOUT_COLORS[0]}`,
      }}
    >
      {/* Drag handle */}
      <div className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
        <GripVertical className="w-4 h-4 text-white/40" />
      </div>

      <div className={compact ? 'ml-0' : 'ml-4'}>
        <div className="flex items-center justify-between gap-2">
          <h4 className={`font-medium text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {workout.templateName}
          </h4>
          {!compact && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <Settings className="w-3 h-3 text-white/60" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 rounded hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          )}
        </div>

        {!compact && (
          <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
            {workout.time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(workout.time)}
              </span>
            )}
            {workout.duration && (
              <span>{workout.duration} min</span>
            )}
            {workout.isRecurring && (
              <span className="flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                Weekly
              </span>
            )}
          </div>
        )}

        {isToday && !compact && (
          <button
            onClick={onStart}
            className="mt-2 w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            Start Workout
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Add/Edit workout modal
function WorkoutModal({
  isOpen,
  onClose,
  workout,
  templates,
  selectedDay,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  workout?: ScheduledWorkout;
  templates: { id: string; name: string; duration?: number }[];
  selectedDay: number;
  onSave: (workout: ScheduledWorkout) => void;
}) {
  const [templateId, setTemplateId] = useState(workout?.templateId || '');
  const [customName, setCustomName] = useState(workout?.templateName || '');
  const [time, setTime] = useState(workout?.time || '');
  const [duration, setDuration] = useState(workout?.duration?.toString() || '');
  const [notes, setNotes] = useState(workout?.notes || '');
  const [isRecurring, setIsRecurring] = useState(workout?.isRecurring ?? true);
  const [color, setColor] = useState(workout?.color || WORKOUT_COLORS[0]);

  const selectedTemplate = templates.find(t => t.id === templateId);

  const handleSave = () => {
    const newWorkout: ScheduledWorkout = {
      id: workout?.id || `workout-${Date.now()}`,
      templateId: templateId || undefined,
      templateName: templateId ? selectedTemplate?.name || customName : customName,
      dayOfWeek: selectedDay,
      time: time || undefined,
      duration: duration ? parseInt(duration) : selectedTemplate?.duration,
      notes: notes || undefined,
      isRecurring,
      color,
    };
    onSave(newWorkout);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#0f0f15] rounded-2xl border border-white/10 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">
            {workout ? 'Edit Workout' : 'Add Workout'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Template selector */}
          <div>
            <label className="text-sm font-medium text-white/60 mb-2 block">
              Workout Template
            </label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">Custom workout</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom name (if no template selected) */}
          {!templateId && (
            <div>
              <label className="text-sm font-medium text-white/60 mb-2 block">
                Workout Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g., Push Day, Leg Day..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {/* Time */}
          <div>
            <label className="text-sm font-medium text-white/60 mb-2 block">
              Time (optional)
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-white/60 mb-2 block">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder={selectedTemplate?.duration?.toString() || '60'}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-medium text-white/60 mb-2 block">
              Color
            </label>
            <div className="flex gap-2">
              {WORKOUT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0f0f15]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Repeat className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-sm font-medium text-white">Repeat Weekly</p>
                <p className="text-xs text-white/40">Same time every week</p>
              </div>
            </div>
            <button
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isRecurring ? 'bg-violet-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-lg transform transition-transform ${
                  isRecurring ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-white/60 mb-2 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for this workout..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!templateId && !customName.trim()}
            className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-600 transition-colors"
          >
            {workout ? 'Save Changes' : 'Add Workout'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function RoutineScheduler({
  templates = [],
  schedule: initialSchedule,
  onSave,
  onStartWorkout,
  compact = false,
  className = '',
}: RoutineSchedulerProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    initialSchedule || {
      id: `schedule-${Date.now()}`,
      name: 'My Routine',
      workouts: [],
      isActive: true,
    }
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentDay = getCurrentDayOfWeek();

  // Group workouts by day
  const workoutsByDay = useMemo(() => {
    const grouped: Record<number, ScheduledWorkout[]> = {};
    DAYS.forEach(d => {
      grouped[d.value] = schedule.workouts.filter(w => w.dayOfWeek === d.value);
    });
    return grouped;
  }, [schedule.workouts]);

  // Calculate week dates
  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + (weekOffset * 7));

    return DAYS.map((_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [weekOffset]);

  const handleAddWorkout = useCallback((day: number) => {
    setSelectedDay(day);
    setEditingWorkout(undefined);
    setShowModal(true);
  }, []);

  const handleEditWorkout = useCallback((workout: ScheduledWorkout) => {
    setSelectedDay(workout.dayOfWeek);
    setEditingWorkout(workout);
    setShowModal(true);
  }, []);

  const handleSaveWorkout = useCallback((workout: ScheduledWorkout) => {
    setSchedule(prev => {
      const existing = prev.workouts.find(w => w.id === workout.id);
      const newWorkouts = existing
        ? prev.workouts.map(w => (w.id === workout.id ? workout : w))
        : [...prev.workouts, workout];

      const newSchedule = { ...prev, workouts: newWorkouts };
      onSave?.(newSchedule);
      return newSchedule;
    });
  }, [onSave]);

  const handleDeleteWorkout = useCallback((workoutId: string) => {
    setSchedule(prev => {
      const newWorkouts = prev.workouts.filter(w => w.id !== workoutId);
      const newSchedule = { ...prev, workouts: newWorkouts };
      onSave?.(newSchedule);
      return newSchedule;
    });
  }, [onSave]);

  // Copy day functionality - keeping for future use
  const _handleCopyDay = useCallback((fromDay: number, toDay: number) => {
    const workoutsToCopy = workoutsByDay[fromDay];
    if (workoutsToCopy.length === 0) return;

    setSchedule(prev => {
      const copiedWorkouts = workoutsToCopy.map(w => ({
        ...w,
        id: `workout-${Date.now()}-${Math.random()}`,
        dayOfWeek: toDay,
      }));

      const newSchedule = { ...prev, workouts: [...prev.workouts, ...copiedWorkouts] };
      onSave?.(newSchedule);
      return newSchedule;
    });
  }, [workoutsByDay, onSave]);

  return (
    <div className={`bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{schedule.name}</h2>
            <p className="text-sm text-white/60">
              {schedule.workouts.length} workouts scheduled
            </p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              weekOffset === 0
                ? 'bg-violet-500 text-white'
                : 'text-white/60 hover:bg-white/10'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className={`grid grid-cols-7 gap-1 ${compact ? 'p-2' : 'p-4'}`}>
        {/* Day headers */}
        {DAYS.map((day, i) => {
          const date = weekDates[i];
          const isToday = weekOffset === 0 && day.value === currentDay;

          return (
            <div
              key={day.value}
              className={`text-center ${compact ? 'py-1' : 'py-2'}`}
            >
              <span className={`text-xs font-medium ${
                isToday ? 'text-violet-400' : 'text-white/60'
              }`}>
                {compact ? day.letter : day.short}
              </span>
              {!compact && (
                <div className={`text-lg font-bold mt-1 ${
                  isToday ? 'text-violet-400' : 'text-white'
                }`}>
                  {date.getDate()}
                </div>
              )}
            </div>
          );
        })}

        {/* Workout slots */}
        {DAYS.map((day) => {
          const dayWorkouts = workoutsByDay[day.value];
          const isToday = weekOffset === 0 && day.value === currentDay;

          return (
            <div
              key={`slot-${day.value}`}
              className={`min-h-[80px] rounded-lg border transition-colors ${
                isToday
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-white/5 border-transparent hover:border-white/10'
              } ${compact ? 'p-1' : 'p-2'}`}
            >
              <AnimatePresence mode="popLayout">
                {dayWorkouts.map(workout => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onEdit={() => handleEditWorkout(workout)}
                    onDelete={() => handleDeleteWorkout(workout.id)}
                    onStart={() => onStartWorkout?.(workout)}
                    isToday={isToday}
                    compact={compact}
                  />
                ))}
              </AnimatePresence>

              {/* Add workout button */}
              <button
                onClick={() => handleAddWorkout(day.value)}
                className={`w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors ${
                  compact ? 'py-1 mt-1' : 'py-2 mt-2'
                } ${dayWorkouts.length === 0 ? 'h-full min-h-[60px]' : ''}`}
              >
                <Plus className={`text-white/40 ${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                {!compact && <span className="text-xs text-white/40">Add</span>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      {!compact && (
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-white">
                {schedule.workouts.length} workouts/week
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white">
                ~{schedule.workouts.reduce((sum, w) => sum + (w.duration || 60), 0)} min total
              </span>
            </div>
          </div>

          {schedule.workouts.length > 0 && (
            <div className="flex items-center gap-1">
              {schedule.workouts.filter(w => w.dayOfWeek <= currentDay).length > 0 && weekOffset === 0 && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <Check className="w-3 h-3" />
                  {schedule.workouts.filter(w => w.dayOfWeek < currentDay).length} done
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit workout modal */}
      <AnimatePresence>
        {showModal && selectedDay !== null && (
          <WorkoutModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            workout={editingWorkout}
            templates={templates}
            selectedDay={selectedDay}
            onSave={handleSaveWorkout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoutineScheduler;
