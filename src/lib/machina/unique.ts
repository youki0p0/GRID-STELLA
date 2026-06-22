// 神楽マキナ — 機械神の回路 :: build-defining unique picks (R5), 3 per job (Ver0.2).
import type { Item, JobId } from './types';
import { ITEM_MAP } from './data';

export const UNIQUE_POOL: Record<JobId, string[]> = {
  striker: ['st_uq_godcannon', 'st_uq_overdrive', 'st_uq_arcfist'],
  gunner: ['gn_uq_virusstorm', 'gn_uq_jamgrid', 'gn_uq_feedloop'],
  caster: ['cs_uq_freezeengine', 'cs_uq_voidsink', 'cs_uq_godaegis'],
};

export function uniqueChoices(job: JobId): Item[] {
  return UNIQUE_POOL[job]
    .map((key) => ITEM_MAP[key])
    .filter((it): it is Item => Boolean(it));
}
