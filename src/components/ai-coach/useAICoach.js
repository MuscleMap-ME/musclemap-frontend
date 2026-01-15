/**
 * useAICoach Hook
 *
 * Manages chat state for the AI Training Partner.
 * Handles message history, typing indicators, and response generation.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { generateResponse, getGreetingMessage } from './coachPersonality';
import { AVATAR_PERSONALITIES } from './CoachAvatar';

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
  { id: 'workout', label: "Today's workout", icon: '\uD83D\uDCAA', query: "What workout should I do today?" },
  { id: 'motivate', label: 'Motivate me', icon: '\uD83D\uDD25', query: "I need some motivation" },
  { id: 'chest', label: 'Chest exercises', icon: '\uD83E\uDDB5', query: "Give me some chest exercises" },
  { id: 'progress', label: "How's my progress?", icon: '\uD83D\uDCCA', query: "How's my progress?" },
  { id: 'rest', label: 'Rest day tips', icon: '\uD83E\uDDD8', query: "Give me some rest day tips" },
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
 * @param {string} options.avatarPersonality - Avatar personality (flex, spark, zen)
 * @param {number} options.typingDelay - Simulated typing delay in ms
 * @returns {Object} Chat state and controls
 */
export function useAICoach(options = {}) {
  const {
    userContext = {},
    avatarPersonality = 'flex',
    typingDelay = 800,
  } = options;

  // Get coach name and title based on personality
  const coachConfig = useMemo(() => {
    const personality = AVATAR_PERSONALITIES[avatarPersonality] || AVATAR_PERSONALITIES.flex;
    return {
      name: personality.name,
      title: personality.title,
    };
  }, [avatarPersonality]);

  // Load messages from localStorage
  const loadSavedMessages = useCallback(() => {
    try {
      const saved = localStorage.getItem('musclemap_ai_coach_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only return messages from the last 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return parsed.filter(m => new Date(m.timestamp).getTime() > oneDayAgo);
      }
    } catch (e) {
      console.warn('Failed to load AI coach chat history:', e);
    }
    return [];
  }, []);

  // Chat state - initialize from localStorage
  const [messages, setMessages] = useState(loadSavedMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Keep only last 50 messages
        const toSave = messages.slice(-50);
        localStorage.setItem('musclemap_ai_coach_history', JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save AI coach chat history:', e);
      }
    }
  }, [messages]);

  // Refs for cleanup
  const typingTimeoutRef = useRef(null);
  const initializedRef = useRef(false);

  // Add a message from the coach
  const addCoachMessage = useCallback((messageData) => {
    const message = {
      id: generateId(),
      sender: 'coach',
      timestamp: new Date().toISOString(),
      coachName: coachConfig.name,
      ...messageData,
    };

    setMessages(prev => [...prev, message]);
    setIsTyping(false);

    // Set unread if chat is closed
    setHasUnread(prev => !isOpen ? true : prev);
  }, [isOpen, coachConfig.name]);

  // Track if messages were loaded from storage
  const loadedFromStorageRef = useRef(messages.length > 0);

  // Initialize with greeting on first open (only if no stored messages)
  useEffect(() => {
    if (isOpen && !initializedRef.current && messages.length === 0 && !loadedFromStorageRef.current) {
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
    } else if (isOpen && !initializedRef.current && messages.length > 0) {
      // Mark as initialized if there are stored messages
      initializedRef.current = true;
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
    try {
      localStorage.removeItem('musclemap_ai_coach_history');
    } catch (e) {
      console.warn('Failed to clear AI coach chat history:', e);
    }
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
    coachName: coachConfig.name,
    coachTitle: coachConfig.title,

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
