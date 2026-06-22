// 神楽マキナ — 機械神の回路 :: domain types (CANONICAL, see docs/MACHINA.md).
// A circuit-building auto-battler: weapons & support modules draw energy from a
// core. Jobs differ only by how they use shared status effects (accumulate /
// detonate / reference), never by bespoke per-job rules.

export type JobId = 'striker' | 'gunner' | 'caster';
export type Mode = 'short' | 'long';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Shared, small status-effect set (全ジョブ共通). */
export type StatusKey =
  | 'overvolt' // 過電圧 — target takes +1% damage per stack (stacks)
  | 'virus' // ウイルス — damage over time (stacks)
  | 'jam' // ジャミング — accuracy down (stacks)
  | 'freeze' // フリーズ — item speed down (stacks)
  | 'memleak' // メモリリーク — energy regen disruption (stacks)
  | 'crash'; // クラッシュ — stop an enemy item for a duration (no stack)

export const STACK_STATUSES: StatusKey[] = ['overvolt', 'virus', 'jam', 'freeze', 'memleak'];

/** Live status amounts on a combatant. */
export type StatusState = Record<StatusKey, number>;

/** Grid tile kinds. Tiles must chain back to the core to be powered. */
export type TileKind = 'core' | 'plain' | 'shield' | 'clock' | 'battery' | 'power';

/** A periodic weapon. Fires when CD elapsed AND energy >= cost. */
export interface Weapon {
  dmg: number;
  cd: number; // seconds
  energy: number; // cost per activation
  accuracy?: number; // base hit chance 0..1 (default 1)
  crit?: number; // base crit chance bonus 0..1
  critDmg?: number; // crit damage multiplier bonus (added to base 2x as +x)
  pierce?: number; // shield ignored on hit
  /** statuses applied to the foe on hit */
  applies?: { status: StatusKey; amount: number }[];
  /** 起爆 (striker): consume the foe's stacks of `status`, dealing perStack each */
  detonate?: { status: StatusKey; perStack: number };
  /** 参照 (caster): bonus damage = foe's current `status` value × mult */
  reference?: { status: StatusKey; mult: number };
  /** self effects */
  selfShield?: number;
  heal?: number;
}

/** Passive board contribution of a support module. */
export interface Support {
  power?: number; // 強化 — flat weapon dmg +
  haste?: number; // 加速 — speed +% (e.g. 0.1)
  maxEnergy?: number; // 最大エネルギー +
  energyRegen?: number; // エネルギー回復 +/s
  crit?: number; // クリティカル率 +
  critDmg?: number; // クリティカルダメージ +
  accuracy?: number; // 命中 +
  shieldStart?: number; // 戦闘開始時シールド
  thorns?: number; // トゲ — fixed reflect on being hit
  firewall?: boolean; // ファイアウォール — immune to new debuffs
  hp?: number; // bonus max HP
}

export interface Item {
  key: string;
  nameJa: string;
  nameEn: string;
  sprite: string;
  rarity: Rarity;
  job: JobId | null; // null = common (all jobs)
  cost: number;
  w: number;
  h: number;
  tags: string[];
  desc: string;
  weapon?: Weapon;
  support?: Support;
}

export interface PlacedItem {
  id: string;
  key: string;
  x: number;
  y: number;
  rot: 0 | 1;
  level?: number; // merge tier
}

export interface Job {
  id: JobId;
  nameJa: string;
  nameEn: string;
  sprite: string;
  role: string;
  tagline: string;
  desc: string;
  /** which shared statuses this job leans on */
  favors: StatusKey[];
  /** how it uses statuses */
  style: 'detonate' | 'accumulate' | 'reference';
  startingHp: number;
  startingGold: number;
  tactics: { nameJa: string; desc: string }[];
}

/* ── battle ── */
export interface Module {
  key: string;
  nameJa: string;
  sprite: string;
  weapon: Weapon;
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
