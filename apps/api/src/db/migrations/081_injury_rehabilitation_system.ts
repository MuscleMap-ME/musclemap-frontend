// DESTRUCTIVE: Schema modification for injury rehabilitation system - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Injury Rehabilitation System
 *
 * Creates tables for injury profiles, user injuries, rehab protocols,
 * and progress tracking. Based on evidence-based rehabilitation research
 * from AAOS, Mass General PT, and Physiopedia.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 081_injury_rehabilitation_system');

  // ============================================
  // INJURY PROFILES TABLE
  // ============================================
  if (!(await tableExists('injury_profiles'))) {
    log.info('Creating injury_profiles table...');
    await db.query(`
      CREATE TABLE injury_profiles (
        id TEXT PRIMARY KEY DEFAULT 'inj_' || replace(gen_random_uuid()::text, '-', ''),
        name TEXT NOT NULL,
        body_region TEXT NOT NULL,
        icd_10_code TEXT,
        description TEXT,
        typical_recovery_weeks INT,
        severity_levels JSONB DEFAULT '{}',
        contraindicated_movements TEXT[],
        recommended_movements TEXT[],
        risk_factors TEXT[],
        symptoms TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_injury_profiles_region ON injury_profiles(body_region)');
    await db.query('CREATE INDEX idx_injury_profiles_name ON injury_profiles(name)');

    log.info('injury_profiles table created');
  }

  // ============================================
  // USER INJURIES TABLE
  // ============================================
  if (!(await tableExists('user_injuries'))) {
    log.info('Creating user_injuries table...');
    await db.query(`
      CREATE TABLE user_injuries (
        id TEXT PRIMARY KEY DEFAULT 'uinj_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        injury_profile_id TEXT NOT NULL REFERENCES injury_profiles(id),
        severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
        onset_date DATE,
        is_surgical BOOLEAN DEFAULT false,
        surgery_date DATE,
        current_phase INT DEFAULT 1,
        pain_level INT CHECK (pain_level >= 0 AND pain_level <= 10),
        rom_flexion_percent INT DEFAULT 100 CHECK (rom_flexion_percent >= 0 AND rom_flexion_percent <= 100),
        rom_extension_percent INT DEFAULT 100 CHECK (rom_extension_percent >= 0 AND rom_extension_percent <= 100),
        rom_rotation_percent INT DEFAULT 100 CHECK (rom_rotation_percent >= 0 AND rom_rotation_percent <= 100),
        clearance_date DATE,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'recovering', 'resolved', 'chronic')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_user_injuries_user ON user_injuries(user_id)');
    await db.query('CREATE INDEX idx_user_injuries_status ON user_injuries(user_id, status)');
    await db.query('CREATE INDEX idx_user_injuries_profile ON user_injuries(injury_profile_id)');

    log.info('user_injuries table created');
  }

  // ============================================
  // REHAB PROTOCOLS TABLE
  // ============================================
  if (!(await tableExists('rehab_protocols'))) {
    log.info('Creating rehab_protocols table...');
    await db.query(`
      CREATE TABLE rehab_protocols (
        id TEXT PRIMARY KEY DEFAULT 'rp_' || replace(gen_random_uuid()::text, '-', ''),
        injury_profile_id TEXT NOT NULL REFERENCES injury_profiles(id),
        name TEXT NOT NULL,
        phase INT NOT NULL,
        phase_name TEXT,
        duration_weeks INT,
        goals JSONB DEFAULT '{}',
        progression_criteria JSONB DEFAULT '{}',
        exercises JSONB DEFAULT '[]',
        frequency_per_week INT DEFAULT 3,
        precautions TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_rehab_protocols_injury ON rehab_protocols(injury_profile_id, phase)');

    log.info('rehab_protocols table created');
  }

  // ============================================
  // REHAB PROGRESS TABLE
  // ============================================
  if (!(await tableExists('rehab_progress'))) {
    log.info('Creating rehab_progress table...');
    await db.query(`
      CREATE TABLE rehab_progress (
        id TEXT PRIMARY KEY DEFAULT 'rprog_' || replace(gen_random_uuid()::text, '-', ''),
        user_injury_id TEXT NOT NULL REFERENCES user_injuries(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        phase INT,
        pain_before INT CHECK (pain_before >= 0 AND pain_before <= 10),
        pain_after INT CHECK (pain_after >= 0 AND pain_after <= 10),
        rom_achieved JSONB DEFAULT '{}',
        exercises_completed JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_rehab_progress_injury ON rehab_progress(user_injury_id, date DESC)');

    log.info('rehab_progress table created');
  }

  // ============================================
  // SEED INJURY PROFILES
  // ============================================
  log.info('Seeding injury profiles...');

  const injuryProfiles = [
    // Shoulder injuries
    {
      id: 'rotator_cuff',
      name: 'Rotator Cuff Strain/Tear',
      body_region: 'shoulder',
      icd_10_code: 'M75.1',
      description: 'Injury to one or more of the four rotator cuff muscles (supraspinatus, infraspinatus, teres minor, subscapularis)',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['overhead_press', 'lateral_raise_heavy', 'behind_neck_press', 'upright_row'],
      recommended_movements: ['external_rotation', 'scapular_retraction', 'pendulum', 'wall_slide'],
    },
    {
      id: 'shoulder_impingement',
      name: 'Shoulder Impingement Syndrome',
      body_region: 'shoulder',
      icd_10_code: 'M75.4',
      description: 'Compression of rotator cuff tendons and bursa between the humeral head and acromion',
      typical_recovery_weeks: 8,
      severity_levels: { mild: { weeks: 4 }, moderate: { weeks: 8 }, severe: { weeks: 16 } },
      contraindicated_movements: ['overhead_press', 'lateral_raise', 'bench_press_wide'],
      recommended_movements: ['external_rotation', 'face_pull', 'band_pull_apart', 'scapular_push_up'],
    },
    {
      id: 'frozen_shoulder',
      name: 'Frozen Shoulder (Adhesive Capsulitis)',
      body_region: 'shoulder',
      icd_10_code: 'M75.0',
      description: 'Stiffening of the shoulder joint capsule causing restricted range of motion',
      typical_recovery_weeks: 52,
      severity_levels: { mild: { weeks: 26 }, moderate: { weeks: 52 }, severe: { weeks: 78 } },
      contraindicated_movements: ['forced_stretching', 'heavy_overhead', 'ballistic_movements'],
      recommended_movements: ['pendulum', 'passive_stretching', 'wall_climb', 'cross_body_stretch'],
    },

    // Knee injuries
    {
      id: 'patellar_tendinopathy',
      name: 'Patellar Tendinopathy (Jumper\'s Knee)',
      body_region: 'knee',
      icd_10_code: 'M76.5',
      description: 'Overuse injury of the patellar tendon causing pain below the kneecap',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['deep_squat', 'jumping', 'running_downhill', 'leg_extension_heavy'],
      recommended_movements: ['spanish_squat', 'eccentric_squat', 'isometric_wall_sit', 'step_down'],
    },
    {
      id: 'acl_injury',
      name: 'ACL Injury',
      body_region: 'knee',
      icd_10_code: 'S83.5',
      description: 'Sprain or tear of the anterior cruciate ligament',
      typical_recovery_weeks: 36,
      severity_levels: { mild: { weeks: 12 }, moderate: { weeks: 24 }, severe: { weeks: 52 } },
      contraindicated_movements: ['pivoting', 'cutting', 'jumping_landing', 'deep_squat_early'],
      recommended_movements: ['quad_sets', 'straight_leg_raise', 'hamstring_curl', 'step_up'],
    },
    {
      id: 'meniscus_tear',
      name: 'Meniscus Tear',
      body_region: 'knee',
      icd_10_code: 'S83.2',
      description: 'Tear in the cartilage that cushions the knee joint',
      typical_recovery_weeks: 8,
      severity_levels: { mild: { weeks: 4 }, moderate: { weeks: 8 }, severe: { weeks: 16 } },
      contraindicated_movements: ['deep_squat', 'twisting', 'high_impact'],
      recommended_movements: ['quad_sets', 'hamstring_stretch', 'calf_raise', 'partial_squat'],
    },

    // Back injuries
    {
      id: 'lower_back_strain',
      name: 'Lower Back Strain',
      body_region: 'back',
      icd_10_code: 'S39.012',
      description: 'Strain of the muscles and ligaments supporting the lumbar spine',
      typical_recovery_weeks: 4,
      severity_levels: { mild: { weeks: 2 }, moderate: { weeks: 4 }, severe: { weeks: 8 } },
      contraindicated_movements: ['deadlift_heavy', 'good_morning_heavy', 'situp_fast', 'twisting_loaded'],
      recommended_movements: ['cat_cow', 'bird_dog', 'dead_bug', 'glute_bridge'],
    },
    {
      id: 'disc_herniation',
      name: 'Disc Herniation',
      body_region: 'back',
      icd_10_code: 'M51.1',
      description: 'Displacement of disc material beyond the intervertebral disc space',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['spinal_flexion_loaded', 'situp', 'toe_touch', 'deadlift'],
      recommended_movements: ['mckenzie_extension', 'bird_dog', 'side_plank', 'walking'],
    },

    // Hip injuries
    {
      id: 'hip_flexor_strain',
      name: 'Hip Flexor Strain',
      body_region: 'hip',
      icd_10_code: 'S76.1',
      description: 'Strain of the iliopsoas or rectus femoris muscles',
      typical_recovery_weeks: 6,
      severity_levels: { mild: { weeks: 2 }, moderate: { weeks: 6 }, severe: { weeks: 12 } },
      contraindicated_movements: ['hip_flexion_resisted', 'sprinting', 'high_knees', 'leg_raise_heavy'],
      recommended_movements: ['hip_flexor_stretch', 'glute_bridge', 'prone_hip_extension', 'gentle_walking'],
    },
    {
      id: 'hip_impingement',
      name: 'Hip Impingement (FAI)',
      body_region: 'hip',
      icd_10_code: 'M25.85',
      description: 'Femoroacetabular impingement causing hip pain with flexion and rotation',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['deep_squat', 'sumo_deadlift', 'hip_flexion_beyond_90'],
      recommended_movements: ['hip_mobilization', 'glute_activation', 'modified_squat', 'hip_hinge'],
    },

    // Ankle injuries
    {
      id: 'ankle_sprain',
      name: 'Ankle Sprain',
      body_region: 'ankle',
      icd_10_code: 'S93.4',
      description: 'Stretching or tearing of ankle ligaments, typically the lateral ligaments',
      typical_recovery_weeks: 6,
      severity_levels: { mild: { weeks: 2 }, moderate: { weeks: 6 }, severe: { weeks: 12 } },
      contraindicated_movements: ['jumping', 'running', 'lateral_movement', 'single_leg_balance_early'],
      recommended_movements: ['ankle_alphabet', 'calf_raise', 'balance_board', 'resistance_band_eversion'],
    },
    {
      id: 'achilles_tendinopathy',
      name: 'Achilles Tendinopathy',
      body_region: 'ankle',
      icd_10_code: 'M76.6',
      description: 'Overuse injury of the Achilles tendon causing pain and stiffness',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['jumping', 'running_hills', 'explosive_calf_work'],
      recommended_movements: ['eccentric_heel_drop', 'isometric_calf', 'heavy_slow_resistance', 'soleus_stretch'],
    },

    // Elbow/Wrist injuries
    {
      id: 'tennis_elbow',
      name: 'Tennis Elbow (Lateral Epicondylitis)',
      body_region: 'elbow',
      icd_10_code: 'M77.1',
      description: 'Overuse injury of the wrist extensor tendons at the lateral epicondyle',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['wrist_extension_resisted', 'gripping_heavy', 'backhand_motion'],
      recommended_movements: ['eccentric_wrist_extension', 'tyler_twist', 'wrist_flexor_stretch', 'grip_isometrics'],
    },
    {
      id: 'golfers_elbow',
      name: 'Golfer\'s Elbow (Medial Epicondylitis)',
      body_region: 'elbow',
      icd_10_code: 'M77.0',
      description: 'Overuse injury of the wrist flexor tendons at the medial epicondyle',
      typical_recovery_weeks: 12,
      severity_levels: { mild: { weeks: 6 }, moderate: { weeks: 12 }, severe: { weeks: 24 } },
      contraindicated_movements: ['wrist_flexion_resisted', 'gripping_heavy', 'pulling_exercises'],
      recommended_movements: ['eccentric_wrist_flexion', 'reverse_tyler_twist', 'wrist_extensor_stretch', 'nerve_glides'],
    },

    // Neck injuries
    {
      id: 'neck_strain',
      name: 'Neck Strain (Cervical Strain)',
      body_region: 'neck',
      icd_10_code: 'S13.4',
      description: 'Strain of the muscles and ligaments of the cervical spine',
      typical_recovery_weeks: 4,
      severity_levels: { mild: { weeks: 1 }, moderate: { weeks: 4 }, severe: { weeks: 8 } },
      contraindicated_movements: ['heavy_shrugs', 'neck_bridges', 'overhead_press_heavy', 'loaded_carries_heavy'],
      recommended_movements: ['chin_tuck', 'neck_rotation_gentle', 'upper_trap_stretch', 'levator_scapulae_stretch'],
    },
  ];

  for (const profile of injuryProfiles) {
    await db.query(
      `INSERT INTO injury_profiles (id, name, body_region, icd_10_code, description, typical_recovery_weeks, severity_levels, contraindicated_movements, recommended_movements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = $2, body_region = $3, icd_10_code = $4, description = $5,
         typical_recovery_weeks = $6, severity_levels = $7,
         contraindicated_movements = $8, recommended_movements = $9`,
      [
        profile.id, profile.name, profile.body_region, profile.icd_10_code,
        profile.description, profile.typical_recovery_weeks,
        JSON.stringify(profile.severity_levels),
        profile.contraindicated_movements, profile.recommended_movements,
      ]
    );
  }

  // ============================================
  // SEED REHAB PROTOCOLS
  // ============================================
  log.info('Seeding rehab protocols...');

  const rehabProtocols = [
    // Rotator Cuff - 4 phases based on AAOS guidelines
    {
      injury_profile_id: 'rotator_cuff',
      name: 'Rotator Cuff - Phase 1: Protection',
      phase: 1,
      phase_name: 'Protection & Pain Control',
      duration_weeks: 2,
      goals: { pain_max: 3, rom_target: 50, focus: 'Reduce inflammation, protect healing tissue' },
      progression_criteria: { pain_at_rest: 2, no_night_pain: true },
      exercises: [
        { exercise_id: 'pendulum_swing', sets: 3, reps: '10 each direction', notes: 'Use body momentum, not arm muscles' },
        { exercise_id: 'passive_rom', sets: 3, reps: '10', notes: 'Use other arm or rope/pulley' },
        { exercise_id: 'ice_application', sets: 1, reps: '15-20 min', notes: '3-4x daily' },
      ],
      frequency_per_week: 7,
      precautions: ['No active lifting', 'No reaching behind back', 'Use sling as needed'],
    },
    {
      injury_profile_id: 'rotator_cuff',
      name: 'Rotator Cuff - Phase 2: Early Motion',
      phase: 2,
      phase_name: 'Early Active Motion',
      duration_weeks: 4,
      goals: { pain_max: 3, rom_target: 75, focus: 'Restore active ROM' },
      progression_criteria: { rom_flexion: 120, rom_abduction: 90, pain_with_motion: 3 },
      exercises: [
        { exercise_id: 'active_assisted_flexion', sets: 3, reps: '15', notes: 'Wand or rope assistance' },
        { exercise_id: 'wall_walk', sets: 3, reps: '10', notes: 'Walk fingers up wall to tolerance' },
        { exercise_id: 'isometric_external_rotation', sets: 3, reps: '10 x 5sec', notes: 'Elbow at side, 50% effort' },
        { exercise_id: 'scapular_squeeze', sets: 3, reps: '15', notes: 'Pinch shoulder blades together' },
      ],
      frequency_per_week: 5,
      precautions: ['No resisted movements yet', 'Stop if sharp pain'],
    },
    {
      injury_profile_id: 'rotator_cuff',
      name: 'Rotator Cuff - Phase 3: Strengthening',
      phase: 3,
      phase_name: 'Progressive Strengthening',
      duration_weeks: 6,
      goals: { pain_max: 2, rom_target: 95, strength_target: 70 },
      progression_criteria: { full_rom: true, strength_50_percent: true, no_pain_adl: true },
      exercises: [
        { exercise_id: 'band_external_rotation', sets: 3, reps: '15', notes: 'Light band, elbow at side' },
        { exercise_id: 'band_internal_rotation', sets: 3, reps: '15', notes: 'Light band, elbow at side' },
        { exercise_id: 'prone_y_raise', sets: 3, reps: '12', notes: 'No weight initially' },
        { exercise_id: 'prone_t_raise', sets: 3, reps: '12', notes: 'No weight initially' },
        { exercise_id: 'prone_w_raise', sets: 3, reps: '12', notes: 'Squeeze shoulder blades' },
        { exercise_id: 'side_lying_external_rotation', sets: 3, reps: '15', notes: 'Light dumbbell' },
      ],
      frequency_per_week: 3,
      precautions: ['Increase resistance gradually', 'No pain during exercise'],
    },
    {
      injury_profile_id: 'rotator_cuff',
      name: 'Rotator Cuff - Phase 4: Return to Activity',
      phase: 4,
      phase_name: 'Return to Activity',
      duration_weeks: 4,
      goals: { full_strength: true, sport_specific: true, pain_free: true },
      progression_criteria: { strength_90_percent: true, full_rom: true, functional_tests_passed: true },
      exercises: [
        { exercise_id: 'full_can_raise', sets: 3, reps: '12', notes: 'Thumbs up position' },
        { exercise_id: 'high_row', sets: 3, reps: '12', notes: 'Cable or band' },
        { exercise_id: 'push_up_plus', sets: 3, reps: '15', notes: 'Protract at top' },
        { exercise_id: 'light_overhead_press', sets: 3, reps: '10', notes: 'Very light, pain-free' },
        { exercise_id: 'plyometric_ball_throw', sets: 2, reps: '10', notes: 'If sport requires' },
      ],
      frequency_per_week: 3,
      precautions: ['Gradual return to sport', 'Monitor for recurrence'],
    },

    // Patellar Tendinopathy - Evidence-based eccentric loading
    {
      injury_profile_id: 'patellar_tendinopathy',
      name: 'Patellar Tendinopathy - Phase 1: Isometric Loading',
      phase: 1,
      phase_name: 'Isometric Pain Relief',
      duration_weeks: 2,
      goals: { pain_reduction: true, maintain_strength: true },
      progression_criteria: { pain_during_isometric: 3, pain_morning: 4 },
      exercises: [
        { exercise_id: 'isometric_wall_sit', sets: 5, reps: '45 sec', notes: 'Hold at 60 degrees knee flexion' },
        { exercise_id: 'spanish_squat', sets: 4, reps: '45 sec', notes: 'Band behind knees, lean back' },
        { exercise_id: 'quad_foam_roll', sets: 1, reps: '2 min', notes: 'Avoid direct patellar tendon' },
      ],
      frequency_per_week: 7,
      precautions: ['Pain should decrease during holds', 'Stop jumping/running'],
    },
    {
      injury_profile_id: 'patellar_tendinopathy',
      name: 'Patellar Tendinopathy - Phase 2: Eccentric Loading',
      phase: 2,
      phase_name: 'Eccentric Strengthening',
      duration_weeks: 8,
      goals: { tendon_adaptation: true, pain_max: 4 },
      progression_criteria: { pain_during_eccentric: 4, single_leg_squat_pain_free: true },
      exercises: [
        { exercise_id: 'eccentric_decline_squat', sets: 3, reps: '15', notes: '25 degree decline board, single leg eccentric' },
        { exercise_id: 'eccentric_leg_press', sets: 3, reps: '15', notes: 'Two leg up, one leg down slowly' },
        { exercise_id: 'step_down', sets: 3, reps: '12 each', notes: 'Control the descent' },
        { exercise_id: 'hip_strength_circuit', sets: 2, reps: '12', notes: 'Clamshell, side-lying abduction, bridges' },
      ],
      frequency_per_week: 3,
      precautions: ['Some pain acceptable (max 4/10)', 'Pain should not increase next day'],
    },
    {
      injury_profile_id: 'patellar_tendinopathy',
      name: 'Patellar Tendinopathy - Phase 3: Heavy Slow Resistance',
      phase: 3,
      phase_name: 'Heavy Slow Resistance',
      duration_weeks: 6,
      goals: { tendon_stiffness: true, strength_restoration: true },
      progression_criteria: { squat_70_percent_bw: true, pain_free_stairs: true },
      exercises: [
        { exercise_id: 'heavy_leg_press', sets: 4, reps: '6', notes: '4 sec down, 3 sec up, heavy load' },
        { exercise_id: 'heavy_hack_squat', sets: 4, reps: '6', notes: '4 sec down, 3 sec up' },
        { exercise_id: 'heavy_leg_extension', sets: 3, reps: '6', notes: '4 sec down, 3 sec up' },
        { exercise_id: 'single_leg_squat', sets: 3, reps: '8', notes: 'Full depth if tolerated' },
      ],
      frequency_per_week: 3,
      precautions: ['Heavy loads required for tendon adaptation', 'Allow 48h between sessions'],
    },
    {
      injury_profile_id: 'patellar_tendinopathy',
      name: 'Patellar Tendinopathy - Phase 4: Energy Storage',
      phase: 4,
      phase_name: 'Return to Sport/Plyometrics',
      duration_weeks: 4,
      goals: { energy_storage: true, sport_readiness: true },
      progression_criteria: { hop_test_90_percent: true, pain_free_jumping: true },
      exercises: [
        { exercise_id: 'pogo_jumps', sets: 3, reps: '15', notes: 'Ankle-dominant, minimal knee bend' },
        { exercise_id: 'box_jumps_low', sets: 3, reps: '8', notes: 'Step down, jump up' },
        { exercise_id: 'drop_jumps', sets: 3, reps: '6', notes: 'Progress height gradually' },
        { exercise_id: 'sport_specific_drills', sets: 2, reps: '10', notes: 'Based on sport demands' },
      ],
      frequency_per_week: 2,
      precautions: ['Progress volume before intensity', 'Monitor 24h response'],
    },

    // Achilles Tendinopathy - Alfredson protocol
    {
      injury_profile_id: 'achilles_tendinopathy',
      name: 'Achilles Tendinopathy - Phase 1: Isometric',
      phase: 1,
      phase_name: 'Isometric Loading',
      duration_weeks: 2,
      goals: { pain_relief: true, baseline_strength: true },
      progression_criteria: { pain_during_isometric: 3 },
      exercises: [
        { exercise_id: 'isometric_calf_raise', sets: 5, reps: '45 sec', notes: 'Hold at top of calf raise' },
        { exercise_id: 'seated_soleus_isometric', sets: 5, reps: '45 sec', notes: 'Knee bent, hold raise' },
        { exercise_id: 'calf_foam_roll', sets: 1, reps: '2 min', notes: 'Above and below tendon' },
      ],
      frequency_per_week: 7,
      precautions: ['Avoid stretching acutely', 'No running/jumping'],
    },
    {
      injury_profile_id: 'achilles_tendinopathy',
      name: 'Achilles Tendinopathy - Phase 2: Alfredson Eccentric',
      phase: 2,
      phase_name: 'Eccentric Loading',
      duration_weeks: 12,
      goals: { tendon_remodeling: true, pain_max: 5 },
      progression_criteria: { pain_free_walking: true, single_leg_heel_raise: true },
      exercises: [
        { exercise_id: 'eccentric_heel_drop_straight', sets: 3, reps: '15', notes: 'Straight knee, slow lower off step' },
        { exercise_id: 'eccentric_heel_drop_bent', sets: 3, reps: '15', notes: 'Bent knee for soleus, slow lower' },
      ],
      frequency_per_week: 14,
      precautions: ['Some discomfort acceptable (max 5/10)', 'Do twice daily', 'Add weight vest when bodyweight is easy'],
    },
    {
      injury_profile_id: 'achilles_tendinopathy',
      name: 'Achilles Tendinopathy - Phase 3: Heavy Slow Resistance',
      phase: 3,
      phase_name: 'Heavy Loading',
      duration_weeks: 6,
      goals: { tendon_stiffness: true, strength_restoration: true },
      progression_criteria: { single_leg_raise_25_reps: true, pain_free_jogging: true },
      exercises: [
        { exercise_id: 'heavy_seated_calf_raise', sets: 4, reps: '8', notes: '3 sec up, 3 sec down' },
        { exercise_id: 'heavy_standing_calf_raise', sets: 4, reps: '8', notes: '3 sec up, 3 sec down' },
        { exercise_id: 'single_leg_calf_raise', sets: 3, reps: '15', notes: 'Full ROM on step' },
      ],
      frequency_per_week: 3,
      precautions: ['Heavy loads essential', '48h between sessions'],
    },
  ];

  for (const protocol of rehabProtocols) {
    const id = `${protocol.injury_profile_id}_phase_${protocol.phase}`;
    await db.query(
      `INSERT INTO rehab_protocols (id, injury_profile_id, name, phase, phase_name, duration_weeks, goals, progression_criteria, exercises, frequency_per_week, precautions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = $3, phase = $4, phase_name = $5, duration_weeks = $6,
         goals = $7, progression_criteria = $8, exercises = $9,
         frequency_per_week = $10, precautions = $11`,
      [
        id, protocol.injury_profile_id, protocol.name, protocol.phase,
        protocol.phase_name, protocol.duration_weeks,
        JSON.stringify(protocol.goals), JSON.stringify(protocol.progression_criteria),
        JSON.stringify(protocol.exercises), protocol.frequency_per_week,
        protocol.precautions,
      ]
    );
  }

  log.info('Migration 081_injury_rehabilitation_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 081_injury_rehabilitation_system');

  await db.query('DROP TABLE IF EXISTS rehab_progress CASCADE');
  await db.query('DROP TABLE IF EXISTS rehab_protocols CASCADE');
  await db.query('DROP TABLE IF EXISTS user_injuries CASCADE');
  await db.query('DROP TABLE IF EXISTS injury_profiles CASCADE');

  log.info('Migration 081_injury_rehabilitation_system rolled back');
}
