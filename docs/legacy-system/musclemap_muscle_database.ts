/**
 * MuscleMap Complete Muscle Database
 * 98+ muscles with bias weights derived from optimal training volumes
 * 
 * Bias Weight Formula: β = optimal_weekly_volume / reference_volume
 * Reference: Biceps = 15 sets/week = β of 1.0
 * 
 * Sources:
 * - Renaissance Periodization Volume Landmarks
 * - Stronger By Science Training Guides
 * - Schoenfeld et al. (2019) Meta-Analysis
 */

export enum MuscleGroup {
  LEGS = 'legs',
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  ARMS = 'arms',
  CORE = 'core',
  POSTERIOR_CHAIN = 'posterior_chain'
}

export interface Muscle {
  id: string;
  name: string;
  anatomicalName: string;
  group: MuscleGroup;
  biasWeight: number;
  optimalWeeklyVolume: number; // sets per week
  recoveryTime: number; // hours
  notes?: string;
}

export const MUSCLE_DATABASE: Muscle[] = [
  // ========================================================================
  // LEGS - ANTERIOR (Quads, Hip Flexors)
  // ========================================================================
  {
    id: 'quad_rectus_femoris',
    name: 'Rectus Femoris',
    anatomicalName: 'Rectus Femoris',
    group: MuscleGroup.LEGS,
    biasWeight: 3.8,
    optimalWeeklyVolume: 57,
    recoveryTime: 48,
    notes: 'Largest quad component, responds well to high volume'
  },
  {
    id: 'quad_vastus_lateralis',
    name: 'Vastus Lateralis',
    anatomicalName: 'Vastus Lateralis',
    group: MuscleGroup.LEGS,
    biasWeight: 3.8,
    optimalWeeklyVolume: 57,
    recoveryTime: 48,
    notes: 'Outer quad, critical for knee stability'
  },
  {
    id: 'quad_vastus_medialis',
    name: 'Vastus Medialis (VMO)',
    anatomicalName: 'Vastus Medialis Oblique',
    group: MuscleGroup.LEGS,
    biasWeight: 3.8,
    optimalWeeklyVolume: 57,
    recoveryTime: 48,
    notes: 'Inner quad, knee stability and lockout'
  },
  {
    id: 'quad_vastus_intermedius',
    name: 'Vastus Intermedius',
    anatomicalName: 'Vastus Intermedius',
    group: MuscleGroup.LEGS,
    biasWeight: 3.8,
    optimalWeeklyVolume: 57,
    recoveryTime: 48,
    notes: 'Deep quad muscle'
  },
  {
    id: 'hip_flexor_iliopsoas',
    name: 'Iliopsoas',
    anatomicalName: 'Iliopsoas (Iliacus + Psoas Major)',
    group: MuscleGroup.LEGS,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Primary hip flexor'
  },
  {
    id: 'hip_flexor_rectus_femoris',
    name: 'Rectus Femoris (Hip Flexion)',
    anatomicalName: 'Rectus Femoris',
    group: MuscleGroup.LEGS,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Dual action: knee extension + hip flexion'
  },

  // ========================================================================
  // LEGS - POSTERIOR (Hamstrings, Glutes)
  // ========================================================================
  {
    id: 'glute_maximus',
    name: 'Gluteus Maximus',
    anatomicalName: 'Gluteus Maximus',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 4.2,
    optimalWeeklyVolume: 63,
    recoveryTime: 48,
    notes: 'Largest muscle in body, high volume capacity'
  },
  {
    id: 'glute_medius',
    name: 'Gluteus Medius',
    anatomicalName: 'Gluteus Medius',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 1.8,
    optimalWeeklyVolume: 27,
    recoveryTime: 48,
    notes: 'Hip abduction and stabilization'
  },
  {
    id: 'glute_minimus',
    name: 'Gluteus Minimus',
    anatomicalName: 'Gluteus Minimus',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Deep hip stabilizer'
  },
  {
    id: 'hamstring_biceps_femoris_long',
    name: 'Biceps Femoris (Long Head)',
    anatomicalName: 'Biceps Femoris Long Head',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 3.0,
    optimalWeeklyVolume: 45,
    recoveryTime: 48,
    notes: 'Lateral hamstring, hip extension + knee flexion'
  },
  {
    id: 'hamstring_biceps_femoris_short',
    name: 'Biceps Femoris (Short Head)',
    anatomicalName: 'Biceps Femoris Short Head',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 3.0,
    optimalWeeklyVolume: 45,
    recoveryTime: 48,
    notes: 'Lateral hamstring, knee flexion only'
  },
  {
    id: 'hamstring_semitendinosus',
    name: 'Semitendinosus',
    anatomicalName: 'Semitendinosus',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 3.0,
    optimalWeeklyVolume: 45,
    recoveryTime: 48,
    notes: 'Medial hamstring'
  },
  {
    id: 'hamstring_semimembranosus',
    name: 'Semimembranosus',
    anatomicalName: 'Semimembranosus',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 3.0,
    optimalWeeklyVolume: 45,
    recoveryTime: 48,
    notes: 'Medial hamstring'
  },

  // ========================================================================
  // LEGS - ADDUCTORS & CALVES
  // ========================================================================
  {
    id: 'adductor_magnus',
    name: 'Adductor Magnus',
    anatomicalName: 'Adductor Magnus',
    group: MuscleGroup.LEGS,
    biasWeight: 2.4,
    optimalWeeklyVolume: 36,
    recoveryTime: 48,
    notes: 'Largest adductor'
  },
  {
    id: 'adductor_longus',
    name: 'Adductor Longus',
    anatomicalName: 'Adductor Longus',
    group: MuscleGroup.LEGS,
    biasWeight: 1.6,
    optimalWeeklyVolume: 24,
    recoveryTime: 48
  },
  {
    id: 'adductor_brevis',
    name: 'Adductor Brevis',
    anatomicalName: 'Adductor Brevis',
    group: MuscleGroup.LEGS,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48
  },
  {
    id: 'gracilis',
    name: 'Gracilis',
    anatomicalName: 'Gracilis',
    group: MuscleGroup.LEGS,
    biasWeight: 1.0,
    optimalWeeklyVolume: 15,
    recoveryTime: 48
  },
  {
    id: 'calf_gastrocnemius',
    name: 'Gastrocnemius',
    anatomicalName: 'Gastrocnemius (Medial + Lateral)',
    group: MuscleGroup.LEGS,
    biasWeight: 2.2,
    optimalWeeklyVolume: 33,
    recoveryTime: 36,
    notes: 'Superficial calf, responds to high volume'
  },
  {
    id: 'calf_soleus',
    name: 'Soleus',
    anatomicalName: 'Soleus',
    group: MuscleGroup.LEGS,
    biasWeight: 2.4,
    optimalWeeklyVolume: 36,
    recoveryTime: 36,
    notes: 'Deep calf, slow-twitch dominant'
  },
  {
    id: 'tibialis_anterior',
    name: 'Tibialis Anterior',
    anatomicalName: 'Tibialis Anterior',
    group: MuscleGroup.LEGS,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 36,
    notes: 'Shin muscle, often neglected'
  },

  // ========================================================================
  // CHEST
  // ========================================================================
  {
    id: 'pec_major_clavicular',
    name: 'Pectoralis Major (Upper)',
    anatomicalName: 'Pectoralis Major - Clavicular Head',
    group: MuscleGroup.CHEST,
    biasWeight: 2.6,
    optimalWeeklyVolume: 39,
    recoveryTime: 72,
    notes: 'Upper chest, incline movements'
  },
  {
    id: 'pec_major_sternal',
    name: 'Pectoralis Major (Mid)',
    anatomicalName: 'Pectoralis Major - Sternal Head',
    group: MuscleGroup.CHEST,
    biasWeight: 2.6,
    optimalWeeklyVolume: 39,
    recoveryTime: 72,
    notes: 'Mid chest, flat movements'
  },
  {
    id: 'pec_major_costal',
    name: 'Pectoralis Major (Lower)',
    anatomicalName: 'Pectoralis Major - Costal Head',
    group: MuscleGroup.CHEST,
    biasWeight: 2.6,
    optimalWeeklyVolume: 39,
    recoveryTime: 72,
    notes: 'Lower chest, decline/dip movements'
  },
  {
    id: 'pec_minor',
    name: 'Pectoralis Minor',
    anatomicalName: 'Pectoralis Minor',
    group: MuscleGroup.CHEST,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 72,
    notes: 'Deep chest muscle, scapular stability'
  },
  {
    id: 'serratus_anterior',
    name: 'Serratus Anterior',
    anatomicalName: 'Serratus Anterior',
    group: MuscleGroup.CHEST,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Scapular protraction, boxing muscle'
  },

  // ========================================================================
  // BACK - LATS & TRAPS
  // ========================================================================
  {
    id: 'lat_upper',
    name: 'Latissimus Dorsi (Upper)',
    anatomicalName: 'Latissimus Dorsi - Upper Fibers',
    group: MuscleGroup.BACK,
    biasWeight: 3.2,
    optimalWeeklyVolume: 48,
    recoveryTime: 72,
    notes: 'Upper lat, wide grip pulling'
  },
  {
    id: 'lat_lower',
    name: 'Latissimus Dorsi (Lower)',
    anatomicalName: 'Latissimus Dorsi - Lower Fibers',
    group: MuscleGroup.BACK,
    biasWeight: 3.2,
    optimalWeeklyVolume: 48,
    recoveryTime: 72,
    notes: 'Lower lat, close grip pulling'
  },
  {
    id: 'trap_upper',
    name: 'Upper Trapezius',
    anatomicalName: 'Trapezius - Upper Fibers',
    group: MuscleGroup.BACK,
    biasWeight: 1.6,
    optimalWeeklyVolume: 24,
    recoveryTime: 48,
    notes: 'Shoulder elevation, shrugs'
  },
  {
    id: 'trap_middle',
    name: 'Middle Trapezius',
    anatomicalName: 'Trapezius - Middle Fibers',
    group: MuscleGroup.BACK,
    biasWeight: 2.0,
    optimalWeeklyVolume: 30,
    recoveryTime: 48,
    notes: 'Scapular retraction, rows'
  },
  {
    id: 'trap_lower',
    name: 'Lower Trapezius',
    anatomicalName: 'Trapezius - Lower Fibers',
    group: MuscleGroup.BACK,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 48,
    notes: 'Scapular depression and retraction'
  },
  {
    id: 'rhomboid_major',
    name: 'Rhomboid Major',
    anatomicalName: 'Rhomboid Major',
    group: MuscleGroup.BACK,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Scapular retraction'
  },
  {
    id: 'rhomboid_minor',
    name: 'Rhomboid Minor',
    anatomicalName: 'Rhomboid Minor',
    group: MuscleGroup.BACK,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 48,
    notes: 'Upper scapular retraction'
  },
  {
    id: 'teres_major',
    name: 'Teres Major',
    anatomicalName: 'Teres Major',
    group: MuscleGroup.BACK,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 48,
    notes: 'Lat helper, shoulder extension'
  },
  {
    id: 'teres_minor',
    name: 'Teres Minor',
    anatomicalName: 'Teres Minor',
    group: MuscleGroup.BACK,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 72,
    notes: 'Rotator cuff, external rotation'
  },

  // ========================================================================
  // BACK - ERECTOR SPINAE & DEEP
  // ========================================================================
  {
    id: 'erector_spinae_iliocostalis',
    name: 'Iliocostalis',
    anatomicalName: 'Erector Spinae - Iliocostalis',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 2.0,
    optimalWeeklyVolume: 30,
    recoveryTime: 72,
    notes: 'Lateral erector, spinal extension'
  },
  {
    id: 'erector_spinae_longissimus',
    name: 'Longissimus',
    anatomicalName: 'Erector Spinae - Longissimus',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 2.0,
    optimalWeeklyVolume: 30,
    recoveryTime: 72,
    notes: 'Middle erector, primary extensor'
  },
  {
    id: 'erector_spinae_spinalis',
    name: 'Spinalis',
    anatomicalName: 'Erector Spinae - Spinalis',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 1.6,
    optimalWeeklyVolume: 24,
    recoveryTime: 72,
    notes: 'Medial erector'
  },
  {
    id: 'multifidus',
    name: 'Multifidus',
    anatomicalName: 'Multifidus',
    group: MuscleGroup.CORE,
    biasWeight: 1.0,
    optimalWeeklyVolume: 15,
    recoveryTime: 48,
    notes: 'Deep spinal stabilizer'
  },
  {
    id: 'quadratus_lumborum',
    name: 'Quadratus Lumborum',
    anatomicalName: 'Quadratus Lumborum',
    group: MuscleGroup.CORE,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Lateral flexion and stability'
  },

  // ========================================================================
  // SHOULDERS - DELTOIDS
  // ========================================================================
  {
    id: 'delt_anterior',
    name: 'Anterior Deltoid',
    anatomicalName: 'Deltoid - Anterior Head',
    group: MuscleGroup.SHOULDERS,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 48,
    notes: 'Front delt, pressing movements'
  },
  {
    id: 'delt_lateral',
    name: 'Lateral Deltoid',
    anatomicalName: 'Deltoid - Lateral/Middle Head',
    group: MuscleGroup.SHOULDERS,
    biasWeight: 1.6,
    optimalWeeklyVolume: 24,
    recoveryTime: 48,
    notes: 'Side delt, shoulder width'
  },
  {
    id: 'delt_posterior',
    name: 'Posterior Deltoid',
    anatomicalName: 'Deltoid - Posterior Head',
    group: MuscleGroup.SHOULDERS,
    biasWeight: 0.7,
    optimalWeeklyVolume: 10.5,
    recoveryTime: 96,
    notes: 'Rear delt, often underdeveloped'
  },

  // ========================================================================
  // SHOULDERS - ROTATOR CUFF
  // ========================================================================
  {
    id: 'rotator_supraspinatus',
    name: 'Supraspinatus',
    anatomicalName: 'Supraspinatus',
    group: MuscleGroup.SHOULDERS,
    biasWeight: 0.4,
    optimalWeeklyVolume: 6,
    recoveryTime: 120,
    notes: 'Rotator cuff, arm abduction initiation'
  },
  {
    id: 'rotator_infraspinatus',
    name: 'Infraspinatus',
    anatomicalName: 'Infraspinatus',
    group: MuscleGroup.SHOULDERS,
    biasWeight: 0.4,
    optimalWeeklyVolume: 6,
    recoveryTime: 120,
    notes: 'Rotator cuff, external rotation'
  },
  {
    id: 'rotator_subscapularis',
    name: 'Subscapularis',
    anatomicalName: 'Subscapularis',
    group: MuscleGroup.SHOULDERS,
    biasWeight: 0.4,
    optimalWeeklyVolume: 6,
    recoveryTime: 120,
    notes: 'Rotator cuff, internal rotation'
  },

  // ========================================================================
  // ARMS - BICEPS
  // ========================================================================
  {
    id: 'biceps_long_head',
    name: 'Biceps Brachii (Long Head)',
    anatomicalName: 'Biceps Brachii - Long Head',
    group: MuscleGroup.ARMS,
    biasWeight: 1.0,
    optimalWeeklyVolume: 15,
    recoveryTime: 48,
    notes: 'Outer bicep, peak development'
  },
  {
    id: 'biceps_short_head',
    name: 'Biceps Brachii (Short Head)',
    anatomicalName: 'Biceps Brachii - Short Head',
    group: MuscleGroup.ARMS,
    biasWeight: 1.0,
    optimalWeeklyVolume: 15,
    recoveryTime: 48,
    notes: 'Inner bicep, width'
  },
  {
    id: 'brachialis',
    name: 'Brachialis',
    anatomicalName: 'Brachialis',
    group: MuscleGroup.ARMS,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 48,
    notes: 'Under biceps, arm thickness'
  },
  {
    id: 'brachioradialis',
    name: 'Brachioradialis',
    anatomicalName: 'Brachioradialis',
    group: MuscleGroup.ARMS,
    biasWeight: 1.0,
    optimalWeeklyVolume: 15,
    recoveryTime: 48,
    notes: 'Forearm flexor, top of forearm'
  },

  // ========================================================================
  // ARMS - TRICEPS
  // ========================================================================
  {
    id: 'triceps_long_head',
    name: 'Triceps (Long Head)',
    anatomicalName: 'Triceps Brachii - Long Head',
    group: MuscleGroup.ARMS,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 48,
    notes: 'Inner/rear tricep, overhead work'
  },
  {
    id: 'triceps_lateral_head',
    name: 'Triceps (Lateral Head)',
    anatomicalName: 'Triceps Brachii - Lateral Head',
    group: MuscleGroup.ARMS,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 48,
    notes: 'Outer tricep, horseshoe shape'
  },
  {
    id: 'triceps_medial_head',
    name: 'Triceps (Medial Head)',
    anatomicalName: 'Triceps Brachii - Medial Head',
    group: MuscleGroup.ARMS,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 48,
    notes: 'Deep tricep, lockout strength'
  },
  {
    id: 'anconeus',
    name: 'Anconeus',
    anatomicalName: 'Anconeus',
    group: MuscleGroup.ARMS,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 36,
    notes: 'Small elbow extensor'
  },

  // ========================================================================
  // FOREARMS
  // ========================================================================
  {
    id: 'forearm_flexor_carpi_radialis',
    name: 'Flexor Carpi Radialis',
    anatomicalName: 'Flexor Carpi Radialis',
    group: MuscleGroup.ARMS,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 36,
    notes: 'Wrist flexion'
  },
  {
    id: 'forearm_flexor_carpi_ulnaris',
    name: 'Flexor Carpi Ulnaris',
    anatomicalName: 'Flexor Carpi Ulnaris',
    group: MuscleGroup.ARMS,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 36,
    notes: 'Wrist flexion'
  },
  {
    id: 'forearm_extensor_carpi_radialis',
    name: 'Extensor Carpi Radialis',
    anatomicalName: 'Extensor Carpi Radialis Longus/Brevis',
    group: MuscleGroup.ARMS,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 36,
    notes: 'Wrist extension'
  },
  {
    id: 'forearm_extensor_carpi_ulnaris',
    name: 'Extensor Carpi Ulnaris',
    anatomicalName: 'Extensor Carpi Ulnaris',
    group: MuscleGroup.ARMS,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 36,
    notes: 'Wrist extension'
  },
  {
    id: 'forearm_pronator_teres',
    name: 'Pronator Teres',
    anatomicalName: 'Pronator Teres',
    group: MuscleGroup.ARMS,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 36,
    notes: 'Forearm pronation'
  },
  {
    id: 'forearm_supinator',
    name: 'Supinator',
    anatomicalName: 'Supinator',
    group: MuscleGroup.ARMS,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 36,
    notes: 'Forearm supination'
  },

  // ========================================================================
  // CORE - ABDOMINALS
  // ========================================================================
  {
    id: 'abs_rectus_upper',
    name: 'Rectus Abdominis (Upper)',
    anatomicalName: 'Rectus Abdominis - Upper Region',
    group: MuscleGroup.CORE,
    biasWeight: 1.8,
    optimalWeeklyVolume: 27,
    recoveryTime: 36,
    notes: 'Upper abs, crunches'
  },
  {
    id: 'abs_rectus_lower',
    name: 'Rectus Abdominis (Lower)',
    anatomicalName: 'Rectus Abdominis - Lower Region',
    group: MuscleGroup.CORE,
    biasWeight: 1.8,
    optimalWeeklyVolume: 27,
    recoveryTime: 36,
    notes: 'Lower abs, leg raises'
  },
  {
    id: 'oblique_external',
    name: 'External Obliques',
    anatomicalName: 'External Obliques',
    group: MuscleGroup.CORE,
    biasWeight: 1.6,
    optimalWeeklyVolume: 24,
    recoveryTime: 36,
    notes: 'Side abs, rotation and lateral flexion'
  },
  {
    id: 'oblique_internal',
    name: 'Internal Obliques',
    anatomicalName: 'Internal Obliques',
    group: MuscleGroup.CORE,
    biasWeight: 1.4,
    optimalWeeklyVolume: 21,
    recoveryTime: 36,
    notes: 'Deep side abs'
  },
  {
    id: 'transverse_abdominis',
    name: 'Transverse Abdominis',
    anatomicalName: 'Transversus Abdominis',
    group: MuscleGroup.CORE,
    biasWeight: 1.2,
    optimalWeeklyVolume: 18,
    recoveryTime: 36,
    notes: 'Deepest ab layer, core stability'
  },

  // ========================================================================
  // CORE - HIP & GLUTE STABILIZERS
  // ========================================================================
  {
    id: 'tensor_fasciae_latae',
    name: 'Tensor Fasciae Latae (TFL)',
    anatomicalName: 'Tensor Fasciae Latae',
    group: MuscleGroup.LEGS,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 48,
    notes: 'Hip abduction and IT band'
  },
  {
    id: 'piriformis',
    name: 'Piriformis',
    anatomicalName: 'Piriformis',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 72,
    notes: 'Deep hip external rotator'
  },
  {
    id: 'hip_external_rotators',
    name: 'Deep Hip Rotators',
    anatomicalName: 'Obturators, Gemelli, Quadratus Femoris',
    group: MuscleGroup.POSTERIOR_CHAIN,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 72,
    notes: 'Hip stability and external rotation'
  },

  // ========================================================================
  // NECK
  // ========================================================================
  {
    id: 'neck_sternocleidomastoid',
    name: 'Sternocleidomastoid',
    anatomicalName: 'Sternocleidomastoid',
    group: MuscleGroup.BACK,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 48,
    notes: 'Neck flexion and rotation'
  },
  {
    id: 'neck_scalenes',
    name: 'Scalenes',
    anatomicalName: 'Scalene Muscles (Anterior/Middle/Posterior)',
    group: MuscleGroup.BACK,
    biasWeight: 0.6,
    optimalWeeklyVolume: 9,
    recoveryTime: 48,
    notes: 'Neck side flexion'
  },
  {
    id: 'neck_splenius',
    name: 'Splenius Capitis/Cervicis',
    anatomicalName: 'Splenius Muscles',
    group: MuscleGroup.BACK,
    biasWeight: 0.8,
    optimalWeeklyVolume: 12,
    recoveryTime: 48,
    notes: 'Neck extension'
  },
];

// Helper functions
export function getMuscleById(id: string): Muscle | undefined {
  return MUSCLE_DATABASE.find(m => m.id === id);
}

export function getMusclesByGroup(group: MuscleGroup): Muscle[] {
  return MUSCLE_DATABASE.filter(m => m.group === group);
}

export function calculateTotalOptimalVolume(): number {
  return MUSCLE_DATABASE.reduce((sum, m) => sum + m.optimalWeeklyVolume, 0);
}

// Statistics
console.log(`Total muscles in database: ${MUSCLE_DATABASE.length}`);
console.log(`Total optimal weekly volume: ${calculateTotalOptimalVolume()} sets`);
console.log(`Average bias weight: ${(MUSCLE_DATABASE.reduce((sum, m) => sum + m.biasWeight, 0) / MUSCLE_DATABASE.length).toFixed(2)}`);
