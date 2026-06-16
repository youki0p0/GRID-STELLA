/* ============================================================================
 * GRID STELLA — enemies.ts テストスイート（Vitest）
 *
 * composeWave / EXTRA_KIND の挙動を網羅的に検証する。
 * 決定的関数なので同一引数で二度呼び出した結果が一致することも確認。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  EXTRA_KIND,
  composeWave,
} from './enemies';
import { KIND, waveSpec } from './engine';
import type { ExtraKind, FullEnemySpec } from './enemies';

/* ---------------------------------------------------------------- EXTRA_KIND */

describe('EXTRA_KIND', () => {
  const extraKinds: ExtraKind[] = ['shielded', 'healer', 'runner'];

  it('3 種類のエントリを持つ', () => {
    expect(Object.keys(EXTRA_KIND)).toHaveLength(3);
  });

  it.each(extraKinds)('%s: hpMul が正の数', (kind) => {
    expect(EXTRA_KIND[kind].hpMul).toBeGreaterThan(0);
  });

  it.each(extraKinds)('%s: speedMul が正の数', (kind) => {
    expect(EXTRA_KIND[kind].speedMul).toBeGreaterThan(0);
  });

  it.each(extraKinds)('%s: ring が空でない文字列', (kind) => {
    expect(EXTRA_KIND[kind].ring.length).toBeGreaterThan(0);
  });

  it.each(extraKinds)('%s: emoji が空でない文字列', (kind) => {
    expect(EXTRA_KIND[kind].emoji.length).toBeGreaterThan(0);
  });

  it.each(extraKinds)('%s: note が空でない文字列', (kind) => {
    expect(EXTRA_KIND[kind].note.length).toBeGreaterThan(0);
  });

  it('shielded の hpMul はおおよそ 2.0（高耐久）', () => {
    expect(EXTRA_KIND.shielded.hpMul).toBeCloseTo(2.0, 1);
  });

  it('runner の hpMul は 0.5 未満（低耐久）', () => {
    expect(EXTRA_KIND.runner.hpMul).toBeLessThan(0.5);
  });

  it('runner の speedMul は 2.0 超（超高速）', () => {
    expect(EXTRA_KIND.runner.speedMul).toBeGreaterThan(2.0);
  });

  it('ring クラスが border- で始まる', () => {
    for (const k of extraKinds) {
      expect(EXTRA_KIND[k].ring).toMatch(/^border-/);
    }
  });
});

/* ------------------------------------------------------------ composeWave 基本 */

describe('composeWave 基本', () => {
  it('wave 1: 配列が空でない', () => {
    expect(composeWave(1).length).toBeGreaterThan(0);
  });

  it('wave 1: 拡張 kind を含まない（全員 normal）', () => {
    const wave1 = composeWave(1);
    const extraKinds: ExtraKind[] = ['shielded', 'healer', 'runner'];
    for (const spec of wave1) {
      expect(extraKinds).not.toContain(spec.kind);
    }
  });

  it('wave 1: 全員 normal', () => {
    const wave1 = composeWave(1);
    for (const spec of wave1) {
      expect(spec.kind).toBe('normal');
    }
  });

  it('すべての FullEnemySpec の hp > 0', () => {
    for (let w = 1; w <= 15; w++) {
      const specs: FullEnemySpec[] = composeWave(w);
      for (const spec of specs) {
        expect(spec.hp).toBeGreaterThan(0);
      }
    }
  });
});

/* ------------------------------------------------- 拡張 kind の導入タイミング */

describe('拡張 kind の導入タイミング', () => {
  it('wave 4 までに runner が登場する', () => {
    const wave4 = composeWave(4);
    const kinds = wave4.map((s) => s.kind);
    expect(kinds).toContain('runner');
  });

  it('wave 3 には runner が登場しない', () => {
    const wave3 = composeWave(3);
    const kinds = wave3.map((s) => s.kind);
    expect(kinds).not.toContain('runner');
  });

  it('wave 6 までに shielded が登場する', () => {
    const wave6 = composeWave(6);
    const kinds = wave6.map((s) => s.kind);
    expect(kinds).toContain('shielded');
  });

  it('wave 5 には shielded が登場しない', () => {
    const wave5 = composeWave(5);
    const kinds = wave5.map((s) => s.kind);
    expect(kinds).not.toContain('shielded');
  });

  it('wave 8 までに healer が登場する', () => {
    const wave8 = composeWave(8);
    const kinds = wave8.map((s) => s.kind);
    expect(kinds).toContain('healer');
  });

  it('wave 7 には healer が登場しない', () => {
    const wave7 = composeWave(7);
    const kinds = wave7.map((s) => s.kind);
    expect(kinds).not.toContain('healer');
  });
});

/* ---------------------------------------------------------------- ボス */

describe('ボス', () => {
  it('wave 5: 末尾要素が boss', () => {
    const specs = composeWave(5);
    expect(specs[specs.length - 1].kind).toBe('boss');
  });

  it('wave 10: 末尾要素が boss', () => {
    const specs = composeWave(10);
    expect(specs[specs.length - 1].kind).toBe('boss');
  });

  it('wave 15: 末尾要素が boss', () => {
    const specs = composeWave(15);
    expect(specs[specs.length - 1].kind).toBe('boss');
  });

  it('wave 1: boss を含まない', () => {
    const kinds = composeWave(1).map((s) => s.kind);
    expect(kinds).not.toContain('boss');
  });

  it('wave 3: boss を含まない', () => {
    const kinds = composeWave(3).map((s) => s.kind);
    expect(kinds).not.toContain('boss');
  });

  it('boss の hp はベース hp × ボス倍率（engine.ts と同等）', () => {
    const wave5 = composeWave(5);
    const boss = wave5[wave5.length - 1];
    expect(boss.hp).toBe(Math.round(waveSpec(5).hp * KIND.boss.hpMul));
  });
});

/* ------------------------------------------------------------ 決定性テスト */

describe('composeWave の決定性', () => {
  const testWaves = [1, 3, 4, 5, 6, 8, 10, 12, 15, 20];

  it.each(testWaves)('wave %i: 同じ引数で二度呼んだ結果が深く等しい', (wave) => {
    const a = composeWave(wave);
    const b = composeWave(wave);
    expect(a).toEqual(b);
  });
});

/* -------------------------------------------- FullEnemySpec 構造チェック */

describe('FullEnemySpec 構造', () => {
  it('全フィールドが存在する', () => {
    const specs = composeWave(6);
    for (const spec of specs) {
      expect(typeof spec.hp).toBe('number');
      expect(typeof spec.power).toBe('number');
      expect(typeof spec.speed).toBe('number');
      expect(typeof spec.kind).toBe('string');
    }
  });

  it('speed > 0 を全波で保証', () => {
    for (let w = 1; w <= 10; w++) {
      for (const spec of composeWave(w)) {
        expect(spec.speed).toBeGreaterThan(0);
      }
    }
  });

  it('power > 0 を全波で保証', () => {
    for (let w = 1; w <= 10; w++) {
      for (const spec of composeWave(w)) {
        expect(spec.power).toBeGreaterThan(0);
      }
    }
  });

  it('後のウェーブほど敵数が増える（wave 10 > wave 1）', () => {
    expect(composeWave(10).length).toBeGreaterThan(composeWave(1).length);
  });
});
