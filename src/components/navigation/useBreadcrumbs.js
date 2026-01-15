/**
 * useBreadcrumbs Hook
 *
 * Auto-generates breadcrumbs from the current route.
 * Handles dynamic segments, route hierarchy, and provides
 * navigation utilities.
 *
 * Features:
 * - Auto-generates from current route
 * - Resolves dynamic segments with context
 * - Builds proper hierarchy from parent configuration
 * - Provides navigation utilities (goBack, isNested)
 * - Caches breadcrumbs for performance
 *
 * @example
 * const {
 *   breadcrumbs,     // Array of breadcrumb items
 *   currentPage,     // Current page label
 *   goBack,          // Navigate to previous breadcrumb
 *   isNested         // True if more than 1 level deep
 * } = useBreadcrumbs();
 *
 * // With context for dynamic labels
 * const { breadcrumbs } = useBreadcrumbs({
 *   context: {
 *     crewName: 'Iron Warriors',
 *     exerciseName: 'Bench Press',
 *   }
 * });
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  BREADCRUMB_ROUTES,
  EXCLUDED_ROUTES,
  DYNAMIC_CONTEXT_KEYS,
  DYNAMIC_FALLBACK_LABELS,
  getRouteConfig,
  resolveDynamicLabel,
} from './breadcrumbRoutes';

/**
 * Check if a segment looks like a UUID
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Check if a segment is a dynamic ID (UUID or numeric)
 * @param {string} segment - Route segment
 * @returns {boolean}
 */
export function isDynamicSegment(segment) {
  return isUUID(segment) || /^\d+$/.test(segment);
}

/**
 * Format a segment as a readable label
 * @param {string} segment - Route segment
 * @returns {string}
 */
export function formatSegmentLabel(segment) {
  if (isUUID(segment)) return 'Details';
  if (/^\d+$/.test(segment)) return `#${segment}`;

  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Find the context key for a dynamic segment based on parent
 * @param {string} parentSegment - Parent route segment
 * @param {string} segment - Current segment (ID)
 * @returns {string|null}
 */
function findContextKeyForSegment(parentSegment, segment) {
  const parentToContext = {
    'exercises': 'exerciseName',
    'workout': 'workoutName',
    'crews': 'crewName',
    'rivals': 'rivalName',
    'competitions': 'competitionName',
    'messages': 'conversationName',
    'locations': 'locationName',
    'goals': 'goalName',
    'standards': 'standardName',
    'pt-tests': 'testName',
    'skills': 'skillTreeName',
    'martial-arts': 'disciplineName',
    'achievements': 'achievementName',
    'verifications': 'verificationName',
    'issues': 'issueNumber',
    'recipes': 'recipeName',
    'plans': 'planName',
    'docs': 'docTitle',
    'skins': 'skinName',
    'trainers': 'trainerName',
    'plugins': 'pluginName',
    'profile': 'username',
  };

  return parentToContext[parentSegment] || null;
}

/**
 * Build the breadcrumb path by walking up the route hierarchy
 * @param {string} pathname - Current pathname
 * @param {Object} params - Route params
 * @param {Object} context - Context with resolved names
 * @returns {Array} Array of breadcrumb items
 */
function buildBreadcrumbPath(pathname, params, context) {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [];

  // Build path incrementally
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    // Try to get route config
    const config = getRouteConfig(currentPath);

    let label;
    let icon;

    if (config) {
      // Use configured label
      label = config.dynamic
        ? resolveDynamicLabel(config.label, context, config.params || params)
        : config.label;
      icon = config.icon;
    } else {
      // Fall back to segment formatting
      if (isDynamicSegment(segment)) {
        // Try to find context key based on parent
        const parentSegment = segments[i - 1];
        const contextKey = findContextKeyForSegment(parentSegment, segment);
        label = context[contextKey] || formatSegmentLabel(segment);
      } else {
        label = formatSegmentLabel(segment);
      }
    }

    breadcrumbs.push({
      label,
      path: isLast ? undefined : currentPath,
      icon,
      isFirst: i === 0,
      isLast,
      segment,
    });
  }

  return breadcrumbs;
}

/**
 * useBreadcrumbs Hook
 *
 * @param {Object} options - Hook options
 * @param {Object} options.context - Context object with entity names
 * @param {boolean} options.includeHome - Include home as first breadcrumb
 * @returns {Object} Breadcrumb state and utilities
 */
export function useBreadcrumbs(options = {}) {
  const { context = {}, includeHome = false } = options;
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  // Cache previous breadcrumbs for smooth transitions
  const previousBreadcrumbsRef = useRef([]);

  // Build breadcrumbs from current route
  const breadcrumbs = useMemo(() => {
    const { pathname } = location;

    // Check if route should be excluded
    if (EXCLUDED_ROUTES.includes(pathname)) {
      return [];
    }

    const crumbs = buildBreadcrumbPath(pathname, params, context);

    // Optionally prepend home
    if (includeHome && crumbs.length > 0 && crumbs[0].path !== '/') {
      crumbs.unshift({
        label: 'Home',
        path: '/',
        icon: 'Home',
        isFirst: true,
        isLast: false,
        segment: '',
      });
      // Update isFirst on the next item
      if (crumbs[1]) crumbs[1].isFirst = false;
    }

    return crumbs;
  }, [location.pathname, params, context, includeHome]);

  // Update previous breadcrumbs for transition comparison
  useEffect(() => {
    previousBreadcrumbsRef.current = breadcrumbs;
  }, [breadcrumbs]);

  // Get current page label
  const currentPage = useMemo(() => {
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
    return lastCrumb?.label || '';
  }, [breadcrumbs]);

  // Navigate to previous breadcrumb
  const goBack = useCallback(() => {
    if (breadcrumbs.length > 1) {
      const previousCrumb = breadcrumbs[breadcrumbs.length - 2];
      if (previousCrumb?.path) {
        navigate(previousCrumb.path);
      }
    } else {
      // Fall back to browser back
      navigate(-1);
    }
  }, [breadcrumbs, navigate]);

  // Navigate to specific breadcrumb
  const goTo = useCallback((path) => {
    if (path) {
      navigate(path);
    }
  }, [navigate]);

  // Check if we're nested (more than 1 level deep)
  const isNested = breadcrumbs.length > 1;

  // Get parent breadcrumb (useful for back navigation)
  const parentCrumb = useMemo(() => {
    return breadcrumbs.length > 1
      ? breadcrumbs[breadcrumbs.length - 2]
      : null;
  }, [breadcrumbs]);

  // Get depth of current route
  const depth = breadcrumbs.length;

  // Check if route changed (for transition direction)
  const routeChanged = useMemo(() => {
    const prevPath = previousBreadcrumbsRef.current[previousBreadcrumbsRef.current.length - 1]?.path;
    const currentPath = breadcrumbs[breadcrumbs.length - 1]?.path;
    return prevPath !== currentPath;
  }, [breadcrumbs]);

  // Determine navigation direction
  const direction = useMemo(() => {
    const prevDepth = previousBreadcrumbsRef.current.length;
    const currentDepth = breadcrumbs.length;

    if (currentDepth > prevDepth) return 'forward';
    if (currentDepth < prevDepth) return 'back';
    return 'same';
  }, [breadcrumbs]);

  return {
    breadcrumbs,
    currentPage,
    goBack,
    goTo,
    isNested,
    parentCrumb,
    depth,
    direction,
    routeChanged,
  };
}

/**
 * useBreadcrumbsWithData - Hook with automatic data fetching context
 *
 * Use this when you have entity data available in your component
 * and want to pass it to breadcrumbs for label resolution.
 *
 * @param {Object} entityData - Object containing resolved entity names
 * @returns {Object} Breadcrumb state and utilities
 */
export function useBreadcrumbsWithData(entityData) {
  return useBreadcrumbs({ context: entityData });
}

/**
 * useBreadcrumbContext - Create context object from common data sources
 *
 * Helper to build the context object from various data sources.
 *
 * @param {Object} options - Data sources
 * @returns {Object} Context object for breadcrumbs
 */
export function useBreadcrumbContext(options = {}) {
  const {
    exercise,
    workout,
    crew,
    rival,
    competition,
    conversation,
    location: locationData,
    goal,
    standard,
    test,
    skill,
    discipline,
    achievement,
    verification,
    issue,
    recipe,
    plan,
    doc,
    skin,
    trainer,
    plugin,
    user,
  } = options;

  return useMemo(() => ({
    exerciseName: exercise?.name,
    workoutName: workout?.name,
    crewName: crew?.name,
    rivalName: rival?.name || rival?.username,
    competitionName: competition?.name,
    conversationName: conversation?.name || conversation?.title,
    locationName: locationData?.name,
    goalName: goal?.name || goal?.title,
    standardName: standard?.name,
    testName: test?.name,
    skillTreeName: skill?.treeName,
    skillName: skill?.name,
    disciplineName: discipline?.name,
    achievementName: achievement?.name,
    verificationName: verification?.name,
    issueNumber: issue?.number?.toString(),
    recipeName: recipe?.name,
    planName: plan?.name,
    docTitle: doc?.title,
    skinName: skin?.name,
    trainerName: trainer?.name || trainer?.username,
    pluginName: plugin?.name,
    username: user?.username,
  }), [
    exercise, workout, crew, rival, competition, conversation,
    locationData, goal, standard, test, skill, discipline,
    achievement, verification, issue, recipe, plan, doc,
    skin, trainer, plugin, user,
  ]);
}

/**
 * useBreadcrumbTitle - Get page title from breadcrumbs
 *
 * Returns a formatted title string based on breadcrumb trail.
 * Useful for setting document.title.
 *
 * @param {Object} options - Options
 * @param {string} options.separator - Separator between segments (default: ' | ')
 * @param {string} options.suffix - Suffix to append (default: 'MuscleMap')
 * @returns {string} Formatted title
 */
export function useBreadcrumbTitle(options = {}) {
  const { separator = ' | ', suffix = 'MuscleMap' } = options;
  const { breadcrumbs, currentPage } = useBreadcrumbs();

  return useMemo(() => {
    if (!currentPage) return suffix;
    return `${currentPage}${separator}${suffix}`;
  }, [currentPage, separator, suffix]);
}

export default useBreadcrumbs;
