/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 星屑メタ進行（prestige）
 *
 * ランをまたいで蓄積する「星屑（star dust）」と永続アップグレードの純粋ロジック。
 * 副作用なし・テスト可能。UI 側が localStorage への読み書きを担う。
 * ========================================================================== */

/* ---------------------------------------------------------- MetaUpgradeId */
export type MetaUpgradeId = 'might' | 'fortune' | 'vitality' | 'haste';

/* --------------------------------------------------------------- MetaState */
export interface MetaState {
  dust: number;
  levels: Record<MetaUpgradeId, number>;
}

export const DEFAULT_META: MetaState = {
  dust: 0,
  levels: { might: 0, fortune: 0, vitality: 0, haste: 0 },
};

/* ------------------------------------------------- シリアライズ / パース */

/** MetaState を JSON 文字列に変換する。 */
export function serializeMeta(m: MetaState): string {
  return JSON.stringify(m);
}

/**
 * JSON 文字列（または null）から MetaState を復元する。
 * フィールドが欠損・不正な場合は DEFAULT_META の値にフォールバック。
 * 負数は 0 にクランプ。例外は絶対に投げない。
 */
export function parseMeta(raw: string | null): MetaState {
  if (raw === null) return { ...DEFAULT_META, levels: { ...DEFAULT_META.levels } };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_META, levels: { ...DEFAULT_META.levels } };
    }
    const obj = parsed as Record<string, unknown>;

    const dust =
      typeof obj['dust'] === 'number' && isFinite(obj['dust'])
        ? Math.max(0, Math.floor(obj['dust']))
        : DEFAULT_META.dust;

    const rawLevels =
      typeof obj['levels'] === 'object' && obj['levels'] !== null
        ? (obj['levels'] as Record<string, unknown>)
        : {};

    const ids: MetaUpgradeId[] = ['might', 'fortune', 'vitality', 'haste'];
    const levels = {} as Record<MetaUpgradeId, number>;
    for (const id of ids) {
      const v = rawLevels[id];
      levels[id] =
        typeof v === 'number' && isFinite(v)
          ? Math.max(0, Math.floor(v))
          : DEFAULT_META.levels[id];
    }

    return { dust, levels };
  } catch {
    return { ...DEFAULT_META, levels: { ...DEFAULT_META.levels } };
  }
}

/* ---------------------------------------------------------- MetaUpgrade 定義 */
export interface MetaUpgrade {
  id: MetaUpgradeId;
  icon: string;
  name: string;
  desc: string;
  maxLevel: number;
}

export const META_UPGRADES: Record<MetaUpgradeId, MetaUpgrade> = {
  might: {
    id: 'might',
    icon: '⚔️',
    name: '星力（Might）',
    desc: 'ランの攻撃力をレベルごとに +8% 増強する',
    maxLevel: 10,
  },
  fortune: {
    id: 'fortune',
    icon: '✨',
    name: '星運（Fortune）',
    desc: 'ラン開始時のゴールドをレベルごとに +3 増やす',
    maxLevel: 10,
  },
  vitality: {
    id: 'vitality',
    icon: '💫',
    name: '星命（Vitality）',
    desc: '最大 HP をレベルごとに +10 増加させる',
    maxLevel: 10,
  },
  haste: {
    id: 'haste',
    icon: '🌟',
    name: '星速（Haste）',
    desc: '射撃間隔をレベルごとに ×0.96 短縮する（下限 0.5）',
    maxLevel: 10,
  },
};

/** 順序保証付きリスト。UI のレンダリングや length チェックに使う。 */
export const META_LIST: MetaUpgrade[] = [
  META_UPGRADES.might,
  META_UPGRADES.fortune,
  META_UPGRADES.vitality,
  META_UPGRADES.haste,
];

/* ------------------------------------------------------- コスト・購入ロジック */

/**
 * 指定アップグレードの次レベル購入コスト（星屑）。
 * コストはレベルが上がるほど増加：base 3 + level * 2。
 */
export function upgradeCost(id: MetaUpgradeId, level: number): number {
  // id は将来の個別調整のために受け取っておく（現在は共通式）
  void id;
  return 3 + level * 2;
}

/** 購入可能かチェック：星屑が足りており、maxLevel 未満であること。 */
export function canBuy(meta: MetaState, id: MetaUpgradeId): boolean {
  const level = meta.levels[id];
  const max = META_UPGRADES[id].maxLevel;
  if (level >= max) return false;
  return meta.dust >= upgradeCost(id, level);
}

/**
 * アップグレードを購入した新しい MetaState を返す。
 * 購入不可の場合は元の meta をそのまま返す（ミューテーションなし）。
 */
export function buyUpgrade(meta: MetaState, id: MetaUpgradeId): MetaState {
  if (!canBuy(meta, id)) return meta;
  const cost = upgradeCost(id, meta.levels[id]);
  return {
    dust: meta.dust - cost,
    levels: { ...meta.levels, [id]: meta.levels[id] + 1 },
  };
}

/* ----------------------------------------------------- 星屑報酬 */

/**
 * ランのスコアから獲得できる星屑数を計算する。
 * floor(score / 1000)、最低 0。
 */
export function dustReward(score: number): number {
  return Math.max(0, Math.floor(score / 1000));
}

/* ----------------------------------------------- MetaBonuses（バフ集約） */
export interface MetaBonuses {
  /** 攻撃倍率（might: +8%/lv、1.0 = 等倍） */
  atkMul: number;
  /** 射撃間隔倍率（haste: ×0.96/lv、下限 0.5） */
  fireMul: number;
  /** ラン開始ゴールドボーナス（fortune: +3/lv） */
  startGold: number;
  /** 最大 HP 増加量（vitality: +10/lv） */
  maxHpBonus: number;
}

/**
 * 現在の MetaState からランへ適用するボーナスを計算する。純粋関数。
 */
export function metaBonuses(meta: MetaState): MetaBonuses {
  const atkMul = 1 + meta.levels.might * 0.08;
  const fireMul = Math.max(0.5, Math.pow(0.96, meta.levels.haste));
  const startGold = meta.levels.fortune * 3;
  const maxHpBonus = meta.levels.vitality * 10;
  return { atkMul, fireMul, startGold, maxHpBonus };
}
