// GRID STELLA — core domain types.

export type ItemType = 'weapon' | 'buff' | 'defense';
export type ItemKey = 'needle' | 'globe' | 'compass' | 'plumb' | 'coat';

/** Master definition of one instrument (shop item). */
export interface Item {
  key: ItemKey;
  icon: string;
  nameJa: string;
  nameEn: string;
  type: ItemType;
  /** footprint width / height in cells (unrotated) */
  w: number;
  h: number;
  attack?: number;
  cooldown?: number;
  cost: number;
  effect: string;
}

/** An item placed on the board at (x, y) with a rotation (0–3, 90° CW each). */
export interface PlacedItem {
  id: string;
  item: Item;
  x: number;
  y: number;
  rot: number;
}

/** A shop slot — a draw of one item with a unique id. */
export interface ShopSlot {
  slotId: string;
  item: Item;
}

export interface Enemy {
  nameJa: string;
  nameEn: string;
  hp: number;
  attack: number;
  cooldown: number;
  shield: number;
}

/** A weapon's resolved combat stats after synergies. */
export interface WeaponStat {
  id: string;
  key: ItemKey;
  icon: string;
  nameJa: string;
  finalAttack: number;
  finalCooldown: number;
  buffed: boolean;
}

export interface BoardStats {
  maxHp: number;
  shieldPerTick: number;
  weapons: WeaponStat[];
}

/** One sampled frame of the battle timeline. */
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
  history: BattleFrame[];
}

export type Cell = [number, number];
