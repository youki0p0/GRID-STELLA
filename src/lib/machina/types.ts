// 神楽マキナ — 機械神の回路 :: domain types (CANONICAL Ver0.2, see docs/MACHINA.md).
// Circuit-building auto-battler. This file is the shared CONTRACT every module
// codes against — keep export names/shapes stable.

export type JobId = 'striker' | 'gunner' | 'caster';
export type Mode = 'short' | 'long';

/** 5 standard rarities; unique items are flagged via Item.unique. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** Item categories — effects can reference these. */
export type ItemCategory = 'melee' | 'ranged' | 'accessory' | 'armor';

/** Shared, small status-effect set (全ジョブ共通). */
export type StatusKey = 'overvolt' | 'virus' | 'jam' | 'freeze' | 'memleak' | 'crash';
export const STACK_STATUSES: StatusKey[] = ['overvolt', 'virus', 'jam', 'freeze', 'memleak'];
export type StatusState = Record<StatusKey, number>;

/** A status application; `chance` 0..1 defaults to 1 (always). */
export interface StatusApply {
  status: StatusKey;
  amount: number;
  chance?: number;
}

/** A periodic weapon. Fires when CD elapsed AND energy >= cost. */
export interface Weapon {
  dmg: number;
  cd: number; // seconds
  energy: number; // cost per activation (stamina)
  accuracy?: number; // 0..1 base hit chance (default 1)
  crit?: number; // 0..1 base crit chance
  critMult?: number; // crit damage multiplier (e.g. 1.5 = 150%); default 2
  pierce?: number; // shield ignored
  applies?: StatusApply[]; // chance-based status application
  detonate?: { status: StatusKey; perStack: number }; // 起爆 (striker)
  reference?: { status: StatusKey; mult: number }; // 参照 (caster)
  selfShield?: number;
  heal?: number;
}

/** Buff a whole category of equipped items. */
export interface CategoryBuff {
  category: ItemCategory;
  dmg?: number; // flat weapon dmg + for that category
  hastePct?: number; // speed +% for that category
  crit?: number; // crit + for that category
}

/** Scale a stat by how many items of a category are equipped. */
export interface CountScaling {
  category: ItemCategory;
  shieldPer?: number;
  hpPer?: number;
  powerPer?: number;
}

/** Passive board contribution of an accessory/armor (support) module. */
export interface Support {
  power?: number; // 強化 flat weapon dmg+
  haste?: number; // 加速 speed +% (0.1 = +10%)
  maxEnergy?: number; // 最大エネルギー +
  energyRegen?: number; // エネルギー回復 +/s
  crit?: number; // クリ率 +
  critDmg?: number; // クリダメ + (added to crit multiplier)
  accuracy?: number; // 命中 +
  shieldStart?: number; // 戦闘開始時シールド
  thorns?: number; // トゲ 固定反射
  firewall?: boolean; // ファイアウォール デバフ無効
  hp?: number; // 最大HP +
  categoryBuffs?: CategoryBuff[]; // type-referencing buffs
  countScaling?: CountScaling[]; // count-referencing buffs
}

export interface Item {
  key: string;
  nameJa: string;
  nameEn: string;
  sprite: string;
  rarity: Rarity;
  job: JobId | null; // null = common
  category: ItemCategory | null; // null = pure grid/relic style (rare)
  cost: number;
  w: number;
  h: number;
  tags: string[];
  desc: string;
  weapon?: Weapon;
  support?: Support;
  unique?: boolean; // unique special item (R5 pick)
}

export interface PlacedItem {
  id: string;
  key: string;
  x: number;
  y: number;
  rot: 0 | 1;
  level?: number; // merge progression marker (kept for compat; Ver0.2 uses recipes)
}

/* ── two-layer grid ── */
export type TileKind = 'plain' | 'shield' | 'clock' | 'battery' | 'power';

export interface TileDef {
  kind: TileKind;
  w: number;
  h: number;
  nameJa: string;
  desc: string;
}

export interface PlacedTile {
  id: string;
  kind: TileKind;
  x: number;
  y: number;
  rot: 0 | 1;
}

/** Aggregated tile-layer bonuses for a board. */
export interface TileBonuses {
  maxEnergy: number; // battery tiles
  startShield: number; // shield tiles
  hasteItemIds: Set<string>; // items overlapping a clock tile
  critItemIds: Set<string>; // items overlapping a power tile
}

/* ── recipes / merge (Ver0.2 adjacency-material fusion) ── */
export interface Recipe {
  base: string; // base item key
  material: string; // material item key placed adjacent
  result: string; // fused result key
}

/* ── jobs ── */
export interface Job {
  id: JobId;
  nameJa: string;
  nameEn: string;
  sprite: string;
  role: string;
  tagline: string;
  desc: string;
  favors: StatusKey[];
  style: 'detonate' | 'accumulate' | 'reference';
  startingHp: number;
  startingGold: number;
  startingWeapon: string; // job's initial weapon key (育成の起点)
  tactics: { nameJa: string; desc: string }[];
}

/* ── battle ── */
export interface Module {
  id: string;
  key: string;
  nameJa: string;
  sprite: string;
  category: ItemCategory | null;
  weapon: Weapon;
  haste: boolean; // on a clock tile
  critBonus: number; // from power tile
}

export interface Combatant {
  name: string;
  job: JobId;
  maxHp: number;
  maxEnergy: number;
  energyRegen: number;
  startShield: number;
  baseCrit: number;
  baseCritDmg: number;
  baseAccuracy: number;
  hasteMul: number;
  thorns: number;
  firewall: boolean;
  modules: Module[];
}

export interface BattleFrame {
  t: number;
  pHp: number;
  pShield: number;
  pEnergy: number;
  eHp: number;
  eShield: number;
  eEnergy: number;
}

export type BattleResult = 'win' | 'lose' | 'draw';

export interface BattleSim {
  result: BattleResult;
  logs: string[];
  frames: BattleFrame[];
  pHp: number;
  eHp: number;
  pMaxHp: number;
  eMaxHp: number;
}

export interface ModeConfig {
  mode: Mode;
  winsToCrown: number;
  lives: number;
  maxRounds: number;
  startGold: number;
  goldPerRound: number;
  scale: number;
}
