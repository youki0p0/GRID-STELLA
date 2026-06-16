// GRID STELLA — resolve board placement into combat stats (synergies applied).
import { cellsOf, synergyCells } from './geometry';
import type { BoardStats, PlacedItem, WeaponStat } from './types';

export function calculateStats(placed: PlacedItem[]): BoardStats {
  const weapons = placed.filter((p) => p.item.type === 'weapon');
  const compasses = placed.filter((p) => p.item.key === 'compass');
  const plumbs = placed.filter((p) => p.item.key === 'plumb');
  const coats = placed.filter((p) => p.item.key === 'coat');

  const occ = (p: PlacedItem) => new Set(cellsOf(p).map(([x, y]) => x + ',' + y));

  const out: WeaponStat[] = weapons.map((wp) => {
    const wCells = occ(wp);
    let attack = wp.item.attack ?? 0;
    let cdMult = 1;

    // Plumb Bob: +2 ATK to weapons in its (L/R) synergy range.
    plumbs.forEach((pb) => {
      if (synergyCells(pb).some(([x, y]) => wCells.has(x + ',' + y))) attack += 2;
    });
    // Compass Rose: ×0.8 cooldown (multiplicative) for weapons in its 4-neighbour range.
    compasses.forEach((cp) => {
      if (synergyCells(cp).some(([x, y]) => wCells.has(x + ',' + y))) cdMult *= 0.8;
    });

    return {
      id: wp.id,
      key: wp.item.key,
      icon: wp.item.icon,
      nameJa: wp.item.nameJa,
      finalAttack: attack,
      finalCooldown: +((wp.item.cooldown ?? 0) * cdMult).toFixed(2),
      buffed: cdMult < 1 || attack > (wp.item.attack ?? 0),
    };
  });

  return {
    maxHp: 100,
    shieldPerTick: coats.length * 4,
    weapons: out,
  };
}
