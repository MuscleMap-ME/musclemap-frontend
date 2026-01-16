/**
 * Feature Discovery Components
 *
 * A system for helping users discover features they haven't tried yet.
 * Shows rotating cards with engaging animations and tracks visited features
 * via localStorage.
 *
 * @example Basic Usage (Dashboard)
 * import { FeatureDiscovery } from '@/components/discovery';
 *
 * function Dashboard() {
 *   const navigate = useNavigate();
 *
 *   return (
 *     <FeatureDiscovery
 *       maxFeatures={3}
 *       layout="carousel"
 *       category="social"
 *       onFeatureClick={(feature) => navigate(feature.route)}
 *     />
 *   );
 * }
 *
 * @example Filtered by Category
 * import { FeatureDiscovery } from '@/components/discovery';
 *
 * <FeatureDiscovery category="social" layout="grid" maxFeatures={4} />
 *
 * @example List Layout (Sidebar)
 * import { FeatureDiscovery } from '@/components/discovery';
 *
 * <FeatureDiscovery maxFeatures={5} layout="list" />
 *
 * @example With Progress Indicator
 * import { FeatureDiscovery } from '@/components/discovery';
 *
 * <FeatureDiscovery
 *   maxFeatures={3}
 *   layout="grid"
 *   showProgress
 * />
 *
 * @example Using the Hook
 * import { useFeatureDiscovery } from '@/components/discovery';
 *
 * function SomeComponent() {
 *   const {
 *     undiscoveredFeatures, // features user hasn't tried
 *     discoveredFeatures,   // features user has tried
 *     markDiscovered,       // mark a feature as discovered
 *     dismissFeature,       // hide a feature from suggestions
 *     resetDiscovery,       // reset all discovery state
 *     getRecommendations,   // get personalized recommendations
 *   } = useFeatureDiscovery();
 *
 *   // Get top 3 personalized recommendations
 *   const recommendations = getRecommendations(3);
 *
 *   // Mark feature as discovered when user visits a page
 *   useEffect(() => {
 *     markDiscovered('muscle-map');
 *   }, []);
 * }
 */

// Main component
export { default as FeatureDiscovery } from './FeatureDiscovery';

// Additional exports from FeatureDiscovery
export { FeatureDiscoverySkeleton, FeatureDiscoveryCompact } from './FeatureDiscovery';

// Hook for programmatic access
export { useFeatureDiscovery } from './useFeatureDiscovery';

// Card components
export { default as FeatureCard } from './FeatureCard';
export { FeatureCardSkeleton, FeatureCardCompact } from './FeatureCard';

// Feature definitions and utilities
export {
  DISCOVERABLE_FEATURES,
  FEATURE_CATEGORIES,
  getFeaturesByCategory,
  getFeaturesByCategories,
  sortByPriority,
  getFeatureById,
  getNewFeatures,
  getPopularFeatures,
} from './featureDefinitions';

// Default export
export { default } from './FeatureDiscovery';
