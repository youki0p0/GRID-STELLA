// 神楽マキナ :: mode config, shop rolls & opponent synthesis.
import { makeRng } from '../arena/rng';
import { ITEMS, JOBS, itemById } from './data';
import { firstFit } from './grid';
import type { Item, JobId, Mode, ModeConfig, PlacedItem, Rarity } from './types';

export const MODES: Record<Mode, ModeConfig> = {
  short: { mode: 'short', winsToCrown: 10, lives: 3, maxRounds: 12, startGold: 8, goldPerRound: 6, scale: 1.0 },
  long: { mode: 'long', winsToCrown: 15, lives: 5, maxRounds: 19, startGold: 8, goldPerRound: 7, scale: 1.14 },
};

export const REROLL_COST = 1;
export const SHOP_SLOTS = 4;

export interface RunState {
  mode: Mode;
  job: JobId;
  round: number;
  wins: number;
  lives: number;
  gold: number;
  board: PlacedItem[];
  bench: PlacedItem[];
  rerolls: number;
}

export interface ShopSlot { slotId: string; item: Item; }

export function allowedRarities(mode: Mode, round: number): Rarity[] {
  const out: Rarity[] = ['common'];
  if (round >= 2) out.push('rare');
  if (round >= (mode === 'short' ? 5 : 4)) out.push('epic');
  if (mode === 'long' && round >= 9) out.push('legendary');
  return out;
}

export function newRun(mode: Mode, job: JobId): RunState {
  return { mode, job, round: 1, wins: 0, lives: MODES[mode].lives, gold: MODES[mode].startGold, board: [], bench: [], rerolls: 0 };
}

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 4 };

export function rollShop(mode: Mode, round: number, job: JobId, seed: number): ShopSlot[] {
  const rng = makeRng(seed);
  const rarities = allowedRarities(mode, round);
  const pool = ITEMS.filter((it) => (it.job === null || it.job === job) && rarities.includes(it.rarity));
  const weighted = pool.map((it) => ({ it, w: RARITY_WEIGHT[it.rarity] * (it.job === job ? 1.6 : 1) }));
  const slots: ShopSlot[] = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let x = rng() * total;
    let chosen = weighted[0].it;
    for (const cand of weighted) {
      x -= cand.w;
      if (x <= 0) { chosen = cand.it; break; }
    }
    slots.push({ slotId: `s${round}_${i}_${Math.floor(rng() * 1e6)}`, item: chosen });
  }
  return slots;
}

export const sellValue = (item: Item): number => Math.max(1, Math.floor(item.cost / 2));

export function battleTime(mode: Mode): number {
  return mode === 'short' ? 26 : 34;
}

/** Synthesize a scaling opponent circuit (assumed pre-wired → all modules powered). */
export function genOpponentBoard(mode: Mode, round: number, job: JobId, seed: number): { board: PlacedItem[]; name: string } {
  const rng = makeRng(seed);
  const cfg = MODES[mode];
  const budget = Math.round((10 + round * 6) * Math.pow(cfg.scale, round));
  const rar = allowedRarities(mode, round + 1);
  const pool = ITEMS.filter((it) => (it.job === null || it.job === job) && rar.includes(it.rarity));
  const board: PlacedItem[] = [];
  let spent = 0;
  let guard = 0;
  let seq = 0;
  while (spent < budget && guard++ < 60) {
    const it = pool[Math.floor(rng() * pool.length)] as Item | undefined;
    if (!it || spent + it.cost > budget + 4) continue;
    const rot: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const fit = firstFit(board, it, rot);
    if (!fit) continue;
    board.push({ id: `o${seq++}`, key: it.key, x: fit.x, y: fit.y, rot: fit.rot, level: 1 });
    spent += it.cost;
  }
  if (board.length === 0) board.push({ id: 'o0', key: 'dart', x: 1, y: 0, rot: 0, level: 1 });
  // ensure the dummy can act: give it at least one weapon
  if (!board.some((p) => itemById(p.key)?.weapon)) {
    const fit = firstFit(board, itemById('autocannon')!, 0);
    if (fit) board.push({ id: `o${seq++}`, key: 'autocannon', x: fit.x, y: fit.y, rot: fit.rot, level: 1 });
  }
  const names = ['暴走機関', '崩レタ自動人形', '錆ビ神ノ残骸', '無銘ノ機巧兵', '故障シタ守機', '反逆ノ演算体'];
  return { board, name: names[Math.floor(rng() * names.length)] };
}
