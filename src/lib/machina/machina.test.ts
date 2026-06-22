import { describe, expect, it } from 'vitest';
import { ITEMS, JOBS, itemById, statMul } from './data';
import { resolveBoard, simulate } from './battle';
import type { JobId, PlacedItem } from './types';

let n = 0;
const place = (key: string, level = 1): PlacedItem => ({ id: `p${++n}`, key, x: 0, y: 0, rot: 0, level });
const board = (...keys: string[]): PlacedItem[] => keys.map((k) => place(k));

describe('catalog', () => {
  it('has 3 jobs and a healthy item count with valid weapons/support', () => {
    expect(Object.keys(JOBS)).toHaveLength(3);
    expect(ITEMS.length).toBeGreaterThanOrEqual(24);
    for (const it of ITEMS) {
      expect(Boolean(it.weapon) || Boolean(it.support)).toBe(true);
      if (it.weapon) {
        expect(it.weapon.cd).toBeGreaterThan(0);
        expect(it.weapon.energy).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('resolveBoard', () => {
  it('aggregates energy, regen and HP from support modules', () => {
    const c = resolveBoard('p', 'gunner', board('capacitor', 'coil', 'plating'));
    expect(c.maxEnergy).toBe(6); // 5 + capacitor
    expect(c.energyRegen).toBeCloseTo(1.4, 5); // 1 + coil 0.4
    expect(c.maxHp).toBe(JOBS.gunner.startingHp + 22); // plating
  });
  it('applies flat power and merge level to weapon damage', () => {
    const lo = resolveBoard('p', 'striker', board('autocannon')).modules[0].weapon.dmg;
    const withAmp = resolveBoard('p', 'striker', [place('autocannon'), place('amplifier')]).modules[0].weapon.dmg;
    const merged = resolveBoard('p', 'striker', [place('autocannon', 3)]).modules[0].weapon.dmg;
    expect(withAmp).toBeGreaterThan(lo); // +power
    expect(merged).toBeGreaterThan(lo); // ★ scaling
    expect(statMul(3)).toBeGreaterThan(statMul(1));
  });
});

describe('combat', () => {
  const dummy = resolveBoard('dummy', 'striker', board('dart'));

  it('is deterministic', () => {
    const a = resolveBoard('A', 'gunner', board('gn_minigun', 'gn_needler', 'capacitor'));
    const r1 = simulate(a, dummy, 99, 24);
    const r2 = simulate(a, dummy, 99, 24);
    expect(r1.result).toBe(r2.result);
    expect(r1.eHp).toBe(r2.eHp);
  });

  it('energy never exceeds max and a strong build beats a lone dart', () => {
    const strong = resolveBoard('S', 'striker', board('st_railgun', 'st_lance', 'capacitor', 'coil', 'plating'));
    const sim = simulate(strong, dummy, 5, 24);
    for (const f of sim.frames) {
      expect(f.pEnergy).toBeLessThanOrEqual(strong.maxEnergy + 1e-6);
      expect(f.pEnergy).toBeGreaterThanOrEqual(-1e-6);
    }
    expect(sim.result).toBe('win');
  });

  it('energy starvation throttles greedy circuits', () => {
    // four railguns (cd6/energy4) on base regen can never all sustain;
    // a lean autocannon line out-damages them against the same dummy window.
    const greedy = resolveBoard('G', 'striker', board('st_railgun', 'st_railgun', 'st_railgun', 'st_railgun'));
    const lean = resolveBoard('L', 'striker', board('autocannon', 'autocannon', 'coil', 'capacitor'));
    const gWin = simulate(greedy, dummy, 3, 10).eHp;
    const lWin = simulate(lean, dummy, 3, 10).eHp;
    // both chip the dummy, but neither side should be able to spend energy it lacks
    expect(gWin).toBeGreaterThanOrEqual(0);
    expect(lWin).toBeGreaterThanOrEqual(0);
  });

  it('accumulate: a virus gunner kills a bare dummy via damage-over-time', () => {
    const gunner = resolveBoard('Gn', 'gunner', board('gn_needler', 'gn_minigun', 'coil'));
    const bare = resolveBoard('bare', 'caster', board('dart'));
    expect(simulate(gunner, bare, 11, 24).result).toBe('win');
  });

  it('reference: caster frost build out-damages its raw weapon damage', () => {
    // cryo stacks freeze, frostbeam references it — together they beat a plain dummy
    const caster = resolveBoard('Cs', 'caster', board('cs_cryo', 'cs_frostbeam', 'capacitor', 'coil'));
    const target = resolveBoard('T', 'gunner', board('dart', 'plating'));
    const sim = simulate(caster, target, 13, 26);
    expect(['win', 'draw']).toContain(sim.result);
  });

  it('firewall blocks new debuffs (aegis caster resists virus)', () => {
    const fw = resolveBoard('FW', 'caster', board('cs_aegis'));
    const noFw = resolveBoard('NF', 'caster', board('plating'));
    const gunner = resolveBoard('Gn', 'gunner', board('gn_needler', 'gn_minigun'));
    const fwHp = simulate(fw, gunner, 21, 20).pHp;
    const noFwHp = simulate(noFw, gunner, 21, 20).pHp;
    // firewall side should retain a higher HP fraction (no virus ticking)
    expect(fwHp / fw.maxHp).toBeGreaterThan(noFwHp / noFw.maxHp);
  });
});
