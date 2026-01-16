import React from 'react';

export interface XPProgressProps {
  /** Current XP amount */
  currentXP: number;
  /** XP required to reach next level */
  levelXP: number;
  /** Current level */
  level: number;
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
  level,
  size = 'md',
  className = '',
}) => {
  const styles = sizeStyles[size];
  const percentage = Math.min((currentXP / levelXP) * 100, 100);
  const xpRemaining = levelXP - currentXP;

  return (
    <div className={`rounded-xl bg-slate-800/50 border border-slate-700/50 ${styles.container} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`${styles.avatar} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white`}>
            {level}
          </div>
          <div>
            <p className={`${styles.text} text-slate-400`}>Level {level}</p>
            <p className="text-xs text-slate-500">{xpRemaining.toLocaleString()} XP to next</p>
          </div>
        </div>
        <span className={`${styles.value} font-bold font-mono text-purple-400`}>
          {currentXP.toLocaleString()} XP
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
