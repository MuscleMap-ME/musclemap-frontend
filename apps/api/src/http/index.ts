/**
 * HTTP Layer exports
 *
 * MuscleMap uses a pure GraphQL architecture:
 * - ALL application data flows through /api/graphql
 * - REST is only for infrastructure (health, metrics, uploads, admin)
 *
 * To switch back to hybrid mode (not recommended), change the import below.
 */

// Full Server with REST + GraphQL (for admin and operational endpoints)
export { createServer, startServer } from './server';

// Pure GraphQL Architecture (for minimal REST footprint)
// export { createServer, startServer } from './server-graphql-only';
