/**
 * Design System Showcase
 *
 * Demonstrates the MuscleMap Liquid Glass design system components.
 * Use this page to preview and validate design decisions.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Glass component imports
import {
  GlassSurface,
  GlassCard,
  GlassPanel,
  GlassModal,
  GlassButton,
  GlassIconButton,
  GlassProgressBar,
  GlassCircularProgress,
  GlassLiquidMeter,
  GlassNav,
  AnimatedLogo,
  GlassNavLink,
  MeshBackground,
  MeshBackgroundStatic,
  MuscleActivationCard,
  MuscleIndicator,
  MuscleActivationBar,
  CompactMuscleCard,
} from '../components/glass';

// Icons for demonstrations
const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Dumbbell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4m10 0h4M7 12v4a1 1 0 001 1h1M7 12V8a1 1 0 011-1h1m7 5v4a1 1 0 01-1 1h-1m1-5V8a1 1 0 00-1-1h-1m-4 0h4m-4 10h4" />
    </svg>
  ),
  Fire: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  Trophy: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

const Section = ({ title, children }) => (
  <section className="mb-16">
    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
      {title}
    </h2>
    {children}
  </section>
);

const SubSection = ({ title, children }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-4">
      {title}
    </h3>
    {children}
  </div>
);

const ColorSwatch = ({ name, variable, hex }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-12 h-12 rounded-lg border border-[var(--border-default)]"
      style={{ backgroundColor: `var(${variable})` }}
    />
    <div>
      <div className="text-sm font-medium text-[var(--text-primary)]">{name}</div>
      <div className="text-xs text-[var(--text-tertiary)] font-mono">{variable}</div>
    </div>
  </div>
);

// Code block display component
const CodeBlock = ({ code, language = 'jsx' }) => (
  <div className="relative rounded-lg overflow-hidden">
    <div className="absolute top-2 right-2 text-xs text-[var(--text-quaternary)] uppercase">{language}</div>
    <pre className="bg-[var(--void-deep)] border border-[var(--border-subtle)] rounded-lg p-4 overflow-x-auto">
      <code className="text-sm font-mono text-[var(--text-secondary)]">{code}</code>
    </pre>
  </div>
);

// Spacing demo component
const SpacingDemo = ({ size, value }) => (
  <div className="flex items-center gap-4">
    <div
      className="bg-[var(--brand-blue-500)] rounded"
      style={{ width: value, height: '24px' }}
    />
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-medium text-[var(--text-primary)] w-12">{size}</span>
      <span className="text-xs text-[var(--text-tertiary)] font-mono">{value}</span>
    </div>
  </div>
);

// Glass Input component for form demos
const GlassInput = ({ label, placeholder, type = 'text', icon, error, success, disabled, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-3 ${icon ? 'pl-10' : ''}
          bg-[var(--glass-white-5)] backdrop-blur-lg
          border rounded-xl
          text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${error
            ? 'border-[var(--feedback-error)] focus:ring-[var(--feedback-error)]/30'
            : success
              ? 'border-[var(--feedback-success)] focus:ring-[var(--feedback-success)]/30'
              : 'border-[var(--border-default)] focus:border-[var(--brand-blue-400)] focus:ring-[var(--brand-blue-500)]/20'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
      {(error || success) && (
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${error ? 'text-[var(--feedback-error)]' : 'text-[var(--feedback-success)]'}`}>
          {error ? <Icons.Close /> : <Icons.Check />}
        </div>
      )}
    </div>
    {error && <p className="text-xs text-[var(--feedback-error)]">{error}</p>}
  </div>
);

// Glass Select component
const GlassSelect = ({ label, options, placeholder, disabled }) => (
  <div className="space-y-2">
    {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
    <select
      disabled={disabled}
      className={`
        w-full px-4 py-3
        bg-[var(--glass-white-5)] backdrop-blur-lg
        border border-[var(--border-default)] rounded-xl
        text-[var(--text-primary)]
        transition-all duration-200
        focus:outline-none focus:border-[var(--brand-blue-400)] focus:ring-2 focus:ring-[var(--brand-blue-500)]/20
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        appearance-none cursor-pointer
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.75rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
      }}
    >
      <option value="" disabled selected>{placeholder}</option>
      {options.map((opt, i) => (
        <option key={i} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Glass Textarea
const GlassTextarea = ({ label, placeholder, rows = 4, disabled }) => (
  <div className="space-y-2">
    {label && <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>}
    <textarea
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`
        w-full px-4 py-3
        bg-[var(--glass-white-5)] backdrop-blur-lg
        border border-[var(--border-default)] rounded-xl
        text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]
        transition-all duration-200 resize-none
        focus:outline-none focus:border-[var(--brand-blue-400)] focus:ring-2 focus:ring-[var(--brand-blue-500)]/20
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    />
  </div>
);

// Glass Toggle/Switch
const GlassToggle = ({ checked, onChange, label, disabled }) => (
  <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-[var(--glass-white-10)] peer-focus:ring-2 peer-focus:ring-[var(--brand-blue-500)]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-blue-500)] border border-[var(--border-subtle)]"></div>
    </div>
    {label && <span className="text-sm text-[var(--text-secondary)]">{label}</span>}
  </label>
);

// Glass Checkbox
const GlassCheckbox = ({ checked, onChange, label, disabled }) => (
  <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className={`
        w-5 h-5 rounded-md
        bg-[var(--glass-white-5)] border border-[var(--border-default)]
        peer-checked:bg-[var(--brand-blue-500)] peer-checked:border-[var(--brand-blue-500)]
        peer-focus:ring-2 peer-focus:ring-[var(--brand-blue-500)]/20
        transition-all duration-200
        flex items-center justify-center
      `}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
    {label && <span className="text-sm text-[var(--text-secondary)]">{label}</span>}
  </label>
);

// Glass Radio
const GlassRadio = ({ name, value, checked, onChange, label, disabled }) => (
  <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <div className="relative">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className={`
        w-5 h-5 rounded-full
        bg-[var(--glass-white-5)] border border-[var(--border-default)]
        peer-checked:border-[var(--brand-blue-500)]
        peer-focus:ring-2 peer-focus:ring-[var(--brand-blue-500)]/20
        transition-all duration-200
        flex items-center justify-center
      `}>
        {checked && (
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-blue-500)]" />
        )}
      </div>
    </div>
    {label && <span className="text-sm text-[var(--text-secondary)]">{label}</span>}
  </label>
);

// Badge/Tag component
const GlassBadge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-[var(--glass-white-10)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    brand: 'bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-300)] border-[var(--brand-blue-500)]/30',
    pulse: 'bg-[var(--brand-pulse-500)]/20 text-[var(--brand-pulse-300)] border-[var(--brand-pulse-500)]/30',
    success: 'bg-[var(--feedback-success)]/20 text-[var(--feedback-success)] border-[var(--feedback-success)]/30',
    warning: 'bg-[var(--feedback-warning)]/20 text-[var(--feedback-warning)] border-[var(--feedback-warning)]/30',
    error: 'bg-[var(--feedback-error)]/20 text-[var(--feedback-error)] border-[var(--feedback-error)]/30',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

// Avatar component
const GlassAvatar = ({ src, name, size = 'md', status }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  const statusColors = {
    online: 'bg-[var(--feedback-success)]',
    offline: 'bg-[var(--text-quaternary)]',
    busy: 'bg-[var(--feedback-error)]',
    away: 'bg-[var(--feedback-warning)]',
  };
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative inline-block">
      <div className={`
        ${sizes[size]} rounded-full overflow-hidden
        bg-gradient-to-br from-[var(--brand-blue-500)] to-[var(--brand-pulse-500)]
        border-2 border-[var(--glass-white-20)]
        flex items-center justify-center font-semibold text-white
      `}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {status && (
        <div className={`
          absolute bottom-0 right-0 w-3 h-3 rounded-full
          ${statusColors[status]}
          border-2 border-[var(--void-base)]
        `} />
      )}
    </div>
  );
};

// Notification Toast demo
const ToastDemo = ({ type = 'info', title, message, onClose }) => {
  const types = {
    info: { bg: 'border-[var(--brand-blue-500)]', icon: <Icons.Bell /> },
    success: { bg: 'border-[var(--feedback-success)]', icon: <Icons.Check /> },
    warning: { bg: 'border-[var(--feedback-warning)]', icon: <Icons.Fire /> },
    error: { bg: 'border-[var(--feedback-error)]', icon: <Icons.Close /> },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`
        flex items-start gap-3 p-4 rounded-xl
        bg-[var(--glass-white-5)] backdrop-blur-xl
        border-l-4 ${types[type].bg}
        border border-[var(--border-subtle)]
        shadow-lg shadow-black/20
      `}
    >
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-lg
        flex items-center justify-center
        ${type === 'info' ? 'bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]' : ''}
        ${type === 'success' ? 'bg-[var(--feedback-success)]/20 text-[var(--feedback-success)]' : ''}
        ${type === 'warning' ? 'bg-[var(--feedback-warning)]/20 text-[var(--feedback-warning)]' : ''}
        ${type === 'error' ? 'bg-[var(--feedback-error)]/20 text-[var(--feedback-error)]' : ''}
      `}>
        {types[type].icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <Icons.Close />
        </button>
      )}
    </motion.div>
  );
};

// Stat Card component
const StatCard = ({ icon, label, value, change, trend }) => (
  <GlassSurface className="p-4" interactive>
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue-500)]/20 flex items-center justify-center text-[var(--brand-blue-400)]">
        {icon}
      </div>
      {change && (
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-[var(--feedback-success)]' : 'text-[var(--feedback-error)]'}`}>
          {trend === 'up' ? '↑' : '↓'} {change}%
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
    </div>
  </GlassSurface>
);

// Tab navigation component
const GlassTabs = ({ tabs, activeTab, onTabChange }) => (
  <div className="flex gap-1 p-1 bg-[var(--glass-white-5)] rounded-xl border border-[var(--border-subtle)]">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${activeTab === tab.id
            ? 'bg-[var(--brand-blue-500)] text-white shadow-lg'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-white-5)]'
          }
        `}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

// List Item component
const GlassListItem = ({ icon, title, subtitle, trailing, onClick }) => (
  <div
    onClick={onClick}
    className={`
      flex items-center gap-4 p-4 rounded-xl
      bg-[var(--glass-white-5)] border border-[var(--border-subtle)]
      hover:bg-[var(--glass-white-10)] hover:border-[var(--border-default)]
      transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}
    `}
  >
    {icon && (
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--glass-white-10)] flex items-center justify-center text-[var(--text-secondary)]">
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</p>
      {subtitle && <p className="text-xs text-[var(--text-tertiary)] truncate">{subtitle}</p>}
    </div>
    {trailing && <div className="flex-shrink-0">{trailing}</div>}
  </div>
);

// Skeleton loader
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[var(--glass-white-10)] rounded ${className}`} />
);

export default function DesignSystem() {
  const [modalOpen, setModalOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(65);
  const [toggleStates, setToggleStates] = useState({ a: true, b: false, c: true });
  const [checkboxStates, setCheckboxStates] = useState({ a: true, b: false, c: true });
  const [radioValue, setRadioValue] = useState('option1');
  const [activeTab, setActiveTab] = useState('overview');
  const [toasts, setToasts] = useState([]);
  const [animationDemo, setAnimationDemo] = useState(false);

  const addToast = (type) => {
    const id = Date.now();
    const messages = {
      info: { title: 'New workout available', message: 'Check out the latest chest routine!' },
      success: { title: 'Workout complete!', message: 'Great job! You burned 450 calories.' },
      warning: { title: 'Rest day reminder', message: 'You\'ve worked out 5 days in a row.' },
      error: { title: 'Sync failed', message: 'Could not sync your workout data.' },
    };
    setToasts(prev => [...prev, { id, type, ...messages[type] }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen relative">
      {/* Animated mesh background */}
      <MeshBackground intensity="medium" />

      {/* Demo navigation */}
      <GlassNav
        brandName="Design System"
        rightContent={
          <GlassButton variant="primary" size="sm">
            Export
          </GlassButton>
        }
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-black text-[var(--text-primary)] mb-4 tracking-tight">
            Liquid Glass
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
            MuscleMap's design system inspired by visionOS, iOS 18, and spatial computing.
          </p>
        </motion.div>

        {/* Brand Colors */}
        <Section title="Brand Colors">
          <SubSection title="Primary (from logo)">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Blue 50', var: '--brand-blue-50' },
                { name: 'Blue 100', var: '--brand-blue-100' },
                { name: 'Blue 300', var: '--brand-blue-300' },
                { name: 'Blue 500', var: '--brand-blue-500' },
                { name: 'Blue 700', var: '--brand-blue-700' },
              ].map((c) => (
                <ColorSwatch key={c.var} name={c.name} variable={c.var} />
              ))}
            </div>
          </SubSection>

          <SubSection title="Pulse (accent)">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Pulse 50', var: '--brand-pulse-50' },
                { name: 'Pulse 100', var: '--brand-pulse-100' },
                { name: 'Pulse 300', var: '--brand-pulse-300' },
                { name: 'Pulse 500', var: '--brand-pulse-500' },
                { name: 'Pulse 700', var: '--brand-pulse-700' },
              ].map((c) => (
                <ColorSwatch key={c.var} name={c.name} variable={c.var} />
              ))}
            </div>
          </SubSection>

          <SubSection title="Muscle Groups">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Chest', var: '--muscle-chest' },
                { name: 'Back', var: '--muscle-back' },
                { name: 'Shoulders', var: '--muscle-shoulders' },
                { name: 'Arms', var: '--muscle-arms' },
                { name: 'Legs', var: '--muscle-legs' },
                { name: 'Core', var: '--muscle-core' },
                { name: 'Cardio', var: '--muscle-cardio' },
              ].map((c) => (
                <ColorSwatch key={c.var} name={c.name} variable={c.var} />
              ))}
            </div>
          </SubSection>
        </Section>

        {/* Logo */}
        <Section title="Animated Logo">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <AnimatedLogo size={32} breathing />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">32px</p>
            </div>
            <div className="text-center">
              <AnimatedLogo size={48} breathing />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">48px</p>
            </div>
            <div className="text-center">
              <AnimatedLogo size={64} breathing />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">64px</p>
            </div>
            <div className="text-center">
              <AnimatedLogo size={64} breathing={false} />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">Static</p>
            </div>
          </div>
        </Section>

        {/* Glass Surfaces */}
        <Section title="Glass Surfaces">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassSurface depth="subtle" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Subtle</p>
              <p className="text-xs text-[var(--text-quaternary)]">Light blur, background</p>
            </GlassSurface>
            <GlassSurface depth="default" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Default</p>
              <p className="text-xs text-[var(--text-quaternary)]">Standard glass</p>
            </GlassSurface>
            <GlassSurface depth="medium" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Medium</p>
              <p className="text-xs text-[var(--text-quaternary)]">More depth</p>
            </GlassSurface>
            <GlassSurface depth="heavy" className="h-32">
              <p className="text-sm text-[var(--text-secondary)]">Heavy</p>
              <p className="text-xs text-[var(--text-quaternary)]">Maximum blur</p>
            </GlassSurface>
          </div>

          <SubSection title="Tinted Glass">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <GlassSurface tint="neutral" className="h-24">
                <p className="text-sm">Neutral</p>
              </GlassSurface>
              <GlassSurface tint="brand" className="h-24">
                <p className="text-sm">Brand (Blue)</p>
              </GlassSurface>
              <GlassSurface tint="pulse" className="h-24">
                <p className="text-sm">Pulse (Magenta)</p>
              </GlassSurface>
            </div>
          </SubSection>

          <SubSection title="Interactive Glass">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <GlassSurface interactive className="h-24">
                <p className="text-sm">Hover me (lifts on hover)</p>
              </GlassSurface>
              <GlassSurface interactive luminousBorder className="h-24">
                <p className="text-sm">With luminous border</p>
              </GlassSurface>
            </div>
          </SubSection>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <SubSection title="Variants">
            <div className="flex flex-wrap gap-4">
              <GlassButton variant="glass">Glass</GlassButton>
              <GlassButton variant="primary">Primary</GlassButton>
              <GlassButton variant="pulse">Pulse</GlassButton>
              <GlassButton variant="glass" disabled>Disabled</GlassButton>
              <GlassButton variant="primary" loading>Loading</GlassButton>
            </div>
          </SubSection>

          <SubSection title="Sizes">
            <div className="flex flex-wrap items-center gap-4">
              <GlassButton size="sm">Small</GlassButton>
              <GlassButton size="md">Medium</GlassButton>
              <GlassButton size="lg">Large</GlassButton>
              <GlassButton size="xl">Extra Large</GlassButton>
            </div>
          </SubSection>

          <SubSection title="Icon Buttons">
            <div className="flex gap-4">
              <GlassIconButton size="sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </GlassIconButton>
              <GlassIconButton size="md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </GlassIconButton>
              <GlassIconButton size="lg" variant="primary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </GlassIconButton>
            </div>
          </SubSection>
        </Section>

        {/* Progress Indicators */}
        <Section title="Progress Indicators">
          <SubSection title="Progress Bars">
            <div className="space-y-6 max-w-md">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Brand</p>
                <GlassProgressBar value={progressValue} variant="brand" showValue />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Pulse</p>
                <GlassProgressBar value={80} variant="pulse" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Success</p>
                <GlassProgressBar value={100} variant="success" size="lg" />
              </div>
            </div>
            <div className="mt-4">
              <input
                type="range"
                min="0"
                max="100"
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-48"
              />
              <span className="ml-4 text-sm text-[var(--text-tertiary)]">
                Drag to animate: {progressValue}%
              </span>
            </div>
          </SubSection>

          <SubSection title="Circular Progress">
            <div className="flex gap-8">
              <GlassCircularProgress value={25} size={64} showValue />
              <GlassCircularProgress value={50} size={80} variant="pulse" showValue />
              <GlassCircularProgress value={75} size={96} variant="success" showValue strokeWidth={6} />
            </div>
          </SubSection>

          <SubSection title="Liquid Meters">
            <div className="flex gap-8">
              <GlassLiquidMeter value={30} label="Hydration" />
              <GlassLiquidMeter value={65} variant="pulse" label="Energy" />
              <GlassLiquidMeter value={90} variant="success" label="Recovery" />
            </div>
          </SubSection>
        </Section>

        {/* Muscle Activation */}
        <Section title="Muscle Activation">
          <SubSection title="Muscle Indicators">
            <div className="flex flex-wrap gap-6">
              {['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'].map((muscle) => (
                <MuscleIndicator key={muscle} muscle={muscle} showLabel size="lg" />
              ))}
            </div>
          </SubSection>

          <SubSection title="Activation Bar">
            <div className="max-w-md">
              <MuscleActivationBar
                muscles={[
                  { muscle: 'chest', percentage: 40 },
                  { muscle: 'shoulders', percentage: 30 },
                  { muscle: 'arms', percentage: 30 },
                ]}
                height={8}
              />
            </div>
          </SubSection>

          <SubSection title="Exercise Cards">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MuscleActivationCard
                name="Bench Press"
                category="Strength"
                muscles={['chest', 'shoulders', 'arms']}
                primaryMuscle="chest"
                equipment="Barbell"
                difficulty="intermediate"
              />
              <MuscleActivationCard
                name="Deadlift"
                category="Compound"
                muscles={['back', 'legs', 'core']}
                primaryMuscle="back"
                equipment="Barbell"
                difficulty="advanced"
              />
              <MuscleActivationCard
                name="Plank"
                category="Core"
                muscles={['core', 'shoulders']}
                primaryMuscle="core"
                equipment="Bodyweight"
                difficulty="beginner"
              />
            </div>
          </SubSection>

          <SubSection title="Compact Cards">
            <div className="max-w-sm space-y-2">
              <CompactMuscleCard
                name="Push-ups"
                muscles={['chest', 'arms']}
                primaryMuscle="chest"
              />
              <CompactMuscleCard
                name="Squats"
                muscles={['legs', 'core']}
                primaryMuscle="legs"
              />
              <CompactMuscleCard
                name="Pull-ups"
                muscles={['back', 'arms']}
                primaryMuscle="back"
              />
            </div>
          </SubSection>
        </Section>

        {/* Cards */}
        <Section title="Glass Cards">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <h4 className="text-lg font-semibold mb-2">Standard Card</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Basic glass card with subtle depth and hover animation.
              </p>
            </GlassCard>
            <GlassCard className="p-6" interactive={false}>
              <h4 className="text-lg font-semibold mb-2">Static Card</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                No hover effects, for content display.
              </p>
            </GlassCard>
            <GlassCard className="p-0">
              <div className="h-32 bg-gradient-to-br from-[var(--brand-blue-500)] to-[var(--brand-pulse-500)]" />
              <div className="p-4">
                <h4 className="text-lg font-semibold">Media Card</h4>
              </div>
            </GlassCard>
          </div>
        </Section>

        {/* Modal Demo */}
        <Section title="Modal">
          <GlassButton onClick={() => setModalOpen(true)}>
            Open Modal
          </GlassButton>

          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 overlay-backdrop"
                onClick={() => setModalOpen(false)}
              />
              <GlassModal className="relative z-10 w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Glass Modal</h3>
                <p className="text-[var(--text-secondary)] mb-6">
                  This modal uses layered glass with proper backdrop blur hierarchy.
                </p>
                <div className="flex gap-3 justify-end">
                  <GlassButton onClick={() => setModalOpen(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton variant="primary" onClick={() => setModalOpen(false)}>
                    Confirm
                  </GlassButton>
                </div>
              </GlassModal>
            </div>
          )}
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <SubSection title="Type Scale">
            <div className="space-y-6">
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Display</span>
                <h1 className="text-5xl font-black text-[var(--text-primary)] tracking-tight mt-1">
                  The quick brown fox
                </h1>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Heading 1</span>
                <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mt-1">
                  The quick brown fox
                </h1>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Heading 2</span>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                  The quick brown fox
                </h2>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Heading 3</span>
                <h3 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
                  The quick brown fox
                </h3>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Body Large</span>
                <p className="text-lg text-[var(--text-secondary)] mt-1">
                  The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Body</span>
                <p className="text-base text-[var(--text-secondary)] mt-1">
                  The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Body Small</span>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-quaternary)] uppercase tracking-wider">Caption / Label</span>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  The quick brown fox jumps over the lazy dog.
                </p>
              </div>
            </div>
          </SubSection>

          <SubSection title="Text Colors">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-[var(--text-primary)]">Primary Text</p>
                <code className="text-xs text-[var(--text-quaternary)]">--text-primary</code>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-[var(--text-secondary)]">Secondary Text</p>
                <code className="text-xs text-[var(--text-quaternary)]">--text-secondary</code>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-[var(--text-tertiary)]">Tertiary Text</p>
                <code className="text-xs text-[var(--text-quaternary)]">--text-tertiary</code>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-[var(--text-quaternary)]">Quaternary Text</p>
                <code className="text-xs text-[var(--text-quaternary)]">--text-quaternary</code>
              </div>
            </div>
          </SubSection>
        </Section>

        {/* Spacing System */}
        <Section title="Spacing System">
          <div className="space-y-3">
            <SpacingDemo size="4" value="4px" />
            <SpacingDemo size="8" value="8px" />
            <SpacingDemo size="12" value="12px" />
            <SpacingDemo size="16" value="16px" />
            <SpacingDemo size="20" value="20px" />
            <SpacingDemo size="24" value="24px" />
            <SpacingDemo size="32" value="32px" />
            <SpacingDemo size="48" value="48px" />
            <SpacingDemo size="64" value="64px" />
          </div>
        </Section>

        {/* Form Elements */}
        <Section title="Form Elements">
          <SubSection title="Text Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <GlassInput label="Default Input" placeholder="Enter text..." />
              <GlassInput label="With Icon" placeholder="Search..." icon={<Icons.Search />} />
              <GlassInput label="Success State" placeholder="Validated input" success />
              <GlassInput label="Error State" placeholder="Invalid input" error="This field is required" />
              <GlassInput label="Disabled" placeholder="Cannot edit..." disabled />
            </div>
          </SubSection>

          <SubSection title="Select">
            <div className="max-w-sm">
              <GlassSelect
                label="Muscle Group"
                placeholder="Select a muscle group..."
                options={[
                  { value: 'chest', label: 'Chest' },
                  { value: 'back', label: 'Back' },
                  { value: 'shoulders', label: 'Shoulders' },
                  { value: 'arms', label: 'Arms' },
                  { value: 'legs', label: 'Legs' },
                  { value: 'core', label: 'Core' },
                ]}
              />
            </div>
          </SubSection>

          <SubSection title="Textarea">
            <div className="max-w-md">
              <GlassTextarea
                label="Workout Notes"
                placeholder="Add notes about your workout..."
                rows={3}
              />
            </div>
          </SubSection>

          <SubSection title="Toggle Switches">
            <div className="space-y-4">
              <GlassToggle
                checked={toggleStates.a}
                onChange={(e) => setToggleStates(s => ({ ...s, a: e.target.checked }))}
                label="Enable notifications"
              />
              <GlassToggle
                checked={toggleStates.b}
                onChange={(e) => setToggleStates(s => ({ ...s, b: e.target.checked }))}
                label="Auto-sync workouts"
              />
              <GlassToggle
                checked={toggleStates.c}
                onChange={(e) => setToggleStates(s => ({ ...s, c: e.target.checked }))}
                label="Dark mode"
              />
              <GlassToggle checked={false} disabled label="Disabled toggle" />
            </div>
          </SubSection>

          <SubSection title="Checkboxes">
            <div className="space-y-4">
              <GlassCheckbox
                checked={checkboxStates.a}
                onChange={(e) => setCheckboxStates(s => ({ ...s, a: e.target.checked }))}
                label="Chest exercises"
              />
              <GlassCheckbox
                checked={checkboxStates.b}
                onChange={(e) => setCheckboxStates(s => ({ ...s, b: e.target.checked }))}
                label="Back exercises"
              />
              <GlassCheckbox
                checked={checkboxStates.c}
                onChange={(e) => setCheckboxStates(s => ({ ...s, c: e.target.checked }))}
                label="Leg exercises"
              />
              <GlassCheckbox checked={false} disabled label="Disabled checkbox" />
            </div>
          </SubSection>

          <SubSection title="Radio Buttons">
            <div className="space-y-4">
              <GlassRadio
                name="workout-type"
                value="option1"
                checked={radioValue === 'option1'}
                onChange={(e) => setRadioValue(e.target.value)}
                label="Strength Training"
              />
              <GlassRadio
                name="workout-type"
                value="option2"
                checked={radioValue === 'option2'}
                onChange={(e) => setRadioValue(e.target.value)}
                label="Cardio"
              />
              <GlassRadio
                name="workout-type"
                value="option3"
                checked={radioValue === 'option3'}
                onChange={(e) => setRadioValue(e.target.value)}
                label="Flexibility"
              />
            </div>
          </SubSection>
        </Section>

        {/* Badges */}
        <Section title="Badges & Tags">
          <SubSection title="Variants">
            <div className="flex flex-wrap gap-3">
              <GlassBadge>Default</GlassBadge>
              <GlassBadge variant="brand">Brand</GlassBadge>
              <GlassBadge variant="pulse">Pulse</GlassBadge>
              <GlassBadge variant="success">Success</GlassBadge>
              <GlassBadge variant="warning">Warning</GlassBadge>
              <GlassBadge variant="error">Error</GlassBadge>
            </div>
          </SubSection>

          <SubSection title="Sizes">
            <div className="flex flex-wrap items-center gap-3">
              <GlassBadge size="sm" variant="brand">Small</GlassBadge>
              <GlassBadge size="md" variant="brand">Medium</GlassBadge>
              <GlassBadge size="lg" variant="brand">Large</GlassBadge>
            </div>
          </SubSection>
        </Section>

        {/* Avatars */}
        <Section title="Avatars">
          <SubSection title="Sizes">
            <div className="flex items-end gap-4">
              <div className="text-center">
                <GlassAvatar name="John Doe" size="sm" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Small</p>
              </div>
              <div className="text-center">
                <GlassAvatar name="John Doe" size="md" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Medium</p>
              </div>
              <div className="text-center">
                <GlassAvatar name="John Doe" size="lg" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Large</p>
              </div>
              <div className="text-center">
                <GlassAvatar name="John Doe" size="xl" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">XL</p>
              </div>
            </div>
          </SubSection>

          <SubSection title="Status Indicators">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <GlassAvatar name="Alex Johnson" size="lg" status="online" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Online</p>
              </div>
              <div className="text-center">
                <GlassAvatar name="Sam Wilson" size="lg" status="away" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Away</p>
              </div>
              <div className="text-center">
                <GlassAvatar name="Mike Chen" size="lg" status="busy" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Busy</p>
              </div>
              <div className="text-center">
                <GlassAvatar name="Pat Taylor" size="lg" status="offline" />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">Offline</p>
              </div>
            </div>
          </SubSection>

          <SubSection title="Avatar Group">
            <div className="flex -space-x-3">
              <GlassAvatar name="User 1" size="md" />
              <GlassAvatar name="User 2" size="md" />
              <GlassAvatar name="User 3" size="md" />
              <GlassAvatar name="User 4" size="md" />
              <div className="w-10 h-10 rounded-full bg-[var(--glass-white-10)] border-2 border-[var(--void-base)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)]">
                +12
              </div>
            </div>
          </SubSection>
        </Section>

        {/* Tabs */}
        <Section title="Tabs & Navigation">
          <SubSection title="Tab Bar">
            <GlassTabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'workouts', label: 'Workouts' },
                { id: 'stats', label: 'Stats' },
                { id: 'settings', label: 'Settings' },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <GlassSurface className="mt-4 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Active tab: <span className="text-[var(--brand-blue-400)] font-medium">{activeTab}</span>
              </p>
            </GlassSurface>
          </SubSection>
        </Section>

        {/* List Items */}
        <Section title="List Items">
          <div className="max-w-md space-y-2">
            <GlassListItem
              icon={<Icons.Dumbbell />}
              title="Chest Workout"
              subtitle="Bench press, flyes, pushups"
              trailing={<Icons.ChevronRight />}
              onClick={() => {}}
            />
            <GlassListItem
              icon={<Icons.Fire />}
              title="Cardio Session"
              subtitle="30 min HIIT training"
              trailing={<GlassBadge variant="success" size="sm">Completed</GlassBadge>}
            />
            <GlassListItem
              icon={<Icons.Trophy />}
              title="New Achievement!"
              subtitle="You've completed 100 workouts"
              trailing={<Icons.Star />}
            />
          </div>
        </Section>

        {/* Stat Cards */}
        <Section title="Stat Cards">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Icons.Fire />}
              label="Calories Burned"
              value="2,450"
              change="12"
              trend="up"
            />
            <StatCard
              icon={<Icons.Dumbbell />}
              label="Workouts"
              value="28"
              change="8"
              trend="up"
            />
            <StatCard
              icon={<Icons.Trophy />}
              label="Achievements"
              value="15"
              change="3"
              trend="up"
            />
            <StatCard
              icon={<Icons.Heart />}
              label="Avg Heart Rate"
              value="142"
              change="5"
              trend="down"
            />
          </div>
        </Section>

        {/* Toast Notifications */}
        <Section title="Toast Notifications">
          <SubSection title="Trigger Toasts">
            <div className="flex flex-wrap gap-3">
              <GlassButton onClick={() => addToast('info')}>Info Toast</GlassButton>
              <GlassButton variant="primary" onClick={() => addToast('success')}>Success Toast</GlassButton>
              <GlassButton onClick={() => addToast('warning')}>Warning Toast</GlassButton>
              <GlassButton variant="pulse" onClick={() => addToast('error')}>Error Toast</GlassButton>
            </div>
          </SubSection>

          <SubSection title="Toast Examples">
            <div className="max-w-md space-y-3">
              <ToastDemo type="info" title="New workout available" message="Check out the latest chest routine!" />
              <ToastDemo type="success" title="Workout complete!" message="Great job! You burned 450 calories." />
              <ToastDemo type="warning" title="Rest day reminder" message="You've worked out 5 days in a row." />
              <ToastDemo type="error" title="Sync failed" message="Could not sync your workout data." />
            </div>
          </SubSection>

          {/* Live toast container */}
          <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm">
            <AnimatePresence>
              {toasts.map((toast) => (
                <ToastDemo
                  key={toast.id}
                  type={toast.type}
                  title={toast.title}
                  message={toast.message}
                  onClose={() => removeToast(toast.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </Section>

        {/* Skeleton Loading */}
        <Section title="Skeleton Loading">
          <div className="max-w-md space-y-4">
            <GlassSurface className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </GlassSurface>

            <GlassSurface className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </GlassSurface>

            <GlassSurface className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            </GlassSurface>
          </div>
        </Section>

        {/* Animation Examples */}
        <Section title="Animations">
          <SubSection title="Spring Animations">
            <div className="flex items-center gap-6">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <GlassSurface className="w-24 h-24 flex items-center justify-center cursor-pointer">
                  <span className="text-sm">Hover me</span>
                </GlassSurface>
              </motion.div>

              <motion.div
                animate={{ rotate: animationDemo ? 360 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <GlassSurface className="w-24 h-24 flex items-center justify-center">
                  <Icons.Settings />
                </GlassSurface>
              </motion.div>

              <motion.div
                animate={{ y: animationDemo ? -20 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <GlassSurface className="w-24 h-24 flex items-center justify-center">
                  <Icons.Star />
                </GlassSurface>
              </motion.div>
            </div>
            <GlassButton
              className="mt-4"
              onClick={() => setAnimationDemo(!animationDemo)}
            >
              Toggle Animation
            </GlassButton>
          </SubSection>

          <SubSection title="Staggered Entrance">
            <motion.div
              key={animationDemo ? 'a' : 'b'}
              className="flex gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <GlassSurface className="w-16 h-16 flex items-center justify-center">
                    <span className="text-xl font-bold text-[var(--brand-blue-400)]">{i}</span>
                  </GlassSurface>
                </motion.div>
              ))}
            </motion.div>
          </SubSection>

          <SubSection title="Breathing Glow Effect">
            <div className="flex items-center gap-6">
              <motion.div
                className="w-24 h-24 rounded-2xl bg-[var(--brand-blue-500)]/20 border border-[var(--brand-blue-500)]/30"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 102, 255, 0.2)',
                    '0 0 40px rgba(0, 102, 255, 0.4)',
                    '0 0 20px rgba(0, 102, 255, 0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="w-24 h-24 rounded-2xl bg-[var(--brand-pulse-500)]/20 border border-[var(--brand-pulse-500)]/30"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(255, 51, 102, 0.2)',
                    '0 0 40px rgba(255, 51, 102, 0.4)',
                    '0 0 20px rgba(255, 51, 102, 0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              />
              <motion.div
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--brand-blue-500)]/20 to-[var(--brand-pulse-500)]/20 border border-[var(--glass-white-20)]"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </SubSection>
        </Section>

        {/* Interactive Workout Card Demo */}
        <Section title="Interactive Workout Card">
          <SubSection title="Full Featured Card">
            <GlassSurface className="max-w-sm p-0 overflow-hidden" interactive>
              {/* Header with gradient */}
              <div className="relative h-32 bg-gradient-to-br from-[var(--brand-blue-500)] to-[var(--brand-pulse-500)] p-4">
                <div className="absolute top-4 right-4">
                  <GlassBadge variant="success" size="sm">Active</GlassBadge>
                </div>
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-xl font-bold text-white">Chest Day</h3>
                  <p className="text-sm text-white/80">Push workout</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Stats row */}
                <div className="flex justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">6</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Exercises</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">45</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Minutes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">380</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Calories</p>
                  </div>
                </div>

                {/* Muscle activation */}
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">Target Muscles</p>
                  <MuscleActivationBar
                    muscles={[
                      { muscle: 'chest', percentage: 50 },
                      { muscle: 'shoulders', percentage: 30 },
                      { muscle: 'arms', percentage: 20 },
                    ]}
                    height={6}
                  />
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-[var(--text-tertiary)] mb-2">
                    <span>Progress</span>
                    <span>3/6 exercises</span>
                  </div>
                  <GlassProgressBar value={50} variant="brand" size="sm" />
                </div>

                {/* Action button */}
                <GlassButton variant="primary" className="w-full">
                  Continue Workout
                </GlassButton>
              </div>
            </GlassSurface>
          </SubSection>
        </Section>

        {/* Background Options */}
        <Section title="Backgrounds">
          <p className="text-[var(--text-secondary)] mb-4">
            This page uses the animated mesh gradient. Other options:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassSurface className="h-48 relative overflow-hidden">
              <div className="absolute inset-0">
                <MeshBackgroundStatic intensity="subtle" className="relative" />
              </div>
              <p className="relative z-10 text-sm">Static (subtle)</p>
            </GlassSurface>
            <GlassSurface className="h-48 relative overflow-hidden">
              <div className="absolute inset-0">
                <MeshBackgroundStatic intensity="medium" className="relative" />
              </div>
              <p className="relative z-10 text-sm">Static (medium)</p>
            </GlassSurface>
            <GlassSurface className="h-48 relative overflow-hidden">
              <div className="absolute inset-0">
                <MeshBackgroundStatic intensity="strong" className="relative" />
              </div>
              <p className="relative z-10 text-sm">Static (strong)</p>
            </GlassSurface>
          </div>
        </Section>

        {/* Usage Notes */}
        <Section title="Performance Notes">
          <GlassSurface depth="subtle" className="p-6">
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  <strong>backdrop-filter</strong> is GPU-intensive. Limit to 2-3 simultaneous blurred elements in viewport.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  Use <code className="px-1 bg-[var(--glass-white-10)] rounded">glass-subtle</code> for background elements (less blur = better perf).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  All animations respect <code className="px-1 bg-[var(--glass-white-10)] rounded">prefers-reduced-motion</code>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  Spring-based animations use CSS <code className="px-1 bg-[var(--glass-white-10)] rounded">cubic-bezier</code> for performance.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue-400)]">•</span>
                <span>
                  Mesh background automatically falls back to static on reduced-motion.
                </span>
              </li>
            </ul>
          </GlassSurface>
        </Section>
      </main>
    </div>
  );
}
