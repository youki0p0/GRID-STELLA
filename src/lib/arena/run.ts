// GRID STELLA — ARENA :: mode configuration & opponent synthesis.
import { firstFit } from './bag';
import { ITEMS, itemById } from './data';
import { makeRng } from './rng';
import type { Item, Mode, ModeConfig, PlacedItem, Rarity, RunState } from './types';

export const MODES: Record<Mode, ModeConfig> = {
  short: { mode: 'short', winsToCrown: 10, lives: 3, maxRounds: 12, startGold: 8, goldPerRound: 6, scale: 1.0 },
  long: { mode: 'long', winsToCrown: 15, lives: 5, maxRounds: 19, startGold: 8, goldPerRound: 7, scale: 1.14 },
};

export const REROLL_COST = 1;

/** Rarities available at a given round / mode (legendary is long-only & late). */
export function allowedRarities(mode: Mode, round: number): Rarity[] {
  const out: Rarity[] = ['common'];
  if (round >= 2) out.push('rare');
  if (round >= (mode === 'short' ? 5 : 4)) out.push('epic');
  if (mode === 'long' && round >= 9) out.push('legendary');
  // short can *occasionally* see one epic late but never legendary
  return out;
}

export function newRun(mode: Mode, job: RunState['job']): RunState {
  return {
    mode,
    job,
    round: 1,
    wins: 0,
    lives: MODES[mode].lives,
    gold: MODES[mode].startGold,
    hp: 0,
    maxHp: 0,
    board: [],
    bench: [],
    rerolls: 0,
  };
}

/** Synthesize a scaling opponent board for PvE / empty-pool fallback. */
export function genOpponentBoard(mode: Mode, round: number, job: RunState['job'], seed: number): { board: PlacedItem[]; gold: number; name: string } {
  const rng = makeRng(seed);
  const cfg = MODES[mode];
  const budget = Math.round((10 + round * 6) * Math.pow(cfg.scale, round));
  const rar = allowedRarities(mode, round + 1); // opponents trend a touch ahead

  // bias toward the same job's pool + commons for a coherent enemy build
  const pool = ITEMS.filter((it) => (it.job === null || it.job === job) && rar.includes(it.rarity));
  const board: PlacedItem[] = [];
  let spent = 0;
  let guard = 0;
  let seq = 0;
  while (spent < budget && guard++ < 60) {
    const it = pool[Math.floor(rng() * pool.length)] as Item | undefined;
    if (!it) break;
    if (spent + it.cost > budget + 4) continue;
    const rot: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const fit = firstFit(board, it, rot);
    if (!fit) continue;
    board.push({ id: `o${seq++}`, key: it.key, x: fit.x, y: fit.y, rot: fit.rot });
    spent += it.cost;
  }
  // ensure the dummy never has an empty board
  if (board.length === 0) {
    const it = itemById('needle')!;
    board.push({ id: 'o0', key: it.key, x: 0, y: 0, rot: 0 });
  }
  const names = ['彷徨う観測影', '崩れた調律盤', '歪みの使徒', '無名の方位士', '錆びた自動人形', '残響の観測者'];
  return { board, gold: 6 + round * 4, name: names[Math.floor(rng() * names.length)] };
}

/** Time limit for a battle — longer in long mode so scaling builds resolve. */
export function battleTime(mode: Mode): number {
  return mode === 'short' ? 24 : 32;
}
