/**
 * Exercise Image Validator Service
 *
 * Two-stage AI validation for exercise image submissions:
 * 1. NSFW Detection - Block inappropriate content
 * 2. Exercise Verification - Check if image shows the correct exercise
 *
 * Uses existing nsfwjs integration + heuristic checks for exercise verification
 */

import { classifyImage, ModerationResult } from '../lib/nsfw-detector';
import { loggers } from '../lib/logger';
import sharp from 'sharp';

const log = loggers.api;

export interface ValidationResult {
  passed: boolean;
  nsfwScore: number;
  exerciseMatchScore: number;
  notes: string[];
  requiresManualReview: boolean;
  rejectionReason?: string;
  nsfwDetails?: ModerationResult;
}

// Thresholds for validation
const THRESHOLDS = {
  NSFW_BLOCK: 0.3,      // Block if any explicit class > 30%
  NSFW_REVIEW: 0.15,    // Flag for review if > 15%
  MIN_WIDTH: 200,       // Minimum image dimensions
  MIN_HEIGHT: 200,
  MIN_ASPECT_RATIO: 0.5, // Prevent super-narrow images
  MAX_ASPECT_RATIO: 2.0, // Prevent super-wide images
};

/**
 * Validate an exercise image submission
 */
export async function validateExerciseImage(
  imageBuffer: Buffer,
  exerciseName: string
): Promise<ValidationResult> {
  const notes: string[] = [];
  let requiresManualReview = false;
  let nsfwScore = 0;
  let exerciseMatchScore = 0;

  // Stage 1: Basic image validation
  const basicValidation = await validateBasicImageProperties(imageBuffer);
  if (!basicValidation.valid) {
    return {
      passed: false,
      nsfwScore: 0,
      exerciseMatchScore: 0,
      notes: [basicValidation.reason!],
      requiresManualReview: false,
      rejectionReason: basicValidation.reason,
    };
  }
  notes.push(...basicValidation.notes);

  // Stage 2: NSFW Detection
  let nsfwResult: ModerationResult;
  try {
    nsfwResult = await classifyImage(imageBuffer);
  } catch (error) {
    log.error({ error }, 'NSFW detection failed');
    // If NSFW detection fails, require manual review
    return {
      passed: false,
      nsfwScore: 0,
      exerciseMatchScore: 0.5,
      notes: ['NSFW detection unavailable - requires manual review'],
      requiresManualReview: true,
    };
  }

  // Calculate combined NSFW score (weighted average of concerning classes)
  const pornScore = nsfwResult.scores['Porn'] || 0;
  const hentaiScore = nsfwResult.scores['Hentai'] || 0;
  const sexyScore = nsfwResult.scores['Sexy'] || 0;
  nsfwScore = Math.max(pornScore, hentaiScore, sexyScore * 0.7);

  // Check NSFW thresholds
  if (nsfwResult.status === 'rejected') {
    return {
      passed: false,
      nsfwScore,
      exerciseMatchScore: 0,
      notes: [`Content rejected: ${nsfwResult.reason}`],
      requiresManualReview: false,
      rejectionReason: nsfwResult.reason,
      nsfwDetails: nsfwResult,
    };
  }

  if (pornScore > THRESHOLDS.NSFW_BLOCK || hentaiScore > THRESHOLDS.NSFW_BLOCK) {
    return {
      passed: false,
      nsfwScore,
      exerciseMatchScore: 0,
      notes: ['Explicit content detected'],
      requiresManualReview: false,
      rejectionReason: 'Explicit content detected',
      nsfwDetails: nsfwResult,
    };
  }

  if (sexyScore > 0.5) {
    notes.push('Image may contain suggestive content');
    requiresManualReview = true;
  }

  if (nsfwResult.status === 'review') {
    notes.push('NSFW detection flagged for review');
    requiresManualReview = true;
  } else {
    notes.push(`NSFW check passed (score: ${(nsfwScore * 100).toFixed(1)}%)`);
  }

  // Stage 3: Exercise Verification (heuristic-based)
  const exerciseVerification = await verifyExerciseContent(imageBuffer, exerciseName);
  exerciseMatchScore = exerciseVerification.score;
  notes.push(...exerciseVerification.notes);

  if (exerciseVerification.score < 0.3) {
    notes.push('Low confidence this shows the correct exercise');
    requiresManualReview = true;
  }

  // Final decision
  const passed = nsfwScore < THRESHOLDS.NSFW_REVIEW && exerciseMatchScore >= 0.3;

  return {
    passed: passed && !requiresManualReview,
    nsfwScore,
    exerciseMatchScore,
    notes,
    requiresManualReview,
    nsfwDetails: nsfwResult,
  };
}

/**
 * Validate basic image properties
 */
async function validateBasicImageProperties(
  imageBuffer: Buffer
): Promise<{ valid: boolean; reason?: string; notes: string[] }> {
  const notes: string[] = [];

  try {
    const metadata = await sharp(imageBuffer).metadata();

    // Check dimensions
    if (!metadata.width || !metadata.height) {
      return { valid: false, reason: 'Could not read image dimensions', notes };
    }

    if (metadata.width < THRESHOLDS.MIN_WIDTH || metadata.height < THRESHOLDS.MIN_HEIGHT) {
      return {
        valid: false,
        reason: `Image too small (${metadata.width}x${metadata.height}). Minimum is ${THRESHOLDS.MIN_WIDTH}x${THRESHOLDS.MIN_HEIGHT}`,
        notes,
      };
    }

    // Check aspect ratio
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio < THRESHOLDS.MIN_ASPECT_RATIO) {
      return {
        valid: false,
        reason: 'Image is too narrow. Please use a more standard aspect ratio.',
        notes,
      };
    }
    if (aspectRatio > THRESHOLDS.MAX_ASPECT_RATIO) {
      return {
        valid: false,
        reason: 'Image is too wide. Please use a more standard aspect ratio.',
        notes,
      };
    }

    notes.push(`Dimensions: ${metadata.width}x${metadata.height}, Format: ${metadata.format}`);

    // Check file size
    if (imageBuffer.length > 15 * 1024 * 1024) {
      return { valid: false, reason: 'Image file too large (max 15MB)', notes };
    }

    // Check format
    const allowedFormats = ['jpeg', 'png', 'webp', 'heif', 'heic'];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      return {
        valid: false,
        reason: `Unsupported format: ${metadata.format}. Use JPEG, PNG, or WebP.`,
        notes,
      };
    }

    return { valid: true, notes };
  } catch (_error) {
    return { valid: false, reason: 'Invalid or corrupted image file', notes };
  }
}

/**
 * Verify that the image appears to show exercise content
 *
 * This is a heuristic-based check. For more accurate verification,
 * we could integrate a vision API (like Claude's vision) to confirm
 * the image shows the specified exercise.
 */
async function verifyExerciseContent(
  imageBuffer: Buffer,
  _exerciseName: string
): Promise<{ score: number; notes: string[] }> {
  const notes: string[] = [];
  let score = 0.5; // Default neutral score

  try {
    const metadata = await sharp(imageBuffer).metadata();

    // Check for reasonable image characteristics for exercise photos

    // 1. Color images are more likely to be real photos
    if (metadata.channels && metadata.channels >= 3) {
      score += 0.1;
      notes.push('Color image detected');
    }

    // 2. Reasonable dimensions suggest a real photo (not an icon or meme)
    if (metadata.width && metadata.height) {
      const pixelCount = metadata.width * metadata.height;
      if (pixelCount >= 300 * 300) {
        score += 0.1;
        notes.push('Good resolution');
      }
      if (pixelCount >= 600 * 600) {
        score += 0.1;
        notes.push('High resolution');
      }
    }

    // 3. Check for common photo formats (JPEG suggests a camera photo)
    if (metadata.format === 'jpeg') {
      score += 0.05;
      notes.push('JPEG format (likely photo)');
    }

    // 4. Look at image statistics for photo-like characteristics
    const stats = await sharp(imageBuffer)
      .stats();

    // Photos typically have a reasonable range of colors (not flat)
    const avgStdDev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
    if (avgStdDev > 30) {
      score += 0.1;
      notes.push('Good color variation (photo-like)');
    } else if (avgStdDev < 15) {
      score -= 0.1;
      notes.push('Low color variation (may be graphic/icon)');
    }

    // Clamp score between 0 and 1
    score = Math.max(0, Math.min(1, score));

    notes.push(`Exercise match confidence: ${(score * 100).toFixed(0)}%`);

    // Note: For production, consider adding:
    // - Person detection to confirm human is in frame
    // - Pose estimation to verify exercise position
    // - OCR check to reject images with lots of text (memes)
    // - Claude Vision API to semantically verify exercise

  } catch (error) {
    log.warn({ error }, 'Exercise content verification failed');
    notes.push('Could not verify exercise content');
    score = 0.4;
  }

  return { score, notes };
}

/**
 * Quick check if image is likely safe (for preview before full upload)
 */
export async function quickSafetyCheck(imageBuffer: Buffer): Promise<{
  likelySafe: boolean;
  reason?: string;
}> {
  try {
    // Quick NSFW check
    const result = await classifyImage(imageBuffer);

    if (result.status === 'rejected') {
      return { likelySafe: false, reason: result.reason };
    }

    const pornScore = result.scores['Porn'] || 0;
    const hentaiScore = result.scores['Hentai'] || 0;

    if (pornScore > 0.2 || hentaiScore > 0.2) {
      return { likelySafe: false, reason: 'Content may not be appropriate' };
    }

    return { likelySafe: true };
  } catch {
    // If check fails, assume potentially unsafe
    return { likelySafe: false, reason: 'Could not verify image safety' };
  }
}
