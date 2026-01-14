/**
 * Feedback Hub
 *
 * Floating action button that provides quick access to the feedback system.
 * Displays on the Dashboard/Home screen for easy visibility.
 *
 * Features:
 * - Pulsing animation to draw attention
 * - Quick access to bug reports, suggestions, and help
 * - Expandable menu on hover/click
 * - Mobile-friendly touch target
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircleQuestion,
  Bug,
  Lightbulb,
  HelpCircle,
  X,
  BookOpen,
} from 'lucide-react';
import { useFeedbackModal } from '../../store/feedbackStore';

const QUICK_ACTIONS = [
  {
    id: 'bug_report',
    label: 'Report Bug',
    icon: Bug,
    color: 'from-red-500 to-orange-500',
    iconColor: 'text-red-400',
  },
  {
    id: 'feature_request',
    label: 'Suggest Feature',
    icon: Lightbulb,
    color: 'from-yellow-500 to-amber-500',
    iconColor: 'text-yellow-400',
  },
  {
    id: 'question',
    label: 'Get Help',
    icon: HelpCircle,
    color: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-400',
  },
  {
    id: 'faq',
    label: 'Browse FAQ',
    icon: BookOpen,
    color: 'from-purple-500 to-pink-500',
    iconColor: 'text-purple-400',
  },
];

/**
 * Feedback Hub Component
 */
export function FeedbackHub() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openFeedbackModal, setStep } = useFeedbackModal();

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleAction = useCallback(
    (actionId) => {
      setIsExpanded(false);
      if (actionId === 'faq') {
        openFeedbackModal();
        setTimeout(() => setStep('faq'), 0);
      } else {
        openFeedbackModal(actionId);
      }
    },
    [openFeedbackModal, setStep]
  );

  const handleClickAway = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  return (
    <>
      {/* Backdrop for click away */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClickAway}
            className="fixed inset-0 z-40"
          />
        )}
      </AnimatePresence>

      {/* Floating Hub */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Quick Actions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-2 mb-2"
            >
              {QUICK_ACTIONS.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action.id)}
                  className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full bg-gray-900/95 backdrop-blur-lg border border-white/10 shadow-lg hover:bg-gray-800 transition-all group"
                >
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center`}
                  >
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={handleToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isExpanded
              ? 'bg-gray-900 border border-white/20'
              : 'bg-gradient-to-br from-blue-500 to-blue-600'
          }`}
        >
          {/* Pulse animation when not expanded */}
          {!isExpanded && (
            <>
              <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25" />
              <span className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-20" />
            </>
          )}

          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircleQuestion className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Tooltip when not expanded */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2, duration: 0.3 }}
            className="absolute right-16 bottom-2 px-3 py-1.5 rounded-lg bg-gray-900/95 border border-white/10 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
          >
            Need help?
          </motion.div>
        )}
      </div>
    </>
  );
}

/**
 * Compact inline feedback trigger button
 * Can be placed anywhere to open the feedback modal
 */
export function FeedbackTrigger({ variant = 'default', label = 'Send Feedback', className = '' }) {
  const { openFeedbackModal } = useFeedbackModal();

  const variants = {
    default: 'bg-white/5 hover:bg-white/10 text-gray-300',
    primary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400',
    ghost: 'hover:bg-white/5 text-gray-400',
  };

  return (
    <button
      onClick={() => openFeedbackModal()}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${variants[variant]} ${className}`}
    >
      <MessageCircleQuestion className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default FeedbackHub;
