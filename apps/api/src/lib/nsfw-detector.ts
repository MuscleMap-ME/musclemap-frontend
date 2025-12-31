/**
 * NSFW Image Detection Service
 *
 * Uses NSFWJS to classify images and detect inappropriate content.
 * Supports lazy loading of the TensorFlow model to reduce startup time.
 */

import { loggers } from './logger';

const log = loggers.core;

// Classification thresholds
const THRESHOLDS = {
  BLOCK: 0.7,    // Block if any NSFW class exceeds this
  WARN: 0.4,     // Flag for review if any NSFW class exceeds this
  SAFE: 0.6,     // Consider safe if "Neutral" or "Drawing" exceeds this
};

// NSFWJS prediction classes
interface NSFWPrediction {
  className: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy';
  probability: number;
}

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'review';
  reason?: string;
  scores: Record<string, number>;
  blockedClass?: string;
  processingTimeMs: number;
}

// Lazy-loaded model instance
let nsfwModel: any = null;
let modelLoading: Promise<any> | null = null;

/**
 * Load the NSFWJS model (lazy, singleton)
 */
async function loadModel(): Promise<any> {
  if (nsfwModel) return nsfwModel;

  if (modelLoading) return modelLoading;

  modelLoading = (async () => {
    try {
      log.info('Loading NSFWJS model...');
      const startTime = Date.now();

      // Dynamic imports to avoid loading TensorFlow at startup
      const tf = await import('@tensorflow/tfjs-node');
      const nsfwjs = await import('nsfwjs');

      // Use the default model (MobileNetV2)
      nsfwModel = await nsfwjs.load();

      const loadTime = Date.now() - startTime;
      log.info({ loadTimeMs: loadTime }, 'NSFWJS model loaded');

      return nsfwModel;
    } catch (error) {
      log.error({ error }, 'Failed to load NSFWJS model');
      modelLoading = null;
      throw error;
    }
  })();

  return modelLoading;
}

/**
 * Classify an image buffer for NSFW content
 */
export async function classifyImage(imageBuffer: Buffer): Promise<ModerationResult> {
  const startTime = Date.now();

  try {
    // Load model if needed
    const model = await loadModel();

    // Dynamic import for TensorFlow
    const tf = await import('@tensorflow/tfjs-node');

    // Decode image to tensor
    let imageTensor;
    try {
      imageTensor = tf.node.decodeImage(imageBuffer, 3);
    } catch (decodeError) {
      log.warn({ error: decodeError }, 'Failed to decode image, may be unsupported format');
      return {
        status: 'review',
        reason: 'Could not decode image for moderation',
        scores: {},
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Classify the image
    const predictions: NSFWPrediction[] = await model.classify(imageTensor);

    // Dispose tensor to free memory
    imageTensor.dispose();

    // Convert predictions to scores object
    const scores: Record<string, number> = {};
    for (const pred of predictions) {
      scores[pred.className] = pred.probability;
    }

    // Determine moderation result
    const result = evaluatePredictions(predictions, scores, startTime);

    log.info({
      status: result.status,
      scores,
      processingTimeMs: result.processingTimeMs,
    }, 'Image moderation complete');

    return result;
  } catch (error) {
    log.error({ error }, 'Error during image classification');

    return {
      status: 'review',
      reason: 'Moderation service error',
      scores: {},
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Evaluate NSFWJS predictions and determine moderation status
 */
function evaluatePredictions(
  predictions: NSFWPrediction[],
  scores: Record<string, number>,
  startTime: number
): ModerationResult {
  const processingTimeMs = Date.now() - startTime;

  // Check for explicit content (Porn, Hentai)
  const pornScore = scores['Porn'] || 0;
  const hentaiScore = scores['Hentai'] || 0;

  if (pornScore >= THRESHOLDS.BLOCK) {
    return {
      status: 'rejected',
      reason: 'Explicit content detected',
      blockedClass: 'Porn',
      scores,
      processingTimeMs,
    };
  }

  if (hentaiScore >= THRESHOLDS.BLOCK) {
    return {
      status: 'rejected',
      reason: 'Explicit animated content detected',
      blockedClass: 'Hentai',
      scores,
      processingTimeMs,
    };
  }

  // Check for suggestive content
  const sexyScore = scores['Sexy'] || 0;

  if (sexyScore >= THRESHOLDS.BLOCK) {
    return {
      status: 'rejected',
      reason: 'Suggestive content detected',
      blockedClass: 'Sexy',
      scores,
      processingTimeMs,
    };
  }

  // Flag for review if any NSFW class is borderline
  if (
    pornScore >= THRESHOLDS.WARN ||
    hentaiScore >= THRESHOLDS.WARN ||
    sexyScore >= THRESHOLDS.WARN
  ) {
    return {
      status: 'review',
      reason: 'Content requires manual review',
      scores,
      processingTimeMs,
    };
  }

  // Check if clearly safe
  const neutralScore = scores['Neutral'] || 0;
  const drawingScore = scores['Drawing'] || 0;

  if (neutralScore >= THRESHOLDS.SAFE || drawingScore >= THRESHOLDS.SAFE) {
    return {
      status: 'approved',
      scores,
      processingTimeMs,
    };
  }

  // Default to approved if no concerning content found
  return {
    status: 'approved',
    scores,
    processingTimeMs,
  };
}

/**
 * Check if the NSFW detector is available
 */
export async function isNSFWDetectorAvailable(): Promise<boolean> {
  try {
    await loadModel();
    return true;
  } catch {
    return false;
  }
}

/**
 * Preload the model (call during server startup)
 */
export async function preloadModel(): Promise<void> {
  try {
    await loadModel();
  } catch (error) {
    log.warn({ error }, 'Failed to preload NSFWJS model, will retry on first use');
  }
}
