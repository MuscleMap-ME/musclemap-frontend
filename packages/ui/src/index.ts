/**
 * @musclemap/ui
 *
 * Shared cross-platform UI components for MuscleMap.
 * Built with Tamagui for React and React Native compatibility.
 *
 * @example
 * import { Button, Card, Input, Text } from '@musclemap/ui';
 * import { tamaguiConfig } from '@musclemap/ui/tamagui.config';
 */

// Components
export { Button, type ButtonProps } from './Button';
export { Card, CardHeader, CardContent, CardFooter, type CardProps } from './Card';
export { Input, InputField, type InputProps } from './Input';
export { Text, H1, H2, H3, Paragraph, Label, Caption, type TextProps } from './Text';

// Theme
export { muscleMapColors, muscleMapSpacing, muscleMapRadius } from './theme/tokens';

// Re-export common Tamagui components for convenience
export {
  YStack,
  XStack,
  Stack,
  Separator,
  ScrollView,
  Avatar,
  Switch,
  Spinner,
  Sheet,
  Dialog,
  Popover,
  Tooltip,
  Tabs,
  Form,
  Label as TamaguiLabel,
  Theme,
  useTheme,
  TamaguiProvider,
} from 'tamagui';

// Re-export icons
export {
  Home,
  Dumbbell,
  User,
  Settings,
  LogOut,
  Plus,
  Minus,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  Shield,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Flame,
  Heart,
  Star,
  Target,
  Zap,
  Calendar,
  Clock,
  TrendingUp,
} from '@tamagui/lucide-icons';
