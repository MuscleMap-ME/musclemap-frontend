/**
 * Configuration Loader
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the api directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_PATH: z.string().default('./data/musclemap.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PLUGIN_DIRS: z.string().default('./plugins'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Redis configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.coerce.boolean().default(false),
});

type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    for (const error of result.error.errors) {
      console.error(`   ${error.path.join('.')}: ${error.message}`);
    }
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    console.warn('⚠️  Using development defaults for missing config');
    
    return {
      NODE_ENV: 'development',
      PORT: 3001,
      HOST: '0.0.0.0',
      DATABASE_PATH: './data/musclemap.db',
      JWT_SECRET: 'INSECURE_DEV_SECRET_CHANGE_IN_PRODUCTION!!!',
      JWT_EXPIRES_IN: '7d',
      PLUGIN_DIRS: './plugins',
      LOG_LEVEL: 'debug',
      RATE_LIMIT_WINDOW_MS: 60000,
      RATE_LIMIT_MAX: 100,
      CORS_ORIGIN: '*',
      FRONTEND_URL: 'http://localhost:5173',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_ENABLED: false,
    };
  }
  
  return result.data;
}

export const config = loadConfig();
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';
