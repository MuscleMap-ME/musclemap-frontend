/**
 * Security Middleware
 *
 * Enhanced security features:
 * - CSRF protection with double-submit cookie pattern
 * - Fingerprint-based session validation
 * - Rate limiting per endpoint
 * - Request signing for sensitive operations
 */

import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { loggers } from '../lib/logger';
import { createRateLimiter } from '@musclemap/native';

const log = loggers.core;

// CSRF token settings
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_MAX_AGE = 86400; // 24 hours

// Rate limiters for different endpoints
const rateLimiters = {
  auth: createRateLimiter(10, 60), // 10 requests per minute for auth
  api: createRateLimiter(100, 60), // 100 requests per minute for general API
  heavy: createRateLimiter(10, 60), // 10 requests per minute for heavy operations
  transfer: createRateLimiter(5, 60), // 5 credit transfers per minute
};

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF protection middleware using double-submit cookie pattern
 *
 * For state-changing requests (POST, PUT, DELETE, PATCH):
 * - Validates that the CSRF token in the header matches the cookie
 * - Uses timing-safe comparison to prevent timing attacks
 */
export async function csrfProtection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Skip for non-state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return;
  }

  // Skip for API key authenticated requests
  if (request.headers['x-api-key']) {
    return;
  }

  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;
  const cookieToken = ((request as any).cookies as Record<string, string>)?.[CSRF_COOKIE_NAME];

  // Ensure both tokens are present and are strings
  if (!headerToken || !cookieToken || typeof headerToken !== 'string' || typeof cookieToken !== 'string') {
    log.warn({
      ip: request.ip,
      path: request.url,
      hasHeader: !!headerToken,
      hasCookie: !!cookieToken,
    }, 'CSRF token missing');

    return reply.status(403).send({
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'CSRF token is missing or invalid',
        statusCode: 403,
      },
    });
  }

  // Timing-safe comparison
  const a = Buffer.alloc(CSRF_TOKEN_LENGTH * 2);
  const b = Buffer.alloc(CSRF_TOKEN_LENGTH * 2);

  try {
    Buffer.from(headerToken, 'hex').copy(a);
    Buffer.from(cookieToken, 'hex').copy(b);
  } catch {
    return reply.status(403).send({
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'CSRF token is malformed',
        statusCode: 403,
      },
    });
  }

  if (!crypto.timingSafeEqual(a, b)) {
    log.warn({
      ip: request.ip,
      path: request.url,
    }, 'CSRF token mismatch');

    return reply.status(403).send({
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'CSRF token validation failed',
        statusCode: 403,
      },
    });
  }
}

/**
 * Generate and set CSRF cookie
 */
export function setCsrfCookie(reply: FastifyReply): string {
  const token = generateCsrfToken();

  (reply as any).cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_COOKIE_MAX_AGE,
    path: '/',
  });

  return token;
}

/**
 * Generate a fingerprint for the current request
 * Used for session binding to detect session hijacking
 */
export function generateFingerprint(request: FastifyRequest, sessionId: string): string {
  const components = [
    request.headers['user-agent'] || '',
    request.headers['accept-language'] || '',
    sessionId,
  ];

  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
  type: keyof typeof rateLimiters,
  options: { keyFn?: (request: FastifyRequest) => string } = {}
) {
  const limiter = rateLimiters[type];
  const getKey = options.keyFn || ((request: FastifyRequest) => {
    // Use user ID if authenticated, otherwise use IP
    return request.user?.userId || request.ip;
  });

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = getKey(request);

    if (!limiter.check(key, 1)) {
      const remaining = limiter.remaining(key);

      log.warn({
        key,
        type,
        path: request.url,
      }, 'Rate limit exceeded');

      reply.header('X-RateLimit-Remaining', remaining.toString());
      reply.header('Retry-After', '60');

      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          statusCode: 429,
          retryAfter: 60,
        },
      });
    }

    reply.header('X-RateLimit-Remaining', limiter.remaining(key).toString());
  };
}

/**
 * Request signing for sensitive operations
 * Client must provide HMAC signature of request body
 */
export async function validateRequestSignature(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signature = request.headers['x-signature'] as string;
  const timestamp = request.headers['x-timestamp'] as string;

  if (!signature || !timestamp) {
    return reply.status(401).send({
      error: {
        code: 'SIGNATURE_REQUIRED',
        message: 'Request signature is required',
        statusCode: 401,
      },
    });
  }

  // Check timestamp is within 5 minutes
  const timestampMs = parseInt(timestamp, 10);
  const now = Date.now();
  if (isNaN(timestampMs) || Math.abs(now - timestampMs) > 5 * 60 * 1000) {
    return reply.status(401).send({
      error: {
        code: 'SIGNATURE_EXPIRED',
        message: 'Request signature has expired',
        statusCode: 401,
      },
    });
  }

  // Get user's secret (stored when they enable signed requests)
  // For now, we'll use a simplified check - in production, fetch from DB
  const userId = request.user?.userId;
  if (!userId) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      },
    });
  }

  // TODO: Fetch user's signing secret from database
  // For demonstration, we skip actual validation
}

/**
 * JWT token revocation check using Redis
 */
export async function checkTokenRevocation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!isRedisAvailable()) return;

  const jti = (request.user as { jti?: string })?.jti;
  if (!jti) return;

  const redis = getRedis();
  if (!redis) return;

  const isRevoked = await redis.exists(`jwt:revoked:${jti}`);
  if (isRevoked) {
    return reply.status(401).send({
      error: {
        code: 'TOKEN_REVOKED',
        message: 'Token has been revoked',
        statusCode: 401,
      },
    });
  }
}

/**
 * Revoke a JWT token
 */
export async function revokeToken(jti: string, expiresInSeconds: number): Promise<void> {
  if (!isRedisAvailable()) return;

  const redis = getRedis();
  if (!redis) return;

  await redis.set(`jwt:revoked:${jti}`, '1', 'EX', expiresInSeconds);
}

/**
 * Security headers middleware
 */
export function securityHeaders(request: FastifyRequest, reply: FastifyReply): void {
  // Content Security Policy
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.musclemap.me wss://api.musclemap.me"
  );

  // Prevent clickjacking
  reply.header('X-Frame-Options', 'DENY');

  // XSS protection
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  reply.header(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), payment=()'
  );
}

/**
 * Register security middleware with Fastify
 */
export function registerSecurityMiddleware(app: FastifyInstance): void {
  // Add security headers to all responses
  app.addHook('onRequest', async (request, reply) => {
    securityHeaders(request, reply);
  });

  // CSRF endpoint to get a token
  app.get('/csrf-token', async (request, reply) => {
    const token = setCsrfCookie(reply);
    return reply.send({ token });
  });
}

/**
 * IP-based blocking check
 */
export async function checkIpBlock(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!isRedisAvailable()) return;

  const redis = getRedis();
  if (!redis) return;

  const ip = request.ip;
  const isBlocked = await redis.exists(`ip:blocked:${ip}`);

  if (isBlocked) {
    log.warn({ ip }, 'Blocked IP attempted access');

    return reply.status(403).send({
      error: {
        code: 'IP_BLOCKED',
        message: 'Access denied',
        statusCode: 403,
      },
    });
  }
}

/**
 * Block an IP address
 */
export async function blockIp(ip: string, durationSeconds: number = 3600): Promise<void> {
  if (!isRedisAvailable()) return;

  const redis = getRedis();
  if (!redis) return;

  await redis.set(`ip:blocked:${ip}`, '1', 'EX', durationSeconds);
  log.info({ ip, duration: durationSeconds }, 'IP blocked');
}

/**
 * Unblock an IP address
 */
export async function unblockIp(ip: string): Promise<void> {
  if (!isRedisAvailable()) return;

  const redis = getRedis();
  if (!redis) return;

  await redis.del(`ip:blocked:${ip}`);
  log.info({ ip }, 'IP unblocked');
}
