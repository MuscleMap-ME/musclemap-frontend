// Sample user data for development/testing

export const currentUser = {
  id: 'demo-user-001',
  email: 'demo@musclemap.me',
  username: 'DemoUser',
  displayName: 'Demo User',
  avatar: null,
  level: 15,
  xp: 4500,
  archetype: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Masters of strength and power',
    philosophy: 'Through discipline comes strength',
    icon: 'sword',
    color: '#FF6B35',
    primaryStats: ['strength', 'endurance'],
  },
  createdAt: '2024-01-01T00:00:00Z',
};

export const sampleUsers = [
  currentUser,
  {
    id: 'user-002',
    email: 'john@example.com',
    username: 'JohnFit',
    displayName: 'John Fitness',
    avatar: null,
    level: 22,
    xp: 8500,
    archetype: {
      id: 'monk',
      name: 'Monk',
      description: 'Balance of mind and body',
      philosophy: 'Inner peace leads to outer strength',
      icon: 'meditation',
      color: '#7B68EE',
      primaryStats: ['flexibility', 'balance', 'mentalFocus'],
    },
    createdAt: '2023-11-15T00:00:00Z',
  },
  {
    id: 'user-003',
    email: 'sarah@example.com',
    username: 'SarahStrong',
    displayName: 'Sarah Strong',
    avatar: null,
    level: 31,
    xp: 15200,
    archetype: {
      id: 'athlete',
      name: 'Athlete',
      description: 'Peak physical performance',
      philosophy: 'Excellence through consistency',
      icon: 'trophy',
      color: '#00CED1',
      primaryStats: ['agility', 'endurance'],
    },
    createdAt: '2023-08-20T00:00:00Z',
  },
];
