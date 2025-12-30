/**
 * Structured Logger
 */

import pino from 'pino';

// Get config values directly to avoid circular dependency
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

const pinoLogger = pino({
  level: LOG_LEVEL,
  base: {
    env: NODE_ENV,
  },
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logger = pinoLogger;

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}

export const loggers = {
  http: logger.child({ module: 'http' }),
  db: logger.child({ module: 'database' }),
  auth: logger.child({ module: 'auth' }),
  economy: logger.child({ module: 'economy' }),
  plugins: logger.child({ module: 'plugins' }),
  frontend: logger.child({ module: 'frontend' }),
};
