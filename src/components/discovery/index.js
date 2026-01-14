/**
 * Feature Discovery Components
 *
 * A system for helping users discover features they haven't tried yet.
 * Shows rotating cards with engaging animations and tracks visited features
 * via localStorage.
 *
 * @example Basic Usage
 * import { FeatureDiscovery } from '@/components/discovery';
 *
 * function Dashboard() {
 *   const navigate = useNavigate();
 *
 *   return (
 *     <FeatureDiscovery
 *       maxCards={3}
 *       onFeatureClick={(feature) => navigate(feature.route)}
 *     />
 *   );
 * }
 *
 * @example With Custom Handling
 * import { FeatureDiscovery } from '@/components/discovery';
 *
 * <FeatureDiscovery
 *   maxCards={4}
 *   onFeatureClick={(feature) => analytics.track('feature_discovered', feature.id)}
 *   exclude={['martial_arts']} // Hide from certain users
 * />
 *
 * @example Custom Features
 * import { FeatureDiscovery, DISCOVERABLE_FEATURES } from '@/components/discovery';
 *
 * // Filter to only show competitive features
 * const competitiveFeatures = DISCOVERABLE_FEATURES.filter(
 *   f => f.category === 'competitive'
 * );
 *
 * <FeatureDiscovery
 *   features={competitiveFeatures}
 *   maxCards={2}
 * />
 *
 * @example Compact Horizontal Version
 * import { FeatureDiscoveryCompact } from '@/components/discovery';
 *
 * <FeatureDiscoveryCompact
 *   onFeatureClick={(feature) => navigate(feature.route)}
 * />
 *
 * @example Programmatic Access (Hook)
 * import { useFeatureDiscovery } from '@/components/discovery';
 *
 * function SomeComponent() {
 *   const {
 *     unusedFeatures,
 *     markUsed,
 *     dismiss,
 *     getUnusedFeatures,
 *     hasUnusedFeatures,
 *   } = useFeatureDiscovery();
 *
 *   // Check if user has explored all features
 *   if (!hasUnusedFeatures()) {
 *     // Show "explorer" achievement
 *   }
 * }
 *
 * @example Hook with React Router Auto-Tracking
 * import { useFeatureDiscovery } from '@/components/discovery/useFeatureDiscovery';
 *
 * // This version auto-marks features as used when navigating to their routes
 * const { unusedFeatures, markUsed, dismiss } = useFeatureDiscovery();
 */

// Main component
export { default as FeatureDiscovery } from './FeatureDiscovery';

// Additional exports from FeatureDiscovery
export {
  FeatureDiscoverySkeleton,
  FeatureDiscoveryCompact,
  useFeatureDiscovery,
} from './FeatureDiscovery';

// Standalone hook with React Router integration
export { default as useFeatureDiscoveryWithRouter } from './useFeatureDiscovery';

// Card component
export { default as FeatureCard } from './FeatureCard';
export { FeatureCardSkeleton, FeatureCardCompact } from './FeatureCard';

// Feature definitions
export {
  DISCOVERABLE_FEATURES,
  FEATURE_CATEGORIES,
  getFeaturesByCategory,
  getFeaturesByCategories,
  sortByPriority,
  getFeatureById,
  getNewFeatures,
} from './featureDefinitions';

// Default export
export { default } from './FeatureDiscovery';
