import { describe, expect, it } from 'vitest';
import { JOBS, ITEMS, MAX_LEVEL, itemById, statMul } from './data';
import { canMerge, lvl, mergedTarget } from './merge';
import { canPlace, cellsOf, firstFit } from './bag';
import { resolveBoard, simulate } from './battle';
import { allowedRarities, genOpponentBoard, MODES, newRun } from './run';
import { rollShop, SHOP_SLOTS } from './shop';
import { DEFAULT_RANK, applyResult, rankLabel, ratingDelta, tierOf } from './rank';
import type { PlacedItem } from './types';

const place = (key: string, x: number, y: number, rot: 0 | 1 = 0): PlacedItem => ({ id: `${key}_${x}_${y}`, key, x, y, rot });

describe('data integrity', () => {
  it('every item has a unique key and valid footprint', () => {
    const keys = new Set<string>();
    for (const it of ITEMS) {
      expect(keys.has(it.key)).toBe(false);
      keys.add(it.key);
      expect(it.w).toBeGreaterThanOrEqual(1);
      expect(it.h).toBeGreaterThanOrEqual(1);
      expect(it.cost).toBeGreaterThan(0);
    }
    expect(ITEMS.length).toBeGreaterThanOrEqual(50);
  });
});

describe('merge / level system', () => {
  it('merges identical same-level instruments and caps at MAX_LEVEL', () => {
    const a = place('saber', 0, 0);
    const b = place('saber', 1, 0);
    expect(canMerge(a, b)).toBe(true);
    const up = mergedTarget(b);
    expect(lvl(up)).toBe(2);
    expect(canMerge(a, up)).toBe(false); // different level
    const maxed = { ...b, level: MAX_LEVEL };
    expect(canMerge(maxed, { ...a, level: MAX_LEVEL })).toBe(false); // capped
  });
  it('refuses to merge different instruments', () => {
    expect(canMerge(place('saber', 0, 0), place('needle', 1, 0))).toBe(false);
  });
  it('statMul rises with level and scales resolved atk', () => {
    expect(statMul(2)).toBeGreaterThan(statMul(1));
    expect(statMul(3)).toBeGreaterThan(statMul(2));
    const lo = resolveBoard('p', [{ ...place('saber', 0, 0), level: 1 }], 0, 100).modules[0].atk;
    const hi = resolveBoard('p', [{ ...place('saber', 0, 0), level: 3 }], 0, 100).modules[0].atk;
    expect(hi).toBeGreaterThan(lo);
  });
  it('a fully-merged board beats its unmerged twin', () => {
    const board = [place('saber', 0, 0), place('twinblade', 2, 0), place('aegis', 4, 0)];
    const merged = resolveBoard('A', board.map((p) => ({ ...p, level: 3 })), 10, JOBS.sentinel.startingHp);
    const plain = resolveBoard('B', board.map((p) => ({ ...p, level: 1 })), 10, JOBS.sentinel.startingHp);
    expect(simulate(merged, plain, 7, 30).result).toBe('win');
  });
});

describe('bag geometry', () => {
  it('rejects out-of-bounds and overlap, accepts free cells', () => {
    const board: PlacedItem[] = [place('aegis', 0, 0)]; // 2x2
    const aegis = itemById('aegis')!;
    expect(cellsOf(board[0])).toHaveLength(4);
    expect(canPlace(board, itemById('needle')!, 0, 0, 0)).toBe(false); // overlap
    expect(canPlace(board, itemById('needle')!, 5, 4, 0)).toBe(true); // free
    expect(canPlace(board, aegis, 5, 0, 0)).toBe(false); // off the right edge
  });
  it('firstFit finds a slot on an empty board', () => {
    const fit = firstFit([], itemById('saber')!, 0);
    expect(fit).not.toBeNull();
  });
});

describe('battle resolution', () => {
  it('adds flat maxHp from defensive items', () => {
    const c = resolveBoard('p', [place('plate', 0, 0)], 0, 100);
    expect(c.maxHp).toBe(118); // 100 + 18
  });
  it('adjacency aura boosts a neighbouring blade', () => {
    const lone = resolveBoard('p', [place('saber', 0, 0)], 0, 100).modules[0].atk;
    const buffed = resolveBoard('p', [place('saber', 0, 0), place('shard', 1, 0)], 0, 100)
      .modules.find((m) => m.key === 'saber')!.atk;
    expect(buffed).toBeGreaterThan(lone);
  });
  it('gold scaling raises broker damage', () => {
    const poor = resolveBoard('p', [place('bro_ledger', 0, 0)], 0, 100).modules[0].atk;
    const rich = resolveBoard('p', [place('bro_ledger', 0, 0)], 60, 100).modules[0].atk;
    expect(rich).toBeGreaterThan(poor);
  });
  it('is deterministic and a strong board beats an empty-ish one', () => {
    const strong = resolveBoard('A', [place('greatsword', 0, 0), place('aegis', 2, 0), place('twinblade', 4, 0)], 20, JOBS.sentinel.startingHp);
    const weak = resolveBoard('B', [place('needle', 0, 0)], 0, 60);
    const a = simulate(strong, weak, 123, 24);
    const b = simulate(strong, weak, 123, 24);
    expect(a.result).toBe(b.result);
    expect(a.pHp).toBe(b.pHp);
    expect(a.result).toBe('win');
  });
});

describe('shop & run config', () => {
  it('short never offers legendary; long gates it late', () => {
    expect(allowedRarities('short', 12)).not.toContain('legendary');
    expect(allowedRarities('long', 2)).not.toContain('legendary');
    expect(allowedRarities('long', 12)).toContain('legendary');
  });
  it('rolls exactly SHOP_SLOTS legal items', () => {
    const slots = rollShop('short', 3, 'sentinel', JOBS.sentinel.affinity, 42);
    expect(slots).toHaveLength(SHOP_SLOTS);
    for (const s of slots) {
      expect(s.item.job === null || s.item.job === 'sentinel').toBe(true);
    }
  });
  it('opponent board scales up and is never empty', () => {
    const early = genOpponentBoard('short', 1, 'sentinel', 1);
    const late = genOpponentBoard('long', 12, 'sentinel', 1);
    expect(early.board.length).toBeGreaterThan(0);
    expect(late.board.length).toBeGreaterThanOrEqual(early.board.length);
  });
  it('mode configs match the agreed MVP spec', () => {
    expect(MODES.short.winsToCrown).toBe(10);
    expect(MODES.short.lives).toBe(3);
    expect(MODES.long.winsToCrown).toBe(15);
    expect(MODES.long.lives).toBe(5);
    expect(newRun('long', 'broker').gold).toBe(MODES.long.startGold);
  });
});

describe('separate ladders', () => {
  it('a win raises rating and only the played ladder moves', () => {
    const { rank, delta } = applyResult(DEFAULT_RANK, 'short', 1000, 'win');
    expect(delta).toBeGreaterThan(0);
    expect(rank.shortRating).toBeGreaterThan(1000);
    expect(rank.longRating).toBe(1000);
    expect(rank.shortWins).toBe(1);
  });
  it('a loss vs a stronger foe costs fewer points than beating them gains', () => {
    const lose = ratingDelta(1000, 1400, 'lose');
    const win = ratingDelta(1000, 1400, 'win');
    expect(lose).toBeGreaterThan(-32);
    expect(win).toBeGreaterThan(0);
  });
  it('tier labels climb with rating', () => {
    expect(tierOf(1000).tier).toBe('Bronze');
    expect(tierOf(2100).tier).toBe('Master');
    expect(rankLabel(2100)).toContain('Master');
  });
});
