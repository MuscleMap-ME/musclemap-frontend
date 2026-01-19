/**
 * Preferences Service
 *
 * Business logic for user preferences, profiles, dashboard layouts,
 * sound packs, hydration tracking, and device settings.
 *
 * Uses raw SQL queries with the pg pool client (no Knex).
 */

import { queryOne, queryAll, execute } from '../db/client.js';
import {
  UserPreferences,
  PreferenceProfile,
  DashboardWidget,
  DashboardLayoutConfig,
  WidgetDefinition,
  SoundPack,
  DeviceSettings,
  HydrationLog,
  DEFAULT_PREFERENCES,
  mergeWithDefaults,
  applyProfileOverrides,
  Platform,
  HydrationSource,
} from '@musclemap/shared';

// ============================================
// USER PREFERENCES
// ============================================

interface UserPreferencesRow {
  id: string;
  user_id: string;
  preferences: string | UserPreferences;
  active_profile_id: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export async function getUserPreferences(userId: string): Promise<{
  preferences: UserPreferences;
  activeProfileId: string | null;
  version: number;
}> {
  const row = await queryOne<UserPreferencesRow>(
    `SELECT * FROM user_preferences WHERE user_id = $1`,
    [userId]
  );

  if (!row) {
    // Create default preferences for user
    const id = `pref_${Date.now()}`;
    await execute(
      `INSERT INTO user_preferences (id, user_id, preferences, version)
       VALUES ($1, $2, $3, 1)`,
      [id, userId, JSON.stringify(DEFAULT_PREFERENCES)]
    );

    return {
      preferences: DEFAULT_PREFERENCES,
      activeProfileId: null,
      version: 1,
    };
  }

  // Parse preferences and merge with defaults to ensure all fields exist
  const storedPrefs = typeof row.preferences === 'string'
    ? JSON.parse(row.preferences)
    : row.preferences;

  return {
    preferences: mergeWithDefaults(storedPrefs),
    activeProfileId: row.active_profile_id,
    version: row.version,
  };
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<UserPreferences>
): Promise<{ preferences: UserPreferences; version: number }> {
  // Get current preferences
  const current = await getUserPreferences(userId);

  // Deep merge updates
  const merged: UserPreferences = {
    coaching: { ...current.preferences.coaching, ...updates.coaching },
    guidanceLevel: updates.guidanceLevel ?? current.preferences.guidanceLevel,
    dashboard: { ...current.preferences.dashboard, ...updates.dashboard },
    notifications: { ...current.preferences.notifications, ...updates.notifications },
    hydration: { ...current.preferences.hydration, ...updates.hydration },
    sounds: { ...current.preferences.sounds, ...updates.sounds },
    workout: { ...current.preferences.workout, ...updates.workout },
    display: { ...current.preferences.display, ...updates.display },
    units: { ...current.preferences.units, ...updates.units },
    privacy: { ...current.preferences.privacy, ...updates.privacy },
    music: { ...current.preferences.music, ...updates.music },
  };

  const newVersion = current.version + 1;

  await execute(
    `UPDATE user_preferences
     SET preferences = $1, version = $2, updated_at = NOW()
     WHERE user_id = $3`,
    [JSON.stringify(merged), newVersion, userId]
  );

  return { preferences: merged, version: newVersion };
}

export async function resetUserPreferences(userId: string): Promise<UserPreferences> {
  await execute(
    `UPDATE user_preferences
     SET preferences = $1, version = version + 1, updated_at = NOW()
     WHERE user_id = $2`,
    [JSON.stringify(DEFAULT_PREFERENCES), userId]
  );

  return DEFAULT_PREFERENCES;
}

export async function getEffectivePreferences(userId: string): Promise<UserPreferences> {
  const { preferences, activeProfileId } = await getUserPreferences(userId);

  if (!activeProfileId) {
    return preferences;
  }

  // Get active profile overrides
  const profile = await queryOne<ProfileRow>(
    `SELECT * FROM user_preference_profiles
     WHERE id = $1 AND user_id = $2`,
    [activeProfileId, userId]
  );

  if (!profile) {
    return preferences;
  }

  const overrides = typeof profile.preferences_override === 'string'
    ? JSON.parse(profile.preferences_override)
    : profile.preferences_override;

  return applyProfileOverrides(preferences, overrides);
}

// ============================================
// PREFERENCE PROFILES
// ============================================

interface ProfileRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  preferences_override: string | Partial<UserPreferences>;
  auto_activate_rules: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export async function listProfiles(userId: string): Promise<PreferenceProfile[]> {
  const rows = await queryAll<ProfileRow>(
    `SELECT * FROM user_preference_profiles
     WHERE user_id = $1
     ORDER BY sort_order ASC`,
    [userId]
  );

  return rows.map(mapProfileRow);
}

export async function getProfile(userId: string, profileId: string): Promise<PreferenceProfile | null> {
  const row = await queryOne<ProfileRow>(
    `SELECT * FROM user_preference_profiles
     WHERE id = $1 AND user_id = $2`,
    [profileId, userId]
  );

  return row ? mapProfileRow(row) : null;
}

export async function createProfile(
  userId: string,
  data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    preferencesOverride?: Partial<UserPreferences>;
    isDefault?: boolean;
  }
): Promise<PreferenceProfile> {
  const id = `profile_${Date.now()}`;

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await execute(
      `UPDATE user_preference_profiles SET is_default = false WHERE user_id = $1`,
      [userId]
    );
  }

  const maxSortResult = await queryOne<{ max: number | null }>(
    `SELECT MAX(sort_order) as max FROM user_preference_profiles WHERE user_id = $1`,
    [userId]
  );
  const maxSort = maxSortResult?.max ?? 0;

  const row = await queryOne<ProfileRow>(
    `INSERT INTO user_preference_profiles
       (id, user_id, name, description, icon, color, preferences_override, is_default, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      userId,
      data.name,
      data.description || null,
      data.icon || 'settings',
      data.color || '#3B82F6',
      JSON.stringify(data.preferencesOverride || {}),
      data.isDefault || false,
      maxSort + 1,
    ]
  );

  if (!row) {
    throw new Error('Failed to create profile');
  }

  return mapProfileRow(row);
}

export async function updateProfile(
  userId: string,
  profileId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    preferencesOverride?: Partial<UserPreferences>;
    isDefault?: boolean;
    sortOrder?: number;
  }
): Promise<PreferenceProfile | null> {
  // If setting as default, unset other defaults
  if (data.isDefault) {
    await execute(
      `UPDATE user_preference_profiles SET is_default = false
       WHERE user_id = $1 AND id != $2`,
      [userId, profileId]
    );
  }

  // Build dynamic update
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(data.description);
  }
  if (data.icon !== undefined) {
    updates.push(`icon = $${paramCount++}`);
    values.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramCount++}`);
    values.push(data.color);
  }
  if (data.preferencesOverride !== undefined) {
    updates.push(`preferences_override = $${paramCount++}`);
    values.push(JSON.stringify(data.preferencesOverride));
  }
  if (data.isDefault !== undefined) {
    updates.push(`is_default = $${paramCount++}`);
    values.push(data.isDefault);
  }
  if (data.sortOrder !== undefined) {
    updates.push(`sort_order = $${paramCount++}`);
    values.push(data.sortOrder);
  }

  if (updates.length === 0) {
    return getProfile(userId, profileId);
  }

  updates.push(`updated_at = NOW()`);
  values.push(profileId, userId);

  const row = await queryOne<ProfileRow>(
    `UPDATE user_preference_profiles
     SET ${updates.join(', ')}
     WHERE id = $${paramCount++} AND user_id = $${paramCount}
     RETURNING *`,
    values
  );

  return row ? mapProfileRow(row) : null;
}

export async function deleteProfile(userId: string, profileId: string): Promise<boolean> {
  // Clear active profile if this one is active
  await execute(
    `UPDATE user_preferences
     SET active_profile_id = NULL
     WHERE user_id = $1 AND active_profile_id = $2`,
    [userId, profileId]
  );

  const deleted = await execute(
    `DELETE FROM user_preference_profiles WHERE id = $1 AND user_id = $2`,
    [profileId, userId]
  );

  return deleted > 0;
}

export async function activateProfile(userId: string, profileId: string): Promise<boolean> {
  // Verify profile exists and belongs to user
  const profile = await queryOne<{ id: string }>(
    `SELECT id FROM user_preference_profiles WHERE id = $1 AND user_id = $2`,
    [profileId, userId]
  );

  if (!profile) {
    return false;
  }

  await execute(
    `UPDATE user_preferences SET active_profile_id = $1 WHERE user_id = $2`,
    [profileId, userId]
  );

  return true;
}

export async function deactivateProfile(userId: string): Promise<void> {
  await execute(
    `UPDATE user_preferences SET active_profile_id = NULL WHERE user_id = $1`,
    [userId]
  );
}

function mapProfileRow(row: ProfileRow): PreferenceProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon,
    color: row.color,
    preferencesOverride: typeof row.preferences_override === 'string'
      ? JSON.parse(row.preferences_override)
      : row.preferences_override,
    autoActivateRules: row.auto_activate_rules
      ? (typeof row.auto_activate_rules === 'string'
          ? JSON.parse(row.auto_activate_rules)
          : row.auto_activate_rules)
      : undefined,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ============================================
// DASHBOARD LAYOUTS
// ============================================

interface LayoutRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  widgets: string | DashboardWidget[];
  columns: number;
  row_height: number;
  platform: Platform;
  created_at: Date;
  updated_at: Date;
}

export async function getDashboardLayout(
  userId: string,
  platform: Platform = 'web',
  profileId?: string
): Promise<DashboardLayoutConfig | null> {
  let row: LayoutRow | undefined;

  if (profileId) {
    row = await queryOne<LayoutRow>(
      `SELECT * FROM user_dashboard_layouts
       WHERE user_id = $1 AND platform = $2 AND profile_id = $3`,
      [userId, platform, profileId]
    );
  } else {
    row = await queryOne<LayoutRow>(
      `SELECT * FROM user_dashboard_layouts
       WHERE user_id = $1 AND platform = $2 AND profile_id IS NULL`,
      [userId, platform]
    );
  }

  return row ? mapLayoutRow(row) : null;
}

export async function saveDashboardLayout(
  userId: string,
  data: {
    widgets: DashboardWidget[];
    columns?: number;
    rowHeight?: number;
    platform?: Platform;
    profileId?: string;
  }
): Promise<DashboardLayoutConfig> {
  const platform = data.platform || 'web';
  const profileId = data.profileId || null;

  // Upsert layout
  const existing = await getDashboardLayout(userId, platform, profileId || undefined);

  if (existing) {
    const row = await queryOne<LayoutRow>(
      `UPDATE user_dashboard_layouts
       SET widgets = $1, columns = $2, row_height = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        JSON.stringify(data.widgets),
        data.columns || existing.columns,
        data.rowHeight || existing.rowHeight,
        existing.id,
      ]
    );

    if (!row) {
      throw new Error('Failed to update layout');
    }

    return mapLayoutRow(row);
  } else {
    const id = `layout_${Date.now()}`;
    const row = await queryOne<LayoutRow>(
      `INSERT INTO user_dashboard_layouts
         (id, user_id, profile_id, widgets, columns, row_height, platform)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        userId,
        profileId,
        JSON.stringify(data.widgets),
        data.columns || 12,
        data.rowHeight || 100,
        platform,
      ]
    );

    if (!row) {
      throw new Error('Failed to create layout');
    }

    return mapLayoutRow(row);
  }
}

interface WidgetRow {
  id: string;
  name: string;
  description: string | null;
  category: WidgetDefinition['category'];
  default_width: number;
  default_height: number;
  min_width: number;
  min_height: number;
  max_width: number;
  max_height: number;
  is_premium: boolean;
  is_enabled: boolean;
  sort_order: number;
}

export async function getAvailableWidgets(): Promise<WidgetDefinition[]> {
  const rows = await queryAll<WidgetRow>(
    `SELECT * FROM dashboard_widget_registry
     WHERE is_enabled = true
     ORDER BY sort_order ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category,
    defaultWidth: row.default_width,
    defaultHeight: row.default_height,
    minWidth: row.min_width,
    minHeight: row.min_height,
    maxWidth: row.max_width,
    maxHeight: row.max_height,
    isPremium: row.is_premium,
    isEnabled: row.is_enabled,
    sortOrder: row.sort_order,
  }));
}

function mapLayoutRow(row: LayoutRow): DashboardLayoutConfig {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id ?? undefined,
    widgets: typeof row.widgets === 'string' ? JSON.parse(row.widgets) : row.widgets,
    columns: row.columns,
    rowHeight: row.row_height,
    platform: row.platform,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ============================================
// SOUND PACKS
// ============================================

interface SystemSoundPackRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  sounds: string | SoundPack['sounds'];
  is_premium: boolean;
  sort_order: number;
}

interface UserSoundPackRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sounds: string | SoundPack['sounds'];
  is_public: boolean;
}

export async function getSystemSoundPacks(): Promise<SoundPack[]> {
  const rows = await queryAll<SystemSoundPackRow>(
    `SELECT * FROM system_sound_packs ORDER BY sort_order ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    sounds: typeof row.sounds === 'string' ? JSON.parse(row.sounds) : row.sounds,
    isPremium: row.is_premium,
    isPublic: true,
    userId: undefined,
  }));
}

export async function getUserSoundPacks(userId: string): Promise<SoundPack[]> {
  const rows = await queryAll<UserSoundPackRow>(
    `SELECT * FROM user_sound_packs WHERE user_id = $1`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sounds: typeof row.sounds === 'string' ? JSON.parse(row.sounds) : row.sounds,
    isPremium: false,
    isPublic: row.is_public,
    userId: row.user_id,
  }));
}

export async function createUserSoundPack(
  userId: string,
  data: {
    name: string;
    description?: string;
    sounds: SoundPack['sounds'];
    isPublic?: boolean;
  }
): Promise<SoundPack> {
  const id = `sound_${Date.now()}`;

  const row = await queryOne<UserSoundPackRow>(
    `INSERT INTO user_sound_packs (id, user_id, name, description, sounds, is_public)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id,
      userId,
      data.name,
      data.description || null,
      JSON.stringify(data.sounds),
      data.isPublic || false,
    ]
  );

  if (!row) {
    throw new Error('Failed to create sound pack');
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sounds: typeof row.sounds === 'string' ? JSON.parse(row.sounds) : row.sounds,
    isPremium: false,
    isPublic: row.is_public,
    userId: row.user_id,
  };
}

export async function deleteUserSoundPack(userId: string, packId: string): Promise<boolean> {
  const deleted = await execute(
    `DELETE FROM user_sound_packs WHERE id = $1 AND user_id = $2`,
    [packId, userId]
  );

  return deleted > 0;
}

// ============================================
// HYDRATION TRACKING
// ============================================

interface HydrationLogRow {
  id: string;
  user_id: string;
  amount_oz: number | string;
  workout_session_id: string | null;
  source: HydrationSource;
  logged_at: Date;
}

export async function logHydration(
  userId: string,
  amountOz: number,
  workoutSessionId?: string,
  source: HydrationSource = 'manual'
): Promise<HydrationLog> {
  const id = `hydration_${Date.now()}`;

  const row = await queryOne<HydrationLogRow>(
    `INSERT INTO user_hydration_logs (id, user_id, amount_oz, workout_session_id, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, userId, amountOz, workoutSessionId || null, source]
  );

  if (!row) {
    throw new Error('Failed to log hydration');
  }

  return {
    id: row.id,
    userId: row.user_id,
    amountOz: typeof row.amount_oz === 'string' ? parseFloat(row.amount_oz) : row.amount_oz,
    workoutSessionId: row.workout_session_id ?? undefined,
    source: row.source,
    loggedAt: row.logged_at.toISOString(),
  };
}

export async function getTodayHydration(userId: string): Promise<{
  logs: HydrationLog[];
  totalOz: number;
}> {
  const rows = await queryAll<HydrationLogRow>(
    `SELECT * FROM user_hydration_logs
     WHERE user_id = $1 AND logged_at >= CURRENT_DATE
     ORDER BY logged_at DESC`,
    [userId]
  );

  const logs: HydrationLog[] = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    amountOz: typeof row.amount_oz === 'string' ? parseFloat(row.amount_oz) : row.amount_oz,
    workoutSessionId: row.workout_session_id ?? undefined,
    source: row.source,
    loggedAt: row.logged_at.toISOString(),
  }));

  const totalOz = logs.reduce((sum, log) => sum + log.amountOz, 0);

  return { logs, totalOz };
}

export async function getHydrationHistory(
  userId: string,
  days: number = 7
): Promise<{ date: string; totalOz: number }[]> {
  const rows = await queryAll<{ date: Date; total: string | number }>(
    `SELECT date_trunc('day', logged_at) as date, SUM(amount_oz) as total
     FROM user_hydration_logs
     WHERE user_id = $1 AND logged_at >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY date_trunc('day', logged_at)
     ORDER BY date DESC`,
    [userId]
  );

  return rows.map((row) => ({
    date: row.date.toISOString().split('T')[0],
    totalOz: typeof row.total === 'string' ? parseFloat(row.total) : row.total ?? 0,
  }));
}

// ============================================
// DEVICE SETTINGS
// ============================================

interface DeviceRow {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  platform: Platform;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  settings_override: string | Partial<UserPreferences> | null;
  sync_enabled: boolean;
  last_sync_at: Date | null;
  push_token: string | null;
  push_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listDevices(userId: string): Promise<DeviceSettings[]> {
  const rows = await queryAll<DeviceRow>(
    `SELECT * FROM user_device_settings
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map(mapDeviceRow);
}

export async function registerDevice(
  userId: string,
  data: {
    deviceId: string;
    deviceName?: string;
    platform: Platform;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    pushToken?: string;
  }
): Promise<DeviceSettings> {
  // Upsert device
  const existing = await queryOne<DeviceRow>(
    `SELECT * FROM user_device_settings WHERE user_id = $1 AND device_id = $2`,
    [userId, data.deviceId]
  );

  if (existing) {
    const row = await queryOne<DeviceRow>(
      `UPDATE user_device_settings
       SET device_name = COALESCE($1, device_name),
           platform = $2,
           device_model = COALESCE($3, device_model),
           os_version = COALESCE($4, os_version),
           app_version = COALESCE($5, app_version),
           push_token = COALESCE($6, push_token),
           last_sync_at = NOW(),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        data.deviceName || null,
        data.platform,
        data.deviceModel || null,
        data.osVersion || null,
        data.appVersion || null,
        data.pushToken || null,
        existing.id,
      ]
    );

    if (!row) {
      throw new Error('Failed to update device');
    }

    return mapDeviceRow(row);
  } else {
    const id = `device_${Date.now()}`;
    const row = await queryOne<DeviceRow>(
      `INSERT INTO user_device_settings
         (id, user_id, device_id, device_name, platform, device_model, os_version, app_version, push_token, last_sync_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        id,
        userId,
        data.deviceId,
        data.deviceName || null,
        data.platform,
        data.deviceModel || null,
        data.osVersion || null,
        data.appVersion || null,
        data.pushToken || null,
      ]
    );

    if (!row) {
      throw new Error('Failed to register device');
    }

    return mapDeviceRow(row);
  }
}

export async function updateDeviceSettings(
  userId: string,
  deviceId: string,
  data: {
    deviceName?: string;
    settingsOverride?: Partial<UserPreferences>;
    syncEnabled?: boolean;
    pushEnabled?: boolean;
    pushToken?: string;
  }
): Promise<DeviceSettings | null> {
  // Build dynamic update
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (data.deviceName !== undefined) {
    updates.push(`device_name = $${paramCount++}`);
    values.push(data.deviceName);
  }
  if (data.settingsOverride !== undefined) {
    updates.push(`settings_override = $${paramCount++}`);
    values.push(JSON.stringify(data.settingsOverride));
  }
  if (data.syncEnabled !== undefined) {
    updates.push(`sync_enabled = $${paramCount++}`);
    values.push(data.syncEnabled);
  }
  if (data.pushEnabled !== undefined) {
    updates.push(`push_enabled = $${paramCount++}`);
    values.push(data.pushEnabled);
  }
  if (data.pushToken !== undefined) {
    updates.push(`push_token = $${paramCount++}`);
    values.push(data.pushToken);
  }

  if (updates.length === 0) {
    const existing = await queryOne<DeviceRow>(
      `SELECT * FROM user_device_settings WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );
    return existing ? mapDeviceRow(existing) : null;
  }

  updates.push(`updated_at = NOW()`);
  values.push(userId, deviceId);

  const row = await queryOne<DeviceRow>(
    `UPDATE user_device_settings
     SET ${updates.join(', ')}
     WHERE user_id = $${paramCount++} AND device_id = $${paramCount}
     RETURNING *`,
    values
  );

  return row ? mapDeviceRow(row) : null;
}

export async function removeDevice(userId: string, deviceId: string): Promise<boolean> {
  const deleted = await execute(
    `DELETE FROM user_device_settings WHERE user_id = $1 AND device_id = $2`,
    [userId, deviceId]
  );

  return deleted > 0;
}

export async function syncDevice(
  userId: string,
  deviceId: string
): Promise<{ preferences: UserPreferences; lastSyncAt: string }> {
  const preferences = await getEffectivePreferences(userId);

  await execute(
    `UPDATE user_device_settings SET last_sync_at = NOW() WHERE user_id = $1 AND device_id = $2`,
    [userId, deviceId]
  );

  return {
    preferences,
    lastSyncAt: new Date().toISOString(),
  };
}

function mapDeviceRow(row: DeviceRow): DeviceSettings {
  return {
    id: row.id,
    userId: row.user_id,
    deviceId: row.device_id,
    deviceName: row.device_name ?? undefined,
    platform: row.platform,
    deviceModel: row.device_model ?? undefined,
    osVersion: row.os_version ?? undefined,
    appVersion: row.app_version ?? undefined,
    settingsOverride: row.settings_override
      ? (typeof row.settings_override === 'string'
          ? JSON.parse(row.settings_override)
          : row.settings_override)
      : {},
    syncEnabled: row.sync_enabled,
    lastSyncAt: row.last_sync_at?.toISOString(),
    pushToken: row.push_token ?? undefined,
    pushEnabled: row.push_enabled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
