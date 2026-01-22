/**
 * RPG-Style Stat Bar Component
 *
 * A beautiful segmented progress bar that looks like HP/MP bars in classic RPGs.
 * Features vibrant colors, glowing effects, and smooth animations.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================
interface RPGStatBarProps {
  statKey: string;
  label: string;
  abbreviation: string;
  value: number;
  maxValue: number;
  color: string;
  description?: string;
  delay?: number;
  showSegments?: boolean;
  segmentCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  showLabel?: boolean;
  variant?: 'default' | 'retro' | 'modern' | 'neon';
}

// ============================================
// RPG STAT BAR COMPONENT
// ============================================
export function RPGStatBar({
  statKey: _statKey,
  label,
  abbreviation,
  value,
  maxValue,
  color,
  description,
  delay = 0,
  showSegments = true,
  segmentCount = 10,
  size = 'md',
  showValue = true,
  showLabel = true,
  variant = 'default',
}: RPGStatBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const filledSegments = Math.floor((percentage / 100) * segmentCount);
  const partialFill = ((percentage / 100) * segmentCount) % 1;

  // Size configurations
  const sizeConfig = useMemo(() => ({
    sm: { height: 'h-4', text: 'text-xs', gap: 'gap-0.5', labelGap: 'gap-1.5' },
    md: { height: 'h-6', text: 'text-sm', gap: 'gap-1', labelGap: 'gap-2' },
    lg: { height: 'h-8', text: 'text-base', gap: 'gap-1.5', labelGap: 'gap-3' },
  }), []);

  const config = sizeConfig[size];

  // Generate lighter/darker shades for gradient effect
  const colorShades = useMemo(() => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Create lighter shade (for highlight)
    const lighterR = Math.min(255, r + 60);
    const lighterG = Math.min(255, g + 60);
    const lighterB = Math.min(255, b + 60);
    const lighter = `rgb(${lighterR}, ${lighterG}, ${lighterB})`;

    // Create darker shade (for shadow)
    const darkerR = Math.max(0, r - 40);
    const darkerG = Math.max(0, g - 40);
    const darkerB = Math.max(0, b - 40);
    const darker = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;

    // Create glow color with transparency
    const glow = `rgba(${r}, ${g}, ${b}, 0.6)`;
    const softGlow = `rgba(${r}, ${g}, ${b}, 0.3)`;

    return { lighter, darker, glow, softGlow };
  }, [color]);

  // Render segmented bar (classic RPG style)
  const renderSegmentedBar = () => (
    <div
      className={`flex ${config.gap} ${config.height} rounded-md overflow-hidden`}
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.5), 0 0 8px ${colorShades.softGlow}`,
        border: '2px solid rgba(255,255,255,0.1)',
        padding: '2px',
      }}
    >
      {Array.from({ length: segmentCount }).map((_, index) => {
        const isFilled = index < filledSegments;
        const isPartial = index === filledSegments && partialFill > 0;
        const segmentDelay = delay + index * 0.03;

        return (
          <motion.div
            key={index}
            className="flex-1 rounded-sm relative overflow-hidden"
            style={{
              background: 'rgba(0,0,0,0.4)',
            }}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ delay: segmentDelay, duration: 0.2 }}
          >
            {(isFilled || isPartial) && (
              <motion.div
                className="absolute inset-0"
                style={{
                  originX: 0,
                  background: `linear-gradient(180deg, ${colorShades.lighter} 0%, ${color} 40%, ${colorShades.darker} 100%)`,
                  boxShadow: `inset 0 1px 2px rgba(255,255,255,0.4), 0 0 4px ${colorShades.glow}`,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isPartial ? partialFill : 1 }}
                transition={{ delay: segmentDelay, duration: 0.3, ease: 'easeOut' }}
              />
            )}
            {/* Shine effect on filled segments */}
            {isFilled && (
              <div
                className="absolute inset-x-0 top-0 h-1/3"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );

  // Render continuous bar (smoother, more modern)
  const renderContinuousBar = () => (
    <div
      className={`${config.height} rounded-lg overflow-hidden relative`}
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
        boxShadow: `inset 0 2px 6px rgba(0,0,0,0.5), 0 0 12px ${colorShades.softGlow}`,
        border: '2px solid rgba(255,255,255,0.15)',
      }}
    >
      {/* Fill bar */}
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{
          background: `linear-gradient(180deg, ${colorShades.lighter} 0%, ${color} 50%, ${colorShades.darker} 100%)`,
          boxShadow: `0 0 10px ${colorShades.glow}, inset 0 2px 4px rgba(255,255,255,0.3)`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      />
      {/* Top shine */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      {/* Edge highlight at fill end */}
      <motion.div
        className="absolute inset-y-0 w-1"
        style={{
          background: `linear-gradient(180deg, ${colorShades.lighter} 0%, transparent 100%)`,
        }}
        initial={{ left: 0 }}
        animate={{ left: `calc(${percentage}% - 2px)` }}
        transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );

  // Render neon variant (cyberpunk style)
  const renderNeonBar = () => (
    <div
      className={`${config.height} rounded-full overflow-hidden relative`}
      style={{
        background: 'rgba(0,0,0,0.8)',
        boxShadow: `inset 0 0 10px rgba(0,0,0,0.8), 0 0 20px ${colorShades.softGlow}`,
        border: `2px solid ${color}40`,
      }}
    >
      <motion.div
        className="absolute inset-y-1 left-1 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${colorShades.darker}, ${color}, ${colorShades.lighter})`,
          boxShadow: `0 0 15px ${colorShades.glow}, 0 0 30px ${colorShades.softGlow}`,
        }}
        initial={{ width: 0 }}
        animate={{ width: `calc(${percentage}% - 4px)` }}
        transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      />
      {/* Animated pulse glow */}
      <motion.div
        className="absolute inset-y-1 left-1 rounded-full pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 60%, ${color})`,
          mixBlendMode: 'overlay',
        }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: `calc(${percentage}% - 4px)`, opacity: [0, 0.8, 0] }}
        transition={{
          width: { delay, duration: 0.8, ease: 'easeOut' },
          opacity: { delay: delay + 0.3, duration: 1.5, repeat: Infinity, repeatType: 'reverse' },
        }}
      />
    </div>
  );

  // Render retro variant (pixelated feel)
  const renderRetroBar = () => (
    <div
      className={`flex ${config.gap} ${config.height} p-0.5`}
      style={{
        background: '#1a1a2e',
        border: '3px solid #16213e',
        borderRadius: '2px',
        boxShadow: 'inset 0 0 0 1px #0f3460',
      }}
    >
      {Array.from({ length: segmentCount }).map((_, index) => {
        const isFilled = index < filledSegments;
        const segmentDelay = delay + index * 0.05;

        return (
          <motion.div
            key={index}
            className="flex-1"
            style={{
              background: isFilled ? color : '#0a0a15',
              boxShadow: isFilled
                ? `inset -1px -1px 0 ${colorShades.darker}, inset 1px 1px 0 ${colorShades.lighter}`
                : 'inset -1px -1px 0 rgba(255,255,255,0.05)',
              imageRendering: 'pixelated',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: segmentDelay, duration: 0.1 }}
          />
        );
      })}
    </div>
  );

  // Select renderer based on variant
  const renderBar = () => {
    if (!showSegments) return renderContinuousBar();
    switch (variant) {
      case 'neon':
        return renderNeonBar();
      case 'retro':
        return renderRetroBar();
      case 'modern':
        return renderContinuousBar();
      default:
        return renderSegmentedBar();
    }
  };

  return (
    <motion.div
      className="space-y-1.5"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      {/* Header row */}
      <div className={`flex justify-between items-center ${config.labelGap}`}>
        {showLabel && (
          <div className={`flex items-center ${config.labelGap}`}>
            {/* Stat abbreviation badge */}
            <div
              className={`px-2 py-0.5 rounded font-bold ${config.text} tracking-wider cursor-help`}
              style={{
                background: `linear-gradient(135deg, ${color} 0%, ${colorShades.darker} 100%)`,
                boxShadow: `0 2px 4px ${colorShades.softGlow}, inset 0 1px 0 ${colorShades.lighter}40`,
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
              title={description}
            >
              {abbreviation}
            </div>
            {/* Stat name */}
            <span className={`text-white/70 ${config.text}`}>{label}</span>
            {/* Description tooltip indicator - hidden, info shown on hover via title attribute on badge */}
          </div>
        )}
        {showValue && (
          <div className={`flex items-baseline gap-1 ${config.text}`}>
            <span
              className="font-bold tabular-nums"
              style={{ color, textShadow: `0 0 8px ${colorShades.softGlow}` }}
            >
              {Math.round(value)}
            </span>
            <span className="text-white/30">/ {Math.round(maxValue)}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {renderBar()}
    </motion.div>
  );
}

// ============================================
// RPG STATS PANEL COMPONENT
// ============================================
interface Stat {
  key: string;
  label: string;
  abbreviation: string;
  value: number;
  maxValue: number;
  color: string;
  description?: string;
}

interface RPGStatsPanelProps {
  stats: Stat[];
  title?: string;
  variant?: 'default' | 'retro' | 'modern' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  showSegments?: boolean;
  segmentCount?: number;
  className?: string;
}

export function RPGStatsPanel({
  stats,
  title = 'Character Stats',
  variant = 'default',
  size = 'md',
  showSegments = true,
  segmentCount = 10,
  className = '',
}: RPGStatsPanelProps) {
  return (
    <motion.div
      className={`p-4 rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {title && (
        <h3
          className="text-lg font-bold text-white/90 mb-4 pb-2"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {title}
        </h3>
      )}
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <RPGStatBar
            key={stat.key}
            statKey={stat.key}
            label={stat.label}
            abbreviation={stat.abbreviation}
            value={stat.value}
            maxValue={stat.maxValue}
            color={stat.color}
            description={stat.description}
            delay={index * 0.1}
            showSegments={showSegments}
            segmentCount={segmentCount}
            size={size}
            variant={variant}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// LOADING BAR STYLE (Like screenshot)
// ============================================
interface LoadingStyleBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  delay?: number;
}

export function LoadingStyleBar({
  label,
  value,
  maxValue,
  color,
  delay = 0,
}: LoadingStyleBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const segmentCount = 20;
  const filledSegments = Math.ceil((percentage / 100) * segmentCount);

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <div className="text-center text-white/90 font-semibold tracking-widest text-sm">
        {label}
      </div>
      <div
        className="h-8 flex gap-0.5 rounded p-1"
        style={{
          background: '#1a1a2a',
          border: '3px solid #2a2a3a',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {Array.from({ length: segmentCount }).map((_, index) => {
          const isFilled = index < filledSegments;

          return (
            <motion.div
              key={index}
              className="flex-1 rounded-sm"
              style={{
                background: isFilled
                  ? `linear-gradient(180deg, ${color} 0%, ${color}99 50%, ${color}66 100%)`
                  : 'rgba(255,255,255,0.05)',
                boxShadow: isFilled ? `0 0 8px ${color}80` : 'none',
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + index * 0.02, duration: 0.2 }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export default RPGStatBar;
