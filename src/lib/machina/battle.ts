// 神楽マキナ :: deterministic circuit auto-battle (energy economy + shared statuses).
import { makeRng } from '../arena/rng';
import { itemById, statMul } from './data';
import { JOBS } from './data';
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
import type { BattleFrame, BattleResult, BattleSim, Combatant, JobId, Module, PlacedItem, StatusKey } from './types';

const BASE_ENERGY = 5;
const BASE_REGEN = 1;

/** Resolve a placed circuit into a Combatant. */
export function resolveBoard(name: string, job: JobId, board: PlacedItem[]): Combatant {
  const j = JOBS[job];
  let maxHp = j.startingHp;
  let maxEnergy = BASE_ENERGY;
  let energyRegen = BASE_REGEN;
  let startShield = 0;
  let baseCrit = 0;
  let baseCritDmg = 0;
  let baseAccuracy = 1;
  let hasteMul = 1;
  let thorns = 0;
  let firewall = false;
  let power = 0;

  for (const p of board) {
    const it = itemById(p.key);
    if (!it?.support) continue;
    const m = statMul(p.level ?? 1);
    const s = it.support;
    if (s.hp) maxHp += Math.round(s.hp * m);
    if (s.maxEnergy) maxEnergy += s.maxEnergy; // integer, unscaled
    if (s.energyRegen) energyRegen += s.energyRegen * m;
    if (s.shieldStart) startShield += Math.round(s.shieldStart * m);
    if (s.crit) baseCrit += s.crit;
    if (s.critDmg) baseCritDmg += s.critDmg;
    if (s.accuracy) baseAccuracy += s.accuracy;
    if (s.haste) hasteMul += s.haste;
    if (s.thorns) thorns += Math.round(s.thorns * m);
    if (s.power) power += s.power * m;
    if (s.firewall) firewall = true;
  }

  const modules: Module[] = [];
  for (const p of board) {
    const it = itemById(p.key);
    if (!it?.weapon) continue;
    const m = statMul(p.level ?? 1);
    const w = it.weapon;
    modules.push({
      key: p.key,
      nameJa: it.nameJa,
      sprite: it.sprite,
      weapon: {
        dmg: Math.round(w.dmg * m + power),
        cd: w.cd,
        energy: w.energy,
        accuracy: w.accuracy,
        crit: w.crit,
        critDmg: w.critDmg,
        pierce: w.pierce,
        applies: w.applies?.map((a) => ({ status: a.status, amount: a.status === 'crash' ? a.amount : Math.max(1, Math.round(a.amount * m)) })),
        detonate: w.detonate ? { status: w.detonate.status, perStack: Math.round(w.detonate.perStack * m) } : undefined,
        reference: w.reference ? { status: w.reference.status, mult: w.reference.mult * m } : undefined,
        selfShield: w.selfShield,
        heal: w.heal,
      },
    });
  }

  return {
    name, job, maxHp: Math.max(1, maxHp), maxEnergy, energyRegen, startShield,
    baseCrit, baseCritDmg, baseAccuracy, hasteMul, thorns, firewall, modules,
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
    // accuracy is reduced by the firing side's own jam stacks
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
    const critChance = src.c.baseCrit + (w.crit ?? 0);
    if (critChance > 0 && rng() < critChance) dmg = Math.round(dmg * (2 + src.c.baseCritDmg + (w.critDmg ?? 0)));
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
      if (a.status === 'crash') {
        // stop a random non-stopped enemy module
        const cand = dst.c.modules.map((_, i) => i).filter((i) => dst.stoppedUntil[i] <= t);
        if (cand.length) dst.stoppedUntil[cand[Math.floor(rng() * cand.length)]] = t + CRASH_DURATION;
        continue;
      }
      if (dst.c.firewall) continue; // ファイアウォール: 新規デバフ無効
      dst.status[a.status] += a.amount;
    }
  };

  const tickSide = (s: Side, foe: Side) => {
    // energy regen, disrupted by memory-leak
    const regen = Math.max(0, s.c.energyRegen - s.status.memleak * MEMLEAK_PER_STACK);
    s.energy = Math.min(s.c.maxEnergy, s.energy + regen * dt);
    // virus damage over time
    if (s.status.virus > 0) s.hp -= s.status.virus * VIRUS_DPS_PER_STACK * dt;
    // weapons
    const speed = s.c.hasteMul * (1 - Math.min(FREEZE_CAP, s.status.freeze * FREEZE_PER_STACK));
    for (let i = 0; i < s.c.modules.length; i++) {
      if (s.stoppedUntil[i] > t) continue; // crashed
      s.timers[i] += dt * speed;
      const w = s.c.modules[i].weapon;
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
      frames.push({ t: Math.round(t * 10) / 10, pHp: Math.max(0, P.hp), pShield: P.shield, pEnergy: P.energy, eHp: Math.max(0, E.hp), eShield: E.shield, eEnergy: E.energy });
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
