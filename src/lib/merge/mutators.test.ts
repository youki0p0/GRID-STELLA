/* ============================================================================
 * GRID STELLA — mutators.ts のユニットテスト
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import {
  MUTATOR_LIST,
  MUTATORS,
  mutatorForWave,
} from './mutators';

/* ---------------------------------------------------------------- 定数テスト */
describe('MUTATORS / MUTATOR_LIST', () => {
  it('MUTATOR_LIST の長さが MUTATORS のキー数と一致する', () => {
    expect(MUTATOR_LIST.length).toBe(Object.keys(MUTATORS).length);
  });

  it('すべての乗数が 0 より大きい', () => {
    for (const m of MUTATOR_LIST) {
      expect(m.hpMul).toBeGreaterThan(0);
      expect(m.speedMul).toBeGreaterThan(0);
      expect(m.rewardMul).toBeGreaterThan(0);
    }
  });

  it("'calm' はすべての乗数が 1（完全中立）", () => {
    const calm = MUTATORS.calm;
    expect(calm.hpMul).toBe(1);
    expect(calm.speedMul).toBe(1);
    expect(calm.rewardMul).toBe(1);
  });

  it("'bounty' の rewardMul がリスト中で最大", () => {
    const maxReward = Math.max(...MUTATOR_LIST.map((m) => m.rewardMul));
    expect(MUTATORS.bounty.rewardMul).toBe(maxReward);
  });
});

/* ---------------------------------------------------------------- mutatorForWave */
describe('mutatorForWave', () => {
  it('wave <= 2 は常に calm を返す', () => {
    const rng = () => 0.9; // calm 以外が選ばれそうな値でも calm になることを確認
    expect(mutatorForWave(1, rng).id).toBe('calm');
    expect(mutatorForWave(2, rng).id).toBe('calm');
  });

  it('wave 0 も calm を返す', () => {
    expect(mutatorForWave(0).id).toBe('calm');
  });

  it('wave >= 3 で calm 以外を返す', () => {
    // rng が 0.6 → ボスバイアス（<0.5）は発動しない
    const rng = () => 0.6;
    const result = mutatorForWave(3, rng);
    expect(result.id).not.toBe('calm');
  });

  it('同じ rng シードで決定的に同じ結果を返す', () => {
    const makeSeq = (values: number[]) => {
      let i = 0;
      return () => values[i++ % values.length];
    };
    const seq1 = makeSeq([0.7, 0.3]);
    const seq2 = makeSeq([0.7, 0.3]);
    expect(mutatorForWave(5, seq1).id).toBe(mutatorForWave(5, seq2).id);
  });

  it('ボスウェーブ（wave % 5 === 0）で rng < 0.5 なら heavy を返す', () => {
    const rng = () => 0.1; // 0.1 < 0.5 → heavy
    expect(mutatorForWave(5, rng).id).toBe('heavy');
    expect(mutatorForWave(10, rng).id).toBe('heavy');
  });

  it('ボスウェーブで rng >= 0.5 なら heavy 以外の non-calm も返しうる', () => {
    // rng が常に 0.8 → ボスバイアス発動しない、インデックス選択へ
    const rng = () => 0.8;
    const result = mutatorForWave(5, rng);
    expect(result.id).not.toBe('calm');
  });

  it('wave >= 3 の非ボスウェーブで返ってくる mutator は MUTATOR_LIST に含まれる', () => {
    const ids = MUTATOR_LIST.map((m) => m.id);
    const rng = () => 0.5;
    for (const wave of [3, 4, 6, 7, 8]) {
      expect(ids).toContain(mutatorForWave(wave, rng).id);
    }
  });
});
