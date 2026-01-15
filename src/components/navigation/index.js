/**
 * Navigation Components
 *
 * Breadcrumbs and navigation utilities for MuscleMap.
 * Import from '@/components/navigation' for convenience.
 *
 * @example
 * // Import main components
 * import { Breadcrumbs, useBreadcrumbs } from '@/components/navigation';
 *
 * // Import variants
 * import {
 *   Breadcrumbs,
 *   CompactBreadcrumbs,
 *   GlassBreadcrumbs,
 *   ResponsiveBreadcrumbs,
 *   PageBreadcrumbs,
 * } from '@/components/navigation';
 *
 * // Import route configuration
 * import {
 *   BREADCRUMB_ROUTES,
 *   ROUTE_ICONS,
 * } from '@/components/navigation';
 */

// Main Breadcrumbs components
export {
  default as Breadcrumbs,
  Breadcrumbs as default,
  CompactBreadcrumbs,
  GlassBreadcrumbs,
  ResponsiveBreadcrumbs,
  PageBreadcrumbs,
} from './Breadcrumbs';

// BreadcrumbItem components
export {
  default as BreadcrumbItem,
  BreadcrumbHome,
  BreadcrumbEllipsis,
  BreadcrumbSeparator,
} from './BreadcrumbItem';

// useBreadcrumbs hook
export {
  default as useBreadcrumbs,
  useBreadcrumbsWithData,
  isUUID,
  isDynamicSegment,
  formatSegmentLabel,
} from './useBreadcrumbs';

// Route configuration
export {
  BREADCRUMB_ROUTES,
  ROUTE_ICONS,
  EXCLUDED_ROUTES,
  DYNAMIC_CONTEXT_KEYS,
  DYNAMIC_FALLBACK_LABELS,
  getRouteConfig,
  resolveDynamicLabel,
} from './breadcrumbRoutes';

// Legacy exports for backward compatibility
export {
  ROUTE_LABELS,
  ROUTE_HIERARCHY,
  EXCLUDED_ROUTES as EXCLUDED,
  getSegmentLabel,
} from './breadcrumbConfig';
