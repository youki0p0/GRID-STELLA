/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: スコア・ランク・エンドレス倍率
 *
 * 副作用のない純粋関数のみ。ゲーム本体 20 波 (TOTAL_WAVES) を超えた
 * エンドレスモード用の難度スケールと、プレイ結果をスコア・ランクに変換する。
 * ========================================================================== */

import { TOTAL_WAVES } from './engine';

/* ---------------------------------------------------------------- エンドレス倍率 */

/**
 * エンドレスモードの敵 HP 倍率。
 * wave <= TOTAL_WAVES では 1.0 固定。それ以降は波数に比例して滑らかに増加する。
 * 結果は常に 1 以上。
 */
export function endlessHpMul(wave: number): number {
  if (wave <= TOTAL_WAVES) return 1;
  return 1 + (wave - TOTAL_WAVES) * 0.15;
}

/**
 * エンドレスモードの敵 攻撃力 倍率。
 * wave <= TOTAL_WAVES では 1.0 固定。HP より緩やかに増加する。
 * 結果は常に 1 以上。
 */
export function endlessPowerMul(wave: number): number {
  if (wave <= TOTAL_WAVES) return 1;
  return 1 + (wave - TOTAL_WAVES) * 0.08;
}

/* ---------------------------------------------------------------- スコア計算 */

/** スコア計算の入力。 */
export interface ScoreInput {
  wave: number;
  kills: number;
  damage: number; // 敵に与えた総ダメージ
  won: boolean;
}

/**
 * プレイ結果を整数スコアへ変換する純粋関数。
 * - wave が増えるほど単調増加
 * - kills が増えるほど単調増加
 * - damage が増えるほど単調増加
 * - won=true で追加ボーナス
 * 結果は 0 以上の整数。
 */
export function runScore(input: ScoreInput): number {
  const { wave, kills, damage, won } = input;

  // 波数ボーナス（最も重い）
  const wavePoints = Math.max(0, wave) * 500;

  // 撃破ボーナス
  const killPoints = Math.max(0, kills) * 80;

  // ダメージボーナス（スケールダウン）
  const damagePoints = Math.floor(Math.max(0, damage) / 10) * 3;

  // 勝利ボーナス
  const winBonus = won ? 2000 : 0;

  return Math.round(wavePoints + killPoints + damagePoints + winBonus);
}

/* ---------------------------------------------------------------- ランク */

/** スコアに対応する星ランク。 */
export type Rank = 'D' | 'C' | 'B' | 'A' | 'S';

/**
 * ランクの最低スコア閾値（昇順）。
 * min 以上であれば対応 rank が付与される（最後に一致した rank が採用）。
 */
export const RANK_THRESHOLDS: { rank: Rank; min: number }[] = [
  { rank: 'D', min: 0 },
  { rank: 'C', min: 3000 },
  { rank: 'B', min: 7000 },
  { rank: 'A', min: 13000 },
  { rank: 'S', min: 22000 },
];

/**
 * スコアをランクへ変換する。
 * スコアが高いほど上位ランク以上を返す（単調非減少）。
 */
export function starRank(score: number): Rank {
  let result: Rank = 'D';
  for (const t of RANK_THRESHOLDS) {
    if (score >= t.min) result = t.rank;
  }
  return result;
}

/**
 * ランクに対応する短い日本語フレーバーラベルを返す。
 */
export function rankLabel(rank: Rank): string {
  const labels: Record<Rank, string> = {
    D: '見習い観測士',
    C: '星図記録士',
    B: '天測航法士',
    A: '星霜の守護者',
    S: '天体調律者',
  };
  return labels[rank];
}
