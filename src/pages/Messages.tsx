import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store/authStore';
import { sanitizeText } from '../utils/sanitize';
import { GlassSurface } from '../components/glass/GlassSurface';
import { GlassNav, GlassSidebar, GlassMobileNav } from '../components/glass/GlassNav';
import { MeshBackground } from '../components/glass/MeshBackground';
import {
  CONVERSATIONS_QUERY,
  CONVERSATION_MESSAGES_QUERY,
  PINNED_MESSAGES_QUERY,
  TYPING_USERS_QUERY,
  USER_PRESENCE_QUERY,
  BLOCK_STATUS_QUERY,
  MESSAGE_TEMPLATES_QUERY,
  SCHEDULED_MESSAGES_QUERY,
  SEARCH_MESSAGES_QUERY,
  SEARCH_USERS_QUERY,
} from '../graphql/queries';
import {
  CREATE_CONVERSATION_MUTATION,
  SEND_MESSAGE_MUTATION,
  EDIT_MESSAGE_MUTATION,
  DELETE_MESSAGE_MUTATION,
  MARK_CONVERSATION_READ_MUTATION,
  PIN_MESSAGE_MUTATION,
  UNPIN_MESSAGE_MUTATION,
  ADD_REACTION_MUTATION,
  REMOVE_REACTION_MUTATION,
  SET_TYPING_STATUS_MUTATION,
  STAR_CONVERSATION_MUTATION,
  UNSTAR_CONVERSATION_MUTATION,
  ARCHIVE_CONVERSATION_MUTATION,
  UNARCHIVE_CONVERSATION_MUTATION,
  FORWARD_MESSAGE_MUTATION,
  SET_DISAPPEARING_MESSAGES_MUTATION,
  SCHEDULE_MESSAGE_MUTATION,
  CANCEL_SCHEDULED_MESSAGE_MUTATION,
  CREATE_MESSAGE_TEMPLATE_MUTATION,
  BLOCK_USER_MUTATION,
  UNBLOCK_USER_MUTATION,
} from '../graphql/mutations';

// ============================================
// HTML ENTITY DECODING UTILITY
// ============================================

/**
 * Decode HTML entities for display (e.g., &#x27; -> ')
 * DOMPurify encodes special characters for safety, but we need to decode for display
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// ============================================
// ICONS
// ============================================

const Icons = {
  Back: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7"/></svg>,
  Send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  More: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>,
  Archive: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>,
  Star: ({ filled }: { filled?: boolean }) => <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>,
  Block: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  Users: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Pin: ({ filled }: { filled?: boolean }) => <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>,
  Forward: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>,
  Reply: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
  Delete: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Check: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  CheckDouble: () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Template: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>,
  Timer: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Emoji: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Sticker: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v6a1 1 0 001 1h6"/></svg>,
  X: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Unarchive: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4l3 3m0 0l3-3m-3 3V8"/></svg>,
};

// ============================================
// TYPES
// ============================================

interface Participant {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  lastActiveAt?: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  display_name?: string;
  last_message?: string;
  last_activity_at?: string;
  unread_count: number;
  participants: Participant[];
  starred?: boolean;
  archived?: boolean;
  disappearing_ttl?: number;
  typing_users?: TypingUser[];
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  edited_at?: string;
  edit_count?: number;
  reactions?: Reaction[];
  pinned_at?: string;
  reply_to?: { id: string; content: string; sender_name: string };
  delivered_at?: string;
  read_at?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  userReacted: boolean;
}

interface TypingUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  shortcut?: string;
}

interface ScheduledMessage {
  id: string;
  content: string;
  scheduledFor: string;
  conversationId: string;
  conversationName?: string;
}

// GraphQL response types (camelCase from server)
interface GQLParticipant {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastActiveAt?: string | null;
}

interface GQLLastMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
}

interface GQLConversation {
  id: string;
  type: string;
  name?: string | null;
  participants: GQLParticipant[];
  lastMessage?: GQLLastMessage | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  starred?: boolean;
  archivedAt?: string | null;
  disappearingTtl?: number | null;
  typingUsers?: GQLTypingUser[];
  createdAt: string;
  updatedAt: string;
}

interface GQLTypingUser {
  userId: string;
  username: string;
  avatarUrl?: string | null;
}

interface GQLReplyTo {
  id: string;
  content: string;
  senderName: string;
}

interface GQLReaction {
  emoji: string;
  count: number;
  users: string[];
  userReacted: boolean;
}

interface GQLMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername?: string | null;
  senderDisplayName?: string | null;
  content: string;
  contentType?: string | null;
  replyTo?: GQLReplyTo | null;
  reactions?: GQLReaction[];
  pinnedAt?: string | null;
  editedAt?: string | null;
  editCount?: number | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

// ============================================
// CONSTANTS
// ============================================

const tabs = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'starred', label: 'Starred' },
  { id: 'archived', label: 'Archived' },
];

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

// Built-in stickers (emoji-based for universal compatibility)
const DEFAULT_STICKERS = [
  { id: 'flex', emoji: '💪', label: 'Flex' },
  { id: 'fire', emoji: '🔥', label: 'On Fire' },
  { id: 'trophy', emoji: '🏆', label: 'Winner' },
  { id: 'target', emoji: '🎯', label: 'Goal' },
  { id: 'rocket', emoji: '🚀', label: 'Gains' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'medal', emoji: '🥇', label: 'Champion' },
  { id: 'dumbbell', emoji: '🏋️', label: 'Workout' },
  { id: 'running', emoji: '🏃', label: 'Cardio' },
  { id: 'thumbsup', emoji: '👍', label: 'Nice' },
  { id: 'clap', emoji: '👏', label: 'Congrats' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'cool', emoji: '😎', label: 'Cool' },
  { id: 'strong', emoji: '🦾', label: 'Strong' },
  { id: 'lightning', emoji: '⚡', label: 'Power' },
];

const DISAPPEARING_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '24 hours' },
  { value: 604800, label: '7 days' },
  { value: 2592000, label: '30 days' },
];

// ============================================
// TYPING INDICATOR COMPONENT
// ============================================

function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (!users || users.length === 0) return null;

  const names = users.map(u => u.username).slice(0, 3);
  const text = names.length === 1
    ? `${names[0]} is typing...`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing...`
    : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400"
    >
      <div className="flex space-x-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="w-2 h-2 bg-violet-500 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
          className="w-2 h-2 bg-violet-500 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
          className="w-2 h-2 bg-violet-500 rounded-full"
        />
      </div>
      <span>{text}</span>
    </motion.div>
  );
}

// ============================================
// ONLINE STATUS INDICATOR
// ============================================

function OnlineStatus({ status, size = 'sm' }: { status: 'online' | 'away' | 'offline'; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const colors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  return (
    <span className={clsx(
      sizeClasses,
      'rounded-full ring-2 ring-[#0a0a0f]',
      colors[status]
    )} />
  );
}

// ============================================
// MESSAGE RECEIPT INDICATOR
// ============================================

function ReceiptIndicator({ status }: { status: Message['status'] }) {
  if (status === 'sending') {
    return <Icons.Clock />;
  }
  if (status === 'sent') {
    return <Icons.Check />;
  }
  if (status === 'delivered') {
    return (
      <span className="flex -space-x-1">
        <Icons.Check />
        <Icons.Check />
      </span>
    );
  }
  if (status === 'read') {
    return (
      <span className="flex -space-x-1 text-violet-400">
        <Icons.Check />
        <Icons.Check />
      </span>
    );
  }
  return null;
}

// ============================================
// REACTION PICKER
// ============================================

function ReactionPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-full mb-2 left-0 bg-[#1a1a24] border border-white/10 rounded-xl p-2 flex gap-1 shadow-xl z-50"
    >
      {COMMON_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-lg transition-colors"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}

// ============================================
// STICKER PICKER COMPONENT
// ============================================

function StickerPicker({ onSelect, onClose }: { onSelect: (sticker: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full mb-2 left-0 bg-[#1a1a24] border border-white/10 rounded-xl p-3 shadow-xl z-50 w-64"
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
        <span className="text-sm font-medium text-gray-300">Stickers</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <Icons.X />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {DEFAULT_STICKERS.map(sticker => (
          <button
            key={sticker.id}
            onClick={() => { onSelect(sticker.emoji); onClose(); }}
            className="w-12 h-12 flex flex-col items-center justify-center hover:bg-white/10 rounded-xl text-2xl transition-colors group"
            title={sticker.label}
          >
            <span>{sticker.emoji}</span>
            <span className="text-[8px] text-gray-500 group-hover:text-gray-300 mt-0.5 truncate w-full text-center">{sticker.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// MESSAGE ACTIONS MENU
// ============================================

function MessageActions({
  message: _message,
  isOwnMessage,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onReact,
  isPinned,
}: {
  message: Message;
  isOwnMessage: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onForward: () => void;
  onReact: () => void;
  isPinned: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className={clsx(
      'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
      isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
    )}>
      <AnimatePresence>
        {showReactions && (
          <ReactionPicker onSelect={onReact} onClose={() => setShowReactions(false)} />
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowReactions(!showReactions)}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        title="React"
      >
        <Icons.Emoji />
      </button>
      <button
        onClick={onReply}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        title="Reply"
      >
        <Icons.Reply />
      </button>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <Icons.More />
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={clsx(
                'absolute top-full mt-1 w-40 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden',
                isOwnMessage ? 'right-0' : 'left-0'
              )}
            >
              <button
                onClick={() => { onPin(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
              >
                <Icons.Pin filled={isPinned} />
                {isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={() => { onForward(); setShowMenu(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
              >
                <Icons.Forward />
                Forward
              </button>
              {isOwnMessage && (
                <>
                  <button
                    onClick={() => { onEdit(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                  >
                    <Icons.Edit />
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-red-400"
                  >
                    <Icons.Delete />
                    Delete
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// MESSAGE BUBBLE
// ============================================

function MessageBubble({
  message,
  isOwnMessage,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onReact,
  pinnedMessages,
  formatTime,
}: {
  message: Message;
  isOwnMessage: boolean;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: string) => void;
  onPin: (msgId: string) => void;
  onForward: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
  pinnedMessages: string[];
  formatTime: (date: string) => string;
}) {
  const isPinned = pinnedMessages.includes(message.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex group relative', isOwnMessage ? 'justify-end' : 'justify-start')}
    >
      <div className="relative">
        {/* Pinned indicator */}
        {isPinned && (
          <div className={clsx(
            'absolute -top-2 text-violet-400',
            isOwnMessage ? 'right-2' : 'left-2'
          )}>
            <Icons.Pin filled />
          </div>
        )}

        {/* Reply reference */}
        {message.reply_to && (
          <div className={clsx(
            'text-xs text-gray-500 mb-1 pl-2 border-l-2 border-gray-600 ml-2',
            isOwnMessage ? 'text-right mr-2' : ''
          )}>
            <span className="font-medium">{message.reply_to.sender_name}:</span>{' '}
            {message.reply_to.content.substring(0, 50)}...
          </div>
        )}

        {/* Message content */}
        <div className={clsx(
          'max-w-[75%] p-3 rounded-2xl',
          isOwnMessage
            ? 'bg-violet-600 rounded-br-md'
            : 'bg-white/10 rounded-bl-md',
          isPinned && 'ring-2 ring-violet-400/50'
        )}>
          {!isOwnMessage && (
            <div className="text-xs text-violet-400 mb-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{message.sender_name}</div>
          )}
          <p className="text-sm whitespace-pre-wrap" style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>{decodeHtmlEntities(message.content)}</p>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map(reaction => (
                <button
                  key={reaction.emoji}
                  onClick={() => onReact(message.id, reaction.emoji)}
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-xs flex items-center gap-1',
                    reaction.userReacted
                      ? 'bg-violet-500/30 border border-violet-500/50'
                      : 'bg-white/10 hover:bg-white/20'
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Footer: time, edited, receipts */}
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {message.edited_at && (
              <span className="text-xs text-white/40">edited</span>
            )}
            <span className="text-xs text-white/50">{formatTime(message.created_at)}</span>
            {isOwnMessage && (
              <span className="text-white/50">
                <ReceiptIndicator status={message.status || 'sent'} />
              </span>
            )}
          </div>
        </div>

        {/* Message actions */}
        <MessageActions
          message={message}
          isOwnMessage={isOwnMessage}
          onReply={() => onReply(message)}
          onEdit={() => onEdit(message)}
          onDelete={() => onDelete(message.id)}
          onPin={() => onPin(message.id)}
          onForward={() => onForward(message)}
          onReact={(emoji) => onReact(message.id, emoji)}
          isPinned={isPinned}
        />
      </div>
    </motion.div>
  );
}

// ============================================
// SEARCH MODAL
// ============================================

function SearchModal({
  isOpen,
  onClose,
  conversationId,
  onSelectMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  onSelectMessage: (msgId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, loading } = useQuery(SEARCH_MESSAGES_QUERY, {
    variables: { query: debouncedQuery, conversationId, limit: 50 },
    skip: debouncedQuery.length < 2 || !isOpen,
    fetchPolicy: 'cache-and-network',
  });

  const results = data?.searchMessages?.results || [];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Icons.Search />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent focus:outline-none"
              autoFocus
            />
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <Icons.X />
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {query.length < 2 ? 'Type to search...' : 'No results found'}
            </div>
          ) : (
            results.map(msg => (
              <button
                key={msg.id}
                onClick={() => { onSelectMessage(msg.id); onClose(); }}
                className="w-full p-4 text-left hover:bg-white/5 border-b border-white/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-violet-400">{msg.senderName}</span>
                  <span className="text-xs text-gray-500">{format(new Date(msg.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">{msg.content}</p>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// TEMPLATES MODAL
// ============================================

function TemplatesModal({
  isOpen,
  onClose,
  onUseTemplate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (content: string) => void;
}) {
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '', shortcut: '' });
  const [showNew, setShowNew] = useState(false);

  const { data, refetch } = useQuery(MESSAGE_TEMPLATES_QUERY, {
    skip: !isOpen,
    fetchPolicy: 'cache-and-network',
  });

  const templates: Template[] = data?.messageTemplates || [];

  const [createTemplateMutation] = useMutation(CREATE_MESSAGE_TEMPLATE_MUTATION);

  const createTemplate = async () => {
    try {
      await createTemplateMutation({
        variables: {
          name: newTemplate.name,
          content: newTemplate.content,
          shortcut: newTemplate.shortcut || null,
        },
      });
      refetch();
      setNewTemplate({ name: '', content: '', shortcut: '' });
      setShowNew(false);
    } catch {
      // Error
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Message Templates</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <Icons.X />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {showNew ? (
            <div className="space-y-3">
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Template name"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
              />
              <textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                placeholder="Template content..."
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 resize-none"
              />
              <input
                type="text"
                value={newTemplate.shortcut}
                onChange={(e) => setNewTemplate({ ...newTemplate, shortcut: e.target.value })}
                placeholder="Shortcut (e.g., /hello)"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={createTemplate}
                  disabled={!newTemplate.name || !newTemplate.content}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {templates.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Icons.Template />
                  <p className="mt-2">No templates yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { onUseTemplate(t.content); onClose(); }}
                      className="w-full p-3 text-left bg-white/5 hover:bg-white/10 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{t.name}</span>
                        {t.shortcut && (
                          <span className="text-xs text-violet-400 bg-violet-500/20 px-2 py-0.5 rounded">{t.shortcut}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">{t.content}</p>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowNew(true)}
                className="w-full mt-4 py-2 border border-dashed border-white/20 hover:border-white/40 rounded-xl text-gray-400 hover:text-white flex items-center justify-center gap-2"
              >
                <Icons.Plus />
                Create Template
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// SCHEDULED MESSAGES MODAL
// ============================================

function ScheduledMessagesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data, refetch } = useQuery(SCHEDULED_MESSAGES_QUERY, {
    skip: !isOpen,
    fetchPolicy: 'cache-and-network',
  });
  const scheduled: ScheduledMessage[] = data?.scheduledMessages || [];

  const [cancelScheduledMutation] = useMutation(CANCEL_SCHEDULED_MESSAGE_MUTATION);

  const cancelScheduled = async (id: string) => {
    try {
      await cancelScheduledMutation({ variables: { messageId: id } });
      refetch();
    } catch {
      // Error
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scheduled Messages</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <Icons.X />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {scheduled.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Icons.Clock />
              <p className="mt-2">No scheduled messages</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduled.map(msg => (
                <div key={msg.id} className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-violet-400">
                      {format(new Date(msg.scheduledFor), 'MMM d, yyyy h:mm a')}
                    </span>
                    <button
                      onClick={() => cancelScheduled(msg.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-sm line-clamp-2">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// CONVERSATION SETTINGS MODAL
// ============================================

function ConversationSettingsModal({
  isOpen,
  onClose,
  conversation,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onUpdate: (conv: Partial<Conversation>) => void;
}) {
  const [disappearingTtl, setDisappearingTtl] = useState(conversation.disappearing_ttl || 0);
  const [setDisappearingMutation] = useMutation(SET_DISAPPEARING_MESSAGES_MUTATION);

  const updateDisappearing = async () => {
    try {
      await setDisappearingMutation({
        variables: { conversationId: conversation.id, ttlSeconds: disappearingTtl }
      });
      onUpdate({ disappearing_ttl: disappearingTtl });
      onClose();
    } catch {
      // Error
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversation Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <Icons.X />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Disappearing Messages
            </label>
            <select
              value={disappearingTtl}
              onChange={(e) => setDisappearingTtl(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
            >
              {DISAPPEARING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Messages will automatically delete after this time period
            </p>
          </div>
          <button
            onClick={updateDisappearing}
            className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-xl"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// FORWARD MESSAGE MODAL
// ============================================

function ForwardModal({
  isOpen,
  onClose,
  message,
  conversations,
}: {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  conversations: Conversation[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [forwardMutation] = useMutation(FORWARD_MESSAGE_MUTATION);

  const forwardMessage = async () => {
    if (!message || selected.length === 0) return;
    try {
      await forwardMutation({
        variables: {
          messageId: message.id,
          toConversationIds: selected,
          addComment: comment || undefined
        }
      });
      onClose();
      setSelected([]);
      setComment('');
    } catch {
      // Error
    }
  };

  if (!isOpen || !message) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Forward Message</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <Icons.X />
          </button>
        </div>
        <div className="p-4">
          <div className="p-3 bg-white/5 rounded-xl mb-4">
            <p className="text-sm text-gray-300 line-clamp-3">{message.content}</p>
          </div>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 mb-4"
          />
          <p className="text-sm text-gray-400 mb-2">Select conversations:</p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {conversations.map(conv => (
              <label
                key={conv.id}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-xl cursor-pointer',
                  selected.includes(conv.id) ? 'bg-violet-500/20' : 'hover:bg-white/5'
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(conv.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, conv.id]);
                    } else {
                      setSelected(selected.filter(id => id !== conv.id));
                    }
                  }}
                  className="rounded border-white/20"
                />
                <span>{conv.display_name || conv.name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={forwardMessage}
            disabled={selected.length === 0}
            className="w-full mt-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl"
          >
            Forward to {selected.length} conversation{selected.length !== 1 ? 's' : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// SCHEDULE MESSAGE MODAL
// ============================================

function ScheduleMessageModal({
  isOpen,
  onClose,
  onSchedule,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: Date) => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSchedule = () => {
    if (!date || !time) return;
    const scheduledDate = new Date(`${date}T${time}`);
    if (scheduledDate > new Date()) {
      onSchedule(scheduledDate);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Schedule Message</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <Icons.X />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
            />
          </div>
          <button
            onClick={handleSchedule}
            disabled={!date || !time}
            className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl"
          >
            Schedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// PINNED MESSAGES PANEL
// ============================================

function PinnedMessagesPanel({
  isOpen,
  onClose,
  conversationId,
  onJumpToMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onJumpToMessage: (msgId: string) => void;
}) {
  const { data } = useQuery(PINNED_MESSAGES_QUERY, {
    variables: { conversationId },
    skip: !isOpen || !conversationId,
    fetchPolicy: 'cache-and-network',
  });
  const pinned: Message[] = data?.pinnedMessages || [];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute right-0 top-0 bottom-0 w-72 bg-[#12121a] border-l border-white/10 z-40"
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-medium">Pinned Messages</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
          <Icons.X />
        </button>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100%-60px)]">
        {pinned.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No pinned messages</p>
        ) : (
          pinned.map(msg => (
            <button
              key={msg.id}
              onClick={() => { onJumpToMessage(msg.id); onClose(); }}
              className="w-full p-3 text-left bg-white/5 hover:bg-white/10 rounded-xl"
            >
              <p className="text-sm line-clamp-2">{msg.content}</p>
              <span className="text-xs text-gray-500 mt-1 block">
                {format(new Date(msg.created_at), 'MMM d, h:mm a')}
              </span>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN MESSAGES COMPONENT
// ============================================

export default function Messages() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Core state
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');

  // UI state
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [sendError, setSendError] = useState('');

  // Enhanced features state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Modals
  const [showSearch, setShowSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // GRAPHQL QUERIES
  // ============================================

  // Conversations query
  const { data: conversationsData, loading: conversationsLoading, refetch: refetchConversations } = useQuery(
    CONVERSATIONS_QUERY,
    {
      variables: { tab: activeTab },
      fetchPolicy: 'cache-and-network',
      skip: !currentUserId,
    }
  );

  const conversations: Conversation[] = (conversationsData?.conversations || []).map((c: GQLConversation) => {
    const otherParticipant = c.participants?.find((p: GQLParticipant) => p.userId !== currentUserId);
    return {
      id: c.id,
      type: c.type as 'direct' | 'group',
      name: c.name ?? undefined,
      display_name: c.name || otherParticipant?.displayName || otherParticipant?.username || 'Unknown',
      last_message: c.lastMessage?.content,
      last_activity_at: c.lastMessageAt || c.createdAt,
      unread_count: c.unreadCount || 0,
      participants: c.participants?.map((p: GQLParticipant) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName ?? undefined,
        avatarUrl: p.avatarUrl ?? undefined,
        lastActiveAt: p.lastActiveAt ?? undefined,
      })) || [],
      starred: c.starred,
      archived: c.archivedAt !== null,
      disappearing_ttl: c.disappearingTtl ?? undefined,
      typing_users: c.typingUsers?.map((t: GQLTypingUser) => ({
        userId: t.userId,
        username: t.username,
        avatarUrl: t.avatarUrl ?? undefined,
      })) || [],
    };
  });

  // Messages query for active conversation
  const { data: messagesData, refetch: refetchMessages } = useQuery(
    CONVERSATION_MESSAGES_QUERY,
    {
      variables: { conversationId: activeConversation?.id },
      fetchPolicy: 'cache-and-network',
      skip: !activeConversation?.id,
      pollInterval: 3000, // Poll for new messages
    }
  );

  const messages: Message[] = (messagesData?.conversationMessages || []).map((m: GQLMessage) => ({
    id: m.id,
    content: m.content,
    sender_id: m.senderId === currentUserId ? 'me' : m.senderId,
    sender_name: m.senderId === currentUserId ? 'You' : (m.senderDisplayName || m.senderUsername || 'Unknown'),
    created_at: m.createdAt,
    edited_at: m.editedAt ?? undefined,
    edit_count: m.editCount ?? undefined,
    reactions: m.reactions?.map((r: GQLReaction) => ({
      emoji: r.emoji,
      count: r.count,
      users: r.users,
      userReacted: r.userReacted,
    })),
    pinned_at: m.pinnedAt ?? undefined,
    reply_to: m.replyTo ? { id: m.replyTo.id, content: m.replyTo.content, sender_name: m.replyTo.senderName } : undefined,
    status: m.readAt ? 'read' : m.deliveredAt ? 'delivered' : 'sent',
  }));

  const pinnedMessages = messages.filter(m => m.pinned_at).map(m => m.id);

  // Typing users query
  const { data: typingData } = useQuery(
    TYPING_USERS_QUERY,
    {
      variables: { conversationId: activeConversation?.id },
      skip: !activeConversation?.id,
      pollInterval: 2000,
    }
  );
  const typingUsers: TypingUser[] = typingData?.typingUsers || [];

  // Presence query for active conversation participants
  const participantIds = activeConversation?.participants
    ?.filter(p => p.userId !== currentUserId)
    .map(p => p.userId) || [];

  const { data: presenceData } = useQuery(
    USER_PRESENCE_QUERY,
    {
      variables: { userIds: participantIds },
      skip: participantIds.length === 0,
      pollInterval: 30000, // Poll less frequently
    }
  );

  const presenceMap: Record<string, 'online' | 'away' | 'offline'> = {};
  (presenceData?.userPresence || []).forEach((p: { userId: string; status: 'online' | 'away' | 'offline' }) => {
    presenceMap[p.userId] = p.status;
  });

  // Block status for 1:1 conversations
  const otherUserId = activeConversation?.type === 'direct'
    ? activeConversation.participants?.find(p => p.userId !== currentUserId)?.userId
    : null;

  const { data: blockData } = useQuery(
    BLOCK_STATUS_QUERY,
    {
      variables: { userId: otherUserId },
      skip: !otherUserId,
    }
  );
  const isBlocked = blockData?.blockStatus?.isBlocked || false;

  // User search for new chat
  const { data: userSearchData } = useQuery(
    SEARCH_USERS_QUERY,
    {
      variables: { query: searchUsers, limit: 10 },
      skip: searchUsers.length < 2,
    }
  );
  const userResults = userSearchData?.searchUsers || [];

  // ============================================
  // GRAPHQL MUTATIONS
  // ============================================

  const [createConversation] = useMutation(CREATE_CONVERSATION_MUTATION);
  const [sendMessageMutation] = useMutation(SEND_MESSAGE_MUTATION);
  const [editMessageMutation] = useMutation(EDIT_MESSAGE_MUTATION);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE_MUTATION);
  const [markConversationRead] = useMutation(MARK_CONVERSATION_READ_MUTATION);
  const [pinMessageMutation] = useMutation(PIN_MESSAGE_MUTATION);
  const [unpinMessageMutation] = useMutation(UNPIN_MESSAGE_MUTATION);
  const [addReactionMutation] = useMutation(ADD_REACTION_MUTATION);
  const [removeReactionMutation] = useMutation(REMOVE_REACTION_MUTATION);
  const [setTypingStatusMutation] = useMutation(SET_TYPING_STATUS_MUTATION);
  const [starConversationMutation] = useMutation(STAR_CONVERSATION_MUTATION);
  const [unstarConversationMutation] = useMutation(UNSTAR_CONVERSATION_MUTATION);
  const [archiveConversationMutation] = useMutation(ARCHIVE_CONVERSATION_MUTATION);
  const [unarchiveConversationMutation] = useMutation(UNARCHIVE_CONVERSATION_MUTATION);
  const [_forwardMessageMutation] = useMutation(FORWARD_MESSAGE_MUTATION);
  const [scheduleMessageMutation] = useMutation(SCHEDULE_MESSAGE_MUTATION);
  const [blockUserMutation] = useMutation(BLOCK_USER_MUTATION);
  const [unblockUserMutation] = useMutation(UNBLOCK_USER_MUTATION);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (activeConversation) {
      // Mark as read when opening conversation
      markConversationRead({ variables: { conversationId: activeConversation.id } }).catch(() => {});
    }
  }, [activeConversation, markConversationRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================
  // ACTIONS
  // ============================================

  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!activeConversation) return;
    try {
      await setTypingStatusMutation({
        variables: { conversationId: activeConversation.id, isTyping }
      });
    } catch {
      // Ignore errors
    }
  }, [activeConversation, setTypingStatusMutation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Send typing indicator
    sendTypingIndicator(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent, scheduledFor?: Date) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const messageContent = sanitizeText(newMessage);
    setSendError('');

    // Clear typing indicator
    sendTypingIndicator(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      if (scheduledFor) {
        // Schedule message
        await scheduleMessageMutation({
          variables: {
            conversationId: activeConversation.id,
            content: messageContent,
            scheduledFor: scheduledFor.toISOString(),
          }
        });
        setNewMessage('');
        setReplyingTo(null);
        return;
      }

      await sendMessageMutation({
        variables: {
          conversationId: activeConversation.id,
          content: messageContent,
          replyToId: replyingTo?.id,
        },
        refetchQueries: [
          { query: CONVERSATION_MESSAGES_QUERY, variables: { conversationId: activeConversation.id } },
          { query: CONVERSATIONS_QUERY, variables: { tab: activeTab } },
        ],
      });

      setNewMessage('');
      setReplyingTo(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(errorMessage);
      setTimeout(() => setSendError(''), 5000);
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessageMutation({
        variables: { messageId, content: newContent },
        refetchQueries: [
          { query: CONVERSATION_MESSAGES_QUERY, variables: { conversationId: activeConversation?.id } },
        ],
      });
      setEditingMessage(null);
    } catch {
      // Error
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await deleteMessageMutation({
        variables: { messageId },
        refetchQueries: [
          { query: CONVERSATION_MESSAGES_QUERY, variables: { conversationId: activeConversation?.id } },
        ],
      });
    } catch {
      // Error
    }
  };

  const togglePin = async (messageId: string) => {
    const isPinned = pinnedMessages.includes(messageId);
    try {
      if (isPinned) {
        await unpinMessageMutation({ variables: { messageId } });
      } else {
        await pinMessageMutation({ variables: { messageId } });
      }
      refetchMessages();
    } catch {
      // Error
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      const existingReaction = message?.reactions?.find(r => r.emoji === emoji);

      if (existingReaction?.userReacted) {
        await removeReactionMutation({ variables: { messageId, emoji } });
      } else {
        await addReactionMutation({ variables: { messageId, emoji } });
      }
      refetchMessages();
    } catch {
      // Error
    }
  };

  const toggleStar = async () => {
    if (!activeConversation) return;
    const isStarred = activeConversation.starred;
    try {
      if (isStarred) {
        await unstarConversationMutation({ variables: { conversationId: activeConversation.id } });
      } else {
        await starConversationMutation({ variables: { conversationId: activeConversation.id } });
      }
      setActiveConversation(prev => prev ? { ...prev, starred: !isStarred } : null);
      refetchConversations();
    } catch {
      // Error
    }
  };

  const toggleArchive = async () => {
    if (!activeConversation) return;
    const isArchived = activeConversation.archived;
    try {
      if (isArchived) {
        await unarchiveConversationMutation({ variables: { conversationId: activeConversation.id } });
      } else {
        await archiveConversationMutation({ variables: { conversationId: activeConversation.id } });
      }
      setActiveConversation(null);
      refetchConversations();
    } catch {
      // Error
    }
  };

  const startConversation = async (userId: string) => {
    try {
      const { data } = await createConversation({
        variables: { participantIds: [userId], type: 'direct' },
      });
      if (data?.createConversation?.id) {
        setShowNewChat(false);
        refetchConversations();
        // Set the new conversation as active
        setActiveConversation({
          id: data.createConversation.id,
          type: data.createConversation.type || 'direct',
          name: data.createConversation.name,
          display_name: data.createConversation.name || 'Unknown',
          unread_count: 0,
          participants: [],
        } as Conversation);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Cannot start conversation';
      setSendError(errorMessage);
      setTimeout(() => setSendError(''), 3000);
    }
  };

  const blockUser = async () => {
    if (!otherUserId) return;
    try {
      await blockUserMutation({ variables: { userId: otherUserId } });
      setShowMoreMenu(false);
    } catch {
      // Error
    }
  };

  const unblockUser = async () => {
    if (!otherUserId) return;
    try {
      await unblockUserMutation({ variables: { userId: otherUserId } });
      setShowMoreMenu(false);
    } catch {
      // Error
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return format(d, 'HH:mm');
    if (diff < 604800000) return format(d, 'EEE');
    return format(d, 'MMM d');
  };

  const getPresenceStatus = (userId: string): 'online' | 'away' | 'offline' => {
    return presenceMap[userId] || 'offline';
  };

  const loading = conversationsLoading;

  // Helper to refetch messages (available for subcomponents if needed)
  const _fetchMessages = useCallback((conversationId: string) => {
    if (conversationId === activeConversation?.id) {
      refetchMessages();
    }
  }, [activeConversation?.id, refetchMessages]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <MeshBackground />
      <GlassNav />
      <GlassSidebar />

      <main className="lg:pl-64 pt-16 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6 h-[calc(100vh-10rem)]">
            {/* Conversation List Panel */}
            <GlassSurface className={clsx(
              'w-full md:w-80 lg:w-96 flex flex-col overflow-hidden',
              activeConversation ? 'hidden md:flex' : 'flex'
            )}>
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
                      <Icons.Back />
                    </Link>
                    <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Messages</h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSearch(true)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                      title="Search messages"
                    >
                      <Icons.Search />
                    </button>
                    <button
                      onClick={() => setShowScheduled(true)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                      title="Scheduled messages"
                    >
                      <Icons.Clock />
                    </button>
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="p-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 transition-all border border-violet-500/30"
                      title="New message"
                    >
                      <Icons.Plus />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Icons.Search />
            </div>
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
            conversations
              .filter(conv => !searchQuery || (conv.display_name || conv.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
              .map(conv => {
                const otherParticipant = conv.participants?.find(p => p.userId !== currentUserId);
                const presence = otherParticipant ? getPresenceStatus(otherParticipant.userId) : 'offline';

                return (
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
                      <div className="relative">
                        <div className={clsx(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          conv.type === 'group' ? 'bg-violet-500/20' : 'bg-white/10'
                        )}>
                          {conv.type === 'group' ? <Icons.Users /> : <Icons.User />}
                        </div>
                        {conv.type === 'direct' && (
                          <span className="absolute -bottom-0.5 -right-0.5">
                            <OnlineStatus status={presence} />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{conv.display_name || conv.name || 'Unknown'}</span>
                            {conv.starred && <Icons.Star filled />}
                          </div>
                          <span className="text-xs text-gray-500">{conv.last_activity_at && formatTime(conv.last_activity_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {conv.typing_users && conv.typing_users.length > 0 ? (
                            <span className="text-sm text-violet-400 italic">typing...</span>
                          ) : (
                            <p className="text-sm text-gray-400 truncate">{conv.last_message || 'No messages yet'}</p>
                          )}
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-violet-500 text-xs font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
          )}
            </div>
          </GlassSurface>

          {/* Chat Area */}
          <GlassSurface className={clsx(
            'flex-1 flex flex-col overflow-hidden',
            !activeConversation ? 'hidden md:flex' : 'flex'
          )}>
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
                      <Icons.Back />
                    </button>
                    <div className="relative">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    activeConversation.type === 'group' ? 'bg-violet-500/20' : 'bg-white/10'
                  )}>
                    {activeConversation.type === 'group' ? <Icons.Users /> : <Icons.User />}
                  </div>
                  {activeConversation.type === 'direct' && (
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <OnlineStatus
                        status={getPresenceStatus(activeConversation.participants?.find(p => p.userId !== currentUserId)?.userId || '')}
                        size="md"
                      />
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-medium">{activeConversation.display_name || activeConversation.name}</h2>
                  <span className="text-xs text-gray-500">
                    {activeConversation.type === 'group'
                      ? `${activeConversation.participants?.length || 0} members`
                      : getPresenceStatus(activeConversation.participants?.find(p => p.userId !== currentUserId)?.userId || '') === 'online'
                        ? 'Online'
                        : activeConversation.participants?.find(p => p.userId !== currentUserId)?.lastActiveAt
                          ? `Last seen ${formatDistanceToNow(new Date(activeConversation.participants.find(p => p.userId !== currentUserId)!.lastActiveAt!))} ago`
                          : 'Offline'
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-xl hover:bg-white/5"
                  title="Search in conversation"
                >
                  <Icons.Search />
                </button>
                <button
                  onClick={() => setShowPinned(true)}
                  className="p-2 rounded-xl hover:bg-white/5"
                  title="Pinned messages"
                >
                  <Icons.Pin filled={pinnedMessages.length > 0} />
                </button>
                <button
                  onClick={toggleStar}
                  className={clsx('p-2 rounded-xl hover:bg-white/5', activeConversation.starred && 'text-yellow-400')}
                  title={activeConversation.starred ? 'Unstar' : 'Star'}
                >
                  <Icons.Star filled={activeConversation.starred} />
                </button>
                <button
                  onClick={toggleArchive}
                  className="p-2 rounded-xl hover:bg-white/5"
                  title={activeConversation.archived ? 'Unarchive' : 'Archive'}
                >
                  {activeConversation.archived ? <Icons.Unarchive /> : <Icons.Archive />}
                </button>
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-2 rounded-xl hover:bg-white/5"
                  >
                    <Icons.More />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={() => { setShowSettings(true); setShowMoreMenu(false); }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3"
                      >
                        <Icons.Settings />
                        Settings
                      </button>
                      {activeConversation.type === 'direct' && (
                        <button
                          onClick={isBlocked ? unblockUser : blockUser}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 text-red-400 hover:text-red-300"
                        >
                          <Icons.Block />
                          {isBlocked ? 'Unblock User' : 'Block User'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Blocked Warning */}
            {isBlocked && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm text-center">
                You have blocked this user. They cannot send you messages.
              </div>
            )}

            {/* Disappearing messages indicator */}
            {activeConversation.disappearing_ttl && activeConversation.disappearing_ttl > 0 && (
              <div className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20 text-violet-400 text-sm text-center flex items-center justify-center gap-2">
                <Icons.Timer />
                Disappearing messages: {DISAPPEARING_OPTIONS.find(o => o.value === activeConversation.disappearing_ttl)?.label || 'On'}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.sender_id === 'me'}
                  onReply={setReplyingTo}
                  onEdit={setEditingMessage}
                  onDelete={deleteMessage}
                  onPin={togglePin}
                  onForward={setForwardingMessage}
                  onReact={addReaction}
                  pinnedMessages={pinnedMessages}
                  formatTime={formatTime}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <TypingIndicator users={typingUsers} />
              )}
            </AnimatePresence>

            {/* Reply preview */}
            {replyingTo && (
              <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.Reply />
                  <div>
                    <span className="text-xs text-violet-400">Replying to {replyingTo.sender_name}</span>
                    <p className="text-sm text-gray-400 truncate max-w-xs">{replyingTo.content}</p>
                  </div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded">
                  <Icons.X />
                </button>
              </div>
            )}

            {/* Edit mode */}
            {editingMessage && (
              <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-yellow-400">Editing message</span>
                  <button onClick={() => setEditingMessage(null)} className="p-1 hover:bg-white/10 rounded">
                    <Icons.X />
                  </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); editMessage(editingMessage.id, newMessage); }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={editingMessage.content}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
                      autoFocus
                    />
                    <button type="submit" className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-xl">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Input */}
            {!editingMessage && (
              <form onSubmit={sendMessage} className="p-4 border-t border-white/5">
                {sendError && (
                  <div className="mb-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {sendError}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl"
                    title="Templates"
                  >
                    <Icons.Template />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStickerPicker(!showStickerPicker)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl"
                      title="Stickers"
                    >
                      <Icons.Sticker />
                    </button>
                    <AnimatePresence>
                      {showStickerPicker && (
                        <StickerPicker
                          onSelect={(sticker) => {
                            setNewMessage(prev => prev + sticker);
                            inputRef.current?.focus();
                          }}
                          onClose={() => setShowStickerPicker(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder="Type a message..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-xl"
                    title="Schedule"
                  >
                    <Icons.Clock />
                  </button>
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
                  >
                    <Icons.Send />
                  </button>
                </div>
                {/* Messaging is free */}
              </form>
            )}

            {/* Pinned messages panel */}
            <AnimatePresence>
              {showPinned && activeConversation && (
                <PinnedMessagesPanel
                  isOpen={showPinned}
                  onClose={() => setShowPinned(false)}
                  conversationId={activeConversation.id}
                  onJumpToMessage={(msgId) => {
                    const el = document.getElementById(`msg-${msgId}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-white/10">
                <Icons.User />
              </div>
              <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Select a conversation</h2>
              <p className="text-gray-400">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
            )}
          </GlassSurface>
        </div>
      </div>
    </main>

    <GlassMobileNav />

    {/* Modals */}
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
                  <Icons.X />
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

      <AnimatePresence>
        {showSearch && (
          <SearchModal
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            conversationId={activeConversation?.id}
            onSelectMessage={(msgId) => {
              const el = document.getElementById(`msg-${msgId}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTemplates && (
          <TemplatesModal
            isOpen={showTemplates}
            onClose={() => setShowTemplates(false)}
            onUseTemplate={(content) => setNewMessage(content)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduled && (
          <ScheduledMessagesModal
            isOpen={showScheduled}
            onClose={() => setShowScheduled(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && activeConversation && (
          <ConversationSettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            conversation={activeConversation}
            onUpdate={(updates) => {
              setActiveConversation(prev => prev ? { ...prev, ...updates } : null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleModal && (
          <ScheduleMessageModal
            isOpen={showScheduleModal}
            onClose={() => setShowScheduleModal(false)}
            onSchedule={(date) => {
              sendMessage({ preventDefault: () => {} } as React.FormEvent, date);
              setShowScheduleModal(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forwardingMessage && (
          <ForwardModal
            isOpen={!!forwardingMessage}
            onClose={() => setForwardingMessage(null)}
            message={forwardingMessage}
            conversations={conversations}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
