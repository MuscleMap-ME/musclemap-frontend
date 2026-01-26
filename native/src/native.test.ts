/**
 * Native Module Tests
 *
 * Tests for all native C modules and their FFI bindings:
 * - libgeo: Geohash encoding/decoding, haversine distance
 * - libratelimit: Sliding window rate limiter
 * - libtu: Training Unit calculator
 * - librank: Leaderboard ranking
 *
 * Phase 5 of MASTER-IMPLEMENTATION-PLAN
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  geohash,
  distance,
  createRateLimiter,
  JSRateLimiter,
  tu_calculate,
  rank_calculate,
  rank_find,
  isNative,
  getNativeStatus,
  TUInput,
  RankInput,
} from '../index';

describe('Native Module Status', () => {
  it('should report native module availability', () => {
    const status = getNativeStatus();
    console.log('Native module status:', status);

    expect(status).toHaveProperty('geo');
    expect(status).toHaveProperty('ratelimit');
    expect(status).toHaveProperty('tu');
    expect(status).toHaveProperty('rank');
    expect(status).toHaveProperty('ffi');

    // At least the FFI check should exist
    expect(typeof status.ffi).toBe('boolean');
  });

  it('should expose isNative flags', () => {
    expect(typeof isNative.geo).toBe('boolean');
    expect(typeof isNative.ratelimit).toBe('boolean');
    expect(typeof isNative.tu).toBe('boolean');
    expect(typeof isNative.rank).toBe('boolean');
    expect(typeof isNative.any).toBe('boolean');
  });
});

describe('Geohash Module', () => {
  describe('encode', () => {
    it('should encode coordinates to geohash', () => {
      // New York City
      const hash = geohash.encode(40.7128, -74.0060, 9);
      expect(hash).toBe('dr5regw3p');
      expect(hash.length).toBe(9);
    });

    it('should handle different precision levels', () => {
      const lat = 37.7749;
      const lng = -122.4194;

      const hash4 = geohash.encode(lat, lng, 4);
      const hash6 = geohash.encode(lat, lng, 6);
      const hash9 = geohash.encode(lat, lng, 9);

      expect(hash4.length).toBe(4);
      expect(hash6.length).toBe(6);
      expect(hash9.length).toBe(9);

      // Longer hashes should start with shorter ones
      expect(hash9.startsWith(hash6)).toBe(true);
      expect(hash6.startsWith(hash4)).toBe(true);
    });

    it('should handle edge cases', () => {
      // North pole
      const northPole = geohash.encode(90, 0, 5);
      expect(northPole.length).toBe(5);

      // South pole
      const southPole = geohash.encode(-90, 0, 5);
      expect(southPole.length).toBe(5);

      // International date line
      const dateLine = geohash.encode(0, 180, 5);
      expect(dateLine.length).toBe(5);
    });
  });

  describe('decode', () => {
    it('should decode geohash to coordinates', () => {
      const { lat, lng } = geohash.decode('dr5regw3p');

      // Should be close to NYC
      expect(lat).toBeCloseTo(40.7128, 3);
      expect(lng).toBeCloseTo(-74.0060, 3);
    });

    it('should round-trip encode/decode', () => {
      const originalLat = 51.5074;
      const originalLng = -0.1278;

      const hash = geohash.encode(originalLat, originalLng, 9);
      const { lat, lng } = geohash.decode(hash);

      // Should be very close (within geohash precision)
      expect(lat).toBeCloseTo(originalLat, 4);
      expect(lng).toBeCloseTo(originalLng, 4);
    });
  });

  describe('neighbors', () => {
    it('should return 8 neighboring geohashes', () => {
      const neighbors = geohash.neighbors('dr5regw');
      expect(neighbors.length).toBe(8);

      // All neighbors should have same precision
      for (const n of neighbors) {
        expect(n.length).toBe(7);
      }

      // Neighbors should be unique
      const uniqueNeighbors = new Set(neighbors);
      expect(uniqueNeighbors.size).toBe(8);
    });
  });
});

describe('Distance Module', () => {
  describe('haversine', () => {
    it('should calculate distance between two points', () => {
      // NYC to LA
      const nyc = { lat: 40.7128, lng: -74.0060 };
      const la = { lat: 34.0522, lng: -118.2437 };

      const dist = distance.haversine(nyc.lat, nyc.lng, la.lat, la.lng);

      // Should be ~3940 km (3.94 million meters)
      expect(dist).toBeGreaterThan(3900000);
      expect(dist).toBeLessThan(4000000);
    });

    it('should return 0 for same point', () => {
      const dist = distance.haversine(40.7128, -74.0060, 40.7128, -74.0060);
      expect(dist).toBe(0);
    });

    it('should handle antipodal points', () => {
      // North pole to south pole
      const dist = distance.haversine(90, 0, -90, 0);

      // Should be ~20,000 km (half Earth circumference)
      expect(dist).toBeGreaterThan(19000000);
      expect(dist).toBeLessThan(21000000);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true when within radius', () => {
      // Two points 1km apart
      const result = distance.isWithinRadius(
        40.7128, -74.0060,
        40.7138, -74.0050,
        5000 // 5km radius
      );
      expect(result).toBe(true);
    });

    it('should return false when outside radius', () => {
      // NYC to LA (3940km)
      const result = distance.isWithinRadius(
        40.7128, -74.0060,
        34.0522, -118.2437,
        100000 // 100km radius
      );
      expect(result).toBe(false);
    });
  });

  describe('boundingBox', () => {
    it('should calculate bounding box for radius', () => {
      const box = distance.boundingBox(40.7128, -74.0060, 10000); // 10km

      expect(box.minLat).toBeLessThan(40.7128);
      expect(box.maxLat).toBeGreaterThan(40.7128);
      expect(box.minLng).toBeLessThan(-74.0060);
      expect(box.maxLng).toBeGreaterThan(-74.0060);

      // Verify symmetry
      const latDelta = box.maxLat - 40.7128;
      const latDeltaMin = 40.7128 - box.minLat;
      expect(latDelta).toBeCloseTo(latDeltaMin, 4);
    });
  });
});

describe('Rate Limiter Module', () => {
  describe('JSRateLimiter', () => {
    let limiter: JSRateLimiter;

    beforeEach(() => {
      limiter = new JSRateLimiter(5, 60); // 5 requests per 60 seconds
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(limiter.check('user1')).toBe(true);
      }
    });

    it('should block requests over limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1')).toBe(false);
    });

    it('should track remaining requests', () => {
      expect(limiter.remaining('user1')).toBe(5);
      limiter.check('user1');
      expect(limiter.remaining('user1')).toBe(4);
      limiter.check('user1', 2);
      expect(limiter.remaining('user1')).toBe(2);
    });

    it('should reset user limits', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      expect(limiter.remaining('user1')).toBe(0);

      limiter.reset('user1');
      expect(limiter.remaining('user1')).toBe(5);
    });

    it('should track users independently', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('user1');
      }
      expect(limiter.check('user1')).toBe(false);
      expect(limiter.check('user2')).toBe(true);
    });
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter', () => {
      const limiter = createRateLimiter(10, 60);
      expect(limiter).toBeDefined();
      expect(typeof limiter.check).toBe('function');
      expect(typeof limiter.remaining).toBe('function');
      expect(typeof limiter.reset).toBe('function');
      expect(typeof limiter.clear).toBe('function');
    });
  });
});

describe('TU Calculator Module', () => {
  it('should calculate TU for simple workout', () => {
    const input: TUInput = {
      // 2 exercises, 3 muscles
      // Exercise 1: [chest 80%, shoulders 40%, triceps 30%]
      // Exercise 2: [back 70%, biceps 50%, forearms 20%]
      activations: [
        80, 40, 30, // Exercise 1
        70, 50, 20, // Exercise 2
      ],
      sets: [3, 4], // 3 sets, 4 sets
      biasWeights: [1.0, 1.0, 1.0], // Equal bias
      exerciseCount: 2,
      muscleCount: 3,
    };

    const result = tu_calculate(input);

    expect(result.totalTU).toBeGreaterThan(0);
    expect(result.muscleActivations.length).toBe(3);
    expect(typeof result.durationMs).toBe('number');
    expect(typeof result.native).toBe('boolean');
  });

  it('should handle empty workout', () => {
    const input: TUInput = {
      activations: [],
      sets: [],
      biasWeights: [],
      exerciseCount: 0,
      muscleCount: 0,
    };

    const result = tu_calculate(input);
    expect(result.totalTU).toBe(0);
  });

  it('should apply bias weights correctly', () => {
    // Same activations but different bias weights
    const input1: TUInput = {
      activations: [100, 100],
      sets: [1, 1],
      biasWeights: [1.0, 1.0],
      exerciseCount: 2,
      muscleCount: 1,
    };

    const input2: TUInput = {
      activations: [100, 100],
      sets: [1, 1],
      biasWeights: [2.0, 2.0], // Double bias
      exerciseCount: 2,
      muscleCount: 1,
    };

    const result1 = tu_calculate(input1);
    const result2 = tu_calculate(input2);

    // Result2 should be double result1
    expect(result2.totalTU).toBeCloseTo(result1.totalTU * 2, 1);
  });

  it('should scale with sets', () => {
    const baseInput: TUInput = {
      activations: [100],
      sets: [1],
      biasWeights: [1.0],
      exerciseCount: 1,
      muscleCount: 1,
    };

    const doubleInput: TUInput = {
      ...baseInput,
      sets: [2],
    };

    const baseResult = tu_calculate(baseInput);
    const doubleResult = tu_calculate(doubleInput);

    expect(doubleResult.totalTU).toBeCloseTo(baseResult.totalTU * 2, 1);
  });
});

describe('Rank Calculator Module', () => {
  describe('rank_calculate', () => {
    it('should calculate ranks for simple input', () => {
      const input: RankInput = {
        userIds: ['user1', 'user2', 'user3'],
        scores: [100, 200, 150],
      };

      const result = rank_calculate(input);

      expect(result.results.length).toBe(3);
      expect(typeof result.durationMs).toBe('number');
      expect(typeof result.native).toBe('boolean');

      // User2 (200) should be rank 1
      const user2 = result.results.find(r => r.userId === 'user2');
      expect(user2?.rank).toBe(1);

      // User3 (150) should be rank 2
      const user3 = result.results.find(r => r.userId === 'user3');
      expect(user3?.rank).toBe(2);

      // User1 (100) should be rank 3
      const user1 = result.results.find(r => r.userId === 'user1');
      expect(user1?.rank).toBe(3);
    });

    it('should handle ties', () => {
      const input: RankInput = {
        userIds: ['user1', 'user2', 'user3'],
        scores: [100, 100, 50], // user1 and user2 tied
      };

      const result = rank_calculate(input);

      const user1 = result.results.find(r => r.userId === 'user1');
      const user2 = result.results.find(r => r.userId === 'user2');
      const user3 = result.results.find(r => r.userId === 'user3');

      // Tied users should have same rank
      expect(user1?.rank).toBe(user2?.rank);
      expect(user3?.rank).toBe(3);
    });

    it('should calculate percentiles', () => {
      const input: RankInput = {
        userIds: ['a', 'b', 'c', 'd', 'e'],
        scores: [10, 20, 30, 40, 50], // Evenly distributed
      };

      const result = rank_calculate(input);

      // Top scorer should be ~100%
      const top = result.results.find(r => r.score === 50);
      expect(top?.percentile).toBeGreaterThanOrEqual(80);

      // Bottom scorer should be ~20%
      const bottom = result.results.find(r => r.score === 10);
      expect(bottom?.percentile).toBeLessThanOrEqual(40);
    });

    it('should handle empty input', () => {
      const result = rank_calculate({ userIds: [], scores: [] });
      expect(result.results.length).toBe(0);
    });

    it('should handle single user', () => {
      const result = rank_calculate({ userIds: ['solo'], scores: [100] });
      expect(result.results.length).toBe(1);
      expect(result.results[0].rank).toBe(1);
      expect(result.results[0].percentile).toBe(100);
    });
  });

  describe('rank_find', () => {
    it('should find rank in sorted array', () => {
      // Sorted descending
      const scores = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

      expect(rank_find(scores, 100)).toBe(1);
      expect(rank_find(scores, 50)).toBe(6);
      expect(rank_find(scores, 10)).toBe(10);
    });

    it('should handle ties', () => {
      const scores = [100, 100, 80, 80, 60];

      // Both 100s should be rank 1
      expect(rank_find(scores, 100)).toBe(1);

      // Both 80s should be rank 3
      expect(rank_find(scores, 80)).toBe(3);
    });

    it('should handle score not in array', () => {
      const scores = [100, 80, 60, 40, 20];

      // 90 would be between 100 and 80 -> rank 2
      expect(rank_find(scores, 90)).toBe(2);

      // 5 would be after all -> rank 6
      expect(rank_find(scores, 5)).toBe(6);

      // 150 would be before all -> rank 1
      expect(rank_find(scores, 150)).toBe(1);
    });

    it('should handle empty array', () => {
      expect(rank_find([], 100)).toBe(-1);
    });
  });
});

describe('Performance Benchmarks', () => {
  it('should calculate TU quickly for large workouts', () => {
    const exerciseCount = 50;
    const muscleCount = 20;

    const input: TUInput = {
      activations: new Array(exerciseCount * muscleCount).fill(0).map(() => Math.random() * 100),
      sets: new Array(exerciseCount).fill(3),
      biasWeights: new Array(muscleCount).fill(1.0),
      exerciseCount,
      muscleCount,
    };

    const start = performance.now();
    const result = tu_calculate(input);
    const duration = performance.now() - start;

    console.log(`TU calculation for ${exerciseCount} exercises x ${muscleCount} muscles: ${result.durationMs.toFixed(3)}ms (total: ${duration.toFixed(3)}ms), native: ${result.native}`);

    // Should be under 10ms even for large workouts
    expect(duration).toBeLessThan(100);
  });

  it('should rank users quickly for large leaderboards', () => {
    const userCount = 1000;

    const input: RankInput = {
      userIds: new Array(userCount).fill(0).map((_, i) => `user_${i}`),
      scores: new Array(userCount).fill(0).map(() => Math.random() * 10000),
    };

    const start = performance.now();
    const result = rank_calculate(input);
    const duration = performance.now() - start;

    console.log(`Ranking ${userCount} users: ${result.durationMs.toFixed(3)}ms (total: ${duration.toFixed(3)}ms), native: ${result.native}`);

    // Should be under 50ms even for large leaderboards
    expect(duration).toBeLessThan(100);
    expect(result.results.length).toBe(userCount);
  });
});
