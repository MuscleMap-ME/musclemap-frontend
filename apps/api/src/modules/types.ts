/**
 * API Module Contract
 * 
 * All modules must implement this interface for consistent behavior.
 */

import { Router } from 'express';
import { Database } from 'better-sqlite3';
import { Logger } from 'pino';

export interface ModuleContext {
  db: Database;
  logger: Logger;
  config: Record<string, unknown>;
}

export interface ApiModule {
  /** Unique module identifier */
  id: string;
  
  /** Module version */
  version: string;
  
  /** Module description */
  description?: string;
  
  /** Express router with module routes */
  router: Router;
  
  /** Optional initialization hook */
  initialize?(ctx: ModuleContext): void | Promise<void>;
  
  /** Optional shutdown hook */
  shutdown?(ctx: ModuleContext): void | Promise<void>;
}

/**
 * Helper to define a module with type safety
 */
export function defineModule(module: ApiModule): ApiModule {
  return module;
}
