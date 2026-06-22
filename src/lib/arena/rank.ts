// GRID STELLA — ARENA :: separate Short / Long ranked ladders (Elo-style).
import type { BattleResult, Mode, RankState, Tier } from './types';

export const TIERS: { tier: Tier; ja: string; min: number }[] = [
  { tier: 'Bronze', ja: '青銅', min: 0 },
  { tier: 'Silver', ja: '白銀', min: 1100 },
  { tier: 'Gold', ja: '黄金', min: 1300 },
  { tier: 'Platinum', ja: '白金', min: 1500 },
  { tier: 'Diamond', ja: '金剛', min: 1750 },
  { tier: 'Master', ja: '観測卿', min: 2000 },
];

export const DEFAULT_RANK: RankState = {
  shortRating: 1000,
  longRating: 1000,
  shortWins: 0,
  longWins: 0,
  shortPeak: 1000,
  longPeak: 1000,
};

export function tierOf(rating: number): { tier: Tier; ja: string; division: number } {
  let cur = TIERS[0];
  for (const t of TIERS) if (rating >= t.min) cur = t;
  // 3 divisions per tier (III..I as rating climbs within the band)
  const idx = TIERS.indexOf(cur);
  const next = TIERS[idx + 1]?.min ?? cur.min + 300;
  const span = (next - cur.min) / 3;
  const division = Math.min(3, 3 - Math.floor((rating - cur.min) / Math.max(1, span)));
  return { tier: cur.tier, ja: cur.ja, division: Math.max(1, division) };
}

export function rankLabel(rating: number): string {
  const { tier, division } = tierOf(rating);
  return tier === 'Master' ? `Master ${rating}` : `${tier} ${division}`;
}

/** Rating delta for a ranked match vs an opponent of `oppRating`. */
export function ratingDelta(myRating: number, oppRating: number, result: BattleResult): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

export function applyResult(rank: RankState, mode: Mode, oppRating: number, result: BattleResult): { rank: RankState; delta: number } {
  const myRating = mode === 'short' ? rank.shortRating : rank.longRating;
  const delta = ratingDelta(myRating, oppRating, result);
  const next: RankState = { ...rank };
  if (mode === 'short') {
    next.shortRating = Math.max(0, rank.shortRating + delta);
    if (result === 'win') next.shortWins += 1;
    next.shortPeak = Math.max(rank.shortPeak, next.shortRating);
  } else {
    next.longRating = Math.max(0, rank.longRating + delta);
    if (result === 'win') next.longWins += 1;
    next.longPeak = Math.max(rank.longPeak, next.longRating);
  }
  return { rank: next, delta };
}
