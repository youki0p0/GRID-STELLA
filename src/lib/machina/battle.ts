// 神楽マキナ Ver0.2 :: deterministic circuit auto-battle (energy economy + shared
// statuses + two-layer tile bonuses).
import { makeRng } from '../arena/rng';
import { JOBS, itemById } from './data';
import { poweredItemIds, tileBonuses } from './grid';
import {
  CRASH_DURATION,
  EMPTY_STATUS,
  FREEZE_CAP,
  FREEZE_PER_STACK,
  JAM_CAP,
  JAM_PER_STACK,
  MEMLEAK_PER_STACK,
  OVERVOLT_PER_STACK,
  VIRUS_DPS_PER_STACK,
  clone,
} from './status';
import type {
  BattleFrame,
  BattleResult,
  BattleSim,
  CategoryBuff,
  Combatant,
  CountScaling,
  ItemCategory,
  JobId,
  Module,
  PlacedItem,
  PlacedTile,
  StatusKey,
  TileBonuses,
} from './types';

const BASE_ENERGY = 5;
const BASE_REGEN = 1;
const CLOCK_HASTE = 0.15; // a clock-tile module fires 15% faster (per-module)
const POWER_CRIT = 0.12; // a power-tile module gains +12% crit

/** Resolve a placed circuit (item layer + tile layer) into a Combatant. */
export function resolveBoard(
  name: string,
  job: JobId,
  items: PlacedItem[],
  tiles: PlacedTile[],
  opts?: { allPowered?: boolean },
): Combatant {
  const j = JOBS[job];

  // Determine which items are powered + the tile bonuses.
  let poweredItems: Set<string>;
  let bonuses: TileBonuses;
  if (opts?.allPowered) {
    poweredItems = new Set(items.map((p) => p.id));
    // synthesize generous bonuses for AI opponents (no connectivity needed)
    bonuses = {
      maxEnergy: 2,
      startShield: 0,
      hasteItemIds: new Set(items.map((p) => p.id)),
      critItemIds: new Set(items.map((p) => p.id)),
    };
  } else {
    poweredItems = poweredItemIds(tiles, items);
    bonuses = tileBonuses(tiles, items);
  }

  const live = items.filter((p) => poweredItems.has(p.id));

  let maxHp = j.startingHp;
  let maxEnergy = BASE_ENERGY + bonuses.maxEnergy;
  let energyRegen = BASE_REGEN;
  let startShield = bonuses.startShield;
  let baseCrit = 0;
  let baseCritDmg = 0;
  let baseAccuracy = 1;
  let hasteMul = 1;
  let thorns = 0;
  let firewall = false;
  let power = 0;
  const categoryBuffs: CategoryBuff[] = [];
  const countScaling: CountScaling[] = [];

  // count powered items per category (for countScaling)
  const catCount: Record<ItemCategory, number> = { melee: 0, ranged: 0, accessory: 0, armor: 0 };
  for (const p of live) {
    const it = itemById(p.key);
    if (it?.category) catCount[it.category] += 1;
  }

  for (const p of live) {
    const it = itemById(p.key);
    if (!it?.support) continue;
    const s = it.support;
    if (s.hp) maxHp += s.hp;
    if (s.maxEnergy) maxEnergy += s.maxEnergy;
    if (s.energyRegen) energyRegen += s.energyRegen;
    if (s.shieldStart) startShield += s.shieldStart;
    if (s.crit) baseCrit += s.crit;
    if (s.critDmg) baseCritDmg += s.critDmg;
    if (s.accuracy) baseAccuracy += s.accuracy;
    if (s.haste) hasteMul += s.haste;
    if (s.thorns) thorns += s.thorns;
    if (s.power) power += s.power;
    if (s.firewall) firewall = true;
    if (s.categoryBuffs) categoryBuffs.push(...s.categoryBuffs);
    if (s.countScaling) countScaling.push(...s.countScaling);
  }

  // count-referencing buffs (e.g. shieldPer × count of a category)
  for (const cs of countScaling) {
    const n = catCount[cs.category] ?? 0;
    if (cs.shieldPer) startShield += cs.shieldPer * n;
    if (cs.hpPer) maxHp += cs.hpPer * n;
    if (cs.powerPer) power += cs.powerPer * n;
  }

  // category buff lookups
  const catDmg = (cat: ItemCategory | null): number => {
    if (!cat) return 0;
    return categoryBuffs.filter((b) => b.category === cat).reduce((s, b) => s + (b.dmg ?? 0), 0);
  };
  const catCrit = (cat: ItemCategory | null): number => {
    if (!cat) return 0;
    return categoryBuffs.filter((b) => b.category === cat).reduce((s, b) => s + (b.crit ?? 0), 0);
  };
  const catHaste = (cat: ItemCategory | null): number => {
    if (!cat) return 0;
    return categoryBuffs.filter((b) => b.category === cat).reduce((s, b) => s + (b.hastePct ?? 0), 0);
  };

  const modules: Module[] = [];
  for (const p of live) {
    const it = itemById(p.key);
    if (!it?.weapon) continue;
    const w = it.weapon;
    const onClock = bonuses.hasteItemIds.has(p.id);
    const onPower = bonuses.critItemIds.has(p.id);
    const hPct = catHaste(it.category); // +% speed via category buff
    modules.push({
      id: p.id,
      key: p.key,
      nameJa: it.nameJa,
      sprite: it.sprite,
      category: it.category,
      weapon: {
        dmg: Math.round(w.dmg + power + catDmg(it.category)),
        // bake category haste into the per-weapon cooldown (clock tile handled in sim)
        cd: hPct > 0 ? w.cd / (1 + hPct) : w.cd,
        energy: w.energy,
        accuracy: w.accuracy,
        crit: (w.crit ?? 0) + catCrit(it.category),
        critMult: w.critMult,
        pierce: w.pierce,
        applies: w.applies?.map((a) => ({ status: a.status, amount: a.amount, chance: a.chance })),
        detonate: w.detonate,
        reference: w.reference,
        selfShield: w.selfShield,
        heal: w.heal,
      },
      haste: onClock,
      critBonus: onPower ? POWER_CRIT : 0,
    });
  }

  return {
    name, job, maxHp: Math.max(1, Math.round(maxHp)), maxEnergy, energyRegen,
    startShield: Math.round(startShield),
    baseCrit, baseCritDmg, baseAccuracy, hasteMul, thorns: Math.round(thorns), firewall, modules,
  };
}

interface Side {
  c: Combatant;
  hp: number;
  shield: number;
  energy: number;
  status: Record<StatusKey, number>;
  timers: number[];
  stoppedUntil: number[]; // per-module crash end time
}

function makeSide(c: Combatant): Side {
  return {
    c, hp: c.maxHp, shield: c.startShield, energy: c.maxEnergy,
    status: clone(EMPTY_STATUS), timers: c.modules.map(() => 0), stoppedUntil: c.modules.map(() => 0),
  };
}

const pct = (s: Side) => Math.max(0, Math.round((s.hp / s.c.maxHp) * 100));

export function simulate(player: Combatant, enemy: Combatant, seed: number, maxTime = 30): BattleSim {
  const rng = makeRng(seed);
  const P = makeSide(player);
  const E = makeSide(enemy);
  const logs: string[] = [`回路起動 — 自軍 ${player.modules.length}基 / 敵軍 ${enemy.modules.length}基。`];
  const frames: BattleFrame[] = [];
  const dt = 0.05;
  let t = 0;
  let nextFrame = 0;
  let nextLog = 5;

  const fire = (src: Side, dst: Side, mIdx: number) => {
    const m = src.c.modules[mIdx];
    const w = m.weapon;
    // accuracy reduced by the firing side's own jam stacks
    const acc = Math.max(0.1, (w.accuracy ?? src.c.baseAccuracy) - Math.min(JAM_CAP, src.status.jam * JAM_PER_STACK));
    if (rng() >= acc) return; // miss (energy already spent)

    let dmg = w.dmg;
    if (w.reference) dmg += Math.round(dst.status[w.reference.status] * w.reference.mult);
    if (w.detonate) {
      const stacks = dst.status[w.detonate.status];
      if (stacks > 0) {
        dmg += stacks * w.detonate.perStack;
        dst.status[w.detonate.status] = 0;
      }
    }
    const critChance = src.c.baseCrit + (w.crit ?? 0) + m.critBonus;
    if (critChance > 0 && rng() < critChance) dmg = Math.round(dmg * ((w.critMult ?? 2) + src.c.baseCritDmg));
    // overvolt amp: +1%/stack on the target
    dmg = Math.round(dmg * (1 + dst.status.overvolt * OVERVOLT_PER_STACK));

    if (dmg > 0) {
      const pierce = w.pierce ?? 0;
      const blockable = Math.max(0, dst.shield - pierce);
      const absorbed = Math.min(blockable, dmg);
      dst.shield -= absorbed;
      dst.hp -= dmg - absorbed;
      if (dst.c.thorns > 0) src.hp -= dst.c.thorns; // トゲ反射
    }
    if (w.selfShield) src.shield += w.selfShield;
    if (w.heal) src.hp = Math.min(src.c.maxHp, src.hp + w.heal);

    for (const a of w.applies ?? []) {
      if ((a.chance ?? 1) < 1 && rng() >= (a.chance ?? 1)) continue;
      if (a.status === 'crash') {
        // stop a random non-stopped enemy module ~2s
        const cand = dst.c.modules.map((_, i) => i).filter((i) => dst.stoppedUntil[i] <= t);
        if (cand.length) dst.stoppedUntil[cand[Math.floor(rng() * cand.length)]] = t + CRASH_DURATION;
        continue;
      }
      if (dst.c.firewall) continue; // ファイアウォール: 新規デバフ無効
      dst.status[a.status] += a.amount;
    }
  };

  const tickSide = (s: Side, foe: Side) => {
    const regen = Math.max(0, s.c.energyRegen - s.status.memleak * MEMLEAK_PER_STACK);
    s.energy = Math.min(s.c.maxEnergy, s.energy + regen * dt);
    if (s.status.virus > 0) s.hp -= s.status.virus * VIRUS_DPS_PER_STACK * dt;
    const speed = s.c.hasteMul * (1 - Math.min(FREEZE_CAP, s.status.freeze * FREEZE_PER_STACK));
    for (let i = 0; i < s.c.modules.length; i++) {
      if (s.stoppedUntil[i] > t) continue; // crashed
      const m = s.c.modules[i];
      const mSpeed = speed * (m.haste ? 1 + CLOCK_HASTE : 1);
      s.timers[i] += dt * mSpeed;
      const w = m.weapon;
      while (s.timers[i] >= w.cd) {
        if (s.energy < w.energy) {
          s.timers[i] = w.cd; // ready but starved — hold until energy returns
          break;
        }
        s.timers[i] -= w.cd;
        s.energy -= w.energy;
        fire(s, foe, i);
      }
    }
  };

  while (t < maxTime && P.hp > 0 && E.hp > 0) {
    tickSide(P, E);
    tickSide(E, P);
    t += dt;
    if (t >= nextFrame) {
      frames.push({ t: Math.round(t * 10) / 10, pHp: Math.max(0, P.hp), pShield: P.shield, pEnergy: P.energy, eHp: Math.max(0, E.hp), eShield: E.shield, eEnergy: E.energy, pStatus: clone(P.status), eStatus: clone(E.status) });
      nextFrame += 0.5;
    }
    if (t >= nextLog && P.hp > 0 && E.hp > 0) {
      logs.push(`${Math.round(t)}秒 — 自 ${pct(P)}% / 敵 ${pct(E)}%${E.status.virus || E.status.overvolt ? `（敵 ウイルス${Math.round(E.status.virus)}・過電圧${Math.round(E.status.overvolt)}）` : ''}`);
      nextLog += 5;
    }
  }

  let result: BattleResult;
  if (P.hp <= 0 && E.hp <= 0) result = 'draw';
  else if (E.hp <= 0) result = 'win';
  else if (P.hp <= 0) result = 'lose';
  else result = pct(P) > pct(E) ? 'win' : pct(E) > pct(P) ? 'lose' : 'draw';

  logs.push(
    result === 'win' ? `回路勝利 — 敵を沈黙させた（自 ${pct(P)}% 残存）。`
    : result === 'lose' ? `回路崩壊 — 機関停止（敵 ${pct(E)}% 残存）。`
    : `時間切れ — 拮抗のまま終了。`,
  );

  return { result, logs, frames, pHp: Math.max(0, P.hp), eHp: Math.max(0, E.hp), pMaxHp: P.c.maxHp, eMaxHp: E.c.maxHp };
}
