/* ============================================================================
 * GRID STELLA — help.ts のユニットテスト
 *
 * ヘルプセクション・TIPS・純粋関数の正確性と JSX 安全性を検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { HELP, TIPS, tipAt, randomTip } from './help';

/* ---------------------------------------------------------------- 禁止文字パターン */

// JSX 安全性: ASCII の ' " < > & { } を含まない
const FORBIDDEN = /['"<>&{}]/;

/* ---------------------------------------------------------------- HELP セクション */

describe('HELP', () => {
  it('空でない配列を持つ', () => {
    expect(HELP.length).toBeGreaterThan(0);
  });

  it('各セクションは非空の id / icon / title を持つ', () => {
    for (const section of HELP) {
      expect(section.id.trim().length).toBeGreaterThan(0);
      expect(section.icon.trim().length).toBeGreaterThan(0);
      expect(section.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('各セクションは2件以上の items を持つ', () => {
    for (const section of HELP) {
      expect(section.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('セクション id はすべて一意である', () => {
    const ids = HELP.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('各 item は禁止 ASCII 文字を含まない（JSX 安全性）', () => {
    for (const section of HELP) {
      for (const item of section.items) {
        expect(FORBIDDEN.test(item)).toBe(false);
      }
    }
  });
});

/* ---------------------------------------------------------------- TIPS */

describe('TIPS', () => {
  it('8件以上のヒントを持つ', () => {
    expect(TIPS.length).toBeGreaterThanOrEqual(8);
  });

  it('各ヒントは禁止 ASCII 文字を含まない（JSX 安全性）', () => {
    for (const tip of TIPS) {
      expect(FORBIDDEN.test(tip)).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------- tipAt */

describe('tipAt', () => {
  it('index 0 で TIPS[0] を返す', () => {
    expect(tipAt(0)).toBe(TIPS[0]);
  });

  it('TIPS の長さを超える大きな正数でも安全にラップする', () => {
    const len = TIPS.length;
    expect(tipAt(len)).toBe(TIPS[0]);
    expect(tipAt(len * 3 + 2)).toBe(TIPS[2]);
  });

  it('負数インデックスでも安全にラップする', () => {
    const len = TIPS.length;
    expect(tipAt(-1)).toBe(TIPS[len - 1]);
    expect(tipAt(-len)).toBe(TIPS[0]);
    expect(tipAt(-(len * 2 + 1))).toBe(TIPS[len - 1]);
  });
});

/* ---------------------------------------------------------------- randomTip */

describe('randomTip', () => {
  it('rng が常に 0 を返すとき TIPS[0] を返す', () => {
    expect(randomTip(() => 0)).toBe(TIPS[0]);
  });

  it('rng が 1 直前の値を返すとき最後の TIPS 要素を返す', () => {
    // Math.floor((1 - ε) * len) === len - 1
    const almostOne = 1 - Number.EPSILON;
    expect(randomTip(() => almostOne)).toBe(TIPS[TIPS.length - 1]);
  });

  it('rng 省略時も文字列を返す（デフォルト Math.random）', () => {
    const result = randomTip();
    expect(typeof result).toBe('string');
    expect(result.trim().length).toBeGreaterThan(0);
  });
});
