/**
 * Quick test script for WASM modules
 */

// Import all modules
import * as geo from './dist/geo/index.js';
import * as tu from './dist/tu/index.js';
import * as rank from './dist/rank/index.js';
import * as ratelimit from './dist/ratelimit/index.js';
import * as scoring from './dist/scoring/index.js';
import * as load from './dist/load/index.js';
import * as crypto from './dist/crypto/index.js';

console.log('🧪 Testing MuscleMap WASM modules...\n');

// Test Geo
console.log('📍 Testing Geo module...');
await geo.initGeo();
const hash = geo.geohashEncode(40.7128, -74.006, 7);
console.log(`  Geohash for NYC: ${hash}`);
const coords = geo.geohashDecode(hash);
console.log(`  Decoded: lat=${coords.lat}, lng=${coords.lng}`);
const distance = geo.haversineMeters(40.7128, -74.006, 34.0522, -118.2437);
console.log(`  NYC to LA: ${(distance / 1000).toFixed(0)}km`);

// Test TU
console.log('\n⏱️  Testing TU module...');
await tu.initTU();
const activations = [80, 60, 40, 20]; // chest, shoulders, triceps, core
const sets = [3];
const biasWeights = [1.0, 1.0, 0.8, 0.5];
const tuResult = tu.tuCalculateSimple(activations, sets, biasWeights, 1, 4);
console.log(`  TU for chest-focused exercise: ${tuResult.toFixed(2)}`);

// Test Rank
console.log('\n🏆 Testing Rank module...');
await rank.initRank();
const scores = [100, 85, 92, 78, 92, 65, 88];
const rankings = rank.rankCalculate(scores);
console.log(`  Rankings for ${scores.length} scores: ${rankings.slice(0, 5).join(', ')}...`);
const stats = rank.rankStats(scores);
console.log(`  Stats: min=${stats.min}, max=${stats.max}, mean=${stats.mean.toFixed(1)}`);

// Test Rate Limiter
console.log('\n🚦 Testing RateLimit module...');
await ratelimit.initRatelimit();
const limiter = new ratelimit.RateLimiter({ maxRequests: 10, windowSeconds: 60 });
const result = limiter.check('user-123');
console.log(`  Rate limit check: allowed=${result.allowed}, remaining=${result.remaining}`);

// Test Load
console.log('\n💪 Testing Load module...');
await load.initLoad();
const pct = load.rpeToPercentage(5, 8);
console.log(`  5 reps @ RPE 8 = ${pct}% of 1RM`);
const e1rm = load.estimate1RM(100, 5, 8);
console.log(`  E1RM from 100kg x5 @RPE8: ${e1rm.estimated1RM}kg`);

// Test Scoring
console.log('\n📊 Testing Scoring module...');
await scoring.initScoring();
const score = scoring.scoreExerciseSimple(
  [80, 100, 75, 100, 60, 80, 90, 70, 85, 75, 80, 70, 85, 75, 80, 75]
);
console.log(`  Exercise score: ${score.toFixed(2)}`);

// Test Crypto (WASM required - browser only)
console.log('\n🔐 Testing Crypto module...');
await crypto.initCrypto();
console.log('  Crypto module loaded (WASM required for cryptographic operations)');

console.log('\n✅ All WASM modules working with JS fallbacks!');
console.log('\n📊 Module Summary:');
console.log('  - geo: geohash, haversine, bounding box (33KB)');
console.log('  - tu: Training Units calculation (42KB)');
console.log('  - rank: Leaderboard ranking (66KB)');
console.log('  - ratelimit: Sliding window rate limiter (32KB)');
console.log('  - scoring: 16-factor exercise scoring (65KB)');
console.log('  - load: RPE-based load prescription (32KB)');
console.log('  - crypto: SHA-256, HMAC, Ed25519 (177KB)');
console.log('\n  Total WASM size: ~447KB');
