/**
 * Leaderboard Ranking Calculator
 * High-performance ranking with tie handling and percentiles
 */

let wasmModule: any = null;

export async function initRank(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    const mod = await import('../../pkg/musclemap_rank/musclemap_rank.js');
    await mod.default?.();
    wasmModule = mod;
  } catch (e) {
    console.warn('[rank] WASM module not available, using JS fallback');
    wasmModule = false;
  }
}

export interface RankEntry {
  id: string;
  score: number;
  rank: number;
  percentile: number;
}

export interface RankStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

/**
 * Calculate standard competition ranks (with gaps for ties)
 * e.g., [100, 90, 90, 80] → [1, 2, 2, 4]
 */
export function rankCalculate(scores: number[]): number[] {
  if (wasmModule?.rank_calculate) {
    return Array.from(wasmModule.rank_calculate(scores));
  }

  // JS fallback - standard competition ranking
  const sorted = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score);

  const ranks = new Array(scores.length);
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      rank = i + 1;
    }
    ranks[sorted[i].index] = rank;
  }

  return ranks;
}

/**
 * Calculate dense ranks (no gaps for ties)
 * e.g., [100, 90, 90, 80] → [1, 2, 2, 3]
 */
export function rankDense(scores: number[]): number[] {
  if (wasmModule?.rank_dense) {
    return Array.from(wasmModule.rank_dense(scores));
  }

  // JS fallback
  const sorted = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score);

  const ranks = new Array(scores.length);
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      rank++;
    }
    ranks[sorted[i].index] = rank;
  }

  return ranks;
}

/**
 * Calculate percentiles for each score
 */
export function rankPercentiles(scores: number[]): number[] {
  if (wasmModule?.rank_percentiles) {
    return Array.from(wasmModule.rank_percentiles(scores));
  }

  // JS fallback
  const n = scores.length;
  if (n === 0) return [];
  if (n === 1) return [100];

  const sorted = [...scores].sort((a, b) => b - a);

  return scores.map((score) => {
    const below = sorted.filter((s) => s < score).length;
    return Math.round((below / (n - 1)) * 10000) / 100;
  });
}

/**
 * Calculate full ranking with IDs, scores, ranks, and percentiles
 */
export function rankCalculateFull(
  ids: string[],
  scores: number[]
): RankEntry[] {
  if (wasmModule?.rank_calculate_full) {
    const result = wasmModule.rank_calculate_full(ids, scores);
    return result.map((r: any) => ({
      id: r.id,
      score: r.score,
      rank: r.rank,
      percentile: r.percentile,
    }));
  }

  // JS fallback
  const ranks = rankCalculate(scores);
  const percentiles = rankPercentiles(scores);

  return ids.map((id, i) => ({
    id,
    score: scores[i],
    rank: ranks[i],
    percentile: percentiles[i],
  }));
}

/**
 * Find rank for a specific score in a sorted array
 * Uses binary search for O(log n) performance
 */
export function rankFind(sortedScores: number[], targetScore: number): number {
  if (wasmModule?.rank_find) {
    return wasmModule.rank_find(sortedScores, targetScore);
  }

  // JS fallback - binary search
  let left = 0;
  let right = sortedScores.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedScores[mid] > targetScore) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left + 1;
}

/**
 * Get top N entries
 */
export function rankTopN(
  ids: string[],
  scores: number[],
  n: number
): RankEntry[] {
  if (wasmModule?.rank_top_n) {
    const result = wasmModule.rank_top_n(ids, scores, n);
    return result.map((r: any) => ({
      id: r.id,
      score: r.score,
      rank: r.rank,
      percentile: r.percentile,
    }));
  }

  // JS fallback
  const full = rankCalculateFull(ids, scores);
  return full.sort((a, b) => a.rank - b.rank).slice(0, n);
}

/**
 * Calculate statistics for a set of scores
 */
export function rankStats(scores: number[]): RankStats {
  if (wasmModule?.rank_stats) {
    const result = wasmModule.rank_stats(scores);
    return {
      count: result.count,
      min: result.min,
      max: result.max,
      mean: result.mean,
      median: result.median,
      stdDev: result.std_dev,
    };
  }

  // JS fallback
  const n = scores.length;
  if (n === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Median
  const median =
    n % 2 === 1
      ? sorted[Math.floor(n / 2)]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  // Standard deviation
  const variance =
    scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
  };
}
