import { describe, expect, it } from 'vitest';
import { SHOP_POOL } from './data';
import { canPlace, cellsOf, dims, inBounds, synergyCells } from './geometry';
import { calculateStats } from './stats';
import { simulateBattle } from './battle';
import type { Item, ItemKey, PlacedItem } from './types';

const byKey = (k: ItemKey): Item => {
  const it = SHOP_POOL.find((i) => i.key === k);
  if (!it) throw new Error(`missing item ${k}`);
  return it;
};

const place = (k: ItemKey, x: number, y: number, rot = 0): PlacedItem => ({
  id: `${k}_${x}_${y}`,
  item: byKey(k),
  x,
  y,
  rot,
});

describe('geometry', () => {
  it('dims swaps w/h for odd rotations', () => {
    const coat = byKey('coat'); // 2x1
    expect(dims(coat, 0)).toEqual({ w: 2, h: 1 });
    expect(dims(coat, 1)).toEqual({ w: 1, h: 2 });
    expect(dims(coat, 2)).toEqual({ w: 2, h: 1 });
    expect(dims(coat, 3)).toEqual({ w: 1, h: 2 });
  });

  it('cellsOf enumerates the full footprint', () => {
    const globe = place('globe', 1, 1); // 2x2
    expect(cellsOf(globe).sort()).toEqual(
      [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ].sort(),
    );
  });

  it('inBounds respects the 5x5 grid', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(4, 4)).toBe(true);
    expect(inBounds(5, 0)).toBe(false);
    expect(inBounds(-1, 2)).toBe(false);
  });

  it('canPlace rejects out-of-bounds and overlaps', () => {
    const placed = [place('globe', 0, 0)]; // occupies (0,0)-(1,1)
    expect(canPlace(byKey('needle'), 4, 4, 0, placed)).toBe(true);
    expect(canPlace(byKey('globe'), 4, 4, 0, placed)).toBe(false); // off board
    expect(canPlace(byKey('needle'), 1, 1, 0, placed)).toBe(false); // overlap
    expect(canPlace(byKey('needle'), 2, 0, 0, placed)).toBe(true); // adjacent ok
  });

  it('canPlace can ignore a moving item by id', () => {
    const moving = place('needle', 2, 2);
    expect(canPlace(moving.item, 2, 2, 0, [moving])).toBe(false);
    expect(canPlace(moving.item, 2, 2, 0, [moving], moving.id)).toBe(true);
  });

  it('compass projects onto its 4 neighbours, filtered to the board', () => {
    const center = synergyCells(place('compass', 2, 2));
    expect(center.sort()).toEqual(
      [
        [2, 1],
        [2, 3],
        [1, 2],
        [3, 2],
      ].sort(),
    );
    // corner compass loses off-board neighbours
    expect(synergyCells(place('compass', 0, 0)).sort()).toEqual(
      [
        [0, 1],
        [1, 0],
      ].sort(),
    );
  });

  it('plumb projects left/right only, and rotation turns it vertical', () => {
    expect(synergyCells(place('plumb', 2, 2, 0)).sort()).toEqual(
      [
        [1, 2],
        [3, 2],
      ].sort(),
    );
    // 90deg CW: left/right -> up/down
    expect(synergyCells(place('plumb', 2, 2, 1)).sort()).toEqual(
      [
        [2, 1],
        [2, 3],
      ].sort(),
    );
  });
});

describe('calculateStats — synergies', () => {
  it('plumb adds +2 ATK and compass multiplies CD by 0.8', () => {
    const board = [
      place('needle', 1, 0), // attack 4, cd 2.0
      place('compass', 1, 1), // neighbour (1,0) -> -20% cd
      place('plumb', 0, 0), // right (1,0) -> +2 atk
    ];
    const stats = calculateStats(board);
    const needle = stats.weapons.find((w) => w.key === 'needle')!;
    expect(needle.finalAttack).toBe(6);
    expect(needle.finalCooldown).toBeCloseTo(1.6, 5);
    expect(needle.buffed).toBe(true);
  });

  it('multiple compasses stack multiplicatively', () => {
    const board = [
      place('needle', 1, 0),
      place('compass', 2, 0), // left neighbour (1,0)
      place('compass', 1, 1), // up neighbour (1,0)
    ];
    const stats = calculateStats(board);
    const needle = stats.weapons.find((w) => w.key === 'needle')!;
    expect(needle.finalCooldown).toBeCloseTo(2.0 * 0.8 * 0.8, 5); // 1.28
  });

  it('an unbuffed weapon keeps base stats', () => {
    const stats = calculateStats([place('needle', 4, 4)]);
    const needle = stats.weapons[0];
    expect(needle.finalAttack).toBe(4);
    expect(needle.finalCooldown).toBeCloseTo(2.0, 5);
    expect(needle.buffed).toBe(false);
  });

  it('each coat contributes +4 shield per tick', () => {
    expect(calculateStats([place('coat', 0, 0)]).shieldPerTick).toBe(4);
    expect(
      calculateStats([place('coat', 0, 0), place('coat', 0, 2)]).shieldPerTick,
    ).toBe(8);
    expect(calculateStats([]).shieldPerTick).toBe(0);
  });
});

describe('simulateBattle', () => {
  it('produces a timeline and a decisive result', () => {
    const stats = calculateStats([place('globe', 1, 1)]); // strong weapon
    const sim = simulateBattle(stats, {
      nameJa: 't',
      nameEn: 'T',
      hp: 70,
      attack: 6,
      cooldown: 2.5,
      shield: 0,
    });
    expect(sim.history.length).toBeGreaterThan(0);
    expect(sim.logs.length).toBeGreaterThan(0);
    expect(sim.result).toBe('win');
  });

  it('a weaponless board loses', () => {
    const stats = calculateStats([place('coat', 0, 0)]); // no weapons
    const sim = simulateBattle(stats, {
      nameJa: 't',
      nameEn: 'T',
      hp: 70,
      attack: 6,
      cooldown: 2.5,
      shield: 0,
    });
    expect(sim.result).toBe('lose');
  });

  it('is deterministic', () => {
    const stats = calculateStats([place('needle', 0, 0)]);
    const enemy = { nameJa: 't', nameEn: 'T', hp: 70, attack: 6, cooldown: 2.5, shield: 0 };
    const a = simulateBattle(stats, enemy);
    const b = simulateBattle(stats, enemy);
    expect(a.result).toBe(b.result);
    expect(a.history.length).toBe(b.history.length);
    expect(a.logs).toEqual(b.logs);
  });
});
