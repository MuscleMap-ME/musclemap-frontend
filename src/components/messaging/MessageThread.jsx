/**
 * MessageThread Component
 *
 * Displays messages in a conversation with real-time updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch, getToken, getUser } from '../../utils/auth';

export default function MessageThread({ conversation, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUser = getUser();

  // Load messages
  useEffect(() => {
    if (!conversation) return;
    loadMessages();
    connectWebSocket();
    markAsRead();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [conversation?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      setLoading(true);
      const res = await authFetch(`/api/messaging/conversations/${conversation.id}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const { data } = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  function connectWebSocket() {
    const token = getToken();
    if (!token) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/messages?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Subscribe to this conversation
        ws.send(JSON.stringify({
          type: 'subscribe',
          conversationIds: [conversation.id],
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWSMessage(data);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        // Reconnect after delay
        setTimeout(() => {
          if (conversation) connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  }

  function handleWSMessage(data) {
    switch (data.type) {
      case 'message.new':
        if (data.conversationId === conversation.id) {
          setMessages(prev => [...prev, data.message]);
          markAsRead();
        }
        break;

      case 'message.edited':
        if (data.conversationId === conversation.id) {
          setMessages(prev =>
            prev.map(m => m.id === data.message.id ? data.message : m)
          );
        }
        break;

      case 'message.deleted':
        if (data.conversationId === conversation.id) {
          setMessages(prev =>
            prev.filter(m => m.id !== data.message.id)
          );
        }
        break;

      case 'typing.start':
        if (data.conversationId === conversation.id && data.userId !== currentUser?.id) {
          setTypingUsers(prev => {
            if (prev.includes(data.username)) return prev;
            return [...prev, data.username];
          });
        }
        break;

      case 'typing.stop':
        if (data.conversationId === conversation.id) {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
        break;
    }
  }

  async function markAsRead() {
    try {
      await authFetch(`/api/messaging/conversations/${conversation.id}/read`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  function handleTyping() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Send typing start
    wsRef.current.send(JSON.stringify({
      type: 'typing.start',
      conversationId: conversation.id,
    }));

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing stop after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'typing.stop',
          conversationId: conversation.id,
        }));
      }
    }, 2000);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const res = await authFetch(`/api/messaging/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      setNewMessage('');

      // Stop typing indicator
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'typing.stop',
          conversationId: conversation.id,
        }));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  }

  // Group messages by date
  function groupMessagesByDate(msgs) {
    const groups = [];
    let currentDate = null;
    let currentMessages = [];

    for (const msg of msgs) {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        if (currentMessages.length > 0) {
          groups.push({ date: currentDate, messages: currentMessages });
        }
        currentDate = msgDate;
        currentMessages = [msg];
      } else {
        currentMessages.push(msg);
      }
    }

    if (currentMessages.length > 0) {
      groups.push({ date: currentDate, messages: currentMessages });
    }

    return groups;
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation to start chatting
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-gray-700 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="font-semibold text-white">
            {conversation.name || 'Conversation'}
          </h2>
          <p className="text-xs text-gray-400">
            {conversation.participants?.length || 0} participants
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messageGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              <div className="text-center text-xs text-gray-500 my-4">
                {formatDate(group.messages[0].createdAt)}
              </div>
              {group.messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.senderId === currentUser?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {msg.senderId !== currentUser?.id && (
                      <p className="text-xs text-gray-300 mb-1">
                        {msg.sender?.displayName || msg.sender?.username}
                      </p>
                    )}
                    <p className="break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.senderId === currentUser?.id ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.createdAt)}
                      {msg.editedAt && ' (edited)'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-400 italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
