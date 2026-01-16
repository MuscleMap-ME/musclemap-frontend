/**
 * Feedback Modal
 *
 * Multi-purpose modal for:
 * - Bug reports
 * - Feature suggestions
 * - Questions / Support
 * - General feedback
 * - FAQ browsing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Search,
  ThumbsUp,
  ThumbsDown,
  Send,
  CheckCircle,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { GlassSurface } from '../glass/GlassSurface';
import { GlassButton } from '../glass/GlassButton';
import {
  useFeedbackModal,
  useFeedbackForm,
  useFaq,
  useFeedbackStore,
  FEEDBACK_TYPES,
  FEEDBACK_LABELS,
  FEEDBACK_DESCRIPTIONS,
  PRIORITY_OPTIONS,
} from '../../store/feedbackStore';
import { useToast } from '../../store/uiStore';
import { useDebounce } from '../../hooks';
import { api } from '../../utils/api';

const FEEDBACK_ICONS = {
  bug_report: Bug,
  feature_request: Lightbulb,
  question: HelpCircle,
  general: MessageSquare,
};

const FEEDBACK_COLORS = {
  bug_report: 'from-red-500/20 to-orange-500/20',
  feature_request: 'from-yellow-500/20 to-amber-500/20',
  question: 'from-blue-500/20 to-cyan-500/20',
  general: 'from-purple-500/20 to-pink-500/20',
};

const ICON_COLORS = {
  bug_report: 'text-red-400',
  feature_request: 'text-yellow-400',
  question: 'text-blue-400',
  general: 'text-purple-400',
};

/**
 * Type Selection Step
 */
function TypeSelection({ onSelect, onFaqClick }) {
  const types = Object.keys(FEEDBACK_TYPES);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">How can we help?</h3>
        <p className="text-sm text-gray-400">Choose what you&apos;d like to share with us</p>
      </div>

      <div className="grid gap-3">
        {types.map((typeKey) => {
          const type = FEEDBACK_TYPES[typeKey];
          const Icon = FEEDBACK_ICONS[type];
          return (
            <motion.button
              key={type}
              onClick={() => onSelect(type)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${FEEDBACK_COLORS[type]} hover:scale-[1.02] transition-transform text-left`}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`p-3 rounded-xl bg-black/20 ${ICON_COLORS[type]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{FEEDBACK_LABELS[type]}</p>
                <p className="text-sm text-gray-300">{FEEDBACK_DESCRIPTIONS[type]}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          );
        })}
      </div>

      {/* FAQ Link */}
      <button
        onClick={onFaqClick}
        className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mt-6"
      >
        <div className="p-2 rounded-lg bg-white/10">
          <BookOpen className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-white">Browse FAQ</p>
          <p className="text-sm text-gray-400">Find answers to common questions</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );
}

/**
 * Feedback Form Step
 */
function FeedbackForm({ type, onBack, onSuccess }) {
  const { formData, updateFormData, getDeviceInfo } = useFeedbackForm();
  const { toast, error: showError } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const titleRef = useRef(null);

  const Icon = FEEDBACK_ICONS[type];
  const isBugReport = type === 'bug_report';
  const isFeatureRequest = type === 'feature_request';

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const deviceInfo = getDeviceInfo();
      const payload = {
        type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        stepsToReproduce: formData.stepsToReproduce?.trim() || undefined,
        expectedBehavior: formData.expectedBehavior?.trim() || undefined,
        actualBehavior: formData.actualBehavior?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        ...deviceInfo,
      };

      const response = await api.feedback.create(payload);
      toast('Feedback submitted successfully!');
      onSuccess(response.data?.id);
    } catch (err) {
      showError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, type, validate, getDeviceInfo, toast, showError, onSuccess]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className={`p-2 rounded-xl bg-gradient-to-br ${FEEDBACK_COLORS[type]}`}>
          <Icon className={`w-5 h-5 ${ICON_COLORS[type]}`} />
        </div>
        <h3 className="text-lg font-semibold text-white">{FEEDBACK_LABELS[type]}</h3>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          ref={titleRef}
          type="text"
          value={formData.title}
          onChange={(e) => updateFormData('title', e.target.value)}
          placeholder={isBugReport ? "What's the issue?" : isFeatureRequest ? "What feature would you like?" : "What's on your mind?"}
          className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.title ? 'border-red-500' : 'border-white/10'} text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50`}
          maxLength={200}
        />
        {errors.title && (
          <p className="text-sm text-red-400 mt-1">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder={isBugReport ? "Describe what happened..." : isFeatureRequest ? "Describe how this would work..." : "Tell us more..."}
          className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${errors.description ? 'border-red-500' : 'border-white/10'} text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none`}
          rows={4}
          maxLength={5000}
        />
        {errors.description && (
          <p className="text-sm text-red-400 mt-1">{errors.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-1 text-right">
          {formData.description.length}/5000
        </p>
      </div>

      {/* Bug Report Specific Fields */}
      {isBugReport && (
        <>
          {/* Priority */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFormData('priority', option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.priority === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Steps to Reproduce (optional)
            </label>
            <textarea
              value={formData.stepsToReproduce}
              onChange={(e) => updateFormData('stepsToReproduce', e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
              rows={3}
            />
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Expected</label>
              <textarea
                value={formData.expectedBehavior}
                onChange={(e) => updateFormData('expectedBehavior', e.target.value)}
                placeholder="What should happen"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Actual</label>
              <textarea
                value={formData.actualBehavior}
                onChange={(e) => updateFormData('actualBehavior', e.target.value)}
                placeholder="What actually happens"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                rows={2}
              />
            </div>
          </div>
        </>
      )}

      {/* Category for feature requests */}
      {isFeatureRequest && (
        <div>
          <label className="block text-sm text-gray-400 mb-2">Category (optional)</label>
          <select
            value={formData.category}
            onChange={(e) => updateFormData('category', e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
          >
            <option value="">Select a category</option>
            <option value="workouts">Workouts & Training</option>
            <option value="nutrition">Nutrition</option>
            <option value="social">Social & Community</option>
            <option value="gamification">Gamification & Achievements</option>
            <option value="analytics">Analytics & Progress</option>
            <option value="ui">User Interface</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <GlassButton
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          loading={submitting}
          loadingText="Submitting..."
          leftIcon={<Send className="w-4 h-4" />}
        >
          Submit Feedback
        </GlassButton>
      </div>
    </div>
  );
}

/**
 * Success Step
 */
function SuccessStep({ type, onClose, onNewFeedback }) {
  const _Icon = FEEDBACK_ICONS[type];
  const messages = {
    bug_report: "We'll investigate this issue and get back to you if we need more details.",
    feature_request: "Other users can upvote your suggestion. The most popular requests get prioritized!",
    question: "Check our FAQ for quick answers, or we'll respond to your question soon.",
    general: "We appreciate you taking the time to share your thoughts with us.",
  };

  return (
    <div className="text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-6"
      >
        <CheckCircle className="w-10 h-10 text-green-400" />
      </motion.div>

      <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
      <p className="text-gray-400 mb-6">{messages[type]}</p>

      <div className="space-y-3">
        <GlassButton
          variant="primary"
          className="w-full"
          onClick={onClose}
        >
          Done
        </GlassButton>
        <GlassButton
          variant="ghost"
          className="w-full"
          onClick={onNewFeedback}
        >
          Submit Another
        </GlassButton>
      </div>
    </div>
  );
}

/**
 * FAQ Browser Step
 */
function FAQBrowser({ onBack }) {
  const { entries, loading, expandedId, toggleExpanded } = useFaq();
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebounce(localSearch, 300);
  const setFaqEntries = useFeedbackStore((s) => s.setFaqEntries);
  const setFaqCategories = useFeedbackStore((s) => s.setFaqCategories);
  const setFaqLoading = useFeedbackStore((s) => s.setFaqLoading);

  // Fetch FAQ on mount
  useEffect(() => {
    const fetchFaq = async () => {
      setFaqLoading(true);
      try {
        const response = await api.feedback.getFaq();
        setFaqEntries(response.data || {});
        setFaqCategories(response.categories || []);
      } catch (err) {
        console.error('Failed to fetch FAQ:', err);
      } finally {
        setFaqLoading(false);
      }
    };
    fetchFaq();
  }, [setFaqEntries, setFaqCategories, setFaqLoading]);

  // Search FAQ
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      setSearchQuery(debouncedSearch);
    } else {
      setSearchQuery('');
    }
  }, [debouncedSearch]); // setSearchQuery is stable

  const handleHelpful = async (id, helpful) => {
    try {
      await api.feedback.markFaqHelpful(id, helpful);
    } catch (err) {
      console.error('Failed to mark FAQ helpful:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="p-2 rounded-xl bg-white/10">
          <BookOpen className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">Frequently Asked Questions</h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search FAQ..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* FAQ List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading FAQ...</p>
          </div>
        ) : Object.keys(entries).length === 0 ? (
          <div className="text-center py-8">
            <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No FAQ entries found</p>
          </div>
        ) : (
          Object.entries(entries).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-2">
                {items[0]?.categoryLabel || category.replace(/_/g, ' ')}
              </p>
              {items.map((faq) => (
                <div key={faq.id} className="rounded-xl bg-white/5 overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(faq.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <p className="font-medium text-white pr-4">{faq.question}</p>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        expandedId === faq.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedId === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            {faq.answer}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">Was this helpful?</span>
                            <button
                              onClick={() => handleHelpful(faq.id, true)}
                              className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors"
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>Yes</span>
                            </button>
                            <button
                              onClick={() => handleHelpful(faq.id, false)}
                              className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <ThumbsDown className="w-4 h-4" />
                              <span>No</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Main Feedback Modal
 */
export function FeedbackModal() {
  const { isOpen, feedbackType, step, closeFeedbackModal, setFeedbackType, setStep } = useFeedbackModal();
  const setSubmissionSuccess = useFeedbackStore((s) => s.setSubmissionSuccess);
  const resetFormData = useFeedbackStore((s) => s.resetFormData);

  const handleTypeSelect = useCallback((type) => {
    setFeedbackType(type);
  }, [setFeedbackType]);

  const handleBack = useCallback(() => {
    resetFormData();
    setStep('select');
  }, [resetFormData, setStep]);

  const handleSuccess = useCallback((feedbackId) => {
    setSubmissionSuccess(feedbackId);
  }, [setSubmissionSuccess]);

  const handleNewFeedback = useCallback(() => {
    resetFormData();
    setStep('select');
  }, [resetFormData, setStep]);

  const handleFaqClick = useCallback(() => {
    setStep('faq');
  }, [setStep]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFeedbackModal}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-hidden rounded-t-3xl"
          >
            <GlassSurface className="p-6 pb-safe max-h-[90vh] overflow-y-auto">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Close Button */}
              <button
                onClick={closeFeedbackModal}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              {/* Content */}
              <AnimatePresence mode="wait">
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <TypeSelection onSelect={handleTypeSelect} onFaqClick={handleFaqClick} />
                  </motion.div>
                )}

                {step === 'form' && feedbackType && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <FeedbackForm
                      type={feedbackType}
                      onBack={handleBack}
                      onSuccess={handleSuccess}
                    />
                  </motion.div>
                )}

                {step === 'success' && feedbackType && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <SuccessStep
                      type={feedbackType}
                      onClose={closeFeedbackModal}
                      onNewFeedback={handleNewFeedback}
                    />
                  </motion.div>
                )}

                {step === 'faq' && (
                  <motion.div
                    key="faq"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <FAQBrowser onBack={handleBack} />
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassSurface>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FeedbackModal;
