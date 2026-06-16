/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: slot-based gear system
 *
 * オブザーバーが持つ 8 部位スロット＋コアへのギア装備と、
 * 装備ボーナスの集計を行う純粋ロジック層。
 * スター倍率・ジェムボーナスはコールバックとして外部から注入するため、
 * stars.ts / gems.ts への依存を持たないスタンドアローンモジュール。
 * 副作用なし・外部ライブラリ不使用。永続化は呼び出し側が担う。
 * ========================================================================== */

import { type Rarity } from './engine';
import { type EquipBonuses, NEUTRAL_BONUS } from './equip';

/* ---------------------------------------------------------------- スロット定義 */

/** 装備スロット識別子（core + 8 部位 = 9 スロット）。 */
export type SlotId =
  | 'core'
  | 'compass'
  | 'sextant'
  | 'telescope'
  | 'cloak'
  | 'astrolabe'
  | 'chronometer'
  | 'lens'
  | 'quadrant';

/** スロット定義（表示名・アイコン付き）。 */
export interface SlotDef {
  id: SlotId;
  name: string;
  icon: string;
}

/** 全スロット定義（SlotId → SlotDef マップ）。 */
export const SLOTS: Record<SlotId, SlotDef> = {
  core:        { id: 'core',        name: 'コア',       icon: '⭐' },
  compass:     { id: 'compass',     name: '羅針盤',     icon: '🧭' },
  sextant:     { id: 'sextant',     name: '六分儀',     icon: '📐' },
  telescope:   { id: 'telescope',   name: '望遠鏡',     icon: '🔭' },
  cloak:       { id: 'cloak',       name: 'マント',     icon: '🧥' },
  astrolabe:   { id: 'astrolabe',   name: 'アストロラーベ', icon: '🌐' },
  chronometer: { id: 'chronometer', name: 'クロノメーター', icon: '⏱' },
  lens:        { id: 'lens',        name: 'レンズ',     icon: '🔍' },
  quadrant:    { id: 'quadrant',    name: '象限儀',     icon: '📏' },
};

/** スロット順序リスト（core 先頭、続いて 8 部位）。 */
export const SLOT_LIST: SlotDef[] = [
  SLOTS.core,
  SLOTS.compass,
  SLOTS.sextant,
  SLOTS.telescope,
  SLOTS.cloak,
  SLOTS.astrolabe,
  SLOTS.chronometer,
  SLOTS.lens,
  SLOTS.quadrant,
];

/* ---------------------------------------------------------------- レアリティ別ソケット数 */

/**
 * レアリティに応じたジェムソケット数を返す。
 *   common  → 0
 *   rare    → 1
 *   astral  → 2
 */
export function socketsForRarity(r: Rarity): number {
  switch (r) {
    case 'common': return 0;
    case 'rare':   return 1;
    case 'astral': return 2;
  }
}

/* ---------------------------------------------------------------- ギアデータ型 */

/**
 * 装備ギア1個。
 *   sockets の長さは socketsForRarity(rarity) に一致し、
 *   各要素は gemId（文字列）または null（空ソケット）。
 */
export interface Gear {
  id: string;
  slot: SlotId;
  name: string;
  icon: string;
  rarity: Rarity;
  star: number;
  sockets: (string | null)[];
  bonus: Partial<EquipBonuses>;
}

/** レガリア（保有ギア全体＋装備中スロットマッピング）。 */
export interface Regalia {
  /** 保有ギア一覧。 */
  owned: Gear[];
  /** 装備中マップ: SlotId → 装備している Gear の id。 */
  equipped: Partial<Record<SlotId, string>>;
}

/* ---------------------------------------------------------------- スターターギア */

/** 起動時に提供されるスターターギア群。各 id は安定不変。 */
export const STARTER_GEAR: Gear[] = [
  {
    id: 'starter-core-common',
    slot: 'core',
    name: '基礎コア',
    icon: '⭐',
    rarity: 'common',
    star: 1,
    sockets: [],
    bonus: { atkMul: 1.03 },
  },
  {
    id: 'starter-compass-common',
    slot: 'compass',
    name: '旅人の羅針盤',
    icon: '🧭',
    rarity: 'common',
    star: 1,
    sockets: [],
    bonus: { rangeBonus: 0.1, startGold: 1 },
  },
  {
    id: 'starter-lens-rare',
    slot: 'lens',
    name: '研磨レンズ',
    icon: '🔍',
    rarity: 'rare',
    star: 1,
    sockets: [null],
    bonus: { atkMul: 1.05, rangeBonus: 0.15 },
  },
  {
    id: 'starter-cloak-common',
    slot: 'cloak',
    name: '旅装マント',
    icon: '🧥',
    rarity: 'common',
    star: 1,
    sockets: [],
    bonus: { maxHpBonus: 5 },
  },
];

/** デフォルトレガリア（スターターギア所持・未装備状態）。 */
export const DEFAULT_REGALIA: Regalia = {
  owned: STARTER_GEAR.map((g) => ({ ...g, sockets: [...g.sockets] })),
  equipped: {},
};

/* ---------------------------------------------------------------- ボーナス計算 */

/**
 * ボーナス b を starMul でスケーリングして返す。
 *
 * スケーリング規則:
 *   - 乗算フィールド（*Mul）: 1 + (value - 1) * starMul
 *     （星1=等倍、星が上がるほど基準1からの乖離が拡大）
 *   - 加算フィールド（rangeBonus / startGold / maxHpBonus）: value * starMul
 */
function scaleBonusByStarMul(b: Partial<EquipBonuses>, starMul: number): Partial<EquipBonuses> {
  const out: Partial<EquipBonuses> = {};

  if (b.atkMul !== undefined)    out.atkMul    = 1 + (b.atkMul    - 1) * starMul;
  if (b.fireMul !== undefined)   out.fireMul   = 1 + (b.fireMul   - 1) * starMul;
  if (b.dustMul !== undefined)   out.dustMul   = 1 + (b.dustMul   - 1) * starMul;
  if (b.sellBonus !== undefined) out.sellBonus = 1 + (b.sellBonus - 1) * starMul;

  if (b.rangeBonus !== undefined)  out.rangeBonus  = b.rangeBonus  * starMul;
  if (b.startGold !== undefined)   out.startGold   = b.startGold   * starMul;
  if (b.maxHpBonus !== undefined)  out.maxHpBonus  = b.maxHpBonus  * starMul;

  return out;
}

/**
 * 2 つのボーナスを合成して完全な EquipBonuses を返す。
 *
 * 合成規則:
 *   - 乗算フィールド（atkMul / fireMul / dustMul / sellBonus）: 掛け合わせ。
 *   - 加算フィールド（rangeBonus / startGold / maxHpBonus）: 合算。
 *   - fireMul は最低 0.4 にクランプ（極端な短縮を防ぐ）。
 *   - b に未定義のフィールドは中立値（乗算=1、加算=0）として扱う。
 */
export function combineBonuses(a: EquipBonuses, b: Partial<EquipBonuses>): EquipBonuses {
  const atkMul    = a.atkMul    * (b.atkMul    ?? 1);
  const fireMul   = Math.max(0.4, a.fireMul * (b.fireMul ?? 1));
  const dustMul   = a.dustMul   * (b.dustMul   ?? 1);
  const sellBonus = a.sellBonus * (b.sellBonus  ?? 1);

  const rangeBonus  = a.rangeBonus  + (b.rangeBonus  ?? 0);
  const startGold   = a.startGold   + (b.startGold   ?? 0);
  const maxHpBonus  = a.maxHpBonus  + (b.maxHpBonus  ?? 0);

  return { atkMul, fireMul, rangeBonus, startGold, maxHpBonus, dustMul, sellBonus };
}

/**
 * 単一ギアのボーナスを計算して返す。
 *
 * ステップ:
 *  1. NEUTRAL_BONUS を出発点にする。
 *  2. ギア固有の bonus を starMul でスケーリングして適用。
 *  3. 装着済み各ジェムの gemBonus を順番に適用。
 *
 * @param g       対象ギア
 * @param starMul スター倍率（呼び出し側が stars.ts から取得して渡す）
 * @param gemBonus gemId から Partial<EquipBonuses> を返すコールバック
 */
export function gearBonus(
  g: Gear,
  starMul: number,
  gemBonus: (gemId: string) => Partial<EquipBonuses>,
): EquipBonuses {
  // ステップ1: 中立ボーナスから開始。
  let result: EquipBonuses = { ...NEUTRAL_BONUS };

  // ステップ2: ギア固有ボーナスをスター倍率でスケーリングして適用。
  const scaled = scaleBonusByStarMul(g.bonus, starMul);
  result = combineBonuses(result, scaled);

  // ステップ3: 装着ジェムのボーナスを順番に適用。
  for (const gemId of g.sockets) {
    if (gemId !== null) {
      result = combineBonuses(result, gemBonus(gemId));
    }
  }

  return result;
}

/**
 * レガリア全体（装備中ギアのみ）のボーナスを集計して返す。
 *
 * ステップ:
 *  1. 装備中スロットに対応する Gear を owned から検索。
 *  2. 見つかった各ギアの gearBonus を NEUTRAL_BONUS に順番に合成。
 *  3. 未装備スロットや dangling 参照（owned に存在しない id）は無視。
 *  4. 何も装備されていない場合は NEUTRAL_BONUS をそのまま返す。
 *
 * @param reg       レガリア
 * @param starMulOf star レベルからスター倍率を返すコールバック
 * @param gemBonus  gemId からボーナスを返すコールバック
 */
export function regaliaBonuses(
  reg: Regalia,
  starMulOf: (star: number) => number,
  gemBonus: (gemId: string) => Partial<EquipBonuses>,
): EquipBonuses {
  // owned の id → Gear マップを構築して O(1) で参照。
  const ownedMap = new Map<string, Gear>(reg.owned.map((g) => [g.id, g]));

  let result: EquipBonuses = { ...NEUTRAL_BONUS };
  let hasEquipped = false;

  for (const gearId of Object.values(reg.equipped)) {
    if (gearId === undefined) continue;
    const gear = ownedMap.get(gearId);
    if (gear === undefined) continue; // dangling 参照をスキップ。

    result = combineBonuses(result, gearBonus(gear, starMulOf(gear.star), gemBonus));
    hasEquipped = true;
  }

  return hasEquipped ? result : { ...NEUTRAL_BONUS };
}

/* ---------------------------------------------------------------- ユーティリティ */

/** 保有ギア一覧から id で Gear を検索する。見つからない場合は undefined。 */
export function gearById(reg: Regalia, id: string): Gear | undefined {
  return reg.owned.find((g) => g.id === id);
}

/* ---------------------------------------------------------------- シリアライズ */

/** バリデーション用: 有効な SlotId セット。 */
const VALID_SLOT_IDS = new Set<string>(Object.keys(SLOTS));

/** バリデーション用: 有効な Rarity セット。 */
const VALID_RARITIES = new Set<string>(['common', 'rare', 'astral']);

/**
 * Regalia を JSON 文字列に変換する。
 * 保有ギア一覧と装備マッピングをそのままシリアライズする。
 */
export function serializeRegalia(r: Regalia): string {
  return JSON.stringify(r);
}

/**
 * JSON 文字列から Regalia を復元する。安全な解析: 例外を一切投げない。
 *
 * 検証ルール（違反したギアは黙って除外）:
 *   - id が空でない文字列であること。
 *   - slot が有効な SlotId であること。
 *   - rarity が 'common' | 'rare' | 'astral' のいずれかであること。
 *   - star が正の整数（>= 1）であること。
 *   - sockets の長さが socketsForRarity(rarity) と一致すること。
 *   - sockets の各要素が文字列または null であること。
 *   - bonus がオブジェクト（null 不可）であること。
 *
 * equipped の検証:
 *   - キーが有効な SlotId であること。
 *   - 値が owned 内に存在する id であること（dangling 参照を除外）。
 *
 * 不正な JSON / null 入力の場合は DEFAULT_REGALIA を返す。
 */
export function parseRegalia(raw: string | null): Regalia {
  if (raw === null) return { owned: DEFAULT_REGALIA.owned.map((g) => ({ ...g, sockets: [...g.sockets] })), equipped: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { owned: DEFAULT_REGALIA.owned.map((g) => ({ ...g, sockets: [...g.sockets] })), equipped: {} };
    }

    const obj = parsed as Record<string, unknown>;

    // owned の検証・復元。
    const rawOwned = obj['owned'];
    const validOwned: Gear[] = [];
    const validIds = new Set<string>();

    if (Array.isArray(rawOwned)) {
      for (const item of rawOwned) {
        if (typeof item !== 'object' || item === null) continue;
        const g = item as Record<string, unknown>;

        const id      = g['id'];
        const slot    = g['slot'];
        const name    = g['name'];
        const icon    = g['icon'];
        const rarity  = g['rarity'];
        const star    = g['star'];
        const sockets = g['sockets'];
        const bonus   = g['bonus'];

        if (typeof id !== 'string' || id === '') continue;
        if (typeof slot !== 'string' || !VALID_SLOT_IDS.has(slot)) continue;
        if (typeof name !== 'string') continue;
        if (typeof icon !== 'string') continue;
        if (typeof rarity !== 'string' || !VALID_RARITIES.has(rarity)) continue;
        if (typeof star !== 'number' || !Number.isInteger(star) || star < 1) continue;
        if (!Array.isArray(sockets)) continue;

        const rarityTyped = rarity as Rarity;
        const expectedSockets = socketsForRarity(rarityTyped);
        if (sockets.length !== expectedSockets) continue;

        // 各ソケット要素の検証。
        const socketsTyped: (string | null)[] = [];
        let socketValid = true;
        for (const s of sockets) {
          if (s === null || typeof s === 'string') {
            socketsTyped.push(s);
          } else {
            socketValid = false;
            break;
          }
        }
        if (!socketValid) continue;

        if (typeof bonus !== 'object' || bonus === null || Array.isArray(bonus)) continue;

        // bonus フィールドの数値検証（未知フィールドは無視）。
        const bonusObj = bonus as Record<string, unknown>;
        const validBonus: Partial<EquipBonuses> = {};
        const numericFields = ['atkMul', 'fireMul', 'rangeBonus', 'startGold', 'maxHpBonus', 'dustMul', 'sellBonus'] as const;
        for (const field of numericFields) {
          const v = bonusObj[field];
          if (v !== undefined) {
            if (typeof v !== 'number') { socketValid = false; break; }
            validBonus[field] = v;
          }
        }
        if (!socketValid) continue;

        const gear: Gear = {
          id,
          slot: slot as SlotId,
          name,
          icon,
          rarity: rarityTyped,
          star,
          sockets: socketsTyped,
          bonus: validBonus,
        };
        validOwned.push(gear);
        validIds.add(id);
      }
    }

    // equipped の検証・復元。
    const rawEquipped = obj['equipped'];
    const validEquipped: Partial<Record<SlotId, string>> = {};

    if (typeof rawEquipped === 'object' && rawEquipped !== null && !Array.isArray(rawEquipped)) {
      const eqObj = rawEquipped as Record<string, unknown>;
      for (const [slotKey, gearId] of Object.entries(eqObj)) {
        if (!VALID_SLOT_IDS.has(slotKey)) continue;
        if (typeof gearId !== 'string') continue;
        if (!validIds.has(gearId)) continue; // dangling 参照を除外。
        validEquipped[slotKey as SlotId] = gearId;
      }
    }

    return { owned: validOwned, equipped: validEquipped };
  } catch {
    return { owned: DEFAULT_REGALIA.owned.map((g) => ({ ...g, sockets: [...g.sockets] })), equipped: {} };
  }
}
