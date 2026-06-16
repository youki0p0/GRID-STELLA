/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: ultimate skills
 *
 * 必殺ゲージと必殺技の純粋ロジックと定数。
 * ダメージを与えるとゲージが蓄積され、満タンになると必殺技を発動できる。
 * 副作用なし・外部ライブラリ不使用。
 * ========================================================================== */

/* ---------------------------------------------------------------- ゲージ定数 */

/** 必殺ゲージの最大値 */
export const GAUGE_MAX = 100;

/** 1回の攻撃でゲージが増加する量（上限あり） */
export function gaugeGain(damage: number): number {
  // ダメージ量に比例してゲージが増加する。ただし1発あたり最大8に制限。
  const raw = damage * 0.4;
  return Math.min(8, Math.max(0, raw));
}

/** 現在のゲージにダメージ分のゲージを加算する（0〜GAUGE_MAX に丸め） */
export function addGauge(current: number, damage: number): number {
  return Math.min(GAUGE_MAX, Math.max(0, current + gaugeGain(damage)));
}

/** ゲージが満タンで必殺技を発動できるか */
export function isReady(gauge: number): boolean {
  return gauge >= GAUGE_MAX;
}

/* ---------------------------------------------------------------- 必殺技定義 */

export type UltId = 'nova' | 'freeze' | 'mend';

export interface UltDef {
  id: UltId;
  icon: string;
  name: string;
  desc: string;
}

/** 必殺技マスタ（天文観測官の世界観・金黒テーマ） */
export const ULTIMATES: Record<UltId, UltDef> = {
  nova: {
    id: 'nova',
    icon: '✨',
    name: '星霜爆',
    desc: '全敵に大ダメージを与える天体爆発を引き起こす',
  },
  freeze: {
    id: 'freeze',
    icon: '❄️',
    name: '時間停止',
    desc: '観測場の時間を歪め、全敵を数秒間凍結する',
  },
  mend: {
    id: 'mend',
    icon: '🌟',
    name: '観測補填',
    desc: '星の力で観測士のHPを回復する',
  },
};

export const ULT_LIST: UltDef[] = Object.values(ULTIMATES);

/* ---------------------------------------------------------------- 必殺技チューニング定数 */

/** 星霜爆：全敵への固定ダメージ量 */
export const NOVA_DAMAGE = 120;

/** 時間停止：凍結時間（ミリ秒） */
export const FREEZE_MS = 2500;

/** 観測補填：回復HP量 */
export const MEND_HP = 30;
