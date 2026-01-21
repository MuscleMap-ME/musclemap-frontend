// DESTRUCTIVE: Schema modification for user languages - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: User Languages
 *
 * Adds:
 * 1. user_languages table - Multi-select languages per user with proficiency
 * 2. language_options table - Available languages with flag emojis
 *
 * Features:
 * - Users can select multiple languages they speak
 * - Each language has a proficiency level (native, fluent, conversational, basic)
 * - One language can be marked as primary
 * - Used for leaderboard filtering by language
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 048_user_languages');

  // ============================================
  // CREATE LANGUAGE OPTIONS TABLE
  // ============================================
  if (!(await tableExists('language_options'))) {
    log.info('Creating language_options table...');
    await db.query(`
      CREATE TABLE language_options (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        native_name TEXT NOT NULL,
        flag_emoji TEXT,
        region TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed with common languages (ISO 639-1 codes)
    const languages = [
      // Major world languages
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'Americas' },
      { code: 'es', name: 'Spanish', nativeName: 'Espanol', flag: '🇪🇸', region: 'Europe' },
      { code: 'fr', name: 'French', nativeName: 'Francais', flag: '🇫🇷', region: 'Europe' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Europe' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', flag: '🇧🇷', region: 'Americas' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'Europe' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'Europe' },
      { code: 'ru', name: 'Russian', nativeName: 'Pусский', flag: '🇷🇺', region: 'Europe' },
      { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'Europe' },
      { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'Europe' },

      // Asian languages
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'Asia' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Asia' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Asia' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', region: 'Asia' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', region: 'Asia' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'Asia' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tieng Viet', flag: '🇻🇳', region: 'Asia' },
      { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'Asia' },
      { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', region: 'Asia' },
      { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭', region: 'Asia' },

      // Middle Eastern languages
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Middle East' },
      { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', region: 'Middle East' },
      { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', region: 'Middle East' },
      { code: 'tr', name: 'Turkish', nativeName: 'Turkce', flag: '🇹🇷', region: 'Middle East' },

      // African languages
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'Africa' },

      // Nordic languages
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'Europe' },
      { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'Europe' },
      { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', region: 'Europe' },
      { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'Europe' },

      // Other European
      { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'Europe' },
      { code: 'cs', name: 'Czech', nativeName: 'Cestina', flag: '🇨🇿', region: 'Europe' },
      { code: 'ro', name: 'Romanian', nativeName: 'Romana', flag: '🇷🇴', region: 'Europe' },
      { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', region: 'Europe' },
    ];

    for (const lang of languages) {
      await db.query(
        `INSERT INTO language_options (code, name, native_name, flag_emoji, region)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING`,
        [lang.code, lang.name, lang.nativeName, lang.flag, lang.region]
      );
    }

    log.info(`Seeded ${languages.length} languages`);
  }

  // ============================================
  // CREATE USER LANGUAGES TABLE
  // ============================================
  if (!(await tableExists('user_languages'))) {
    log.info('Creating user_languages table...');
    await db.query(`
      CREATE TABLE user_languages (
        id TEXT PRIMARY KEY DEFAULT 'ulang_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        language_code TEXT NOT NULL REFERENCES language_options(code) ON DELETE CASCADE,
        proficiency TEXT NOT NULL DEFAULT 'native' CHECK (proficiency IN ('native', 'fluent', 'conversational', 'basic')),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, language_code)
      )
    `);

    log.info('Created user_languages table');
  }

  // ============================================
  // CREATE INDEXES
  // ============================================
  if (!(await indexExists('idx_user_languages_user'))) {
    log.info('Creating idx_user_languages_user index...');
    await db.query('CREATE INDEX idx_user_languages_user ON user_languages(user_id)');
  }

  if (!(await indexExists('idx_user_languages_code'))) {
    log.info('Creating idx_user_languages_code index...');
    await db.query('CREATE INDEX idx_user_languages_code ON user_languages(language_code)');
  }

  if (!(await indexExists('idx_user_languages_primary'))) {
    log.info('Creating idx_user_languages_primary index...');
    await db.query('CREATE INDEX idx_user_languages_primary ON user_languages(user_id) WHERE is_primary = TRUE');
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing tables...');
  const tables = ['language_options', 'user_languages'];
  for (const table of tables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (_e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 048_user_languages complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 048_user_languages');

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_user_languages_user');
  await db.query('DROP INDEX IF EXISTS idx_user_languages_code');
  await db.query('DROP INDEX IF EXISTS idx_user_languages_primary');

  // Drop tables in order (user_languages first due to FK)
  await db.query('DROP TABLE IF EXISTS user_languages CASCADE');
  await db.query('DROP TABLE IF EXISTS language_options CASCADE');

  log.info('Rollback 048_user_languages complete');
}

export const migrate = up;
