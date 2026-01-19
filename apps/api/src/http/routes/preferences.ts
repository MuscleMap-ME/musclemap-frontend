/**
 * Preferences API Routes
 *
 * Comprehensive API for user preferences, profiles, dashboard layouts,
 * sound packs, hydration tracking, and device settings.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth.js';
import * as preferencesService from '../../services/preferences.service.js';
import type {
  UserPreferences,
  Platform,
  HydrationSource,
  DashboardWidget,
} from '@musclemap/shared';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updatePreferencesSchema = z.object({
  coaching: z.object({
    maxCoachVisible: z.boolean().optional(),
    mascotVisible: z.boolean().optional(),
    coachTipsEnabled: z.boolean().optional(),
    motivationalQuotes: z.boolean().optional(),
    formCuesEnabled: z.boolean().optional(),
    voiceGuidanceEnabled: z.boolean().optional(),
  }).optional(),
  guidanceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  dashboard: z.object({
    layout: z.enum(['default', 'compact', 'detailed', 'custom']).optional(),
    showQuickActions: z.boolean().optional(),
    showDailyTip: z.boolean().optional(),
    showMilestones: z.boolean().optional(),
    showAdventureMap: z.boolean().optional(),
    showMuscleMap: z.boolean().optional(),
    showNutrition: z.boolean().optional(),
    showChallenges: z.boolean().optional(),
    showInsights: z.boolean().optional(),
    showActivity: z.boolean().optional(),
    showHydration: z.boolean().optional(),
    showMusicPlayer: z.boolean().optional(),
    showCoachTips: z.boolean().optional(),
    showXpProgress: z.boolean().optional(),
    showDailyQuests: z.boolean().optional(),
  }).optional(),
  notifications: z.object({
    achievementsEnabled: z.boolean().optional(),
    goalSuccessEnabled: z.boolean().optional(),
    workoutReminders: z.boolean().optional(),
    socialNotifications: z.boolean().optional(),
    systemAnnouncements: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
  }).optional(),
  hydration: z.object({
    enabled: z.boolean().optional(),
    intervalMinutes: z.number().min(1).max(120).optional(),
    soundEnabled: z.boolean().optional(),
    vibrationEnabled: z.boolean().optional(),
    showDuringWorkout: z.boolean().optional(),
    showOutsideWorkout: z.boolean().optional(),
    dailyGoalOz: z.number().min(8).max(256).optional(),
  }).optional(),
  sounds: z.object({
    masterVolume: z.number().min(0).max(1).optional(),
    timerSoundEnabled: z.boolean().optional(),
    timerSoundType: z.enum(['beep', 'chime', 'bell', 'custom']).optional(),
    timerVibrationEnabled: z.boolean().optional(),
    metronomeEnabled: z.boolean().optional(),
    metronomeBpm: z.number().min(20).max(300).optional(),
    metronomeAccent: z.number().min(1).max(16).optional(),
    repCountSoundEnabled: z.boolean().optional(),
    setCompleteSoundEnabled: z.boolean().optional(),
    workoutCompleteSoundEnabled: z.boolean().optional(),
    achievementSoundEnabled: z.boolean().optional(),
    customSoundPackId: z.string().nullable().optional(),
    systemSoundPackId: z.string().optional(),
  }).optional(),
  workout: z.object({
    defaultRestSeconds: z.number().min(5).max(600).optional(),
    autoStartTimer: z.boolean().optional(),
    showFloatingTimer: z.boolean().optional(),
    countdownWarningSeconds: z.number().min(0).max(60).optional(),
    warmupReminder: z.boolean().optional(),
    cooldownReminder: z.boolean().optional(),
    stretchReminder: z.boolean().optional(),
    quickAdjustAmount: z.number().min(5).max(60).optional(),
  }).optional(),
  display: z.object({
    theme: z.string().optional(),
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    textSize: z.enum(['small', 'normal', 'large', 'xlarge']).optional(),
    colorBlindMode: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).optional(),
    animationsEnabled: z.boolean().optional(),
  }).optional(),
  units: z.object({
    weight: z.enum(['lbs', 'kg']).optional(),
    distance: z.enum(['mi', 'km']).optional(),
    height: z.enum(['ft_in', 'cm']).optional(),
    temperature: z.enum(['f', 'c']).optional(),
  }).optional(),
  privacy: z.object({
    publicProfile: z.boolean().optional(),
    showLocation: z.boolean().optional(),
    showProgress: z.boolean().optional(),
    showWorkoutDetails: z.boolean().optional(),
    showOnLeaderboards: z.boolean().optional(),
    showAchievementsOnProfile: z.boolean().optional(),
  }).optional(),
  music: z.object({
    autoPlayOnWorkout: z.boolean().optional(),
    bpmMatchingEnabled: z.boolean().optional(),
    defaultProvider: z.enum(['spotify', 'apple_music', 'youtube_music']).nullable().optional(),
    defaultPlaylistId: z.string().nullable().optional(),
    fadeOnRest: z.boolean().optional(),
    volumeReductionOnTips: z.boolean().optional(),
    tipVolumeReduction: z.number().min(0).max(1).optional(),
  }).optional(),
});

const createProfileSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  preferencesOverride: updatePreferencesSchema.optional(),
  isDefault: z.boolean().optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  preferencesOverride: updatePreferencesSchema.optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().min(0).optional(),
});

const widgetSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().min(1),
  h: z.number().min(1),
  visible: z.boolean(),
  settings: z.record(z.unknown()).optional(),
});

const saveDashboardLayoutSchema = z.object({
  widgets: z.array(widgetSchema),
  columns: z.number().min(1).max(24).optional(),
  rowHeight: z.number().min(50).max(200).optional(),
  profileId: z.string().optional(),
});

const createSoundPackSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  sounds: z.object({
    timer_complete: z.string().url().optional(),
    timer_warning: z.string().url().optional(),
    rep_count: z.string().url().optional(),
    set_complete: z.string().url().optional(),
    workout_complete: z.string().url().optional(),
    achievement: z.string().url().optional(),
    metronome_tick: z.string().url().optional(),
    metronome_accent: z.string().url().optional(),
    hydration_reminder: z.string().url().optional(),
  }),
  isPublic: z.boolean().optional(),
});

const logHydrationSchema = z.object({
  amountOz: z.number().min(0.5).max(128),
  workoutSessionId: z.string().optional(),
  source: z.enum(['manual', 'quick_log', 'reminder', 'wearable']).optional(),
});

const registerDeviceSchema = z.object({
  deviceId: z.string().min(1).max(100),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(['web', 'ios', 'android', 'watchos']),
  deviceModel: z.string().max(100).optional(),
  osVersion: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
  pushToken: z.string().max(500).optional(),
});

const updateDeviceSchema = z.object({
  deviceName: z.string().max(100).optional(),
  settingsOverride: updatePreferencesSchema.optional(),
  syncEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  pushToken: z.string().max(500).optional(),
});

// ============================================
// ROUTE HANDLERS
// ============================================

export default async function preferencesRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================
  // USER PREFERENCES
  // ============================================

  // GET /me/preferences - Get user's full preferences
  fastify.get(
    '/me/preferences',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const result = await preferencesService.getUserPreferences(userId);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // GET /me/preferences/effective - Get effective preferences (with profile overrides applied)
  fastify.get(
    '/me/preferences/effective',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const preferences = await preferencesService.getEffectivePreferences(userId);

      return reply.send({
        success: true,
        data: { preferences },
      });
    }
  );

  // PATCH /me/preferences - Update preferences (partial)
  fastify.patch(
    '/me/preferences',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const body = updatePreferencesSchema.parse(request.body);
      const result = await preferencesService.updateUserPreferences(userId, body as Partial<UserPreferences>);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // PUT /me/preferences/reset - Reset to defaults
  fastify.put(
    '/me/preferences/reset',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const preferences = await preferencesService.resetUserPreferences(userId);

      return reply.send({
        success: true,
        data: { preferences },
      });
    }
  );

  // ============================================
  // PREFERENCE PROFILES
  // ============================================

  // GET /me/preferences/profiles - List all profiles
  fastify.get(
    '/me/preferences/profiles',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const profiles = await preferencesService.listProfiles(userId);

      return reply.send({
        success: true,
        data: { profiles },
      });
    }
  );

  // POST /me/preferences/profiles - Create profile
  fastify.post(
    '/me/preferences/profiles',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const body = createProfileSchema.parse(request.body);
      const profile = await preferencesService.createProfile(userId, {
        name: body.name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        preferencesOverride: body.preferencesOverride as Partial<UserPreferences>,
        isDefault: body.isDefault,
      });

      return reply.status(201).send({
        success: true,
        data: { profile },
      });
    }
  );

  // GET /me/preferences/profiles/:id - Get profile
  fastify.get<{ Params: { id: string } }>(
    '/me/preferences/profiles/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params;

      const profile = await preferencesService.getProfile(userId, id);

      if (!profile) {
        return reply.status(404).send({
          success: false,
          error: 'Profile not found',
        });
      }

      return reply.send({
        success: true,
        data: { profile },
      });
    }
  );

  // PATCH /me/preferences/profiles/:id - Update profile
  fastify.patch<{ Params: { id: string } }>(
    '/me/preferences/profiles/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params;

      const body = updateProfileSchema.parse(request.body);
      const profile = await preferencesService.updateProfile(userId, id, {
        name: body.name,
        description: body.description,
        icon: body.icon,
        color: body.color,
        preferencesOverride: body.preferencesOverride as Partial<UserPreferences>,
        isDefault: body.isDefault,
        sortOrder: body.sortOrder,
      });

      if (!profile) {
        return reply.status(404).send({
          success: false,
          error: 'Profile not found',
        });
      }

      return reply.send({
        success: true,
        data: { profile },
      });
    }
  );

  // DELETE /me/preferences/profiles/:id - Delete profile
  fastify.delete<{ Params: { id: string } }>(
    '/me/preferences/profiles/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params;

      const deleted = await preferencesService.deleteProfile(userId, id);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Profile not found',
        });
      }

      return reply.send({
        success: true,
        data: { deleted: true },
      });
    }
  );

  // POST /me/preferences/profiles/:id/activate - Activate profile
  fastify.post<{ Params: { id: string } }>(
    '/me/preferences/profiles/:id/activate',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params;

      const activated = await preferencesService.activateProfile(userId, id);

      if (!activated) {
        return reply.status(404).send({
          success: false,
          error: 'Profile not found',
        });
      }

      return reply.send({
        success: true,
        data: { activated: true },
      });
    }
  );

  // POST /me/preferences/profiles/deactivate - Deactivate active profile
  fastify.post(
    '/me/preferences/profiles/deactivate',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      await preferencesService.deactivateProfile(userId);

      return reply.send({
        success: true,
        data: { deactivated: true },
      });
    }
  );

  // ============================================
  // DASHBOARD LAYOUTS
  // ============================================

  // GET /me/dashboard/layout - Get current layout
  fastify.get<{ Querystring: { platform?: string; profileId?: string } }>(
    '/me/dashboard/layout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { platform = 'web', profileId } = request.query;

      const layout = await preferencesService.getDashboardLayout(
        userId,
        platform as Platform,
        profileId
      );

      return reply.send({
        success: true,
        data: { layout },
      });
    }
  );

  // PUT /me/dashboard/layout - Save layout
  fastify.put<{ Querystring: { platform?: string } }>(
    '/me/dashboard/layout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { platform = 'web' } = request.query;

      const body = saveDashboardLayoutSchema.parse(request.body);
      const layout = await preferencesService.saveDashboardLayout(userId, {
        widgets: body.widgets as DashboardWidget[],
        columns: body.columns,
        rowHeight: body.rowHeight,
        platform: platform as Platform,
        profileId: body.profileId,
      });

      return reply.send({
        success: true,
        data: { layout },
      });
    }
  );

  // GET /me/dashboard/widgets - Get available widgets
  fastify.get(
    '/me/dashboard/widgets',
    { preHandler: [authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const widgets = await preferencesService.getAvailableWidgets();

      return reply.send({
        success: true,
        data: { widgets },
      });
    }
  );

  // ============================================
  // SOUND PACKS
  // ============================================

  // GET /me/sounds/packs - List all available sound packs
  fastify.get(
    '/me/sounds/packs',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const [systemPacks, userPacks] = await Promise.all([
        preferencesService.getSystemSoundPacks(),
        preferencesService.getUserSoundPacks(userId),
      ]);

      return reply.send({
        success: true,
        data: {
          systemPacks,
          userPacks,
        },
      });
    }
  );

  // POST /me/sounds/packs - Create custom sound pack
  fastify.post(
    '/me/sounds/packs',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const body = createSoundPackSchema.parse(request.body);
      const pack = await preferencesService.createUserSoundPack(userId, body);

      return reply.status(201).send({
        success: true,
        data: { pack },
      });
    }
  );

  // DELETE /me/sounds/packs/:id - Delete custom sound pack
  fastify.delete<{ Params: { id: string } }>(
    '/me/sounds/packs/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { id } = request.params;

      const deleted = await preferencesService.deleteUserSoundPack(userId, id);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: 'Sound pack not found',
        });
      }

      return reply.send({
        success: true,
        data: { deleted: true },
      });
    }
  );

  // ============================================
  // HYDRATION TRACKING
  // ============================================

  // GET /me/hydration/today - Get today's hydration
  fastify.get(
    '/me/hydration/today',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const result = await preferencesService.getTodayHydration(userId);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // GET /me/hydration/history - Get hydration history
  fastify.get<{ Querystring: { days?: string } }>(
    '/me/hydration/history',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const days = parseInt(request.query.days || '7', 10);

      const history = await preferencesService.getHydrationHistory(userId, days);

      return reply.send({
        success: true,
        data: { history },
      });
    }
  );

  // POST /me/hydration/log - Log water intake
  fastify.post(
    '/me/hydration/log',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const body = logHydrationSchema.parse(request.body);
      const log = await preferencesService.logHydration(
        userId,
        body.amountOz,
        body.workoutSessionId,
        body.source as HydrationSource
      );

      return reply.status(201).send({
        success: true,
        data: { log },
      });
    }
  );

  // ============================================
  // DEVICE SETTINGS
  // ============================================

  // GET /me/devices - List registered devices
  fastify.get(
    '/me/devices',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const devices = await preferencesService.listDevices(userId);

      return reply.send({
        success: true,
        data: { devices },
      });
    }
  );

  // POST /me/devices/register - Register device
  fastify.post(
    '/me/devices/register',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.userId;

      const body = registerDeviceSchema.parse(request.body);
      const device = await preferencesService.registerDevice(userId, {
        deviceId: body.deviceId,
        deviceName: body.deviceName,
        platform: body.platform as Platform,
        deviceModel: body.deviceModel,
        osVersion: body.osVersion,
        appVersion: body.appVersion,
        pushToken: body.pushToken,
      });

      return reply.status(201).send({
        success: true,
        data: { device },
      });
    }
  );

  // PATCH /me/devices/:deviceId - Update device settings
  fastify.patch<{ Params: { deviceId: string } }>(
    '/me/devices/:deviceId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { deviceId } = request.params;

      const body = updateDeviceSchema.parse(request.body);
      const device = await preferencesService.updateDeviceSettings(userId, deviceId, {
        deviceName: body.deviceName,
        settingsOverride: body.settingsOverride as Partial<UserPreferences>,
        syncEnabled: body.syncEnabled,
        pushEnabled: body.pushEnabled,
        pushToken: body.pushToken,
      });

      if (!device) {
        return reply.status(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      return reply.send({
        success: true,
        data: { device },
      });
    }
  );

  // DELETE /me/devices/:deviceId - Remove device
  fastify.delete<{ Params: { deviceId: string } }>(
    '/me/devices/:deviceId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { deviceId } = request.params;

      const removed = await preferencesService.removeDevice(userId, deviceId);

      if (!removed) {
        return reply.status(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      return reply.send({
        success: true,
        data: { removed: true },
      });
    }
  );

  // POST /me/devices/:deviceId/sync - Sync device settings
  fastify.post<{ Params: { deviceId: string } }>(
    '/me/devices/:deviceId/sync',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { deviceId } = request.params;

      const result = await preferencesService.syncDevice(userId, deviceId);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
}
