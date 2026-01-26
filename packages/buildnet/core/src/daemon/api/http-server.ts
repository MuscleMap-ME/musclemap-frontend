/**
 * HTTP API Server for BuildNet Daemon
 *
 * Provides REST and WebSocket endpoints for:
 * - Build management
 * - Resource management
 * - Session management
 * - Real-time activity streaming
 * - Ledger queries
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import type { MasterDaemon } from '../master/index.js';
import type { ActivityTracker } from '../dashboard/index.js';
import type {
  ActorIdentity,
  ApiResponse,
  ApiError,
  DashboardState,
  BuildRequest,
  Resource,
  Session,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface HttpServerConfig {
  port: number;
  host: string;
  cors_origins: string[];
}

interface WebSocketClient {
  id: string;
  send: (data: string) => void;
  close: () => void;
}

// ============================================================================
// HTTP Server Implementation
// ============================================================================

export class HttpApiServer extends EventEmitter {
  private config: HttpServerConfig;
  private daemon: MasterDaemon;
  private tracker: ActivityTracker;
  private server: ReturnType<typeof createServer> | null = null;
  private wsClients: Map<string, WebSocketClient> = new Map();

  constructor(
    daemon: MasterDaemon,
    tracker: ActivityTracker,
    config: Partial<HttpServerConfig> = {}
  ) {
    super();
    this.daemon = daemon;
    this.tracker = tracker;
    this.config = {
      port: config.port ?? 7890,
      host: config.host ?? '0.0.0.0',
      cors_origins: config.cors_origins ?? ['*'],
    };
  }

  /**
   * Start the HTTP server.
   */
  async start(): Promise<void> {
    this.server = createServer((req, res) => {
      this.handleRequest(req, res).catch(error => {
        console.error('Request error:', error);
        this.sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
      });
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        this.emit('started', { port: this.config.port, host: this.config.host });
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  /**
   * Stop the HTTP server.
   */
  async stop(): Promise<void> {
    // Close all WebSocket connections
    for (const client of this.wsClients.values()) {
      client.close();
    }
    this.wsClients.clear();

    // Close HTTP server
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close(error => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  /**
   * Get server address.
   */
  getAddress(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  // ==========================================================================
  // Private Methods - Request Handling
  // ==========================================================================

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = parseUrl(req.url ?? '/', true);
    const path = url.pathname ?? '/';
    const method = req.method ?? 'GET';

    // CORS headers
    this.setCorsHeaders(res);

    // Handle preflight
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route request
    try {
      // Dashboard
      if (path === '/api/dashboard' && method === 'GET') {
        return this.handleGetDashboard(req, res);
      }

      // Builds
      if (path === '/api/builds' && method === 'POST') {
        return this.handleCreateBuild(req, res);
      }
      if (path === '/api/builds' && method === 'GET') {
        return this.handleListBuilds(req, res);
      }
      if (path.startsWith('/api/builds/') && method === 'GET') {
        const buildId = path.split('/')[3];
        return this.handleGetBuild(req, res, buildId);
      }
      if (path.startsWith('/api/builds/') && path.endsWith('/cancel') && method === 'POST') {
        const buildId = path.split('/')[3];
        return this.handleCancelBuild(req, res, buildId);
      }

      // Resources
      if (path === '/api/resources' && method === 'GET') {
        return this.handleListResources(req, res);
      }
      if (path === '/api/resources' && method === 'POST') {
        return this.handleAddResource(req, res);
      }
      if (path.startsWith('/api/resources/') && method === 'GET') {
        const resourceId = path.split('/')[3];
        return this.handleGetResource(req, res, resourceId);
      }
      if (path.startsWith('/api/resources/') && method === 'DELETE') {
        const resourceId = path.split('/')[3];
        return this.handleRemoveResource(req, res, resourceId);
      }
      if (path.startsWith('/api/resources/') && method === 'PATCH') {
        const resourceId = path.split('/')[3];
        return this.handleUpdateResource(req, res, resourceId);
      }
      if (path.startsWith('/api/resources/') && path.endsWith('/drain') && method === 'POST') {
        const resourceId = path.split('/')[3];
        return this.handleDrainResource(req, res, resourceId);
      }
      if (path.startsWith('/api/resources/') && path.endsWith('/resume') && method === 'POST') {
        const resourceId = path.split('/')[3];
        return this.handleResumeResource(req, res, resourceId);
      }

      // Sessions
      if (path === '/api/sessions' && method === 'GET') {
        return this.handleListSessions(req, res);
      }
      if (path.startsWith('/api/sessions/') && method === 'DELETE') {
        const sessionId = path.split('/')[3];
        return this.handleEndSession(req, res, sessionId);
      }

      // Ledger
      if (path === '/api/ledger/entries' && method === 'GET') {
        return this.handleQueryLedger(req, res);
      }
      if (path === '/api/ledger/verify' && method === 'POST') {
        return this.handleVerifyLedger(req, res);
      }
      if (path === '/api/ledger/stats' && method === 'GET') {
        return this.handleLedgerStats(req, res);
      }

      // Events stream (Server-Sent Events)
      if (path === '/api/events' && method === 'GET') {
        return this.handleEventStream(req, res);
      }

      // Health check
      if (path === '/health' && method === 'GET') {
        return this.handleHealthCheck(req, res);
      }

      // Not found
      this.sendError(res, 404, 'NOT_FOUND', `Route not found: ${method} ${path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.sendError(res, 500, 'INTERNAL_ERROR', message);
    }
  }

  // ==========================================================================
  // Route Handlers
  // ==========================================================================

  private async handleGetDashboard(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const state = this.daemon.getDashboardState();
    this.sendJson(res, 200, { success: true, data: state });
  }

  private async handleCreateBuild(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody<{
      targets: string[];
      options?: Partial<BuildRequest['options']>;
    }>(req);

    if (!body.targets || !Array.isArray(body.targets)) {
      return this.sendError(res, 400, 'INVALID_REQUEST', 'targets array is required');
    }

    const actor = this.getActorFromRequest(req);
    const result = await this.daemon.requestBuild(body.targets, actor, body.options ?? {});

    this.sendJson(res, 200, { success: true, data: result });
  }

  private async handleListBuilds(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Would need to track builds in daemon
    this.sendJson(res, 200, { success: true, data: [] });
  }

  private async handleGetBuild(req: IncomingMessage, res: ServerResponse, buildId: string): Promise<void> {
    const status = this.daemon.getOrchestrator().getBuildStatus(buildId);
    if (!status) {
      return this.sendError(res, 404, 'NOT_FOUND', `Build not found: ${buildId}`);
    }
    this.sendJson(res, 200, { success: true, data: status });
  }

  private async handleCancelBuild(req: IncomingMessage, res: ServerResponse, buildId: string): Promise<void> {
    const actor = this.getActorFromRequest(req);
    const cancelled = await this.daemon.getOrchestrator().cancelBuild(buildId, actor);
    this.sendJson(res, 200, { success: true, data: { cancelled } });
  }

  private async handleListResources(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const resources = this.daemon.getResources().getAllResources();
    this.sendJson(res, 200, { success: true, data: resources });
  }

  private async handleAddResource(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody<{
      name: string;
      type: 'worker' | 'storage' | 'cache';
      address: string;
      cpu_cores?: number;
      memory_gb?: number;
      capabilities?: Record<string, unknown>;
      labels?: Record<string, string>;
    }>(req);

    const actor = this.getActorFromRequest(req);
    const resource = await this.daemon.getResources().addResource(body as any, actor);

    this.sendJson(res, 201, { success: true, data: resource });
  }

  private async handleGetResource(req: IncomingMessage, res: ServerResponse, resourceId: string): Promise<void> {
    const resource = this.daemon.getResources().getResource(resourceId);
    if (!resource) {
      return this.sendError(res, 404, 'NOT_FOUND', `Resource not found: ${resourceId}`);
    }
    this.sendJson(res, 200, { success: true, data: resource });
  }

  private async handleRemoveResource(req: IncomingMessage, res: ServerResponse, resourceId: string): Promise<void> {
    const url = parseUrl(req.url ?? '/', true);
    const force = url.query.force === 'true';
    const actor = this.getActorFromRequest(req);

    await this.daemon.getResources().removeResource(resourceId, actor, force);
    this.sendJson(res, 200, { success: true, data: { removed: true } });
  }

  private async handleUpdateResource(req: IncomingMessage, res: ServerResponse, resourceId: string): Promise<void> {
    const body = await this.parseBody<Partial<Resource>>(req);
    const actor = this.getActorFromRequest(req);

    const resource = await this.daemon.getResources().updateResource(resourceId, body as any, actor);
    this.sendJson(res, 200, { success: true, data: resource });
  }

  private async handleDrainResource(req: IncomingMessage, res: ServerResponse, resourceId: string): Promise<void> {
    const actor = this.getActorFromRequest(req);
    await this.daemon.getResources().drainResource(resourceId, actor);
    this.sendJson(res, 200, { success: true, data: { drained: true } });
  }

  private async handleResumeResource(req: IncomingMessage, res: ServerResponse, resourceId: string): Promise<void> {
    const actor = this.getActorFromRequest(req);
    await this.daemon.getResources().resumeResource(resourceId, actor);
    this.sendJson(res, 200, { success: true, data: { resumed: true } });
  }

  private async handleListSessions(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sessions = this.daemon.getSessions().getActiveSessions();
    this.sendJson(res, 200, { success: true, data: sessions });
  }

  private async handleEndSession(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void> {
    await this.daemon.getSessions().endSession(sessionId, 'Ended via API');
    this.sendJson(res, 200, { success: true, data: { ended: true } });
  }

  private async handleQueryLedger(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = parseUrl(req.url ?? '/', true);
    const options: Record<string, unknown> = {};

    if (url.query.entity_type) options.entity_type = url.query.entity_type;
    if (url.query.entity_id) options.entity_id = url.query.entity_id;
    if (url.query.limit) options.limit = parseInt(url.query.limit as string, 10);

    const entries = await this.daemon.getLedger().queryEntries(options as any);
    this.sendJson(res, 200, { success: true, data: entries });
  }

  private async handleVerifyLedger(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const report = await this.daemon.getLedger().verifyIntegrity();
    this.sendJson(res, 200, { success: true, data: report });
  }

  private async handleLedgerStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const stats = await this.daemon.getLedger().getStats();
    this.sendJson(res, 200, { success: true, data: stats });
  }

  private handleEventStream(req: IncomingMessage, res: ServerResponse): void {
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const clientId = randomUUID();

    // Send initial state
    const initialState = this.daemon.getDashboardState();
    res.write(`event: state\ndata: ${JSON.stringify(initialState)}\n\n`);

    // Subscribe to updates
    const unsubscribe = this.tracker.subscribe(clientId, (state) => {
      res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      unsubscribe();
    });
  }

  private handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
    this.sendJson(res, 200, {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', this.config.cors_origins.join(','));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  private sendJson(res: ServerResponse, status: number, data: ApiResponse<unknown>): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private sendError(res: ServerResponse, status: number, code: string, message: string): void {
    const error: ApiError = { code, message };
    this.sendJson(res, status, { success: false, error });
  }

  private async parseBody<T>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private getActorFromRequest(req: IncomingMessage): ActorIdentity {
    // In a real implementation, this would extract from auth header
    const auth = req.headers.authorization;

    return {
      id: 'api-user',
      name: 'API User',
      type: 'user',
      metadata: {
        hostname: req.socket.remoteAddress ?? 'unknown',
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHttpServer(
  daemon: MasterDaemon,
  tracker: ActivityTracker,
  config?: Partial<HttpServerConfig>
): HttpApiServer {
  return new HttpApiServer(daemon, tracker, config);
}
