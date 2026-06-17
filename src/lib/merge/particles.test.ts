/* ============================================================================
 * GRID STELLA — particles.ts のユニットテスト
 *
 * Vitest を使用。乱数は決定的なシード付き疑似乱数で再現性を担保する。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  burst,
  step,
  alive,
  fade,
  advance,
  BURST_COUNT,
  GRAVITY,
  type BurstKind,
  type Particle,
} from './particles';

/* ---------------------------------------------------------------- テスト用乱数 */
// 単純な線形合同法（LCG）によるシード付き疑似乱数生成器。
function makeLcgRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    // 符号なし 32bit に変換して 0..1 に正規化。
    return ((s >>> 0) / 0x100000000);
  };
}

/* ---------------------------------------------------------------- burst() */
describe('burst()', () => {
  const kinds: BurstKind[] = ['hit', 'kill', 'ult', 'win'];

  it.each(kinds)('"%s" は BURST_COUNT[kind] 個のパーティクルを返す', (kind) => {
    const rng = makeLcgRng(42);
    const particles = burst(kind, 50, 50, rng);
    expect(particles).toHaveLength(BURST_COUNT[kind]);
  });

  it('生成されたパーティクルの id はすべて一意である', () => {
    const rng = makeLcgRng(7);
    const particles = burst('kill', 30, 70, rng);
    const ids = particles.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('複数のバーストで id が重複しない', () => {
    const rng = makeLcgRng(99);
    const a = burst('hit', 10, 10, rng);
    const b = burst('hit', 90, 90, rng);
    const allIds = [...a, ...b].map((p) => p.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it('各パーティクルの life === max（生成直後）', () => {
    const rng = makeLcgRng(1);
    const particles = burst('hit', 50, 50, rng);
    for (const p of particles) {
      expect(p.life).toBe(p.max);
    }
  });

  it('life / max が 0.4..0.9 の範囲内', () => {
    const rng = makeLcgRng(2);
    const particles = burst('ult', 50, 50, rng);
    for (const p of particles) {
      expect(p.life).toBeGreaterThanOrEqual(0.4);
      expect(p.life).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it('hue が 0..360 の範囲内', () => {
    const rng = makeLcgRng(3);
    for (const kind of kinds) {
      const particles = burst(kind, 50, 50, rng);
      for (const p of particles) {
        expect(p.hue).toBeGreaterThanOrEqual(0);
        expect(p.hue).toBeLessThanOrEqual(360);
      }
    }
  });

  it('size が 0.6..1.6 の範囲内', () => {
    const rng = makeLcgRng(4);
    const particles = burst('win', 50, 50, rng);
    for (const p of particles) {
      expect(p.size).toBeGreaterThanOrEqual(0.6);
      expect(p.size).toBeLessThanOrEqual(1.6 + 1e-9);
    }
  });

  it('x, y が発生点と一致する', () => {
    const rng = makeLcgRng(5);
    const particles = burst('kill', 33.3, 66.7, rng);
    for (const p of particles) {
      expect(p.x).toBeCloseTo(33.3);
      expect(p.y).toBeCloseTo(66.7);
    }
  });

  it('同じシードなら出力が再現可能', () => {
    const particles1 = burst('ult', 50, 50, makeLcgRng(123));
    const particles2 = burst('ult', 50, 50, makeLcgRng(123));
    expect(particles1.map((p) => ({ x: p.x, vx: p.vx, vy: p.vy, life: p.life, hue: p.hue, size: p.size }))).toEqual(
      particles2.map((p) => ({ x: p.x, vx: p.vx, vy: p.vy, life: p.life, hue: p.hue, size: p.size })),
    );
  });
});

/* ---------------------------------------------------------------- step() */
describe('step()', () => {
  const base: Particle = {
    id: 'test_0',
    x: 50,
    y: 50,
    vx: 10,
    vy: -5,
    life: 0.8,
    max: 0.8,
    hue: 45,
    size: 1.0,
  };

  it('x が vx * dt だけ増加する', () => {
    const dt = 0.1;
    const result = step(base, dt);
    expect(result.x).toBeCloseTo(base.x + base.vx * dt);
  });

  it('y が vy * dt だけ増加する', () => {
    const dt = 0.1;
    const result = step(base, dt);
    expect(result.y).toBeCloseTo(base.y + base.vy * dt);
  });

  it('life が dt だけ減少する', () => {
    const dt = 0.16;
    const result = step(base, dt);
    expect(result.life).toBeCloseTo(base.life - dt);
  });

  it('vy に GRAVITY * dt が加算される（重力）', () => {
    const dt = 0.1;
    const result = step(base, dt);
    expect(result.vy).toBeCloseTo(base.vy + GRAVITY * dt);
  });

  it('元のパーティクルは変更されない（イミュータブル）', () => {
    const original = { ...base };
    step(base, 0.1);
    expect(base.x).toBe(original.x);
    expect(base.life).toBe(original.life);
  });

  it('複数ステップで位置が積算される', () => {
    const dt = 0.05;
    const p1 = step(base, dt);
    const p2 = step(p1, dt);
    expect(p2.x).toBeCloseTo(base.x + base.vx * dt + p1.vx * dt);
  });
});

/* ---------------------------------------------------------------- alive() */
describe('alive()', () => {
  it('life > 0 なら true', () => {
    const p: Particle = { id: 'a', x: 0, y: 0, vx: 0, vy: 0, life: 0.1, max: 0.8, hue: 45, size: 1 };
    expect(alive(p)).toBe(true);
  });

  it('life === 0 なら false', () => {
    const p: Particle = { id: 'b', x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0.8, hue: 45, size: 1 };
    expect(alive(p)).toBe(false);
  });

  it('life < 0 なら false', () => {
    const p: Particle = { id: 'c', x: 0, y: 0, vx: 0, vy: 0, life: -0.01, max: 0.8, hue: 45, size: 1 };
    expect(alive(p)).toBe(false);
  });
});

/* ---------------------------------------------------------------- fade() */
describe('fade()', () => {
  it('生成直後（life === max）は 1 を返す', () => {
    const p: Particle = { id: 'd', x: 0, y: 0, vx: 0, vy: 0, life: 0.8, max: 0.8, hue: 45, size: 1 };
    expect(fade(p)).toBeCloseTo(1);
  });

  it('半減時は 0.5 を返す', () => {
    const p: Particle = { id: 'e', x: 0, y: 0, vx: 0, vy: 0, life: 0.4, max: 0.8, hue: 45, size: 1 };
    expect(fade(p)).toBeCloseTo(0.5);
  });

  it('消滅後（life <= 0）は 0 を返す', () => {
    const p: Particle = { id: 'f', x: 0, y: 0, vx: 0, vy: 0, life: -0.1, max: 0.8, hue: 45, size: 1 };
    expect(fade(p)).toBe(0);
  });

  it('常に [0, 1] の範囲内', () => {
    const rng = makeLcgRng(77);
    const particles = burst('win', 50, 50, rng);
    for (const p of particles) {
      const f = fade(p);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

/* ---------------------------------------------------------------- advance() */
describe('advance()', () => {
  it('全パーティクルを dt 秒進める', () => {
    const rng = makeLcgRng(55);
    const initial = burst('hit', 50, 50, rng);
    const dt = 0.05;
    const next = advance(initial, dt);
    // 残存数は同じ（life が 0.05 以上あるので死なない）。
    expect(next.length).toBe(initial.length);
    // 先頭の x が進んでいる。
    expect(next[0].x).toBeCloseTo(initial[0].x + initial[0].vx * dt);
  });

  it('life が 0 に達したパーティクルは除去される', () => {
    const dying: Particle = { id: 'z1', x: 0, y: 0, vx: 0, vy: 0, life: 0.01, max: 0.8, hue: 45, size: 1 };
    const living: Particle = { id: 'z2', x: 0, y: 0, vx: 0, vy: 0, life: 0.5, max: 0.5, hue: 45, size: 1 };
    const result = advance([dying, living], 0.1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('z2');
  });

  it('十分な dt を積算すると全パーティクルが消える', () => {
    const rng = makeLcgRng(88);
    let particles = burst('hit', 50, 50, rng);
    // 最大寿命 0.9s を超えるまで繰り返す。
    for (let i = 0; i < 20; i++) {
      particles = advance(particles, 0.1);
    }
    expect(particles).toHaveLength(0);
  });

  it('元のリストを変更しない（イミュータブル）', () => {
    const rng = makeLcgRng(11);
    const initial = burst('kill', 50, 50, rng);
    const snapshot = initial.map((p) => ({ ...p }));
    advance(initial, 0.1);
    initial.forEach((p, i) => {
      expect(p.life).toBe(snapshot[i].life);
    });
  });

  it('空リストを渡しても空リストが返る', () => {
    expect(advance([], 0.1)).toEqual([]);
  });
});
