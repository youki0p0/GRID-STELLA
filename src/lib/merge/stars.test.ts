/* ============================================================================
 * GRID STELLA — stars.ts のユニットテスト
 * Vitest: 副作用なし、純粋関数のみ検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  MAX_STAR,
  starMul,
  starUpCost,
  canStarUp,
  totalStarCost,
} from './stars';

/* ---------------------------------------------------------------- starMul */
describe('starMul', () => {
  it('star 0 → 1.0', () => {
    expect(starMul(0)).toBe(1.0);
  });

  it('star 5 (MAX_STAR) → 1.75', () => {
    expect(starMul(5)).toBe(1.75);
  });

  it('各レベルで単調増加する', () => {
    for (let s = 0; s < MAX_STAR; s++) {
      expect(starMul(s + 1)).toBeGreaterThan(starMul(s));
    }
  });

  it('負の値は 0 にクランプされ 1.0 を返す', () => {
    expect(starMul(-3)).toBe(1.0);
  });

  it('MAX_STAR 超過値は MAX_STAR にクランプされ 1.75 を返す', () => {
    expect(starMul(10)).toBe(1.75);
    expect(starMul(MAX_STAR + 1)).toBe(1.75);
  });

  it('中間値（star 2）が正しい', () => {
    // 1 + 0.15 * 2 = 1.30
    expect(starMul(2)).toBeCloseTo(1.3);
  });
});

/* ---------------------------------------------------------------- starUpCost */
describe('starUpCost', () => {
  it('star 0 のコストは 4', () => {
    expect(starUpCost(0)).toBe(4);
  });

  it('star 1 のコストは 9', () => {
    expect(starUpCost(1)).toBe(9);
  });

  it('star 2 のコストは 14', () => {
    expect(starUpCost(2)).toBe(14);
  });

  it('star 3 のコストは 19', () => {
    expect(starUpCost(3)).toBe(19);
  });

  it('star 4 のコストは 24', () => {
    expect(starUpCost(4)).toBe(24);
  });

  it('各ステップでコストが増加する', () => {
    for (let s = 0; s < MAX_STAR - 1; s++) {
      expect(starUpCost(s + 1)).toBeGreaterThan(starUpCost(s));
    }
  });

  it('star === MAX_STAR で Infinity を返す', () => {
    expect(starUpCost(MAX_STAR)).toBe(Infinity);
  });

  it('star > MAX_STAR でも Infinity を返す', () => {
    expect(starUpCost(MAX_STAR + 2)).toBe(Infinity);
  });
});

/* ---------------------------------------------------------------- canStarUp */
describe('canStarUp', () => {
  it('MAX_STAR 未満かつダスト十分 → true', () => {
    expect(canStarUp(0, 4)).toBe(true);
    expect(canStarUp(0, 100)).toBe(true);
    expect(canStarUp(4, 24)).toBe(true);
  });

  it('MAX_STAR に達している → false（ダストが十分でも）', () => {
    expect(canStarUp(MAX_STAR, 9999)).toBe(false);
  });

  it('ダスト不足 → false', () => {
    expect(canStarUp(0, 3)).toBe(false);
    expect(canStarUp(1, 8)).toBe(false);
  });

  it('ダストがちょうどコストと等しい → true', () => {
    expect(canStarUp(2, 14)).toBe(true);
  });

  it('ダストが 1 不足 → false', () => {
    expect(canStarUp(2, 13)).toBe(false);
  });
});

/* ---------------------------------------------------------------- totalStarCost */
describe('totalStarCost', () => {
  it('0 → 2 のコストは 4 + 9 = 13', () => {
    expect(totalStarCost(0, 2)).toBe(13);
  });

  it('0 → 5 のコストは 4+9+14+19+24 = 70', () => {
    expect(totalStarCost(0, MAX_STAR)).toBe(70);
  });

  it('toStar <= fromStar のとき 0 を返す', () => {
    expect(totalStarCost(3, 3)).toBe(0);
    expect(totalStarCost(4, 2)).toBe(0);
  });

  it('1 → 3 のコストは 9 + 14 = 23', () => {
    expect(totalStarCost(1, 3)).toBe(23);
  });

  it('fromStar が負の場合 0 にクランプされる', () => {
    // -2 → 2 は 0 → 2 と同じ: 4 + 9 = 13
    expect(totalStarCost(-2, 2)).toBe(13);
  });

  it('toStar が MAX_STAR を超える場合 MAX_STAR にクランプされる', () => {
    // 3 → 10 は 3 → 5 と同じ: 19 + 24 = 43
    expect(totalStarCost(3, 10)).toBe(43);
  });

  it('fromStar と toStar の両方がクランプされる', () => {
    // -1 → 99 は 0 → 5 と同じ: 70
    expect(totalStarCost(-1, 99)).toBe(70);
  });
});
