/**
 * AICoach Component
 *
 * Main chat interface for the AI Training Partner.
 * Features:
 * - Floating widget (bottom-right) that expands on click
 * - Conversational interface with pre-defined smart responses
 * - Quick action chips for common queries
 * - Coach avatar with animated states
 * - Glass styling with Framer Motion animations
 * - Mobile responsive (full screen on mobile when open)
 * - Keyboard accessible, escape to close
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAICoach } from './useAICoach';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import QuickActions from './QuickActions';
import CoachAvatar, { AVATAR_STATES } from './CoachAvatar';

// Pages where the AI Coach should be hidden to avoid UI overlap
const HIDDEN_ON_PATHS = ['/messages'];

/**
 * AICoach - Main AI Training Partner chat widget
 *
 * @param {Object} props
 * @param {Object} props.userContext - User data for personalization
 * @param {boolean} props.reducedMotion - Respect reduced motion preference
 * @param {string} props.position - Widget position (bottom-right, bottom-left)
 * @param {string} props.placement - Display mode: 'floating' (default) or 'sidebar'
 * @param {string} props.avatar - Coach personality: 'flex' (muscle), 'spark' (energy), 'zen' (calm)
 * @param {boolean} props.collapsed - External control of collapsed state
 * @param {Function} props.onToggle - Callback when chat is toggled
 * @param {number} props.zIndex - CSS z-index for the widget
 */
export default function AICoach({
  userContext = {},
  reducedMotion = false,
  position = 'bottom-right',
  placement = 'floating',
  avatar = 'flex',
  collapsed: externalCollapsed,
  onToggle,
  zIndex = 50,
}) {
  const location = useLocation();

  // All hooks MUST be called before any early returns (React rules of hooks)
  const {
    messages,
    isTyping,
    isOpen: internalIsOpen,
    hasUnread,
    coachName,
    coachTitle,
    sendMessage,
    handleQuickAction,
    toggleChat: internalToggleChat,
    closeChat: internalCloseChat,
    openChat: _internalOpenChat,
    quickActions,
  } = useAICoach({ userContext, avatarPersonality: avatar });

  // Suppress unused variable warning - openChat is available for external use via hook
  void _internalOpenChat;

  // Handle external vs internal collapsed state
  const isControlled = externalCollapsed !== undefined;
  const isOpen = isControlled ? !externalCollapsed : internalIsOpen;

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  // Memoized toggle handler that respects external control
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle(!isOpen);
    }
    if (!isControlled) {
      internalToggleChat();
    }
  }, [onToggle, isOpen, isControlled, internalToggleChat]);

  // Close handler
  const handleClose = useCallback(() => {
    if (onToggle) {
      onToggle(false);
    }
    if (!isControlled) {
      internalCloseChat();
    }
  }, [onToggle, isControlled, internalCloseChat]);

  // Handle message submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, sendMessage]);

  // Handle quick action click
  const onQuickActionClick = useCallback((actionId) => {
    handleQuickAction(actionId);
  }, [handleQuickAction]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Handle click outside to close (only for floating placement)
  useEffect(() => {
    if (placement === 'sidebar') return; // Don't close sidebar on click outside

    const handleClickOutside = (e) => {
      if (isOpen && chatRef.current && !chatRef.current.contains(e.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose, placement]);

  // Hide on certain pages where the floating widget would overlap with important UI
  // This check MUST come after all hook calls
  if (HIDDEN_ON_PATHS.includes(location.pathname)) {
    return null;
  }

  // Position classes for floating placement
  const floatingPositionClasses = {
    'bottom-right': 'right-4 bottom-4 sm:right-6 sm:bottom-6',
    'bottom-left': 'left-4 bottom-4 sm:left-6 sm:bottom-6',
  };

  // Sidebar positioning
  const sidebarPositionClasses = {
    'bottom-right': 'right-0 top-0 h-full',
    'bottom-left': 'left-0 top-0 h-full',
  };

  // Select appropriate positioning based on placement
  const positionClasses = placement === 'sidebar'
    ? sidebarPositionClasses
    : floatingPositionClasses;

  // Chat panel animation variants - different for floating vs sidebar
  const floatingChatVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  const sidebarChatVariants = {
    hidden: {
      x: position === 'bottom-right' ? '100%' : '-100%',
      opacity: 0,
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      x: position === 'bottom-right' ? '100%' : '-100%',
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const chatVariants = placement === 'sidebar' ? sidebarChatVariants : floatingChatVariants;

  // FAB animation variants
  const fabVariants = {
    idle: {
      scale: 1,
      rotate: 0,
    },
    hover: {
      scale: 1.1,
    },
    tap: {
      scale: 0.9,
    },
  };

  return (
    <div
      ref={chatRef}
      className={clsx('fixed', positionClasses[position])}
      style={{ zIndex }}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          /* Chat Panel */
          <motion.div
            key="chat-panel"
            variants={reducedMotion ? {} : chatVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={clsx(
              // Base styles
              'flex flex-col',
              'bg-gray-900/95 backdrop-blur-xl',
              'border border-gray-700/50',
              'shadow-2xl shadow-black/50',
              'overflow-hidden',
              // Placement-specific styles
              placement === 'sidebar'
                ? 'w-[400px] h-full rounded-none border-r-0'
                : [
                    'rounded-2xl',
                    'fixed inset-4 sm:inset-auto',
                    'sm:relative sm:w-96 sm:h-[500px]'
                  ]
            )}
            role="dialog"
            aria-modal="true"
            aria-label="AI Training Partner chat"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700/50 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
              <CoachAvatar
                state={isTyping ? AVATAR_STATES.THINKING : AVATAR_STATES.IDLE}
                size="md"
                personality={avatar}
                reducedMotion={reducedMotion}
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white truncate">{coachName}</h2>
                <p className="text-xs text-gray-400 truncate">{coachTitle}</p>
              </div>
              <button
                onClick={handleClose}
                className={clsx(
                  'w-8 h-8 rounded-full',
                  'bg-gray-800/50 hover:bg-gray-700/80',
                  'flex items-center justify-center',
                  'text-gray-400 hover:text-white',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <CoachAvatar
                    state={AVATAR_STATES.CELEBRATING}
                    size="xl"
                    personality={avatar}
                    reducedMotion={reducedMotion}
                  />
                  <h3 className="mt-4 text-lg font-bold text-white">
                    Hey, I&apos;m {coachName}!
                  </h3>
                  <p className="mt-2 text-sm text-gray-400 max-w-xs">
                    Your AI Training Partner. Ask me about workouts, form tips, or when you need motivation.
                  </p>
                  <div className="mt-6 w-full">
                    <QuickActions
                      actions={quickActions}
                      onAction={onQuickActionClick}
                      reducedMotion={reducedMotion}
                    />
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1 && message.sender === 'coach'}
                  reducedMotion={reducedMotion}
                />
              ))}

              {isTyping && (
                <TypingIndicator
                  coachName={coachName}
                  reducedMotion={reducedMotion}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Bar (show after messages exist) */}
            {messages.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-700/30">
                <QuickActions
                  actions={quickActions}
                  onAction={onQuickActionClick}
                  variant="compact"
                  reducedMotion={reducedMotion}
                />
              </div>
            )}

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-gray-700/50 bg-gray-800/30"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  className={clsx(
                    'flex-1 px-4 py-2.5 rounded-xl',
                    'bg-gray-800/60 border border-gray-700/50',
                    'text-white placeholder-gray-500',
                    'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50',
                    'transition-colors'
                  )}
                  disabled={isTyping}
                  aria-label="Message input"
                />
                <motion.button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.95 }}
                  className={clsx(
                    'px-4 py-2.5 rounded-xl',
                    'bg-blue-600 hover:bg-blue-500',
                    'disabled:bg-gray-700 disabled:cursor-not-allowed',
                    'text-white font-medium',
                    'transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  )}
                  aria-label="Send message"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </motion.button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Floating Action Button - only show in floating mode */
          placement === 'floating' && (
            <motion.button
              key="chat-fab"
              variants={reducedMotion ? {} : fabVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={handleToggle}
              className={clsx(
                'relative',
                'w-14 h-14 rounded-full',
                'bg-gradient-to-br from-blue-500 to-purple-600',
                'shadow-lg shadow-blue-500/30',
                'flex items-center justify-center',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'transition-shadow hover:shadow-xl hover:shadow-blue-500/40'
              )}
              aria-label="Open AI Coach chat"
              aria-expanded={isOpen}
            >
              <CoachAvatar
                state={AVATAR_STATES.IDLE}
                size="md"
                personality={avatar}
                className="bg-transparent"
                reducedMotion={reducedMotion}
              />

              {/* Unread indicator */}
              {hasUnread && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={clsx(
                    'absolute -top-1 -right-1',
                    'w-4 h-4 rounded-full',
                    'bg-red-500 border-2 border-gray-900'
                  )}
                />
              )}

              {/* Pulse animation */}
              {!reducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-400"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.button>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

// Named export for the hook
export { useAICoach } from './useAICoach';
