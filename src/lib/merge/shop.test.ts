/* ============================================================================
 * GRID STELLA — shop.ts のユニットテスト
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  SHOP_ITEMS,
  SHOP_LIST,
  shopEffect,
  canAfford,
  type ShopItemId,
} from './shop';

const ALL_IDS: ShopItemId[] = ['tonic', 'whetstone', 'lens', 'charge', 'coffer'];

describe('SHOP_LIST', () => {
  it('アイテム数が5種類であること', () => {
    expect(SHOP_LIST).toHaveLength(5);
  });

  it('SHOP_LIST の件数が SHOP_ITEMS のキー数と一致すること', () => {
    expect(SHOP_LIST).toHaveLength(Object.keys(SHOP_ITEMS).length);
  });

  it('全アイテムが非空の icon / name / desc と正のコストを持つこと', () => {
    for (const item of SHOP_LIST) {
      expect(item.icon.length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.desc.length).toBeGreaterThan(0);
      expect(item.cost).toBeGreaterThan(0);
    }
  });
});

describe('shopEffect', () => {
  it('全IDに対して定義済みのエフェクトを返すこと', () => {
    for (const id of ALL_IDS) {
      const effect = shopEffect(id);
      expect(effect).toBeDefined();
    }
  });

  it('atkMul が定義される場合は 1 以上であること', () => {
    for (const id of ALL_IDS) {
      const { atkMul } = shopEffect(id);
      if (atkMul !== undefined) {
        expect(atkMul).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('healFrac が定義される場合は (0, 1] の範囲であること', () => {
    for (const id of ALL_IDS) {
      const { healFrac } = shopEffect(id);
      if (healFrac !== undefined) {
        expect(healFrac).toBeGreaterThan(0);
        expect(healFrac).toBeLessThanOrEqual(1);
      }
    }
  });

  it('rangeBonus が定義される場合は 0 以上であること', () => {
    for (const id of ALL_IDS) {
      const { rangeBonus } = shopEffect(id);
      if (rangeBonus !== undefined) {
        expect(rangeBonus).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('tonic は healFrac: 0.5 を返すこと', () => {
    expect(shopEffect('tonic')).toEqual({ healFrac: 0.5 });
  });

  it('whetstone は atkMul: 1.1 を返すこと', () => {
    expect(shopEffect('whetstone')).toEqual({ atkMul: 1.1 });
  });

  it('lens は rangeBonus: 0.4 を返すこと', () => {
    expect(shopEffect('lens')).toEqual({ rangeBonus: 0.4 });
  });

  it('charge は gaugeFill: true を返すこと', () => {
    expect(shopEffect('charge')).toEqual({ gaugeFill: true });
  });

  it('coffer は healFrac: 1 を返すこと', () => {
    expect(shopEffect('coffer')).toEqual({ healFrac: 1 });
  });
});

describe('canAfford', () => {
  it('所持ゴールドがコスト以上の場合 true を返すこと', () => {
    for (const id of ALL_IDS) {
      const cost = SHOP_ITEMS[id].cost;
      expect(canAfford(cost, id)).toBe(true);
      expect(canAfford(cost + 100, id)).toBe(true);
    }
  });

  it('所持ゴールドがコスト未満の場合 false を返すこと', () => {
    for (const id of ALL_IDS) {
      const cost = SHOP_ITEMS[id].cost;
      expect(canAfford(cost - 1, id)).toBe(false);
    }
  });

  it('ゴールドが 0 のときは全アイテムで false を返すこと', () => {
    for (const id of ALL_IDS) {
      expect(canAfford(0, id)).toBe(false);
    }
  });
});
