/**
 * Messaging WebSocket Handlers
 *
 * Real-time messaging with Redis pub/sub for multi-server support.
 */

import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { verifyToken, JwtPayload } from '../auth';
import { loggers } from '../../lib/logger';
import { getRedis, isRedisAvailable, REDIS_KEYS } from '../../lib/redis';
import { WSEvent, WSMessageEvent, WSTypingEvent, WSPresenceEvent } from './types';
import * as messageService from './message.service';

const log = loggers.core;

// Track connected clients by user ID
const userConnections = new Map<string, Set<WebSocket>>();

// Track which conversations each connection is subscribed to
const connectionSubscriptions = new Map<WebSocket, Set<string>>();

// Redis channel for messaging events
const CHANNEL_MESSAGES = 'musclemap:messages';

/**
 * Register messaging WebSocket routes
 */
export async function registerMessagingWebSocket(app: FastifyInstance): Promise<void> {
  // Subscribe to Redis channel if available
  if (isRedisAvailable()) {
    const redis = getRedis();
    const subscriber = redis.duplicate();

    await subscriber.subscribe(CHANNEL_MESSAGES);

    subscriber.on('message', (channel, message) => {
      if (channel === CHANNEL_MESSAGES) {
        try {
          const event = JSON.parse(message) as WSEvent & { targetUserIds?: string[] };
          broadcastToUsers(event.targetUserIds || [], event);
        } catch (error) {
          log.error({ error }, 'Failed to parse Redis message');
        }
      }
    });

    log.info('Messaging WebSocket subscribed to Redis channel');
  }

  // WebSocket route
  app.get('/ws/messages', { websocket: true }, (socket, req) => {
    const ws = socket as unknown as WebSocket;

    // Authenticate via query param token
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    let user: JwtPayload;
    try {
      user = verifyToken(token);
    } catch (error) {
      ws.close(4001, 'Invalid token');
      return;
    }

    // Track connection
    if (!userConnections.has(user.userId)) {
      userConnections.set(user.userId, new Set());
    }
    userConnections.get(user.userId)!.add(ws);
    connectionSubscriptions.set(ws, new Set());

    log.info({ userId: user.userId }, 'User connected to messaging WebSocket');

    // Broadcast online presence
    broadcastPresence(user.userId, 'online');

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, user, message);
      } catch (error) {
        log.warn({ error }, 'Invalid WebSocket message format');
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      // Remove from user connections
      const connections = userConnections.get(user.userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(user.userId);
          // Broadcast offline when last connection closes
          broadcastPresence(user.userId, 'offline');
        }
      }

      // Clean up subscriptions
      connectionSubscriptions.delete(ws);

      log.info({ userId: user.userId }, 'User disconnected from messaging WebSocket');
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      userId: user.userId,
    }));
  });

  log.info('Messaging WebSocket route registered: /ws/messages');
}

/**
 * Handle client messages
 */
function handleClientMessage(
  ws: WebSocket,
  user: JwtPayload,
  message: { type: string; [key: string]: any }
): void {
  switch (message.type) {
    case 'subscribe':
      handleSubscribe(ws, user, message.conversationIds);
      break;

    case 'unsubscribe':
      handleUnsubscribe(ws, message.conversationIds);
      break;

    case 'typing.start':
      handleTyping(user, message.conversationId, true);
      break;

    case 'typing.stop':
      handleTyping(user, message.conversationId, false);
      break;

    case 'mark_read':
      handleMarkRead(user, message.conversationId);
      break;

    default:
      log.warn({ type: message.type }, 'Unknown WebSocket message type');
  }
}

/**
 * Subscribe to conversation updates
 */
function handleSubscribe(ws: WebSocket, user: JwtPayload, conversationIds: string[]): void {
  if (!Array.isArray(conversationIds)) return;

  const subscriptions = connectionSubscriptions.get(ws);
  if (!subscriptions) return;

  for (const conversationId of conversationIds) {
    // Verify user is a participant
    const conversation = messageService.getConversationWithDetails(conversationId, user.userId);
    if (conversation) {
      subscriptions.add(conversationId);
    }
  }

  ws.send(JSON.stringify({
    type: 'subscribed',
    conversationIds: Array.from(subscriptions),
  }));
}

/**
 * Unsubscribe from conversation updates
 */
function handleUnsubscribe(ws: WebSocket, conversationIds: string[]): void {
  if (!Array.isArray(conversationIds)) return;

  const subscriptions = connectionSubscriptions.get(ws);
  if (!subscriptions) return;

  for (const conversationId of conversationIds) {
    subscriptions.delete(conversationId);
  }
}

/**
 * Handle typing indicator
 */
function handleTyping(user: JwtPayload, conversationId: string, isTyping: boolean): void {
  // Get participants in the conversation (excluding the typer)
  const conversation = messageService.getConversationWithDetails(conversationId, user.userId);
  if (!conversation) return;

  const targetUserIds = conversation.participants
    .filter(p => p.userId !== user.userId)
    .map(p => p.userId);

  const event: WSTypingEvent & { targetUserIds: string[]; conversationId: string } = {
    type: isTyping ? 'typing.start' : 'typing.stop',
    conversationId,
    userId: user.userId,
    username: user.email.split('@')[0], // Use email prefix as fallback
    targetUserIds,
  };

  broadcastEvent(event);
}

/**
 * Handle mark as read
 */
function handleMarkRead(user: JwtPayload, conversationId: string): void {
  messageService.markAsRead(conversationId, user.userId);
}

/**
 * Broadcast presence change
 */
function broadcastPresence(userId: string, status: 'online' | 'offline'): void {
  // Get all conversations the user is part of
  const conversations = messageService.getUserConversations(userId);

  // Collect all unique participant user IDs
  const targetUserIds = new Set<string>();
  for (const conv of conversations) {
    for (const p of conv.participants) {
      if (p.userId !== userId) {
        targetUserIds.add(p.userId);
      }
    }
  }

  const event: WSPresenceEvent & { targetUserIds: string[] } = {
    type: status === 'online' ? 'presence.online' : 'presence.offline',
    userId,
    targetUserIds: Array.from(targetUserIds),
  };

  broadcastEvent(event);
}

/**
 * Broadcast a new message to conversation participants
 */
export function broadcastNewMessage(
  conversationId: string,
  message: any,
  senderUserId: string
): void {
  const conversation = messageService.getConversationWithDetails(conversationId, senderUserId);
  if (!conversation) return;

  const targetUserIds = conversation.participants.map(p => p.userId);

  const event: WSMessageEvent & { targetUserIds: string[] } = {
    type: 'message.new',
    conversationId,
    message,
    targetUserIds,
  };

  broadcastEvent(event);
}

/**
 * Broadcast message edit
 */
export function broadcastMessageEdit(
  conversationId: string,
  message: any,
  senderUserId: string
): void {
  const conversation = messageService.getConversationWithDetails(conversationId, senderUserId);
  if (!conversation) return;

  const targetUserIds = conversation.participants.map(p => p.userId);

  const event: WSMessageEvent & { targetUserIds: string[] } = {
    type: 'message.edited',
    conversationId,
    message,
    targetUserIds,
  };

  broadcastEvent(event);
}

/**
 * Broadcast message deletion
 */
export function broadcastMessageDelete(
  conversationId: string,
  messageId: string,
  senderUserId: string
): void {
  const conversation = messageService.getConversationWithDetails(conversationId, senderUserId);
  if (!conversation) return;

  const targetUserIds = conversation.participants.map(p => p.userId);

  const event: WSMessageEvent & { targetUserIds: string[] } = {
    type: 'message.deleted',
    conversationId,
    message: { id: messageId } as any,
    targetUserIds,
  };

  broadcastEvent(event);
}

/**
 * Broadcast event to target users
 */
function broadcastEvent(event: WSEvent & { targetUserIds: string[] }): void {
  if (isRedisAvailable()) {
    // Publish to Redis for multi-server support
    const redis = getRedis();
    redis.publish(CHANNEL_MESSAGES, JSON.stringify(event));
  } else {
    // Direct broadcast for single-server mode
    broadcastToUsers(event.targetUserIds, event);
  }
}

/**
 * Send event to specific users
 */
function broadcastToUsers(userIds: string[], event: WSEvent): void {
  const payload = JSON.stringify(event);

  for (const userId of userIds) {
    const connections = userConnections.get(userId);
    if (!connections) continue;

    for (const ws of connections) {
      // Check if subscribed to this conversation (for conversation-specific events)
      if ('conversationId' in event) {
        const subscriptions = connectionSubscriptions.get(ws);
        if (subscriptions && !subscriptions.has(event.conversationId)) {
          continue;
        }
      }

      try {
        ws.send(payload);
      } catch (error) {
        log.warn({ error, userId }, 'Failed to send WebSocket message');
      }
    }
  }
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: string): boolean {
  return userConnections.has(userId) && userConnections.get(userId)!.size > 0;
}

/**
 * Get online users from a list
 */
export function getOnlineUsers(userIds: string[]): string[] {
  return userIds.filter(id => isUserOnline(id));
}
