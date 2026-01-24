/**
 * HTTP Layer exports
 *
 * MuscleMap uses a pure GraphQL architecture:
 * - ALL application data flows through /api/graphql
 * - REST is only for infrastructure (health, metrics, uploads, admin)
 *
 * To switch back to hybrid mode (not recommended), change the import below.
 */

// Pure GraphQL Architecture (RECOMMENDED)
export { createServer, startServer } from './server-graphql-only';

// Legacy Hybrid Architecture (deprecated - kept for reference)
// export { createServer, startServer } from './server';
