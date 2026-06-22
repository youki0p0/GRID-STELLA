// 神楽マキナ :: circuit grid — core, power connectivity & placement geometry.
import { GRID_H, GRID_W, footprint, itemById } from './data';
import type { Item, PlacedItem } from './types';

export interface Cell { x: number; y: number; }

/** The core: the board's power source. Modules must chain back to it. */
export const CORE: Cell = { x: 0, y: Math.floor(GRID_H / 2) };

const key = (x: number, y: number) => `${x},${y}`;

export function cellsOf(p: PlacedItem): Cell[] {
  const it = itemById(p.key);
  if (!it) return [];
  const { w, h } = footprint(it, p.rot);
  const out: Cell[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: p.x + dx, y: p.y + dy });
  return out;
}

export function occupancy(board: PlacedItem[], ignoreId?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of board) {
    if (p.id === ignoreId) continue;
    for (const c of cellsOf(p)) m.set(key(c.x, c.y), p.id);
  }
  return m;
}

export function canPlace(board: PlacedItem[], it: Item, x: number, y: number, rot: 0 | 1, ignoreId?: string): boolean {
  const { w, h } = footprint(it, rot);
  if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) return false;
  // cannot cover the core cell
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (x + dx === CORE.x && y + dy === CORE.y) return false;
  const occ = occupancy(board, ignoreId);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (occ.has(key(x + dx, y + dy))) return false;
  return true;
}

export function firstFit(board: PlacedItem[], it: Item, rot: 0 | 1 = 0): { x: number; y: number; rot: 0 | 1 } | null {
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (canPlace(board, it, x, y, rot)) return { x, y, rot };
      const alt: 0 | 1 = rot === 0 ? 1 : 0;
      if (canPlace(board, it, x, y, alt)) return { x, y, rot: alt };
    }
  return null;
}

/**
 * Flood-fill from the core through orthogonally-adjacent occupied cells.
 * Returns the set of placed-item ids that are powered (connected to the core).
 */
export function poweredIds(board: PlacedItem[]): Set<string> {
  const occ = occupancy(board);
  const visited = new Set<string>(); // cell keys
  const powered = new Set<string>(); // item ids
  // seed: occupied cells orthogonally adjacent to the core
  const queue: Cell[] = [];
  const neighbours = (c: Cell): Cell[] => [
    { x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 },
  ];
  for (const nb of neighbours(CORE)) {
    const id = occ.get(key(nb.x, nb.y));
    if (id) queue.push(nb);
  }
  while (queue.length) {
    const c = queue.shift()!;
    const k = key(c.x, c.y);
    if (visited.has(k)) continue;
    visited.add(k);
    const id = occ.get(k);
    if (!id) continue;
    powered.add(id);
    for (const nb of neighbours(c)) if (!visited.has(key(nb.x, nb.y)) && occ.has(key(nb.x, nb.y))) queue.push(nb);
  }
  return powered;
}

/** The subset of the board that is powered (functions in battle). */
export function poweredBoard(board: PlacedItem[]): PlacedItem[] {
  const ids = poweredIds(board);
  return board.filter((p) => ids.has(p.id));
}
