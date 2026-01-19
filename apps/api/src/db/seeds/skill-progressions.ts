/**
 * Skill Progressions Seed Data
 *
 * 30+ comprehensive skill progression paths for bodyweight and strength skills.
 * Each progression defines a clear path from beginner to mastery with specific
 * targets, prerequisites, tips, and common mistakes.
 *
 * Based on gymnastics strength training (GST), calisthenics progressions,
 * and proven methodologies from Overcoming Gravity, GMB, and FitnessFAQs.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SkillProgressionSeed {
  skill_name: string;
  level: number;
  level_name: string;
  description: string;
  exercise_id?: string;
  target_metric: 'reps' | 'duration_seconds' | 'distance_meters' | 'weight_percentage';
  target_value: number;
  prerequisites?: string[]; // Previous skill levels or other requirements
  estimated_weeks_min: number;
  estimated_weeks_max: number;
  tips: string[];
  common_mistakes: string[];
  video_url?: string;
}

// ============================================
// PULL-UP PROGRESSION (7 levels)
// Dead hang -> Scapular pulls -> Negatives -> Assisted -> Full -> Weighted -> One-arm
// ============================================

export const pullupProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'pullup',
    level: 0,
    level_name: 'Dead Hang',
    description: 'Build grip strength and shoulder stability with passive hanging from a bar.',
    exercise_id: 'bw-dead-hang',
    target_metric: 'duration_seconds',
    target_value: 60,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 4,
    tips: [
      'Start with overhand grip, shoulder width apart',
      'Relax shoulders initially, let them come up to ears',
      'Build up time gradually - start with 10-15 second holds',
      'Use chalk if grip is slipping',
      'Practice multiple short holds before attempting long holds',
    ],
    common_mistakes: [
      'Gripping too tight and fatiguing quickly',
      'Holding breath - breathe steadily',
      'Swinging or using momentum',
      'Giving up too early on grip endurance',
    ],
  },
  {
    skill_name: 'pullup',
    level: 1,
    level_name: 'Scapular Pull-Ups (Active Hang)',
    description: 'Learn scapular control by pulling shoulder blades down and together while hanging.',
    exercise_id: 'bw-scapular-pullup',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['pullup_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Start from dead hang, pull shoulder blades down and back',
      'Your body should rise 2-3 inches without bending elbows',
      'Hold the top position for 1-2 seconds',
      'Focus on feeling your lats engage',
      'This movement initiates every proper pull-up',
    ],
    common_mistakes: [
      'Bending elbows to assist the movement',
      'Not achieving full scapular depression',
      'Rushing through reps without control',
      'Shrugging shoulders instead of depressing them',
    ],
  },
  {
    skill_name: 'pullup',
    level: 2,
    level_name: 'Negative Pull-Ups',
    description: 'Build pulling strength through controlled lowering from the top position.',
    exercise_id: 'bw-negative-pullup',
    target_metric: 'duration_seconds',
    target_value: 10, // 10 second negative
    prerequisites: ['pullup_level_1'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 6,
    tips: [
      'Jump or use a box to get chin over bar',
      'Lower as slowly as possible - aim for 5-10 seconds',
      'Control the entire descent, especially the bottom portion',
      'Reset and repeat - quality over quantity',
      'Do 3-5 sets of 3-5 reps with maximum control',
    ],
    common_mistakes: [
      'Dropping too fast without control',
      'Not starting from proper top position (chin clearly over bar)',
      'Stopping the negative partway down',
      'Doing too many reps and losing quality',
    ],
  },
  {
    skill_name: 'pullup',
    level: 3,
    level_name: 'Assisted Pull-Ups',
    description: 'Perform full range pull-ups with band or machine assistance.',
    exercise_id: 'bw-assisted-pullup',
    target_metric: 'reps',
    target_value: 12,
    prerequisites: ['pullup_level_2'],
    estimated_weeks_min: 3,
    estimated_weeks_max: 8,
    tips: [
      'Use progressively lighter resistance bands',
      'Initiate with scapular pull, then bend elbows',
      'Pull until chin clears bar, chest approaches bar',
      'Lower with control - 2-3 second eccentric',
      'Reduce assistance as strength improves',
    ],
    common_mistakes: [
      'Relying too heavily on band assistance',
      'Kipping or using momentum',
      'Not going through full range of motion',
      'Staying at same assistance level too long',
    ],
  },
  {
    skill_name: 'pullup',
    level: 4,
    level_name: 'Full Pull-Up',
    description: 'Perform strict pull-ups from dead hang to chin over bar.',
    exercise_id: 'bw-pullup',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['pullup_level_3'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 12,
    tips: [
      'Start from complete dead hang, arms fully extended',
      'Initiate with scapular depression, then pull',
      'Lead with chest, not chin',
      'Pull until chin clearly clears bar',
      'Control the descent - no dropping',
    ],
    common_mistakes: [
      'Half reps - not going to full extension',
      'Using momentum or kipping',
      'Craning neck to get chin over bar',
      'Holding breath throughout the movement',
    ],
  },
  {
    skill_name: 'pullup',
    level: 5,
    level_name: 'Weighted Pull-Ups',
    description: 'Add external load to increase pulling strength beyond bodyweight.',
    exercise_id: 'weighted-pullup',
    target_metric: 'weight_percentage',
    target_value: 50, // 50% bodyweight added
    prerequisites: ['pullup_level_4'],
    estimated_weeks_min: 8,
    estimated_weeks_max: 24,
    tips: [
      'Use a dip belt, weighted vest, or dumbbell between feet',
      'Start with 5-10% bodyweight and progress gradually',
      'Maintain strict form - no kipping with added weight',
      'Lower the weight if form breaks down',
      'Aim to eventually add 50%+ of bodyweight',
    ],
    common_mistakes: [
      'Adding too much weight too quickly',
      'Sacrificing form for heavier weight',
      'Neglecting unweighted volume work',
      'Using swinging or momentum with weight',
    ],
  },
  {
    skill_name: 'pullup',
    level: 6,
    level_name: 'Archer Pull-Ups',
    description: 'Unilateral pulling progression with one arm assisting.',
    exercise_id: 'archer-pullup',
    target_metric: 'reps',
    target_value: 8,
    prerequisites: ['pullup_level_5'],
    estimated_weeks_min: 8,
    estimated_weeks_max: 16,
    tips: [
      'Wide grip, shift weight to working arm',
      'Assist arm stays straight throughout',
      'Pull until working arm\'s shoulder touches the bar',
      'Control the descent on working arm side',
      'Work both sides equally',
    ],
    common_mistakes: [
      'Bending the assist arm too much',
      'Not shifting weight enough to working side',
      'Training one side more than the other',
      'Using momentum instead of strength',
    ],
  },
];

// ============================================
// PUSH-UP PROGRESSION (8 levels)
// Wall -> Incline -> Knee -> Full -> Diamond -> Archer -> One-arm
// ============================================

export const pushupProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'pushup',
    level: 0,
    level_name: 'Wall Push-Ups',
    description: 'Build pushing foundation with vertical push-ups against a wall.',
    exercise_id: 'bw-wall-pushup',
    target_metric: 'reps',
    target_value: 30,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 2,
    tips: [
      'Stand arm\'s length from wall, hands at shoulder height',
      'Keep body straight from head to heels',
      'Lower chest to wall with control',
      'Push back explosively',
      'Progress by moving feet further from wall',
    ],
    common_mistakes: [
      'Sagging hips or piking',
      'Flaring elbows out to 90 degrees',
      'Not touching chest to wall',
      'Rushing through reps',
    ],
  },
  {
    skill_name: 'pushup',
    level: 1,
    level_name: 'Incline Push-Ups',
    description: 'Progress to a lower angle using a bench, stairs, or elevated surface.',
    exercise_id: 'bw-incline-pushup',
    target_metric: 'reps',
    target_value: 25,
    prerequisites: ['pushup_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Use progressively lower surfaces (counter -> chair -> step)',
      'Hands slightly wider than shoulder width',
      'Keep core tight, body in straight line',
      'Touch chest to surface on each rep',
      'Full lockout at the top',
    ],
    common_mistakes: [
      'Hips sagging toward surface',
      'Not going to full depth',
      'Elbows flared at 90 degrees (should be 45)',
      'Looking up instead of keeping neck neutral',
    ],
  },
  {
    skill_name: 'pushup',
    level: 2,
    level_name: 'Knee Push-Ups',
    description: 'Full floor push-ups from knees to build strength for standard push-ups.',
    exercise_id: 'bw-knee-pushup',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: ['pushup_level_1'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Knees on ground, ankles crossed and raised',
      'Maintain straight line from knees to head',
      'Lower until chest touches or nearly touches ground',
      'Focus on keeping core engaged throughout',
      'Don\'t rest at bottom or top',
    ],
    common_mistakes: [
      'Hips too high (piking)',
      'Hips sagging (banana back)',
      'Partial range of motion',
      'Moving too quickly without control',
    ],
  },
  {
    skill_name: 'pushup',
    level: 3,
    level_name: 'Full Push-Ups',
    description: 'Standard push-ups from toes with full range of motion.',
    exercise_id: 'bw-pushup',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: ['pushup_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Hands under shoulders, fingers spread',
      'Body straight from head to heels',
      'Lower until chest touches or nearly touches ground',
      'Lock out arms fully at top',
      'Elbows at 45-degree angle, not flared out',
    ],
    common_mistakes: [
      'Partial reps - not touching chest to ground',
      'Hips sagging or piking',
      'Elbows flaring to 90 degrees',
      'Looking up and straining neck',
      'Not locking out at top',
    ],
  },
  {
    skill_name: 'pushup',
    level: 4,
    level_name: 'Diamond Push-Ups',
    description: 'Close-grip push-ups targeting triceps with hands forming diamond shape.',
    exercise_id: 'bw-diamond-pushup',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['pushup_level_3'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Index fingers and thumbs touch forming diamond',
      'Hands positioned under chest, not face',
      'Keep elbows close to body during descent',
      'Chest touches hands at bottom',
      'Great for tricep development',
    ],
    common_mistakes: [
      'Hands positioned too high (under face)',
      'Elbows flaring out wide',
      'Not going to full depth',
      'Rushing and losing form',
    ],
  },
  {
    skill_name: 'pushup',
    level: 5,
    level_name: 'Pike Push-Ups',
    description: 'Inverted push-ups targeting shoulders as overhead pressing preparation.',
    exercise_id: 'bw-pike-pushup',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['pushup_level_4'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Form inverted V with hips high',
      'Head between arms, looking at toes',
      'Lower head toward ground between hands',
      'Hands slightly wider than shoulder width',
      'Progress to elevated pike push-ups',
    ],
    common_mistakes: [
      'Hips not high enough',
      'Bending knees too much',
      'Not going deep enough',
      'Looking forward instead of down',
    ],
  },
  {
    skill_name: 'pushup',
    level: 6,
    level_name: 'Archer Push-Ups',
    description: 'Wide push-ups shifting weight to one arm while the other assists.',
    exercise_id: 'bw-archer-pushup',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['pushup_level_5'],
    estimated_weeks_min: 6,
    estimated_weeks_max: 12,
    tips: [
      'Extra wide hand placement',
      'Shift weight to working arm as you lower',
      'Assist arm stays straight and slides out',
      'Touch chest to working hand',
      'Work both sides equally',
    ],
    common_mistakes: [
      'Bending assist arm too much',
      'Not shifting weight enough',
      'Partial range of motion',
      'Training one side more than other',
    ],
  },
  {
    skill_name: 'pushup',
    level: 7,
    level_name: 'One-Arm Push-Up',
    description: 'The ultimate push-up progression - full push-up with single arm.',
    exercise_id: 'bw-one-arm-pushup',
    target_metric: 'reps',
    target_value: 5,
    prerequisites: ['pushup_level_6'],
    estimated_weeks_min: 12,
    estimated_weeks_max: 24,
    tips: [
      'Wide stance for balance',
      'Working hand under center of chest',
      'Keep hips square to ground (no rotation)',
      'Lower until chest nearly touches ground',
      'Start with elevated one-arm push-ups',
    ],
    common_mistakes: [
      'Hips rotating to assist',
      'Stance too narrow causing imbalance',
      'Partial range of motion',
      'Rushing the progression',
    ],
  },
];

// ============================================
// DIP PROGRESSION (6 levels)
// Bench dips -> Assisted -> Full -> Weighted -> Ring dips -> Bulgarian
// ============================================

export const dipProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'dip',
    level: 0,
    level_name: 'Bench Dips',
    description: 'Build tricep and shoulder foundation with feet on floor dips from a bench.',
    exercise_id: 'bw-bench-dip',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: [],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Hands on bench behind you, fingers forward',
      'Feet on floor, knees bent for easier version',
      'Lower until upper arms parallel to ground',
      'Push up until arms fully locked',
      'Extend legs straight for harder version',
    ],
    common_mistakes: [
      'Partial range of motion',
      'Elbows flaring out wide',
      'Shoulders shrugging up',
      'Going too deep and stressing shoulders',
    ],
  },
  {
    skill_name: 'dip',
    level: 1,
    level_name: 'Negative Dips',
    description: 'Build strength through controlled lowering on parallel bars.',
    exercise_id: 'bw-negative-dip',
    target_metric: 'duration_seconds',
    target_value: 10, // 10 second negative
    prerequisites: ['dip_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Jump or step up to top position',
      'Arms locked, shoulders depressed',
      'Lower as slowly as possible (5-10 seconds)',
      'Go until upper arms parallel to ground or slightly below',
      'Step down and repeat',
    ],
    common_mistakes: [
      'Dropping too fast',
      'Shoulders shrugging up during descent',
      'Not going to full depth',
      'Stopping before parallel',
    ],
  },
  {
    skill_name: 'dip',
    level: 2,
    level_name: 'Assisted Dips',
    description: 'Full range dips with band or machine assistance.',
    exercise_id: 'bw-assisted-dip',
    target_metric: 'reps',
    target_value: 12,
    prerequisites: ['dip_level_1'],
    estimated_weeks_min: 3,
    estimated_weeks_max: 6,
    tips: [
      'Use progressively lighter resistance bands',
      'Band under knees or feet',
      'Lower until upper arms parallel or slightly below',
      'Push up to full lockout',
      'Keep shoulders down and back',
    ],
    common_mistakes: [
      'Relying too heavily on assistance',
      'Partial range of motion',
      'Shoulders creeping up toward ears',
      'Swinging or using momentum',
    ],
  },
  {
    skill_name: 'dip',
    level: 3,
    level_name: 'Full Parallel Bar Dips',
    description: 'Strict dips on parallel bars with full range of motion.',
    exercise_id: 'bw-dip',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['dip_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 10,
    tips: [
      'Grip bars firmly, start at top with arms locked',
      'Lean slightly forward for chest emphasis',
      'Lower until upper arms parallel to ground',
      'Push up to full lockout',
      'Keep core tight throughout',
    ],
    common_mistakes: [
      'Not going to full depth',
      'Excessive forward lean stressing shoulders',
      'Elbows flaring out',
      'Swinging legs for momentum',
    ],
  },
  {
    skill_name: 'dip',
    level: 4,
    level_name: 'Weighted Dips',
    description: 'Add external load to parallel bar dips for increased strength.',
    exercise_id: 'weighted-dip',
    target_metric: 'weight_percentage',
    target_value: 50, // 50% bodyweight added
    prerequisites: ['dip_level_3'],
    estimated_weeks_min: 8,
    estimated_weeks_max: 20,
    tips: [
      'Use dip belt, weighted vest, or dumbbell between feet',
      'Start with 10% bodyweight, progress gradually',
      'Maintain strict form - no swinging',
      'Full depth and full lockout on every rep',
      'Lower weight if form breaks down',
    ],
    common_mistakes: [
      'Adding weight too quickly',
      'Sacrificing depth for heavier weight',
      'Swinging or bouncing at bottom',
      'Neglecting unweighted volume',
    ],
  },
  {
    skill_name: 'dip',
    level: 5,
    level_name: 'Ring Dips',
    description: 'Dips on gymnastic rings requiring exceptional stability.',
    exercise_id: 'ring-dip',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['dip_level_4'],
    estimated_weeks_min: 6,
    estimated_weeks_max: 16,
    tips: [
      'Start with ring support hold mastery',
      'Turn rings out (RTO) at top for full lockout',
      'Keep rings close to body throughout',
      'Lower to where rings touch armpits',
      'Much harder than bar dips - regress as needed',
    ],
    common_mistakes: [
      'Rings swinging or moving independently',
      'Not achieving full ring turn-out at top',
      'Elbows flaring away from body',
      'Rushing progression from bar to rings',
    ],
  },
];

// ============================================
// ROW PROGRESSION (6 levels)
// Vertical pull -> Incline -> Horizontal -> Archer -> Front lever rows
// ============================================

export const rowProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'row',
    level: 0,
    level_name: 'Vertical Rows (Doorway Rows)',
    description: 'Near-vertical pulling to build foundation for horizontal rowing.',
    exercise_id: 'bw-vertical-row',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 2,
    tips: [
      'Hold onto doorframe, TRX, or towel over bar',
      'Lean back only slightly (nearly vertical)',
      'Pull chest to hands, squeeze shoulder blades',
      'Lower with control',
      'Progress by increasing lean angle',
    ],
    common_mistakes: [
      'Not pulling shoulder blades together',
      'Bending at hips instead of staying straight',
      'Using too much arm, not enough back',
      'Rushing through reps',
    ],
  },
  {
    skill_name: 'row',
    level: 1,
    level_name: 'Incline Rows (45-Degree)',
    description: 'Rows at an incline angle using rings, TRX, or bar.',
    exercise_id: 'bw-incline-row',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['row_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Body at 45-degree angle to ground',
      'Arms fully extended at bottom',
      'Pull until hands reach chest',
      'Keep body straight like a plank',
      'Progress by lowering angle further',
    ],
    common_mistakes: [
      'Hips sagging or piking',
      'Not going to full extension at bottom',
      'Partial pulls not reaching chest',
      'Craning neck forward',
    ],
  },
  {
    skill_name: 'row',
    level: 2,
    level_name: 'Horizontal Rows (Australian Pull-Ups)',
    description: 'Full horizontal body rows - inverted under a bar or rings.',
    exercise_id: 'bw-horizontal-row',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['row_level_1'],
    estimated_weeks_min: 3,
    estimated_weeks_max: 6,
    tips: [
      'Body completely horizontal under bar/rings',
      'Heels on ground, body straight as a board',
      'Pull chest to bar/rings',
      'Squeeze shoulder blades hard at top',
      'Can elevate feet to make harder',
    ],
    common_mistakes: [
      'Hips sagging toward ground',
      'Not pulling all the way to the bar',
      'Bending at hips during the pull',
      'Not fully extending arms at bottom',
    ],
  },
  {
    skill_name: 'row',
    level: 3,
    level_name: 'Feet Elevated Rows',
    description: 'Horizontal rows with feet elevated for increased difficulty.',
    exercise_id: 'bw-elevated-row',
    target_metric: 'reps',
    target_value: 12,
    prerequisites: ['row_level_2'],
    estimated_weeks_min: 3,
    estimated_weeks_max: 6,
    tips: [
      'Feet on box or bench, body still horizontal',
      'Significantly harder than floor version',
      'Maintain perfect body line',
      'Pull chest to bar',
      'Great progression toward front lever',
    ],
    common_mistakes: [
      'Allowing hips to sag',
      'Piking up instead of staying straight',
      'Reducing range of motion',
      'Rushing and losing control',
    ],
  },
  {
    skill_name: 'row',
    level: 4,
    level_name: 'Archer Rows',
    description: 'Wide-grip rows shifting weight to one arm.',
    exercise_id: 'bw-archer-row',
    target_metric: 'reps',
    target_value: 8,
    prerequisites: ['row_level_3'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Wide grip on bar or rings',
      'Shift weight to working arm during pull',
      'Assist arm stays straight',
      'Pull working side to bar',
      'Excellent progression to one-arm rows',
    ],
    common_mistakes: [
      'Bending assist arm too much',
      'Not shifting weight enough',
      'Twisting body instead of staying square',
      'Training one side more than other',
    ],
  },
  {
    skill_name: 'row',
    level: 5,
    level_name: 'Tuck Front Lever Rows',
    description: 'Row from tuck front lever position - advanced pulling exercise.',
    exercise_id: 'tuck-front-lever-row',
    target_metric: 'reps',
    target_value: 8,
    prerequisites: ['row_level_4', 'front_lever_level_1'],
    estimated_weeks_min: 8,
    estimated_weeks_max: 16,
    tips: [
      'Hold tuck front lever position',
      'Row by pulling bar toward hips',
      'Maintain horizontal body position throughout',
      'Return to full arm extension',
      'Builds toward full front lever rows',
    ],
    common_mistakes: [
      'Losing horizontal position during row',
      'Pulling bar to chest instead of hips',
      'Hips dropping during the movement',
      'Not achieving full extension at bottom',
    ],
  },
];

// ============================================
// SQUAT PROGRESSION (6 levels)
// Assisted -> Full -> Deep -> Shrimp -> Pistol -> Weighted Pistol
// ============================================

export const squatProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'pistol_squat',
    level: 0,
    level_name: 'Assisted Squats',
    description: 'Build squat depth and mobility with support from a pole or TRX.',
    exercise_id: 'bw-assisted-squat',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 4,
    tips: [
      'Hold onto pole, doorframe, or TRX straps',
      'Use as little assistance as possible',
      'Squat as deep as mobility allows',
      'Keep heels on ground',
      'Work on ankle and hip mobility',
    ],
    common_mistakes: [
      'Relying too heavily on arm assistance',
      'Heels coming off ground',
      'Knees caving inward',
      'Not working on mobility between sessions',
    ],
  },
  {
    skill_name: 'pistol_squat',
    level: 1,
    level_name: 'Deep Bodyweight Squats',
    description: 'Full depth squats with thighs past parallel.',
    exercise_id: 'bw-squat',
    target_metric: 'reps',
    target_value: 25,
    prerequisites: ['pistol_squat_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 6,
    tips: [
      'Feet shoulder width, toes slightly out',
      'Squat until hips below knees (ass to grass)',
      'Keep heels on ground entire time',
      'Knees track over toes',
      'Stand fully at top, squeeze glutes',
    ],
    common_mistakes: [
      'Not going to full depth',
      'Knees caving inward',
      'Heels coming off ground',
      'Forward lean with rounded back',
    ],
  },
  {
    skill_name: 'pistol_squat',
    level: 2,
    level_name: 'Box Pistol Squats',
    description: 'Single-leg squats to a box or bench for controlled depth.',
    exercise_id: 'bw-box-pistol',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['pistol_squat_level_1'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Stand on one leg, other leg extended forward',
      'Squat until butt touches box (no sitting!)',
      'Drive up immediately upon touching',
      'Start with high box, lower progressively',
      'Arms forward for counterbalance',
    ],
    common_mistakes: [
      'Sitting and resting on box',
      'Using too high of a box for too long',
      'Extended leg dropping to floor',
      'Knee of working leg caving in',
    ],
  },
  {
    skill_name: 'pistol_squat',
    level: 3,
    level_name: 'Shrimp Squats',
    description: 'Single-leg squats with rear leg held behind - different balance challenge.',
    exercise_id: 'bw-shrimp-squat',
    target_metric: 'reps',
    target_value: 8,
    prerequisites: ['pistol_squat_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 10,
    tips: [
      'Hold rear foot behind you (hand or just bent)',
      'Squat until rear knee touches ground',
      'Keep torso more upright than pistol',
      'Drive through heel to stand',
      'Great complement to pistol training',
    ],
    common_mistakes: [
      'Letting rear knee slam into ground',
      'Excessive forward lean',
      'Not going to full depth',
      'Working leg heel coming up',
    ],
  },
  {
    skill_name: 'pistol_squat',
    level: 4,
    level_name: 'Full Pistol Squat',
    description: 'Complete single-leg squat with extended leg, full range of motion.',
    exercise_id: 'bw-pistol-squat',
    target_metric: 'reps',
    target_value: 5,
    prerequisites: ['pistol_squat_level_3'],
    estimated_weeks_min: 6,
    estimated_weeks_max: 16,
    tips: [
      'Stand on one leg, arms and other leg extended forward',
      'Squat until hamstring covers calf (rock bottom)',
      'Extended leg stays parallel to ground',
      'Drive up through heel, no momentum',
      'Requires flexibility, strength, and balance',
    ],
    common_mistakes: [
      'Extended leg dropping to floor',
      'Not going to full depth',
      'Using momentum to stand up',
      'Losing balance sideways',
    ],
  },
  {
    skill_name: 'pistol_squat',
    level: 5,
    level_name: 'Weighted Pistol Squat',
    description: 'Add external load to pistol squats for advanced leg strength.',
    exercise_id: 'weighted-pistol-squat',
    target_metric: 'weight_percentage',
    target_value: 25, // 25% bodyweight added
    prerequisites: ['pistol_squat_level_4'],
    estimated_weeks_min: 8,
    estimated_weeks_max: 24,
    tips: [
      'Hold kettlebell or dumbbell at chest (goblet style)',
      'Weight acts as counterbalance initially',
      'Start light and progress slowly',
      'Maintain full depth and control',
      'Weight can be held overhead for extra challenge',
    ],
    common_mistakes: [
      'Adding too much weight too quickly',
      'Losing form with added weight',
      'Reducing range of motion',
      'Not alternating legs equally',
    ],
  },
];

// ============================================
// DRAGON FLAG PROGRESSION (5 levels)
// Tuck -> Single leg -> Straddle -> Full -> Negative only to full
// ============================================

export const dragonFlagProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'dragon_flag',
    level: 0,
    level_name: 'Prerequisites - Lying Leg Raises',
    description: 'Build core strength foundation with strict lying leg raises.',
    exercise_id: 'bw-lying-leg-raise',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: [],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Lie flat, hands gripping something above head',
      'Keep lower back pressed into ground',
      'Raise straight legs until vertical',
      'Lower with control, don\'t let back arch',
      'Progress to hanging leg raises',
    ],
    common_mistakes: [
      'Lower back arching off ground',
      'Using hip flexor momentum',
      'Bending knees during movement',
      'Not controlling the lowering phase',
    ],
  },
  {
    skill_name: 'dragon_flag',
    level: 1,
    level_name: 'Tuck Dragon Flag',
    description: 'Dragon flag with knees tucked to reduce lever length.',
    exercise_id: 'bw-tuck-dragon-flag',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['dragon_flag_level_0'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Lie on bench, grip edges above head',
      'Roll up so only shoulders contact bench',
      'Keep knees tucked to chest',
      'Lower body as one rigid unit',
      'Only shoulders should touch bench throughout',
    ],
    common_mistakes: [
      'Allowing hips to bend (piking)',
      'Upper back touching bench during movement',
      'Not maintaining body tension',
      'Using momentum instead of control',
    ],
  },
  {
    skill_name: 'dragon_flag',
    level: 2,
    level_name: 'Single Leg Dragon Flag',
    description: 'Dragon flag with one leg extended, one tucked.',
    exercise_id: 'bw-single-leg-dragon-flag',
    target_metric: 'reps',
    target_value: 8,
    prerequisites: ['dragon_flag_level_1'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'One leg extended straight, one tucked',
      'Alternate legs between sets',
      'Maintain rigid body line',
      'Extended leg stays in line with torso',
      'Focus on no hip pike',
    ],
    common_mistakes: [
      'Extended leg dropping below body line',
      'Piking at hips',
      'Training one leg more than other',
      'Losing body tension',
    ],
  },
  {
    skill_name: 'dragon_flag',
    level: 3,
    level_name: 'Straddle Dragon Flag',
    description: 'Dragon flag with legs straddled wide to reduce lever.',
    exercise_id: 'bw-straddle-dragon-flag',
    target_metric: 'reps',
    target_value: 6,
    prerequisites: ['dragon_flag_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 10,
    tips: [
      'Both legs extended but spread wide',
      'Wider straddle = easier',
      'Gradually bring legs closer together',
      'Maintain straight body from shoulders to feet',
      'Point toes for better body line',
    ],
    common_mistakes: [
      'Straddle too narrow too soon',
      'Bending knees',
      'Hips piking during lowering',
      'Losing tension at bottom of rep',
    ],
  },
  {
    skill_name: 'dragon_flag',
    level: 4,
    level_name: 'Full Dragon Flag',
    description: 'Complete dragon flag with legs together, full range of motion.',
    exercise_id: 'bw-dragon-flag',
    target_metric: 'reps',
    target_value: 5,
    prerequisites: ['dragon_flag_level_3'],
    estimated_weeks_min: 8,
    estimated_weeks_max: 16,
    tips: [
      'Legs together and straight throughout',
      'Body moves as one rigid plank',
      'Lower until nearly horizontal',
      'Only shoulders contact bench at all times',
      'Made famous by Bruce Lee',
    ],
    common_mistakes: [
      'Piking at hips on the way down',
      'Upper back touching bench',
      'Bending knees to assist',
      'Not lowering to full depth',
    ],
  },
];

// ============================================
// HOLLOW BODY PROGRESSION (4 levels)
// Foundation -> Tuck -> Straddle -> Full hollow
// ============================================

export const hollowBodyProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'hollow_body',
    level: 0,
    level_name: 'Dead Bug',
    description: 'Build anti-extension core strength with dead bug variations.',
    exercise_id: 'bw-dead-bug',
    target_metric: 'duration_seconds',
    target_value: 60,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 3,
    tips: [
      'Lie on back, arms up, knees at 90 degrees',
      'Press lower back firmly into ground',
      'Slowly extend opposite arm and leg',
      'Return and repeat other side',
      'Lower back should never arch',
    ],
    common_mistakes: [
      'Lower back arching off ground',
      'Moving too quickly',
      'Not keeping core engaged',
      'Holding breath',
    ],
  },
  {
    skill_name: 'hollow_body',
    level: 1,
    level_name: 'Tuck Hollow Hold',
    description: 'Hollow body position with knees tucked to chest.',
    exercise_id: 'bw-tuck-hollow',
    target_metric: 'duration_seconds',
    target_value: 45,
    prerequisites: ['hollow_body_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Lie on back, lower back pressed into floor',
      'Knees tucked to chest, shins parallel to ground',
      'Shoulder blades off ground, chin tucked',
      'Arms along sides or reaching forward',
      'No gap between lower back and floor',
    ],
    common_mistakes: [
      'Lower back arching creating gap',
      'Shoulders not lifted off ground',
      'Head resting on ground',
      'Not maintaining position throughout',
    ],
  },
  {
    skill_name: 'hollow_body',
    level: 2,
    level_name: 'Single Leg Extended Hollow',
    description: 'Hollow hold with one leg extended, one tucked.',
    exercise_id: 'bw-single-leg-hollow',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['hollow_body_level_1'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'One leg extended, hovering above ground',
      'Other leg tucked or bent',
      'Alternate legs between holds',
      'Lower back MUST stay flat',
      'Raise extended leg higher if back arches',
    ],
    common_mistakes: [
      'Extended leg too low causing back arch',
      'Training one side more',
      'Losing hollow position',
      'Extended leg resting on ground',
    ],
  },
  {
    skill_name: 'hollow_body',
    level: 3,
    level_name: 'Full Hollow Body Hold',
    description: 'Complete hollow body position with arms overhead and legs extended.',
    exercise_id: 'bw-hollow-body',
    target_metric: 'duration_seconds',
    target_value: 60,
    prerequisites: ['hollow_body_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Arms extended overhead, biceps by ears',
      'Legs straight and together, hovering above ground',
      'Lower back completely flat on ground',
      'Shoulder blades off ground, chin tucked',
      'Body forms banana shape',
    ],
    common_mistakes: [
      'Lower back arching (lower legs go too low)',
      'Arms not overhead or by ears',
      'Legs separating or bending',
      'Shoulders not lifted',
    ],
  },
  {
    skill_name: 'hollow_body',
    level: 4,
    level_name: 'Hollow Body Rocks',
    description: 'Rock back and forth in hollow position maintaining perfect form.',
    exercise_id: 'bw-hollow-rocks',
    target_metric: 'reps',
    target_value: 30,
    prerequisites: ['hollow_body_level_3'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Maintain perfect hollow position throughout',
      'Rock from shoulders to tailbone and back',
      'No bending or shape change during rocks',
      'Small controlled rocks, not big swings',
      'Essential gymnastics conditioning',
    ],
    common_mistakes: [
      'Breaking hollow position during rocks',
      'Using momentum instead of control',
      'Rocking too aggressively',
      'Legs or arms moving independently',
    ],
  },
];

// ============================================
// BRIDGE PROGRESSION (5 levels)
// Short -> Full -> Wall walks -> Stand-to-bridge -> One-arm
// ============================================

export const bridgeProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'bridge',
    level: 0,
    level_name: 'Short Bridge (Hip Bridge)',
    description: 'Basic glute bridge to build foundational hip extension.',
    exercise_id: 'bw-hip-bridge',
    target_metric: 'reps',
    target_value: 30,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 2,
    tips: [
      'Lie on back, feet flat, knees bent',
      'Press through heels, lift hips high',
      'Squeeze glutes hard at top',
      'Lower with control',
      'Progress to single-leg bridges',
    ],
    common_mistakes: [
      'Not squeezing glutes at top',
      'Pushing through toes instead of heels',
      'Overarching lower back',
      'Rushing through reps',
    ],
  },
  {
    skill_name: 'bridge',
    level: 1,
    level_name: 'Full Bridge (Wheel Pose)',
    description: 'Complete backbend with hands and feet on ground, hips high.',
    exercise_id: 'bw-full-bridge',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['bridge_level_0'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 12,
    tips: [
      'Lie on back, hands by shoulders, fingers toward feet',
      'Press up through hands and feet',
      'Push hips high toward ceiling',
      'Straighten arms as much as flexibility allows',
      'Work on shoulder and thoracic mobility',
    ],
    common_mistakes: [
      'Insufficient shoulder mobility',
      'Not pressing through hands',
      'Knees caving inward',
      'Weight on neck instead of hands',
    ],
  },
  {
    skill_name: 'bridge',
    level: 2,
    level_name: 'Wall Walk Bridges',
    description: 'Walk hands down wall into bridge, then back up.',
    exercise_id: 'bw-wall-walk-bridge',
    target_metric: 'reps',
    target_value: 5,
    prerequisites: ['bridge_level_1'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 10,
    tips: [
      'Stand with back to wall, arm\'s length away',
      'Lean back, place hands on wall',
      'Walk hands down wall into bridge',
      'Walk back up the wall to standing',
      'Move slowly and with control',
    ],
    common_mistakes: [
      'Moving too fast and losing control',
      'Standing too close to wall',
      'Not engaging core throughout',
      'Skipping steps on the wall',
    ],
  },
  {
    skill_name: 'bridge',
    level: 3,
    level_name: 'Stand-to-Bridge',
    description: 'Lower from standing into bridge without wall assistance.',
    exercise_id: 'bw-stand-to-bridge',
    target_metric: 'reps',
    target_value: 3,
    prerequisites: ['bridge_level_2'],
    estimated_weeks_min: 6,
    estimated_weeks_max: 16,
    tips: [
      'Stand with feet hip-width, arms overhead',
      'Push hips forward as you lean back',
      'Reach hands back toward floor',
      'Place hands, then adjust into bridge',
      'Have spotter or soft surface initially',
    ],
    common_mistakes: [
      'Dropping instead of controlling descent',
      'Not pushing hips forward enough',
      'Arms not staying overhead',
      'Insufficient flexibility attempting too soon',
    ],
  },
  {
    skill_name: 'bridge',
    level: 4,
    level_name: 'Bridge Push-Ups',
    description: 'Push up from floor to bridge and lower back down.',
    exercise_id: 'bw-bridge-pushup',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['bridge_level_3'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 12,
    tips: [
      'Start lying on back in bridge setup position',
      'Press up explosively into full bridge',
      'Lower head back to ground with control',
      'Press up again immediately',
      'Great for dynamic bridge strength',
    ],
    common_mistakes: [
      'Head hitting ground hard',
      'Not achieving full bridge extension',
      'Losing form due to fatigue',
      'Insufficient warmup before dynamic work',
    ],
  },
];

// ============================================
// ADDITIONAL PROGRESSIONS
// ============================================

// HANGING LEG RAISE PROGRESSION (4 levels)
export const hangingLegRaiseProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'hanging_leg_raise',
    level: 0,
    level_name: 'Hanging Knee Raises',
    description: 'Build hip flexor and core strength with bent-knee raises.',
    exercise_id: 'bw-hanging-knee-raise',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['pullup_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Dead hang from bar, shoulders engaged',
      'Raise knees toward chest',
      'Control the lowering, no swinging',
      'Keep core tight throughout',
      'Don\'t use momentum',
    ],
    common_mistakes: [
      'Using swing momentum',
      'Not raising knees high enough',
      'Dropping legs on descent',
      'Shoulders disengaged',
    ],
  },
  {
    skill_name: 'hanging_leg_raise',
    level: 1,
    level_name: 'Tuck L-Hang',
    description: 'Hold tucked position with thighs parallel to ground.',
    exercise_id: 'bw-tuck-l-hang',
    target_metric: 'duration_seconds',
    target_value: 20,
    prerequisites: ['hanging_leg_raise_level_0'],
    estimated_weeks_min: 3,
    estimated_weeks_max: 6,
    tips: [
      'Hang with knees raised to tuck position',
      'Thighs should be parallel to ground',
      'Keep shoulders engaged (not relaxed)',
      'Build hold time progressively',
      'Progress to L-hang',
    ],
    common_mistakes: [
      'Thighs below parallel',
      'Excessive swinging',
      'Shoulders relaxed and elevated',
      'Holding breath',
    ],
  },
  {
    skill_name: 'hanging_leg_raise',
    level: 2,
    level_name: 'Straight Leg Raises',
    description: 'Full leg raises with straight legs to parallel.',
    exercise_id: 'bw-hanging-leg-raise',
    target_metric: 'reps',
    target_value: 12,
    prerequisites: ['hanging_leg_raise_level_1'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Hang with straight arms',
      'Raise straight legs to parallel',
      'Control descent, no swinging',
      'Slight posterior pelvic tilt at top',
      'Keep legs together',
    ],
    common_mistakes: [
      'Bending knees during movement',
      'Swinging to generate momentum',
      'Not reaching parallel',
      'Dropping legs quickly',
    ],
  },
  {
    skill_name: 'hanging_leg_raise',
    level: 3,
    level_name: 'Toes to Bar',
    description: 'Raise straight legs until toes touch the bar.',
    exercise_id: 'bw-toes-to-bar',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['hanging_leg_raise_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 10,
    tips: [
      'Active shoulders throughout',
      'Raise straight legs all the way to bar',
      'Touch toes to bar between hands',
      'Control the negative',
      'Requires significant hamstring flexibility',
    ],
    common_mistakes: [
      'Using excessive kip',
      'Bending knees to reach bar',
      'Uncontrolled swinging',
      'Not actually touching bar',
    ],
  },
];

// PLANCHE LEAN PROGRESSION (Supplemental to main planche)
export const plancheLeanProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'planche_lean',
    level: 0,
    level_name: 'Pseudo Planche Push-Up',
    description: 'Push-ups with forward lean to build planche-specific strength.',
    exercise_id: 'bw-pseudo-planche-pushup',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['pushup_level_3'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Push-up position with hands by hips (not shoulders)',
      'Lean forward so shoulders past wrists',
      'Keep arms straight during the lean',
      'Push-up through this leaned position',
      'Protract shoulder blades hard',
    ],
    common_mistakes: [
      'Hands placed too high (by shoulders)',
      'Not leaning forward enough',
      'Elbows bending during lean phase',
      'Losing hollow body position',
    ],
  },
  {
    skill_name: 'planche_lean',
    level: 1,
    level_name: 'Planche Lean Hold',
    description: 'Isometric hold in maximum lean position.',
    exercise_id: 'planche_lean',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['planche_lean_level_0'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'From push-up position, lean forward',
      'Shoulders well past wrists',
      'Arms stay locked straight',
      'Hollow body throughout',
      'Work toward 45+ degree lean',
    ],
    common_mistakes: [
      'Arms bending under load',
      'Not maintaining hollow body',
      'Insufficient forward lean',
      'Shoulders behind wrists',
    ],
  },
  {
    skill_name: 'planche_lean',
    level: 2,
    level_name: 'Frog Stand / Crow Pose',
    description: 'Balance with knees on elbows in forward lean.',
    exercise_id: 'bw-frog-stand',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['planche_lean_level_1'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 6,
    tips: [
      'Place hands on floor, lean forward',
      'Place knees on backs of elbows',
      'Lift feet off floor, balance',
      'Look forward, not down',
      'Builds balance and wrist strength for tuck planche',
    ],
    common_mistakes: [
      'Hands too close together',
      'Not leaning forward enough to balance',
      'Looking straight down',
      'Collapsing arms',
    ],
  },
];

// RING SUPPORT PROGRESSION (3 levels)
export const ringSupportProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'ring_support',
    level: 0,
    level_name: 'Ring Support Hold',
    description: 'Basic support position on rings with arms locked.',
    exercise_id: 'ring-support-hold',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['dip_level_3'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 6,
    tips: [
      'Jump or press into support position',
      'Arms locked, shoulders depressed',
      'Rings at sides, not flared out',
      'Keep body tight and still',
      'Foundation for all ring work',
    ],
    common_mistakes: [
      'Arms bending under load',
      'Shoulders shrugging up',
      'Rings swinging or unstable',
      'Body loose and swaying',
    ],
  },
  {
    skill_name: 'ring_support',
    level: 1,
    level_name: 'Rings Turned Out Support',
    description: 'Support hold with rings rotated externally (RTO).',
    exercise_id: 'ring-rto-support',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['ring_support_level_0'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'From support, turn thumbs out until palms face forward',
      'Rings should be at 45+ degrees',
      'Arms stay locked, shoulders depressed',
      'Significant increase in difficulty',
      'Required for proper ring dip lockout',
    ],
    common_mistakes: [
      'Not turning rings out enough',
      'Arms bending during turn out',
      'Losing shoulder depression',
      'Rushing and losing stability',
    ],
  },
  {
    skill_name: 'ring_support',
    level: 2,
    level_name: 'RTO Support to L-Sit',
    description: 'Transition from RTO support to L-sit position on rings.',
    exercise_id: 'ring-rto-lsit',
    target_metric: 'duration_seconds',
    target_value: 10,
    prerequisites: ['ring_support_level_1', 'l_sit_level_3'],
    estimated_weeks_min: 6,
    estimated_weeks_max: 12,
    tips: [
      'Start in RTO support',
      'Lift legs to L-sit while maintaining RTO',
      'Requires tremendous pressing and core strength',
      'Keep rings turned out throughout',
      'Advanced ring skill',
    ],
    common_mistakes: [
      'Losing ring turn out when lifting legs',
      'Arms bending under increased load',
      'Not achieving full L-sit position',
      'Rings becoming unstable',
    ],
  },
];

// STRAIGHT ARM STRENGTH (4 levels)
export const straightArmStrengthProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'straight_arm_strength',
    level: 0,
    level_name: 'Support Hold (Floor)',
    description: 'Build basic straight arm pressing strength on floor or parallettes.',
    exercise_id: 'floor-support-hold',
    target_metric: 'duration_seconds',
    target_value: 45,
    prerequisites: [],
    estimated_weeks_min: 1,
    estimated_weeks_max: 3,
    tips: [
      'Hands on floor or parallettes',
      'Push into ground, depress shoulders',
      'Arms locked straight',
      'Body tight, slight posterior tilt',
      'Foundation for all pressing skills',
    ],
    common_mistakes: [
      'Shoulders shrugging up',
      'Arms bending',
      'Body loose and relaxed',
      'Hands too far apart or close',
    ],
  },
  {
    skill_name: 'straight_arm_strength',
    level: 1,
    level_name: 'Plank to Downward Dog Flow',
    description: 'Dynamic straight arm movement pattern.',
    exercise_id: 'bw-plank-to-dog',
    target_metric: 'reps',
    target_value: 15,
    prerequisites: ['straight_arm_strength_level_0'],
    estimated_weeks_min: 2,
    estimated_weeks_max: 4,
    tips: [
      'Start in plank (straight arm)',
      'Pike hips up to downward dog',
      'Arms stay locked throughout',
      'Press chest toward thighs in dog',
      'Return to plank with control',
    ],
    common_mistakes: [
      'Bending arms during transition',
      'Rushing through movement',
      'Not achieving full downward dog',
      'Losing core engagement',
    ],
  },
  {
    skill_name: 'straight_arm_strength',
    level: 2,
    level_name: 'Straight Arm Scapular Push-Ups',
    description: 'Protraction/retraction with locked arms.',
    exercise_id: 'bw-scapular-pushup',
    target_metric: 'reps',
    target_value: 20,
    prerequisites: ['straight_arm_strength_level_1'],
    estimated_weeks_min: 3,
    estimated_weeks_max: 6,
    tips: [
      'Plank position with arms locked',
      'Let chest sink between shoulder blades (retraction)',
      'Push chest away, round upper back (protraction)',
      'Arms stay locked entire time',
      'Essential for planche and handstand',
    ],
    common_mistakes: [
      'Bending arms',
      'Not achieving full protraction',
      'Hips piking or sagging',
      'Movement too small',
    ],
  },
  {
    skill_name: 'straight_arm_strength',
    level: 3,
    level_name: 'Skin the Cat',
    description: 'Full rotation through hanging positions with straight arms.',
    exercise_id: 'skin_the_cat',
    target_metric: 'reps',
    target_value: 5,
    prerequisites: ['straight_arm_strength_level_2'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 10,
    tips: [
      'Dead hang, raise legs through arms',
      'Roll backward until inverted',
      'Continue to German hang (arms behind)',
      'Return the same way',
      'Go slowly and build shoulder flexibility',
    ],
    common_mistakes: [
      'Going too fast',
      'Insufficient shoulder flexibility',
      'Not controlling the descent to German hang',
      'Rushing before body is ready',
    ],
  },
];

// CORE COMPRESSION PROGRESSION (3 levels) - For pike/straddle flexibility
export const compressionProgression: SkillProgressionSeed[] = [
  {
    skill_name: 'compression',
    level: 0,
    level_name: 'Seated Pike Hold',
    description: 'Seated position with chest on thighs, building compression.',
    exercise_id: 'seated-pike-hold',
    target_metric: 'duration_seconds',
    target_value: 60,
    prerequisites: [],
    estimated_weeks_min: 4,
    estimated_weeks_max: 12,
    tips: [
      'Sit with legs straight in front',
      'Fold forward, chest toward thighs',
      'Reach past toes if flexible enough',
      'Keep knees locked',
      'Breathe and relax into stretch',
    ],
    common_mistakes: [
      'Bending knees to reach further',
      'Rounding lower back excessively',
      'Holding breath',
      'Bouncing instead of holding',
    ],
  },
  {
    skill_name: 'compression',
    level: 1,
    level_name: 'Pike Compression Lifts',
    description: 'Active compression - lift legs while in pike position.',
    exercise_id: 'pike-compression-lift',
    target_metric: 'reps',
    target_value: 10,
    prerequisites: ['compression_level_0'],
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
    tips: [
      'Sit in pike, hands beside hips on floor',
      'Lift straight legs off ground using hip flexors',
      'Hold briefly at top',
      'Lower with control',
      'Essential for L-sit to V-sit progression',
    ],
    common_mistakes: [
      'Bending knees during lift',
      'Leaning back too far',
      'Using momentum instead of hip flexors',
      'Not achieving any lift',
    ],
  },
  {
    skill_name: 'compression',
    level: 2,
    level_name: 'Standing Pike Compression',
    description: 'Stand and compress - touch forehead to knees.',
    exercise_id: 'standing-pike-compression',
    target_metric: 'duration_seconds',
    target_value: 30,
    prerequisites: ['compression_level_1'],
    estimated_weeks_min: 6,
    estimated_weeks_max: 16,
    tips: [
      'Stand with feet together',
      'Fold forward, wrap hands behind calves',
      'Pull chest to thighs actively',
      'Work toward forehead to shins',
      'Required for press to handstand',
    ],
    common_mistakes: [
      'Bending knees',
      'Not actively pulling deeper',
      'Rounded upper back only',
      'Insufficient hamstring flexibility',
    ],
  },
];

// ============================================
// MAIN SEEDING FUNCTION
// ============================================

export async function seedSkillProgressions(): Promise<void> {
  log.info('Seeding skill progressions...');

  const allProgressions: SkillProgressionSeed[] = [
    ...pullupProgression,
    ...pushupProgression,
    ...dipProgression,
    ...rowProgression,
    ...squatProgression,
    ...dragonFlagProgression,
    ...hollowBodyProgression,
    ...bridgeProgression,
    ...hangingLegRaiseProgression,
    ...plancheLeanProgression,
    ...ringSupportProgression,
    ...straightArmStrengthProgression,
    ...compressionProgression,
  ];

  let inserted = 0;
  let updated = 0;

  for (const prog of allProgressions) {
    const id = `${prog.skill_name}_level_${prog.level}`;
    const description = prog.description || '';

    // Build prerequisites array including previous level
    const prereqs = prog.prerequisites || [];
    if (prog.level > 0) {
      const prevLevel = `${prog.skill_name}_level_${prog.level - 1}`;
      if (!prereqs.includes(prevLevel)) {
        prereqs.unshift(prevLevel);
      }
    }

    const result = await db.query(
      `INSERT INTO skill_progressions (
        id, skill_name, level, level_name, exercise_id,
        target_metric, target_value, prerequisites,
        estimated_weeks, tips, common_mistakes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (skill_name, level) DO UPDATE SET
        level_name = EXCLUDED.level_name,
        exercise_id = EXCLUDED.exercise_id,
        target_metric = EXCLUDED.target_metric,
        target_value = EXCLUDED.target_value,
        prerequisites = EXCLUDED.prerequisites,
        estimated_weeks = EXCLUDED.estimated_weeks,
        tips = EXCLUDED.tips,
        common_mistakes = EXCLUDED.common_mistakes
      RETURNING (xmax = 0) as inserted`,
      [
        id,
        prog.skill_name,
        prog.level,
        prog.level_name,
        prog.exercise_id || null,
        prog.target_metric,
        prog.target_value,
        JSON.stringify(prereqs),
        prog.estimated_weeks_max, // Using max for estimated_weeks column
        prog.tips,
        prog.common_mistakes,
      ]
    );

    if (result.rows[0]?.inserted) {
      inserted++;
    } else {
      updated++;
    }
  }

  log.info(`Skill progressions seeded: ${inserted} inserted, ${updated} updated`);
  log.info(`Total progressions: ${allProgressions.length}`);
}

// Export individual progressions for testing
export const allSkillProgressions = {
  pullup: pullupProgression,
  pushup: pushupProgression,
  dip: dipProgression,
  row: rowProgression,
  pistolSquat: squatProgression,
  dragonFlag: dragonFlagProgression,
  hollowBody: hollowBodyProgression,
  bridge: bridgeProgression,
  hangingLegRaise: hangingLegRaiseProgression,
  plancheLean: plancheLeanProgression,
  ringSupport: ringSupportProgression,
  straightArmStrength: straightArmStrengthProgression,
  compression: compressionProgression,
};

// Summary of all progressions
export const progressionSummary = {
  totalSkills: 13,
  totalLevels: 66,
  skills: [
    { name: 'Pull-Up', levels: 7, description: 'Dead hang to archer pull-ups' },
    { name: 'Push-Up', levels: 8, description: 'Wall to one-arm push-ups' },
    { name: 'Dip', levels: 6, description: 'Bench dips to ring dips' },
    { name: 'Row', levels: 6, description: 'Vertical rows to front lever rows' },
    { name: 'Pistol Squat', levels: 6, description: 'Assisted to weighted pistols' },
    { name: 'Dragon Flag', levels: 5, description: 'Leg raises to full dragon flag' },
    { name: 'Hollow Body', levels: 5, description: 'Dead bug to hollow rocks' },
    { name: 'Bridge', levels: 5, description: 'Hip bridge to bridge push-ups' },
    { name: 'Hanging Leg Raise', levels: 4, description: 'Knee raises to toes-to-bar' },
    { name: 'Planche Lean', levels: 3, description: 'Pseudo planche to frog stand' },
    { name: 'Ring Support', levels: 3, description: 'Support hold to RTO L-sit' },
    { name: 'Straight Arm Strength', levels: 4, description: 'Support to skin the cat' },
    { name: 'Compression', levels: 3, description: 'Pike hold to standing compression' },
  ],
};

// Default export for easy importing
export default seedSkillProgressions;
