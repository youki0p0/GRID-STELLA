/* ============================================================================
 * GRID STELLA — merge × loop-defense × roguelike: 消耗品ショップカタログ
 *
 * 波と波の合間に表示されるショップで使用する、副作用のない純粋定数と関数。
 * 全エフェクトは確定的であり、外部状態に依存しない。
 * ========================================================================== */

/* ---------------------------------------------------------------- アイテムID */
export type ShopItemId = 'tonic' | 'whetstone' | 'lens' | 'charge' | 'coffer';

/* ---------------------------------------------------------------- アイテム定義 */
export interface ShopItem {
  id: ShopItemId;
  icon: string;
  name: string;
  desc: string;
  cost: number;
}

export const SHOP_ITEMS: Record<ShopItemId, ShopItem> = {
  tonic: {
    id: 'tonic',
    icon: '🧪',
    name: '星露の霊薬',
    desc: 'HPを最大値の50%回復する',
    cost: 4,
  },
  whetstone: {
    id: 'whetstone',
    icon: '🪨',
    name: '星辰の砥石',
    desc: '全器具の攻撃力を永続的に +10% 強化する',
    cost: 8,
  },
  lens: {
    id: 'lens',
    icon: '🔮',
    name: '天眼の水晶',
    desc: '全器具の射程を永続的に +0.4 延長する',
    cost: 7,
  },
  charge: {
    id: 'charge',
    icon: '⚡',
    name: '星力の結晶',
    desc: 'アルティメットゲージを即座に満填する',
    cost: 6,
  },
  coffer: {
    id: 'coffer',
    icon: '✨',
    name: '星霊の秘薬',
    desc: 'HPを最大値まで完全回復する',
    cost: 12,
  },
};

export const SHOP_LIST: ShopItem[] = Object.values(SHOP_ITEMS);

/* ---------------------------------------------------------------- エフェクト */
export interface ShopEffect {
  healFrac?: number;   // HPを最大値の何割回復するか（0 < x <= 1）
  atkMul?: number;     // 攻撃力の乗算倍率（1以上）
  rangeBonus?: number; // 射程への加算値（0以上）
  gaugeFill?: boolean; // trueならアルティメットゲージを満填
}

// アイテムIDに対応する確定的エフェクトを返す。
export function shopEffect(id: ShopItemId): ShopEffect {
  switch (id) {
    case 'tonic':     return { healFrac: 0.5 };
    case 'whetstone': return { atkMul: 1.1 };
    case 'lens':      return { rangeBonus: 0.4 };
    case 'charge':    return { gaugeFill: true };
    case 'coffer':    return { healFrac: 1 };
  }
}

/* ---------------------------------------------------------------- 購入可否 */
// 所持ゴールドがアイテムのコスト以上かどうかを返す。
export function canAfford(gold: number, id: ShopItemId): boolean {
  return gold >= SHOP_ITEMS[id].cost;
}
