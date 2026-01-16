import React from 'react';

export type InsightType = 'positive' | 'warning' | 'info' | 'neutral';

export interface InsightCardProps {
  /** Type determines the color scheme */
  type: InsightType;
  /** Main headline */
  title: string;
  /** Supporting text */
  message: string;
  /** Optional emoji or icon */
  icon?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional className override */
  className?: string;
}

const typeStyles: Record<InsightType, { gradient: string; border: string; iconBg: string }> = {
  positive: {
    gradient: 'from-emerald-500/20 to-teal-500/20',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
  },
  warning: {
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20',
  },
  info: {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
  },
  neutral: {
    gradient: 'from-slate-500/20 to-gray-500/20',
    border: 'border-slate-500/30',
    iconBg: 'bg-slate-500/20',
  },
};

/**
 * InsightCard - Analytics insight display with type-based styling
 *
 * @example
 * <InsightCard
 *   type="positive"
 *   title="Great Progress!"
 *   message="Your volume increased 15% this week"
 *   icon="📈"
 * />
 */
export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  message,
  icon,
  action,
  className = '',
}) => {
  const styles = typeStyles[type];

  return (
    <div
      className={`rounded-xl bg-gradient-to-r ${styles.gradient} border ${styles.border} p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{title}</h4>
          <p className="text-sm text-slate-300 mt-0.5">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
