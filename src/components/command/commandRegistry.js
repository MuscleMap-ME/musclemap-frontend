/**
 * Command Registry - Central registry for searchable command items
 *
 * Provides a way to register commands that can be searched and executed
 * from the CommandPalette. Supports categories, keywords, icons, and shortcuts.
 *
 * @example
 * // Register a custom command
 * registerCommand({
 *   id: 'custom-action',
 *   title: 'My Custom Action',
 *   category: 'Actions',
 *   keywords: ['custom', 'action'],
 *   action: () => console.log('Custom action!'),
 *   icon: 'Zap'
 * });
 *
 * // Get all commands
 * const commands = getCommands();
 *
 * // Search commands
 * const results = searchCommands('workout');
 */

// ============================================
// CONSTANTS
// ============================================

export const CATEGORIES = {
  PAGES: 'Pages',
  EXERCISES: 'Exercises',
  ACTIONS: 'Actions',
  COMMUNITY: 'Community',
  SETTINGS: 'Settings',
  RECENT: 'Recent',
};

export const CATEGORY_ORDER = [
  CATEGORIES.RECENT,
  CATEGORIES.PAGES,
  CATEGORIES.ACTIONS,
  CATEGORIES.EXERCISES,
  CATEGORIES.COMMUNITY,
  CATEGORIES.SETTINGS,
];

// ============================================
// REGISTRY STATE
// ============================================

// In-memory registry of all commands
const commandRegistry = new Map();

// Event listeners for registry changes
const listeners = new Set();

// ============================================
// FUZZY SEARCH ALGORITHM
// ============================================

/**
 * Calculate fuzzy match score between query and text
 * Returns a score where higher = better match
 * Returns 0 if no match
 */
export function fuzzyScore(query, text) {
  if (!query || !text) return 0;

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // Empty query matches everything
  if (queryLower.length === 0) return 1;

  // Exact match - highest score
  if (textLower === queryLower) return 1000;

  // Starts with query - very high score
  if (textLower.startsWith(queryLower)) return 900;

  // Word boundary match (e.g., "st wo" matches "Start Workout")
  const words = textLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  let wordMatches = 0;
  for (const qWord of queryWords) {
    if (words.some((w) => w.startsWith(qWord))) {
      wordMatches++;
    }
  }
  if (wordMatches === queryWords.length) {
    return 800 + wordMatches * 10;
  }

  // Contains query as substring
  const index = textLower.indexOf(queryLower);
  if (index !== -1) {
    // Earlier position = higher score
    return 700 - Math.min(index * 10, 200);
  }

  // Fuzzy character matching with gap penalty
  let score = 0;
  let queryIndex = 0;
  let lastMatchIndex = -1;
  let consecutive = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      // Bonus for consecutive matches
      consecutive++;
      score += 10 + consecutive * 5;

      // Bonus for matching at word boundaries
      if (i === 0 || /\s/.test(textLower[i - 1])) {
        score += 15;
      }

      // Penalty for large gaps
      if (lastMatchIndex !== -1) {
        const gap = i - lastMatchIndex - 1;
        score -= Math.min(gap * 2, 20);
      }

      lastMatchIndex = i;
      queryIndex++;
    } else {
      consecutive = 0;
    }
  }

  // All query characters must be found
  if (queryIndex < queryLower.length) return 0;

  return Math.max(score, 1);
}

/**
 * Highlight matching parts of text for display
 * Returns array of { text, highlight } segments
 */
export function highlightMatches(query, text) {
  if (!query || !text) {
    return [{ text, highlight: false }];
  }

  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();
  const segments = [];
  let lastEnd = 0;

  // Check for substring match first
  const index = textLower.indexOf(queryLower);
  if (index !== -1) {
    if (index > 0) {
      segments.push({ text: text.slice(0, index), highlight: false });
    }
    segments.push({ text: text.slice(index, index + query.length), highlight: true });
    if (index + query.length < text.length) {
      segments.push({ text: text.slice(index + query.length), highlight: false });
    }
    return segments;
  }

  // Fuzzy highlight - highlight each matched character
  let queryIndex = 0;
  for (let i = 0; i < text.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      // Add non-highlighted segment before this match
      if (i > lastEnd) {
        segments.push({ text: text.slice(lastEnd, i), highlight: false });
      }
      // Add highlighted character
      segments.push({ text: text[i], highlight: true });
      lastEnd = i + 1;
      queryIndex++;
    }
  }

  // Add remaining text
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), highlight: false });
  }

  return segments.length > 0 ? segments : [{ text, highlight: false }];
}

// ============================================
// REGISTRY API
// ============================================

/**
 * Register a new command in the registry
 *
 * @param {Object} command - The command to register
 * @param {string} command.id - Unique identifier
 * @param {string} command.title - Display title
 * @param {string} command.category - Category name
 * @param {string[]} [command.keywords] - Additional search keywords
 * @param {Function} [command.action] - Function to execute when selected
 * @param {string} [command.path] - Navigation path (alternative to action)
 * @param {string|React.Component} [command.icon] - Icon name or component
 * @param {string} [command.shortcut] - Keyboard shortcut to display
 * @param {string} [command.description] - Description text
 * @param {Object} [command.data] - Additional data to pass to action
 */
export function registerCommand(command) {
  if (!command.id) {
    console.warn('Command must have an id:', command);
    return false;
  }

  if (!command.title) {
    console.warn('Command must have a title:', command);
    return false;
  }

  // Set defaults
  const normalizedCommand = {
    category: CATEGORIES.ACTIONS,
    keywords: [],
    ...command,
    // Ensure keywords array
    keywords: Array.isArray(command.keywords) ? command.keywords : [],
  };

  commandRegistry.set(command.id, normalizedCommand);
  notifyListeners();
  return true;
}

/**
 * Register multiple commands at once
 *
 * @param {Object[]} commands - Array of commands to register
 */
export function registerCommands(commands) {
  commands.forEach(registerCommand);
}

/**
 * Unregister a command by ID
 *
 * @param {string} id - Command ID to remove
 */
export function unregisterCommand(id) {
  const deleted = commandRegistry.delete(id);
  if (deleted) {
    notifyListeners();
  }
  return deleted;
}

/**
 * Get all registered commands
 *
 * @returns {Object[]} Array of all commands
 */
export function getCommands() {
  return Array.from(commandRegistry.values());
}

/**
 * Get commands by category
 *
 * @param {string} category - Category to filter by
 * @returns {Object[]} Commands in the category
 */
export function getCommandsByCategory(category) {
  return getCommands().filter((cmd) => cmd.category === category);
}

/**
 * Search commands using fuzzy matching
 *
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {string[]} [options.categories] - Categories to search (all if empty)
 * @param {number} [options.maxResults] - Max results per category
 * @returns {Object} Results grouped by category
 */
export function searchCommands(query, options = {}) {
  const { categories = [], maxResults = 5 } = options;
  const trimmedQuery = (query || '').trim();

  const commands = getCommands();

  // Filter by categories if specified
  const filteredCommands =
    categories.length > 0
      ? commands.filter((cmd) => categories.includes(cmd.category))
      : commands;

  // Score each command
  const scored = filteredCommands
    .map((cmd) => {
      // Score against title
      const titleScore = fuzzyScore(trimmedQuery, cmd.title);

      // Score against description
      const descScore = cmd.description ? fuzzyScore(trimmedQuery, cmd.description) * 0.6 : 0;

      // Score against keywords
      const keywordScores = cmd.keywords.map((kw) => fuzzyScore(trimmedQuery, kw) * 0.8);
      const maxKeywordScore = Math.max(0, ...keywordScores);

      // Combined score
      const score = Math.max(titleScore, descScore, maxKeywordScore);

      return {
        ...cmd,
        score,
        highlights: trimmedQuery ? highlightMatches(trimmedQuery, cmd.title) : null,
      };
    })
    .filter((cmd) => cmd.score > 0 || !trimmedQuery) // Include all if no query
    .sort((a, b) => b.score - a.score);

  // Group by category
  const grouped = {};
  CATEGORY_ORDER.forEach((category) => {
    const items = scored.filter((cmd) => cmd.category === category);
    if (items.length > 0) {
      grouped[category] = items.slice(0, maxResults);
    }
  });

  // Add any remaining categories not in CATEGORY_ORDER
  scored.forEach((cmd) => {
    if (!CATEGORY_ORDER.includes(cmd.category)) {
      if (!grouped[cmd.category]) {
        grouped[cmd.category] = [];
      }
      if (grouped[cmd.category].length < maxResults) {
        grouped[cmd.category].push(cmd);
      }
    }
  });

  return grouped;
}

/**
 * Get flat array of search results
 *
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Object[]} Flat array of results
 */
export function searchCommandsFlat(query, options = {}) {
  const grouped = searchCommands(query, options);
  const results = [];

  CATEGORY_ORDER.forEach((category) => {
    if (grouped[category]) {
      results.push(...grouped[category]);
    }
  });

  // Add remaining categories
  Object.keys(grouped).forEach((category) => {
    if (!CATEGORY_ORDER.includes(category)) {
      results.push(...grouped[category]);
    }
  });

  return results;
}

// ============================================
// LISTENERS
// ============================================

/**
 * Subscribe to registry changes
 *
 * @param {Function} callback - Function to call on changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToRegistry(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (e) {
      console.error('Error in registry listener:', e);
    }
  });
}

// ============================================
// BUILT-IN COMMANDS
// ============================================

// Main pages
const BUILT_IN_PAGES = [
  {
    id: 'page-dashboard',
    title: 'Dashboard',
    description: 'Your fitness overview',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    category: CATEGORIES.PAGES,
    keywords: ['home', 'overview', 'main'],
    shortcut: 'G then D',
  },
  {
    id: 'page-workout',
    title: 'Workout',
    description: 'Start or continue a workout',
    path: '/workout',
    icon: 'Dumbbell',
    category: CATEGORIES.PAGES,
    keywords: ['exercise', 'training', 'gym', 'lift'],
    shortcut: 'G then W',
  },
  {
    id: 'page-exercises',
    title: 'Exercises',
    description: 'Browse exercise library',
    path: '/exercises',
    icon: 'Activity',
    category: CATEGORIES.PAGES,
    keywords: ['movements', 'library', 'database'],
    shortcut: 'G then E',
  },
  {
    id: 'page-journey',
    title: 'Journey',
    description: 'Your fitness journey and progress',
    path: '/journey',
    icon: 'Map',
    category: CATEGORIES.PAGES,
    keywords: ['progress', 'path', 'timeline', 'history'],
  },
  {
    id: 'page-stats',
    title: 'Stats',
    description: 'View your statistics and analytics',
    path: '/stats',
    icon: 'BarChart3',
    category: CATEGORIES.PAGES,
    keywords: ['analytics', 'charts', 'data', 'numbers'],
  },
  {
    id: 'page-progression',
    title: 'Progression',
    description: 'Track your strength progression',
    path: '/progression',
    icon: 'TrendingUp',
    category: CATEGORIES.PAGES,
    keywords: ['gains', 'improvement', 'growth'],
  },
  {
    id: 'page-goals',
    title: 'Goals',
    description: 'Manage your fitness goals',
    path: '/goals',
    icon: 'Target',
    category: CATEGORIES.PAGES,
    keywords: ['objectives', 'targets', 'milestones'],
  },
  {
    id: 'page-profile',
    title: 'Profile',
    description: 'View your profile',
    path: '/profile',
    icon: 'User',
    category: CATEGORIES.PAGES,
    keywords: ['account', 'me', 'personal'],
    shortcut: 'G then P',
  },
  {
    id: 'page-achievements',
    title: 'Achievements',
    description: 'View earned badges and accomplishments',
    path: '/achievements',
    icon: 'Trophy',
    category: CATEGORIES.PAGES,
    keywords: ['badges', 'awards', 'accomplishments', 'rewards'],
  },
  {
    id: 'page-credits',
    title: 'Credits',
    description: 'Manage your credits',
    path: '/credits',
    icon: 'Coins',
    category: CATEGORIES.PAGES,
    keywords: ['points', 'currency', 'balance', 'money'],
  },
  {
    id: 'page-health',
    title: 'Health',
    description: 'Health overview and tracking',
    path: '/health',
    icon: 'Heart',
    category: CATEGORIES.PAGES,
    keywords: ['wellness', 'vitals', 'body'],
  },
  {
    id: 'page-nutrition',
    title: 'Nutrition',
    description: 'Track food and macros',
    path: '/nutrition',
    icon: 'Apple',
    category: CATEGORIES.PAGES,
    keywords: ['food', 'diet', 'macros', 'calories', 'eating'],
  },
  {
    id: 'page-skills',
    title: 'Skills',
    description: 'Your skill trees',
    path: '/skills',
    icon: 'Sparkles',
    category: CATEGORIES.PAGES,
    keywords: ['abilities', 'talents', 'tree'],
  },
];

// Community pages
const BUILT_IN_COMMUNITY = [
  {
    id: 'page-community',
    title: 'Community',
    description: 'Connect with other fitness enthusiasts',
    path: '/community',
    icon: 'Users',
    category: CATEGORIES.COMMUNITY,
    keywords: ['social', 'friends', 'people', 'network'],
    shortcut: 'G then C',
  },
  {
    id: 'page-competitions',
    title: 'Competitions',
    description: 'Join fitness challenges',
    path: '/competitions',
    icon: 'Trophy',
    category: CATEGORIES.COMMUNITY,
    keywords: ['challenges', 'contests', 'compete', 'leaderboard'],
  },
  {
    id: 'page-crews',
    title: 'Crews',
    description: 'Manage your workout crews',
    path: '/crews',
    icon: 'Users',
    category: CATEGORIES.COMMUNITY,
    keywords: ['teams', 'groups', 'squad'],
  },
  {
    id: 'page-rivals',
    title: 'Rivals',
    description: 'View your rivals',
    path: '/rivals',
    icon: 'Swords',
    category: CATEGORIES.COMMUNITY,
    keywords: ['opponents', 'competition', 'versus'],
  },
  {
    id: 'page-highfives',
    title: 'High Fives',
    description: 'Send encouragement to others',
    path: '/highfives',
    icon: 'Hand',
    category: CATEGORIES.COMMUNITY,
    keywords: ['kudos', 'support', 'encourage', 'clap'],
  },
  {
    id: 'page-messages',
    title: 'Messages',
    description: 'Your conversations',
    path: '/messages',
    icon: 'MessageCircle',
    category: CATEGORIES.COMMUNITY,
    keywords: ['chat', 'inbox', 'dms', 'conversations'],
    shortcut: 'G then M',
  },
  {
    id: 'page-trainers',
    title: 'Trainers',
    description: 'Find personal trainers',
    path: '/trainers',
    icon: 'UserCheck',
    category: CATEGORIES.COMMUNITY,
    keywords: ['coaches', 'mentors', 'professionals'],
  },
];

// Common actions
const BUILT_IN_ACTIONS = [
  {
    id: 'action-start-workout',
    title: 'Start Workout',
    description: 'Begin a new workout session',
    path: '/workout',
    icon: 'Play',
    category: CATEGORIES.ACTIONS,
    keywords: ['begin', 'new', 'exercise', 'train'],
  },
  {
    id: 'action-log-food',
    title: 'Log Food',
    description: 'Quick log a meal or snack',
    path: '/nutrition',
    icon: 'Plus',
    category: CATEGORIES.ACTIONS,
    keywords: ['meal', 'eat', 'add', 'track'],
  },
  {
    id: 'action-send-highfive',
    title: 'Send High Five',
    description: 'Encourage a friend',
    path: '/highfives',
    icon: 'Hand',
    category: CATEGORIES.ACTIONS,
    keywords: ['kudos', 'support', 'cheer'],
  },
  {
    id: 'action-view-progress',
    title: 'View Progress',
    description: 'See your fitness journey',
    path: '/progression',
    icon: 'TrendingUp',
    category: CATEGORIES.ACTIONS,
    keywords: ['gains', 'growth', 'improvement'],
  },
  {
    id: 'action-check-schedule',
    title: 'Check Schedule',
    description: 'View your workout schedule',
    path: '/journey',
    icon: 'Calendar',
    category: CATEGORIES.ACTIONS,
    keywords: ['plan', 'calendar', 'upcoming'],
  },
  {
    id: 'action-find-gym',
    title: 'Find Gym',
    description: 'Locate nearby gyms',
    path: '/locations',
    icon: 'MapPin',
    category: CATEGORIES.ACTIONS,
    keywords: ['location', 'nearby', 'fitness center'],
  },
  {
    id: 'action-join-competition',
    title: 'Join Competition',
    description: 'Browse active challenges',
    path: '/competitions',
    icon: 'Trophy',
    category: CATEGORIES.ACTIONS,
    keywords: ['challenge', 'contest', 'compete'],
  },
];

// Settings
const BUILT_IN_SETTINGS = [
  {
    id: 'settings-main',
    title: 'Settings',
    description: 'App settings and preferences',
    path: '/settings',
    icon: 'Settings',
    category: CATEGORIES.SETTINGS,
    keywords: ['preferences', 'options', 'config', 'configure'],
    shortcut: 'G then S',
  },
  {
    id: 'settings-profile',
    title: 'Edit Profile',
    description: 'Update your profile information',
    path: '/settings?tab=profile',
    icon: 'User',
    category: CATEGORIES.SETTINGS,
    keywords: ['account', 'personal', 'info'],
  },
  {
    id: 'settings-notifications',
    title: 'Notifications',
    description: 'Manage notification preferences',
    path: '/settings?tab=notifications',
    icon: 'Bell',
    category: CATEGORIES.SETTINGS,
    keywords: ['alerts', 'push', 'email'],
  },
  {
    id: 'settings-privacy',
    title: 'Privacy Settings',
    description: 'Control your privacy',
    path: '/settings?tab=privacy',
    icon: 'Shield',
    category: CATEGORIES.SETTINGS,
    keywords: ['security', 'data', 'visibility'],
  },
  {
    id: 'settings-theme',
    title: 'Theme',
    description: 'Change app appearance',
    path: '/settings?tab=appearance',
    icon: 'Palette',
    category: CATEGORIES.SETTINGS,
    keywords: ['dark', 'light', 'mode', 'color', 'appearance'],
  },
];

// Register all built-in commands
export function initializeBuiltInCommands() {
  registerCommands([
    ...BUILT_IN_PAGES,
    ...BUILT_IN_COMMUNITY,
    ...BUILT_IN_ACTIONS,
    ...BUILT_IN_SETTINGS,
  ]);
}

// Auto-initialize on import
initializeBuiltInCommands();

export default {
  registerCommand,
  registerCommands,
  unregisterCommand,
  getCommands,
  getCommandsByCategory,
  searchCommands,
  searchCommandsFlat,
  subscribeToRegistry,
  fuzzyScore,
  highlightMatches,
  CATEGORIES,
  CATEGORY_ORDER,
};
