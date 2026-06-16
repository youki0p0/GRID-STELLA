/* ============================================================================
 * GRID STELLA — idle.ts のユニットテスト
 *
 * Vitest で実行。副作用なし・純粋関数のみを検証する。
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import {
  DUST_PER_HOUR,
  GOLD_PER_HOUR,
  IDLE_CAP_MS,
  accrued,
  claim,
  defaultIdle,
  elapsedMs,
  fillPct,
  parseIdle,
  serializeIdle,
} from './idle';

/* ---------------------------------------------------------------- 定数の確認 */
describe('定数', () => {
  it('IDLE_CAP_MS は 8 時間分のミリ秒', () => {
    expect(IDLE_CAP_MS).toBe(8 * 60 * 60 * 1000);
  });

  it('GOLD_PER_HOUR は 30', () => {
    expect(GOLD_PER_HOUR).toBe(30);
  });

  it('DUST_PER_HOUR は 2', () => {
    expect(DUST_PER_HOUR).toBe(2);
  });
});

/* ---------------------------------------------------------------- defaultIdle */
describe('defaultIdle', () => {
  it('lastClaim に now をセットする', () => {
    const now = 1_700_000_000_000;
    expect(defaultIdle(now)).toEqual({ lastClaim: now });
  });
});

/* ---------------------------------------------------------------- serializeIdle / parseIdle */
describe('parseIdle', () => {
  it('null を渡すと defaultIdle(now) を返す', () => {
    const now = 1_700_000_000_000;
    expect(parseIdle(null, now)).toEqual(defaultIdle(now));
  });

  it('serializeIdle → parseIdle でラウンドトリップできる', () => {
    const s = { lastClaim: 1_234_567_890_000 };
    const raw = serializeIdle(s);
    expect(parseIdle(raw, 0)).toEqual(s);
  });

  it('不正な JSON はデフォルト値を返す', () => {
    const now = 9_000_000;
    expect(parseIdle('not-json', now)).toEqual(defaultIdle(now));
  });

  it('lastClaim が文字列の場合はデフォルト値を返す', () => {
    const now = 9_000_000;
    expect(parseIdle(JSON.stringify({ lastClaim: 'abc' }), now)).toEqual(defaultIdle(now));
  });

  it('lastClaim が NaN の場合はデフォルト値を返す', () => {
    const now = 9_000_000;
    // JSON.stringify converts NaN to null
    expect(parseIdle(JSON.stringify({ lastClaim: null }), now)).toEqual(defaultIdle(now));
  });

  it('空オブジェクトはデフォルト値を返す', () => {
    const now = 5_000;
    expect(parseIdle('{}', now)).toEqual(defaultIdle(now));
  });

  it('null リテラル文字列はデフォルト値を返す', () => {
    const now = 5_000;
    expect(parseIdle('null', now)).toEqual(defaultIdle(now));
  });
});

/* ---------------------------------------------------------------- elapsedMs */
describe('elapsedMs', () => {
  const base = 1_700_000_000_000;

  it('経過がゼロの場合は 0 を返す', () => {
    expect(elapsedMs({ lastClaim: base }, base)).toBe(0);
  });

  it('通常の経過時間をそのまま返す', () => {
    const delta = 2 * 60 * 60 * 1000; // 2 時間
    expect(elapsedMs({ lastClaim: base }, base + delta)).toBe(delta);
  });

  it('上限を超えた場合は IDLE_CAP_MS にクランプする', () => {
    const over = base + IDLE_CAP_MS + 999_999;
    expect(elapsedMs({ lastClaim: base }, over)).toBe(IDLE_CAP_MS);
  });

  it('時計のズレ（now < lastClaim）で 0 を返す（負にならない）', () => {
    expect(elapsedMs({ lastClaim: base + 5000 }, base)).toBe(0);
  });

  it('上限ちょうどの場合は IDLE_CAP_MS を返す', () => {
    expect(elapsedMs({ lastClaim: base }, base + IDLE_CAP_MS)).toBe(IDLE_CAP_MS);
  });
});

/* ---------------------------------------------------------------- accrued */
describe('accrued', () => {
  const base = 1_700_000_000_000;
  const oneHour = 3_600_000;

  it('経過ゼロで gold / dust はゼロ、capped は false', () => {
    const y = accrued({ lastClaim: base }, base);
    expect(y.gold).toBe(0);
    expect(y.dust).toBe(0);
    expect(y.capped).toBe(false);
    expect(y.ms).toBe(0);
  });

  it('1 時間経過で gold = GOLD_PER_HOUR、dust = DUST_PER_HOUR', () => {
    const y = accrued({ lastClaim: base }, base + oneHour);
    expect(y.gold).toBe(GOLD_PER_HOUR);
    expect(y.dust).toBe(DUST_PER_HOUR);
    expect(y.capped).toBe(false);
  });

  it('端数は floor される（整数）', () => {
    // 1.5 時間 → gold = floor(1.5 * 30) = 45、dust = floor(1.5 * 2) = 3
    const y = accrued({ lastClaim: base }, base + oneHour * 1.5);
    expect(y.gold).toBe(45);
    expect(y.dust).toBe(3);
    expect(Number.isInteger(y.gold)).toBe(true);
    expect(Number.isInteger(y.dust)).toBe(true);
  });

  it('mult で倍率スケールされる', () => {
    // 2 時間 × mult 2 → gold = floor(2 * 30 * 2) = 120
    const y = accrued({ lastClaim: base }, base + oneHour * 2, 2);
    expect(y.gold).toBe(120);
    expect(y.dust).toBe(8);
  });

  it('mult 0.5 で半分（floor 適用）', () => {
    // 1 時間 × 0.5 → gold = floor(30 * 0.5) = 15
    const y = accrued({ lastClaim: base }, base + oneHour, 0.5);
    expect(y.gold).toBe(15);
    expect(y.dust).toBe(1);
  });

  it('上限を超えると capped = true、ms は IDLE_CAP_MS', () => {
    const y = accrued({ lastClaim: base }, base + IDLE_CAP_MS + 1000);
    expect(y.capped).toBe(true);
    expect(y.ms).toBe(IDLE_CAP_MS);
  });

  it('上限ちょうどは capped = false（raw === cap）', () => {
    const y = accrued({ lastClaim: base }, base + IDLE_CAP_MS);
    expect(y.capped).toBe(false);
  });

  it('上限ちょうどの報酬は 8 時間分に等しい', () => {
    const y = accrued({ lastClaim: base }, base + IDLE_CAP_MS);
    expect(y.gold).toBe(Math.floor(8 * GOLD_PER_HOUR));
    expect(y.dust).toBe(Math.floor(8 * DUST_PER_HOUR));
  });

  it('時計のズレ（負の経過）はゼロ報酬、capped = false', () => {
    const y = accrued({ lastClaim: base + 10_000 }, base);
    expect(y.gold).toBe(0);
    expect(y.dust).toBe(0);
    expect(y.capped).toBe(false);
  });
});

/* ---------------------------------------------------------------- claim */
describe('claim', () => {
  it('lastClaim を now にリセットする', () => {
    const old = { lastClaim: 1_000 };
    const now = 9_000_000;
    const next = claim(old, now);
    expect(next.lastClaim).toBe(now);
  });

  it('claim 直後の accrued はほぼゼロ（同一 now）', () => {
    const now = 1_700_000_000_000;
    const s = { lastClaim: now - 2 * 3_600_000 };
    const next = claim(s, now);
    const y = accrued(next, now);
    expect(y.gold).toBe(0);
    expect(y.dust).toBe(0);
  });

  it('元の状態を変更しない（不変）', () => {
    const old = { lastClaim: 1_000 };
    claim(old, 9_000);
    expect(old.lastClaim).toBe(1_000);
  });
});

/* ---------------------------------------------------------------- fillPct */
describe('fillPct', () => {
  const base = 1_700_000_000_000;

  it('経過ゼロで 0 を返す', () => {
    expect(fillPct({ lastClaim: base }, base)).toBe(0);
  });

  it('上限で 1 を返す', () => {
    expect(fillPct({ lastClaim: base }, base + IDLE_CAP_MS)).toBe(1);
  });

  it('上限を超えても 1 を超えない', () => {
    const pct = fillPct({ lastClaim: base }, base + IDLE_CAP_MS * 2);
    expect(pct).toBe(1);
  });

  it('4 時間で 0.5 を返す', () => {
    expect(fillPct({ lastClaim: base }, base + 4 * 3_600_000)).toBeCloseTo(0.5);
  });

  it('常に [0, 1] の範囲内', () => {
    const cases = [
      base - 5000,     // 時計ズレ → 0
      base,            // ゼロ → 0
      base + 3_600_000, // 1 時間
      base + IDLE_CAP_MS, // 上限 → 1
      base + IDLE_CAP_MS * 3, // 超過 → 1
    ];
    for (const now of cases) {
      const pct = fillPct({ lastClaim: base }, now);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(1);
    }
  });
});
