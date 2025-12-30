import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../data/musclemap.db'));
console.log('🌱 Seeding archetypes...');

const archetypes = [
  { id: 'bodybuilder', name: 'Bodybuilder', philosophy: 'Aesthetic symmetry through hypertrophy.', description: 'Focus on balanced muscle development, symmetry, and size.', focusAreas: 'chest,back,shoulders,arms,legs,core' },
  { id: 'gymnast', name: 'Gymnast', philosophy: 'Strength through movement mastery.', description: 'Bodyweight mastery with emphasis on rings, handstands, and levers.', focusAreas: 'core,shoulders,lats,triceps,hip-flexors' },
  { id: 'powerlifter', name: 'Powerlifter', philosophy: 'Absolute strength in three lifts.', description: 'Maximize squat, bench, and deadlift.', focusAreas: 'glutes,quads,chest,back,triceps' },
  { id: 'crossfit', name: 'CrossFit Athlete', philosophy: 'Constantly varied functional movement.', description: 'Well-rounded fitness across all domains.', focusAreas: 'full-body,cardio,olympic-lifts' },
  { id: 'martial-artist', name: 'Martial Artist', philosophy: 'Power from the ground up.', description: 'Rotational power, hip mobility, and explosive strength.', focusAreas: 'core,hips,shoulders,legs' },
  { id: 'runner', name: 'Runner', philosophy: 'Miles make champions.', description: 'Lower body endurance and injury prevention.', focusAreas: 'glutes,hamstrings,calves,core' },
  { id: 'climber', name: 'Climber', philosophy: 'Grip is life.', description: 'Exceptional pulling strength and grip power.', focusAreas: 'forearms,lats,core' },
  { id: 'strongman', name: 'Strongman', philosophy: 'Move anything.', description: 'Odd object strength, carries, and explosive power.', focusAreas: 'back,shoulders,glutes,grip,core' },
  { id: 'functional', name: 'Functional Athlete', philosophy: 'Train for life.', description: 'Balanced strength, mobility, and conditioning.', focusAreas: 'full-body,mobility,stability' },
  { id: 'swimmer', name: 'Swimmer', philosophy: 'Flow through water.', description: 'Upper body pulling power with core stability.', focusAreas: 'lats,shoulders,core,chest' },
];

const archetypeStmt = db.prepare('INSERT OR REPLACE INTO archetypes (id, name, philosophy, description, focus_areas, icon_url) VALUES (?, ?, ?, ?, ?, NULL)');
for (const a of archetypes) archetypeStmt.run(a.id, a.name, a.philosophy, a.description, a.focusAreas);
console.log(`✓ Inserted ${archetypes.length} archetypes`);

const levels = [
  { archetypeId: 'bodybuilder', level: 1, name: 'Novice', totalTU: 0, description: 'Learning the basics' },
  { archetypeId: 'bodybuilder', level: 2, name: 'Beginner', totalTU: 500, description: 'Building foundation' },
  { archetypeId: 'bodybuilder', level: 3, name: 'Intermediate', totalTU: 2000, description: 'Developing size' },
  { archetypeId: 'bodybuilder', level: 4, name: 'Advanced', totalTU: 5000, description: 'Refining symmetry' },
  { archetypeId: 'bodybuilder', level: 5, name: 'Elite', totalTU: 10000, description: 'Competition ready' },
  { archetypeId: 'gymnast', level: 1, name: 'Novice', totalTU: 0, description: 'Learning basics' },
  { archetypeId: 'gymnast', level: 2, name: 'Foundation', totalTU: 500, description: 'Building strength base' },
  { archetypeId: 'gymnast', level: 3, name: 'Intermediate', totalTU: 2000, description: 'Skill acquisition' },
  { archetypeId: 'gymnast', level: 4, name: 'Advanced', totalTU: 5000, description: 'Complex skills' },
  { archetypeId: 'gymnast', level: 5, name: 'Elite', totalTU: 10000, description: 'Ring master' },
  { archetypeId: 'powerlifter', level: 1, name: 'Novice', totalTU: 0, description: 'Learning the lifts' },
  { archetypeId: 'powerlifter', level: 2, name: 'Beginner', totalTU: 500, description: 'Building work capacity' },
  { archetypeId: 'powerlifter', level: 3, name: 'Intermediate', totalTU: 2000, description: 'Accumulating volume' },
  { archetypeId: 'powerlifter', level: 4, name: 'Advanced', totalTU: 5000, description: 'Peaking strategies' },
  { archetypeId: 'powerlifter', level: 5, name: 'Elite', totalTU: 10000, description: 'Competition lifter' },
  { archetypeId: 'crossfit', level: 1, name: 'Rookie', totalTU: 0, description: 'Learning movements' },
  { archetypeId: 'crossfit', level: 2, name: 'Scaled', totalTU: 500, description: 'Building capacity' },
  { archetypeId: 'crossfit', level: 3, name: 'Rx', totalTU: 2000, description: 'Standard workouts' },
  { archetypeId: 'crossfit', level: 4, name: 'Competitor', totalTU: 5000, description: 'Competition prep' },
  { archetypeId: 'crossfit', level: 5, name: 'Games Athlete', totalTU: 10000, description: 'Elite fitness' },
];

const levelStmt = db.prepare('INSERT OR REPLACE INTO archetype_levels (archetype_id, level, name, total_tu, description, muscle_targets) VALUES (?, ?, ?, ?, ?, ?)');
for (const l of levels) levelStmt.run(l.archetypeId, l.level, l.name, l.totalTU, l.description, '{}');
console.log(`✓ Inserted ${levels.length} levels`);

console.log('✅ Done!');
db.close();
