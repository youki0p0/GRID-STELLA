// GRID STELLA — ARENA
// Bag-construction auto-battler core domain types.
// World: 方位観察官の天体調律盤 — instruments are placed on an observation board
// and resolve automatically against an opponent's mirror board.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** The three disciplines (jobs). Original to GRID STELLA's bureau theme. */
export type JobId = 'sentinel' | 'catalyst' | 'broker';

export type Mode = 'short' | 'long';

/** Tags drive synergy auras and build identity. */
export type Tag =
  | 'blade' // 刃 — fast weapons
  | 'heavy' // 重 — slow, heavy weapons
  | 'guard' // 盾 — defense / counter
  | 'toxin' // 毒 — poison
  | 'cinder' // 燼 — burn / bombs
  | 'hex' // 衰 — debuffs (slow / vuln)
  | 'coin' // 貨 — gold economy
  | 'relic' // 遺 — utility / consumable
  | 'mend'; // 癒 — healing

/** A periodic action an instrument performs in battle. */
export interface ItemAction {
  /** seconds between activations (before synergy speed) */
  cd: number;
  /** direct damage to the foe per activation */
  atk?: number;
  /** bonus crit chance for this action (0..1) */
  crit?: number;
  /** poison stacks applied to the foe */
  poison?: number;
  /** burn damage applied to the foe (a timed effect) */
  burn?: number;
  /** slow applied to the foe (adds to its cooldown multiplier) */
  slow?: number;
  /** vulnerability applied to the foe (adds to incoming-damage multiplier) */
  vuln?: number;
  /** shield gained by self */
  shield?: number;
  /** hp healed by self */
  heal?: number;
  /** flat shield/armor ignored on this hit */
  pierce?: number;
  /** atk scales with current run gold: atk += floor(gold / goldScale) */
  goldScale?: number;
}

/** A passive board synergy emitted by an instrument onto nearby instruments. */
export interface Aura {
  /** which instruments it touches */
  scope: 'self' | 'adj' | 'row' | 'col' | 'all';
  /** restrict to instruments carrying this tag */
  tag?: Tag;
  atkMul?: number; // multiply action atk
  cdMul?: number; // multiply cooldown (<1 = faster)
  critAdd?: number; // add crit chance
  poisonAdd?: number; // add poison stacks to toxin actions
  burnMul?: number; // multiply burn output
}

/** Master definition of one instrument. */
export interface Item {
  key: string;
  nameJa: string;
  nameEn: string;
  sprite: string; // sprite id (see Sprite.tsx)
  rarity: Rarity;
  /** null = common (any job); otherwise restricted to a discipline */
  job: JobId | null;
  cost: number;
  w: number; // footprint width (cells)
  h: number; // footprint height (cells)
  tags: Tag[];
  desc: string;
  action?: ItemAction;
  auras?: Aura[];
  /** flat bonus to the board's max HP */
  maxHp?: number;
}

/** An instrument placed on the board. */
export interface PlacedItem {
  id: string;
  key: string; // Item.key
  x: number;
  y: number;
  rot: 0 | 1; // 0 = unrotated, 1 = 90° (swaps w/h)
  level?: number; // merge tier (1..MAX_LEVEL); undefined = 1
}

export interface Job {
  id: JobId;
  nameJa: string;
  nameEn: string;
  sprite: string;
  tagline: string;
  desc: string;
  startingGold: number;
  startingHp: number;
  /** tactics surfaced on the job-select screen */
  tactics: { nameJa: string; desc: string }[];
  /** which tags this job's shop is biased toward */
  affinity: Tag[];
}

/* ── battle ── */

/** A resolved instrument ready to fire in the sim. */
export interface Module {
  key: string;
  nameJa: string;
  sprite: string;
  action: ItemAction;
  /** resolved atk after auras */
  atk: number;
  cd: number;
  crit: number;
}

export interface Combatant {
  name: string;
  maxHp: number;
  modules: Module[];
}

export interface BattleFrame {
  t: number;
  pHp: number;
  pShield: number;
  eHp: number;
  eShield: number;
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

/* ── run / rank ── */

export interface ModeConfig {
  mode: Mode;
  winsToCrown: number;
  lives: number;
  maxRounds: number;
  startGold: number;
  goldPerRound: number;
  /** how steeply the PvE/ghost opponent power scales per round */
  scale: number;
}

export interface RunState {
  mode: Mode;
  job: JobId;
  round: number;
  wins: number;
  lives: number;
  gold: number;
  hp: number;
  maxHp: number;
  board: PlacedItem[];
  bench: PlacedItem[]; // owned but unplaced
  rerolls: number;
}

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';

export interface RankState {
  shortRating: number;
  longRating: number;
  shortWins: number;
  longWins: number;
  shortPeak: number;
  longPeak: number;
}
