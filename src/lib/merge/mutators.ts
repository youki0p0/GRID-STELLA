/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: wave mutators
 *
 * 各ウェーブに適用される「変異」（ミューテーター）の定義と選択ロジック。
 * 副作用のない純粋関数のみ。rng を差し替えることでテスト可能。
 * ========================================================================== */

/* ---------------------------------------------------------------- ミューテーターID */
export type MutatorId = 'calm' | 'swarm' | 'heavy' | 'bounty' | 'frenzy' | 'fog';

/* ---------------------------------------------------------------- ミューテーター定義 */
export interface Mutator {
  id: MutatorId;
  icon: string;
  name: string;
  desc: string;
  hpMul: number;    // 敵HPへの乗数
  speedMul: number; // 敵速度への乗数
  rewardMul: number; // 報酬への乗数
}

export const MUTATORS: Record<MutatorId, Mutator> = {
  calm: {
    id: 'calm',
    icon: '🌟',
    name: '静穏',
    desc: '通常の波。特別な変化なし。',
    hpMul: 1,
    speedMul: 1,
    rewardMul: 1,
  },
  swarm: {
    id: 'swarm',
    icon: '🌠',
    name: '星群',
    desc: '敵の移動速度が上昇するが、報酬も増える。',
    hpMul: 1,
    speedMul: 1.3,
    rewardMul: 1.2,
  },
  heavy: {
    id: 'heavy',
    icon: '🪐',
    name: '重力嵐',
    desc: '敵のHPが大幅に増加し、報酬も豊富になる。',
    hpMul: 1.4,
    speedMul: 1,
    rewardMul: 1.3,
  },
  bounty: {
    id: 'bounty',
    icon: '✨',
    name: '天恵',
    desc: '敵の強さは変わらないが、報酬が大幅に増える。',
    hpMul: 1,
    speedMul: 1,
    rewardMul: 1.6,
  },
  frenzy: {
    id: 'frenzy',
    icon: '☄️',
    name: '流星乱舞',
    desc: '敵の速度とHPが共に上昇し、報酬も増加する。',
    hpMul: 1.15,
    speedMul: 1.2,
    rewardMul: 1.35,
  },
  fog: {
    id: 'fog',
    icon: '🌌',
    name: '星霧',
    desc: '霧に紛れた敵はHPと速度がわずかに増し、報酬も少し増える。',
    hpMul: 1.2,
    speedMul: 1.1,
    rewardMul: 1.2,
  },
};

export const MUTATOR_LIST: Mutator[] = Object.values(MUTATORS);

/* ---------------------------------------------------------------- ウェーブ選択 */

// calm 以外のミューテーター一覧。
const NON_CALM: MutatorId[] = (Object.keys(MUTATORS) as MutatorId[]).filter(
  (id) => id !== 'calm',
);

/**
 * ウェーブ番号に応じたミューテーターを返す。
 * - wave <= 2: 常に 'calm'
 * - wave >= 3: calm 以外からランダム選択
 *   ボスウェーブ（wave % 5 === 0）は 'heavy' が選ばれやすい（確率 50%）。
 */
export function mutatorForWave(wave: number, rng: () => number = Math.random): Mutator {
  if (wave <= 2) return MUTATORS.calm;

  // ボスウェーブは 50% の確率で 'heavy' に固定。
  if (wave % 5 === 0 && rng() < 0.5) return MUTATORS.heavy;

  const idx = Math.floor(rng() * NON_CALM.length);
  return MUTATORS[NON_CALM[idx]];
}
