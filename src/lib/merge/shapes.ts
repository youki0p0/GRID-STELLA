/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: piece-shape geometry
 *
 * 器具をテトロミノ風の多セルピースに対応させる純粋ジオメトリ層。
 * バックパック風パズルボードの骨格となる。副作用なし・外部ライブラリ不使用。
 * ========================================================================== */

import { type TypeId } from './engine';

/* ---------------------------------------------------------------- セル・回転 */

/** ボード上の1セル位置。[row, col] の順で非負座標 */
export type Cell = readonly [number, number];

/** 時計回りの回転角（度） */
export type Rot = 0 | 90 | 180 | 270;

/* ---------------------------------------------------------------- ピース形状定義 */

/**
 * 各器具タイプのセル配列。
 * - 座標は非負整数、min row = 0 かつ min col = 0 に正規化済み。
 * - needle    : 1セル（単体）
 * - hourglass : 横ドミノ 2セル
 * - compass   : L字トロミノ 3セル
 * - globe     : 2×2 正方形 4セル
 * - telescope : 縦 I字トロミノ 3セル（長い射程を表現）
 * - armillary : T字テトロミノ 4セル
 */
export const SHAPES: Record<TypeId, Cell[]> = {
  needle:    [[0, 0]],
  hourglass: [[0, 0], [0, 1]],
  compass:   [[0, 0], [1, 0], [1, 1]],
  globe:     [[0, 0], [0, 1], [1, 0], [1, 1]],
  telescope: [[0, 0], [1, 0], [2, 0]],
  armillary: [[0, 1], [1, 0], [1, 1], [1, 2]],
};

/* ---------------------------------------------------------------- 正規化 */

/**
 * セル配列を min row = 0 / min col = 0 になるよう平行移動し、
 * (row asc, col asc) でソートして返す。
 * 決定的な同一性比較のために正規形を統一する。
 */
export function normalize(cells: Cell[]): Cell[] {
  if (cells.length === 0) return [];
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted: Cell[] = cells.map(([r, c]) => [r - minR, c - minC]);
  return [...shifted].sort(([r1, c1], [r2, c2]) => r1 !== r2 ? r1 - r2 : c1 - c2);
}

/* ---------------------------------------------------------------- 回転 */

/**
 * スクリーン座標（r 下向き / c 右向き）で時計回りに rot 度回転し、正規化して返す。
 * 90° 変換: [r, c] → [c, -r]
 * 180° 変換: [r, c] → [-r, -c]
 * 270° 変換: [r, c] → [-c, r]
 * rot = 0 の場合は normalize のみ。
 */
export function rotate(cells: Cell[], rot: Rot): Cell[] {
  let transformed: Cell[];
  switch (rot) {
    case 0:
      transformed = cells.map(([r, c]) => [r, c]);
      break;
    case 90:
      // 時計回り90°: [r,c] → [c, -r]
      transformed = cells.map(([r, c]) => [c, -r]);
      break;
    case 180:
      // 時計回り180°: [r,c] → [-r, -c]
      transformed = cells.map(([r, c]) => [-r, -c]);
      break;
    case 270:
      // 時計回り270°: [r,c] → [-c, r]
      transformed = cells.map(([r, c]) => [-c, r]);
      break;
  }
  return normalize(transformed);
}

/* ---------------------------------------------------------------- 寸法 */

/**
 * 正規化後の境界ボックスの幅（列数）と高さ（行数）を返す。
 * 単一セルの場合は w = 1, h = 1。
 */
export function dims(cells: Cell[]): { w: number; h: number } {
  if (cells.length === 0) return { w: 0, h: 0 };
  const norm = normalize(cells);
  const maxR = Math.max(...norm.map(([r]) => r));
  const maxC = Math.max(...norm.map(([, c]) => c));
  return { w: maxC + 1, h: maxR + 1 };
}

/* ---------------------------------------------------------------- フットプリント */

/**
 * ピースを rot 回転してアンカー位置 {r, c} に配置したときの
 * ボード上の絶対セル座標配列を返す。
 * rotate → normalize 後に anchor を加算する。
 */
export function footprint(
  cells: Cell[],
  rot: Rot,
  anchor: { r: number; c: number },
): { r: number; c: number }[] {
  return rotate(cells, rot).map(([dr, dc]) => ({
    r: anchor.r + dr,
    c: anchor.c + dc,
  }));
}

/* ---------------------------------------------------------------- 境界チェック */

/**
 * 絶対座標配列がすべて 0 以上 n-1 以下に収まるか検証する。
 * n はボードの一辺のセル数（正方形ボード）。
 */
export function inBounds(abs: { r: number; c: number }[], n: number): boolean {
  return abs.every(({ r, c }) => r >= 0 && r < n && c >= 0 && c < n);
}

/* ---------------------------------------------------------------- 衝突チェック */

/**
 * 絶対座標配列のいずれかが occupied セットと重なるか検査する。
 * キー形式は `${r},${c}`（cellKey と同形式）。
 */
export function overlaps(
  abs: { r: number; c: number }[],
  occupied: Set<string>,
): boolean {
  return abs.some(({ r, c }) => occupied.has(cellKey(r, c)));
}

/* ---------------------------------------------------------------- 配置可否 */

/**
 * ピースを rot 回転して anchor に置いたとき、
 * ボード内に収まりかつ occupied と重ならない場合に true を返す。
 */
export function canPlace(
  cells: Cell[],
  rot: Rot,
  anchor: { r: number; c: number },
  n: number,
  occupied: Set<string>,
): boolean {
  const abs = footprint(cells, rot, anchor);
  return inBounds(abs, n) && !overlaps(abs, occupied);
}

/* ---------------------------------------------------------------- ユーティリティ */

/** セル座標をキー文字列に変換する（engine.ts の keyOf と同形式）。 */
export const cellKey = (r: number, c: number): string => r + ',' + c;

/**
 * 器具タイプのセル数を返す。
 * ボードのスロット消費計算などに使用。
 */
export function cellCount(t: TypeId): number {
  return SHAPES[t].length;
}
