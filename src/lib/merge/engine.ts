/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: pure engine
 *
 * 画面（src/app/game/page.tsx）から参照される、副作用のない純粋ロジックと定数。
 * 乱数を使う関数は rng を差し替え可能にしてテスト可能性を担保する。
 * ========================================================================== */

export const GRID = 5;
export const MAX_LV = 9;
export const MAX_HP = 100;
export const TOTAL_WAVES = 20;
export const REROLL_COST = 2;
export const OFFER_SLOTS = 3;

/* ---------------------------------------------------------------- 器具タイプ */
export type TypeId = 'needle' | 'compass' | 'globe' | 'telescope' | 'hourglass' | 'armillary';
export type Rarity = 'common' | 'rare' | 'astral';

export interface TypeDef {
  id: TypeId;
  name: string;
  emoji: string;
  atk: number; // レベル1の攻撃
  range: number; // 射程（セル単位）
  fireMs: number; // 連射間隔（ms）
  rarity: Rarity;
  note: string;
}

export const TYPES: Record<TypeId, TypeDef> = {
  needle: { id: 'needle', name: '観測針', emoji: '📌', atk: 7, range: 1.7, fireMs: 620, rarity: 'common', note: '近距離・速射' },
  hourglass: { id: 'hourglass', name: '星時計', emoji: '⏳', atk: 4, range: 1.5, fireMs: 420, rarity: 'common', note: '至近・連射' },
  compass: { id: 'compass', name: '羅針盤', emoji: '🧭', atk: 9, range: 2.0, fireMs: 700, rarity: 'rare', note: '万能' },
  globe: { id: 'globe', name: '天球儀', emoji: '🌐', atk: 6, range: 2.4, fireMs: 480, rarity: 'rare', note: '中距離・速射' },
  armillary: { id: 'armillary', name: '環状儀', emoji: '🪐', atk: 12, range: 2.7, fireMs: 760, rarity: 'astral', note: '遠距離・強撃' },
  telescope: { id: 'telescope', name: '望遠鏡', emoji: '🔭', atk: 18, range: 3.4, fireMs: 1050, rarity: 'astral', note: '超長距離・狙撃' },
};
export const TYPE_LIST: TypeDef[] = Object.values(TYPES);

/* ------------------------------------------------------------------ 抽選 */
export const DRAW_WEIGHTS: { id: TypeId; w: number }[] = [
  { id: 'needle', w: 30 },
  { id: 'hourglass', w: 26 },
  { id: 'compass', w: 18 },
  { id: 'globe', w: 16 },
  { id: 'armillary', w: 7 },
  { id: 'telescope', w: 3 },
];

export function drawType(rng: () => number = Math.random): TypeId {
  const total = DRAW_WEIGHTS.reduce((s, d) => s + d.w, 0);
  let x = rng() * total;
  for (const d of DRAW_WEIGHTS) {
    x -= d.w;
    if (x <= 0) return d.id;
  }
  return DRAW_WEIGHTS[0].id;
}

/* ------------------------------------------------------------------ ユニット */
export interface Unit {
  uid: string;
  type: TypeId;
  level: number;
}

// レベルごとに攻撃が伸びる（Lv1=基礎、以後 +90%/Lv 相当）。
export function unitAtk(type: TypeId, level: number): number {
  return Math.round(TYPES[type].atk * (1 + (level - 1) * 0.9));
}

// 売却払い戻し（レベルに比例）。
export function sellValue(level: number): number {
  return Math.max(1, level * 2);
}

export function canMerge(a: { type: TypeId; level: number }, b: { type: TypeId; level: number }): boolean {
  return a.type === b.type && a.level === b.level && a.level < MAX_LV;
}

/* ------------------------------------------------------------------ 盤・座標 */
export const keyOf = (r: number, c: number) => r + ',' + c;
export const pctX = (c: number) => (c + 0.5) * (100 / GRID);
export const pctY = (r: number) => (r + 0.5) * (100 / GRID);

// 盤を縫う進行経路（蛇行）。最上段の左から段ごとに折り返して最下段へ。
export const PATH: { r: number; c: number }[] = (() => {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID; r++) {
    const cols = r % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const c of cols) cells.push({ r, c });
  }
  return cells;
})();

// 経路位置（連続値）→ セル空間 (r,c)。
export function enemyCell(pos: number): { r: number; c: number } {
  if (pos < 0) return { r: PATH[0].r - 0.6, c: PATH[0].c };
  const clamped = Math.min(PATH.length - 1, pos);
  const i0 = Math.floor(clamped);
  const i1 = Math.min(PATH.length - 1, i0 + 1);
  const f = clamped - i0;
  return {
    r: PATH[i0].r + (PATH[i1].r - PATH[i0].r) * f,
    c: PATH[i0].c + (PATH[i1].c - PATH[i0].c) * f,
  };
}

/* ------------------------------------------------------------------ 敵・波 */
export type EnemyKind = 'normal' | 'swift' | 'tank' | 'boss';

export interface KindDef {
  hpMul: number;
  speedMul: number;
  ring: string; // 枠色（UI）
}
export const KIND: Record<EnemyKind, KindDef> = {
  normal: { hpMul: 1, speedMul: 1, ring: 'border-rose-400/60' },
  swift: { hpMul: 0.55, speedMul: 1.7, ring: 'border-sky-300/70' },
  tank: { hpMul: 2.4, speedMul: 0.62, ring: 'border-violet-300/70' },
  boss: { hpMul: 11, speedMul: 0.6, ring: 'border-amber-300/80' },
};

export interface WaveSpec {
  count: number;
  hp: number;
  power: number;
  speed: number;
  boss: boolean;
}

export function waveSpec(wave: number): WaveSpec {
  // 序盤をなだらかに、後半で緩やかに伸ばすバランス曲線。
  return {
    count: 4 + wave,
    hp: 9 + wave * 5,
    power: 3 + Math.floor(wave / 2),
    speed: 1.4 + wave * 0.015,
    boss: wave % 5 === 0,
  };
}

export interface EnemySpec {
  hp: number;
  power: number;
  speed: number;
  kind: EnemyKind;
}

// 波の敵リスト（uid / pos は呼び出し側で付与）。kind は index で決定的に割り当て。
export function buildWave(wave: number): EnemySpec[] {
  const s = waveSpec(wave);
  const list: EnemySpec[] = [];
  for (let i = 0; i < s.count; i++) {
    let kind: EnemyKind = 'normal';
    if (wave >= 3 && i % 4 === 3) kind = 'swift';
    else if (wave >= 4 && i % 5 === 4) kind = 'tank';
    const k = KIND[kind];
    list.push({
      hp: Math.round(s.hp * k.hpMul),
      power: s.power,
      speed: s.speed * k.speedMul,
      kind,
    });
  }
  if (s.boss) {
    const k = KIND.boss;
    list.push({
      hp: Math.round(s.hp * k.hpMul),
      power: s.power * 3,
      speed: s.speed * k.speedMul,
      kind: 'boss',
    });
  }
  return list;
}

/* ------------------------------------------------------------------ カード */
export interface CardDef {
  id: 'atk' | 'fast' | 'range' | 'heal' | 'gold' | 'levelup';
  icon: string;
  title: string;
  desc: string;
}

export const CARD_POOL: CardDef[] = [
  { id: 'atk', icon: '⚔', title: '星霜の祝福', desc: '全器具の攻撃 +25%' },
  { id: 'fast', icon: '⚡', title: '疾風の祝福', desc: '全器具の連射 +20%' },
  { id: 'range', icon: '🎯', title: '遠見の祝福', desc: '全器具の射程 +0.6' },
  { id: 'heal', icon: '❤', title: '癒しの祝福', desc: 'HP全回復 ＆ 最大HP +12' },
  { id: 'gold', icon: '🧭', title: '富貴の祝福', desc: '即時 +10G' },
  { id: 'levelup', icon: '✦', title: '昇格の祝福', desc: '盤上の器具を1つ +1Lv' },
];

export function pick3(rng: () => number = Math.random): CardDef[] {
  const pool = [...CARD_POOL];
  const out: CardDef[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
