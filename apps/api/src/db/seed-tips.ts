/**
 * Seed Tips and Milestones
 *
 * High-quality tips across categories for contextual display during workouts.
 */

import { db } from './client';
import { loggers } from '../lib/logger';

const log = loggers.db;

interface TipSeed {
  id: string;
  title?: string;
  content: string;
  source?: string;
  category: string;
  subcategory?: string;
  trigger_type: string;
  trigger_value?: string;
  display_context?: string;
}

interface MilestoneSeed {
  id: string;
  name: string;
  description?: string;
  metric: string;
  threshold: number;
  reward_type?: string;
  reward_value?: string;
}

const TIPS_SEED: TipSeed[] = [
  // === EXERCISE-SPECIFIC (trigger during that exercise) ===
  {
    id: 'tip_pushup_001',
    content: "Your chest muscles (pectoralis major) are most activated when your hands are slightly wider than shoulder-width. Too wide reduces range of motion; too narrow shifts work to triceps.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'pushup',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_pushup_002',
    content: "The push-up has been used for fitness training since ancient times. Hindu warriors practiced them as part of 'dand' exercises over 2,000 years ago.",
    category: 'history',
    trigger_type: 'exercise',
    trigger_value: 'pushup',
    display_context: 'between_sets',
  },
  {
    id: 'tip_pushup_003',
    content: "Engaging your core during push-ups protects your lower back and increases total muscle activation. Think of your body as a rigid plank from head to heels.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'pushup',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_squat_001',
    content: "Your body releases more growth hormone and testosterone during squats than almost any other exercise—they're full-body muscle builders, not just leg exercises.",
    category: 'physiology',
    trigger_type: 'exercise',
    trigger_value: 'squat',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_squat_002',
    content: "Squatting deep (below parallel) isn't bad for your knees—it's actually protective. Studies show full-depth squatters have more stable knee joints than partial squatters.",
    category: 'science',
    source: 'Hartmann et al., 2013',
    trigger_type: 'exercise',
    trigger_value: 'squat',
    display_context: 'between_sets',
  },
  {
    id: 'tip_squat_003',
    content: "Drive through your heels during squats, not your toes. This engages your glutes and hamstrings more effectively while reducing knee stress.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'squat',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_pullup_001',
    content: "Pull-ups activate over 12 different muscles simultaneously. Your lats do the heavy lifting, but your biceps, rear delts, rhomboids, and even your abs are working hard.",
    category: 'physiology',
    trigger_type: 'exercise',
    trigger_value: 'pullup',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_pullup_002',
    content: "Initiate pull-ups by depressing your shoulder blades (pulling them down and back) before bending your arms. This activates your lats fully from the start.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'pullup',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_plank_001',
    content: "The world record plank is over 9 hours. But for building core strength, 3 sets of 30-60 seconds with good form beats endless duration every time.",
    category: 'science',
    trigger_type: 'exercise',
    trigger_value: 'plank',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_plank_002',
    content: "Squeeze your glutes during planks. This posterior pelvic tilt removes stress from your lower back and increases core activation by up to 20%.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'plank',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_deadlift_001',
    content: "The deadlift works more muscles than any other single exercise—over 25 muscle groups including your entire posterior chain, grip, and core.",
    category: 'physiology',
    trigger_type: 'exercise',
    trigger_value: 'deadlift',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_deadlift_002',
    content: "Think of deadlifts as pushing the floor away rather than pulling the bar up. This mental cue helps maintain a neutral spine and proper leg drive.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'deadlift',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_bench_001',
    content: "Arch your upper back slightly during bench press to protect your shoulders and activate more chest muscle fibers. Keep your feet flat and drive through your legs.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'bench_press',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_bench_002',
    content: "The bench press was popularized in the 1950s. Before that, the floor press was the standard chest exercise—you'd lie on the floor with no bench at all.",
    category: 'history',
    trigger_type: 'exercise',
    trigger_value: 'bench_press',
    display_context: 'between_sets',
  },
  {
    id: 'tip_row_001',
    content: "During rows, think about pulling with your elbows, not your hands. This helps activate your back muscles rather than relying on arm strength.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'row',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_lunge_001',
    content: "Lunges are excellent for building single-leg strength and fixing muscle imbalances. Most people have a stronger leg—lunges help even things out.",
    category: 'physiology',
    trigger_type: 'exercise',
    trigger_value: 'lunge',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_dip_001',
    content: "Dips are one of the best exercises for building tricep mass. Lean forward slightly to shift emphasis to your chest, or stay upright to target triceps more.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'dip',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_curl_001',
    content: "Keep your elbows pinned to your sides during bicep curls. Letting them drift forward turns it into a front delt exercise and reduces bicep activation.",
    category: 'technique',
    trigger_type: 'exercise',
    trigger_value: 'curl',
    display_context: 'during_exercise',
  },

  // === MUSCLE-SPECIFIC (trigger when targeting that muscle) ===
  {
    id: 'tip_muscle_chest_001',
    content: "Your pectoralis major has two heads (clavicular and sternal) that respond to different angles. Incline work emphasizes the upper chest; decline hits the lower.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'chest',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_chest_002',
    content: "The 'mind-muscle connection' is real. Studies show that focusing on the muscle you're training increases activation by 20-30%.",
    category: 'science',
    source: 'Calatayud et al., 2016',
    trigger_type: 'muscle',
    trigger_value: 'chest',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_lats_001',
    content: "The latissimus dorsi is the widest muscle in your body. When fully developed, it creates the V-taper that makes your waist look narrower.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'lats',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_glutes_001',
    content: "Your gluteus maximus is the largest muscle in your body and a primary driver of hip extension. Strong glutes improve running speed, jumping height, and protect your lower back.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'glutes',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_core_001',
    content: "Your 'core' isn't just abs—it's a cylinder of muscles including your diaphragm (top), pelvic floor (bottom), abs (front), and spinal erectors (back). Train them as a unit.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'core',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_biceps_001',
    content: "Your biceps have two heads—the long head (outer) and short head (inner). Narrow grip curls target the long head; wide grip hits the short head more.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'biceps',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_triceps_001',
    content: "Your triceps make up about two-thirds of your upper arm mass. If you want bigger arms, prioritize triceps training over biceps.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'triceps',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_shoulders_001',
    content: "Your deltoids have three distinct heads—anterior (front), lateral (side), and posterior (rear). Most people overtrain the front and undertrain the rear.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'shoulders',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_quads_001',
    content: "Your quadriceps are the strongest muscles in your body. The rectus femoris crosses both the hip and knee joints, making it unique among the four quad muscles.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'quads',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_hamstrings_001',
    content: "Tight hamstrings often cause lower back pain. Regular stretching and strengthening through the full range of motion keeps them healthy and functional.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'hamstrings',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_muscle_calves_001',
    content: "Your calves are used constantly for walking, which makes them highly fatigue-resistant. They respond well to higher rep ranges (15-25 reps) and training frequency.",
    category: 'physiology',
    trigger_type: 'muscle',
    trigger_value: 'calves',
    display_context: 'during_exercise',
  },

  // === GOAL-SPECIFIC ===
  {
    id: 'tip_goal_strength_001',
    content: "Strength gains come from neural adaptations first, muscle growth second. In the first 6-8 weeks of training, most strength gains are your nervous system learning to recruit more muscle fibers.",
    category: 'science',
    trigger_type: 'goal',
    trigger_value: 'strength',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_strength_002',
    content: "For pure strength, lower rep ranges (1-5 reps) with heavier weights are most effective. The neuromuscular adaptations from heavy lifting don't happen with lighter weights.",
    category: 'science',
    trigger_type: 'goal',
    trigger_value: 'strength',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_hypertrophy_001',
    content: "Muscle growth requires mechanical tension, metabolic stress, and muscle damage. High reps with short rest create metabolic stress; heavy weights create tension. Both work.",
    category: 'science',
    trigger_type: 'goal',
    trigger_value: 'hypertrophy',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_hypertrophy_002',
    content: "For maximum muscle growth, research suggests 10-20 sets per muscle group per week. More than that shows diminishing returns for most natural lifters.",
    category: 'science',
    source: 'Schoenfeld et al., 2017',
    trigger_type: 'goal',
    trigger_value: 'hypertrophy',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_fatloss_001',
    content: "Muscle is metabolically expensive—each pound burns about 6 calories per day at rest. Building muscle increases your base metabolic rate, making fat loss easier long-term.",
    category: 'science',
    trigger_type: 'goal',
    trigger_value: 'fat_loss',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_fatloss_002',
    content: "EPOC (Excess Post-exercise Oxygen Consumption) means you keep burning extra calories after your workout. Intense resistance training creates more EPOC than steady-state cardio.",
    category: 'science',
    trigger_type: 'goal',
    trigger_value: 'fat_loss',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_endurance_001',
    content: "Your body has about 2,000 calories of glycogen stored in muscles and liver. Marathon runners 'hit the wall' when this runs out and the body switches to fat oxidation, which is slower.",
    category: 'physiology',
    trigger_type: 'goal',
    trigger_value: 'endurance',
    display_context: 'post_workout',
  },
  {
    id: 'tip_goal_endurance_002',
    content: "The 'runner's high' is real—exercise releases endocannabinoids (similar to cannabis) that reduce pain and create euphoria. It kicks in after about 20 minutes of sustained effort.",
    category: 'science',
    trigger_type: 'goal',
    trigger_value: 'endurance',
    display_context: 'post_workout',
  },

  // === MILESTONE REWARDS ===
  {
    id: 'tip_milestone_first_workout',
    title: 'First Step Taken!',
    content: "You just completed your first workout! Research shows it takes about 66 days to form a habit. You're 1.5% of the way there—keep showing up.",
    category: 'motivation',
    trigger_type: 'milestone',
    trigger_value: 'first_workout',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_workouts_10',
    title: 'Double Digits!',
    content: "10 workouts down! By now, your muscles have already begun adapting—satellite cells are fusing to your muscle fibers, and your neuromuscular connections are stronger.",
    category: 'physiology',
    trigger_type: 'milestone',
    trigger_value: 'workouts_10',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_workouts_50',
    title: 'Halfway to Century!',
    content: "50 workouts completed! You've built a solid foundation. Your body now recovers faster and adapts more quickly to new training stimuli.",
    category: 'physiology',
    trigger_type: 'milestone',
    trigger_value: 'workouts_50',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_workouts_100',
    title: 'Century Club!',
    content: "100 workouts! You're officially in the top 10% of people who start exercising. Most quit before reaching this point. You're building a lifestyle, not just a habit.",
    category: 'motivation',
    trigger_type: 'milestone',
    trigger_value: 'workouts_100',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_streak_7',
    title: 'Week Warrior!',
    content: "A full week of consistency! Discipline beats motivation. Motivation gets you started; habits keep you going when motivation fades.",
    category: 'motivation',
    trigger_type: 'milestone',
    trigger_value: 'streak_7',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_streak_30',
    title: 'Monthly Master!',
    content: "30 days straight! Your body has completed a full adaptation cycle. The neural pathways for exercise are now deeply ingrained—this is who you are now.",
    category: 'motivation',
    trigger_type: 'milestone',
    trigger_value: 'streak_30',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_exercises_100',
    title: '100 Exercises!',
    content: "You've completed 100 exercises! The principle of progressive overload says to keep growing, you must keep challenging yourself. Add a rep, add weight, or slow down the tempo.",
    category: 'science',
    trigger_type: 'milestone',
    trigger_value: 'exercises_100',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_reps_1000',
    title: '1,000 Reps!',
    content: "1,000 reps completed! Every rep created microscopic tears in your muscle fibers. During rest, your body repairs them stronger than before—that's how muscle grows.",
    category: 'physiology',
    trigger_type: 'milestone',
    trigger_value: 'reps_1000',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_reps_10000',
    title: '10K Reps!',
    content: "10,000 reps! You've moved past beginner gains into intermediate territory. Your muscles, tendons, and connective tissue are all significantly stronger than when you started.",
    category: 'physiology',
    trigger_type: 'milestone',
    trigger_value: 'reps_10000',
    display_context: 'post_workout',
  },
  {
    id: 'tip_milestone_hours_10',
    title: '10 Hours Strong!',
    content: "You've invested 10 hours in your fitness. That's 10 hours of compound returns—every minute you spend training pays dividends in health, energy, and longevity.",
    category: 'motivation',
    trigger_type: 'milestone',
    trigger_value: 'hours_10',
    display_context: 'post_workout',
  },

  // === RECOVERY & REST ===
  {
    id: 'tip_recovery_001',
    content: "Muscles don't grow during workouts—they grow during rest. Sleep is when your body releases the most growth hormone. Aim for 7-9 hours for optimal recovery.",
    category: 'recovery',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_recovery_002',
    content: "Delayed onset muscle soreness (DOMS) peaks 24-72 hours after training. It's caused by eccentric contractions (the lowering phase) more than concentric (the lifting phase).",
    category: 'physiology',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_recovery_003',
    content: "Active recovery (light movement) beats total rest for reducing soreness. A walk, easy swim, or mobility work increases blood flow without adding training stress.",
    category: 'recovery',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_recovery_004',
    content: "Cold showers after workouts may reduce inflammation but could also blunt muscle growth. For strength and size, skip the cold; for recovery between competitions, use it.",
    category: 'recovery',
    source: 'Roberts et al., 2015',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_recovery_005',
    content: "Stress hormones like cortisol can impair recovery. Managing life stress through sleep, nutrition, and relaxation is as important as your training program.",
    category: 'recovery',
    trigger_type: 'random',
    display_context: 'post_workout',
  },

  // === NUTRITION CONNECTION ===
  {
    id: 'tip_nutrition_001',
    content: "The 'anabolic window' is largely a myth. Total daily protein matters more than timing. Aim for 0.7-1g per pound of body weight spread across meals.",
    category: 'nutrition',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_nutrition_002',
    content: "Creatine is the most studied supplement in sports science. It increases strength, power, and muscle gain with virtually no side effects. 3-5g daily is the standard dose.",
    category: 'nutrition',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_nutrition_003',
    content: "Caffeine improves workout performance by blocking adenosine receptors. 3-6mg per kg of body weight 30-60 minutes before training is the optimal dose.",
    category: 'nutrition',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_nutrition_004',
    content: "Eating protein before bed isn't harmful—it's actually beneficial. Casein protein digests slowly and provides amino acids throughout the night for muscle repair.",
    category: 'nutrition',
    trigger_type: 'random',
    display_context: 'post_workout',
  },

  // === GENERAL MOTIVATION ===
  {
    id: 'tip_motivation_001',
    content: "The best workout program is the one you'll actually do. Consistency beats optimization. Don't let perfect be the enemy of good.",
    category: 'motivation',
    trigger_type: 'random',
    display_context: 'dashboard',
  },
  {
    id: 'tip_motivation_002',
    content: "You don't have to feel motivated to start. Action creates motivation, not the other way around. Just begin—the energy follows.",
    category: 'motivation',
    trigger_type: 'random',
    display_context: 'dashboard',
  },
  {
    id: 'tip_motivation_003',
    content: "Compare yourself to who you were yesterday, not to who someone else is today. Your only competition is your past self.",
    category: 'motivation',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_motivation_004',
    content: "The pain of discipline weighs ounces. The pain of regret weighs tons. Every workout is a deposit into your future health.",
    category: 'motivation',
    trigger_type: 'random',
    display_context: 'dashboard',
  },
  {
    id: 'tip_motivation_005',
    content: "Show up on the days you don't want to. Those are the workouts that build character, not just muscle.",
    category: 'motivation',
    trigger_type: 'random',
    display_context: 'dashboard',
  },
  {
    id: 'tip_motivation_006',
    content: "You're not just working out—you're voting for the type of person you want to become. Every rep is a ballot for your future self.",
    category: 'motivation',
    trigger_type: 'random',
    display_context: 'post_workout',
  },

  // === INTERESTING SCIENCE ===
  {
    id: 'tip_science_001',
    content: "Your body contains about 650 skeletal muscles, accounting for 40% of your body weight. Even at rest, they consume about 25% of your energy.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'between_sets',
  },
  {
    id: 'tip_science_002',
    content: "Muscle memory is real—and it's in your DNA. When you build muscle, your cells gain nuclei that remain even if the muscle shrinks. Regaining lost muscle is faster than building it the first time.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_science_003',
    content: "Exercise triggers the release of BDNF (brain-derived neurotrophic factor), which helps grow new brain cells and improve memory. Your workout is also a brain workout.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
  {
    id: 'tip_science_004',
    content: "Your grip strength is one of the best predictors of overall health and longevity. A strong grip correlates with lower all-cause mortality risk.",
    category: 'science',
    source: 'Leong et al., 2015',
    trigger_type: 'random',
    display_context: 'between_sets',
  },
  {
    id: 'tip_science_005',
    content: "The pump you feel during workouts is blood pooling in your muscles. While it doesn't directly cause growth, it's correlated with metabolic stress—one trigger for hypertrophy.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_science_006',
    content: "Your fast-twitch muscle fibers generate 4x more force than slow-twitch fibers, but fatigue quickly. Heavy, explosive training builds fast-twitch muscle.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'between_sets',
  },
  {
    id: 'tip_science_007',
    content: "Breathing through your nose during lighter exercises activates your parasympathetic nervous system, helping you stay calm and focused.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'during_exercise',
  },
  {
    id: 'tip_science_008',
    content: "Your heart pumps about 5 liters of blood per minute at rest, but during intense exercise, this can increase to 25-30 liters per minute.",
    category: 'science',
    trigger_type: 'random',
    display_context: 'post_workout',
  },
];

const MILESTONES_SEED: MilestoneSeed[] = [
  {
    id: 'first_workout',
    name: 'First Workout',
    description: 'Complete your first workout',
    metric: 'workouts_completed',
    threshold: 1,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_first_workout',
  },
  {
    id: 'workouts_10',
    name: '10 Workouts',
    description: 'Complete 10 workouts',
    metric: 'workouts_completed',
    threshold: 10,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_workouts_10',
  },
  {
    id: 'workouts_50',
    name: '50 Workouts',
    description: 'Complete 50 workouts',
    metric: 'workouts_completed',
    threshold: 50,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_workouts_50',
  },
  {
    id: 'workouts_100',
    name: 'Century',
    description: 'Complete 100 workouts',
    metric: 'workouts_completed',
    threshold: 100,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_workouts_100',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Work out 7 days in a row',
    metric: 'streak_days',
    threshold: 7,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_streak_7',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Work out 30 days in a row',
    metric: 'streak_days',
    threshold: 30,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_streak_30',
  },
  {
    id: 'exercises_100',
    name: '100 Exercises',
    description: 'Complete 100 individual exercises',
    metric: 'exercises_done',
    threshold: 100,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_exercises_100',
  },
  {
    id: 'reps_1000',
    name: '1000 Reps',
    description: 'Complete 1,000 total reps',
    metric: 'total_reps',
    threshold: 1000,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_reps_1000',
  },
  {
    id: 'reps_10000',
    name: '10K Reps',
    description: 'Complete 10,000 total reps',
    metric: 'total_reps',
    threshold: 10000,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_reps_10000',
  },
  {
    id: 'hours_10',
    name: '10 Hours',
    description: 'Spend 10 hours working out',
    metric: 'total_minutes',
    threshold: 600,
    reward_type: 'tip_unlock',
    reward_value: 'tip_milestone_hours_10',
  },
];

export async function seedTips(): Promise<void> {
  log.info('Seeding tips...');

  for (const tip of TIPS_SEED) {
    await db.query(`
      INSERT INTO tips (id, title, content, source, category, subcategory, trigger_type, trigger_value, display_context)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      tip.id,
      tip.title || null,
      tip.content,
      tip.source || null,
      tip.category,
      tip.subcategory || null,
      tip.trigger_type,
      tip.trigger_value || null,
      tip.display_context || null
    ]);
  }

  log.info(`Seeded ${TIPS_SEED.length} tips`);
}

export async function seedMilestones(): Promise<void> {
  log.info('Seeding milestones...');

  for (const milestone of MILESTONES_SEED) {
    await db.query(`
      INSERT INTO milestones (id, name, description, metric, threshold, reward_type, reward_value)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [
      milestone.id,
      milestone.name,
      milestone.description || null,
      milestone.metric,
      milestone.threshold,
      milestone.reward_type || null,
      milestone.reward_value || null
    ]);
  }

  log.info(`Seeded ${MILESTONES_SEED.length} milestones`);
}
