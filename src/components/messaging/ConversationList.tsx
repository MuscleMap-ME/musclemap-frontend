/**
 * ConversationList Component
 *
 * Displays list of conversations with unread counts and online status.
 */

import { useState, useEffect } from 'react';
import { authFetch } from '../../utils/auth';

export default function ConversationList({ onSelectConversation, selectedId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      const res = await authFetch('/api/messaging/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      const { data } = await res.json();
      setConversations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getDisplayName(conv) {
    if (conv.name) return conv.name;
    // For direct messages, show the other participant's name
    if (conv.type === 'direct' && conv.participants) {
      const other = conv.participants.find(p => p.userId !== conv.createdBy);
      return other?.displayName || other?.username || 'Unknown';
    }
    return 'Conversation';
  }

  function getLastMessagePreview(conv) {
    if (!conv.lastMessage) return 'No messages yet';
    const content = conv.lastMessage.content || '';
    if (conv.lastMessage.contentType === 'image') return '[Image]';
    if (conv.lastMessage.contentType === 'file') return '[File]';
    return content.length > 50 ? content.slice(0, 50) + '...' : content;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-400">Loading conversations...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400">{error}</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a new conversation to chat with others</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-700">
      {conversations.map(conv => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv)}
          className={`w-full p-4 text-left hover:bg-gray-700 transition-colors ${
            selectedId === conv.id ? 'bg-gray-700' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">
                  {getDisplayName(conv)}
                </span>
                {conv.type === 'group' && (
                  <span className="text-xs bg-gray-600 px-1.5 py-0.5 rounded">
                    Group
                  </span>
                )}
                {conv.participants?.some(p => p.isOnline && p.userId !== conv.createdBy) && (
                  <span className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                )}
              </div>
              <p className="text-sm text-gray-400 truncate mt-1">
                {getLastMessagePreview(conv)}
              </p>
            </div>
            <div className="flex flex-col items-end ml-2">
              <span className="text-xs text-gray-500">
                {formatTime(conv.lastMessageAt || conv.createdAt)}
              </span>
              {conv.unreadCount > 0 && (
                <span className="mt-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
