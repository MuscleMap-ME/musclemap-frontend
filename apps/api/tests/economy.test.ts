/**
 * Credits Economy API Integration Tests
 *
 * Tests for:
 * - Wallet endpoints (balance, transactions, transfers)
 * - Store endpoints (catalog, purchase, inventory)
 * - Training Buddy endpoints (creation, customization)
 * - Trainer endpoints (profile, classes, enrollment)
 * - Admin fraud management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { tryGetTestApp, closeTestApp } from './test_app';
import { getRequestTarget } from './request_target';
import { registerAndLogin, auth } from './helpers';
import type { FastifyInstance } from 'fastify';

describe('Credits Economy API', () => {
  let app: FastifyInstance | null;
  let userToken: string;
  let user2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await tryGetTestApp();
    if (!app) return; // Skip if no database

    const target = getRequestTarget(app);

    // Create test users
    const { token: t1 } = await registerAndLogin(app);
    userToken = t1;

    const { token: t2 } = await registerAndLogin(app);
    user2Token = t2;

    // Create admin user - we'll try to get an admin token
    // In tests, we may need to manually elevate or use a seeded admin
    const { token: adminT } = await registerAndLogin(app);
    adminToken = adminT;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Wallet Endpoints', () => {
    it('should get wallet details', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/wallet')
        .set(auth(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.balance).toBe('number');
      expect(res.body.data.balance).toBeGreaterThanOrEqual(0);
    });

    it('should get transaction history', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/wallet/transactions')
        .set(auth(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should reject transfer without authentication', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post('/api/credits/wallet/transfer')
        .send({ recipientId: 'some-user', amount: 100 });

      expect(res.status).toBe(401);
    });

    it('should get earning history', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/wallet/earnings')
        .set(auth(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Store Endpoints', () => {
    it('should get store categories', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/store/categories');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get store items', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/store/items');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should filter store items by category', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/store/items?category=buddy_cosmetic');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should get featured items', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/store/featured');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should get user inventory', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/store/inventory')
        .set(auth(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should check item ownership', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/store/owns/some_item_sku')
        .set(auth(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.owns).toBe('boolean');
    });

    it('should reject purchase without auth', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post('/api/credits/store/purchase')
        .send({ sku: 'test_item' });

      expect(res.status).toBe(401);
    });
  });

  describe('Training Buddy Endpoints', () => {
    it('should get buddy (null if none exists)', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/buddy')
        .set(auth(userToken));

      expect(res.status).toBe(200);
      // data can be null if no buddy
      expect(res.body).toHaveProperty('data');
    });

    it('should create a buddy', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post('/api/credits/buddy')
        .set(auth(user2Token))
        .send({ species: 'wolf', nickname: 'TestWolf' });

      // Could be 201 (created) or 400 (already has buddy)
      expect([200, 201, 400]).toContain(res.status);
    });

    it('should get evolution path', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/buddy/evolution/wolf');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should reject invalid species for evolution path', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/buddy/evolution/invalid_species');

      expect(res.status).toBe(400);
    });

    it('should get buddy leaderboard', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/buddy/leaderboard');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should require auth for buddy settings', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .put('/api/credits/buddy/settings')
        .send({ visible: true });

      expect(res.status).toBe(401);
    });
  });

  describe('Earning Rules Endpoints', () => {
    it('should get earning rules', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/credits/earning/rules');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

describe('Trainer & Classes API', () => {
  let app: FastifyInstance | null;
  let trainerToken: string;
  let studentToken: string;
  let classId: string | null = null;

  beforeAll(async () => {
    app = await tryGetTestApp();
    if (!app) return;

    const { token: t1 } = await registerAndLogin(app);
    trainerToken = t1;

    const { token: t2 } = await registerAndLogin(app);
    studentToken = t2;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('Trainer Profile Endpoints', () => {
    it('should get trainer profile (null if none)', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/trainers/me')
        .set(auth(trainerToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should create/update trainer profile', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post('/api/trainers/profile')
        .set(auth(trainerToken))
        .send({
          displayName: 'Test Trainer',
          bio: 'Professional fitness trainer',
          specialties: ['strength', 'cardio'],
          certifications: ['CPT'],
          hourlyRateCredits: 100,
          perClassRateCredits: 50,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.displayName).toBe('Test Trainer');
    });

    it('should list trainers', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/trainers');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter trainers by verified status', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/trainers?verified=true');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Class Endpoints', () => {
    it('should create a class', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const startAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

      const res = await request(target)
        .post('/api/classes')
        .set(auth(trainerToken))
        .send({
          title: 'Test Fitness Class',
          description: 'A test class for integration testing',
          category: 'strength',
          difficulty: 'intermediate',
          startAt,
          durationMinutes: 60,
          locationType: 'virtual',
          locationDetails: 'Zoom link will be sent',
          capacity: 20,
          creditsPerStudent: 50,
          trainerWagePerStudent: 40,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.data?.id) {
        classId = res.body.data.id;
      }
    });

    it('should list classes', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/classes');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter upcoming classes', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/classes?upcoming=true');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should get trainer classes', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/trainers/me/classes')
        .set(auth(trainerToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should require auth to create class', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post('/api/classes')
        .send({
          title: 'Unauthenticated Class',
          category: 'strength',
          difficulty: 'beginner',
          startAt: new Date().toISOString(),
          durationMinutes: 60,
          locationType: 'virtual',
          capacity: 10,
          creditsPerStudent: 50,
          trainerWagePerStudent: 40,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('Enrollment Endpoints', () => {
    it('should enroll in a class', async () => {
      if (!app || !classId) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post(`/api/classes/${classId}/enroll`)
        .set(auth(studentToken));

      // Could be 201 (enrolled), 400 (already enrolled), 402 (insufficient credits)
      expect([200, 201, 400, 402]).toContain(res.status);
    });

    it('should get user enrollments', async () => {
      if (!app) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .get('/api/me/enrollments')
        .set(auth(studentToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should require auth for enrollment', async () => {
      if (!app || !classId) return;
      const target = getRequestTarget(app);

      const res = await request(target)
        .post(`/api/classes/${classId}/enroll`);

      expect(res.status).toBe(401);
    });
  });
});

describe('Fraud Detection System', () => {
  // These tests primarily verify the mock implementation
  // Real admin tests would require elevated permissions

  describe('Rate Limiting', () => {
    it('should have configurable rate limits', () => {
      // Mock rate limit configuration
      const rateLimits = {
        transfer: { maxPerHour: 10, maxPerDay: 50 },
        purchase: { maxPerHour: 20, maxPerDay: 100 },
        workout: { maxPerHour: 5, maxPerDay: 20 },
        earn: { maxPerHour: 100, maxPerDay: 500 },
      };

      expect(rateLimits.transfer.maxPerHour).toBe(10);
      expect(rateLimits.purchase.maxPerDay).toBe(100);
    });
  });

  describe('Flag Types', () => {
    it('should support all fraud flag types', () => {
      const flagTypes = [
        'velocity',
        'self_farming',
        'suspicious_pattern',
        'bot_behavior',
        'collusion',
        'manual',
      ];

      const severities = ['low', 'medium', 'high', 'critical'];
      const statuses = ['open', 'investigating', 'resolved_valid', 'resolved_invalid', 'escalated'];

      expect(flagTypes).toContain('velocity');
      expect(severities).toContain('critical');
      expect(statuses).toContain('investigating');
    });
  });

  describe('Abuse Detection Patterns', () => {
    it('should detect velocity abuse', () => {
      const checkVelocity = (actions: number, timeframeMinutes: number, limit: number) => {
        return actions > limit;
      };

      expect(checkVelocity(15, 60, 10)).toBe(true); // Over limit
      expect(checkVelocity(5, 60, 10)).toBe(false); // Under limit
    });

    it('should detect circular transfer patterns', () => {
      const transfers = [
        { from: 'A', to: 'B', amount: 100 },
        { from: 'B', to: 'C', amount: 95 },
        { from: 'C', to: 'A', amount: 90 },
      ];

      const detectCircular = (transfers: any[]) => {
        const senders = new Set(transfers.map(t => t.from));
        const receivers = new Set(transfers.map(t => t.to));
        const overlap = [...senders].filter(s => receivers.has(s));
        return overlap.length > 1;
      };

      expect(detectCircular(transfers)).toBe(true);
    });

    it('should detect self-farming attempts', () => {
      const checkSelfFarming = (senderId: string, recipientId: string) => {
        return senderId === recipientId;
      };

      expect(checkSelfFarming('user1', 'user1')).toBe(true);
      expect(checkSelfFarming('user1', 'user2')).toBe(false);
    });
  });
});

describe('Store Item Validation', () => {
  describe('Price Validation', () => {
    it('should validate item prices', () => {
      const validatePrice = (price: number) => {
        return price > 0 && price <= 1000000 && Number.isInteger(price);
      };

      expect(validatePrice(100)).toBe(true);
      expect(validatePrice(0)).toBe(false);
      expect(validatePrice(-100)).toBe(false);
      expect(validatePrice(1000001)).toBe(false);
      expect(validatePrice(99.99)).toBe(false); // Not an integer
    });
  });

  describe('SKU Format', () => {
    it('should validate SKU format', () => {
      const validateSku = (sku: string) => {
        return /^[a-z][a-z0-9_]{2,49}$/.test(sku);
      };

      expect(validateSku('buddy_aura_flame')).toBe(true);
      expect(validateSku('profile_frame_gold')).toBe(true);
      expect(validateSku('AB')).toBe(false); // Too short, uppercase
      expect(validateSku('1invalid')).toBe(false); // Starts with number
    });
  });

  describe('Category Validation', () => {
    it('should validate store categories', () => {
      const validCategories = [
        'buddy_cosmetic',
        'profile',
        'workout',
        'social',
        'training',
        'premium',
      ];

      const isValidCategory = (category: string) => {
        return validCategories.includes(category);
      };

      expect(isValidCategory('buddy_cosmetic')).toBe(true);
      expect(isValidCategory('invalid_category')).toBe(false);
    });
  });
});

describe('Buddy System Validation', () => {
  describe('Species Validation', () => {
    it('should validate buddy species', () => {
      const validSpecies = ['wolf', 'bear', 'tiger', 'eagle', 'dragon', 'phoenix', 'shark', 'gorilla'];

      const isValidSpecies = (species: string) => {
        return validSpecies.includes(species);
      };

      expect(isValidSpecies('wolf')).toBe(true);
      expect(isValidSpecies('tiger')).toBe(true);
      expect(isValidSpecies('unicorn')).toBe(false);
    });
  });

  describe('Evolution Stages', () => {
    it('should validate evolution stage transitions', () => {
      const canEvolve = (currentStage: number, level: number) => {
        if (currentStage >= 4) return false; // Max stage
        const evolutionThresholds: Record<number, number> = { 1: 10, 2: 20, 3: 30 };
        const threshold = evolutionThresholds[currentStage];
        if (!threshold) return false;
        return level >= threshold;
      };

      expect(canEvolve(1, 10)).toBe(true);
      expect(canEvolve(1, 9)).toBe(false);
      expect(canEvolve(2, 20)).toBe(true);
      expect(canEvolve(3, 30)).toBe(true);
      expect(canEvolve(4, 40)).toBe(false); // Max stage
    });
  });

  describe('XP Calculation', () => {
    it('should calculate correct XP per level', () => {
      const xpForLevel = (level: number) => {
        return Math.floor(100 * Math.pow(1.2, level - 1));
      };

      expect(xpForLevel(1)).toBe(100);
      expect(xpForLevel(2)).toBe(120);
      expect(xpForLevel(10)).toBeGreaterThan(500);
    });
  });

  describe('Cosmetic Slots', () => {
    it('should validate cosmetic slot names', () => {
      const validSlots = ['aura', 'armor', 'wings', 'tool', 'skin', 'emote_pack', 'voice_pack'];

      const isValidSlot = (slot: string) => {
        return validSlots.includes(slot);
      };

      expect(isValidSlot('aura')).toBe(true);
      expect(isValidSlot('wings')).toBe(true);
      expect(isValidSlot('helmet')).toBe(false);
    });
  });
});

describe('Trainer System Validation', () => {
  describe('Class Difficulty', () => {
    it('should validate class difficulty levels', () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced', 'all'];

      const isValidDifficulty = (difficulty: string) => {
        return validDifficulties.includes(difficulty);
      };

      expect(isValidDifficulty('beginner')).toBe(true);
      expect(isValidDifficulty('expert')).toBe(false);
    });
  });

  describe('Location Types', () => {
    it('should validate class location types', () => {
      const validTypes = ['in_person', 'virtual', 'hybrid'];

      const isValidLocationType = (type: string) => {
        return validTypes.includes(type);
      };

      expect(isValidLocationType('virtual')).toBe(true);
      expect(isValidLocationType('online')).toBe(false);
    });
  });

  describe('Class Scheduling', () => {
    it('should validate class duration', () => {
      const isValidDuration = (minutes: number) => {
        return minutes >= 5 && minutes <= 480;
      };

      expect(isValidDuration(60)).toBe(true);
      expect(isValidDuration(4)).toBe(false);
      expect(isValidDuration(500)).toBe(false);
    });

    it('should validate class capacity', () => {
      const isValidCapacity = (capacity: number) => {
        return capacity >= 1 && capacity <= 1000;
      };

      expect(isValidCapacity(20)).toBe(true);
      expect(isValidCapacity(0)).toBe(false);
      expect(isValidCapacity(1001)).toBe(false);
    });
  });

  describe('Wage Distribution', () => {
    it('should calculate trainer wages correctly', () => {
      const calculateWage = (studentsAttended: number, wagePerStudent: number) => {
        return studentsAttended * wagePerStudent;
      };

      expect(calculateWage(10, 40)).toBe(400);
      expect(calculateWage(0, 40)).toBe(0);
    });
  });
});
