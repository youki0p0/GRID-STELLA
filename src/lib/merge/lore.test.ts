/* ============================================================================
 * GRID STELLA — lore.ts ユニットテスト
 *
 * Vitest による純粋関数・定数の検証。
 * エイリアス不使用・相対インポートで統一。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { LORE, BOSS_LINES, bossLine, loreCodex } from './lore';

/* ---------------------------------------------------------------- 禁止文字セット */

/** JSX安全性のため、各文字列が含んではならないASCII文字 */
const FORBIDDEN = [`'`, `"`, `<`, `>`];

function hasForbidden(s: string): boolean {
  return FORBIDDEN.some((ch) => s.includes(ch));
}

/* ---------------------------------------------------------------- LORE */

describe('LORE', () => {
  it('エントリが6件以上存在する', () => {
    expect(LORE.length).toBeGreaterThanOrEqual(6);
  });

  it('各エントリの icon が空でない', () => {
    for (const entry of LORE) {
      expect(entry.icon.trim().length, `icon が空: ${entry.name}`).toBeGreaterThan(0);
    }
  });

  it('各エントリの name が空でない', () => {
    for (const entry of LORE) {
      expect(entry.name.trim().length, `name が空`).toBeGreaterThan(0);
    }
  });

  it('各エントリの detail が空でない', () => {
    for (const entry of LORE) {
      expect(entry.detail.trim().length, `detail が空: ${entry.name}`).toBeGreaterThan(0);
    }
  });

  it("各エントリの全フィールドに禁止文字 ' \" < > が含まれない", () => {
    for (const entry of LORE) {
      expect(hasForbidden(entry.icon), `icon に禁止文字: ${entry.name}`).toBe(false);
      expect(hasForbidden(entry.name), `name に禁止文字: ${entry.name}`).toBe(false);
      expect(hasForbidden(entry.detail), `detail に禁止文字: ${entry.name}`).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------- BOSS_LINES */

describe('BOSS_LINES', () => {
  it('5件以上の台詞がある', () => {
    expect(BOSS_LINES.length).toBeGreaterThanOrEqual(5);
  });

  it('各台詞が空でない', () => {
    for (const line of BOSS_LINES) {
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it("各台詞に禁止文字 ' \" < > が含まれない", () => {
    for (const line of BOSS_LINES) {
      expect(hasForbidden(line)).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------- bossLine */

describe('bossLine', () => {
  it('同一 wave では常に同じ台詞を返す（決定的）', () => {
    for (let wave = 0; wave < 20; wave++) {
      expect(bossLine(wave)).toBe(bossLine(wave));
    }
  });

  it('返す台詞は必ず BOSS_LINES の要素のいずれか', () => {
    for (let wave = 0; wave < 30; wave++) {
      expect(BOSS_LINES).toContain(bossLine(wave));
    }
  });

  it('大きい wave 番号でも範囲外にならない', () => {
    expect(BOSS_LINES).toContain(bossLine(9999));
  });

  it('wave=0 で最初のインデックスを返す', () => {
    expect(bossLine(0)).toBe(BOSS_LINES[0]);
  });
});

/* ---------------------------------------------------------------- loreCodex */

describe('loreCodex', () => {
  it('LORE 配列そのものを返す', () => {
    expect(loreCodex()).toBe(LORE);
  });

  it('返り値が6件以上', () => {
    expect(loreCodex().length).toBeGreaterThanOrEqual(6);
  });
});
