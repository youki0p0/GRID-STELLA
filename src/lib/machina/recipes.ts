// 神楽マキナ — 機械神の回路 :: adjacency-material fusion recipes (Ver0.2).
// Each job grows its startingWeapon through a 3-step chain into a mythic.
import type { Recipe } from './types';

export const RECIPES: Recipe[] = [
  /* ---------- STRIKER: st_breaker -> ... -> st_ragnarok (mythic) ---------- */
  { base: 'st_breaker', material: 'mat_barrel', result: 'st_breaker_mk2' },
  { base: 'st_breaker_mk2', material: 'mat_accel', result: 'st_voltmaul' },
  { base: 'st_voltmaul', material: 'mat_core', result: 'st_ragnarok' },

  /* ---------- GUNNER: gn_minigun -> ... -> gn_apocalypse (mythic) ---------- */
  { base: 'gn_minigun', material: 'mat_barrel', result: 'gn_minigun_mk2' },
  { base: 'gn_minigun_mk2', material: 'mat_accel', result: 'gn_gatling' },
  { base: 'gn_gatling', material: 'mat_core', result: 'gn_apocalypse' },

  /* ---------- CASTER: cs_cryo -> ... -> cs_absolute (mythic) ---------- */
  { base: 'cs_cryo', material: 'mat_barrel', result: 'cs_cryo_mk2' },
  { base: 'cs_cryo_mk2', material: 'mat_accel', result: 'cs_glacier' },
  { base: 'cs_glacier', material: 'mat_core', result: 'cs_absolute' },
];

export function findRecipe(baseKey: string, materialKey: string): Recipe | undefined {
  return RECIPES.find((r) => r.base === baseKey && r.material === materialKey);
}
