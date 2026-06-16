/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: star upgrade math
 *
 * 装備の★強化（スターダスト消費）に関する純粋計算ロジック。
 * 副作用なし・外部ライブラリ不使用・他の merge モジュールへの依存なし。
 * ========================================================================== */

/** 強化の最大★レベル */
export const MAX_STAR = 5;

/**
 * ★レベルに応じた攻撃倍率を返す。
 * 入力は [0, MAX_STAR] にクランプ。
 * 計算式: 1 + 0.15 * clampedStar
 *   star 0 → 1.00, star 5 → 1.75
 */
export function starMul(star: number): number {
  // 入力を [0, MAX_STAR] に制限する
  const clamped = Math.max(0, Math.min(MAX_STAR, star));
  return 1 + 0.15 * clamped;
}

/**
 * star → star+1 にアップグレードするのに必要なスターダスト量を返す。
 * 計算式: 4 + star * 5（コスト列: 4, 9, 14, 19, 24）
 * star >= MAX_STAR の場合は Infinity を返す（これ以上強化不可）。
 */
export function starUpCost(star: number): number {
  if (star >= MAX_STAR) return Infinity;
  return 4 + star * 5;
}

/**
 * ★アップグレード可能かどうかを返す。
 * 条件: star が MAX_STAR 未満 かつ dust が必要コスト以上。
 */
export function canStarUp(star: number, dust: number): boolean {
  return star < MAX_STAR && dust >= starUpCost(star);
}

/**
 * fromStar から toStar までの強化に必要なスターダスト合計を返す。
 * 入力は [0, MAX_STAR] にクランプ。toStar <= fromStar の場合は 0 を返す。
 * 計算: Σ starUpCost(s) for s in [fromStar, toStar)
 */
export function totalStarCost(fromStar: number, toStar: number): number {
  // 入力を [0, MAX_STAR] に制限する
  const from = Math.max(0, Math.min(MAX_STAR, fromStar));
  const to = Math.max(0, Math.min(MAX_STAR, toStar));
  if (to <= from) return 0;
  let total = 0;
  for (let s = from; s < to; s++) {
    total += starUpCost(s);
  }
  return total;
}
