/**
 * Archetype Levels Seed Data
 *
 * Comprehensive level progression data for all 10 core archetypes.
 * Each archetype has 10 levels with:
 * - Archetype-specific level names (not generic)
 * - Progressive TU thresholds (0 to ~100,000)
 * - Motivational descriptions
 * - Priority muscle targets for that level
 *
 * Run with: pnpm -C apps/api db:seed
 */

import { db, initializePool, closePool } from '../client';

export interface ArchetypeLevelSeed {
  identityId: string;
  level: number;
  name: string;
  totalTU: number;
  description: string;
  muscleTargets: string[];
}

// ============================================
// BODYBUILDER LEVELS
// ============================================
const bodybuilderLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'bodybuilder',
    level: 1,
    name: 'Iron Initiate',
    totalTU: 0,
    description: 'Your journey to aesthetic excellence begins. Learn proper form and build the mind-muscle connection.',
    muscleTargets: ['chest-mid', 'lats', 'quads', 'biceps-long'],
  },
  {
    identityId: 'bodybuilder',
    level: 2,
    name: 'Pump Apprentice',
    totalTU: 1000,
    description: 'The pump is addictive. Your muscles are responding and the mirror is becoming your friend.',
    muscleTargets: ['chest-mid', 'chest-upper', 'lats', 'quads', 'biceps-long', 'triceps-long'],
  },
  {
    identityId: 'bodybuilder',
    level: 3,
    name: 'Hypertrophy Hunter',
    totalTU: 3000,
    description: 'You understand volume, intensity, and progressive overload. Time to chase serious gains.',
    muscleTargets: ['chest-mid', 'chest-upper', 'lats', 'delt-side', 'quads', 'hamstring-bicep', 'biceps-long', 'triceps-long'],
  },
  {
    identityId: 'bodybuilder',
    level: 4,
    name: 'Size Seeker',
    totalTU: 7000,
    description: 'People are noticing your transformation. Your dedication to the iron is paying dividends.',
    muscleTargets: ['chest-mid', 'chest-upper', 'chest-lower', 'lats', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'hamstring-bicep', 'biceps-long', 'biceps-short', 'triceps-long'],
  },
  {
    identityId: 'bodybuilder',
    level: 5,
    name: 'Aesthetic Architect',
    totalTU: 15000,
    description: 'You sculpt your physique with precision. Every rep, every set, every meal is calculated for maximum effect.',
    muscleTargets: ['chest-mid', 'chest-upper', 'lats', 'rhomboids', 'delt-side', 'quads', 'hamstring-bicep', 'glute-max', 'biceps-long', 'triceps-long', 'rectus-abdominis'],
  },
  {
    identityId: 'bodybuilder',
    level: 6,
    name: 'Mass Monster',
    totalTU: 25000,
    description: 'Your presence commands attention. The size and definition you have built is undeniable.',
    muscleTargets: ['chest-mid', 'chest-upper', 'chest-lower', 'lats', 'traps-mid', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'hamstring-bicep', 'glute-max', 'calves-gastrocnemius', 'biceps-long', 'triceps-long', 'rectus-abdominis'],
  },
  {
    identityId: 'bodybuilder',
    level: 7,
    name: 'Stage Ready',
    totalTU: 40000,
    description: 'Competition conditioning achieved. Your physique tells a story of years of dedication and sacrifice.',
    muscleTargets: ['chest-mid', 'chest-upper', 'lats', 'traps-upper', 'traps-mid', 'delt-side', 'quads', 'hamstring-bicep', 'glute-max', 'calves-gastrocnemius', 'biceps-long', 'triceps-long', 'rectus-abdominis', 'obliques'],
  },
  {
    identityId: 'bodybuilder',
    level: 8,
    name: 'Pro Card Holder',
    totalTU: 60000,
    description: 'You have earned your place among the elite. Your physique represents the pinnacle of natural development.',
    muscleTargets: ['chest-mid', 'chest-upper', 'chest-lower', 'lats', 'traps-upper', 'traps-mid', 'rhomboids', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'hamstring-bicep', 'glute-max', 'calves-gastrocnemius', 'biceps-long', 'biceps-short', 'triceps-long', 'triceps-lateral', 'rectus-abdominis', 'obliques'],
  },
  {
    identityId: 'bodybuilder',
    level: 9,
    name: 'Physique Legend',
    totalTU: 80000,
    description: 'Your name is spoken with reverence in gyms worldwide. You have transcended sport into art.',
    muscleTargets: ['chest-mid', 'chest-upper', 'chest-lower', 'lats', 'traps-upper', 'traps-mid', 'traps-lower', 'rhomboids', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'hamstring-bicep', 'glute-max', 'glute-med', 'calves-gastrocnemius', 'calves-soleus', 'biceps-long', 'biceps-short', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'rectus-abdominis', 'obliques', 'serratus'],
  },
  {
    identityId: 'bodybuilder',
    level: 10,
    name: 'Mr. Olympia',
    totalTU: 100000,
    description: 'You stand at the summit. A living testament to what the human body can achieve through iron will and relentless pursuit of perfection.',
    muscleTargets: ['chest-mid', 'chest-upper', 'chest-lower', 'lats', 'traps-upper', 'traps-mid', 'traps-lower', 'rhomboids', 'erector-spinae', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'hamstring-bicep', 'hamstring-semi', 'glute-max', 'glute-med', 'calves-gastrocnemius', 'calves-soleus', 'biceps-long', 'biceps-short', 'brachialis', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'forearm-flexors', 'forearm-extensors', 'rectus-abdominis', 'obliques', 'serratus'],
  },
];

// ============================================
// GYMNAST LEVELS
// ============================================
const gymnastLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'gymnast',
    level: 1,
    name: 'Floor Rookie',
    totalTU: 0,
    description: 'Welcome to the world of bodyweight mastery. Start with the fundamentals that will carry you to incredible feats.',
    muscleTargets: ['rectus-abdominis', 'delt-front', 'triceps-long', 'hip-flexors'],
  },
  {
    identityId: 'gymnast',
    level: 2,
    name: 'Hollow Body Student',
    totalTU: 1000,
    description: 'You have discovered the power of proper body positioning. The hollow body is your foundation.',
    muscleTargets: ['rectus-abdominis', 'transverse-abdominis', 'delt-front', 'triceps-long', 'hip-flexors', 'quads'],
  },
  {
    identityId: 'gymnast',
    level: 3,
    name: 'Support Specialist',
    totalTU: 3000,
    description: 'Ring support holds are becoming second nature. Your straight-arm strength is developing rapidly.',
    muscleTargets: ['rectus-abdominis', 'delt-front', 'triceps-long', 'chest-mid', 'lats', 'serratus'],
  },
  {
    identityId: 'gymnast',
    level: 4,
    name: 'Lever Learner',
    totalTU: 7000,
    description: 'Front levers and back levers are within reach. Your body has become your ultimate training tool.',
    muscleTargets: ['lats', 'rectus-abdominis', 'biceps-long', 'delt-front', 'delt-rear', 'glute-max'],
  },
  {
    identityId: 'gymnast',
    level: 5,
    name: 'Handstand Warrior',
    totalTU: 15000,
    description: 'The world looks different upside down. Your balance and pressing strength are exceptional.',
    muscleTargets: ['delt-front', 'delt-side', 'triceps-long', 'traps-upper', 'rectus-abdominis', 'serratus', 'forearm-extensors'],
  },
  {
    identityId: 'gymnast',
    level: 6,
    name: 'Planche Pioneer',
    totalTU: 25000,
    description: 'You defy gravity with your planche progressions. The impossible is becoming possible.',
    muscleTargets: ['delt-front', 'chest-mid', 'triceps-long', 'serratus', 'rectus-abdominis', 'hip-flexors', 'lats'],
  },
  {
    identityId: 'gymnast',
    level: 7,
    name: 'Ring Master',
    totalTU: 40000,
    description: 'The still rings are your domain. Iron cross, maltese, and muscle-ups flow with grace.',
    muscleTargets: ['lats', 'biceps-long', 'delt-front', 'delt-rear', 'chest-mid', 'chest-lower', 'triceps-long', 'rectus-abdominis', 'serratus'],
  },
  {
    identityId: 'gymnast',
    level: 8,
    name: 'Iron Cross Holder',
    totalTU: 60000,
    description: 'You hold the iron cross with authority. Your straight-arm strength is elite.',
    muscleTargets: ['lats', 'biceps-long', 'brachialis', 'delt-front', 'delt-side', 'chest-mid', 'chest-upper', 'triceps-long', 'rectus-abdominis', 'serratus', 'forearm-flexors'],
  },
  {
    identityId: 'gymnast',
    level: 9,
    name: 'Apparatus Virtuoso',
    totalTU: 80000,
    description: 'Every apparatus bends to your will. Your skills span floor, rings, bars, and beyond.',
    muscleTargets: ['lats', 'biceps-long', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'chest-mid', 'chest-upper', 'triceps-long', 'triceps-lateral', 'rectus-abdominis', 'obliques', 'serratus', 'hip-flexors', 'forearm-flexors'],
  },
  {
    identityId: 'gymnast',
    level: 10,
    name: 'Olympic Champion',
    totalTU: 100000,
    description: 'You have achieved what most believe impossible. Your body is a masterpiece of strength, control, and artistry.',
    muscleTargets: ['lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'rectus-abdominis', 'transverse-abdominis', 'obliques', 'serratus', 'hip-flexors', 'forearm-flexors', 'forearm-extensors', 'traps-upper', 'traps-mid'],
  },
];

// ============================================
// POWERLIFTER LEVELS
// ============================================
const powerlifterLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'powerlifter',
    level: 1,
    name: 'Garage Lifter',
    totalTU: 0,
    description: 'Every champion started somewhere. Learn the three lifts and build your base of strength.',
    muscleTargets: ['quads', 'glute-max', 'chest-mid', 'erector-spinae'],
  },
  {
    identityId: 'powerlifter',
    level: 2,
    name: 'Gym Rat',
    totalTU: 1000,
    description: 'The barbell is becoming your best friend. Your technique is improving with every session.',
    muscleTargets: ['quads', 'glute-max', 'hamstring-bicep', 'chest-mid', 'triceps-long', 'erector-spinae', 'lats'],
  },
  {
    identityId: 'powerlifter',
    level: 3,
    name: 'Meet Ready',
    totalTU: 3000,
    description: 'You are ready for your first competition. The platform awaits, and you are prepared.',
    muscleTargets: ['quads', 'glute-max', 'hamstring-bicep', 'chest-mid', 'chest-upper', 'triceps-long', 'delt-front', 'erector-spinae', 'lats'],
  },
  {
    identityId: 'powerlifter',
    level: 4,
    name: 'Local Champion',
    totalTU: 7000,
    description: 'You dominate local meets. Your total keeps climbing as you refine your craft.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'chest-mid', 'chest-upper', 'triceps-long', 'delt-front', 'erector-spinae', 'lats', 'traps-mid'],
  },
  {
    identityId: 'powerlifter',
    level: 5,
    name: 'State Record Holder',
    totalTU: 15000,
    description: 'Your name is on the record boards. Competitors know to bring their best when you step on the platform.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'chest-mid', 'chest-upper', 'triceps-long', 'triceps-lateral', 'delt-front', 'erector-spinae', 'lats', 'traps-mid', 'rhomboids'],
  },
  {
    identityId: 'powerlifter',
    level: 6,
    name: 'Platform Pro',
    totalTU: 25000,
    description: 'You compete at the national level. Every lift is a calculated effort toward your ultimate total.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'delt-front', 'delt-rear', 'erector-spinae', 'lats', 'traps-mid', 'traps-upper', 'rhomboids'],
  },
  {
    identityId: 'powerlifter',
    level: 7,
    name: 'National Champion',
    totalTU: 40000,
    description: 'You stand atop the national podium. Your strength has earned respect across the country.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'delt-front', 'delt-rear', 'erector-spinae', 'lats', 'traps-mid', 'traps-upper', 'rhomboids', 'forearm-flexors'],
  },
  {
    identityId: 'powerlifter',
    level: 8,
    name: 'International Competitor',
    totalTU: 60000,
    description: 'You represent your country on the world stage. The best in the world know your name.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'adductor-longus', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'delt-front', 'delt-rear', 'erector-spinae', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'forearm-flexors'],
  },
  {
    identityId: 'powerlifter',
    level: 9,
    name: 'Elite Totaler',
    totalTU: 80000,
    description: 'Your total places you among the all-time greats. Records fall when you compete.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'adductor-longus', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'delt-front', 'delt-side', 'delt-rear', 'erector-spinae', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'forearm-flexors', 'rectus-abdominis'],
  },
  {
    identityId: 'powerlifter',
    level: 10,
    name: 'World Record Holder',
    totalTU: 100000,
    description: 'You have redefined what is possible. Your lifts will inspire generations of powerlifters to come.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'adductor-longus', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'delt-front', 'delt-side', 'delt-rear', 'erector-spinae', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'teres-major', 'forearm-flexors', 'forearm-extensors', 'rectus-abdominis', 'obliques'],
  },
];

// ============================================
// CROSSFIT LEVELS
// ============================================
const crossfitLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'crossfit',
    level: 1,
    name: 'Box Newbie',
    totalTU: 0,
    description: 'Welcome to the box. The whiteboard is your new scoreboard, and the community is your new family.',
    muscleTargets: ['quads', 'glute-max', 'delt-front', 'lats'],
  },
  {
    identityId: 'crossfit',
    level: 2,
    name: 'Scaled Athlete',
    totalTU: 1000,
    description: 'You are learning to scale appropriately. Every workout is a step toward your best self.',
    muscleTargets: ['quads', 'glute-max', 'hamstring-bicep', 'delt-front', 'lats', 'chest-mid', 'triceps-long'],
  },
  {
    identityId: 'crossfit',
    level: 3,
    name: 'Rx Warrior',
    totalTU: 3000,
    description: 'You attack workouts as prescribed. The standards are your standards now.',
    muscleTargets: ['quads', 'glute-max', 'hamstring-bicep', 'delt-front', 'delt-side', 'lats', 'chest-mid', 'triceps-long', 'biceps-long', 'rectus-abdominis'],
  },
  {
    identityId: 'crossfit',
    level: 4,
    name: 'Metcon Machine',
    totalTU: 7000,
    description: 'Your engine is powerful. You thrive in the pain cave where others fade.',
    muscleTargets: ['quads', 'glute-max', 'hamstring-bicep', 'delt-front', 'delt-side', 'lats', 'chest-mid', 'chest-upper', 'triceps-long', 'biceps-long', 'rectus-abdominis', 'erector-spinae'],
  },
  {
    identityId: 'crossfit',
    level: 5,
    name: 'Competitor Class',
    totalTU: 15000,
    description: 'You train like a competitor. Every weakness is a target, every strength is a weapon.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'chest-mid', 'chest-upper', 'triceps-long', 'biceps-long', 'rectus-abdominis', 'obliques', 'erector-spinae', 'forearm-flexors'],
  },
  {
    identityId: 'crossfit',
    level: 6,
    name: 'Regionals Qualifier',
    totalTU: 25000,
    description: 'You have qualified for the big stage. Your fitness spans all ten domains.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-mid', 'chest-mid', 'chest-upper', 'triceps-long', 'triceps-lateral', 'biceps-long', 'rectus-abdominis', 'obliques', 'erector-spinae', 'forearm-flexors', 'hip-flexors'],
  },
  {
    identityId: 'crossfit',
    level: 7,
    name: 'Semifinalist',
    totalTU: 40000,
    description: 'You compete among the fittest on earth. Your preparation leaves nothing to chance.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-mid', 'traps-upper', 'chest-mid', 'chest-upper', 'triceps-long', 'triceps-lateral', 'biceps-long', 'brachialis', 'rectus-abdominis', 'obliques', 'erector-spinae', 'forearm-flexors', 'hip-flexors', 'serratus'],
  },
  {
    identityId: 'crossfit',
    level: 8,
    name: 'Games Athlete',
    totalTU: 60000,
    description: 'Madison awaits. You are among the fittest 40 men and women on the planet.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-mid', 'traps-upper', 'rhomboids', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'biceps-long', 'brachialis', 'rectus-abdominis', 'transverse-abdominis', 'obliques', 'erector-spinae', 'forearm-flexors', 'hip-flexors', 'serratus'],
  },
  {
    identityId: 'crossfit',
    level: 9,
    name: 'Podium Finisher',
    totalTU: 80000,
    description: 'You stand on the Games podium. Your name is etched in CrossFit history.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'adductor-magnus', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'biceps-long', 'biceps-short', 'brachialis', 'rectus-abdominis', 'transverse-abdominis', 'obliques', 'erector-spinae', 'forearm-flexors', 'hip-flexors', 'serratus'],
  },
  {
    identityId: 'crossfit',
    level: 10,
    name: 'Fittest on Earth',
    totalTU: 100000,
    description: 'The title says it all. You are the fittest human being on the planet. A complete athlete in every sense.',
    muscleTargets: ['quads', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'adductor-magnus', 'adductor-longus', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'teres-major', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'biceps-long', 'biceps-short', 'brachialis', 'rectus-abdominis', 'transverse-abdominis', 'obliques', 'erector-spinae', 'forearm-flexors', 'forearm-extensors', 'hip-flexors', 'serratus'],
  },
];

// ============================================
// MARTIAL ARTIST LEVELS
// ============================================
const martialArtistLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'martial-artist',
    level: 1,
    name: 'White Belt',
    totalTU: 0,
    description: 'Every master was once a disaster. Begin your journey with humility and eagerness to learn.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'glute-max', 'hip-flexors'],
  },
  {
    identityId: 'martial-artist',
    level: 2,
    name: 'Disciplined Student',
    totalTU: 1000,
    description: 'You understand that strength serves technique. Your conditioning supports your art.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'glute-max', 'glute-med', 'hip-flexors', 'quads', 'delt-front'],
  },
  {
    identityId: 'martial-artist',
    level: 3,
    name: 'Explosive Trainee',
    totalTU: 3000,
    description: 'Your rotational power is developing. Kicks and punches carry more force.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'glute-max', 'glute-med', 'hip-flexors', 'quads', 'hamstring-bicep', 'delt-front', 'delt-rear', 'lats'],
  },
  {
    identityId: 'martial-artist',
    level: 4,
    name: 'Combat Conditioned',
    totalTU: 7000,
    description: 'Your body can endure rounds of intense combat. Recovery between exchanges is rapid.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'glute-max', 'glute-med', 'hip-flexors', 'quads', 'hamstring-bicep', 'calves-gastrocnemius', 'delt-front', 'delt-rear', 'lats', 'chest-mid'],
  },
  {
    identityId: 'martial-artist',
    level: 5,
    name: 'Tournament Fighter',
    totalTU: 15000,
    description: 'You compete with confidence. Your physical preparation matches your technical skill.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'glute-max', 'glute-med', 'adductor-magnus', 'hip-flexors', 'quads', 'hamstring-bicep', 'calves-gastrocnemius', 'delt-front', 'delt-rear', 'lats', 'traps-upper', 'chest-mid', 'triceps-long', 'biceps-long'],
  },
  {
    identityId: 'martial-artist',
    level: 6,
    name: 'Striking Specialist',
    totalTU: 25000,
    description: 'Your strikes are devastating. Hip rotation and core stability transfer maximum power.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'glute-max', 'glute-med', 'adductor-magnus', 'hip-flexors', 'quads', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'delt-front', 'delt-rear', 'lats', 'traps-upper', 'chest-mid', 'chest-upper', 'triceps-long', 'biceps-long', 'forearm-flexors'],
  },
  {
    identityId: 'martial-artist',
    level: 7,
    name: 'National Champion',
    totalTU: 40000,
    description: 'You dominate at the national level. Your conditioning outlasts every opponent.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'glute-max', 'glute-med', 'adductor-magnus', 'adductor-longus', 'hip-flexors', 'quads', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-upper', 'traps-mid', 'chest-mid', 'chest-upper', 'triceps-long', 'biceps-long', 'brachialis', 'forearm-flexors'],
  },
  {
    identityId: 'martial-artist',
    level: 8,
    name: 'World Class Warrior',
    totalTU: 60000,
    description: 'You compete at the world level. Your athletic foundation is the envy of competitors.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'glute-max', 'glute-med', 'adductor-magnus', 'adductor-longus', 'hip-flexors', 'quads', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-upper', 'traps-mid', 'rhomboids', 'chest-mid', 'chest-upper', 'triceps-long', 'triceps-lateral', 'biceps-long', 'brachialis', 'forearm-flexors', 'forearm-extensors', 'serratus'],
  },
  {
    identityId: 'martial-artist',
    level: 9,
    name: 'Living Weapon',
    totalTU: 80000,
    description: 'Your body is a finely tuned instrument of combat. Every movement is optimized for destruction.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'adductor-magnus', 'adductor-longus', 'hip-flexors', 'quads', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-upper', 'traps-mid', 'traps-lower', 'rhomboids', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'biceps-long', 'biceps-short', 'brachialis', 'forearm-flexors', 'forearm-extensors', 'serratus'],
  },
  {
    identityId: 'martial-artist',
    level: 10,
    name: 'Grandmaster',
    totalTU: 100000,
    description: 'You have transcended athletic achievement. Your physical mastery is matched only by your martial wisdom.',
    muscleTargets: ['rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'adductor-magnus', 'adductor-longus', 'gracilis', 'hip-flexors', 'quads', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'delt-front', 'delt-side', 'delt-rear', 'lats', 'traps-upper', 'traps-mid', 'traps-lower', 'rhomboids', 'teres-major', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'biceps-long', 'biceps-short', 'brachialis', 'forearm-flexors', 'forearm-extensors', 'serratus'],
  },
];

// ============================================
// RUNNER LEVELS
// ============================================
const runnerLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'runner',
    level: 1,
    name: 'First Steps',
    totalTU: 0,
    description: 'Every mile begins with a single step. Build your base and discover the joy of running.',
    muscleTargets: ['glute-max', 'quads', 'calves-gastrocnemius', 'hamstring-bicep'],
  },
  {
    identityId: 'runner',
    level: 2,
    name: 'Consistent Jogger',
    totalTU: 1000,
    description: 'You run regularly. Your body is adapting to the demands of endurance.',
    muscleTargets: ['glute-max', 'glute-med', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'rectus-abdominis'],
  },
  {
    identityId: 'runner',
    level: 3,
    name: 'Local Racer',
    totalTU: 3000,
    description: 'You compete in local races. Your training has structure and purpose.',
    muscleTargets: ['glute-max', 'glute-med', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'rectus-abdominis', 'hip-flexors'],
  },
  {
    identityId: 'runner',
    level: 4,
    name: 'Half Marathoner',
    totalTU: 7000,
    description: 'You have conquered 13.1 miles. Your endurance foundation is solid.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'rectus-abdominis', 'hip-flexors', 'erector-spinae'],
  },
  {
    identityId: 'runner',
    level: 5,
    name: 'Marathon Finisher',
    totalTU: 15000,
    description: 'You have completed 26.2 miles. You know the wall and how to push through it.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'adductor-magnus', 'rectus-abdominis', 'obliques', 'hip-flexors', 'erector-spinae'],
  },
  {
    identityId: 'runner',
    level: 6,
    name: 'Boston Qualifier',
    totalTU: 25000,
    description: 'Your times earn you a spot at the most prestigious marathon in America.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'adductor-magnus', 'adductor-longus', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'erector-spinae'],
  },
  {
    identityId: 'runner',
    level: 7,
    name: 'Ultra Runner',
    totalTU: 40000,
    description: 'Marathons are just warm-ups. You tackle 50Ks, 50-milers, and beyond.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'adductor-magnus', 'adductor-longus', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'erector-spinae', 'delt-rear', 'traps-mid'],
  },
  {
    identityId: 'runner',
    level: 8,
    name: 'Elite Racer',
    totalTU: 60000,
    description: 'You compete at elite level events. Your VO2 max and lactate threshold are exceptional.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'peroneus', 'adductor-magnus', 'adductor-longus', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'erector-spinae', 'delt-rear', 'traps-mid', 'lats'],
  },
  {
    identityId: 'runner',
    level: 9,
    name: '100-Miler',
    totalTU: 80000,
    description: 'You have completed a hundred-mile race. Your mental and physical fortitude is legendary.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'peroneus', 'adductor-magnus', 'adductor-longus', 'gracilis', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'erector-spinae', 'delt-rear', 'traps-mid', 'traps-lower', 'lats', 'rhomboids'],
  },
  {
    identityId: 'runner',
    level: 10,
    name: 'Running Legend',
    totalTU: 100000,
    description: 'Your achievements will be remembered for generations. You have pushed the limits of human endurance.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'quads', 'calves-gastrocnemius', 'calves-soleus', 'hamstring-bicep', 'hamstring-semi', 'tibialis-anterior', 'peroneus', 'adductor-magnus', 'adductor-longus', 'gracilis', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'erector-spinae', 'delt-front', 'delt-rear', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'biceps-long', 'triceps-long'],
  },
];

// ============================================
// CLIMBER LEVELS
// ============================================
const climberLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'climber',
    level: 1,
    name: 'Gym Crawler',
    totalTU: 0,
    description: 'Welcome to vertical world. Learn the basics of movement and build your base grip strength.',
    muscleTargets: ['forearm-flexors', 'lats', 'biceps-long'],
  },
  {
    identityId: 'climber',
    level: 2,
    name: 'Beginner Boulderer',
    totalTU: 1000,
    description: 'You are tackling V1s and V2s. Your finger strength is building rapidly.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'rectus-abdominis'],
  },
  {
    identityId: 'climber',
    level: 3,
    name: 'Lead Learner',
    totalTU: 3000,
    description: 'Sport climbing has captured your heart. You understand pacing and resting on the wall.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'delt-rear', 'rectus-abdominis', 'obliques'],
  },
  {
    identityId: 'climber',
    level: 4,
    name: 'Outdoor Warrior',
    totalTU: 7000,
    description: 'Real rock is your canvas. You read routes and commit to moves with confidence.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'traps-mid', 'rectus-abdominis', 'obliques', 'hip-flexors'],
  },
  {
    identityId: 'climber',
    level: 5,
    name: 'Project Crusher',
    totalTU: 15000,
    description: 'You work projects that test your limits. V6 and 5.12 are your hunting grounds.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'delt-front', 'traps-mid', 'traps-lower', 'rectus-abdominis', 'obliques', 'hip-flexors', 'rhomboids'],
  },
  {
    identityId: 'climber',
    level: 6,
    name: 'Comp Climber',
    totalTU: 25000,
    description: 'You compete in climbing competitions. Your reading ability and power are exceptional.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'delt-front', 'delt-side', 'traps-mid', 'traps-lower', 'teres-major', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'rhomboids'],
  },
  {
    identityId: 'climber',
    level: 7,
    name: 'Double Digit Sender',
    totalTU: 40000,
    description: 'V10 and 5.14 are your regular sends. Your finger strength is world-class.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'delt-front', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'teres-major', 'chest-mid', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'rhomboids', 'serratus'],
  },
  {
    identityId: 'climber',
    level: 8,
    name: 'World Cup Finalist',
    totalTU: 60000,
    description: 'You compete on the world stage. Your climbing represents the pinnacle of the sport.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'delt-front', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'teres-major', 'chest-mid', 'chest-upper', 'triceps-long', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'glute-max', 'rhomboids', 'serratus'],
  },
  {
    identityId: 'climber',
    level: 9,
    name: 'First Ascensionist',
    totalTU: 80000,
    description: 'You establish new routes that push the boundaries of what is possible on rock.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'delt-front', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'teres-major', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'glute-max', 'glute-med', 'hamstring-bicep', 'rhomboids', 'serratus', 'erector-spinae'],
  },
  {
    identityId: 'climber',
    level: 10,
    name: 'Climbing Icon',
    totalTU: 100000,
    description: 'Your name defines an era. V16 and 5.15 witness your mastery. You have redefined human potential on rock.',
    muscleTargets: ['forearm-flexors', 'forearm-extensors', 'lats', 'biceps-long', 'biceps-short', 'brachialis', 'delt-rear', 'delt-front', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'teres-major', 'teres-minor', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'hip-flexors', 'glute-max', 'glute-med', 'hamstring-bicep', 'calves-gastrocnemius', 'rhomboids', 'serratus', 'erector-spinae', 'rotator-cuff'],
  },
];

// ============================================
// STRONGMAN LEVELS
// ============================================
const strongmanLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'strongman',
    level: 1,
    name: 'Curious Lifter',
    totalTU: 0,
    description: 'Stones, logs, and kegs call to you. Discover the primal joy of moving heavy, awkward objects.',
    muscleTargets: ['erector-spinae', 'glute-max', 'traps-upper', 'forearm-flexors'],
  },
  {
    identityId: 'strongman',
    level: 2,
    name: 'Odd Object Explorer',
    totalTU: 1000,
    description: 'Atlas stones and farmer carries are becoming familiar. Your grip is getting serious.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'traps-upper', 'traps-mid', 'forearm-flexors', 'biceps-long', 'delt-front'],
  },
  {
    identityId: 'strongman',
    level: 3,
    name: 'Local Strongman',
    totalTU: 3000,
    description: 'You compete in local shows. Your work capacity for heavy events is building.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'hamstring-bicep', 'traps-upper', 'traps-mid', 'lats', 'forearm-flexors', 'biceps-long', 'delt-front', 'delt-side', 'quads'],
  },
  {
    identityId: 'strongman',
    level: 4,
    name: 'State Competitor',
    totalTU: 7000,
    description: 'You dominate state-level competitions. Every event is an opportunity to demonstrate raw power.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'lats', 'rhomboids', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'brachialis', 'delt-front', 'delt-side', 'quads', 'rectus-abdominis'],
  },
  {
    identityId: 'strongman',
    level: 5,
    name: 'Regional Champion',
    totalTU: 15000,
    description: 'You are known across your region. Your stone loading and carry strength are exceptional.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'rectus-abdominis', 'obliques'],
  },
  {
    identityId: 'strongman',
    level: 6,
    name: 'National Qualifier',
    totalTU: 25000,
    description: 'You qualify for national-level competition. Your strength across all events is complete.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'teres-major', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'quads', 'adductor-magnus', 'rectus-abdominis', 'obliques', 'transverse-abdominis'],
  },
  {
    identityId: 'strongman',
    level: 7,
    name: 'Pro Card Holder',
    totalTU: 40000,
    description: 'You have earned your pro card. The heaviest implements on earth bow to your strength.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'teres-major', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'chest-mid', 'chest-upper', 'triceps-long', 'quads', 'adductor-magnus', 'calves-gastrocnemius', 'rectus-abdominis', 'obliques', 'transverse-abdominis'],
  },
  {
    identityId: 'strongman',
    level: 8,
    name: 'Giants Live Competitor',
    totalTU: 60000,
    description: 'You compete at the highest levels of the sport. Your name is known worldwide.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'teres-major', 'teres-minor', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'quads', 'adductor-magnus', 'adductor-longus', 'calves-gastrocnemius', 'calves-soleus', 'rectus-abdominis', 'obliques', 'transverse-abdominis'],
  },
  {
    identityId: 'strongman',
    level: 9,
    name: 'WSM Finalist',
    totalTU: 80000,
    description: 'You compete at World\'s Strongest Man. You stand among the true giants of strength.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'teres-major', 'teres-minor', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'quads', 'adductor-magnus', 'adductor-longus', 'calves-gastrocnemius', 'calves-soleus', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'serratus'],
  },
  {
    identityId: 'strongman',
    level: 10,
    name: 'World\'s Strongest',
    totalTU: 100000,
    description: 'The title says it all. You have lifted more, carried more, and endured more than any human alive. A living legend.',
    muscleTargets: ['erector-spinae', 'glute-max', 'glute-med', 'glute-min', 'hamstring-bicep', 'hamstring-semi', 'traps-upper', 'traps-mid', 'traps-lower', 'lats', 'rhomboids', 'teres-major', 'teres-minor', 'rotator-cuff', 'forearm-flexors', 'forearm-extensors', 'biceps-long', 'biceps-short', 'brachialis', 'delt-front', 'delt-side', 'delt-rear', 'chest-mid', 'chest-upper', 'chest-lower', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'quads', 'adductor-magnus', 'adductor-longus', 'gracilis', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'serratus', 'hip-flexors'],
  },
];

// ============================================
// FUNCTIONAL ATHLETE LEVELS
// ============================================
const functionalLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'functional',
    level: 1,
    name: 'Movement Beginner',
    totalTU: 0,
    description: 'Train to live better. Start building the foundation for a strong, mobile, capable body.',
    muscleTargets: ['glute-max', 'rectus-abdominis', 'quads', 'lats'],
  },
  {
    identityId: 'functional',
    level: 2,
    name: 'Pattern Learner',
    totalTU: 1000,
    description: 'You are mastering the fundamental movement patterns. Squat, hinge, push, pull, carry.',
    muscleTargets: ['glute-max', 'glute-med', 'rectus-abdominis', 'quads', 'hamstring-bicep', 'lats', 'chest-mid', 'delt-front'],
  },
  {
    identityId: 'functional',
    level: 3,
    name: 'Mobility Advocate',
    totalTU: 3000,
    description: 'Your range of motion is improving. You move with intention and control.',
    muscleTargets: ['glute-max', 'glute-med', 'rectus-abdominis', 'obliques', 'quads', 'hamstring-bicep', 'hip-flexors', 'lats', 'chest-mid', 'delt-front', 'delt-rear', 'erector-spinae'],
  },
  {
    identityId: 'functional',
    level: 4,
    name: 'Balanced Athlete',
    totalTU: 7000,
    description: 'Your training addresses all aspects of fitness. Strength, endurance, mobility, stability.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hip-flexors', 'calves-gastrocnemius', 'lats', 'traps-mid', 'chest-mid', 'delt-front', 'delt-rear', 'triceps-long', 'biceps-long', 'erector-spinae'],
  },
  {
    identityId: 'functional',
    level: 5,
    name: 'Life Performer',
    totalTU: 15000,
    description: 'You excel in daily life. Lifting groceries, playing with kids, hiking mountains - nothing stops you.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hamstring-semi', 'hip-flexors', 'calves-gastrocnemius', 'calves-soleus', 'lats', 'traps-mid', 'traps-upper', 'chest-mid', 'chest-upper', 'delt-front', 'delt-side', 'delt-rear', 'triceps-long', 'biceps-long', 'erector-spinae', 'forearm-flexors'],
  },
  {
    identityId: 'functional',
    level: 6,
    name: 'Wellness Warrior',
    totalTU: 25000,
    description: 'Your fitness supports longevity. You train smart, recover well, and continue to improve.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hamstring-semi', 'hip-flexors', 'adductor-magnus', 'calves-gastrocnemius', 'calves-soleus', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'chest-mid', 'chest-upper', 'delt-front', 'delt-side', 'delt-rear', 'triceps-long', 'triceps-lateral', 'biceps-long', 'erector-spinae', 'forearm-flexors'],
  },
  {
    identityId: 'functional',
    level: 7,
    name: 'Capacity King',
    totalTU: 40000,
    description: 'Your physical capacity is exceptional. You can do more, for longer, with less fatigue.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hamstring-semi', 'hip-flexors', 'adductor-magnus', 'adductor-longus', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'chest-mid', 'chest-upper', 'delt-front', 'delt-side', 'delt-rear', 'triceps-long', 'triceps-lateral', 'biceps-long', 'brachialis', 'erector-spinae', 'forearm-flexors', 'forearm-extensors', 'serratus'],
  },
  {
    identityId: 'functional',
    level: 8,
    name: 'Resilient Human',
    totalTU: 60000,
    description: 'Injury-resistant and adaptable. Your body handles any challenge life throws at you.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hamstring-semi', 'hip-flexors', 'adductor-magnus', 'adductor-longus', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'teres-major', 'chest-mid', 'chest-upper', 'chest-lower', 'delt-front', 'delt-side', 'delt-rear', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'biceps-long', 'biceps-short', 'brachialis', 'erector-spinae', 'forearm-flexors', 'forearm-extensors', 'serratus', 'rotator-cuff'],
  },
  {
    identityId: 'functional',
    level: 9,
    name: 'Movement Master',
    totalTU: 80000,
    description: 'Your movement quality inspires others. You are the blueprint for functional fitness.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hamstring-semi', 'hip-flexors', 'adductor-magnus', 'adductor-longus', 'gracilis', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'peroneus', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'teres-major', 'teres-minor', 'chest-mid', 'chest-upper', 'chest-lower', 'delt-front', 'delt-side', 'delt-rear', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'biceps-long', 'biceps-short', 'brachialis', 'erector-spinae', 'forearm-flexors', 'forearm-extensors', 'serratus', 'rotator-cuff'],
  },
  {
    identityId: 'functional',
    level: 10,
    name: 'Human Potential',
    totalTU: 100000,
    description: 'You represent the full potential of the human body. Strong, mobile, capable, and resilient. A model for all ages.',
    muscleTargets: ['glute-max', 'glute-med', 'glute-min', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'quads', 'hamstring-bicep', 'hamstring-semi', 'hip-flexors', 'adductor-magnus', 'adductor-longus', 'gracilis', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'peroneus', 'lats', 'traps-mid', 'traps-upper', 'traps-lower', 'rhomboids', 'teres-major', 'teres-minor', 'chest-mid', 'chest-upper', 'chest-lower', 'delt-front', 'delt-side', 'delt-rear', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'biceps-long', 'biceps-short', 'brachialis', 'erector-spinae', 'forearm-flexors', 'forearm-extensors', 'serratus', 'rotator-cuff', 'levator-scapulae'],
  },
];

// ============================================
// SWIMMER LEVELS
// ============================================
const swimmerLevels: ArchetypeLevelSeed[] = [
  {
    identityId: 'swimmer',
    level: 1,
    name: 'Lane Learner',
    totalTU: 0,
    description: 'The pool is your new domain. Build the foundation of strength that will propel you through water.',
    muscleTargets: ['lats', 'delt-front', 'delt-rear', 'rectus-abdominis'],
  },
  {
    identityId: 'swimmer',
    level: 2,
    name: 'Stroke Student',
    totalTU: 1000,
    description: 'Your technique is improving. Dryland training supports your time in the pool.',
    muscleTargets: ['lats', 'delt-front', 'delt-rear', 'delt-side', 'rectus-abdominis', 'obliques', 'triceps-long', 'chest-mid'],
  },
  {
    identityId: 'swimmer',
    level: 3,
    name: 'Club Competitor',
    totalTU: 3000,
    description: 'You compete at club level. Your pull power and core stability are developing.',
    muscleTargets: ['lats', 'delt-front', 'delt-rear', 'delt-side', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'triceps-long', 'chest-mid', 'chest-upper', 'biceps-long', 'hip-flexors'],
  },
  {
    identityId: 'swimmer',
    level: 4,
    name: 'Regional Racer',
    totalTU: 7000,
    description: 'Your times earn recognition at regional meets. Your catch and pull are powerful.',
    muscleTargets: ['lats', 'teres-major', 'delt-front', 'delt-rear', 'delt-side', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'triceps-long', 'triceps-lateral', 'chest-mid', 'chest-upper', 'biceps-long', 'hip-flexors', 'glute-max', 'quads'],
  },
  {
    identityId: 'swimmer',
    level: 5,
    name: 'State Qualifier',
    totalTU: 15000,
    description: 'You compete at state championships. Your underwater work and turns are dialed.',
    muscleTargets: ['lats', 'teres-major', 'teres-minor', 'delt-front', 'delt-rear', 'delt-side', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'triceps-long', 'triceps-lateral', 'chest-mid', 'chest-upper', 'chest-lower', 'biceps-long', 'biceps-short', 'hip-flexors', 'glute-max', 'glute-med', 'quads', 'hamstring-bicep'],
  },
  {
    identityId: 'swimmer',
    level: 6,
    name: 'National Swimmer',
    totalTU: 25000,
    description: 'You compete at nationals. Your power output rivals the best in the country.',
    muscleTargets: ['lats', 'teres-major', 'teres-minor', 'rhomboids', 'delt-front', 'delt-rear', 'delt-side', 'traps-mid', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'chest-mid', 'chest-upper', 'chest-lower', 'biceps-long', 'biceps-short', 'brachialis', 'hip-flexors', 'glute-max', 'glute-med', 'quads', 'hamstring-bicep', 'calves-gastrocnemius'],
  },
  {
    identityId: 'swimmer',
    level: 7,
    name: 'Olympic Trials Qualifier',
    totalTU: 40000,
    description: 'You have earned a spot at Olympic Trials. Your dryland strength is elite.',
    muscleTargets: ['lats', 'teres-major', 'teres-minor', 'rhomboids', 'delt-front', 'delt-rear', 'delt-side', 'traps-mid', 'traps-lower', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'chest-mid', 'chest-upper', 'chest-lower', 'biceps-long', 'biceps-short', 'brachialis', 'hip-flexors', 'glute-max', 'glute-med', 'quads', 'hamstring-bicep', 'hamstring-semi', 'calves-gastrocnemius', 'calves-soleus'],
  },
  {
    identityId: 'swimmer',
    level: 8,
    name: 'Olympic Team Member',
    totalTU: 60000,
    description: 'You represent your country at the Olympics. Your fitness spans every aspect of swimming performance.',
    muscleTargets: ['lats', 'teres-major', 'teres-minor', 'rhomboids', 'delt-front', 'delt-rear', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'serratus', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'chest-mid', 'chest-upper', 'chest-lower', 'biceps-long', 'biceps-short', 'brachialis', 'forearm-flexors', 'hip-flexors', 'glute-max', 'glute-med', 'glute-min', 'quads', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'calves-gastrocnemius', 'calves-soleus'],
  },
  {
    identityId: 'swimmer',
    level: 9,
    name: 'Olympic Medalist',
    totalTU: 80000,
    description: 'You stand on the Olympic podium. Your name joins swimming immortality.',
    muscleTargets: ['lats', 'teres-major', 'teres-minor', 'rhomboids', 'delt-front', 'delt-rear', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'serratus', 'rotator-cuff', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'chest-mid', 'chest-upper', 'chest-lower', 'biceps-long', 'biceps-short', 'brachialis', 'forearm-flexors', 'forearm-extensors', 'hip-flexors', 'glute-max', 'glute-med', 'glute-min', 'quads', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'adductor-longus', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior'],
  },
  {
    identityId: 'swimmer',
    level: 10,
    name: 'World Record Holder',
    totalTU: 100000,
    description: 'You have swum faster than any human in history. Your legacy will inspire generations of swimmers.',
    muscleTargets: ['lats', 'teres-major', 'teres-minor', 'rhomboids', 'delt-front', 'delt-rear', 'delt-side', 'traps-mid', 'traps-lower', 'traps-upper', 'rectus-abdominis', 'obliques', 'transverse-abdominis', 'erector-spinae', 'serratus', 'rotator-cuff', 'levator-scapulae', 'triceps-long', 'triceps-lateral', 'triceps-medial', 'chest-mid', 'chest-upper', 'chest-lower', 'biceps-long', 'biceps-short', 'brachialis', 'forearm-flexors', 'forearm-extensors', 'hip-flexors', 'glute-max', 'glute-med', 'glute-min', 'quads', 'hamstring-bicep', 'hamstring-semi', 'adductor-magnus', 'adductor-longus', 'gracilis', 'calves-gastrocnemius', 'calves-soleus', 'tibialis-anterior', 'peroneus'],
  },
];

// ============================================
// COMBINED EXPORT
// ============================================
export const allArchetypeLevels: ArchetypeLevelSeed[] = [
  ...bodybuilderLevels,
  ...gymnastLevels,
  ...powerlifterLevels,
  ...crossfitLevels,
  ...martialArtistLevels,
  ...runnerLevels,
  ...climberLevels,
  ...strongmanLevels,
  ...functionalLevels,
  ...swimmerLevels,
];

/**
 * Seed archetype levels into the database
 * Uses ON CONFLICT to upsert (update existing or insert new)
 */
export async function seedArchetypeLevels(): Promise<void> {
  console.log('🎮 Seeding archetype levels...');

  let insertedCount = 0;
  let errorCount = 0;

  for (const level of allArchetypeLevels) {
    try {
      // Use the new table name (identity_levels) with column (identity_id)
      await db.query(
        `
        INSERT INTO identity_levels (identity_id, level, name, total_tu, description, muscle_targets)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (identity_id, level) DO UPDATE SET
          name = EXCLUDED.name,
          total_tu = EXCLUDED.total_tu,
          description = EXCLUDED.description,
          muscle_targets = EXCLUDED.muscle_targets
      `,
        [
          level.identityId,
          level.level,
          level.name,
          level.totalTU,
          level.description,
          JSON.stringify(level.muscleTargets),
        ]
      );
      insertedCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to insert level for ${level.identityId} level ${level.level}:`, error);
    }
  }

  console.log(`✅ Inserted/updated ${insertedCount} archetype levels`);
  if (errorCount > 0) {
    console.log(`⚠️  Failed to insert ${errorCount} levels`);
  }
}

/**
 * Get all levels for a specific archetype
 */
export function getLevelsForArchetype(archetypeId: string): ArchetypeLevelSeed[] {
  return allArchetypeLevels.filter((l) => l.identityId === archetypeId);
}

/**
 * Get a specific level for an archetype
 */
export function getLevel(archetypeId: string, level: number): ArchetypeLevelSeed | undefined {
  return allArchetypeLevels.find((l) => l.identityId === archetypeId && l.level === level);
}

/**
 * Get the level for a given TU amount
 */
export function getLevelForTU(archetypeId: string, totalTU: number): ArchetypeLevelSeed | undefined {
  const levels = getLevelsForArchetype(archetypeId).sort((a, b) => b.totalTU - a.totalTU);
  return levels.find((l) => totalTU >= l.totalTU);
}

// Run if executed directly
if (require.main === module) {
  (async () => {
    try {
      await initializePool();
      await seedArchetypeLevels();
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
