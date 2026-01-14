/**
 * CommandItem - Individual result item for CommandPalette
 *
 * Displays a single command/search result with icon, title,
 * description, and optional keyboard shortcut. Supports
 * highlighted text for search matches.
 */

import React, { forwardRef, memo } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Dumbbell,
  Activity,
  Map,
  BarChart3,
  TrendingUp,
  Target,
  User,
  Trophy,
  Coins,
  Heart,
  Apple,
  Sparkles,
  Users,
  Swords,
  Hand,
  MessageCircle,
  UserCheck,
  Play,
  Plus,
  Calendar,
  MapPin,
  Settings,
  Bell,
  Shield,
  Palette,
  Clock,
  ArrowRight,
  Search,
  Zap,
  Compass,
} from 'lucide-react';

// ============================================
// ICON MAPPING
// ============================================

// Map icon names to Lucide components
const ICON_MAP = {
  LayoutDashboard,
  Dumbbell,
  Activity,
  Map,
  BarChart3,
  TrendingUp,
  Target,
  User,
  Trophy,
  Coins,
  Heart,
  Apple,
  Sparkles,
  Users,
  Swords,
  Hand,
  MessageCircle,
  UserCheck,
  Play,
  Plus,
  Calendar,
  MapPin,
  Settings,
  Bell,
  Shield,
  Palette,
  Clock,
  ArrowRight,
  Search,
  Zap,
  Compass,
};

// Category to default icon
const CATEGORY_ICONS = {
  Pages: Compass,
  Exercises: Dumbbell,
  Actions: Zap,
  Community: Users,
  Settings: Settings,
  Recent: Clock,
};

/**
 * Resolve icon from string name or return component directly
 */
function resolveIcon(icon, category) {
  if (!icon) {
    return CATEGORY_ICONS[category] || ArrowRight;
  }

  if (typeof icon === 'string') {
    return ICON_MAP[icon] || CATEGORY_ICONS[category] || ArrowRight;
  }

  // Already a component
  return icon;
}

// ============================================
// ANIMATIONS
// ============================================

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (delay) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.15,
      delay: delay * 0.025,
    },
  }),
};

// ============================================
// HIGHLIGHTED TEXT COMPONENT
// ============================================

/**
 * Renders text with highlighted segments
 */
const HighlightedText = memo(function HighlightedText({ segments, className }) {
  if (!segments || segments.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.highlight ? (
          <mark
            key={i}
            className="bg-transparent text-[var(--brand-blue-400)] font-semibold"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </span>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

const CommandItem = forwardRef(function CommandItem(
  {
    item,
    index = 0,
    isSelected = false,
    onClick,
    highlights,
  },
  ref
) {
  const {
    title,
    description,
    icon,
    category,
    shortcut,
  } = item;

  const IconComponent = resolveIcon(icon, category);

  return (
    <motion.button
      ref={ref}
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      onClick={() => onClick?.(item)}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left
        rounded-xl transition-all duration-150 group
        ${
          isSelected
            ? 'bg-[var(--brand-blue-500)]/15 border border-[var(--brand-blue-500)]/30'
            : 'bg-transparent border border-transparent hover:bg-white/5'
        }
      `}
      style={{
        boxShadow: isSelected
          ? '0 0 20px rgba(0, 102, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
          : 'none',
      }}
      role="option"
      aria-selected={isSelected}
    >
      {/* Icon */}
      <div
        className={`
          w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0
          transition-colors duration-150
          ${
            isSelected
              ? 'bg-[var(--brand-blue-500)] text-white'
              : 'bg-white/10 text-white/60 group-hover:bg-white/15 group-hover:text-white/80'
          }
        `}
      >
        <IconComponent size={20} strokeWidth={1.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div
          className={`
            font-medium truncate transition-colors duration-150
            ${isSelected ? 'text-white' : 'text-white/90'}
          `}
        >
          {highlights ? (
            <HighlightedText segments={highlights} />
          ) : (
            title
          )}
        </div>

        {/* Description */}
        {description && (
          <div
            className={`
              text-sm truncate transition-colors duration-150
              ${isSelected ? 'text-white/70' : 'text-white/50'}
            `}
          >
            {description}
          </div>
        )}
      </div>

      {/* Shortcut / Enter hint */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {shortcut && !isSelected && (
          <span className="text-xs text-white/30 font-mono hidden sm:block">
            {shortcut}
          </span>
        )}

        {isSelected && (
          <kbd
            className="
              px-2 py-1 text-xs font-medium rounded
              bg-white/10 text-white/70
              border border-white/10
            "
          >
            Enter
          </kbd>
        )}
      </div>
    </motion.button>
  );
});

// ============================================
// CATEGORY HEADER COMPONENT
// ============================================

export const CategoryHeader = memo(function CategoryHeader({
  category,
  count,
  onClear,
}) {
  const IconComponent = CATEGORY_ICONS[category] || ArrowRight;

  return (
    <div className="flex items-center justify-between px-4 py-2 mt-2 first:mt-0">
      <div className="flex items-center gap-2">
        <IconComponent size={14} className="text-white/30" strokeWidth={1.5} />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {category}
        </span>
        {count !== undefined && (
          <span className="text-xs text-white/20">({count})</span>
        )}
      </div>

      {onClear && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
});

// ============================================
// NO RESULTS COMPONENT
// ============================================

export const NoResults = memo(function NoResults({ query }) {
  return (
    <div className="py-12 text-center">
      <div
        className="
          w-16 h-16 mx-auto mb-4 rounded-2xl
          bg-white/5 flex items-center justify-center
        "
      >
        <Search size={28} className="text-white/20" strokeWidth={1.5} />
      </div>
      <p className="text-white/60 font-medium">No results found</p>
      <p className="text-white/40 text-sm mt-1">
        {query
          ? `Nothing matches "${query}"`
          : 'Try searching for something'}
      </p>
      <div className="mt-6 text-xs text-white/30 space-y-1">
        <p>Try searching for:</p>
        <p className="text-white/50">&quot;workout&quot;, &quot;settings&quot;, &quot;profile&quot;</p>
      </div>
    </div>
  );
});

export default memo(CommandItem);
