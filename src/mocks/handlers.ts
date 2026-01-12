/**
 * MSW Mock Handlers for MuscleMap
 *
 * These handlers provide mock GraphQL responses for local development
 * without needing access to the backend API.
 */

import { graphql, HttpResponse } from 'msw';
import { currentUser, sampleUsers } from '../fixtures/users';
import { exercises, muscles } from '../fixtures/exercises';
import { workouts, workoutStats, muscleStats } from '../fixtures/workouts';

export const handlers = [
  // ============================================
  // AUTH HANDLERS
  // ============================================
  graphql.query('Me', () => {
    return HttpResponse.json({
      data: {
        me: currentUser,
      },
    });
  }),

  graphql.query('MyCapabilities', () => {
    return HttpResponse.json({
      data: {
        myCapabilities: {
          canCreateWorkout: true,
          canJoinHangouts: true,
          canMessage: true,
          canVote: true,
          isPremium: false,
          dailyWorkoutLimit: 5,
          remainingWorkouts: 3,
        },
      },
    });
  }),

  graphql.mutation('Login', ({ variables }) => {
    const { input } = variables as { input: { email: string; password: string } };

    if (input.email === 'demo@musclemap.me' && input.password === 'demo123') {
      return HttpResponse.json({
        data: {
          login: {
            token: 'mock-jwt-token-for-development-' + Date.now(),
            user: currentUser,
          },
        },
      });
    }

    return HttpResponse.json({
      errors: [{ message: 'Invalid email or password' }],
    });
  }),

  graphql.mutation('Register', ({ variables }) => {
    const { input } = variables as { input: { email: string; password: string; username: string } };

    const newUser = {
      ...currentUser,
      id: 'new-user-' + Date.now(),
      email: input.email,
      username: input.username,
      level: 1,
      xp: 0,
      archetype: null,
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      data: {
        register: {
          token: 'mock-jwt-token-for-development-' + Date.now(),
          user: newUser,
        },
      },
    });
  }),

  // ============================================
  // EXERCISE HANDLERS
  // ============================================
  graphql.query('Exercises', ({ variables }) => {
    const { search, muscleGroup, equipment, limit = 20 } = variables as {
      search?: string;
      muscleGroup?: string;
      equipment?: string;
      limit?: number;
    };

    let filtered = [...exercises];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower)
      );
    }

    if (muscleGroup) {
      filtered = filtered.filter(
        (e) =>
          e.primaryMuscles.includes(muscleGroup) ||
          e.secondaryMuscles?.includes(muscleGroup)
      );
    }

    if (equipment) {
      filtered = filtered.filter((e) => e.equipment?.includes(equipment));
    }

    return HttpResponse.json({
      data: {
        exercises: filtered.slice(0, limit),
      },
    });
  }),

  graphql.query('Exercise', ({ variables }) => {
    const { id } = variables as { id: string };
    const exercise = exercises.find((e) => e.id === id);

    if (!exercise) {
      return HttpResponse.json({
        errors: [{ message: 'Exercise not found' }],
      });
    }

    return HttpResponse.json({
      data: { exercise },
    });
  }),

  graphql.query('Muscles', () => {
    return HttpResponse.json({
      data: { muscles },
    });
  }),

  // ============================================
  // WORKOUT HANDLERS
  // ============================================
  graphql.query('MyWorkouts', ({ variables }) => {
    const { limit = 10, offset = 0 } = variables as { limit?: number; offset?: number };

    return HttpResponse.json({
      data: {
        myWorkouts: workouts.slice(offset, offset + limit),
      },
    });
  }),

  graphql.query('Workout', ({ variables }) => {
    const { id } = variables as { id: string };
    const workout = workouts.find((w) => w.id === id);

    if (!workout) {
      return HttpResponse.json({
        errors: [{ message: 'Workout not found' }],
      });
    }

    return HttpResponse.json({
      data: { workout },
    });
  }),

  graphql.query('MyWorkoutStats', () => {
    return HttpResponse.json({
      data: { myWorkoutStats: workoutStats },
    });
  }),

  graphql.query('MyMuscleStats', () => {
    return HttpResponse.json({
      data: { myMuscleStats: muscleStats },
    });
  }),

  graphql.mutation('CreateWorkout', ({ variables }) => {
    const { input } = variables as {
      input: {
        exercises: Array<{
          exerciseId: string;
          sets: number;
          reps: number;
          weight?: number;
        }>;
        notes?: string;
      };
    };

    const newWorkout = {
      id: 'workout-' + Date.now(),
      userId: currentUser.id,
      exercises: input.exercises.map((e) => ({
        ...e,
        name: exercises.find((ex) => ex.id === e.exerciseId)?.name || 'Unknown Exercise',
      })),
      duration: Math.floor(Math.random() * 30) + 30,
      notes: input.notes || null,
      totalTU: Math.floor(Math.random() * 500) + 500,
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      data: {
        createWorkout: {
          workout: newWorkout,
          tuEarned: newWorkout.totalTU,
          characterStats: {
            userId: currentUser.id,
            level: currentUser.level,
            xp: currentUser.xp + newWorkout.totalTU,
            xpToNextLevel: 5000,
            strength: 45,
            endurance: 38,
            agility: 32,
            flexibility: 28,
            balance: 30,
            mentalFocus: 35,
            totalWorkouts: 88,
            totalExercises: 415,
            currentStreak: 13,
            longestStreak: 21,
            lastWorkoutAt: new Date().toISOString(),
          },
          levelUp: false,
          newLevel: null,
          achievements: [],
        },
      },
    });
  }),

  // ============================================
  // STATS HANDLERS
  // ============================================
  graphql.query('MyStats', () => {
    return HttpResponse.json({
      data: {
        myStats: {
          userId: currentUser.id,
          level: currentUser.level,
          xp: currentUser.xp,
          xpToNextLevel: 5000,
          strength: 45,
          endurance: 38,
          agility: 32,
          flexibility: 28,
          balance: 30,
          mentalFocus: 35,
          totalWorkouts: 87,
          totalExercises: 412,
          currentStreak: 12,
          longestStreak: 21,
          lastWorkoutAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
  }),

  graphql.query('Leaderboards', ({ variables }) => {
    const { type = 'overall' } = variables as { type?: string };

    const leaderboard = sampleUsers
      .map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        xp: user.xp,
        stat: type,
        value: user.xp,
      }))
      .sort((a, b) => b.xp - a.xp);

    return HttpResponse.json({
      data: { leaderboards: leaderboard },
    });
  }),

  // ============================================
  // COMMUNITY HANDLERS
  // ============================================
  graphql.query('PublicCommunityStats', () => {
    return HttpResponse.json({
      data: {
        publicCommunityStats: {
          activeNow: { value: 127, display: '127' },
          activeWorkouts: { value: 23, display: '23' },
          totalUsers: { value: 15420, display: '15.4k' },
          totalWorkouts: { value: 284650, display: '284.6k' },
          recentActivity: [
            {
              id: 'activity-1',
              type: 'workout_completed',
              message: 'Someone just completed a workout',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'activity-2',
              type: 'level_up',
              message: 'A user reached level 25!',
              timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            },
          ],
          milestone: {
            type: 'total_workouts',
            value: 300000,
            reached: false,
          },
        },
      },
    });
  }),

  graphql.query('CommunityFeed', ({ variables }) => {
    const { limit = 10 } = variables as { limit?: number };

    const feedItems = sampleUsers.slice(0, limit).map((user, index) => ({
      id: `feed-${index}`,
      type: 'workout_completed',
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content: {
        workoutName: 'Push Day',
        exerciseCount: 5,
        duration: 45,
      },
      createdAt: new Date(Date.now() - index * 30 * 60 * 1000).toISOString(),
      likes: Math.floor(Math.random() * 20),
      comments: Math.floor(Math.random() * 5),
      liked: false,
    }));

    return HttpResponse.json({
      data: { communityFeed: feedItems },
    });
  }),

  // ============================================
  // JOURNEY & ARCHETYPE HANDLERS
  // ============================================
  graphql.query('Journey', () => {
    return HttpResponse.json({
      data: {
        journey: {
          userId: currentUser.id,
          archetype: currentUser.archetype,
          currentLevel: currentUser.level,
          currentXP: currentUser.xp,
          xpToNextLevel: 5000,
          totalXP: 45000,
          completedMilestones: ['first_workout', 'week_streak', 'level_10'],
          unlockedAbilities: ['power_surge', 'iron_will'],
          stats: null,
        },
      },
    });
  }),

  graphql.query('Archetypes', () => {
    return HttpResponse.json({
      data: {
        archetypes: [
          {
            id: 'warrior',
            name: 'Warrior',
            description: 'Masters of strength and power',
            philosophy: 'Through discipline comes strength',
            icon: 'sword',
            color: '#FF6B35',
            primaryStats: ['strength', 'endurance'],
            levels: [
              { level: 1, title: 'Initiate', xpRequired: 0, abilities: [] },
              { level: 5, title: 'Fighter', xpRequired: 5000, abilities: ['power_surge'] },
              { level: 10, title: 'Champion', xpRequired: 15000, abilities: ['iron_will'] },
            ],
          },
          {
            id: 'monk',
            name: 'Monk',
            description: 'Balance of mind and body',
            philosophy: 'Inner peace leads to outer strength',
            icon: 'meditation',
            color: '#7B68EE',
            primaryStats: ['flexibility', 'balance', 'mentalFocus'],
            levels: [
              { level: 1, title: 'Novice', xpRequired: 0, abilities: [] },
              { level: 5, title: 'Disciple', xpRequired: 5000, abilities: ['inner_calm'] },
              { level: 10, title: 'Master', xpRequired: 15000, abilities: ['perfect_form'] },
            ],
          },
          {
            id: 'athlete',
            name: 'Athlete',
            description: 'Peak physical performance',
            philosophy: 'Excellence through consistency',
            icon: 'trophy',
            color: '#00CED1',
            primaryStats: ['agility', 'endurance'],
            levels: [
              { level: 1, title: 'Rookie', xpRequired: 0, abilities: [] },
              { level: 5, title: 'Competitor', xpRequired: 5000, abilities: ['quick_recovery'] },
              { level: 10, title: 'Elite', xpRequired: 15000, abilities: ['peak_performance'] },
            ],
          },
        ],
      },
    });
  }),

  // ============================================
  // ISSUES & ROADMAP HANDLERS
  // ============================================
  graphql.query('Issues', ({ variables }) => {
    const { status, limit = 10 } = variables as { status?: string; limit?: number };

    const issues = [
      {
        id: 'issue-1',
        title: 'Add dark mode toggle',
        description: 'Would love to have a dark mode option',
        status: status || 'open',
        priority: 'medium',
        labels: [{ id: 'enhancement', name: 'enhancement', color: '#a2eeef', description: null }],
        authorId: 'user-002',
        author: sampleUsers[1],
        votes: 42,
        userVote: null,
        subscribed: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'issue-2',
        title: 'Exercise video tutorials',
        description: 'Short video clips showing proper form',
        status: status || 'in-progress',
        priority: 'high',
        labels: [{ id: 'enhancement', name: 'enhancement', color: '#a2eeef', description: null }],
        authorId: 'user-003',
        author: sampleUsers[2],
        votes: 128,
        userVote: 1,
        subscribed: true,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return HttpResponse.json({
      data: { issues: issues.slice(0, limit) },
    });
  }),

  graphql.query('Roadmap', () => {
    return HttpResponse.json({
      data: {
        roadmap: [
          {
            id: 'roadmap-1',
            title: 'Social Features',
            description: 'Follow friends, share workouts, challenge each other',
            status: 'in-progress',
            quarter: 'Q1 2025',
            votes: 234,
            userVoted: true,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'roadmap-2',
            title: 'Wearable Integration',
            description: 'Connect with Apple Watch, Fitbit, Garmin',
            status: 'planned',
            quarter: 'Q2 2025',
            votes: 189,
            userVoted: false,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    });
  }),

  graphql.mutation('CreateIssue', ({ variables }) => {
    const { input } = variables as { input: { title: string; description: string } };

    return HttpResponse.json({
      data: {
        createIssue: {
          id: 'issue-' + Date.now(),
          title: input.title,
          description: input.description,
          status: 'open',
          priority: 'medium',
          labels: [],
          authorId: currentUser.id,
          author: currentUser,
          votes: 0,
          userVote: null,
          subscribed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }),
];
