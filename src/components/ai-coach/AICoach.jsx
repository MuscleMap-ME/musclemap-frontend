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
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAICoach } from './useAICoach';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import QuickActions from './QuickActions';
import CoachAvatar, { AVATAR_STATES } from './CoachAvatar';

/**
 * AICoach - Main AI Training Partner chat widget
 *
 * @param {Object} props
 * @param {Object} props.userContext - User data for personalization
 * @param {boolean} props.reducedMotion - Respect reduced motion preference
 * @param {string} props.position - Widget position (bottom-right, bottom-left)
 * @param {number} props.zIndex - CSS z-index for the widget
 */
export default function AICoach({
  userContext = {},
  reducedMotion = false,
  position = 'bottom-right',
  zIndex = 50,
}) {
  const {
    messages,
    isTyping,
    isOpen,
    hasUnread,
    coachName,
    coachTitle,
    sendMessage,
    handleQuickAction,
    toggleChat,
    closeChat,
    quickActions,
  } = useAICoach({ userContext });

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

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
        closeChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeChat]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && chatRef.current && !chatRef.current.contains(e.target)) {
        closeChat();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeChat]);

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

  // Position classes
  const positionClasses = {
    'bottom-right': 'right-4 bottom-4 sm:right-6 sm:bottom-6',
    'bottom-left': 'left-4 bottom-4 sm:left-6 sm:bottom-6',
  };

  // Chat panel animation variants
  const chatVariants = {
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
              'rounded-2xl overflow-hidden',
              // Size - full screen on mobile, fixed size on desktop
              'fixed inset-4 sm:inset-auto',
              'sm:relative sm:w-96 sm:h-[32rem]'
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
                reducedMotion={reducedMotion}
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white truncate">{coachName}</h2>
                <p className="text-xs text-gray-400 truncate">{coachTitle}</p>
              </div>
              <button
                onClick={closeChat}
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
          /* Floating Action Button */
          <motion.button
            key="chat-fab"
            variants={reducedMotion ? {} : fabVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={toggleChat}
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
        )}
      </AnimatePresence>
    </div>
  );
}

// Named export for the hook
export { useAICoach } from './useAICoach';
