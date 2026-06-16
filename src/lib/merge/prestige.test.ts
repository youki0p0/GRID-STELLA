/* ============================================================================
 * GRID STELLA — prestige.ts のユニットテスト
 *
 * Vitest + 相対インポート。副作用なし・純粋関数のみを検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_META,
  META_LIST,
  META_UPGRADES,
  type MetaState,
  type MetaUpgradeId,
  serializeMeta,
  parseMeta,
  upgradeCost,
  canBuy,
  buyUpgrade,
  dustReward,
  metaBonuses,
} from './prestige';

/* --------------------------------------------------------- parseMeta / DEFAULT */
describe('parseMeta', () => {
  it('null を渡すと DEFAULT_META と同値を返す', () => {
    const result = parseMeta(null);
    expect(result).toEqual(DEFAULT_META);
  });

  it('DEFAULT_META はすべて 0', () => {
    expect(DEFAULT_META.dust).toBe(0);
    expect(DEFAULT_META.levels.might).toBe(0);
    expect(DEFAULT_META.levels.fortune).toBe(0);
    expect(DEFAULT_META.levels.vitality).toBe(0);
    expect(DEFAULT_META.levels.haste).toBe(0);
  });

  it('serializeMeta → parseMeta のラウンドトリップ', () => {
    const state: MetaState = {
      dust: 42,
      levels: { might: 2, fortune: 1, vitality: 3, haste: 0 },
    };
    expect(parseMeta(serializeMeta(state))).toEqual(state);
  });

  it('DEFAULT_META 自体もラウンドトリップする', () => {
    expect(parseMeta(serializeMeta(DEFAULT_META))).toEqual(DEFAULT_META);
  });

  it('不正 JSON は DEFAULT_META にフォールバック', () => {
    expect(parseMeta('{ invalid json')).toEqual(DEFAULT_META);
  });

  it('dust フィールドが欠損した場合は 0 にフォールバック', () => {
    const raw = JSON.stringify({ levels: { might: 1, fortune: 0, vitality: 0, haste: 0 } });
    const result = parseMeta(raw);
    expect(result.dust).toBe(0);
  });

  it('levels フィールドが欠損した場合は 0 にフォールバック', () => {
    const raw = JSON.stringify({ dust: 5 });
    const result = parseMeta(raw);
    expect(result.levels).toEqual(DEFAULT_META.levels);
  });

  it('負の dust は 0 にクランプ', () => {
    const raw = JSON.stringify({
      dust: -99,
      levels: { might: 0, fortune: 0, vitality: 0, haste: 0 },
    });
    expect(parseMeta(raw).dust).toBe(0);
  });

  it('負の levels は 0 にクランプ', () => {
    const raw = JSON.stringify({
      dust: 0,
      levels: { might: -3, fortune: -1, vitality: 0, haste: 0 },
    });
    const result = parseMeta(raw);
    expect(result.levels.might).toBe(0);
    expect(result.levels.fortune).toBe(0);
  });

  it('不正な型の levels 値は 0 にフォールバック', () => {
    const raw = JSON.stringify({
      dust: 10,
      levels: { might: 'abc', fortune: null, vitality: 2, haste: undefined },
    });
    const result = parseMeta(raw);
    expect(result.levels.might).toBe(0);
    expect(result.levels.fortune).toBe(0);
    expect(result.levels.vitality).toBe(2);
    expect(result.levels.haste).toBe(0);
  });

  it('プリミティブ値の JSON（文字列など）は DEFAULT_META にフォールバック', () => {
    expect(parseMeta('"hello"')).toEqual(DEFAULT_META);
    expect(parseMeta('42')).toEqual(DEFAULT_META);
    expect(parseMeta('null')).toEqual(DEFAULT_META);
  });
});

/* ----------------------------------------------------- META_LIST / META_UPGRADES */
describe('META_LIST / META_UPGRADES', () => {
  it('META_LIST の長さは MetaUpgradeId の種類数（4）と一致する', () => {
    const ids: MetaUpgradeId[] = ['might', 'fortune', 'vitality', 'haste'];
    expect(META_LIST.length).toBe(ids.length);
  });

  it('META_LIST の各 id が META_UPGRADES に存在する', () => {
    for (const upgrade of META_LIST) {
      expect(META_UPGRADES[upgrade.id]).toBeDefined();
    }
  });

  it('全アップグレードが icon / name / desc / maxLevel を持つ', () => {
    for (const upgrade of META_LIST) {
      expect(upgrade.icon.length).toBeGreaterThan(0);
      expect(upgrade.name.length).toBeGreaterThan(0);
      expect(upgrade.desc.length).toBeGreaterThan(0);
      expect(upgrade.maxLevel).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------- upgradeCost */
describe('upgradeCost', () => {
  it('レベルが上がるほどコストが増加する', () => {
    const ids: MetaUpgradeId[] = ['might', 'fortune', 'vitality', 'haste'];
    for (const id of ids) {
      for (let lv = 0; lv < 9; lv++) {
        expect(upgradeCost(id, lv + 1)).toBeGreaterThan(upgradeCost(id, lv));
      }
    }
  });

  it('レベル 0 のコストは正の整数', () => {
    expect(upgradeCost('might', 0)).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------- canBuy */
describe('canBuy', () => {
  it('星屑が足りない場合は false', () => {
    const meta: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: 0, haste: 0 } };
    expect(canBuy(meta, 'might')).toBe(false);
  });

  it('星屑が足りる場合は true', () => {
    const cost = upgradeCost('might', 0);
    const meta: MetaState = { dust: cost, levels: { might: 0, fortune: 0, vitality: 0, haste: 0 } };
    expect(canBuy(meta, 'might')).toBe(true);
  });

  it('maxLevel に達している場合は false（星屑があっても）', () => {
    const maxLv = META_UPGRADES.might.maxLevel;
    const meta: MetaState = {
      dust: 9999,
      levels: { might: maxLv, fortune: 0, vitality: 0, haste: 0 },
    };
    expect(canBuy(meta, 'might')).toBe(false);
  });

  it('maxLevel - 1 では購入可能（星屑が十分あれば）', () => {
    const maxLv = META_UPGRADES.fortune.maxLevel;
    const cost = upgradeCost('fortune', maxLv - 1);
    const meta: MetaState = {
      dust: cost,
      levels: { might: 0, fortune: maxLv - 1, vitality: 0, haste: 0 },
    };
    expect(canBuy(meta, 'fortune')).toBe(true);
  });
});

/* ------------------------------------------------------- buyUpgrade */
describe('buyUpgrade', () => {
  it('購入可能な場合は dust が減り level が +1 になる', () => {
    const cost = upgradeCost('vitality', 0);
    const meta: MetaState = {
      dust: cost + 10,
      levels: { might: 0, fortune: 0, vitality: 0, haste: 0 },
    };
    const next = buyUpgrade(meta, 'vitality');
    expect(next.dust).toBe(meta.dust - cost);
    expect(next.levels.vitality).toBe(1);
  });

  it('他のレベルは変化しない', () => {
    const cost = upgradeCost('haste', 0);
    const meta: MetaState = {
      dust: cost,
      levels: { might: 3, fortune: 2, vitality: 1, haste: 0 },
    };
    const next = buyUpgrade(meta, 'haste');
    expect(next.levels.might).toBe(3);
    expect(next.levels.fortune).toBe(2);
    expect(next.levels.vitality).toBe(1);
    expect(next.levels.haste).toBe(1);
  });

  it('購入不可の場合は元のオブジェクトをそのまま返す', () => {
    const meta: MetaState = {
      dust: 0,
      levels: { might: 0, fortune: 0, vitality: 0, haste: 0 },
    };
    const result = buyUpgrade(meta, 'might');
    expect(result).toBe(meta); // 同一参照
  });

  it('入力オブジェクトをミューテーションしない', () => {
    const cost = upgradeCost('fortune', 0);
    const meta: MetaState = {
      dust: cost,
      levels: { might: 0, fortune: 0, vitality: 0, haste: 0 },
    };
    const originalDust = meta.dust;
    const originalLevel = meta.levels.fortune;
    buyUpgrade(meta, 'fortune');
    expect(meta.dust).toBe(originalDust);
    expect(meta.levels.fortune).toBe(originalLevel);
  });

  it('返り値は入力とは異なる新しいオブジェクト（購入成功時）', () => {
    const cost = upgradeCost('might', 0);
    const meta: MetaState = {
      dust: cost,
      levels: { might: 0, fortune: 0, vitality: 0, haste: 0 },
    };
    const next = buyUpgrade(meta, 'might');
    expect(next).not.toBe(meta);
    expect(next.levels).not.toBe(meta.levels);
  });

  it('maxLevel では購入できない', () => {
    const maxLv = META_UPGRADES.might.maxLevel;
    const meta: MetaState = {
      dust: 9999,
      levels: { might: maxLv, fortune: 0, vitality: 0, haste: 0 },
    };
    const result = buyUpgrade(meta, 'might');
    expect(result).toBe(meta);
    expect(result.levels.might).toBe(maxLv);
  });
});

/* ------------------------------------------------------- dustReward */
describe('dustReward', () => {
  it('スコア 0 → 0', () => {
    expect(dustReward(0)).toBe(0);
  });

  it('スコア 999 → 0（切り捨て）', () => {
    expect(dustReward(999)).toBe(0);
  });

  it('スコア 1000 → 1', () => {
    expect(dustReward(1000)).toBe(1);
  });

  it('スコア 5500 → 5（切り捨て）', () => {
    expect(dustReward(5500)).toBe(5);
  });

  it('負のスコアは 0 以上を返す', () => {
    expect(dustReward(-1000)).toBeGreaterThanOrEqual(0);
  });

  it('常に整数を返す', () => {
    const values = [0, 1, 999, 1000, 1234, 50000];
    for (const v of values) {
      expect(Number.isInteger(dustReward(v))).toBe(true);
    }
  });
});

/* ------------------------------------------------------- metaBonuses */
describe('metaBonuses', () => {
  it('全レベル 0 のときデフォルトボーナス', () => {
    const bonuses = metaBonuses(DEFAULT_META);
    expect(bonuses.atkMul).toBeCloseTo(1.0);
    expect(bonuses.fireMul).toBeCloseTo(1.0);
    expect(bonuses.startGold).toBe(0);
    expect(bonuses.maxHpBonus).toBe(0);
  });

  it('might 1 → atkMul が 1.08', () => {
    const meta: MetaState = { dust: 0, levels: { might: 1, fortune: 0, vitality: 0, haste: 0 } };
    expect(metaBonuses(meta).atkMul).toBeCloseTo(1.08);
  });

  it('might レベルが上がるほど atkMul が増加する', () => {
    for (let lv = 0; lv < 5; lv++) {
      const a: MetaState = { dust: 0, levels: { might: lv, fortune: 0, vitality: 0, haste: 0 } };
      const b: MetaState = { dust: 0, levels: { might: lv + 1, fortune: 0, vitality: 0, haste: 0 } };
      expect(metaBonuses(b).atkMul).toBeGreaterThan(metaBonuses(a).atkMul);
    }
  });

  it('fortune 1 → startGold が 3', () => {
    const meta: MetaState = { dust: 0, levels: { might: 0, fortune: 1, vitality: 0, haste: 0 } };
    expect(metaBonuses(meta).startGold).toBe(3);
  });

  it('fortune レベルが上がるほど startGold が増加する', () => {
    for (let lv = 0; lv < 5; lv++) {
      const a: MetaState = { dust: 0, levels: { might: 0, fortune: lv, vitality: 0, haste: 0 } };
      const b: MetaState = { dust: 0, levels: { might: 0, fortune: lv + 1, vitality: 0, haste: 0 } };
      expect(metaBonuses(b).startGold).toBeGreaterThan(metaBonuses(a).startGold);
    }
  });

  it('vitality 1 → maxHpBonus が 10', () => {
    const meta: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: 1, haste: 0 } };
    expect(metaBonuses(meta).maxHpBonus).toBe(10);
  });

  it('vitality レベルが上がるほど maxHpBonus が増加する', () => {
    for (let lv = 0; lv < 5; lv++) {
      const a: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: lv, haste: 0 } };
      const b: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: lv + 1, haste: 0 } };
      expect(metaBonuses(b).maxHpBonus).toBeGreaterThan(metaBonuses(a).maxHpBonus);
    }
  });

  it('haste レベルが上がるほど fireMul が小さくなる（射撃が速くなる）', () => {
    for (let lv = 0; lv < 5; lv++) {
      const a: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: 0, haste: lv } };
      const b: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: 0, haste: lv + 1 } };
      expect(metaBonuses(b).fireMul).toBeLessThan(metaBonuses(a).fireMul);
    }
  });

  it('haste fireMul は 0.5 より下がらない（下限クランプ）', () => {
    const meta: MetaState = {
      dust: 0,
      levels: { might: 0, fortune: 0, vitality: 0, haste: 9999 },
    };
    expect(metaBonuses(meta).fireMul).toBeGreaterThanOrEqual(0.5);
  });

  it('haste 1 → fireMul ≈ 0.96', () => {
    const meta: MetaState = { dust: 0, levels: { might: 0, fortune: 0, vitality: 0, haste: 1 } };
    expect(metaBonuses(meta).fireMul).toBeCloseTo(0.96);
  });
});
