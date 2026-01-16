/**
 * GlassMobileNav - A glassmorphism styled mobile navigation component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu } from 'lucide-react';
import { useState } from 'react';

export function GlassMobileNav({
  items = [],
  activeItem,
  onItemClick,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`md:hidden ${className}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-800/50 backdrop-blur-md border border-gray-700/50 text-white"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-xl border-t border-gray-700/50 rounded-t-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4">
                {/* Handle */}
                <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

                {/* Navigation items */}
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;

                    return (
                      <motion.button
                        key={item.id || index}
                        onClick={() => {
                          onItemClick?.(item);
                          setIsOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl transition-colors
                          ${isActive
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'hover:bg-gray-800/50 text-white/70 hover:text-white'
                          }
                        `}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {Icon && <Icon className="w-5 h-5" />}
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GlassMobileNav;
