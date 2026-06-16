/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: ガチャ（召喚）レイヤー
 *
 * スターダスト（メタ通貨）を消費して器具と遺物を永久アンロックする純粋ロジック。
 * 乱数を使う関数は rng を差し替え可能にしてテスト可能性を担保する。
 * ピティ保証により PITY 回連続で高レアが出なければ次の1回を確定させる。
 * ========================================================================== */

import { TypeId, TYPES } from './engine';
import { RelicId, RELIC_LIST } from './relics';

/* ---------------------------------------------------------------- 定数 */

/** スターダスト消費量（1回の召喚コスト） */
export const PULL_COST = 5;

/** ピティ上限（累積カウントがこの値に達したとき高価値確定） */
export const PITY = 10;

/* ---------------------------------------------------------------- 型定義 */

/** 召喚結果の種別 */
export type PullKind = 'instrument' | 'relic';

/** 1回の召喚結果 */
export interface Pull {
  kind: PullKind;
  /** kind === 'instrument' のとき設定 */
  instrument?: TypeId;
  /** kind === 'relic' のとき設定 */
  relic?: RelicId;
  /** レアリティ文字列（'common' | 'rare' | 'astral'） */
  rarity: string;
}

/* ---------------------------------------------------------------- 内部定数 */

// 器具 TypeId 全一覧（ TypeId の全キー）
const TYPE_IDS: TypeId[] = Object.keys(TYPES) as TypeId[];

// レアリティ別に分類した器具リスト
const INSTRUMENT_BY_RARITY: Record<string, TypeId[]> = {
  common: TYPE_IDS.filter((id) => TYPES[id].rarity === 'common'),
  rare: TYPE_IDS.filter((id) => TYPES[id].rarity === 'rare'),
  astral: TYPE_IDS.filter((id) => TYPES[id].rarity === 'astral'),
};

// 遺物 RelicId 全一覧
const RELIC_IDS: RelicId[] = RELIC_LIST.map((r) => r.id);

/* ---------------------------------------------------------------- 内部ヘルパー */

/** 配列からランダムに1要素を選ぶ（rng ベース） */
function pickOne<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * 通常（ピティ未到達）の器具を重み付き確率で抽選する。
 * common: 60%、rare: 30%、astral: 10%
 */
function rollInstrumentNormal(rng: () => number): Pull {
  const r = rng(); // 0-1
  let rarity: string;
  if (r < 0.6) {
    rarity = 'common';
  } else if (r < 0.9) {
    rarity = 'rare';
  } else {
    rarity = 'astral';
  }
  const instrument = pickOne(INSTRUMENT_BY_RARITY[rarity], rng);
  return { kind: 'instrument', instrument, rarity };
}

/** 高価値確定時の召喚（遺物 50% / astral 器具 50%） */
function rollHighValue(rng: () => number): Pull {
  if (rng() < 0.5) {
    // 遺物確定
    const relic = pickOne(RELIC_IDS, rng);
    return { kind: 'relic', relic, rarity: 'astral' };
  } else {
    // astral 器具確定
    const instrument = pickOne(INSTRUMENT_BY_RARITY['astral'], rng);
    return { kind: 'instrument', instrument, rarity: 'astral' };
  }
}

/* ---------------------------------------------------------------- 公開関数 */

/**
 * 1回の召喚結果を返す純粋関数。
 *
 * @param rng  乱数生成器（0 以上 1 未満の値を返す）
 * @param pity 現在のピティカウンタ（0 起点）
 * @returns    有効な Pull オブジェクト
 *
 * 通常確率: 器具 70% / 遺物 30%。
 * pity + 1 >= PITY のとき高価値確定（遺物 または astral 器具）。
 */
export function rollPull(rng: () => number, pity: number): Pull {
  // ピティ到達チェック
  if (pity + 1 >= PITY) {
    return rollHighValue(rng);
  }

  const r = rng(); // 0-1: 器具 70% / 遺物 30%
  if (r < 0.7) {
    return rollInstrumentNormal(rng);
  } else {
    // 遺物抽選
    const relic = pickOne(RELIC_IDS, rng);
    return { kind: 'relic', relic, rarity: 'astral' };
  }
}

/**
 * 次のピティカウンタを計算する純粋関数。
 *
 * 高価値 pull（遺物 または astral 器具）ならカウンタをリセット、
 * それ以外は +1 して返す。
 *
 * @param pity 現在のピティカウンタ
 * @param pull 直前の召喚結果
 */
export function nextPity(pity: number, pull: Pull): number {
  const isHighValue =
    pull.kind === 'relic' || (pull.kind === 'instrument' && pull.rarity === 'astral');
  return isHighValue ? 0 : pity + 1;
}

/**
 * スターダストが召喚に足りるかどうか判定する純粋関数。
 *
 * @param dust 現在のスターダスト残量
 */
export function canPull(dust: number): boolean {
  return dust >= PULL_COST;
}
