// GRID STELLA — master data: the five instruments and the enemy ladder.
import type { Enemy, Item } from './types';

export const GRID = 5;

export const SHOP_POOL: Item[] = [
  {
    key: 'needle',
    icon: '📌',
    nameJa: '観測針',
    nameEn: 'Navigator Needle',
    type: 'weapon',
    w: 1,
    h: 1,
    attack: 4,
    cooldown: 2.0,
    cost: 3,
    effect: '基礎の調律針。安定した攻撃を刻む。',
  },
  {
    key: 'globe',
    icon: '🌐',
    nameJa: '天球儀',
    nameEn: 'Celestial Globe',
    type: 'weapon',
    w: 2,
    h: 2,
    attack: 16,
    cooldown: 4.5,
    cost: 8,
    effect: '重く強大な一撃。広い座標を占有する。',
  },
  {
    key: 'compass',
    icon: '🧭',
    nameJa: '羅針盤の刻印',
    nameEn: 'Compass Rose',
    type: 'buff',
    w: 1,
    h: 1,
    cost: 4,
    effect: '上下左右に隣接する武器のクールダウンを20%短縮。',
  },
  {
    key: 'plumb',
    icon: '⚱️',
    nameJa: '均衡の分銅',
    nameEn: 'Plumb Bob',
    type: 'buff',
    w: 1,
    h: 1,
    cost: 3,
    effect: '左右に隣接する武器の攻撃力を+2する。',
  },
  {
    key: 'coat',
    icon: '🧥',
    nameJa: '方位外套',
    nameEn: 'Navigator Coat',
    type: 'defense',
    w: 2,
    h: 1,
    cost: 5,
    effect: '戦闘中、3秒ごとにシールドを+4生成する。',
  },
];

export const ENEMY_PRESETS: Enemy[] = [
  { nameJa: '歪んだ座標', nameEn: 'TYPE-A', hp: 70, attack: 6, cooldown: 2.5, shield: 0 },
  { nameJa: '暴走した観測機', nameEn: 'RUNAWAY', hp: 120, attack: 9, cooldown: 2.0, shield: 8 },
  { nameJa: '反転せし極星', nameEn: 'NULL-POLE', hp: 180, attack: 13, cooldown: 1.8, shield: 16 },
];
