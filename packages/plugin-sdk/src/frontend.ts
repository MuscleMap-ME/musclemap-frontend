/**
 * @musclemap/plugin-sdk - Frontend Plugin API
 */

// Use generic component type to avoid React dependency
type ComponentType<_P = unknown> = unknown;

// ============================================
// FRONTEND PLUGIN TYPES
// ============================================

export interface FrontendPluginManifest {
  name: string;
  version: string;
  displayName: string;
}

export interface FrontendPluginRegistration {
  routes?: PluginRoute[];
  widgets?: PluginWidget[];
  navItems?: PluginNavItem[];
  commands?: PluginCommand[];
}

// ============================================
// ROUTES
// ============================================

export interface PluginRoute {
  path: string;
  component: ComponentType<PluginRouteProps>;
  requiredPerms?: string[];
  meta?: {
    title?: string;
    description?: string;
    icon?: string;
  };
}

export interface PluginRouteProps {
  pluginId: string;
  params: Record<string, string>;
}

// ============================================
// WIDGETS
// ============================================

export interface PluginWidget {
  id: string;
  slot: WidgetSlot;
  component: ComponentType<PluginWidgetProps>;
  order?: number;
  requiredPerms?: string[];
  meta?: {
    title?: string;
    description?: string;
    minWidth?: number;
    minHeight?: number;
  };
}

export type WidgetSlot =
  | 'dashboard.main'
  | 'dashboard.sidebar'
  | 'profile.tabs'
  | 'workout.summary'
  | 'muscle.detail'
  | 'admin.dashboard'
  | string;

export interface PluginWidgetProps {
  pluginId: string;
  slotContext?: Record<string, unknown>;
}

// ============================================
// NAVIGATION
// ============================================

export interface PluginNavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  location: 'main' | 'footer' | 'settings' | 'admin';
  order?: number;
  requiredPerms?: string[];
}

// ============================================
// COMMANDS
// ============================================

export interface PluginCommand {
  id: string;
  name: string;
  description?: string;
  keywords?: string[];
  icon?: string;
  handler: () => void | Promise<void>;
  requiredPerms?: string[];
}

// ============================================
// PLUGIN CONTEXT
// ============================================

export interface FrontendPluginContext {
  pluginId: string;
  capabilities: string[];
  api: PluginApiClient;
  notify: NotificationService;
  navigate: (path: string) => void;
}

export interface PluginApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface NotificationService {
  success(message: string, options?: NotificationOptions): void;
  error(message: string, options?: NotificationOptions): void;
  info(message: string, options?: NotificationOptions): void;
  warning(message: string, options?: NotificationOptions): void;
}

export interface NotificationOptions {
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================
// PLUGIN HOOKS
// ============================================

export interface FrontendPluginHooks {
  onLoad?(ctx: FrontendPluginContext): void | Promise<void>;
  onUserLogin?(userId: string, ctx: FrontendPluginContext): void;
  onUserLogout?(ctx: FrontendPluginContext): void;
}

// ============================================
// PLUGIN ENTRY POINT
// ============================================

export type FrontendPluginEntry = (
  ctx: FrontendPluginContext
) => FrontendPluginRegistration | Promise<FrontendPluginRegistration>;

export function definePlugin(entry: FrontendPluginEntry): FrontendPluginEntry {
  return entry;
}

// ============================================
// HOOKS FOR PLUGINS (stubs - implemented by host)
// ============================================

export function usePluginContext(): FrontendPluginContext {
  throw new Error('usePluginContext must be used within a PluginProvider');
}

export function useHasPermission(_permission: string): boolean {
  throw new Error('useHasPermission must be used within a PluginProvider');
}

export function usePluginApi(): PluginApiClient {
  throw new Error('usePluginApi must be used within a PluginProvider');
}
