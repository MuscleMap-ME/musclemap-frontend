/**
 * GeolocationHelper Component
 *
 * Step-by-step help modal for enabling location services.
 * Shows platform-specific instructions based on detected OS and browser.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  MapPin,
  Settings,
  Shield,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Globe,
  Lock,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';
import { type PlatformInfo, getPlatformDescription } from '@/utils/platformDetector';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  detail?: string;
}

interface GeolocationHelperProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  platformInfo: PlatformInfo;
  instructionKey: string;
  errorType?: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported' | 'unknown';
}

// Get steps based on platform
function getSteps(instructionKey: string, platformInfo: PlatformInfo): Step[] {
  switch (instructionKey) {
    case 'ios-safari':
      return [
        {
          id: 'settings',
          title: 'Open Settings',
          description: 'Go to your iPhone Settings app',
          icon: <Settings className="w-6 h-6" />,
          detail: 'Tap the gray gear icon on your home screen',
        },
        {
          id: 'privacy',
          title: 'Privacy & Security',
          description: 'Tap "Privacy & Security" in the menu',
          icon: <Shield className="w-6 h-6" />,
          detail: 'Scroll down to find it in the settings list',
        },
        {
          id: 'location',
          title: 'Location Services',
          description: 'Tap "Location Services" at the top',
          icon: <MapPin className="w-6 h-6" />,
          detail: 'Make sure the toggle is green (enabled)',
        },
        {
          id: 'safari',
          title: 'Find Safari',
          description: 'Scroll down and tap "Safari"',
          icon: <Globe className="w-6 h-6" />,
          detail: 'Set to "While Using the App" or "Ask Next Time"',
        },
      ];

    case 'ios-brave':
      return [
        {
          id: 'shields',
          title: 'Check Brave Shields',
          description: 'Tap the lion icon in the address bar',
          icon: <Shield className="w-6 h-6" />,
          detail: 'This controls site permissions in Brave',
        },
        {
          id: 'location-toggle',
          title: 'Allow Location',
          description: 'Make sure location is not blocked',
          icon: <MapPin className="w-6 h-6" />,
          detail: 'Toggle off any location blocking settings',
        },
        {
          id: 'ios-settings',
          title: 'iOS Settings',
          description: 'Also check Settings → Privacy → Location Services → Brave',
          icon: <Settings className="w-6 h-6" />,
          detail: 'iOS requires permission at the system level too',
        },
        {
          id: 'refresh',
          title: 'Refresh & Allow',
          description: 'Come back and tap "Try Again"',
          icon: <RefreshCw className="w-6 h-6" />,
          detail: 'A permission prompt should appear',
        },
      ];

    case 'ios-chrome':
    case 'ios-firefox':
      return [
        {
          id: 'settings',
          title: 'Open iPhone Settings',
          description: 'Go to your Settings app',
          icon: <Settings className="w-6 h-6" />,
          detail: 'Tap the gray gear icon on your home screen',
        },
        {
          id: 'privacy',
          title: 'Privacy & Security',
          description: 'Find and tap "Privacy & Security"',
          icon: <Shield className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Location Services',
          description: 'Tap "Location Services" and enable it',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'browser',
          title: `Find ${platformInfo.browser === 'chrome' ? 'Chrome' : 'Firefox'}`,
          description: `Scroll down, tap ${platformInfo.browser === 'chrome' ? 'Chrome' : 'Firefox'}, allow location`,
          icon: <Globe className="w-6 h-6" />,
          detail: 'Set to "While Using the App"',
        },
      ];

    case 'android-chrome':
      return [
        {
          id: 'lock',
          title: 'Tap the Lock Icon',
          description: 'Tap the lock/info icon in the address bar',
          icon: <Lock className="w-6 h-6" />,
          detail: 'It\'s to the left of the website address',
        },
        {
          id: 'permissions',
          title: 'Site Settings',
          description: 'Tap "Permissions" or "Site settings"',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Enable Location',
          description: 'Find Location and set to "Allow"',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'refresh',
          title: 'Refresh & Try Again',
          description: 'Come back and tap "Try Again"',
          icon: <RefreshCw className="w-6 h-6" />,
        },
      ];

    case 'android-firefox':
      return [
        {
          id: 'menu',
          title: 'Tap Menu (⋮)',
          description: 'Tap the three dots in the corner',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'settings',
          title: 'Settings',
          description: 'Tap "Settings" in the menu',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'permissions',
          title: 'Site Permissions',
          description: 'Tap "Site permissions" then "Location"',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'allow',
          title: 'Allow Location',
          description: 'Set to "Ask to allow" or "Allowed"',
          icon: <ToggleRight className="w-6 h-6" />,
        },
      ];

    case 'desktop-chrome':
    case 'desktop-brave':
      return [
        {
          id: 'lock',
          title: 'Click the Lock Icon',
          description: 'Click the lock/tune icon in the address bar',
          icon: <Lock className="w-6 h-6" />,
          detail: 'It\'s to the left of "musclemap.me"',
        },
        {
          id: 'settings',
          title: 'Site Settings',
          description: 'Click "Site settings" in the dropdown',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Find Location',
          description: 'Find "Location" and set to "Allow"',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'refresh',
          title: 'Refresh the Page',
          description: 'Close this and click "Try Again"',
          icon: <RefreshCw className="w-6 h-6" />,
        },
      ];

    case 'desktop-safari':
      return [
        {
          id: 'preferences',
          title: 'Safari Preferences',
          description: 'Click Safari menu → Settings (or Preferences)',
          icon: <Settings className="w-6 h-6" />,
          detail: 'Or press ⌘, (Command + comma)',
        },
        {
          id: 'websites',
          title: 'Websites Tab',
          description: 'Click "Websites" in the toolbar',
          icon: <Globe className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Location (Left Sidebar)',
          description: 'Click "Location" in the left sidebar',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'allow',
          title: 'Allow musclemap.me',
          description: 'Find musclemap.me and set to "Allow"',
          icon: <ToggleRight className="w-6 h-6" />,
        },
      ];

    case 'desktop-firefox':
      return [
        {
          id: 'shield',
          title: 'Click the Shield Icon',
          description: 'Click the shield icon in the address bar',
          icon: <Shield className="w-6 h-6" />,
          detail: 'It\'s to the left of the website address',
        },
        {
          id: 'permissions',
          title: 'Connection Secure → More Information',
          description: 'Click "More Information" at the bottom',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Permissions Tab',
          description: 'Go to "Permissions" tab, find "Access Your Location"',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'allow',
          title: 'Allow',
          description: 'Uncheck "Use Default" and select "Allow"',
          icon: <ToggleRight className="w-6 h-6" />,
        },
      ];

    case 'desktop-edge':
      return [
        {
          id: 'lock',
          title: 'Click the Lock Icon',
          description: 'Click the lock icon in the address bar',
          icon: <Lock className="w-6 h-6" />,
        },
        {
          id: 'permissions',
          title: 'Permissions for this site',
          description: 'Click "Permissions for this site"',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Location',
          description: 'Find Location and set to "Allow"',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'refresh',
          title: 'Refresh',
          description: 'Refresh the page and try again',
          icon: <RefreshCw className="w-6 h-6" />,
        },
      ];

    default: // generic
      return [
        {
          id: 'settings',
          title: 'Open Browser Settings',
          description: 'Find your browser\'s settings or preferences',
          icon: <Settings className="w-6 h-6" />,
        },
        {
          id: 'privacy',
          title: 'Privacy or Security',
          description: 'Look for Privacy, Security, or Site Settings',
          icon: <Shield className="w-6 h-6" />,
        },
        {
          id: 'location',
          title: 'Location Permission',
          description: 'Find Location and enable for musclemap.me',
          icon: <MapPin className="w-6 h-6" />,
        },
        {
          id: 'refresh',
          title: 'Refresh & Try Again',
          description: 'Come back and try again',
          icon: <RefreshCw className="w-6 h-6" />,
        },
      ];
  }
}

export function GeolocationHelper({
  isOpen,
  onClose,
  onRetry,
  platformInfo,
  instructionKey,
  errorType = 'permission_denied',
}: GeolocationHelperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps = useMemo(
    () => getSteps(instructionKey, platformInfo),
    [instructionKey, platformInfo]
  );

  const platformDescription = useMemo(
    () => getPlatformDescription(platformInfo),
    [platformInfo]
  );

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  const handleMarkComplete = (index: number) => {
    setCompletedSteps((prev) => new Set([...prev, index]));
    if (index < steps.length - 1) {
      setCurrentStep(index + 1);
    }
  };

  const handleTryAgain = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onRetry();
  };

  if (!isOpen) return null;

  const allStepsComplete = completedSteps.size === steps.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Enable Location</h2>
              <p className="text-xs text-gray-500">{platformDescription}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${((completedSteps.size) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error context */}
          {errorType === 'permission_denied' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Location access was denied.</strong> Follow these steps to enable it:
              </p>
            </div>
          )}

          {errorType === 'position_unavailable' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Could not determine your location.</strong> Make sure location services are enabled and try again.
              </p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isComplete = completedSteps.has(index);
              const isCurrent = currentStep === index;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isComplete
                      ? 'border-green-300 bg-green-50'
                      : isCurrent
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Step number or check */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isComplete ? 'text-green-700' : 'text-gray-900'}`}>
                          {step.title}
                        </span>
                      </div>
                      <p className={`text-sm mt-0.5 ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
                        {step.description}
                      </p>
                      {step.detail && isCurrent && !isComplete && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          {step.detail}
                        </p>
                      )}
                    </div>

                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 ${
                        isComplete
                          ? 'text-green-500'
                          : isCurrent
                          ? 'text-orange-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                  </div>

                  {/* Mark complete button */}
                  {isCurrent && !isComplete && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkComplete(index);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <span>Done with this step</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* iOS Lockdown Mode warning */}
          {platformInfo.isLockdownMode && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Lockdown Mode Detected</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Lockdown Mode may restrict some features. You may need to temporarily disable it in Settings → Privacy & Security → Lockdown Mode.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Skip Location
            </button>
            <button
              onClick={handleTryAgain}
              className={`flex-1 py-3 px-4 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                allStepsComplete
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>

          {/* Fallback link */}
          <div className="mt-3 text-center">
            <a
              href="https://support.google.com/chrome/answer/142065"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <span>Still having trouble?</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeolocationHelper;
