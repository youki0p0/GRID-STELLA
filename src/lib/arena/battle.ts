// GRID STELLA — ARENA :: deterministic auto-battle.
// Both sides are resolved into mirror "Combatants" and simulated on one timeline.
import { adjacent, sharesCol, sharesRow } from './bag';
import { itemById } from './data';
import { makeRng } from './rng';
import type { BattleFrame, BattleResult, BattleSim, Combatant, ItemAction, Module, PlacedItem } from './types';

const SLOW_CAP = 0.6;
const VULN_CAP = 0.6;
const POISON_CAP = 120;

interface ResMod {
  atkMul: number;
  cdMul: number;
  critAdd: number;
  poisonAdd: number;
  burnMul: number;
}

/** Resolve a placed board (+ current gold) into a Combatant ready to fight. */
export function resolveBoard(name: string, board: PlacedItem[], gold: number, hpFloor: number): Combatant {
  let maxHp = hpFloor;
  const acting = board.filter((p) => itemById(p.key)?.action);
  const res = new Map<string, ResMod>();
  for (const p of acting) res.set(p.id, { atkMul: 1, cdMul: 1, critAdd: 0, poisonAdd: 0, burnMul: 1 });

  // accumulate flat max-hp
  for (const p of board) maxHp += itemById(p.key)?.maxHp ?? 0;

  // apply auras
  for (const emitter of board) {
    const it = itemById(emitter.key);
    if (!it?.auras) continue;
    for (const aura of it.auras) {
      for (const target of acting) {
        const tIt = itemById(target.key)!;
        if (aura.tag && !tIt.tags.includes(aura.tag)) continue;
        let touches = false;
        switch (aura.scope) {
          case 'self': touches = target.id === emitter.id; break;
          case 'adj': touches = target.id !== emitter.id && adjacent(emitter, target); break;
          case 'row': touches = target.id !== emitter.id && sharesRow(emitter, target); break;
          case 'col': touches = target.id !== emitter.id && sharesCol(emitter, target); break;
          case 'all': touches = true; break;
        }
        if (!touches) continue;
        const r = res.get(target.id)!;
        if (aura.atkMul) r.atkMul *= aura.atkMul;
        if (aura.cdMul) r.cdMul *= aura.cdMul;
        if (aura.critAdd) r.critAdd += aura.critAdd;
        if (aura.poisonAdd) r.poisonAdd += aura.poisonAdd;
        if (aura.burnMul) r.burnMul *= aura.burnMul;
      }
    }
  }

  const modules: Module[] = acting.map((p) => {
    const it = itemById(p.key)!;
    const a = it.action!;
    const r = res.get(p.id)!;
    const goldPart = a.goldScale ? Math.floor(gold / a.goldScale) : 0;
    const atk = Math.round(((a.atk ?? 0) + goldPart) * r.atkMul);
    const cd = Math.max(0.2, a.cd * r.cdMul);
    const action: ItemAction = {
      cd,
      atk,
      crit: (a.crit ?? 0) + r.critAdd,
      poison: a.poison ? a.poison + r.poisonAdd : undefined,
      burn: a.burn ? Math.round(a.burn * r.burnMul) : undefined,
      slow: a.slow,
      vuln: a.vuln,
      shield: a.shield,
      heal: a.heal,
      pierce: a.pierce,
    };
    return { key: p.key, nameJa: it.nameJa, sprite: it.sprite, action, atk, cd, crit: action.crit ?? 0 };
  });

  return { name, maxHp: Math.max(1, maxHp), modules };
}

interface Side {
  c: Combatant;
  hp: number;
  shield: number;
  poison: number;
  burn: number; // remaining burn pool
  slow: number; // applied TO this side (slows its modules)
  vuln: number; // applied TO this side (amplifies damage it takes)
  timers: number[];
}

function makeSide(c: Combatant): Side {
  return { c, hp: c.maxHp, shield: 0, poison: 0, burn: 0, slow: 0, vuln: 0, timers: c.modules.map(() => 0) };
}

const pct = (s: Side) => Math.max(0, Math.round((s.hp / s.c.maxHp) * 100));

export function simulate(player: Combatant, enemy: Combatant, seed: number, maxTime = 30): BattleSim {
  const rng = makeRng(seed);
  const P = makeSide(player);
  const E = makeSide(enemy);
  const logs: string[] = [];
  const frames: BattleFrame[] = [];
  const dt = 0.05;
  let t = 0;
  let nextFrame = 0;
  let nextLog = 5;

  logs.push(`観測開始 — 自軍 ${player.modules.length}基 / 敵軍 ${enemy.modules.length}基。`);

  const strike = (src: Side, dst: Side, m: Module) => {
    const a = m.action;
    if (a.atk && a.atk > 0) {
      let d = a.atk;
      if (a.crit && rng() < a.crit) d = Math.round(d * 2);
      d = Math.round(d * (1 + dst.vuln));
      const pierce = a.pierce ?? 0;
      const blockable = Math.max(0, dst.shield - pierce);
      const absorbed = Math.min(blockable, d);
      dst.shield -= absorbed;
      dst.hp -= d - absorbed;
    }
    if (a.poison) dst.poison = Math.min(POISON_CAP, dst.poison + a.poison);
    if (a.burn) dst.burn += a.burn;
    if (a.slow) dst.slow = Math.min(SLOW_CAP, dst.slow + a.slow);
    if (a.vuln) dst.vuln = Math.min(VULN_CAP, dst.vuln + a.vuln);
    if (a.shield) src.shield += a.shield;
    if (a.heal) src.hp = Math.min(src.c.maxHp, src.hp + a.heal);
  };

  const tickSide = (s: Side, foe: Side) => {
    // continuous damage on s (poison + burn)
    if (s.poison > 0) s.hp -= s.poison * dt;
    if (s.burn > 0) {
      const d = Math.min(s.burn, s.burn * 0.6 * dt + 0.5 * dt);
      s.hp -= d;
      s.burn = Math.max(0, s.burn - d);
    }
    // module firing (slowed if s.slow > 0)
    const speed = 1 / (1 + s.slow);
    for (let i = 0; i < s.c.modules.length; i++) {
      s.timers[i] += dt * speed;
      const m = s.c.modules[i];
      while (s.timers[i] >= m.cd) {
        s.timers[i] -= m.cd;
        strike(s, foe, m);
      }
    }
  };

  while (t < maxTime && P.hp > 0 && E.hp > 0) {
    tickSide(P, E);
    tickSide(E, P);
    t += dt;
    if (t >= nextFrame) {
      frames.push({ t: Math.round(t * 10) / 10, pHp: Math.max(0, P.hp), pShield: P.shield, eHp: Math.max(0, E.hp), eShield: E.shield });
      nextFrame += 0.5;
    }
    if (t >= nextLog && P.hp > 0 && E.hp > 0) {
      logs.push(`${Math.round(t)}秒 — 自 ${pct(P)}% / 敵 ${pct(E)}%${P.poison || E.poison ? `（毒 自${Math.round(P.poison)}・敵${Math.round(E.poison)}）` : ''}`);
      nextLog += 5;
    }
  }

  let result: BattleResult;
  if (P.hp <= 0 && E.hp <= 0) result = 'draw';
  else if (E.hp <= 0) result = 'win';
  else if (P.hp <= 0) result = 'lose';
  else {
    const dp = pct(P);
    const de = pct(E);
    result = dp > de ? 'win' : de > dp ? 'lose' : 'draw';
  }

  const verdict =
    result === 'win' ? `決着 — 敵軍を沈黙させた（自 ${pct(P)}% 残存）。`
    : result === 'lose' ? `決着 — 観測盤が崩壊した（敵 ${pct(E)}% 残存）。`
    : `時間切れ — 拮抗のまま観測終了。`;
  logs.push(verdict);

  return { result, logs, frames, pHp: Math.max(0, P.hp), eHp: Math.max(0, E.hp), pMaxHp: P.c.maxHp, eMaxHp: E.c.maxHp };
}
