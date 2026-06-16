/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: synergy (set-bonus) calculator
 *
 * 5x5 マージボードに配置されたユニットの組み合わせを検査し、
 * 戦闘中に全器具へ適用される乗数・補正値を返す純粋関数。
 * 副作用なし・決定的。
 * ========================================================================== */

import { TypeId, TYPES, GRID } from './engine';

/* ---------------------------------------------------------------- 配置ユニット */
export interface PlacedUnit {
  type: TypeId;
  level: number;
  r: number; // 行 (0-4)
  c: number; // 列 (0-4)
}

/* ---------------------------------------------------------------- シナジー結果 */
export interface SynergyBonus {
  atkMul: number;    // 攻撃乗数（1.0 = 等倍）
  fireMul: number;   // 連射速度乗数（1.0 = 等倍、小さいほど速い）
  rangeBonus: number; // 射程加算（セル）
  labels: string[];  // 発動シナジー名ラベル
}

/* ---------------------------------------------------------------- 定数 */
// fireMul の下限（速くなりすぎる防止）
const FIRE_MUL_FLOOR = 0.4;

/* ---------------------------------------------------------------- ユーティリティ */
// TypeId ごとにユニット数をカウントする
function countByType(units: PlacedUnit[]): Map<TypeId, number> {
  const map = new Map<TypeId, number>();
  for (const u of units) {
    map.set(u.type, (map.get(u.type) ?? 0) + 1);
  }
  return map;
}

// Rarity ごとにユニット数をカウントする
function countByRarity(units: PlacedUnit[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const u of units) {
    const rarity = TYPES[u.type].rarity;
    map.set(rarity, (map.get(rarity) ?? 0) + 1);
  }
  return map;
}

// 行 r が全て埋まっているか（GRID=5 個のユニットが存在するか）
function isRowFull(units: PlacedUnit[], r: number): boolean {
  const cols = new Set(units.filter(u => u.r === r).map(u => u.c));
  return cols.size >= GRID;
}

// 列 c が全て埋まっているか
function isColFull(units: PlacedUnit[], c: number): boolean {
  const rows = new Set(units.filter(u => u.c === c).map(u => u.r));
  return rows.size >= GRID;
}

/* ================================================================ メイン関数 */
/**
 * synergyBonus — 盤面全体のシナジーボーナスを計算して返す。
 *
 * @param units 配置済みユニットの配列（空でも可）
 * @returns     戦闘適用前の乗数・補正オブジェクト
 */
export function synergyBonus(units: PlacedUnit[]): SynergyBonus {
  // 初期値（全シナジー未発動の中立状態）
  let atkMul = 1;
  let fireMul = 1;
  let rangeBonus = 0;
  const labels: string[] = [];

  const total = units.length;

  /* ---- ルール①: 観測網 — 器具総数ティア ---------------------------------
   * 3 個ごとに全体攻撃 +0.05 atkMul の小型ボーナス。
   * 「星座を繋ぐ観測網が広がるほど威力が増す」イメージ。
   * -------------------------------------------------------------------- */
  const networkTier = Math.floor(total / 3);
  if (networkTier >= 1) {
    atkMul += networkTier * 0.05;
    labels.push(`観測網 x${networkTier}`);
  }

  /* ---- ルール②: 同種セット — 同じ TypeId が 3 個以上 -------------------
   * 同種を 3 体集めると連携動作が生まれ、攻撃が上がり連射が速まる。
   * -------------------------------------------------------------------- */
  const byType = countByType(units);
  byType.forEach((cnt, typeId) => {
    if (cnt >= 3) {
      const def = TYPES[typeId];
      atkMul += 0.10;
      fireMul -= 0.05; // 連射間隔が短くなる（小さい = 速い）
      labels.push(`${def.name} 編成`);
    }
  });

  /* ---- ルール③: レアリティセット ----------------------------------------
   * astral が 2 体以上: 射程大幅延長（星の彼方まで届く）。
   * rare が 3 体以上: 攻撃底上げ（熟練器具の相乗効果）。
   * -------------------------------------------------------------------- */
  const byRarity = countByRarity(units);
  const astralCount = byRarity.get('astral') ?? 0;
  const rareCount = byRarity.get('rare') ?? 0;

  if (astralCount >= 2) {
    rangeBonus += 0.3;
    labels.push('星幽共鳴');
  }
  if (rareCount >= 3) {
    atkMul += 0.10;
    labels.push('精密編成');
  }

  /* ---- ルール④: 全列/全行 — フルライン ----------------------------------
   * 任意の行または列が 5 体で埋まると整列ボーナス。
   * 重複してもラベルは 1 つだけ付与する。
   * -------------------------------------------------------------------- */
  let fullLineFound = false;
  for (let r = 0; r < GRID; r++) {
    if (isRowFull(units, r)) {
      fullLineFound = true;
      break;
    }
  }
  if (!fullLineFound) {
    for (let c = 0; c < GRID; c++) {
      if (isColFull(units, c)) {
        fullLineFound = true;
        break;
      }
    }
  }
  if (fullLineFound) {
    atkMul += 0.15;
    labels.push('整列');
  }

  /* ---- fireMul の下限クランプ ------------------------------------------ */
  fireMul = Math.max(FIRE_MUL_FLOOR, fireMul);

  return { atkMul, fireMul, rangeBonus, labels };
}
