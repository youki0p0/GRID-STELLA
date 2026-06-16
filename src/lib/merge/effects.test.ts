/* ============================================================================
 * GRID STELLA — effects.ts のユニットテスト
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  EFFECTS,
  NO_STATUS,
  BURN_DPS,
  BURN_MS,
  SLOW_MUL,
  SLOW_MS,
  WEAKEN_MUL,
  WEAKEN_MS,
  applyEffect,
  isSlowed,
  speedMul,
  vulnMul,
  burnTick,
  effectForInstrument,
  activeEffects,
} from './effects';

/* ---------------------------------------------------------------- EFFECTS 定義 */
describe('EFFECTS', () => {
  it('3つの効果ID（burn / slow / weaken）をすべて持つ', () => {
    expect(Object.keys(EFFECTS).sort()).toEqual(['burn', 'slow', 'weaken'].sort());
  });

  it.each(['burn', 'slow', 'weaken'] as const)('%s の icon / name / desc が空でない', (id) => {
    const def = EFFECTS[id];
    expect(def.id).toBe(id);
    expect(def.icon.length).toBeGreaterThan(0);
    expect(def.name.length).toBeGreaterThan(0);
    expect(def.desc.length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- applyEffect */
describe('applyEffect', () => {
  const NOW = 10_000;

  it('burn を付与すると burnUntil が now + BURN_MS になる', () => {
    const s = applyEffect(NO_STATUS, 'burn', NOW);
    expect(s.burnUntil).toBe(NOW + BURN_MS);
    expect(s.slowUntil).toBe(0);
    expect(s.weakenUntil).toBe(0);
  });

  it('slow を付与すると slowUntil が now + SLOW_MS になる', () => {
    const s = applyEffect(NO_STATUS, 'slow', NOW);
    expect(s.slowUntil).toBe(NOW + SLOW_MS);
  });

  it('weaken を付与すると weakenUntil が now + WEAKEN_MS になる', () => {
    const s = applyEffect(NO_STATUS, 'weaken', NOW);
    expect(s.weakenUntil).toBe(NOW + WEAKEN_MS);
  });

  it('再適用すると期間が延長される（既存の残り > 新規なら短縮しない）', () => {
    // 先に付与してほぼ満了に近い状態を作り、再付与で延長されることを確認
    const s1 = applyEffect(NO_STATUS, 'burn', NOW);           // until = 12000
    const laterNow = NOW + 1800;                              // 残り 200ms の時点
    const s2 = applyEffect(s1, 'burn', laterNow);            // until = laterNow + BURN_MS = 13800
    expect(s2.burnUntil).toBe(laterNow + BURN_MS);
  });

  it('再適用しても既存の until が大きい場合は短縮しない', () => {
    const s1 = applyEffect(NO_STATUS, 'burn', NOW);           // until = 12000
    // 少しだけ進んだ時点で再付与（新規 until = 10001 + 2000 = 12001 だが元は 12000）
    const s2 = applyEffect(s1, 'burn', NOW + 1);             // until = max(12000, 12001) = 12001
    expect(s2.burnUntil).toBeGreaterThanOrEqual(s1.burnUntil);
  });

  it('元の Status は変更されない（イミュータブル）', () => {
    const s1 = { ...NO_STATUS };
    applyEffect(s1, 'burn', NOW);
    expect(s1.burnUntil).toBe(0);
  });
});

/* ---------------------------------------------------------------- isSlowed / speedMul */
describe('isSlowed / speedMul', () => {
  const NOW = 5_000;

  it('鈍足中は isSlowed が true、speedMul が SLOW_MUL を返す', () => {
    const s = applyEffect(NO_STATUS, 'slow', NOW);
    expect(isSlowed(s, NOW + 1)).toBe(true);
    expect(speedMul(s, NOW + 1)).toBe(SLOW_MUL);
  });

  it('鈍足が切れると isSlowed が false、speedMul が 1 を返す', () => {
    const s = applyEffect(NO_STATUS, 'slow', NOW);
    const afterExpiry = NOW + SLOW_MS + 1;
    expect(isSlowed(s, afterExpiry)).toBe(false);
    expect(speedMul(s, afterExpiry)).toBe(1);
  });

  it('効果なしの初期ステータスは isSlowed が false', () => {
    expect(isSlowed(NO_STATUS, NOW)).toBe(false);
    expect(speedMul(NO_STATUS, NOW)).toBe(1);
  });
});

/* ---------------------------------------------------------------- vulnMul */
describe('vulnMul', () => {
  const NOW = 8_000;

  it('脆弱中は WEAKEN_MUL を返す', () => {
    const s = applyEffect(NO_STATUS, 'weaken', NOW);
    expect(vulnMul(s, NOW + 100)).toBe(WEAKEN_MUL);
  });

  it('脆弱が切れると 1 を返す', () => {
    const s = applyEffect(NO_STATUS, 'weaken', NOW);
    expect(vulnMul(s, NOW + WEAKEN_MS + 1)).toBe(1);
  });

  it('効果なしは 1 を返す', () => {
    expect(vulnMul(NO_STATUS, NOW)).toBe(1);
  });
});

/* ---------------------------------------------------------------- burnTick */
describe('burnTick', () => {
  const NOW = 20_000;
  const DT_MS = 100; // 100ms フレーム

  it('燃焼中はダメージが正になる', () => {
    const s = applyEffect(NO_STATUS, 'burn', NOW);
    const dmg = burnTick(s, NOW + 50, DT_MS);
    expect(dmg).toBeGreaterThan(0);
  });

  it('燃焼中のダメージが BURN_DPS * dt/1000 に一致する', () => {
    const s = applyEffect(NO_STATUS, 'burn', NOW);
    const dmg = burnTick(s, NOW + 50, DT_MS);
    expect(dmg).toBeCloseTo(BURN_DPS * (DT_MS / 1000));
  });

  it('燃焼が切れた後は 0 を返す', () => {
    const s = applyEffect(NO_STATUS, 'burn', NOW);
    const dmg = burnTick(s, NOW + BURN_MS + 1, DT_MS);
    expect(dmg).toBe(0);
  });

  it('初期ステータスでは 0 を返す（負にならない）', () => {
    expect(burnTick(NO_STATUS, NOW, DT_MS)).toBe(0);
  });
});

/* ---------------------------------------------------------------- effectForInstrument */
describe('effectForInstrument', () => {
  it('hourglass → slow', () => {
    expect(effectForInstrument('hourglass')).toBe('slow');
  });

  it('armillary → weaken', () => {
    expect(effectForInstrument('armillary')).toBe('weaken');
  });

  it('globe → burn', () => {
    expect(effectForInstrument('globe')).toBe('burn');
  });

  it('needle → null', () => {
    expect(effectForInstrument('needle')).toBeNull();
  });

  it('compass → null', () => {
    expect(effectForInstrument('compass')).toBeNull();
  });

  it('telescope → null', () => {
    expect(effectForInstrument('telescope')).toBeNull();
  });

  it('不明な文字列 → null', () => {
    expect(effectForInstrument('unknown')).toBeNull();
  });
});

/* ---------------------------------------------------------------- activeEffects */
describe('activeEffects', () => {
  const NOW = 50_000;

  it('効果なしは空配列', () => {
    expect(activeEffects(NO_STATUS, NOW)).toEqual([]);
  });

  it('burn のみ有効なら [burn]', () => {
    const s = applyEffect(NO_STATUS, 'burn', NOW);
    expect(activeEffects(s, NOW + 100)).toEqual(['burn']);
  });

  it('slow のみ有効なら [slow]', () => {
    const s = applyEffect(NO_STATUS, 'slow', NOW);
    expect(activeEffects(s, NOW + 100)).toEqual(['slow']);
  });

  it('weaken のみ有効なら [weaken]', () => {
    const s = applyEffect(NO_STATUS, 'weaken', NOW);
    expect(activeEffects(s, NOW + 100)).toEqual(['weaken']);
  });

  it('全効果有効なら 3つすべて含む', () => {
    let s = applyEffect(NO_STATUS, 'burn', NOW);
    s = applyEffect(s, 'slow', NOW);
    s = applyEffect(s, 'weaken', NOW);
    const active = activeEffects(s, NOW + 100);
    expect(active).toContain('burn');
    expect(active).toContain('slow');
    expect(active).toContain('weaken');
    expect(active).toHaveLength(3);
  });

  it('burn が切れた後は含まれない', () => {
    let s = applyEffect(NO_STATUS, 'burn', NOW);
    s = applyEffect(s, 'slow', NOW);
    const afterBurn = NOW + BURN_MS + 1;
    const active = activeEffects(s, afterBurn);
    expect(active).not.toContain('burn');
    // slow は SLOW_MS=1500 < BURN_MS=2000 なので slow も切れているはず
    expect(active).toHaveLength(0);
  });

  it('burn が切れても slow がまだ有効な複合ケース', () => {
    // slow を burn より後に付与して burn が切れた後も slow が残るケースを作る
    let s = applyEffect(NO_STATUS, 'burn', NOW);
    s = applyEffect(s, 'slow', NOW + 1000); // slow は NOW + 1000 + 1500 = NOW + 2500 まで
    const checkAt = NOW + BURN_MS + 100;    // burn は切れている（NOW+2100）、slow はまだ有効
    const active = activeEffects(s, checkAt);
    expect(active).not.toContain('burn');
    expect(active).toContain('slow');
  });
});
