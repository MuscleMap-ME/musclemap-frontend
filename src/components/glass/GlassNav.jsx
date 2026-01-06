/**
 * GlassNav - Floating navigation bar with liquid glass effect
 *
 * Features scroll-responsive blur intensity and luminous logo integration.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * Hook to detect scroll position
 */
const useScrollPosition = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsScrolled(currentScrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { scrollY, isScrolled };
};

/**
 * Animated MuscleMap Logo
 * Uses the custom MM icon with breathing pulse effect
 */
export const AnimatedLogo = ({ size = 32, breathing = true }) => {
  return (
    <motion.div
      className={clsx(
        'relative flex items-center justify-center rounded-xl overflow-hidden',
        breathing && 'glow-breathing'
      )}
      style={{
        width: size,
        height: size,
        background: '#1a1a1a',
        boxShadow: 'var(--glow-brand-sm)',
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* MM Logo - Two rounded squares with M letters */}
      <div className="flex items-center gap-0.5" style={{ transform: `scale(${size / 40})` }}>
        <motion.div
          className="flex items-center justify-center rounded-md bg-black"
          style={{ width: 14, height: 14 }}
          animate={
            breathing
              ? { scale: [1, 1.02, 1], opacity: [0.95, 1, 0.95] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-white font-bold text-[10px]" style={{ fontFamily: 'Georgia, serif' }}>M</span>
        </motion.div>
        <motion.div
          className="flex items-center justify-center rounded-md bg-black"
          style={{ width: 14, height: 14 }}
          animate={
            breathing
              ? { scale: [1, 1.02, 1], opacity: [0.95, 1, 0.95] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <span className="text-white font-bold text-[10px]" style={{ fontFamily: 'Georgia, serif' }}>M</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

/**
 * GlassNavBar - Main navigation component
 */
const GlassNavBar = ({
  logo,
  brandName = 'MuscleMap',
  brandSlot,
  children,
  leftContent,
  rightContent,
  className,
  fixed = true,
}) => {
  const { isScrolled } = useScrollPosition();

  return (
    <motion.header
      className={clsx(
        'top-0 left-0 right-0 z-[var(--z-sticky)]',
        fixed ? 'fixed' : 'sticky',
        'transition-all duration-300',
        className
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <nav
        className={clsx(
          'nav-glass nav-glass-scroll',
          isScrolled && 'scrolled'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left section: Logo + Brand */}
          <div className="flex items-center gap-3">
            {brandSlot || (
              <Link to="/" className="flex items-center gap-3">
                {logo || <AnimatedLogo size={32} breathing={!isScrolled} />}
                <motion.span
                  className="font-semibold text-lg text-[var(--text-primary)] hidden sm:block"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {brandName}
                </motion.span>
              </Link>
            )}
            {leftContent}
          </div>

          {/* Center section: Navigation links */}
          {children && (
            <div className="hidden md:flex items-center gap-1">
              {children}
            </div>
          )}

          {/* Right section: Actions */}
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        </div>
      </nav>
    </motion.header>
  );
};

/**
 * GlassNavLink - Navigation link with glass hover state
 */
export const GlassNavLink = ({
  to,
  children,
  active = false,
  badge,
  icon,
  className,
}) => {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg',
        'text-sm font-medium transition-all duration-200',
        active
          ? 'bg-[var(--glass-white-10)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-5)]',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {badge && (
        <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-[var(--brand-pulse-500)] text-white">
          {badge}
        </span>
      )}
    </Link>
  );
};

/**
 * GlassMobileNav - Bottom navigation for mobile
 */
export const GlassMobileNav = ({ items, className }) => {
  return (
    <nav
      className={clsx(
        'lg:hidden fixed bottom-0 left-0 right-0 z-[var(--z-sticky)]',
        'glass-medium border-t border-[var(--border-subtle)]',
        'px-2 py-2',
        className
      )}
    >
      <div className="flex justify-around">
        {items.map((item, index) => (
          <Link
            key={index}
            to={item.to}
            className={clsx(
              'flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200',
              item.active
                ? 'text-[var(--text-primary)] bg-[var(--glass-white-10)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            )}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {item.icon}
            </motion.div>
            <span className="text-xs mt-1 font-medium">{item.label}</span>
            {item.badge && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--brand-pulse-500)]" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};

/**
 * GlassSidebar - Desktop sidebar navigation
 */
export const GlassSidebar = ({
  children,
  header,
  footer,
  className,
  width = 256,
}) => {
  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col',
        'fixed left-0 top-16 bottom-0',
        'glass-subtle border-r border-[var(--border-subtle)]',
        'overflow-y-auto',
        className
      )}
      style={{ width }}
    >
      {header && (
        <div className="px-4 py-4 border-b border-[var(--border-subtle)]">
          {header}
        </div>
      )}
      <div className="flex-1 p-4">{children}</div>
      {footer && (
        <div className="px-4 py-4 border-t border-[var(--border-subtle)]">
          {footer}
        </div>
      )}
    </aside>
  );
};

/**
 * GlassSidebarSection - Group of sidebar items with optional title
 */
export const GlassSidebarSection = ({ title, children, className }) => {
  return (
    <div className={clsx('mb-6', className)}>
      {title && (
        <div className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider px-4 mb-2 font-medium">
          {title}
        </div>
      )}
      <nav className="space-y-1">{children}</nav>
    </div>
  );
};

/**
 * GlassSidebarItem - Individual sidebar navigation item
 */
export const GlassSidebarItem = ({
  to,
  icon,
  label,
  badge,
  active = false,
  className,
}) => {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
        active
          ? 'bg-[var(--glass-white-10)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-5)]',
        className
      )}
    >
      {icon && <span className="flex-shrink-0 w-5 h-5">{icon}</span>}
      <span className="font-medium flex-1">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--brand-pulse-500)] text-white">
          {badge}
        </span>
      )}
    </Link>
  );
};

export default GlassNavBar;
