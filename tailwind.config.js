/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ============================================
         GLASS BACKGROUND COLORS
         ============================================ */
      backgroundColor: {
        // White glass surfaces (transparent)
        'glass-white-3': 'rgba(255, 255, 255, 0.03)',
        'glass-white-5': 'rgba(255, 255, 255, 0.05)',
        'glass-white-8': 'rgba(255, 255, 255, 0.08)',
        'glass-white-10': 'rgba(255, 255, 255, 0.10)',
        'glass-white-15': 'rgba(255, 255, 255, 0.15)',
        'glass-white-20': 'rgba(255, 255, 255, 0.20)',
        'glass-white-30': 'rgba(255, 255, 255, 0.30)',
        // Dark glass surfaces
        'glass-dark-5': 'rgba(0, 0, 0, 0.05)',
        'glass-dark-10': 'rgba(0, 0, 0, 0.10)',
        'glass-dark-20': 'rgba(0, 0, 0, 0.20)',
        'glass-dark-30': 'rgba(0, 0, 0, 0.30)',
        'glass-dark-40': 'rgba(0, 0, 0, 0.40)',
        'glass-dark-50': 'rgba(0, 0, 0, 0.50)',
        // Brand-tinted glass (blue)
        'glass-brand-subtle': 'rgba(0, 102, 255, 0.05)',
        'glass-brand-light': 'rgba(0, 102, 255, 0.10)',
        'glass-brand-medium': 'rgba(0, 102, 255, 0.15)',
        'glass-brand-strong': 'rgba(0, 102, 255, 0.25)',
        // Pulse-tinted glass (magenta)
        'glass-pulse-subtle': 'rgba(255, 51, 102, 0.05)',
        'glass-pulse-light': 'rgba(255, 51, 102, 0.10)',
        'glass-pulse-medium': 'rgba(255, 51, 102, 0.20)',
        'glass-pulse-strong': 'rgba(255, 51, 102, 0.35)',
        // Void backgrounds
        'void-pure': '#000000',
        'void-deep': '#050508',
        'void-base': '#0a0a0f',
        'void-elevated': '#0f0f15',
        'void-surface': '#14141c',
      },
      /* ============================================
         GLASS BORDER COLORS
         ============================================ */
      borderColor: {
        // Transparent white borders
        'glass-subtle': 'rgba(255, 255, 255, 0.05)',
        'glass-default': 'rgba(255, 255, 255, 0.08)',
        'glass-medium': 'rgba(255, 255, 255, 0.12)',
        'glass-strong': 'rgba(255, 255, 255, 0.20)',
        'glass-luminous': 'rgba(255, 255, 255, 0.25)',
        // Brand glow borders
        'glass-brand-glow': 'rgba(0, 102, 255, 0.5)',
        'glass-pulse-glow': 'rgba(255, 51, 102, 0.5)',
        // Transparent dark borders
        'glass-dark-5': 'rgba(0, 0, 0, 0.05)',
        'glass-dark-10': 'rgba(0, 0, 0, 0.10)',
        'glass-dark-20': 'rgba(0, 0, 0, 0.20)',
      },
      /* ============================================
         BACKDROP BLUR VALUES
         ============================================ */
      backdropBlur: {
        'xs': '4px',
        'glass-sm': '8px',
        'glass-md': '12px',
        'glass-lg': '16px',
        'glass-xl': '24px',
        'glass-2xl': '32px',
        'glass-3xl': '48px',
      },
      /* ============================================
         GLASS BOX SHADOWS
         ============================================ */
      boxShadow: {
        // Glass card shadows (outer depth)
        'glass': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'glass-md': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'glass-xl': '0 16px 48px rgba(0, 0, 0, 0.6)',
        // Inner glow effects
        'glass-inner-subtle': 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
        'glass-inner-light': 'inset 0 1px 2px rgba(255, 255, 255, 0.08)',
        'glass-inner-medium': 'inset 0 1px 3px rgba(255, 255, 255, 0.12)',
        // Brand glow halos
        'glow-brand-sm': '0 0 10px rgba(0, 102, 255, 0.3)',
        'glow-brand-md': '0 0 20px rgba(0, 102, 255, 0.4)',
        'glow-brand-lg': '0 0 30px rgba(0, 102, 255, 0.5)',
        // Pulse glow halos
        'glow-pulse-sm': '0 0 10px rgba(255, 51, 102, 0.3)',
        'glow-pulse-md': '0 0 20px rgba(255, 51, 102, 0.4)',
        'glow-pulse-lg': '0 0 30px rgba(255, 51, 102, 0.5)',
        // Combined glass card shadow (inner glow + outer shadow)
        'glass-card': 'inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 2px 8px rgba(0, 0, 0, 0.3)',
        'glass-card-hover': 'inset 0 1px 2px rgba(255, 255, 255, 0.08), 0 4px 16px rgba(0, 0, 0, 0.4)',
        'glass-card-selected': 'inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 0 20px rgba(0, 102, 255, 0.4), 0 8px 32px rgba(0, 0, 0, 0.5)',
        // Archetype card specific shadows
        'archetype': 'inset 0 1px 2px rgba(255, 255, 255, 0.08), 0 4px 20px rgba(0, 0, 0, 0.4)',
        'archetype-hover': 'inset 0 2px 4px rgba(255, 255, 255, 0.12), 0 8px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 102, 255, 0.2)',
        'archetype-selected': 'inset 0 2px 4px rgba(255, 255, 255, 0.15), 0 0 40px rgba(0, 102, 255, 0.5), 0 12px 48px rgba(0, 0, 0, 0.6)',
      },
      /* ============================================
         BRAND COLORS
         ============================================ */
      colors: {
        // Primary Blue Spectrum
        'brand-blue': {
          50: '#e6f0ff',
          100: '#b3d4ff',
          200: '#80b8ff',
          300: '#4d9cff',
          400: '#1a80ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        // Pulse/Magenta Spectrum
        'brand-pulse': {
          50: '#ffe6ec',
          100: '#ffb3c4',
          200: '#ff809c',
          300: '#ff4d74',
          400: '#ff1a4c',
          500: '#ff3366',
          600: '#cc2952',
          700: '#991f3d',
          800: '#661429',
          900: '#330a14',
        },
        // Void backgrounds
        'void': {
          pure: '#000000',
          deep: '#050508',
          base: '#0a0a0f',
          elevated: '#0f0f15',
          surface: '#14141c',
        },
        // Muscle activation colors
        'muscle': {
          chest: '#ef4444',
          back: '#3b82f6',
          shoulders: '#f97316',
          arms: '#8b5cf6',
          legs: '#22c55e',
          core: '#eab308',
          cardio: '#ec4899',
        },
      },
      /* ============================================
         BORDER RADIUS
         ============================================ */
      borderRadius: {
        'glass-xs': '4px',
        'glass-sm': '6px',
        'glass-md': '8px',
        'glass-lg': '12px',
        'glass-xl': '16px',
        'glass-2xl': '20px',
        'glass-3xl': '24px',
      },
      /* ============================================
         ANIMATION TIMING
         ============================================ */
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-soft': 'cubic-bezier(0.22, 0.68, 0.35, 1.2)',
        'spring-bounce': 'cubic-bezier(0.34, 2.0, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'instant': '50ms',
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
        'slowest': '800ms',
      },
      /* ============================================
         ANIMATIONS
         ============================================ */
      animation: {
        'card-entrance': 'cardEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'card-entrance-stagger': 'cardEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'mesh-drift': 'meshDrift 20s ease-in-out infinite',
      },
      keyframes: {
        cardEntrance: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(0, 102, 255, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(0, 102, 255, 0.6)',
          },
        },
        shimmer: {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        meshDrift: {
          '0%, 100%': {
            backgroundPosition: '0% 0%',
          },
          '50%': {
            backgroundPosition: '100% 100%',
          },
        },
      },
    },
  },
  plugins: [],
}
