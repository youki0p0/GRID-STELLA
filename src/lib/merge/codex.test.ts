/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 図鑑データ層テスト
 *
 * codex.ts のすべてのエクスポートを Vitest で検証する。
 * 副作用なし・純粋関数のみテスト対象。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { TYPE_LIST } from './engine';
import { ULT_LIST } from './skills';
import {
  instrumentCodex,
  enemyCodex,
  ultimateCodex,
  fullCodex,
} from './codex';
import type { CodexEntry } from './codex';

/* ---------------------------------------------------------------- ヘルパー */

/** エントリの全フィールドが空でないことを確認する */
function assertNonEmpty(entry: CodexEntry, label: string): void {
  expect(entry.icon, `${label}: icon が空`).toBeTruthy();
  expect(entry.name, `${label}: name が空`).toBeTruthy();
  expect(entry.detail, `${label}: detail が空`).toBeTruthy();
}

/* ---------------------------------------------------------------- 器具図鑑 */

describe('instrumentCodex', () => {
  it('TYPE_LIST と同じ件数を返す', () => {
    expect(instrumentCodex()).toHaveLength(TYPE_LIST.length);
  });

  it('全エントリが icon / name / detail を持つ', () => {
    instrumentCodex().forEach((entry, i) => {
      assertNonEmpty(entry, `instruments[${i}]`);
    });
  });

  it('detail に atk の値が含まれる', () => {
    const entries = instrumentCodex();
    TYPE_LIST.forEach((t, i) => {
      expect(entries[i].detail).toContain(String(t.atk));
    });
  });

  it('detail に fireMs の値が含まれる', () => {
    const entries = instrumentCodex();
    TYPE_LIST.forEach((t, i) => {
      expect(entries[i].detail).toContain(String(t.fireMs));
    });
  });

  it('detail に rarity が含まれる', () => {
    const entries = instrumentCodex();
    TYPE_LIST.forEach((t, i) => {
      expect(entries[i].detail).toContain(t.rarity);
    });
  });

  it('icon が TYPE_LIST の emoji と一致する', () => {
    const entries = instrumentCodex();
    TYPE_LIST.forEach((t, i) => {
      expect(entries[i].icon).toBe(t.emoji);
    });
  });

  it('name が TYPE_LIST の name と一致する', () => {
    const entries = instrumentCodex();
    TYPE_LIST.forEach((t, i) => {
      expect(entries[i].name).toBe(t.name);
    });
  });
});

/* ---------------------------------------------------------------- 敵図鑑 */

describe('enemyCodex', () => {
  it('7件以上（ベース4種 + 拡張3種）のエントリを返す', () => {
    expect(enemyCodex().length).toBeGreaterThanOrEqual(7);
  });

  it('全エントリが icon / name / detail を持つ', () => {
    enemyCodex().forEach((entry, i) => {
      assertNonEmpty(entry, `enemies[${i}]`);
    });
  });

  it('shielded（🛡）のエントリが含まれる', () => {
    const icons = enemyCodex().map((e) => e.icon);
    expect(icons).toContain('🛡');
  });

  it('healer（✚）のエントリが含まれる', () => {
    const icons = enemyCodex().map((e) => e.icon);
    expect(icons).toContain('✚');
  });

  it('runner（☄）のエントリが含まれる', () => {
    const icons = enemyCodex().map((e) => e.icon);
    expect(icons).toContain('☄');
  });

  it('ボス（🌑）のエントリが含まれる', () => {
    const icons = enemyCodex().map((e) => e.icon);
    expect(icons).toContain('🌑');
  });

  it('通常歪曲体（👁）のエントリが含まれる', () => {
    const icons = enemyCodex().map((e) => e.icon);
    expect(icons).toContain('👁');
  });

  it('detail に HP倍率の文字列が含まれる', () => {
    enemyCodex().forEach((entry, i) => {
      expect(entry.detail, `enemies[${i}]: detail に HP倍率なし`).toContain('HP倍率');
    });
  });

  it('detail に速度倍率の文字列が含まれる', () => {
    enemyCodex().forEach((entry, i) => {
      expect(entry.detail, `enemies[${i}]: detail に速度倍率なし`).toContain('速度倍率');
    });
  });
});

/* ---------------------------------------------------------------- 必殺技図鑑 */

describe('ultimateCodex', () => {
  it('ULT_LIST と同じ件数を返す', () => {
    expect(ultimateCodex()).toHaveLength(ULT_LIST.length);
  });

  it('全エントリが icon / name / detail を持つ', () => {
    ultimateCodex().forEach((entry, i) => {
      assertNonEmpty(entry, `ultimates[${i}]`);
    });
  });

  it('icon が ULT_LIST の icon と一致する', () => {
    const entries = ultimateCodex();
    ULT_LIST.forEach((u, i) => {
      expect(entries[i].icon).toBe(u.icon);
    });
  });

  it('name が ULT_LIST の name と一致する', () => {
    const entries = ultimateCodex();
    ULT_LIST.forEach((u, i) => {
      expect(entries[i].name).toBe(u.name);
    });
  });

  it('detail が ULT_LIST の desc と一致する', () => {
    const entries = ultimateCodex();
    ULT_LIST.forEach((u, i) => {
      expect(entries[i].detail).toBe(u.desc);
    });
  });
});

/* ---------------------------------------------------------------- 統合図鑑 */

describe('fullCodex', () => {
  it('instruments / enemies / ultimates の3キーを持つオブジェクトを返す', () => {
    const codex = fullCodex();
    expect(codex).toHaveProperty('instruments');
    expect(codex).toHaveProperty('enemies');
    expect(codex).toHaveProperty('ultimates');
  });

  it('instruments の件数が instrumentCodex() と一致する', () => {
    const codex = fullCodex();
    expect(codex.instruments).toHaveLength(instrumentCodex().length);
  });

  it('enemies の件数が enemyCodex() と一致する', () => {
    const codex = fullCodex();
    expect(codex.enemies).toHaveLength(enemyCodex().length);
  });

  it('ultimates の件数が ultimateCodex() と一致する', () => {
    const codex = fullCodex();
    expect(codex.ultimates).toHaveLength(ultimateCodex().length);
  });

  it('instruments は TYPE_LIST と同じ件数', () => {
    expect(fullCodex().instruments).toHaveLength(TYPE_LIST.length);
  });

  it('ultimates は ULT_LIST と同じ件数', () => {
    expect(fullCodex().ultimates).toHaveLength(ULT_LIST.length);
  });

  it('enemies は7件以上', () => {
    expect(fullCodex().enemies.length).toBeGreaterThanOrEqual(7);
  });

  it('fullCodex の instruments が instrumentCodex() と等価', () => {
    expect(fullCodex().instruments).toEqual(instrumentCodex());
  });

  it('fullCodex の enemies が enemyCodex() と等価', () => {
    expect(fullCodex().enemies).toEqual(enemyCodex());
  });

  it('fullCodex の ultimates が ultimateCodex() と等価', () => {
    expect(fullCodex().ultimates).toEqual(ultimateCodex());
  });
});
