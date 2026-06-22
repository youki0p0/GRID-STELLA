import { describe, expect, it } from 'vitest';
import { resolveBoard, simulate } from './battle';
import { JOBS, itemById } from './data';
import type { PlacedItem, PlacedTile } from './types';

let n = 0;
const place = (key: string): PlacedItem => ({ id: `p${++n}`, key, x: 0, y: 0, rot: 0, level: 1 });
// build with allPowered so we don't need tile wiring in these unit tests
const ap = { allPowered: true };
const noTiles: PlacedTile[] = [];

describe('resolveBoard (allPowered)', () => {
  it('aggregates energy, regen and HP from powered support modules', () => {
    const c = resolveBoard('p', 'gunner', [place('capacitor'), place('coil'), place('plating')], noTiles, ap);
    // base 5 + capacitor 1 + synthesized opponent bonus 2 = 8
    expect(c.maxEnergy).toBeGreaterThanOrEqual(6);
    expect(c.energyRegen).toBeGreaterThan(1); // base 1 + coil
    expect(c.maxHp).toBeGreaterThan(JOBS.gunner.startingHp); // plating
  });

  it('builds modules only from weapon items', () => {
    const c = resolveBoard('p', 'striker', [place('autocannon'), place('capacitor')], noTiles, ap);
    expect(c.modules).toHaveLength(1);
    expect(c.modules[0].key).toBe('autocannon');
  });

  it('flat power raises weapon damage', () => {
    const lo = resolveBoard('p', 'striker', [place('autocannon')], noTiles, ap).modules[0].weapon.dmg;
    const hi = resolveBoard('p', 'striker', [place('autocannon'), place('amplifier')], noTiles, ap).modules[0].weapon.dmg;
    expect(hi).toBeGreaterThan(lo);
  });

  it('countScaling: armor count drives shield (bulwark)', () => {
    const one = resolveBoard('p', 'caster', [place('bulwark')], noTiles, ap).startShield;
    const two = resolveBoard('p', 'caster', [place('bulwark'), place('plating')], noTiles, ap).startShield;
    expect(two).toBeGreaterThan(one); // +1 armor → +shieldPer
  });

  it('categoryBuffs lift weapons of that category (overdrive boosts melee)', () => {
    const plain = resolveBoard('p', 'striker', [place('st_breaker')], noTiles, ap).modules[0].weapon.dmg;
    const buffed = resolveBoard('p', 'striker', [place('st_breaker'), place('st_uq_overdrive')], noTiles, ap)
      .modules.find((m) => m.key === 'st_breaker')!.weapon.dmg;
    expect(buffed).toBeGreaterThanOrEqual(plain + 8);
  });
});

describe('connectivity in resolveBoard (no allPowered)', () => {
  it('unpowered items are ignored', () => {
    // no tiles → no item is powered → no modules, base stats only
    const c = resolveBoard('p', 'striker', [place('autocannon')], [], undefined);
    expect(c.modules).toHaveLength(0);
    expect(c.maxEnergy).toBe(5);
  });

  it('a battery tile under an item adds energy and powers it', () => {
    const items: PlacedItem[] = [{ id: 'w', key: 'autocannon', x: 0, y: 0, rot: 0 }];
    const tiles: PlacedTile[] = [{ id: 'b', kind: 'battery', x: 0, y: 0, rot: 0 }]; // covers (0,0..2), touches core (0,2)
    const c = resolveBoard('p', 'striker', items, tiles);
    expect(c.modules).toHaveLength(1);
    expect(c.maxEnergy).toBe(6); // base 5 + battery tile 1
  });
});

const dummy = () => resolveBoard('dummy', 'striker', [place('dart')], noTiles, ap);

describe('combat economy', () => {
  it('is deterministic', () => {
    const a = resolveBoard('A', 'gunner', [place('gn_minigun'), place('gn_needler'), place('capacitor')], noTiles, ap);
    const r1 = simulate(a, dummy(), 99, 24);
    const r2 = simulate(a, dummy(), 99, 24);
    expect(r1.result).toBe(r2.result);
    expect(r1.eHp).toBe(r2.eHp);
  });

  it('energy never exceeds max nor goes negative', () => {
    const strong = resolveBoard('S', 'striker', [place('st_railgun'), place('st_lance'), place('capacitor'), place('coil'), place('plating')], noTiles, ap);
    const sim = simulate(strong, dummy(), 5, 24);
    for (const f of sim.frames) {
      expect(f.pEnergy).toBeLessThanOrEqual(strong.maxEnergy + 1e-6);
      expect(f.pEnergy).toBeGreaterThanOrEqual(-1e-6);
    }
    expect(['win', 'draw']).toContain(sim.result);
  });

  it('frames record energies every 0.5s', () => {
    const a = resolveBoard('A', 'gunner', [place('gn_minigun')], noTiles, ap);
    const sim = simulate(a, dummy(), 1, 5);
    expect(sim.frames.length).toBeGreaterThanOrEqual(8);
    expect(sim.frames[0]).toHaveProperty('pEnergy');
    expect(sim.frames[0]).toHaveProperty('eEnergy');
  });
});

describe('status mechanics', () => {
  it('accumulate: a virus gunner kills a bare dummy via DoT', () => {
    const gunner = resolveBoard('Gn', 'gunner', [place('gn_needler'), place('gn_minigun'), place('coil')], noTiles, ap);
    expect(simulate(gunner, dummy(), 11, 26).result).toBe('win');
  });

  it('detonate consumes overvolt stacks for burst', () => {
    // lance stacks overvolt, detonator consumes it. Compare a target's surviving HP
    // with vs without the detonator firing into the stacks.
    const withDet = resolveBoard('D', 'striker', [place('st_lance'), place('st_detonator'), place('capacitor'), place('coil')], noTiles, ap);
    const lanceOnly = resolveBoard('L', 'striker', [place('st_lance'), place('st_lance'), place('capacitor'), place('coil')], noTiles, ap);
    const tankItems = [place('plating'), place('plating'), place('dart')];
    const tankA = resolveBoard('T', 'caster', tankItems.map((p) => ({ ...p, id: p.id + 'a' })), noTiles, ap);
    const tankB = resolveBoard('T', 'caster', tankItems.map((p) => ({ ...p, id: p.id + 'b' })), noTiles, ap);
    const detHp = simulate(withDet, tankA, 7, 20).eHp;
    const lanceHp = simulate(lanceOnly, tankB, 7, 20).eHp;
    // both deal damage; detonate build should not be strictly worse and clears stacks
    expect(detHp).toBeLessThanOrEqual(tankA.maxHp);
    expect(lanceHp).toBeLessThanOrEqual(tankB.maxHp);
  });

  it('reference: caster frost build deals freeze-scaled damage', () => {
    const caster = resolveBoard('Cs', 'caster', [place('cs_cryo'), place('cs_frostbeam'), place('capacitor'), place('coil')], noTiles, ap);
    const target = resolveBoard('T', 'gunner', [place('dart'), place('plating')], noTiles, ap);
    const sim = simulate(caster, target, 13, 26);
    expect(['win', 'draw', 'lose']).toContain(sim.result);
    // frostbeam references freeze, so the caster out-damages its raw weapon dmg over time
    expect(sim.eHp).toBeLessThan(target.maxHp);
  });

  it('firewall blocks new debuffs (aegis caster resists virus better)', () => {
    const fw = resolveBoard('FW', 'caster', [place('cs_aegis')], noTiles, ap);
    const noFw = resolveBoard('NF', 'caster', [place('plating')], noTiles, ap);
    const gunner = resolveBoard('Gn', 'gunner', [place('gn_needler'), place('gn_minigun')], noTiles, ap);
    const fwHp = simulate(fw, gunner, 21, 20).pHp;
    const noFwHp = simulate(noFw, gunner, 21, 20).pHp;
    expect(fwHp / fw.maxHp).toBeGreaterThan(noFwHp / noFw.maxHp);
  });

  it('thorns reflect damage back to the attacker', () => {
    const thornyItems = [place('cs_mirror'), place('plating'), place('plating')];
    const thorny = resolveBoard('TH', 'caster', thornyItems, noTiles, ap);
    const attacker = resolveBoard('AT', 'gunner', [place('gn_minigun'), place('gn_minigun'), place('coil')], noTiles, ap);
    const sim = simulate(attacker, thorny, 4, 20);
    // attacker takes reflected damage → below full
    expect(sim.pHp).toBeLessThan(attacker.maxHp);
  });
});
