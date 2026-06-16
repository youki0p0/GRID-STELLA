// GRID STELLA — board geometry: footprints, placement validity, synergy ranges.
import { GRID } from './data';
import type { Cell, Item, PlacedItem } from './types';

/** Effective footprint given rotation (odd rotations swap w/h). */
export function dims(item: Item, rot: number): { w: number; h: number } {
  return rot % 2 === 1 ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
}

/** All board cells occupied by a placed item. */
export function cellsOf(placed: PlacedItem): Cell[] {
  const { w, h } = dims(placed.item, placed.rot || 0);
  const out: Cell[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      out.push([placed.x + dx, placed.y + dy]);
    }
  }
  return out;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID && y < GRID;
}

/** Can `item` be placed at (x, y) with `rot`, ignoring a moving item by id? */
export function canPlace(
  item: Item,
  x: number,
  y: number,
  rot: number,
  placed: PlacedItem[],
  ignoreId?: string,
): boolean {
  const { w, h } = dims(item, rot);
  if (x < 0 || y < 0 || x + w > GRID || y + h > GRID) return false;
  const occupied = new Set<string>();
  placed.forEach((p) => {
    if (p.id === ignoreId) return;
    cellsOf(p).forEach(([cx, cy]) => occupied.add(cx + ',' + cy));
  });
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (occupied.has(x + dx + ',' + (y + dy))) return false;
    }
  }
  return true;
}

/** The cells a buff item projects its synergy onto (rotation applied). */
export function synergyCells(placed: PlacedItem): Cell[] {
  const base: Cell[] =
    placed.item.key === 'compass'
      ? [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ] // all 4 neighbours
      : placed.item.key === 'plumb'
        ? [
            [-1, 0],
            [1, 0],
          ] // left / right only
        : [];

  const rot = (placed.rot || 0) % 4;
  const rotate = ([dx, dy]: Cell): Cell => {
    let p: Cell = [dx, dy];
    for (let i = 0; i < rot; i++) p = [-p[1], p[0]]; // 90° CW
    return p;
  };

  return base
    .map(rotate)
    .map(([dx, dy]): Cell => [placed.x + dx, placed.y + dy])
    .filter(([cx, cy]) => inBounds(cx, cy));
}
