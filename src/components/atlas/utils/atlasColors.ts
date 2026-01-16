/**
 * Atlas Color Utilities
 *
 * Color mapping and theming for atlas visualizations.
 */

// Category color palette (matches MuscleMap design tokens)
export const CATEGORY_COLORS: Record<string, string> = {
  core: '#3b82f6',       // Blue
  community: '#22c55e',  // Green
  account: '#f59e0b',    // Amber
  health: '#ec4899',     // Pink
  docs: '#8b5cf6',       // Purple
  issues: '#ef4444',     // Red
  auth: '#6b7280',       // Gray
  admin: '#991b1b',      // Dark red
  default: '#64748b',    // Slate
};

// Protection level colors
export const PROTECTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  public: {
    bg: 'rgba(34, 197, 94, 0.1)',
    text: '#22c55e',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  protected: {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  admin: {
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#ef4444',
    border: 'rgba(239, 68, 68, 0.3)',
  },
};

// Status colors for roadmap
export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  completed: {
    bg: 'rgba(34, 197, 94, 0.1)',
    text: '#22c55e',
    border: 'rgba(34, 197, 94, 0.3)',
  },
  'in-progress': {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  planned: {
    bg: 'rgba(107, 114, 128, 0.1)',
    text: '#6b7280',
    border: 'rgba(107, 114, 128, 0.3)',
  },
};

/**
 * Get category color with fallback
 */
export function getCategoryColor(categoryId: string): string {
  return CATEGORY_COLORS[categoryId] || CATEGORY_COLORS.default;
}

/**
 * Get color with alpha
 */
export function withAlpha(color: string, alpha: number): string {
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Handle rgb/rgba
  if (color.startsWith('rgb')) {
    const match = color.match(/[\d.]+/g);
    if (match) {
      const [r, g, b] = match;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return color;
}

/**
 * Generate edge color between nodes
 */
export function getEdgeColor(sourceCategory: string, targetCategory: string): string {
  const sourceColor = getCategoryColor(sourceCategory);
  const _targetColor = getCategoryColor(targetCategory);

  // If same category, use that color
  if (sourceCategory === targetCategory) {
    return withAlpha(sourceColor, 0.3);
  }

  // Otherwise, use neutral
  return 'rgba(255, 255, 255, 0.1)';
}

/**
 * Get highlight color for search matches
 */
export function getHighlightColor(matchType: string): string {
  switch (matchType) {
    case 'label':
      return 'rgba(59, 130, 246, 0.5)'; // Blue
    case 'path':
      return 'rgba(139, 92, 246, 0.5)'; // Purple
    case 'description':
      return 'rgba(107, 114, 128, 0.5)'; // Gray
    default:
      return 'rgba(255, 255, 255, 0.3)';
  }
}
