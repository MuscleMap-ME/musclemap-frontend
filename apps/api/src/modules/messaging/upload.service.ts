/**
 * Upload Service
 *
 * Handles file uploads with NSFWJS moderation for images.
 * Stores files locally with optional thumbnail generation.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { classifyImage, ModerationResult } from '../../lib/nsfw-detector';
import { ValidationError } from '../../lib/errors';
import { MessageAttachment, ModerationStatus } from './types';

const log = loggers.core;

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'text/plain',
  'application/json',
];

// Ensure upload directories exist
async function ensureUploadDirs(): Promise<void> {
  const dirs = [
    path.join(UPLOAD_DIR, 'messages'),
    path.join(UPLOAD_DIR, 'thumbnails'),
    path.join(UPLOAD_DIR, 'rejected'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Initialize on first use
let initialized = false;
async function init(): Promise<void> {
  if (initialized) return;
  await ensureUploadDirs();
  initialized = true;
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Process and store an uploaded file
 */
export async function processUpload(
  messageId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<MessageAttachment> {
  await init();

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    throw new ValidationError(`File type not allowed: ${mimeType}`);
  }

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new ValidationError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const attachmentId = generateId('att');
  const ext = path.extname(fileName) || getExtensionFromMime(mimeType);
  const storageName = `${attachmentId}${ext}`;
  const storagePath = path.join(UPLOAD_DIR, 'messages', storageName);

  let moderationStatus: ModerationStatus = 'approved';
  let moderationResult: string | undefined;
  let moderationScores: Record<string, number> | undefined;
  let thumbnailPath: string | undefined;

  // Process images with NSFWJS
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    try {
      log.info({ attachmentId, mimeType, size: fileBuffer.length }, 'Processing image for moderation');

      const modResult = await classifyImage(fileBuffer);

      moderationStatus = modResult.status;
      moderationResult = modResult.reason;
      moderationScores = modResult.scores;

      log.info({
        attachmentId,
        status: modResult.status,
        processingTimeMs: modResult.processingTimeMs,
      }, 'Image moderation complete');

      // If rejected, store in rejected folder for review
      if (modResult.status === 'rejected') {
        const rejectedPath = path.join(UPLOAD_DIR, 'rejected', storageName);
        await fs.writeFile(rejectedPath, fileBuffer);

        // Don't store the file in regular uploads
        return saveAttachmentRecord({
          id: attachmentId,
          messageId,
          fileName,
          fileType: mimeType,
          fileSize: fileBuffer.length,
          storagePath: rejectedPath,
          moderationStatus,
          moderationResult,
          moderationScores,
        });
      }

      // Generate thumbnail for approved images
      if (modResult.status === 'approved') {
        thumbnailPath = await generateThumbnail(fileBuffer, attachmentId, ext);
      }
    } catch (error) {
      log.warn({ error, attachmentId }, 'Moderation failed, marking for review');
      moderationStatus = 'review';
      moderationResult = 'Moderation service unavailable';
    }
  }

  // Store the file
  await fs.writeFile(storagePath, fileBuffer);

  // Save to database
  return saveAttachmentRecord({
    id: attachmentId,
    messageId,
    fileName,
    fileType: mimeType,
    fileSize: fileBuffer.length,
    storagePath,
    thumbnailPath,
    moderationStatus,
    moderationResult,
    moderationScores,
  });
}

/**
 * Generate a thumbnail for an image
 */
async function generateThumbnail(
  imageBuffer: Buffer,
  attachmentId: string,
  ext: string
): Promise<string | undefined> {
  try {
    const sharp = await import('sharp');
    const thumbnailName = `${attachmentId}_thumb${ext}`;
    const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', thumbnailName);

    await sharp.default(imageBuffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  } catch (error) {
    log.warn({ error, attachmentId }, 'Failed to generate thumbnail');
    return undefined;
  }
}

/**
 * Save attachment record to database
 */
function saveAttachmentRecord(attachment: {
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
}): MessageAttachment {
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO message_attachments (
      id, message_id, file_name, file_type, file_size,
      storage_path, thumbnail_path, moderation_status,
      moderation_result, moderation_scores, moderated_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attachment.id,
    attachment.messageId,
    attachment.fileName,
    attachment.fileType,
    attachment.fileSize,
    attachment.storagePath,
    attachment.thumbnailPath || null,
    attachment.moderationStatus,
    attachment.moderationResult || null,
    attachment.moderationScores ? JSON.stringify(attachment.moderationScores) : null,
    now,
    now
  );

  return {
    id: attachment.id,
    messageId: attachment.messageId,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    storagePath: attachment.storagePath,
    thumbnailPath: attachment.thumbnailPath,
    moderationStatus: attachment.moderationStatus,
    moderationResult: attachment.moderationResult,
    moderationScores: attachment.moderationScores,
    moderatedAt: now,
    createdAt: now,
  };
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/json': '.json',
  };

  return mimeToExt[mimeType] || '';
}

/**
 * Get attachment file path for serving
 */
export function getAttachmentPath(attachmentId: string): string | null {
  const attachment = db.prepare(`
    SELECT storage_path, moderation_status FROM message_attachments WHERE id = ?
  `).get(attachmentId) as any;

  if (!attachment) {
    return null;
  }

  // Don't serve rejected content
  if (attachment.moderation_status === 'rejected') {
    return null;
  }

  return attachment.storage_path;
}

/**
 * Get thumbnail path for serving
 */
export function getThumbnailPath(attachmentId: string): string | null {
  const attachment = db.prepare(`
    SELECT thumbnail_path, moderation_status FROM message_attachments WHERE id = ?
  `).get(attachmentId) as any;

  if (!attachment || !attachment.thumbnail_path) {
    return null;
  }

  // Don't serve rejected content
  if (attachment.moderation_status === 'rejected') {
    return null;
  }

  return attachment.thumbnail_path;
}

/**
 * Delete attachment files
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const attachment = db.prepare(`
    SELECT storage_path, thumbnail_path FROM message_attachments WHERE id = ?
  `).get(attachmentId) as any;

  if (!attachment) {
    return;
  }

  // Delete files
  try {
    await fs.unlink(attachment.storage_path);
    if (attachment.thumbnail_path) {
      await fs.unlink(attachment.thumbnail_path);
    }
  } catch (error) {
    log.warn({ error, attachmentId }, 'Failed to delete attachment files');
  }

  // Delete database record
  db.prepare(`DELETE FROM message_attachments WHERE id = ?`).run(attachmentId);
}

/**
 * Update moderation status (for manual review)
 */
export function updateModerationStatus(
  attachmentId: string,
  status: ModerationStatus,
  result?: string
): void {
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE message_attachments
    SET moderation_status = ?, moderation_result = ?, moderated_at = ?
    WHERE id = ?
  `).run(status, result || null, now, attachmentId);

  log.info({ attachmentId, status, result }, 'Moderation status updated');
}

/**
 * Get attachments pending review
 */
export function getPendingReviewAttachments(): MessageAttachment[] {
  const rows = db.prepare(`
    SELECT * FROM message_attachments
    WHERE moderation_status = 'review'
    ORDER BY created_at ASC
  `).all() as any[];

  return rows.map(row => ({
    id: row.id,
    messageId: row.message_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    moderationStatus: row.moderation_status,
    moderationResult: row.moderation_result,
    moderationScores: row.moderation_scores ? JSON.parse(row.moderation_scores) : undefined,
    moderatedAt: row.moderated_at,
    createdAt: row.created_at,
  }));
}
