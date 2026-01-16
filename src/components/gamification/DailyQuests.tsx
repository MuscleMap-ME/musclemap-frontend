import React from 'react';

export interface Quest {
  /** Quest identifier */
  id: string;
  /** Quest name/description */
  name: string;
  /** XP reward for completion */
  xp: number;
  /** Whether quest is completed */
  completed: boolean;
  /** Current progress (optional, for partial completion) */
  progress?: number;
  /** Goal amount (optional, for partial completion) */
  goal?: number;
}

export interface DailyQuestsProps {
  /** Array of quests */
  quests: Quest[];
  /** Optional title override */
  title?: string;
  /** Optional callback when quest is clicked */
  onQuestClick?: (quest: Quest) => void;
  /** Optional className */
  className?: string;
}

/**
 * DailyQuests - Quest tracker with completion status and XP rewards
 *
 * @example
 * <DailyQuests quests={[
 *   { id: '1', name: 'Complete 1 workout', xp: 100, completed: true },
 *   { id: '2', name: 'Log 10 sets', xp: 50, completed: false, progress: 7, goal: 10 },
 * ]} />
 */
export const DailyQuests: React.FC<DailyQuestsProps> = ({
  quests,
  title = 'Daily Quests',
  onQuestClick,
  className = '',
}) => {
  const completedCount = quests.filter(q => q.completed).length;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-400">
          {completedCount}/{quests.length} done
        </span>
      </div>

      {quests.map((quest, index) => (
        <button
          key={quest.id}
          onClick={() => onQuestClick?.(quest)}
          disabled={!onQuestClick}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
            quest.completed
              ? 'bg-teal-500/10 border border-teal-500/30'
              : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
          } ${onQuestClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {/* Completion indicator */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              quest.completed
                ? 'bg-teal-500 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {quest.completed ? '✓' : index + 1}
          </div>

          {/* Quest info */}
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${quest.completed ? 'line-through text-slate-400' : 'text-white'}`}>
              {quest.name}
            </p>

            {/* Progress bar for partial completion */}
            {quest.progress !== undefined && quest.goal !== undefined && !quest.completed && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${(quest.progress / quest.goal) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {quest.progress}/{quest.goal}
                </span>
              </div>
            )}
          </div>

          {/* XP reward */}
          <span className={`text-sm font-mono flex-shrink-0 ${
            quest.completed ? 'text-teal-400' : 'text-purple-400'
          }`}>
            +{quest.xp} XP
          </span>
        </button>
      ))}
    </div>
  );
};

export default DailyQuests;
