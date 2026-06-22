import { describe, expect, it } from 'vitest';
import { CORE, canPlace, poweredIds } from './grid';
import { MODES, allowedRarities, genOpponentBoard, newRun, rollShop, SHOP_SLOTS } from './run';
import { itemById } from './data';
import type { PlacedItem } from './types';

const p = (key: string, x: number, y: number, rot: 0 | 1 = 0): PlacedItem => ({ id: `${key}@${x},${y}`, key, x, y, rot, level: 1 });

describe('grid placement', () => {
  it('cannot place over the core or off-board', () => {
    expect(canPlace([], itemById('dart')!, CORE.x, CORE.y, 0)).toBe(false);
    expect(canPlace([], itemById('dart')!, 99, 0, 0)).toBe(false);
    expect(canPlace([], itemById('dart')!, 1, CORE.y, 0)).toBe(true);
  });
});

describe('power connectivity', () => {
  it('powers only modules chained back to the core', () => {
    const adj = p('dart', CORE.x + 1, CORE.y); // touches core → powered
    const chain = p('dart', CORE.x + 2, CORE.y); // touches adj → powered
    const island = p('dart', 4, 0); // disconnected → unpowered
    const ids = poweredIds([adj, chain, island]);
    expect(ids.has(adj.id)).toBe(true);
    expect(ids.has(chain.id)).toBe(true);
    expect(ids.has(island.id)).toBe(false);
  });
  it('an empty board powers nothing', () => {
    expect(poweredIds([]).size).toBe(0);
  });
});

describe('run config & shop', () => {
  it('matches the MVP short/long spec', () => {
    expect(MODES.short.winsToCrown).toBe(10);
    expect(MODES.short.lives).toBe(3);
    expect(MODES.long.winsToCrown).toBe(15);
    expect(MODES.long.lives).toBe(5);
    expect(newRun('short', 'striker').gold).toBe(MODES.short.startGold);
  });
  it('short never offers legendary; long gates it late', () => {
    expect(allowedRarities('short', 12)).not.toContain('legendary');
    expect(allowedRarities('long', 12)).toContain('legendary');
  });
  it('rolls SHOP_SLOTS job-legal items', () => {
    const slots = rollShop('short', 4, 'gunner', 7);
    expect(slots).toHaveLength(SHOP_SLOTS);
    for (const s of slots) expect(s.item.job === null || s.item.job === 'gunner').toBe(true);
  });
  it('opponent board scales and always has a weapon', () => {
    const early = genOpponentBoard('short', 1, 'striker', 1);
    const late = genOpponentBoard('long', 12, 'striker', 2);
    expect(early.board.some((q) => itemById(q.key)?.weapon)).toBe(true);
    expect(late.board.length).toBeGreaterThanOrEqual(early.board.length);
  });
});
