import { Router, Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { optionalAuth } from '../auth';

const log = (loggers as any).frontend ?? (loggers as any).http ?? (loggers as any).plugins;

export const traceRouter = Router();

traceRouter.post(
  '/frontend-log',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const entries = (req.body as any)?.entries;
    if (!Array.isArray(entries)) throw new ValidationError('entries must be an array');

    const requestId = (req as any).requestId || req.headers['x-request-id'] || 'unknown';
    const authUserId = (req as any)?.user?.userId;

    for (const e of entries) {
      try {
        const level = String(e?.level || 'info').toLowerCase();
        const type = String(e?.type || 'event');

        const payload = {
          requestId,
          frontend: true,
          type,
          sessionId: e?.sessionId,
          url: e?.url,
          userAgent: e?.userAgent,
          timestamp: e?.timestamp,
          userId: e?.userId || authUserId || null,
          data: e?.data ?? null,
        };

        if (level === 'error') log.error(payload, 'frontend_log');
        else if (level === 'warn') log.warn(payload, 'frontend_log');
        else if (level === 'debug') log.debug(payload, 'frontend_log');
        else log.info(payload, 'frontend_log');
      } catch {
        // swallow per-entry failures
      }
    }

    res.status(204).send();
  })
);
