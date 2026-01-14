/**
 * useBreadcrumbs Hook
 *
 * Generates breadcrumbs from the current route.
 * Handles dynamic segments, route hierarchy, and data fetching for labels.
 */

import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  EXCLUDED_ROUTES,
  getSegmentLabel,
  isDynamicSegment,
  formatSegmentLabel,
} from './breadcrumbConfig';

/**
 * Context object for resolving dynamic segment labels
 * Can be extended to include data from queries
 */
const defaultContext = {};

/**
 * Generate breadcrumb items from the current route
 * @param {Object} options - Hook options
 * @param {Object} options.context - Context object with entity names (e.g., { exerciseName: 'Bench Press' })
 * @param {boolean} options.includeHome - Whether to include home as the first breadcrumb
 * @returns {Array} Array of breadcrumb items
 */
export function useBreadcrumbs(options = {}) {
  const { context = defaultContext, includeHome = false } = options;
  const location = useLocation();
  const params = useParams();

  const breadcrumbs = useMemo(() => {
    const { pathname } = location;

    // Check if route should be excluded
    if (EXCLUDED_ROUTES.includes(pathname)) {
      return [];
    }

    // Split pathname into segments
    const segments = pathname.split('/').filter(Boolean);

    // If no segments and not including home, return empty
    if (segments.length === 0 && !includeHome) {
      return [];
    }

    const items = [];

    // Optionally add home
    if (includeHome) {
      items.push({
        label: 'Home',
        to: '/',
        isFirst: true,
        isLast: segments.length === 0,
      });
    }

    // Build breadcrumbs from segments
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Determine label
      let label = getSegmentLabel(segment);

      // Check if this is a dynamic segment that needs resolution
      if (isDynamicSegment(segment)) {
        // Try to get label from context
        const contextKey = getContextKeyForPath(currentPath, params);
        if (contextKey && context[contextKey]) {
          label = context[contextKey];
        } else {
          // Use a generic label based on the parent route
          const parentSegment = segments[index - 1];
          label = getDynamicLabel(parentSegment, segment);
        }
      }

      items.push({
        label,
        to: isLast ? undefined : currentPath, // Last item is not a link
        isFirst: items.length === 0,
        isLast,
        segment,
        path: currentPath,
      });
    });

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- location object reference changes but we only care about pathname
  }, [location.pathname, context, includeHome, params]);

  return breadcrumbs;
}

/**
 * Get the context key for a dynamic path
 * @param {string} path - The current path
 * @param {Object} params - Route params
 * @returns {string|null} The context key
 */
function getContextKeyForPath(path, params) {
  // Map paths to context keys based on params
  if (path.includes('/exercises/') && params.exerciseId) {
    return 'exerciseName';
  }
  if (path.includes('/crews/') && params.crewId) {
    return 'crewName';
  }
  if (path.includes('/issues/') && params.id) {
    return 'issueTitle';
  }
  if (path.includes('/skills/') && params.treeId) {
    return 'skillTreeName';
  }
  if (path.includes('/martial-arts/') && params.disciplineId) {
    return 'disciplineName';
  }
  if (path.includes('/achievements/verify/') && params.achievementId) {
    return 'achievementName';
  }
  if (path.includes('/verifications/') && params.verificationId) {
    return 'verificationName';
  }
  if (path.includes('/docs/') && params.docId) {
    return 'docTitle';
  }

  return null;
}

/**
 * Get a dynamic label based on parent route
 * @param {string} parentSegment - The parent route segment
 * @param {string} segment - The dynamic segment
 * @returns {string} The label
 */
function getDynamicLabel(parentSegment, segment) {
  const labelMap = {
    'exercises': 'Exercise',
    'crews': 'Crew',
    'issues': `Issue #${segment.substring(0, 8)}`,
    'skills': 'Skill Tree',
    'martial-arts': 'Discipline',
    'achievements': 'Achievement',
    'verifications': 'Verification',
    'docs': 'Document',
    'verify': 'Verification',
    'witness': 'Attestation',
  };

  return labelMap[parentSegment] || formatSegmentLabel(segment);
}

/**
 * Hook to get breadcrumbs with entity data resolution
 * Use this when you have entity data available in your component
 * @param {Object} entityData - Object containing resolved entity names
 * @returns {Array} Array of breadcrumb items with resolved labels
 */
export function useBreadcrumbsWithData(entityData) {
  return useBreadcrumbs({ context: entityData });
}

export default useBreadcrumbs;
