// 神楽マキナ :: separate Short / Long ranked ladders (Elo-style), machine-themed.
import type { BattleResult, Mode, RankState, Tier } from './types';

export const TIERS: { tier: Tier; ja: string; min: number }[] = [
  { tier: 'Scrap', ja: '残骸', min: 0 },
  { tier: 'Iron', ja: '鉄機', min: 1100 },
  { tier: 'Cobalt', ja: '蒼鋼', min: 1300 },
  { tier: 'Plasma', ja: '電漿', min: 1500 },
  { tier: 'Quantum', ja: '量子', min: 1750 },
  { tier: 'Singularity', ja: '特異点', min: 2000 },
];

export const DEFAULT_RANK: RankState = {
  shortRating: 1000,
  longRating: 1000,
  shortWins: 0,
  longWins: 0,
  shortPeak: 1000,
  longPeak: 1000,
  shortCrowns: 0,
  longCrowns: 0,
};

export function tierOf(rating: number): { tier: Tier; ja: string; division: number } {
  let cur = TIERS[0];
  for (const t of TIERS) if (rating >= t.min) cur = t;
  const idx = TIERS.indexOf(cur);
  const next = TIERS[idx + 1]?.min ?? cur.min + 300;
  const span = (next - cur.min) / 3;
  const division = Math.min(3, Math.max(1, 3 - Math.floor((rating - cur.min) / Math.max(1, span))));
  return { tier: cur.tier, ja: cur.ja, division };
}

export function rankLabel(rating: number): string {
  const { tier, ja, division } = tierOf(rating);
  return tier === 'Singularity' ? `${ja} ${rating}` : `${ja} ${division}`;
}

export const myRating = (r: RankState, m: Mode): number => (m === 'short' ? r.shortRating : r.longRating);

/** Elo-ish delta vs an opponent rating. */
export function ratingDelta(myR: number, oppR: number, result: BattleResult): number {
  const K = 28;
  const expected = 1 / (1 + Math.pow(10, (oppR - myR) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

export function applyResult(rank: RankState, mode: Mode, oppRating: number, result: BattleResult): { rank: RankState; delta: number } {
  const cur = myRating(rank, mode);
  const delta = ratingDelta(cur, oppRating, result);
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

/** Record a tournament crown (reaching winsToCrown) — a small rating bonus + tally. */
export function applyCrown(rank: RankState, mode: Mode): RankState {
  const next = { ...rank };
  if (mode === 'short') {
    next.shortCrowns += 1;
    next.shortRating += 24;
    next.shortPeak = Math.max(next.shortPeak, next.shortRating);
  } else {
    next.longCrowns += 1;
    next.longRating += 30;
    next.longPeak = Math.max(next.longPeak, next.longRating);
  }
  return next;
}

const KEY = 'mk-rank';
export function loadRank(): RankState {
  if (typeof window === 'undefined') return DEFAULT_RANK;
  try {
    const r = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (r && typeof r === 'object') return { ...DEFAULT_RANK, ...r };
  } catch {
    /* noop */
  }
  return DEFAULT_RANK;
}
export function saveRank(r: RankState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* noop */
  }
}

/** Opponent rating for PvE/ghost scaling by round (so deeper rounds reward more). */
export function pveRating(round: number): number {
  return 900 + round * 40;
}
