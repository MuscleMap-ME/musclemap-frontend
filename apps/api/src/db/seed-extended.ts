import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../data/musclemap.db'));
console.log('🌱 Seeding extended exercises...');

const exercises = [
  { id: 'bw-ring-dip', name: 'Ring Dip', type: 'bodyweight', difficulty: 3, primaryMuscles: 'triceps-long,chest-lower,delt-front' },
  { id: 'bw-ring-pushup', name: 'Ring Push-Up', type: 'bodyweight', difficulty: 2, primaryMuscles: 'chest-mid,triceps-lateral,serratus' },
  { id: 'bw-ring-row', name: 'Ring Row', type: 'bodyweight', difficulty: 2, primaryMuscles: 'rhomboids,lats,biceps-short' },
  { id: 'bw-front-lever', name: 'Front Lever', type: 'bodyweight', difficulty: 5, primaryMuscles: 'lats,rectus-abdominis,delt-rear' },
  { id: 'bw-back-lever', name: 'Back Lever', type: 'bodyweight', difficulty: 4, primaryMuscles: 'biceps-long,delt-front,chest-lower' },
  { id: 'bw-planche-lean', name: 'Planche Lean', type: 'bodyweight', difficulty: 3, primaryMuscles: 'delt-front,chest-upper,serratus' },
  { id: 'bw-human-flag', name: 'Human Flag', type: 'bodyweight', difficulty: 5, primaryMuscles: 'obliques,lats,delt-side' },
  { id: 'bw-ab-wheel', name: 'Ab Wheel Rollout', type: 'bodyweight', difficulty: 3, primaryMuscles: 'rectus-abdominis,lats,triceps-long' },
  { id: 'bw-pistol-squat', name: 'Pistol Squat', type: 'bodyweight', difficulty: 4, primaryMuscles: 'quad-rectus,glute-max,glute-med' },
  { id: 'bw-shrimp-squat', name: 'Shrimp Squat', type: 'bodyweight', difficulty: 4, primaryMuscles: 'quad-rectus,glute-max' },
  { id: 'fw-power-clean', name: 'Power Clean', type: 'freeweight', difficulty: 4, primaryMuscles: 'glute-max,traps-upper,quad-rectus' },
  { id: 'fw-snatch', name: 'Barbell Snatch', type: 'freeweight', difficulty: 5, primaryMuscles: 'glute-max,traps-upper,delt-front' },
  { id: 'fw-thruster', name: 'Thruster', type: 'freeweight', difficulty: 3, primaryMuscles: 'quad-rectus,delt-front,glute-max' },
  { id: 'fw-sumo-deadlift', name: 'Sumo Deadlift', type: 'freeweight', difficulty: 3, primaryMuscles: 'glute-max,adductor-magnus,quad-vastus-lat' },
  { id: 'fw-pendlay-row', name: 'Pendlay Row', type: 'freeweight', difficulty: 3, primaryMuscles: 'lats,rhomboids,erector-spinae' },
  { id: 'fw-z-press', name: 'Z Press', type: 'freeweight', difficulty: 3, primaryMuscles: 'delt-front,rectus-abdominis,triceps-long' },
  { id: 'fw-incline-curl', name: 'Incline Dumbbell Curl', type: 'freeweight', difficulty: 1, primaryMuscles: 'biceps-long,biceps-short' },
  { id: 'fw-spider-curl', name: 'Spider Curl', type: 'freeweight', difficulty: 2, primaryMuscles: 'biceps-short,brachialis' },
  { id: 'fw-pause-squat', name: 'Pause Squat', type: 'freeweight', difficulty: 3, primaryMuscles: 'quad-rectus,glute-max' },
  { id: 'fw-box-squat', name: 'Box Squat', type: 'freeweight', difficulty: 2, primaryMuscles: 'glute-max,hamstring-bicep,quad-vastus-lat' },
  { id: 'kb-turkish-getup', name: 'Turkish Get-Up', type: 'kettlebell', difficulty: 3, primaryMuscles: 'delt-front,obliques,glute-med' },
  { id: 'kb-renegade-row', name: 'Renegade Row', type: 'kettlebell', difficulty: 3, primaryMuscles: 'lats,rectus-abdominis,obliques' },
  { id: 'kb-bottoms-up-press', name: 'Bottoms Up Press', type: 'kettlebell', difficulty: 3, primaryMuscles: 'forearm-flexors,delt-front,rotator-cuff' },
  { id: 'fw-farmers-walk', name: "Farmer's Walk", type: 'freeweight', difficulty: 2, primaryMuscles: 'forearm-flexors,traps-upper,erector-spinae' },
  { id: 'fw-pallof-press', name: 'Pallof Press', type: 'freeweight', difficulty: 2, primaryMuscles: 'obliques,transverse-abdominis' },
];

const stmt = db.prepare('INSERT OR REPLACE INTO exercises (id, name, type, difficulty, primary_muscles) VALUES (?, ?, ?, ?, ?)');
for (const e of exercises) stmt.run(e.id, e.name, e.type, e.difficulty, e.primaryMuscles);
console.log(`✓ Inserted ${exercises.length} exercises`);

const activations = [
  { exerciseId: 'bw-ring-dip', muscleId: 'triceps-long', activation: 85 },
  { exerciseId: 'bw-ring-dip', muscleId: 'chest-lower', activation: 70 },
  { exerciseId: 'bw-ring-dip', muscleId: 'delt-front', activation: 55 },
  { exerciseId: 'bw-front-lever', muscleId: 'lats', activation: 95 },
  { exerciseId: 'bw-front-lever', muscleId: 'rectus-abdominis', activation: 70 },
  { exerciseId: 'fw-power-clean', muscleId: 'glute-max', activation: 85 },
  { exerciseId: 'fw-power-clean', muscleId: 'traps-upper', activation: 80 },
  { exerciseId: 'fw-power-clean', muscleId: 'quad-rectus', activation: 70 },
  { exerciseId: 'fw-snatch', muscleId: 'glute-max', activation: 90 },
  { exerciseId: 'fw-snatch', muscleId: 'traps-upper', activation: 85 },
  { exerciseId: 'fw-snatch', muscleId: 'delt-front', activation: 70 },
  { exerciseId: 'fw-thruster', muscleId: 'quad-rectus', activation: 80 },
  { exerciseId: 'fw-thruster', muscleId: 'delt-front', activation: 75 },
  { exerciseId: 'fw-thruster', muscleId: 'glute-max', activation: 70 },
  { exerciseId: 'kb-turkish-getup', muscleId: 'delt-front', activation: 70 },
  { exerciseId: 'kb-turkish-getup', muscleId: 'obliques', activation: 65 },
  { exerciseId: 'kb-turkish-getup', muscleId: 'glute-med', activation: 60 },
  { exerciseId: 'bw-human-flag', muscleId: 'obliques', activation: 95 },
  { exerciseId: 'bw-human-flag', muscleId: 'lats', activation: 80 },
  { exerciseId: 'bw-pistol-squat', muscleId: 'quad-rectus', activation: 90 },
  { exerciseId: 'bw-pistol-squat', muscleId: 'glute-max', activation: 75 },
  { exerciseId: 'bw-pistol-squat', muscleId: 'glute-med', activation: 65 },
];

const actStmt = db.prepare('INSERT OR REPLACE INTO exercise_activations (exercise_id, muscle_id, activation) VALUES (?, ?, ?)');
for (const a of activations) actStmt.run(a.exerciseId, a.muscleId, a.activation);
console.log(`✓ Inserted ${activations.length} activations`);

console.log('✅ Done!');
db.close();
