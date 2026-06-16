/* ============================================================================
 * GRID STELLA — skills.ts のテスト
 *
 * 必殺ゲージと必殺技定義の純粋ロジックを検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  GAUGE_MAX,
  gaugeGain,
  addGauge,
  isReady,
  ULTIMATES,
  ULT_LIST,
  NOVA_DAMAGE,
  FREEZE_MS,
  MEND_HP,
} from './skills';

/* ---------------------------------------------------------------- gaugeGain */

describe('gaugeGain', () => {
  it('ダメージ0のときゲージ増加は0', () => {
    expect(gaugeGain(0)).toBe(0);
  });

  it('負のダメージでも0以上を返す', () => {
    expect(gaugeGain(-100)).toBeGreaterThanOrEqual(0);
  });

  it('通常ダメージ（10）でゲージが増加する', () => {
    const gain = gaugeGain(10);
    expect(gain).toBeGreaterThan(0);
  });

  it('ゲージ増加量は1発あたり上限8を超えない', () => {
    // 非常に大きいダメージでも上限を守る
    expect(gaugeGain(1000)).toBeLessThanOrEqual(8);
    expect(gaugeGain(500)).toBeLessThanOrEqual(8);
    expect(gaugeGain(100)).toBeLessThanOrEqual(8);
  });

  it('ダメージ20（= 0.4×20=8）でちょうど上限に達する', () => {
    expect(gaugeGain(20)).toBe(8);
  });

  it('ダメージ5（= 0.4×5=2）で正しく計算される', () => {
    expect(gaugeGain(5)).toBeCloseTo(2, 5);
  });

  it('常に非負の値を返す', () => {
    for (const d of [-50, -1, 0, 1, 5, 10, 50, 200]) {
      expect(gaugeGain(d)).toBeGreaterThanOrEqual(0);
    }
  });
});

/* ---------------------------------------------------------------- addGauge */

describe('addGauge', () => {
  it('ゲージが0から正しく増加する', () => {
    const result = addGauge(0, 10);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(GAUGE_MAX);
  });

  it('非常に大きいダメージでも GAUGE_MAX を超えない', () => {
    expect(addGauge(0, 99999)).toBeLessThanOrEqual(GAUGE_MAX);
    expect(addGauge(99, 99999)).toBeLessThanOrEqual(GAUGE_MAX);
  });

  it('現在値が GAUGE_MAX のときダメージを与えても超えない', () => {
    expect(addGauge(GAUGE_MAX, 100)).toBe(GAUGE_MAX);
  });

  it('結果は常に 0 以上 GAUGE_MAX 以下', () => {
    const cases = [
      [0, 0],
      [0, 5],
      [50, 20],
      [95, 100],
      [100, 1000],
      [-10, 10], // current が負でも丸める
    ];
    for (const [cur, dmg] of cases) {
      const result = addGauge(cur, dmg);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(GAUGE_MAX);
    }
  });

  it('ゲージが積み重なる（連続ヒット）', () => {
    let gauge = 0;
    for (let i = 0; i < 20; i++) {
      gauge = addGauge(gauge, 15);
    }
    expect(gauge).toBe(GAUGE_MAX);
  });

  it('gaugeGain(damage) 分だけ current に加算される（上限前）', () => {
    const cur = 10;
    const dmg = 5; // gain = 2
    const expected = Math.min(GAUGE_MAX, Math.max(0, cur + gaugeGain(dmg)));
    expect(addGauge(cur, dmg)).toBeCloseTo(expected, 5);
  });
});

/* ---------------------------------------------------------------- isReady */

describe('isReady', () => {
  it('GAUGE_MAX のとき true', () => {
    expect(isReady(GAUGE_MAX)).toBe(true);
  });

  it('GAUGE_MAX を超えても true', () => {
    expect(isReady(GAUGE_MAX + 10)).toBe(true);
  });

  it('GAUGE_MAX - 1 のとき false', () => {
    expect(isReady(GAUGE_MAX - 1)).toBe(false);
  });

  it('0 のとき false', () => {
    expect(isReady(0)).toBe(false);
  });

  it('負の値のとき false', () => {
    expect(isReady(-1)).toBe(false);
  });

  it('ちょうど 50 のとき false（満タンではない）', () => {
    expect(isReady(50)).toBe(false);
  });
});

/* ---------------------------------------------------------------- ULTIMATES / ULT_LIST */

describe('ULTIMATES', () => {
  it('nova・freeze・mend の3つが存在する', () => {
    expect(ULTIMATES.nova).toBeDefined();
    expect(ULTIMATES.freeze).toBeDefined();
    expect(ULTIMATES.mend).toBeDefined();
  });

  it('各 UltDef の id がキーと一致する', () => {
    for (const key of ['nova', 'freeze', 'mend'] as const) {
      expect(ULTIMATES[key].id).toBe(key);
    }
  });

  it('各 UltDef に icon・name・desc が存在する（空文字列でない）', () => {
    for (const def of Object.values(ULTIMATES)) {
      expect(def.icon.length).toBeGreaterThan(0);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.desc.length).toBeGreaterThan(0);
    }
  });
});

describe('ULT_LIST', () => {
  it('3つの必殺技を含む', () => {
    expect(ULT_LIST).toHaveLength(3);
  });

  it('全 id が ULTIMATES に存在する', () => {
    for (const def of ULT_LIST) {
      expect(ULTIMATES[def.id]).toBeDefined();
    }
  });

  it('id がすべて異なる', () => {
    const ids = ULT_LIST.map((d) => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('nova・freeze・mend をすべて含む', () => {
    const ids = new Set(ULT_LIST.map((d) => d.id));
    expect(ids.has('nova')).toBe(true);
    expect(ids.has('freeze')).toBe(true);
    expect(ids.has('mend')).toBe(true);
  });
});

/* ---------------------------------------------------------------- チューニング定数 */

describe('tuning constants', () => {
  it('GAUGE_MAX は正の数', () => {
    expect(GAUGE_MAX).toBeGreaterThan(0);
  });

  it('NOVA_DAMAGE は正の数', () => {
    expect(NOVA_DAMAGE).toBeGreaterThan(0);
  });

  it('FREEZE_MS は正の数（ミリ秒）', () => {
    expect(FREEZE_MS).toBeGreaterThan(0);
  });

  it('MEND_HP は正の数', () => {
    expect(MEND_HP).toBeGreaterThan(0);
  });
});
