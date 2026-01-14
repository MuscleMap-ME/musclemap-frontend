/**
 * Database Seed Script
 *
 * Run with: npx tsx src/db/seed.ts
 */

import { db, initializePool, closePool } from './client';

// Import additional exercise seeds
import { allClimbingGymnasticsExercises, climbingGymnasticsActivations } from './seeds/climbing-gymnastics-exercises';

// ============================================
// MUSCLES WITH BIAS WEIGHTS
// ============================================

const muscles = [
  // Chest
  { id: 'chest-upper', name: 'Upper Chest', anatomicalName: 'Pectoralis Major (Clavicular)', muscleGroup: 'Chest', biasWeight: 15 },
  { id: 'chest-mid', name: 'Mid Chest', anatomicalName: 'Pectoralis Major (Sternal)', muscleGroup: 'Chest', biasWeight: 18 },
  { id: 'chest-lower', name: 'Lower Chest', anatomicalName: 'Pectoralis Major (Abdominal)', muscleGroup: 'Chest', biasWeight: 12 },

  // Back
  { id: 'lats', name: 'Lats', anatomicalName: 'Latissimus Dorsi', muscleGroup: 'Back', biasWeight: 20 },
  { id: 'traps-upper', name: 'Upper Traps', anatomicalName: 'Trapezius (Upper)', muscleGroup: 'Back', biasWeight: 10 },
  { id: 'traps-mid', name: 'Mid Traps', anatomicalName: 'Trapezius (Middle)', muscleGroup: 'Back', biasWeight: 12 },
  { id: 'traps-lower', name: 'Lower Traps', anatomicalName: 'Trapezius (Lower)', muscleGroup: 'Back', biasWeight: 8 },
  { id: 'rhomboids', name: 'Rhomboids', anatomicalName: 'Rhomboid Major/Minor', muscleGroup: 'Back', biasWeight: 8 },
  { id: 'teres-major', name: 'Teres Major', anatomicalName: 'Teres Major', muscleGroup: 'Back', biasWeight: 6 },
  { id: 'erector-spinae', name: 'Erector Spinae', anatomicalName: 'Erector Spinae', muscleGroup: 'Back', biasWeight: 15 },

  // Shoulders
  { id: 'delt-front', name: 'Front Delts', anatomicalName: 'Deltoid (Anterior)', muscleGroup: 'Shoulders', biasWeight: 10 },
  { id: 'delt-side', name: 'Side Delts', anatomicalName: 'Deltoid (Lateral)', muscleGroup: 'Shoulders', biasWeight: 8 },
  { id: 'delt-rear', name: 'Rear Delts', anatomicalName: 'Deltoid (Posterior)', muscleGroup: 'Shoulders', biasWeight: 6 },
  { id: 'rotator-cuff', name: 'Rotator Cuff', anatomicalName: 'Infraspinatus/Supraspinatus/Teres Minor/Subscapularis', muscleGroup: 'Shoulders', biasWeight: 4 },

  // Arms
  { id: 'biceps-long', name: 'Biceps Long Head', anatomicalName: 'Biceps Brachii (Long)', muscleGroup: 'Arms', biasWeight: 8 },
  { id: 'biceps-short', name: 'Biceps Short Head', anatomicalName: 'Biceps Brachii (Short)', muscleGroup: 'Arms', biasWeight: 8 },
  { id: 'brachialis', name: 'Brachialis', anatomicalName: 'Brachialis', muscleGroup: 'Arms', biasWeight: 6 },
  { id: 'brachioradialis', name: 'Brachioradialis', anatomicalName: 'Brachioradialis', muscleGroup: 'Arms', biasWeight: 5 },
  { id: 'triceps-long', name: 'Triceps Long Head', anatomicalName: 'Triceps Brachii (Long)', muscleGroup: 'Arms', biasWeight: 10 },
  { id: 'triceps-lateral', name: 'Triceps Lateral Head', anatomicalName: 'Triceps Brachii (Lateral)', muscleGroup: 'Arms', biasWeight: 8 },
  { id: 'triceps-medial', name: 'Triceps Medial Head', anatomicalName: 'Triceps Brachii (Medial)', muscleGroup: 'Arms', biasWeight: 6 },
  { id: 'forearm-flexors', name: 'Forearm Flexors', anatomicalName: 'Wrist Flexors', muscleGroup: 'Arms', biasWeight: 6 },
  { id: 'forearm-extensors', name: 'Forearm Extensors', anatomicalName: 'Wrist Extensors', muscleGroup: 'Arms', biasWeight: 5 },

  // Core
  { id: 'rectus-abdominis', name: 'Rectus Abdominis', anatomicalName: 'Rectus Abdominis', muscleGroup: 'Core', biasWeight: 12 },
  { id: 'obliques', name: 'Obliques', anatomicalName: 'External/Internal Obliques', muscleGroup: 'Core', biasWeight: 10 },
  { id: 'transverse-abdominis', name: 'Transverse Abdominis', anatomicalName: 'Transverse Abdominis', muscleGroup: 'Core', biasWeight: 8 },
  { id: 'serratus', name: 'Serratus Anterior', anatomicalName: 'Serratus Anterior', muscleGroup: 'Core', biasWeight: 6 },

  // Glutes & Hips
  { id: 'glute-max', name: 'Gluteus Maximus', anatomicalName: 'Gluteus Maximus', muscleGroup: 'Glutes', biasWeight: 22 },
  { id: 'glute-med', name: 'Gluteus Medius', anatomicalName: 'Gluteus Medius', muscleGroup: 'Glutes', biasWeight: 10 },
  { id: 'glute-min', name: 'Gluteus Minimus', anatomicalName: 'Gluteus Minimus', muscleGroup: 'Glutes', biasWeight: 6 },
  { id: 'hip-flexors', name: 'Hip Flexors', anatomicalName: 'Iliopsoas', muscleGroup: 'Glutes', biasWeight: 8 },

  // Quadriceps
  { id: 'quad-rectus', name: 'Rectus Femoris', anatomicalName: 'Rectus Femoris', muscleGroup: 'Quads', biasWeight: 15 },
  { id: 'quad-vastus-lat', name: 'Vastus Lateralis', anatomicalName: 'Vastus Lateralis', muscleGroup: 'Quads', biasWeight: 18 },
  { id: 'quad-vastus-med', name: 'Vastus Medialis', anatomicalName: 'Vastus Medialis', muscleGroup: 'Quads', biasWeight: 15 },
  { id: 'quad-vastus-int', name: 'Vastus Intermedius', anatomicalName: 'Vastus Intermedius', muscleGroup: 'Quads', biasWeight: 12 },

  // Hamstrings
  { id: 'hamstring-bicep', name: 'Bicep Femoris', anatomicalName: 'Biceps Femoris', muscleGroup: 'Hamstrings', biasWeight: 14 },
  { id: 'hamstring-semi-t', name: 'Semitendinosus', anatomicalName: 'Semitendinosus', muscleGroup: 'Hamstrings', biasWeight: 10 },
  { id: 'hamstring-semi-m', name: 'Semimembranosus', anatomicalName: 'Semimembranosus', muscleGroup: 'Hamstrings', biasWeight: 10 },

  // Adductors
  { id: 'adductor-magnus', name: 'Adductor Magnus', anatomicalName: 'Adductor Magnus', muscleGroup: 'Adductors', biasWeight: 12 },
  { id: 'adductor-longus', name: 'Adductor Longus', anatomicalName: 'Adductor Longus', muscleGroup: 'Adductors', biasWeight: 8 },
  { id: 'adductor-brevis', name: 'Adductor Brevis', anatomicalName: 'Adductor Brevis', muscleGroup: 'Adductors', biasWeight: 6 },

  // Calves
  { id: 'gastrocnemius', name: 'Gastrocnemius', anatomicalName: 'Gastrocnemius', muscleGroup: 'Calves', biasWeight: 12 },
  { id: 'soleus', name: 'Soleus', anatomicalName: 'Soleus', muscleGroup: 'Calves', biasWeight: 10 },
  { id: 'tibialis-anterior', name: 'Tibialis Anterior', anatomicalName: 'Tibialis Anterior', muscleGroup: 'Calves', biasWeight: 6 },
];

// ============================================
// EXERCISES
// ============================================

const exercises = [
  // Bodyweight - Push
  { id: 'bw-pushup', name: 'Push-Up', type: 'bodyweight', difficulty: 1, primaryMuscles: 'chest-mid,triceps-lateral,delt-front', description: 'Classic bodyweight pressing movement that builds chest, triceps, and shoulder strength. Perform with hands shoulder-width apart, lowering until chest nearly touches the ground.', cues: 'Keep core tight, elbows at 45 degrees, full range of motion' },
  { id: 'bw-diamond-pushup', name: 'Diamond Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'triceps-long,chest-mid', description: 'Advanced push-up variation with hands forming a diamond shape under the chest. Emphasizes triceps activation more than standard push-ups.', cues: 'Touch thumbs and index fingers, keep elbows close to body' },
  { id: 'bw-pike-pushup', name: 'Pike Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'delt-front,triceps-lateral', description: 'Shoulder-focused push-up performed in an inverted V position. Great progression toward handstand push-ups.', cues: 'Hips high, head between arms, lower forehead toward floor' },
  { id: 'bw-decline-pushup', name: 'Decline Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'chest-upper,delt-front', description: 'Push-up variation with feet elevated on a bench or step. Increases difficulty and targets upper chest.', cues: 'Maintain straight body line, control the descent' },
  { id: 'bw-archer-pushup', name: 'Archer Push-Up', type: 'bodyweight', difficulty: 3, primaryMuscles: 'chest-mid,triceps-lateral', description: 'Unilateral push-up variation where one arm extends to the side while the other performs the push. Builds toward one-arm push-ups.', cues: 'Keep extended arm straight, shift weight over working arm' },
  { id: 'bw-dip', name: 'Dip', type: 'bodyweight', difficulty: 2, primaryMuscles: 'triceps-long,chest-lower,delt-front', description: 'Upper body compound movement performed on parallel bars or dip station. Excellent for building triceps and lower chest.', cues: 'Lean forward for chest, stay upright for triceps, full depth' },
  { id: 'bw-hspu', name: 'Handstand Push-Up', type: 'bodyweight', difficulty: 4, primaryMuscles: 'delt-front,triceps-long,traps-upper', description: 'Advanced pressing movement performed in a handstand position against a wall. Builds impressive shoulder strength.', cues: 'Kick up to wall, lower head to floor, press back up' },

  // Bodyweight - Pull
  { id: 'bw-pullup', name: 'Pull-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'lats,biceps-long,teres-major', description: 'Fundamental back exercise performed with overhand grip. Builds V-taper by developing the latissimus dorsi.', cues: 'Shoulders down and back, pull until chin over bar, control descent' },
  { id: 'bw-chinup', name: 'Chin-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'biceps-short,lats,brachialis', description: 'Pull-up variation with underhand (supinated) grip. Places more emphasis on biceps while still targeting back.', cues: 'Grip shoulder-width, squeeze biceps at top, full extension' },
  { id: 'bw-row', name: 'Inverted Row', type: 'bodyweight', difficulty: 1, primaryMuscles: 'rhomboids,traps-mid,biceps-short', description: 'Horizontal pulling movement performed under a bar or rings. Great for building back thickness and grip strength.', cues: 'Keep body straight, pull chest to bar, squeeze shoulder blades' },
  { id: 'bw-typewriter-pullup', name: 'Typewriter Pull-Up', type: 'bodyweight', difficulty: 4, primaryMuscles: 'lats,biceps-long', description: 'Advanced pull-up variation where you move horizontally at the top of the movement. Builds unilateral strength.', cues: 'Pull up, shift side to side while staying at top, control movement' },
  { id: 'bw-muscle-up', name: 'Muscle-Up', type: 'bodyweight', difficulty: 5, primaryMuscles: 'lats,triceps-long,chest-lower', description: 'Elite calisthenic movement combining a pull-up with a dip transition. Requires significant pulling and pressing strength.', cues: 'Explosive pull, lean forward over bar, press to lockout' },

  // Bodyweight - Legs
  { id: 'bw-squat', name: 'Bodyweight Squat', type: 'bodyweight', difficulty: 1, primaryMuscles: 'quad-vastus-lat,glute-max', description: 'Fundamental lower body movement pattern. Builds leg strength and mobility without equipment.', cues: 'Feet shoulder-width, knees track over toes, depth below parallel' },
  { id: 'bw-lunge', name: 'Lunge', type: 'bodyweight', difficulty: 1, primaryMuscles: 'quad-rectus,glute-max,hamstring-bicep', description: 'Unilateral leg exercise that builds balance, coordination, and leg strength. Can be performed walking or stationary.', cues: 'Long stride, front knee over ankle, back knee nearly touches floor' },
  { id: 'bw-bulgarian-split', name: 'Bulgarian Split Squat', type: 'bodyweight', difficulty: 2, primaryMuscles: 'quad-vastus-lat,glute-max', description: 'Single-leg squat with rear foot elevated. Excellent for building leg strength and addressing imbalances.', cues: 'Rear foot on bench, torso upright, front knee tracks over toes' },
  { id: 'bw-pistol-squat', name: 'Pistol Squat', type: 'bodyweight', difficulty: 4, primaryMuscles: 'quad-rectus,glute-max,glute-med', description: 'Advanced single-leg squat performed to full depth. Requires exceptional strength, balance, and mobility.', cues: 'Extend non-working leg forward, sit back and down, stand without assistance' },
  { id: 'bw-nordic-curl', name: 'Nordic Curl', type: 'bodyweight', difficulty: 4, primaryMuscles: 'hamstring-bicep,hamstring-semi-t', description: 'Eccentric hamstring exercise that builds incredible posterior chain strength. Excellent for injury prevention.', cues: 'Anchor feet, lower slowly with hips extended, use hands to push back up' },
  { id: 'bw-calf-raise', name: 'Calf Raise', type: 'bodyweight', difficulty: 1, primaryMuscles: 'gastrocnemius,soleus', description: 'Isolation exercise for the calf muscles. Can be performed on flat ground or with heels hanging off a step.', cues: 'Rise onto balls of feet, pause at top, full stretch at bottom' },
  { id: 'bw-glute-bridge', name: 'Glute Bridge', type: 'bodyweight', difficulty: 1, primaryMuscles: 'glute-max,hamstring-bicep', description: 'Hip extension exercise performed lying on the back. Great for glute activation and building hip strength.', cues: 'Drive through heels, squeeze glutes at top, avoid hyperextending lower back' },

  // Bodyweight - Core
  { id: 'bw-plank', name: 'Plank', type: 'bodyweight', difficulty: 1, primaryMuscles: 'rectus-abdominis,transverse-abdominis', description: 'Isometric core exercise that builds endurance and stability. Foundation for all core training.', cues: 'Straight line from head to heels, engage core, breathe steadily' },
  { id: 'bw-hollow-hold', name: 'Hollow Body Hold', type: 'bodyweight', difficulty: 2, primaryMuscles: 'rectus-abdominis,hip-flexors', description: 'Gymnastic core position with lower back pressed into floor. Builds the core strength needed for advanced movements.', cues: 'Lower back flat, arms and legs extended, hold banana shape' },
  { id: 'bw-lsit', name: 'L-Sit', type: 'bodyweight', difficulty: 3, primaryMuscles: 'rectus-abdominis,hip-flexors,triceps-long', description: 'Isometric hold with legs extended parallel to ground while supporting body on hands. Builds incredible core and hip flexor strength.', cues: 'Depress shoulders, lock arms, keep legs straight and together' },
  { id: 'bw-dragon-flag', name: 'Dragon Flag', type: 'bodyweight', difficulty: 4, primaryMuscles: 'rectus-abdominis,obliques', description: 'Advanced core exercise made famous by Bruce Lee. Requires controlling your entire body as a rigid lever.', cues: 'Grip behind head, keep body straight, lower slowly under control' },
  { id: 'bw-hanging-leg-raise', name: 'Hanging Leg Raise', type: 'bodyweight', difficulty: 2, primaryMuscles: 'rectus-abdominis,hip-flexors', description: 'Core exercise performed hanging from a pull-up bar. Targets lower abs effectively.', cues: 'Minimize swing, lift legs to parallel or higher, control the descent' },

  // Kettlebell
  { id: 'kb-swing', name: 'Kettlebell Swing', type: 'kettlebell', difficulty: 2, primaryMuscles: 'glute-max,hamstring-bicep,erector-spinae', description: 'Dynamic hip hinge movement that builds explosive power and cardiovascular conditioning. Foundation of kettlebell training.', cues: 'Hinge at hips, snap hips forward, arms follow momentum, eye level height' },
  { id: 'kb-goblet-squat', name: 'Goblet Squat', type: 'kettlebell', difficulty: 1, primaryMuscles: 'quad-vastus-lat,glute-max', description: 'Squat variation holding kettlebell at chest. Great for learning proper squat mechanics and building leg strength.', cues: 'Hold bell at chest, elbows between knees at bottom, upright torso' },
  { id: 'kb-clean', name: 'Kettlebell Clean', type: 'kettlebell', difficulty: 2, primaryMuscles: 'glute-max,traps-upper,forearm-flexors', description: 'Explosive movement bringing the kettlebell from floor to rack position. Builds coordination and grip strength.', cues: 'Pull is from hips, keep elbow close, soft catch in rack position' },
  { id: 'kb-press', name: 'Kettlebell Press', type: 'kettlebell', difficulty: 2, primaryMuscles: 'delt-front,triceps-long', description: 'Overhead pressing movement from the rack position. Builds functional shoulder strength and stability.', cues: 'Brace core, press straight up, lockout overhead, control descent' },
  { id: 'kb-snatch', name: 'Kettlebell Snatch', type: 'kettlebell', difficulty: 3, primaryMuscles: 'glute-max,delt-front,traps-upper', description: 'Advanced kettlebell movement taking the bell from floor to overhead in one motion. Tests full-body coordination and power.', cues: 'Powerful hip extension, high pull, punch through at top, soft catch' },
  { id: 'kb-turkish-getup', name: 'Turkish Get-Up', type: 'kettlebell', difficulty: 3, primaryMuscles: 'delt-front,obliques,glute-med', description: 'Complex movement transitioning from lying to standing while holding weight overhead. Builds total-body stability and awareness.', cues: 'Keep eyes on bell, move deliberately through each position, arm stays locked' },
  { id: 'kb-row', name: 'Kettlebell Row', type: 'kettlebell', difficulty: 1, primaryMuscles: 'lats,rhomboids,biceps-short', description: 'Single-arm rowing movement that builds back thickness and grip strength. Great for addressing muscle imbalances.', cues: 'Hip hinge position, pull to hip, squeeze shoulder blade, control descent' },
  { id: 'kb-deadlift', name: 'Kettlebell Deadlift', type: 'kettlebell', difficulty: 1, primaryMuscles: 'glute-max,hamstring-bicep,erector-spinae', description: 'Hip hinge movement pattern that builds posterior chain strength. Foundation for swings and more advanced lifts.', cues: 'Push hips back, flat back, drive through heels, squeeze glutes at top' },
  { id: 'kb-windmill', name: 'Kettlebell Windmill', type: 'kettlebell', difficulty: 2, primaryMuscles: 'obliques,glute-med,hamstring-bicep', description: 'Rotational movement that builds oblique strength and hip mobility. Excellent for developing core stability.', cues: 'Arm locked overhead, push hip out, slide hand down leg, eyes on bell' },

  // Freeweight - Chest
  { id: 'fw-bench-press', name: 'Barbell Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-mid,triceps-lateral,delt-front', description: 'The king of chest exercises. Compound pressing movement that builds upper body mass and strength.', cues: 'Arch back, retract shoulder blades, touch chest, drive through feet' },
  { id: 'fw-incline-bench', name: 'Incline Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-upper,delt-front,triceps-lateral', description: 'Bench press variation on an inclined bench (30-45 degrees). Targets upper chest and front delts.', cues: 'Same setup as flat bench, bar path to upper chest, control descent' },
  { id: 'fw-db-bench', name: 'Dumbbell Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-mid,triceps-lateral', description: 'Chest press with dumbbells allowing greater range of motion. Excellent for addressing strength imbalances.', cues: 'Keep dumbbells over chest, lower to sides of chest, press up and slightly in' },
  { id: 'fw-db-fly', name: 'Dumbbell Fly', type: 'freeweight', difficulty: 2, primaryMuscles: 'chest-mid,chest-upper', description: 'Isolation movement for chest that emphasizes the stretch. Builds chest width and definition.', cues: 'Slight bend in elbows, wide arc motion, squeeze chest at top' },

  // Freeweight - Back
  { id: 'fw-deadlift', name: 'Deadlift', type: 'freeweight', difficulty: 3, primaryMuscles: 'glute-max,hamstring-bicep,erector-spinae,lats', description: 'The ultimate full-body strength builder. Develops posterior chain power and overall functional strength.', cues: 'Bar over mid-foot, flat back, push floor away, lockout with hips and knees together' },
  { id: 'fw-barbell-row', name: 'Barbell Row', type: 'freeweight', difficulty: 2, primaryMuscles: 'lats,rhomboids,traps-mid,biceps-short', description: 'Fundamental horizontal pulling movement. Builds back thickness and overall pulling strength.', cues: 'Hip hinge position, pull to lower chest, squeeze at top, control descent' },
  { id: 'fw-db-row', name: 'Dumbbell Row', type: 'freeweight', difficulty: 1, primaryMuscles: 'lats,rhomboids,biceps-short', description: 'Single-arm rowing movement for back development. Allows full range of motion and addresses imbalances.', cues: 'Support on bench, pull to hip, squeeze shoulder blade, full stretch at bottom' },
  { id: 'fw-pullover', name: 'Dumbbell Pullover', type: 'freeweight', difficulty: 2, primaryMuscles: 'lats,chest-lower,serratus', description: 'Unique exercise targeting lats and serratus. Can emphasize chest or back depending on form.', cues: 'Hips below bench, arms slightly bent, lower behind head, pull with lats' },

  // Freeweight - Shoulders
  { id: 'fw-ohp', name: 'Overhead Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'delt-front,triceps-long,traps-upper', description: 'Standing barbell press that builds shoulder strength and total-body stability. True test of pressing power.', cues: 'Bar on shoulders, brace core, press straight up, lean back slightly at start' },
  { id: 'fw-db-shoulder-press', name: 'Dumbbell Shoulder Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'delt-front,delt-side,triceps-long', description: 'Seated or standing dumbbell pressing movement. Allows natural rotation and independent arm work.', cues: 'Start at shoulder height, press straight up, lower under control' },
  { id: 'fw-lateral-raise', name: 'Lateral Raise', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-side', description: 'Isolation exercise for the lateral deltoid. Essential for building shoulder width and the capped look.', cues: 'Slight lean forward, raise to shoulder height, pinky higher than thumb' },
  { id: 'fw-front-raise', name: 'Front Raise', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-front', description: 'Isolation exercise for the anterior deltoid. Builds front shoulder definition and strength.', cues: 'Arms slightly bent, raise to eye level, control descent, avoid momentum' },
  { id: 'fw-rear-delt-fly', name: 'Rear Delt Fly', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-rear,rhomboids', description: 'Isolation movement for rear delts and upper back. Essential for balanced shoulder development.', cues: 'Bend at hips, raise arms to sides, squeeze rear delts, pinky up' },
  { id: 'fw-face-pull', name: 'Face Pull', type: 'freeweight', difficulty: 1, primaryMuscles: 'delt-rear,rotator-cuff,traps-mid', description: 'Cable exercise for rear delts and external rotators. Crucial for shoulder health and posture.', cues: 'Pull to face, separate hands, externally rotate, squeeze at end' },
  { id: 'fw-shrug', name: 'Barbell Shrug', type: 'freeweight', difficulty: 1, primaryMuscles: 'traps-upper', description: 'Direct trap exercise that builds the upper back shelf. Simple but effective for trap development.', cues: 'Shrug straight up, hold at top, avoid rolling shoulders, heavy weight' },

  // Freeweight - Arms
  { id: 'fw-barbell-curl', name: 'Barbell Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-short,biceps-long', description: 'Classic bicep exercise using a barbell. Allows heavy loading for maximum bicep development.', cues: 'Elbows at sides, curl with control, squeeze at top, full extension' },
  { id: 'fw-db-curl', name: 'Dumbbell Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-short,biceps-long', description: 'Bicep curl with dumbbells allowing supination. Builds bicep peak and addresses imbalances.', cues: 'Can alternate or together, rotate palm up during curl, squeeze at top' },
  { id: 'fw-hammer-curl', name: 'Hammer Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'brachialis,brachioradialis,biceps-long', description: 'Bicep curl with neutral grip. Targets the brachialis for arm thickness and forearm development.', cues: 'Palms face each other throughout, curl straight up, no rotation' },
  { id: 'fw-preacher-curl', name: 'Preacher Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-short,brachialis', description: 'Bicep isolation using a preacher bench. Eliminates momentum and targets the short head.', cues: 'Arm fully on pad, curl to top, slow negative, full stretch' },
  { id: 'fw-skull-crusher', name: 'Skull Crusher', type: 'freeweight', difficulty: 2, primaryMuscles: 'triceps-long,triceps-lateral', description: 'Tricep extension exercise lying on a bench. One of the best exercises for tricep mass.', cues: 'Lower to forehead or behind head, keep elbows pointed up, extend fully' },
  { id: 'fw-close-grip-bench', name: 'Close Grip Bench Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'triceps-long,triceps-lateral,chest-mid', description: 'Bench press with narrow grip emphasizing triceps. Allows heavy loading for tricep strength.', cues: 'Hands shoulder-width, elbows close to body, touch lower chest, lockout' },
  { id: 'fw-tricep-kickback', name: 'Tricep Kickback', type: 'freeweight', difficulty: 1, primaryMuscles: 'triceps-lateral,triceps-long', description: 'Isolation movement for triceps performed bent over. Excellent for tricep definition and peak contraction.', cues: 'Elbow pinned to side, extend arm fully, squeeze at top, light weight' },
  { id: 'fw-wrist-curl', name: 'Wrist Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'forearm-flexors', description: 'Isolation exercise for forearm flexors. Builds grip strength and forearm size.', cues: 'Rest forearms on thighs, curl wrists up, control descent, full range' },

  // Freeweight - Legs
  { id: 'fw-squat', name: 'Barbell Squat', type: 'freeweight', difficulty: 3, primaryMuscles: 'quad-vastus-lat,quad-rectus,glute-max', description: 'The king of leg exercises. Compound movement that builds incredible leg mass and full-body strength.', cues: 'Bar on upper back, brace core, sit back and down, knees track toes, drive up' },
  { id: 'fw-front-squat', name: 'Front Squat', type: 'freeweight', difficulty: 3, primaryMuscles: 'quad-rectus,quad-vastus-med,rectus-abdominis', description: 'Squat variation with bar in front rack position. Emphasizes quads and requires excellent mobility.', cues: 'Bar on front delts, elbows high, upright torso, full depth' },
  { id: 'fw-leg-press', name: 'Leg Press', type: 'freeweight', difficulty: 1, primaryMuscles: 'quad-vastus-lat,glute-max', description: 'Machine-based leg exercise allowing heavy loading. Great for building leg mass safely.', cues: 'Feet shoulder-width, lower under control, press through heels, avoid lockout' },
  { id: 'fw-romanian-dl', name: 'Romanian Deadlift', type: 'freeweight', difficulty: 2, primaryMuscles: 'hamstring-bicep,glute-max,erector-spinae', description: 'Hip hinge focusing on hamstring stretch and glute activation. Essential for posterior chain development.', cues: 'Slight knee bend, push hips back, feel hamstring stretch, squeeze glutes at top' },
  { id: 'fw-leg-curl', name: 'Leg Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'hamstring-bicep,hamstring-semi-t', description: 'Isolation exercise for hamstrings. Builds hamstring strength and protects against injury.', cues: 'Control the movement, full contraction, slow negative, avoid momentum' },
  { id: 'fw-leg-extension', name: 'Leg Extension', type: 'freeweight', difficulty: 1, primaryMuscles: 'quad-rectus,quad-vastus-lat', description: 'Isolation exercise for quadriceps. Great for building quad definition and addressing weaknesses.', cues: 'Sit back in seat, extend fully, squeeze at top, control descent' },
  { id: 'fw-hip-thrust', name: 'Hip Thrust', type: 'freeweight', difficulty: 2, primaryMuscles: 'glute-max,hamstring-bicep', description: 'The best exercise for glute development. Allows heavy loading with full hip extension.', cues: 'Upper back on bench, bar on hips, drive through heels, squeeze at top' },
  { id: 'fw-calf-raise', name: 'Weighted Calf Raise', type: 'freeweight', difficulty: 1, primaryMuscles: 'gastrocnemius,soleus', description: 'Calf raise with added weight for progressive overload. Essential for calf development.', cues: 'Full stretch at bottom, pause at top, control descent, high reps' },
  { id: 'fw-good-morning', name: 'Good Morning', type: 'freeweight', difficulty: 2, primaryMuscles: 'hamstring-bicep,erector-spinae,glute-max', description: 'Hip hinge with bar on back. Builds posterior chain strength and teaches proper hip hinge mechanics.', cues: 'Bar on upper back, slight knee bend, hinge at hips, flat back throughout' },
];

// ============================================
// EXERCISE ACTIVATIONS
// ============================================

const activations: { exerciseId: string; muscleId: string; activation: number }[] = [
  // Push-Up
  { exerciseId: 'bw-pushup', muscleId: 'chest-mid', activation: 70 },
  { exerciseId: 'bw-pushup', muscleId: 'chest-upper', activation: 40 },
  { exerciseId: 'bw-pushup', muscleId: 'chest-lower', activation: 30 },
  { exerciseId: 'bw-pushup', muscleId: 'triceps-lateral', activation: 60 },
  { exerciseId: 'bw-pushup', muscleId: 'triceps-long', activation: 40 },
  { exerciseId: 'bw-pushup', muscleId: 'delt-front', activation: 50 },
  { exerciseId: 'bw-pushup', muscleId: 'serratus', activation: 30 },

  // Diamond Push-Up
  { exerciseId: 'bw-diamond-pushup', muscleId: 'triceps-long', activation: 80 },
  { exerciseId: 'bw-diamond-pushup', muscleId: 'triceps-lateral', activation: 70 },
  { exerciseId: 'bw-diamond-pushup', muscleId: 'chest-mid', activation: 50 },

  // Pull-Up
  { exerciseId: 'bw-pullup', muscleId: 'lats', activation: 85 },
  { exerciseId: 'bw-pullup', muscleId: 'biceps-long', activation: 60 },
  { exerciseId: 'bw-pullup', muscleId: 'biceps-short', activation: 50 },
  { exerciseId: 'bw-pullup', muscleId: 'teres-major', activation: 55 },
  { exerciseId: 'bw-pullup', muscleId: 'rhomboids', activation: 45 },
  { exerciseId: 'bw-pullup', muscleId: 'traps-lower', activation: 35 },
  { exerciseId: 'bw-pullup', muscleId: 'forearm-flexors', activation: 40 },

  // Chin-Up
  { exerciseId: 'bw-chinup', muscleId: 'biceps-short', activation: 80 },
  { exerciseId: 'bw-chinup', muscleId: 'biceps-long', activation: 70 },
  { exerciseId: 'bw-chinup', muscleId: 'lats', activation: 70 },
  { exerciseId: 'bw-chinup', muscleId: 'brachialis', activation: 50 },

  // Dip
  { exerciseId: 'bw-dip', muscleId: 'triceps-long', activation: 80 },
  { exerciseId: 'bw-dip', muscleId: 'triceps-lateral', activation: 70 },
  { exerciseId: 'bw-dip', muscleId: 'chest-lower', activation: 65 },
  { exerciseId: 'bw-dip', muscleId: 'delt-front', activation: 50 },

  // Squat variations
  { exerciseId: 'bw-squat', muscleId: 'quad-vastus-lat', activation: 70 },
  { exerciseId: 'bw-squat', muscleId: 'quad-rectus', activation: 60 },
  { exerciseId: 'bw-squat', muscleId: 'glute-max', activation: 50 },

  { exerciseId: 'fw-squat', muscleId: 'quad-vastus-lat', activation: 90 },
  { exerciseId: 'fw-squat', muscleId: 'quad-rectus', activation: 80 },
  { exerciseId: 'fw-squat', muscleId: 'quad-vastus-med', activation: 75 },
  { exerciseId: 'fw-squat', muscleId: 'glute-max', activation: 70 },
  { exerciseId: 'fw-squat', muscleId: 'adductor-magnus', activation: 50 },
  { exerciseId: 'fw-squat', muscleId: 'erector-spinae', activation: 40 },

  // Deadlift
  { exerciseId: 'fw-deadlift', muscleId: 'glute-max', activation: 85 },
  { exerciseId: 'fw-deadlift', muscleId: 'hamstring-bicep', activation: 75 },
  { exerciseId: 'fw-deadlift', muscleId: 'erector-spinae', activation: 80 },
  { exerciseId: 'fw-deadlift', muscleId: 'lats', activation: 50 },
  { exerciseId: 'fw-deadlift', muscleId: 'traps-upper', activation: 45 },
  { exerciseId: 'fw-deadlift', muscleId: 'forearm-flexors', activation: 60 },
  { exerciseId: 'fw-deadlift', muscleId: 'quad-vastus-lat', activation: 40 },

  // Bench Press
  { exerciseId: 'fw-bench-press', muscleId: 'chest-mid', activation: 85 },
  { exerciseId: 'fw-bench-press', muscleId: 'chest-upper', activation: 50 },
  { exerciseId: 'fw-bench-press', muscleId: 'chest-lower', activation: 45 },
  { exerciseId: 'fw-bench-press', muscleId: 'triceps-lateral', activation: 65 },
  { exerciseId: 'fw-bench-press', muscleId: 'triceps-long', activation: 50 },
  { exerciseId: 'fw-bench-press', muscleId: 'delt-front', activation: 55 },

  // Kettlebell Swing
  { exerciseId: 'kb-swing', muscleId: 'glute-max', activation: 90 },
  { exerciseId: 'kb-swing', muscleId: 'hamstring-bicep', activation: 70 },
  { exerciseId: 'kb-swing', muscleId: 'erector-spinae', activation: 60 },
  { exerciseId: 'kb-swing', muscleId: 'rectus-abdominis', activation: 40 },
  { exerciseId: 'kb-swing', muscleId: 'delt-front', activation: 35 },
  { exerciseId: 'kb-swing', muscleId: 'forearm-flexors', activation: 50 },

  // Barbell Row
  { exerciseId: 'fw-barbell-row', muscleId: 'lats', activation: 80 },
  { exerciseId: 'fw-barbell-row', muscleId: 'rhomboids', activation: 70 },
  { exerciseId: 'fw-barbell-row', muscleId: 'traps-mid', activation: 65 },
  { exerciseId: 'fw-barbell-row', muscleId: 'biceps-short', activation: 55 },
  { exerciseId: 'fw-barbell-row', muscleId: 'delt-rear', activation: 45 },
  { exerciseId: 'fw-barbell-row', muscleId: 'erector-spinae', activation: 40 },

  // Overhead Press
  { exerciseId: 'fw-ohp', muscleId: 'delt-front', activation: 85 },
  { exerciseId: 'fw-ohp', muscleId: 'delt-side', activation: 50 },
  { exerciseId: 'fw-ohp', muscleId: 'triceps-long', activation: 65 },
  { exerciseId: 'fw-ohp', muscleId: 'triceps-lateral', activation: 55 },
  { exerciseId: 'fw-ohp', muscleId: 'traps-upper', activation: 45 },

  // Romanian Deadlift
  { exerciseId: 'fw-romanian-dl', muscleId: 'hamstring-bicep', activation: 85 },
  { exerciseId: 'fw-romanian-dl', muscleId: 'hamstring-semi-t', activation: 70 },
  { exerciseId: 'fw-romanian-dl', muscleId: 'glute-max', activation: 75 },
  { exerciseId: 'fw-romanian-dl', muscleId: 'erector-spinae', activation: 65 },

  // Hip Thrust
  { exerciseId: 'fw-hip-thrust', muscleId: 'glute-max', activation: 95 },
  { exerciseId: 'fw-hip-thrust', muscleId: 'hamstring-bicep', activation: 50 },
  { exerciseId: 'fw-hip-thrust', muscleId: 'adductor-magnus', activation: 35 },

  // Lateral Raise
  { exerciseId: 'fw-lateral-raise', muscleId: 'delt-side', activation: 90 },
  { exerciseId: 'fw-lateral-raise', muscleId: 'delt-front', activation: 30 },
  { exerciseId: 'fw-lateral-raise', muscleId: 'traps-upper', activation: 25 },

  // Barbell Curl
  { exerciseId: 'fw-barbell-curl', muscleId: 'biceps-short', activation: 85 },
  { exerciseId: 'fw-barbell-curl', muscleId: 'biceps-long', activation: 80 },
  { exerciseId: 'fw-barbell-curl', muscleId: 'brachialis', activation: 50 },
  { exerciseId: 'fw-barbell-curl', muscleId: 'forearm-flexors', activation: 40 },

  // Skull Crusher
  { exerciseId: 'fw-skull-crusher', muscleId: 'triceps-long', activation: 90 },
  { exerciseId: 'fw-skull-crusher', muscleId: 'triceps-lateral', activation: 70 },
  { exerciseId: 'fw-skull-crusher', muscleId: 'triceps-medial', activation: 60 },
];

/**
 * Seed the database with initial data
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Seed muscles
  for (const m of muscles) {
    await db.query(`
      INSERT INTO muscles (id, name, anatomical_name, muscle_group, bias_weight)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        anatomical_name = EXCLUDED.anatomical_name,
        muscle_group = EXCLUDED.muscle_group,
        bias_weight = EXCLUDED.bias_weight
    `, [m.id, m.name, m.anatomicalName, m.muscleGroup, m.biasWeight]);
  }
  console.log(`✓ Inserted ${muscles.length} muscles`);

  // Seed exercises with descriptions and cues
  for (const e of exercises) {
    // Convert comma-separated string to PostgreSQL array format
    const musclesArray = e.primaryMuscles ? e.primaryMuscles.split(',').map(m => m.trim()) : [];
    await db.query(`
      INSERT INTO exercises (id, name, type, difficulty, primary_muscles, description, cues)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        difficulty = EXCLUDED.difficulty,
        primary_muscles = EXCLUDED.primary_muscles,
        description = EXCLUDED.description,
        cues = EXCLUDED.cues
    `, [e.id, e.name, e.type, e.difficulty, musclesArray, e.description || null, e.cues || null]);
  }
  console.log(`✓ Inserted ${exercises.length} exercises with descriptions`);

  // Seed activations
  for (const a of activations) {
    await db.query(`
      INSERT INTO exercise_activations (exercise_id, muscle_id, activation)
      VALUES ($1, $2, $3)
      ON CONFLICT (exercise_id, muscle_id) DO UPDATE SET
        activation = EXCLUDED.activation
    `, [a.exerciseId, a.muscleId, a.activation]);
  }
  console.log(`✓ Inserted ${activations.length} exercise activations`);

  console.log('✅ Database seeded successfully!');
}

// Run if executed directly
if (require.main === module) {
  (async () => {
    try {
      await initializePool();
      await seedDatabase();
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
