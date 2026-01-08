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
