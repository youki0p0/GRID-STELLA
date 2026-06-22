// 神楽マキナ :: jobs & circuit-module catalog (data-driven).
import type { Item, Job, JobId, Rarity } from './types';

export const GRID_W = 6;
export const GRID_H = 5;
export const MAX_LEVEL = 3;
const STAT_MUL = [1, 1.7, 2.8];
export const statMul = (level: number): number => STAT_MUL[Math.max(1, Math.min(MAX_LEVEL, level)) - 1];
export const levelStars = (level: number): string => '★'.repeat(Math.max(1, Math.min(MAX_LEVEL, level)));

export const RARITY_META: Record<Rarity, { ja: string; en: string; tone: string }> = {
  common: { ja: '量産', en: 'Common', tone: '#9b978d' },
  rare: { ja: '精製', en: 'Rare', tone: '#7fa6c9' },
  epic: { ja: '機巧', en: 'Epic', tone: '#b18ad6' },
  legendary: { ja: '神器', en: 'Legendary', tone: '#dab94f' },
};

/* ============================================================ JOBS */
export const JOBS: Record<JobId, Job> = {
  striker: {
    id: 'striker', nameJa: 'リアクターストライカー', nameEn: 'Reactor Striker', sprite: 'orb',
    role: '高火力アタッカー', style: 'detonate', favors: ['overvolt', 'crash'],
    tagline: '過電圧を盛り、一撃で起爆する。',
    desc: '状態異常を起爆して大ダメージ。防御は薄く連撃に弱い。',
    startingHp: 95, startingGold: 8,
    tactics: [
      { nameJa: '過電圧起爆', desc: '過電圧を積み、起爆装置で一気に爆発させる。' },
      { nameJa: '重砲一撃', desc: 'レールガン級の高消費・高威力で削り切る。' },
      { nameJa: 'クラッシュ制圧（共通）', desc: '敵装置を停止させ手数を奪う。' },
    ],
  },
  gunner: {
    id: 'gunner', nameJa: 'インダクションガンナー', nameEn: 'Induction Gunner', sprite: 'twin',
    role: '高速連射', style: 'accumulate', favors: ['virus', 'jam'],
    tagline: '状態異常を高速で積み上げる。',
    desc: '低エネルギーの連射で状態異常を蓄積。高耐久が苦手。',
    startingHp: 100, startingGold: 8,
    tactics: [
      { nameJa: 'ウイルス蓄積', desc: 'ウイルスを大量に積んで継続ダメージで溶かす。' },
      { nameJa: 'ジャミング制圧', desc: '命中を奪い、敵の手数を空転させる。' },
      { nameJa: '飽和射撃（共通）', desc: '低消費武器を並べ、回転率で押す。' },
    ],
  },
  caster: {
    id: 'caster', nameJa: 'マトリクスキャスター', nameEn: 'Matrix Caster', sprite: 'sigil',
    role: '妨害・耐久', style: 'reference', favors: ['freeze', 'memleak'],
    tagline: '状態異常を参照しダメージへ変換する。',
    desc: 'シールドと妨害で耐え、敵の状態異常値を火力に変える。瞬間火力は低い。',
    startingHp: 110, startingGold: 8,
    tactics: [
      { nameJa: 'フリーズ参照', desc: '敵のフリーズ値×係数でダメージを出す。' },
      { nameJa: 'メモリリーク', desc: '敵のエネルギーを枯らし、装置を黙らせる。' },
      { nameJa: '装甲反撃（共通）', desc: 'シールドとトゲで受けて返す。' },
    ],
  },
};
export const JOB_LIST = Object.values(JOBS);

/* ============================================================ ITEMS */
export const ITEMS: Item[] = [
  /* ---------- COMMON ---------- */
  { key: 'dart', nameJa: '射出ダーツ', nameEn: 'Dart Driver', sprite: 'knife', rarity: 'common', job: null, cost: 2, w: 1, h: 1, tags: ['weapon'],
    desc: '0.7秒/消費1で小ダメージ。回路の土台。', weapon: { dmg: 6, cd: 0.7, energy: 1 } },
  { key: 'autocannon', nameJa: '連装砲', nameEn: 'Autocannon', sprite: 'twin', rarity: 'common', job: null, cost: 3, w: 1, h: 2, tags: ['weapon'],
    desc: '0.5秒/消費1で連射。', weapon: { dmg: 5, cd: 0.5, energy: 1 } },
  { key: 'plasma', nameJa: 'プラズマ砲', nameEn: 'Plasma Caster', sprite: 'ember', rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['weapon'],
    desc: '1.4秒/消費2。ウイルスを1付与。', weapon: { dmg: 13, cd: 1.4, energy: 2, applies: [{ status: 'virus', amount: 1 }] } },
  { key: 'capacitor', nameJa: 'コンデンサ', nameEn: 'Capacitor', sprite: 'gem', rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['battery'],
    desc: '最大エネルギー +1。', support: { maxEnergy: 1 } },
  { key: 'coil', nameJa: '誘導コイル', nameEn: 'Induction Coil', sprite: 'ring', rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['support'],
    desc: 'エネルギー回復 +0.4/秒。', support: { energyRegen: 0.4 } },
  { key: 'barrier', nameJa: '障壁発生器', nameEn: 'Barrier Node', sprite: 'shield', rarity: 'common', job: null, cost: 3, w: 1, h: 1, tags: ['shield'],
    desc: '戦闘開始時シールド +18。', support: { shieldStart: 18 } },
  { key: 'targeting', nameJa: '照準装置', nameEn: 'Targeting Array', sprite: 'lens', rarity: 'rare', job: null, cost: 4, w: 1, h: 1, tags: ['support'],
    desc: '命中 +8% / クリティカル率 +10%。', support: { accuracy: 0.08, crit: 0.1 } },
  { key: 'overclock', nameJa: 'オーバークロッカー', nameEn: 'Overclocker', sprite: 'sigil', rarity: 'rare', job: null, cost: 4, w: 1, h: 1, tags: ['clock'],
    desc: '全装置の速度 +12%。', support: { haste: 0.12 } },
  { key: 'amplifier', nameJa: '増幅基板', nameEn: 'Amp Board', sprite: 'prism', rarity: 'rare', job: null, cost: 4, w: 1, h: 1, tags: ['support'],
    desc: '武器ダメージ +4。最大HP +14。', support: { power: 4, hp: 14 } },
  { key: 'plating', nameJa: '装甲板', nameEn: 'Hull Plating', sprite: 'plate', rarity: 'common', job: null, cost: 2, w: 2, h: 1, tags: ['support'],
    desc: '最大HP +22。', support: { hp: 22 } },

  /* ---------- STRIKER (detonate / overvolt / crash) ---------- */
  { key: 'st_railgun', nameJa: 'レールガン', nameEn: 'Railgun', sprite: 'gsword', rarity: 'rare', job: 'striker', cost: 6, w: 1, h: 2, tags: ['weapon'],
    desc: '6秒/消費4。シールドを15貫通の重砲。', weapon: { dmg: 50, cd: 6, energy: 4, pierce: 15 } },
  { key: 'st_lance', nameJa: '過電圧槍', nameEn: 'Overvolt Lance', sprite: 'orb', rarity: 'rare', job: 'striker', cost: 5, w: 1, h: 2, tags: ['weapon'],
    desc: '1.8秒/消費2。過電圧を2付与。', weapon: { dmg: 16, cd: 1.8, energy: 2, applies: [{ status: 'overvolt', amount: 2 }] } },
  { key: 'st_detonator', nameJa: '起爆装置', nameEn: 'Detonator', sprite: 'bomb', rarity: 'epic', job: 'striker', cost: 7, w: 1, h: 1, tags: ['weapon'],
    desc: '3秒/消費3。敵の過電圧を全消費し1スタック5ダメージで起爆。', weapon: { dmg: 8, cd: 3, energy: 3, detonate: { status: 'overvolt', perStack: 5 } } },
  { key: 'st_crusher', nameJa: '粉砕鎚', nameEn: 'Crusher', sprite: 'maul', rarity: 'rare', job: 'striker', cost: 6, w: 2, h: 2, tags: ['weapon'],
    desc: '2.6秒/消費3。クラッシュで敵装置を停止。', weapon: { dmg: 26, cd: 2.6, energy: 3, applies: [{ status: 'crash', amount: 1 }] } },
  { key: 'st_reactor', nameJa: '炉心ブースター', nameEn: 'Reactor Booster', sprite: 'star', rarity: 'epic', job: 'striker', cost: 7, w: 1, h: 1, tags: ['support'],
    desc: '武器ダメージ +6 / クリティカルダメージ +0.5。', support: { power: 6, critDmg: 0.5 } },
  { key: 'st_singularity', nameJa: '特異点砲', nameEn: 'Singularity Cannon', sprite: 'sigil', rarity: 'legendary', job: 'striker', cost: 11, w: 2, h: 2, tags: ['weapon'],
    desc: '4秒/消費5。過電圧を全消費し1スタック8で起爆＋直撃30。', weapon: { dmg: 30, cd: 4, energy: 5, pierce: 10, detonate: { status: 'overvolt', perStack: 8 } } },

  /* ---------- GUNNER (accumulate / virus / jam) ---------- */
  { key: 'gn_minigun', nameJa: 'ミニガン', nameEn: 'Minigun', sprite: 'twin', rarity: 'rare', job: 'gunner', cost: 5, w: 1, h: 2, tags: ['weapon'],
    desc: '0.4秒/消費1。ウイルスを1付与。', weapon: { dmg: 4, cd: 0.4, energy: 1, applies: [{ status: 'virus', amount: 1 }] } },
  { key: 'gn_needler', nameJa: 'ウイルス針', nameEn: 'Viral Needler', sprite: 'fang', rarity: 'rare', job: 'gunner', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '0.7秒/消費1。ウイルスを2付与。', weapon: { dmg: 3, cd: 0.7, energy: 1, applies: [{ status: 'virus', amount: 2 }] } },
  { key: 'gn_jammer', nameJa: '妨害電波塔', nameEn: 'Jammer Tower', sprite: 'censer', rarity: 'rare', job: 'gunner', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '1.0秒/消費1。ジャミングを2付与。', weapon: { dmg: 2, cd: 1.0, energy: 1, applies: [{ status: 'jam', amount: 2 }] } },
  { key: 'gn_autoloader', nameJa: '自動装填機', nameEn: 'Autoloader', sprite: 'ring', rarity: 'rare', job: 'gunner', cost: 5, w: 1, h: 1, tags: ['clock'],
    desc: '速度 +10% / エネルギー回復 +0.5。', support: { haste: 0.1, energyRegen: 0.5 } },
  { key: 'gn_plague', nameJa: '疫病散布機', nameEn: 'Plague Emitter', sprite: 'flask', rarity: 'epic', job: 'gunner', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.0秒/消費2。ウイルス2＋ジャミング1。', weapon: { dmg: 6, cd: 1.0, energy: 2, applies: [{ status: 'virus', amount: 2 }, { status: 'jam', amount: 1 }] } },
  { key: 'gn_swarm', nameJa: '群体ドローン', nameEn: 'Swarm Drones', sprite: 'star', rarity: 'legendary', job: 'gunner', cost: 11, w: 2, h: 2, tags: ['weapon'],
    desc: '0.35秒/消費1。ウイルス1を超高速付与。', weapon: { dmg: 4, cd: 0.35, energy: 1, applies: [{ status: 'virus', amount: 1 }] } },

  /* ---------- CASTER (reference / freeze / memleak) ---------- */
  { key: 'cs_cryo', nameJa: '冷却放射器', nameEn: 'Cryo Emitter', sprite: 'gem', rarity: 'rare', job: 'caster', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '1.0秒/消費1。フリーズを2付与。', weapon: { dmg: 3, cd: 1.0, energy: 1, applies: [{ status: 'freeze', amount: 2 }] } },
  { key: 'cs_frostbeam', nameJa: '霜結ビーム', nameEn: 'Frost Beam', sprite: 'orb', rarity: 'epic', job: 'caster', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.5秒/消費2。敵フリーズ値×2の追加ダメージ（参照）。', weapon: { dmg: 6, cd: 1.5, energy: 2, reference: { status: 'freeze', mult: 2 } } },
  { key: 'cs_leak', nameJa: 'リーク探針', nameEn: 'Leak Probe', sprite: 'prism', rarity: 'rare', job: 'caster', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '1.2秒/消費1。メモリリークを2付与。', weapon: { dmg: 2, cd: 1.2, energy: 1, applies: [{ status: 'memleak', amount: 2 }] } },
  { key: 'cs_resonator', nameJa: '共鳴器', nameEn: 'Resonator', sprite: 'sigil', rarity: 'epic', job: 'caster', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.6秒/消費2。敵メモリリーク値×3の追加ダメージ（参照）。', weapon: { dmg: 5, cd: 1.6, energy: 2, reference: { status: 'memleak', mult: 3 } } },
  { key: 'cs_mirror', nameJa: '反射障壁', nameEn: 'Mirror Ward', sprite: 'shield', rarity: 'rare', job: 'caster', cost: 5, w: 1, h: 1, tags: ['shield'],
    desc: '戦闘開始時シールド +24 / トゲ 4。', support: { shieldStart: 24, thorns: 4 } },
  { key: 'cs_aegis', nameJa: '神盾フィールド', nameEn: 'Aegis Field', sprite: 'star', rarity: 'legendary', job: 'caster', cost: 11, w: 2, h: 2, tags: ['shield'],
    desc: '最大HP +40 / シールド +30 / ファイアウォール（デバフ無効）。', support: { hp: 40, shieldStart: 30, firewall: true } },
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.key, it]));
export const itemById = (key: string): Item | undefined => ITEM_MAP[key];

export function footprint(it: Item, rot: 0 | 1): { w: number; h: number } {
  return rot === 0 ? { w: it.w, h: it.h } : { w: it.h, h: it.w };
}
