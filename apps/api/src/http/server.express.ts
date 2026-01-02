/**
 * Express Server Configuration
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, isProduction } from '../config';
import { requestId, apiRateLimiter, errorHandler, notFoundHandler } from './middleware';
import { createApiRouter } from './router';
import { logger } from '../lib/logger';

export function createServer(): Express {
  const app = express();
	
  // Debug: list registered routes (temporary)
	app.get('/api/__routes', (_req, res) => {
  	const out: string[] = [];

  	const walk = (stack: any[], prefix = '') => {
    	for (const layer of stack) {
      	// Direct route
      	if (layer.route?.path) {
        	const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        	out.push(`${methods} ${prefix}${layer.route.path}`);
        	continue;
      	}
      	// Nested router
      	if (layer.name === 'router' && layer.handle?.stack) {
       	 	// layer.regexp is not easily reversible; prefixing is “best effort”
        	walk(layer.handle.stack, prefix);
      	}
    	}
  	};

  	walk(app._router?.stack || []);
  	res.json({ routes: out.sort() });
	});

  // Security
  app.use(helmet({ contentSecurityPolicy: isProduction }));
  app.use(cors({
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true,
  }));

  // Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request tracking
  app.use(requestId);

  // Rate limiting on API routes
  app.use('/api/', apiRateLimiter);

  // Mount API router
  app.use('/api', createApiRouter());

  // Error handling (must be last)
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer(app: Express): void {
  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info(`Server running on http://${config.HOST}:${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
