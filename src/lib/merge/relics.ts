/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 遺物（ラン開始時パッシブ）
 *
 * ランの開始時にプレイヤーが選択する遺物を定義する。
 * 各遺物はランを通じて有効な恒久的ステータス補正を付与する。
 * 副作用のない純粋関数とデータのみ。
 * ========================================================================== */

/* ---------------------------------------------------------------- 遺物ID */
export type RelicId =
  | 'lens'
  | 'astrolabe'
  | 'sextant'
  | 'meridian'
  | 'orrery'
  | 'aegis'
  | 'comet'
  | 'ledger';

/* ---------------------------------------------------------------- 遺物定義 */
export interface Relic {
  id: RelicId;
  icon: string;
  name: string;
  desc: string;
}

/* ---------------------------------------------------------------- 遺物効果 */
export interface RelicEffect {
  /** 攻撃力乗数（>1 で増加、例: 1.2 = +20%） */
  atkMul?: number;
  /** 連射間隔乗数（<1 で短縮 = 速射、例: 0.85 = +15% 速射） */
  fireMul?: number;
  /** 射程ボーナス（セル単位加算） */
  rangeBonus?: number;
  /** ラン開始時の追加ゴールド */
  startGold?: number;
  /** 最大HPボーナス */
  maxHpBonus?: number;
  /** 必殺ゲージ蓄積乗数（>1 で速く溜まる） */
  gaugeMul?: number;
  /** 売却額乗数（>1 で高く売れる） */
  sellBonus?: number;
}

/* ---------------------------------------------------------------- 遺物一覧 */
export const RELICS: Record<RelicId, Relic> = {
  lens: {
    id: 'lens',
    icon: '🔬',
    name: '星霜レンズ',
    desc: '全器具の攻撃力が +20%。',
  },
  astrolabe: {
    id: 'astrolabe',
    icon: '🌑',
    name: '黒天アストロラーベ',
    desc: '全器具の連射速度が +15%（連射間隔 -15%）。',
  },
  sextant: {
    id: 'sextant',
    icon: '⚫',
    name: '虚空六分儀',
    desc: '全器具の連射速度が +15%（連射間隔 -15%）。',
  },
  meridian: {
    id: 'meridian',
    icon: '🌐',
    name: '子午線環',
    desc: '全器具の射程が +0.6 セル。',
  },
  orrery: {
    id: 'orrery',
    icon: '🪐',
    name: '天体機械オーラリー',
    desc: '必殺ゲージの蓄積量が +25%。',
  },
  aegis: {
    id: 'aegis',
    icon: '🛡',
    name: '星盾アイギス',
    desc: '最大HP が +20。',
  },
  comet: {
    id: 'comet',
    icon: '☄',
    name: '黒彗星',
    desc: '全器具の攻撃力が +30%。',
  },
  ledger: {
    id: 'ledger',
    icon: '📒',
    name: '星図台帳',
    desc: 'ラン開始時に +6G を獲得し、器具売却額が +50%。',
  },
};

export const RELIC_LIST: Relic[] = Object.values(RELICS);

/* ---------------------------------------------------------------- 効果取得 */
// 遺物IDに対応するステータス補正を返す。
export function relicEffect(id: RelicId): RelicEffect {
  switch (id) {
    case 'lens':
      // 攻撃力 +20%
      return { atkMul: 1.2 };
    case 'astrolabe':
      // 連射間隔 -15%（速射 +15%）
      return { fireMul: 0.85 };
    case 'sextant':
      // 連射間隔 -15%（速射 +15%）
      return { fireMul: 0.85 };
    case 'meridian':
      // 射程 +0.6 セル
      return { rangeBonus: 0.6 };
    case 'orrery':
      // 必殺ゲージ蓄積 +25%
      return { gaugeMul: 1.25 };
    case 'aegis':
      // 最大HP +20
      return { maxHpBonus: 20 };
    case 'comet':
      // 攻撃力 +30%
      return { atkMul: 1.3 };
    case 'ledger':
      // 開始ゴールド +6、売却額 +50%
      return { startGold: 6, sellBonus: 1.5 };
  }
}

/* ---------------------------------------------------------------- 抽選 */
// n 個の重複なし遺物をランダムに選んで返す。
// n が遺物の総数を超える場合は全件を返す。
export function pickRelics(n: number, rng: () => number = Math.random): Relic[] {
  const pool = [...RELIC_LIST];
  const count = Math.min(Math.max(0, n), pool.length);
  const out: Relic[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
