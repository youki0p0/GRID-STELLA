/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: gem (宝石) system
 *
 * 宝石の定義・ボーナス計算・永続化の純粋ロジック層。
 * 副作用なし・外部ライブラリ不使用。永続化は呼び出し側が担う。
 * ========================================================================== */

import { type EquipBonuses } from './equip';

/* ---------------------------------------------------------------- 宝石種別 */

/**
 * 宝石の種類。
 *   ruby     … ルビー: 攻撃力強化
 *   sapphire … サファイア: 連射速度強化（間隔短縮）
 *   topaz    … トパーズ: 射程延伸
 *   emerald  … エメラルド: 開始所持金増加
 *   amethyst … アメジスト: ダストドロップ倍率増加
 */
export type GemKind = 'ruby' | 'sapphire' | 'topaz' | 'emerald' | 'amethyst';

/* ---------------------------------------------------------------- 宝石定義 */

/** 宝石種別の静的定義。 */
export interface GemDef {
  kind: GemKind;
  icon: string;
  name: string;
}

/** 全宝石種別の定義マップ。 */
export const GEMS: Record<GemKind, GemDef> = {
  // ルビー: 攻撃倍率ボーナス
  ruby: { kind: 'ruby', icon: '🔴', name: 'ルビー' },
  // サファイア: 連射間隔短縮（fireMul を下げる）
  sapphire: { kind: 'sapphire', icon: '🔵', name: 'サファイア' },
  // トパーズ: 射程加算ボーナス
  topaz: { kind: 'topaz', icon: '🟡', name: 'トパーズ' },
  // エメラルド: ラン開始時の追加所持金
  emerald: { kind: 'emerald', icon: '🟢', name: 'エメラルド' },
  // アメジスト: ダストドロップ倍率増加
  amethyst: { kind: 'amethyst', icon: '🟣', name: 'アメジスト' },
};

/** 全宝石種別の一覧（順序固定）。 */
export const GEM_KINDS: GemKind[] = ['ruby', 'sapphire', 'topaz', 'emerald', 'amethyst'];

/* ---------------------------------------------------------------- 宝石インスタンス */

/** 所持している宝石1個。tier は 1〜MAX_TIER。 */
export interface Gem {
  id: string;
  kind: GemKind;
  tier: number;
}

/** 宝石のティア上限。 */
export const MAX_TIER = 3;

/** 宝石1個を購入するのに必要なスターダスト量。 */
export const GEM_COST = 6;

/* ---------------------------------------------------------------- ボーナス計算 */

/**
 * 宝石1個が付与するボーナスを計算して返す。
 * tier（1〜3）に比例してボーナスが増加する。
 *
 *   ruby     … atkMul     +0.04 × tier（攻撃倍率加算）
 *   sapphire … fireMul    = 1 − 0.03 × tier（連射間隔短縮; < 1 で高速化）
 *   topaz    … rangeBonus +0.15 × tier（射程加算）
 *   emerald  … startGold  +3 × tier（開始所持金加算）
 *   amethyst … dustMul    = 1 + 0.05 × tier（ダスト倍率; > 1 で増加）
 */
export function gemBonus(gem: Gem): Partial<EquipBonuses> {
  const { kind, tier } = gem;
  switch (kind) {
    case 'ruby':
      // 攻撃倍率: ベース 1.0 に +0.04×tier を加算する。
      return { atkMul: 1 + 0.04 * tier };
    case 'sapphire':
      // 連射間隔倍率: 1 − 0.03×tier（tier1=0.97, tier2=0.94, tier3=0.91）。
      return { fireMul: 1 - 0.03 * tier };
    case 'topaz':
      // 射程加算: +0.15×tier セル。
      return { rangeBonus: 0.15 * tier };
    case 'emerald':
      // 開始所持金加算: +3×tier G。
      return { startGold: 3 * tier };
    case 'amethyst':
      // ダスト倍率: 1 + 0.05×tier（tier1=1.05, tier2=1.10, tier3=1.15）。
      return { dustMul: 1 + 0.05 * tier };
  }
}

/* ---------------------------------------------------------------- ラベル */

/**
 * 宝石の短縮ラベルを生成する。
 * 例: 「ルビー★2」
 */
export function gemLabel(gem: Gem): string {
  return `${GEMS[gem.kind].name}★${gem.tier}`;
}

/* ---------------------------------------------------------------- シリアライズ */

/**
 * 宝石リストを JSON 文字列に変換する。
 */
export function serializeGems(list: Gem[]): string {
  return JSON.stringify(list);
}

/** バリデーション用: GemKind の有効値セット。 */
const VALID_GEM_KINDS = new Set<string>(GEM_KINDS);

/**
 * JSON 文字列から宝石リストを復元する。安全な解析: 例外を一切投げない。
 *
 * 検証ルール（違反した宝石は黙って除外）:
 *  - id が文字列であること。
 *  - kind が有効な GemKind であること（無効なものは除外）。
 *  - tier が数値であること（1〜MAX_TIER にクランプ）。
 *
 * 不正な JSON / null 入力の場合は [] を返す。
 */
export function parseGems(raw: string | null): Gem[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const result: Gem[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;

      const id = obj['id'];
      const kind = obj['kind'];
      const tier = obj['tier'];

      if (typeof id !== 'string' || id === '') continue;
      if (typeof kind !== 'string' || !VALID_GEM_KINDS.has(kind)) continue;
      if (typeof tier !== 'number' || !Number.isFinite(tier)) continue;

      // tier を 1〜MAX_TIER にクランプする。
      const clampedTier = Math.min(MAX_TIER, Math.max(1, Math.round(tier)));

      result.push({ id, kind: kind as GemKind, tier: clampedTier });
    }
    return result;
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------------- 検索ユーティリティ */

/**
 * ID で宝石を検索する。見つからない場合は undefined を返す。
 */
export function gemById(list: Gem[], id: string): Gem | undefined {
  return list.find((g) => g.id === id);
}
