// GRID STELLA — ARENA :: shop generation.
import { ITEMS } from './data';
import { makeRng } from './rng';
import type { Item, JobId, Mode, Rarity } from './types';
import { allowedRarities } from './run';

export const SHOP_SLOTS = 4;

const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 28, epic: 10, legendary: 4 };

export interface ShopSlot {
  slotId: string;
  item: Item;
}

/**
 * Roll a shop. Items are gated by round/mode rarity, biased toward the job's
 * affinity tags so each discipline's tactics show up naturally.
 */
export function rollShop(mode: Mode, round: number, job: JobId, affinity: string[], seed: number): ShopSlot[] {
  const rng = makeRng(seed);
  const rarities = allowedRarities(mode, round);
  const pool = ITEMS.filter((it) => (it.job === null || it.job === job) && rarities.includes(it.rarity));

  const weighted = pool.map((it) => {
    let w = RARITY_WEIGHT[it.rarity];
    if (it.tags.some((t) => affinity.includes(t))) w *= 1.8; // affinity bias
    if (it.job === job) w *= 1.5; // own-discipline bias
    return { it, w };
  });

  const slots: ShopSlot[] = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let x = rng() * total;
    let chosen = weighted[0].it;
    for (const cand of weighted) {
      x -= cand.w;
      if (x <= 0) {
        chosen = cand.it;
        break;
      }
    }
    slots.push({ slotId: `s${round}_${i}_${Math.floor(rng() * 1e6)}`, item: chosen });
  }
  return slots;
}

/** Sell refund — half the cost, rounded down, minimum 1. */
export function sellValue(item: Item): number {
  return Math.max(1, Math.floor(item.cost / 2));
}
