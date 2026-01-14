/**
 * Navigation Components
 *
 * Breadcrumbs and navigation utilities for MuscleMap.
 * Import from '@/components/navigation' for convenience.
 */

// Breadcrumbs components
export {
  default as Breadcrumbs,
  CompactBreadcrumbs,
  GlassBreadcrumbs,
} from './Breadcrumbs';

// Breadcrumbs hook
export { default as useBreadcrumbs, useBreadcrumbsWithData } from './useBreadcrumbs';

// Breadcrumb configuration
export {
  ROUTE_LABELS,
  ROUTE_HIERARCHY,
  EXCLUDED_ROUTES,
  ROUTE_ICONS,
  getSegmentLabel,
  formatSegmentLabel,
  isUUID,
  isDynamicSegment,
} from './breadcrumbConfig';
