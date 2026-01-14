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
 *       maxVisible={3}
 *       autoRotate={true}
 *       onFeatureClick={(feature) => navigate(feature.path)}
 *     />
 *   );
 * }
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
 *   maxVisible={2}
 * />
 *
 * @example Compact Horizontal Version
 * import { FeatureDiscoveryCompact } from '@/components/discovery';
 *
 * <FeatureDiscoveryCompact
 *   onFeatureClick={(feature) => navigate(feature.path)}
 * />
 *
 * @example Programmatic Access
 * import { useFeatureDiscovery } from '@/components/discovery';
 *
 * function SomeComponent() {
 *   const {
 *     visited,
 *     markVisited,
 *     hasUnvisitedFeatures,
 *   } = useFeatureDiscovery();
 *
 *   // Check if user has explored all features
 *   if (!hasUnvisitedFeatures()) {
 *     // Show "explorer" achievement
 *   }
 * }
 */

// Main component
export { default as FeatureDiscovery } from './FeatureDiscovery';

// Additional exports from FeatureDiscovery
export {
  FeatureDiscoverySkeleton,
  FeatureDiscoveryCompact,
  useFeatureDiscovery,
} from './FeatureDiscovery';

// Card component
export { default as FeatureCard } from './FeatureCard';
export { FeatureCardSkeleton, FeatureCardCompact } from './FeatureCard';

// Feature definitions
export {
  DISCOVERABLE_FEATURES,
  FEATURE_CATEGORIES,
  getFeaturesByCategory,
  sortByPriority,
  getFeatureById,
} from './featureDefinitions';

// Default export
export { default } from './FeatureDiscovery';
