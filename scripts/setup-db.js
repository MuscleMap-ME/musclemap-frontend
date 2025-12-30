import db, { initializeDatabase } from '../server/db.js';

console.log('🚀 Setting up MuscleMap database...\n');

try {
  // Initialize schema
  initializeDatabase();

  // Load muscles from your data
  console.log('📦 Loading muscle data...');
  const muscleInsert = db.prepare(`
    INSERT OR IGNORE INTO muscles (id, name, anatomical_name, muscle_group, bias_weight, optimal_weekly_volume, recovery_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

// Sample muscles (add all 98 from your data)
const muscles = [
  ['glute_maximus', 'Gluteus Maximus', 'Gluteus Maximus', 'posterior_chain', 4.2, 63, 48],
  ['quad_rectus_femoris', 'Rectus Femoris', 'Rectus Femoris', 'legs', 3.8, 57, 48],
  ['hamstring_biceps_femoris_long', 'Biceps Femoris (Long)', 'Biceps Femoris Long Head', 'posterior_chain', 3.0, 45, 48],
  ['pec_major_sternal', 'Pectoralis Major (Mid)', 'Pectoralis Major - Sternal', 'chest', 2.6, 39, 72],
  ['lat_upper', 'Latissimus Dorsi (Upper)', 'Latissimus Dorsi - Upper', 'back', 3.2, 48, 72],
  ['delt_anterior', 'Anterior Deltoid', 'Deltoid - Anterior', 'shoulders', 1.4, 21, 48],
  ['biceps_long_head', 'Biceps Brachii (Long)', 'Biceps Brachii - Long Head', 'arms', 1.0, 15, 48],
  ['abs_rectus_upper', 'Rectus Abdominis (Upper)', 'Rectus Abdominis - Upper', 'core', 1.8, 27, 36]
];

muscles.forEach(m => muscleInsert.run(...m));
console.log(`✓ Loaded ${muscles.length} muscles`);

// Load exercises
console.log('📦 Loading exercise data...');
const exerciseInsert = db.prepare(`
  INSERT OR IGNORE INTO exercises (id, name, type, difficulty, description, cues, primary_muscles)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const exercises = [
  ['bb_back_squat', 'Barbell Back Squat', 'barbell', 2, 'Bar on upper back squat', '["Big breath","Break at hips and knees","Drive through floor"]', '["quad_rectus_femoris","glute_maximus"]'],
  ['bb_bench_press', 'Barbell Bench Press', 'barbell', 2, 'Horizontal pressing', '["Arch back","Drive feet","Touch chest"]', '["pec_major_sternal"]'],
  ['bb_deadlift', 'Conventional Deadlift', 'barbell', 2, 'Hip hinge pulling', '["Neutral spine","Lats locked","Hips through"]', '["glute_maximus","hamstring_biceps_femoris_long"]'],
  ['bw_pullup', 'Pull-Up', 'bodyweight', 2, 'Overhand grip pull-up', '["Full hang","Chest to bar","Controlled negative"]', '["lat_upper"]'],
  ['bw_pushup', 'Push-Up', 'bodyweight', 1, 'Standard push-up', '["Plank position","Full ROM","Controlled tempo"]', '["pec_major_sternal"]'],
  ['kb_swing', 'Kettlebell Swing', 'kettlebell', 2, 'Hip hinge ballistic', '["Hip snap","Tight plank","Floating bell"]', '["glute_maximus","hamstring_biceps_femoris_long"]']
];

exercises.forEach(e => exerciseInsert.run(...e));
console.log(`✓ Loaded ${exercises.length} exercises`);

// Load exercise activations
console.log('📦 Loading muscle activations...');
const activationInsert = db.prepare(`
  INSERT OR IGNORE INTO exercise_activations (exercise_id, muscle_id, activation)
  VALUES (?, ?, ?)
`);

const activations = [
  ['bb_back_squat', 'quad_rectus_femoris', 85],
  ['bb_back_squat', 'glute_maximus', 80],
  ['bb_bench_press', 'pec_major_sternal', 85],
  ['bb_deadlift', 'glute_maximus', 90],
  ['bb_deadlift', 'hamstring_biceps_femoris_long', 85],
  ['bw_pullup', 'lat_upper', 85],
  ['bw_pullup', 'biceps_long_head', 70],
  ['bw_pushup', 'pec_major_sternal', 70],
  ['kb_swing', 'glute_maximus', 85],
  ['kb_swing', 'hamstring_biceps_femoris_long', 80]
];

activations.forEach(a => activationInsert.run(...a));
console.log(`✓ Loaded ${activations.length} muscle activations`);

// Load archetypes
console.log('📦 Loading archetypes...');
const archetypeInsert = db.prepare(`
  INSERT OR IGNORE INTO archetypes (id, name, philosophy, focus_areas)
  VALUES (?, ?, ?, ?)
`);

const archetypes = [
  ['bodybuilder', 'Bodybuilder', 'Maximum muscle hypertrophy through volume', '["Chest","Back","Arms"]'],
  ['crossfit', 'CrossFit Athlete', 'GPP across all modalities', '["Olympic lifts","Metcon","Gymnastics"]'],
  ['gymnast', 'Gymnast', 'Bodyweight mastery and relative strength', '["Pushing","Pulling","Core control"]']
];

archetypes.forEach(a => archetypeInsert.run(...a));
console.log(`✓ Loaded ${archetypes.length} archetypes`);

// Load archetype levels
console.log('📦 Loading progression levels...');
const levelInsert = db.prepare(`
  INSERT OR IGNORE INTO archetype_levels (archetype_id, level, name, description, muscle_targets)
  VALUES (?, ?, ?, ?, ?)
`);

const levels = [
  ['bodybuilder', 1, 'Hypertrophy Foundation', 'Build foundation with compound movements', '[{"muscleGroup":"chest","targetTU":25},{"muscleGroup":"back","targetTU":25}]'],
  ['bodybuilder', 2, 'Volume Intensification', 'Increase volume and intensity', '[{"muscleGroup":"chest","targetTU":28},{"muscleGroup":"back","targetTU":28}]'],
  ['bodybuilder', 3, 'Advanced Hypertrophy', 'Peak volume and advanced techniques', '[{"muscleGroup":"chest","targetTU":30},{"muscleGroup":"back","targetTU":30}]']
];

levels.forEach(l => levelInsert.run(...l));
console.log(`✓ Loaded ${levels.length} progression levels`);

console.log('\n✅ Database setup complete!');
console.log('🎯 Ready to launch MuscleMap\n');

} catch (error) {
  console.error('\n❌ Database setup failed!');
  console.error('Error:', error.message);
  console.error('\nPlease check:');
  console.error('  1. SQLite is installed');
  console.error('  2. Write permissions in current directory');
  console.error('  3. No existing database is locked\n');
  process.exit(1);
}

process.exit(0);
