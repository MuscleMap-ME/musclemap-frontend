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
  // In production, bind to localhost only - Caddy handles external traffic
  HOST: z.string().default(process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0'),
  // PostgreSQL configuration
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.coerce.number().default(5432),
  PGDATABASE: z.string().default('musclemap'),
  PGUSER: z.string().default(process.env.USER || 'postgres'),
  PGPASSWORD: z.string().default(''),
  PG_POOL_MIN: z.coerce.number().default(2),
  PG_POOL_MAX: z.coerce.number().default(20),
  PG_IDLE_TIMEOUT: z.coerce.number().default(30000),
  PG_CONNECTION_TIMEOUT: z.coerce.number().default(5000),
  PG_STATEMENT_TIMEOUT: z.coerce.number().default(30000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PLUGIN_DIRS: z.string().default('./plugins'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  // SEC-006 FIX: Default to production domain instead of wildcard
  CORS_ORIGIN: z.string().default(process.env.NODE_ENV === 'production' ? 'https://musclemap.me' : '*'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Redis configuration
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: z.coerce.boolean().default(false),
  // Redis Cluster configuration
  REDIS_CLUSTER_ENABLED: z.coerce.boolean().default(false),
  REDIS_CLUSTER_NODES: z.string().optional(), // Comma-separated list: "host1:port1,host2:port2"
  // Native modules configuration
  USE_NATIVE: z.coerce.boolean().default(true),
  // Translation API configuration (LibreTranslate)
  TRANSLATION_API_URL: z.string().optional(),
  TRANSLATION_API_KEY: z.string().optional(),
  TRANSLATION_ENABLED: z.coerce.boolean().default(false),
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
      HOST: '0.0.0.0', // Dev always binds to all interfaces
      DATABASE_URL: undefined,
      PGHOST: 'localhost',
      PGPORT: 5432,
      PGDATABASE: 'musclemap',
      PGUSER: process.env.USER || 'postgres',
      PGPASSWORD: '',
      PG_POOL_MIN: 2,
      PG_POOL_MAX: 20,
      PG_IDLE_TIMEOUT: 30000,
      PG_CONNECTION_TIMEOUT: 5000,
      PG_STATEMENT_TIMEOUT: 30000,
      JWT_SECRET: 'INSECURE_DEV_SECRET_CHANGE_IN_PRODUCTION!!!',
      JWT_EXPIRES_IN: '7d',
      PLUGIN_DIRS: './plugins',
      LOG_LEVEL: 'debug',
      RATE_LIMIT_WINDOW_MS: 60000,
      RATE_LIMIT_MAX: 100,
      CORS_ORIGIN: 'http://localhost:5173', // Dev CORS - only allow local frontend
      FRONTEND_URL: 'http://localhost:5173',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_ENABLED: false,
      REDIS_CLUSTER_ENABLED: false,
      REDIS_CLUSTER_NODES: undefined,
      USE_NATIVE: true,
      TRANSLATION_API_URL: undefined,
      TRANSLATION_API_KEY: undefined,
      TRANSLATION_ENABLED: false,
    };
  }
  
  return result.data;
}

export const config = loadConfig();
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';
export const isTest = config.NODE_ENV === 'test';
