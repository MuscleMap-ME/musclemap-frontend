/**
 * Messaging System Types
 */

export type ConversationType = 'direct' | 'group';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type ContentType = 'text' | 'image' | 'file';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'review';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string;
  muted: boolean;
  role: ParticipantRole;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  contentType: ContentType;
  replyToId?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  thumbnailPath?: string;
  moderationStatus: ModerationStatus;
  moderationResult?: string;
  moderationScores?: Record<string, number>;
  moderatedAt?: string;
  createdAt: string;
}

export interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

// API Request/Response types
export interface CreateConversationRequest {
  type?: ConversationType;
  name?: string;
  participantIds: string[];
}

export interface SendMessageRequest {
  content?: string;
  contentType?: ContentType;
  replyToId?: string;
}

export interface ConversationWithParticipants extends Conversation {
  participants: ConversationParticipant[];
  unreadCount?: number;
  lastMessage?: Message;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  attachments?: MessageAttachment[];
  replyTo?: Message;
}

// WebSocket event types
export interface WSMessageEvent {
  type: 'message.new' | 'message.edited' | 'message.deleted';
  conversationId: string;
  message: MessageWithSender;
}

export interface WSTypingEvent {
  type: 'typing.start' | 'typing.stop';
  conversationId: string;
  userId: string;
  username: string;
}

export interface WSPresenceEvent {
  type: 'presence.online' | 'presence.offline';
  userId: string;
}

export type WSEvent = WSMessageEvent | WSTypingEvent | WSPresenceEvent;
