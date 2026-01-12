/**
 * BugReportForm Component
 *
 * A form for users to report bugs, with auto-detected device info
 * and the option to submit directly to GitHub Issues.
 */

import { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check, Upload } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/musclemap/musclemap-frontend';

interface DeviceInfo {
  browser: string;
  os: string;
  screenSize: string;
  userAgent: string;
  timestamp: string;
  url: string;
  appVersion: string;
}

interface BugReportFormProps {
  onSuccess?: () => void;
}

export function BugReportForm({ onSuccess }: BugReportFormProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitToGitHub, setSubmitToGitHub] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const info: DeviceInfo = {
      browser: detectBrowser(),
      os: detectOS(),
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      appVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
    };
    setDeviceInfo(info);
  }, []);

  function detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  function detectOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }
    if (formData.description.length < 30) {
      newErrors.description = 'Please provide more details (at least 30 characters)';
    }
    if (formData.stepsToReproduce.length < 20) {
      newErrors.stepsToReproduce = 'Please describe the steps to reproduce';
    }
    if (formData.expectedBehavior.length < 10) {
      newErrors.expectedBehavior = 'Please describe expected behavior';
    }
    if (formData.actualBehavior.length < 10) {
      newErrors.actualBehavior = 'Please describe actual behavior';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function generateGitHubIssueUrl(): string {
    const body = `## Bug Description
${formData.description}

## Steps to Reproduce
${formData.stepsToReproduce}

## Expected Behavior
${formData.expectedBehavior}

## Actual Behavior
${formData.actualBehavior}

## Severity
${formData.severity}

## Environment
- **Browser:** ${deviceInfo?.browser}
- **OS:** ${deviceInfo?.os}
- **Screen Size:** ${deviceInfo?.screenSize}
- **App Version:** ${deviceInfo?.appVersion}
- **URL:** ${deviceInfo?.url}
- **Timestamp:** ${deviceInfo?.timestamp}

---
_Submitted via MuscleMap Feedback Center_`;

    const params = new URLSearchParams({
      title: `[Bug] ${formData.title}`,
      body,
      labels: `bug,severity:${formData.severity}`,
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
        console.log('Bug report submitted:', { ...formData, deviceInfo });
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit bug report:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyDeviceInfo() {
    if (!deviceInfo) return;

    const text = `Browser: ${deviceInfo.browser}
OS: ${deviceInfo.os}
Screen: ${deviceInfo.screenSize}
URL: ${deviceInfo.url}
Timestamp: ${deviceInfo.timestamp}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-200">
          Bug Title
        </label>
        <input
          id="title"
          type="text"
          placeholder="Brief description of the issue"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {errors.title && <p className="text-sm text-red-400">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-200">
          What happened?
        </label>
        <textarea
          id="description"
          placeholder="Describe the bug in detail..."
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        {errors.description && <p className="text-sm text-red-400">{errors.description}</p>}
      </div>

      {/* Steps to Reproduce */}
      <div className="space-y-2">
        <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-gray-200">
          Steps to Reproduce
        </label>
        <textarea
          id="stepsToReproduce"
          placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
          rows={4}
          value={formData.stepsToReproduce}
          onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
        />
        {errors.stepsToReproduce && (
          <p className="text-sm text-red-400">{errors.stepsToReproduce}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Expected Behavior */}
        <div className="space-y-2">
          <label htmlFor="expectedBehavior" className="block text-sm font-medium text-gray-200">
            Expected Behavior
          </label>
          <textarea
            id="expectedBehavior"
            placeholder="What should have happened?"
            rows={3}
            value={formData.expectedBehavior}
            onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {errors.expectedBehavior && (
            <p className="text-sm text-red-400">{errors.expectedBehavior}</p>
          )}
        </div>

        {/* Actual Behavior */}
        <div className="space-y-2">
          <label htmlFor="actualBehavior" className="block text-sm font-medium text-gray-200">
            Actual Behavior
          </label>
          <textarea
            id="actualBehavior"
            placeholder="What actually happened?"
            rows={3}
            value={formData.actualBehavior}
            onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          {errors.actualBehavior && (
            <p className="text-sm text-red-400">{errors.actualBehavior}</p>
          )}
        </div>
      </div>

      {/* Severity */}
      <div className="space-y-2">
        <label htmlFor="severity" className="block text-sm font-medium text-gray-200">
          Severity
        </label>
        <select
          id="severity"
          value={formData.severity}
          onChange={(e) =>
            setFormData({
              ...formData,
              severity: e.target.value as 'critical' | 'high' | 'medium' | 'low',
            })
          }
          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="critical">Critical - App unusable</option>
          <option value="high">High - Major feature broken</option>
          <option value="medium">Medium - Feature impaired</option>
          <option value="low">Low - Minor issue</option>
        </select>
      </div>

      {/* Device Info */}
      {deviceInfo && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Auto-detected Environment</span>
            <button
              type="button"
              onClick={copyDeviceInfo}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Browser:</span>{' '}
              <span className="text-white">{deviceInfo.browser}</span>
            </div>
            <div>
              <span className="text-gray-500">OS:</span>{' '}
              <span className="text-white">{deviceInfo.os}</span>
            </div>
            <div>
              <span className="text-gray-500">Screen:</span>{' '}
              <span className="text-white">{deviceInfo.screenSize}</span>
            </div>
            <div>
              <span className="text-gray-500">Version:</span>{' '}
              <span className="text-white">{deviceInfo.appVersion}</span>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-sm text-gray-400">You'll need to sign in to GitHub</p>
          </div>
        </label>
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting
          ? 'Submitting...'
          : submitToGitHub
          ? 'Open GitHub Issue'
          : 'Submit Report'}
      </button>
    </form>
  );
}

export default BugReportForm;
