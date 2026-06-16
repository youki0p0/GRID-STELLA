/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 図鑑データ層
 *
 * engine.ts / enemies.ts / skills.ts を改変せず、その上に純粋なデータ変換を追加。
 * 副作用なし・外部ライブラリ不使用。コンポーネント側は CodexEntry[] を受け取るだけでよい。
 * ========================================================================== */

import { TYPE_LIST } from './engine';
import { EXTRA_KIND } from './enemies';
import { ULT_LIST } from './skills';

/* ---------------------------------------------------------------- 共通型 */

/** 図鑑エントリ（アイコン・名前・詳細の表示用セット） */
export interface CodexEntry {
  /** 絵文字アイコン */
  icon: string;
  /** 表示名 */
  name: string;
  /** 詳細テキスト（日本語） */
  detail: string;
}

/* ---------------------------------------------------------------- 器具図鑑 */

/**
 * TYPE_LIST から全器具の図鑑エントリを生成する。
 * detail には atk / range / 連射間隔 / レアリティ / 特徴メモを含める。
 */
export function instrumentCodex(): CodexEntry[] {
  return TYPE_LIST.map((t) => ({
    icon: t.emoji,
    name: t.name,
    detail: `攻撃力: ${t.atk} ／ 射程: ${t.range}セル ／ 連射: ${t.fireMs}ms ／ レアリティ: ${t.rarity} ／ ${t.note}`,
  }));
}

/* ---------------------------------------------------------------- 敵図鑑 */

/** ベース敵種の表示情報（engine.ts の KIND はアイコンを持たないため直接定義） */
const BASE_KIND_ENTRIES: CodexEntry[] = [
  {
    icon: '👁',
    name: '通常歪曲体',
    detail: 'HP倍率: ×1.0 ／ 速度倍率: ×1.0 ／ 標準的な歪曲体',
  },
  {
    icon: '💨',
    name: '高速歪曲体',
    detail: 'HP倍率: ×0.55 ／ 速度倍率: ×1.7 ／ 低耐久・高速の歪曲体',
  },
  {
    icon: '🪨',
    name: '重装歪曲体',
    detail: 'HP倍率: ×2.4 ／ 速度倍率: ×0.62 ／ 高耐久・低速の歪曲体',
  },
  {
    icon: '🌑',
    name: 'ボス歪曲体',
    detail: 'HP倍率: ×11 ／ 速度倍率: ×0.6 ／ 圧倒的な耐久を誇る巨大歪曲体',
  },
];

/**
 * ベース敵種（normal/swift/tank/boss）と拡張敵種（EXTRA_KIND）の図鑑エントリを生成する。
 * detail には HP倍率・速度倍率・特徴メモを含める。
 */
export function enemyCodex(): CodexEntry[] {
  const extraEntries: CodexEntry[] = Object.values(EXTRA_KIND).map((k) => ({
    icon: k.emoji,
    name: k.note,
    detail: `HP倍率: ×${k.hpMul} ／ 速度倍率: ×${k.speedMul} ／ ${k.note}`,
  }));

  return [...BASE_KIND_ENTRIES, ...extraEntries];
}

/* ---------------------------------------------------------------- 必殺技図鑑 */

/**
 * ULT_LIST から全必殺技の図鑑エントリを生成する。
 * detail は desc をそのまま使用する。
 */
export function ultimateCodex(): CodexEntry[] {
  return ULT_LIST.map((u) => ({
    icon: u.icon,
    name: u.name,
    detail: u.desc,
  }));
}

/* ---------------------------------------------------------------- 統合図鑑 */

/**
 * 器具・敵・必殺技の全図鑑をひとつのオブジェクトにまとめて返す。
 */
export function fullCodex(): {
  instruments: CodexEntry[];
  enemies: CodexEntry[];
  ultimates: CodexEntry[];
} {
  return {
    instruments: instrumentCodex(),
    enemies: enemyCodex(),
    ultimates: ultimateCodex(),
  };
}
