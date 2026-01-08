/**
 * Migration: Enhanced Seed Data
 *
 * Adds additional content based on Claude Chad's comprehensive proposal:
 * - More specific rehabilitation journey templates with conditions
 * - Additional milestones for underrepresented categories
 * - More milestone progressions
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 038_enhanced_seed_data');

  // ============================================
  // ADDITIONAL REHABILITATION JOURNEY TEMPLATES
  // ============================================

  log.info('Adding specific rehabilitation journey templates...');

  const rehabTemplates = [
    // Shoulder-specific
    {
      id: 'rehab_rotator_cuff',
      category_id: 'rehabilitation',
      name: 'Rotator Cuff Recovery',
      description: 'Progressive strengthening and mobility program for rotator cuff injuries including tears, strains, and impingement.',
      icon: 'shoulder',
      difficulty_level: 2,
      estimated_duration_weeks: 12,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['acute tear requiring surgery', 'severe inflammation', 'complete rupture'],
      target_outcomes: ['pain reduction', 'restored range of motion', 'strengthened rotator cuff muscles'],
      exercise_filters: { body_region: 'shoulder', intensity: 'low_to_moderate', avoid_movements: ['overhead pressing', 'heavy pulling'] },
    },
    {
      id: 'rehab_frozen_shoulder',
      category_id: 'rehabilitation',
      name: 'Frozen Shoulder Protocol',
      description: 'Structured mobility and stretching program for adhesive capsulitis (frozen shoulder).',
      icon: 'shoulder',
      difficulty_level: 1,
      estimated_duration_weeks: 16,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['recent shoulder surgery', 'active infection'],
      target_outcomes: ['restored range of motion', 'reduced stiffness', 'pain management'],
      exercise_filters: { body_region: 'shoulder', focus: 'mobility', intensity: 'gentle' },
    },
    {
      id: 'rehab_labrum_shoulder',
      category_id: 'rehabilitation',
      name: 'Shoulder Labrum Recovery',
      description: 'Post-operative or conservative management program for labral tears (SLAP, Bankart).',
      icon: 'shoulder',
      difficulty_level: 2,
      estimated_duration_weeks: 24,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['unstable repair', 'early post-op without clearance'],
      target_outcomes: ['joint stability', 'restored strength', 'return to activity'],
      exercise_filters: { body_region: 'shoulder', avoid_movements: ['extreme rotation', 'high impact'] },
    },

    // Back-specific
    {
      id: 'rehab_herniated_disc',
      category_id: 'rehabilitation',
      name: 'Herniated Disc Recovery',
      description: 'Core stabilization and posture program for lumbar or cervical disc herniation.',
      icon: 'spine',
      difficulty_level: 2,
      estimated_duration_weeks: 12,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['cauda equina syndrome', 'progressive neurological deficit', 'severe stenosis'],
      target_outcomes: ['pain reduction', 'core stability', 'improved posture', 'reduced nerve compression'],
      exercise_filters: { body_region: 'spine', avoid_movements: ['spinal flexion under load', 'twisting'] },
    },
    {
      id: 'rehab_sciatica',
      category_id: 'rehabilitation',
      name: 'Sciatica Relief Program',
      description: 'Nerve flossing and core strengthening program for sciatic nerve pain.',
      icon: 'spine',
      difficulty_level: 2,
      estimated_duration_weeks: 8,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['severe neurological symptoms', 'bladder/bowel dysfunction'],
      target_outcomes: ['reduced nerve pain', 'improved mobility', 'core stability'],
      exercise_filters: { body_region: 'lower_back', include: ['nerve_glides', 'core_stability'] },
    },
    {
      id: 'rehab_spinal_stenosis',
      category_id: 'rehabilitation',
      name: 'Spinal Stenosis Management',
      description: 'Flexion-based exercise program for lumbar spinal stenosis.',
      icon: 'spine',
      difficulty_level: 1,
      estimated_duration_weeks: 12,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['unstable spine', 'myelopathy'],
      target_outcomes: ['symptom relief', 'improved walking tolerance', 'maintained mobility'],
      exercise_filters: { body_region: 'spine', prefer: ['flexion_exercises'], avoid: ['extension'] },
    },

    // Knee-specific
    {
      id: 'rehab_acl_recovery',
      category_id: 'rehabilitation',
      name: 'ACL Recovery Program',
      description: 'Comprehensive rehabilitation for ACL reconstruction or conservative management.',
      icon: 'knee',
      difficulty_level: 3,
      estimated_duration_weeks: 36,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['graft failure', 'active infection', 'unhealed surgical site'],
      target_outcomes: ['restored knee stability', 'quad strength', 'return to sport'],
      exercise_filters: { body_region: 'knee', phases: ['early_healing', 'strength', 'power', 'sport_specific'] },
    },
    {
      id: 'rehab_meniscus',
      category_id: 'rehabilitation',
      name: 'Meniscus Recovery',
      description: 'Post-meniscectomy or meniscus repair rehabilitation program.',
      icon: 'knee',
      difficulty_level: 2,
      estimated_duration_weeks: 12,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['failed repair', 'significant cartilage damage'],
      target_outcomes: ['reduced swelling', 'full range of motion', 'quad strength'],
      exercise_filters: { body_region: 'knee', intensity: 'progressive' },
    },
    {
      id: 'rehab_patellofemoral',
      category_id: 'rehabilitation',
      name: 'Patellofemoral Pain Syndrome',
      description: 'VMO strengthening and patellar tracking program for runner\'s knee.',
      icon: 'knee',
      difficulty_level: 2,
      estimated_duration_weeks: 8,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['patellar dislocation', 'significant cartilage damage'],
      target_outcomes: ['pain-free movement', 'improved patellar tracking', 'quad balance'],
      exercise_filters: { body_region: 'knee', focus: ['vmo', 'hip_stability'] },
    },

    // Hip-specific
    {
      id: 'rehab_hip_labrum',
      category_id: 'rehabilitation',
      name: 'Hip Labrum Recovery',
      description: 'Pre or post-operative program for hip labral tears and FAI.',
      icon: 'hip',
      difficulty_level: 2,
      estimated_duration_weeks: 16,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['unstable hip', 'avascular necrosis'],
      target_outcomes: ['reduced impingement', 'hip stability', 'restored ROM'],
      exercise_filters: { body_region: 'hip', avoid_movements: ['deep flexion', 'internal rotation at end range'] },
    },
    {
      id: 'rehab_hip_bursitis',
      category_id: 'rehabilitation',
      name: 'Hip Bursitis Recovery',
      description: 'Glute strengthening and IT band management for trochanteric bursitis.',
      icon: 'hip',
      difficulty_level: 1,
      estimated_duration_weeks: 6,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['infected bursa', 'hip fracture'],
      target_outcomes: ['pain reduction', 'glute strength', 'IT band flexibility'],
      exercise_filters: { body_region: 'hip', focus: ['glute_med', 'it_band'] },
    },
    {
      id: 'rehab_hip_replacement',
      category_id: 'rehabilitation',
      name: 'Hip Replacement Recovery',
      description: 'Post total hip arthroplasty rehabilitation with precautions.',
      icon: 'hip',
      difficulty_level: 2,
      estimated_duration_weeks: 12,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['dislocation', 'infection', 'implant loosening'],
      target_outcomes: ['safe mobility', 'strength recovery', 'return to daily activities'],
      exercise_filters: { body_region: 'hip', precautions: ['posterior_precautions'] },
    },

    // Ankle-specific
    {
      id: 'rehab_ankle_sprain',
      category_id: 'rehabilitation',
      name: 'Ankle Sprain Recovery',
      description: 'Progressive balance and strengthening for lateral ankle sprains.',
      icon: 'ankle',
      difficulty_level: 2,
      estimated_duration_weeks: 6,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['fracture', 'syndesmotic injury', 'complete ligament rupture'],
      target_outcomes: ['restored stability', 'proprioception', 'return to activity'],
      exercise_filters: { body_region: 'ankle', focus: ['balance', 'peroneal_strength'] },
    },
    {
      id: 'rehab_plantar_fasciitis',
      category_id: 'rehabilitation',
      name: 'Plantar Fasciitis Protocol',
      description: 'Calf stretching and intrinsic foot strengthening for heel pain.',
      icon: 'foot',
      difficulty_level: 1,
      estimated_duration_weeks: 8,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['heel fracture', 'nerve entrapment'],
      target_outcomes: ['pain-free walking', 'calf flexibility', 'foot strength'],
      exercise_filters: { body_region: 'foot', focus: ['calf_stretch', 'intrinsic_foot'] },
    },
    {
      id: 'rehab_achilles',
      category_id: 'rehabilitation',
      name: 'Achilles Tendinopathy Program',
      description: 'Eccentric loading protocol for Achilles tendon issues.',
      icon: 'ankle',
      difficulty_level: 2,
      estimated_duration_weeks: 12,
      medical_disclaimer_required: true,
      professional_supervision_recommended: true,
      contraindications: ['complete rupture', 'insertional calcification'],
      target_outcomes: ['tendon healing', 'calf strength', 'return to running'],
      exercise_filters: { body_region: 'ankle', focus: ['eccentric_heel_drops'] },
    },

    // Wrist/Hand-specific
    {
      id: 'rehab_carpal_tunnel',
      category_id: 'rehabilitation',
      name: 'Carpal Tunnel Syndrome',
      description: 'Nerve gliding and wrist mobility program for median nerve compression.',
      icon: 'wrist',
      difficulty_level: 1,
      estimated_duration_weeks: 8,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['severe atrophy', 'constant numbness'],
      target_outcomes: ['reduced symptoms', 'improved nerve mobility', 'grip strength'],
      exercise_filters: { body_region: 'wrist', focus: ['nerve_glides', 'tendon_glides'] },
    },
    {
      id: 'rehab_tennis_elbow',
      category_id: 'rehabilitation',
      name: 'Tennis Elbow Recovery',
      description: 'Eccentric wrist extensor strengthening for lateral epicondylitis.',
      icon: 'elbow',
      difficulty_level: 1,
      estimated_duration_weeks: 8,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['complete tendon tear', 'fracture'],
      target_outcomes: ['pain-free grip', 'restored strength', 'return to activities'],
      exercise_filters: { body_region: 'elbow', focus: ['eccentric_wrist_extension'] },
    },
    {
      id: 'rehab_golfers_elbow',
      category_id: 'rehabilitation',
      name: 'Golfer\'s Elbow Recovery',
      description: 'Eccentric wrist flexor strengthening for medial epicondylitis.',
      icon: 'elbow',
      difficulty_level: 1,
      estimated_duration_weeks: 8,
      medical_disclaimer_required: true,
      professional_supervision_recommended: false,
      contraindications: ['ulnar nerve involvement', 'complete tear'],
      target_outcomes: ['pain-free grip', 'restored strength', 'return to activities'],
      exercise_filters: { body_region: 'elbow', focus: ['eccentric_wrist_flexion'] },
    },
  ];

  for (const template of rehabTemplates) {
    await db.query(
      `INSERT INTO journey_templates (
        id, category_id, name, description, icon, difficulty_level,
        estimated_duration_weeks, medical_disclaimer_required,
        professional_supervision_recommended, contraindications,
        target_outcomes, exercise_filters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING`,
      [
        template.id,
        template.category_id,
        template.name,
        template.description,
        template.icon,
        template.difficulty_level,
        template.estimated_duration_weeks,
        template.medical_disclaimer_required,
        template.professional_supervision_recommended,
        template.contraindications,
        template.target_outcomes,
        JSON.stringify(template.exercise_filters),
      ]
    );
  }

  log.info(`Added ${rehabTemplates.length} rehabilitation journey templates`);

  // ============================================
  // ADDITIONAL MILESTONES
  // ============================================

  log.info('Adding additional milestones...');

  const additionalMilestones = [
    // Pushing Power - additions
    {
      id: 'ring_dips_strict',
      name: 'Strict Ring Dips',
      description: 'Perform controlled dips on gymnastics rings with no swing.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 3,
      apparatus_required: 'rings',
      xp_reward: 300,
      achievement_criteria: { reps: 10, form: 'strict' },
      prerequisites: ['parallel_bar_dips'],
    },
    {
      id: 'rto_support',
      name: 'RTO Support Hold',
      description: 'Rings turned out support hold at 45+ degrees for 30 seconds.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 3,
      apparatus_required: 'rings',
      xp_reward: 350,
      achievement_criteria: { hold_seconds: 30, rto_angle: 45 },
      prerequisites: ['ring_support_hold'],
    },
    {
      id: 'rto_dips',
      name: 'RTO Dips',
      description: 'Ring dips maintaining rings turned out throughout the movement.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 4,
      apparatus_required: 'rings',
      xp_reward: 500,
      achievement_criteria: { reps: 5, form: 'rto_maintained' },
      prerequisites: ['ring_dips_strict', 'rto_support'],
    },
    {
      id: 'bulgarian_dips',
      name: 'Bulgarian Dips',
      description: 'Deep ring dips with extreme shoulder extension.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 4,
      apparatus_required: 'rings',
      xp_reward: 450,
      achievement_criteria: { reps: 5, depth: 'below_shoulder' },
      prerequisites: ['ring_dips_strict'],
    },
    {
      id: 'archer_pushups',
      name: 'Archer Push-ups',
      description: 'Wide push-ups shifting weight to one arm while the other extends.',
      category: 'pushing_power',
      subcategory: 'floor_pushing',
      difficulty_level: 3,
      apparatus_required: 'floor',
      xp_reward: 250,
      achievement_criteria: { reps: 10, each_side: true },
      prerequisites: ['diamond_pushups'],
    },
    {
      id: 'pseudo_planche_pushups',
      name: 'Pseudo Planche Push-ups',
      description: 'Push-ups with hands by the hips, forward lean.',
      category: 'pushing_power',
      subcategory: 'floor_pushing',
      difficulty_level: 3,
      apparatus_required: 'floor',
      xp_reward: 300,
      achievement_criteria: { reps: 10, lean_angle: 'significant' },
      prerequisites: [],
    },
    {
      id: 'maltese_pushups',
      name: 'Maltese Push-ups',
      description: 'Push-ups with arms straight out to the sides.',
      category: 'pushing_power',
      subcategory: 'floor_pushing',
      difficulty_level: 5,
      apparatus_required: 'floor',
      xp_reward: 800,
      achievement_criteria: { reps: 3 },
      prerequisites: ['planche_lean'],
    },

    // Rings Skills - additions
    {
      id: 'iron_cross',
      name: 'Iron Cross',
      description: 'Hold a cross position on rings with arms straight out.',
      category: 'rings_skills',
      subcategory: 'static_holds',
      difficulty_level: 5,
      apparatus_required: 'rings',
      xp_reward: 1000,
      achievement_criteria: { hold_seconds: 3, form: 'arms_horizontal' },
      prerequisites: ['iron_cross_negatives'],
    },
    {
      id: 'iron_cross_negatives',
      name: 'Iron Cross Negatives',
      description: 'Slow 5-second negative from support to cross position.',
      category: 'rings_skills',
      subcategory: 'static_holds',
      difficulty_level: 4,
      apparatus_required: 'rings',
      xp_reward: 500,
      achievement_criteria: { reps: 5, negative_time: 5 },
      prerequisites: ['rto_support'],
    },
    {
      id: 'azarian',
      name: 'Azarian',
      description: 'From back lever, press up to cross position.',
      category: 'rings_skills',
      subcategory: 'transitions',
      difficulty_level: 5,
      apparatus_required: 'rings',
      xp_reward: 1200,
      achievement_criteria: { reps: 1, form: 'controlled' },
      prerequisites: ['iron_cross', 'back_lever'],
    },
    {
      id: 'ring_handstand',
      name: 'Ring Handstand',
      description: 'Hold a handstand on gymnastics rings.',
      category: 'rings_skills',
      subcategory: 'inversions',
      difficulty_level: 4,
      apparatus_required: 'rings',
      xp_reward: 600,
      achievement_criteria: { hold_seconds: 10, form: 'controlled' },
      prerequisites: ['freestanding_handstand', 'rto_support'],
    },
    {
      id: 'ring_muscle_up',
      name: 'Strict Ring Muscle-up',
      description: 'False grip muscle-up with no kip.',
      category: 'rings_skills',
      subcategory: 'transitions',
      difficulty_level: 4,
      apparatus_required: 'rings',
      xp_reward: 500,
      achievement_criteria: { reps: 3, form: 'no_kip' },
      prerequisites: ['ring_dips_strict', 'false_grip_pullups'],
    },
    {
      id: 'victorian',
      name: 'Victorian',
      description: 'Hold an inverted cross position (upside-down cross).',
      category: 'rings_skills',
      subcategory: 'static_holds',
      difficulty_level: 5,
      apparatus_required: 'rings',
      xp_reward: 1500,
      achievement_criteria: { hold_seconds: 2 },
      prerequisites: ['iron_cross', 'ring_handstand'],
    },
    {
      id: 'butterfly_mount',
      name: 'Butterfly Mount',
      description: 'Mount to support through a butterfly (wide arm) position.',
      category: 'rings_skills',
      subcategory: 'mounts',
      difficulty_level: 4,
      apparatus_required: 'rings',
      xp_reward: 400,
      achievement_criteria: { reps: 3 },
      prerequisites: ['muscle_up_bar'],
    },

    // Human Flag & Pole - additions
    {
      id: 'human_flag_tuck',
      name: 'Tuck Human Flag',
      description: 'Human flag with knees tucked to chest.',
      category: 'flag_pole',
      subcategory: 'progressions',
      difficulty_level: 3,
      apparatus_required: 'vertical_pole',
      xp_reward: 350,
      achievement_criteria: { hold_seconds: 10 },
      prerequisites: [],
    },
    {
      id: 'human_flag_straddle',
      name: 'Straddle Human Flag',
      description: 'Human flag with legs in straddle position.',
      category: 'flag_pole',
      subcategory: 'progressions',
      difficulty_level: 4,
      apparatus_required: 'vertical_pole',
      xp_reward: 450,
      achievement_criteria: { hold_seconds: 5 },
      prerequisites: ['human_flag_tuck'],
    },
    {
      id: 'human_flag_full',
      name: 'Full Human Flag',
      description: 'Complete human flag with body horizontal, legs together.',
      category: 'flag_pole',
      subcategory: 'full_skills',
      difficulty_level: 5,
      apparatus_required: 'vertical_pole',
      xp_reward: 700,
      achievement_criteria: { hold_seconds: 3, form: 'horizontal' },
      prerequisites: ['human_flag_straddle'],
    },
    {
      id: 'dragon_flag_tuck',
      name: 'Tuck Dragon Flag',
      description: 'Dragon flag with knees tucked.',
      category: 'flag_pole',
      subcategory: 'dragon_flag',
      difficulty_level: 2,
      apparatus_required: 'bench',
      xp_reward: 200,
      achievement_criteria: { reps: 10 },
      prerequisites: [],
    },
    {
      id: 'dragon_flag_straddle',
      name: 'Straddle Dragon Flag',
      description: 'Dragon flag with legs in straddle.',
      category: 'flag_pole',
      subcategory: 'dragon_flag',
      difficulty_level: 3,
      apparatus_required: 'bench',
      xp_reward: 300,
      achievement_criteria: { reps: 5 },
      prerequisites: ['dragon_flag_tuck'],
    },
    {
      id: 'dragon_flag_full',
      name: 'Full Dragon Flag',
      description: 'Complete dragon flag with straight body.',
      category: 'flag_pole',
      subcategory: 'dragon_flag',
      difficulty_level: 4,
      apparatus_required: 'bench',
      xp_reward: 450,
      achievement_criteria: { reps: 3 },
      prerequisites: ['dragon_flag_straddle'],
    },

    // Grip & Forearm - additions
    {
      id: 'one_arm_dead_hang',
      name: 'One-Arm Dead Hang',
      description: 'Hang from one arm for 30 seconds.',
      category: 'grip_forearm',
      subcategory: 'hanging',
      difficulty_level: 3,
      apparatus_required: 'pull_up_bar',
      xp_reward: 300,
      achievement_criteria: { hold_seconds: 30, each_side: true },
      prerequisites: [],
    },
    {
      id: 'towel_pullups',
      name: 'Towel Pull-ups',
      description: 'Pull-ups gripping a towel draped over the bar.',
      category: 'grip_forearm',
      subcategory: 'grip_strength',
      difficulty_level: 3,
      apparatus_required: 'pull_up_bar',
      xp_reward: 250,
      achievement_criteria: { reps: 10 },
      prerequisites: [],
    },
    {
      id: 'fingertip_pushups',
      name: 'Fingertip Push-ups',
      description: 'Push-ups supported only on fingertips.',
      category: 'grip_forearm',
      subcategory: 'finger_strength',
      difficulty_level: 3,
      apparatus_required: 'floor',
      xp_reward: 250,
      achievement_criteria: { reps: 20 },
      prerequisites: [],
    },
    {
      id: 'dead_hang_2min',
      name: 'Two-Minute Dead Hang',
      description: 'Hang from a bar for 2 full minutes.',
      category: 'grip_forearm',
      subcategory: 'hanging',
      difficulty_level: 2,
      apparatus_required: 'pull_up_bar',
      xp_reward: 200,
      achievement_criteria: { hold_seconds: 120 },
      prerequisites: [],
    },
    {
      id: 'pinch_grip_hold',
      name: 'Pinch Grip Hold',
      description: 'Hold two 25lb plates pinched together for 30 seconds.',
      category: 'grip_forearm',
      subcategory: 'grip_strength',
      difficulty_level: 3,
      apparatus_required: 'weight_plates',
      xp_reward: 250,
      achievement_criteria: { hold_seconds: 30, weight: '25lb_plates' },
      prerequisites: [],
    },
    {
      id: 'rope_climb_legless',
      name: 'Legless Rope Climb',
      description: 'Climb a rope using only arms, no leg assistance.',
      category: 'grip_forearm',
      subcategory: 'climbing',
      difficulty_level: 4,
      apparatus_required: 'climbing_rope',
      xp_reward: 400,
      achievement_criteria: { height: '15ft' },
      prerequisites: [],
    },

    // Dynamic & Tumbling - additions
    {
      id: 'standing_back_tuck',
      name: 'Standing Back Tuck',
      description: 'Perform a standing backflip landing on feet.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 4,
      apparatus_required: 'floor',
      xp_reward: 500,
      achievement_criteria: { reps: 3, form: 'standing_landing' },
      prerequisites: [],
    },
    {
      id: 'standing_front_tuck',
      name: 'Standing Front Tuck',
      description: 'Perform a standing front flip landing on feet.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 4,
      apparatus_required: 'floor',
      xp_reward: 450,
      achievement_criteria: { reps: 3 },
      prerequisites: [],
    },
    {
      id: 'aerial_cartwheel',
      name: 'Aerial Cartwheel',
      description: 'Perform a cartwheel without hands touching the ground.',
      category: 'dynamic_tumbling',
      subcategory: 'aerials',
      difficulty_level: 4,
      apparatus_required: 'floor',
      xp_reward: 450,
      achievement_criteria: { reps: 3, each_side: true },
      prerequisites: [],
    },
    {
      id: 'webster',
      name: 'Webster',
      description: 'Front flip from one foot takeoff.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 5,
      apparatus_required: 'floor',
      xp_reward: 600,
      achievement_criteria: { reps: 1 },
      prerequisites: ['standing_front_tuck'],
    },
    {
      id: 'gainer',
      name: 'Gainer',
      description: 'Back flip traveling forward.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 5,
      apparatus_required: 'floor',
      xp_reward: 650,
      achievement_criteria: { reps: 1 },
      prerequisites: ['standing_back_tuck'],
    },
    {
      id: 'side_flip',
      name: 'Side Flip',
      description: 'Flip rotating sideways (side somersault).',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 4,
      apparatus_required: 'floor',
      xp_reward: 500,
      achievement_criteria: { reps: 3, each_side: true },
      prerequisites: [],
    },
  ];

  for (const milestone of additionalMilestones) {
    await db.query(
      `INSERT INTO skill_milestones (
        id, name, description, category, subcategory, difficulty_level,
        apparatus_required, xp_reward, achievement_criteria, prerequisites
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [
        milestone.id,
        milestone.name,
        milestone.description,
        milestone.category,
        milestone.subcategory,
        milestone.difficulty_level,
        milestone.apparatus_required,
        milestone.xp_reward,
        JSON.stringify(milestone.achievement_criteria),
        milestone.prerequisites,
      ]
    );
  }

  log.info(`Added ${additionalMilestones.length} additional milestones`);

  // ============================================
  // UPDATE INJURY REGIONS WITH MORE CONDITIONS
  // ============================================

  log.info('Updating injury regions with additional conditions...');

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'shoulder'
  `, [['rotator_cuff', 'impingement', 'frozen_shoulder', 'labrum_tear', 'bursitis', 'ac_joint', 'instability']]);

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'lower_back'
  `, [['herniated_disc', 'sciatica', 'strain', 'stenosis', 'facet_syndrome', 'si_joint', 'spondylolisthesis']]);

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'knee'
  `, [['acl', 'mcl', 'meniscus', 'patella', 'arthritis', 'it_band', 'bakers_cyst', 'chondromalacia']]);

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'hip'
  `, [['labrum_tear', 'bursitis', 'impingement', 'arthritis', 'piriformis', 'snapping_hip', 'avascular_necrosis']]);

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'ankle_foot'
  `, [['sprain', 'plantar_fasciitis', 'achilles', 'fracture', 'peroneal_tendinitis', 'posterior_tibial', 'bunion']]);

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'elbow'
  `, [['tennis_elbow', 'golfers_elbow', 'tendinitis', 'bursitis', 'ulnar_nerve', 'triceps_tendinitis']]);

  await db.query(`
    UPDATE injury_regions SET common_conditions = $1 WHERE id = 'wrist_hand'
  `, [['carpal_tunnel', 'sprain', 'tendinitis', 'de_quervains', 'trigger_finger', 'ganglion_cyst']]);

  log.info('Updated injury regions with comprehensive conditions');

  log.info('Migration 038_enhanced_seed_data complete');
}
