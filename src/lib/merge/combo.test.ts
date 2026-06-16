import { describe, expect, it } from 'vitest';
import {
  COMBO_MAX,
  COMBO_WINDOW_MS,
  EMPTY_COMBO,
  comboLabel,
  comboMult,
  hitCombo,
  pruneCombo,
} from './combo';

/* ---------------------------------------------------------------- hitCombo */
describe('hitCombo', () => {
  it('コンボが切れている状態（until=0）でヒットすると count=1 から始まる', () => {
    const result = hitCombo(EMPTY_COMBO, 1000);
    expect(result.count).toBe(1);
  });

  it('ウィンドウ内のヒットでカウントが +1 される', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // count=1, until=3500
    const result = hitCombo(state, 2000);       // 2000 <= 3500 → count=2
    expect(result.count).toBe(2);
  });

  it('ウィンドウ内で複数回ヒットするとカウントが累積される', () => {
    let state = EMPTY_COMBO;
    for (let i = 0; i < 5; i++) {
      state = hitCombo(state, 1000 + i * 100);
    }
    expect(state.count).toBe(5);
  });

  it('ウィンドウを過ぎたヒットでコンボがリセットされ count=1 になる', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = hitCombo(state, 4000);       // 4000 > 3500 → reset
    expect(result.count).toBe(1);
  });

  it('until は常に now + COMBO_WINDOW_MS になる', () => {
    const now = 5000;
    const result = hitCombo(EMPTY_COMBO, now);
    expect(result.until).toBe(now + COMBO_WINDOW_MS);
  });

  it('ウィンドウ内ヒット後も until が更新される', () => {
    const first = hitCombo(EMPTY_COMBO, 1000);
    const second = hitCombo(first, 2000);
    expect(second.until).toBe(2000 + COMBO_WINDOW_MS);
  });

  it('ウィンドウ境界（now === until）はコンボ切れとして扱われる', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = hitCombo(state, 3500);       // now === until → 3500 > 3500 は false → count+1
    // now > until が条件なので now === until はまだ有効
    expect(result.count).toBe(2);
  });

  it('now が until より 1ms 超えたらリセット', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = hitCombo(state, 3501);       // 3501 > 3500 → reset
    expect(result.count).toBe(1);
  });
});

/* ---------------------------------------------------------------- pruneCombo */
describe('pruneCombo', () => {
  it('期限内ならば状態をそのまま返す', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = pruneCombo(state, 2000);
    expect(result).toBe(state); // 同一参照
  });

  it('期限切れなら EMPTY_COMBO を返す', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = pruneCombo(state, 4000);
    expect(result).toEqual(EMPTY_COMBO);
  });

  it('境界（now === until）はまだ有効として保持される', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = pruneCombo(state, 3500);
    expect(result).toBe(state);
  });

  it('境界 +1ms は期限切れとして EMPTY_COMBO になる', () => {
    const state = hitCombo(EMPTY_COMBO, 1000); // until=3500
    const result = pruneCombo(state, 3501);
    expect(result).toEqual(EMPTY_COMBO);
  });

  it('EMPTY_COMBO（until=0）に対して now=1 を渡すと EMPTY_COMBO が返る', () => {
    const result = pruneCombo(EMPTY_COMBO, 1);
    expect(result).toEqual(EMPTY_COMBO);
  });
});

/* ---------------------------------------------------------------- comboMult */
describe('comboMult', () => {
  it('count <= 0 のとき 1.0 を返す', () => {
    expect(comboMult(0)).toBe(1);
    expect(comboMult(-5)).toBe(1);
  });

  it('count=1 のとき 1.05 を返す', () => {
    expect(comboMult(1)).toBeCloseTo(1.05);
  });

  it('count=10 のとき 1.50 を返す', () => {
    expect(comboMult(10)).toBeCloseTo(1.5);
  });

  it('count=COMBO_MAX のとき 2.0（最大）を返す', () => {
    expect(comboMult(COMBO_MAX)).toBeCloseTo(2.0);
  });

  it('count が COMBO_MAX を超えても 2.0 に留まる', () => {
    expect(comboMult(COMBO_MAX + 1)).toBeCloseTo(2.0);
    expect(comboMult(100)).toBeCloseTo(2.0);
  });

  it('count=2 のとき 1.10 を返す', () => {
    expect(comboMult(2)).toBeCloseTo(1.1);
  });
});

/* ---------------------------------------------------------------- comboLabel */
describe('comboLabel', () => {
  it('count=0 のとき null を返す', () => {
    expect(comboLabel(0)).toBeNull();
  });

  it('count=1 のとき null を返す', () => {
    expect(comboLabel(1)).toBeNull();
  });

  it('count=2 のとき null を返す', () => {
    expect(comboLabel(2)).toBeNull();
  });

  it('count=3 のとき "連撃 x3" を返す', () => {
    expect(comboLabel(3)).toBe('連撃 x3');
  });

  it('count=10 のとき "連撃 x10" を返す', () => {
    expect(comboLabel(10)).toBe('連撃 x10');
  });

  it('count=COMBO_MAX のとき正しいラベルを返す', () => {
    expect(comboLabel(COMBO_MAX)).toBe(`連撃 x${COMBO_MAX}`);
  });

  it('count が COMBO_MAX を超えてもラベルは実際の count を使う', () => {
    expect(comboLabel(25)).toBe('連撃 x25');
  });
});
