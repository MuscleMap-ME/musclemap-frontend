/**
 * SEO Configuration for MuscleMap
 *
 * Centralized SEO metadata for all pages.
 * Each page can override with custom props via the <SEO /> component.
 */

export const seoConfig = {
  // Public pages
  '/': {
    title: null, // null = use default "MuscleMap - Visual Fitness Tracking"
    description: 'See every rep. Know every muscle. Own your progress. MuscleMap visualizes muscle activation in real-time for effective fitness tracking.',
    type: 'website',
  },

  '/features': {
    title: 'Features',
    description: 'Explore MuscleMap features: real-time muscle visualization, AI workout generation, cross-platform sync, RPG progression, and community features.',
  },

  '/technology': {
    title: 'Technology',
    description: 'Discover the technology behind MuscleMap: React, Fastify, GraphQL, PostgreSQL, and more. Modern architecture for seamless fitness tracking.',
  },

  '/science': {
    title: 'Science',
    description: 'The science behind MuscleMap muscle tracking. Evidence-based exercise visualization and progressive overload principles for optimal results.',
  },

  '/design': {
    title: 'Design',
    description: 'MuscleMap design philosophy: glassmorphism UI, 3D muscle visualizations, and a dark theme optimized for gym environments.',
  },

  '/design-system': {
    title: 'Design System',
    description: 'MuscleMap design system documentation. Component library, color palette, typography, and UI guidelines for developers.',
  },

  '/docs': {
    title: 'Documentation',
    description: 'Complete MuscleMap documentation. User guides, API reference, getting started tutorials, and feature documentation.',
  },

  '/docs/getting-started': {
    title: 'Getting Started',
    description: 'Get started with MuscleMap in minutes. Create your account, choose your archetype, and log your first workout.',
  },

  '/docs/features': {
    title: 'Feature Documentation',
    description: 'Detailed documentation for all MuscleMap features including muscle tracking, AI prescriptions, and character stats.',
  },

  '/docs/community': {
    title: 'Community Guide',
    description: 'Join the MuscleMap community. Hangouts, Crews, Rivalries, and connecting with fellow fitness enthusiasts.',
  },

  '/docs/api': {
    title: 'API Reference',
    description: 'MuscleMap API documentation. REST and GraphQL endpoints for developers building on the MuscleMap platform.',
  },

  '/skills': {
    title: 'Skill Trees',
    description: 'Unlock fitness abilities with MuscleMap skill trees. Progress through strength, endurance, flexibility, and more.',
  },

  '/martial-arts': {
    title: 'Martial Arts',
    description: 'Train martial arts disciplines with MuscleMap. Track progress in boxing, BJJ, karate, and more combat sports.',
  },

  '/issues': {
    title: 'Issue Tracker',
    description: 'MuscleMap public issue tracker. Report bugs, request features, and track development progress.',
  },

  '/updates': {
    title: 'Development Updates',
    description: 'Latest MuscleMap development updates. New features, bug fixes, and improvements to the platform.',
  },

  '/roadmap': {
    title: 'Roadmap',
    description: 'MuscleMap development roadmap. Upcoming features, planned improvements, and long-term vision.',
  },

  '/login': {
    title: 'Log In',
    description: 'Log in to your MuscleMap account. Access your workouts, progress, and community features.',
  },

  '/signup': {
    title: 'Sign Up',
    description: 'Create your free MuscleMap account. Start tracking your fitness journey with real-time muscle visualization.',
  },

  '/privacy': {
    title: 'Privacy Policy',
    description: 'MuscleMap privacy policy. How we collect, use, and protect your personal data and fitness information.',
  },

  // Protected pages (noindex)
  '/dashboard': {
    title: 'Dashboard',
    description: 'Your MuscleMap dashboard. Track workouts, view progress, and manage your fitness journey.',
    noindex: true,
  },

  '/workout': {
    title: 'Workout',
    description: 'Log your workout with real-time muscle activation visualization.',
    noindex: true,
  },

  '/profile': {
    title: 'Profile',
    description: 'Your MuscleMap profile. View stats, achievements, and customize your experience.',
    noindex: true,
  },

  '/settings': {
    title: 'Settings',
    description: 'MuscleMap account settings. Customize notifications, privacy, and app preferences.',
    noindex: true,
  },

  '/progression': {
    title: 'Progression',
    description: 'Track your fitness progression over time with detailed charts and analytics.',
    noindex: true,
  },

  '/community': {
    title: 'Community',
    description: 'Connect with the MuscleMap community. Find workout partners and join fitness groups.',
    noindex: true,
  },

  '/competitions': {
    title: 'Competitions',
    description: 'Join fitness competitions and challenges. Compete with friends and the community.',
    noindex: true,
  },

  '/exercises': {
    title: 'Exercise Library',
    description: 'Browse the MuscleMap exercise library with muscle activation data for every movement.',
    noindex: true,
  },

  '/stats': {
    title: 'Character Stats',
    description: 'View your RPG-style character stats. Strength, endurance, agility, and more.',
    noindex: true,
  },

  '/wallet': {
    title: 'Wallet',
    description: 'Your MuscleMap wallet. Manage credits and rewards.',
    noindex: true,
  },

  '/health': {
    title: 'Health',
    description: 'Track health metrics and wellness data in MuscleMap.',
    noindex: true,
  },

  '/goals': {
    title: 'Goals',
    description: 'Set and track your fitness goals in MuscleMap.',
    noindex: true,
  },

  '/crews': {
    title: 'Crews',
    description: 'Join or create workout crews to train with friends.',
    noindex: true,
  },

  '/rivals': {
    title: 'Rivals',
    description: 'Track your fitness rivals and compete head-to-head.',
    noindex: true,
  },

  '/achievements': {
    title: 'Achievements',
    description: 'View your earned achievements and badges.',
    noindex: true,
  },

  '/journey': {
    title: 'Journey',
    description: 'Your fitness journey through MuscleMap.',
    noindex: true,
  },

  '/leaderboard': {
    title: 'Leaderboard',
    description: 'MuscleMap fitness leaderboards and rankings.',
    noindex: true,
  },
};

/**
 * Get SEO config for a given pathname
 * Falls back to defaults if path not found
 */
export function getSeoConfig(pathname) {
  // Remove trailing slash for consistency
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

  // Try exact match first
  if (seoConfig[normalizedPath]) {
    return seoConfig[normalizedPath];
  }

  // Try parent path for dynamic routes like /docs/:docId
  const parentPath = normalizedPath.split('/').slice(0, -1).join('/') || '/';
  if (seoConfig[parentPath]) {
    return seoConfig[parentPath];
  }

  // Default fallback
  return {
    title: null,
    description: 'MuscleMap - Visual fitness tracking that shows muscle activation in real-time.',
  };
}

export default seoConfig;
