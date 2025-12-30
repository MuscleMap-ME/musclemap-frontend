/**
 * @musclemap/plugin-sdk - Backend Plugin API
 */

// Use inline types to avoid requiring express as a dependency
type Router = any;
type Request = any;
type Response = any;
type NextFunction = any;

// ============================================
// PLUGIN MANIFEST
// ============================================

export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  engineVersion: string;
  backend?: { entry: string };
  frontend?: { entry: string };
  permissions: string[];
  creditActions?: PluginCreditAction[];
  migrations?: string[];
}

export interface PluginCreditAction {
  action: string;
  defaultCost: number;
  description?: string;
}

// ============================================
// PLUGIN CONTEXT
// ============================================

export interface PluginContext {
  pluginId: string;
  config: Record<string, unknown>;
  logger: PluginLogger;
  credits: CreditService;
  db: PluginDatabase;
  request?: PluginRequestContext;
}

export interface PluginRequestContext {
  requestId: string;
  userId?: string;
  ip: string;
  userAgent?: string;
}

// ============================================
// PLUGIN SERVICES
// ============================================

export interface PluginLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
}

export interface CreditService {
  charge(request: {
    userId: string;
    action: string;
    cost?: number;
    metadata?: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<{ success: boolean; ledgerEntryId?: string; newBalance?: number; error?: string }>;
  canCharge(userId: string, amount: number): Promise<boolean>;
  getBalance(userId: string): Promise<number>;
}

export interface PluginDatabase {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

// ============================================
// PLUGIN HOOKS
// ============================================

export interface PluginHooks {
  onServerStart?(ctx: PluginContext): Promise<void>;
  onUserCreated?(user: any, ctx: PluginContext): Promise<void>;
  onCreditsCharged?(event: CreditChargeEvent, ctx: PluginContext): Promise<void>;
  onWorkoutCompleted?(event: WorkoutCompletedEvent, ctx: PluginContext): Promise<void>;
  onRequest?(req: any, res: any, ctx: PluginContext): Promise<void>;
  onShutdown?(ctx: PluginContext): Promise<void>;
}

export interface CreditChargeEvent {
  userId: string;
  action: string;
  amount: number;
  balanceAfter: number;
  metadata?: Record<string, unknown>;
}

export interface WorkoutCompletedEvent {
  workoutId: string;
  userId: string;
  totalTU: number;
  exerciseCount: number;
}

// ============================================
// PLUGIN ADMIN PANEL
// ============================================

export interface AdminPanel {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  route: string;
  requiredPermission?: string;
}

// ============================================
// PLUGIN REGISTRATION
// ============================================

export interface PluginRegistration {
  registerRoutes?(router: Router): void;
  registerHooks?(hooks: PluginHooks): void;
  registerCreditActions?(actions: PluginCreditAction[]): void;
  registerAdminPanels?(panels: AdminPanel[]): void;
}

// ============================================
// PLUGIN ENTRY POINT
// ============================================

export type PluginEntry = (ctx: PluginContext) => PluginRegistration | Promise<PluginRegistration>;

export function definePlugin(entry: PluginEntry): PluginEntry {
  return entry;
}

// ============================================
// PLUGIN MIDDLEWARE HELPERS
// ============================================

export function requireAuth(
  handler: (req: Request, res: Response, next: NextFunction) => void
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
      return;
    }
    handler(req, res, next);
  };
}

export function requirePermissions(
  permissions: string[],
  handler: (req: Request, res: Response, next: NextFunction) => void
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res, next);
  };
}
