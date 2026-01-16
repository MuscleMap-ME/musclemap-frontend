// MuscleMap UI Component Library
// Complete design system for the MuscleMap application
// Built with React + Tailwind CSS

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const tokens = {
  colors: {
    // Primary
    teal: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0D7377',
      800: '#115E59',
      900: '#134E4A',
      electric: '#14FFEC',
    },
    // Accent
    coral: {
      400: '#FB7185',
      500: '#F43F5E',
      600: '#E11D48',
    },
    orange: {
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
    },
    // Neutrals
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },
    // Semantic
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    // Muscle activation
    activation: {
      low: '#14B8A6',
      medium: '#EAB308',
      high: '#F97316',
      max: '#EF4444',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(20, 184, 166, 0.3)',
    glowStrong: '0 0 30px rgba(20, 255, 236, 0.4)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// THEME CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme}>{children}</div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/25 active:scale-[0.98]',
    secondary: 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:border-slate-600',
    outline: 'bg-transparent text-teal-400 border border-teal-500/50 hover:bg-teal-500/10 hover:border-teal-400',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-xl gap-2.5',
    xl: 'px-8 py-4 text-lg rounded-2xl gap-3',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      )}
      {icon && iconPosition === 'left' && !loading && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </button>
  );
};

export const IconButton = ({ 
  icon, 
  variant = 'ghost', 
  size = 'md',
  label,
  ...props 
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const variants = {
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white',
    filled: 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white',
    primary: 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30',
  };

  return (
    <button
      className={`${sizes[size]} ${variants[variant]} rounded-xl flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500`}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
};

export const FloatingActionButton = ({ icon, onClick, label }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-xl shadow-teal-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
  >
    {icon}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════
// INPUT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Input = ({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  helper,
  icon,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-xl bg-slate-800/50 border text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {helper && !error && <p className="text-sm text-slate-500">{helper}</p>}
    </div>
  );
};

export const SearchInput = ({ value, onChange, placeholder = 'Search...', onClear }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
    />
    {value && (
      <button
        onClick={onClear}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

export const NumberInput = ({ value, onChange, min = 0, max = 999, step = 1, label, unit }) => {
  const increment = () => onChange(Math.min(max, value + step));
  const decrement = () => onChange(Math.max(min, value - step));

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          onClick={decrement}
          className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <span className="text-2xl font-bold text-white font-mono">{value}</span>
          {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
        </div>
        <button
          onClick={increment}
          className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const Textarea = ({ label, placeholder, value, onChange, rows = 4, error, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`
        w-full px-4 py-3 rounded-xl bg-slate-800/50 border text-white placeholder-slate-500
        focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
        resize-none transition-all duration-200
        ${error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'}
      `}
      {...props}
    />
    {error && <p className="text-sm text-red-400">{error}</p>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SELECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Toggle = ({ checked, onChange, label, disabled = false }) => (
  <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-teal-500' : 'bg-slate-700'}`} />
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    {label && <span className="text-sm text-slate-300">{label}</span>}
  </label>
);

export const Checkbox = ({ checked, onChange, label, disabled = false }) => (
  <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${checked ? 'bg-teal-500 border-teal-500' : 'border-slate-600 hover:border-slate-500'}`}>
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
    {label && <span className="text-sm text-slate-300">{label}</span>}
  </label>
);

export const Radio = ({ checked, onChange, label, name, value, disabled = false }) => (
  <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${checked ? 'border-teal-500' : 'border-slate-600 hover:border-slate-500'}`}>
      {checked && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
    </div>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
    {label && <span className="text-sm text-slate-300">{label}</span>}
  </label>
);

export const Chip = ({ children, selected = false, onClick, icon, onRemove }) => (
  <button
    onClick={onClick}
    className={`
      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
      ${selected 
        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50' 
        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
      }
    `}
  >
    {icon && <span className="flex-shrink-0">{icon}</span>}
    <span>{children}</span>
    {onRemove && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-1 hover:text-white">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </button>
);

export const SegmentedControl = ({ options, value, onChange }) => (
  <div className="flex bg-slate-800 rounded-xl p-1">
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`
          flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${value === option.value 
            ? 'bg-teal-500 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white'
          }
        `}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SLIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const Slider = ({ value, onChange, min = 0, max = 100, step = 1, label, showValue = true }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-sm font-medium text-slate-300">{label}</span>}
          {showValue && <span className="text-sm font-mono text-teal-400">{value}</span>}
        </div>
      )}
      <div className="relative h-2">
        <div className="absolute inset-0 bg-slate-700 rounded-full" />
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-teal-500 pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
};

// MuscleMap UI Component Library - Part 2
// Cards, Badges, Progress, and Display Components

// ═══════════════════════════════════════════════════════════════════════════
// CARD COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Card = ({ children, className = '', variant = 'default', onClick, hoverable = false }) => {
  const variants = {
    default: 'bg-slate-800/50 border-slate-700/50',
    elevated: 'bg-slate-800 border-slate-700 shadow-xl',
    glass: 'bg-slate-800/30 backdrop-blur-xl border-slate-700/30',
    outlined: 'bg-transparent border-slate-700',
    gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border p-4 transition-all duration-200
        ${variants[variant]}
        ${hoverable ? 'hover:border-slate-600 hover:shadow-lg cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const ExerciseCard = ({ 
  name, 
  category, 
  equipment, 
  primaryMuscles = [], 
  difficulty,
  imageUrl,
  onClick,
  compact = false 
}) => {
  const difficultyColors = {
    beginner: 'bg-emerald-500/20 text-emerald-400',
    intermediate: 'bg-amber-500/20 text-amber-400',
    advanced: 'bg-red-500/20 text-red-400',
  };

  if (compact) {
    return (
      <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all">
        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{name}</h4>
          <p className="text-sm text-slate-400 truncate">{primaryMuscles.join(', ')}</p>
        </div>
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden hover:border-slate-600 cursor-pointer transition-all group">
      {/* Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-slate-600" viewBox="0 0 100 160">
              <ellipse cx="50" cy="25" rx="15" ry="18" fill="currentColor" opacity="0.5"/>
              <ellipse cx="50" cy="70" rx="25" ry="35" fill="currentColor" opacity="0.5"/>
              <ellipse cx="50" cy="130" rx="15" ry="30" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        {/* Category badge */}
        <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-sm text-xs font-medium text-slate-300">
          {category}
        </span>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-white text-lg">{name}</h3>
        
        {/* Muscles */}
        <div className="flex flex-wrap gap-1.5">
          {primaryMuscles.slice(0, 3).map((muscle, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-xs font-medium">
              {muscle}
            </span>
          ))}
          {primaryMuscles.length > 3 && (
            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 text-xs">
              +{primaryMuscles.length - 3}
            </span>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <span className="text-sm text-slate-400">{equipment}</span>
          {difficulty && (
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const WorkoutCard = ({
  name,
  duration,
  exercises,
  muscleGroups = [],
  _difficulty,
  completedCount,
  lastCompleted,
  onClick,
}) => {
  return (
    <div onClick={onClick} className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 hover:border-slate-600 cursor-pointer transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-lg mb-1">{name}</h3>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {duration} min
            </span>
            <span>{exercises} exercises</span>
          </div>
        </div>
        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Muscle groups */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {muscleGroups.map((group, i) => (
          <span key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-medium">
            {group}
          </span>
        ))}
      </div>

      {/* Stats */}
      {(completedCount > 0 || lastCompleted) && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 text-sm">
          {completedCount > 0 && (
            <span className="text-slate-400">
              Completed <span className="text-teal-400 font-medium">{completedCount}x</span>
            </span>
          )}
          {lastCompleted && (
            <span className="text-slate-500">Last: {lastCompleted}</span>
          )}
        </div>
      )}
    </div>
  );
};

export const SetCard = ({
  setNumber,
  targetReps,
  targetWeight,
  completedReps,
  completedWeight,
  isActive = false,
  isCompleted = false,
  onComplete,
}) => {
  return (
    <div className={`
      rounded-xl border p-4 transition-all duration-200
      ${isActive ? 'bg-teal-500/10 border-teal-500/50 shadow-lg shadow-teal-500/10' : ''}
      ${isCompleted ? 'bg-slate-800/30 border-slate-700/30 opacity-60' : 'bg-slate-800/50 border-slate-700/50'}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
            ${isCompleted ? 'bg-teal-500 text-white' : isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700 text-slate-400'}
          `}>
            {isCompleted ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              setNumber
            )}
          </div>
          
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {completedReps ?? targetReps}
              </span>
              <span className="text-slate-400 text-sm">reps</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-slate-300 font-mono">
                {completedWeight ?? targetWeight}
              </span>
              <span className="text-slate-500 text-sm">lbs</span>
            </div>
          </div>
        </div>

        {isActive && !isCompleted && (
          <button
            onClick={onComplete}
            className="px-4 py-2 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

export const StatCard = ({ label, value, unit, icon, trend, trendValue, color = 'teal' }) => {
  const colors = {
    teal: 'from-teal-500/20 to-teal-600/10 border-teal-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  };

  const iconColors = {
    teal: 'text-teal-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${colors[color]} border p-4`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`${iconColors[color]}`}>{icon}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white font-mono">{value}</span>
          {unit && <span className="text-sm text-slate-400">{unit}</span>}
        </div>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BADGE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    primary: 'bg-teal-500/20 text-teal-300',
    success: 'bg-emerald-500/20 text-emerald-300',
    warning: 'bg-amber-500/20 text-amber-300',
    danger: 'bg-red-500/20 text-red-300',
    info: 'bg-blue-500/20 text-blue-300',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-md font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

export const AchievementBadge = ({ name, icon, tier = 'bronze', unlocked = false, progress, total }) => {
  const tiers = {
    bronze: 'from-amber-700 to-amber-900 border-amber-600',
    silver: 'from-slate-300 to-slate-500 border-slate-400',
    gold: 'from-yellow-400 to-yellow-600 border-yellow-500',
    platinum: 'from-slate-200 to-cyan-200 border-cyan-300',
    diamond: 'from-cyan-200 to-blue-300 border-cyan-400',
  };

  return (
    <div className={`relative ${!unlocked ? 'opacity-40 grayscale' : ''}`}>
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tiers[tier]} border-2 flex items-center justify-center shadow-lg`}>
        <span className="text-2xl">{icon}</span>
      </div>
      {unlocked && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <p className="text-xs text-center mt-2 text-slate-300 font-medium">{name}</p>
      {!unlocked && progress !== undefined && (
        <div className="mt-1">
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500" style={{ width: `${(progress / total) * 100}%` }} />
          </div>
          <p className="text-xs text-slate-500 text-center mt-0.5">{progress}/{total}</p>
        </div>
      )}
    </div>
  );
};

export const StreakBadge = ({ count, isActive = true }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isActive ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-slate-800 border border-slate-700'}`}>
    <span className="text-xl">{isActive ? '🔥' : '❄️'}</span>
    <div>
      <span className={`text-lg font-bold font-mono ${isActive ? 'text-orange-400' : 'text-slate-400'}`}>{count}</span>
      <span className="text-xs text-slate-400 ml-1">day streak</span>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const ProgressBar = ({ value, max = 100, label, showValue = true, size = 'md', color = 'teal' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colors = {
    teal: 'from-teal-500 to-teal-400',
    orange: 'from-orange-500 to-orange-400',
    red: 'from-red-500 to-red-400',
    gradient: 'from-teal-500 via-yellow-500 to-red-500',
  };

  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-slate-400">{label}</span>}
          {showValue && <span className="font-mono text-slate-300">{value}/{max}</span>}
        </div>
      )}
      <div className={`${sizes[size]} bg-slate-700 rounded-full overflow-hidden`}>
        <div 
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const CircularProgress = ({ value, max = 100, size = 'md', label, sublabel, color = 'teal' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const strokeWidths = {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
  };

  const colors = {
    teal: '#14B8A6',
    orange: '#F97316',
    red: '#EF4444',
  };

  return (
    <div className={`relative ${sizes[size]}`}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidths[size]}
        />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={colors[color]}
          strokeWidth={strokeWidths[size]}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white font-mono">{Math.round(percentage)}%</span>
        {label && <span className="text-xs text-slate-400">{label}</span>}
        {sublabel && <span className="text-xs text-slate-500">{sublabel}</span>}
      </div>
    </div>
  );
};

export const MuscleActivationBar = ({ muscle, activation, isPrimary = false }) => {
  const getColor = (value) => {
    if (value >= 80) return 'from-red-500 to-red-400';
    if (value >= 60) return 'from-orange-500 to-orange-400';
    if (value >= 40) return 'from-yellow-500 to-yellow-400';
    return 'from-teal-500 to-teal-400';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-sm ${isPrimary ? 'font-medium text-white' : 'text-slate-400'}`}>
          {muscle}
        </span>
        <span className="text-sm font-mono text-slate-400">{activation}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${getColor(activation)} rounded-full transition-all duration-500`}
          style={{ width: `${activation}%` }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// AVATAR & USER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Avatar = ({ src, name, size = 'md', status }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-500',
    busy: 'bg-red-500',
  };

  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative inline-block">
      <div className={`${sizes[size]} rounded-full overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center`}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold text-white">{initials || '?'}</span>
        )}
      </div>
      {status && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-slate-900`} />
      )}
    </div>
  );
};

export const UserListItem = ({ name, avatar, subtitle, action, onClick }) => (
  <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors">
    <Avatar src={avatar} name={name} size="md" />
    <div className="flex-1 min-w-0">
      <p className="font-medium text-white truncate">{name}</p>
      {subtitle && <p className="text-sm text-slate-400 truncate">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// MuscleMap UI Component Library - Part 3
// Navigation, Layout, and Overlay Components

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const BottomNav = ({ items, activeItem, onChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 safe-area-pb z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-all ${
              activeItem === item.id ? 'text-teal-400' : 'text-slate-500'
            }`}
          >
            <div className={`relative ${activeItem === item.id ? 'scale-110' : ''} transition-transform`}>
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
            {activeItem === item.id && (
              <div className="absolute bottom-0 w-12 h-0.5 bg-teal-400 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export const TabBar = ({ tabs, activeTab, onChange, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-800/50 border-slate-700/50',
    pills: 'bg-transparent gap-2',
    underline: 'bg-transparent border-b border-slate-700',
  };

  const tabStyles = {
    default: (active) => `px-4 py-2.5 ${active ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'}`,
    pills: (active) => `px-4 py-2 rounded-full ${active ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`,
    underline: (active) => `px-4 py-3 border-b-2 -mb-px ${active ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-white'}`,
  };

  return (
    <div className={`flex ${variant === 'default' ? 'rounded-xl p-1 border' : ''} ${variants[variant]}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 font-medium text-sm transition-all ${
            variant === 'default' ? 'rounded-lg' : ''
          } ${tabStyles[variant](activeTab === tab.id)}`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export const Header = ({ 
  title, 
  subtitle,
  leftAction, 
  rightAction, 
  transparent = false,
  size = 'md' 
}) => {
  const sizes = {
    sm: 'h-14',
    md: 'h-16',
    lg: 'h-20',
  };

  return (
    <header className={`
      ${sizes[size]} px-4 flex items-center justify-between
      ${transparent ? '' : 'bg-slate-900/95 backdrop-blur-xl border-b border-slate-800'}
    `}>
      <div className="flex items-center gap-3 min-w-0">
        {leftAction && (
          <div className="flex-shrink-0">{leftAction}</div>
        )}
        <div className="min-w-0">
          <h1 className="font-semibold text-white text-lg truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {rightAction && (
        <div className="flex items-center gap-2 flex-shrink-0">{rightAction}</div>
      )}
    </header>
  );
};

export const BackButton = ({ onClick, label = 'Back' }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-2 text-sm">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span className="text-slate-600">/</span>}
        {item.href ? (
          <a href={item.href} className="text-slate-400 hover:text-white transition-colors">
            {item.label}
          </a>
        ) : (
          <span className="text-white font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Container = ({ children, className = '', size = 'default' }) => {
  const sizes = {
    sm: 'max-w-md',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  return (
    <div className={`mx-auto px-4 ${sizes[size]} ${className}`}>
      {children}
    </div>
  );
};

export const Section = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`space-y-4 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between">
        <div>
          {title && <h2 className="font-semibold text-white text-lg">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Divider = ({ label }) => (
  <div className="flex items-center gap-4 my-6">
    <div className="flex-1 h-px bg-slate-700" />
    {label && <span className="text-sm text-slate-500 font-medium">{label}</span>}
    <div className="flex-1 h-px bg-slate-700" />
  </div>
);

export const Spacer = ({ size = 'md' }) => {
  const sizes = {
    xs: 'h-2',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
    '2xl': 'h-16',
  };
  return <div className={sizes[size]} />;
};

export const Grid = ({ children, cols = 2, gap = 'md', className = '' }) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  const gaps = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${colsClasses[cols]} ${gaps[gap]} ${className}`}>
      {children}
    </div>
  );
};

export const Stack = ({ children, direction = 'vertical', gap = 'md', align = 'stretch', className = '' }) => {
  const directions = {
    vertical: 'flex-col',
    horizontal: 'flex-row',
  };

  const gaps = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignments = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  return (
    <div className={`flex ${directions[direction]} ${gaps[gap]} ${alignments[align]} ${className}`}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Modal = ({ isOpen, onClose, title, children, size = 'md', showClose = true }) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-full mx-4',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative w-full ${sizes[size]} bg-slate-800 rounded-2xl shadow-2xl
        animate-in fade-in zoom-in-95 duration-200
      `}>
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="font-semibold text-white text-lg">{title}</h2>
            {showClose && (
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const BottomSheet = ({ isOpen, onClose, title, children, snapPoints = ['50%', '90%'] }) => {
  const [currentSnap, _setCurrentSnap] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-slate-800 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{ height: snapPoints[currentSnap] }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-700">
            <h2 className="font-semibold text-white text-lg">{title}</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const Drawer = ({ isOpen, onClose, position = 'right', title, children }) => {
  const positions = {
    left: 'left-0 animate-in slide-in-from-left',
    right: 'right-0 animate-in slide-in-from-right',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`
        absolute top-0 bottom-0 w-80 max-w-[85vw] bg-slate-800 shadow-2xl
        ${positions[position]} duration-300
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-semibold text-white text-lg">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-65px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute ${positions[position]} z-50 px-2 py-1 bg-slate-700 text-white text-sm rounded-lg whitespace-nowrap shadow-lg`}>
          {content}
        </div>
      )}
    </div>
  );
};

export const Popover = ({ trigger, children, position = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-0 mr-2',
    right: 'left-full top-0 ml-2',
  };

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className={`absolute ${positions[position]} z-50 min-w-[200px] bg-slate-800 border border-slate-700 rounded-xl shadow-xl`}>
          {children}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const Toast = ({ message, type = 'info', isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible && duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const types = {
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    success: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    error: 'bg-red-500/20 border-red-500/50 text-red-300',
  };

  const icons = {
    info: '💡',
    success: '✓',
    warning: '⚠',
    error: '✕',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${types[type]}`}>
        <span className="text-lg">{icons[type]}</span>
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const Alert = ({ title, message, type = 'info', onClose, action }) => {
  const types = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
  };

  return (
    <div className={`p-4 rounded-xl border ${types[type]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <p className="text-sm opacity-90">{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
        {onClose && (
          <button onClick={onClose} className="opacity-60 hover:opacity-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export const Skeleton = ({ variant = 'text', width, height, className = '' }) => {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div 
      className={`bg-slate-700 animate-pulse ${variants[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    {icon && <div className="text-slate-600 mb-4">{icon}</div>}
    <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
    {description && <p className="text-slate-400 text-sm mb-6 max-w-xs">{description}</p>}
    {action}
  </div>
);

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
};

// MuscleMap UI Component Library - Part 4
// Workout, Exercise, and Domain-Specific Components

// ═══════════════════════════════════════════════════════════════════════════
// TIMER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const RestTimer = ({ duration, onComplete, onSkip, autoStart = true, size = 'lg' }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { onComplete?.(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  const percentage = (timeLeft / duration) * 100;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const sizes = { md: { container: 'w-32 h-32', text: 'text-3xl' }, lg: { container: 'w-44 h-44', text: 'text-5xl' }, xl: { container: 'w-56 h-56', text: 'text-6xl' } };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`relative ${sizes[size].container}`}>
        <svg className="w-full h-full -rotate-90">
          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#334155" strokeWidth="8" />
          <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-linear" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-white font-mono ${sizes[size].text}`}>{formatTime(timeLeft)}</span>
          <span className="text-slate-400 uppercase tracking-wider text-sm">Rest</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setIsRunning(!isRunning)} className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium hover:bg-slate-700">{isRunning ? 'Pause' : 'Resume'}</button>
        <button onClick={onSkip} className="px-6 py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600">Skip Rest</button>
      </div>
    </div>
  );
};

export const WorkoutTimer = ({ isActive, startTime }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [isActive, startTime]);
  const formatTime = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`; };
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-teal-400 animate-pulse' : 'bg-slate-500'}`} />
      <span className="font-mono text-white font-medium">{formatTime(elapsed)}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export const ExerciseHeader = ({ name, muscleGroups, setNumber, totalSets, onInfo, onSwap }) => (
  <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-xs text-teal-400 uppercase tracking-wider font-medium mb-1">Set {setNumber} of {totalSets}</p>
        <h2 className="text-xl font-bold text-white">{name}</h2>
      </div>
      <div className="flex gap-2">
        {onInfo && <button onClick={onInfo} className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>}
        {onSwap && <button onClick={onSwap} className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>}
      </div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {muscleGroups.map((m, i) => <span key={i} className="px-2 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs font-medium">{m}</span>)}
    </div>
  </div>
);

export const SetInput = ({ label, value, onChange, unit, min = 0, max = 9999, step = 1 }) => (
  <div className="flex-1">
    <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</label>
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))} step={step} className="w-full px-4 py-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-teal-500" />
      {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{unit}</span>}
    </div>
  </div>
);

export const SetLogger = ({ targetReps, targetWeight, previousReps, previousWeight, onComplete }) => {
  const [reps, setReps] = useState(targetReps);
  const [weight, setWeight] = useState(targetWeight);
  return (
    <div className="space-y-4">
      {(previousReps || previousWeight) && <div className="flex items-center justify-center gap-4 text-sm text-slate-400"><span>Previous:</span><span className="font-mono">{previousWeight} lbs × {previousReps} reps</span></div>}
      <div className="flex gap-4">
        <SetInput label="Weight" value={weight} onChange={setWeight} unit="lbs" step={2.5} />
        <SetInput label="Reps" value={reps} onChange={setReps} unit="reps" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-slate-500 text-center">Weight</p>
          <div className="flex gap-1">
            {[-5, -2.5, 2.5, 5].map(n => <button key={n} onClick={() => setWeight(w => Math.max(0, w + n))} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 font-medium">{n > 0 ? '+' : ''}{n}</button>)}
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs text-slate-500 text-center">Reps</p>
          <div className="flex gap-1">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 font-medium">-1</button>
            <button onClick={() => setReps(r => r + 1)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 font-medium">+1</button>
          </div>
        </div>
      </div>
      <button onClick={() => onComplete({ reps, weight })} className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-teal-500/25 hover:from-teal-600 hover:to-teal-700 active:scale-[0.98]">Complete Set</button>
    </div>
  );
};

export const ExerciseProgress = ({ sets, currentSet }) => (
  <div className="flex items-center justify-center gap-2">
    {sets.map((_, i) => (
      <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${i < currentSet ? 'bg-teal-500 text-white' : i === currentSet ? 'bg-teal-500/20 text-teal-400 border-2 border-teal-500 scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
        {i < currentSet ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : i + 1}
      </div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MUSCLE VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════

export const MuscleHeatmap = ({ activations = {}, onMuscleClick }) => {
  const getColor = (a) => a >= 80 ? '#EF4444' : a >= 60 ? '#F97316' : a >= 40 ? '#EAB308' : a >= 20 ? '#14B8A6' : '#334155';
  const getOpacity = (a) => a >= 80 ? 0.9 : a >= 60 ? 0.8 : a >= 40 ? 0.7 : a >= 20 ? 0.6 : 0.3;

  return (
    <div className="relative">
      <svg viewBox="0 0 200 320" className="w-full max-w-[200px] mx-auto">
        <defs>
          <filter id="muscleGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <linearGradient id="bodyFill" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#334155" /></linearGradient>
        </defs>
        <g fill="url(#bodyFill)">
          <ellipse cx="100" cy="35" rx="22" ry="28" />
          <rect x="90" y="60" width="20" height="15" rx="4" />
          <path d="M 60 75 Q 100 65 140 75 Q 150 120 140 180 Q 100 190 60 180 Q 50 120 60 75" />
          <ellipse cx="48" cy="95" rx="15" ry="25" /><ellipse cx="152" cy="95" rx="15" ry="25" />
          <ellipse cx="40" cy="140" rx="10" ry="30" /><ellipse cx="160" cy="140" rx="10" ry="30" />
          <ellipse cx="80" cy="225" rx="20" ry="50" /><ellipse cx="120" cy="225" rx="20" ry="50" />
        </g>
        <g filter="url(#muscleGlow)">
          <ellipse cx="100" cy="95" rx="35" ry="20" fill={getColor(activations.chest || 0)} opacity={getOpacity(activations.chest || 0)} onClick={() => onMuscleClick?.('chest')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="55" cy="80" rx="15" ry="18" fill={getColor(activations.shoulders || 0)} opacity={getOpacity(activations.shoulders || 0)} onClick={() => onMuscleClick?.('shoulders')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="145" cy="80" rx="15" ry="18" fill={getColor(activations.shoulders || 0)} opacity={getOpacity(activations.shoulders || 0)} onClick={() => onMuscleClick?.('shoulders')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="45" cy="120" rx="10" ry="25" fill={getColor(activations.biceps || 0)} opacity={getOpacity(activations.biceps || 0)} onClick={() => onMuscleClick?.('biceps')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="155" cy="120" rx="10" ry="25" fill={getColor(activations.biceps || 0)} opacity={getOpacity(activations.biceps || 0)} onClick={() => onMuscleClick?.('biceps')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="100" cy="140" rx="20" ry="35" fill={getColor(activations.abs || 0)} opacity={getOpacity(activations.abs || 0)} onClick={() => onMuscleClick?.('abs')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="80" cy="220" rx="18" ry="45" fill={getColor(activations.quads || 0)} opacity={getOpacity(activations.quads || 0)} onClick={() => onMuscleClick?.('quads')} className="cursor-pointer hover:brightness-110" />
          <ellipse cx="120" cy="220" rx="18" ry="45" fill={getColor(activations.quads || 0)} opacity={getOpacity(activations.quads || 0)} onClick={() => onMuscleClick?.('quads')} className="cursor-pointer hover:brightness-110" />
        </g>
      </svg>
      <div className="flex justify-center gap-4 mt-4">
        {[{ c: 'bg-red-500', l: '80%+' }, { c: 'bg-orange-500', l: '60%+' }, { c: 'bg-yellow-500', l: '40%+' }, { c: 'bg-teal-500', l: '20%+' }].map(({ c, l }) => (
          <div key={l} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${c}`} /><span className="text-xs text-slate-400">{l}</span></div>
        ))}
      </div>
    </div>
  );
};

export const MuscleActivationBarSimple = ({ muscle, activation, isPrimary = false }) => {
  const getColor = (v) => v >= 80 ? 'from-red-500 to-red-400' : v >= 60 ? 'from-orange-500 to-orange-400' : v >= 40 ? 'from-yellow-500 to-yellow-400' : 'from-teal-500 to-teal-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-sm ${isPrimary ? 'font-medium text-white' : 'text-slate-400'}`}>{muscle}</span>
        <span className="text-sm font-mono text-slate-400">{activation}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getColor(activation)} rounded-full transition-all duration-500`} style={{ width: `${activation}%` }} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

export const WorkoutSummary = ({ duration, exercises, sets, volume, prs = [], musclesCovered = [] }) => (
  <div className="space-y-6">
    <div className="text-center py-6">
      <div className="text-6xl mb-4">💪</div>
      <h2 className="text-2xl font-bold text-white mb-2">Workout Complete!</h2>
      <p className="text-slate-400">Great job pushing through!</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[{ l: 'Duration', v: duration }, { l: 'Exercises', v: exercises }, { l: 'Sets', v: sets }, { l: 'Volume', v: `${volume}`, u: 'lbs' }].map(({ l, v, u }) => (
        <div key={l} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-1">{l}</p>
          <p className="text-2xl font-bold text-white font-mono">{v}{u && <span className="text-sm text-slate-400 ml-1">{u}</span>}</p>
        </div>
      ))}
    </div>
    {prs.length > 0 && (
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🏆</span><h3 className="font-semibold text-white">Personal Records</h3></div>
        <div className="space-y-2">{prs.map((pr, i) => <div key={i} className="flex justify-between"><span className="text-yellow-200">{pr.exercise}</span><span className="font-mono text-yellow-400">{pr.value}</span></div>)}</div>
      </div>
    )}
    {musclesCovered.length > 0 && (
      <div><h3 className="font-medium text-slate-400 mb-3">Muscles Worked</h3><div className="flex flex-wrap gap-2">{musclesCovered.map((m, i) => <span key={i} className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 text-sm font-medium">{m}</span>)}</div></div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════

export const LeaderboardItem = ({ rank, name, avatar, score, unit, isCurrentUser = false }) => {
  const getRankStyle = (r) => r === 1 ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white' : r === 2 ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800' : r === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' : 'bg-slate-700 text-slate-300';
  const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${isCurrentUser ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-slate-800/50 border border-slate-700/50'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getRankStyle(rank)}`}>{emoji || rank}</div>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="font-semibold text-white text-sm">{name.charAt(0)}</span>}
      </div>
      <div className="flex-1 min-w-0"><p className={`font-medium truncate ${isCurrentUser ? 'text-teal-300' : 'text-white'}`}>{name}{isCurrentUser && <span className="text-teal-400 ml-1">(You)</span>}</p></div>
      <div className="text-right"><span className="font-bold text-white font-mono">{score.toLocaleString()}</span>{unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CREDITS
// ═══════════════════════════════════════════════════════════════════════════

export const CreditBalance = ({ balance, size = 'md' }) => {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"><span className="text-sm">⚡</span></div>
      <span className={`font-bold text-white font-mono ${sizes[size]}`}>{balance.toLocaleString()}</span>
      <span className="text-slate-400 text-sm">credits</span>
    </div>
  );
};

export const CreditTransaction = ({ type, amount, description, date }) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-700/50 last:border-0">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'earned' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{type === 'earned' ? '+' : '-'}</div>
    <div className="flex-1 min-w-0"><p className="font-medium text-white truncate">{description}</p><p className="text-sm text-slate-500">{date}</p></div>
    <span className={`font-bold font-mono ${type === 'earned' ? 'text-emerald-400' : 'text-red-400'}`}>{type === 'earned' ? '+' : '-'}{amount}</span>
  </div>
);

export default { RestTimer, WorkoutTimer, ExerciseHeader, SetInput, SetLogger, ExerciseProgress, MuscleHeatmap, MuscleActivationBar, MuscleActivationBarSimple, WorkoutSummary, LeaderboardItem, CreditBalance, CreditTransaction };
