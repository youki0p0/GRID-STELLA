/* ============================================================================
 * GRID STELLA — relics.ts のユニットテスト
 *
 * `npx vitest run src/lib/merge/relics.test.ts` で実行可能。
 * vitest.config.ts にパスエイリアスがないため相対インポートを使用する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  RELICS,
  RELIC_LIST,
  relicEffect,
  pickRelics,
} from './relics';
import type { RelicId } from './relics';

/* ---------------------------------------------------------------- RELICS / RELIC_LIST */
describe('RELICS と RELIC_LIST', () => {
  it('RELIC_LIST の長さは 8', () => {
    expect(RELIC_LIST).toHaveLength(8);
  });

  it('RELICS のキー数は 8', () => {
    expect(Object.keys(RELICS)).toHaveLength(8);
  });

  it('RELIC_LIST の長さは RELICS のキー数と一致する', () => {
    expect(RELIC_LIST.length).toBe(Object.keys(RELICS).length);
  });

  it('すべての遺物が空でない icon を持つ', () => {
    for (const relic of RELIC_LIST) {
      expect(relic.icon.trim().length, `${relic.id} の icon が空`).toBeGreaterThan(0);
    }
  });

  it('すべての遺物が空でない name を持つ', () => {
    for (const relic of RELIC_LIST) {
      expect(relic.name.trim().length, `${relic.id} の name が空`).toBeGreaterThan(0);
    }
  });

  it('すべての遺物が空でない desc を持つ', () => {
    for (const relic of RELIC_LIST) {
      expect(relic.desc.trim().length, `${relic.id} の desc が空`).toBeGreaterThan(0);
    }
  });

  it('RELIC_LIST の各要素の id が RELICS のキーと一致する', () => {
    for (const relic of RELIC_LIST) {
      expect(RELICS[relic.id]).toBeDefined();
      expect(RELICS[relic.id].id).toBe(relic.id);
    }
  });
});

/* ---------------------------------------------------------------- relicEffect */
describe('relicEffect', () => {
  const allIds: RelicId[] = Object.keys(RELICS) as RelicId[];

  it('すべての RelicId に対して定義済みオブジェクトを返す', () => {
    for (const id of allIds) {
      expect(relicEffect(id), `${id} の効果が undefined`).toBeDefined();
    }
  });

  it('fireMul が存在する場合は (0, 1] の範囲内', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.fireMul !== undefined) {
        expect(effect.fireMul, `${id}.fireMul が 0 以下`).toBeGreaterThan(0);
        expect(effect.fireMul, `${id}.fireMul が 1 を超える`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('atkMul が存在する場合は > 0', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.atkMul !== undefined) {
        expect(effect.atkMul, `${id}.atkMul が 0 以下`).toBeGreaterThan(0);
      }
    }
  });

  it('gaugeMul が存在する場合は > 0', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.gaugeMul !== undefined) {
        expect(effect.gaugeMul, `${id}.gaugeMul が 0 以下`).toBeGreaterThan(0);
      }
    }
  });

  it('sellBonus が存在する場合は > 0', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.sellBonus !== undefined) {
        expect(effect.sellBonus, `${id}.sellBonus が 0 以下`).toBeGreaterThan(0);
      }
    }
  });

  it('rangeBonus が存在する場合は >= 0', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.rangeBonus !== undefined) {
        expect(effect.rangeBonus, `${id}.rangeBonus が負`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('maxHpBonus が存在する場合は >= 0', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.maxHpBonus !== undefined) {
        expect(effect.maxHpBonus, `${id}.maxHpBonus が負`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('startGold が存在する場合は >= 0', () => {
    for (const id of allIds) {
      const effect = relicEffect(id);
      if (effect.startGold !== undefined) {
        expect(effect.startGold, `${id}.startGold が負`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('lens: atkMul = 1.2', () => {
    expect(relicEffect('lens')).toEqual({ atkMul: 1.2 });
  });

  it('astrolabe: fireMul = 0.85', () => {
    expect(relicEffect('astrolabe')).toEqual({ fireMul: 0.85 });
  });

  it('sextant: fireMul = 0.85', () => {
    expect(relicEffect('sextant')).toEqual({ fireMul: 0.85 });
  });

  it('meridian: rangeBonus = 0.6', () => {
    expect(relicEffect('meridian')).toEqual({ rangeBonus: 0.6 });
  });

  it('orrery: gaugeMul = 1.25', () => {
    expect(relicEffect('orrery')).toEqual({ gaugeMul: 1.25 });
  });

  it('aegis: maxHpBonus = 20', () => {
    expect(relicEffect('aegis')).toEqual({ maxHpBonus: 20 });
  });

  it('comet: atkMul = 1.3', () => {
    expect(relicEffect('comet')).toEqual({ atkMul: 1.3 });
  });

  it('ledger: startGold = 6, sellBonus = 1.5', () => {
    expect(relicEffect('ledger')).toEqual({ startGold: 6, sellBonus: 1.5 });
  });
});

/* ---------------------------------------------------------------- pickRelics */
describe('pickRelics', () => {
  it('pickRelics(0) は空配列を返す', () => {
    expect(pickRelics(0)).toEqual([]);
  });

  it('pickRelics(3) は 3 要素を返す', () => {
    expect(pickRelics(3)).toHaveLength(3);
  });

  it('pickRelics(3) の結果は重複しない id を持つ', () => {
    const result = pickRelics(3);
    const ids = result.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(3);
  });

  it('pickRelics(999) は RELIC_LIST.length にクランプされる', () => {
    expect(pickRelics(999)).toHaveLength(RELIC_LIST.length);
  });

  it('pickRelics(999) の結果は重複しない', () => {
    const result = pickRelics(999);
    const ids = result.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(RELIC_LIST.length);
  });

  it('決定的 rng を使うと結果が再現できる', () => {
    let seed = 42;
    const seededRng = () => {
      // xorshift32 の簡易版
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0xffffffff;
    };
    const r1 = pickRelics(3, seededRng).map((r) => r.id);

    seed = 42;
    const seededRng2 = () => {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0xffffffff;
    };
    const r2 = pickRelics(3, seededRng2).map((r) => r.id);

    expect(r1).toEqual(r2);
  });

  it('pickRelics(RELIC_LIST.length) は全遺物を返す（順不同）', () => {
    const result = pickRelics(RELIC_LIST.length);
    expect(result).toHaveLength(RELIC_LIST.length);
    const resultIds = new Set(result.map((r) => r.id));
    for (const relic of RELIC_LIST) {
      expect(resultIds.has(relic.id)).toBe(true);
    }
  });

  it('負の n は空配列を返す', () => {
    expect(pickRelics(-1)).toEqual([]);
  });
});
