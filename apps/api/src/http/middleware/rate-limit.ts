/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import { config } from '../../config';

export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
});
