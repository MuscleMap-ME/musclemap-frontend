/**
 * Image Processing Service
 *
 * Processes uploaded exercise images for consistency:
 * - Resize to standard dimensions
 * - Convert to WebP format
 * - Generate thumbnails
 * - Strip EXIF metadata for privacy
 */

import sharp from 'sharp';
import { loggers } from '../lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const log = loggers.api;

// Image processing constants
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 150;
const WEBP_QUALITY = 85;

export interface ProcessedImage {
  processedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  format: 'webp';
  originalSize: number;
  processedSize: number;
  thumbnailSize: number;
}

export interface SavedImage {
  originalUrl: string;
  processedUrl: string;
  thumbnailUrl: string;
  filename: string;
}

/**
 * Process an exercise image for upload
 * - Resizes to max 800x600 maintaining aspect ratio
 * - Converts to WebP format
 * - Strips EXIF metadata
 * - Generates a thumbnail
 */
export async function processExerciseImage(buffer: Buffer): Promise<ProcessedImage> {
  const originalSize = buffer.length;

  // Get image metadata
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  // Process main image
  const processed = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  // Generate thumbnail
  const thumbnail = await sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 75 })
    .toBuffer({ resolveWithObject: true });

  log.info(`Image processed: ${originalSize} → ${processed.info.size} bytes (${Math.round((1 - processed.info.size / originalSize) * 100)}% reduction)`);

  return {
    processedBuffer: processed.data,
    thumbnailBuffer: thumbnail.data,
    width: processed.info.width,
    height: processed.info.height,
    thumbnailWidth: thumbnail.info.width,
    thumbnailHeight: thumbnail.info.height,
    format: 'webp',
    originalSize,
    processedSize: processed.info.size,
    thumbnailSize: thumbnail.info.size,
  };
}

/**
 * Validate image before processing
 */
export async function validateImage(buffer: Buffer): Promise<{ valid: boolean; error?: string }> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Check format
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'heif', 'heic'];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      return { valid: false, error: `Invalid format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}` };
    }

    // Check dimensions (minimum 200x200)
    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Could not read image dimensions' };
    }
    if (metadata.width < 200 || metadata.height < 200) {
      return { valid: false, error: 'Image too small. Minimum size is 200x200 pixels' };
    }

    // Check file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return { valid: false, error: 'Image too large. Maximum size is 10MB' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Invalid image file' };
  }
}

/**
 * Generate a unique filename for the image
 */
export function generateFilename(exerciseId: string, userId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${exerciseId}_${userId}_${timestamp}_${random}`;
}

/**
 * Get the upload directory path
 */
export function getUploadDir(): string {
  const baseDir = process.env.UPLOAD_DIR || '/var/www/musclemap.me/uploads';
  return path.join(baseDir, 'exercise-images');
}

/**
 * Ensure upload directories exist
 */
export async function ensureUploadDirs(): Promise<void> {
  const baseDir = getUploadDir();
  const dirs = [
    baseDir,
    path.join(baseDir, 'originals'),
    path.join(baseDir, 'processed'),
    path.join(baseDir, 'thumbnails'),
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Save processed images to disk
 */
export async function saveImages(
  originalBuffer: Buffer,
  processedImage: ProcessedImage,
  filename: string
): Promise<SavedImage> {
  await ensureUploadDirs();
  const baseDir = getUploadDir();

  // Save original
  const originalPath = path.join(baseDir, 'originals', `${filename}.original`);
  await fs.writeFile(originalPath, originalBuffer);

  // Save processed
  const processedPath = path.join(baseDir, 'processed', `${filename}.webp`);
  await fs.writeFile(processedPath, processedImage.processedBuffer);

  // Save thumbnail
  const thumbnailPath = path.join(baseDir, 'thumbnails', `${filename}_thumb.webp`);
  await fs.writeFile(thumbnailPath, processedImage.thumbnailBuffer);

  // Generate URLs (relative to web root)
  const urlBase = '/uploads/exercise-images';

  return {
    originalUrl: `${urlBase}/originals/${filename}.original`,
    processedUrl: `${urlBase}/processed/${filename}.webp`,
    thumbnailUrl: `${urlBase}/thumbnails/${filename}_thumb.webp`,
    filename,
  };
}

/**
 * Delete images from disk
 */
export async function deleteImages(filename: string): Promise<void> {
  const baseDir = getUploadDir();

  const paths = [
    path.join(baseDir, 'originals', `${filename}.original`),
    path.join(baseDir, 'processed', `${filename}.webp`),
    path.join(baseDir, 'thumbnails', `${filename}_thumb.webp`),
  ];

  for (const filePath of paths) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // Ignore if file doesn't exist
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.error(`Failed to delete ${filePath}:`, err);
      }
    }
  }
}

/**
 * Get image info from file
 */
export async function getImageInfo(filePath: string): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
} | null> {
  try {
    const buffer = await fs.readFile(filePath);
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
    };
  } catch {
    return null;
  }
}
