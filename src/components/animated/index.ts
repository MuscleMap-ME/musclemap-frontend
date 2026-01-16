/**
 * Animated Components
 *
 * Collection of animated UI components for the MuscleMap design system.
 * All components respect prefers-reduced-motion accessibility preference.
 *
 * @example
 * // Basic counter
 * import { AnimatedNumber } from '@/components/animated';
 * <AnimatedNumber value={1234} />
 *
 * // With formatting
 * <AnimatedNumber value={1234567} format="compact" /> // Shows 1.2M
 *
 * // With glow effect (auto colors: green for increase, red for decrease)
 * <AnimatedNumber value={xp} glowOnChange glowColor="auto" suffix=" XP" />
 *
 * // Currency
 * <AnimatedCurrency value={99.99} />
 *
 * // Percentage (0.75 shows as 75%)
 * <AnimatedPercentage value={0.75} />
 *
 * // Count up from zero on initial load with delay
 * <AnimatedNumber value={score} countUp delay={500} />
 *
 * // With completion callback
 * <AnimatedNumber value={score} onComplete={() => console.log('Done!')} />
 *
 * // Training Units
 * <AnimatedTU value={15000} />
 *
 * // Odometer style (rolling digits)
 * <AnimatedNumber value={1234} variant="odometer" />
 */

export {
  default as AnimatedNumber,
  AnimatedCurrency,
  AnimatedPercentage,
  AnimatedPercent,
  AnimatedCount,
  AnimatedCompact,
  AnimatedCredits,
  AnimatedXP,
  AnimatedTU,
} from './AnimatedNumber';
