/**
 * GlobalMascotAbout
 *
 * About panel modal showing TripToMean ecosystem information.
 * Triggered from various locations in the app.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalMascot } from './useGlobalMascot';
import GlobalMascot2D from './GlobalMascot2D';

export default function GlobalMascotAbout({ trigger, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { config, prefersReducedMotion } = useGlobalMascot();

  if (!config) {
    return null;
  }

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const modalVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
      };

  const overlayVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <>
      {/* Trigger */}
      {trigger ? (
        <div onClick={handleOpen} className={`cursor-pointer ${className}`}>
          {trigger}
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className={`flex items-center gap-2 px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg transition-colors ${className}`}
        >
          <GlobalMascot2D size="small" reducedMotion />
          <span className="text-purple-300 text-sm">About</span>
        </button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleClose}
            />

            {/* Modal content */}
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 rounded-xl shadow-2xl z-50 overflow-hidden border border-purple-500/20"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-title"
            >
              {/* Header with mascot */}
              <div className="h-36 bg-gradient-to-b from-purple-900/80 to-gray-900 flex items-center justify-center relative">
                <GlobalMascot2D
                  size="medium"
                  animationState="greeting"
                  reducedMotion={prefersReducedMotion}
                />

                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                <h2 id="about-title" className="text-xl font-bold text-white font-bebas tracking-wider">
                  TЯIPTθMΞAN
                </h2>
                <p className="text-purple-400 italic text-sm mb-3">
                  {config.tagline}
                </p>

                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  MuscleMap is part of the TripToMean ecosystem &mdash; explorations in science, art, poetry, and human potential by Jean-Paul Nik&ouml;.
                </p>

                {/* Ecosystem sections */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {config.ecosystem_sections.map((section) => (
                    <a
                      key={section}
                      href={`${config.ecosystem_url}/${section.toLowerCase()}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg text-sm text-purple-300 transition-colors"
                    >
                      {section}
                    </a>
                  ))}
                </div>

                {/* Learn more link */}
                <a
                  href={config.ecosystem_about_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 text-sm inline-flex items-center gap-1 transition-colors"
                >
                  Learn more about TripToMean
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
