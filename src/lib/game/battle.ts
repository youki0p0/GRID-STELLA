// GRID STELLA — lightweight realtime battle simulation.
// 30s max, 0.1s ticks. Cooldown-driven weapon fire, shield mitigation,
// coat shield regen, and a timestamped event log. Pure & deterministic.
import type { BattleFrame, BattleResult, BattleSim, BoardStats, Enemy } from './types';

export function simulateBattle(stats: BoardStats, enemy: Enemy): BattleSim {
  const dt = 0.1;
  const maxT = 30;

  let pHp = stats.maxHp;
  let pShield = 0;
  let eHp = enemy.hp;
  let eShield = enemy.shield;

  const wTimers = stats.weapons.map(() => 0);
  let coatTimer = 0;
  let eTimer = 0;

  const logs: string[] = [];
  const history: BattleFrame[] = [];

  const dealToEnemy = (dmg: number) => {
    let d = dmg;
    if (eShield > 0) {
      const a = Math.min(eShield, d);
      eShield -= a;
      d -= a;
    }
    eHp = Math.max(0, eHp - d);
  };
  const dealToPlayer = (dmg: number) => {
    let d = dmg;
    if (pShield > 0) {
      const a = Math.min(pShield, d);
      pShield -= a;
      d -= a;
    }
    pHp = Math.max(0, pHp - d);
  };

  for (let t = 0; t <= maxT + 0.0001; t += dt) {
    const ts = t.toFixed(1);

    // coat shield regen
    if (stats.shieldPerTick > 0) {
      coatTimer += dt;
      if (coatTimer >= 3) {
        coatTimer -= 3;
        pShield += stats.shieldPerTick;
        logs.push(`[${ts}s] 方位外套がシールドを+${stats.shieldPerTick}生成。`);
      }
    }

    // weapons
    stats.weapons.forEach((w, i) => {
      if (w.finalCooldown <= 0) return;
      wTimers[i] += dt;
      if (wTimers[i] >= w.finalCooldown) {
        wTimers[i] -= w.finalCooldown;
        const dmg = Math.max(1, w.finalAttack - eShield);
        dealToEnemy(w.finalAttack);
        logs.push(`[${ts}s] ${w.icon} ${w.nameJa}の調律攻撃！${Math.max(1, dmg)} DMG`);
      }
    });

    // enemy
    eTimer += dt;
    if (eTimer >= enemy.cooldown) {
      eTimer -= enemy.cooldown;
      const dmg = Math.max(1, enemy.attack - pShield);
      dealToPlayer(enemy.attack);
      logs.push(`[${ts}s] 敵の干渉波！${Math.max(1, dmg)} DMG を受けた。`);
    }

    history.push({ t: +ts, pHp, pShield, eHp, eShield });
    if (pHp <= 0 || eHp <= 0) break;
  }

  let result: BattleResult;
  if (eHp <= 0 && pHp > 0) result = 'win';
  else if (pHp <= 0) result = 'lose';
  else result = pHp / stats.maxHp >= eHp / enemy.hp ? 'win' : 'lose';

  return { result, logs, history };
}
