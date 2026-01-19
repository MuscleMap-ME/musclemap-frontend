/**
 * BugReportForm Component
 *
 * A form for users to report bugs, with auto-detected device info,
 * screenshot upload support, and the option to submit directly to GitHub Issues.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, Copy, Check, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

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

interface Screenshot {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  error?: string;
}

interface BugReportFormProps {
  onSuccess?: () => void;
}

const MAX_SCREENSHOTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Compress image before upload
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Scale down if too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Generate unique ID for screenshots
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  // Screenshot upload state
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      screenshots.forEach((s) => URL.revokeObjectURL(s.preview));
    };
  }, []);

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = MAX_SCREENSHOTS - screenshots.length;

    if (remainingSlots <= 0) {
      setErrors((prev) => ({
        ...prev,
        screenshots: `Maximum ${MAX_SCREENSHOTS} screenshots allowed`,
      }));
      return;
    }

    const filesToAdd = fileArray.slice(0, remainingSlots);
    const newScreenshots: Screenshot[] = [];

    for (const file of filesToAdd) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          screenshots: `Invalid file type: ${file.name}. Use JPEG, PNG, GIF, or WebP.`,
        }));
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setErrors((prev) => ({
          ...prev,
          screenshots: `File too large: ${file.name}. Maximum 5MB.`,
        }));
        continue;
      }

      const screenshot: Screenshot = {
        id: generateId(),
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        uploaded: false,
      };

      newScreenshots.push(screenshot);
    }

    if (newScreenshots.length > 0) {
      setScreenshots((prev) => [...prev, ...newScreenshots]);
      setErrors((prev) => {
        const { screenshots: _, ...rest } = prev;
        return rest;
      });
    }
  }, [screenshots.length]);

  // Remove screenshot
  const removeScreenshot = useCallback((id: string) => {
    setScreenshots((prev) => {
      const screenshot = prev.find((s) => s.id === id);
      if (screenshot) {
        URL.revokeObjectURL(screenshot.preview);
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        handleFiles(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFiles]);

  // Upload screenshots to server
  const uploadScreenshots = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const screenshot of screenshots) {
      if (screenshot.uploaded && screenshot.url) {
        uploadedUrls.push(screenshot.url);
        continue;
      }

      try {
        setScreenshots((prev) =>
          prev.map((s) => (s.id === screenshot.id ? { ...s, uploading: true } : s))
        );

        // Compress image before upload
        const compressed = await compressImage(screenshot.file);
        const formData = new FormData();
        formData.append('file', compressed, screenshot.file.name);

        const response = await fetch('/api/feedback/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        const url = data.url;

        setScreenshots((prev) =>
          prev.map((s) =>
            s.id === screenshot.id ? { ...s, uploading: false, uploaded: true, url } : s
          )
        );

        uploadedUrls.push(url);
      } catch (error) {
        setScreenshots((prev) =>
          prev.map((s) =>
            s.id === screenshot.id
              ? { ...s, uploading: false, error: 'Upload failed' }
              : s
          )
        );
      }
    }

    return uploadedUrls;
  };

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

  function generateGitHubIssueUrl(screenshotUrls: string[]): string {
    const screenshotSection = screenshotUrls.length > 0
      ? `\n\n## Screenshots\n${screenshotUrls.map((url, i) => `![Screenshot ${i + 1}](${url})`).join('\n')}`
      : '';

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
- **Timestamp:** ${deviceInfo?.timestamp}${screenshotSection}

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
      // Upload screenshots first if any
      let screenshotUrls: string[] = [];
      if (screenshots.length > 0) {
        screenshotUrls = await uploadScreenshots();
      }

      if (submitToGitHub) {
        const issueUrl = generateGitHubIssueUrl(screenshotUrls);
        window.open(issueUrl, '_blank');
      } else {
        // Submit to internal API
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'bug_report',
            title: formData.title,
            description: formData.description,
            priority: formData.severity,
            stepsToReproduce: formData.stepsToReproduce,
            expectedBehavior: formData.expectedBehavior,
            actualBehavior: formData.actualBehavior,
            attachments: screenshotUrls,
            userAgent: deviceInfo?.userAgent,
            screenSize: deviceInfo?.screenSize,
            appVersion: deviceInfo?.appVersion,
            platform: deviceInfo?.os,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit bug report');
        }
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Failed to submit bug report. Please try again.',
      }));
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

      {/* Screenshots */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-200">
          Screenshots (optional)
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Add up to {MAX_SCREENSHOTS} screenshots. You can drag & drop, paste from clipboard, or click to upload.
        </p>

        {/* Drop zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/20 hover:border-white/40 bg-white/5'
            }
            ${screenshots.length >= MAX_SCREENSHOTS ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={screenshots.length >= MAX_SCREENSHOTS}
          />

          <div className="flex flex-col items-center gap-2">
            {isDragActive ? (
              <>
                <Upload className="w-8 h-8 text-blue-400" />
                <span className="text-blue-400 font-medium">Drop images here</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-gray-400" />
                <span className="text-gray-400">
                  {screenshots.length >= MAX_SCREENSHOTS
                    ? 'Maximum screenshots reached'
                    : 'Click or drag images here'}
                </span>
                <span className="text-xs text-gray-500">
                  JPEG, PNG, GIF, WebP up to 5MB
                </span>
              </>
            )}
          </div>
        </div>

        {/* Screenshot previews */}
        {screenshots.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10"
              >
                <img
                  src={screenshot.preview}
                  alt="Screenshot preview"
                  className="w-full h-full object-cover"
                />

                {/* Upload status overlay */}
                {screenshot.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                )}

                {screenshot.error && (
                  <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                    <span className="text-xs text-red-200 px-2 text-center">
                      {screenshot.error}
                    </span>
                  </div>
                )}

                {screenshot.uploaded && (
                  <div className="absolute top-1 left-1">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeScreenshot(screenshot.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {errors.screenshots && (
          <p className="text-sm text-red-400">{errors.screenshots}</p>
        )}
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
            <p className="text-sm text-gray-400">You&apos;ll need to sign in to GitHub</p>
          </div>
        </label>
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{errors.submit}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || screenshots.some((s) => s.uploading)}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {screenshots.some((s) => s.uploading) ? 'Uploading screenshots...' : 'Submitting...'}
          </>
        ) : submitToGitHub ? (
          'Open GitHub Issue'
        ) : (
          'Submit Report'
        )}
      </button>
    </form>
  );
}

export default BugReportForm;
