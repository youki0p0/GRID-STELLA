// 神楽マキナ Ver0.2 :: adjacency-material fusion. A placed item that is a recipe
// BASE fuses when a recipe MATERIAL sits orthogonally adjacent (footprints share
// an edge). The material is consumed; the base's key becomes the result.
import { itemCells } from './grid';
import { findRecipe } from './recipes';
import type { PlacedItem } from './types';

const key = (x: number, y: number) => `${x},${y}`;

/** Cell-key set of an item's footprint. */
function cellSet(p: PlacedItem): Set<string> {
  const s = new Set<string>();
  for (const c of itemCells(p)) s.add(key(c.x, c.y));
  return s;
}

/** Do two items' footprints share an orthogonal edge? */
function adjacent(a: PlacedItem, b: PlacedItem): boolean {
  const bs = cellSet(b);
  for (const c of itemCells(a)) {
    if (bs.has(key(c.x + 1, c.y)) || bs.has(key(c.x - 1, c.y)) || bs.has(key(c.x, c.y + 1)) || bs.has(key(c.x, c.y - 1))) {
      return true;
    }
  }
  return false;
}

/**
 * For each placed item that is a recipe base with a matching recipe material
 * placed orthogonally adjacent, produce a fusion. Each base/material id is used
 * at most once (greedy in placement order).
 */
export function pendingMerges(items: PlacedItem[]): { baseId: string; materialId: string; result: string }[] {
  const out: { baseId: string; materialId: string; result: string }[] = [];
  const used = new Set<string>();
  for (const base of items) {
    if (used.has(base.id)) continue;
    for (const mat of items) {
      if (mat.id === base.id || used.has(mat.id)) continue;
      const recipe = findRecipe(base.key, mat.key);
      if (!recipe) continue;
      if (!adjacent(base, mat)) continue;
      out.push({ baseId: base.id, materialId: mat.id, result: recipe.result });
      used.add(base.id);
      used.add(mat.id);
      break;
    }
  }
  return out;
}

/**
 * Apply all pending merges: consume each material, replace each base's key with
 * the result (keeping its position and id). Used at shop-phase start.
 */
export function applyMerges(items: PlacedItem[]): { items: PlacedItem[]; fused: { result: string }[] } {
  const merges = pendingMerges(items);
  if (merges.length === 0) return { items, fused: [] };
  const consumed = new Set(merges.map((m) => m.materialId));
  const replace = new Map(merges.map((m) => [m.baseId, m.result]));
  const next: PlacedItem[] = [];
  for (const p of items) {
    if (consumed.has(p.id)) continue;
    const result = replace.get(p.id);
    next.push(result ? { ...p, key: result } : p);
  }
  return { items: next, fused: merges.map((m) => ({ result: m.result })) };
}

/** Ids of bases + materials currently forming a valid adjacency (UI highlight). */
export function mergeCandidateIds(items: PlacedItem[]): Set<string> {
  const out = new Set<string>();
  for (const m of pendingMerges(items)) {
    out.add(m.baseId);
    out.add(m.materialId);
  }
  return out;
}
