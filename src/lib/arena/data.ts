// GRID STELLA — ARENA :: jobs & instrument catalog (data-driven, original).
import type { Item, Job, JobId, Rarity } from './types';

export const GRID_W = 6;
export const GRID_H = 5;

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const RARITY_META: Record<Rarity, { ja: string; en: string; tone: string }> = {
  common: { ja: '常', en: 'Common', tone: '#9b978d' },
  rare: { ja: '稀', en: 'Rare', tone: '#7fa6c9' },
  epic: { ja: '深', en: 'Epic', tone: '#b18ad6' },
  legendary: { ja: '極', en: 'Legendary', tone: '#dab94f' },
};

/* ============================================================ JOBS */
export const JOBS: Record<JobId, Job> = {
  sentinel: {
    id: 'sentinel',
    nameJa: '衛士',
    nameEn: 'Sentinel',
    sprite: 'job_sentinel',
    tagline: '刃と盾。直感的で安定した観測者。',
    desc: '武具で戦う初心者向けの系統。連撃・重撃・守勢の三方向に伸びる。',
    startingGold: 8,
    startingHp: 105,
    affinity: ['blade', 'heavy', 'guard'],
    tactics: [
      { nameJa: '連撃 — 刃の手数', desc: '速い片手武器を並べ、手数で押し切る。' },
      { nameJa: '重撃 — 一撃の重さ', desc: '遅いが重い武器とクリティカルで仕留める。' },
      { nameJa: '守勢 — 盾と反撃（共通）', desc: '被弾を抑え、盾で耐えて長期戦に持ち込む。' },
    ],
  },
  catalyst: {
    id: 'catalyst',
    nameJa: '触媒士',
    nameEn: 'Catalyst',
    sprite: 'job_catalyst',
    tagline: '毒と燼。積み上げて滅ぼすコンボ系。',
    desc: '状態異常と消耗品を操る。戦いが進むほど効果が積み上がる。',
    startingGold: 9,
    startingHp: 95,
    affinity: ['toxin', 'cinder', 'hex'],
    tactics: [
      { nameJa: '蝕毒 — 継続の毒', desc: '毒を蓄積させ、時間で勝つ。' },
      { nameJa: '焼尽 — 遅延の爆発', desc: '火種を連鎖させ、中盤で爆発させる。' },
      { nameJa: '衰滅 — 状態異常（共通）', desc: '鈍足・脆弱を重ね、敵を機能不全にする。' },
    ],
  },
  broker: {
    id: 'broker',
    nameJa: '両替商',
    nameEn: 'Broker',
    sprite: 'job_broker',
    tagline: '貨幣を火力へ。序盤は弱く後半に化ける。',
    desc: '経済を握る系統。ゴールド運用と仕入れが強さになる。',
    startingGold: 12,
    startingHp: 90,
    affinity: ['coin', 'relic'],
    tactics: [
      { nameJa: '蓄財 — 資産が火力', desc: '所持ゴールドに比例して攻撃が伸びる。' },
      { nameJa: '仕入れ — 安価な手数', desc: '安い消耗武器を多投し、手数で削る。' },
      { nameJa: '商才 — 購入ボーナス（共通）', desc: '更新と購入を有利にし、盤を素早く完成させる。' },
    ],
  },
};

export const JOB_LIST = Object.values(JOBS);

/* ============================================================ ITEMS
 * Numbers are intentionally readable so balance is easy to tune.
 * action.cd is seconds; atk is per-activation damage.
 */
export const ITEMS: Item[] = [
  /* ---------- COMMON (any discipline) ---------- */
  {
    key: 'needle', nameJa: '観測針', nameEn: 'Sight Needle', sprite: 'needle',
    rarity: 'common', job: null, cost: 2, w: 1, h: 1, tags: ['blade'],
    desc: '1.0秒ごとに小ダメージ。手数ビルドの土台。',
    action: { cd: 1.0, atk: 6 },
  },
  {
    key: 'saber', nameJa: '巡光の片刃', nameEn: 'Arc Saber', sprite: 'saber',
    rarity: 'common', job: null, cost: 3, w: 1, h: 2, tags: ['blade'],
    desc: '0.9秒ごとに中ダメージ。安定した汎用武器。',
    action: { cd: 0.9, atk: 9 },
  },
  {
    key: 'ward', nameJa: '木枠の盾', nameEn: 'Timber Ward', sprite: 'shield',
    rarity: 'common', job: null, cost: 2, w: 1, h: 1, tags: ['guard'],
    desc: '1.4秒ごとにシールドを得る。',
    action: { cd: 1.4, shield: 7 },
  },
  {
    key: 'plate', nameJa: '布の装甲', nameEn: 'Cloth Plate', sprite: 'plate',
    rarity: 'common', job: null, cost: 3, w: 2, h: 1, tags: ['guard'],
    desc: '最大HP +18。',
    maxHp: 18,
  },
  {
    key: 'tonic', nameJa: '癒しの水', nameEn: 'Mending Tonic', sprite: 'potion',
    rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['mend'],
    desc: '1.6秒ごとにHPを回復。',
    action: { cd: 1.6, heal: 6 },
  },
  {
    key: 'shard', nameJa: '魔力の欠片', nameEn: 'Aether Shard', sprite: 'prism',
    rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['relic'],
    desc: '隣接する武器の攻撃 +12%。',
    auras: [{ scope: 'adj', tag: 'blade', atkMul: 1.12 }, { scope: 'adj', tag: 'heavy', atkMul: 1.12 }],
  },
  {
    key: 'coin', nameJa: '古びた硬貨', nameEn: 'Worn Coin', sprite: 'coin',
    rarity: 'common', job: null, cost: 2, w: 1, h: 1, tags: ['coin'],
    desc: '所持ゴールド10ごとに攻撃を1回付与（戦闘開始時に確定）。',
    action: { cd: 1.2, atk: 2, goldScale: 10 },
  },
  {
    key: 'flint', nameJa: '火打ち石', nameEn: 'Flint', sprite: 'ember',
    rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['cinder'],
    desc: '1.5秒ごとに火傷を付与。',
    action: { cd: 1.5, burn: 5 },
  },
  {
    key: 'thorn', nameJa: '棘の小瓶', nameEn: 'Thorn Vial', sprite: 'vial',
    rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['toxin'],
    desc: '1.3秒ごとに毒を1スタック付与。',
    action: { cd: 1.3, poison: 1 },
  },
  {
    key: 'pouch', nameJa: '小型ポーチ', nameEn: 'Small Pouch', sprite: 'ring',
    rarity: 'common', job: null, cost: 2, w: 1, h: 1, tags: ['coin'],
    desc: '最大HP +8。同じ行の貨アイテムの攻撃 +8%。',
    maxHp: 8,
    auras: [{ scope: 'row', tag: 'coin', atkMul: 1.08 }],
  },
  {
    key: 'twinblade', nameJa: '双子の短刃', nameEn: 'Twin Daggers', sprite: 'twinblade',
    rarity: 'rare', job: null, cost: 5, w: 1, h: 2, tags: ['blade'],
    desc: '0.7秒ごとに2回相当の素早い攻撃。',
    action: { cd: 0.7, atk: 8 },
  },
  {
    key: 'greatsword', nameJa: '錆びた大剣', nameEn: 'Rusted Greatsword', sprite: 'greatsword',
    rarity: 'rare', job: null, cost: 5, w: 1, h: 2, tags: ['heavy'],
    desc: '1.8秒ごとに重い一撃。シールドを8貫通。',
    action: { cd: 1.8, atk: 26, pierce: 8 },
  },
  {
    key: 'aegis', nameJa: '鉄の盾', nameEn: 'Iron Aegis', sprite: 'tower',
    rarity: 'rare', job: null, cost: 5, w: 2, h: 2, tags: ['guard'],
    desc: '最大HP +28。1.2秒ごとにシールド +10。',
    maxHp: 28,
    action: { cd: 1.2, shield: 10 },
  },
  {
    key: 'lens', nameJa: '集光レンズ', nameEn: 'Focusing Lens', sprite: 'lens',
    rarity: 'rare', job: null, cost: 5, w: 1, h: 1, tags: ['relic'],
    desc: '周囲の刃・燼アイテムのクリティカル +12%。',
    auras: [{ scope: 'adj', tag: 'blade', critAdd: 0.12 }, { scope: 'adj', tag: 'cinder', critAdd: 0.12 }],
  },
  {
    key: 'starcore', nameJa: '恒星核', nameEn: 'Stellar Core', sprite: 'star',
    rarity: 'epic', job: null, cost: 8, w: 2, h: 2, tags: ['relic'],
    desc: '盤上の全武器の攻撃 +18%、最大HP +24。',
    maxHp: 24,
    auras: [{ scope: 'all', tag: 'blade', atkMul: 1.18 }, { scope: 'all', tag: 'heavy', atkMul: 1.18 }],
  },
  {
    key: 'comet', nameJa: '彗核の砲', nameEn: 'Comet Lance', sprite: 'orb',
    rarity: 'epic', job: null, cost: 9, w: 1, h: 2, tags: ['heavy'],
    desc: '2.2秒ごとに巨大な一撃。シールド完全無視。',
    action: { cd: 2.2, atk: 46, pierce: 999, crit: 0.15 },
  },
  {
    key: 'eclipse', nameJa: '蝕の聖印', nameEn: 'Eclipse Sigil', sprite: 'sigil',
    rarity: 'legendary', job: null, cost: 12, w: 2, h: 2, tags: ['relic'],
    desc: '全武器 攻撃 +28%、クリティカル +10%、最大HP +30。',
    maxHp: 30,
    auras: [
      { scope: 'all', tag: 'blade', atkMul: 1.28, critAdd: 0.1 },
      { scope: 'all', tag: 'heavy', atkMul: 1.28, critAdd: 0.1 },
      { scope: 'all', tag: 'cinder', atkMul: 1.28 },
    ],
  },

  /* ---------- SENTINEL (blade / heavy / guard) ---------- */
  {
    key: 'sen_windcutter', nameJa: '風切りの剣', nameEn: 'Windcutter', sprite: 'saber',
    rarity: 'rare', job: 'sentinel', cost: 5, w: 1, h: 2, tags: ['blade'],
    desc: '0.65秒ごとに攻撃。隣接する刃の発動を10%加速。',
    action: { cd: 0.65, atk: 8 },
    auras: [{ scope: 'adj', tag: 'blade', cdMul: 0.9 }],
  },
  {
    key: 'sen_bracer', nameJa: '連撃の腕輪', nameEn: 'Cadence Bracer', sprite: 'ring',
    rarity: 'rare', job: 'sentinel', cost: 4, w: 1, h: 1, tags: ['blade'],
    desc: '同じ行の刃の攻撃 +14% / 発動 +8%。',
    auras: [{ scope: 'row', tag: 'blade', atkMul: 1.14, cdMul: 0.92 }],
  },
  {
    key: 'sen_waraxe', nameJa: '両手斧', nameEn: 'Greataxe', sprite: 'axe',
    rarity: 'rare', job: 'sentinel', cost: 6, w: 1, h: 2, tags: ['heavy'],
    desc: '2.0秒ごとに重撃。クリティカル時に火傷を付与。',
    action: { cd: 2.0, atk: 30, crit: 0.2, burn: 10 },
  },
  {
    key: 'sen_maul', nameJa: '戦槌', nameEn: 'Warhammer', sprite: 'maul',
    rarity: 'epic', job: 'sentinel', cost: 8, w: 2, h: 2, tags: ['heavy'],
    desc: '2.4秒ごとに痛打。シールドを20貫通、脆弱を付与。',
    action: { cd: 2.4, atk: 40, pierce: 20, vuln: 0.15 },
  },
  {
    key: 'sen_riposte', nameJa: '反撃の盾', nameEn: 'Riposte Shield', sprite: 'shield',
    rarity: 'rare', job: 'sentinel', cost: 5, w: 1, h: 1, tags: ['guard'],
    desc: '1.0秒ごとにシールド +8 と小反撃。最大HP +16。',
    maxHp: 16,
    action: { cd: 1.0, shield: 8, atk: 7 },
  },
  {
    key: 'sen_guardian', nameJa: '守護者の鎧', nameEn: "Guardian's Mail", sprite: 'plate',
    rarity: 'legendary', job: 'sentinel', cost: 11, w: 2, h: 2, tags: ['guard'],
    desc: '最大HP +55。1.0秒ごとにシールド +14。盾の防御を攻撃へ。',
    maxHp: 55,
    action: { cd: 1.0, shield: 14, atk: 9 },
    auras: [{ scope: 'all', tag: 'guard', atkMul: 1.2 }],
  },

  /* ---------- CATALYST (toxin / cinder / hex) ---------- */
  {
    key: 'cat_fang', nameJa: '蛇の牙', nameEn: 'Serpent Fang', sprite: 'fang',
    rarity: 'rare', job: 'catalyst', cost: 5, w: 1, h: 1, tags: ['toxin'],
    desc: '1.0秒ごとに毒を2スタック付与。',
    action: { cd: 1.0, poison: 2 },
  },
  {
    key: 'cat_flask', nameJa: '猛毒のフラスコ', nameEn: 'Venom Flask', sprite: 'flask',
    rarity: 'epic', job: 'catalyst', cost: 8, w: 1, h: 2, tags: ['toxin'],
    desc: '隣接する毒アイテムの毒スタック +2。1.2秒ごとに毒3。',
    action: { cd: 1.2, poison: 3 },
    auras: [{ scope: 'adj', tag: 'toxin', poisonAdd: 2 }],
  },
  {
    key: 'cat_bomb', nameJa: '小型爆弾', nameEn: 'Firebomb', sprite: 'bomb',
    rarity: 'rare', job: 'catalyst', cost: 5, w: 1, h: 1, tags: ['cinder'],
    desc: '1.8秒ごとに爆発。直撃 +火傷。',
    action: { cd: 1.8, atk: 18, burn: 8 },
  },
  {
    key: 'cat_fuse', nameJa: '連鎖の導火線', nameEn: 'Chain Fuse', sprite: 'fuse',
    rarity: 'epic', job: 'catalyst', cost: 8, w: 2, h: 1, tags: ['cinder'],
    desc: '同じ行の燼アイテムの火傷を1.5倍にし、発動を15%加速。',
    auras: [{ scope: 'row', tag: 'cinder', burnMul: 1.5, cdMul: 0.85 }],
  },
  {
    key: 'cat_censer', nameJa: '黒煙の香炉', nameEn: 'Black Censer', sprite: 'censer',
    rarity: 'rare', job: 'catalyst', cost: 5, w: 1, h: 1, tags: ['hex'],
    desc: '1.4秒ごとに鈍足と脆弱を付与。',
    action: { cd: 1.4, slow: 0.12, vuln: 0.1 },
  },
  {
    key: 'cat_grimoire', nameJa: '黒い薬壺', nameEn: 'Plague Urn', sprite: 'flask',
    rarity: 'legendary', job: 'catalyst', cost: 11, w: 2, h: 2, tags: ['toxin', 'hex'],
    desc: '0.9秒ごとに毒4を付与。全毒アイテムの毒 +1。脆弱を付与。',
    action: { cd: 0.9, poison: 4, vuln: 0.12 },
    auras: [{ scope: 'all', tag: 'toxin', poisonAdd: 1 }],
  },

  /* ---------- BROKER (coin / relic) ---------- */
  {
    key: 'bro_ledger', nameJa: '商人の帳簿', nameEn: "Merchant's Ledger", sprite: 'ledger',
    rarity: 'rare', job: 'broker', cost: 4, w: 1, h: 2, tags: ['coin'],
    desc: '所持ゴールド6ごとに攻撃1。0.9秒ごとに発動。',
    action: { cd: 0.9, atk: 1, goldScale: 6 },
  },
  {
    key: 'bro_purse', nameJa: '金貨袋', nameEn: 'Coin Purse', sprite: 'coin',
    rarity: 'rare', job: 'broker', cost: 5, w: 1, h: 1, tags: ['coin'],
    desc: '同じ行の貨アイテムの攻撃 +20%。最大HP +12。',
    maxHp: 12,
    auras: [{ scope: 'row', tag: 'coin', atkMul: 1.2 }],
  },
  {
    key: 'bro_ring', nameJa: '利子の指輪', nameEn: 'Interest Ring', sprite: 'ring',
    rarity: 'epic', job: 'broker', cost: 7, w: 1, h: 1, tags: ['coin'],
    desc: '所持ゴールド4ごとに攻撃1。全貨アイテムの攻撃 +12%。',
    action: { cd: 1.1, atk: 1, goldScale: 4 },
    auras: [{ scope: 'all', tag: 'coin', atkMul: 1.12 }],
  },
  {
    key: 'bro_knife', nameJa: '投げナイフ', nameEn: 'Throwing Knife', sprite: 'knife',
    rarity: 'common', job: 'broker', cost: 2, w: 1, h: 1, tags: ['relic'],
    desc: '0.8秒ごとに素早い投擲。安価な手数。',
    action: { cd: 0.8, atk: 7 },
  },
  {
    key: 'bro_cracker', nameJa: '露店の爆竹', nameEn: 'Market Cracker', sprite: 'bomb',
    rarity: 'rare', job: 'broker', cost: 4, w: 1, h: 1, tags: ['relic', 'cinder'],
    desc: '1.2秒ごとに炸裂。隣接する遺アイテムの攻撃 +15%。',
    action: { cd: 1.2, atk: 12, burn: 4 },
    auras: [{ scope: 'adj', tag: 'relic', atkMul: 1.15 }],
  },
  {
    key: 'bro_scales', nameJa: '黄金の天秤', nameEn: 'Golden Scales', sprite: 'scales',
    rarity: 'legendary', job: 'broker', cost: 12, w: 2, h: 2, tags: ['coin'],
    desc: '所持ゴールド3ごとに攻撃1。全貨アイテム +25%。最大HP +20。',
    maxHp: 20,
    action: { cd: 0.8, atk: 2, goldScale: 3 },
    auras: [{ scope: 'all', tag: 'coin', atkMul: 1.25 }],
  },
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.key, it]));

export function itemById(key: string): Item | undefined {
  return ITEM_MAP[key];
}

/** Footprint of an item accounting for rotation. */
export function footprint(it: Item, rot: 0 | 1): { w: number; h: number } {
  return rot === 0 ? { w: it.w, h: it.h } : { w: it.h, h: it.w };
}
