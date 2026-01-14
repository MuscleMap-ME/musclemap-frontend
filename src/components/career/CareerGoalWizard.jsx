/**
 * CareerGoalWizard - Multi-step wizard for setting a career goal
 *
 * Steps:
 * 1. Select category
 * 2. Select standard
 * 3. Set target date
 * 4. Optional agency name and notes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { api } from '../../utils/api';
import { CATEGORY_META } from './CareerStandardCard';
import { GlassButton } from '../glass';

const STEPS = [
  { id: 'category', title: 'Select Category', subtitle: 'Choose your career path' },
  { id: 'standard', title: 'Select Standard', subtitle: 'Choose a physical test' },
  { id: 'date', title: 'Set Target Date', subtitle: 'When do you need to pass?' },
  { id: 'details', title: 'Additional Details', subtitle: 'Optional information' },
];

/**
 * CareerGoalWizard Component
 *
 * @param {boolean} isOpen - Whether the wizard is open
 * @param {Function} onClose - Callback to close the wizard
 * @param {Function} onComplete - Callback when goal is created
 * @param {Object} preselectedStandard - Optional pre-selected standard to skip steps 1-2
 */
export default function CareerGoalWizard({
  isOpen,
  onClose,
  onComplete,
  preselectedStandard = null,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    category: null,
    standard: null,
    targetDate: '',
    priority: 'primary',
    agencyName: '',
    notes: '',
  });

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      // If preselected standard, skip to date step
      if (preselectedStandard) {
        setFormData((prev) => ({
          ...prev,
          category: preselectedStandard.category,
          standard: preselectedStandard,
        }));
        setCurrentStep(2);
      } else {
        setCurrentStep(0);
        setFormData({
          category: null,
          standard: null,
          targetDate: '',
          priority: 'primary',
          agencyName: '',
          notes: '',
        });
      }
    }
  }, [isOpen, preselectedStandard]);

  // Load standards when category is selected
  useEffect(() => {
    if (formData.category && !preselectedStandard) {
      loadStandards(formData.category);
    }
  }, [formData.category, preselectedStandard]);

  const loadCategories = async () => {
    try {
      const response = await api.get('/career/standards/categories');
      setCategories(response.data?.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadStandards = async (category) => {
    setLoading(true);
    try {
      const response = await api.get(`/career/standards?category=${category}`);
      setStandards(response.data?.standards || []);
    } catch (err) {
      console.error('Failed to load standards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({ ...prev, category, standard: null }));
    setCurrentStep(1);
  };

  const handleStandardSelect = (standard) => {
    setFormData((prev) => ({ ...prev, standard }));
    setCurrentStep(2);
  };

  const handleDateSubmit = () => {
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    if (!formData.standard) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/career/goals', {
        ptTestId: formData.standard.id,
        targetDate: formData.targetDate || undefined,
        priority: formData.priority,
        agencyName: formData.agencyName || undefined,
        notes: formData.notes || undefined,
      });

      onComplete?.();
      onClose();
    } catch (err) {
      console.error('Failed to create goal:', err);
      setError(err.message || 'Failed to create goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (preselectedStandard && currentStep === 2) {
      onClose();
    } else {
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  };

  const canGoBack = currentStep > 0 && (!preselectedStandard || currentStep > 2);

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={clsx(
            'w-full max-w-lg bg-[var(--void-base)] border border-[var(--border-subtle)] rounded-2xl',
            'shadow-2xl overflow-hidden'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Set Career Goal
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--glass-white-5)] flex items-center justify-center text-[var(--text-quaternary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-10)] transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div
                    className={clsx(
                      'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                      index < currentStep
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : index === currentStep
                        ? 'bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)] ring-2 ring-[var(--brand-blue-500)]'
                        : 'bg-[var(--glass-white-10)] text-[var(--text-quaternary)]'
                    )}
                  >
                    {index < currentStep ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={clsx(
                        'flex-1 h-0.5 rounded',
                        index < currentStep
                          ? 'bg-[var(--brand-blue-500)]'
                          : 'bg-[var(--glass-white-10)]'
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step Title */}
            <div className="mt-4">
              <h3 className="font-semibold text-[var(--text-primary)]">
                {STEPS[currentStep].title}
              </h3>
              <p className="text-sm text-[var(--text-tertiary)]">
                {STEPS[currentStep].subtitle}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <CategoryStep
                  categories={categories}
                  onSelect={handleCategorySelect}
                />
              )}
              {currentStep === 1 && (
                <StandardStep
                  standards={standards}
                  loading={loading}
                  onSelect={handleStandardSelect}
                  selectedCategory={formData.category}
                />
              )}
              {currentStep === 2 && (
                <DateStep
                  value={formData.targetDate}
                  priority={formData.priority}
                  onChange={(field, value) =>
                    setFormData((prev) => ({ ...prev, [field]: value }))
                  }
                  onSubmit={handleDateSubmit}
                />
              )}
              {currentStep === 3 && (
                <DetailsStep
                  formData={formData}
                  onChange={(field, value) =>
                    setFormData((prev) => ({ ...prev, [field]: value }))
                  }
                  error={error}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              {canGoBack && (
                <GlassButton variant="ghost" onClick={handleBack}>
                  <ChevronLeftIcon className="w-4 h-4 mr-1" />
                  Back
                </GlassButton>
              )}
            </div>
            <div className="flex gap-3">
              <GlassButton variant="ghost" onClick={onClose}>
                Cancel
              </GlassButton>
              {currentStep === 3 && (
                <GlassButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Goal'}
                </GlassButton>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Step 1: Category Selection
 */
function CategoryStep({ categories, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-2 gap-3"
    >
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat.category] || CATEGORY_META.general;
        return (
          <motion.button
            key={cat.category}
            onClick={() => onSelect(cat.category)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={clsx(
              'p-4 rounded-xl text-left transition-all',
              'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
              'hover:bg-[var(--glass-white-10)] hover:border-[var(--border-default)]'
            )}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
              style={{ backgroundColor: `${meta.color}30` }}
            >
              {meta.icon}
            </div>
            <h4 className="font-semibold text-[var(--text-primary)]">
              {cat.label || meta.label}
            </h4>
            <p className="text-sm text-[var(--text-tertiary)]">
              {cat.count} standard{cat.count !== 1 ? 's' : ''}
            </p>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/**
 * Step 2: Standard Selection
 */
function StandardStep({ standards, loading, onSelect, selectedCategory }) {
  const categoryMeta = CATEGORY_META[selectedCategory] || CATEGORY_META.general;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[var(--glass-white-5)] animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--glass-white-10)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--glass-white-10)] rounded w-3/4" />
                <div className="h-3 bg-[var(--glass-white-10)] rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      {standards.map((standard) => (
        <motion.button
          key={standard.id}
          onClick={() => onSelect(standard)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={clsx(
            'w-full p-4 rounded-xl text-left transition-all',
            'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
            'hover:bg-[var(--glass-white-10)] hover:border-[var(--border-default)]'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${categoryMeta.color}30` }}
            >
              {standard.icon || categoryMeta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[var(--text-primary)] truncate">
                {standard.name}
              </h4>
              <p className="text-sm text-[var(--text-tertiary)] truncate">
                {standard.institution}
              </p>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-[var(--text-quaternary)]" />
          </div>
          {standard.components && standard.components.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {standard.components.slice(0, 3).map((comp) => (
                <span
                  key={comp.id || comp.name}
                  className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-quaternary)]"
                >
                  {comp.name}
                </span>
              ))}
              {standard.components.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-quaternary)]">
                  +{standard.components.length - 3}
                </span>
              )}
            </div>
          )}
        </motion.button>
      ))}
    </motion.div>
  );
}

/**
 * Step 3: Target Date
 */
function DateStep({ value, priority, onChange, onSubmit }) {
  // Calculate suggested dates
  const today = new Date();
  const suggestions = [
    { label: '30 days', date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
    { label: '60 days', date: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000) },
    { label: '90 days', date: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) },
    { label: '6 months', date: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000) },
  ];

  const formatDate = (date) => date.toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Date Input */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Target Date (Optional)
        </label>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange('targetDate', e.target.value)}
          min={formatDate(today)}
          className={clsx(
            'w-full px-4 py-3 rounded-xl',
            'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
            'text-[var(--text-primary)]',
            'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]'
          )}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          When do you need to pass this test?
        </p>
      </div>

      {/* Quick Date Suggestions */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Quick Select
        </label>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => onChange('targetDate', formatDate(s.date))}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                value === formatDate(s.date)
                  ? 'bg-[var(--brand-blue-500)] text-white'
                  : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
              )}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => onChange('targetDate', '')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              !value
                ? 'bg-[var(--brand-blue-500)] text-white'
                : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
            )}
          >
            No deadline
          </button>
        </div>
      </div>

      {/* Priority Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Priority
        </label>
        <div className="flex gap-3">
          {['primary', 'secondary'].map((p) => (
            <button
              key={p}
              onClick={() => onChange('priority', p)}
              className={clsx(
                'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                priority === p
                  ? 'bg-[var(--brand-blue-500)] text-white'
                  : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
              )}
            >
              {p === 'primary' ? 'Primary Goal' : 'Secondary Goal'}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2">
          Primary goals are shown prominently on your dashboard
        </p>
      </div>

      {/* Continue Button */}
      <GlassButton variant="primary" fullWidth onClick={onSubmit}>
        Continue
        <ChevronRightIcon className="w-4 h-4 ml-2" />
      </GlassButton>
    </motion.div>
  );
}

/**
 * Step 4: Additional Details
 */
function DetailsStep({ formData, onChange, error }) {
  const categoryMeta = CATEGORY_META[formData.category] || CATEGORY_META.general;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Selected Standard Summary */}
      <div className="p-4 rounded-xl bg-[var(--glass-white-5)] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${categoryMeta.color}30` }}
          >
            {formData.standard?.icon || categoryMeta.icon}
          </div>
          <div>
            <h4 className="font-semibold text-[var(--text-primary)]">
              {formData.standard?.name}
            </h4>
            <p className="text-sm text-[var(--text-tertiary)]">
              {formData.standard?.institution}
            </p>
          </div>
        </div>
        {formData.targetDate && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <CalendarIcon className="w-4 h-4" />
            Target: {new Date(formData.targetDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Agency Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Agency/Unit Name (Optional)
        </label>
        <input
          type="text"
          value={formData.agencyName}
          onChange={(e) => onChange('agencyName', e.target.value)}
          placeholder="e.g., FDNY, Fort Bragg, LAPD"
          className={clsx(
            'w-full px-4 py-3 rounded-xl',
            'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]',
            'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]'
          )}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          rows={3}
          placeholder="Any additional notes about your goal..."
          className={clsx(
            'w-full px-4 py-3 rounded-xl resize-none',
            'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]',
            'focus:outline-none focus:border-[var(--brand-blue-500)] focus:ring-1 focus:ring-[var(--brand-blue-500)]'
          )}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
    </motion.div>
  );
}

// Icon components
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronLeftIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
