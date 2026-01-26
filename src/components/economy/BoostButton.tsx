import React, { useState } from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { Rocket, TrendingUp, Clock, Zap, Sparkles, X } from 'lucide-react';

interface BoostOption {
  id: string;
  name: string;
  duration: string;
  multiplier: number;
  price: number;
  description: string;
}

interface BoostButtonProps {
  targetType: 'post' | 'workout' | 'achievement' | 'profile';
  targetId: string;
  currentBoostLevel?: number;
  onBoost: (boostId: string) => Promise<void>;
  userBalance: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'full';
}

const BOOST_OPTIONS: BoostOption[] = [
  {
    id: 'boost-1h',
    name: 'Quick Boost',
    duration: '1 hour',
    multiplier: 2,
    price: 50,
    description: '2x visibility for 1 hour',
  },
  {
    id: 'boost-6h',
    name: 'Standard Boost',
    duration: '6 hours',
    multiplier: 3,
    price: 150,
    description: '3x visibility for 6 hours',
  },
  {
    id: 'boost-24h',
    name: 'Power Boost',
    duration: '24 hours',
    multiplier: 5,
    price: 500,
    description: '5x visibility for 24 hours',
  },
  {
    id: 'boost-7d',
    name: 'Mega Boost',
    duration: '7 days',
    multiplier: 10,
    price: 2000,
    description: '10x visibility for a week',
  },
];

export function BoostButton({
  targetType,
  targetId,
  currentBoostLevel = 0,
  onBoost,
  userBalance,
  size = 'md',
  variant = 'icon',
}: BoostButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedBoost, setSelectedBoost] = useState<BoostOption | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleBoost = async () => {
    if (!selectedBoost) return;
    if (selectedBoost.price > userBalance) {
      setError('Insufficient balance');
      return;
    }

    setIsBoosting(true);
    setError(null);

    try {
      await onBoost(selectedBoost.id);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to boost');
    } finally {
      setIsBoosting(false);
    }
  };

  const isAlreadyBoosted = currentBoostLevel > 0;

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setShowModal(true)}
          className={`${sizeClasses[size]} rounded-lg transition-all ${
            isAlreadyBoosted
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-purple-400'
          }`}
          title={isAlreadyBoosted ? `Currently boosted ${currentBoostLevel}x` : 'Boost visibility'}
        >
          <Rocket className={`${iconSizes[size]} ${isAlreadyBoosted ? 'animate-pulse' : ''}`} />
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            isAlreadyBoosted
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <Rocket className={`${iconSizes[size]} ${isAlreadyBoosted ? 'animate-pulse' : ''}`} />
          <span className="font-medium">
            {isAlreadyBoosted ? `Boosted ${currentBoostLevel}x` : 'Boost'}
          </span>
        </button>
      )}

      {/* Boost Modal */}
      <SafeAnimatePresence>
        {showModal && (
          <SafeMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <SafeMotion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Boost {targetType}</h3>
                    <p className="text-sm text-gray-400">Increase visibility</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Current boost status */}
              {isAlreadyBoosted && (
                <div className="p-4 border-b border-gray-800">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">
                      Currently boosted at {currentBoostLevel}x visibility
                    </span>
                  </div>
                </div>
              )}

              {/* Boost options */}
              <div className="p-4 space-y-3">
                <label className="block text-sm text-gray-400 mb-2">Select boost level</label>
                {BOOST_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedBoost(option)}
                    disabled={option.price > userBalance}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedBoost?.id === option.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : option.price > userBalance
                        ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{option.name}</span>
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
                          {option.multiplier}x
                        </span>
                      </div>
                      <span className="font-semibold text-white">{option.price} credits</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {option.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {option.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Balance info */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Your balance</span>
                  <span className="text-white font-medium">{userBalance.toLocaleString()} credits</span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 pb-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={handleBoost}
                  disabled={!selectedBoost || (selectedBoost && selectedBoost.price > userBalance) || isBoosting}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                    selectedBoost && selectedBoost.price <= userBalance && !isBoosting
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isBoosting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Boosting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Boost Now {selectedBoost && `(${selectedBoost.price} credits)`}
                    </>
                  )}
                </button>
              </div>
            </SafeMotion.div>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>
    </>
  );
}
