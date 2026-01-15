/**
 * useAICoach Hook
 *
 * Manages chat state for the AI Training Partner.
 * Handles message history, typing indicators, and response generation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateResponse, getGreetingMessage, COACH_PERSONALITY } from './coachPersonality';

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  MOTIVATION: 'motivation',
  TIP: 'tip',
  RECOVERY: 'recovery',
  WORKOUT: 'workout',
  PROGRESS: 'progress',
  EXERCISE_CARD: 'exercise_card',
  ACTION: 'action',
};

// Quick action definitions
export const QUICK_ACTIONS = [
  { id: 'workout', label: "Today's workout", icon: '💪', query: "What workout should I do today?" },
  { id: 'motivate', label: 'Motivate me', icon: '🔥', query: "I need some motivation" },
  { id: 'form', label: 'Form tip', icon: '🎯', query: "Give me a form tip" },
  { id: 'progress', label: 'My progress', icon: '📊', query: "How's my progress?" },
];

// Create a unique message ID
function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * useAICoach - Main hook for AI Coach functionality
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.userContext - User data for personalization
 * @param {number} options.typingDelay - Simulated typing delay in ms
 * @returns {Object} Chat state and controls
 */
export function useAICoach(options = {}) {
  const {
    userContext = {},
    typingDelay = 800,
  } = options;

  // Chat state
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Refs for cleanup
  const typingTimeoutRef = useRef(null);
  const initializedRef = useRef(false);

  // Add a message from the coach
  const addCoachMessage = useCallback((messageData) => {
    const message = {
      id: generateId(),
      sender: 'coach',
      timestamp: new Date().toISOString(),
      coachName: COACH_PERSONALITY.name,
      ...messageData,
    };

    setMessages(prev => [...prev, message]);
    setIsTyping(false);

    // Set unread if chat is closed
    setHasUnread(prev => !isOpen ? true : prev);
  }, [isOpen]);

  // Initialize with greeting on first open
  useEffect(() => {
    if (isOpen && !initializedRef.current && messages.length === 0) {
      initializedRef.current = true;

      // Add welcome message after a brief delay
      setTimeout(() => {
        const greeting = getGreetingMessage(userContext.name || 'Athlete');
        addCoachMessage({
          type: MESSAGE_TYPES.TEXT,
          content: greeting,
          showQuickActions: true,
        });
      }, 300);
    }
  }, [isOpen, messages.length, userContext.name, addCoachMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Add a message from the user
  const addUserMessage = useCallback((content) => {
    const message = {
      id: generateId(),
      sender: 'user',
      type: MESSAGE_TYPES.TEXT,
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // Send a message and get a response
  const sendMessage = useCallback((content) => {
    if (!content.trim()) return;

    // Add user message
    addUserMessage(content);

    // Simulate typing
    setIsTyping(true);

    // Generate and add response after delay
    typingTimeoutRef.current = setTimeout(() => {
      const response = generateResponse(content, userContext);
      addCoachMessage(response);
    }, typingDelay + Math.random() * 500);
  }, [addUserMessage, addCoachMessage, typingDelay, userContext]);

  // Handle quick action
  const handleQuickAction = useCallback((actionId) => {
    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    if (action) {
      sendMessage(action.query);
    }
  }, [sendMessage]);

  // Toggle chat open/closed
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  // Open chat
  const openChat = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  // Close chat
  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    initializedRef.current = false;
  }, []);

  // Send a proactive message (for external triggers)
  const sendProactiveMessage = useCallback((messageData) => {
    addCoachMessage(messageData);
  }, [addCoachMessage]);

  return {
    // State
    messages,
    isTyping,
    isOpen,
    hasUnread,
    coachName: COACH_PERSONALITY.name,
    coachTitle: COACH_PERSONALITY.title,

    // Actions
    sendMessage,
    handleQuickAction,
    toggleChat,
    openChat,
    closeChat,
    clearChat,
    sendProactiveMessage,

    // Quick actions data
    quickActions: QUICK_ACTIONS,
  };
}

export default useAICoach;
