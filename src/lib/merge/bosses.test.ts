/* ============================================================================
 * GRID STELLA — bosses.ts のユニットテスト
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  BOSS_MODS,
  BOSS_MOD_LIST,
  REGEN_FRAC_PER_SEC,
  HASTE_MUL,
  BULWARK_REDUCTION,
  bossModForWave,
  regenAmount,
  hasteSpeed,
  damageThrough,
} from './bosses';
import type { BossMod } from './bosses';

/* ---------------------------------------------------------------- 定数・定義 */
describe('BOSS_MOD_LIST', () => {
  it('BOSS_MODS のキー数（3）と一致する', () => {
    const keyCount = Object.keys(BOSS_MODS).length;
    expect(BOSS_MOD_LIST.length).toBe(3);
    expect(BOSS_MOD_LIST.length).toBe(keyCount);
  });

  it('各エントリに id / icon / name / desc が空でなく存在する', () => {
    for (const def of BOSS_MOD_LIST) {
      expect(def.id.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.desc.length).toBeGreaterThan(0);
    }
  });

  it('id が BossMod の valid な値である', () => {
    const valid: BossMod[] = ['regen', 'haste', 'bulwark'];
    for (const def of BOSS_MOD_LIST) {
      expect(valid).toContain(def.id);
    }
  });
});

/* ---------------------------------------------------------------- bossModForWave */
describe('bossModForWave', () => {
  const validMods: BossMod[] = ['regen', 'haste', 'bulwark'];

  it('固定 rng に対して決定的な結果を返す', () => {
    const fixedRng = () => 0.5;
    const r1 = bossModForWave(5, fixedRng);
    const r2 = bossModForWave(5, fixedRng);
    expect(r1).toBe(r2);
  });

  it('常に valid な BossMod を返す（rng=0.0）', () => {
    expect(validMods).toContain(bossModForWave(1, () => 0.0));
  });

  it('常に valid な BossMod を返す（rng=0.999）', () => {
    expect(validMods).toContain(bossModForWave(10, () => 0.999));
  });

  it('rng が異なれば異なる修飾子が返りうる', () => {
    // 3つすべてが網羅されるか確認（偶然一致する可能性を排除するため複数試行）
    const results = new Set<BossMod>();
    const thresholds = [0.0, 0.4, 0.8];
    for (const t of thresholds) {
      results.add(bossModForWave(5, () => t));
    }
    // 少なくとも 2 種類は出現するはず（3区間を等分）
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});

/* ---------------------------------------------------------------- regenAmount */
describe('regenAmount', () => {
  it('REGEN_FRAC_PER_SEC * maxHp * dt を返す', () => {
    const maxHp = 1000;
    const dt = 1;
    expect(regenAmount(maxHp, dt)).toBeCloseTo(REGEN_FRAC_PER_SEC * maxHp * dt);
  });

  it('maxHp に比例する', () => {
    const dt = 0.5;
    const r1 = regenAmount(100, dt);
    const r2 = regenAmount(200, dt);
    expect(r2).toBeCloseTo(r1 * 2);
  });

  it('dt に比例する', () => {
    const maxHp = 500;
    const r1 = regenAmount(maxHp, 1);
    const r2 = regenAmount(maxHp, 2);
    expect(r2).toBeCloseTo(r1 * 2);
  });

  it('結果は常に 0 以上', () => {
    expect(regenAmount(0, 1)).toBeGreaterThanOrEqual(0);
    expect(regenAmount(1000, 0)).toBeGreaterThanOrEqual(0);
    // 負の dt が渡された場合も 0 を下回らない
    expect(regenAmount(100, -1)).toBeGreaterThanOrEqual(0);
  });
});

/* ---------------------------------------------------------------- hasteSpeed */
describe('hasteSpeed', () => {
  it("'haste' のとき baseSpeed * HASTE_MUL を返す", () => {
    const base = 2.0;
    expect(hasteSpeed(base, 'haste')).toBeCloseTo(base * HASTE_MUL);
  });

  it("'regen' のときは baseSpeed をそのまま返す", () => {
    const base = 3.5;
    expect(hasteSpeed(base, 'regen')).toBe(base);
  });

  it("'bulwark' のときは baseSpeed をそのまま返す", () => {
    const base = 1.8;
    expect(hasteSpeed(base, 'bulwark')).toBe(base);
  });
});

/* ---------------------------------------------------------------- damageThrough */
describe('damageThrough', () => {
  it("'bulwark' のとき dmg を (1 - BULWARK_REDUCTION) 倍して丸める", () => {
    const dmg = 100;
    const expected = Math.round(dmg * (1 - BULWARK_REDUCTION));
    expect(damageThrough(dmg, 'bulwark')).toBe(expected);
  });

  it("'bulwark' でも dmg > 0 のとき結果は最低 1", () => {
    // BULWARK_REDUCTION が高くても 1 を下回らない
    expect(damageThrough(1, 'bulwark')).toBeGreaterThanOrEqual(1);
  });

  it("'bulwark' で dmg=0 のとき 0 を返す（正でないので min 1 を適用しない）", () => {
    expect(damageThrough(0, 'bulwark')).toBe(0);
  });

  it("'regen' のとき dmg をそのまま返す", () => {
    expect(damageThrough(80, 'regen')).toBe(80);
  });

  it("'haste' のとき dmg をそのまま返す", () => {
    expect(damageThrough(50, 'haste')).toBe(50);
  });

  it('大きなダメージでも正しく軽減する', () => {
    const dmg = 1000;
    const expected = Math.round(dmg * (1 - BULWARK_REDUCTION));
    expect(damageThrough(dmg, 'bulwark')).toBe(expected);
  });
});
