/**
 * TipCard Component
 *
 * Displays a contextual tip with category icon and like functionality.
 */

import React, { useState } from 'react';
import { request } from '../../utils/httpClient';

const CATEGORY_CONFIG = {
  physiology: { icon: '🧬', label: 'Physiology', gradient: 'from-blue-500/20 to-cyan-500/20' },
  motivation: { icon: '💪', label: 'Motivation', gradient: 'from-orange-500/20 to-yellow-500/20' },
  technique: { icon: '🎯', label: 'Technique', gradient: 'from-purple-500/20 to-pink-500/20' },
  nutrition: { icon: '🥗', label: 'Nutrition', gradient: 'from-green-500/20 to-emerald-500/20' },
  recovery: { icon: '😴', label: 'Recovery', gradient: 'from-indigo-500/20 to-blue-500/20' },
  history: { icon: '📜', label: 'History', gradient: 'from-amber-500/20 to-orange-500/20' },
  science: { icon: '🔬', label: 'Science', gradient: 'from-teal-500/20 to-cyan-500/20' },
};

export default function TipCard({ tip, onDismiss, onLike, compact = false }) {
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  if (!tip) return null;

  const config = CATEGORY_CONFIG[tip.category] || {
    icon: '💡',
    label: 'Tip',
    gradient: 'from-gray-500/20 to-gray-600/20',
  };

  const handleLike = async () => {
    if (liked || isLiking) return;

    setIsLiking(true);
    try {
      await request(`/tips/${tip.id}/like`, { method: 'POST' });
      setLiked(true);
      onLike?.(tip.id);
    } catch (error) {
      console.error('Failed to like tip:', error);
    } finally {
      setIsLiking(false);
    }
  };

  if (compact) {
    return (
      <div className={`bg-gradient-to-r ${config.gradient} rounded-lg p-3 border border-gray-700/50`}>
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">{config.icon}</span>
          <p className="text-sm text-gray-200 leading-relaxed">{tip.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r ${config.gradient} rounded-xl p-4 border border-gray-700/50 relative`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-full transition-colors"
          aria-label="Dismiss tip"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{config.icon}</div>

        <div className="flex-1 min-w-0">
          {tip.title && (
            <h4 className="font-medium text-white mb-1">{tip.title}</h4>
          )}
          <p className="text-gray-200 text-sm leading-relaxed">{tip.content}</p>

          {tip.source && (
            <p className="text-xs text-gray-400 mt-2 italic">— {tip.source}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
        <span className="text-xs text-gray-500 uppercase tracking-wide">{config.label}</span>

        <button
          onClick={handleLike}
          disabled={liked || isLiking}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked
              ? 'text-red-400'
              : 'text-gray-400 hover:text-red-400'
          } ${isLiking ? 'opacity-50 cursor-wait' : ''}`}
        >
          <svg
            className="w-4 h-4"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          {liked ? 'Liked!' : 'Helpful'}
        </button>
      </div>
    </div>
  );
}
