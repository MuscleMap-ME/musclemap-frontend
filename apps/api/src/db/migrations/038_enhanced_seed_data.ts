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
    // Shoulder-specific (category: shoulder_rehab)
    {
      id: 'rehab_rotator_cuff',
      category_id: 'shoulder_rehab',
      name: 'Rotator Cuff Recovery',
      description: 'Progressive strengthening and mobility program for rotator cuff injuries including tears, strains, and impingement.',
      journey_type: 'rehabilitation',
      icon: 'shoulder',
      difficulty_level: 2,
      suggested_duration_days: 84, // 12 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['acute tear requiring surgery', 'severe inflammation', 'complete rupture'],
      precautions: ['pain reduction', 'restored range of motion', 'strengthened rotator cuff muscles'],
      exercise_filter: { body_region: 'shoulder', intensity: 'low_to_moderate', avoid_movements: ['overhead pressing', 'heavy pulling'] },
    },
    {
      id: 'rehab_frozen_shoulder',
      category_id: 'shoulder_rehab',
      name: 'Frozen Shoulder Protocol',
      description: 'Structured mobility and stretching program for adhesive capsulitis (frozen shoulder).',
      journey_type: 'rehabilitation',
      icon: 'shoulder',
      difficulty_level: 1,
      suggested_duration_days: 112, // 16 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['recent shoulder surgery', 'active infection'],
      precautions: ['restored range of motion', 'reduced stiffness', 'pain management'],
      exercise_filter: { body_region: 'shoulder', focus: 'mobility', intensity: 'gentle' },
    },
    {
      id: 'rehab_labrum_shoulder',
      category_id: 'shoulder_rehab',
      name: 'Shoulder Labrum Recovery',
      description: 'Post-operative or conservative management program for labral tears (SLAP, Bankart).',
      journey_type: 'rehabilitation',
      icon: 'shoulder',
      difficulty_level: 2,
      suggested_duration_days: 168, // 24 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['unstable repair', 'early post-op without clearance'],
      precautions: ['joint stability', 'restored strength', 'return to activity'],
      exercise_filter: { body_region: 'shoulder', avoid_movements: ['extreme rotation', 'high impact'] },
    },

    // Back-specific (category: back_rehab)
    {
      id: 'rehab_herniated_disc',
      category_id: 'back_rehab',
      name: 'Herniated Disc Recovery',
      description: 'Core stabilization and posture program for lumbar or cervical disc herniation.',
      journey_type: 'rehabilitation',
      icon: 'spine',
      difficulty_level: 2,
      suggested_duration_days: 84, // 12 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['cauda equina syndrome', 'progressive neurological deficit', 'severe stenosis'],
      precautions: ['pain reduction', 'core stability', 'improved posture', 'reduced nerve compression'],
      exercise_filter: { body_region: 'spine', avoid_movements: ['spinal flexion under load', 'twisting'] },
    },
    {
      id: 'rehab_sciatica',
      category_id: 'back_rehab',
      name: 'Sciatica Relief Program',
      description: 'Nerve flossing and core strengthening program for sciatic nerve pain.',
      journey_type: 'rehabilitation',
      icon: 'spine',
      difficulty_level: 2,
      suggested_duration_days: 56, // 8 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['severe neurological symptoms', 'bladder/bowel dysfunction'],
      precautions: ['reduced nerve pain', 'improved mobility', 'core stability'],
      exercise_filter: { body_region: 'lower_back', include: ['nerve_glides', 'core_stability'] },
    },
    {
      id: 'rehab_spinal_stenosis',
      category_id: 'back_rehab',
      name: 'Spinal Stenosis Management',
      description: 'Flexion-based exercise program for lumbar spinal stenosis.',
      journey_type: 'rehabilitation',
      icon: 'spine',
      difficulty_level: 1,
      suggested_duration_days: 84, // 12 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['unstable spine', 'myelopathy'],
      precautions: ['symptom relief', 'improved walking tolerance', 'maintained mobility'],
      exercise_filter: { body_region: 'spine', prefer: ['flexion_exercises'], avoid: ['extension'] },
    },

    // Knee-specific (category: knee_rehab)
    {
      id: 'rehab_acl_recovery',
      category_id: 'knee_rehab',
      name: 'ACL Recovery Program',
      description: 'Comprehensive rehabilitation for ACL reconstruction or conservative management.',
      journey_type: 'rehabilitation',
      icon: 'knee',
      difficulty_level: 3,
      suggested_duration_days: 252, // 36 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['graft failure', 'active infection', 'unhealed surgical site'],
      precautions: ['restored knee stability', 'quad strength', 'return to sport'],
      exercise_filter: { body_region: 'knee', phases: ['early_healing', 'strength', 'power', 'sport_specific'] },
    },
    {
      id: 'rehab_meniscus',
      category_id: 'knee_rehab',
      name: 'Meniscus Recovery',
      description: 'Post-meniscectomy or meniscus repair rehabilitation program.',
      journey_type: 'rehabilitation',
      icon: 'knee',
      difficulty_level: 2,
      suggested_duration_days: 84, // 12 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['failed repair', 'significant cartilage damage'],
      precautions: ['reduced swelling', 'full range of motion', 'quad strength'],
      exercise_filter: { body_region: 'knee', intensity: 'progressive' },
    },
    {
      id: 'rehab_patellofemoral',
      category_id: 'knee_rehab',
      name: 'Patellofemoral Pain Syndrome',
      description: 'VMO strengthening and patellar tracking program for runner\'s knee.',
      journey_type: 'rehabilitation',
      icon: 'knee',
      difficulty_level: 2,
      suggested_duration_days: 56, // 8 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['patellar dislocation', 'significant cartilage damage'],
      precautions: ['pain-free movement', 'improved patellar tracking', 'quad balance'],
      exercise_filter: { body_region: 'knee', focus: ['vmo', 'hip_stability'] },
    },

    // Hip-specific (category: hip_rehab)
    {
      id: 'rehab_hip_labrum',
      category_id: 'hip_rehab',
      name: 'Hip Labrum Recovery',
      description: 'Pre or post-operative program for hip labral tears and FAI.',
      journey_type: 'rehabilitation',
      icon: 'hip',
      difficulty_level: 2,
      suggested_duration_days: 112, // 16 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['unstable hip', 'avascular necrosis'],
      precautions: ['reduced impingement', 'hip stability', 'restored ROM'],
      exercise_filter: { body_region: 'hip', avoid_movements: ['deep flexion', 'internal rotation at end range'] },
    },
    {
      id: 'rehab_hip_bursitis',
      category_id: 'hip_rehab',
      name: 'Hip Bursitis Recovery',
      description: 'Glute strengthening and IT band management for trochanteric bursitis.',
      journey_type: 'rehabilitation',
      icon: 'hip',
      difficulty_level: 1,
      suggested_duration_days: 42, // 6 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['infected bursa', 'hip fracture'],
      precautions: ['pain reduction', 'glute strength', 'IT band flexibility'],
      exercise_filter: { body_region: 'hip', focus: ['glute_med', 'it_band'] },
    },
    {
      id: 'rehab_hip_replacement',
      category_id: 'hip_rehab',
      name: 'Hip Replacement Recovery',
      description: 'Post total hip arthroplasty rehabilitation with precautions.',
      journey_type: 'rehabilitation',
      icon: 'hip',
      difficulty_level: 2,
      suggested_duration_days: 84, // 12 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['dislocation', 'infection', 'implant loosening'],
      precautions: ['safe mobility', 'strength recovery', 'return to daily activities'],
      exercise_filter: { body_region: 'hip', precautions: ['posterior_precautions'] },
    },

    // Ankle-specific (category: ankle_rehab)
    {
      id: 'rehab_ankle_sprain',
      category_id: 'ankle_rehab',
      name: 'Ankle Sprain Recovery',
      description: 'Progressive balance and strengthening for lateral ankle sprains.',
      journey_type: 'rehabilitation',
      icon: 'ankle',
      difficulty_level: 2,
      suggested_duration_days: 42, // 6 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['fracture', 'syndesmotic injury', 'complete ligament rupture'],
      precautions: ['restored stability', 'proprioception', 'return to activity'],
      exercise_filter: { body_region: 'ankle', focus: ['balance', 'peroneal_strength'] },
    },
    {
      id: 'rehab_plantar_fasciitis',
      category_id: 'ankle_rehab',
      name: 'Plantar Fasciitis Protocol',
      description: 'Calf stretching and intrinsic foot strengthening for heel pain.',
      journey_type: 'rehabilitation',
      icon: 'foot',
      difficulty_level: 1,
      suggested_duration_days: 56, // 8 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['heel fracture', 'nerve entrapment'],
      precautions: ['pain-free walking', 'calf flexibility', 'foot strength'],
      exercise_filter: { body_region: 'foot', focus: ['calf_stretch', 'intrinsic_foot'] },
    },
    {
      id: 'rehab_achilles',
      category_id: 'ankle_rehab',
      name: 'Achilles Tendinopathy Program',
      description: 'Eccentric loading protocol for Achilles tendon issues.',
      journey_type: 'rehabilitation',
      icon: 'ankle',
      difficulty_level: 2,
      suggested_duration_days: 84, // 12 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: true,
      contraindications: ['complete rupture', 'insertional calcification'],
      precautions: ['tendon healing', 'calf strength', 'return to running'],
      exercise_filter: { body_region: 'ankle', focus: ['eccentric_heel_drops'] },
    },

    // Wrist/Hand-specific (category: wrist_rehab)
    {
      id: 'rehab_carpal_tunnel',
      category_id: 'wrist_rehab',
      name: 'Carpal Tunnel Syndrome',
      description: 'Nerve gliding and wrist mobility program for median nerve compression.',
      journey_type: 'rehabilitation',
      icon: 'wrist',
      difficulty_level: 1,
      suggested_duration_days: 56, // 8 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['severe atrophy', 'constant numbness'],
      precautions: ['reduced symptoms', 'improved nerve mobility', 'grip strength'],
      exercise_filter: { body_region: 'wrist', focus: ['nerve_glides', 'tendon_glides'] },
    },
    {
      id: 'rehab_tennis_elbow',
      category_id: 'wrist_rehab',
      name: 'Tennis Elbow Recovery',
      description: 'Eccentric wrist extensor strengthening for lateral epicondylitis.',
      journey_type: 'rehabilitation',
      icon: 'elbow',
      difficulty_level: 1,
      suggested_duration_days: 56, // 8 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['complete tendon tear', 'fracture'],
      precautions: ['pain-free grip', 'restored strength', 'return to activities'],
      exercise_filter: { body_region: 'elbow', focus: ['eccentric_wrist_extension'] },
    },
    {
      id: 'rehab_golfers_elbow',
      category_id: 'wrist_rehab',
      name: 'Golfer\'s Elbow Recovery',
      description: 'Eccentric wrist flexor strengthening for medial epicondylitis.',
      journey_type: 'rehabilitation',
      icon: 'elbow',
      difficulty_level: 1,
      suggested_duration_days: 56, // 8 weeks
      requires_medical_disclaimer: true,
      requires_professional_supervision: false,
      contraindications: ['ulnar nerve involvement', 'complete tear'],
      precautions: ['pain-free grip', 'restored strength', 'return to activities'],
      exercise_filter: { body_region: 'elbow', focus: ['eccentric_wrist_flexion'] },
    },
  ];

  for (const template of rehabTemplates) {
    await db.query(
      `INSERT INTO journey_templates (
        id, category_id, name, description, journey_type, icon, difficulty_level,
        suggested_duration_days, requires_medical_disclaimer,
        requires_professional_supervision, contraindications,
        precautions, exercise_filter
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING`,
      [
        template.id,
        template.category_id,
        template.name,
        template.description,
        template.journey_type,
        template.icon,
        template.difficulty_level,
        template.suggested_duration_days,
        template.requires_medical_disclaimer,
        template.requires_professional_supervision,
        template.contraindications,
        template.precautions,
        JSON.stringify(template.exercise_filter),
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
      apparatus: ['rings'],
      xp_reward: 300,
      achievement_criteria: '10 reps with strict form',
      prerequisite_milestone_ids: ['parallel_bar_dips'],
    },
    {
      id: 'rto_support',
      name: 'RTO Support Hold',
      description: 'Rings turned out support hold at 45+ degrees for 30 seconds.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 3,
      apparatus: ['rings'],
      xp_reward: 350,
      achievement_criteria: '30 second hold at 45+ degree RTO',
      prerequisite_milestone_ids: ['ring_support_hold'],
    },
    {
      id: 'rto_dips',
      name: 'RTO Dips',
      description: 'Ring dips maintaining rings turned out throughout the movement.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 4,
      apparatus: ['rings'],
      xp_reward: 500,
      achievement_criteria: '5 reps maintaining RTO throughout',
      prerequisite_milestone_ids: ['ring_dips_strict', 'rto_support'],
    },
    {
      id: 'bulgarian_dips',
      name: 'Bulgarian Dips',
      description: 'Deep ring dips with extreme shoulder extension.',
      category: 'pushing_power',
      subcategory: 'ring_pushing',
      difficulty_level: 4,
      apparatus: ['rings'],
      xp_reward: 450,
      achievement_criteria: '5 reps going below shoulder depth',
      prerequisite_milestone_ids: ['ring_dips_strict'],
    },
    {
      id: 'archer_pushups',
      name: 'Archer Push-ups',
      description: 'Wide push-ups shifting weight to one arm while the other extends.',
      category: 'pushing_power',
      subcategory: 'floor_pushing',
      difficulty_level: 3,
      apparatus: ['floor'],
      xp_reward: 250,
      achievement_criteria: '10 reps each side',
      prerequisite_milestone_ids: ['diamond_pushups'],
    },
    {
      id: 'pseudo_planche_pushups',
      name: 'Pseudo Planche Push-ups',
      description: 'Push-ups with hands by the hips, forward lean.',
      category: 'pushing_power',
      subcategory: 'floor_pushing',
      difficulty_level: 3,
      apparatus: ['floor'],
      xp_reward: 300,
      achievement_criteria: '10 reps with significant forward lean',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'maltese_pushups',
      name: 'Maltese Push-ups',
      description: 'Push-ups with arms straight out to the sides.',
      category: 'pushing_power',
      subcategory: 'floor_pushing',
      difficulty_level: 5,
      apparatus: ['floor'],
      xp_reward: 800,
      achievement_criteria: '3 reps with full maltese arm position',
      prerequisite_milestone_ids: ['planche_lean'],
    },

    // Rings Skills - additions
    {
      id: 'iron_cross',
      name: 'Iron Cross',
      description: 'Hold a cross position on rings with arms straight out.',
      category: 'rings_skills',
      subcategory: 'static_holds',
      difficulty_level: 5,
      apparatus: ['rings'],
      xp_reward: 1000,
      achievement_criteria: '3 second hold with arms horizontal',
      prerequisite_milestone_ids: ['iron_cross_negatives'],
    },
    {
      id: 'iron_cross_negatives',
      name: 'Iron Cross Negatives',
      description: 'Slow 5-second negative from support to cross position.',
      category: 'rings_skills',
      subcategory: 'static_holds',
      difficulty_level: 4,
      apparatus: ['rings'],
      xp_reward: 500,
      achievement_criteria: '5 reps with 5 second negatives',
      prerequisite_milestone_ids: ['rto_support'],
    },
    {
      id: 'azarian',
      name: 'Azarian',
      description: 'From back lever, press up to cross position.',
      category: 'rings_skills',
      subcategory: 'transitions',
      difficulty_level: 5,
      apparatus: ['rings'],
      xp_reward: 1200,
      achievement_criteria: '1 controlled rep',
      prerequisite_milestone_ids: ['iron_cross', 'back_lever'],
    },
    {
      id: 'ring_handstand',
      name: 'Ring Handstand',
      description: 'Hold a handstand on gymnastics rings.',
      category: 'rings_skills',
      subcategory: 'inversions',
      difficulty_level: 4,
      apparatus: ['rings'],
      xp_reward: 600,
      achievement_criteria: '10 second controlled hold',
      prerequisite_milestone_ids: ['freestanding_handstand', 'rto_support'],
    },
    {
      id: 'ring_muscle_up',
      name: 'Strict Ring Muscle-up',
      description: 'False grip muscle-up with no kip.',
      category: 'rings_skills',
      subcategory: 'transitions',
      difficulty_level: 4,
      apparatus: ['rings'],
      xp_reward: 500,
      achievement_criteria: '3 reps with no kip',
      prerequisite_milestone_ids: ['ring_dips_strict', 'false_grip_pullups'],
    },
    {
      id: 'victorian',
      name: 'Victorian',
      description: 'Hold an inverted cross position (upside-down cross).',
      category: 'rings_skills',
      subcategory: 'static_holds',
      difficulty_level: 5,
      apparatus: ['rings'],
      xp_reward: 1500,
      achievement_criteria: '2 second hold',
      prerequisite_milestone_ids: ['iron_cross', 'ring_handstand'],
    },
    {
      id: 'butterfly_mount',
      name: 'Butterfly Mount',
      description: 'Mount to support through a butterfly (wide arm) position.',
      category: 'rings_skills',
      subcategory: 'mounts',
      difficulty_level: 4,
      apparatus: ['rings'],
      xp_reward: 400,
      achievement_criteria: '3 clean reps',
      prerequisite_milestone_ids: ['muscle_up_bar'],
    },

    // Human Flag & Pole - additions
    {
      id: 'human_flag_tuck',
      name: 'Tuck Human Flag',
      description: 'Human flag with knees tucked to chest.',
      category: 'flag_pole',
      subcategory: 'progressions',
      difficulty_level: 3,
      apparatus: ['vertical_pole'],
      xp_reward: 350,
      achievement_criteria: '10 second hold',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'human_flag_straddle',
      name: 'Straddle Human Flag',
      description: 'Human flag with legs in straddle position.',
      category: 'flag_pole',
      subcategory: 'progressions',
      difficulty_level: 4,
      apparatus: ['vertical_pole'],
      xp_reward: 450,
      achievement_criteria: '5 second hold',
      prerequisite_milestone_ids: ['human_flag_tuck'],
    },
    {
      id: 'human_flag_full',
      name: 'Full Human Flag',
      description: 'Complete human flag with body horizontal, legs together.',
      category: 'flag_pole',
      subcategory: 'full_skills',
      difficulty_level: 5,
      apparatus: ['vertical_pole'],
      xp_reward: 700,
      achievement_criteria: '3 second hold with body horizontal',
      prerequisite_milestone_ids: ['human_flag_straddle'],
    },
    {
      id: 'dragon_flag_tuck',
      name: 'Tuck Dragon Flag',
      description: 'Dragon flag with knees tucked.',
      category: 'flag_pole',
      subcategory: 'dragon_flag',
      difficulty_level: 2,
      apparatus: ['bench'],
      xp_reward: 200,
      achievement_criteria: '10 reps',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'dragon_flag_straddle',
      name: 'Straddle Dragon Flag',
      description: 'Dragon flag with legs in straddle.',
      category: 'flag_pole',
      subcategory: 'dragon_flag',
      difficulty_level: 3,
      apparatus: ['bench'],
      xp_reward: 300,
      achievement_criteria: '5 reps',
      prerequisite_milestone_ids: ['dragon_flag_tuck'],
    },
    {
      id: 'dragon_flag_full',
      name: 'Full Dragon Flag',
      description: 'Complete dragon flag with straight body.',
      category: 'flag_pole',
      subcategory: 'dragon_flag',
      difficulty_level: 4,
      apparatus: ['bench'],
      xp_reward: 450,
      achievement_criteria: '3 reps with straight body',
      prerequisite_milestone_ids: ['dragon_flag_straddle'],
    },

    // Grip & Forearm - additions
    {
      id: 'one_arm_dead_hang',
      name: 'One-Arm Dead Hang',
      description: 'Hang from one arm for 30 seconds.',
      category: 'grip_forearm',
      subcategory: 'hanging',
      difficulty_level: 3,
      apparatus: ['pull_up_bar'],
      xp_reward: 300,
      achievement_criteria: '30 second hold each side',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'towel_pullups',
      name: 'Towel Pull-ups',
      description: 'Pull-ups gripping a towel draped over the bar.',
      category: 'grip_forearm',
      subcategory: 'grip_strength',
      difficulty_level: 3,
      apparatus: ['pull_up_bar'],
      xp_reward: 250,
      achievement_criteria: '10 reps',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'fingertip_pushups',
      name: 'Fingertip Push-ups',
      description: 'Push-ups supported only on fingertips.',
      category: 'grip_forearm',
      subcategory: 'finger_strength',
      difficulty_level: 3,
      apparatus: ['floor'],
      xp_reward: 250,
      achievement_criteria: '20 reps',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'dead_hang_2min',
      name: 'Two-Minute Dead Hang',
      description: 'Hang from a bar for 2 full minutes.',
      category: 'grip_forearm',
      subcategory: 'hanging',
      difficulty_level: 2,
      apparatus: ['pull_up_bar'],
      xp_reward: 200,
      achievement_criteria: '120 second hang',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'pinch_grip_hold',
      name: 'Pinch Grip Hold',
      description: 'Hold two 25lb plates pinched together for 30 seconds.',
      category: 'grip_forearm',
      subcategory: 'grip_strength',
      difficulty_level: 3,
      apparatus: ['weight_plates'],
      xp_reward: 250,
      achievement_criteria: '30 second hold with 25lb plates',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'rope_climb_legless',
      name: 'Legless Rope Climb',
      description: 'Climb a rope using only arms, no leg assistance.',
      category: 'grip_forearm',
      subcategory: 'climbing',
      difficulty_level: 4,
      apparatus: ['climbing_rope'],
      xp_reward: 400,
      achievement_criteria: 'Climb 15ft without legs',
      prerequisite_milestone_ids: [],
    },

    // Dynamic & Tumbling - additions
    {
      id: 'standing_back_tuck',
      name: 'Standing Back Tuck',
      description: 'Perform a standing backflip landing on feet.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 4,
      apparatus: ['floor'],
      xp_reward: 500,
      achievement_criteria: '3 reps landing on feet',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'standing_front_tuck',
      name: 'Standing Front Tuck',
      description: 'Perform a standing front flip landing on feet.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 4,
      apparatus: ['floor'],
      xp_reward: 450,
      achievement_criteria: '3 reps',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'aerial_cartwheel',
      name: 'Aerial Cartwheel',
      description: 'Perform a cartwheel without hands touching the ground.',
      category: 'dynamic_tumbling',
      subcategory: 'aerials',
      difficulty_level: 4,
      apparatus: ['floor'],
      xp_reward: 450,
      achievement_criteria: '3 reps each side',
      prerequisite_milestone_ids: [],
    },
    {
      id: 'webster',
      name: 'Webster',
      description: 'Front flip from one foot takeoff.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 5,
      apparatus: ['floor'],
      xp_reward: 600,
      achievement_criteria: '1 clean rep',
      prerequisite_milestone_ids: ['standing_front_tuck'],
    },
    {
      id: 'gainer',
      name: 'Gainer',
      description: 'Back flip traveling forward.',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 5,
      apparatus: ['floor'],
      xp_reward: 650,
      achievement_criteria: '1 clean rep',
      prerequisite_milestone_ids: ['standing_back_tuck'],
    },
    {
      id: 'side_flip',
      name: 'Side Flip',
      description: 'Flip rotating sideways (side somersault).',
      category: 'dynamic_tumbling',
      subcategory: 'flips',
      difficulty_level: 4,
      apparatus: ['floor'],
      xp_reward: 500,
      achievement_criteria: '3 reps each side',
      prerequisite_milestone_ids: [],
    },
  ];

  for (const milestone of additionalMilestones) {
    await db.query(
      `INSERT INTO skill_milestones (
        id, name, description, category, subcategory, difficulty_level,
        apparatus, xp_reward, achievement_criteria, prerequisite_milestone_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING`,
      [
        milestone.id,
        milestone.name,
        milestone.description,
        milestone.category,
        milestone.subcategory,
        milestone.difficulty_level,
        milestone.apparatus,
        milestone.xp_reward,
        milestone.achievement_criteria,
        milestone.prerequisite_milestone_ids,
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
