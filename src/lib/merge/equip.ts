/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: equipment board layer
 *
 * 所持している器具ピース（同一テトロミノ形状）を小型の永続盤面に配置し、
 * 全ランに適用される恒久パッシブボーナスを計算する純粋ロジック層。
 * 副作用なし・外部ライブラリ不使用。永続化は呼び出し側が担う。
 * ========================================================================== */

import { type TypeId } from './engine';
import { type Rot, SHAPES, footprint, canPlace, cellKey } from './shapes';

/* ---------------------------------------------------------------- ボードサイズ */

/** 装備ボードの一辺セル数（4×4）。 */
export const EQUIP_N = 4;

/* ---------------------------------------------------------------- データ型 */

/** ボード上に配置された器具ピース1個。 */
export interface GearPiece {
  uid: string;
  type: TypeId;
  rot: Rot;
  anchor: { r: number; c: number };
}

/** 装備ボード全体。uid → GearPiece のマップ。 */
export type EquipBoard = Record<string, GearPiece>;

/** 空の装備ボード（初期値）。 */
export const DEFAULT_EQUIP: EquipBoard = {};

/* ---------------------------------------------------------------- セル操作 */

/**
 * ピースが占有するボード上の絶対セル座標配列を返す。
 * footprint(SHAPES[type], rot, anchor) に委譲。
 */
export function equipCells(p: GearPiece): { r: number; c: number }[] {
  return footprint(SHAPES[p.type], p.rot, p.anchor);
}

/**
 * ボード上のすべての占有セルキーを返す。
 * ignore に uid を渡すとそのピースを除外して計算する（ドラッグ移動用）。
 */
export function occupied(board: EquipBoard, ignore?: string): Set<string> {
  const set = new Set<string>();
  for (const [uid, piece] of Object.entries(board)) {
    if (uid === ignore) continue;
    for (const { r, c } of equipCells(piece)) {
      set.add(cellKey(r, c));
    }
  }
  return set;
}

/**
 * 指定したピースを配置可能か検証する。
 * EQUIP_N 内に収まり、occupied(board, ignore) と重ならない場合に true。
 */
export function canEquip(
  board: EquipBoard,
  type: TypeId,
  rot: Rot,
  anchor: { r: number; c: number },
  ignore?: string,
): boolean {
  return canPlace(SHAPES[type], rot, anchor, EQUIP_N, occupied(board, ignore));
}

/* ---------------------------------------------------------------- ボーナス型 */

/** 装備ボーナスの集計結果。乗算フィールドは掛け合わせ、加算フィールドは合算する。 */
export interface EquipBonuses {
  /** 全器具の攻撃倍率（乗算、基準 1.0）。 */
  atkMul: number;
  /** 全器具の連射速度倍率（乗算、基準 1.0 = 変化なし; < 1.0 で間隔短縮）。 */
  fireMul: number;
  /** 全器具の射程加算（セル単位）。 */
  rangeBonus: number;
  /** ラン開始時の追加所持金。 */
  startGold: number;
  /** 最大 HP 加算。 */
  maxHpBonus: number;
  /** ダスト（素材）ドロップ倍率（乗算、基準 1.0）。 */
  dustMul: number;
  /** 器具売却額倍率（乗算、基準 1.0）。 */
  sellBonus: number;
}

/** ボーナスが何も乗っていない中立状態（全倍率 1、全加算 0）。 */
export const NEUTRAL_BONUS: EquipBonuses = {
  atkMul: 1,
  fireMul: 1,
  rangeBonus: 0,
  startGold: 0,
  maxHpBonus: 0,
  dustMul: 1,
  sellBonus: 1,
};

/* ---------------------------------------------------------------- 器具別ボーナス定義 */

/**
 * 各器具タイプが1ピース配置されるごとに付与するボーナス。
 *
 * 乗算フィールド（*Mul）は NEUTRAL_BONUS を基準に掛け合わせる。
 * 加算フィールド（*Bonus / startGold）は合算する。
 *
 * テーマ:
 *   needle    … 観測針: 攻撃力強化（速射タイプ）
 *   hourglass … 星時計: 連射間隔短縮（interval × 0.97 = 3% 速くなる）
 *   compass   … 羅針盤: 万能型・攻撃 & 射程
 *   globe     … 天球儀: 連射強化・ダスト増量
 *   telescope … 望遠鏡: 射程延伸・開始所持金ボーナス
 *   armillary … 環状儀: 最大攻撃・売却強化 & HP 補強
 */
export const GEAR_BONUS: Record<TypeId, Partial<EquipBonuses>> = {
  // 観測針: 攻撃 +6%、開始ゴールド +2G
  needle: { atkMul: 1.06, startGold: 2 },
  // 星時計: 連射間隔 ×0.97（3% 短縮）、ダスト ×1.05
  hourglass: { fireMul: 0.97, dustMul: 1.05 },
  // 羅針盤: 攻撃 +5%、射程 +0.1
  compass: { atkMul: 1.05, rangeBonus: 0.1 },
  // 天球儀: 連射間隔 ×0.96（4% 短縮）、ダスト ×1.08
  globe: { fireMul: 0.96, dustMul: 1.08 },
  // 望遠鏡: 射程 +0.4、開始ゴールド +5G、売却ボーナス ×1.04
  telescope: { rangeBonus: 0.4, startGold: 5, sellBonus: 1.04 },
  // 環状儀: 攻撃 +8%、最大 HP +6、売却ボーナス ×1.06
  armillary: { atkMul: 1.08, maxHpBonus: 6, sellBonus: 1.06 },
};

/* ---------------------------------------------------------------- ボーナス計算 */

/**
 * 装備ボード全体のパッシブボーナスを集計して返す。
 *
 * ステップ:
 *  1. NEUTRAL_BONUS を出発点にする。
 *  2. 各 GearPiece の GEAR_BONUS[type] を適用する。
 *     - *Mul フィールドは掛け合わせ（積算）。
 *     - 加算フィールド（rangeBonus / startGold / maxHpBonus）は加算。
 *     - sellBonus / dustMul も乗算。
 *  3. フィルボーナス:
 *     - 占有セル1個ごとに +1 startGold。
 *     - EQUIP_N ボードの完全な行または列ごとに +3 maxHpBonus。
 *  4. fireMul は最低 0.5 にクランプ（極端な短縮を防ぐ）。
 *  5. 空ボードなら NEUTRAL_BONUS をそのまま返す。
 */
export function equipBonuses(board: EquipBoard): EquipBonuses {
  const pieces = Object.values(board);
  if (pieces.length === 0) return { ...NEUTRAL_BONUS };

  let atkMul = 1;
  let fireMul = 1;
  let rangeBonus = 0;
  let startGold = 0;
  let maxHpBonus = 0;
  let dustMul = 1;
  let sellBonus = 1;

  // ステップ2: 器具ごとのボーナスを適用する。
  for (const piece of pieces) {
    const b = GEAR_BONUS[piece.type];
    if (b.atkMul !== undefined) atkMul *= b.atkMul;
    if (b.fireMul !== undefined) fireMul *= b.fireMul;
    if (b.rangeBonus !== undefined) rangeBonus += b.rangeBonus;
    if (b.startGold !== undefined) startGold += b.startGold;
    if (b.maxHpBonus !== undefined) maxHpBonus += b.maxHpBonus;
    if (b.dustMul !== undefined) dustMul *= b.dustMul;
    if (b.sellBonus !== undefined) sellBonus *= b.sellBonus;
  }

  // ステップ3: フィルボーナスの計算。
  // 占有セルをすべて列挙する。
  const allCells = pieces.flatMap(equipCells);
  const cellCount = allCells.length;

  // 占有セル1個ごとに +1 startGold。
  startGold += cellCount;

  // 行・列のフル埋まりチェック（EQUIP_N = 4 なので各行/列に4セル必要）。
  // 各行に何列あるか集計する。
  const rowFill = new Array<number>(EQUIP_N).fill(0);
  const colFill = new Array<number>(EQUIP_N).fill(0);
  for (const { r, c } of allCells) {
    if (r >= 0 && r < EQUIP_N && c >= 0 && c < EQUIP_N) {
      rowFill[r]++;
      colFill[c]++;
    }
  }
  for (let i = 0; i < EQUIP_N; i++) {
    if (rowFill[i] >= EQUIP_N) maxHpBonus += 3;
    if (colFill[i] >= EQUIP_N) maxHpBonus += 3;
  }

  // ステップ4: fireMul を最低 0.5 にクランプ。
  fireMul = Math.max(0.5, fireMul);

  return { atkMul, fireMul, rangeBonus, startGold, maxHpBonus, dustMul, sellBonus };
}

/* ---------------------------------------------------------------- シリアライズ */

/** バリデーション用: Rot の有効値セット。 */
const VALID_ROTS = new Set<number>([0, 90, 180, 270]);

/** バリデーション用: TypeId の有効値セット。 */
const VALID_TYPE_IDS = new Set<string>(
  Object.keys(SHAPES) as TypeId[],
);

/**
 * 装備ボードを JSON 文字列に変換する。
 * ピースの配置情報（uid / type / rot / anchor）をそのままシリアライズする。
 */
export function serializeEquip(b: EquipBoard): string {
  return JSON.stringify(Object.values(b));
}

/**
 * JSON 文字列から装備ボードを復元する。安全な解析: 例外を一切投げない。
 *
 * 検証ルール（違反したピースは黙って除外）:
 *  - uid が文字列であること。
 *  - type が有効な TypeId であること。
 *  - rot が 0 / 90 / 180 / 270 のいずれかであること。
 *  - anchor.r / anchor.c が整数であること。
 *  - EQUIP_N 内に収まること（inBounds）。
 *  - 先に通過済みのピースと重なっていないこと。
 *
 * 不正な JSON / null 入力の場合は DEFAULT_EQUIP を返す。
 */
export function parseEquip(raw: string | null): EquipBoard {
  if (raw === null) return { ...DEFAULT_EQUIP };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ...DEFAULT_EQUIP };

    const result: EquipBoard = {};
    const usedCells = new Set<string>();

    for (const item of parsed) {
      // 基本型チェック。
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;

      const uid = obj['uid'];
      const type = obj['type'];
      const rot = obj['rot'];
      const anchor = obj['anchor'];

      if (typeof uid !== 'string' || uid === '') continue;
      if (typeof type !== 'string' || !VALID_TYPE_IDS.has(type)) continue;
      if (typeof rot !== 'number' || !VALID_ROTS.has(rot)) continue;
      if (
        typeof anchor !== 'object' ||
        anchor === null ||
        typeof (anchor as Record<string, unknown>)['r'] !== 'number' ||
        typeof (anchor as Record<string, unknown>)['c'] !== 'number'
      ) continue;

      const anchorObj = anchor as { r: number; c: number };
      if (!Number.isInteger(anchorObj.r) || !Number.isInteger(anchorObj.c)) continue;

      const piece: GearPiece = {
        uid,
        type: type as TypeId,
        rot: rot as Rot,
        anchor: anchorObj,
      };

      // 境界チェックと重複チェック。
      const cells = equipCells(piece);
      const inBoundsCheck = cells.every(
        ({ r, c }) => r >= 0 && r < EQUIP_N && c >= 0 && c < EQUIP_N,
      );
      if (!inBoundsCheck) continue;

      const overlapping = cells.some(({ r, c }) => usedCells.has(cellKey(r, c)));
      if (overlapping) continue;

      // 有効なピースを登録する。
      for (const { r, c } of cells) {
        usedCells.add(cellKey(r, c));
      }
      result[uid] = piece;
    }

    return result;
  } catch {
    return { ...DEFAULT_EQUIP };
  }
}
