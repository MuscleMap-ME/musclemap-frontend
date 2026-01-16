/**
 * Animation Components
 *
 * Collection of animated UI components for the MuscleMap design system.
 * All components respect prefers-reduced-motion accessibility preference.
 *
 * @example
 * // Basic counter
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
 * // Count up from zero on initial load
 * <AnimatedNumber value={score} countUp />
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
} from './AnimatedNumber';
