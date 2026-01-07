/**
 * Equipment Service
 *
 * Manages equipment types, location equipment (crowd-sourced), and user home equipment.
 * Implements consensus-based verification: equipment is verified when 3+ users report it present.
 */

import { db } from '../db/client';
import { loggers } from '../lib/logger';

const log = loggers.core;

// Minimum reports required for verification
const VERIFICATION_THRESHOLD = 3;

// =====================
// Types
// =====================
export interface EquipmentType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
}

export interface LocationEquipment {
  equipmentTypeId: string;
  equipmentName: string;
  category: string;
  confirmedCount: number;
  deniedCount: number;
  isVerified: boolean;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface EquipmentReport {
  id: number;
  hangoutId: string;
  equipmentTypeId: string;
  userId: string;
  reportType: 'present' | 'absent';
  notes: string | null;
  createdAt: string;
}

export interface UserHomeEquipment {
  id: number;
  userId: string;
  equipmentTypeId: string;
  equipmentName: string;
  category: string;
  locationType: 'home' | 'work' | 'other';
  notes: string | null;
}

// =====================
// Equipment Types (Reference Data)
// =====================

/**
 * Get all equipment types
 */
export async function getEquipmentTypes(): Promise<EquipmentType[]> {
  const rows = await db.queryAll<{
    id: string;
    name: string;
    category: string;
    description: string | null;
    icon_url: string | null;
    display_order: number;
  }>(`
    SELECT id, name, category, description, icon_url, display_order
    FROM equipment_types
    ORDER BY display_order, name
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    iconUrl: row.icon_url,
    displayOrder: row.display_order,
  }));
}

/**
 * Get equipment types by category
 */
export async function getEquipmentTypesByCategory(
  category: string
): Promise<EquipmentType[]> {
  const rows = await db.queryAll<{
    id: string;
    name: string;
    category: string;
    description: string | null;
    icon_url: string | null;
    display_order: number;
  }>(
    `
    SELECT id, name, category, description, icon_url, display_order
    FROM equipment_types
    WHERE category = $1
    ORDER BY display_order, name
  `,
    [category]
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    iconUrl: row.icon_url,
    displayOrder: row.display_order,
  }));
}

/**
 * Get equipment categories
 */
export async function getEquipmentCategories(): Promise<string[]> {
  const rows = await db.queryAll<{ category: string }>(`
    SELECT DISTINCT category FROM equipment_types ORDER BY category
  `);
  return rows.map((r) => r.category);
}

// =====================
// Location Equipment (Crowd-Sourced)
// =====================

/**
 * Get equipment at a specific location (hangout)
 */
export async function getLocationEquipment(
  hangoutId: string
): Promise<LocationEquipment[]> {
  const rows = await db.queryAll<{
    equipment_type_id: string;
    name: string;
    category: string;
    confirmed_count: number;
    denied_count: number;
    is_verified: boolean;
    first_reported_at: string;
    last_reported_at: string;
  }>(
    `
    SELECT
      le.equipment_type_id,
      et.name,
      et.category,
      le.confirmed_count,
      le.denied_count,
      le.is_verified,
      le.first_reported_at,
      le.last_reported_at
    FROM location_equipment le
    JOIN equipment_types et ON et.id = le.equipment_type_id
    WHERE le.hangout_id = $1
    ORDER BY le.is_verified DESC, le.confirmed_count DESC, et.display_order
  `,
    [hangoutId]
  );

  return rows.map((row) => ({
    equipmentTypeId: row.equipment_type_id,
    equipmentName: row.name,
    category: row.category,
    confirmedCount: row.confirmed_count,
    deniedCount: row.denied_count,
    isVerified: row.is_verified,
    firstReportedAt: row.first_reported_at,
    lastReportedAt: row.last_reported_at,
  }));
}

/**
 * Get verified equipment at a location (for workout recommendations)
 */
export async function getVerifiedLocationEquipment(
  hangoutId: string
): Promise<string[]> {
  const rows = await db.queryAll<{ equipment_type_id: string }>(
    `
    SELECT equipment_type_id
    FROM location_equipment
    WHERE hangout_id = $1 AND is_verified = TRUE
  `,
    [hangoutId]
  );
  return rows.map((r) => r.equipment_type_id);
}

/**
 * Report equipment at a location
 * Implements consensus logic: updates aggregate counts and verification status
 */
export async function reportEquipment(
  userId: string,
  hangoutId: string,
  equipmentTypeIds: string[],
  reportType: 'present' | 'absent'
): Promise<void> {
  log.info(
    { userId, hangoutId, equipmentTypeIds, reportType },
    'Reporting equipment at location'
  );

  for (const equipmentTypeId of equipmentTypeIds) {
    // Upsert user's individual report
    await db.query(
      `
      INSERT INTO equipment_reports (hangout_id, equipment_type_id, user_id, report_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (hangout_id, equipment_type_id, user_id)
      DO UPDATE SET report_type = $4, created_at = NOW()
    `,
      [hangoutId, equipmentTypeId, userId, reportType]
    );

    // Count all reports for this equipment at this location
    const counts = await db.queryOne<{
      present_count: string;
      absent_count: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE report_type = 'present') as present_count,
        COUNT(*) FILTER (WHERE report_type = 'absent') as absent_count
      FROM equipment_reports
      WHERE hangout_id = $1 AND equipment_type_id = $2
    `,
      [hangoutId, equipmentTypeId]
    );

    const confirmedCount = parseInt(counts?.present_count || '0');
    const deniedCount = parseInt(counts?.absent_count || '0');
    const isVerified = confirmedCount >= VERIFICATION_THRESHOLD;

    // Upsert aggregate record
    await db.query(
      `
      INSERT INTO location_equipment (hangout_id, equipment_type_id, confirmed_count, denied_count, is_verified, last_reported_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (hangout_id, equipment_type_id)
      DO UPDATE SET
        confirmed_count = $3,
        denied_count = $4,
        is_verified = $5,
        last_reported_at = NOW()
    `,
      [hangoutId, equipmentTypeId, confirmedCount, deniedCount, isVerified]
    );

    if (isVerified) {
      log.info(
        { hangoutId, equipmentTypeId, confirmedCount },
        'Equipment verified at location'
      );
    }
  }
}

/**
 * Get user's existing reports for a location
 */
export async function getUserReportsForLocation(
  userId: string,
  hangoutId: string
): Promise<{ equipmentTypeId: string; reportType: 'present' | 'absent' }[]> {
  const rows = await db.queryAll<{
    equipment_type_id: string;
    report_type: 'present' | 'absent';
  }>(
    `
    SELECT equipment_type_id, report_type
    FROM equipment_reports
    WHERE user_id = $1 AND hangout_id = $2
  `,
    [userId, hangoutId]
  );

  return rows.map((r) => ({
    equipmentTypeId: r.equipment_type_id,
    reportType: r.report_type,
  }));
}

// =====================
// User Home Equipment
// =====================

/**
 * Get user's home equipment
 */
export async function getUserHomeEquipment(
  userId: string,
  locationType?: 'home' | 'work' | 'other'
): Promise<UserHomeEquipment[]> {
  const whereClause = locationType
    ? `WHERE uhe.user_id = $1 AND uhe.location_type = $2`
    : `WHERE uhe.user_id = $1`;
  const params = locationType ? [userId, locationType] : [userId];

  const rows = await db.queryAll<{
    id: number;
    user_id: string;
    equipment_type_id: string;
    name: string;
    category: string;
    location_type: 'home' | 'work' | 'other';
    notes: string | null;
  }>(
    `
    SELECT
      uhe.id,
      uhe.user_id,
      uhe.equipment_type_id,
      et.name,
      et.category,
      uhe.location_type,
      uhe.notes
    FROM user_home_equipment uhe
    JOIN equipment_types et ON et.id = uhe.equipment_type_id
    ${whereClause}
    ORDER BY et.display_order, et.name
  `,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    equipmentTypeId: row.equipment_type_id,
    equipmentName: row.name,
    category: row.category,
    locationType: row.location_type,
    notes: row.notes,
  }));
}

/**
 * Set user's home equipment (replaces existing for the location type)
 */
export async function setUserHomeEquipment(
  userId: string,
  equipmentTypeIds: string[],
  locationType: 'home' | 'work' | 'other' = 'home'
): Promise<void> {
  log.info(
    { userId, equipmentTypeIds, locationType },
    'Setting user home equipment'
  );

  // Delete existing equipment for this location type
  await db.query(
    `DELETE FROM user_home_equipment WHERE user_id = $1 AND location_type = $2`,
    [userId, locationType]
  );

  // Insert new equipment
  for (const equipmentTypeId of equipmentTypeIds) {
    await db.query(
      `
      INSERT INTO user_home_equipment (user_id, equipment_type_id, location_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, equipment_type_id, location_type) DO NOTHING
    `,
      [userId, equipmentTypeId, locationType]
    );
  }
}

/**
 * Add single equipment to user's home
 */
export async function addUserHomeEquipment(
  userId: string,
  equipmentTypeId: string,
  locationType: 'home' | 'work' | 'other' = 'home',
  notes?: string
): Promise<void> {
  await db.query(
    `
    INSERT INTO user_home_equipment (user_id, equipment_type_id, location_type, notes)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, equipment_type_id, location_type)
    DO UPDATE SET notes = COALESCE($4, user_home_equipment.notes)
  `,
    [userId, equipmentTypeId, locationType, notes || null]
  );
}

/**
 * Remove equipment from user's home
 */
export async function removeUserHomeEquipment(
  userId: string,
  equipmentTypeId: string,
  locationType: 'home' | 'work' | 'other' = 'home'
): Promise<void> {
  await db.query(
    `DELETE FROM user_home_equipment WHERE user_id = $1 AND equipment_type_id = $2 AND location_type = $3`,
    [userId, equipmentTypeId, locationType]
  );
}

/**
 * Get equipment IDs for user's home (simple list)
 */
export async function getUserHomeEquipmentIds(
  userId: string,
  locationType?: 'home' | 'work' | 'other'
): Promise<string[]> {
  const whereClause = locationType
    ? `WHERE user_id = $1 AND location_type = $2`
    : `WHERE user_id = $1`;
  const params = locationType ? [userId, locationType] : [userId];

  const rows = await db.queryAll<{ equipment_type_id: string }>(
    `SELECT equipment_type_id FROM user_home_equipment ${whereClause}`,
    params
  );
  return rows.map((r) => r.equipment_type_id);
}
