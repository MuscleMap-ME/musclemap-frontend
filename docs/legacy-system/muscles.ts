/**
 * MuscleMap Complete Muscle Database
 * 
 * This is the core intellectual property - the bias weight system that normalizes
 * muscle activation display across 150+ muscles.
 * 
 * Formula: displayed_activation = raw_activation / bias_weight
 * 
 * Bias weights account for:
 * - Muscle size (larger muscles tolerate and require more volume)
 * - Recovery rate (fast-twitch vs slow-twitch dominant)
 * - Compound movement exposure (muscles hit incidentally in other exercises)
 * - Hypertrophy research (optimal weekly set ranges from literature)
 */

export interface Muscle {
  id: string;
  name: string;
  region: MuscleRegion;
  subregion: string;
  biasWeight: number;
  weeklySetRange: [number, number];
  recoveryHours: number;
  compoundExposure: CompoundExposure;
  rationale: string;
  meshId?: string; // For 3D model mapping
}

export type MuscleRegion = 
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'arms'
  | 'core'
  | 'hips'
  | 'legs';

export type CompoundExposure = 'very_high' | 'high' | 'medium' | 'low';

export const muscles: Record<string, Muscle> = {
  // ============================================
  // SHOULDERS & UPPER BACK
  // ============================================
  
  // Deltoids
  'SH-001': {
    id: 'SH-001',
    name: 'Anterior Deltoid (R)',
    region: 'shoulders',
    subregion: 'Deltoids',
    biasWeight: 1.6,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Heavy pressing exposure from bench and overhead work; moderate direct volume needed'
  },
  'SH-002': {
    id: 'SH-002',
    name: 'Anterior Deltoid (L)',
    region: 'shoulders',
    subregion: 'Deltoids',
    biasWeight: 1.6,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Heavy pressing exposure from bench and overhead work; moderate direct volume needed'
  },
  'SH-003': {
    id: 'SH-003',
    name: 'Lateral Deltoid (R)',
    region: 'shoulders',
    subregion: 'Deltoids',
    biasWeight: 1.8,
    weeklySetRange: [12, 20],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Less compound exposure; benefits from direct lateral raises; high volume tolerance'
  },
  'SH-004': {
    id: 'SH-004',
    name: 'Lateral Deltoid (L)',
    region: 'shoulders',
    subregion: 'Deltoids',
    biasWeight: 1.8,
    weeklySetRange: [12, 20],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Less compound exposure; benefits from direct lateral raises; high volume tolerance'
  },
  'SH-005': {
    id: 'SH-005',
    name: 'Posterior Deltoid (R)',
    region: 'shoulders',
    subregion: 'Deltoids',
    biasWeight: 1.4,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Hit by rows and pulling; still benefits from direct rear delt work'
  },
  'SH-006': {
    id: 'SH-006',
    name: 'Posterior Deltoid (L)',
    region: 'shoulders',
    subregion: 'Deltoids',
    biasWeight: 1.4,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Hit by rows and pulling; still benefits from direct rear delt work'
  },

  // Trapezius
  'SH-007': {
    id: 'SH-007',
    name: 'Trapezius (Upper)',
    region: 'shoulders',
    subregion: 'Trapezius',
    biasWeight: 1.6,
    weeklySetRange: [8, 14],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Hit by shrugs, deadlifts, rows, carries; minimal direct work needed'
  },
  'SH-008': {
    id: 'SH-008',
    name: 'Trapezius (Middle)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 1.4,
    weeklySetRange: [8, 14],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Engaged in most rowing movements'
  },
  'SH-009': {
    id: 'SH-009',
    name: 'Trapezius (Lower)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 1.3,
    weeklySetRange: [6, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Active in pulling movements; minimal isolation needed'
  },
  'SH-010': {
    id: 'SH-010',
    name: 'Levator Scapulae (R)',
    region: 'shoulders',
    subregion: 'Neck',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Small muscle; hit by shrugs and carries constantly'
  },
  'SH-011': {
    id: 'SH-011',
    name: 'Levator Scapulae (L)',
    region: 'shoulders',
    subregion: 'Neck',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Small muscle; hit by shrugs and carries constantly'
  },

  // Rhomboids
  'SH-012': {
    id: 'SH-012',
    name: 'Rhomboid Major (R)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 1.2,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Active in all rowing; rarely needs direct work'
  },
  'SH-013': {
    id: 'SH-013',
    name: 'Rhomboid Major (L)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 1.2,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Active in all rowing; rarely needs direct work'
  },
  'SH-014': {
    id: 'SH-014',
    name: 'Rhomboid Minor (R)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Small stabilizer; compound exposure sufficient'
  },
  'SH-015': {
    id: 'SH-015',
    name: 'Rhomboid Minor (L)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Small stabilizer; compound exposure sufficient'
  },

  // Rotator Cuff
  'SH-016': {
    id: 'SH-016',
    name: 'Supraspinatus (R)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.5,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Small rotator cuff; prehab focus over hypertrophy'
  },
  'SH-017': {
    id: 'SH-017',
    name: 'Supraspinatus (L)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.5,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Small rotator cuff; prehab focus over hypertrophy'
  },
  'SH-018': {
    id: 'SH-018',
    name: 'Infraspinatus (R)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Rotator cuff stabilizer; joint health priority'
  },
  'SH-019': {
    id: 'SH-019',
    name: 'Infraspinatus (L)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Rotator cuff stabilizer; joint health priority'
  },
  'SH-020': {
    id: 'SH-020',
    name: 'Teres Minor (R)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Tiny muscle; external rotation work for health'
  },
  'SH-021': {
    id: 'SH-021',
    name: 'Teres Minor (L)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Tiny muscle; external rotation work for health'
  },
  'SH-022': {
    id: 'SH-022',
    name: 'Subscapularis (R)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Deep rotator cuff; stability over size'
  },
  'SH-023': {
    id: 'SH-023',
    name: 'Subscapularis (L)',
    region: 'shoulders',
    subregion: 'Rotator Cuff',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Deep rotator cuff; stability over size'
  },

  // Teres Major
  'SH-024': {
    id: 'SH-024',
    name: 'Teres Major (R)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 1.3,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Lat synergist; benefits from pulling volume'
  },
  'SH-025': {
    id: 'SH-025',
    name: 'Teres Major (L)',
    region: 'back',
    subregion: 'Upper Back',
    biasWeight: 1.3,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Lat synergist; benefits from pulling volume'
  },

  // ============================================
  // CHEST
  // ============================================
  
  'CH-001': {
    id: 'CH-001',
    name: 'Pectoralis Major (Clavicular/Upper)',
    region: 'chest',
    subregion: 'Pectorals',
    biasWeight: 2.2,
    weeklySetRange: [12, 20],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Large muscle head; responds well to volume; key aesthetic muscle'
  },
  'CH-002': {
    id: 'CH-002',
    name: 'Pectoralis Major (Sternal/Mid)',
    region: 'chest',
    subregion: 'Pectorals',
    biasWeight: 2.4,
    weeklySetRange: [14, 22],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest chest portion; tolerates high volume; primary mover'
  },
  'CH-003': {
    id: 'CH-003',
    name: 'Pectoralis Major (Abdominal/Lower)',
    region: 'chest',
    subregion: 'Pectorals',
    biasWeight: 1.6,
    weeklySetRange: [8, 14],
    recoveryHours: 72,
    compoundExposure: 'medium',
    rationale: 'Lower fibers; less volume capacity than upper portions'
  },
  'CH-004': {
    id: 'CH-004',
    name: 'Pectoralis Minor (R)',
    region: 'chest',
    subregion: 'Deep Chest',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Deep muscle; compound exposure from pressing adequate'
  },
  'CH-005': {
    id: 'CH-005',
    name: 'Pectoralis Minor (L)',
    region: 'chest',
    subregion: 'Deep Chest',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Deep muscle; compound exposure from pressing adequate'
  },
  'CH-006': {
    id: 'CH-006',
    name: 'Serratus Anterior (R)',
    region: 'chest',
    subregion: 'Serratus',
    biasWeight: 1.0,
    weeklySetRange: [6, 12],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Often neglected; protraction work beneficial for shoulder health'
  },
  'CH-007': {
    id: 'CH-007',
    name: 'Serratus Anterior (L)',
    region: 'chest',
    subregion: 'Serratus',
    biasWeight: 1.0,
    weeklySetRange: [6, 12],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Often neglected; protraction work beneficial for shoulder health'
  },

  // ============================================
  // BACK
  // ============================================
  
  // Latissimus Dorsi
  'BA-001': {
    id: 'BA-001',
    name: 'Latissimus Dorsi (R)',
    region: 'back',
    subregion: 'Lats',
    biasWeight: 2.6,
    weeklySetRange: [14, 22],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest back muscle; high volume tolerance; pulls and rows hit it constantly'
  },
  'BA-002': {
    id: 'BA-002',
    name: 'Latissimus Dorsi (L)',
    region: 'back',
    subregion: 'Lats',
    biasWeight: 2.6,
    weeklySetRange: [14, 22],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest back muscle; high volume tolerance; pulls and rows hit it constantly'
  },

  // Erector Spinae
  'BA-003': {
    id: 'BA-003',
    name: 'Erector Spinae (Iliocostalis) (R)',
    region: 'back',
    subregion: 'Spinal Erectors',
    biasWeight: 1.8,
    weeklySetRange: [8, 14],
    recoveryHours: 72,
    compoundExposure: 'very_high',
    rationale: 'Hit by deadlifts, rows, squats; slow recovery; minimal direct work'
  },
  'BA-004': {
    id: 'BA-004',
    name: 'Erector Spinae (Iliocostalis) (L)',
    region: 'back',
    subregion: 'Spinal Erectors',
    biasWeight: 1.8,
    weeklySetRange: [8, 14],
    recoveryHours: 72,
    compoundExposure: 'very_high',
    rationale: 'Hit by deadlifts, rows, squats; slow recovery; minimal direct work'
  },
  'BA-005': {
    id: 'BA-005',
    name: 'Erector Spinae (Longissimus) (R)',
    region: 'back',
    subregion: 'Spinal Erectors',
    biasWeight: 1.8,
    weeklySetRange: [8, 14],
    recoveryHours: 72,
    compoundExposure: 'very_high',
    rationale: 'Central erector column; constant activation in compound lifts'
  },
  'BA-006': {
    id: 'BA-006',
    name: 'Erector Spinae (Longissimus) (L)',
    region: 'back',
    subregion: 'Spinal Erectors',
    biasWeight: 1.8,
    weeklySetRange: [8, 14],
    recoveryHours: 72,
    compoundExposure: 'very_high',
    rationale: 'Central erector column; constant activation in compound lifts'
  },
  'BA-007': {
    id: 'BA-007',
    name: 'Erector Spinae (Spinalis) (R)',
    region: 'back',
    subregion: 'Spinal Erectors',
    biasWeight: 1.4,
    weeklySetRange: [6, 12],
    recoveryHours: 72,
    compoundExposure: 'very_high',
    rationale: 'Medial erector; smaller but constant compound exposure'
  },
  'BA-008': {
    id: 'BA-008',
    name: 'Erector Spinae (Spinalis) (L)',
    region: 'back',
    subregion: 'Spinal Erectors',
    biasWeight: 1.4,
    weeklySetRange: [6, 12],
    recoveryHours: 72,
    compoundExposure: 'very_high',
    rationale: 'Medial erector; smaller but constant compound exposure'
  },

  // ============================================
  // ARMS - ANTERIOR (Biceps, Forearm Flexors)
  // ============================================
  
  'AR-001': {
    id: 'AR-001',
    name: 'Biceps Brachii (Long Head) (R)',
    region: 'arms',
    subregion: 'Biceps',
    biasWeight: 1.6,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Gets work from all pulling; direct work adds peak'
  },
  'AR-002': {
    id: 'AR-002',
    name: 'Biceps Brachii (Long Head) (L)',
    region: 'arms',
    subregion: 'Biceps',
    biasWeight: 1.6,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Gets work from all pulling; direct work adds peak'
  },
  'AR-003': {
    id: 'AR-003',
    name: 'Biceps Brachii (Short Head) (R)',
    region: 'arms',
    subregion: 'Biceps',
    biasWeight: 1.4,
    weeklySetRange: [8, 14],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Significant pulling exposure; moderate direct volume'
  },
  'AR-004': {
    id: 'AR-004',
    name: 'Biceps Brachii (Short Head) (L)',
    region: 'arms',
    subregion: 'Biceps',
    biasWeight: 1.4,
    weeklySetRange: [8, 14],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Significant pulling exposure; moderate direct volume'
  },
  'AR-005': {
    id: 'AR-005',
    name: 'Brachialis (R)',
    region: 'arms',
    subregion: 'Upper Arm',
    biasWeight: 1.2,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Under biceps; hammer curls target; less volume needed'
  },
  'AR-006': {
    id: 'AR-006',
    name: 'Brachialis (L)',
    region: 'arms',
    subregion: 'Upper Arm',
    biasWeight: 1.2,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Under biceps; hammer curls target; less volume needed'
  },
  'AR-007': {
    id: 'AR-007',
    name: 'Brachioradialis (R)',
    region: 'arms',
    subregion: 'Forearms',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Hit in all gripping and curling; rarely needs isolation'
  },
  'AR-008': {
    id: 'AR-008',
    name: 'Brachioradialis (L)',
    region: 'arms',
    subregion: 'Forearms',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Hit in all gripping and curling; rarely needs isolation'
  },
  'AR-009': {
    id: 'AR-009',
    name: 'Coracobrachialis (R)',
    region: 'arms',
    subregion: 'Upper Arm',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Small deep muscle; pressing exposure sufficient'
  },
  'AR-010': {
    id: 'AR-010',
    name: 'Coracobrachialis (L)',
    region: 'arms',
    subregion: 'Upper Arm',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Small deep muscle; pressing exposure sufficient'
  },

  // Forearm Flexors
  'AR-011': {
    id: 'AR-011',
    name: 'Flexor Carpi Radialis (R)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist flexor; curls and grip work hit it'
  },
  'AR-012': {
    id: 'AR-012',
    name: 'Flexor Carpi Radialis (L)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist flexor; curls and grip work hit it'
  },
  'AR-013': {
    id: 'AR-013',
    name: 'Flexor Carpi Ulnaris (R)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist flexor; compound grip exposure'
  },
  'AR-014': {
    id: 'AR-014',
    name: 'Flexor Carpi Ulnaris (L)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist flexor; compound grip exposure'
  },
  'AR-015': {
    id: 'AR-015',
    name: 'Flexor Digitorum Superficialis (R)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.7,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Active in all gripping; rarely needs direct work'
  },
  'AR-016': {
    id: 'AR-016',
    name: 'Flexor Digitorum Superficialis (L)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.7,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Active in all gripping; rarely needs direct work'
  },
  'AR-017': {
    id: 'AR-017',
    name: 'Flexor Digitorum Profundus (R)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.7,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Deep finger flexor; grip training covers it'
  },
  'AR-018': {
    id: 'AR-018',
    name: 'Flexor Digitorum Profundus (L)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.7,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Deep finger flexor; grip training covers it'
  },
  'AR-019': {
    id: 'AR-019',
    name: 'Pronator Teres (R)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Small forearm muscle; grip work covers it'
  },
  'AR-020': {
    id: 'AR-020',
    name: 'Pronator Teres (L)',
    region: 'arms',
    subregion: 'Forearm Flexors',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Small forearm muscle; grip work covers it'
  },

  // ============================================
  // ARMS - POSTERIOR (Triceps, Forearm Extensors)
  // ============================================
  
  'AP-001': {
    id: 'AP-001',
    name: 'Triceps Brachii (Long Head) (R)',
    region: 'arms',
    subregion: 'Triceps',
    biasWeight: 1.8,
    weeklySetRange: [12, 18],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Largest triceps head; responds to volume; crosses shoulder'
  },
  'AP-002': {
    id: 'AP-002',
    name: 'Triceps Brachii (Long Head) (L)',
    region: 'arms',
    subregion: 'Triceps',
    biasWeight: 1.8,
    weeklySetRange: [12, 18],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Largest triceps head; responds to volume; crosses shoulder'
  },
  'AP-003': {
    id: 'AP-003',
    name: 'Triceps Brachii (Lateral Head) (R)',
    region: 'arms',
    subregion: 'Triceps',
    biasWeight: 1.4,
    weeklySetRange: [10, 14],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Hit in all pressing; less direct work needed'
  },
  'AP-004': {
    id: 'AP-004',
    name: 'Triceps Brachii (Lateral Head) (L)',
    region: 'arms',
    subregion: 'Triceps',
    biasWeight: 1.4,
    weeklySetRange: [10, 14],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Hit in all pressing; less direct work needed'
  },
  'AP-005': {
    id: 'AP-005',
    name: 'Triceps Brachii (Medial Head) (R)',
    region: 'arms',
    subregion: 'Triceps',
    biasWeight: 1.0,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Deep head; constant pressing activation'
  },
  'AP-006': {
    id: 'AP-006',
    name: 'Triceps Brachii (Medial Head) (L)',
    region: 'arms',
    subregion: 'Triceps',
    biasWeight: 1.0,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Deep head; constant pressing activation'
  },
  'AP-007': {
    id: 'AP-007',
    name: 'Anconeus (R)',
    region: 'arms',
    subregion: 'Elbow',
    biasWeight: 0.4,
    weeklySetRange: [2, 4],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Tiny elbow stabilizer; no direct work needed'
  },
  'AP-008': {
    id: 'AP-008',
    name: 'Anconeus (L)',
    region: 'arms',
    subregion: 'Elbow',
    biasWeight: 0.4,
    weeklySetRange: [2, 4],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Tiny elbow stabilizer; no direct work needed'
  },

  // Forearm Extensors
  'AP-009': {
    id: 'AP-009',
    name: 'Extensor Carpi Radialis Longus (R)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist extensor; compound exposure adequate'
  },
  'AP-010': {
    id: 'AP-010',
    name: 'Extensor Carpi Radialis Longus (L)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist extensor; compound exposure adequate'
  },
  'AP-011': {
    id: 'AP-011',
    name: 'Extensor Carpi Radialis Brevis (R)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist extensor; grip and pulling covers it'
  },
  'AP-012': {
    id: 'AP-012',
    name: 'Extensor Carpi Radialis Brevis (L)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Wrist extensor; grip and pulling covers it'
  },
  'AP-013': {
    id: 'AP-013',
    name: 'Extensor Carpi Ulnaris (R)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Ulnar wrist extensor; compound work sufficient'
  },
  'AP-014': {
    id: 'AP-014',
    name: 'Extensor Carpi Ulnaris (L)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Ulnar wrist extensor; compound work sufficient'
  },
  'AP-015': {
    id: 'AP-015',
    name: 'Extensor Digitorum (R)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Finger extensors; balances grip work'
  },
  'AP-016': {
    id: 'AP-016',
    name: 'Extensor Digitorum (L)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Finger extensors; balances grip work'
  },
  'AP-017': {
    id: 'AP-017',
    name: 'Supinator (R)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Small forearm rotator; curls with supination hit it'
  },
  'AP-018': {
    id: 'AP-018',
    name: 'Supinator (L)',
    region: 'arms',
    subregion: 'Forearm Extensors',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Small forearm rotator; curls with supination hit it'
  },

  // ============================================
  // CORE - ANTERIOR
  // ============================================
  
  'CA-001': {
    id: 'CA-001',
    name: 'Rectus Abdominis (Upper)',
    region: 'core',
    subregion: 'Abs',
    biasWeight: 1.4,
    weeklySetRange: [10, 16],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Fast recovery; tolerates frequency; bracing exposure'
  },
  'CA-002': {
    id: 'CA-002',
    name: 'Rectus Abdominis (Lower)',
    region: 'core',
    subregion: 'Abs',
    biasWeight: 1.6,
    weeklySetRange: [10, 18],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Often lagging; benefits from direct work like leg raises'
  },
  'CA-003': {
    id: 'CA-003',
    name: 'External Oblique (R)',
    region: 'core',
    subregion: 'Obliques',
    biasWeight: 1.2,
    weeklySetRange: [8, 14],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Bracing activation in compounds; rotation work adds definition'
  },
  'CA-004': {
    id: 'CA-004',
    name: 'External Oblique (L)',
    region: 'core',
    subregion: 'Obliques',
    biasWeight: 1.2,
    weeklySetRange: [8, 14],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Bracing activation in compounds; rotation work adds definition'
  },
  'CA-005': {
    id: 'CA-005',
    name: 'Internal Oblique (R)',
    region: 'core',
    subregion: 'Obliques',
    biasWeight: 1.0,
    weeklySetRange: [6, 12],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Deep oblique; compound bracing covers most needs'
  },
  'CA-006': {
    id: 'CA-006',
    name: 'Internal Oblique (L)',
    region: 'core',
    subregion: 'Obliques',
    biasWeight: 1.0,
    weeklySetRange: [6, 12],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Deep oblique; compound bracing covers most needs'
  },
  'CA-007': {
    id: 'CA-007',
    name: 'Transverse Abdominis',
    region: 'core',
    subregion: 'Deep Core',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 24,
    compoundExposure: 'very_high',
    rationale: 'Deepest core layer; activated in all bracing; vacuums target it'
  },

  // ============================================
  // CORE - POSTERIOR
  // ============================================
  
  'CP-001': {
    id: 'CP-001',
    name: 'Quadratus Lumborum (R)',
    region: 'core',
    subregion: 'Lower Back',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Lateral spine stabilizer; side bends and carries hit it'
  },
  'CP-002': {
    id: 'CP-002',
    name: 'Quadratus Lumborum (L)',
    region: 'core',
    subregion: 'Lower Back',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Lateral spine stabilizer; side bends and carries hit it'
  },
  'CP-003': {
    id: 'CP-003',
    name: 'Multifidus (R)',
    region: 'core',
    subregion: 'Deep Back',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Deep spinal stabilizer; activated in all standing/loaded movements'
  },
  'CP-004': {
    id: 'CP-004',
    name: 'Multifidus (L)',
    region: 'core',
    subregion: 'Deep Back',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'very_high',
    rationale: 'Deep spinal stabilizer; activated in all standing/loaded movements'
  },

  // ============================================
  // HIPS & GLUTES
  // ============================================
  
  'HG-001': {
    id: 'HG-001',
    name: 'Gluteus Maximus (R)',
    region: 'hips',
    subregion: 'Glutes',
    biasWeight: 3.0,
    weeklySetRange: [16, 24],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest muscle in body; extremely high volume tolerance; key for power'
  },
  'HG-002': {
    id: 'HG-002',
    name: 'Gluteus Maximus (L)',
    region: 'hips',
    subregion: 'Glutes',
    biasWeight: 3.0,
    weeklySetRange: [16, 24],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest muscle in body; extremely high volume tolerance; key for power'
  },
  'HG-003': {
    id: 'HG-003',
    name: 'Gluteus Medius (R)',
    region: 'hips',
    subregion: 'Glutes',
    biasWeight: 1.4,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Hip stabilizer in single-leg work; moderate direct work'
  },
  'HG-004': {
    id: 'HG-004',
    name: 'Gluteus Medius (L)',
    region: 'hips',
    subregion: 'Glutes',
    biasWeight: 1.4,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Hip stabilizer in single-leg work; moderate direct work'
  },
  'HG-005': {
    id: 'HG-005',
    name: 'Gluteus Minimus (R)',
    region: 'hips',
    subregion: 'Glutes',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Deep hip stabilizer; abduction work covers it'
  },
  'HG-006': {
    id: 'HG-006',
    name: 'Gluteus Minimus (L)',
    region: 'hips',
    subregion: 'Glutes',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Small deep glute; compound hip work sufficient'
  },
  'HG-007': {
    id: 'HG-007',
    name: 'Tensor Fasciae Latae (R)',
    region: 'hips',
    subregion: 'Hip Flexors',
    biasWeight: 0.7,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'IT band tensor; squats and lunges hit it'
  },
  'HG-008': {
    id: 'HG-008',
    name: 'Tensor Fasciae Latae (L)',
    region: 'hips',
    subregion: 'Hip Flexors',
    biasWeight: 0.7,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Often tight; mobility focus over hypertrophy'
  },
  'HG-009': {
    id: 'HG-009',
    name: 'Iliopsoas (R)',
    region: 'hips',
    subregion: 'Hip Flexors',
    biasWeight: 1.0,
    weeklySetRange: [6, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Primary hip flexor; leg raises and compound leg work hit it'
  },
  'HG-010': {
    id: 'HG-010',
    name: 'Iliopsoas (L)',
    region: 'hips',
    subregion: 'Hip Flexors',
    biasWeight: 1.0,
    weeklySetRange: [6, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Primary hip flexor; leg raises and compound leg work hit it'
  },
  'HG-011': {
    id: 'HG-011',
    name: 'Piriformis (R)',
    region: 'hips',
    subregion: 'Deep Hip Rotators',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Deep hip rotator; compound hip work covers it'
  },
  'HG-012': {
    id: 'HG-012',
    name: 'Piriformis (L)',
    region: 'hips',
    subregion: 'Deep Hip Rotators',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Mobility and stability focus; no direct hypertrophy need'
  },

  // ============================================
  // LEGS - ANTERIOR (Quads, Adductors)
  // ============================================
  
  'LA-001': {
    id: 'LA-001',
    name: 'Rectus Femoris (R)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 2.4,
    weeklySetRange: [14, 20],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Two-joint quad; crosses hip; responds to volume'
  },
  'LA-002': {
    id: 'LA-002',
    name: 'Rectus Femoris (L)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 2.4,
    weeklySetRange: [14, 20],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Primary knee extensor; squats, leg press, lunges'
  },
  'LA-003': {
    id: 'LA-003',
    name: 'Vastus Lateralis (R)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 2.6,
    weeklySetRange: [14, 22],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest quad; outer sweep; high volume tolerance'
  },
  'LA-004': {
    id: 'LA-004',
    name: 'Vastus Lateralis (L)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 2.6,
    weeklySetRange: [14, 22],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Responds well to compound and isolation volume'
  },
  'LA-005': {
    id: 'LA-005',
    name: 'Vastus Medialis (R)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 2.2,
    weeklySetRange: [12, 18],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'VMO; teardrop; needs full ROM for development'
  },
  'LA-006': {
    id: 'LA-006',
    name: 'Vastus Medialis (L)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 2.2,
    weeklySetRange: [12, 18],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Knee health critical; deep squats beneficial'
  },
  'LA-007': {
    id: 'LA-007',
    name: 'Vastus Intermedius (R)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 1.8,
    weeklySetRange: [10, 16],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Deep quad; gets compound exposure automatically'
  },
  'LA-008': {
    id: 'LA-008',
    name: 'Vastus Intermedius (L)',
    region: 'legs',
    subregion: 'Quads',
    biasWeight: 1.8,
    weeklySetRange: [10, 16],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Under rectus femoris; all squatting hits it'
  },
  'LA-009': {
    id: 'LA-009',
    name: 'Sartorius (R)',
    region: 'legs',
    subregion: 'Thigh',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Long strap muscle; hip flexion and rotation work'
  },
  'LA-010': {
    id: 'LA-010',
    name: 'Sartorius (L)',
    region: 'legs',
    subregion: 'Thigh',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Longest muscle; compound leg work covers it'
  },

  // Adductors
  'LA-011': {
    id: 'LA-011',
    name: 'Adductor Longus (R)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 1.4,
    weeklySetRange: [10, 14],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Groin; squats with stance width engage it'
  },
  'LA-012': {
    id: 'LA-012',
    name: 'Adductor Longus (L)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 1.4,
    weeklySetRange: [10, 14],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Benefits from wide stance and adduction machines'
  },
  'LA-013': {
    id: 'LA-013',
    name: 'Adductor Brevis (R)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 1.0,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Shorter adductor; compound squat exposure'
  },
  'LA-014': {
    id: 'LA-014',
    name: 'Adductor Brevis (L)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 1.0,
    weeklySetRange: [8, 12],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Deep adductor; wide stance squats hit it'
  },
  'LA-015': {
    id: 'LA-015',
    name: 'Adductor Magnus (R)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 2.0,
    weeklySetRange: [12, 18],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Largest adductor; high volume tolerance; squats and deadlifts hit it'
  },
  'LA-016': {
    id: 'LA-016',
    name: 'Adductor Magnus (L)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 2.0,
    weeklySetRange: [12, 18],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Powerhouse adductor; responds to heavy compounds'
  },
  'LA-017': {
    id: 'LA-017',
    name: 'Gracilis (R)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Thin strap muscle; compound exposure sufficient'
  },
  'LA-018': {
    id: 'LA-018',
    name: 'Gracilis (L)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Crosses knee; adduction work covers it'
  },
  'LA-019': {
    id: 'LA-019',
    name: 'Pectineus (R)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Small hip adductor/flexor; compound work covers it'
  },
  'LA-020': {
    id: 'LA-020',
    name: 'Pectineus (L)',
    region: 'legs',
    subregion: 'Adductors',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 48,
    compoundExposure: 'high',
    rationale: 'Upper groin muscle; squats and lunges hit it'
  },

  // ============================================
  // LEGS - POSTERIOR (Hamstrings, Calves)
  // ============================================
  
  'LP-001': {
    id: 'LP-001',
    name: 'Biceps Femoris (Long Head) (R)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 2.0,
    weeklySetRange: [12, 18],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Two-joint hamstring; hip hinge and leg curl both needed'
  },
  'LP-002': {
    id: 'LP-002',
    name: 'Biceps Femoris (Long Head) (L)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 2.0,
    weeklySetRange: [12, 18],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Outer hamstring; responds to volume'
  },
  'LP-003': {
    id: 'LP-003',
    name: 'Biceps Femoris (Short Head) (R)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 1.4,
    weeklySetRange: [10, 14],
    recoveryHours: 72,
    compoundExposure: 'medium',
    rationale: 'Single-joint; only leg curls target it directly'
  },
  'LP-004': {
    id: 'LP-004',
    name: 'Biceps Femoris (Short Head) (L)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 1.4,
    weeklySetRange: [10, 14],
    recoveryHours: 72,
    compoundExposure: 'medium',
    rationale: 'Needs leg curl work; hip hinges miss it'
  },
  'LP-005': {
    id: 'LP-005',
    name: 'Semitendinosus (R)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 1.8,
    weeklySetRange: [12, 16],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Medial hamstring; hip hinges and curls both hit it'
  },
  'LP-006': {
    id: 'LP-006',
    name: 'Semitendinosus (L)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 1.8,
    weeklySetRange: [12, 16],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Long medial hamstring; good compound exposure'
  },
  'LP-007': {
    id: 'LP-007',
    name: 'Semimembranosus (R)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 1.8,
    weeklySetRange: [12, 16],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Deep medial hamstring; hip hinges target it well'
  },
  'LP-008': {
    id: 'LP-008',
    name: 'Semimembranosus (L)',
    region: 'legs',
    subregion: 'Hamstrings',
    biasWeight: 1.8,
    weeklySetRange: [12, 16],
    recoveryHours: 72,
    compoundExposure: 'high',
    rationale: 'Works with semitendinosus; compound pulling hits it'
  },

  // Calves
  'LP-009': {
    id: 'LP-009',
    name: 'Gastrocnemius (Medial) (R)',
    region: 'legs',
    subregion: 'Calves',
    biasWeight: 1.8,
    weeklySetRange: [12, 18],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Larger calf head; high volume tolerance; standing calf raises'
  },
  'LP-010': {
    id: 'LP-010',
    name: 'Gastrocnemius (Medial) (L)',
    region: 'legs',
    subregion: 'Calves',
    biasWeight: 1.8,
    weeklySetRange: [12, 18],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Inner calf; straight-leg calf work targets it'
  },
  'LP-011': {
    id: 'LP-011',
    name: 'Gastrocnemius (Lateral) (R)',
    region: 'legs',
    subregion: 'Calves',
    biasWeight: 1.6,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Outer calf head; standing calf raises'
  },
  'LP-012': {
    id: 'LP-012',
    name: 'Gastrocnemius (Lateral) (L)',
    region: 'legs',
    subregion: 'Calves',
    biasWeight: 1.6,
    weeklySetRange: [10, 16],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Smaller gastroc head; compound with medial'
  },
  'LP-013': {
    id: 'LP-013',
    name: 'Soleus (R)',
    region: 'legs',
    subregion: 'Calves',
    biasWeight: 2.0,
    weeklySetRange: [14, 20],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Deep calf; seated calf raises target it; high endurance muscle'
  },
  'LP-014': {
    id: 'LP-014',
    name: 'Soleus (L)',
    region: 'legs',
    subregion: 'Calves',
    biasWeight: 2.0,
    weeklySetRange: [14, 20],
    recoveryHours: 48,
    compoundExposure: 'medium',
    rationale: 'Slow-twitch dominant; tolerates high volume and frequency'
  },
  'LP-015': {
    id: 'LP-015',
    name: 'Tibialis Anterior (R)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 24,
    compoundExposure: 'low',
    rationale: 'Shin muscle; tibialis raises for balance and prehab'
  },
  'LP-016': {
    id: 'LP-016',
    name: 'Tibialis Anterior (L)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.8,
    weeklySetRange: [6, 10],
    recoveryHours: 24,
    compoundExposure: 'low',
    rationale: 'Often neglected; important for ankle health'
  },
  'LP-017': {
    id: 'LP-017',
    name: 'Tibialis Posterior (R)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Deep calf stabilizer; calf work hits it indirectly'
  },
  'LP-018': {
    id: 'LP-018',
    name: 'Tibialis Posterior (L)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Arch support muscle; compound calf work sufficient'
  },
  'LP-019': {
    id: 'LP-019',
    name: 'Peroneus Longus (R)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Lateral lower leg; ankle eversion; calf work hits it'
  },
  'LP-020': {
    id: 'LP-020',
    name: 'Peroneus Longus (L)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.6,
    weeklySetRange: [4, 8],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Ankle stabilizer; standing calf raises engage it'
  },
  'LP-021': {
    id: 'LP-021',
    name: 'Peroneus Brevis (R)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Small lateral stabilizer; calf training sufficient'
  },
  'LP-022': {
    id: 'LP-022',
    name: 'Peroneus Brevis (L)',
    region: 'legs',
    subregion: 'Lower Leg',
    biasWeight: 0.5,
    weeklySetRange: [4, 6],
    recoveryHours: 24,
    compoundExposure: 'medium',
    rationale: 'Eversion assist; compound exposure adequate'
  },
  'LP-023': {
    id: 'LP-023',
    name: 'Popliteus (R)',
    region: 'legs',
    subregion: 'Knee',
    biasWeight: 0.4,
    weeklySetRange: [2, 4],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Tiny knee stabilizer; all leg work hits it; no direct training needed'
  },
  'LP-024': {
    id: 'LP-024',
    name: 'Popliteus (L)',
    region: 'legs',
    subregion: 'Knee',
    biasWeight: 0.4,
    weeklySetRange: [2, 4],
    recoveryHours: 24,
    compoundExposure: 'high',
    rationale: 'Unlocks knee from extension; automatic activation'
  }
};

// Helper functions
export function getMusclesByRegion(region: MuscleRegion): Muscle[] {
  return Object.values(muscles).filter(m => m.region === region);
}

export function getMusclesBySubregion(subregion: string): Muscle[] {
  return Object.values(muscles).filter(m => m.subregion === subregion);
}

export function getMuscleById(id: string): Muscle | undefined {
  return muscles[id];
}

export function getAllMuscleIds(): string[] {
  return Object.keys(muscles);
}

export function getTotalMuscleCount(): number {
  return Object.keys(muscles).length;
}

// Calculate displayed activation using bias weight normalization
export function calculateDisplayedActivation(rawActivation: number, biasWeight: number): number {
  return Math.min(100, rawActivation / biasWeight);
}
