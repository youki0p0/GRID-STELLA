/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: ボス修飾子
 *
 * ボス敵に付与される特殊能力（修飾子）の定義と純粋計算関数。
 * 副作用なし。乱数は rng で差し替え可能にしてテスト可能性を担保する。
 * ========================================================================== */

/* ---------------------------------------------------------------- ボス修飾子タイプ */
export type BossMod = 'regen' | 'haste' | 'bulwark';

export interface BossModDef {
  id: BossMod;
  icon: string;
  name: string;
  desc: string;
}

export const BOSS_MODS: Record<BossMod, BossModDef> = {
  regen: {
    id: 'regen',
    icon: '💚',
    name: '再生',
    desc: '毎秒、最大HPの3%を自動回復する。',
  },
  haste: {
    id: 'haste',
    icon: '💨',
    name: '迅速',
    desc: '移動速度が1.4倍に増加する。',
  },
  bulwark: {
    id: 'bulwark',
    icon: '🛡',
    name: '堅牢',
    desc: '受けるダメージを35%軽減する。',
  },
};

export const BOSS_MOD_LIST: BossModDef[] = Object.values(BOSS_MODS);

/* ---------------------------------------------------------------- チューニング定数 */
/** 毎秒回復する割合（最大HPに対する分率）。 */
export const REGEN_FRAC_PER_SEC = 0.03;

/** 迅速時の速度乗数。 */
export const HASTE_MUL = 1.4;

/** 堅牢時に軽減される受ダメージの割合。 */
export const BULWARK_REDUCTION = 0.35;

/* ---------------------------------------------------------------- 修飾子選択 */
/**
 * 波番号と乱数で修飾子をひとつ決定する。
 * ボス波かどうかの判定は呼び出し側の責務。
 */
export function bossModForWave(wave: number, rng: () => number = Math.random): BossMod {
  // wave を使って将来の拡張（波ごとの重みつき抽選など）に備えたシグネチャ。
  void wave;
  const keys = Object.keys(BOSS_MODS) as BossMod[];
  const idx = Math.floor(rng() * keys.length);
  return keys[Math.min(idx, keys.length - 1)];
}

/* ---------------------------------------------------------------- 再生計算 */
/**
 * dt 秒間に回復する HP 量を返す（常に 0 以上）。
 * regenAmount(maxHp, dt) = REGEN_FRAC_PER_SEC * maxHp * dt
 */
export function regenAmount(maxHp: number, dt: number): number {
  return Math.max(0, REGEN_FRAC_PER_SEC * maxHp * dt);
}

/* ---------------------------------------------------------------- 速度計算 */
/**
 * 迅速修飾子なら baseSpeed * HASTE_MUL、それ以外は baseSpeed をそのまま返す。
 */
export function hasteSpeed(baseSpeed: number, mod: BossMod): number {
  return mod === 'haste' ? baseSpeed * HASTE_MUL : baseSpeed;
}

/* ---------------------------------------------------------------- ダメージ透過計算 */
/**
 * 堅牢修飾子時は dmg を (1 - BULWARK_REDUCTION) 倍して丸める。
 * dmg > 0 のとき最低 1 を保証する。それ以外の修飾子では dmg をそのまま返す。
 */
export function damageThrough(dmg: number, mod: BossMod): number {
  if (mod !== 'bulwark') return dmg;
  const reduced = Math.round(dmg * (1 - BULWARK_REDUCTION));
  return dmg > 0 ? Math.max(1, reduced) : reduced;
}
