// 神楽マキナ Ver0.2 :: mode config, shop rolls, run state & opponent synthesis.
import { makeRng } from '../arena/rng';
import { GRID_H, ITEMS, JOBS, itemById } from './data';
import { CORE, TILE_DEFS, firstFitItem, firstFitTile, poweredItemIds, tileBonuses } from './grid';
import type { Item, JobId, Mode, ModeConfig, PlacedItem, PlacedTile, Rarity, TileKind } from './types';

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
  tiles: PlacedTile[];
  bench: PlacedItem[];
  rerolls: number;
  unique?: string;
  uniqueOffered?: boolean;
}

export interface ShopSlot { slotId: string; item: Item; }

/** common always; rare R>=2; epic R>=(short5/long4); legendary long R>=9; mythic never via shop. */
export function allowedRarities(mode: Mode, round: number): Rarity[] {
  const out: Rarity[] = ['common'];
  if (round >= 2) out.push('rare');
  if (round >= (mode === 'short' ? 5 : 4)) out.push('epic');
  if (mode === 'long' && round >= 9) out.push('legendary');
  return out;
}

export const shouldOfferUnique = (round: number): boolean => round === 5;

/** Starter tiles wired off the CORE so the starting weapon is powered from turn 1. */
function starterTiles(): PlacedTile[] {
  const tiles: PlacedTile[] = [];
  // a plain 2x2 tile covering / touching the core, then a battery chained off it
  const plain = firstFitTile(tiles, 'plain', 0) ?? { x: CORE.x, y: Math.max(0, CORE.y - 1), rot: 0 as 0 | 1 };
  tiles.push({ id: 't_plain', kind: 'plain', x: plain.x, y: plain.y, rot: plain.rot });
  const bat = firstFitTile(tiles, 'battery', 0);
  if (bat) tiles.push({ id: 't_battery', kind: 'battery', x: bat.x, y: bat.y, rot: bat.rot });
  return tiles;
}

export function newRun(mode: Mode, job: JobId): RunState {
  const tiles = starterTiles();
  const board: PlacedItem[] = [];
  const startKey = JOBS[job].startingWeapon;
  const startItem = itemById(startKey);
  if (startItem) {
    // place the starting weapon on a powered tile cell
    const fit = firstFitItem(board, startItem, 0);
    if (fit) board.push({ id: 'start', key: startKey, x: fit.x, y: fit.y, rot: fit.rot, level: 1 });
  }
  return {
    mode, job, round: 1, wins: 0, lives: MODES[mode].lives, gold: MODES[mode].startGold,
    board, tiles, bench: [], rerolls: 0, uniqueOffered: false,
  };
}

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 4, mythic: 0 };

export function rollShop(mode: Mode, round: number, job: JobId, seed: number): ShopSlot[] {
  const rng = makeRng(seed);
  const rarities = allowedRarities(mode, round);
  const pool = ITEMS.filter(
    (it) => !it.unique && it.rarity !== 'mythic' && (it.job === null || it.job === job) && rarities.includes(it.rarity),
  );
  const slots: ShopSlot[] = [];
  if (pool.length === 0) return slots;
  const weighted = pool.map((it) => ({ it, w: (RARITY_WEIGHT[it.rarity] || 1) * (it.job === job ? 1.6 : 1) }));
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

/**
 * Synthesize a scaling opponent circuit. Items are returned with a generous
 * powered tile substrate; callers should run resolveBoard with { allPowered: true }.
 */
export function genOpponentBoard(
  mode: Mode,
  round: number,
  job: JobId,
  seed: number,
): { board: PlacedItem[]; tiles: PlacedTile[]; name: string } {
  const rng = makeRng(seed);
  const cfg = MODES[mode];
  const budget = Math.round((10 + round * 6) * Math.pow(cfg.scale, round));
  const rar = allowedRarities(mode, round + 1);
  const pool = ITEMS.filter(
    (it) => !it.unique && it.rarity !== 'mythic' && (it.job === null || it.job === job) && rar.includes(it.rarity),
  );
  const board: PlacedItem[] = [];
  let spent = 0;
  let guard = 0;
  let seq = 0;
  while (spent < budget && guard++ < 80 && pool.length > 0) {
    const it = pool[Math.floor(rng() * pool.length)] as Item | undefined;
    if (!it || spent + it.cost > budget + 4) continue;
    const rot: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const fit = firstFitItem(board, it, rot);
    if (!fit) continue;
    board.push({ id: `o${seq++}`, key: it.key, x: fit.x, y: fit.y, rot: fit.rot, level: 1 });
    spent += it.cost;
  }
  // ensure at least one weapon
  if (!board.some((p) => itemById(p.key)?.weapon)) {
    const wpnKey = pool.find((it) => it.weapon)?.key ?? ITEMS.find((it) => it.weapon && !it.unique)?.key;
    const wpn = wpnKey ? itemById(wpnKey) : undefined;
    if (wpn) {
      const fit = firstFitItem(board, wpn, 0);
      if (fit) board.push({ id: `o${seq++}`, key: wpn.key, x: fit.x, y: fit.y, rot: fit.rot, level: 1 });
    }
  }
  // a generous tile substrate covering the whole board (opponents are pre-wired)
  const tiles: PlacedTile[] = [{ id: 'ot0', kind: 'plain', x: 0, y: 0, rot: 0 }];
  const names = ['暴走機関', '崩レタ自動人形', '錆ビ神ノ残骸', '無銘ノ機巧兵', '故障シタ守機', '反逆ノ演算体'];
  return { board, tiles, name: names[Math.floor(rng() * names.length)] };
}

// re-exports for convenience (UI / callers)
export { CORE, TILE_DEFS, poweredItemIds, tileBonuses, GRID_H };
export type { TileKind };
