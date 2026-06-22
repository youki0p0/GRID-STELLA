// GRID STELLA — ARENA :: bag (observation board) geometry & placement.
import { GRID_H, GRID_W, footprint, itemById } from './data';
import type { Item, PlacedItem } from './types';

export interface Cell {
  x: number;
  y: number;
}

/** Cells occupied by a placed item. */
export function cellsOf(p: PlacedItem): Cell[] {
  const it = itemById(p.key);
  if (!it) return [];
  const { w, h } = footprint(it, p.rot);
  const out: Cell[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: p.x + dx, y: p.y + dy });
  return out;
}

const key = (x: number, y: number) => `${x},${y}`;

/** Map of occupied cell -> placed-item id (optionally ignoring one item). */
export function occupancy(board: PlacedItem[], ignoreId?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of board) {
    if (p.id === ignoreId) continue;
    for (const c of cellsOf(p)) m.set(key(c.x, c.y), p.id);
  }
  return m;
}

/** Can item `it` be placed at (x,y) with rotation `rot` on the board? */
export function canPlace(board: PlacedItem[], it: Item, x: number, y: number, rot: 0 | 1, ignoreId?: string): boolean {
  const { w, h } = footprint(it, rot);
  if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) return false;
  const occ = occupancy(board, ignoreId);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (occ.has(key(x + dx, y + dy))) return false;
  return true;
}

/** First free position (row-major) where the item fits; null if none. */
export function firstFit(board: PlacedItem[], it: Item, rot: 0 | 1 = 0): { x: number; y: number; rot: 0 | 1 } | null {
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (canPlace(board, it, x, y, rot)) return { x, y, rot };
      const alt: 0 | 1 = rot === 0 ? 1 : 0;
      if (canPlace(board, it, x, y, alt)) return { x, y, rot: alt };
    }
  return null;
}

/** True if items a and b share an edge (4-neighbour adjacency between footprints). */
export function adjacent(a: PlacedItem, b: PlacedItem): boolean {
  const ca = cellsOf(a);
  const cb = new Set(cellsOf(b).map((c) => key(c.x, c.y)));
  for (const c of ca) {
    if (cb.has(key(c.x + 1, c.y)) || cb.has(key(c.x - 1, c.y)) || cb.has(key(c.x, c.y + 1)) || cb.has(key(c.x, c.y - 1))) return true;
  }
  return false;
}

/** True if a and b overlap any row / column (for row/col scoped auras). */
export function sharesRow(a: PlacedItem, b: PlacedItem): boolean {
  const ra = new Set(cellsOf(a).map((c) => c.y));
  return cellsOf(b).some((c) => ra.has(c.y));
}
export function sharesCol(a: PlacedItem, b: PlacedItem): boolean {
  const ca = new Set(cellsOf(a).map((c) => c.x));
  return cellsOf(b).some((c) => ca.has(c.x));
}
