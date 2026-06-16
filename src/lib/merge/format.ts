/* ============================================================================
 * GRID STELLA — 表示フォーマットヘルパー（純粋関数）
 *
 * UI 全体で使う数値・パーセント変換ユーティリティ。
 * 副作用なし・Intl 非依存（ロケール差異を排除）。
 * ========================================================================== */

/* ------------------------------------------------------------------ abbrev
 * 数値を短い文字列に変換する。
 *   |n| < 1000        → 整数文字列          例: 0 → '0', 999 → '999'
 *   |n| < 1_000_000   → 千単位 + 'K'       例: 1234 → '1.2K'
 *   |n| < 1_000_000_000 → 百万単位 + 'M'   例: 1_500_000 → '1.5M'
 *   それ以上           → 十億単位 + 'B'     例: 2_000_000_000 → '2.0B'
 * 小数点第1位まで表示し、.0 は省略しない（一貫性のため）。
 * 負数は先頭に '-' を付ける。
 */
export function abbrev(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs < 1_000) {
    return sign + Math.round(abs).toString();
  }
  if (abs < 1_000_000) {
    return sign + (Math.round(abs / 100) / 10).toFixed(1) + 'K';
  }
  if (abs < 1_000_000_000) {
    return sign + (Math.round(abs / 100_000) / 10).toFixed(1) + 'M';
  }
  return sign + (Math.round(abs / 100_000_000) / 10).toFixed(1) + 'B';
}

/* ------------------------------------------------------------------ signedPct
 * 乗数を符号付きパーセント文字列に変換する（基準値 = 1）。
 *   1.25 → '+25%'
 *   0.80 → '-20%'
 *   1.00 → '+0%'
 * 最近接整数に丸める。
 */
export function signedPct(mul: number): string {
  const pctVal = Math.round((mul - 1) * 100);
  const sign = pctVal >= 0 ? '+' : '';
  return sign + pctVal.toString() + '%';
}

/* ------------------------------------------------------------------ pct
 * 割合 frac を [0, 1] にクランプして整数パーセント文字列を返す。
 *   0.0 → '0%'
 *   0.5 → '50%'
 *   1.0 → '100%'
 *   -0.1 → '0%'（クランプ）
 *   1.5  → '100%'（クランプ）
 */
export function pct(frac: number): string {
  const clamped = Math.max(0, Math.min(1, frac));
  return Math.round(clamped * 100).toString() + '%';
}

/* ------------------------------------------------------------------ clampInt
 * n を floor してから [lo, hi] にクランプした整数を返す。
 *   clampInt(3.9, 0, 5)  → 3
 *   clampInt(-1, 0, 5)   → 0
 *   clampInt(10, 0, 5)   → 5
 */
export function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}
