/**
 * Physical Profile Personalization Service
 *
 * Uses collected user data to personalize workout recommendations:
 * - Physical profile (height, weight, body measurements)
 * - Goals (weight loss, muscle gain, strength, etc.)
 * - Limitations (injuries, disabilities, restrictions)
 * - Archetype (bodybuilder, powerlifter, military, etc.)
 * - Wearables data (heart rate, sleep, activity)
 * - PT test results
 */

import { db } from '../db/client';
import { loggers } from '../lib/logger';

const log = loggers.http.child({ module: 'personalization' });

// Types
export interface UserPhysicalProfile {
  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  age?: number;
  gender?: string;
  archetype?: string;
}

export interface UserGoal {
  id: string;
  goal_type: string;
  target_value?: number;
  current_value?: number;
  priority: number;
  status: string;
}

export interface UserLimitation {
  id: string;
  body_region_id: string;
  limitation_type: string;
  severity: string;
  status: string;
  avoid_movements?: string[];
  avoid_impact: boolean;
  avoid_weight_bearing: boolean;
  max_weight_lbs?: number;
}

export interface PersonalizationContext {
  userId: string;
  profile: UserPhysicalProfile;
  goals: UserGoal[];
  limitations: UserLimitation[];
  recentActivity: {
    avgHeartRate?: number;
    avgSleepHours?: number;
    weeklyWorkouts: number;
    currentStreak: number;
  };
  ptTestPerformance?: {
    testId: string;
    overallScore: number;
    weakAreas: string[];
    strongAreas: string[];
  };
}

export interface WorkoutRecommendation {
  type: 'exercise' | 'program' | 'modification' | 'warning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  exerciseId?: string;
  substituteFor?: string;
  parameters?: {
    suggestedSets?: number;
    suggestedReps?: string;
    suggestedWeight?: number;
    suggestedDuration?: number;
    restPeriod?: number;
  };
}

export interface PersonalizedPlan {
  userId: string;
  generatedAt: Date;
  recommendations: WorkoutRecommendation[];
  weeklySchedule: {
    day: string;
    focus: string;
    exercises: string[];
    duration: number;
  }[];
  adjustments: {
    type: string;
    reason: string;
    appliedTo: string[];
  }[];
}

// Helper functions
function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function getTrainingAge(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)); // months
}

function estimateOneRepMax(weight: number, reps: number): number {
  // Brzycki formula
  return weight * (36 / (37 - reps));
}

/**
 * Get personalization context for a user
 */
export async function getPersonalizationContext(userId: string): Promise<PersonalizationContext> {
  log.info({ userId }, 'Building personalization context');

  // Get user profile
  const user = await db.queryOne<any>(
    `SELECT id, height_cm, weight_kg, body_fat_percent,
            date_part('year', age(birth_date)) as age, gender, archetype,
            created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  // Get active goals
  const goals = await db.queryAll<UserGoal>(
    `SELECT id, goal_type, target_value, current_value, priority, status
     FROM user_goals WHERE user_id = $1 AND status IN ('active', 'in_progress')
     ORDER BY priority ASC`,
    [userId]
  ).catch(() => [] as UserGoal[]);

  // Get active limitations
  const limitations = await db.queryAll<UserLimitation>(
    `SELECT id, body_region_id, limitation_type, severity, status,
            avoid_movements, avoid_impact, avoid_weight_bearing, max_weight_lbs
     FROM user_limitations WHERE user_id = $1 AND status IN ('active', 'recovering')`,
    [userId]
  ).catch(() => [] as UserLimitation[]);

  // Get recent activity metrics
  const activityStats = await db.queryOne<any>(
    `SELECT
       (SELECT AVG(avg_bpm) FROM health_heart_rate WHERE user_id = $1 AND recorded_at > NOW() - INTERVAL '7 days') as avg_heart_rate,
       (SELECT AVG(total_sleep_minutes) / 60.0 FROM health_sleep WHERE user_id = $1 AND date > NOW() - INTERVAL '7 days') as avg_sleep_hours,
       (SELECT COUNT(*) FROM workout_logs WHERE user_id = $1 AND started_at > NOW() - INTERVAL '7 days') as weekly_workouts,
       (SELECT current_streak FROM user_streaks WHERE user_id = $1) as current_streak`,
    [userId]
  ).catch(() => ({
    avg_heart_rate: null,
    avg_sleep_hours: null,
    weekly_workouts: 0,
    current_streak: 0
  }));

  // Get PT test performance if user has an institutional archetype
  let ptTestPerformance;
  if (user?.archetype) {
    const ptResults = await db.queryOne<any>(
      `SELECT upr.*, pt.name as test_name
       FROM user_pt_results upr
       JOIN pt_tests pt ON pt.id = upr.pt_test_id
       JOIN archetypes a ON a.pt_test_id = pt.id
       WHERE upr.user_id = $1 AND a.id = $2
       ORDER BY upr.test_date DESC LIMIT 1`,
      [userId, user.archetype]
    ).catch(() => null);

    if (ptResults) {
      ptTestPerformance = {
        testId: ptResults.pt_test_id,
        overallScore: ptResults.total_score || 0,
        weakAreas: ptResults.event_scores ?
          Object.entries(ptResults.event_scores)
            .filter(([_, score]: [string, any]) => score.percentage < 60)
            .map(([event]) => event) : [],
        strongAreas: ptResults.event_scores ?
          Object.entries(ptResults.event_scores)
            .filter(([_, score]: [string, any]) => score.percentage >= 80)
            .map(([event]) => event) : []
      };
    }
  }

  return {
    userId,
    profile: {
      height_cm: user?.height_cm,
      weight_kg: user?.weight_kg,
      body_fat_percent: user?.body_fat_percent,
      age: user?.age,
      gender: user?.gender,
      archetype: user?.archetype
    },
    goals: goals || [],
    limitations: limitations || [],
    recentActivity: {
      avgHeartRate: activityStats?.avg_heart_rate,
      avgSleepHours: activityStats?.avg_sleep_hours,
      weeklyWorkouts: activityStats?.weekly_workouts || 0,
      currentStreak: activityStats?.current_streak || 0
    },
    ptTestPerformance
  };
}

/**
 * Generate personalized workout recommendations
 */
export async function generateRecommendations(
  context: PersonalizationContext
): Promise<WorkoutRecommendation[]> {
  log.info({ userId: context.userId }, 'Generating personalized recommendations');

  const recommendations: WorkoutRecommendation[] = [];

  // 1. Goal-based recommendations
  for (const goal of context.goals) {
    const goalRecs = await getGoalBasedRecommendations(goal, context);
    recommendations.push(...goalRecs);
  }

  // 2. Limitation-based modifications
  for (const limitation of context.limitations) {
    const limitRecs = await getLimitationBasedRecommendations(limitation, context);
    recommendations.push(...limitRecs);
  }

  // 3. Recovery recommendations based on activity
  const recoveryRecs = getRecoveryRecommendations(context.recentActivity);
  recommendations.push(...recoveryRecs);

  // 4. PT test improvement recommendations
  if (context.ptTestPerformance) {
    const ptRecs = await getPTTestRecommendations(context.ptTestPerformance);
    recommendations.push(...ptRecs);
  }

  // 5. Volume and intensity recommendations based on profile
  const volumeRecs = getVolumeRecommendations(context.profile, context.recentActivity);
  recommendations.push(...volumeRecs);

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

async function getGoalBasedRecommendations(
  goal: UserGoal,
  context: PersonalizationContext
): Promise<WorkoutRecommendation[]> {
  const recommendations: WorkoutRecommendation[] = [];

  switch (goal.goal_type) {
    case 'weight_loss':
      recommendations.push({
        type: 'program',
        priority: 'high',
        title: 'Increase Cardio Volume',
        description: 'Add 2-3 cardio sessions per week, 30-45 minutes each',
        reasoning: `Based on your weight loss goal. Current: ${goal.current_value || 'N/A'}kg, Target: ${goal.target_value}kg`
      });
      recommendations.push({
        type: 'program',
        priority: 'medium',
        title: 'Circuit Training',
        description: 'Incorporate circuit-style strength training to maximize calorie burn',
        reasoning: 'Circuit training combines strength building with elevated heart rate'
      });
      break;

    case 'muscle_gain':
      recommendations.push({
        type: 'program',
        priority: 'high',
        title: 'Progressive Overload Focus',
        description: 'Increase weight or reps each week on compound movements',
        reasoning: `Building muscle requires consistent progressive overload. Target: ${goal.target_value}kg`
      });
      recommendations.push({
        type: 'program',
        priority: 'medium',
        title: 'Protein Timing',
        description: 'Consume protein within 2 hours post-workout',
        reasoning: 'Optimal muscle protein synthesis window'
      });
      break;

    case 'strength':
      recommendations.push({
        type: 'program',
        priority: 'high',
        title: 'Heavy Compound Lifts',
        description: 'Focus on squat, deadlift, bench press, and overhead press',
        reasoning: 'Compound movements build foundational strength most efficiently'
      });
      recommendations.push({
        type: 'exercise',
        priority: 'medium',
        title: 'Add Accessory Work',
        description: 'Include targeted accessories to address weak points',
        reasoning: 'Accessory exercises prevent strength plateaus'
      });
      break;

    case 'endurance':
      recommendations.push({
        type: 'program',
        priority: 'high',
        title: 'Zone 2 Cardio Base',
        description: 'Build aerobic base with 3-4 low-intensity sessions per week',
        reasoning: 'Zone 2 training builds mitochondrial density and aerobic capacity'
      });
      recommendations.push({
        type: 'program',
        priority: 'medium',
        title: 'Interval Training',
        description: 'Add 1-2 high-intensity interval sessions weekly',
        reasoning: 'HIIT improves VO2max and lactate threshold'
      });
      break;

    case 'flexibility':
      recommendations.push({
        type: 'program',
        priority: 'high',
        title: 'Daily Mobility Work',
        description: '15-20 minutes of dynamic stretching and mobility drills',
        reasoning: 'Consistency is key for flexibility gains'
      });
      break;
  }

  return recommendations;
}

async function getLimitationBasedRecommendations(
  limitation: UserLimitation,
  context: PersonalizationContext
): Promise<WorkoutRecommendation[]> {
  const recommendations: WorkoutRecommendation[] = [];

  // Get exercise substitutions for this limitation
  const substitutions = await db.queryAll<any>(
    `SELECT es.*, e1.name as original_name, e2.name as substitute_name
     FROM exercise_substitutions es
     LEFT JOIN exercises e1 ON e1.id = es.original_exercise_id
     LEFT JOIN exercises e2 ON e2.id = es.substitute_exercise_id
     WHERE es.body_region_id = $1
       OR es.limitation_type = $2`,
    [limitation.body_region_id, limitation.limitation_type]
  ).catch(() => []);

  for (const sub of substitutions) {
    recommendations.push({
      type: 'modification',
      priority: limitation.severity === 'severe' ? 'high' : 'medium',
      title: `Substitute ${sub.original_name || 'exercise'}`,
      description: `Use ${sub.substitute_name || 'alternative'} instead`,
      reasoning: sub.reason || `Recommended for ${limitation.limitation_type}`,
      exerciseId: sub.substitute_exercise_id,
      substituteFor: sub.original_exercise_id
    });
  }

  // General limitation warnings
  if (limitation.avoid_impact) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: 'Avoid High-Impact Exercises',
      description: 'Skip jumping, running, and plyometric movements',
      reasoning: `Due to ${limitation.limitation_type} affecting ${limitation.body_region_id}`
    });
  }

  if (limitation.avoid_weight_bearing) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: 'Limit Weight-Bearing',
      description: 'Use seated or supported variations when possible',
      reasoning: `Due to ${limitation.limitation_type} affecting ${limitation.body_region_id}`
    });
  }

  if (limitation.max_weight_lbs) {
    recommendations.push({
      type: 'modification',
      priority: 'high',
      title: 'Weight Restriction',
      description: `Limit weights to ${limitation.max_weight_lbs} lbs or less`,
      reasoning: `Medical restriction for ${limitation.body_region_id}`,
      parameters: {
        suggestedWeight: limitation.max_weight_lbs
      }
    });
  }

  return recommendations;
}

function getRecoveryRecommendations(activity: PersonalizationContext['recentActivity']): WorkoutRecommendation[] {
  const recommendations: WorkoutRecommendation[] = [];

  // Check sleep quality
  if (activity.avgSleepHours && activity.avgSleepHours < 7) {
    recommendations.push({
      type: 'warning',
      priority: 'medium',
      title: 'Prioritize Sleep',
      description: `You're averaging ${activity.avgSleepHours.toFixed(1)} hours. Aim for 7-9 hours.`,
      reasoning: 'Sleep is crucial for muscle recovery and performance'
    });
  }

  // Check training frequency
  if (activity.weeklyWorkouts > 6) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: 'Schedule Rest Days',
      description: 'You trained every day this week. Include at least 1 full rest day.',
      reasoning: 'Overtraining increases injury risk and reduces gains'
    });
  } else if (activity.weeklyWorkouts < 2) {
    recommendations.push({
      type: 'program',
      priority: 'medium',
      title: 'Increase Training Frequency',
      description: 'Aim for at least 3 workouts per week for optimal progress',
      reasoning: 'Consistent training stimulus is needed for adaptation'
    });
  }

  // Encourage streak maintenance
  if (activity.currentStreak >= 7) {
    recommendations.push({
      type: 'program',
      priority: 'low',
      title: 'Great Consistency!',
      description: `${activity.currentStreak} day streak. Consider a deload week soon.`,
      reasoning: 'Long streaks should include planned recovery periods'
    });
  }

  return recommendations;
}

async function getPTTestRecommendations(
  ptPerformance: NonNullable<PersonalizationContext['ptTestPerformance']>
): Promise<WorkoutRecommendation[]> {
  const recommendations: WorkoutRecommendation[] = [];

  // Address weak areas
  for (const weakArea of ptPerformance.weakAreas) {
    recommendations.push({
      type: 'exercise',
      priority: 'high',
      title: `Improve ${weakArea}`,
      description: `Your ${weakArea} score is below 60%. Focus on specific training.`,
      reasoning: 'Addressing weak areas will improve overall PT test score'
    });
  }

  // Maintain strong areas
  for (const strongArea of ptPerformance.strongAreas) {
    recommendations.push({
      type: 'program',
      priority: 'low',
      title: `Maintain ${strongArea}`,
      description: `${strongArea} is a strength (80%+). Maintain with 1-2 sessions/week.`,
      reasoning: 'Maintenance work prevents regression in strong areas'
    });
  }

  return recommendations;
}

function getVolumeRecommendations(
  profile: UserPhysicalProfile,
  activity: PersonalizationContext['recentActivity']
): WorkoutRecommendation[] {
  const recommendations: WorkoutRecommendation[] = [];

  // Age-based recommendations
  if (profile.age) {
    if (profile.age > 50) {
      recommendations.push({
        type: 'modification',
        priority: 'medium',
        title: 'Extended Warm-up',
        description: 'Include 10-15 minutes of mobility and warm-up',
        reasoning: 'Injury prevention becomes more important with age'
      });
    }

    if (profile.age > 40) {
      recommendations.push({
        type: 'modification',
        priority: 'low',
        title: 'Recovery Focus',
        description: 'Allow 48-72 hours between training same muscle groups',
        reasoning: 'Recovery time increases with age'
      });
    }
  }

  // BMI-based recommendations
  if (profile.weight_kg && profile.height_cm) {
    const bmi = calculateBMI(profile.weight_kg, profile.height_cm);

    if (bmi > 30) {
      recommendations.push({
        type: 'modification',
        priority: 'medium',
        title: 'Low-Impact Options',
        description: 'Consider swimming, cycling, or elliptical for cardio',
        reasoning: 'Reduces joint stress while building fitness'
      });
    }
  }

  return recommendations;
}

/**
 * Generate a complete personalized weekly plan
 */
export async function generatePersonalizedPlan(userId: string): Promise<PersonalizedPlan> {
  log.info({ userId }, 'Generating personalized training plan');

  const context = await getPersonalizationContext(userId);
  const recommendations = await generateRecommendations(context);

  // Determine training split based on goals and availability
  const weeklyWorkouts = Math.max(3, Math.min(6, context.recentActivity.weeklyWorkouts || 4));

  // Default weekly schedule based on archetype/goals
  const weeklySchedule = generateWeeklySchedule(context, weeklyWorkouts);

  // Compile adjustments that were made
  const adjustments = recommendations
    .filter(r => r.type === 'modification' || r.type === 'warning')
    .map(r => ({
      type: r.type,
      reason: r.reasoning,
      appliedTo: r.substituteFor ? [r.substituteFor] : []
    }));

  return {
    userId,
    generatedAt: new Date(),
    recommendations,
    weeklySchedule,
    adjustments
  };
}

function generateWeeklySchedule(
  context: PersonalizationContext,
  daysPerWeek: number
): PersonalizedPlan['weeklySchedule'] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const schedule: PersonalizedPlan['weeklySchedule'] = [];

  // Check primary goal
  const primaryGoal = context.goals[0]?.goal_type;

  if (daysPerWeek >= 5) {
    // Push/Pull/Legs split
    schedule.push(
      { day: 'Monday', focus: 'Push', exercises: ['Bench Press', 'Overhead Press', 'Dips'], duration: 60 },
      { day: 'Tuesday', focus: 'Pull', exercises: ['Deadlift', 'Rows', 'Pull-ups'], duration: 60 },
      { day: 'Wednesday', focus: 'Legs', exercises: ['Squats', 'Lunges', 'Leg Curls'], duration: 60 },
      { day: 'Thursday', focus: 'Rest', exercises: [], duration: 0 },
      { day: 'Friday', focus: 'Upper', exercises: ['Incline Press', 'Lat Pulldown', 'Shoulder Work'], duration: 60 },
      { day: 'Saturday', focus: 'Lower', exercises: ['Front Squat', 'RDL', 'Calf Raises'], duration: 60 },
      { day: 'Sunday', focus: 'Rest', exercises: [], duration: 0 }
    );
  } else if (daysPerWeek >= 3) {
    // Full body 3x per week
    schedule.push(
      { day: 'Monday', focus: 'Full Body A', exercises: ['Squats', 'Bench Press', 'Rows'], duration: 60 },
      { day: 'Tuesday', focus: 'Rest', exercises: [], duration: 0 },
      { day: 'Wednesday', focus: 'Full Body B', exercises: ['Deadlift', 'Overhead Press', 'Pull-ups'], duration: 60 },
      { day: 'Thursday', focus: 'Rest', exercises: [], duration: 0 },
      { day: 'Friday', focus: 'Full Body C', exercises: ['Front Squat', 'Incline Press', 'Lat Pulldown'], duration: 60 },
      { day: 'Saturday', focus: 'Rest', exercises: [], duration: 0 },
      { day: 'Sunday', focus: 'Rest', exercises: [], duration: 0 }
    );
  }

  // Add cardio for weight loss goal
  if (primaryGoal === 'weight_loss' || primaryGoal === 'endurance') {
    schedule.forEach(day => {
      if (day.focus === 'Rest') {
        day.focus = 'Active Recovery';
        day.exercises = ['Light Cardio', 'Mobility'];
        day.duration = 30;
      } else if (day.exercises.length > 0) {
        day.exercises.push('20min Cardio');
        day.duration += 20;
      }
    });
  }

  return schedule;
}

/**
 * Get exercise-specific recommendations for a workout session
 */
export async function getExerciseRecommendations(
  userId: string,
  exerciseIds: string[]
): Promise<Map<string, WorkoutRecommendation[]>> {
  const context = await getPersonalizationContext(userId);
  const result = new Map<string, WorkoutRecommendation[]>();

  for (const exerciseId of exerciseIds) {
    const recs: WorkoutRecommendation[] = [];

    // Check if exercise should be substituted due to limitations
    for (const limitation of context.limitations) {
      const flags = await db.queryAll<any>(
        `SELECT * FROM limitation_exercise_flags
         WHERE exercise_id = $1
           AND (body_region_id = $2 OR limitation_type = $3)
           AND severity_threshold <= $4`,
        [exerciseId, limitation.body_region_id, limitation.limitation_type, limitation.severity]
      ).catch(() => [] as any[]);

      for (const flag of flags) {
        recs.push({
          type: flag.flag_type === 'avoid' ? 'warning' : 'modification',
          priority: flag.flag_type === 'avoid' ? 'high' : 'medium',
          title: flag.warning_message || `${flag.flag_type} recommended`,
          description: flag.modification_instructions || '',
          reasoning: `Due to ${limitation.limitation_type}`,
          exerciseId
        });
      }
    }

    result.set(exerciseId, recs);
  }

  return result;
}
