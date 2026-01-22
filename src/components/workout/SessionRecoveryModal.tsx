/**
 * SessionRecoveryModal Component
 *
 * Shows when there's an interrupted workout session that can be recovered.
 * Allows users to resume or discard the previous session.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Dumbbell,
  RefreshCw,
  Trash2,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useWorkoutSessionGraphQL } from '../../hooks/useWorkoutSessionGraphQL';
import type { RecoverableSession } from '../../hooks/useWorkoutSessionGraphQL';

interface SessionRecoveryModalProps {
  sessions: RecoverableSession[];
  onRecover: (sessionId: string) => void;
  onDiscard: (sessionId: string) => void;
  onDismiss: () => void;
}

export function SessionRecoveryModal({
  sessions,
  onRecover,
  onDiscard,
  onDismiss,
}: SessionRecoveryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const { recoverSession } = useWorkoutSessionGraphQL();

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Format volume
  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k lbs`;
    }
    return `${Math.round(volume)} lbs`;
  };

  // Handle recover
  const handleRecover = async (sessionId: string) => {
    setSelectedId(sessionId);
    setIsRecovering(true);

    const result = await recoverSession(sessionId);

    if (result.success) {
      onRecover(sessionId);
    } else {
      setIsRecovering(false);
      setSelectedId(null);
    }
  };

  // Handle discard - for archived sessions, we just dismiss them
  // The user can choose to start fresh which effectively discards them
  const handleDiscard = async (sessionId: string) => {
    setSelectedId(sessionId);
    setIsDiscarding(true);

    // For now, just call onDiscard to remove from the UI
    // The archived session will remain in the database but user can ignore it
    onDiscard(sessionId);

    setIsDiscarding(false);
    setSelectedId(null);
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/20">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Unfinished Workout</h2>
              <p className="text-sm text-gray-400">
                {sessions.length === 1
                  ? 'You have an incomplete session'
                  : `You have ${sessions.length} incomplete sessions`}
              </p>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
            >
              {/* Session Info */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatRelativeTime(session.archivedAt || session.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">{session.musclesWorked?.length || 0} muscles</span>
                    </span>
                    <span className="text-gray-400">{session.setsLogged || 0} sets</span>
                    <span className="text-purple-400">{formatVolume(session.totalVolume || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRecover(session.id)}
                  disabled={isRecovering || isDiscarding}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isRecovering && selectedId === session.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resume
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDiscard(session.id)}
                  disabled={isRecovering || isDiscarding}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium transition-colors disabled:opacity-50"
                >
                  {isDiscarding && selectedId === session.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onDismiss}
            disabled={isRecovering || isDiscarding}
            className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>Start Fresh Instead</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SessionRecoveryModal;
