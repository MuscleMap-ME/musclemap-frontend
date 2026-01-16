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
 * - Mobile-friendly touch target (min 48px)
 * - Compatible with older browsers (graceful degradation)
 * - Safe area aware for mobile devices
 */

import React, { useState, useCallback, useEffect } from 'react';
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

/**
 * Check if reduced motion is preferred (for accessibility and older devices)
 */
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mediaQuery) {
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener?.('change', handler) || mediaQuery.addListener?.(handler);
      return () => {
        mediaQuery.removeEventListener?.('change', handler) || mediaQuery.removeListener?.(handler);
      };
    }
  }, []);

  return prefersReducedMotion;
};

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
 *
 * Positioned with safe-area-inset for iOS and increased z-index for visibility.
 * Falls back gracefully on older browsers without backdrop-blur support.
 */
export function FeedbackHub() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openFeedbackModal, setStep } = useFeedbackModal();
  const reducedMotion = useReducedMotion();

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

  // Animation variants - disabled for reduced motion
  const containerVariants = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20, scale: 0.8 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.8 },
      };

  const itemVariants = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
      };

  return (
    <>
      {/* Backdrop for click away */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={reducedMotion ? undefined : { opacity: 0 }}
            animate={reducedMotion ? undefined : { opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            onClick={handleClickAway}
            className="fixed inset-0 z-[998]"
            style={{ touchAction: 'none' }}
          />
        )}
      </AnimatePresence>

      {/* Floating Hub - z-[999] ensures it's above everything including mobile nav */}
      <div
        className="fixed z-[999] flex flex-col-reverse items-end gap-3"
        style={{
          bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          right: 'max(24px, env(safe-area-inset-right, 24px))',
        }}
      >
        {/* Quick Actions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              {...containerVariants}
              transition={reducedMotion ? undefined : { duration: 0.2 }}
              className="flex flex-col gap-2 mb-2"
            >
              {QUICK_ACTIONS.map((action, index) => (
                <motion.button
                  key={action.id}
                  {...itemVariants}
                  transition={reducedMotion ? undefined : { delay: index * 0.05 }}
                  onClick={() => handleAction(action.id)}
                  className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full bg-gray-900 border border-white/10 shadow-xl hover:bg-gray-800 transition-colors"
                  style={{
                    minHeight: '48px',
                    // Fallback for older browsers without backdrop-blur
                    backgroundColor: 'rgba(17, 24, 39, 0.98)',
                  }}
                >
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}
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

        {/* Main FAB - increased size for better touch target (56px) */}
        <motion.button
          onClick={handleToggle}
          whileHover={reducedMotion ? undefined : { scale: 1.05 }}
          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          className={`relative w-14 h-14 min-w-[56px] min-h-[56px] rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            isExpanded
              ? 'bg-gray-900 border-2 border-white/30'
              : 'bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-400/50'
          }`}
          style={{
            // Ensure visibility even if gradients don't work
            backgroundColor: isExpanded ? '#111827' : '#2563eb',
            boxShadow: isExpanded
              ? '0 10px 25px rgba(0,0,0,0.5)'
              : '0 10px 25px rgba(37, 99, 235, 0.5)',
          }}
          aria-label={isExpanded ? 'Close feedback menu' : 'Open feedback menu'}
          aria-expanded={isExpanded}
        >
          {/* Pulse animation when not expanded - uses CSS animation for better compatibility */}
          {!isExpanded && !reducedMotion && (
            <>
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ backgroundColor: '#3b82f6' }}
              />
              <span
                className="absolute inset-0 rounded-full animate-pulse opacity-20"
                style={{ backgroundColor: '#60a5fa' }}
              />
            </>
          )}

          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="close"
                initial={reducedMotion ? undefined : { rotate: -90, opacity: 0 }}
                animate={reducedMotion ? undefined : { rotate: 0, opacity: 1 }}
                exit={reducedMotion ? undefined : { rotate: 90, opacity: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.2 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={reducedMotion ? undefined : { rotate: 90, opacity: 0 }}
                animate={reducedMotion ? undefined : { rotate: 0, opacity: 1 }}
                exit={reducedMotion ? undefined : { rotate: -90, opacity: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.2 }}
              >
                <MessageCircleQuestion className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
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
