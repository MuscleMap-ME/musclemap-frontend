/**
 * QuickEntryMethods Component
 *
 * Grid of entry method cards for the Activity Log panel.
 * Shows available input methods with visual indicators.
 */

import React from 'react';
import {
  Dumbbell,
  Mic,
  Clipboard,
  Camera,
  FileUp,
  Watch,
} from 'lucide-react';
import { haptic } from '@/utils/haptics';

export type EntryMethod = 'quick' | 'voice' | 'text' | 'screenshot' | 'file' | 'health';

interface EntryMethodConfig {
  id: EntryMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  available: boolean;
  comingSoon?: string;
}

const ENTRY_METHODS: EntryMethodConfig[] = [
  {
    id: 'quick',
    label: 'Quick Log',
    description: 'Recent exercises',
    icon: Dumbbell,
    color: 'from-blue-600 to-blue-500',
    available: true,
  },
  {
    id: 'voice',
    label: 'Voice',
    description: 'Say it',
    icon: Mic,
    color: 'from-purple-600 to-purple-500',
    available: true,
  },
  {
    id: 'text',
    label: 'Paste',
    description: 'From clipboard',
    icon: Clipboard,
    color: 'from-green-600 to-green-500',
    available: true,
  },
  {
    id: 'screenshot',
    label: 'Screenshot',
    description: 'OCR import',
    icon: Camera,
    color: 'from-orange-600 to-orange-500',
    available: false,
    comingSoon: 'Phase 2',
  },
  {
    id: 'file',
    label: 'Import',
    description: 'CSV, JSON',
    icon: FileUp,
    color: 'from-cyan-600 to-cyan-500',
    available: false,
    comingSoon: 'Phase 3',
  },
  {
    id: 'health',
    label: 'Sync',
    description: 'Apple, Garmin',
    icon: Watch,
    color: 'from-red-600 to-red-500',
    available: false,
    comingSoon: 'Phase 3',
  },
];

interface QuickEntryMethodsProps {
  onSelect: (method: EntryMethod) => void;
  activeMethod?: EntryMethod | null;
}

export function QuickEntryMethods({ onSelect, activeMethod }: QuickEntryMethodsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ENTRY_METHODS.map((method) => {
        const Icon = method.icon;
        const isActive = activeMethod === method.id;

        return (
          <button
            key={method.id}
            onClick={() => {
              if (method.available) {
                haptic('light');
                onSelect(method.id);
              }
            }}
            disabled={!method.available}
            className={`
              relative rounded-2xl p-4 text-center transition-all min-h-[100px]
              touch-action-manipulation
              ${method.available
                ? `bg-gradient-to-br ${method.color} hover:scale-[1.02] active:scale-[0.98] shadow-lg`
                : 'bg-gray-800/50 opacity-50 cursor-not-allowed'
              }
              ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
            `}
          >
            {!method.available && method.comingSoon && (
              <span className="absolute top-2 right-2 text-[10px] bg-gray-700 px-1.5 py-0.5 rounded-full">
                {method.comingSoon}
              </span>
            )}
            <Icon className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium text-sm">{method.label}</p>
            <p className="text-xs opacity-80">{method.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default QuickEntryMethods;
