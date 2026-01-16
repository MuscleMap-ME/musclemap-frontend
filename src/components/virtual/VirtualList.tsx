/**
 * VirtualList - Performant list rendering for low-end devices
 *
 * Wraps react-window's List with:
 * - Automatic height calculation
 * - Overscan optimization based on device tier
 * - Loading skeleton support
 * - Empty state handling
 * - Keyboard navigation support
 *
 * Use this for any list that might have 20+ items.
 */

import React, { useRef, useCallback, useMemo, forwardRef } from 'react';
import { List } from 'react-window';
import { useAdaptiveLoading } from '../../hooks';

/**
 * VirtualList - Renders only visible items for smooth scrolling
 *
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {number} props.itemHeight - Height of each item in pixels
 * @param {Function} props.renderItem - Render function (item, index, style) => ReactNode
 * @param {number} [props.height] - Container height (defaults to 400px or 100vh - offset)
 * @param {number} [props.width] - Container width (defaults to 100%)
 * @param {Function} [props.onItemsRendered] - Callback when visible items change
 * @param {ReactNode} [props.emptyState] - Component to show when list is empty
 * @param {ReactNode} [props.loadingState] - Component to show while loading
 * @param {boolean} [props.isLoading] - Whether data is loading
 * @param {string} [props.className] - Additional CSS classes
 * @param {number} [props.overscanCount] - Number of items to render outside visible area
 */
export const VirtualList = forwardRef(function VirtualList(
  {
    items = [],
    itemHeight = 72,
    renderItem,
    height = 400,
    width = '100%',
    onItemsRendered,
    emptyState,
    loadingState,
    isLoading = false,
    className = '',
    overscanCount: customOverscan,
    ...props
  },
  ref
) {
  const listRef = useRef(null);
  const { deviceTier } = useAdaptiveLoading();

  // Adaptive overscan based on device capability
  const overscanCount = useMemo(() => {
    if (customOverscan !== undefined) return customOverscan;

    // Low-end devices: minimal overscan to reduce memory/CPU
    // High-end devices: more overscan for smoother scrolling
    switch (deviceTier) {
      case 'low-end':
        return 1;
      case 'mid-tier':
        return 3;
      case 'high-end':
      default:
        return 5;
    }
  }, [deviceTier, customOverscan]);

  // Memoized row renderer
  const Row = useCallback(
    ({ index, style }) => {
      const item = items[index];
      return renderItem(item, index, style);
    },
    [items, renderItem]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!listRef.current) return;

      const { scrollOffset } = listRef.current.state;
      const visibleItems = Math.floor(height / itemHeight);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          listRef.current.scrollTo(scrollOffset + itemHeight);
          break;
        case 'ArrowUp':
          e.preventDefault();
          listRef.current.scrollTo(Math.max(0, scrollOffset - itemHeight));
          break;
        case 'PageDown':
          e.preventDefault();
          listRef.current.scrollTo(scrollOffset + visibleItems * itemHeight);
          break;
        case 'PageUp':
          e.preventDefault();
          listRef.current.scrollTo(Math.max(0, scrollOffset - visibleItems * itemHeight));
          break;
        case 'Home':
          e.preventDefault();
          listRef.current.scrollTo(0);
          break;
        case 'End':
          e.preventDefault();
          listRef.current.scrollToItem(items.length - 1);
          break;
      }
    },
    [height, itemHeight, items.length]
  );

  // Loading state
  if (isLoading && loadingState) {
    return loadingState;
  }

  // Empty state
  if (items.length === 0 && emptyState) {
    return emptyState;
  }

  // No items and no empty state
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`virtual-list-container ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Scrollable list"
    >
      <List
        ref={(el) => {
          listRef.current = el;
          if (ref) {
            if (typeof ref === 'function') ref(el);
            else ref.current = el;
          }
        }}
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscanCount}
        onItemsRendered={onItemsRendered}
        {...props}
      >
        {Row}
      </List>
    </div>
  );
});

/**
 * VirtualListItem - Wrapper for items in VirtualList
 * Provides consistent styling and accessibility
 */
export function VirtualListItem({ style, children, onClick, isSelected, className = '' }) {
  return (
    <div
      style={style}
      className={`virtual-list-item ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

/**
 * useVirtualListScroll - Hook for programmatic scrolling
 */
export function useVirtualListScroll(listRef) {
  const scrollToIndex = useCallback(
    (index, align = 'smart') => {
      if (listRef.current) {
        listRef.current.scrollToItem(index, align);
      }
    },
    [listRef]
  );

  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, [listRef]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      const { itemCount, itemSize } = listRef.current.props;
      listRef.current.scrollTo(itemCount * itemSize);
    }
  }, [listRef]);

  return { scrollToIndex, scrollToTop, scrollToBottom };
}

export default VirtualList;
