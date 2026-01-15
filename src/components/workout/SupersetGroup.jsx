/**
 * SupersetGroup Component
 *
 * Visual grouping component for supersets, giant sets, circuits, and drop sets.
 * Features:
 * - Colored bracket/line connecting grouped exercises
 * - Group type badge (2x superset, 3x giant set, etc.)
 * - Drag-drop reordering within the group
 * - Rest timer configuration per group
 * - Circuit mode with rounds indicator
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Layers,
  RotateCcw,
  Timer,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  GripVertical,
  Settings,
  Zap,
} from 'lucide-react';
import { GlassSurface } from '../glass';

// Group type configurations
const GROUP_TYPE_CONFIG = {
  superset: {
    label: 'Superset',
    color: '#3B82F6', // blue
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
    icon: Layers,
    description: 'Back-to-back exercises, no rest between',
  },
  giant_set: {
    label: 'Giant Set',
    color: '#8B5CF6', // purple
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
    icon: Layers,
    description: '3+ exercises performed consecutively',
  },
  circuit: {
    label: 'Circuit',
    color: '#F97316', // orange
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-400',
    icon: RotateCcw,
    description: 'Rotate through exercises for multiple rounds',
  },
  drop_set: {
    label: 'Drop Set',
    color: '#EF4444', // red
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
    icon: ChevronDown,
    description: 'Reduce weight and continue immediately',
  },
  cluster: {
    label: 'Cluster',
    color: '#10B981', // green
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-400',
    icon: Zap,
    description: 'Brief intra-set rest for heavier weights',
  },
};

/**
 * Exercise item within a superset group
 */
function GroupExerciseItem({ exercise, index, onRemove, onEdit, dragControls, isLast }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {/* Connection line to next exercise */}
      {!isLast && (
        <div
          className="absolute left-6 top-full w-0.5 h-2 bg-current opacity-30"
          style={{ transform: 'translateX(-50%)' }}
        />
      )}

      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group">
        {/* Drag handle */}
        {dragControls && (
          <div
            className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300"
            {...dragControls}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Exercise number */}
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>

        {/* Exercise info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {exercise.name || exercise.exerciseId}
          </p>
          {exercise.sets && exercise.reps && (
            <p className="text-xs text-gray-400">
              {exercise.sets} x {exercise.reps}
              {exercise.weight && ` @ ${exercise.weight}lbs`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(exercise)}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
              aria-label="Edit exercise"
            >
              <Settings className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(exercise.exerciseId)}
              className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors"
              aria-label="Remove from group"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Rest time configuration component
 */
function RestTimeConfig({ restBetween, restAfter, onChange, groupType }) {
  const config = GROUP_TYPE_CONFIG[groupType] || GROUP_TYPE_CONFIG.superset;
  const showRestBetween = !['superset', 'giant_set', 'drop_set'].includes(groupType);

  return (
    <div className="space-y-3">
      {showRestBetween && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Rest between exercises</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange({ restBetween: Math.max(0, restBetween - 5) })}
              className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className={`w-12 text-center text-sm font-medium ${config.textClass}`}>
              {restBetween}s
            </span>
            <button
              onClick={() => onChange({ restBetween: Math.min(60, restBetween + 5) })}
              className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Rest after completing set</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ restAfter: Math.max(0, restAfter - 15) })}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className={`w-12 text-center text-sm font-medium ${config.textClass}`}>
            {restAfter}s
          </span>
          <button
            onClick={() => onChange({ restAfter: Math.min(300, restAfter + 15) })}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Circuit rounds configuration
 */
function CircuitRoundsConfig({ rounds, timed, timePerExercise, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Number of rounds</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ rounds: Math.max(1, rounds - 1) })}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="w-8 text-center text-sm font-medium text-orange-400">
            {rounds}
          </span>
          <button
            onClick={() => onChange({ rounds: Math.min(10, rounds + 1) })}
            className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Timed rotation</span>
        <button
          onClick={() => onChange({ timed: !timed })}
          className={`w-12 h-6 rounded-full transition-colors ${
            timed ? 'bg-orange-500' : 'bg-white/20'
          }`}
        >
          <motion.div
            animate={{ x: timed ? 24 : 2 }}
            className="w-5 h-5 rounded-full bg-white shadow-sm"
          />
        </button>
      </div>

      {timed && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Time per exercise</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange({ timePerExercise: Math.max(10, timePerExercise - 5) })}
              className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-sm font-medium text-orange-400">
              {timePerExercise}s
            </span>
            <button
              onClick={() => onChange({ timePerExercise: Math.min(120, timePerExercise + 5) })}
              className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main SupersetGroup component
 */
export function SupersetGroup({
  group,
  exercises = [],
  onUpdate,
  onDelete,
  onAddExercise,
  onRemoveExercise,
  onReorder,
  onStartGroup,
  isActive = false,
  currentRound = 1,
  completedSets = 0,
  className = '',
}) {
  const [expanded, setExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [localExercises, setLocalExercises] = useState(exercises);

  const config = GROUP_TYPE_CONFIG[group.groupType] || GROUP_TYPE_CONFIG.superset;
  const Icon = config.icon;

  // Calculate total sets for progress
  const totalSets = group.circuitRounds || 1;
  const progress = totalSets > 0 ? (completedSets / (exercises.length * totalSets)) * 100 : 0;

  // Handle reordering
  const handleReorder = useCallback((newOrder) => {
    setLocalExercises(newOrder);
    if (onReorder) {
      onReorder(newOrder.map(e => e.exerciseId));
    }
  }, [onReorder]);

  // Handle settings change
  const handleSettingsChange = useCallback((changes) => {
    if (onUpdate) {
      onUpdate({ ...group, ...changes });
    }
  }, [group, onUpdate]);

  return (
    <div className={`relative ${className}`}>
      {/* Colored left border indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
        style={{ backgroundColor: config.color }}
      />

      <GlassSurface
        depth="shallow"
        className={`ml-3 overflow-hidden ${isActive ? 'ring-2' : ''}`}
        style={isActive ? { '--tw-ring-color': config.color } : {}}
      >
        {/* Header */}
        <div
          className={`p-3 ${config.bgClass} border-b ${config.borderClass} cursor-pointer`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.textClass}`} />
              <span className={`text-sm font-semibold ${config.textClass}`}>
                {exercises.length}x {config.label}
              </span>
              {group.name && (
                <span className="text-xs text-gray-400">- {group.name}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Progress indicator for active groups */}
              {isActive && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: config.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {completedSets}/{exercises.length * totalSets}
                  </span>
                </div>
              )}

              {/* Round indicator for circuits */}
              {group.groupType === 'circuit' && group.circuitRounds > 1 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10">
                  Round {currentRound}/{group.circuitRounds}
                </span>
              )}

              {/* Rest timer indicator */}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Timer className="w-3 h-3" />
                <span>{group.restAfterGroup}s</span>
              </div>

              {/* Expand/collapse */}
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3 space-y-2">
                {/* Exercise list */}
                <Reorder.Group
                  axis="y"
                  values={localExercises}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {localExercises.map((exercise, index) => (
                    <Reorder.Item
                      key={exercise.exerciseId}
                      value={exercise}
                      className="relative"
                    >
                      {({ dragControls }) => (
                        <GroupExerciseItem
                          exercise={exercise}
                          index={index}
                          onRemove={exercises.length > 2 ? onRemoveExercise : undefined}
                          dragControls={dragControls}
                          isLast={index === localExercises.length - 1}
                        />
                      )}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

                {/* Add exercise button */}
                {onAddExercise && exercises.length < 10 && (
                  <button
                    onClick={onAddExercise}
                    className="w-full p-2 border border-dashed border-white/20 rounded-lg text-sm text-gray-400 hover:border-white/40 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Exercise
                  </button>
                )}
              </div>

              {/* Settings panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-t ${config.borderClass}`}
                  >
                    <div className="p-3 space-y-4">
                      {group.groupType === 'circuit' && (
                        <CircuitRoundsConfig
                          rounds={group.circuitRounds || 1}
                          timed={group.circuitTimed || false}
                          timePerExercise={group.circuitTimePerExercise || 30}
                          onChange={handleSettingsChange}
                        />
                      )}

                      <RestTimeConfig
                        restBetween={group.restBetweenExercises || 0}
                        restAfter={group.restAfterGroup || 90}
                        onChange={handleSettingsChange}
                        groupType={group.groupType}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className={`p-3 border-t ${config.borderClass} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      showSettings
                        ? `${config.bgClass} ${config.textClass}`
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 inline mr-1" />
                    Settings
                  </button>

                  {onDelete && (
                    <button
                      onClick={onDelete}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                      Delete
                    </button>
                  )}
                </div>

                {onStartGroup && !isActive && (
                  <button
                    onClick={onStartGroup}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg ${config.bgClass} ${config.textClass} hover:opacity-80 transition-opacity`}
                  >
                    Start {config.label}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassSurface>
    </div>
  );
}

/**
 * Group type selector for creating new groups
 */
export function GroupTypeSelector({ onSelect, selectedType, className = '' }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`}>
      {Object.entries(GROUP_TYPE_CONFIG).map(([type, config]) => {
        const Icon = config.icon;
        const isSelected = selectedType === type;

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`p-3 rounded-lg border transition-all ${
              isSelected
                ? `${config.bgClass} ${config.borderClass} ${config.textClass}`
                : 'border-white/10 hover:border-white/20 text-gray-400 hover:text-gray-300'
            }`}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">{config.label}</p>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Create group modal/drawer content
 */
export function CreateGroupPanel({
  exercises = [],
  selectedExercises = [],
  onExerciseToggle,
  onCreateGroup,
  onCancel,
}) {
  const [groupType, setGroupType] = useState('superset');
  const [groupName, setGroupName] = useState('');

  const config = GROUP_TYPE_CONFIG[groupType];
  const canCreate = selectedExercises.length >= 2;
  const minExercises = groupType === 'giant_set' ? 3 : 2;

  const handleCreate = () => {
    if (selectedExercises.length < minExercises) return;

    onCreateGroup({
      groupType,
      name: groupName.trim() || undefined,
      exercises: selectedExercises.map((id, index) => ({
        exerciseId: id,
        order: index,
      })),
    });
  };

  return (
    <div className="space-y-4">
      {/* Group type selection */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Group Type</h4>
        <GroupTypeSelector selectedType={groupType} onSelect={setGroupType} />
        <p className="text-xs text-gray-500 mt-2">{config.description}</p>
      </div>

      {/* Optional name */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-2 block">
          Name (optional)
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={`e.g., "Chest Finisher"`}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          maxLength={50}
        />
      </div>

      {/* Exercise selection */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Select Exercises ({selectedExercises.length} selected, min {minExercises})
        </h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {exercises.map((exercise) => {
            const isSelected = selectedExercises.includes(exercise.id);
            return (
              <button
                key={exercise.id}
                onClick={() => onExerciseToggle(exercise.id)}
                className={`w-full p-2 rounded-lg text-left text-sm transition-colors ${
                  isSelected
                    ? `${config.bgClass} ${config.textClass}`
                    : 'hover:bg-white/5 text-gray-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                      {selectedExercises.indexOf(exercise.id) + 1}
                    </span>
                  )}
                  {exercise.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!canCreate || selectedExercises.length < minExercises}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            canCreate && selectedExercises.length >= minExercises
              ? `${config.bgClass} ${config.textClass} hover:opacity-80`
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          Create {config.label}
        </button>
      </div>
    </div>
  );
}

export default SupersetGroup;
