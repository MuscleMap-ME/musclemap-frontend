/**
 * SearchOverlay - Search Input
 *
 * Search input with clear button for filtering map nodes.
 */

import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { SearchOverlayProps } from '../types';

export function SearchOverlay({
  value,
  onChange,
  placeholder = 'Search...',
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="
        relative flex items-center
        bg-glass-dark-30 backdrop-blur-glass-md
        border border-glass-default rounded-glass-lg
        focus-within:border-glass-brand-glow focus-within:shadow-glow-brand-sm
        transition-all duration-fast
      "
    >
      <Search className="absolute left-3 w-4 h-4 text-white/40 pointer-events-none" />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full min-w-[120px] sm:min-w-[200px] py-1.5 pl-9 pr-8
          bg-transparent text-white text-sm
          placeholder:text-white/30
          focus:outline-none
        "
        aria-label="Search map features"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={handleClear}
          className="
            absolute right-2 p-1 rounded-full
            text-white/40 hover:text-white/80 hover:bg-glass-white-10
            transition-colors duration-fast
          "
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Keyboard hint */}
      {!value && (
        <span className="absolute right-3 hidden sm:inline text-white/20 text-xs">
          ⌘K
        </span>
      )}
    </div>
  );
}

export default SearchOverlay;
