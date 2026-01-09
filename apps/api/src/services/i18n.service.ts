/**
 * Internationalization Service
 *
 * Manages translations for:
 * - UI strings (static, loaded at startup)
 * - User-generated content (dynamic, on-demand)
 * - Content caching with Redis
 */

import { queryOne, queryAll, query } from '../db/client';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { loggers } from '../lib/logger';
import { config } from '../config';

const log = loggers.core;

// Supported languages (26 languages as specified)
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'sv', 'da', 'fi',
  'pl', 'cs', 'ro', 'hu', 'tr', 'el', 'ru', 'uk', 'he', 'ar',
  'hi', 'th', 'vi', 'ja', 'ko', 'zh-Hans',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// RTL languages
export const RTL_LANGUAGES = ['he', 'ar'] as const;

// Cache settings
const TRANSLATION_CACHE_TTL = 3600; // 1 hour
const TRANSLATION_CACHE_PREFIX = 'i18n:';

/**
 * Map our language codes to LibreTranslate/standard codes
 */
function mapLanguageCode(lang: string): string {
  const mapping: Record<string, string> = {
    'pt-BR': 'pt',
    'zh-Hans': 'zh',
  };
  return mapping[lang] || lang;
}

/**
 * Call external translation API (LibreTranslate compatible)
 */
async function callTranslationAPI(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string | null> {
  if (!config.TRANSLATION_ENABLED || !config.TRANSLATION_API_URL) {
    return null;
  }

  try {
    const body: Record<string, string> = {
      q: text,
      source: mapLanguageCode(sourceLang),
      target: mapLanguageCode(targetLang),
      format: 'text',
    };

    // Add API key if configured
    if (config.TRANSLATION_API_KEY) {
      body.api_key = config.TRANSLATION_API_KEY;
    }

    const response = await fetch(config.TRANSLATION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      log.warn({ status: response.status, sourceLang, targetLang }, 'Translation API returned error');
      return null;
    }

    const result = await response.json() as { translatedText?: string };
    return result.translatedText ?? null;
  } catch (error) {
    log.error({ error, sourceLang, targetLang }, 'Translation API call failed');
    return null;
  }
}

/**
 * Call translation API for batch of texts
 */
async function callBatchTranslationAPI(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<(string | null)[]> {
  if (!config.TRANSLATION_ENABLED || !config.TRANSLATION_API_URL) {
    return texts.map(() => null);
  }

  // LibreTranslate doesn't support batch, so translate in parallel
  const results = await Promise.all(
    texts.map(text => callTranslationAPI(text, sourceLang, targetLang))
  );

  return results;
}

interface TranslationRequest {
  contentType: string;
  contentId: string;
  fieldName: string;
  originalText: string;
  sourceLang: SupportedLanguage;
  targetLang: SupportedLanguage;
}

interface Translation {
  translatedText: string;
  isMachineTranslated: boolean;
  isHumanCorrected: boolean;
  confidenceScore?: number;
}

interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  enabled: boolean;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Check if a language is RTL
 */
export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as typeof RTL_LANGUAGES[number]);
}

/**
 * Normalize language code
 */
export function normalizeLanguageCode(lang: string): SupportedLanguage {
  const normalized = lang.toLowerCase().replace('_', '-');

  // Direct match
  if (isLanguageSupported(normalized)) {
    return normalized;
  }

  // Try without region
  const base = normalized.split('-')[0];
  if (isLanguageSupported(base)) {
    return base;
  }

  // Portuguese defaults to Brazilian
  if (base === 'pt') {
    return 'pt-BR';
  }

  // Chinese defaults to Simplified
  if (base === 'zh') {
    return 'zh-Hans';
  }

  // Default to English
  return 'en';
}

export const i18nService = {
  /**
   * Get all supported languages
   */
  async getLanguages(): Promise<LanguageInfo[]> {
    const rows = await queryAll<{
      code: string;
      name: string;
      native_name: string;
      rtl: boolean;
      enabled: boolean;
    }>('SELECT code, name, native_name, rtl, enabled FROM supported_languages ORDER BY name');

    // If table doesn't exist or is empty, return default list
    if (rows.length === 0) {
      return SUPPORTED_LANGUAGES.map((code) => ({
        code,
        name: code,
        nativeName: code,
        rtl: isRTL(code),
        enabled: true,
      }));
    }

    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      nativeName: r.native_name,
      rtl: r.rtl,
      enabled: r.enabled,
    }));
  },

  /**
   * Get cached translation
   */
  async getCachedTranslation(
    contentType: string,
    contentId: string,
    fieldName: string,
    targetLang: SupportedLanguage
  ): Promise<Translation | null> {
    // Try Redis cache first
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const cacheKey = `${TRANSLATION_CACHE_PREFIX}${contentType}:${contentId}:${fieldName}:${targetLang}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // Invalid cache, continue to DB
          }
        }
      }
    }

    // Query database
    const row = await queryOne<{
      translated_text: string;
      is_machine_translated: boolean;
      is_human_corrected: boolean;
      confidence_score: number | null;
    }>(
      `SELECT translated_text, is_machine_translated, is_human_corrected, confidence_score
       FROM content_translations
       WHERE content_type = $1 AND content_id = $2 AND field_name = $3 AND target_lang = $4`,
      [contentType, contentId, fieldName, targetLang]
    );

    if (!row) return null;

    const translation: Translation = {
      translatedText: row.translated_text,
      isMachineTranslated: row.is_machine_translated,
      isHumanCorrected: row.is_human_corrected,
      confidenceScore: row.confidence_score ?? undefined,
    };

    // Cache the result
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const cacheKey = `${TRANSLATION_CACHE_PREFIX}${contentType}:${contentId}:${fieldName}:${targetLang}`;
        await redis.set(cacheKey, JSON.stringify(translation), 'EX', TRANSLATION_CACHE_TTL);
      }
    }

    return translation;
  },

  /**
   * Save a translation
   */
  async saveTranslation(
    request: TranslationRequest,
    translation: Translation
  ): Promise<void> {
    const { contentType, contentId, fieldName, originalText, sourceLang, targetLang } = request;

    await query(
      `INSERT INTO content_translations (
        content_type, content_id, field_name, source_lang, target_lang,
        original_text, translated_text, is_machine_translated, is_human_corrected, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (content_type, content_id, field_name, target_lang)
      DO UPDATE SET
        translated_text = EXCLUDED.translated_text,
        is_machine_translated = EXCLUDED.is_machine_translated,
        is_human_corrected = EXCLUDED.is_human_corrected,
        confidence_score = EXCLUDED.confidence_score,
        updated_at = NOW()`,
      [
        contentType,
        contentId,
        fieldName,
        sourceLang,
        targetLang,
        originalText,
        translation.translatedText,
        translation.isMachineTranslated,
        translation.isHumanCorrected,
        translation.confidenceScore ?? null,
      ]
    );

    // Invalidate cache
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const cacheKey = `${TRANSLATION_CACHE_PREFIX}${contentType}:${contentId}:${fieldName}:${targetLang}`;
        await redis.del(cacheKey);
      }
    }
  },

  /**
   * Get translation for content (with optional machine translation)
   */
  async translate(
    contentType: string,
    contentId: string,
    fieldName: string,
    originalText: string,
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage,
    options: { skipCache?: boolean; translateIfMissing?: boolean } = {}
  ): Promise<Translation | null> {
    const { skipCache = false, translateIfMissing = true } = options;

    // Same language, return original
    if (sourceLang === targetLang) {
      return {
        translatedText: originalText,
        isMachineTranslated: false,
        isHumanCorrected: false,
      };
    }

    // Try cache first
    if (!skipCache) {
      const cached = await this.getCachedTranslation(contentType, contentId, fieldName, targetLang);
      if (cached) return cached;
    }

    // If we shouldn't auto-translate, return null
    if (!translateIfMissing) {
      return null;
    }

    // Call translation API
    const translatedText = await callTranslationAPI(originalText, sourceLang, targetLang);

    if (translatedText) {
      // Cache the successful translation
      const translation: Translation = {
        translatedText,
        isMachineTranslated: true,
        isHumanCorrected: false,
      };

      // Store in database for persistence
      await this.storeTranslation(contentType, contentId, fieldName, targetLang, translation);

      return translation;
    }

    // Fallback to original text if API is unavailable
    return {
      translatedText: originalText,
      isMachineTranslated: false,
      isHumanCorrected: false,
    };
  },

  /**
   * Batch translate multiple fields
   */
  async translateBatch(
    contentType: string,
    contentId: string,
    fields: Array<{ fieldName: string; text: string }>,
    sourceLang: SupportedLanguage,
    targetLang: SupportedLanguage
  ): Promise<Record<string, Translation>> {
    const result: Record<string, Translation> = {};

    // Try to get all from cache first
    const cachedResults = await Promise.all(
      fields.map((f) => this.getCachedTranslation(contentType, contentId, f.fieldName, targetLang))
    );

    const missing: Array<{ fieldName: string; text: string; index: number }> = [];

    fields.forEach((field, index) => {
      if (cachedResults[index]) {
        result[field.fieldName] = cachedResults[index]!;
      } else if (sourceLang === targetLang) {
        result[field.fieldName] = {
          translatedText: field.text,
          isMachineTranslated: false,
          isHumanCorrected: false,
        };
      } else {
        missing.push({ ...field, index });
      }
    });

    // Batch translate missing fields
    if (missing.length > 0) {
      const textsToTranslate = missing.map(m => m.text);
      const translatedTexts = await callBatchTranslationAPI(textsToTranslate, sourceLang, targetLang);

      for (let i = 0; i < missing.length; i++) {
        const field = missing[i];
        const translatedText = translatedTexts[i];

        if (translatedText) {
          const translation: Translation = {
            translatedText,
            isMachineTranslated: true,
            isHumanCorrected: false,
          };

          // Store for caching
          await this.storeTranslation(contentType, contentId, field.fieldName, targetLang, translation);
          result[field.fieldName] = translation;
        } else {
          // Fallback to original
          result[field.fieldName] = {
            translatedText: field.text,
            isMachineTranslated: false,
            isHumanCorrected: false,
          };
        }
      }
    }

    return result;
  },

  /**
   * Delete all translations for a content item
   */
  async deleteTranslations(contentType: string, contentId: string): Promise<void> {
    await query(
      'DELETE FROM content_translations WHERE content_type = $1 AND content_id = $2',
      [contentType, contentId]
    );

    // Invalidate all caches for this content
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const pattern = `${TRANSLATION_CACHE_PREFIX}${contentType}:${contentId}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    }
  },

  /**
   * Get user's preferred language
   */
  async getUserLanguage(userId: string): Promise<SupportedLanguage> {
    const row = await queryOne<{ preferred_language: string }>(
      'SELECT preferred_language FROM users WHERE id = $1',
      [userId]
    );

    return normalizeLanguageCode(row?.preferred_language || 'en');
  },

  /**
   * Set user's preferred language
   */
  async setUserLanguage(userId: string, lang: SupportedLanguage): Promise<void> {
    if (!isLanguageSupported(lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }

    await query(
      'UPDATE users SET preferred_language = $1, updated_at = NOW() WHERE id = $2',
      [lang, userId]
    );
  },

  /**
   * Get translation stats
   */
  async getStats(): Promise<{
    totalTranslations: number;
    translationsByLanguage: Record<string, number>;
    machineTranslatedCount: number;
    humanCorrectedCount: number;
  }> {
    const stats = await queryOne<{
      total: string;
      machine_translated: string;
      human_corrected: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_machine_translated) as machine_translated,
        COUNT(*) FILTER (WHERE is_human_corrected) as human_corrected
       FROM content_translations`
    );

    const byLanguage = await queryAll<{ target_lang: string; count: string }>(
      `SELECT target_lang, COUNT(*) as count
       FROM content_translations
       GROUP BY target_lang
       ORDER BY count DESC`
    );

    const translationsByLanguage: Record<string, number> = {};
    for (const row of byLanguage) {
      translationsByLanguage[row.target_lang] = parseInt(row.count, 10);
    }

    return {
      totalTranslations: parseInt(stats?.total || '0', 10),
      translationsByLanguage,
      machineTranslatedCount: parseInt(stats?.machine_translated || '0', 10),
      humanCorrectedCount: parseInt(stats?.human_corrected || '0', 10),
    };
  },
};
