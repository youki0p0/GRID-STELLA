/* ============================================================================
 * GRID STELLA — targeting strategies: unit tests
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  TARGET_MODES,
  TARGET_MODE_IDS,
  nextMode,
  selectTarget,
  type TargetMode,
  type Candidate,
} from './targeting';

/* ---------------------------------------------------------------- TARGET_MODES */

describe('TARGET_MODES', () => {
  it('エントリが5件ある', () => {
    expect(TARGET_MODES).toHaveLength(5);
  });

  it('全エントリの id が一意である', () => {
    const ids = TARGET_MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('全エントリが空でない icon / label / desc を持つ', () => {
    for (const m of TARGET_MODES) {
      expect(m.icon.length).toBeGreaterThan(0);
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.desc.length).toBeGreaterThan(0);
    }
  });

  it("'first' | 'last' | 'strong' | 'weak' | 'near' をすべて含む", () => {
    const ids = TARGET_MODES.map((m) => m.id);
    const required: TargetMode[] = ['first', 'last', 'strong', 'weak', 'near'];
    for (const r of required) {
      expect(ids).toContain(r);
    }
  });
});

/* ---------------------------------------------------------------- TARGET_MODE_IDS */

describe('TARGET_MODE_IDS', () => {
  it('TARGET_MODES の id 配列と一致する', () => {
    expect(TARGET_MODE_IDS).toEqual(TARGET_MODES.map((m) => m.id));
  });
});

/* ---------------------------------------------------------------- nextMode */

describe('nextMode', () => {
  it('全5モードを順に循環する', () => {
    let mode: TargetMode = TARGET_MODE_IDS[0];
    const visited: TargetMode[] = [mode];
    for (let i = 1; i < TARGET_MODE_IDS.length; i++) {
      mode = nextMode(mode);
      visited.push(mode);
    }
    expect(visited).toEqual(TARGET_MODE_IDS);
  });

  it('最後のモードから先頭に折り返す', () => {
    const last = TARGET_MODE_IDS[TARGET_MODE_IDS.length - 1];
    const first = TARGET_MODE_IDS[0];
    expect(nextMode(last)).toBe(first);
  });

  it('5回呼ぶと元のモードに戻る', () => {
    let mode: TargetMode = 'first';
    for (let i = 0; i < TARGET_MODE_IDS.length; i++) {
      mode = nextMode(mode);
    }
    expect(mode).toBe('first');
  });

  it('各モードを起点として5回で一周する', () => {
    for (const start of TARGET_MODE_IDS) {
      let mode: TargetMode = start;
      for (let i = 0; i < TARGET_MODE_IDS.length; i++) {
        mode = nextMode(mode);
      }
      expect(mode).toBe(start);
    }
  });
});

/* ---------------------------------------------------------------- selectTarget */

// テスト用候補セット（意図的にタイブレークが発生しない値を使う）。
const CANDIDATES: Candidate[] = [
  { id: 'e1', pos: 10, hp: 50, dist: 3.0 },
  { id: 'e2', pos: 25, hp: 80, dist: 1.5 },
  { id: 'e3', pos: 5,  hp: 20, dist: 4.5 },
  { id: 'e4', pos: 18, hp: 60, dist: 2.0 },
];

describe('selectTarget', () => {
  it('候補が空のとき null を返す', () => {
    expect(selectTarget('first', [])).toBeNull();
    expect(selectTarget('last',  [])).toBeNull();
    expect(selectTarget('strong',[])).toBeNull();
    expect(selectTarget('weak',  [])).toBeNull();
    expect(selectTarget('near',  [])).toBeNull();
  });

  it("'first' = pos 最大 (e2, pos=25) を返す", () => {
    const result = selectTarget('first', CANDIDATES);
    expect(result?.id).toBe('e2');
  });

  it("'last' = pos 最小 (e3, pos=5) を返す", () => {
    const result = selectTarget('last', CANDIDATES);
    expect(result?.id).toBe('e3');
  });

  it("'strong' = hp 最大 (e2, hp=80) を返す", () => {
    const result = selectTarget('strong', CANDIDATES);
    expect(result?.id).toBe('e2');
  });

  it("'weak' = hp 最小 (e3, hp=20) を返す", () => {
    const result = selectTarget('weak', CANDIDATES);
    expect(result?.id).toBe('e3');
  });

  it("'near' = dist 最小 (e2, dist=1.5) を返す", () => {
    const result = selectTarget('near', CANDIDATES);
    expect(result?.id).toBe('e2');
  });

  it('候補が1件のとき、そのまま返す', () => {
    const single: Candidate[] = [{ id: 'only', pos: 7, hp: 30, dist: 2.0 }];
    for (const mode of TARGET_MODE_IDS) {
      expect(selectTarget(mode, single)?.id).toBe('only');
    }
  });

  /* -- タイブレーク: id の辞書順昇順 -- */

  it("'first' タイブレーク: pos が同値なら id 辞書順昇順を優先", () => {
    const tied: Candidate[] = [
      { id: 'z1', pos: 20, hp: 10, dist: 1.0 },
      { id: 'a1', pos: 20, hp: 10, dist: 1.0 },
    ];
    expect(selectTarget('first', tied)?.id).toBe('a1');
  });

  it("'last' タイブレーク: pos が同値なら id 辞書順昇順を優先", () => {
    const tied: Candidate[] = [
      { id: 'z2', pos: 5, hp: 10, dist: 1.0 },
      { id: 'b2', pos: 5, hp: 10, dist: 1.0 },
    ];
    expect(selectTarget('last', tied)?.id).toBe('b2');
  });

  it("'strong' タイブレーク: hp が同値なら id 辞書順昇順を優先", () => {
    const tied: Candidate[] = [
      { id: 'z3', pos: 5, hp: 100, dist: 1.0 },
      { id: 'c3', pos: 5, hp: 100, dist: 1.0 },
    ];
    expect(selectTarget('strong', tied)?.id).toBe('c3');
  });

  it("'weak' タイブレーク: hp が同値なら id 辞書順昇順を優先", () => {
    const tied: Candidate[] = [
      { id: 'z4', pos: 5, hp: 1, dist: 1.0 },
      { id: 'd4', pos: 5, hp: 1, dist: 1.0 },
    ];
    expect(selectTarget('weak', tied)?.id).toBe('d4');
  });

  it("'near' タイブレーク: dist が同値なら id 辞書順昇順を優先", () => {
    const tied: Candidate[] = [
      { id: 'z5', pos: 5, hp: 10, dist: 0.5 },
      { id: 'e5', pos: 5, hp: 10, dist: 0.5 },
    ];
    expect(selectTarget('near', tied)?.id).toBe('e5');
  });

  it('同一候補リストで同一モードを繰り返し呼んでも結果が変わらない（決定論的）', () => {
    for (const mode of TARGET_MODE_IDS) {
      const r1 = selectTarget(mode, CANDIDATES);
      const r2 = selectTarget(mode, CANDIDATES);
      expect(r1?.id).toBe(r2?.id);
    }
  });
});
