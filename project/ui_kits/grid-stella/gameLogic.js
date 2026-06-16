/* ============================================================
   GRID STELLA — game logic & master data (client-side, pure).
   Exposed on window for the babel-transpiled app scripts.
   ============================================================ */
(function () {
  const GRID = 5;

  // ---- Master data: the five instruments ----------------------
  const SHOP_POOL = [
    { key: 'needle', icon: '📌', nameJa: '観測針', nameEn: 'Navigator Needle',
      type: 'weapon', w: 1, h: 1, attack: 4, cooldown: 2.0, cost: 3,
      effect: '基礎の調律針。安定した攻撃を刻む。' },
    { key: 'globe', icon: '🌐', nameJa: '天球儀', nameEn: 'Celestial Globe',
      type: 'weapon', w: 2, h: 2, attack: 16, cooldown: 4.5, cost: 8,
      effect: '重く強大な一撃。広い座標を占有する。' },
    { key: 'compass', icon: '🧭', nameJa: '羅針盤の刻印', nameEn: 'Compass Rose',
      type: 'buff', w: 1, h: 1, cost: 4,
      effect: '上下左右に隣接する武器のクールダウンを20%短縮。' },
    { key: 'plumb', icon: '⚱️', nameJa: '均衡の分銅', nameEn: 'Plumb Bob',
      type: 'buff', w: 1, h: 1, cost: 3,
      effect: '左右に隣接する武器の攻撃力を+2する。' },
    { key: 'coat', icon: '🧥', nameJa: '方位外套', nameEn: 'Navigator Coat',
      type: 'defense', w: 2, h: 1, cost: 5,
      effect: '戦闘中、3秒ごとにシールドを+4生成する。' },
  ];

  const ENEMY_PRESETS = [
    { nameJa: '歪んだ座標', nameEn: 'TYPE-A', hp: 70,  attack: 6,  cooldown: 2.5, shield: 0 },
    { nameJa: '暴走した観測機', nameEn: 'RUNAWAY', hp: 120, attack: 9,  cooldown: 2.0, shield: 8 },
    { nameJa: '反転せし極星', nameEn: 'NULL-POLE', hp: 180, attack: 13, cooldown: 1.8, shield: 16 },
  ];

  // ---- Geometry helpers ---------------------------------------
  // effective footprint given rotation (rot 0-3; odd swaps w/h)
  function dims(item, rot) {
    return (rot % 2 === 1) ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
  }
  function cellsOf(placed) {
    const { w, h } = dims(placed.item, placed.rot || 0);
    const out = [];
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        out.push([placed.x + dx, placed.y + dy]);
    return out;
  }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < GRID && y < GRID; }

  function canPlace(item, x, y, rot, placed, ignoreId) {
    const { w, h } = dims(item, rot);
    if (x < 0 || y < 0 || x + w > GRID || y + h > GRID) return false;
    const occupied = new Set();
    placed.forEach((p) => {
      if (p.id === ignoreId) return;
      cellsOf(p).forEach(([cx, cy]) => occupied.add(cx + ',' + cy));
    });
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (occupied.has((x + dx) + ',' + (y + dy))) return false;
    return true;
  }

  // synergy target cells for a buff, with rotation applied
  function synergyCells(placed) {
    const base = placed.item.key === 'compass'
      ? [[0, -1], [0, 1], [-1, 0], [1, 0]]    // all 4 neighbours
      : placed.item.key === 'plumb'
        ? [[-1, 0], [1, 0]]                    // left / right only
        : [];
    const rot = (placed.rot || 0) % 4;
    const rotate = ([dx, dy]) => {
      let p = [dx, dy];
      for (let i = 0; i < rot; i++) p = [-p[1], p[0]]; // 90° CW
      return p;
    };
    return base
      .map(rotate)
      .map(([dx, dy]) => [placed.x + dx, placed.y + dy])
      .filter(([cx, cy]) => inBounds(cx, cy));
  }

  function calculateStats(placed) {
    const weapons = placed.filter((p) => p.item.type === 'weapon');
    const compasses = placed.filter((p) => p.item.key === 'compass');
    const plumbs = placed.filter((p) => p.item.key === 'plumb');
    const coats = placed.filter((p) => p.item.key === 'coat');

    const occ = (p) => new Set(cellsOf(p).map(([x, y]) => x + ',' + y));

    const out = weapons.map((wp) => {
      const wCells = occ(wp);
      let attack = wp.item.attack;
      let cdMult = 1;
      plumbs.forEach((pb) => {
        if (synergyCells(pb).some(([x, y]) => wCells.has(x + ',' + y))) attack += 2;
      });
      compasses.forEach((cp) => {
        if (synergyCells(cp).some(([x, y]) => wCells.has(x + ',' + y))) cdMult *= 0.8;
      });
      return {
        id: wp.id, key: wp.item.key, icon: wp.item.icon, nameJa: wp.item.nameJa,
        finalAttack: attack, finalCooldown: +(wp.item.cooldown * cdMult).toFixed(2),
        buffed: cdMult < 1 || attack > wp.item.attack,
      };
    });

    return {
      maxHp: 100,
      shieldPerTick: coats.length * 4,
      weapons: out,
    };
  }

  // ---- Lightweight realtime battle ----------------------------
  function simulateBattle(stats, enemy) {
    const dt = 0.1, maxT = 30;
    let pHp = stats.maxHp, pShield = 0;
    let eHp = enemy.hp, eShield = enemy.shield;
    const wTimers = stats.weapons.map(() => 0);
    let coatTimer = 0, eTimer = 0;
    const logs = [], history = [];

    const dealToEnemy = (dmg) => {
      let d = dmg;
      if (eShield > 0) { const a = Math.min(eShield, d); eShield -= a; d -= a; }
      eHp = Math.max(0, eHp - d);
    };
    const dealToPlayer = (dmg) => {
      let d = dmg;
      if (pShield > 0) { const a = Math.min(pShield, d); pShield -= a; d -= a; }
      pHp = Math.max(0, pHp - d);
    };

    for (let t = 0; t <= maxT + 0.0001; t += dt) {
      const ts = t.toFixed(1);
      // coat shield regen
      if (stats.shieldPerTick > 0) {
        coatTimer += dt;
        if (coatTimer >= 3) { coatTimer -= 3; pShield += stats.shieldPerTick;
          logs.push(`[${ts}s] 方位外套がシールドを+${stats.shieldPerTick}生成。`); }
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

    let result = 'draw';
    if (eHp <= 0 && pHp > 0) result = 'win';
    else if (pHp <= 0) result = 'lose';
    else result = (pHp / stats.maxHp) >= (eHp / enemy.hp) ? 'win' : 'lose';

    return { result, logs, history };
  }

  window.GS_LOGIC = {
    GRID, SHOP_POOL, ENEMY_PRESETS,
    dims, cellsOf, canPlace, synergyCells, calculateStats, simulateBattle,
  };
})();
