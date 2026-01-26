import React from 'react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { Clock, Zap, Shield, TrendingUp, Star, Sparkles, X } from 'lucide-react';

interface ActiveBuff {
  id: string;
  name: string;
  icon: string;
  effect: string;
  multiplier?: number;
  expiresAt: string;
  source: 'power' | 'item' | 'achievement' | 'event';
}

interface MascotBuffDisplayProps {
  buffs: ActiveBuff[];
  onRemove?: (buffId: string) => void;
  compact?: boolean;
}

export function MascotBuffDisplay({ buffs, onRemove, compact = false }: MascotBuffDisplayProps) {
  const getTimeRemaining = (expiresAt: string) => {
    const endTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = endTime - now;
    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSourceIcon = (source: ActiveBuff['source']) => {
    switch (source) {
      case 'power':
        return <Zap className="w-3 h-3 text-purple-400" />;
      case 'item':
        return <Shield className="w-3 h-3 text-blue-400" />;
      case 'achievement':
        return <Star className="w-3 h-3 text-amber-400" />;
      case 'event':
        return <Sparkles className="w-3 h-3 text-pink-400" />;
    }
  };

  if (buffs.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {buffs.map((buff) => (
          <div
            key={buff.id}
            className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full"
            title={`${buff.name}: ${buff.effect}`}
          >
            <span className="text-sm">{buff.icon}</span>
            {buff.multiplier && (
              <span className="text-xs text-purple-400 font-medium">
                {buff.multiplier}x
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Sparkles className="w-4 h-4" />
        <span>Active Buffs ({buffs.length})</span>
      </div>

      <SafeAnimatePresence>
        {buffs.map((buff, index) => (
          <SafeMotion.div
            key={buff.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20"
          >
            {/* Icon */}
            <div className="text-2xl flex-shrink-0">{buff.icon}</div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-white text-sm truncate">{buff.name}</span>
                {buff.multiplier && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/30 text-purple-300">
                    {buff.multiplier}x
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{buff.effect}</p>
              <div className="flex items-center gap-2 mt-1">
                {getSourceIcon(buff.source)}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {getTimeRemaining(buff.expiresAt)}
                </div>
              </div>
            </div>

            {/* Remove button */}
            {onRemove && (
              <button
                onClick={() => onRemove(buff.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Remove buff"
              >
                <X className="w-4 h-4 text-gray-500 hover:text-white" />
              </button>
            )}
          </SafeMotion.div>
        ))}
      </SafeAnimatePresence>
    </div>
  );
}
