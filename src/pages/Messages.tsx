import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useAuth } from '../store/authStore';
import { sanitizeText } from '../utils/sanitize';

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  More: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>,
  Archive: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>,
  Star: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  Block: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
};

const tabs = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'starred', label: 'Starred' },
  { id: 'archived', label: 'Archived' },
];

export default function Messages() {
  const { token, user } = useAuth();
  const currentUserId = user?.id;
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [userResults, setUserResults] = useState([]);
  const messagesEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    if (!token || !currentUserId) return;
    try {
      const res = await fetch(`/api/messaging/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Map API response to expected format
      // For direct conversations, show the OTHER participant's name (not the current user)
      const convs = (data.data || []).map(c => {
        // Find the other participant (not the current user)
        const otherParticipant = c.participants?.find(p => p.userId !== currentUserId);
        return {
          id: c.id,
          type: c.type,
          name: c.name,
          display_name: c.name || otherParticipant?.displayName || otherParticipant?.username || 'Unknown',
          last_message: c.lastMessage?.content,
          last_activity_at: c.lastMessageAt || c.createdAt,
          unread_count: c.unreadCount || 0,
          participants: c.participants,
        };
      });
      // Filter by tab
      if (activeTab === 'starred') {
        setConversations(convs.filter(c => c.starred));
      } else if (activeTab === 'archived') {
        setConversations(convs.filter(c => c.archived));
      } else {
        setConversations(convs.filter(c => !c.archived));
      }
    } catch {
      // Error occurred
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, currentUserId]);

  const fetchMessages = useCallback(async (conversationId) => {
    if (!token || !currentUserId) return;
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Map API response to expected format
      // Use 'me' for current user's messages to match the UI logic
      const msgs = (data.data || []).map(m => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender?.id === currentUserId ? 'me' : m.sender?.id,
        sender_name: m.sender?.id === currentUserId ? 'You' : (m.sender?.displayName || m.sender?.username || 'Unknown'),
        created_at: m.createdAt,
      }));
      setMessages(msgs);
      // Mark as read
      fetch(`/api/messaging/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    } catch {
      // Error occurred
    }
  }, [token, currentUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversation) fetchMessages(activeConversation.id);
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const messageContent = sanitizeText(newMessage);

    try {
      // Sanitize message content before sending
      const res = await fetch(`/api/messaging/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: messageContent })
      });
      const data = await res.json();
      if (data.data) {
        const msg = data.data;
        // Add message to the messages list
        setMessages([...messages, {
          id: msg.id,
          content: msg.content,
          sender_id: 'me',
          sender_name: 'You',
          created_at: msg.createdAt
        }]);
        setNewMessage('');

        // Update the conversation list to show the last message
        setConversations(prev => prev.map(conv =>
          conv.id === activeConversation.id
            ? { ...conv, last_message: messageContent, last_activity_at: msg.createdAt }
            : conv
        ));

        // Update active conversation's last message
        setActiveConversation(prev => prev ? { ...prev, last_message: messageContent } : prev);
      }
    } catch {
      // Error occurred
    }
  };

  const searchForUsers = async (query) => {
    if (query.length < 2) return setUserResults([]);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUserResults(data.users || []);
    } catch {
      // Error occurred
    }
  };

  const startConversation = async (userId) => {
    try {
      const res = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'direct', participantIds: [userId] })
      });
      const data = await res.json();
      if (data.data?.id) {
        setShowNewChat(false);
        fetchConversations();
        setActiveConversation({ id: data.data.id, ...data.data });
      }
    } catch {
      // Error occurred
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return format(d, 'HH:mm');
    if (diff < 604800000) return format(d, 'EEE');
    return format(d, 'MMM d');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <div className={clsx(
        'w-full md:w-80 lg:w-96 border-r border-white/5 flex flex-col',
        activeConversation ? 'hidden md:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/5">
                <Icons.Back />
              </Link>
              <h1 className="text-xl font-semibold">Messages</h1>
            </div>
            <button onClick={() => setShowNewChat(true)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <Icons.Plus />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Icons.Search />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 text-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                  activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Icons.User />
              </div>
              <p className="text-gray-400">No conversations yet</p>
              <button onClick={() => setShowNewChat(true)} className="mt-4 px-4 py-2 bg-violet-600 rounded-xl text-sm font-medium hover:bg-violet-700 transition-all">
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map(conv => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setActiveConversation(conv)}
                className={clsx(
                  'p-4 border-b border-white/5 cursor-pointer transition-all',
                  activeConversation?.id === conv.id ? 'bg-white/5' : 'hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    conv.type === 'group' ? 'bg-violet-500/20' : 'bg-white/10'
                  )}>
                    {conv.type === 'group' ? <Icons.Users /> : <Icons.User />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{conv.display_name || conv.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500">{conv.last_activity_at && formatTime(conv.last_activity_at)}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{conv.last_message || 'No messages yet'}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-violet-500 text-xs font-bold flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={clsx(
        'flex-1 flex flex-col',
        !activeConversation ? 'hidden md:flex' : 'flex'
      )}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/5">
                  <Icons.Back />
                </button>
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  activeConversation.type === 'group' ? 'bg-violet-500/20' : 'bg-white/10'
                )}>
                  {activeConversation.type === 'group' ? <Icons.Users /> : <Icons.User />}
                </div>
                <div>
                  <h2 className="font-medium">{activeConversation.display_name || activeConversation.name}</h2>
                  <span className="text-xs text-gray-500">{activeConversation.type === 'group' ? 'Group' : 'Direct message'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl hover:bg-white/5"><Icons.Star /></button>
                <button className="p-2 rounded-xl hover:bg-white/5"><Icons.Archive /></button>
                <button className="p-2 rounded-xl hover:bg-white/5"><Icons.More /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx('flex', msg.sender_id === 'me' ? 'justify-end' : 'justify-start')}
                >
                  <div className={clsx(
                    'max-w-[75%] p-3 rounded-2xl',
                    msg.sender_id === 'me' 
                      ? 'bg-violet-600 rounded-br-md' 
                      : 'bg-white/10 rounded-bl-md'
                  )}>
                    {msg.sender_id !== 'me' && (
                      <div className="text-xs text-violet-400 mb-1">{msg.sender_name}</div>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <div className="text-xs text-white/50 mt-1 text-right">
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-white/5">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
                >
                  <Icons.Send />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">0.1 credits per recipient</p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Icons.User />
              </div>
              <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
              <p className="text-gray-400">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">New Message</h2>
                <button onClick={() => setShowNewChat(false)} className="p-2 rounded-xl hover:bg-white/5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={searchUsers}
                  onChange={(e) => { setSearchUsers(e.target.value); searchForUsers(e.target.value); }}
                  placeholder="Search for users..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
                />
                <div className="mt-4 max-h-64 overflow-y-auto">
                  {userResults.map(user => (
                    <div
                      key={user.id}
                      onClick={() => startConversation(user.id)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Icons.User />
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.city || 'MuscleMap User'}</div>
                      </div>
                    </div>
                  ))}
                  {searchUsers.length >= 2 && userResults.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No users found</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
