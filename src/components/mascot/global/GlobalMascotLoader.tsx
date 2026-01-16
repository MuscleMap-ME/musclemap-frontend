/**
 * GlobalMascotLoader
 *
 * Loading indicator using the global mascot.
 * Replaces standard spinners with the TЯIPTθMΞAN Spirit.
 */

import React from 'react';
import { motion } from 'framer-motion';
import GlobalMascot2D from './GlobalMascot2D';

export default function GlobalMascotLoader({
  message = 'Loading...',
  size = 'medium',
  className = '',
}) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GlobalMascot2D
        size={size}
        animationState="loading"
        reducedMotion={false}
      />

      {message && (
        <motion.p
          className="text-purple-300 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

/**
 * Full-screen loader variant
 */
export function GlobalMascotFullLoader({ message = 'Loading...', className = '' }) {
  return (
    <div className={`min-h-screen bg-[#0a0a0f] flex items-center justify-center ${className}`}>
      <GlobalMascotLoader message={message} size="large" />
    </div>
  );
}
