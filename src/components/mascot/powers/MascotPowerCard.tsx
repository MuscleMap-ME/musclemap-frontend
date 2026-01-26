import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { Zap, Lock, Clock, Star, CheckCircle } from 'lucide-react';

interface MascotPower {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3 | 4 | 5;
  cooldownHours: number;
  costTU: number;
  isUnlocked: boolean;
  isActive: boolean;
  cooldownEndsAt?: string;
  usesRemaining?: number;
  maxUses?: number;
}

interface MascotPowerCardProps {
  power: MascotPower;
  onActivate: (powerId: string) => void;
  isLoading?: boolean;
}

export function MascotPowerCard({ power, onActivate, isLoading }: MascotPowerCardProps) {
  const {
    id,
    name,
    description,
    icon,
    tier,
    cooldownHours,
    costTU,
    isUnlocked,
    isActive,
    cooldownEndsAt,
    usesRemaining,
    maxUses,
  } = power;

  const isOnCooldown = cooldownEndsAt && new Date(cooldownEndsAt) > new Date();
  const canActivate = isUnlocked && !isActive && !isOnCooldown && !isLoading;

  const getCooldownRemaining = () => {
    if (!cooldownEndsAt) return null;
    const endTime = new Date(cooldownEndsAt).getTime();
    const now = Date.now();
    const diffMs = endTime - now;
    if (diffMs <= 0) return null;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getTierColor = () => {
    switch (tier) {
      case 5:
        return 'from-amber-400 to-yellow-500 border-amber-500/50';
      case 4:
        return 'from-purple-400 to-pink-500 border-purple-500/50';
      case 3:
        return 'from-blue-400 to-cyan-500 border-blue-500/50';
      case 2:
        return 'from-emerald-400 to-teal-500 border-emerald-500/50';
      default:
        return 'from-gray-400 to-gray-500 border-gray-500/50';
    }
  };

  const getTierLabel = () => {
    switch (tier) {
      case 5:
        return 'Legendary';
      case 4:
        return 'Epic';
      case 3:
        return 'Rare';
      case 2:
        return 'Uncommon';
      default:
        return 'Common';
    }
  };

  const cooldownRemaining = getCooldownRemaining();

  return (
    <SafeMotion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={canActivate ? { scale: 1.02 } : undefined}
      className={`relative rounded-xl border-2 overflow-hidden transition-all ${
        isUnlocked
          ? `bg-gradient-to-br ${getTierColor()} bg-opacity-10 border-opacity-50`
          : 'bg-gray-800/50 border-gray-700/50 opacity-60'
      }`}
    >
      {/* Tier badge */}
      <div
        className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
          isUnlocked
            ? `bg-gradient-to-r ${getTierColor()} text-white`
            : 'bg-gray-700 text-gray-400'
        }`}
      >
        {getTierLabel()}
      </div>

      {/* Lock overlay for locked powers */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Tier {tier} Required</p>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Icon and name */}
        <div className="flex items-start gap-3 mb-3">
          <div className="text-3xl">{icon}</div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">{name}</h4>
            <p className="text-sm text-gray-400 line-clamp-2">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{costTU} TU</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{cooldownHours}h cooldown</span>
          </div>
          {maxUses && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              <span>
                {usesRemaining}/{maxUses} uses
              </span>
            </div>
          )}
        </div>

        {/* Status / Action button */}
        {isActive ? (
          <div className="flex items-center gap-2 py-2 px-3 bg-emerald-500/20 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">Active</span>
          </div>
        ) : isOnCooldown ? (
          <div className="flex items-center gap-2 py-2 px-3 bg-amber-500/10 rounded-lg">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400">
              Cooldown: {cooldownRemaining}
            </span>
          </div>
        ) : (
          <button
            onClick={() => onActivate(id)}
            disabled={!canActivate}
            className={`w-full py-2 rounded-lg font-medium transition-all ${
              canActivate
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Activating...
              </span>
            ) : (
              `Activate (${costTU} TU)`
            )}
          </button>
        )}
      </div>
    </SafeMotion.div>
  );
}
