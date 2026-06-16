/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 連撃（kill-combo）モデル
 *
 * 敵を素早く倒し続けるほどコンボが積み上がり、報酬倍率が上昇する。
 * 副作用のない純粋関数のみを公開する。
 * ========================================================================== */

/** コンボが持続するウィンドウ（ms）。この時間内に次の撃破でコンボが繋がる。 */
export const COMBO_WINDOW_MS = 2500;

/** comboMult が倍率計算に用いる上限カウント。 */
export const COMBO_MAX = 20;

/* ---------------------------------------------------------------- 状態型 */

/** 現在のコンボ状態。 */
export interface ComboState {
  /** 連撃カウント（0 = 非コンボ）。 */
  count: number;
  /** このタイムスタンプ（ms）を過ぎるとコンボが切れる。 */
  until: number;
}

/** 初期・リセット後の空コンボ。 */
export const EMPTY_COMBO: ComboState = { count: 0, until: 0 };

/* ---------------------------------------------------------------- 純粋関数 */

/**
 * 敵を撃破したときに呼び出し、新しいコンボ状態を返す。
 * - now > state.until の場合はコンボ切れとして count=1 から再起動。
 * - ウィンドウ内であれば count+1。
 * - until は常に now + COMBO_WINDOW_MS に更新される。
 */
export function hitCombo(state: ComboState, now: number): ComboState {
  const count = now > state.until ? 1 : state.count + 1;
  return { count, until: now + COMBO_WINDOW_MS };
}

/**
 * フレーム更新時など任意のタイミングで呼び出し、期限切れコンボをリセットする。
 * - now > state.until ならば EMPTY_COMBO を返す。
 * - まだ有効ならば state をそのまま返す。
 */
export function pruneCombo(state: ComboState, now: number): ComboState {
  return now > state.until ? EMPTY_COMBO : state;
}

/**
 * コンボカウントから報酬倍率を算出する。
 * - count <= 0 → 1.0（等倍）
 * - 1 以上 → 1 + min(count, COMBO_MAX) * 0.05
 * - COMBO_MAX（20）到達で最大 2.0 倍（+100%）
 */
export function comboMult(count: number): number {
  if (count <= 0) return 1;
  return 1 + Math.min(count, COMBO_MAX) * 0.05;
}

/**
 * UI 向けのコンボラベル文字列を返す。
 * - count < 3 → null（表示不要）
 * - count >= 3 → `連撃 x{count}`
 */
export function comboLabel(count: number): string | null {
  if (count < 3) return null;
  return `連撃 x${count}`;
}
