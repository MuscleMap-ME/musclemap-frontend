/**
 * AssessmentLogger - Form/modal for logging assessment results
 *
 * Features:
 * - Assessment type (practice/official/simulated)
 * - Date picker
 * - Per-event pass/fail toggles
 * - Notes field
 * - Total time (if applicable)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { LOG_CAREER_ASSESSMENT_MUTATION } from '../../graphql';
import { GlassButton } from '../glass';
import { CATEGORY_META } from './CareerStandardCard';

interface CareerGoal {
  id: string;
  standardId?: string;
  testName?: string;
  category?: string;
  icon?: string;
}

interface TestEvent {
  id?: string;
  name: string;
  standard?: string;
}

interface EventResult {
  passed: boolean | null;
  score: string;
  notes: string;
}

interface FormData {
  assessmentType: string;
  assessmentDate: string;
  eventResults: Record<string, EventResult>;
  totalTime: string;
  notes: string;
}

/**
 * Assessment types with metadata
 */
const ASSESSMENT_TYPES = [
  {
    id: 'practice',
    label: 'Practice',
    icon: '\uD83C\uDFAF',
    description: 'Self-administered practice test',
    color: 'blue',
  },
  {
    id: 'simulated',
    label: 'Simulated',
    icon: '\u23F1\uFE0F',
    description: 'Timed simulation with proper setup',
    color: 'purple',
  },
  {
    id: 'official',
    label: 'Official',
    icon: '\uD83C\uDFC6',
    description: 'Administered by official proctor',
    color: 'emerald',
  },
];

interface AssessmentLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  goal: CareerGoal | null;
  events?: TestEvent[];
  onSubmit?: () => void;
}

/**
 * AssessmentLogger Component
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Object} goal - The career goal object
 * @param {Array} events - List of test events
 * @param {Function} onSubmit - Callback when assessment is logged
 */
export default function AssessmentLogger({
  isOpen,
  onClose,
  goal,
  events = [],
  onSubmit,
}: AssessmentLoggerProps) {
  const [formData, setFormData] = useState<FormData>({
    assessmentType: 'practice',
    assessmentDate: new Date().toISOString().split('T')[0],
    eventResults: {},
    totalTime: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  // GraphQL mutation for logging assessment
  const [logAssessment, { loading: submitting }] = useMutation(LOG_CAREER_ASSESSMENT_MUTATION, {
    onCompleted: () => {
      onSubmit?.();
      onClose();
    },
    onError: (err) => {
      console.error('Failed to log assessment:', err);
      setError(err.message || 'Failed to log assessment. Please try again.');
    },
  });

  // Initialize event results when events change
  useEffect(() => {
    if (events && events.length > 0) {
      const initialResults: Record<string, EventResult> = {};
      events.forEach((event) => {
        initialResults[event.id || event.name] = {
          passed: null,
          score: '',
          notes: '',
        };
      });
      setFormData((prev) => ({ ...prev, eventResults: initialResults }));
    }
  }, [events]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        assessmentType: 'practice',
        assessmentDate: new Date().toISOString().split('T')[0],
        eventResults: {},
        totalTime: '',
        notes: '',
      });
      setError(null);
      // Re-initialize event results
      if (events && events.length > 0) {
        const initialResults: Record<string, EventResult> = {};
        events.forEach((event) => {
          initialResults[event.id || event.name] = {
            passed: null,
            score: '',
            notes: '',
          };
        });
        setFormData((prev) => ({ ...prev, eventResults: initialResults }));
      }
    }
  }, [isOpen, events]);

  const categoryMeta = CATEGORY_META[goal?.category || 'general'] || CATEGORY_META.general;

  // Calculate summary stats
  const summary = useMemo(() => {
    const results = Object.values(formData.eventResults);
    const total = results.length;
    const passed = results.filter((r) => r.passed === true).length;
    const failed = results.filter((r) => r.passed === false).length;
    const pending = results.filter((r) => r.passed === null).length;
    const allMarked = pending === 0;

    return { total, passed, failed, pending, allMarked };
  }, [formData.eventResults]);

  const handleEventToggle = (eventId: string, passed: boolean | null) => {
    setFormData((prev) => ({
      ...prev,
      eventResults: {
        ...prev.eventResults,
        [eventId]: {
          ...prev.eventResults[eventId],
          passed,
        },
      },
    }));
  };

  const handleEventScore = (eventId: string, score: string) => {
    setFormData((prev) => ({
      ...prev,
      eventResults: {
        ...prev.eventResults,
        [eventId]: {
          ...prev.eventResults[eventId],
          score,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    if (!goal?.id) return;

    setError(null);

    // Format event results for API
    const results: Record<string, unknown> = {};
    Object.entries(formData.eventResults).forEach(([eventId, result]) => {
      results[eventId] = {
        passed: result.passed,
        score: result.score || undefined,
        notes: result.notes || undefined,
      };
    });

    // Add total time and notes to results if provided
    if (formData.totalTime) {
      results.totalTime = formData.totalTime;
    }
    if (formData.notes) {
      results.notes = formData.notes;
    }

    await logAssessment({
      variables: {
        input: {
          standardId: goal.standardId || goal.id,
          assessmentType: formData.assessmentType,
          results,
          assessedAt: formData.assessmentDate,
        },
      },
    });
  };

  const handleMarkAll = (passed: boolean | null) => {
    const newResults: Record<string, EventResult> = {};
    events.forEach((event) => {
      const eventId = event.id || event.name;
      newResults[eventId] = {
        ...formData.eventResults[eventId],
        passed,
      };
    });
    setFormData((prev) => ({ ...prev, eventResults: newResults }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className={clsx(
            'w-full max-w-lg max-h-[90vh] flex flex-col',
            'bg-[var(--void-base)] border border-[var(--border-subtle)] rounded-2xl',
            'shadow-2xl overflow-hidden'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--border-subtle)] flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${categoryMeta.color}30` }}
                >
                  {goal?.icon || categoryMeta.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Log Assessment
                  </h2>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {goal?.testName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--glass-white-5)] flex items-center justify-center text-[var(--text-quaternary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-10)] transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Assessment Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Assessment Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ASSESSMENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, assessmentType: type.id }))
                    }
                    className={clsx(
                      'p-3 rounded-xl text-center transition-all',
                      formData.assessmentType === type.id
                        ? 'bg-[var(--brand-blue-500)] text-white ring-2 ring-[var(--brand-blue-400)]'
                        : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                    )}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Assessment Date
              </label>
              <input
                type="date"
                value={formData.assessmentDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, assessmentDate: e.target.value }))
                }
                max={new Date().toISOString().split('T')[0]}
                className={clsx(
                  'w-full px-4 py-3 rounded-xl',
                  'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
                  'text-[var(--text-primary)]',
                  'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]'
                )}
              />
            </div>

            {/* Event Results */}
            {events && events.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    Event Results
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkAll(true)}
                      className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                      All Pass
                    </button>
                    <button
                      onClick={() => handleMarkAll(false)}
                      className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      All Fail
                    </button>
                    <button
                      onClick={() => handleMarkAll(null)}
                      className="px-2 py-1 text-xs rounded bg-[var(--glass-white-10)] text-[var(--text-quaternary)] hover:bg-[var(--glass-white-20)] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {events.map((event) => {
                    const eventId = event.id || event.name;
                    const result = formData.eventResults[eventId] || { passed: null, score: '', notes: '' };

                    return (
                      <EventResultRow
                        key={eventId}
                        event={event}
                        passed={result.passed}
                        score={result.score}
                        onToggle={(passed) => handleEventToggle(eventId, passed)}
                        onScoreChange={(score) => handleEventScore(eventId, score)}
                      />
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 rounded-xl bg-[var(--glass-white-5)] flex items-center justify-between">
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {summary.pending > 0
                      ? `${summary.pending} event${summary.pending > 1 ? 's' : ''} unmarked`
                      : 'All events marked'}
                  </span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-emerald-400">{summary.passed} pass</span>
                    <span className="text-red-400">{summary.failed} fail</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Time */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Total Time (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.totalTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, totalTime: e.target.value }))
                  }
                  placeholder="e.g., 12:34 or 12 minutes"
                  className={clsx(
                    'flex-1 px-4 py-3 rounded-xl',
                    'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
                    'text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]',
                    'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]'
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                placeholder="Any notes about this assessment..."
                className={clsx(
                  'w-full px-4 py-3 rounded-xl resize-none',
                  'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
                  'text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]',
                  'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]'
                )}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border-subtle)] flex-shrink-0 flex gap-3">
            <GlassButton variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Saving...' : 'Log Assessment'}
            </GlassButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface EventResultRowProps {
  event: TestEvent;
  passed: boolean | null;
  score: string;
  onToggle: (passed: boolean | null) => void;
  onScoreChange: (score: string) => void;
}

/**
 * EventResultRow - Single event pass/fail toggle row
 */
function EventResultRow({ event, passed, score, onToggle, onScoreChange }: EventResultRowProps) {
  const [showScore, setShowScore] = useState(false);

  return (
    <div
      className={clsx(
        'p-3 rounded-xl transition-colors',
        passed === true
          ? 'bg-emerald-500/10 border border-emerald-500/30'
          : passed === false
          ? 'bg-red-500/10 border border-red-500/30'
          : 'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[var(--text-primary)] truncate">
            {event.name}
          </div>
          {event.standard && (
            <div className="text-xs text-[var(--text-tertiary)]">
              Standard: {event.standard}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Optional Score Input Toggle */}
          <button
            onClick={() => setShowScore(!showScore)}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              'bg-[var(--glass-white-10)] hover:bg-[var(--glass-white-20)]',
              showScore ? 'text-[var(--brand-blue-400)]' : 'text-[var(--text-quaternary)]'
            )}
            title="Add score"
          >
            <HashIcon className="w-4 h-4" />
          </button>

          {/* Pass/Fail Toggles */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
            <button
              onClick={() => onToggle(true)}
              className={clsx(
                'px-3 py-2 text-sm font-medium transition-colors',
                passed === true
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[var(--glass-white-5)] text-[var(--text-tertiary)] hover:bg-emerald-500/20 hover:text-emerald-400'
              )}
            >
              Pass
            </button>
            <button
              onClick={() => onToggle(false)}
              className={clsx(
                'px-3 py-2 text-sm font-medium transition-colors',
                passed === false
                  ? 'bg-red-500 text-white'
                  : 'bg-[var(--glass-white-5)] text-[var(--text-tertiary)] hover:bg-red-500/20 hover:text-red-400'
              )}
            >
              Fail
            </button>
          </div>
        </div>
      </div>

      {/* Score Input */}
      <AnimatePresence>
        {showScore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <input
                type="text"
                value={score || ''}
                onChange={(e) => onScoreChange(e.target.value)}
                placeholder="Enter score (e.g., 45 reps, 6:30)"
                className={clsx(
                  'w-full px-3 py-2 rounded-lg text-sm',
                  'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
                  'text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]',
                  'focus:outline-none focus:border-[var(--brand-blue-500)]'
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Icon components
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}
