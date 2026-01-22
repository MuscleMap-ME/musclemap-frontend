/**
 * SkeletonLoader Components
 *
 * A collection of skeleton loading states for better perceived performance.
 * These show placeholder content while data is loading.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// Base shimmer animation
const shimmer = {
  hidden: { opacity: 0.4 },
  visible: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: 'reverse' as const,
      duration: 0.8,
    },
  },
};

// Basic skeleton line
export function SkeletonLine({ className = '', animate = true }: SkeletonProps) {
  const Component = animate ? motion.div : 'div';
  return (
    <Component
      className={`bg-white/10 rounded ${className}`}
      variants={shimmer}
      initial="hidden"
      animate="visible"
    />
  );
}

// Skeleton circle (for avatars)
export function SkeletonCircle({ className = '', animate = true }: SkeletonProps) {
  const Component = animate ? motion.div : 'div';
  return (
    <Component
      className={`bg-white/10 rounded-full ${className}`}
      variants={shimmer}
      initial="hidden"
      animate="visible"
    />
  );
}

// Skeleton card
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-800/50 rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle className="w-10 h-10" />
        <div className="flex-1">
          <SkeletonLine className="h-4 w-3/4 mb-2" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonLine className="h-4 w-full mb-2" />
      <SkeletonLine className="h-4 w-5/6 mb-2" />
      <SkeletonLine className="h-4 w-4/6" />
    </div>
  );
}

// Skeleton for exercise cards
export function SkeletonExerciseCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-2xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <SkeletonCircle className="w-12 h-12" />
        <div className="flex-1">
          <SkeletonLine className="h-5 w-3/4 mb-2" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <SkeletonLine className="h-8 w-16 rounded-xl" />
        <SkeletonLine className="h-8 w-16 rounded-xl" />
        <SkeletonLine className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  );
}

// Skeleton for workout template cards
export function SkeletonTemplateCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-800/50 rounded-2xl overflow-hidden ${className}`}>
      <SkeletonLine className="h-24 rounded-none" />
      <div className="p-4">
        <SkeletonLine className="h-5 w-3/4 mb-2" />
        <SkeletonLine className="h-3 w-full mb-3" />
        <div className="flex gap-2">
          <SkeletonLine className="h-6 w-20 rounded-full" />
          <SkeletonLine className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for stat cards
export function SkeletonStatCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-800/50 rounded-xl p-4 ${className}`}>
      <SkeletonLine className="h-3 w-1/2 mb-3" />
      <SkeletonLine className="h-8 w-3/4 mb-2" />
      <SkeletonLine className="h-2 w-full rounded-full" />
    </div>
  );
}

// Skeleton for list items
export function SkeletonListItem({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      <SkeletonCircle className="w-10 h-10" />
      <div className="flex-1">
        <SkeletonLine className="h-4 w-3/4 mb-1" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
      <SkeletonLine className="h-8 w-8 rounded-lg" />
    </div>
  );
}

// Skeleton for dashboard widgets
export function SkeletonDashboardWidget({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-white/5 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonLine className="h-5 w-1/3" />
        <SkeletonCircle className="w-8 h-8" />
      </div>
      <SkeletonLine className="h-12 w-2/3 mb-4" />
      <div className="space-y-2">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-5/6" />
        <SkeletonLine className="h-3 w-4/6" />
      </div>
    </div>
  );
}

// Skeleton for profile header
export function SkeletonProfileHeader({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <SkeletonCircle className="w-24 h-24 mb-4" />
      <SkeletonLine className="h-6 w-40 mb-2" />
      <SkeletonLine className="h-4 w-32 mb-4" />
      <div className="flex gap-4">
        <div className="text-center">
          <SkeletonLine className="h-6 w-12 mx-auto mb-1" />
          <SkeletonLine className="h-3 w-16" />
        </div>
        <div className="text-center">
          <SkeletonLine className="h-6 w-12 mx-auto mb-1" />
          <SkeletonLine className="h-3 w-16" />
        </div>
        <div className="text-center">
          <SkeletonLine className="h-6 w-12 mx-auto mb-1" />
          <SkeletonLine className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for feed post
export function SkeletonFeedPost({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-gray-800/50 rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle className="w-10 h-10" />
        <div className="flex-1">
          <SkeletonLine className="h-4 w-32 mb-1" />
          <SkeletonLine className="h-3 w-20" />
        </div>
      </div>
      <SkeletonLine className="h-4 w-full mb-2" />
      <SkeletonLine className="h-4 w-5/6 mb-4" />
      <SkeletonLine className="h-40 w-full rounded-xl mb-4" />
      <div className="flex gap-4">
        <SkeletonLine className="h-8 w-16 rounded-lg" />
        <SkeletonLine className="h-8 w-16 rounded-lg" />
        <SkeletonLine className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

// Grid of skeleton cards
interface SkeletonGridProps {
  count?: number;
  columns?: number;
  CardComponent?: React.ComponentType<SkeletonProps>;
  className?: string;
}

export function SkeletonGrid({
  count = 6,
  columns = 2,
  CardComponent = SkeletonCard,
  className = '',
}: SkeletonGridProps) {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardComponent key={i} />
      ))}
    </div>
  );
}

// List of skeleton items
interface SkeletonListProps {
  count?: number;
  ItemComponent?: React.ComponentType<SkeletonProps>;
  className?: string;
}

export function SkeletonList({
  count = 5,
  ItemComponent = SkeletonListItem,
  className = '',
}: SkeletonListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <ItemComponent key={i} />
      ))}
    </div>
  );
}

// Full page skeleton
export function SkeletonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <SkeletonLine className="h-8 w-32" />
        <SkeletonCircle className="w-10 h-10" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Main content */}
      <SkeletonDashboardWidget className="mb-4" />
      <SkeletonDashboardWidget className="mb-4" />
      <SkeletonCard />
    </div>
  );
}

export default {
  SkeletonLine,
  SkeletonCircle,
  SkeletonCard,
  SkeletonExerciseCard,
  SkeletonTemplateCard,
  SkeletonStatCard,
  SkeletonListItem,
  SkeletonDashboardWidget,
  SkeletonProfileHeader,
  SkeletonFeedPost,
  SkeletonGrid,
  SkeletonList,
  SkeletonPage,
};
