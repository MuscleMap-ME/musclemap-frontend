/**
 * E2EE File Storage Service
 *
 * Handles zero-storage file attachments:
 * - Files are encrypted client-side BEFORE upload
 * - Files are stored on external storage (Cloudflare R2)
 * - Server only stores encrypted metadata (cannot read content)
 * - Presigned URLs for direct client upload/download
 *
 * IMPORTANT: Server NEVER sees plaintext file content.
 * All encryption happens client-side.
 */

import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { FILE_LIMITS } from './crypto';

const log = loggers.api.child({ module: 'e2ee-file-storage' });

// ============================================
// CONFIGURATION
// ============================================

const R2_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucketName: process.env.R2_BUCKET_NAME || 'musclemap-encrypted-files',
  publicUrl: process.env.R2_PUBLIC_URL || '',
};

const FILE_CONFIG = {
  UPLOAD_URL_EXPIRATION_SECONDS: 3600, // 1 hour
  DOWNLOAD_URL_EXPIRATION_SECONDS: 3600, // 1 hour
  DEFAULT_EXPIRATION_DAYS: 30,
  MAX_EXPIRATION_DAYS: 90,
  MAX_UPLOADS_PER_DAY: 50,
  MAX_TOTAL_SIZE_PER_DAY_MB: 500,
};

// Initialize S3 client for R2
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
      // Return a mock client for development - will throw on actual use
      log.warn('R2 configuration missing - file uploads will fail');
      s3Client = new S3Client({
        region: 'auto',
        endpoint: 'https://mock.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'mock',
          secretAccessKey: 'mock',
        },
      });
    } else {
      s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_CONFIG.accessKeyId,
          secretAccessKey: R2_CONFIG.secretAccessKey,
        },
      });
    }
  }

  return s3Client;
}

// ============================================
// TYPES
// ============================================

export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  encryptedMetadata: string; // Base64 encoded encrypted metadata
  nsfwClassification?: string;
}

export interface FileUploadToken {
  token: string;
  uploadUrl: string;
  expiresAt: Date;
  maxSize: number;
}

export interface FileMetadata {
  id: string;
  uploaderId: string;
  encryptedMetadata: string;
  encryptedKey: string;
  mimeType: string;
  fileSize: number;
  contentHash: string;
  storageUrl: string;
  nsfwClassification: string;
  expiresAt: Date | null;
  createdAt: Date;
}

// ============================================
// SERVICE
// ============================================

export const fileStorageService = {
  /**
   * Request a presigned upload URL
   * Returns a token and URL for direct client-to-R2 upload
   */
  async requestUploadUrl(
    userId: string,
    request: FileUploadRequest
  ): Promise<FileUploadToken> {
    const { fileName, fileSize, mimeType, encryptedMetadata, nsfwClassification } = request;

    // Validate file size
    if (fileSize > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large. Maximum size is ${FILE_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }

    // Check rate limits
    const today = new Date().toISOString().split('T')[0];
    const stats = await queryOne<{ upload_count: string; total_size: string }>(
      `SELECT COUNT(*) as upload_count, COALESCE(SUM(file_size), 0) as total_size
       FROM encrypted_file_metadata
       WHERE uploader_id = $1 AND created_at::date = $2::date`,
      [userId, today]
    );

    const uploadCount = parseInt(stats?.upload_count || '0');
    const totalSize = parseInt(stats?.total_size || '0');

    if (uploadCount >= FILE_CONFIG.MAX_UPLOADS_PER_DAY) {
      throw new Error(`Rate limit exceeded: maximum ${FILE_CONFIG.MAX_UPLOADS_PER_DAY} uploads per day`);
    }

    if (totalSize + fileSize > FILE_CONFIG.MAX_TOTAL_SIZE_PER_DAY_MB * 1024 * 1024) {
      throw new Error(`Rate limit exceeded: maximum ${FILE_CONFIG.MAX_TOTAL_SIZE_PER_DAY_MB}MB per day`);
    }

    // Generate unique content ID
    const contentId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + FILE_CONFIG.UPLOAD_URL_EXPIRATION_SECONDS * 1000);

    // Store upload token
    await query(
      `INSERT INTO file_upload_tokens (
        id, user_id, token_hash, content_id, file_size,
        mime_type, encrypted_metadata, nsfw_classification,
        storage_provider, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [
        crypto.randomUUID(),
        userId,
        crypto.createHash('sha256').update(token).digest('hex'),
        contentId,
        fileSize,
        mimeType,
        encryptedMetadata,
        nsfwClassification || 'safe',
        'r2',
        expiresAt,
      ]
    );

    // Generate presigned upload URL
    const s3 = getS3Client();
    const key = `encrypted/${contentId}`;

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      ContentType: 'application/octet-stream', // Always binary (encrypted)
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: FILE_CONFIG.UPLOAD_URL_EXPIRATION_SECONDS,
    });

    log.info({ userId, contentId, fileSize, mimeType }, 'Generated upload URL');

    return {
      token,
      uploadUrl,
      expiresAt,
      maxSize: fileSize,
    };
  },

  /**
   * Confirm upload after client has uploaded to R2
   * Creates the file metadata record
   */
  async confirmUpload(
    userId: string,
    token: string,
    encryptedKey: string,
    contentHash: string
  ): Promise<FileMetadata> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find and validate token
    const uploadToken = await queryOne<{
      id: string;
      user_id: string;
      content_id: string;
      file_size: number;
      mime_type: string;
      encrypted_metadata: string;
      nsfw_classification: string;
      expires_at: Date;
      status: string;
    }>(
      `SELECT * FROM file_upload_tokens
       WHERE token_hash = $1 AND user_id = $2 AND status = 'pending'`,
      [tokenHash, userId]
    );

    if (!uploadToken) {
      throw new Error('Upload token not found or already used');
    }

    if (new Date() > uploadToken.expires_at) {
      throw new Error('Upload token expired');
    }

    // Mark token as used
    await query(
      `UPDATE file_upload_tokens SET status = 'completed' WHERE id = $1`,
      [uploadToken.id]
    );

    // Create file metadata record
    const fileId = crypto.randomUUID();
    const storageUrl = `r2://${R2_CONFIG.bucketName}/encrypted/${uploadToken.content_id}`;
    const expiresAt = new Date(Date.now() + FILE_CONFIG.DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO encrypted_file_metadata (
        id, uploader_id, encrypted_metadata, encrypted_key,
        mime_type, file_size, content_hash, storage_url,
        nsfw_classification, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        fileId,
        userId,
        uploadToken.encrypted_metadata,
        encryptedKey,
        uploadToken.mime_type,
        uploadToken.file_size,
        contentHash,
        storageUrl,
        uploadToken.nsfw_classification,
        expiresAt,
      ]
    );

    log.info({ fileId, userId, contentId: uploadToken.content_id }, 'Confirmed file upload');

    return {
      id: fileId,
      uploaderId: userId,
      encryptedMetadata: uploadToken.encrypted_metadata,
      encryptedKey,
      mimeType: uploadToken.mime_type,
      fileSize: uploadToken.file_size,
      contentHash,
      storageUrl,
      nsfwClassification: uploadToken.nsfw_classification,
      expiresAt,
      createdAt: new Date(),
    };
  },

  /**
   * Get presigned download URL for a file
   */
  async getDownloadUrl(fileId: string, userId: string): Promise<string> {
    // Get file metadata
    const file = await queryOne<{
      id: string;
      uploader_id: string;
      storage_url: string;
      nsfw_classification: string;
      expires_at: Date | null;
    }>(
      `SELECT * FROM encrypted_file_metadata WHERE id = $1`,
      [fileId]
    );

    if (!file) {
      throw new Error('File not found');
    }

    // Check if expired
    if (file.expires_at && new Date() > file.expires_at) {
      throw new Error('File has expired');
    }

    // For NSFW content, check user preferences
    if (file.nsfw_classification !== 'safe') {
      const prefs = await queryOne<{ adult_content_enabled: boolean; is_minor: boolean }>(
        `SELECT adult_content_enabled, is_minor FROM user_content_preferences WHERE user_id = $1`,
        [userId]
      );

      if (prefs?.is_minor) {
        throw new Error('This content is not available to minors');
      }

      if (!prefs?.adult_content_enabled && file.nsfw_classification !== 'suggestive') {
        throw new Error('Enable adult content in settings to view this file');
      }
    }

    // Extract content ID from storage URL
    // Format: r2://bucket/encrypted/{contentId}
    const contentId = file.storage_url.split('/').pop();
    if (!contentId) {
      throw new Error('Invalid storage URL');
    }

    // Generate presigned download URL
    const s3 = getS3Client();
    const key = `encrypted/${contentId}`;

    const command = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(s3, command, {
      expiresIn: FILE_CONFIG.DOWNLOAD_URL_EXPIRATION_SECONDS,
    });

    // Update access tracking
    await query(
      `UPDATE encrypted_file_metadata
       SET download_count = COALESCE(download_count, 0) + 1,
           last_downloaded_at = NOW()
       WHERE id = $1`,
      [fileId]
    );

    log.info({ fileId, userId }, 'Generated download URL');

    return downloadUrl;
  },

  /**
   * Delete a file (only uploader can delete)
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    // Get file and verify ownership
    const file = await queryOne<{
      id: string;
      uploader_id: string;
      storage_url: string;
    }>(
      `SELECT id, uploader_id, storage_url FROM encrypted_file_metadata WHERE id = $1`,
      [fileId]
    );

    if (!file) {
      throw new Error('File not found');
    }

    if (file.uploader_id !== userId) {
      throw new Error('Only the uploader can delete this file');
    }

    // Extract content ID from storage URL
    const contentId = file.storage_url.split('/').pop();

    if (contentId) {
      // Delete from R2
      const s3 = getS3Client();
      const key = `encrypted/${contentId}`;
      const command = new DeleteObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
      });

      try {
        await s3.send(command);
      } catch (error) {
        log.error({ fileId, error }, 'Failed to delete file from R2');
        // Continue to delete metadata even if R2 delete fails
      }
    }

    // Delete metadata
    await query(`DELETE FROM encrypted_file_metadata WHERE id = $1`, [fileId]);

    log.info({ fileId, userId }, 'Deleted encrypted file');
  },

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const file = await queryOne<{
      id: string;
      uploader_id: string;
      encrypted_metadata: string;
      encrypted_key: string;
      mime_type: string;
      file_size: number;
      content_hash: string;
      storage_url: string;
      nsfw_classification: string;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `SELECT * FROM encrypted_file_metadata WHERE id = $1`,
      [fileId]
    );

    if (!file) return null;

    return {
      id: file.id,
      uploaderId: file.uploader_id,
      encryptedMetadata: file.encrypted_metadata,
      encryptedKey: file.encrypted_key,
      mimeType: file.mime_type,
      fileSize: file.file_size,
      contentHash: file.content_hash,
      storageUrl: file.storage_url,
      nsfwClassification: file.nsfw_classification,
      expiresAt: file.expires_at,
      createdAt: file.created_at,
    };
  },

  /**
   * Cleanup expired files from R2
   */
  async cleanupExpiredFiles(): Promise<number> {
    const expiredFiles = await queryAll<{ id: string; storage_url: string }>(
      `SELECT id, storage_url FROM encrypted_file_metadata
       WHERE expires_at IS NOT NULL AND expires_at < NOW()
       LIMIT 100`
    );

    if (expiredFiles.length === 0) return 0;

    const s3 = getS3Client();
    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        const contentId = file.storage_url.split('/').pop();
        if (contentId) {
          const key = `encrypted/${contentId}`;
          const command = new DeleteObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: key,
          });
          await s3.send(command);
        }

        await query(`DELETE FROM encrypted_file_metadata WHERE id = $1`, [file.id]);
        deletedCount++;
      } catch (error) {
        log.error({ fileId: file.id, error }, 'Failed to delete expired file');
      }
    }

    if (deletedCount > 0) {
      log.info({ count: deletedCount }, 'Cleaned up expired files');
    }

    return deletedCount;
  },

  /**
   * Cleanup expired upload tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await query(
      `DELETE FROM file_upload_tokens
       WHERE expires_at < NOW() AND status = 'pending'`
    );

    return result.rowCount || 0;
  },
};

export default fileStorageService;
