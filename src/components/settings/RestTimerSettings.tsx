import React, { useState } from 'react';

export interface RestTimerSettingsProps {
  /** Default/current rest time in seconds */
  defaultRest: number;
  /** Callback when rest time changes */
  onChange: (seconds: number) => void;
  /** Preset options in seconds (defaults to common values) */
  presets?: number[];
  /** Optional label */
  label?: string;
  /** Optional className */
  className?: string;
}

const DEFAULT_PRESETS = [30, 60, 90, 120, 180];

/**
 * RestTimerSettings - Rest timer preset buttons with custom slider
 *
 * @example
 * <RestTimerSettings
 *   defaultRest={90}
 *   onChange={(seconds) => setRestTime(seconds)}
 * />
 */
export const RestTimerSettings: React.FC<RestTimerSettingsProps> = ({
  defaultRest,
  onChange,
  presets = DEFAULT_PRESETS,
  label = 'Default Rest Time',
  className = '',
}) => {
  const [custom, setCustom] = useState(defaultRest);
  const [showCustom, setShowCustom] = useState(!presets.includes(defaultRest));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const handlePresetClick = (seconds: number) => {
    setShowCustom(false);
    setCustom(seconds);
    onChange(seconds);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setCustom(value);
    onChange(value);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-3">
          {label}
        </label>
      )}

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((seconds) => (
          <button
            key={seconds}
            onClick={() => handlePresetClick(seconds)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              custom === seconds && !showCustom
                ? 'bg-teal-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {formatTime(seconds)}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            showCustom
              ? 'bg-teal-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom slider */}
      {showCustom && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-400">Custom Duration</span>
            <span className="text-lg font-mono font-bold text-teal-400">
              {formatTime(custom)}
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={300}
            step={15}
            value={custom}
            onChange={handleCustomChange}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>15s</span>
            <span>5m</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestTimerSettings;
