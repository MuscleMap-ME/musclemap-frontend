/**
 * UI Components - Tier-Aware Component Library
 *
 * Knuth-inspired components that adapt to rendering tier:
 * - FULL: Full effects, animations, glassmorphism
 * - REDUCED: Styling but no animations
 * - MINIMAL: Basic CSS, no effects
 * - TEXT_ONLY: Pure semantic HTML
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * import { Button, Card, CardBody, Input } from '@/components/ui';
 *
 * <Card>
 *   <CardBody>
 *     <Input label="Email" type="email" />
 *     <Button variant="primary">Submit</Button>
 *   </CardBody>
 * </Card>
 */

// Button
export { Button, default as ButtonComponent } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Card
export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type {
  CardProps,
  CardVariant,
  CardPadding,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
} from './Card';

// Input
export { Input, default as InputComponent } from './Input';
export type { InputProps, InputSize, InputVariant } from './Input';

// Switch
export { Switch, default as SwitchComponent } from './Switch';
export type { SwitchProps, SwitchSize } from './Switch';

// Select
export { Select, default as SelectComponent } from './Select';
export type { SelectProps, SelectOption, SelectSize } from './Select';

// Badge
export { Badge, default as BadgeComponent } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Modal
export { Modal, default as ModalComponent } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

// Spinner
export { Spinner, default as SpinnerComponent } from './Spinner';
export type { SpinnerProps, SpinnerSize, SpinnerVariant } from './Spinner';

// Skeleton
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList,
  default as SkeletonComponent,
} from './Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton';

// Re-export existing glass components for backwards compatibility
export { GlassButton, GlassIconButton } from '../glass/GlassButton';
export { GlassSurface } from '../glass/GlassSurface';
