import { describe, expect, it } from 'vitest';
import {
  CORE,
  TILE_DEFS,
  canPlaceItem,
  canPlaceTile,
  firstFitItem,
  firstFitTile,
  itemCells,
  poweredItemIds,
  poweredTileIds,
  tileBonuses,
  tileCells,
} from './grid';
import { GRID_W, GRID_H, itemById } from './data';
import type { PlacedItem, PlacedTile } from './types';

const item = (key: string, x: number, y: number, rot: 0 | 1 = 0): PlacedItem => ({ id: `${key}@${x},${y}`, key, x, y, rot, level: 1 });
const tile = (id: string, kind: PlacedTile['kind'], x: number, y: number, rot: 0 | 1 = 0): PlacedTile => ({ id, kind, x, y, rot });

describe('tile catalog', () => {
  it('matches the spec sizes', () => {
    expect(TILE_DEFS.plain.w).toBe(2); expect(TILE_DEFS.plain.h).toBe(2);
    expect(TILE_DEFS.shield.w).toBe(2); expect(TILE_DEFS.shield.h).toBe(2);
    expect(TILE_DEFS.clock.w).toBe(1); expect(TILE_DEFS.clock.h).toBe(2);
    expect(TILE_DEFS.battery.w).toBe(1); expect(TILE_DEFS.battery.h).toBe(3);
    expect(TILE_DEFS.power.w).toBe(1); expect(TILE_DEFS.power.h).toBe(3);
  });
});

describe('geometry', () => {
  it('itemCells respects rotation', () => {
    const auto = item('autocannon', 2, 1, 0); // 1x2
    expect(itemCells(auto)).toHaveLength(2);
    const rotated = item('autocannon', 2, 1, 1); // 2x1
    const ys = new Set(itemCells(rotated).map((c) => c.y));
    expect(ys.size).toBe(1);
  });
  it('tileCells covers the footprint', () => {
    expect(tileCells(tile('a', 'battery', 1, 0, 0))).toHaveLength(3); // 1x3
    expect(tileCells(tile('a', 'plain', 0, 0, 0))).toHaveLength(4); // 2x2
  });
});

describe('placement', () => {
  it('items may sit anywhere in-bounds without overlap (core is fine)', () => {
    expect(canPlaceItem([], itemById('dart')!, CORE.x, CORE.y, 0)).toBe(true);
    expect(canPlaceItem([], itemById('dart')!, GRID_W, 0, 0)).toBe(false); // off-board
    const occupied = [item('dart', 1, 1)];
    expect(canPlaceItem(occupied, itemById('dart')!, 1, 1, 0)).toBe(false); // overlap
  });
  it('tiles cannot overlap each other', () => {
    const tiles = [tile('a', 'plain', 0, 0)];
    expect(canPlaceTile(tiles, 'plain', 0, 0, 0)).toBe(false);
    expect(canPlaceTile(tiles, 'plain', 2, 0, 0)).toBe(true);
  });
  it('firstFit finds a slot', () => {
    expect(firstFitItem([], itemById('dart')!)).not.toBeNull();
    expect(firstFitTile([], 'plain')).not.toBeNull();
  });
});

describe('tile power connectivity', () => {
  it('powers tiles chained from the core', () => {
    const adj = tile('adj', 'plain', CORE.x, Math.max(0, CORE.y - 1)); // covers core column
    const tiles = [adj];
    const ids = poweredTileIds(tiles);
    expect(ids.has('adj')).toBe(true);
  });
  it('an island tile is unpowered', () => {
    const adj = tile('adj', 'plain', 0, 0); // touches core (0,2) via (0,1)
    const island = tile('island', 'clock', 5, 4); // far corner
    const ids = poweredTileIds([adj, island]);
    expect(ids.has('adj')).toBe(true);
    expect(ids.has('island')).toBe(false);
  });
  it('empty tile layer powers nothing', () => {
    expect(poweredTileIds([]).size).toBe(0);
    expect(poweredItemIds([], []).size).toBe(0);
  });
});

describe('powered items + tile bonuses', () => {
  // plain tile (0,0) 2x2 covers cells (0..1, 0..1) — touches core at (0,2)? core is (0,2),
  // and cell (0,1) is orthogonally adjacent to core, so this tile is powered.
  const plain = tile('p', 'plain', 0, 0, 0);

  it('item is powered if any cell overlaps a powered tile', () => {
    const on = item('dart', 0, 0); // sits on plain tile
    const off = item('dart', 5, 4); // off the tile
    const ids = poweredItemIds([plain], [on, off]);
    expect(ids.has(on.id)).toBe(true);
    expect(ids.has(off.id)).toBe(false);
  });

  it('battery adds maxEnergy, shield adds startShield (only when powered)', () => {
    // battery chained off the plain tile at (2,0) 1x3 — touches plain at (1,0)
    const battery = tile('b', 'battery', 2, 0, 0);
    const shield = tile('s', 'shield', 0, 2, 0); // covers core cell → powered
    const b = tileBonuses([plain, battery, shield], []);
    expect(b.maxEnergy).toBe(1); // one powered battery
    expect(b.startShield).toBeGreaterThanOrEqual(18); // shield tile
  });

  it('clock/power tiles tag overlapping items', () => {
    const clock = tile('c', 'clock', 0, 0, 0); // covers (0,0),(0,1) touches core
    const onClock = item('autocannon', 0, 0, 0);
    const b = tileBonuses([clock], [onClock]);
    expect(b.hasteItemIds.has(onClock.id)).toBe(true);
    expect(b.critItemIds.has(onClock.id)).toBe(false);
  });

  it('unpowered battery contributes nothing', () => {
    const island = tile('i', 'battery', 5, 0, 0); // disconnected
    const b = tileBonuses([island], []);
    expect(b.maxEnergy).toBe(0);
  });
});
