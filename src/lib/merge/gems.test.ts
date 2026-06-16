/* ============================================================================
 * GRID STELLA — gem system unit tests
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  GEM_KINDS,
  GEMS,
  MAX_TIER,
  gemBonus,
  gemLabel,
  serializeGems,
  parseGems,
  gemById,
  type Gem,
} from './gems';

/* ---------------------------------------------------------------- GEM_KINDS / GEMS */

describe('GEM_KINDS and GEMS', () => {
  it('GEM_KINDS has exactly 5 entries', () => {
    expect(GEM_KINDS).toHaveLength(5);
  });

  it('each GemKind has a corresponding GemDef in GEMS', () => {
    for (const kind of GEM_KINDS) {
      const def = GEMS[kind];
      expect(def).toBeDefined();
      expect(def.kind).toBe(kind);
      expect(typeof def.icon).toBe('string');
      expect(typeof def.name).toBe('string');
    }
  });

  it('all 5 kinds are present: ruby, sapphire, topaz, emerald, amethyst', () => {
    const set = new Set(GEM_KINDS);
    expect(set.has('ruby')).toBe(true);
    expect(set.has('sapphire')).toBe(true);
    expect(set.has('topaz')).toBe(true);
    expect(set.has('emerald')).toBe(true);
    expect(set.has('amethyst')).toBe(true);
  });
});

/* ---------------------------------------------------------------- gemBonus */

describe('gemBonus', () => {
  it('ruby returns only atkMul, scaled by tier', () => {
    const b1 = gemBonus({ id: 'x', kind: 'ruby', tier: 1 });
    const b2 = gemBonus({ id: 'x', kind: 'ruby', tier: 2 });
    const b3 = gemBonus({ id: 'x', kind: 'ruby', tier: 3 });
    expect(b1.atkMul).toBeCloseTo(1.04);
    expect(b2.atkMul).toBeCloseTo(1.08);
    expect(b3.atkMul).toBeCloseTo(1.12);
    // no other fields
    expect(b1.fireMul).toBeUndefined();
    expect(b1.rangeBonus).toBeUndefined();
    expect(b1.startGold).toBeUndefined();
    expect(b1.dustMul).toBeUndefined();
  });

  it('sapphire returns only fireMul < 1 (speed multiplier), scales with tier', () => {
    const b1 = gemBonus({ id: 'x', kind: 'sapphire', tier: 1 });
    const b2 = gemBonus({ id: 'x', kind: 'sapphire', tier: 2 });
    const b3 = gemBonus({ id: 'x', kind: 'sapphire', tier: 3 });
    expect(b1.fireMul).toBeCloseTo(0.97);
    expect(b2.fireMul).toBeCloseTo(0.94);
    expect(b3.fireMul).toBeCloseTo(0.91);
    // fireMul stays < 1 (faster fire rate)
    expect(b1.fireMul!).toBeLessThan(1);
    expect(b2.fireMul!).toBeLessThan(1);
    expect(b3.fireMul!).toBeLessThan(1);
    // no other fields
    expect(b1.atkMul).toBeUndefined();
    expect(b1.rangeBonus).toBeUndefined();
  });

  it('topaz returns only rangeBonus, scaled by tier', () => {
    const b1 = gemBonus({ id: 'x', kind: 'topaz', tier: 1 });
    const b2 = gemBonus({ id: 'x', kind: 'topaz', tier: 2 });
    const b3 = gemBonus({ id: 'x', kind: 'topaz', tier: 3 });
    expect(b1.rangeBonus).toBeCloseTo(0.15);
    expect(b2.rangeBonus).toBeCloseTo(0.30);
    expect(b3.rangeBonus).toBeCloseTo(0.45);
    expect(b1.atkMul).toBeUndefined();
    expect(b1.fireMul).toBeUndefined();
  });

  it('emerald returns only startGold, scaled by tier', () => {
    const b1 = gemBonus({ id: 'x', kind: 'emerald', tier: 1 });
    const b2 = gemBonus({ id: 'x', kind: 'emerald', tier: 2 });
    const b3 = gemBonus({ id: 'x', kind: 'emerald', tier: 3 });
    expect(b1.startGold).toBe(3);
    expect(b2.startGold).toBe(6);
    expect(b3.startGold).toBe(9);
    expect(b1.atkMul).toBeUndefined();
    expect(b1.rangeBonus).toBeUndefined();
  });

  it('amethyst returns only dustMul > 1, scaled by tier', () => {
    const b1 = gemBonus({ id: 'x', kind: 'amethyst', tier: 1 });
    const b2 = gemBonus({ id: 'x', kind: 'amethyst', tier: 2 });
    const b3 = gemBonus({ id: 'x', kind: 'amethyst', tier: 3 });
    expect(b1.dustMul).toBeCloseTo(1.05);
    expect(b2.dustMul).toBeCloseTo(1.10);
    expect(b3.dustMul).toBeCloseTo(1.15);
    // dustMul stays > 1 (more dust)
    expect(b1.dustMul!).toBeGreaterThan(1);
    expect(b2.dustMul!).toBeGreaterThan(1);
    expect(b3.dustMul!).toBeGreaterThan(1);
    expect(b1.atkMul).toBeUndefined();
    expect(b1.rangeBonus).toBeUndefined();
  });
});

/* ---------------------------------------------------------------- gemLabel */

describe('gemLabel', () => {
  it('produces a short label with name and tier star notation', () => {
    const gem: Gem = { id: 'a1', kind: 'ruby', tier: 2 };
    const label = gemLabel(gem);
    expect(label).toContain('ルビー');
    expect(label).toContain('2');
    expect(label).toContain('★');
  });

  it('includes the correct gem name per kind', () => {
    expect(gemLabel({ id: 'x', kind: 'sapphire', tier: 1 })).toContain('サファイア');
    expect(gemLabel({ id: 'x', kind: 'topaz', tier: 1 })).toContain('トパーズ');
    expect(gemLabel({ id: 'x', kind: 'emerald', tier: 1 })).toContain('エメラルド');
    expect(gemLabel({ id: 'x', kind: 'amethyst', tier: 1 })).toContain('アメジスト');
  });
});

/* ---------------------------------------------------------------- serialize / parse round-trip */

describe('serializeGems / parseGems', () => {
  it('round-trips an empty list', () => {
    expect(parseGems(serializeGems([]))).toEqual([]);
  });

  it('round-trips a list of gems', () => {
    const list: Gem[] = [
      { id: 'g1', kind: 'ruby', tier: 1 },
      { id: 'g2', kind: 'sapphire', tier: 3 },
      { id: 'g3', kind: 'emerald', tier: 2 },
    ];
    expect(parseGems(serializeGems(list))).toEqual(list);
  });

  it('parseGems(null) returns []', () => {
    expect(parseGems(null)).toEqual([]);
  });

  it('parseGems with invalid JSON returns []', () => {
    expect(parseGems('not-json')).toEqual([]);
    expect(parseGems('{}')).toEqual([]);
    expect(parseGems('')).toEqual([]);
  });

  it('drops items with invalid kind', () => {
    const raw = JSON.stringify([
      { id: 'g1', kind: 'ruby', tier: 1 },
      { id: 'g2', kind: 'diamond', tier: 2 }, // invalid
      { id: 'g3', kind: 'topaz', tier: 1 },
    ]);
    const result = parseGems(raw);
    expect(result).toHaveLength(2);
    expect(result.map((g) => g.kind)).toEqual(['ruby', 'topaz']);
  });

  it('clamps tier below 1 to 1', () => {
    const raw = JSON.stringify([{ id: 'g1', kind: 'ruby', tier: 0 }]);
    const result = parseGems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe(1);
  });

  it('clamps tier above MAX_TIER to MAX_TIER', () => {
    const raw = JSON.stringify([{ id: 'g1', kind: 'ruby', tier: 99 }]);
    const result = parseGems(raw);
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe(MAX_TIER);
  });

  it('drops items with missing or non-string id', () => {
    const raw = JSON.stringify([
      { id: '', kind: 'ruby', tier: 1 },   // empty id
      { kind: 'topaz', tier: 1 },           // missing id
      { id: 123, kind: 'topaz', tier: 1 }, // numeric id
    ]);
    expect(parseGems(raw)).toEqual([]);
  });

  it('never throws on arbitrary garbage input', () => {
    const cases = [
      'null',
      'undefined',
      '{"a":1}',
      '[null, undefined, 42, "str"]',
      '[{"id":null,"kind":null,"tier":null}]',
      JSON.stringify([{ id: 'x', kind: 'ruby', tier: NaN }]),
    ];
    for (const raw of cases) {
      expect(() => parseGems(raw)).not.toThrow();
    }
  });
});

/* ---------------------------------------------------------------- gemById */

describe('gemById', () => {
  const list: Gem[] = [
    { id: 'alpha', kind: 'ruby', tier: 1 },
    { id: 'beta', kind: 'topaz', tier: 2 },
    { id: 'gamma', kind: 'amethyst', tier: 3 },
  ];

  it('finds a gem by id', () => {
    const result = gemById(list, 'beta');
    expect(result).toBeDefined();
    expect(result!.kind).toBe('topaz');
  });

  it('returns undefined for a missing id', () => {
    expect(gemById(list, 'delta')).toBeUndefined();
  });

  it('returns undefined on an empty list', () => {
    expect(gemById([], 'alpha')).toBeUndefined();
  });
});
