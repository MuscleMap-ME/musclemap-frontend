/**
 * Goals Page - MuscleMap Liquid Glass Design
 *
 * Goal-based training with targets, progress tracking, and milestones.
 * Supports weight loss, muscle gain, strength, endurance, and more.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
  GlassNav,
  AnimatedLogo,
  GlassSidebar,
  GlassSidebarSection,
  GlassSidebarItem,
  GlassMobileNav,
  MeshBackground,
  GlassProgressBar,
} from '../components/glass';

// Icons
const Icons = {
  Target: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Scale: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  Muscle: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h4m10 0h4M7 12v4a1 1 0 001 1h1M7 12V8a1 1 0 011-1h1m7 5v4a1 1 0 01-1 1h-1m1-5V8a1 1 0 00-1-1h-1m-4 0h4m-4 10h4" />
    </svg>
  ),
  Fire: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// Goal type metadata
const GOAL_TYPE_META = {
  weight_loss: { label: 'Weight Loss', icon: Icons.Scale, color: '#22c55e', description: 'Shed pounds' },
  weight_gain: { label: 'Weight Gain', icon: Icons.Scale, color: '#3b82f6', description: 'Gain healthy weight' },
  muscle_gain: { label: 'Muscle Gain', icon: Icons.Muscle, color: '#8b5cf6', description: 'Build muscle mass' },
  strength: { label: 'Strength', icon: Icons.Fire, color: '#ef4444', description: 'Get stronger' },
  endurance: { label: 'Endurance', icon: Icons.Fire, color: '#f59e0b', description: 'Build stamina' },
  flexibility: { label: 'Flexibility', icon: Icons.Target, color: '#06b6d4', description: 'Improve mobility' },
  general_fitness: { label: 'General Fitness', icon: Icons.Target, color: '#10b981', description: 'Overall health' },
  body_recomposition: { label: 'Body Recomp', icon: Icons.Muscle, color: '#ec4899', description: 'Lose fat, gain muscle' },
  athletic_performance: { label: 'Performance', icon: Icons.Trophy, color: '#f97316', description: 'Athletic goals' },
  rehabilitation: { label: 'Rehabilitation', icon: Icons.Target, color: '#14b8a6', description: 'Recovery' },
  maintenance: { label: 'Maintenance', icon: Icons.Check, color: '#6366f1', description: 'Stay consistent' },
};

// Goal Card Component
function GoalCard({ goal, onUpdate, onDelete }) {
  const meta = GOAL_TYPE_META[goal.goalType] || GOAL_TYPE_META.general_fitness;
  const Icon = meta.icon || Icons.Target;

  const progressPercent = goal.progress || 0;
  const isCompleted = goal.status === 'completed';
  const isPaused = goal.status === 'paused';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-6 ${
        isCompleted ? 'bg-[var(--feedback-success)]/10' : 'bg-[var(--glass-white-5)]'
      } backdrop-blur-xl border border-[var(--border-subtle)]`}
    >
      {goal.isPrimary && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-[var(--brand-blue-500)]/20 rounded-full">
          <span className="text-xs font-semibold text-[var(--brand-blue-400)]">Primary</span>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${meta.color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: meta.color }} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{meta.label}</h3>
          <p className="text-sm text-[var(--text-tertiary)]">{meta.description}</p>
        </div>
      </div>

      {/* Progress */}
      {goal.targetValue && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">
              {goal.currentValue?.toFixed(1) || goal.startingValue?.toFixed(1) || '0'} {goal.targetUnit}
            </span>
            <span className="text-[var(--text-tertiary)]">
              Target: {goal.targetValue} {goal.targetUnit}
            </span>
          </div>
          <div className="h-2 bg-[var(--glass-white-10)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: meta.color }}
            />
          </div>
          <div className="text-right mt-1">
            <span className="text-xs text-[var(--text-quaternary)]">{progressPercent}% complete</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {goal.targetDate && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] mb-4">
          <Icons.Calendar className="w-4 h-4" />
          <span>
            {goal.daysRemaining !== null
              ? goal.daysRemaining > 0
                ? `${goal.daysRemaining} days remaining`
                : 'Target date passed'
              : `Due ${new Date(goal.targetDate).toLocaleDateString()}`}
          </span>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full ${
          isCompleted
            ? 'bg-[var(--feedback-success)]/20 text-[var(--feedback-success)]'
            : isPaused
              ? 'bg-[var(--feedback-warning)]/20 text-[var(--feedback-warning)]'
              : 'bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]'
        }`}>
          {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
        </span>

        <div className="flex gap-2">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => onUpdate(goal)}
          >
            Update
          </GlassButton>
          {!isCompleted && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => onDelete(goal.id)}
            >
              <Icons.X className="w-4 h-4" />
            </GlassButton>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Create Goal Modal
function CreateGoalModal({ isOpen, onClose, onSubmit, suggestions }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goalType: '',
    targetValue: '',
    targetUnit: 'lbs',
    startingValue: '',
    targetDate: '',
    isPrimary: false,
    notes: '',
  });

  if (!isOpen) return null;

  const handleGoalTypeSelect = (type) => {
    const suggestion = suggestions?.find(s => s.goalType === type);
    setFormData({
      ...formData,
      goalType: type,
      targetUnit: suggestion?.suggestedTargetUnit || 'lbs',
    });
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      targetValue: formData.targetValue ? parseFloat(formData.targetValue) : null,
      startingValue: formData.startingValue ? parseFloat(formData.startingValue) : null,
    });
    setFormData({
      goalType: '',
      targetValue: '',
      targetUnit: 'lbs',
      startingValue: '',
      targetDate: '',
      isPrimary: false,
      notes: '',
    });
    setStep(1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[var(--void-base)] border border-[var(--border-subtle)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {step === 1 ? 'Choose Goal Type' : 'Set Your Target'}
            </h2>
            <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          {step === 1 ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(GOAL_TYPE_META).map(([type, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => handleGoalTypeSelect(type)}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--glass-white-5)] hover:bg-[var(--glass-white-10)] transition-all text-left"
                  >
                    <div className="p-2 rounded-lg w-fit mb-2" style={{ backgroundColor: `${meta.color}20` }}>
                      <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">{meta.label}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{meta.description}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[var(--glass-white-5)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  {(() => {
                    const meta = GOAL_TYPE_META[formData.goalType];
                    const Icon = meta?.icon || Icons.Target;
                    return (
                      <>
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${meta?.color}20` }}>
                          <Icon className="w-5 h-5" style={{ color: meta?.color }} />
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">{meta?.label}</div>
                          <div className="text-xs text-[var(--text-tertiary)]">{meta?.description}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Starting Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.startingValue}
                    onChange={e => setFormData({ ...formData, startingValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    placeholder="e.g., 180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.targetValue}
                    onChange={e => setFormData({ ...formData, targetValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    placeholder="e.g., 165"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Unit
                </label>
                <select
                  value={formData.targetUnit}
                  onChange={e => setFormData({ ...formData, targetUnit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                >
                  <option value="lbs">Pounds (lbs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="percent">Percent (%)</option>
                  <option value="reps">Reps</option>
                  <option value="minutes">Minutes</option>
                  <option value="days">Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  placeholder="Any additional notes..."
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="rounded border-[var(--border-subtle)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">Set as primary goal</span>
              </label>

              <div className="flex gap-3 pt-4">
                <GlassButton
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Back
                </GlassButton>
                <GlassButton type="submit" variant="primary" className="flex-1">
                  Create Goal
                </GlassButton>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Goals Page
export default function Goals() {
  const { user } = useUser();
  const [goals, setGoals] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    loadGoals();
    loadSuggestions();
  }, [filter]);

  const loadGoals = async () => {
    try {
      const response = await api.get(`/goals${filter !== 'all' ? `?status=${filter}` : ''}`);
      setGoals(response.data?.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/goals/suggestions');
      setSuggestions(response.data?.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleCreateGoal = async (goalData) => {
    try {
      await api.post('/goals', goalData);
      setShowCreateModal(false);
      loadGoals();
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleUpdateGoal = async (goal) => {
    // TODO: Implement update modal
    console.log('Update goal:', goal);
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/goals/${goalId}`);
      loadGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const primaryGoal = goals.find(g => g.isPrimary && g.status === 'active');

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <AnimatedLogo size={32} breathing />
            <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <div className="flex pt-16">
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                  Goals
                </h1>
                <p className="text-[var(--text-secondary)]">
                  Set targets and track your progress
                </p>
              </div>
              <GlassButton variant="primary" onClick={() => setShowCreateModal(true)}>
                <Icons.Plus className="w-5 h-5 mr-2" />
                New Goal
              </GlassButton>
            </div>

            {/* Primary Goal Highlight */}
            {primaryGoal && (
              <GlassSurface className="p-6 mb-8" depth="medium">
                <div className="flex items-center gap-2 mb-4">
                  <Icons.Trophy className="w-5 h-5 text-[var(--brand-blue-400)]" />
                  <span className="text-sm font-semibold text-[var(--brand-blue-400)]">Primary Goal</span>
                </div>
                <GoalCard
                  goal={primaryGoal}
                  onUpdate={handleUpdateGoal}
                  onDelete={handleDeleteGoal}
                />
              </GlassSurface>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {['active', 'completed', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-[var(--brand-blue-500)] text-white'
                      : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'active' && activeGoals.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                      {activeGoals.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Goals Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand-blue-500)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : goals.length === 0 ? (
              <GlassSurface className="p-12 text-center" depth="subtle">
                <Icons.Target className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Goals Yet</h3>
                <p className="text-[var(--text-tertiary)] mb-6">
                  Set your first fitness goal to start tracking your progress
                </p>
                <GlassButton variant="primary" onClick={() => setShowCreateModal(true)}>
                  <Icons.Plus className="w-5 h-5 mr-2" />
                  Create Your First Goal
                </GlassButton>
              </GlassSurface>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {goals
                  .filter(g => !g.isPrimary || g.status !== 'active')
                  .map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onUpdate={handleUpdateGoal}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
              </div>
            )}

            {/* Suggestions */}
            {goals.length === 0 && suggestions.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Suggested Goals</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {suggestions.slice(0, 6).map(suggestion => {
                    const meta = GOAL_TYPE_META[suggestion.goalType];
                    const Icon = meta?.icon || Icons.Target;
                    return (
                      <button
                        key={suggestion.goalType}
                        onClick={() => setShowCreateModal(true)}
                        className="p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] bg-[var(--glass-white-5)] hover:bg-[var(--glass-white-10)] transition-all text-left"
                      >
                        <div className="p-2 rounded-lg w-fit mb-2" style={{ backgroundColor: `${meta?.color}20` }}>
                          <Icon className="w-5 h-5" style={{ color: meta?.color }} />
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">{suggestion.title}</div>
                        <div className="text-sm text-[var(--text-tertiary)]">{suggestion.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <GlassMobileNav items={[
        { to: '/dashboard', icon: Icons.Target, label: 'Home' },
        { to: '/goals', icon: Icons.Target, label: 'Goals', active: true },
        { to: '/profile', icon: Icons.Target, label: 'Profile' },
      ]} />

      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGoal}
        suggestions={suggestions}
      />
    </div>
  );
}
