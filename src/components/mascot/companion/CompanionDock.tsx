/**
 * CompanionDock
 *
 * Persistent bottom-right dock that displays the user's companion.
 * Features:
 * - Minimizable/expandable
 * - Shows reactions to events
 * - Click to open management panel
 */

import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompanion } from './CompanionContext';
import CompanionCharacter from './CompanionCharacter';
import CompanionReaction from './CompanionReaction';

// Lazy load the panel
const CompanionPanel = lazy(() => import('./CompanionPanel'));

export default function CompanionDock() {
  const {
    state,
    panelOpen,
    setPanelOpen,
    reaction,
    reducedMotion,
    updateSettings,
    stageName,
  } = useCompanion();

  // Don't render if no state or companion is hidden
  if (!state || !state.is_visible) {
    return null;
  }

  const handleToggleMinimize = (e) => {
    e.stopPropagation();
    updateSettings({ is_minimized: !state.is_minimized });
  };

  const handleOpenPanel = () => {
    setPanelOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleOpenPanel();
    }
  };

  const animationProps = reducedMotion
    ? {}
    : {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
      };

  return (
    <>
      {/* Dock container - positioned above the AI Coach button (bottom-20 to avoid overlap) */}
      <motion.div
        className="fixed bottom-20 right-4 z-40 sm:bottom-24"
        {...animationProps}
        role="region"
        aria-label="Training companion"
      >
        {state.is_minimized ? (
          /* Minimized state - just a button */
          <motion.button
            onClick={handleToggleMinimize}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            whileHover={reducedMotion ? {} : { scale: 1.1 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            aria-label="Expand companion"
          >
            <span className="text-2xl">🐾</span>

            {/* Stage indicator */}
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 text-xs font-bold text-black flex items-center justify-center shadow-md">
              {state.stage}
            </span>
          </motion.button>
        ) : (
          /* Expanded state */
          <div className="relative">
            {/* Reaction bubble */}
            <AnimatePresence>
              {reaction && <CompanionReaction event={reaction} />}
            </AnimatePresence>

            {/* Companion character */}
            <motion.div
              className="w-28 h-28 cursor-pointer"
              onClick={handleOpenPanel}
              onKeyDown={handleKeyDown}
              whileHover={reducedMotion ? {} : { y: -6 }}
              role="button"
              aria-label="Open companion panel"
              tabIndex={0}
            >
              <CompanionCharacter
                stage={state.stage}
                equipped={state.equipped_cosmetics}
                reaction={reaction?.event_type}
                reducedMotion={reducedMotion}
              />
            </motion.div>

            {/* Minimize button */}
            <button
              onClick={handleToggleMinimize}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-800 text-white text-sm flex items-center justify-center hover:bg-gray-700 transition-colors shadow-md"
              aria-label="Minimize companion"
            >
              −
            </button>

            {/* Nickname/Stage label */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
              {state.nickname ? (
                <span className="text-xs text-gray-400 font-medium">
                  {state.nickname}
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  {stageName}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Panel modal */}
      <AnimatePresence>
        {panelOpen && (
          <Suspense
            fallback={
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <CompanionPanel onClose={() => setPanelOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}
