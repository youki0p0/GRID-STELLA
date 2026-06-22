// 神楽マキナ — 機械神の回路 :: jobs & circuit-item catalog (data-driven, Ver0.2).
import type { Item, Job, JobId, ItemCategory, Rarity } from './types';

export const GRID_W = 6;
export const GRID_H = 5;

export const RARITY_META: Record<Rarity, { ja: string; en: string; tone: string }> = {
  common: { ja: '量産', en: 'Common', tone: '#9b978d' },
  rare: { ja: '精製', en: 'Rare', tone: '#7fa6c9' },
  epic: { ja: '機巧', en: 'Epic', tone: '#b18ad6' },
  legendary: { ja: '神器', en: 'Legendary', tone: '#dab94f' },
  mythic: { ja: '機械神', en: 'Mythic', tone: '#e0584a' },
};

export const CATEGORY_META: Record<ItemCategory, { ja: string; icon: string }> = {
  melee: { ja: '接触武器', icon: 'maul' },
  ranged: { ja: '非接触武器', icon: 'twin' },
  accessory: { ja: 'アクセサリー', icon: 'ring' },
  armor: { ja: '防具', icon: 'plate' },
};

/* ============================================================ JOBS */
export const JOBS: Record<JobId, Job> = {
  striker: {
    id: 'striker', nameJa: 'リアクターストライカー', nameEn: 'Reactor Striker', sprite: 'orb',
    role: '高火力アタッカー', style: 'detonate', favors: ['overvolt', 'crash'],
    tagline: '過電圧を盛り、一撃で起爆する。',
    desc: '状態異常を起爆して大ダメージ。防御は薄く連撃に弱い。',
    startingHp: 95, startingGold: 8, startingWeapon: 'st_breaker',
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
    startingHp: 100, startingGold: 8, startingWeapon: 'gn_minigun',
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
    startingHp: 110, startingGold: 8, startingWeapon: 'cs_cryo',
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
  /* ---------- COMMON (job:null) ---------- */
  { key: 'dart', nameJa: '射出ダーツ', nameEn: 'Dart Driver', sprite: 'knife', rarity: 'common', job: null, category: 'ranged', cost: 2, w: 1, h: 1, tags: ['weapon'],
    desc: '0.7秒/消費1で小ダメージ。回路の土台。', weapon: { dmg: 6, cd: 0.7, energy: 1, accuracy: 0.95 } },
  { key: 'autocannon', nameJa: '連装砲', nameEn: 'Autocannon', sprite: 'twin', rarity: 'common', job: null, category: 'ranged', cost: 3, w: 1, h: 2, tags: ['weapon'],
    desc: '0.5秒/消費1で連射。', weapon: { dmg: 5, cd: 0.5, energy: 1, accuracy: 0.9 } },
  { key: 'cleaver', nameJa: '接触刃', nameEn: 'Contact Cleaver', sprite: 'blade', rarity: 'common', job: null, category: 'melee', cost: 3, w: 1, h: 1, tags: ['weapon'],
    desc: '1.0秒/消費1の接触武器。', weapon: { dmg: 11, cd: 1.0, energy: 1, accuracy: 0.95 } },
  { key: 'plasma', nameJa: 'プラズマ砲', nameEn: 'Plasma Caster', sprite: 'ember', rarity: 'common', job: null, category: 'ranged', cost: 3, w: 1, h: 1, tags: ['weapon'],
    desc: '1.4秒/消費2。ウイルスを1付与。', weapon: { dmg: 13, cd: 1.4, energy: 2, accuracy: 0.9, applies: [{ status: 'virus', amount: 1 }] } },
  { key: 'capacitor', nameJa: 'コンデンサ', nameEn: 'Capacitor', sprite: 'gem', rarity: 'common', job: null, category: 'accessory', cost: 3, w: 1, h: 1, tags: ['battery'],
    desc: '最大エネルギー +1 / 回復 +0.3/秒。', support: { maxEnergy: 1, energyRegen: 0.3 } },
  { key: 'coil', nameJa: '誘導コイル', nameEn: 'Induction Coil', sprite: 'ring', rarity: 'common', job: null, category: 'accessory', cost: 3, w: 1, h: 1, tags: ['support'],
    desc: 'エネルギー回復 +0.4/秒。', support: { energyRegen: 0.4 } },
  { key: 'sight', nameJa: '簡易照準', nameEn: 'Iron Sight', sprite: 'lens', rarity: 'common', job: null, category: 'accessory', cost: 2, w: 1, h: 1, tags: ['support'],
    desc: '命中 +6% / クリ率 +6%。', support: { accuracy: 0.06, crit: 0.06 } },
  { key: 'barrier', nameJa: '障壁発生器', nameEn: 'Barrier Node', sprite: 'shield', rarity: 'common', job: null, category: 'armor', cost: 3, w: 1, h: 1, tags: ['shield'],
    desc: '戦闘開始時シールド +18 / 最大HP +8。', support: { shieldStart: 18, hp: 8 } },
  { key: 'plating', nameJa: '装甲板', nameEn: 'Hull Plating', sprite: 'plate', rarity: 'common', job: null, category: 'armor', cost: 2, w: 2, h: 1, tags: ['armor'],
    desc: '最大HP +22。', support: { hp: 22 } },
  { key: 'scrapcore', nameJa: '廃炉コア', nameEn: 'Scrap Core', sprite: 'coin', rarity: 'common', job: null, category: 'accessory', cost: 2, w: 1, h: 1, tags: ['support'],
    desc: '武器ダメージ +2。', support: { power: 2 } },

  /* ---------- COMMON MATERIALS (recipe fuel; cheap accessories) ---------- */
  { key: 'mat_barrel', nameJa: '高精度バレル', nameEn: 'Precision Barrel', sprite: 'vial', rarity: 'common', job: null, category: 'accessory', cost: 2, w: 1, h: 1, tags: ['material'],
    desc: '素材。命中 +5%。隣接融合で武器を強化。', support: { accuracy: 0.05 } },
  { key: 'mat_accel', nameJa: '電磁加速器', nameEn: 'EM Accelerator', sprite: 'axe', rarity: 'common', job: null, category: 'accessory', cost: 2, w: 1, h: 1, tags: ['material'],
    desc: '素材。速度 +6%。隣接融合で武器を強化。', support: { haste: 0.06 } },
  { key: 'mat_core', nameJa: '量子コア', nameEn: 'Quantum Core', sprite: 'gem', rarity: 'rare', job: null, category: 'accessory', cost: 4, w: 1, h: 1, tags: ['material'],
    desc: '素材。武器ダメージ +3 / 最大エネルギー +1。融合で機械神武器へ。', support: { power: 3, maxEnergy: 1 } },

  /* ---------- SHARED RARE/EPIC ACCESSORIES & ARMOR ---------- */
  { key: 'targeting', nameJa: '照準装置', nameEn: 'Targeting Array', sprite: 'lens', rarity: 'rare', job: null, category: 'accessory', cost: 4, w: 1, h: 1, tags: ['support'],
    desc: '命中 +8% / クリティカル率 +10%。', support: { accuracy: 0.08, crit: 0.1 } },
  { key: 'overclock', nameJa: 'オーバークロッカー', nameEn: 'Overclocker', sprite: 'sigil', rarity: 'rare', job: null, category: 'accessory', cost: 4, w: 1, h: 1, tags: ['clock'],
    desc: '全装置の速度 +12%。', support: { haste: 0.12 } },
  { key: 'amplifier', nameJa: '増幅基板', nameEn: 'Amp Board', sprite: 'prism', rarity: 'rare', job: null, category: 'accessory', cost: 4, w: 1, h: 1, tags: ['support'],
    desc: '武器ダメージ +4 / 最大HP +14。', support: { power: 4, hp: 14 } },
  { key: 'bulwark', nameJa: '重装甲', nameEn: 'Bulwark', sprite: 'plate', rarity: 'rare', job: null, category: 'armor', cost: 5, w: 2, h: 2, tags: ['armor'],
    desc: '最大HP +40 / 防具数×シールド6。', support: { hp: 40, countScaling: [{ category: 'armor', shieldPer: 6 }] } },
  { key: 'relay', nameJa: '電力中継器', nameEn: 'Power Relay', sprite: 'coin', rarity: 'rare', job: null, category: 'accessory', cost: 4, w: 1, h: 1, tags: ['battery'],
    desc: '最大エネルギー +2 / エネルギー回復 +0.5/秒。回路の供給を底上げ。', support: { maxEnergy: 2, energyRegen: 0.5 } },
  { key: 'thornplate', nameJa: '棘装甲', nameEn: 'Thorn Plating', sprite: 'plate', rarity: 'epic', job: null, category: 'armor', cost: 6, w: 2, h: 1, tags: ['armor'],
    desc: '最大HP +30 / 戦闘開始時シールド +20 / トゲ 6。接触に棘で報いる装甲。', support: { hp: 30, shieldStart: 20, thorns: 6 } },
  { key: 'critmatrix', nameJa: '臨界演算盤', nameEn: 'Crit Matrix', sprite: 'prism', rarity: 'epic', job: null, category: 'accessory', cost: 6, w: 1, h: 1, tags: ['support'],
    desc: 'クリティカル率 +12% / クリティカルダメージ +0.6 / 命中 +6%。', support: { crit: 0.12, critDmg: 0.6, accuracy: 0.06 } },
  { key: 'archive', nameJa: '神器アーカイブ', nameEn: 'Relic Archive', sprite: 'ledger', rarity: 'legendary', job: null, category: 'accessory', cost: 10, w: 2, h: 1, tags: ['support'],
    desc: '武器ダメージ +7 / 最大HP +24 / 最大エネルギー +1 / クリ率 +6%。汎用の神器基板。', support: { power: 7, hp: 24, maxEnergy: 1, crit: 0.06 } },

  /* ---------- STRIKER (detonate / overvolt / crash) ---------- */
  // startingWeapon -> recipe base
  { key: 'st_breaker', nameJa: '衝撃ブレーカー', nameEn: 'Impact Breaker', sprite: 'maul', rarity: 'common', job: 'striker', category: 'melee', cost: 4, w: 1, h: 2, tags: ['weapon'],
    desc: '2.0秒/消費2の接触武器。過電圧を1付与。育成の起点。', weapon: { dmg: 18, cd: 2.0, energy: 2, accuracy: 0.92, applies: [{ status: 'overvolt', amount: 1 }] } },
  { key: 'st_lance', nameJa: '過電圧槍', nameEn: 'Overvolt Lance', sprite: 'orb', rarity: 'rare', job: 'striker', category: 'melee', cost: 5, w: 1, h: 2, tags: ['weapon'],
    desc: '1.8秒/消費2。過電圧を2付与。', weapon: { dmg: 16, cd: 1.8, energy: 2, accuracy: 0.92, applies: [{ status: 'overvolt', amount: 2 }] } },
  { key: 'st_railgun', nameJa: 'レールガン', nameEn: 'Railgun', sprite: 'gsword', rarity: 'rare', job: 'striker', category: 'ranged', cost: 6, w: 1, h: 2, tags: ['weapon'],
    desc: '6秒/消費4。シールドを15貫通の重砲。', weapon: { dmg: 50, cd: 6, energy: 4, accuracy: 0.95, pierce: 15 } },
  { key: 'st_detonator', nameJa: '起爆装置', nameEn: 'Detonator', sprite: 'bomb', rarity: 'epic', job: 'striker', category: 'ranged', cost: 7, w: 1, h: 1, tags: ['weapon'],
    desc: '3秒/消費3。敵の過電圧を全消費し1スタック5で起爆。', weapon: { dmg: 8, cd: 3, energy: 3, accuracy: 0.9, detonate: { status: 'overvolt', perStack: 5 } } },
  { key: 'st_crusher', nameJa: '粉砕鎚', nameEn: 'Crusher', sprite: 'maul', rarity: 'rare', job: 'striker', category: 'melee', cost: 6, w: 2, h: 2, tags: ['weapon'],
    desc: '2.6秒/消費3。クラッシュで敵装置を停止。', weapon: { dmg: 26, cd: 2.6, energy: 3, accuracy: 0.9, applies: [{ status: 'crash', amount: 1 }] } },
  { key: 'st_reactor', nameJa: '炉心ブースター', nameEn: 'Reactor Booster', sprite: 'star', rarity: 'epic', job: 'striker', category: 'accessory', cost: 7, w: 1, h: 1, tags: ['support'],
    desc: '武器ダメージ +6 / クリティカルダメージ +0.5。', support: { power: 6, critDmg: 0.5 } },
  { key: 'st_singularity', nameJa: '特異点砲', nameEn: 'Singularity Cannon', sprite: 'sigil', rarity: 'legendary', job: 'striker', category: 'ranged', cost: 11, w: 2, h: 2, tags: ['weapon'],
    desc: '4秒/消費5。過電圧を全消費し1スタック8で起爆＋直撃30。', weapon: { dmg: 30, cd: 4, energy: 5, accuracy: 0.95, pierce: 10, detonate: { status: 'overvolt', perStack: 8 } } },
  { key: 'st_overcharger', nameJa: '過電圧基板', nameEn: 'Overcharge Board', sprite: 'star', rarity: 'rare', job: 'striker', category: 'accessory', cost: 5, w: 1, h: 1, tags: ['support'],
    desc: '接触武器ダメージ +4 / クリダメ +0.3。過電圧ビルドの底上げ。', support: { critDmg: 0.3, categoryBuffs: [{ category: 'melee', dmg: 4 }] } },
  { key: 'st_arclash', nameJa: '連電刃', nameEn: 'Arc Lash', sprite: 'blade', rarity: 'epic', job: 'striker', category: 'melee', cost: 8, w: 1, h: 2, tags: ['weapon'],
    desc: '1.0秒/消費2。過電圧を2付与する高速接触武器。起爆の燃料を素早く積む。', weapon: { dmg: 12, cd: 1.0, energy: 2, accuracy: 0.93, applies: [{ status: 'overvolt', amount: 2 }] } },
  { key: 'st_thunderbreak', nameJa: '雷断ハンマー', nameEn: 'Thunderbreak', sprite: 'gsword', rarity: 'legendary', job: 'striker', category: 'melee', cost: 11, w: 2, h: 2, tags: ['weapon'],
    desc: '2.4秒/消費4。直撃28＋過電圧全消費1スタック7で起爆。クラッシュを1付与。', weapon: { dmg: 28, cd: 2.4, energy: 4, accuracy: 0.95, crit: 0.12, critMult: 2, detonate: { status: 'overvolt', perStack: 7 }, applies: [{ status: 'crash', amount: 1, chance: 0.35 }] } },
  // recipe intermediates / results
  { key: 'st_breaker_mk2', nameJa: '衝撃ブレーカー改', nameEn: 'Impact Breaker Mk2', sprite: 'maul', rarity: 'rare', job: 'striker', category: 'melee', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.8秒/消費2。過電圧を2付与。融合で強化済み。', weapon: { dmg: 24, cd: 1.8, energy: 2, accuracy: 0.95, applies: [{ status: 'overvolt', amount: 2 }] } },
  { key: 'st_voltmaul', nameJa: '雷轟鎚', nameEn: 'Volt Maul', sprite: 'maul', rarity: 'epic', job: 'striker', category: 'melee', cost: 9, w: 1, h: 2, tags: ['weapon'],
    desc: '2.2秒/消費3。過電圧を全消費し1スタック6で起爆＋直撃24。', weapon: { dmg: 24, cd: 2.2, energy: 3, accuracy: 0.95, crit: 0.1, critMult: 2, detonate: { status: 'overvolt', perStack: 6 } } },
  { key: 'st_ragnarok', nameJa: '神鎚ラグナロク', nameEn: 'Ragnarok Hammer', sprite: 'gsword', rarity: 'mythic', job: 'striker', category: 'melee', cost: 13, w: 2, h: 2, tags: ['weapon'],
    desc: '3.4秒/消費5。直撃40＋過電圧全消費1スタック10で起爆。シールド20貫通。', weapon: { dmg: 40, cd: 3.4, energy: 5, accuracy: 0.95, crit: 0.15, critMult: 2, pierce: 20, detonate: { status: 'overvolt', perStack: 10 } } },
  // striker uniques (R5 picks)
  { key: 'st_uq_godcannon', nameJa: '機神砲ジュピター', nameEn: 'Jovian God-Cannon', sprite: 'star', rarity: 'mythic', job: 'striker', category: 'ranged', cost: 13, w: 2, h: 2, tags: ['weapon', 'unique'], unique: true,
    desc: '5秒/消費5。直撃55、シールド25貫通、過電圧1スタック12で起爆。', weapon: { dmg: 55, cd: 5, energy: 5, accuracy: 0.95, crit: 0.2, critMult: 2.2, pierce: 25, detonate: { status: 'overvolt', perStack: 12 } } },
  { key: 'st_uq_overdrive', nameJa: '過負荷炉オーバードライブ', nameEn: 'Overdrive Reactor', sprite: 'sigil', rarity: 'mythic', job: 'striker', category: 'accessory', cost: 12, w: 2, h: 1, tags: ['support', 'unique'], unique: true,
    desc: '接触武器ダメージ +8 / クリダメ +1.0 / 最大エネルギー +2。', support: { critDmg: 1.0, maxEnergy: 2, categoryBuffs: [{ category: 'melee', dmg: 8 }] } },
  { key: 'st_uq_arcfist', nameJa: '雷神アークフィスト', nameEn: 'Arc Fist', sprite: 'orb', rarity: 'epic', job: 'striker', category: 'melee', cost: 9, w: 1, h: 1, tags: ['weapon', 'unique'], unique: true,
    desc: '1.2秒/消費2。過電圧を3付与＋クラッシュを1付与。', weapon: { dmg: 14, cd: 1.2, energy: 2, accuracy: 0.92, applies: [{ status: 'overvolt', amount: 3 }, { status: 'crash', amount: 1, chance: 0.25 }] } },

  /* ---------- GUNNER (accumulate / virus / jam) ---------- */
  { key: 'gn_minigun', nameJa: 'ミニガン', nameEn: 'Minigun', sprite: 'twin', rarity: 'common', job: 'gunner', category: 'ranged', cost: 4, w: 1, h: 2, tags: ['weapon'],
    desc: '0.4秒/消費1。ウイルスを1付与。育成の起点。', weapon: { dmg: 4, cd: 0.4, energy: 1, accuracy: 0.85, applies: [{ status: 'virus', amount: 1 }] } },
  { key: 'gn_needler', nameJa: 'ウイルス針', nameEn: 'Viral Needler', sprite: 'fang', rarity: 'rare', job: 'gunner', category: 'ranged', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '0.7秒/消費1。ウイルスを2付与。', weapon: { dmg: 3, cd: 0.7, energy: 1, accuracy: 0.9, applies: [{ status: 'virus', amount: 2 }] } },
  { key: 'gn_jammer', nameJa: '妨害電波塔', nameEn: 'Jammer Tower', sprite: 'censer', rarity: 'rare', job: 'gunner', category: 'ranged', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '1.0秒/消費1。ジャミングを2付与。', weapon: { dmg: 2, cd: 1.0, energy: 1, accuracy: 0.9, applies: [{ status: 'jam', amount: 2 }] } },
  { key: 'gn_autoloader', nameJa: '自動装填機', nameEn: 'Autoloader', sprite: 'ring', rarity: 'rare', job: 'gunner', category: 'accessory', cost: 5, w: 1, h: 1, tags: ['clock'],
    desc: '速度 +10% / エネルギー回復 +0.5。', support: { haste: 0.1, energyRegen: 0.5 } },
  { key: 'gn_plague', nameJa: '疫病散布機', nameEn: 'Plague Emitter', sprite: 'flask', rarity: 'epic', job: 'gunner', category: 'ranged', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.0秒/消費2。ウイルス2＋ジャミング1。', weapon: { dmg: 6, cd: 1.0, energy: 2, accuracy: 0.9, applies: [{ status: 'virus', amount: 2 }, { status: 'jam', amount: 1 }] } },
  { key: 'gn_swarm', nameJa: '群体ドローン', nameEn: 'Swarm Drones', sprite: 'star', rarity: 'legendary', job: 'gunner', category: 'ranged', cost: 11, w: 2, h: 2, tags: ['weapon'],
    desc: '0.35秒/消費1。ウイルス1を超高速付与。', weapon: { dmg: 4, cd: 0.35, energy: 1, accuracy: 0.88, applies: [{ status: 'virus', amount: 1 }] } },
  { key: 'gn_ammofeed', nameJa: '自動給弾装置', nameEn: 'Ammo Feeder', sprite: 'ring', rarity: 'rare', job: 'gunner', category: 'accessory', cost: 4, w: 1, h: 1, tags: ['clock'],
    desc: '非接触武器の速度 +12% / エネルギー回復 +0.4/秒。連射ビルドの回転率を上げる。', support: { energyRegen: 0.4, categoryBuffs: [{ category: 'ranged', hastePct: 0.12 }] } },
  { key: 'gn_jamburst', nameJa: '妨害爆雷', nameEn: 'Jam Burst', sprite: 'censer', rarity: 'epic', job: 'gunner', category: 'ranged', cost: 7, w: 1, h: 1, tags: ['weapon'],
    desc: '0.8秒/消費1。ジャミング2＋ウイルス1。敵の命中を高速で奪う。', weapon: { dmg: 3, cd: 0.8, energy: 1, accuracy: 0.92, applies: [{ status: 'jam', amount: 2 }, { status: 'virus', amount: 1 }] } },
  { key: 'gn_repeater', nameJa: '精密連射銃', nameEn: 'Precision Repeater', sprite: 'twin', rarity: 'epic', job: 'gunner', category: 'ranged', cost: 8, w: 1, h: 2, tags: ['weapon'],
    desc: '0.5秒/消費1。クリ率+15%・クリダメ2.2の精密連射。ウイルスを1付与。', weapon: { dmg: 7, cd: 0.5, energy: 1, accuracy: 0.93, crit: 0.15, critMult: 2.2, applies: [{ status: 'virus', amount: 1 }] } },
  { key: 'gn_hailstorm', nameJa: '弾雨ヘイルストーム', nameEn: 'Hailstorm', sprite: 'fang', rarity: 'legendary', job: 'gunner', category: 'ranged', cost: 11, w: 2, h: 2, tags: ['weapon'],
    desc: '0.4秒/消費1。ウイルス2＋ジャミング1を高速付与。クリ率+10%。', weapon: { dmg: 6, cd: 0.4, energy: 1, accuracy: 0.92, crit: 0.1, critMult: 2, applies: [{ status: 'virus', amount: 2 }, { status: 'jam', amount: 1 }] } },
  // recipe intermediates / results
  { key: 'gn_minigun_mk2', nameJa: 'ミニガン改', nameEn: 'Minigun Mk2', sprite: 'twin', rarity: 'rare', job: 'gunner', category: 'ranged', cost: 6, w: 1, h: 2, tags: ['weapon'],
    desc: '0.4秒/消費1。ウイルス1＋ジャミング1。命中強化。', weapon: { dmg: 5, cd: 0.4, energy: 1, accuracy: 0.92, applies: [{ status: 'virus', amount: 1 }, { status: 'jam', amount: 1, chance: 0.5 }] } },
  { key: 'gn_gatling', nameJa: '疫病ガトリング', nameEn: 'Plague Gatling', sprite: 'twin', rarity: 'epic', job: 'gunner', category: 'ranged', cost: 9, w: 1, h: 2, tags: ['weapon'],
    desc: '0.35秒/消費1。ウイルス2を高速付与。', weapon: { dmg: 5, cd: 0.35, energy: 1, accuracy: 0.92, applies: [{ status: 'virus', amount: 2 }] } },
  { key: 'gn_apocalypse', nameJa: '機神連砲アポカリプス', nameEn: 'Apocalypse Array', sprite: 'star', rarity: 'mythic', job: 'gunner', category: 'ranged', cost: 13, w: 2, h: 2, tags: ['weapon'],
    desc: '0.3秒/消費1。ウイルス2＋ジャミング1を超高速付与。', weapon: { dmg: 6, cd: 0.3, energy: 1, accuracy: 0.93, crit: 0.1, applies: [{ status: 'virus', amount: 2 }, { status: 'jam', amount: 1 }] } },
  // gunner uniques
  { key: 'gn_uq_virusstorm', nameJa: 'ウイルスストーム', nameEn: 'Virus Storm', sprite: 'fang', rarity: 'mythic', job: 'gunner', category: 'ranged', cost: 13, w: 2, h: 2, tags: ['weapon', 'unique'], unique: true,
    desc: '0.3秒/消費1。ウイルスを3付与する暴風。', weapon: { dmg: 4, cd: 0.3, energy: 1, accuracy: 0.92, applies: [{ status: 'virus', amount: 3 }] } },
  { key: 'gn_uq_jamgrid', nameJa: '全域妨害グリッド', nameEn: 'Total Jam Grid', sprite: 'censer', rarity: 'mythic', job: 'gunner', category: 'ranged', cost: 12, w: 1, h: 2, tags: ['weapon', 'unique'], unique: true,
    desc: '0.6秒/消費1。ジャミング3＋ウイルス1。敵を盲目にする。', weapon: { dmg: 3, cd: 0.6, energy: 1, accuracy: 0.95, applies: [{ status: 'jam', amount: 3 }, { status: 'virus', amount: 1 }] } },
  { key: 'gn_uq_feedloop', nameJa: '弾装フィードループ', nameEn: 'Feed Loop', sprite: 'ring', rarity: 'epic', job: 'gunner', category: 'accessory', cost: 9, w: 1, h: 1, tags: ['support', 'unique'], unique: true,
    desc: '非接触武器ダメージ +3 / 速度 +18% / 回復 +0.6。', support: { energyRegen: 0.6, categoryBuffs: [{ category: 'ranged', dmg: 3, hastePct: 0.18 }] } },

  /* ---------- CASTER (reference / freeze / memleak) ---------- */
  { key: 'cs_cryo', nameJa: '冷却放射器', nameEn: 'Cryo Emitter', sprite: 'gem', rarity: 'common', job: 'caster', category: 'ranged', cost: 4, w: 1, h: 1, tags: ['weapon'],
    desc: '1.0秒/消費1。フリーズを2付与。育成の起点。', weapon: { dmg: 3, cd: 1.0, energy: 1, accuracy: 0.92, applies: [{ status: 'freeze', amount: 2 }] } },
  { key: 'cs_frostbeam', nameJa: '霜結ビーム', nameEn: 'Frost Beam', sprite: 'orb', rarity: 'epic', job: 'caster', category: 'ranged', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.5秒/消費2。敵フリーズ値×2の追加ダメージ（参照）。', weapon: { dmg: 6, cd: 1.5, energy: 2, accuracy: 0.95, reference: { status: 'freeze', mult: 2 } } },
  { key: 'cs_leak', nameJa: 'リーク探針', nameEn: 'Leak Probe', sprite: 'prism', rarity: 'rare', job: 'caster', category: 'ranged', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '1.2秒/消費1。メモリリークを2付与。', weapon: { dmg: 2, cd: 1.2, energy: 1, accuracy: 0.92, applies: [{ status: 'memleak', amount: 2 }] } },
  { key: 'cs_resonator', nameJa: '共鳴器', nameEn: 'Resonator', sprite: 'sigil', rarity: 'epic', job: 'caster', category: 'ranged', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.6秒/消費2。敵メモリリーク値×3の追加ダメージ（参照）。', weapon: { dmg: 5, cd: 1.6, energy: 2, accuracy: 0.95, reference: { status: 'memleak', mult: 3 } } },
  { key: 'cs_mirror', nameJa: '反射障壁', nameEn: 'Mirror Ward', sprite: 'shield', rarity: 'rare', job: 'caster', category: 'armor', cost: 5, w: 1, h: 1, tags: ['armor'],
    desc: '戦闘開始時シールド +24 / トゲ 4。', support: { shieldStart: 24, thorns: 4 } },
  { key: 'cs_aegis', nameJa: '神盾フィールド', nameEn: 'Aegis Field', sprite: 'star', rarity: 'legendary', job: 'caster', category: 'armor', cost: 11, w: 2, h: 2, tags: ['armor'],
    desc: '最大HP +40 / シールド +30 / ファイアウォール（デバフ無効）。', support: { hp: 40, shieldStart: 30, firewall: true } },
  { key: 'cs_frostnode', nameJa: '凍結散布機', nameEn: 'Frost Node', sprite: 'flask', rarity: 'rare', job: 'caster', category: 'ranged', cost: 5, w: 1, h: 1, tags: ['weapon'],
    desc: '0.9秒/消費1。フリーズを2付与し敵速度を素早く削る支援機。', weapon: { dmg: 2, cd: 0.9, energy: 1, accuracy: 0.93, applies: [{ status: 'freeze', amount: 2 }] } },
  { key: 'cs_corruptor', nameJa: '記憶汚染機', nameEn: 'Mem Corruptor', sprite: 'censer', rarity: 'epic', job: 'caster', category: 'ranged', cost: 7, w: 1, h: 2, tags: ['weapon'],
    desc: '1.1秒/消費2。メモリリーク3付与＋フリーズ1。敵のエネルギーを枯らす。', weapon: { dmg: 3, cd: 1.1, energy: 2, accuracy: 0.94, applies: [{ status: 'memleak', amount: 3 }, { status: 'freeze', amount: 1 }] } },
  { key: 'cs_warden', nameJa: '霜衛フィールド', nameEn: 'Frost Warden', sprite: 'shield', rarity: 'legendary', job: 'caster', category: 'armor', cost: 10, w: 2, h: 2, tags: ['armor'],
    desc: '最大HP +36 / シールド +28 / トゲ 6 / 防具数×シールド6。受けて返す霜の壁。', support: { hp: 36, shieldStart: 28, thorns: 6, countScaling: [{ category: 'armor', shieldPer: 6 }] } },
  // recipe intermediates / results
  { key: 'cs_cryo_mk2', nameJa: '冷却放射器改', nameEn: 'Cryo Emitter Mk2', sprite: 'gem', rarity: 'rare', job: 'caster', category: 'ranged', cost: 6, w: 1, h: 1, tags: ['weapon'],
    desc: '0.9秒/消費1。フリーズを3付与。', weapon: { dmg: 3, cd: 0.9, energy: 1, accuracy: 0.95, applies: [{ status: 'freeze', amount: 3 }] } },
  { key: 'cs_glacier', nameJa: '氷河参照砲', nameEn: 'Glacier Reference', sprite: 'orb', rarity: 'epic', job: 'caster', category: 'ranged', cost: 9, w: 1, h: 2, tags: ['weapon'],
    desc: '1.4秒/消費2。フリーズ2付与＋敵フリーズ値×3で参照。', weapon: { dmg: 6, cd: 1.4, energy: 2, accuracy: 0.95, applies: [{ status: 'freeze', amount: 2 }], reference: { status: 'freeze', mult: 3 } } },
  { key: 'cs_absolute', nameJa: '機神絶対零度', nameEn: 'Absolute Zero', sprite: 'sigil', rarity: 'mythic', job: 'caster', category: 'ranged', cost: 13, w: 2, h: 2, tags: ['weapon'],
    desc: '1.6秒/消費3。フリーズ3付与＋敵フリーズ値×5で参照。', weapon: { dmg: 8, cd: 1.6, energy: 3, accuracy: 0.96, applies: [{ status: 'freeze', amount: 3 }], reference: { status: 'freeze', mult: 5 } } },
  // caster uniques
  { key: 'cs_uq_freezeengine', nameJa: '凍結参照機関', nameEn: 'Freeze Reference Engine', sprite: 'star', rarity: 'mythic', job: 'caster', category: 'ranged', cost: 13, w: 2, h: 2, tags: ['weapon', 'unique'], unique: true,
    desc: '1.3秒/消費2。フリーズ2付与＋敵フリーズ値×4で参照。', weapon: { dmg: 6, cd: 1.3, energy: 2, accuracy: 0.96, applies: [{ status: 'freeze', amount: 2 }], reference: { status: 'freeze', mult: 4 } } },
  { key: 'cs_uq_voidsink', nameJa: '虚無シンク', nameEn: 'Void Sink', sprite: 'sigil', rarity: 'mythic', job: 'caster', category: 'ranged', cost: 12, w: 1, h: 2, tags: ['weapon', 'unique'], unique: true,
    desc: '1.4秒/消費2。メモリリーク3付与＋敵リーク値×4で参照。', weapon: { dmg: 4, cd: 1.4, energy: 2, accuracy: 0.95, applies: [{ status: 'memleak', amount: 3 }], reference: { status: 'memleak', mult: 4 } } },
  { key: 'cs_uq_godaegis', nameJa: '機神盾アイギス', nameEn: 'God-Aegis', sprite: 'shield', rarity: 'epic', job: 'caster', category: 'armor', cost: 10, w: 2, h: 2, tags: ['armor', 'unique'], unique: true,
    desc: '最大HP +50 / シールド +40 / トゲ 8 / 防具数×シールド8 / ファイアウォール。', support: { hp: 50, shieldStart: 40, thorns: 8, firewall: true, countScaling: [{ category: 'armor', shieldPer: 8 }] } },
];

export const ITEM_MAP: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.key, it]));
export const itemById = (key: string): Item | undefined => ITEM_MAP[key];

export function footprint(it: Item, rot: 0 | 1): { w: number; h: number } {
  return rot === 0 ? { w: it.w, h: it.h } : { w: it.h, h: it.w };
}
