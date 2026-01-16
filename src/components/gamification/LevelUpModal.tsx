import React, { useEffect, useState } from 'react';

export interface Reward {
  /** Reward icon (emoji or URL) */
  icon: string;
  /** Reward name */
  name: string;
  /** Optional description */
  description?: string;
}

export interface LevelUpModalProps {
  /** Whether modal is visible */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** The new level achieved */
  newLevel: number;
  /** Optional rewards unlocked at this level */
  rewards?: Reward[];
  /** Optional custom title */
  title?: string;
}

/**
 * LevelUpModal - Celebration modal when user levels up
 *
 * @example
 * <LevelUpModal
 *   isOpen={showLevelUp}
 *   onClose={() => setShowLevelUp(false)}
 *   newLevel={13}
 *   rewards={[{ icon: '🎨', name: 'New Avatar Frame' }]}
 * />
 */
export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  newLevel,
  rewards = [],
  title = 'Level Up!',
}) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase(0);
      const timer1 = setTimeout(() => setAnimationPhase(1), 100);
      const timer2 = setTimeout(() => setAnimationPhase(2), 500);
      const timer3 = setTimeout(() => setAnimationPhase(3), 800);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
          animationPhase >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-6 text-center transform transition-all duration-500 ${
          animationPhase >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        {/* Confetti emoji */}
        <div
          className={`text-6xl mb-4 transition-all duration-500 ${
            animationPhase >= 2 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          🎉
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-slate-300 mb-6">You've reached level {newLevel}</p>

        {/* Level badge */}
        <div
          className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white mb-6 shadow-lg shadow-purple-500/50 transition-all duration-700 ${
            animationPhase >= 2 ? 'scale-100' : 'scale-0'
          }`}
          style={{
            animation: animationPhase >= 2 ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {newLevel}
        </div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <div
            className={`space-y-2 mb-6 transition-all duration-500 delay-200 ${
              animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <p className="text-sm text-slate-400">Rewards Unlocked</p>
            {rewards.map((reward, i) => (
              <div
                key={i}
                className="py-2 px-4 rounded-xl bg-white/10 flex items-center justify-center gap-2"
              >
                <span className="text-xl">{reward.icon}</span>
                <span className="text-white font-medium">{reward.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl bg-white text-purple-900 font-bold hover:bg-white/90 transition-all duration-300 ${
            animationPhase >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Continue
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default LevelUpModal;
