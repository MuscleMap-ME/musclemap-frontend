/**
 * Vitest Global Setup
 *
 * This file runs before any tests and sets up environment variables.
 * Database initialization is handled by test_app.ts to ensure proper sequencing.
 */

// Make tests stable even if prod env is missing vars
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-secret-32-bytes-minimum-aaaaaaaaaaaa';

// Use test database if DATABASE_URL points to production
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('_test')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('/musclemap', '/musclemap_test');
}
