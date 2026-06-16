/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: difficulty & economy balance
 *
 * 難易度設定と経済モデルの純粋ロジックと定数。
 * 副作用なし・外部ライブラリなし・TypeScript strict モード準拠。
 * ========================================================================== */

/* ---------------------------------------------------------------- 難易度タイプ */
export type Difficulty = 'gentle' | 'standard' | 'harsh';

export interface DifficultyDef {
  id: Difficulty;
  label: string;         // 表示名（日本語）
  desc: string;          // 短い説明（日本語）
  enemyHpMul: number;    // 敵HPへの乗数
  enemyPowerMul: number; // 敵攻撃力への乗数
  startGold: number;     // 開始時の追加ゴールド
  rewardMul: number;     // 波クリア報酬への乗数
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  gentle: {
    id: 'gentle',
    label: 'やさしい',
    desc: '敵が弱く報酬も多め。はじめてのプレイに。',
    enemyHpMul: 0.75,
    enemyPowerMul: 0.75,
    startGold: 6,
    rewardMul: 1.25,
  },
  standard: {
    id: 'standard',
    label: '標準',
    desc: '設計通りのバランス。正規の難易度。',
    enemyHpMul: 1.0,
    enemyPowerMul: 1.0,
    startGold: 0,
    rewardMul: 1.0,
  },
  harsh: {
    id: 'harsh',
    label: '苛烈',
    desc: '敵が大幅に強化され、高い報酬で制圧せよ。',
    enemyHpMul: 1.4,
    enemyPowerMul: 1.3,
    startGold: 0,
    rewardMul: 1.5,
  },
};

export const DIFFICULTY_LIST: DifficultyDef[] = Object.values(DIFFICULTIES);

/* ------------------------------------------------------------------ リロールコスト */
// 同一プレップ内で rerolls 回リロールした後の次回コストを返す。
// コストは回数が増えるほど段階的に上昇し、base を下回らない。
export function rerollCost(base: number, rerolls: number): number {
  return base + Math.floor(rerolls / 2);
}

/* ------------------------------------------------------------------ 波クリア報酬 */
// wave 番目のウェーブをクリアしたときに得られるゴールドを返す。
export function waveReward(wave: number, mode: Difficulty): number {
  const { rewardMul } = DIFFICULTIES[mode];
  return Math.round((5 + wave) * rewardMul);
}

/* ------------------------------------------------------------------ 敵スケール */
// 基礎HPに難易度乗数を適用し、最低値 1 を保証する。
export function scaledEnemyHp(baseHp: number, mode: Difficulty): number {
  return Math.max(1, Math.round(baseHp * DIFFICULTIES[mode].enemyHpMul));
}

// 基礎攻撃力に難易度乗数を適用し、最低値 1 を保証する。
export function scaledEnemyPower(basePower: number, mode: Difficulty): number {
  return Math.max(1, Math.round(basePower * DIFFICULTIES[mode].enemyPowerMul));
}
