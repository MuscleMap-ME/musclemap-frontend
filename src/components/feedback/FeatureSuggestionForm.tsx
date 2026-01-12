/**
 * FeatureSuggestionForm Component
 *
 * A form for users to suggest new features, with the option
 * to submit directly to GitHub Issues.
 */

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/musclemap/musclemap-frontend';

type Category = 'visualization' | 'workout' | 'tracking' | 'social' | 'performance' | 'other';
type Priority = 'nice-to-have' | 'important' | 'critical';

interface FeatureSuggestionFormProps {
  onSuccess?: () => void;
}

export function FeatureSuggestionForm({ onSuccess }: FeatureSuggestionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitToGitHub, setSubmitToGitHub] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    problem: '',
    solution: '',
    alternatives: '',
    category: 'other' as Category,
    priority: 'nice-to-have' as Priority,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }
    if (formData.problem.length < 30) {
      newErrors.problem = 'Please describe the problem in more detail';
    }
    if (formData.solution.length < 30) {
      newErrors.solution = 'Please describe your proposed solution';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function generateGitHubIssueUrl(): string {
    const body = `## Problem Statement
${formData.problem}

## Proposed Solution
${formData.solution}

${formData.alternatives ? `## Alternatives Considered\n${formData.alternatives}\n` : ''}
## Category
${formData.category}

## Priority
${formData.priority}

---
_Submitted via MuscleMap Feedback Center_`;

    const params = new URLSearchParams({
      title: `[Feature] ${formData.title}`,
      body,
      labels: `enhancement,category:${formData.category}`,
    });

    return `${GITHUB_REPO}/issues/new?${params.toString()}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (submitToGitHub) {
        const issueUrl = generateGitHubIssueUrl();
        window.open(issueUrl, '_blank');
      } else {
        // For now, just log - in production this would hit an internal API
        console.log('Feature suggestion submitted:', formData);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit feature suggestion:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const categoryOptions = [
    { value: 'visualization', label: '3D Visualization', emoji: '🎨' },
    { value: 'workout', label: 'Workout Tracking', emoji: '🏋️' },
    { value: 'tracking', label: 'Progress Tracking', emoji: '📊' },
    { value: 'social', label: 'Social Features', emoji: '👥' },
    { value: 'performance', label: 'Performance', emoji: '⚡' },
    { value: 'other', label: 'Other', emoji: '📦' },
  ];

  const priorityOptions = [
    { value: 'nice-to-have', label: 'Nice to have', emoji: '💭' },
    { value: 'important', label: 'Important', emoji: '⭐' },
    { value: 'critical', label: 'Critical for my workflow', emoji: '🔥' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-200">
          Feature Title
        </label>
        <input
          id="title"
          type="text"
          placeholder="A concise title for your feature"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {errors.title && <p className="text-sm text-red-400">{errors.title}</p>}
      </div>

      {/* Problem */}
      <div className="space-y-2">
        <label htmlFor="problem" className="block text-sm font-medium text-gray-200">
          What problem does this solve?
        </label>
        <textarea
          id="problem"
          placeholder="Describe the problem you're trying to solve or the need you have..."
          rows={4}
          value={formData.problem}
          onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        {errors.problem && <p className="text-sm text-red-400">{errors.problem}</p>}
      </div>

      {/* Solution */}
      <div className="space-y-2">
        <label htmlFor="solution" className="block text-sm font-medium text-gray-200">
          Proposed Solution
        </label>
        <textarea
          id="solution"
          placeholder="Describe how you envision this feature working..."
          rows={4}
          value={formData.solution}
          onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        {errors.solution && <p className="text-sm text-red-400">{errors.solution}</p>}
      </div>

      {/* Alternatives */}
      <div className="space-y-2">
        <label htmlFor="alternatives" className="block text-sm font-medium text-gray-200">
          Alternatives Considered (optional)
        </label>
        <textarea
          id="alternatives"
          placeholder="Have you considered any alternative solutions?"
          rows={3}
          value={formData.alternatives}
          onChange={(e) => setFormData({ ...formData, alternatives: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-gray-200">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label htmlFor="priority" className="block text-sm font-medium text-gray-200">
            How important is this to you?
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit Options */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={submitToGitHub}
            onChange={(e) => setSubmitToGitHub(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-white">Submit directly to GitHub</span>
            <p className="text-sm text-gray-400">Get community feedback and votes</p>
          </div>
        </label>
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting
          ? 'Submitting...'
          : submitToGitHub
          ? 'Open GitHub Issue'
          : 'Submit Suggestion'}
      </button>
    </form>
  );
}

export default FeatureSuggestionForm;
