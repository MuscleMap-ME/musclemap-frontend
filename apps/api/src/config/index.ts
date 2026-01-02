/**
 * Configuration Loader
 *
 * Loads and validates environment configuration with PostgreSQL support.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load .env from the api directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // PostgreSQL configuration
  DATABASE_URL: z.string().default('postgresql://localhost:5432/musclemap'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_SSL: z.coerce.boolean().default(false),

  // Legacy SQLite path (for migration)
  DATABASE_PATH: z.string().default('./data/musclemap.db'),

  // JWT configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Stripe configuration
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Plugin configuration
  PLUGIN_DIRS: z.string().default('./plugins'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Redis configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.coerce.boolean().default(true),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  CSRF_SECRET: z.string().optional(),
});

type EnvConfig = z.infer<typeof envSchema>;

function generateSecureSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    for (const error of result.error.errors) {
      console.error(`   ${error.path.join('.')}: ${error.message}`);
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL: Production requires all environment variables to be set.');
      console.error('   Required: JWT_SECRET, DATABASE_URL');
      process.exit(1);
    }

    console.warn('⚠️  Using development defaults for missing config');
    console.warn('⚠️  A random JWT_SECRET will be generated (sessions will not persist across restarts)');

    const devSecret = generateSecureSecret();

    return {
      NODE_ENV: 'development',
      PORT: 3001,
      HOST: '0.0.0.0',
      DATABASE_URL: 'postgresql://localhost:5432/musclemap_dev',
      DATABASE_POOL_MIN: 2,
      DATABASE_POOL_MAX: 10,
      DATABASE_SSL: false,
      DATABASE_PATH: './data/musclemap.db',
      JWT_SECRET: devSecret,
      JWT_EXPIRES_IN: '7d',
      JWT_REFRESH_EXPIRES_IN: '30d',
      PLUGIN_DIRS: './plugins',
      LOG_LEVEL: 'debug',
      RATE_LIMIT_WINDOW_MS: 60000,
      RATE_LIMIT_MAX: 100,
      CORS_ORIGIN: '*',
      FRONTEND_URL: 'http://localhost:5173',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_ENABLED: true,
      BCRYPT_ROUNDS: 12,
    };
  }

  return result.data;
}

export const config = loadConfig();
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';

// Validate critical security settings in production
if (isProduction) {
  if (config.CORS_ORIGIN === '*') {
    console.warn('⚠️  WARNING: CORS_ORIGIN is set to * in production. This is insecure.');
  }
  if (!config.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  WARNING: STRIPE_WEBHOOK_SECRET is not set. Webhooks will not be verified.');
  }
  if (!config.DATABASE_SSL) {
    console.warn('⚠️  WARNING: DATABASE_SSL is disabled in production.');
  }
}
