/* ============================================================================
 * GRID STELLA — gacha.ts ユニットテスト
 *
 * vitest で実行。外部 I/O なし・副作用なしの純粋関数を検証する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  PULL_COST,
  PITY,
  rollPull,
  nextPity,
  canPull,
  type Pull,
  type PullKind,
} from './gacha';
import { TYPES } from './engine';
import { RELIC_LIST } from './relics';

/* ---------------------------------------------------------------- 補助定数 */

const VALID_TYPE_IDS = new Set(Object.keys(TYPES));
const VALID_RELIC_IDS = new Set(RELIC_LIST.map((r) => r.id));
const VALID_RARITIES = new Set(['common', 'rare', 'astral']);
const VALID_PULL_KINDS: Set<PullKind> = new Set<PullKind>(['instrument', 'relic']);

/** シード付き決定的 rng（LCG）。0 以上 1 未満の値を返す。 */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

/* ---------------------------------------------------------------- Pull 妥当性チェック */

function assertValidPull(pull: Pull): void {
  // kind は 'instrument' か 'relic' のどちらか
  expect(VALID_PULL_KINDS.has(pull.kind)).toBe(true);

  // rarity は非空かつ既知の値
  expect(pull.rarity.length).toBeGreaterThan(0);
  expect(VALID_RARITIES.has(pull.rarity)).toBe(true);

  if (pull.kind === 'instrument') {
    // instrument フィールドが存在し、有効な TypeId
    expect(pull.instrument).toBeDefined();
    expect(VALID_TYPE_IDS.has(pull.instrument!)).toBe(true);
    expect(pull.relic).toBeUndefined();
  } else {
    // relic フィールドが存在し、有効な RelicId
    expect(pull.relic).toBeDefined();
    expect(VALID_RELIC_IDS.has(pull.relic!)).toBe(true);
    expect(pull.instrument).toBeUndefined();
  }
}

/* ================================================================ テスト */

describe('PULL_COST', () => {
  it('正の整数である', () => {
    expect(PULL_COST).toBeGreaterThan(0);
    expect(Number.isInteger(PULL_COST)).toBe(true);
  });
});

describe('PITY', () => {
  it('正の整数である', () => {
    expect(PITY).toBeGreaterThan(0);
    expect(Number.isInteger(PITY)).toBe(true);
  });
});

describe('canPull', () => {
  it('PULL_COST 以上のとき true', () => {
    expect(canPull(PULL_COST)).toBe(true);
    expect(canPull(PULL_COST + 1)).toBe(true);
    expect(canPull(PULL_COST * 10)).toBe(true);
  });

  it('PULL_COST 未満のとき false', () => {
    expect(canPull(PULL_COST - 1)).toBe(false);
    expect(canPull(0)).toBe(false);
  });
});

describe('rollPull — 結果の妥当性', () => {
  it('多様なシード値で常に有効な Pull を返す', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed);
      const pull = rollPull(rng, 0);
      assertValidPull(pull);
    }
  });

  it('ピティが 0 から PITY-2 の全値で有効な Pull を返す', () => {
    for (let pity = 0; pity <= PITY - 2; pity++) {
      const rng = seededRng(42 + pity);
      const pull = rollPull(rng, pity);
      assertValidPull(pull);
    }
  });

  it('kind が instrument のとき instrument フィールドが有効な TypeId', () => {
    const instrumentPulls: Pull[] = [];
    // 1つの連続した rng ストリームで多数の pull を行う（分布を確保するため）
    const rng = seededRng(54321);
    for (let i = 0; i < 500; i++) {
      const pull = rollPull(rng, 0);
      if (pull.kind === 'instrument') instrumentPulls.push(pull);
    }
    // 器具が1件以上出ていること（期待値は ~350 件）
    expect(instrumentPulls.length).toBeGreaterThan(0);
    for (const p of instrumentPulls) {
      assertValidPull(p);
    }
  });

  it('kind が relic のとき relic フィールドが有効な RelicId', () => {
    const relicPulls: Pull[] = [];
    // 1つの連続した rng ストリームで多数の pull を行う（分布を確保するため）
    const rng = seededRng(12345);
    for (let i = 0; i < 500; i++) {
      const pull = rollPull(rng, 0);
      if (pull.kind === 'relic') relicPulls.push(pull);
    }
    // 遺物が1件以上出ていること（期待値は ~150 件）
    expect(relicPulls.length).toBeGreaterThan(0);
    for (const p of relicPulls) {
      assertValidPull(p);
    }
  });
});

describe('rollPull — ピティ確定', () => {
  it('pity が PITY-1 のとき必ず高価値（遺物 または astral 器具）', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed);
      const pull = rollPull(rng, PITY - 1);
      assertValidPull(pull);
      const isHighValue =
        pull.kind === 'relic' || (pull.kind === 'instrument' && pull.rarity === 'astral');
      expect(isHighValue).toBe(true);
    }
  });

  it('pity が PITY 以上でも高価値となる', () => {
    for (const pity of [PITY, PITY + 1, PITY + 5]) {
      const rng = seededRng(7);
      const pull = rollPull(rng, pity);
      assertValidPull(pull);
      const isHighValue =
        pull.kind === 'relic' || (pull.kind === 'instrument' && pull.rarity === 'astral');
      expect(isHighValue).toBe(true);
    }
  });
});

describe('nextPity', () => {
  it('遺物（relic）の pull でカウンタが 0 にリセットされる', () => {
    const relicPull: Pull = { kind: 'relic', relic: 'lens', rarity: 'astral' };
    expect(nextPity(5, relicPull)).toBe(0);
    expect(nextPity(0, relicPull)).toBe(0);
    expect(nextPity(PITY - 1, relicPull)).toBe(0);
  });

  it('astral 器具の pull でカウンタが 0 にリセットされる', () => {
    const astralPull: Pull = { kind: 'instrument', instrument: 'telescope', rarity: 'astral' };
    expect(nextPity(3, astralPull)).toBe(0);
    expect(nextPity(0, astralPull)).toBe(0);
  });

  it('common 器具の pull でカウンタが +1 される', () => {
    const commonPull: Pull = { kind: 'instrument', instrument: 'needle', rarity: 'common' };
    expect(nextPity(0, commonPull)).toBe(1);
    expect(nextPity(4, commonPull)).toBe(5);
    expect(nextPity(PITY - 2, commonPull)).toBe(PITY - 1);
  });

  it('rare 器具の pull でカウンタが +1 される', () => {
    const rarePull: Pull = { kind: 'instrument', instrument: 'compass', rarity: 'rare' };
    expect(nextPity(0, rarePull)).toBe(1);
    expect(nextPity(7, rarePull)).toBe(8);
  });
});

describe('rollPull + nextPity — ピティカウンタ連携', () => {
  it('PITY-1 連続 non-high-value pull の後、確定 pull でリセットされる', () => {
    // pity=PITY-1 で rollPull を呼ぶと高価値が確定し、nextPity は 0 を返す
    for (let seed = 1; seed <= 50; seed++) {
      const rng = seededRng(seed);
      const pull = rollPull(rng, PITY - 1);
      const after = nextPity(PITY - 1, pull);
      const isHighValue =
        pull.kind === 'relic' || (pull.kind === 'instrument' && pull.rarity === 'astral');
      expect(isHighValue).toBe(true);
      expect(after).toBe(0);
    }
  });
});
