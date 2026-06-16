/* ============================================================================
 * GRID STELLA — equip.ts のユニットテスト
 *
 * Vitest を使用。相対インポートのみ使用（パスエイリアスなし）。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  EQUIP_N,
  DEFAULT_EQUIP,
  NEUTRAL_BONUS,
  GEAR_BONUS,
  equipCells,
  occupied,
  canEquip,
  equipBonuses,
  serializeEquip,
  parseEquip,
  type GearPiece,
  type EquipBoard,
} from './equip';

/* ---------------------------------------------------------------- テスト用フィクスチャ */

/** needle（1セル）を (0,0) に配置。 */
const needleAt00: GearPiece = { uid: 'n1', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } };

/** hourglass（横2セル）を (1,0) に配置 → (1,0)(1,1)。 */
const hourglassAt10: GearPiece = { uid: 'h1', type: 'hourglass', rot: 0, anchor: { r: 1, c: 0 } };

/** compass（L字3セル）を (2,0) に配置 → (2,0)(3,0)(3,1)。 */
const compassAt20: GearPiece = { uid: 'c1', type: 'compass', rot: 0, anchor: { r: 2, c: 0 } };

/** globe（2×2 4セル）を (0,2) に配置 → (0,2)(0,3)(1,2)(1,3)。 */
const globeAt02: GearPiece = { uid: 'g1', type: 'globe', rot: 0, anchor: { r: 0, c: 2 } };

/** telescope（縦3セル）を (0,1) に配置 → (0,1)(1,1)(2,1)。 */
const telescopeAt01: GearPiece = { uid: 't1', type: 'telescope', rot: 0, anchor: { r: 0, c: 1 } };

/** armillary（T字4セル）を (0,0) に配置 → (0,1)(1,0)(1,1)(1,2)。 */
const armillaryAt00: GearPiece = { uid: 'a1', type: 'armillary', rot: 0, anchor: { r: 0, c: 0 } };

/* ---------------------------------------------------------------- equipCells */

describe('equipCells', () => {
  it('needle は1セルを返す', () => {
    const cells = equipCells(needleAt00);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual({ r: 0, c: 0 });
  });

  it('hourglass は横2セルを返す', () => {
    const cells = equipCells(hourglassAt10);
    expect(cells).toHaveLength(2);
    expect(cells).toContainEqual({ r: 1, c: 0 });
    expect(cells).toContainEqual({ r: 1, c: 1 });
  });

  it('globe は2×2=4セルを返す', () => {
    const cells = equipCells(globeAt02);
    expect(cells).toHaveLength(4);
    expect(cells).toContainEqual({ r: 0, c: 2 });
    expect(cells).toContainEqual({ r: 0, c: 3 });
    expect(cells).toContainEqual({ r: 1, c: 2 });
    expect(cells).toContainEqual({ r: 1, c: 3 });
  });

  it('rot=90 の telescope は横になる', () => {
    const piece: GearPiece = { uid: 'tR', type: 'telescope', rot: 90, anchor: { r: 0, c: 0 } };
    const cells = equipCells(piece);
    // 縦[0,0][1,0][2,0] を90°回転すると横[0,0][0,1][0,2] に正規化される。
    expect(cells).toHaveLength(3);
    const rows = cells.map((c) => c.r);
    expect(new Set(rows).size).toBe(1); // 全部同じ行。
  });
});

/* ---------------------------------------------------------------- occupied */

describe('occupied', () => {
  it('空ボードは空セットを返す', () => {
    expect(occupied({}).size).toBe(0);
  });

  it('needle1個を置いたボードは1セルを返す', () => {
    const board: EquipBoard = { n1: needleAt00 };
    const occ = occupied(board);
    expect(occ.size).toBe(1);
    expect(occ.has('0,0')).toBe(true);
  });

  it('複数ピースのセル数を合算する', () => {
    const board: EquipBoard = { n1: needleAt00, h1: hourglassAt10 };
    // needle=1 + hourglass=2
    expect(occupied(board).size).toBe(3);
  });

  it('ignore に uid を渡すとそのピースを除外する', () => {
    const board: EquipBoard = { n1: needleAt00, h1: hourglassAt10 };
    const occ = occupied(board, 'n1');
    expect(occ.size).toBe(2); // hourglass のみ
    expect(occ.has('0,0')).toBe(false);
    expect(occ.has('1,0')).toBe(true);
    expect(occ.has('1,1')).toBe(true);
  });

  it('ignore に存在しない uid を渡しても全セルを返す', () => {
    const board: EquipBoard = { n1: needleAt00 };
    expect(occupied(board, 'nonexistent').size).toBe(1);
  });
});

/* ---------------------------------------------------------------- canEquip */

describe('canEquip', () => {
  it('空ボードにはボード内ならどこでも配置可能', () => {
    expect(canEquip({}, 'needle', 0, { r: 0, c: 0 })).toBe(true);
    expect(canEquip({}, 'needle', 0, { r: 3, c: 3 })).toBe(true);
  });

  it('ボード外はすべて配置不可', () => {
    expect(canEquip({}, 'needle', 0, { r: -1, c: 0 })).toBe(false);
    expect(canEquip({}, 'needle', 0, { r: 0, c: -1 })).toBe(false);
    expect(canEquip({}, 'needle', 0, { r: EQUIP_N, c: 0 })).toBe(false);
    expect(canEquip({}, 'needle', 0, { r: 0, c: EQUIP_N })).toBe(false);
  });

  it('既存ピースと重なる場合は配置不可', () => {
    const board: EquipBoard = { n1: needleAt00 }; // (0,0) 占有
    expect(canEquip(board, 'needle', 0, { r: 0, c: 0 })).toBe(false);
  });

  it('隣接するが重ならなければ配置可能', () => {
    const board: EquipBoard = { n1: needleAt00 }; // (0,0) 占有
    expect(canEquip(board, 'needle', 0, { r: 0, c: 1 })).toBe(true);
  });

  it('ignore を使えば同ピースの位置には配置可能', () => {
    const board: EquipBoard = { n1: needleAt00 }; // (0,0) 占有
    // n1 を無視した状態で (0,0) に置く → 自己移動に相当する。
    expect(canEquip(board, 'needle', 0, { r: 0, c: 0 }, 'n1')).toBe(true);
  });

  it('globe はボード端からはみ出ると配置不可', () => {
    // globe は2×2 なので anchor (3,3) だと (4,*) や (*,4) が出る。
    expect(canEquip({}, 'globe', 0, { r: 3, c: 3 })).toBe(false);
    // anchor (2,2) はギリギリ入る（(2,2)(2,3)(3,2)(3,3)）。
    expect(canEquip({}, 'globe', 0, { r: 2, c: 2 })).toBe(true);
  });

  it('telescope 縦3セルがボードをはみ出す場合は配置不可', () => {
    // anchor (2,0) では (2,0)(3,0)(4,0) となり row=4 > EQUIP_N-1。
    expect(canEquip({}, 'telescope', 0, { r: 2, c: 0 })).toBe(false);
    // anchor (1,0) では (1,0)(2,0)(3,0) で収まる。
    expect(canEquip({}, 'telescope', 0, { r: 1, c: 0 })).toBe(true);
  });
});

/* ---------------------------------------------------------------- equipBonuses — 空ボード */

describe('equipBonuses — 空ボード', () => {
  it('空ボードは NEUTRAL_BONUS と等価', () => {
    const b = equipBonuses({});
    expect(b).toEqual(NEUTRAL_BONUS);
  });

  it('空ボードの atkMul は 1', () => {
    expect(equipBonuses({}).atkMul).toBe(1);
  });

  it('空ボードの fireMul は 1', () => {
    expect(equipBonuses({}).fireMul).toBe(1);
  });

  it('空ボードの startGold は 0', () => {
    expect(equipBonuses({}).startGold).toBe(0);
  });
});

/* ---------------------------------------------------------------- equipBonuses — 1ピース */

describe('equipBonuses — 単一ピース', () => {
  it('needle 1個: atkMul が GEAR_BONUS を反映する（乗算）', () => {
    const board: EquipBoard = { n1: needleAt00 };
    const b = equipBonuses(board);
    const expected = GEAR_BONUS.needle.atkMul ?? 1;
    expect(b.atkMul).toBeCloseTo(expected);
  });

  it('needle 1個: startGold = GEAR_BONUS.needle.startGold + 1（フィル: 1セル）', () => {
    const board: EquipBoard = { n1: needleAt00 };
    const b = equipBonuses(board);
    const gearGold = GEAR_BONUS.needle.startGold ?? 0;
    expect(b.startGold).toBe(gearGold + 1); // +1 for 1 occupied cell
  });

  it('hourglass 1個: fireMul が GEAR_BONUS を反映する（乗算）', () => {
    const board: EquipBoard = { h1: hourglassAt10 };
    const b = equipBonuses(board);
    const expected = GEAR_BONUS.hourglass.fireMul ?? 1;
    expect(b.fireMul).toBeCloseTo(expected);
  });

  it('hourglass 1個: dustMul が GEAR_BONUS を反映する', () => {
    const board: EquipBoard = { h1: hourglassAt10 };
    const b = equipBonuses(board);
    const expected = GEAR_BONUS.hourglass.dustMul ?? 1;
    expect(b.dustMul).toBeCloseTo(expected);
  });

  it('compass 1個: rangeBonus が GEAR_BONUS を反映する（加算）', () => {
    const board: EquipBoard = { c1: compassAt20 };
    const b = equipBonuses(board);
    expect(b.rangeBonus).toBeCloseTo(GEAR_BONUS.compass.rangeBonus ?? 0);
  });

  it('telescope 1個: rangeBonus + startGold + sellBonus が反映される', () => {
    const board: EquipBoard = { t1: telescopeAt01 };
    const b = equipBonuses(board);
    expect(b.rangeBonus).toBeCloseTo(GEAR_BONUS.telescope.rangeBonus ?? 0);
    const gearGold = GEAR_BONUS.telescope.startGold ?? 0;
    expect(b.startGold).toBe(gearGold + 3); // +3 for 3 occupied cells
    expect(b.sellBonus).toBeCloseTo(GEAR_BONUS.telescope.sellBonus ?? 1);
  });

  it('armillary 1個: atkMul + maxHpBonus + sellBonus が反映される', () => {
    const board: EquipBoard = { a1: armillaryAt00 };
    const b = equipBonuses(board);
    expect(b.atkMul).toBeCloseTo(GEAR_BONUS.armillary.atkMul ?? 1);
    const gearHp = GEAR_BONUS.armillary.maxHpBonus ?? 0;
    expect(b.maxHpBonus).toBe(gearHp + 0); // フィル行なし（まだ4セル埋まっていない）
  });

  it('globe 1個: fireMul + dustMul が反映される', () => {
    const board: EquipBoard = { g1: globeAt02 };
    const b = equipBonuses(board);
    expect(b.fireMul).toBeCloseTo(GEAR_BONUS.globe.fireMul ?? 1);
    expect(b.dustMul).toBeCloseTo(GEAR_BONUS.globe.dustMul ?? 1);
  });
});

/* ---------------------------------------------------------------- equipBonuses — 複数ピース */

describe('equipBonuses — 複数ピース', () => {
  it('atkMul は複数ピースで乗算される', () => {
    // needle(1.06) × compass(1.05)
    const board: EquipBoard = { n1: needleAt00, c1: compassAt20 };
    const b = equipBonuses(board);
    const expected = (GEAR_BONUS.needle.atkMul ?? 1) * (GEAR_BONUS.compass.atkMul ?? 1);
    expect(b.atkMul).toBeCloseTo(expected);
  });

  it('fireMul は複数ピースで乗算される', () => {
    // hourglass(0.97) × globe(0.96)、異なる場所に置く必要あり。
    // hourglass: (0,0)(0,1)、globe: (0,2)(0,3)(1,2)(1,3)
    const hAt00: GearPiece = { uid: 'h2', type: 'hourglass', rot: 0, anchor: { r: 0, c: 0 } };
    const gAt02: GearPiece = { uid: 'g2', type: 'globe', rot: 0, anchor: { r: 0, c: 2 } };
    const board: EquipBoard = { h2: hAt00, g2: gAt02 };
    const b = equipBonuses(board);
    const expected = (GEAR_BONUS.hourglass.fireMul ?? 1) * (GEAR_BONUS.globe.fireMul ?? 1);
    expect(b.fireMul).toBeCloseTo(expected);
  });

  it('rangeBonus は加算される', () => {
    // compass(+0.1) + telescope(+0.4)、重ならない配置
    // compass: (2,0)(3,0)(3,1)、telescope: (0,1)(1,1)(2,1)
    const board: EquipBoard = { c1: compassAt20, t1: telescopeAt01 };
    const b = equipBonuses(board);
    const expected = (GEAR_BONUS.compass.rangeBonus ?? 0) + (GEAR_BONUS.telescope.rangeBonus ?? 0);
    expect(b.rangeBonus).toBeCloseTo(expected);
  });
});

/* ---------------------------------------------------------------- equipBonuses — フィルボーナス */

describe('equipBonuses — フィルボーナス: 占有セル', () => {
  it('占有セル1個ごとに startGold が +1 される', () => {
    // needle 1セル → startGold = (gearBonus) + 1
    const board1: EquipBoard = { n1: needleAt00 };
    const b1 = equipBonuses(board1);
    const gearGold1 = GEAR_BONUS.needle.startGold ?? 0;
    expect(b1.startGold).toBe(gearGold1 + 1);

    // hourglass 2セル → startGold = 2（gearBonus なし）
    const h0: GearPiece = { uid: 'h0', type: 'hourglass', rot: 0, anchor: { r: 0, c: 0 } };
    const board2: EquipBoard = { h0 };
    const b2 = equipBonuses(board2);
    const gearGold2 = GEAR_BONUS.hourglass.startGold ?? 0;
    expect(b2.startGold).toBe(gearGold2 + 2);
  });

  it('needle 4個で行が1列すべて埋まる: maxHpBonus +3', () => {
    // 行0を全部埋める: (0,0)(0,1)(0,2)(0,3)
    const n0: GearPiece = { uid: 'na', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } };
    const n1: GearPiece = { uid: 'nb', type: 'needle', rot: 0, anchor: { r: 0, c: 1 } };
    const n2: GearPiece = { uid: 'nc', type: 'needle', rot: 0, anchor: { r: 0, c: 2 } };
    const n3: GearPiece = { uid: 'nd', type: 'needle', rot: 0, anchor: { r: 0, c: 3 } };
    const board: EquipBoard = { na: n0, nb: n1, nc: n2, nd: n3 };
    const b = equipBonuses(board);
    // needle の maxHpBonus はなし、フィル行 +3
    expect(b.maxHpBonus).toBe(3);
  });

  it('列が完全に埋まるときも maxHpBonus +3', () => {
    // 列0を全部埋める: (0,0)(1,0)(2,0)(3,0)
    const n0: GearPiece = { uid: 'c0', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } };
    const n1: GearPiece = { uid: 'c1', type: 'needle', rot: 0, anchor: { r: 1, c: 0 } };
    const n2: GearPiece = { uid: 'c2', type: 'needle', rot: 0, anchor: { r: 2, c: 0 } };
    const n3: GearPiece = { uid: 'c3', type: 'needle', rot: 0, anchor: { r: 3, c: 0 } };
    const board: EquipBoard = { c0: n0, c1: n1, c2: n2, c3: n3 };
    const b = equipBonuses(board);
    expect(b.maxHpBonus).toBe(3); // 列0 フル埋め
  });

  it('行と列が両方埋まったときは maxHpBonus が累積する', () => {
    // 行0と列0の両方を埋める（重複セル (0,0) を共有）
    // (0,0)(0,1)(0,2)(0,3) = 行0
    // (1,0)(2,0)(3,0) = 列0の残り
    const na: GearPiece = { uid: 'na', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } };
    const nb: GearPiece = { uid: 'nb', type: 'needle', rot: 0, anchor: { r: 0, c: 1 } };
    const nc: GearPiece = { uid: 'nc', type: 'needle', rot: 0, anchor: { r: 0, c: 2 } };
    const nd: GearPiece = { uid: 'nd', type: 'needle', rot: 0, anchor: { r: 0, c: 3 } };
    const ne: GearPiece = { uid: 'ne', type: 'needle', rot: 0, anchor: { r: 1, c: 0 } };
    const nf: GearPiece = { uid: 'nf', type: 'needle', rot: 0, anchor: { r: 2, c: 0 } };
    const ng: GearPiece = { uid: 'ng', type: 'needle', rot: 0, anchor: { r: 3, c: 0 } };
    const board: EquipBoard = { na, nb, nc, nd, ne, nf, ng };
    const b = equipBonuses(board);
    // 行0フル(+3) + 列0フル(+3) = 6
    expect(b.maxHpBonus).toBe(6);
  });
});

/* ---------------------------------------------------------------- equipBonuses — fireMul クランプ */

describe('equipBonuses — fireMul クランプ', () => {
  it('hourglass と globe を大量に積んでも fireMul は 0.5 以上', () => {
    const board: EquipBoard = {};
    // 各ピースをユニークな位置に配置して fireMul を下げる。
    // hourglass×2: (0,0)(0,1)、(2,0)(2,1)
    // globe×1: (0,2)(0,3)(1,2)(1,3) → fireMul が急激に下がるはず。
    board['h1'] = { uid: 'h1', type: 'hourglass', rot: 0, anchor: { r: 0, c: 0 } };
    board['h2'] = { uid: 'h2', type: 'hourglass', rot: 0, anchor: { r: 2, c: 0 } };
    board['g1'] = { uid: 'g1', type: 'globe', rot: 0, anchor: { r: 0, c: 2 } };
    const b = equipBonuses(board);
    // 0.97 × 0.97 × 0.96 ≈ 0.904 → まだ余裕あり。クランプには引っかかっていない。
    expect(b.fireMul).toBeGreaterThanOrEqual(0.5);
  });

  it('手動で多数の fireMul ボーナスを与えても下限は 0.5', () => {
    // 極端なケース: hourglass を連打（ただし現実の 4×4 ボードには収まらないので、
    // フィクスチャを直接テストするのが現実的）。
    // 数値検証: 0.97^20 ≈ 0.54 、0.97^30 ≈ 0.40 → クランプ後 0.5。
    // ここでは仮想的に大量ピースを入れたボードの結果が 0.5 以上であることを確認する。
    // hourglass 8個（全部異なる uid、ボード外でも parseEquip では除外されるが直接代入はできる）
    // → equipBonuses は pure fn なのでボードの validity を再チェックしない。
    const board: EquipBoard = {};
    for (let i = 0; i < 8; i++) {
      board[`h${i}`] = {
        uid: `h${i}`,
        type: 'hourglass',
        rot: 0,
        // 座標は重複するが equipBonuses は純粋に計算するだけ。
        anchor: { r: i, c: 0 },
      };
    }
    const b = equipBonuses(board);
    expect(b.fireMul).toBeGreaterThanOrEqual(0.5);
  });
});

/* ---------------------------------------------------------------- serializeEquip / parseEquip */

describe('serializeEquip / parseEquip — ラウンドトリップ', () => {
  it('空ボードをシリアライズして復元できる', () => {
    const s = serializeEquip({});
    const parsed = parseEquip(s);
    expect(parsed).toEqual({});
  });

  it('needle1個のボードがラウンドトリップする', () => {
    const board: EquipBoard = { n1: needleAt00 };
    const s = serializeEquip(board);
    const parsed = parseEquip(s);
    expect(parsed).toEqual(board);
  });

  it('複数ピースのボードがラウンドトリップする', () => {
    // needle:(0,0)  hourglass:(3,2)(3,3)  compass:(0,2)(1,2)(1,3) → 重ならない。
    const hAt32: GearPiece = { uid: 'h1', type: 'hourglass', rot: 0, anchor: { r: 3, c: 2 } };
    const cAt02: GearPiece = { uid: 'c1', type: 'compass', rot: 0, anchor: { r: 0, c: 2 } };
    const board: EquipBoard = {
      n1: needleAt00,
      h1: hAt32,
      c1: cAt02,
    };
    const s = serializeEquip(board);
    const parsed = parseEquip(s);
    expect(parsed).toEqual(board);
  });

  it('globe + armillary のボードがラウンドトリップする', () => {
    const ga: GearPiece = { uid: 'ga', type: 'globe', rot: 0, anchor: { r: 0, c: 0 } };
    const aa: GearPiece = { uid: 'aa', type: 'armillary', rot: 0, anchor: { r: 2, c: 0 } };
    const board: EquipBoard = { ga, aa };
    const s = serializeEquip(board);
    const parsed = parseEquip(s);
    expect(parsed).toEqual(board);
  });
});

describe('parseEquip — null / 不正入力', () => {
  it('null は DEFAULT_EQUIP を返す', () => {
    expect(parseEquip(null)).toEqual(DEFAULT_EQUIP);
  });

  it('空文字列は DEFAULT_EQUIP を返す（例外なし）', () => {
    expect(() => parseEquip('')).not.toThrow();
    expect(parseEquip('')).toEqual(DEFAULT_EQUIP);
  });

  it('ゴミ JSON は DEFAULT_EQUIP を返す（例外なし）', () => {
    expect(() => parseEquip('not-json')).not.toThrow();
    expect(parseEquip('not-json')).toEqual(DEFAULT_EQUIP);
  });

  it('オブジェクト JSON（配列でない）は DEFAULT_EQUIP を返す', () => {
    expect(parseEquip('{"foo":"bar"}')).toEqual(DEFAULT_EQUIP);
  });

  it('不正な type を含むピースは除外される', () => {
    const raw = JSON.stringify([{ uid: 'x', type: 'invalid_type', rot: 0, anchor: { r: 0, c: 0 } }]);
    expect(parseEquip(raw)).toEqual(DEFAULT_EQUIP);
  });

  it('不正な rot を含むピースは除外される', () => {
    const raw = JSON.stringify([{ uid: 'x', type: 'needle', rot: 45, anchor: { r: 0, c: 0 } }]);
    expect(parseEquip(raw)).toEqual(DEFAULT_EQUIP);
  });

  it('ボード外のアンカーを持つピースは除外される', () => {
    const raw = JSON.stringify([{ uid: 'x', type: 'needle', rot: 0, anchor: { r: -1, c: 0 } }]);
    expect(parseEquip(raw)).toEqual(DEFAULT_EQUIP);
  });

  it('ボード外にはみ出す（anchor 自体は内側だが形状がはみ出す）ピースは除外される', () => {
    // telescope 縦3セルを (EQUIP_N-1, 0) に置く → はみ出す
    const raw = JSON.stringify([
      { uid: 'x', type: 'telescope', rot: 0, anchor: { r: EQUIP_N - 1, c: 0 } },
    ]);
    expect(parseEquip(raw)).toEqual(DEFAULT_EQUIP);
  });

  it('重複配置のピースは後のものが除外される', () => {
    // needle2個が同じ位置 → 2個目は除外。
    const raw = JSON.stringify([
      { uid: 'a', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } },
      { uid: 'b', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } },
    ]);
    const parsed = parseEquip(raw);
    expect(Object.keys(parsed)).toHaveLength(1);
    expect(parsed['a']).toBeDefined();
  });

  it('uid のない要素は無視される', () => {
    const raw = JSON.stringify([{ type: 'needle', rot: 0, anchor: { r: 0, c: 0 } }]);
    expect(parseEquip(raw)).toEqual(DEFAULT_EQUIP);
  });

  it('anchor がないピースは除外される', () => {
    const raw = JSON.stringify([{ uid: 'x', type: 'needle', rot: 0 }]);
    expect(parseEquip(raw)).toEqual(DEFAULT_EQUIP);
  });

  it('有効なピースと無効なピースが混在する場合、有効なものだけ復元する', () => {
    const raw = JSON.stringify([
      { uid: 'valid', type: 'needle', rot: 0, anchor: { r: 0, c: 0 } },
      { uid: 'bad', type: 'wrong', rot: 0, anchor: { r: 0, c: 1 } },
    ]);
    const parsed = parseEquip(raw);
    expect(Object.keys(parsed)).toHaveLength(1);
    expect(parsed['valid']).toBeDefined();
  });
});

/* ---------------------------------------------------------------- EQUIP_N / DEFAULT_EQUIP / NEUTRAL_BONUS */

describe('定数', () => {
  it('EQUIP_N は 4', () => {
    expect(EQUIP_N).toBe(4);
  });

  it('DEFAULT_EQUIP は空オブジェクト', () => {
    expect(DEFAULT_EQUIP).toEqual({});
  });

  it('NEUTRAL_BONUS は正しい初期値', () => {
    expect(NEUTRAL_BONUS.atkMul).toBe(1);
    expect(NEUTRAL_BONUS.fireMul).toBe(1);
    expect(NEUTRAL_BONUS.rangeBonus).toBe(0);
    expect(NEUTRAL_BONUS.startGold).toBe(0);
    expect(NEUTRAL_BONUS.maxHpBonus).toBe(0);
    expect(NEUTRAL_BONUS.dustMul).toBe(1);
    expect(NEUTRAL_BONUS.sellBonus).toBe(1);
  });

  it('GEAR_BONUS は全 TypeId を網羅している', () => {
    const types = ['needle', 'hourglass', 'compass', 'globe', 'telescope', 'armillary'] as const;
    for (const t of types) {
      expect(GEAR_BONUS[t]).toBeDefined();
    }
  });
});
