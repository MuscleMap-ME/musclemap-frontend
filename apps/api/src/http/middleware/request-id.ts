/**
 * Request ID Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || nanoid();
  req.headers['x-request-id'] = id;
  res.setHeader('x-request-id', id);
  (req as any).requestId = id;
  next();
}
