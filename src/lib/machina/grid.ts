// 神楽マキナ Ver0.2 :: TWO-LAYER circuit grid — tile layer (power substrate) +
// item layer (modules placed on top). Power flows from the CORE through
// orthogonally-adjacent TILES; items are powered if they sit on a powered tile.
import { GRID_H, GRID_W, footprint, itemById } from './data';
import type { Item, PlacedItem, PlacedTile, TileBonuses, TileDef, TileKind } from './types';

export interface Cell { x: number; y: number; }

/** The core: the board's power source (tile-layer origin). */
export const CORE: Cell = { x: 0, y: Math.floor(GRID_H / 2) };

const key = (x: number, y: number) => `${x},${y}`;

/* ───────────────────────── tile catalog ───────────────────────── */
export const TILE_DEFS: Record<TileKind, TileDef> = {
  plain: { kind: 'plain', w: 2, h: 2, nameJa: '通常タイル', desc: '効果なし。回路を延ばす土台。' },
  shield: { kind: 'shield', w: 2, h: 2, nameJa: '装甲タイル', desc: '戦闘開始時シールド +18。' },
  clock: { kind: 'clock', w: 1, h: 2, nameJa: 'クロックタイル', desc: '乗せた装置の速度上昇。' },
  battery: { kind: 'battery', w: 1, h: 3, nameJa: 'バッテリータイル', desc: '最大エネルギー +1。' },
  power: { kind: 'power', w: 1, h: 3, nameJa: 'パワータイル', desc: '乗せた装置のクリ率上昇。' },
};

/** Per-tile combat coefficients. */
export const SHIELD_PER_TILE = 18;

/** Footprint of a tile respecting rotation. */
function tileFootprint(kind: TileKind, rot: 0 | 1): { w: number; h: number } {
  const d = TILE_DEFS[kind];
  return rot === 0 ? { w: d.w, h: d.h } : { w: d.h, h: d.w };
}

/* ───────────────────────── geometry ───────────────────────── */
export function itemCells(p: PlacedItem): Cell[] {
  const it = itemById(p.key);
  if (!it) return [];
  const { w, h } = footprint(it, p.rot);
  const out: Cell[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: p.x + dx, y: p.y + dy });
  return out;
}

export function tileCells(t: PlacedTile): Cell[] {
  const { w, h } = tileFootprint(t.kind, t.rot);
  const out: Cell[] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push({ x: t.x + dx, y: t.y + dy });
  return out;
}

function itemOcc(items: PlacedItem[], ignoreId?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of items ?? []) {
    if (p.id === ignoreId) continue;
    for (const c of itemCells(p)) m.set(key(c.x, c.y), p.id);
  }
  return m;
}

function tileOcc(tiles: PlacedTile[], ignoreId?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const t of tiles ?? []) {
    if (t.id === ignoreId) continue;
    for (const c of tileCells(t)) m.set(key(c.x, c.y), t.id);
  }
  return m;
}

/* ───────────────────────── placement ───────────────────────── */
export function canPlaceItem(items: PlacedItem[], it: Item, x: number, y: number, rot: 0 | 1, ignoreId?: string): boolean {
  const { w, h } = footprint(it, rot);
  if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) return false;
  const occ = itemOcc(items, ignoreId);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (occ.has(key(x + dx, y + dy))) return false;
  return true;
}

export function canPlaceTile(tiles: PlacedTile[], kind: TileKind, x: number, y: number, rot: 0 | 1, ignoreId?: string): boolean {
  const { w, h } = tileFootprint(kind, rot);
  if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) return false;
  const occ = tileOcc(tiles, ignoreId);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (occ.has(key(x + dx, y + dy))) return false;
  return true;
}

export function firstFitItem(items: PlacedItem[], it: Item, rot: 0 | 1 = 0): { x: number; y: number; rot: 0 | 1 } | null {
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (canPlaceItem(items, it, x, y, rot)) return { x, y, rot };
      const alt: 0 | 1 = rot === 0 ? 1 : 0;
      if (canPlaceItem(items, it, x, y, alt)) return { x, y, rot: alt };
    }
  return null;
}

export function firstFitTile(tiles: PlacedTile[], kind: TileKind, rot: 0 | 1 = 0): { x: number; y: number; rot: 0 | 1 } | null {
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (canPlaceTile(tiles, kind, x, y, rot)) return { x, y, rot };
      const alt: 0 | 1 = rot === 0 ? 1 : 0;
      if (canPlaceTile(tiles, kind, x, y, alt)) return { x, y, rot: alt };
    }
  return null;
}

/* ───────────────────────── power connectivity (tile layer) ───────────────────────── */
const NEIGHBOURS = (c: Cell): Cell[] => [
  { x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 },
];

/**
 * BFS from the CORE through orthogonally-adjacent tiles. A tile whose footprint
 * touches the core cell (or touches an already-powered tile) is powered.
 */
export function poweredTileIds(tiles: PlacedTile[]): Set<string> {
  const occ = tileOcc(tiles);
  const visited = new Set<string>();
  const powered = new Set<string>();
  const queue: Cell[] = [];
  // seed: the core cell itself and any tile cell orthogonally adjacent to the core
  if (occ.has(key(CORE.x, CORE.y))) queue.push({ ...CORE });
  for (const nb of NEIGHBOURS(CORE)) if (occ.has(key(nb.x, nb.y))) queue.push(nb);
  while (queue.length) {
    const c = queue.shift()!;
    const k = key(c.x, c.y);
    if (visited.has(k)) continue;
    visited.add(k);
    const id = occ.get(k);
    if (!id) continue;
    powered.add(id);
    for (const nb of NEIGHBOURS(c)) if (!visited.has(key(nb.x, nb.y)) && occ.has(key(nb.x, nb.y))) queue.push(nb);
  }
  return powered;
}

/** Cell-key set covered by all powered tiles. */
function poweredTileCellSet(tiles: PlacedTile[]): Set<string> {
  const ids = poweredTileIds(tiles);
  const cells = new Set<string>();
  for (const t of tiles ?? []) if (ids.has(t.id)) for (const c of tileCells(t)) cells.add(key(c.x, c.y));
  return cells;
}

/**
 * An item is powered if ANY of its cells overlaps ANY cell of a powered tile
 * （一部でも乗っていれば通電）.
 */
export function poweredItemIds(tiles: PlacedTile[], items: PlacedItem[]): Set<string> {
  const cells = poweredTileCellSet(tiles);
  const out = new Set<string>();
  for (const p of items ?? []) {
    for (const c of itemCells(p)) {
      if (cells.has(key(c.x, c.y))) { out.add(p.id); break; }
    }
  }
  return out;
}

/* ───────────────────────── aggregated tile bonuses ───────────────────────── */
/** Item ids overlapping any powered tile of the given kinds. */
function itemsOverKind(tiles: PlacedTile[], items: PlacedItem[], kinds: TileKind[]): Set<string> {
  const poweredTiles = poweredTileIds(tiles);
  const cells = new Set<string>();
  for (const t of tiles ?? []) if (poweredTiles.has(t.id) && kinds.includes(t.kind)) for (const c of tileCells(t)) cells.add(key(c.x, c.y));
  const out = new Set<string>();
  for (const p of items ?? []) {
    for (const c of itemCells(p)) {
      if (cells.has(key(c.x, c.y))) { out.add(p.id); break; }
    }
  }
  return out;
}

export function tileBonuses(tiles: PlacedTile[], items: PlacedItem[]): TileBonuses {
  const poweredTiles = poweredTileIds(tiles);
  let maxEnergy = 0;
  let startShield = 0;
  for (const t of tiles ?? []) {
    if (!poweredTiles.has(t.id)) continue;
    if (t.kind === 'battery') maxEnergy += 1;
    if (t.kind === 'shield') startShield += SHIELD_PER_TILE;
  }
  return {
    maxEnergy,
    startShield,
    hasteItemIds: itemsOverKind(tiles, items, ['clock']),
    critItemIds: itemsOverKind(tiles, items, ['power']),
  };
}
