import { describe, expect, it } from 'vitest';
import {
  MODES,
  REROLL_COST,
  SHOP_SLOTS,
  allowedRarities,
  battleTime,
  genOpponentBoard,
  newRun,
  rollShop,
  sellValue,
  shouldOfferUnique,
} from './run';
import { applyMerges, mergeCandidateIds, pendingMerges } from './merge';
import { itemById } from './data';
import type { PlacedItem } from './types';

const item = (id: string, key: string, x: number, y: number, rot: 0 | 1 = 0): PlacedItem => ({ id, key, x, y, rot, level: 1 });

describe('mode config matches the MVP spec', () => {
  it('short', () => {
    expect(MODES.short.winsToCrown).toBe(10);
    expect(MODES.short.lives).toBe(3);
    expect(MODES.short.maxRounds).toBe(12);
    expect(MODES.short.startGold).toBe(8);
    expect(MODES.short.goldPerRound).toBe(6);
  });
  it('long', () => {
    expect(MODES.long.winsToCrown).toBe(15);
    expect(MODES.long.lives).toBe(5);
    expect(MODES.long.maxRounds).toBe(19);
    expect(MODES.long.startGold).toBe(8);
    expect(MODES.long.goldPerRound).toBe(7);
    expect(MODES.long.scale).toBeCloseTo(1.14, 5);
  });
  it('constants', () => {
    expect(REROLL_COST).toBe(1);
    expect(SHOP_SLOTS).toBe(4);
  });
});

describe('rarity gating', () => {
  it('common always; rare R>=2', () => {
    expect(allowedRarities('short', 1)).toEqual(['common']);
    expect(allowedRarities('short', 2)).toContain('rare');
  });
  it('epic short R>=5 / long R>=4', () => {
    expect(allowedRarities('short', 4)).not.toContain('epic');
    expect(allowedRarities('short', 5)).toContain('epic');
    expect(allowedRarities('long', 4)).toContain('epic');
  });
  it('legendary long-only R>=9; short never', () => {
    expect(allowedRarities('short', 12)).not.toContain('legendary');
    expect(allowedRarities('long', 8)).not.toContain('legendary');
    expect(allowedRarities('long', 9)).toContain('legendary');
  });
  it('mythic never gated into shops', () => {
    expect(allowedRarities('long', 19)).not.toContain('mythic');
  });
});

describe('newRun', () => {
  it('starts wired: starter tiles + powered starting weapon, full gold', () => {
    const r = newRun('short', 'striker');
    expect(r.gold).toBe(MODES.short.startGold);
    expect(r.lives).toBe(MODES.short.lives);
    expect(r.tiles.length).toBeGreaterThanOrEqual(2);
    expect(r.board.some((p) => p.key === 'st_breaker')).toBe(true); // startingWeapon
    expect(r.uniqueOffered).toBe(false);
  });
});

describe('shop', () => {
  it('rolls SHOP_SLOTS job-legal, non-unique, non-mythic items', () => {
    const slots = rollShop('long', 9, 'gunner', 7);
    expect(slots).toHaveLength(SHOP_SLOTS);
    for (const s of slots) {
      expect(s.item.job === null || s.item.job === 'gunner').toBe(true);
      expect(s.item.unique).not.toBe(true);
      expect(s.item.rarity).not.toBe('mythic');
    }
  });
  it('is deterministic for a seed', () => {
    const a = rollShop('short', 3, 'caster', 42).map((s) => s.item.key);
    const b = rollShop('short', 3, 'caster', 42).map((s) => s.item.key);
    expect(a).toEqual(b);
  });
});

describe('misc helpers', () => {
  it('sellValue is half cost, min 1', () => {
    expect(sellValue(itemById('dart')!)).toBeGreaterThanOrEqual(1);
    expect(sellValue(itemById('st_railgun')!)).toBe(Math.floor(itemById('st_railgun')!.cost / 2));
  });
  it('battleTime differs by mode', () => {
    expect(battleTime('short')).toBeLessThan(battleTime('long'));
  });
  it('unique offered only on round 5', () => {
    expect(shouldOfferUnique(5)).toBe(true);
    expect(shouldOfferUnique(4)).toBe(false);
    expect(shouldOfferUnique(6)).toBe(false);
  });
});

describe('opponent synthesis', () => {
  it('scales and always includes a weapon', () => {
    const early = genOpponentBoard('short', 1, 'striker', 1);
    const late = genOpponentBoard('long', 12, 'striker', 2);
    expect(early.board.some((q) => itemById(q.key)?.weapon)).toBe(true);
    expect(late.board.some((q) => itemById(q.key)?.weapon)).toBe(true);
    expect(late.board.length).toBeGreaterThanOrEqual(early.board.length);
    expect(early.tiles.length).toBeGreaterThanOrEqual(1);
  });
  it('never includes unique or mythic items', () => {
    const b = genOpponentBoard('long', 15, 'gunner', 3);
    for (const p of b.board) {
      const it = itemById(p.key)!;
      expect(it.unique).not.toBe(true);
      expect(it.rarity).not.toBe('mythic');
    }
  });
});

describe('adjacency-material fusion (merge)', () => {
  it('detects an adjacent base+material as a pending merge', () => {
    // st_breaker (1x2) at (1,0) occupies (1,0),(1,1); mat_barrel (1x1) at (2,0) is adjacent
    const items = [item('b', 'st_breaker', 1, 0), item('m', 'mat_barrel', 2, 0)];
    const merges = pendingMerges(items);
    expect(merges).toHaveLength(1);
    expect(merges[0].baseId).toBe('b');
    expect(merges[0].materialId).toBe('m');
    expect(merges[0].result).toBe('st_breaker_mk2');
  });

  it('non-adjacent base+material does not merge', () => {
    const items = [item('b', 'st_breaker', 0, 0), item('m', 'mat_barrel', 5, 4)];
    expect(pendingMerges(items)).toHaveLength(0);
  });

  it('applyMerges consumes the material and upgrades the base in place', () => {
    const items = [item('b', 'st_breaker', 1, 0), item('m', 'mat_barrel', 2, 0)];
    const { items: next, fused } = applyMerges(items);
    expect(fused).toEqual([{ result: 'st_breaker_mk2', baseId: 'b' }]);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('b'); // kept id + position
    expect(next[0].key).toBe('st_breaker_mk2');
    expect(next[0].x).toBe(1);
  });

  it('applyMerges reports baseId so the UI can flash the surviving cell', () => {
    const items = [item('b', 'st_breaker', 1, 0), item('m', 'mat_barrel', 2, 0)];
    const { items: next, fused } = applyMerges(items);
    expect(fused[0].baseId).toBe('b');
    // the flagged cell is exactly the survivor that kept its id
    expect(next.find((p) => p.id === fused[0].baseId)).toBeTruthy();
  });

  it('mergeCandidateIds highlights both base and material', () => {
    const items = [item('b', 'st_breaker', 1, 0), item('m', 'mat_barrel', 2, 0), item('x', 'dart', 5, 4)];
    const ids = mergeCandidateIds(items);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('m')).toBe(true);
    expect(ids.has('x')).toBe(false);
  });

  it('each base/material is used at most once', () => {
    // two breakers, one barrel: only one merge possible
    const items = [item('b1', 'st_breaker', 1, 0), item('b2', 'st_breaker', 3, 0), item('m', 'mat_barrel', 2, 0)];
    const merges = pendingMerges(items);
    expect(merges).toHaveLength(1);
  });

  it('applyMerges is a no-op without a valid adjacency', () => {
    const items = [item('b', 'st_breaker', 0, 0)];
    const r = applyMerges(items);
    expect(r.fused).toHaveLength(0);
    expect(r.items).toBe(items);
  });
});
