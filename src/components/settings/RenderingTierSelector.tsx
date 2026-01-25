/**
 * Rendering Tier Selector - User Preference Component
 *
 * Allows users to override automatic tier detection with manual selection.
 * Part of "The Troika": Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * Options:
 * - Auto (default): System detects best tier based on device/browser
 * - Full: All effects, animations, glassmorphism
 * - Reduced: Styling without animations
 * - Minimal: Basic CSS, no effects
 * - Text-Only: Pure semantic HTML (best for screen readers, slow connections)
 *
 * @example
 * <RenderingTierSelector
 *   value={userPreferences.renderingTier}
 *   onChange={(tier) => updatePreferences({ renderingTier: tier })}
 * />
 */

import React from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { RenderingTier, useRenderingTier } from '@/hooks/useRenderingTier';

export type TierPreference = 'auto' | RenderingTier;

export interface RenderingTierSelectorProps {
  /** Current selection ('auto' or specific tier) */
  value: TierPreference;
  /** Change handler */
  onChange: (value: TierPreference) => void;
  /** Show descriptions */
  showDescriptions?: boolean;
  /** Compact layout */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

interface TierOption {
  value: TierPreference;
  label: string;
  icon: string;
  description: string;
  features: string[];
}

const tierOptions: TierOption[] = [
  {
    value: 'auto',
    label: 'Auto-Detect',
    icon: '⚡',
    description: 'System chooses the best tier based on your device and browser',
    features: ['Adapts to device capability', 'Respects system preferences', 'Optimal performance'],
  },
  {
    value: RenderingTier.FULL,
    label: 'Full Experience',
    icon: '✨',
    description: 'All visual effects, animations, and glassmorphism',
    features: ['Glass effects', 'Smooth animations', 'Gradients & shadows', 'Haptic feedback'],
  },
  {
    value: RenderingTier.REDUCED,
    label: 'Reduced Motion',
    icon: '🎨',
    description: 'Beautiful styling without animations',
    features: ['No animations', 'Full styling', 'Better battery life', 'Less motion sensitivity'],
  },
  {
    value: RenderingTier.MINIMAL,
    label: 'Minimal',
    icon: '📱',
    description: 'Basic styling for maximum performance',
    features: ['Fastest load times', 'Lowest data usage', 'Maximum compatibility', 'Extended battery'],
  },
  {
    value: RenderingTier.TEXT_ONLY,
    label: 'Text Only',
    icon: '📝',
    description: 'Pure semantic HTML, best for accessibility',
    features: ['Screen reader optimized', 'Works everywhere', 'Minimal data', 'Maximum accessibility'],
  },
];

export function RenderingTierSelector({
  value,
  onChange,
  showDescriptions = true,
  compact = false,
  className = '',
}: RenderingTierSelectorProps): React.ReactElement {
  const { tier: currentTier, isRestrictive } = useRenderingTier();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm">
        <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
        <div>
          <span className="font-medium">Current tier: </span>
          <span className="font-mono">{currentTier}</span>
          {isRestrictive && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              (Restrictive browser detected)
            </span>
          )}
        </div>
      </div>

      {/* Tier Options */}
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {tierOptions.map((option) => (
          <label
            key={option.value}
            className={`
              block cursor-pointer rounded-lg border-2 p-4
              transition-all duration-200
              ${value === option.value
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Radio Button */}
              <input
                type="radio"
                name="rendering-tier"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
              />

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{option.icon}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {option.label}
                  </span>
                  {option.value === 'auto' && value === 'auto' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                      Recommended
                    </span>
                  )}
                </div>

                {showDescriptions && (
                  <>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {option.description}
                    </p>

                    {!compact && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {option.features.map((feature) => (
                          <li
                            key={feature}
                            className="px-2 py-0.5 text-xs rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          >
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Help Text */}
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        This setting is saved locally and applies immediately. Choose &quot;Auto-Detect&quot; to let the system
        optimize for your device.
      </p>
    </div>
  );
}

/**
 * Compact card version for settings pages
 */
export function RenderingTierCard({
  value,
  onChange,
}: Pick<RenderingTierSelectorProps, 'value' | 'onChange'>): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display font-semibold">Visual Experience</h3>
        <p className="text-sm text-neutral-500">
          Customize how MuscleMap looks and feels on your device
        </p>
      </CardHeader>
      <CardBody>
        <RenderingTierSelector value={value} onChange={onChange} compact />
      </CardBody>
    </Card>
  );
}

export default RenderingTierSelector;
