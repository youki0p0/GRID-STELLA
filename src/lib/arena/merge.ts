// GRID STELLA — ARENA :: merge (combine identical instruments into stronger tiers).
import { MAX_LEVEL } from './data';
import type { PlacedItem } from './types';

export const lvl = (p: PlacedItem): number => p.level ?? 1;

/** Two instruments merge if same key, same level, and below the cap. */
export function canMerge(a: PlacedItem, b: PlacedItem): boolean {
  return a.id !== b.id && a.key === b.key && lvl(a) === lvl(b) && lvl(a) < MAX_LEVEL;
}

/** Result of merging `from` into `target`: target gains a level. */
export function mergedTarget(target: PlacedItem): PlacedItem {
  return { ...target, level: lvl(target) + 1 };
}
