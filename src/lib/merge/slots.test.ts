/* ============================================================================
 * GRID STELLA — slots.ts のユニットテスト
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  SLOT_LIST,
  SLOTS,
  socketsForRarity,
  combineBonuses,
  gearBonus,
  regaliaBonuses,
  gearById,
  serializeRegalia,
  parseRegalia,
  DEFAULT_REGALIA,
  STARTER_GEAR,
  type Gear,
  type Regalia,
  type SlotId,
} from './slots';
import { NEUTRAL_BONUS } from './equip';

/* ---------------------------------------------------------------- スタブ */

/** スター倍率は常に 1.0（星レベルによるスケーリングなし）。 */
const identityStarMul = (_star: number) => 1;

/** ジェムボーナスは常に空（ジェムなし）。 */
const noGemBonus = (_gemId: string) => ({});

/* ---------------------------------------------------------------- SLOT_LIST */

describe('SLOT_LIST', () => {
  it('長さが 9 であること（core + 8 部位）', () => {
    expect(SLOT_LIST).toHaveLength(9);
  });

  it('最初の要素が core であること', () => {
    expect(SLOT_LIST[0].id).toBe('core');
  });

  it('全スロットが一意の id を持つこと', () => {
    const ids = SLOT_LIST.map((s) => s.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('SLOTS マップと整合していること', () => {
    for (const def of SLOT_LIST) {
      expect(SLOTS[def.id]).toBe(def);
    }
  });
});

/* ---------------------------------------------------------------- socketsForRarity */

describe('socketsForRarity', () => {
  it('common → 0', () => {
    expect(socketsForRarity('common')).toBe(0);
  });

  it('rare → 1', () => {
    expect(socketsForRarity('rare')).toBe(1);
  });

  it('astral → 2', () => {
    expect(socketsForRarity('astral')).toBe(2);
  });
});

/* ---------------------------------------------------------------- combineBonuses */

describe('combineBonuses', () => {
  it('乗算フィールドを掛け合わせること', () => {
    const a = { ...NEUTRAL_BONUS, atkMul: 1.2, dustMul: 1.1, sellBonus: 1.05 };
    const b = { atkMul: 1.1, dustMul: 1.2 };
    const result = combineBonuses(a, b);
    expect(result.atkMul).toBeCloseTo(1.2 * 1.1);
    expect(result.dustMul).toBeCloseTo(1.1 * 1.2);
    expect(result.sellBonus).toBeCloseTo(1.05); // b に未定義 → identity
  });

  it('加算フィールドを合算すること', () => {
    const a = { ...NEUTRAL_BONUS, rangeBonus: 0.3, startGold: 5, maxHpBonus: 10 };
    const b = { rangeBonus: 0.2, startGold: 3, maxHpBonus: 4 };
    const result = combineBonuses(a, b);
    expect(result.rangeBonus).toBeCloseTo(0.5);
    expect(result.startGold).toBeCloseTo(8);
    expect(result.maxHpBonus).toBeCloseTo(14);
  });

  it('fireMul を掛け合わせること', () => {
    const a = { ...NEUTRAL_BONUS, fireMul: 0.9 };
    const b = { fireMul: 0.9 };
    const result = combineBonuses(a, b);
    expect(result.fireMul).toBeCloseTo(0.81);
  });

  it('fireMul を 0.4 でクランプすること', () => {
    const a = { ...NEUTRAL_BONUS, fireMul: 0.5 };
    const b = { fireMul: 0.5 }; // 0.5 * 0.5 = 0.25 → クランプ → 0.4
    const result = combineBonuses(a, b);
    expect(result.fireMul).toBe(0.4);
  });

  it('b に定義がない乗算フィールドは identity として扱うこと', () => {
    const a = { ...NEUTRAL_BONUS, atkMul: 1.5 };
    const result = combineBonuses(a, {}); // b は空
    expect(result.atkMul).toBeCloseTo(1.5);
  });

  it('b に定義がない加算フィールドは 0 として扱うこと', () => {
    const a = { ...NEUTRAL_BONUS, startGold: 7 };
    const result = combineBonuses(a, {});
    expect(result.startGold).toBeCloseTo(7);
  });
});

/* ---------------------------------------------------------------- gearBonus */

describe('gearBonus', () => {
  it('starMul=1 のとき gear.bonus をそのまま反映すること', () => {
    const gear: Gear = {
      id: 'test-gear',
      slot: 'core',
      name: 'テスト',
      icon: '⭐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: { atkMul: 1.1, rangeBonus: 0.2 },
    };
    const result = gearBonus(gear, 1, noGemBonus);
    expect(result.atkMul).toBeCloseTo(1.1);
    expect(result.rangeBonus).toBeCloseTo(0.2);
  });

  it('starMul=2 のとき乗算フィールドが拡大すること', () => {
    const gear: Gear = {
      id: 'test-gear-2',
      slot: 'compass',
      name: 'テスト2',
      icon: '🧭',
      rarity: 'common',
      star: 2,
      sockets: [],
      bonus: { atkMul: 1.1 }, // 1 + (1.1 - 1) * 2 = 1.2
    };
    const result = gearBonus(gear, 2, noGemBonus);
    expect(result.atkMul).toBeCloseTo(1.2);
  });

  it('starMul=2 のとき加算フィールドが 2 倍になること', () => {
    const gear: Gear = {
      id: 'test-gear-3',
      slot: 'sextant',
      name: 'テスト3',
      icon: '📐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: { rangeBonus: 0.5, startGold: 3 },
    };
    const result = gearBonus(gear, 2, noGemBonus);
    expect(result.rangeBonus).toBeCloseTo(1.0);
    expect(result.startGold).toBeCloseTo(6);
  });

  it('ジェムボーナスを追加適用すること', () => {
    const gear: Gear = {
      id: 'test-gear-4',
      slot: 'lens',
      name: 'テスト4',
      icon: '🔍',
      rarity: 'rare',
      star: 1,
      sockets: ['gem-atk'],
      bonus: { atkMul: 1.05 },
    };
    const gemBonus = (id: string) => id === 'gem-atk' ? { atkMul: 1.1 } : {};
    const result = gearBonus(gear, 1, gemBonus);
    // NEUTRAL * 1.05 * 1.1 = 1.155
    expect(result.atkMul).toBeCloseTo(1.155);
  });

  it('null ソケットはスキップすること', () => {
    const gear: Gear = {
      id: 'test-gear-5',
      slot: 'lens',
      name: 'テスト5',
      icon: '🔍',
      rarity: 'rare',
      star: 1,
      sockets: [null],
      bonus: {},
    };
    let called = false;
    const gemBonus = (_id: string) => { called = true; return {}; };
    gearBonus(gear, 1, gemBonus);
    expect(called).toBe(false);
  });

  it('ボーナスが空のギアは NEUTRAL_BONUS を返すこと', () => {
    const gear: Gear = {
      id: 'test-gear-empty',
      slot: 'cloak',
      name: '空ギア',
      icon: '🧥',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: {},
    };
    const result = gearBonus(gear, 1, noGemBonus);
    expect(result).toEqual(NEUTRAL_BONUS);
  });
});

/* ---------------------------------------------------------------- regaliaBonuses */

describe('regaliaBonuses', () => {
  it('何も装備されていない場合は NEUTRAL_BONUS を返すこと', () => {
    const reg: Regalia = { owned: STARTER_GEAR, equipped: {} };
    const result = regaliaBonuses(reg, identityStarMul, noGemBonus);
    expect(result).toEqual(NEUTRAL_BONUS);
  });

  it('装備したギアのボーナスを集計すること', () => {
    const gear: Gear = {
      id: 'eq-gear',
      slot: 'core',
      name: '装備ギア',
      icon: '⭐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: { atkMul: 1.2, startGold: 5 },
    };
    const reg: Regalia = {
      owned: [gear],
      equipped: { core: 'eq-gear' },
    };
    const result = regaliaBonuses(reg, identityStarMul, noGemBonus);
    expect(result.atkMul).toBeCloseTo(1.2);
    expect(result.startGold).toBeCloseTo(5);
  });

  it('複数ギアのボーナスを乗算・加算で集計すること', () => {
    const gear1: Gear = {
      id: 'multi-1',
      slot: 'core',
      name: 'ギア1',
      icon: '⭐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: { atkMul: 1.1, rangeBonus: 0.2 },
    };
    const gear2: Gear = {
      id: 'multi-2',
      slot: 'compass',
      name: 'ギア2',
      icon: '🧭',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: { atkMul: 1.2, rangeBonus: 0.3 },
    };
    const reg: Regalia = {
      owned: [gear1, gear2],
      equipped: { core: 'multi-1', compass: 'multi-2' },
    };
    const result = regaliaBonuses(reg, identityStarMul, noGemBonus);
    expect(result.atkMul).toBeCloseTo(1.1 * 1.2);
    expect(result.rangeBonus).toBeCloseTo(0.5);
  });

  it('dangling 参照（owned にない id）を無視すること', () => {
    const gear: Gear = {
      id: 'owned-only',
      slot: 'core',
      name: 'テスト',
      icon: '⭐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: { atkMul: 1.5 },
    };
    const reg: Regalia = {
      owned: [gear],
      // 'missing-id' は owned に存在しない。
      equipped: { core: 'owned-only', compass: 'missing-id' as string },
    };
    const result = regaliaBonuses(reg, identityStarMul, noGemBonus);
    expect(result.atkMul).toBeCloseTo(1.5); // 'owned-only' のみ適用。
  });
});

/* ---------------------------------------------------------------- gearById */

describe('gearById', () => {
  it('一致する id の Gear を返すこと', () => {
    const gear = STARTER_GEAR[0];
    const reg: Regalia = { owned: STARTER_GEAR, equipped: {} };
    expect(gearById(reg, gear.id)).toBe(gear);
  });

  it('存在しない id に対して undefined を返すこと', () => {
    const reg: Regalia = { owned: STARTER_GEAR, equipped: {} };
    expect(gearById(reg, 'nonexistent-id')).toBeUndefined();
  });

  it('owned が空の場合は undefined を返すこと', () => {
    const reg: Regalia = { owned: [], equipped: {} };
    expect(gearById(reg, 'any')).toBeUndefined();
  });
});

/* ---------------------------------------------------------------- シリアライズ / ラウンドトリップ */

describe('serializeRegalia / parseRegalia', () => {
  it('ラウンドトリップが正確に復元すること（STARTER_GEAR + equipped）', () => {
    const gear = STARTER_GEAR[2]; // rare, sockets: [null]
    const reg: Regalia = {
      owned: [...STARTER_GEAR],
      equipped: { lens: gear.id },
    };
    const json = serializeRegalia(reg);
    const restored = parseRegalia(json);
    expect(restored.owned).toHaveLength(reg.owned.length);
    expect(restored.equipped['lens']).toBe(gear.id);
  });

  it('DEFAULT_REGALIA のラウンドトリップ', () => {
    const json = serializeRegalia(DEFAULT_REGALIA);
    const restored = parseRegalia(json);
    expect(restored.owned).toHaveLength(DEFAULT_REGALIA.owned.length);
    expect(Object.keys(restored.equipped)).toHaveLength(0);
  });

  it('parseRegalia(null) は DEFAULT_REGALIA 相当を返すこと', () => {
    const result = parseRegalia(null);
    expect(result.owned).toHaveLength(DEFAULT_REGALIA.owned.length);
    expect(result.equipped).toEqual({});
  });

  it('不正な JSON は DEFAULT_REGALIA 相当を返すこと', () => {
    const result = parseRegalia('{not valid json!}');
    expect(result.owned).toHaveLength(DEFAULT_REGALIA.owned.length);
  });

  it('ゴミ文字列でもクラッシュしないこと', () => {
    expect(() => parseRegalia('garbage')).not.toThrow();
    expect(() => parseRegalia('null')).not.toThrow();
    expect(() => parseRegalia('')).not.toThrow();
    expect(() => parseRegalia('[]')).not.toThrow();
    expect(() => parseRegalia('42')).not.toThrow();
  });

  it('不正なギアを除外すること（無効な rarity）', () => {
    const invalid = JSON.stringify({
      owned: [
        {
          id: 'bad-gear',
          slot: 'core',
          name: 'テスト',
          icon: '⭐',
          rarity: 'legendary', // 無効
          star: 1,
          sockets: [],
          bonus: {},
        },
      ],
      equipped: {},
    });
    const result = parseRegalia(invalid);
    expect(result.owned).toHaveLength(0);
  });

  it('不正なギアを除外すること（ソケット数ミスマッチ）', () => {
    const invalid = JSON.stringify({
      owned: [
        {
          id: 'bad-socket',
          slot: 'core',
          name: 'テスト',
          icon: '⭐',
          rarity: 'common', // common → 0 ソケットのはずが 1 個
          star: 1,
          sockets: [null],
          bonus: {},
        },
      ],
      equipped: {},
    });
    const result = parseRegalia(invalid);
    expect(result.owned).toHaveLength(0);
  });

  it('不正なギアを除外すること（star が 0 以下）', () => {
    const invalid = JSON.stringify({
      owned: [
        {
          id: 'bad-star',
          slot: 'core',
          name: 'テスト',
          icon: '⭐',
          rarity: 'common',
          star: 0, // 無効
          sockets: [],
          bonus: {},
        },
      ],
      equipped: {},
    });
    const result = parseRegalia(invalid);
    expect(result.owned).toHaveLength(0);
  });

  it('dangling equipped 参照を除外すること', () => {
    const valid: Gear = {
      id: 'valid-gear',
      slot: 'core',
      name: 'テスト',
      icon: '⭐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: {},
    };
    const raw = JSON.stringify({
      owned: [valid],
      equipped: {
        core: 'valid-gear',
        compass: 'does-not-exist', // dangling
      },
    });
    const result = parseRegalia(raw);
    expect(result.equipped['core']).toBe('valid-gear');
    expect(result.equipped['compass']).toBeUndefined();
  });

  it('equipped の無効な SlotId を除外すること', () => {
    const valid: Gear = {
      id: 'vg2',
      slot: 'core',
      name: 'テスト',
      icon: '⭐',
      rarity: 'common',
      star: 1,
      sockets: [],
      bonus: {},
    };
    const raw = JSON.stringify({
      owned: [valid],
      equipped: {
        'invalid-slot': 'vg2',
      },
    });
    const result = parseRegalia(raw);
    const keys = Object.keys(result.equipped) as SlotId[];
    expect(keys).toHaveLength(0);
  });
});
