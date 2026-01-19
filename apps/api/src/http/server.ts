/**
 * Fastify Server
 *
 * Pure Fastify implementation with PostgreSQL, compression, and optimized routing.
 * No Express dependencies - fully migrated to Fastify.
 */

import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import compress from '@fastify/compress';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';

import { config, isProduction } from '../config';
import { logger, loggers } from '../lib/logger';
import { closeDatabase, healthCheck as dbHealthCheck, getPoolStats } from '../db/client';
import { closeRedis, isRedisAvailable } from '../lib/redis';
import { initializePubSub, cleanupPubSub } from '../lib/pubsub';

// Route modules
import { registerAuthRoutes } from './routes/auth';
import { registerEconomyRoutes } from './routes/economy';
import { registerWorkoutRoutes } from './routes/workouts';
import { registerPrescriptionRoutes } from './routes/prescription';
import { registerCommunityRoutes } from './routes/community';
import { registerMessagingRoutes } from './routes/messaging';
import { registerJourneyRoutes } from './routes/journey';
import { registerTipsRoutes } from './routes/tips';
import { registerMiscRoutes } from './routes/misc';
import { registerStatsRoutes } from './routes/stats';
import { registerHangoutRoutes } from './routes/hangouts';
import { registerIssuesRoutes } from './routes/issues';
import { registerPrivacyRoutes } from './routes/privacy';
import { registerOnboardingRoutes } from './routes/onboarding';
import { registerJourneyManagementRoutes } from './routes/journey-management';
import { registerEquipmentRoutes } from './routes/equipment';
import { registerWearablesRoutes } from '../modules/wearables';
import { registerGoalsRoutes } from './routes/goals';
import { registerJourneysRoutes } from './routes/journeys';
import { registerLimitationsRoutes } from './routes/limitations';
import { registerPTTestsRoutes } from './routes/pt-tests';
import { registerPersonalizationRoutes } from './routes/personalization';
import { registerMonitoringRoutes } from './routes/monitoring';
import { registerVirtualHangoutsRoutes } from './routes/virtual-hangouts';
import { registerCommunitiesRoutes } from './routes/communities';
import { registerBulletinRoutes } from './routes/bulletin';
import { registerLeaderboardRoutes } from './routes/leaderboards';
import { registerAchievementRoutes } from './routes/achievements';
import { registerVerificationRoutes } from './routes/verifications';
import { registerCohortPreferencesRoutes } from './routes/cohort-preferences';
import { registerCheckInRoutes } from './routes/checkins';
import socialRoutes from './routes/social';
import mentorshipRoutes from './routes/mentorship';
import communityAnalyticsRoutes from './routes/community-analytics';
import communityResourcesRoutes from './routes/community-resources';
import contentReportsRoutes from './routes/content-reports';
import archetypeCommunitiesRoutes from './routes/archetype-communities';
import identitiesRoutes from './routes/identities';
import { registerMilestonesRoutes } from './routes/milestones';
import { registerCompetitionRoutes } from './routes/competition';
import { registerModulesRoutes } from './routes/modules';
import { registerCareerRoutes } from './routes/career';
import { registerMascotRoutes } from './routes/mascot';
import { registerCreditsRoutes } from './routes/credits';
import { registerTrainerRoutes } from './routes/trainers';
import { registerSkillsRoutes } from './routes/skills';
import { registerMartialArtsRoutes } from './routes/martial-arts';
import { registerRanksRoutes } from './routes/ranks';
import { registerLiveActivityRoutes } from './routes/live-activity';
import { registerNotificationRoutes } from './routes/notifications';
import { registerTemplateRoutes } from './routes/templates';
import { registerProgressionRoutes } from './routes/progression';
import { registerCrewsRoutes } from '../modules/crews';
import { registerRivalsRoutes } from './routes/rivals';
import { registerTestScorecardRoutes } from './routes/test-scorecard';
import bodyMeasurementsRoutes from './routes/body-measurements';
import progressPhotosRoutes from './routes/progress-photos';
import volumeStatsRoutes from './routes/volume-stats';
import nutritionRoutes from './routes/nutrition';
import economyEnhancedRoutes from './routes/economyEnhanced';
import { registerOrganizationsRoutes } from './routes/organizations';
import rehabilitationRoutes from './routes/rehabilitation';
import { registerFeedbackRoutes } from './routes/feedback';
import { registerErrorRoutes } from './routes/errors';
import adminFeedbackRoutes from './routes/admin-feedback';
import adminBugsRoutes from './routes/admin-bugs';
import adminBetaTesterRoutes from './routes/admin-beta-testers';
import adminServerRoutes from './routes/admin-server';
import adminDeployRoutes from './routes/admin-deploy';
import adminSchedulerRoutes from './routes/admin-scheduler';
import adminLogsRoutes from './routes/admin-logs';
import adminSecurityRoutes from './routes/admin-security';
import adminBackupRoutes from './routes/admin-backup';
import adminEnvRoutes from './routes/admin-env';
import adminDatabaseRoutes from './routes/admin-database';
import adminFeaturesRoutes from './routes/admin-features';
import adminMetricsRoutes from './routes/admin-metrics';
import adminAlertsRoutes from './routes/admin-alerts';
import adminDocsRoutes from './routes/admin-docs';
import adminAnalyticsRoutes from './routes/admin-analytics';
import betaTesterRoutes from './routes/beta-tester';
import { registerPluginRoutes } from './routes/plugins';
import oneRepMaxRoutes from './routes/one-rep-max';
import workoutSetsRoutes from './routes/workout-sets';
import { registerProgramRoutes } from './routes/programs';
import { registerRecoveryRoutes } from './routes/recovery';
import { registerExerciseGroupRoutes } from './routes/exercise-groups';
import rpeRoutes from './routes/rpe';
import { registerExerciseVideosRoutes } from './routes/exercise-videos';
import { registerWatchRoutes } from './routes/watch';
// Marketplace module - services fully migrated to raw pg client
import { marketplaceRoutes } from './routes/marketplace';
// Workout session persistence (for recovery after crashes/restarts)
import workoutSessionsRoutes from './routes/workout-sessions';

// Engagement system routes
import { registerDailyLoginRoutes } from './routes/daily-login';
import { registerStreakRoutes } from './routes/streaks';
import { registerChallengeRoutes } from './routes/challenges';
import { registerEventRoutes } from './routes/events';
import { registerEngagementRecoveryRoutes } from './routes/engagement-recovery';
import { registerPushNotificationRoutes } from './routes/push-notifications';

// User Preferences & Customization system
// TODO: Fix TypeScript errors in preferences.ts and preferences.service.ts
// import preferencesRoutes from './routes/preferences';

// Venue Records system
import { registerVenuesRoutes } from './routes/venues';

// Deployment management (for Claude Code remote deploys)
import { registerDeploymentRoutes } from './routes/deployment';

// GraphQL
import { registerGraphQLRoutes } from '../graphql/server';

// Security middleware
import { registerSecurityMiddleware } from '../middleware/security';

// Metrics
import { registerMetricsRoutes } from '../lib/metrics';

const log = loggers.http;

/**
 * JWT Payload type for authentication
 */
export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  role?: 'user' | 'moderator' | 'admin';
}

/**
 * Extend FastifyRequest with user property
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Create and configure the Fastify server
 */
export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    // Increase payload limits
    bodyLimit: 10 * 1024 * 1024, // 10MB
    // Request ID generation
    genReqId: () => `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.setErrorHandler(async (error: any, request, reply) => {
    // Handle Zod validation errors - return 400 with details
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const issues = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      log.warn({
        requestId: request.id,
        url: request.url,
        method: request.method,
        validationErrors: fieldErrors,
      }, 'Validation error');

      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          statusCode: 400,
          details: fieldErrors,
          issues,
        },
      });
    }

    const statusCode = error?.statusCode || 500;

    // Capture full error details for debugging
    let errorMessage = 'Unknown error';
    let errorStack: string | undefined;
    let errorType = 'unknown';

    if (error === undefined || error === null) {
      errorMessage = 'Error is undefined or null';
      errorType = 'null_error';
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorType = 'string_error';
    } else if (error instanceof Error) {
      errorMessage = error.message || 'Error with no message';
      errorStack = error.stack;
      errorType = error.constructor?.name || 'Error';
    } else if (typeof error === 'object') {
      errorMessage = error.message || JSON.stringify(error).slice(0, 200);
      errorType = 'object_error';
    }

    // Always log detailed error info for debugging
    log.error({
      requestId: request.id,
      errorMessage,
      errorCode: error?.code || 'UNKNOWN',
      errorName: error?.name,
      errorType,
      url: request.url,
      method: request.method,
      // Include stack trace for 500 errors even in production (for debugging)
      stack: statusCode >= 500 ? errorStack : undefined,
      statusCode,
    }, 'Request error');

    // Don't expose internal errors in production
    const message = isProduction && statusCode >= 500
      ? 'Internal server error'
      : errorMessage;

    return reply.status(statusCode).send({
      error: {
        code: error?.code || 'ERROR',
        message,
        statusCode,
      },
    });
  });

  // Not found handler
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
      },
    });
  });

  // Register plugins
  await app.register(compress, {
    encodings: ['gzip', 'deflate', 'br'],
    threshold: 1024, // Only compress responses > 1KB
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Idempotency-Key',
      'X-CSRF-Token',
      'X-Signature',
      'X-Timestamp',
      'Accept-Language',
    ],
  });

  await app.register(helmet, {
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(sensible);

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    // Skip rate limiting for high-volume telemetry endpoints
    allowList: (request) => {
      const skipUrls = ['/api/vitals', '/api/trace/frontend-log', '/health', '/ready', '/metrics'];
      return skipUrls.some(url => request.url.startsWith(url));
    },
    errorResponseBuilder: (_request, _context) => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        statusCode: 429,
      },
    }),
  });

  await app.register(websocket, {
    options: {
      maxPayload: 1024 * 64, // 64KB max message
      perMessageDeflate: true,
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MuscleMap API',
        version: '2.0.0',
        description: 'Fitness tracking and workout management API',
      },
      servers: [
        { url: `http://localhost:${config.PORT}`, description: 'Development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Health check endpoints
  app.get('/health', async () => {
    const dbHealthy = await dbHealthCheck();
    const poolStats = getPoolStats();

    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: {
        connected: dbHealthy,
        pool: poolStats,
      },
      redis: {
        enabled: config.REDIS_ENABLED,
        connected: isRedisAvailable(),
      },
    };
  });

  app.get('/ready', async (request, reply) => {
    const dbHealthy = await dbHealthCheck();
    if (!dbHealthy) {
      return reply.status(503).send({ status: 'not ready', reason: 'database unavailable' });
    }
    return { status: 'ready' };
  });

  // Web Vitals endpoint - receives Core Web Vitals metrics from frontend
  app.post('/api/vitals', async (request, reply) => {
    // Log vitals in development, silently accept in production
    if (!isProduction) {
      log.debug({ vitals: request.body }, 'Web Vitals received');
    }
    return reply.status(204).send();
  });

  // Register security middleware
  registerSecurityMiddleware(app as unknown as FastifyInstance);

  // Register metrics routes (/metrics endpoint)
  await registerMetricsRoutes(app as unknown as FastifyInstance);

  // Initialize PubSub for GraphQL subscriptions
  await initializePubSub();

  // GraphQL endpoint (at /api/graphql)
  await app.register(async (gql) => {
    await registerGraphQLRoutes(gql);
  }, { prefix: '/api' });

  // REST API routes (all under /api prefix)
  await app.register(async (api) => {
    // Register all route modules
    await registerAuthRoutes(api);
    await registerEconomyRoutes(api);
    await registerWorkoutRoutes(api);
    await registerPrescriptionRoutes(api);
    await registerCommunityRoutes(api);
    await registerMessagingRoutes(api);
    await registerJourneyRoutes(api);
    await registerTipsRoutes(api);
    await registerMiscRoutes(api);
    await registerStatsRoutes(api);
    await registerHangoutRoutes(api);
    await registerIssuesRoutes(api);
    await registerPrivacyRoutes(api);
    await registerOnboardingRoutes(api);
    await registerJourneyManagementRoutes(api);
    await registerEquipmentRoutes(api);
    registerWearablesRoutes(api);
    await registerGoalsRoutes(api);
    await registerJourneysRoutes(api);
    await registerLimitationsRoutes(api);
    await registerPTTestsRoutes(api);
    await registerPersonalizationRoutes(api);
    await registerMonitoringRoutes(api);
    await registerVirtualHangoutsRoutes(api);
    await registerCommunitiesRoutes(api);
    await registerBulletinRoutes(api);
    await registerLeaderboardRoutes(api);
    await registerAchievementRoutes(api);
    await registerVerificationRoutes(api);
    await registerCohortPreferencesRoutes(api);
    await registerCheckInRoutes(api);

    // Venue Records system (location-based achievements)
    await registerVenuesRoutes(api);

    // New social features
    await api.register(socialRoutes);
    await api.register(mentorshipRoutes);
    await api.register(communityAnalyticsRoutes);
    await api.register(communityResourcesRoutes);
    await api.register(contentReportsRoutes);
    await api.register(archetypeCommunitiesRoutes);
    await api.register(identitiesRoutes);
    await registerMilestonesRoutes(api);
    await registerCompetitionRoutes(api);
    await registerModulesRoutes(api);
    await registerCareerRoutes(api);
    await registerMascotRoutes(api);
    await api.register(async (credits) => {
      await registerCreditsRoutes(credits);
    }, { prefix: '/credits' });
    await registerTrainerRoutes(api);
    await registerSkillsRoutes(api);
    await registerMartialArtsRoutes(api);
    await registerRanksRoutes(api);
    await registerLiveActivityRoutes(api);
    await registerNotificationRoutes(api);
    await registerTemplateRoutes(api);
    await registerProgressionRoutes(api);
    registerCrewsRoutes(api);
    await registerRivalsRoutes(api);
    await registerTestScorecardRoutes(api);

    // Enhanced workout tracking routes (Phase A features)
    await api.register(bodyMeasurementsRoutes);
    await api.register(progressPhotosRoutes);
    await api.register(volumeStatsRoutes);

    // Nutrition system
    await api.register(nutritionRoutes);

    // Enhanced economy features (earn events, geo hangouts, payments, social spending)
    await api.register(economyEnhancedRoutes, { prefix: '/economy' });

    // Enterprise organizations
    await registerOrganizationsRoutes(api);

    // Rehabilitation system
    await api.register(rehabilitationRoutes, { prefix: '/rehabilitation' });

    // User feedback system (bug reports, suggestions, questions, FAQ)
    await registerFeedbackRoutes(api);
    await adminFeedbackRoutes(api);
    await adminBugsRoutes(api);

    // Frontend error reporting (Cockatrice error system, auto-healing)
    await registerErrorRoutes(api);

    // Beta tester management (admin only)
    await api.register(adminBetaTesterRoutes, { prefix: '/admin/beta-testers' });

    // Server control (admin only - scripts, logs, processes)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminServerRoutes);

    // Deployment pipeline management (admin only - deploy, rollback, branches)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminDeployRoutes);

    // Scheduled tasks management (admin only - cron jobs, execution history)
    await adminSchedulerRoutes(api);

    // Log analysis (admin only - search, aggregations, patterns, export, streaming)
    await adminLogsRoutes(api);

    // Security audit (admin only - login attempts, sessions, blocklist, audit log, security scan)
    await adminSecurityRoutes(api);

    // Backup management (admin only - create, restore, schedule, verify backups)
    await adminBackupRoutes(api);

    // Environment config management (admin only - env vars, compare, audit, validate)
    await adminEnvRoutes(api);

    // Database management (admin only - stats, queries, indexes, vacuum)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminDatabaseRoutes);

    // Feature flags management (admin only - flags, rollout, targeting)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminFeaturesRoutes);

    // Real-time metrics (admin only - requests, latency, websockets)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminMetricsRoutes);

    // User analytics (admin only - new users, features, segments, cohorts)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminAnalyticsRoutes);

    // Alert configuration (admin only - rules, channels, history)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminAlertsRoutes);

    // Documentation management (admin only - browse, edit, create markdown files)
    // Wrapped in register() to scope the preHandler hook
    await api.register(adminDocsRoutes);

    // Beta tester user features (journal, snapshots, quick bug reporting)
    await api.register(betaTesterRoutes, { prefix: '/beta-tester' });

    // Plugin settings management
    await registerPluginRoutes(api);

    // One Rep Max (1RM) tracking and progression
    await api.register(oneRepMaxRoutes);

    // Workout sets logging with 1RM calculation
    await api.register(workoutSetsRoutes);

    // Training programs and enrollment
    await registerProgramRoutes(api);

    // Sleep tracking and recovery scoring system
    await registerRecoveryRoutes(api);

    // Exercise groups (supersets, circuits, giant sets)
    await registerExerciseGroupRoutes(api);

    // RPE/RIR tracking and auto-regulation
    await api.register(rpeRoutes);

    // Exercise video demonstrations
    await registerExerciseVideosRoutes(api);

    // Apple Watch companion app sync
    await registerWatchRoutes(api);

    // Workout session persistence (for recovery after crashes/restarts)
    await api.register(workoutSessionsRoutes);

    // Marketplace, trading, collections, mystery boxes
    // Services fully migrated to raw pg client
    await marketplaceRoutes(api);

    // ========================================
    // ENGAGEMENT SYSTEM
    // Daily login, streaks, challenges, events, recovery, push notifications
    // ========================================
    await registerDailyLoginRoutes(api);
    await registerStreakRoutes(api);
    await registerChallengeRoutes(api);
    await registerEventRoutes(api);
    await registerEngagementRecoveryRoutes(api);
    await registerPushNotificationRoutes(api);

    // ========================================
    // USER PREFERENCES & CUSTOMIZATION
    // Dashboard layouts, profiles, sound packs, hydration, device settings
    // ========================================
    // TODO: Re-enable after fixing TypeScript errors
    // await api.register(preferencesRoutes);

    // ========================================
    // DEPLOYMENT MANAGEMENT
    // Remote deployment control for Claude Code integration
    // ========================================
    await registerDeploymentRoutes(api);
  }, { prefix: '/api' });

  return app as unknown as FastifyInstance;
}

/**
 * Start the server
 */
export async function startServer(app: FastifyInstance): Promise<void> {
  const shutdown = async (signal: string) => {
    try {
      log.info({ signal }, `${signal} received, shutting down gracefully...`);

      // Close server (stops accepting new connections)
      await app.close();

      // Close database connections
      await closeDatabase();

      // Close Redis connections
      await closeRedis();

      // Cleanup PubSub subscriptions
      cleanupPubSub();

      log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });

    log.info(`Server running on http://${config.HOST}:${config.PORT}`);
    log.info(`Environment: ${config.NODE_ENV}`);
    log.info(`API Docs: http://${config.HOST}:${config.PORT}/docs`);

    if (config.REDIS_ENABLED) {
      log.info('Redis: enabled');
    }
  } catch (err) {
    log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}
