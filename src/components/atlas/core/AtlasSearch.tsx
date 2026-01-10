/**
 * AtlasSearch - Search input with real-time filtering
 */

import React, { useRef, useEffect } from 'react';

interface AtlasSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  autoFocus?: boolean;
  className?: string;
}

export function AtlasSearch({
  value,
  onChange,
  placeholder = 'Search...',
  resultCount,
  autoFocus = false,
  className = '',
}: AtlasSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Keyboard shortcut: Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to blur
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-20 py-2
          text-sm text-white placeholder-gray-500
          bg-white/5 backdrop-blur-md
          border border-white/10 rounded-lg
          focus:outline-none focus:border-blue-500/50 focus:bg-white/10
          transition-all duration-200
        "
      />

      {/* Right side: result count or clear button */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {/* Result count */}
        {value && resultCount !== undefined && (
          <span className="text-xs text-gray-500 tabular-nums">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {!value && (
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-500 bg-white/5 rounded border border-white/10">
            <span className="text-[9px]">⌘</span>K
          </kbd>
        )}
      </div>
    </div>
  );
}
