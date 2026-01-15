/**
 * Transitions - Page transition and shared element animation components
 *
 * This module provides smooth page transitions and shared element morphing
 * for React applications using Framer Motion.
 *
 * Components:
 * - PageTransition - Wrapper for page enter/exit animations
 * - SharedElement - Element that morphs between pages
 * - TransitionProvider - Context provider for transition state
 *
 * Hooks:
 * - usePageTransition - Access transition state and navigation
 * - useSharedElement - Control shared element registration
 *
 * @example
 * // Wrap your app with TransitionProvider
 * import { TransitionProvider } from '@/components/transitions';
 *
 * <TransitionProvider>
 *   <Routes />
 * </TransitionProvider>
 *
 * // Use PageTransition in your pages
 * import { PageTransition, SharedElement } from '@/components/transitions';
 *
 * function ExerciseList() {
 *   return (
 *     <PageTransition variant="slideUp">
 *       {exercises.map(ex => (
 *         <SharedElement key={ex.id} id={`exercise-${ex.id}`}>
 *           <ExerciseCard {...ex} />
 *         </SharedElement>
 *       ))}
 *     </PageTransition>
 *   );
 * }
 */

// ============================================
// PAGE TRANSITION
// ============================================

export {
  default as PageTransition,
  PAGE_VARIANTS,
  DIRECTION_AWARE_VARIANTS,
  TRANSITION_PRESETS,
  FadeTransition,
  SlideTransition,
  SlideUpTransition,
  SlideDownTransition,
  ScaleTransition,
  ZoomTransition,
  RevealTransition,
  FlipTransition,
  NoTransition,
} from './PageTransition';

// ============================================
// SHARED ELEMENT
// ============================================

export {
  default as SharedElement,
  DEFAULT_TRANSITION,
  TRANSITION_PRESETS as SHARED_ELEMENT_PRESETS,
  SharedAvatar,
  SharedCard,
  SharedIcon,
  SharedImage,
  SharedButton,
  SharedText,
  SharedElementGroup,
  useSharedElement,
  useSharedElementTransition,
} from './SharedElement';

// ============================================
// PAGE TRANSITION HOOK
// ============================================

export {
  default as usePageTransition,
  useTransitionDirection,
  useIsTransitioning,
  useTransitionProgress,
  useNavigateWithTransition,
  useTransitionCallback,
  usePreloadOnHover,
  useRouteDirection,
  useScrollRestoration,
} from './usePageTransition';

// ============================================
// TRANSITION PROVIDER
// ============================================

export {
  default as TransitionProvider,
  useTransitionContext,
} from './TransitionProvider';

// ============================================
// CONVENIENCE EXPORTS
// ============================================

// Re-export commonly used items under simpler names
import PageTransition from './PageTransition';
import SharedElement from './SharedElement';
import TransitionProvider from './TransitionProvider';
import usePageTransition from './usePageTransition';

export const Transitions = {
  PageTransition,
  SharedElement,
  TransitionProvider,
  usePageTransition,
};

export default Transitions;
