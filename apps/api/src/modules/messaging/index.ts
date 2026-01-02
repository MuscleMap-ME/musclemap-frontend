/**
 * Messaging Module
 *
 * REST API endpoints for messaging with file upload support.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth';
import { asyncHandler, NotFoundError, ValidationError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { z } from 'zod';

import * as messageService from './message.service';
import * as uploadService from './upload.service';
import { broadcastNewMessage, broadcastMessageEdit, broadcastMessageDelete, isUserOnline } from './websocket';

const log = loggers.core;

// Request schemas
const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).optional(),
  name: z.string().max(100).optional(),
  participantIds: z.array(z.string()).min(1).max(50),
});

const sendMessageSchema = z.object({
  content: z.string().max(5000).optional(),
  contentType: z.enum(['text', 'image', 'file']).optional(),
  replyToId: z.string().optional(),
});

const editMessageSchema = z.object({
  content: z.string().max(5000).min(1),
});

export const messagingRouter = Router();

// All routes require authentication
messagingRouter.use(authenticateToken);

/**
 * GET /messaging/conversations
 * Get all conversations for the current user
 */
messagingRouter.get('/conversations', asyncHandler(async (req: Request, res: Response) => {
  const conversations = await messageService.getUserConversations(req.user!.userId);

  // Add online status for participants
  const conversationsWithStatus = conversations.map(conv => ({
    ...conv,
    participants: conv.participants.map(p => ({
      ...p,
      isOnline: isUserOnline(p.userId),
    })),
  }));

  res.json({ data: conversationsWithStatus });
}));

/**
 * POST /messaging/conversations
 * Create a new conversation
 */
messagingRouter.post('/conversations', asyncHandler(async (req: Request, res: Response) => {
  const validated = createConversationSchema.parse(req.body);

  const conversation = await messageService.createConversation(req.user!.userId, {
    type: validated.type,
    name: validated.name,
    participantIds: validated.participantIds,
  });

  res.status(201).json({ data: conversation });
}));

/**
 * GET /messaging/conversations/:id
 * Get a specific conversation
 */
messagingRouter.get('/conversations/:id', asyncHandler(async (req: Request, res: Response) => {
  const conversation = await messageService.getConversationWithDetails(req.params.id, req.user!.userId);

  if (!conversation) {
    throw new NotFoundError('Conversation');
  }

  // Add online status for participants
  const conversationWithStatus = {
    ...conversation,
    participants: conversation.participants.map(p => ({
      ...p,
      isOnline: isUserOnline(p.userId),
    })),
  };

  res.json({ data: conversationWithStatus });
}));

/**
 * GET /messaging/conversations/:id/messages
 * Get messages in a conversation (paginated)
 */
messagingRouter.get('/conversations/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const before = req.query.before as string | undefined;

  const messages = await messageService.getConversationMessages(
    req.params.id,
    req.user!.userId,
    { limit, before }
  );

  res.json({ data: messages });
}));

/**
 * POST /messaging/conversations/:id/messages
 * Send a message in a conversation
 */
messagingRouter.post('/conversations/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const validated = sendMessageSchema.parse(req.body);

  const message = await messageService.sendMessage(req.params.id, req.user!.userId, validated);

  // Broadcast to other participants via WebSocket
  broadcastNewMessage(req.params.id, message, req.user!.userId);

  res.status(201).json({ data: message });
}));

/**
 * PUT /messaging/messages/:id
 * Edit a message
 */
messagingRouter.put('/messages/:id', asyncHandler(async (req: Request, res: Response) => {
  const validated = editMessageSchema.parse(req.body);

  const message = await messageService.editMessage(req.params.id, req.user!.userId, validated.content);

  // Broadcast edit via WebSocket
  broadcastMessageEdit(message.conversationId, message, req.user!.userId);

  res.json({ data: message });
}));

/**
 * DELETE /messaging/messages/:id
 * Delete a message
 */
messagingRouter.delete('/messages/:id', asyncHandler(async (req: Request, res: Response) => {
  // Get message first to know the conversation
  const message = await messageService.getMessageWithSender(req.params.id);

  if (!message) {
    throw new NotFoundError('Message');
  }

  await messageService.deleteMessage(req.params.id, req.user!.userId);

  // Broadcast deletion via WebSocket
  broadcastMessageDelete(message.conversationId, req.params.id, req.user!.userId);

  res.status(204).send();
}));

/**
 * POST /messaging/conversations/:id/read
 * Mark conversation as read
 */
messagingRouter.post('/conversations/:id/read', asyncHandler(async (req: Request, res: Response) => {
  await messageService.markAsRead(req.params.id, req.user!.userId);
  res.status(204).send();
}));

/**
 * POST /messaging/block/:userId
 * Block a user
 */
messagingRouter.post('/block/:userId', asyncHandler(async (req: Request, res: Response) => {
  if (req.params.userId === req.user!.userId) {
    throw new ValidationError('Cannot block yourself');
  }

  await messageService.blockUser(req.user!.userId, req.params.userId);
  res.status(204).send();
}));

/**
 * DELETE /messaging/block/:userId
 * Unblock a user
 */
messagingRouter.delete('/block/:userId', asyncHandler(async (req: Request, res: Response) => {
  await messageService.unblockUser(req.user!.userId, req.params.userId);
  res.status(204).send();
}));

/**
 * GET /messaging/blocked
 * Get list of blocked users
 */
messagingRouter.get('/blocked', asyncHandler(async (req: Request, res: Response) => {
  const blockedIds = await messageService.getBlockedUsers(req.user!.userId);
  res.json({ data: blockedIds });
}));

/**
 * GET /messaging/attachments/:id
 * Get an attachment file
 */
messagingRouter.get('/attachments/:id', asyncHandler(async (req: Request, res: Response) => {
  const filePath = await uploadService.getAttachmentPath(req.params.id);

  if (!filePath) {
    throw new NotFoundError('Attachment');
  }

  res.sendFile(filePath, { root: process.cwd() });
}));

/**
 * GET /messaging/attachments/:id/thumbnail
 * Get attachment thumbnail
 */
messagingRouter.get('/attachments/:id/thumbnail', asyncHandler(async (req: Request, res: Response) => {
  const thumbnailPath = await uploadService.getThumbnailPath(req.params.id);

  if (!thumbnailPath) {
    throw new NotFoundError('Thumbnail');
  }

  res.sendFile(thumbnailPath, { root: process.cwd() });
}));

// Export services for use elsewhere
export { messageService, uploadService };
export { registerMessagingWebSocket } from './websocket';
export * from './types';
