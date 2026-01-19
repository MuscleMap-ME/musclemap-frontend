import React from 'react';

export interface XPProgressProps {
  /** Current XP amount */
  currentXP: number;
  /** XP required to reach next level (also accepts xpForNextLevel for compatibility) */
  levelXP?: number;
  /** Alias for levelXP - XP needed for next level */
  xpForNextLevel?: number;
  /** Current level */
  level: number;
  /** Optional level title/name */
  levelTitle?: string;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className */
  className?: string;
}

const sizeStyles = {
  sm: {
    container: 'p-3',
    avatar: 'w-8 h-8 text-sm',
    text: 'text-xs',
    value: 'text-sm',
    bar: 'h-1.5',
  },
  md: {
    container: 'p-4',
    avatar: 'w-10 h-10 text-base',
    text: 'text-sm',
    value: 'text-lg',
    bar: 'h-2',
  },
  lg: {
    container: 'p-5',
    avatar: 'w-12 h-12 text-lg',
    text: 'text-base',
    value: 'text-xl',
    bar: 'h-3',
  },
};

/**
 * XPProgress - Experience bar showing level and progress to next level
 *
 * @example
 * <XPProgress currentXP={2450} levelXP={3000} level={12} />
 */
export const XPProgress: React.FC<XPProgressProps> = ({
  currentXP,
  levelXP,
  xpForNextLevel,
  level,
  levelTitle,
  size = 'md',
  className = '',
}) => {
  const styles = sizeStyles[size];
  // Support both levelXP and xpForNextLevel props, defaulting to 1000 if neither provided
  const xpRequired = levelXP ?? xpForNextLevel ?? 1000;
  // Ensure currentXP is a valid number
  const safeCurrentXP = typeof currentXP === 'number' && !isNaN(currentXP) ? currentXP : 0;
  const percentage = xpRequired > 0 ? Math.min((safeCurrentXP / xpRequired) * 100, 100) : 0;
  const xpRemaining = Math.max(0, xpRequired - safeCurrentXP);

  return (
    <div className={`rounded-xl bg-slate-800/50 border border-slate-700/50 ${styles.container} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`${styles.avatar} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white`}>
            {level}
          </div>
          <div>
            <p className={`${styles.text} text-slate-400`}>Level {level}{levelTitle ? ` - ${levelTitle}` : ''}</p>
            <p className="text-xs text-slate-500">{xpRemaining.toLocaleString()} XP to next</p>
          </div>
        </div>
        <span className={`${styles.value} font-bold font-mono text-purple-400`}>
          {safeCurrentXP.toLocaleString()} XP
        </span>
      </div>
      <div className={`${styles.bar} bg-slate-700 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default XPProgress;
