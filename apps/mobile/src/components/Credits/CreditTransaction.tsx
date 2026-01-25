/**
 * Credit Transaction Component
 *
 * Displays a single credit transaction with icon, reason, and amount.
 * Used in transaction history and real-time credit earning.
 */
import React from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  SlideInRight,
} from 'react-native-reanimated';
import { XStack, YStack, Text } from 'tamagui';
import {
  Dumbbell,
  Trophy,
  Flame,
  Calendar,
  Medal,
  Users,
  ShoppingCart,
  Sparkles,
} from '@tamagui/lucide-icons';

// Icon component type inferred from one of the icons
type IconComponent = typeof Dumbbell;

// ============================================================================
// Types
// ============================================================================

export type TransactionType =
  | 'workout' // Completed workout
  | 'pr' // Personal record
  | 'achievement' // Achievement unlocked
  | 'daily' // Daily login bonus
  | 'leaderboard' // Leaderboard reward
  | 'crew' // Crew bonus
  | 'purchase' // Cosmetic purchase (negative)
  | 'bonus'; // Special bonus

export interface CreditTransactionProps {
  /** Transaction type determines icon and color */
  type: TransactionType;
  /** Amount (positive or negative) */
  amount: number;
  /** Description of the transaction */
  reason: string;
  /** Optional timestamp */
  timestamp?: Date;
  /** Enable enter/exit animations */
  animated?: boolean;
  /** Animation delay for staggered lists */
  animationDelay?: number;
  /** Custom style */
  style?: ViewStyle;
}

// Transaction type configurations
const TRANSACTION_CONFIG: Record<
  TransactionType,
  { icon: IconComponent; color: string; bgColor: string }
> = {
  workout: {
    icon: Dumbbell,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  pr: {
    icon: Flame,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  achievement: {
    icon: Trophy,
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
  },
  daily: {
    icon: Calendar,
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  leaderboard: {
    icon: Medal,
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
  },
  crew: {
    icon: Users,
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
  },
  purchase: {
    icon: ShoppingCart,
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
  bonus: {
    icon: Sparkles,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
};

// ============================================================================
// Component
// ============================================================================

export function CreditTransaction({
  type,
  amount,
  reason,
  timestamp,
  animated = true,
  animationDelay = 0,
  style,
}: CreditTransactionProps) {
  const config = TRANSACTION_CONFIG[type];
  const Icon = config.icon;
  const isPositive = amount >= 0;

  const content = (
    <XStack
      alignItems="center"
      gap="$3"
      padding="$3"
      backgroundColor="$color2"
      borderRadius="$3"
      borderLeftWidth={3}
      borderLeftColor={config.color}
      style={style}
    >
      {/* Icon */}
      <XStack
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        backgroundColor={config.bgColor}
        borderRadius="$2"
      >
        <Icon size={20} color={config.color} />
      </XStack>

      {/* Content */}
      <YStack flex={1} gap="$1">
        <Text
          fontSize={14}
          fontWeight="500"
          color="$color12"
          numberOfLines={1}
        >
          {reason}
        </Text>
        {timestamp && (
          <Text fontSize={12} color="$color10">
            {formatTimestamp(timestamp)}
          </Text>
        )}
      </YStack>

      {/* Amount */}
      <Text
        fontSize={16}
        fontWeight="700"
        fontFamily="$mono"
        color={isPositive ? '#10B981' : '#EF4444'}
      >
        {isPositive ? '+' : ''}{amount.toLocaleString()}
      </Text>
    </XStack>
  );

  if (animated) {
    return (
      <Animated.View
        entering={SlideInRight.delay(animationDelay).springify()}
        exiting={FadeOutUp}
      >
        {content}
      </Animated.View>
    );
  }

  return content;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

export default CreditTransaction;
