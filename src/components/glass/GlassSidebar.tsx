/**
 * GlassSidebar - A glassmorphism styled sidebar component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function GlassSidebar({
  isOpen,
  onClose,
  children,
  title = '',
  position = 'right', // 'left' | 'right'
  width = '320px',
  className = '',
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            className={`
              fixed top-0 ${position === 'right' ? 'right-0' : 'left-0'} h-full z-50
              bg-gray-900/80 backdrop-blur-xl border-l border-gray-700/50
              ${className}
            `}
            style={{ width }}
            initial={{ x: position === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: position === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            {(title || onClose) && (
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                {title && (
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-700/50 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 overflow-y-auto h-full">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default GlassSidebar;
