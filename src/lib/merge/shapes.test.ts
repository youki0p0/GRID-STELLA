/* ============================================================================
 * GRID STELLA — shapes.ts のユニットテスト
 *
 * ピース形状ジオメトリ層の全エクスポートを網羅的に検証する。
 * Vitest 使用・外部ライブラリ不使用。
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  SHAPES,
  normalize,
  rotate,
  dims,
  footprint,
  inBounds,
  overlaps,
  canPlace,
  cellKey,
  cellCount,
  type Cell,
  type Rot,
} from './shapes';
import { type TypeId } from './engine';

/* ---------------------------------------------------------------- ヘルパー */

/** Cell[] を文字列に変換して比較しやすくする */
const cellsToStr = (cells: Cell[]) => cells.map(([r, c]) => `${r},${c}`).join('|');

/* ================================================================ SHAPES */

describe('SHAPES', () => {
  const ALL_TYPE_IDS: TypeId[] = ['needle', 'compass', 'globe', 'telescope', 'hourglass', 'armillary'];

  it('すべての TypeId にエントリが存在する', () => {
    for (const id of ALL_TYPE_IDS) {
      expect(SHAPES[id]).toBeDefined();
    }
  });

  it('各形状は 1〜4 セル', () => {
    for (const id of ALL_TYPE_IDS) {
      const len = SHAPES[id].length;
      expect(len, `${id} のセル数`).toBeGreaterThanOrEqual(1);
      expect(len, `${id} のセル数`).toBeLessThanOrEqual(4);
    }
  });

  it('各形状は正規化済み（min row = 0, min col = 0）', () => {
    for (const id of ALL_TYPE_IDS) {
      const cells = SHAPES[id];
      const minR = Math.min(...cells.map(([r]) => r));
      const minC = Math.min(...cells.map(([, c]) => c));
      expect(minR, `${id} min row`).toBe(0);
      expect(minC, `${id} min col`).toBe(0);
    }
  });

  it('needle は単一セル [[0,0]]', () => {
    expect(cellsToStr(SHAPES.needle)).toBe('0,0');
  });

  it('globe は 2×2 正方形（4セル）', () => {
    expect(SHAPES.globe).toHaveLength(4);
    const str = cellsToStr(normalize(SHAPES.globe));
    expect(str).toBe('0,0|0,1|1,0|1,1');
  });

  it('telescope は縦3セル', () => {
    expect(SHAPES.telescope).toHaveLength(3);
    const str = cellsToStr(normalize(SHAPES.telescope));
    expect(str).toBe('0,0|1,0|2,0');
  });

  it('armillary は T字4セル', () => {
    expect(SHAPES.armillary).toHaveLength(4);
    // T字: 上1・下3（左右中央）→ [[0,1],[1,0],[1,1],[1,2]]
    const str = cellsToStr(normalize(SHAPES.armillary));
    expect(str).toBe('0,1|1,0|1,1|1,2');
  });
});

/* ================================================================ normalize */

describe('normalize', () => {
  it('負の座標をオリジンにシフトする', () => {
    const input: Cell[] = [[-2, -3], [-1, -2]];
    const result = normalize(input);
    expect(cellsToStr(result)).toBe('0,0|1,1');
  });

  it('既に正規形のセルはそのまま', () => {
    const input: Cell[] = [[0, 0], [0, 1], [1, 0]];
    const result = normalize(input);
    expect(cellsToStr(result)).toBe('0,0|0,1|1,0');
  });

  it('べき等性 — 2回 normalize しても同じ結果', () => {
    const input: Cell[] = [[2, 5], [3, 5], [3, 6]];
    const once = normalize(input);
    const twice = normalize(once);
    expect(cellsToStr(once)).toBe(cellsToStr(twice));
  });

  it('ソート順が row asc → col asc', () => {
    const input: Cell[] = [[1, 2], [0, 3], [1, 1], [0, 0]];
    const result = normalize(input);
    // min row = 0, min col = 0 → シフトなし。ソートのみ。
    expect(cellsToStr(result)).toBe('0,0|0,3|1,1|1,2');
  });

  it('単一セルは常に [[0,0]]', () => {
    const input: Cell[] = [[7, 3]];
    const result = normalize(input);
    expect(cellsToStr(result)).toBe('0,0');
  });

  it('空配列を返す', () => {
    expect(normalize([])).toEqual([]);
  });
});

/* ================================================================ rotate */

describe('rotate', () => {
  it('rot 0 は normalize のみ（形状不変）', () => {
    const cells = SHAPES.compass;
    const r0 = rotate(cells, 0);
    expect(cellsToStr(r0)).toBe(cellsToStr(normalize(cells)));
  });

  it('4回の 90° 回転で元の正規形に戻る（needle）', () => {
    const base = normalize(SHAPES.needle);
    let acc: Cell[] = SHAPES.needle;
    for (let i = 0; i < 4; i++) acc = rotate(acc, 90);
    expect(cellsToStr(acc)).toBe(cellsToStr(base));
  });

  it('4回の 90° 回転で元の正規形に戻る（telescope）', () => {
    const base = normalize(SHAPES.telescope);
    let acc: Cell[] = SHAPES.telescope;
    for (let i = 0; i < 4; i++) acc = rotate(acc, 90);
    expect(cellsToStr(acc)).toBe(cellsToStr(base));
  });

  it('4回の 90° 回転で元の正規形に戻る（armillary）', () => {
    const base = normalize(SHAPES.armillary);
    let acc: Cell[] = SHAPES.armillary;
    for (let i = 0; i < 4; i++) acc = rotate(acc, 90);
    expect(cellsToStr(acc)).toBe(cellsToStr(base));
  });

  it('telescope: 90° 回転で縦3→横3 に変わる', () => {
    // telescope = [[0,0],[1,0],[2,0]] (h=3, w=1)
    const r90 = rotate(SHAPES.telescope, 90);
    // 90°: [r,c]→[c,-r] → [[0,0],[0,-1],[0,-2]] → normalize → [[0,0],[0,1],[0,2]]
    expect(cellsToStr(r90)).toBe('0,0|0,1|0,2');
  });

  it('telescope: 回転でセル数が保たれる', () => {
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      const r = rotate(SHAPES.telescope, rot);
      expect(r).toHaveLength(SHAPES.telescope.length);
    }
  });

  it('globe（正方形）は全4回転で同一', () => {
    const base = cellsToStr(normalize(SHAPES.globe));
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      expect(cellsToStr(rotate(SHAPES.globe, rot))).toBe(base);
    }
  });

  it('needle（1セル）は全4回転で [[0,0]]', () => {
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      expect(cellsToStr(rotate(SHAPES.needle, rot))).toBe('0,0');
    }
  });

  it('hourglass: 90° で縦ドミノになる', () => {
    // hourglass = [[0,0],[0,1]] → 90°: [0,0],[0,-1] → normalize [[0,0],[1,0]]
    const r90 = rotate(SHAPES.hourglass, 90);
    expect(cellsToStr(r90)).toBe('0,0|1,0');
  });

  it('compass: 180° 回転でセル数不変', () => {
    const r180 = rotate(SHAPES.compass, 180);
    expect(r180).toHaveLength(SHAPES.compass.length);
  });

  it('rotate の結果は normalize 済み（べき等）', () => {
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      const r = rotate(SHAPES.armillary, rot);
      expect(cellsToStr(normalize(r))).toBe(cellsToStr(r));
    }
  });
});

/* ================================================================ dims */

describe('dims', () => {
  it('needle: 1×1', () => {
    expect(dims(SHAPES.needle)).toEqual({ w: 1, h: 1 });
  });

  it('hourglass: 2×1（横ドミノ）', () => {
    expect(dims(SHAPES.hourglass)).toEqual({ w: 2, h: 1 });
  });

  it('telescope: 1×3（縦 I字）', () => {
    expect(dims(SHAPES.telescope)).toEqual({ w: 1, h: 3 });
  });

  it('globe: 2×2', () => {
    expect(dims(SHAPES.globe)).toEqual({ w: 2, h: 2 });
  });

  it('armillary: 3×2（T字）', () => {
    expect(dims(SHAPES.armillary)).toEqual({ w: 3, h: 2 });
  });

  it('telescope 90° 回転後は 3×1', () => {
    const r90 = rotate(SHAPES.telescope, 90);
    expect(dims(r90)).toEqual({ w: 3, h: 1 });
  });

  it('telescope: 縦と横で w・h が入れ替わる', () => {
    const vertical = dims(rotate(SHAPES.telescope, 0));   // {w:1, h:3}
    const horizontal = dims(rotate(SHAPES.telescope, 90)); // {w:3, h:1}
    expect(vertical.w).toBe(horizontal.h);
    expect(vertical.h).toBe(horizontal.w);
  });
});

/* ================================================================ footprint */

describe('footprint', () => {
  it('rot 0 でアンカーを加算した絶対座標', () => {
    const fp = footprint(SHAPES.needle, 0, { r: 3, c: 4 });
    expect(fp).toEqual([{ r: 3, c: 4 }]);
  });

  it('hourglass のフットプリント', () => {
    const fp = footprint(SHAPES.hourglass, 0, { r: 1, c: 2 });
    expect(fp).toEqual([{ r: 1, c: 2 }, { r: 1, c: 3 }]);
  });

  it('telescope 90° でアンカーから横に延びる', () => {
    // rot 90 → [[0,0],[0,1],[0,2]] → anchor {r:2,c:3} → [{r:2,c:3},{r:2,c:4},{r:2,c:5}]
    const fp = footprint(SHAPES.telescope, 90, { r: 2, c: 3 });
    expect(fp).toEqual([{ r: 2, c: 3 }, { r: 2, c: 4 }, { r: 2, c: 5 }]);
  });

  it('返却セル数は rotate 後のセル数と一致', () => {
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      const fp = footprint(SHAPES.armillary, rot, { r: 0, c: 0 });
      expect(fp).toHaveLength(SHAPES.armillary.length);
    }
  });

  it('アンカーが (0,0) のとき rotate 結果と同一', () => {
    const rot: Rot = 180;
    const r = rotate(SHAPES.compass, rot);
    const fp = footprint(SHAPES.compass, rot, { r: 0, c: 0 });
    expect(fp).toEqual(r.map(([dr, dc]) => ({ r: dr, c: dc })));
  });
});

/* ================================================================ inBounds */

describe('inBounds', () => {
  it('5×5 ボード内に収まる場合 true', () => {
    const abs = [{ r: 0, c: 0 }, { r: 4, c: 4 }];
    expect(inBounds(abs, 5)).toBe(true);
  });

  it('行が n-1 を超える場合 false', () => {
    const abs = [{ r: 5, c: 0 }];
    expect(inBounds(abs, 5)).toBe(false);
  });

  it('列が n-1 を超える場合 false', () => {
    const abs = [{ r: 0, c: 5 }];
    expect(inBounds(abs, 5)).toBe(false);
  });

  it('行が負の場合 false', () => {
    const abs = [{ r: -1, c: 0 }];
    expect(inBounds(abs, 5)).toBe(false);
  });

  it('列が負の場合 false', () => {
    const abs = [{ r: 0, c: -1 }];
    expect(inBounds(abs, 5)).toBe(false);
  });

  it('n=1 のとき (0,0) のみ有効', () => {
    expect(inBounds([{ r: 0, c: 0 }], 1)).toBe(true);
    expect(inBounds([{ r: 0, c: 1 }], 1)).toBe(false);
  });

  it('全セルが境界内でも1つでも外なら false', () => {
    const abs = [{ r: 0, c: 0 }, { r: 2, c: 2 }, { r: 5, c: 0 }];
    expect(inBounds(abs, 5)).toBe(false);
  });
});

/* ================================================================ overlaps */

describe('overlaps', () => {
  it('occupied が空なら false', () => {
    const abs = [{ r: 1, c: 1 }, { r: 1, c: 2 }];
    expect(overlaps(abs, new Set())).toBe(false);
  });

  it('重なりがある場合 true', () => {
    const abs = [{ r: 1, c: 1 }, { r: 1, c: 2 }];
    const occ = new Set(['1,2']);
    expect(overlaps(abs, occ)).toBe(true);
  });

  it('別の座標が occupied でも対象外なら false', () => {
    const abs = [{ r: 0, c: 0 }];
    const occ = new Set(['3,3', '2,1']);
    expect(overlaps(abs, occ)).toBe(false);
  });

  it('cellKey と同じキー形式を使う', () => {
    const abs = [{ r: 2, c: 3 }];
    const occ = new Set([cellKey(2, 3)]);
    expect(overlaps(abs, occ)).toBe(true);
  });
});

/* ================================================================ canPlace */

describe('canPlace', () => {
  it('空ボードで範囲内なら true', () => {
    expect(canPlace(SHAPES.needle, 0, { r: 2, c: 2 }, 5, new Set())).toBe(true);
  });

  it('範囲外なら false（ボード右端を超える）', () => {
    // telescope rot 0 は縦3セル: anchor.r=3 → r=3,4,5 → 5 は 5×5 ボードで境界外
    expect(canPlace(SHAPES.telescope, 0, { r: 3, c: 0 }, 5, new Set())).toBe(false);
  });

  it('occupied と重なる場合 false', () => {
    const occ = new Set([cellKey(1, 1)]);
    expect(canPlace(SHAPES.needle, 0, { r: 1, c: 1 }, 5, occ)).toBe(false);
  });

  it('範囲内かつ occupied と重ならない場合 true', () => {
    const occ = new Set([cellKey(0, 0), cellKey(0, 1)]);
    expect(canPlace(SHAPES.needle, 0, { r: 1, c: 1 }, 5, occ)).toBe(true);
  });

  it('globe を 4×4 ボードの右下に置ける', () => {
    // globe は 2×2: anchor {r:2,c:2} → セル (2,2)(2,3)(3,2)(3,3) ← 全部 0..3
    expect(canPlace(SHAPES.globe, 0, { r: 2, c: 2 }, 4, new Set())).toBe(true);
  });

  it('globe を 4×4 ボードの右下+1 には置けない', () => {
    expect(canPlace(SHAPES.globe, 0, { r: 3, c: 3 }, 4, new Set())).toBe(false);
  });

  it('telescope 90° で横3セル、境界ぎりぎりに置ける', () => {
    // rot90 → [[0,0],[0,1],[0,2]]: anchor {r:0,c:2} → (0,2)(0,3)(0,4) ← 5×5 OK
    expect(canPlace(SHAPES.telescope, 90, { r: 0, c: 2 }, 5, new Set())).toBe(true);
  });

  it('telescope 90° でアンカー列が 3 のときボード外（5×5）', () => {
    // anchor {r:0,c:3} → (0,3)(0,4)(0,5) ← col 5 は境界外
    expect(canPlace(SHAPES.telescope, 90, { r: 0, c: 3 }, 5, new Set())).toBe(false);
  });

  it('armillary を occupied の隣に置ける', () => {
    const occ = new Set([cellKey(0, 0)]);
    // armillary rot0: [[0,1],[1,0],[1,1],[1,2]] anchor {r:0,c:0}
    // → (0,1)(1,0)(1,1)(1,2) — (0,0) は occupied だが armillary はそこを踏まない
    expect(canPlace(SHAPES.armillary, 0, { r: 0, c: 0 }, 5, occ)).toBe(true);
  });
});

/* ================================================================ cellKey */

describe('cellKey', () => {
  it('"r,c" 形式の文字列を返す', () => {
    expect(cellKey(0, 0)).toBe('0,0');
    expect(cellKey(3, 4)).toBe('3,4');
  });

  it('Set に格納して検索できる', () => {
    const s = new Set([cellKey(1, 2), cellKey(3, 0)]);
    expect(s.has(cellKey(1, 2))).toBe(true);
    expect(s.has(cellKey(0, 0))).toBe(false);
  });
});

/* ================================================================ cellCount */

describe('cellCount', () => {
  it('needle は 1', () => { expect(cellCount('needle')).toBe(1); });
  it('hourglass は 2', () => { expect(cellCount('hourglass')).toBe(2); });
  it('compass は 3', () => { expect(cellCount('compass')).toBe(3); });
  it('telescope は 3', () => { expect(cellCount('telescope')).toBe(3); });
  it('globe は 4', () => { expect(cellCount('globe')).toBe(4); });
  it('armillary は 4', () => { expect(cellCount('armillary')).toBe(4); });

  it('SHAPES[t].length と一致する', () => {
    const ids: TypeId[] = ['needle', 'compass', 'globe', 'telescope', 'hourglass', 'armillary'];
    for (const id of ids) {
      expect(cellCount(id)).toBe(SHAPES[id].length);
    }
  });
});
