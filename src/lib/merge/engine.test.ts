import { describe, expect, it } from 'vitest';
import {
  GRID,
  MAX_LV,
  PATH,
  TYPES,
  TYPE_LIST,
  DRAW_WEIGHTS,
  buildWave,
  canMerge,
  drawType,
  enemyCell,
  keyOf,
  pctX,
  pctY,
  pick3,
  sellValue,
  unitAtk,
  waveSpec,
} from './engine';

describe('path', () => {
  it('covers every cell of the grid exactly once', () => {
    expect(PATH).toHaveLength(GRID * GRID);
    const seen = new Set(PATH.map((p) => keyOf(p.r, p.c)));
    expect(seen.size).toBe(GRID * GRID);
  });

  it('boustrophedon: starts top-left, ends bottom row', () => {
    expect(PATH[0]).toEqual({ r: 0, c: 0 });
    expect(PATH[PATH.length - 1].r).toBe(GRID - 1);
  });
});

describe('percent helpers', () => {
  it('maps cell centers into 0..100 range', () => {
    expect(pctX(0)).toBeCloseTo(10);
    expect(pctX(GRID - 1)).toBeCloseTo(90);
    expect(pctY(2)).toBeCloseTo(50);
  });
});

describe('enemyCell', () => {
  it('sits above the board before entry', () => {
    expect(enemyCell(-1).r).toBeLessThan(0);
  });

  it('matches path nodes at integer positions', () => {
    expect(enemyCell(0)).toEqual({ r: PATH[0].r, c: PATH[0].c });
    const lastIdx = PATH.length - 1;
    expect(enemyCell(lastIdx)).toEqual({ r: PATH[lastIdx].r, c: PATH[lastIdx].c });
  });

  it('interpolates between two nodes', () => {
    const mid = enemyCell(0.5);
    const a = PATH[0];
    const b = PATH[1];
    expect(mid.c).toBeCloseTo((a.c + b.c) / 2);
    expect(mid.r).toBeCloseTo((a.r + b.r) / 2);
  });

  it('clamps beyond the final node', () => {
    const last = PATH[PATH.length - 1];
    expect(enemyCell(PATH.length + 5)).toEqual({ r: last.r, c: last.c });
  });
});

describe('unitAtk', () => {
  it('returns the base attack at level 1', () => {
    expect(unitAtk('needle', 1)).toBe(TYPES.needle.atk);
  });

  it('scales up with level', () => {
    expect(unitAtk('needle', 2)).toBe(Math.round(7 * 1.9));
    expect(unitAtk('telescope', 3)).toBeGreaterThan(unitAtk('telescope', 2));
  });
});

describe('sellValue', () => {
  it('scales with level and is always at least 1', () => {
    expect(sellValue(0)).toBe(1);
    expect(sellValue(3)).toBe(6);
    expect(sellValue(5)).toBeGreaterThan(sellValue(2));
  });
});

describe('canMerge', () => {
  it('merges same type and level below the cap', () => {
    expect(canMerge({ type: 'needle', level: 1 }, { type: 'needle', level: 1 })).toBe(true);
  });

  it('rejects different type or level', () => {
    expect(canMerge({ type: 'needle', level: 1 }, { type: 'compass', level: 1 })).toBe(false);
    expect(canMerge({ type: 'needle', level: 1 }, { type: 'needle', level: 2 })).toBe(false);
  });

  it('rejects merging at the level cap', () => {
    expect(canMerge({ type: 'needle', level: MAX_LV }, { type: 'needle', level: MAX_LV })).toBe(false);
  });
});

describe('waveSpec', () => {
  it('flags a boss every fifth wave', () => {
    expect(waveSpec(5).boss).toBe(true);
    expect(waveSpec(10).boss).toBe(true);
    expect(waveSpec(4).boss).toBe(false);
  });

  it('escalates count, hp and power', () => {
    expect(waveSpec(2).count).toBeGreaterThan(waveSpec(1).count);
    expect(waveSpec(10).hp).toBeGreaterThan(waveSpec(1).hp);
    expect(waveSpec(20).power).toBeGreaterThanOrEqual(waveSpec(1).power);
  });
});

describe('buildWave', () => {
  it('matches the wave count, plus a boss on boss waves', () => {
    expect(buildWave(1)).toHaveLength(waveSpec(1).count);
    expect(buildWave(5)).toHaveLength(waveSpec(5).count + 1);
    expect(buildWave(5).at(-1)?.kind).toBe('boss');
  });

  it('introduces swift enemies from wave 3', () => {
    expect(buildWave(1).some((e) => e.kind === 'swift')).toBe(false);
    expect(buildWave(6).some((e) => e.kind === 'swift')).toBe(true);
  });

  it('keeps every enemy hp positive', () => {
    for (const e of buildWave(7)) expect(e.hp).toBeGreaterThan(0);
  });
});

describe('drawType', () => {
  it('always returns a valid type', () => {
    for (let i = 0; i < 50; i++) expect(TYPES[drawType()]).toBeDefined();
  });

  it('returns the first weight bucket for a near-zero roll', () => {
    expect(drawType(() => 0)).toBe(DRAW_WEIGHTS[0].id);
  });

  it('returns a late bucket for a near-one roll', () => {
    expect(drawType(() => 0.999999)).toBe(DRAW_WEIGHTS[DRAW_WEIGHTS.length - 1].id);
  });
});

describe('pick3', () => {
  it('returns three distinct cards', () => {
    const cards = pick3();
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.id)).size).toBe(3);
  });
});

describe('catalog', () => {
  it('exposes six instrument types with positive stats', () => {
    expect(TYPE_LIST).toHaveLength(6);
    for (const t of TYPE_LIST) {
      expect(t.atk).toBeGreaterThan(0);
      expect(t.range).toBeGreaterThan(0);
      expect(t.fireMs).toBeGreaterThan(0);
    }
  });
});
