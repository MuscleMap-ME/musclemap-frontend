/**
 * MuscleControls - View controls for the Muscle Explorer
 *
 * Provides controls for:
 * - Switching between front/back/side views
 * - Rotating the model
 * - Zoom in/out
 * - Auto-rotation toggle
 * - Search/filter muscles
 * - Reset view
 *
 * @module MuscleControls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Search,
  X,
  RefreshCw,
  FlipHorizontal,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MUSCLE_DATA, searchMuscles } from './muscleData';
import { VIEW_PRESETS } from './useMuscleExplorer';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

/**
 * Icon button sizes
 */
const BUTTON_SIZES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

/**
 * Icon sizes
 */
const ICON_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// ============================================
// ICON BUTTON COMPONENT
// ============================================

/**
 * ControlButton - Styled control button
 */
const ControlButton = React.memo(({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  size = 'md',
  variant = 'default',
  className,
}) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      'flex items-center justify-center rounded-lg',
      'transition-all duration-200',
      BUTTON_SIZES[size],
      variant === 'primary'
        ? 'bg-[var(--brand-teal-500,#14b8a6)] text-white hover:bg-[var(--brand-teal-400,#2dd4bf)]'
        : active
          ? 'bg-[var(--glass-white-15,rgba(255,255,255,0.15))] text-[var(--text-primary,#f1f5f9)]'
          : 'bg-[var(--glass-white-5,rgba(255,255,255,0.05))] text-[var(--text-tertiary,#94a3b8)] hover:bg-[var(--glass-white-10,rgba(255,255,255,0.1))] hover:text-[var(--text-primary,#f1f5f9)]',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}
    whileHover={!disabled ? { scale: 1.05 } : undefined}
    whileTap={!disabled ? { scale: 0.95 } : undefined}
    title={label}
    aria-label={label}
  >
    <Icon className={ICON_SIZES[size]} />
  </motion.button>
));

ControlButton.displayName = 'ControlButton';

// ============================================
// VIEW TOGGLE COMPONENT
// ============================================

/**
 * ViewToggle - Toggle between front/back/side views
 */
const ViewToggle = React.memo(({
  currentView,
  onViewChange,
  compact = false,
}) => {
  const views = Object.entries(VIEW_PRESETS);

  if (compact) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--glass-white-5,rgba(255,255,255,0.05))]">
        {views.slice(0, 2).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              currentView === key
                ? 'bg-[var(--brand-teal-500,#14b8a6)] text-white'
                : 'text-[var(--text-tertiary,#94a3b8)] hover:text-[var(--text-primary,#f1f5f9)] hover:bg-[var(--glass-white-5,rgba(255,255,255,0.05))]'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary,#64748b)] px-1">
        View
      </span>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--glass-white-5,rgba(255,255,255,0.05))]">
        {views.map(([key, preset]) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              currentView === key
                ? 'bg-[var(--brand-teal-500,#14b8a6)] text-white'
                : 'text-[var(--text-tertiary,#94a3b8)] hover:text-[var(--text-primary,#f1f5f9)] hover:bg-[var(--glass-white-5,rgba(255,255,255,0.05))]'
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
});

ViewToggle.displayName = 'ViewToggle';

// ============================================
// ZOOM CONTROLS COMPONENT
// ============================================

/**
 * ZoomControls - Zoom in/out buttons
 */
const ZoomControls = React.memo(({
  zoom,
  onZoomIn,
  onZoomOut,
  minZoom = 0.5,
  maxZoom = 2.5,
}) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary,#64748b)]">
      Zoom
    </span>
    <div className="flex flex-col gap-1 p-1 rounded-lg bg-[var(--glass-white-5,rgba(255,255,255,0.05))]">
      <ControlButton
        icon={ZoomIn}
        label="Zoom in"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        size="sm"
      />
      <div className="px-2 py-1 text-xs font-mono text-center text-[var(--text-tertiary,#94a3b8)]">
        {Math.round(zoom * 100)}%
      </div>
      <ControlButton
        icon={ZoomOut}
        label="Zoom out"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        size="sm"
      />
    </div>
  </div>
));

ZoomControls.displayName = 'ZoomControls';

// ============================================
// ROTATION CONTROLS COMPONENT
// ============================================

/**
 * RotationControls - Manual rotation and auto-rotate toggle
 */
const RotationControls = React.memo(({
  isAutoRotating,
  onToggleAutoRotate,
  onRotateLeft,
  onRotateRight,
}) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-[10px] uppercase tracking-wider text-[var(--text-quaternary,#64748b)]">
      Rotate
    </span>
    <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--glass-white-5,rgba(255,255,255,0.05))]">
      <ControlButton
        icon={RotateCcw}
        label="Rotate left"
        onClick={onRotateLeft}
        size="sm"
      />
      <ControlButton
        icon={isAutoRotating ? Pause : Play}
        label={isAutoRotating ? 'Stop auto-rotate' : 'Start auto-rotate'}
        onClick={onToggleAutoRotate}
        active={isAutoRotating}
        size="sm"
      />
      <ControlButton
        icon={RotateCw}
        label="Rotate right"
        onClick={onRotateRight}
        size="sm"
      />
    </div>
  </div>
));

RotationControls.displayName = 'RotationControls';

// ============================================
// SEARCH INPUT COMPONENT
// ============================================

/**
 * MuscleSearch - Search input for finding muscles
 */
const MuscleSearch = React.memo(({
  value,
  onChange,
  onSelect,
  onClear,
  placeholder = 'Search muscles...',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const motionAllowed = useMotionAllowed();

  // Handle input change
  const handleChange = useCallback((e) => {
    const query = e.target.value;
    onChange(query);

    if (query.length >= 2) {
      const matches = searchMuscles(query);
      setResults(matches);
    } else {
      setResults([]);
    }
  }, [onChange]);

  // Handle selecting a result
  const handleSelect = useCallback((muscleId) => {
    onSelect?.(muscleId);
    onChange('');
    setResults([]);
    setIsExpanded(false);
  }, [onSelect, onChange]);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('');
    setResults([]);
    onClear?.();
    inputRef.current?.focus();
  }, [onChange, onClear]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            initial={motionAllowed ? { width: 40, opacity: 0 } : false}
            animate={{ width: 200, opacity: 1 }}
            exit={motionAllowed ? { width: 40, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-quaternary,#64748b)]" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className={clsx(
                'w-full pl-9 pr-8 py-2 text-sm rounded-lg',
                'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
                'border border-[var(--border-subtle,#1e293b)]',
                'text-[var(--text-primary,#f1f5f9)]',
                'placeholder-[var(--text-quaternary,#64748b)]',
                'focus:outline-none focus:border-[var(--brand-teal-500,#14b8a6)]',
                'transition-all'
              )}
              onBlur={() => {
                if (!value && !results.length) {
                  setIsExpanded(false);
                }
              }}
            />
            <button
              onClick={handleClear}
              className={clsx(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded',
                'text-[var(--text-quaternary,#64748b)]',
                'hover:text-[var(--text-tertiary,#94a3b8)]',
                'transition-colors'
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Search results dropdown */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={clsx(
                    'absolute top-full left-0 right-0 mt-1 z-50',
                    'bg-[var(--void-deep,#0f172a)]',
                    'border border-[var(--border-subtle,#1e293b)]',
                    'rounded-lg shadow-xl overflow-hidden'
                  )}
                >
                  {results.map((muscle) => (
                    <button
                      key={muscle.id}
                      onClick={() => handleSelect(muscle.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 text-left',
                        'hover:bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
                        'transition-colors'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: muscle.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary,#f1f5f9)]">
                          {muscle.commonName}
                        </p>
                        <p className="text-xs text-[var(--text-quaternary,#64748b)]">
                          {muscle.group}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <ControlButton
            icon={Search}
            label="Search muscles"
            onClick={() => setIsExpanded(true)}
            size="md"
          />
        )}
      </AnimatePresence>
    </div>
  );
});

MuscleSearch.displayName = 'MuscleSearch';

// ============================================
// MAIN MUSCLE CONTROLS COMPONENT
// ============================================

/**
 * MuscleControls - Combined control panel
 *
 * @param {Object} props
 * @param {string} props.currentView - Current view ('front' | 'back' | 'left' | 'right')
 * @param {number} props.zoom - Current zoom level
 * @param {boolean} props.isAutoRotating - Auto-rotation state
 * @param {Function} props.onViewChange - Callback for view changes
 * @param {Function} props.onZoomIn - Callback for zoom in
 * @param {Function} props.onZoomOut - Callback for zoom out
 * @param {Function} props.onToggleAutoRotate - Callback for auto-rotate toggle
 * @param {Function} props.onRotateLeft - Callback for manual rotate left
 * @param {Function} props.onRotateRight - Callback for manual rotate right
 * @param {Function} props.onReset - Callback to reset view
 * @param {Function} props.onMuscleSearch - Callback when muscle is searched
 * @param {string} props.layout - Layout mode ('horizontal' | 'vertical' | 'floating')
 * @param {string} props.className - Additional CSS classes
 */
const MuscleControls = ({
  currentView = 'front',
  zoom = 1,
  isAutoRotating = false,
  onViewChange,
  onZoomIn,
  onZoomOut,
  onToggleAutoRotate,
  onRotateLeft,
  onRotateRight,
  onReset,
  onMuscleSearch,
  layout = 'horizontal',
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const motionAllowed = useMotionAllowed();

  // Handle search selection
  const handleSearchSelect = useCallback((muscleId) => {
    onMuscleSearch?.(muscleId);
    setSearchQuery('');
  }, [onMuscleSearch]);

  // Handle manual rotation
  const handleRotateLeft = useCallback(() => {
    onRotateLeft?.();
  }, [onRotateLeft]);

  const handleRotateRight = useCallback(() => {
    onRotateRight?.();
  }, [onRotateRight]);

  // Floating layout (overlay on model)
  if (layout === 'floating') {
    return (
      <div className={clsx('absolute inset-0 pointer-events-none', className)}>
        {/* Top controls - view toggle and search */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
          <ViewToggle
            currentView={currentView}
            onViewChange={onViewChange}
            compact
          />
          <MuscleSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={handleSearchSelect}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Right side - zoom controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
          <ZoomControls
            zoom={zoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
          />
        </div>

        {/* Bottom controls - rotation and reset */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto">
          <RotationControls
            isAutoRotating={isAutoRotating}
            onToggleAutoRotate={onToggleAutoRotate}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
          />
          <ControlButton
            icon={RefreshCw}
            label="Reset view"
            onClick={onReset}
            variant="primary"
            size="md"
          />
        </div>
      </div>
    );
  }

  // Vertical layout (sidebar)
  if (layout === 'vertical') {
    return (
      <div className={clsx(
        'flex flex-col gap-4 p-3',
        'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
        'border border-[var(--border-subtle,#1e293b)]',
        'rounded-xl',
        className
      )}>
        <MuscleSearch
          value={searchQuery}
          onChange={setSearchQuery}
          onSelect={handleSearchSelect}
          onClear={() => setSearchQuery('')}
        />
        <ViewToggle
          currentView={currentView}
          onViewChange={onViewChange}
        />
        <ZoomControls
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
        />
        <RotationControls
          isAutoRotating={isAutoRotating}
          onToggleAutoRotate={onToggleAutoRotate}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
        />
        <ControlButton
          icon={RefreshCw}
          label="Reset view"
          onClick={onReset}
          variant="primary"
          className="w-full"
        />
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className={clsx(
      'flex items-center gap-4 p-3',
      'bg-[var(--glass-white-5,rgba(255,255,255,0.05))]',
      'border border-[var(--border-subtle,#1e293b)]',
      'rounded-xl',
      className
    )}>
      <MuscleSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onSelect={handleSearchSelect}
        onClear={() => setSearchQuery('')}
      />

      <div className="h-8 w-px bg-[var(--border-subtle,#1e293b)]" />

      <ViewToggle
        currentView={currentView}
        onViewChange={onViewChange}
        compact
      />

      <div className="h-8 w-px bg-[var(--border-subtle,#1e293b)]" />

      <div className="flex items-center gap-1">
        <ControlButton
          icon={ZoomOut}
          label="Zoom out"
          onClick={onZoomOut}
          disabled={zoom <= 0.5}
          size="sm"
        />
        <span className="w-12 text-center text-xs font-mono text-[var(--text-tertiary,#94a3b8)]">
          {Math.round(zoom * 100)}%
        </span>
        <ControlButton
          icon={ZoomIn}
          label="Zoom in"
          onClick={onZoomIn}
          disabled={zoom >= 2.5}
          size="sm"
        />
      </div>

      <div className="h-8 w-px bg-[var(--border-subtle,#1e293b)]" />

      <div className="flex items-center gap-1">
        <ControlButton
          icon={RotateCcw}
          label="Rotate left"
          onClick={handleRotateLeft}
          size="sm"
        />
        <ControlButton
          icon={isAutoRotating ? Pause : Play}
          label={isAutoRotating ? 'Stop' : 'Auto-rotate'}
          onClick={onToggleAutoRotate}
          active={isAutoRotating}
          size="sm"
        />
        <ControlButton
          icon={RotateCw}
          label="Rotate right"
          onClick={handleRotateRight}
          size="sm"
        />
      </div>

      <div className="h-8 w-px bg-[var(--border-subtle,#1e293b)]" />

      <ControlButton
        icon={RefreshCw}
        label="Reset view"
        onClick={onReset}
        variant="primary"
        size="sm"
      />
    </div>
  );
};

MuscleControls.displayName = 'MuscleControls';

export default MuscleControls;
