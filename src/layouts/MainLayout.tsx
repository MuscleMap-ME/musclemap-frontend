/**
 * MainLayout Component
 *
 * Main application layout that provides consistent structure across pages.
 * Includes:
 * - Responsive breadcrumb navigation
 * - Skip links for accessibility
 * - Main content wrapper with proper ARIA attributes
 *
 * @example
 * // Basic usage in a page
 * import { MainLayout } from '@/layouts';
 *
 * function MyPage() {
 *   return (
 *     <MainLayout>
 *       <h1>My Page Content</h1>
 *     </MainLayout>
 *   );
 * }
 *
 * @example
 * // With custom breadcrumb context
 * <MainLayout breadcrumbContext={{ userName: 'John' }}>
 *   <ProfileContent />
 * </MainLayout>
 *
 * @example
 * // Without breadcrumbs (for landing/auth pages)
 * <MainLayout showBreadcrumbs={false}>
 *   <LandingContent />
 * </MainLayout>
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  ResponsiveBreadcrumbs,
  GlassBreadcrumbs,
} from '../components/navigation';

// Routes that should NOT show breadcrumbs
const EXCLUDED_ROUTES = [
  '/',           // Landing page
  '/login',      // Auth pages
  '/signup',
  '/onboarding',
  '/live',       // Full-screen live monitor
];

// Routes with minimal layout (no glass background)
const MINIMAL_ROUTES = [
  '/',
  '/login',
  '/signup',
];

/**
 * Check if current route should show breadcrumbs
 * @param {string} pathname - Current route pathname
 * @returns {boolean}
 */
function shouldShowBreadcrumbs(pathname) {
  // Exact matches
  if (EXCLUDED_ROUTES.includes(pathname)) {
    return false;
  }
  // Pattern matches (e.g., /login/callback)
  if (pathname.startsWith('/login/') || pathname.startsWith('/signup/')) {
    return false;
  }
  return true;
}

/**
 * Check if route uses minimal layout
 * @param {string} pathname - Current route pathname
 * @returns {boolean}
 */
function isMinimalRoute(pathname) {
  return MINIMAL_ROUTES.includes(pathname);
}

/**
 * MainLayout Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {boolean} props.showBreadcrumbs - Override breadcrumb visibility (default: auto)
 * @param {string} props.breadcrumbVariant - 'responsive' | 'glass' | 'compact' (default: 'responsive')
 * @param {Object} props.breadcrumbContext - Context for resolving dynamic breadcrumb labels
 * @param {string} props.className - Additional CSS classes for the layout container
 * @param {boolean} props.padded - Add standard padding to content (default: false)
 * @param {number} props.maxItems - Max visible breadcrumb items before truncation
 */
export function MainLayout({
  children,
  showBreadcrumbs: showBreadcrumbsProp,
  breadcrumbVariant = 'responsive',
  breadcrumbContext,
  className,
  padded = false,
  maxItems = 4,
}) {
  const location = useLocation();
  const pathname = location.pathname;

  // Determine if breadcrumbs should be shown
  const shouldShow = useMemo(() => {
    if (showBreadcrumbsProp !== undefined) {
      return showBreadcrumbsProp;
    }
    return shouldShowBreadcrumbs(pathname);
  }, [showBreadcrumbsProp, pathname]);

  const isMinimal = isMinimalRoute(pathname);

  // Select breadcrumb component based on variant
  const BreadcrumbComponent = useMemo(() => {
    switch (breadcrumbVariant) {
      case 'glass':
        return GlassBreadcrumbs;
      case 'responsive':
      default:
        return ResponsiveBreadcrumbs;
    }
  }, [breadcrumbVariant]);

  return (
    <div
      className={clsx(
        'min-h-screen',
        !isMinimal && 'bg-[var(--void-base)]',
        className
      )}
    >
      {/* Breadcrumbs Section - Below navigation header */}
      {shouldShow && (
        <div
          className={clsx(
            'sticky top-16 z-30', // Below the main nav (z-40), above content
            'px-4 md:px-6 py-2',
            'bg-[var(--void-base)]/80 backdrop-blur-sm',
            'border-b border-[var(--border-subtle)]'
          )}
        >
          <div className="max-w-6xl mx-auto">
            <BreadcrumbComponent
              context={breadcrumbContext}
              maxItems={maxItems}
              showHome
              includeHome={false}
              animate
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        role="main"
        className={clsx(
          padded && 'px-4 md:px-6 py-6'
        )}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * PageHeader Component
 *
 * Standard page header with title, description, and optional actions.
 * Use within MainLayout for consistent styling.
 *
 * @param {Object} props
 * @param {string} props.title - Page title (h1)
 * @param {string} props.description - Optional description text
 * @param {React.ReactNode} props.actions - Optional action buttons/links
 * @param {string} props.className - Additional CSS classes
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-[var(--text-secondary)] mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * PageContent Component
 *
 * Content wrapper with optional max-width constraint.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content
 * @param {boolean} props.constrained - Apply max-width (default: true)
 * @param {string} props.className - Additional CSS classes
 */
export function PageContent({
  children,
  constrained = true,
  className,
}) {
  return (
    <div
      className={clsx(
        constrained && 'max-w-6xl mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

export default MainLayout;
