/* ============================================================================
 * GRID STELLA — score.ts のユニットテスト (Vitest)
 *
 * エンドレス倍率・スコア計算・ランク変換の純粋関数を検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  endlessHpMul,
  endlessPowerMul,
  runScore,
  starRank,
  rankLabel,
  RANK_THRESHOLDS,
} from './score';
import type { ScoreInput, Rank } from './score';

/* ---------------------------------------------------------------- endlessHpMul */

describe('endlessHpMul', () => {
  it('wave 1 は 1 を返す', () => {
    expect(endlessHpMul(1)).toBe(1);
  });

  it('wave 20 は 1 を返す', () => {
    expect(endlessHpMul(20)).toBe(1);
  });

  it('wave 0 は 1 を返す', () => {
    expect(endlessHpMul(0)).toBe(1);
  });

  it('wave 21 は 1 より大きい', () => {
    expect(endlessHpMul(21)).toBeGreaterThan(1);
  });

  it('wave 30 は wave 21 より大きい（単調増加）', () => {
    expect(endlessHpMul(30)).toBeGreaterThan(endlessHpMul(21));
  });

  it('wave 50 は wave 30 より大きい（単調増加）', () => {
    expect(endlessHpMul(50)).toBeGreaterThan(endlessHpMul(30));
  });

  it('wave 100 は 1 以上', () => {
    expect(endlessHpMul(100)).toBeGreaterThanOrEqual(1);
  });

  it('任意の wave で 1 未満にならない', () => {
    for (const w of [0, 1, 10, 19, 20, 21, 25, 40, 100]) {
      expect(endlessHpMul(w)).toBeGreaterThanOrEqual(1);
    }
  });

  it('wave 21 の値が期待通り (1 + 1*0.15 = 1.15)', () => {
    expect(endlessHpMul(21)).toBeCloseTo(1.15, 10);
  });

  it('wave 25 の値が期待通り (1 + 5*0.15 = 1.75)', () => {
    expect(endlessHpMul(25)).toBeCloseTo(1.75, 10);
  });
});

/* ---------------------------------------------------------------- endlessPowerMul */

describe('endlessPowerMul', () => {
  it('wave 1 は 1 を返す', () => {
    expect(endlessPowerMul(1)).toBe(1);
  });

  it('wave 20 は 1 を返す', () => {
    expect(endlessPowerMul(20)).toBe(1);
  });

  it('wave 0 は 1 を返す', () => {
    expect(endlessPowerMul(0)).toBe(1);
  });

  it('wave 21 は 1 より大きい', () => {
    expect(endlessPowerMul(21)).toBeGreaterThan(1);
  });

  it('wave 30 は wave 21 より大きい（単調増加）', () => {
    expect(endlessPowerMul(30)).toBeGreaterThan(endlessPowerMul(21));
  });

  it('wave 50 は wave 30 より大きい（単調増加）', () => {
    expect(endlessPowerMul(50)).toBeGreaterThan(endlessPowerMul(30));
  });

  it('wave 100 は 1 以上', () => {
    expect(endlessPowerMul(100)).toBeGreaterThanOrEqual(1);
  });

  it('任意の wave で 1 未満にならない', () => {
    for (const w of [0, 1, 10, 19, 20, 21, 25, 40, 100]) {
      expect(endlessPowerMul(w)).toBeGreaterThanOrEqual(1);
    }
  });

  it('wave 21 の値が期待通り (1 + 1*0.08 = 1.08)', () => {
    expect(endlessPowerMul(21)).toBeCloseTo(1.08, 10);
  });

  it('wave 25 の値が期待通り (1 + 5*0.08 = 1.40)', () => {
    expect(endlessPowerMul(25)).toBeCloseTo(1.4, 10);
  });

  it('endlessPowerMul は endlessHpMul より緩やか (wave 30)', () => {
    expect(endlessPowerMul(30)).toBeLessThan(endlessHpMul(30));
  });
});

/* ---------------------------------------------------------------- runScore */

describe('runScore', () => {
  const base: ScoreInput = { wave: 5, kills: 10, damage: 500, won: false };

  it('非負の整数を返す', () => {
    const s = runScore(base);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(s)).toBe(true);
  });

  it('最小入力 (全0・lost) で 0 以上の整数', () => {
    const s = runScore({ wave: 0, kills: 0, damage: 0, won: false });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(s)).toBe(true);
  });

  it('wave を増やすとスコアが単調増加', () => {
    const s1 = runScore({ ...base, wave: 5 });
    const s2 = runScore({ ...base, wave: 6 });
    expect(s2).toBeGreaterThan(s1);
  });

  it('wave を大幅に増やすとスコアが大幅増加', () => {
    const s1 = runScore({ ...base, wave: 1 });
    const s2 = runScore({ ...base, wave: 20 });
    expect(s2).toBeGreaterThan(s1);
  });

  it('kills を増やすとスコアが単調増加', () => {
    const s1 = runScore({ ...base, kills: 5 });
    const s2 = runScore({ ...base, kills: 6 });
    expect(s2).toBeGreaterThanOrEqual(s1);
  });

  it('kills を 0→50 に増やすとスコアが増加', () => {
    const s1 = runScore({ ...base, kills: 0 });
    const s2 = runScore({ ...base, kills: 50 });
    expect(s2).toBeGreaterThan(s1);
  });

  it('damage を増やすとスコアが単調非減少', () => {
    const s1 = runScore({ ...base, damage: 100 });
    const s2 = runScore({ ...base, damage: 110 });
    expect(s2).toBeGreaterThanOrEqual(s1);
  });

  it('damage を大幅に増やすとスコアが増加', () => {
    const s1 = runScore({ ...base, damage: 0 });
    const s2 = runScore({ ...base, damage: 10000 });
    expect(s2).toBeGreaterThan(s1);
  });

  it('won=true は won=false よりスコアが高い', () => {
    const lost = runScore({ ...base, won: false });
    const won = runScore({ ...base, won: true });
    expect(won).toBeGreaterThan(lost);
  });

  it('全パラメータ大きい方が全パラメータ小さい方よりスコアが高い', () => {
    const small = runScore({ wave: 1, kills: 1, damage: 10, won: false });
    const large = runScore({ wave: 20, kills: 50, damage: 5000, won: true });
    expect(large).toBeGreaterThan(small);
  });

  it('wave が重い（+1 kill より +1 wave の方がスコアに効く）', () => {
    const moreKills = runScore({ ...base, kills: base.kills + 1 });
    const moreWave = runScore({ ...base, wave: base.wave + 1 });
    expect(moreWave).toBeGreaterThan(moreKills);
  });
});

/* ---------------------------------------------------------------- starRank */

describe('starRank', () => {
  it('スコア 0 は D ランク', () => {
    expect(starRank(0)).toBe('D');
  });

  it('スコアが C 閾値未満は D ランク', () => {
    const cMin = RANK_THRESHOLDS.find((t) => t.rank === 'C')!.min;
    expect(starRank(cMin - 1)).toBe('D');
  });

  it('スコアが C 閾値ちょうどは C ランク', () => {
    const cMin = RANK_THRESHOLDS.find((t) => t.rank === 'C')!.min;
    expect(starRank(cMin)).toBe('C');
  });

  it('スコアが B 閾値ちょうどは B ランク', () => {
    const bMin = RANK_THRESHOLDS.find((t) => t.rank === 'B')!.min;
    expect(starRank(bMin)).toBe('B');
  });

  it('スコアが A 閾値ちょうどは A ランク', () => {
    const aMin = RANK_THRESHOLDS.find((t) => t.rank === 'A')!.min;
    expect(starRank(aMin)).toBe('A');
  });

  it('スコアが S 閾値ちょうどは S ランク', () => {
    const sMin = RANK_THRESHOLDS.find((t) => t.rank === 'S')!.min;
    expect(starRank(sMin)).toBe('S');
  });

  it('非常に高いスコアでも S ランク', () => {
    expect(starRank(9_999_999)).toBe('S');
  });

  it('starRank はスコアに対して単調非減少 (D→S の順)', () => {
    const rankOrder: Rank[] = ['D', 'C', 'B', 'A', 'S'];
    const scores = [0, 2999, 3000, 6999, 7000, 12999, 13000, 21999, 22000, 50000];
    let prevIdx = -1;
    for (const s of scores) {
      const r = starRank(s);
      const idx = rankOrder.indexOf(r);
      expect(idx).toBeGreaterThanOrEqual(prevIdx);
      prevIdx = idx;
    }
  });
});

/* ---------------------------------------------------------------- rankLabel */

describe('rankLabel', () => {
  const allRanks: Rank[] = ['D', 'C', 'B', 'A', 'S'];

  it.each(allRanks)('ランク %s のラベルは空でない文字列', (rank) => {
    const label = rankLabel(rank);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('S ランクのラベルは 天体調律者', () => {
    expect(rankLabel('S')).toBe('天体調律者');
  });

  it('各ランクのラベルは互いに異なる', () => {
    const labels = allRanks.map(rankLabel);
    const unique = new Set(labels);
    expect(unique.size).toBe(allRanks.length);
  });
});

/* ---------------------------------------------------------------- RANK_THRESHOLDS */

describe('RANK_THRESHOLDS', () => {
  it('昇順に並んでいる', () => {
    for (let i = 1; i < RANK_THRESHOLDS.length; i++) {
      expect(RANK_THRESHOLDS[i].min).toBeGreaterThan(RANK_THRESHOLDS[i - 1].min);
    }
  });

  it('最初のエントリの min は 0 (全スコアをカバー)', () => {
    expect(RANK_THRESHOLDS[0].min).toBe(0);
  });

  it('5 段階のランクが定義されている', () => {
    expect(RANK_THRESHOLDS.length).toBe(5);
  });
});
