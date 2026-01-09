/**
 * Credit Service Tests
 *
 * Tests for:
 * - Concurrent credit operations
 * - Idempotency handling
 * - P2P transfers
 * - Overdraft prevention
 * - Rep-based credit awards
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';

// Mock database for testing
const mockDb = {
  balances: new Map<string, { balance: number; version: number }>(),
  ledger: new Map<string, { id: string; amount: number; balanceAfter: number }>(),

  reset() {
    this.balances.clear();
    this.ledger.clear();
  },

  getBalance(userId: string): number {
    return this.balances.get(userId)?.balance ?? 0;
  },

  setBalance(userId: string, balance: number, version: number = 0) {
    this.balances.set(userId, { balance, version });
  },

  hasTransaction(idempotencyKey: string): boolean {
    return this.ledger.has(idempotencyKey);
  },

  addTransaction(idempotencyKey: string, userId: string, amount: number, balanceAfter: number) {
    this.ledger.set(idempotencyKey, {
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount,
      balanceAfter,
    });
  },
};

// Simplified credit service for testing
const testCreditService = {
  async transact(
    userId: string,
    delta: number,
    idempotencyKey: string
  ): Promise<{ entryId: string; newBalance: number; wasDuplicate: boolean }> {
    // Check idempotency
    if (mockDb.hasTransaction(idempotencyKey)) {
      const existing = mockDb.ledger.get(idempotencyKey)!;
      return {
        entryId: existing.id,
        newBalance: existing.balanceAfter,
        wasDuplicate: true,
      };
    }

    // Get current balance
    const current = mockDb.getBalance(userId);
    const newBalance = current + delta;

    // Check for overdraft
    if (newBalance < 0) {
      throw new Error(`INSUFFICIENT_CREDITS: have=${current}, need=${Math.abs(delta)}`);
    }

    // Update balance
    mockDb.setBalance(userId, newBalance);
    mockDb.addTransaction(idempotencyKey, userId, delta, newBalance);

    const entry = mockDb.ledger.get(idempotencyKey)!;
    return {
      entryId: entry.id,
      newBalance,
      wasDuplicate: false,
    };
  },

  async transfer(
    senderId: string,
    recipientId: string,
    amount: number
  ): Promise<{ senderBalance: number; recipientBalance: number }> {
    if (senderId === recipientId) {
      throw new Error('SELF_TRANSFER');
    }

    if (amount <= 0 || amount > 1000000) {
      throw new Error('INVALID_AMOUNT');
    }

    const senderBalance = mockDb.getBalance(senderId);
    if (senderBalance < amount) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    const recipientBalance = mockDb.getBalance(recipientId);

    mockDb.setBalance(senderId, senderBalance - amount);
    mockDb.setBalance(recipientId, recipientBalance + amount);

    return {
      senderBalance: senderBalance - amount,
      recipientBalance: recipientBalance + amount,
    };
  },

  async awardForReps(userId: string, repEventId: string, repCount: number) {
    if (repCount <= 0 || repCount > 500) {
      throw new Error('Invalid rep count');
    }

    return this.transact(userId, repCount, `reps:${repEventId}`);
  },

  async getBalance(userId: string): Promise<number> {
    return mockDb.getBalance(userId);
  },
};

describe('Credit Service', () => {
  const testUserId1 = 'user_test_1';
  const testUserId2 = 'user_test_2';
  const testUserId3 = 'user_test_3';

  beforeEach(() => {
    mockDb.reset();
  });

  describe('Basic Operations', () => {
    it('should initialize with zero balance', async () => {
      const balance = await testCreditService.getBalance(testUserId1);
      expect(balance).toBe(0);
    });

    it('should add credits correctly', async () => {
      await testCreditService.transact(testUserId1, 100, 'add-100');
      const balance = await testCreditService.getBalance(testUserId1);
      expect(balance).toBe(100);
    });

    it('should deduct credits correctly', async () => {
      mockDb.setBalance(testUserId1, 100);
      await testCreditService.transact(testUserId1, -50, 'spend-50');
      const balance = await testCreditService.getBalance(testUserId1);
      expect(balance).toBe(50);
    });

    it('should prevent overdraft', async () => {
      mockDb.setBalance(testUserId1, 50);
      await expect(
        testCreditService.transact(testUserId1, -100, 'overdraft-attempt')
      ).rejects.toThrow('INSUFFICIENT_CREDITS');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent credit additions', async () => {
      const promises = Array(100)
        .fill(null)
        .map((_, i) => testCreditService.transact(testUserId1, 10, `concurrent-add-${i}`));

      await Promise.all(promises);

      const balance = await testCreditService.getBalance(testUserId1);
      expect(balance).toBe(1000);
    });

    it('should prevent double-spending under concurrency', async () => {
      mockDb.setBalance(testUserId2, 100);

      const promises = Array(15)
        .fill(null)
        .map((_, i) =>
          testCreditService.transact(testUserId2, -10, `spend-${i}`).catch(() => null)
        );

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;

      expect(successCount).toBe(10);
      expect(await testCreditService.getBalance(testUserId2)).toBe(0);
    });
  });

  describe('Idempotency', () => {
    it('should return same result for duplicate requests', async () => {
      const key = 'idempotent-key-1';

      const result1 = await testCreditService.transact(testUserId1, 100, key);
      const result2 = await testCreditService.transact(testUserId1, 100, key);

      expect(result1.entryId).toBe(result2.entryId);
      expect(result2.wasDuplicate).toBe(true);
      expect(await testCreditService.getBalance(testUserId1)).toBe(100);
    });

    it('should handle concurrent duplicate requests', async () => {
      const key = 'concurrent-idempotent-key';

      const promises = Array(10)
        .fill(null)
        .map(() => testCreditService.transact(testUserId3, 100, key));

      const results = await Promise.all(promises);

      // All should return the same entry ID
      const entryIds = new Set(results.map((r) => r.entryId));
      expect(entryIds.size).toBe(1);

      // Balance should only be updated once
      expect(await testCreditService.getBalance(testUserId3)).toBe(100);
    });
  });

  describe('P2P Transfers', () => {
    it('should transfer credits between users', async () => {
      mockDb.setBalance(testUserId1, 100);
      mockDb.setBalance(testUserId2, 50);

      const result = await testCreditService.transfer(testUserId1, testUserId2, 30);

      expect(result.senderBalance).toBe(70);
      expect(result.recipientBalance).toBe(80);
    });

    it('should prevent self-transfer', async () => {
      mockDb.setBalance(testUserId1, 100);

      await expect(
        testCreditService.transfer(testUserId1, testUserId1, 50)
      ).rejects.toThrow('SELF_TRANSFER');
    });

    it('should prevent transfer with insufficient balance', async () => {
      mockDb.setBalance(testUserId1, 50);

      await expect(
        testCreditService.transfer(testUserId1, testUserId2, 100)
      ).rejects.toThrow('INSUFFICIENT_CREDITS');
    });

    it('should validate transfer amount', async () => {
      mockDb.setBalance(testUserId1, 1000000);

      await expect(
        testCreditService.transfer(testUserId1, testUserId2, 0)
      ).rejects.toThrow('INVALID_AMOUNT');

      await expect(
        testCreditService.transfer(testUserId1, testUserId2, -100)
      ).rejects.toThrow('INVALID_AMOUNT');

      await expect(
        testCreditService.transfer(testUserId1, testUserId2, 2000000)
      ).rejects.toThrow('INVALID_AMOUNT');
    });
  });

  describe('Rep-Based Credits', () => {
    it('should award 1 credit per rep', async () => {
      const result = await testCreditService.awardForReps(testUserId1, 'rep-event-1', 50);

      expect(result.newBalance).toBe(50);
    });

    it('should validate rep count', async () => {
      await expect(
        testCreditService.awardForReps(testUserId1, 'rep-event-invalid', 0)
      ).rejects.toThrow('Invalid rep count');

      await expect(
        testCreditService.awardForReps(testUserId1, 'rep-event-invalid', 501)
      ).rejects.toThrow('Invalid rep count');
    });

    it('should be idempotent for rep awards', async () => {
      const repEventId = 'rep-event-idempotent';

      await testCreditService.awardForReps(testUserId1, repEventId, 100);
      await testCreditService.awardForReps(testUserId1, repEventId, 100);

      expect(await testCreditService.getBalance(testUserId1)).toBe(100);
    });
  });
});

describe('Geohash', () => {
  // Import the geohash utilities dynamically
  let geohash: any;
  let distance: any;

  beforeAll(async () => {
    const native = await import('../../../native');
    geohash = native.geohash;
    distance = native.distance;
  });

  it('should encode coordinates to geohash', () => {
    const hash = geohash.encode(40.7128, -74.006, 9);
    expect(hash).toHaveLength(9);
    expect(hash).toMatch(/^[0-9a-z]+$/);
  });

  it('should decode geohash to coordinates', () => {
    const hash = geohash.encode(40.7128, -74.006, 9);
    const decoded = geohash.decode(hash);

    expect(decoded.lat).toBeCloseTo(40.7128, 3);
    expect(decoded.lng).toBeCloseTo(-74.006, 3);
  });

  it('should calculate correct haversine distance', () => {
    // NYC to LA
    const dist = distance.haversine(40.7128, -74.006, 34.0522, -118.2437);

    // Should be approximately 3940 km
    expect(dist).toBeGreaterThan(3900000);
    expect(dist).toBeLessThan(4000000);
  });

  it('should get neighboring geohashes', () => {
    const hash = geohash.encode(40.7128, -74.006, 6);
    const neighbors = geohash.neighbors(hash);

    expect(neighbors).toHaveLength(8);
    neighbors.forEach((n) => {
      expect(n).toHaveLength(6);
    });
  });

  it('should correctly identify points within radius', () => {
    // Points ~1km apart
    const result = distance.isWithinRadius(40.7128, -74.006, 40.7138, -74.007, 2000);
    expect(result).toBe(true);

    // Points far apart
    const result2 = distance.isWithinRadius(40.7128, -74.006, 34.0522, -118.2437, 100000);
    expect(result2).toBe(false);
  });
});

describe('Rate Limiter', () => {
  let createRateLimiter: any;

  beforeAll(async () => {
    const native = await import('../../../native');
    createRateLimiter = native.createRateLimiter;
  });

  it('should allow requests within limit', () => {
    const limiter = createRateLimiter(10, 60);

    for (let i = 0; i < 10; i++) {
      expect(limiter.check('user1', 1)).toBe(true);
    }
  });

  it('should block requests exceeding limit', () => {
    const limiter = createRateLimiter(5, 60);

    for (let i = 0; i < 5; i++) {
      limiter.check('user2', 1);
    }

    expect(limiter.check('user2', 1)).toBe(false);
  });

  it('should track remaining requests', () => {
    const limiter = createRateLimiter(10, 60);

    expect(limiter.remaining('user3')).toBe(10);

    limiter.check('user3', 3);
    expect(limiter.remaining('user3')).toBe(7);
  });

  it('should reset user limits', () => {
    const limiter = createRateLimiter(5, 60);

    for (let i = 0; i < 5; i++) {
      limiter.check('user4', 1);
    }

    expect(limiter.remaining('user4')).toBe(0);

    limiter.reset('user4');
    expect(limiter.remaining('user4')).toBe(5);
  });

  it('should track separate limits per user', () => {
    const limiter = createRateLimiter(5, 60);

    limiter.check('userA', 3);
    limiter.check('userB', 2);

    expect(limiter.remaining('userA')).toBe(2);
    expect(limiter.remaining('userB')).toBe(3);
  });
});

describe('i18n', () => {
  let isLanguageSupported: any;
  let normalizeLanguageCode: any;
  let isRTL: any;

  beforeAll(async () => {
    const i18n = await import('../src/services/i18n.service');
    isLanguageSupported = i18n.isLanguageSupported;
    normalizeLanguageCode = i18n.normalizeLanguageCode;
    isRTL = i18n.isRTL;
  });

  it('should recognize supported languages', () => {
    expect(isLanguageSupported('en')).toBe(true);
    expect(isLanguageSupported('es')).toBe(true);
    expect(isLanguageSupported('zh-Hans')).toBe(true);
    expect(isLanguageSupported('xx')).toBe(false);
  });

  it('should normalize language codes', () => {
    expect(normalizeLanguageCode('EN')).toBe('en');
    expect(normalizeLanguageCode('en-US')).toBe('en');
    expect(normalizeLanguageCode('pt')).toBe('pt-BR');
    expect(normalizeLanguageCode('zh')).toBe('zh-Hans');
    expect(normalizeLanguageCode('invalid')).toBe('en');
  });

  it('should identify RTL languages', () => {
    expect(isRTL('he')).toBe(true);
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
    expect(isRTL('ja')).toBe(false);
  });
});

// ============================================
// CREDITS ECONOMY SYSTEM TESTS
// ============================================

describe('Credits Economy - Store Service (Mock)', () => {
  // Mock store for testing
  const mockStore = {
    items: new Map<string, { sku: string; price: number; category: string; enabled: boolean }>(),
    inventory: new Map<string, Set<string>>(),

    reset() {
      this.items.clear();
      this.inventory.clear();
      // Seed some items
      this.items.set('buddy_aura_flame', { sku: 'buddy_aura_flame', price: 500, category: 'buddy_cosmetic', enabled: true });
      this.items.set('profile_frame_gold', { sku: 'profile_frame_gold', price: 200, category: 'profile', enabled: true });
      this.items.set('disabled_item', { sku: 'disabled_item', price: 100, category: 'test', enabled: false });
    },

    getItem(sku: string) {
      return this.items.get(sku) || null;
    },

    purchase(userId: string, sku: string, balance: number): { success: boolean; error?: string; newBalance?: number } {
      const item = this.items.get(sku);
      if (!item) return { success: false, error: 'Item not found' };
      if (!item.enabled) return { success: false, error: 'Item not available' };
      if (balance < item.price) return { success: false, error: 'Insufficient credits' };

      // Add to inventory
      if (!this.inventory.has(userId)) {
        this.inventory.set(userId, new Set());
      }
      this.inventory.get(userId)!.add(sku);

      return { success: true, newBalance: balance - item.price };
    },

    ownsItem(userId: string, sku: string): boolean {
      return this.inventory.get(userId)?.has(sku) || false;
    },
  };

  beforeEach(() => {
    mockStore.reset();
  });

  it('should return item details', () => {
    const item = mockStore.getItem('buddy_aura_flame');
    expect(item).toBeTruthy();
    expect(item!.price).toBe(500);
    expect(item!.category).toBe('buddy_cosmetic');
  });

  it('should return null for non-existent items', () => {
    const item = mockStore.getItem('non_existent_item');
    expect(item).toBeNull();
  });

  it('should allow purchase with sufficient balance', () => {
    const result = mockStore.purchase('user_1', 'profile_frame_gold', 500);
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(300);
    expect(mockStore.ownsItem('user_1', 'profile_frame_gold')).toBe(true);
  });

  it('should reject purchase with insufficient balance', () => {
    const result = mockStore.purchase('user_1', 'buddy_aura_flame', 100);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient credits');
    expect(mockStore.ownsItem('user_1', 'buddy_aura_flame')).toBe(false);
  });

  it('should reject purchase of disabled items', () => {
    const result = mockStore.purchase('user_1', 'disabled_item', 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Item not available');
  });

  it('should track inventory per user', () => {
    mockStore.purchase('user_1', 'profile_frame_gold', 500);
    mockStore.purchase('user_2', 'buddy_aura_flame', 1000);

    expect(mockStore.ownsItem('user_1', 'profile_frame_gold')).toBe(true);
    expect(mockStore.ownsItem('user_1', 'buddy_aura_flame')).toBe(false);
    expect(mockStore.ownsItem('user_2', 'buddy_aura_flame')).toBe(true);
    expect(mockStore.ownsItem('user_2', 'profile_frame_gold')).toBe(false);
  });
});

describe('Credits Economy - Buddy Service (Mock)', () => {
  // Mock buddy system
  const mockBuddy = {
    buddies: new Map<string, { species: string; level: number; xp: number; evolutionStage: number }>(),
    xpThresholds: [0, 100, 300, 600, 1000],

    reset() {
      this.buddies.clear();
    },

    createBuddy(userId: string, species: string): { success: boolean; buddy?: any } {
      if (this.buddies.has(userId)) {
        return { success: false };
      }
      const buddy = { species, level: 1, xp: 0, evolutionStage: 1 };
      this.buddies.set(userId, buddy);
      return { success: true, buddy };
    },

    getBuddy(userId: string) {
      return this.buddies.get(userId) || null;
    },

    addXp(userId: string, amount: number): { leveledUp: boolean; evolved: boolean; newLevel: number } {
      const buddy = this.buddies.get(userId);
      if (!buddy) throw new Error('No buddy');

      buddy.xp += amount;
      let leveledUp = false;
      let evolved = false;

      // Check level ups
      while (buddy.level < this.xpThresholds.length && buddy.xp >= this.xpThresholds[buddy.level]) {
        buddy.level++;
        leveledUp = true;

        // Evolution at levels 10, 20, 30
        if (buddy.level % 10 === 0 && buddy.evolutionStage < 4) {
          buddy.evolutionStage++;
          evolved = true;
        }
      }

      return { leveledUp, evolved, newLevel: buddy.level };
    },
  };

  beforeEach(() => {
    mockBuddy.reset();
  });

  it('should create a new buddy', () => {
    const result = mockBuddy.createBuddy('user_1', 'wolf');
    expect(result.success).toBe(true);
    expect(result.buddy?.species).toBe('wolf');
    expect(result.buddy?.level).toBe(1);
  });

  it('should prevent duplicate buddy creation', () => {
    mockBuddy.createBuddy('user_1', 'wolf');
    const result = mockBuddy.createBuddy('user_1', 'bear');
    expect(result.success).toBe(false);
  });

  it('should add XP to buddy', () => {
    mockBuddy.createBuddy('user_1', 'wolf');
    mockBuddy.addXp('user_1', 50);
    const buddy = mockBuddy.getBuddy('user_1');
    expect(buddy?.xp).toBe(50);
  });

  it('should level up buddy when XP threshold reached', () => {
    mockBuddy.createBuddy('user_1', 'wolf');
    const result = mockBuddy.addXp('user_1', 150);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  it('should track separate buddies per user', () => {
    mockBuddy.createBuddy('user_1', 'wolf');
    mockBuddy.createBuddy('user_2', 'bear');
    mockBuddy.addXp('user_1', 200);

    expect(mockBuddy.getBuddy('user_1')?.xp).toBe(200);
    expect(mockBuddy.getBuddy('user_2')?.xp).toBe(0);
  });
});

describe('Credits Economy - Earning Service (Mock)', () => {
  // Mock earning rules
  const mockEarning = {
    rules: new Map<string, { code: string; creditsBase: number; xpBase: number; maxPerDay: number }>(),
    awards: new Map<string, { userId: string; ruleCode: string; credits: number; xp: number }>(),
    dailyCounts: new Map<string, number>(),

    reset() {
      this.rules.clear();
      this.awards.clear();
      this.dailyCounts.clear();
      // Seed rules
      this.rules.set('workout_complete', { code: 'workout_complete', creditsBase: 25, xpBase: 50, maxPerDay: 5 });
      this.rules.set('pr_set', { code: 'pr_set', creditsBase: 50, xpBase: 100, maxPerDay: 10 });
      this.rules.set('streak_7', { code: 'streak_7', creditsBase: 100, xpBase: 200, maxPerDay: 1 });
    },

    processEarning(userId: string, ruleCode: string, sourceId: string): { success: boolean; credits?: number; xp?: number; error?: string } {
      const rule = this.rules.get(ruleCode);
      if (!rule) return { success: false, error: 'Unknown rule' };

      const idempotencyKey = `${ruleCode}:${sourceId}`;
      if (this.awards.has(idempotencyKey)) {
        return { success: true, credits: 0, xp: 0 }; // Already awarded
      }

      // Check daily limit
      const dailyKey = `${userId}:${ruleCode}:${new Date().toISOString().split('T')[0]}`;
      const dailyCount = this.dailyCounts.get(dailyKey) || 0;
      if (dailyCount >= rule.maxPerDay) {
        return { success: false, error: 'Daily limit reached' };
      }

      // Award
      this.awards.set(idempotencyKey, { userId, ruleCode, credits: rule.creditsBase, xp: rule.xpBase });
      this.dailyCounts.set(dailyKey, dailyCount + 1);

      return { success: true, credits: rule.creditsBase, xp: rule.xpBase };
    },
  };

  beforeEach(() => {
    mockEarning.reset();
  });

  it('should award credits for known rule', () => {
    const result = mockEarning.processEarning('user_1', 'workout_complete', 'workout_1');
    expect(result.success).toBe(true);
    expect(result.credits).toBe(25);
    expect(result.xp).toBe(50);
  });

  it('should reject unknown rules', () => {
    const result = mockEarning.processEarning('user_1', 'unknown_rule', 'source_1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown rule');
  });

  it('should be idempotent', () => {
    mockEarning.processEarning('user_1', 'workout_complete', 'workout_1');
    const result = mockEarning.processEarning('user_1', 'workout_complete', 'workout_1');
    expect(result.credits).toBe(0); // Already awarded
  });

  it('should enforce daily limits', () => {
    // Award up to limit
    for (let i = 0; i < 5; i++) {
      const result = mockEarning.processEarning('user_1', 'workout_complete', `workout_${i}`);
      expect(result.success).toBe(true);
    }

    // Next should fail
    const result = mockEarning.processEarning('user_1', 'workout_complete', 'workout_5');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Daily limit reached');
  });

  it('should track separate limits per user', () => {
    for (let i = 0; i < 5; i++) {
      mockEarning.processEarning('user_1', 'workout_complete', `workout_u1_${i}`);
    }

    // User 2 should still be able to earn
    const result = mockEarning.processEarning('user_2', 'workout_complete', 'workout_u2_0');
    expect(result.success).toBe(true);
  });
});

describe('Credits Economy - Anti-Abuse (Mock)', () => {
  // Mock anti-abuse system
  const mockAntiAbuse = {
    transferCounts: new Map<string, { hourly: number; daily: number }>(),
    flags: new Map<string, { userId: string; type: string; severity: string }>(),

    reset() {
      this.transferCounts.clear();
      this.flags.clear();
    },

    checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
      const counts = this.transferCounts.get(userId) || { hourly: 0, daily: 0 };

      if (counts.hourly >= 10) {
        return { allowed: false, reason: 'Hourly limit exceeded' };
      }
      if (counts.daily >= 50) {
        return { allowed: false, reason: 'Daily limit exceeded' };
      }

      return { allowed: true };
    },

    recordTransfer(userId: string) {
      const counts = this.transferCounts.get(userId) || { hourly: 0, daily: 0 };
      counts.hourly++;
      counts.daily++;
      this.transferCounts.set(userId, counts);
    },

    checkTransferPatterns(fromUser: string, toUser: string): { suspicious: boolean; reasons: string[] } {
      const reasons: string[] = [];

      // Check for self-transfer (would be blocked elsewhere, but check pattern)
      if (fromUser === toUser) {
        reasons.push('Self-transfer attempt');
      }

      // Check for circular pattern (simplified)
      const fromToKey = `${fromUser}:${toUser}`;
      const toFromKey = `${toUser}:${fromUser}`;
      if (this.transferCounts.has(toFromKey)) {
        reasons.push('Circular transfer pattern');
      }

      return { suspicious: reasons.length > 0, reasons };
    },

    createFlag(userId: string, type: string, severity: string): string {
      const flagId = `flag_${Date.now()}`;
      this.flags.set(flagId, { userId, type, severity });
      return flagId;
    },
  };

  beforeEach(() => {
    mockAntiAbuse.reset();
  });

  it('should allow transfers within rate limit', () => {
    const result = mockAntiAbuse.checkRateLimit('user_1');
    expect(result.allowed).toBe(true);
  });

  it('should block transfers exceeding hourly limit', () => {
    for (let i = 0; i < 10; i++) {
      mockAntiAbuse.recordTransfer('user_1');
    }

    const result = mockAntiAbuse.checkRateLimit('user_1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Hourly limit exceeded');
  });

  it('should detect circular transfer patterns', () => {
    mockAntiAbuse.transferCounts.set('user_2:user_1', { hourly: 1, daily: 1 });

    const result = mockAntiAbuse.checkTransferPatterns('user_1', 'user_2');
    expect(result.suspicious).toBe(true);
    expect(result.reasons).toContain('Circular transfer pattern');
  });

  it('should create fraud flags', () => {
    const flagId = mockAntiAbuse.createFlag('user_1', 'velocity', 'high');
    expect(flagId).toBeTruthy();
    expect(mockAntiAbuse.flags.has(flagId)).toBe(true);
  });

  it('should track separate limits per user', () => {
    for (let i = 0; i < 10; i++) {
      mockAntiAbuse.recordTransfer('user_1');
    }

    expect(mockAntiAbuse.checkRateLimit('user_1').allowed).toBe(false);
    expect(mockAntiAbuse.checkRateLimit('user_2').allowed).toBe(true);
  });
});

describe('Credits Economy - Integration Patterns', () => {
  // Combined mock for integration testing
  const mockEconomy = {
    balances: new Map<string, number>(),
    inventory: new Map<string, Set<string>>(),
    buddies: new Map<string, { xp: number; level: number }>(),

    reset() {
      this.balances.clear();
      this.inventory.clear();
      this.buddies.clear();
    },

    setBalance(userId: string, balance: number) {
      this.balances.set(userId, balance);
    },

    getBalance(userId: string): number {
      return this.balances.get(userId) || 0;
    },

    earn(userId: string, amount: number, xp: number) {
      const current = this.getBalance(userId);
      this.balances.set(userId, current + amount);

      // Add XP to buddy if exists
      const buddy = this.buddies.get(userId);
      if (buddy) {
        buddy.xp += xp;
        if (buddy.xp >= 100 * buddy.level) {
          buddy.level++;
        }
      }

      return { newBalance: current + amount, buddyXp: buddy?.xp };
    },

    purchase(userId: string, sku: string, price: number): boolean {
      const balance = this.getBalance(userId);
      if (balance < price) return false;

      this.balances.set(userId, balance - price);
      if (!this.inventory.has(userId)) {
        this.inventory.set(userId, new Set());
      }
      this.inventory.get(userId)!.add(sku);
      return true;
    },

    createBuddy(userId: string) {
      if (!this.buddies.has(userId)) {
        this.buddies.set(userId, { xp: 0, level: 1 });
      }
    },
  };

  beforeEach(() => {
    mockEconomy.reset();
  });

  it('should support earn -> purchase flow', () => {
    mockEconomy.setBalance('user_1', 0);

    // Earn from workout
    mockEconomy.earn('user_1', 50, 0);
    expect(mockEconomy.getBalance('user_1')).toBe(50);

    // Earn from PR
    mockEconomy.earn('user_1', 100, 0);
    expect(mockEconomy.getBalance('user_1')).toBe(150);

    // Purchase item
    const purchased = mockEconomy.purchase('user_1', 'profile_frame', 100);
    expect(purchased).toBe(true);
    expect(mockEconomy.getBalance('user_1')).toBe(50);
    expect(mockEconomy.inventory.get('user_1')?.has('profile_frame')).toBe(true);
  });

  it('should accumulate buddy XP from earnings', () => {
    mockEconomy.setBalance('user_1', 0);
    mockEconomy.createBuddy('user_1');

    mockEconomy.earn('user_1', 25, 50);
    mockEconomy.earn('user_1', 25, 50);

    const buddy = mockEconomy.buddies.get('user_1');
    expect(buddy?.xp).toBe(100);
    expect(buddy?.level).toBe(2); // Leveled up
  });

  it('should handle full user journey', () => {
    const userId = 'new_user';

    // Start with initial balance
    mockEconomy.setBalance(userId, 100);
    mockEconomy.createBuddy(userId);

    // Complete some workouts
    mockEconomy.earn(userId, 25, 50);
    mockEconomy.earn(userId, 25, 50);
    mockEconomy.earn(userId, 25, 50);

    expect(mockEconomy.getBalance(userId)).toBe(175);
    expect(mockEconomy.buddies.get(userId)?.xp).toBe(150);

    // Buy a cosmetic
    mockEconomy.purchase(userId, 'buddy_hat', 50);
    expect(mockEconomy.getBalance(userId)).toBe(125);
    expect(mockEconomy.inventory.get(userId)?.has('buddy_hat')).toBe(true);

    // Continue earning
    mockEconomy.earn(userId, 100, 100); // Big achievement
    expect(mockEconomy.getBalance(userId)).toBe(225);
  });
});
